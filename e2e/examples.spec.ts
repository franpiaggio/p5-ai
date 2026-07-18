import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

const userBubbles = '.whitespace-pre-wrap';
const assistantBubbles = '.markdown-chat';

test.describe('example suggestion flow', () => {
  test('"New one" swaps the example without piling up chat entries', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await page.getByRole('button', { name: 'Generate' }).click();

    await expect(page.locator(userBubbles)).toHaveCount(1);
    await expect(page.locator(assistantBubbles)).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Keep it' })).toBeVisible();

    // Swapping examples twice must still leave exactly one message pair.
    await page.getByRole('button', { name: 'New one' }).click();
    await expect(page.locator(userBubbles)).toHaveCount(1);
    await page.getByRole('button', { name: 'New one' }).click();
    await expect(page.locator(userBubbles)).toHaveCount(1);
    await expect(page.locator(assistantBubbles)).toHaveCount(1);

    // "Keep it" dismisses the suggestion card.
    await page.getByRole('button', { name: 'Keep it' }).click();
    await expect(page.getByRole('button', { name: 'Keep it' })).toHaveCount(0);
  });
});
