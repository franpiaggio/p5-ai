import { useEffect, useMemo, useRef, useState } from 'react';
import type { ModelInfo } from '../../types';

interface ModelComboboxProps {
  id?: string;
  value: string;
  onChange: (model: string) => void;
  models: ModelInfo[];
  loading?: boolean;
  disabled?: boolean;
}

/**
 * Searchable model picker. Type to filter the provider's catalog, arrow keys +
 * Enter to select, and any typed value can be committed with Enter so custom /
 * not-yet-listed model IDs still work.
 */
export function ModelCombobox({
  id,
  value,
  onChange,
  models,
  loading,
  disabled,
}: ModelComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Just-opened (query still equals the current value) shows the whole list.
    if (!open || !q || q === value.toLowerCase()) return models;
    return models.filter((m) => m.id.toLowerCase().includes(q));
  }, [models, query, open, value]);

  // Close on outside click (keeps option clicks working — see onMouseDown below).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Keep the highlighted option scrolled into view.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const openList = () => {
    if (disabled) return;
    setQuery(value);
    const idx = models.findIndex((m) => m.id === value);
    setActive(idx >= 0 ? idx : 0);
    setOpen(true);
  };

  const commit = (model: string) => {
    const next = model.trim();
    if (next) onChange(next);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commit(filtered[active]?.id ?? query);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  const display = open ? query : value;

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        value={display}
        placeholder="Search models…"
        onFocus={openList}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          if (!open) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="input-field pr-8 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted/50">
        {loading ? (
          <span className="inline-block w-3.5 h-3.5 border-2 border-info/30 border-t-info rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </span>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border/50 bg-raised shadow-lg py-1"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-[11px] text-text-muted/50">
              {loading ? 'Loading models…' : 'No models match — press Enter to use as-is'}
            </li>
          ) : (
            filtered.map((model, i) => {
              const isSelected = model.id === value;
              const isActive = i === active;
              const isFree = model.id.endsWith(':free');
              return (
                <li key={model.id} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    // Prevent the input's blur so the click lands as a select.
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => commit(model.id)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[13px] cursor-pointer ${
                      isActive ? 'bg-accent/15 text-text-primary' : 'text-text-muted'
                    }`}
                  >
                    <span className="truncate flex items-center gap-1.5">
                      {isSelected && (
                        <svg className="w-3.5 h-3.5 shrink-0 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      <span className={`truncate ${isSelected ? '' : 'pl-5'}`}>{model.id}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      {model.vision && (
                        <span
                          title="Accepts image input"
                          className="flex items-center rounded bg-info/15 text-info/80 text-[9px] font-medium px-1.5 py-0.5 uppercase tracking-wide"
                        >
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1 1 0 010-.644C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178a1 1 0 010 .644C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </span>
                      )}
                      {isFree && (
                        <span className="rounded bg-success/15 text-success/80 text-[9px] font-medium px-1.5 py-0.5 uppercase tracking-wide">
                          Free
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
