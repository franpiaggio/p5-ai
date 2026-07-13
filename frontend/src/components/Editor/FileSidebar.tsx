import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { isAllowedFileName } from '../../constants/defaultFiles';

export function FileSidebar({ onOpenLibraries }: { onOpenLibraries: () => void }) {
  const files = useEditorStore((s) => s.files);
  const activeFileName = useEditorStore((s) => s.activeFileName);
  const setActiveFile = useEditorStore((s) => s.setActiveFile);
  const addFile = useEditorStore((s) => s.addFile);
  const deleteFile = useEditorStore((s) => s.deleteFile);
  const renameFile = useEditorStore((s) => s.renameFile);
  const libraries = useEditorStore((s) => s.libraries);

  const [isAdding, setIsAdding] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
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
        {files.map((file) => (
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
                  if (file.name !== 'sketch.js') {
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
              </button>
            )}
            {file.name !== 'sketch.js' && !renamingFile && (
              <button
                onClick={(e) => { e.stopPropagation(); deleteFile(file.name); }}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-accent/20 text-text-muted/30 hover:text-accent transition-all cursor-pointer"
                title="Delete file"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}

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
    </div>
  );
}
