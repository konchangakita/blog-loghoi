# Cursorルール クイックスタートガイド

## 🚀 今すぐできること

### 1. Cursorでルールを確認
- Cursorを開く
- エージェントサイドバーで「アクティブなルール」を確認
- プロジェクトのルールが自動的に適用される

### 2. 基本的な開発フロー
```bash
# 新機能開発
git checkout refactor
git checkout -b feature/your-feature-name

# 開発完了後
git add .
git commit -m "feat: 新機能の説明"
git push origin feature/your-feature-name
# GitHubでPR作成: feature/your-feature-name → refactor
```

## 📋 重要なルール（今すぐ覚える）

### ✅ **やるべきこと**
- すべての更新は`ongoing/`フォルダ配下で実施
- Conventional Commits形式でコミット
- FastAPI中心のバックエンド開発
- PR経由での変更

### ❌ **やってはいけないこと**
- `refactor`ブランチに直接コミット
- `main`ブランチでのpush
- コミットメッセージに「test」や「tmp」と書く
- `blog/`フォルダでの直接編集

## 🔧 技術スタック

### バックエンド
- **FastAPI**: 新規開発はすべてFastAPI
- **Flask**: 過去のコードのみ（新規開発禁止）
- 非同期処理を積極的に活用

### フロントエンド
- **Next.js**: React フレームワーク
- TypeScript必須
- 関数コンポーネントを優先

## 📁 フォルダ構成

```
blog-loghoi/
├── ongoing/           # ✅ 開発作業エリア
│   ├── backend/      # バックエンド開発
│   ├── frontend/     # フロントエンド開発
│   ├── shared/       # 共通ライブラリ
│   ├── tests/        # テストコード
│   └── k8s/          # Kubernetes設定
└── blog/             # ❌ 直接編集禁止（履歴保存用）
    ├── 0814/         # 過去のブログ記事対応
    └── ...
```

## 🆘 困ったときは

### よくある質問
**Q: どのルールが適用されているかわからない**
A: Cursorのエージェントサイドバーで確認できます

**Q: ルールを一時的に無効にしたい**
A: `.cursorignore`にファイルを追加するか、手動でルールを無効化できます

**Q: 新しいルールを追加したい**
A: `.cursor/rules/`ディレクトリに新しい`.mdc`ファイルを作成してください

### 参考資料
- `CURSOR_RULES_GUIDE.md`: 詳細な運用ガイド
- `AGENTS.md`: シンプルなルール説明
- `.cursor/rules/`: 各専門分野の詳細ルール

## 📞 サポート

- ルールに関する質問はチーム内で相談
- 改善提案は積極的に受け付けます
- 月次でルールの見直しを実施予定

---

**🎯 目標**: 開発効率向上とコード品質向上を実現する
