import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useAuthStore } from '../../store/authStore';
import { updateSketch, createSketch, logoutApi } from '../../services/api';
import { capturePreview } from '../Preview/P5Preview';
import { EDITOR_THEMES } from '../Editor/editorConfig';
import type { EditorLanguage } from '../../store/editorStore';

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
  const editorLanguage = useEditorStore((s) => s.editorLanguage);
  const setEditorLanguage = useEditorStore((s) => s.setEditorLanguage);
  const editorTheme = useEditorStore((s) => s.editorTheme);
  const setEditorTheme = useEditorStore((s) => s.setEditorTheme);

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
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
        const thumbnail = await capturePreview();
        await updateSketch(sketchId, { title: sketchTitle, code, codeHistory, thumbnail });
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
    useEditorStore.getState().setCurrentPage('sketches');
  };

  const handleSignIn = () => {
    close();
    setIsLoginOpen(true);
  };

  const handleSignOut = () => {
    close();
    logoutApi().finally(() => logout());
  };

  const menuItemClass = 'dropdown-item py-2.5 px-4';
  const disabledClass = 'dropdown-item-disabled py-2.5 px-4';

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
        <div className="dropdown-menu right-0">
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

          <div className="dropdown-separator" />

          {/* Language toggle */}
          <div className="px-4 py-2.5 flex items-center justify-between">
            <span className="text-[9px] font-mono uppercase tracking-widest text-text-muted/40">Language</span>
            <div className="flex rounded overflow-hidden border border-border/50">
              {(['javascript', 'typescript'] as EditorLanguage[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setEditorLanguage(lang)}
                  className={`px-3 py-1 text-[10px] font-mono transition-colors ${
                    editorLanguage === lang
                      ? 'bg-info/20 text-info'
                      : 'text-text-muted/50 hover:text-text-primary'
                  }`}
                >
                  {lang === 'javascript' ? 'JS' : 'TS'}
                </button>
              ))}
            </div>
          </div>

          {/* Theme selector */}
          <div className="px-4 py-2.5 flex items-center justify-between">
            <span className="text-[9px] font-mono uppercase tracking-widest text-text-muted/40">Theme</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const idx = EDITOR_THEMES.findIndex((t) => t.id === editorTheme);
                  const prev = (idx - 1 + EDITOR_THEMES.length) % EDITOR_THEMES.length;
                  setEditorTheme(EDITOR_THEMES[prev].id);
                }}
                className="p-1 text-text-muted/50 hover:text-text-primary transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-[11px] font-mono text-text-primary min-w-[80px] text-center">
                {EDITOR_THEMES.find((t) => t.id === editorTheme)?.label ?? editorTheme}
              </span>
              <button
                onClick={() => {
                  const idx = EDITOR_THEMES.findIndex((t) => t.id === editorTheme);
                  const next = (idx + 1) % EDITOR_THEMES.length;
                  setEditorTheme(EDITOR_THEMES[next].id);
                }}
                className="p-1 text-text-muted/50 hover:text-text-primary transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="dropdown-separator" />

          {/* Settings */}
          <button onClick={handleSettings} className={menuItemClass}>
            Settings
          </button>

          <div className="dropdown-separator" />

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
                className="dropdown-item py-2.5 px-4 hover:!text-accent"
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
