import { useEditorStore } from './editorStore';
import { updateSketch } from '../services/api';

// Sync sketchId to URL (only when on editor page)
let prevSketchId = useEditorStore.getState().sketchId;
useEditorStore.subscribe((state) => {
  const path = window.location.pathname;
  const isEditorPage = path === '/' || path.startsWith('/sketch/');
  if (!isEditorPage) return;
  const id = state.sketchId;
  if (id === prevSketchId) return;
  prevSketchId = id;
  history.replaceState(null, '', id ? `/sketch/${id}` : '/');
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

// Warn on tab close / refresh when there are unsaved changes
window.addEventListener('beforeunload', (e) => {
  const { code, lastSavedCode } = useEditorStore.getState();
  if (code !== lastSavedCode) {
    e.preventDefault();
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
