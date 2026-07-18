import { test, expect } from '@playwright/test';
import { waitForApp, previewCanvas, editorContent, replaceEditorCode } from './helpers';

test.describe('editor & preview', () => {
  test('loads the default sketch and renders the p5 canvas', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await expect(editorContent(page)).toContainText('createCanvas');
  });

  test('edited code actually runs in the preview', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await replaceEditorCode(
      page,
      [
        'function setup() {',
        '  createCanvas(windowWidth, windowHeight);',
        "  console.log('E2E_CONSOLE_MARKER');",
        '}',
        'function draw() {',
        '  background(20);',
        '}',
      ].join('\n'),
    );
    await page.getByTitle('Run (Alt+Enter)').click();

    // The sketch's console.log is forwarded from the sandboxed iframe to the
    // Console tab — seeing it there (not in the editor) proves the edited
    // code really executed.
    await page.getByRole('button', { name: /console/i }).click();
    const consolePanel = page.locator('.overflow-y-auto.font-mono');
    await expect(consolePanel).toContainText('E2E_CONSOLE_MARKER');
    await expect(previewCanvas(page)).toBeVisible();
  });

  test('unsaved work survives a page reload', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await replaceEditorCode(
      page,
      [
        '// E2E_PERSIST_MARKER',
        'function setup() {',
        '  createCanvas(windowWidth, windowHeight);',
        '}',
        'function draw() {',
        '  background(40);',
        '}',
      ].join('\n'),
    );
    await expect(editorContent(page)).toContainText('E2E_PERSIST_MARKER');

    await page.reload();
    await waitForApp(page);
    await expect(editorContent(page)).toContainText('E2E_PERSIST_MARKER');
  });
});
