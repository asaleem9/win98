import { deriveContacts, splitFrom } from '../addressBook';
import { emptyMailbox, type Mailbox, type Email } from '../mailboxReducer';

const email = (from: string): Email => ({
  id: from,
  from,
  subject: 's',
  date: '3/16/99',
  unread: false,
  body: 'b',
});

describe('splitFrom', () => {
  it('separates a display name from the address', () => {
    expect(splitFrom('Mom <mom@aol.com>')).toEqual({ name: 'Mom', email: 'mom@aol.com' });
  });
  it('falls back to the raw string when there are no angle brackets', () => {
    expect(splitFrom('plain@aol.com')).toEqual({ name: 'plain@aol.com', email: 'plain@aol.com' });
  });
});

describe('deriveContacts', () => {
  const mailbox = (): Mailbox => ({
    ...emptyMailbox(),
    Inbox: [
      email('Prince Abubakar <prince@totallylegit.ng>'),
      email('Mail Delivery Subsystem <MAILER-DAEMON@mail.msn.com>'),
      email('SurfDude98 <surfdude98@hotmail.com>'),
    ],
  });

  it('imports AIM buddies as AOL addresses', () => {
    const contacts = deriveContacts(emptyMailbox(), ['sk8erboi99', 'Mom_1998']);
    expect(contacts).toContainEqual({ name: 'sk8erboi99', email: 'sk8erboi99@aol.com', source: 'aim' });
    expect(contacts).toContainEqual({ name: 'Mom_1998', email: 'mom_1998@aol.com', source: 'aim' });
  });

  it('adds mail senders and drops self and the mailer-daemon', () => {
    const contacts = deriveContacts(mailbox(), []);
    const emails = contacts.map((c) => c.email);
    expect(emails).toContain('prince@totallylegit.ng');
    expect(emails).not.toContain('surfdude98@hotmail.com');
    expect(emails.some((e) => /mailer-daemon/i.test(e))).toBe(false);
  });

  it('dedupes by address (AIM wins) and sorts by name', () => {
    const contacts = deriveContacts(mailbox(), ['sk8erboi99']);
    const keys = contacts.map((c) => c.email.toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
    const names = contacts.map((c) => c.name.toLowerCase());
    expect(names).toEqual([...names].sort());
  });
});
