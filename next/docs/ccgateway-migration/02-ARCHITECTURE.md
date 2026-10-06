# CCGateway 目标架构设计

**文档版本：** 1.0  
**创建日期：** 2026-10-07  
**负责人：** 主会话（基于 architect agent 的 discovery）  
**状态：** ✅ 完成

---

## 执行摘要

本文档定义 CCGateway 迁移后的目标架构。核心原则：

1. **职责分离** - 核心调度账号，插件路由请求，Worker 执行业务
2. **无 Manager 层** - 插件直接访问 Worker，无中间代理
3. **一账号一容器** - 隔离授权、历史、故障域
4. **零文件通信** - 环境变量 + HTTP，无临时文件
5. **代码重构** - 遵守五大原则（抽象、复用、解耦、低嵌套、简洁）

---

## 1. 架构概览

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│  sup2api-next 核心                                           │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Gateway (网关)                                        │  │
│  │  • 路由匹配（platform + endpoint）                    │  │
│  │  • 认证（API Key → user + group）                    │  │
│  │  • 余额检查                                           │  │
│  │  • 账号调度 ◄────────────────┐                       │  │
│  └─────────────┬────────────────┘                       │  │
│                │                                         │  │
│                ▼                                         │  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Scheduler (调度器)                                    │  │
│  │  • 筛选候选账号（分组/模型/状态）                      │  │
│  │  • 检查粘性会话（Redis）                              │  │
│  │  • 排序（优先级 + 权重）                              │  │
│  │  • 选择最优账号 → account_id = 123                   │  │
│  └─────────────┬────────────────┘                       │  │
│                │                                         │  │
│                │ account_id=123                          │  │
│                ▼                                         │  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Plugin Manager (插件管理器)                           │  │
│  │  • 查找账号所属插件（ccgateway）                       │  │
│  │  • 调用插件 Execute(account_id=123, body)            │  │
│  └─────────────┬────────────────┘                       │  │
└────────────────┼────────────────────────────────────────────┘
                 │
                 │ gRPC: Execute(account_id=123, ...)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  CCGateway 插件 (独立进程)                                   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ workerMap: map[int64]string                           │  │
│  │   123 → "http://ccgateway-worker-123:8788"           │  │
│  │   456 → "http://ccgateway-worker-456:8788"           │  │
│  │   789 → "http://ccgateway-worker-789:8788"           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Execute(account_id=123):                                   │
│    1. workerURL := workerMap[123]                          │
│    2. HTTP POST workerURL/v1/messages                      │
│    3. return response (streaming)                          │
│                                                             │
└─────────────┬───────────────────────────────────────────────┘
              │
              │ HTTP POST /v1/messages
              │
         ┌────┼────┬────┬────┐
         │    │    │    │    │
         ▼    ▼    ▼    ▼    ▼
┌──────────────────────────────────────────────────────────────┐
│  Worker 容器池                                               │
│                                                              │
│  ┌────────────────────┐  ┌────────────────────┐            │
│  │ worker-123         │  │ worker-456         │  ...        │
│  │                    │  │                    │            │
│  │ • HTTP Server      │  │ • HTTP Server      │            │
│  │ • 历史匹配         │  │ • 历史匹配         │            │
│  │ • exec claude      │  │ • exec claude      │            │
│  │ • 验证和清理       │  │ • 验证和清理       │            │
│  │                    │  │                    │            │
│  │ 数据卷:            │  │ 数据卷:            │            │
│  │ /root/.claude/     │  │ /root/.claude/     │            │
│  │  ├─ auth/          │  │  ├─ auth/          │            │
│  │  └─ sessions/      │  │  └─ sessions/      │            │
│  └────────────────────┘  └────────────────────┘            │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 关键设计决策

#### ADR-001: 不需要 Gateway Manager 层

**决策：** 插件直接访问 Worker，不引入 Manager 代理层。

