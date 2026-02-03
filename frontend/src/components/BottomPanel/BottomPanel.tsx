import { useEditorStore } from '../../store/editorStore';
import { ConsolePanel } from '../Console/ConsolePanel';
import { ChatPanel } from '../Chat/ChatPanel';

export function BottomPanel() {
  const activeTab = useEditorStore((s) => s.activeTab);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);

  return (
    <div className="h-full flex flex-col bg-[#1a1a2e]">
      <div className="flex bg-[#16213e] border-b border-[#0f3460]/60 shrink-0">
        <button
          onClick={() => setActiveTab('console')}
          className={`px-4 py-2 text-xs font-mono tracking-wide transition-colors relative ${
            activeTab === 'console'
              ? 'text-[#53d8fb]'
              : 'text-[#a8b2d1]/50 hover:text-[#a8b2d1]'
          }`}
        >
          Console
          {activeTab === 'console' && (
            <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#53d8fb]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 text-xs font-mono tracking-wide transition-colors relative ${
            activeTab === 'chat'
              ? 'text-[#e94560]'
              : 'text-[#a8b2d1]/50 hover:text-[#a8b2d1]'
          }`}
        >
          AI Chat
          {activeTab === 'chat' && (
            <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#e94560]" />
          )}
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'console' ? <ConsolePanel /> : <ChatPanel />}
      </div>
    </div>
  );
}
