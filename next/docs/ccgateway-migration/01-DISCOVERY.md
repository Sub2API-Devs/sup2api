# CCGateway 系统探索报告

**文档版本：** 1.0  
**创建日期：** 2026-10-07  
**负责人：** architect agent  
**状态：** ✅ 完成

---

## 执行摘要

本报告详细探索了 sup2api-next 的现有系统架构，为 CCGateway 迁移项目提供技术基础。主要发现：

1. **账号体系完善** - 支持多插件、多类型账号，包含完整的调度和限流机制
2. **插件系统成熟** - gRPC 插件框架，支持账号类型注册、生命周期管理、权限控制
3. **CCGateway 插件已存在** - 当前实现为"虚拟 URL"模式，需要改造为真实 Worker 容器模式
4. **网关调度完整** - 支持账号选择、粘性会话、速率限制、故障转移
5. **需要新增** - Worker 容器管理、账号与容器绑定、历史会话管理

---

## 1. 账号体系分析

### 1.1 数据模型

#### 核心表结构（0001_core.sql）

```sql
CREATE TABLE accounts (
    id               bigserial PRIMARY KEY,
    name             varchar(100) NOT NULL,
    plugin_key       varchar(30)  NOT NULL,        -- 声明此账号类型的插件
    platform         varchar(50)  NOT NULL,        -- 平台 ID（如 "anthropic"）
    type             varchar(50)  NOT NULL,        -- 账号类型（如 "managed", "apikey"）
    credentials_enc  bytea        NOT NULL,        -- AES-GCM 加密的凭证 JSON
    settings         jsonb        NOT NULL DEFAULT '{}',  -- 非敏感设置
    proxy_id         bigint       REFERENCES proxies(id),
    status           varchar(20)  NOT NULL DEFAULT 'active',  -- active | disabled | error
    status_reason    text         NOT NULL DEFAULT '',
    schedulable      boolean      NOT NULL DEFAULT true,
    priority         int          NOT NULL DEFAULT 10,        -- 优先级（数字越小越优先）
    max_concurrency  int          NOT NULL DEFAULT 10,       -- 0 = 无限制
    last_used_at     timestamptz,
    created_by       bigint       REFERENCES users(id),
    created_at       timestamptz  NOT NULL DEFAULT now(),
    updated_at       timestamptz  NOT NULL DEFAULT now(),
    deleted_at       timestamptz
);
```

#### 扩展字段（通过迁移添加）

- **0009**: `models` (text[])、`model_mapping` (jsonb)、`rpm_limit`、`tpm_limit`、`weight`
- **0026**: `auto_disable` (boolean) - 是否自动禁用故障账号
- **0029**: `subscription_limits` (jsonb) - 订阅限额信息
- **0030**: `credentials_refresh_at` (timestamptz) - 凭证刷新时间
- **0031**: `last_test` (jsonb) - 最后一次测试结果
- **0032**: CCGateway 运行时绑定（独立表）

#### CCGateway 运行时表（0032_ccgateway_runtimes.sql）

```sql
CREATE TABLE ccgateway_runtimes (
  key          text PRIMARY KEY,              -- 运行时标识：账号 ID 或草稿 key (d+16hex)
  account_id   bigint UNIQUE REFERENCES accounts(id),
  proxy_id     bigint,
  created_by   bigint,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  adopted_at   timestamptz                    -- 草稿被采纳的时间
);
```

**关键发现：**
- 账号创建前可以启动"草稿"运行时（随机 key），用户在其中授权，保存账号时采纳
- 已采纳的账号继续使用草稿 key 作为运行时标识
- 未采纳的草稿由核心定期清理

### 1.2 账号引用结构（core/ports_identity.go）

```go
type AccountRef struct {
    ID             int64
    Name           string
    PluginKey      string   // 声明此账号类型的插件
    Type           string   // 账号类型 ID
    Priority       int      // 优先级（数字越小越优先）
    Weight         int      // 同优先级内的权重（1-1000）
    MaxConcurrency int      // 最大并发数
    ProxyID        *int64
    Models         []string          // 账号支持的模型列表（空 = 全部）
    ModelMapping   map[string]string // 模型映射（client model -> upstream model）
    RPMLimit       int               // 每分钟请求数限制（0 = 无限制）
    TPMLimit       int64             // 每分钟 token 数限制
}
```

