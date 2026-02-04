import { useEditorStore } from '../../store/editorStore';
import { useAuthStore } from '../../store/authStore';
import { LoginButton } from './GoogleLoginButton';
import { UserMenu } from './UserMenu';
import { SaveButton } from './SaveButton';

export function Toolbar() {
  const { isRunning, setIsRunning, runSketch, setIsSettingsOpen, clearConsoleLogs } = useEditorStore();
  const user = useAuthStore((s) => s.user);

  const handlePlay = () => {
    clearConsoleLogs();
    runSketch();
  };

  const handleStop = () => {
    setIsRunning(false);
  };

  return (
    <div className="h-11 bg-surface-raised border-b border-border/60 flex items-center px-4 gap-3 shrink-0">
      <div className="flex items-center gap-2.5">
        <span className="text-accent font-black text-lg tracking-tight">p5</span>
        <span className="text-info text-[10px] font-mono uppercase tracking-[0.2em] opacity-70">
          AI Editor
        </span>
      </div>

      <div className="w-px h-5 bg-border/60 mx-2" />

      <div className="flex items-center gap-1.5">
        <button
          onClick={handlePlay}
          className={`btn-icon ${
            isRunning
              ? 'bg-accent/20 text-accent hover:bg-accent/30'
              : 'bg-accent text-white hover:bg-accent/80 shadow-[0_0_12px_rgba(233,69,96,0.3)]'
          }`}
          title="Run (Alt+Enter)"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <button
          onClick={handleStop}
          disabled={!isRunning}
          className="btn-icon bg-border/40 text-text-muted hover:bg-border/60 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Stop"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        </button>
      </div>

      {user && <SaveButton />}

      <div className="flex-1" />

      <span className="text-text-muted/40 text-[10px] font-mono hidden sm:block">
        Alt+Enter to run
      </span>

      <button
        onClick={() => setIsSettingsOpen(true)}
        className="btn-icon text-text-muted/60 hover:text-info hover:bg-border/40"
        title="Settings"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {user ? <UserMenu /> : <LoginButton />}
    </div>
  );
}
