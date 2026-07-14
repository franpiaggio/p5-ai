// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from './editorStore';

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
