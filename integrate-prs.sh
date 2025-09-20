#!/bin/bash

# 複数のプルリクエストを統合するスクリプト
# 使用方法: ./integrate-prs.sh [PR番号1] [PR番号2] ... [PR番号N]

if [ $# -eq 0 ]; then
    echo "使用方法: $0 [PR番号1] [PR番号2] ... [PR番号N]"
    echo "例: $0 1 2 3"
    exit 1
fi

INTEGRATION_BRANCH="integration-$(date +%Y%m%d-%H%M%S)"

echo "統合ブランチ '$INTEGRATION_BRANCH' を作成します..."

# 最新のmainブランチから新しいブランチを作成
git checkout main
git pull origin main
git checkout -b $INTEGRATION_BRANCH

echo "統合ブランチ '$INTEGRATION_BRANCH' が作成されました"

# 各プルリクエストを順次マージ
for pr_number in "$@"; do
    echo ""
    echo "プルリクエスト #$pr_number をマージ中..."
    
    # プルリクエストをマージ
    git pull origin pull/$pr_number/head
    
    if [ $? -eq 0 ]; then
        echo "✓ プルリクエスト #$pr_number のマージが完了しました"
    else
        echo "✗ プルリクエスト #$pr_number のマージに失敗しました"
        echo "コンフリクトが発生している可能性があります。手動で解決してください。"
        echo "現在のブランチ: $INTEGRATION_BRANCH"
        exit 1
    fi
done

echo ""
echo "=== 統合完了 ==="
echo "統合ブランチ: $INTEGRATION_BRANCH"
echo "マージされたプルリクエスト: $@"
echo ""
echo "=== 最近のコミット ==="
git log --oneline -10

echo ""
echo "統合ブランチをリモートにプッシュするには:"
echo "git push origin $INTEGRATION_BRANCH"

