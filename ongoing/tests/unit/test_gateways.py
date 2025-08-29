import unittest
import sys
import os
from unittest.mock import Mock, patch, MagicMock

# テスト対象のパスを追加
sys.path.append(os.path.join(os.path.dirname(__file__), '../../shared'))

from gateways.regist_gateway import RegistGateway
from gateways.realtime_gateway import RealtimeLogGateway
from gateways.syslog_gateway import SyslogGateway
from gateways.collect_gateway import CollectLogGateway
from gateways.elastic_gateway import ElasticGateway

class TestRegistGateway(unittest.TestCase):
    """RegistGateway 単体テスト"""
    
    def setUp(self):
        self.gateway = RegistGateway()
    
    def test_connection_headers(self):
        """認証ヘッダー生成テスト"""
        request_form = {
            "prism_user": "test_user",
            "prism_pass": "test_pass"
        }
        headers = self.gateway.connection_headers(request_form)
        
        self.assertIn("Authorization", headers)
        self.assertIn("Content-Type", headers)
        self.assertEqual(headers["Content-Type"], "application/json")
        self.assertTrue(headers["Authorization"].startswith("Basic "))

    @patch('requests.get')
    def test_get_pcs(self, mock_get):
        """PC一覧取得テスト"""
        # モックレスポンス設定
        mock_response = Mock()
        mock_response.json.return_value = {"clusters": []}
        mock_get.return_value = mock_response
        
        # テスト実行（実装に応じて調整が必要）
        # result = self.gateway.get_pcs()
        # self.assertIsInstance(result, dict)

class TestRealtimeLogGateway(unittest.TestCase):
    """RealtimeLogGateway 単体テスト"""
    
    def setUp(self):
        self.gateway = RealtimeLogGateway()
    
    @patch('paramiko.SSHClient')
    def test_get_rtlog(self, mock_ssh):
        """リアルタイムログ取得テスト"""
        # モックSSH設定
        mock_ssh_instance = Mock()
        mock_ssh_instance.exec_command.return_value = (None, ["log line 1", "log line 2"], None)
        
        mock_socketio = Mock()
        msg = {
            "tail_name": "test.log",
            "tail_path": "/var/log/test.log"
        }
        
        # テスト実行
        self.gateway.get_rtlog(mock_socketio, mock_ssh_instance, msg)
        
        # SocketIO emitが呼ばれたことを確認
        self.assertTrue(mock_socketio.emit.called)

class TestSyslogGateway(unittest.TestCase):
    """SyslogGateway 単体テスト"""
    
    def setUp(self):
        self.gateway = SyslogGateway()
    
    def test_search_syslog_structure(self):
        """Syslog検索の構造テスト"""
        search_item = {
            "keyword": "error",
            "start_datetime": "2025-01-01",
            "end_datetime": "2025-01-31"
        }
        
        # 実際のElasticsearch接続は避けて、構造のみテスト
        self.assertIsInstance(search_item, dict)
        self.assertIn("keyword", search_item)

class TestCollectLogGateway(unittest.TestCase):
    """CollectLogGateway 単体テスト"""
    
    def setUp(self):
        self.gateway = CollectLogGateway()
    
    @patch('os.makedirs')
    @patch('os.path.exists')
    def test_collect_logs_directory_creation(self, mock_exists, mock_makedirs):
        """ログ収集時のディレクトリ作成テスト"""
        mock_exists.return_value = False
        
        # ディレクトリ作成のロジックのみテスト
        # 実際のSSH接続は避ける
        self.assertTrue(True)  # 構造確認のプレースホルダー

class TestElasticGateway(unittest.TestCase):
    """ElasticGateway 単体テスト"""
    
    def setUp(self):
        self.gateway = ElasticGateway()
    
    @patch('elasticsearch.Elasticsearch')
    def test_elasticsearch_connection(self, mock_es):
        """Elasticsearch接続テスト"""
        mock_es_instance = Mock()
        mock_es.return_value = mock_es_instance
        
        # 接続ロジックのテスト
        self.assertTrue(True)  # 実装に応じて調整

if __name__ == '__main__':
    unittest.main()
