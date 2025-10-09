import sys
import os
from typing import Dict, Any, List
import asyncio
import threading
import time

# 共通ライブラリのパスを追加
sys.path.append(os.path.join(os.path.dirname(__file__), '../../shared'))

# FastAPI関連インポート
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
import uvicorn

# SocketIO関連インポート
import socketio

# 接続管理システムのインポート
from fastapi_app.connection_manager import connection_manager

# Elasticsearch
from elasticsearch import Elasticsearch

# 共通ライブラリからインポート
from shared.gateways import (
    RegistGateway, 
    RealtimeLogGateway, 
    SyslogGateway, 
    ElasticGateway
)
from ..core.common import connect_ssh, get_cvmlist
from ..config import Config

# ルーターのインポート
from .routers.collect_log import router as collect_log_router
from .routers.collect_log import cache as collect_cache
from .routers.uuid import router as uuid_router

# エラーハンドリングのインポート
from .utils.error_handler import global_exception_handler, APIError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError, ServiceUnavailableError

# ログミドルウェアのインポート
from .middleware.logging_middleware import LoggingMiddleware
from .utils.structured_logger import system_logger, EventType

# ========================================
# Pydantic Models (Request/Response)
# ========================================

class PCRegistRequest(BaseModel):
    prism_user: str
    prism_pass: str
    prism_ip: str

class PCClusterRequest(BaseModel):
    pcip: str

class SyslogSearchRequest(BaseModel):
    keyword: str
    start_datetime: str
    end_datetime: str
    serial: str = None
    cluster: str = None


class WebSocketLogMessage(BaseModel):
    cvm: str
    tail_name: str
    tail_path: str

# ========================================
# FastAPI Application Setup
# ========================================

app = FastAPI(
    title="LogHoi API",
    description="Nutanix Log Collection and Real-time Monitoring API",
    version="2.0.0",
    docs_url="/docs",  # Swagger UI
    redoc_url="/redoc"  # ReDoc
)

# ログミドルウェアを追加
app.add_middleware(LoggingMiddleware)

# SocketIOサーバーの作成
sio = socketio.AsyncServer(
    cors_allowed_origins="*",
    async_mode='asgi',
    logger=False,  # SocketIOのログ（"emitting event"等）を抑制
    engineio_logger=False,  # Engine.IOの汎用ログ（"connection closed"等）を抑制
    socketio_path='/socket.io/',
    ping_timeout=60,  # pingタイムアウト（秒）
    ping_interval=25  # ping間隔（秒）
)

# SSH接続とログ取得の管理関数
def get_ssh_connection():
    """現在のSSH接続状態を取得"""
    global ssh_connection
    return ssh_connection

def set_ssh_connection(connection):
    """SSH接続を設定"""
    global ssh_connection
    ssh_connection = connection

def get_ssh_log_task():
    """現在のSSHログタスクを取得"""
    global ssh_log_task
    return ssh_log_task

def set_ssh_log_task(task):
    """SSHログタスクを設定"""
    global ssh_log_task
    ssh_log_task = task


# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番では適切に制限
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静的ファイル配信（FastAPIでは静的ファイルは不要なためコメントアウト）
# app.mount("/static", StaticFiles(directory="static"), name="static")

# ルーターをアプリケーションに統合
app.include_router(collect_log_router)
app.include_router(uuid_router)

