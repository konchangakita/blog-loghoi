from base64 import b64encode
import requests
import re
import sys
import os
# Dockerコンテナ内でのパスを追加
sys.path.append('/usr/src/core')
sys.path.append(os.path.join(os.path.dirname(__file__), '../utils'))
sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend/core'))
import common
sys.path.append(os.path.join(os.path.dirname(__file__), '.'))
from elastic_gateway import ElasticGateway as ela
import json


es = ela()


class RegistGateway:
    def connection_headers(self, request_form):
        prism_user = request_form["prism_user"]
        prism_pass = request_form["prism_pass"]

        encoded_credentials = b64encode(
            bytes(f"{prism_user}:{prism_pass}", encoding="ascii")
        ).decode("ascii")
        auth_header = f"Basic {encoded_credentials}"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"{auth_header}",
            "cache-control": "no-cache",
        }
        return headers

    # Registration of PC & Cluster & CVM info
    def regist_pc(self, request_form):
        headers = self.connection_headers(request_form)
        # print('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++',request_form)
        pcvm_info = request_form
        # print('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++',pcvm_info)

        # Get PC info
        request_url = (
            "https://" + pcvm_info["prism_ip"] + ":9440/api/nutanix/v3/clusters/list"
        )
        payload = "{}"

        print("Request URL >>>>> ", request_url)
        try:
            # fmt: off
            response = requests.request("post", request_url, data=payload, headers=headers, verify=False, timeout=3.5)
            # fmt: on
        except requests.exceptions.ConnectTimeout:
            response = "Timeout shimasita"
        print(response)

        if hasattr(response, "status_code"):
            if response.status_code == 200:
                print("####### Connecting Cluster Successful! #######")
                # GET CVM info
                request_url = (
                    "https://"
                    + pcvm_info["prism_ip"]
                    + ":9440/api/nutanix/v3/hosts/list"
                )
                # fmt: off
                response_cvm = requests.request("post", request_url, data=payload, headers=headers, verify=False, timeout=3.5)
                # fmt: on
                res = response.json()
                res_cvm = response_cvm.json()

                input_list = []
                for val in res["entities"]:
                    service_list = val["status"]["resources"]["config"]["service_list"]
                    if service_list[0] == "AOS":
                        cluster_data = {}
                        cluster_data["name"] = val["status"]["name"]
                        # fmt: off
                        cluster_data["hypervisor"] = val["status"]["resources"]["nodes"]["hypervisor_server_list"][0]["type"]
                        cluster_data["prism_ip"] = val["status"]["resources"]["network"]["external_ip"]
                        cluster_data["pc_ip"] = pcvm_info["prism_ip"]
                        cluster_data["uuid"] = val["metadata"]['uuid']
                        # fmt: on

                        _cvm_list = []
                        _host_names = []  # ハイパーバイザーのhostname
                        _host_info = []  # ホスト情報（hostname, host_ip, cvm_ip）
                        for entity in res_cvm["entities"]:
                            # Nameのフィールドがマッチした場合のみIPを拾っていれる処理。PCについてはNameのフィールドが空になる
                            if "name" in entity["status"]:
                                # print(cluster_data["name"])
                                if re.match(
                                    cluster_data["uuid"],
                                    entity["status"]["cluster_reference"]["uuid"],
                                ):
                                    # 対象のブロックシリアルのみ入れる
                                    cluster_data["block_serial_number"] = entity[
                                        "status"
                                    ]["resources"]["block"]["block_serial_number"]
                                    # クラスタ内のCVMIPのリストを入れる
                                    cvm_ip = entity["status"]["resources"]["controller_vm"]["ip"]
                                    _cvm_list.append(cvm_ip)
                                    
                                    # ハイパーバイザーのhostnameを保存（例: NTNX-61c637c0-A）
                                    hostname = entity["status"]["name"]
                                    _host_names.append(hostname)
                                    
                                    # ホスト情報（hostname, host_ip, cvm_ip）を保存
                                    host_ip = entity["status"]["resources"]["hypervisor"]["ip"]
                                    _host_info.append({
                                        "hostname": hostname,
                                        "host_ip": host_ip,
                                        "cvm_ip": cvm_ip
                                    })

                            # prism centralのIPにマッチした場合にシリアルナンバーを取り出す
                            elif (
                                entity["status"]["resources"]["controller_vm"]["ip"]
                                == pcvm_info["prism_ip"]
                            ):
                                pcvm_info["serial_number"] = entity["status"][
                                    "resources"
                                ]["serial_number"]
                        cluster_data["cvms_ip"] = sorted(_cvm_list)
                        cluster_data["host_names"] = sorted(_host_names)  # ハイパーバイザーのhostname
                        cluster_data["host_info"] = sorted(_host_info, key=lambda x: x["hostname"])  # ホスト詳細情報
                        input_list.append(cluster_data)

                # PCかどうかの判定
                if "serial_number" in pcvm_info:
                    # Put PC into Elasticsearch
                    print(">>>>> input data to Elasticsearch: ", pcvm_info)
                    timestamp = es.put_pc(pcvm_info)

                    # Put Cluster into Elasticsearch
                    print(">>>>> input data to Elasticsearch: ", input_list)
                    input_size = es.put_cluster(input_list, timestamp)

                    # ここの結果（テキストの内容）がGUI側で直接出る
                    result = "Connection Success"
                else:
                    result = "Prism Central IP desuka?"
            else:
                print(">>>>> Connection faild: status code ", response.status_code)
                result = "Login faild"
        else:
            result = "Connection faild (VPN?)"

        return result

    # get PC list from Elasticsearch
    def get_pcs(self):
        data = {}
        data_pcs_clusters = {}
        data_pcs = es.get_allpcs_document()
        for i, val in enumerate(data_pcs):
            timestamp_jst = common.change_jst(val["timestamp"])
            data_pcs[i]["timestamp_jst"] = timestamp_jst
            data_pcs_clusters[val["prism_ip"]] = es.get_pccluster_document(
                val["prism_ip"], val["timestamp"]
            )

        data["pc_list"] = data_pcs
        data["cluster_list"] = data_pcs_clusters

        print("get pclist >>>>> ", data)
        return data

    def get_pccluster(self, request_json):
        data_pc = es.get_pclatest_document(request_json["pcip"])
        data_clusters = es.get_pccluster_document(
            data_pc[0]["prism_ip"], data_pc[0]["timestamp"]
        )

        print("get pccluster >>>>> ", data_clusters)
        return data_clusters

    def get_clusters(self):
        data = es.get_allclusters_document()
        print(data)
        return data

    def get_sshkey(self):
        file_path = "./.ssh/ntnx-lockdown.pub"
        try:
            with open(file_path, "r") as file:
                content = file.read()
            return content
        except Exception as e:
            return json.dumps({"error": str(e)})