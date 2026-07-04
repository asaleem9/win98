'use client';

import { useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { playSound } from '@/lib/sounds';
import { emit } from '@/lib/eventBus';
import { generateReply, renderEmoticons } from './replyEngine';
import { AIM_WELCOME_EVENT } from './firstRun';

// The buddy who admires your freshly published GeoCities page, and how long
// after publishing they get around to IMing you about it.
const COMPLIMENT_BUDDY = 'sk8erboi99';
const COMPLIMENT_DELAY_MS = 60_000;

// On the first desktop session AIM auto-signs-on ~45s after login (scheduled in
// firstRun.ts); when it does, this buddy pings you about the bundled games.
const WELCOME_BUDDY = 'sk8erboi99';
const WELCOME_IM_TEXT = 'yo! ur computer came with games, check Programs =)';

// A while after you sign on, a buddy drops the era's inescapable link. Fires
// once per session and from a different buddy than the compliment hook so the
// two never pile onto the same conversation.
const LINK_DROP_BUDDY = 'surfergirl_ca';
const LINK_DROP_DELAY_MS = 90_000;
const LINK_DROP_MESSAGE = 'yo check this out www.hampsterdance.com';

// Session guard so the link only ever lands once, no matter how many times AIM
// is opened and closed.
let linkDropDelivered = false;

/** Test hook: forget that the link drop already happened this session. */
export function __resetAimLinkDrop(): void {
  linkDropDelivered = false;
}

// Matches a bare or fully-qualified URL inside a chat message so it can render
// as a clickable link (split() keeps the captured URL at odd indices).
const MESSAGE_URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

type BuddyStatus = 'online' | 'away' | 'offline';

interface MsgStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
}

interface Buddy {
  name: string;
  status: BuddyStatus;
  awayMessage?: string;
  profile?: string;
}

interface ChatMessage {
  from: string;
  text: string;
  timestamp: string;
  style?: MsgStyle;
}

interface BuddyGroup {
  name: string;
  expanded: boolean;
  buddies: Buddy[];
}

const MY_SCREEN_NAME = 'SurfDude98';

const AWAY_MESSAGES = [
  '~*~aWaY~*~ LiStEnInG tO 98 DeGrEeS ~*~ i LoVe NiCk!!! ~*~',
  '~*~ ShOwEr TiMe ~*~ LeAvE mE a MeSsAgE ~*~',
  '"Don\'t walk behind me; I may not lead. Don\'t walk in front of me; I may not follow. Just walk beside me and be my friend." - Albert Camus',
  'BrB... PhOnE!!! :-)',
  '~*~*~ If YoU cAnT hAnDLe Me At My WoRsT yOu DoNt DeSeRvE mE aT mY bEsT ~*~*~',
];

const MOODS = [
  'Feelin groovy ~*~',
  'bOrEd OuT oF mY mInD',
  'LiStEnInG 2 TLC - No Scrubs',
  'chattin w/ my peeps',
  'homework sux =(',
  'wHo WaNtS tO cHaT?!?!',
  '<3 JTT 4eVeR <3',
];

const INITIAL_GROUPS: BuddyGroup[] = [
  {
    name: 'Buddies',
    expanded: true,
    buddies: [
      { name: 'sk8erboi99', status: 'online', profile: '14/m/cali - i like tony hawk and blink 182' },
      { name: 'SoccerGurl14', status: 'online', profile: '14/f/texas - *~GoAl~* soccer is life!!' },
      { name: 'xXDarkAngelXx', status: 'away', awayMessage: '~*~aWaY~*~ "AlL tHaT gLiTtErS iS nOt GoLd" ~*~ lEaVe A mSg ~*~', profile: '15/f/ny - EvAnEsCeNcE rUlEz' },
      { name: 'CoolDude2000', status: 'away', awayMessage: 'BRB getting pizza... if ur reading this u know the deal lol' },
      { name: 'surfergirl_ca', status: 'online', profile: '16/f/san diego - catch me at the beach =)' },
      { name: 'N64Master', status: 'offline' },
      { name: 'LilMissSunshine', status: 'online', profile: 'hiii!!! im ashley, 13/f/florida - i <3 NSYNC' },
      { name: 'PoKeMonFaN', status: 'offline' },
    ],
  },
  {
    name: 'Family',
    expanded: true,
    buddies: [
      { name: 'Mom_1998', status: 'online', profile: 'The family computer lady :)' },
      { name: 'DadOnline', status: 'offline' },
      { name: 'Sis_xoxo', status: 'online', profile: '~*~ TaYlOr ~*~ 11/f - LeAvE mE aLoNe Im On ThE pHoNe' },
      { name: 'Uncle_Bob', status: 'offline' },
    ],
  },
  {
    name: 'Co-Workers',
    expanded: false,
    buddies: [
      { name: 'JimFromAccounting', status: 'away', awayMessage: 'In a meeting. "Life moves pretty fast. If you don\'t stop and look around once in a while, you could miss it." - Ferris Bueller' },
      { name: 'BossMan_Steve', status: 'offline' },
      { name: 'IT_Support_Karen', status: 'online', profile: 'Have you tried turning it off and on again?' },
    ],
  },
];

/** Flat list of every buddy screen name. Outlook's Address Book imports these
 *  as contacts (a screen name doubles as an AOL address, <name>@aol.com). */
