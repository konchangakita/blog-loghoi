# Test Suite

このプロジェクトのテストスイートです。

## フォルダ構成

```
__tests__/
├── README.md                    # このファイル
├── setup.ts                     # テストセットアップ
├── __init__.py                  # Python互換性（削除予定）
├── backend-url/                 # バックエンドURL関連テスト
│   ├── README.md               # バックエンドURLテストの詳細説明
│   ├── getBackendUrl.test.ts   # getBackendUrl関数の単体テスト
│   ├── backendUrlIntegration.test.tsx  # 統合テスト
│   ├── socketioBackendUrl.test.tsx     # SocketIO統合テスト
│   └── apiBackendUrl.test.ts   # API統合テスト
├── components/                  # コンポーネントテスト
│   └── realtimelog-logview.test.tsx  # リアルタイムログビューワーテスト
└── pages/                      # ページテスト（将来の拡張用）
```

## テストの実行

### 全テスト実行
```bash
npm test
```

### 特定のカテゴリのテスト実行
```bash
# バックエンドURL関連のテスト
npm test -- --testPathPattern="backend-url"

# コンポーネントテスト
npm test -- --testPathPattern="components"

# 特定のテストファイル
npm test -- getBackendUrl.test.ts
```

### カバレッジ付き実行
```bash
npm run test:coverage
```

## テスト環境

- **Jest**: テストフレームワーク
- **@testing-library/react**: Reactコンポーネントテスト
- **@testing-library/jest-dom**: DOM要素のマッチャー
- **jest-environment-jsdom**: ブラウザ環境のシミュレーション

## テストの種類

### 1. 単体テスト (Unit Tests)
- 個別の関数やメソッドのテスト
- 入力と出力の検証
- エッジケースの処理確認

### 2. 統合テスト (Integration Tests)
- 複数のコンポーネントやモジュールの連携テスト
- 実際の使用シナリオのテスト
- API呼び出しやイベント処理のテスト

### 3. コンポーネントテスト (Component Tests)
- Reactコンポーネントのレンダリングテスト
- ユーザーインタラクションのテスト
- プロパティとステートのテスト

## テストのベストプラクティス

1. **AAA パターン**: Arrange, Act, Assert
2. **明確なテスト名**: 何をテストしているかが分かる名前
3. **独立したテスト**: 他のテストに依存しない
4. **適切なモック**: 外部依存を適切にモック化
5. **エラーハンドリング**: 異常系のテストも含める

## 新しいテストの追加

### コンポーネントテストの場合
```bash
# 新しいコンポーネントテストファイルを作成
touch __tests__/components/NewComponent.test.tsx
```

### ページテストの場合
```bash
# 新しいページテストファイルを作成
touch __tests__/pages/NewPage.test.tsx
```

### ユーティリティテストの場合
```bash
# 新しいユーティリティテストファイルを作成
touch __tests__/utils/NewUtility.test.ts
```

## 注意事項

- テストファイルは `.test.ts` または `.test.tsx` で終わる必要があります
- テストは `__tests__` フォルダ内に配置してください
- モックは適切にクリーンアップしてください
- 非同期処理のテストでは `async/await` を使用してください



