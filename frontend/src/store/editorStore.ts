import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message, ConsoleLog, LLMConfig, TabType, EditorError, CodeChange, ProviderKeys } from '../types';

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
function diffSummary(oldCode: string, newCode: string): string {
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

export type EditorLanguage = 'javascript' | 'typescript';

export interface PendingDiff {
  code: string;
  previousCode: string;
  messageId: string;
  blockKey: string;
  prompt?: string;
  isRestore?: boolean;
}

const DEFAULT_CODE = `function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(220);
  circle(mouseX, mouseY, 50);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`;

interface EditorState {
  code: string;
  isRunning: boolean;
  runTrigger: number;
  activeTab: TabType;
  messages: Message[];
  consoleLogs: ConsoleLog[];
  editorErrors: EditorError[];
  llmConfig: LLMConfig;
  isSettingsOpen: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  codeHistory: CodeChange[];
  appliedBlocks: Record<string, true>;
  pendingDiff: PendingDiff | null;
  previewCode: { code: string; entryId: string } | null;
  autoApply: boolean;
  sketchId: string | null;
  sketchTitle: string;
  fixRequest: string | null;
  editorTheme: string;
  editorLanguage: EditorLanguage;
  transpiler: ((code: string) => Promise<string>) | null;
  currentPage: 'editor' | 'sketches';
  providerKeys: ProviderKeys;
  storeApiKeys: boolean;
  streamingCode: string | null;

  setCode: (code: string) => void;
  setIsRunning: (running: boolean) => void;
  runSketch: () => void;
  setActiveTab: (tab: TabType) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  addConsoleLog: (log: Omit<ConsoleLog, 'id' | 'timestamp'>) => void;
  clearConsoleLogs: () => void;
  addEditorError: (error: EditorError) => void;
  clearEditorErrors: () => void;
  setLLMConfig: (config: Partial<LLMConfig>) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setIsStreaming: (streaming: boolean) => void;
  setAutoApply: (auto: boolean) => void;
  clearMessages: () => void;
  setPendingDiff: (diff: Omit<PendingDiff, 'previousCode'> | null) => void;
  acceptPendingDiff: () => void;
  rejectPendingDiff: () => void;
  applyCodeFromChat: (messageId: string, newCode: string, blockKey?: string) => void;
  setPreviewCode: (preview: { code: string; entryId: string } | null) => void;
  clearCodeHistory: () => void;
  setSketchTitle: (title: string) => void;
  setSketchMeta: (id: string | null, title: string) => void;
  newSketch: () => void;
  setFixRequest: (request: string | null) => void;
  setEditorTheme: (theme: string) => void;
  setEditorLanguage: (language: EditorLanguage) => void;
  setTranspiler: (transpiler: ((code: string) => Promise<string>) | null) => void;
  setCurrentPage: (page: 'editor' | 'sketches') => void;
  setProviderKey: (provider: LLMConfig['provider'], key: string) => void;
  clearProviderKey: (provider: LLMConfig['provider']) => void;
  setStoreApiKeys: (store: boolean) => void;
  setStreamingCode: (code: string | null) => void;
}

let logCounter = 0;
let msgCounter = 0;
let changeCounter = 0;

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
      code: DEFAULT_CODE,
      isRunning: false,
      runTrigger: 0,
      activeTab: 'chat',
      messages: [],
      consoleLogs: [],
      editorErrors: [],
      llmConfig: {
        provider: 'demo',
        model: 'llama-3.3-70b-versatile',
        apiKey: '',
      },
      isSettingsOpen: false,
      isLoading: false,
      isStreaming: false,
      codeHistory: [],
      appliedBlocks: {},
      pendingDiff: null,
      previewCode: null,
      autoApply: true,
      sketchId: null,
      sketchTitle: 'Untitled Sketch',
      fixRequest: null,
      editorTheme: 'p5-dark',
      editorLanguage: 'javascript' as EditorLanguage,
      transpiler: null,
      currentPage: 'editor' as const,
      providerKeys: {} as ProviderKeys,
      storeApiKeys: false,
      streamingCode: null,

      setCode: (code) =>
        set((state) => ({
          code,
          ...(state.previewCode ? { previewCode: null, isRunning: true, runTrigger: state.runTrigger + 1 } : {}),
        })),
      setIsRunning: (isRunning) => set({ isRunning }),
      runSketch: () => set((state) => ({ isRunning: true, runTrigger: state.runTrigger + 1, previewCode: null })),
      setActiveTab: (activeTab) => set({ activeTab }),

      addMessage: (message) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...message,
              id: `msg-${++msgCounter}-${Date.now()}`,
              timestamp: Date.now(),
            },
          ],
        })),

      addConsoleLog: (log) =>
        set((state) => ({
          consoleLogs: [
            ...state.consoleLogs,
            {
              ...log,
              id: `log-${++logCounter}-${Date.now()}`,
              timestamp: Date.now(),
            },
          ],
        })),

      clearConsoleLogs: () => set({ consoleLogs: [], editorErrors: [] }),

      addEditorError: (error) =>
        set((state) => ({
          editorErrors: [...state.editorErrors, error],
        })),

      clearEditorErrors: () => set({ editorErrors: [] }),

      setLLMConfig: (config) =>
        set((state) => {
          const merged = { ...state.llmConfig, ...config };
          // When provider changes, derive apiKey from providerKeys
          if (config.provider && config.provider !== state.llmConfig.provider && !('apiKey' in config)) {
            merged.apiKey = state.providerKeys[config.provider] ?? '';
          }
          return { llmConfig: merged };
        }),

      setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setIsStreaming: (isStreaming) => set({ isStreaming }),
      setAutoApply: (autoApply) => set({ autoApply }),
      clearMessages: () => set({ messages: [], appliedBlocks: {} }),

      setPendingDiff: (pendingDiff) =>
        set((state) => ({
          pendingDiff: pendingDiff
            ? { ...pendingDiff, previousCode: state.code }
            : null,
          previewCode: null,
          ...(pendingDiff
            ? { code: pendingDiff.code, isRunning: true, runTrigger: state.runTrigger + 1 }
            : {}),
        })),
      rejectPendingDiff: () =>
        set((state) => {
          if (!state.pendingDiff) return { pendingDiff: null };
          return {
            code: state.pendingDiff.previousCode,
            pendingDiff: null,
            isRunning: true,
            runTrigger: state.runTrigger + 1,
          };
        }),
      acceptPendingDiff: () =>
        set((state) => {
          if (!state.pendingDiff) return state;
          const { previousCode, messageId, blockKey, isRestore, prompt } = state.pendingDiff;
          return {
            codeHistory: [
              ...state.codeHistory,
              {
                id: `change-${++changeCounter}-${Date.now()}`,
                messageId,
                timestamp: Date.now(),
                previousCode,
                newCode: state.code,
                summary: diffSummary(previousCode, state.code),
                ...(prompt ? { prompt } : {}),
                ...(isRestore ? { isRestore: true } : {}),
              },
            ],
            pendingDiff: null,
            appliedBlocks: blockKey
              ? { ...state.appliedBlocks, [blockKey]: true as const }
              : state.appliedBlocks,
          };
        }),

      applyCodeFromChat: (messageId, newCode, blockKey) =>
        set((state) => ({
          codeHistory: [
            ...state.codeHistory,
            {
              id: `change-${++changeCounter}-${Date.now()}`,
              messageId,
              timestamp: Date.now(),
              previousCode: state.code,
              newCode,
              summary: diffSummary(state.code, newCode),
            },
          ],
          code: newCode,
          appliedBlocks: blockKey
            ? { ...state.appliedBlocks, [blockKey]: true as const }
            : state.appliedBlocks,
        })),


      setPreviewCode: (previewCode) =>
        set((state) => ({
          previewCode,
          ...(previewCode ? { isRunning: true, runTrigger: state.runTrigger + 1 } : { isRunning: true, runTrigger: state.runTrigger + 1 }),
        })),

      clearCodeHistory: () => set({ codeHistory: [] }),

      setSketchTitle: (sketchTitle) => set({ sketchTitle }),
      setSketchMeta: (sketchId, sketchTitle) => set({ sketchId, sketchTitle }),
      setFixRequest: (fixRequest) => set({ fixRequest }),
      setEditorTheme: (editorTheme) => set({ editorTheme }),
      setEditorLanguage: (editorLanguage) => set({ editorLanguage }),
      setTranspiler: (transpiler) => set({ transpiler }),
      setCurrentPage: (currentPage) => set({ currentPage }),
      setProviderKey: (provider, key) =>
        set((state) => {
          const providerKeys = { ...state.providerKeys, [provider]: key };
          const apiKey = state.llmConfig.provider === provider ? key : state.llmConfig.apiKey;
          return { providerKeys, llmConfig: { ...state.llmConfig, apiKey } };
        }),
      clearProviderKey: (provider) =>
        set((state) => {
          const providerKeys = { ...state.providerKeys };
          delete providerKeys[provider];
          const apiKey = state.llmConfig.provider === provider ? '' : state.llmConfig.apiKey;
          return { providerKeys, llmConfig: { ...state.llmConfig, apiKey } };
        }),
      setStoreApiKeys: (storeApiKeys) => set({ storeApiKeys }),
      setStreamingCode: (streamingCode) => set({ streamingCode }),
      newSketch: () =>
        set((state) => ({
          code: DEFAULT_CODE,
          sketchId: null,
          sketchTitle: 'Untitled Sketch',
          messages: [],
          codeHistory: [],
          appliedBlocks: {},
          pendingDiff: null,
          previewCode: null,
          consoleLogs: [],
          editorErrors: [],
          isRunning: true,
          runTrigger: state.runTrigger + 1,
        })),
    }),
    {
      name: 'p5-ai-editor',
      partialize: (state) => ({
        code: state.code,
        llmConfig: {
          provider: state.llmConfig.provider,
          model: state.llmConfig.model,
          apiKey: '',
        },
        codeHistory: state.codeHistory,
        autoApply: state.autoApply,
        editorTheme: state.editorTheme,
        editorLanguage: state.editorLanguage,
        sketchId: state.sketchId,
        sketchTitle: state.sketchTitle,
        storeApiKeys: state.storeApiKeys,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Migrate legacy single-key sessionStorage
        const legacyKey = sessionStorage.getItem('p5-ai-editor-key');
        const stored = sessionStorage.getItem('p5-ai-editor-keys');
        let keys: ProviderKeys = {};
        if (stored) {
          try { keys = JSON.parse(stored); } catch { /* ignore */ }
        } else if (legacyKey) {
          // Legacy: assign to current provider
          keys = { [state.llmConfig.provider]: legacyKey };
          sessionStorage.setItem('p5-ai-editor-keys', JSON.stringify(keys));
          sessionStorage.removeItem('p5-ai-editor-key');
        }
        state.providerKeys = keys;
        state.llmConfig = { ...state.llmConfig, apiKey: keys[state.llmConfig.provider] ?? '' };
      },
    }
  )
);

