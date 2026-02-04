import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useEditorStore } from '../../store/editorStore';
import { createSketch } from '../../services/api';

export function SaveSketchModal() {
  const isSaveSketchOpen = useAuthStore((s) => s.isSaveSketchOpen);
  const setIsSaveSketchOpen = useAuthStore((s) => s.setIsSaveSketchOpen);
  const code = useEditorStore((s) => s.code);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isSaveSketchOpen) return null;

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createSketch({
        title: title.trim(),
        code,
        description: description.trim() || undefined,
      });
      setIsSaveSketchOpen(false);
      setTitle('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save sketch');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setIsSaveSketchOpen(false);
    setTitle('');
    setDescription('');
    setError('');
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-surface-raised rounded-xl p-6 w-full max-w-md border border-border/60 shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-base font-mono font-semibold text-text-primary tracking-wide">
            Save Sketch
          </h2>
          <button
            onClick={handleClose}
            className="text-text-muted/40 hover:text-accent transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-muted/50 mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My awesome sketch"
              className="input-field"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-muted/50 mb-1.5">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description..."
              rows={3}
              className="input-field resize-none"
            />
          </div>

          {error && (
            <p className="text-[11px] font-mono text-accent">{error}</p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-1.5 text-xs font-mono text-text-muted hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="btn-primary px-5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
