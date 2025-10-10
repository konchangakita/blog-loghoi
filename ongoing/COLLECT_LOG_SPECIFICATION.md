# コレクトログ機能仕様書

## 1. 機能概要

コレクトログ機能は、NutanixクラスターのCVMからログファイルとコマンド実行結果を収集し、ZIPファイルとしてダウンロード可能にする機能です。

### 1.1 主要機能
- CVM選択によるログ収集
- ログファイルの自動ダウンロード
- コマンド実行結果の取得
- ZIPファイル化とダウンロード
- ログファイルの個別表示・検索

### 1.2 対象ページ
- URL: `http://10.38.113.49:7777/collectlog?pcip=*PC_IP*&cluster=*クラスタ名*&prism=*クラスタIP*`
- パラメータ:
  - `pcip`: PCのIPアドレス
  - `cluster`: クラスター名
  - `prism`: Prism ElementのIPアドレス

## 2. システム構成

### 2.1 フロントエンド
- **フレームワーク**: Next.js 14 (React)
- **UIライブラリ**: Tailwind CSS + DaisyUI
- **状態管理**: React Hooks (useState, useEffect)
- **API通信**: Fetch API + カスタムフック

### 2.2 バックエンド
- **フレームワーク**: FastAPI
- **ログ収集**: SSH接続 + SFTP優先（SCPフォールバック／最終手段としてSSH cat）+ コマンド実行
- **ファイル管理**: ZIP圧縮 + ファイルシステム
- **設定管理**: JSON設定ファイル

### 2.3 データフロー
```
フロントエンド → FastAPI → SSH接続 → CVM
                ↓
            ZIPファイル生成 → ファイルシステム
                ↓
            フロントエンド ← ダウンロードAPI
```

## 3. ユーザーインターフェース

### 3.1 画面構成
```
┌─────────────────────────────────────────────────────────────┐
│                    Collect Log Viewer                      │
├─────────────────┬───────────────────────────────────────────┤
│   CVM Selector  │                                         │
│   Log Collector │            Log Viewer                    │
│   Zip Manager   │                                         │
│   Log File List │                                         │
└─────────────────┴───────────────────────────────────────────┘
```

### 3.2 コンポーネント詳細

#### 3.2.1 CVM Selector
- **機能**: クラスター内のCVM選択
- **表示**: ラジオボタン形式
- **デフォルト**: Prism Leader
- **状態**: ローディング中は無効化

#### 3.2.2 Log Collector
- **機能**: ログ収集の開始
- **ボタン**: "Start Collect Log"
- **状態**: 
  - 無効: CVM未選択時
  - 実行中: "Collecting..."表示
- **結果**: 収集完了後、ZIP一覧を自動更新

#### 3.2.3 Zip Manager
- **機能**: ZIPファイルの選択・ダウンロード
- **表示**: セレクトボックス + ダウンロードボタン
- **状態**: ローディング中は"読み込み中..."表示
- **ダウンロード**: 選択したZIPファイルを新タブで開く

#### 3.2.4 Log File List
- **機能**: 選択したZIP内のログファイル一覧表示
- **表示**: クリック可能なリスト形式
- **状態**: ログ選択時はハイライト表示

#### 3.2.5 Log Viewer
- **機能**: 選択したログファイルの内容表示
- **制限**: 
  - ファイルサイズ1MB以上は表示ブロック
  - 10,000文字を超える場合は切り詰め表示
- **状態**: 
  - ローディング中: "読み込み中..."表示
  - 空ファイル: "ファイル内ログ無し"表示
  - 大容量ファイル: "FILE_SIZE_TOO_LARGE"表示
 - **操作**:
   - ビュワー内左下に固定の「続きを表示」ボタンを表示（未読がある場合のみ）
   - ボタンは半透明（通常: 80%、ホバー: 100%）、配色はprimary、横幅は最小160px
   - 旧「続きを読む」グレーボタン（ビュワー外）は廃止

