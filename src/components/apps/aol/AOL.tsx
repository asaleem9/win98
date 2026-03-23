'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { Button98 } from '@/components/ui/Button98';
import { ProgressBar98 } from '@/components/ui/ProgressBar98';

const CONNECTION_STEPS = [
  'Finding AOL access number...',
  'Dialing 1-800-827-6364...',
  'Connecting at 28,800 bps...',
  'Checking password...',
  'Getting your stuff ready...',
];

const CHANNELS = [
  { name: 'AOL Today', color: '#ff6600' },
  { name: 'News', color: '#0066cc' },
  { name: 'Sports', color: '#009900' },
  { name: 'Entertainment', color: '#cc0066' },
  { name: 'Travel', color: '#006699' },
  { name: 'Shopping', color: '#990099' },
  { name: 'Kids Only', color: '#ff3300' },
  { name: 'Personal Finance', color: '#336633' },
];

const SPAM_EMAILS = [
  { from: 'prince_nigeria@aol.com', subject: 'URGENT: I Need Your Help Moving $45,000,000 USD', date: '12/14/98' },
  { from: 'FREE_STUFF@juno.com', subject: '!!! FREE VACATION !!! YOU HAVE WON !!!', date: '12/14/98' },
  { from: 'chainletter@hotmail.com', subject: 'Fwd: Fwd: Fwd: FWD: SEND THIS TO 10 FRIENDS OR ELSE', date: '12/13/98' },
  { from: 'make_money@aol.com', subject: 'MAKE $5,000 A DAY WORKING FROM HOME!!!', date: '12/13/98' },
  { from: 'bill_gates@microsoft.com', subject: 'Microsoft & AOL Email Tracking - FORWARD THIS', date: '12/12/98' },
  { from: 'angel_cutie99@aol.com', subject: 'Hi! a/s/l? :-) Do you wanna chat??', date: '12/12/98' },
  { from: 'vitamins@yahoo.com', subject: 'LOSE 30 POUNDS IN 30 DAYS - GUARANTEED!!!', date: '12/11/98' },
  { from: 'lucky_winner@aol.com', subject: 'CONGRATULATIONS!!! You are our 1,000,000th user!', date: '12/10/98' },
];

