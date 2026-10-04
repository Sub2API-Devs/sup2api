# sup2api-next 订阅限额查询设计方案

## 1. sub2api (new-api) 实现分析

### 1.1 核心概念

new-api 实现了一个完整的 **API 订阅套餐 (API Subscription)** 系统，用于管理编程订阅计划（如 Kimi CodingPlan、智谱 GLM CodingPlan 等）的限额查询与自动管理。

### 1.2 数据结构

#### 限额窗口 (Window)
```go
type Window struct {
    Label   string `json:"label"`       // 显示标签，如 "5h", "1w"
    Seconds int64  `json:"seconds"`     // 窗口时长（秒）
    Used    int64  `json:"used"`        // 已使用量
    Limit   int64  `json:"limit"`       // 限额
    ResetAt int64  `json:"reset_at"`    // 重置时间（Unix秒）
}
```

#### 密钥状态 (KeyState)
```go
type KeyState struct {
    Windows    []Window `json:"windows"`         // 多个限额窗口
    UpdatedAt  int64    `json:"updated_at"`      // 最后查询时间
    ResumeAt   int64    `json:"resume_at"`       // 自动恢复时间
    DisabledAt int64    `json:"disabled_at"`     // 禁用时间
}
```

#### 快照 (Snapshot)
```go
type Snapshot struct {
    KeyState                           // 单密钥账号直接使用
    Keys map[int]*KeyState             // 多密钥账号：索引 -> 状态
}
```

### 1.3 查询策略

#### 查询时机
1. **余额查询**：用户/管理员手动触发
2. **限额耗尽**：收到 403 限额错误时立即查询
3. **自动恢复**：定时扫描（1分钟间隔）检查需要恢复的账号

#### 缓存机制
- **存储位置**：`channel.other_info` JSON 字段中的 `coding_plan_usage` 键
- **缓存内容**：完整的 Snapshot（包含所有窗口、时间戳、恢复标记）
- **缓存策略**：
  - 查询成功后立即更新快照
  - 快照包含 `UpdatedAt` 时间戳
  - **不依赖 TTL**，而是按需查询（403 触发、手动查询、定时恢复）
  - 避免频繁查询的关键：**防抖窗口** (30秒)

#### 防抖机制
```go
const handleDebounceWindow = 30 * time.Second

// lastHandled 记录每个 channelId:keyIndex 的最后处理时间
var lastHandled sync.Map // "channelId:keyIndex" -> unix seconds
```

当收到 403 限额错误时：
1. 检查该账号+密钥在过去 30 秒内是否已处理
2. 已处理则跳过，避免并发请求重复查询
3. 未处理则查询限额并更新快照

### 1.4 限额 API 调用

#### Kimi CodingPlan 示例
```go
// 端点
usagesEndpoint = "https://api.kimi.com/coding/v1/usages"

// 请求
GET /coding/v1/usages
Authorization: Bearer {api_key}

// 响应
{
    "usage": {                    // 周限额（顶层汇总）
        "used": 12000,
        "limit": 50000,
        "resetTime": "2024-10-11T00:00:00Z"
    },
    "limits": [                   // 详细窗口列表
        {
            "window": {"duration": 5, "timeUnit": "TIME_UNIT_HOUR"},
            "detail": {"used": 3000, "limit": 10000, "resetTime": 1728640000}
        },
        {
            "window": {"duration": 1, "timeUnit": "TIME_UNIT_WEEK"},
            "detail": {"used": 12000, "limit": 50000, "resetTime": "2024-10-11T00:00:00Z"}
        }
    ]
}
```

#### 错误检测
限额耗尽的特征（403 错误）：
```go
// 错误类型匹配
relayErr.Type == "access_terminated_error"

// 或消息匹配
strings.Contains(apiErr.Error(), "reached your usage limit")
```

### 1.5 重置逻辑

#### 手动重置（管理员）
- `AdminResetUserSubscriptionsByPlan(userId, planId, advanceResetTime)`：重置用户的特定套餐
- `AdminResetPlanSubscriptions(planId, advanceResetTime)`：重置套餐的所有订阅
- `advanceResetTime=true` 时推进 `NextResetTime`

#### 自动恢复流程
1. **定时扫描**：每分钟检查 `ResumeAt <= now()` 的账号
2. **重新查询**：调用限额 API 获取最新状态
3. **判断恢复**：
   - 任意窗口仍耗尽 → 推迟恢复时间，继续等待
   - 所有窗口已重置 → 启用账号，清除恢复标记