export const AIM_BUDDY_NAMES: string[] = INITIAL_GROUPS.flatMap((g) => g.buddies.map((b) => b.name));

// Pre-loaded conversation history per buddy (shows when you open their chat)
const PRELOADED_CONVOS: Record<string, ChatMessage[]> = {
  'sk8erboi99': [
    { from: 'sk8erboi99', text: 'yooo', timestamp: '4:23 PM' },
    { from: 'sk8erboi99', text: 'a/s/l?', timestamp: '4:23 PM' },
    { from: MY_SCREEN_NAME, text: '15/m/cali u?', timestamp: '4:24 PM' },
    { from: 'sk8erboi99', text: '14/m/cali nice dude', timestamp: '4:24 PM' },
    { from: 'sk8erboi99', text: 'u play tony hawk pro skater 2??', timestamp: '4:24 PM' },
    { from: MY_SCREEN_NAME, text: 'duh lol its the best game ever', timestamp: '4:25 PM' },
    { from: 'sk8erboi99', text: 'i can do the 900 with tony its so sick', timestamp: '4:25 PM' },
    { from: MY_SCREEN_NAME, text: 'no way!! teach me', timestamp: '4:25 PM' },
    { from: 'sk8erboi99', text: 'ok add me on AIM and ill show u later. also do u have napster? i just got the new blink 182 album', timestamp: '4:26 PM' },
    { from: MY_SCREEN_NAME, text: 'ya dude napster rules. downloading takes forever on 56k tho lol', timestamp: '4:26 PM' },
    { from: 'sk8erboi99', text: 'lol word. my mom yelled at me cuz she couldnt use the phone haha', timestamp: '4:27 PM' },
  ],
  'SoccerGurl14': [
    { from: 'SoccerGurl14', text: 'heyyyy!!!', timestamp: '3:45 PM' },
    { from: MY_SCREEN_NAME, text: 'hey!! whats up', timestamp: '3:45 PM' },
    { from: 'SoccerGurl14', text: 'nm just got home from soccer practice', timestamp: '3:46 PM' },
    { from: 'SoccerGurl14', text: 'a/s/l? lol jk i already know u', timestamp: '3:46 PM' },
    { from: MY_SCREEN_NAME, text: 'haha', timestamp: '3:46 PM' },
    { from: 'SoccerGurl14', text: 'did u watch TRL today?? carson daly played the new backstreet boys', timestamp: '3:47 PM' },
    { from: MY_SCREEN_NAME, text: 'backstreet boys r lame. NSYNC is way better', timestamp: '3:47 PM' },
    { from: 'SoccerGurl14', text: 'EXCUSE ME?!?!?!', timestamp: '3:47 PM' },
    { from: 'SoccerGurl14', text: 'BSB 4 LIFE!!!!', timestamp: '3:47 PM' },
    { from: MY_SCREEN_NAME, text: 'lol whatever u say', timestamp: '3:48 PM' },
    { from: 'SoccerGurl14', text: 'w/e... hey did u finish the math homework? i need help with #7', timestamp: '3:49 PM' },
  ],
  'surfergirl_ca': [
    { from: 'surfergirl_ca', text: 'hey :)', timestamp: '5:12 PM' },
    { from: MY_SCREEN_NAME, text: 'heyyy whats up', timestamp: '5:13 PM' },
    { from: 'surfergirl_ca', text: 'just got back from the beach. waves were SO good today', timestamp: '5:13 PM' },
    { from: MY_SCREEN_NAME, text: 'nice!! i wish i went', timestamp: '5:14 PM' },
    { from: 'surfergirl_ca', text: 'u should come next time!! were going saturday', timestamp: '5:14 PM' },
    { from: 'surfergirl_ca', text: 'hey random question... a/s/l? lol', timestamp: '5:15 PM' },
    { from: MY_SCREEN_NAME, text: '15/m/san diego lol u already know this', timestamp: '5:15 PM' },
    { from: 'surfergirl_ca', text: 'hehe i know i just like asking ;-)', timestamp: '5:15 PM' },
    { from: 'surfergirl_ca', text: 'omg have u heard that new TLC song No Scrubs? its soooo good', timestamp: '5:16 PM' },
    { from: MY_SCREEN_NAME, text: 'ya its on the radio like every 5 min lol', timestamp: '5:16 PM' },
  ],
  'LilMissSunshine': [
    { from: 'LilMissSunshine', text: 'HIIIIII!!!!!', timestamp: '6:01 PM' },
    { from: 'LilMissSunshine', text: 'omg omg omg', timestamp: '6:01 PM' },
    { from: MY_SCREEN_NAME, text: 'whats up lol', timestamp: '6:02 PM' },
    { from: 'LilMissSunshine', text: 'I JUST GOT NSYNC TICKETS FOR MY BDAY!!!!!! AHHHHH', timestamp: '6:02 PM' },
    { from: MY_SCREEN_NAME, text: 'no way thats awesome!!', timestamp: '6:02 PM' },
    { from: 'LilMissSunshine', text: 'I KNOW RIGHT!! im gonna marry justin timberlake someday lol', timestamp: '6:03 PM' },
    { from: 'LilMissSunshine', text: 'hey check out my new away message later its so cool', timestamp: '6:03 PM' },
    { from: 'LilMissSunshine', text: 'brb my mom says dinner', timestamp: '6:04 PM' },
  ],
  'Mom_1998': [
    { from: 'Mom_1998', text: 'Hi sweetie! How do I open the internet?', timestamp: '5:30 PM' },
    { from: MY_SCREEN_NAME, text: 'mom just double click the blue E on the desktop', timestamp: '5:31 PM' },
    { from: 'Mom_1998', text: 'Which one is the desktop?', timestamp: '5:31 PM' },
    { from: MY_SCREEN_NAME, text: 'MOM its the screen u see when u turn on the computer', timestamp: '5:32 PM' },
    { from: 'Mom_1998', text: 'Oh OK! I found it! It says "This page cannot be displayed"', timestamp: '5:33 PM' },
    { from: MY_SCREEN_NAME, text: 'thats because IM ON THE PHONE LINE mom!! u cant use internet when im on AIM', timestamp: '5:33 PM' },
    { from: 'Mom_1998', text: 'Well get off the computer, your father needs to make a call', timestamp: '5:34 PM' },
    { from: MY_SCREEN_NAME, text: 'ughhh 5 more minutes pleeease', timestamp: '5:34 PM' },
    { from: 'Mom_1998', text: 'NOW, mister. And did you do your homework?', timestamp: '5:35 PM' },
  ],
  'Sis_xoxo': [
    { from: 'Sis_xoxo', text: 'GET OFF THE COMPUTER I NEED TO USE THE PHONE', timestamp: '4:55 PM' },
    { from: MY_SCREEN_NAME, text: 'no way i was on first', timestamp: '4:55 PM' },
    { from: 'Sis_xoxo', text: 'IM TELLING MOM', timestamp: '4:55 PM' },
    { from: MY_SCREEN_NAME, text: 'fine tell her idc', timestamp: '4:56 PM' },
    { from: 'Sis_xoxo', text: 'MOOOOOOM HES HOGGING THE COMPUTER AGAIN', timestamp: '4:56 PM' },
    { from: MY_SCREEN_NAME, text: 'lol u typed that instead of yelling nice', timestamp: '4:56 PM' },
    { from: 'Sis_xoxo', text: 'shut up dork. btw did u take my lisa frank folder?', timestamp: '4:57 PM' },
  ],
  'IT_Support_Karen': [
    { from: 'IT_Support_Karen', text: 'Hey, did you submit a ticket about your printer?', timestamp: '2:15 PM' },
    { from: MY_SCREEN_NAME, text: 'ya it keeps saying PC LOAD LETTER', timestamp: '2:16 PM' },
    { from: 'IT_Support_Karen', text: 'Have you tried turning it off and on again?', timestamp: '2:16 PM' },
    { from: MY_SCREEN_NAME, text: 'yes like 5 times', timestamp: '2:17 PM' },
    { from: 'IT_Support_Karen', text: 'Hmm. Try unplugging it, waiting 30 seconds, and plugging it back in', timestamp: '2:17 PM' },
    { from: MY_SCREEN_NAME, text: 'thats the same thing lol', timestamp: '2:18 PM' },
    { from: 'IT_Support_Karen', text: "I'll put in a work order. Should be fixed in 3-5 business days", timestamp: '2:18 PM' },
  ],
};

