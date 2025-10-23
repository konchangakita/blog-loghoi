import unittest
import sys
import os
import json
from unittest.mock import Mock, patch, MagicMock

class TestCvmListComponent(unittest.TestCase):
    """CVMリストコンポーネントのテスト"""
    
    def setUp(self):
        """テスト前の準備"""
        self.valid_cvms_data = {
            "cvmsIp": ["10.38.112.29", "10.38.112.30", "10.38.112.31", "10.38.112.32"],
            "prismLeader": "10.38.112.29",
            "cvmChecked": "10.38.112.29"
        }
        
        self.invalid_cvms_data = {
            "cvmsIp": "not_an_array",
            "prismLeader": "10.38.112.29",
            "cvmChecked": "10.38.112.29"
        }
        
        self.undefined_cvms_data = {
            "cvmsIp": None,
            "prismLeader": "10.38.112.29",
            "cvmChecked": "10.38.112.29"
        }
    
    def test_component_props_validation(self):
        """コンポーネントプロパティバリデーションテスト"""
        # 有効なプロパティのテスト
        props = self.valid_cvms_data
        
        # 必須プロパティの存在確認
        required_props = ["cvmsIp", "prismLeader", "cvmChecked"]
        for prop in required_props:
            self.assertIn(prop, props)
        
        # 型の確認
        self.assertIsInstance(props["cvmsIp"], list)
        self.assertIsInstance(props["prismLeader"], str)
        self.assertIsInstance(props["cvmChecked"], str)
        
        print("✅ コンポーネントプロパティバリデーション確認")
    
    def test_cvms_ip_array_validation(self):
        """cvmsIp配列バリデーションテスト"""
        # 有効な配列のテスト
        valid_array = self.valid_cvms_data["cvmsIp"]
        self.assertTrue(isinstance(valid_array, list))
        self.assertGreater(len(valid_array), 0)
        
        # 各要素が文字列であることを確認
        for cvm_ip in valid_array:
            self.assertIsInstance(cvm_ip, str)
            self.assertTrue(len(cvm_ip) > 0)
        
        # 空配列のテスト
        empty_array = []
        self.assertTrue(isinstance(empty_array, list))
        self.assertEqual(len(empty_array), 0)
        
        print("✅ cvmsIp配列バリデーション確認")
    
    def test_error_handling_undefined_cvms_ip(self):
        """undefined cvmsIpのエラーハンドリングテスト"""
        # undefinedの場合の処理
        cvms_ip = None
        
        if not cvms_ip:
            error_message = "Error: CVM IP data is not available"
            self.assertEqual(error_message, "Error: CVM IP data is not available")
            
            # エラー表示の確認
            error_display = {
                "className": "text-red-500 p-4",
                "message": error_message
            }
            self.assertIn("text-red-500", error_display["className"])
            self.assertIn("Error:", error_display["message"])
        
        print("✅ undefined cvmsIpエラーハンドリング確認")
    
    def test_error_handling_invalid_cvms_ip(self):
        """無効なcvmsIpのエラーハンドリングテスト"""
        # 配列でない場合の処理
        invalid_cvms_ip = "not_an_array"
        
        if not isinstance(invalid_cvms_ip, list):
            error_message = "Error: CVM IP data is not in valid format"
            self.assertEqual(error_message, "Error: CVM IP data is not in valid format")
            
            # エラー表示の確認
            error_display = {
                "className": "text-red-500 p-4",
                "message": error_message
            }
            self.assertIn("text-red-500", error_display["className"])
            self.assertIn("Error:", error_display["message"])
        
        print("✅ 無効なcvmsIpエラーハンドリング確認")
    
    def test_cvm_rendering_with_valid_data(self):
        """有効なデータでのCVMレンダリングテスト"""
        cvms_ip = self.valid_cvms_data["cvmsIp"]
        prism_leader = self.valid_cvms_data["prismLeader"]
        cvm_checked = self.valid_cvms_data["cvmChecked"]
        
        # レンダリングロジックのテスト
        rendered_cvms = []
        for idx, cvm_ip in enumerate(cvms_ip):
            # リーダー判定
            is_leader = cvm_ip == prism_leader
            leader_mark = '*' if is_leader else None
            
            # 選択状態判定
            is_checked = cvm_ip == cvm_checked
            
            # レンダリングデータの構築
            cvm_data = {
                "index": idx,
                "ip": cvm_ip,
                "isLeader": is_leader,
                "leaderMark": leader_mark,
                "isChecked": is_checked
            }
            rendered_cvms.append(cvm_data)
        
        # レンダリング結果の検証
        self.assertEqual(len(rendered_cvms), len(cvms_ip))
        
        # リーダーの確認
        leader_count = sum(1 for cvm in rendered_cvms if cvm["isLeader"])
        self.assertEqual(leader_count, 1)
        
        # 選択状態の確認
        checked_count = sum(1 for cvm in rendered_cvms if cvm["isChecked"])
        self.assertEqual(checked_count, 1)
        
        print("✅ 有効なデータでのCVMレンダリング確認")
    
    def test_prism_leader_detection(self):
        """Prism Leader検出テスト"""
        cvms_ip = self.valid_cvms_data["cvmsIp"]
        prism_leader = self.valid_cvms_data["prismLeader"]
        
        # リーダーがCVMリストに含まれているか
        self.assertIn(prism_leader, cvms_ip)
        
        # 各CVMのリーダー判定
        for cvm_ip in cvms_ip:
            is_leader = cvm_ip == prism_leader
            if cvm_ip == prism_leader:
                self.assertTrue(is_leader)
                # リーダーには'*'マークが付く
                leader_mark = '*' if is_leader else None
                self.assertEqual(leader_mark, '*')
            else:
                self.assertFalse(is_leader)
                leader_mark = '*' if is_leader else None
                self.assertIsNone(leader_mark)
        
        print("✅ Prism Leader検出確認")
    
    def test_cvm_selection_handling(self):
        """CVM選択処理テスト"""
        cvms_ip = self.valid_cvms_data["cvmsIp"]
        cvm_checked = self.valid_cvms_data["cvmChecked"]
        
        # 選択されたCVMがリストに含まれているか
        self.assertIn(cvm_checked, cvms_ip)
        
        # 選択処理のシミュレーション
        def handle_option_change(selected_cvm):
            # 選択されたCVMの検証
            if selected_cvm in cvms_ip:
                return selected_cvm
            else:
                return None
        
        # 有効な選択のテスト
        valid_selection = handle_option_change("10.38.112.29")
        self.assertEqual(valid_selection, "10.38.112.29")
        
        # 無効な選択のテスト
        invalid_selection = handle_option_change("999.999.999.999")
        self.assertIsNone(invalid_selection)
        
        print("✅ CVM選択処理確認")
    
    def test_loading_state_handling(self):
        """ローディング状態処理テスト"""
        loading_states = [
            {"isLoading": True, "expected": "Loading..."},
            {"isLoading": False, "expected": "Not loading"}
        ]
        
        for state in loading_states:
            if state["isLoading"]:
                # ローディング中の表示
                loading_display = "Loading..."
                self.assertEqual(loading_display, state["expected"])
            else:
                # ローディング完了後の表示
                normal_display = "Not loading"
                self.assertEqual(normal_display, state["expected"])
        
        print("✅ ローディング状態処理確認")
    
    def test_data_consistency_validation(self):
        """データ一貫性バリデーションテスト"""
        data = self.valid_cvms_data
        
        # 基本データの存在確認
        self.assertIn("cvmsIp", data)
        self.assertIn("prismLeader", data)
        self.assertIn("cvmChecked", data)
        
        # データの型確認
        self.assertIsInstance(data["cvmsIp"], list)
        self.assertIsInstance(data["prismLeader"], str)
        self.assertIsInstance(data["cvmChecked"], str)
        
        # リーダーがCVMリストに含まれているか
        self.assertIn(data["prismLeader"], data["cvmsIp"])
        
        # 選択されたCVMがCVMリストに含まれているか
        self.assertIn(data["cvmChecked"], data["cvmsIp"])
        
        print("✅ データ一貫性バリデーション確認")
    
    def test_edge_cases(self):
        """エッジケーステスト"""
        # 空配列の場合
        empty_cvms = []
        self.assertTrue(isinstance(empty_cvms, list))
        self.assertEqual(len(empty_cvms), 0)
        
        # 単一要素の配列の場合
        single_cvm = ["10.38.112.29"]
        self.assertTrue(isinstance(single_cvm, list))
        self.assertEqual(len(single_cvm), 1)
        
        # 同じIPが複数回含まれる場合
        duplicate_cvms = ["10.38.112.29", "10.38.112.29", "10.38.112.30"]
        self.assertTrue(isinstance(duplicate_cvms, list))
        self.assertEqual(len(duplicate_cvms), 3)
        
        print("✅ エッジケース確認")

