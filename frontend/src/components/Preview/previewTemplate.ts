// Template parts split to calculate line offset
const HTML_BEFORE_CODE = `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"><\/script>
  <style>
    body { margin: 0; padding: 0; overflow: hidden; background: #fff; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script>
    const LINE_OFFSET = {{LINE_OFFSET}};

    window.onerror = (msg, url, line, col) => {
      // Adjust line number by subtracting the template offset
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

      // Try to extract line from stack trace
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
    });
  <\/script>
  <script>
`;

const HTML_AFTER_CODE = `
  <\/script>
</body>
</html>
`;

// Calculate line offset: count newlines in HTML_BEFORE_CODE
const LINE_OFFSET = HTML_BEFORE_CODE.split('\n').length - 1;

export const buildPreviewHtml = (code: string) =>
  HTML_BEFORE_CODE.replace('{{LINE_OFFSET}}', String(LINE_OFFSET)) + code + HTML_AFTER_CODE;
