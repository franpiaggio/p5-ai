import { describe, it, expect } from 'vitest';
import type { SketchFile } from '../types';
import {
  planFileChanges,
  applyChangesToFiles,
  focusAfterChanges,
  presentationFor,
} from './fileEdits';

function file(name: string, content: string): SketchFile {
  return { id: name, name, content, language: name.endsWith('.ts') ? 'typescript' : 'javascript' };
}

const baseFiles = [file('sketch.js', 'function setup() {}')];

/** Most cases below describe multi-file planning; single-file coalescing has
 * its own block at the end. */
const multi = { allowMultiFile: true };

describe('planFileChanges', () => {
  it('no code → no changes', () => {
    expect(planFileChanges(baseFiles, 'sketch.js', 'just a question?')).toEqual([]);
  });

  it('single block, no header → change to sketch.js', () => {
    const changes = planFileChanges(baseFiles, 'sketch.js', '```js\nfunction setup() { createCanvas(400,400); }\n```');
    expect(changes).toHaveLength(1);
    expect(changes[0].name).toBe('sketch.js');
    expect(changes[0].isNew).toBe(false);
    expect(changes[0].newContent).toContain('createCanvas');
  });

  it('filters out a no-op edit (same content)', () => {
    const changes = planFileChanges(baseFiles, 'sketch.js', '```js\nfunction setup() {}\n```');
    expect(changes).toEqual([]);
  });

  it('new file via [NEW FILE] header', () => {
    const changes = planFileChanges(baseFiles, 'sketch.js', '```js\n// filename: utils.js [NEW FILE]\nfunction helper() {}\n```', multi);
    expect(changes).toEqual([
      { name: 'utils.js', previousContent: '', newContent: 'function helper() {}', isNew: true },
    ]);
  });

  it('two separate fenced blocks → two changes', () => {
    const md = '```js\n// filename: particle.js [NEW FILE]\nclass Particle {}\n```\n```js\n// filename: sketch.js\nfunction setup() { new Particle(); }\n```';
    const changes = planFileChanges(baseFiles, 'sketch.js', md, multi);
    expect(changes.map((c) => c.name)).toEqual(['particle.js', 'sketch.js']);
    expect(changes.find((c) => c.name === 'particle.js')!.isNew).toBe(true);
  });

  it('several files inside one fenced block', () => {
    const md = '```js\n// filename: a.js [NEW FILE]\nconst A=1;\n// filename: b.js [NEW FILE]\nconst B=2;\n```';
    const changes = planFileChanges(baseFiles, 'sketch.js', md, multi);
    expect(changes.map((c) => c.name)).toEqual(['a.js', 'b.js']);
  });

  it('rejects an invalid new filename', () => {
    const changes = planFileChanges(baseFiles, 'sketch.js', '```js\n// filename: evil.exe [NEW FILE]\nx\n```');
    expect(changes).toEqual([]);
  });

  it('search/replace without filename targets the active file', () => {
    const files = [file('sketch.js', 'before\nold\nafter')];
    const changes = planFileChanges(files, 'sketch.js', '<<<SEARCH\nold\n===\nnew\n>>>REPLACE');
    expect(changes).toEqual([
      { name: 'sketch.js', previousContent: 'before\nold\nafter', newContent: 'before\nnew\nafter', isNew: false },
    ]);
  });

  it('search/replace with a // filename: prefix targets that file, not the active one', () => {
    const files = [file('sketch.js', 'setup'), file('particle.js', 'let speed = 1;')];
    const md = '// filename: particle.js\n<<<SEARCH\nlet speed = 1;\n===\nlet speed = 4;\n>>>REPLACE';
    const changes = planFileChanges(files, 'sketch.js', md);
    expect(changes).toEqual([
      { name: 'particle.js', previousContent: 'let speed = 1;', newContent: 'let speed = 4;', isNew: false },
    ]);
  });

  it('unnamed search/replace resolves by content when the active file does not match', () => {
    const files = [file('sketch.js', 'setup'), file('palette.js', 'const hue = 200;')];
    const md = '<<<SEARCH\nconst hue = 200;\n===\nconst hue = 20;\n>>>REPLACE';
    const changes = planFileChanges(files, 'sketch.js', md);
    expect(changes).toEqual([
      { name: 'palette.js', previousContent: 'const hue = 200;', newContent: 'const hue = 20;', isNew: false },
    ]);
  });

  it('groups blocks per file and applies each group', () => {
    const files = [file('sketch.js', 'let n = 10;'), file('particle.js', 'let r = 2;')];
    const md = [
      '// filename: sketch.js\n<<<SEARCH\nlet n = 10;\n===\nlet n = 50;\n>>>REPLACE',
      '// filename: particle.js\n<<<SEARCH\nlet r = 2;\n===\nlet r = 8;\n>>>REPLACE',
    ].join('\n\n');
    const changes = planFileChanges(files, 'sketch.js', md);
    expect(changes.map((c) => [c.name, c.newContent])).toEqual([
      ['sketch.js', 'let n = 50;'],
      ['particle.js', 'let r = 8;'],
    ]);
  });

  it('keeps the surviving group when another group fails to match', () => {
    const files = [file('sketch.js', 'let n = 10;'), file('particle.js', 'let r = 2;')];
    const md = [
      '// filename: sketch.js\n<<<SEARCH\nnot in the file\n===\nx\n>>>REPLACE',
      '// filename: particle.js\n<<<SEARCH\nlet r = 2;\n===\nlet r = 8;\n>>>REPLACE',
    ].join('\n\n');
    const changes = planFileChanges(files, 'sketch.js', md);
    expect(changes).toEqual([
      { name: 'particle.js', previousContent: 'let r = 2;', newContent: 'let r = 8;', isNew: false },
    ]);
  });

  it('skips a block naming a nonexistent file (search/replace cannot create files)', () => {
    const files = [file('sketch.js', 'setup')];
    const md = '// filename: ghost.js\n<<<SEARCH\na\n===\nb\n>>>REPLACE';
    expect(planFileChanges(files, 'sketch.js', md)).toEqual([]);
  });

  it('falls back to a full code block when no search/replace group applies', () => {
    const files = [file('sketch.js', 'old code')];
    const md = '<<<SEARCH\nmissing\n===\nx\n>>>REPLACE\n\n```js\nnew code\n```';
    const changes = planFileChanges(files, 'sketch.js', md);
    expect(changes).toEqual([
      { name: 'sketch.js', previousContent: 'old code', newContent: 'new code', isNew: false },
    ]);
  });
});