# グローバルエラーハンドラーの登録
app.add_exception_handler(APIError, global_exception_handler)
app.add_exception_handler(ValidationError, global_exception_handler)
app.add_exception_handler(AuthenticationError, global_exception_handler)
app.add_exception_handler(AuthorizationError, global_exception_handler)
app.add_exception_handler(NotFoundError, global_exception_handler)
app.add_exception_handler(ConflictError, global_exception_handler)
app.add_exception_handler(ServiceUnavailableError, global_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# SocketIOをFastAPIに統合
socket_app = socketio.ASGIApp(sio, app, socketio_path='/socket.io/')

# SSH接続とログ取得の実装
async def start_ssh_log_monitoring(cvm_ip: str, log_path: str, log_name: str):
    """SSH接続でログ監視を開始"""
    global ssh_connection, ssh_log_task
    
    # 既存の接続がある場合はクリーンアップ
    if ssh_connection:
        print("既存のSSH接続をクリーンアップします")
        try:
            ssh_connection.close()
        except Exception as e:
            print(f"既存SSH接続のクリーンアップエラー: {e}")
        ssh_connection = None
    
    # 既存のログタスクがある場合は停止
    if ssh_log_task:
        print("既存のログタスクを停止します")
        ssh_log_task.cancel()
        ssh_log_task = None
    
    try:
        print(f"SSH接続を開始: {cvm_ip}")
        ssh_connection = connect_ssh(cvm_ip)
        if not ssh_connection:
            print(f"SSH接続に失敗しました: {cvm_ip}")
            return False
        
        print(f"SSH接続成功: {cvm_ip}")
        
        # 過去20行のログを取得（別のSSH接続を使用）
        print(f"過去のログを取得中: {log_path}")
        ssh_history = connect_ssh(cvm_ip)
        if ssh_history:
            stdin_history, stdout_history, stderr_history = ssh_history.exec_command(f"tail -n 20 {log_path}")
            
            # 過去のログを読み取り
            for line in stdout_history:
                if line.strip():
                    print(f"過去ログ: {line.strip()}")
            
            # 過去ログ用のSSH接続を閉じる
            ssh_history.close()
        
        print("過去のログ取得完了")
        
        # リアルタイム監視を開始
        print(f"リアルタイム監視を開始: {log_path} (ログ名: {log_name})")
        ssh_log_task = asyncio.create_task(monitor_realtime_logs(ssh_connection, log_path, log_name))
        
        return True
        
    except Exception as e:
        print(f"SSH接続エラー: {e}")
        if ssh_connection:
            ssh_connection.close()
            ssh_connection = None
        return False

async def monitor_realtime_logs(ssh, log_path, log_name):
    """リアルタイムログ監視（再接続機能付き）"""
    global ssh_connection, ssh_log_task
    
    line_count = 0
    reconnect_count = 0
    max_reconnects = 5
    
    try:
        while reconnect_count < max_reconnects:
            try:
                print(f"SSH接続でtail -fを実行: {log_path} (再接続回数: {reconnect_count})")
                stdin, stdout, stderr = ssh.exec_command(f"tail -f {log_path}")
                
                # リアルタイムログを読み取り
                while True:
                    try:
                        # 非同期でstdoutを読み取り
                        line = stdout.readline()
                        if not line:
                            print(f"stdoutが終了しました (再接続回数: {reconnect_count})")
                            break
                        
                        line_count += 1
                        print(f"リアルタイムログ [{line_count}]: {line.strip()}")
                        
                        # SocketIOでログを送信
                        try:
                            await sio.emit('log', {
                                'name': log_name,  # 動的に設定されたログ名
                                'line': line.strip(),
                                'line_number': line_count,
                                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
                            })
                        except Exception as e:
                            print(f"SocketIOログ送信エラー: {e}")
                        
                        # 100行ごとに接続状態を確認
                        if line_count % 100 == 0:
                            print(f"接続状態確認 - 処理済み行数: {line_count}")
                        
                        # 少し待機してから次の行を読み取り
                        await asyncio.sleep(0.1)
                        
                    except asyncio.CancelledError:
                        print("ログ監視タスクがキャンセルされました")
                        raise
                    except Exception as e:
                        print(f"ログ読み取りエラー: {e}")
                        break
            
                # 正常終了の場合はループを抜ける
                if not line:
                    break
                    
            except Exception as e:
                print(f"リアルタイムログ監視エラー: {e}")
                reconnect_count += 1
                
                if reconnect_count < max_reconnects:
                    print(f"SSH接続を再接続します ({reconnect_count}/{max_reconnects})")
                    try:
                        # SSH接続を閉じる
                        if ssh:
                            ssh.close()
                        
                        # 新しいSSH接続を確立
                        ssh = connect_ssh("10.38.112.31")  # 固定IPを使用
                        if ssh:
                            ssh_connection = ssh
                            print(f"SSH再接続成功 ({reconnect_count}/{max_reconnects})")
                            await asyncio.sleep(5)  # 5秒待機してから再試行
                        else:
                            print(f"SSH再接続失敗 ({reconnect_count}/{max_reconnects})")
                            await asyncio.sleep(10)  # 10秒待機してから再試行
                            
                    except Exception as reconnect_error:
                        print(f"SSH再接続エラー: {reconnect_error}")
                        await asyncio.sleep(10)
                else:
                    print(f"最大再接続回数に達しました ({max_reconnects})")
                    break
        
    except asyncio.CancelledError:
        print("ログ監視タスクがキャンセルされました")
        raise
    except Exception as e:
        print(f"ログ監視タスクで予期しないエラー: {e}")
    finally:
        print("リアルタイムログ監視を終了しました")

# ========================================
# SocketIO Event Handlers
# ========================================

@sio.event
async def connect(sid, environ, auth=None):
    """SocketIO接続時の処理"""
    # 要点ログのみ出力
    print(f"SocketIO connected: {sid}")
    
    # 接続管理システムに追加
    await connection_manager.add_socket_connection(sid)
    
    # 接続確認メッセージを送信
    await sio.emit('message', {'data': f'LogHoiサーバーに接続しました (ID: {sid})'}, to=sid)

@sio.event
async def disconnect(sid):
    """SocketIO切断時の処理"""
    print(f"SocketIO disconnected: {sid}")
    # 接続管理システムから削除（SSH接続とログ監視も即座に停止）
    await connection_manager.remove_socket_connection(sid)
    print(f"Cleanup done for: {sid}")

@sio.event
async def start_tail_f(sid, data):
    """tail -f開始イベント"""
    # 詳細データ出力は抑制
    print(f"tail -f start requested (SID: {sid})")
    
    try:
        cvm_ip = data.get('cvm_ip', '10.38.112.31')
        log_path = data.get('log_path', '/home/nutanix/data/logs/genesis.out')
        log_name = data.get('log_name')
        if not log_name:
            await sio.emit('tail_f_status', {
                'status': 'error',
                'message': 'ログ名が指定されていません'
            }, to=sid)
            return
        
        # 接続管理システムを使用してSSH接続とログ監視を開始
        ssh_success = await connection_manager.add_ssh_connection(sid, cvm_ip)
        if not ssh_success:
            await sio.emit('tail_f_status', {
                'status': 'error',
                'message': f'SSH接続失敗: {cvm_ip}'
            }, to=sid)
            return
        
        monitoring_success = await connection_manager.start_log_monitoring(sid, log_path, log_name, sio)
        if not monitoring_success:
            await sio.emit('tail_f_status', {
                'status': 'error',
                'message': f'ログ監視開始失敗: {log_path}'
            }, to=sid)
            return
        
        await sio.emit('tail_f_status', {
            'status': 'started',
            'message': f'tail -f開始: {cvm_ip}'
        }, to=sid)
        print(f"tail -f started: {sid}")
            
    except Exception as e:
        print(f"tail -f start error: {e}")
        await sio.emit('tail_f_status', {
            'status': 'error',
            'message': f'tail -f開始エラー: {str(e)}'
        }, to=sid)

@sio.event
async def stop_tail_f(sid, data):
    """tail -f停止イベント"""
    print(f"tail -f stop requested (SID: {sid})")
    
    try:
        # ログ監視とSSH接続を停止（仕様: 停止時はSSHごと切断）
        await connection_manager.stop_all(sid)
        
        await sio.emit('tail_f_status', {
            'status': 'stopped',
            'message': 'tail -f停止（SSH切断済み）'
        }, to=sid)
        print(f"tail -f stopped (and SSH closed): {sid}")
        
    except Exception as e:
        print(f"tail -f stop error: {e}")
        await sio.emit('tail_f_status', {
            'status': 'error',
            'message': f'tail -f停止エラー: {str(e)}'
        }, to=sid)

async def stop_ssh_log_monitoring():
    """SSH接続とログ監視を停止"""
    global ssh_connection, ssh_log_task
    
    print("SSH接続とログ監視を停止中...")
    
    # ログタスクを停止
    if ssh_log_task:
        print("ログタスクをキャンセル中...")
        ssh_log_task.cancel()
        try:
            await ssh_log_task
        except asyncio.CancelledError:
            print("ログタスクが正常にキャンセルされました")
        except Exception as e:
            print(f"ログタスクキャンセル中にエラー: {e}")
        finally:
            ssh_log_task = None
            print("ログタスクを停止しました")
    
    # SSH接続を閉じる
    if ssh_connection:
        ssh_connection.close()
        ssh_connection = None
        print("SSH接続を閉じました")

# SSH接続管理機能は上記のAPIエンドポイントで実装済み

# Gateway インスタンス初期化
reg = RegistGateway()
rt = RealtimeLogGateway()
sys_gateway = SyslogGateway()

# Elasticsearch接続
es = Elasticsearch(Config.ELASTICSEARCH_URL)

# ========================================
# SSH Log Monitoring API Endpoints
# ========================================

class LogMonitoringRequest(BaseModel):
    cvm_ip: str
    log_path: str = "/home/nutanix/data/logs/genesis.out"

@app.post("/api/ssh-log/start")
async def start_log_monitoring(request: LogMonitoringRequest):
    """SSH接続でログ監視を開始"""
    try:
        print(f"ログ監視開始要求: {request.cvm_ip}, {request.log_path}")
        
        # 既存の接続があるかチェック
        if get_ssh_connection():
            print("既存のSSH接続が存在します")
            return {
                "status": "warning",
                "message": "既存のSSH接続が存在します。新しい接続を開始する前に既存の接続を停止してください。"
            }
        
        # SSH接続とログ監視を開始
        success = await start_ssh_log_monitoring(request.cvm_ip, request.log_path)
        
        if success:
            return {
                "status": "success",
                "message": f"SSH接続とログ監視を開始しました: {request.cvm_ip}"
            }
        else:
            return {
                "status": "error",
                "message": f"SSH接続に失敗しました: {request.cvm_ip}"
            }
            
    except Exception as e:
        print(f"ログ監視開始エラー: {e}")
        return {
            "status": "error",
            "message": f"ログ監視開始エラー: {str(e)}"
        }

@app.post("/api/ssh-log/stop")
async def stop_log_monitoring():
    """SSH接続とログ監視を停止"""
    try:
        global ssh_connection, ssh_log_task
        
        print("ログ監視停止要求")
        
        # ログタスクを停止
        if ssh_log_task:
            ssh_log_task.cancel()
            ssh_log_task = None
            print("ログタスクを停止しました")
        
        # SSH接続を閉じる
        if ssh_connection:
            ssh_connection.close()
            ssh_connection = None
            print("SSH接続を閉じました")
        
        return {
            "status": "success",
            "message": "SSH接続とログ監視を停止しました"
        }
        
    except Exception as e:
        print(f"ログ監視停止エラー: {e}")
        return {
            "status": "error",
            "message": f"ログ監視停止エラー: {str(e)}"
        }

@app.get("/api/ssh-log/status")
async def get_log_monitoring_status():
    """SSH接続とログ監視の状態を取得"""
    try:
        ssh_conn = get_ssh_connection()
        log_task = get_ssh_log_task()
        
        return {
            "status": "success",
            "ssh_connected": ssh_conn is not None,
            "log_monitoring_active": log_task is not None and not log_task.done(),
            "ssh_connection": str(ssh_conn) if ssh_conn else None
        }
        
    except Exception as e:
        print(f"ステータス取得エラー: {e}")
        return {
            "status": "error",
            "message": f"ステータス取得エラー: {str(e)}"
        }

# SocketIO関連の関数は削除済み（SSH接続とログ取得機能は上記のAPIエンドポイントで実装）

# WebSocket接続管理
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f">>>>>>>> WebSocket connected: {client_id} <<<<<<<<<")

    def disconnect(self, websocket: WebSocket, client_id: str):
        self.active_connections.remove(websocket)
        print(f">>>>>>>> WebSocket disconnected: {client_id} <<<<<<<<<")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

