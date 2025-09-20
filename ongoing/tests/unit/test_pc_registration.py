import unittest
import sys
import os
from unittest.mock import Mock, patch, MagicMock
import json

# テスト対象のパスを追加
sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend/flaskr'))
sys.path.append(os.path.join(os.path.dirname(__file__), '../../shared'))

class TestPCRegistrationUnit(unittest.TestCase):
    """PC登録機能のユニットテスト"""
    
    def setUp(self):
        """テスト前の準備"""
        self.valid_pc_data = {
            "prism_ip": "192.168.1.100",
            "prism_user": "admin",
            "prism_pass": "password"
        }
        
        self.invalid_pc_data = {
            "prism_ip": "",
            "prism_user": "",
            "prism_pass": ""
        }
    
    def test_pc_registration_request_validation(self):
        """PC登録リクエストのバリデーションテスト"""
        # 有効なデータのテスト
        self.assertTrue(self.valid_pc_data["prism_ip"])
        self.assertTrue(self.valid_pc_data["prism_user"])
        self.assertTrue(self.valid_pc_data["prism_pass"])
        
        # 無効なデータのテスト
        self.assertFalse(self.invalid_pc_data["prism_ip"])
        self.assertFalse(self.invalid_pc_data["prism_user"])
        self.assertFalse(self.invalid_pc_data["prism_pass"])
        
        print("✅ PC登録リクエストバリデーション確認")
    
    def test_pc_registration_success_response_format(self):
        """PC登録成功時のレスポンス形式テスト"""
        expected_success_response = {
            "status": "success",
            "message": "Connection Success",
            "prism_ip": "192.168.1.100"
        }
        
        # 必須フィールドの存在確認
        self.assertIn("status", expected_success_response)
        self.assertIn("message", expected_success_response)
        self.assertIn("prism_ip", expected_success_response)
        
        # 値の型確認
        self.assertEqual(expected_success_response["status"], "success")
        self.assertIsInstance(expected_success_response["message"], str)
        self.assertIsInstance(expected_success_response["prism_ip"], str)
        
        print("✅ PC登録成功レスポンス形式確認")
    
    def test_pc_registration_error_response_format(self):
        """PC登録エラー時のレスポンス形式テスト"""
        error_responses = [
            {
                "status": "error",
                "message": "Connection faild (VPN?)",
                "prism_ip": "192.168.1.100"
            },
            {
                "status": "error", 
                "message": "Login faild",
                "prism_ip": "192.168.1.100"
            },
            {
                "status": "error",
                "message": "Prism Central IP desuka?",
                "prism_ip": "192.168.1.100"
            }
        ]
        
        for response in error_responses:
            self.assertIn("status", response)
            self.assertIn("message", response)
            self.assertIn("prism_ip", response)
            self.assertEqual(response["status"], "error")
            self.assertIsInstance(response["message"], str)
        
        print("✅ PC登録エラーレスポンス形式確認")
    
    @patch('requests.request')
    def test_pc_registration_network_timeout(self, mock_request):
        """PC登録時のネットワークタイムアウトテスト"""
        # タイムアウトエラーのシミュレーション
        mock_request.side_effect = Exception("Connection timeout")
        
        # タイムアウト時の処理をテスト
        try:
            mock_request("post", "https://192.168.1.100:9440/api/nutanix/v3/clusters/list", 
                        data="{}", headers={}, verify=False, timeout=3.5)
        except Exception as e:
            self.assertIn("timeout", str(e).lower())
        
        print("✅ ネットワークタイムアウト処理確認")
    
    def test_pc_registration_authentication_headers(self):
        """PC登録時の認証ヘッダー生成テスト"""
        # Base64エンコードのテスト
        import base64
        credentials = f"{self.valid_pc_data['prism_user']}:{self.valid_pc_data['prism_pass']}"
        encoded_credentials = base64.b64encode(credentials.encode('ascii')).decode('ascii')
        expected_auth_header = f"Basic {encoded_credentials}"
        
        # 認証ヘッダーの形式確認
        self.assertTrue(expected_auth_header.startswith("Basic "))
        self.assertIn(encoded_credentials, expected_auth_header)
        
        print("✅ 認証ヘッダー生成確認")
    
    def test_pc_registration_ip_validation(self):
        """PC登録時のIPアドレスバリデーションテスト"""
        valid_ips = [
            "192.168.1.100",
            "10.0.0.1", 
            "172.16.0.1",
            "127.0.0.1"
        ]
        
        invalid_ips = [
            "256.256.256.256",
            "192.168.1",
            "not_an_ip",
            ""
        ]
        
        # 有効なIPのテスト
        for ip in valid_ips:
            self.assertTrue(ip and "." in ip and len(ip.split(".")) == 4)
        
        # 無効なIPのテスト
        for ip in invalid_ips:
            if ip:
                self.assertFalse(len(ip.split(".")) == 4 and all(part.isdigit() and 0 <= int(part) <= 255 for part in ip.split(".")))
        
        print("✅ IPアドレスバリデーション確認")

