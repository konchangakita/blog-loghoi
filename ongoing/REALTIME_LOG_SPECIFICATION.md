# リアルタイムログ機能 仕様書

## 概要
Nutanix CVMのログファイルをリアルタイム（tail -f）で監視・表示する機能。
Socket.IOを使用してバックエンドからフロントエンドにログをストリーミング配信する。

---

## アーキテクチャ

### フロントエンド
- **フレームワーク**: Next.js (React)
- **通信**: Socket.IO Client
- **ページ**: `/realtimelog`

### バックエンド
- **フレームワーク**: FastAPI
- **通信**: Socket.IO Server (python-socketio)
- **SSH接続**: Paramiko
- **ログ監視**: asyncio + SSH tail -f

---

## 実装状況

### ✅ 実装済み（バックエンド）

#### Socket.IOサーバー
- **ファイル**: `backend/fastapi_app/app_fastapi.py`
- **エンドポイント**: `/socket.io/`
- **実装内容**:
  ```python
  # SocketIOサーバーの作成（91行目）
  sio = socketio.AsyncServer(
      async_mode='asgi',
      cors_allowed_origins='*',
      logger=False,
      socketio_path='/socket.io/',
  )
  
  # FastAPIに統合（150行目）
  socket_app = socketio.ASGIApp(sio, app, socketio_path='/socket.io/')
  ```

#### イベントハンドラー

##### 1. `connect` イベント（307行目）
```python
@sio.event
async def connect(sid, environ):
    """SocketIO接続時の処理"""
    print(f"SocketIO connected: {sid}")
```

##### 2. `disconnect` イベント（319行目）
```python
@sio.event
async def disconnect(sid):
    """SocketIO切断時の処理"""
    print(f"SocketIO disconnected: {sid}")
    await connection_manager.stop_all(sid)
```

##### 3. `start_tail_f` イベント（326行目）
```python
@sio.event
async def start_tail_f(sid, data):
    """tail -f開始イベント"""
    # パラメータ:
    # - cvm_ip: CVMのIPアドレス
    # - log_path: 監視するログファイルのパス
    # - log_name: ログファイルの表示名
    
    # 処理フロー:
    # 1. SSH接続確立
    # 2. tail -f コマンド実行
    # 3. ログ行を'log'イベントで送信
    # 4. 'tail_f_status'イベントで状態通知
```

##### 4. `stop_tail_f` イベント（373行目）
```python
@sio.event
async def stop_tail_f(sid, data):
    """tail -f停止イベント"""
    # 処理:
    # - ログ監視停止
    # - SSH接続切断
```

#### 送信イベント

##### 1. `log` イベント
```python
# ログ行を送信（236-245行目）
await sio.emit('log', {
    'name': log_name,
    'line': log_line
}, to=sid)
```

##### 2. `tail_f_status` イベント
```python
# ステータス通知
await sio.emit('tail_f_status', {
    'status': 'started' | 'stopped' | 'error',
    'message': 'メッセージ'
}, to=sid)
```

---

### ✅ 実装済み（フロントエンド）

#### コンポーネント
1. **`app/realtimelog/page.tsx`** - ページエントリーポイント
2. **`app/realtimelog/realtimelog-content.tsx`** - メインコンテンツ
3. **`app/realtimelog/realtimelog-logview.tsx`** - ログビューアラッパー
4. **`components/shared/LogViewer.tsx`** - 共通ログビューアコンポーネント

#### Socket.IO接続処理
```typescript
// 接続開始（258-266行目）
const backendUrl = getBackendUrl()
const newsocket = io(`${backendUrl}/`, {
  transports: ['polling', 'websocket'],
  upgrade: true,
  rememberUpgrade: false,
  timeout: 20000,
  forceNew: true,
})

// イベント送信
newsocket.emit('start_tail_f', {
  cvm_ip: cvmChecked,
  log_path: tailPath,
  log_name: tailName
})

// イベント受信
socket.on('log', (msg: any) => {
  setRealtimeLogs((logs) => {
    const newLogs = [...logs, { name: msg.name || tailName, line: msg.line }]
    return newLogs
  })
})

socket.on('tail_f_status', (data: any) => {
  if (data.status === 'started') {
    setIsActive(true)
  } else if (data.status === 'stopped') {
    setIsActive(false)
  } else if (data.status === 'error') {
    setIsActive(false)
  }
})
```

---

### ❌ 不足している実装

#### 1. **`lib/rt-logs.ts` ファイルが存在しない**

