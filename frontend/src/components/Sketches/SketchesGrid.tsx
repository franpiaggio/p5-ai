import { useState, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { getSketches, getSketch, deleteSketch } from '../../services/api';
import type { SketchSummary } from '../../types';

export function SketchesGrid() {
  const [sketches, setSketches] = useState<SketchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const setSketchMeta = useEditorStore((s) => s.setSketchMeta);

  useEffect(() => {
    getSketches()
      .then(setSketches)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
      useEditorStore.getState().setCurrentPage('editor');
    } catch (error) {
      console.error('Failed to load sketch:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this sketch?')) return;
    try {
      await deleteSketch(id);
      setSketches((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Failed to delete sketch:', error);
    }
  };

  const goBack = () => useEditorStore.getState().setCurrentPage('editor');

  return (
    <div className="h-screen bg-surface flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-border/40">
        <button
          onClick={goBack}
          className="p-1.5 rounded hover:bg-border/30 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-info font-bold text-base">p5</span>
          <span className="text-text-muted/30">|</span>
          <h1 className="text-sm font-mono text-text-primary">My Sketches</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading && (
          <p className="text-text-muted/50 text-xs font-mono text-center py-16">
            Loading...
          </p>
        )}

        {!loading && sketches.length === 0 && (
          <div className="text-center py-16">
            <p className="text-text-muted/30 text-sm font-mono mb-4">No sketches yet</p>
            <button
              onClick={goBack}
              className="px-4 py-2 text-xs font-mono rounded bg-info/10 text-info hover:bg-info/20 transition-colors cursor-pointer"
            >
              Back to Editor
            </button>
          </div>
        )}

        {!loading && sketches.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {sketches.map((sketch) => (
              <div
                key={sketch.id}
                className="bg-panel rounded-lg border border-border/30 hover:border-info/30 transition-colors group flex flex-col overflow-hidden"
              >
                {/* Thumbnail */}
                <div
                  className="w-full aspect-[4/3] bg-surface-alt flex items-center justify-center cursor-pointer"
                  onClick={() => handleLoad(sketch.id)}
                >
                  {sketch.thumbnail ? (
                    <img
                      src={sketch.thumbnail}
                      alt={sketch.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg className="w-8 h-8 text-text-muted/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="text-sm font-mono text-text-primary truncate">
                    {sketch.title}
                  </h3>
                  {sketch.description && (
                    <p className="text-[11px] font-mono text-text-muted/40 mt-1 line-clamp-2">
                      {sketch.description}
                    </p>
                  )}
                  <p className="text-[10px] font-mono text-text-muted/30 mt-2">
                    {new Date(sketch.updatedAt).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/20">
                    <button
                      onClick={() => handleLoad(sketch.id)}
                      className="px-3 py-1.5 text-[11px] font-mono rounded bg-info/10 text-info hover:bg-info/20 transition-colors cursor-pointer"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDelete(sketch.id)}
                      className="px-3 py-1.5 text-[11px] font-mono rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
