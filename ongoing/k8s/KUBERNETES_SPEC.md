# Kubernetes デプロイメント仕様書

## 📋 概要

このドキュメントは、Log Hoihoi アプリケーションのKubernetesへのデプロイメントに関する仕様と設計思想を記載しています。

---

## 🏗️ アーキテクチャ

### コンポーネント構成

```
Internet
    ↓
MetalLB LoadBalancer (10.55.23.41)
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
    ├─ /kibana → Kibana Service (ClusterIP:5601)
    │               ↓
    │            Kibana Pod (Elasticsearch UI)
    │
    └─ / → Frontend Service (ClusterIP:7777)
              ↓
           Frontend Pods (Next.js)
```

### Namespace

- **本番環境**: `loghoihoi`
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

- **レジストリ**: `ghcr.io` (GitHub Container Registry) - **2025-10-21移行**
- **Namespace**: `konchangakita`
- **イメージタグ戦略**（2025-10-21更新）:
  - **Backend**: `ghcr.io/konchangakita/loghoi-backend:latest` - 常に最新版を使用
  - **Frontend**: `ghcr.io/konchangakita/loghoi-frontend:latest` - 常に最新版を使用
  - **Syslog**: `ghcr.io/konchangakita/loghoi-syslog:v1.0.1` - 安定版を使用（頻繁に更新されないため固定）
- **移行理由**: Docker Hubのイメージプルエラー（500/504/401 Unauthorized）を解決
- **注意**: `latest`タグは開発イテレーション高速化のため。本番環境では特定バージョンタグの使用を推奨
- **公式イメージ**:
  - `docker.elastic.co/elasticsearch/elasticsearch:8.11.0` - Elasticsearch
  - `docker.elastic.co/kibana/kibana:8.11.0` - Kibana

### ビルド方法

```bash
# ローカルビルドのみ
cd /home/nutanix/konchangakita/blog-loghoi/ongoing/k8s
./build-and-push.sh

# GitHub Container Registry (GHCR) へプッシュ
PUSH_IMAGES=true DOCKER_REGISTRY=ghcr.io ./build-and-push.sh

# バージョン指定
VERSION=v1.0.1 ./build-and-push.sh
```

### GitHub Container Registry (GHCR) 設定

**認証設定**:
```bash
# GitHub Personal Access Tokenでログイン
echo $GITHUB_TOKEN | docker login ghcr.io -u konchangakita --password-stdin

# または手動ログイン
docker login ghcr.io
```

**パッケージ公開設定**:
- GitHubリポジトリの「Packages」セクションで各パッケージを**Public**に設定
- これにより認証なしでイメージプルが可能

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
| `/kibana/*` | kibana:5601 | Kibana UI (ログ可視化) |
| `/` | frontend:7777 | Next.js アプリケーション |

### Services

すべてClusterIPタイプ（Ingress経由で公開）:

| Service | Type | Port | TargetPort |
|---------|------|------|------------|
| loghoi-backend-service | ClusterIP | 7776 | 7776 |
| loghoi-frontend-service | ClusterIP | 7777 | 7777 |
| elasticsearch-service | ClusterIP | 9200 | 9200 |
| kibana-service | ClusterIP | 5601 | 5601 |

### MetalLB

- **IPアドレスプール**: `10.55.23.41-10.55.23.43` (3個)
- **使用中**: 10.55.23.41 (kommander-traefik)
- **利用可能**: 10.55.23.42, 10.55.23.43

---

## 💾 ストレージ

### StorageClass設定（環境変数制御）

LogHoihoiは`STORAGE_CLASS`環境変数でストレージ構成を柔軟に変更できます。

#### デフォルト（HostPath）

```bash
# 環境変数不要（デフォルト）
./deploy.sh

# または明示的に指定
STORAGE_CLASS=manual ./deploy.sh
```

