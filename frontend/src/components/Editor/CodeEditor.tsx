import { useEffect, useRef, useCallback } from 'react';
import Editor, { DiffEditor, type OnMount, type DiffOnMount, type BeforeMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { useEditorStore } from '../../store/editorStore';
import { DiffToolbar } from './DiffToolbar';
import { EDITOR_OPTIONS, defineCustomThemes, injectErrorStyles } from './editorConfig';

export function CodeEditor() {
  const code = useEditorStore((s) => s.code);
  const setCode = useEditorStore((s) => s.setCode);
  const runSketch = useEditorStore((s) => s.runSketch);
  const clearConsoleLogs = useEditorStore((s) => s.clearConsoleLogs);
  const editorErrors = useEditorStore((s) => s.editorErrors);
  const pendingDiff = useEditorStore((s) => s.pendingDiff);
  const editorTheme = useEditorStore((s) => s.editorTheme);

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

  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    defineCustomThemes(monaco);
    injectErrorStyles();
  }, []);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    if (!document.querySelector('[data-chat-input]:focus')) {
      editor.focus();
    }
  }, []);

  const handleDiffMount: DiffOnMount = useCallback((editor) => {
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
    requestAnimationFrame(() => tryScroll(10));
  }, []);

  if (pendingDiff) {
    return (
      <div className="h-full w-full" style={{ position: 'relative' }}>
        <DiffToolbar />
        <DiffEditor
          height="100%"
          language="javascript"
          original={pendingDiff.previousCode}
          modified={code}
          theme={editorTheme}
          onMount={handleDiffMount}
          options={{
            ...EDITOR_OPTIONS,
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
        theme={editorTheme}
        options={EDITOR_OPTIONS}
      />
    </div>
  );
}
