import { describe, it, expect } from 'vitest';
import {
  createDefaultFiles,
  isAllowedFileName,
  languageFromExtension,
  filesFromNamed,
  isEntryFile,
  entryFileName,
  findEntryFile,
} from './defaultFiles';

describe('isAllowedFileName', () => {
  it('accepts .js and .ts', () => {
    expect(isAllowedFileName('sketch.js')).toBe(true);
    expect(isAllowedFileName('utils.ts')).toBe(true);
  });
  it('rejects other extensions', () => {
    expect(isAllowedFileName('evil.exe')).toBe(false);
    expect(isAllowedFileName('noext')).toBe(false);
    expect(isAllowedFileName('a.js.png')).toBe(false);
  });
});

describe('languageFromExtension', () => {
  it('maps extensions to Monaco languages', () => {
    expect(languageFromExtension('a.ts')).toBe('typescript');
    expect(languageFromExtension('a.js')).toBe('javascript');
  });
});

describe('createDefaultFiles', () => {
  it('wraps code in a single sketch.js file', () => {
    const files = createDefaultFiles('function setup(){}');
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('sketch.js');
    expect(files[0].content).toBe('function setup(){}');
    expect(files[0].language).toBe('javascript');
  });

  it('creates sketch.ts for TypeScript sketches', () => {
    const files = createDefaultFiles('function setup(){}', 'typescript');
    expect(files[0].name).toBe('sketch.ts');
    expect(files[0].language).toBe('typescript');
  });
});

describe('entry file helpers', () => {
  it('isEntryFile matches only sketch.js / sketch.ts', () => {
    expect(isEntryFile('sketch.js')).toBe(true);
    expect(isEntryFile('sketch.ts')).toBe(true);
    expect(isEntryFile('particle.js')).toBe(false);
    expect(isEntryFile('mysketch.js')).toBe(false);
  });

  it('entryFileName maps the language to the extension', () => {
    expect(entryFileName('javascript')).toBe('sketch.js');
    expect(entryFileName('typescript')).toBe('sketch.ts');
  });

  it('findEntryFile prefers the entry, falls back to the first file', () => {
    expect(findEntryFile([{ name: 'a.js' }, { name: 'sketch.ts' }])?.name).toBe('sketch.ts');
    expect(findEntryFile([{ name: 'a.js' }, { name: 'b.js' }])?.name).toBe('a.js');
    expect(findEntryFile([])).toBeUndefined();
  });
});

describe('filesFromNamed', () => {
  it('builds SketchFiles with ids and inferred language', () => {
    const files = filesFromNamed([
      { name: 'sketch.js', content: 'a' },
      { name: 'types.ts', content: 'b' },
    ]);
    expect(files.map((f) => f.name)).toEqual(['sketch.js', 'types.ts']);
    expect(files[1].language).toBe('typescript');
    expect(files.every((f) => typeof f.id === 'string' && f.id.length > 0)).toBe(true);
  });
});
