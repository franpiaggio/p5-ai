import { useEffect } from 'react';
import { Toolbar, CodeEditor, P5Preview, BottomPanel, SettingsModal, SplitPane, Panel } from './components';
import { ProfileModal } from './components/Sketches/ProfileModal';
import { SaveSketchModal } from './components/Sketches/SaveSketchModal';
import { ExamplesGrid } from './components/Sketches/ExamplesGrid';
import { SketchesGrid } from './components/Sketches/SketchesGrid';
import { LoginModal } from './components/Auth/LoginModal';
import { MobileLayout } from './components/Layout/MobileLayout';
import { useIsMobile } from './hooks/useIsMobile';
import { useEditorStore } from './store/editorStore';
import { useAuthStore } from './store/authStore';
import { UnsavedChangesDialog } from './components/UnsavedChangesDialog';
import { getPublicSketch, getProfile, getProviderKeys } from './services/api';
import type { LLMConfig } from './types';

function App() {
  const isMobile = useIsMobile();
  const currentPage = useEditorStore((s) => s.currentPage);
  const streamingCode = useEditorStore((s) => s.streamingCode);
  const user = useAuthStore((s) => s.user);

  // Detect /sketches or /examples route on mount
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/sketches') {
      useEditorStore.setState({ currentPage: 'sketches' });
    } else if (path === '/examples') {
      useEditorStore.setState({ currentPage: 'examples' });
    }
  }, []);

  // Auth guard: redirect to editor if not logged in on /sketches
  useEffect(() => {
    if (currentPage === 'sketches' && !user) {
      useEditorStore.getState().setCurrentPage('editor');
    }
  }, [currentPage, user]);

  // Auto-restore API keys on new device: fetch server preference and keys
  useEffect(() => {
    if (!user) return;
    const store = useEditorStore.getState();
    // If local storeApiKeys is already true, keys were likely restored at login
    if (store.storeApiKeys) return;
    // Check if server has the preference enabled
    getProfile()
      .then(async (profile) => {
        if (!profile.storeApiKeys) return;
        // Server says opt-in — sync preference and fetch keys
        useEditorStore.getState().setStoreApiKeys(true);
        const hasAnyKey = Object.values(useEditorStore.getState().providerKeys).some(Boolean);
        if (hasAnyKey) return; // Don't overwrite existing session keys
        const keys = await getProviderKeys();
        const s = useEditorStore.getState();
        for (const [provider, key] of Object.entries(keys)) {
          if (key) s.setProviderKey(provider as LLMConfig['provider'], key);
        }
      })
      .catch(() => {
        // Silently fail — user may not have valid session cookie
      });
  }, [user]);

  useEffect(() => {
    const match = window.location.pathname.match(/^\/sketch\/(.+)$/);
    if (!match) return;
    const id = match[1];
    // Skip if this sketch is already loaded (e.g. from persisted state)
    if (useEditorStore.getState().sketchId === id) return;
    getPublicSketch(id)
      .then((sketch) => {
        // Re-check: zustand persist may have rehydrated this sketch while fetch was in-flight
        if (useEditorStore.getState().sketchId === id) return;
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
        history.replaceState(null, '', '/');
      });
  }, []);

  if (currentPage === 'examples') {
    return (
      <>
        <ExamplesGrid />
        <UnsavedChangesDialog />
      </>
    );
  }

  if (currentPage === 'sketches' && user) {
    return (
      <>
        <SketchesGrid />
        <LoginModal />
        <UnsavedChangesDialog />
      </>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-surface overflow-hidden">
      <Toolbar />

      {isMobile ? (
        <MobileLayout />
      ) : (
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

          <Panel label="Preview" indicatorColor="bg-info/80">
            <P5Preview />
          </Panel>
        </SplitPane>
      )}

      <SettingsModal />
      <LoginModal />
      <ProfileModal />
      <SaveSketchModal />
      <UnsavedChangesDialog />
    </div>
  );
}

export default App;
