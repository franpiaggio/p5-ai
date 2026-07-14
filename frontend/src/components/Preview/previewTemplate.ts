/* eslint-disable no-useless-escape */
import type { SketchFile, Library } from '../../types';

const P5_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js';

/** Infrastructure script: error handling, console proxy, capture support. */
const INFRA_SCRIPT = `
    const LINE_OFFSET = {{LINE_OFFSET}};

    window.onerror = (msg, url, line, col) => {
      const adjustedLine = typeof line === 'number' ? line - LINE_OFFSET : null;
      parent.postMessage({
        type: 'error',
        message: String(msg),
        line: adjustedLine > 0 ? adjustedLine : null,
        column: col || null
      }, '*');
      return true;
    };

    window.addEventListener('unhandledrejection', (event) => {
      let errorLine = null;
      let errorCol = null;
      const reason = event.reason;

      if (reason && reason.stack) {
        const lines = reason.stack.split('\\n');
        for (const stackLine of lines) {
          const match = stackLine.match(/:(\d+):(\d+)/);
          if (match) {
            const rawLine = parseInt(match[1], 10);
            errorLine = rawLine - LINE_OFFSET;
            errorCol = parseInt(match[2], 10);
            if (errorLine > 0) break;
          }
        }
      }

      parent.postMessage({
        type: 'error',
        message: 'Unhandled Promise: ' + String(reason),
        line: errorLine > 0 ? errorLine : null,
        column: errorCol
      }, '*');
    });

    const _log = console.log, _err = console.error, _warn = console.warn, _info = console.info;
    const fmt = (args) => args.map(a => {
      if (typeof a === 'object') try { return JSON.stringify(a, null, 2) } catch { return String(a) }
      return String(a);
    }).join(' ');
    console.log = (...a) => { parent.postMessage({ type: 'log', message: fmt(a) }, '*'); _log.apply(console, a); };
    console.info = (...a) => { parent.postMessage({ type: 'info', message: fmt(a) }, '*'); _info.apply(console, a); };
    console.error = (...a) => { parent.postMessage({ type: 'error', message: fmt(a) }, '*'); _err.apply(console, a); };
    console.warn = (...a) => { parent.postMessage({ type: 'warn', message: fmt(a) }, '*'); _warn.apply(console, a); };

    window.addEventListener('message', (e) => {
      if (e.data?.type === 'capture') {
        const c = document.querySelector('canvas');
        if (!c) { parent.postMessage({ type: 'capture', dataUrl: null }, '*'); return; }
        const max = 320;
        const scale = Math.min(max / c.width, max / c.height, 1);
        const t = document.createElement('canvas');
        t.width = Math.round(c.width * scale);
        t.height = Math.round(c.height * scale);
        const ctx = t.getContext('2d');
        ctx.drawImage(c, 0, 0, t.width, t.height);
        parent.postMessage({ type: 'capture', dataUrl: t.toDataURL('image/webp', 0.7) }, '*');
      }

      if (e.data?.type === 'screenshot') {
        const c = document.querySelector('canvas');
        if (!c) { parent.postMessage({ type: 'screenshot-complete', dataUrl: null }, '*'); return; }
        parent.postMessage({ type: 'screenshot-complete', dataUrl: c.toDataURL('image/png') }, '*');
      }

      if (e.data?.type === 'start-recording') {
        const c = document.querySelector('canvas');
        if (!c) { parent.postMessage({ type: 'recording-error', error: 'No canvas found' }, '*'); return; }
        try {
          const stream = c.captureStream(30);
          const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
          let mimeType = '';
          for (const mt of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mt)) { mimeType = mt; break; }
          }
          if (!mimeType) { parent.postMessage({ type: 'recording-error', error: 'No supported video format' }, '*'); return; }
          const chunks = [];
          const recorder = new MediaRecorder(stream, { mimeType });
          recorder.ondataavailable = (ev) => { if (ev.data.size > 0) chunks.push(ev.data); };
          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            const reader = new FileReader();
            reader.onload = () => { parent.postMessage({ type: 'recording-complete', dataUrl: reader.result }, '*'); };
            reader.onerror = () => { parent.postMessage({ type: 'recording-error', error: 'Failed to encode recording' }, '*'); };
            reader.readAsDataURL(blob);
          };
          recorder.start(100);
          window.__p5Recorder = recorder;
          parent.postMessage({ type: 'recording-started' }, '*');
        } catch (err) {
          parent.postMessage({ type: 'recording-error', error: String(err) }, '*');
        }
      }

      if (e.data?.type === 'stop-recording') {
        const recorder = window.__p5Recorder;
        if (recorder && recorder.state !== 'inactive') {
          recorder.stop();
          window.__p5Recorder = null;
        } else {
          parent.postMessage({ type: 'recording-error', error: 'No active recorder' }, '*');
        }
      }
    });
`;

function escapeScript(code: string): string {
  return code.replace(/<\/script/gi, '<\x2fscript');
}

