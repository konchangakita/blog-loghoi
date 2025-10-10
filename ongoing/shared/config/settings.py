import os

class Config:
    """LogHoi Application Configuration - 環境変数ベースの統一設定"""
    
    # ========================================
    # データベース設定
    # ========================================
    ELASTICSEARCH_URL = os.getenv('ELASTICSEARCH_URL', 'http://elasticsearch:9200')
    
    # ========================================
    # サーバー設定
    # ========================================
    BACKEND_HOST = os.getenv('BACKEND_HOST', '0.0.0.0')
    BACKEND_PORT = int(os.getenv('BACKEND_PORT', '7776'))
    FRONTEND_PORT = int(os.getenv('FRONTEND_PORT', '7777'))
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
    
    # ========================================
    # CORS設定
    # ========================================
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*').split(',')
    
    # ========================================
    # SSH設定
    # ========================================
    SSH_TIMEOUT = int(os.getenv('SSH_TIMEOUT', '30'))
    SSH_MAX_RETRIES = int(os.getenv('SSH_MAX_RETRIES', '5'))
    SSH_KEY_PATH = os.getenv('SSH_KEY_PATH', '/app/config/.ssh/ntnx-lockdown')
    
    # ========================================
    # ログ収集設定
    # ========================================
    OUTPUT_LOGDIR = os.getenv('OUTPUT_LOGDIR', '/app/output/log')
    OUTPUT_ZIPDIR = os.getenv('OUTPUT_ZIPDIR', '/app/output/zip')
    
    # ========================================
    # 設定ファイル
    # ========================================
    JSON_LOGFILE = os.getenv('JSON_LOGFILE', 'col_logfile.json')
    JSON_COMMAND = os.getenv('JSON_COMMAND', 'col_command.json')
