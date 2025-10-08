# CI/CD パイプラインドキュメント

## 概要
このディレクトリには、LogHoiプロジェクトのCI/CDパイプライン設定が含まれています。
GitHub Actionsを使用して、コード品質の自動チェック、テスト実行、PRゲート化を実現しています。

**ステータス**: ✅ 稼働中（2025年1月12日より）

## ワークフロー一覧

### 1. Frontend CI (`frontend-ci.yml`)
フロントエンド（Next.js）のCI/CDパイプライン

#### トリガー
- PRの作成・更新（refactor/mainブランチへ）
- refactor/mainブランチへのpush
- `ongoing/frontend/`配下のファイル変更時

#### ジョブ
1. **Lint and Type Check**
   - ESLintによる静的解析
   - TypeScriptの型チェック
   - console.logステートメントのチェック

2. **Unit Tests**
   - Jestによるユニットテスト実行
   - カバレッジレポート生成
   - Codecovへのアップロード

3. **E2E Tests**
   - Playwrightによるブラウザテスト
   - バックエンドサービスの起動
   - Chromiumでのテスト実行
   - テスト結果・ビデオのアーティファクト保存

4. **Build Check**
   - Next.jsアプリケーションのビルド確認
   - ビルドサイズのチェック

#### 実行時間目安
- Lint and Type Check: ~2分
- Unit Tests: ~3分
- E2E Tests: ~5-10分
- Build Check: ~3分
- **合計**: ~15分

---

### 2. Backend CI (`backend-ci.yml`)
バックエンド（FastAPI）のCI/CDパイプライン

#### トリガー
- PRの作成・更新（refactor/mainブランチへ）
- refactor/mainブランチへのpush
- `ongoing/backend/`配下のファイル変更時

#### ジョブ
1. **Lint and Format Check**
   - Blackによるコードフォーマットチェック
   - Flake8による静的解析
   - Pylintによるコード品質チェック
   - MyPyによる型チェック

2. **Unit Tests**
   - Elasticsearchサービスの起動
   - Pytestによるユニットテスト実行
   - カバレッジレポート生成
   - Codecovへのアップロード

3. **API Integration Tests**
   - Docker Composeによるサービス起動
   - ヘルスチェック
   - 主要APIエンドポイントのテスト
   - Collect Log API、UUID APIの動作確認

4. **Security Scan**
   - Safetyによる依存関係の脆弱性スキャン
   - Banditによるセキュリティスキャン
   - レポートのアーティファクト保存

#### 実行時間目安
- Lint and Format Check: ~2分
- Unit Tests: ~3分
- API Integration Tests: ~5分
- Security Scan: ~2分
- **合計**: ~12分

---

### 3. PR Gate (`pr-gate.yml`)
PRのゲートチェック

#### トリガー
- PRの作成・更新・再オープン（refactor/mainブランチへ）
- ドラフトPRは除外

#### ジョブ
1. **Check PR Requirements**
   - PRタイトルのConventional Commits形式チェック
   - PR説明の長さチェック（最低50文字）
   - ブランチ名の形式確認
   - 自動ラベル付け

2. **All Tests Status**
   - すべてのCIチェック完了待機
   - PRへの自動コメント

3. **PR Size Check**
   - 変更行数のカウント
   - 大規模PR（1000行以上）への警告

#### 実行時間目安
- ~1分

---

## Conventional Commits

PRタイトルは以下の形式に従う必要があります：

```
<type>(<scope>): <description>
```

### タイプ
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `refactor`: リファクタリング
- `chore`: ビルド・依存関係
- `test`: テスト追加・修正
- `style`: コードスタイル
- `perf`: パフォーマンス改善

### 例
```
feat: E2Eテストの自動化実装
fix: ログ表示のバグ修正
docs: README更新
refactor: API構造の改善
```

---

## PRマージ要件

PRをマージするには、以下すべてのチェックに合格する必要があります：

### ✅ 必須チェック
1. **Frontend CI**
   - Lint and Type Check: 合格
   - Unit Tests: 合格
   - E2E Tests: 合格
   - Build Check: 合格

2. **Backend CI**
   - Lint and Format Check: 合格
   - Unit Tests: 合格
   - API Integration Tests: 合格
   - Security Scan: 合格（警告は許容）

3. **PR Gate**
   - PR Requirements: 合格
   - PR Size: 確認済み

4. **レビュー**
   - 最低1人の承認

---

## ローカルでのテスト実行

CI/CDパイプラインで実行されるテストをローカルで実行できます。

### フロントエンド
```bash
cd ongoing/frontend/next-app/loghoi

# Lint
npm run lint

# Type Check
npx tsc --noEmit

# Unit Tests
npm run test

# E2E Tests
npm run test:e2e

# Build
npm run build
```

### バックエンド
```bash
cd ongoing/backend

# Format Check
black --check .

# Lint
flake8 .
pylint fastapi_app/ core/

# Type Check
mypy fastapi_app/ core/ --ignore-missing-imports

# Unit Tests
pytest

# Security Scan
safety check
bandit -r fastapi_app/ core/
```

---

## トラブルシューティング

### E2Eテストが失敗する
1. バックエンドサービスの起動を確認
2. テスト結果のアーティファクトをダウンロード
3. スクリーンショット・ビデオを確認

### タイムアウトエラー
1. サービスの起動時間を延長
2. `sleep`時間を調整
3. ヘルスチェックのリトライ回数を増加

### 依存関係のエラー
1. `package-lock.json` / `requirements.txt`を更新
2. キャッシュをクリア
3. 再実行

---

## Codecov統合

コードカバレッジは自動的にCodecovにアップロードされます。

### 設定
1. Codecovトークンを`CODECOV_TOKEN`シークレットに設定
2. カバレッジレポートは各PRにコメントとして表示

### カバレッジ目標
- フロントエンド: 70%以上
- バックエンド: 80%以上

---

## セキュリティ

### シークレット管理
- GitHub Secretsに機密情報を保存
- `.env`ファイルはコミットしない
- トークンはローテーション

### 脆弱性スキャン
- Safety: Python依存関係
- Bandit: Pythonコードのセキュリティ
- 週次での自動スキャン推奨

---

## パフォーマンス最適化

### キャッシュ戦略
- `npm ci`でnode_modulesをキャッシュ
- `pip`でPythonパッケージをキャッシュ
- Dockerレイヤーキャッシュの活用

### 並列実行
- フロントエンド/バックエンドは並列実行
- 各ジョブ内のステップも可能な限り並列化

---

## 今後の改善計画

### Phase 1（完了）
- ✅ 基本的なCI/CDパイプライン
- ✅ Lint/Type/Formatチェック
- ✅ ユニットテスト
- ✅ E2Eテスト
- ✅ PRゲート化

### Phase 2（次回）
- [ ] 自動デプロイ（Kubernetes）
- [ ] パフォーマンステスト
- [ ] ビジュアルリグレッションテスト
- [ ] 依存関係の自動更新（Dependabot）

### Phase 3（将来）
- [ ] カナリアデプロイ
- [ ] ブルーグリーンデプロイ
- [ ] モニタリング統合
- [ ] 自動ロールバック

---

## 参考リンク
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Codecov Documentation](https://docs.codecov.com/)
- [Playwright CI](https://playwright.dev/docs/ci)

