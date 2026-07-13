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
        className="btn-danger min-h-[44px]"
      >
        Reject
      </button>
      <button
        onClick={acceptPendingDiff}
        className="btn-primary min-h-[44px]"
      >
        Accept
      </button>
    </div>
  );
}
