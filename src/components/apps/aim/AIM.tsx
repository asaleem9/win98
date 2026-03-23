'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { AppComponentProps } from '@/types/app';

type BuddyStatus = 'online' | 'away' | 'offline';

interface Buddy {
  name: string;
  status: BuddyStatus;
  awayMessage?: string;
}

interface BuddyGroup {
  name: string;
  expanded: boolean;
  buddies: Buddy[];
}

const INITIAL_GROUPS: BuddyGroup[] = [
  {
    name: 'Buddies (5/8)',
    expanded: true,
    buddies: [
      { name: 'sk8erboi99', status: 'online' },
      { name: 'SoccerGurl14', status: 'online' },
      { name: 'xXDarkAngelXx', status: 'away', awayMessage: '~*~aWaY~*~ "All that glitters is not gold" ~*~' },
      { name: 'CoolDude2000', status: 'away', awayMessage: 'BRB getting pizza 🍕' },
      { name: 'surfergirl_ca', status: 'online' },
      { name: 'N64Master', status: 'offline' },
      { name: 'LilMissSunshine', status: 'online' },
      { name: 'PoKeMonFaN', status: 'offline' },
    ],
  },
  {
    name: 'Family (2/4)',
    expanded: true,
    buddies: [
      { name: 'Mom_1998', status: 'online' },
      { name: 'DadOnline', status: 'offline' },
      { name: 'Sis_xoxo', status: 'online' },
      { name: 'Uncle_Bob', status: 'offline' },
    ],
  },
  {
    name: 'Co-Workers (1/3)',
    expanded: false,
    buddies: [
      { name: 'JimFromAccounting', status: 'away', awayMessage: 'In a meeting. "Life moves pretty fast..." - Ferris Bueller' },
      { name: 'BossMan_Steve', status: 'offline' },
      { name: 'IT_Support_Karen', status: 'online' },
    ],
  },
];

const BOT_RESPONSES = [
  'lol',
  'brb',
  'thats so cool!!',
  'omg really??',
  'a/s/l?',
  'haha u r so funny',
  'g2g ttyl!',
  'rotfl',
  'sup?',
  'nm u?',
  'thats awesome!!! :D',
  'whatever',
  'do u have napster?',
  'did u see that new movie?',
  'check out my away message lol',
  'wanna play starcraft?',
  ':-) :-) :-)',
  'I just downloaded a cool mp3',
  'my mom is yelling at me to get off the phone line',
  'hold on someones IMing me',
];

function StatusDot({ status }: { status: BuddyStatus }) {
  return (
    <span className={`inline-block w-[8px] h-[8px] rounded-full mr-1 ${
      status === 'online' ? 'bg-[#00cc00]' :
      status === 'away' ? 'bg-[#cccc00]' :
      'bg-[#999]'
    }`} />
  );
}

export default function AIM({ windowId }: AppComponentProps) {
  const [groups, setGroups] = useState(INITIAL_GROUPS);
  const [chatWith, setChatWith] = useState<Buddy | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ from: string; text: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleGroup = useCallback((groupName: string) => {
    setGroups((gs) =>
      gs.map((g) => g.name === groupName ? { ...g, expanded: !g.expanded } : g)
    );
  }, []);

  const openChat = useCallback((buddy: Buddy) => {
    if (buddy.status === 'offline') return;
    setChatWith(buddy);
    setChatMessages([]);
    setChatInput('');
  }, []);

  const sendMessage = useCallback(() => {
    if (!chatInput.trim() || !chatWith) return;
    const userMsg = chatInput.trim();
    setChatMessages((prev) => [...prev, { from: 'You', text: userMsg }]);
    setChatInput('');

    if (chatWith.status === 'away') {
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          { from: chatWith.name, text: `[Auto-Response] ${chatWith.awayMessage}` },
        ]);
      }, 500);
    } else {
      const delay = 1000 + Math.random() * 2000;
      setTimeout(() => {
        const response = BOT_RESPONSES[Math.floor(Math.random() * BOT_RESPONSES.length)];
        setChatMessages((prev) => [...prev, { from: chatWith.name, text: response }]);
      }, delay);
    }
  }, [chatInput, chatWith]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (chatWith) {
    return (
      <div className="flex-1 flex flex-col bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
        {/* Chat header */}
        <div className="flex items-center px-2 py-1 border-b border-[var(--win98-button-shadow)] bg-[var(--win98-button-face)]">
          <button
            onClick={() => setChatWith(null)}
            className="text-[11px] underline text-[#0000cc] cursor-pointer mr-2"
          >
            ← Buddy List
          </button>
          <StatusDot status={chatWith.status} />
          <span className="font-bold">{chatWith.name}</span>
          {chatWith.status === 'away' && <span className="text-[#999] ml-1">(Away)</span>}
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-auto bg-white p-2 border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] mx-1 mt-1">
          {chatMessages.length === 0 && (
            <div className="text-[#999] text-center mt-4">
              Send a message to start chatting with {chatWith.name}
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} className="mb-1">
              <span className={`font-bold ${msg.from === 'You' ? 'text-[#cc0000]' : 'text-[#0000cc]'}`}>
                {msg.from}:
              </span>{' '}
              <span>{msg.text}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat input */}
        <div className="p-1 flex gap-1">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
            className="flex-1 border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] px-1 py-[2px] text-[11px] outline-none"
            placeholder="Type a message..."
          />
          <button
            onClick={sendMessage}
            className="bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] px-2 py-[1px] text-[11px] cursor-pointer active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]"
          >
            Send
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* AIM header */}
      <div className="bg-[#ffcc00] text-center py-1 px-2">
        <div className="text-[14px] font-bold text-black">
          AIM Buddy List
        </div>
        <div className="text-[10px] text-[#666]">Screen Name: SurfDude98</div>
      </div>

      {/* Buddy list */}
      <div className="flex-1 overflow-auto bg-white border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] mx-1 my-1">
        {groups.map((group) => (
          <div key={group.name}>
            <div
              className="flex items-center px-2 py-[2px] bg-[#e8e8e8] border-b border-[#ccc] cursor-pointer select-none font-bold hover:bg-[#d0d0d0]"
              onClick={() => toggleGroup(group.name)}
            >
              <span className="mr-1 text-[10px]">{group.expanded ? '▼' : '►'}</span>
              {group.name}
            </div>
            {group.expanded && group.buddies.map((buddy) => (
              <div
                key={buddy.name}
                className={`flex items-center px-3 py-[2px] cursor-pointer select-none ${
                  buddy.status === 'offline' ? 'text-[#999]' : 'hover:bg-[#e8e8ff]'
                }`}
                onDoubleClick={() => openChat(buddy)}
              >
                <StatusDot status={buddy.status} />
                <span className={buddy.status === 'away' ? 'italic' : ''}>
                  {buddy.name}
                </span>
                {buddy.status === 'away' && (
                  <span className="text-[#999] text-[10px] ml-1 truncate">(Away)</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Bottom buttons */}
      <div className="flex justify-center gap-1 px-1 py-1">
        <button className="text-[10px] text-[#0000cc] underline cursor-pointer">Setup</button>
        <span className="text-[#999]">|</span>
        <button className="text-[10px] text-[#0000cc] underline cursor-pointer">Away Message</button>
      </div>
    </div>
  );
}
