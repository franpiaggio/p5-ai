import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useResizable } from '../../hooks/useResizable';
import { P5Preview } from '../Preview/P5Preview';
import { ChatPanel } from '../Chat/ChatPanel';
import { ConsolePanel } from '../Console/ConsolePanel';
import { HistoryPanel } from '../History/HistoryPanel';
import { CodeEditor } from '../Editor/CodeEditor';

function MobileDiffBar() {
  const acceptPendingDiff = useEditorStore((s) => s.acceptPendingDiff);
  const rejectPendingDiff = useEditorStore((s) => s.rejectPendingDiff);

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-surface-raised border-y border-border/40">
      <span className="text-[11px] font-mono text-text-muted/60 flex-1">
        Review changes
      </span>
      <button
        onClick={rejectPendingDiff}
        className="min-h-[44px] px-4 rounded-lg border border-border/60 text-text-muted text-xs font-mono hover:border-accent hover:text-accent transition-colors"
      >
        Reject
      </button>
      <button
        onClick={acceptPendingDiff}
        className="min-h-[44px] px-4 rounded-lg bg-success text-white text-xs font-mono font-semibold transition-opacity hover:opacity-85"
      >
        Accept
      </button>
    </div>
  );
}

function MobileTabBar() {
  const activeTab = useEditorStore((s) => s.activeTab);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);

  return (
    <div className="shrink-0 flex bg-surface-raised border-t border-border/60">
      <button
        onClick={() => setActiveTab('chat')}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[48px] relative transition-colors ${
          activeTab === 'chat' ? 'text-text-primary' : 'text-text-muted/40'
        }`}
      >
        {activeTab === 'chat' && <div className="absolute top-0 left-3 right-3 h-[2px] bg-accent" />}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="text-[10px] font-mono">Chat</span>
      </button>
      <button
        onClick={() => setActiveTab('code')}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[48px] relative transition-colors ${
          activeTab === 'code' ? 'text-text-primary' : 'text-text-muted/40'
        }`}
      >
        {activeTab === 'code' && <div className="absolute top-0 left-3 right-3 h-[2px] bg-accent" />}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        <span className="text-[10px] font-mono">Code</span>
      </button>
      <button
        onClick={() => setActiveTab('console')}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[48px] relative transition-colors ${
          activeTab === 'console' ? 'text-text-primary' : 'text-text-muted/40'
        }`}
      >
        {activeTab === 'console' && <div className="absolute top-0 left-3 right-3 h-[2px] bg-info" />}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-[10px] font-mono">Console</span>
      </button>
      <button
        onClick={() => setActiveTab('history')}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[48px] relative transition-colors ${
          activeTab === 'history' ? 'text-text-primary' : 'text-text-muted/40'
        }`}
      >
        {activeTab === 'history' && <div className="absolute top-0 left-3 right-3 h-[2px] bg-warning" />}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-[10px] font-mono">History</span>
      </button>
    </div>
  );
}

export function MobileLayout() {
  const activeTab = useEditorStore((s) => s.activeTab);
  const pendingDiff = useEditorStore((s) => s.pendingDiff);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { size, containerRef, handleMouseDown, handleTouchStart } = useResizable({
    direction: 'vertical',
    initialSize: 35,
    minSize: 15,
    maxSize: 75,
  });

  if (isFullscreen) {
    return (
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="flex-1 min-h-0">
          <P5Preview />
        </div>
        <button
          onClick={() => setIsFullscreen(false)}
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
          onClick={() => setIsFullscreen(true)}
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

      {pendingDiff && <MobileDiffBar />}

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeTab === 'chat' && <ChatPanel />}
        {activeTab === 'code' && <CodeEditor />}
        {activeTab === 'console' && <ConsolePanel />}
        {activeTab === 'history' && <HistoryPanel />}
      </div>

      <MobileTabBar />
    </div>
  );
}
