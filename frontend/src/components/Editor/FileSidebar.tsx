import { useState, useRef, useEffect } from 'react';
import { useEditorStore, isMultiFileSketch } from '../../store/editorStore';
import { isAllowedFileName, isEntryFile, findEntryFile } from '../../constants/defaultFiles';
import { filesReferencing } from '../../utils/codeUtils';
import { useEscapeClose } from '../../hooks/useEscapeClose';

export function FileSidebar({ onOpenLibraries }: { onOpenLibraries: () => void }) {
  const files = useEditorStore((s) => s.files);
  const activeFileName = useEditorStore((s) => s.activeFileName);
  const setActiveFile = useEditorStore((s) => s.setActiveFile);
  const addFile = useEditorStore((s) => s.addFile);
  const deleteFile = useEditorStore((s) => s.deleteFile);
  const renameFile = useEditorStore((s) => s.renameFile);
  const libraries = useEditorStore((s) => s.libraries);
  const multiFile = useEditorStore(isMultiFileSketch);
  const setMultiFileEnabled = useEditorStore((s) => s.setMultiFileEnabled);
  const isReviewing = useEditorStore((s) => !!s.pendingFilesReview);

  const [isAdding, setIsAdding] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  // Name of the file pending an inline delete confirmation (replaces immediate delete).
  const [confirmDeleteName, setConfirmDeleteName] = useState<string | null>(null);
  // Merging several files back into one is destructive — confirm it first.
  const [confirmMerge, setConfirmMerge] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding) addInputRef.current?.focus();
  }, [isAdding]);

  useEffect(() => {
    if (renamingFile) renameInputRef.current?.select();
  }, [renamingFile]);

  const handleAddFile = () => {
    const name = newFileName.trim();
    if (name && isAllowedFileName(name)) {
      addFile(name);
      setNewFileName('');
      setIsAdding(false);
    }
  };

  const handleRename = () => {
    const newName = renameValue.trim();
    if (renamingFile && newName && isAllowedFileName(newName)) {
      renameFile(renamingFile, newName);
    }
    setRenamingFile(null);
  };

  const performDelete = (name: string) => {
    deleteFile(name);
    setConfirmDeleteName(null);
  };

  // Empty, unreferenced files delete instantly; anything with content (or that
  // other files depend on) goes through the confirmation modal.
  const requestDelete = (name: string) => {
    const file = files.find((f) => f.name === name);
    if (!file) return;
    const isTrivial = !file.content.trim() && filesReferencing(file, files).length === 0;
    if (isTrivial) deleteFile(name);
    else setConfirmDeleteName(name);
  };

  // Multi-file is opt-in: on turns it on for the assistant too, off folds every
  // helper file back into the entry file.
  const toggleMultiFile = () => {
    if (isReviewing) return;
    if (!multiFile) {
      setMultiFileEnabled(true);
      return;
    }
    if (files.length > 1) setConfirmMerge(true);
    else setMultiFileEnabled(false);
  };

  useEscapeClose(!!confirmDeleteName, () => setConfirmDeleteName(null));
  useEscapeClose(confirmMerge, () => setConfirmMerge(false));

  const pendingFile = confirmDeleteName
    ? files.find((f) => f.name === confirmDeleteName)
    : undefined;
  const pendingUsedBy = pendingFile ? filesReferencing(pendingFile, files) : [];

  return (
    <div className="w-44 bg-surface-raised border-r border-border/40 flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/30">
        <span className="text-[9px] font-mono uppercase tracking-widest text-text-muted/50">Files</span>
        <button
          onClick={() => setIsAdding(true)}
          className="p-0.5 rounded hover:bg-border/40 text-text-muted/50 hover:text-info transition-colors cursor-pointer"
          title="Add file"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto py-1">
        {files.map((file) => {
          return (
            <div key={file.id} className="group relative">
              {renamingFile === file.name ? (
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                    if (e.key === 'Escape') setRenamingFile(null);
                  }}
                  className="w-full px-3 py-1 text-[11px] font-mono bg-border/20 text-text-primary outline-none border border-info/40"
                />
              ) : (
                <button
                  onClick={() => setActiveFile(file.name)}
                  onDoubleClick={() => {
                    if (!isEntryFile(file.name)) {
                      setRenamingFile(file.name);
                      setRenameValue(file.name);
                    }
                  }}
                  className={`w-full text-left px-3 py-1.5 text-[11px] font-mono transition-colors flex items-center gap-1.5 ${
                    activeFileName === file.name
                      ? 'bg-info/10 text-info'
                      : 'text-text-muted hover:bg-border/20 hover:text-text-primary'
                  }`}
                >
                  <svg className="w-3 h-3 shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="truncate">{file.name}</span>
                  {isEntryFile(file.name) && (
                    <span
                      className={`ml-auto mr-1 px-1 py-px rounded text-[8px] uppercase tracking-wider shrink-0 ${
                        activeFileName === file.name
                          ? 'bg-info/15 text-info'
                          : 'bg-border/40 text-text-muted/50'
                      }`}
                      title="Entry point — holds setup() and draw()"
                    >
                      entry
                    </span>
                  )}
                </button>
              )}
              {!isEntryFile(file.name) && !renamingFile && (
                <button
                  onClick={(e) => { e.stopPropagation(); requestDelete(file.name); }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-accent/20 text-text-muted/50 hover:text-accent transition-all cursor-pointer"
                  title="Delete file"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}

        {/* Add file input */}
        {isAdding && (
          <div className="px-2 py-1">
            <input
              ref={addInputRef}
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onBlur={() => { handleAddFile(); if (!newFileName.trim()) setIsAdding(false); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddFile();
                if (e.key === 'Escape') { setIsAdding(false); setNewFileName(''); }
              }}
              placeholder="filename.js"
              className="w-full px-2 py-1 text-[11px] font-mono bg-border/20 text-text-primary placeholder-text-muted/30 outline-none border border-info/40 rounded"
            />
          </div>
        )}
      </div>

      {/* Sketch layout: single file by default, multi-file on request */}
      <div className="border-t border-border/30 px-3 py-2">
        <button
          onClick={toggleMultiFile}
          disabled={isReviewing}
          role="switch"
          aria-checked={multiFile}
          className="w-full flex items-center justify-between gap-2 text-[11px] font-mono text-text-muted hover:text-text-primary transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title={
            isReviewing
              ? 'Finish reviewing the pending changes first'
              : multiFile
                ? 'Merge everything back into one file'
                : 'Let the assistant split this sketch across files'
          }
        >
          <span>Multi-file</span>
          <span
            className={`relative w-7 h-4 rounded-full transition-colors shrink-0 ${
              multiFile ? 'bg-info/70' : 'bg-border/60'
            }`}
          >
            <span
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-surface-raised transition-all ${
                multiFile ? 'left-3.5' : 'left-0.5'
              }`}
            />
          </span>
        </button>
        {!multiFile && (
          <p className="mt-1 text-[9px] leading-snug text-text-muted/50">
            The assistant keeps everything in {findEntryFile(files)?.name ?? 'sketch.js'}.
          </p>
        )}
      </div>

      {/* Libraries section */}
      <div className="border-t border-border/30">
        <button
          onClick={onOpenLibraries}
          className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-mono text-text-muted hover:bg-border/20 hover:text-info transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Libraries
          </span>
          {libraries.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-info/15 text-info text-[9px]">
              {libraries.length}
            </span>
          )}
        </button>
      </div>

      {/* Merge-to-single-file confirmation */}
      {confirmMerge && (
        <div
          className="modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmMerge(false); }}
        >
          <div className="modal-panel max-w-sm" role="dialog" aria-modal="true" aria-labelledby="merge-files-title">
            <h2 id="merge-files-title" className="text-sm font-semibold text-text-primary">
              Merge into a single file
            </h2>
            <p className="mt-3 text-[12px] text-text-muted">
              The {files.length} files of this sketch become one{' '}
              <span className="font-mono text-text-primary">{findEntryFile(files)?.name ?? 'sketch.js'}</span>,
              in the order the preview loads them. Imports between them are removed.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmMerge(false)} className="btn-ghost btn-sm">
                Cancel
              </button>
              <button
                onClick={() => { setMultiFileEnabled(false); setConfirmMerge(false); }}
                className="btn-primary btn-sm"
                autoFocus
              >
                Merge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {pendingFile && (
        <div
          className="modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmDeleteName(null); }}
        >
          <div className="modal-panel max-w-sm" role="dialog" aria-modal="true" aria-labelledby="delete-file-title">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 id="delete-file-title" className="text-sm font-semibold text-text-primary">Delete file</h2>
                <p className="text-[11px] text-text-muted/50 mt-0.5 font-mono truncate">{pendingFile.name}</p>
              </div>
            </div>

            <p className="text-[12px] text-text-muted">
              This permanently removes <span className="font-mono text-text-primary">{pendingFile.name}</span> from the sketch. This can’t be undone.
            </p>
            {pendingUsedBy.length > 0 && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-warning/10 border border-warning/20 px-3 py-2">
                <svg className="w-4 h-4 text-warning shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86l-8.58 14.85A1 1 0 002.56 20h18.88a1 1 0 00.85-1.29L13.71 3.86a1 1 0 00-1.42 0z" />
                </svg>
                <p className="text-[11px] text-warning/90 leading-snug">
                  Referenced by <span className="font-mono">{pendingUsedBy.join(', ')}</span> — deleting it may break the sketch.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmDeleteName(null)} className="btn-ghost btn-sm">
                Cancel
              </button>
              <button onClick={() => performDelete(pendingFile.name)} className="btn-danger btn-sm" autoFocus>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
