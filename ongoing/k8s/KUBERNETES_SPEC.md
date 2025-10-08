# Kubernetes デプロイメント仕様書

## 📋 概要

このドキュメントは、Log Hoihoi アプリケーションのKubernetesへのデプロイメントに関する仕様と設計思想を記載しています。

---

## 🏗️ アーキテクチャ

### コンポーネント構成

```
Internet
    ↓
MetalLB LoadBalancer (10.55.23.42)
    ↓
Traefik Ingress (kommander-traefik)
    ├─ /api, /socket.io → Backend Service (ClusterIP:7776)
    │                         ↓
    │                      Backend Pods (FastAPI + Socket.IO)
    │                         ↓
    │                      Elasticsearch Service (ClusterIP:9200)
    │                         ↓
    │                      Elasticsearch Pod + PVC (10Gi)
    │
    └─ / → Frontend Service (ClusterIP:3000)
              ↓
           Frontend Pods (Next.js)
```

### Namespace

- **本番環境**: `loghoi`
- **理由**: 既存の `hoihoi` namespace (Prometheus/Grafana等) とリソース分離

---

## 🐳 Docker イメージ

### ファイル命名規則

**Kubernetes本番用には `.k8s` サフィックスを使用**

```
backend/
  ├── dockerfile          # Docker Compose開発用
  └── Dockerfile.k8s      # Kubernetes本番用 ⭐

frontend/next-app/loghoi/
  ├── dockerfile          # Docker Compose開発用  
  └── Dockerfile.k8s      # Kubernetes本番用 ⭐
```

**理由:**
- ✅ 用途が一目瞭然（開発 vs 本番）
- ✅ 誤って間違ったファイルを使うリスクを削減
- ✅ ファイル一覧で識別しやすい
- ✅ 大文字小文字を区別しないファイルシステム (macOS等) での問題を回避

### イメージタグ

- **レジストリ**: `docker.io` (Docker Hub)
- **Namespace**: `loghoi`
- **バージョン管理**:
  - `loghoi/backend:v1.0.0` - バージョン指定
  - `loghoi/backend:latest` - 最新版
  - `loghoi/frontend:v1.0.0` - バージョン指定
  - `loghoi/frontend:latest` - 最新版

### ビルド方法

```bash
# ローカルビルドのみ
cd /home/nutanix/konchangakita/blog-loghoi/ongoing/k8s
./build-and-push.sh

# レジストリへプッシュ
PUSH_IMAGES=true DOCKER_REGISTRY=your-registry.io ./build-and-push.sh

# バージョン指定
VERSION=v1.0.1 ./build-and-push.sh
```

---

## 🌐 ネットワーク

### Ingress

- **Controller**: Traefik (`kommander-traefik`)
- **IngressClass**: `kommander-traefik`
- **LoadBalancer IP**: 10.55.23.42 (MetalLB割り当て)

### ルーティング

| パス | バックエンド | 説明 |
|------|------------|------|
| `/api/*` | backend:7776 | REST API |
| `/socket.io/*` | backend:7776 | WebSocket (Socket.IO) |
| `/` | frontend:3000 | Next.js アプリケーション |

### Services

すべてClusterIPタイプ（Ingress経由で公開）:

| Service | Type | Port | TargetPort |
|---------|------|------|------------|
| loghoi-backend-service | ClusterIP | 7776 | 7776 |
| loghoi-frontend-service | ClusterIP | 3000 | 3000 |
| elasticsearch-service | ClusterIP | 9200 | 9200 |

### MetalLB

- **IPアドレスプール**: `10.55.23.41-10.55.23.43` (3個)
- **使用中**: 10.55.23.41 (kommander-traefik)
- **利用可能**: 10.55.23.42, 10.55.23.43

---

## 💾 ストレージ

### StorageClass

- **名前**: `nutanix-volume` (default)
- **Provisioner**: `csi.nutanix.com`
- **ReclaimPolicy**: Delete
- **VolumeBindingMode**: WaitForFirstConsumer
- **AllowVolumeExpansion**: true

### Persistent Volumes

| PVC | サイズ | マウント先 | 用途 |
|-----|--------|----------|------|
| elasticsearch-data | 10Gi | /usr/share/elasticsearch/data | Elasticsearchデータ永続化 |

---

## 🔧 ConfigMap

**名前**: `loghoi-config`

主要な設定:

```yaml
APP_NAME: "LogHoi"
APP_VERSION: "v1.0.0"
DEBUG: "false"

# Backend
BACKEND_HOST: "0.0.0.0"
BACKEND_PORT: "7776"

# Frontend
FRONTEND_PORT: "3000"

# Elasticsearch
ELASTICSEARCH_URL: "http://elasticsearch-service:9200"
ELASTICSEARCH_INDEX_PREFIX: "loghoi"

# Logging
LOG_LEVEL: "INFO"
LOG_FORMAT: "json"
STRUCTURED_LOGGING: "true"
CORRELATION_ID_HEADER: "X-Correlation-ID"

# Performance
MAX_CONNECTIONS: "100"
TIMEOUT: "30"
```

---

## 🔐 Secrets

**名前**: `loghoi-secrets`

必須項目:

- `SSH_PRIVATE_KEY`: CVM接続用SSH秘密鍵 (Base64エンコード)

作成方法:

```bash
kubectl --kubeconfig="/home/nutanix/nkp/kon-hoihoi.conf" create secret generic loghoi-secrets \
  --namespace=loghoi \
  --from-file=SSH_PRIVATE_KEY=/path/to/ssh/private/key
```

---

## 📊 リソース設定

### Backend

```yaml
replicas: 2
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

### Frontend

```yaml
replicas: 2
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

### Elasticsearch

```yaml
replicas: 1
resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 1000m
    memory: 2Gi
```

---

## 🏥 Health Checks

### Backend

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 7776
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 7776
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 5
  successThreshold: 1
  failureThreshold: 3
```

### Frontend

```yaml
livenessProbe:
  httpGet:
    path: /
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
```

### Elasticsearch

```yaml
livenessProbe:
  httpGet:
    path: /_cluster/health
    port: 9200
  initialDelaySeconds: 60
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /_cluster/health
    port: 9200
  initialDelaySeconds: 30
  periodSeconds: 10
```

---

## 🚀 デプロイ手順

### 前提条件

1. **Kubeconfig設定**
   ```bash
   export KUBECONFIG="/home/nutanix/nkp/kon-hoihoi.conf"
   ```

2. **Dockerイメージのビルド**
   ```bash
   cd /home/nutanix/konchangakita/blog-loghoi/ongoing/k8s
   ./build-and-push.sh
   ```

3. **SSH秘密鍵のSecret作成**
   ```bash
   kubectl create secret generic loghoi-secrets \
     --namespace=loghoi \
     --from-file=SSH_PRIVATE_KEY=/path/to/ssh/key
   ```

### 自動デプロイ

```bash
cd /home/nutanix/konchangakita/blog-loghoi/ongoing/k8s
./deploy.sh
```

### 手動デプロイ

```bash
# 1. ConfigMap
kubectl apply -f configmap.yaml

# 2. Elasticsearch PVC
kubectl apply -f elasticsearch-pvc.yaml

# 3. Elasticsearch
kubectl apply -f elasticsearch-deployment.yaml

# 4. Services
kubectl apply -f services.yaml

# 5. Backend & Frontend
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml

# 6. Ingress
kubectl apply -f ingress.yaml

# 7. HPA (オプション)
kubectl apply -f hpa.yaml
```

---

## 🔍 運用

### 状態確認

```bash
# Pods
kubectl get pods -n loghoi

# Services
kubectl get svc -n loghoi

# Ingress
kubectl get ingress -n loghoi

# PVC
kubectl get pvc -n loghoi
```

### ログ確認

```bash
# Backend
kubectl logs -n loghoi -l app=loghoi,component=backend -f

# Frontend
kubectl logs -n loghoi -l app=loghoi,component=frontend -f

# Elasticsearch
kubectl logs -n loghoi -l app=elasticsearch -f
```

### スケーリング

```bash
# 手動スケーリング
kubectl scale deployment loghoi-backend -n loghoi --replicas=3

# HPA確認
kubectl get hpa -n loghoi
```

---

## 🔄 開発環境との違い

| 項目 | Docker Compose (開発) | Kubernetes (本番) |
|------|---------------------|------------------|
| **起動方法** | `docker-compose up` | `kubectl apply` |
| **Dockerfile** | `dockerfile` (小文字) | `Dockerfile.k8s` |
| **ネットワーク** | Docker内部ネットワーク | Ingress + Service |
| **ストレージ** | Dockerボリューム | PVC (Nutanix CSI) |
| **スケーリング** | 手動 | HPA (自動) |
| **ヘルスチェック** | Docker Healthcheck | Liveness/Readiness Probe |
| **設定** | `.env` ファイル | ConfigMap + Secret |

---

## 📝 重要な注意事項

### 1. Dockerfileの使い分け

- ❌ **誤**: 開発用 `dockerfile` をKubernetesで使用
- ✅ **正**: Kubernetes用 `Dockerfile.k8s` を使用

### 2. namespace

- `loghoi`: Log Hoihoiアプリケーション専用
- `hoihoi`: 既存のモニタリングツール（触らない）

### 3. Secret管理

- SSH秘密鍵は**Gitにコミットしない**
- 本番環境では必ず適切なアクセス制御を設定

### 4. イメージのバージョン管理

- `latest` タグは開発・テスト用
- 本番環境では明示的なバージョンタグ (`v1.0.0` など) を使用推奨

---

## 🛠️ トラブルシューティング

### Podが起動しない

```bash
# イベント確認
kubectl describe pod <pod-name> -n loghoi

# ログ確認
kubectl logs <pod-name> -n loghoi
```

### Ingressに接続できない

```bash
# Ingress確認
kubectl get ingress -n loghoi -o yaml

# Service確認
kubectl get svc -n loghoi
```

### Elasticsearchが起動しない

```bash
# PVC確認
kubectl get pvc -n loghoi

# リソース確認
kubectl top pods -n loghoi
```

---

## 📚 参考資料

- [Kubernetes公式ドキュメント](https://kubernetes.io/docs/)
- [Traefik Ingress Controller](https://doc.traefik.io/traefik/providers/kubernetes-ingress/)
- [MetalLB](https://metallb.universe.tf/)
- [Nutanix CSI Driver](https://portal.nutanix.com/page/documents/details?targetId=CSI-Volume-Driver-v2_6:CSI-Volume-Driver-v2_6)

---

**最終更新**: 2025-10-09  
**バージョン**: 1.0.0  
**作成者**: AI Assistant  
**レビュー**: 必要に応じて更新してください

