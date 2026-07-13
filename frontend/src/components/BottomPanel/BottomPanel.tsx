import { useEditorStore } from '../../store/editorStore';
import { ConsolePanel } from '../Console/ConsolePanel';
import { ChatPanel } from '../Chat/ChatPanel';
import { HistoryPanel } from '../History/HistoryPanel';
import { formatModelName } from '../../utils/formatModelName';

export function BottomPanel() {
  const activeTab = useEditorStore((s) => s.activeTab);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const provider = useEditorStore((s) => s.llmConfig.provider);
  const model = useEditorStore((s) => s.llmConfig.model);
  const setIsSettingsOpen = useEditorStore((s) => s.setIsSettingsOpen);

  const isDemo = provider === 'demo';

  return (
    <div className="h-full flex flex-col bg-surface">
      <div className="flex items-center bg-surface-raised border-b border-border/60 shrink-0">
        <button
          onClick={() => setActiveTab('chat')}
          className={`tab-btn ${activeTab === 'chat' ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
        >
          AI Chat
          {activeTab === 'chat' && <div className="tab-indicator bg-accent" />}
        </button>
        <button
          onClick={() => setActiveTab('console')}
          className={`tab-btn ${activeTab === 'console' ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
        >
          Console
          {activeTab === 'console' && <div className="tab-indicator bg-accent" />}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`tab-btn ${activeTab === 'history' ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
        >
          History
          {activeTab === 'history' && <div className="tab-indicator bg-accent" />}
        </button>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="ml-auto mr-2 px-2 py-0.5 text-[10px] font-mono text-text-muted/40 hover:text-text-muted/70 transition-colors cursor-pointer truncate max-w-[140px]"
          title={`Model: ${isDemo ? 'Demo' : model} (click to change)`}
        >
          {isDemo ? 'Demo' : formatModelName(model)}
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
