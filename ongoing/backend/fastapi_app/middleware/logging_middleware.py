"""
ログミドルウェア
すべてのリクエストに相関IDとリクエストIDを付与
"""
import time
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from utils.structured_logger import (
    set_correlation_id,
    set_request_id,
    get_correlation_id,
    get_request_id,
    clear_context,
    api_logger,
    EventType
)

class LoggingMiddleware(BaseHTTPMiddleware):
    """リクエスト/レスポンスのログミドルウェア"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """リクエスト処理"""
        # 相関IDとリクエストIDを設定
        correlation_id = request.headers.get('X-Correlation-ID') or set_correlation_id()
        request_id = set_request_id()
        
        # リクエスト開始ログ
        start_time = time.time()
        
        api_logger.info(
            "API request received",
            event_type=EventType.API_REQUEST,
            method=request.method,
            path=request.url.path,
            query_params=dict(request.query_params),
            client_host=request.client.host if request.client else None,
            user_agent=request.headers.get('user-agent'),
            correlation_id=correlation_id,
            request_id=request_id
        )
        
        # リクエスト処理
        try:
            response = await call_next(request)
            
            # 実行時間を計算
            process_time = time.time() - start_time
            
            # レスポンスヘッダーに相関IDとリクエストIDを追加
            response.headers['X-Correlation-ID'] = correlation_id
            response.headers['X-Request-ID'] = request_id
            response.headers['X-Process-Time'] = str(round(process_time * 1000, 2))
            
            # レスポンスログ
            log_level = "info" if response.status_code < 400 else "error"
            log_func = getattr(api_logger, log_level)
            
            log_func(
                "API request completed",
                event_type=EventType.API_RESPONSE,
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                process_time_ms=round(process_time * 1000, 2),
                correlation_id=correlation_id,
                request_id=request_id
            )
            
            # 遅いリクエストの警告
            if process_time > 3.0:  # 3秒以上
                api_logger.warning(
                    "Slow API request detected",
                    event_type=EventType.PERFORMANCE_SLOW,
                    method=request.method,
                    path=request.url.path,
                    process_time_ms=round(process_time * 1000, 2),
                    threshold_ms=3000,
                    correlation_id=correlation_id,
                    request_id=request_id
                )
            
            return response
            
        except Exception as e:
            # エラーログ
            process_time = time.time() - start_time
            
            api_logger.error(
                f"API request failed: {str(e)}",
                event_type=EventType.API_ERROR,
                method=request.method,
                path=request.url.path,
                error=str(e),
                error_type=type(e).__name__,
                process_time_ms=round(process_time * 1000, 2),
                correlation_id=correlation_id,
                request_id=request_id
            )
            
            raise
        
        finally:
            # コンテキストをクリア
            clear_context()

