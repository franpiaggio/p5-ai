import { useState, useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useAuthStore } from '../../store/authStore';
import { useUpdateSketch } from '../../hooks/useSketches';
import { CodeModal } from './CodeModal';
import { formatDate } from './CodeModal';
import type { CodeChange } from '../../types';

export function HistoryPanel() {
  const codeHistory = useEditorStore((s) => s.codeHistory);
  const setPendingDiff = useEditorStore((s) => s.setPendingDiff);
  const pendingDiff = useEditorStore((s) => s.pendingDiff);
  const previewCode = useEditorStore((s) => s.previewCode);
  const setPreviewCode = useEditorStore((s) => s.setPreviewCode);
  const clearCodeHistory = useEditorStore((s) => s.clearCodeHistory);
  const code = useEditorStore((s) => s.code);
  const sketchId = useEditorStore((s) => s.sketchId);
  const user = useAuthStore((s) => s.user);

  const updateSketchMut = useUpdateSketch();
  const [modalEntry, setModalEntry] = useState<CodeChange | null>(null);

  // Sync history to backend when logged in (debounced)
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncRef = useRef<string>('');

  useEffect(() => {
    if (!user) return;

    const serialized = JSON.stringify(codeHistory.map(({ id, messageId, timestamp, summary, newCode, previousCode }) => ({
      id, messageId, timestamp, summary, newCode, previousCode,
    })));

    if (serialized === lastSyncRef.current) return;

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      if (sketchId) {
        updateSketchMut.mutate(
          { id: sketchId, code, codeHistory },
          { onSuccess: () => { lastSyncRef.current = serialized; } },
        );
      }
    }, 3000);

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [codeHistory, code, user, sketchId, updateSketchMut]);

  const handleRestore = useCallback(
    (entry: CodeChange) => {
      setPendingDiff({ code: entry.newCode, messageId: '', blockKey: '', isRestore: true });
    },
    [setPendingDiff],
  );

  const handlePreview = useCallback(
    (entry: CodeChange) => {
      setPreviewCode({ code: entry.newCode, entryId: entry.id });
    },
    [setPreviewCode],
  );

  const isPreviewActive = previewCode !== null;
  const sorted = [...codeHistory].reverse();
  const currentIdx = previewCode
    ? sorted.findIndex((e) => e.id === previewCode.entryId)
    : sorted.findIndex((e) => e.newCode === code);

  return (
    <div className="h-full flex flex-col bg-surface">
      <div className="flex-1 overflow-y-auto p-2 font-mono text-xs leading-relaxed">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-warning/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-text-muted/30 text-xs font-mono">
              No changes yet
            </p>
          </div>
        ) : (
          sorted.map((entry, i) => {
            const isHighlighted = i === currentIdx;
            const isRealCurrent = !isPreviewActive && isHighlighted;
            return (
              <div
                key={entry.id}
                className={`mb-2 p-2.5 rounded-lg border transition-colors ${
                  isHighlighted
                    ? 'border-info/40 bg-info/5'
                    : 'border-border/30 bg-surface-raised hover:border-border/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted/40 text-[10px]">
                        #{sorted.length - i}
                      </span>
                      <span className="text-text-primary text-xs truncate">
                        {entry.summary || 'Code change'}
                      </span>
                      {entry.isRestore && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/15 text-accent shrink-0">
                          restored
                        </span>
                      )}
                      {isRealCurrent && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-info/15 text-info shrink-0">
                          current
                        </span>
                      )}
                      {isPreviewActive && isHighlighted && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-warning/15 text-warning shrink-0">
                          preview
                        </span>
                      )}
                    </div>
                    {entry.prompt && (
                      <span className="text-[10px] text-text-muted/50 mt-0.5 block truncate italic">
                        &ldquo;{entry.prompt}&rdquo;
                      </span>
                    )}
                    <span className="text-[10px] text-text-muted/35 mt-0.5 block">
                      {formatDate(entry.timestamp)}
                    </span>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => setModalEntry(entry)}
                      className="text-[10px] px-2 py-0.5 rounded border border-border/40 text-text-muted/60 hover:text-info hover:border-info/40 transition-colors"
                    >
                      View Diff
                    </button>
                    <button
                      onClick={() => handlePreview(entry)}
                      disabled={isRealCurrent || !!pendingDiff}
                      className="text-[10px] px-2 py-0.5 rounded border border-info/40 text-info hover:bg-info/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => handleRestore(entry)}
                      disabled={isRealCurrent || !!pendingDiff || !!entry.isRestore}
                      className="text-[10px] px-2 py-0.5 rounded bg-warning/15 text-warning hover:bg-warning/25 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    >
                      Restore
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {sorted.length > 0 && (
        <div className="px-2 py-1.5 border-t border-border/40 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-mono text-text-muted/30">
            {sorted.length} {sorted.length === 1 ? 'change' : 'changes'}
            {user && <span className="ml-1 text-info/50">synced</span>}
          </span>
          <button
            onClick={clearCodeHistory}
            className="text-[10px] font-mono text-text-muted/30 hover:text-accent transition-colors"
          >
            clear
          </button>
        </div>
      )}

      {modalEntry && (
        <CodeModal entry={modalEntry} onClose={() => setModalEntry(null)} />
      )}
    </div>
  );
}
