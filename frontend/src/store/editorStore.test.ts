// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from './editorStore';
import type { SketchFile } from '../types';

const initialState = useEditorStore.getState();
const PERSIST_KEY = 'p5-ai-editor';

const readPersisted = () => {
  const raw = localStorage.getItem(PERSIST_KEY);
  if (!raw) throw new Error('nothing persisted');
  return JSON.parse(raw).state;
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useEditorStore.setState(initialState, true);
});

describe('pending diff flow (accept / reject)', () => {
  const originalCode = 'function draw() {\n  background(30);\n}';
  const suggestedCode = 'function draw() {\n  background(200, 80, 15);\n}';

  beforeEach(() => {
    useEditorStore.setState({ code: originalCode });
    useEditorStore.getState().setPendingDiff({
      code: suggestedCode,
      messageId: 'msg-1',
      blockKey: 'block-1',
      prompt: 'make it warmer',
    });
  });

  it('setPendingDiff applies the suggestion immediately and remembers the previous code', () => {
    const s = useEditorStore.getState();
    expect(s.code).toBe(suggestedCode);
    expect(s.pendingDiff?.previousCode).toBe(originalCode);
  });

  it('accept records a history entry and marks the block applied', () => {
    useEditorStore.getState().acceptPendingDiff();
    const s = useEditorStore.getState();

    expect(s.pendingDiff).toBeNull();
    expect(s.code).toBe(suggestedCode);
    expect(s.appliedBlocks['block-1']).toBe(true);
    expect(s.codeHistory).toHaveLength(1);
    expect(s.codeHistory[0]).toMatchObject({
      previousCode: originalCode,
      newCode: suggestedCode,
      messageId: 'msg-1',
      prompt: 'make it warmer',
    });
  });

  it('reject restores the previous code and marks the block rejected', () => {
    useEditorStore.getState().rejectPendingDiff();
    const s = useEditorStore.getState();

    expect(s.pendingDiff).toBeNull();
    expect(s.code).toBe(originalCode);
    expect(s.rejectedBlocks['block-1']).toBe(true);
    expect(s.codeHistory).toHaveLength(0);
  });

  it('accepting twice does not duplicate history entries', () => {
    const { acceptPendingDiff } = useEditorStore.getState();
    acceptPendingDiff();
    acceptPendingDiff();
    expect(useEditorStore.getState().codeHistory).toHaveLength(1);
  });
});

describe('applyCodeFromChat', () => {
  it('swaps the code and records the change', () => {
    useEditorStore.setState({ code: 'old();' });
    useEditorStore.getState().applyCodeFromChat('msg-9', 'new();', 'key-9');
    const s = useEditorStore.getState();

    expect(s.code).toBe('new();');
    expect(s.appliedBlocks['key-9']).toBe(true);
    expect(s.codeHistory[0]).toMatchObject({ previousCode: 'old();', newCode: 'new();' });
  });
});

describe('provider keys and llmConfig', () => {
  it('switching provider picks up that provider\'s stored key', () => {
    const s = useEditorStore.getState();
    s.setProviderKey('openai', 'sk-openai');
    s.setLLMConfig({ provider: 'openai', model: 'gpt-4o' });
    expect(useEditorStore.getState().llmConfig.apiKey).toBe('sk-openai');

    useEditorStore.getState().setLLMConfig({ provider: 'demo' });
    expect(useEditorStore.getState().llmConfig.apiKey).toBe('');
  });

  it('setting a key for the active provider updates the live config', () => {
    useEditorStore.getState().setLLMConfig({ provider: 'anthropic' });
    useEditorStore.getState().setProviderKey('anthropic', 'sk-ant');
    expect(useEditorStore.getState().llmConfig.apiKey).toBe('sk-ant');
  });

  it('clearing the active provider key blanks the live config key', () => {
    const s = useEditorStore.getState();
    s.setLLMConfig({ provider: 'anthropic' });
    s.setProviderKey('anthropic', 'sk-ant');
    useEditorStore.getState().clearProviderKey('anthropic');
    expect(useEditorStore.getState().llmConfig.apiKey).toBe('');
    expect(useEditorStore.getState().providerKeys.anthropic).toBeUndefined();
  });
});

