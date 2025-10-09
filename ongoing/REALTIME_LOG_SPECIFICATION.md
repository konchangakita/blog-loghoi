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

##### 2. `disconnect` イベント（318-323行目）
```python
@sio.event
async def disconnect(sid):
    """SocketIO切断時の処理"""
    print(f"SocketIO disconnected: {sid}")
    # 接続管理システムから削除（SSH接続とログ監視も即座に停止）
    await connection_manager.remove_socket_connection(sid)
    print(f"Cleanup done for: {sid}")
```

**処理内容**:
```python
# connection_manager.py (53-73行目)
async def remove_socket_connection(self, sid: str) -> None:
    """SocketIO接続を削除し、関連するSSH接続も即座に切断"""
    print(f"🔌 SocketIO接続を削除開始: {sid}")
    
    # 1. 関連するSSH接続を即座に切断
    await self._cleanup_ssh_connection(sid)
    
    # 2. 関連するログ監視タスクを即座に停止
    await self._cleanup_monitoring_task(sid)
    
    # 3. アイドル監視タスクを停止
    if sid in self.socket_connections:
        task = self.socket_connections[sid].get('idle_watch_task')
        if task:
            task.cancel()
```

**重要**: ページリロード、ブラウザ閉じる、ネットワーク切断など、あらゆる切断シナリオで自動的にリソースをクリーンアップ

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

#### 3-1. 正常停止（ユーザー操作）
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

#### 3-2. 自動停止（ページリロード・離脱）
```
ユーザー: ページリロード（F5）/ ブラウザ閉じる / 他ページへ遷移
  ↓
フロントエンド: beforeunload/pagehideイベント発火
  ↓
  1. socket.emit('stop_tail_f', {}) 送信（可能な場合）
  2. socket.disconnect() 実行
  ↓
バックエンド: disconnectイベント発火
  ↓
  1. connection_manager.stop_all(sid) 実行
  2. すべてのSSH接続切断
  3. すべてのログ監視停止
```

**実装詳細**:
```typescript
// components/shared/LogViewer.tsx (378-419行目)
useEffect(() => {
  if (variant !== 'realtime') return

  const stopImmediately = () => {
    try {
      // 可能ならstopを先に通知
      if (socket && socket.connected) {
        try {
          socket.emit('stop_tail_f', {})
        } catch {}
      }
    } finally {
      // 常に切断実行
      if (socket) {
        try {
          socket.disconnect()
        } catch {}
      }
      setIsActive(false)
      setIsConnecting(false)
    }
  }

  const handleBeforeUnload = () => {
    stopImmediately()
  }

  const handlePageHide = () => {
    stopImmediately()
  }

  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('pagehide', handlePageHide)

  // アンマウント時も確実に停止
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
    window.removeEventListener('pagehide', handlePageHide)
    stopImmediately()
  }
}, [variant, socket])
```

**重要**: 
- ✅ **`beforeunload`イベント**: ページリロード・閉じる時に発火
- ✅ **`pagehide`イベント**: ページが非表示になる時に発火（iOS Safari対応）
- ✅ **アンマウント時のクリーンアップ**: コンポーネント破棄時も確実に切断
- ✅ **二重の保護**: フロントエンドで切断 + バックエンドで`disconnect`イベント処理

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

## 完了した設定・ファイル

### ✅ 完了済み

#### 1. `lib/rt-logs.ts`
- **状態**: ✅ 作成済み（2025-10-05）
- **内容**: Nutanix CVMの主要ログファイルリスト
- **ファイルサイズ**: 6612 bytes

#### 2. SSH接続設定
- **状態**: ✅ 完了（2025-10-09）
- **対応済み**:
  - SSH秘密鍵パス修正（`/usr/src` → `/app`）
  - fsGroup設定でパーミッション解決
  - Kubernetes Secretを最新の鍵で更新

#### 3. ログビューワー表示
- **状態**: ✅ 完了（2025-10-09）
- **対応済み**: 2層構造に戻してスクロール・表示を修正