**完整账号结构（带凭证）：**

```go
type Account struct {
    AccountRef
    Status      string          // active | disabled | error
    Credentials json.RawMessage // 解密后的凭证 JSON
    Settings    json.RawMessage // 非敏感设置 JSON
}
```

### 1.3 账号目录接口（core.AccountDirectory）

```go
type AccountDirectory interface {
    // Candidates 返回符合条件的候选账号（活跃、可调度、非冷却中）
    Candidates(ctx context.Context, groupID int64, types []AccountTypeKey) ([]AccountRef, error)
    
    // Load 返回单个账号（带解密凭证）
    Load(ctx context.Context, id int64) (*Account, error)
    
    // 冷却管理
    IsCoolingDown(ctx context.Context, id int64) (bool, error)
    SetCooldown(ctx context.Context, id int64, until time.Time, reason string) error
    
    // AutoDisable 自动禁用故障账号（除非账号设置了 auto_disable=false）
    AutoDisable(ctx context.Context, id int64, reason string) (bool, error)
    
    // 更新最后使用时间
    TouchLastUsed(ctx context.Context, id int64)
}
```

### 1.4 REST API 端点（CONTRACTS §5.4）

| 端点 | 权限 | 说明 |
|------|------|------|
| `GET /account-types` | `account:read` | 列出所有账号类型（来自插件注册表） |
| `GET /account-types/:platform/:type/form` | `account:read` | 获取账号创建表单 schema |
| `GET /accounts` | `account:read` | 列出账号（支持多种筛选） |
| `POST /accounts` | `account:create` | 创建账号 |
| `GET /accounts/:id` | `account:read` | 获取账号详情（敏感字段掩码） |
| `PATCH /accounts/:id` | `account:update` | 更新账号 |
| `DELETE /accounts/:id` | `account:delete` | 删除账号 |
| `POST /accounts/:id/test` | `account:test` | 测试账号连接 |
| `POST /accounts/:id/credentials/reveal` | `account:credential:view`🔐 | 查看明文凭证 |

**请求体示例（创建账号）：**

```json
{
  "name": "CC Worker 01",
  "plugin_key": "ccgateway",
  "type": "managed",
  "group_ids": [1],
  "proxy_id": null,
  "priority": 10,
  "weight": 100,
  "max_concurrency": 4,
  "schedulable": true,
  "auto_disable": true,
  "models": [],
  "model_mapping": {},
  "rpm_limit": 0,
  "tpm_limit": 0,
  "credentials": {},
  "settings": {}
}
```

### 1.5 账号选择与调度流程

**调度器位置：** `server/internal/gateway/scheduler.go`

**选择算法：**
1. 从 `AccountDirectory.Candidates` 获取候选账号
2. 过滤：
   - 状态 = active
   - schedulable = true
   - 不在冷却期
   - 模型匹配（`AccountRef.ServesModel`）
   - 并发未满
   - 速率限制未超
3. 排序：按 priority 升序，同优先级内按 weight 加权随机
4. 粘性会话：优先返回已绑定的账号
5. 故障转移：账号失败后进入冷却期，自动选择下一个

---

## 2. 插件系统分析

### 2.1 插件架构

**运行时：** go-plugin（gRPC 通信）  
**隔离：** 每个插件独立进程，通过 gRPC 与核心通信  
**生命周期：** GetInfo → InitHost → Configure → Health（周期） → Shutdown

### 2.2 插件 SDK 接口

#### PluginService（插件实现）

```protobuf
service PluginService {
  rpc GetInfo(GetInfoRequest) returns (GetInfoResponse);
  rpc InitHost(InitHostRequest) returns (InitHostResponse);
  rpc Configure(ConfigureRequest) returns (ConfigureResponse);
  rpc Health(HealthRequest) returns (HealthResponse);
  rpc Shutdown(ShutdownRequest) returns (ShutdownResponse);
}
```

