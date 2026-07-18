import type { SketchFile } from '../types';

let fileIdCounter = 0;

export function createFileId(): string {
  return `file-${++fileIdCounter}-${Date.now()}`;
}

/** The entry point holds setup()/draw(); its extension follows the sketch language. */
export function isEntryFile(name: string): boolean {
  return name === 'sketch.js' || name === 'sketch.ts';
}

export function entryFileName(language: 'javascript' | 'typescript'): string {
  return language === 'typescript' ? 'sketch.ts' : 'sketch.js';
}

/** The sketch's entry file; falls back to the first file for malformed sets. */
export function findEntryFile<T extends { name: string }>(files: T[]): T | undefined {
  return files.find((f) => isEntryFile(f.name)) ?? files[0];
}

export function createDefaultFiles(
  code: string,
  language: 'javascript' | 'typescript' = 'javascript',
): SketchFile[] {
  return [
    {
      id: createFileId(),
      name: entryFileName(language),
      content: code,
      language,
    },
  ];
}

const ALLOWED_EXTENSIONS = ['.js', '.ts'];

export function isAllowedFileName(name: string): boolean {
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function languageFromExtension(name: string): 'javascript' | 'typescript' {
  return name.endsWith('.ts') ? 'typescript' : 'javascript';
}

/** Build store SketchFile[] from a plain {name, content}[] set (e.g. an example). */
export function filesFromNamed(files: { name: string; content: string }[]): SketchFile[] {
  return files.map((f) => ({
    id: createFileId(),
    name: f.name,
    content: f.content,
    language: languageFromExtension(f.name),
  }));
}
