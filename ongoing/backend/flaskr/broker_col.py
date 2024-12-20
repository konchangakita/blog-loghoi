import os
import json
from datetime import datetime
from datetime import timezone, timedelta
import subprocess
import time
import zipfile
import glob

import common


JSON_LOGFILE = "col_logfile.json"
JSON_COMMAND = "col_command.json"
OUTPUT_LOGDIR = "/usr/src/flaskr/output/log"
OUTPUT_ZIPDIR = "/usr/src/flaskr/output/zip"

os.makedirs(OUTPUT_LOGDIR, exist_ok=True)
os.makedirs(OUTPUT_ZIPDIR, exist_ok=True)

class CollectLogGateway():
    def collect_logs(self, cvm):
        # make log/download directory
        _jst_time = datetime.now().astimezone(timezone(timedelta(hours=+9)))
        folder_name = datetime.strftime(_jst_time, "loghoi_%Y%m%d_%H%M%S")
        log_folder = os.path.join(OUTPUT_LOGDIR, folder_name)
        #log_folder = datetime.strftime(_jst_time, OUTPUT_DIR+"/loghoi_%Y%m%d_%H%M%S")
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
            print("download: ", remote_path)
            try:
                subprocess.run(command, check=True, stdout=subprocess.DEVNULL)
            except subprocess.CalledProcessError as e:
                print(f"Error: {e}")


        # Get Command result
        print(">>>>>>>> Command Execute <<<<<<<<<")
        ssh = common.connect_ssh(cvm)
        for command_item in command_list:
            print("command: ", command_item)

            try:
                stdin, stdout, stderr = ssh.exec_command(command_item["command"])
                while not stdout.channel.exit_status_ready():
                    time.sleep(1)
                output = stdout.read()

                # create log file name
                now = datetime.now().strftime("%Y%m%d_%H%M%S")
                log_filename = f"{log_folder}/{command_item['name']}_{now}.txt"

                # save logfile
                with open(log_filename, "w") as f:
                    f.write(output.decode("utf-8").rstrip())
            except Exception as e:
                print("command error skipped: ", command_item)
                continue
        ssh.close()

        # Archive Zip
        print(">>>>>>>> Archive zip Log <<<<<<<<<")
        zip_filename = f"{folder_name}.zip"
        zip_path = os.path.join(OUTPUT_ZIPDIR, zip_filename)
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            # ディレクトリ内のファイルを列挙
            for filename in os.listdir(log_folder):
                filepath = os.path.join(log_folder, filename)
                # ファイルのみを対象とする（ディレクトリはスキップとする）
                if os.path.isfile(filepath):
                    # ZIPに追加。arcnameでZIP内のファイル名を指定
                    zf.write(filepath, arcname=filename)


        # Finish Hoi Hoi
        print(">>>>>>>> 　　＿＿＿＿＿＿＿ ")
        print(">>>>>>>> 　／ HoiHoi Done ／＼)ﾉ")
        print(">>>>>>>> ∠＿∠二Ｚ＿＿＿／|￣|＼")
        print(">>>>>>>> |E囗ﾖ   E囗ﾖ |  |  | |")
        print(">>>>>>>> ￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣")
        print("")
        return {"message": "finished collect log"}
    
    # Zip list 取得
    def get_ziplist(self):
        zip_files = glob.glob(os.path.join(OUTPUT_ZIPDIR, "*.zip"))
        zip_list = [os.path.basename(z) for z in zip_files]
        #zip_list.reverse()
        return zip_list
    
    # Zip 内のログ一覧
    def get_logs_in_zip(self, zip_name):
        filename_without_ext, _ = os.path.splitext(zip_name)
        logs_path = os.path.join(OUTPUT_LOGDIR, filename_without_ext)
        logs_list = os.listdir(logs_path)
        return logs_list

    def get_logcontent(self, log_file, zip_name):
        print(">>>>>>>> Get Log Content <<<<<<<<<")
        filename_without_ext, _ = os.path.splitext(zip_name)
        log_path = os.path.join(OUTPUT_LOGDIR, filename_without_ext, log_file)
        print(log_path)

        try:
            with open(log_path, 'r') as file:
                content = file.read()
            return content
        except Exception as e:
            return {'error': str(e)}
        

    # zipファイルのダウンロード
    def download_zip(self, zip_name):
        zip_path = os.path.join(OUTPUT_ZIPDIR, zip_name)
        if not os.path.exists(zip_path):
            return
        return zip_path
