# blog-loghoi Cursorルール運用ガイド

## 概要
このガイドは、blog-loghoiプロジェクトで導入されたCursorルール体系の運用方法を説明します。

## ルールファイル構成

### 📁 `.cursor/rules/` ディレクトリ
```
.cursor/rules/
├── project-guidelines.mdc      # プロジェクト全体の基本ガイドライン（Always Apply）
├── gitflow-workflow.mdc        # GitFlow運用ルール（Always Apply）
├── development-workflow.mdc    # 開発ワークフロー詳細
├── python-backend.mdc          # FastAPI中心のPython開発ルール
├── frontend-nextjs.mdc         # JavaScript/TypeScript開発ルール
├── docker-k8s.mdc             # Docker & Kubernetes設定ルール
└── elasticsearch.mdc          # Elasticsearch専用ルール
```

### 📄 `AGENTS.md`
シンプルなMarkdown形式の代替ルールファイル

## ルールの適用方法

### 自動適用（Always Apply）
- `project-guidelines.mdc` - プロジェクト全体の基本ガイドライン
- `gitflow-workflow.mdc` - GitFlow運用ルール

### ファイルパターン適用（Auto Attached）
- `python-backend.mdc` - `**/*.py`, `**/requirements*.txt`, `**/pytest.ini`
- `frontend-nextjs.mdc` - `**/frontend/**`, `**/*.tsx`, `**/*.ts`, `**/*.js`, `**/*.jsx`
- `docker-k8s.mdc` - `**/dockerfile*`, `**/docker-compose*.yml`, `**/k8s/**`
- `elasticsearch.mdc` - `**/elastic/**`, `**/*ela*.py`, `**/*elastic*.py`

## 重要な運用ルール

### 🚫 禁止事項
- `refactor`ブランチに直接コミット
- `main`ブランチでのpush
- コミットメッセージに「test」や「tmp」と書く
- `blog/`フォルダでの直接編集

### ✅ 推奨事項
- すべての更新は`ongoing/`フォルダ配下で実施
- Conventional Commits形式でコミット
- FastAPI中心のバックエンド開発
- PR経由での変更

## 開発ワークフロー

### 1. 新機能開発
```bash
# refactorブランチから新機能ブランチを作成
git checkout refactor
git pull origin refactor
git checkout -b feature/new-feature

# 開発完了後、refactorにPR
# PR作成: feature/new-feature → refactor
```

### 2. 緊急修正（Hotfix）
```bash
# mainからhotfixブランチを作成
git checkout main
git checkout -b hotfix/urgent-fix

# 修正完了後、mainとrefactorの両方にマージ
git checkout main
git merge hotfix/urgent-fix
git push origin main

git checkout refactor
git merge hotfix/urgent-fix
git push origin refactor
```

## 技術スタック

### バックエンド
- **FastAPI**: 今後の新規開発はすべてFastAPIを使用
- **Flask**: 過去開発のコードのみ（新規開発では使用禁止）
- 非同期処理を積極的に活用
- Pydanticモデルを使用

### フロントエンド
- **Next.js**: React フレームワーク
- TypeScript必須
- 関数コンポーネントを優先

### インフラ
- Docker コンテナ化
- Kubernetes でのデプロイ
- Elasticsearch でのログ分析

## チーム内での共有

### 新メンバー向け
1. このガイドを読む
2. `AGENTS.md`を確認
3. 実際の開発でルールを適用

### 既存メンバー向け
1. 新しいルール体系に慣れる
2. 従来の開発フローから移行
3. フィードバックを提供

## トラブルシューティング

### よくある質問
**Q: どのルールファイルが適用されているかわからない**
A: Cursorのエージェントサイドバーでアクティブなルールを確認できます

**Q: ルールを一時的に無効にしたい**
A: `.cursorignore`にファイルを追加するか、手動でルールを無効化できます

**Q: 新しいルールを追加したい**
A: `.cursor/rules/`ディレクトリに新しい`.mdc`ファイルを作成してください

## 更新履歴
- 2024-10-08: 初期版作成
- FastAPI中心の開発方針を採用
- refactorブランチ中心のGitFlow運用を導入

## 参考リンク
- [Cursor公式ドキュメント - ルール](https://docs.cursor.com/ja/context/rules)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitFlow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)
