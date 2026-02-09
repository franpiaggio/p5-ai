import { useState, useEffect, useCallback } from 'react';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import { useAuthStore } from '../../store/authStore';
import { useEditorStore } from '../../store/editorStore';
import { createSketch } from '../../services/api';
import { capturePreview } from '../Preview/P5Preview';

export function SaveSketchModal() {
  const isSaveSketchOpen = useAuthStore((s) => s.isSaveSketchOpen);
  const setIsSaveSketchOpen = useAuthStore((s) => s.setIsSaveSketchOpen);
  const code = useEditorStore((s) => s.code);
  const sketchTitle = useEditorStore((s) => s.sketchTitle);
  const setSketchMeta = useEditorStore((s) => s.setSketchMeta);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleClose = useCallback(() => {
    setIsSaveSketchOpen(false);
    setTitle('');
    setDescription('');
    setError('');
  }, [setIsSaveSketchOpen]);

  useEscapeClose(isSaveSketchOpen, handleClose);

  // Pre-fill title from store when modal opens
  useEffect(() => {
    if (isSaveSketchOpen) {
      setTitle(sketchTitle);
    }
  }, [isSaveSketchOpen, sketchTitle]);

  if (!isSaveSketchOpen) return null;

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const thumbnail = await capturePreview();
      const saved = await createSketch({
        title: title.trim(),
        code,
        description: description.trim() || undefined,
        thumbnail,
      });
      setSketchMeta(saved.id, saved.title);
      setIsSaveSketchOpen(false);
      setTitle('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save sketch');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="modal-panel max-w-md">
        <div className="flex justify-between items-center mb-5">
          <h2 className="modal-title">
            Save Sketch
          </h2>
          <button
            onClick={handleClose}
            className="modal-close"
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
