import { diffLines } from 'diff';

export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

/** Extract first JS/TS code block from markdown. Returns null if none found. */
export function extractFirstJsBlock(markdown: string): string | null {
  const match = /```(?:javascript|js|jsx|typescript|ts|tsx)\s*\n([\s\S]*?)```/.exec(markdown);
  return match ? match[1].replace(/\n$/, '') : null;
}

/** Extract every JS/TS code block from markdown, in order. Empty array if none. */
export function extractJsBlocks(markdown: string): string[] {
  const regex = /```(?:javascript|js|jsx|typescript|ts|tsx)\s*\n([\s\S]*?)```/g;
  const blocks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(markdown)) !== null) {
    blocks.push(m[1].replace(/\n$/, ''));
  }
  return blocks;
}

export interface SearchReplaceBlock {
  search: string;
  replace: string;
  /** Target file from a `// filename: x` line directly above <<<SEARCH; absent = resolve by content. */
  fileName?: string;
}

/** True when the text contains a search/replace marker line, in any tolerated
 * variant. Used both to detect patch responses and to keep raw markers from
 * ever being applied as file content. */
export function hasSearchReplaceMarkers(text: string): boolean {
  return /^<{3,}[ \t]*SEARCH|^>{3,}[ \t]*REPLACE/m.test(text);
}

/** Parse all <<<SEARCH ... === ... >>>REPLACE blocks from markdown, each with an
 * optional `// filename: x` line directly above it. Returns null if none found.
 * Tolerant of marker drift: models trained on the Aider format emit
 * `<<<<<<< SEARCH` / `=======` / `>>>>>>> REPLACE` (or add trailing spaces), so
 * 3+ marker characters and trailing whitespace are accepted. */
export function extractSearchReplaceBlocks(markdown: string): SearchReplaceBlock[] | null {
  const blocks: SearchReplaceBlock[] = [];
  const regex =
    /(?:^\/\/[ \t]*filename:[ \t]*(\S+)[ \t]*\n)?^<{3,}[ \t]*SEARCH[ \t]*\n([\s\S]*?)\n={3,}[ \t]*\n([\s\S]*?)\n>{3,}[ \t]*REPLACE/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    blocks.push({
      search: match[2],
      replace: match[3],
      ...(match[1] ? { fileName: match[1] } : {}),
    });
  }
  return blocks.length > 0 ? blocks : null;
}

/** Start indices (in lines) where every search line matches under `norm`. */
function matchLineBlock(
  codeLines: string[],
  searchLines: string[],
  norm: (line: string) => string,
): number[] {
  const starts: number[] = [];
  for (let i = 0; i + searchLines.length <= codeLines.length; i++) {
    let ok = true;
    for (let j = 0; j < searchLines.length; j++) {
      if (norm(codeLines[i + j]) !== norm(searchLines[j])) {
        ok = false;
        break;
      }
    }
    if (ok) starts.push(i);
  }
  return starts;
}

const leadingWhitespace = (line: string): string => /^[ \t]*/.exec(line)![0];

/**
 * Apply one search/replace block with cascading match tolerance (Aider-style):
 *  1. exact substring — first occurrence, as models usually include enough context
 *  2. per-line, ignoring trailing whitespace — must match exactly once
 *  3. per-line, fully trimmed (indentation-insensitive) — must match exactly once,
 *     and the replacement is re-indented to the target's leading whitespace
 * Throws when no tier produces a usable match.
 */
function applyOneSearchReplace(
  code: string,
  block: { search: string; replace: string },
): string {
  const idx = code.indexOf(block.search);
  if (idx !== -1) {
    return code.slice(0, idx) + block.replace + code.slice(idx + block.search.length);
  }

  const codeLines = code.split('\n');
  const searchLines = block.search.split('\n');

  let starts = matchLineBlock(codeLines, searchLines, (l) => l.replace(/[ \t]+$/, ''));
  let reindent = false;
  if (starts.length !== 1) {
    starts = matchLineBlock(codeLines, searchLines, (l) => l.trim());
    reindent = true;
    if (starts.length !== 1) {
      throw new Error(
        starts.length === 0
          ? `Search block not found in code:\n${block.search.slice(0, 80)}...`
          : `Search block is ambiguous (${starts.length} matches):\n${block.search.slice(0, 80)}...`,
      );
    }
  }

  const start = starts[0];
  let replaceLines = block.replace === '' ? [] : block.replace.split('\n');
  if (reindent && replaceLines.length > 0) {
    // Shift the replacement to the target's indentation: swap the search block's
    // leading whitespace prefix for the matched code's.
    const targetIndent = leadingWhitespace(codeLines[start]);
    const searchIndent = leadingWhitespace(searchLines[0]);
    if (targetIndent !== searchIndent) {
      replaceLines = replaceLines.map((l) =>
        l.startsWith(searchIndent) ? targetIndent + l.slice(searchIndent.length) : l,
      );
    }
  }

  return [
    ...codeLines.slice(0, start),
    ...replaceLines,
    ...codeLines.slice(start + searchLines.length),
  ].join('\n');
}

/** Apply search/replace blocks sequentially to code. Throws if a block can't be placed. */
export function applySearchReplace(
  code: string,
  blocks: Array<{ search: string; replace: string }>,
): string {
  let result = code;
  for (const block of blocks) {
    result = applyOneSearchReplace(result, block);
  }
  return result;
}

/** Best-effort variant for the live streaming preview: applies the blocks that
 * match and silently skips the ones that don't (yet). */
export function applySearchReplaceLenient(
  code: string,
  blocks: Array<{ search: string; replace: string }>,
): string {
  let result = code;
  for (const block of blocks) {
    try {
      result = applyOneSearchReplace(result, block);
    } catch {
      // still streaming in, or genuinely unmatched — skip
    }
  }
  return result;
}

