const JS_FENCE_OPEN = /```(?:javascript|js|jsx|typescript|ts|tsx)\s*\n/;

/** Split streaming content into chat text (no code) and code for the editor. */
export function parseStreamContent(content: string) {
  const openMatch = JS_FENCE_OPEN.exec(content);
  if (!openMatch) return { chatContent: content, codeContent: null as string | null };

  const before = content.slice(0, openMatch.index);
  const codeStart = openMatch.index + openMatch[0].length;
  const rest = content.slice(codeStart);
  const closeIdx = rest.indexOf('\n```');

  if (closeIdx === -1) {
    return { chatContent: before.trimEnd(), codeContent: rest };
  }
  const code = rest.slice(0, closeIdx);
  const after = rest.slice(closeIdx + 4); // skip \n```
  return { chatContent: (before + after).trimEnd(), codeContent: code };
}