4. **失败处理**：
   - 凭证被拒（401/403）→ 保持禁用，清除定时器
   - 临时失败 → Fail-open：启用账号，下次 403 再禁用

---

## 2. sup2api-next 设计方案

### 2.1 目标与差异

#### 核心差异
| 维度 | new-api | sup2api-next |
|------|---------|--------------|
| 账号类型 | Channel（渠道） | Account（账号） |
| 订阅判定 | `other_settings.moonshot_coding_plan` | 账号类型元数据标记 |
| 限额存储 | `channel.other_info` JSON | 新增 `account_subscription_limits` 表 |
| 自动禁用 | 内置流程 | 已有 `status` 字段 + 插件控制 |
| 插件架构 | 单体 | 插件隔离，核心不感知具体供应商 |

#### sup2api-next 的需求
1. **账号类型区分**：
   - API Key 类型：无限额，不查询
   - 订阅类型：记录多个限额窗口（周限制、5小时限制、周 Fable 限制等）
2. **缓存要求**：不频繁查询，防抖机制
3. **重置能力**：管理员可清除缓存、强制重新查询
4. **插件无关**：核心定义接口，插件实现具体查询逻辑

### 2.2 数据模型

#### 2.2.1 账号表扩展（不推荐）
不建议在 `accounts` 表新增字段：
- ❌ 破坏表结构简洁性
- ❌ JSON 字段不利于查询过滤
- ❌ 限额数据属于临时缓存性质

#### 2.2.2 独立限额表（推荐）

**新增迁移：`0029_account_subscription_limits.sql`**

```sql
-- 账号订阅限额缓存表
CREATE TABLE account_subscription_limits (
    account_id      bigint       PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    
    -- 快照数据（JSON）
    limits_snapshot jsonb        NOT NULL DEFAULT '{}',
    -- 结构示例：
    -- {
    --   "windows": [
    --     {"label": "5h", "seconds": 18000, "used": 3000, "limit": 10000, "reset_at": 1728640000},
    --     {"label": "1w", "seconds": 604800, "used": 12000, "limit": 50000, "reset_at": 1728691200}
    --   ],
    --   "updated_at": 1728635000,
    --   "provider": "kimi-coding-plan"
    -- }
    
    -- 自动恢复标记
    disabled_at     timestamptz,
    resume_at       timestamptz,
    
    -- 元数据
    last_queried_at timestamptz  NOT NULL DEFAULT now(),
    query_count     int          NOT NULL DEFAULT 0,
    last_error      text         NOT NULL DEFAULT '',
    
    created_at      timestamptz  NOT NULL DEFAULT now(),
    updated_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX account_subscription_limits_resume_idx 
    ON account_subscription_limits (resume_at) 
    WHERE resume_at IS NOT NULL;

-- 防抖记录表（可选，也可用内存 Map）
CREATE TABLE account_limit_queries (
    account_id  bigint      NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    queried_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (account_id, queried_at)
);

-- 清理旧防抖记录的索引（保留 1 小时内）
CREATE INDEX account_limit_queries_cleanup_idx 
    ON account_limit_queries (queried_at);
```

### 2.3 API 设计

#### 2.3.1 查询限额

**端点**：`GET /api/accounts/:id/subscription/limits`

**权限**：需要 `account:test` 权限（与余额查询同级）

**查询参数**：
- `force=true`：强制重新查询（忽略缓存，受防抖保护）

**响应示例**：
```json
{
  "account_id": 123,
  "has_limits": true,
  "windows": [
    {
      "label": "5h",
      "seconds": 18000,
      "used": 3000,
      "limit": 10000,
      "used_percent": 30.0,
      "remaining_percent": 70.0,
      "reset_at": "2024-10-11T12:00:00Z",
      "exhausted": false
    },
    {
      "label": "1w",
      "seconds": 604800,
      "used": 48000,
      "limit": 50000,
      "used_percent": 96.0,
      "remaining_percent": 4.0,
      "reset_at": "2024-10-14T00:00:00Z",
      "exhausted": false
    }
  ],
  "any_exhausted": false,
  "tightest_window": {
    "label": "1w",
    "remaining_percent": 4.0
  },
  "last_queried_at": "2024-10-10T10:30:00Z",
  "provider": "kimi-coding-plan",
  "auto_resume_at": null
}
```

