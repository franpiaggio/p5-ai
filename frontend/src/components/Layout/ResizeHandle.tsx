interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  onMouseDown: (e: React.MouseEvent) => void;
}

export function ResizeHandle({ direction, onMouseDown }: ResizeHandleProps) {
  const isHorizontal = direction === 'horizontal';

  return (
    <div
      className={`${
        isHorizontal ? 'w-[3px] cursor-col-resize' : 'h-[3px] cursor-row-resize'
      } bg-border/40 hover:bg-accent shrink-0 transition-colors duration-150 relative group`}
      onMouseDown={onMouseDown}
    >
      <div
        className={`absolute ${
          isHorizontal ? 'inset-y-0 -left-1 -right-1' : 'inset-x-0 -top-1 -bottom-1'
        }`}
      />
    </div>
  );
}
