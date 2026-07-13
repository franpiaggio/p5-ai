import type * as Monaco from 'monaco-editor';

// JS keywords to exclude from function-call highlighting
const JS_KEYWORDS = new Set([
  'break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete',
  'do', 'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof',
  'new', 'return', 'switch', 'this', 'throw', 'try', 'typeof', 'var',
  'void', 'while', 'with', 'class', 'const', 'enum', 'export', 'extends',
  'import', 'super', 'implements', 'interface', 'let', 'package', 'private',
  'protected', 'public', 'static', 'yield', 'of', 'from', 'as', 'async',
  'await',
]);

const FUNC_CALL_RE = /\b([a-zA-Z_$]\w*)\s*(?=\()/g;

/**
 * Registers a semantic token provider that marks every function call
 * (identifier followed by "(") as a `function` semantic token.
 * This is more reliable than depending on Monaco's TS worker for JS files.
 */
export function registerFunctionCallTokenProvider(monaco: typeof Monaco) {
  const legend: Monaco.languages.SemanticTokensLegend = {
    tokenTypes: ['function'],
    tokenModifiers: [],
  };

  const provider = {
    getLegend: () => legend,
    provideDocumentSemanticTokens(model: Monaco.editor.ITextModel) {
      const lines = model.getLinesContent();
      const data: number[] = [];
      let prevLine = 0;
      let prevChar = 0;

      for (let i = 0; i < lines.length; i++) {
        FUNC_CALL_RE.lastIndex = 0;
        const line = lines[i];
        let match;
        while ((match = FUNC_CALL_RE.exec(line)) !== null) {
          const name = match[1];
          if (JS_KEYWORDS.has(name)) continue;
          const col = match.index;
          data.push(
            i - prevLine,
            prevLine === i ? col - prevChar : col,
            name.length,
            0, // tokenType index → 'function'
            0, // tokenModifiers → none
          );
          prevLine = i;
          prevChar = col;
        }
      }

      return { data: new Uint32Array(data) };
    },
    releaseDocumentSemanticTokens() {},
  };

  monaco.languages.registerDocumentSemanticTokensProvider('javascript', provider);
  monaco.languages.registerDocumentSemanticTokensProvider('typescript', provider);
}

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

export type AppThemeId =
  | 'auto'
  | 'darkroom'
  | 'gallery'
  | 'monokai'
  | 'github-dark'
  | 'vs-dark'
  | 'p5-dark';

/**
 * The single theme list. Each theme paints the whole app: the chrome tokens
 * (index.css `[data-theme]` blocks) and the matching Monaco editor theme, so a
 * theme is one coordinated palette, not a light/dark switch. `swatch` powers the
 * picker preview (surface + accent).
 */
export const APP_THEMES: {
  id: AppThemeId;
  label: string;
  scheme: 'dark' | 'light';
  monaco: string;
  swatch: { bg: string; accent: string };
}[] = [
  { id: 'auto', label: 'Auto', scheme: 'dark', monaco: 'p5-dark', swatch: { bg: '#16213e', accent: '#e94560' } },
  { id: 'darkroom', label: 'Darkroom', scheme: 'dark', monaco: 'p5-darkroom', swatch: { bg: '#1a1714', accent: '#f2a541' } },
  { id: 'gallery', label: 'Gallery', scheme: 'light', monaco: 'p5-gallery', swatch: { bg: '#f4f0e8', accent: '#b9770f' } },
  { id: 'monokai', label: 'Monokai', scheme: 'dark', monaco: 'monokai', swatch: { bg: '#272822', accent: '#fd971f' } },
  { id: 'github-dark', label: 'GitHub Dark', scheme: 'dark', monaco: 'github-dark', swatch: { bg: '#0d1117', accent: '#58a6ff' } },
  { id: 'vs-dark', label: 'VS Dark', scheme: 'dark', monaco: 'vs-dark', swatch: { bg: '#1e1e1e', accent: '#3794ff' } },
  { id: 'p5-dark', label: 'p5 Dark', scheme: 'dark', monaco: 'p5-dark', swatch: { bg: '#16213e', accent: '#e94560' } },
];

/**
 * Resolve a theme id to its concrete Monaco theme. 'auto' tracks the OS so the
 * editor matches the chrome's system-driven default.
 */
export function resolveMonacoTheme(appTheme: string): string {
  if (appTheme === 'auto') {
    const dark = typeof window === 'undefined' || window.matchMedia('(prefers-color-scheme: dark)').matches;
    return dark ? 'p5-dark' : 'p5-gallery';
  }
  return APP_THEMES.find((t) => t.id === appTheme)?.monaco ?? 'p5-dark';
}

// Monaco JS tokenizer tokens (Monarch-based):
// identifier, keyword, keyword.flow, number, number.float, number.hex,
// string, string.escape, regexp, comment, delimiter, delimiter.bracket,
// delimiter.parenthesis, delimiter.square, delimiter.angle, operator, type.identifier
//
// Semantic token types (from TS language service):
// function, method, property, variable, parameter, class, interface, enum, type

export function defineCustomThemes(monaco: typeof Monaco) {
  // Darkroom — warm graphite ground so the editor matches the app chrome.
  monaco.editor.defineTheme('p5-darkroom', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'e6864f' },
      { token: 'keyword.flow', foreground: 'e6864f' },
      { token: 'identifier', foreground: 'cfc2ac' },
      { token: 'type.identifier', foreground: '7fb7a8' },
      { token: 'string', foreground: 'd99b7a' },
      { token: 'string.escape', foreground: 'e0b877' },
      { token: 'number', foreground: '9ec27a' },
      { token: 'number.float', foreground: '9ec27a' },
      { token: 'number.hex', foreground: '9ec27a' },
      { token: 'regexp', foreground: 'd99b7a' },
      { token: 'comment', foreground: '7a7060', fontStyle: 'italic' },
      { token: 'delimiter', foreground: 'a89a86' },
      { token: 'delimiter.bracket', foreground: 'e0b551' },
      { token: 'operator', foreground: 'b7a68e' },
      { token: 'function', foreground: 'f0c274' },
      { token: 'method', foreground: 'f0c274' },
      { token: 'property', foreground: 'cfc2ac' },
      { token: 'variable', foreground: 'cfc2ac' },
      { token: 'parameter', foreground: 'cfc2ac' },
      { token: 'class', foreground: '7fb7a8' },
      { token: 'interface', foreground: '7fb7a8' },
      { token: 'enum', foreground: '7fb7a8' },
      { token: 'type', foreground: '7fb7a8' },
    ],
    colors: {
      'editor.background': '#1a1714',
      'editor.foreground': '#d8ccbb',
      'editor.lineHighlightBackground': '#ffffff06',
      'editor.selectionBackground': '#4a3f2e',
      'editorCursor.foreground': '#f2a541',
      'editorLineNumber.foreground': '#6d6455',
      'editorLineNumber.activeForeground': '#b7ac9c',
      'editorIndentGuide.background': '#ffffff0d',
      'editorIndentGuide.activeBackground': '#ffffff20',
    },
  });

  // Gallery — warm paper for the light app theme.
  monaco.editor.defineTheme('p5-gallery', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'b5561f' },
      { token: 'keyword.flow', foreground: 'b5561f' },
      { token: 'identifier', foreground: '4a4136' },
      { token: 'type.identifier', foreground: '2f7d70' },
      { token: 'string', foreground: 'a85a37' },
      { token: 'string.escape', foreground: '9a6b12' },
      { token: 'number', foreground: '557a35' },
      { token: 'number.float', foreground: '557a35' },
      { token: 'number.hex', foreground: '557a35' },
      { token: 'regexp', foreground: 'a85a37' },
      { token: 'comment', foreground: 'a99b82', fontStyle: 'italic' },
      { token: 'delimiter', foreground: '7c7263' },
      { token: 'delimiter.bracket', foreground: 'b9770f' },
      { token: 'operator', foreground: '7c7263' },
      { token: 'function', foreground: '9a6b12' },
      { token: 'method', foreground: '9a6b12' },
      { token: 'property', foreground: '4a4136' },
      { token: 'variable', foreground: '4a4136' },
      { token: 'parameter', foreground: '4a4136' },
      { token: 'class', foreground: '2f7d70' },
      { token: 'interface', foreground: '2f7d70' },
      { token: 'enum', foreground: '2f7d70' },
      { token: 'type', foreground: '2f7d70' },
    ],
    colors: {
      'editor.background': '#fbf8f2',
      'editor.foreground': '#4a4136',
      'editor.lineHighlightBackground': '#0000000a',
      'editor.selectionBackground': '#e7dcc2',
      'editorCursor.foreground': '#b9770f',
      'editorLineNumber.foreground': '#b3a892',
      'editorLineNumber.activeForeground': '#5d564a',
      'editorIndentGuide.background': '#00000012',
      'editorIndentGuide.activeBackground': '#00000026',
    },
  });

  monaco.editor.defineTheme('p5-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      // Monarch tokens
      { token: 'keyword', foreground: 'c586c0' },
      { token: 'keyword.flow', foreground: 'c586c0' },
      { token: 'identifier', foreground: '9cdcfe' },
      { token: 'type.identifier', foreground: '4ec9b0' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'string.escape', foreground: 'd7ba7d' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'number.float', foreground: 'b5cea8' },
      { token: 'number.hex', foreground: 'b5cea8' },
      { token: 'regexp', foreground: 'd16969' },
      { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'delimiter', foreground: 'd4d4d4' },
      { token: 'delimiter.bracket', foreground: 'ffd700' },
      { token: 'operator', foreground: 'd4d4d4' },
      // Semantic tokens
      { token: 'function', foreground: 'dcdcaa' },
      { token: 'method', foreground: 'dcdcaa' },
      { token: 'property', foreground: '9cdcfe' },
      { token: 'variable', foreground: '9cdcfe' },
      { token: 'parameter', foreground: '9cdcfe' },
      { token: 'class', foreground: '4ec9b0' },
      { token: 'interface', foreground: '4ec9b0' },
      { token: 'enum', foreground: '4ec9b0' },
      { token: 'type', foreground: '4ec9b0' },
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
      { token: 'keyword.flow', foreground: 'f92672' },
      { token: 'identifier', foreground: 'f8f8f2' },
      { token: 'type.identifier', foreground: '66d9ef', fontStyle: 'italic' },
      { token: 'string', foreground: 'e6db74' },
      { token: 'number', foreground: 'ae81ff' },
      { token: 'regexp', foreground: 'e6db74' },
      { token: 'comment', foreground: '75715e', fontStyle: 'italic' },
      { token: 'delimiter', foreground: 'f8f8f2' },
      { token: 'operator', foreground: 'f92672' },
      // Semantic tokens
      { token: 'function', foreground: 'a6e22e' },
      { token: 'method', foreground: 'a6e22e' },
      { token: 'property', foreground: 'f8f8f2' },
      { token: 'variable', foreground: 'f8f8f2' },
      { token: 'parameter', foreground: 'fd971f', fontStyle: 'italic' },
      { token: 'class', foreground: '66d9ef', fontStyle: 'italic underline' },
      { token: 'type', foreground: '66d9ef', fontStyle: 'italic' },
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
      { token: 'keyword.flow', foreground: 'ff7b72' },
      { token: 'identifier', foreground: 'c9d1d9' },
      { token: 'type.identifier', foreground: 'ffa657' },
      { token: 'string', foreground: 'a5d6ff' },
      { token: 'number', foreground: '79c0ff' },
      { token: 'regexp', foreground: '7ee787' },
      { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
      { token: 'delimiter', foreground: 'c9d1d9' },
      { token: 'operator', foreground: 'ff7b72' },
      // Semantic tokens
      { token: 'function', foreground: 'd2a8ff' },
      { token: 'method', foreground: 'd2a8ff' },
      { token: 'property', foreground: '79c0ff' },
      { token: 'variable', foreground: 'c9d1d9' },
      { token: 'parameter', foreground: 'ffa657' },
      { token: 'class', foreground: 'ffa657' },
      { token: 'type', foreground: 'ffa657' },
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
