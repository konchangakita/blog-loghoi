# Cursorルール体系の整備

## 概要
blog-loghoiプロジェクト用のCursorルール体系を整備しました。新しいCursorルール体系（`.cursor/rules`）を導入し、プロジェクトの開発効率とコード品質向上を図ります。

## 変更内容
- [x] 新しいCursorルール体系（.cursor/rules）を導入
- [x] GitFlow運用ルール（refactorブランチ中心）を定義
- [x] FastAPI中心のPython開発ルールを設定
- [x] フォルダ制限（ongoing/配下での開発）を明記
- [x] 開発ワークフローとテンプレートを整備
- [x] Docker/Kubernetes、Elasticsearch専用ルールを追加
- [x] AGENTS.mdでシンプルな代替ルールを提供

## 追加されたファイル
- `.cursor/rules/project-guidelines.mdc` - プロジェクト全体の基本ガイドライン
- `.cursor/rules/gitflow-workflow.mdc` - GitFlow運用ルール
- `.cursor/rules/development-workflow.mdc` - 開発ワークフロー詳細
- `.cursor/rules/python-backend.mdc` - FastAPI中心のPython開発ルール
- `.cursor/rules/frontend-nextjs.mdc` - JavaScript/TypeScript開発ルール
- `.cursor/rules/docker-k8s.mdc` - Docker & Kubernetes設定ルール
- `.cursor/rules/elasticsearch.mdc` - Elasticsearch専用ルール
- `.cursor/settings.json` - プロジェクト固有のCursor設定
- `.cursorignore` - 無視すべきファイル・ディレクトリの設定
- `AGENTS.md` - シンプルなMarkdown形式の代替ルール

## 重要な運用ルール
### ブランチ戦略
- `refactor`ブランチがメイン開発ブランチ（developの役割も兼ねる）
- `feature/*`ブランチから`refactor`ブランチへのPR経由でのみ変更

### 開発制限
- すべての更新は`ongoing/`フォルダ配下で実施
- `blog/`フォルダは過去のブログ記事対応履歴のため、直接編集禁止

### 技術方針
- **FastAPI**: 今後の新規開発はすべてFastAPIを使用
- **Flask**: 過去開発のコードのみ（新規開発では使用禁止）

### コミット規約
- Conventional Commits形式を使用
- コミットメッセージに「test」や「tmp」は禁止

## テスト
- [x] ルールファイルの構文確認
- [x] ファイルパスとglobs設定の確認
- [x] 日本語記述の確認

## 影響範囲
- 開発ワークフローの標準化
- コード品質の向上
- チーム開発の効率化
- ブログ連携の明確化

## 関連チケット
- Cursorルール整備プロジェクト

## レビュー観点
- [ ] ルール内容の適切性
- [ ] 運用ルールの実現可能性
- [ ] チーム内での共有方法
- [ ] 既存開発フローへの影響

## 備考
このPRはプロジェクトの開発基盤整備の重要な一歩です。承認後はチーム内でルールの共有と運用開始を行います。
