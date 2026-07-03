// Cross-app entry point into Windows Help. Other programs (and, later, an F1
// handler) call openHelpTopic('minesweeper') to jump the user straight to a
// topic without needing a reference to the window manager.
//
// The helper dispatches a window event that a running Help window listens for.
// To open Help when it is not already running, open the app with the topic id
// as a launch parameter — Help reads launchParams.topicId on launch:
//
//   openWindow('help', { launchParams: { topicId } })
//
// Help is a singleton, so a second open focuses the existing window and hands it
// the fresh topic id via a bumped launchCount.

export const HELP_TOPIC_EVENT = 'win98:open-help-topic';

export interface HelpTopicEventDetail {
  topicId: string;
}

export function openHelpTopic(topicId: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<HelpTopicEventDetail>(HELP_TOPIC_EVENT, { detail: { topicId } }));
}
