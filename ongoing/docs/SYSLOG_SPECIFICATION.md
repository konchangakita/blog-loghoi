# シスログ機能仕様書

## 概要
シスログ機能は、NutanixクラスターのシステムログをElasticsearchから検索・表示する機能です。キーワード、日時範囲を指定してログを検索し、結果を構造化して表示できます。

## バージョン
1.4.0（最終更新: 2025-10-21）

## 変更履歴
### v1.4.0（2025-10-21）
- **Kubernetes対応**: GitHub Container Registry (GHCR) への移行
  - Docker Hub → GHCR.io への完全移行
  - イメージプルエラー（500/504/401 Unauthorized）を解決
  - パッケージ公開設定で認証なしプルを実現
- **イメージタグ更新**:
  - Backend: `ghcr.io/konchangakita/loghoi-backend:latest`
  - Frontend: `ghcr.io/konchangakita/loghoi-frontend:latest`
  - Syslog: `ghcr.io/konchangakita/loghoi-syslog:v1.0.1`

### v1.3.0（2025-10-14）
- **Syslog検索改善**: `block_serial_number`をOR条件に追加
  - 問題: hostname取得APIが返す値（例: `DM3-POC011-1`）と実際のSyslogデータのhostname（例: `NTNX-18SM6H160088-A-CVM`）が一致せず、検索結果が0件になる問題を解決
  - 修正: クラスタの`block_serial_number`をElasticsearchから取得し、`*block_serial*`ワイルドカードをOR条件に追加
  - 検索条件: `hostname* OR cluster_name* OR *block_serial*` の3つのOR条件で検索
  - 実装場所: `shared/gateways/syslog_gateway.py`
- **Kubernetes対応**: Dockerイメージタグを`latest`に変更（backend, frontend）
- **UI改善**: トップページのクラスタアイコンサイズを修正（巨大化バグ）
- **UI改善**: Gatekeeperページの背景画像レイアウトを修正（縦スクロール時の白背景問題解決）

### v1.2.0（2025-10-12）
- **クラスター判別機能の実装**: PC Registration時にhypervisor hostnameを保存し、Syslog検索時に自動的にクラスター識別
- **hostname自動取得**: Prism API (`/api/nutanix/v3/hosts/list`) からhypervisor hostnameを取得
- **ホスト情報拡張**: hostname、host IP、CVM IPを一緒に保存（将来の機能拡張に対応）
- **Elasticsearchクエリ改善**: hostnameワイルドカード検索を実装（`hostname`フィールドを使用）
- **API追加**: `POST /api/hostnames` エンドポイントを追加（クラスター別hostname取得）
- **UI簡素化**: hostname選択UIを削除し、自動的に全hostnameで検索
- **docker-compose対応**: SSH鍵パスの環境変数設定を追加
- **クラスター識別の解決**: v1.1.0で課題だったクラスター識別を実現

### v1.1.0（2025-10-10）
- **Kubernetes化**: SyslogサーバーをKubernetesにデプロイ（Filebeat）
- **hostname仕様変更**: Nutanixから送信されるSyslogのhostnameが`NTNX-<UUID>-<ノード名>-CVM`形式に変更
- **検索仕様変更**: クラスター名フィルタを削除（hostnameにクラスター名が含まれないため）
- **検索条件**: 日時範囲とキーワードのみで検索（ホストフィルタなし）
- **TODO**: クラスター識別の仕組みが必要（Filebeat側でタグ付与など） → v1.2.0で解決

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
  - イメージ: `ghcr.io/konchangakita/loghoi-syslog:v1.0.1` (v1.4.0で更新)
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
2. **クラスター判別**: PC Registration時に保存したhostnameでクラスター別にフィルタリング（v1.2.0）
3. **結果表示**: 構造化されたログデータの表示（タイムスタンプ、ホスト名、メッセージ）
4. **フィルタリング**: 検索結果のリアルタイムフィルタリング
5. **ダウンロード**: 検索結果のテキストファイルダウンロード
6. **日時選択**: カレンダーUIによる日時範囲指定
7. **自動hostname取得**: Prism APIからhypervisor hostnameを自動取得（v1.2.0）

### 現在の制限事項
- **hostname形式**: Nutanix CVMのホスト名（`NTNX-<UUID>-<ノード名>-CVM`）で表示
- **ワイルドカード検索**: hostnameの前方一致検索を使用（完全一致ではない）

### 実装済みの改善（v1.2.0）
1. ✅ **クラスター識別の実現**: PC Registration時にPrism APIからhypervisor hostnameを取得・保存
2. ✅ **hostname自動フィルタリング**: Syslog検索時に自動的にクラスター別hostnameで絞り込み
3. ✅ **Elasticsearchクエリ改善**: hostnameワイルドカード検索で効率的なフィルタリング

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

