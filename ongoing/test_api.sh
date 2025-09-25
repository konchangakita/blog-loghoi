#!/bin/bash

# APIテストスクリプト
# 使用方法: ./test_api.sh [prism_ip] [prism_user] [prism_pass]

API_BASE_URL="http://localhost:7776"
PRISM_IP=${1:-"192.168.1.100"}
PRISM_USER=${2:-"admin"}
PRISM_PASS=${3:-"password"}

echo "=== LogHoi API テスト ==="
echo "API Base URL: $API_BASE_URL"
echo "Prism IP: $PRISM_IP"
echo "Prism User: $PRISM_USER"
echo ""

# 1. APIサーバーのヘルスチェック
echo "1. APIサーバーのヘルスチェック..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" "$API_BASE_URL/"
echo ""

# 2. PC登録APIのテスト
echo "2. PC登録APIのテスト..."
curl -X POST "$API_BASE_URL/api/regist" \
  -H "Content-Type: application/json" \
  -d "{
    \"prism_ip\": \"$PRISM_IP\",
    \"prism_user\": \"$PRISM_USER\",
    \"prism_pass\": \"$PRISM_PASS\"
  }" | jq .
echo ""

# 3. PC一覧取得APIのテスト
echo "3. PC一覧取得APIのテスト..."
curl -X GET "$API_BASE_URL/api/pclist" | jq .
echo ""

# 4. APIドキュメントの確認
echo "4. APIドキュメント: $API_BASE_URL/docs"
echo ""

echo "=== テスト完了 ==="


