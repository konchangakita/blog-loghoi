# リアルタイムログ機能 TDD テストスイート

## 概要

このテストスイートは、リアルタイムログ機能のTDD（Test-Driven Development）実装です。SocketIO接続、SSH接続管理、リアルタイムログ取得・配信の各機能を包括的にテストします。

## テスト構成

### バックエンドテスト
- **SocketIOイベントハンドラー**: 接続・切断・tail -f開始・停止イベント
- **SSH接続管理**: 接続確立・切断・エラーハンドリング
- **リアルタイムログ**: ログ取得・SocketIO送信・フォーマット

### フロントエンドテスト
- **SocketIO接続**: 接続・切断ボタンの動作
- **tail -fボタン**: 開始・停止ボタンの動作
- **ログ表示**: ログ受信・表示・フィルタリング

### 統合テスト
- **エンドツーエンド**: 完全なフローのテスト
- **マルチクライアント**: 複数クライアント接続のテスト
- **エラーハンドリング**: エラーシナリオのテスト

## テスト実行方法

### 全テスト実行
```bash
# バックエンドディレクトリから実行
cd /home/nutanix/konchangakita/blog-loghoi/ongoing/backend
python run_tests.py
```

### バックエンドテストのみ
```bash
cd /home/nutanix/konchangakita/blog-loghoi/ongoing/backend
pip install -r requirements_test.txt
pytest tests/ -v
```

### フロントエンドテストのみ
```bash
cd /home/nutanix/konchangakita/blog-loghoi/ongoing/frontend/next-app/loghoi
npm install
npm test
```

### カバレッジレポート
```bash
# バックエンド
cd /home/nutanix/konchangakita/blog-loghoi/ongoing/backend
pytest tests/ --cov=flaskr --cov-report=html

# フロントエンド
cd /home/nutanix/konchangakita/blog-loghoi/ongoing/frontend/next-app/loghoi
npm run test:coverage
```

## テストファイル構成

```
backend/
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_socketio_events.py    # SocketIOイベントテスト
│   ├── test_ssh_connection.py     # SSH接続管理テスト
│   ├── test_realtime_logs.py      # リアルタイムログテスト
│   └── test_integration.py        # 統合テスト
├── pytest.ini
├── requirements_test.txt
└── run_tests.py

frontend/next-app/loghoi/
├── __tests__/
│   ├── __init__.py
│   ├── setup.ts
│   └── realtimelog-logview.test.tsx
├── jest.config.js
└── package.json
```

## テストケース詳細

### バックエンドテストケース

#### SocketIOイベントテスト
- `test_connect_event`: 接続時の処理
- `test_disconnect_event`: 切断時の処理
- `test_start_tail_f_event_success`: tail -f開始成功
- `test_start_tail_f_event_invalid_params`: 無効パラメータ処理
- `test_stop_tail_f_event`: tail -f停止
- `test_multiple_connections`: 複数接続処理

#### SSH接続管理テスト
- `test_start_ssh_log_monitoring_success`: SSH接続成功
- `test_start_ssh_log_monitoring_connection_failure`: SSH接続失敗
- `test_start_ssh_log_monitoring_existing_connection`: 既存接続処理
- `test_stop_ssh_log_monitoring`: SSH接続停止
- `test_ssh_connection_cleanup`: 接続クリーンアップ

#### リアルタイムログテスト
- `test_monitor_realtime_logs_success`: ログ取得成功
- `test_monitor_realtime_logs_empty_logs`: 空ログ処理
- `test_monitor_realtime_logs_connection_error`: 接続エラー処理
- `test_monitor_realtime_logs_socketio_error`: SocketIO送信エラー処理
- `test_log_format`: ログフォーマット検証

### フロントエンドテストケース

#### コンポーネントテスト
- `test_initial_render`: 初期表示
- `test_socketio_connection`: SocketIO接続処理
- `test_tail_f_functionality`: tail -f機能
- `test_log_display`: ログ表示
- `test_disconnection`: 切断処理

### 統合テストケース

#### エンドツーエンドテスト
- `test_end_to_end_flow`: 完全フロー
- `test_multiple_clients_connection`: マルチクライアント
- `test_error_handling_flow`: エラーハンドリング
- `test_log_broadcasting`: ログ配信
- `test_connection_cleanup_on_disconnect`: 切断時クリーンアップ

## モック戦略

### バックエンドモック
- **SSH接続**: `paramiko`のモック
- **SocketIO**: `python-socketio`のテストクライアント
- **非同期処理**: `asyncio`のモック

### フロントエンドモック
- **Socket.IO**: `socket.io-client`のモック
- **Next.js Router**: `next/navigation`のモック
- **ファイル保存**: `file-saver`のモック

## カバレッジ目標

- **バックエンド**: 80%以上
- **フロントエンド**: 70%以上
- **統合テスト**: 主要フローの100%

## 継続的インテグレーション

### GitHub Actions設定例
```yaml
name: TDD Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Backend Tests
        run: cd backend && python run_tests.py
      - name: Run Frontend Tests
        run: cd frontend/next-app/loghoi && npm test
```

## トラブルシューティング

### よくある問題
1. **SSH接続モック失敗**: `paramiko`のモック設定を確認
2. **SocketIO接続失敗**: テストクライアントの設定を確認
3. **非同期テスト失敗**: `pytest-asyncio`の設定を確認

### デバッグ方法
```bash
# 詳細ログ付きでテスト実行
pytest tests/ -v -s --tb=long

# 特定のテストのみ実行
pytest tests/test_socketio_events.py::TestSocketIOEvents::test_connect_event -v
```

## 今後の拡張

1. **パフォーマンステスト**: 大量ログ処理のテスト
2. **負荷テスト**: 複数クライアント同時接続のテスト
3. **セキュリティテスト**: 不正な接続試行のテスト
4. **E2Eテスト**: Playwright等を使用したブラウザテスト