**错误响应**：
```json
{
  "code": "UNSUPPORTED",
  "message": "This account type does not support subscription limits"
}
```

#### 2.3.2 重置限额缓存

**端点**：`POST /api/accounts/:id/subscription/limits/reset`

**权限**：需要 `account:update` 权限（管理员操作）

**请求体**：
```json
{
  "clear_markers": true,  // 清除自动恢复标记
  "refetch": true         // 立即重新查询
}
```

**响应**：
```json
{
  "success": true,
  "refetched": true,
  "windows": [...]  // 如果 refetch=true，返回新数据
}
```

### 2.4 查询流程

#### 2.4.1 查询决策树

```
用户调用 GET /accounts/:id/subscription/limits
    ↓
检查账号类型
    ↓
┌─────────────────┬─────────────────┐
│ API Key 类型     │ 订阅类型         │
└─────────────────┴─────────────────┘
        ↓                    ↓
  返回 has_limits=false    查询缓存
                            ↓
                   ┌────────────────┐
                   │ 缓存存在且新鲜？│
                   └────────────────┘
                      ↓           ↓
                    是（<5分钟）   否
                      ↓           ↓
                  返回缓存      检查防抖
                                  ↓
                          ┌───────────────┐
                          │最近30秒查询过？│
                          └───────────────┘
                            ↓           ↓
                           是          否
                            ↓           ↓
                        返回旧缓存    调用插件查询
                                          ↓
                                      更新缓存
                                          ↓
                                      返回新数据
```

#### 2.4.2 缓存新鲜度判断
- **新鲜**：`last_queried_at` 在 5 分钟内
- **可用**：10 分钟内
- **过期**：超过 10 分钟

强制查询 (`force=true`) 忽略新鲜度，但仍受防抖保护。

### 2.5 插件接口设计

#### 2.5.1 RPC 方法

在插件 SDK 中新增（`sdk/gen/pluginv1/plugin.proto`）：

```protobuf
service AccountPlugin {
    // ... 现有方法 ...
    
    // QuerySubscriptionLimits 查询订阅账号的限额窗口
    rpc QuerySubscriptionLimits(QuerySubscriptionLimitsRequest) 
        returns (QuerySubscriptionLimitsResponse);
}

message QuerySubscriptionLimitsRequest {
    int64 account_id = 1;
    string account_name = 2;
    string account_type = 3;
    string credentials_json = 4;  // 解密后的凭证
    string settings_json = 5;     // 账号设置
    string proxy_url = 6;         // 代理（如有）
}

message SubscriptionWindow {
    string label = 1;          // "5h", "1w", "daily_fable" 等
    int64 seconds = 2;         // 窗口时长（秒）
    int64 used = 3;           // 已使用
    int64 limit = 4;          // 限额
    int64 reset_at = 5;       // 重置时间（Unix 秒）
}

message QuerySubscriptionLimitsResponse {
    repeated SubscriptionWindow windows = 1;
    string provider = 2;       // 供应商标识，如 "kimi-coding-plan"
    string error_type = 3;     // 错误类型："" | "auth_rejected" | "transient"
    string error_message = 4;
}
```

#### 2.5.2 账号类型元数据

在插件 manifest 中标记支持限额查询：

```yaml
accountTypes:
  - id: kimi-coding-plan
    platform: moonshot
    name:
      en: Kimi CodingPlan
      zh: Kimi 编程订阅
    credentialSchema: [...]
    features:
      subscription_limits: true  # 标记支持限额查询
      limit_windows:             # 说明限额窗口类型（文档用）
        - "5h"
        - "1w"
```

### 2.6 实现计划

#### 阶段 1：数据层（1-2 天）
- [ ] 创建迁移 `0029_account_subscription_limits.sql`
- [ ] 实现数据访问层：
  - `GetAccountLimits(accountID) -> *LimitsSnapshot`
  - `UpsertAccountLimits(accountID, snapshot)`
  - `ClearAccountLimits(accountID)`
  - `ListAccountsDueForResume() -> []*Account`

#### 阶段 2：插件协议（1 天）
- [ ] 更新 `plugin.proto` 添加 `QuerySubscriptionLimits` 方法
- [ ] 生成 Go/TypeScript 代码
- [ ] 更新 SDK 文档

