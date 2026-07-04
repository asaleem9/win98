'use client';

import { useReducer, useState, useEffect, useRef, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useFileOpener, showSystemError } from '@/hooks/useFileOpener';
import { usePrint } from '@/components/dialogs/PrintDialog';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { standardHelpMenu } from '@/lib/menus';
import { FilePickerDialog } from '@/components/dialogs/FilePickerDialog';
import { Dialog98 } from '@/components/ui/Dialog98';
import { Toolbar98 } from '@/components/ui/Toolbar98';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { Button98 } from '@/components/ui/Button98';
import { Input98 } from '@/components/ui/Input98';
import { playSound } from '@/lib/sounds';
import { normalizePath } from '@/lib/fs/fsOperations';
import { AIM_BUDDY_NAMES } from '../aim/AIM';
import { deriveContacts, type Contact } from './addressBook';
import {
  mailboxReducer,
  emptyMailbox,
  unreadCount,
  makeSpam,
  makeBounce,
  makeVirusOutbreak,
  formatEml,
  emailToText,
  SEED_INBOX,
  SELF_ADDRESS,
  LOVE_LETTER_ATTACHMENT,
  FOLDER_ORDER,
  type Mailbox,
  type FolderName,
  type Email,
  type Attachment,
} from './mailboxReducer';

const TEMP_DIR = 'C:\\TEMP';

interface Compose {
  mode: 'new' | 'reply' | 'forward';
  to: string;
  subject: string;
  body: string;
  attachments: Attachment[];
}

type Picker =
  | { kind: 'attach' }
  | { kind: 'save-eml'; email: Email }
  | { kind: 'save-attachment'; attachment: Attachment };

interface VirusAlert {
  email: Email;
  phase: 'detected' | 'cleaned';
}

function extractAddress(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return m ? m[1] : from;
}

function baseName(path: string): string {
  const parts = normalizePath(path).split('\\');
  return parts[parts.length - 1] || 'file';
}

function safeFileName(subject: string): string {
  return (subject.trim().replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'message').slice(0, 40);
}

function quote(email: Email): string {
  return `\n\n----- Original Message -----\nFrom: ${email.from}\nDate: ${email.date}\nSubject: ${email.subject}\n\n${email.body
    .split('\n')
    .map((l) => `> ${l}`)
    .join('\n')}`;
}

