import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message, ConsoleLog, LLMConfig, TabType, EditorError, CodeChange, ProviderKeys, SketchFile, Library } from '../types';
import type { AppThemeId } from '../components/Editor/editorConfig';
import { diffSummary, updateImportPath } from '../utils/codeUtils';
import {
  createDefaultFiles,
  createFileId,
  isAllowedFileName,
  languageFromExtension,
  isEntryFile,
  entryFileName,
  findEntryFile,
} from '../constants/defaultFiles';
import type { FileChange } from '../utils/fileEdits';
import { mergeFilesToSingle } from '../utils/fileMode';

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

/** Cursor-style review of a multi-file AI edit: changes are already applied to
 * `files` (so the preview runs with them), and the user steps through each
 * file's diff accepting or rejecting it individually. */
export interface PendingFilesReview {
  changes: FileChange[];
  index: number;
  /** How many files have been accepted so far — decides applied vs rejected chat badges. */
  accepted: number;
  messageId: string;
  prompt?: string;
  blockKeys: string[];
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
  /** Bumped whenever the editor swaps to a different sketch (load / new /
   * duplicate / example). An in-flight chat request captures this value and
   * discards its result if it no longer matches — otherwise a response that
   * was requested for sketch A would land on sketch B. Never persisted. */
  chatSessionId: number;
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
  /** File names shown as editor tabs, in tab order. Closing a tab never deletes the file. */
  openFiles: string[];
  pendingFilesReview: PendingFilesReview | null;
  /** Opt-in to a multi-file sketch. Sketches are single-file by default; this
   * flag only matters while the sketch still has one file — beyond that the
   * file count itself is the opt-in (see `isMultiFileSketch`). */
  multiFileEnabled: boolean;
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
  /** State reset to apply whenever the editor swaps sketches: invalidates any
   * in-flight chat response so it can't be applied to the newly opened sketch. */
  beginSketchSession: () => void;
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
  closeTab: (name: string) => void;
  acceptReviewFile: () => void;
  rejectReviewFile: () => void;
  acceptAllReviewFiles: () => void;
  setFileContent: (name: string, content: string) => void;
  setFiles: (files: SketchFile[]) => void;
  /** Turn multi-file mode on, or off — turning it off merges every file back
   * into the entry file. */
  setMultiFileEnabled: (enabled: boolean) => void;
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

const markKeys = (
  record: Record<string, true>,
  keys: string[],
): Record<string, true> => {
  if (keys.length === 0) return record;
  const next = { ...record };
  for (const k of keys) next[k] = true;
  return next;
};

/** Step a multi-file review forward (or finish it): focuses the next change's
 * file, or on the last change closes the review and marks the chat blocks
 * applied/rejected based on whether anything was accepted. */
const advanceFilesReview = (
  state: EditorState,
  review: PendingFilesReview,
  files: SketchFile[],
  openFiles: string[],
  newEntries: CodeChange[],
  acceptedDelta: number,
): Partial<EditorState> => {
  const accepted = review.accepted + acceptedDelta;
  const codeHistory = newEntries.length
    ? [...state.codeHistory, ...newEntries]
    : state.codeHistory;
  const nextIndex = review.index + 1;

  if (nextIndex >= review.changes.length) {
    // Finished — if the active file was a rejected new file, fall back to the entry.
    const activeFile =
      files.find((f) => f.name === state.activeFileName) ?? findEntryFile(files);
    return {
      files,
      openFiles,
      codeHistory,
      pendingFilesReview: null,
      activeFileName: activeFile?.name ?? state.activeFileName,
      code: activeFile?.content ?? state.code,
      ...(accepted > 0
        ? { appliedBlocks: markKeys(state.appliedBlocks, review.blockKeys) }
        : { rejectedBlocks: markKeys(state.rejectedBlocks, review.blockKeys) }),
    };
  }

  const next = review.changes[nextIndex];
  const nextFile = files.find((f) => f.name === next.name);
  return {
    files,
    openFiles,
    codeHistory,
    pendingFilesReview: { ...review, index: nextIndex, accepted },
    activeFileName: next.name,
    code: nextFile?.content ?? next.newContent,
  };
};

const reviewHistoryEntry = (
  review: PendingFilesReview,
  change: FileChange,
): CodeChange => ({
  id: `change-${++changeCounter}-${Date.now()}`,
  messageId: review.messageId,
  timestamp: Date.now(),
  previousCode: change.previousContent,
  newCode: change.newContent,
  summary: `${change.isNew ? 'Created' : 'Updated'} ${change.name}`,
  ...(review.prompt ? { prompt: review.prompt } : {}),
  fileName: change.name,
});

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
      chatSessionId: 0,
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
      openFiles: ['sketch.js'],
      pendingFilesReview: null,
      multiFileEnabled: false,
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
      setEditorLanguage: (editorLanguage) =>
        set((state) => {
          // Migrate the entry file's extension (sketch.js ↔ sketch.ts) so the
          // editor, preview transpile, and AI targeting all agree on the language.
          const entry = state.files.find((f) => isEntryFile(f.name));
          const newName = entryFileName(editorLanguage);
          if (!entry || entry.name === newName) return { editorLanguage };
          const files = state.files.map((f) => {
            if (f.name === entry.name) {
              return { ...f, name: newName, language: editorLanguage };
            }
            const content = updateImportPath(f.content, entry.name, newName);
            return content === f.content ? f : { ...f, content };
          });
          return {
            editorLanguage,
            files,
            activeFileName:
              state.activeFileName === entry.name ? newName : state.activeFileName,
            openFiles: state.openFiles.map((n) => (n === entry.name ? newName : n)),
            isRunning: true,
            runTrigger: state.runTrigger + 1,
          };
        }),
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
          return {
            activeFileName: name,
            code: file.content,
            openFiles: state.openFiles.includes(name)
              ? state.openFiles
              : [...state.openFiles, name],
          };
        }),
      addFile: (name) =>
        set((state) => {
          if (!isAllowedFileName(name)) return state;
          if (state.files.some((f) => f.name === name)) return state;
          // Only one entry file may exist (sketch.js OR sketch.ts).
          if (isEntryFile(name) && state.files.some((f) => isEntryFile(f.name))) return state;
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
            openFiles: [...state.openFiles, name],
            // Creating a file by hand is an explicit opt-in to multi-file.
            multiFileEnabled: true,
          };
        }),
      deleteFile: (name) =>
        set((state) => {
          if (isEntryFile(name)) return state;
          const files = state.files.filter((f) => f.name !== name);
          if (files.length === state.files.length) return state;
          const openFiles = state.openFiles.filter((n) => n !== name);
          // Back down to the entry file alone → back to a single-file sketch.
          const multiFileEnabled = files.length > 1 && state.multiFileEnabled;
          if (state.activeFileName !== name) {
            return { files, openFiles, multiFileEnabled };
          }
          const switchFile = findEntryFile(files) ?? files[0];
          return {
            files,
            multiFileEnabled,
            activeFileName: switchFile.name,
            code: switchFile.content,
            openFiles: openFiles.includes(switchFile.name)
              ? openFiles
              : [...openFiles, switchFile.name],
          };
        }),
      renameFile: (oldName, newName) =>
        set((state) => {
          if (isEntryFile(oldName)) return state;
          if (!isAllowedFileName(newName) || isEntryFile(newName)) return state;
          if (state.files.some((f) => f.name === newName)) return state;
          const files = state.files.map((f) => {
            if (f.name === oldName) {
              return { ...f, name: newName, language: languageFromExtension(newName) };
            }
            // Keep imports in sibling files pointing at the renamed file.
            const content = updateImportPath(f.content, oldName, newName);
            return content === f.content ? f : { ...f, content };
          });
          const activeFileName = state.activeFileName === oldName ? newName : state.activeFileName;
          const activeFile = files.find((f) => f.name === activeFileName);
          return {
            files,
            activeFileName,
            openFiles: state.openFiles.map((n) => (n === oldName ? newName : n)),
            ...(activeFile ? { code: activeFile.content } : {}),
          };
        }),
      closeTab: (name) =>
        set((state) => {
          const idx = state.openFiles.indexOf(name);
          // The last remaining tab can't be closed — the editor needs a buffer.
          if (idx === -1 || state.openFiles.length <= 1) return state;
          const openFiles = state.openFiles.filter((n) => n !== name);
          if (state.activeFileName !== name) return { openFiles };
          const nextName = openFiles[Math.min(idx, openFiles.length - 1)];
          const nextFile = state.files.find((f) => f.name === nextName);
          return {
            openFiles,
            activeFileName: nextName,
            code: nextFile?.content ?? '',
          };
        }),
      acceptReviewFile: () =>
        set((state) => {
          const review = state.pendingFilesReview;
          if (!review) return state;
          const change = review.changes[review.index];
          return advanceFilesReview(
            state,
            review,
            state.files,
            state.openFiles,
            [reviewHistoryEntry(review, change)],
            1,
          );
        }),
      rejectReviewFile: () =>
        set((state) => {
          const review = state.pendingFilesReview;
          if (!review) return state;
          const change = review.changes[review.index];
          // Revert this file: drop it if the AI created it, else restore its content.
          const files = change.isNew
            ? state.files.filter((f) => f.name !== change.name)
            : state.files.map((f) =>
                f.name === change.name ? { ...f, content: change.previousContent } : f,
              );
          const openFiles = change.isNew
            ? state.openFiles.filter((n) => n !== change.name)
            : state.openFiles;
          return {
            ...advanceFilesReview(state, review, files, openFiles, [], 0),
            isRunning: true,
            runTrigger: state.runTrigger + 1,
          };
        }),
      acceptAllReviewFiles: () =>
        set((state) => {
          const review = state.pendingFilesReview;
          if (!review) return state;
          const remaining = review.changes.slice(review.index);
          const entries = remaining.map((c) => reviewHistoryEntry(review, c));
          // Jump to the last change and advance once — advanceFilesReview finishes the review.
          const jumped = {
            ...review,
            index: review.changes.length - 1,
            accepted: review.accepted + remaining.length - 1,
          };
          return advanceFilesReview(state, jumped, state.files, state.openFiles, entries, 1);
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
          const activeFileName = active?.name ?? 'sketch.js';
          const kept = state.openFiles.filter((n) => files.some((f) => f.name === n));
          return {
            files,
            activeFileName,
            code: active?.content ?? '',
            openFiles: kept.includes(activeFileName) ? kept : [...kept, activeFileName],
          };
        }),
      setMultiFileEnabled: (enabled) =>
        set((state) => {
          if (enabled) return { multiFileEnabled: true };
          // Switching back to single file folds every helper into the entry
          // file. Blocked mid-review: those files are still being accepted.
          if (state.pendingFilesReview) return state;
          const files = mergeFilesToSingle(state.files);
          const entry = files[0];
          if (!entry) return { multiFileEnabled: false };
          return {
            multiFileEnabled: false,
            files,
            activeFileName: entry.name,
            code: entry.content,
            openFiles: [entry.name],
            pendingDiff: null,
            previewCode: null,
            isRunning: true,
            runTrigger: state.runTrigger + 1,
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
      beginSketchSession: () =>
        set((state) => ({
          chatSessionId: state.chatSessionId + 1,
          isLoading: false,
          isStreaming: false,
          streamingCode: null,
          pendingDiff: null,
          pendingFilesReview: null,
          fixRequest: null,
          // The incoming sketch decides its own layout: a multi-file one opts in
          // through its file count, a single-file one starts single.
          multiFileEnabled: false,
        })),
      newSketch: () =>
        set((state) => {
          const newFiles = createDefaultFiles(DEFAULT_CODE, state.editorLanguage);
          return {
            chatSessionId: state.chatSessionId + 1,
            isLoading: false,
            isStreaming: false,
            streamingCode: null,
            fixRequest: null,
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
            activeFileName: newFiles[0].name,
            openFiles: [newFiles[0].name],
            pendingFilesReview: null,
            multiFileEnabled: false,
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
        multiFileEnabled: state.multiFileEnabled,
        activeFileName: state.activeFileName,
        openFiles: state.openFiles,
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
        // Reconcile: `code` is authoritative for the active file. When upgrading from
        // a pre-multi-file version, the default `files` from the store initializer can
        // survive zustand's shallow merge and leave the active file stale — the preview
        // renders from `files`, not `code`, so it would show the wrong sketch. Also
        // recovers from any other code↔files drift. Force the active file to match code.
        if (!state.files.some((f) => f.name === state.activeFileName)) {
          state.activeFileName = state.files[0]?.name ?? 'sketch.js';
        }
        const activeFile = state.files.find((f) => f.name === state.activeFileName);
        if (activeFile && activeFile.content !== state.code) {
          state.files = state.files.map((f) =>
            f.name === state.activeFileName ? { ...f, content: state.code } : f,
          );
        }
        if (!state.lastSavedFiles || !Array.isArray(state.lastSavedFiles)) {
          state.lastSavedFiles = state.files.map((f) => ({ ...f }));
        }
        // Reconcile open tabs: drop tabs for missing files, always keep the
        // active file open (also seeds pre-tabs persisted states).
        if (!Array.isArray(state.openFiles)) state.openFiles = [];
        state.openFiles = state.openFiles.filter((n) =>
          state.files.some((f) => f.name === n),
        );
        if (!state.openFiles.includes(state.activeFileName)) {
          state.openFiles.push(state.activeFileName);
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

/** Effective layout of the sketch on screen: multi-file once the user opted in
 * or once more than one file exists. */
export function isMultiFileSketch(state: {
  files: SketchFile[];
  multiFileEnabled: boolean;
}): boolean {
  return state.multiFileEnabled || state.files.length > 1;
}
