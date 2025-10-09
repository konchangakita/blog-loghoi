from elasticsearch import Elasticsearch
from elasticsearch import helpers

from datetime import datetime
from datetime import timezone, timedelta
import json
import os

import common

# Elasticsearch接続設定
# 優先順位: 環境変数 > setting.json > デフォルト
ELASTIC_SERVER = os.getenv('ELASTICSEARCH_URL')

if not ELASTIC_SERVER:
    # 外部にElasticsearchを立てた時用
    try:
        f = open("setting.json", "r")
        setting_json = json.load(f)
        ELASTIC_SERVER = setting_json["ELASTIC_SERVER"]
        f.close()
    except:
        ELASTIC_SERVER = "http://elasticsearch-service:9200"

print("##### ELASTIC_SERVER:", ELASTIC_SERVER, "######")

def change_timestamp(timestamp):
    timestamp_dict = []
    _utc = re.split("[T.]", timestamp)
    utc = _utc[0] + " " + _utc[1]
    utc_time = datetime.strptime(utc, "%Y-%m-%d %H:%M:%S")
    _jst_time = utc_time.astimezone(timezone(timedelta(hours=+9)))
    jst_time = datetime.strftime(_jst_time, "%Y-%m-%d %H:%M:%S")

    timestamp_dict.append({"utc_time": timestamp, "local_time": jst_time})
    return timestamp_dict


class ElasticAPI:
    def __init__(self):
        self.es = Elasticsearch(ELASTIC_SERVER)

    # check index and create alias
    def check_indices(self, index_name):
        es = self.es
        indices = es.cat.indices(index="*", h="index").splitlines()
        if index_name not in indices:
            es.indices.create(index=index_name)

            # for uuid search
            if "uuid_" in index_name:
                alias = "search_uuid"
                es.indices.update_aliases(
                    body={"actions": [{"add": {"index": index_name, "alias": alias}}]}
                )

    def put_rest_cluster(self, r_json, timestamp, index_name):
        es = self.es
        index_name = index_name
        self.check_indices(index_name)

        actions = []
        if index_name == "pc":
            entity = r_json
            entity["timestamp"] = timestamp
            actions.append({"_index": index_name, "_source": entity})
        elif index_name == "cluster":
            for entity in r_json:
                entity["timestamp"] = timestamp
                actions.append({"_index": index_name, "_source": entity})

        reaction = helpers.bulk(es, actions)
        return reaction[0]

    # input the data from Prism(Element) API to Elasticsearch
    def put_rest_pe(self, r_json, timestamp, cluster_name, cluster_uuid, index_name):
        es = self.es
        index_name = index_name
        self.check_indices(index_name)

        actions = []
        if index_name != "uuid_share_details":
            for entity in r_json["entities"]:
                entity["timestamp"] = timestamp
                entity["cluster_name"] = cluster_name
                entity["cluster_uuid"] = cluster_uuid
                actions.append({"_index": index_name, "_source": entity})
        else:
            for entity in r_json:
                entity["timestamp"] = timestamp
                entity["cluster_name"] = cluster_name
                entity["cluster_uuid"] = cluster_uuid
                actions.append({"_index": index_name, "_source": entity})

        reaction = helpers.bulk(es, actions)
        return reaction[0]