describe('mixed responses (search/replace + code blocks in one message)', () => {
  const sketch = 'function setup() {\n  createCanvas(1, 1);\n}\nfunction draw() {\n  background(30);\n}';
  const particle = 'class Particle {\n  constructor() {\n    this.size = random(2, 6);\n  }\n}';
  const files = [file('sketch.js', sketch), file('particle.js', particle)];

  it('applies a search/replace to one file AND a code block to another', () => {
    const md = [
      '// filename: sketch.js',
      '<<<SEARCH',
      '  background(30);',
      '===',
      '  background(255, 0, 0);',
      '>>>REPLACE',
      '',
      '```js',
      '// filename: particle.js',
      'class Particle {',
      '  constructor() {',
      '    this.size = random(6, 12);',
      '  }',
      '}',
      '```',
    ].join('\n');
    const changes = planFileChanges(files, 'sketch.js', md);
    expect(changes.map((c) => c.name).sort()).toEqual(['particle.js', 'sketch.js']);
    expect(changes.find((c) => c.name === 'sketch.js')!.newContent).toContain('background(255, 0, 0);');
    expect(changes.find((c) => c.name === 'particle.js')!.newContent).toContain('random(6, 12)');
  });

  it('search/replace wins over a code block for the same file', () => {
    const md = [
      '<<<SEARCH',
      '  background(30);',
      '===',
      '  background(255, 0, 0);',
      '>>>REPLACE',
      '',
      '```js',
      'function setup() {\n  createCanvas(9, 9);\n}',
      '```',
    ].join('\n');
    const changes = planFileChanges(files, 'sketch.js', md);
    expect(changes).toHaveLength(1);
    expect(changes[0].name).toBe('sketch.js');
    expect(changes[0].newContent).toContain('background(255, 0, 0);');
    expect(changes[0].newContent).not.toContain('createCanvas(9, 9)');
  });
});

