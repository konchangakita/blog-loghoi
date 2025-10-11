# シスログ機能仕様書

## 概要
シスログ機能は、NutanixクラスターのシステムログをElasticsearchから検索・表示する機能です。キーワード、日時範囲を指定してログを検索し、結果を構造化して表示できます。

## バージョン
1.1.0（最終更新: 2025-10-10）

## 変更履歴
### v1.1.0（2025-10-10）
- **Kubernetes化**: SyslogサーバーをKubernetesにデプロイ（Filebeat）
- **hostname仕様変更**: Nutanixから送信されるSyslogのhostnameが`NTNX-<UUID>-<ノード名>-CVM`形式に変更
- **検索仕様変更**: クラスター名フィルタを削除（hostnameにクラスター名が含まれないため）
- **検索条件**: 日時範囲とキーワードのみで検索（ホストフィルタなし）
- **TODO**: クラスター識別の仕組みが必要（Filebeat側でタグ付与など）

### v1.0.0（2025-10-09）
- 初版リリース

## システム構成

### Syslogデータフロー（全体像）

```mermaid
graph LR
    A[Nutanix Cluster] -->|syslog送信| B[Syslogサーバー]
    B -->|Filebeat収集| C[Elasticsearch]
    C -->|検索| D[バックエンドAPI]
    D -->|結果返却| E[フロントエンド]
```

### 1. Nutanix Syslog送信設定
- **送信元**: Nutanix Cluster（Prism Element）
- **設定場所**: Prism Element > Settings > Syslog Server
- **送信プロトコル**: UDP/TCP（ポート514）
- **送信先**: Syslogサーバー（Filebeat稼働サーバー）
- **ログ形式**: RFC 3164/5424準拠

### 2. Syslogサーバー（Filebeat）
- **役割**: Nutanixから送信されたsyslogを受信し、Elasticsearchに転送
- **使用ツール**: Filebeat 7.17.9
- **受信ポート**: 7515（TCP）※Kubernetes環境
- **設定ファイル**: `filebeat.k8s.yml`
- **Kubernetes構成**:
  - Deployment: `loghoi-syslog`
  - Service: `LoadBalancer` (External IP: 10.55.23.42)
  - イメージ: `konchangakita/loghoi-syslog:v1.0.1`
- **処理フロー**:
  1. syslogメッセージを受信（TCP 7515）
  2. パース処理（タイムスタンプ、ホスト名、メッセージ）
  3. hostnameフィールドを抽出・保存（`NTNX-<UUID>-<ノード名>-CVM`形式）
  4. Elasticsearchに転送（`filebeat-*`インデックス）

### 3. Elasticsearch
- **インデックス**: `filebeat-*`
- **データ保存**: syslogメッセージを構造化して保存
- **保持期間**: 設定による（デフォルト: 無期限）

### 4. バックエンドAPI（FastAPI）
- **役割**: Elasticsearchからログを検索
- **エンドポイント**: `POST /api/sys/search`

### 5. フロントエンド（Next.js）
- **役割**: ログ検索UI、結果表示
- **URL**: `/syslog`

## 機能概要

### 主要機能
1. **ログ検索**: 日時範囲とキーワードによるログ検索
2. **結果表示**: 構造化されたログデータの表示（タイムスタンプ、ホスト名、メッセージ）
3. **フィルタリング**: 検索結果のリアルタイムフィルタリング
4. **ダウンロード**: 検索結果のテキストファイルダウンロード
5. **日時選択**: カレンダーUIによる日時範囲指定

### 現在の制限事項
- **クラスターフィルタなし**: 全クラスターのSyslogが混在して表示される
- **hostname形式**: Nutanix CVMのホスト名（`NTNX-<UUID>-<ノード名>-CVM`）で表示
- **クラスター識別不可**: Syslogメッセージ自体にクラスター名情報が含まれない

