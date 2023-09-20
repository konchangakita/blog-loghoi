import os
import datetime
import json
import time
import datetime
import subprocess
import zipfile
import tarfile

import common

OUTPUT_PATH = "/usr/src/output"


class HoiGateway:
    def get_output_path(self):
        return OUTPUT_PATH

    def get_logcontent(self, log_directory, log_file):
        print(">>>>>>>> Start Log file content <<<<<<<<<")
        full_path = OUTPUT_PATH + "/" + log_directory + "/" + log_file
        try:
            with open(full_path, "r") as file:
                content = file.read()
            return content
        except Exception as e:
            return json.dump({"error": str(e)})

    def get_hoihoihoilist(self):
        output_directory = OUTPUT_PATH
        print(os.walk(output_directory))
        for root, _, filenames in os.walk(output_directory):
            for filename in filenames:
                if filename.endswith(".gz"):
                    print(filename)

        return "moke"

    def get_hoihoilist(self):
        print(">>>>>>>> Start Get zipfile list <<<<<<<<<")
        output_directory = OUTPUT_PATH

        _hoihoilist = []
        for root, _, filenames in os.walk(output_directory):
            for filename in filenames:
                # if filename.endswith('.zip'):
                if filename.endswith(".gz"):
                    path = os.path.abspath(os.path.join(root, filename))
                    relative_path = os.path.relpath(path, output_directory)
                    _file_list = []
                    for file in os.listdir(os.path.dirname(path)):
                        if file != filename:
                            _file_list.append(file)
                    file_list = sorted(_file_list)
                    _hoihoilist.append(
                        {
                            "zip_filename": filename,
                            "directory": os.path.dirname(relative_path),
                            "file_list": file_list,
                        }
                    )

        # sort by zip filename
        hoihoilist = sorted(_hoihoilist, key=lambda x: x["zip_filename"], reverse=True)
        print(hoihoilist)
        print(">>>>>>>> End Get zipfile list <<<<<<<<<")
        return hoihoilist

    def hoihoi(self, cvm):
        # make log/download directory
        log_folder = datetime.datetime.now().strftime(
            OUTPUT_PATH + "/loghoi_%Y%m%d_%H%M%S"
        )
        os.makedirs(log_folder, exist_ok=True)
        print(">>>>>>>> create ouput folder <<<<<<<<<")
        print(log_folder)

        try:
            f = open("hoi_command.json", "r")
            _setting_json = json.load(f)
            command_list = _setting_json["COMMAND_LIST"]
            f.close()

            f = open("hoi_download.json", "r")
            _setting_json = json.load(f)
            download_list = _setting_json["DOWNLOAD_LIST"]
            f.close()

            print(">>>>>>>> open setting file Success <<<<<<<<<")
        except:
            print(">>>>>>>> missing setting file dayo <<<<<<<<<")

        # Command Hoi Main
        print(">>>>>>>> Command Hoi <<<<<<<<<")
        ssh = common.connect_ssh(cvm)
        for command_item in command_list:
            stdin, stdout, stderr = ssh.exec_command(command_item["command"])
            while not stdout.channel.exit_status_ready():
                time.sleep(1)
            output = stdout.read()

            # create log file name
            now = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            log_filename = f"{log_folder}/{command_item['name']}_{now}.txt"

            # save logfile
            with open(log_filename, "w") as f:
                f.write(output.decode("utf-8").rstrip())
        ssh.close()

        """
        # Download Hoi Main
        print(">>>>>>>> Download Hoi <<<<<<<<<")
        remote_host = cvm
        remote_user = "nutanix"
        key_file = "/usr/src/flaskr/.ssh/ntnx-lockdown"

        for item in download_list:
            remote_path = item["src_path"]
            local_path = log_folder
            command = [
                "scp",
                "-q",
                "-o",
                "StrictHostKeyChecking=no",
                "-i",
                key_file,
                f"{remote_user}@{remote_host}:{remote_path}",
                local_path,
            ]
            try:
                subprocess.run(command, check=True, stdout=subprocess.DEVNULL)
            except subprocess.CalledProcessError as e:
                print(f"Error: {e}")
        """

        # Archive Zip
        print(">>>>>>>> Archive zip Hoi <<<<<<<<<")
        # zip_filename = f"{log_folder}/export_hoi_{now}.zip"
        zip_filename = f"{log_folder}/export_hoi_{now}.tar.gz"
        with tarfile.open(zip_filename, "w:gz") as tar:
            tar.add(log_folder, arcname=os.path.basename(log_folder))

        # Archive Zip 2023.4.13 (bug)
        # print(">>>>>>>> Archive Zip Hoi <<<<<<<<<")
        # zip_filename = f"{log_folder}/export_hoi_{now}.zip"
        # with zipfile.ZipFile(zip_filename, mode='w') as zipf:
        #  zipf.write(log_folder, arcname=os.path.basename(log_folder))

        # Finish Hoi Hoi
        print(">>>>>>>> 　　＿＿＿＿＿＿＿ ")
        print(">>>>>>>> 　／ HoiHoi Done ／＼)ﾉ")
        print(">>>>>>>> ∠＿∠二Ｚ＿＿＿／|￣|＼")
        print(">>>>>>>> |E囗ﾖ   E囗ﾖ |  |  | |")
        print(">>>>>>>> ￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣")
        print("")
        return "complete"
