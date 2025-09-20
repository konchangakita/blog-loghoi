#!/bin/bash

# プルリクエスト取り込みスクリプト
# 使用方法: ./merge-pr.sh [PR番号] [ブランチ名（オプション）]

if [ $# -eq 0 ]; then
    echo "使用方法: $0 [PR番号] [ブランチ名（オプション）]"
    echo "例: $0 1 pr-1"
    echo "例: $0 1  # デフォルトで pr-[PR番号] というブランチ名になります"
    exit 1
fi

PR_NUMBER=$1
BRANCH_NAME=${2:-"pr-$PR_NUMBER"}

echo "プルリクエスト #$PR_NUMBER をブランチ '$BRANCH_NAME' に取り込みます..."

# 最新の変更を取得
git fetch origin

# プルリクエストのブランチを取得
echo "プルリクエストブランチを取得中..."
git fetch origin pull/$PR_NUMBER/head:$BRANCH_NAME

if [ $? -eq 0 ]; then
    echo "成功: プルリクエスト #$PR_NUMBER がブランチ '$BRANCH_NAME' に取り込まれました"
    echo "ブランチをチェックアウトするには: git checkout $BRANCH_NAME"
    
    # ブランチをチェックアウト
    git checkout $BRANCH_NAME
    echo "ブランチ '$BRANCH_NAME' にチェックアウトしました"
    
    # ブランチの情報を表示
    echo ""
    echo "=== ブランチ情報 ==="
    git log --oneline -5
else
    echo "エラー: プルリクエスト #$PR_NUMBER の取得に失敗しました"
    exit 1
fi

