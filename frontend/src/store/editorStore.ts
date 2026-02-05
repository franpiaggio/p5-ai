import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message, ConsoleLog, LLMConfig, TabType, EditorError, CodeChange } from '../types';

export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

/** Extract first JS code block from markdown. Returns null if none found. */
export function extractFirstJsBlock(markdown: string): string | null {
  const match = /```(?:javascript|js|jsx)\s*\n([\s\S]*?)```/.exec(markdown);
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

export interface PendingDiff {
  code: string;
  messageId: string;
  blockKey: string;
}

const DEFAULT_CODE = `function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(220);
  circle(mouseX, mouseY, 50);
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
  autoApply: boolean;
  sketchId: string | null;
  sketchTitle: string;
  fixRequest: string | null;

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
  setPendingDiff: (diff: PendingDiff | null) => void;
  acceptPendingDiff: () => void;
  rejectPendingDiff: () => void;
  applyCodeFromChat: (messageId: string, newCode: string, blockKey?: string) => void;
  undoCodeChange: (changeId: string) => void;
  clearCodeHistory: () => void;
  setSketchTitle: (title: string) => void;
  setSketchMeta: (id: string | null, title: string) => void;
  newSketch: () => void;
  setFixRequest: (request: string | null) => void;
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
      autoApply: true,
      sketchId: null,
      sketchTitle: 'Untitled Sketch',
      fixRequest: null,

      setCode: (code) => set({ code }),
      setIsRunning: (isRunning) => set({ isRunning }),
      runSketch: () => set((state) => ({ isRunning: true, runTrigger: state.runTrigger + 1 })),
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
        set((state) => ({
          llmConfig: { ...state.llmConfig, ...config },
        })),

      setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setIsStreaming: (isStreaming) => set({ isStreaming }),
      setAutoApply: (autoApply) => set({ autoApply }),
      clearMessages: () => set({ messages: [], appliedBlocks: {} }),

      setPendingDiff: (pendingDiff) => set({ pendingDiff }),
      rejectPendingDiff: () => set({ pendingDiff: null }),
      acceptPendingDiff: () =>
        set((state) => {
          if (!state.pendingDiff) return state;
          const { code: newCode, messageId, blockKey } = state.pendingDiff;
          return {
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
            pendingDiff: null,
            isRunning: true,
            runTrigger: state.runTrigger + 1,
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

      undoCodeChange: (changeId) =>
        set((state) => {
          const entry = state.codeHistory.find((c) => c.id === changeId);
          if (!entry) return state;
          return { code: entry.previousCode };
        }),

      clearCodeHistory: () => set({ codeHistory: [] }),

      setSketchTitle: (sketchTitle) => set({ sketchTitle }),
      setSketchMeta: (sketchId, sketchTitle) => set({ sketchId, sketchTitle }),
      setFixRequest: (fixRequest) => set({ fixRequest }),
      newSketch: () =>
        set({
          code: DEFAULT_CODE,
          sketchId: null,
          sketchTitle: 'Untitled Sketch',
          messages: [],
          codeHistory: [],
          appliedBlocks: {},
          pendingDiff: null,
          consoleLogs: [],
        }),
    }),
    {
      name: 'p5-ai-editor',
      partialize: (state) => ({
        code: state.code,
        llmConfig: state.llmConfig,
        codeHistory: state.codeHistory,
        autoApply: state.autoApply,
        sketchId: state.sketchId,
        sketchTitle: state.sketchTitle,
      }),
    }
  )
);
