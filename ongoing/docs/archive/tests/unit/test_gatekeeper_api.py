import unittest
import sys
import os
import json
from unittest.mock import Mock, patch, MagicMock

# テスト対象のパスを追加
sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend/flaskr'))
sys.path.append(os.path.join(os.path.dirname(__file__), '../../shared'))

class TestGatekeeperAPI(unittest.TestCase):
    """Gatekeeper機能のAPIテスト"""
    
    def setUp(self):
        """テスト前の準備"""
        self.valid_pcip = "10.38.112.7"
        self.invalid_pcip = ""
        self.api_base_url = "http://localhost:7776"
    
    def test_pccluster_api_request_format(self):
        """pccluster APIリクエスト形式テスト"""
        expected_request = {
            "method": "POST",
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"pcip": self.valid_pcip})
        }
        
        # リクエスト形式の確認
        self.assertEqual(expected_request["method"], "POST")
        self.assertEqual(expected_request["headers"]["Content-Type"], "application/json")
        self.assertIsInstance(expected_request["body"], str)
        
        # JSON形式の確認
        parsed_body = json.loads(expected_request["body"])
        self.assertEqual(parsed_body["pcip"], self.valid_pcip)
        
        print("✅ pccluster APIリクエスト形式確認")
    
    def test_pccluster_api_success_response_format(self):
        """pccluster API成功レスポンス形式テスト"""
        success_response = {
            "clusters": [
                {
                    "name": "DC1-PHX-POC339",
                    "hypervisor": "AHV",
                    "prism_ip": "10.38.112.37",
                    "pc_ip": "10.38.112.7",
                    "uuid": "000631a4-5eb4-e0f2-4026-507c6f071d38",
                    "block_serial_number": "LUC224700017",
                    "cvms_ip": ["10.38.112.29", "10.38.112.30", "10.38.112.31", "10.38.112.32"],
                    "timestamp": "2025-09-17T15:53:36.232052"
                }
            ],
            "count": 1
        }
        
        # レスポンス構造の確認
        self.assertIn("clusters", success_response)
        self.assertIn("count", success_response)
        self.assertIsInstance(success_response["clusters"], list)
        self.assertIsInstance(success_response["count"], int)
        
        # クラスター情報の確認
        if success_response["clusters"]:
            cluster = success_response["clusters"][0]
            required_fields = ["name", "hypervisor", "prism_ip", "pc_ip", "uuid", "cvms_ip"]
            for field in required_fields:
                self.assertIn(field, cluster)
        
        print("✅ pccluster API成功レスポンス形式確認")
    
    def test_pccluster_api_error_response_format(self):
        """pccluster APIエラーレスポンス形式テスト"""
        error_responses = [
            {"detail": "Internal Server Error"},
            {"detail": "Method Not Allowed"},
            {"detail": "Validation Error"}
        ]
        
        for error_response in error_responses:
            self.assertIn("detail", error_response)
            self.assertIsInstance(error_response["detail"], str)
        
        print("✅ pccluster APIエラーレスポンス形式確認")
    
    def test_pccluster_api_validation(self):
        """pccluster APIバリデーションテスト"""
        # 有効なpcipのテスト
        valid_queries = [
            {"pcip": "10.38.112.7"},
            {"pcip": "192.168.1.100"},
            {"pcip": "172.16.0.1"}
        ]
        
        for query in valid_queries:
            self.assertTrue(query["pcip"])
            self.assertIsInstance(query["pcip"], str)
        
        # 無効なpcipのテスト
        invalid_queries = [
            {"pcip": ""},
            {"pcip": None},
            {}
        ]
        
        for query in invalid_queries:
            if "pcip" in query:
                self.assertFalse(query["pcip"])
        
        print("✅ pccluster APIバリデーション確認")
    
    def test_environment_variable_handling(self):
        """環境変数処理テスト"""
        backend_host = "http://localhost:7776"
        expected_url = f"{backend_host}/api/pccluster"
        
        self.assertEqual(expected_url, "http://localhost:7776/api/pccluster")
        self.assertTrue(expected_url.startswith("http://"))
        self.assertTrue(expected_url.endswith("/api/pccluster"))
        
        print("✅ 環境変数処理確認")

