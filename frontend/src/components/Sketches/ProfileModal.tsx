import { useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useEditorStore } from '../../store/editorStore';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import { getSketch } from '../../services/api';
import { useSketches, useDeleteSketch } from '../../hooks/useSketches';
import { guardUnsaved } from '../../utils/unsavedGuard';

export function ProfileModal() {
  const isProfileOpen = useAuthStore((s) => s.isProfileOpen);
  const setIsProfileOpen = useAuthStore((s) => s.setIsProfileOpen);
  const user = useAuthStore((s) => s.user);
  const setSketchMeta = useEditorStore((s) => s.setSketchMeta);

  const { data: sketches = [], isLoading: loading } = useSketches(isProfileOpen);
  const deleteSketchMut = useDeleteSketch();

  const handleClose = useCallback(() => setIsProfileOpen(false), [setIsProfileOpen]);
  useEscapeClose(isProfileOpen, handleClose);

  if (!isProfileOpen) return null;

  const loadSketch = async (id: string) => {
    try {
      const sketch = await getSketch(id);
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
      setSketchMeta(sketch.id, sketch.title);
      setIsProfileOpen(false);
    } catch (error) {
      console.error('Failed to load sketch:', error);
    }
  };

  const handleLoad = (id: string) => guardUnsaved(() => loadSketch(id));

  const handleDelete = async (id: string) => {
    deleteSketchMut.mutate(id);
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsProfileOpen(false);
      }}
    >
      <div className="modal-panel max-w-lg max-h-[80vh] flex flex-col" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 id="profile-modal-title" className="modal-title">
              My Sketches
            </h2>
            {user && (
              <p className="text-[10px] text-text-muted/50 mt-0.5">
                {user.email}
              </p>
            )}
          </div>
          <button
            onClick={() => setIsProfileOpen(false)}
            className="modal-close"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {loading && (
            <div className="space-y-2" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-[68px] rounded-lg" />
              ))}
            </div>
          )}

          {!loading && sketches.length === 0 && (
            <p className="text-text-muted/30 text-xs text-center py-8">
              No saved sketches yet
            </p>
          )}

          {sketches.map((sketch) => (
            <div
              key={sketch.id}
              className="bg-surface rounded-lg p-3 border border-border/30 hover:border-info/30 transition-colors group"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm text-text-primary truncate">
                    {sketch.title}
                  </h3>
                  {sketch.description && (
                    <p className="text-[10px] text-text-muted/40 mt-0.5 truncate">
                      {sketch.description}
                    </p>
                  )}
                  <p className="text-[10px] font-mono text-text-muted/30 mt-1">
                    {new Date(sketch.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1.5 ml-2 shrink-0">
                  <button
                    onClick={() => handleLoad(sketch.id)}
                    className="btn-secondary btn-sm"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDelete(sketch.id)}
                    className="btn-danger btn-sm opacity-0 group-hover:opacity-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
