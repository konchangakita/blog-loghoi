from datetime import datetime
from datetime import timezone, timedelta
from zoneinfo import ZoneInfo  # 3.9

import re
import json
import os
import paramiko
import ela


es = ela.ElasticGateway()


# UTC to JST from elastic
def change_jst(timestamp):
    _utc = re.split("[T.]", timestamp)
    utc = _utc[0] + " " + _utc[1]
    utc_time = datetime.strptime(utc, "%Y-%m-%d %H:%M:%S")
    _jst_time = utc_time.astimezone(timezone(timedelta(hours=+9)))
    jst_time = datetime.strftime(_jst_time, "%Y-%m-%d %H:%M:%S")

    return jst_time


# UTC to JST for syslog
def change_jst_sys(timestamp):
    _utc = re.split("[T.]", timestamp)
    utc = _utc[0] + " " + _utc[1]
    utc_time = datetime.strptime(utc, "%Y-%m-%d %H:%M:%S")
    _jst_time = utc_time.astimezone(timezone(timedelta(hours=+9)))
    jst_time = datetime.strftime(_jst_time, "%Y-%m-%d %H:%M:%S")
    jst_str = jst_time.replace(" ", "T")

    return jst_str


# JST to UTC from frontend
def change_utc(timestamp):
    _jst = re.split("[T.]", timestamp)
    jst = _jst[0] + " " + _jst[1]
    jst_time = datetime.strptime(jst, "%Y-%m-%d %H:%M:%S")
    # add timezone
    jst_tz = ZoneInfo("Asia/Tokyo")
    jst_time = jst_time.replace(tzinfo=jst_tz)
    # change UTC
    _utc_time = jst_time.astimezone(ZoneInfo("UTC"))
    # to string
    utc_time = _utc_time.isoformat()
    utc_str = utc_time.replace(" ", "T")

    return utc_str


def change_timeslot(timeslot):
    timeslot_dict = []
    for oneslot in timeslot:
        _utc = re.split("[T.]", oneslot)
        utc = _utc[0] + " " + _utc[1]
        utc_time = datetime.strptime(utc, "%Y-%m-%d %H:%M:%S")
        _jst_time = utc_time.astimezone(timezone(timedelta(hours=+9)))
        jst_time = datetime.strftime(_jst_time, "%Y-%m-%d %H:%M:%S")

        timeslot_dict.append({"utc_time": oneslot, "local_time": jst_time})
    return timeslot_dict


def change_timestamp(timestamp):
    timestamp_dict = []
    _utc = re.split("[T.]", timestamp)
    utc = _utc[0] + " " + _utc[1]
    utc_time = datetime.strptime(utc, "%Y-%m-%d %H:%M:%S")
    _jst_time = utc_time.astimezone(timezone(timedelta(hours=+9)))
    jst_time = datetime.strftime(_jst_time, "%Y-%m-%d %H:%M:%S")

    timestamp_dict.append({"utc_time": timestamp, "local_time": jst_time})
    return timestamp_dict


# from _rt:get_session_rt, get_cvmlist
def connect_ssh(hostname):
    """SSH接続を確立（詳細なエラーメッセージ付き）"""
    username = "nutanix"
    # 環境変数でSSH鍵のパスを指定
    key_file = os.getenv("SSH_KEY_PATH", "/app/config/.ssh/loghoi-key")
    
    try:
        rsa_key = paramiko.RSAKey.from_private_key_file(key_file)
    except FileNotFoundError:
        error_msg = (
            f"❌ SSH秘密鍵が見つかりません: {key_file}\n"
            f"デプロイスクリプトを実行してSSH鍵を生成してください。\n"
            f"Kubernetes: cd k8s && ./deploy.sh\n"
            f"docker-compose: cd ongoing && ./scripts/init-ssh-keys.sh"
        )
        print(error_msg)
        return False
    except Exception as e:
        print(f"❌ SSH鍵の読み込みエラー: {e}")
        return False

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        # タイムアウトを10秒に設定
        client.connect(hostname=hostname, username=username, pkey=rsa_key, timeout=10)
        print(f">>>>>>>> SSH connecting success to {hostname} <<<<<<<<<")

    except paramiko.ssh_exception.AuthenticationException as e:
        error_msg = (
            f"❌ SSH認証エラー: {hostname}\n"
            f"原因: SSH公開鍵がNutanix Prismに登録されていない可能性があります\n"
            f"\n"
            f"対処方法:\n"
            f"  1. UIの「Open SSH KEY」ボタンをクリック\n"
            f"  2. 表示された公開鍵をコピー\n"
            f"  3. Prism Element > Settings > Cluster Lockdown\n"
            f"  4. 「Add Public Key」で公開鍵を登録\n"
            f"\n"
            f"公開鍵ファイル: {key_file}.pub"
        )
        print(error_msg)
        return False
        
    except Exception as e:
        print(f">>>>>>>> SSH connecting failed to {hostname}: {e} <<<<<<<<<")
        return False

    return client


# Get Prism Leader 
def get_prism_leader(ssh):
    stdin, stdout, stderr = ssh.exec_command(
        f"curl localhost:2019/prism/leader && echo"
    )
    for line in stdout:
        output = line.strip()
        print("[prism leader] >>>>>>>>>", output)
    ssh.close()
    print(">>>>>>>> parmiko close  <<<<<<<<<")

    return output


