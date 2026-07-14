import type { SketchFile } from '../types';

let fileIdCounter = 0;

export function createFileId(): string {
  return `file-${++fileIdCounter}-${Date.now()}`;
}

export function createDefaultFiles(code: string): SketchFile[] {
  return [
    {
      id: createFileId(),
      name: 'sketch.js',
      content: code,
      language: 'javascript',
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
