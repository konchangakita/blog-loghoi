#!/bin/bash
set -e

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 設定
SSH_KEY_DIR="/home/nutanix/konchangakita/blog-loghoi/ongoing/config/.ssh"
SSH_PRIVATE_KEY="${SSH_KEY_DIR}/loghoi-key"
SSH_PUBLIC_KEY="${SSH_KEY_DIR}/loghoi-key.pub"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}   SSH Key Initialization${NC}"
echo -e "${GREEN}   (docker-compose environment)${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# SSH鍵ディレクトリの作成
if [ ! -d "${SSH_KEY_DIR}" ]; then
    echo -e "${YELLOW}Creating SSH key directory...${NC}"
    mkdir -p "${SSH_KEY_DIR}"
    chmod 700 "${SSH_KEY_DIR}"
    echo -e "${GREEN}✓ Directory created: ${SSH_KEY_DIR}${NC}"
else
    chmod 700 "${SSH_KEY_DIR}"
fi

# SSH鍵の生成または確認
if [ -f "${SSH_PRIVATE_KEY}" ] && [ -f "${SSH_PUBLIC_KEY}" ]; then
    echo -e "${GREEN}✓ Existing SSH key pair found${NC}"
    echo -e "  Private key: ${BLUE}${SSH_PRIVATE_KEY}${NC}"
    echo -e "  Public key: ${BLUE}${SSH_PUBLIC_KEY}${NC}"
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
echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}📋 SSH公開鍵${NC}"
echo -e "${BLUE}=========================================${NC}"
cat "${SSH_PUBLIC_KEY}"
echo -e "${BLUE}=========================================${NC}"
echo ""

if [ "$KEYS_GENERATED" = true ]; then
    echo -e "${YELLOW}🔑 新しいSSH鍵が生成されました${NC}"
    echo ""
    echo -e "${RED}⚠️  必須作業: Nutanix Prismへの公開鍵登録${NC}"
    echo -e "   ${YELLOW}1.${NC} Prism Element > Settings > Cluster Lockdown"
    echo -e "   ${YELLOW}2.${NC} 「Add Public Key」をクリック"
    echo -e "   ${YELLOW}3.${NC} 上記の公開鍵を貼り付けて保存"
    echo ""
    echo -e "${BLUE}💡 ヒント:${NC}"
    echo -e "   - アプリUI起動後、「Open SSH KEY」ボタンからも確認可能"
    echo -e "   - クリックでクリップボードにコピーされます"
    echo ""
else
    echo -e "${BLUE}ℹ️  既存のSSH鍵を使用します${NC}"
    echo -e "   公開鍵がNutanix Prismに登録済みか確認してください"
    echo ""
fi

echo -e "${GREEN}✓ SSH keys ready for docker-compose${NC}"
echo ""

