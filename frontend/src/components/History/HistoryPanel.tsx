import { useState, useCallback, useEffect, useRef } from 'react';
import { DiffEditor, type DiffOnMount } from '@monaco-editor/react';
import { useEditorStore } from '../../store/editorStore';
import { useAuthStore } from '../../store/authStore';
import { updateSketch } from '../../services/api';
import type { CodeChange } from '../../types';

function formatDate(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today ${time}`;
  const date = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${date} ${time}`;
}

function CodeModal({
  entry,
  onClose,
}: {
  entry: CodeChange;
  onClose: () => void;
}) {
  const handleDiffMount: DiffOnMount = (editor) => {
    let attempts = 0;
    const tryScroll = () => {
      const changes = editor.getLineChanges();
      if (changes && changes.length > 0) {
        const first = changes[0];
        const line = first.modifiedStartLineNumber || first.originalStartLineNumber;
        if (line) {
          editor.revealLineInCenter(line);
        }
      } else if (attempts < 10) {
        attempts++;
        requestAnimationFrame(tryScroll);
      }
    };
    requestAnimationFrame(tryScroll);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface-raised rounded-xl w-full max-w-3xl h-[80vh] flex flex-col border border-border/60 shadow-2xl">
        <div className="flex justify-between items-center px-5 py-3 border-b border-border/40 shrink-0">
          <div>
            <h3 className="text-sm font-mono font-semibold text-text-primary">
              {entry.summary || 'Code change'}
            </h3>
            <span className="text-[10px] font-mono text-text-muted/40">
              {formatDate(entry.timestamp)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted/40 hover:text-accent transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <DiffEditor
            original={entry.previousCode}
            modified={entry.newCode}
            language="javascript"
            theme="vs-dark"
            onMount={handleDiffMount}
            options={{
              readOnly: true,
              renderSideBySide: false,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 12,
              lineNumbers: 'on',
              renderOverviewRuler: false,
              contextmenu: false,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function HistoryPanel() {
  const codeHistory = useEditorStore((s) => s.codeHistory);
  const undoCodeChange = useEditorStore((s) => s.undoCodeChange);
  const clearCodeHistory = useEditorStore((s) => s.clearCodeHistory);
  const code = useEditorStore((s) => s.code);
  const sketchId = useEditorStore((s) => s.sketchId);
  const user = useAuthStore((s) => s.user);

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
    syncTimerRef.current = setTimeout(async () => {
      try {
        if (sketchId) {
          await updateSketch(sketchId, { code, codeHistory: codeHistory });
          lastSyncRef.current = serialized;
        }
      } catch {
        // Silent fail — sync is best-effort
      }
    }, 3000);

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [codeHistory, code, user, sketchId]);

  const handleRestore = useCallback(
    (id: string) => {
      undoCodeChange(id);
    },
    [undoCodeChange],
  );

  const sorted = [...codeHistory].reverse();

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
            const isCurrent = entry.newCode === code;
            return (
              <div
                key={entry.id}
                className={`mb-2 p-2.5 rounded-lg border transition-colors ${
                  isCurrent
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
                      {isCurrent && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-info/15 text-info shrink-0">
                          current
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-text-muted/35 mt-0.5 block">
                      {formatDate(entry.timestamp)}
                    </span>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => setModalEntry(entry)}
                      className="text-[10px] px-2 py-0.5 rounded border border-border/40 text-text-muted/60 hover:text-info hover:border-info/40 transition-colors"
                    >
                      View
                    </button>
                    {!isCurrent && (
                      <button
                        onClick={() => handleRestore(entry.id)}
                        className="text-[10px] px-2 py-0.5 rounded bg-warning/15 text-warning hover:bg-warning/25 transition-colors"
                      >
                        Restore
                      </button>
                    )}
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