**問題**: 
- `app/realtimelog/realtimelog-content.tsx`の10行目で`import { LogFiles } from '@/lib/rt-logs'`をインポート
- ファイルが存在しないため、ビルドエラーまたはランタイムエラーが発生

**必要な実装**:
```typescript
// lib/rt-logs.ts
export const LogFiles = [
  { name: 'genesis', path: '/home/nutanix/data/logs/genesis.out' },
  { name: 'acropolis', path: '/home/nutanix/data/logs/acropolis.out' },
  { name: 'cerebro', path: '/home/nutanix/data/logs/cerebro.out' },
  { name: 'prism', path: '/home/nutanix/data/logs/prism.out' },
  { name: 'zookeeper', path: '/home/nutanix/data/logs/zookeeper.out' },
  // ... その他のログファイル
]
```

**影響範囲**:
- ログファイル選択リストが表示されない
- ユーザーがtail対象のログファイルを選択できない

---

#### 2. **`/api/rt/taillist` エンドポイント（オプション）**

**問題**:
- `app/_api/getTailList.ts`で`/api/rt/taillist`エンドポイントを呼び出し
- バックエンドに実装されていない
- ただし、現在のコードでは使用されていない（`LogFiles`を直接使用）

**必要性**: 
- ❌ **不要** - `lib/rt-logs.ts`で静的に定義すれば十分
- ⚠️ **将来的に実装推奨** - 動的にログファイルリストを取得したい場合

---

## 動作フロー

### 1. ページアクセス
```
ユーザー → https://10.55.23.41/realtimelog?pcip=X&cluster=Y&prism=Z
  ↓
フロントエンド: CVMリスト取得
  ↓
POST /api/cvmlist → バックエンド
  ↓
CVMリスト表示 + ログファイルリスト表示
```

### 2. ログ取得開始
```
ユーザー: ログファイル選択 + CVM選択 + 「ログ取得開始」ボタンクリック
  ↓
Socket.IO接続: io(`${backendUrl}/`)
  ↓
イベント送信: start_tail_f { cvm_ip, log_path, log_name }
  ↓
バックエンド:
  1. SSH接続確立 (connection_manager.add_ssh_connection)
  2. tail -f コマンド実行 (connection_manager.start_log_monitoring)
  3. ログ行をリアルタイムで送信 (sio.emit('log', {...}))
  ↓
フロントエンド: 'log'イベント受信 → 画面に表示
```

### 3. ログ取得停止
```
ユーザー: 「ログ取得停止」ボタンクリック
  ↓
イベント送信: stop_tail_f {}
  ↓
バックエンド:
  1. ログ監視停止
  2. SSH接続切断
  3. 'tail_f_status' { status: 'stopped' } 送信
  ↓
フロントエンド: Socket.IO切断
```

---

## 必要な修正

### 🔧 修正1: `lib/rt-logs.ts` ファイルを作成

**ファイルパス**: `/home/nutanix/konchangakita/blog-loghoi/ongoing/frontend/next-app/loghoi/lib/rt-logs.ts`

**内容**:
```typescript
/**
 * リアルタイムログで監視可能なログファイル一覧
 * Nutanix CVMの主要ログファイル
 */
export interface LogFile {
  name: string
  path: string
}

export const LogFiles: LogFile[] = [
  { name: 'genesis', path: '/home/nutanix/data/logs/genesis.out' },
  { name: 'acropolis', path: '/home/nutanix/data/logs/acropolis.out' },
  { name: 'cerebro', path: '/home/nutanix/data/logs/cerebro.out' },
  { name: 'prism', path: '/home/nutanix/data/logs/prism.out' },
  { name: 'zookeeper', path: '/home/nutanix/data/logs/zookeeper.out' },
  { name: 'stargate', path: '/home/nutanix/data/logs/stargate.out' },
  { name: 'curator', path: '/home/nutanix/data/logs/curator.out' },
  { name: 'uhura', path: '/home/nutanix/data/logs/uhura.out' },
  { name: 'ergon', path: '/home/nutanix/data/logs/ergon.out' },
  { name: 'hades', path: '/home/nutanix/data/logs/hades.out' },
  { name: 'pithos', path: '/home/nutanix/data/logs/pithos.out' },
  { name: 'cassandra', path: '/home/nutanix/data/logs/cassandra.out' },
  { name: 'alerts', path: '/home/nutanix/data/logs/alerts.out' },
  { name: 'syslog', path: '/var/log/messages' },
]
```

**優先度**: 🔴 **高** - これがないとログファイル選択リストが表示されない

---

### 🔧 修正2: Socket.IO接続パスの確認

