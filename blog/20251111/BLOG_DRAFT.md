## LogHoihoi 2025-11-11 リリースノート兼実装記録（ブログ下書き）

### 概要
Nutanix ログほいほいついにKubernetes化に対応です
Kubernetes化に合わせて、大きくリファクタリングも行いました
変更点をピックアップです

- **リファクタリング方針（Tidy First）**で基盤整備を優先し、以降の機能追加を速く安全にする
- **バックエンドAPIの変更** Flask から FastAPI へ
- **docker-compose 開発環境を維持**し、日常開発の摩擦を最小化
- **Kubernetes化の実装ポイント**（Dockerfile分離、StorageClass戦略、Recreate戦略、Traefik/MetalLB、ヘルスチェック）
- **認証用SSH鍵の管理方式を統一**（K8sはSecret、composeはホストパス）
- **運用整備：バージョニング、レジストリ移行、ドキュメントの相対パス化、snapshot運用（blog/20251111）**

---

### リファクタリング方針：Tidy First で「掃除してから進む」

- **狙い**: 変更容易性を上げるために、設計負債や運用上のひっかかりを先に解消。
- **今回のTidy例**:
  - Ingress のルール整理（`/docs`/`/redoc` の `pathType: Prefix`、不要Middleware/IngressRouteの削除）
  - Dockerfileの用途分離（`dockerfile`=開発、`Dockerfile.k8s`=本番）
  - ストレージとデプロイ戦略の統一（HostPath=Recreate、RWXがない前提を明文化）
  - 依存関係の整合（`aiohttp`をrequirementsへ追加、未使用`httpx`を削除）
  - ドキュメントの相対パス化（複製先でもデプロイ可能に）

ポイントは「小さく安全に片付ける」を繰り返し、機能側の判断をシンプルに保つ

---

### `Swagger` と `ReDoc` の実装（FastAPI標準機能 + Ingress整備）

- バックエンドは FastAPI の標準機能で提供：
  - `app = FastAPI(docs_url="/docs", redoc_url="/redoc")`
  - 実体はアプリ内のOpenAPIスキーマ `/openapi.json` を参照
- Ingress 側の調整で静的アセットまで正しく到達：
  - `pathType: Prefix` に変更することで `/docs/*`/`/redoc/*` 配下の静的ファイルを確実にバックエンドへルーティング
  - `/api/docs` や `/api/redoc` のルーティングは廃止（FastAPIは `/docs` `/redoc` を前提）
  - Traefik Middleware/IngressRoute による `/api/openapi.json` → `/openapi.json` 変換は不要となり削除

読者Tips: ドキュメントUIにパスプリフィックスを足したい場合でも、まずはFastAPI標準を尊重し、Ingress側での過度な書き換えを避ける方が安定します。

---

### docker-compose 開発環境の維持

- **目的**: コンテキストスイッチの少ない日常開発を支援（ホットリロード、手元のElasticsearch/Kibana）
- **要点**
  - `docker-compose.yml` は、ボリュームマウントで `backend/fastapi_app` や `shared` を反映
  - Backend/Frontend は小文字 `dockerfile` を使用（開発専用）
  - `scripts/init-ssh-keys.sh` で初回鍵生成。UIの「Open SSH KEY」から公開鍵表示
  - FE から BE へのURLは `NEXT_PUBLIC_BACKEND_URL` で制御

開発と本番で「ファイル/環境変数/ストレージ/起動方法」が明確に分離され、相互の混入を防止。

---

### Kubernetes 化の実装ポイント（現実解の積み上げ）

- **Dockerfile分離**
  - 開発: `backend/dockerfile`, `frontend/dockerfile`, `syslog/dockerfile`
  - 本番: `*/Dockerfile.k8s`
  - 誤運用を防ぎつつ、CI/CDとローカル開発の両立を容易に

- **レジストリ**: GHCR（`ghcr.io/konchangakita/*`）へ移行
  - Pull安定性、公開設定で認証レスPull、バージョンタグ固定（例: `v1.1.1`）

- **ストレージ戦略**
  - デフォルトは HostPath `manual`（開発・検証向け）。PVCはRWOのため、Elasticsearch/Backendは **`strategy: Recreate`** を採用
  - 本番では `STORAGE_CLASS` を環境変数で差し替え（NKP等のCSIに対応）

- **Ingress / ネットワーク**
  - IngressClass: `kommander-traefik`
  - ルーティング: `/api`（API）, `/socket.io`（WebSocket）, `/docs` `/redoc`（API UI）, `/kibana`（UI）, `/`（FE）
  - MetalLB で LoadBalancer IP を割当

- **ヘルスチェック**
  - Backend: `/health`（liveness）, `/ready`（readiness）
  - Frontend/Elastic/Kibana にも適切なProbe

- **自動化スクリプト**
  - `k8s/deploy.sh` が Namespace、Traefik検出/インストール、PV/PVC、各種Manifest、Ingressまでを自動化

---

### 認証用SSH鍵の管理方式（K8s=Secret、compose=ホストパス）

- **共通方針**: 鍵はGit管理せず、ホストディレクトリ `config/.ssh/` に生成・保持
- **Kubernetes**
  - `deploy.sh` が `config/.ssh/` の鍵を検査し、なければ生成→Secret `loghoi-secrets` を作成
  - Deploymentで `/app/config/.ssh` にマウント、`SSH_KEY_PATH`/`SSH_PUBLIC_KEY_PATH` で参照
  - 初回は公開鍵をPrism Element（Cluster Lockdown）へ登録
- **docker-compose**
  - `./config/.ssh` をコンテナにマウント。環境変数で鍵パスを指定
  - 初回は `scripts/init-ssh-keys.sh` で鍵生成→公開鍵をUI/ファイルで確認
- **フロント連携**: SSH認証失敗を検知したら、UIで自動的に公開鍵表示を促す

---

### 参考：主要ファイル

- Ingress: `k8s/ingress.yaml`（`/docs`/`/redoc` は `Prefix`）
- デプロイ自動化: `k8s/deploy.sh`
- Backendエントリ: `backend/fastapi_app/app_fastapi.py`（`docs_url`/`redoc_url`）
- 依存関係: `backend/requirements.txt`（`aiohttp` 追加）
- Dockerfile群: `*/dockerfile`（開発用）, `*/Dockerfile.k8s`（本番用）
- 開発Compose: `docker-compose.yml`
- 鍵初期化: `scripts/init-ssh-keys.sh`
- 仕様ドキュメント: `k8s/KUBERNETES_SPEC.md`, `k8s/DEPLOYMENT_GUIDE.md`, `docs/SSH_KEY_MANAGEMENT_SPEC.md`

---

### 次の改善（アイデア）

- 鍵のローテーション自動化（可能ならPrism API連携）
- 本番向けのReadWriteMany対応ストレージ採用とスケール戦略拡張
- CIでのマニフェスト検証（`kubeval`/`kubectl diff`）とE2Eの最小セット整備
- GitHub Pages 連携で `blog/*` の自動公開

---

以上。記事公開時は図表の追加（Ingressルーティング図、ストレージ比較表、Tidy Firstの前後比較）を行うと伝わりやすくなります。


