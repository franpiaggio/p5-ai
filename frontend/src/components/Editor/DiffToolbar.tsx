import { useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';

/** Floating accept/reject controls over the diff editor. Handles both the
 * single-file pendingDiff and the multi-file pendingFilesReview (Cursor-style:
 * one file at a time, with an Accept-all shortcut). */
export function DiffToolbar() {
  const acceptPendingDiff = useEditorStore((s) => s.acceptPendingDiff);
  const rejectPendingDiff = useEditorStore((s) => s.rejectPendingDiff);
  const review = useEditorStore((s) => s.pendingFilesReview);
  const acceptReviewFile = useEditorStore((s) => s.acceptReviewFile);
  const rejectReviewFile = useEditorStore((s) => s.rejectReviewFile);
  const acceptAllReviewFiles = useEditorStore((s) => s.acceptAllReviewFiles);

  const accept = review ? acceptReviewFile : acceptPendingDiff;
  const reject = review ? rejectReviewFile : rejectPendingDiff;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Enter accepts, Escape rejects. Capture phase + stopPropagation so the
      // shortcuts win even while the read-only diff editor has focus (Monaco
      // routes keystrokes through a hidden textarea that would otherwise
      // swallow them — that's why they only worked after leaving the editor).
      // The chat input is disabled during review (see ChatPanel `chatDisabled`),
      // so repurposing plain Enter here can't collide with sending a message.
      // We handle keys from the chat input (so focus can stay there — Enter
      // accepts / Escape rejects without leaving the field) and from the diff
      // editor's own hidden textarea (which lives inside `.monaco-editor`).
      // Any *other* form field (e.g. an open modal's input) keeps its keys.
      const target = e.target as HTMLElement | null;
      const editable =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      const isOwnField =
        !!target &&
        (target.hasAttribute('data-chat-input') || !!target.closest('.monaco-editor'));
      if (editable && !isOwnField) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        reject();
      }
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        accept();
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [accept, reject]);

  const change = review ? review.changes[review.index] : null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 20,
        zIndex: 10,
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '6px 10px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        fontFamily: 'monospace',
        fontSize: 11,
      }}
    >
      <span style={{ color: 'var(--color-text-muted)', marginRight: 4 }}>
        {change ? (
          <>
            <span style={{ color: 'var(--color-text-primary, inherit)' }}>
              {change.name}
            </span>
            {change.isNew && <span style={{ opacity: 0.6 }}> (new)</span>}
            {review!.changes.length > 1 && (
              <span style={{ opacity: 0.6 }}>
                {' '}
                {review!.index + 1}/{review!.changes.length}
              </span>
            )}
          </>
        ) : (
          'Review changes'
        )}
      </span>
      <button
        onClick={reject}
        style={{
          background: 'transparent',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-muted)',
          padding: '4px 12px',
          borderRadius: 5,
          cursor: 'pointer',
          fontSize: 11,
          fontFamily: 'monospace',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#ff5555';
          e.currentTarget.style.color = '#ff5555';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.color = 'var(--color-text-muted)';
        }}
      >
        Reject <span style={{ opacity: 0.5 }}>Esc</span>
      </button>
      <button
        onClick={accept}
        style={{
          background: 'var(--color-success, #22c55e)',
          border: 'none',
          color: '#fff',
          padding: '4px 12px',
          borderRadius: 5,
          cursor: 'pointer',
          fontSize: 11,
          fontFamily: 'monospace',
          fontWeight: 600,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        Accept <span style={{ opacity: 0.7 }}>↵</span>
      </button>
      {review && review.changes.length - review.index > 1 && (
        <button
          onClick={acceptAllReviewFiles}
          style={{
            background: 'transparent',
            border: '1px solid var(--color-success, #22c55e)',
            color: 'var(--color-success, #22c55e)',
            padding: '4px 12px',
            borderRadius: 5,
            cursor: 'pointer',
            fontSize: 11,
            fontFamily: 'monospace',
            fontWeight: 600,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          Accept all
        </button>
      )}
    </div>
  );
}