describe('persistence (partialize)', () => {
  it('never writes API keys to localStorage', () => {
    const s = useEditorStore.getState();
    s.setProviderKey('openai', 'sk-super-secret');
    s.setLLMConfig({ provider: 'openai' });

    const raw = localStorage.getItem(PERSIST_KEY)!;
    expect(raw).not.toContain('sk-super-secret');
    const persisted = readPersisted();
    expect(persisted.llmConfig.apiKey).toBe('');
    expect(persisted.providerKeys).toBeUndefined();
  });

  it('does not persist chat messages', () => {
    useEditorStore.getState().addMessage({ role: 'user', content: 'hello' });
    expect(readPersisted().messages).toBeUndefined();
  });

  it('caps persisted code history at 20 entries while keeping the full history in memory', () => {
    const { applyCodeFromChat } = useEditorStore.getState();
    for (let i = 0; i < 25; i++) applyCodeFromChat(`msg-${i}`, `code-${i};`);

    expect(useEditorStore.getState().codeHistory).toHaveLength(25);
    const persisted = readPersisted();
    expect(persisted.codeHistory).toHaveLength(20);
    expect(persisted.codeHistory[19].newCode).toBe('code-24;');
  });
});

describe('rehydration', () => {
  const seed = (state: Record<string, unknown>) => {
    localStorage.setItem(PERSIST_KEY, JSON.stringify({ state, version: 0 }));
  };

  it('restores session keys and derives the active apiKey', async () => {
    sessionStorage.setItem('p5-ai-editor-keys', JSON.stringify({ openai: 'sk-session' }));
    seed({ llmConfig: { provider: 'openai', model: 'gpt-4o', apiKey: '' } });

    await useEditorStore.persist.rehydrate();

    const s = useEditorStore.getState();
    expect(s.providerKeys.openai).toBe('sk-session');
    expect(s.llmConfig.apiKey).toBe('sk-session');
  });

  it('migrates the legacy single-key storage to the per-provider map', async () => {
    sessionStorage.setItem('p5-ai-editor-key', 'sk-legacy');
    seed({ llmConfig: { provider: 'anthropic', model: 'claude', apiKey: '' } });

    await useEditorStore.persist.rehydrate();

    expect(useEditorStore.getState().providerKeys.anthropic).toBe('sk-legacy');
    expect(sessionStorage.getItem('p5-ai-editor-key')).toBeNull();
    expect(JSON.parse(sessionStorage.getItem('p5-ai-editor-keys')!)).toEqual({
      anthropic: 'sk-legacy',
    });
  });

  it('keeps unsaved scratchpad work after a reload', async () => {
    seed({ sketchId: null, code: 'my unsaved masterpiece;' });

    await useEditorStore.persist.rehydrate();

    const s = useEditorStore.getState();
    expect(s.code).toBe('my unsaved masterpiece;');
    expect(s.lastSavedCode).toBe('my unsaved masterpiece;');
    expect(s.showSuggestion).toBe(false);
  });

  it('resets a saved sketch to its last saved version when autosave is off', async () => {
    seed({
      sketchId: 'sk-1',
      autoSave: false,
      code: 'dirty edits;',
      lastSavedCode: 'saved version;',
      codeHistory: [{ id: 'c1' }],
    });

    await useEditorStore.persist.rehydrate();

    const s = useEditorStore.getState();
    expect(s.code).toBe('saved version;');
    expect(s.codeHistory).toEqual([]);
    expect(s.showSuggestion).toBe(false);
  });

  it('keeps dirty edits of a saved sketch when autosave is on', async () => {
    seed({
      sketchId: 'sk-1',
      autoSave: true,
      code: 'dirty edits;',
      lastSavedCode: 'saved version;',
    });

    await useEditorStore.persist.rehydrate();

    expect(useEditorStore.getState().code).toBe('dirty edits;');
  });

  it('migrates legacy theme names', async () => {
    seed({ appTheme: 'dark' });
    await useEditorStore.persist.rehydrate();
    expect(useEditorStore.getState().appTheme).toBe('darkroom');
  });
});

