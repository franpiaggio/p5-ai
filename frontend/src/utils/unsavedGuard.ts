import { useEditorStore } from '../store/editorStore';

/** Wraps an action with an unsaved-changes check. Shows the dialog if dirty. */
export function guardUnsaved(action: () => void) {
  const { code, lastSavedCode } = useEditorStore.getState();
  if (code !== lastSavedCode) {
    useEditorStore.setState({ pendingNavigation: action });
    return;
  }
  action();
}
