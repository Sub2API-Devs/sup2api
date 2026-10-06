# CCGateway 代码清理和重构计划

**最后更新：** 2026-10-07  
**负责人：** [待分配]  
**原则：** 不留技术债务，不留狗屎代码

---

## 清理原则

### 核心理念

**"迁移不是搬运，是重生"**

- ❌ **不要**：复制粘贴旧代码 + 小修小补
- ✅ **要做**：理解需求 → 重新设计 → 干净实现

**"宁可推倒重写，不要修修补补"**

- 旧代码的技术债务到此为止
- 新代码从第一天起就是可维护的

---

## 代码规范

### 1. 抽象原则

#### 1.1 识别通用模式

**❌ 反例：重复逻辑**
```go
// worker/auth.go
func AuthorizeWorker101() error {
    token := os.Getenv("CC_TOKEN_101")
    cmd := exec.Command("claude", "auth", "login", "--token", token)
    return cmd.Run()
}

func AuthorizeWorker102() error {
    token := os.Getenv("CC_TOKEN_102")
    cmd := exec.Command("claude", "auth", "login", "--token", token)
    return cmd.Run()
}
```

**✅ 正例：抽象通用逻辑**
```go
// worker/auth.go
type AuthManager struct {
    cliPath string
}

func (a *AuthManager) Authorize(ctx context.Context, token string) error {
    cmd := exec.CommandContext(ctx, a.cliPath, "auth", "login", "--token", token)
    return cmd.Run()
}
```

#### 1.2 定义清晰的接口

**❌ 反例：功能写死在实现里**
```go
// 直接操作文件
func SaveHistory(data []byte) error {
    return os.WriteFile("/root/.claude/sessions/history.jsonl", data, 0600)
}
```

**✅ 正例：抽象存储接口**
```go
// worker/history/store.go
type HistoryStore interface {
    Save(ctx context.Context, sessionID string, data []byte) error
    Load(ctx context.Context, sessionID string) ([]byte, error)
    Delete(ctx context.Context, sessionID string) error
}

// 文件系统实现
type FileStore struct {
    baseDir string
}

func (f *FileStore) Save(ctx context.Context, sessionID string, data []byte) error {
    path := filepath.Join(f.baseDir, sessionID+".jsonl")
    return os.WriteFile(path, data, 0600)
}

// 测试时可以用内存实现
type MemoryStore struct {
    data map[string][]byte
}
```

#### 1.3 分层架构

```
plugins/ccgateway/
├── plugin.go           # 插件入口（薄层，只做注册和路由）
├── internal/
│   ├── router/         # 路由逻辑（account_id → worker_url）
│   │   ├── router.go
│   │   └── cache.go
│   ├── client/         # HTTP 客户端（转发请求）
│   │   ├── client.go
│   │   └── streaming.go
│   └── config/         # 配置管理
│       └── config.go
└── plugin_test.go

tools/ccgateway/worker/
├── main.go             # 入口（薄层，只启动服务）
├── server/             # HTTP 服务器
│   ├── server.go
│   ├── handler.go
│   └── middleware.go
├── runner/             # Claude Code 执行器
│   ├── runner.go
│   ├── protocol.go     # stream-json 协议
│   └── env.go          # 环境变量构建
├── history/            # 会话历史管理
│   ├── store.go
│   ├── fingerprint.go
│   └── checkpoint.go
└── mod/                # Mod 桥接
    ├── bridge.go
    └── callback.go
```

---

### 2. 复用原则

#### 2.1 提取公共工具

**创建共享包：**
```go
// tools/ccgateway/pkg/claude/
package claude

// CLI 命令构建器（复用）
type CommandBuilder struct {
    cliPath    string
    maxTokens  int
    model      string
    systemText string
}

func (b *CommandBuilder) Build() []string {
    args := []string{"agent", "exec", "--stream-json"}
    if b.maxTokens > 0 {
        args = append(args, "--max-tokens", strconv.Itoa(b.maxTokens))
    }
    if b.model != "" {
        args = append(args, "--model", b.model)
    }
    // ... 避免在多处重复构建逻辑
    return args
}
```

