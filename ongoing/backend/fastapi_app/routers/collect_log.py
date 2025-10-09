"""
ログコレクト機能専用のAPIルーター
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from core.broker_col import CollectLogGateway
from core.common import connect_ssh
from fastapi_app.utils.error_handler import handle_api_error, create_success_response, create_error_response
from fastapi_app.utils.cache import SimpleTTLCache
from fastapi_app.utils.structured_logger import api_logger, EventType, log_execution_time

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
    page: int | None = None   # ページ番号（1から開始）
    page_size: int | None = None # ページサイズ（デフォルト: 1000行）


# ========================================
# API Endpoints
# ========================================

@router.post("/getlogs", response_model=Dict[str, Any])
@log_execution_time(api_logger)
async def collect_logs(request: LogCollectionRequest) -> Dict[str, Any]:
    """ログ収集API"""
    try:
        api_logger.info(
            "Log collection started",
            event_type=EventType.DATA_CREATE,
            cvm=request.cvm
        )
        
        data = col.collect_logs(request.cvm)
        
        # ログ収集完了後、Collect Log関連のキャッシュをクリア
        cleared_count = cache.clear_by_pattern(r"^col:")
        
        api_logger.info(
            "Log collection completed",
            event_type=EventType.DATA_CREATE,
            cvm=request.cvm,
            cache_cleared=cleared_count
        )
        
        return create_success_response(data, "ログ収集が完了しました")
    except Exception as e:
        api_logger.error(
            "Log collection failed",
            event_type=EventType.API_ERROR,
            cvm=request.cvm,
            error=str(e)
        )
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
    """ログ表示API（ページネーション対応）"""
    try:
        # ページネーション処理
        if request.page and request.page_size:
            # ページベースの読み込み
            page = max(1, request.page)
            page_size = min(10000, max(100, request.page_size))  # 100-10000行の範囲
            
            # 行ベースのオフセット計算
            start_line = (page - 1) * page_size
            end_line = start_line + page_size
            
            data = col.get_logcontent_paginated(
                request.log_file, 
                request.zip_name, 
                start_line=start_line,
                end_line=end_line
            )
            
            # 総行数を取得（キャッシュから）
            total_lines_key = f"col:total_lines:{request.zip_name}:{request.log_file}"
            total_lines = cache.get(total_lines_key)
            if total_lines is None:
                total_lines = col.get_logfile_line_count(request.log_file, request.zip_name)
                cache.set(total_lines_key, total_lines, ttl_seconds=300)  # 5分キャッシュ
            
            # ページネーション情報を追加
            data['pagination'] = {
                'current_page': page,
                'page_size': page_size,
                'total_lines': total_lines,
                'total_pages': (total_lines + page_size - 1) // page_size,
                'has_next': page * page_size < total_lines,
                'has_prev': page > 1
            }
        else:
            # 従来のバイトベース読み込み
            data = col.get_logcontent(request.log_file, request.zip_name, start=request.start, length=request.length)
        
        return create_success_response(data, "ログ内容を取得しました")
    except Exception as e:
        raise handle_api_error(e, "ログ表示")

@router.post("/cache/clear", response_model=Dict[str, Any])
async def clear_cache(pattern: Optional[str] = None) -> Dict[str, Any]:
    """キャッシュクリアAPI"""
    try:
        if pattern:
            cleared_count = cache.clear_by_pattern(pattern)
            message = f"パターン '{pattern}' にマッチする {cleared_count} 件のキャッシュをクリアしました"
            stats = cache.get_stats()
            return create_success_response({
                "cleared_count": cleared_count,
                "pattern": pattern,
                "cache_stats": stats
            }, message)
        else:
            stats_before = cache.get_stats()
            cache.clear()
            message = "すべてのキャッシュをクリアしました"
            stats = cache.get_stats()
            return create_success_response({
                "cleared_count": stats_before["total_items"],
                "pattern": pattern,
                "cache_stats": stats
            }, message)
    except Exception as e:
        raise handle_api_error(e, "キャッシュクリア")

@router.get("/cache/stats", response_model=Dict[str, Any])
async def get_cache_stats() -> Dict[str, Any]:
    """キャッシュ統計情報取得API"""
    try:
        stats = cache.get_stats()
        return create_success_response(stats, "キャッシュ統計情報を取得しました")
    except Exception as e:
        raise handle_api_error(e, "キャッシュ統計情報取得")

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