## 4. API仕様

### 4.1 ログ収集API
- **エンドポイント**: `POST /api/col/getlogs`
- **リクエスト**:
  ```json
  {
    "cvm": "10.38.112.31"
  }
  ```
- **レスポンス（v1.1.0以降 - 非同期処理）**:
  ```json
  {
    "status": "success",
    "message": "ログ収集を開始しました",
    "data": {
      "job_id": "8d52884e-5c05-416e-9fd2-764315aedc32",
      "status": "pending"
    }
  }
  ```
- **処理時間**: 1-2ms（即座にレスポンス）
- **備考**: バックグラウンドタスクで実行。完了確認は`GET /api/col/job/{job_id}`を使用

### 4.2 ZIP一覧取得API
- **エンドポイント**: `GET /api/col/ziplist`
- **レスポンス**:
  ```json
  {
    "zip_list": ["loghoi_20241003_123456.zip", "loghoi_20241003_124500.zip"]
  }
  ```

> 備考: フロントエンドで末尾の日時（`YYYYMMDD_HHMMSS`）を用いて新しいものが上になるようソート表示

### 4.3 ZIP内ログ一覧取得API
- **エンドポイント**: `GET /api/col/logs_in_zip/{zip_name}`
- **レスポンス**:
  ```json
  {
    "logs": ["acropolis_20241003_123456.txt", "uname_20241003_123456.txt"]
  }
  ```

> 備考: 末尾の日時（`YYYYMMDD_HHMMSS`）があれば降順、それ以外は名称昇順で表示

### 4.4 ログファイルサイズ取得API
- **エンドポイント**: `POST /api/col/logsize`
- **リクエスト**:
  ```json
  {
    "log_file": "acropolis_20241003_123456.txt",
    "zip_name": "loghoi_20241003_123456.zip"
  }
  ```
- **レスポンス**:
  ```json
  {
    "status": "success",
    "data": {
      "file_size": 1048576,
      "file_size_mb": 1.0,
      "file_path": "/usr/src/output/log/loghoi_20241003_123456/acropolis_20241003_123456.txt"
    }
  }
  ```

### 4.5 ログ内容表示API（範囲取得対応）
- **エンドポイント**: `POST /api/col/logdisplay`
- **リクエスト**:
  ```json
  {
    "log_file": "acropolis_20241003_123456.txt",
    "zip_name": "loghoi_20241003_123456.zip",
    "start": 0,         // 省略可: バイトオフセット（未指定時は全文）
    "length": 5000      // 省略可: 読み取りバイト数（未指定時は既定上限）
  }
  ```
- **レスポンス**:
  ```json
  {
    "status": "success",
    "data": "ログファイルの内容..."
  }
  ```
  または範囲取得時:
  ```json
  {
    "status": "success",
    "data": {
      "range": { "start": 0, "length": 5000 },
      "content": "チャンク内容..."
    }
  }
  ```
  備考: 旧実装互換として、`status`フィールドがない単純テキスト返却にも対応。

### 4.6 ZIPダウンロードAPI
- **エンドポイント**: `GET /api/col/download/{zip_name}`
- **レスポンス**: ZIPファイル（バイナリ）

### 4.7 ジョブステータス確認API（v1.1.0で追加）
- **エンドポイント**: `GET /api/col/job/{job_id}`
- **説明**: ログ収集ジョブの進捗・完了状態を確認
- **レスポンス**:
  ```json
  {
    "status": "success",
    "data": {
      "status": "pending" | "running" | "completed" | "failed",
      "cvm": "10.55.23.29",
      "created_at": "2025-10-09T15:09:18.355000",
      "started_at": "2025-10-09T15:09:18.356000",
      "completed_at": "2025-10-09T15:14:32.123000",
      "result": { "message": "finished collect log" },
      "error": null
    }
  }
  ```
- **ステータス遷移**: `pending` → `running` → `completed` / `failed`
- **使用方法**: ログ収集開始後、5秒ごとにポーリングして完了を検知