describe('newSketch', () => {
  it('resets code, chat and history but keeps provider config', () => {
    const s = useEditorStore.getState();
    s.setProviderKey('openai', 'sk-x');
    s.setLLMConfig({ provider: 'openai' });
    s.applyCodeFromChat('m1', 'custom();');
    s.addMessage({ role: 'user', content: 'hi' });
    useEditorStore.getState().setSketchMeta('sk-1', 'My piece');

    useEditorStore.getState().newSketch();

    const after = useEditorStore.getState();
    expect(after.code).toBe(initialState.code);
    expect(after.sketchId).toBeNull();
    expect(after.messages).toEqual([]);
    expect(after.codeHistory).toEqual([]);
    expect(after.llmConfig.apiKey).toBe('sk-x');
  });
});

// --- Multi-file: file operations ---

function f(name: string, content: string): SketchFile {
  return { id: name, name, content, language: name.endsWith('.ts') ? 'typescript' : 'javascript' };
}

function seedFiles(files: SketchFile[], active = 'sketch.js') {
  const activeFile = files.find((x) => x.name === active) ?? files[0];
  useEditorStore.setState({ files, activeFileName: activeFile.name, code: activeFile.content });
}

const store = () => useEditorStore.getState();
const names = () => store().files.map((x) => x.name);
const contentOf = (name: string) => store().files.find((x) => x.name === name)?.content;

describe('file operations', () => {
  beforeEach(() => {
    seedFiles([
      f('sketch.js', "import { P } from './particle.js';\nfunction setup(){}"),
      f('particle.js', 'export class P {}'),
    ]);
  });

  it('setCode mirrors the active file and leaves others untouched', () => {
    store().setCode('function setup(){ createCanvas(1,1); }');
    expect(store().code).toBe('function setup(){ createCanvas(1,1); }');
    expect(contentOf('sketch.js')).toBe('function setup(){ createCanvas(1,1); }');
    expect(contentOf('particle.js')).toBe('export class P {}');
  });

  it('setActiveFile switches the code buffer', () => {
    store().setActiveFile('particle.js');
    expect(store().activeFileName).toBe('particle.js');
    expect(store().code).toBe('export class P {}');
  });

  it('addFile creates, activates and empties the buffer', () => {
    store().addFile('utils.js');
    expect(names()).toContain('utils.js');
    expect(store().activeFileName).toBe('utils.js');
    expect(store().code).toBe('');
  });

  it('addFile rejects invalid extension and duplicates', () => {
    store().addFile('bad.exe');
    expect(names()).not.toContain('bad.exe');
    const before = store().files.length;
    store().addFile('particle.js');
    expect(store().files.length).toBe(before);
  });

  it('deleteFile removes and switches active to sketch.js; refuses sketch.js', () => {
    store().setActiveFile('particle.js');
    store().deleteFile('particle.js');
    expect(names()).not.toContain('particle.js');
    expect(store().activeFileName).toBe('sketch.js');
    expect(store().code).toBe(contentOf('sketch.js'));
    store().deleteFile('sketch.js');
    expect(names()).toContain('sketch.js');
  });

  it('renameFile renames and updates imports in sibling files', () => {
    store().renameFile('particle.js', 'thing.js');
    expect(names()).toContain('thing.js');
    expect(names()).not.toContain('particle.js');
    expect(contentOf('sketch.js')).toContain("from './thing.js'");
    expect(store().code).toContain("from './thing.js'");
  });

  it('renameFile updates active name and refuses invalid/duplicate/sketch.js', () => {
    store().setActiveFile('particle.js');
    store().renameFile('particle.js', 'thing.js');
    expect(store().activeFileName).toBe('thing.js');
    store().renameFile('sketch.js', 'x.js');
    expect(names()).toContain('sketch.js');
    store().renameFile('thing.js', 'sketch.js');
    expect(names()).toContain('thing.js');
    store().renameFile('thing.js', 'bad.exe');
    expect(names()).toContain('thing.js');
  });

  it('refuses renaming a file to the other entry alias (sketch.ts)', () => {
    store().renameFile('particle.js', 'sketch.ts');
    expect(names()).toContain('particle.js');
    expect(names()).not.toContain('sketch.ts');
  });

  it('refuses adding a second entry-like file', () => {
    store().addFile('sketch.ts');
    expect(names()).not.toContain('sketch.ts');
  });
});

