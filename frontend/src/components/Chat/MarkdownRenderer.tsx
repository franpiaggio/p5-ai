import { useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { CollapsibleCodeBlock } from './CollapsibleCodeBlock';

interface MarkdownRendererProps {
  content: string;
  messageId?: string;
  isGenerating?: boolean;
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
