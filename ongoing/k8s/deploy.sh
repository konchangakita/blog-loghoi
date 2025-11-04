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
echo -e "${YELLOW}[1/12] Deploying ConfigMap...${NC}"
${K} apply -f configmap.yaml
echo -e "${GREEN}✓ ConfigMap deployed${NC}"
echo ""

# 2. Nginx ConfigMap
echo -e "${YELLOW}[2/12] Deploying Nginx ConfigMap...${NC}"
${K} apply -f nginx-config.yaml
echo -e "${GREEN}✓ Nginx ConfigMap deployed${NC}"
echo ""

# 3. Ingress Controller確認とインストール
echo -e "${YELLOW}[3/12] Checking Ingress Controller...${NC}"

# Traefik検出用変数
TRAEFIK_IC_EXISTS=false
TRAEFIK_POD_EXISTS=false
OTHER_IC_EXISTS=false
TRAEFIK_NAMESPACE="kommander"

# IngressClass確認
if ${K} get ingressclass kommander-traefik &>/dev/null; then
    TRAEFIK_IC_EXISTS=true
    echo -e "${GREEN}✓ IngressClass 'kommander-traefik' already exists${NC}"
fi

# Traefik Pod確認（kommanderネームスペース）
if ${K} get pods -n ${TRAEFIK_NAMESPACE} -l app.kubernetes.io/name=traefik &>/dev/null 2>&1; then
    POD_COUNT=$(${K} get pods -n ${TRAEFIK_NAMESPACE} -l app.kubernetes.io/name=traefik --no-headers 2>/dev/null | wc -l)
    if [ "$POD_COUNT" -gt 0 ]; then
        TRAEFIK_POD_EXISTS=true
        echo -e "${GREEN}✓ Traefik is already installed in '${TRAEFIK_NAMESPACE}' namespace${NC}"
    fi
fi

# 他のIngress Controller検出
OTHER_IC_LIST=$(${K} get ingressclass -o jsonpath='{.items[*].metadata.name}' 2>/dev/null | grep -v "^kommander-traefik$" || true)
if [ -n "${OTHER_IC_LIST}" ]; then
    OTHER_IC_EXISTS=true
    echo -e "${YELLOW}⚠ Other Ingress Controllers detected: ${OTHER_IC_LIST}${NC}"
fi

# 分岐処理
if [ "$TRAEFIK_IC_EXISTS" = true ] || [ "$TRAEFIK_POD_EXISTS" = true ]; then
    echo -e "${BLUE}ℹ️  Traefik is already installed. Skipping installation.${NC}"
