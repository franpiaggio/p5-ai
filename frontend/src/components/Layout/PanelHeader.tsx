import type { ReactNode } from 'react';

interface PanelHeaderProps {
  label: string;
  indicatorColor?: string;
  rightContent?: ReactNode;
}

export function PanelHeader({ label, indicatorColor = 'bg-accent/80', rightContent }: PanelHeaderProps) {
  return (
    <div className="h-9 bg-surface-raised border-b border-border/60 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${indicatorColor}`} />
        <span className="text-text-muted text-xs font-mono tracking-wide">{label}</span>
      </div>
      {rightContent}
    </div>
  );
}