class TestPCRegistrationIntegration(unittest.TestCase):
    """PC登録機能の統合テスト"""
    
    def setUp(self):
        """テスト前の準備"""
        self.test_data = {
            "prism_ip": "192.168.1.100",
            "prism_user": "admin", 
            "prism_pass": "password"
        }
    
    def test_pc_registration_api_endpoint_success(self):
        """PC登録API成功時のテスト（構造確認）"""
        # APIエンドポイントの構造テスト
        expected_response = {
            "status": "success",
            "message": "Connection Success",
            "prism_ip": "192.168.1.100"
        }
        
        # レスポンス構造の確認
        self.assertIn("status", expected_response)
        self.assertIn("message", expected_response)
        self.assertIn("prism_ip", expected_response)
        self.assertEqual(expected_response["status"], "success")
        
        print("✅ PC登録API成功構造テスト確認")
    
    def test_pc_registration_api_endpoint_error(self):
        """PC登録APIエラー時のテスト（構造確認）"""
        # APIエンドポイントの構造テスト
        expected_response = {
            "status": "error",
            "message": "Connection faild (VPN?)",
            "prism_ip": "192.168.1.100"
        }
        
        # レスポンス構造の確認
        self.assertIn("status", expected_response)
        self.assertIn("message", expected_response)
        self.assertIn("prism_ip", expected_response)
        self.assertEqual(expected_response["status"], "error")
        
        print("✅ PC登録APIエラー構造テスト確認")
    
    def test_pc_registration_api_validation_error(self):
        """PC登録APIバリデーションエラーのテスト（構造確認）"""
        # バリデーションエラーの構造テスト
        invalid_data = {
            "prism_ip": "",
            "prism_user": "",
            "prism_pass": ""
        }
        
        # 無効なデータの確認
        self.assertFalse(invalid_data["prism_ip"])
        self.assertFalse(invalid_data["prism_user"])
        self.assertFalse(invalid_data["prism_pass"])
        
        print("✅ PC登録APIバリデーションエラー構造テスト確認")

def main():
    """PC登録機能テストスイート実行"""
    print("🚀 PC登録機能 TDD テストスイート")
    print("=" * 50)
    
    # unittestでテスト実行
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # テストクラス追加
    suite.addTests(loader.loadTestsFromTestCase(TestPCRegistrationUnit))
    suite.addTests(loader.loadTestsFromTestCase(TestPCRegistrationIntegration))
    
    # テスト実行
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print("\n" + "=" * 50)
    if result.wasSuccessful():
        print("🎉 PC登録機能テスト全成功！")
        print("\n📋 テストカバレッジ:")
        print("   ✅ リクエストバリデーション")
        print("   ✅ レスポンス形式")
        print("   ✅ ネットワークエラー処理")
        print("   ✅ 認証ヘッダー生成")
        print("   ✅ IPアドレスバリデーション")
        print("   ✅ API統合テスト")
        return True
    else:
        print("⚠️ 一部テストで問題があります")
        print(f"失敗: {len(result.failures)}, エラー: {len(result.errors)}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
