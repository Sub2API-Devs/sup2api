#!/bin/bash
set -e

# CCGateway Worker 测试运行脚本

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."

    if ! command -v go &> /dev/null; then
        log_error "Go 未安装"
        exit 1
    fi

    log_info "Go 版本: $(go version)"
}

# 运行单元测试
run_unit_tests() {
    log_info "运行单元测试..."
    go test -v -race -coverprofile=coverage-unit.out ./internal/... ./pkg/... ./cmd/...

    if [ $? -eq 0 ]; then
        log_info "单元测试通过 ✓"
    else
        log_error "单元测试失败 ✗"
        exit 1
    fi
}

# 运行集成测试
run_integration_tests() {
    log_info "运行集成测试..."

    # 检查 Docker
    if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
        log_info "使用 Docker Compose 启动测试环境..."

        # 启动测试容器
        docker-compose -f test/integration/docker-compose.test.yml up -d

        # 等待服务就绪
        log_info "等待服务就绪..."
        sleep 10

        # 健康检查
        max_retries=30
        retry_count=0
        while [ $retry_count -lt $max_retries ]; do
            if curl -f http://localhost:8788/health &> /dev/null; then
                log_info "服务已就绪 ✓"
                break
            fi
            retry_count=$((retry_count + 1))
            echo -n "."
            sleep 1
        done
        echo ""

        if [ $retry_count -eq $max_retries ]; then
            log_error "服务启动超时"
            docker-compose -f test/integration/docker-compose.test.yml logs
            docker-compose -f test/integration/docker-compose.test.yml down
            exit 1
        fi

        # 运行集成测试
        TEST_WORKER_URL=http://localhost:8788 go test -tags=integration -v -coverprofile=coverage-integration.out ./test/integration/...
        test_result=$?

        # 清理
        log_info "清理测试环境..."
        docker-compose -f test/integration/docker-compose.test.yml down

        if [ $test_result -eq 0 ]; then
            log_info "集成测试通过 ✓"
        else
            log_error "集成测试失败 ✗"
            exit 1
        fi
    else
        log_warn "Docker 未安装，跳过集成测试"
        log_warn "请手动启动 Worker 服务并运行: go test -tags=integration ./test/integration/..."
    fi
}

# 生成覆盖率报告
generate_coverage() {
    log_info "生成覆盖率报告..."

    # 合并覆盖率文件
    if [ -f coverage-unit.out ] && [ -f coverage-integration.out ]; then
        log_info "合并单元测试和集成测试覆盖率..."
        echo "mode: set" > coverage-all.out
        grep -h -v "^mode:" coverage-unit.out coverage-integration.out >> coverage-all.out

        go tool cover -html=coverage-all.out -o coverage-all.html
        log_info "完整覆盖率报告: coverage-all.html"
    elif [ -f coverage-unit.out ]; then
        go tool cover -html=coverage-unit.out -o coverage-unit.html
        log_info "单元测试覆盖率报告: coverage-unit.html"
    fi

    # 显示覆盖率统计
    if [ -f coverage-all.out ]; then
        coverage=$(go tool cover -func=coverage-all.out | grep total | awk '{print $3}')
        log_info "总覆盖率: $coverage"
    fi
}

# 清理临时文件
cleanup() {
    log_info "清理临时文件..."
    rm -f coverage-unit.out coverage-integration.out coverage-all.out
}

# 主函数
main() {
    echo "========================================"
    echo "CCGateway Worker 测试套件"
    echo "========================================"
    echo ""

    # 解析参数
    RUN_UNIT=true
    RUN_INTEGRATION=true
    GENERATE_COVERAGE=true
    CLEANUP_AFTER=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --unit-only)
                RUN_INTEGRATION=false
                shift
                ;;
            --integration-only)
                RUN_UNIT=false
                shift
                ;;
            --no-coverage)
                GENERATE_COVERAGE=false
                shift
                ;;
            --cleanup)
                CLEANUP_AFTER=true
                shift
                ;;
            --help)
                echo "用法: $0 [选项]"
                echo ""
                echo "选项:"
                echo "  --unit-only         仅运行单元测试"
                echo "  --integration-only  仅运行集成测试"
                echo "  --no-coverage       不生成覆盖率报告"
                echo "  --cleanup           测试后清理覆盖率文件"
                echo "  --help              显示帮助"
                exit 0
                ;;
            *)
                log_error "未知选项: $1"
                exit 1
                ;;
        esac
    done

    # 检查依赖
    check_dependencies
    echo ""

    # 运行测试
    if [ "$RUN_UNIT" = true ]; then
        run_unit_tests
        echo ""
    fi

    if [ "$RUN_INTEGRATION" = true ]; then
        run_integration_tests
        echo ""
    fi

    # 生成覆盖率
    if [ "$GENERATE_COVERAGE" = true ]; then
        generate_coverage
        echo ""
    fi

    # 清理
    if [ "$CLEANUP_AFTER" = true ]; then
        cleanup
        echo ""
    fi

    echo "========================================"
    log_info "所有测试完成 ✓"
    echo "========================================"
}

# 捕获退出信号
trap 'log_error "测试中断"; docker-compose -f test/integration/docker-compose.test.yml down 2>/dev/null; exit 1' INT TERM

# 运行主函数
main "$@"
