// First-desktop-session AIM theater. On a real always-on AOL install the buddy
// list signed itself on shortly after you logged in and a friend would ping you
// almost immediately. We recreate that: ~45s after the first login AIM opens
// signed-on, and once its window is up a buddy IMs about the bundled games.
//
// The scheduler lives outside the component because AIM isn't mounted at the
// desktop level — it opens the window itself, then dispatches AIM_WELCOME_EVENT,
// which AIM listens for (like the existing 'frontpage-published' event) to drop
// the IM in with the door-open sound.

/** Delay after the first login before AIM signs itself on. */
export const FIRST_RUN_AIM_SIGN_ON_MS = 45_000;

/** Beat between the window opening and the welcome IM landing — enough for the
 *  window to mount and register its listener, and to read as "just signed on". */
export const FIRST_RUN_AIM_IM_DELAY_MS = 2_000;

/** Bare window CustomEvent AIM listens for to inject the welcome IM. */
export const AIM_WELCOME_EVENT = 'aim-welcome-im';

type OpenWindow = (appId: string) => void;

/**
 * Sign AIM on ~45s after the first login and, once its window is up, have a
 * buddy send the welcome IM. Returns a cleanup that cancels any pending timers.
 */
export function scheduleFirstRunAim(openWindow: OpenWindow): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];
  timers.push(
    setTimeout(() => {
      openWindow('aim');
      timers.push(
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(AIM_WELCOME_EVENT));
          }
        }, FIRST_RUN_AIM_IM_DELAY_MS),
      );
    }, FIRST_RUN_AIM_SIGN_ON_MS),
  );
  return () => timers.forEach(clearTimeout);
}
