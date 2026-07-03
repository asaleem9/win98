import {
  mailboxReducer,
  emptyMailbox,
  unreadCount,
  makeSpam,
  makeBounce,
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
