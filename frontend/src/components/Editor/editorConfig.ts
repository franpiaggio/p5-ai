import type * as Monaco from 'monaco-editor';

export const EDITOR_OPTIONS = {
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
  guides: { bracketPairs: true, indentation: true },
  glyphMargin: true,
  'semanticHighlighting.enabled': true,
};

export type EditorThemeId = 'vs-dark' | 'p5-dark' | 'monokai' | 'github-dark';

export const EDITOR_THEMES: { id: EditorThemeId; label: string }[] = [
  { id: 'vs-dark', label: 'VS Dark (default)' },
  { id: 'p5-dark', label: 'p5 Dark' },
  { id: 'monokai', label: 'Monokai' },
  { id: 'github-dark', label: 'GitHub Dark' },
];

export function defineCustomThemes(monaco: typeof Monaco) {
  monaco.editor.defineTheme('p5-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'c586c0' },
      { token: 'storage', foreground: '569cd6' },
      { token: 'type', foreground: '4ec9b0' },
      { token: 'entity.name.function', foreground: 'dcdcaa' },
      { token: 'support.function', foreground: 'dcdcaa' },
      { token: 'variable', foreground: '9cdcfe' },
      { token: 'variable.predefined', foreground: '4fc1ff' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'regexp', foreground: 'd16969' },
      { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'delimiter.bracket', foreground: 'ffd700' },
      { token: 'constant', foreground: '4fc1ff' },
    ],
    colors: {
      'editor.background': '#16213e',
      'editor.foreground': '#d4d4d4',
      'editor.lineHighlightBackground': '#ffffff08',
      'editor.selectionBackground': '#264f78',
      'editorIndentGuide.background': '#ffffff10',
      'editorIndentGuide.activeBackground': '#ffffff20',
    },
  });

  monaco.editor.defineTheme('monokai', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'f92672' },
      { token: 'storage', foreground: '66d9ef', fontStyle: 'italic' },
      { token: 'type', foreground: '66d9ef', fontStyle: 'italic' },
      { token: 'entity.name.function', foreground: 'a6e22e' },
      { token: 'support.function', foreground: 'a6e22e' },
      { token: 'variable', foreground: 'f8f8f2' },
      { token: 'string', foreground: 'e6db74' },
      { token: 'number', foreground: 'ae81ff' },
      { token: 'regexp', foreground: 'e6db74' },
      { token: 'comment', foreground: '75715e', fontStyle: 'italic' },
      { token: 'constant', foreground: 'ae81ff' },
      { token: 'delimiter', foreground: 'f8f8f2' },
    ],
    colors: {
      'editor.background': '#272822',
      'editor.foreground': '#f8f8f2',
      'editor.lineHighlightBackground': '#3e3d32',
      'editor.selectionBackground': '#49483e',
      'editorCursor.foreground': '#f8f8f0',
      'editorIndentGuide.background': '#464741',
    },
  });

  monaco.editor.defineTheme('github-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'ff7b72' },
      { token: 'storage', foreground: 'ff7b72' },
      { token: 'type', foreground: 'ffa657' },
      { token: 'entity.name.function', foreground: 'd2a8ff' },
      { token: 'support.function', foreground: 'd2a8ff' },
      { token: 'variable', foreground: 'c9d1d9' },
      { token: 'string', foreground: 'a5d6ff' },
      { token: 'number', foreground: '79c0ff' },
      { token: 'regexp', foreground: '7ee787' },
      { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
      { token: 'constant', foreground: '79c0ff' },
      { token: 'delimiter', foreground: 'c9d1d9' },
    ],
    colors: {
      'editor.background': '#0d1117',
      'editor.foreground': '#c9d1d9',
      'editor.lineHighlightBackground': '#161b22',
      'editor.selectionBackground': '#264f78',
      'editorCursor.foreground': '#c9d1d9',
      'editorIndentGuide.background': '#21262d',
    },
  });
}

export function injectErrorStyles() {
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
}
