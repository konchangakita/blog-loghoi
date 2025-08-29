#!/usr/bin/env python3
"""
リファクタリング版アプリケーションの動作テスト
依存関係を考慮した段階的テスト
"""

import sys
import os
import importlib.util

def test_config_import():
    """設定管理クラスのインポートテスト"""
    try:
        sys.path.append('shared')
        from config import Config
        print("✅ Config import成功")
        print(f"   Elasticsearch URL: {Config.ELASTICSEARCH_URL}")
        print(f"   Flask Port: {Config.FLASK_PORT}")
        return True
    except Exception as e:
        print(f"❌ Config import失敗: {e}")
        return False

def test_app_refactored_syntax():
    """app_refactored.pyの構文チェック"""
    try:
        # 構文チェックのみ（実行はしない）
        with open('backend/flaskr/app_refactored.py', 'r') as f:
            code = f.read()
        
        compile(code, 'app_refactored.py', 'exec')
        print("✅ app_refactored.py 構文チェック成功")
        return True
    except SyntaxError as e:
        print(f"❌ app_refactored.py 構文エラー: {e}")
        return False
    except Exception as e:
        print(f"❌ app_refactored.py チェック失敗: {e}")
        return False

def test_gateway_files_exist():
    """Gatewayファイルの存在確認"""
    gateway_files = [
        'shared/gateways/regist_gateway.py',
        'shared/gateways/realtime_gateway.py', 
        'shared/gateways/syslog_gateway.py',
        'shared/gateways/collect_gateway.py',
        'shared/gateways/elastic_gateway.py'
    ]
    
    all_exist = True
    for file_path in gateway_files:
        if os.path.exists(file_path):
            print(f"✅ {file_path} 存在確認")
        else:
            print(f"❌ {file_path} 存在しない")
            all_exist = False
    
    return all_exist

def test_directory_structure():
    """リファクタリング後のディレクトリ構造確認"""
    expected_dirs = [
        'shared',
        'shared/gateways', 
        'shared/utils',
        'shared/config',
        'tests',
        'tests/unit',
        'tests/integration'
    ]
    
    all_exist = True
    for dir_path in expected_dirs:
        if os.path.exists(dir_path):
            print(f"✅ {dir_path}/ ディレクトリ存在")
        else:
            print(f"❌ {dir_path}/ ディレクトリ存在しない")
            all_exist = False
    
    return all_exist

def test_docker_compose_syntax():
    """docker-compose_refactored.yml構文確認"""
    try:
        import yaml
        with open('docker-compose_refactored.yml', 'r') as f:
            yaml.safe_load(f)
        print("✅ docker-compose_refactored.yml 構文チェック成功")
        return True
    except Exception as e:
        print(f"❌ docker-compose_refactored.yml 構文エラー: {e}")
        return False

def main():
    """メインテスト実行"""
    print("🧪 LogHoi リファクタリング版テスト開始")
    print("=" * 50)
    
    tests = [
        ("ディレクトリ構造確認", test_directory_structure),
        ("設定管理テスト", test_config_import),
        ("Gatewayファイル確認", test_gateway_files_exist),
        ("app_refactored.py構文", test_app_refactored_syntax),
        ("Docker Compose構文", test_docker_compose_syntax)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🔍 {test_name}")
        if test_func():
            passed += 1
        else:
            print(f"   ⚠️ {test_name} で問題が検出されました")
    
    print("\n" + "=" * 50)
    print(f"📊 テスト結果: {passed}/{total} 成功")
    
    if passed == total:
        print("🎉 全テスト成功！リファクタリング版は正常です")
        return True
    else:
        print("⚠️ 一部テストで問題があります。詳細を確認してください")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
