import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useEditorStore } from '../../store/editorStore';
import { useAuthStore } from '../../store/authStore';
import { getSketch } from '../../services/api';
import { useSketches, useCreateSketch, useDeleteSketch, useToggleSketchVisibility } from '../../hooks/useSketches';
import { guardUnsaved } from '../../utils/unsavedGuard';
import { createDefaultFiles } from '../../constants/defaultFiles';

export function SketchesGrid() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { data: sketches = [], isLoading: loading } = useSketches();
  const createSketchMut = useCreateSketch();
  const deleteSketchMut = useDeleteSketch();
  const toggleVisibilityMut = useToggleSketchVisibility();
  const setSketchMeta = useEditorStore((s) => s.setSketchMeta);
  // Id of the sketch pending an inline delete confirmation (replaces window.confirm).
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // All hooks must run before any early return (Rules of Hooks): if `user` flips
  // to null while this route is mounted (e.g. a 401 triggers logout), an early
  // return placed above these hooks would change the hook count and crash React.
  if (!user) return <Navigate to="/" replace />;

  const loadSketch = async (id: string) => {
    try {
      const sketch = await getSketch(id);
      const { runTrigger } = useEditorStore.getState();
      const sketchFiles = sketch.files && sketch.files.length > 0
        ? sketch.files
        : createDefaultFiles(sketch.code);
      const sketchLibraries = sketch.libraries ?? [];
      // Invalidate any chat response still in flight for the previous sketch.
      useEditorStore.getState().beginSketchSession();
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
        files: sketchFiles,
        lastSavedFiles: sketchFiles.map((f) => ({ ...f })),
        activeFileName: 'sketch.js',
        libraries: sketchLibraries,
        lastSavedLibraries: [...sketchLibraries],
        ...(sketch.codeHistory ? { codeHistory: sketch.codeHistory } : {}),
      });
      setSketchMeta(sketch.id, sketch.title);
      navigate(`/sketch/${sketch.id}`);
    } catch (error) {
      console.error('Failed to load sketch:', error);
    }
  };

  const handleLoad = (id: string) => guardUnsaved(() => loadSketch(id));

  const confirmDelete = (id: string) => {
    deleteSketchMut.mutate(id);
    setConfirmDeleteId(null);
  };

  const toggleVisibility = (id: string, currentlyPublic: boolean) => {
    toggleVisibilityMut.mutate({ id, isPublic: !currentlyPublic });
  };

  const handleDuplicate = async (id: string) => {
    try {
      const sketch = await getSketch(id);
      const sketchFiles = sketch.files && sketch.files.length > 0
        ? sketch.files
        : createDefaultFiles(sketch.code);
      const sketchLibraries = sketch.libraries ?? [];
      const saved = await createSketchMut.mutateAsync({
        title: `Copy of ${sketch.title}`,
        code: sketch.code,
        description: sketch.description || undefined,
        thumbnail: sketch.thumbnail || undefined,
        // Preserve the original's visibility so duplicating a private sketch
        // doesn't silently produce a public copy (backend defaults to public).
        isPublic: sketch.isPublic ?? false,
        files: sketchFiles,
        libraries: sketchLibraries.length > 0 ? sketchLibraries : undefined,
      });
      useEditorStore.getState().beginSketchSession();
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
        files: sketchFiles,
        lastSavedFiles: sketchFiles.map((f) => ({ ...f })),
        activeFileName: 'sketch.js',
        libraries: sketchLibraries,
        lastSavedLibraries: [...sketchLibraries],
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
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <p className="text-[10px] font-mono text-text-muted/50">
                      {new Date(sketch.updatedAt).toLocaleDateString()}
                    </p>
                    {(() => {
                      const isPublic = sketch.isPublic !== false;
                      return (
                        <button
                          type="button"
                          onClick={() => toggleVisibility(sketch.id, isPublic)}
                          className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                            isPublic
                              ? 'text-info hover:bg-info/10'
                              : 'text-text-muted/60 hover:bg-border/30'
                          }`}
                          title={
                            isPublic
                              ? 'Public — anyone with the link can view. Click to make private.'
                              : 'Private — only you can open it. Click to make public.'
                          }
                          aria-label={isPublic ? 'Make private' : 'Make public'}
                        >
                          {isPublic ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                          {isPublic ? 'Public' : 'Private'}
                        </button>
                      );
                    })()}
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/20">
                    {confirmDeleteId === sketch.id ? (
                      <>
                        <span className="text-[11px] text-text-muted self-center mr-auto">Delete this sketch?</span>
                        <button onClick={() => setConfirmDeleteId(null)} className="btn-ghost btn-sm">
                          Cancel
                        </button>
                        <button onClick={() => confirmDelete(sketch.id)} className="btn-danger btn-sm">
                          Delete
                        </button>
                      </>
                    ) : (
                      <>
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
                          onClick={() => setConfirmDeleteId(sketch.id)}
                          className="btn-danger btn-sm opacity-0 group-hover:opacity-100"
                        >
                          Delete
                        </button>
                      </>
                    )}
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
