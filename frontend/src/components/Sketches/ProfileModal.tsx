import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useEditorStore } from '../../store/editorStore';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import { getSketches, getSketch, deleteSketch } from '../../services/api';
import type { SketchSummary } from '../../types';

export function ProfileModal() {
  const isProfileOpen = useAuthStore((s) => s.isProfileOpen);
  const setIsProfileOpen = useAuthStore((s) => s.setIsProfileOpen);
  const user = useAuthStore((s) => s.user);
  const setSketchMeta = useEditorStore((s) => s.setSketchMeta);
  const [sketches, setSketches] = useState<SketchSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isProfileOpen) {
      setLoading(true);
      getSketches()
        .then(setSketches)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isProfileOpen]);

  const handleClose = useCallback(() => setIsProfileOpen(false), [setIsProfileOpen]);
  useEscapeClose(isProfileOpen, handleClose);

  if (!isProfileOpen) return null;

  const handleLoad = async (id: string) => {
    try {
      const sketch = await getSketch(id);
      useEditorStore.setState({
        code: sketch.code,
        isRunning: false,
        previewCode: null,
        pendingDiff: null,
        consoleLogs: [],
        editorErrors: [],
        messages: [],
        appliedBlocks: {},
        ...(sketch.codeHistory ? { codeHistory: sketch.codeHistory } : {}),
      });
      setSketchMeta(sketch.id, sketch.title);
      setIsProfileOpen(false);
    } catch (error) {
      console.error('Failed to load sketch:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSketch(id);
      setSketches((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Failed to delete sketch:', error);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsProfileOpen(false);
      }}
    >
      <div className="modal-panel max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="modal-title">
              My Sketches
            </h2>
            {user && (
              <p className="text-[10px] font-mono text-text-muted/50 mt-0.5">
                {user.email}
              </p>
            )}
          </div>
          <button
            onClick={() => setIsProfileOpen(false)}
            className="modal-close"
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
            <p className="text-text-muted/50 text-xs font-mono text-center py-8">
              Loading...
            </p>
          )}

          {!loading && sketches.length === 0 && (
            <p className="text-text-muted/30 text-xs font-mono text-center py-8">
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
                  <h3 className="text-sm font-mono text-text-primary truncate">
                    {sketch.title}
                  </h3>
                  {sketch.description && (
                    <p className="text-[10px] font-mono text-text-muted/40 mt-0.5 truncate">
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
                    className="px-2.5 py-1 text-[10px] font-mono rounded bg-info/10 text-info hover:bg-info/20 transition-colors cursor-pointer"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDelete(sketch.id)}
                    className="px-2.5 py-1 text-[10px] font-mono rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
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