// Context-aware responses based on what the buddy "knows"
const BUDDY_RESPONSES: Record<string, string[]> = {
  'sk8erboi99': [
    'dude u gotta check out this sick skate vid i found',
    'have u beaten the warehouse level yet?',
    'lol my dad just walked in and asked what a "chat room" is',
    'brb gonna grab some gushers',
    'yo did u see jackass last night?? it was hilarious',
    'haha nice',
    'word',
    'totally dude',
    'u wanna play starcraft later?',
    'im downloading the new offspring album on napster rn',
  ],
  'SoccerGurl14': [
    'lol ur so weird',
    'omg i just saw the cutest thing on tv',
    'BSB > NSYNC and thats FINAL',
    'did u see sarahs new profile?? she changed her font to comic sans lol',
    'hehe :P',
    'hey pass me ur notes from english class',
    'ugh i have SO much homework',
    'ttyl!! practice in 10 min',
    'r u going to the dance??',
    'brb phone',
  ],
  'surfergirl_ca': [
    'totally :)',
    'haha u crack me up',
    'the sunset was SO pretty today, wish u were there',
    'do u like sublime? theyre my fave band',
    'lol',
    'hey whats ur fave movie? mine is titanic',
    'omg same!!',
    'u r so sweet :)',
    'i gtg but talk later ok? :-)',
    'hold on my brother is being annoying',
  ],
  'LilMissSunshine': [
    'OMG OMG OMG',
    'AHHHH thats so cool!!!',
    'lol ur funny XD',
    'hey do u think JC or Justin is cuter?? i cant decide',
    'my new buddy profile is SO cute check it out',
    'ROTFL',
    'hehe ;-) ;-) ;-)',
    'ooh i love that song!!',
    'gtg byeee!!! <3 <3 <3',
    'wait wait wait tell me more!!',
  ],
  'Mom_1998': [
    'How do I do that?',
    'What is a "download"?',
    'Your aunt says hi! She just got email!',
    'Can you show me how to send an email to grandma?',
    'Is this thing on?',
    'I accidentally closed the internet. How do I get it back?',
    'Please get off the computer, I need to use the phone',
    'Dinner will be ready in 20 minutes!',
    'Did you clean your room yet?',
    'Love you sweetie! xoxo Mom',
  ],
  'Sis_xoxo': [
    'UGH ur so annoying',
    'MOOOOM',
    'get off the computer its MY turn',
    'fine whatever',
    'did u eat the last hot pocket??',
    'lol jk ur ok i guess',
    'can u help me with my book report?? pleeease',
    'im telling',
    'omg the spice girls broke up??? NOOO',
    'ur the worst brother ever. jk. but seriously get off',
  ],
  'IT_Support_Karen': [
    'Did you try restarting?',
    'Let me check the server logs',
    'Have you cleared your browser cache?',
    'That sounds like a PEBKAC error',
    'I\'ll escalate this to tier 2 support',
    'Is your ethernet cable plugged in?',
    'We\'re deploying a patch on Friday',
    'Please don\'t install Bonzi Buddy on your work computer',
    'The network will be down for maintenance tonight from 2-4 AM',
    'Have you updated your virus definitions?',
  ],
};

