#!/bin/bash
set -e

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 設定
KUBECONFIG_PATH="${KUBECONFIG:-/home/nutanix/nkp/kon-hoihoi.conf}"
NAMESPACE="loghoihoi"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}   Log Hoihoi Kubernetes Deployment  ${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "Kubeconfig: ${YELLOW}${KUBECONFIG_PATH}${NC}"
echo -e "Namespace: ${YELLOW}${NAMESPACE}${NC}"
echo ""

# kubeconfigの確認
if [ ! -f "${KUBECONFIG_PATH}" ]; then
    echo -e "${RED}Error: Kubeconfig not found at ${KUBECONFIG_PATH}${NC}"
    exit 1
fi

# kubectlのエイリアス
K="kubectl --kubeconfig=${KUBECONFIG_PATH}"

# クラスタ接続確認
echo -e "${BLUE}Checking cluster connection...${NC}"
${K} cluster-info || {
    echo -e "${RED}Failed to connect to cluster${NC}"
    exit 1
}
echo -e "${GREEN}✓ Cluster connection OK${NC}"
echo ""

# Namespace確認
echo -e "${BLUE}Checking namespace...${NC}"
if ${K} get namespace ${NAMESPACE} &>/dev/null; then
    echo -e "${GREEN}✓ Namespace '${NAMESPACE}' exists${NC}"
else
    echo -e "${YELLOW}Creating namespace '${NAMESPACE}'...${NC}"
    ${K} create namespace ${NAMESPACE}
    echo -e "${GREEN}✓ Namespace created${NC}"
fi
echo ""

# SSH鍵管理
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}   SSH Key Management${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

SSH_KEY_DIR="$(cd "$(dirname "$0")/.." && pwd)/config/.ssh"
SSH_PRIVATE_KEY="${SSH_KEY_DIR}/loghoi-key"
SSH_PUBLIC_KEY="${SSH_KEY_DIR}/loghoi-key.pub"

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
    ssh-keygen -t rsa -b 4096 \
        -f "${SSH_PRIVATE_KEY}" \
        -N "" \
        -C "loghoi@kubernetes" \
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
    echo ""
    echo -e "${RED}🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨${NC}"
    echo -e "${RED}🚨                                        🚨${NC}"
    echo -e "${RED}🚨  新しいSSH公開鍵が生成されました！    🚨${NC}"
    echo -e "${RED}🚨                                        🚨${NC}"
    echo -e "${RED}🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨${NC}"
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
    read -p "公開鍵の登録は完了しましたか？ (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}デプロイを中断します。公開鍵を登録してから再実行してください。${NC}"
        exit 1
    fi
else
    echo -e "${BLUE}ℹ️  既存のSSH鍵を使用します${NC}"
    echo -e "   公開鍵をNutanix Prismに登録してください"
fi

# Kubernetes Secret の作成または確認
echo -e "${YELLOW}[2/7] Creating or checking Secret...${NC}"
if ${K} get secret loghoi-secrets -n ${NAMESPACE} &>/dev/null; then
    echo -e "${GREEN}✓ Secret 'loghoi-secrets' already exists${NC}"
else
    echo -e "${YELLOW}Creating Secret from SSH keys...${NC}"
    ${K} create secret generic loghoi-secrets \
        --namespace=${NAMESPACE} \
        --from-file=SSH_PRIVATE_KEY="${SSH_PRIVATE_KEY}" \
        --from-file=SSH_PUBLIC_KEY="${SSH_PUBLIC_KEY}"
    echo -e "${GREEN}✓ Secret 'loghoi-secrets' created${NC}"
fi
echo ""

# デプロイ順序
echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}   Deploying Resources${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# 1. ConfigMap
echo -e "${YELLOW}[1/7] Deploying ConfigMap...${NC}"
${K} apply -f configmap.yaml
echo -e "${GREEN}✓ ConfigMap deployed${NC}"
echo ""

# 3. Elasticsearch PVC
echo -e "${YELLOW}[3/7] Deploying Elasticsearch PVC...${NC}"
${K} apply -f elasticsearch-pvc.yaml
echo -e "${GREEN}✓ Elasticsearch PVC deployed${NC}"
echo ""

# 4. Elasticsearch
echo -e "${YELLOW}[4/7] Deploying Elasticsearch...${NC}"
${K} apply -f elasticsearch-deployment.yaml
echo -e "${GREEN}✓ Elasticsearch deployed${NC}"
echo ""

# 5. Services
echo -e "${YELLOW}[5/7] Deploying Services...${NC}"
${K} apply -f services.yaml
echo -e "${GREEN}✓ Services deployed${NC}"
echo ""

# 6. Backend & Frontend
echo -e "${YELLOW}[6/7] Deploying Backend and Frontend...${NC}"
${K} apply -f backend-deployment.yaml
${K} apply -f frontend-deployment.yaml
echo -e "${GREEN}✓ Backend and Frontend deployed${NC}"
echo ""

# 7. Ingress
echo -e "${YELLOW}[7/7] Deploying Ingress...${NC}"
${K} apply -f ingress.yaml
echo -e "${GREEN}✓ Ingress deployed${NC}"
echo ""

# デプロイ状態確認
echo -e "${BLUE}Deployment Status:${NC}"
echo ""
${K} get pods -n ${NAMESPACE} -l app=loghoi
echo ""
${K} get svc -n ${NAMESPACE}
echo ""
${K} get ingress -n ${NAMESPACE}
echo ""

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}   Deployment Completed!             ${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Wait for all pods to be ready:"
echo -e "   ${BLUE}kubectl --kubeconfig=${KUBECONFIG_PATH} get pods -n ${NAMESPACE} -w${NC}"
echo ""
echo -e "2. Check Ingress IP:"
echo -e "   ${BLUE}kubectl --kubeconfig=${KUBECONFIG_PATH} get ingress -n ${NAMESPACE}${NC}"
echo ""
echo -e "3. Access the application:"
echo -e "   ${BLUE}http://<INGRESS_IP>${NC}"
echo ""



