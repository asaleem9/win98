// Pure mailbox model for Outlook Express. Kept side-effect free so it can be
// unit tested; the component owns timers, sounds and persistence.

export type FolderName = 'Inbox' | 'Outbox' | 'Sent Items' | 'Deleted Items' | 'Drafts';

export const FOLDER_ORDER: FolderName[] = ['Inbox', 'Outbox', 'Sent Items', 'Deleted Items', 'Drafts'];

/** The e-mail address the user sends mail from. Shared so generated mail (the
 * virus outbreak, the compose form) all agree on the sender. */
export const SELF_ADDRESS = 'SurfDude98 <surfdude98@hotmail.com>';

/** The filename of the era ILOVEYOU worm; opening it triggers the virus flow. */
export const LOVE_LETTER_ATTACHMENT = 'LOVE-LETTER-FOR-YOU.TXT.vbs';

export interface Attachment {
  name: string;
  /** Absolute VFS path when the attachment points at a real file. */
  path?: string;
  /** Inline text when the attachment is synthesized (era mail, no real file). */
  content?: string;
}

export interface Email {
  id: string;
  from: string;
  to?: string;
  subject: string;
  date: string;
  unread: boolean;
  body: string;
  attachments?: Attachment[];
  /** Set once the antivirus has stripped a malicious attachment. */
  quarantined?: boolean;
}

export type Mailbox = Record<FolderName, Email[]>;

export type MailAction =
  | { type: 'RECEIVE'; email: Email }
  | { type: 'SEND'; email: Email }
  | { type: 'MARK_READ'; folder: FolderName; id: string }
  | { type: 'DELETE'; folder: FolderName; id: string }
  // Strip the infected mail's attachment, bin it, and file the worm's outgoing
  // copies under Sent Items — the whole ILOVEYOU outbreak as one atomic step.
  | { type: 'QUARANTINE'; folder: FolderName; id: string; jokeEmails: Email[] }
  | { type: 'LOAD'; mailbox: Mailbox };

export function emptyMailbox(): Mailbox {
  return { Inbox: [], Outbox: [], 'Sent Items': [], 'Deleted Items': [], Drafts: [] };
}

export function mailboxReducer(state: Mailbox, action: MailAction): Mailbox {
  switch (action.type) {
    case 'RECEIVE':
      return { ...state, Inbox: [action.email, ...state.Inbox] };

    case 'SEND':
      return { ...state, 'Sent Items': [action.email, ...state['Sent Items']] };

    case 'MARK_READ':
      return {
        ...state,
        [action.folder]: state[action.folder].map((e) =>
          e.id === action.id ? { ...e, unread: false } : e,
        ),
      };

    case 'DELETE': {
      // From Deleted Items, delete permanently; otherwise move to Deleted Items.
      if (action.folder === 'Deleted Items') {
        return { ...state, 'Deleted Items': state['Deleted Items'].filter((e) => e.id !== action.id) };
      }
      const email = state[action.folder].find((e) => e.id === action.id);
      if (!email) return state;
      return {
        ...state,
        [action.folder]: state[action.folder].filter((e) => e.id !== action.id),
        'Deleted Items': [{ ...email, unread: false }, ...state['Deleted Items']],
      };
    }

    case 'QUARANTINE': {
      const source = state[action.folder].find((e) => e.id === action.id);
      const cleaned = source
        ? { ...source, attachments: undefined, quarantined: true, unread: false }
        : null;
      // Base state with the infected message pulled out of its folder; using it
      // as the base keeps things correct even if that folder is Sent/Deleted.
      const withoutInfected: Mailbox = {
        ...state,
        [action.folder]: state[action.folder].filter((e) => e.id !== action.id),
      };
      return {
        ...withoutInfected,
        'Deleted Items': cleaned
          ? [cleaned, ...withoutInfected['Deleted Items']]
          : withoutInfected['Deleted Items'],
        'Sent Items': [...action.jokeEmails, ...withoutInfected['Sent Items']],
      };
    }

    case 'LOAD':
      return action.mailbox;

    default:
      return state;
  }
}

