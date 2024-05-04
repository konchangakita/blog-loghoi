from flask import Flask
from flask import render_template
from flask import request
from flask import make_response, jsonify
from flask_cors import CORS

from elasticsearch import Elasticsearch

import regist
import common

reg = regist.RegistGateway()


ELASTIC_SERVER = "http://elasticsearch:9200"
es = Elasticsearch(ELASTIC_SERVER)

app = Flask(__name__)
CORS(app, resources={r"*": {"origins": "*"}})


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
    print(cvm_list)

    return make_response(jsonify(cvm_list))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7776, debug=True)
