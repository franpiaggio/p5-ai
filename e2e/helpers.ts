import { Page, expect } from '@playwright/test';

export const ADMIN_USER = 'admin';
export const ADMIN_PASSWORD = 'e2e-admin-password';

/** Wait for the app shell + a running p5 preview canvas. */
export async function waitForApp(page: Page) {
  await expect(page.getByRole('button', { name: 'My Sketches' })).toBeVisible();
  await expect(previewCanvas(page)).toBeVisible({ timeout: 20_000 });
}

export function previewCanvas(page: Page) {
  return page.frameLocator('iframe[title="p5.js Preview"]').locator('canvas').first();
}

export function editorContent(page: Page) {
  return page.locator('.monaco-editor .view-lines').first();
}

export function chatInput(page: Page) {
  return page.locator('[data-chat-input]');
}

/**
 * Replace the whole Monaco buffer through the editor API. Simulated typing is
 * unreliable here (auto-closing brackets corrupt braces, clipboard paste is
 * flaky headless); setValue fires the same content-change event as an edit,
 * so the editor → store → preview pipeline is still exercised.
 */
export async function replaceEditorCode(page: Page, code: string) {
  await page.waitForFunction(() => {
    const monaco = (window as unknown as { monaco?: { editor?: { getEditors?: () => unknown[] } } }).monaco;
    return (monaco?.editor?.getEditors?.()?.length ?? 0) > 0;
  });
  await page.evaluate((c) => {
    const monaco = (window as unknown as {
      monaco: { editor: { getEditors: () => Array<{ getModel: () => { setValue: (v: string) => void } | null }> } };
    }).monaco;
    monaco.editor.getEditors()[0].getModel()?.setValue(c);
  }, code);
  await expect(editorContent(page)).toContainText(code.split('\n')[0].slice(0, 30));
}

/** Log in through the UI with the seeded admin user. */
export async function loginAsAdmin(page: Page) {
  await page.getByRole('button', { name: 'My Sketches' }).click();
  const modal = page.getByRole('dialog');
  await modal.locator('#login-username').fill(ADMIN_USER);
  await modal.locator('#login-password').fill(ADMIN_PASSWORD);
  await modal.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.locator('#login-username')).toHaveCount(0);
}

/** Build an SSE body the way the backend streams chat responses. */
export function sseBody(chunks: string[]): string {
  const events = chunks.map((c) => `data: ${JSON.stringify({ content: c })}\n\n`);
  return events.join('') + 'data: [DONE]\n\n';
}

/** Intercept POST /api/chat and stream back a scripted LLM response. */
export async function mockChatResponse(page: Page, chunks: string[]) {
  await page.route('**/api/chat', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
      body: sseBody(chunks),
    });
  });
}

export async function sendChatMessage(page: Page, message: string) {
  const input = chatInput(page);
  await expect(input).toBeEnabled({ timeout: 15_000 });
  await input.fill(message);
  await page.getByRole('button', { name: 'Send' }).click();
}
