import time
from datetime import datetime
from typing import List, Dict, Any

def change_timestamp(timestamp_utcstr: str) -> List[Dict[str, str]]:
    """UTC文字列をローカル時間に変換"""
    try:
        # UTC文字列をパース
        utc_time = datetime.fromisoformat(timestamp_utcstr.replace('Z', '+00:00'))
        
        # ローカル時間に変換（JST）
        local_time = utc_time.astimezone()
        
        return [{
            'utc_time': timestamp_utcstr,
            'local_time': local_time.strftime('%Y-%m-%d %H:%M:%S'),
            'iso_format': local_time.isoformat()
        }]
    except Exception as e:
        print(f"Timestamp conversion error: {e}")
        return [{
            'utc_time': timestamp_utcstr,
            'local_time': timestamp_utcstr,
            'iso_format': timestamp_utcstr
        }]
