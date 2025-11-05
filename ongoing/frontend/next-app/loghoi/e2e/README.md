# E2E テストガイド

## 概要
このディレクトリには、LogHoiアプリケーションのE2E（End-to-End）テストが含まれています。
Playwrightを使用して、ユーザーの実際の操作フローをテストします。

## セットアップ

### 1. 依存関係のインストール
```bash
cd frontend/next-app/loghoi
npm install
```

### 2. Playwrightブラウザのインストール
```bash
npx playwright install
```

## テストの実行

### 全テストを実行
```bash
npm run test:e2e
```

### UIモードで実行（推奨）
```bash
npm run test:e2e:ui
```

### ヘッドモードで実行（ブラウザを表示）
```bash
npm run test:e2e:headed
```

### デバッグモードで実行
```bash
npm run test:e2e:debug
```

### 特定のテストのみ実行
```bash
npx playwright test collect-log.spec.ts
npx playwright test uuid-explorer.spec.ts
```

### 特定のブラウザでテスト
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## テストレポート

### HTMLレポートを表示
```bash
npm run test:e2e:report
```

レポートは `playwright-report/` ディレクトリに生成されます。

## テストの構成

### collect-log.spec.ts
Collect Log機能のE2Eテスト
- ページ表示
- CVM一覧取得
- ZIP一覧表示
- ログファイル選択と表示
- フィルタリング
- ダウンロード
- エラーハンドリング
- ログ収集フロー

### uuid-explorer.spec.ts
UUID Explorer機能のE2Eテスト
- ページ表示
- クラスター接続
- 最新データセット表示
- UUID検索
- コンテンツ表示
- VM/VG/SC一覧
- フィルタリング
- タイムスロット選択
- エラーハンドリング

## テストデータ属性

テストで使用する`data-testid`属性をコンポーネントに追加してください。

### 例
```tsx
<div data-testid="zip-list">
  {zipList.map((zip) => (
    <div key={zip} data-testid="zip-item">
      {zip}
    </div>
  ))}
</div>
```

## ベストプラクティス

### 1. 明確なテストID
```tsx
// ✅ 良い例
data-testid="collect-logs-button"
data-testid="vm-list"

// ❌ 悪い例
data-testid="button1"
data-testid="list"
```

### 2. 非同期処理の適切な待機
```typescript
// ✅ 良い例
await page.waitForSelector('[data-testid="zip-list"]', { timeout: 10000 });

// ❌ 悪い例
await page.waitForTimeout(3000); // 固定時間の待機は避ける
```

### 3. テストの独立性
各テストは他のテストに依存せず、独立して実行できるようにする。

### 4. エラーメッセージ
```typescript
// ✅ 良い例
await expect(element).toBeVisible({ timeout: 5000 });

// ❌ 悪い例（タイムアウトエラーが不明瞭）
await element.click();
```

## CI/CD統合

### GitHub Actions設定例
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## トラブルシューティング

### テストが失敗する場合
1. スクリーンショットを確認: `test-results/`
2. ビデオを確認: `test-results/`
3. トレースを確認: `npx playwright show-trace trace.zip`

### タイムアウトエラー
- `timeout`オプションを調整
- バックエンドが起動しているか確認
- ネットワーク接続を確認

### ブラウザが起動しない
```bash
npx playwright install --with-deps
```

## 参考リンク
- [Playwright公式ドキュメント](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)

