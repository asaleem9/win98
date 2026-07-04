// Pure helpers for the PowerPoint clone: slide model, reordering for the Slide
// Sorter, and clipboard encode/decode for cut/copy/paste of whole slides. Kept
// free of React/DOM so the logic is trivial to unit test.

export interface Slide {
  title: string;
  bullets: string[];
  /** Optional slide background color (hex). Undefined renders as white. */
  bg?: string;
}

const CLIP_TAG = 'application/x-win98-ppt-slide';

/** Move a slide from one index to another, returning a new array. */
export function reorderSlides<T>(slides: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= slides.length) return slides.slice();
  const copy = slides.slice();
  const [item] = copy.splice(from, 1);
  const target = Math.max(0, Math.min(copy.length, to));
  copy.splice(target, 0, item);
  return copy;
}

/** Serialize a slide for the shared text clipboard. */
export function encodeSlideClipboard(slide: Slide): string {
  return JSON.stringify({ tag: CLIP_TAG, slide });
}

/** Parse a clipboard string back into a slide, or null when it isn't one. */
export function decodeSlideClipboard(text: string): Slide | null {
  try {
    const parsed = JSON.parse(text) as { tag?: string; slide?: Slide };
    if (parsed?.tag === CLIP_TAG && parsed.slide && Array.isArray(parsed.slide.bullets)) {
      return { title: parsed.slide.title ?? '', bullets: parsed.slide.bullets, bg: parsed.slide.bg };
    }
  } catch {
    // not JSON / not our shape
  }
  return null;
}