export default function AOL({ windowId }: AppComponentProps) {
  const [phase, setPhase] = useState<'connecting' | 'main' | 'mail'>('connecting');
  const [connectionStep, setConnectionStep] = useState(0);
  const [connectionProgress, setConnectionProgress] = useState(0);
  const [showMailNotification, setShowMailNotification] = useState(true);

  useEffect(() => {
    if (phase !== 'connecting') return;
    const stepDuration = 1200;
    const progressInterval = setInterval(() => {
      setConnectionProgress((prev) => {
        const target = ((connectionStep + 1) / CONNECTION_STEPS.length) * 100;
        if (prev < target) return Math.min(prev + 2, target);
        return prev;
      });
    }, 50);

    const stepTimer = setTimeout(() => {
      if (connectionStep < CONNECTION_STEPS.length - 1) {
        setConnectionStep((s) => s + 1);
      } else {
        setPhase('main');
      }
    }, stepDuration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(stepTimer);
    };
  }, [phase, connectionStep]);

  if (phase === 'connecting') {
    return <ConnectionDialog step={connectionStep} progress={connectionProgress} />;
  }

  if (phase === 'mail') {
    return <MailInbox onBack={() => setPhase('main')} />;
  }

  return (
    <div className="flex-1 flex flex-col bg-[#dfe8f0] font-[family-name:var(--win98-font)] text-[11px]">
      {/* AOL toolbar */}
      <div className="bg-[#336699] flex items-center px-2 py-1 gap-1">
        <span className="text-white font-bold text-[14px] mr-3" style={{ fontFamily: 'Arial, sans-serif' }}>
          AOL
        </span>
        {['Read', 'Write', 'Mail Center', 'Print', 'My Files', 'My AOL', 'Favorites', 'Internet', 'Channels', 'People', 'Find'].map((btn) => (
          <button
            key={btn}
            className="text-white text-[10px] px-2 py-[2px] hover:bg-[#4477aa] rounded-sm cursor-pointer"
            onClick={btn === 'Mail Center' ? () => setPhase('mail') : undefined}
          >
            {btn}
          </button>
        ))}
      </div>

      {/* Welcome content */}
      <div className="flex-1 overflow-auto p-4">
        {/* You've Got Mail notification */}
        {showMailNotification && (
          <div className="bg-[#ffffcc] border-2 border-[#cc9900] p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-[24px]">📬</div>
              <div>
                <div className="font-bold text-[14px] text-[#cc6600]">You&apos;ve Got Mail!</div>
                <div className="text-[11px] text-[#666]">You have {SPAM_EMAILS.length} new messages</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button98 className="min-w-[60px]" onClick={() => setPhase('mail')}>Read Mail</Button98>
              <Button98 className="min-w-[40px] min-h-0" onClick={() => setShowMailNotification(false)}>OK</Button98>
            </div>
          </div>
        )}

        {/* Welcome banner */}
        <div className="bg-white border border-[#999] p-4 mb-4 text-center">
          <div className="text-[20px] font-bold text-[#336699] mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>
            Welcome, SurfDude98!
          </div>
          <div className="text-[12px] text-[#666]">
            America Online 4.0 &mdash; So easy to use, no wonder it&apos;s #1
          </div>
        </div>

        {/* Channels */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {CHANNELS.map((channel) => (
            <button
              key={channel.name}
              className="bg-white border border-[#999] p-3 text-center cursor-pointer hover:bg-[#eef3f8] transition-colors"
            >
              <div className="text-[20px] mb-1" style={{ color: channel.color }}>
                {channel.name === 'AOL Today' ? '🌐' :
                 channel.name === 'News' ? '📰' :
                 channel.name === 'Sports' ? '⚽' :
                 channel.name === 'Entertainment' ? '🎬' :
                 channel.name === 'Travel' ? '✈️' :
                 channel.name === 'Shopping' ? '🛒' :
                 channel.name === 'Kids Only' ? '🧒' : '💰'}
              </div>
              <div className="text-[11px] font-bold" style={{ color: channel.color }}>
                {channel.name}
              </div>
            </button>
          ))}
        </div>

        {/* AOL news */}
        <div className="bg-white border border-[#999] p-3">
          <div className="font-bold text-[13px] text-[#336699] mb-2">AOL Today</div>
          <div className="space-y-1 text-[11px]">
            <div className="text-[#0000cc] underline cursor-pointer">Is your computer ready for Y2K? Take our quiz!</div>
            <div className="text-[#0000cc] underline cursor-pointer">Chat with the cast of &quot;Friends&quot; tonight at 9pm ET</div>
            <div className="text-[#0000cc] underline cursor-pointer">Download the latest version of AOL Instant Messenger</div>
            <div className="text-[#0000cc] underline cursor-pointer">Win a FREE trip to Disneyland! Click here!</div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center h-[20px] px-2 bg-[#336699] text-white text-[10px]">
        <span>Connected at 28,800 bps</span>
        <span className="ml-auto">Keyword: Welcome</span>
      </div>
    </div>
  );
}

function ConnectionDialog({ step, progress }: { step: number; progress: number }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-[var(--win98-button-face)]">
      <div className="w-[350px] bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)] p-4">
        <div className="text-center mb-4">
          <div className="text-[16px] font-bold text-[#336699] mb-2" style={{ fontFamily: 'Arial, sans-serif' }}>
            AOL
          </div>
          <div className="text-[14px] font-bold mb-1">Connecting...</div>
        </div>

        <div className="text-center text-[12px] mb-3 h-[16px]">
          {CONNECTION_STEPS[step]}
        </div>

        <ProgressBar98 value={progress} className="mb-3" />

        {/* Modem noise visualization */}
        <div className="bg-black p-2 mb-3 h-[30px] flex items-end justify-center gap-[2px]">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="w-[4px] bg-[#00ff00] transition-all duration-75"
              style={{
                height: `${Math.random() * 100}%`,
                opacity: step < 3 ? 1 : 0.3,
              }}
            />
          ))}
        </div>

        <div className="text-center">
          <Button98 className="min-w-[80px]" disabled>
            Cancel
          </Button98>
        </div>
      </div>
    </div>
  );
}

