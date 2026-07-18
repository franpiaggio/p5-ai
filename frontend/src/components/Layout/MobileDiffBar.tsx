import { useEditorStore } from '../../store/editorStore';

export function MobileDiffBar() {
  const acceptPendingDiff = useEditorStore((s) => s.acceptPendingDiff);
  const rejectPendingDiff = useEditorStore((s) => s.rejectPendingDiff);
  const review = useEditorStore((s) => s.pendingFilesReview);
  const acceptReviewFile = useEditorStore((s) => s.acceptReviewFile);
  const rejectReviewFile = useEditorStore((s) => s.rejectReviewFile);

  const accept = review ? acceptReviewFile : acceptPendingDiff;
  const reject = review ? rejectReviewFile : rejectPendingDiff;
  const label = review
    ? `${review.changes[review.index].name}${
        review.changes.length > 1 ? ` (${review.index + 1}/${review.changes.length})` : ''
      }`
    : 'Review changes';

  return (
    <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 bg-surface-raised border-t border-border/40">
      <span className="text-[11px] text-text-muted/60 flex-1 truncate font-mono">
        {label}
      </span>
      <button
        onClick={reject}
        className="btn-danger min-h-[44px]"
      >
        Reject
      </button>
      <button
        onClick={accept}
        className="btn-primary min-h-[44px]"
      >
        Accept
      </button>
    </div>
  );
}