const DEFAULT_RESPONSES = [
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
  'hey whats ur profile say? lol',
  'omg this song is stuck in my head... TELL ME WHY... aint nothin but a heartache',
  'lol do u remember that hamster dance website?? dee da dee da dee da doh doh',
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

function SetupPanel({ onClose }: { onClose: () => void }) {
  const [prefs, setPrefs] = useState({
    autoSignOn: true,
    playSounds: true,
    showTimestamps: true,
    idleAway: false,
    saveHistory: true,
  });
  const rows: { key: keyof typeof prefs; label: string }[] = [
    { key: 'autoSignOn', label: 'Automatically sign on at startup' },
    { key: 'playSounds', label: 'Play sound when buddies sign on/off' },
    { key: 'showTimestamps', label: 'Show timestamps in IM windows' },
    { key: 'idleAway', label: 'Set me as "Away" when idle for 10 minutes' },
    { key: 'saveHistory', label: 'Automatically save my conversations' },
  ];
  return (
    <div className="flex-1 flex flex-col bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      <div className="bg-[#ffcc00] text-center py-1 px-2">
        <div className="text-[13px] font-bold text-black">AIM Preferences</div>
      </div>
      <div className="flex-1 overflow-auto m-1 p-3 bg-white border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
        <div className="text-[10px] text-[#666] mb-2">Sign On / Sign Off</div>
        {rows.map((r) => (
          <label key={r.key} className="flex items-center gap-2 py-[3px] cursor-pointer">
            <input
              type="checkbox"
              checked={prefs[r.key]}
              onChange={() => setPrefs((p) => ({ ...p, [r.key]: !p[r.key] }))}
            />
            <span>{r.label}</span>
          </label>
        ))}
        <div className="text-[10px] text-[#999] mt-3 border-t border-[#ddd] pt-2">
          Screen Name: <b>{MY_SCREEN_NAME}</b><br />
          AOL Instant Messenger (TM) version 4.3
        </div>
      </div>
      <div className="flex justify-center gap-1 py-1">
        <button
          onClick={onClose}
          className="bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] px-3 py-[2px] text-[11px] cursor-pointer active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]"
        >
          OK
        </button>
        <button
          onClick={onClose}
          className="bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] px-3 py-[2px] text-[11px] cursor-pointer active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function getTimeString() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m} ${ampm}`;
}

// Deterministic per-name values so profile/warning readouts stay stable across
// re-renders (no impure Math.random in the render path).
function nameSeed(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const MEMBER_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function memberSince(name: string): string {
  const s = nameSeed(name);
  return `${MEMBER_MONTHS[s % 12]} ${1997 + (s % 3)}`;
}

function warningLevel(name: string): number {
  return nameSeed(name) % 16;
}

const TEXT_COLORS = ['#000000', '#cc0000', '#0000cc', '#009900', '#cc6600', '#9900cc', '#cc0099'];

/** Render message text with emoticons applied and any URLs turned into links. */
function renderMessageContent(text: string, onOpenUrl: (url: string) => void): ReactNode {
  return text.split(MESSAGE_URL_RE).map((part, i) =>
    i % 2 === 1 ? (
      <span
        key={i}
        role="link"
        onClick={() => onOpenUrl(part)}
        className="text-[#0000cc] underline cursor-pointer"
      >
        {part}
      </span>
    ) : (
      <span key={i}>{renderEmoticons(part)}</span>
    ),
  );
}

export default function AIM({ windowId }: AppComponentProps) {
  void windowId;
  const { openWindow } = useWindows();
  const [groups, setGroups] = useState(INITIAL_GROUPS);
  const [chatWith, setChatWith] = useState<Buddy | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [myAwayMessage, setMyAwayMessage] = useState<string | null>(null);
  const [myMood, setMyMood] = useState(MOODS[3]); // 'chattin w/ my peeps'
  const [showAwayPicker, setShowAwayPicker] = useState(false);
  const [showProfile, setShowProfile] = useState<Buddy | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [buddyIsTyping, setBuddyIsTyping] = useState(false);
  const [doorSounds, setDoorSounds] = useState<string[]>([]);

  // Outgoing-message formatting state
  const [fmtBold, setFmtBold] = useState(false);
  const [fmtItalic, setFmtItalic] = useState(false);
  const [fmtUnderline, setFmtUnderline] = useState(false);
  const [fmtColor, setFmtColor] = useState('#000000');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const responseIndexRef = useRef<Record<string, number>>({});
  const groupsRef = useRef(groups);
  useEffect(() => { groupsRef.current = groups; }, [groups]);
  const chatWithRef = useRef(chatWith);
  useEffect(() => { chatWithRef.current = chatWith; }, [chatWith]);

  // Open a URL from a chat message in Internet Explorer.
  const openUrl = useCallback((url: string) => {
    openWindow('ie5', { launchParams: { url } });
  }, [openWindow]);

  // After you publish a page in FrontPage, a buddy notices it a minute later and
  // IMs you a link to it. Fires off the publish event so a page never has to be
  // open for the two apps to talk.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const onPublished = (e: Event) => {
      const url = (e as CustomEvent<{ url?: string }>).detail?.url;
      if (!url) return;
      timers.push(setTimeout(() => {
        const roster = groupsRef.current.flatMap((g) => g.buddies);
        const buddy = roster.find((b) => b.name === COMPLIMENT_BUDDY)
          ?? { name: COMPLIMENT_BUDDY, status: 'online' as BuddyStatus };
        const msg: ChatMessage = { from: COMPLIMENT_BUDDY, text: `lol nice page ${url}`, timestamp: getTimeString() };
        playSound('aimMessage');
        if (chatWithRef.current?.name === COMPLIMENT_BUDDY) {
          setChatMessages((prev) => [...prev, msg]);
        } else {
          setChatWith(buddy);
          setChatMessages([...(PRELOADED_CONVOS[COMPLIMENT_BUDDY] ?? []), msg]);
        }
      }, COMPLIMENT_DELAY_MS));
    };
    window.addEventListener('frontpage-published', onPublished);
    return () => {
      window.removeEventListener('frontpage-published', onPublished);
      timers.forEach(clearTimeout);
    };
  }, []);

  // A minute and a half after sign-on, a buddy IMs the hamster dance link. Same
  // delivery path as the publish compliment; guarded to fire only once a session.
  useEffect(() => {
    if (linkDropDelivered) return;
    const timer = setTimeout(() => {
      if (linkDropDelivered) return;
      linkDropDelivered = true;
      const roster = groupsRef.current.flatMap((g) => g.buddies);
      const buddy = roster.find((b) => b.name === LINK_DROP_BUDDY)
        ?? { name: LINK_DROP_BUDDY, status: 'online' as BuddyStatus };
      const msg: ChatMessage = { from: LINK_DROP_BUDDY, text: LINK_DROP_MESSAGE, timestamp: getTimeString() };
      playSound('aimMessage');
      if (chatWithRef.current?.name === LINK_DROP_BUDDY) {
        setChatMessages((prev) => [...prev, msg]);
      } else {
        setChatWith(buddy);
        setChatMessages([...(PRELOADED_CONVOS[LINK_DROP_BUDDY] ?? []), msg]);
      }
    }, LINK_DROP_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Park the running-man presence icon in the system tray while signed on.
  useEffect(() => {
    emit('tray-register', { id: 'aim', icon: '/icons/aim-16.svg', tooltip: `AIM - ${MY_SCREEN_NAME}` });
    return () => emit('tray-unregister', { id: 'aim' });
  }, []);

  // First desktop session: AIM opens itself ~45s after login (see firstRun.ts),
  // then fires AIM_WELCOME_EVENT so a buddy pops up with the door-open sound to
  // point you at the bundled games. Same delivery path as the publish compliment.
  useEffect(() => {
    const onWelcome = () => {
      const roster = groupsRef.current.flatMap((g) => g.buddies);
      const buddy = roster.find((b) => b.name === WELCOME_BUDDY)
        ?? { name: WELCOME_BUDDY, status: 'online' as BuddyStatus };
      const msg: ChatMessage = { from: WELCOME_BUDDY, text: WELCOME_IM_TEXT, timestamp: getTimeString() };
      playSound('aimDoorOpen');
      if (chatWithRef.current?.name === WELCOME_BUDDY) {
        setChatMessages((prev) => [...prev, msg]);
      } else {
        setChatWith(buddy);
        setChatMessages([...(PRELOADED_CONVOS[WELCOME_BUDDY] ?? []), msg]);
      }
    };
    window.addEventListener(AIM_WELCOME_EVENT, onWelcome);
    return () => window.removeEventListener(AIM_WELCOME_EVENT, onWelcome);
  }, []);

  // Randomly sign buddies on and off, playing the classic AIM door sounds.
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.55) return; // not every tick
      const flat = groupsRef.current.flatMap((g, gi) => g.buddies.map((b, bi) => ({ gi, bi, b })));
      if (!flat.length) return;
      const pick = flat[Math.floor(Math.random() * flat.length)];
      const signOn = pick.b.status === 'offline';
      const nextStatus: BuddyStatus = signOn ? 'online' : 'offline';
      playSound(signOn ? 'aimDoorOpen' : 'aimDoorClose');
      setDoorSounds((ds) => [...ds.slice(-4), `${pick.b.name} has ${signOn ? 'signed on' : 'signed off'}.`]);
      setGroups((prev) => prev.map((g, gi) => gi !== pick.gi ? g : {
        ...g,
        buddies: g.buddies.map((b, bi) => bi !== pick.bi ? b : { ...b, status: nextStatus }),
      }));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const insertSmiley = useCallback((emoticon: string) => {
    setChatInput((prev) => (prev ? `${prev} ${emoticon}` : emoticon));
    inputRef.current?.focus();
  }, []);

  const toggleGroup = useCallback((idx: number) => {
    setGroups(gs => gs.map((g, i) => i === idx ? { ...g, expanded: !g.expanded } : g));
  }, []);

  const openChat = useCallback((buddy: Buddy) => {
    if (buddy.status === 'offline') return;
    setChatWith(buddy);
    // Load pre-existing conversation if available
    const preloaded = PRELOADED_CONVOS[buddy.name];
    setChatMessages(preloaded ? [...preloaded] : []);
    setChatInput('');
    setBuddyIsTyping(false);
  }, []);

  const sendMessage = useCallback(() => {
    if (!chatInput.trim() || !chatWith) return;
    const userMsg = chatInput.trim();
    const style: MsgStyle = { bold: fmtBold, italic: fmtItalic, underline: fmtUnderline, color: fmtColor };
    setChatMessages(prev => [...prev, { from: MY_SCREEN_NAME, text: userMsg, timestamp: getTimeString(), style }]);
    setChatInput('');

    if (chatWith.status === 'away') {
      setTimeout(() => {
        playSound('aimMessage');
        setChatMessages(prev => [
          ...prev,
          { from: chatWith.name, text: `[Auto-Response] ${chatWith.awayMessage}`, timestamp: getTimeString() },
        ]);
      }, 500);
    } else {
      // Show typing indicator, then respond based on what the user actually said.
      const thinkDelay = 500 + Math.random() * 1000;
      const typeDelay = 1500 + Math.random() * 2000;

      setTimeout(() => setBuddyIsTyping(true), thinkDelay);
      setTimeout(() => {
        setBuddyIsTyping(false);
        const canned = BUDDY_RESPONSES[chatWith.name] || DEFAULT_RESPONSES;
        const idx = responseIndexRef.current[chatWith.name] || 0;
        const response = generateReply(userMsg, { buddyName: chatWith.name, canned, index: idx });
        responseIndexRef.current[chatWith.name] = idx + 1;
        playSound('aimMessage');
        setChatMessages(prev => [...prev, { from: chatWith.name, text: response, timestamp: getTimeString() }]);
      }, thinkDelay + typeDelay);
    }
  }, [chatInput, chatWith, fmtBold, fmtItalic, fmtUnderline, fmtColor]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, buddyIsTyping]);

  // === Setup / Preferences ===
  if (showSetup) {
    return <SetupPanel onClose={() => setShowSetup(false)} />;
  }

  // === Away message picker ===
  if (showAwayPicker) {
    return (
      <div className="flex-1 flex flex-col bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
        <div className="bg-[#ffcc00] text-center py-1 px-2">
          <div className="text-[13px] font-bold text-black">Set Away Message</div>
        </div>
        <div className="flex-1 overflow-auto mx-1 my-1 p-2 bg-white border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
          {myAwayMessage && (
            <div
              className="px-2 py-1 mb-2 cursor-pointer bg-[#ffe0e0] hover:bg-[#ffd0d0] border border-[#cc0000]"
              onClick={() => { setMyAwayMessage(null); setShowAwayPicker(false); }}
            >
              <span className="font-bold text-[#cc0000]">I&apos;m Back!</span>
              <div className="text-[10px] text-[#999]">Click to remove away message</div>
            </div>
          )}
          {AWAY_MESSAGES.map((msg, i) => (
            <div
              key={i}
              className={`px-2 py-1 mb-1 cursor-pointer hover:bg-[#e8e8ff] border border-transparent hover:border-[#0000cc] ${myAwayMessage === msg ? 'bg-[#e8e8ff] border-[#0000cc] !border' : ''}`}
              onClick={() => { setMyAwayMessage(msg); setShowAwayPicker(false); }}
            >
              <div className="text-[10px] italic">{msg}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-center py-1">
          <button
            onClick={() => setShowAwayPicker(false)}
            className="bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] px-3 py-[2px] text-[11px] cursor-pointer active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // === Buddy profile view ===
  if (showProfile) {
    return (
      <div className="flex-1 flex flex-col bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
        <div className="bg-[#ffcc00] text-center py-1 px-2">
          <div className="text-[13px] font-bold text-black">Buddy Info</div>
        </div>
        <div className="flex-1 mx-1 my-1 p-3 bg-white border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
          <div className="text-center mb-3">
            <div className="text-[16px] font-bold text-[#0000cc]">{showProfile.name}</div>
            <div className="flex items-center justify-center gap-1 mt-1">
              <StatusDot status={showProfile.status} />
              <span className="capitalize">{showProfile.status}</span>
            </div>
          </div>
          {showProfile.profile && (
            <div className="border border-[#ccc] bg-[#fffff0] p-2 mb-2">
              <div className="text-[10px] text-[#999] mb-1">Profile:</div>
              <div className="italic">{showProfile.profile}</div>
            </div>
          )}
          {showProfile.awayMessage && (
            <div className="border border-[#ccc] bg-[#fff0f0] p-2 mb-2">
              <div className="text-[10px] text-[#999] mb-1">Away Message:</div>
              <div className="italic">{showProfile.awayMessage}</div>
            </div>
          )}
          <div className="text-[10px] text-[#999] text-center mt-2">
            Member Since: {memberSince(showProfile.name)}
            <br />
            Warning Level: {warningLevel(showProfile.name)}%
          </div>
        </div>
        <div className="flex justify-center gap-1 py-1">
          <button
            onClick={() => { setShowProfile(null); openChat(showProfile); }}
            className="bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] px-3 py-[2px] text-[11px] cursor-pointer active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]"
          >
            Send IM
          </button>
          <button
            onClick={() => setShowProfile(null)}
            className="bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] px-3 py-[2px] text-[11px] cursor-pointer active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // === Chat window ===
  if (chatWith) {
    return (
      <div className="flex-1 flex flex-col bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
        {/* Chat header with buddy info */}
        <div className="flex items-center justify-between px-2 py-1 border-b border-[var(--win98-button-shadow)] bg-[var(--win98-button-face)]">
          <div className="flex items-center">
            <button
              onClick={() => setChatWith(null)}
              className="text-[11px] underline text-[#0000cc] cursor-pointer mr-2"
            >
              &larr; Back
            </button>
            <StatusDot status={chatWith.status} />
            <span className="font-bold">{chatWith.name}</span>
            {chatWith.status === 'away' && <span className="text-[#999] ml-1">(Away)</span>}
          </div>
          <button
            onClick={() => { setChatWith(null); setShowProfile(chatWith); }}
            className="text-[10px] underline text-[#0000cc] cursor-pointer"
          >
            Info
          </button>
        </div>

        {/* Warning level bar */}
        <div className="px-2 py-[2px] text-[9px] text-[#999] bg-[#f0f0f0] border-b border-[#ccc]">
          Warning Level: 0% &nbsp;|&nbsp; {chatWith.name}&apos;s Warning Level: {warningLevel(chatWith.name)}%
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-auto bg-white p-2 border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] mx-1 mt-1">
          {chatMessages.map((msg, i) => (
            <div key={i} className="mb-1">
              <span className={`font-bold ${msg.from === MY_SCREEN_NAME ? 'text-[#cc0000]' : 'text-[#0000cc]'}`}>
                {msg.from}
              </span>
              <span className="text-[9px] text-[#999] ml-1">({msg.timestamp})</span>
              <span className="text-[#cc0000] font-bold">:</span>{' '}
              <span
                style={{
                  fontWeight: msg.style?.bold ? 'bold' : undefined,
                  fontStyle: msg.style?.italic ? 'italic' : undefined,
                  textDecoration: msg.style?.underline ? 'underline' : undefined,
                  color: msg.style?.color && msg.style.color !== '#000000' ? msg.style.color : undefined,
                }}
              >
                {renderMessageContent(msg.text, openUrl)}
              </span>
            </div>
          ))}
          {buddyIsTyping && (
            <div className="text-[10px] text-[#999] italic animate-pulse">
              {chatWith.name} is typing...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat input area */}
        <div className="mx-1 mb-1">
          {/* Formatting toolbar */}
          <div className="flex items-center gap-[2px] px-1 py-[2px] bg-[#f0f0f0] border border-[#ccc]">
            <button
              onClick={() => setFmtBold((v) => !v)}
              className={`text-[10px] font-bold px-[3px] hover:bg-[#ddd] ${fmtBold ? 'bg-[#ccd] border border-[#0000cc]' : 'border border-transparent'}`}
              title="Bold"
            >B</button>
            <button
              onClick={() => setFmtItalic((v) => !v)}
              className={`text-[10px] italic px-[3px] hover:bg-[#ddd] ${fmtItalic ? 'bg-[#ccd] border border-[#0000cc]' : 'border border-transparent'}`}
              title="Italic"
            >I</button>
            <button
              onClick={() => setFmtUnderline((v) => !v)}
              className={`text-[10px] underline px-[3px] hover:bg-[#ddd] ${fmtUnderline ? 'bg-[#ccd] border border-[#0000cc]' : 'border border-transparent'}`}
              title="Underline"
            >U</button>
            <span className="text-[#ccc] mx-[2px]">|</span>
            <button
              onClick={() => setFmtColor((c) => TEXT_COLORS[(TEXT_COLORS.indexOf(c) + 1) % TEXT_COLORS.length])}
              className="text-[11px] font-bold px-[3px] hover:bg-[#ddd] border border-transparent"
              style={{ color: fmtColor }}
              title="Text Color (click to cycle)"
            >A</button>
            <span className="text-[#ccc] mx-[2px]">|</span>
            {[':-)', ':-D', ';-)', ':-P', '<3'].map((em) => (
              <button
                key={em}
                onClick={() => insertSmiley(em)}
                className="text-[11px] px-[2px] hover:bg-[#ddd] border border-transparent"
                title={`Insert ${em}`}
              >
                {renderEmoticons(em)}
              </button>
            ))}
          </div>
          <div className="flex gap-1 mt-1">
            <input
              ref={inputRef}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
              style={{
                fontWeight: fmtBold ? 'bold' : undefined,
                fontStyle: fmtItalic ? 'italic' : undefined,
                textDecoration: fmtUnderline ? 'underline' : undefined,
                color: fmtColor !== '#000000' ? fmtColor : undefined,
              }}
              className="flex-1 border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] px-1 py-[2px] text-[11px] outline-none"
              placeholder="Type a message..."
              autoFocus
            />
            <button
              onClick={sendMessage}
              className="bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] px-2 py-[1px] text-[11px] cursor-pointer active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]"
            >
              Send
            </button>
            <button
              onClick={() => {
                // Warn the buddy (classic AIM feature)
                setChatMessages(prev => [...prev, {
                  from: 'OnlineHost',
                  text: `${MY_SCREEN_NAME} has warned ${chatWith.name}. ${chatWith.name}'s warning level is now ${Math.floor(Math.random() * 25) + 5}%.`,
                  timestamp: getTimeString(),
                }]);
              }}
              className="bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] px-2 py-[1px] text-[11px] cursor-pointer active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]"
              title="Warn this user"
            >
              Warn
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === Buddy List (main view) ===
  return (
    <div className="flex-1 flex flex-col bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* AIM header with running man */}
      <div className="bg-gradient-to-b from-[#ffdd44] to-[#ffcc00] text-center py-1 px-2 border-b border-[#cc9900]">
        <div className="flex items-center justify-center gap-1">
          <span className="text-[16px]" title="AIM Running Man">&#x1F3C3;</span>
          <div className="text-[14px] font-bold text-black">
            My Buddy List
          </div>
        </div>
        <div className="text-[10px] text-[#333]">
          Screen Name: <span className="font-bold">{MY_SCREEN_NAME}</span>
        </div>
      </div>

      {/* Mood / Away status bar */}
      <div className="px-2 py-[3px] bg-[#f8f8e0] border-b border-[#ccc] text-[10px]">
        {myAwayMessage ? (
          <div className="flex items-center gap-1">
            <span className="text-[#cccc00]">&#9679;</span>
            <span className="italic text-[#666] truncate">Away: {myAwayMessage}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-[#00cc00]">&#9679;</span>
            <span className="text-[#666] truncate">Mood: {myMood}</span>
          </div>
        )}
      </div>

      {/* Buddy list */}
      <div className="flex-1 overflow-auto bg-white border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] mx-1 my-1">
        {groups.map((group, gi) => {
          const onlineCount = group.buddies.filter(b => b.status !== 'offline').length;
          return (
            <div key={group.name}>
              <div
                className="flex items-center px-2 py-[2px] bg-[#e8e8e8] border-b border-[#ccc] cursor-pointer select-none font-bold hover:bg-[#d0d0d0]"
                onClick={() => toggleGroup(gi)}
              >
                <span className="mr-1 text-[10px]">{group.expanded ? '▼' : '►'}</span>
                {group.name} ({onlineCount}/{group.buddies.length})
              </div>
              {group.expanded && group.buddies.map((buddy) => (
                <div
                  key={buddy.name}
                  className={`flex items-center px-3 py-[2px] cursor-pointer select-none group ${
                    buddy.status === 'offline' ? 'text-[#999]' : 'hover:bg-[#e8e8ff]'
                  }`}
                  onDoubleClick={() => openChat(buddy)}
                  onClick={() => buddy.status !== 'offline' && setShowProfile(buddy)}
                >
                  <StatusDot status={buddy.status} />
                  <span className={`flex-1 ${buddy.status === 'away' ? 'italic' : ''}`}>
                    {buddy.name}
                  </span>
                  {buddy.status === 'away' && (
                    <span className="text-[#999] text-[10px] ml-1 truncate max-w-[80px]">(Away)</span>
                  )}
                  {buddy.status === 'online' && PRELOADED_CONVOS[buddy.name] && (
                    <span className="text-[10px] text-[#cc0000] opacity-0 group-hover:opacity-100">IM</span>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Door open/close ticker */}
      {doorSounds.length > 0 && (
        <div className="px-2 py-[2px] text-[9px] text-[#999] bg-[#f0f0f0] border-t border-[#ccc] truncate">
          {doorSounds[doorSounds.length - 1]}
        </div>
      )}

      {/* Bottom buttons */}
      <div className="flex justify-center gap-1 px-1 py-1 border-t border-[#ccc]">
        <button
          onClick={() => setShowAwayPicker(true)}
          className="text-[10px] text-[#0000cc] underline cursor-pointer"
        >
          {myAwayMessage ? 'Im Back' : 'Away Message'}
        </button>
        <span className="text-[#999]">|</span>
        <button
          onClick={() => {
            const next = MOODS[(MOODS.indexOf(myMood) + 1) % MOODS.length];
            setMyMood(next);
          }}
          className="text-[10px] text-[#0000cc] underline cursor-pointer"
        >
          Set Mood
        </button>
        <span className="text-[#999]">|</span>
        <button onClick={() => setShowSetup(true)} className="text-[10px] text-[#0000cc] underline cursor-pointer">
          Setup
        </button>
      </div>
    </div>
  );
}
