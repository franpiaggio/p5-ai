import { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { simpleHash, extractFirstJsBlock, extractSearchReplaceBlocks, applySearchReplace, stripSearchReplaceBlocks } from '../../utils/codeUtils';
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

    if (store.llmConfig.provider !== 'demo' && !store.llmConfig.apiKey) {
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
      for await (const chunk of streamChat({
        message: userMessage,
        code: currentState.code,
        language: currentState.editorLanguage,
        history: currentState.messages.slice(0, -1),
        config: currentState.llmConfig,
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

      const finalChatContent = hasSearchReplace
        ? stripSearchReplaceBlocks(assistantContent)
        : assistantContent;

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
      return {
        pendingDiff: { code: example.code, previousCode: state.code, messageId: lastMsg.id, blockKey, prompt: example.prompt },
        previewCode: null,
        code: example.code,
        lastSavedCode: example.code,
        isRunning: true,
        runTrigger: state.runTrigger + 1,
      };
    });
  }, [addMessage]);

  const handleExampleSelect = useCallback((example: SketchExample) => {
    guardUnsaved(() => applyExample(example));
  }, [applyExample]);

  useEffect(() => {
    if (fixRequest && !isLoading) {
      setFixRequest(null);
      sendMessage(fixRequest);
    }
  }, [fixRequest, isLoading, sendMessage, setFixRequest]);

  const lastMessage = messages[messages.length - 1];
  const showTypingIndicator = isStreaming && lastMessage?.role === 'assistant' && !lastMessage.content;
  const missingApiKey = llmConfig.provider !== 'demo' && !llmConfig.apiKey;
  const chatDisabled = backendOnline === false || backendOnline === null || missingApiKey || !!pendingDiff;

  return (
    <ChatInput
      onSend={sendMessage}
      isLoading={isLoading}
      disabled={chatDisabled}
      showAttach={llmConfig.provider !== 'demo'}
    >
      {backendOnline === null && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-md bg-border/10 border border-border/20 flex items-center gap-2">
          <div className="w-3 h-3 border-[1.5px] border-text-muted/20 border-t-text-muted/60 rounded-full animate-spin shrink-0" />
          <p className="text-text-muted/60 text-[11px] font-mono">
            Connecting...
          </p>
        </div>
      )}
      {backendOnline === false && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-md bg-error/10 border border-error/20 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-error shrink-0" />
          <p className="text-error text-[11px] font-mono">
            Backend unavailable &mdash; chat is disabled. The editor still works normally.
          </p>
        </div>
      )}
      {backendOnline === true && missingApiKey && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-md bg-warning/10 border border-warning/20 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-warning/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <p className="text-text-muted/70 text-[11px] font-mono">
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
      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && showSuggestion ? (
          <div className="flex flex-col items-center justify-end h-full gap-3 text-center px-4 pb-3">
            <div className="w-full max-w-xs">
              <SketchSuggestion onSelect={handleExampleSelect} />
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            if (showTypingIndicator && idx === messages.length - 1 && msg.role === 'assistant' && !msg.content) {
              return <TypingIndicator key={msg.id} />;
            }
            return (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isLastMessage={idx === messages.length - 1}
                isLoading={isLoading}
              />
            );
          })
        )}
        {streamingCode !== null && <GeneratingCodeIndicator onCancel={cancelStreaming} />}
        {pendingDiff && !isMobile && <PendingDiffBanner />}
        <div ref={messagesEndRef} />
      </div>
    </ChatInput>
  );
}
