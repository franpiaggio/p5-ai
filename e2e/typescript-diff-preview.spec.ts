import { test, expect } from '@playwright/test';
import { waitForApp, mockChatResponse, sendChatMessage } from './helpers';

// Regression: a pending diff on a TypeScript file must run in the preview while
// it's being reviewed (before Accept). The main editor unmounts during review,
// which briefly stops Monaco's TS worker; the transpiler retries until it's back,
// so the pending TS code still runs. If it regresses, the preview goes black and
// this marker never reaches the console.
const TS_RESPONSE = [
  'Rewriting in TS:\n',
  [
    '```typescript',
    'let n: number = 7;',
    'function setup() {',
    '  createCanvas(windowWidth, windowHeight);',
    "  console.log('DIFF_PREVIEW_RAN_' + n);",
    '}',
    'function draw() {',
    '  background(30);',
    '}',
    '```',
  ].join('\n'),
];

test('a pending TypeScript diff runs in the preview during review', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);

  // Migrate the entry file to TypeScript.
  await page.getByRole('button', { name: 'Code' }).click();
  await page.getByRole('button', { name: 'TypeScript' }).click();

  await mockChatResponse(page, TS_RESPONSE);
  await sendChatMessage(page, 'rewrite in ts');

  // Diff review is active and NOT yet accepted.
  await expect(page.getByText('Review changes in the editor')).toBeVisible();

  // The pending (not accepted) TS code executed in the preview: its marker,
  // logged with a type-annotated value, shows in the Console tab.
  await page.getByRole('button', { name: 'Console' }).click();
  await expect(page.getByText(/DIFF_PREVIEW_RAN_7/)).toBeVisible({ timeout: 10_000 });
});
