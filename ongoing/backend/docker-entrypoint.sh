#!/bin/bash
set -e

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# SSH鍵の設定
SSH_KEY_DIR="/app/config/.ssh"
SSH_PRIVATE_KEY="${SSH_KEY_DIR}/loghoi-key"
SSH_PUBLIC_KEY="${SSH_KEY_DIR}/loghoi-key.pub"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}   LogHoi Backend Starting...${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# SSH鍵ディレクトリの作成
if [ ! -d "${SSH_KEY_DIR}" ]; then
    echo -e "${YELLOW}Creating SSH key directory...${NC}"
    mkdir -p "${SSH_KEY_DIR}"
    chmod 700 "${SSH_KEY_DIR}"
fi

# SSH鍵の生成または確認
if [ -f "${SSH_PRIVATE_KEY}" ] && [ -f "${SSH_PUBLIC_KEY}" ]; then
    echo -e "${GREEN}✓ Existing SSH key pair found${NC}"
    KEYS_GENERATED=false
else
    echo -e "${YELLOW}Generating new SSH key pair...${NC}"
    ssh-keygen -t rsa -b 3072 \
        -f "${SSH_PRIVATE_KEY}" \
        -N "" \
        -C "loghoi@docker-compose" \
        >/dev/null 2>&1
    
    chmod 600 "${SSH_PRIVATE_KEY}"
    chmod 644 "${SSH_PUBLIC_KEY}"
    echo -e "${GREEN}✓ SSH key pair generated successfully${NC}"
    KEYS_GENERATED=true
fi

# 公開鍵の表示
if [ "$KEYS_GENERATED" = true ]; then
    echo ""
    echo -e "${RED}🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨${NC}"
    echo -e "${RED}🚨                                        🚨${NC}"
    echo -e "${RED}🚨  新しいSSH公開鍵が生成されました！    🚨${NC}"
    echo -e "${RED}🚨                                        🚨${NC}"
    echo -e "${RED}🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨${NC}"
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}📋 SSH公開鍵${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    cat "${SSH_PUBLIC_KEY}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${RED}⚠️⚠️⚠️  必須作業: Nutanix Prismへの公開鍵登録  ⚠️⚠️⚠️${NC}"
    echo ""
    echo -e "${YELLOW}1️⃣ Prism Element > Settings > Cluster Lockdown${NC}"
    echo -e "${YELLOW}2️⃣ 「Add Public Key」をクリック${NC}"
    echo -e "${YELLOW}3️⃣ 上記の公開鍵を貼り付けて保存${NC}"
    echo ""
    echo -e "${GREEN}💡 ヒント:${NC}"
    echo -e "   - アプリUI起動後、右上の「${BLUE}Open SSH KEY${NC}」ボタンからも確認可能"
    echo -e "   - クリックでクリップボードにコピーされます"
    echo ""
fi

echo -e "${GREEN}✓ SSH keys ready${NC}"
echo -e "${BLUE}Starting FastAPI application...${NC}"
echo ""

# 元のコマンドを実行
exec "$@"

