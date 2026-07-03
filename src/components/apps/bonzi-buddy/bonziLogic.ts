export const FACTS: string[] = [
  "Hey! Want to hear a joke?",
  "Did you know I can search the web for you?",
  "Let me sing you a song sometime!",
  "Would you like me to read your email out loud?",
  "I can tell you the weather, probably!",
  "Want to see a magic trick? I'll disappear your free time.",
  "You look like you need a friend!",
  "I know over 10,000 jokes! I'll only tell you the bad ones.",
  "Let me help you surf the internet!",
  "Would you like to play a game?",
  "Purple is a very trustworthy color for software.",
  "I was going to be a parrot, but gorillas were on sale.",
  "Fun fact: I never asked to be installed either.",
  "Did you know gorillas can't actually talk? Weird, huh?",
  "I once tried to climb the taskbar. Long story.",
  "You should really close some of these toolbars I gave you.",
  "My favorite food is bandwidth.",
  "I have 12 different affiliate offers for you today!",
  "Studies show 9 out of 10 desktop gorillas agree: click more ads.",
  "I'm not just a mascot, I'm a lifestyle.",
  "Bananas are fine, but pop-ups are forever.",
  "Some say I was bundled with a screensaver. Rude.",
  "I've read the Terms of Service. All of them. Twice.",
  "Somewhere, a hard drive is being filled with my toolbars.",
  "I know your browser homepage. I changed it, actually.",
  "Friendship is temporary. Toolbars are forever.",
  "I'm technically a certified internet expert.",
  "Want a hint? The answer is always 'yes, install more'.",
  "I once won an award for Most Aggressively Helpful Mascot.",
  "Did you know I have a search bar? You should use it. A lot.",
];

export interface Joke {
  setup: string;
  punchline: string;
}

export const JOKES: Joke[] = [
  { setup: "Knock knock.", punchline: "Who's there? ...Just kidding, it's me, Bonzi! I did that whole bit myself." },
  { setup: "Knock knock. Who's there?", punchline: "Boo. Boo who? Aw, don't cry, it's just a gorilla joke." },
  { setup: "Knock knock. Who's there?", punchline: "Lettuce. Lettuce who? Lettuce in, it's cold in your Recycle Bin!" },
  { setup: "Knock knock.", punchline: "Interrupting toolbar! (I installed myself before you could say 'who's there'.)" },
  { setup: "Knock knock. Who's there?", punchline: "Ivana. Ivana who? Ivana tell you another joke, but you have to click Next!" },
  { setup: "Knock knock. Who's there?", punchline: "Annie. Annie who? Annie chance you'll install my search bar?" },
  { setup: "Knock knock. Who's there?", punchline: "Dishes. Dishes who? Dishes Bonzi, your favorite purple friend!" },
];

/** Cycles an index forward through a pool, wrapping at the end. Handles empty pools safely. */
export function nextCycleIndex(current: number, length: number): number {
  if (length <= 0) return 0;
  return (current + 1) % length;
}

/**
 * Builds Bonzi's remark about whatever other windows are open, picking one title
 * by index (caller supplies randomness) and skipping his own window.
 */
export function buildWindowComment(
  titles: string[],
  index: number = 0,
  selfTitle: string = 'BonziBUDDY',
): string | null {
  const others = titles.filter((t) => !!t && t !== selfTitle);
  if (others.length === 0) return null;
  const safeIndex = ((index % others.length) + others.length) % others.length;
  const title = others[safeIndex];
  return `Ooh, I see you have ${title} open!`;
}
