import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from './editorStore';
import type { SketchFile } from '../types';

function f(name: string, content: string): SketchFile {
  return { id: name, name, content, language: name.endsWith('.ts') ? 'typescript' : 'javascript' };
}

/** Reset to a known two-file sketch before each test. */
function reset(files: SketchFile[], active = 'sketch.js') {
  const activeFile = files.find((x) => x.name === active) ?? files[0];
  useEditorStore.setState({
    files,
    activeFileName: activeFile.name,
    code: activeFile.content,
  });
}

const s = () => useEditorStore.getState();
const fileNames = () => s().files.map((x) => x.name);
const contentOf = (name: string) => s().files.find((x) => x.name === name)?.content;

describe('editorStore file operations', () => {
  beforeEach(() => {
    reset([
      f('sketch.js', "import { P } from './particle.js';\nfunction setup(){}"),
      f('particle.js', 'export class P {}'),
    ]);
  });

  describe('setCode', () => {
    it('mirrors the active file content', () => {
      s().setCode('function setup(){ createCanvas(1,1); }');
      expect(s().code).toBe('function setup(){ createCanvas(1,1); }');
      expect(contentOf('sketch.js')).toBe('function setup(){ createCanvas(1,1); }');
      // other files untouched
      expect(contentOf('particle.js')).toBe('export class P {}');
    });
  });

  describe('setActiveFile', () => {
    it('switches the code buffer to the selected file', () => {
      s().setActiveFile('particle.js');
      expect(s().activeFileName).toBe('particle.js');
      expect(s().code).toBe('export class P {}');
    });
  });

  describe('addFile', () => {
    it('creates, activates, and empties the buffer', () => {
      s().addFile('utils.js');
      expect(fileNames()).toContain('utils.js');
      expect(s().activeFileName).toBe('utils.js');
      expect(s().code).toBe('');
    });
    it('rejects an invalid extension', () => {
      s().addFile('bad.exe');
      expect(fileNames()).not.toContain('bad.exe');
    });
    it('rejects a duplicate name', () => {
      const before = s().files.length;
      s().addFile('particle.js');
      expect(s().files.length).toBe(before);
    });
  });

  describe('deleteFile', () => {
    it('removes the file and switches active to sketch.js', () => {
      s().setActiveFile('particle.js');
      s().deleteFile('particle.js');
      expect(fileNames()).not.toContain('particle.js');
      expect(s().activeFileName).toBe('sketch.js');
      expect(s().code).toBe(contentOf('sketch.js'));
    });
    it('refuses to delete sketch.js', () => {
      s().deleteFile('sketch.js');
      expect(fileNames()).toContain('sketch.js');
    });
  });

  describe('renameFile', () => {
    it('renames and updates imports in sibling files', () => {
      s().renameFile('particle.js', 'thing.js');
      expect(fileNames()).toContain('thing.js');
      expect(fileNames()).not.toContain('particle.js');
      expect(contentOf('sketch.js')).toContain("from './thing.js'");
    });
    it('updates the code buffer when the active file imports the renamed file', () => {
      s().renameFile('particle.js', 'thing.js');
      // sketch.js is active; its buffer should reflect the updated import
      expect(s().code).toContain("from './thing.js'");
    });
    it('switches active name to the new name when renaming the active file', () => {
      s().setActiveFile('particle.js');
      s().renameFile('particle.js', 'thing.js');
      expect(s().activeFileName).toBe('thing.js');
    });
    it('refuses to rename sketch.js, to a duplicate, or to an invalid name', () => {
      s().renameFile('sketch.js', 'x.js');
      expect(fileNames()).toContain('sketch.js');
      s().renameFile('particle.js', 'sketch.js');
      expect(fileNames()).toContain('particle.js');
      s().renameFile('particle.js', 'bad.exe');
      expect(fileNames()).toContain('particle.js');
    });
  });
});