elif [ "$OTHER_IC_EXISTS" = true ]; then
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⚠️  Another Ingress Controller is already installed.${NC}"
    echo -e "${YELLOW}    Detected IngressClasses: ${OTHER_IC_LIST}${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}This script will install Traefik (kommander-traefik).${NC}"
    echo -e "${BLUE}The existing Ingress Controller will not be affected.${NC}"
    echo ""
    read -p "Continue with Traefik installation? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Traefik installation skipped by user.${NC}"
        echo -e "${YELLOW}⚠️  Note: Ingress resources may not work without Traefik.${NC}"
    else
        # Traefikインストール処理
        echo -e "${BLUE}Installing Traefik...${NC}"
        
        # Helm確認
        if ! command -v helm &> /dev/null; then
            echo -e "${RED}Error: Helm is not installed.${NC}"
            echo -e "${YELLOW}Please install Helm first:${NC}"
            echo -e "${BLUE}  curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash${NC}"
            echo -e "${YELLOW}Or use kubectl apply with YAML manifests.${NC}"
            exit 1
        fi
        
        # Helmリポジトリ追加
        if ! helm repo list | grep -q traefik; then
            echo -e "${BLUE}Adding Traefik Helm repository...${NC}"
            helm repo add traefik https://traefik.github.io/charts
            helm repo update
        fi
        
        # kommanderネームスペース作成
        if ! ${K} get namespace ${TRAEFIK_NAMESPACE} &>/dev/null; then
            echo -e "${BLUE}Creating namespace '${TRAEFIK_NAMESPACE}'...${NC}"
            ${K} create namespace ${TRAEFIK_NAMESPACE}
        fi
        
        # Traefikインストール
        if helm list -n ${TRAEFIK_NAMESPACE} | grep -q traefik; then
            echo -e "${GREEN}✓ Traefik Helm release already exists${NC}"
        else
            echo -e "${BLUE}Installing Traefik using Helm...${NC}"
            if [ -f "traefik-values.yaml" ]; then
                helm install traefik traefik/traefik \
                    -f traefik-values.yaml \
                    -n ${TRAEFIK_NAMESPACE} \
                    --wait \
                    --timeout 5m
            else
                echo -e "${YELLOW}⚠ traefik-values.yaml not found. Using default values.${NC}"
                helm install traefik traefik/traefik \
                    --set ingressClass.enabled=true \
                    --set ingressClass.isDefaultClass=true \
                    --set ingressClass.name=kommander-traefik \
                    -n ${TRAEFIK_NAMESPACE} \
                    --create-namespace \
                    --wait \
                    --timeout 5m
            fi
            echo -e "${GREEN}✓ Traefik installed${NC}"
        fi
        
        # インストール確認
        echo -e "${BLUE}Waiting for Traefik to be ready...${NC}"
        ${K} wait --for=condition=ready pod \
            -l app.kubernetes.io/name=traefik \
            -n ${TRAEFIK_NAMESPACE} \
            --timeout=300s || {
            echo -e "${YELLOW}⚠ Traefik pods may not be ready yet. Please check manually.${NC}"
        }
        
        # IngressClass確認
        if ${K} get ingressclass kommander-traefik &>/dev/null; then
            echo -e "${GREEN}✓ IngressClass 'kommander-traefik' confirmed${NC}"
        else
            echo -e "${YELLOW}⚠ IngressClass 'kommander-traefik' not found. Creating...${NC}"
            cat <<EOF | ${K} apply -f -
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: kommander-traefik
spec:
  controller: traefik.io/ingress-controller
EOF
        fi
    fi
else
    # Traefikが未検出の場合、自動インストール
    echo -e "${BLUE}No Ingress Controller detected. Installing Traefik...${NC}"
    
    # Helm確認
    if ! command -v helm &> /dev/null; then
        echo -e "${RED}Error: Helm is not installed.${NC}"
        echo -e "${YELLOW}Please install Helm first:${NC}"
        echo -e "${BLUE}  curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash${NC}"
        exit 1
    fi
    
    # Helmリポジトリ追加
    if ! helm repo list | grep -q traefik; then
        echo -e "${BLUE}Adding Traefik Helm repository...${NC}"
        helm repo add traefik https://traefik.github.io/charts
        helm repo update
    fi
    
    # kommanderネームスペース作成
    if ! ${K} get namespace ${TRAEFIK_NAMESPACE} &>/dev/null; then
        echo -e "${BLUE}Creating namespace '${TRAEFIK_NAMESPACE}'...${NC}"
        ${K} create namespace ${TRAEFIK_NAMESPACE}
    fi
    
    # Traefikインストール
    if helm list -n ${TRAEFIK_NAMESPACE} | grep -q traefik; then
        echo -e "${GREEN}✓ Traefik Helm release already exists${NC}"
    else
        echo -e "${BLUE}Installing Traefik using Helm...${NC}"
        if [ -f "traefik-values.yaml" ]; then
            helm install traefik traefik/traefik \
                -f traefik-values.yaml \
                -n ${TRAEFIK_NAMESPACE} \
                --wait \
                --timeout 5m
        else
            echo -e "${YELLOW}⚠ traefik-values.yaml not found. Using default values.${NC}"
            helm install traefik traefik/traefik \
                --set ingressClass.enabled=true \
                --set ingressClass.isDefaultClass=true \
                --set ingressClass.name=kommander-traefik \
                -n ${TRAEFIK_NAMESPACE} \
                --create-namespace \
                --wait \
                --timeout 5m
        fi
        echo -e "${GREEN}✓ Traefik installed${NC}"
    fi
    
    # インストール確認
    echo -e "${BLUE}Waiting for Traefik to be ready...${NC}"
    ${K} wait --for=condition=ready pod \
        -l app.kubernetes.io/name=traefik \
        -n ${TRAEFIK_NAMESPACE} \
        --timeout=300s || {
        echo -e "${YELLOW}⚠ Traefik pods may not be ready yet. Please check manually.${NC}"
    }
    
    # IngressClass確認
    if ${K} get ingressclass kommander-traefik &>/dev/null; then
        echo -e "${GREEN}✓ IngressClass 'kommander-traefik' confirmed${NC}"
    else
        echo -e "${YELLOW}⚠ IngressClass 'kommander-traefik' not found. Creating...${NC}"
        cat <<EOF | ${K} apply -f -
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: kommander-traefik
spec:
  controller: traefik.io/ingress-controller
