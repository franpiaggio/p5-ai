import { type ReactNode, useState, useRef, useEffect, useCallback } from 'react';
import { SafeImage } from './SafeImage';
import { ACCEPTED_TYPES, MAX_IMAGES, fileToImageAttachment, validateAttachments } from './imageUtils';
import type { ImageAttachment } from '../../types';

interface ChatInputProps {
  onSend: (message: string, images?: ImageAttachment[]) => void;
  isLoading: boolean;
  disabled: boolean;
  showAttach: boolean;
  children: ReactNode;
}

export function ChatInput({ onSend, isLoading, disabled, showAttach, children }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [attachedImages, setAttachedImages] = useState<ImageAttachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addImages = useCallback(async (files: File[]) => {
    setImageError('');
    const remaining = MAX_IMAGES - attachedImages.length;
    if (remaining <= 0) {
      setImageError(`You can attach up to ${MAX_IMAGES} images.`);
      return;
    }

    const toProcess = files.slice(0, remaining);
    const results: ImageAttachment[] = [];
    let lastError = '';

    for (const file of toProcess) {
      try {
        results.push(await fileToImageAttachment(file));
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Invalid image file';
      }
    }

    if (results.length > 0) {
      setAttachedImages((prev) => [...prev, ...results].slice(0, MAX_IMAGES));
    }
    if (lastError) setImageError(lastError);
  }, [attachedImages.length]);

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

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && attachedImages.length === 0) return;

    const attachments = attachedImages.length > 0 ? [...attachedImages] : [];
    const validationError = validateAttachments(attachments);
    if (validationError) {
      setImageError(validationError);
      return;
    }
    setImageError('');

    const msg = input.trim();
    setInput('');
    setAttachedImages([]);
    onSend(msg || 'What do you see in this image?', attachments.length > 0 ? attachments : undefined);
  }, [input, attachedImages, onSend]);

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

  return (
    <div
      className="h-full flex flex-col bg-surface relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div className="absolute inset-0 z-50 bg-accent/10 border-2 border-dashed border-accent/40 flex items-center justify-center pointer-events-none rounded-lg">
          <p className="text-accent text-xs font-mono">Drop images here</p>
        </div>
      )}

      {children}

      <form onSubmit={handleSubmit} className="p-2 border-t border-border/40 shrink-0">
        {imageError && (
          <div className="mb-2 px-1 text-[11px] font-mono text-error">
            {imageError}
          </div>
        )}
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
          {showAttach && (
            <>
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
                disabled={isLoading || attachedImages.length >= MAX_IMAGES || disabled}
                className="px-2 py-2 text-xs text-text-muted hover:text-text-primary border border-border/40 rounded-md hover:bg-surface-raised transition-colors disabled:opacity-30"
                title="Attach image (PNG/JPEG, max 4MB)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
            </>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            data-chat-input
            placeholder="Ask AI..."
            disabled={disabled}
            className="input-field flex-1 !w-auto text-xs disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={isLoading || (!input.trim() && attachedImages.length === 0) || disabled}
            className="btn-primary px-3 py-2 text-xs"
          >
            {isLoading ? (
              <span
                className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"
                style={{ animationDuration: '0.6s' }}
              />
            ) : (
              'Send'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
