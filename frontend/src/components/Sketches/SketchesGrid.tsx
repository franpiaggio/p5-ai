import { useEditorStore } from '../../store/editorStore';
import { getSketch } from '../../services/api';
import { useSketches, useCreateSketch, useDeleteSketch } from '../../hooks/useSketches';
import { guardUnsaved } from '../../utils/unsavedGuard';

export function SketchesGrid() {
  const { data: sketches = [], isLoading: loading } = useSketches();
  const createSketchMut = useCreateSketch();
  const deleteSketchMut = useDeleteSketch();
  const setSketchMeta = useEditorStore((s) => s.setSketchMeta);

  const loadSketch = async (id: string) => {
    try {
      const sketch = await getSketch(id);
      useEditorStore.setState({
        code: sketch.code,
        lastSavedCode: sketch.code,
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

  const handleLoad = (id: string) => guardUnsaved(() => loadSketch(id));

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this sketch?')) return;
    deleteSketchMut.mutate(id);
  };

  const handleDuplicate = async (id: string) => {
    try {
      const sketch = await getSketch(id);
      const saved = await createSketchMut.mutateAsync({
        title: `Copy of ${sketch.title}`,
        code: sketch.code,
        description: sketch.description || undefined,
        thumbnail: sketch.thumbnail || undefined,
      });
      useEditorStore.setState({
        code: saved.code,
        lastSavedCode: saved.code,
        isRunning: true,
        runTrigger: useEditorStore.getState().runTrigger + 1,
        previewCode: null,
        pendingDiff: null,
        consoleLogs: [],
        editorErrors: [],
        messages: [],
        appliedBlocks: {},
        codeHistory: [],
      });
      setSketchMeta(saved.id, saved.title);
      useEditorStore.getState().setCurrentPage('editor');
    } catch (error) {
      console.error('Failed to duplicate sketch:', error);
    }
  };

  const goBack = () => useEditorStore.getState().setCurrentPage('editor');

  const handleNewSketch = () => guardUnsaved(() => {
    useEditorStore.getState().newSketch();
    useEditorStore.getState().setCurrentPage('editor');
  });

  return (
    <div className="h-dvh bg-surface flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border/40">
        <div className="flex items-center gap-3">
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
        <button
          onClick={handleNewSketch}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono rounded bg-accent text-white hover:bg-accent/80 transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New
        </button>
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
              onClick={handleNewSketch}
              className="px-4 py-2 text-xs font-mono rounded bg-accent text-white hover:bg-accent/80 transition-colors cursor-pointer"
            >
              Create your first sketch
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
                      onClick={() => handleDuplicate(sketch.id)}
                      className="px-3 py-1.5 text-[11px] font-mono rounded bg-info/10 text-info hover:bg-info/20 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      Duplicate
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
