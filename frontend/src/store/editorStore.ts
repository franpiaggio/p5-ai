import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message, ConsoleLog, LLMConfig, TabType, EditorError, CodeChange, ProviderKeys, SketchFile, Library } from '../types';
import type { AppThemeId } from '../components/Editor/editorConfig';
import { diffSummary } from '../utils/codeUtils';
import { createDefaultFiles, createFileId, isAllowedFileName, languageFromExtension } from '../constants/defaultFiles';

export type EditorLanguage = 'javascript' | 'typescript';

export interface PendingDiff {
  code: string;
  previousCode: string;
  messageId: string;
  blockKey: string;
  prompt?: string;
  isRestore?: boolean;
  fileName?: string;
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
  /** The single app theme: paints chrome + editor. 'auto' follows the OS. */
  appTheme: AppThemeId;
  editorLanguage: EditorLanguage;
  transpiler: ((code: string) => Promise<string>) | null;
  providerKeys: ProviderKeys;
  storeApiKeys: boolean;
  streamingCode: string | null;
  lastSavedCode: string;
  pendingNavigation: (() => void) | null;
  showSuggestion: boolean;
  // Example-suggestion flow: false = offer phase (single "Generate"),
  // true = applied phase (offer "Keep it" / "New one"). Kept in the store so
  // it survives ChatPanel unmount/remount when switching bottom tabs.
  exampleApplied: boolean;
  exampleAppliedLabel: string | null;
  files: SketchFile[];
  activeFileName: string;
  lastSavedFiles: SketchFile[];
  isFileSidebarOpen: boolean;
  libraries: Library[];
  lastSavedLibraries: Library[];

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
  setAppTheme: (theme: AppThemeId) => void;
  setEditorLanguage: (language: EditorLanguage) => void;
  setTranspiler: (transpiler: ((code: string) => Promise<string>) | null) => void;
  setProviderKey: (provider: LLMConfig['provider'], key: string) => void;
  clearProviderKey: (provider: LLMConfig['provider']) => void;
  setStoreApiKeys: (store: boolean) => void;
  setStreamingCode: (code: string | null) => void;
  markCodeSaved: () => void;
  setPendingNavigation: (action: (() => void) | null) => void;
  setActiveFile: (name: string) => void;
  addFile: (name: string) => void;
  deleteFile: (name: string) => void;
  renameFile: (oldName: string, newName: string) => void;
  setFileContent: (name: string, content: string) => void;
  setFiles: (files: SketchFile[]) => void;
  addLibrary: (lib: Library) => void;
  removeLibrary: (url: string) => void;
  setLibraries: (libs: Library[]) => void;
  setFileSidebarOpen: (open: boolean) => void;
}

let logCounter = 0;
let msgCounter = 0;
let changeCounter = 0;

