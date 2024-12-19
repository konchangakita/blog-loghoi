import os
import json
import datetime


JSON_LOGFILE = "./col_logfile.json"
JSON_COMMAND = "./col_command.json"
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
        log_folder = datetime.datetime.now().strftime(OUTPUT_DIR+"/loghoi_%Y%m%d_%H%M%S")
        os.makedirs(log_folder, exist_ok=True)


        return cvm