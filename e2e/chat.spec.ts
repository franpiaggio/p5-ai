import { test, expect } from '@playwright/test';
import {
  waitForApp,
  editorContent,
  chatInput,
  mockChatResponse,
  sendChatMessage,
} from './helpers';

const FULL_CODE_RESPONSE = [
  "I'll rewrite the sketch:\n",
  [
    '```javascript',
    'function setup() {',
    '  createCanvas(windowWidth, windowHeight);',
    '}',
    '',
    'function draw() {',
    '  background(1, 2, 3); // E2E_CHAT_MARKER',
    '}',
    '```',
  ].join('\n'),
];

test.describe('chat → diff review flow (LLM mocked at the network layer)', () => {
  test('a full-code suggestion streams in and Accept applies it', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await mockChatResponse(page, FULL_CODE_RESPONSE);

    await sendChatMessage(page, 'rewrite my sketch');

    await expect(page.getByText("I'll rewrite the sketch:")).toBeVisible();
    await expect(page.getByText('Review changes in the editor')).toBeVisible();

    await page.getByRole('button', { name: 'Accept', exact: true }).click();

    await expect(page.getByText('Review changes in the editor')).toHaveCount(0);
    await expect(editorContent(page)).toContainText('E2E_CHAT_MARKER');
    await expect(chatInput(page)).toBeEnabled();
  });

  test('Reject restores the previous code', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await mockChatResponse(page, FULL_CODE_RESPONSE);

    await sendChatMessage(page, 'rewrite my sketch');
    await expect(page.getByText('Review changes in the editor')).toBeVisible();

    await page.getByRole('button', { name: 'Reject', exact: true }).click();

    await expect(editorContent(page)).toContainText('rectMode(CENTER)');
    await expect(editorContent(page)).not.toContainText('E2E_CHAT_MARKER');
    await expect(chatInput(page)).toBeEnabled();
  });

  test('search/replace blocks patch the current code', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await mockChatResponse(page, [
      'Tweaking the background color.\n',
      [
        '<<<SEARCH',
        '  background(30);',
        '===',
        '  background(230, 80, 15); // E2E_SR_MARKER',
        '>>>REPLACE',
      ].join('\n'),
    ]);

    await sendChatMessage(page, 'warmer background please');

    // The raw block is stripped from the chat bubble; only the prose remains.
    await expect(page.getByText('Tweaking the background color.')).toBeVisible();
    await expect(page.getByText('<<<SEARCH')).toHaveCount(0);

    await page.getByRole('button', { name: 'Accept', exact: true }).click();

    await expect(editorContent(page)).toContainText('E2E_SR_MARKER');
    // The rest of the sketch is untouched.
    await expect(editorContent(page)).toContainText('rectMode(CENTER)');
  });

  test('an unrequested file split folds back into sketch.js', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await mockChatResponse(page, [
      'Adding a particle system:\n',
      [
        '```javascript',
        '// filename: particle.js [NEW FILE]',
        'class Particle {} // E2E_SINGLE_P_MARKER',
        '```',
        '```javascript',
        '// filename: sketch.js',
        'function setup() { new Particle(); } // E2E_SINGLE_S_MARKER',
        '```',
      ].join('\n'),
    ]);

    // No split was asked for, so the sketch stays single-file: one reviewable
    // diff on sketch.js, with the class inlined into it.
    await sendChatMessage(page, 'add some particles');

    await expect(page.getByText('Review changes in the editor')).toBeVisible();
    await page.getByRole('button', { name: 'Accept', exact: true }).click();

    await expect(editorContent(page)).toContainText('E2E_SINGLE_P_MARKER');
    await expect(editorContent(page)).toContainText('E2E_SINGLE_S_MARKER');
    await expect(page.getByRole('button', { name: 'particle.js' })).toHaveCount(0);
  });

  test('a multi-file suggestion opens a per-file review; Accept all applies everything', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await mockChatResponse(page, [
      'Splitting the sketch into files:\n',
      [
        '```javascript',
        '// filename: particle.js [NEW FILE]',
        'class Particle {} // E2E_P_MARKER',
        '```',
        '```javascript',
        '// filename: sketch.js',
        'function setup() { new Particle(); } // E2E_S_MARKER',
        '```',
      ].join('\n'),
    ]);

    await sendChatMessage(page, 'split my sketch into files');

    // Per-file review opens on the first change, counting through the set.
    await expect(page.getByText('Reviewing particle.js (1/2)')).toBeVisible();
    await expect(chatInput(page)).toBeDisabled();

    await page.getByRole('button', { name: 'Accept all' }).click();

    await expect(page.getByText('Reviewing particle.js (1/2)')).toHaveCount(0);
    await expect(editorContent(page)).toContainText('E2E_P_MARKER');
    await expect(chatInput(page)).toBeEnabled();
    // Both files now exist as tabs (close buttons included).
    await expect(page.getByRole('button', { name: 'sketch.js' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'particle.js' })).toBeVisible();
  });

  test('a stream error surfaces as a warning message, not a crash', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await page.route('**/api/chat', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: 'data: {"error":"Provider exploded"}\n\n',
      }),
    );

    await sendChatMessage(page, 'hello');

    await expect(page.getByText('Warning: Provider exploded')).toBeVisible();
    await expect(chatInput(page)).toBeEnabled();
  });
});
