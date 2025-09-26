"""
エラーハンドリングの統一ユーティリティ
"""
from fastapi import HTTPException
from typing import Dict, Any, Optional
import logging

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class APIError(Exception):
    """カスタムAPIエラークラス"""
    def __init__(self, message: str, status_code: int = 500, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

def handle_api_error(error: Exception, operation: str) -> HTTPException:
    """APIエラーを統一形式で処理"""
    logger.error(f"❌ {operation}エラー: {error}")
    
    if isinstance(error, APIError):
        return HTTPException(
            status_code=error.status_code,
            detail={
                "message": error.message,
                "operation": operation,
                "details": error.details
            }
        )
    elif isinstance(error, HTTPException):
        return error
    else:
        return HTTPException(
            status_code=500,
            detail={
                "message": f"{operation}中に予期しないエラーが発生しました",
                "operation": operation,
                "error": str(error)
            }
        )

def create_success_response(data: Any, message: str = "Success") -> Dict[str, Any]:
    """成功レスポンスの統一形式"""
    return {
        "status": "success",
        "message": message,
        "data": data
    }

def create_error_response(message: str, operation: str, details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """エラーレスポンスの統一形式"""
    return {
        "status": "error",
        "message": message,
        "operation": operation,
        "details": details or {}
    }