**現在の接続URL**:
```typescript
io(`${backendUrl}/`)  // 例: https://10.55.23.41/
```

**Socket.IOパス**:
- バックエンド: `/socket.io/`
- Ingress: `/socket.io` → `loghoi-backend-service:7776`

**確認事項**:
- ✅ Ingressで`/socket.io`パスが設定されている
- ✅ バックエンドで`socketio_path='/socket.io/'`が設定されている
- ✅ フロントエンドで`getBackendUrl()`を使用している

**優先度**: 🟢 **低** - 既に正しく設定されている

---

### 🔧 修正3: SSH接続設定の確認

**必要な設定**:
1. **SSH秘密鍵** - CVMに接続するための鍵
2. **SSH known_hosts** - CVMのホスト鍵
3. **SSH接続権限** - Kubernetes Podからの外部SSH接続

**現在の状態**:
- ✅ SSH秘密鍵マウント設定あり（backend-deployment.yamlのvolumeMounts）
- ✅ Secret `loghoi-secrets`が存在
- ⚠️ SSH接続テストが必要

**優先度**: 🟡 **中** - SSH接続エラーが発生する可能性

---

## 不足しているファイル・設定

### 🔴 必須

#### 1. `lib/rt-logs.ts`
- **状態**: ❌ 存在しない
- **影響**: ログファイル選択リストが表示されない
- **対応**: ファイルを作成する

### 🟡 推奨

#### 2. SSH接続テスト
- **状態**: ⚠️ 未確認
- **影響**: tail -f開始時にSSH接続エラーが発生する可能性
- **対応**: 
  - SSH秘密鍵が正しく配置されているか確認
  - CVMへのSSH接続をテスト
  - known_hostsの設定確認

#### 3. ネットワークポリシー
- **状態**: ⚠️ 未確認
- **影響**: Kubernetes PodからCVMへのSSH接続（ポート22）がブロックされる可能性
- **対応**: NetworkPolicyまたはファイアウォール設定を確認

### 🟢 オプション

#### 4. `/api/rt/taillist` エンドポイント
- **状態**: ❌ 未実装
- **影響**: なし（現在は使用されていない）
- **対応**: 将来的に動的ログファイルリスト取得が必要な場合に実装

---

## エラーパターンと対処

### エラー1: ログファイルリストが表示されない
**原因**: `lib/rt-logs.ts`が存在しない  
**症状**: ブラウザコンソールに`Module not found: Can't resolve '@/lib/rt-logs'`  
**対処**: `lib/rt-logs.ts`を作成する

### エラー2: Socket.IO接続エラー
**原因**: Ingressで`/socket.io`パスが設定されていない  
**症状**: ブラウザコンソールに`SocketIO connection error`  
**対処**: ✅ 既に設定済み（`ingress.yaml`の24-29行目）

### エラー3: SSH接続エラー
**原因**: SSH秘密鍵が正しく配置されていない、またはCVMへの接続権限がない  
**症状**: `tail_f_status` { status: 'error', message: 'SSH接続失敗' }  
**対処**: 
- SSH秘密鍵の確認
- CVMへのSSH接続テスト
- NetworkPolicy確認

### エラー4: tail -f開始エラー
**原因**: ログファイルパスが間違っている、または権限がない  
**症状**: `tail_f_status` { status: 'error', message: 'ログ監視開始失敗' }  
**対処**: 
- ログファイルパスの確認
- CVMでのファイル存在確認
- ファイル読み取り権限確認

---

## 次のアクションアイテム

### 🔴 即座に対応が必要

1. **`lib/rt-logs.ts`ファイルを作成**
   - ファイルパス: `frontend/next-app/loghoi/lib/rt-logs.ts`
   - 内容: Nutanix CVMの主要ログファイルリスト
   - 優先度: 最高

### 🟡 動作確認後に対応

2. **SSH接続テスト**
   - バックエンドPodからCVMへのSSH接続確認
   - SSH秘密鍵の配置確認
   - known_hostsの設定確認

3. **エラーハンドリング改善**
   - フロントエンドでのエラーメッセージ表示改善
   - タイムアウト処理の追加
   - 再接続ロジックの実装

### 🟢 将来的に検討

4. **動的ログファイルリスト取得**
   - `/api/rt/taillist`エンドポイントの実装
   - CVMから実際のログファイルリストを取得

5. **パフォーマンス最適化**
   - ログバッファリング
   - 仮想化スクロールの最適化
   - メモリ使用量の削減

---

## 技術仕様

### Socket.IO設定