**特徴**:
- ✅ **StorageClass**: `manual`（HostPath使用）
- ✅ **Provisioner不要**: CSI Driver等のインストール不要
- ✅ **即座にデプロイ可能**: どの環境でも動作
- ⚠️ **単一ノード限定**: Podとデータが同じノードに配置
- ⚠️ **データ永続性**: 中程度（ノード障害時に損失）
- 💡 **用途**: 開発・検証環境向け

**自動生成されるPV**:
- `elasticsearch-data-pv`: HostPath `/mnt/loghoi/elasticsearch-data`
- `backend-output-pv`: HostPath `/mnt/loghoi/backend-output`

#### カスタムStorageClass

```bash
# 環境変数で指定
STORAGE_CLASS=nutanix-volume ./deploy.sh  # NKP
STORAGE_CLASS=gp3 ./deploy.sh              # AWS EKS
STORAGE_CLASS=standard ./deploy.sh         # GKE
```

**特徴**:
- ✅ **Dynamic Provisioning**: PVが自動作成
- ✅ **高可用性（HA）対応**: ノード障害に強い
- ✅ **本番環境推奨**: エンタープライズグレード
- ⚠️ **要件**: StorageClassとCSI Driverが必要

**NKP環境での例**:
- 名前: `nutanix-volume`
- Provisioner: `csi.nutanix.com`
- ReclaimPolicy: Delete
- VolumeBindingMode: WaitForFirstConsumer
- AllowVolumeExpansion: true

### Persistent Volumes

| PVC | サイズ | デフォルトStorageClass | マウント先 | 用途 |
|-----|--------|---------------------|----------|------|
| elasticsearch-data | 10Gi | manual（HostPath） | /usr/share/elasticsearch/data | Elasticsearchデータ永続化 |
| loghoi-backend-output | 10Gi | manual（HostPath） | /usr/src/output | バックエンドログファイル保存 |

**注意**: `STORAGE_CLASS`環境変数で変更可能

---

## 🔧 ConfigMap

**名前**: `loghoi-config`

主要な設定:

```yaml
APP_NAME: "LogHoi"
APP_VERSION: "v1.0.12"
DEBUG: "false"

# Backend
BACKEND_HOST: "0.0.0.0"
BACKEND_PORT: "7776"

# Frontend
FRONTEND_PORT: "7777"

# Elasticsearch
ELASTICSEARCH_URL: "http://elasticsearch-service:9200"
ELASTICSEARCH_INDEX_PREFIX: "loghoi"

# Kibana
KIBANA_URL: "http://kibana-service:5601"

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
  --namespace=loghoihoi \
  --from-file=SSH_PRIVATE_KEY=/path/to/ssh/private/key
```

---

## 📊 リソース設定

### Backend

```yaml
replicas: 1  # HostPath(RWO)使用のため1に制限
strategy:
  type: Recreate  # HostPath(RWO)使用時は必須
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
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 200m
    memory: 256Mi
```

### Elasticsearch

```yaml
replicas: 1
strategy:
  type: Recreate  # HostPath(RWO)使用時は必須
resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 1000m
    memory: 2Gi
env:
  - name: discovery.type
    value: "single-node"
  - name: xpack.security.enabled
    value: "false"
  - name: ES_JAVA_OPTS
    value: "-Xms512m -Xmx512m"
securityContext:
  fsGroup: 1000
initContainers:
  - name: fix-permissions
    image: busybox:1.36
    command: ['sh', '-c', 'chown -R 1000:1000 /usr/share/elasticsearch/data && chmod -R 755 /usr/share/elasticsearch/data']
```

### Kibana

```yaml
replicas: 1
resources:
  requests:
    cpu: 250m
    memory: 512Mi
  limits:
    cpu: 500m
    memory: 1Gi
env:
  - name: ELASTICSEARCH_HOSTS
    value: "http://elasticsearch-service:9200"
  - name: XPACK_SECURITY_ENABLED
    value: "false"
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
    port: 7777
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /
    port: 7777
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

### Elasticsearch

```yaml
livenessProbe:
  httpGet:
    path: /_cluster/health
    port: 9200
  initialDelaySeconds: 60
  periodSeconds: 30
  timeoutSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /_cluster/health
    port: 9200
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Kibana

