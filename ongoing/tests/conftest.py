"""pytest 設定ファイル"""
import pytest
import sys
import os

# テスト対象のパスを追加
sys.path.append(os.path.join(os.path.dirname(__file__), '../shared'))
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend/flaskr'))

@pytest.fixture
def mock_elasticsearch():
    """Elasticsearchモック"""
    from unittest.mock import Mock
    mock_es = Mock()
    mock_es.search.return_value = {
        "hits": {"total": {"value": 0}, "hits": []}
    }
    return mock_es

@pytest.fixture  
def mock_ssh_client():
    """SSH接続モック"""
    from unittest.mock import Mock
    mock_ssh = Mock()
    mock_ssh.exec_command.return_value = (None, ["test log line"], None)
    return mock_ssh

@pytest.fixture
def sample_pc_data():
    """PC登録用サンプルデータ"""
    return {
        "prism_user": "admin",
        "prism_pass": "password",
        "prism_ip": "192.168.1.100"
    }

@pytest.fixture
def sample_log_msg():
    """WebSocketログメッセージサンプル"""
    return {
        "cvm": "192.168.1.101",
        "tail_name": "test.log",
        "tail_path": "/var/log/test.log"
    }
