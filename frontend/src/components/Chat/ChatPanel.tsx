import { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStore, simpleHash, extractFirstJsBlock } from '../../store/editorStore';
import { streamChat } from '../../services/api';
import { MarkdownRenderer } from './MarkdownRenderer';

function TypingIndicator() {
  return (
    <div
      className="bg-surface-raised text-text-muted mr-6 border border-border/20 px-3 py-2 rounded-lg text-xs"
    >
      <div style={{ display: 'flex', gap: '4px', padding: '4px 0' }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--color-text-muted)',
              display: 'inline-block',
              animation: 'typing-bounce 1s ease-in-out infinite',
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function ChatPanel() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const messages = useEditorStore((s) => s.messages);
  const addMessage = useEditorStore((s) => s.addMessage);
  const code = useEditorStore((s) => s.code);
  const llmConfig = useEditorStore((s) => s.llmConfig);
  const isLoading = useEditorStore((s) => s.isLoading);
  const setIsLoading = useEditorStore((s) => s.setIsLoading);
  const isStreaming = useEditorStore((s) => s.isStreaming);
  const setIsStreaming = useEditorStore((s) => s.setIsStreaming);
  const setIsSettingsOpen = useEditorStore((s) => s.setIsSettingsOpen);

  // Track whether user is near bottom of scroll container
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 80;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  // Only auto-scroll if user hasn't scrolled up
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = useCallback(async (userMessage: string) => {
    const store = useEditorStore.getState();
    if (!userMessage.trim() || store.isLoading) return;

    if (store.llmConfig.provider !== 'demo' && !store.llmConfig.apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    isNearBottomRef.current = true;
    addMessage({ role: 'user', content: userMessage });
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

      // Auto-apply: extract first JS block and stage diff review
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

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const msg = input.trim();
    setInput('');
    sendMessage(msg);
  }, [input, sendMessage]);

  // Pick up fix requests from console
  const fixRequest = useEditorStore((s) => s.fixRequest);
  const setFixRequest = useEditorStore((s) => s.setFixRequest);

  useEffect(() => {
    if (fixRequest && !isLoading) {
      setFixRequest(null);
      sendMessage(fixRequest);
    }
  }, [fixRequest, isLoading, sendMessage, setFixRequest]);

  // Determine if the last message is an empty assistant message (waiting for first chunk)
  const lastMessage = messages[messages.length - 1];
  const showTypingIndicator = isStreaming && lastMessage?.role === 'assistant' && !lastMessage.content;

  return (
    <div className="h-full flex flex-col bg-surface">
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
            // Hide the empty assistant message when showing typing indicator
            if (showTypingIndicator && idx === messages.length - 1 && msg.role === 'assistant' && !msg.content) {
              return <TypingIndicator key={msg.id} />;
            }

            const isUser = msg.role === 'user';
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (isUser) {
              return (
                <div key={msg.id} className="flex flex-col items-end">
                  <div className="px-3 py-2 rounded-lg rounded-br-sm text-xs leading-relaxed max-w-[85%] bg-info/15 text-text-primary border border-info/20">
                    <div className="whitespace-pre-wrap break-words font-mono">{msg.content}</div>
                  </div>
                  <span className="text-[9px] font-mono text-text-muted/30 mt-0.5 px-1">{time}</span>
                </div>
              );
            }

            return (
              <div key={msg.id} className="flex flex-col">
                <div className="px-3 py-2 rounded-lg text-xs leading-relaxed bg-surface-raised text-text-muted border border-border/20">
                  <div className="break-words font-mono markdown-chat">
                    <MarkdownRenderer
                      content={msg.content}
                      messageId={msg.id}
                      isGenerating={isLoading && idx === messages.length - 1}
                    />
                  </div>
                </div>
                <span className="text-[9px] font-mono text-text-muted/30 mt-0.5 px-1">{time}</span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-2 border-t border-border/40 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            data-chat-input
            placeholder="Ask AI..."
            disabled={llmConfig.provider !== 'demo' && !llmConfig.apiKey}
            className="input-field flex-1 !w-auto text-xs disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || (llmConfig.provider !== 'demo' && !llmConfig.apiKey)}
            className="btn-primary px-3 py-2 text-xs"
          >
            {isLoading ? (
              <span
                style={{
                  display: 'inline-block',
                  width: 14,
                  height: 14,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                }}
              />
            ) : (
              'Send'
            )}
          </button>
        </div>
      </form>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
