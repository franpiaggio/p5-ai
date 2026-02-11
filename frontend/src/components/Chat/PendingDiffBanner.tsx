import { useEditorStore } from '../../store/editorStore';

export function PendingDiffBanner() {
  const acceptPendingDiff = useEditorStore((s) => s.acceptPendingDiff);
  const rejectPendingDiff = useEditorStore((s) => s.rejectPendingDiff);

  return (
    <div className="mx-3 my-2 px-3 py-2.5 rounded-md bg-warning/10 border border-warning/25 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <svg className="w-3.5 h-3.5 text-warning shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-[11px] font-mono text-text-muted truncate">
          Review changes in the editor
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={rejectPendingDiff}
          className="px-2.5 py-1 text-[10px] font-mono rounded border border-border text-text-muted hover:border-error hover:text-error transition-colors cursor-pointer"
        >
          Reject
        </button>
        <button
          onClick={acceptPendingDiff}
          className="px-2.5 py-1 text-[10px] font-mono font-semibold rounded bg-success text-white hover:opacity-85 transition-opacity cursor-pointer"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