/** Strip completed and in-progress search/replace blocks (and their `// filename:`
 * prefix lines) from text for chat display. */
export function stripSearchReplaceBlocks(text: string): string {
  let result = text.replace(
    /(?:^\/\/[ \t]*filename:[ \t]*\S+[ \t]*\n)?^<{3,}[ \t]*SEARCH[ \t]*\n[\s\S]*?\n={3,}[ \t]*\n[\s\S]*?\n>{3,}[ \t]*REPLACE/gm,
    '',
  );
  result = result.replace(/(?:^\/\/[ \t]*filename:[ \t]*\S+[ \t]*\n)?^<{3,}[ \t]*SEARCH[\s\S]*$/m, '');
  // A filename header whose block hasn't started streaming yet.
  result = result.replace(/\n?\/\/[ \t]*filename:[ \t]*\S*[ \t]*$/, '');
  return result.trimEnd();
}

/** Rewrite import specifiers that pointed at `oldName` to `newName`, so imports
 * survive a file rename. Matches './old', 'old' and the extensionless base
 * (e.g. './old' for 'old.ts'). Pure. */
export function updateImportPath(code: string, oldName: string, newName: string): string {
  const oldBase = oldName.replace(/\.(js|ts)$/, '');
  const target = `./${newName}`;
  const matches = (spec: string): boolean => {
    const s = spec.replace(/^\.{0,2}\//, '');
    return s === oldName || s === oldBase;
  };
  code = code.replace(/(\bfrom\s*|\bimport\s+)(['"])([^'"]+)(['"])/g, (m, kw, q1, spec, q2) =>
    matches(spec) ? `${kw}${q1}${target}${q2}` : m,
  );
  code = code.replace(/(\bimport\s*\(\s*)(['"])([^'"]+)(['"])(\s*\))/g, (m, pre, q1, spec, q2, post) =>
    matches(spec) ? `${pre}${q1}${target}${q2}${post}` : m,
  );
  return code;
}

/** Split one code block into per-file sections by `// filename:` headers.
 * Handles both "one file per block" and "several files in one block" (some models
 * emit multiple `// filename:` headers inside a single fence). Leading content
 * before the first header becomes an unnamed section (defaults to sketch.js). */
export function splitFileSections(
  block: string,
): Array<{ name: string | null; isNew: boolean; code: string }> {
  const headerRe = /^\/\/[ \t]*filename:[ \t]*(\S+?)([ \t]+\[NEW FILE\])?[ \t]*$/gm;
  const matches = [...block.matchAll(headerRe)];
  if (matches.length === 0) {
    return [{ name: null, isNew: false, code: block }];
  }
  const sections: Array<{ name: string | null; isNew: boolean; code: string }> = [];
  const firstIdx = matches[0].index ?? 0;
  const lead = block.slice(0, firstIdx);
  if (lead.trim()) {
    sections.push({ name: null, isNew: false, code: lead.replace(/\n\s*$/, '') });
  }
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? block.length) : block.length;
    const code = block.slice(start, end).replace(/^\n/, '').replace(/\n\s*$/, '');
    sections.push({ name: m[1], isNew: !!m[2], code });
  }
  return sections;
}

/**
 * Extract filename header from a code block.
 * Patterns: `// filename: utils.js` or `// filename: particle.js [NEW FILE]`
 * Returns { fileName, isNew, cleanCode } — cleanCode has the header line removed.
 */
export function extractFileName(code: string): { fileName: string | null; isNew: boolean; cleanCode: string } {
  const match = /^\/\/\s*filename:\s*(\S+?)(\s+\[NEW FILE\])?\s*\n/.exec(code);
  if (!match) return { fileName: null, isNew: false, cleanCode: code };
  return {
    fileName: match[1],
    isNew: !!match[2],
    cleanCode: code.slice(match[0].length),
  };
}

/** Top-level symbol names declared in a file (function/class/const/let/var).
 * Heuristic (regex, not a full parser) — used to warn before deleting a file
 * whose symbols other files rely on under global-script concatenation. */
export function declaredSymbols(code: string): string[] {
  const re = /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
  const names = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) names.add(m[1]);
  return [...names];
}

/** Names of other files that reference any symbol declared in `target`.
 * Best-effort: matches declared symbols as whole words in each other file's text. */
export function filesReferencing(
  target: { name: string; content: string },
  others: { name: string; content: string }[],
): string[] {
  // Ignore short names (loop vars like i/x/p) to avoid noisy false positives.
  const symbols = declaredSymbols(target.content).filter((s) => s.length >= 3);
  if (symbols.length === 0) return [];
  const pattern = new RegExp(`\\b(?:${symbols.map(escapeRegExp).join('|')})\\b`);
  return others
    .filter((f) => f.name !== target.name && pattern.test(f.content))
    .map((f) => f.name);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Generate a short human summary of what changed between two code strings. */
export function diffSummary(oldCode: string, newCode: string): string {
  // Ensure both inputs end with a newline: otherwise jsdiff treats an unchanged
  // final line as removed+added whenever anything is appended after it.
  const eol = (s: string) => (s.endsWith('\n') ? s : s + '\n');
  let added = 0;
  let removed = 0;
  for (const part of diffLines(eol(oldCode), eol(newCode))) {
    if (part.added) added += part.count ?? 0;
    else if (part.removed) removed += part.count ?? 0;
  }
  const parts: string[] = [];
  if (added) parts.push(`+${added}`);
  if (removed) parts.push(`-${removed}`);
  if (parts.length === 0) return 'No visible changes';
  return `${parts.join(' / ')} lines`;
}