**理由：**
1. sup2api 核心已有账号调度逻辑（分组、模型、负载均衡）
2. 一个账号只对应一个 Worker，无需二次负载均衡
3. Manager 层只是透明代理，无业务逻辑
4. 减少网络跳转（~1ms 延迟）
5. 减少故障点

**影响：**
- ✅ 延迟最低
- ✅ 架构最简
- ✅ 调试简单
- ❌ 插件需要维护 account_id → worker_url 映射（约 100 行代码）

---

#### ADR-002: 一账号一容器

**决策：** 每个 CCGateway 账号对应一个独立的 Worker 容器。

**理由：**
1. 隔离 Claude Code 授权（每个容器独立的 `~/.claude/auth/`）
2. 隔离会话历史（独立的 `~/.claude/sessions/`）
3. 独立故障域（一个容器崩溃不影响其他账号）
4. 符合 CCGateway 设计（原本就是"一授权一实例"）

**影响：**
- ✅ 完全隔离
- ✅ 符合原设计
- ❌ 容器数量 = 账号数量（需要管理）
- ❌ 资源消耗相对较高（但可接受，Worker 很轻量）

---

#### ADR-003: 零文件通信

**决策：** 使用环境变量 + HTTP 回调，移除所有临时文件通信。

**理由：**
1. 文件通信不符合容器化最佳实践
2. 增加清理复杂度和故障风险
3. HTTP 是标准协议，易于调试和监控

**改造：**
- ❌ 移除：`CCGATEWAY_READY_FILE`、`CCGATEWAY_SYSTEM_FILE` 等
- ✅ 改为：环境变量配置 + HTTP 健康检查

**影响：**
- ✅ 符合容器最佳实践
- ✅ 易于调试
- ✅ 无清理负担
- ❌ 需要重构现有代码（约 500 行）

---

#### ADR-004: 代码重构而非搬运

**决策：** Worker 代码重构，遵守五大原则（抽象、复用、解耦、低嵌套、简洁）。

**理由：**
1. 现有代码存在技术债（深层嵌套、重复代码）
2. 迁移是重构的最佳时机
3. 提升代码可维护性和可测试性

**质量门禁：**
- 单元测试覆盖率 > 80%
- 圈复杂度 < 15
- 函数长度 < 50 行
- 嵌套深度 < 3 层
- 无 golangci-lint 警告

**影响：**
- ✅ 代码质量提升
- ✅ 长期可维护性
- ❌ 工作量增加（需要重写而非复制）

---

## 2. 模块设计

### 2.1 Worker 容器

#### 职责

1. **HTTP 服务** - 监听 8788 端口，提供 `/v1/messages` 端点
2. **历史匹配** - 匹配客户端历史，恢复 Claude Code 会话
3. **Claude 执行** - 调用 `claude` CLI，管理子进程
4. **验证和清理** - 验证 Mod 加载，清理内部工具结果

#### 核心接口

```go
// Worker HTTP 服务
type Worker struct {
    port         int
    cliPath      string
    cliVersion   string
    plugin       string
    workDir      string
    cache        *Cache
    authManager  *AuthManager
    historyStore *HistoryStore
}

// HTTP 端点
func (w *Worker) ServeHTTP(port int) error
func (w *Worker) HandleMessages(c *gin.Context)
func (w *Worker) HandleHealth(c *gin.Context)

// 核心逻辑
func (w *Worker) Execute(ctx context.Context, req *Request) (*Response, error)
func (w *Worker) MatchHistory(req *Request) (*Session, error)
func (w *Worker) StartCLI(ctx context.Context, args []string) (*Process, error)
func (w *Worker) Verify(session *Session) error
func (w *Worker) Cleanup(session *Session) error
```

#### 配置（环境变量）

