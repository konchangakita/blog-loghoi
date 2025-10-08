# GitHub通知設定ガイド

## 概要
GitHub Actionsによる自動PR作成やCI/CD実行時のメール通知を最適化する設定ガイドです。

## メール通知を無効化する方法

### 1. GitHub Web UIで設定

#### ステップ1: 通知設定ページにアクセス
1. GitHubにログイン
2. 右上のプロフィールアイコンをクリック
3. **Settings** を選択
4. 左メニューから **Notifications** を選択

#### ステップ2: Pull Request通知を調整
**Email notification preferences** セクションで以下を設定：

- ✅ **Participating**: 自分が参加しているPRのみ通知
- ✅ **Watching**: Watchしているリポジトリの通知
- ❌ **Pull requests**: すべてのPR作成通知（チェックを外す）
- ❌ **Actions**: GitHub Actions実行通知（チェックを外す）

#### ステップ3: リポジトリ固有の設定
特定のリポジトリのみ通知を調整：

1. リポジトリページに移動
2. 右上の **Watch** ボタンをクリック
3. **Custom** を選択
4. 以下を選択：
   - ✅ Issues
   - ✅ Pull requests (自分が関与するもののみ)
   - ❌ Releases
   - ❌ Discussions
   - ❌ Security alerts

### 2. GitHub CLIで設定確認

```bash
# 現在の通知設定を確認
gh api user/notification_settings

# 特定のリポジトリの購読状態を確認
gh api repos/konchangakita/blog-loghoi/subscription
```

### 3. メールフィルターの設定

完全に無効化せず、メールクライアントでフィルタリングする方法：

#### Gmailの場合
1. 検索ボックスに以下を入力：
   ```
   from:notifications@github.com subject:"[konchangakita/blog-loghoi]"
   ```

2. 検索結果の上部にある「フィルタを作成」をクリック

3. 以下のアクションを設定：
   - ラベルを付ける: `GitHub/blog-loghoi`
   - 受信トレイをスキップ（アーカイブする）
   - または、特定のラベルのみ受信トレイに残す

#### 高度なフィルター例
```
from:notifications@github.com 
subject:"[konchangakita/blog-loghoi]"
-subject:"[konchangakita/blog-loghoi] Run failed"
-subject:"CI/CD"
```

## 推奨設定

### 開発者向け（アクティブ開発中）
- ✅ 自分が作成したPR: 通知ON
- ✅ 自分がレビューアのPR: 通知ON
- ✅ 自分がメンションされた: 通知ON
- ❌ すべてのPR作成: 通知OFF
- ❌ CI/CD実行: 通知OFF

### レビューアー向け
- ✅ レビュー依頼: 通知ON
- ✅ レビューコメントへの返信: 通知ON
- ❌ すべてのPR作成: 通知OFF
- ❌ CI/CD実行: 通知OFF

### プロジェクトマネージャー向け
- ✅ すべてのPR作成: 通知ON
- ✅ マージ完了: 通知ON
- ✅ CI/CD失敗: 通知ON
- ❌ CI/CD成功: 通知OFF

## トラブルシューティング

### メールが多すぎる場合
1. **Watching設定を確認**: リポジトリをWatchingにしていないか確認
2. **Custom通知に変更**: 必要な通知のみ選択
3. **メールフィルター**: 重要な通知のみ受信トレイに残す

### 重要な通知を見逃す場合
1. **Participating通知を有効化**: 自分が関与するもののみ
2. **GitHub通知ページを確認**: https://github.com/notifications
3. **Slackなど他ツールと連携**: GitHubアプリをインストール

## GitHub通知の種類

### Pull Request関連
- `opened`: PR作成時
- `closed`: PRクローズ時
- `merged`: PRマージ時
- `review_requested`: レビュー依頼時
- `commented`: コメント追加時

### GitHub Actions関連
- `workflow_run`: ワークフロー実行完了時
- `check_suite`: チェック完了時
- `check_run`: 個別チェック完了時

## 参考リンク
- [GitHub Notifications Documentation](https://docs.github.com/en/account-and-profile/managing-subscriptions-and-notifications-on-github)
- [Configuring notifications](https://docs.github.com/en/account-and-profile/managing-subscriptions-and-notifications-on-github/setting-up-notifications/configuring-notifications)
- [About email notifications](https://docs.github.com/en/account-and-profile/managing-subscriptions-and-notifications-on-github/setting-up-notifications/about-email-notifications)
