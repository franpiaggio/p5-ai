import { type ReactNode } from 'react';
import { PanelHeader } from './PanelHeader';

interface PanelProps {
  label: string;
  indicatorColor?: string;
  rightContent?: ReactNode;
  children: ReactNode;
}

export function Panel({ label, indicatorColor, rightContent, children }: PanelProps) {
  return (
    <>
      <PanelHeader label={label} indicatorColor={indicatorColor} rightContent={rightContent} />
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </>
  );
}