EOF
    fi
fi
echo ""

# 4. StorageClass別のPV/PVC作成
echo -e "${YELLOW}[4/12] Deploying Persistent Volumes...${NC}"

if [ "$STORAGE_CLASS" = "manual" ]; then
    # HostPath用のPV作成
    echo -e "${BLUE}  Using HostPath (manual StorageClass)${NC}"
    
    # ワーカーノード（control-plane以外）を優先して自動選択
    WORKER_NODE_NAME=$(${K} get nodes -l '!node-role.kubernetes.io/control-plane' -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
    if [ -n "${WORKER_NODE_NAME}" ]; then
        NODE_NAME="${WORKER_NODE_NAME}"
        echo -e "${BLUE}  Selected worker node: ${NODE_NAME}${NC}"
    else
        # フォールバック: 先頭ノード（単一ノードクラスタ等）
        NODE_NAME=$(${K} get nodes -o jsonpath='{.items[0].metadata.name}')
        echo -e "${YELLOW}  No worker-only node found. Fallback to: ${NODE_NAME}${NC}"
    fi
    
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

# 4. PVのclaimRefクリア（ネームスペース再作成時の対策）
if [ "$STORAGE_CLASS" = "manual" ]; then
    echo -e "${BLUE}Checking PV claimRef status...${NC}"
    
    # 古いclaimRefをクリア（エラーが発生しても続行）
    kubectl --kubeconfig=${KUBECONFIG_PATH} patch pv elasticsearch-data-pv -p '{"spec":{"claimRef":null}}' 2>/dev/null || echo -e "${YELLOW}  ⚠ elasticsearch-data-pv not found or already cleared${NC}"
    kubectl --kubeconfig=${KUBECONFIG_PATH} patch pv backend-output-pv -p '{"spec":{"claimRef":null}}' 2>/dev/null || echo -e "${YELLOW}  ⚠ backend-output-pv not found or already cleared${NC}"
    
    echo -e "${GREEN}✓ PV claimRef cleared${NC}"
    echo ""
fi

# 5. PVC作成（動的生成）
echo -e "${YELLOW}[5/12] Deploying Persistent Volume Claims...${NC}"
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

# 6. Elasticsearch
echo -e "${YELLOW}[6/12] Deploying Elasticsearch...${NC}"
${K} apply -f elasticsearch-deployment.yaml
echo -e "${GREEN}✓ Elasticsearch deployed${NC}"
echo ""

# 7. Services
echo -e "${YELLOW}[7/12] Deploying Services...${NC}"
${K} apply -f services.yaml
echo -e "${GREEN}✓ Services deployed${NC}"
echo ""

# 8. Backend & Frontend
echo -e "${YELLOW}[8/12] Deploying Backend and Frontend...${NC}"
${K} apply -f backend-deployment.yaml
${K} apply -f frontend-deployment.yaml
echo -e "${GREEN}✓ Backend and Frontend deployed${NC}"
echo ""

# 9. Ingress
echo -e "${YELLOW}[9/12] Deploying Ingress...${NC}"
${K} apply -f ingress.yaml
echo -e "${GREEN}✓ Ingress deployed${NC}"
echo ""

# 10. Kibana (Optional)
echo -e "${YELLOW}[10/12] Deploying Kibana (Optional)...${NC}"
if [ -f "kibana-deployment.yaml" ]; then
    ${K} apply -f kibana-deployment.yaml
    echo -e "${GREEN}✓ Kibana deployed${NC}"
else
    echo -e "${YELLOW}⚠ Kibana deployment skipped (file not found)${NC}"
fi
echo ""

# 11. Syslog (Optional)
echo -e "${YELLOW}[11/12] Deploying Syslog (Optional)...${NC}"
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
echo -e "${YELLOW}======================================${NC}"
echo -e "${YELLOW}   Next Steps                         ${NC}"
echo -e "${YELLOW}======================================${NC}"
echo ""
echo -e "${GREEN}1. Wait for all pods to be ready:${NC}"
echo -e "   ${BLUE}kubectl --kubeconfig=${KUBECONFIG_PATH} get pods -n ${NAMESPACE} -w${NC}"
echo ""
echo -e "${GREEN}2. Check Ingress IP:${NC}"
echo -e "   ${BLUE}kubectl --kubeconfig=${KUBECONFIG_PATH} get ingress -n ${NAMESPACE}${NC}"
echo -e "   ${YELLOW}Access URL: http://<INGRESS_IP>${NC}"
echo ""
echo -e "${GREEN}3. Check Syslog Service EXTERNAL-IP:${NC}"
echo -e "   ${BLUE}kubectl --kubeconfig=${KUBECONFIG_PATH} get svc loghoi-syslog-service -n ${NAMESPACE}${NC}"
echo -e "   ${YELLOW}Syslog送信先: EXTERNAL-IP:7515${NC}"
echo ""
echo ""

# SSH公開鍵の表示（最後に表示）
echo -e "${GREEN}4. SSH公開鍵:${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
cat "${SSH_PUBLIC_KEY}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📝 トラブルシューティング用コマンド${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
# Ingress IPを取得
INGRESS_IP=$(${K} get ingress -n ${NAMESPACE} -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
if [ -n "${INGRESS_IP}" ]; then
    echo -e "${YELLOW}# Kibana接続URL:${NC}"
    echo -e "   ${YELLOW}アクセス: http://${INGRESS_IP}/kibana${NC}"
    echo ""
    echo -e "${YELLOW}# Backend API一覧 (Swagger UI):${NC}"
    echo -e "   ${YELLOW}アクセス: http://${INGRESS_IP}/docs${NC}"
    echo ""
    echo -e "${YELLOW}# Backend API一覧 (ReDoc):${NC}"
    echo -e "   ${YELLOW}アクセス: http://${INGRESS_IP}/redoc${NC}"
    echo ""
else
    echo -e "${YELLOW}# Kibana接続URL (Ingress IP取得後):${NC}"
    echo -e "   ${YELLOW}アクセス: http://<INGRESS_IP>/kibana${NC}"
    echo ""
    echo -e "${YELLOW}# Backend API一覧 (Swagger UI):${NC}"
    echo -e "   ${YELLOW}アクセス: http://<INGRESS_IP>/docs${NC}"
    echo ""
    echo -e "${YELLOW}# Backend API一覧 (ReDoc):${NC}"
    echo -e "   ${YELLOW}アクセス: http://<INGRESS_IP>/redoc${NC}"
    echo ""
fi
echo -e "${YELLOW}# Backend接続URL (port-forward):${NC}"
echo -e "   ${BLUE}kubectl --kubeconfig=${KUBECONFIG_PATH} port-forward -n ${NAMESPACE} svc/loghoi-backend-service 7776:7776${NC}"
echo -e "   ${YELLOW}アクセス: http://localhost:7776${NC}"
echo ""
echo -e "${YELLOW}# PVC status:${NC}"
echo -e "   ${BLUE}kubectl --kubeconfig=${KUBECONFIG_PATH} get pvc -n ${NAMESPACE}${NC}"
echo ""
echo -e "${YELLOW}# Traefik Service LoadBalancer IP (if installed):${NC}"
echo -e "   ${BLUE}kubectl --kubeconfig=${KUBECONFIG_PATH} get svc -n ${TRAEFIK_NAMESPACE} traefik${NC}"
echo ""

