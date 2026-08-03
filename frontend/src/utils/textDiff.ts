// Minimal single-range edit that turns oldText into newText, found by trimming
// the common prefix and suffix. Applying this instead of replacing the whole
// buffer keeps Monaco model decorations (e.g. diff highlights) alive across
// streaming updates.
export interface MinimalEdit {
  /** Offset where the differing region starts (in both texts). */
  start: number;
  /** Offset (exclusive) where the differing region ends in oldText. */
  oldEnd: number;
  /** Replacement text for the differing region. */
  text: string;
}

export function computeMinimalEdit(oldText: string, newText: string): MinimalEdit | null {
  if (oldText === newText) return null;

  let start = 0;
  const maxStart = Math.min(oldText.length, newText.length);
  while (start < maxStart && oldText[start] === newText[start]) start++;

  let oldEnd = oldText.length;
  let newEnd = newText.length;
  while (oldEnd > start && newEnd > start && oldText[oldEnd - 1] === newText[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }

  return { start, oldEnd, text: newText.slice(start, newEnd) };
}
