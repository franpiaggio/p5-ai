import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditorStore } from '../../store/editorStore';
import { useAuthStore } from '../../store/authStore';
import { logoutApi } from '../../services/api';
import { useUpdateSketch, useCreateSketch } from '../../hooks/useSketches';
import { guardUnsaved } from '../../utils/unsavedGuard';
import { capturePreview } from '../Preview/P5Preview';
import { APP_THEMES } from '../Editor/editorConfig';
import type { EditorLanguage } from '../../store/editorStore';

export function MobileMenu() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const updateSketchMut = useUpdateSketch();
  const createSketchMut = useCreateSketch();

  const sketchId = useEditorStore((s) => s.sketchId);
  const sketchTitle = useEditorStore((s) => s.sketchTitle);
  const code = useEditorStore((s) => s.code);
  const codeHistory = useEditorStore((s) => s.codeHistory);
  const files = useEditorStore((s) => s.files);
  const libraries = useEditorStore((s) => s.libraries);
  const newSketch = useEditorStore((s) => s.newSketch);
  const setSketchMeta = useEditorStore((s) => s.setSketchMeta);
  const setIsSettingsOpen = useEditorStore((s) => s.setIsSettingsOpen);
  const editorLanguage = useEditorStore((s) => s.editorLanguage);
  const setEditorLanguage = useEditorStore((s) => s.setEditorLanguage);
  const appTheme = useEditorStore((s) => s.appTheme);
  const setAppTheme = useEditorStore((s) => s.setAppTheme);

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setIsSaveSketchOpen = useAuthStore((s) => s.setIsSaveSketchOpen);
  const setIsLoginOpen = useAuthStore((s) => s.setIsLoginOpen);
  const setPendingSaveAfterLogin = useAuthStore((s) => s.setPendingSaveAfterLogin);

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
    guardUnsaved(() => newSketch());
  };

  const handleSave = async () => {
    close();
    if (!user) {
      setPendingSaveAfterLogin(true);
      setIsLoginOpen(true);
      return;
    }
    if (sketchId) {
      try {
        const thumbnail = await capturePreview();
        updateSketchMut.mutate({ id: sketchId, title: sketchTitle, code, codeHistory, thumbnail, files, libraries: libraries.length > 0 ? libraries : undefined },
          { onSuccess: () => useEditorStore.getState().markCodeSaved() });
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
      const copy = await createSketchMut.mutateAsync({
        title: sketchTitle + ' (copy)',
        code,
        files,
        libraries: libraries.length > 0 ? libraries : undefined,
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
    navigate('/sketches');
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
        className="flex items-center gap-1 px-2 py-1.5 rounded-md text-text-muted/80 hover:text-text-primary hover:bg-border/40 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span className="text-[10px]">Menu</span>
      </button>

      {isOpen && (
        <div className="dropdown-menu right-0">
          {/* File actions */}
          <button onClick={handleNewSketch} className={menuItemClass}>
            New Sketch
          </button>
          <button
            onClick={() => { close(); navigate('/examples'); }}
            className={menuItemClass}
          >
            Examples
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
            <span className="text-[9px] uppercase tracking-widest text-text-muted/40">Language</span>
            <div className="flex rounded overflow-hidden border border-border/50">
              {(['javascript', 'typescript'] as EditorLanguage[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setEditorLanguage(lang)}
                  className={`px-3 py-1 text-[10px] transition-colors ${
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
            <span className="text-[9px] uppercase tracking-widest text-text-muted/40">Theme</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const idx = APP_THEMES.findIndex((t) => t.id === appTheme);
                  const prev = (idx - 1 + APP_THEMES.length) % APP_THEMES.length;
                  setAppTheme(APP_THEMES[prev].id);
                }}
                aria-label="Previous theme"
                className="p-1 text-text-muted/50 hover:text-text-primary transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-[11px] text-text-primary min-w-[80px] text-center">
                {APP_THEMES.find((t) => t.id === appTheme)?.label ?? appTheme}
              </span>
              <button
                onClick={() => {
                  const idx = APP_THEMES.findIndex((t) => t.id === appTheme);
                  const next = (idx + 1) % APP_THEMES.length;
                  setAppTheme(APP_THEMES[next].id);
                }}
                aria-label="Next theme"
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
                <p className="text-xs text-text-primary truncate">{user.name}</p>
                <p className="text-[10px] text-text-muted/50 truncate">{user.email}</p>
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