/** True if any file uses ES module syntax (import/export) — triggers module mode. */
function usesEsModules(files: SketchFile[]): boolean {
  const re = /(^|\n)\s*(import\s+[^;\n]*from\s+['"]|import\s+['"]|import\s*\(|export\s+(default|const|let|var|function|class|async|\{|\*))/;
  return files.some((f) => re.test(f.content));
}

// p5 lifecycle hooks that global mode looks for on `window`. In module scope,
// top-level functions aren't global, so the entry module re-exposes them.
const P5_LIFECYCLE = [
  'setup', 'draw', 'preload', 'mousePressed', 'mouseReleased', 'mouseMoved',
  'mouseDragged', 'mouseClicked', 'doubleClicked', 'mouseWheel', 'keyPressed',
  'keyReleased', 'keyTyped', 'touchStarted', 'touchMoved', 'touchEnded',
  'windowResized', 'deviceMoved', 'deviceTurned', 'deviceShaken',
];

const GLOBAL_BRIDGE = '\n// --- expose p5 lifecycle hooks to global scope ---\n' +
  P5_LIFECYCLE.map((fn) => `if (typeof ${fn} !== 'undefined') window.${fn} = ${fn};`).join('\n');

/** Rewrite relative specifiers that point at sibling files ('./x.js' or 'x.js')
 * to bare specifiers, so the import map resolves them to the file's data URL. */
function rewriteLocalSpecifiers(code: string, fileNames: Set<string>): string {
  const resolve = (spec: string): string | null => {
    const base = spec.replace(/^\.{0,2}\//, '');
    if (fileNames.has(base)) return base;
    if (fileNames.has(base + '.js')) return base + '.js';
    return null;
  };
  // static: `from '...'`, side-effect `import '...'`, `export ... from '...'`
  code = code.replace(/(\bfrom\s*|\bimport\s+)(['"])([^'"]+)(['"])/g, (m, kw, q1, spec, q2) => {
    const r = resolve(spec);
    return r ? `${kw}${q1}${r}${q2}` : m;
  });
  // dynamic import('...')
  code = code.replace(/(\bimport\s*\(\s*)(['"])([^'"]+)(['"])(\s*\))/g, (m, pre, q1, spec, q2, post) => {
    const r = resolve(spec);
    return r ? `${pre}${q1}${r}${q2}${post}` : m;
  });
  return code;
}

/**
 * Build preview HTML using native ES modules + an import map.
 * Each file becomes a data-URL module; relative imports between files are
 * rewritten to bare specifiers resolved via the import map. The entry (sketch.js)
 * gets a bridge that re-exposes its p5 lifecycle functions on `window` so p5's
 * global mode can find them.
 */
function buildModulePreviewHtml(files: SketchFile[], libraries: Library[]): string {
  const libTags = libraries
    .map((lib) => `  <script src="${lib.url}"><\/script>`)
    .join('\n');

  const fileNames = new Set(files.map((f) => f.name));
  const toDataUrl = (content: string) => `data:text/javascript,${encodeURIComponent(content)}`;

  const imports: Record<string, string> = {};
  for (const f of files) {
    let content = rewriteLocalSpecifiers(f.content, fileNames);
    if (f.name === 'sketch.js') content += GLOBAL_BRIDGE;
    imports[f.name] = toDataUrl(content);
  }
  const importMap = JSON.stringify({ imports }, null, 2);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="${P5_CDN}"><\/script>
${libTags ? libTags + '\n' : ''}  <style>
    body { margin: 0; padding: 0; overflow: hidden; background: #fff; }
    canvas { display: block; }
  </style>
  <script>
${INFRA_SCRIPT.replace('{{LINE_OFFSET}}', '0')}  <\/script>
  <script type="importmap">
${importMap}
  <\/script>
</head>
<body>
  <script type="module">import 'sketch.js';<\/script>
</body>
</html>`;
}

/**
 * Build preview HTML for multiple files + CDN libraries.
 * sketch.js is always loaded last (entry point with setup()/draw()).
 * Other files are loaded in array order before sketch.js.
 */
export function buildMultiFilePreviewHtml(files: SketchFile[], libraries: Library[]): string {
  // Hybrid: if any file uses import/export, assemble as real ES modules.
  // Otherwise fall back to global-script concatenation (p5 global mode intact).
  if (usesEsModules(files)) {
    return buildModulePreviewHtml(files, libraries);
  }

  const libTags = libraries
    .map((lib) => `  <script src="${lib.url}"><\/script>`)
    .join('\n');

  // Separate sketch.js from other files; sketch.js goes last
  const sketchFile = files.find((f) => f.name === 'sketch.js');
  const otherFiles = files.filter((f) => f.name !== 'sketch.js');

  // Calculate line offset for sketch.js error mapping
  // Count lines in everything before sketch.js's <script> tag
  const headSection = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="${P5_CDN}"><\/script>
${libTags ? libTags + '\n' : ''}  <style>
    body { margin: 0; padding: 0; overflow: hidden; background: #fff; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script>
${INFRA_SCRIPT}  <\/script>`;

  const otherScripts = otherFiles
    .map((f) => `  <script>/* ${f.name} */\n${escapeScript(f.content)}\n  <\/script>`)
    .join('\n');

  // Calculate line offset: lines before the sketch.js script content
  const beforeSketch = headSection + '\n' + (otherScripts ? otherScripts + '\n' : '');
  const lineOffset = beforeSketch.split('\n').length; // the <script> opening line for sketch.js

  const sketchContent = sketchFile?.content ?? '';

  return `${beforeSketch}  <script>/* sketch.js */
${escapeScript(sketchContent)}
  <\/script>
</body>
</html>`.replace('{{LINE_OFFSET}}', String(lineOffset));
}

// --- Legacy single-code builder (used for history preview) ---

const HTML_BEFORE_CODE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="${P5_CDN}"><\/script>
  <style>
    body { margin: 0; padding: 0; overflow: hidden; background: #fff; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script>
${INFRA_SCRIPT}  <\/script>
  <script>
`;

const HTML_AFTER_CODE = `
  <\/script>
</body>
</html>
`;

const LEGACY_LINE_OFFSET = HTML_BEFORE_CODE.split('\n').length - 1;

export const buildPreviewHtml = (code: string) =>
  HTML_BEFORE_CODE.replace('{{LINE_OFFSET}}', String(LEGACY_LINE_OFFSET)) + code + HTML_AFTER_CODE;
