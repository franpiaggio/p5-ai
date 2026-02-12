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