```go
// tools/ccgateway/pkg/protocol/
package protocol

// stream-json 协议解析器（复用）
type StreamJSONParser struct {
    scanner *bufio.Scanner
}

func (p *StreamJSONParser) Next() (Frame, error) {
    // 统一的协议解析逻辑
}
```

#### 2.2 避免重复

**使用代码生成：**
```go
//go:generate go run gen.go

// gen.go
// 为每个 Worker 生成 docker-compose 配置（而不是手写 N 份）
```

**使用泛型（Go 1.18+）：**
```go
// pkg/cache/cache.go
type Cache[K comparable, V any] struct {
    mu    sync.RWMutex
    data  map[K]V
    ttl   time.Duration
}

func (c *Cache[K, V]) Get(key K) (V, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    v, ok := c.data[key]
    return v, ok
}

// 使用
var workerCache = cache.New[int64, string](5 * time.Minute)
```

---

### 3. 解耦原则

#### 3.1 依赖注入

**❌ 反例：硬编码依赖**
```go
type Worker struct {
    // 内部创建依赖
}

func (w *Worker) Start() {
    db := sql.Open("postgres", "hardcoded-dsn") // 耦合
    store := &FileStore{db: db}                  // 耦合
    // ...
}
```

**✅ 正例：注入依赖**
```go
type Worker struct {
    historyStore history.Store  // 接口
    authManager  *auth.Manager  // 可配置
    httpClient   *http.Client   // 可替换
}

func NewWorker(
    store history.Store,
    auth *auth.Manager,
    client *http.Client,
) *Worker {
    return &Worker{
        historyStore: store,
        authManager:  auth,
        httpClient:   client,
    }
}

// 测试时可以注入 mock
func TestWorker(t *testing.T) {
    worker := NewWorker(
        &MockStore{},
        &MockAuth{},
        &http.Client{Timeout: 1 * time.Second},
    )
}
```

#### 3.2 接口隔离

**❌ 反例：胖接口**
```go
type HistoryManager interface {
    Save(data []byte) error
    Load() ([]byte, error)
    Delete() error
    Compress() error
    Backup() error
    Restore() error
    Migrate() error
    // ... 20 个方法
}
```

**✅ 正例：小接口组合**
```go
// 核心接口
type HistoryStore interface {
    Save(ctx context.Context, sessionID string, data []byte) error
    Load(ctx context.Context, sessionID string) ([]byte, error)
}

// 可选功能：独立接口
type HistoryCompressor interface {
    Compress(ctx context.Context, sessionID string) error
}

type HistoryBackuper interface {
    Backup(ctx context.Context, sessionID string, dst io.Writer) error
}

// 使用时按需组合
type Worker struct {
    store HistoryStore  // 必需
    compressor HistoryCompressor  // 可选，可以为 nil
}
```

#### 3.3 事件解耦

**使用事件总线：**
```go
// pkg/events/bus.go
type Event interface {
    Type() string
}

type WorkerStartedEvent struct {
    WorkerID string
    Time     time.Time
}

func (e WorkerStartedEvent) Type() string { return "worker.started" }

type EventBus struct {
    handlers map[string][]func(Event)
}

func (b *EventBus) Subscribe(eventType string, handler func(Event)) {
    b.handlers[eventType] = append(b.handlers[eventType], handler)
}

func (b *EventBus) Publish(event Event) {
    for _, h := range b.handlers[event.Type()] {
        go h(event)  // 异步执行，避免阻塞
    }
}

// 使用
bus.Subscribe("worker.started", func(e Event) {
    // 记录日志
})

bus.Subscribe("worker.started", func(e Event) {
    // 更新监控指标
})

// 发布
bus.Publish(WorkerStartedEvent{WorkerID: "101", Time: time.Now()})
```

---

### 4. 低嵌套原则

#### 4.1 提前返回（Guard Clauses）