manager = ConnectionManager()

# ========================================
# Web UI Routes
# ========================================

@app.get("/", response_class=HTMLResponse)
async def index():
    """メインページ"""
    try:
        with open("templates/index.html", "r") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(content="<h1>LogHoi API Server</h1><p>API Documentation: <a href='/docs'>/docs</a></p>")

# ========================================
# PC/Cluster Management API
# ========================================

@app.post("/api/regist")
async def regist_pc(request: PCRegistRequest) -> Dict[str, Any]:
    """PC登録API"""
    print(f">>>> receive /api/regist: {request.prism_ip} <<<<<")
    try:
        result = reg.regist_pc(request.dict())
        print(">>>>> res: ", result)
        
        # 文字列レスポンスを辞書形式に変換
        if isinstance(result, str):
            return {
                "status": "success" if "Success" in result else "error",
                "message": result,
                "prism_ip": request.prism_ip
            }
        else:
            return result
    except Exception as e:
        print(f"❌ PC登録エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pclist")
async def get_pclist() -> Dict[str, Any]:
    """PC一覧取得API"""
    print("GET /api/pclist request")
    try:
        cluster_list = reg.get_pcs()
        return cluster_list
    except Exception as e:
        print(f"❌ PC一覧取得エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pclist")
async def get_pclist() -> Dict[str, Any]:
    """PC一覧取得API（フロントエンド用）"""
    print("GET /api/pclist request")
    try:
        # デフォルトのPC IPを使用してクラスター一覧を取得
        default_pcip = "10.38.112.7"
        cluster_data = reg.get_pccluster({"pcip": default_pcip})
        
        # フロントエンドが期待する形式に変換
        if isinstance(cluster_data, list):
            return {
                "pc_list": {
                    "pc_ip": default_pcip,
                    "clusters": cluster_data,
                    "count": len(cluster_data)
                },
                "cluster_list": cluster_data
            }
        else:
            return {
                "pc_list": {
                    "pc_ip": default_pcip,
                    "clusters": cluster_data.get("clusters", []),
                    "count": cluster_data.get("count", 0)
                },
                "cluster_list": cluster_data.get("clusters", [])
            }
    except Exception as e:
        print(f"Error in get_pclist: {e}")
        # エラーの場合は空のリストを返す
        return {
            "pc_list": {
                "pc_ip": "10.38.112.7",
                "clusters": [],
                "count": 0
            },
            "cluster_list": []
        }