## 5. ログ収集仕様

### 5.1 収集対象ログファイル
設定ファイル `col_logfile.json` で定義された以下のログファイルを収集:

```json
{
  "LOGFILE_LIST": [
    {"name": "acropolis", "src_path": "/home/nutanix/data/logs/acropolis.out"},
    {"name": "acropolis-scheduler", "src_path": "/home/nutanix/data/logs/acropolis-scheduler.out"},
    {"name": "alert_manager", "src_path": "/home/nutanix/data/logs/alert_manager.out"},
    // ... その他多数のログファイル
  ]
}
```

### 5.2 実行コマンド
設定ファイル `col_command.json` で定義された以下のコマンドを実行:

```json
{
  "COMMAND_LIST": [
    {"name": "uname", "command": "uname -a"},
    {"name": "cluster_status", "command": "/usr/local/nutanix/cluster/bin/cluster status"},
    {"name": "hostssh_date", "command": "/usr/local/nutanix/cluster/bin/hostssh date"},
    // ... その他多数のコマンド
  ]
}
```

### 5.3 収集プロトコルの優先順位
- 優先1: SFTP（Paramiko SFTPによる直接転送）
- 優先2: SCP（openssh-client経由）
- 優先3: SSH cat（フォールバックとして内容を読み出し保存）

> 環境によってSCPが動作しないケース（例: unknown user 1000）があっても、SFTP/SSHで収集継続可

### 5.4 表示パフォーマンス（段階読み）
- 初回は最大10,000文字まで表示
- 「続きを表示」クリックで `start/length` を用いたチャンク読みを繰り返し追加
- 未読が残る場合、ビュワー左下に固定ボタンを表示

### 5.4 ファイル命名規則
- **フォルダ名**: `loghoi_YYYYMMDD_HHMMSS`
- **ログファイル**: `{ログ名}_YYYYMMDD_HHMMSS.txt`
- **ZIPファイル**: `loghoi_YYYYMMDD_HHMMSS.zip`

## 6. エラーハンドリング

### 6.1 フロントエンドエラー
- **API通信エラー**: アラート表示 + エラー状態管理
- **ファイルサイズ超過**: 表示ブロック + 警告メッセージ
- **タイムアウト**: 30秒でタイムアウト + エラーメッセージ
- **空ファイル**: "ファイル内ログ無し"表示

### 6.2 バックエンドエラー
- **SSH接続失敗**: エラーログ出力 + 処理継続
- **ファイル取得失敗**: エラーログ出力 + 処理継続
- **コマンド実行失敗**: エラーログ出力 + 処理継続
- **ZIP作成失敗**: エラーログ出力 + エラーレスポンス

### 6.3 設定ファイルエラー
- **JSONファイル未発見**: "missing json file"メッセージ
- **JSON解析エラー**: エラーログ出力 + 処理停止

## 7. パフォーマンス仕様

### 7.1 ファイルサイズ制限
- **表示制限**: 1MB以上のファイルは表示ブロック
- **内容制限**: 10,000文字を超える場合は切り詰め表示
- **タイムアウト**: ログ内容取得は30秒でタイムアウト
 - **段階読み**: `start/length` でチャンク取得し、追記表示

### 7.2 同時実行制限
- **ログ収集**: 1つのCVMに対して同時に1つのみ
- **ファイル表示**: 1つのログファイルのみ表示可能

### 7.3 リソース管理
- **SSH接続**: 使用後は即座にクローズ
- **メモリ使用**: 大きなファイルはストリーミング処理
- **ディスク使用**: 古いZIPファイルは手動削除が必要

## 8. セキュリティ仕様

### 8.1 認証・認可
- **SSH認証**: 秘密鍵認証（環境により配置パスが異なる）
  - Docker Compose環境: `/usr/src/config/.ssh/ntnx-lockdown`
  - Kubernetes環境: `/app/config/.ssh/ntnx-lockdown`