#### PlatformAdapter（账号类型插件实现）

```protobuf
// 能力 ID: "platform.adapter.v1"
service PlatformAdapterService {
  // 验证并规范化凭证
  rpc ValidateCredentials(ValidateCredentialsRequest) 
      returns (ValidateCredentialsResponse);
  
  // 构建上游请求（网关调度时调用）
  rpc BuildUpstreamRequest(BuildUpstreamRequestRequest) 
      returns (BuildUpstreamRequestResponse);
  
  // 构建测试请求
  rpc BuildTestRequest(BuildTestRequestRequest) 
      returns (BuildTestRequestResponse);
  
  // 提取用量信息
  rpc ExtractUsage(ExtractUsageRequest) 
      returns (ExtractUsageResponse);
  
  // 分类错误（用于故障转移）
  rpc ClassifyError(ClassifyErrorRequest) 
      returns (ClassifyErrorResponse);
  
  // 拉取模型列表
  rpc FetchModels(FetchModelsRequest) 
      returns (FetchModelsResponse);
}
```

### 2.3 Host Service（核心提供给插件）

```protobuf
service HostService {
  // 日志
  rpc Log(LogRequest) returns (LogResponse);
  
  // KV 存储（Redis 后端，按插件隔离）
  rpc KVGet/KVSet/KVDelete/KVList
  
  // 数据库访问（插件独立 schema）
  rpc GetDSN(GetDSNRequest) returns (GetDSNResponse);
  
  // 权限检查
  rpc AuthzCheck(AuthzCheckRequest) returns (AuthzCheckResponse);
  
  // 账本操作（受授权范围限制）
  rpc LedgerCredit/LedgerDebit
  
  // 广播消息（跨节点）
  rpc Publish(PublishRequest) returns (PublishResponse);
  
  // 分布式锁
  rpc LockAcquire/LockRenew/LockRelease
  
  // 账号访问（仅自己声明的账号类型）
  rpc ListAccounts(ListAccountsRequest) returns (ListAccountsResponse);
  rpc GetAccountCredentials(GetAccountCredentialsRequest) 
      returns (GetAccountCredentialsResponse);  // 🔐 记录审计日志
  
  // 网络出口（沙箱模式）
  service EgressService {
    rpc Dial(stream EgressFrame) returns (stream EgressFrame);
  }
}
```

### 2.4 插件注册表（core.PluginRegistry）

```go
type Generation struct {
    Version       int64
    Plugins       []PluginInfo
    Platforms     []Platform
    EndpointBindings []EndpointBinding
    AccountTypes  []AccountTypeInfo
    // ...
}

type AccountTypeInfo struct {
    PluginKey    string
    Type         string
    Label        map[string]string
    Platforms    []string
    Form         FormConfig
    DefaultModels []string
    SensitiveFields []string
    // ...
}
```

**注册流程：**
1. 插件上传 → manifest 解析
2. 授权确认 → 安装
3. 启用 → 发布到各节点
4. 注册表更新 → 通知网关/账号模块
5. 账号类型出现在 `/account-types` API

### 2.5 现有插件参考

#### Anthropic 插件（plugins/anthropic/）

**账号类型：** `apikey`  
**平台：** `anthropic`（内置）  
**协议：** `anthropic.messages`、`anthropic.count_tokens`

**关键逻辑：**
- 凭证验证：`api_key` 必须以 `sk-ant-` 开头
- 上游请求构建：直接转发到 Anthropic API
- 错误分类：区分可重试、不可重试、速率限制

**文件结构：**
```
plugins/anthropic/
├── main.go
├── manifest.json
├── forms/
│   ├── apikey.schema.json
│   └── apikey.ui.json
└── internal/anthropic/
    ├── platform.go      # 插件入口、Init
    ├── execute.go       # BuildUpstreamRequest
    ├── classify.go      # ClassifyError
    └── models.go        # FetchModels
```

---

## 3. CCGateway 现状分析

### 3.1 当前实现

**插件路径：** `next/plugins/ccgateway/`  
**插件状态：** ✅ 已存在，版本 0.1.7  
**账号类型：** `managed`（OAuth）、`apikey`（API Key）