**❌ 反例：深度嵌套**
```go
func ProcessRequest(req *Request) error {
    if req != nil {
        if req.AccountID > 0 {
            workerURL, err := getWorkerURL(req.AccountID)
            if err == nil {
                resp, err := forwardRequest(workerURL, req)
                if err == nil {
                    if resp.StatusCode == 200 {
                        return nil
                    } else {
                        return errors.New("bad status")
                    }
                } else {
                    return err
                }
            } else {
                return err
            }
        } else {
            return errors.New("invalid account")
        }
    } else {
        return errors.New("nil request")
    }
}
```

**✅ 正例：提前返回**
```go
func ProcessRequest(req *Request) error {
    // 提前校验
    if req == nil {
        return errors.New("nil request")
    }
    if req.AccountID <= 0 {
        return errors.New("invalid account")
    }
    
    // 正常流程，平坦
    workerURL, err := getWorkerURL(req.AccountID)
    if err != nil {
        return fmt.Errorf("get worker url: %w", err)
    }
    
    resp, err := forwardRequest(workerURL, req)
    if err != nil {
        return fmt.Errorf("forward request: %w", err)
    }
    
    if resp.StatusCode != 200 {
        return fmt.Errorf("bad status: %d", resp.StatusCode)
    }
    
    return nil
}
```

#### 4.2 提取函数

**❌ 反例：一个函数做所有事**
```go
func HandleRequest(w http.ResponseWriter, r *http.Request) {
    // 解析请求（30 行）
    body, _ := io.ReadAll(r.Body)
    var req Request
    json.Unmarshal(body, &req)
    
    // 验证（20 行）
    if req.Model == "" { /* ... */ }
    if req.MaxTokens < 0 { /* ... */ }
    
    // 获取 Worker（15 行）
    accountID := getAccountID(r.Header)
    workerURL := lookupWorkerURL(accountID)
    
    // 转发请求（40 行）
    upstreamReq, _ := http.NewRequest("POST", workerURL, bytes.NewReader(body))
    // ... 复制 headers, 处理流式响应, 错误处理
    
    // 记录日志（10 行）
    // ...
}
```

**✅ 正例：小函数组合**
```go
func HandleRequest(w http.ResponseWriter, r *http.Request) {
    req, err := parseRequest(r)
    if err != nil {
        writeError(w, err)
        return
    }
    
    if err := validateRequest(req); err != nil {
        writeError(w, err)
        return
    }
    
    accountID := extractAccountID(r.Header)
    workerURL, err := h.router.GetWorkerURL(accountID)
    if err != nil {
        writeError(w, err)
        return
    }
    
    if err := h.forwarder.Forward(w, workerURL, req); err != nil {
        h.logger.Error("forward failed", "error", err)
        return
    }
    
    h.logger.Info("request completed", "account_id", accountID)
}

// 每个函数只做一件事，容易测试
func parseRequest(r *http.Request) (*Request, error) { /* ... */ }
func validateRequest(req *Request) error { /* ... */ }
func extractAccountID(h http.Header) int64 { /* ... */ }
```

---

### 5. 简洁原则

#### 5.1 避免过度抽象

**❌ 反例：无意义的抽象层**
```go
// 只有一个实现，却定义了接口
type WorkerURLGetter interface {
    GetURL(accountID int64) (string, error)
}

type DefaultWorkerURLGetter struct{}

func (d *DefaultWorkerURLGetter) GetURL(accountID int64) (string, error) {
    return fmt.Sprintf("http://worker-%d:8788", accountID), nil
}

// 又包装了一层
type WorkerURLGetterWrapper struct {
    getter WorkerURLGetter
}

func (w *WorkerURLGetterWrapper) Get(id int64) (string, error) {
    return w.getter.GetURL(id)
}
```

**✅ 正例：直接实现**
```go
// 简单逻辑，直接写函数
func getWorkerURL(accountID int64) string {
    return fmt.Sprintf("http://worker-%d:8788", accountID)
}

// 如果未来真的需要多种实现，再抽象接口
```

