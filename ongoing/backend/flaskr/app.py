from flask import Flask
from flask import render_template
from flask import request
from flask import make_response, jsonify
from flask_cors import CORS
from elasticsearch import Elasticsearch

import regist

reg = regist.RegistGateway()

ELASTIC_SERVER = "http://elasticsearch:9200"
es = Elasticsearch(ELASTIC_SERVER)

app = Flask(__name__)
cors = CORS(app, resources={r"*": {"origins": "*"}})

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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7776, debug=True)