export default function OutlookExpress({ windowId }: AppComponentProps) {
  const { closeWindow } = useWindows();
  const { readFile, writeFile } = useFileSystem();
  const { openFile } = useFileOpener();
  const { getAppPref, setAppPref } = useSettings();
  const { openPrint, printDialog } = usePrint(windowId, 'Outlook Express');

  const [mailbox, dispatch] = useReducer(mailboxReducer, null, (): Mailbox => {
    const saved = getAppPref<Mailbox | null>('outlook-express', 'mailbox', null);
    if (saved && Array.isArray(saved.Inbox)) return saved;
    return { ...emptyMailbox(), Inbox: SEED_INBOX };
  });

  const [selectedFolder, setSelectedFolder] = useState<FolderName>('Inbox');
  const [selectedIds, setSelectedIds] = useState<string[]>(SEED_INBOX[0] ? [SEED_INBOX[0].id] : []);
  const [focusedId, setFocusedId] = useState<string | null>(SEED_INBOX[0]?.id ?? null);
  const [compose, setCompose] = useState<Compose | null>(null);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [showAddressBook, setShowAddressBook] = useState(false);
  const [virus, setVirus] = useState<VirusAlert | null>(null);
  const [spamSeq, setSpamSeq] = useState(0);
  const idRef = useRef(0);
  const nextId = useCallback(() => `m-${Date.now()}-${++idRef.current}`, []);

  // Persist mailbox so mail survives a reload.
  useEffect(() => {
    setAppPref('outlook-express', 'mailbox', mailbox);
  }, [mailbox, setAppPref]);

  const folderEmails = mailbox[selectedFolder];
  const focusedEmail = folderEmails.find((e) => e.id === focusedId) ?? null;

  const selectEmail = useCallback((email: Email) => {
    setFocusedId(email.id);
    setSelectedIds([email.id]);
    if (email.unread) dispatch({ type: 'MARK_READ', folder: selectedFolder, id: email.id });
  }, [selectedFolder]);

  const switchFolder = useCallback((folder: FolderName) => {
    setSelectedFolder(folder);
    const first = mailbox[folder][0]?.id ?? null;
    setFocusedId(first);
    setSelectedIds(first ? [first] : []);
  }, [mailbox]);

  const sendReceive = useCallback(() => {
    const email = makeSpam(spamSeq, nextId());
    setSpamSeq((s) => s + 1);
    dispatch({ type: 'RECEIVE', email });
    playSound('youveGotMail');
  }, [spamSeq, nextId]);

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    for (const id of selectedIds) dispatch({ type: 'DELETE', folder: selectedFolder, id });
    setSelectedIds([]);
    setFocusedId(null);
  }, [selectedIds, selectedFolder]);

  const markSelectedRead = useCallback(() => {
    for (const id of selectedIds) dispatch({ type: 'MARK_READ', folder: selectedFolder, id });
  }, [selectedIds, selectedFolder]);

  const selectAll = useCallback(() => {
    const ids = folderEmails.map((e) => e.id);
    setSelectedIds(ids);
    setFocusedId(ids[0] ?? null);
  }, [folderEmails]);

  const openCompose = useCallback((mode: Compose['mode'], presetTo?: string) => {
    if (mode === 'new') {
      setCompose({ mode, to: presetTo ?? '', subject: '', body: '', attachments: [] });
      return;
    }
    if (!focusedEmail) return;
    if (mode === 'reply') {
      setCompose({
        mode,
        to: extractAddress(focusedEmail.from),
        subject: focusedEmail.subject.startsWith('Re:') ? focusedEmail.subject : `Re: ${focusedEmail.subject}`,
        body: quote(focusedEmail),
        attachments: [],
      });
    } else {
      setCompose({
        mode,
        to: '',
        subject: focusedEmail.subject.startsWith('Fw:') ? focusedEmail.subject : `Fw: ${focusedEmail.subject}`,
        body: quote(focusedEmail),
        attachments: focusedEmail.attachments ?? [],
      });
    }
  }, [focusedEmail]);

  const sendCompose = useCallback(() => {
    if (!compose) return;
    const sent: Email = {
      id: nextId(),
      from: SELF_ADDRESS,
      to: compose.to,
      subject: compose.subject,
      date: '3/16/99',
      unread: false,
      body: compose.body,
      attachments: compose.attachments.length ? compose.attachments : undefined,
    };
    dispatch({ type: 'SEND', email: sent });
    setCompose(null);
    // A little while later, a mailer-daemon bounce lands in the Inbox.
    const bounceId = nextId();
    setTimeout(() => {
      dispatch({ type: 'RECEIVE', email: makeBounce(sent, bounceId) });
      playSound('youveGotMail');
    }, 4000);
  }, [compose, nextId]);

  // --- Attachments -----------------------------------------------------------

  const removeAttachment = useCallback((index: number) => {
    setCompose((c) => (c ? { ...c, attachments: c.attachments.filter((_, i) => i !== index) } : c));
  }, []);

  const attachmentContent = useCallback(
    (att: Attachment): string => att.content ?? (att.path ? readFile(att.path) ?? '' : ''),
    [readFile],
  );

  const openAttachment = useCallback(
    (att: Attachment) => {
      // The ILOVEYOU worm — never actually run it; set off the antivirus instead.
      if (att.name === LOVE_LETTER_ATTACHMENT || att.name.toLowerCase().endsWith('.vbs')) {
        if (focusedEmail) setVirus({ email: focusedEmail, phase: 'detected' });
        playSound('chord');
        return;
      }
      if (att.path) {
        openFile(att.path);
        return;
      }
      if (att.content !== undefined) {
        const path = `${TEMP_DIR}\\${att.name}`;
        const res = writeFile(path, att.content);
        if (!res.ok) {
          showSystemError('Outlook Express', res.error);
          return;
        }
        openFile(path);
        return;
      }
      showSystemError('Outlook Express', `Windows cannot open ${att.name}.`);
    },
    [focusedEmail, openFile, writeFile],
  );

  // --- Virus flow ------------------------------------------------------------

  const quarantineVirus = useCallback(() => {
    if (!virus) return;
    const recipients = deriveContacts(mailbox, AIM_BUDDY_NAMES).map((c) => c.email);
    const jokeEmails = makeVirusOutbreak(recipients, nextId);
    dispatch({ type: 'QUARANTINE', folder: selectedFolder, id: virus.email.id, jokeEmails });
    playSound('chord');
    setVirus({ email: virus.email, phase: 'cleaned' });
  }, [virus, mailbox, nextId, selectedFolder]);

  // --- Save As / Print -------------------------------------------------------

  const saveEml = useCallback(
    (email: Email, path: string) => {
      const res = writeFile(path, formatEml(email));
      if (!res.ok) { showSystemError('Outlook Express', res.error); return; }
      playSound('ding');
    },
    [writeFile],
  );

  const saveAttachment = useCallback(
    (att: Attachment, path: string) => {
      const res = writeFile(path, attachmentContent(att));
      if (!res.ok) { showSystemError('Outlook Express', res.error); return; }
      playSound('ding');
    },
    [writeFile, attachmentContent],
  );

  const printFocused = useCallback(() => {
    if (!focusedEmail) return;
    openPrint(() => ({ kind: 'text', text: emailToText(focusedEmail) }), focusedEmail.subject || 'Message');
  }, [focusedEmail, openPrint]);

  // --- Address book ----------------------------------------------------------

  const composeToContact = useCallback((contact: Contact) => {
    setShowAddressBook(false);
    openCompose('new', contact.email);
  }, [openCompose]);

  // --- Menus -----------------------------------------------------------------

  const menus: MenuDefinition[] = [
    {
      label: '&File',
      items: [
        { label: '&New Message', shortcut: 'Ctrl+N', onClick: () => openCompose('new') },
        { label: '', separator: true },
        { label: 'Save &As...', onClick: () => focusedEmail && setPicker({ kind: 'save-eml', email: focusedEmail }), disabled: !focusedEmail },
        { label: '&Print...', shortcut: 'Ctrl+P', onClick: printFocused, disabled: !focusedEmail },
        { label: '', separator: true },
        { label: '&Close', onClick: () => closeWindow(windowId) },
      ],
    },
    {
      label: '&Edit',
      items: [
        { label: '&Delete', onClick: deleteSelected, disabled: selectedIds.length === 0 },
        { label: 'Mark as &Read', onClick: markSelectedRead, disabled: selectedIds.length === 0 },
        { label: '', separator: true },
        { label: 'Select &All', shortcut: 'Ctrl+A', onClick: selectAll, disabled: folderEmails.length === 0 },
      ],
    },
    {
      label: '&Tools',
      items: [
        { label: '&Send and Receive', shortcut: 'Ctrl+M', onClick: sendReceive },
        { label: '', separator: true },
        { label: 'Address &Book...', shortcut: 'Ctrl+Shift+B', onClick: () => setShowAddressBook(true) },
      ],
    },
    standardHelpMenu('Outlook Express'),
  ];

  const toolbarItems = [
    { id: 'new', label: 'New Mail', icon: <span className="text-[11px]">✉</span>, onClick: () => openCompose('new') },
    { id: 'sep1', separator: true },
    { id: 'reply', label: 'Reply', icon: <span className="text-[11px]">↩</span>, onClick: () => openCompose('reply'), disabled: !focusedEmail },
    { id: 'forward', label: 'Forward', icon: <span className="text-[11px]">→</span>, onClick: () => openCompose('forward'), disabled: !focusedEmail },
    { id: 'sep2', separator: true },
    { id: 'delete', label: 'Delete', icon: <span className="text-[11px]">✕</span>, onClick: deleteSelected, disabled: selectedIds.length === 0 },
    { id: 'send', label: 'Send/Recv', icon: <span className="text-[11px]">⟳</span>, onClick: sendReceive },
    { id: 'sep3', separator: true },
    { id: 'addresses', label: 'Addresses', icon: <span className="text-[11px]">📇</span>, onClick: () => setShowAddressBook(true) },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] overflow-hidden relative">
      <MenuBar menus={menus} windowId={windowId} />

      <Toolbar98 items={toolbarItems} />

      <div className="flex flex-1 overflow-hidden">
        {/* Folder tree */}
        <div className="w-[140px] flex-shrink-0 overflow-y-auto bg-white border-r-2" style={{ borderColor: 'var(--win98-button-shadow)' }}>
          <div className="p-1">
            <div className="font-bold text-[11px] px-1 py-[2px] flex items-center gap-1">
              <span className="text-[13px]">📧</span> Outlook Express
            </div>
            {FOLDER_ORDER.map((folder) => {
              const items = mailbox[folder];
              const badge = folder === 'Inbox' ? unreadCount(mailbox) : items.length;
              return (
                <div
                  key={folder}
                  onClick={() => switchFolder(folder)}
                  className={`flex items-center gap-1 px-3 py-[2px] cursor-default select-none ${
                    selectedFolder === folder ? 'bg-[var(--win98-highlight)] text-[var(--win98-highlight-text)]' : ''
                  }`}
                >
                  <span className="text-[11px]">📁</span>
                  <span className={badge > 0 && folder === 'Inbox' ? 'font-bold' : ''}>
                    {folder}
                    {badge > 0 && ` (${badge})`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right side */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Message list */}
          <div className="h-[45%] overflow-auto bg-white border-b-2" style={{ borderColor: 'var(--win98-button-shadow)' }}>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)] sticky top-0">
                  <th className="text-left px-1 py-[2px] font-normal w-[16px]"></th>
                  <th className="text-left px-1 py-[2px] font-normal w-[14px]"></th>
                  <th className="text-left px-2 py-[2px] font-normal">{selectedFolder === 'Sent Items' ? 'To' : 'From'}</th>
                  <th className="text-left px-2 py-[2px] font-normal">Subject</th>
                  <th className="text-left px-2 py-[2px] font-normal w-[60px]">Received</th>
                </tr>
              </thead>
              <tbody>
                {folderEmails.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-6 text-[#999]">There are no items in this view.</td></tr>
                )}
                {folderEmails.map((email) => (
                  <tr
                    key={email.id}
                    onClick={() => selectEmail(email)}
                    className={`cursor-default ${selectedIds.includes(email.id) ? 'bg-[var(--win98-highlight)] text-[var(--win98-highlight-text)]' : ''}`}
                  >
                    <td className="px-1 py-[1px] text-center">
                      {email.unread ? <span className="text-[9px]">📩</span> : <span className="text-[9px]">📧</span>}
                    </td>
                    <td className="px-1 py-[1px] text-center">
                      {email.attachments?.length ? <span className="text-[9px]" title="Has attachment">📎</span> : null}
                    </td>
                    <td className={`px-2 py-[1px] truncate max-w-[150px] ${email.unread ? 'font-bold' : ''}`}>
                      {(selectedFolder === 'Sent Items' ? email.to || '(unknown)' : email.from).split('<')[0].trim()}
                    </td>
                    <td className={`px-2 py-[1px] truncate ${email.unread ? 'font-bold' : ''}`}>{email.subject || '(no subject)'}</td>
                    <td className="px-2 py-[1px]">{email.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Preview pane */}
          <div className="flex-1 overflow-auto bg-white">
            {focusedEmail ? (
              <div className="p-2">
                <div className="border-b border-[#ccc] pb-2 mb-2">
                  <div className="flex gap-1"><span className="text-[#666] min-w-[40px]">From:</span><span className="font-bold">{focusedEmail.from}</span></div>
                  {focusedEmail.to && <div className="flex gap-1"><span className="text-[#666] min-w-[40px]">To:</span><span>{focusedEmail.to}</span></div>}
                  <div className="flex gap-1"><span className="text-[#666] min-w-[40px]">Date:</span><span>{focusedEmail.date}</span></div>
                  <div className="flex gap-1"><span className="text-[#666] min-w-[40px]">Subj:</span><span className="font-bold">{focusedEmail.subject || '(no subject)'}</span></div>
                </div>
                <pre className="whitespace-pre-wrap font-[family-name:var(--win98-font)] text-[11px]">{focusedEmail.body}</pre>

                {focusedEmail.attachments?.length ? (
                  <div className="mt-3 border border-[#ccc] bg-[#f8f8f8] p-2">
                    <div className="flex items-center gap-1 text-[#666] mb-1">📎 Attachments:</div>
                    {focusedEmail.attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-2 py-[1px]">
                        <span className="flex-1 truncate">{att.name}</span>
                        <button className="text-[#0000cc] underline cursor-pointer" onClick={() => openAttachment(att)}>Open</button>
                        <button className="text-[#0000cc] underline cursor-pointer" onClick={() => setPicker({ kind: 'save-attachment', attachment: att })}>Save As</button>
                      </div>
                    ))}
                  </div>
                ) : null}

                {focusedEmail.quarantined && (
                  <div className="mt-3 border border-[#cc0000] bg-[#fff0f0] p-2 text-[#cc0000]">
                    ⚠ The attachment on this message was removed by Norton AntiVirus.
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-[#888]">Select a message to read</div>
            )}
          </div>
        </div>
      </div>

      <StatusBar98
        panels={[
          { content: `${unreadCount(mailbox)} unread message(s)` },
          { content: 'Connected', width: 70 },
        ]}
      />

      {/* Compose window */}
      {compose && (
        <div className="absolute inset-0 z-20 bg-black/20 flex items-center justify-center" onMouseDown={() => setCompose(null)}>
          <div
            className="w-[440px] max-w-[95%] bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="text-white px-2 py-[2px] font-bold flex items-center justify-between bg-[linear-gradient(to_right,var(--win98-titlebar-active-start),var(--win98-titlebar-active-end))]">
              <span>{compose.mode === 'new' ? 'New Message' : compose.mode === 'reply' ? 'Re: Message' : 'Fw: Message'}</span>
              <button onClick={() => setCompose(null)} className="px-1 leading-none">×</button>
            </div>
            <div className="p-2 space-y-1">
              <div className="flex items-center gap-1">
                <span className="w-[48px] text-[#666]">To:</span>
                <Input98 value={compose.to} onChange={(e) => setCompose({ ...compose, to: e.target.value })} className="flex-1" placeholder="someone@example.com" autoFocus />
              </div>
              <div className="flex items-center gap-1">
                <span className="w-[48px] text-[#666]">Subject:</span>
                <Input98 value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} className="flex-1" />
              </div>
              <textarea
                value={compose.body}
                onChange={(e) => setCompose({ ...compose, body: e.target.value })}
                className="w-full h-[140px] border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] p-1 text-[11px] outline-none resize-none font-[family-name:var(--win98-font)]"
                placeholder="Type your message..."
              />
              {compose.attachments.length > 0 && (
                <div className="border border-[#ccc] bg-[#f8f8f8] p-1">
                  {compose.attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-2 py-[1px]">
                      <span className="flex-1 truncate">📎 {att.name}</span>
                      <button className="text-[#cc0000] underline cursor-pointer" onClick={() => removeAttachment(i)}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center pt-1">
                <Button98 onClick={() => setPicker({ kind: 'attach' })}>Attach...</Button98>
                <div className="flex gap-2">
                  <Button98 onClick={sendCompose}>Send</Button98>
                  <Button98 onClick={() => setCompose(null)}>Cancel</Button98>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Address Book */}
      {showAddressBook && (
        <AddressBook
          contacts={deriveContacts(mailbox, AIM_BUDDY_NAMES)}
          onCompose={composeToContact}
          onClose={() => setShowAddressBook(false)}
        />
      )}

      {/* Virus alert */}
      {virus && (
        <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/20">
          {virus.phase === 'detected' ? (
            <Dialog98
              title="Norton AntiVirus"
              icon="warning"
              message={
                <div className="space-y-1 max-w-[280px]">
                  <p className="font-bold">Virus found!</p>
                  <p>The file <b>{LOVE_LETTER_ATTACHMENT}</b> is infected with the <b>VBS/LoveLetter</b> worm.</p>
                  <p>Do you want to clean this file?</p>
                </div>
              }
              buttons={[
                { label: 'Clean', default: true, onClick: quarantineVirus },
                { label: 'Ignore', onClick: () => setVirus(null) },
              ]}
            />
          ) : (
            <Dialog98
              title="Norton AntiVirus"
              icon="info"
              message={
                <div className="space-y-1 max-w-[280px]">
                  <p className="font-bold">The file has been quarantined.</p>
                  <p>Unfortunately, the worm already mailed a copy of itself to everyone in your address book.</p>
                  <p className="text-[#666]">Check your Sent Items folder. Oops!</p>
                </div>
              }
              buttons={[{ label: 'OK', default: true, onClick: () => { setVirus(null); switchFolder('Sent Items'); } }]}
            />
          )}
        </div>
      )}

      {picker && (
        <FilePickerDialog
          mode={picker.kind === 'attach' ? 'open' : 'save'}
          extensions={picker.kind === 'save-eml' ? ['eml'] : undefined}
          defaultExtension={picker.kind === 'save-eml' ? 'eml' : undefined}
          defaultName={
            picker.kind === 'save-eml'
              ? `${safeFileName(picker.email.subject)}.eml`
              : picker.kind === 'save-attachment'
                ? picker.attachment.name
                : ''
          }
          onCancel={() => setPicker(null)}
          onConfirm={(path) => {
            const p = picker;
            setPicker(null);
            if (p.kind === 'attach') {
              if (compose) setCompose({ ...compose, attachments: [...compose.attachments, { name: baseName(path), path }] });
            } else if (p.kind === 'save-eml') {
              saveEml(p.email, path);
            } else {
              saveAttachment(p.attachment, path);
            }
          }}
        />
      )}

      {printDialog}
    </div>
  );
}

function AddressBook({
  contacts,
  onCompose,
  onClose,
}: {
  contacts: Contact[];
  onCompose: (contact: Contact) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 bg-black/20 flex items-center justify-center" onMouseDown={onClose}>
      <div
        className="w-[380px] max-w-[95%] bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="text-white px-2 py-[2px] font-bold flex items-center justify-between bg-[linear-gradient(to_right,var(--win98-titlebar-active-start),var(--win98-titlebar-active-end))]">
          <span>📇 Address Book</span>
          <button onClick={onClose} className="px-1 leading-none">×</button>
        </div>
        <div className="p-2">
          <div className="text-[10px] text-[#666] mb-1">Double-click a contact to send them a message.</div>
          <div className="h-[220px] overflow-auto bg-white border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)] sticky top-0">
                  <th className="text-left px-2 py-[2px] font-normal">Name</th>
                  <th className="text-left px-2 py-[2px] font-normal">E-Mail Address</th>
                </tr>
              </thead>
              <tbody>
                {contacts.length === 0 && (
                  <tr><td colSpan={2} className="text-center py-6 text-[#999]">No contacts.</td></tr>
                )}
                {contacts.map((c) => (
                  <tr
                    key={c.email}
                    className="cursor-default hover:bg-[#e8e8ff]"
                    onDoubleClick={() => onCompose(c)}
                  >
                    <td className="px-2 py-[1px] truncate">
                      <span className="mr-1">{c.source === 'aim' ? '🏃' : '👤'}</span>
                      {c.name}
                    </td>
                    <td className="px-2 py-[1px] truncate text-[#666]">{c.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end pt-2">
            <Button98 onClick={onClose}>Close</Button98>
          </div>
        </div>
      </div>
    </div>
  );
}
