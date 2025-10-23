#!/bin/bash
# PR作成自動化スクリプト
# Usage: ./scripts/create-pr.sh [チケット番号] [機能名]

set -e

# 色付きの出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ヘルプ表示
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -t, --ticket TICKET_NUMBER   チケット番号 (例: 123)"
    echo "  -n, --name FEATURE_NAME      機能名 (例: log-collection-improvement)"
    echo "  -h, --help                   このヘルプを表示"
    echo ""
    echo "Examples:"
    echo "  $0 -t 123 -n log-collection-improvement"
    echo "  $0 --ticket 456 --name dashboard-redesign"
}

# 引数解析
TICKET_NUMBER=""
FEATURE_NAME=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--ticket)
            TICKET_NUMBER="$2"
            shift 2
            ;;
        -n|--name)
            FEATURE_NAME="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# 必須引数のチェック
if [ -z "$TICKET_NUMBER" ] || [ -z "$FEATURE_NAME" ]; then
    echo -e "${RED}Error: チケット番号と機能名は必須です${NC}"
    show_help
    exit 1
fi

# 現在のブランチを取得
CURRENT_BRANCH=$(git branch --show-current)

# ブランチ名の検証
if [[ ! $CURRENT_BRANCH =~ ^feature/ ]]; then
    echo -e "${RED}Error: featureブランチにいません。現在のブランチ: $CURRENT_BRANCH${NC}"
    echo -e "${YELLOW}featureブランチを作成してから実行してください:${NC}"
    echo "  git checkout refactor"
    echo "  git pull origin refactor"
    echo "  git checkout -b feature/$FEATURE_NAME"
    exit 1
fi

echo -e "${BLUE}=== PR作成開始 ===${NC}"
echo -e "ブランチ: ${GREEN}$CURRENT_BRANCH${NC}"
echo -e "チケット番号: ${GREEN}#$TICKET_NUMBER${NC}"
echo -e "機能名: ${GREEN}$FEATURE_NAME${NC}"
echo ""

# 変更内容の確認
echo -e "${YELLOW}変更内容を確認中...${NC}"
CHANGED_FILES=$(git diff --name-only)
if [ -z "$CHANGED_FILES" ]; then
    echo -e "${RED}Error: コミットされていない変更があります${NC}"
    echo "以下のファイルが変更されています:"
    git status --porcelain
    echo ""
    echo "変更をコミットしてから再実行してください:"
    echo "  git add ."
    echo "  git commit -m \"feat: $FEATURE_NAME の実装\""
    exit 1
fi

# 最新のコミットをプッシュ
echo -e "${YELLOW}変更をプッシュ中...${NC}"
git push origin "$CURRENT_BRANCH"

# PRタイトルを生成
PR_TITLE="[#$TICKET_NUMBER] feat: $FEATURE_NAME"

# PR説明テンプレートを生成
PR_BODY=$(cat <<EOF
# $FEATURE_NAME

## 概要
$FEATURE_NAME の実装を行いました。

## 変更内容
- [ ] 新機能追加
- [ ] バグ修正
- [ ] リファクタリング
- [ ] ドキュメント更新

## 実装詳細
- 変更内容の詳細を記述

## テスト
- [ ] ユニットテスト追加
- [ ] 統合テスト実行
- [ ] 手動テスト実施

## 影響範囲
- 影響を受ける機能やコンポーネントを記述

## 関連チケット
Closes #$TICKET_NUMBER

## スクリーンショット（該当する場合）
<!-- 画面変更がある場合はスクリーンショットを添付 -->

## チェックリスト
- [ ] コードレビューを受けた
- [ ] テストが通る
- [ ] ドキュメントを更新した
- [ ] 破壊的変更がない
EOF
)

# 一時ファイルにPR説明を保存
TEMP_PR_BODY=$(mktemp)
echo "$PR_BODY" > "$TEMP_PR_BODY"

# GitHub CLIでPR作成
echo -e "${YELLOW}GitHub CLIでPRを作成中...${NC}"

if command -v gh &> /dev/null; then
    gh pr create \
        --title "$PR_TITLE" \
        --body-file "$TEMP_PR_BODY" \
        --base refactor \
        --head "$CURRENT_BRANCH" \
        --assignee @me \
        --label "enhancement"
    
    echo -e "${GREEN}✅ PR作成完了！${NC}"
    echo -e "${BLUE}PR URL: $(gh pr view --json url --jq '.url')${NC}"
else
    echo -e "${YELLOW}GitHub CLIが見つかりません。手動でPRを作成してください:${NC}"
    echo -e "${BLUE}URL: https://github.com/konchangakita/blog-loghoi/pull/new/$CURRENT_BRANCH${NC}"
    echo ""
    echo "PRタイトル: $PR_TITLE"
    echo "PR説明:"
    cat "$TEMP_PR_BODY"
fi

# 一時ファイルを削除
rm "$TEMP_PR_BODY"

echo ""
echo -e "${GREEN}=== PR作成完了 ===${NC}"
echo -e "${YELLOW}次のステップ:${NC}"
echo "1. PRの説明を確認・編集"
echo "2. レビューアを追加"
echo "3. 適切なラベルを設定"
echo "4. レビューを待つ"
