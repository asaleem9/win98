import {
  globToRegExp,
  matchesName,
  withinSize,
  withinDateModified,
  searchFiles,
  sortResults,
  SearchHit,
} from '../findUtils';
import { FSNode } from '@/types/filesystem';

const file = (name: string, modified: string, size: number, content = ''): FSNode => ({
  name,
  type: 'file',
  created: modified,
  modified,
  size,
  content,
});

const tree: FSNode = {
  name: 'C:',
  type: 'directory',
  created: '1998-06-25',
  modified: '1999-03-14',
  children: [
    file('a.txt', '1999-01-10', 2048, 'hello world'),
    file('report99.doc', '1999-03-05', 10240, 'quarterly numbers'),
    {
      name: 'sub',
      type: 'directory',
      created: '1998-06-25',
      modified: '1999-02-01',
      children: [file('b.txt', '1999-02-20', 512, 'world peace now')],
    },
  ],
};

describe('globToRegExp', () => {
  it('treats * as any run and anchors the whole name', () => {
    const re = globToRegExp('*.txt');
    expect(re.test('notes.txt')).toBe(true);
    expect(re.test('notes.doc')).toBe(false);
    expect(re.test('a.txt.bak')).toBe(false);
  });

  it('treats ? as a single character and escapes literal dots', () => {
    expect(globToRegExp('a.?').test('a.c')).toBe(true);
    expect(globToRegExp('a.?').test('axc')).toBe(false);
  });

  it('matches prefixes with a trailing star', () => {
    const re = globToRegExp('report*');
    expect(re.test('report99.doc')).toBe(true);
    expect(re.test('final_report.doc')).toBe(false);
  });
});

describe('matchesName', () => {
  it('is a substring match when no wildcard is present', () => {
    expect(matchesName('README.TXT', 'read')).toBe(true);
    expect(matchesName('README.TXT', 'xyz')).toBe(false);
  });
  it('is a whole-name wildcard match when * or ? is present', () => {
    expect(matchesName('README.TXT', '*.txt')).toBe(true);
    expect(matchesName('README.TXT', 'read')).toBe(true);
    expect(matchesName('READMEXTXT', '*.txt')).toBe(false);
  });
  it('an empty pattern matches everything', () => {
    expect(matchesName('anything', '')).toBe(true);
    expect(matchesName('anything', undefined)).toBe(true);
  });
});

describe('withinSize', () => {
  it('applies inclusive KB bounds', () => {
    expect(withinSize(2048, 1)).toBe(true); // >= 1KB
    expect(withinSize(512, 1)).toBe(false);
    expect(withinSize(512, undefined, 1)).toBe(true); // <= 1KB
    expect(withinSize(2048, undefined, 1)).toBe(false);
    expect(withinSize(1024, 1, 1)).toBe(true);
  });
});

describe('withinDateModified', () => {
  it('passes everything when no bound is set', () => {
    expect(withinDateModified('1999-01-10')).toBe(true);
  });
  it('applies inclusive after/before day bounds', () => {
    expect(withinDateModified('1999-02-20', '1999-02-01', '1999-03-01')).toBe(true);
    expect(withinDateModified('1999-01-10', '1999-02-01')).toBe(false);
    expect(withinDateModified('1999-03-05', undefined, '1999-03-01')).toBe(false);
    expect(withinDateModified('1999-03-01', undefined, '1999-03-01')).toBe(true);
  });
  it('rejects unparseable dates when a bound is set', () => {
    expect(withinDateModified('not-a-date', '1999-01-01')).toBe(false);
  });
});

describe('searchFiles', () => {
  it('finds by wildcard name across nested folders', () => {
    const hits = searchFiles(tree, { name: '*.txt' }).map((h) => h.path);
    expect(hits).toEqual(['C:\\a.txt', 'C:\\sub\\b.txt']);
  });
  it('finds by contained text, excluding folders', () => {
    const hits = searchFiles(tree, { text: 'world' }).map((h) => h.node.name);
    expect(hits.sort()).toEqual(['a.txt', 'b.txt']);
  });
  it('applies a size floor to files only', () => {
    const hits = searchFiles(tree, { minKB: 1 }).map((h) => h.node.name);
    expect(hits.sort()).toEqual(['a.txt', 'report99.doc']);
  });
  it('combines name and date filters', () => {
    const hits = searchFiles(tree, { name: '*.txt', after: '1999-02-01' }).map((h) => h.node.name);
    expect(hits).toEqual(['b.txt']);
  });
});

describe('sortResults', () => {
  const hits: SearchHit[] = [
    { path: 'C:\\a.txt', node: file('a.txt', '1999-01-10', 2048) },
    { path: 'C:\\z.txt', node: file('z.txt', '1999-03-05', 512) },
    { path: 'C:\\m.txt', node: file('m.txt', '1999-02-20', 10240) },
  ];
  it('sorts by name ascending and descending', () => {
    expect(sortResults(hits, 'name', 'asc').map((h) => h.node.name)).toEqual(['a.txt', 'm.txt', 'z.txt']);
    expect(sortResults(hits, 'name', 'desc').map((h) => h.node.name)).toEqual(['z.txt', 'm.txt', 'a.txt']);
  });
  it('sorts by size', () => {
    expect(sortResults(hits, 'size', 'asc').map((h) => h.node.size)).toEqual([512, 2048, 10240]);
  });
  it('sorts by modified date', () => {
    expect(sortResults(hits, 'modified', 'asc').map((h) => h.node.name)).toEqual(['a.txt', 'm.txt', 'z.txt']);
  });
  it('does not mutate the input array', () => {
    const before = hits.map((h) => h.node.name);
    sortResults(hits, 'name', 'desc');
    expect(hits.map((h) => h.node.name)).toEqual(before);
  });
});