### 将来の改善案
1. **Filebeat側でタグ付与**: 送信元IPアドレスからクラスターを識別してカスタムフィールドを追加
2. **複数Syslogサーバー**: クラスターごとに異なるポートでSyslogを受信
3. **Elasticsearch後処理**: hostnameからクラスター情報を推定してフィールドを追加

### アクセス方法
- **URL**: `http://10.38.113.49:7777/syslog?pcip=*PC_IP*&cluster=*クラスタ名*&prism=*クラスタIP*`
- **URLパラメータ**:
  - `pcip`: PCのIPアドレス
  - `cluster`: クラスター名
  - `prism`: Prism ElementのIPアドレス

### 前提条件
1. **Nutanix側**: Prism ElementでSyslogサーバーが設定済み
2. **Syslogサーバー**: Filebeatが稼働し、syslogを受信中
3. **Elasticsearch**: Filebeatからのデータ受信が正常
4. **インデックス**: `filebeat-*`インデックスにデータが存在

## アーキテクチャ

### フロントエンド
- **フレームワーク**: Next.js (React)
- **UIライブラリ**: DaisyUI (Tailwind CSS)
- **日時選択**: react-datepicker
- **ファイルダウンロード**: file-saver
- **フォーム管理**: react-hook-form

### バックエンド
- **フレームワーク**: FastAPI
- **データベース**: Elasticsearch
- **APIエンドポイント**: `POST /api/sys/search`
- **検索方式**: 日時範囲 + キーワード（クラスター名フィルタなし）

### データフロー

#### ログ収集フロー（事前準備）
1. **Nutanix設定**: Prism ElementでSyslogサーバーを設定
2. **Syslog送信**: NutanixクラスターがSyslogサーバーにログを送信（UDP/TCP 514）
3. **Filebeat受信**: Syslogサーバー上のFilebeatがsyslogを受信
4. **パース処理**: Filebeatがsyslogメッセージをパース（タイムスタンプ、ホスト名、ファシリティ、重要度、メッセージ）
5. **Elasticsearch転送**: FilebeatがElasticsearchの`filebeat-*`インデックスに保存

#### ログ検索フロー（アプリケーション）
1. フロントエンドで検索条件を入力（クラスター名、キーワード、日時範囲）
2. FastAPIの`/api/sys/search`エンドポイントにPOSTリクエスト
3. `SyslogGateway`がElasticsearchからログを検索
4. 構造化されたログデータをフロントエンドに返却
5. フロントエンドでログを表示・フィルタリング・ダウンロード

## 詳細仕様

### 1. フロントエンド仕様

#### 1.1 ページ構成
```
/syslog/
├── layout.tsx          # レイアウト（ナビゲーションバー）
├── page.tsx           # メインページ
└── syslog-content.tsx # メインコンテンツ
```

#### 1.2 主要コンポーネント

##### SyslogContent
- **役割**: シスログ検索・表示のメインコンポーネント
- **状態管理**:
  - `resMsg`: 検索結果のログデータ
  - `isLoading`: 検索中のローディング状態
  - `isPageLoading`: ページ初期読み込み状態
  - `error`: エラーメッセージ
  - `filter`: フィルタリング用キーワード

##### フォーム項目
- **検索キーワード**: テキストエリア（必須）
- **開始日時**: DatePicker（デフォルト: 7日前）
- **終了日時**: DatePicker（デフォルト: 現在時刻）
- **フィルター**: 検索結果のリアルタイムフィルタリング

#### 1.3 UI仕様

##### 検索フォーム
- 検索キーワード入力フィールド
- 開始日時・終了日時のカレンダー選択
- Search/Clearボタン
- フィルター入力フィールド（×ボタン付き）

##### ログ表示エリア
- モックアップコード風の表示エリア（高さ480px、スクロール可能）
- 各ログエントリの構造化表示:
  - タイムスタンプ（JST形式）
  - ホスト名
  - ファシリティ（Facility）
  - 重要度（Severity）
  - メッセージ

##### ダウンロード機能
- 検索結果をテキストファイルとしてダウンロード
- ファイル名: `syslog_YYYYMMDD-HHMMSS.txt`