#### ログ検索フロー（アプリケーション、v1.2.0対応）
1. **ページ読み込み時**: `/api/hostnames`でクラスター別hostnameリストを取得（v1.2.0で追加）
2. フロントエンドで検索条件を入力（キーワード、日時範囲）
3. FastAPIの`/api/sys/search`エンドポイントにPOSTリクエスト（hostnameリスト含む）
4. `SyslogGateway`がElasticsearchからログを検索（hostnameワイルドカード検索）
5. 構造化されたログデータをフロントエンドに返却
6. フロントエンドでログを表示・フィルタリング・ダウンロード

## 詳細仕様

### 0. クラスター判別機能（v1.2.0で追加）

#### 0.1 概要
PC Registration時にPrism APIからhypervisor hostnameを取得し、Elasticsearchの`cluster`インデックスに保存することで、Syslog検索時にクラスター別の絞り込みを実現します。

#### 0.2 PC Registration時の処理
1. **Prism APIでhostname取得**:
   - エンドポイント: `POST https://<PC_IP>:9440/api/nutanix/v3/hosts/list`
   - レスポンスから`entity["status"]["name"]`を抽出
   - 各ホストのhypervisor hostnameを取得（例：`PHX-POC339-1`, `PHX-POC339-2`）

2. **Elasticsearchに保存**:
   - インデックス: `cluster`
   - ドキュメントID: `<cluster_name>`
   - フィールド:
     ```json
     {
       "cluster_name": "DM3-POC023-CE",
       "pc_ip": "10.55.23.7",
       "prism_ip": "10.55.23.37",
       "host_names": ["PHX-POC339-1", "PHX-POC339-2", "PHX-POC339-3", "PHX-POC339-4"],
       "host_info": [
         {
           "hostname": "PHX-POC339-1",
           "host_ip": "10.55.23.31",
           "cvm_ip": "10.55.23.41"
         },
         {
           "hostname": "PHX-POC339-2",
           "host_ip": "10.55.23.32",
           "cvm_ip": "10.55.23.42"
         }
       ]
     }
     ```

   **v1.2.0での拡張**:
   - `host_info`フィールドを追加（ホスト詳細情報）
   - 各ホストの`hostname`、`host_ip`（Hypervisor IP）、`cvm_ip`（CVM IP）を保存
   - 将来的な機能拡張（IPベースの検索、ホスト別分析等）に対応可能

#### 0.3 Syslog検索時の処理
1. **hostname取得**: `POST /api/hostnames` でクラスター別hostnameリストを取得
2. **検索条件生成**: 各hostnameに対してワイルドカード検索を設定
3. **Elasticsearchクエリ**: `should`句で複数hostnameのOR検索を実行
4. **結果返却**: クラスター別に絞り込まれたSyslogメッセージを返却

#### 0.4 技術的な実装
- **バックエンドファイル**:
  - `backend/shared/gateways/regist_gateway.py`: PC Registration処理（hostname保存）
  - `backend/core/common.py`: hostname取得関数
  - `backend/core/ela.py`: Elasticsearchクエリ（ワイルドカード検索）
  - `backend/fastapi_app/app_fastapi.py`: `/api/hostnames` エンドポイント
- **フロントエンドファイル**:
  - `frontend/next-app/loghoi/app/syslog/syslog-content.tsx`: hostname自動取得と検索

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

##### POST /api/hostnames（v1.2.0で追加）
- **概要**: 指定されたクラスターのhypervisor hostnameリストを取得
- **リクエストボディ**:
  ```json
  {
    "cluster_name": "string"
  }
  ```

- **レスポンス**:
  ```json
  {
    "status": "success",
    "data": {
      "hostnames": ["PHX-POC339-1", "PHX-POC339-2", "PHX-POC339-3", "PHX-POC339-4"]
    }
  }
  ```

- **処理フロー**:
  1. Elasticsearchの`cluster`インデックスから`cluster_name`で検索
  2. `host_names`フィールドからhypervisor hostname配列を取得
  3. hostnameリストを返却

