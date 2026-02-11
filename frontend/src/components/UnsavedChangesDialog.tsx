import { useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { useAuthStore } from '../store/authStore';
import { useUpdateSketch, useCreateSketch } from '../hooks/useSketches';
import { capturePreview } from './Preview/P5Preview';

export function UnsavedChangesDialog() {
  const pendingNavigation = useEditorStore((s) => s.pendingNavigation);
  const sketchId = useEditorStore((s) => s.sketchId);
  const sketchTitle = useEditorStore((s) => s.sketchTitle);
  const code = useEditorStore((s) => s.code);
  const codeHistory = useEditorStore((s) => s.codeHistory);
  const user = useAuthStore((s) => s.user);
  const setIsLoginOpen = useAuthStore((s) => s.setIsLoginOpen);
  const updateSketchMut = useUpdateSketch();
  const createSketchMut = useCreateSketch();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!pendingNavigation) return null;

  const dismiss = () => {
    useEditorStore.setState({ pendingNavigation: null });
  };

  const discard = () => {
    const action = pendingNavigation;
    useEditorStore.setState({ pendingNavigation: null });
    action();
  };

  const saveAndContinue = async () => {
    const action = pendingNavigation;
    setSaving(true);
    setError(null);
    try {
      const thumbnail = await capturePreview();
      if (sketchId) {
        await updateSketchMut.mutateAsync({ id: sketchId, title: sketchTitle, code, codeHistory, thumbnail });
      } else {
        const saved = await createSketchMut.mutateAsync({ title: sketchTitle, code, thumbnail });
        useEditorStore.getState().setSketchMeta(saved.id, saved.title);
      }
      useEditorStore.setState({ lastSavedCode: code, pendingNavigation: null });
      action();
    } catch (err) {
      setError('Failed to save. Try again or discard.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div className="modal-panel max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-warning/15 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86l-8.58 14.85A1 1 0 002.56 20h18.88a1 1 0 00.85-1.29L13.71 3.86a1 1 0 00-1.42 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-mono font-semibold text-text-primary">Unsaved changes</h2>
            <p className="text-[11px] font-mono text-text-muted/50 mt-0.5">
              {user
                ? 'Your changes will be lost if you don\u2019t save them.'
                : 'Sign in to save your work. Changes will be lost.'}
            </p>
          </div>
        </div>

        {error && (
          <p className="text-[10px] font-mono text-error mt-3">{error}</p>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={dismiss}
            disabled={saving}
            className="px-3 py-1.5 text-[11px] font-mono text-text-muted hover:text-text-primary transition-colors cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={discard}
            disabled={saving}
            className="px-3 py-1.5 text-[11px] font-mono rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors cursor-pointer disabled:opacity-40"
          >
            Discard
          </button>
          {user ? (
            <button
              onClick={saveAndContinue}
              disabled={saving}
              className="btn-primary px-4 text-[11px]"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          ) : (
            <button
              onClick={() => {
                dismiss();
                setIsLoginOpen(true);
              }}
              className="btn-primary px-4 text-[11px]"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