export function unreadCount(mailbox: Mailbox): number {
  return mailbox.Inbox.filter((e) => e.unread).length;
}

// ---- Seed + generated content -------------------------------------------------

/**
 * The vendor's welcome message — the freshest thing in a new PC's Inbox. The
 * first-session "You've Got Mail" chime (see outlook/firstRun) announces it ~60s
 * after login; it's seeded here so it's present whenever Outlook is opened.
 */
export const WELCOME_MAIL: Email = {
  id: 'seed-welcome',
  from: 'PC Depot Sales <sales@pcdepot.com>',
  subject: 'Welcome to your new PC!',
  date: '3/16/99',
  unread: true,
  body: `Dear Valued Customer,

Congratulations on your brand-new Pentium II PC from PC Depot! You have made a smart investment in the future.

Your system comes fully loaded with Windows 98, a blazing-fast 56K modem, and everything you need to get on the Information Superhighway. A few tips to get you started:

  * Double-click the "Internet Explorer" icon to surf the World Wide Web
  * Sign on to America Online to chat with friends and family
  * Explore the games in Start > Programs > Games

Our support line is open 24 hours a day (long-distance charges may apply). Thank you again for choosing PC Depot, and happy computing!

Warm regards,
The PC Depot Sales Team

P.S. - Hungry for more software? Everything you could ever want is a free download away at www.downloads.com. Grab extra RAM, screen savers, smileys, and more!`,
};

export const SEED_INBOX: Email[] = [
  WELCOME_MAIL,
  {
    id: 'seed-1',
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
    id: 'seed-2',
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
    id: 'seed-3',
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
    id: 'seed-4',
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
    id: 'seed-5',
    from: 'chainletter@friend.net',
    subject: 'READ THIS OR SOMETHING BAD WILL HAPPEN TO YOU',
    date: '3/11/99',
    unread: false,
    body: `!!!WARNING!!!

This chain letter has been going around since 1987.
It has been verified by IBM and AOL.

A little girl in Arkansas didn't forward this email
and THREE DAYS LATER her computer crashed.

FORWARD THIS TO 15 PEOPLE IN THE NEXT HOUR
OR YOU WILL HAVE BAD LUCK FOR 7 YEARS.

THIS IS NOT A JOKE. IT REALLY WORKS.

~*~*~*~*~ Pass it on ~*~*~*~*~`,
  },
  {
    id: 'seed-goodluck',
    from: 'Jenny <jenny_luvs_horses@aol.com>',
    subject: 'FW: FW: FW: GOOD LUCK',
    date: '3/15/99',
    unread: true,
    body: `>>>> FW: FW: GOOD LUCK
>>>>
>>>> This is the GOOD LUCK Totem. Do NOT delete this email!!
>>>>
>>>>            _____
>>>>           /     \\
>>>>          | () () |    GOOD LUCK TOTEM
>>>>           \\  ^  /     (do not break the chain!)
>>>>            |||||
>>>>            |||||
>>>>
>>>> This totem has been sent to you for GOOD LUCK. It has been
>>>> around the world NINE times.
>>>>
>>>> Send this to 5 people = good news
>>>> Send this to 10 people = money comes your way
>>>> Send this to 15 people = the one you love calls you
>>>> DELETE this email = 7 years bad luck!!!
>>>>
>>>> A boy named Timmy deleted this and dropped his Gameboy in
>>>> the toilet the very next day. DON'T RISK IT!!!
>>>>
>>>> ~*~ Forward within the hour for it to work ~*~`,
  },
  {
    id: 'seed-loveletter',
    from: 'A Secret Admirer <admirer@aol.com>',
    subject: 'ILOVEYOU',
    date: '3/16/99',
    unread: true,
    body: `kindly check the attached LOVELETTER coming from me :-)`,
    attachments: [{ name: LOVE_LETTER_ATTACHMENT }],
  },
];