### 2. バックエンド仕様

#### 2.1 APIエンドポイント

##### POST /api/sys/search
- **リクエストボディ**:
  ```json
  {
    "keyword": "string",
    "start_datetime": "string (ISO形式)",
    "end_datetime": "string (ISO形式)",
    "serial": "string (オプション)",
    "cluster": "string"
  }
  ```

- **レスポンス**:
  ```json
  {
    "status": "success|error",
    "data": [
      {
        "message": "string",
        "facility_label": "string",
        "severity_label": "string",
        "timestamp": "string",
        "hostname": "string"
      }
    ],
    "count": "number"
  }
  ```

#### 2.2 データモデル

##### SyslogSearchRequest
```python
class SyslogSearchRequest(BaseModel):
    keyword: str
    start_datetime: str
    end_datetime: str
    serial: str = None
    cluster: str = None
```

#### 2.3 ビジネスロジック

##### SyslogGateway
- **役割**: シスログ検索のビジネスロジック
- **ファイルパス**: `shared/gateways/syslog_gateway.py`
- **主要メソッド**:
  - `search_syslog(search_item)`: ログ検索の実行

##### 検索フロー（v1.1.0）
1. リクエストデータをパース（keyword, start_datetime, end_datetime）
2. 日時をISO形式からJST形式に変換
3. `ElasticGateway.search_syslog_by_keyword_and_time()`を呼び出し
   - **hostnameフィルタなし**（クラスター名情報が利用不可のため）
   - 時間範囲 + キーワードのみで検索
4. 結果を構造化して返却（100件まで）

##### ElasticGateway.search_syslog_by_keyword_and_time()
- **ファイルパス**: `core/ela.py`
- **クエリ構築**:
  - `@timestamp`の範囲検索
  - キーワードがある場合は`message`フィールドで検索（`query_string`）
  - `size=100`、タイムスタンプ降順でソート
- **返却データ**: Elasticsearch `_source`の配列

### 3. Elasticsearch仕様

#### 3.1 インデックス
- **メインインデックス**: `filebeat-*`
- **クラスター情報インデックス**: `cluster`

#### 3.2 検索クエリ（v1.1.0）
```json
{
  "function_score": {
    "query": {
      "bool": {
        "must": [
          {
            "range": {
              "@timestamp": {
                "gte": "<start_datetime>",
                "lte": "<end_datetime>"
              }
            }
          },
          {
            "query_string": {
              "default_field": "message",
              "query": "<keyword>"
            }
          }
        ]
      }
    }
  }
}
```

**クエリパラメータ**:
- `<start_datetime>`: フロントエンドから送信された開始日時（例：`2025-10-09T14:00:00`）
- `<end_datetime>`: フロントエンドから送信された終了日時（例：`2025-10-09T23:59:59`）
- `<keyword>`: 検索キーワード（ワイルドカード付き。例：`*ERROR*`）

**注**: hostnameフィルタは削除されました（v1.1.0）

#### 3.3 データ構造（v1.1.0）
```json
{
  "@timestamp": "2025-10-09T23:59:57.584Z",
  "hostname": "NTNX-5def2a70-D-CVM",
  "message": "ERROR [HTTP_PROTO_STAGE0] 2025-10-09 23:59:32,813Z TcpConnection.java (line 475) Error while reading from socket"
}
```

**hostname形式の変更**:
- **旧形式**（～v1.0.0）: `PHX-POC339-A`（クラスター名を含む）
- **新形式**（v1.1.0～）: `NTNX-5def2a70-D-CVM`（CVM UUID + ノード名）
  - `NTNX-`: プレフィックス
  - `5def2a70`: CVM UUID（一部）
  - `D`: ノード識別子（A, B, C, D等）
  - `CVM`: サフィックス

## 技術仕様

### 依存関係

#### フロントエンド
- `react-hook-form`: フォーム管理
- `react-datepicker`: 日時選択
- `file-saver`: ファイルダウンロード
- `@fortawesome/react-fontawesome`: アイコン

