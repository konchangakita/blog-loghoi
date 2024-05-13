import ela
import common

es = ela.ElasticGateway()


class SyslogGateway:
    def search_syslog(self, search_item):
        cluster_name = search_item["query"]["cluster"]
        keyword = search_item["data"]["searchtxt"]
        start_datetime = search_item["data"]["startDT"]
        end_datetime = search_item["data"]["endDT"]

        cluster_info = es.get_cluster_document(cluster_name)
        block_serial_number = cluster_info[0]["block_serial_number"]

        # Elasticの立て方？
        start_datetime_utc = common.change_jst_sys(start_datetime)
        end_datetime_utc = common.change_jst_sys(end_datetime)

        res = es.search_syslog_document(
            block_serial_number, keyword, start_datetime_utc, end_datetime_utc
        )
        data = [s["message"] for s in res]
        print("elastic res data >>>>>>>>>>>>>", data)

        return data
