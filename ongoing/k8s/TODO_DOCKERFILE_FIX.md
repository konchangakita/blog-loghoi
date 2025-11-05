# Dockerfile ビルドコンテキスト修正タスク

**作成日**: 2025-10-09  
**ステータス**: 未着手  
**優先度**: 🔴 High（Kubernetesデプロイに必須）

---

## 🎯 **目的**
Kubernetes用Dockerfileのビルドコンテキストを`./backend`から`./ongoing`に変更し、`shared`ディレクトリを正しくCOPYできるようにする。

---

## ❌ **現在の問題**

### **エラー内容**
```
COPY failed: forbidden path outside the build context: ../shared ()
ModuleNotFoundError: No module named 'shared'
ModuleNotFoundError: No module named 'config'
```

### **原因**
- ビルドコンテキストが`./backend`のため、親ディレクトリの`../shared`にアクセスできない
- `config`ディレクトリがコピーされていない（JSONファイルが必要）
- `PYTHONPATH`が設定されていない

---

## ✅ **解決策**

### **修正ファイル**

#### **1. `backend/Dockerfile.k8s`**

**変更前:**
```dockerfile
WORKDIR /app
COPY requirements.txt .
COPY fastapi_app ./fastapi_app
COPY core ./core
COPY ../shared ./shared  # ❌ エラー
```

**変更後:**
```dockerfile
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -U pip && \
    pip install --no-cache-dir -r requirements.txt

COPY backend/fastapi_app ./fastapi_app
COPY backend/core ./core
COPY backend/config ./config  # ✅ JSONファイル用
COPY shared ./shared           # ✅ 解決！

# Python パス設定
ENV PYTHONPATH=/app:/app/shared
```

#### **2. `k8s/build-and-push.sh`**

**変更箇所:**
```bash
# Backend ビルド
echo "Building backend image..."
cd ${PROJECT_ROOT}/ongoing  # ← ビルドコンテキスト変更
docker build -f backend/Dockerfile.k8s \
  -t ${DOCKER_REGISTRY}/${DOCKER_NAMESPACE}/loghoi-backend:${VERSION} \
  -t ${DOCKER_REGISTRY}/${DOCKER_NAMESPACE}/loghoi-backend:latest \
  .

# Frontend ビルド（同様に修正）
echo "Building frontend image..."
docker build -f frontend/next-app/loghoi/Dockerfile.k8s \
  -t ${DOCKER_REGISTRY}/${DOCKER_NAMESPACE}/loghoi-frontend:${VERSION} \
  -t ${DOCKER_REGISTRY}/${DOCKER_NAMESPACE}/loghoi-frontend:latest \
  frontend/next-app/loghoi
```

#### **3. `ongoing/.dockerignore`（新規作成）**

```
# Git関連
.git/
.gitignore
.github/

# ドキュメント
*.md
!README.md

# テスト
tests/
*.test.py
*.spec.ts

# ログ・一時ファイル
*.log
*.tmp
__pycache__/
*.pyc

# 過去のコード
blog/

# データディレクトリ
elastic/es-data/
backend/output/

# IDE
.vscode/
.cursor/
.idea/
```

#### **4. `k8s/backend-deployment.yaml`**

```yaml
containers:
- name: backend
  image: konchangakita/loghoi-backend:v1.0.3  # ← 新バージョン
  imagePullPolicy: Always
```

---

## 📋 **実施手順**

### **Phase 1: ブランチ作成**
```bash
cd .
git checkout refactor
git pull origin refactor
git checkout -b feature/fix-k8s-dockerfile-context
```

### **Phase 2: ファイル修正**
1. `backend/Dockerfile.k8s` を上記の通り修正
2. `k8s/build-and-push.sh` を修正
3. `ongoing/.dockerignore` を新規作成
4. `k8s/backend-deployment.yaml` のイメージタグ更新

### **Phase 3: ビルド＆テスト**
```bash
cd k8s

# ビルドテスト
./build-and-push.sh

# 成功したら Docker Hub へ push
# （PUSH_IMAGES=true を build-and-push.sh に追加）

# Kubernetes デプロイ
./deploy.sh

# Pod 状態確認
kubectl --kubeconfig="/home/nutanix/nkp/kon-hoihoi.conf" get pods -n loghoihoi -w

# ログ確認
kubectl --kubeconfig="/home/nutanix/nkp/kon-hoihoi.conf" logs -n loghoihoi -l app=loghoi,component=backend --tail=50
```

