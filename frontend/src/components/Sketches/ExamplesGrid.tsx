import { useRef, useEffect, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { SKETCH_EXAMPLES } from '../../data/sketchExamples';
import { buildPreviewHtml } from '../Preview/previewTemplate';
import { guardUnsaved } from '../../utils/unsavedGuard';

const CAPTURE_RENDER_DELAY_MS = 600;
const CAPTURE_TIMEOUT_MS = 8000;

/** Renders a p5 sketch in a hidden iframe, captures a snapshot, displays as image. */
function ExamplePreview({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  // Lazy-load: only start capture when card scrolls into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: '300px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Create hidden iframe, render sketch, capture screenshot, tear down
  useEffect(() => {
    if (!visible || thumbnail || !containerRef.current) return;

    const html = buildPreviewHtml(code);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    iframe.sandbox.add('allow-scripts');
    iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;opacity:0;pointer-events:none;z-index:-1';
    containerRef.current.style.position = 'relative';
    containerRef.current.appendChild(iframe);

    let cleaned = false;
    let captureTimer: ReturnType<typeof setTimeout>;
    let timeoutTimer: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      window.removeEventListener('message', onMessage);
      clearTimeout(captureTimer);
      clearTimeout(timeoutTimer);
      try { iframe.remove(); } catch { /* already removed */ }
      URL.revokeObjectURL(url);
    };

    // Match response to THIS iframe via e.source
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow) return;
      if (e.data?.type === 'capture' && e.data.dataUrl) {
        setThumbnail(e.data.dataUrl);
        cleanup();
      }
    };

    window.addEventListener('message', onMessage);

    // After iframe loads (p5.js from CDN), wait for a few draw frames then capture
    iframe.addEventListener('load', () => {
      captureTimer = setTimeout(() => {
        try { iframe.contentWindow?.postMessage({ type: 'capture' }, '*'); } catch { /* ignore */ }
      }, CAPTURE_RENDER_DELAY_MS);
    });

    timeoutTimer = setTimeout(cleanup, CAPTURE_TIMEOUT_MS);
    iframe.src = url;

    return cleanup;
  }, [visible, code, thumbnail]);

  return (
    <div ref={containerRef} className="w-full aspect-[4/3] bg-surface-alt overflow-hidden">
      {thumbnail ? (
        <img src={thumbnail} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {visible ? (
            <div className="w-4 h-4 border-2 border-text-muted/20 border-t-info/40 rounded-full animate-spin" />
          ) : (
            <svg className="w-8 h-8 text-text-muted/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}

export function ExamplesGrid() {
  const loadExample = (idx: number) => {
    const example = SKETCH_EXAMPLES[idx];
    guardUnsaved(() => {
      const { runTrigger } = useEditorStore.getState();
      useEditorStore.setState({
        code: example.code,
        lastSavedCode: example.code,
        sketchId: null,
        sketchTitle: example.label,
        isRunning: true,
        runTrigger: runTrigger + 1,
        previewCode: null,
        pendingDiff: null,
        consoleLogs: [],
        editorErrors: [],
        messages: [],
        appliedBlocks: {},
        codeHistory: [],
        currentPage: 'editor',
      });
    });
  };

  const goBack = () => useEditorStore.getState().setCurrentPage('editor');

  return (
    <div className="h-dvh bg-surface flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-1.5 rounded hover:bg-border/30 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-info font-bold text-base">p5</span>
            <span className="text-text-muted/30">|</span>
            <h1 className="text-sm font-mono text-text-primary">Examples</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {SKETCH_EXAMPLES.map((example, idx) => (
            <div
              key={idx}
              onClick={() => loadExample(idx)}
              className="bg-panel rounded-lg border border-border/30 hover:border-info/30 transition-colors group flex flex-col overflow-hidden cursor-pointer"
            >
              <ExamplePreview code={example.code} />
              <div className="p-3">
                <h3 className="text-sm font-mono text-text-primary group-hover:text-info transition-colors truncate">
                  {example.label}
                </h3>
                <p className="text-[10px] font-mono text-text-muted/40 mt-1.5 line-clamp-2">
                  {example.prompt}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