- **ホストキー検証**: 無効化（`StrictHostKeyChecking=no`）

### 8.2 ファイルアクセス
- **ログファイル**: CVM上の`/home/nutanix/data/logs/`配下のみ
- **出力ファイル**: サーバー上の`/usr/src/output/`配下のみ
- **設定ファイル**: サーバー上の`/usr/src/config/`配下のみ

### 8.3 データ保護
- **一時ファイル**: 処理完了後も保持（手動削除が必要）
- **ログ内容**: プレーンテキストで保存・送信
- **ZIPファイル**: 圧縮なしで保存

### 8.4 権限管理
- **コンテナ実行ユーザー**: scp/SFTP互換性のためrootで実行
- **所有者調整**: 収集完了後、出力ディレクトリとZIPに `HOST_UID`/`HOST_GID` を用いたchownを適用（例: `1000:1000`）
- **アクセス権限**: ホスト側nutanixユーザーから全ファイルにアクセス可能（所有者調整により担保）
- **環境変数**: `HOST_UID`, `HOST_GID` をdocker-composeで指定
- **目的**: scp互換とホスト権限整合の両立

## 9. 運用仕様

### 9.1 ログ収集手順
1. クラスター情報の取得（CVM一覧・Prism Leader）
2. CVM選択（デフォルト: Prism Leader）
3. "Start Collect Log"ボタンクリック
4. ログファイルの取得（SFTP優先／SCP／SSH catフォールバック）
5. コマンド実行結果の取得
6. ZIPファイル化
7. 完了通知（バックエンドログに完了ASCIIアートを常時表示）

### 9.2 ログ表示手順
1. ZIPファイル選択
2. ログファイル一覧表示
3. ログファイル選択
4. ファイルサイズチェック
5. ログ内容表示（制限内の場合）

### 9.3 ダウンロード手順
1. ZIPファイル選択
2. "ZIP File Download"ボタンクリック
3. 新タブでダウンロード開始

## 10. 設定ファイル

### 10.1 ログファイル設定 (`col_logfile.json`)
```json
{
  "LOGFILE_LIST": [
    {
      "name": "ログ名",
      "src_path": "CVM上のパス"
    }
  ]
}
```

### 10.2 コマンド設定 (`col_command.json`)
```json
{
  "COMMAND_LIST": [
    {
      "name": "コマンド名",
      "command": "実行するコマンド"
    }
  ]
}
```

## 11. 制限事項

### 11.1 機能制限
- 同時ログ収集は1つのCVMのみ
- 大容量ファイル（1MB以上）は表示不可
- ログ内容は10,000文字まで表示
- 古いZIPファイルの自動削除機能なし

### 11.2 技術制限
- SSH接続は逐次処理（並列処理なし）
- ファイル転送はSFTP優先／SCPフォールバック／SSH catフォールバック
- エラー時は処理継続（一部失敗を許容）

### 11.3 運用制限
- 設定ファイルの変更はサーバー再起動が必要
- ログファイルの追加・削除は設定ファイル編集が必要
- コマンドの追加・削除は設定ファイル編集が必要

## 12. 今後の改善案

### 12.1 機能改善
- 並列ログ収集の実装
- ログファイルのフィルタリング機能
- ログ内容の検索機能
- 古いZIPファイルの自動削除機能

### 12.2 性能改善
- ストリーミング表示の実装
- 非同期処理の最適化
- キャッシュ機能の追加

### 12.3 運用改善
- 設定ファイルの動的読み込み
- ログ収集のスケジューリング機能
- 収集結果の通知機能

---

**バージョン**: v1.2.0  
**作成日**: 2025-10-03  
**更新日**: 2025-10-10

---

## 13. Kubernetes環境での動作（2025-10-09追加）

### 13.1 解決した問題

#### 問題1: ログ収集時の502 Bad Gateway エラー