### **Phase 4: 動作確認**
```bash
# Ingress IP確認
kubectl --kubeconfig="/home/nutanix/nkp/kon-hoihoi.conf" get ingress -n loghoihoi

# アプリケーションアクセス
curl http://10.55.23.41/api/health
curl http://10.55.23.41/
```

### **Phase 5: PR作成＆マージ**
```bash
git add -A
git commit -m "fix: Dockerfileのビルドコンテキストをongoing/に変更

- shared/config ディレクトリを正しくCOPY可能に
- PYTHONPATH を設定
- .dockerignore でビルド最適化
- build-and-push.sh を修正"

git push origin feature/fix-k8s-dockerfile-context

gh pr create \
  --base refactor \
  --title "fix: Kubernetes用Dockerfileのビルドコンテキスト修正" \
  --body "## 修正内容
- Dockerfileのビルドコンテキストを ongoing/ に変更
- shared, config ディレクトリを正しくCOPY
- PYTHONPATH 環境変数を設定
- .dockerignore でビルド最適化

## テスト
- ✅ Docker イメージビルド成功
- ✅ Docker Hub push 成功
- ✅ Kubernetes デプロイ成功
- ✅ Pod 起動確認
- ✅ ヘルスチェック OK"
```

---

## 📁 **ディレクトリ構成（再確認）**

```
ongoing/
├── backend/
│   ├── fastapi_app/     # ✅ 必須
│   ├── core/            # ✅ 必須
│   ├── config/          # ✅ 必須（JSONファイル）
│   │   ├── col_command.json
│   │   ├── col_logfile.json
│   │   └── .ssh/        # Secret でマウント
│   ├── requirements.txt # ✅ 必須
│   └── Dockerfile.k8s   # 修正対象
├── shared/              # ✅ 必須
│   ├── config/
│   │   └── settings.py  # Config クラス
│   └── gateways/
├── frontend/
│   └── next-app/loghoi/
│       └── Dockerfile.k8s
└── k8s/
    ├── build-and-push.sh  # 修正対象
    └── *.yaml
```

---

## 🔄 **開発環境との整合性**

| 項目 | 開発環境 | Kubernetes（修正後） | 状態 |
|------|---------|---------------------|------|
| **shared** | volumeマウント | COPY | ✅ 統一 |
| **config** | volumeマウント | COPY | ✅ 統一 |
| **core** | volumeマウント | COPY | ✅ 統一 |
| **fastapi_app** | volumeマウント | COPY | ✅ 統一 |
| **PYTHONPATH** | `/usr/src:/usr/src/shared` | `/app:/app/shared` | ✅ 統一 |
| **WORKDIR** | `/usr/src` | `/app` | ⚠️ 異なるがOK |

---

## 🚀 **完了後の状態**

```bash
# イメージサイズ予想
konchangakita/loghoi-backend:v1.0.3  # 約 400MB（shared追加で+14MB程度）
konchangakita/loghoi-frontend:v1.0.0 # 238MB（変更なし）

# デプロイ後
kubectl get pods -n loghoihoi
# NAME                               READY   STATUS    RESTARTS   AGE
# elasticsearch-xxx                  1/1     Running   0          10m
# loghoi-backend-xxx                 2/2     Running   0          5m  ← ✅ 成功
# loghoi-frontend-xxx                2/2     Running   0          5m  ← ✅ 成功

# アクセス
curl http://10.55.23.41
# ✅ Welcome to Log Hoihoi!
```

---

## ⏭️ **次回の開始手順**

```bash
# 1. このファイルを確認
cat k8s/TODO_DOCKERFILE_FIX.md

# 2. featureブランチ作成
cd .
git checkout refactor
git pull origin refactor
git checkout -b feature/fix-k8s-dockerfile-context

# 3. 修正開始
# - backend/Dockerfile.k8s
# - k8s/build-and-push.sh
# - ongoing/.dockerignore（新規）

# 4. テスト → PR → マージ → デプロイ完了！
```

---

**所要時間見積もり**: 約30分〜1時間  
**リスク**: Low（ローカルでテスト可能）

