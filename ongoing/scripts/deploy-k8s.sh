#!/bin/bash

# LogHoi Kubernetes Deployment Script
# 使用方法: ./deploy-k8s.sh [environment] [action]
# 環境: dev, staging, production
# アクション: deploy, update, delete, status

set -e

# デフォルト値
ENVIRONMENT=${1:-dev}
ACTION=${2:-deploy}
NAMESPACE="loghoi-${ENVIRONMENT}"

# 色付きログ関数
log_info() {
    echo -e "\033[32m[INFO]\033[0m $1"
}

log_warn() {
    echo -e "\033[33m[WARN]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

# 前提条件チェック
check_prerequisites() {
    log_info "前提条件をチェック中..."
    
    # kubectlの存在確認
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectlがインストールされていません"
        exit 1
    fi
    
    # Dockerの存在確認
    if ! command -v docker &> /dev/null; then
        log_error "Dockerがインストールされていません"
        exit 1
    fi
    
    # Kubernetesクラスターへの接続確認
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Kubernetesクラスターに接続できません"
        exit 1
    fi
    
    log_info "前提条件チェック完了"
}

# イメージビルド
build_images() {
    log_info "Dockerイメージをビルド中..."
    
    # バックエンドイメージのビルド
    log_info "バックエンドイメージをビルド中..."
    docker build -f backend/Dockerfile.k8s -t loghoi/backend:latest ./backend/
    
    # フロントエンドイメージのビルド
    log_info "フロントエンドイメージをビルド中..."
    docker build -f frontend/next-app/loghoi/Dockerfile.k8s -t loghoi/frontend:latest ./frontend/next-app/loghoi/
    
    log_info "イメージビルド完了"
}

# 名前空間の作成
create_namespace() {
    log_info "名前空間 ${NAMESPACE} を作成中..."
    
    if kubectl get namespace ${NAMESPACE} &> /dev/null; then
        log_warn "名前空間 ${NAMESPACE} は既に存在します"
    else
        kubectl create namespace ${NAMESPACE}
        log_info "名前空間 ${NAMESPACE} を作成しました"
    fi
}

# 設定の適用
apply_configs() {
    log_info "Kubernetes設定を適用中..."
    
    # 環境に応じて設定を調整
    if [ "${ENVIRONMENT}" = "dev" ]; then
        # 開発環境用の設定調整
        sed -i 's/replicas: 2/replicas: 1/g' k8s/backend-deployment.yaml
        sed -i 's/replicas: 2/replicas: 1/g' k8s/frontend-deployment.yaml
    fi
    
    # 設定ファイルの適用
    kubectl apply -f k8s/namespace.yaml
    kubectl apply -f k8s/configmap.yaml
    kubectl apply -f k8s/secret.yaml
    kubectl apply -f k8s/nginx-config.yaml
    kubectl apply -f k8s/elasticsearch-deployment.yaml
    kubectl apply -f k8s/backend-deployment.yaml
    kubectl apply -f k8s/frontend-deployment.yaml
    kubectl apply -f k8s/services.yaml
    kubectl apply -f k8s/ingress.yaml
    
    # 本番環境の場合のみHPAを適用
    if [ "${ENVIRONMENT}" = "production" ]; then
        kubectl apply -f k8s/hpa.yaml
    fi
    
    log_info "設定の適用完了"
}

# デプロイメントの確認
check_deployment() {
    log_info "デプロイメントの状態を確認中..."
    
    # ポッドの状態確認
    kubectl get pods -n ${NAMESPACE}
    
    # サービスの状態確認
    kubectl get services -n ${NAMESPACE}
    
    # イングレスの状態確認
    kubectl get ingress -n ${NAMESPACE}
    
    # ポッドの詳細ログ（エラーがある場合）
    if ! kubectl get pods -n ${NAMESPACE} --field-selector=status.phase!=Running | grep -q "No resources found"; then
        log_warn "一部のポッドがRunning状態ではありません"
        kubectl describe pods -n ${NAMESPACE} --field-selector=status.phase!=Running
    fi
}

# デプロイメントの実行
deploy() {
    log_info "LogHoiを ${ENVIRONMENT} 環境にデプロイ中..."
    
    check_prerequisites
    build_images
    create_namespace
    apply_configs
    
    log_info "デプロイメント完了。ポッドの起動を待機中..."
    kubectl wait --for=condition=ready pod -l app=loghoi -n ${NAMESPACE} --timeout=300s
    
    check_deployment
    
    log_info "デプロイメント完了！"
    log_info "アプリケーションにアクセス: kubectl port-forward -n ${NAMESPACE} service/loghoi-frontend-service 3000:3000"
}

# アップデートの実行
update() {
    log_info "LogHoiを ${ENVIRONMENT} 環境でアップデート中..."
    
    check_prerequisites
    build_images
    apply_configs
    
    log_info "アップデート完了。ポッドの再起動を待機中..."
    kubectl rollout status deployment/loghoi-backend -n ${NAMESPACE}
    kubectl rollout status deployment/loghoi-frontend -n ${NAMESPACE}
    
    check_deployment
    
    log_info "アップデート完了！"
}

# 削除の実行
delete() {
    log_warn "LogHoiを ${ENVIRONMENT} 環境から削除中..."
    
    read -p "本当に削除しますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "削除をキャンセルしました"
        exit 0
    fi
    
    kubectl delete namespace ${NAMESPACE}
    
    log_info "削除完了！"
}

# ステータスの表示
status() {
    log_info "LogHoi ${ENVIRONMENT} 環境のステータス:"
    
    echo "=== 名前空間 ==="
    kubectl get namespace ${NAMESPACE} 2>/dev/null || log_warn "名前空間 ${NAMESPACE} が見つかりません"
    
    echo "=== ポッド ==="
    kubectl get pods -n ${NAMESPACE} 2>/dev/null || log_warn "ポッドが見つかりません"
    
    echo "=== サービス ==="
    kubectl get services -n ${NAMESPACE} 2>/dev/null || log_warn "サービスが見つかりません"
    
    echo "=== イングレス ==="
    kubectl get ingress -n ${NAMESPACE} 2>/dev/null || log_warn "イングレスが見つかりません"
    
    echo "=== 設定 ==="
    kubectl get configmap -n ${NAMESPACE} 2>/dev/null || log_warn "ConfigMapが見つかりません"
    kubectl get secret -n ${NAMESPACE} 2>/dev/null || log_warn "Secretが見つかりません"
}

# メイン処理
case ${ACTION} in
    deploy)
        deploy
        ;;
    update)
        update
        ;;
    delete)
        delete
        ;;
    status)
        status
        ;;
    *)
        log_error "無効なアクション: ${ACTION}"
        log_info "使用方法: $0 [environment] [action]"
        log_info "環境: dev, staging, production"
        log_info "アクション: deploy, update, delete, status"
        exit 1
        ;;
esac