// Sync sketchId to URL (only when on editor page)
let prevSketchId = useEditorStore.getState().sketchId;
useEditorStore.subscribe((state) => {
  if (state.currentPage !== 'editor') return;
  const id = state.sketchId;
  if (id === prevSketchId) return;
  prevSketchId = id;
  history.replaceState(null, '', id ? `/sketch/${id}` : '/');
});

// Sync currentPage to URL
let prevPage = useEditorStore.getState().currentPage;
useEditorStore.subscribe((state) => {
  if (state.currentPage === prevPage) return;
  prevPage = state.currentPage;
  if (state.currentPage === 'sketches') {
    history.pushState(null, '', '/sketches');
  } else {
    const id = state.sketchId;
    history.pushState(null, '', id ? `/sketch/${id}` : '/');
    prevSketchId = id;
  }
});

// Handle browser back/forward button
window.addEventListener('popstate', () => {
  const path = window.location.pathname;
  if (path === '/sketches') {
    useEditorStore.setState({ currentPage: 'sketches' });
    prevPage = 'sketches';
  } else {
    useEditorStore.setState({ currentPage: 'editor' });
    prevPage = 'editor';
  }
});

// Sync providerKeys to sessionStorage (backend save happens on Settings close)
let prevProviderKeys = useEditorStore.getState().providerKeys;
useEditorStore.subscribe((state) => {
  if (state.providerKeys === prevProviderKeys) return;
  prevProviderKeys = state.providerKeys;
  const hasKeys = Object.values(state.providerKeys).some(Boolean);
  if (hasKeys) {
    sessionStorage.setItem('p5-ai-editor-keys', JSON.stringify(state.providerKeys));
  } else {
    sessionStorage.removeItem('p5-ai-editor-keys');
  }
});
