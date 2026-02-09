import { useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';

export function DiffToolbar() {
  const acceptPendingDiff = useEditorStore((s) => s.acceptPendingDiff);
  const rejectPendingDiff = useEditorStore((s) => s.rejectPendingDiff);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        rejectPendingDiff();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        acceptPendingDiff();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [acceptPendingDiff, rejectPendingDiff]);

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
        Review changes
      </span>
      <button
        onClick={rejectPendingDiff}
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
        onClick={acceptPendingDiff}
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
        Accept <span style={{ opacity: 0.7 }}>Ctrl+Enter</span>
      </button>
    </div>
  );
}
