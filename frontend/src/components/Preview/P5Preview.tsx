import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';

const HTML_TEMPLATE = (code: string) => `
<!DOCTYPE html>
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
    window.onerror = (msg, url, line) => {
      parent.postMessage({ type: 'error', message: String(msg), line }, '*');
      return true;
    };
    const _log = console.log, _err = console.error, _warn = console.warn;
    const fmt = (args) => args.map(a => {
      if (typeof a === 'object') try { return JSON.stringify(a) } catch { return String(a) }
      return String(a);
    }).join(' ');
    console.log = (...a) => { parent.postMessage({ type: 'log', message: fmt(a) }, '*'); _log.apply(console, a); };
    console.error = (...a) => { parent.postMessage({ type: 'error', message: fmt(a) }, '*'); _err.apply(console, a); };
    console.warn = (...a) => { parent.postMessage({ type: 'warn', message: fmt(a) }, '*'); _warn.apply(console, a); };
  <\/script>
  <script>${code}<\/script>
</body>
</html>
`;

export function P5Preview() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const code = useEditorStore((s) => s.code);
  const isRunning = useEditorStore((s) => s.isRunning);
  const runTrigger = useEditorStore((s) => s.runTrigger);
  const addConsoleLog = useEditorStore((s) => s.addConsoleLog);

  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type) {
      addConsoleLog({ type: event.data.type, message: event.data.message });
    }
  }, [addConsoleLog]);

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
      <div className="h-full w-full flex flex-col items-center justify-center bg-[#1a1a2e] gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#0f3460]/40 flex items-center justify-center">
          <svg className="w-6 h-6 text-[#53d8fb]/50" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <span className="text-[#a8b2d1]/40 text-xs font-mono">
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
