'use client';

import type { SiteDef } from './registry';

import { useState } from 'react';
import { playSound } from '@/lib/sounds';
import { SEED_INBOX } from '@/components/apps/outlook/mailboxReducer';

// Outlook Express keeps its live mailbox in a component-local reducer that isn't
// readable from here, but its seed inbox IS exported — so we mirror the same
// first three messages as a shared source of truth.
const WEBMAIL = SEED_INBOX.slice(0, 3);

export const site: SiteDef = {
  key: 'hotmail',
  urls: ['http://www.hotmail.com', 'www.hotmail.com', 'hotmail.com', 'http://www.hotmail.msn.com'],
  title: 'Hotmail — Free Email',
  keywords: ['hotmail', 'email', 'webmail', 'free email', 'inbox', 'msn', 'login', 'compose', 'mail'],
  description: 'Hotmail — free web-based email you can check from any computer in the world.',
  render: () => <Hotmail1998 />,
};

type View = 'login' | 'inbox' | 'read' | 'compose' | 'sent';

export default function Hotmail1998() {
  const [view, setView] = useState<View>('login');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    playSound('ding');
    setView('inbox');
  };

  const open = WEBMAIL.find((m) => m.id === openId);

  return (
    <div className="min-h-full bg-white text-black font-[Arial,Helvetica,sans-serif] text-[12px]">
      {/* Hotmail masthead */}
      <div className="bg-[#003399] text-white px-3 py-2 flex items-center gap-2">
        <span className="text-[22px] font-bold italic">
          <span className="text-white">Hot</span><span className="text-[#ff0000]">mail</span>
        </span>
        <span className="text-[10px] text-[#aaccff]">The world&rsquo;s FREE web-based email</span>
        {view !== 'login' && (
          <button onClick={() => { setView('login'); setUser(''); setPass(''); }} className="ml-auto text-[10px] text-[#ffff99] underline cursor-pointer">
            Sign Out
          </button>
        )}
      </div>

      <div className="max-w-[620px] mx-auto px-3 py-4">
        {view === 'login' && (
          <div className="max-w-[320px] mx-auto border-2 border-[#003399] bg-[#eef2fb] p-4">
            <div className="text-[14px] font-bold text-[#003399] mb-3 text-center">Sign In to Hotmail</div>
            <form onSubmit={login}>
              <label className="block text-[11px] mb-1">Login Name:</label>
              <div className="flex items-center mb-3">
                <input value={user} onChange={(e) => setUser(e.target.value)} className="border border-[#999] px-1 py-[2px] text-[12px] flex-1" />
                <span className="text-[11px] ml-1">@hotmail.com</span>
              </div>
              <label className="block text-[11px] mb-1">Password:</label>
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} className="border border-[#999] px-1 py-[2px] text-[12px] w-full mb-3" />
              <button type="submit" className="bg-[#003399] text-white border-none px-4 py-1 text-[12px] font-bold cursor-pointer w-full">
                Sign In
              </button>
            </form>
            <div className="text-[10px] text-[#666] mt-3 text-center">
              Don&rsquo;t have an account? <span className="text-[#0000cc] underline cursor-pointer">Sign up FREE!</span>
              <div className="mt-1">(any login and password will work here)</div>
            </div>
          </div>
        )}

        {(view === 'inbox' || view === 'sent') && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-[13px] font-bold text-[#003399]">
                Hi, {user || 'valued user'}! {view === 'inbox' ? 'Inbox' : 'Sent Messages'}
              </div>
              <div className="ml-auto flex gap-1">
                <button onClick={() => setView('inbox')} className={`text-[10px] px-2 py-[2px] border border-[#999] cursor-pointer ${view === 'inbox' ? 'bg-[#003399] text-white' : 'bg-[#eee]'}`}>Inbox</button>
                <button onClick={() => setView('compose')} className="text-[10px] px-2 py-[2px] border border-[#999] bg-[#eee] cursor-pointer">Compose</button>
                <button onClick={() => setView('sent')} className={`text-[10px] px-2 py-[2px] border border-[#999] cursor-pointer ${view === 'sent' ? 'bg-[#003399] text-white' : 'bg-[#eee]'}`}>Sent</button>
              </div>
            </div>
            {view === 'sent' ? (
              <div className="border border-[#99aacc] bg-[#f6f8fc] p-4 text-[11px] text-[#666] text-center">
                You have no sent messages. Compose one!
              </div>
            ) : (
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#ccddff] text-left">
                    <th className="px-2 py-1 border border-[#99aacc] w-[40px]"></th>
                    <th className="px-2 py-1 border border-[#99aacc]">From</th>
                    <th className="px-2 py-1 border border-[#99aacc]">Subject</th>
                    <th className="px-2 py-1 border border-[#99aacc] w-[60px]">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {WEBMAIL.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => { setOpenId(m.id); setView('read'); }}
                      className={`cursor-pointer hover:bg-[#eef4ff] ${m.unread ? 'font-bold' : ''}`}
                    >
                      <td className="px-2 py-1 border border-[#ddd] text-center">{m.unread ? '✉' : '📭'}</td>
                      <td className="px-2 py-1 border border-[#ddd]">{m.from}</td>
                      <td className="px-2 py-1 border border-[#ddd] text-[#0000cc] underline">{m.subject}</td>
                      <td className="px-2 py-1 border border-[#ddd] whitespace-nowrap">{m.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="text-[10px] text-[#999] mt-2">
              You are using <b>2.1 MB</b> of your <b>2 MB</b> quota. Delete messages to free up space!
            </div>
          </>
        )}

        {view === 'read' && open && (
          <div className="border border-[#99aacc]">
            <div className="bg-[#eef2fb] px-3 py-2 border-b border-[#99aacc]">
              <button onClick={() => setView('inbox')} className="text-[10px] text-[#0000cc] underline cursor-pointer mb-1">&laquo; Back to Inbox</button>
              <div className="text-[13px] font-bold">{open.subject}</div>
              <div className="text-[10px] text-[#666]">From: {open.from}</div>
              <div className="text-[10px] text-[#666]">Date: {open.date}</div>
            </div>
            <pre className="p-3 text-[11px] whitespace-pre-wrap font-[Arial,sans-serif]">{open.body}</pre>
          </div>
        )}

        {view === 'compose' && <Compose onDone={() => setView('inbox')} />}
      </div>
    </div>
  );
}

function Compose({ onDone }: { onDone: () => void }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    playSound('notify');
    setSent(true);
  };

  if (sent) {
    return (
      <div className="border-2 border-[#009900] bg-[#eaffea] p-4 text-center">
        <div className="text-[16px] font-bold text-[#006600] mb-2">✓ Message sent!</div>
        <div className="text-[11px] text-[#333]">Your message to {to || '(nobody)'} is on its way across the information superhighway.</div>
        <button onClick={onDone} className="bg-[#003399] text-white border-none px-3 py-1 text-[11px] font-bold cursor-pointer mt-3">
          Back to Inbox
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="border border-[#99aacc]">
      <div className="bg-[#eef2fb] px-3 py-2 border-b border-[#99aacc] text-[13px] font-bold text-[#003399]">New Message</div>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <label className="w-[50px] text-[11px]">To:</label>
          <input value={to} onChange={(e) => setTo(e.target.value)} className="border border-[#999] px-1 py-[2px] text-[12px] flex-1" placeholder="friend@hotmail.com" />
        </div>
        <div className="flex items-center gap-2">
          <label className="w-[50px] text-[11px]">Subject:</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="border border-[#999] px-1 py-[2px] text-[12px] flex-1" />
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className="border border-[#999] px-1 py-[2px] text-[12px] w-full" placeholder="Type your message here..." />
        <button type="submit" className="bg-[#003399] text-white border-none px-4 py-1 text-[12px] font-bold cursor-pointer">
          Send
        </button>
      </div>
    </form>
  );
}