**症状**:
- 「Start Collect Log」ボタンをクリックすると502エラー
- バックエンドにリクエストが届かない
- ブラウザで`APIError: HTTP error! status: 502`

**根本原因**:
- ログ収集処理が同期的（ブロッキング）で3-5分かかる
- HTTPレスポンスが処理完了まで返らない
- Traefik Ingressのデフォルトタイムアウト（60秒）より長い
- タイムアウトで502 Bad Gatewayを返す

**解決方法（非同期処理化）**:

1. **バックグラウンドタスクで実行**
```python
# backend/fastapi_app/routers/collect_log.py

from fastapi import BackgroundTasks
import asyncio
import uuid

# ジョブ管理用の辞書
collection_jobs: Dict[str, Dict[str, Any]] = {}

async def run_log_collection(job_id: str, cvm: str) -> None:
    """バックグラウンドでログ収集を実行"""
    try:
        collection_jobs[job_id]["status"] = "running"
        
        # 同期的な処理を別スレッドで実行（イベントループをブロックしない）
        loop = asyncio.get_event_loop()
        data = await loop.run_in_executor(None, col.collect_logs, cvm)
        
        collection_jobs[job_id]["status"] = "completed"
        collection_jobs[job_id]["result"] = data
    except Exception as e:
        collection_jobs[job_id]["status"] = "failed"
        collection_jobs[job_id]["error"] = str(e)

@router.post("/getlogs")
async def collect_logs(request: LogCollectionRequest, background_tasks: BackgroundTasks):
    """ログ収集API（非同期実行）"""
    job_id = str(uuid.uuid4())
    
    collection_jobs[job_id] = {
        "status": "pending",
        "cvm": request.cvm,
        "created_at": datetime.now().isoformat()
    }
    
    # バックグラウンドタスクとして実行
    background_tasks.add_task(run_log_collection, job_id, request.cvm)
    
    return create_success_response(
        {"job_id": job_id, "status": "pending"},
        "ログ収集を開始しました"
    )
```

2. **ジョブステータス確認API追加**
```python
@router.get("/job/{job_id}")
async def get_job_status(job_id: str):
    """ログ収集ジョブのステータス確認API"""
    if job_id not in collection_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return create_success_response(collection_jobs[job_id])
```

3. **フロントエンドでポーリング**
```typescript
// フロントエンド: hooks/useCollectLogApi.ts

const collectLogs = async (cvm: string) => {
  // ログ収集ジョブを開始
  const jobResponse = await fetch('/api/col/getlogs', {
    method: 'POST',
    body: JSON.stringify({ cvm })
  })
  
  const jobId = jobResponse.job_id
  console.log('ログ収集ジョブ開始:', jobId)
  
  // ジョブ完了をポーリング（最大5分、1秒ごと）
  const maxAttempts = 300
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const statusResponse = await fetch(`/api/col/job/${jobId}`)
    
    if (statusResponse?.status === 'completed') {
      console.log('ログ収集完了:', jobId)
      return { message: 'finished collect log' }
    } else if (statusResponse?.status === 'failed') {
      throw new Error(`ログ収集失敗: ${statusResponse.error}`)
    }
    
    console.log(`ジョブステータス: ${statusResponse?.status}`)
  }
  
  throw new Error('ログ収集がタイムアウトしました')
}
```

**効果**:
- ✅ 即座にレスポンス返却（1-2ms）
- ✅ 502エラー解消
- ✅ ログ収集中もヘルスチェック応答継続
- ✅ Pod再起動なし
- ✅ ユーザーに進捗フィードバック可能（ポーリング中）

**修正ファイル**:
- `backend/fastapi_app/routers/collect_log.py`
- `frontend/next-app/loghoi/app/collectlog/hooks/useCollectLogApi.ts`

**イメージバージョン**:
- バックエンド: v1.0.17 → v1.0.18（非同期処理化）→ v1.0.24（進捗機能追加）
- フロントエンド: v1.0.32 → v1.0.33（ポーリング追加）→ v1.0.44（リアルタイム進捗表示）

