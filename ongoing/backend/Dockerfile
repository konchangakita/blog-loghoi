# 本番用Dockerfile for Backend
FROM python:3.11.4-slim

# 必要なパッケージのインストール
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
    curl \
    ssh-client \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# アプリケーションディレクトリの作成
WORKDIR /app

# 依存関係のインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -U pip && \
    pip install --no-cache-dir -r requirements.txt

# アプリケーションコードのコピー
COPY fastapi_app ./fastapi_app

# アップロードディレクトリとログディレクトリの作成
RUN mkdir -p /app/uploads /app/logs

# 非rootユーザーの作成
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# ポート公開
EXPOSE 7776

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:7776/health || exit 1

# アプリケーション起動
CMD ["python", "-m", "uvicorn", "fastapi_app.app_fastapi:app", "--host", "0.0.0.0", "--port", "7776"]

