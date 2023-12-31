from flask import Flask
from flask import render_template
from flask import request
from flask import make_response, jsonify

from elasticsearch import Elasticsearch

ELASTIC_SERVER = "http://elasticsearch:9200"
es = Elasticsearch(ELASTIC_SERVER)

app = Flask(__name__)

# Just for GUI
@app.route("/")
def index():
    return render_template("index.html")

# Rest API Test
@app.route("/get/test", methods=["GET"])
def get_test():
    data = es.cat.indices(index="*", h="index").splitlines()

    print(">>>>> response: ", data)
    return make_response(jsonify(data))

# Rest API Test
@app.route("/post/test", methods=["POST"])
def post_test():
    data = request.json
    index_name = data['index']
    indices = es.cat.indices(index="*", h="index").splitlines()
    if index_name not in indices:
        es.indices.create(index=index_name)
        res = index_name + " created"
        return make_response(res)

    print(">>>>> POST sareta: ", data)
    res = index_name + " is already exists"  
    return make_response(res)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7776, debug=True)