const SPAM_POOL: Omit<Email, 'id' | 'date' | 'unread'>[] = [
  { from: 'MAKE_MONEY_FAST@money.com', subject: 'Work From Home and Earn $5000/week!!!', body: 'I made $12,000 last month stuffing envelopes! You can too! Just send $19.95 for our starter kit...' },
  { from: 'hot_singles@match.net', subject: 'Someone in your area wants to chat! ;-)', body: 'Hi! I saw your profile online and I think ur cute! Click here to see my pics... 18/f/California' },
  { from: 'viagra_deals@pharma.ru', subject: 'V1AGRA - 80% OFF - No Prescription Needed', body: 'Discreet shipping. Order now and get 20 free pills! Satisfaction guaranteed or your money back!' },
  { from: 'lottery@ukwinners.co.uk', subject: 'You have WON the UK National Lottery!', body: 'Your email address was randomly selected to win £1,000,000! To claim, send your bank details...' },
  { from: 'bill.gates@microsoft.com', subject: 'Microsoft is giving away FREE MONEY', body: 'Forward this email to 10 friends and Microsoft will track it and send you $245 per person! It really works, AOL confirmed it!' },
  { from: 'yourbank@secure-verify.com', subject: 'Account Verification Required', body: 'We detected unusual activity. Please confirm your account number, PIN, and Social Security Number to avoid suspension.' },
  { from: 'freeipod@promotions.com', subject: 'Congratulations! You won a FREE iPod!', body: 'You are our 1,000,000th visitor! Claim your free iPod now by completing this short survey!' },
];

/** Build a rotating spam email for the Send/Receive button. */
export function makeSpam(seq: number, id: string): Email {
  const s = SPAM_POOL[seq % SPAM_POOL.length];
  return { ...s, id, date: '3/16/99', unread: true };
}

/** Build a bounce-back / auto-reply for a message the user just sent. */
export function makeBounce(sent: Email, id: string): Email {
  const to = sent.to || 'recipient';
  return {
    id,
    from: 'Mail Delivery Subsystem <MAILER-DAEMON@mail.msn.com>',
    subject: `Undeliverable: ${sent.subject || '(no subject)'}`,
    date: sent.date,
    unread: true,
    body: `Your message did not reach some or all of the intended recipients.

      Subject: ${sent.subject || '(no subject)'}
      Sent:    ${sent.date}

The following recipient(s) could not be reached:

      ${to}
      The e-mail account does not exist at the organization this
      message was sent to. Check the e-mail address, or contact the
      recipient directly to find out the correct address.

      < mail.msn.com #5.1.1 SMTP; 550 Requested action not taken >

----- Original Message -----
${sent.body}`,
  };
}

/**
 * The ILOVEYOU worm's payload: three copies it mails to "everyone in your
 * address book". Harmless here — just three joke messages filed under Sent.
 */
export function makeVirusOutbreak(recipients: string[], makeId: () => string): Email[] {
  const to = recipients.length ? recipients.slice(0, 12).join('; ') : 'everyone in your address book';
  return [1, 2, 3].map((n) => ({
    id: makeId(),
    from: SELF_ADDRESS,
    to,
    subject: 'ILOVEYOU',
    date: '3/16/99',
    unread: false,
    body: `kindly check the attached LOVELETTER coming from me :-)

(This message was sent automatically to your entire address book. You did not
send it. Congratulations, you have been hit by the Love Bug! Copy ${n} of 3.)`,
  }));
}

/** Render an email as a plain-text .eml file (era-simple headers + body). */
export function formatEml(email: Email): string {
  const lines = [
    `From: ${email.from}`,
    `To: ${email.to ?? ''}`,
    `Subject: ${email.subject}`,
    `Date: ${email.date}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="us-ascii"',
    '',
    email.body,
  ];
  if (email.attachments?.length) {
    lines.push('', '----- Attachments -----', ...email.attachments.map((a) => a.name));
  }
  return lines.join('\r\n');
}

/** Flatten an email to readable text for printing. */
export function emailToText(email: Email): string {
  const header = [
    `From:    ${email.from}`,
    email.to ? `To:      ${email.to}` : null,
    `Date:    ${email.date}`,
    `Subject: ${email.subject || '(no subject)'}`,
    email.attachments?.length ? `Attach:  ${email.attachments.map((a) => a.name).join(', ')}` : null,
  ].filter(Boolean).join('\n');
  return `${header}\n\n${email.body}`;
}
