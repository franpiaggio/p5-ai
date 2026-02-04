import { type ReactNode } from 'react';
import { useResizable } from '../../hooks/useResizable';
import { ResizeHandle } from './ResizeHandle';

interface SplitPaneProps {
  direction: 'horizontal' | 'vertical';
  initialSize?: number;
  children: [ReactNode, ReactNode];
}

export function SplitPane({ direction, initialSize = 50, children }: SplitPaneProps) {
  const { size, containerRef, handleMouseDown } = useResizable({ direction, initialSize });
  const [first, second] = children;

  const isHorizontal = direction === 'horizontal';
  const firstStyle = isHorizontal ? { width: `${size}%` } : { height: `${size}%` };
  const secondStyle = isHorizontal ? { width: `${100 - size}%` } : { height: `${100 - size}%` };

  return (
    <div ref={containerRef} className={`flex-1 flex ${isHorizontal ? '' : 'flex-col'} min-h-0`}>
      <div className="flex flex-col min-h-0" style={firstStyle}>
        {first}
      </div>
      <ResizeHandle direction={direction} onMouseDown={handleMouseDown} />
      <div className={`${isHorizontal ? 'flex flex-col' : ''} min-h-0`} style={secondStyle}>
        {second}
      </div>
    </div>
  );
}
