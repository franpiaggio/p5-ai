import { useState, useEffect, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useResizable } from '../../hooks/useResizable';
import { P5Preview } from '../Preview/P5Preview';
import { ChatPanel } from '../Chat/ChatPanel';
import { ConsolePanel } from '../Console/ConsolePanel';
import { HistoryPanel } from '../History/HistoryPanel';
import { CodeEditor } from '../Editor/CodeEditor';
import { MobileDiffBar } from './MobileDiffBar';
import { MobileTabBar } from './MobileTabBar';

export function MobileLayout() {
  const activeTab = useEditorStore((s) => s.activeTab);
  const pendingDiff = useEditorStore((s) => s.pendingDiff);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enterFullscreen = useCallback(() => {
    history.pushState({ fullscreen: true }, '');
    setIsFullscreen(true);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const handlePopState = () => setIsFullscreen(false);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isFullscreen]);

  const { size, containerRef, handleMouseDown, handleTouchStart } = useResizable({
    direction: 'vertical',
    initialSize: 65,
    minSize: 15,
    maxSize: 85,
  });

  if (isFullscreen) {
    return (
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="flex-1 min-h-0">
          <P5Preview />
        </div>
        <button
          onClick={() => { history.back(); }}
          className="absolute top-2 right-2 z-10 btn-icon bg-surface/80 backdrop-blur border border-border/40 text-text-muted/60 hover:text-text-primary"
          title="Exit fullscreen"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 9L4 4m0 0h4M4 4v4m11-3l5-5m0 0h-4m4 0v4M9 15l-5 5m0 0h4m-4 0v-4m11 3l5 5m0 0h-4m4 0v-4" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 relative" style={{ height: `${size}%` }}>
        <P5Preview />
        <button
          onClick={enterFullscreen}
          className="absolute top-2 right-2 z-10 btn-icon bg-surface/80 backdrop-blur border border-border/40 text-text-muted/60 hover:text-text-primary"
          title="Fullscreen"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
          </svg>
        </button>
      </div>

      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="shrink-0 h-3 flex items-center justify-center cursor-row-resize bg-surface-raised border-y border-border/40 touch-none select-none"
      >
        <div className="w-10 h-1 rounded-full bg-border/60" />
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeTab === 'chat' && <ChatPanel />}
        {activeTab === 'code' && <CodeEditor />}
        {activeTab === 'console' && <ConsolePanel />}
        {activeTab === 'history' && <HistoryPanel />}
      </div>

      {pendingDiff && <MobileDiffBar />}
      <MobileTabBar />
    </div>
  );
}
