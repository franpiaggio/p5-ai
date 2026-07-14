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

/** Parse all <<<SEARCH ... === ... >>>REPLACE blocks from markdown. Returns null if none found. */
export function extractSearchReplaceBlocks(
  markdown: string,
): Array<{ search: string; replace: string }> | null {
  const blocks: Array<{ search: string; replace: string }> = [];
  const regex = /<<<SEARCH\n([\s\S]*?)\n===\n([\s\S]*?)\n>>>REPLACE/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    blocks.push({ search: match[1], replace: match[2] });
  }
  return blocks.length > 0 ? blocks : null;
}

/** Apply search/replace blocks sequentially to code. Throws if a search string isn't found. */
export function applySearchReplace(
  code: string,
  blocks: Array<{ search: string; replace: string }>,
): string {
  let result = code;
  for (const block of blocks) {
    const idx = result.indexOf(block.search);
    if (idx === -1) {
      throw new Error(`Search block not found in code:\n${block.search.slice(0, 80)}...`);
    }
    result = result.slice(0, idx) + block.replace + result.slice(idx + block.search.length);
  }
  return result;
}

/** Strip completed and in-progress search/replace blocks from text for chat display. */
export function stripSearchReplaceBlocks(text: string): string {
  let result = text.replace(/<<<SEARCH\n[\s\S]*?\n===\n[\s\S]*?\n>>>REPLACE/g, '');
  result = result.replace(/<<<SEARCH[\s\S]*$/, '');
  return result.trimEnd();
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

/**
 * Extract filename from a search/replace block text that starts with `// filename: ...`.
 * Returns fileName or null if no filename header.
 */
export function extractSearchReplaceFileName(blockText: string): string | null {
  const match = /^\/\/\s*filename:\s*(\S+)\s*\n/.exec(blockText);
  return match ? match[1] : null;
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
  const symbols = declaredSymbols(target.content);
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
  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);
  let added = 0;
  let removed = 0;
  for (const l of newLines) if (!oldSet.has(l)) added++;
  for (const l of oldLines) if (!newSet.has(l)) removed++;
  const parts: string[] = [];
  if (added) parts.push(`+${added}`);
  if (removed) parts.push(`-${removed}`);
  if (parts.length === 0) return 'No visible changes';
  return `${parts.join(' / ')} lines`;
}
