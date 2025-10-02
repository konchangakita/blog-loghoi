# シスログ機能仕様書

## 概要
シスログ機能は、NutanixクラスターのシステムログをElasticsearchから検索・表示する機能です。クラスター名、キーワード、日時範囲を指定してログを検索し、結果を構造化して表示できます。

## バージョン
1.0.0

## 機能概要

### 主要機能
1. **ログ検索**: クラスター名、キーワード、日時範囲によるログ検索
2. **結果表示**: 構造化されたログデータの表示（タイムスタンプ、ホスト名、ファシリティ、重要度、メッセージ）
3. **フィルタリング**: 検索結果のリアルタイムフィルタリング
4. **ダウンロード**: 検索結果のテキストファイルダウンロード
5. **日時選択**: カレンダーUIによる日時範囲指定

### アクセス方法
- **URL**: `http://10.38.113.49:7777/syslog?pcip=*PC_IP*&cluster=*クラスタ名*&prism=*クラスタIP*`
- **URLパラメータ**:
  - `pcip`: PCのIPアドレス
  - `cluster`: クラスター名
  - `prism`: Prism ElementのIPアドレス

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
- **APIエンドポイント**: `/api/sys/search`

### データフロー
1. フロントエンドで検索条件を入力
2. FastAPIの`/api/sys/search`エンドポイントにPOSTリクエスト
3. `SyslogGateway`がElasticsearchからログを検索
4. 構造化されたログデータをフロントエンドに返却
5. フロントエンドでログを表示・フィルタリング

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
- **主要メソッド**:
  - `search_syslog(search_item)`: ログ検索の実行

##### 検索フロー
1. クラスター名からホスト名パターンを生成
   - `DC1-PHX-POC339` → `PHX-POC339-*`
2. 日時をUTC形式に変換
3. Elasticsearchでログ検索実行
4. 結果を構造化して返却

### 3. Elasticsearch仕様

#### 3.1 インデックス
- **メインインデックス**: `filebeat-*`
- **クラスター情報インデックス**: `cluster`

#### 3.2 検索クエリ
```json
{
  "function_score": {
    "query": {
      "bool": {
        "must": [
          {
            "range": {
              "@timestamp": {
                "gte": "start_datetime",
                "lte": "end_datetime"
              }
            }
          },
          {
            "query_string": {
              "default_field": "hostname",
              "query": "hostname_pattern"
            }
          },
          {
            "query_string": {
              "default_field": "message",
              "query": "keyword"
            }
          }
        ]
      }
    }
  }
}
```

#### 3.3 データ構造
```json
{
  "@timestamp": "2024-01-01T00:00:00.000Z",
  "hostname": "PHX-POC339-A",
  "message": "ログメッセージ",
  "syslog": {
    "facility_label": "local0",
    "severity_label": "info"
  }
}
```

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

#### Docker設定
- フロントエンド: Next.jsアプリケーション
- バックエンド: FastAPIアプリケーション
- Elasticsearch: ログデータストレージ

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

## 今後の改善点

### 機能拡張
1. **ページネーション**: 大量のログデータの効率的な表示
2. **高度なフィルタリング**: ファシリティ、重要度での絞り込み
3. **ログ統計**: 検索結果の統計情報表示
4. **リアルタイム更新**: WebSocketによるリアルタイムログ表示

### パフォーマンス改善
1. **キャッシュ**: 頻繁にアクセスされるクラスター情報のキャッシュ
2. **非同期処理**: 大量データの非同期読み込み
3. **インデックス最適化**: Elasticsearchインデックスの最適化

### UI/UX改善
1. **レスポンシブデザイン**: モバイル対応
2. **ダークモード**: ダークテーマの追加
3. **キーボードショートカット**: 効率的な操作のためのショートカット

## 関連ファイル

### フロントエンド
- `/frontend/next-app/loghoi/app/syslog/page.tsx`
- `/frontend/next-app/loghoi/app/syslog/syslog-content.tsx`
- `/frontend/next-app/loghoi/app/syslog/layout.tsx`

### バックエンド
- `/backend/fastapi_app/app_fastapi.py` (APIエンドポイント)
- `/backend/shared/gateways/syslog_gateway.py` (ビジネスロジック)
- `/backend/core/ela.py` (Elasticsearch操作)
- `/backend/core/broker_sys.py` (旧実装、参考用)

### 設定ファイル
- `docker-compose_fastapi.yml`
- `shared/config/settings.py`