```bash
# Worker 基础配置
WORKER_ID=123                     # Worker 标识（对应账号 ID）
WORKER_PORT=8788                  # HTTP 监听端口
WORKER_CLI_PATH=/usr/local/bin/claude
WORKER_CLI_VERSION=2.1.288
WORKER_PLUGIN_PATH=/app/mod

# Claude Code 配置
CLAUDE_CONFIG_DIR=/root/.claude
ANTHROPIC_API_KEY=sk-ant-api03-xxx   # 或通过授权获取
ANTHROPIC_BASE_URL=https://api.anthropic.com

# 缓存和历史
CACHE_DIR=/var/lib/worker/cache
HISTORY_DIR=/root/.claude/sessions
MAX_CACHE_SIZE=32MB
HISTORY_RETENTION=24h

# 代理（可选）
HTTP_PROXY=http://proxy:8080
HTTPS_PROXY=http://proxy:8080
NO_PROXY=localhost,127.0.0.1
```

#### 目录结构

```
worker/
├── main.go                  # 入口
├── server.go                # HTTP 服务
├── worker.go                # Worker 核心逻辑
├── history/                 # 历史匹配
│   ├── store.go
│   ├── match.go
│   └── import.go
├── cli/                     # Claude CLI 管理
│   ├── process.go
│   ├── session.go
│   └── stream.go
├── auth/                    # 授权管理
│   ├── manager.go
│   └── oauth.go
├── cache/                   # 缓存
│   └── cache.go
└── mod/                     # Mod 验证
    └── verify.go
```

---

### 2.2 CCGateway 插件

#### 职责

1. **账号映射** - 维护 `account_id → worker_url` 映射
2. **HTTP 转发** - 转发请求到对应 Worker
3. **流式响应** - 透传 SSE 流
4. **错误处理** - 分类错误，决定是否 failover

#### 核心接口

```go
// 插件主结构
type Plugin struct {
    mu        sync.RWMutex
    workerMap map[int64]string  // account_id → worker_url
    host      pluginsdk.HostService
    client    *http.Client
}

// 插件生命周期
func New(ctx context.Context, host pluginsdk.HostService) (pluginsdk.Plugin, error)
func (p *Plugin) Configure(ctx context.Context, cfg *pluginsdk.Config) error
func (p *Plugin) HealthCheck(ctx context.Context) error
func (p *Plugin) Shutdown(ctx context.Context) error

// 核心功能
func (p *Plugin) Execute(ctx context.Context, req *pluginsdk.ExecuteRequest) (*pluginsdk.ExecuteResponse, error)
func (p *Plugin) getWorkerURL(ctx context.Context, accountID int64) (string, error)
func (p *Plugin) forwardToWorker(ctx context.Context, workerURL string, body []byte, headers map[string]string) (*http.Response, error)
```

#### 工作流程

```
Execute(account_id=123, body, headers)
    ↓
1. 查询 Worker URL
    • 先查缓存：workerMap[123]
    • 缓存未命中：
        → host.GetAccount(123)
        → 解析 config.worker_url
        → 缓存映射
    ↓
2. 构建 HTTP 请求
    • URL: workerURL + "/v1/messages"
    • Method: POST
    • Headers: 透传 + Authorization
    • Body: 原样转发
    ↓
3. 发送请求
    • 使用 http.Client
    • 支持流式响应
    • 超时: 10 分钟
    ↓
4. 返回响应
    • 状态码: 原样
    • Headers: 原样
    • Body: 流式透传（io.Reader）
    ↓
调用方负责 Close
```

#### 错误处理

```go
func (p *Plugin) ClassifyError(ctx context.Context, req *pluginsdk.ClassifyErrorRequest) (*pluginsdk.ClassifyErrorResponse, error) {
    status := req.StatusCode
    body := req.BodyPrefix
    
    // Worker 不可达
    if status == 0 {
        return &pluginsdk.ClassifyErrorResponse{
            Action:        pluginsdk.Action_FAILOVER,
            AccountEffect: pluginsdk.AccountEffect_COOLDOWN,
            CooldownSec:   60,
        }, nil
    }
    
    // Worker 5xx
    if status >= 500 {
        return &pluginsdk.ClassifyErrorResponse{
            Action:        pluginsdk.Action_FAILOVER,
            AccountEffect: pluginsdk.AccountEffect_NONE,
        }, nil
    }
    
    // 客户端错误，直接返回
    return &pluginsdk.ClassifyErrorResponse{
        Action:        pluginsdk.Action_RETURN_TO_CLIENT,
        AccountEffect: pluginsdk.AccountEffect_NONE,
    }, nil
}
```

