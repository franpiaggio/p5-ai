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
