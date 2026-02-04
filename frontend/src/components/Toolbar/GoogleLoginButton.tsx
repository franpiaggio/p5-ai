import { useAuthStore } from '../../store/authStore';

export function LoginButton() {
  const setIsLoginOpen = useAuthStore((s) => s.setIsLoginOpen);

  return (
    <button
      onClick={() => setIsLoginOpen(true)}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono
                 bg-border/40 text-text-muted hover:text-info hover:bg-border/60
                 transition-colors cursor-pointer"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
      Sign In
    </button>
  );
}
