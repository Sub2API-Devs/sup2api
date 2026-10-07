> 已作废的历史材料（2026-10-07）：本文的完成度、覆盖率、架构和验收结论不可用。当前修复与验证范围见 tools/ccgateway-worker/README.md。

# CCGateway Worker 测试策略

## 测试金字塔

```
        /\
       /  \  E2E (集成测试)
      /----\
     /      \  集成测试 (Integration)
    /--------\
   /          \  单元测试 (Unit)
  /-----------\
```

### 测试层次

1. **单元测试** (70%): 测试单个函数和方法
2. **集成测试** (25%): 测试组件交互和完整流程
3. **E2E 测试** (5%): 测试完整的用户场景

## 单元测试策略

### 覆盖范围

每个模块都应有对应的 `*_test.go` 文件:

- `internal/worker/worker_test.go`: Worker 核心逻辑
- `internal/history/store_test.go`: 会话存储和匹配
- `internal/cli/manager_test.go`: CLI 进程管理
- `internal/config/config_test.go`: 配置解析
- `pkg/types/types_test.go`: 类型定义（如需要）

### 测试原则

1. **独立性**: 每个测试独立运行，不依赖其他测试
2. **可重复**: 多次运行结果一致
3. **快速**: 单元测试应在秒级完成
4. **清晰**: 测试名称说明测试内容

### Mock 策略

使用 `testify/mock` 模拟外部依赖:

```go
// MockHistoryStore 模拟历史存储
type MockHistoryStore struct {
    mock.Mock
}

func (m *MockHistoryStore) Match(ctx context.Context, messages []types.Message) (*types.Session, error) {
    args := m.Called(ctx, messages)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*types.Session), args.Error(1)
}
```

### 测试数据

使用 `t.TempDir()` 创建临时目录:

```go
func TestExample(t *testing.T) {
    tmpDir := t.TempDir()
    // tmpDir 在测试结束后自动清理
}
```

## 集成测试策略

### 测试场景

#### 基础功能
- 健康检查端点正确响应
- 简单请求的完整流程
- 流式响应正确解析

#### 会话管理
- 历史匹配逻辑
- 会话缓存行为
- 快照重建模式

#### 错误处理
- 无效请求格式
- 缺少必需字段
- 超时场景
- CLI 执行错误

#### 并发场景
- 多请求并发处理
- 资源竞争检测 (`-race`)

### 测试隔离

每个集成测试使用独立的:
- 会话 ID
- 临时目录
- 独立的上下文

### 测试环境

使用 Docker Compose 提供一致的测试环境:

```yaml
services:
  worker-test:
    environment:
      WORKER_ID: test-worker-1
      LOG_LEVEL: debug
    volumes:
      - test-sessions:/root/.claude/sessions
      - test-cache:/var/lib/worker/cache
```

## 测试工具

### 使用的库

- **testing**: Go 标准库
- **testify/assert**: 断言库
- **testify/require**: 必需断言
- **testify/mock**: Mock 框架

### 辅助函数

```go
// newTestClient 创建测试客户端
func newTestClient(t *testing.T) *testClient {
    // ...
}

// assertEventType 断言事件类型
func assertEventType(t *testing.T, event types.Event, expectedType string) {
    assert.Equal(t, expectedType, event.Type)
}
```

## 测试数据

### Fixtures

存储在 `test/integration/fixtures/`:

- `request_simple.json`: 简单请求示例
- `request_with_system.json`: 带系统提示的请求
- `expected_events.json`: 期望的事件序列

### 使用方式

```go
func loadFixture(t *testing.T, filename string) []byte {
    data, err := os.ReadFile(filepath.Join("fixtures", filename))
    require.NoError(t, err)
    return data
}
```

## 持续集成

### 测试流程

```bash
# 1. 代码格式检查
make fmt
make vet

# 2. 单元测试
make test

# 3. 集成测试
make test-integration

# 4. 生成覆盖率报告
make coverage-all
```

### CI 配置示例

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Unit tests
        run: make test
      
      - name: Integration tests
        run: make test-integration
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage-all.out
```

## 覆盖率目标

### 模块目标

| 模块 | 目标 | 优先级 |
|------|-----|--------|
| `internal/worker` | ≥80% | 高 |
| `internal/history` | ≥80% | 高 |
| `internal/cli` | ≥70% | 中 |
| `internal/server` | ≥75% | 中 |
| `pkg/types` | ≥90% | 低 |

### 未覆盖代码的处理

对于难以测试的代码（如系统调用、网络 I/O），使用接口抽象:

```go
// FileSystem 文件系统接口
type FileSystem interface {
    ReadFile(path string) ([]byte, error)
    WriteFile(path string, data []byte) error
}

// 测试时使用 mock 实现
type MockFileSystem struct {
    mock.Mock
}
```

## 性能测试

### Benchmark

```go
func BenchmarkWorker_Execute(b *testing.B) {
    // 准备
    worker := setupWorker()
    req := &types.Request{...}
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        worker.Execute(context.Background(), req)
    }
}
```

运行:
```bash
go test -bench=. -benchmem ./...
```

### 压力测试

使用 `testing.Short()` 标记:

```go
func TestIntegration_Stress(t *testing.T) {
    if testing.Short() {
        t.Skip("跳过压力测试")
    }
    // 压力测试代码
}
```

跳过压力测试:
```bash
go test -short ./...
```

## 测试最佳实践

### 1. 测试命名

```go
// 好
func TestWorker_Execute_ReturnsErrorWhenCLIFails(t *testing.T) {}

// 不好
func TestExecute(t *testing.T) {}
```

### 2. 表格驱动测试

```go
func TestBuildCLIArgs(t *testing.T) {
    tests := []struct {
        name    string
        req     *types.Request
        session *types.Session
        want    []string
    }{
        {
            name: "prefix-hit mode",
            req:  &types.Request{...},
            want: []string{...},
        },
        // 更多测试案例
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := buildCLIArgs(tt.req, tt.session)
            assert.Equal(t, tt.want, got)
        })
    }
}
```

### 3. 清理资源

```go
func TestExample(t *testing.T) {
    client := newTestClient(t)
    defer client.Close()  // 确保清理
    
    // 测试代码
}
```

### 4. 上下文超时

```go
func TestExample(t *testing.T) {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    
    // 使用带超时的上下文
}
```

### 5. 并发安全

使用 `-race` 检测数据竞争:

```bash
go test -race ./...
```

## 调试测试

### 详细输出

```bash
go test -v ./...
```

### 运行单个测试

```bash
go test -run TestIntegration_HealthCheck ./test/integration/...
```

### 调试模式

```bash
# 禁用测试超时（用于调试）
go test -timeout 0 ./...
```

## 测试文档

每个测试文件开头应有包级文档:

```go
// Package integration 包含 CCGateway Worker 的端到端集成测试。
//
// 测试使用真实的 HTTP 客户端和 Docker 容器，验证完整的请求流程。
// 
// 运行测试前需要启动测试环境:
//   docker-compose -f test/integration/docker-compose.test.yml up -d
//
// 运行测试:
//   go test -tags=integration -v ./test/integration/...
package integration
```

## 总结

良好的测试策略确保:

1. **质量保证**: 捕获回归错误
2. **文档作用**: 测试即文档
3. **重构信心**: 安全重构代码
4. **快速反馈**: 及早发现问题
5. **团队协作**: 统一的测试标准