#### バックエンド
- `fastapi`: Webフレームワーク
- `elasticsearch`: Elasticsearchクライアント
- `pydantic`: データバリデーション

### 設定

#### 環境変数
- `ELASTIC_SERVER`: ElasticsearchサーバーURL（デフォルト: `http://elasticsearch:9200`）
- `ELASTICSEARCH_URL`: Kubernetes環境用（例: `http://elasticsearch-service:9200`）

#### Filebeat設定（Syslogサーバー側）

**設定ファイル場所**:
- `/home/nutanix/konchangakita/blog-loghoi/ongoing/syslog/filebeat.yml`

**実際の設定内容**:
```yaml
filebeat.inputs:
  - type: syslog
    protocol.tcp:
      host: "0.0.0.0:7515"

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  protocol: "http"

setup.kibana:
  host: "kibana:5601"
```

**設定のポイント**:
- **受信ポート**: TCP 7515（標準の514ではなくカスタムポート）
- **Elasticsearch出力**: `elasticsearch:9200`（Docker/Kubernetes内部DNS）
- **Kibana連携**: `kibana:5601`

**Nutanix Syslog設定**:
- Prism Element > Settings > Syslog Server
- Server IP: Syslogサーバー（Filebeat稼働サーバー）のIPアドレス
- Port: 7515（Filebeatの受信ポートに合わせる）
- Protocol: TCP

#### Docker設定
- フロントエンド: Next.jsアプリケーション
- バックエンド: FastAPIアプリケーション
- Elasticsearch: ログデータストレージ
- Syslogサーバー: Filebeat（別サーバーまたはコンテナ）

## エラーハンドリング

### フロントエンド
- ネットワークエラー: "バックエンドへの接続に失敗しました"
- APIエラー: "検索エラー: {エラーメッセージ}"
- 検索結果なし: "検索結果がありません"

### バックエンド
- クラスター名未指定: 空の配列を返却
- クラスター情報未発見: 空の配列を返却
- Elasticsearch接続エラー: エラーログ出力、空の配列を返却

## パフォーマンス

### 検索制限
- 最大検索件数: 100件（Elasticsearchのsizeパラメータ）
- デフォルト日時範囲: 7日前〜現在

### 最適化
- インデックス: `filebeat-*`パターンで効率的な検索
- ホスト名パターンマッチング: クラスター名から生成
- 日時範囲指定: タイムスタンプフィールドでの範囲検索

## セキュリティ

### 入力検証
- フロントエンド: react-hook-formによるバリデーション
- バックエンド: Pydanticによる型チェック

### データ保護
- ログデータの暗号化: Elasticsearchの設定に依存
- アクセス制御: アプリケーションレベルでの制御

## Kubernetes環境での動作

### Syslogサーバー設定
- **External IP**: `10.55.23.42`（LoadBalancer ServiceのExternal IP）
- **受信ポート**: `7515`（TCP）
- **Nutanix設定**:
  - Prism Element > Settings > Syslog Server
  - Server IP: `10.55.23.42`
  - Port: `7515`
  - Protocol: `TCP`

### デプロイ構成
```yaml
# Syslog Deployment
- Deployment: loghoi-syslog (1 replica)
- Image: konchangakita/loghoi-syslog:v1.0.1
- Service: LoadBalancer (External IP: 10.55.23.42)
- Ports: 7515 (Syslog), 5066 (HTTP Metrics)

# Backend Deployment
- Image: konchangakita/loghoi-backend:v1.0.22
- 環境変数:
  - PYTHONDONTWRITEBYTECODE=1
  - PYTHONUNBUFFERED=1
  - ELASTICSEARCH_URL=elasticsearch-service:9200
```

### 動作確認済み
- ✅ Nutanixから10.55.23.42:7515へのSyslog送信
- ✅ Filebeatによる受信・パース
- ✅ Elasticsearchへの保存（filebeat-*インデックス）
- ✅ バックエンドAPIからの検索（100件取得）
- ✅ フロントエンドでの表示

