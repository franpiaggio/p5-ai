import { type ReactNode } from 'react';
import { PanelHeader } from './PanelHeader';

interface PanelProps {
  label: string;
  indicatorColor?: string;
  children: ReactNode;
}

export function Panel({ label, indicatorColor, children }: PanelProps) {
  return (
    <>
      <PanelHeader label={label} indicatorColor={indicatorColor} />
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </>
  );
}
