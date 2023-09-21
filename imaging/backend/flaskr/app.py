from flask import Flask
from flask import render_template
from flask import request
from flask import make_response, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from elasticsearch import Elasticsearch

import regist
import broker_rt, broker_sys, broker_hoi
import common

reg = regist.RegistGateway()
rt = broker_rt.RealtimeLogGateway()
sys = broker_sys.SyslogGateway()
hoi = broker_hoi.HoiGateway()


ELASTIC_SERVER = "http://elasticsearch:9200"
es = Elasticsearch(ELASTIC_SERVER)

app = Flask(__name__)
cors = CORS(app, resources={r"*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")


# Just for GUI
@app.route("/")
def index():
    return render_template("index.html")


# Regster PC
@app.route("/api/regist", methods=["POST"])
def regist():
    data = {}
    data = reg.regist_pc(request.json)
    print(">>>>> res: ", data)
    return make_response(jsonify(data))


# GET PC List
@app.route("/api/pclist", methods=["GET"])
def pclist():
    # print("request", request.json)
    cluster_list = {}
    cluster_list = reg.get_pcs()
    return make_response(jsonify(cluster_list))


# GET cluster list related to PC
@app.route("/api/pccluster", methods=["POST"])
def pccluster():
    # print("request", request.json)
    cluster_list = {}
    cluster_list = reg.get_pccluster(request.json)
    return make_response(jsonify(cluster_list))


# log list from setting_log.json
@app.route("/api/rt/taillist", methods=["POST"])
def rt_taillist():
    req = request.json
    cluster_info = rt.get_cvmlist(req["cluster"])
    tail_file_list = rt.get_taillist()
    data = {"cluster_info": cluster_info, "tail_file_list": tail_file_list}
    return make_response(jsonify(data))


# Syslog search search & date/time
@app.route("/api/sys/search", methods=["POST"])
def sys_search():
    print(request.json)  # keyword, start_datetime, end_datetime
    data = sys.search_syslog(request.json)
    return make_response(jsonify(data))


# get filelist
@app.route("/api/hoi/hoihoilist", methods=["POST"])
def hoi_hoihoilist():
    req = request.json
    cluster_info = rt.get_cvmlist(req["cluster"])
    hoihoilist = hoi.get_hoihoilist()
    data = {"cluster_info": cluster_info, "hoihoilist": hoihoilist}
    return make_response(jsonify(data))


# hoihoi suru
@app.route("/api/hoi/hoihoi", methods=["POST"])
def hoi_hoihoi():
    data = hoi.hoihoi(request.json["cvm"])
    return make_response(jsonify(data))


# download zip file
@app.route("/api/hoi/download", methods=["POST"])
def hoi_download():
    req = request.json
    filename = req["filename"]
    directory = req["directory"]
    output_path = hoi.get_output_path()
    download_directory = output_path + "/" + directory
    # print('filename ;:', filename)
    return send_from_directory(
        directory=download_directory, path=filename, as_attachment=True
    )


# get log content
@app.route("/api/hoi/logdisplay", methods=["POST"])
def hoi_logdisplay():
    print(request.json)
    req = request.json
    log_directory = req["dir"]
    log_file = req["log_file"]

    data = hoi.get_logcontent(log_directory, log_file)
    return make_response(jsonify(data))


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
    # app.run(host="0.0.0.0", port=7776, debug=True)
    socketio.run(app, host="0.0.0.0", port=7776, debug=True)
    # コンテナで実行用
    # socketio.run(app, host="0.0.0.0", port=7776, debug=True, allow_unsafe_werkzeug=True)
