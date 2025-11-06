#!/bin/bash
# docker-compose環境でホストIPアドレスを取得するスクリプト

# 方法1: デフォルトゲートウェイから取得（最も確実）
HOST_IP=$(ip route show default | awk '/default/ {print $3}' 2>/dev/null | head -1)

# 方法2: フォールバック - hostname -Iから取得（最初のIPのみ）
if [ -z "$HOST_IP" ]; then
    HOST_IP=$(hostname -I | awk '{print $1}' 2>/dev/null)
fi

# 方法3: フォールバック - docker network inspectから取得
if [ -z "$HOST_IP" ]; then
    HOST_IP=$(docker network inspect bridge 2>/dev/null | grep -A 5 '"Gateway"' | grep -oP '"Gateway":\s*"\K[^"]+' | head -1)
fi

# 結果を出力（最初のIPのみ）
if [ -n "$HOST_IP" ]; then
    echo "$HOST_IP" | head -1
    exit 0
else
    echo "Unable to detect host IP address" >&2
    exit 1
fi

