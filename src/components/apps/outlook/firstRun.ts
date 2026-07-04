import { playSound } from '@/lib/sounds';

// First-desktop-session mail chime. ~60s after the first login the classic
// "You've Got Mail" plays — the PC vendor's welcome message (WELCOME_MAIL in
// mailboxReducer) is already sitting unread in the Inbox, so opening Outlook
// Express any time after shows it waiting.

/** Delay after the first login before the mail chime plays. */
export const FIRST_RUN_MAIL_MS = 60_000;

/**
 * Play the "You've Got Mail" chime once, ~60s into the first session. Returns a
 * cleanup that cancels the timer if the session ends first.
 */
export function scheduleFirstRunMail(): () => void {
  const timer = setTimeout(() => playSound('youveGotMail'), FIRST_RUN_MAIL_MS);
  return () => clearTimeout(timer);
}
