import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useEditorStore } from '../../store/editorStore';
import { logoutApi } from '../../services/api';

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-full overflow-hidden border-2 border-transparent hover:border-info/50 transition-colors cursor-pointer"
      >
        {user.picture ? (
          <img
            src={user.picture}
            alt={user.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-accent flex items-center justify-center text-white text-xs font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="dropdown-menu right-0 mt-2 w-48">
          <div className="px-3 py-2 border-b border-border/40">
            <p className="text-xs font-mono text-text-primary truncate">
              {user.name}
            </p>
            <p className="text-[10px] font-mono text-text-muted/50 truncate">
              {user.email}
            </p>
          </div>
          <button
            onClick={() => {
              useEditorStore.getState().setCurrentPage('sketches');
              setIsOpen(false);
            }}
            className="dropdown-item"
          >
            My Sketches
          </button>
          <button
            onClick={() => {
              logoutApi().finally(() => logout());
              setIsOpen(false);
            }}
            className="dropdown-item hover:!text-accent"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
