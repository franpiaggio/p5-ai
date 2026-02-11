import { useState, useCallback, useRef, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { simpleHash } from '../../utils/codeUtils';

// Module-level map so expanded state survives remounts during streaming
const expandedState = new Map<string, boolean>();

export function CollapsibleCodeBlock({
  code,
  language,
  stableKey,
  messageId,
  isGenerating,
}: {
  code: string;
  language: string;
  stableKey: string;
  messageId?: string;
  isGenerating?: boolean;
}) {
  const [expanded, setExpanded] = useState(() => expandedState.get(stableKey) ?? false);
  const preRef = useRef<HTMLPreElement>(null);
  const isNearBottomRef = useRef(false);

  // Auto-scroll only if user is already near the bottom
  useEffect(() => {
    if (expanded && isGenerating && preRef.current && isNearBottomRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [expanded, isGenerating, code]);

  const setPendingDiff = useEditorStore((s) => s.setPendingDiff);
  const appliedBlocks = useEditorStore((s) => s.appliedBlocks);
  const rejectedBlocks = useEditorStore((s) => s.rejectedBlocks);
  const pendingDiff = useEditorStore((s) => s.pendingDiff);

  const isJS = language === 'javascript' || language === 'js' || language === 'jsx'
    || language === 'typescript' || language === 'ts' || language === 'tsx';
  const lineCount = code.split('\n').length;
  const blockKey = messageId ? `${messageId}:${simpleHash(code)}` : '';
  const isApplied = blockKey ? !!appliedBlocks[blockKey] : false;
  const isRejected = blockKey ? !!rejectedBlocks[blockKey] : false;

  const handleToggle = useCallback(() => {
    const next = !(expandedState.get(stableKey) ?? false);
    expandedState.set(stableKey, next);
    setExpanded(next);
  }, [stableKey]);

  const [copied, setCopied] = useState(false);
  const isPending = pendingDiff?.blockKey === blockKey && !!blockKey;

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    },
    [code],
  );

  const handleApply = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (messageId && blockKey) {
        const messages = useEditorStore.getState().messages;
        const msgIdx = messages.findIndex((m) => m.id === messageId);
        const userMsg = msgIdx > 0 ? messages[msgIdx - 1] : null;
        const prompt = userMsg?.role === 'user' ? userMsg.content : undefined;
        setPendingDiff({ code, messageId, blockKey, prompt });
      }
    },
    [messageId, blockKey, code, setPendingDiff],
  );

  return (
    <div
      style={{
        margin: '8px 0',
        borderRadius: '6px',
        overflow: 'hidden',
        border: `1px solid ${isApplied ? 'var(--color-success)' : isRejected ? 'var(--color-error)' : 'var(--color-border)'}`,
        transition: 'border-color 0.2s',
      }}
    >
      <div
        onClick={handleToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          background: 'var(--color-surface)',
          borderBottom: expanded ? '1px solid var(--color-border)' : 'none',
          fontSize: '10px',
          fontFamily: 'monospace',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              display: 'inline-block',
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s',
              fontSize: '8px',
            }}
          >
            &#9654;
          </span>
          {isGenerating ? (
            <span
              style={{
                color: 'var(--color-info)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                animation: 'generating-pulse 1.5s ease-in-out infinite',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--color-info)',
                  animation: 'generating-pulse 1.5s ease-in-out infinite',
                }}
              />
              Generating code…
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              <span>output</span>
              <span style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>
                {lineCount} {lineCount === 1 ? 'line' : 'lines'}
              </span>
            </span>
          )}
        </span>
        {!isGenerating && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={handleCopy}
              title="Copy code"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                color: copied ? 'var(--color-success)' : 'var(--color-text-muted)',
                transition: 'color 0.15s',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </button>
            {isJS && (
              isApplied ? (
                <span
                  style={{
                    background: 'color-mix(in srgb, var(--color-success) 20%, transparent)',
                    color: 'var(--color-success)',
                    border: 'none',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                  }}
                >
                  Applied
                </span>
              ) : isRejected ? (
                <span
                  style={{
                    background: 'color-mix(in srgb, var(--color-error) 20%, transparent)',
                    color: 'var(--color-error)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                  }}
                >
                  Rejected
                </span>
              ) : isPending ? (
                <span
                  style={{
                    background: 'color-mix(in srgb, var(--color-warning) 20%, transparent)',
                    color: 'var(--color-warning)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                  }}
                >
                  Reviewing...
                </span>
              ) : (
                <button
                  onClick={handleApply}
                  style={{
                    background: 'var(--color-accent)',
                    color: '#fff',
                    border: 'none',
                    padding: '2px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  Apply
                </button>
              )
            )}
          </span>
        )}
      </div>
      {expanded && (
        <pre
          ref={preRef}
          onScroll={() => {
            const el = preRef.current;
            if (el) isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
          }}
          className="m-0 p-2.5 text-[11px] leading-relaxed bg-surface-raised overflow-auto max-h-[300px] text-text-primary"
        >
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
