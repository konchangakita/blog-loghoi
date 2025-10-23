#!/bin/bash
# テスト実行自動化スクリプト
# Usage: ./scripts/run-tests.sh [options]

set -e

# 色付きの出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ヘルプ表示
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -b, --backend          バックエンドテストのみ実行"
    echo "  -f, --frontend         フロントエンドテストのみ実行"
    echo "  -a, --all              すべてのテストを実行（デフォルト）"
    echo "  -c, --coverage         カバレッジレポートを生成"
    echo "  -v, --verbose          詳細出力"
    echo "  -h, --help             このヘルプを表示"
    echo ""
    echo "Examples:"
    echo "  $0                     # すべてのテストを実行"
    echo "  $0 -b -c               # バックエンドテストとカバレッジを実行"
    echo "  $0 -f -v               # フロントエンドテストを詳細出力で実行"
}

# 引数解析
BACKEND_ONLY=false
FRONTEND_ONLY=false
COVERAGE=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--backend)
            BACKEND_ONLY=true
            shift
            ;;
        -f|--frontend)
            FRONTEND_ONLY=true
            shift
            ;;
        -a|--all)
            BACKEND_ONLY=false
            FRONTEND_ONLY=false
            shift
            ;;
        -c|--coverage)
            COVERAGE=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# 競合するオプションのチェック
if [ "$BACKEND_ONLY" = true ] && [ "$FRONTEND_ONLY" = true ]; then
    echo -e "${RED}Error: --backend と --frontend は同時に指定できません${NC}"
    exit 1
fi

echo -e "${BLUE}=== テスト実行開始 ===${NC}"
echo ""

# テスト結果の集計
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# バックエンドテスト実行
run_backend_tests() {
    echo -e "${YELLOW}=== バックエンドテスト実行 ===${NC}"
    
    if [ ! -d "ongoing/backend" ]; then
        echo -e "${YELLOW}バックエンドディレクトリが見つかりません。スキップします。${NC}"
        return 0
    fi
    
    cd ongoing/backend
    
    # 依存関係の確認
    if [ ! -f "requirements.txt" ]; then
        echo -e "${YELLOW}requirements.txtが見つかりません。スキップします。${NC}"
        cd ../..
        return 0
    fi
    
    # 仮想環境の確認・作成
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}仮想環境を作成中...${NC}"
        python3 -m venv venv
    fi
    
    # 仮想環境のアクティベート
    source venv/bin/activate
    
    # 依存関係のインストール
    echo -e "${YELLOW}依存関係をインストール中...${NC}"
    pip install -q -r requirements.txt
    
    # テストファイルの確認
    if [ ! -d "tests" ]; then
        echo -e "${YELLOW}testsディレクトリが見つかりません。スキップします。${NC}"
        deactivate
        cd ../..
        return 0
    fi
    
    # pytestの実行
    echo -e "${YELLOW}pytestを実行中...${NC}"
    
    if [ "$COVERAGE" = true ]; then
        # カバレッジ付きでテスト実行
        if [ "$VERBOSE" = true ]; then
            pytest tests/ -v --cov=./ --cov-report=html --cov-report=term
        else
            pytest tests/ --cov=./ --cov-report=html --cov-report=term
        fi
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ バックエンドテスト（カバレッジ付き）完了${NC}"
            echo -e "${BLUE}カバレッジレポート: ongoing/backend/htmlcov/index.html${NC}"
        else
            echo -e "${RED}❌ バックエンドテスト（カバレッジ付き）失敗${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        # 通常のテスト実行
        if [ "$VERBOSE" = true ]; then
            pytest tests/ -v
        else
            pytest tests/
        fi
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ バックエンドテスト完了${NC}"
        else
            echo -e "${RED}❌ バックエンドテスト失敗${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    fi
    
    PASSED_TESTS=$((PASSED_TESTS + 1))
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    deactivate
    cd ../..
}

# フロントエンドテスト実行
run_frontend_tests() {
    echo -e "${YELLOW}=== フロントエンドテスト実行 ===${NC}"
    
    if [ ! -d "ongoing/frontend/next-app" ]; then
        echo -e "${YELLOW}フロントエンドディレクトリが見つかりません。スキップします。${NC}"
        return 0
    fi
    
    cd ongoing/frontend/next-app
    
    # package.jsonの確認
    if [ ! -f "package.json" ]; then
        echo -e "${YELLOW}package.jsonが見つかりません。スキップします。${NC}"
        cd ../../..
        return 0
    fi
    
    # node_modulesの確認・インストール
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}依存関係をインストール中...${NC}"
        npm install
    fi
    
    # テストスクリプトの確認
    if ! grep -q '"test"' package.json; then
        echo -e "${YELLOW}package.jsonにtestスクリプトがありません。スキップします。${NC}"
        cd ../../..
        return 0
    fi
    
    # テスト実行
    echo -e "${YELLOW}npm testを実行中...${NC}"
    
    if [ "$VERBOSE" = true ]; then
        npm test -- --verbose
    else
        npm test
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ フロントエンドテスト完了${NC}"
    else
        echo -e "${RED}❌ フロントエンドテスト失敗${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    PASSED_TESTS=$((PASSED_TESTS + 1))
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    cd ../../..
}

# テスト実行
if [ "$FRONTEND_ONLY" = true ]; then
    run_frontend_tests
elif [ "$BACKEND_ONLY" = true ]; then
    run_backend_tests
else
    # デフォルト: すべてのテストを実行
    run_backend_tests
    echo ""
    run_frontend_tests
fi

# 結果サマリー
echo ""
echo -e "${BLUE}=== テスト結果サマリー ===${NC}"
echo -e "総テスト数: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "成功: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失敗: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 すべてのテストが成功しました！${NC}"
    exit 0
else
    echo -e "${RED}❌ $FAILED_TESTS 個のテストが失敗しました${NC}"
    exit 1
fi
