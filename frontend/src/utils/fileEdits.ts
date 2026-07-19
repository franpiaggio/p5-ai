import type { SketchFile } from '../types';
import {
  extractJsBlocks,
  extractFirstJsBlock,
  splitFileSections,
  extractSearchReplaceBlocks,
  applySearchReplace,
  declaredSymbols,
  type SearchReplaceBlock,
} from './codeUtils';
import {
  isAllowedFileName,
  createFileId,
  languageFromExtension,
  isEntryFile,
  findEntryFile,
} from '../constants/defaultFiles';

/** One file's resulting change from an assistant message. */
export interface FileChange {
  name: string;
  previousContent: string; // '' when the file is being created
  newContent: string;
  isNew: boolean;
}

/**
 * Compute the file changes an assistant message implies — pure, no store access.
 * Handles:
 *  - search/replace blocks (small edits to the active file)
 *  - one code block per file, or several `// filename:` sections inside one block
 *  - default target `sketch.js` when a block has no filename header
 * Files that don't actually change (same content) are omitted. New files with an
 * invalid name are skipped.
 */
export function planFileChanges(
  files: SketchFile[],
  activeFileName: string,
  content: string,
): FileChange[] {
  const byName = new Map(files.map((f) => [f.name, f.content]));
  const entryName = findEntryFile(files)?.name ?? 'sketch.js';

  // Search/replace: small edits. Each block targets its `// filename:` prefix
  // when present; otherwise the target is resolved by content — the file whose
  // current text contains the SEARCH string (active file first, then sketch.js,
  // then a unique match anywhere).
  const srBlocks = extractSearchReplaceBlocks(content);
  if (srBlocks) {
    const resolveTarget = (block: SearchReplaceBlock): string => {
      // Entry aliases redirect (a model may say `sketch.js` in a TS sketch).
      if (block.fileName) return isEntryFile(block.fileName) ? entryName : block.fileName;
      if ((byName.get(activeFileName) ?? '').includes(block.search)) return activeFileName;
      if ((byName.get(entryName) ?? '').includes(block.search)) return entryName;
      const holders = files.filter((f) => f.content.includes(block.search));
      return holders.length === 1 ? holders[0].name : activeFileName;
    };

    const groups = new Map<string, SearchReplaceBlock[]>();
    for (const block of srBlocks) {
      const target = resolveTarget(block);
      if (!byName.has(target)) continue; // search/replace can't create files
      const group = groups.get(target);
      if (group) group.push(block);
      else groups.set(target, [block]);
    }

    const srChanges: FileChange[] = [];
    for (const [name, blocks] of groups) {
      const prev = byName.get(name)!;
      try {
        const next = applySearchReplace(prev, blocks);
        if (next !== prev) {
          srChanges.push({ name, previousContent: prev, newContent: next, isNew: false });
        }
      } catch {
        // This file's blocks didn't match — skip the group, keep the rest.
      }
    }
    if (srChanges.length > 0) return srChanges;

    // Nothing applied — fall back to a full code block if present.
    const prev = byName.get(activeFileName) ?? '';
    let fb = extractFirstJsBlock(content);
    if (fb && looksLikeFragment(prev, fb, activeFileName === entryName)) {
      fb = mergeFragment(prev, fb); // fragment, not a full file — merge or drop
    }
    return fb && fb !== prev
      ? [{ name: activeFileName, previousContent: prev, newContent: fb, isNew: false }]
      : [];
  }

  // Full code blocks → per-file sections.
  const sections = extractJsBlocks(content)
    .flatMap((b) => splitFileSections(b))
    .filter((s) => s.code.trim().length > 0);

  const changes: FileChange[] = [];
  for (const s of sections) {
    // Unnamed sections and entry aliases (`sketch.ts` in a JS sketch) target the
    // actual entry file instead of creating a duplicate entry.
    const name = !s.name || isEntryFile(s.name) ? entryName : s.name;
    const exists = byName.has(name);
    if (!exists && !isAllowedFileName(name)) continue; // invalid new filename

    // "Lazy" fragment guard: some models answer a small edit with a code block
    // holding only the changed region. Treating that as the whole file would
    // wipe it — detect fragments and merge them into the existing code by
    // anchoring; refuse the change when no safe anchoring exists.
    let newContent = s.code;
    if (exists && looksLikeFragment(byName.get(name)!, s.code, name === entryName)) {
      const merged = mergeFragment(byName.get(name)!, s.code);
      if (merged === null) continue;
      newContent = merged;
    }

    const idx = changes.findIndex((c) => c.name === name);
    if (idx >= 0) {
      // Same file appears twice in one response — last write wins, keep original prev/isNew.
      changes[idx] = { ...changes[idx], newContent };
    } else {
      changes.push({
        name,
        previousContent: byName.get(name) ?? '',
        newContent,
        isNew: !exists,
      });
    }
  }
  // Drop no-op edits to existing files.
  return changes.filter((c) => c.isNew || c.newContent !== c.previousContent);
}

