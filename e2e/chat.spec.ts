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
  // Demo chat works anonymously (per-IP free quota), so no login needed here.
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
  });

  test('a full-code suggestion streams in and Accept applies it', async ({ page }) => {
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
    await mockChatResponse(page, FULL_CODE_RESPONSE);

    await sendChatMessage(page, 'rewrite my sketch');
    await expect(page.getByText('Review changes in the editor')).toBeVisible();

    await page.getByRole('button', { name: 'Reject', exact: true }).click();

    await expect(editorContent(page)).toContainText('rectMode(CENTER)');
    await expect(editorContent(page)).not.toContainText('E2E_CHAT_MARKER');
    await expect(chatInput(page)).toBeEnabled();
  });

  test('Enter accepts the diff without the chat input losing focus', async ({ page }) => {
    await mockChatResponse(page, FULL_CODE_RESPONSE);

    // Send from the keyboard so focus stays in the input the whole time.
    const input = chatInput(page);
    await expect(input).toBeEnabled({ timeout: 15_000 });
    await input.fill('rewrite my sketch');
    await input.press('Enter');

    await expect(page.getByText('Review changes in the editor')).toBeVisible();
    await expect(input).toBeFocused();

    await page.keyboard.press('Enter'); // accept, focus never leaves the input

    await expect(page.getByText('Review changes in the editor')).toHaveCount(0);
    await expect(editorContent(page)).toContainText('E2E_CHAT_MARKER');
    await expect(input).toBeFocused();
    await expect(input).toBeEnabled();
  });

  test('Escape rejects the diff without the chat input losing focus', async ({ page }) => {
    await mockChatResponse(page, FULL_CODE_RESPONSE);

    const input = chatInput(page);
    await expect(input).toBeEnabled({ timeout: 15_000 });
    await input.fill('rewrite my sketch');
    await input.press('Enter');

    await expect(page.getByText('Review changes in the editor')).toBeVisible();
    await expect(input).toBeFocused();

    await page.keyboard.press('Escape'); // reject, focus never leaves the input

    await expect(page.getByText('Review changes in the editor')).toHaveCount(0);
    await expect(editorContent(page)).toContainText('rectMode(CENTER)');
    await expect(editorContent(page)).not.toContainText('E2E_CHAT_MARKER');
    await expect(input).toBeFocused();
    await expect(input).toBeEnabled();
  });

  test('search/replace blocks patch the current code', async ({ page }) => {
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
    // The input stays enabled during review (so keyboard focus can remain in
    // it) but sending is blocked — the Send button is disabled.
    await expect(chatInput(page)).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Send' })).toBeDisabled();

    await page.getByRole('button', { name: 'Accept all' }).click();

    await expect(page.getByText('Reviewing particle.js (1/2)')).toHaveCount(0);
    await expect(editorContent(page)).toContainText('E2E_P_MARKER');
    await expect(chatInput(page)).toBeEnabled();
    // Both files now exist as tabs (close buttons included).
    await expect(page.getByRole('button', { name: 'sketch.js' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'particle.js' })).toBeVisible();
  });

  test('a stream error surfaces as a warning message, not a crash', async ({ page }) => {
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

test.describe('image attach button gates on the model vision capability', () => {
  const ATTACH = 'Attach image (PNG/JPEG, max 4MB)';

  // Seed the persisted store so the app boots on OpenAI + the given model.
  const seedModel = (page: import('@playwright/test').Page, model: string) =>
    page.addInitScript((m) => {
      localStorage.setItem(
        'p5-ai-editor',
        JSON.stringify({
          state: { llmConfig: { provider: 'openai', model: m, apiKey: '' } },
          version: 0,
        }),
      );
    }, model);

  // Stub the model catalog so the vision flag is fully under test control.
  const mockModels = (
    page: import('@playwright/test').Page,
    models: { id: string; vision: boolean }[],
  ) =>
    page.route('**/api/chat/models', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ models }),
      }),
    );

  test('shows the attach button when the selected model reports vision', async ({ page }) => {
    await mockModels(page, [{ id: 'gpt-4o', vision: true }]);
    await seedModel(page, 'gpt-4o');
    await page.goto('/');
    await waitForApp(page);

    await expect(page.getByTitle(ATTACH)).toBeVisible();
  });

  test('hides the attach button when the same model reports no vision', async ({ page }) => {
    // Same model id, vision:false — proves the gate is driven by the flag,
    // not by a hardcoded provider.
    await mockModels(page, [{ id: 'gpt-4o', vision: false }]);
    await seedModel(page, 'gpt-4o');
    await page.goto('/');
    await waitForApp(page);

    await expect(page.getByTitle(ATTACH)).toHaveCount(0);
  });
});
