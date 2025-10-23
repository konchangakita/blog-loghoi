# アーカイブドキュメント

このディレクトリには、開発完了済みまたは現在使用されていない過去のドキュメントが保管されています。

## 📁 含まれるドキュメント

### マイグレーション計画書
| ファイル名 | 説明 | 完了日 |
|---|---|---|
| `FLASK_TO_FASTAPI_MIGRATION.md` | FlaskからFastAPIへの移行計画 | 2025-10-03 |
| `MIGRATION_PLAN_PHASE2.md` | フェーズ2移行計画 | 2025-10-06 |
| `REFACTORING_PLAN_TIDY_FIRST.md` | Tidy Firstリファクタリング計画 | 2025-10-08 |

### 開発計画書
| ファイル名 | 説明 | 完了日 |
|---|---|---|
| `UUID_EXPLORER_DEVELOPMENT_PLAN.md` | UUID Explorer機能の開発計画 | 2025-10-06 |

### テスト関連
| ファイル名 | 説明 | 完了日 |
|---|---|---|
| `LIVE_TEST_RESULTS.md` | 本番環境テスト結果 | 2025-10-03 |
| `TEST_README.md` | テストガイド | 2025-10-03 |
| `tests/` | 過去のテストコード（unit/integration） | 2025-10-03 |
| `pytest.ini` | pytest設定ファイル | 2025-10-03 |

## 📌 アーカイブ理由

これらのドキュメントは以下の理由でアーカイブされました：

### ✅ 完了済み
- **Flask → FastAPI移行**: 完了済み（現在はFastAPIのみ使用）
- **リファクタリング**: 主要なリファクタリング作業完了
- **UUID Explorer開発**: 機能実装完了

### 🧪 テストコードについて
- **tests/**: 2025-10-03以降更新されていない古いテストコード
- **現在の実装と乖離**: SSH鍵管理、Syslog等の最新機能に対応していない
- **CIでの状態**: `continue-on-error: true`で実質的に無視されている
- **CI統合**: GitHub Actions（`.github/workflows/`）で現在のテストが実行中
  - API Integration Tests（docker-compose使用）
  - Security Scan（Bandit, Safety）
  - Lint and Format Check

### 📝 現在の仕様書に統合
- 最新の機能仕様は各機能の`*_SPECIFICATION.md`に記載
- テスト方法は各仕様書のテストセクションに記載
- CI/CDはGitHub Actionsで自動化

## 🔍 参照方法

過去の開発経緯や意思決定の背景を確認する際に参照してください。

## 現在の有効なドキュメント

最新の仕様書は`ongoing/`ディレクトリ直下にあります：

- `COLLECT_LOG_SPECIFICATION.md` - ログ収集機能
- `REALTIME_LOG_SPECIFICATION.md` - リアルタイムログ機能
- `SSH_KEY_MANAGEMENT_SPEC.md` - SSH鍵管理機能
- `SYSLOG_SPECIFICATION.md` - Syslog機能
- `UUID_EXPLORER_SPECIFICATION.md` - UUID Explorer機能
- `README_REFACTORING.md` - プロジェクト概要

