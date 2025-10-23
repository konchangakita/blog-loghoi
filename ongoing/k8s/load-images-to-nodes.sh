#!/bin/bash
set -e

# カラー出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

KUBECONFIG_PATH="${KUBECONFIG:-/home/nutanix/nkp/kon-hoihoi.conf}"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Load Docker Images to All Nodes    ${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# Dockerイメージをtarに保存
echo -e "${BLUE}Saving Docker images to tar files...${NC}"
docker save loghoi/backend:latest -o /tmp/loghoi-backend.tar
docker save loghoi/frontend:latest -o /tmp/loghoi-frontend.tar
echo -e "${GREEN}✓ Images saved${NC}"
echo ""

# ノード一覧を取得
NODES=$(kubectl --kubeconfig="${KUBECONFIG_PATH}" get nodes -o jsonpath='{range .items[*]}{.status.addresses[?(@.type=="InternalIP")].address}{"\n"}{end}')

echo -e "${BLUE}Loading images to nodes...${NC}"
for node_ip in $NODES; do
    echo -e "${YELLOW}Processing node: ${node_ip}${NC}"
    
    # tarファイルをノードにコピー
    scp -o StrictHostKeyChecking=no /tmp/loghoi-backend.tar nutanix@${node_ip}:/tmp/
    scp -o StrictHostKeyChecking=no /tmp/loghoi-frontend.tar nutanix@${node_ip}:/tmp/
    
    # ノード上でイメージをロード
    ssh -o StrictHostKeyChecking=no nutanix@${node_ip} "sudo ctr -n k8s.io images import /tmp/loghoi-backend.tar"
    ssh -o StrictHostKeyChecking=no nutanix@${node_ip} "sudo ctr -n k8s.io images import /tmp/loghoi-frontend.tar"
    
    # 一時ファイルを削除
    ssh -o StrictHostKeyChecking=no nutanix@${node_ip} "rm -f /tmp/loghoi-backend.tar /tmp/loghoi-frontend.tar"
    
    echo -e "${GREEN}✓ Node ${node_ip} completed${NC}"
    echo ""
done

# ローカルのtarファイルを削除
rm -f /tmp/loghoi-backend.tar /tmp/loghoi-frontend.tar

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  All nodes updated successfully!    ${NC}"
echo -e "${GREEN}======================================${NC}"