#### 当前 manifest.json 摘要

```json
{
  "key": "ccgateway",
  "version": "0.1.7",
  "runtime": "grpc",
  "hostCompat": ">=0.1.18 <0.2.0",
  "capabilities": ["platform.adapter.v1"],
  "accountTypes": [
    {
      "id": "managed",
      "platforms": [{"platform": "anthropic"}],
      "authMethodLabel": {"en": "OAuth authorization code"}
    },
    {
      "id": "apikey",
      "platforms": [{"platform": "anthropic"}],
      "sensitiveFields": ["api_key"],
      "authMethodLabel": {"en": "API Key"}
    }
  ],
  "hostPermissions": [
    {"id": "platform.register"},
    {"id": "accounts.credentials", "scope": {"types": "own"}}
  ]
}
```

### 3.2 当前架构（"虚拟 URL"模式）

**问题：** 当前实现使用虚拟 URL `https://ccgateway.internal/v1/messages`，核心需要特殊处理。

**ccgateway.go 当前实现：**

```go
const (
    VirtualURL = "https://ccgateway.internal/v1/messages"
)

func (p *Plugin) BuildUpstreamRequest(...) (*pluginv1.BuildUpstreamRequestResponse, error) {
    // 返回虚拟 URL，核心拦截并特殊处理
    return &pluginv1.BuildUpstreamRequestResponse{
        Method: "POST",
        Url:    VirtualURL,  // ← 不是真实 Worker URL
        Headers: outHeaders,
        UpstreamModel: model,
    }, nil
}
```

**网关集成（gateway/gateway.go）：**

```go
type Deps struct {
    CCGateway *ccgateway.Service  // ← 核心的 CCGateway 服务
    // ...
}
```

**核心服务（server/internal/ccgateway/）：**

```go
// 负责：
// - SSH 连接到远程 CC 实例
// - 执行 claude agent exec
// - 会话历史管理
// - OAuth 授权流程
```

### 3.3 问题诊断

| 问题 | 现状 | 影响 |
|------|------|------|
| **架构耦合** | 核心内置 `ccgateway.Service` | 违反插件独立性原则 |
| **虚拟 URL** | 插件返回虚拟 URL，核心特殊处理 | 网关需要硬编码逻辑 |
| **无容器化** | SSH 连接到远程主机 | 不符合"每账号一容器"需求 |
| **Worker 管理** | 手动启动远程进程 | 无自动化、无隔离 |
| **会话存储** | 核心管理历史文件 | 跨账号冲突风险 |

### 3.4 迁移需求

**必须改变：**
1. ✅ 移除核心的 `ccgateway.Service`
2. ✅ 插件返回真实 Worker URL（而非虚拟 URL）
3. ✅ Worker 以容器方式运行（每账号一个）
4. ✅ 历史文件由 Worker 独立管理

**可以保留：**
1. ✅ 插件注册表机制
2. ✅ 账号类型定义（`managed`、`apikey`）
3. ✅ 凭证验证逻辑
4. ✅ ccgateway_runtimes 表（用于草稿授权流程）

---

## 4. 网关与调度流程

### 4.1 请求处理流程

```
Client Request
    ↓
[1] 网关中间件（gateway.Middleware）
    ↓
[2] API Key 认证（Auth）
    ↓
[3] 计费检查（Balance.CheckBalance）
    ↓
[4] 粘性会话查找（sticky sessions）
    ↓
[5] 账号调度（scheduler.SelectAccount）
    │   ├→ Candidates（筛选候选账号）
    │   ├→ 过滤（并发、限流、模型）
    │   └→ 排序（优先级、权重）
    ↓
[6] 插件调用（plugin.BuildUpstreamRequest）
    ↓
[7] HTTP 转发（http.Client.Do）
    ↓
[8] 用量提取（plugin.ExtractUsage）
    ↓
[9] 结算（Settler.Settle）
    ↓
[10] 响应返回
```

### 4.2 粘性会话

**实现位置：** `server/internal/gateway/sticky.go`

**Redis Key：** `sticky:{rule_name}:{session_key}` → `account_id`  
**TTL：** 可配置，默认 3600 秒

