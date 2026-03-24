'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { Toolbar98 } from '@/components/ui/Toolbar98';
import { StatusBar98 } from '@/components/ui/StatusBar98';

interface Email {
  id: string;
  from: string;
  subject: string;
  date: string;
  unread: boolean;
  body: string;
}

interface Folder {
  name: string;
  count: number;
}

const FOLDERS: Folder[] = [
  { name: 'Inbox', count: 5 },
  { name: 'Outbox', count: 0 },
  { name: 'Sent Items', count: 0 },
  { name: 'Deleted Items', count: 0 },
  { name: 'Drafts', count: 0 },
];

const EMAILS: Email[] = [
  {
    id: '1',
    from: 'Prince Abubakar <prince@totallylegit.ng>',
    subject: 'URGENT: You Have Inherited $45,000,000 USD',
    date: '3/15/99',
    unread: true,
    body: `Dear Beloved Friend,

I am Prince Abubakar, son of the late Minister of Finance. I am contacting you regarding a sum of FORTY FIVE MILLION UNITED STATES DOLLARS ($45,000,000.00) currently sitting in a bank vault.

I need your assistance to transfer this money out of the country. For your help, you will receive 30% of the total sum.

Please send your full name, address, phone number, and bank account details to begin the process.

God Bless You,
Prince Abubakar`,
  },
  {
    id: '2',
    from: 'Mom <mom@aol.com>',
    subject: 'FW: FW: FW: FW: Funny Joke!!!',
    date: '3/14/99',
    unread: true,
    body: `>> >> >> FW: FW: FW: Funny Joke!!
>> >> >>
>> >> >> If you send this to 10 people you will
>> >> >> have GOOD LUCK for 10 years!!!
>> >> >>
>> >> >> A man walks into a bar... OUCH!
>> >> >> It was an iron bar! LOL!!!
>> >> >>
>> >> >> SEND THIS TO EVERYONE YOU KNOW!!!!
>> >> >>
>> >> >> ~~~*~*~*~*~FRIENDSHIP ROSES~*~*~*~*~~~
>> >> >> @}->-->-- @}->-->-- @}->-->--`,
  },
  {
    id: '3',
    from: 'Security Team <security@hotmail-verify.com>',
    subject: 'URGENT: Your Hotmail Account Will Be DELETED',
    date: '3/13/99',
    unread: true,
    body: `Dear Hotmail User,

Your account has been flagged for DELETION due to inactivity.

To verify your account, please reply with:
- Username
- Password
- Date of Birth
- Mother's Maiden Name

Failure to respond within 24 HOURS will result in permanent account deletion.

Sincerely,
Hotmail Security Team
Microsoft Corporation`,
  },
  {
    id: '4',
    from: 'FreeVacation@winner.com',
    subject: 'FREE VACATION!!! YOU HAVE WON!!! Click Here!!!',
    date: '3/12/99',
    unread: true,
    body: `**** CONGRATULATIONS!!!! ****

YOU have been selected as the WINNER of a
FREE ALL-EXPENSES-PAID VACATION to HAWAII!!!

To claim your prize, call 1-900-555-0199
($4.99/min, average call 15 minutes)

*** ACT NOW - THIS OFFER EXPIRES SOON!!! ***

This is NOT spam. You are receiving this because
you signed up at one of our partner websites.`,
  },
  {
    id: '5',
    from: 'chainletter@friend.net',
    subject: 'READ THIS OR SOMETHING BAD WILL HAPPEN TO YOU',
    date: '3/11/99',
    unread: false,
    body: `!!!WARNING!!!

This chain letter has been going around since 1987.
It has been verified by IBM and AOL.

A little girl in Arkansas didn't forward this email
and THREE DAYS LATER her computer crashed.

A man in Ohio forwarded it to 20 people and the
VERY NEXT DAY he won $1,000!!!

FORWARD THIS TO 15 PEOPLE IN THE NEXT HOUR
OR YOU WILL HAVE BAD LUCK FOR 7 YEARS.

THIS IS NOT A JOKE. IT REALLY WORKS.

~*~*~*~*~ Pass it on ~*~*~*~*~`,
  },
];

