// Renders blog/social/linkedin-2.0-slides.html into one PNG per slide
// (1080x1350 at 2x = 2160x2700), for the LinkedIn carousel of article 2.0.
//   node blog/social/capture-linkedin-2.0.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'linkedin-2.0');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 1500 },
  deviceScaleFactor: 2,
});
await page.goto('file://' + join(HERE, 'linkedin-2.0-slides.html'));
await page.waitForLoadState('networkidle');
await page.evaluate(() => document.fonts.ready);

const slides = page.locator('.slide');
const n = await slides.count();
for (let i = 0; i < n; i++) {
  const slide = slides.nth(i);
  // guard: content must not overflow the fixed 1350px canvas
  const overflow = await slide.evaluate((el) => el.scrollHeight - el.clientHeight);
  if (overflow > 0) console.warn(`slide ${i + 1}: content overflows by ${overflow}px`);
  await slide.screenshot({ path: join(OUT, `slide-0${i + 1}.png`) });
  console.log(`slide-0${i + 1}.png${overflow > 0 ? '  ⚠ OVERFLOW' : ''}`);
}
await browser.close();
