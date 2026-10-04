# 套餐限额查询功能实施计划

**创建时间**: 2026-10-04  
**基于设计**: SUBSCRIPTION_LIMITS_DESIGN.md  
**目标**: 实现阶段 1-3（核心查询功能）

---

## 实施范围

### ✅ 包含（阶段 1-3）
1. 数据层：独立限额表 + 迁移脚本
2. 插件协议：RPC 方法定义
3. 核心服务：查询服务 + 防抖机制
4. HTTP API：查询接口 + 重置接口

### ⏸️ 暂不包含（可选）
- 阶段 4：自动恢复后台任务
- 阶段 5：具体插件实现（Kimi、智谱等）
- 阶段 6：前端集成

---

## 实施步骤

### 步骤 1：数据库迁移（30 分钟）

**文件**: `next/server/internal/migrations/0029_account_subscription_limits.sql`

**内容**:
- 创建 `account_subscription_limits` 表
- 创建索引（resume_at 条件索引）
- 添加注释

**验证**:
```bash
cd next/server
go run ./cmd/migrate -dry-run
```

---

### 步骤 2：插件协议扩展（30 分钟）

**文件**: `next/runtime-contract/plugin.proto`

**改动**:
- 新增 `QuerySubscriptionLimits` RPC 方法
- 新增 `QuerySubscriptionLimitsRequest` 消息
- 新增 `SubscriptionWindow` 消息
- 新增 `QuerySubscriptionLimitsResponse` 消息

**生成代码**:
```bash
cd next/runtime-contract
./scripts/generate.sh
```

**验证**:
- 检查 `gen/pluginv1/plugin.pb.go` 是否生成新方法
- 检查 `gen/pluginv1/plugin_grpc.pb.go` 是否生成 gRPC 存根

---

### 步骤 3：SDK 接口定义（20 分钟）

**文件**: `next/sdk/pluginsdk/account.go`

**新增**:
- `SubscriptionWindow` 结构体
- `AccountPlugin` 接口新增 `QuerySubscriptionLimits` 方法

**文件**: `next/sdk/runtime.go`

**新增**:
- `SubscriptionLimitsQuerier` 接口
- 核心调用插件的桥接方法

---

### 步骤 4：数据访问层（1 小时）

**文件**: `next/server/internal/store/account_limits.go`（新建）

**实现方法**:
- `GetAccountLimits(ctx, accountID) -> *LimitsSnapshot`
- `UpsertAccountLimits(ctx, accountID, snapshot)`
- `ClearAccountLimits(ctx, accountID)`
- `ListAccountsDueForResume(ctx) -> []*Account`（阶段 4 用，暂时空实现）

**测试文件**: `next/server/internal/store/account_limits_test.go`

---

### 步骤 5：核心查询服务（2 小时）

**文件**: `next/server/internal/account/limits.go`（新建）

**实现**:
1. 数据结构：
   - `LimitsWindow`
   - `LimitsSnapshot`

2. 服务方法：
   - `QueryAccountLimits(ctx, accountID, force) -> *LimitsSnapshot`
     - 检查账号类型
     - 缓存判断（5 分钟新鲜期）
     - 防抖检查（30 秒窗口）
     - 调用插件 RPC
     - 更新快照
   - `ResetAccountLimits(ctx, accountID, clearMarkers, refetch) -> *LimitsSnapshot`

3. 防抖机制：
   - `sync.Map` 存储最后查询时间
   - `acquireDebounce(key, window) -> bool`
   - `releaseDebounce(key)`

**测试文件**: `next/server/internal/account/limits_test.go`

---

### 步骤 6：HTTP 处理器（1 小时）

**文件**: `next/server/internal/account/handlers.go`

**新增路由**:
- `GET /api/accounts/:id/subscription/limits` → `viewLimits`
- `POST /api/accounts/:id/subscription/limits/reset` → `resetLimits`

**权限**:
- 查询：需要 `account:test` 权限
- 重置：需要 `account:update` 权限

**响应格式**:
```go
type viewLimitsResponse struct {
    AccountID      int64          `json:"account_id"`
    HasLimits      bool           `json:"has_limits"`
    Windows        []LimitsWindow `json:"windows"`
    AnyExhausted   bool           `json:"any_exhausted"`
    TightestWindow *LimitsWindow  `json:"tightest_window"`
    LastQueriedAt  time.Time      `json:"last_queried_at"`
    Provider       string         `json:"provider"`
    AutoResumeAt   *time.Time     `json:"auto_resume_at"`
}
```

---

### 步骤 7：插件宿主桥接（30 分钟）