### 🟡 要確認

#### 4. ネットワークポリシー
- **状態**: ⚠️ 未確認
- **影響**: Kubernetes PodからCVMへのSSH接続（ポート22）がブロックされる可能性
- **対応**: NetworkPolicyまたはファイアウォール設定を確認

### 🟢 オプション

#### 5. `/api/rt/taillist` エンドポイント
- **状態**: ❌ 未実装
- **影響**: なし（現在は使用されていない）
- **対応**: 将来的に動的ログファイルリスト取得が必要な場合に実装

---

## エラーパターンと対処

### エラー1: ログファイルリストが表示されない
**原因**: `lib/rt-logs.ts`が存在しない  
**症状**: ブラウザコンソールに`Module not found: Can't resolve '@/lib/rt-logs'`  
**対処**: ✅ 解決済み（2025-10-05にファイル作成完了）

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

1. **Socket.IO動作確認**
   - 実際にCVMのログがリアルタイムで流れてくるかテスト
   - バックエンドで`start_tail_f`イベントが受信されているか確認
   - `tail_f_status`イベントのステータス確認
   - フロントエンドで`log`イベントが受信されているか確認

### 🟡 動作確認後に対応

2. **エラーハンドリング改善**
   - フロントエンドでのエラーメッセージ表示改善
   - タイムアウト処理の追加
   - 再接続ロジックの実装

3. **ネットワークポリシー確認**
   - Kubernetes PodからCVMへのSSH接続（ポート22）が可能か確認
   - NetworkPolicyまたはファイアウォール設定の確認

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
- ✅ `lib/rt-logs.ts`ファイル作成完了（2025-10-05）
- ✅ SSH接続設定完了（鍵パス修正、fsGroup設定、Secret更新）
- ✅ ログビューワー表示修正完了（2層構造に戻す）

### 次のステップ
1. **Socket.IO動作確認** - 実際にログが流れてくるかテスト
2. **エラーハンドリング改善** - タイムアウト、再接続ロジック
3. **パフォーマンス最適化** - ログバッファリング、メモリ管理

---

作成日: 2025-10-09  
最終更新: 2025-10-09 17:30

---

## 解決した問題

### 1. Socket.IO接続が404エラー (2025-10-09 午前)

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

### 2. Socket.IO polling時の400 Bad Request (2025-10-09 午後)

**症状**:
```
POST https://10.55.23.41/socket.io/?EIO=4&transport=polling&sid=xxx 400 (Bad Request)
SocketIO connection error: xhr poll error
```

**原因**:
- TraefikがSocket.IOのpollingリクエストをバッファリング
- POSTリクエストのボディが正しく転送されない

**解決方法**:
1. **Ingressにバッファリング無効化アノテーション追加**
   ```yaml
   annotations:
     traefik.ingress.kubernetes.io/router.buffering.flushinterval: "0"
   ```

2. **フロントエンドでWebSocket優先使用**
   ```typescript
   // 修正前
   transports: ['polling', 'websocket']
   
   // 修正後
   transports: ['websocket']
   ```

**修正ファイル**:
- `k8s/ingress.yaml`
- `frontend/next-app/loghoi/app/realtimelog/realtimelog-content.tsx`

**フロントエンドイメージ**: v1.0.28 → v1.0.29

✅ WebSocket接続が安定動作

---

### 3. SSH接続エラー (2025-10-09 午後)

**症状**:
```
[Errno 13] Permission denied: '/app/config/.ssh/ntnx-lockdown'
[Errno 2] No such file or directory: '/usr/src/config/.ssh/ntnx-lockdown'
paramiko.ssh_exception.AuthenticationException: Authentication (publickey) failed
```

**原因**:
1. SSH鍵パスがハードコード（`/usr/src/config/.ssh/ntnx-lockdown`）
2. SSH鍵ファイルの権限不足（root:root、appuserが読めない）
3. Kubernetes Secretの鍵が古い（ローカルの鍵と不一致）

