import type { BotTrigger } from './mircEngine';

// Static content for the mIRC client: the fake network's MOTD, the four shipped
// channels with their bot rosters and personalities, and the #help bot's answer
// table. Nothing here references a real person or a real network.

export const SERVER_NAME = 'irc.dalnet98.net';
export const SERVER_PORT = 6667;
export const DEFAULT_NICK = 'SurfDude98';

/** The channels auto-joined the very first time, before any prefs are saved. */
export const DEFAULT_CHANNELS = ['#chat', '#help'];

// DALnet-style message of the day, printed line by line into the status window
// on connect. Original text.
export const MOTD_LINES: string[] = [
  `*** Connecting to ${SERVER_NAME} (${SERVER_PORT})`,
  `*** Looking up your hostname...`,
  `*** Checking Ident`,
  `*** Found your hostname (cached)`,
  `*** Welcome to the DALnet98 IRC Network`,
  `*** Your host is twisted.dal98.net, running version 2.9.4+dal98`,
  `*** This server was created Sat Mar 13 1999 at 03:14:15`,
  `-`,
  `- =======================================================`,
  `-   DDD    AA   L    N   N  EEEE  TTTTT  9999   888  `,
  `-   D  D  A  A  L    NN  N  E       T    9  9   8 8  `,
  `-   D  D  AAAA  L    N N N  EEE     T    9999   888  `,
  `-   D  D  A  A  L    N  NN  E       T       9   8 8  `,
  `-   DDD   A  A  LLLL N   N  EEEE    T    9999   888  `,
  `- =======================================================`,
  `-`,
  `-   Welcome to DALnet98 -- the friendliest 'net on the net!`,
  `-`,
  `-   [*] 4,208 users online across 917 channels`,
  `-   [*] No warez in main channels. No flooding. No clones.`,
  `-   [*] Register your nick:  /msg NickServ REGISTER <pass>`,
  `-   [*] Be excellent to each other. It is 1999, after all.`,
  `-`,
  `-   New here? Type  /list  to see channels, or just start`,
  `-   typing in #chat. /help is always around in #help.`,
  `-`,
  `- =======================================================`,
  `*** End of /MOTD command.`,
];

// A channel the bots pretend exists on the network for the /list output, even
// though only the four real channels below can be joined.
export interface ListedChannel {
  name: string;
  users: number;
  topic: string;
}

export const CHANNEL_LIST: ListedChannel[] = [
  { name: '#chat', users: 214, topic: 'general hangout -- no flooding pls =)' },
  { name: '#warez-chat', users: 88, topic: '.: NO LEECHING :. read rules or get kicked' },
  { name: '#y2k', users: 47, topic: '347 days until the end of the world. are you ready?' },
  { name: '#help', users: 31, topic: 'need mIRC help? just ask. the op is actually awake' },
  { name: '#teen', users: 302, topic: 'a/s/l ???' },
  { name: '#mp3', users: 511, topic: 'now playing: everything. requests -> /msg the bot' },
  { name: '#quake', users: 129, topic: 'frag or be fragged. server: 24.6.x.x:26000' },
  { name: '#geocities', users: 12, topic: 'show off your homepage <under construction>' },
];

// --- channels ---------------------------------------------------------------

export interface ChannelConfig {
  name: string;
  topic: string;
  /** Regular chatting bots present in the nick list. */
  bots: string[];
  /** Channel operators (shown with an @ prefix; used as kickers in #warez-chat). */
  ops: string[];
  /** Ambient one-liners a random bot drops on a timer. */
  ambient: string[];
  /** Fallback replies rotated through when nothing else matches. */
  canned: string[];
  /** Keyword-triggered replies, checked before the canned fallback. */
  triggers?: BotTrigger[];
  /** Nicks that drift in and out on the join/part ticker. */
  visitors: string[];
}

