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
                hostnames = []
            else:
                # 新しいFastAPI形式のデータ構造
                cluster_name = search_item.get("cluster", "")
                keyword = search_item.get("keyword", "")
                start_datetime = search_item.get("start_datetime", "")
                end_datetime = search_item.get("end_datetime", "")
                hostnames = search_item.get("hostnames", [])
            
            print(f"[SyslogGateway] Received search_item keys: {list(search_item.keys())}")
            print(f"DEBUG: cluster_name = {cluster_name}, keyword = {keyword}, hostnames = {hostnames}")
            print(f"DEBUG: start_datetime = {start_datetime}, end_datetime = {end_datetime}")

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
                print(f"[SyslogGateway] Attempting to get block_serial_number for cluster: {cluster_name}")
                try:
                    cluster_data = es.get_cvmlist_document(cluster_name)
                    print(f"[SyslogGateway] cluster_data retrieved: {cluster_data is not None}, count: {len(cluster_data) if cluster_data else 0}")
                    if cluster_data and len(cluster_data) > 0:
                        block_serial = cluster_data[0].get("block_serial_number", "")
                        print(f"[SyslogGateway] block_serial_number: {block_serial}")
                    else:
                        print(f"⚠️ [SyslogGateway] No cluster_data found for: {cluster_name}")
                except Exception as e:
                    print(f"⚠️ [SyslogGateway] Failed to get block_serial_number: {e}")
                    import traceback
                    traceback.print_exc()
            else:
                print(f"⚠️ [SyslogGateway] cluster_name is empty, skipping block_serial retrieval")

            # Elasticsearchで検索（hostname, cluster_name, block_serial_numberでフィルタ）
            print(f"Searching syslog: keyword={keyword}, time_range={start_datetime_utc} to {end_datetime_utc}")
            res = es.search_syslog_by_keyword_and_time(
                keyword, start_datetime_utc, end_datetime_utc, 
                hostnames=hostnames, 
                cluster_name=cluster_name,
                block_serial=block_serial
            )
            data = [s for s in res]
            print(f"elastic res data count: {len(data)}")
            return data
            
        except Exception as e:
            print(f"Error in search_syslog: {e}")
            import traceback
            traceback.print_exc()
            return []
