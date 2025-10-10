import os
import json
from datetime import datetime
from datetime import timezone, timedelta
import subprocess
import time
import zipfile
import glob

import common


JSON_LOGFILE = "/app/config/col_logfile.json"
JSON_COMMAND = "/app/config/col_command.json"
OUTPUT_LOGDIR = "/app/output/log"
OUTPUT_ZIPDIR = "/app/output/zip"

os.makedirs(OUTPUT_LOGDIR, exist_ok=True)
os.makedirs(OUTPUT_ZIPDIR, exist_ok=True)

class CollectLogGateway():
    def collect_logs(self, cvm, progress_callback=None):
        # make log/download directory
        _jst_time = datetime.now().astimezone(timezone(timedelta(hours=+9)))
        folder_name = datetime.strftime(_jst_time, "loghoi_%Y%m%d_%H%M%S")
        log_folder = os.path.join(OUTPUT_LOGDIR, folder_name)
        os.makedirs(log_folder, exist_ok=True)
        print(f"[collectlog] start cvm={cvm} folder={folder_name}")

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

            # settings loaded
        except:
            print("[collectlog][error] missing json file (col_logfile.json / col_command.json)")
            return {"message": "missing json file"}


        # Download LOGFILEs
        print("[collectlog] download logfiles (SFTP -> SCP -> SSH cat)")
        remote_host = cvm
        remote_user = "nutanix"
        key_file = "/app/config/.ssh/ntnx-lockdown"

        success_files = 0
        failed_files = 0
        total_files = len(logfile_list)
        
        # 進捗コールバック: ログファイルダウンロード開始
        if progress_callback:
            progress_callback({
                "stage": "logfiles",
                "current": 0,
                "total": total_files,
                "message": "ログファイルのダウンロードを開始しています..."
            })
        
        for i, item in enumerate(logfile_list):
            remote_path = item["src_path"]
            local_path = log_folder
            base = os.path.basename(remote_path)
            local_file = os.path.join(local_path, base)

            # sftp -> scp -> ssh cat

            # 1) SFTPでのダウンロード（推奨）
            try:
                ssh_client = common.connect_ssh(remote_host)
                if ssh_client:
                    try:
                        sftp = ssh_client.open_sftp()
                        sftp.get(remote_path, local_file)
                        sftp.close()
                        ssh_client.close()
                        success_files += 1
                        # 進捗更新
                        if progress_callback:
                            progress_callback({
                                "stage": "logfiles",
                                "current": i + 1,
                                "total": total_files,
                                "message": f"ログファイルをダウンロード中... ({i + 1}/{total_files})"
                            })
                        continue
                    except Exception as se:
                        pass
                        try:
                            ssh_client.close()
                        except:
                            pass
            except Exception as ce:
                pass

            # 2) scpでのダウンロード（従来）
            command = [
                "scp", "-O",
                "-o", "StrictHostKeyChecking=no",
                "-i", key_file,
                f"{remote_user}@{remote_host}:{remote_path}",
                local_path
            ]
            try:
                result = subprocess.run(
                    command,
                    check=True,
                    capture_output=True,
                    text=True,
                    timeout=60,
                )
                success_files += 1
                # 進捗更新
                if progress_callback:
                    progress_callback({
                        "stage": "logfiles",
                        "current": i + 1,
                        "total": total_files,
                        "message": f"ログファイルをダウンロード中... ({i + 1}/{total_files})"
                    })
                continue
            except subprocess.CalledProcessError as e:
                pass
            except subprocess.TimeoutExpired:
                pass

            # 3) フォールバック: SSHでcatしてローカルへ保存
            try:
                ssh_fallback = common.connect_ssh(remote_host)
                if ssh_fallback:
                    stdin, stdout, stderr = ssh_fallback.exec_command(f"cat {remote_path}")
                    content = stdout.read()
                    err = stderr.read()
                    if err and err.strip():
                        failed_files += 1
                    else:
                        with open(local_file, 'wb') as lf:
                            lf.write(content)
                        success_files += 1
                        # 進捗更新
                        if progress_callback:
                            progress_callback({
                                "stage": "logfiles",
                                "current": i + 1,
                                "total": total_files,
                                "message": f"ログファイルをダウンロード中... ({i + 1}/{total_files})"
                            })
                        ssh_fallback.close()
                        continue
            except Exception as fe:
                failed_files += 1
            # 続行（他ファイルは可能な限り収集）
            continue


        # Get Command result
        print(">>>>>>>> Command Execute <<<<<<<<<")
        ssh = common.connect_ssh(cvm)
        total_commands = len(command_list)
        
        # 進捗コールバック: コマンド実行開始
        if progress_callback:
            progress_callback({
                "stage": "commands",
                "current": 0,
                "total": total_commands,
                "message": "コマンドを実行しています..."
            })
        
        for cmd_idx, command_item in enumerate(command_list):
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
                
                # 進捗更新
                if progress_callback:
                    progress_callback({
                        "stage": "commands",
                        "current": cmd_idx + 1,
                        "total": total_commands,
                        "message": f"コマンドを実行中... ({cmd_idx + 1}/{total_commands})"
                    })
            except Exception as e:
                print("command error skipped: ", command_item)
                # 進捗更新（エラー時も）
                if progress_callback:
                    progress_callback({
                        "stage": "commands",
                        "current": cmd_idx + 1,
                        "total": total_commands,
                        "message": f"コマンドを実行中... ({cmd_idx + 1}/{total_commands})"
                    })
                continue
        ssh.close()

        # Archive Zip（完了後に所有者をホストUID/GIDへ合わせる）
        # 進捗コールバック: ZIP作成開始
        if progress_callback:
            progress_callback({
                "stage": "zip",
                "current": 0,
                "total": 100,
                "message": "ZIPファイルを作成しています..."
            })
        
        # archive
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
        
        # 進捗コールバック: ZIP作成完了
        if progress_callback:
            progress_callback({
                "stage": "zip",
                "current": 100,
                "total": 100,
                "message": "ZIPファイルの作成が完了しました"
            })

        # 所有者調整（docker-compose環境でroot実行時の権限ズレ回避）
        try:
            host_uid = int(os.getenv('HOST_UID', '1000'))
            host_gid = int(os.getenv('HOST_GID', '1000'))
            for filename in os.listdir(log_folder):
                filepath = os.path.join(log_folder, filename)
                if os.path.isfile(filepath):
                    os.chown(filepath, host_uid, host_gid)
            os.chown(log_folder, host_uid, host_gid)
            os.chown(zip_path, host_uid, host_gid)
        except Exception:
            pass


        # Finish Hoi Hoi (always show)
        try:
            print(">>>>>>>> 　　＿＿＿＿＿＿＿ ")
            print(">>>>>>>> 　／ HoiHoi Done ／＼)ﾉ")
            print(">>>>>>>> ∠＿∠二Ｚ＿＿＿／|￣|＼")
            print(">>>>>>>> |E囗ﾖ   E囗ﾖ |  |  | |")
            print(">>>>>>>> ￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣")
            print("")
        except Exception:
            # ASCII表示に失敗しても処理は継続する
            pass
        print(f"[collectlog] done cvm={cvm} folder={folder_name} saved={success_files} failed={failed_files} zip={zip_filename}")
        
        # 進捗コールバック: 完全完了
        if progress_callback:
            progress_callback({
                "stage": "done",
                "current": 100,
                "total": 100,
                "message": "ログ収集が完了しました"
            })
        
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

    def get_logcontent(self, log_file, zip_name, start: int | None = None, length: int | None = None):
        filename_without_ext, _ = os.path.splitext(zip_name)
        log_path = os.path.join(OUTPUT_LOGDIR, filename_without_ext, log_file)
        # debug path

        try:
            # 範囲指定なし: 既存互換（全文）
            if start is None and length is None:
                with open(log_path, 'r') as file:
                    content = file.read()
                # 空のファイルかチェック
                if not content.strip():
                    return {'empty': True, 'message': 'ファイル内ログ無し'}
                return content

            # 範囲指定あり: バイトオフセットで読み取り
            safe_start = max(0, int(start or 0))
            safe_length = int(length) if length is not None else 10000  # デフォルト上限
            if safe_length < 0:
                safe_length = 0

            with open(log_path, 'rb') as bf:
                bf.seek(safe_start)
                chunk = bf.read(safe_length)
            # デコード（不正バイトは置換）
            text = chunk.decode('utf-8', errors='replace')
            if text == '':
                return {'empty': True, 'message': '指定範囲にデータ無し'}
            return {
                'range': {
                    'start': safe_start,
                    'length': len(chunk)
                },
                'content': text
            }
        except Exception as e:
            return {'error': str(e)}

    def get_logcontent_paginated(self, log_file, zip_name, start_line: int = 0, end_line: int = 1000):
        """ログファイルを行ベースでページネーション読み込み"""
        filename_without_ext, _ = os.path.splitext(zip_name)
        log_path = os.path.join(OUTPUT_LOGDIR, filename_without_ext, log_file)
        
        try:
            if not os.path.exists(log_path):
                return {'error': 'File not found'}
            
            lines = []
            with open(log_path, 'r', encoding='utf-8', errors='replace') as file:
                for i, line in enumerate(file):
                    if i >= end_line:
                        break
                    if i >= start_line:
                        lines.append(line.rstrip('\n\r'))
            
            return {
                'lines': lines,
                'range': {
                    'start_line': start_line,
                    'end_line': min(end_line, start_line + len(lines)),
                    'total_returned': len(lines)
                }
            }
        except Exception as e:
            return {'error': str(e)}

    def get_logfile_line_count(self, log_file, zip_name):
        """ログファイルの総行数を取得"""
        filename_without_ext, _ = os.path.splitext(zip_name)
        log_path = os.path.join(OUTPUT_LOGDIR, filename_without_ext, log_file)
        
        try:
            if not os.path.exists(log_path):
                return 0
            
            with open(log_path, 'r', encoding='utf-8', errors='replace') as file:
                return sum(1 for _ in file)
        except Exception as e:
            print(f"Error counting lines: {e}")
            return 0

    def get_logfile_size(self, log_file, zip_name):
        """ログファイルのサイズを取得"""
        filename_without_ext, _ = os.path.splitext(zip_name)
        log_path = os.path.join(OUTPUT_LOGDIR, filename_without_ext, log_file)
        # debug path

        try:
            if not os.path.exists(log_path):
                return {'error': 'File not found'}
            
            file_size = os.path.getsize(log_path)
            return {
                'file_size': file_size,
                'file_size_mb': round(file_size / (1024 * 1024), 2),
                'file_path': log_path
            }
        except Exception as e:
            return {'error': str(e)}
        

    # zipファイルのダウンロード
    def download_zip(self, zip_name):
        zip_path = os.path.join(OUTPUT_ZIPDIR, zip_name)
        if not os.path.exists(zip_path):
            return
        return zip_path