#### 5.2 避免过度工程

**原则：YAGNI (You Aren't Gonna Need It)**

- 不预测未来需求
- 不为"可能"的扩展留钩子
- 需要时再重构

**❌ 不要这样：**
```go
// "以防将来需要支持 Redis、Etcd、S3..."
type StorageBackend interface {
    Init() error
    Get(key string) ([]byte, error)
    Set(key string, value []byte) error
    Delete(key string) error
    List(prefix string) ([]string, error)
    Watch(key string) (<-chan Event, error)
    Transaction(ops []Op) error
    // ... 30 个方法
}
```

**✅ 应该这样：**
```go
// 当前只需要文件存储
type FileStore struct {
    dir string
}

func (f *FileStore) Save(filename string, data []byte) error {
    return os.WriteFile(filepath.Join(f.dir, filename), data, 0600)
}

func (f *FileStore) Load(filename string) ([]byte, error) {
    return os.ReadFile(filepath.Join(f.dir, filename))
}

// 如果将来真的需要 Redis，再重构成接口
```

#### 5.3 命名清晰

**好的命名 > 注释**

**❌ 反例：**
```go
// 获取数据
func getData(id int) ([]byte, error) {
    // 从缓存读取
    d, ok := cache[id]
    if ok {
        return d, nil
    }
    // 从数据库读取
    return db.Get(id)
}
```

**✅ 正例：**
```go
func getAccountConfigWithCache(accountID int64) ([]byte, error) {
    if cached, ok := cache.Get(accountID); ok {
        return cached, nil
    }
    return db.GetAccountConfig(accountID)
}
```

---

## 旧代码清理清单

### 阶段 1：标记要删除的代码

在迁移开始前，先标记哪些代码会被废弃：

```bash
# 在旧代码目录创建 DEPRECATED.md
cat > tools/ccgateway-old/DEPRECATED.md << 'EOF'
# 废弃代码清单

本目录代码已被 `plugins/ccgateway/` 和 `tools/ccgateway/worker/` 替代。

**废弃时间：** 2026-10-07  
**删除计划：** 2026-11-07（迁移完成 1 个月后）

## 映射关系

| 旧代码 | 新位置 | 说明 |
|--------|--------|------|
| runner.go | worker/runner/runner.go | 重构，拆分为多个模块 |
| mod/hooks/register.js | worker/mod/bridge.go | 改用 HTTP 回调 |
| inline_system_*.go | worker/runner/protocol.go | 合并到协议层 |
| gateway.go | plugins/ccgateway/router/ | 分层重构 |

## 不迁移的代码（功能已废弃）

- `ccgateway-manager/` - 不需要 Manager 层（ADR-001）
- `temp-files/` - 改用环境变量 + HTTP 回调

## 清理步骤

1. 新代码上线且稳定运行 7 天
2. 确认无回滚需求
3. 移动到 `archive/ccgateway-old-YYYYMMDD/`
4. 2 个月后永久删除
EOF
```

### 阶段 2：重写 vs 重构决策

**决策矩阵：**

| 代码特征 | 重写 | 重构 | 理由 |
|----------|------|------|------|
| 核心逻辑清晰，只需分层 | ❌ | ✅ | 保留业务逻辑，改善结构 |
| 意大利面条代码，嵌套 5+ 层 | ✅ | ❌ | 重构成本 > 重写 |
| 有大量临时补丁 | ✅ | ❌ | 技术债务太多 |
| 有完整测试覆盖 | ❌ | ✅ | 测试可保证重构安全 |
| 没有测试，逻辑模糊 | ✅ | ❌ | 边界不清晰，重写更安全 |
| 外部依赖很多 | ❌ | ✅ | 重写风险高 |

**初步评估（基于之前的代码阅读）：**

| 模块 | 决策 | 原因 |
|------|------|------|
| `runner.go` | **重构** | 核心逻辑清晰，需要分层和去重 |
| `mod/hooks/register.js` | **重写** | 改用 HTTP 回调，协议变化大 |
| `inline_system_*.go` | **重构** | 逻辑正确，需要整合到协议层 |
| `runner_session.go` | **重构** | 会话管理清晰，抽取 Store 接口 |
| `history/` | **重构** | 文件操作清晰，封装接口即可 |

### 阶段 3：增量迁移（避免大爆炸）

**错误做法：**
```bash
# ❌ 一次性删除所有旧代码
rm -rf tools/ccgateway-old/
# 写 10000 行新代码
# 一次性上线
# 💥 炸了
```

**正确做法：**
```bash
# ✅ 增量迁移

# 第 1 步：先迁移不依赖其他模块的
# - history store（独立，易测试）
cd tools/ccgateway/worker/history
# 重构 + 写测试
go test ./... -v

# 第 2 步：迁移协议层
cd worker/runner
# 重构 stream-json 协议
go test ./... -v

# 第 3 步：迁移 Mod 桥接
cd worker/mod
# 重写 HTTP 回调
go test ./... -v

# 第 4 步：集成测试
# 新旧代码并行运行，对比结果

# 第 5 步：灰度切换
# 10% 流量 → 50% → 100%

# 第 6 步：删除旧代码
git mv tools/ccgateway-old archive/
```

### 阶段 4：删除旧代码

**时间表：**

| 时间点 | 操作 | 说明 |
|--------|------|------|
| D+0 | 新代码上线 | 灰度期：新旧并行 |
| D+7 | 新代码全量 | 旧代码停止，但保留 |
| D+14 | 移至 archive/ | 旧代码归档，生产环境删除 |
| D+30 | 确认无回滚需求 | 最后检查点 |
| D+60 | 永久删除 | 从 Git 历史保留，代码库删除 |

**删除脚本：**

```bash
#!/bin/bash
# cleanup.sh

set -e

ARCHIVE_DIR="archive/ccgateway-old-$(date +%Y%m%d)"

echo "Archiving old code to $ARCHIVE_DIR..."

# 创建归档目录
mkdir -p $ARCHIVE_DIR

# 移动旧代码
mv tools/ccgateway-old/* $ARCHIVE_DIR/

# 提交
git add $ARCHIVE_DIR
git rm -r tools/ccgateway-old
git commit -m "chore: archive old ccgateway code

Old code moved to $ARCHIVE_DIR after successful migration.
Will be permanently deleted on $(date -d '+60 days' +%Y-%m-%d).

Ref: ccgateway-migration project
"

echo "✅ Old code archived."
echo "Scheduled for deletion: $(date -d '+60 days' +%Y-%m-%d)"
```

### 阶段 5：清理临时文件和配置

**要清理的内容：**

```bash
# 临时文件
rm -rf /tmp/ccgateway-*
rm -rf /var/tmp/ccgateway-*

# 旧配置
rm -f /etc/ccgateway-old.conf
rm -f ~/.ccgateway-old

# 旧日志
rm -f /var/log/ccgateway-old.log*

# 旧数据（谨慎！先备份）
# 备份
tar czf ccgateway-old-data-$(date +%Y%m%d).tar.gz /var/lib/ccgateway-old/
# 移至归档
mv /var/lib/ccgateway-old/ /var/lib/archive/
```

---

## 代码审查清单

在合并新代码前，强制检查：

### 结构审查

- [ ] 代码分层清晰（API / 业务 / 存储）
- [ ] 单一职责（每个函数/结构体只做一件事）
- [ ] 接口定义合理（小接口，按需组合）
- [ ] 依赖注入（无全局变量，可测试）

### 质量审查

- [ ] 无重复代码（DRY 原则）
- [ ] 无深度嵌套（< 3 层）
- [ ] 无超长函数（< 50 行）
- [ ] 命名清晰（无 `tmp`, `data`, `func1`）
- [ ] 错误处理完整（无 `_ = err`）

### 测试审查

- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试通过
- [ ] 无竞态条件（`go test -race`）
- [ ] 边界情况测试（nil, 空, 负数, 超大）

### 文档审查

- [ ] 公开函数有注释
- [ ] 复杂逻辑有说明
- [ ] README 完整（快速开始、配置、示例）
- [ ] CHANGELOG 更新

### 性能审查

- [ ] 无明显内存泄漏（`pprof`）
- [ ] 无不必要的分配（`benchstat`）
- [ ] 并发安全（加锁 / 原子操作）
- [ ] 资源释放（defer close）

---

## 重构技巧

### 技巧 1：测试先行

**步骤：**
```bash
# 1. 为旧代码补测试（如果没有）
# 记录旧代码的行为

# 2. 重构代码

# 3. 测试仍然通过
# 证明行为未变

# 4. 添加新测试
# 覆盖新功能
```

### 技巧 2：Strangler Fig 模式

**概念：** 新代码逐步"绞杀"旧代码

```go
// 第 1 步：创建适配器
type HistoryStoreAdapter struct {
    oldStore *OldHistoryManager
}

func (a *HistoryStoreAdapter) Save(ctx context.Context, data []byte) error {
    // 调用旧代码
    return a.oldStore.SaveHistory(data)
}

// 第 2 步：新调用方使用新接口
func NewWorker() *Worker {
    return &Worker{
        // 但实际还是旧实现
        historyStore: &HistoryStoreAdapter{oldStore: oldManager},
    }
}

// 第 3 步：替换实现
func NewWorker() *Worker {
    return &Worker{
        // 切换到新实现
        historyStore: &FileStore{dir: "/root/.claude"},
    }
}

// 第 4 步：删除适配器和旧代码
```

### 技巧 3：提取 - 测试 - 删除

```go
// 步骤 1：提取重复逻辑到新函数
func buildAuthCommand(token string) []string {
    return []string{"claude", "auth", "login", "--token", token}
}

// 步骤 2：测试新函数
func TestBuildAuthCommand(t *testing.T) {
    cmd := buildAuthCommand("test-token")
    assert.Equal(t, []string{"claude", "auth", "login", "--token", "test-token"}, cmd)
}

// 步骤 3：替换旧代码调用新函数
// 步骤 4：删除旧的重复代码
```

---

## 持续改进

### 建立代码质量门禁

**CI 集成：**

```yaml
# .github/workflows/code-quality.yml
name: Code Quality

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: golangci/golangci-lint-action@v3
        with:
          version: latest
  
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: go test ./... -v -race -coverprofile=coverage.out
      
      - name: Check coverage
        run: |
          coverage=$(go tool cover -func=coverage.out | grep total | awk '{print $3}' | sed 's/%//')
          if (( $(echo "$coverage < 80" | bc -l) )); then
            echo "Coverage $coverage% is below 80%"
            exit 1
          fi
  
  complexity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check cyclomatic complexity
        run: |
          go install github.com/fzipp/gocyclo/cmd/gocyclo@latest
          gocyclo -over 15 .  # 拒绝复杂度 > 15 的函数
```

### 定期重构

**每季度：**
- 运行 `gocyclo` 找出复杂函数并重构
- 运行 `go-callvis` 查看调用图，优化依赖
- 运行 `pprof` 找出性能瓶颈

---

## 总结

### 核心原则

1. **抽象** - 识别通用模式，定义清晰接口
2. **复用** - 提取公共代码，避免重复
3. **解耦** - 依赖注入，接口隔离，事件驱动
4. **低嵌套** - 提前返回，小函数组合
5. **简洁** - YAGNI，避免过度设计

### 清理原则

1. **不留技术债** - 迁移是偿还的机会
2. **增量迁移** - 小步快跑，持续验证
3. **测试保护** - 重构前补测试
4. **定期清理** - 旧代码及时删除

### 质量门禁

- 单元测试覆盖率 > 80%
- 圈复杂度 < 15
- 函数长度 < 50 行
- 嵌套深度 < 3 层
- 无 lint 警告

**不要留狗屎代码！** 🚽🚫

---

**最后更新：** 2026-10-07
