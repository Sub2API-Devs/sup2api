.PHONY: all build test test-integration test-all clean docker-build docker-push lint fmt vet coverage coverage-all

# 变量
BINARY_NAME=worker
DOCKER_IMAGE=ccgateway-worker
VERSION?=latest
GO=go
GOFLAGS=-v

# 默认目标
all: test build

# 构建
build:
	@echo "Building $(BINARY_NAME)..."
	$(GO) build $(GOFLAGS) -o bin/$(BINARY_NAME) ./cmd/worker

# 测试（单元测试）
test:
	@echo "Running unit tests..."
	$(GO) test -v -race -coverprofile=coverage.out ./internal/... ./pkg/... ./cmd/...

# 集成测试
test-integration:
	@echo "Running integration tests..."
	@bash scripts/run-tests.sh --integration-only

# 所有测试（单元 + 集成）
test-all:
	@echo "Running all tests..."
	@bash scripts/run-tests.sh

# 测试覆盖率（单元测试）
coverage: test
	@echo "Generating coverage report..."
	$(GO) tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report saved to coverage.html"

# 完整覆盖率（单元 + 集成）
coverage-all:
	@echo "Generating full coverage report..."
	@bash scripts/run-tests.sh

# 运行
run:
	@echo "Running $(BINARY_NAME)..."
	$(GO) run ./cmd/worker

# 清理
clean:
	@echo "Cleaning..."
	rm -rf bin/
	rm -f coverage.out coverage.html

# 格式化
fmt:
	@echo "Formatting code..."
	$(GO) fmt ./...

# 静态检查
vet:
	@echo "Running go vet..."
	$(GO) vet ./...

# Lint (需要安装 golangci-lint)
lint:
	@echo "Running golangci-lint..."
	@command -v golangci-lint >/dev/null 2>&1 || { echo "golangci-lint not installed"; exit 1; }
	golangci-lint run ./...

# Docker 构建
docker-build:
	@echo "Building Docker image..."
	docker build -f Dockerfile -t $(DOCKER_IMAGE):$(VERSION) ..

# Docker 推送
docker-push: docker-build
	@echo "Pushing Docker image..."
	docker push $(DOCKER_IMAGE):$(VERSION)

# 安装依赖
deps:
	@echo "Downloading dependencies..."
	$(GO) mod download
	$(GO) mod tidy

# 代码检查（格式化 + vet + 测试）
check: fmt vet test

# 帮助
help:
	@echo "Available targets:"
	@echo "  all             - Run tests and build (default)"
	@echo "  build           - Build the binary"
	@echo "  test            - Run unit tests"
	@echo "  test-integration - Run integration tests"
	@echo "  test-all        - Run all tests (unit + integration)"
	@echo "  coverage        - Generate unit test coverage report"
	@echo "  coverage-all    - Generate full coverage report"
	@echo "  run             - Run the application"
	@echo "  clean           - Clean build artifacts"
	@echo "  fmt             - Format code"
	@echo "  vet             - Run go vet"
	@echo "  lint            - Run golangci-lint"
	@echo "  docker-build    - Build Docker image"
	@echo "  docker-push     - Push Docker image"
	@echo "  deps            - Download dependencies"
	@echo "  check           - Run fmt + vet + test"
	@echo "  help            - Show this help message"
