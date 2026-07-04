// Full-text search over the article corpus with simple field-weighted ranking.
// Pure and deterministic: given the same corpus and query it always returns the
// same ordered results, so it can be exercised directly in unit tests.

import type { Article } from './articles';

export interface SearchResult {
  article: Article;
  score: number;
  /** Where the strongest hit landed, for a small "matched in…" hint. */
  matchedIn: 'title' | 'summary' | 'keyword' | 'body';
}

// Field weights, highest first. A title hit should always outrank a body hit.
const W_TITLE_EXACT = 100;
const W_TITLE_STARTS = 60;
const W_TITLE_WORD = 40;
const W_TITLE_SUB = 25;
const W_KEYWORD = 18;
const W_SUMMARY = 10;
const W_BODY = 4;

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) break;
    count++;
    from = at + needle.length;
  }
  return count;
}

/** Score one article against a normalised query; 0 means no match. */
function scoreArticle(article: Article, query: string): { score: number; matchedIn: SearchResult['matchedIn'] } {
  const title = normalise(article.title);
  const summary = normalise(article.summary);
  const body = normalise(article.body.join(' '));
  const keywords = (article.keywords ?? []).map(normalise);
  const titleWords = new Set(title.split(' '));

  let score = 0;
  let matchedIn: SearchResult['matchedIn'] = 'body';
  let best = 0;

  const consider = (points: number, where: SearchResult['matchedIn']) => {
    score += points;
    if (points > best) {
      best = points;
      matchedIn = where;
    }
  };

  // Title matches — strongest signal.
  if (title === query) consider(W_TITLE_EXACT, 'title');
  else if (title.startsWith(query)) consider(W_TITLE_STARTS, 'title');
  else if (titleWords.has(query)) consider(W_TITLE_WORD, 'title');
  else if (title.includes(query)) consider(W_TITLE_SUB, 'title');

  // Keyword tags.
  if (keywords.some((k) => k === query || k.includes(query))) consider(W_KEYWORD, 'keyword');

  // Summary and body, weighted by how often the term appears.
  const sumHits = countOccurrences(summary, query);
  if (sumHits > 0) consider(W_SUMMARY * sumHits, 'summary');

  const bodyHits = countOccurrences(body, query);
  if (bodyHits > 0) consider(W_BODY * bodyHits, 'body');

  return { score, matchedIn };
}

/**
 * Rank articles for a query. Multi-word queries score each word and sum, so an
 * article matching every word ranks above one matching only some. Ties break
 * alphabetically by title, keeping the order stable and testable.
 */
export function searchArticles(articles: Article[], rawQuery: string): SearchResult[] {
  const query = normalise(rawQuery);
  if (!query) return [];
  const words = query.split(' ');

  const results: SearchResult[] = [];
  for (const article of articles) {
    let total = 0;
    let matchedIn: SearchResult['matchedIn'] = 'body';
    let best = 0;
    let matchedWords = 0;

    for (const word of words) {
      const { score, matchedIn: where } = scoreArticle(article, word);
      if (score > 0) {
        matchedWords++;
        total += score;
        if (score > best) {
          best = score;
          matchedIn = where;
        }
      }
    }

    // Require every word to match somewhere, so "roman egypt" doesn't surface an
    // article that only mentions Rome.
    if (matchedWords === words.length && total > 0) {
      results.push({ article, score: total, matchedIn });
    }
  }

  results.sort((a, b) => (b.score - a.score) || a.article.title.localeCompare(b.article.title));
  return results;
}
