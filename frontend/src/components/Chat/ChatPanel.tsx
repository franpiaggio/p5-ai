import { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStore, simpleHash, extractFirstJsBlock } from '../../store/editorStore';
import { streamChat, checkBackendHealth } from '../../services/api';
import { TypingIndicator } from './TypingIndicator';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import type { ImageAttachment } from '../../types';

export function ChatPanel() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
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
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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

    try {
      let assistantContent = '';
      let firstChunk = true;
      addMessage({ role: 'assistant', content: '' });

      const currentState = useEditorStore.getState();
      for await (const chunk of streamChat({
        message: userMessage,
        code: currentState.code,
        history: currentState.messages.slice(0, -1),
        config: currentState.llmConfig,
        ...(images?.length ? { images } : {}),
      })) {
        if (firstChunk) {
          firstChunk = false;
          setIsStreaming(false);
        }
        assistantContent += chunk;
        useEditorStore.setState((state) => {
          const newMessages = [...state.messages];
          newMessages[newMessages.length - 1] = {
            ...newMessages[newMessages.length - 1],
            content: assistantContent,
          };
          return { messages: newMessages };
        });
      }

      if (backendOnline !== true) setBackendOnline(true);

      const finalState = useEditorStore.getState();
      if (finalState.autoApply && assistantContent) {
        const jsCode = extractFirstJsBlock(assistantContent);
        if (jsCode) {
          const lastMsg = finalState.messages[finalState.messages.length - 1];
          const blockKey = `${lastMsg.id}:${simpleHash(jsCode)}`;
          useEditorStore.getState().setPendingDiff({
            code: jsCode,
            messageId: lastMsg.id,
            blockKey,
          });
        }
      }
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
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [addMessage, setIsLoading, setIsStreaming, setIsSettingsOpen]);

  useEffect(() => {
    if (fixRequest && !isLoading) {
      setFixRequest(null);
      sendMessage(fixRequest);
    }
  }, [fixRequest, isLoading, sendMessage, setFixRequest]);

  const lastMessage = messages[messages.length - 1];
  const showTypingIndicator = isStreaming && lastMessage?.role === 'assistant' && !lastMessage.content;
  const chatDisabled = backendOnline === false || (llmConfig.provider !== 'demo' && !llmConfig.apiKey);

  return (
    <ChatInput
      onSend={sendMessage}
      isLoading={isLoading}
      disabled={chatDisabled}
    >
      {backendOnline === false && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-md bg-error/10 border border-error/20 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-error shrink-0" />
          <p className="text-error text-[11px] font-mono">
            Backend unavailable &mdash; chat is disabled. The editor still works normally.
          </p>
        </div>
      )}
      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-text-muted/30 text-xs font-mono">
              Ask AI to help with your sketch
            </p>
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
        <div ref={messagesEndRef} />
      </div>
    </ChatInput>
  );
}
