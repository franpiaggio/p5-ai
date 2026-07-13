import { useEditorStore } from '../../store/editorStore';

export function MobileDiffBar() {
  const acceptPendingDiff = useEditorStore((s) => s.acceptPendingDiff);
  const rejectPendingDiff = useEditorStore((s) => s.rejectPendingDiff);

  return (
    <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 bg-surface-raised border-t border-border/40">
      <span className="text-[11px] text-text-muted/60 flex-1">
        Review changes
      </span>
      <button
        onClick={rejectPendingDiff}
        className="min-h-[44px] px-5 rounded-lg border border-border/60 text-text-muted text-xs hover:border-error hover:text-error transition-colors"
      >
        Reject
      </button>
      <button
        onClick={acceptPendingDiff}
        className="min-h-[44px] px-5 rounded-lg bg-success text-white text-xs font-semibold transition-opacity hover:opacity-85"
      >
        Accept
      </button>
    </div>
  );
}
