import os

class Config:
    """LogHoi Application Configuration"""
    
    # Elasticsearch Settings
    ELASTICSEARCH_URL = os.getenv('ELASTICSEARCH_URL', 'http://elasticsearch:9200')
    
    # Flask Settings  
    FLASK_HOST = os.getenv('FLASK_HOST', '0.0.0.0')
    FLASK_PORT = int(os.getenv('FLASK_PORT', '7776'))
    FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    # CORS Settings
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*')
    
    # Log Collection Settings
    OUTPUT_LOGDIR = os.getenv('OUTPUT_LOGDIR', '/usr/src/flaskr/output/log')
    OUTPUT_ZIPDIR = os.getenv('OUTPUT_ZIPDIR', '/usr/src/flaskr/output/zip')
    
    # Configuration Files
    JSON_LOGFILE = os.getenv('JSON_LOGFILE', 'col_logfile.json')
    JSON_COMMAND = os.getenv('JSON_COMMAND', 'col_command.json')
