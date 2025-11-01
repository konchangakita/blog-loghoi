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

| コンポーネント | 説明 | レプリカ数 | デプロイ戦略 |
|---|---|---|---|
| **Frontend** | Next.js アプリケーション | 2 | RollingUpdate |
| **Backend** | FastAPI + Socket.IO | 1 | **Recreate** (HostPath使用) |
| **Elasticsearch** | ログデータストア | 1 | **Recreate** (HostPath使用) |
| **Kibana** | Elasticsearchデータ可視化 | 1 | RollingUpdate |
| **Syslog** | Syslogサーバー | 1 | RollingUpdate |
| **Ingress** | Traefik Ingress Controller | - | - |

**注意**: HostPath(ReadWriteOnce)使用時は、Recreate戦略が必須（ロックファイル競合防止）

---

## 前提条件

### 必須要件

- ✅ **Kubernetes クラスタ**: v1.24以上
- ✅ **kubectl CLI**: インストール済み
- ✅ **kubeconfig**: クラスタへのアクセス設定済み
- ✅ **Helm**: Traefik自動インストール用（未インストールの場合は自動インストール時にエラー表示）

### 推奨要件

- ✅ **Ingress Controller**: Traefikが既にインストールされている場合、自動検出して使用します
  - 未インストールの場合: 自動インストールを試行（Helm必要）
  - 他のIngress Controller使用時: 警告表示後、Traefikインストールを選択可能

### ストレージ要件

LogHoihoiは以下のいずれかのストレージ構成が必要です：

#### デフォルト構成（HostPath）
- ✅ **ノードへの書き込み権限**: `/mnt/loghoi/` ディレクトリ作成可能
- ✅ **単一ノード環境**: Podが同じノードにスケジュールされる
- 💡 **用途**: 開発・検証環境向け

#### カスタムStorageClass構成（推奨: 本番環境）
- ✅ **StorageClass**: クラスタに設定済み
- ✅ **Dynamic Provisioner**: CSI Driver等が稼働中
- 💡 **用途**: 本番環境、高可用性が必要な環境

### 追加推奨要件

- ✅ **MetalLB**: LoadBalancer IP割り当て（オンプレ環境の場合）
- ✅ **Nutanix CSI**: Nutanix環境の場合（カスタムStorageClass使用時）

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

#### デフォルト（HostPath使用）

```bash
cd /home/nutanix/konchangakita/blog-loghoi/ongoing/k8s
KUBECONFIG=/path/to/your/kubeconfig.conf ./deploy.sh
```

デフォルトでは`manual` StorageClass（HostPath）を使用します。開発・検証環境向けの設定です。

#### カスタムStorageClass使用

```bash
cd /home/nutanix/konchangakita/blog-loghoi/ongoing/k8s
KUBECONFIG=/path/to/your/kubeconfig.conf STORAGE_CLASS=my-storage-class ./deploy.sh
```

本番環境や、独自のStorageClassを使用する場合は環境変数で指定できます。

### スクリプトが自動的に行うこと

1. ✅ クラスタ接続確認
2. ✅ Namespace作成 (`loghoihoi`)
3. ✅ **SSH鍵の自動生成・管理**
   - 既存の鍵がある場合: そのまま使用
   - 鍵が無い場合: 新規生成して公開鍵を表示
   - Nutanix Prismへの登録確認
4. ✅ Kubernetes Secret作成 (SSH鍵)
5. ✅ **Traefik Ingress Controllerの確認と自動インストール**
   - 既にTraefikがインストール済み: 検出してスキップ
   - 他のIngress Controller検出時: 警告表示して確認
   - 未インストール時: 自動インストール（Helm使用）
6. ✅ リソースのデプロイ（順序）
   - ConfigMap / Nginx ConfigMap
   - Ingress Controller確認・インストール（上記）
   - Persistent Volumes / PVC
   - Elasticsearch
   - Services
   - Backend / Frontend
   - Ingress
   - Kibana / Syslog（オプション）

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

#### デフォルト（HostPath使用）

