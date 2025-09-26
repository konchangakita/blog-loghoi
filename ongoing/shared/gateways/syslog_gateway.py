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
            # FastAPIからの直接的なデータ構造に対応
            if "query" in search_item and "data" in search_item:
                # 古いFlask形式のデータ構造
                cluster_name = search_item["query"]["cluster"]
                keyword = search_item["data"]["searchtxt"]
                start_datetime = search_item["data"]["startDT"]
                end_datetime = search_item["data"]["endDT"]
            else:
                # 新しいFastAPI形式のデータ構造
                cluster_name = search_item.get("cluster", "")
                keyword = search_item.get("keyword", "")
                start_datetime = search_item.get("start_datetime", "")
                end_datetime = search_item.get("end_datetime", "")

            # クラスター情報を取得
            if not cluster_name:
                print("No cluster name provided")
                return []
                
            cluster_info = es.get_cluster_document(cluster_name)
            if not cluster_info:
                print(f"Cluster {cluster_name} not found")
                return []
            
            # クラスター名からホスト名パターンを生成
            # DC1-PHX-POC339 -> PHX-POC339-*
            cluster_parts = cluster_name.split('-')
            if len(cluster_parts) >= 3:
                hostname_pattern = f"{cluster_parts[1]}-{cluster_parts[2]}-*"
            else:
                hostname_pattern = f"{cluster_name}-*"
            
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

            # Elasticsearchで検索
            res = es.search_syslog_document_with_hostname_pattern(
                hostname_pattern, keyword, start_datetime_utc, end_datetime_utc
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
