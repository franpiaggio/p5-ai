import { useEditorStore } from '../../store/editorStore';

export function PendingDiffBanner() {
  const acceptPendingDiff = useEditorStore((s) => s.acceptPendingDiff);
  const rejectPendingDiff = useEditorStore((s) => s.rejectPendingDiff);
  const review = useEditorStore((s) => s.pendingFilesReview);
  const acceptReviewFile = useEditorStore((s) => s.acceptReviewFile);
  const rejectReviewFile = useEditorStore((s) => s.rejectReviewFile);

  const accept = review ? acceptReviewFile : acceptPendingDiff;
  const reject = review ? rejectReviewFile : rejectPendingDiff;
  const label = review
    ? `Reviewing ${review.changes[review.index].name}${
        review.changes.length > 1 ? ` (${review.index + 1}/${review.changes.length})` : ''
      }`
    : 'Review changes in the editor';

  return (
    <div className="mx-3 my-2 px-3 py-2.5 rounded-md bg-warning/10 border border-warning/25 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <svg className="w-3.5 h-3.5 text-warning shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-[11px] text-text-muted truncate font-mono">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={reject}
          className="btn-danger btn-sm"
        >
          Reject
        </button>
        <button
          onClick={accept}
          className="btn-primary btn-sm"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
