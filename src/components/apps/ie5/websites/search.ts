import { getAllSites, SiteDef } from './registry';

export interface SearchResult {
  site: SiteDef;
  /** The URL a result link navigates to (the site's canonical address). */
  url: string;
  score: number;
}

// Field weights — a term in the title counts for far more than one buried in a
// description, so an exact title match always outranks a keyword-only hit.
const TITLE_WEIGHT = 10;
const KEYWORD_WEIGHT = 4;
const DESCRIPTION_WEIGHT = 1;
const PHRASE_TITLE_BONUS = 20;
const PHRASE_DESCRIPTION_BONUS = 5;
const EXACT_TITLE_BONUS = 100;

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);
}

function countMatches(tokens: string[], term: string): number {
  let n = 0;
  for (const t of tokens) if (t === term) n++;
  return n;
}

/**
 * Score every registered site against a query and return the matches ranked
 * high-to-low. Scoring is a simple weighted term frequency across title,
 * keywords, and description, with bonuses for the whole phrase appearing and a
 * large bonus when the query is exactly a site's title.
 */
export function searchSites(query: string): SearchResult[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];
  const phrase = query.trim().toLowerCase();

  const results: SearchResult[] = [];
  for (const site of getAllSites()) {
    const titleTokens = tokenize(site.title);
    const keywordTokens = site.keywords.flatMap(tokenize);
    const descriptionTokens = tokenize(site.description);

    let score = 0;
    for (const term of terms) {
      score += countMatches(titleTokens, term) * TITLE_WEIGHT;
      score += countMatches(keywordTokens, term) * KEYWORD_WEIGHT;
      score += countMatches(descriptionTokens, term) * DESCRIPTION_WEIGHT;
    }

    if (site.title.toLowerCase().includes(phrase)) score += PHRASE_TITLE_BONUS;
    if (site.description.toLowerCase().includes(phrase)) score += PHRASE_DESCRIPTION_BONUS;
    if (site.title.toLowerCase() === phrase) score += EXACT_TITLE_BONUS;

    if (score > 0) results.push({ site, url: site.urls[0], score });
  }

  results.sort((a, b) => b.score - a.score || a.site.title.localeCompare(b.site.title));
  return results;
}

/**
 * A deliberately absurd "N pages found" figure, seeded by the query so the same
 * search always brags the same number. Pure period flavor — unrelated to the
 * handful of real results.
 */
export function fakeHitCount(query: string): number {
  let h = 5381;
  for (let i = 0; i < query.length; i++) h = (h * 33 + query.charCodeAt(i)) >>> 0;
  // 1,000,000 .. ~9,900,000
  return 1_000_000 + (h % 8_900_000);
}
