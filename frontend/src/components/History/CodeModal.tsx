import { useEscapeClose } from '../../hooks/useEscapeClose';
import { DiffEditor, type DiffOnMount } from '@monaco-editor/react';
import type { CodeChange } from '../../types';

export function formatDate(ts: number) {
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

export function CodeModal({
  entry,
  onClose,
}: {
  entry: CodeChange;
  onClose: () => void;
}) {
  useEscapeClose(true, onClose);
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
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-panel max-w-3xl h-[80vh] flex flex-col">
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
            className="modal-close"
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
