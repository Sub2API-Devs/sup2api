> 已作废的历史材料（2026-10-07）：本文的完成度、覆盖率、架构和验收结论不可用。当前修复与验证范围见 tools/ccgateway-worker/README.md。

# 贡献指南

欢迎为 CCGateway Worker 项目做出贡献！本文档提供开发指南和代码规范。

---

## 📋 目录

- [开发环境](#开发环境)
- [代码规范](#代码规范)
- [测试要求](#测试要求)
- [提交流程](#提交流程)
- [代码审查](#代码审查)

---

## 🛠️ 开发环境

### 必需工具

```bash
# Go 1.21+
go version

# Docker 和 Docker Compose
docker --version
docker compose version

# Make
make --version
```

### 初始化项目

```bash
# 克隆代码
cd tools/ccgateway-worker

# 安装依赖
go mod download

# 运行测试
make test

# 构建
make build
```

---

## 📐 代码规范

### 五大原则

#### 1. 抽象（Interface-First）

**优先定义接口，后实现具体类型**

```go
// ✅ 好的做法
type Store interface {
    Match(ctx context.Context, messages []Message) (*Session, error)
    Save(ctx context.Context, session *Session) error
}

type fileStore struct {
    dir string
}

func (f *fileStore) Match(ctx context.Context, messages []Message) (*Session, error) {
    // 实现
}

// ❌ 避免的做法
type FileStore struct {
    Dir string
}

func (f *FileStore) Match(ctx context.Context, messages []Message) (*Session, error) {
    // 直接实现，难以替换
}
```

#### 2. 复用（DRY - Don't Repeat Yourself）

**提取重复逻辑为函数**

```go
// ✅ 好的做法
func getEnv(key, defaultValue string) string {
    if v := os.Getenv(key); v != "" {
        return v
    }
    return defaultValue
}

port := getEnv("PORT", "8080")
host := getEnv("HOST", "0.0.0.0")

// ❌ 避免的做法
port := os.Getenv("PORT")
if port == "" {
    port = "8080"
}

host := os.Getenv("HOST")
if host == "" {
    host = "0.0.0.0"
}
```

#### 3. 解耦（Dependency Injection）

**通过构造函数注入依赖**

```go
// ✅ 好的做法
type Worker struct {
    store  Store      // 接口依赖
    client Client     // 接口依赖
}

func NewWorker(store Store, client Client) *Worker {
    return &Worker{
        store:  store,
        client: client,
    }
}

// ❌ 避免的做法
type Worker struct {
    store *FileStore  // 具体类型
}

func NewWorker() *Worker {
    return &Worker{
        store: &FileStore{},  // 硬编码依赖
    }
}
```

#### 4. 低嵌套（Early Return）

**使用 early return，保持嵌套深度 ≤ 2**

```go
// ✅ 好的做法（嵌套深度 1）
func Process(data string) error {
    if data == "" {
        return ErrEmptyData
    }
    
    result, err := parse(data)
    if err != nil {
        return fmt.Errorf("parse: %w", err)
    }
    
    if err := save(result); err != nil {
        return fmt.Errorf("save: %w", err)
    }
    
    return nil
}

// ❌ 避免的做法（嵌套深度 4）
func Process(data string) error {
    if data != "" {
        result, err := parse(data)
        if err == nil {
            if result.Valid {
                if err := save(result); err != nil {
                    return err
                } else {
                    return nil
                }
            }
        } else {
            return err
        }
    }
    return ErrEmptyData
}
```

#### 5. 简洁（YAGNI - You Aren't Gonna Need It）

**只实现当前需要的功能，避免过度设计**

```go
// ✅ 好的做法
type Config struct {
    Port int
    Host string
}

// ❌ 避免的做法（过度抽象）
type ConfigProvider interface {
    GetConfig() Config
}

type ConfigFactory interface {
    CreateProvider() ConfigProvider
}

type ConfigBuilder interface {
    Build() ConfigFactory
}
```

---

## 🧪 测试要求

### 测试覆盖率

- **目标**: 总覆盖率 > 80%
- **核心模块**: 覆盖率 > 85%
- **工具函数**: 覆盖率 > 90%

### 测试类型

#### 1. 单元测试

**命名规范**: `TestFunctionName_Scenario`

```go
func TestComputeFingerprint_EmptyMessages(t *testing.T) {
    messages := []Message{}
    result := computeFingerprint(messages)
    assert.NotEmpty(t, result)
}

func TestComputeFingerprint_SameMessages_ReturnsSameHash(t *testing.T) {
    messages := []Message{
        {Role: "user", Content: json.RawMessage(`"hello"`)},
    }
    
    hash1 := computeFingerprint(messages)
    hash2 := computeFingerprint(messages)
    
    assert.Equal(t, hash1, hash2)
}
```

#### 2. 表驱动测试

**适用场景**: 多个输入输出组合

```go
func TestValidate(t *testing.T) {
    tests := []struct {
        name    string
        input   Config
        wantErr bool
    }{
        {
            name:    "valid config",
            input:   Config{Port: 8080, Host: "localhost"},
            wantErr: false,
        },
        {
            name:    "invalid port",
            input:   Config{Port: -1, Host: "localhost"},
            wantErr: true,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := tt.input.Validate()
            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

#### 3. Mock 测试

**使用接口 Mock 外部依赖**

```go
type mockStore struct {
    matchFunc func(context.Context, []Message) (*Session, error)
}

func (m *mockStore) Match(ctx context.Context, messages []Message) (*Session, error) {
    return m.matchFunc(ctx, messages)
}

func TestWorker_Execute_MatchHistory(t *testing.T) {
    store := &mockStore{
        matchFunc: func(ctx context.Context, messages []Message) (*Session, error) {
            return &Session{ID: "test-session"}, nil
        },
    }
    
    worker := NewWorker(store)
    // 测试逻辑
}
```

### 运行测试

```bash
# 运行所有单元测试
make test

# 运行特定包的测试
go test ./internal/history/...

# 运行特定测试
go test -run TestComputeFingerprint ./internal/history/...

# 生成覆盖率报告
make coverage

# 运行集成测试
make test-integration
```

---

## 📝 提交流程

### Commit 消息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**:
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具链

**示例**:
```
feat(worker): add history matching support

- Implement fingerprint-based session matching
- Add index persistence for fast lookup
- Support both prefix-hit and rebuild modes

Closes #123
```

### Pull Request 流程

1. **创建分支**
   ```bash
   git checkout -b feat/add-history-matching
   ```

2. **开发和测试**
   ```bash
   # 编写代码
   # 运行测试
   make test
   
   # 代码格式化
   go fmt ./...
   
   # 静态检查
   golangci-lint run
   ```

3. **提交代码**
   ```bash
   git add .
   git commit -m "feat(worker): add history matching"
   git push origin feat/add-history-matching
   ```

4. **创建 PR**
   - 填写 PR 模板
   - 关联相关 Issue
   - 请求代码审查

---

## 👁️ 代码审查

### 审查清单

提交 PR 前，请自查以下项目：

#### ✅ 代码质量

- [ ] 遵守五大原则（抽象、复用、解耦、低嵌套、简洁）
- [ ] 函数复杂度 < 15
- [ ] 嵌套深度 ≤ 2
- [ ] 函数长度 < 50 行
- [ ] 无重复代码

#### ✅ 测试

- [ ] 新增代码有单元测试
- [ ] 测试覆盖率 > 80%
- [ ] 所有测试通过
- [ ] 无竞态条件（`go test -race`）

#### ✅ 文档

- [ ] 公共接口有文档注释
- [ ] 复杂逻辑有行内注释
- [ ] README 已更新（如需要）

#### ✅ 安全

- [ ] 无硬编码凭证
- [ ] 输入验证完整
- [ ] 错误处理正确
- [ ] 并发安全

#### ✅ 性能

- [ ] 无不必要的内存分配
- [ ] 使用适当的数据结构
- [ ] I/O 操作异步处理

### 审查工具

```bash
# 代码格式检查
gofmt -l .

# 静态分析
golangci-lint run

# 竞态检测
go test -race ./...

# 覆盖率检查
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

---

## 🐛 故障排查

### 常见问题

#### 1. 测试失败

```bash
# 查看详细错误
go test -v ./...

# 运行单个测试
go test -v -run TestSpecificName ./internal/package/
```

#### 2. 依赖问题

```bash
# 清理模块缓存
go clean -modcache

# 重新下载依赖
go mod download

# 整理依赖
go mod tidy
```

#### 3. 构建失败

```bash
# 清理构建缓存
go clean -cache

# 重新构建
make clean build
```

---

## 📚 参考资源

- [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)
- [Effective Go](https://go.dev/doc/effective_go)
- [Go Proverbs](https://go-proverbs.github.io/)
- [项目代码规范](../next/docs/ccgateway-migration/11-CODE-CLEANUP.md)

---

## 📧 联系方式

如有问题，请通过以下方式联系：

- 创建 Issue
- 在 PR 中评论
- 联系项目维护者

---

**感谢您的贡献！** 🎉