describe('editor tabs (openFiles / closeTab)', () => {
  beforeEach(() => {
    seedFiles([
      f('sketch.js', 'function setup(){}'),
      f('particle.js', 'class P {}'),
      f('palette.js', 'const HUES = [];'),
    ]);
  });

  it('setActiveFile opens a tab for the file', () => {
    store().setActiveFile('particle.js');
    expect(store().openFiles).toContain('particle.js');
    store().setActiveFile('particle.js');
    expect(store().openFiles.filter((n) => n === 'particle.js')).toHaveLength(1);
  });

  it('closing a non-active tab keeps the active file', () => {
    store().setActiveFile('particle.js');
    store().setActiveFile('sketch.js');
    store().closeTab('particle.js');
    expect(store().openFiles).not.toContain('particle.js');
    expect(store().activeFileName).toBe('sketch.js');
    // The file itself still exists — closing a tab never deletes.
    expect(names()).toContain('particle.js');
  });

  it('closing the active tab activates its neighbor', () => {
    store().setActiveFile('particle.js');
    store().setActiveFile('palette.js');
    store().closeTab('palette.js');
    expect(store().activeFileName).toBe('particle.js');
    expect(store().code).toBe('class P {}');
  });

  it('the last remaining tab cannot be closed', () => {
    store().closeTab('sketch.js');
    expect(store().openFiles).toEqual(['sketch.js']);
    expect(store().activeFileName).toBe('sketch.js');
  });

  it('deleting a file also closes its tab', () => {
    store().setActiveFile('particle.js');
    store().deleteFile('particle.js');
    expect(store().openFiles).not.toContain('particle.js');
  });

  it('renaming a file renames its tab', () => {
    store().setActiveFile('particle.js');
    store().renameFile('particle.js', 'thing.js');
    expect(store().openFiles).toContain('thing.js');
    expect(store().openFiles).not.toContain('particle.js');
  });
});

describe('setEditorLanguage entry-file migration', () => {
  beforeEach(() => {
    seedFiles([
      f('sketch.js', "import { P } from './sketch-helpers.js';\nfunction setup(){}"),
      f('helpers.js', "import { setup } from './sketch.js';"),
    ]);
  });

  it('switching to TypeScript renames sketch.js → sketch.ts and updates imports', () => {
    store().setEditorLanguage('typescript');
    const s = store();
    expect(s.editorLanguage).toBe('typescript');
    expect(names()).toContain('sketch.ts');
    expect(names()).not.toContain('sketch.js');
    expect(s.files.find((x) => x.name === 'sketch.ts')!.language).toBe('typescript');
    expect(contentOf('helpers.js')).toContain("from './sketch.ts'");
    expect(s.activeFileName).toBe('sketch.ts');
    expect(s.openFiles).toContain('sketch.ts');
    expect(s.openFiles).not.toContain('sketch.js');
  });

  it('switching back to JavaScript restores sketch.js', () => {
    store().setEditorLanguage('typescript');
    store().setEditorLanguage('javascript');
    expect(names()).toContain('sketch.js');
    expect(names()).not.toContain('sketch.ts');
  });

  it('is a no-op on the files when the entry already matches', () => {
    const before = store().files;
    store().setEditorLanguage('javascript');
    expect(store().files).toBe(before);
  });

  it('entry guards follow the extension: sketch.ts cannot be deleted or renamed', () => {
    store().setEditorLanguage('typescript');
    store().deleteFile('sketch.ts');
    expect(names()).toContain('sketch.ts');
    store().renameFile('sketch.ts', 'main.ts');
    expect(names()).toContain('sketch.ts');
  });
});

