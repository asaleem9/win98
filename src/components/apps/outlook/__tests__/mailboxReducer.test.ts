import {
  mailboxReducer,
  emptyMailbox,
  unreadCount,
  makeSpam,
  makeBounce,
  makeVirusOutbreak,
  formatEml,
  emailToText,
  SELF_ADDRESS,
  type Mailbox,
  type Email,
} from '../mailboxReducer';

const email = (id: string, over: Partial<Email> = {}): Email => ({
  id,
  from: 'Someone <someone@example.com>',
  subject: 'Hi',
  date: '3/16/99',
  unread: true,
  body: 'hello',
  ...over,
});

describe('mailboxReducer', () => {
  it('RECEIVE puts a new email at the top of the Inbox', () => {
    const state = { ...emptyMailbox(), Inbox: [email('a')] };
    const next = mailboxReducer(state, { type: 'RECEIVE', email: email('b') });
    expect(next.Inbox.map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('SEND files the message under Sent Items', () => {
    const next = mailboxReducer(emptyMailbox(), { type: 'SEND', email: email('s', { unread: false }) });
    expect(next['Sent Items'].map((e) => e.id)).toEqual(['s']);
    expect(next.Inbox).toHaveLength(0);
  });

  it('MARK_READ clears the unread flag', () => {
    const state = { ...emptyMailbox(), Inbox: [email('a')] };
    const next = mailboxReducer(state, { type: 'MARK_READ', folder: 'Inbox', id: 'a' });
    expect(next.Inbox[0].unread).toBe(false);
  });

  it('DELETE from Inbox moves the message to Deleted Items', () => {
    const state = { ...emptyMailbox(), Inbox: [email('a'), email('b')] };
    const next = mailboxReducer(state, { type: 'DELETE', folder: 'Inbox', id: 'a' });
    expect(next.Inbox.map((e) => e.id)).toEqual(['b']);
    expect(next['Deleted Items'].map((e) => e.id)).toEqual(['a']);
    expect(next['Deleted Items'][0].unread).toBe(false);
  });

  it('DELETE from Deleted Items removes permanently', () => {
    const state = { ...emptyMailbox(), 'Deleted Items': [email('a', { unread: false })] };
    const next = mailboxReducer(state, { type: 'DELETE', folder: 'Deleted Items', id: 'a' });
    expect(next['Deleted Items']).toHaveLength(0);
  });

  it('DELETE of a missing id is a no-op', () => {
    const state = { ...emptyMailbox(), Inbox: [email('a')] };
    const next = mailboxReducer(state, { type: 'DELETE', folder: 'Inbox', id: 'zzz' });
    expect(next).toEqual(state);
  });

  it('LOAD replaces the whole mailbox', () => {
    const loaded: Mailbox = { ...emptyMailbox(), Inbox: [email('x')] };
    const next = mailboxReducer(emptyMailbox(), { type: 'LOAD', mailbox: loaded });
    expect(next).toEqual(loaded);
  });

  it('unreadCount counts only unread inbox messages', () => {
    const state = { ...emptyMailbox(), Inbox: [email('a'), email('b', { unread: false })] };
    expect(unreadCount(state)).toBe(1);
  });
});

describe('generated content', () => {
  it('makeSpam rotates through the pool and is unread', () => {
    const first = makeSpam(0, 'id1');
    const same = makeSpam(0, 'id2');
    expect(first.subject).toEqual(same.subject);
    expect(first.unread).toBe(true);
    // rotation wraps
    expect(makeSpam(0, 'a').subject).toEqual(makeSpam(7, 'b').subject);
  });

  it('makeBounce references the original subject and recipient', () => {
    const sent = email('s', { subject: 'lunch?', to: 'friend@aol.com', from: 'me' });
    const bounce = makeBounce(sent, 'bid');
    expect(bounce.subject).toContain('lunch?');
    expect(bounce.body).toContain('friend@aol.com');
    expect(bounce.from).toContain('MAILER-DAEMON');
    expect(bounce.unread).toBe(true);
  });
});

describe('attachments', () => {
  it('carry through SEND and RECEIVE untouched', () => {
    const withFile = email('a', { attachments: [{ name: 'resume.doc', path: 'C:\\resume.doc' }] });
    const sent = mailboxReducer(emptyMailbox(), { type: 'SEND', email: withFile });
    expect(sent['Sent Items'][0].attachments).toEqual([{ name: 'resume.doc', path: 'C:\\resume.doc' }]);
    const got = mailboxReducer(emptyMailbox(), { type: 'RECEIVE', email: withFile });
    expect(got.Inbox[0].attachments).toHaveLength(1);
  });
});

describe('QUARANTINE (ILOVEYOU flow)', () => {
  const infected = email('worm', {
    subject: 'ILOVEYOU',
    attachments: [{ name: 'LOVE-LETTER-FOR-YOU.TXT.vbs' }],
  });
  const outbreak: Email[] = [email('o1', { unread: false }), email('o2', { unread: false }), email('o3', { unread: false })];

  it('strips the attachment, bins the mail, and files the outbreak under Sent', () => {
    const state = { ...emptyMailbox(), Inbox: [infected, email('keep')] };
    const next = mailboxReducer(state, { type: 'QUARANTINE', folder: 'Inbox', id: 'worm', jokeEmails: outbreak });

    // Infected mail left the Inbox...
    expect(next.Inbox.map((e) => e.id)).toEqual(['keep']);
    // ...and landed in Deleted Items, disarmed.
    const binned = next['Deleted Items'][0];
    expect(binned.id).toBe('worm');
    expect(binned.attachments).toBeUndefined();
    expect(binned.quarantined).toBe(true);
    expect(binned.unread).toBe(false);
    // The three worm copies are now in Sent Items, newest first.
    expect(next['Sent Items'].map((e) => e.id)).toEqual(['o1', 'o2', 'o3']);
  });

  it('still files the outbreak when the infected id is already gone', () => {
    const next = mailboxReducer(emptyMailbox(), { type: 'QUARANTINE', folder: 'Inbox', id: 'missing', jokeEmails: outbreak });
    expect(next['Sent Items']).toHaveLength(3);
    expect(next['Deleted Items']).toHaveLength(0);
  });
});

describe('makeVirusOutbreak', () => {
  it('mails three copies from the user to the given recipients', () => {
    let n = 0;
    const mails = makeVirusOutbreak(['bob@aol.com', 'sue@aol.com'], () => `id-${++n}`);
    expect(mails).toHaveLength(3);
    for (const m of mails) {
      expect(m.from).toBe(SELF_ADDRESS);
      expect(m.subject).toBe('ILOVEYOU');
      expect(m.to).toContain('bob@aol.com');
      expect(m.unread).toBe(false);
    }
    expect(new Set(mails.map((m) => m.id)).size).toBe(3);
  });

  it('falls back to "everyone" when the address book is empty', () => {
    const mails = makeVirusOutbreak([], (() => { let i = 0; return () => `x${i++}`; })());
    expect(mails[0].to).toBe('everyone in your address book');
  });
});

describe('formatEml / emailToText', () => {
  it('formatEml writes the headers, body, and attachment names', () => {
    const e = email('e', { subject: 'hi', to: 'you@aol.com', attachments: [{ name: 'pic.jpg' }] });
    const eml = formatEml(e);
    expect(eml).toContain('From: Someone <someone@example.com>');
    expect(eml).toContain('Subject: hi');
    expect(eml).toContain('To: you@aol.com');
    expect(eml).toContain('pic.jpg');
    expect(eml).toContain('hello');
  });

  it('emailToText flattens headers and body for printing', () => {
    const text = emailToText(email('e', { subject: 'meeting', to: 'you@aol.com' }));
    expect(text).toContain('Subject: meeting');
    expect(text).toContain('hello');
  });
});
