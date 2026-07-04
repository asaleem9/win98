// Derives the Address Book from two sources: the AIM buddy list (screen names
// double as AOL addresses) and everyone who has appeared as a mail sender. Kept
// pure so the derivation is easy to unit test.

import type { Mailbox, FolderName } from './mailboxReducer';

export interface Contact {
  name: string;
  email: string;
  source: 'aim' | 'mail';
}

const SELF_EMAIL = 'surfdude98@hotmail.com';

/** Split a "Display Name <addr@host>" header into its parts. */
export function splitFrom(from: string): { name: string; email: string } {
  const m = from.match(/^(.*?)<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || m[2].trim(), email: m[2].trim() };
  const trimmed = from.trim();
  return { name: trimmed, email: trimmed };
}

const SENDER_FOLDERS: FolderName[] = ['Inbox', 'Sent Items', 'Deleted Items', 'Drafts', 'Outbox'];

/**
 * Build the contact list: every AIM buddy (as <name>@aol.com) plus every mail
 * sender, deduped by address (case-insensitive), self and MAILER-DAEMON
 * dropped, sorted by display name.
 */
export function deriveContacts(mailbox: Mailbox, buddyNames: string[]): Contact[] {
  const byEmail = new Map<string, Contact>();
  const add = (contact: Contact) => {
    const key = contact.email.toLowerCase();
    if (!key || key === SELF_EMAIL || /mailer-daemon/i.test(key)) return;
    if (!byEmail.has(key)) byEmail.set(key, contact);
  };

  for (const name of buddyNames) {
    add({ name, email: `${name.toLowerCase()}@aol.com`, source: 'aim' });
  }

  for (const folder of SENDER_FOLDERS) {
    for (const email of mailbox[folder]) {
      const { name, email: address } = splitFrom(email.from);
      if (address) add({ name, email: address, source: 'mail' });
    }
  }

  return [...byEmail.values()].sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
  );
}
