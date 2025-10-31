# Nutanixログホイホイ

## 概要
Nutanix環境のログ収集・分析システムです。Prism Centralに登録されたクラスターから、リアルタイムログ、Syslog、ログファイル収集を行い、Elasticsearchで検索・分析できます。

## 🚀 クイックスタート

### docker-compose（開発環境）
```bash
docker-compose -f ongoing/docker-compose.yml up -d --build

# アクセス
# フロントエンド: http://localhost:7777
# バックエンドAPI: http://localhost:7776
# Kibana: http://localhost:5601
```

### Kubernetes（本番環境）
```bash
cd k8s
KUBECONFIG=/path/to/your/kubeconfig.conf ./deploy.sh

# アクセス
# Ingress経由でアクセス（環境に応じて設定）
```

詳細なデプロイ手順は **[Kubernetesデプロイメントガイド](./k8s/DEPLOYMENT_GUIDE.md)** を参照してください。

## 📚 ドキュメント

### デプロイメントガイド

| ドキュメント | 説明 |
|---|---|
| [Kubernetesデプロイメントガイド](./k8s/DEPLOYMENT_GUIDE.md) | **本番環境デプロイ手順**<br>- クイックスタート<br>- 詳細な手動デプロイ手順<br>- トラブルシューティング<br>- 環境別設定 |

### 機能仕様書

各機能の詳細な仕様、API、実装方法を記載しています。

| ドキュメント | 説明 | バージョン | 最終更新 |
|---|---|---|---|
| [COLLECT_LOG_SPECIFICATION.md](./docs/COLLECT_LOG_SPECIFICATION.md) | **ログ収集機能**<br>CVMからログファイルを収集してZIP化<br>- リアルタイム進捗表示<br>- バックグラウンド処理<br>- 自動キャッシュクリーンアップ | v1.3.0 | 2025-10-29 |
| [REALTIME_LOG_SPECIFICATION.md](./docs/REALTIME_LOG_SPECIFICATION.md) | **リアルタイムログ機能**<br>CVMのログファイルをリアルタイム表示<br>- tail -f相当の機能<br>- フィルタリング機能<br>- CVM選択機能 | v1.2.0 | 2025-10-29 |
| [SYSLOG_SPECIFICATION.md](./docs/SYSLOG_SPECIFICATION.md) | **Syslog機能**<br>Nutanix SyslogをElasticsearchで検索<br>- クラスター判別機能<br>- hostname自動取得<br>- 高度な検索クエリ | v1.3.0 | 2025-10-29 |
| [SSH_KEY_MANAGEMENT_SPEC.md](./docs/SSH_KEY_MANAGEMENT_SPEC.md) | **SSH鍵管理機能**<br>SSH鍵の自動生成・管理<br>- 自動生成と永続化<br>- エラー時のモーダル自動表示<br>- Kubernetes/docker-compose対応 | v1.3.0 | 2025-10-29 |
| [UUID_EXPLORER_SPECIFICATION.md](./docs/UUID_EXPLORER_SPECIFICATION.md) | **UUID Explorer機能**<br>Nutanix UUIDの検索・分析<br>- UUID検索<br>- 関連エンティティ表示<br>- 履歴管理 | v1.1.0 | 2025-10-29 |

### アーカイブドキュメント

過去の開発計画やマイグレーション記録は[docs/archive/](./docs/archive/)に保管されています。

## 🏗️ アーキテクチャ

### 技術スタック

| レイヤー | 技術 | 説明 |
|---|---|---|
| **フロントエンド** | Next.js 14, React, TypeScript | App Router、DaisyUI |
| **バックエンド** | FastAPI, Python 3.11 | 非同期処理、型ヒント |
| **データストア** | Elasticsearch 7.17 | ログ検索・分析 |
| **インフラ** | Docker, Kubernetes | コンテナ化、オーケストレーション |
| **SSH接続** | Paramiko | Nutanix CVM接続 |

### ディレクトリ構成

```
ongoing/
├── backend/
│   ├── fastapi_app/          # FastAPIアプリケーション
│   ├── core/                 # コアロジック（SSH接続、ログ収集）
│   └── config/               # 設定ファイル
├── frontend/
│   └── next-app/loghoi/      # Next.jsアプリケーション
├── shared/
│   └── gateways/             # 共通Gateway（Elasticsearch、Prism API）
├── k8s/                      # Kubernetes マニフェスト
├── config/.ssh/              # SSH鍵（永続化）
├── scripts/                  # ユーティリティスクリプト
└── docs/archive/             # 過去ドキュメント
```

## 🔑 主要機能

### 1. PC/クラスター登録
- Prism Central APIで情報取得
- Elasticsearchに保存
- SSH公開鍵の自動生成・表示

### 2. リアルタイムログ
- CVMのログファイルをリアルタイム表示
- 複数ログファイル対応
- フィルタリング機能

### 3. Syslog検索
- Elasticsearchでの高度な検索
- クラスター自動判別
- 時間範囲指定

### 4. ログ収集
- CVMからログファイルを収集
- ZIP圧縮・ダウンロード
- リアルタイム進捗表示

### 5. UUID Explorer
- Nutanix UUIDの検索
- 関連エンティティ表示
- 履歴管理

## 🔧 開発ガイド

### 環境構築

```bash
# リポジトリクローン
git clone https://github.com/konchangakita/blog-loghoi.git
cd blog-loghoi

# docker-compose起動
docker-compose -f ongoing/docker-compose.yml up -d --build

# SSH鍵の確認（自動生成される）
cat config/.ssh/loghoi-key.pub
```

### SSH鍵の登録

1. UIの「Open SSH KEY」ボタンをクリック
2. 表示された公開鍵をコピー
3. Prism Element > Settings > Cluster Lockdown
4. 「Add Public Key」で公開鍵を登録

詳細は[SSH_KEY_MANAGEMENT_SPEC.md](./docs/SSH_KEY_MANAGEMENT_SPEC.md)を参照。

### API仕様

バックエンドAPIドキュメント:
```
http://localhost:7776/docs
```

## 🔒 セキュリティ

- SSH秘密鍵は`.gitignore`で除外
- 環境変数で機密情報を管理
- Kubernetes Secretで鍵を管理

## 📖 関連リンク

- [ブログ: Nutanixログホイホイ](https://konchangakita.hatenablog.com/)
- [GitHub リポジトリ](https://github.com/konchangakita/blog-loghoi)

## 🙋 トラブルシューティング

### SSH接続エラー
→ [SSH_KEY_MANAGEMENT_SPEC.md](./docs/SSH_KEY_MANAGEMENT_SPEC.md) のトラブルシューティングセクションを参照

### Elasticsearch接続エラー
→ docker-composeでElasticsearchが起動しているか確認

### フロントエンドが起動しない
→ `yarn install`を実行してから再起動

## 📜 ライセンス

このプロジェクトは個人のブログ記事用のサンプルコードです。