**解決方法**:

1. **SSH鍵パスを修正**
   ```python
   # 修正前
   private_key_path = '/usr/src/config/.ssh/ntnx-lockdown'
   
   # 修正後
   private_key_path = '/app/config/.ssh/ntnx-lockdown'
   ```

2. **Pod securityContextにfsGroupを追加**
   ```yaml
   securityContext:
     fsGroup: 1000  # appuserのグループID
   ```

3. **Kubernetes Secretを最新の鍵で更新**
   ```bash
   kubectl create secret generic loghoi-secrets \
     --from-file=ntnx-lockdown=/home/nutanix/konchangakita/blog-loghoi/ongoing/backend/config/.ssh/ntnx-lockdown \
     --from-file=ntnx-lockdown.pub=/home/nutanix/konchangakita/blog-loghoi/ongoing/backend/config/.ssh/ntnx-lockdown.pub \
     --dry-run=client -o yaml | kubectl apply -f -
   ```

**修正ファイル**:
- `backend/core/broker_col.py`
- `backend/core/common.py`
- `k8s/backend-deployment.yaml`

**バックエンドイメージ**: v1.0.14 → v1.0.15

✅ SSH接続が正常動作

---

### 4. ログビューワー表示の不具合 (2025-10-09 午後)

**症状**:
- ログが画面内で途切れ、スクロールバーが表示されない
- 横スクロールが機能しない
- ログが長いとビューワーが横に伸びてしまう

**原因**:
- `LogViewer`コンポーネント共通化時に複雑な3層構造を導入
- `overflow-auto`が内側のdivに設定され、外側のdivが固定サイズになっていた

**解決方法**:
共通化前のシンプルな2層構造に戻す

```tsx
// 正しい構造（2層）
<div className='mockup-code h-[480px] overflow-auto text-left mx-5' ref={logViewRef}>
  <div className='w-[640px]'>
    <pre className='px-2'>
      <code>
        {filteredLogs.map((log: LogEntry, i) => {
          return (
            <div className='text-xs m-0 flex items-start' key={i}>
              <span className='text-gray-500 mr-1 min-w-[40px] flex-shrink-0 text-right'>
                {String(i + 1).padStart(4, ' ')}
              </span>
              <span className='text-primary font-bold mr-1 min-w-[80px] flex-shrink-0'>
                [{log.name}]
              </span>
              <span className='text-gray-300 flex-1 break-all'>
                {log.line}
              </span>
            </div>
          )
        })}
      </code>
    </pre>
  </div>
</div>
```

**重要なポイント**:
1. **外側の`mockup-code`に`overflow-auto`** - スクロールは外側で処理
2. **内側は`w-[640px]`のみ** - 640px固定幅、余計な`overflow-auto`や`h-full`は不要
3. **シンプルな2層構造** - `mockup-code` > `w-[640px]` > `pre` > `code`
4. **ログ行は`break-all`** - 長い行は折り返す
5. **`flex items-start`** - 行番号とログ名を横並びに

**修正ファイル**:
- `components/shared/LogViewer.tsx`

**フロントエンドイメージ**: v1.0.28 → v1.0.29

✅ ログビューワーが正常に表示・スクロール動作

---

## 現在の既知の問題

### ⚠️ Socket.IOの挙動が不安定

**症状**:
- WebSocket接続は確立されるが、実際のログデータが流れてこない可能性
- `start_tail_f`イベント送信後のレスポンスが不明確

**次の調査項目**:
1. バックエンドで`start_tail_f`イベントが正しく受信されているか
2. SSH接続が確立され、`tail -f`が実行されているか
3. `log`イベントが正しく送信されているか
4. フロントエンドで`log`イベントが正しく受信されているか

**調査方法**:
- バックエンドログで`start_tail_f`の受信を確認
- `tail_f_status`イベントのステータスを確認
- フロントエンドのコンソールで受信イベントをログ出力

---
