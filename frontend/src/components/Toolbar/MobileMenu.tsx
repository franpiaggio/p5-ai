import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useAuthStore } from '../../store/authStore';
import { updateSketch, createSketch, logoutApi } from '../../services/api';

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const sketchId = useEditorStore((s) => s.sketchId);
  const sketchTitle = useEditorStore((s) => s.sketchTitle);
  const code = useEditorStore((s) => s.code);
  const codeHistory = useEditorStore((s) => s.codeHistory);
  const newSketch = useEditorStore((s) => s.newSketch);
  const setSketchMeta = useEditorStore((s) => s.setSketchMeta);
  const setIsSettingsOpen = useEditorStore((s) => s.setIsSettingsOpen);

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setIsSaveSketchOpen = useAuthStore((s) => s.setIsSaveSketchOpen);
  const setIsLoginOpen = useAuthStore((s) => s.setIsLoginOpen);
  const setIsProfileOpen = useAuthStore((s) => s.setIsProfileOpen);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const close = () => setIsOpen(false);

  const handleNewSketch = () => {
    close();
    newSketch();
  };

  const handleSave = async () => {
    close();
    if (!user) {
      setIsLoginOpen(true);
      return;
    }
    if (sketchId) {
      try {
        await updateSketch(sketchId, { title: sketchTitle, code, codeHistory });
      } catch (err) {
        console.error('Failed to save:', err);
      }
    } else {
      setIsSaveSketchOpen(true);
    }
  };

  const handleSaveAs = () => {
    close();
    if (!user) {
      setIsLoginOpen(true);
      return;
    }
    setIsSaveSketchOpen(true);
  };

  const handleDuplicate = async () => {
    close();
    if (!user || !sketchId) return;
    try {
      const copy = await createSketch({
        title: sketchTitle + ' (copy)',
        code,
      });
      setSketchMeta(copy.id, copy.title);
    } catch (err) {
      console.error('Failed to duplicate:', err);
    }
  };

  const handleSettings = () => {
    close();
    setIsSettingsOpen(true);
  };

  const handleSketches = () => {
    close();
    setIsProfileOpen(true);
  };

  const handleSignIn = () => {
    close();
    setIsLoginOpen(true);
  };

  const handleSignOut = () => {
    close();
    logoutApi().finally(() => logout());
  };

  const menuItemClass =
    'w-full text-left px-4 py-2.5 text-xs font-mono text-text-muted hover:bg-border/30 hover:text-info transition-colors cursor-pointer';
  const disabledClass =
    'w-full text-left px-4 py-2.5 text-xs font-mono text-text-muted/30 cursor-not-allowed';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-icon text-text-muted/60 hover:text-text-primary hover:bg-border/40"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-surface-raised border border-border/60 rounded-lg shadow-2xl py-1 z-50">
          {/* File actions */}
          <button onClick={handleNewSketch} className={menuItemClass}>
            New Sketch
          </button>
          <button onClick={handleSave} className={menuItemClass}>
            Save
          </button>
          <button
            onClick={handleSaveAs}
            className={user ? menuItemClass : disabledClass}
            disabled={!user}
          >
            Save As...
          </button>
          <button
            onClick={handleDuplicate}
            className={user && sketchId ? menuItemClass : disabledClass}
            disabled={!user || !sketchId}
          >
            Duplicate
          </button>

          <div className="h-px bg-border/30 my-1" />

          {/* Settings */}
          <button onClick={handleSettings} className={menuItemClass}>
            Settings
          </button>

          <div className="h-px bg-border/30 my-1" />

          {/* Account */}
          {user ? (
            <>
              <div className="px-4 py-2 border-b border-border/30">
                <p className="text-xs font-mono text-text-primary truncate">{user.name}</p>
                <p className="text-[10px] font-mono text-text-muted/50 truncate">{user.email}</p>
              </div>
              <button onClick={handleSketches} className={menuItemClass}>
                My Sketches
              </button>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2.5 text-xs font-mono text-text-muted hover:bg-border/30 hover:text-accent transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </>
          ) : (
            <button onClick={handleSignIn} className={menuItemClass}>
              Sign In
            </button>
          )}
        </div>
      )}
    </div>
  );
}