#### 阶段 3：核心服务（2-3 天）
- [ ] 实现防抖机制（内存 sync.Map 或 Redis）
- [ ] 实现查询服务 `QueryAccountLimits(ctx, accountID, force)`：
  - 检查账号类型
  - 缓存判断
  - 防抖检查
  - 调用插件 RPC
  - 更新快照
- [ ] 实现 HTTP 处理器：
  - `GET /accounts/:id/subscription/limits`
  - `POST /accounts/:id/subscription/limits/reset`

#### 阶段 4：自动恢复（可选，2 天）
- [ ] 后台定时任务（1 分钟间隔）
- [ ] 扫描 `resume_at <= now()` 的账号
- [ ] 重新查询限额
- [ ] 判断是否恢复（所有窗口未耗尽）
- [ ] 更新账号状态

#### 阶段 5：插件实现（每个 1-2 天）
- [ ] Kimi CodingPlan 插件：
  - 实现 `QuerySubscriptionLimits` RPC
  - 调用 `https://api.kimi.com/coding/v1/usages`
  - 解析响应并转换为标准 Window 格式
- [ ] 其他订阅类型插件（按需）

#### 阶段 6：前端集成（1-2 天）
- [ ] 账号详情页显示限额信息
- [ ] 限额图表（环形进度图）
- [ ] 重置按钮
- [ ] 自动恢复倒计时

### 2.7 代码示例

#### 核心服务伪代码

```go
// internal/account/limits.go

type LimitsWindow struct {
    Label            string    `json:"label"`
    Seconds          int64     `json:"seconds"`
    Used             int64     `json:"used"`
    Limit            int64     `json:"limit"`
    ResetAt          time.Time `json:"reset_at"`
    UsedPercent      float64   `json:"used_percent"`
    RemainingPercent float64   `json:"remaining_percent"`
    Exhausted        bool      `json:"exhausted"`
}

type LimitsSnapshot struct {
    AccountID      int64          `json:"account_id"`
    HasLimits      bool           `json:"has_limits"`
    Windows        []LimitsWindow `json:"windows"`
    AnyExhausted   bool           `json:"any_exhausted"`
    TightestWindow *LimitsWindow  `json:"tightest_window"`
    LastQueriedAt  time.Time      `json:"last_queried_at"`
    Provider       string         `json:"provider"`
    AutoResumeAt   *time.Time     `json:"auto_resume_at"`
}

func (s *Service) QueryAccountLimits(ctx context.Context, accountID int64, force bool) (*LimitsSnapshot, error) {
    // 1. 加载账号
    acct, err := s.loadRow(ctx, s.d.DB.Pool, accountID, core.OwnerScope(ctx, "account:test"), false)
    if err != nil {
        return nil, err
    }
    
    // 2. 检查账号类型是否支持限额
    bt, ok := s.accountType(acct.PluginKey, acct.Type)
    if !ok || bt.Client == nil {
        return nil, core.ErrPluginUnavailable
    }
    if !bt.Type.Features.SubscriptionLimits {
        return &LimitsSnapshot{AccountID: accountID, HasLimits: false}, nil
    }
    
    // 3. 检查缓存（force=false 且缓存新鲜）
    if !force {
        cached, err := s.d.DB.GetAccountLimits(ctx, accountID)
        if err == nil && cached != nil && time.Since(cached.LastQueriedAt) < 5*time.Minute {
            return cached, nil
        }
    }
    
    // 4. 防抖检查
    debounceKey := fmt.Sprintf("limits:query:%d", accountID)
    if !s.acquireDebounce(debounceKey, 30*time.Second) {
        // 返回旧缓存（如果存在）
        cached, _ := s.d.DB.GetAccountLimits(ctx, accountID)
        if cached != nil {
            return cached, nil
        }
        return nil, core.ErrTooManyRequests.WithMessage("Please wait before querying again")
    }
    defer s.releaseDebounce(debounceKey)
    
    // 5. 解密凭证
    plain, err := s.decrypt(acct.PluginKey, acct.CredEnc)
    if err != nil {
        return nil, err
    }
    
    // 6. 调用插件 RPC
    ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
    defer cancel()
    
    resp, err := bt.Client.QuerySubscriptionLimits(ctx, &pluginv1.QuerySubscriptionLimitsRequest{
        AccountId:       accountID,
        AccountName:     acct.Name,
        AccountType:     acct.Type,
        CredentialsJson: string(plain),
        SettingsJson:    string(acct.Settings),
        ProxyUrl:        s.getProxyURL(ctx, acct.ProxyID),
    })
    if err != nil {
        return nil, err
    }
    
    // 7. 转换并保存快照
    snapshot := s.buildSnapshot(accountID, resp)
    if err := s.d.DB.UpsertAccountLimits(ctx, snapshot); err != nil {
        return nil, err
    }
    
    return snapshot, nil
}

func (s *Service) acquireDebounce(key string, window time.Duration) bool {
    now := time.Now().Unix()
    if lastVal, ok := s.debounceMap.Load(key); ok {
        last := lastVal.(int64)
        if now-last < int64(window.Seconds()) {
            return false
        }
    }
    s.debounceMap.Store(key, now)
    return true
}
```