```yaml
livenessProbe:
  httpGet:
    path: /api/status
    port: 5601
  initialDelaySeconds: 60
  periodSeconds: 30
  timeoutSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /api/status
    port: 5601
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
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
     --namespace=loghoihoi \
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

# 4. Kibana
kubectl apply -f kibana-deployment.yaml

# 5. Services
kubectl apply -f services.yaml

# 6. Backend & Frontend
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml

# 7. Ingress
kubectl apply -f ingress.yaml

# 8. HPA (オプション)
kubectl apply -f hpa.yaml
```

---

## 🔍 運用

### 状態確認

```bash
# Pods
kubectl get pods -n loghoihoihoi

# Services
kubectl get svc -n loghoihoi

# Ingress
kubectl get ingress -n loghoihoi

# PVC
kubectl get pvc -n loghoihoi
```

### ログ確認

```bash
# Backend
kubectl logs -n loghoihoi -l app=loghoi,component=backend -f

# Frontend
kubectl logs -n loghoihoi -l app=loghoi,component=frontend -f

# Elasticsearch
kubectl logs -n loghoihoi -l app=elasticsearch -f

# Kibana
kubectl logs -n loghoihoi -l app=kibana,component=kibana -f
```

### スケーリング

```bash
# 手動スケーリング
kubectl scale deployment loghoi-backend -n loghoihoi --replicas=3

# HPA確認
kubectl get hpa -n loghoihoi
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
| **ログ可視化** | なし | Kibana (http://10.55.23.41/kibana) |
| **監視** | なし | Kubernetes metrics + Kibana |
| **ポート** | Frontend: 3000 | Frontend: 7777 |

---

## 📝 重要な注意事項

### 1. Dockerfileの使い分け

- ❌ **誤**: 開発用 `dockerfile` をKubernetesで使用
- ✅ **正**: Kubernetes用 `Dockerfile.k8s` を使用

### 2. namespace

- `loghoihoi`: Log Hoihoiアプリケーション専用
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
kubectl describe pod <pod-name> -n loghoihoi

# ログ確認
kubectl logs <pod-name> -n loghoihoi
```

### Ingressに接続できない

```bash
# Ingress確認
kubectl get ingress -n loghoihoi -o yaml

# Service確認
kubectl get svc -n loghoihoi
```

### Elasticsearchが起動しない

```bash
# PVC確認
kubectl get pvc -n loghoihoi

# リソース確認
kubectl top pods -n loghoihoi

# 権限エラーの場合
# initContainerでボリューム権限を修正する設定を確認
kubectl describe pod -n loghoihoi -l app=elasticsearch
```

### Elasticsearchが再起動を繰り返す

**症状**: CrashLoopBackOff、複数のReplicaSetが同時に起動

**原因**: HostPath(ReadWriteOnce)使用時のRollingUpdate競合
- RollingUpdate戦略により新旧Pod両方が起動
- 同じPVCに複数Podがアクセス
- Elasticsearchのnode.lockファイルが競合
- `LockObtainFailedException: Lock held by another program`

**解決方法**:
```yaml
# elasticsearch-deployment.yaml
spec:
  replicas: 1
  strategy:
    type: Recreate  # HostPath使用時は必須
```

**確認コマンド**:
```bash
# ReplicaSet数を確認（1つのみが正常）
kubectl get rs -n loghoihoi | grep elasticsearch

# Podログでロック競合を確認
kubectl logs -n loghoihoi -l app=elasticsearch | grep -i lock
```

### Kibanaが起動しない

```bash
# Elasticsearchの接続確認
kubectl exec -it <kibana-pod> -n loghoihoi -- curl http://elasticsearch-service:9200

# Kibanaログ確認
kubectl logs -n loghoihoi -l component=kibana --tail=100

# 環境変数確認
kubectl describe pod -n loghoihoi -l component=kibana
```

---

## 📚 参考資料

