"""
ログコレクト機能専用のAPIルーター
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from typing import Dict, Any, List
from pydantic import BaseModel

from core.broker_col import CollectLogGateway
from core.common import connect_ssh
from utils.error_handler import handle_api_error, create_success_response, create_error_response
from utils.cache import SimpleTTLCache

# ルーターの作成
router = APIRouter(prefix="/api/col", tags=["collect-log"])

# Gateway インスタンス
col = CollectLogGateway()
cache = SimpleTTLCache()

# ========================================
# Pydantic Models
# ========================================

class LogCollectionRequest(BaseModel):
    cvm: str

class LogDisplayRequest(BaseModel):
    log_file: str
    zip_name: str
    start: int | None = None  # 先頭からのオフセット（バイト）
    length: int | None = None # 読み取る長さ（バイト）


# ========================================
# API Endpoints
# ========================================

@router.post("/getlogs", response_model=Dict[str, Any])
async def collect_logs(request: LogCollectionRequest) -> Dict[str, Any]:
    """ログ収集API"""
    try:
        print(f"POST /api/col/getlogs: {request.cvm}")
        data = col.collect_logs(request.cvm)
        return create_success_response(data, "ログ収集が完了しました")
    except Exception as e:
        raise handle_api_error(e, "ログ収集")

@router.get("/ziplist", response_model=Dict[str, List[str]])
async def get_ziplist() -> Dict[str, List[str]]:
    """ZIP一覧取得API"""
    try:
        def _factory():
            return col.get_ziplist()
        data = cache.get_or_set("col:ziplist", ttl_seconds=10, factory=_factory)
        # 辞書形式で返す
        return {"zip_list": data} if isinstance(data, list) else data
    except Exception as e:
        raise handle_api_error(e, "ZIP一覧取得")

@router.get("/logs_in_zip/{zip_name}", response_model=Dict[str, List[str]])
async def get_logs_in_zip(zip_name: str) -> Dict[str, List[str]]:
    """ZIP内ログ一覧取得API"""
    try:
        cache_key = f"col:logs_in_zip:{zip_name}"
        def _factory():
            return col.get_logs_in_zip(zip_name)
        data = cache.get_or_set(cache_key, ttl_seconds=10, factory=_factory)
        return {"logs": data} if isinstance(data, list) else {"logs": []}
    except Exception as e:
        raise handle_api_error(e, "ZIP内ログ一覧取得")

@router.post("/logsize", response_model=Dict[str, Any])
async def get_logfile_size(request: LogDisplayRequest) -> Dict[str, Any]:
    """ログファイルサイズ取得API"""
    try:
        data = col.get_logfile_size(request.log_file, request.zip_name)
        return create_success_response(data, "ログファイルサイズを取得しました")
    except Exception as e:
        raise handle_api_error(e, "ログファイルサイズ取得")

@router.post("/logdisplay", response_model=Dict[str, Any])
async def display_log(request: LogDisplayRequest) -> Dict[str, Any]:
    """ログ表示API"""
    try:
        data = col.get_logcontent(request.log_file, request.zip_name, start=request.start, length=request.length)
        return create_success_response(data, "ログ内容を取得しました")
    except Exception as e:
        raise handle_api_error(e, "ログ表示")

@router.get("/download/{zip_name}")
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
        raise handle_api_error(e, "ZIPダウンロード")