const SETUP_PATTERN = /(^|\s)function\s+setup\s*\(/;

/** A suggested entry-file replacement without setup() — which every complete
 * sketch has — is a fragment, not a full file. (draw() is deliberately not
 * checked: a static sketch legitimately has only setup().) */
export function isPartialEntryRewrite(prev: string, next: string): boolean {
  return SETUP_PATTERN.test(prev) && !SETUP_PATTERN.test(next);
}

/**
 * Heuristic: does `next` look like a partial excerpt of `prev` rather than a
 * complete replacement file?
 *  - any file: a complete file never starts on an indented line
 *  - entry file: a complete sketch always declares setup()
 *  - helper files: a much shorter block that re-declares none of the file's
 *    top-level symbols is an excerpt (a rewrite/rename keeps a similar size)
 */
export function looksLikeFragment(prev: string, next: string, isEntry: boolean): boolean {
  const firstLine = next.split('\n').find((l) => l.trim().length > 0);
  if (firstLine && /^[ \t]/.test(firstLine)) return true;
  if (isEntry) return isPartialEntryRewrite(prev, next);
  const prevSymbols = declaredSymbols(prev);
  if (prevSymbols.length === 0) return false;
  if (next.length >= prev.length * 0.5) return false;
  const nextSymbols = new Set(declaredSymbols(next));
  return !prevSymbols.some((s) => nextSymbols.has(s));
}

/**
 * Best-effort merge of a partial-file suggestion into the existing code:
 * fragment lines that appear exactly once in the file (trimmed) become anchors;
 * if the anchors map onto the file in order, the spanned region is replaced by
 * the fragment. Returns null when no safe anchoring exists.
 */
export function mergeFragment(prev: string, fragment: string): string | null {
  const prevLines = prev.split('\n');
  const fragLines = fragment.split('\n');

  const occurrences = new Map<string, number[]>();
  prevLines.forEach((line, i) => {
    const key = line.trim();
    const list = occurrences.get(key);
    if (list) list.push(i);
    else occurrences.set(key, [i]);
  });

  // Trivial lines ('}', ');', blanks) are useless as anchors.
  const anchors: Array<{ frag: number; prev: number }> = [];
  fragLines.forEach((line, i) => {
    const key = line.trim();
    if (key.length < 4) return;
    const hits = occurrences.get(key);
    if (hits && hits.length === 1) anchors.push({ frag: i, prev: hits[0] });
  });
  if (anchors.length < 2) return null;
  for (let i = 1; i < anchors.length; i++) {
    if (anchors[i].prev <= anchors[i - 1].prev) return null; // reordered — unsafe
  }

  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  // Extend the region to cover the fragment's unanchored leading/trailing lines.
  const start = first.prev - first.frag;
  const end = last.prev + (fragLines.length - 1 - last.frag);
  if (start < 0 || end >= prevLines.length) return null;

  return [
    ...prevLines.slice(0, start),
    ...fragLines,
    ...prevLines.slice(end + 1),
  ].join('\n');
}

/** Apply changes to a files array, returning a new array (creating any new files). */
export function applyChangesToFiles(files: SketchFile[], changes: FileChange[]): SketchFile[] {
  const result = files.map((f) => ({ ...f }));
  for (const c of changes) {
    const idx = result.findIndex((f) => f.name === c.name);
    if (idx >= 0) {
      result[idx] = { ...result[idx], content: c.newContent };
    } else {
      result.push({
        id: createFileId(),
        name: c.name,
        content: c.newContent,
        language: languageFromExtension(c.name),
      });
    }
  }
  return result;
}

/** After applying changes, which file to focus: prefer the entry file, else the first change. */
export function focusAfterChanges(changes: FileChange[], fallback: string): string {
  const entry = changes.find((c) => isEntryFile(c.name));
  return entry?.name ?? changes[0]?.name ?? fallback;
}

/**
 * Decide how to present the changes:
 *  - 'diff': a single edit to the file the user is currently viewing → show a
 *    reviewable diff (accept/reject).
 *  - 'apply': anything else (multiple files, a non-active file, or a new file) →
 *    apply directly.
 */
export function presentationFor(changes: FileChange[], activeFileName: string): 'none' | 'diff' | 'apply' {
  if (changes.length === 0) return 'none';
  if (changes.length === 1 && !changes[0].isNew && changes[0].name === activeFileName) {
    return 'diff';
  }
  return 'apply';
}
