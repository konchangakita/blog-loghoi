# LogHoi Development Makefile

.PHONY: help test test-unit test-integration coverage lint format clean

help: ## このヘルプを表示
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# テスト関連
test: ## 全テスト実行
	cd tests && python -m pytest

test-unit: ## 単体テストのみ実行
	cd tests && python -m pytest -m unit

test-integration: ## 統合テストのみ実行  
	cd tests && python -m pytest -m integration

test-watch: ## テストをwatch モードで実行
	cd tests && python -m pytest -f

coverage: ## カバレッジレポート生成
	cd tests && python -m pytest --cov=../shared --cov=../backend/flaskr --cov-report=html

# コード品質
lint: ## コードリント実行
	flake8 shared/ backend/flaskr/ tests/
	pylint shared/ backend/flaskr/

format: ## コードフォーマット実行
	black shared/ backend/flaskr/ tests/
	isort shared/ backend/flaskr/ tests/

# 開発環境
install-dev: ## 開発用依存関係インストール
	pip install -r backend/requirements.txt
	pip install -r tests/test_requirements.txt

# Docker関連
docker-build: ## リファクタリング版Docker ビルド
	docker-compose -f docker-compose_refactored.yml build

docker-up: ## リファクタリング版Docker 起動
	docker-compose -f docker-compose_refactored.yml up -d

docker-down: ## Docker 停止
	docker-compose -f docker-compose_refactored.yml down

docker-logs: ## Docker ログ表示
	docker-compose -f docker-compose_refactored.yml logs -f

# クリーンアップ
clean: ## 一時ファイル削除
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	rm -rf tests/coverage_html
	rm -f .coverage

# TDD ワークフロー
tdd: ## TDD サイクル実行 (Red-Green-Refactor)
	@echo "🔴 Red: テスト作成・失敗確認"
	@make test-unit || true
	@echo "🟢 Green: 最小実装でテスト通過"
	@echo "🔵 Refactor: コード改善"
	@make test-unit