**匹配逻辑：**
```go
type StickyMatch struct {
    UserID   *int64
    GroupID  *int64
    Model    *string  // glob 匹配
    Platform *string
}

type StickyKeySource struct {
    Kind  string  // "header" | "field"
    Name  string  // 请求头名称或请求字段名
    Path  string  // JSON 路径（可选）
}
```

**示例规则：**
```json
{
  "name": "ccgateway-sessions",
  "match": {"platform": "anthropic"},
  "key_sources": [
    {"kind": "header", "name": "x-ccgateway-session-id"}
  ],
  "ttl_seconds": 7200,
  "on_failure": "failover"
}
```

### 4.3 故障转移

**错误分类（plugin.ClassifyError）：**
- `RETRYABLE` - 可在同一账号重试
- `FAILOVER` - 切换到其他账号
- `FINAL` - 直接返回给客户端

**冷却机制：**
- 账号失败后进入冷却期（默认 60 秒）
- 冷却期内不会被调度选中
- 自动恢复或管理员手动解除

**自动禁用（§42.3）：**
- 连续失败达到阈值 → 自动设置 `status=disabled`
- 可通过 `auto_disable=false` 关闭

---

## 5. 数据流分析

### 5.1 账号创建流程

```
[前端] POST /accounts
    ↓
[A2 resources] account.Service.Create
    ↓
[验证] plugin.ValidateCredentials
    ↓
[加密] AES-GCM 加密凭证
    ↓
[存储] INSERT accounts + account_groups
    ↓
[事件] Emit("account.created")
    ↓
[广播] Bus.Publish("config:changed")
    ↓
[缓存失效] AccountDirectory 刷新快照
```

### 5.2 网关请求流程（详细）

```
[网关] 接收 POST /v1/messages
    ↓
[认证] 解析 API Key → user_id, group_id
    ↓
[计费] 检查余额（预扣费模式可选）
    ↓
[粘性] 查询 Redis sticky:{rule}:{session_id}
    ↓     ├→ 命中：返回 account_id
    ↓     └→ 未命中：继续调度
    ↓
[调度] AccountDirectory.Candidates(group_id, ["anthropic:managed"])
    ↓     ├→ 筛选：active, schedulable, not cooling
    ↓     ├→ 过滤：model match, concurrency, rate limit
    ↓     └→ 排序：priority asc, weight random
    ↓
[选中] account_id = 123
    ↓
[加载] AccountDirectory.Load(123) → Account{凭证已解密}
    ↓
[插件] plugin.BuildUpstreamRequest
    │       ├→ 输入：Account, 请求字段, 请求头
    │       └→ 输出：Method, URL, Headers, Body
    ↓
[代理] ProxyDirectory.HTTPClient(account.ProxyID)
    ↓
[转发] HTTP POST {URL}
    │       ├→ 请求头：插件构建的 Headers
    │       ├→ 请求体：客户端原始 Body（或插件修改）
    │       └→ 超时：可配置
    ↓
[响应] 读取上游响应
    │     ├→ 2xx：成功
    │     ├→ 4xx：客户端错误
    │     ├→ 5xx：服务端错误
    │     └→ 429：速率限制
    ↓
[用量] plugin.ExtractUsage → {input_tokens, output_tokens, ...}
    ↓
[结算] Settler.Settle
    │       ├→ 查询价格表
    │       ├→ 计算费用
    │       ├→ 扣费
    │       └→ 写入 usage_logs
    ↓
[粘性] 更新 Redis sticky key（如果是新绑定）
    ↓
[返回] 流式或一次性返回给客户端
```

---

## 6. 关键约束与要求

### 6.1 架构约束

1. **模块隔离** - 模块间只通过 `core` 接口依赖，不直接 import 彼此的包
2. **插件独立** - 插件运行在独立进程，通过 gRPC 通信
3. **账号生存** - 账号数据不随插件卸载而删除（显示为 orphaned）
4. **无全局变量** - 依赖注入，所有依赖通过构造函数传入
5. **沙箱网络** - 插件网络访问通过 EgressService（可选严格模式）

