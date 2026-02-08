import { SafeImage } from './SafeImage';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { Message } from '../../types';

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({ msg, isLastMessage, isLoading }: {
  msg: Message;
  isLastMessage: boolean;
  isLoading: boolean;
}) {
  const time = formatTime(msg.timestamp);

  if (msg.role === 'user') {
    return (
      <div className="flex flex-col items-end">
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
    <div className="flex flex-col">
      <div className="px-3 py-2 rounded-lg text-xs leading-relaxed bg-surface-raised text-text-muted border border-border/20">
        <div className="break-words font-mono markdown-chat">
          <MarkdownRenderer
            content={msg.content}
            messageId={msg.id}
            isGenerating={isLoading && isLastMessage}
          />
        </div>
      </div>
      <span className="text-[9px] font-mono text-text-muted/30 mt-0.5 px-1">{time}</span>
    </div>
  );
}
