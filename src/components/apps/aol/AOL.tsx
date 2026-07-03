'use client';

import { useState, useEffect } from 'react';
import { AppComponentProps } from '@/types/app';
import { Button98 } from '@/components/ui/Button98';
import { Input98 } from '@/components/ui/Input98';
import { ProgressBar98 } from '@/components/ui/ProgressBar98';
import { useWindows } from '@/contexts/WindowContext';
import { showSystemError } from '@/hooks/useFileOpener';
import { playSound } from '@/lib/sounds';

const CONNECTION_STEPS = [
  'Finding AOL access number...',
  'Dialing 1-800-827-6364...',
  'Connecting at 28,800 bps...',
  'Checking password...',
  'Getting your stuff ready...',
];

// Total connect time tuned to the length of modem-dial.mp3 (~4.6s).
const STEP_DURATION = 920;

interface Channel {
  name: string;
  color: string;
  icon: string;
}

const CHANNELS: Channel[] = [
  { name: 'AOL Today', color: '#ff6600', icon: '🌐' },
  { name: 'News', color: '#0066cc', icon: '📰' },
  { name: 'Sports', color: '#009900', icon: '⚽' },
  { name: 'Weather', color: '#0099cc', icon: '☀️' },
  { name: 'Entertainment', color: '#cc0066', icon: '🎬' },
  { name: 'Travel', color: '#006699', icon: '✈️' },
  { name: 'Shopping', color: '#990099', icon: '🛒' },
  { name: 'Personal Finance', color: '#336633', icon: '💰' },
];

interface ChannelContent {
  tagline: string;
  headlines: { title: string; blurb: string }[];
}

const CHANNEL_CONTENT: Record<string, ChannelContent> = {
  'AOL Today': {
    tagline: 'Your online world starts here',
    headlines: [
      { title: 'Is your computer ready for Y2K?', blurb: 'Take our quiz to find out if the Millennium Bug will bite your PC.' },
      { title: 'Chat with the cast of "Friends" tonight', blurb: 'Live in the AOL Auditorium at 9pm ET. Keyword: Friends.' },
      { title: 'Free 500 hours!', blurb: 'Tell a friend about AOL and you both get free hours.' },
    ],
  },
  News: {
    tagline: 'The latest from around the world',
    headlines: [
      { title: 'Euro currency launches in 11 countries', blurb: 'The new European currency began trading this week.' },
      { title: 'John Glenn returns to space at age 77', blurb: 'The oldest person ever to fly in space aboard Discovery.' },
      { title: 'Google.com opens to the public', blurb: 'A new search engine out of Stanford aims to organize the Web.' },
      { title: 'Furby is the must-have toy this holiday', blurb: 'Stores nationwide are sold out of the talking creature.' },
    ],
  },
  Sports: {
    tagline: 'Scores, stats and highlights',
    headlines: [
      { title: 'McGwire hits 70th home run', blurb: 'Big Mac sets a new single-season record in a thrilling finish.' },
      { title: 'Yankees win the World Series', blurb: 'New York sweeps San Diego for their 24th championship.' },
      { title: 'Jordan leads Bulls to sixth title', blurb: 'MJ hits the game-winner. Is this his last dance?' },
      { title: 'Broncos repeat as Super Bowl champs', blurb: 'Elway rides off into the sunset with back-to-back rings.' },
    ],
  },
  Weather: {
    tagline: 'Your 5-day forecast',
    headlines: [
      { title: 'Today: Partly Cloudy, 68°F', blurb: 'Winds NW at 10 mph. Humidity 45%. UV index moderate.' },
      { title: 'Tomorrow: Sunny, 72°F', blurb: 'A beautiful day ahead. Great for a trip to the mall.' },
      { title: 'Weekend outlook', blurb: 'Scattered showers Saturday, clearing by Sunday afternoon.' },
      { title: 'Enter your ZIP for local weather', blurb: 'Keyword: Weather. Powered by The Weather Channel.' },
    ],
  },
  Entertainment: {
    tagline: 'Movies, music and TV',
    headlines: [
      { title: 'Titanic sweeps the Oscars', blurb: "James Cameron's epic takes home 11 Academy Awards." },
      { title: 'The Phantom Menace hits theaters', blurb: 'Star Wars is back! Fans camp out for opening night.' },
      { title: 'Britney Spears tops the charts', blurb: '"...Baby One More Time" is the song of the year.' },
    ],
  },
  Travel: {
    tagline: 'See the world for less',
    headlines: [
      { title: 'Round-trip to Orlando: $199', blurb: 'Book your Disney vacation online and save.' },
      { title: 'Cruise deals for the new millennium', blurb: 'Ring in Y2K on the high seas. Limited cabins available.' },
      { title: 'Rent a car from $24.99/day', blurb: 'Reserve online with your AOL member discount.' },
    ],
  },
  Shopping: {
    tagline: 'The AOL Shopping Channel',
    headlines: [
      { title: "Amazon.com — Earth's biggest bookstore", blurb: 'Now selling music and more. Free shipping over $25.' },
      { title: 'eBay: Bid on millions of items', blurb: 'Beanie Babies, Pokemon cards, and more up for auction.' },
      { title: 'Buy a Pentium III PC for $999', blurb: '450 MHz, 64 MB RAM, 8 GB hard drive. While supplies last.' },
    ],
  },
  'Personal Finance': {
    tagline: 'Manage your money online',
    headlines: [
      { title: 'The Dow tops 10,000 for the first time', blurb: 'Markets soar as the dot-com boom continues.' },
      { title: 'Should you invest in Internet stocks?', blurb: 'Experts weigh in on the tech gold rush.' },
      { title: 'Track your portfolio online', blurb: 'Keyword: Quotes. Get 20-minute delayed stock prices.' },
    ],
  },
};

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

