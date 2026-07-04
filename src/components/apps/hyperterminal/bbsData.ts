// Static content for HyperTerminal: the seeded phone-book connections, the two
// reachable BBSes (ANSI-style art, 1998-era message boards, sysop pages), the
// downloadable files that get written to disk, and the busy-signal gag number.
// Everything here is original text -- no real people, boards, or numbers.

export interface BbsMessagePost {
  num: number;
  from: string;
  date: string;
  subject: string;
  body: string;
}

export interface BbsContent {
  boardName: string;
  sysop: string;
  /** ANSI-style banner streamed in right after CONNECT. */
  welcome: string;
  /** The main menu art (single-key options). */
  mainMenu: string;
  messages: BbsMessagePost[];
  /** Sysop page text, shown on (O)perator. */
  operator: string;
  /** Sign-off text, shown right before NO CARRIER. */
  goodbye: string;
}

export interface BbsConnection {
  id: string;
  name: string;
  number: string;
  /** Emoji glyph used as the phone-book icon (self-contained, no asset needed). */
  icon: string;
  busy?: boolean;
  bbs?: BbsContent;
}

// A file the BBS lets you download; (D)ownload writes it into the real
// Downloads folder with this exact content.
export interface BbsFile {
  num: number;
  fileName: string;
  size: string;
  desc: string;
  content: string;
}

export const COMPUSERVE_NUMBER = '1-614-529-1340';
export const BUSY_NUMBERS = [COMPUSERVE_NUMBER];

const MIDNIGHT_TOWER: BbsContent = {
  boardName: 'THE MIDNIGHT TOWER',
  sysop: 'Nightwarden',
  welcome: `
   ╔══════════════════════════════════════════════════════╗
   ║  ▓▓▓  T H E   M I D N I G H T   T O W E R   B B S  ▓▓▓ ║
   ║                                                        ║
   ║        "where the night owls roost since 1994"         ║
   ║                                                        ║
   ║      Nodes: 2      Sysop: Nightwarden      2400-14.4   ║
   ╚══════════════════════════════════════════════════════╝

   Connected at 2400 baud. ANSI detected. Welcome back, caller.
   You are caller #14,092. Last on: never (first-timer, eh?).
`,
  mainMenu: `
   ┌────────────────── MAIN MENU ──────────────────┐
   │                                                │
   │   [M] Message Bases . . . read the boards      │
   │   [F] File Libraries  . . . grab some warez     │
   │   [G] Door Games  . . . . . GUESS THE NUMBER    │
   │   [O] Page the Operator . . (he never answers)  │
   │   [Q] Quit / Log Off  . . . NO CARRIER          │
   │                                                │
   └────────────────────────────────────────────────┘

   Command (M/F/G/O/Q)?`,
  messages: [
    {
      num: 1,
      from: 'Nightwarden',
      date: 'Dec 31 1998',
      subject: 'RULES - read before posting',
      body: `Welcome to the Tower. Keep it civil. No flooding the boards, no
uploading anything that'll get my line tapped, and NO asking the
sysop for his real name. This is a hobby, not a helpdesk.

The coffee's on. Enjoy your stay. - NW`,
    },
    {
      num: 2,
      from: 'ModemMolly',
      date: 'Jan 04 1999',
      subject: 'my parents got call waiting :(',
      body: `every time im in the middle of a good ANSI download it goes
*click* and NO CARRIER. i have lost the same 400k file six times.
one day i will finish downloading it. one day.`,
    },
    {
      num: 3,
      from: 'Baud_Rate_Bandit',
      date: 'Jan 09 1999',
      subject: 'RE: my parents got call waiting :(',
      body: `dial *70 before the number to turn off call waiting molly!!
youre welcome. now go finish that download. we believe in you.`,
    },
    {
      num: 4,
      from: 'Y2K_Watcher',
      date: 'Feb 18 1999',
      subject: 'is this board Y2K compliant??',
      body: `serious question. when the clock rolls over will the Tower still
be standing or will we all get logged off at midnight forever?
i need to know whether to print out the message boards.`,
    },
  ],
  operator: `
   *** PAGING SYSOP ... ***
   *** PAGING SYSOP ... ***
   *** PAGING SYSOP ... ***

   The sysop is asleep. It is 3 AM. The little light on the modem
   blinks, but nobody comes to the keyboard.

   Please leave a message after the... well, there's no tone. Just
   type into the void and hope for the best.

   [ Press any key to return to the main menu ]`,
  goodbye: `
   Thanks for calling THE MIDNIGHT TOWER.
   Hang up your modem gently. Dream in ANSI.

   Disconnecting...`,
};

