import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';

// Template parts split to calculate line offset
const HTML_BEFORE_CODE = `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"><\/script>
  <style>
    body { margin: 0; padding: 0; overflow: hidden; background: #fff; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script>
    const LINE_OFFSET = {{LINE_OFFSET}};

    window.onerror = (msg, url, line, col) => {
      // Adjust line number by subtracting the template offset
      const adjustedLine = typeof line === 'number' ? line - LINE_OFFSET : null;
      parent.postMessage({
        type: 'error',
        message: String(msg),
        line: adjustedLine > 0 ? adjustedLine : null,
        column: col || null
      }, '*');
      return true;
    };

    window.addEventListener('unhandledrejection', (event) => {
      let errorLine = null;
      let errorCol = null;
      const reason = event.reason;

      // Try to extract line from stack trace
      if (reason && reason.stack) {
        const lines = reason.stack.split('\\n');
        for (const stackLine of lines) {
          const match = stackLine.match(/:(\d+):(\d+)/);
          if (match) {
            const rawLine = parseInt(match[1], 10);
            errorLine = rawLine - LINE_OFFSET;
            errorCol = parseInt(match[2], 10);
            if (errorLine > 0) break;
          }
        }
      }

      parent.postMessage({
        type: 'error',
        message: 'Unhandled Promise: ' + String(reason),
        line: errorLine > 0 ? errorLine : null,
        column: errorCol
      }, '*');
    });

    const _log = console.log, _err = console.error, _warn = console.warn, _info = console.info;
    const fmt = (args) => args.map(a => {
      if (typeof a === 'object') try { return JSON.stringify(a, null, 2) } catch { return String(a) }
      return String(a);
    }).join(' ');
    console.log = (...a) => { parent.postMessage({ type: 'log', message: fmt(a) }, '*'); _log.apply(console, a); };
    console.info = (...a) => { parent.postMessage({ type: 'info', message: fmt(a) }, '*'); _info.apply(console, a); };
    console.error = (...a) => { parent.postMessage({ type: 'error', message: fmt(a) }, '*'); _err.apply(console, a); };
    console.warn = (...a) => { parent.postMessage({ type: 'warn', message: fmt(a) }, '*'); _warn.apply(console, a); };
  <\/script>
  <script>
`;

const HTML_AFTER_CODE = `
  <\/script>
</body>
</html>
`;

// Calculate line offset: count newlines in HTML_BEFORE_CODE
const LINE_OFFSET = HTML_BEFORE_CODE.split('\n').length - 1;

const HTML_TEMPLATE = (code: string) =>
  HTML_BEFORE_CODE.replace('{{LINE_OFFSET}}', String(LINE_OFFSET)) + code + HTML_AFTER_CODE;

export function P5Preview() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const code = useEditorStore((s) => s.code);
  const isRunning = useEditorStore((s) => s.isRunning);
  const runTrigger = useEditorStore((s) => s.runTrigger);
  const addConsoleLog = useEditorStore((s) => s.addConsoleLog);
  const addEditorError = useEditorStore((s) => s.addEditorError);

  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type) {
      const { type, message, line, column } = event.data;
      addConsoleLog({ type, message, line, column });

      // Add error marker in editor if it's an error with line info
      if (type === 'error') {
        if (typeof line === 'number') {
          addEditorError({ line, column, message });
        }
        // Auto-switch to console tab on errors
        useEditorStore.setState({ activeTab: 'console' });
      }
    }
  }, [addConsoleLog, addEditorError]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  useEffect(() => {
    if (!iframeRef.current || !isRunning) return;

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
    }

    const html = HTML_TEMPLATE(code);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    blobUrlRef.current = url;
    iframeRef.current.src = url;

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [runTrigger]);

  if (!isRunning) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-surface gap-3">
        <div className="w-12 h-12 rounded-xl bg-border/40 flex items-center justify-center">
          <svg className="w-6 h-6 text-info/50" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <span className="text-text-muted/40 text-xs font-mono">
          Alt+Enter to run
        </span>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      className="h-full w-full border-0 bg-white"
      title="p5.js Preview"
      sandbox="allow-scripts"
    />
  );
}
