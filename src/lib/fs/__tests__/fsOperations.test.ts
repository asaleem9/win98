import { FSNode } from '@/types/filesystem';
import {
  normalizePath,
  joinPath,
  resolvePathIn,
  updateNodeAt,
  insertNode,
  removeNode,
  uniqueName,
} from '@/lib/fs/fsOperations';

function makeTree(): FSNode {
  return {
    name: 'C:',
    type: 'directory',
    created: '1998-01-01',
    modified: '1998-01-01',
    children: [
      {
        name: 'Docs',
        type: 'directory',
        created: '1998-01-01',
        modified: '1998-01-01',
        children: [
          { name: 'readme.txt', type: 'file', created: '1998-01-01', modified: '1998-01-01', size: 10, content: 'hello' },
          { name: 'Sub', type: 'directory', created: '1998-01-01', modified: '1998-01-01', children: [] },
        ],
      },
      { name: 'a.txt', type: 'file', created: '1998-01-01', modified: '1998-01-01', size: 1, content: 'a' },
    ],
  };
}

describe('normalizePath', () => {
  it('normalizes drive-only forms', () => {
    expect(normalizePath('C:')).toBe('C:\\');
    expect(normalizePath('c:\\')).toBe('C:\\');
    expect(normalizePath('')).toBe('C:\\');
  });

  it('converts forward slashes and strips trailing/duplicate backslashes', () => {
    expect(normalizePath('C:/Docs/Sub/')).toBe('C:\\Docs\\Sub');
    expect(normalizePath('C:\\\\Docs\\\\')).toBe('C:\\Docs');
  });

  it('uppercases the drive letter', () => {
    expect(normalizePath('c:\\Docs')).toBe('C:\\Docs');
  });
});

describe('joinPath', () => {
  it('joins against the root without doubling slashes', () => {
    expect(joinPath('C:\\', 'Docs')).toBe('C:\\Docs');
    expect(joinPath('C:\\Docs', 'Sub')).toBe('C:\\Docs\\Sub');
  });
});

describe('resolvePathIn', () => {
  it('resolves nested paths case-insensitively', () => {
    const tree = makeTree();
    expect(resolvePathIn(tree, 'C:\\docs\\README.TXT')?.content).toBe('hello');
  });

  it('returns the root for C:\\', () => {
    const tree = makeTree();
    expect(resolvePathIn(tree, 'C:\\')).toBe(tree);
  });

  it('returns null for missing paths', () => {
    expect(resolvePathIn(makeTree(), 'C:\\Nope')).toBeNull();
  });
});

describe('updateNodeAt', () => {
  it('replaces the target node immutably', () => {
    const tree = makeTree();
    const updated = updateNodeAt(tree, 'C:\\Docs\\readme.txt', (n) => ({ ...n, content: 'bye' }));
    expect(updated).not.toBeNull();
    expect(resolvePathIn(updated!, 'C:\\Docs\\readme.txt')?.content).toBe('bye');
    // original untouched
    expect(resolvePathIn(tree, 'C:\\Docs\\readme.txt')?.content).toBe('hello');
  });

  it('returns null when the path does not resolve', () => {
    expect(updateNodeAt(makeTree(), 'C:\\Missing\\x', (n) => n)).toBeNull();
  });

  it('can update the root itself', () => {
    const updated = updateNodeAt(makeTree(), 'C:\\', (n) => ({ ...n, modified: '1999-01-01' }));
    expect(updated?.modified).toBe('1999-01-01');
  });
});

describe('insertNode', () => {
  const newFile: FSNode = { name: 'new.txt', type: 'file', created: '1999-01-01', modified: '1999-01-01', size: 0, content: '' };

  it('inserts into a directory', () => {
    const updated = insertNode(makeTree(), 'C:\\Docs', newFile);
    expect(resolvePathIn(updated!, 'C:\\Docs\\new.txt')).toBeTruthy();
  });

  it('rejects name collisions case-insensitively', () => {
    const updated = insertNode(makeTree(), 'C:\\Docs', { ...newFile, name: 'README.TXT' });
    expect(updated).toBeNull();
  });

  it('rejects inserting into a file or missing dir', () => {
    expect(insertNode(makeTree(), 'C:\\a.txt', newFile)).toBeNull();
    expect(insertNode(makeTree(), 'C:\\Nope', newFile)).toBeNull();
  });
});

describe('removeNode', () => {
  it('removes a node and returns it', () => {
    const result = removeNode(makeTree(), 'C:\\Docs\\readme.txt');
    expect(result).not.toBeNull();
    expect(result!.removed.name).toBe('readme.txt');
    expect(resolvePathIn(result!.root, 'C:\\Docs\\readme.txt')).toBeNull();
    expect(resolvePathIn(result!.root, 'C:\\Docs')).toBeTruthy();
  });

  it('returns null for the root or missing paths', () => {
    expect(removeNode(makeTree(), 'C:\\')).toBeNull();
    expect(removeNode(makeTree(), 'C:\\Nope')).toBeNull();
  });
});

describe('uniqueName', () => {
  it('returns the base name when free', () => {
    const dir = resolvePathIn(makeTree(), 'C:\\Docs')!;
    expect(uniqueName(dir, 'fresh.txt')).toBe('fresh.txt');
  });

  it('appends (2) preserving the extension', () => {
    const dir = resolvePathIn(makeTree(), 'C:\\Docs')!;
    expect(uniqueName(dir, 'readme.txt')).toBe('readme (2).txt');
  });

  it('handles folders without extensions', () => {
    const dir = resolvePathIn(makeTree(), 'C:\\Docs')!;
    expect(uniqueName(dir, 'Sub')).toBe('Sub (2)');
  });
});
