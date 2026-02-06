import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useEditorStore, simpleHash, extractFirstJsBlock } from '../../store/editorStore';
import { streamChat } from '../../services/api';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { ImageAttachment } from '../../types';

const MAX_IMAGES = 4;
const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg'];
const SAFE_MIME_TYPES = new Set(['image/png', 'image/jpeg']);

function createBlobUrl(img: ImageAttachment): string {
  if (!SAFE_MIME_TYPES.has(img.mimeType)) return '';
  try {
    const binary = atob(img.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: img.mimeType });
    return URL.createObjectURL(blob);
  } catch {
    return '';
  }
}

function SafeImage({ img, className, alt, onClick }: {
  img: ImageAttachment;
  className?: string;
  alt: string;
  onClick?: () => void;
}) {
  const blobUrl = useMemo(() => createBlobUrl(img), [img]);

  useEffect(() => {
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [blobUrl]);

  if (!blobUrl) return null;
  return <img src={blobUrl} alt={alt} className={className} onClick={onClick} />;
}

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

function fileToImageAttachment(file: File): Promise<ImageAttachment> {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      reject(new Error('Only PNG and JPEG images are supported'));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      reject(new Error('Image must be under 4MB'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve({
        base64,
        mimeType: file.type as 'image/png' | 'image/jpeg',
      });
    };
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
}

export function ChatPanel() {
  const [input, setInput] = useState('');
  const [attachedImages, setAttachedImages] = useState<ImageAttachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messages = useEditorStore((s) => s.messages);
  const addMessage = useEditorStore((s) => s.addMessage);
  const code = useEditorStore((s) => s.code);
  const llmConfig = useEditorStore((s) => s.llmConfig);
  const isLoading = useEditorStore((s) => s.isLoading);
  const setIsLoading = useEditorStore((s) => s.setIsLoading);
  const isStreaming = useEditorStore((s) => s.isStreaming);
  const setIsStreaming = useEditorStore((s) => s.setIsStreaming);
  const setIsSettingsOpen = useEditorStore((s) => s.setIsSettingsOpen);

  const addImages = useCallback(async (files: File[]) => {
    const remaining = MAX_IMAGES - attachedImages.length;
    const toProcess = files.slice(0, remaining);
    const results: ImageAttachment[] = [];
    for (const file of toProcess) {
      try {
        results.push(await fileToImageAttachment(file));
      } catch {
        // skip invalid files silently
      }
    }
    if (results.length > 0) {
      setAttachedImages((prev) => [...prev, ...results].slice(0, MAX_IMAGES));
    }
  }, [attachedImages.length]);

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

  // Paste handler for clipboard images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) =>
        ACCEPTED_TYPES.includes(f.type),
      );
      if (files.length > 0) {
        e.preventDefault();
        addImages(files);
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [addImages]);

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
    if (!input.trim() && attachedImages.length === 0) return;
    const msg = input.trim();
    const images = attachedImages.length > 0 ? [...attachedImages] : undefined;
    setInput('');
    setAttachedImages([]);
    sendMessage(msg || 'What do you see in this image?', images);
  }, [input, attachedImages, sendMessage]);

  // Pick up fix requests from console
  const fixRequest = useEditorStore((s) => s.fixRequest);
  const setFixRequest = useEditorStore((s) => s.setFixRequest);

  useEffect(() => {
    if (fixRequest && !isLoading) {
      setFixRequest(null);
      sendMessage(fixRequest);
    }
  }, [fixRequest, isLoading, sendMessage, setFixRequest]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ACCEPTED_TYPES.includes(f.type),
    );
    if (files.length > 0) addImages(files);
  }, [addImages]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) addImages(files);
    e.target.value = '';
  }, [addImages]);

  const removeImage = useCallback((index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Determine if the last message is an empty assistant message (waiting for first chunk)
  const lastMessage = messages[messages.length - 1];
  const showTypingIndicator = isStreaming && lastMessage?.role === 'assistant' && !lastMessage.content;

  return (
    <div
      className="h-full flex flex-col bg-surface"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div className="absolute inset-0 z-50 bg-accent/10 border-2 border-dashed border-accent/40 flex items-center justify-center pointer-events-none rounded-lg">
          <p className="text-accent text-xs font-mono">Drop images here</p>
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
                    {msg.images && msg.images.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {msg.images.map((img, i) => (
                          <SafeImage
                            key={i}
                            img={img}
                            alt={`Attached ${i + 1}`}
                            className="w-16 h-16 object-cover rounded border border-info/20 cursor-pointer hover:opacity-80"
                          />
                        ))}
                      </div>
                    )}
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
        {attachedImages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2 px-1">
            {attachedImages.map((img, i) => (
              <div key={i} className="relative group">
                <SafeImage
                  img={img}
                  alt={`Preview ${i + 1}`}
                  className="w-12 h-12 object-cover rounded border border-border/40"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-error text-white text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || attachedImages.length >= MAX_IMAGES}
            className="px-2 py-2 text-xs text-text-muted hover:text-text-primary border border-border/40 rounded-md hover:bg-surface-raised transition-colors disabled:opacity-30"
            title="Attach image (PNG/JPEG, max 4MB)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
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
            disabled={isLoading || (!input.trim() && attachedImages.length === 0) || (llmConfig.provider !== 'demo' && !llmConfig.apiKey)}
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
