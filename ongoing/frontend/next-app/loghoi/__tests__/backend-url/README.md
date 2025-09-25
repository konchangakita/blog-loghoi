# Backend URL Tests

バックエンドURL共通化機能のテストスイートです。

## テストファイル構成

### 1. `getBackendUrl.test.ts` - 単体テスト
`lib/getBackendUrl.ts`の`getBackendUrl`関数の単体テスト

**テスト内容:**
- 環境変数の優先順位テスト
- クライアントサイド・サーバーサイド動作テスト
- ポート番号処理テスト
- エッジケーステスト

**実行方法:**
```bash
npm test -- getBackendUrl.test.ts
```

### 2. `backendUrlIntegration.test.tsx` - 統合テスト
コンポーネントでの`getBackendUrl`使用の統合テスト

**テスト内容:**
- PcList2コンポーネントでの使用テスト
- 環境変数の優先順位確認
- エラーハンドリングテスト

**実行方法:**
```bash
npm test -- backendUrlIntegration.test.tsx
```

### 3. `socketioBackendUrl.test.tsx` - SocketIO統合テスト
SocketIO接続での`getBackendUrl`使用のテスト

**テスト内容:**
- SocketIO接続でのURL使用テスト
- 統合開始ボタンの動作テスト
- エラーハンドリングテスト

**実行方法:**
```bash
npm test -- socketioBackendUrl.test.tsx
```

### 4. `apiBackendUrl.test.ts` - API統合テスト
API関数での`getBackendUrl`使用のテスト

**テスト内容:**
- getPclist APIでの使用テスト
- 環境変数の優先順位確認
- ポート番号処理テスト
- エラーハンドリングテスト

**実行方法:**
```bash
npm test -- apiBackendUrl.test.ts
```

## 全テスト実行

```bash
# バックエンドURL関連の全テストを実行
npm test -- --testPathPattern="backend-url"

# カバレッジ付きで実行
npm run test:coverage -- --testPathPattern="backend-url"
```

## テスト環境

- **Jest**: テストフレームワーク
- **@testing-library/react**: Reactコンポーネントテスト
- **@testing-library/jest-dom**: DOM要素のマッチャー
- **jest-environment-jsdom**: ブラウザ環境のシミュレーション

## 環境変数のテスト

テストでは以下の環境変数をモックしてテストしています：

- `NEXT_PUBLIC_BACKEND_URL`
- `NEXT_PUBLIC_BACKEND_HOST`
- `NEXT_PUBLIC_BACKEND_PORT`
- `NEXT_PUBLIC_BACKEND_PROTOCOL`
- `BACKEND_SERVICE_HOST`
- `BACKEND_SERVICE_PORT`
- `BACKEND_SERVICE_PROTOCOL`
- `BACKEND_HOST`
- `BACKEND_PORT`
- `BACKEND_PROTOCOL`

## モック

- **fetch**: API呼び出しのモック
- **socket.io-client**: SocketIO接続のモック
- **window.location**: ブラウザのlocationオブジェクトのモック
- **process.env**: 環境変数のモック

## カバレッジ

- 単体テスト: `getBackendUrl`関数の全パス
- 統合テスト: コンポーネント・API・SocketIOでの使用
- エラーハンドリング: 異常系の処理
- 環境対応: クライアント・サーバー両環境
