import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setIsProfileOpen = useAuthStore((s) => s.setIsProfileOpen);
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
        <div className="absolute right-0 top-full mt-2 w-48 bg-surface-raised border border-border/60 rounded-lg shadow-2xl py-1 z-50">
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
              setIsProfileOpen(true);
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-xs font-mono text-text-muted hover:bg-border/30 hover:text-info transition-colors cursor-pointer"
          >
            My Sketches
          </button>
          <button
            onClick={() => {
              logout();
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-xs font-mono text-text-muted hover:bg-border/30 hover:text-accent transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
