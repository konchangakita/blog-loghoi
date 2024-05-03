from datetime import datetime
from datetime import timezone, timedelta
from zoneinfo import ZoneInfo  # 3.9

import re
import json
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
    username = "nutanix"
    key_file = "/usr/src/flaskr/.ssh/ntnx-lockdown"
    rsa_key = paramiko.RSAKey.from_private_key_file(key_file)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(hostname=hostname, username=username, pkey=rsa_key)
        print(">>>>>>>> parmiko connecting success <<<<<<<<<")

    except:
        print(">>>>>>>> parmiko connecting failed dayo <<<<<<<<<")

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

    # Get Prism leader
    cvm = data[0]["cvms_ip"][0]
    ssh = connect_ssh(cvm)
    res = get_prism_leader(ssh)
    res_json = json.loads(res)
    _prism_leader = re.split(":", res_json["leader"])
    prism_leader = _prism_leader[0]

    cluster_data = data[0]
    cluster_data["prism_leader"] = prism_leader

    return cluster_data
