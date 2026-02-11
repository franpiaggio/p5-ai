import { useEditorStore } from './editorStore';
import { updateSketch } from '../services/api';

// Sync sketchId to URL (only when on editor page)
let prevSketchId = useEditorStore.getState().sketchId;
useEditorStore.subscribe((state) => {
  if (state.currentPage !== 'editor') return;
  const id = state.sketchId;
  if (id === prevSketchId) return;
  prevSketchId = id;
  history.replaceState(null, '', id ? `/sketch/${id}` : '/');
});

// Sync currentPage to URL
let prevPage = useEditorStore.getState().currentPage;
useEditorStore.subscribe((state) => {
  if (state.currentPage === prevPage) return;
  prevPage = state.currentPage;
  if (state.currentPage === 'sketches') {
    history.pushState(null, '', '/sketches');
  } else if (state.currentPage === 'examples') {
    history.pushState(null, '', '/examples');
  } else {
    const id = state.sketchId;
    history.pushState(null, '', id ? `/sketch/${id}` : '/');
    prevSketchId = id;
  }
});

// Handle browser back/forward button
window.addEventListener('popstate', () => {
  const path = window.location.pathname;
  if (path === '/sketches') {
    useEditorStore.setState({ currentPage: 'sketches' });
    prevPage = 'sketches';
  } else if (path === '/examples') {
    useEditorStore.setState({ currentPage: 'examples' });
    prevPage = 'examples';
  } else {
    useEditorStore.setState({ currentPage: 'editor' });
    prevPage = 'editor';
  }
});

// Warn before closing/reloading with unsaved changes (skip when auto-save is on)
window.addEventListener('beforeunload', (e) => {
  const { code, lastSavedCode, autoSave } = useEditorStore.getState();
  if (!autoSave && code !== lastSavedCode) {
    e.preventDefault();
  }
});

// Sync providerKeys to sessionStorage (backend save happens on Settings close)
let prevProviderKeys = useEditorStore.getState().providerKeys;
useEditorStore.subscribe((state) => {
  if (state.providerKeys === prevProviderKeys) return;
  prevProviderKeys = state.providerKeys;
  const hasKeys = Object.values(state.providerKeys).some(Boolean);
  if (hasKeys) {
    sessionStorage.setItem('p5-ai-editor-keys', JSON.stringify(state.providerKeys));
  } else {
    sessionStorage.removeItem('p5-ai-editor-keys');
  }
});

// Auto-save: debounced save to backend when code changes
const AUTO_SAVE_DEBOUNCE_MS = 2000;
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let prevAutoSaveCode = useEditorStore.getState().code;

useEditorStore.subscribe((state) => {
  // Only auto-save when enabled and we have a saved sketch
  if (!state.autoSave || !state.sketchId) return;
  // Only trigger on code changes
  if (state.code === prevAutoSaveCode) return;
  prevAutoSaveCode = state.code;

  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    const { sketchId, sketchTitle, code, codeHistory } = useEditorStore.getState();
    if (!sketchId) return;
    updateSketch(sketchId, { title: sketchTitle, code, codeHistory })
      .then(() => {
        useEditorStore.setState({ lastSavedCode: code });
      })
      .catch((err) => {
        console.error('Auto-save failed:', err);
      });
  }, AUTO_SAVE_DEBOUNCE_MS);
});
