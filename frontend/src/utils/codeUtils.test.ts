import { describe, it, expect } from 'vitest';
import {
  simpleHash,
  extractFirstJsBlock,
  extractJsBlocks,
  splitFileSections,
  extractFileName,
  declaredSymbols,
  filesReferencing,
  updateImportPath,
  extractSearchReplaceBlocks,
  applySearchReplace,
  stripSearchReplaceBlocks,
  diffSummary,
} from './codeUtils';

const block = (search: string, replace: string) =>
  `<<<SEARCH\n${search}\n===\n${replace}\n>>>REPLACE`;

describe('extractSearchReplaceBlocks', () => {
  it('extracts a single block', () => {
    const md = `Change the color:\n\n${block('background(30);', 'background(200, 80, 15);')}`;
    expect(extractSearchReplaceBlocks(md)).toEqual([
      { search: 'background(30);', replace: 'background(200, 80, 15);' },
    ]);
  });

  it('extracts multiple blocks in order', () => {
    const md = `${block('a', 'b')}\n\nAnd also:\n\n${block('c', 'd')}`;
    expect(extractSearchReplaceBlocks(md)).toEqual([
      { search: 'a', replace: 'b' },
      { search: 'c', replace: 'd' },
    ]);
  });

  it('handles multi-line search and replace sections', () => {
    const search = 'function draw() {\n  background(30);\n}';
    const replace = 'function draw() {\n  background(0);\n  circle(50, 50, 10);\n}';
    expect(extractSearchReplaceBlocks(block(search, replace))).toEqual([{ search, replace }]);
  });

  it('returns null when there are no blocks', () => {
    expect(extractSearchReplaceBlocks('just some prose')).toBeNull();
    expect(extractSearchReplaceBlocks('')).toBeNull();
  });

  it('ignores an incomplete (still-streaming) block', () => {
    expect(extractSearchReplaceBlocks('<<<SEARCH\nbackground(30);\n===\nbackgro')).toBeNull();
  });
});

describe('applySearchReplace', () => {
  const code = 'function setup() {\n  createCanvas(400, 400);\n}\n\nfunction draw() {\n  background(30);\n}';

  it('replaces an exact match', () => {
    const result = applySearchReplace(code, [
      { search: 'background(30);', replace: 'background(200);' },
    ]);
    expect(result).toContain('background(200);');
    expect(result).not.toContain('background(30);');
  });

  it('applies multiple blocks sequentially', () => {
    const result = applySearchReplace(code, [
      { search: 'createCanvas(400, 400);', replace: 'createCanvas(windowWidth, windowHeight);' },
      { search: 'background(30);', replace: 'background(240, 60, 8);' },
    ]);
    expect(result).toContain('createCanvas(windowWidth, windowHeight);');
    expect(result).toContain('background(240, 60, 8);');
  });

  it('replaces only the first occurrence of a repeated string', () => {
    const repeated = 'x = 1;\nx = 1;';
    expect(applySearchReplace(repeated, [{ search: 'x = 1;', replace: 'x = 2;' }])).toBe(
      'x = 2;\nx = 1;',
    );
  });

  it('a later block can match text produced by an earlier block', () => {
    const result = applySearchReplace('let a;', [
      { search: 'let a;', replace: 'let b;' },
      { search: 'let b;', replace: 'let c;' },
    ]);
    expect(result).toBe('let c;');
  });

  it('throws when the search text is not found', () => {
    expect(() =>
      applySearchReplace(code, [{ search: 'not in the code', replace: 'x' }]),
    ).toThrow('Search block not found');
  });

  it('preserves surrounding code exactly (whitespace included)', () => {
    const indented = '  if (x) {\n    doThing();\n  }';
    const result = applySearchReplace(indented, [
      { search: '    doThing();', replace: '    doOther();' },
    ]);
    expect(result).toBe('  if (x) {\n    doOther();\n  }');
  });
});

describe('stripSearchReplaceBlocks', () => {
  it('removes completed blocks but keeps the explanation text', () => {
    const md = `I'll darken the background.\n\n${block('background(200);', 'background(30);')}\n\nDone!`;
    expect(stripSearchReplaceBlocks(md)).toBe("I'll darken the background.\n\n\n\nDone!");
  });

  it('removes an in-progress block while streaming', () => {
    const md = 'Changing the color now:\n\n<<<SEARCH\nbackground(200);\n===\nbackgr';
    expect(stripSearchReplaceBlocks(md)).toBe('Changing the color now:');
  });

  it('leaves plain text untouched', () => {
    expect(stripSearchReplaceBlocks('No code here.')).toBe('No code here.');
  });
});