### 既知の問題と対策
1. **クラスター識別不可**
   - **問題**: hostnameにクラスター名が含まれない
   - **現状**: 全クラスターのSyslogが混在して表示
   - **暫定対策**: 日時範囲とキーワードのみで検索
   - **将来対策**: Filebeat側で送信元IPからクラスター情報をタグ付与

2. **検索結果の上限**
   - **現状**: 100件まで取得
   - **将来**: ページネーション実装

## 今後の改善点

### 優先度: 高
1. **クラスター識別機能**: Filebeat processorsで送信元IPからクラスター情報を付与
2. **ページネーション**: 100件以上のログを効率的に表示
3. **hostnameフィルタ**: クラスター識別後、hostnameでのフィルタリングを再実装

### 優先度: 中
1. **高度なフィルタリング**: ファシリティ、重要度での絞り込み
2. **ログ統計**: 検索結果の統計情報表示
3. **リアルタイム更新**: WebSocketによるリアルタイムログ表示

### 優先度: 低
1. **キャッシュ**: 頻繁にアクセスされるクラスター情報のキャッシュ
2. **非同期処理**: 大量データの非同期読み込み
3. **インデックス最適化**: Elasticsearchインデックスの最適化
4. **レスポンシブデザイン**: モバイル対応
5. **ダークモード**: ダークテーマの追加
6. **キーボードショートカット**: 効率的な操作のためのショートカット

## 関連ファイル

### フロントエンド
- `/frontend/next-app/loghoi/app/syslog/page.tsx`
- `/frontend/next-app/loghoi/app/syslog/syslog-content.tsx`
- `/frontend/next-app/loghoi/app/syslog/layout.tsx`

### バックエンド
- `/backend/fastapi_app/app_fastapi.py` (APIエンドポイント)
- `/shared/gateways/syslog_gateway.py` (ビジネスロジック)
- `/backend/core/ela.py` (Elasticsearch操作)

### Syslogサーバー（Kubernetes）
- `/syslog/Dockerfile.k8s` (Dockerイメージ定義)
- `/syslog/filebeat.k8s.yml` (Kubernetes用Filebeat設定)
- `/k8s/syslog-deployment.yaml` (Deployment + Service定義)

### Kubernetes設定
- `/k8s/backend-deployment.yaml`
- `/k8s/ingress.yaml`

## セットアップ手順（Kubernetes環境）

### 1. Syslogサーバーのデプロイ
```bash
# Dockerイメージのビルド
cd /home/nutanix/konchangakita/blog-loghoi/ongoing/syslog
docker build -f Dockerfile.k8s -t konchangakita/loghoi-syslog:v1.0.1 .
docker push konchangakita/loghoi-syslog:v1.0.1

# Kubernetesにデプロイ
kubectl apply -f /home/nutanix/konchangakita/blog-loghoi/ongoing/k8s/syslog-deployment.yaml

# External IPの確認
kubectl get service loghoi-syslog-service -n loghoi
```

### 2. Nutanix側のSyslog設定

#### 2.1 Prism Element UIでの設定（推奨）
1. **Prism Element UI**にログイン
2. **Settings（⚙️アイコン）** > **Syslog Server**を選択
3. 以下を入力：
   - **Server IP**: `10.55.23.42`（LoadBalancerのExternal IP）
   - **Port**: `7515`
   - **Protocol**: `TCP`
   - **Module**: すべて選択（または必要なものだけ）
4. **+ Add**ボタンで追加
5. **Save**ボタンで保存

#### 2.2 ncliコマンドでの設定（CVM SSHアクセス）

**Syslogサーバーの追加**:
```bash
# CVM（Controller VM）にSSH接続
ssh nutanix@<CVM_IP>

# Syslogサーバーを追加
ncli rsyslog-config add-server \
  name=<サーバー名> \
  host=<Syslogサーバー_IP> \
  port=<ポート番号> \
  network-protocol=TCP \
  relp-enabled=false

# 例: Filebeat Syslogサーバーを追加（AOS 7.0）
ncli rsyslog-config add-server \
  name=elastic-filebeat \
  host=10.55.23.42 \
  port=7515 \
  network-protocol=TCP \
  relp-enabled=false
```