- [Kubernetes公式ドキュメント](https://kubernetes.io/docs/)
- [Traefik Ingress Controller](https://doc.traefik.io/traefik/providers/kubernetes-ingress/)
- [MetalLB](https://metallb.universe.tf/)
- [Nutanix CSI Driver](https://portal.nutanix.com/page/documents/details?targetId=CSI-Volume-Driver-v2_6:CSI-Volume-Driver-v2_6)
- [Elasticsearch 8.11 Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/8.11/index.html)
- [Kibana 8.11 Documentation](https://www.elastic.co/guide/en/kibana/8.11/index.html)

---

## 📝 変更履歴

### v1.2.0 (2025-10-21)
- ✅ **GitHub Container Registry (GHCR) 移行**
  - Docker Hub → GHCR.io への完全移行
  - イメージプルエラー（500/504/401 Unauthorized）を解決
  - パッケージ公開設定で認証なしプルを実現
- ✅ **ストレージクラス自動作成**
  - `manual` StorageClassの自動生成機能追加
  - HostPath環境での即座デプロイを実現
- 🔧 **deploy.sh改善**
  - SSH公開鍵表示をスクリプト最後に移動
  - ユーザビリティ向上（デプロイ状況確認後に公開鍵確認）
- 📚 **仕様書更新**
  - KUBERNETES_SPEC.mdにGHCR設定手順を追加
  - イメージタグ戦略を更新

### v1.1.0 (2025-10-14)
- ✅ **StorageClass環境変数対応**
  - `STORAGE_CLASS`環境変数でストレージ構成を柔軟に変更可能
  - デフォルトはHostPath（`manual`）- 開発・検証環境向け
  - カスタムStorageClass指定で本番環境対応
- ✅ **HostPath自動構成**
  - PV自動生成機能追加（`manual` StorageClass使用時）
  - nodeSelector自動設定（単一ノード環境対応）
  - initContainerで権限問題を解決（Backend）
- 🔧 **Recreate戦略導入**
  - ElasticsearchとBackendにRecreate戦略を適用
  - HostPath(RWO)使用時のRollingUpdate競合を解消
  - ロックファイル競合問題を解決
- 📊 **Kibana自動デプロイ**
  - deploy.shにKibanaデプロイステップを追加
  - Elasticsearchデータの可視化が可能に
- 📚 **ドキュメント強化**
  - DEPLOYMENT_GUIDE.md更新（StorageClass設定手順追加）
  - 環境別設定例追加（NKP, GKE, EKS, AKS）
  - トラブルシューティング更新（RollingUpdate競合対策追加）

### v1.0.12 (2025-10-09)
- ✅ Kibanaデプロイメントを追加
- ✅ フロントエンドのポートを3000→7777に変更
- ✅ Elasticsearchの権限問題を解決（initContainer追加）
- ✅ Docker Hubへのイメージプッシュに対応
- ✅ バックエンドのPythonインポートパスを修正
- ✅ ESLintビルドエラーを回避（一時的に無効化）

### v1.0.0 (2025-10-09)
- 🎉 初回リリース
- Kubernetes環境への初期デプロイ
- Backend (FastAPI), Frontend (Next.js), Elasticsearch構成

---

## 🎯 現在の稼働状況

**全サービス正常稼働中** ✅

| コンポーネント | バージョン | レプリカ | ステータス |
|-------------|----------|---------|----------|
| Backend | v1.0.11 | 2/2 | Running |
| Frontend | v1.0.12 | 2/2 | Running |
| Elasticsearch | 8.11.0 | 1/1 | Running (green) |
| Kibana | 8.11.0 | 1/1 | Running (available) |

**アクセスURL:**
- アプリケーション: `http://10.55.23.41/`
- Kibana: `http://10.55.23.41/kibana`
- Backend API: `http://10.55.23.41/api`

---

**最終更新**: 2025-10-21  
**現在のバージョン**: v1.2.0  
**作成者**: AI Assistant  
**レビュー**: 必要に応じて更新してください

