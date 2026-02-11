import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message, ConsoleLog, LLMConfig, TabType, EditorError, CodeChange, ProviderKeys } from '../types';
import { diffSummary } from '../utils/codeUtils';

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
  rectMode(CENTER);
}

function draw() {
  background(30);
  translate(width / 2, height / 2);
  rotate(frameCount * 0.02);
  fill(255);
  noStroke();
  square(0, 0, 80);
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
  rejectedBlocks: Record<string, true>;
  pendingDiff: PendingDiff | null;
  previewCode: { code: string; entryId: string } | null;
  autoApply: boolean;
  autoSave: boolean;
  sketchId: string | null;
  sketchTitle: string;
  fixRequest: string | null;
  editorTheme: string;
  editorLanguage: EditorLanguage;
  transpiler: ((code: string) => Promise<string>) | null;
  currentPage: 'editor' | 'sketches' | 'examples';
  providerKeys: ProviderKeys;
  storeApiKeys: boolean;
  streamingCode: string | null;
  lastSavedCode: string;
  pendingNavigation: (() => void) | null;
  showSuggestion: boolean;

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
  setAutoSave: (auto: boolean) => void;
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
  setCurrentPage: (page: 'editor' | 'sketches' | 'examples') => void;
  setProviderKey: (provider: LLMConfig['provider'], key: string) => void;
  clearProviderKey: (provider: LLMConfig['provider']) => void;
  setStoreApiKeys: (store: boolean) => void;
  setStreamingCode: (code: string | null) => void;
  markCodeSaved: () => void;
  setPendingNavigation: (action: (() => void) | null) => void;
}

let logCounter = 0;
let msgCounter = 0;
let changeCounter = 0;

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
      code: DEFAULT_CODE,
      isRunning: true,
      runTrigger: 1,
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
      rejectedBlocks: {},
      pendingDiff: null,
      previewCode: null,
      autoApply: true,
      autoSave: false,
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
      lastSavedCode: DEFAULT_CODE,
      pendingNavigation: null,
      showSuggestion: true,

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
      setAutoSave: (autoSave) => set({ autoSave }),
      clearMessages: () => set({ messages: [], appliedBlocks: {}, rejectedBlocks: {} }),

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
          const { blockKey } = state.pendingDiff;
          return {
            code: state.pendingDiff.previousCode,
            pendingDiff: null,
            isRunning: true,
            runTrigger: state.runTrigger + 1,
            ...(blockKey ? { rejectedBlocks: { ...state.rejectedBlocks, [blockKey]: true as const } } : {}),
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
      markCodeSaved: () => set((state) => ({ lastSavedCode: state.code })),
      setPendingNavigation: (pendingNavigation) => set({ pendingNavigation }),
      newSketch: () =>
        set((state) => ({
          code: DEFAULT_CODE,
          lastSavedCode: DEFAULT_CODE,
          sketchId: null,
          sketchTitle: 'Untitled Sketch',
          messages: [],
          codeHistory: [],
          appliedBlocks: {},
          rejectedBlocks: {},
          pendingDiff: null,
          previewCode: null,
          consoleLogs: [],
          editorErrors: [],
          isRunning: true,
          runTrigger: state.runTrigger + 1,
          showSuggestion: true,
        })),
    }),
    {
      name: 'p5-ai-editor',
      partialize: (state) => ({
        code: state.code,
        lastSavedCode: state.lastSavedCode,
        llmConfig: {
          provider: state.llmConfig.provider,
          model: state.llmConfig.model,
          apiKey: '',
        },
        codeHistory: state.codeHistory,
        autoApply: state.autoApply,
        autoSave: state.autoSave,
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
        const provider = state.llmConfig.provider as keyof ProviderKeys;
        state.llmConfig = { ...state.llmConfig, apiKey: keys[provider] ?? '' };
        // If no saved sketch, reset to initial state on reload.
        // Only persisted sketches (with sketchId in URL) survive a refresh.
        if (!state.sketchId) {
          state.code = DEFAULT_CODE;
          state.codeHistory = [];
          state.sketchTitle = 'Untitled Sketch';
          state.showSuggestion = true;
        } else {
          state.showSuggestion = false;
        }
        // Ensure lastSavedCode matches code on rehydrate so we don't
        // false-positive the unsaved-changes guard after a reload.
        state.lastSavedCode = state.code;
        // Force canvas rebuild after async rehydration so P5Preview
        // picks up the persisted code instead of DEFAULT_CODE.
        state.runTrigger = state.runTrigger + 1;
      },
    }
  )
);