export default function OutlookExpress({ windowId }: AppComponentProps) {
  const [selectedFolder, setSelectedFolder] = useState('Inbox');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(EMAILS[0]);

  const toolbarItems = [
    { id: 'new', label: 'New Mail', icon: <span className="text-[11px]">✉</span> },
    { id: 'sep1', separator: true },
    { id: 'reply', label: 'Reply', icon: <span className="text-[11px]">↩</span> },
    { id: 'replyall', label: 'Reply All', icon: <span className="text-[11px]">↩↩</span> },
    { id: 'forward', label: 'Forward', icon: <span className="text-[11px]">→</span> },
    { id: 'sep2', separator: true },
    { id: 'delete', label: 'Delete', icon: <span className="text-[11px]">✕</span> },
    { id: 'send', label: 'Send/Recv', icon: <span className="text-[11px]">⟳</span> },
    { id: 'sep3', separator: true },
    { id: 'address', label: 'Addresses', icon: <span className="text-[11px]">📒</span> },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] overflow-hidden">
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

      {/* Main content - 3 pane layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left pane - Folder tree */}
        <div
          className="w-[140px] flex-shrink-0 overflow-y-auto bg-white border-r-2"
          style={{ borderColor: 'var(--win98-button-shadow)' }}
        >
          <div className="p-1">
            <div className="font-bold text-[11px] px-1 py-[2px] flex items-center gap-1">
              <span className="text-[13px]">📧</span> Outlook Express
            </div>
            {FOLDERS.map(folder => (
              <div
                key={folder.name}
                onClick={() => setSelectedFolder(folder.name)}
                className={`flex items-center gap-1 px-3 py-[2px] cursor-default select-none ${
                  selectedFolder === folder.name
                    ? 'bg-[var(--win98-highlight)] text-[var(--win98-highlight-text)]'
                    : ''
                }`}
              >
                <span className="text-[11px]">📁</span>
                <span className={folder.count > 0 ? 'font-bold' : ''}>
                  {folder.name}
                  {folder.count > 0 && ` (${folder.count})`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right side - split top/bottom */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Top right - Message list */}
          <div className="h-[45%] overflow-auto bg-white border-b-2" style={{ borderColor: 'var(--win98-button-shadow)' }}>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)] sticky top-0">
                  <th className="text-left px-1 py-[2px] font-normal w-[16px]"></th>
                  <th className="text-left px-2 py-[2px] font-normal">From</th>
                  <th className="text-left px-2 py-[2px] font-normal">Subject</th>
                  <th className="text-left px-2 py-[2px] font-normal w-[60px]">Received</th>
                </tr>
              </thead>
              <tbody>
                {(selectedFolder === 'Inbox' ? EMAILS : []).map(email => (
                  <tr
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`cursor-default ${
                      selectedEmail?.id === email.id
                        ? 'bg-[var(--win98-highlight)] text-[var(--win98-highlight-text)]'
                        : ''
                    }`}
                  >
                    <td className="px-1 py-[1px] text-center">
                      {email.unread ? <span className="text-[9px]">📩</span> : <span className="text-[9px]">📧</span>}
                    </td>
                    <td className={`px-2 py-[1px] truncate max-w-[150px] ${email.unread ? 'font-bold' : ''}`}>
                      {email.from.split('<')[0].trim()}
                    </td>
                    <td className={`px-2 py-[1px] truncate ${email.unread ? 'font-bold' : ''}`}>
                      {email.subject}
                    </td>
                    <td className="px-2 py-[1px]">{email.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom right - Preview pane */}
          <div className="flex-1 overflow-auto bg-white">
            {selectedEmail ? (
              <div className="p-2">
                {/* Email header */}
                <div className="border-b border-[#ccc] pb-2 mb-2">
                  <div className="flex gap-1">
                    <span className="text-[#666] min-w-[40px]">From:</span>
                    <span className="font-bold">{selectedEmail.from}</span>
                  </div>
                  <div className="flex gap-1">
                    <span className="text-[#666] min-w-[40px]">Date:</span>
                    <span>{selectedEmail.date}</span>
                  </div>
                  <div className="flex gap-1">
                    <span className="text-[#666] min-w-[40px]">Subj:</span>
                    <span className="font-bold">{selectedEmail.subject}</span>
                  </div>
                </div>
                {/* Email body */}
                <pre className="whitespace-pre-wrap font-[family-name:var(--win98-font)] text-[11px]">
                  {selectedEmail.body}
                </pre>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-[#888]">
                Select a message to read
              </div>
            )}
          </div>
        </div>
      </div>

      <StatusBar98
        panels={[
          { content: `${EMAILS.filter(e => e.unread).length} unread message(s)` },
          { content: 'Connected', width: 70 },
        ]}
      />
    </div>
  );
}
