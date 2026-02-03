import { useRef, useCallback, useEffect, useState } from 'react';

type Direction = 'horizontal' | 'vertical';

interface UseResizableOptions {
  direction: Direction;
  initialSize: number;
  minSize?: number;
  maxSize?: number;
  onResize?: (size: number) => void;
}

export function useResizable({
  direction,
  initialSize,
  minSize = 15,
  maxSize = 85,
  onResize,
}: UseResizableOptions) {
  const [size, setSize] = useState(initialSize);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    // Disable pointer events on iframes during drag
    document.querySelectorAll('iframe').forEach((iframe) => {
      (iframe as HTMLIFrameElement).style.pointerEvents = 'none';
    });
  }, [direction]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      let newSize: number;

      if (direction === 'horizontal') {
        newSize = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        newSize = ((e.clientY - rect.top) / rect.height) * 100;
      }

      newSize = Math.min(Math.max(newSize, minSize), maxSize);
      setSize(newSize);
      onResize?.(newSize);
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.querySelectorAll('iframe').forEach((iframe) => {
        (iframe as HTMLIFrameElement).style.pointerEvents = '';
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [direction, minSize, maxSize, onResize]);

  return { size, containerRef, handleMouseDown };
}