```bash
# 自動的にPVとPVCが作成されます（deploy.sh実行時）
# 手動で作成する場合は以下を実行：

# ノード名を取得
NODE_NAME=$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')

# PV作成（HostPath）
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolume
metadata:
  name: elasticsearch-data-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: manual
  hostPath:
    path: /mnt/loghoi/elasticsearch-data
    type: DirectoryOrCreate
---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: backend-output-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: manual
  hostPath:
    path: /mnt/loghoi/backend-output
    type: DirectoryOrCreate
EOF

# PVC作成
STORAGE_CLASS=manual
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: elasticsearch-data
  namespace: loghoihoi
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: $STORAGE_CLASS
  resources:
    requests:
      storage: 10Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: loghoi-backend-output
  namespace: loghoihoi
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: $STORAGE_CLASS
  resources:
    requests:
      storage: 10Gi
EOF
```

#### カスタムStorageClass使用

```bash
# 環境変数でStorageClassを指定
STORAGE_CLASS=my-storage-class

# PVC作成（PVは不要、Dynamic Provisioningが自動作成）
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: elasticsearch-data
  namespace: loghoihoi
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: $STORAGE_CLASS
  resources:
    requests:
      storage: 10Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: loghoi-backend-output
  namespace: loghoihoi
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: $STORAGE_CLASS
  resources:
    requests:
      storage: 10Gi
EOF
```

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
NAME                      TYPE           CLUSTER-IP      EXTERNAL-IP   PORT(S)                       AGE
elasticsearch-service     ClusterIP      10.x.x.x        <none>        9200/TCP                      2m
kibana-service            ClusterIP      10.x.x.x        <none>        5601/TCP                      2m
loghoi-backend-service    ClusterIP      10.x.x.x        <none>        7776/TCP                      1m
loghoi-frontend-service   ClusterIP      10.x.x.x        <none>        7777/TCP                      1m
loghoi-syslog-service     LoadBalancer   10.x.x.x        10.55.11.47   7515:30760/TCP,5066:31609/TCP 1m
```

**重要**: `loghoi-syslog-service`の`EXTERNAL-IP`がSyslogサーバーのアドレスです。
- **Syslog送信先**: `EXTERNAL-IP:7515` (例: 10.55.11.47:7515)
- **Metrics確認**: `EXTERNAL-IP:5066` (例: 10.55.11.47:5066)

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
- **API ドキュメント (Swagger UI)**: `http://<INGRESS_IP>/api/docs`
  - API定義の閲覧・テストが可能
  - OpenAPIスキーマ (`/api/openapi.json`) を自動的に読み込み
- **API ドキュメント (ReDoc)**: `http://<INGRESS_IP>/api/redoc`
  - API定義の閲覧が可能（Swagger UIの代替）
  - OpenAPIスキーマ (`/api/openapi.json`) を自動的に読み込み
- **Kibana**: `http://<INGRESS_IP>/kibana`

### 7. トラブルシューティング用コマンド

デプロイスクリプトの実行後、以下のURLが自動的に表示されます：

- **Kibana接続URL**: `http://<INGRESS_IP>/kibana`
- **Backend API一覧 (Swagger UI)**: `http://<INGRESS_IP>/api/docs`
- **Backend API一覧 (ReDoc)**: `http://<INGRESS_IP>/api/redoc`

直接ポートフォワードで接続する場合：
```bash
# Backendへの直接接続
kubectl port-forward -n loghoihoi svc/loghoi-backend-service 7776:7776
# アクセス: http://localhost:7776
```

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

#### HostPath使用時

**原因**: PVとPVCのStorageClassが一致していない

**解決方法**:
```bash
# PVのStorageClassを確認
kubectl get pv -o custom-columns=NAME:.metadata.name,STORAGECLASS:.spec.storageClassName

# PVCのStorageClassを確認
kubectl get pvc -n loghoihoi -o custom-columns=NAME:.metadata.name,STORAGECLASS:.spec.storageClassName

# 不一致の場合はPVを削除して再作成
kubectl delete pv elasticsearch-data-pv backend-output-pv
# deploy.shを再実行
./deploy.sh
```

#### カスタムStorageClass使用時

**原因**: StorageClassが存在しない、またはProvisioner未稼働

**解決方法**:
```bash
# StorageClassを確認
kubectl get storageclass

# 指定したStorageClassが存在するか確認
kubectl get storageclass my-storage-class

# CSI Driverが稼働しているか確認
kubectl get pods -n kube-system | grep csi

# StorageClassが無い場合は環境変数を変更
STORAGE_CLASS=manual ./deploy.sh  # HostPathに切り替え
```