---

### 13.2 新しいAPI仕様

#### GET /api/col/job/{job_id}
- **機能**: ログ収集ジョブのステータス確認
- **レスポンス**:
  ```json
  {
    "status": "success",
    "data": {
      "status": "pending" | "running" | "completed" | "failed",
      "cvm": "10.55.23.29",
      "created_at": "2025-10-09T15:09:18.355000",
      "started_at": "2025-10-09T15:09:18.356000",
      "completed_at": "2025-10-09T15:14:32.123000",
      "result": { "message": "finished collect log" },
      "error": null,
      "progress": {
        "stage": "logfiles" | "commands" | "zip" | "done",
        "current": 15,
        "total": 26,
        "message": "ログファイルをダウンロード中... (15/26)"
      }
    }
  }
  ```

#### POST /api/col/getlogs（変更後）
- **レスポンス**:
  ```json
  {
    "status": "success",
    "message": "ログ収集を開始しました",
    "data": {
      "job_id": "8d52884e-5c05-416e-9fd2-764315aedc32",
      "status": "pending"
    }
  }
  ```
- **処理時間**: 1-2ms（即座にレスポンス）

---

### 13.3 リアルタイム進捗表示機能の追加（2025-10-10追加）

#### 問題3: プログレスバーが100%になってから待たされる

**症状**:
- プログレスバーが100%になってから約1分20秒待たされる
- docker-compose環境では即座に完了していた
- ユーザーは「100%になったのに何故待つの？」と混乱

**根本原因**:
- プログレスバーが**時間ベース（30秒で100%）**で動作していた
- 実際のログ収集は**約2分（120秒）**かかる
- プログレスバーと実際の進捗が一致していなかった

**解決方法（リアルタイム進捗表示）**:

1. **バックエンド: 進捗コールバック機能を追加**
```python
# backend/core/broker_col.py

class CollectLogGateway():
    def collect_logs(self, cvm, progress_callback=None):
        # ログファイルダウンロード
        total_files = len(logfile_list)
        if progress_callback:
            progress_callback({
                "stage": "logfiles",
                "current": 0,
                "total": total_files,
                "message": "ログファイルのダウンロードを開始しています..."
            })
        
        for i, item in enumerate(logfile_list):
            # ダウンロード処理...
            if progress_callback:
                progress_callback({
                    "stage": "logfiles",
                    "current": i + 1,
                    "total": total_files,
                    "message": f"ログファイルをダウンロード中... ({i + 1}/{total_files})"
                })
        
        # コマンド実行
        total_commands = len(command_list)
        if progress_callback:
            progress_callback({
                "stage": "commands",
                "current": 0,
                "total": total_commands,
                "message": "コマンドを実行しています..."
            })
        
        for cmd_idx, command_item in enumerate(command_list):
            # コマンド実行...
            if progress_callback:
                progress_callback({
                    "stage": "commands",
                    "current": cmd_idx + 1,
                    "total": total_commands,
                    "message": f"コマンドを実行中... ({cmd_idx + 1}/{total_commands})"
                })
        
        # ZIP作成
        if progress_callback:
            progress_callback({
                "stage": "zip",
                "current": 0,
                "total": 100,
                "message": "ZIPファイルを作成しています..."
            })
        
        # ZIP作成処理...
        
        if progress_callback:
            progress_callback({
                "stage": "zip",
                "current": 100,
                "total": 100,
                "message": "ZIPファイルの作成が完了しました"
            })
```

