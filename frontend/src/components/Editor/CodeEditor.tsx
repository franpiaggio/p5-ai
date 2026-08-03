import { useEffect, useRef, useCallback, useState } from 'react';
import Editor, { DiffEditor, type OnMount, type DiffOnMount, type BeforeMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { useEditorStore } from '../../store/editorStore';
import { DiffToolbar } from './DiffToolbar';
import { useIsMobile } from '../../hooks/useIsMobile';
import { EDITOR_OPTIONS, defineCustomThemes, injectErrorStyles, registerFunctionCallTokenProvider, resolveMonacoTheme } from './editorConfig';
import { P5_TYPE_DEFS } from './p5Types';
import { languageFromExtension, isEntryFile } from '../../constants/defaultFiles';
import { computeMinimalEdit } from '../../utils/textDiff';

export function CodeEditor() {
  const code = useEditorStore((s) => s.code);
  const setCode = useEditorStore((s) => s.setCode);
  const runSketch = useEditorStore((s) => s.runSketch);
  const clearConsoleLogs = useEditorStore((s) => s.clearConsoleLogs);
  const editorErrors = useEditorStore((s) => s.editorErrors);
  const pendingDiff = useEditorStore((s) => s.pendingDiff);
  const editorLanguage = useEditorStore((s) => s.editorLanguage);
  const streamingCode = useEditorStore((s) => s.streamingCode);
  const streamingIsPatch = useEditorStore((s) => s.streamingIsPatch);
  const isLoading = useEditorStore((s) => s.isLoading);
  const appTheme = useEditorStore((s) => s.appTheme);
  const isMobile = useIsMobile();
  const files = useEditorStore((s) => s.files);
  const activeFileName = useEditorStore((s) => s.activeFileName);
  const setActiveFile = useEditorStore((s) => s.setActiveFile);
  const openFiles = useEditorStore((s) => s.openFiles);
  const closeTab = useEditorStore((s) => s.closeTab);
  const pendingFilesReview = useEditorStore((s) => s.pendingFilesReview);
  const isFileSidebarOpen = useEditorStore((s) => s.isFileSidebarOpen);
  const setFileSidebarOpen = useEditorStore((s) => s.setFileSidebarOpen);

  const activeLanguage = languageFromExtension(activeFileName);

  // When the theme is 'auto' it tracks the OS preference; re-render on change
  // so the Monaco theme follows the app's light/dark default live. (When the
  // app theme is forced to dark/light, appTheme drives it instead.)
  const [, bumpTheme] = useState(0);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => bumpTheme((n) => n + 1);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const resolvedTheme = resolveMonacoTheme(appTheme);

  // Apply the theme imperatively. @monaco-editor/react's `theme` prop is
  // unreliable when the value settles right around mount (store rehydration
  // racing the first render), which left the editor on a light theme while the
  // app was dark. We setTheme in onMount (via the ref below) and on every change
  // here. setTheme is global + idempotent, so this is the source of truth.
  const resolvedThemeRef = useRef(resolvedTheme);
  resolvedThemeRef.current = resolvedTheme;
  useEffect(() => {
    monacoRef.current?.editor.setTheme(resolvedTheme);
  }, [resolvedTheme]);

  const runRef = useRef(runSketch);
  const clearRef = useRef(clearConsoleLogs);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const decorationsRef = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);
  const streamingDiffRef = useRef<Monaco.editor.IStandaloneDiffEditor | null>(null);
  const streamingPlainRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const streamingInitialRef = useRef<string | null>(null);

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
    registerFunctionCallTokenProvider(monaco);

    const compilerOptions = {
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowJs: true,
      checkJs: false,
      allowNonTsExtensions: true,
      // noEmit must stay false: the preview transpiles TS via getEmitOutput(),
      // which returns nothing when emit is disabled.
      noEmit: false,
    };

    // Configure both JS and TS defaults so language switching works without remount
    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
    monaco.languages.typescript.typescriptDefaults.addExtraLib(P5_TYPE_DEFS, 'p5-global.d.ts');

    monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);
    monaco.languages.typescript.javascriptDefaults.addExtraLib(P5_TYPE_DEFS, 'p5-global.d.ts');
  }, []);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Ensure the resolved theme is applied once Monaco is ready, regardless of
    // what the `theme` prop did during the mount race.
    monaco.editor.setTheme(resolvedThemeRef.current);

    // Disable semantic validation (p5 globals cause false errors), keep syntax validation
    const diagOptions = { noSemanticValidation: true, noSyntaxValidation: false };
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(diagOptions);
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions(diagOptions);

    // Register a transpiler that strips types from ARBITRARY code (not just the
    // active model) via a throwaway model — so every file in a multi-file TS
    // sketch transpiles correctly, not just the one on screen.
    const setTranspiler = useEditorStore.getState().setTranspiler;
    setTranspiler(async (code: string) => {
      const attempt = async (): Promise<string | undefined> => {
        const worker = await monaco.languages.typescript.getTypeScriptWorker();
        const model = monaco.editor.createModel(code, 'typescript');
        try {
          const client = await worker(model.uri);
          const result = await client.getEmitOutput(model.uri.toString());
          const jsFile = result.outputFiles.find((f: { name: string }) => f.name.endsWith('.js'));
          return jsFile ? jsFile.text : code;
        } finally {
          model.dispose();
        }
      };
      // During diff review the main editor unmounts and the TS worker briefly
      // stops answering, so a fresh getEmitOutput can hang. Race each attempt
      // against a timeout and retry until the worker is back (it recovers within
      // ~1s); without this, TS sketches render a black canvas while reviewing.
      const timeout = (ms: number) =>
        new Promise<undefined>((r) => setTimeout(() => r(undefined), ms));
      try {
        for (let i = 0; i < 6; i++) {
          const out = await Promise.race([attempt(), timeout(500)]);
          if (typeof out === 'string') return out;
        }
        return code;
      } catch {
        return code;
      }
    });

    // The first preview may have run before this transpiler existed. Only TS
    // files need it (to strip types, which would otherwise throw), so re-run —
    // clearing the transient first-run error — just for those.
    const st = useEditorStore.getState();
    if (st.files.some((f) => f.language === 'typescript')) {
      st.runSketch();
    }

    if (!document.querySelector('[data-chat-input]:focus')) {
      editor.focus();
    }

    // Force relayout after mount. When the editor mounts before its flex
    // container has settled its size (a fresh route render, Monaco's CDN chunk
    // resolving late), automaticLayout can miss the first measurement and render
    // collapsed — showing only line 1 until a window resize. A few retries over
    // the first frames guarantee the persisted code is visible immediately.
    const forceLayout = () => editorRef.current?.layout();
    requestAnimationFrame(forceLayout);
    requestAnimationFrame(() => requestAnimationFrame(forceLayout));
    setTimeout(forceLayout, 120);
    setTimeout(forceLayout, 350);
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

  // Push the latest streamed code into the visible model as a minimal edit
  // (common prefix/suffix). Replacing the whole buffer (the `modified`/`value`
  // prop / setValue path) drops every diff decoration and Monaco recomputes the
  // diff async, so the editor blinks between plain and highlighted on each chunk.
  const syncStreamingModel = useCallback((target: string) => {
    const editor = streamingDiffRef.current?.getModifiedEditor() ?? streamingPlainRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (model && !model.isDisposed()) {
      const edit = computeMinimalEdit(model.getValue(), target);
      if (edit) {
        const start = model.getPositionAt(edit.start);
        const end = model.getPositionAt(edit.oldEnd);
        model.applyEdits([
          {
            range: {
              startLineNumber: start.lineNumber,
              startColumn: start.column,
              endLineNumber: end.lineNumber,
              endColumn: end.column,
            },
            text: edit.text,
          },
        ]);
      }
    }
    editor.revealLine(model?.getLineCount() || 1);
  }, []);

  const handleStreamingDiffMount: DiffOnMount = useCallback((editor) => {
    streamingDiffRef.current = editor;
    streamingPlainRef.current = null;
    // Chunks may have streamed in while Monaco was still mounting; catch up.
    const current = useEditorStore.getState().streamingCode;
    if (current !== null) syncStreamingModel(current);
  }, [syncStreamingModel]);

  const handleStreamingPlainMount: OnMount = useCallback((editor) => {
    streamingPlainRef.current = editor;
    streamingDiffRef.current = null;
    const current = useEditorStore.getState().streamingCode;
    if (current !== null) syncStreamingModel(current);
  }, [syncStreamingModel]);

  useEffect(() => {
    if (streamingCode === null) {
      streamingDiffRef.current = null;
      streamingPlainRef.current = null;
      streamingInitialRef.current = null;
      return;
    }
    syncStreamingModel(streamingCode);
  }, [streamingCode, syncStreamingModel]);

  if (streamingCode !== null) {
    // Freeze the content prop at the first streamed snapshot: with a readOnly
    // editor, @monaco-editor/react handles prop changes via model.setValue(),
    // which resets the diff and makes the editor flicker on every chunk. Later
    // chunks flow through syncStreamingModel instead.
    if (streamingInitialRef.current === null) {
      streamingInitialRef.current = streamingCode;
    }
    return (
      <div className="h-full w-full relative">
        {streamingIsPatch ? (
          // Search/replace stream: streamingCode is the full file with only the
          // real edits applied, so a live diff is accurate.
          <DiffEditor
            height="100%"
            language={editorLanguage}
            original={code}
            modified={streamingInitialRef.current}
            theme={resolvedTheme}
            onMount={handleStreamingDiffMount}
            options={{
              ...EDITOR_OPTIONS,
              readOnly: true,
              renderSideBySide: false,
              renderOverviewRuler: false,
              glyphMargin: false,
              scrollbar: { vertical: 'hidden', horizontal: 'hidden' },
            }}
          />
        ) : (
          // Full-code rewrite stream: the buffer is a partial file, so diffing
          // it against the whole original would mark everything as changed.
          // Show the code being written plainly; the accurate diff comes with
          // the accept/reject review once the stream completes.
          <Editor
            height="100%"
            language={editorLanguage}
            defaultValue={streamingInitialRef.current}
            theme={resolvedTheme}
            onMount={handleStreamingPlainMount}
            options={{
              ...EDITOR_OPTIONS,
              readOnly: true,
              glyphMargin: false,
              scrollbar: { vertical: 'hidden', horizontal: 'hidden' },
            }}
          />
        )}
        {/* Block manual scroll/interaction during streaming */}
        <div className="absolute inset-0" />
      </div>
    );
  }

  // Multi-file review: step through each changed file's diff. The changes are
  // already applied to `files`; `code` holds the current file's new content.
  if (pendingFilesReview) {
    const change = pendingFilesReview.changes[pendingFilesReview.index];
    return (
      <div className="h-full w-full" style={{ position: 'relative' }}>
        {!isMobile && <DiffToolbar />}
        <DiffEditor
          key={change.name}
          height="100%"
          language={languageFromExtension(change.name)}
          original={change.previousContent}
          modified={code}
          theme={resolvedTheme}
          beforeMount={handleBeforeMount}
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

  if (pendingDiff) {
    return (
      <div className="h-full w-full" style={{ position: 'relative' }}>
        {!isMobile && <DiffToolbar />}
        <DiffEditor
          height="100%"
          language={editorLanguage}
          original={pendingDiff.previousCode}
          modified={code}
          theme={resolvedTheme}
          beforeMount={handleBeforeMount}
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
    <div className="h-full w-full flex flex-col">
      {!isMobile && (
        <div className="flex items-center bg-surface-raised border-b border-border/30 shrink-0">
          <button
            onClick={() => setFileSidebarOpen(!isFileSidebarOpen)}
            className={`p-1.5 mx-1 rounded hover:bg-border/30 transition-colors cursor-pointer shrink-0 ${
              isFileSidebarOpen ? 'text-info' : 'text-text-muted/50 hover:text-info'
            }`}
            title="Toggle file sidebar"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </button>
          <div className="flex-1 flex items-center overflow-x-auto scrollbar-none">
            {openFiles.map((name) => {
              const file = files.find((f) => f.name === name);
              if (!file) return null;
              const isActive = activeFileName === name;
              return (
                <div
                  key={file.id}
                  className={`group/tab flex items-center whitespace-nowrap transition-colors border-b-2 ${
                    isActive
                      ? 'text-info border-info bg-info/5'
                      : 'text-text-muted/60 border-transparent hover:text-text-primary hover:bg-border/20'
                  }`}
                >
                  <button
                    onClick={() => setActiveFile(name)}
                    className="flex items-center gap-1.5 pl-3 py-1.5 text-[11px] font-mono cursor-pointer"
                  >
                    {name}
                    {isEntryFile(name) && (
                      <span
                        className={`px-1 py-px rounded text-[8px] uppercase tracking-wider ${
                          isActive ? 'bg-info/15 text-info' : 'bg-border/40 text-text-muted/50'
                        }`}
                        title="Entry point — holds setup() and draw()"
                      >
                        entry
                      </span>
                    )}
                  </button>
                  {openFiles.length > 1 ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); closeTab(name); }}
                      className={`mx-1 p-0.5 rounded hover:bg-border/50 hover:text-text-primary transition-opacity cursor-pointer ${
                        isActive ? 'opacity-60' : 'opacity-0 group-hover/tab:opacity-60'
                      }`}
                      title="Close tab (file stays in the sketch)"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  ) : (
                    <span className="pr-3" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={activeLanguage}
          path={activeFileName}
          value={code}
          onChange={(value) => setCode(value || '')}
          beforeMount={handleBeforeMount}
          onMount={handleMount}
          theme={resolvedTheme}
          options={{ ...EDITOR_OPTIONS, readOnly: isLoading }}
        />
      </div>
    </div>
  );
}