export const CHANNELS: Record<string, ChannelConfig> = {
  '#chat': {
    name: '#chat',
    topic: 'general hangout -- no flooding pls =) | tell us your a/s/l or dont, we cool',
    ops: ['ChanServ', 'moderator_mike'],
    bots: ['pixel_kitten', 'Rad_Rick', 'ChandlerFan99', 'mp3_hoarder', 'k3wl_grrl'],
    visitors: ['Sk8ter_Boi', 'DialUpDan', 'napster_ned', 'AngelEyes77', 'CordlessGuy', 'l33t_larry'],
    ambient: [
      'anyone else on 56k? this is so slow lol',
      'brb mom needs the phone',
      'ne1 kno where 2 get winamp skins?',
      'lol did u guys see south park last nite',
      'ugh my ICQ keeps disconnecting',
      'who wants my AIM sn',
      'this song is stuck in my head all day',
      '*~* bored *~* someone talk to me',
    ],
    canned: [
      'haha ya totally',
      'lol i kno rite',
      'thats so random',
      'omg no way',
      'hehe :) whats ur a/s/l',
      'brb phone',
      'anyone got any good sites?',
    ],
    triggers: [
      { pattern: /\b(hi+|hey+|hello+|yo+|sup|hola)\b/, replies: ['heyyy :)', 'sup', 'hi hi!! a/s/l?', 'yo whats good'] },
      { pattern: /\ba\s*\/?\s*s\s*\/?\s*l\b/, replies: ['15/f/cali u?', '16/m/nj how bout u', 'lol why u askin ;)'] },
      { pattern: /\b(napster|mp3|download|song|music)\b/, replies: ['napster is the best invention ever', 'i got 400 mp3s already lol', 'downloadin blink 182 rn takes 20 min tho'] },
      { pattern: /\b(bye+|cya|g2g|gtg|ttyl|later)\b/, replies: ['aww cya!! <3', 'l8r!', 'ttyl dont be a stranger'] },
      { pattern: /\?\s*$/, replies: ['hmm idk lol', 'good q, no idea', 'ask in #help maybe'] },
    ],
  },
  '#warez-chat': {
    name: '#warez-chat',
    topic: '.:x:. NO LEECHING .:x:. no asl no begging | ops WILL kick | read the rules noob',
    ops: ['opz', 'WaReZ_KiNg', 'd4rk_h4x0r'],
    bots: ['0day_owl', 'ThE_dUdE', 'ratio_cop', 'fXp_freddy'],
    visitors: ['n00b_ned', 'l33ch_lord', 'ScEnE_kId', 'iso_igor', 'tag_team_99'],
    ambient: [
      '.x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x.',
      'ratios or gtfo. this is not a charity',
      'anyone got the new demo scene release',
      'x-x-x- read the rules before u type -x-x-x',
      'lol another leech just got banned',
      'main is for chat. trades go to /msg',
      '.:: keep it on topic ::.',
    ],
    canned: [
      'lurk more.',
      'read the topic.',
      'this is a chat channel, not a warehouse.',
      'ops are watching.',
      'x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x-x',
    ],
  },
  '#y2k': {
    name: '#y2k',
    topic: '347 days until the end of the world | stockpile now | when the clocks roll over, we survive',
    ops: ['BunkerBob', 'ProphetOfDoom'],
    bots: ['CannedBeans4Life', 'Y2K_Survivor', 'genset_gary', 'tinfoil_tina'],
    visitors: ['PrepperPete', 'DoomsdayDoug', 'AxMurderer_no_jk', 'BottledH2O'],
    ambient: [
      'when the clock hits 00 every computer on earth stops. mark my words.',
      'i have 47 cans of beans. how many do YOU have?',
      'the banks will fail first. get your money in gold NOW',
      'planes will fall out of the sky at midnight. FACT.',
      'i printed the entire internet just in case',
      'my bunker is 40% complete. accepting donations.',
      'the microwave clock is the real threat nobody talks about',
    ],
    canned: [
      'youll see. when the lights go out youll wish youd listened.',
      'have you stockpiled water? WATER is life.',
      'the government isnt telling us everything.',
      'do you even have a generator??',
      'sheeple. wake up. 347 days.',
    ],
    triggers: [
      { pattern: /\b(fine|ok|nothing|overreact|calm|relax|nothing will happen|hoax|fake)\b/, replies: ['thats EXACTLY what they want you to think', 'enjoy the darkness then', 'ill remember you said that on jan 1st'] },
      { pattern: /\b(bean|beans|food|water|supplies|prep)\b/, replies: ['finally someone who GETS it', 'how many cans? be honest', 'water first. always water.'] },
      { pattern: /\b(bug|computer|fix|patch|update)\b/, replies: ['you cant patch the apocalypse', 'the fix IS the bug, wake up', 'my toaster is not y2k compliant and neither are you'] },
    ],
  },
  '#help': {
    name: '#help',
    topic: 'mIRC help desk | ask me about join, part, nick, me, msg, list or quit | the op is actually awake',
    ops: ['mIRC_Helper'],
    bots: ['helpful_hannah'],
    visitors: ['confused_carl', 'newbie_nancy'],
    ambient: [
      'reminder: /help lists the basic commands anytime',
      'if your text isnt sending, make sure you JOINED the channel first',
      'you can change your nick with /nick -- try it!',
    ],
    canned: [
      'Im the help bot -- ask me about a command like /join or /nick :)',
      'Try /help for the full command list, or just ask me here!',
      'Not sure what you mean -- want help with /join, /me, /msg, or /list?',
    ],
  },
};

