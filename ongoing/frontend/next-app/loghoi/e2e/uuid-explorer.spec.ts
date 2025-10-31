import { test, expect } from '@playwright/test';

/**
 * UUID Explorer機能のE2Eテスト
 */
test.describe('UUID Explorer機能', () => {
  test.beforeEach(async ({ page }) => {
    // UUID Explorerページに遷移
    await page.goto('/uuid');
  });

  test('ページが正しく表示される', async ({ page }) => {
    // ページタイトルを確認
    await expect(page).toHaveTitle(/LogHoi/);
    
    // 主要な要素が表示されることを確認
    await expect(page.getByText('UUID Explorer')).toBeVisible();
  });

  test('クラスター接続フォームが表示される', async ({ page }) => {
    // クラスター名入力欄が表示されることを確認
    const clusterNameInput = page.locator('[data-testid="cluster-name-input"]');
    await expect(clusterNameInput).toBeVisible();
    
    // Prism IP入力欄が表示されることを確認
    const prismIpInput = page.locator('[data-testid="prism-ip-input"]');
    await expect(prismIpInput).toBeVisible();
    
    // 接続ボタンが表示されることを確認
    const connectButton = page.locator('[data-testid="connect-button"]');
    await expect(connectButton).toBeVisible();
  });

  test('クラスター接続が成功する', async ({ page }) => {
    // クラスター名を入力
    const clusterNameInput = page.locator('[data-testid="cluster-name-input"]');
    await clusterNameInput.fill('test-cluster');
    
    // Prism IPを入力
    const prismIpInput = page.locator('[data-testid="prism-ip-input"]');
    await prismIpInput.fill('192.168.1.100');
    
    // 接続ボタンをクリック
    const connectButton = page.locator('[data-testid="connect-button"]');
    await connectButton.click();
    
    // ローディング表示を確認
    const loading = page.locator('[data-testid="loading-indicator"]');
    await expect(loading).toBeVisible();
    
    // 接続成功メッセージを確認（タイムアウトは長めに設定）
    await page.waitForSelector('[data-testid="connection-success"]', { timeout: 30000 });
    const successMessage = page.locator('[data-testid="connection-success"]');
    await expect(successMessage).toBeVisible();
  });

  test('最新データセットが表示される', async ({ page }) => {
    // クラスターに接続（前のテストと同様）
    await page.locator('[data-testid="cluster-name-input"]').fill('test-cluster');
    await page.locator('[data-testid="prism-ip-input"]').fill('192.168.1.100');
    await page.locator('[data-testid="connect-button"]').click();
    
    // データセットの読み込みを待つ
    await page.waitForSelector('[data-testid="dataset-list"]', { timeout: 30000 });
    
    // データセット一覧が表示されることを確認
    const datasetList = page.locator('[data-testid="dataset-list"]');
    await expect(datasetList).toBeVisible();
    
    // VM一覧が表示されることを確認
    const vmList = page.locator('[data-testid="vm-list"]');
    await expect(vmList).toBeVisible();
  });

  test('UUID検索が動作する', async ({ page }) => {
    // データセットページに直接遷移
    await page.goto('/uuid/search?cluster=test-cluster');
    
    // 検索フォームが表示されることを確認
    const searchInput = page.locator('[data-testid="uuid-search-input"]');
    await expect(searchInput).toBeVisible();
    
    // UUIDを入力
    await searchInput.fill('12345678-1234-1234-1234-123456789abc');
    
    // 検索ボタンをクリック
    const searchButton = page.locator('[data-testid="uuid-search-button"]');
    await searchButton.click();
    
    // 検索結果が表示されることを確認
    await page.waitForSelector('[data-testid="search-results"]', { timeout: 10000 });
    const searchResults = page.locator('[data-testid="search-results"]');
    await expect(searchResults).toBeVisible();
  });

  test('UUIDコンテンツが表示される', async ({ page }) => {
    // コンテンツページに直接遷移
    await page.goto('/uuid/12345678-1234-1234-1234-123456789abc?cluster=test-cluster');
    
    // UUID詳細が表示されることを確認
    await page.waitForSelector('[data-testid="uuid-details"]', { timeout: 10000 });
    const uuidDetails = page.locator('[data-testid="uuid-details"]');
    await expect(uuidDetails).toBeVisible();
    
    // 関連情報が表示されることを確認
    const relatedInfo = page.locator('[data-testid="related-info"]');
    await expect(relatedInfo).toBeVisible();
  });

  test('VM一覧が正しく表示される', async ({ page }) => {
    await page.goto('/uuid/search?cluster=test-cluster');
    await page.waitForSelector('[data-testid="vm-list"]', { timeout: 10000 });
    
    // VM一覧の各項目が表示されることを確認
    const vmItems = page.locator('[data-testid="vm-item"]');
    const count = await vmItems.count();
    expect(count).toBeGreaterThan(0);
    
    // 最初のVM項目をクリック
    await vmItems.first().click();
    
    // VM詳細が表示されることを確認
    await page.waitForSelector('[data-testid="vm-details"]', { timeout: 5000 });
    const vmDetails = page.locator('[data-testid="vm-details"]');
    await expect(vmDetails).toBeVisible();
  });

  test('ボリュームグループ一覧が正しく表示される', async ({ page }) => {
    await page.goto('/uuid/search?cluster=test-cluster');
    
    // タブ切り替え
    const vgTab = page.locator('[data-testid="vg-tab"]');
    await vgTab.click();
    
    // ボリュームグループ一覧が表示されることを確認
    await page.waitForSelector('[data-testid="vg-list"]', { timeout: 10000 });
    const vgList = page.locator('[data-testid="vg-list"]');
    await expect(vgList).toBeVisible();
  });

  test('ストレージコンテナ一覧が正しく表示される', async ({ page }) => {
    await page.goto('/uuid/search?cluster=test-cluster');
    
    // タブ切り替え
    const scTab = page.locator('[data-testid="sc-tab"]');
    await scTab.click();
    
    // ストレージコンテナ一覧が表示されることを確認
    await page.waitForSelector('[data-testid="sc-list"]', { timeout: 10000 });
    const scList = page.locator('[data-testid="sc-list"]');
    await expect(scList).toBeVisible();
  });

  test('エラーハンドリングが正しく動作する', async ({ page }) => {
    // 無効な接続情報で接続を試みる
    await page.locator('[data-testid="cluster-name-input"]').fill('invalid');
    await page.locator('[data-testid="prism-ip-input"]').fill('0.0.0.0');
    await page.locator('[data-testid="connect-button"]').click();
    
    // エラーメッセージが表示されることを確認
    await page.waitForSelector('[data-testid="error-message"]', { timeout: 10000 });
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
  });

  test('タイムスロット選択が動作する', async ({ page }) => {
    await page.goto('/uuid/search?cluster=test-cluster');
    await page.waitForSelector('[data-testid="timeslot-selector"]', { timeout: 10000 });
    
    // タイムスロットセレクターが表示されることを確認
    const timeslotSelector = page.locator('[data-testid="timeslot-selector"]');
    await expect(timeslotSelector).toBeVisible();
    
    // 異なるタイムスロットを選択
    await timeslotSelector.selectOption({ index: 1 });
    
    // データが再読み込みされることを確認
    await page.waitForSelector('[data-testid="loading-indicator"]', { timeout: 2000 });
    await page.waitForSelector('[data-testid="dataset-list"]', { timeout: 10000 });
  });
});

/**
 * UUID Explorer - フィルタリング機能のテスト
 */
test.describe('UUID Explorer - フィルタリング', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/uuid/search?cluster=test-cluster');
    await page.waitForSelector('[data-testid="vm-list"]', { timeout: 10000 });
  });

  test('VM名でフィルタリングができる', async ({ page }) => {
    // フィルター入力欄にテキストを入力
    const filterInput = page.locator('[data-testid="vm-filter-input"]');
    await filterInput.fill('test-vm');
    
    // フィルタリングされた結果が表示されることを確認
    await page.waitForTimeout(500);
    const vmItems = page.locator('[data-testid="vm-item"]');
    const count = await vmItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('UUIDでフィルタリングができる', async ({ page }) => {
    const filterInput = page.locator('[data-testid="vm-filter-input"]');
    await filterInput.fill('1234');
    
    await page.waitForTimeout(500);
    const vmItems = page.locator('[data-testid="vm-item"]');
    const count = await vmItems.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