@app.post("/api/pccluster")
async def get_pccluster(request: PCClusterRequest) -> Dict[str, Any]:
    """PC関連クラスター取得API"""
    print(f"POST /api/pccluster request: {request}")
    try:
        cluster_list = {}
        if request.pcip:
            cluster_data = reg.get_pccluster(request.dict())
            # 配列レスポンスを辞書形式に変換
            if isinstance(cluster_data, list):
                cluster_list = {
                    "clusters": cluster_data,
                    "count": len(cluster_data)
                }
            else:
                cluster_list = cluster_data
        sshkey = reg.get_sshkey()
        return cluster_list
    except Exception as e:
        print(f"❌ PCクラスター取得エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cvmlist")
async def get_cvmlist_api(cluster_name: Dict[str, str]) -> Dict[str, Any]:
    """CVM一覧取得API"""
    try:
        # 辞書からcluster_nameを抽出
        cluster_name_str = cluster_name.get("cluster_name", "")
        if not cluster_name_str:
            raise HTTPException(status_code=400, detail="cluster_name is required")
        
        cvm_list = get_cvmlist(cluster_name_str)
        # リストではなく辞書として返す（元のFlask版に合わせる）
        return {"cvm_list": cvm_list} if isinstance(cvm_list, list) else cvm_list
    except Exception as e:
        print(f"❌ CVM一覧取得エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# Syslog Search API
# ========================================

@app.post("/api/sys/search")
async def search_syslog(request: SyslogSearchRequest) -> Dict[str, Any]:
    """Syslog検索API"""
    print(f"POST /api/sys/search: {request}")
    try:
        # リクエストデータを辞書に変換
        request_data = request.dict()
        
        # クラスター名を取得（URLパラメータから）
        # フロントエンドから送信されるデータ構造に合わせる
        search_data = {
            "keyword": request_data.get("keyword", ""),
            "start_datetime": request_data.get("start_datetime", ""),
            "end_datetime": request_data.get("end_datetime", ""),
            "serial": request_data.get("serial", ""),
            "cluster": request_data.get("cluster", "")  # クラスター名を追加
        }
        
        data = sys_gateway.search_syslog(search_data)
        
        # 結果を適切な形式で返す
        return {
            "status": "success",
            "data": data,
            "count": len(data)
        }
    except Exception as e:
        print(f"❌ Syslog検索エラー: {e}")
        return {
            "status": "error",
            "message": str(e),
            "data": []
        }


# ========================================
# WebSocket Endpoint
# ========================================

@app.websocket("/ws/log/{client_id}")
async def websocket_log_endpoint(websocket: WebSocket, client_id: str):
    """WebSocketログ監視エンドポイント"""
    await manager.connect(websocket, client_id)
    try:
        while True:
            # メッセージ受信
            data = await websocket.receive_json()
            message = WebSocketLogMessage(**data)
            
            print(f"###### WebSocket log request: {message}")
            
            # SSH接続確立
            ssh = connect_ssh(message.cvm)
            
            # リアルタイムログ開始
            await start_realtime_log(websocket, ssh, message)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)
        print(f">>>>>>>> WebSocket disconnected: {client_id} <<<<<<<<<")
    except Exception as e:
        print(f"❌ WebSocketエラー: {e}")
        manager.disconnect(websocket, client_id)

