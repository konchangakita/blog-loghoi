import ela
import common
from datetime import datetime

es = ela.ElasticGateway()


class SyslogGateway:
    def search_syslog(self, search_item):
        print(f"DEBUG: search_item = {search_item}")
        
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
            
            print(f"DEBUG: cluster_name = {cluster_name}, keyword = {keyword}")
            print(f"DEBUG: start_datetime = {start_datetime}, end_datetime = {end_datetime}")

            # クラスター情報を取得
            if not cluster_name:
                print("No cluster name provided")
                return []
                
            cluster_info = es.get_cluster_document(cluster_name)
            if not cluster_info:
                print(f"Cluster {cluster_name} not found")
                return []
            block_serial_number = cluster_info[0]["block_serial_number"]

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
            res = es.search_syslog_document(
                block_serial_number, keyword, start_datetime_utc, end_datetime_utc
            )
            data = [s["message"] for s in res]
            print("elastic res data >>>>>>>>>>>>>", data)
            return data
            
        except Exception as e:
            print(f"Error in search_syslog: {e}")
            import traceback
            traceback.print_exc()
            return []
