import { test, expect } from '@playwright/test';
import { waitForApp, editorContent, replaceEditorCode, loginAsAdmin } from './helpers';

test.describe('sketch save / load / delete', () => {
  test('full lifecycle through the UI', async ({ page }) => {
    const title = `E2E Sketch ${Date.now()}`;

    await page.goto('/');
    await waitForApp(page);

    await replaceEditorCode(
      page,
      [
        '// E2E_SAVED_MARKER',
        'function setup() {',
        '  createCanvas(windowWidth, windowHeight);',
        '}',
        'function draw() {',
        '  background(60);',
        '}',
      ].join('\n'),
    );

    await loginAsAdmin(page);

    // Cmd/Ctrl+S on a new sketch opens the save modal.
    await page.keyboard.press('ControlOrMeta+s');
    const modal = page.getByRole('dialog');
    await modal.locator('#save-sketch-title').fill(title);
    await modal.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.locator('#save-sketch-title')).toHaveCount(0);
    await expect(page.getByText(title)).toBeVisible();

    // It shows up in My Sketches and loads back with the same code.
    await page.getByRole('button', { name: 'My Sketches' }).click();
    const card = page.locator('.group', { hasText: title });
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: 'Load' }).click();
    await expect(editorContent(page)).toContainText('E2E_SAVED_MARKER');
    await expect(page).toHaveURL(/\/sketch\//);

    // Delete it with the inline confirmation.
    await page.getByRole('button', { name: 'My Sketches' }).click();
    await card.hover();
    await card.getByRole('button', { name: 'Delete' }).click();
    await expect(card.getByText('Delete this sketch?')).toBeVisible();
    await card.getByRole('button', { name: 'Delete' }).click();
    await expect(page.locator('.group', { hasText: title })).toHaveCount(0);
  });
});
