import { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { simpleHash, extractFirstJsBlock, extractSearchReplaceBlocks, applySearchReplace, stripSearchReplaceBlocks, diffSummary } from '../../utils/codeUtils';
import { streamChat, checkBackendHealth } from '../../services/api';
import { TypingIndicator } from './TypingIndicator';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { GeneratingCodeIndicator } from './GeneratingCodeIndicator';
import { PendingDiffBanner } from './PendingDiffBanner';
import { SketchSuggestion } from './SketchSuggestion';
import type { SketchExample } from '../../data/sketchExamples';
import { guardUnsaved } from '../../utils/unsavedGuard';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useAuthStore } from '../../store/authStore';
import type { ImageAttachment } from '../../types';

const JS_FENCE_OPEN = /```(?:javascript|js|jsx|typescript|ts|tsx)\s*\n/;

/** Split streaming content into chat text (no code) and code for the editor. */
function parseStreamContent(content: string) {
  const openMatch = JS_FENCE_OPEN.exec(content);
  if (!openMatch) return { chatContent: content, codeContent: null as string | null };

  const before = content.slice(0, openMatch.index);
  const codeStart = openMatch.index + openMatch[0].length;
  const rest = content.slice(codeStart);
  const closeIdx = rest.indexOf('\n```');

  if (closeIdx === -1) {
    return { chatContent: before.trimEnd(), codeContent: rest };
  }
  const code = rest.slice(0, closeIdx);
  const after = rest.slice(closeIdx + 4); // skip \n```
  return { chatContent: (before + after).trimEnd(), codeContent: code };
}