**出力例**:
```
Name                      : elastic-filebeat
Host Address              : 10.55.23.42
Port                      : 7515
Protocol                  : TCP
Relp Enabled              : false
```

**モジュールの追加**:
```bash
# 特定モジュールのログをSyslogサーバーに送信
ncli rsyslog-config add-module \
  server-name=<サーバー名> \
  module-name=<モジュール名> \
  level=<ログレベル> \
  include-monitor-logs=false

# 例: CASSANDRAモジュールのERRORログを送信
ncli rsyslog-config add-module \
  server-name=elastic-filebeat \
  module-name=CASSANDRA \
  level=ERROR \
  include-monitor-logs=false
```

**出力例**:
```
RSyslog Servers           : elastic-filebeat
Module Name               : CASSANDRA
Log Level                 : ERROR
Include Monitor Logs      : false
```

**利用可能なモジュール**:
CASSANDRA, CEREBRO, CURATOR, GENESIS, PRISM, STARGATE, SYSLOG_MODULE, ZOOKEEPER, UHURA, LAZAN, API_AUDIT, CALM, EPSILON, ACROPOLIS, MINERVA_CVM, FLOW

**ログレベル（Syslog Severity Levels）**:

| Value | Severity | Keyword | Description |
|-------|----------|---------|-------------|
| 0 | Emergency | emerg | System is unusable. |
| 1 | Alert | alert | Should be corrected immediately. |
| 2 | Critical | crit | Critical conditions. |
| 3 | Error | err | Error Conditions. |
| 4 | Warning | warning | Indication that an error might occur if an action is not taken. |
| 5 | Notice | notice | Events that are unusual, but not error conditions. |
| 6 | Informational | info | Normal operational messages that require no action. |
| 7 | Debug | debug | Information useful to developers for debugging the application. |

**Syslog設定の確認**:
```bash
# 登録されているSyslogサーバーの一覧
ncli rsyslog-config list

# 特定サーバーの詳細確認
ncli rsyslog-config get server-name=elastic-filebeat
```

**Syslog設定の削除**:
```bash
# モジュールの削除
ncli rsyslog-config remove-module \
  server-name=elastic-filebeat \
  module-name=CASSANDRA

# Syslogサーバーの削除
ncli rsyslog-config remove-server \
  name=elastic-filebeat
```

**注意事項**:
- `host`および`port`の値は、実際のSyslogサーバー環境に合わせて変更してください
- AOS 7.0以降の環境で動作確認済み
- `relp-enabled`は通常`false`（RELP未使用）で問題ありません
- 複数のモジュールを追加する場合は、各モジュールごとに`add-module`コマンドを実行します

### 3. 動作確認
```bash
# Filebeatのログ確認
kubectl logs -n loghoi deployment/loghoi-syslog --tail=50

# Elasticsearchにデータが届いているか確認
kubectl exec -n loghoi deployment/elasticsearch -- curl -s "http://localhost:9200/_cat/indices?v" | grep filebeat

# データ件数の確認
kubectl exec -n loghoi deployment/elasticsearch -- curl -s "http://localhost:9200/filebeat-*/_count"
```

### 4. バックエンド・フロントエンドの更新
```bash
# バックエンドイメージのビルド＆デプロイ
cd /home/nutanix/konchangakita/blog-loghoi/ongoing
docker build -f backend/Dockerfile.k8s -t konchangakita/loghoi-backend:v1.0.22 .
docker push konchangakita/loghoi-backend:v1.0.22
kubectl set image deployment/loghoi-backend -n loghoi backend=konchangakita/loghoi-backend:v1.0.22

# フロントエンドからアクセス
# https://10.55.23.41/syslog?pcip=<PC_IP>&cluster=<クラスター名>&prism=<Prism_IP>
```
