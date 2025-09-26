# Kubernetes対応バックエンドURL管理システム

このシステムは、Kubernetes環境でのバックエンドURL管理を最適化し、Service Discovery、ConfigMap、Secretを統合的に活用します。

## 概要

### 主な機能

1. **環境変数ベースの設定管理**
   - ConfigMap/Secretからの設定読み込み
   - 環境別の設定切り替え
   - 機密情報の安全な管理

2. **Service Discovery対応**
   - Kubernetes内部DNS名の自動解決
   - サービス可用性の自動検出
   - フォールバック機能

3. **ヘルスチェック機能**
   - バックエンドサービスの可用性監視
   - 自動的なフェイルオーバー
   - レスポンス時間の測定

4. **キャッシュ機能**
   - URL検出結果のキャッシュ
   - パフォーマンスの最適化
   - 設定変更の反映

## 使用方法

### 基本的な使用方法

```typescript
import { getBackendUrl, getBackendUrlWithDetails } from '@/lib/backendUrlManager'

// 基本的なURL取得
const backendUrl = await getBackendUrl()

// 詳細情報付きでURL取得
const result = await getBackendUrlWithDetails({
  enableHealthCheck: true,
  enableFallback: true,
  enableCache: true
})

console.log('Backend URL:', result.url)
console.log('Source:', result.source)
console.log('Available:', result.available)
```

### 高度な設定

```typescript
import { getBackendUrlManager } from '@/lib/backendUrlManager'

const manager = getBackendUrlManager()

// カスタム設定でURL取得
const result = await manager.getBackendUrl({
  enableFallback: true,
  fallbackUrls: [
    'http://backup-backend:7776',
    'http://localhost:7776'
  ],
  enableHealthCheck: true,
  healthCheckTimeout: 10000,
  enableCache: true,
  cacheTimeout: 60000,
  enableRetry: true,
  retryAttempts: 5,
  retryDelay: 2000
})
```

### 設定管理

```typescript
import { getConfigManager } from '@/lib/configManager'

const config = getConfigManager()

// 設定を取得
const backendConfig = config.getNestedValue('backend', 'url')
const isK8s = config.getNestedValue('environment', 'isKubernetes')

// 設定を更新
config.updateConfig({
  backend: {
    url: 'http://new-backend:7776'
  }
})

// 環境情報を取得
const envInfo = config.getEnvironmentInfo()
```

### ヘルスチェック

```typescript
import { 
  getHealthCheckManager, 
  startHealthCheck, 
  stopHealthCheck,
  isBackendAvailable 
} from '@/lib/healthCheck'

// ヘルスチェックを開始
startHealthCheck()

// バックエンドの可用性をチェック
const available = await isBackendAvailable()

// ヘルスステータスを監視
const unsubscribe = watchHealthStatus((status) => {
  console.log('Health status:', status.status)
  if (status.status === 'unhealthy') {
    // エラーハンドリング
  }
})

// ヘルスチェックを停止
stopHealthCheck()
unsubscribe()
```

## 環境変数設定

### 基本設定

```bash
# 完全なURLを指定
NEXT_PUBLIC_BACKEND_URL=http://backend-service:7776

# 個別設定
NEXT_PUBLIC_BACKEND_HOST=backend-service
NEXT_PUBLIC_BACKEND_PORT=7776
NEXT_PUBLIC_BACKEND_PROTOCOL=http
```

### Kubernetes固有設定

```bash
# Kubernetes環境変数（自動設定）
KUBERNETES_SERVICE_HOST=10.96.0.1
KUBERNETES_NAMESPACE=loghoi
KUBERNETES_POD_NAME=loghoi-frontend-xxx
KUBERNETES_POD_IP=10.244.1.5

# バックエンドサービス設定
BACKEND_SERVICE_HOST=backend-service
BACKEND_SERVICE_PORT=7776
```

### 機能フラグ

```bash
# 機能の有効/無効
NEXT_PUBLIC_FEATURE_REALTIME_LOGS=true
NEXT_PUBLIC_FEATURE_CHAT_ROOM=false
NEXT_PUBLIC_FEATURE_HEALTH_CHECK=true

# 認証設定
NEXT_PUBLIC_AUTH_ENABLED=false
AUTH_SECRET_KEY=your-secret-key
```

### ログ設定

```bash
# ログレベル
LOG_LEVEL=info

# ログ出力先
LOG_CONSOLE=true
LOG_REMOTE=false
```

