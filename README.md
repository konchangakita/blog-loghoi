# Nutanixログホイホイ ブログシリーズのコード置き場

ここはブログと連動したリポジトリ  
ブログシリーズは[コチラ](https://konchangakita.hatenablog.com/archive/category/Nutanix%20%E3%83%AD%E3%82%B0%E3%81%BB%E3%81%84%E3%81%BB%E3%81%84)

## 📁 ディレクトリ構成

- `ongoing/` - ブログ書きながら更新している最新コード
- `blog/` - ブログ更新ごとに日付フォルダが増えていきます

## 📚 ドキュメント

### メインREADME
- **[ongoing/README.md](./ongoing/README.md)** - プロジェクト概要、クイックスタート、開発ガイド

### 機能仕様書

各機能の詳細な仕様、API、実装方法を記載しています。

| ドキュメント | 説明 | バージョン |
|---|---|---|
| [ログ収集機能](./ongoing/COLLECT_LOG_SPECIFICATION.md) | CVMからログファイルを収集してZIP化<br>リアルタイム進捗表示、自動クリーンアップ | v1.2.0 |
| [リアルタイムログ機能](./ongoing/REALTIME_LOG_SPECIFICATION.md) | CVMのログファイルをリアルタイム表示<br>tail -f相当、フィルタリング機能 | v1.1.0 |
| [Syslog機能](./ongoing/SYSLOG_SPECIFICATION.md) | Nutanix SyslogをElasticsearchで検索<br>クラスター判別、hostname自動取得 | v1.2.0 |
| [SSH鍵管理機能](./ongoing/SSH_KEY_MANAGEMENT_SPEC.md) | SSH鍵の自動生成・管理<br>エラー時のモーダル自動表示 | v1.2.0 |
| [UUID Explorer機能](./ongoing/UUID_EXPLORER_SPECIFICATION.md) | Nutanix UUIDの検索・分析<br>関連エンティティ表示 | v1.0.0 |

### アーカイブ
- **[docs/archive/](./ongoing/docs/archive/)** - 過去の開発計画、マイグレーション記録

## 🚀 クイックスタート

詳細は [ongoing/README.md](./ongoing/README.md) を参照してください。

```bash
cd ongoing
docker-compose -f docker-compose_fastapi.yml up -d --build

# フロントエンド: http://localhost:7777
# バックエンドAPI: http://localhost:7776/docs
```

## 🎯 Nutanixログホイホイとは

Nutanix の何か挙動がおかしい・アラートが出てるけど、ログ取得ってどこからやるんだっけ？  
ログ取得してみたものの、コンソールから手元に持ってくるのメンドクサイ、、、え、さっきのログよりまた最新のログが必要。。。。？

などなど、、、作った動機は  
https://konchangakita.hatenablog.com/entry/2023/07/24/090000

## 📖 関連リンク

- [ブログシリーズ](https://konchangakita.hatenablog.com/archive/category/Nutanix%20%E3%83%AD%E3%82%B0%E3%81%BB%E3%81%84%E3%81%BB%E3%81%84)
- [開発ガイド](./ongoing/README.md)