describe('multi-file review (accept / reject / accept all)', () => {
  const review = () => store().pendingFilesReview;

  beforeEach(() => {
    // Simulate what ChatPanel does for 'apply' mode: changes already applied.
    seedFiles([
      f('sketch.js', 'new sketch code'),
      f('particle.js', 'new particle code'),
    ]);
    useEditorStore.setState({
      openFiles: ['sketch.js', 'particle.js'],
      pendingFilesReview: {
        changes: [
          { name: 'sketch.js', previousContent: 'old sketch code', newContent: 'new sketch code', isNew: false },
          { name: 'particle.js', previousContent: '', newContent: 'new particle code', isNew: true },
        ],
        index: 0,
        accepted: 0,
        messageId: 'msg-1',
        prompt: 'split into files',
        blockKeys: ['msg-1:k1', 'msg-1:k2'],
      },
    });
  });

  it('accept records history and advances to the next file', () => {
    store().acceptReviewFile();
    const s = store();
    expect(s.codeHistory).toHaveLength(1);
    expect(s.codeHistory[0]).toMatchObject({
      fileName: 'sketch.js',
      previousCode: 'old sketch code',
      newCode: 'new sketch code',
      prompt: 'split into files',
    });
    expect(review()!.index).toBe(1);
    expect(s.activeFileName).toBe('particle.js');
    expect(s.code).toBe('new particle code');
  });

  it('accepting the last file finishes the review and marks blocks applied', () => {
    store().acceptReviewFile();
    store().acceptReviewFile();
    const s = store();
    expect(s.pendingFilesReview).toBeNull();
    expect(s.codeHistory).toHaveLength(2);
    expect(s.appliedBlocks['msg-1:k1']).toBe(true);
    expect(s.appliedBlocks['msg-1:k2']).toBe(true);
  });

  it('rejecting an edited file restores its previous content without history', () => {
    store().rejectReviewFile();
    const s = store();
    expect(contentOf('sketch.js')).toBe('old sketch code');
    expect(s.codeHistory).toHaveLength(0);
    expect(review()!.index).toBe(1);
  });

  it('rejecting a new file removes it (and its tab)', () => {
    store().acceptReviewFile(); // accept sketch.js, now reviewing particle.js
    store().rejectReviewFile();
    const s = store();
    expect(names()).not.toContain('particle.js');
    expect(s.openFiles).not.toContain('particle.js');
    expect(s.pendingFilesReview).toBeNull();
    // Something was accepted → blocks count as applied.
    expect(s.appliedBlocks['msg-1:k1']).toBe(true);
    // Active file fell back to the entry after the reviewed file disappeared.
    expect(s.activeFileName).toBe('sketch.js');
  });

  it('rejecting everything marks the blocks rejected, not applied', () => {
    store().rejectReviewFile();
    store().rejectReviewFile();
    const s = store();
    expect(s.pendingFilesReview).toBeNull();
    expect(s.rejectedBlocks['msg-1:k1']).toBe(true);
    expect(s.appliedBlocks['msg-1:k1']).toBeUndefined();
    expect(names()).not.toContain('particle.js');
    expect(contentOf('sketch.js')).toBe('old sketch code');
  });

  it('accept all records history for every remaining file and finishes', () => {
    store().acceptAllReviewFiles();
    const s = store();
    expect(s.pendingFilesReview).toBeNull();
    expect(s.codeHistory).toHaveLength(2);
    expect(s.codeHistory.map((c) => c.fileName)).toEqual(['sketch.js', 'particle.js']);
    expect(s.appliedBlocks['msg-1:k1']).toBe(true);
  });
});
