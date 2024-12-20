import os
import json
from datetime import datetime
from datetime import timezone, timedelta
import subprocess

import common


JSON_LOGFILE = "col_logfile.json"
JSON_COMMAND = "col_command.json"
OUTPUT_DIR = "/usr/src/flaskr/output"

os.makedirs(OUTPUT_DIR, exist_ok=True)

class CollectLogGateway():
    def test(self):
        with open(JSON_LOGFILE, "r") as f:
            config_log = json.load(f)
        print(config_log)

        return 'data'
    
    def collect_logs(self, cvm):
        # make log/download directory
        _jst_time = datetime.now().astimezone(timezone(timedelta(hours=+9)))
        log_folder = datetime.strftime(_jst_time, OUTPUT_DIR+"/loghoi_%Y%m%d_%H%M%S")
        os.makedirs(log_folder, exist_ok=True)

        # load json file
        try:
            f = open(JSON_LOGFILE, "r")
            _setting_json = json.load(f)
            logfile_list = _setting_json["LOGFILE_LIST"]
            f.close()

            f = open(JSON_COMMAND, "r")
            _setting_json = json.load(f)
            command_list = _setting_json["COMMAND_LIST"]
            f.close()

            print(">>>>>>>> open json file Success <<<<<<<<<")
        except:
            print(">>>>>>>> missing json file dayo <<<<<<<<<")
            return {"message": "missing json file"}


        # Download LOGFILEs
        print(">>>>>>>> Download logfiles <<<<<<<<<")
        remote_host = cvm
        remote_user = "nutanix"
        key_file = "/usr/src/flaskr/.ssh/ntnx-lockdown"

        for item in logfile_list:
            remote_path = item["src_path"]
            local_path = log_folder
            command = ["scp", "-O", "-o", "StrictHostKeyChecking=no", "-i", key_file, f"{remote_user}@{remote_host}:{remote_path}", local_path]
            try:
                subprocess.run(command, check=True, stdout=subprocess.DEVNULL)
            except subprocess.CalledProcessError as e:
                print(f"Error: {e}")


        return {"message": "finish"}