const THE_VAULT: BbsContent = {
  boardName: 'THE VAULT',
  sysop: 'KeyMaster',
  welcome: `
   ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
   █                                                     █
   █     T H E   V A U L T   ][   est. MCMXCV            █
   █     ---------------------------------------         █
   █     a private collection for discerning callers     █
   █                                                     █
   █     Sysop: KeyMaster        Ratio enforced: 3:1     █
   ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀

   CARRIER DETECTED. Handshake complete. Access... GRANTED.
   Mind the ratio. The Vault remembers who leeches.
`,
  mainMenu: `
   ═══════════════════ THE VAULT :: MENU ═══════════════════

     (M)essage Board ...... gossip from the underground
     (F)ile Vault ......... the good stuff (mind your ratio)
     (G)ame Room .......... GUESS THE NUMBER -- high score wall
     (O)perator ........... page KeyMaster (good luck)
     (Q)uit ............... drop carrier

   ═════════════════════════════════════════════════════════

   Your choice?`,
  messages: [
    {
      num: 1,
      from: 'KeyMaster',
      date: 'Nov 12 1998',
      subject: 'RATIO IS NOT OPTIONAL',
      body: `Three downloads for every upload. I don't care if it's a
readme.txt. Upload something. The Vault is a community, not a
buffet. Leechers get their access revoked at midnight, no appeals.`,
    },
    {
      num: 2,
      from: 'Anon_Coward',
      date: 'Jan 22 1999',
      subject: 'best ASCII art trade thread',
      body: `post your best hand-drawn ANSI. i'll start: it's a skull. it took
me four hours in TheDraw and my dad thinks i was doing homework.
worth it. rate mine 1-10.`,
    },
    {
      num: 3,
      from: 'Sassy_Sysop_Fan',
      date: 'Feb 02 1999',
      subject: 'does keymaster ever sleep',
      body: `i have called this board at 4am, at noon, on christmas. the man
is ALWAYS logged in as invisible. i respect it. i fear it.
KeyMaster if you're reading this (you are): go outside.`,
    },
  ],
  operator: `
   *** CHAT REQUEST SENT TO SYSOP ***

   . . . waiting . . .
   . . . waiting . . .

   KeyMaster is asleep. It is 3 AM. The chat request scrolls off
   the top of his screen unread, one more ghost in the machine.

   Maybe next time, caller.

   [ Press any key to return to the main menu ]`,
  goodbye: `
   The Vault seals behind you with a satisfying CLUNK.
   Come back with an upload next time.

   Dropping carrier...`,
};

export const CONNECTIONS: BbsConnection[] = [
  { id: 'midnight-tower', name: 'Midnight Tower BBS', number: '1-503-555-0142', icon: '🗼', bbs: MIDNIGHT_TOWER },
  { id: 'the-vault', name: 'The Vault BBS', number: '1-206-555-0197', icon: '🔒', bbs: THE_VAULT },
  { id: 'compuserve', name: 'CompuServe (long distance!)', number: COMPUSERVE_NUMBER, icon: '📡', busy: true },
];

// Glyphs offered by the "New Connection" icon picker (self-contained emoji).
export const CONNECTION_ICONS = ['☎️', '🌐', '💻', '🖥️', '📡', '🗼', '🔒', '👾'];

// --- downloadable files -----------------------------------------------------
// (D)ownload writes the selected file into C:\My Documents\Downloads verbatim.

