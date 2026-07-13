import { useNavigate, Navigate } from 'react-router-dom';
import { useEditorStore } from '../../store/editorStore';
import { useAuthStore } from '../../store/authStore';
import { getSketch } from '../../services/api';
import { useSketches, useCreateSketch, useDeleteSketch } from '../../hooks/useSketches';
import { guardUnsaved } from '../../utils/unsavedGuard';

export function SketchesGrid() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { data: sketches = [], isLoading: loading } = useSketches();
  const createSketchMut = useCreateSketch();
  const deleteSketchMut = useDeleteSketch();
  const setSketchMeta = useEditorStore((s) => s.setSketchMeta);

  // All hooks must run before any early return (Rules of Hooks): if `user` flips
  // to null while this route is mounted (e.g. a 401 triggers logout), an early
  // return placed above these hooks would change the hook count and crash React.
  if (!user) return <Navigate to="/" replace />;

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
      navigate(`/sketch/${sketch.id}`);
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
        showSuggestion: false,
      });
      setSketchMeta(saved.id, saved.title);
      navigate(`/sketch/${saved.id}`);
    } catch (error) {
      console.error('Failed to duplicate sketch:', error);
    }
  };

  const goBack = () => navigate('/');

  const handleNewSketch = () => guardUnsaved(() => {
    useEditorStore.getState().newSketch();
    navigate('/');
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
            <h1 className="text-sm text-text-primary">My Sketches</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/examples')} className="btn-secondary btn-sm">
            Explore Examples
          </button>
          <button onClick={handleNewSketch} className="btn-primary btn-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-panel rounded-lg border border-border/30 overflow-hidden">
                <div className="skeleton w-full aspect-[4/3] rounded-none" />
                <div className="p-3 flex flex-col gap-2">
                  <div className="skeleton h-3.5 w-2/3" />
                  <div className="skeleton h-2.5 w-full" />
                  <div className="skeleton h-2.5 w-1/3 mt-1" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && sketches.length === 0 && (
          <div className="text-center py-16">
            <p className="text-text-muted/60 text-sm mb-4">No sketches yet</p>
            <button onClick={handleNewSketch} className="btn-primary btn-sm mx-auto">
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
                <button
                  type="button"
                  className="w-full aspect-[4/3] bg-surface-alt relative overflow-hidden cursor-pointer block"
                  onClick={() => handleLoad(sketch.id)}
                  aria-label={`Open ${sketch.title}`}
                >
                  {sketch.thumbnail ? (
                    <img
                      src={sketch.thumbnail}
                      alt={sketch.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-8 h-8 text-text-muted/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </button>

                {/* Info */}
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="text-sm text-text-primary truncate">
                    {sketch.title}
                  </h3>
                  {sketch.description && (
                    <p className="text-[11px] text-text-muted/60 mt-1 line-clamp-2">
                      {sketch.description}
                    </p>
                  )}
                  <p className="text-[10px] font-mono text-text-muted/50 mt-2">
                    {new Date(sketch.updatedAt).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/20">
                    <button onClick={() => handleLoad(sketch.id)} className="btn-secondary btn-sm">
                      Load
                    </button>
                    <button
                      onClick={() => handleDuplicate(sketch.id)}
                      className="btn-ghost btn-sm opacity-0 group-hover:opacity-100"
                    >
                      Duplicate
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
        )}
      </div>
    </div>
  );
}
