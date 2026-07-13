import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CodeEditor, P5Preview, BottomPanel, SplitPane, Panel } from '../components';
import { PreviewControls } from '../components/Preview/PreviewControls';
import { MobileLayout } from '../components/Layout/MobileLayout';
import { FileSidebar } from '../components/Editor/FileSidebar';
import { LibrariesModal } from '../components/Libraries/LibrariesModal';
import { useIsMobile } from '../hooks/useIsMobile';
import { useEditorStore } from '../store/editorStore';
import { getExampleBySlug } from '../data/sketchExamples';
import { getPublicSketch } from '../services/api';
import { createDefaultFiles } from '../constants/defaultFiles';

export function EditorPage() {
  const isMobile = useIsMobile();
  const streamingCode = useEditorStore((s) => s.streamingCode);
  const isFileSidebarOpen = useEditorStore((s) => s.isFileSidebarOpen);
  const { sketchId, exampleSlug } = useParams();
  const navigate = useNavigate();
  const [isLibrariesOpen, setIsLibrariesOpen] = useState(false);

  // Load an example from /example/:slug into the editor as an editable copy.
  // Once the user edits the loaded code, drop the example URL back to '/' since
  // it's now their own unsaved work (not the pristine example anymore).
  useEffect(() => {
    if (!exampleSlug) return;
    const example = getExampleBySlug(exampleSlug);
    if (!example) {
      navigate('/', { replace: true });
      return;
    }
    // Skip reload if this example's code is already in the editor (persist rehydrate / back-nav)
    if (useEditorStore.getState().code !== example.code) {
      const { runTrigger } = useEditorStore.getState();
      const exampleFiles = createDefaultFiles(example.code);
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
        showSuggestion: false,
        files: exampleFiles,
        lastSavedFiles: exampleFiles.map((f) => ({ ...f })),
        activeFileName: 'sketch.js',
        libraries: [],
        lastSavedLibraries: [],
      });
    }
    const unsubscribe = useEditorStore.subscribe((state) => {
      if (state.code !== example.code) navigate('/', { replace: true });
    });
    return unsubscribe;
  }, [exampleSlug, navigate]);

  useEffect(() => {
    if (!sketchId) return;
    // Skip if this sketch is already loaded (e.g. from persisted state)
    if (useEditorStore.getState().sketchId === sketchId) return;
    getPublicSketch(sketchId)
      .then((sketch) => {
        // Re-check: zustand persist may have rehydrated this sketch while fetch was in-flight
        if (useEditorStore.getState().sketchId === sketchId) return;
        const { runTrigger } = useEditorStore.getState();
        const sketchFiles = sketch.files && sketch.files.length > 0
          ? sketch.files
          : createDefaultFiles(sketch.code);
        const sketchLibraries = sketch.libraries ?? [];
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
          files: sketchFiles,
          lastSavedFiles: sketchFiles.map((f) => ({ ...f })),
          activeFileName: 'sketch.js',
          libraries: sketchLibraries,
          lastSavedLibraries: [...sketchLibraries],
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
    <>
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
            <div className="h-full flex">
              {isFileSidebarOpen && (
                <FileSidebar onOpenLibraries={() => setIsLibrariesOpen(true)} />
              )}
              <div className="flex-1 min-w-0">
                <CodeEditor />
              </div>
            </div>
          </Panel>
          <BottomPanel />
        </SplitPane>

        <Panel label="Preview" indicatorColor="bg-info/80" rightContent={<PreviewControls />}>
          <P5Preview />
        </Panel>
      </SplitPane>

      <LibrariesModal isOpen={isLibrariesOpen} onClose={() => setIsLibrariesOpen(false)} />
    </>
  );
}