async def start_realtime_log(websocket: WebSocket, ssh, message: WebSocketLogMessage):
    """リアルタイムログ配信（非同期版）"""
    try:
        # SSH経由でtailコマンド実行
        stdin, stdout, stderr = ssh.exec_command(f"tail -f -n 20 {message.tail_path}")
        
        # 非同期でログ行を送信
        for line in stdout:
            log_data = {
                "name": message.tail_name,
                "line": line.strip(),
                "timestamp": str(asyncio.get_event_loop().time())
            }
            await websocket.send_json(log_data)
            
    except Exception as e:
        print(f"❌ リアルタイムログエラー: {e}")
        await websocket.send_json({"error": str(e)})

# ========================================
# Health Check & Info
# ========================================

@app.get("/health")
async def health_check():
    """ヘルスチェックAPI（Liveness Probe用）"""
    return {
        "status": "healthy",
        "service": "LogHoi FastAPI",
        "version": "2.0.0"
    }

@app.get("/ready")
async def readiness_check():
    """レディネスチェックAPI（Readiness Probe用）"""
    try:
        # Elasticsearchの接続確認
        es_status = "unknown"
        try:
            es = ElasticGateway()
            # 簡単なヘルスチェック（タイムアウトあり）
            es_status = "healthy"
        except Exception as e:
            es_status = f"unhealthy: {str(e)}"
            return {
                "status": "not_ready",
                "service": "LogHoi FastAPI",
                "version": "2.0.0",
                "elasticsearch": es_status
            }, 503
        
        return {
            "status": "ready",
            "service": "LogHoi FastAPI",
            "version": "2.0.0",
            "elasticsearch": es_status,
            "active_connections": len(connection_manager.socket_connections),
            "active_ssh_connections": len(connection_manager.ssh_connections)
        }
    except Exception as e:
        return {
            "status": "not_ready",
            "service": "LogHoi FastAPI",
            "error": str(e)
        }, 503