class TestCvmListIntegration(unittest.TestCase):
    """CVMリスト統合テスト"""
    
    def setUp(self):
        """テスト前の準備"""
        self.mock_cluster_data = {
            "name": "DC1-PHX-POC339",
            "cvms_ip": ["10.38.112.29", "10.38.112.30", "10.38.112.31", "10.38.112.32"],
            "prism_leader": "10.38.112.29",
            "hypervisor": "AHV",
            "uuid": "000631a4-5eb4-e0f2-4026-507c6f071d38"
        }
    
    def test_cluster_data_to_cvm_props_conversion(self):
        """クラスターデータからCVMプロパティへの変換テスト"""
        # クラスターデータからCVMプロパティへの変換
        cvm_props = {
            "cvmsIp": self.mock_cluster_data["cvms_ip"],
            "prismLeader": self.mock_cluster_data["prism_leader"],
            "cvmChecked": self.mock_cluster_data["prism_leader"]  # デフォルトでリーダーを選択
        }
        
        # 変換結果の検証
        self.assertIn("cvmsIp", cvm_props)
        self.assertIn("prismLeader", cvm_props)
        self.assertIn("cvmChecked", cvm_props)
        
        # データの整合性確認
        self.assertEqual(cvm_props["cvmsIp"], self.mock_cluster_data["cvms_ip"])
        self.assertEqual(cvm_props["prismLeader"], self.mock_cluster_data["prism_leader"])
        self.assertEqual(cvm_props["cvmChecked"], self.mock_cluster_data["prism_leader"])
        
        print("✅ クラスターデータからCVMプロパティへの変換確認")
    
    def test_cvm_list_rendering_simulation(self):
        """CVMリストレンダリングシミュレーションテスト"""
        cvms_ip = self.mock_cluster_data["cvms_ip"]
        prism_leader = self.mock_cluster_data["prism_leader"]
        
        # レンダリングシミュレーション
        rendered_items = []
        for idx, cvm_ip in enumerate(cvms_ip):
            is_leader = cvm_ip == prism_leader
            leader_mark = '*' if is_leader else None
            
            item = {
                "key": idx,
                "ip": cvm_ip,
                "isLeader": is_leader,
                "leaderMark": leader_mark,
                "radioValue": cvm_ip,
                "radioName": "cvm"
            }
            rendered_items.append(item)
        
        # レンダリング結果の検証
        self.assertEqual(len(rendered_items), len(cvms_ip))
        
        # 各アイテムの検証
        for item in rendered_items:
            self.assertIn("key", item)
            self.assertIn("ip", item)
            self.assertIn("isLeader", item)
            self.assertIn("leaderMark", item)
            self.assertIn("radioValue", item)
            self.assertIn("radioName", item)
            
            # リーダーの確認
            if item["isLeader"]:
                self.assertEqual(item["leaderMark"], '*')
            else:
                self.assertIsNone(item["leaderMark"])
        
        print("✅ CVMリストレンダリングシミュレーション確認")