---

### 2.3 核心集成

#### 账号表扩展

```sql
-- accounts.config 字段存储 Worker URL
-- config 示例:
{
  "worker_url": "http://ccgateway-worker-123:8788"
}
```

#### 账号类型定义（manifest.json）

```json
{
  "key": "ccgateway",
  "version": "0.2.0",
  "accountTypes": [
    {
      "id": "managed",
      "platforms": ["anthropic"],
      "form": {
        "schema": {
          "type": "object",
          "properties": {
            "worker_url": {
              "type": "string",
              "format": "uri",
              "title": "Worker URL",
              "description": "CCGateway Worker 容器地址"
            }
          },
          "required": ["worker_url"]
        },
        "ui": {
          "worker_url": {
            "ui:widget": "uri",
            "ui:placeholder": "http://ccgateway-worker-123:8788"
          }
        }
      },
      "settingsFields": ["worker_url"],
      "sensitiveFields": []
    }
  ]
}
```

#### Host Service 扩展

插件通过 Host Service 查询账号配置：

```go
// 插件侧调用
account, err := p.host.GetAccount(ctx, accountID)
if err != nil {
    return nil, err
}

var config struct {
    WorkerURL string `json:"worker_url"`
}
json.Unmarshal(account.Config, &config)
```

---

## 3. 数据流

### 3.1 请求流程

```
1. 客户端请求
   POST https://api.sup2api.com/v1/messages
   Authorization: Bearer <api_key>
   {model: "claude-opus-5-5", messages: [...]}

2. 核心网关
   • 认证：API Key → user_id=1, group_id=10
   • 路由：platform=anthropic, endpoint=/v1/messages
   • 余额检查：用户余额足够

3. 账号调度
   • 筛选：group_id=10 + platform=anthropic + model=claude-opus-5-5
   • 候选：[account_123, account_456, account_789]
   • 粘性：Redis 查询 sticky:user:1 → account_123
   • 选择：account_123

4. 插件执行
   • 查找插件：account_123.plugin_key="ccgateway"
   • 调用：ccgateway.Execute(account_id=123, body, headers)

5. 插件路由
   • 查询 Worker URL：
     → 缓存命中：workerMap[123] = "http://ccgateway-worker-123:8788"
   • 构建请求：
     POST http://ccgateway-worker-123:8788/v1/messages
     Authorization: Bearer <gateway_key>
     <原始 body>

6. Worker 执行
   • 解析请求
   • 匹配历史：客户端 messages → native session
   • 启动 CLI：claude --stream-json --session=<sid> ...
   • 流式返回：SSE

7. 响应路径
   Worker SSE → 插件透传 → 核心网关 → 客户端
```

### 3.2 账号创建流程

```
1. 管理员启动 Worker 容器
   docker run -d \
     --name ccgateway-worker-123 \
     -e WORKER_ID=123 \
     -e ANTHROPIC_API_KEY=sk-ant-... \
     -v worker-123-data:/root \
     -p 8788:8788 \
     ccgateway-worker:latest

2. 完成 Claude 授权
   docker exec ccgateway-worker-123 claude auth login
   # 或通过 OAuth 流程

3. 在 sup2api 创建账号
   POST /api/v1/accounts
   {
     "name": "CCGateway Account 123",
     "plugin_key": "ccgateway",
     "type": "managed",
     "platform": "anthropic",
     "settings": {
       "worker_url": "http://ccgateway-worker-123:8788"
     },
     "groups": [10]
   }

4. 核心验证
   • 调用插件 ValidateCredentials
   • 插件 HTTP GET worker_url/health
   • 验证通过，保存账号

5. 插件缓存更新
   • 插件监听账号变更事件
   • 更新 workerMap[123] = "http://ccgateway-worker-123:8788"
```

