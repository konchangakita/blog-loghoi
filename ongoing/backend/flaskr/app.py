from flask import Flask
from flask import render_template
from flask import request
from flask import make_response, jsonify, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit

from elasticsearch import Elasticsearch

import regist
import common
import broker_rt, broker_sys, broker_col

reg = regist.RegistGateway()
rt = broker_rt.RealtimeLogGateway()
sys = broker_sys.SyslogGateway()
col = broker_col.CollectLogGateway()

ELASTIC_SERVER = "http://elasticsearch:9200"
es = Elasticsearch(ELASTIC_SERVER)

app = Flask(__name__)
CORS(app, resources={r"*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

# Just for GUI
@app.route("/")
def index():
    return render_template("index.html")


# Regster PC
@app.route("/api/regist", methods=["POST"])
def regist():
    print(">>>> recive /api/regist <<<<<")
    data = {}
    data = reg.regist_pc(request.json)
    print(">>>>> res: ", data)
    return make_response(jsonify(data))


# GET PC List
@app.route("/api/pclist", methods=["GET"])
def pclist():
    print("GET request")
    cluster_list = {}
    cluster_list = reg.get_pcs()
    return make_response(jsonify(cluster_list))


# GET cluster list related to PC
@app.route("/api/pccluster", methods=["POST"])
def pccluster():
    req = request.json
    print("request", req)
    cluster_list = {}
    if req["pcip"]:
        cluster_list = reg.get_pccluster(req)
    sshkey = reg.get_sshkey()
    #res = {}
    #res['cluster_list'] = cluster_list
    #res['ssh_key'] = sshkey

    return make_response(jsonify(cluster_list))


# Get CVM List from Elastic
@app.route("/api/cvmlist", methods={"POST"})
def cvmlist():
    cluster_name = request.json

    cvm_list = common.get_cvmlist(cluster_name)
    #print(cvm_list)

    return make_response(jsonify(cvm_list))


# Syslog search search & date/time
@app.route("/api/sys/search", methods=["POST"])
def sys_search():
    print(request.json)  # keyword, start_datetime, end_datetime
    data = sys.search_syslog(request.json)
    return make_response(jsonify(data))


##############################
# Collect Log
##########################

# get log and zip
@app.route("/api/col/getlogs", methods=["POST"])
def col_getlogs():
    print(request.json)
    data = col.collect_logs(request.json['cvm'])

    return make_response(jsonify(data))

# get zip list
@app.route("/api/col/ziplist", methods=["GET"])
def col_pclist():
    data = col.get_ziplist()
    return jsonify(data)

# get zip内のログ一覧
@app.route("/api/col/logs_in_zip/<zip_name>", methods=["GET"])
def col_logs_in_zip(zip_name):
    #data = [ "file1", "file2", "file3"]
    data = col.get_logs_in_zip(zip_name)
    return jsonify(data)

# get zip内のログ一覧
@app.route("/api/col/logdisplay", methods=["POST"])
def col_logdisplay():
    log_file = request.json['log_file']
    zip_name = request.json['zip_name']
    data = col.get_logcontent(log_file, zip_name)
    return jsonify(data)

# zipファイルのダウンロード
@app.route("/api/col/download/<zip_name>", methods=["GET"])
def col_download(zip_name):
    zip_path = col.download_zip(zip_name)
    if not zip_path:
        return jsonify({"error": "File not found"}), 404
    return send_file(zip_path, as_attachment=True, download_name=zip_name)



##############################
# socketio
##########################
ssh_connection = {}

@socketio.on("connect")
def socket_connect():
    print(">>>>>>>> Websocket connected <<<<<<<<<")
    # socketio.emit("message", {"data": "Connected", "sid": request.sid})
    print("sid", request.sid)
    print("After connected")

@socketio.on("disconnect")
def socket_disconnect():
    print(">>>>>>>> Websocket disconnected <<<<<<<<<")
    sid = request.sid
    ssh = ssh_connection.get(sid)
    if ssh:
        ssh.close()
        print(">>>>>>>> parmiko close <<<<<<<<<")
        del ssh_connection[sid]

@socketio.on("message")
def recive_message(msg):
    print("recive message")
    emit("message", msg)

# msg {cvm, tail_name, tail_path}
@socketio.on("log")
def recive_log(msg):
    print("###### start tail -f", msg)
    cvm = msg["cvm"]
    print("socket receive >>>>>>>>>>>>>", msg)
    ssh = common.connect_ssh(cvm)
    ssh_connection[request.sid] = ssh
    rt.get_rtlog(socketio, ssh, msg)


if __name__ == "__main__":
    #app.run(host="0.0.0.0", port=7776, debug=True)
    socketio.run(app, host="0.0.0.0", port=7776, debug=True)