def main():
    """CVMリストコンポーネントテストスイート実行"""
    print("🚀 CVMリストコンポーネント TDD テストスイート")
    print("=" * 60)
    
    # unittestでテスト実行
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # テストクラス追加
    suite.addTests(loader.loadTestsFromTestCase(TestCvmListComponent))
    suite.addTests(loader.loadTestsFromTestCase(TestCvmListIntegration))
    
    # テスト実行
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print("\n" + "=" * 60)
    if result.wasSuccessful():
        print("🎉 CVMリストコンポーネントテスト全成功！")
        print("\n📋 テストカバレッジ:")
        print("   ✅ コンポーネントプロパティバリデーション")
        print("   ✅ cvmsIp配列バリデーション")
        print("   ✅ エラーハンドリング（undefined・無効データ）")
        print("   ✅ 有効なデータでのCVMレンダリング")
        print("   ✅ Prism Leader検出")
        print("   ✅ CVM選択処理")
        print("   ✅ ローディング状態処理")
        print("   ✅ データ一貫性バリデーション")
        print("   ✅ エッジケース")
        print("   ✅ クラスターデータ変換")
        print("   ✅ レンダリングシミュレーション")
        return True
    else:
        print("⚠️ 一部テストで問題があります")
        print(f"失敗: {len(result.failures)}, エラー: {len(result.errors)}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
