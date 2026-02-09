import { useEditorStore } from '../../store/editorStore';
import type { TabType } from '../../types';

const TABS: { id: TabType; label: string; color: string; icon: string }[] = [
  {
    id: 'chat',
    label: 'Chat',
    color: 'bg-accent',
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  },
  {
    id: 'code',
    label: 'Code',
    color: 'bg-accent',
    icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  },
  {
    id: 'console',
    label: 'Console',
    color: 'bg-info',
    icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    id: 'history',
    label: 'History',
    color: 'bg-warning',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
];

export function MobileTabBar() {
  const activeTab = useEditorStore((s) => s.activeTab);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);

  return (
    <div className="shrink-0 flex bg-surface-raised border-t border-border/60">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[48px] relative transition-colors ${
            activeTab === tab.id ? 'text-text-primary' : 'text-text-muted/40'
          }`}
        >
          {activeTab === tab.id && (
            <div className={`absolute top-0 left-3 right-3 h-[2px] ${tab.color}`} />
          )}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} />
          </svg>
          <span className="text-[10px] font-mono">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