2. **バックエンド: ジョブステータスに進捗情報を追加**
```python
# backend/fastapi_app/routers/collect_log.py

async def run_log_collection(job_id: str, cvm: str) -> None:
    """バックグラウンドでログ収集を実行"""
    # 進捗情報を初期化
    collection_jobs[job_id]["progress"] = {
        "stage": "init",
        "current": 0,
        "total": 100,
        "message": "ログ収集を開始しています..."
    }
    
    # 進捗コールバック関数
    def progress_callback(progress_info):
        collection_jobs[job_id]["progress"] = progress_info
        api_logger.info(
            f"Log collection progress: {progress_info.get('message')}",
            event_type=EventType.DATA_CREATE,
            job_id=job_id,
            stage=progress_info.get("stage"),
            progress=f"{progress_info.get('current')}/{progress_info.get('total')}"
        )
    
    # 同期的な処理を別スレッドで実行
    loop = asyncio.get_event_loop()
    data = await loop.run_in_executor(None, col.collect_logs, cvm, progress_callback)
```

3. **フロントエンド: 実際の進捗を表示**
```typescript
// frontend/app/collectlog/hooks/useCollectLogApi.ts

const collectLogs = async (
  cvm: string,
  onProgress?: (progress: { stage: string; current: number; total: number; message: string }) => void
) => {
  const jobId = jobResponse.job_id
  
  // ジョブ完了をポーリング（最大5分、1秒ごと）
  const maxAttempts = 300  // 5分 = 300 * 1秒
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000)) // 1秒待機
    
    const statusResponse = await fetch(`/api/col/job/${jobId}`)
    
    // 進捗情報をコールバックで通知
    const progress = statusResponse?.progress
    if (progress && onProgress) {
      onProgress(progress)
    }
  }
}
```

4. **フロントエンド: Collectingコンポーネントを改善**
```typescript
// frontend/components/collecting.tsx

interface CollectingProps {
  progress?: {
    stage: string
    current: number
    total: number
    message: string
  } | null
}

export default function Collecting({ progress: actualProgress }: CollectingProps) {
  // 実際の進捗を計算
  const progress = actualProgress 
    ? (actualProgress.current / actualProgress.total) * 100
    : fallbackProgress  // フォールバック: 120秒で100%
  
  return (
    <div>
      {/* 進捗メッセージを表示 */}
      <span>{actualProgress?.message || 'Progress'}</span>
      <span>{Math.round(progress)}%</span>
      {/* プログレスバー */}
    </div>
  )
}
```

5. **フロントエンド: 最新ZIP自動選択**
```typescript
// frontend/app/collectlog/collectlog-content.tsx

const handleCollectLogs = async () => {
  const result = await collectLogs(state.cvmChecked, (progress) => {
    setCollectProgress(progress)  // 進捗情報を更新
  })
  
  if (result) {
    const zipList = await getZipList()
    const sorted = [...zipList].sort(/* 降順ソート */)
    setState(prev => ({ ...prev, zipList: sorted }))
    
    // 最新のZIPを自動選択
    if (sorted.length > 0) {
      const latestZip = sorted[0]
      await handleZipSelect(latestZip)
    }
  }
  
  setState(prev => ({ ...prev, collecting: false }))
}
```

**効果**:
- ✅ プログレスバーが実際の進捗を正確に反映
- ✅ 進捗メッセージでユーザーに何が実行されているか通知
  - 「ログファイルをダウンロード中... (15/26)」
  - 「コマンドを実行中... (8/13)」
  - 「ZIPファイルを作成しています...」
- ✅ ポーリング間隔を5秒 → 1秒に短縮し、完了を即座に検知
- ✅ 100%完了後、1秒以内に画面切り替わり
- ✅ 最新のZIPファイルが自動選択され、すぐにログを確認可能
- ✅ フォールバック機能（進捗情報がない場合は120秒で100%）

**修正ファイル**:
- `backend/core/broker_col.py`
- `backend/fastapi_app/routers/collect_log.py`
- `frontend/app/collectlog/hooks/useCollectLogApi.ts`
- `frontend/app/collectlog/collectlog-content.tsx`
- `frontend/components/collecting.tsx`

**イメージバージョン**:
- バックエンド: v1.0.18 → v1.0.24
- フロントエンド: v1.0.33 → v1.0.44

---
