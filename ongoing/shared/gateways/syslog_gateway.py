import sys
import os
# Dockerコンテナ内でのパスを追加
sys.path.append('/usr/src/core')
sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend/core'))
import ela
import common
from datetime import datetime

es = ela.ElasticGateway()


class SyslogGateway:
    def search_syslog(self, search_item):
        try:
            # hostnames変数を初期化
            hostnames = []
            
            # FastAPIからの直接的なデータ構造に対応
            if "query" in search_item and "data" in search_item:
                # 古いFlask形式のデータ構造
                cluster_name = search_item["query"]["cluster"]
                keyword = search_item["data"]["searchtxt"]
                start_datetime = search_item["data"]["startDT"]
                end_datetime = search_item["data"]["endDT"]
                hostnames = []  # 古い形式ではhostnameフィルタなし
            else:
                # 新しいFastAPI形式のデータ構造
                cluster_name = search_item.get("cluster", "")
                keyword = search_item.get("keyword", "")
                start_datetime = search_item.get("start_datetime", "")
                end_datetime = search_item.get("end_datetime", "")
                hostnames = search_item.get("hostnames", [])  # hostnameリストを取得

            # 日付変換
            if start_datetime and end_datetime:
                # ISO形式の日付をパースしてJST形式に変換
                start_dt = datetime.fromisoformat(start_datetime.replace('Z', '+00:00'))
                end_dt = datetime.fromisoformat(end_datetime.replace('Z', '+00:00'))
                
                # JST形式の文字列に変換
                start_datetime_utc = start_dt.strftime('%Y-%m-%dT%H:%M:%S')
                end_datetime_utc = end_dt.strftime('%Y-%m-%dT%H:%M:%S')
            else:
                # デフォルトの日付範囲を設定
                start_datetime_utc = "2024-01-01T00:00:00"
                end_datetime_utc = "2024-12-31T23:59:59"

            # block_serial_numberを取得
            block_serial = None
            if cluster_name:
                try:
                    cluster_data = es.get_cvmlist_document(cluster_name)
                    if cluster_data and len(cluster_data) > 0:
                        block_serial = cluster_data[0].get("block_serial_number", "")
                except Exception as e:
                    print(f"⚠️ [SyslogGateway] Failed to get block_serial_number: {e}")

            # Elasticsearchで検索（hostnameフィルタ + クラスタ名ワイルドカード + block_serial対応）
            res = es.search_syslog_by_keyword_and_time(
                keyword, start_datetime_utc, end_datetime_utc, hostnames, cluster_name, block_serial
            )
            
            # ログデータを構造化して返す
            data = []
            for s in res:
                # syslogオブジェクト内のfacility_labelとseverity_labelを取得
                syslog_data = s.get("syslog", {})
                log_entry = {
                    "message": s.get("message", ""),
                    "facility_label": syslog_data.get("facility_label", ""),
                    "severity_label": syslog_data.get("severity_label", ""),
                    "timestamp": s.get("@timestamp", ""),
                    "hostname": s.get("hostname", "")
                }
                data.append(log_entry)
            
            return data
            
        except Exception as e:
            print(f"Error in search_syslog: {e}")
            import traceback
            traceback.print_exc()
            return []