### 6.2 数据约束

1. **凭证加密** - AES-GCM，AAD = `"account-credentials:"+id`
2. **ID 类型** - int64（PostgreSQL bigserial）
3. **金额格式** - `numeric(20,8)` USD，Go 侧用 `decimal.Decimal`
4. **时间格式** - `timestamptz`（UTC），API 返回 RFC 3339 字符串
5. **JSON 字段** - snake_case，多语言文本 `{"en": "...", "zh": "..."}`

### 6.3 性能要求

1. **账号缓存** - `AccountDirectory` 维护每节点快照，配置变更时失效
2. **粘性查询** - Redis 单次查询，TTL 默认 3600 秒
3. **并发控制** - `Slots` 服务跟踪实时并发，基于内存计数器
4. **速率限制** - Redis 滑动窗口，1 分钟粒度
5. **响应超时** - 网关请求默认 10 分钟，LLM 推理可能很长

### 6.4 安全要求

1. **权限检查** - 每个 API 端点检查 JWT + RBAC 权限
2. **凭证查看** - `account:credential:view`🔐 权限 + 审计日志
3. **敏感字段** - manifest 声明 `sensitiveFields`，API 返回 `"******"`
4. **代理隔离** - 每个账号可配置独立代理
5. **SSRF 防护** - 禁止访问私有 IP（可选关闭）

---

## 7. 技术栈

### 7.1 后端

- **语言：** Go 1.27
- **框架：** Gin（HTTP）、gRPC、go-plugin
- **数据库：** PostgreSQL 16
- **缓存：** Redis / Valkey 9
- **ORM：** 无（使用 pgx 直接查询）
- **测试：** Go 标准库 testing + testpg（嵌入式 PG）

### 7.2 前端

- **框架：** Vue 3
- **构建：** Vite
- **语言：** TypeScript
- **UI：** Element Plus（推测）

### 7.3 部署

- **容器：** Docker + Docker Compose
- **编排：** 多节点手动部署（未使用 Kubernetes）
- **CI：** GitHub Actions
- **镜像：** GHCR / 本地构建

---

## 8. 差距分析

### 8.1 当前缺失的功能

| 功能 | 现状 | 需要实现 |
|------|------|----------|
| **Worker 容器管理** | ❌ 不存在 | 容器生命周期管理、自动启动/停止 |
| **账号-容器绑定** | ❌ 虚拟 URL | 真实 Worker URL 存储与查询 |
| **容器授权流程** | ✅ 草稿机制已有 | 需要容器内授权接口 |
| **历史会话管理** | ❌ 核心管理 | Worker 独立管理历史文件 |
| **Worker 健康检查** | ❌ 不存在 | HTTP 健康端点 |
| **Worker 指标上报** | ❌ 不存在 | 容器运行状态、资源使用 |

### 8.2 需要改造的模块

| 模块 | 改造内容 | 优先级 |
|------|----------|--------|
| **ccgateway 插件** | 从虚拟 URL 改为查询真实 Worker URL | 🔴 高 |
| **核心 ccgateway 服务** | 移除或重构为 Worker 管理器 | 🔴 高 |
| **网关** | 移除虚拟 URL 特殊处理 | 🟡 中 |
| **账号表** | 增加 `config` 字段存储 `worker_url` | 🔴 高 |
| **Worker 容器** | 从 SSH 工具改为 HTTP 服务 | 🔴 高 |

### 8.3 可复用的组件

| 组件 | 当前状态 | 如何复用 |
|------|----------|----------|
| **插件框架** | ✅ 成熟 | 直接使用，无需修改 |
| **账号调度器** | ✅ 完整 | 直接使用，支持新账号类型 |
| **粘性会话** | ✅ 可用 | 配置 CCGateway 粘性规则 |
| **凭证加密** | ✅ 标准 | 存储 Worker URL 或授权信息 |
| **运行时表** | ✅ 已有 | 存储账号-容器绑定关系 |
| **前端账号编辑器** | ✅ 通用 | 支持任意 JSON Schema 表单 |

---

## 9. 关键发现

### 9.1 正面发现