/** Keep the active file's content in sync with the live `code` buffer. */
const syncActiveFile = (
  files: SketchFile[],
  activeFileName: string,
  content: string,
): SketchFile[] =>
  files.map((f) => (f.name === activeFileName ? { ...f, content } : f));

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
      appTheme: 'auto',
      editorLanguage: 'javascript' as EditorLanguage,
      transpiler: null,
      providerKeys: {} as ProviderKeys,
      storeApiKeys: false,
      streamingCode: null,
      lastSavedCode: DEFAULT_CODE,
      pendingNavigation: null,
      showSuggestion: true,
      exampleApplied: false,
      exampleAppliedLabel: null,
      files: createDefaultFiles(DEFAULT_CODE),
      activeFileName: 'sketch.js',
      lastSavedFiles: createDefaultFiles(DEFAULT_CODE),
      isFileSidebarOpen: false,
      libraries: [] as Library[],
      lastSavedLibraries: [] as Library[],

      setCode: (code) =>
        set((state) => {
          const files = state.files.map((f) =>
            f.name === state.activeFileName ? { ...f, content: code } : f,
          );
          return {
            code,
            files,
            ...(state.previewCode ? { previewCode: null, isRunning: true, runTrigger: state.runTrigger + 1 } : {}),
          };
        }),
      setIsRunning: (isRunning) => set({ isRunning }),
      runSketch: () => set((state) => ({ isRunning: true, runTrigger: state.runTrigger + 1, previewCode: null, consoleLogs: [], editorErrors: [] })),
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
            ? {
                code: pendingDiff.code,
                files: syncActiveFile(state.files, state.activeFileName, pendingDiff.code),
                isRunning: true,
                runTrigger: state.runTrigger + 1,
              }
            : {}),
        })),
      rejectPendingDiff: () =>
        set((state) => {
          if (!state.pendingDiff) return { pendingDiff: null };
          const { blockKey } = state.pendingDiff;
          return {
            code: state.pendingDiff.previousCode,
            files: syncActiveFile(state.files, state.activeFileName, state.pendingDiff.previousCode),
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
            files: syncActiveFile(state.files, state.activeFileName, state.code),
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
          isRunning: true,
          runTrigger: state.runTrigger + 1,
        })),

      clearCodeHistory: () => set({ codeHistory: [] }),

      setSketchTitle: (sketchTitle) => set({ sketchTitle }),
      setSketchMeta: (sketchId, sketchTitle) => set({ sketchId, sketchTitle }),
      setFixRequest: (fixRequest) => set({ fixRequest }),
      setAppTheme: (appTheme) => set({ appTheme }),
      setEditorLanguage: (editorLanguage) => set({ editorLanguage }),
      setTranspiler: (transpiler) => set({ transpiler }),
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
      markCodeSaved: () => set((state) => ({
        lastSavedCode: state.code,
        lastSavedFiles: state.files.map((f) => ({ ...f })),
        lastSavedLibraries: [...state.libraries],
      })),
      setPendingNavigation: (pendingNavigation) => set({ pendingNavigation }),
      setActiveFile: (name) =>
        set((state) => {
          const file = state.files.find((f) => f.name === name);
          if (!file) return state;
          return { activeFileName: name, code: file.content };
        }),
      addFile: (name) =>
        set((state) => {
          if (!isAllowedFileName(name)) return state;
          if (state.files.some((f) => f.name === name)) return state;
          const newFile: SketchFile = {
            id: createFileId(),
            name,
            content: '',
            language: languageFromExtension(name),
          };
          return {
            files: [...state.files, newFile],
            activeFileName: name,
            code: '',
          };
        }),
      deleteFile: (name) =>
        set((state) => {
          if (name === 'sketch.js') return state;
          const files = state.files.filter((f) => f.name !== name);
          if (files.length === state.files.length) return state;
          const switchTo = state.activeFileName === name ? 'sketch.js' : state.activeFileName;
          const switchFile = files.find((f) => f.name === switchTo) ?? files[0];
          return {
            files,
            activeFileName: switchFile.name,
            code: switchFile.content,
          };
        }),
      renameFile: (oldName, newName) =>
        set((state) => {
          if (oldName === 'sketch.js') return state;
          if (!isAllowedFileName(newName)) return state;
          if (state.files.some((f) => f.name === newName)) return state;
          const files = state.files.map((f) =>
            f.name === oldName ? { ...f, name: newName, language: languageFromExtension(newName) } : f,
          );
          return {
            files,
            activeFileName: state.activeFileName === oldName ? newName : state.activeFileName,
          };
        }),
      setFileContent: (name, content) =>
        set((state) => {
          const files = state.files.map((f) =>
            f.name === name ? { ...f, content } : f,
          );
          return {
            files,
            ...(state.activeFileName === name ? { code: content } : {}),
          };
        }),
      setFiles: (files) =>
        set((state) => {
          const active = files.find((f) => f.name === state.activeFileName) ?? files[0];
          return {
            files,
            activeFileName: active?.name ?? 'sketch.js',
            code: active?.content ?? '',
          };
        }),
      addLibrary: (lib) =>
        set((state) => {
          if (state.libraries.some((l) => l.url === lib.url)) return state;
          return { libraries: [...state.libraries, lib] };
        }),
      removeLibrary: (url) =>
        set((state) => ({
          libraries: state.libraries.filter((l) => l.url !== url),
        })),
      setLibraries: (libraries) => set({ libraries }),
      setFileSidebarOpen: (isFileSidebarOpen) => set({ isFileSidebarOpen }),
      newSketch: () =>
        set((state) => {
          const newFiles = createDefaultFiles(DEFAULT_CODE);
          return {
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
            exampleApplied: false,
            exampleAppliedLabel: null,
            files: newFiles,
            activeFileName: 'sketch.js',
            lastSavedFiles: newFiles.map((f) => ({ ...f })),
            libraries: [],
            lastSavedLibraries: [],
          };
        }),
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
        // Cap persisted history: each entry holds full previous+new code, so an
        // unbounded array can blow localStorage's ~5MB quota — and a thrown
        // QuotaExceededError from zustand's persist write silently drops the
        // whole persisted state (code, config, key prefs). Keep the most recent.
        codeHistory: state.codeHistory.slice(-20),
        autoApply: state.autoApply,
        autoSave: state.autoSave,
        appTheme: state.appTheme,
        editorLanguage: state.editorLanguage,
        sketchId: state.sketchId,
        sketchTitle: state.sketchTitle,
        storeApiKeys: state.storeApiKeys,
        files: state.files,
        lastSavedFiles: state.lastSavedFiles,
        activeFileName: state.activeFileName,
        isFileSidebarOpen: state.isFileSidebarOpen,
        libraries: state.libraries,
        lastSavedLibraries: state.lastSavedLibraries,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Migrate the old light/dark appearance values to the unified theme ids.
        const legacyTheme = state.appTheme as unknown as string;
        if (legacyTheme === 'dark') state.appTheme = 'darkroom';
        else if (legacyTheme === 'light') state.appTheme = 'gallery';
        else if (!legacyTheme) state.appTheme = 'auto';
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
        if (!state.sketchId) {
          // Unsaved scratchpad: keep the persisted code, history and title so
          // work survives a reload instead of resetting to the default sketch.
          // Only offer the example suggestion when nothing has been written yet.
          state.showSuggestion = state.code === DEFAULT_CODE;
        } else {
          state.showSuggestion = false;
          // When auto-save is off, discard unsaved edits on reload
          // so the editor resets to the last backend-saved version.
          if (!state.autoSave && state.lastSavedCode) {
            state.code = state.lastSavedCode;
            state.codeHistory = [];
          }
        }
        // Migrate: construct files from code if absent
        if (!state.files || !Array.isArray(state.files) || state.files.length === 0) {
          state.files = createDefaultFiles(state.code);
          state.activeFileName = 'sketch.js';
        }
        if (!state.lastSavedFiles || !Array.isArray(state.lastSavedFiles)) {
          state.lastSavedFiles = state.files.map((f) => ({ ...f }));
        }
        if (!state.libraries || !Array.isArray(state.libraries)) {
          state.libraries = [];
        }
        if (!state.lastSavedLibraries || !Array.isArray(state.lastSavedLibraries)) {
          state.lastSavedLibraries = [];
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