### 4. Ingressでアクセスできない

```bash
kubectl get ingress -n loghoihoi -o yaml
```

**原因**: IngressClassが存在しない、Traefikが未起動、またはLoadBalancer未設定

**解決方法**:
```bash
# IngressClassを確認
kubectl get ingressclass

# Traefikが稼働しているか確認
kubectl get pods -n kommander | grep traefik

# Traefik ServiceのLoadBalancer IPを確認
kubectl get svc -n kommander traefik

# MetalLB（またはLoadBalancer）が稼働しているか確認
kubectl get pods -n metallb-system

# デプロイスクリプトで自動インストール（推奨）
# Traefikが未インストールの場合、自動的にインストールを試行します
```

**注意**: デプロイスクリプト（`deploy.sh`）は自動的にTraefikのインストール状態を確認し、未インストールの場合は自動インストールを試行します。手動でインストールする場合は、Helmを使用してください：

```bash
# Helmリポジトリ追加
helm repo add traefik https://traefik.github.io/charts
helm repo update

# Traefikインストール
helm install traefik traefik/traefik \
  -f traefik-values.yaml \
  -n kommander \
  --create-namespace
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

#### Frontend（スケール可能）

```bash
# Frontend を3レプリカにスケール
kubectl scale deployment loghoi-frontend -n loghoihoi --replicas=3
```

#### Backend/Elasticsearch（HostPath使用時は不可）

**⚠️ 注意**: HostPath(ReadWriteOnce)使用時は、BackendとElasticsearchのスケールは**不可**です。

- BackendとElasticsearchはPVC(ReadWriteOnce)を使用
- 複数レプリカは同じPVCに同時アクセス不可
- スケールするには、ReadWriteMany対応のStorageClassが必要

**カスタムStorageClass使用時のみスケール可能**:
```bash
# ReadWriteMany対応StorageClassでデプロイした場合のみ
kubectl scale deployment loghoi-backend -n loghoihoi --replicas=3
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

# デフォルト（HostPath）
./deploy.sh

# CSI利用の場合
STORAGE_CLASS=nutanix-volume ./deploy.sh
```

### GKE (Google Kubernetes Engine)

```bash
# gcloud設定
gcloud container clusters get-credentials <cluster-name> --region <region>

# GKE標準StorageClass使用
STORAGE_CLASS=standard ./deploy.sh

# SSD使用
STORAGE_CLASS=standard-rwo ./deploy.sh
```

### EKS (Amazon Elastic Kubernetes Service)

```bash
# aws-cli設定
aws eks update-kubeconfig --name <cluster-name> --region <region>

# EBS使用
STORAGE_CLASS=gp2 ./deploy.sh

# または gp3
STORAGE_CLASS=gp3 ./deploy.sh
```

### AKS (Azure Kubernetes Service)

```bash
# az-cli設定
az aks get-credentials --resource-group <resource-group> --name <cluster-name>

# Azure Disk使用
STORAGE_CLASS=default ./deploy.sh

# または managed-csi
STORAGE_CLASS=managed-csi ./deploy.sh
```

### 開発・検証環境（どの環境でも）

```bash
# HostPath使用（StorageClass不要）
STORAGE_CLASS=manual ./deploy.sh
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

---

## 📦 StorageClass設定まとめ

### デフォルト（HostPath）

```bash
# 環境変数不要（デフォルト）
./deploy.sh

# または明示的に指定
STORAGE_CLASS=manual ./deploy.sh
```

**特徴**:
- ✅ StorageClassやCSI Driver不要
- ✅ 即座にデプロイ可能
- ⚠️ 単一ノード限定
- ⚠️ データ永続性は中程度（ノード障害時に損失）

### カスタムStorageClass

```bash
# 環境変数で指定
STORAGE_CLASS=your-storage-class ./deploy.sh
```

**特徴**:
- ✅ Dynamic Provisioning（自動PV作成）
- ✅ 高可用性（HA）対応
- ✅ 本番環境推奨
- ⚠️ StorageClassとCSI Driverが必要

### StorageClass一覧確認

```bash
# 利用可能なStorageClassを確認
kubectl get storageclass
```

---

**最終更新**: 2025-11-01  
**バージョン**: v1.1.1 - Backend API (Swagger UI/ReDoc) アクセス修正対応

