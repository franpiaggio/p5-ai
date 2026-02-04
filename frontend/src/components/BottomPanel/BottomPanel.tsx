import { useEditorStore } from '../../store/editorStore';
import { ConsolePanel } from '../Console/ConsolePanel';
import { ChatPanel } from '../Chat/ChatPanel';


export function BottomPanel() {
  const activeTab = useEditorStore((s) => s.activeTab);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);

  return (
    <div className="h-full flex flex-col bg-surface">
      <div className="flex bg-surface-raised border-b border-border/60 shrink-0">
        <button
          onClick={() => setActiveTab('console')}
          className={`px-4 py-2 text-xs font-mono tracking-wide transition-colors relative ${
            activeTab === 'console'
              ? 'text-info'
              : 'text-text-muted/50 hover:text-text-muted'
          }`}
        >
          Console
          {activeTab === 'console' && (
            <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-info" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 text-xs font-mono tracking-wide transition-colors relative ${
            activeTab === 'chat'
              ? 'text-accent'
              : 'text-text-muted/50 hover:text-text-muted'
          }`}
        >
          AI Chat
          {activeTab === 'chat' && (
            <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent" />
          )}
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'console' ? <ConsolePanel /> : <ChatPanel />}
      </div>
    </div>
  );
}
