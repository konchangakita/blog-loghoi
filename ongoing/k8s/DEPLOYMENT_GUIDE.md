# Kubernetes デプロイメントガイド

## 📋 目次

- [概要](#概要)
- [前提条件](#前提条件)
- [クイックスタート](#クイックスタート)
- [詳細なデプロイ手順](#詳細なデプロイ手順)
- [デプロイ後の確認](#デプロイ後の確認)
- [トラブルシューティング](#トラブルシューティング)
- [アンインストール](#アンインストール)

---

## 概要

このガイドでは、LogHoihoi（Nutanixログホイホイ）アプリケーションをKubernetes環境にデプロイする手順を説明します。

### アーキテクチャ概要

```
Internet/LAN
    │
    ▼
[Ingress (Traefik)]
    │
    ├─► [Frontend Service] ──► [Frontend Pods (Next.js)]
    │
    └─► [Backend Service] ──► [Backend Pods (FastAPI)]
                │
                ▼
        [Elasticsearch Service] ──► [Elasticsearch Pod]
                                         │
                                         ▼
                                    [PVC: elasticsearch-data (10Gi)]
```

### 主要コンポーネント

| コンポーネント | 説明 | レプリカ数 |
|---|---|---|
| **Frontend** | Next.js アプリケーション | 1 |
| **Backend** | FastAPI + Socket.IO | 1 |
| **Elasticsearch** | ログデータストア | 1 |
| **Ingress** | Traefik Ingress Controller | - |

---

## 前提条件

### 必須要件

- ✅ **Kubernetes クラスタ**: v1.24以上
- ✅ **kubectl CLI**: インストール済み
- ✅ **kubeconfig**: クラスタへのアクセス設定済み
- ✅ **Default StorageClass**: 設定済み（PVC用）
- ✅ **Ingress Controller**: Traefik等がインストール済み

### 推奨要件

- ✅ **MetalLB**: LoadBalancer IP割り当て（オンプレ環境の場合）
- ✅ **Nutanix CSI**: Nutanix環境の場合

### 環境例（本番NKP環境）

```bash
# Kubernetes バージョン
Kubernetes: v1.32.3

# StorageClass
nutanix-volume (default)
  Provisioner: csi.nutanix.com
  VolumeBindingMode: WaitForFirstConsumer
  AllowVolumeExpansion: true

# Ingress Controller
kommander-traefik (IngressClass)

# LoadBalancer
MetalLB: 10.55.23.41-10.55.23.43
```

---

## クイックスタート

### 🚀 ワンコマンドデプロイ

最も簡単な方法は、自動デプロイスクリプトを使用することです。

```bash
cd /home/nutanix/konchangakita/blog-loghoi/ongoing/k8s
KUBECONFIG=/path/to/your/kubeconfig.conf ./deploy.sh
```

### スクリプトが自動的に行うこと

1. ✅ クラスタ接続確認
2. ✅ Namespace作成 (`loghoihoi`)
3. ✅ **SSH鍵の自動生成・管理**
   - 既存の鍵がある場合: そのまま使用
   - 鍵が無い場合: 新規生成して公開鍵を表示
   - Nutanix Prismへの登録確認
4. ✅ Kubernetes Secret作成 (SSH鍵)
5. ✅ リソースのデプロイ
   - ConfigMap
   - PVC (Elasticsearch, Backend)
   - Elasticsearch
   - Services
   - Backend/Frontend
   - Ingress

### SSH公開鍵の登録（初回デプロイ時）

デプロイスクリプトで新しいSSH鍵が生成された場合、以下の手順でNutanix Prismに登録してください：

```
🚨 新しいSSH公開鍵が生成されました！

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 SSH公開鍵
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ssh-rsa AAAAB3NzaC1yc2E... loghoi@kubernetes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️⚠️⚠️  必須作業: Nutanix Prismへの公開鍵登録  ⚠️⚠️⚠️

1️⃣ Prism Element > Settings > Cluster Lockdown
2️⃣ 「Add Public Key」をクリック
3️⃣ 上記の公開鍵を貼り付けて保存

💡 ヒント:
   - アプリUI起動後、右上の「Open SSH KEY」ボタンからも確認可能
   - クリックでクリップボードにコピーされます

公開鍵の登録は完了しましたか？ (y/N):
```

---

## 詳細なデプロイ手順

自動デプロイスクリプトを使わずに、手動でデプロイする場合の詳細手順です。

### 1. 環境変数の設定

```bash
export KUBECONFIG=/path/to/your/kubeconfig.conf
export NAMESPACE=loghoihoi
```

### 2. Namespace作成

```bash
kubectl create namespace ${NAMESPACE}
```

### 3. SSH鍵の準備

#### 方法A: 既存の鍵を使用

```bash
# SSH秘密鍵と公開鍵をSecretとして作成
kubectl create secret generic loghoi-secrets \
  --namespace=${NAMESPACE} \
  --from-file=SSH_PRIVATE_KEY=/path/to/your/private/key \
  --from-file=SSH_PUBLIC_KEY=/path/to/your/public/key.pub
```

#### 方法B: 新規に鍵を生成

```bash
# SSH鍵ペアを生成
SSH_KEY_DIR="../config/.ssh"
mkdir -p ${SSH_KEY_DIR}
ssh-keygen -t rsa -b 4096 \
  -f ${SSH_KEY_DIR}/loghoi-key \
  -N "" \
  -C "loghoi@kubernetes"

# 公開鍵を表示（Nutanix Prismに登録）
cat ${SSH_KEY_DIR}/loghoi-key.pub

# Secretを作成
kubectl create secret generic loghoi-secrets \
  --namespace=${NAMESPACE} \
  --from-file=SSH_PRIVATE_KEY=${SSH_KEY_DIR}/loghoi-key \
  --from-file=SSH_PUBLIC_KEY=${SSH_KEY_DIR}/loghoi-key.pub
```

### 4. ConfigMapの作成

```bash
kubectl apply -f configmap.yaml
```

### 5. PVC（Persistent Volume Claim）の作成

```bash
# Elasticsearch用
kubectl apply -f elasticsearch-pvc.yaml

# Backend出力用
kubectl apply -f backend-output-pvc.yaml
```

**注意**: PVCはdefault StorageClassを使用します。環境に応じて自動的に適切なStorageClassが選択されます。

### 6. Elasticsearchのデプロイ

```bash
kubectl apply -f elasticsearch-deployment.yaml
```

### 7. Servicesの作成

```bash
kubectl apply -f services.yaml
```

### 8. Backend/Frontendのデプロイ

```bash
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml
```

### 9. Ingressの作成

```bash
kubectl apply -f ingress.yaml
```

### 10. オプション: HPAの設定

```bash
kubectl apply -f hpa.yaml
```

---

## デプロイ後の確認

### 1. Pod状態の確認

```bash
kubectl get pods -n loghoihoi
```

**期待される出力:**
```
NAME                                  READY   STATUS    RESTARTS   AGE
elasticsearch-xxxx                    1/1     Running   0          2m
loghoi-backend-xxxx                   1/1     Running   0          1m
loghoi-frontend-xxxx                  1/1     Running   0          1m
```

### 2. Service確認

```bash
kubectl get svc -n loghoihoi
```

**期待される出力:**
```
NAME                      TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
elasticsearch-service     ClusterIP   10.x.x.x        <none>        9200/TCP   2m
loghoi-backend-service    ClusterIP   10.x.x.x        <none>        7776/TCP   1m
loghoi-frontend-service   ClusterIP   10.x.x.x        <none>        7777/TCP   1m
```

### 3. Ingress確認

```bash
kubectl get ingress -n loghoihoi
```

**期待される出力:**
```
NAME             CLASS               HOSTS   ADDRESS        PORTS   AGE
loghoi-ingress   kommander-traefik   *       10.55.23.41    80      1m
```

### 4. PVC確認

```bash
kubectl get pvc -n loghoihoi
```

**期待される出力:**
```
NAME                      STATUS   VOLUME                                     CAPACITY   STORAGECLASS     AGE
elasticsearch-data        Bound    pvc-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx   10Gi       nutanix-volume   2m
loghoi-backend-output     Bound    pvc-yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy   10Gi       nutanix-volume   1m
```

### 5. ログ確認

```bash
# Backend ログ
kubectl logs -n loghoihoi -l app=loghoi,component=backend --tail=50

# Frontend ログ
kubectl logs -n loghoihoi -l app=loghoi,component=frontend --tail=50

# Elasticsearch ログ
kubectl logs -n loghoihoi -l app=elasticsearch --tail=50
```

### 6. アプリケーションへのアクセス

```bash
# Ingress IPアドレスを取得
INGRESS_IP=$(kubectl get ingress loghoi-ingress -n loghoihoi -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "Application URL: http://${INGRESS_IP}"
```

ブラウザで以下にアクセス:
- **フロントエンド**: `http://<INGRESS_IP>/`
- **バックエンドAPI**: `http://<INGRESS_IP>/api/`
- **API ドキュメント**: `http://<INGRESS_IP>/docs`

---

## トラブルシューティング

### 1. Podが起動しない

#### 症状: `ImagePullBackOff` エラー

```bash
kubectl describe pod <pod-name> -n loghoihoi
```

**原因**: Dockerイメージが見つからない

**解決方法**:
```bash
# イメージを確認
kubectl get deployment -n loghoihoi -o yaml | grep image:

# イメージが存在するか確認
docker images | grep loghoi
```

#### 症状: `CrashLoopBackOff` エラー

```bash
kubectl logs <pod-name> -n loghoihoi --previous
```

**原因**: アプリケーションエラー

**解決方法**:
- ログを確認してエラー原因を特定
- ConfigMapやSecretが正しく設定されているか確認

### 2. SSH接続エラー

#### 症状: Backend ログに「SSH認証エラー」

```bash
kubectl logs -n loghoihoi -l component=backend | grep "SSH"
```

**原因**: SSH公開鍵がNutanix Prismに登録されていない

**解決方法**:
1. UIの「Open SSH KEY」ボタンをクリック
2. 公開鍵をコピー
3. Prism Element > Settings > Cluster Lockdown
4. 「Add Public Key」で公開鍵を登録

詳細は[SSH_KEY_MANAGEMENT_SPEC.md](../SSH_KEY_MANAGEMENT_SPEC.md)を参照。

### 3. PVCが Pending 状態

```bash
kubectl describe pvc <pvc-name> -n loghoihoi
```

**原因**: StorageClassが存在しない、またはProvisioner未稼働

**解決方法**:
```bash
# StorageClassを確認
kubectl get storageclass

# default StorageClassが存在するか確認
kubectl get storageclass | grep "(default)"

# CSI Driverが稼働しているか確認
kubectl get pods -n kube-system | grep csi
```

### 4. Ingressでアクセスできない

```bash
kubectl get ingress -n loghoihoi -o yaml
```

**原因**: IngressClassが存在しない、またはLoadBalancer未設定

**解決方法**:
```bash
# IngressClassを確認
kubectl get ingressclass

# Ingress Controllerが稼働しているか確認
kubectl get pods -n kommander | grep traefik

# MetalLB（またはLoadBalancer）が稼働しているか確認
kubectl get pods -n metallb-system
```

### 5. Elasticsearch接続エラー

```bash
# Elasticsearchの状態確認
kubectl exec -n loghoihoi deployment/loghoi-backend -- curl -s http://elasticsearch-service:9200/_cluster/health
```

**期待される出力**:
```json
{"status":"green","number_of_nodes":1,...}
```

**解決方法**:
- Elasticsearchが起動しているか確認
- Service名が正しいか確認（`elasticsearch-service`）
- ネットワークポリシーがブロックしていないか確認

---

## スケーリング

### 手動スケーリング

```bash
# Backend を3レプリカにスケール
kubectl scale deployment loghoi-backend -n loghoihoi --replicas=3

# Frontend を2レプリカにスケール
kubectl scale deployment loghoi-frontend -n loghoihoi --replicas=2
```

### HPA（Horizontal Pod Autoscaler）

```bash
# HPAを適用
kubectl apply -f hpa.yaml

# HPA状態確認
kubectl get hpa -n loghoihoi
kubectl describe hpa loghoi-backend-hpa -n loghoihoi
```

---

## アップデート

### イメージのアップデート

```bash
# 新しいイメージをビルド
cd /home/nutanix/konchangakita/blog-loghoi/ongoing/k8s
./build-and-push.sh

# Deploymentを更新
kubectl set image deployment/loghoi-backend \
  backend=<your-registry>/loghoi-backend:<new-version> \
  -n loghoihoi

# ローリングアップデートの状態確認
kubectl rollout status deployment/loghoi-backend -n loghoihoi
```

### ロールバック

```bash
# ロールバック
kubectl rollout undo deployment/loghoi-backend -n loghoihoi

# 特定のリビジョンにロールバック
kubectl rollout undo deployment/loghoi-backend --to-revision=2 -n loghoihoi

# リビジョン履歴確認
kubectl rollout history deployment/loghoi-backend -n loghoihoi
```

---

## アンインストール

### 完全削除

```bash
# namespace削除（すべてのリソースが削除される）
kubectl delete namespace loghoihoi
```

### 個別削除

```bash
# Deploymentのみ削除
kubectl delete deployment --all -n loghoihoi

# Servicesのみ削除
kubectl delete svc --all -n loghoihoi

# PVCのみ削除（データも削除される）
kubectl delete pvc --all -n loghoihoi
```

**注意**: PVCを削除すると、Elasticsearchのデータも削除されます。バックアップを取ってから削除してください。

---

## 環境別の設定

### NKP (Nutanix Kubernetes Platform)

```bash
# kubeconfig設定
export KUBECONFIG=/home/nutanix/nkp/kon-hoihoi.conf

# デプロイ
./deploy.sh
```

### GKE (Google Kubernetes Engine)

```bash
# gcloud設定
gcloud container clusters get-credentials <cluster-name> --region <region>

# デプロイ
./deploy.sh
```

### EKS (Amazon Elastic Kubernetes Service)

```bash
# aws-cli設定
aws eks update-kubeconfig --name <cluster-name> --region <region>

# デプロイ
./deploy.sh
```

### AKS (Azure Kubernetes Service)

```bash
# az-cli設定
az aks get-credentials --resource-group <resource-group> --name <cluster-name>

# デプロイ
./deploy.sh
```

---

## 参考資料

- [README.md](./README.md) - 技術詳細とマニフェスト仕様
- [KUBERNETES_SPEC.md](./KUBERNETES_SPEC.md) - Kubernetes仕様書
- [SSH_KEY_MANAGEMENT_SPEC.md](../SSH_KEY_MANAGEMENT_SPEC.md) - SSH鍵管理仕様
- [DEPLOYMENT_STATUS.md](./DEPLOYMENT_STATUS.md) - デプロイ状況記録

---

## サポート

問題が解決しない場合は、以下を確認してください:

1. [トラブルシューティング](#トラブルシューティング)セクション
2. 各仕様書のトラブルシューティングセクション
3. GitHub Issues: https://github.com/konchangakita/blog-loghoi/issues

---

**最終更新**: 2025-10-13  
**バージョン**: v1.0.0