// --- #help bot answer table -------------------------------------------------
// The op bot in #help scans what you type for a command or a "how do i" phrase
// and answers it. First match wins; falls through to a canned nudge.

export interface HelpAnswer {
  pattern: RegExp;
  answer: string;
}

export const HELP_ANSWERS: HelpAnswer[] = [
  { pattern: /\/join|how.*(join|enter).*chan|get in.*chan/, answer: 'To join a channel, type  /join #name  -- for example  /join #chat . A new tab opens for it.' },
  { pattern: /\/part|\/leave|how.*leave|get out.*chan/, answer: '/part leaves the channel you are on. Or  /part #chat  to leave a specific one.' },
  { pattern: /\/nick|change.*(name|nick)|rename/, answer: 'Change your nickname with  /nick yournewname . Everyone sees the change right away.' },
  { pattern: /\/me|action|emote|\/act/, answer: 'Use  /me does something  -- it shows up as  * yournick does something . Great for waving. :)' },
  { pattern: /\/msg|\/query|private|whisper|\bpm\b|dm/, answer: 'Send a private message with  /msg nick your message here . It opens a query window with that person.' },
  { pattern: /\/list|list.*chan|what chan|which chan/, answer: '/list shows every channel on the network with its user count and topic. It scrolls fast!' },
  { pattern: /\/quit|disconnect|log ?off|sign ?off|leave.*server/, answer: '/quit disconnects you from the server. You can leave a message:  /quit brb dinner .' },
  { pattern: /timestamp|time.*message|clock/, answer: 'Toggle the [hh:mm] timestamps from the View menu -> Timestamps.' },
  { pattern: /color|colour/, answer: 'Nicks are auto-colored so you can tell people apart at a glance. Same name, same color, always.' },
  { pattern: /dcc|send.*file|download|transfer/, answer: 'DCC sends files straight to another user -- but never accept a file from someone you dont trust!' },
  { pattern: /kick|kicked|banned|ban/, answer: 'Kicked? It happens in strict channels like #warez-chat. Just  /join  the channel again to come back.' },
  { pattern: /\bhi+\b|\bhey+\b|hello|thanks|thank/, answer: 'Happy to help! Ask me about a command -- /join, /nick, /me, /msg, /list, or /quit.' },
];

/**
 * The #help op bot's reply to a user line: the first matching answer, or a
 * rotating canned nudge when nothing matches. Kept here (data-adjacent, pure)
 * so it can be unit-tested without mounting the client.
 */
export function helpBotAnswer(userText: string, index: number): string {
  for (const h of HELP_ANSWERS) if (h.pattern.test(userText)) return h.answer;
  const fallback = CHANNELS['#help'].canned;
  return fallback[index % fallback.length];
}
