import { useState, useEffect, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { getRandomExample } from '../../data/sketchExamples';
import type { SketchExample } from '../../data/sketchExamples';

interface SketchSuggestionProps {
  onSelect: (example: SketchExample) => void;
  onKeep: () => void;
}

export function SketchSuggestion({ onSelect, onKeep }: SketchSuggestionProps) {
  // Phase lives in the store so it survives ChatPanel unmount/remount (tab switch).
  const applied = useEditorStore((s) => s.exampleApplied);
  const appliedLabel = useEditorStore((s) => s.exampleAppliedLabel);
  // Local candidate only matters for the initial "offer" phase.
  const [candidate, setCandidate] = useState<SketchExample | null>(null);

  useEffect(() => {
    if (!applied) setCandidate(getRandomExample());
  }, [applied]);

  const handleGenerate = useCallback(() => {
    if (candidate) onSelect(candidate);
  }, [candidate, onSelect]);

  const handleGenerateNew = useCallback(() => {
    onSelect(getRandomExample());
  }, [onSelect]);

  const label = applied ? appliedLabel : candidate?.label;
  if (!label) return null;

  return (
    <div className="w-full px-3 py-2.5 mx-auto rounded-lg border border-accent/20 bg-accent/5">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md bg-accent/15 flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-accent/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-text-primary/80 truncate">
            {label}
          </p>
          <p className="text-[10px] text-text-muted/40 mt-0.5">
            {applied ? 'Applied. Keep it or try another' : 'Example sketch'}
          </p>
        </div>
      </div>

      {!applied ? (
        <div className="mt-2.5">
          <button
            type="button"
            onClick={handleGenerate}
            className="group w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-accent/15 hover:bg-accent/25 border border-accent/30 hover:border-accent/50 text-[11px] text-text-primary/90 transition-all cursor-pointer"
          >
            Generate
            <svg className="w-3.5 h-3.5 text-accent/50 group-hover:text-accent/80 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-2.5">
          <button
            type="button"
            onClick={onKeep}
            className="group flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-success/15 hover:bg-success/25 border border-success/30 hover:border-success/50 text-[11px] text-text-primary/90 transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-success/70 group-hover:text-success transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Keep it
          </button>
          <button
            type="button"
            onClick={handleGenerateNew}
            title="Generate a different example"
            className="group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-border/10 hover:bg-border/20 border border-border/30 hover:border-border/50 text-[11px] text-text-muted/70 hover:text-text-primary/80 transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 transition-transform group-hover:-rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            New one
          </button>
        </div>
      )}
    </div>
  );
}
