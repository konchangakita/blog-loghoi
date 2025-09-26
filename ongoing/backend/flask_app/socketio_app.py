from flask import Flask, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import common
import broker_rt
import time

# Flaskアプリケーションの初期化
app = Flask(__name__)
CORS(app, resources={r"*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

# Gateway インスタンス初期化
rt = broker_rt.RealtimeLogGateway()

# SSH接続管理用の辞書
ssh_connections = {}

# ========================================
# HTTP Endpoints
# ========================================

@app.route("/")
def index():
    """テストページ"""
    return """
    <html>
    <head><title>Socket.IO Test Server</title></head>
    <body>
        <h1>🔌 Socket.IO Test Server</h1>
        <p>Socket.IOサーバーが動作しています</p>
        <p><a href="/socketio_test.html">テストクライアントを開く</a></p>
        <p>WebSocket endpoint: <code>/socket.io/</code></p>
    </body>
    </html>
    """

@app.route("/health")
def health():
    """ヘルスチェック"""
    return {
        "status": "healthy",
        "service": "LogHoi Socket.IO Server",
        "version": "1.0.0",
        "socketio": "enabled"
    }

# ========================================
# Socket.IO Event Handlers
# ========================================

@socketio.on("connect")
def socket_connect():
    """クライアント接続時の処理"""
    print(">>>>>>>> Websocket connected <<<<<<<<<")
    print(f"sid: {request.sid}")
    print("After connected")

@socketio.on("disconnect")
def socket_disconnect():
    """クライアント切断時の処理"""
    print(">>>>>>>> Websocket disconnected <<<<<<<<<")
    sid = request.sid
    ssh = ssh_connections.get(sid)
    if ssh:
        ssh.close()
        print(">>>>>>>> paramiko close <<<<<<<<<")
        del ssh_connections[sid]

@socketio.on("message")
def receive_message(msg):
    """メッセージ受信処理"""
    print("receive message")
    emit("message", msg)

@socketio.on("log")
def receive_log(msg):
    """ログストリーミング開始"""
    print("###### start tail -f", msg)
    cvm = msg.get("cvm")
    if not cvm:
        emit("log_error", {"error": "CVM not specified"})
        return
    
    print("socket receive >>>>>>>>>>>>>", msg)
    ssh = common.connect_ssh(cvm)
    if ssh:
        ssh_connections[request.sid] = ssh
        # 実際のログストリーミング処理を開始
        start_realtime_log_stream(ssh, msg)
    else:
        emit("log_error", {"error": "Failed to connect to CVM"})

def start_realtime_log_stream(ssh, msg):
    """リアルタイムログストリーミング処理"""
    try:
        # 既存のbroker_rtを使用してログストリーミング
        rt.get_rtlog(socketio, ssh, msg)
    except Exception as e:
        print(f"❌ Log streaming error: {e}")
        socketio.emit('log_error', {'error': str(e)}, room=request.sid)

# ========================================
# テスト用のダミーログストリーミング
# ========================================

@socketio.on("test_log")
def test_log_stream():
    """テスト用のダミーログストリーミング"""
    print("###### start test log stream")
    
    def send_test_logs():
        try:
            # サンプルログデータを送信
            sample_logs = [
                "2024-01-01 10:00:01 [INFO] System startup completed",
                "2024-01-01 10:00:02 [INFO] Elasticsearch connection established",
                "2024-01-01 10:00:03 [DEBUG] Processing log entry 1",
                "2024-01-01 10:00:04 [DEBUG] Processing log entry 2",
                "2024-01-01 10:00:05 [INFO] Log processing completed",
                "2024-01-01 10:00:06 [WARN] Memory usage is high",
                "2024-01-01 10:00:07 [ERROR] Connection timeout occurred",
                "2024-01-01 10:00:08 [INFO] Recovery process started",
            ]
            
            for i, log_entry in enumerate(sample_logs):
                # Socket.IOでログを送信
                socketio.emit('log_data', {
                    'log': log_entry, 
                    'timestamp': time.time(),
                    'index': i
                }, room=request.sid)
                time.sleep(1)  # 1秒間隔で送信
                
        except Exception as e:
            print(f"❌ Test log streaming error: {e}")
            socketio.emit('log_error', {'error': str(e)}, room=request.sid)
    
    # バックグラウンドでログストリーミングを開始
    import threading
    thread = threading.Thread(target=send_test_logs)
    thread.daemon = True
    thread.start()

# ========================================
# Application Startup
# ========================================

if __name__ == "__main__":
    print("🚀 Starting LogHoi Socket.IO Server")
    print("📊 Socket.IO Server: 0.0.0.0:7776")
    print("🔌 WebSocket endpoint: /socket.io/")
    
    socketio.run(app, host="0.0.0.0", port=7776, debug=True, allow_unsafe_werkzeug=True)
