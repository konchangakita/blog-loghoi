#!/bin/bash
set -e

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 設定
REGISTRY="${DOCKER_REGISTRY:-ghcr.io}"
NAMESPACE="${DOCKER_NAMESPACE:-konchangakita}"
VERSION="${VERSION:-v1.1.0}"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Log Hoihoi Docker Image Build & Push${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "Registry: ${YELLOW}${REGISTRY}${NC}"
echo -e "Namespace: ${YELLOW}${NAMESPACE}${NC}"
echo -e "Version: ${YELLOW}${VERSION}${NC}"
echo ""

# ベースディレクトリ（ongoing/）
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# バックエンドイメージのビルド（ビルドコンテキストをongoing/に変更）
echo -e "${GREEN}Building backend image...${NC}"
cd "${BASE_DIR}"
docker build -t ${REGISTRY}/${NAMESPACE}/loghoi-backend:${VERSION} \
             -t ${REGISTRY}/${NAMESPACE}/loghoi-backend:latest \
             -f backend/Dockerfile.k8s \
             .

# フロントエンドイメージのビルド
echo -e "${GREEN}Building frontend image...${NC}"
docker build -t ${REGISTRY}/${NAMESPACE}/loghoi-frontend:${VERSION} \
             -t ${REGISTRY}/${NAMESPACE}/loghoi-frontend:latest \
             -f frontend/next-app/loghoi/Dockerfile.k8s \
             frontend/next-app/loghoi

# Syslogイメージのビルド
echo -e "${GREEN}Building syslog image...${NC}"
docker build -t ${REGISTRY}/${NAMESPACE}/loghoi-syslog:${VERSION} \
             -t ${REGISTRY}/${NAMESPACE}/loghoi-syslog:latest \
             -f syslog/Dockerfile.k8s \
             syslog

# イメージのプッシュ
if [ "${PUSH_IMAGES}" = "true" ]; then
    echo -e "${GREEN}Pushing images to registry...${NC}"
    docker push ${REGISTRY}/${NAMESPACE}/loghoi-backend:${VERSION}
    docker push ${REGISTRY}/${NAMESPACE}/loghoi-backend:latest
    docker push ${REGISTRY}/${NAMESPACE}/loghoi-frontend:${VERSION}
    docker push ${REGISTRY}/${NAMESPACE}/loghoi-frontend:latest
    docker push ${REGISTRY}/${NAMESPACE}/loghoi-syslog:${VERSION}
    docker push ${REGISTRY}/${NAMESPACE}/loghoi-syslog:latest
    echo -e "${GREEN}Images pushed successfully!${NC}"
else
    echo -e "${YELLOW}Skipping push (set PUSH_IMAGES=true to push)${NC}"
fi

echo ""
echo -e "${GREEN}Build completed!${NC}"
echo ""
echo -e "Backend image:  ${YELLOW}${REGISTRY}/${NAMESPACE}/loghoi-backend:${VERSION}${NC}"
echo -e "Frontend image: ${YELLOW}${REGISTRY}/${NAMESPACE}/loghoi-frontend:${VERSION}${NC}"
echo -e "Syslog image:   ${YELLOW}${REGISTRY}/${NAMESPACE}/loghoi-syslog:${VERSION}${NC}"