1. **插件系统成熟** - gRPC 插件框架设计完善，支持热重载、权限控制、沙箱隔离
2. **账号体系完整** - 支持多插件、多类型、多分组，调度逻辑健壮
3. **已有基础设施** - ccgateway_runtimes 表、草稿授权流程已实现
4. **网关可扩展** - 无需修改核心网关代码，插件返回真实 URL 即可

### 9.2 挑战

1. **架构重构** - 需要移除核心内置的 `ccgateway.Service`
2. **URL 查询** - 插件需要从账号 config 读取 `worker_url`
3. **容器管理** - 需要新增 Worker 容器生命周期管理
4. **历史迁移** - 现有会话历史如何迁移到新架构

### 9.3 风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 破坏现有 CCGateway | 中 | 高 | 灰度部署，保留旧实现直到验证通过 |
| Worker URL 查询性能 | 低 | 中 | 插件侧缓存映射关系 |
| 会话历史丢失 | 中 | 中 | 首次导入机制，prefix-hit 缓存 |
| 容器管理复杂度 | 高 | 低 | 提供管理脚本，文档化操作流程 |

---

## 10. 建议

### 10.1 短期建议（本期实现）

1. ✅ **保留运行时表** - `ccgateway_runtimes` 用于存储账号-容器绑定
2. ✅ **在账号 config 存储 `worker_url`** - 避免新增表，利用现有字段
3. ✅ **插件侧缓存** - 启动时预加载所有 CCGateway 账号的 URL 映射
4. ✅ **渐进式重构** - 先实现新架构，旧架构保留回滚能力

### 10.2 长期建议（未来优化）

1. **自动化容器管理** - 集成 Docker API，账号创建时自动启动容器
2. **Kubernetes 支持** - 每个账号一个 Pod，利用 K8s 调度和监控
3. **会话历史共享** - 考虑共享存储（S3）或数据库存储历史
4. **Worker 指标集成** - Worker 上报指标到核心监控系统

---

## 11. 附录

### 11.1 关键文件清单

| 文件 | 说明 |
|------|------|
| `next/docs/CONTRACTS.md` | 系统契约文档 |
| `next/server/internal/core/ports_identity.go` | 账号相关接口定义 |
| `next/server/internal/migrations/0001_core.sql` | 核心表结构 |
| `next/server/internal/migrations/0032_ccgateway_runtimes.sql` | CCGateway 运行时表 |
| `next/sdk/proto/sub2api/plugin/v1/host.proto` | Host Service 定义 |
| `next/sdk/proto/sub2api/plugin/v1/plugin.proto` | Plugin Service 定义 |
| `next/plugins/ccgateway/manifest.json` | CCGateway 插件清单 |
| `next/plugins/ccgateway/internal/ccgateway/ccgateway.go` | CCGateway 当前实现 |
| `next/plugins/anthropic/` | 参考插件实现 |
| `next/server/internal/gateway/gateway.go` | 网关入口 |
| `next/server/internal/gateway/scheduler.go` | 账号调度器 |
| `next/server/internal/ccgateway/` | 核心 CCGateway 服务（待移除） |

### 11.2 术语表

| 术语 | 定义 |
|------|------|
| **Plugin** | 插件，运行在独立进程的功能模块 |
| **Account Type** | 账号类型，由插件声明（如 "apikey", "managed"） |
| **Platform** | 平台，LLM 提供商（如 "anthropic", "openai"） |
| **Protocol** | 协议，API 端点类型（如 "anthropic.messages"） |
| **AccountRef** | 账号引用，不含凭证的账号元数据 |
| **Account** | 完整账号，包含解密后的凭证 |
| **Worker** | Claude Code CLI 执行器容器 |
| **Runtime** | 运行时，账号对应的 Worker 容器实例 |
| **Sticky Session** | 粘性会话，同一会话绑定到同一账号 |
| **Generation** | 插件注册表版本快照 |
| **Manifest** | 插件清单，声明能力、账号类型、权限需求 |

---

**报告完成时间：** 2026-10-07  
**下一步：** 创建目标架构设计文档（02-ARCHITECTURE.md）
