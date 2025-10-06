# LogHoi Kubernetes デプロイメントガイド

## 概要

このドキュメントでは、LogHoiアプリケーションをKubernetesクラスターにデプロイする方法について説明します。

## 前提条件

### 必要なツール
- **kubectl**: Kubernetesクラスターとの通信
- **Docker**: コンテナイメージのビルド
- **Kubernetesクラスター**: デプロイメント先

### クラスター要件
- **CPU**: 最小2コア、推奨4コア以上
- **メモリ**: 最小4GB、推奨8GB以上
- **ストレージ**: 最小20GB、推奨50GB以上
- **ネットワーク**: Ingress Controller（NGINX推奨）

## アーキテクチャ

### コンポーネント構成
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │  Elasticsearch  │
│   (Next.js)     │    │   (FastAPI)     │    │   (Database)    │
│   Port: 3000    │    │   Port: 7776    │    │   Port: 9200    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Ingress       │
                    │   (NGINX)       │
                    │   Port: 80/443  │
                    └─────────────────┘
```

### ネットワーク構成
- **Frontend Service**: ClusterIP (3000)
- **Backend Service**: ClusterIP (7776)
- **Elasticsearch Service**: ClusterIP (9200)
- **Ingress**: LoadBalancer/NodePort (80/443)

## デプロイメント手順

### 1. リポジトリのクローン
```bash
git clone <repository-url>
cd blog-loghoi/ongoing
```

### 2. 設定ファイルの準備

#### シークレットの設定
```bash
# SSH秘密鍵の準備
mkdir -p k8s/secrets
cp ~/.ssh/ntnx-lockdown k8s/secrets/ssh-private-key

# 環境に応じたSecretの作成
kubectl create secret generic loghoi-secrets \
  --from-literal=DB_PASSWORD=your-password \
  --from-literal=API_KEY=your-api-key \
  --from-literal=JWT_SECRET=your-jwt-secret \
  --from-file=SSH_PRIVATE_KEY=k8s/secrets/ssh-private-key \
  --namespace=loghoi
```

#### ConfigMapの設定
```bash
# 環境に応じたConfigMapの作成
kubectl create configmap loghoi-config \
  --from-literal=APP_NAME=LogHoi \
  --from-literal=APP_VERSION=v1.0.0 \
  --from-literal=DEBUG=false \
  --from-literal=ELASTICSEARCH_URL=http://elasticsearch:9200 \
  --namespace=loghoi
```

### 3. 自動デプロイメント（推奨）

#### 開発環境へのデプロイ
```bash
./scripts/deploy-k8s.sh dev deploy
```

#### 本番環境へのデプロイ
```bash
./scripts/deploy-k8s.sh production deploy
```

### 4. 手動デプロイメント

#### 名前空間の作成
```bash
kubectl apply -f k8s/namespace.yaml
```

#### 設定の適用
```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/nginx-config.yaml
```

#### アプリケーションのデプロイ
```bash
kubectl apply -f k8s/elasticsearch-deployment.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/services.yaml
kubectl apply -f k8s/ingress.yaml
```

#### 本番環境の場合（HPAの適用）
```bash
kubectl apply -f k8s/hpa.yaml
```

## 設定管理

### 環境変数

#### バックエンド設定
| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| `APP_NAME` | LogHoi | アプリケーション名 |
| `APP_VERSION` | v1.0.0 | アプリケーションバージョン |
| `DEBUG` | false | デバッグモード |
| `BACKEND_HOST` | 0.0.0.0 | バックエンドホスト |
| `BACKEND_PORT` | 7776 | バックエンドポート |
| `ELASTICSEARCH_URL` | http://elasticsearch:9200 | Elasticsearch URL |
| `LOG_LEVEL` | INFO | ログレベル |

#### フロントエンド設定
| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| `NEXT_PUBLIC_APP_NAME` | LogHoi | アプリケーション名 |
| `NEXT_PUBLIC_APP_VERSION` | v1.0.0 | アプリケーションバージョン |
| `NEXT_PUBLIC_DEBUG` | false | デバッグモード |
| `NEXT_PUBLIC_BACKEND_HOST` | localhost | バックエンドホスト |
| `NEXT_PUBLIC_BACKEND_PORT` | 7776 | バックエンドポート |

### シークレット管理

#### 必要なシークレット
- `DB_PASSWORD`: データベースパスワード
- `API_KEY`: API認証キー
- `JWT_SECRET`: JWT署名用シークレット
- `SSH_PRIVATE_KEY`: SSH秘密鍵
- `ENCRYPTION_KEY`: 暗号化キー

#### シークレットの更新
```bash
kubectl create secret generic loghoi-secrets \
  --from-literal=DB_PASSWORD=new-password \
  --namespace=loghoi \
  --dry-run=client -o yaml | kubectl apply -f -
