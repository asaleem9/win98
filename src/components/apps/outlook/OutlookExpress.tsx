'use client';

import { useReducer, useState, useEffect, useRef, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { Toolbar98 } from '@/components/ui/Toolbar98';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { Button98 } from '@/components/ui/Button98';
import { Input98 } from '@/components/ui/Input98';
import { useSettings } from '@/contexts/SettingsContext';
import { playSound } from '@/lib/sounds';
import {
  mailboxReducer,
  emptyMailbox,
  unreadCount,
  makeSpam,
  makeBounce,
  SEED_INBOX,
  FOLDER_ORDER,
  type Mailbox,
  type FolderName,
  type Email,
} from './mailboxReducer';

const MY_ADDRESS = 'SurfDude98 <surfdude98@hotmail.com>';

interface Compose {
  mode: 'new' | 'reply' | 'forward';
  to: string;
  subject: string;
  body: string;
}

function extractAddress(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return m ? m[1] : from;
}

function quote(email: Email): string {
  return `\n\n----- Original Message -----\nFrom: ${email.from}\nDate: ${email.date}\nSubject: ${email.subject}\n\n${email.body
    .split('\n')
    .map((l) => `> ${l}`)
    .join('\n')}`;
}

export default function OutlookExpress({ windowId }: AppComponentProps) {
  void windowId;
  const { getAppPref, setAppPref } = useSettings();

  const [mailbox, dispatch] = useReducer(mailboxReducer, null, (): Mailbox => {
    const saved = getAppPref<Mailbox | null>('outlook-express', 'mailbox', null);
    if (saved && Array.isArray(saved.Inbox)) return saved;
    return { ...emptyMailbox(), Inbox: SEED_INBOX };
  });

  const [selectedFolder, setSelectedFolder] = useState<FolderName>('Inbox');
  const [selectedId, setSelectedId] = useState<string | null>(SEED_INBOX[0]?.id ?? null);
  const [compose, setCompose] = useState<Compose | null>(null);
  const [spamSeq, setSpamSeq] = useState(0);
  const idRef = useRef(0);
  const nextId = useCallback(() => `m-${Date.now()}-${++idRef.current}`, []);

  // Persist mailbox so mail survives a reload.
  useEffect(() => {
    setAppPref('outlook-express', 'mailbox', mailbox);
  }, [mailbox, setAppPref]);

  const folderEmails = mailbox[selectedFolder];
  const selectedEmail = folderEmails.find((e) => e.id === selectedId) ?? null;

  const selectEmail = useCallback((email: Email) => {
    setSelectedId(email.id);
    if (email.unread) dispatch({ type: 'MARK_READ', folder: selectedFolder, id: email.id });
  }, [selectedFolder]);

  const switchFolder = useCallback((folder: FolderName) => {
    setSelectedFolder(folder);
    setSelectedId(mailbox[folder][0]?.id ?? null);
  }, [mailbox]);

  const sendReceive = useCallback(() => {
    const email = makeSpam(spamSeq, nextId());
    setSpamSeq((s) => s + 1);
    dispatch({ type: 'RECEIVE', email });
    playSound('youveGotMail');
  }, [spamSeq, nextId]);

  const deleteSelected = useCallback(() => {
    if (!selectedEmail) return;
    dispatch({ type: 'DELETE', folder: selectedFolder, id: selectedEmail.id });
    setSelectedId(null);
  }, [selectedEmail, selectedFolder]);

  const openCompose = useCallback((mode: Compose['mode']) => {
    if (mode === 'new') {
      setCompose({ mode, to: '', subject: '', body: '' });
      return;
    }
    if (!selectedEmail) return;
    if (mode === 'reply') {
      setCompose({
        mode,
        to: extractAddress(selectedEmail.from),
        subject: selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
        body: quote(selectedEmail),
      });
    } else {
      setCompose({
        mode,
        to: '',
        subject: selectedEmail.subject.startsWith('Fw:') ? selectedEmail.subject : `Fw: ${selectedEmail.subject}`,
        body: quote(selectedEmail),
      });
    }
  }, [selectedEmail]);

  const sendCompose = useCallback(() => {
    if (!compose) return;
    const sent: Email = {
      id: nextId(),
      from: MY_ADDRESS,
      to: compose.to,
      subject: compose.subject,
      date: '3/16/99',
      unread: false,
      body: compose.body,
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

  const toolbarItems = [
    { id: 'new', label: 'New Mail', icon: <span className="text-[11px]">✉</span>, onClick: () => openCompose('new') },
    { id: 'sep1', separator: true },
    { id: 'reply', label: 'Reply', icon: <span className="text-[11px]">↩</span>, onClick: () => openCompose('reply'), disabled: !selectedEmail },
    { id: 'forward', label: 'Forward', icon: <span className="text-[11px]">→</span>, onClick: () => openCompose('forward'), disabled: !selectedEmail },
    { id: 'sep2', separator: true },
    { id: 'delete', label: 'Delete', icon: <span className="text-[11px]">✕</span>, onClick: deleteSelected, disabled: !selectedEmail },
    { id: 'send', label: 'Send/Recv', icon: <span className="text-[11px]">⟳</span>, onClick: sendReceive },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] overflow-hidden relative">
      {/* Menu bar */}
      <div className="flex gap-4 px-3 py-[2px] border-b border-[var(--win98-button-shadow)] text-[11px]">
        <span className="cursor-default">File</span>
        <span className="cursor-default">Edit</span>
        <span className="cursor-default">View</span>
        <span className="cursor-default">Tools</span>
        <span className="cursor-default">Message</span>
        <span className="cursor-default">Help</span>
      </div>

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
                  <th className="text-left px-2 py-[2px] font-normal">{selectedFolder === 'Sent Items' ? 'To' : 'From'}</th>
                  <th className="text-left px-2 py-[2px] font-normal">Subject</th>
                  <th className="text-left px-2 py-[2px] font-normal w-[60px]">Received</th>
                </tr>
              </thead>
              <tbody>
                {folderEmails.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-6 text-[#999]">There are no items in this view.</td></tr>
                )}
                {folderEmails.map((email) => (
                  <tr
                    key={email.id}
                    onClick={() => selectEmail(email)}
                    className={`cursor-default ${selectedId === email.id ? 'bg-[var(--win98-highlight)] text-[var(--win98-highlight-text)]' : ''}`}
                  >
                    <td className="px-1 py-[1px] text-center">
                      {email.unread ? <span className="text-[9px]">📩</span> : <span className="text-[9px]">📧</span>}
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
            {selectedEmail ? (
              <div className="p-2">
                <div className="border-b border-[#ccc] pb-2 mb-2">
                  <div className="flex gap-1"><span className="text-[#666] min-w-[40px]">From:</span><span className="font-bold">{selectedEmail.from}</span></div>
                  {selectedEmail.to && <div className="flex gap-1"><span className="text-[#666] min-w-[40px]">To:</span><span>{selectedEmail.to}</span></div>}
                  <div className="flex gap-1"><span className="text-[#666] min-w-[40px]">Date:</span><span>{selectedEmail.date}</span></div>
                  <div className="flex gap-1"><span className="text-[#666] min-w-[40px]">Subj:</span><span className="font-bold">{selectedEmail.subject || '(no subject)'}</span></div>
                </div>
                <pre className="whitespace-pre-wrap font-[family-name:var(--win98-font)] text-[11px]">{selectedEmail.body}</pre>
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
                className="w-full h-[160px] border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] p-1 text-[11px] outline-none resize-none font-[family-name:var(--win98-font)]"
                placeholder="Type your message..."
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button98 onClick={sendCompose}>Send</Button98>
                <Button98 onClick={() => setCompose(null)}>Cancel</Button98>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
