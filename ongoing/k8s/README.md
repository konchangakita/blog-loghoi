# Kubernetes デプロイメント

## 📋 概要

このディレクトリには、**LogHoihoi（Nutanixログホイホイ）** のKubernetesマニフェストファイルが含まれています。

HostPath対応により、CSI Driver不要で即座にデプロイ可能な開発・検証環境から、カスタムStorageClassを使用した本番環境まで、柔軟なデプロイをサポートします。

---

## 🚀 クイックスタート

```bash
cd /home/nutanix/konchangakita/blog-loghoi/ongoing/k8s
KUBECONFIG=/path/to/your/kubeconfig.conf ./deploy.sh
```

**たったこれだけでデプロイ完了！**

詳細な手順は **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** を参照してください。

---

## 📦 StorageClass設定

### デフォルト（HostPath - 推奨: 開発環境）

```bash
./deploy.sh
```

- ✅ CSI Driver不要
- ✅ 即座にデプロイ可能
- ⚠️ 単一ノード限定

### カスタムStorageClass（推奨: 本番環境）

```bash
STORAGE_CLASS=nutanix-volume ./deploy.sh  # NKP
STORAGE_CLASS=gp3 ./deploy.sh              # AWS EKS
STORAGE_CLASS=standard ./deploy.sh         # GKE
```

- ✅ 高可用性対応
- ✅ 本番環境推奨

---

## 🏗️ アーキテクチャ

```
Internet/LAN
    ↓
[Ingress: Traefik]
    ├─► Frontend (Next.js) - Port 7777
    ├─► Backend (FastAPI) - Port 7776
    ├─► Kibana - Port 5601
    └─► Syslog (LoadBalancer) - Port 7515/5066
         ↓
    [Elasticsearch] - Port 9200
         ↓
    [PVC: HostPath or Custom StorageClass]
```

## 📚 主要コンポーネント

| コンポーネント | 説明 | レプリカ数 | デプロイ戦略 |
|---|---|---|---|
| **Frontend** | Next.js アプリケーション | 2 | RollingUpdate |
| **Backend** | FastAPI + Socket.IO | 1 | Recreate (HostPath対応) |
| **Elasticsearch** | ログデータストア | 1 | Recreate (HostPath対応) |
| **Kibana** | データ可視化 | 1 | RollingUpdate |
| **Syslog** | Syslogサーバー | 1 | RollingUpdate |

**デプロイ戦略**:
- **Recreate**: HostPath(RWO)使用時、古Podを完全停止後に新Podを起動（ロック競合防止）
- **RollingUpdate**: ゼロダウンタイムデプロイ

---

## 📖 ドキュメント

| ドキュメント | 内容 |
|---|---|
| **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** | **📘 完全なデプロイ手順** - 前提条件、詳細手順、トラブルシューティング |
| [KUBERNETES_SPEC.md](./KUBERNETES_SPEC.md) | 📋 技術仕様 - アーキテクチャ、リソース設定、マニフェスト詳細 |
| [KIBANA_DEPLOYMENT.md](./KIBANA_DEPLOYMENT.md) | 📊 Kibanaデプロイ手順 |
| [DEPLOYMENT_STATUS.md](./DEPLOYMENT_STATUS.md) | 📈 デプロイ状況記録 |

---

## 🎯 前提条件

- ✅ Kubernetes 1.24以上
- ✅ kubectl CLI
- ✅ Ingress Controller (Traefik等)

**ストレージ**:
- デフォルト: HostPath使用（StorageClass不要）
- オプション: カスタムStorageClass使用可能

詳細は **[DEPLOYMENT_GUIDE.md - 前提条件](./DEPLOYMENT_GUIDE.md#前提条件)** を参照

---

## 📂 マニフェストファイル一覧

| ファイル | 内容 |
|---|---|
| `deploy.sh` | 🚀 自動デプロイスクリプト（推奨） |
| `configmap.yaml` | アプリケーション設定 |
| `nginx-config.yaml` | Nginx設定 |
| `elasticsearch-deployment.yaml` | Elasticsearch Deployment |
| `elasticsearch-pvc.yaml` | Elasticsearch PVC（参照用） |
| `backend-deployment.yaml` | Backend Deployment |
| `backend-output-pvc.yaml` | Backend PVC（参照用） |
| `frontend-deployment.yaml` | Frontend Deployment |
| `kibana-deployment.yaml` | Kibana Deployment |
| `syslog-deployment.yaml` | Syslog Deployment |
| `services.yaml` | 全Service定義 |
| `ingress.yaml` | Ingress設定 |
| `hpa.yaml` | HPA設定（オプション） |

**注意**: PVC YAMLファイルは参照用です。実際のPVCは`deploy.sh`で動的生成されます。

---

## 📖 詳細ドキュメント

すべての詳細情報は以下のドキュメントを参照してください：

| ドキュメント | 内容 |
|---|---|
| **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** ⭐ | **完全なデプロイ手順**（必読） |
| [KUBERNETES_SPEC.md](./KUBERNETES_SPEC.md) | 技術仕様とアーキテクチャ詳細 |
| [KIBANA_DEPLOYMENT.md](./KIBANA_DEPLOYMENT.md) | Kibanaデプロイとデータ可視化 |
| [DEPLOYMENT_STATUS.md](./DEPLOYMENT_STATUS.md) | デプロイ状況記録 |

---

## 🔧 よく使うコマンド

### デプロイ状態確認
```bash
kubectl --kubeconfig=/path/to/kubeconfig.conf get pods,pvc,ingress -n loghoihoi
```

### ログ確認
```bash
kubectl --kubeconfig=/path/to/kubeconfig.conf logs -f -n loghoihoi -l component=backend
```

### アンインストール
```bash
kubectl --kubeconfig=/path/to/kubeconfig.conf delete namespace loghoihoi
kubectl --kubeconfig=/path/to/kubeconfig.conf delete pv elasticsearch-data-pv backend-output-pv
```

---

## 📞 サポート

問題が発生した場合は、**[DEPLOYMENT_GUIDE.md - トラブルシューティング](./DEPLOYMENT_GUIDE.md#トラブルシューティング)** を参照してください。
