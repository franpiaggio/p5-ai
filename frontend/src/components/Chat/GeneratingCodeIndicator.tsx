interface GeneratingCodeIndicatorProps {
  onCancel?: () => void;
}

export function GeneratingCodeIndicator({ onCancel }: GeneratingCodeIndicatorProps) {
  return (
    <div className="my-2 mx-0 rounded-md border border-border overflow-hidden">
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-surface text-[10px] font-mono text-text-muted">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-info"
            style={{ animation: 'generating-pulse 1.5s ease-in-out infinite' }}
          />
          <span
            className="text-info"
            style={{ animation: 'generating-pulse 1.5s ease-in-out infinite' }}
          >
            Generating code…
          </span>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-2 py-0.5 rounded border border-border text-text-muted hover:border-error hover:text-error transition-colors cursor-pointer text-[10px] font-mono"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
