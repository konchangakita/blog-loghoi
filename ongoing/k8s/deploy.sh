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
STORAGE_CLASS="${STORAGE_CLASS:-manual}"  # デフォルトは manual (HostPath)

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}   Log Hoihoi Kubernetes Deployment  ${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "Kubeconfig: ${YELLOW}${KUBECONFIG_PATH}${NC}"
echo -e "Namespace: ${YELLOW}${NAMESPACE}${NC}"
echo -e "StorageClass: ${YELLOW}${STORAGE_CLASS}${NC}"
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

# SSH鍵ファイルの読み取り権限チェック
echo ""
echo -e "${BLUE}Checking SSH key permissions...${NC}"
CURRENT_USER=$(whoami)

# 秘密鍵の読み取りテスト
if ! cat "${SSH_PRIVATE_KEY}" >/dev/null 2>&1; then
    echo -e "${RED}⚠️  警告: SSH秘密鍵を読み取れません${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}問題: 現在のユーザー (${CURRENT_USER}) が秘密鍵を読み取れません${NC}"
    echo -e ""
    echo -e "${YELLOW}ファイル情報:${NC}"
    ls -l "${SSH_PRIVATE_KEY}"
    echo -e ""
    echo -e "${YELLOW}対処方法（以下のいずれかを実行）:${NC}"
    echo -e ""
    echo -e "${GREEN}方法1: ファイル所有者を現在のユーザーに変更${NC}"
    echo -e "  sudo chown ${CURRENT_USER}:${CURRENT_USER} ${SSH_PRIVATE_KEY} ${SSH_PUBLIC_KEY}"
    echo -e ""
    echo -e "${GREEN}方法2: 一時的にsudoで実行${NC}"
    echo -e "  sudo KUBECONFIG=${KUBECONFIG_PATH} ./deploy.sh"
    echo -e ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi

# 公開鍵の読み取りテスト
if ! cat "${SSH_PUBLIC_KEY}" >/dev/null 2>&1; then
    echo -e "${RED}⚠️  警告: SSH公開鍵を読み取れません${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}問題: 現在のユーザー (${CURRENT_USER}) が公開鍵を読み取れません${NC}"
    echo -e ""
    echo -e "${YELLOW}ファイル情報:${NC}"
    ls -l "${SSH_PUBLIC_KEY}"
    echo -e ""
    echo -e "${YELLOW}対処方法:${NC}"
    echo -e "  sudo chown ${CURRENT_USER}:${CURRENT_USER} ${SSH_PRIVATE_KEY} ${SSH_PUBLIC_KEY}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi

echo -e "${GREEN}✓ SSH keys are readable${NC}"
echo ""

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
echo -e "${YELLOW}[1/10] Deploying ConfigMap...${NC}"
${K} apply -f configmap.yaml
echo -e "${GREEN}✓ ConfigMap deployed${NC}"
echo ""

# 2. Nginx ConfigMap
echo -e "${YELLOW}[2/10] Deploying Nginx ConfigMap...${NC}"
${K} apply -f nginx-config.yaml
echo -e "${GREEN}✓ Nginx ConfigMap deployed${NC}"
echo ""

# 3. StorageClass別のPV/PVC作成
echo -e "${YELLOW}[3/10] Deploying Persistent Volumes...${NC}"

if [ "$STORAGE_CLASS" = "manual" ]; then
    # HostPath用のPV作成
    echo -e "${BLUE}  Using HostPath (manual StorageClass)${NC}"
    
    # ノード名を自動取得
    NODE_NAME=$(${K} get nodes -o jsonpath='{.items[0].metadata.name}')
    echo -e "${BLUE}  Selected node: ${NODE_NAME}${NC}"
    
    # PV作成
    cat <<EOF | ${K} apply -f -
apiVersion: v1
kind: PersistentVolume
metadata:
  name: elasticsearch-data-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: manual
  hostPath:
    path: /mnt/loghoi/elasticsearch-data
    type: DirectoryOrCreate
---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: backend-output-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: manual
  hostPath:
    path: /mnt/loghoi/backend-output
    type: DirectoryOrCreate
EOF
    echo -e "${GREEN}✓ HostPath PVs created${NC}"
else
    echo -e "${BLUE}  Using StorageClass: ${STORAGE_CLASS} (Dynamic Provisioning)${NC}"
    echo -e "${BLUE}  PVs will be created automatically${NC}"
fi
echo ""

# 4. PVC作成（動的生成）
echo -e "${YELLOW}[4/10] Deploying Persistent Volume Claims...${NC}"
cat <<EOF | ${K} apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: elasticsearch-data
  namespace: ${NAMESPACE}
  labels:
    app: loghoi
    component: elasticsearch
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ${STORAGE_CLASS}
  resources:
    requests:
      storage: 10Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: loghoi-backend-output
  namespace: ${NAMESPACE}
  labels:
    app: loghoi
    component: backend-storage
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ${STORAGE_CLASS}
  resources:
    requests:
      storage: 10Gi
EOF
echo -e "${GREEN}✓ PVCs deployed${NC}"
echo ""

# 5. Elasticsearch
echo -e "${YELLOW}[5/10] Deploying Elasticsearch...${NC}"
${K} apply -f elasticsearch-deployment.yaml
echo -e "${GREEN}✓ Elasticsearch deployed${NC}"
echo ""

# 6. Services
echo -e "${YELLOW}[6/10] Deploying Services...${NC}"
${K} apply -f services.yaml
echo -e "${GREEN}✓ Services deployed${NC}"
echo ""

# 7. Backend & Frontend
echo -e "${YELLOW}[7/10] Deploying Backend and Frontend...${NC}"
${K} apply -f backend-deployment.yaml
${K} apply -f frontend-deployment.yaml
echo -e "${GREEN}✓ Backend and Frontend deployed${NC}"
echo ""

# 8. Ingress
echo -e "${YELLOW}[8/10] Deploying Ingress...${NC}"
${K} apply -f ingress.yaml
echo -e "${GREEN}✓ Ingress deployed${NC}"
echo ""

# 9. Kibana (Optional)
echo -e "${YELLOW}[9/10] Deploying Kibana (Optional)...${NC}"
if [ -f "kibana-deployment.yaml" ]; then
    ${K} apply -f kibana-deployment.yaml
    echo -e "${GREEN}✓ Kibana deployed${NC}"
else
    echo -e "${YELLOW}⚠ Kibana deployment skipped (file not found)${NC}"
fi
echo ""

# 10. Syslog (Optional)
echo -e "${YELLOW}[10/10] Deploying Syslog (Optional)...${NC}"
if [ -f "syslog-deployment.yaml" ]; then
    ${K} apply -f syslog-deployment.yaml
    echo -e "${GREEN}✓ Syslog deployed${NC}"
else
    echo -e "${YELLOW}⚠ Syslog deployment skipped (file not found)${NC}"
fi
echo ""

# HostPath使用時のnodeSelector設定
if [ "$STORAGE_CLASS" = "manual" ]; then
    echo -e "${YELLOW}[HostPath] Configuring nodeSelector for Pods...${NC}"
    
    # Elasticsearchにnode selectorを追加
    ${K} patch deployment elasticsearch -n ${NAMESPACE} \
        -p '{"spec":{"template":{"spec":{"nodeSelector":{"kubernetes.io/hostname":"'${NODE_NAME}'"}}}}}' \
        2>/dev/null || echo -e "${YELLOW}  ⚠ Elasticsearch nodeSelector patch skipped${NC}"
    
    # BackendにnodeSelectorを追加
    ${K} patch deployment loghoi-backend -n ${NAMESPACE} \
        -p '{"spec":{"template":{"spec":{"nodeSelector":{"kubernetes.io/hostname":"'${NODE_NAME}'"}}}}}' \
        2>/dev/null || echo -e "${YELLOW}  ⚠ Backend nodeSelector patch skipped${NC}"
    
    echo -e "${GREEN}✓ Pods configured to run on node: ${NODE_NAME}${NC}"
    echo ""
fi

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
echo -e "${BLUE}📦 StorageClass: ${YELLOW}${STORAGE_CLASS}${NC}"
if [ "$STORAGE_CLASS" = "manual" ]; then
    echo -e "${BLUE}💾 Storage Type: ${YELLOW}HostPath${NC}"
    echo -e "${BLUE}🖥️  Node: ${YELLOW}${NODE_NAME}${NC}"
    echo -e "${BLUE}📁 Data Paths:${NC}"
    echo -e "   - Elasticsearch: ${YELLOW}/mnt/loghoi/elasticsearch-data${NC}"
    echo -e "   - Backend Output: ${YELLOW}/mnt/loghoi/backend-output${NC}"
else
    echo -e "${BLUE}💾 Storage Type: ${YELLOW}Dynamic Provisioning${NC}"
fi
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Wait for all pods to be ready:"
echo -e "   ${BLUE}kubectl --kubeconfig=${KUBECONFIG_PATH} get pods -n ${NAMESPACE} -w${NC}"
echo ""
echo -e "2. Check PVC status:"
echo -e "   ${BLUE}kubectl --kubeconfig=${KUBECONFIG_PATH} get pvc -n ${NAMESPACE}${NC}"
echo ""
echo -e "3. Check Ingress IP:"
echo -e "   ${BLUE}kubectl --kubeconfig=${KUBECONFIG_PATH} get ingress -n ${NAMESPACE}${NC}"
echo ""
echo -e "4. Access the application:"
echo -e "   ${BLUE}http://<INGRESS_IP>${NC}"
echo ""



