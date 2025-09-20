import sys
import os
from typing import Dict, Any, List
import json

# 共通ライブラリのパスを追加
sys.path.append(os.path.join(os.path.dirname(__file__), '../../shared'))

# FastAPI関連インポート
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
import uvicorn

# Elasticsearch
from elasticsearch import Elasticsearch

# 共通ライブラリからインポート
from gateways import (
    RegistGateway, 
    RealtimeLogGateway, 
    SyslogGateway, 
    CollectLogGateway,
    ElasticGateway
)
from utils.common import connect_ssh, get_cvmlist
from config import Config

# ========================================
# Pydantic Models (Request/Response)
# ========================================

class PCRegistRequest(BaseModel):
    prism_user: str
    prism_pass: str
    prism_ip: str

class PCClusterRequest(BaseModel):
    pcip: str

class SyslogSearchRequest(BaseModel):
    keyword: str
    start_datetime: str
    end_datetime: str
    serial: str = None

class LogCollectionRequest(BaseModel):
    cvm: str

class LogDisplayRequest(BaseModel):
    log_file: str
    zip_name: str


# ========================================
# FastAPI Application Setup
# ========================================

app = FastAPI(
    title="LogHoi API",
    description="Nutanix Log Collection and Real-time Monitoring API",
    version="2.0.0",
    docs_url="/docs",  # Swagger UI
    redoc_url="/redoc"  # ReDoc
)


# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番では適切に制限
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静的ファイル配信
app.mount("/static", StaticFiles(directory="static"), name="static")

# Gateway インスタンス初期化
reg = RegistGateway()
rt = RealtimeLogGateway()
sys_gateway = SyslogGateway()
col = CollectLogGateway()

# Elasticsearch接続
es = Elasticsearch(Config.ELASTICSEARCH_URL)

# ========================================
# Web UI Routes
# ========================================

@app.get("/", response_class=HTMLResponse)
async def index():
    """メインページ"""
    try:
        with open("templates/index.html", "r") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(content="<h1>LogHoi API Server</h1><p>API Documentation: <a href='/docs'>/docs</a></p>")

# ========================================
# PC/Cluster Management API
# ========================================

@app.post("/api/regist")
async def regist_pc(request: PCRegistRequest) -> Dict[str, Any]:
    """PC登録API"""
    print(f">>>> receive /api/regist: {request.prism_ip} <<<<<")
    try:
        result = reg.regist_pc(request.dict())
        print(">>>>> res: ", result)
        
        # 文字列レスポンスを辞書形式に変換
        if isinstance(result, str):
            return {
                "status": "success" if "Success" in result else "error",
                "message": result,
                "prism_ip": request.prism_ip
            }
        else:
            return result
    except Exception as e:
        print(f"❌ PC登録エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pclist")
async def get_pclist() -> Dict[str, Any]:
    """PC一覧取得API"""
    print("GET /api/pclist request")
    try:
        cluster_list = reg.get_pcs()
        return cluster_list
    except Exception as e:
        print(f"❌ PC一覧取得エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pccluster")
async def get_pccluster(request: PCClusterRequest) -> Dict[str, Any]:
    """PC関連クラスター取得API"""
    print(f"POST /api/pccluster request: {request}")
    try:
        cluster_list = {}
        if request.pcip:
            cluster_data = reg.get_pccluster(request.dict())
            # 配列レスポンスを辞書形式に変換
            if isinstance(cluster_data, list):
                cluster_list = {
                    "clusters": cluster_data,
                    "count": len(cluster_data)
                }
            else:
                cluster_list = cluster_data
        sshkey = reg.get_sshkey()
        return cluster_list
    except Exception as e:
        print(f"❌ PCクラスター取得エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cvmlist")
async def get_cvmlist_api(cluster_name: Dict[str, str]) -> Dict[str, Any]:
    """CVM一覧取得API"""
    try:
        # 辞書からcluster_nameを抽出
        cluster_name_str = cluster_name.get("cluster_name", "")
        if not cluster_name_str:
            raise HTTPException(status_code=400, detail="cluster_name is required")
        
        cvm_list = get_cvmlist(cluster_name_str)
        # リストではなく辞書として返す（元のFlask版に合わせる）
        return {"cvm_list": cvm_list} if isinstance(cvm_list, list) else cvm_list
    except Exception as e:
        print(f"❌ CVM一覧取得エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# Syslog Search API
# ========================================

@app.post("/api/sys/search")
async def search_syslog(request: SyslogSearchRequest) -> Dict[str, Any]:
    """Syslog検索API"""
    print(f"POST /api/sys/search: {request}")
    try:
        data = sys_gateway.search_syslog(request.dict())
        return data
    except Exception as e:
        print(f"❌ Syslog検索エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# Log Collection API
# ========================================

@app.post("/api/col/getlogs")
async def collect_logs(request: LogCollectionRequest) -> Dict[str, Any]:
    """ログ収集API"""
    print(f"POST /api/col/getlogs: {request.cvm}")
    try:
        data = col.collect_logs(request.cvm)
        return data
    except Exception as e:
        print(f"❌ ログ収集エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/col/ziplist")
async def get_ziplist() -> Dict[str, Any]:
    """ZIP一覧取得API"""
    try:
        data = col.get_ziplist()
        # 辞書形式で返す
        return {"zip_list": data} if isinstance(data, list) else data
    except Exception as e:
        print(f"❌ ZIP一覧取得エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/col/logs_in_zip/{zip_name}")
async def get_logs_in_zip(zip_name: str) -> Dict[str, Any]:
    """ZIP内ログ一覧取得API"""
    try:
        data = col.get_logs_in_zip(zip_name)
        return {"logs": data} if isinstance(data, list) else {"logs": []}
    except Exception as e:
        print(f"❌ ZIP内ログ一覧取得エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/col/logdisplay")
async def display_log(request: LogDisplayRequest) -> Dict[str, Any]:
    """ログ表示API"""
    try:
        data = col.get_logcontent(request.log_file, request.zip_name)
        return data
    except Exception as e:
        print(f"❌ ログ表示エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/col/download/{zip_name}")
async def download_zip(zip_name: str):
    """ZIPダウンロードAPI"""
    try:
        zip_path = col.download_zip(zip_name)
        if not zip_path:
            raise HTTPException(status_code=404, detail="File not found")
        return FileResponse(
            path=zip_path,
            filename=zip_name,
            media_type='application/zip'
        )
    except Exception as e:
        print(f"❌ ZIPダウンロードエラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))



# ========================================
# Application Startup
# ========================================

if __name__ == "__main__":
    print("🚀 Starting LogHoi FastAPI Backend")
    print(f"📊 Elasticsearch: {Config.ELASTICSEARCH_URL}")
    print(f"🌐 Server: {Config.FLASK_HOST}:{Config.FLASK_PORT}")
    print(f"📖 API Documentation: http://{Config.FLASK_HOST}:{Config.FLASK_PORT}/docs")
    
    uvicorn.run(
        "app_fastapi:app",
        host=Config.FLASK_HOST,
        port=Config.FLASK_PORT,
        reload=Config.FLASK_DEBUG,
        log_level="info"
    )
