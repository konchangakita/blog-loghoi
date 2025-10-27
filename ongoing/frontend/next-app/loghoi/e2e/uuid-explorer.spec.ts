import { test, expect } from '@playwright/test';

/**
 * UUID Explorer機能のE2Eテスト
 * 現時点では基本的なページ表示のみテスト
 */
test.describe('UUID Explorer機能', () => {
  test.beforeEach(async ({ page }) => {
    // UUID Explorerページに遷移
    await page.goto('/uuid');
  });

  test('ページが正しく表示される', async ({ page }) => {
    // ページタイトルを確認
    await expect(page).toHaveTitle(/LogHoi/);
    
    // ページが読み込まれることを確認
    await expect(page).toHaveTitle(/LogHoi/);
  });
});
