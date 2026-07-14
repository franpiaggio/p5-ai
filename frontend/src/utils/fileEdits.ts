import type { SketchFile } from '../types';
import {
  extractJsBlocks,
  extractFirstJsBlock,
  splitFileSections,
  extractSearchReplaceBlocks,
  applySearchReplace,
} from './codeUtils';
import { isAllowedFileName, createFileId, languageFromExtension } from '../constants/defaultFiles';

/** The entry-point file p5 lifecycle functions live in; the default edit target. */
export const ENTRY_FILE = 'sketch.js';

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

  // Search/replace: small edits, applied to the file you're viewing.
  const srBlocks = extractSearchReplaceBlocks(content);
  if (srBlocks) {
    const prev = byName.get(activeFileName) ?? '';
    try {
      const next = applySearchReplace(prev, srBlocks);
      return next !== prev
        ? [{ name: activeFileName, previousContent: prev, newContent: next, isNew: false }]
        : [];
    } catch {
      // A search block didn't match — fall back to a full code block if present.
      const fb = extractFirstJsBlock(content);
      return fb && fb !== prev
        ? [{ name: activeFileName, previousContent: prev, newContent: fb, isNew: false }]
        : [];
    }
  }

  // Full code blocks → per-file sections.
  const sections = extractJsBlocks(content)
    .flatMap((b) => splitFileSections(b))
    .filter((s) => s.code.trim().length > 0);

  const changes: FileChange[] = [];
  for (const s of sections) {
    const name = s.name ?? ENTRY_FILE;
    const exists = byName.has(name);
    if (!exists && !isAllowedFileName(name)) continue; // invalid new filename
    const idx = changes.findIndex((c) => c.name === name);
    if (idx >= 0) {
      // Same file appears twice in one response — last write wins, keep original prev/isNew.
      changes[idx] = { ...changes[idx], newContent: s.code };
    } else {
      changes.push({
        name,
        previousContent: byName.get(name) ?? '',
        newContent: s.code,
        isNew: !exists,
      });
    }
  }
  // Drop no-op edits to existing files.
  return changes.filter((c) => c.isNew || c.newContent !== c.previousContent);
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

/** After applying changes, which file to focus: prefer sketch.js, else the first change. */
export function focusAfterChanges(changes: FileChange[], fallback: string): string {
  if (changes.some((c) => c.name === ENTRY_FILE)) return ENTRY_FILE;
  return changes[0]?.name ?? fallback;
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