#### バックエンド
```python
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=False,
    socketio_path='/socket.io/',
)
```

#### フロントエンド
```typescript
io(`${backendUrl}/`, {
  transports: ['polling', 'websocket'],
  upgrade: true,
  rememberUpgrade: false,
  timeout: 20000,
  forceNew: true,
})
```

### Ingress設定
```yaml
- path: /socket.io
  pathType: Prefix
  backend:
    service:
      name: loghoi-backend-service
      port:
        number: 7776
```

---

## テストシナリオ

### 基本動作テスト

1. **ページアクセス**
   - URL: `https://10.55.23.41/realtimelog?pcip=X&cluster=Y&prism=Z`
   - 期待: CVMリストとログファイルリストが表示される

2. **Socket.IO接続**
   - 操作: 「ログ取得開始」ボタンクリック
   - 期待: Socket.IO接続が確立される

3. **tail -f開始**
   - 操作: ログファイルとCVMを選択して「ログ取得開始」
   - 期待: リアルタイムでログが表示される

4. **tail -f停止**
   - 操作: 「ログ取得停止」ボタンクリック
   - 期待: ログ取得が停止し、Socket.IO接続が切断される

### エラーハンドリングテスト

1. **SSH接続エラー**
   - 条件: SSH秘密鍵が正しくない
   - 期待: エラーメッセージが表示される

2. **ログファイルが存在しない**
   - 条件: 存在しないログファイルパスを指定
   - 期待: エラーメッセージが表示される

3. **ネットワーク切断**
   - 条件: ネットワークが切断される
   - 期待: 自動的に再接続を試みる（または適切なエラー表示）

---

## 依存関係

### フロントエンド
- `socket.io-client`: ^4.7.2
- `file-saver`: ^2.0.5
- `react-hook-form`: ^7.46.0

### バックエンド
- `python-socketio`: (requirements.txtで確認)
- `paramiko`: SSH接続ライブラリ
- `asyncio`: 非同期処理

---

## 関連ファイル

### フロントエンド
- `app/realtimelog/page.tsx`
- `app/realtimelog/realtimelog-content.tsx`
- `app/realtimelog/realtimelog-logview.tsx`
- `components/shared/LogViewer.tsx`
- `app/_api/getTailList.ts`
- ❌ `lib/rt-logs.ts` (不足)

### バックエンド
- `backend/fastapi_app/app_fastapi.py` (Socket.IOハンドラー)
- `backend/core/common.py` (SSH接続ユーティリティ)

### Kubernetes
- `k8s/ingress.yaml` (Socket.IOパス設定)
- `k8s/backend-deployment.yaml` (SSH秘密鍵マウント)
- `k8s/secrets.yaml` (SSH秘密鍵)

---

## まとめ

### 現在の状況
- ✅ バックエンドのSocket.IO実装は完了
- ✅ フロントエンドのSocket.IO接続実装は完了
- ✅ Ingressの設定は完了
- ❌ **`lib/rt-logs.ts`が不足** ← これが原因でログファイルリストが表示されない

### 次のステップ
1. **`lib/rt-logs.ts`を作成** （最優先）
2. SSH接続テスト
3. 動作確認

---

作成日: 2025-10-09  
最終更新: 2025-10-09

---

## 解決した問題 (2025-10-09)

### 問題: Socket.IO接続が404エラー

**症状**:
```
GET https://10.55.23.41/socket.io/?EIO=4&transport=polling&t=57gfi4h5 404 (Not Found)
SocketIO connection error: xhr poll error
```

**原因**:
- Uvicornが`fastapi_app.app_fastapi:app`（FastAPIのみ）を起動
- Socket.IO統合アプリケーション`socket_app`が起動されていなかった

**解決方法**:
```dockerfile
# 修正前
CMD ["python", "-m", "uvicorn", "fastapi_app.app_fastapi:app", "--host", "0.0.0.0", "--port", "7776"]

# 修正後
CMD ["python", "-m", "uvicorn", "fastapi_app.app_fastapi:socket_app", "--host", "0.0.0.0", "--port", "7776"]
```

**修正ファイル**:
- `backend/Dockerfile.k8s`

**バックエンドイメージ**: v1.0.13 → v1.0.14

**確認**:
```bash
$ curl "https://10.55.23.41/socket.io/?EIO=4&transport=polling"
0{"sid":"yNelje5glyrxRoP2AAAA","upgrades":["websocket"],"pingTimeout":60000,"pingInterval":25000,"maxPayload":1000000}
```

✅ Socket.IO接続が正常に動作

---
