import { useEffect } from 'react';
import { Toolbar, CodeEditor, P5Preview, BottomPanel, SettingsModal, SplitPane, Panel } from './components';
import { ProfileModal } from './components/Sketches/ProfileModal';
import { SaveSketchModal } from './components/Sketches/SaveSketchModal';
import { LoginModal } from './components/Auth/LoginModal';
import { MobileLayout } from './components/Layout/MobileLayout';
import { useIsMobile } from './hooks/useIsMobile';
import { useEditorStore } from './store/editorStore';
import { getPublicSketch } from './services/api';

function App() {
  const isMobile = useIsMobile();

  useEffect(() => {
    const match = window.location.pathname.match(/^\/sketch\/(.+)$/);
    if (!match) return;
    const id = match[1];
    // Skip if this sketch is already loaded (e.g. from persisted state)
    if (useEditorStore.getState().sketchId === id) return;
    getPublicSketch(id)
      .then((sketch) => {
        const { runTrigger } = useEditorStore.getState();
        useEditorStore.setState({
          code: sketch.code,
          isRunning: true,
          runTrigger: runTrigger + 1,
          previewCode: null,
          pendingDiff: null,
          consoleLogs: [],
          editorErrors: [],
          messages: [],
          appliedBlocks: {},
          ...(sketch.codeHistory ? { codeHistory: sketch.codeHistory } : {}),
        });
        useEditorStore.getState().setSketchMeta(sketch.id, sketch.title);
      })
      .catch((err) => {
        console.error('Failed to load sketch from URL:', err);
        history.replaceState(null, '', '/');
      });
  }, []);

  return (
    <div className="h-screen flex flex-col bg-surface overflow-hidden">
      <Toolbar />

      {isMobile ? (
        <MobileLayout />
      ) : (
        <SplitPane direction="horizontal" initialSize={50}>
          <SplitPane direction="vertical" initialSize={65}>
            <Panel label="sketch">
              <CodeEditor />
            </Panel>
            <BottomPanel />
          </SplitPane>

          <Panel label="Preview" indicatorColor="bg-info/80">
            <P5Preview />
          </Panel>
        </SplitPane>
      )}

      <SettingsModal />
      <LoginModal />
      <ProfileModal />
      <SaveSketchModal />
    </div>
  );
}

export default App;
