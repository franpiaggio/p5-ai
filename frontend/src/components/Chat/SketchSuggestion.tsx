import { useState, useEffect, useCallback } from 'react';
import { getRandomExample } from '../../data/sketchExamples';
import type { SketchExample } from '../../data/sketchExamples';

interface SketchSuggestionProps {
  onSelect: (example: SketchExample) => void;
}

export function SketchSuggestion({ onSelect }: SketchSuggestionProps) {
  const [example, setExample] = useState<SketchExample | null>(null);

  useEffect(() => {
    setExample(getRandomExample());
  }, []);

  const handleClick = useCallback(() => {
    if (example) onSelect(example);
  }, [example, onSelect]);

  if (!example) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group w-full text-left px-3 py-2.5 mx-auto rounded-lg border border-accent/20 bg-accent/5 hover:bg-accent/10 hover:border-accent/40 transition-all cursor-pointer"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md bg-accent/15 group-hover:bg-accent/25 flex items-center justify-center shrink-0 transition-colors">
          <svg className="w-3.5 h-3.5 text-accent/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-mono text-text-primary/80 truncate">
            {example.label}
          </p>
          <p className="text-[10px] font-mono text-text-muted/40 mt-0.5">
            Click to generate example
          </p>
        </div>
        <svg className="w-4 h-4 text-accent/30 group-hover:text-accent/60 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
