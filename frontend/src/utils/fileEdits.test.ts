import { describe, it, expect } from 'vitest';
import type { SketchFile } from '../types';
import {
  planFileChanges,
  applyChangesToFiles,
  focusAfterChanges,
  presentationFor,
} from './fileEdits';

function file(name: string, content: string): SketchFile {
  return { id: name, name, content, language: name.endsWith('.ts') ? 'typescript' : 'javascript' };
}

const baseFiles = [file('sketch.js', 'function setup() {}')];

describe('planFileChanges', () => {
  it('no code → no changes', () => {
    expect(planFileChanges(baseFiles, 'sketch.js', 'just a question?')).toEqual([]);
  });

  it('single block, no header → change to sketch.js', () => {
    const changes = planFileChanges(baseFiles, 'sketch.js', '```js\nfunction setup() { createCanvas(400,400); }\n```');
    expect(changes).toHaveLength(1);
    expect(changes[0].name).toBe('sketch.js');
    expect(changes[0].isNew).toBe(false);
    expect(changes[0].newContent).toContain('createCanvas');
  });

  it('filters out a no-op edit (same content)', () => {
    const changes = planFileChanges(baseFiles, 'sketch.js', '```js\nfunction setup() {}\n```');
    expect(changes).toEqual([]);
  });

  it('new file via [NEW FILE] header', () => {
    const changes = planFileChanges(baseFiles, 'sketch.js', '```js\n// filename: utils.js [NEW FILE]\nfunction helper() {}\n```');
    expect(changes).toEqual([
      { name: 'utils.js', previousContent: '', newContent: 'function helper() {}', isNew: true },
    ]);
  });

  it('two separate fenced blocks → two changes', () => {
    const md = '```js\n// filename: particle.js [NEW FILE]\nclass Particle {}\n```\n```js\n// filename: sketch.js\nfunction setup() { new Particle(); }\n```';
    const changes = planFileChanges(baseFiles, 'sketch.js', md);
    expect(changes.map((c) => c.name)).toEqual(['particle.js', 'sketch.js']);
    expect(changes.find((c) => c.name === 'particle.js')!.isNew).toBe(true);
  });

  it('several files inside one fenced block', () => {
    const md = '```js\n// filename: a.js [NEW FILE]\nconst A=1;\n// filename: b.js [NEW FILE]\nconst B=2;\n```';
    const changes = planFileChanges(baseFiles, 'sketch.js', md);
    expect(changes.map((c) => c.name)).toEqual(['a.js', 'b.js']);
  });

  it('rejects an invalid new filename', () => {
    const changes = planFileChanges(baseFiles, 'sketch.js', '```js\n// filename: evil.exe [NEW FILE]\nx\n```');
    expect(changes).toEqual([]);
  });

  it('search/replace targets the active file', () => {
    const files = [file('sketch.js', 'before\nold\nafter')];
    const changes = planFileChanges(files, 'sketch.js', '<<<SEARCH\nold\n===\nnew\n>>>REPLACE');
    expect(changes).toEqual([
      { name: 'sketch.js', previousContent: 'before\nold\nafter', newContent: 'before\nnew\nafter', isNew: false },
    ]);
  });
});

describe('presentationFor', () => {
  const c = (name: string, isNew = false) => ({ name, previousContent: '', newContent: 'x', isNew });

  it('none when empty', () => {
    expect(presentationFor([], 'sketch.js')).toBe('none');
  });
  it('diff for a single edit to the active file', () => {
    expect(presentationFor([c('sketch.js')], 'sketch.js')).toBe('diff');
  });
  it('apply for a new file', () => {
    expect(presentationFor([c('utils.js', true)], 'sketch.js')).toBe('apply');
  });
  it('apply for an edit to a non-active file', () => {
    expect(presentationFor([c('utils.js')], 'sketch.js')).toBe('apply');
  });
  it('apply for multiple files', () => {
    expect(presentationFor([c('sketch.js'), c('utils.js')], 'sketch.js')).toBe('apply');
  });
});

describe('applyChangesToFiles', () => {
  it('updates existing and creates new files', () => {
    const files = [file('sketch.js', 'old')];
    const next = applyChangesToFiles(files, [
      { name: 'sketch.js', previousContent: 'old', newContent: 'updated', isNew: false },
      { name: 'particle.js', previousContent: '', newContent: 'class P {}', isNew: true },
    ]);
    expect(next.map((f) => f.name)).toEqual(['sketch.js', 'particle.js']);
    expect(next.find((f) => f.name === 'sketch.js')!.content).toBe('updated');
    expect(next.find((f) => f.name === 'particle.js')!.language).toBe('javascript');
  });

  it('does not mutate the input array', () => {
    const files = [file('sketch.js', 'old')];
    applyChangesToFiles(files, [{ name: 'sketch.js', previousContent: 'old', newContent: 'new', isNew: false }]);
    expect(files[0].content).toBe('old');
  });
});

describe('focusAfterChanges', () => {
  it('prefers sketch.js when present', () => {
    expect(focusAfterChanges(
      [{ name: 'particle.js', previousContent: '', newContent: 'x', isNew: true },
       { name: 'sketch.js', previousContent: 'a', newContent: 'b', isNew: false }],
      'other.js',
    )).toBe('sketch.js');
  });

  it('falls back to the first change otherwise', () => {
    expect(focusAfterChanges(
      [{ name: 'particle.js', previousContent: '', newContent: 'x', isNew: true }],
      'other.js',
    )).toBe('particle.js');
  });

  it('uses the fallback when there are no changes', () => {
    expect(focusAfterChanges([], 'sketch.js')).toBe('sketch.js');
  });
});
