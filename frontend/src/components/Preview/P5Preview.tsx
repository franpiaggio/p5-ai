import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { buildPreviewHtml } from './previewTemplate';

// Module-level ref for thumbnail capture
let _iframeEl: HTMLIFrameElement | null = null;

/** Request a thumbnail data URL from the running preview iframe. */
export function capturePreview(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!_iframeEl?.contentWindow) { resolve(null); return; }
    const timeout = setTimeout(() => { cleanup(); resolve(null); }, 2000);
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'capture') { cleanup(); resolve(e.data.dataUrl ?? null); }
    };
    const cleanup = () => { clearTimeout(timeout); window.removeEventListener('message', handler); };
    window.addEventListener('message', handler);
    _iframeEl.contentWindow.postMessage({ type: 'capture' }, '*');
  });
}

export function P5Preview() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const code = useEditorStore((s) => s.code);
  const previewCode = useEditorStore((s) => s.previewCode);
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

  // Keep module-level ref in sync for capturePreview()
  useEffect(() => {
    _iframeEl = iframeRef.current;
    return () => { _iframeEl = null; };
  });

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  useEffect(() => {
    if (!iframeRef.current || !isRunning) return;

    let cancelled = false;

    (async () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }

      const activeCode = previewCode?.code ?? code;
      const { transpiler, editorLanguage } = useEditorStore.getState();
      const jsCode = editorLanguage === 'typescript' && transpiler
        ? await transpiler(activeCode)
        : activeCode;

      if (cancelled || !iframeRef.current) return;

      const html = buildPreviewHtml(jsCode);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      iframeRef.current.src = url;
    })();

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [runTrigger, previewCode]);

  if (!isRunning) {
    const handleRun = () => {
      useEditorStore.getState().clearConsoleLogs();
      useEditorStore.getState().runSketch();
    };

    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-surface gap-3">
        <button
          onClick={handleRun}
          className="w-12 h-12 rounded-xl bg-border/40 hover:bg-accent/20 flex items-center justify-center transition-colors cursor-pointer"
        >
          <svg className="w-6 h-6 text-info/50" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <span className="text-text-muted/40 text-xs font-mono">
          <span className="hidden md:inline">Alt+Enter to run</span>
          <span className="md:hidden">Tap to run</span>
        </span>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      {previewCode && (
        <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded bg-warning/90 text-black text-[10px] font-mono font-semibold shadow">
          Preview
        </div>
      )}
      <iframe
        ref={iframeRef}
        className="h-full w-full border-0 bg-white"
        title="p5.js Preview"
        sandbox="allow-scripts"
      />
    </div>
  );
}
