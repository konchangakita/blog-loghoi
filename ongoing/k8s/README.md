# Kubernetes デプロイメントガイド

## 概要
このディレクトリには、Log HoihoiアプリケーションのKubernetesマニフェストが含まれています。
本番環境でのスケーラブルなデプロイメントをサポートします。

## アーキテクチャ
- **Ingress**: Traefik (kommander-traefik) - 単一IPで複数サービスを公開
- **Frontend**: Next.js アプリケーション (Port 3000)
- **Backend**: FastAPI + Socket.IO (Port 7776)
- **Database**: Elasticsearch (Port 9200)
- **Storage**: Nutanix Volumes CSI
- **LoadBalancer**: MetalLB (10.55.23.41-10.55.23.43)

## 前提条件
- Kubernetes 1.24以上 (本環境: v1.32.3)
- kubectl CLI
- Kubeconfig: `/home/nutanix/nkp/kon-hoihoi.conf`
- Namespace: `loghoihoi` (新規作成)
- **StorageClass**: 環境変数で指定（デフォルトは`manual` - HostPath）
- IngressClass: `kommander-traefik` (既存)
- MetalLB: IPアドレスプール 10.55.23.41-10.55.23.43

## ストレージ構成

### デフォルト（HostPath）
```bash
# 環境変数不要
./deploy.sh
```
- ✅ StorageClass/CSI不要
- ✅ 開発・検証環境向け
- ⚠️ 単一ノード限定

### カスタムStorageClass
```bash
# 環境変数で指定
STORAGE_CLASS=nutanix-volume ./deploy.sh  # NKP
STORAGE_CLASS=gp3 ./deploy.sh              # AWS
STORAGE_CLASS=standard ./deploy.sh         # GKE
```
- ✅ 本番環境推奨
- ✅ 高可用性対応
- ⚠️ StorageClass/CSI必要

## クイックスタート（自動デプロイ）

### 1. SSH秘密鍵のSecret作成
```bash
# SSH秘密鍵を指定してSecretを作成
kubectl --kubeconfig="/home/nutanix/nkp/kon-hoihoi.conf" create secret generic loghoi-secrets \
  --namespace=loghoihoi \
  --from-file=SSH_PRIVATE_KEY=/path/to/your/ssh/private/key
```

### 2. 自動デプロイスクリプト実行
```bash
cd /home/nutanix/konchangakita/blog-loghoi/ongoing/k8s
./deploy.sh
```

## 手動デプロイ

### 1. ConfigMapの作成
```bash
kubectl --kubeconfig="/home/nutanix/nkp/kon-hoihoi.conf" apply -f configmap.yaml
```

### 2. Secretの作成
```bash
# secret-template.yamlを参照してSecretを作成
kubectl --kubeconfig="/home/nutanix/nkp/kon-hoihoi.conf" create secret generic loghoi-secrets \
  --namespace=loghoihoi \
  --from-file=SSH_PRIVATE_KEY=/path/to/ssh/key
```

### 3. Elasticsearch PVCの作成
```bash
kubectl --kubeconfig="/home/nutanix/nkp/kon-hoihoi.conf" apply -f elasticsearch-pvc.yaml
```

### 4. アプリケーションのデプロイ
```bash
# Elasticsearch
kubectl --kubeconfig="/home/nutanix/nkp/kon-hoihoi.conf" apply -f elasticsearch-deployment.yaml

# Services
kubectl --kubeconfig="/home/nutanix/nkp/kon-hoihoi.conf" apply -f services.yaml

# Backend & Frontend
kubectl --kubeconfig="/home/nutanix/nkp/kon-hoihoi.conf" apply -f backend-deployment.yaml
kubectl --kubeconfig="/home/nutanix/nkp/kon-hoihoi.conf" apply -f frontend-deployment.yaml

# Ingress
kubectl --kubeconfig="/home/nutanix/nkp/kon-hoihoi.conf" apply -f ingress.yaml

# HPA（オプション）
kubectl --kubeconfig="/home/nutanix/nkp/kon-hoihoi.conf" apply -f hpa.yaml
```

## Dockerイメージのビルド

### ローカルビルド
```bash
cd /home/nutanix/konchangakita/blog-loghoi/ongoing/k8s
./build-and-push.sh
```

### レジストリへプッシュ
```bash
PUSH_IMAGES=true DOCKER_REGISTRY=your-registry.io ./build-and-push.sh
```

## Kustomizeを使用する場合
```bash
kubectl apply -k .
```

## アーキテクチャ

### コンポーネント構成
```
┌─────────────────┐
│    Ingress      │ ← 外部アクセス
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼───┐
│Frontend│  │Backend│
│(Next.js)│  │(FastAPI)│
└───┬──┘  └──┬───┘
    │        │
    └────┬───┘
         │
    ┌────▼────────┐
    │Elasticsearch│
    └─────────────┘
```

### リソース構成
- **Backend**: 2-10 Pods（HPA）
- **Frontend**: 2-5 Pods（HPA）
- **Elasticsearch**: 1 Pod（StatefulSet推奨）

## マニフェスト詳細

### backend-deployment.yaml
バックエンド（FastAPI）のDeployment

**リソース設定:**
- Requests: CPU 250m, Memory 256Mi
- Limits: CPU 500m, Memory 512Mi

**ヘルスチェック:**
- Liveness: `/health` (30s初期遅延)
- Readiness: `/ready` (10s初期遅延)

**環境変数:**
- ConfigMapから設定を読み込み
- Secretから機密情報を読み込み

### frontend-deployment.yaml
フロントエンド（Next.js）のDeployment

**リソース設定:**
- Requests: CPU 200m, Memory 256Mi
- Limits: CPU 400m, Memory 512Mi

