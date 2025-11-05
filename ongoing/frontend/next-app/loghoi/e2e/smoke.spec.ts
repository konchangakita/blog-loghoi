import { test, expect } from '@playwright/test';

/**
 * 基本的なページ表示のスモークテスト
 */
test.describe('スモークテスト', () => {
  test('ホームページが表示される', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/LogHoi/);
  });

  test('Collect Logページが表示される', async ({ page }) => {
    await page.goto('/collectlog');
    await expect(page).toHaveTitle(/LogHoi/);
  });

  test('UUID Explorerページが表示される', async ({ page }) => {
    await page.goto('/uuid');
    await expect(page).toHaveTitle(/LogHoi/);
  });

  test('Realtime Logページが表示される', async ({ page }) => {
    await page.goto('/realtimelog');
    await expect(page).toHaveTitle(/LogHoi/);
  });

  test('Syslogページが表示される', async ({ page }) => {
    await page.goto('/syslog');
    await expect(page).toHaveTitle(/LogHoi/);
  });
});

