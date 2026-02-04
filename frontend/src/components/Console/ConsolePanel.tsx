import { useRef, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';

const LOG_COLORS: Record<string, string> = {
  error: 'text-accent',
  warn: 'text-warning',
  info: 'text-info',
  log: 'text-text-primary',
};

const LOG_PREFIX: Record<string, string> = {
  error: '[ERR]',
  warn: '[WRN]',
  info: '[INF]',
  log: '[LOG]',
};

export function ConsolePanel() {
  const consoleLogs = useEditorStore((s) => s.consoleLogs);
  const clearConsoleLogs = useEditorStore((s) => s.clearConsoleLogs);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs.length]);

  return (
    <div className="h-full flex flex-col bg-surface">
      <div className="flex-1 overflow-y-auto p-2 font-mono text-xs leading-relaxed">
        {consoleLogs.length === 0 ? (
          <div className="text-text-muted/30 italic p-2">
            Console output will appear here...
          </div>
        ) : (
          consoleLogs.map((log) => (
            <div key={log.id} className={`py-px flex gap-2 ${LOG_COLORS[log.type] || LOG_COLORS.log}`}>
              <span className="opacity-40 shrink-0">
                {LOG_PREFIX[log.type] || LOG_PREFIX.log}
              </span>
              <span className="break-all">{log.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      {consoleLogs.length > 0 && (
        <div className="px-2 py-1 border-t border-border/40 flex justify-end shrink-0">
          <button
            onClick={clearConsoleLogs}
            className="text-[10px] font-mono text-text-muted/30 hover:text-accent transition-colors"
          >
            clear
          </button>
        </div>
      )}
    </div>
  );
}
