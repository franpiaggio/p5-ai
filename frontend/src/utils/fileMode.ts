import type { SketchFile } from '../types';
import { findEntryFile } from '../constants/defaultFiles';

/**
 * Sketches are single-file by default: everything lives in the entry file and
 * the assistant is told to keep it that way. Multi-file is an opt-in, granted
 * only when the user asks for it, when the sketch already has several files, or
 * when the code has grown past the point where one file is reasonable.
 */

/** A sketch at least this long may be split — "too big for one file". */
export const MULTI_FILE_LINE_THRESHOLD = 400;

/** Phrasings that read as "put this in more than one file" (English + Spanish). */
const MULTI_FILE_REQUEST_PATTERNS: RegExp[] = [
  /\bmulti[-\s]?files?\b/i,
  /\b(multiple|several|separate|different|extra)\s+files\b/i,
  /\b(its|his|her|their|a|an|another|one)\s+own\s+file\b/i,
  /\b(another|a\s+new|a\s+separate|its\s+own)\s+file\b/i,
  /\b(split|separate|extract|move|break|modulari[sz]e|organi[sz]e)\b[^.!?]*\bfiles?\b/i,
  /\b(varios|multiples|múltiples|distintos|separados|diferentes)\s+(archivos|ficheros|m[oó]dulos)\b/i,
  /\b(archivo|fichero)s?\s+(aparte|separados?|propios?|distintos?)\b/i,
  // Verb stems, so conjugations and accents ride along (separá, dividí, partir…).
  /\b(separ|divid|part|modulariz)[a-záéíóúñ]*[^.!?]*\b(archivos?|ficheros?|m[oó]dulos?)\b/i,
  /\ben\s+(varios|distintos|diferentes|otros?)\s+(archivos?|ficheros?)\b/i,
];

/** Did the user explicitly ask for the sketch to span several files? */
export function requestsMultiFile(message: string): boolean {
  if (!message) return false;
  return MULTI_FILE_REQUEST_PATTERNS.some((re) => re.test(message));
}

/** Total line count across the sketch. */
export function sketchLineCount(files: SketchFile[]): number {
  return files.reduce((total, f) => total + f.content.split('\n').length, 0);
}

/** Big enough that splitting it up is a legitimate call. */
export function isSketchLarge(files: SketchFile[]): boolean {
  return sketchLineCount(files) >= MULTI_FILE_LINE_THRESHOLD;
}

/**
 * May the assistant use more than one file on this turn?
 *  - `enabled`: the user turned multi-file on for this sketch
 *  - the sketch already has several files (nothing to collapse back into)
 *  - the user asked for it in this message
 *  - the sketch outgrew a single file
 */
export function allowsMultiFile(params: {
  files: SketchFile[];
  message?: string;
  enabled?: boolean;
}): boolean {
  const { files, message = '', enabled = false } = params;
  return (
    enabled ||
    files.length > 1 ||
    requestsMultiFile(message) ||
    isSketchLarge(files)
  );
}

// Module syntax only makes sense across files. When several files collapse into
// one, imports between them have no target left and `export` is meaningless, so
// both are stripped. Imports of external (non-relative) modules are preserved.
const SIDE_EFFECT_IMPORT_RE = /^[ \t]*import[ \t]*(['"])\.[^'"]*\1[ \t]*;?[ \t]*\r?\n?/gm;
const RELATIVE_IMPORT_RE = /^[ \t]*import[^;()]*?from[ \t]*(['"])\.[^'"]*\1[ \t]*;?[ \t]*\r?\n?/gm;
const RELATIVE_REEXPORT_RE = /^[ \t]*export[ \t]*(\{[^}]*\}|\*)[ \t]*from[ \t]*(['"])\.[^'"]*\2[ \t]*;?[ \t]*\r?\n?/gm;
const EXPORT_LIST_RE = /^[ \t]*export[ \t]*\{[^}]*\}[ \t]*;?[ \t]*\r?\n?/gm;
const EXPORT_DEFAULT_RE = /^([ \t]*)export[ \t]+default[ \t]+(?=(async[ \t]+)?(function|class)\b)/gm;
const EXPORT_DECL_RE =
  /^([ \t]*)export[ \t]+(?=(const|let|var|function|class|async|abstract|interface|type|enum)\b)/gm;

/** Remove the ES-module wiring that a file only needed while it was separate. */
export function stripModuleSyntax(code: string): string {
  return code
    .replace(SIDE_EFFECT_IMPORT_RE, '')
    .replace(RELATIVE_IMPORT_RE, '')
    .replace(RELATIVE_REEXPORT_RE, '')
    .replace(EXPORT_LIST_RE, '')
    .replace(EXPORT_DEFAULT_RE, '$1')
    .replace(EXPORT_DECL_RE, '$1');
}

/**
 * Concatenate file sources into one, in the order given. Callers pass helpers
 * first and the entry last — the same order the preview loads them in, so a
 * class stays defined before the code that uses it.
 */
export function joinFileSources(
  parts: Array<{ name: string; content: string }>,
): string {
  const sections = parts
    .map((p) => ({ name: p.name, content: stripModuleSyntax(p.content).trim() }))
    .filter((p) => p.content.length > 0);

  if (sections.length === 0) return '';
  if (sections.length === 1) return `${sections[0].content}\n`;

  return `${sections.map((s) => `// ${s.name}\n${s.content}`).join('\n\n')}\n`;
}

/**
 * Collapse a multi-file sketch into its entry file: helpers are inlined above
 * the entry's own code (preview load order) and module syntax between them is
 * dropped. Returns a single-file array.
 */
export function mergeFilesToSingle(files: SketchFile[]): SketchFile[] {
  if (files.length <= 1) return files;
  const entry = findEntryFile(files);
  if (!entry) return files;

  const ordered = [...files.filter((f) => f.name !== entry.name), entry];
  return [{ ...entry, content: joinFileSources(ordered) }];
}
