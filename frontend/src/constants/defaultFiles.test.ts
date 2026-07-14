import { describe, it, expect } from 'vitest';
import {
  createDefaultFiles,
  isAllowedFileName,
  languageFromExtension,
  filesFromNamed,
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
