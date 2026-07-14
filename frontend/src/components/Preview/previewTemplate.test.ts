import { describe, it, expect } from 'vitest';
import { buildMultiFilePreviewHtml, buildPreviewHtml } from './previewTemplate';
import type { SketchFile } from '../../types';

function file(name: string, content: string): SketchFile {
  return { id: name, name, content, language: 'javascript' };
}

describe('buildPreviewHtml (single file)', () => {
  it('embeds the code and p5 CDN', () => {
    const html = buildPreviewHtml('function setup(){}');
    expect(html).toContain('function setup(){}');
    expect(html).toContain('p5.min.js');
  });
});

describe('buildMultiFilePreviewHtml — concatenation mode (no modules)', () => {
  const files = [
    file('palette.js', 'function nodeColor(t){ return t; }'),
    file('sketch.js', 'function setup(){}'),
  ];

  it('does NOT use an import map', () => {
    const html = buildMultiFilePreviewHtml(files, []);
    expect(html).not.toContain('type="importmap"');
  });

  it('concatenates files as scripts with sketch.js last', () => {
    const html = buildMultiFilePreviewHtml(files, []);
    expect(html.indexOf('nodeColor')).toBeLessThan(html.indexOf('function setup(){}'));
  });

  it('includes CDN library tags', () => {
    const html = buildMultiFilePreviewHtml(files, [{ name: 'p5.sound', url: 'https://cdn/p5.sound.js' }]);
    expect(html).toContain('https://cdn/p5.sound.js');
  });
});

describe('buildMultiFilePreviewHtml — module mode (import/export)', () => {
  const files = [
    file('palette.js', 'export function nodeColor(t){ return t; }'),
    file('particle.js', "import { nodeColor } from './palette.js';\nexport class Particle {}"),
    file('sketch.js', "import { Particle } from './particle.js';\nfunction setup(){}\nfunction draw(){}"),
  ];

  it('switches to an import map when a file uses import/export', () => {
    const html = buildMultiFilePreviewHtml(files, []);
    expect(html).toContain('type="importmap"');
    expect(html).toContain('import \'sketch.js\';');
  });

  it('maps every file into the import map as a data URL', () => {
    const html = buildMultiFilePreviewHtml(files, []);
    expect(html).toContain('"palette.js": "data:text/javascript,');
    expect(html).toContain('"particle.js": "data:text/javascript,');
    expect(html).toContain('"sketch.js": "data:text/javascript,');
  });

  it('rewrites relative specifiers to bare (import-map) specifiers', () => {
    const html = buildMultiFilePreviewHtml(files, []);
    const decoded = decodeURIComponent(html);
    // './palette.js' should have become bare 'palette.js'
    expect(decoded).toContain("from 'palette.js'");
    expect(decoded).not.toContain("from './palette.js'");
  });

  it('appends the global bridge exposing setup/draw to the entry', () => {
    const html = buildMultiFilePreviewHtml(files, []);
    const decoded = decodeURIComponent(html);
    expect(decoded).toContain("if (typeof setup !== 'undefined') window.setup = setup;");
    expect(decoded).toContain("if (typeof draw !== 'undefined') window.draw = draw;");
  });

  it('does not treat the word "export" in a comment as module syntax', () => {
    const plain = [file('sketch.js', '// export the drawing later\nfunction setup(){}')];
    const html = buildMultiFilePreviewHtml(plain, []);
    expect(html).not.toContain('type="importmap"');
  });
});