describe('extractFirstJsBlock', () => {
  it.each(['javascript', 'js', 'typescript', 'ts'])('extracts a ```%s block', (lang) => {
    expect(extractFirstJsBlock(`Intro\n\`\`\`${lang}\nlet x = 1;\n\`\`\`\nOutro`)).toBe('let x = 1;');
  });

  it('returns only the first block when there are several', () => {
    const md = '```js\nfirst();\n```\n\n```js\nsecond();\n```';
    expect(extractFirstJsBlock(md)).toBe('first();');
  });

  it('returns null for non-JS fences and plain text', () => {
    expect(extractFirstJsBlock('```python\nprint(1)\n```')).toBeNull();
    expect(extractFirstJsBlock('no code')).toBeNull();
  });
});

describe('diffSummary', () => {
  it('counts added and removed lines', () => {
    expect(diffSummary('a\nb', 'a\nc\nd')).toBe('+2 / -1 lines');
  });

  it('reports no visible changes for identical code', () => {
    expect(diffSummary('a\nb', 'a\nb')).toBe('No visible changes');
  });

  it('counts pure additions', () => {
    expect(diffSummary('a', 'a\nb')).toBe('+1 lines');
  });
});

describe('simpleHash', () => {
  it('is deterministic and differentiates inputs', () => {
    expect(simpleHash('hello')).toBe(simpleHash('hello'));
    expect(simpleHash('hello')).not.toBe(simpleHash('hellp'));
  });
});

// --- Multi-file support ---

describe('extractJsBlocks', () => {
  it('returns all fenced JS/TS blocks in order', () => {
    const md = 'text\n```js\nA\n```\nmore\n```typescript\nB\n```';
    expect(extractJsBlocks(md)).toEqual(['A', 'B']);
  });

  it('returns empty array when there are no code blocks', () => {
    expect(extractJsBlocks('just prose')).toEqual([]);
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
    const b = 'let s = [];\nfunction setup() {}\n// filename: star.js [NEW FILE]\nclass Star {}';
    const secs = splitFileSections(b);
    expect(secs).toHaveLength(2);
    expect(secs[0]).toEqual({ name: null, isNew: false, code: 'let s = [];\nfunction setup() {}' });
    expect(secs[1]).toEqual({ name: 'star.js', isNew: true, code: 'class Star {}' });
  });

  it('multiple headers in one block → one section each', () => {
    const b = '// filename: a.js [NEW FILE]\nconst A=1;\n// filename: b.js\nconst B=2;';
    const secs = splitFileSections(b);
    expect(secs.map((x) => x.name)).toEqual(['a.js', 'b.js']);
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

  it('ignores short symbol names to avoid false positives', () => {
    const target = { name: 'a.js', content: 'const x = 1;\nlet i = 0;' };
    const others = [{ name: 'sketch.js', content: 'for (let i = 0; i < x; i++) {}' }];
    expect(filesReferencing(target, others)).toEqual([]);
  });
});

describe('updateImportPath', () => {
  it('rewrites ./old.js imports to the new name', () => {
    const code = "import { X } from './particle.js';\nnew X();";
    expect(updateImportPath(code, 'particle.js', 'foo.js')).toContain("from './foo.js'");
  });

  it('rewrites bare and extensionless specifiers', () => {
    expect(updateImportPath("from 'particle.js'", 'particle.js', 'foo.js')).toContain("'./foo.js'");
    expect(updateImportPath("from './particle'", 'particle.ts', 'foo.ts')).toContain("'./foo.ts'");
  });

  it('rewrites dynamic imports', () => {
    const code = "const m = await import('./util.js');";
    expect(updateImportPath(code, 'util.js', 'helpers.js')).toContain("import('./helpers.js')");
  });

  it('leaves unrelated imports untouched', () => {
    const code = "import x from 'three';\nimport { Y } from './other.js';";
    expect(updateImportPath(code, 'particle.js', 'foo.js')).toBe(code);
  });
});