const PHRACK_LITE = `============================================================
        P H R A C K - L I T E   #7   -   Winter 1999
        "all the phun, half the felonies"
============================================================

  CONTENTS
  --------
  0x01  Introduction ................ the Editors
  0x02  A Kid's Guide to Good Manners on the BBS
  0x03  The Sacred Art of the *70 Prefix
  0x04  Interview: My Modem, In Its Own Words
  0x05  Letters to the Editor (we got one!)

------------------------------------------------------------
0x01  INTRODUCTION
------------------------------------------------------------
Welcome to another issue nobody asked for. We publish this
zine at 2400 baud, one line at a time, because we can. If
you are reading this you either downloaded it on purpose or
your ratio was getting dangerously good. Either way: hi.

------------------------------------------------------------
0x02  A KID'S GUIDE TO GOOD MANNERS ON THE BBS
------------------------------------------------------------
- Say hi to the sysop. He is a person. Probably.
- Do NOT hang up mid-upload. There is a special place for
  people who hang up mid-upload.
- If you don't know what a command does, it probably logs
  you off. Ask first.
- Thank the board on your way out. It costs nothing and the
  sysop notices. He notices everything.

------------------------------------------------------------
0x03  THE SACRED ART OF THE *70 PREFIX
------------------------------------------------------------
Dial *70 before the number and call waiting cannot betray
you mid-download. This one weird trick has saved more 400k
ANSI packs than any antivirus ever will. Print it. Tape it
to the modem. Teach it to your children.

------------------------------------------------------------
0x04  INTERVIEW: MY MODEM, IN ITS OWN WORDS
------------------------------------------------------------
Q: What is it like being a 2400 baud modem in a 56k world?
A: SCREEEEEEE-KSHHHHHH-ping-ping-BONG.
Q: Beautiful. Any regrets?
A: KSHHHHHHHHHHH.
We'll take that as a no.

------------------------------------------------------------
0x05  LETTERS TO THE EDITOR
------------------------------------------------------------
"why is your zine a .txt file" - a reader
Because, dear reader, the .txt file is eternal. It opens on
every machine, needs no plug-in, and will still be readable
long after we are all logged off for good. Respect the .txt.

============================================================
  EOF - see you at the party line. keep it phun. -30-
============================================================
`;

const BUNKER98_TIPS = `BUNKER98 -- 100 TIPS FOR SURVIVING THE MILLENNIUM BUG
(you only get the first 12, the rest are on the board)
=====================================================

 1. WATER. Store more than you think. Then store more.
 2. Beans. The humble can of beans keeps for years and
    asks nothing of you but a can opener.
 3. Buy TWO can openers. A bunker with no can opener is
    just a room full of sad metal cylinders.
 4. Print your important files. Paper does not crash.
 5. Keep a battery radio. And batteries. And more batteries.
 6. Cash. When the ATMs blink 00:00 you want paper money.
 7. Learn your neighbors' names NOW, before the grid does
    the introductions for you.
 8. A deck of cards outlasts any Game Boy on this list.
 9. Candles are romantic AND practical. Stock up guilt-free.
10. Do NOT set your microwave clock as your master clock.
    The microwave has opinions about the year 2000.
11. Keep a paper phone book. Yes, they still make those.
12. Stay calm. Panic uses more oxygen than beans. Probably.

    -- compiled in the bunker, by candlelight, just in case.
       remember: prepared, not scared. (ok, a little scared.)
`;

export const BBS_FILES: BbsFile[] = [
  { num: 1, fileName: 'PHRACK-LITE-7.TXT', size: '4.2K', desc: 'the phun zine, winter 1999 issue', content: PHRACK_LITE },
  { num: 2, fileName: 'midnight_tower_theme.mp3', size: '3.1M', desc: 'the board theme song (sysop composed it)', content: 'track:midnight-midi' },
  { num: 3, fileName: 'bunker98_tips.txt', size: '1.8K', desc: 'Y2K survival tips (first 12 of 100)', content: BUNKER98_TIPS },
];