describe('lazy-fragment guard (partial code block must not wipe the sketch)', () => {
  const fullSketch = [
    'let plankton = [];',
    'function setup() {',
    '  createCanvas(400, 400);',
    '  for (let i = 0; i < 2000; i++) {',
    '    plankton.push({',
    '      x: random(width),',
    '      size: random(2, 6),',
    '      hue: random(160, 210),',
    '    });',
    '  }',
    '}',
    'function draw() {',
    '  background(210, 60, 5);',
    '}',
  ].join('\n');
  const files = [file('sketch.js', fullSketch)];

  it('merges a fragment into the existing code instead of replacing the file', () => {
    const fragment = [
      '  for (let i = 0; i < 2000; i++) {',
      '    plankton.push({',
      '      x: random(width),',
      '      size: random(1, 3),',
      '      hue: random(160, 210),',
      '    });',
      '  }',
    ].join('\n');
    const changes = planFileChanges(files, 'sketch.js', `\`\`\`js\n${fragment}\n\`\`\``);
    expect(changes).toHaveLength(1);
    const next = changes[0].newContent;
    expect(next).toContain('size: random(1, 3),');
    expect(next).not.toContain('size: random(2, 6),');
    // The rest of the sketch survives.
    expect(next).toContain('function setup() {');
    expect(next).toContain('function draw() {');
    expect(next).toContain('let plankton = [];');
  });

  it('drops an unmergeable fragment rather than wiping the file', () => {
    const changes = planFileChanges(
      files,
      'sketch.js',
      '```js\nlet somethingElse = 1;\nconsole.log(somethingElse);\n```',
    );
    expect(changes).toEqual([]);
  });

  it('lets a genuine full rewrite (with the lifecycle) through untouched', () => {
    const rewrite = 'function setup() {\n  createCanvas(1, 1);\n}\nfunction draw() {\n  background(0);\n}';
    const changes = planFileChanges(files, 'sketch.js', `\`\`\`js\n${rewrite}\n\`\`\``);
    expect(changes).toEqual([
      { name: 'sketch.js', previousContent: fullSketch, newContent: rewrite, isNew: false },
    ]);
  });

  it('protects helper files without setup() (e.g. a Particle class)', () => {
    const particle = [
      'class Particle {',
      '  constructor() {',
      '    this.x = random(width);',
      '    this.vx = random(-1, 1);',
      '  }',
      '  update() {',
      '    this.x += this.vx;',
      '  }',
      '  show() {',
      '    circle(this.x, 50, 4);',
      '  }',
      '}',
    ].join('\n');
    const helperFiles = [file('sketch.js', 'function setup() {}'), file('particle.js', particle)];

    // Indented method fragment (with unchanged context lines) → merged by
    // anchors, class survives.
    const fragment = [
      '  update() {',
      '    this.x += this.vx * 2;',
      '  }',
      '  show() {',
      '    circle(this.x, 50, 4);',
      '  }',
    ].join('\n');
    const changes = planFileChanges(
      helperFiles,
      'particle.js',
      `\`\`\`js\n// filename: particle.js\n${fragment}\n\`\`\``,
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].newContent).toContain('class Particle {');
    expect(changes[0].newContent).toContain('this.x += this.vx * 2;');
    expect(changes[0].newContent).toContain('show() {');
  });

  it('drops a short helper-file excerpt that declares none of its symbols', () => {
    const particle = 'class Particle {\n  constructor() {\n    this.x = 0;\n    this.y = 0;\n    this.vx = 1;\n  }\n}';
    const helperFiles = [file('sketch.js', 'function setup() {}'), file('particle.js', particle)];
    // Dedented excerpt, unmergeable (no unique anchor overlap) → dropped.
    const changes = planFileChanges(
      helperFiles,
      'particle.js',
      '```js\n// filename: particle.js\nupdate() {\n  this.z = 3;\n}\n```',
    );
    expect(changes).toEqual([]);
  });

  it('lets a legit helper rewrite of similar size through (e.g. a rename)', () => {
    const particle = 'class Particle {\n  constructor() {\n    this.x = 0;\n  }\n}';
    const helperFiles = [file('sketch.js', 'function setup() {}'), file('particle.js', particle)];
    const rewrite = 'class Boid {\n  constructor() {\n    this.pos = 0;\n  }\n}';
    const changes = planFileChanges(
      helperFiles,
      'particle.js',
      `\`\`\`js\n// filename: particle.js\n${rewrite}\n\`\`\``,
    );
    expect(changes).toEqual([
      { name: 'particle.js', previousContent: particle, newContent: rewrite, isNew: false },
    ]);
  });

  it('guards the search/replace fallback path too', () => {
    const md = [
      '<<<SEARCH',
      'not in the file at all',
      '===',
      'x',
      '>>>REPLACE',
      '',
      '```js',
      '  for (let i = 0; i < 2000; i++) {',
      '    plankton.push({',
      '      x: random(width),',
      '      size: random(1, 3),',
      '      hue: random(160, 210),',
      '    });',
      '  }',
      '```',
    ].join('\n');
    const changes = planFileChanges(files, 'sketch.js', md);
    expect(changes).toHaveLength(1);
    expect(changes[0].newContent).toContain('function draw()');
    expect(changes[0].newContent).toContain('size: random(1, 3),');
  });
});

