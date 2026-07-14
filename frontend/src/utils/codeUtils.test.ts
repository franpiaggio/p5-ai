import { describe, it, expect } from 'vitest';
import {
  simpleHash,
  extractFirstJsBlock,
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
