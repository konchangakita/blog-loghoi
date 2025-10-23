import json, re

import ela
import common

es = ela.ElasticGateway()

class RealtimeLogGateway():
    # from recieve_log@app.py
    def get_rtlog(self, socketio, ssh, msg):
        tail_name = msg["tail_name"]
        tail_path = msg["tail_path"]
        print("tail suru file >>>>>>>>>>>>> ", tail_path)
        stdin, stdout, stderr = ssh.exec_command(f"tail -f -n 20 {tail_path}")
        for line in stdout:
            data = {"name": tail_name, "line": line.strip()}
            print(data)
            socketio.emit("log", data)
