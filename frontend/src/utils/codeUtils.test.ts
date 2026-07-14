import { describe, it, expect } from 'vitest';
import {
  extractFirstJsBlock,
  extractJsBlocks,
  splitFileSections,
  extractFileName,
  declaredSymbols,
  filesReferencing,
  extractSearchReplaceBlocks,
  applySearchReplace,
  stripSearchReplaceBlocks,
} from './codeUtils';

describe('extractJsBlocks', () => {
  it('returns all fenced JS/TS blocks in order', () => {
    const md = 'text\n```js\nA\n```\nmore\n```typescript\nB\n```';
    expect(extractJsBlocks(md)).toEqual(['A', 'B']);
  });

  it('returns empty array when there are no code blocks', () => {
    expect(extractJsBlocks('just prose')).toEqual([]);
  });

  it('extractFirstJsBlock returns only the first', () => {
    const md = '```js\nfirst\n```\n```js\nsecond\n```';
    expect(extractFirstJsBlock(md)).toBe('first');
  });
});

describe('extractFileName', () => {
  it('parses a filename header and strips it', () => {
    const r = extractFileName('// filename: utils.js\nconst a = 1;');
    expect(r.fileName).toBe('utils.js');
    expect(r.isNew).toBe(false);
    expect(r.cleanCode).toBe('const a = 1;');
  });

  it('detects [NEW FILE]', () => {
    const r = extractFileName('// filename: particle.js [NEW FILE]\nclass P {}');
    expect(r.fileName).toBe('particle.js');
    expect(r.isNew).toBe(true);
  });

  it('returns null filename when no header', () => {
    const r = extractFileName('function setup() {}');
    expect(r.fileName).toBeNull();
    expect(r.cleanCode).toBe('function setup() {}');
  });
});

describe('splitFileSections', () => {
  it('single block with no header → one unnamed section', () => {
    expect(splitFileSections('function setup(){}')).toEqual([
      { name: null, isNew: false, code: 'function setup(){}' },
    ]);
  });

  it('single block with a header at the start', () => {
    const secs = splitFileSections('// filename: utils.js\nfunction helper() {}');
    expect(secs).toEqual([{ name: 'utils.js', isNew: false, code: 'function helper() {}' }]);
  });

  it('leading content + an embedded header → two sections', () => {
    const block = 'let s = [];\nfunction setup() {}\n// filename: star.js [NEW FILE]\nclass Star {}';
    const secs = splitFileSections(block);
    expect(secs).toHaveLength(2);
    expect(secs[0]).toEqual({ name: null, isNew: false, code: 'let s = [];\nfunction setup() {}' });
    expect(secs[1]).toEqual({ name: 'star.js', isNew: true, code: 'class Star {}' });
  });

  it('multiple headers in one block → one section each', () => {
    const block = '// filename: a.js [NEW FILE]\nconst A=1;\n// filename: b.js\nconst B=2;';
    const secs = splitFileSections(block);
    expect(secs.map((s) => s.name)).toEqual(['a.js', 'b.js']);
    expect(secs[0].isNew).toBe(true);
    expect(secs[1].isNew).toBe(false);
  });
});

describe('declaredSymbols / filesReferencing', () => {
  it('finds top-level function/class/const declarations', () => {
    const code = 'function foo() {}\nclass Bar {}\nconst BAZ = 1;\nlet qux;';
    expect(declaredSymbols(code).sort()).toEqual(['BAZ', 'Bar', 'foo', 'qux']);
  });

  it('flags files that reference the target file symbols', () => {
    const target = { name: 'particle.js', content: 'class Particle {}' };
    const others = [
      { name: 'sketch.js', content: 'let p = new Particle();' },
      { name: 'palette.js', content: 'function nodeColor() {}' },
    ];
    expect(filesReferencing(target, others)).toEqual(['sketch.js']);
  });

  it('returns empty when the file declares nothing used elsewhere', () => {
    const target = { name: 'unused.js', content: 'const LOCAL = 1;' };
    const others = [{ name: 'sketch.js', content: 'function setup() {}' }];
    expect(filesReferencing(target, others)).toEqual([]);
  });
});

describe('search/replace', () => {
  it('parses and applies a block', () => {
    const md = '<<<SEARCH\nold line\n===\nnew line\n>>>REPLACE';
    const blocks = extractSearchReplaceBlocks(md);
    expect(blocks).toEqual([{ search: 'old line', replace: 'new line' }]);
    expect(applySearchReplace('before\nold line\nafter', blocks!)).toBe('before\nnew line\nafter');
  });

  it('throws when the search text is not found', () => {
    expect(() => applySearchReplace('code', [{ search: 'missing', replace: 'x' }])).toThrow();
  });

  it('strips SR blocks from chat text', () => {
    expect(stripSearchReplaceBlocks('hi\n<<<SEARCH\na\n===\nb\n>>>REPLACE\nbye')).toBe('hi\n\nbye'.trimEnd());
  });
});
