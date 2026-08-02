// Captures representative screenshots of the app for blog post 1.2.
// Runs against the local dev server (localhost:5173) with the LLM mocked at
// the network layer (same technique as e2e/), so the diff-review states are
// real UI, not staged mockups.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = '/Users/franciscopiaggio/localwork/p5-ai/blog/images';
mkdirSync(OUT, { recursive: true });

const sseBody = (chunks) =>
  chunks.map((c) => `data: ${JSON.stringify({ content: c })}\n\n`).join('') +
  'data: [DONE]\n\n';

const mockChat = (page, chunks) =>
  page.route('**/api/chat', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
      body: sseBody(chunks),
    });
  });

const send = async (page, message) => {
  const input = page.locator('[data-chat-input]');
  await input.waitFor({ state: 'visible' });
  await input.fill(message);
  await page.getByRole('button', { name: 'Send' }).click();
};

// 1280px viewport: the blog column shows images at ~1000px, so a narrower
// capture keeps the UI text close to its real on-screen size.
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
});
const page = await ctx.newPage();

await page.goto('http://localhost:5173/');
await page.getByRole('button', { name: 'My Sketches' }).waitFor({ timeout: 30_000 });
await page
  .frameLocator('iframe[title="p5.js Preview"]')
  .locator('canvas')
  .first()
  .waitFor({ timeout: 30_000 });
await page.waitForTimeout(2500); // let the sketch animate past its first frames

// 1 — hero: editor + running preview + chat
await page.screenshot({ path: `${OUT}/editor-overview.png` });
console.log('1/3 editor-overview.png');

// 2 — search/replace suggestion under review as an inline diff
await mockChat(page, [
  'Warming up the background — one targeted change:\n',
  [
    '<<<SEARCH',
    '  background(30);',
    '===',
    '  background(48, 24, 38);',
    '>>>REPLACE',
  ].join('\n'),
]);
await send(page, 'make the background warmer');
await page.getByRole('button', { name: 'Accept', exact: true }).waitFor({ timeout: 15_000 });
await page.waitForTimeout(1200); // diff editor settle
// Crop to the editor+chat column so the diff lines read at full size; the
// split position comes from where the preview iframe starts.
const previewBox = await page.locator('iframe[title="p5.js Preview"]').boundingBox();
const viewport = page.viewportSize();
await page.screenshot({
  path: `${OUT}/diff-review.png`,
  clip: { x: 0, y: 0, width: Math.round(previewBox.x), height: viewport.height },
});
console.log('2/3 diff-review.png');
await page.getByRole('button', { name: 'Reject', exact: true }).click();
await page.waitForTimeout(500);

// 3 — multi-file suggestion in per-file review, tabs visible
await page.unroute('**/api/chat');
await mockChat(page, [
  'Moving the particle logic into its own file:\n',
  [
    '```javascript',
    '// filename: particle.js [NEW FILE]',
    'class Particle {',
    '  constructor(x, y) {',
    '    this.pos = createVector(x, y);',
    '    this.vel = p5.Vector.random2D().mult(random(0.5, 2));',
    '    this.size = random(2, 6);',
    '  }',
    '',
    '  update() {',
    '    this.pos.add(this.vel);',
    '  }',
    '',
    '  show() {',
    '    noStroke();',
    '    fill(200, 80, 90);',
    '    circle(this.pos.x, this.pos.y, this.size);',
    '  }',
    '}',
    '```',
    '```javascript',
    '// filename: sketch.js',
    'let particles = [];',
    '',
    'function setup() {',
    '  createCanvas(windowWidth, windowHeight);',
    '  for (let i = 0; i < 80; i++) {',
    '    particles.push(new Particle(random(width), random(height)));',
    '  }',
    '}',
    '',
    'function draw() {',
    '  background(30);',
    '  for (const p of particles) {',
    '    p.update();',
    '    p.show();',
    '  }',
    '}',
    '```',
  ].join('\n'),
]);
await send(page, 'split the particle logic into its own file');
await page.getByText('Reviewing particle.js (1/2)').waitFor({ timeout: 15_000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/multi-file-review.png` });
console.log('3/3 multi-file-review.png');

await browser.close();
