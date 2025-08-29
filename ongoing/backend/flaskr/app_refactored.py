import sys
import os

# 共通ライブラリのパスを追加
sys.path.append(os.path.join(os.path.dirname(__file__), '../../shared'))

from flask import Flask, render_template, request, make_response, jsonify, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from elasticsearch import Elasticsearch

# 共通ライブラリからインポート
from gateways import (
    RegistGateway, 
    RealtimeLogGateway, 
    SyslogGateway, 
    CollectLogGateway,
    ElasticGateway
)
from utils.common import connect_ssh, get_cvmlist
from config import Config

# Gateway インスタンス初期化
reg = RegistGateway()
rt = RealtimeLogGateway()
sys_gateway = SyslogGateway()
col = CollectLogGateway()

# Elasticsearch接続
es = Elasticsearch(Config.ELASTICSEARCH_URL)

# Flask アプリケーション初期化
app = Flask(__name__)
CORS(app, resources={r"*": {"origins": Config.CORS_ORIGINS}})
socketio = SocketIO(app, cors_allowed_origins="*")

# ========================================
# Web UI Routes
# ========================================

@app.route("/")
def index():
    """メインページ"""
    return render_template("index.html")

# ========================================
# PC/Cluster Management API
# ========================================

@app.route("/api/regist", methods=["POST"])
def regist():
    """PC登録API"""
    print(">>>> receive /api/regist <<<<<")
    data = reg.regist_pc(request.json)
    print(">>>>> res: ", data)
    return make_response(jsonify(data))

@app.route("/api/pclist", methods=["GET"])
def pclist():
    """PC一覧取得API"""
    print("GET request")
    cluster_list = reg.get_pcs()
    return make_response(jsonify(cluster_list))

@app.route("/api/pccluster", methods=["POST"])
def pccluster():
    """PC関連クラスター取得API"""
    req = request.json
    print("request", req)
    cluster_list = {}
    if req["pcip"]:
        cluster_list = reg.get_pccluster(req)
    sshkey = reg.get_sshkey()
    return make_response(jsonify(cluster_list))

@app.route("/api/cvmlist", methods=["POST"])
def cvmlist():
    """CVM一覧取得API"""
    cluster_name = request.json
    cvm_list = get_cvmlist(cluster_name)
    return make_response(jsonify(cvm_list))

# ========================================
# Syslog Search API
# ========================================

@app.route("/api/sys/search", methods=["POST"])
def sys_search():
    """Syslog検索API"""
    print(request.json)
    data = sys_gateway.search_syslog(request.json)
    return make_response(jsonify(data))

# ========================================
# Log Collection API
# ========================================

@app.route("/api/col/getlogs", methods=["POST"])
def col_getlogs():
    """ログ収集API"""
    print(request.json)
    data = col.collect_logs(request.json['cvm'])
    return make_response(jsonify(data))

@app.route("/api/col/ziplist", methods=["GET"])
def col_ziplist():
    """ZIP一覧取得API"""
    data = col.get_ziplist()
    return jsonify(data)

@app.route("/api/col/logs_in_zip/<zip_name>", methods=["GET"])
def col_logs_in_zip(zip_name):
    """ZIP内ログ一覧取得API"""
    data = col.get_logs_in_zip(zip_name)
    return jsonify(data)

@app.route("/api/col/logdisplay", methods=["POST"])
def col_logdisplay():
    """ログ表示API"""
    log_file = request.json['log_file']
    zip_name = request.json['zip_name']
    data = col.get_logcontent(log_file, zip_name)
    return jsonify(data)

@app.route("/api/col/download/<zip_name>", methods=["GET"])
def col_download(zip_name):
    """ZIPダウンロードAPI"""
    zip_path = col.download_zip(zip_name)
    if not zip_path:
        return jsonify({"error": "File not found"}), 404
    return send_file(zip_path, as_attachment=True, download_name=zip_name)

# ========================================
# WebSocket Events
# ========================================

# SSH接続管理
ssh_connection = {}

@socketio.on("connect")
def socket_connect():
    """WebSocket接続イベント"""
    print(">>>>>>>> Websocket connected <<<<<<<<<")
    print("sid", request.sid)
    print("After connected")

@socketio.on("disconnect")
def socket_disconnect():
    """WebSocket切断イベント"""
    print(">>>>>>>> Websocket disconnected <<<<<<<<<")
    sid = request.sid
    ssh = ssh_connection.get(sid)
    if ssh:
        ssh.close()
        print(">>>>>>>> paramiko close <<<<<<<<<")
        del ssh_connection[sid]

@socketio.on("message")
def receive_message(msg):
    """メッセージ受信イベント"""
    print("receive message")
    emit("message", msg)

@socketio.on("log")
def receive_log(msg):
    """ログ受信イベント - リアルタイムログ監視"""
    print("###### start tail -f", msg)
    cvm = msg["cvm"]
    print("socket receive >>>>>>>>>>>>>", msg)
    ssh = connect_ssh(cvm)
    ssh_connection[request.sid] = ssh
    rt.get_rtlog(socketio, ssh, msg)

# ========================================
# Application Startup
# ========================================

if __name__ == "__main__":
    print(f"🚀 Starting LogHoi Backend on {Config.FLASK_HOST}:{Config.FLASK_PORT}")
    print(f"📊 Elasticsearch: {Config.ELASTICSEARCH_URL}")
    print(f"🐛 Debug mode: {Config.FLASK_DEBUG}")
    
    socketio.run(
        app, 
        host=Config.FLASK_HOST, 
        port=Config.FLASK_PORT, 
        debug=Config.FLASK_DEBUG
    )
