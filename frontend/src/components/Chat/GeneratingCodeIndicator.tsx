export function GeneratingCodeIndicator() {
  return (
    <div className="my-2 mx-0 rounded-md border border-border overflow-hidden">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface text-[10px] font-mono text-text-muted">
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
    </div>
  );
}