```

## 監視とログ

### ヘルスチェック
```bash
# ポッドの状態確認
kubectl get pods -n loghoi

# サービスの状態確認
kubectl get services -n loghoi

# イングレスの状態確認
kubectl get ingress -n loghoi
```

### ログの確認
```bash
# バックエンドログ
kubectl logs -f deployment/loghoi-backend -n loghoi

# フロントエンドログ
kubectl logs -f deployment/loghoi-frontend -n loghoi

# Elasticsearchログ
kubectl logs -f deployment/elasticsearch -n loghoi
```

### メトリクス監視
```bash
# リソース使用量の確認
kubectl top pods -n loghoi
kubectl top nodes

# HPAの状態確認
kubectl get hpa -n loghoi
```

## スケーリング

### 手動スケーリング
```bash
# バックエンドのスケーリング
kubectl scale deployment loghoi-backend --replicas=3 -n loghoi

# フロントエンドのスケーリング
kubectl scale deployment loghoi-frontend --replicas=3 -n loghoi
```

### 自動スケーリング（HPA）
```bash
# HPAの適用
kubectl apply -f k8s/hpa.yaml

# HPAの状態確認
kubectl get hpa -n loghoi
```

## アップデート

### ローリングアップデート
```bash
# イメージの更新
kubectl set image deployment/loghoi-backend backend=loghoi/backend:v1.1.0 -n loghoi

# アップデートの確認
kubectl rollout status deployment/loghoi-backend -n loghoi
```

### 自動アップデート
```bash
# 自動アップデートスクリプトの実行
./scripts/deploy-k8s.sh production update
```

## トラブルシューティング

### よくある問題

#### ポッドが起動しない
```bash
# ポッドの詳細確認
kubectl describe pod <pod-name> -n loghoi

# イベントの確認
kubectl get events -n loghoi --sort-by='.lastTimestamp'
```

#### サービスに接続できない
```bash
# サービスの詳細確認
kubectl describe service <service-name> -n loghoi

# エンドポイントの確認
kubectl get endpoints -n loghoi
```

#### イングレスが動作しない
```bash
# イングレスの詳細確認
kubectl describe ingress loghoi-ingress -n loghoi

# Ingress Controllerの確認
kubectl get pods -n ingress-nginx
```

### ログの分析
```bash
# エラーログの検索
kubectl logs deployment/loghoi-backend -n loghoi | grep ERROR

# 特定の時間範囲のログ
kubectl logs deployment/loghoi-backend -n loghoi --since=1h
```

## セキュリティ

### ネットワークポリシー
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: loghoi-network-policy
  namespace: loghoi
spec:
  podSelector:
    matchLabels:
      app: loghoi
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: loghoi
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: loghoi
```

### RBAC設定
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: loghoi
  name: loghoi-role
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps", "secrets"]
  verbs: ["get", "list", "watch"]
```

## バックアップとリストア

### 設定のバックアップ
```bash
# 設定のエクスポート
kubectl get all -n loghoi -o yaml > loghoi-backup.yaml
kubectl get configmap,secret -n loghoi -o yaml > loghoi-config-backup.yaml
```

### データのバックアップ
```bash
# Elasticsearchのバックアップ
kubectl exec -it deployment/elasticsearch -n loghoi -- \
  curl -X PUT "localhost:9200/_snapshot/backup_repo/snapshot_1"
```

## パフォーマンス最適化

### リソース制限の調整
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### キャッシュの設定
```yaml
# Redisの追加
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: loghoi
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:alpine
        ports:
        - containerPort: 6379
```

## 環境別設定

### 開発環境
- リソース制限: 低
- レプリカ数: 1
- デバッグ: 有効
- ログレベル: DEBUG

### ステージング環境
- リソース制限: 中
- レプリカ数: 2
- デバッグ: 無効
- ログレベル: INFO

### 本番環境
- リソース制限: 高
- レプリカ数: 3+
- デバッグ: 無効
- ログレベル: WARN
- HPA: 有効

## 更新履歴

- **v1.0.0** (2025-01-04): 初版作成
- **v1.1.0** (2025-01-04): エラーハンドリング統一対応
- **v1.2.0** (2025-01-04): 共通コンポーネント追加
- **v1.3.0** (2025-01-04): Kubernetes化対応
