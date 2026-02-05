import { useEffect, useRef, useCallback } from 'react';
import Editor, { DiffEditor, type OnMount, type DiffOnMount, type BeforeMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { useEditorStore } from '../../store/editorStore';

function DiffToolbar() {
  const acceptPendingDiff = useEditorStore((s) => s.acceptPendingDiff);
  const rejectPendingDiff = useEditorStore((s) => s.rejectPendingDiff);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        rejectPendingDiff();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        acceptPendingDiff();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [acceptPendingDiff, rejectPendingDiff]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 20,
        zIndex: 10,
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '6px 10px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        fontFamily: 'monospace',
        fontSize: 11,
      }}
    >
      <span style={{ color: 'var(--color-text-muted)', marginRight: 4 }}>
        Review changes
      </span>
      <button
        onClick={rejectPendingDiff}
        style={{
          background: 'transparent',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-muted)',
          padding: '4px 12px',
          borderRadius: 5,
          cursor: 'pointer',
          fontSize: 11,
          fontFamily: 'monospace',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#ff5555';
          e.currentTarget.style.color = '#ff5555';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.color = 'var(--color-text-muted)';
        }}
      >
        Reject <span style={{ opacity: 0.5 }}>Esc</span>
      </button>
      <button
        onClick={acceptPendingDiff}
        style={{
          background: 'var(--color-success, #22c55e)',
          border: 'none',
          color: '#fff',
          padding: '4px 12px',
          borderRadius: 5,
          cursor: 'pointer',
          fontSize: 11,
          fontFamily: 'monospace',
          fontWeight: 600,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        Accept <span style={{ opacity: 0.7 }}>Ctrl+Enter</span>
      </button>
    </div>
  );
}

export function CodeEditor() {
  const code = useEditorStore((s) => s.code);
  const setCode = useEditorStore((s) => s.setCode);
  const runSketch = useEditorStore((s) => s.runSketch);
  const clearConsoleLogs = useEditorStore((s) => s.clearConsoleLogs);
  const editorErrors = useEditorStore((s) => s.editorErrors);
  const pendingDiff = useEditorStore((s) => s.pendingDiff);

  const runRef = useRef(runSketch);
  const clearRef = useRef(clearConsoleLogs);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const decorationsRef = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);

  runRef.current = runSketch;
  clearRef.current = clearConsoleLogs;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'Enter') {
        e.preventDefault();
        clearRef.current();
        runRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update Monaco markers and line decorations when editorErrors change
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    const lineCount = model.getLineCount();
    const validErrors = editorErrors.filter((error) => error.line >= 1 && error.line <= lineCount);

    const markers: Monaco.editor.IMarkerData[] = validErrors.map((error) => ({
      severity: monacoRef.current!.MarkerSeverity.Error,
      message: error.message,
      startLineNumber: error.line,
      startColumn: error.column || 1,
      endLineNumber: error.line,
      endColumn: error.column ? error.column + 1 : model.getLineMaxColumn(error.line),
    }));
    monacoRef.current.editor.setModelMarkers(model, 'runtime-errors', markers);

    const decorations: Monaco.editor.IModelDeltaDecoration[] = validErrors.map((error) => ({
      range: new monacoRef.current!.Range(error.line, 1, error.line, 1),
      options: {
        isWholeLine: true,
        className: 'error-line-decoration',
        glyphMarginClassName: 'error-glyph-margin',
        lineNumberClassName: 'error-line-number',
        overviewRuler: {
          color: '#ff5555',
          position: monacoRef.current!.editor.OverviewRulerLane.Full,
        },
      },
    }));

    if (decorationsRef.current) {
      decorationsRef.current.clear();
    }
    decorationsRef.current = editorRef.current.createDecorationsCollection(decorations);
  }, [editorErrors]);

  const handleBeforeMount: BeforeMount = useCallback(() => {
    const id = 'editor-custom-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      .error-line-decoration {
        background-color: rgba(255, 85, 85, 0.15) !important;
      }
      .error-glyph-margin {
        background-color: #ff5555;
        border-radius: 50%;
        margin-left: 5px;
        width: 8px !important;
        height: 8px !important;
      }
      .error-line-number {
        color: #ff5555 !important;
        font-weight: bold !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.focus();
  }, []);

  const editorOptions = {
    minimap: { enabled: false },
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    fontLigatures: true,
    lineNumbers: 'on' as const,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    wordWrap: 'on' as const,
    padding: { top: 8 },
    renderLineHighlight: 'gutter' as const,
    cursorBlinking: 'smooth' as const,
    cursorSmoothCaretAnimation: 'on' as const,
    smoothScrolling: true,
    bracketPairColorization: { enabled: true },
    glyphMargin: true,
  };

  // Scroll DiffEditor to first change once diffs are computed
  const handleDiffMount: DiffOnMount = useCallback((editor) => {
    // getLineChanges() can be null until the diff is computed, so poll briefly
    const tryScroll = (retries: number) => {
      const changes = editor.getLineChanges();
      if (changes && changes.length > 0) {
        const firstLine = changes[0].modifiedStartLineNumber || changes[0].originalStartLineNumber;
        editor.getModifiedEditor().revealLineInCenter(firstLine);
        return;
      }
      if (retries > 0) {
        requestAnimationFrame(() => tryScroll(retries - 1));
      }
    };
    // Give Monaco ~10 frames to compute the diff
    requestAnimationFrame(() => tryScroll(10));
  }, []);

  // When pending diff is active, show inline diff editor
  if (pendingDiff) {
    return (
      <div className="h-full w-full" style={{ position: 'relative' }}>
        <DiffToolbar />
        <DiffEditor
          height="100%"
          language="javascript"
          original={code}
          modified={pendingDiff.code}
          theme="vs-dark"
          onMount={handleDiffMount}
          options={{
            ...editorOptions,
            readOnly: true,
            renderSideBySide: false,
            renderOverviewRuler: false,
            glyphMargin: false,
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage="javascript"
        value={code}
        onChange={(value) => setCode(value || '')}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        theme="vs-dark"
        options={editorOptions}
      />
    </div>
  );
}
