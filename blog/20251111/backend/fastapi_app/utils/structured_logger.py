"""
構造化ログとコンテキスト管理モジュール
標準ライブラリのみを使用した実装
"""
import logging
import json
import uuid
import time
from datetime import datetime
from typing import Dict, Any, Optional
from contextvars import ContextVar
from functools import wraps

# 相関ID用のコンテキスト変数
correlation_id_var: ContextVar[Optional[str]] = ContextVar('correlation_id', default=None)
request_id_var: ContextVar[Optional[str]] = ContextVar('request_id', default=None)

class StructuredLogger:
    """構造化ログ出力クラス"""
    
    def __init__(self, name: str, level: int = logging.INFO):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(level)
        
        # 既存のハンドラーをクリア
        self.logger.handlers.clear()
        
        # コンソールハンドラーを追加
        console_handler = logging.StreamHandler()
        console_handler.setLevel(level)
        
        # JSONフォーマッターを設定
        formatter = StructuredFormatter()
        console_handler.setFormatter(formatter)
        
        self.logger.addHandler(console_handler)
        
        # 親ロガーへの伝播を防ぐ
        self.logger.propagate = False
    
    def _create_log_record(self, level: str, message: str, **kwargs) -> Dict[str, Any]:
        """ログレコードを作成"""
        record = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': level,
            'message': message,
            'logger': self.logger.name
        }
        
        # 相関IDを追加
        correlation_id = correlation_id_var.get()
        if correlation_id:
            record['correlation_id'] = correlation_id
        
        # リクエストIDを追加
        request_id = request_id_var.get()
        if request_id:
            record['request_id'] = request_id
        
        # 追加のコンテキスト情報
        if kwargs:
            record['context'] = kwargs
        
        return record
    
    def info(self, message: str, **kwargs):
        """INFO レベルのログ"""
        record = self._create_log_record('INFO', message, **kwargs)
        self.logger.info(json.dumps(record, ensure_ascii=False))
    
    def debug(self, message: str, **kwargs):
        """DEBUG レベルのログ"""
        record = self._create_log_record('DEBUG', message, **kwargs)
        self.logger.debug(json.dumps(record, ensure_ascii=False))
    
    def warning(self, message: str, **kwargs):
        """WARNING レベルのログ"""
        record = self._create_log_record('WARNING', message, **kwargs)
        self.logger.warning(json.dumps(record, ensure_ascii=False))
    
    def error(self, message: str, **kwargs):
        """ERROR レベルのログ"""
        record = self._create_log_record('ERROR', message, **kwargs)
        self.logger.error(json.dumps(record, ensure_ascii=False))
    
    def critical(self, message: str, **kwargs):
        """CRITICAL レベルのログ"""
        record = self._create_log_record('CRITICAL', message, **kwargs)
        self.logger.critical(json.dumps(record, ensure_ascii=False))

class StructuredFormatter(logging.Formatter):
    """JSON形式のログフォーマッター"""
    
    def format(self, record: logging.LogRecord) -> str:
        """ログレコードをJSON形式でフォーマット"""
        # 既にJSON文字列の場合はそのまま返す
        if isinstance(record.msg, str) and record.msg.startswith('{'):
            return record.msg
        
        # 通常のログメッセージをJSON形式に変換
        log_data = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'message': record.getMessage(),
            'logger': record.name,
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }
        
        # 相関IDを追加
        correlation_id = correlation_id_var.get()
        if correlation_id:
            log_data['correlation_id'] = correlation_id
        
        # リクエストIDを追加
        request_id = request_id_var.get()
        if request_id:
            log_data['request_id'] = request_id
        
        # 例外情報を追加
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        
        return json.dumps(log_data, ensure_ascii=False)

def set_correlation_id(correlation_id: Optional[str] = None) -> str:
    """相関IDを設定"""
    if correlation_id is None:
        correlation_id = str(uuid.uuid4())
    correlation_id_var.set(correlation_id)
    return correlation_id

def get_correlation_id() -> Optional[str]:
    """相関IDを取得"""
    return correlation_id_var.get()

def set_request_id(request_id: Optional[str] = None) -> str:
    """リクエストIDを設定"""
    if request_id is None:
        request_id = str(uuid.uuid4())
    request_id_var.set(request_id)
    return request_id

def get_request_id() -> Optional[str]:
    """リクエストIDを取得"""
    return request_id_var.get()

def clear_context():
    """コンテキストをクリア"""
    correlation_id_var.set(None)
    request_id_var.set(None)

def log_execution_time(logger: StructuredLogger):
    """関数の実行時間をログに記録するデコレーター"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            func_name = func.__name__
            
            logger.debug(f"Started: {func_name}", function=func_name)
            
            try:
                result = await func(*args, **kwargs)
                execution_time = time.time() - start_time
                logger.info(
                    f"Completed: {func_name}",
                    function=func_name,
                    execution_time_ms=round(execution_time * 1000, 2),
                    status="success"
                )
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                logger.error(
                    f"Failed: {func_name}",
                    function=func_name,
                    execution_time_ms=round(execution_time * 1000, 2),
                    status="error",
                    error=str(e)
                )
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            func_name = func.__name__
            
            logger.debug(f"Started: {func_name}", function=func_name)
            
            try:
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                logger.info(
                    f"Completed: {func_name}",
                    function=func_name,
                    execution_time_ms=round(execution_time * 1000, 2),
                    status="success"
                )
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                logger.error(
                    f"Failed: {func_name}",
                    function=func_name,
                    execution_time_ms=round(execution_time * 1000, 2),
                    status="error",
                    error=str(e)
                )
                raise
        
        # 非同期関数かどうかを判定
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

# 標準ロガーインスタンス
api_logger = StructuredLogger('api', level=logging.INFO)
db_logger = StructuredLogger('database', level=logging.INFO)
system_logger = StructuredLogger('system', level=logging.INFO)
performance_logger = StructuredLogger('performance', level=logging.INFO)
security_logger = StructuredLogger('security', level=logging.WARNING)

# ログレベルの定義
class LogLevel:
    """ログレベルの定義"""
    DEBUG = 'DEBUG'      # 開発時のデバッグ情報
    INFO = 'INFO'        # 一般的な情報（開始/終了/成功）
    WARNING = 'WARNING'  # 警告（注意が必要だが継続可能）
    ERROR = 'ERROR'      # エラー（機能が失敗したが回復可能）
    CRITICAL = 'CRITICAL'  # 致命的エラー（システム停止レベル）

# 重要イベントタイプの定義
class EventType:
    """重要イベントタイプの定義"""
    # API関連
    API_REQUEST = 'api.request'
    API_RESPONSE = 'api.response'
    API_ERROR = 'api.error'
    
    # 認証・認可
    AUTH_SUCCESS = 'auth.success'
    AUTH_FAILURE = 'auth.failure'
    AUTH_UNAUTHORIZED = 'auth.unauthorized'
    
    # データ操作
    DATA_CREATE = 'data.create'
    DATA_READ = 'data.read'
    DATA_UPDATE = 'data.update'
    DATA_DELETE = 'data.delete'
    
    # システム
    SYSTEM_START = 'system.start'
    SYSTEM_STOP = 'system.stop'
    SYSTEM_ERROR = 'system.error'
    
    # パフォーマンス
    PERFORMANCE_SLOW = 'performance.slow'
    PERFORMANCE_TIMEOUT = 'performance.timeout'
    
    # セキュリティ
    SECURITY_BREACH = 'security.breach'
    SECURITY_SUSPICIOUS = 'security.suspicious'

