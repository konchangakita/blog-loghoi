import { test, expect } from '@playwright/test';

/**
 * Collect Log機能のE2Eテスト
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
    await expect(page.getByText('Collect Log')).toBeVisible();
  });

  test('CVM一覧が取得できる', async ({ page }) => {
    // CVM一覧の読み込みを待つ
    await page.waitForSelector('[data-testid="cvm-selector"]', { timeout: 10000 });
    
    // CVM選択ドロップダウンが表示されることを確認
    const cvmSelector = page.locator('[data-testid="cvm-selector"]');
    await expect(cvmSelector).toBeVisible();
  });

  test('ZIP一覧が表示される', async ({ page }) => {
    // ZIP一覧の読み込みを待つ
    await page.waitForSelector('[data-testid="zip-list"]', { timeout: 10000 });
    
    // ZIP一覧が表示されることを確認
    const zipList = page.locator('[data-testid="zip-list"]');
    await expect(zipList).toBeVisible();
  });

  test('ZIPファイルを選択するとログ一覧が表示される', async ({ page }) => {
    // ZIP一覧の読み込みを待つ
    await page.waitForSelector('[data-testid="zip-list"]', { timeout: 10000 });
    
    // 最初のZIPファイルをクリック
    const firstZip = page.locator('[data-testid="zip-item"]').first();
    await firstZip.click();
    
    // ログファイル一覧が表示されることを確認
    await page.waitForSelector('[data-testid="log-file-list"]', { timeout: 5000 });
    const logFileList = page.locator('[data-testid="log-file-list"]');
    await expect(logFileList).toBeVisible();
  });

  test('ログファイルを選択すると内容が表示される', async ({ page }) => {
    // ZIP一覧の読み込みを待つ
    await page.waitForSelector('[data-testid="zip-list"]', { timeout: 10000 });
    
    // 最初のZIPファイルをクリック
    const firstZip = page.locator('[data-testid="zip-item"]').first();
    await firstZip.click();
    
    // ログファイル一覧の読み込みを待つ
    await page.waitForSelector('[data-testid="log-file-list"]', { timeout: 5000 });
    
    // 最初のログファイルをクリック
    const firstLogFile = page.locator('[data-testid="log-file-item"]').first();
    await firstLogFile.click();
    
    // ログ内容が表示されることを確認
    await page.waitForSelector('[data-testid="log-viewer"]', { timeout: 5000 });
    const logViewer = page.locator('[data-testid="log-viewer"]');
    await expect(logViewer).toBeVisible();
  });

  test('ログフィルタリングが動作する', async ({ page }) => {
    // ZIP選択とログファイル選択（前のテストと同様）
    await page.waitForSelector('[data-testid="zip-list"]', { timeout: 10000 });
    const firstZip = page.locator('[data-testid="zip-item"]').first();
    await firstZip.click();
    
    await page.waitForSelector('[data-testid="log-file-list"]', { timeout: 5000 });
    const firstLogFile = page.locator('[data-testid="log-file-item"]').first();
    await firstLogFile.click();
    
    await page.waitForSelector('[data-testid="log-viewer"]', { timeout: 5000 });
    
    // フィルター入力欄にテキストを入力
    const filterInput = page.locator('[data-testid="log-filter-input"]');
    await filterInput.fill('ERROR');
    
    // フィルタリングされたログが表示されることを確認
    await page.waitForTimeout(500); // フィルタリング処理を待つ
    const logLines = page.locator('[data-testid="log-line"]');
    const count = await logLines.count();
    expect(count).toBeGreaterThan(0);
  });

  test('ログダウンロードボタンが機能する', async ({ page }) => {
    // ZIP選択とログファイル選択
    await page.waitForSelector('[data-testid="zip-list"]', { timeout: 10000 });
    const firstZip = page.locator('[data-testid="zip-item"]').first();
    await firstZip.click();
    
    await page.waitForSelector('[data-testid="log-file-list"]', { timeout: 5000 });
    const firstLogFile = page.locator('[data-testid="log-file-item"]').first();
    await firstLogFile.click();
    
    await page.waitForSelector('[data-testid="log-viewer"]', { timeout: 5000 });
    
    // ダウンロードボタンをクリック
    const downloadPromise = page.waitForEvent('download');
    const downloadButton = page.locator('[data-testid="log-download-button"]');
    await downloadButton.click();
    
    // ダウンロードが開始されることを確認
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.txt$/);
  });

  test('エラーハンドリングが正しく動作する', async ({ page }) => {
    // 存在しないクラスターにアクセス
    await page.goto('/collectlog?cluster=invalid-cluster&prism=0.0.0.0');
    
    // エラーメッセージが表示されることを確認
    await page.waitForSelector('[data-testid="error-message"]', { timeout: 10000 });
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
  });

  test('ローディング状態が正しく表示される', async ({ page }) => {
    // ページに遷移
    await page.goto('/collectlog?cluster=test-cluster&prism=192.168.1.100');
    
    // ローディングインジケーターが表示されることを確認
    const loading = page.locator('[data-testid="loading-indicator"]');
    await expect(loading).toBeVisible();
    
    // データ読み込み後、ローディングが消えることを確認
    await page.waitForSelector('[data-testid="zip-list"]', { timeout: 10000 });
    await expect(loading).not.toBeVisible();
  });
});

/**
 * Collect Log - ログ収集フローのテスト
 */
test.describe('ログ収集フロー', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/collectlog?cluster=test-cluster&prism=192.168.1.100');
  });

  test('CVM選択からログ収集までのフローが動作する', async ({ page }) => {
    // CVM選択
    await page.waitForSelector('[data-testid="cvm-selector"]', { timeout: 10000 });
    const cvmSelector = page.locator('[data-testid="cvm-selector"]');
    await cvmSelector.selectOption({ index: 1 });
    
    // ログ収集ボタンをクリック
    const collectButton = page.locator('[data-testid="collect-logs-button"]');
    await collectButton.click();
    
    // 収集中のインジケーターが表示されることを確認
    const collectingIndicator = page.locator('[data-testid="collecting-indicator"]');
    await expect(collectingIndicator).toBeVisible();
    
    // 収集完了を待つ（タイムアウトは長めに設定）
    await page.waitForSelector('[data-testid="collection-complete"]', { timeout: 60000 });
    
    // 完了メッセージが表示されることを確認
    const completeMessage = page.locator('[data-testid="collection-complete"]');
    await expect(completeMessage).toBeVisible();
  });
});

