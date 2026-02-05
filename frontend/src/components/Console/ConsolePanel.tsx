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
  const setFixRequest = useEditorStore((s) => s.setFixRequest);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const isLoading = useEditorStore((s) => s.isLoading);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs.length]);

  const formatLineInfo = (line?: number, column?: number) => {
    if (typeof line !== 'number') return null;
    return column ? `${line}:${column}` : `${line}`;
  };

  return (
    <div className="h-full flex flex-col bg-surface">
      <div className="flex-1 overflow-y-auto p-2 font-mono text-xs leading-relaxed">
        {consoleLogs.length === 0 ? (
          <div className="text-text-muted/30 italic p-2">
            Console output will appear here...
          </div>
        ) : (
          consoleLogs.map((log) => {
            const lineInfo = formatLineInfo(log.line, log.column);
            const isError = log.type === 'error';
            return (
              <div key={log.id} className={`py-0.5 flex items-start gap-2 group ${LOG_COLORS[log.type] || LOG_COLORS.log}`}>
                <span className="opacity-40 shrink-0">
                  {LOG_PREFIX[log.type] || LOG_PREFIX.log}
                </span>
                {lineInfo && (
                  <span className="opacity-60 shrink-0 text-info">
                    [{lineInfo}]
                  </span>
                )}
                <span className="break-all flex-1">{log.message}</span>
                {isError && (
                  <button
                    onClick={() => {
                      const location = lineInfo ? ` (line ${lineInfo})` : '';
                      setFixRequest(`Fix this error${location}: ${log.message}`);
                      setActiveTab('chat');
                    }}
                    disabled={isLoading}
                    className="shrink-0 px-1.5 py-0.5 text-[10px] font-mono rounded bg-accent/15 text-accent hover:bg-accent/25 transition-colors disabled:opacity-30 cursor-pointer"
                  >
                    Fix this
                  </button>
                )}
              </div>
            );
          })
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
