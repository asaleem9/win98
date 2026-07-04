import {
  ARTICLES,
  ARTICLES_BY_ID,
  CATEGORIES,
  articlesInCategory,
  getArticle,
  type CategoryId,
} from '../articles';
import { ILLUSTRATIONS } from '../illustrations';

describe('article corpus', () => {
  it('carries a full multimedia encyclopedia (28+ articles)', () => {
    expect(ARTICLES.length).toBeGreaterThanOrEqual(28);
  });

  it('gives every article a unique id', () => {
    const ids = ARTICLES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every category with at least one article', () => {
    for (const cat of CATEGORIES) {
      expect(articlesInCategory(cat.id).length).toBeGreaterThan(0);
    }
  });

  it('only uses category ids that exist', () => {
    const known = new Set<CategoryId>(CATEGORIES.map((c) => c.id));
    for (const a of ARTICLES) expect(known.has(a.category)).toBe(true);
  });

  it('resolves every "see also" cross-link to a real article', () => {
    for (const a of ARTICLES) {
      for (const ref of a.seeAlso) {
        expect(ARTICLES_BY_ID[ref], `${a.id} → ${ref}`).toBeDefined();
      }
    }
  });

  it('never links an article to itself', () => {
    for (const a of ARTICLES) expect(a.seeAlso).not.toContain(a.id);
  });

  it('has real prose in every article', () => {
    for (const a of ARTICLES) {
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.summary.length).toBeGreaterThan(0);
      expect(a.body.length).toBeGreaterThan(0);
      for (const para of a.body) expect(para.trim().length).toBeGreaterThan(0);
    }
  });

  it('only names illustrations that are actually drawn', () => {
    for (const a of ARTICLES) {
      if (a.media) expect(ILLUSTRATIONS[a.media.illustration]).toBeDefined();
    }
  });

  it('builds sound quiz questions (3 distinct distractors, none the answer)', () => {
    for (const a of ARTICLES) {
      if (!a.quiz) continue;
      const { answer, distractors } = a.quiz;
      expect(distractors).toHaveLength(3);
      expect(distractors).not.toContain(answer);
      const all = [answer, ...distractors];
      expect(new Set(all).size).toBe(all.length);
    }
  });

  it('has enough quizzes to fill a trivia round', () => {
    expect(ARTICLES.filter((a) => a.quiz).length).toBeGreaterThanOrEqual(10);
  });

  it('looks articles up by id', () => {
    expect(getArticle('solar-system')?.title).toBe('The Solar System');
    expect(getArticle('does-not-exist')).toBeUndefined();
  });
});
