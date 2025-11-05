"""
エラーハンドリングの統一ユーティリティ
"""
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional, Union
import logging
import traceback
from datetime import datetime

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class APIError(Exception):
    """カスタムAPIエラークラス"""
    def __init__(self, message: str, status_code: int = 500, details: Optional[Dict[str, Any]] = None, error_code: Optional[str] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        self.error_code = error_code
        super().__init__(self.message)

class ValidationError(APIError):
    """バリデーションエラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 400, details, "VALIDATION_ERROR")

class AuthenticationError(APIError):
    """認証エラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 401, details, "AUTHENTICATION_ERROR")

class AuthorizationError(APIError):
    """認可エラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 403, details, "AUTHORIZATION_ERROR")

class NotFoundError(APIError):
    """リソース未発見エラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 404, details, "NOT_FOUND_ERROR")

class ConflictError(APIError):
    """競合エラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 409, details, "CONFLICT_ERROR")

class ServiceUnavailableError(APIError):
    """サービス利用不可エラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 503, details, "SERVICE_UNAVAILABLE_ERROR")

def handle_api_error(error: Exception, operation: str) -> HTTPException:
    """APIエラーを統一形式で処理"""
    logger.error(f"❌ {operation}エラー: {error}")
    
    if isinstance(error, APIError):
        return HTTPException(
            status_code=error.status_code,
            detail={
                "message": error.message,
                "operation": operation,
                "error_code": error.error_code,
                "details": error.details,
                "timestamp": datetime.now().isoformat()
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
                "error_code": "INTERNAL_ERROR",
                "error": str(error),
                "timestamp": datetime.now().isoformat()
            }
        )

def create_success_response(data: Any, message: str = "Success", operation: str = "operation") -> Dict[str, Any]:
    """成功レスポンスの統一形式"""
    return {
        "status": "success",
        "message": message,
        "operation": operation,
        "data": data,
        "timestamp": datetime.now().isoformat()
    }

def create_error_response(message: str, operation: str, error_code: str = "UNKNOWN_ERROR", details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """エラーレスポンスの統一形式"""
    return {
        "status": "error",
        "message": message,
        "operation": operation,
        "error_code": error_code,
        "details": details or {},
        "timestamp": datetime.now().isoformat()
    }

async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """グローバル例外ハンドラー"""
    logger.error(f"❌ グローバル例外: {exc}")
    logger.error(f"❌ リクエストURL: {request.url}")
    logger.error(f"❌ スタックトレース: {traceback.format_exc()}")
    
    if isinstance(exc, APIError):
        return JSONResponse(
            status_code=exc.status_code,
            content=create_error_response(
                message=exc.message,
                operation="global_handler",
                error_code=exc.error_code or "API_ERROR",
                details=exc.details
            )
        )
    elif isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content=create_error_response(
                message=exc.detail.get("message", str(exc.detail)) if isinstance(exc.detail, dict) else str(exc.detail),
                operation="global_handler",
                error_code="HTTP_ERROR"
            )
        )
    else:
        return JSONResponse(
            status_code=500,
            content=create_error_response(
                message="内部サーバーエラーが発生しました",
                operation="global_handler",
                error_code="INTERNAL_ERROR",
                details={"original_error": str(exc)}
            )
        )

def log_error(error: Exception, operation: str, context: Optional[Dict[str, Any]] = None):
    """エラーログの統一出力"""
    logger.error(f"❌ {operation}エラー: {error}")
    if context:
        logger.error(f"❌ コンテキスト: {context}")
    logger.error(f"❌ スタックトレース: {traceback.format_exc()}")

def validate_required_fields(data: Dict[str, Any], required_fields: list[str]) -> None:
    """必須フィールドのバリデーション"""
    missing_fields = [field for field in required_fields if field not in data or data[field] is None or data[field] == ""]
    if missing_fields:
        raise ValidationError(
            message=f"必須フィールドが不足しています: {', '.join(missing_fields)}",
            details={"missing_fields": missing_fields}
        )

def validate_http_status(response, operation: str) -> None:
    """HTTPレスポンスステータスのバリデーション"""
    if not response.ok:
        if response.status == 401:
            raise AuthenticationError(f"{operation}の認証に失敗しました")
        elif response.status == 403:
            raise AuthorizationError(f"{operation}の認可に失敗しました")
        elif response.status == 404:
            raise NotFoundError(f"{operation}のリソースが見つかりません")
        elif response.status == 409:
            raise ConflictError(f"{operation}で競合が発生しました")
        elif response.status >= 500:
            raise ServiceUnavailableError(f"{operation}のサービスが利用できません")
        else:
            raise APIError(f"{operation}でHTTPエラーが発生しました: {response.status}")