const TOOLBAR_BUTTONS = ['Read', 'Write', 'Mail Center', 'Print', 'My Files', 'My AOL', 'Favorites', 'Internet', 'Channels', 'People', 'Find'];

type Phase = 'connecting' | 'signoff' | 'main' | 'mail' | 'channel';

export default function AOL({ windowId }: AppComponentProps) {
  void windowId;
  const { openWindow } = useWindows();
  const [phase, setPhase] = useState<Phase>('connecting');
  const [connectionStep, setConnectionStep] = useState(0);
  const [connectionProgress, setConnectionProgress] = useState(0);
  const [showMailNotification, setShowMailNotification] = useState(true);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');

  // Modem handshake tone plays once at the start of the dial sequence.
  useEffect(() => {
    if (phase === 'connecting' && connectionStep === 0 && connectionProgress === 0) {
      playSound('modemDial');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // "Welcome / You've Got Mail" chime when the session opens.
  useEffect(() => {
    if (phase === 'main' && showMailNotification) {
      playSound('youveGotMail');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== 'connecting') return;
    const progressInterval = setInterval(() => {
      setConnectionProgress((prev) => {
        const target = ((connectionStep + 1) / CONNECTION_STEPS.length) * 100;
        return prev < target ? Math.min(prev + 2, target) : prev;
      });
    }, 40);

    const stepTimer = setTimeout(() => {
      if (connectionStep < CONNECTION_STEPS.length - 1) {
        setConnectionStep((s) => s + 1);
      } else {
        setPhase('main');
      }
    }, STEP_DURATION);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(stepTimer);
    };
  }, [phase, connectionStep]);

  const cancelConnect = () => {
    setPhase('signoff');
    setConnectionStep(0);
    setConnectionProgress(0);
  };

  const reconnect = () => {
    setPhase('connecting');
    setConnectionStep(0);
    setConnectionProgress(0);
  };

  const openChannel = (name: string) => {
    setActiveChannel(name);
    setPhase('channel');
  };

  const handleToolbar = (btn: string) => {
    switch (btn) {
      case 'Read':
      case 'Write':
      case 'Mail Center':
        setPhase('mail');
        break;
      case 'Channels':
        setPhase('main');
        break;
      case 'Internet':
        openWindow('ie5');
        break;
      case 'People':
        showSystemError('People Connection', 'Welcome to the People Connection!\n\nAll chat rooms are currently full. Please try again later.');
        break;
      case 'Find':
        showSystemError('Find', 'Keyword: Find\n\nWhat would you like to find on AOL? Type a keyword in the keyword box.');
        break;
      default:
        showSystemError(btn, `${btn} is not available in this AOL preview.`);
    }
  };

  const goKeyword = () => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return;
    if (kw === 'mail' || kw === 'mailbox') {
      setPhase('mail');
      setKeyword('');
      return;
    }
    const match = CHANNELS.find((c) => c.name.toLowerCase() === kw || c.name.toLowerCase().includes(kw));
    if (match) {
      openChannel(match.name);
      setKeyword('');
    } else {
      showSystemError('Keyword Not Found', `AOL does not recognize the keyword "${keyword.trim()}".\n\nPlease check your spelling, or click Search to look for related content.`);
    }
  };

  if (phase === 'connecting') {
    return <ConnectionDialog step={connectionStep} progress={connectionProgress} onCancel={cancelConnect} />;
  }

  if (phase === 'signoff') {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#dfe8f0]">
        <div className="text-center">
          <div className="text-[20px] font-bold text-[#336699] mb-2" style={{ fontFamily: 'Arial, sans-serif' }}>AOL</div>
          <div className="text-[13px] mb-4">You have signed off. Thank you for using America Online!</div>
          <Button98 className="min-w-[100px]" onClick={reconnect}>Sign On</Button98>
        </div>
      </div>
    );
  }

  if (phase === 'mail') {
    return <MailInbox onBack={() => setPhase('main')} />;
  }

  if (phase === 'channel' && activeChannel) {
    return (
      <ChannelPage
        channel={CHANNELS.find((c) => c.name === activeChannel)!}
        content={CHANNEL_CONTENT[activeChannel]}
        onBack={() => setPhase('main')}
        onToolbar={handleToolbar}
        keyword={keyword}
        setKeyword={setKeyword}
        goKeyword={goKeyword}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#dfe8f0] font-[family-name:var(--win98-font)] text-[11px]">
      <AOLToolbar onToolbar={handleToolbar} />
      <KeywordBar keyword={keyword} setKeyword={setKeyword} goKeyword={goKeyword} />

      <div className="flex-1 overflow-auto p-4">
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

        <div className="bg-white border border-[#999] p-4 mb-4 text-center">
          <div className="text-[20px] font-bold text-[#336699] mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>
            Welcome, SurfDude98!
          </div>
          <div className="text-[12px] text-[#666]">
            America Online 4.0 &mdash; So easy to use, no wonder it&apos;s #1
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {CHANNELS.map((channel) => (
            <button
              key={channel.name}
              onClick={() => openChannel(channel.name)}
              className="bg-white border border-[#999] p-3 text-center cursor-pointer hover:bg-[#eef3f8] transition-colors"
            >
              <div className="text-[20px] mb-1">{channel.icon}</div>
              <div className="text-[11px] font-bold" style={{ color: channel.color }}>{channel.name}</div>
            </button>
          ))}
        </div>

        <div className="bg-white border border-[#999] p-3">
          <div className="font-bold text-[13px] text-[#336699] mb-2">AOL Today</div>
          <div className="space-y-1 text-[11px]">
            {CHANNEL_CONTENT['AOL Today'].headlines.map((h) => (
              <div key={h.title} className="text-[#0000cc] underline cursor-pointer" onClick={() => openChannel('AOL Today')}>
                {h.title}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center h-[20px] px-2 bg-[#336699] text-white text-[10px]">
        <span>Connected at 28,800 bps</span>
        <span className="ml-auto">Keyword: Welcome</span>
      </div>
    </div>
  );
}

function AOLToolbar({ onToolbar }: { onToolbar: (btn: string) => void }) {
  return (
    <div className="bg-[#336699] flex items-center px-2 py-1 gap-1 flex-wrap">
      <span className="text-white font-bold text-[14px] mr-3" style={{ fontFamily: 'Arial, sans-serif' }}>AOL</span>
      {TOOLBAR_BUTTONS.map((btn) => (
        <button
          key={btn}
          className="text-white text-[10px] px-2 py-[2px] hover:bg-[#4477aa] rounded-sm cursor-pointer"
          onClick={() => onToolbar(btn)}
        >
          {btn}
        </button>
      ))}
    </div>
  );
}

function KeywordBar({ keyword, setKeyword, goKeyword }: { keyword: string; setKeyword: (v: string) => void; goKeyword: () => void }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-[#c9d9e8] border-b border-[#88aacc]">
      <span className="text-[10px] font-bold text-[#336699]">Keyword:</span>
      <Input98
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') goKeyword(); }}
        className="flex-1 h-[18px]"
        placeholder="Type a keyword (e.g. News, Sports, Weather)"
      />
      <Button98 className="min-w-[40px] min-h-[18px] h-[18px]" onClick={goKeyword}>Go</Button98>
    </div>
  );
}

function ChannelPage({ channel, content, onBack, onToolbar, keyword, setKeyword, goKeyword }: {
  channel: Channel;
  content?: ChannelContent;
  onBack: () => void;
  onToolbar: (btn: string) => void;
  keyword: string;
  setKeyword: (v: string) => void;
  goKeyword: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col bg-[#dfe8f0] font-[family-name:var(--win98-font)] text-[11px]">
      <AOLToolbar onToolbar={onToolbar} />
      <KeywordBar keyword={keyword} setKeyword={setKeyword} goKeyword={goKeyword} />

      <div className="px-2 py-1 flex items-center gap-2 border-b border-[#88aacc]">
        <button onClick={onBack} className="text-[#0000cc] underline text-[10px] cursor-pointer">← Channels</button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="text-white px-4 py-3" style={{ background: channel.color }}>
          <div className="text-[22px] font-bold flex items-center gap-2" style={{ fontFamily: 'Arial, sans-serif' }}>
            <span>{channel.icon}</span> {channel.name}
          </div>
          <div className="text-[11px] opacity-90">{content?.tagline}</div>
        </div>

        <div className="p-4 space-y-3">
          {content ? content.headlines.map((h) => (
            <div key={h.title} className="bg-white border border-[#999] p-3">
              <div className="text-[13px] font-bold text-[#0000cc] underline cursor-pointer mb-1">{h.title}</div>
              <div className="text-[11px] text-[#333]">{h.blurb}</div>
            </div>
          )) : (
            <div className="bg-white border border-[#999] p-4 text-center text-[#666]">
              This channel is under construction. Check back soon!
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center h-[20px] px-2 bg-[#336699] text-white text-[10px]">
        <span>Connected at 28,800 bps</span>
        <span className="ml-auto">Keyword: {channel.name}</span>
      </div>
    </div>
  );
}

function ConnectionDialog({ step, progress, onCancel }: { step: number; progress: number; onCancel: () => void }) {
  const [bars, setBars] = useState<number[]>(() => Array.from({ length: 30 }, (_, i) => 20 + ((i * 37) % 80)));

  // Animate the modem "noise" bars in an effect so render stays pure.
  useEffect(() => {
    const interval = setInterval(() => {
      setBars((prev) => prev.map(() => 10 + Math.random() * 90));
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center bg-[var(--win98-button-face)]">
      <div className="w-[350px] bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)] p-4">
        <div className="text-center mb-4">
          <div className="text-[16px] font-bold text-[#336699] mb-2" style={{ fontFamily: 'Arial, sans-serif' }}>AOL</div>
          <div className="text-[14px] font-bold mb-1">Connecting...</div>
        </div>

        <div className="text-center text-[12px] mb-3 h-[16px]">{CONNECTION_STEPS[step]}</div>

        <ProgressBar98 value={progress} className="mb-3" />

        <div className="bg-black p-2 mb-3 h-[30px] flex items-end justify-center gap-[2px]">
          {bars.map((h, i) => (
            <div
              key={i}
              className="w-[4px] bg-[#00ff00] transition-all duration-75"
              style={{ height: `${h}%`, opacity: step < 3 ? 1 : 0.3 }}
            />
          ))}
        </div>

        <div className="text-center">
          <Button98 className="min-w-[80px]" onClick={onCancel}>Cancel</Button98>
        </div>
      </div>
    </div>
  );
}

function MailInbox({ onBack }: { onBack: () => void }) {
  const [selectedEmail, setSelectedEmail] = useState<number | null>(null);

  const bodies = [
    'Dear Sir/Madam, I am Prince Abubakar, son of the late General Sani Abacha. I am writing to request your assistance in transferring $45,000,000 (Forty Five Million United States Dollars)...',
    'CONGRATULATIONS!!!! You have been selected to receive a FREE ALL-EXPENSES-PAID vacation to the Bahamas!!! Just click the link below and enter your Social Security Number to claim your prize!!!',
    '>>>>> PLEASE FORWARD THIS TO EVERYONE YOU KNOW <<<<< A little boy in Arkansas needs your help. For every person that forwards this email, AOL will donate $1 to his medical bills...',
    'I used to be just like you, working 9-5 for peanuts. Then I discovered this AMAZING system that lets me MAKE MONEY while I SLEEP. Send $19.95 to learn how YOU can too!!!',
    'Hello Everyone, My name is Bill Gates. I have just developed an email tracking program. Forward this email to everyone you know and you will receive $245.00 per person...',
    'hEy!! i found ur screen name in a chatroom... u seem really cool :-) wanna chat sometime? im 18/f/cali... check out my homepage at http://www.angelfire.com/~angel_cutie99',
    'AMAZING NEW PILL lets you LOSE WEIGHT while you EAT WHATEVER YOU WANT! Scientists HATE this one simple trick! Order now and get 50% OFF!!!',
    'CONGRATULATIONS! You have been randomly selected as our 1,000,000th member! To claim your prize of $1,000 in AOL credits, simply reply with your full name, address, and credit card number...',
  ];

  return (
    <div className="flex-1 flex flex-col bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      <div className="bg-[#336699] flex items-center px-2 py-1 gap-1">
        <button onClick={onBack} className="text-white text-[10px] px-2 py-[2px] hover:bg-[#4477aa] rounded-sm cursor-pointer">← Back</button>
        <span className="text-white font-bold text-[12px] ml-2">New Mail ({SPAM_EMAILS.length})</span>
      </div>

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

      {selectedEmail !== null && (
        <div className="h-[120px] border-t-2 border-[var(--win98-button-shadow)] bg-white p-2 overflow-auto">
          <div className="text-[11px]">
            <div><strong>From:</strong> {SPAM_EMAILS[selectedEmail].from}</div>
            <div><strong>Subject:</strong> {SPAM_EMAILS[selectedEmail].subject}</div>
            <div><strong>Date:</strong> {SPAM_EMAILS[selectedEmail].date}</div>
            <hr className="my-1 border-[#ccc]" />
            <div className="text-[12px]">{bodies[selectedEmail]}</div>
          </div>
        </div>
      )}
    </div>
  );
}
