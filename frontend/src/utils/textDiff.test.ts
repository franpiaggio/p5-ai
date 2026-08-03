import { describe, it, expect } from 'vitest';
import { computeMinimalEdit } from './textDiff';

function apply(oldText: string, newText: string): string {
  const edit = computeMinimalEdit(oldText, newText);
  if (edit === null) return oldText;
  return oldText.slice(0, edit.start) + edit.text + oldText.slice(edit.oldEnd);
}

describe('computeMinimalEdit', () => {
  it('returns null for identical texts', () => {
    expect(computeMinimalEdit('abc', 'abc')).toBeNull();
    expect(computeMinimalEdit('', '')).toBeNull();
  });

  it('handles a pure append (streaming tail)', () => {
    const edit = computeMinimalEdit('function draw() {', 'function draw() {\n  background(0);');
    expect(edit).toEqual({ start: 17, oldEnd: 17, text: '\n  background(0);' });
  });

  it('handles a mid-text change', () => {
    const edit = computeMinimalEdit('let x = 1;\nlet y = 2;', 'let x = 42;\nlet y = 2;');
    expect(edit).not.toBeNull();
    expect(apply('let x = 1;\nlet y = 2;', 'let x = 42;\nlet y = 2;')).toBe('let x = 42;\nlet y = 2;');
  });

  it('handles deletion', () => {
    expect(apply('abcdef', 'abef')).toBe('abef');
    expect(apply('abc', '')).toBe('');
  });

  it('handles insertion into empty text', () => {
    expect(apply('', 'hello')).toBe('hello');
  });

  it('handles full replacement with no overlap', () => {
    expect(apply('xxxx', 'yyy')).toBe('yyy');
  });

  it('round-trips when prefix and suffix overlap (repeated chars)', () => {
    expect(apply('aaa', 'aaaa')).toBe('aaaa');
    expect(apply('aaaa', 'aaa')).toBe('aaa');
    expect(apply('abab', 'ababab')).toBe('ababab');
  });
});