# Get CVM List from Elastic and Prism Leader from CVM
def get_cvmlist(cluster_name):
    data = es.get_cvmlist_document(cluster_name)
    if not data:
        raise Exception(f"Cluster {cluster_name} not found")
    
    cluster_data = data[0]

    # Get Prism leader (try SSH connection, but don't fail if it doesn't work)
    cvm = data[0]["cvms_ip"][0]
    print(f"Attempting SSH connection to CVM: {cvm}")
    
    ssh = None
    ssh_error = None
    try:
        ssh = connect_ssh(cvm)
        
        # SSH接続失敗の場合
        if not ssh:
            ssh_error = "SSH_AUTH_ERROR"
            print(f"⚠️ SSH接続に失敗しました（認証エラーの可能性）")
        
        # Determine ssh is complete
        if ssh:
            try:
                res = get_prism_leader(ssh)
                print(f'CVM list res: {res}')

                res_json = json.loads(res)
                _prism_leader = re.split(":", res_json["leader"])
                prism_leader = _prism_leader[0]

                cluster_data["prism_leader"] = prism_leader
                print(f"Prism leader set to: {prism_leader}")
            except Exception as e:
                print(f"Error getting prism leader: {e}")
                # SSH接続は成功したが、Prism Leaderの取得に失敗した場合
    except Exception as e:
        print(f"SSH connection failed: {e}")
        ssh_error = "SSH_CONNECTION_ERROR"
    
    # SSH接続失敗時にエラー情報を追加
    if ssh_error:
        raise Exception(f"{ssh_error}: SSH公開鍵がNutanix Prismに登録されていない可能性があります。UIの「Open SSH KEY」ボタンから公開鍵を確認し、Prism Element > Settings > Cluster Lockdownで登録してください。")
    
    # SSH接続を閉じる
    if ssh:
        try:
            ssh.close()
            print(f">>>>>>>> parmiko close  <<<<<<<<<")
        except Exception as e:
            print(f"Error closing SSH connection: {e}")

    return cluster_data


def get_cvm_hostnames(cluster_name):
    """
    指定されたクラスターのhostname一覧をElasticsearchから取得
    
    PC Registration時に保存された host_names（ハイパーバイザーのhostname）を取得。
    host_namesがない場合は、Syslogデータから実際のhostnameを取得。
    
    Args:
        cluster_name (str): クラスター名（例: "DM3-POC023-CE"）
    
    Returns:
        list: hostnameの配列（例: ["NTNX-61c637c0-A-CVM", "NTNX-e51b46bc-A-CVM"]）
    """
    # Elasticsearchからクラスター情報を取得
    data = es.get_cvmlist_document(cluster_name)
    if not data:
        raise Exception(f"Cluster {cluster_name} not found")
    
    # host_names フィールドを取得
    hostnames = data[0].get("host_names", [])
    
    if hostnames:
        print(f"[get_cvm_hostnames] host_namesから取得: {hostnames}")
        return sorted(hostnames)
    
    # host_namesがない場合、Syslogデータから実際のhostnameを取得
    print(f"⚠️ [get_cvm_hostnames] host_namesフィールドがありません。Syslogデータから取得します。")
    
    # block_serial_numberを取得
    serial = data[0].get("block_serial_number", "")
    if not serial:
        raise Exception(f"No serial number found for cluster {cluster_name}")
    
    # Elasticsearchから実際のhostnameを取得（シリアル番号でフィルタ）
    try:
        from core.ela import ElasticSearchGateway
        es_gateway = ElasticSearchGateway()
        
        # Syslogインデックスからhostnameを集約
        query = {
            "size": 0,
            "query": {
                "wildcard": {
                    "hostname": f"*{serial}*"
                }
            },
            "aggs": {
                "unique_hostnames": {
                    "terms": {
                        "field": "hostname.keyword",
                        "size": 100
                    }
                }
            }
        }
        
        result = es_gateway.es.search(index="filebeat-*", body=query)
        buckets = result.get("aggregations", {}).get("unique_hostnames", {}).get("buckets", [])
        
        if buckets:
            hostnames = [bucket["key"] for bucket in buckets]
            print(f"[get_cvm_hostnames] Syslogから取得: {hostnames}")
            return sorted(hostnames)
        
        # Syslogデータもない場合、デフォルトのhostnameを生成
        print(f"⚠️ [get_cvm_hostnames] Syslogデータもありません。デフォルト名を生成します。")
        return [f"NTNX-{serial}-A-CVM", f"NTNX-{serial}-B-CVM", 
                f"NTNX-{serial}-C-CVM", f"NTNX-{serial}-D-CVM"]
        
    except Exception as e:
        print(f"❌ [get_cvm_hostnames] Syslogからの取得失敗: {e}")
        # フォールバック: デフォルトのhostname生成
        return [f"NTNX-{serial}-A-CVM", f"NTNX-{serial}-B-CVM", 
                f"NTNX-{serial}-C-CVM", f"NTNX-{serial}-D-CVM"]