##### POST /api/sys/search
- **概要**: クラスター別Syslogメッセージ検索（v1.2.0でhostnameフィルタ追加）
- **リクエストボディ**:
  ```json
  {
    "keyword": "string",
    "start_datetime": "string (ISO形式)",
    "end_datetime": "string (ISO形式)",
    "serial": "string (オプション)",
    "cluster": "string",
    "hostnames": ["string"] (オプション、v1.2.0で追加)
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

- **v1.2.0での変更点**:
  - `hostnames`パラメータを追加（クラスター別フィルタリング）
  - Elasticsearchクエリでhostnameワイルドカード検索を実行

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

##### 検索フロー（v1.3.0）
1. リクエストデータをパース（keyword, start_datetime, end_datetime, cluster, hostnames）
2. 日時をISO形式からJST形式に変換
3. **block_serial_numberを取得**（v1.3.0で追加）:
   - クラスタ名でElasticsearch `cluster`インデックスを検索
   - `block_serial_number`フィールドを取得（例: "18SM6H160088"）
4. `ElasticGateway.search_syslog_by_keyword_and_time()`を呼び出し
   - パラメータ: `keyword`, `start_datetime`, `end_datetime`, `hostnames`, `cluster_name`, `block_serial`
5. 結果を構造化して返却（100件まで）

##### ElasticGateway.search_syslog_by_keyword_and_time()
- **ファイルパス**: `core/ela.py`
- **パラメータ**（v1.3.0で`block_serial`追加）:
  - `keyword`: 検索キーワード
  - `start_datetime`, `end_datetime`: 時間範囲
  - `hostnames`: hostname配列（例: ["DM3-POC011-1", "DM3-POC011-2"]）
  - `cluster_name`: クラスタ名（例: "DM3-POC011"）
  - `block_serial`: ブロックシリアル番号（例: "18SM6H160088"） ← **v1.3.0で追加**
- **クエリ構築**:
  - `@timestamp`の範囲検索
  - キーワードがある場合は`message`フィールドで検索（`query_string`）
  - **hostnameフィルタ（OR条件）**:
    1. `hostname*` ワイルドカード（例: `DM3-POC011-1*`）
    2. `cluster_name*` ワイルドカード（例: `DM3-POC011*`）
    3. `*block_serial*` ワイルドカード（例: `*18SM6H160088*`） ← **v1.3.0で追加**
  - 上記3つの条件のいずれか1つに一致（`minimum_should_match: 1`）
  - `size=100`、タイムスタンプ降順でソート
- **返却データ**: Elasticsearch `_source`の配列

### 3. Elasticsearch仕様

#### 3.1 インデックス
- **メインインデックス**: `filebeat-*`
  - Syslogメッセージを格納
  - 主要フィールド: `@timestamp`, `hostname`, `message`, `facility_label`, `severity_label`
- **クラスター情報インデックス**: `cluster`（v1.2.0で拡張）
  - クラスター情報とhypervisor hostnameを格納
  - 主要フィールド: 
    - `cluster_name`: クラスター名
    - `pc_ip`: Prism Central IP
    - `prism_ip`: Prism Element IP
    - `host_names`: ハイパーバイザーのhostname配列
    - `host_info`: ホスト詳細情報配列（v1.2.0で追加）
      - `hostname`: ハイパーバイザーのhostname
      - `host_ip`: ハイパーバイザーのIPアドレス
      - `cvm_ip`: CVMのIPアドレス

#### 3.2 検索クエリ（v1.3.0）
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
            "bool": {
              "should": [
                {
                  "wildcard": {
                    "hostname": "DM3-POC011-1*"
                  }
                },
                {
                  "wildcard": {
                    "hostname": "DM3-POC011-2*"
                  }
                },
                {
                  "wildcard": {
                    "hostname": "DM3-POC011*"
                  }
                },
                {
                  "wildcard": {
                    "hostname": "*18SM6H160088*"
                  }
                }
              ],
              "minimum_should_match": 1
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

**v1.3.0での重要な改善**:
- **block_serial_numberによる検索を追加**:
  - 問題: hostname APIが返す値（`DM3-POC011-1`）と実際のSyslogのhostname（`NTNX-18SM6H160088-A-CVM`）が一致しない
  - 解決: クラスタの`block_serial_number`を取得し、`*18SM6H160088*`形式でワイルドカード検索
  - これにより、hostname形式に関係なく確実にクラスタのSyslogを検索可能
- **検索条件（OR）**:
  1. `hostname*` - APIから取得したhostname（例: `DM3-POC011-1*`）
  2. `cluster_name*` - クラスタ名（例: `DM3-POC011*`）
  3. `*block_serial*` - シリアル番号（例: `*18SM6H160088*`）← **NEW!**
- 上記3つの条件のいずれか1つに一致すればヒット（`minimum_should_match: 1`）

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
- Image: ghcr.io/konchangakita/loghoi-backend:latest (v1.4.0で更新)
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
docker build -f Dockerfile.k8s -t ghcr.io/konchangakita/loghoi-syslog:v1.0.1 .
docker push ghcr.io/konchangakita/loghoi-syslog:v1.0.1

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
ncli rsyslog-config add-server name=elastic-filebeat host=10.55.11.47 port=7515 network-protocol=TCP relp-enabled=false
```

**出力例**:
```
Name                      : elastic-filebeat
Host Address              : 10.55.11.47
Port                      : 7515
Protocol                  : TCP
Relp Enabled              : false
```

**モジュールの追加**:
```bash
# 特定モジュールのログをSyslogサーバーに送信
ncli rsyslog-config add-module  server-name=<サーバー名>  module-name=<モジュール名> level=<ログレベル> include-monitor-logs=false

# 例: CASSANDRAモジュールのERRORログを送信
ncli rsyslog-config add-module server-name=elastic-filebeat module-name=CASSANDRA level=ERROR include-monitor-logs=false
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
docker build -f backend/Dockerfile.k8s -t ghcr.io/konchangakita/loghoi-backend:latest .
docker push ghcr.io/konchangakita/loghoi-backend:latest
kubectl set image deployment/loghoi-backend -n loghoi backend=ghcr.io/konchangakita/loghoi-backend:latest

# フロントエンドからアクセス
# https://10.55.23.41/syslog?pcip=<PC_IP>&cluster=<クラスター名>&prism=<Prism_IP>
```
