"""
Kubernetes環境用の設定管理
"""
import os
from typing import Optional
from pydantic import BaseSettings, Field


class K8sConfig(BaseSettings):
    """Kubernetes環境用の設定クラス"""
    
    # アプリケーション設定
    app_name: str = Field(default="LogHoi", env="APP_NAME")
    app_version: str = Field(default="v1.0.0", env="APP_VERSION")
    debug: bool = Field(default=False, env="DEBUG")
    
    # サーバー設定
    backend_host: str = Field(default="0.0.0.0", env="BACKEND_HOST")
    backend_port: int = Field(default=7776, env="BACKEND_PORT")
    
    # データベース設定
    elasticsearch_url: str = Field(default="http://elasticsearch:9200", env="ELASTICSEARCH_URL")
    elasticsearch_index_prefix: str = Field(default="loghoi", env="ELASTICSEARCH_INDEX_PREFIX")
    
    # ログ設定
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_format: str = Field(default="json", env="LOG_FORMAT")
    
    # セキュリティ設定
    cors_origins: str = Field(default="*", env="CORS_ORIGINS")
    cors_credentials: bool = Field(default=True, env="CORS_CREDENTIALS")
    
    # パフォーマンス設定
    max_connections: int = Field(default=100, env="MAX_CONNECTIONS")
    timeout: int = Field(default=30, env="TIMEOUT")
    
    # ファイル設定
    max_file_size: str = Field(default="100MB", env="MAX_FILE_SIZE")
    upload_dir: str = Field(default="/app/uploads", env="UPLOAD_DIR")
    log_dir: str = Field(default="/app/logs", env="LOG_DIR")
    
    # Kubernetes固有設定
    namespace: Optional[str] = Field(default=None, env="NAMESPACE")
    pod_name: Optional[str] = Field(default=None, env="POD_NAME")
    pod_ip: Optional[str] = Field(default=None, env="POD_IP")
    
    # シークレット設定（環境変数から読み込み）
    db_password: Optional[str] = Field(default=None, env="DB_PASSWORD")
    api_key: Optional[str] = Field(default=None, env="API_KEY")
    jwt_secret: Optional[str] = Field(default=None, env="JWT_SECRET")
    ssh_private_key: Optional[str] = Field(default=None, env="SSH_PRIVATE_KEY")
    encryption_key: Optional[str] = Field(default=None, env="ENCRYPTION_KEY")
    
    class Config:
        env_file = ".env"
        case_sensitive = False
    
    def get_cors_origins_list(self) -> list[str]:
        """CORS originsをリスト形式で取得"""
        if self.cors_origins == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    def get_max_file_size_bytes(self) -> int:
        """最大ファイルサイズをバイト単位で取得"""
        size_str = self.max_file_size.upper()
        if size_str.endswith("MB"):
            return int(size_str[:-2]) * 1024 * 1024
        elif size_str.endswith("GB"):
            return int(size_str[:-2]) * 1024 * 1024 * 1024
        elif size_str.endswith("KB"):
            return int(size_str[:-2]) * 1024
        else:
            return int(size_str)
    
    def is_development(self) -> bool:
        """開発環境かどうかを判定"""
        return self.debug or self.namespace == "loghoi-dev"
    
    def is_production(self) -> bool:
        """本番環境かどうかを判定"""
        return not self.debug and self.namespace == "loghoi"
    
    def get_ssh_key_path(self) -> str:
        """SSH秘密鍵のパスを取得"""
        return "/app/config/.ssh/ntnx-lockdown"


# グローバル設定インスタンス
k8s_config = K8sConfig()