---

## 4. 接口契约

### 4.1 Worker HTTP API

#### POST /v1/messages

**请求：**
```http
POST /v1/messages HTTP/1.1
Host: worker-123:8788
Content-Type: application/json
Authorization: Bearer <gateway_key>
X-CCGateway-Session-ID: user-1-session-abc
X-CCGateway-Request-Policy: {"attachment_source":"client"}

{
  "model": "claude-opus-5-5",
  "max_tokens": 4096,
  "messages": [...]
}
```

**响应（流式）：**
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream

event: message_start
data: {"type":"message_start","message":{...}}

event: content_block_delta
data: {"type":"content_block_delta","delta":{...}}

...

event: message_stop
data: {"type":"message_stop"}
```

#### GET /health

**响应：**
```json
{
  "status": "healthy",
  "worker_id": "123",
  "cli_version": "2.1.288",
  "uptime_seconds": 3600
}
```

---

### 4.2 插件接口

#### Execute

```protobuf
message ExecuteRequest {
  int64 account_id = 1;
  bytes request_body = 2;
  map<string, string> headers = 3;
}

message ExecuteResponse {
  int32 status_code = 1;
  map<string, string> headers = 2;
  bytes body = 3;  // 或 stream
}
```

#### ValidateCredentials

```protobuf
message ValidateCredentialsRequest {
  string credentials_json = 1;  // {}（空，Worker URL 在 settings）
  string settings_json = 2;     // {"worker_url": "..."}
}

message ValidateCredentialsResponse {
  bool valid = 1;
  string error_message = 2;
  string normalized_credentials_json = 3;  // "{}"
  string normalized_settings_json = 4;     // {"worker_url": "<规范化>"}
}
```

#### ClassifyError

```protobuf
message ClassifyErrorRequest {
  int32 status_code = 1;
  bytes body_prefix = 2;
  map<string, string> headers = 3;
}

message ClassifyErrorResponse {
  Action action = 1;                // RETURN_TO_CLIENT | FAILOVER
  AccountEffect account_effect = 2;  // NONE | COOLDOWN | DISABLE
  int32 cooldown_sec = 3;
}
```

---

## 5. 部署架构

### 5.1 Docker Compose

```yaml
version: '3.8'

services:
  # Worker 容器（每个账号一个）
  ccgateway-worker-123:
    image: ccgateway-worker:0.2.0
    container_name: ccgateway-worker-123
    environment:
      - WORKER_ID=123
      - WORKER_PORT=8788
      - ANTHROPIC_API_KEY=${CC_TOKEN_123:?}
      - CLAUDE_CONFIG_DIR=/root/.claude
    volumes:
      - worker-123-data:/root
    networks:
      - sup2api-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8788/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  ccgateway-worker-456:
    image: ccgateway-worker:0.2.0
    container_name: ccgateway-worker-456
    environment:
      - WORKER_ID=456
      - WORKER_PORT=8788
      - ANTHROPIC_API_KEY=${CC_TOKEN_456:?}
    volumes:
      - worker-456-data:/root
    networks:
      - sup2api-net
    restart: unless-stopped

volumes:
  worker-123-data:
  worker-456-data:

networks:
  sup2api-net:
    external: true  # 与 sup2api 核心共享
```

### 5.2 网络拓扑

```
                   Internet
                      │
                      ▼
              ┌───────────────┐
              │   Nginx       │
              │   (反向代理)   │
              └───────┬───────┘
                      │
         ┌────────────┼────────────┐
         │                         │
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│  sup2api-node-1 │       │  sup2api-node-2 │
│  (核心 + 插件)   │       │  (核心 + 插件)   │
└────────┬────────┘       └────────┬────────┘
         │                         │
         └────────────┬────────────┘
                      │
              sup2api-net (内部网络)
                      │
         ┌────────────┼────────────┐
         │            │            │
         ▼            ▼            ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  worker-123 │ │  worker-456 │ │  worker-789 │
