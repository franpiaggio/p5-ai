import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import { LIBRARY_PRESETS } from '../../constants/libraryPresets';

export function LibrariesModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const libraries = useEditorStore((s) => s.libraries);
  const addLibrary = useEditorStore((s) => s.addLibrary);
  const removeLibrary = useEditorStore((s) => s.removeLibrary);
  const [customUrl, setCustomUrl] = useState('');
  const [customName, setCustomName] = useState('');

  useEscapeClose(isOpen, onClose);

  if (!isOpen) return null;

  const handleAddCustom = () => {
    const url = customUrl.trim();
    const name = customName.trim() || url.split('/').pop() || 'Custom';
    if (url && url.startsWith('https://')) {
      addLibrary({ name, url });
      setCustomUrl('');
      setCustomName('');
    }
  };

  const isAdded = (url: string) => libraries.some((l) => l.url === url);

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-panel max-w-lg">
        <div className="flex justify-between items-center mb-5">
          <h2 className="modal-title">CDN Libraries</h2>
          <button type="button" onClick={onClose} className="modal-close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current libraries */}
        {libraries.length > 0 && (
          <div className="mb-5">
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-muted/50 mb-2">
              Loaded
            </label>
            <div className="space-y-1.5">
              {libraries.map((lib) => (
                <div key={lib.url} className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-border/15 group">
                  <span className="text-[11px] font-mono text-text-primary truncate flex-1">{lib.name}</span>
                  <span className="text-[9px] font-mono text-text-muted/30 truncate max-w-[140px]" title={lib.url}>
                    {lib.url.replace('https://', '')}
                  </span>
                  <button
                    onClick={() => removeLibrary(lib.url)}
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-accent/20 text-text-muted/40 hover:text-accent transition-all cursor-pointer shrink-0"
                    title="Remove"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Presets */}
        <div className="mb-5">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-text-muted/50 mb-2">
            Quick Add
          </label>
          <div className="flex flex-wrap gap-1.5">
            {LIBRARY_PRESETS.map((preset) => {
              const added = isAdded(preset.url);
              return (
                <button
                  key={preset.url}
                  onClick={() => addLibrary(preset)}
                  disabled={added}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                    added
                      ? 'bg-info/10 text-info/50 cursor-default'
                      : 'bg-border/20 text-text-muted hover:bg-info/15 hover:text-info cursor-pointer'
                  }`}
                >
                  {added ? `${preset.name} ✓` : `+ ${preset.name}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom URL */}
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-widest text-text-muted/50 mb-2">
            Custom CDN URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Name"
              className="input-field w-28"
            />
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://cdn.example.com/lib.js"
              className="input-field flex-1"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustom(); }}
            />
            <button
              onClick={handleAddCustom}
              disabled={!customUrl.trim().startsWith('https://')}
              className="btn-primary px-3 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              Add
            </button>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="btn-primary px-5">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
