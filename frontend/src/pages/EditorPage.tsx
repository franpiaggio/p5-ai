import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CodeEditor, P5Preview, BottomPanel, SplitPane, Panel } from '../components';
import { PreviewControls } from '../components/Preview/PreviewControls';
import { MobileLayout } from '../components/Layout/MobileLayout';
import { useIsMobile } from '../hooks/useIsMobile';
import { useEditorStore } from '../store/editorStore';
import { getPublicSketch } from '../services/api';

export function EditorPage() {
  const isMobile = useIsMobile();
  const streamingCode = useEditorStore((s) => s.streamingCode);
  const { sketchId } = useParams();

  useEffect(() => {
    if (!sketchId) return;
    // Skip if this sketch is already loaded (e.g. from persisted state)
    if (useEditorStore.getState().sketchId === sketchId) return;
    getPublicSketch(sketchId)
      .then((sketch) => {
        // Re-check: zustand persist may have rehydrated this sketch while fetch was in-flight
        if (useEditorStore.getState().sketchId === sketchId) return;
        const { runTrigger } = useEditorStore.getState();
        useEditorStore.setState({
          code: sketch.code,
          lastSavedCode: sketch.code,
          isRunning: true,
          runTrigger: runTrigger + 1,
          previewCode: null,
          pendingDiff: null,
          consoleLogs: [],
          editorErrors: [],
          messages: [],
          appliedBlocks: {},
          showSuggestion: false,
          ...(sketch.codeHistory ? { codeHistory: sketch.codeHistory } : {}),
        });
        useEditorStore.getState().setSketchMeta(sketch.id, sketch.title);
      })
      .catch((err) => {
        console.error('Failed to load sketch from URL:', err);
        // Navigation will be handled by the component unmounting
      });
  }, [sketchId]);

  if (isMobile) {
    return <MobileLayout />;
  }

  return (
    <SplitPane direction="horizontal" initialSize={50}>
      <SplitPane direction="vertical" initialSize={65}>
        <Panel
          label="Sketch"
          rightContent={streamingCode !== null ? (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-info"
              style={{ animation: 'generating-pulse 1.5s ease-in-out infinite' }}
            >
              <div className="w-3 h-3 border-[1.5px] border-info/30 border-t-info rounded-full animate-spin" />
              <span>Writing…</span>
            </div>
          ) : undefined}
        >
          <CodeEditor />
        </Panel>
        <BottomPanel />
      </SplitPane>

      <Panel label="Preview" indicatorColor="bg-info/80" rightContent={<PreviewControls />}>
        <P5Preview />
      </Panel>
    </SplitPane>
  );
}