function MailInbox({ onBack }: { onBack: () => void }) {
  const [selectedEmail, setSelectedEmail] = useState<number | null>(null);

  return (
    <div className="flex-1 flex flex-col bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* Mail toolbar */}
      <div className="bg-[#336699] flex items-center px-2 py-1 gap-1">
        <button onClick={onBack} className="text-white text-[10px] px-2 py-[2px] hover:bg-[#4477aa] rounded-sm cursor-pointer">
          ← Back
        </button>
        <span className="text-white font-bold text-[12px] ml-2">
          New Mail ({SPAM_EMAILS.length})
        </span>
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)]">
              <th className="text-left px-2 py-1 font-normal w-[20px]"></th>
              <th className="text-left px-2 py-1 font-normal">From</th>
              <th className="text-left px-2 py-1 font-normal">Subject</th>
              <th className="text-left px-2 py-1 font-normal w-[70px]">Date</th>
            </tr>
          </thead>
          <tbody>
            {SPAM_EMAILS.map((email, i) => (
              <tr
                key={i}
                className={`cursor-pointer ${selectedEmail === i ? 'bg-[var(--win98-highlight)] text-white' : 'hover:bg-[#e8e8e8]'}`}
                onClick={() => setSelectedEmail(i)}
              >
                <td className="px-2 py-[2px]">📧</td>
                <td className="px-2 py-[2px] truncate max-w-[150px]">{email.from}</td>
                <td className="px-2 py-[2px] truncate font-bold">{email.subject}</td>
                <td className="px-2 py-[2px]">{email.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Preview */}
      {selectedEmail !== null && (
        <div className="h-[120px] border-t-2 border-[var(--win98-button-shadow)] bg-white p-2 overflow-auto">
          <div className="text-[11px]">
            <div><strong>From:</strong> {SPAM_EMAILS[selectedEmail].from}</div>
            <div><strong>Subject:</strong> {SPAM_EMAILS[selectedEmail].subject}</div>
            <div><strong>Date:</strong> {SPAM_EMAILS[selectedEmail].date}</div>
            <hr className="my-1 border-[#ccc]" />
            <div className="text-[12px]">
              {selectedEmail === 0 && 'Dear Sir/Madam, I am Prince Abubakar, son of the late General Sani Abacha. I am writing to request your assistance in transferring $45,000,000 (Forty Five Million United States Dollars)...'}
              {selectedEmail === 1 && 'CONGRATULATIONS!!!! You have been selected to receive a FREE ALL-EXPENSES-PAID vacation to the Bahamas!!! Just click the link below and enter your Social Security Number to claim your prize!!!'}
              {selectedEmail === 2 && '>>>>> PLEASE FORWARD THIS TO EVERYONE YOU KNOW <<<<< A little boy in Arkansas needs your help. For every person that forwards this email, AOL will donate $1 to his medical bills...'}
              {selectedEmail === 3 && 'I used to be just like you, working 9-5 for peanuts. Then I discovered this AMAZING system that lets me MAKE MONEY while I SLEEP. Send $19.95 to learn how YOU can too!!!'}
              {selectedEmail === 4 && 'Hello Everyone, My name is Bill Gates. I have just developed an email tracking program. Forward this email to everyone you know and you will receive $245.00 per person...'}
              {selectedEmail === 5 && 'hEy!! i found ur screen name in a chatroom... u seem really cool :-) wanna chat sometime? im 18/f/cali... check out my homepage at http://www.angelfire.com/~angel_cutie99'}
              {selectedEmail === 6 && 'AMAZING NEW PILL lets you LOSE WEIGHT while you EAT WHATEVER YOU WANT! Scientists HATE this one simple trick! Order now and get 50% OFF!!!'}
              {selectedEmail === 7 && 'CONGRATULATIONS! You have been randomly selected as our 1,000,000th member! To claim your prize of $1,000 in AOL credits, simply reply with your full name, address, and credit card number...'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
