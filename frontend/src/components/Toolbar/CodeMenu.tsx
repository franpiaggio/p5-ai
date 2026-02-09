import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { EDITOR_THEMES } from '../Editor/editorConfig';
import type { EditorLanguage } from '../../store/editorStore';

const LANGUAGES: { id: EditorLanguage; label: string }[] = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
];

export function CodeMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const editorLanguage = useEditorStore((s) => s.editorLanguage);
  const setEditorLanguage = useEditorStore((s) => s.setEditorLanguage);
  const editorTheme = useEditorStore((s) => s.editorTheme);
  const setEditorTheme = useEditorStore((s) => s.setEditorTheme);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-xs font-mono text-text-muted hover:text-text-primary hover:bg-border/30 rounded transition-colors cursor-pointer"
      >
        Code
        <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="dropdown-menu left-0">
          <div className="px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest text-text-muted/40">
            Language
          </div>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              onClick={() => { setEditorLanguage(lang.id); setIsOpen(false); }}
              className="dropdown-item flex items-center justify-between"
            >
              <span>{lang.label}</span>
              {editorLanguage === lang.id && (
                <svg className="w-3.5 h-3.5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}

          <div className="dropdown-separator" />

          <div className="px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest text-text-muted/40">
            Theme
          </div>
          {EDITOR_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => { setEditorTheme(theme.id); setIsOpen(false); }}
              className="dropdown-item flex items-center justify-between"
            >
              <span>{theme.label}</span>
              {editorTheme === theme.id && (
                <svg className="w-3.5 h-3.5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