describe('planFileChanges with a TypeScript entry (sketch.ts)', () => {
  const tsFiles = [file('sketch.ts', 'function setup() {}')];

  it('an unnamed code block targets sketch.ts, not a phantom sketch.js', () => {
    const changes = planFileChanges(tsFiles, 'sketch.ts', '```ts\nfunction setup() { createCanvas(1,1); }\n```');
    expect(changes).toHaveLength(1);
    expect(changes[0].name).toBe('sketch.ts');
    expect(changes[0].isNew).toBe(false);
  });

  it('a block headed // filename: sketch.js redirects to the real entry', () => {
    const md = '```js\n// filename: sketch.js\nfunction setup() { redirected(); }\n```';
    const changes = planFileChanges(tsFiles, 'sketch.ts', md);
    expect(changes).toEqual([
      { name: 'sketch.ts', previousContent: 'function setup() {}', newContent: 'function setup() { redirected(); }', isNew: false },
    ]);
  });

  it('search/replace prefixed with the entry alias applies to the real entry', () => {
    const md = '// filename: sketch.js\n<<<SEARCH\nfunction setup() {}\n===\nfunction setup() { patched(); }\n>>>REPLACE';
    const changes = planFileChanges(tsFiles, 'sketch.ts', md);
    expect(changes[0]).toMatchObject({ name: 'sketch.ts', newContent: 'function setup() { patched(); }' });
  });

  it('a sketch.ts [NEW FILE] header in a JS sketch overwrites sketch.js instead of duplicating the entry', () => {
    const jsFiles = [file('sketch.js', 'old')];
    const md = '```ts\n// filename: sketch.ts [NEW FILE]\nnew entry code\n```';
    const changes = planFileChanges(jsFiles, 'sketch.js', md);
    expect(changes).toEqual([
      { name: 'sketch.js', previousContent: 'old', newContent: 'new entry code', isNew: false },
    ]);
  });
});

describe('presentationFor', () => {
  const c = (name: string, isNew = false) => ({ name, previousContent: '', newContent: 'x', isNew });

  it('none when empty', () => {
    expect(presentationFor([], 'sketch.js')).toBe('none');
  });
  it('diff for a single edit to the active file', () => {
    expect(presentationFor([c('sketch.js')], 'sketch.js')).toBe('diff');
  });
  it('apply for a new file', () => {
    expect(presentationFor([c('utils.js', true)], 'sketch.js')).toBe('apply');
  });
  it('apply for an edit to a non-active file', () => {
    expect(presentationFor([c('utils.js')], 'sketch.js')).toBe('apply');
  });
  it('apply for multiple files', () => {
    expect(presentationFor([c('sketch.js'), c('utils.js')], 'sketch.js')).toBe('apply');
  });
});

