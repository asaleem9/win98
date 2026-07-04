// Data for the ICQ cameo: your contact list, each buddy's canned personality
// replies, the status catalogue, and the scripted "random chat partner". Kept as
// plain data so the reply/status logic can be tested without the component.

export type ICQStatus =
  | 'online' // Available
  | 'ffc' // Free For Chat
  | 'away'
  | 'na' // N/A (extended away)
  | 'occupied'
  | 'dnd' // Do Not Disturb
  | 'invisible' // Privacy
  | 'offline';

export interface StatusMeta {
  label: string;
  /** Flower colour shown beside a contact / on the status button. */
  color: string;
  /** Short line describing the state, used in tooltips. */
  blurb: string;
}

export const STATUS_META: Record<ICQStatus, StatusMeta> = {
  online: { label: 'Available', color: '#2fb62f', blurb: 'Online and ready to chat' },
  ffc: { label: 'Free For Chat', color: '#12a0c0', blurb: 'Looking to chat with anyone!' },
  away: { label: 'Away', color: '#d4a017', blurb: 'Stepped away for a moment' },
  na: { label: 'N/A', color: '#c07000', blurb: 'Extended away' },
  occupied: { label: 'Occupied', color: '#c85018', blurb: 'Busy, may not reply' },
  dnd: { label: 'Do Not Disturb', color: '#d02020', blurb: 'Please do not disturb' },
  invisible: { label: 'Privacy (Invisible)', color: '#8a8a8a', blurb: "You appear offline to others" },
  offline: { label: 'Offline', color: '#b0b0b0', blurb: 'Not connected' },
};

/** The statuses offered on the flower menu, in ICQ's usual order. */
export const MY_STATUS_CHOICES: ICQStatus[] = ['online', 'ffc', 'away', 'na', 'occupied', 'dnd', 'invisible'];

export const MY_UIN = '99512345';

export interface Contact {
  uin: string;
  nick: string;
  status: ICQStatus;
  awayMessage?: string;
  /** Whether the contact carries a "web-aware" green presence flower. */
  webAware?: boolean;
  /** Canned lines the contact rotates through when you message them. */
  replies: string[];
}

export const INITIAL_CONTACTS: Contact[] = [
  {
    uin: '14022931',
    nick: 'CyberKitten98',
    status: 'online',
    webAware: true,
    replies: [
      'hehe hi!! :)',
      'omg icq is soooo much better than AIM dont u think',
      'brb my mom needs the phone lol',
      'a/s/l?? ;)',
      'have u seen the new south park?!?!',
      'ugh my 56k keeps dropping i h8 it',
    ],
  },
  {
    uin: '20481337',
    nick: 'Rico_Suave',
    status: 'ffc',
    webAware: true,
    replies: [
      'hey there ;-)',
      'you seem cool, we should chat more',
      'just grabbed the new Ricky Martin off napster',
      "livin la vida loca!!! lol",
      'so what are u up to tonight ;-)',
    ],
  },
  {
    uin: '10119025',
    nick: 'DialUpDiva',
    status: 'away',
    awayMessage: 'brother picked up the phone AGAIN... brb',
    replies: [
      'sup',
      'sorry my connection is total garbage today',
      'downloading a 4mb file... should be done by like thursday lol',
      'did u get kicked offline too?? ugh',
      'ttyl gotta free up the phone line',
    ],
  },
  {
    uin: '30528817',
    nick: 'MpThreeManiac',
    status: 'na',
    replies: [
      'duuude check out this band',
      'napster is the best thing ever invented no contest',
      'i have like 300 mp3s now, took 2 weeks to download lol',
      'winamp > literally everything',
      'it really whips the llamas ass haha',
    ],
  },
  {
    uin: '40917722',
    nick: 'l33t_hax0r',
    status: 'occupied',
    replies: [
      'sup n00b',
      'i totally pwned this game last nite',
      'u got mIRC?',
      'lol just read the FAQ',
      'g2g raid a server... jk jk ;)',
    ],
  },
];

/** Generic filler used if a contact somehow runs out of canned lines. */
export const GENERIC_REPLIES = ['lol', 'yeah totally', 'haha nice', 'idk lol', 'brb'];

// --- Random chat roulette ---------------------------------------------------

export const RANDOM_CHAT_PARTNER = 'SmoothTalker_2000';

export const RANDOM_CHAT_CONNECT_MSG = '*** You are now connected with a random chat partner ***';

/** SmoothTalker's opening line, delivered the moment you connect. */
export const SMOOTHTALKER_OPENER = 'well hello there... they call me SmoothTalker_2000 ;-)';

/** His follow-up lines, one delivered per message you send him. */
export const SMOOTHTALKER_LINES: string[] = [
  'so... do you come to this chat room often?',
  "i'm a Sagittarius, i love long walks and my Pentium II",
  "you must be tired, because you've been surfing through my mind all day",
  'wanna see a picture of me? its only 1.2 megs, should download in about 8 minutes',
  'i drive a Geo Metro but in my heart baby, its a Ferrari',
  'brb my dad needs the phone... dont go anywhere ;)',
  'are you an angel? because my dial-up connected on the FIRST try',
  'i once reached level 9 on Minesweeper... just sayin ;-)',
  'gtg my free AOL trial hours are almost up... c u in cyberspace',
];