---

## 3. 风险评估

### 3.1 性能影响

| 风险项 | 影响 | 缓解措施 |
|--------|------|----------|
| 频繁查询上游 API | 限流、账号封禁 | 5分钟缓存 + 30秒防抖 |
| 数据库写入压力 | 每次查询写 1 行 | 缓存表索引优化、批量清理旧记录 |
| RPC 调用延迟 | 查询接口响应慢 | 15秒超时、异步后台刷新（可选） |

### 3.2 数据一致性

| 风险项 | 影响 | 缓解措施 |
|--------|------|----------|
| 缓存过期 | 显示过时限额 | 标记 `last_queried_at`，UI 显示时效 |
| 并发查询 | 重复请求上游 | 防抖 Map + 数据库 UNIQUE 约束 |
| 插件故障 | 无法获取限额 | 降级：返回旧缓存 + 错误提示 |

### 3.3 错误处理

#### 插件返回错误类型
1. **`auth_rejected`**：凭证失效（401/403）
   - 标记账号状态为 `error`
   - 清除自动恢复标记
   - 通知用户更新凭证

2. **`transient`**：临时故障（超时、500 等）
   - 保留旧缓存
   - 记录 `last_error`
   - 下次请求重试

3. **空响应**：上游不支持
   - 返回 `UNSUPPORTED` 错误
   - 更新账号类型元数据（取消 `subscription_limits` 标记）

---

## 4. 与 new-api 的对比

| 维度 | new-api | sup2api-next |
|------|---------|--------------|
| **数据存储** | JSON 字段 (`other_info`) | 独立表 (`account_subscription_limits`) |
| **缓存策略** | 无 TTL，按需查询 | 5分钟新鲜期 + 30秒防抖 |
| **查询触发** | 403 错误、手动、定时恢复 | 手动查询（API 调用） |
| **自动恢复** | 内置后台任务 | 可选实现（阶段 4） |
| **插件支持** | 硬编码 Provider 接口 | 通用 RPC 协议 |
| **多密钥** | 支持（per-key 状态） | 暂不支持（单账号级别） |
| **错误重写** | 403 → 429（对客户端） | 不涉及（不处理转发） |

---

## 5. 后续扩展

### 5.1 告警机制
- 限额使用率 > 80% 时发送通知
- 接近耗尽时提前禁用账号（预留缓冲）

### 5.2 多密钥支持
- 为多密钥账号（如轮询池）提供 per-key 限额
- 快照结构扩展为 `{"keys": {0: {...}, 1: {...}}}`

### 5.3 历史趋势
- 新表 `account_limit_history` 记录每次查询的快照
- 生成使用趋势图表

### 5.4 自定义窗口
- 允许插件返回任意窗口类型（不限于 5h/1w）
- UI 动态渲染不同时长的限额

---

## 6. 总结

### 核心设计原则
1. **独立表存储**：避免污染 `accounts` 表，便于查询和清理
2. **插件无关**：通过 RPC 协议解耦，支持任意订阅类型
3. **防抖优先**：30秒窗口避免并发滥用
4. **缓存平衡**：5分钟新鲜期在时效性与上游压力间取得平衡
5. **渐进实现**：核心查询先行，自动恢复作为可选增强

### 实施建议
- **先实现阶段 1-3**：基础查询功能，满足手动查看需求
- **阶段 4 按需**：如果有频繁限额耗尽的场景，再加自动恢复
- **插件逐个迁移**：先支持 Kimi，验证架构后扩展其他供应商

### 关键差异点
sup2api-next 不像 new-api 那样在转发层介入（拦截 403、重写 429、自动禁用），而是提供**独立的限额查询服务**，职责更清晰，适合插件化架构。