**文件**: `next/server/plugin_host.go`

**改动**:
- 实现 `QuerySubscriptionLimits` RPC 调用
- 添加超时控制（15 秒）
- 错误处理和日志记录

---

### 步骤 8：账号类型元数据（20 分钟）

**文件**: 各插件的 `manifest.json`

**新增字段**（示例，暂不实现具体插件）:
```json
{
  "accountTypes": [{
    "id": "kimi-coding-plan",
    "features": {
      "subscription_limits": true
    }
  }]
}
```

**文件**: `next/server/internal/core/account_type.go`

**改动**:
- `AccountTypeFeatures` 新增 `SubscriptionLimits bool` 字段
- 解析 manifest 时读取该字段

---

### 步骤 9：集成测试（1 小时）

**文件**: `next/server/internal/account/limits_integration_test.go`

**测试场景**:
1. API Key 账号返回 `has_limits=false`
2. 订阅账号（mock 插件）返回限额
3. 缓存命中（5 分钟内）
4. 防抖保护（30 秒内）
5. 强制刷新（`force=true`）
6. 重置缓存

---

## 文件清单

### 新增文件（9 个）
1. `next/server/internal/migrations/0029_account_subscription_limits.sql`
2. `next/server/internal/store/account_limits.go`
3. `next/server/internal/store/account_limits_test.go`
4. `next/server/internal/account/limits.go`
5. `next/server/internal/account/limits_test.go`
6. `next/server/internal/account/limits_integration_test.go`
7. `next/docs/SUBSCRIPTION_LIMITS_DESIGN.md`（已存在）
8. `next/docs/SUBSCRIPTION_LIMITS_IMPLEMENTATION_PLAN.md`（本文件）

### 修改文件（6 个）
1. `next/runtime-contract/plugin.proto`
2. `next/sdk/pluginsdk/account.go`
3. `next/sdk/runtime.go`
4. `next/server/internal/account/handlers.go`
5. `next/server/internal/core/account_type.go`
6. `next/server/plugin_host.go`

### 生成文件（proto 编译后）
- `next/runtime-contract/gen/pluginv1/*.pb.go`
- `next/runtime-contract/gen/pluginv1/*.ts`（前端）

---

## 验证清单

### 编译验证
- [ ] `cd next/server && go build ./...`
- [ ] `cd next/runtime-contract && go build ./...`
- [ ] `cd next/sdk && go build ./...`

### 测试验证
- [ ] `go test ./internal/store -run TestAccountLimits`
- [ ] `go test ./internal/account -run TestLimits`
- [ ] `go test ./internal/account -run TestLimitsIntegration`

### 功能验证
- [ ] 启动服务
- [ ] 创建测试订阅账号（手动标记类型）
- [ ] 调用 `GET /api/accounts/:id/subscription/limits`
- [ ] 检查响应 `has_limits=true`（无插件实现时返回错误）
- [ ] 调用 `POST /api/accounts/:id/subscription/limits/reset`

---

## 时间估算

| 步骤 | 时间 | 累计 |
|------|------|------|
| 1. 数据库迁移 | 30 分钟 | 0.5h |
| 2. 插件协议扩展 | 30 分钟 | 1h |
| 3. SDK 接口定义 | 20 分钟 | 1.3h |
| 4. 数据访问层 | 1 小时 | 2.3h |
| 5. 核心查询服务 | 2 小时 | 4.3h |
| 6. HTTP 处理器 | 1 小时 | 5.3h |
| 7. 插件宿主桥接 | 30 分钟 | 5.8h |
| 8. 账号类型元数据 | 20 分钟 | 6h |
| 9. 集成测试 | 1 小时 | 7h |

**总计**: 约 7 小时

---

## 风险与依赖

### 依赖项
- ✅ 当前数据库迁移编号：0025（阶段 1 完成后是 0028，我们用 0029）
- ✅ 插件协议生成工具：`runtime-contract/scripts/generate.sh`
- ⚠️ merge-stage2 完成后再开始（避免迁移编号冲突）

### 风险项
- 迁移编号冲突：等待 merge-stage2 完成，确认 0028 已使用
- proto 生成失败：确保 protoc 工具可用
- 插件实现缺失：暂时返回 `UNSUPPORTED` 错误，不阻塞核心功能

---

## 下一步

1. **等待 merge-stage2 完成**（确认迁移编号）
2. **开始步骤 1**：创建数据库迁移
3. **并行执行步骤 2-8**（可分配给子代理）
4. **最后执行步骤 9**：集成测试

准备就绪后告知，立即开始实施！
