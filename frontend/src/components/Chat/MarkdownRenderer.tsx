import { useState, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useEditorStore, simpleHash } from '../../store/editorStore';

interface MarkdownRendererProps {
  content: string;
  messageId?: string;
  isGenerating?: boolean;
}

// Module-level map so expanded state survives remounts during streaming
const expandedState = new Map<string, boolean>();


function CollapsibleCodeBlock({
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
  const [expanded, setExpanded] = useState(() => {
    const saved = expandedState.get(stableKey);
    if (saved !== undefined) return saved;
    return !!isGenerating;
  });
  const setPendingDiff = useEditorStore((s) => s.setPendingDiff);
  const appliedBlocks = useEditorStore((s) => s.appliedBlocks);
  const pendingDiff = useEditorStore((s) => s.pendingDiff);

  const isJS = language === 'javascript' || language === 'js' || language === 'jsx'
    || language === 'typescript' || language === 'ts' || language === 'tsx';
  const lineCount = code.split('\n').length;
  const blockKey = messageId ? `${messageId}:${simpleHash(code)}` : '';
  const isApplied = blockKey ? !!appliedBlocks[blockKey] : false;

  const handleToggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      expandedState.set(stableKey, next);
      return next;
    });
  }, [stableKey]);

  const isPending = pendingDiff?.blockKey === blockKey && !!blockKey;

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
        border: `1px solid ${isApplied ? 'var(--color-success)' : 'var(--color-border)'}`,
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
      </div>
      {expanded && (
        <pre
          style={{
            margin: 0,
            padding: '10px',
            fontSize: '11px',
            lineHeight: '1.5',
            background: 'var(--color-surface-raised)',
            overflow: 'auto',
            color: 'var(--color-text-primary)',
          }}
        >
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}

export function MarkdownRenderer({ content, messageId, isGenerating }: MarkdownRendererProps) {
  const blockIndexRef = useRef(0);
  blockIndexRef.current = 0;

  return (
    <ReactMarkdown
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const codeString = String(children).replace(/\n$/, '');
          const isBlock =
            match || codeString.includes('\n') || codeString.length > 80;

          if (isBlock) {
            const language = match?.[1] || 'javascript';
            const idx = blockIndexRef.current++;
            const stableKey = `${messageId}:${idx}`;
            return (
              <CollapsibleCodeBlock
                key={stableKey}
                code={codeString}
                language={language}
                stableKey={stableKey}
                messageId={messageId}
                isGenerating={isGenerating}
              />
            );
          }

          return (
            <code
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '3px',
                padding: '1px 4px',
                fontSize: '0.9em',
                fontFamily: 'monospace',
                color: 'var(--color-accent)',
              }}
              {...props}
            >
              {children}
            </code>
          );
        },
        h1({ children }) {
          return (
            <h1 style={{ fontSize: '16px', fontWeight: 700, margin: '12px 0 6px', color: 'var(--color-text-primary)' }}>
              {children}
            </h1>
          );
        },
        h2({ children }) {
          return (
            <h2 style={{ fontSize: '14px', fontWeight: 700, margin: '10px 0 4px', color: 'var(--color-text-primary)' }}>
              {children}
            </h2>
          );
        },
        h3({ children }) {
          return (
            <h3 style={{ fontSize: '12px', fontWeight: 700, margin: '8px 0 4px', color: 'var(--color-text-primary)' }}>
              {children}
            </h3>
          );
        },
        p({ children }) {
          return <p style={{ margin: '4px 0', lineHeight: '1.5' }}>{children}</p>;
        },
        ul({ children }) {
          return <ul style={{ margin: '4px 0', paddingLeft: '18px', listStyleType: 'disc' }}>{children}</ul>;
        },
        ol({ children }) {
          return <ol style={{ margin: '4px 0', paddingLeft: '18px', listStyleType: 'decimal' }}>{children}</ol>;
        },
        li({ children }) {
          return <li style={{ margin: '2px 0', lineHeight: '1.5' }}>{children}</li>;
        },
        a({ href, children }) {
          const safeHref =
            href &&
            /^https?:\/\/|^mailto:/i.test(href)
              ? href
              : undefined;
          if (!safeHref) return <span>{children}</span>;
          return (
            <a href={safeHref} target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--color-info)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
              {children}
            </a>
          );
        },
        blockquote({ children }) {
          return (
            <blockquote style={{ margin: '6px 0', paddingLeft: '10px', borderLeft: '3px solid var(--color-accent)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              {children}
            </blockquote>
          );
        },
        strong({ children }) {
          return <strong style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{children}</strong>;
        },
        em({ children }) {
          return <em style={{ fontStyle: 'italic' }}>{children}</em>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