└─────────────┘ └─────────────┘ └─────────────┘
```

---

## 6. 性能和扩展性

### 6.1 性能指标

| 指标 | 目标 | 说明 |
|------|------|------|
| **请求延迟** | +2ms | 相比直连 Claude API，增加插件路由和 Worker 转发 |
| **吞吐量** | 1000 req/s | 单核心节点，受限于账号调度 |
| **Worker 延迟** | <1ms | HTTP 转发，Worker 本地处理 |
| **插件查询** | <0.1ms | 内存缓存命中 |
| **历史匹配** | <10ms | 本地文件读取 |

### 6.2 扩展性

| 维度 | 限制 | 扩展方式 |
|------|------|----------|
| **核心节点** | 无限制 | 水平扩展，共享 PG + Redis |
| **Worker 数量** | 1000+ | 受限于容器资源，可迁移到 K8s |
| **单 Worker 并发** | 10-100 | 受限于 Claude CLI 并发能力 |
| **账号数量** | 10000+ | 无架构限制 |

### 6.3 资源消耗

**单 Worker 容器：**
- CPU: 0.1-0.5 核（空闲-忙碌）
- 内存: 50-200 MB
- 磁盘: 100 MB（代码） + 500 MB（历史缓存）
- 网络: 10 Mbps（流式响应）

**100 个 Worker：**
- CPU: 10-50 核
- 内存: 5-20 GB
- 磁盘: 60 GB

---

## 7. 安全性

### 7.1 隔离

1. **进程隔离** - 插件独立进程，Worker 独立容器
2. **网络隔离** - Worker 仅暴露在内部网络
3. **数据隔离** - 每个 Worker 独立数据卷
4. **授权隔离** - 每个 Worker 独立 Claude 授权

### 7.2 认证

```
客户端 → 核心：API Key (sup2api)
核心 → 插件：gRPC (本地 Unix Socket)
插件 → Worker：HTTP + Authorization (内部密钥)
Worker → Claude：OAuth Token (用户授权)
```

### 7.3 敏感数据

| 数据 | 存储位置 | 加密 |
|------|----------|------|
| API Key | sup2api DB | AES-GCM ✅ |
| Worker URL | account.config | 明文（内部网络） |
| Claude OAuth Token | Worker 数据卷 `~/.claude/auth/` | Claude 管理 |
| 会话历史 | Worker 数据卷 `~/.claude/sessions/` | 明文 |

---

## 8. 监控和可观测性

### 8.1 指标

**核心指标：**
- `ccgateway_accounts_total` - CCGateway 账号总数
- `ccgateway_requests_total{account_id}` - 每账号请求数
- `ccgateway_request_duration_seconds{account_id}` - 请求延迟
- `ccgateway_errors_total{account_id,type}` - 错误数

**Worker 指标：**
- `worker_health{worker_id}` - Worker 健康状态
- `worker_uptime_seconds{worker_id}` - Worker 运行时长
- `worker_cli_calls_total{worker_id}` - CLI 调用次数
- `worker_cache_hit_ratio{worker_id}` - 缓存命中率

### 8.2 日志

**核心日志：**
```json
{
  "level": "info",
  "time": "2026-10-07T01:00:00Z",
  "msg": "ccgateway request",
  "account_id": 123,
  "worker_url": "http://worker-123:8788",
  "model": "claude-opus-5-5",
  "duration_ms": 2500
}
```

**Worker 日志：**
```json
{
  "level": "info",
  "time": "2026-10-07T01:00:00Z",
  "msg": "claude cli started",
  "worker_id": "123",
  "session_id": "native-abc",
  "cli_args": ["--stream-json", "--session=native-abc"]
}
```

### 8.3 追踪

使用 `X-Request-ID` 跨模块追踪：

```
客户端请求
  → 核心网关 [request_id=req-123]
    → 插件 [request_id=req-123]
      → Worker [request_id=req-123]
        → Claude CLI [request_id=req-123]
