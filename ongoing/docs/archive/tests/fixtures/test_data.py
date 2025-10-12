"""テスト用データ・フィクスチャ"""

# PC登録用テストデータ
SAMPLE_PC_REGIST = {
    "prism_user": "test_user",
    "prism_pass": "test_password",
    "prism_ip": "192.168.1.100",
    "cluster_name": "test-cluster"
}

# CVM情報テストデータ
SAMPLE_CVM_LIST = [
    {
        "ip": "192.168.1.101",
        "name": "test-cvm-01",
        "status": "active"
    },
    {
        "ip": "192.168.1.102", 
        "name": "test-cvm-02",
        "status": "active"
    }
]

# Syslog検索用テストデータ
SAMPLE_SYSLOG_SEARCH = {
    "keyword": "error",
    "start_datetime": "2025-01-01T00:00:00",
    "end_datetime": "2025-01-31T23:59:59",
    "serial": "test-serial-001"
}

# WebSocketメッセージテストデータ
SAMPLE_WEBSOCKET_LOG_MSG = {
    "cvm": "192.168.1.101",
    "tail_name": "nutanix.log",
    "tail_path": "/var/log/nutanix.log"
}

# Elasticsearch レスポンステストデータ
SAMPLE_ES_RESPONSE = {
    "took": 5,
    "timed_out": False,
    "hits": {
        "total": {"value": 100},
        "hits": [
            {
                "_source": {
                    "timestamp": "2025-01-26T10:00:00",
                    "level": "ERROR",
                    "message": "Test error message"
                }
            }
        ]
    }
}

# ログファイル収集テストデータ  
SAMPLE_LOG_COLLECTION = {
    "cvm": "192.168.1.101",
    "log_types": ["system", "application"],
    "time_range": "last_24h"
}
