from datetime import datetime
from datetime import timezone, timedelta
from zoneinfo import ZoneInfo  # 3.9

import re
import paramiko


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