```

---

## 9. 故障处理

### 9.1 故障场景

| 场景 | 检测 | 处理 |
|------|------|------|
| Worker 容器挂掉 | HTTP 连接失败 | Failover 到其他账号 |
| Worker 健康检查失败 | /health 返回 5xx | 账号标记为 disabled |
| Claude CLI 崩溃 | 进程退出码非 0 | Worker 返回 500，触发 failover |
| 历史匹配失败 | 无匹配会话 | 导入完整历史，新建会话 |
| 网络超时 | HTTP 超时 (10分钟) | 取消请求，返回 504 |

### 9.2 自愈机制

1. **自动重启** - Docker `restart: unless-stopped`
2. **健康检查** - 每 30 秒检查 Worker 健康
3. **冷却期** - Worker 故障后 60 秒内不调度
4. **自动禁用** - 连续 3 次失败后自动禁用账号

---

## 10. 与现有系统的差异

### 10.1 架构对比

| 维度 | 旧架构（推测） | 新架构 |
|------|---------------|--------|
| **网关入口** | 核心内置 ccgateway.Service | 标准插件 |
| **Worker 访问** | SSH + 文件通信 | HTTP + JSON |
| **账号绑定** | 虚拟 URL | 真实 Worker URL |
| **历史存储** | 核心管理？ | Worker 独立管理 |
| **容器管理** | 外部脚本 | Docker Compose |

### 10.2 兼容性

**向后兼容：**
- ✅ 账号数据结构（复用 `config` 字段）
- ✅ 网关调度逻辑（无需修改）
- ✅ 前端账号编辑器（JSON Schema 表单）

**不兼容：**
- ❌ 旧 Worker 通信协议（SSH + 文件 → HTTP）
- ❌ 核心 `ccgateway.Service`（需要移除或废弃）

---

## 11. 里程碑

### M1: Worker 改造 ✅

**目标：** Worker 从 SSH 工具改为 HTTP 服务

**交付：**
- ✅ HTTP Server（Gin）
- ✅ `/v1/messages` 端点
- ✅ `/health` 端点
- ✅ 历史匹配逻辑
- ✅ CLI 进程管理
- ✅ 单元测试覆盖率 > 80%

### M2: 插件开发 ✅

**目标：** CCGateway 插件实现账号路由

**交付：**
- ✅ Execute 实现
- ✅ ValidateCredentials 实现
- ✅ ClassifyError 实现
- ✅ workerMap 缓存机制
- ✅ 集成测试

### M3: 核心集成 ✅

**目标：** 核心支持新账号类型

**交付：**
- ✅ manifest.json 更新
- ✅ Host Service 扩展（如需要）
- ✅ 账号创建流程
- ✅ E2E 测试

### M4: 灰度验证 ✅

**目标：** OVH 环境验证

**交付：**
- ✅ 1 个测试账号
- ✅ 真实模型调用
- ✅ 性能和稳定性验证

### M5: 全量上线 ✅

**目标：** 100% 流量切换

**交付：**
- ✅ 所有账号迁移
- ✅ 旧架构下线
- ✅ 监控和告警

---

## 12. 附录

### 12.1 术语表

| 术语 | 说明 |
|------|------|
| **Worker** | CCGateway Worker 容器，执行 Claude Code 请求 |
| **核心** | sup2api-next 核心服务 |
| **插件** | CCGateway 插件，实现账号路由 |
| **账号** | sup2api 账号，对应一个 Worker 容器 |
| **历史匹配** | 匹配客户端消息历史到 Claude Code 原生会话 |
| **粘性会话** | 同一客户端固定使用同一账号 |

### 12.2 参考文档

- [01-DISCOVERY.md](./01-DISCOVERY.md) - 系统探索报告
- [11-CODE-CLEANUP.md](./11-CODE-CLEANUP.md) - 代码规范
- [09-ISSUES-AND-DECISIONS.md](./09-ISSUES-AND-DECISIONS.md) - 架构决策

---

**文档状态：** ✅ 完成  
**审阅状态：** 待审阅  
**最后更新：** 2026-10-07 01:45
