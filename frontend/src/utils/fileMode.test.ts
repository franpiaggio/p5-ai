import { describe, it, expect } from 'vitest';
import type { SketchFile } from '../types';
import {
  requestsMultiFile,
  isSketchLarge,
  allowsMultiFile,
  stripModuleSyntax,
  joinFileSources,
  mergeFilesToSingle,
  MULTI_FILE_LINE_THRESHOLD,
} from './fileMode';

function file(name: string, content: string): SketchFile {
  return { id: name, name, content, language: name.endsWith('.ts') ? 'typescript' : 'javascript' };
}

const single = [file('sketch.js', 'function setup() {}')];

describe('requestsMultiFile', () => {
  it.each([
    'split this into multiple files',
    'can you separate the particle class into its own file?',
    'put the palette in another file',
    'lets go multi-file here',
    'move the boids system to a separate file please',
    'separá el sketch en varios archivos',
    'poné la clase Particle en un archivo aparte',
    'dividí esto en módulos',
    'quiero esto en varios archivos',
  ])('detects %j', (message) => {
    expect(requestsMultiFile(message)).toBe(true);
  });

  it.each([
    'make the background darker',
    'add more particles',
    'keep everything in one file',
    'why does the canvas flicker?',
    'cambiá el color del fondo',
    'mové las partículas más rápido',
  ])('ignores %j', (message) => {
    expect(requestsMultiFile(message)).toBe(false);
  });
});

describe('isSketchLarge', () => {
  it('a short sketch is not large', () => {
    expect(isSketchLarge(single)).toBe(false);
  });

  it('counts lines across every file', () => {
    const half = 'x\n'.repeat(MULTI_FILE_LINE_THRESHOLD / 2);
    expect(isSketchLarge([file('sketch.js', half), file('particle.js', half)])).toBe(true);
  });
});

describe('allowsMultiFile', () => {
  it('is off for a small single-file sketch and a routine request', () => {
    expect(allowsMultiFile({ files: single, message: 'make it blue' })).toBe(false);
  });

  it('is on once the user enabled it', () => {
    expect(allowsMultiFile({ files: single, message: 'make it blue', enabled: true })).toBe(true);
  });

  it('is on when the sketch already has several files', () => {
    const files = [...single, file('particle.js', 'class Particle {}')];
    expect(allowsMultiFile({ files, message: 'make it blue' })).toBe(true);
  });

  it('is on when the user asks for a split', () => {
    expect(allowsMultiFile({ files: single, message: 'split it into multiple files' })).toBe(true);
  });

  it('is on when the sketch outgrew one file', () => {
    const big = [file('sketch.js', 'x\n'.repeat(MULTI_FILE_LINE_THRESHOLD))];
    expect(allowsMultiFile({ files: big, message: 'add trails' })).toBe(true);
  });
});

describe('stripModuleSyntax', () => {
  it('removes relative imports but keeps external ones', () => {
    const code = [
      "import p5 from 'p5';",
      "import { Particle } from './particle.js';",
      "import './boot.js';",
      'const n = 10;',
    ].join('\n');
    const out = stripModuleSyntax(code);
    expect(out).toContain("import p5 from 'p5';");
    expect(out).not.toContain('particle.js');
    expect(out).not.toContain('boot.js');
    expect(out).toContain('const n = 10;');
  });

  it('does not swallow code between an external import and a relative one', () => {
    const code = ["import p5 from 'p5';", 'const keep = 1;', "import { X } from './x.js';"].join('\n');
    expect(stripModuleSyntax(code)).toContain('const keep = 1;');
  });

  it('drops export keywords and export lists', () => {
    const code = [
      'export class Particle {}',
      'export const HUE = 200;',
      'export default function draw() {}',
      'export { Particle, HUE };',
    ].join('\n');
    const out = stripModuleSyntax(code);
    expect(out).toContain('class Particle {}');
    expect(out).toContain('const HUE = 200;');
    expect(out).toContain('function draw() {}');
    expect(out).not.toContain('export');
  });

  it('handles a multi-line relative import', () => {
    const code = "import {\n  Particle,\n  Emitter,\n} from './particle.js';\nconst n = 1;";
    expect(stripModuleSyntax(code)).toBe('const n = 1;');
  });
});

describe('joinFileSources', () => {
  it('labels each section and keeps the given order', () => {
    expect(joinFileSources([
      { name: 'particle.js', content: 'class Particle {}' },
      { name: 'sketch.js', content: 'function setup() {}' },
    ])).toBe('// particle.js\nclass Particle {}\n\n// sketch.js\nfunction setup() {}\n');
  });

  it('skips empty files and drops the label when only one section is left', () => {
    expect(joinFileSources([
      { name: 'empty.js', content: '   ' },
      { name: 'sketch.js', content: 'function setup() {}' },
    ])).toBe('function setup() {}\n');
  });
});

describe('mergeFilesToSingle', () => {
  it('inlines helpers above the entry, in preview load order', () => {
    const files = [
      file('sketch.js', "import { Particle } from './particle.js';\nfunction setup() { new Particle(); }"),
      file('particle.js', 'export class Particle {}'),
    ];
    const merged = mergeFilesToSingle(files);

    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe('sketch.js');
    expect(merged[0].content).toBe(
      '// particle.js\nclass Particle {}\n\n// sketch.js\nfunction setup() { new Particle(); }\n',
    );
  });

  it('keeps the entry file identity (id, language) of a TypeScript sketch', () => {
    const entry = file('sketch.ts', 'function setup() {}');
    const merged = mergeFilesToSingle([entry, file('util.ts', 'const a = 1;')]);
    expect(merged[0]).toMatchObject({ id: entry.id, name: 'sketch.ts', language: 'typescript' });
  });

  it('leaves a single-file sketch untouched', () => {
    expect(mergeFilesToSingle(single)).toBe(single);
  });
});
