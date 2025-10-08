import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright設定ファイル
 * E2Eテストの実行設定
 */
export default defineConfig({
  testDir: './e2e',
  /* 並列実行の最大数 */
  fullyParallel: true,
  /* CI環境でのリトライ設定 */
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  /* CI環境でのワーカー数 */
  workers: process.env.CI ? 1 : undefined,
  /* テストレポーター */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  /* 共通設定 */
  use: {
    /* ベースURL */
    baseURL: 'http://localhost:7777',
    /* スクリーンショット */
    screenshot: 'only-on-failure',
    /* ビデオ録画 */
    video: 'retain-on-failure',
    /* トレース */
    trace: 'on-first-retry',
  },

  /* テスト実行前にサーバーを起動 */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:7777',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* 複数ブラウザでテスト */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* モバイルビューポートのテスト */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],
});

