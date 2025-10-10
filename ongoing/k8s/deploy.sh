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
NAMESPACE="loghoi"

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

# デプロイ順序
echo -e "${BLUE}Deploying resources...${NC}"
echo ""

# 1. ConfigMap
echo -e "${YELLOW}[1/7] Deploying ConfigMap...${NC}"
${K} apply -f configmap.yaml
echo -e "${GREEN}✓ ConfigMap deployed${NC}"
echo ""

# 2. Secret (事前に作成済みか確認)
echo -e "${YELLOW}[2/7] Checking Secret...${NC}"
if ${K} get secret loghoi-secrets -n ${NAMESPACE} &>/dev/null; then
    echo -e "${GREEN}✓ Secret 'loghoi-secrets' exists${NC}"
else
    echo -e "${RED}Error: Secret 'loghoi-secrets' not found${NC}"
    echo -e "${YELLOW}Please create the secret first:${NC}"
    echo -e "  kubectl --kubeconfig=${KUBECONFIG_PATH} create secret generic loghoi-secrets \\"
    echo -e "    --namespace=${NAMESPACE} \\"
    echo -e "    --from-file=SSH_PRIVATE_KEY=/path/to/ssh/key"
    exit 1
fi
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