@app.get("/api/connections")
async def get_connections():
    """接続状態確認API"""
    return connection_manager.get_all_connections()

@app.get("/api/connections/{sid}")
async def get_connection_status(sid: str):
    """特定の接続状態確認API"""
    return connection_manager.get_connection_status(sid)

@app.get("/info")
async def app_info():
    """アプリケーション情報API"""
    return {
        "name": "LogHoi",
        "description": "Nutanix Log Collection and Real-time Monitoring",
        "version": "2.0.0",
        "framework": "FastAPI",
        "features": [
            "PC/Cluster Management",
            "Real-time Log Monitoring", 
            "Syslog Search",
            "Log Collection & Download",
            "WebSocket Communication"
        ]
    }

# ========================================
# Application Startup
# ========================================

# アプリケーション起動時の処理
async def startup_event():
    """アプリケーション起動時の処理"""
    system_logger.info(
        "Starting LogHoi FastAPI Backend",
        event_type=EventType.SYSTEM_START,
        elasticsearch_url=Config.ELASTICSEARCH_URL,
        server_host=Config.BACKEND_HOST,
        server_port=Config.BACKEND_PORT,
        api_docs=f"http://{Config.BACKEND_HOST}:{Config.BACKEND_PORT}/docs"
    )
    
    # キャッシュ定期クリーンアップタスク開始
    global _cache_cleanup_task
    async def _cache_cleanup_loop():
        while True:
            try:
                await asyncio.sleep(300)  # 5分ごと
                removed = collect_cache.cleanup_expired()
                if removed:
                    system_logger.debug(
                        "Cache cleanup completed",
                        event_type="cache.cleanup",
                        removed_count=removed
                    )
            except asyncio.CancelledError:
                system_logger.info("Cache cleanup task cancelled", event_type="cache.cleanup.stop")
                break
            except Exception as e:
                system_logger.error(
                    "Cache cleanup error",
                    event_type="cache.cleanup.error",
                    error=str(e)
                )
    _cache_cleanup_task = asyncio.create_task(_cache_cleanup_loop())

async def shutdown_event():
    """アプリケーション停止時の処理"""
    system_logger.info(
        "Shutting down LogHoi FastAPI Backend",
        event_type=EventType.SYSTEM_STOP
    )
    
    global _cache_cleanup_task
    try:
        if '_cache_cleanup_task' in globals() and _cache_cleanup_task:
            _cache_cleanup_task.cancel()
    except Exception as e:
        system_logger.error(
            "Error during shutdown",
            event_type=EventType.SYSTEM_ERROR,
            error=str(e)
        )

# ハンドラ登録
app.add_event_handler("startup", startup_event)
app.add_event_handler("shutdown", shutdown_event)

# アプリケーション起動時のメッセージ（既にstartup_eventでログ出力済み）
# 構造化ログに移行済みのため、print文は削除

if __name__ == "__main__":
    uvicorn.run(
        "app_fastapi:socket_app",
        host=Config.BACKEND_HOST,
        port=Config.BACKEND_PORT,
        reload=Config.DEBUG,
        log_level="info"
    )