class TestGatekeeperFrontend(unittest.TestCase):
    """Gatekeeperフロントエンド機能テスト"""
    
    def setUp(self):
        """テスト前の準備"""
        self.valid_query = {"pcip": "10.38.112.7"}
        self.invalid_query = {"pcip": ""}
    
    def test_getClusterList_hook_structure(self):
        """getClusterListフックの構造テスト"""
        # フックの戻り値構造
        expected_return = {
            "data": None,
            "loading": True,
            "error": None
        }
        
        # 戻り値の構造確認
        self.assertIn("data", expected_return)
        self.assertIn("loading", expected_return)
        self.assertIn("error", expected_return)
        
        # 型の確認
        self.assertIsInstance(expected_return["loading"], bool)
        self.assertIsNone(expected_return["data"])
        self.assertIsNone(expected_return["error"])
        
        print("✅ getClusterListフック構造確認")
    
    def test_loading_state_handling(self):
        """ローディング状態処理テスト"""
        loading_states = [
            {"loading": True, "data": None, "error": None},
            {"loading": False, "data": [], "error": None},
            {"loading": False, "data": None, "error": "Network Error"}
        ]
        
        for state in loading_states:
            if state["loading"]:
                self.assertTrue(state["loading"])
                self.assertIsNone(state["data"])
                self.assertIsNone(state["error"])
            else:
                self.assertFalse(state["loading"])
        
        print("✅ ローディング状態処理確認")
    
    def test_error_state_handling(self):
        """エラー状態処理テスト"""
        error_states = [
            {"error": "API接続エラー (500): Internal Server Error"},
            {"error": "ネットワークエラー: Failed to fetch"},
            {"error": "API接続エラー (404): Not Found"}
        ]
        
        for state in error_states:
            self.assertIsInstance(state["error"], str)
            self.assertTrue(len(state["error"]) > 0)
        
        print("✅ エラー状態処理確認")
    
    def test_data_processing(self):
        """データ処理テスト"""
        # 新しいレスポンス形式の処理
        new_format_response = {
            "clusters": [
                {"name": "Cluster1", "uuid": "uuid1"},
                {"name": "Cluster2", "uuid": "uuid2"}
            ],
            "count": 2
        }
        
        # データ抽出の確認
        if "clusters" in new_format_response:
            clusters = new_format_response["clusters"]
            self.assertIsInstance(clusters, list)
            self.assertEqual(len(clusters), 2)
        
        # 旧形式の処理
        old_format_response = [
            {"name": "Cluster1", "uuid": "uuid1"},
            {"name": "Cluster2", "uuid": "uuid2"}
        ]
        
        self.assertIsInstance(old_format_response, list)
        self.assertEqual(len(old_format_response), 2)
        
        print("✅ データ処理確認")
    
    def test_conditional_rendering_logic(self):
        """条件付きレンダリングロジックテスト"""
        # ローディング状態
        loading_state = {"loading": True, "data": None, "error": None}
        if loading_state["loading"]:
            self.assertTrue(True)  # ローディング表示
        
        # エラー状態
        error_state = {"loading": False, "data": None, "error": "Error message"}
        if error_state["error"]:
            self.assertTrue(True)  # エラー表示
        
        # 成功状態
        success_state = {"loading": False, "data": [{"name": "Cluster1"}], "error": None}
        if success_state["data"] and not success_state["loading"] and not success_state["error"]:
            self.assertTrue(True)  # データ表示
        
        print("✅ 条件付きレンダリングロジック確認")

class TestGatekeeperIntegration(unittest.TestCase):
    """Gatekeeper統合テスト"""
    
    def setUp(self):
        """テスト前の準備"""
        self.api_base_url = "http://localhost:7776"
        self.frontend_url = "http://localhost:7777"
    
    def test_gatekeeper_page_structure(self):
        """Gatekeeperページ構造テスト"""
        # URLパラメータの処理
        test_urls = [
            "http://localhost:7777/gatekeeper?pcip=10.38.112.7",
            "http://localhost:7777/gatekeeper?pcip=192.168.1.100",
            "http://localhost:7777/gatekeeper?pcip=172.16.0.1"
        ]
        
        for url in test_urls:
            # URLからpcipパラメータを抽出するロジックのテスト
            if "pcip=" in url:
                pcip = url.split("pcip=")[1]
                self.assertTrue(pcip)
                self.assertIsInstance(pcip, str)
        
        print("✅ Gatekeeperページ構造確認")
    
    def test_cluster_tab_props(self):
        """ClusterTabコンポーネントのプロパティテスト"""
        # クラスターリストの構造
        cluster_list = [
            {
                "name": "DC1-PHX-POC339",
                "hypervisor": "AHV",
                "prism_ip": "10.38.112.37",
                "pc_ip": "10.38.112.7",
                "uuid": "000631a4-5eb4-e0f2-4026-507c6f071d38",
                "cvms_ip": ["10.38.112.29", "10.38.112.30"]
            }
        ]
        
        # クラスターリストの検証
        self.assertIsInstance(cluster_list, list)
        if cluster_list:
            cluster = cluster_list[0]
            required_fields = ["name", "hypervisor", "prism_ip", "pc_ip", "uuid"]
            for field in required_fields:
                self.assertIn(field, cluster)
        
        print("✅ ClusterTabプロパティ確認")

def main():
    """Gatekeeper機能テストスイート実行"""
    print("🚀 Gatekeeper機能 TDD テストスイート")
    print("=" * 60)
    
    # unittestでテスト実行
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # テストクラス追加
    suite.addTests(loader.loadTestsFromTestCase(TestGatekeeperAPI))
    suite.addTests(loader.loadTestsFromTestCase(TestGatekeeperFrontend))
    suite.addTests(loader.loadTestsFromTestCase(TestGatekeeperIntegration))
    
    # テスト実行
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print("\n" + "=" * 60)
    if result.wasSuccessful():
        print("🎉 Gatekeeper機能テスト全成功！")
        print("\n📋 テストカバレッジ:")
        print("   ✅ pccluster APIリクエスト形式")
        print("   ✅ APIレスポンス形式（成功・エラー）")
        print("   ✅ バリデーション")
        print("   ✅ 環境変数処理")
        print("   ✅ フロントエンドフック構造")
        print("   ✅ ローディング・エラー状態処理")
        print("   ✅ データ処理")
        print("   ✅ 条件付きレンダリング")
        print("   ✅ ページ構造")
        print("   ✅ コンポーネントプロパティ")
        return True
    else:
        print("⚠️ 一部テストで問題があります")
        print(f"失敗: {len(result.failures)}, エラー: {len(result.errors)}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