class ElasticGateway(ElasticAPI):
    def get_timeslot(self, cluster_name):
        es = self.es
        index_name = "uuid_vms"
        query = {"function_score": {"query": {"match": {"cluster_name": cluster_name}}}}
        aggs = {"group_by_timestamp": {"terms": {"field": "timestamp", "size": 1000}}}
        try:
            res = es.search(index=index_name, query=query, aggs=aggs)
            _timeslot = [
                slot["key_as_string"]
                for slot in res["aggregations"]["group_by_timestamp"]["buckets"]
            ]
            timeslot = sorted(_timeslot, reverse=True)
            timeslot_dict = common.change_timeslot(timeslot)
            return timeslot_dict
        except Exception as e:
            # インデックスが存在しない場合は空リストを返す
            print(f"[get_timeslot] インデックスが存在しないか、データがありません: {e}")
            return []

    # input PC
    def put_pc(self, input_data):
        timestamp = datetime.utcnow()
        input_size = self.put_rest_cluster(input_data, timestamp, index_name="pc")

        return timestamp

    # input cluster with PC's timestamp
    def put_cluster(self, input_list, timestamp):
        input_size = self.put_rest_cluster(input_list, timestamp, index_name="cluster")

        return input_size

    # get cluster list latest 5 and deduplication
    def get_allpcs_document(self):
        es = self.es
        sort = {"timestamp": {"order": "desc"}}
        collapse = {"field": "prism_ip.keyword"}
        # まだ一つも登録されていないとき用
        try:
            res = es.search(index="pc", sort=sort, collapse=collapse, size=5)
            data = [s["_source"] for s in res["hits"]["hits"]]
        except:
            data = {}
        return data

    # get cluster list latest 5 and deduplication
    def get_allclusters_document(self):
        es = self.es
        sort = {"timestamp": {"order": "desc"}}
        collapse = {"field": "name.keyword"}
        res = es.search(index="cluster", sort=sort, collapse=collapse, size=5)
        data = [s["_source"] for s in res["hits"]["hits"]]
        return data

    # get cluster list related to PC
    def get_pccluster_document(self, pc_ip, timestamp):
        es = self.es
        print("pc_ip", pc_ip)
        # fmt: off
        query = {"function_score": {"query": {"bool": {"must": [
            {"match": {"pc_ip": pc_ip}}, 
            {"match": {"timestamp": timestamp}}
        ]}}}}
        res = es.search(index="cluster", query=query, size=512)
        # fmt: on

        print([s["_source"] for s in res["hits"]["hits"]])
        return [s["_source"] for s in res["hits"]["hits"]]

    # get cluster list latest 5 and deduplication from regist.py
    def get_pclatest_document(self, pcip):
        es = self.es
        # fmt: off
        query = {"function_score": {"query": {"bool": {"must": [
                            {"match": {"prism_ip": pcip}},
        ]}}}}
        sort = {"timestamp": {"order": "desc"}}  # latest
        res = es.search(index="pc", query=query, sort=sort, size=1)
        # fmt: on

        return [s["_source"] for s in res["hits"]["hits"]]

    def get_cvmlist_document(self, cluster_name):
        es = self.es
        # fmt: off
        query = {"function_score": {"query": {"bool": {"must": [
                            {"match": {"name": cluster_name}},
        ]}}}}
        sort = {"timestamp": {"order": "desc"}}  # latest
        res = es.search(index="cluster", query=query, sort=sort, size=1)
        # fmt: on

        return [s["_source"] for s in res["hits"]["hits"]]

    # get cluster list latest 5 and deduplication
    def get_cluster_document(self, cluster_name):
        es = self.es
        # fmt: off
        query = {"function_score": {"query": {"bool": {"must": [
                            {"match": {"name": cluster_name}},
        ]}}}}
        sort = {"timestamp": {"order": "desc"}}  # latest
        res = es.search(index="cluster", query=query, sort=sort, size=1)
        # fmt: on
        return [s["_source"] for s in res["hits"]["hits"]]

    def search_syslog_document(self, serial, keyword, start_datetime, end_datetime):
        es = self.es
        print(start_datetime, end_datetime)
        search_serial = "*" + serial + "*"
        search_keyword = "*" + keyword + "*"

        print("serial >>>>>>>>>>>>>", search_serial)
        print("keyword >>>>>>>>>>>>>", search_keyword)
        print("time range(JST) >>>>>>>>>>>>", start_datetime, "-", end_datetime)

        query = {
            "function_score": {
                "query": {
                    "bool": {
                        "must": [
                            {
                                "range": {
                                    "@timestamp": {
                                        "gte": start_datetime,
                                        "lte": end_datetime,
                                    }
                                }
                            },
                            {
                                "query_string": {
                                    "default_field": "hostname",
                                    "query": search_serial,
                                }
                            },
                            {
                                "query_string": {
                                    "default_field": "message",
                                    "query": search_keyword,
                                }
                            },
                        ]
                    }
                }
            }
        }
        print("query >>>>>>>>>>>>", query)

        res = es.search(index="filebeat-*", query=query, size=100)
        return [s["_source"] for s in res["hits"]["hits"]]

    def search_syslog_document_with_hostname_pattern(self, hostname_pattern, keyword, start_datetime, end_datetime):
        es = self.es
        print(start_datetime, end_datetime)
        search_hostname_pattern = "*" + hostname_pattern + "*"
        search_keyword = "*" + keyword + "*"

        print("hostname_pattern >>>>>>>>>>>>>", search_hostname_pattern)
        print("keyword >>>>>>>>>>>>>", search_keyword)
        print("time range(JST) >>>>>>>>>>>>", start_datetime, "-", end_datetime)

        query = {
            "function_score": {
                "query": {
                    "bool": {
                        "must": [
                            {
                                "range": {
                                    "@timestamp": {
                                        "gte": start_datetime,
                                        "lte": end_datetime,
                                    }
                                }
                            },
                            {
                                "query_string": {
                                    "default_field": "hostname",
                                    "query": search_hostname_pattern,
                                }
                            },
                            {
                                "query_string": {
                                    "default_field": "message",
                                    "query": search_keyword,
                                }
                            },
                        ]
                    }
                }
            }
        }
        print("query >>>>>>>>>>>>", query)

        res = es.search(index="filebeat-*", query=query, size=100)
        return [s["_source"] for s in res["hits"]["hits"]]

    def put_data_uuid(self, res):
        timestamp = datetime.utcnow()
        input_size = {}

        # cluster (辞書形式 {'data': {...}, 'status_code': ...} から取得)
        cluster_json = res["cluster"]["data"] if isinstance(res["cluster"], dict) else res["cluster"].json()
        cluster_name = cluster_json["name"]
        cluster_uuid = cluster_json["uuid"]

        # vms
        vms_json = res["vms"]["data"] if isinstance(res["vms"], dict) else res["vms"].json()
        input_size["vms"] = self.put_rest_pe(
            vms_json, timestamp, cluster_name, cluster_uuid, index_name="uuid_vms"
        )

        # storage_containers
        storage_containers_json = res["storage_containers"]["data"] if isinstance(res["storage_containers"], dict) else res["storage_containers"].json()
        input_size["storage_containers"] = self.put_rest_pe(
            storage_containers_json,
            timestamp,
            cluster_name,
            cluster_uuid,
            index_name="uuid_storage_containers",
        )

        # volume_group
        volume_groups_json = res["volume_groups"]["data"] if isinstance(res["volume_groups"], dict) else res["volume_groups"].json()
        input_size["volume_groups"] = self.put_rest_pe(
            volume_groups_json,
            timestamp,
            cluster_name,
            cluster_uuid,
            index_name="uuid_volume_groups",
        )

        # vfilers
        vfilers_json = res["vfilers"]["data"] if isinstance(res["vfilers"], dict) else res["vfilers"].json()
        if len(vfilers_json["entities"]):
            input_size["vfliers"] = self.put_rest_pe(
                vfilers_json,
                timestamp,
                cluster_name,
                cluster_uuid,
                index_name="uuid_vfilers",
            )

            # shares
            shares_json = res["shares"]["data"] if isinstance(res["shares"], dict) else res["shares"].json()
            input_size["shares"] = self.put_rest_pe(
                shares_json,
                timestamp,
                cluster_name,
                cluster_uuid,
                index_name="uuid_shares",
            )

            # share_details
            share_details = res["res_share_details"]
            input_size["share_details"] = self.put_rest_pe(
                share_details,
                timestamp,
                cluster_name,
                cluster_uuid,
                index_name="uuid_share_details",
            )

        return cluster_name, input_size

    def get_uuidall_document(self, timestamp, cluster_name):
        es = self.es
        alias = "search_uuid"
        query = {
            "function_score": {
                "query": {
                    "bool": {
                        "must": [
                            {"match": {"timestamp": timestamp}},
                            {"match": {"cluster_name": cluster_name}},
                        ]
                    }
                }
            }
        }
        res = es.search(index=alias, query=query, size=512)
        return [s for s in res["hits"]["hits"]]

    def search_uuid_document(self, alias, timestamp, cluster_name, keyword):
        es = self.es
        print("Keyword >>>>>> " + keyword)
        print("alias >>> " + alias)
        fields = [
            # "metadata.uuid.keyword", #vms v3
            "uuid",  # vms
            "uuid.keyword",
            "attachment_list.vm_uuid",  # volume_groups
            "uuid.keyword",
            "containerUuid",
            "nvms.uuid",
            "nvms.fileServerUuid",
            "nvms.vmUuid",  # vfilers
            "uuid.keyword",
            "fileServerUuid",
            "containerUuid",  # shares
            "Share UUID",  # share_details
            "storage_container_uuid",
            "spec.resources.disk_list.storage_config.storage_container_reference.uuid",
            "disk_list.container_uuid",  # sotrage_containers
        ]

        print("fields >>>>>>> ", end="")
        print(fields)

        query = {
            "function_score": {
                "query": {
                    "bool": {
                        "must": [
                            {"match": {"cluster_name": cluster_name}},
                            {"match": {"timestamp": timestamp}},
                            {"multi_match": {"query": keyword, "fields": fields}},
                        ]
                    }
                }
            }
        }
        # print(query)
        res = es.search(index=alias, query=query, size=512)
        # print("res >>>>>")
        # print(res)
        # print([s['_source'] for s in res['hits']['hits'] ])
        return [s for s in res["hits"]["hits"]]

    def search_uuidadditional_document(
        self, index_name, timestamp, cluster_name, multi_keyword
    ):
        es = self.es

        query = {
            "function_score": {
                "query": {
                    "bool": {
                        "must": [
                            {"match": {"cluster_name": cluster_name}},
                            {"match": {"timestamp": timestamp}},
                            {"bool": {"should": multi_keyword}},
                        ]
                    }
                }
            }
        }
        res = es.search(index=index_name, query=query, size=512)
        return [s for s in res["hits"]["hits"]]

    def search_document_additional(self, alias, timestamp, cluster_name, multi_keyword):
        """Search additional documents using multi-keyword queries"""
        es = self.es
        
        query = {
            "function_score": {
                "query": {
                    "bool": {
                        "must": [
                            {"match": {"cluster_name": cluster_name}},
                            {"match": {"timestamp": timestamp}},
                            {"bool": {"should": multi_keyword}},
                        ]
                    }
                }
            }
        }
        res = es.search(index=alias, query=query, size=512)
        return [s for s in res["hits"]["hits"]]
