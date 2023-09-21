import json, re

import ela
import common

es = ela.ElasticGateway()


class RealtimeLogAPI:
    def get_prism_leader(self, ssh):
        stdin, stdout, stderr = ssh.exec_command(
            f"curl localhost:2019/prism/leader && echo"
        )
        for line in stdout:
            output = line.strip()
            print("[prism leader] >>>>>>>>>", output)
        ssh.close()
        print(">>>>>>>> parmiko close  <<<<<<<<<")

        return output


class RealtimeLogGateway(RealtimeLogAPI):
    def get_session_rt(self, host_ip):
        print("host_ip", host_ip)
        hostname = "172.16.10.119"
        print("hostname", hostname)
        ssh = common.connect_ssh(hostname)
        return ssh

    def get_cvmlist(self, cluster_name):
        data = es.get_cvmlist_document(cluster_name)

        # Get Prism leader
        cvm = data[0]["cvms_ip"][0]
        ssh = common.connect_ssh(cvm)
        res = self.get_prism_leader(ssh)
        res_json = json.loads(res)
        _prism_leader = re.split(":", res_json["leader"])
        prism_leader = _prism_leader[0]

        cluster_data = data[0]
        cluster_data["prism_leader"] = prism_leader

        return cluster_data

    # from recive_log@app.py
    def get_rtlog(self, socketio, ssh, msg):
        tail_name = msg["tail_name"]
        tail_path = msg["tail_path"]
        print("tail suru file >>>>>>>>>>>>> ", tail_path)
        stdin, stdout, stderr = ssh.exec_command(f"tail -f -n 20 {tail_path}")
        for line in stdout:
            data = {"name": tail_name, "line": line.strip()}
            print(data)
            socketio.emit("log", data)

    def get_taillist(self):
        try:
            f = open("setting_realtimelog.json", "r")
            log_json = json.load(f)
            log_list = log_json["LOG_LIST"]
            f.close()
            print(">>>>>>>> Open log setting_realtimelog.json <<<<<<<<<")
        except:
            print(">>>>>>>> log setting_realtimelog.json missing <<<<<<<<<")
        return log_list
