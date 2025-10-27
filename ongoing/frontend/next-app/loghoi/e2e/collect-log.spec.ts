import { test, expect } from '@playwright/test';

/**
 * Collect Log機能のE2Eテスト
 * 現時点では基本的なページ表示のみテスト
 */
test.describe('Collect Log機能', () => {
  test.beforeEach(async ({ page }) => {
    // Collect Logページに遷移
    await page.goto('/collectlog?cluster=test-cluster&prism=192.168.1.100');
  });

  test('ページが正しく表示される', async ({ page }) => {
    // ページタイトルを確認
    await expect(page).toHaveTitle(/LogHoi/);
    
    // 主要な要素が表示されることを確認
    await expect(page.getByText('Collect Log Viewer')).toBeVisible();
  });
});
