# 集成测试

本目录包含 CCGateway Worker 的端到端集成测试。

## 概述

集成测试使用真实的 HTTP 客户端测试完整的请求流程，包括：

- 完整的 `/v1/messages` 请求处理
- 流式响应解析
- 会话历史匹配和缓存
- 错误处理场景
- 健康检查端点

## 运行测试

### 前置条件

1. 安装 Go 1.21+
2. 安装 Docker 和 Docker Compose（可选，用于容器化测试）

### 本地运行

```bash
# 从项目根目录运行
cd tools/ccgateway-worker

# 运行集成测试（需要 integration 标签）
go test -tags=integration -v ./test/integration/...

# 生成覆盖率报告
go test -tags=integration -v -coverprofile=coverage-integration.out ./test/integration/...
go tool cover -html=coverage-integration.out -o coverage-integration.html
```

### 使用 Docker Compose

```bash
# 启动测试环境
docker-compose -f test/integration/docker-compose.test.yml up -d

# 等待服务就绪
sleep 5

# 运行测试
go test -tags=integration -v ./test/integration/...

# 清理
docker-compose -f test/integration/docker-compose.test.yml down
```

### 使用 Make

```bash
# 运行所有测试（单元 + 集成）
make test-all

# 仅运行集成测试
make test-integration

# 生成完整覆盖率报告
make coverage-all
```

## 测试结构

```
test/integration/
├── README.md                    # 本文件
├── docker-compose.test.yml      # 测试容器配置
├── e2e_test.go                  # 端到端测试
└── fixtures/                    # 测试数据
    ├── request_simple.json      # 简单请求
    ├── request_with_system.json # 带 system 的请求
    └── expected_events.json     # 期望的事件序列
```

## 测试场景

### 基础功能测试

- **TestIntegration_HealthCheck**: 健康检查端点
- **TestIntegration_SimpleRequest**: 简单的用户消息请求
- **TestIntegration_RequestWithSystem**: 带系统提示的请求
- **TestIntegration_StreamingResponse**: 流式响应解析

### 会话管理测试

- **TestIntegration_SessionMatching**: 会话历史匹配
- **TestIntegration_SessionCaching**: 会话缓存行为
- **TestIntegration_SessionRebuild**: 快照重建模式

### 错误处理测试

- **TestIntegration_InvalidRequest**: 无效请求格式
- **TestIntegration_MissingRequiredFields**: 缺少必需字段
- **TestIntegration_Timeout**: 请求超时
- **TestIntegration_CLIError**: CLI 执行错误

### 并发测试

- **TestIntegration_ConcurrentRequests**: 并发请求处理
- **TestIntegration_RateLimiting**: 速率限制（如果实现）

## 环境变量

测试可以通过以下环境变量配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `TEST_WORKER_URL` | `http://localhost:8788` | Worker 服务地址 |
| `TEST_TIMEOUT` | `30s` | 测试超时时间 |
| `TEST_CLI_PATH` | `/usr/local/bin/claude` | Claude CLI 路径 |
| `TEST_SKIP_DOCKER` | `false` | 跳过 Docker 测试 |

示例：

```bash
TEST_WORKER_URL=http://localhost:9000 go test -tags=integration ./test/integration/...
```

## 故障排查

### 测试失败

1. **连接被拒绝**: 确认 Worker 服务已启动
   ```bash
   curl http://localhost:8788/health
   ```

2. **超时**: 增加 `TEST_TIMEOUT` 环境变量
   ```bash
   TEST_TIMEOUT=60s go test -tags=integration ./test/integration/...
   ```

3. **CLI 未找到**: 检查 `TEST_CLI_PATH` 或 Docker 镜像中的 CLI 安装

### Docker 问题

1. **容器启动失败**: 检查日志
   ```bash
   docker-compose -f test/integration/docker-compose.test.yml logs
   ```

2. **端口冲突**: 修改 `docker-compose.test.yml` 中的端口映射

3. **权限问题**: 确保 Docker 有访问挂载目录的权限

## 编写新测试

### 测试命名规范

```go
func TestIntegration_<Scenario>(t *testing.T) {
    // 测试代码
}
```

### 使用辅助函数

```go
// 创建测试客户端
client := newTestClient(t)

// 发送请求
resp := client.PostMessages(t, &types.Request{...})

// 断言响应
assertHealthy(t, resp)
assertEventType(t, event, "message_start")
```

### 清理资源

```go
func TestIntegration_Example(t *testing.T) {
    client := newTestClient(t)
    defer client.Close()
    
    // 测试代码
}
```

## CI/CD 集成

### GitHub Actions

```yaml
- name: Run integration tests
  run: |
    docker-compose -f test/integration/docker-compose.test.yml up -d
    sleep 5
    go test -tags=integration -v ./test/integration/...
  env:
    TEST_WORKER_URL: http://localhost:8788
```

### GitLab CI

```yaml
integration-test:
  stage: test
  services:
    - docker:dind
  script:
    - docker-compose -f test/integration/docker-compose.test.yml up -d
    - sleep 5
    - go test -tags=integration -v ./test/integration/...
```

## 性能测试

虽然主要是功能测试，但也包含基本的性能验证：

```go
func TestIntegration_Performance(t *testing.T) {
    if testing.Short() {
        t.Skip("跳过性能测试")
    }
    
    // 性能测试代码
}
```

运行：

```bash
go test -tags=integration ./test/integration/... -run Performance
```

跳过：

```bash
go test -tags=integration -short ./test/integration/...
```

## 许可证

与主项目相同。
