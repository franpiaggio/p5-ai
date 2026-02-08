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

  const startDrag = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    document.querySelectorAll('iframe').forEach((iframe) => {
      (iframe as HTMLIFrameElement).style.pointerEvents = 'none';
    });
  }, [direction]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startDrag();
  }, [startDrag]);

  const handleTouchStart = useCallback(() => {
    startDrag();
  }, [startDrag]);

  useEffect(() => {
    const calcSize = (clientX: number, clientY: number) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let newSize: number;
      if (direction === 'horizontal') {
        newSize = ((clientX - rect.left) / rect.width) * 100;
      } else {
        newSize = ((clientY - rect.top) / rect.height) * 100;
      }
      newSize = Math.min(Math.max(newSize, minSize), maxSize);
      setSize(newSize);
      onResize?.(newSize);
    };

    const stopDrag = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.querySelectorAll('iframe').forEach((iframe) => {
        (iframe as HTMLIFrameElement).style.pointerEvents = '';
      });
    };

    const handleMouseMove = (e: MouseEvent) => calcSize(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      calcSize(e.touches[0].clientX, e.touches[0].clientY);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', stopDrag);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopDrag);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', stopDrag);
    };
  }, [direction, minSize, maxSize, onResize]);

  return { size, containerRef, handleMouseDown, handleTouchStart };
}
