import { useEditorStore } from '../store/editorStore';

/** Wraps an action with an unsaved-changes check. Shows the dialog if dirty. */
export function guardUnsaved(action: () => void) {
  const { code, lastSavedCode, files, lastSavedFiles, libraries, lastSavedLibraries } = useEditorStore.getState();

  // Check code change
  if (code !== lastSavedCode) {
    useEditorStore.setState({ pendingNavigation: action });
    return;
  }

  // Check files changed (count or any content/name difference)
  if (files.length !== lastSavedFiles.length ||
    files.some((f, i) => f.name !== lastSavedFiles[i]?.name || f.content !== lastSavedFiles[i]?.content)) {
    useEditorStore.setState({ pendingNavigation: action });
    return;
  }

  // Check libraries changed
  if (libraries.length !== lastSavedLibraries.length ||
    libraries.some((l, i) => l.url !== lastSavedLibraries[i]?.url)) {
    useEditorStore.setState({ pendingNavigation: action });
    return;
  }

  action();
}