### hpa.yaml
Horizontal Pod Autoscaler設定

**Backend HPA:**
- Min: 2, Max: 10 Pods
- CPU: 70%, Memory: 80%
- スケールアップ: 最大50%/分
- スケールダウン: 最大10%/分、5分安定化

**Frontend HPA:**
- Min: 2, Max: 5 Pods
- CPU: 70%, Memory: 80%

### configmap.yaml
アプリケーション設定

**主要設定:**
- アプリケーション情報
- バックエンド/フロントエンド設定
- Elasticsearch接続情報
- ログ設定（JSON形式、構造化ログ）
- パフォーマンス設定

### secret.yaml
機密情報（要作成）

**必要な値:**
- SSH秘密鍵
- データベース認証情報
- API キー

### services.yaml
Kubernetes Service定義

**サービス:**
- loghoi-backend: ClusterIP（内部通信）
- loghoi-frontend: ClusterIP（内部通信）
- elasticsearch: ClusterIP（内部通信）

### ingress.yaml
外部アクセス設定

**ルーティング:**
- `/` → Frontend
- `/api/*` → Backend
- `/docs` → Backend（Swagger UI）

## デプロイメント手順

### 開発環境
```bash
# 1. Namespace作成
kubectl apply -f namespace.yaml

# 2. ConfigMap/Secret作成
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml

# 3. アプリケーションデプロイ
kubectl apply -f elasticsearch-deployment.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f services.yaml

# 4. 動作確認
kubectl get pods -n loghoihoi
kubectl logs -f -n loghoihoi -l component=backend
```

### 本番環境
```bash
# Kustomizeを使用
kubectl apply -k overlays/production/

# または個別に適用
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml
kubectl apply -f elasticsearch-deployment.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f services.yaml
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml
```

## 運用

### スケーリング
```bash
# 手動スケーリング
kubectl scale deployment loghoi-backend -n loghoihoi --replicas=5

# HPA状態確認
kubectl get hpa -n loghoihoi
kubectl describe hpa loghoi-backend-hpa -n loghoihoi
```

### ログ確認
```bash
# 全Podのログ
kubectl logs -f -n loghoihoi -l app=loghoi

# Backend Podのログ
kubectl logs -f -n loghoihoi -l component=backend

# 構造化ログの検索（jqを使用）
kubectl logs -n loghoihoi -l component=backend | grep "^{" | jq '.'
kubectl logs -n loghoihoi -l component=backend | grep "^{" | jq 'select(.correlation_id)'
```

### ヘルスチェック
```bash
# Liveness Probe
kubectl exec -n loghoihoi deployment/loghoi-backend -- curl -s http://localhost:7776/health

# Readiness Probe
kubectl exec -n loghoihoi deployment/loghoi-backend -- curl -s http://localhost:7776/ready
```

### ローリングアップデート
```bash
# イメージ更新
kubectl set image deployment/loghoi-backend backend=loghoi/backend:v2.0.0 -n loghoihoi

# ロールアウト状態確認
kubectl rollout status deployment/loghoi-backend -n loghoihoi

# ロールバック
kubectl rollout undo deployment/loghoi-backend -n loghoihoi
```

## トラブルシューティング

### Podが起動しない
```bash
# Pod状態確認
kubectl get pods -n loghoihoi
kubectl describe pod <pod-name> -n loghoihoi

# イベント確認
kubectl get events -n loghoihoi --sort-by='.lastTimestamp'

# ログ確認
kubectl logs <pod-name> -n loghoihoi
```

### Readiness Probeが失敗する
```bash
# Readinessエンドポイントを直接確認
kubectl exec -n loghoihoi <pod-name> -- curl -v http://localhost:7776/ready

# Elasticsearch接続確認
kubectl exec -n loghoihoi <pod-name> -- curl -v http://elasticsearch:9200
```

### HPAが動作しない
```bash
# Metrics Server確認
kubectl get apiservice v1beta1.metrics.k8s.io

# メトリクス確認
kubectl top pods -n loghoihoi
kubectl top nodes

# HPA詳細
kubectl describe hpa loghoi-backend-hpa -n loghoihoi
```

## セキュリティ

### Secret管理
```bash
# Secretの作成（SSH鍵）
kubectl create secret generic loghoi-secrets \
  --from-file=SSH_PRIVATE_KEY=./path/to/private_key \
  -n loghoihoi

# Secretの確認
kubectl get secrets -n loghoihoi
kubectl describe secret loghoi-secrets -n loghoihoi
```

### RBAC設定
```bash
# ServiceAccountの作成
kubectl create serviceaccount loghoi-sa -n loghoihoi

# RoleBindingの設定
kubectl create rolebinding loghoi-rb \
  --role=loghoi-role \
  --serviceaccount=loghoi:loghoi-sa \
  -n loghoihoi
```

## モニタリング

### Prometheus統合
```yaml
apiVersion: v1
kind: Service
metadata:
  name: loghoi-backend
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "7776"
    prometheus.io/path: "/metrics"
```

### Grafana Dashboard
- CPU/メモリ使用率
- リクエスト数/レイテンシ
- エラー率
- アクティブ接続数

## パフォーマンスチューニング

### リソース調整
```yaml
resources:
  requests:
    memory: "512Mi"  # 実際の使用量に応じて調整
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

### HPA閾値調整
```yaml
metrics:
- type: Resource
  resource:
    name: cpu
    target:
      type: Utilization
      averageUtilization: 60  # 負荷に応じて調整
```

## 参考リンク
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [HPA Walkthrough](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/)
- [Configure Liveness, Readiness and Startup Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
