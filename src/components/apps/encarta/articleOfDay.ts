// Picks the "Article of the Day" — the featured entry on the home screen.
// Seeded by the calendar date so it is stable for a whole day and identical for
// every reader, then rolls over at midnight. Pure and deterministic.

import type { Article } from './articles';

/** Days since the Unix epoch for a date's local calendar day. */
export function dayNumber(date: Date): number {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(local.getTime() / 86_400_000);
}

/**
 * The featured article for a given day. A prime step keeps consecutive days from
 * landing on adjacent entries, so the feature visibly moves around the corpus.
 */
export function articleOfDay(articles: Article[], date: Date = new Date()): Article {
  if (articles.length === 0) throw new Error('articleOfDay: empty corpus');
  const index = ((dayNumber(date) * 7919) % articles.length + articles.length) % articles.length;
  return articles[index];
}
