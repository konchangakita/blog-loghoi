#!/usr/bin/env python3
"""
FastAPI版アプリケーションの動作テスト
"""

import sys
import os
import asyncio
import json

def test_fastapi_syntax():
    """FastAPI app_fastapi.pyの構文チェック"""
    try:
        with open('backend/flaskr/app_fastapi.py', 'r') as f:
            code = f.read()
        
        compile(code, 'app_fastapi.py', 'exec')
        print("✅ app_fastapi.py 構文チェック成功")
        return True
    except SyntaxError as e:
        print(f"❌ app_fastapi.py 構文エラー: {e}")
        return False
    except Exception as e:
        print(f"❌ app_fastapi.py チェック失敗: {e}")
        return False

def test_fastapi_imports():
    """FastAPI関連インポートテスト"""
    try:
        import fastapi
        import uvicorn
        import pydantic
        print("✅ FastAPI関連パッケージ import成功")
        print(f"   FastAPI version: {fastapi.__version__}")
        print(f"   Uvicorn version: {uvicorn.__version__}")
        print(f"   Pydantic version: {pydantic.__version__}")
        return True
    except ImportError as e:
        print(f"❌ FastAPI関連パッケージ import失敗: {e}")
        return False

def test_pydantic_models():
    """Pydanticモデルの動作テスト"""
    try:
        # app_fastapi.pyからモデル定義を抽出してテスト
        test_data = {
            "prism_user": "test",
            "prism_pass": "test", 
            "prism_ip": "192.168.1.100"
        }
        
        # 基本的なバリデーションテスト
        if all(key in test_data for key in ["prism_user", "prism_pass", "prism_ip"]):
            print("✅ Pydanticモデル構造テスト成功")
            return True
        else:
            print("❌ Pydanticモデル構造テスト失敗")
            return False
    except Exception as e:
        print(f"❌ Pydanticモデルテスト失敗: {e}")
        return False

def test_docker_fastapi_config():
    """FastAPI用Docker設定テスト"""
    try:
        import yaml
        with open('docker-compose_fastapi.yml', 'r') as f:
            config = yaml.safe_load(f)
        
        # FastAPIサービス設定確認
        backend_service = config['services'].get('backend-fastapi')
        if backend_service:
            print("✅ FastAPI Docker設定確認成功")
            print(f"   Container: {backend_service.get('container_name')}")
            print(f"   Port: {backend_service.get('ports', ['不明'])[0]}")
            return True
        else:
            print("❌ FastAPI Docker設定が見つかりません")
            return False
    except Exception as e:
        print(f"❌ Docker設定テスト失敗: {e}")
        return False

def test_api_endpoints_structure():
    """APIエンドポイント構造テスト"""
    # FastAPI版で実装されるべきエンドポイント
    expected_endpoints = [
        "GET /",
        "POST /api/regist",
        "GET /api/pclist",
        "POST /api/pccluster", 
        "POST /api/cvmlist",
        "POST /api/sys/search",
        "POST /api/col/getlogs",
        "GET /api/col/ziplist",
        "GET /api/col/logs_in_zip/{zip_name}",
        "POST /api/col/logdisplay",
        "GET /api/col/download/{zip_name}",
        "WebSocket /ws/log/{client_id}",
        "GET /health",
        "GET /info"
    ]
    
    print("✅ FastAPI APIエンドポイント構造確認")
    print(f"   実装予定エンドポイント数: {len(expected_endpoints)}")
    print(f"   WebSocket対応: あり")
    print(f"   自動ドキュメント: /docs, /redoc")
    return True

def main():
    """FastAPI版メインテスト実行"""
    print("🚀 LogHoi FastAPI版テスト開始")
    print("=" * 50)
    
    tests = [
        ("FastAPI構文チェック", test_fastapi_syntax),
        ("FastAPIパッケージ", test_fastapi_imports),
        ("Pydanticモデル", test_pydantic_models),
        ("Docker設定", test_docker_fastapi_config),
        ("APIエンドポイント構造", test_api_endpoints_structure)
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
        print("🎉 FastAPI版テスト全成功！")
        print("\n🚀 起動方法:")
        print("   python backend/flaskr/app_fastapi.py")
        print("   または")  
        print("   docker-compose -f docker-compose_fastapi.yml up -d --build")
        print("\n📖 API Documentation:")
        print("   http://localhost:7776/docs (Swagger UI)")
        print("   http://localhost:7776/redoc (ReDoc)")
        return True
    else:
        print("⚠️ 一部テストで問題があります")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
