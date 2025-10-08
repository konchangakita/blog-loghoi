#!/bin/bash
set -e

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 設定
REGISTRY="${DOCKER_REGISTRY:-docker.io}"
NAMESPACE="${DOCKER_NAMESPACE:-loghoi}"
VERSION="${VERSION:-v1.0.0}"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Log Hoihoi Docker Image Build & Push${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "Registry: ${YELLOW}${REGISTRY}${NC}"
echo -e "Namespace: ${YELLOW}${NAMESPACE}${NC}"
echo -e "Version: ${YELLOW}${VERSION}${NC}"
echo ""

# ベースディレクトリ
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# バックエンドイメージのビルド
echo -e "${GREEN}Building backend image...${NC}"
cd "${BASE_DIR}/backend"
docker build -t ${REGISTRY}/${NAMESPACE}/backend:${VERSION} \
             -t ${REGISTRY}/${NAMESPACE}/backend:latest \
             -f Dockerfile .

# フロントエンドイメージのビルド
echo -e "${GREEN}Building frontend image...${NC}"
cd "${BASE_DIR}/frontend/next-app/loghoi"
docker build -t ${REGISTRY}/${NAMESPACE}/frontend:${VERSION} \
             -t ${REGISTRY}/${NAMESPACE}/frontend:latest \
             -f Dockerfile .

# イメージのプッシュ
if [ "${PUSH_IMAGES}" = "true" ]; then
    echo -e "${GREEN}Pushing images to registry...${NC}"
    docker push ${REGISTRY}/${NAMESPACE}/backend:${VERSION}
    docker push ${REGISTRY}/${NAMESPACE}/backend:latest
    docker push ${REGISTRY}/${NAMESPACE}/frontend:${VERSION}
    docker push ${REGISTRY}/${NAMESPACE}/frontend:latest
    echo -e "${GREEN}Images pushed successfully!${NC}"
else
    echo -e "${YELLOW}Skipping push (set PUSH_IMAGES=true to push)${NC}"
fi

echo ""
echo -e "${GREEN}Build completed!${NC}"
echo ""
echo -e "Backend image:  ${YELLOW}${REGISTRY}/${NAMESPACE}/backend:${VERSION}${NC}"
echo -e "Frontend image: ${YELLOW}${REGISTRY}/${NAMESPACE}/frontend:${VERSION}${NC}"

