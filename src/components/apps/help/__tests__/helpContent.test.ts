import { getApp } from '@/lib/appRegistry';
import {
  helpTopics,
  CATEGORY_ORDER,
  getTopic,
  getTopicsByCategory,
  parseInline,
  parseBlocks,
  parseRelatedTopics,
  searchTopics,
  buildIndex,
  filterIndex,
  tokenizeQuery,
} from '../helpContent';

describe('help content integrity', () => {
  it('ships at least 40 topics', () => {
    expect(helpTopics.length).toBeGreaterThanOrEqual(40);
  });

  it('gives every topic a unique id', () => {
    const ids = helpTopics.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every topic a title, a known category, keywords, and a body', () => {
    for (const topic of helpTopics) {
      expect(topic.title, topic.id).toBeTruthy();
      expect(CATEGORY_ORDER, topic.id).toContain(topic.category);
      expect(topic.keywords.length, topic.id).toBeGreaterThan(0);
      expect(topic.body.trim().length, topic.id).toBeGreaterThan(0);
    }
  });

  it('covers every category with at least one topic', () => {
    for (const category of CATEGORY_ORDER) {
      expect(getTopicsByCategory(category).length, category).toBeGreaterThan(0);
    }
  });

  it('only references related topics that exist (catches typos)', () => {
    for (const topic of helpTopics) {
      for (const relatedId of parseRelatedTopics(topic.body)) {
        expect(getTopic(relatedId), `${topic.id} -> related ${relatedId}`).toBeDefined();
      }
    }
  });

  it('only links topic: targets that exist', () => {
    const topicRefRe = /\]\(topic:([a-z0-9-]+)\)/g;
    for (const topic of helpTopics) {
      let match: RegExpExecArray | null;
      while ((match = topicRefRe.exec(topic.body)) !== null) {
        expect(getTopic(match[1]), `${topic.id} -> topic:${match[1]}`).toBeDefined();
      }
    }
  });

  it('only links app: targets that are real registered apps', () => {
    const appRefRe = /\]\(app:([a-z0-9-]+)\)/g;
    for (const topic of helpTopics) {
      let match: RegExpExecArray | null;
      while ((match = appRefRe.exec(topic.body)) !== null) {
        expect(getApp(match[1]), `${topic.id} -> app:${match[1]}`).toBeDefined();
      }
    }
  });
});

describe('parseInline', () => {
  it('returns a single text token for plain text', () => {
    expect(parseInline('just text')).toEqual([{ type: 'text', text: 'just text' }]);
  });

  it('parses **bold**', () => {
    expect(parseInline('a **b** c')).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'bold', text: 'b' },
      { type: 'text', text: ' c' },
    ]);
  });

  it('parses *italic* without mistaking ** for it', () => {
    expect(parseInline('*x*')).toEqual([{ type: 'italic', text: 'x' }]);
    expect(parseInline('**x**')).toEqual([{ type: 'bold', text: 'x' }]);
  });

  it('parses an app: shortcut link', () => {
    expect(parseInline('[Open Calculator](app:calculator)')).toEqual([
      { type: 'app', text: 'Open Calculator', target: 'calculator' },
    ]);
  });

  it('parses a topic: jump link', () => {
    expect(parseInline('see [Files](topic:files) here')).toEqual([
      { type: 'text', text: 'see ' },
      { type: 'topic', text: 'Files', target: 'files' },
      { type: 'text', text: ' here' },
    ]);
  });

  it('parses a mix of markup in one line', () => {
    const tokens = parseInline('Use **Save** or [open Notepad](app:notepad).');
    expect(tokens.map((t) => t.type)).toEqual(['text', 'bold', 'text', 'app', 'text']);
  });
});

describe('parseBlocks', () => {
  it('separates paragraphs, bullet lists, and numbered lists', () => {
    const blocks = parseBlocks('Intro line.\n\n- one\n- two\n\n1. first\n2. second');
    expect(blocks).toEqual([
      { type: 'paragraph', text: 'Intro line.' },
      { type: 'list', items: ['one', 'two'] },
      { type: 'ordered', items: ['first', 'second'] },
    ]);
  });

  it('recognizes a "> Related Topics:" block and lists its ids', () => {
    const blocks = parseBlocks('Body.\n\n> Related Topics:\n- files\n- desktop');
    expect(blocks[1]).toEqual({ type: 'related', topicIds: ['files', 'desktop'] });
    expect(parseRelatedTopics('Body.\n\n> Related Topics:\n- files\n- desktop')).toEqual(['files', 'desktop']);
  });
});

describe('searchTopics ranking', () => {
  it('returns nothing for an empty query', () => {
    expect(searchTopics('')).toEqual([]);
    expect(searchTopics('   ')).toEqual([]);
  });

  it('ranks a title/keyword match above a body-only mention', () => {
    const results = searchTopics('calculator');
    expect(results[0].id).toBe('calculator');
  });

  it('is case-insensitive', () => {
    expect(searchTopics('NOTEPAD')[0].id).toBe('notepad');
  });

  it('requires all words to match (AND) before falling back', () => {
    const results = searchTopics('shoot moon');
    expect(results.map((t) => t.id)).toContain('hearts');
    // "shoot" and "moon" only co-occur in the Hearts topic.
    expect(results).toHaveLength(1);
  });

  it('falls back to matching any word (OR) when no topic matches all', () => {
    // No single topic mentions both "wallpaper" and "gorilla".
    const results = searchTopics('wallpaper gorilla');
    const ids = results.map((t) => t.id);
    expect(ids).toContain('common-questions');
    expect(results.length).toBeGreaterThan(1);
  });

  it('tokenizes on whitespace and drops empties', () => {
    expect(tokenizeQuery('  Copying   Files ')).toEqual(['copying', 'files']);
  });
});

describe('index generation and filtering', () => {
  it('builds a non-empty, alphabetically sorted index of valid topics', () => {
    const index = buildIndex();
    expect(index.length).toBeGreaterThan(0);
    for (const entry of index) {
      expect(getTopic(entry.topicId), entry.label).toBeDefined();
    }
    const labels = index.map((e) => e.label.toLowerCase());
    const sorted = [...labels].sort((a, b) => a.localeCompare(b));
    expect(labels).toEqual(sorted);
  });

  it('includes authored entries pointing at the right topic', () => {
    const index = buildIndex();
    const copying = index.find((e) => e.label === 'copying files');
    expect(copying?.topicId).toBe('files');
  });

  it('filters entries by case-insensitive substring', () => {
    const index = buildIndex();
    const filtered = filterIndex(index, 'KEYBOARD');
    expect(filtered.length).toBeGreaterThan(0);
    for (const entry of filtered) {
      expect(entry.label.toLowerCase()).toContain('keyboard');
    }
  });

  it('returns the whole index for an empty filter', () => {
    const index = buildIndex();
    expect(filterIndex(index, '   ')).toHaveLength(index.length);
  });
});