## Kubernetes設定

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loghoi-frontend-config
  namespace: loghoi
data:
  NEXT_PUBLIC_BACKEND_URL: "http://loghoi-backend-service:7776"
  NEXT_PUBLIC_BACKEND_HOST: "loghoi-backend-service"
  NEXT_PUBLIC_BACKEND_PORT: "7776"
  LOG_LEVEL: "info"
```

### Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: loghoi-frontend-secret
  namespace: loghoi
type: Opaque
data:
  AUTH_SECRET_KEY: <base64-encoded-value>
```

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loghoi-frontend
spec:
  template:
    spec:
      containers:
      - name: frontend
        image: loghoi-frontend:latest
        env:
        - name: NEXT_PUBLIC_BACKEND_URL
          valueFrom:
            configMapKeyRef:
              name: loghoi-frontend-config
              key: NEXT_PUBLIC_BACKEND_URL
        - name: AUTH_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: loghoi-frontend-secret
              key: AUTH_SECRET_KEY
```

## デプロイメント手順

### 1. 設定ファイルの適用

```bash
# ConfigMapとSecretを適用
kubectl apply -f k8s-configmap.yaml

# 設定を確認
kubectl get configmap loghoi-frontend-config -o yaml
kubectl get secret loghoi-frontend-secret -o yaml
```

### 2. アプリケーションのデプロイ

```bash
# デプロイメントを適用
kubectl apply -f k8s-deployment.yaml

# デプロイメントの状態を確認
kubectl get pods -l app=loghoi-frontend
kubectl logs -l app=loghoi-frontend
```

### 3. サービスの公開

```bash
# サービスを適用
kubectl apply -f k8s-service.yaml

# 外部アクセス用のIngressを適用
kubectl apply -f k8s-ingress.yaml
```

## トラブルシューティング

### よくある問題

1. **バックエンドに接続できない**
   ```bash
   # サービス名を確認
   kubectl get services
   
   # DNS解決をテスト
   kubectl run test-pod --image=busybox --rm -it -- nslookup backend-service
   ```

2. **環境変数が設定されていない**
   ```bash
   # Podの環境変数を確認
   kubectl exec -it <pod-name> -- env | grep BACKEND
   ```

3. **ヘルスチェックが失敗する**
   ```bash
   # バックエンドのヘルスエンドポイントを確認
   kubectl port-forward svc/backend-service 7776:7776
   curl http://localhost:7776/health
   ```

### デバッグ方法

```typescript
// 設定情報をデバッグ出力
import { getConfigManager } from '@/lib/configManager'
const config = getConfigManager()
config.debugConfig()

// 環境情報を取得
const envInfo = config.getEnvironmentInfo()
console.log('Environment info:', envInfo)

// キャッシュ状態を確認
import { getBackendUrlManager } from '@/lib/backendUrlManager'
const manager = getBackendUrlManager()
const cacheStatus = manager.getCacheStatus()
console.log('Cache status:', cacheStatus)
```

## パフォーマンス最適化

### キャッシュ設定

```typescript
// キャッシュタイムアウトを調整
const result = await getBackendUrl({
  enableCache: true,
  cacheTimeout: 60000 // 1分
})
```

### ヘルスチェック間隔

```typescript
// ヘルスチェック間隔を調整
const healthCheck = getHealthCheckManager()
healthCheck.updateConfig({
  interval: 60000, // 1分
  timeout: 5000,   // 5秒
  retryAttempts: 3
})
```

### リトライ設定

```typescript
// リトライ設定を調整
const result = await getBackendUrl({
  enableRetry: true,
  retryAttempts: 5,
  retryDelay: 2000
})
```

## セキュリティ考慮事項

1. **機密情報の管理**
   - Secretを使用してトークンやキーを管理
   - 環境変数での機密情報の直接設定を避ける

2. **ネットワークセキュリティ**
   - NetworkPolicyでPod間通信を制限
   - Service Meshの使用を検討

3. **設定の検証**
   - 設定値の検証機能を活用
   - 不正な設定値の検出とログ出力

## 今後の拡張

1. **Service Mesh対応**
   - Istio、Linkerdとの統合
   - 自動的な負荷分散とフェイルオーバー

2. **メトリクス収集**
   - Prometheusメトリクスの追加
   - ダッシュボードでの可視化

3. **自動スケーリング**
   - HPA（Horizontal Pod Autoscaler）との連携
   - 負荷に応じた自動スケーリング





