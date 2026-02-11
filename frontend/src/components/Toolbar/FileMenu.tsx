import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useAuthStore } from '../../store/authStore';
import { useUpdateSketch, useCreateSketch } from '../../hooks/useSketches';
import { capturePreview } from '../Preview/P5Preview';
import { guardUnsaved } from '../../utils/unsavedGuard';


export function FileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const updateSketchMut = useUpdateSketch();
  const createSketchMut = useCreateSketch();

  const sketchId = useEditorStore((s) => s.sketchId);
  const sketchTitle = useEditorStore((s) => s.sketchTitle);
  const code = useEditorStore((s) => s.code);
  const codeHistory = useEditorStore((s) => s.codeHistory);
  const newSketch = useEditorStore((s) => s.newSketch);
  const setSketchMeta = useEditorStore((s) => s.setSketchMeta);
  const autoSave = useEditorStore((s) => s.autoSave);
  const setAutoSave = useEditorStore((s) => s.setAutoSave);

  const user = useAuthStore((s) => s.user);
  const setIsSaveSketchOpen = useAuthStore((s) => s.setIsSaveSketchOpen);
  const setIsLoginOpen = useAuthStore((s) => s.setIsLoginOpen);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNewSketch = () => {
    setIsOpen(false);
    guardUnsaved(() => newSketch());
  };

  const handleSave = async () => {
    setIsOpen(false);
    if (!user) {
      setIsLoginOpen(true);
      return;
    }
    if (sketchId) {
      try {
        const thumbnail = await capturePreview();
        updateSketchMut.mutate({ id: sketchId, title: sketchTitle, code, codeHistory, thumbnail },
          { onSuccess: () => useEditorStore.getState().markCodeSaved() });
      } catch (err) {
        console.error('Failed to save:', err);
      }
    } else {
      setIsSaveSketchOpen(true);
    }
  };

  const handleSaveAs = () => {
    setIsOpen(false);
    if (!user) {
      setIsLoginOpen(true);
      return;
    }
    setIsSaveSketchOpen(true);
  };

  const handleDuplicate = async () => {
    setIsOpen(false);
    if (!user || !sketchId) return;
    try {
      const copy = await createSketchMut.mutateAsync({
        title: sketchTitle + ' (copy)',
        code,
      });
      setSketchMeta(copy.id, copy.title);
    } catch (err) {
      console.error('Failed to duplicate:', err);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-xs font-mono text-text-muted hover:text-text-primary hover:bg-border/30 rounded transition-colors cursor-pointer"
      >
        File
        <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="dropdown-menu left-0">
          <button
            onClick={handleNewSketch}
            className="dropdown-item flex justify-between"
          >
            New Sketch
          </button>

          <button
            onClick={() => { setIsOpen(false); useEditorStore.getState().setCurrentPage('examples'); }}
            className="dropdown-item"
          >
            Examples
          </button>

          <div className="dropdown-separator" />

          <button
            onClick={handleSave}
            className="dropdown-item flex justify-between"
          >
            <span>Save</span>
            <span className="text-text-muted/30 text-[10px]">Ctrl+S</span>
          </button>
          <button
            onClick={handleSaveAs}
            className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors flex justify-between ${
              user
                ? 'text-text-muted hover:bg-border/30 hover:text-info cursor-pointer'
                : 'text-text-muted/30 cursor-not-allowed'
            }`}
            disabled={!user}
          >
            Save As...
          </button>
          <label
            className={`flex items-center gap-2 px-3 py-2 text-xs font-mono transition-colors ${
              user && sketchId
                ? 'text-text-muted hover:bg-border/30 cursor-pointer'
                : 'text-text-muted/30 cursor-not-allowed'
            }`}
          >
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
              disabled={!user || !sketchId}
              className="accent-info w-3 h-3"
            />
            Auto-save
          </label>

          <div className="dropdown-separator" />

          <button
            onClick={handleDuplicate}
            className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors flex justify-between ${
              user && sketchId
                ? 'text-text-muted hover:bg-border/30 hover:text-info cursor-pointer'
                : 'text-text-muted/30 cursor-not-allowed'
            }`}
            disabled={!user || !sketchId}
          >
            Duplicate
          </button>

          {user && (
            <>
              <div className="dropdown-separator" />
              <button
                onClick={() => { setIsOpen(false); useEditorStore.getState().setCurrentPage('sketches'); }}
                className="dropdown-item"
              >
                My Sketches
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
