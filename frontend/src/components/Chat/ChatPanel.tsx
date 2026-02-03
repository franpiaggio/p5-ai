import { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { streamChat } from '../../services/api';

export function ChatPanel() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = useEditorStore((s) => s.messages);
  const addMessage = useEditorStore((s) => s.addMessage);
  const code = useEditorStore((s) => s.code);
  const llmConfig = useEditorStore((s) => s.llmConfig);
  const isLoading = useEditorStore((s) => s.isLoading);
  const setIsLoading = useEditorStore((s) => s.setIsLoading);
  const setCode = useEditorStore((s) => s.setCode);
  const setIsSettingsOpen = useEditorStore((s) => s.setIsSettingsOpen);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const extractCode = useCallback((content: string): string | null => {
    const match = content.match(/```(?:javascript|js)?\n([\s\S]*?)```/);
    return match ? match[1].trim() : null;
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!llmConfig.apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    const userMessage = input.trim();
    setInput('');
    addMessage({ role: 'user', content: userMessage });
    setIsLoading(true);

    try {
      let assistantContent = '';
      addMessage({ role: 'assistant', content: '' });

      for await (const chunk of streamChat({
        message: userMessage,
        code,
        history: messages,
        config: llmConfig,
      })) {
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
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, llmConfig, code, messages, addMessage, setIsLoading, setIsSettingsOpen]);

  return (
    <div className="h-full flex flex-col bg-[#1a1a2e]">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
            <div className="w-10 h-10 rounded-lg bg-[#e94560]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#e94560]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-[#a8b2d1]/30 text-xs font-mono">
              Ask AI to help with your sketch
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`px-3 py-2 rounded-lg text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#0f3460]/40 text-[#ccd6f6] ml-6 border border-[#0f3460]/40'
                  : 'bg-[#16213e] text-[#a8b2d1] mr-6 border border-[#0f3460]/20'
              }`}
            >
              <div className="whitespace-pre-wrap break-words font-mono">{msg.content}</div>
              {msg.role === 'assistant' && extractCode(msg.content) && (
                <button
                  onClick={() => {
                    const extracted = extractCode(msg.content);
                    if (extracted) setCode(extracted);
                  }}
                  className="mt-2 text-[10px] font-mono bg-[#e94560]/20 hover:bg-[#e94560]/30 text-[#e94560] px-2 py-1 rounded transition-colors"
                >
                  Apply Code
                </button>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-2 border-t border-[#0f3460]/40 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={llmConfig.apiKey ? 'Ask AI...' : 'Set API key in settings'}
            disabled={isLoading || !llmConfig.apiKey}
            className="flex-1 bg-[#16213e] text-[#ccd6f6] px-3 py-2 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#53d8fb]/50 border border-[#0f3460]/40 placeholder:text-[#a8b2d1]/20 disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || !llmConfig.apiKey}
            className="bg-[#e94560] hover:bg-[#e94560]/80 disabled:opacity-30 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-xs font-mono transition-colors"
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