export function ChatPanel() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const mountedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  const messages = useEditorStore((s) => s.messages);
  const addMessage = useEditorStore((s) => s.addMessage);
  const isLoading = useEditorStore((s) => s.isLoading);
  const setIsLoading = useEditorStore((s) => s.setIsLoading);
  const isStreaming = useEditorStore((s) => s.isStreaming);
  const setIsStreaming = useEditorStore((s) => s.setIsStreaming);
  const llmConfig = useEditorStore((s) => s.llmConfig);
  const setIsSettingsOpen = useEditorStore((s) => s.setIsSettingsOpen);
  const fixRequest = useEditorStore((s) => s.fixRequest);
  const setFixRequest = useEditorStore((s) => s.setFixRequest);
  const streamingCode = useEditorStore((s) => s.streamingCode);
  const pendingDiff = useEditorStore((s) => s.pendingDiff);
  const showSuggestion = useEditorStore((s) => s.showSuggestion);
  const isMobile = useIsMobile();

  // Backend health check on mount + retry every 10s when offline
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      const ok = await checkBackendHealth();
      setBackendOnline(ok);
      if (!ok) timer = setTimeout(check, 10_000);
    };
    check();
    return () => clearTimeout(timer);
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  useEffect(() => {
    if (isNearBottomRef.current) {
      const behavior = mountedRef.current ? 'smooth' : 'instant';
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
    mountedRef.current = true;
  }, [messages]);

  const sendMessage = useCallback(async (userMessage: string, images?: ImageAttachment[]) => {
    const store = useEditorStore.getState();
    if (!userMessage.trim() || store.isLoading) return;
    useEditorStore.setState({ showSuggestion: false });

    const authUser = useAuthStore.getState().user;
    const serverCanResolve = store.storeApiKeys && !!authUser;
    if (store.llmConfig.provider !== 'demo' && !store.llmConfig.apiKey && !serverCanResolve) {
      setIsSettingsOpen(true);
      return;
    }

    isNearBottomRef.current = true;
    addMessage({
      role: 'user',
      content: userMessage,
      ...(images?.length ? { images } : {}),
    });
    setIsLoading(true);
    setIsStreaming(true);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      let assistantContent = '';
      let firstChunk = true;
      let hasCodeFence = false;
      let hasSearchReplace = false;
      addMessage({ role: 'assistant', content: '' });

      const currentState = useEditorStore.getState();
      const originalCode = currentState.code;
      // Send real key in body if available; omit masked/empty keys (backend resolves from DB)
      const apiKey = currentState.llmConfig.apiKey;
      const hasRealKey = !!apiKey && !apiKey.startsWith('...');
      const chatConfig = hasRealKey
        ? currentState.llmConfig
        : { provider: currentState.llmConfig.provider, model: currentState.llmConfig.model };
      for await (const chunk of streamChat({
        message: userMessage,
        code: currentState.code,
        language: currentState.editorLanguage,
        history: currentState.messages.slice(0, -1),
        config: chatConfig,
        ...(images?.length ? { images } : {}),
      }, abortController.signal)) {
        if (firstChunk) {
          firstChunk = false;
          setIsStreaming(false);
        }
        assistantContent += chunk;

        if (!hasSearchReplace && assistantContent.includes('<<<SEARCH')) {
          hasSearchReplace = true;
        }

        const { chatContent, codeContent } = parseStreamContent(assistantContent);
        if (!hasSearchReplace && codeContent !== null) hasCodeFence = true;

        let displayContent: string;
        let newStreamingCode: string | null = null;

        if (hasSearchReplace) {
          displayContent = stripSearchReplaceBlocks(assistantContent);
          const srBlocks = extractSearchReplaceBlocks(assistantContent);
          if (srBlocks) {
            try {
              newStreamingCode = applySearchReplace(originalCode, srBlocks);
            } catch {
              // block didn't match yet — show original so indicator appears
              newStreamingCode = originalCode;
            }
          } else {
            // block started but not complete yet — show indicator immediately
            newStreamingCode = originalCode;
          }
        } else if (hasCodeFence) {
          displayContent = chatContent;
          newStreamingCode = codeContent;
        } else {
          displayContent = assistantContent;
        }

        useEditorStore.setState((state) => {
          const newMessages = [...state.messages];
          newMessages[newMessages.length - 1] = {
            ...newMessages[newMessages.length - 1],
            content: displayContent,
          };
          return {
            messages: newMessages,
            ...(newStreamingCode !== null ? { streamingCode: newStreamingCode } : {}),
          };
        });
      }

      if (backendOnline !== true) setBackendOnline(true);

      // Restore full message content, clear streaming, and auto-apply in one atomic update
      // to avoid a flicker frame between streaming DiffEditor and pendingDiff DiffEditor
      let jsCode: string | null = null;
      if (assistantContent) {
        const srBlocks = extractSearchReplaceBlocks(assistantContent);
        if (srBlocks) {
          try {
            jsCode = applySearchReplace(originalCode, srBlocks);
          } catch {
            // search block didn't match — fall back to full code extraction
            jsCode = extractFirstJsBlock(assistantContent);
          }
        } else {
          jsCode = extractFirstJsBlock(assistantContent);
        }
      }

      let finalChatContent = hasSearchReplace
        ? stripSearchReplaceBlocks(assistantContent)
        : assistantContent;

      // If stripping code left the message empty, show a brief note
      if (!finalChatContent.trim() && jsCode) {
        finalChatContent = diffSummary(originalCode, jsCode) || 'Code updated.';
      }

      useEditorStore.setState((state) => {
        const newMessages = [...state.messages];
        newMessages[newMessages.length - 1] = {
          ...newMessages[newMessages.length - 1],
          content: finalChatContent,
        };

        if (state.autoApply && jsCode) {
          const lastMsg = newMessages[newMessages.length - 1];
          const blockKey = `${lastMsg.id}:${simpleHash(jsCode)}`;
          return {
            messages: newMessages,
            streamingCode: null,
            pendingDiff: { code: jsCode, previousCode: state.code, messageId: lastMsg.id, blockKey, prompt: userMessage },
            previewCode: null,
            code: jsCode,
            isRunning: true,
            runTrigger: state.runTrigger + 1,
          };
        }

        return { messages: newMessages, streamingCode: null };
      });
    } catch (error) {
      setIsStreaming(false);
      const errorMsg = error instanceof Error ? error.message : 'Failed to get response';
      const cleanError = errorMsg
        .replace(/^\d{3}\s*/, '')
        .replace(/\{.*\}/s, '')
        .trim() || 'Something went wrong. Please try again.';

      useEditorStore.setState((state) => {
        const newMessages = [...state.messages];
        if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
          newMessages[newMessages.length - 1] = {
            ...newMessages[newMessages.length - 1],
            content: `Warning: ${cleanError}`,
          };
        }
        return { messages: newMessages };
      });
    } finally {
      abortRef.current = null;
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [addMessage, setIsLoading, setIsStreaming, setIsSettingsOpen]);

  const cancelStreaming = useCallback(() => {
    abortRef.current?.abort();
    useEditorStore.setState({ streamingCode: null });
  }, []);

  const applyExample = useCallback((example: SketchExample) => {
    addMessage({ role: 'user', content: example.prompt });
    const assistantContent = `Here's a **${example.label}** sketch:\n\n\`\`\`javascript\n${example.code}\n\`\`\``;
    addMessage({ role: 'assistant', content: assistantContent });

    useEditorStore.setState((state) => {
      const lastMsg = state.messages[state.messages.length - 1];
      const blockKey = `${lastMsg.id}:${simpleHash(example.code)}`;
      // Auto-apply the example directly: push to history and mark the block as
      // applied instead of leaving a blocking pendingDiff, so the user can keep
      // iterating on the sketch via chat right away.
      return {
        codeHistory: [
          ...state.codeHistory,
          {
            id: `change-example-${lastMsg.id}`,
            messageId: lastMsg.id,
            timestamp: Date.now(),
            previousCode: state.code,
            newCode: example.code,
            summary: diffSummary(state.code, example.code),
            prompt: example.prompt,
          },
        ],
        appliedBlocks: { ...state.appliedBlocks, [blockKey]: true as const },
        pendingDiff: null,
        previewCode: null,
        code: example.code,
        lastSavedCode: example.code,
        isRunning: true,
        runTrigger: state.runTrigger + 1,
        // Move the suggestion card into its "applied" phase (Keep it / New one).
        exampleApplied: true,
        exampleAppliedLabel: example.label,
      };
    });
  }, [addMessage]);

  const handleExampleSelect = useCallback((example: SketchExample) => {
    guardUnsaved(() => applyExample(example));
  }, [applyExample]);

  // "New one": swap to a different example without piling up chat entries.
  // Drop the previous example's message pair (and its history entry) first, then
  // apply the new one, so there's always exactly one example pair in the chat.
  const handleTryAnother = useCallback((example: SketchExample) => {
    useEditorStore.setState((state) => ({
      messages: state.messages.length >= 2 ? state.messages.slice(0, -2) : state.messages,
      codeHistory: state.codeHistory.filter((c) => !String(c.id).startsWith('change-example-')),
    }));
    applyExample(example);
  }, [applyExample]);

  useEffect(() => {
    if (fixRequest && !isLoading) {
      setFixRequest(null);
      sendMessage(fixRequest);
    }
  }, [fixRequest, isLoading, sendMessage, setFixRequest]);

  const user = useAuthStore((s) => s.user);
  const storeApiKeys = useEditorStore((s) => s.storeApiKeys);
  const lastMessage = messages[messages.length - 1];
  const showTypingIndicator = isStreaming && lastMessage?.role === 'assistant' && !lastMessage.content;
  const serverCanResolve = storeApiKeys && !!user;
  const missingApiKey = llmConfig.provider !== 'demo' && !llmConfig.apiKey && !serverCanResolve;
  const chatDisabled = backendOnline === false || backendOnline === null || missingApiKey || !!pendingDiff;

  return (
    <ChatInput
      onSend={sendMessage}
      isLoading={isLoading}
      disabled={chatDisabled}
      showAttach={llmConfig.provider === 'anthropic'}
    >
      {backendOnline === null && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-md bg-border/10 border border-border/20 flex items-center gap-2">
          <div className="w-3 h-3 border-[1.5px] border-text-muted/20 border-t-text-muted/60 rounded-full animate-spin shrink-0" />
          <p className="text-text-muted/60 text-[11px]">
            Connecting...
          </p>
        </div>
      )}
      {backendOnline === false && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-md bg-error/10 border border-error/20 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-error shrink-0" />
          <p className="text-error text-[11px]">
            Backend unavailable. Chat is disabled, but the editor still works normally.
          </p>
        </div>
      )}
      {backendOnline === true && missingApiKey && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-md bg-warning/10 border border-warning/20 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-warning/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <p className="text-text-muted/70 text-[11px]">
            Add your API key to start chatting.{' '}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="text-info hover:text-info/80 underline underline-offset-2 cursor-pointer"
            >
              Open Settings
            </button>
          </p>
        </div>
      )}
      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-3 flex flex-col">
        <div className="flex-1 flex flex-col space-y-2">
          {messages.length === 0 && !chatDisabled && !showSuggestion && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-4 py-6">
              <div className="w-9 h-9 grid place-items-center rounded-xl bg-accent/10 text-accent">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l2.4 6.9L21 11l-6.6 2.1L12 20l-2.4-6.9L3 11l6.6-2.1z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-text-primary">Describe a change, watch it happen</h4>
                <p className="text-[11px] text-text-muted/70 mt-1 max-w-[34ch] mx-auto">
                  Ask for a new behaviour or a tweak. Edits arrive as a diff you approve.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {['make it a spiral galaxy', 'slow the motion down', 'shift the palette to teal'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => sendMessage(p)}
                    className="text-[11px] font-mono text-text-muted border border-border/50 bg-raised px-2.5 py-1 rounded-full hover:border-accent hover:text-text-primary transition-colors cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, idx) => {
            if (showTypingIndicator && idx === messages.length - 1 && msg.role === 'assistant' && !msg.content) {
              return <TypingIndicator key={msg.id} />;
            }
            return (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isGenerating={isLoading && idx === messages.length - 1}
              />
            );
          })}
          {streamingCode !== null && <GeneratingCodeIndicator onCancel={cancelStreaming} />}
          {pendingDiff && !isMobile && <PendingDiffBanner />}
        </div>
        {showSuggestion && (
          <div className="w-full max-w-xs mx-auto mt-3 pt-1">
            <SketchSuggestion
              onSelect={handleExampleSelect}
              onTryAnother={handleTryAnother}
              onKeep={() => useEditorStore.setState({ showSuggestion: false, exampleApplied: false, exampleAppliedLabel: null })}
            />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </ChatInput>
  );
}
