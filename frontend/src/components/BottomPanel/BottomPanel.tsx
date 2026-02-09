import { useEditorStore } from '../../store/editorStore';
import { ConsolePanel } from '../Console/ConsolePanel';
import { ChatPanel } from '../Chat/ChatPanel';
import { HistoryPanel } from '../History/HistoryPanel';

export function BottomPanel() {
  const activeTab = useEditorStore((s) => s.activeTab);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);

  return (
    <div className="h-full flex flex-col bg-surface">
      <div className="flex bg-surface-raised border-b border-border/60 shrink-0">
        <button
          onClick={() => setActiveTab('chat')}
          className={`tab-btn ${activeTab === 'chat' ? 'text-accent' : 'text-text-muted/50 hover:text-text-muted'}`}
        >
          AI Chat
          {activeTab === 'chat' && <div className="tab-indicator bg-accent" />}
        </button>
        <button
          onClick={() => setActiveTab('console')}
          className={`tab-btn ${activeTab === 'console' ? 'text-info' : 'text-text-muted/50 hover:text-text-muted'}`}
        >
          Console
          {activeTab === 'console' && <div className="tab-indicator bg-info" />}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`tab-btn ${activeTab === 'history' ? 'text-warning' : 'text-text-muted/50 hover:text-text-muted'}`}
        >
          History
          {activeTab === 'history' && <div className="tab-indicator bg-warning" />}
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'console' && <ConsolePanel />}
        {activeTab === 'chat' && <ChatPanel />}
        {activeTab === 'history' && <HistoryPanel />}
      </div>
    </div>
  );
}