describe('applyChangesToFiles', () => {
  it('updates existing and creates new files', () => {
    const files = [file('sketch.js', 'old')];
    const next = applyChangesToFiles(files, [
      { name: 'sketch.js', previousContent: 'old', newContent: 'updated', isNew: false },
      { name: 'particle.js', previousContent: '', newContent: 'class P {}', isNew: true },
    ]);
    expect(next.map((f) => f.name)).toEqual(['sketch.js', 'particle.js']);
    expect(next.find((f) => f.name === 'sketch.js')!.content).toBe('updated');
    expect(next.find((f) => f.name === 'particle.js')!.language).toBe('javascript');
  });

  it('does not mutate the input array', () => {
    const files = [file('sketch.js', 'old')];
    applyChangesToFiles(files, [{ name: 'sketch.js', previousContent: 'old', newContent: 'new', isNew: false }]);
    expect(files[0].content).toBe('old');
  });
});

describe('focusAfterChanges', () => {
  it('prefers sketch.js when present', () => {
    expect(focusAfterChanges(
      [{ name: 'particle.js', previousContent: '', newContent: 'x', isNew: true },
       { name: 'sketch.js', previousContent: 'a', newContent: 'b', isNew: false }],
      'other.js',
    )).toBe('sketch.js');
  });

  it('falls back to the first change otherwise', () => {
    expect(focusAfterChanges(
      [{ name: 'particle.js', previousContent: '', newContent: 'x', isNew: true }],
      'other.js',
    )).toBe('particle.js');
  });

  it('uses the fallback when there are no changes', () => {
    expect(focusAfterChanges([], 'sketch.js')).toBe('sketch.js');
  });
});

describe('single-file mode (default): new files fold into the entry', () => {
  const entry = 'function setup() {\n  createCanvas(1, 1);\n}';

  it('a [NEW FILE] block is inlined above the entry code instead of creating a file', () => {
    const files = [file('sketch.js', entry)];
    const md = '```js\n// filename: particle.js [NEW FILE]\nclass Particle {}\n```';
    const changes = planFileChanges(files, 'sketch.js', md);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ name: 'sketch.js', isNew: false, previousContent: entry });
    expect(changes[0].newContent).toBe(
      '// particle.js\nclass Particle {}\n\n// sketch.js\nfunction setup() {\n  createCanvas(1, 1);\n}\n',
    );
  });

  it('merges a new file with the entry rewrite from the same response', () => {
    const files = [file('sketch.js', entry)];
    const md = [
      '```js',
      '// filename: particle.js [NEW FILE]',
      'class Particle {}',
      '```',
      '```js',
      '// filename: sketch.js',
      'function setup() { new Particle(); }',
      '```',
    ].join('\n');
    const changes = planFileChanges(files, 'sketch.js', md);

    expect(changes.map((c) => c.name)).toEqual(['sketch.js']);
    expect(changes[0].newContent).toContain('class Particle {}');
    expect(changes[0].newContent.indexOf('class Particle'))
      .toBeLessThan(changes[0].newContent.indexOf('new Particle()'));
  });

  it('drops the imports that tied the split files together', () => {
    const files = [file('sketch.js', entry)];
    const md = [
      '```js',
      '// filename: particle.js [NEW FILE]',
      'export class Particle {}',
      '```',
      '```js',
      '// filename: sketch.js',
      "import { Particle } from './particle.js';",
      'function setup() { new Particle(); }',
      '```',
    ].join('\n');
    const changes = planFileChanges(files, 'sketch.js', md);

    expect(changes[0].newContent).not.toContain('import');
    expect(changes[0].newContent).toContain('class Particle {}');
    expect(changes[0].newContent).not.toContain('export class');
  });

  it('leaves an ordinary single-file edit untouched', () => {
    const files = [file('sketch.js', entry)];
    const changes = planFileChanges(files, 'sketch.js', '```js\nfunction setup() { createCanvas(9, 9); }\n```');
    expect(changes).toEqual([
      { name: 'sketch.js', previousContent: entry, newContent: 'function setup() { createCanvas(9, 9); }', isNew: false },
    ]);
  });

  it('with allowMultiFile the same response really does create the file', () => {
    const files = [file('sketch.js', entry)];
    const md = '```js\n// filename: particle.js [NEW FILE]\nclass Particle {}\n```';
    const changes = planFileChanges(files, 'sketch.js', md, multi);
    expect(changes).toEqual([
      { name: 'particle.js', previousContent: '', newContent: 'class Particle {}', isNew: true },
    ]);
  });
});
