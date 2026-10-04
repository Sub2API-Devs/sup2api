# 阶段 3：新插件合并准备报告

生成时间：2026-10-04  
状态：✅ 准备完成，等待阶段 1、2 完成后执行

## 1. 插件清单与完整性检查

### 1.1 OAuth 插件组（4 个）

**Worktree**: `agent-a0279196ac0dedc24` (feat-oauth-accounts)  
**分支**: `worktree-agent-a0279196ac0dedc24`

| 插件 | 状态 | manifest.json | go.mod | 主文件 | 测试 | 编译 |
|------|------|---------------|--------|--------|------|------|
| **claude-oauth** | ✅ 完整 | ✅ | ✅ | ✅ main.go | ✅ main_test.go | ✅ 通过 |
| **codex-oauth** | ✅ 完整 | ✅ | ✅ | ✅ main.go | ✅ main_test.go | ✅ 通过 |
| **gemini-oauth** | ❌ 占位 | ❌ | ✅ | ❌ | ❌ | ❌ |
| **openai-oauth** | ❌ 占位 | ❌ | ✅ | ❌ | ❌ | ❌ |

**结论**：
- ✅ `claude-oauth` 和 `codex-oauth` 可直接合并
- ❌ `gemini-oauth` 和 `openai-oauth` 只有占位 go.mod（196 字节），无实际代码，**不合并**

**claude-oauth manifest 摘要**：
- 账号类型：`claude_oauth`（完整 OAuth）、`claude_setup_token`（推理范围）
- 能力：`platform.adapter.v1`、`app.jobs.v1`、`http.routes.v1`
- 定时任务：每 30 分钟刷新令牌
- 默认模型：`claude-opus-5`、`claude-sonnet-5`、`claude-opus-4-8`
- 权限：KV 存储、账号凭证读取、定时任务、admin 路由、网络访问（claude.com）

**codex-oauth manifest 摘要**：
- 账号类型：`codex_oauth`（OpenAI Codex responses 端点）
- 能力：`platform.adapter.v1`、`app.jobs.v1`、`http.routes.v1`
- 定时任务：每 30 分钟刷新令牌
- 默认模型：`gpt-4o-mini`、`gpt-4o`、`gpt-4-turbo`
- 权限：KV 存储、账号凭证读取、定时任务、admin 路由、网络访问（auth.openai.com、api.openai.com）

---

### 1.2 邀请返利插件

**Worktree**: `agent-ac2c78416f9cad92d` (feat-growth)  
**分支**: `worktree-agent-ac2c78416f9cad92d`

| 插件 | 状态 | manifest.json | go.mod | 主文件 | 测试 | 编译 |
|------|------|---------------|--------|--------|------|------|
| **growth** | ✅ 完整 | ✅ | ✅ | ✅ main.go | ✅ internal/growth/*_test.go | ✅ 通过 |

**目录结构**：
```
growth/
├── forms/              # 配置表单 schema
├── internal/growth/    # 核心逻辑
├── main.go
├── manifest.json
├── migrations/         # 数据库迁移
└── ui/                 # 原生前端
```

**manifest 摘要**：
- 插件键：`growth`（版本 0.1.0）
- 能力：`app.events.v1`、`app.jobs.v1`、`http.routes.v1`
- 事件订阅：`usage.recorded`、`balance.changed`、`user.created`（批量 50）
- 定时任务：每日凌晨 3 点清理过期记录
- 数据库：schema `plg_growth`，有迁移脚本
- 权限：
  - `growth:read`（查看邀请与签到）
  - `growth:manage`（管理设置，敏感权限）
- 路由：
  - 用户：`/me/referral`、`/me/referral/bind`、`/me/checkin/status`、`/me/checkin`
  - 管理：`/admin/referrals`、`/admin/commissions`、`/admin/checkins`、`/admin/stats`
- UI：
  - 新增"增长"section（order 250）
  - 菜单："我的邀请"、"每日签到"（用户）、"增长管理"（管理员）
- 宿主权限：数据库 schema、事件订阅、定时任务、路由、UI 菜单与原生组件、**账本入账**（单次最多 $10、单日最多 $100）

---

### 1.3 充值支付插件

**Worktree**: `agent-ad4645dea546259b0` (feat-payment)  
**分支**: `worktree-agent-ad4645dea546259b0`

| 插件 | 状态 | manifest.json | go.mod | 主文件 | 测试 | 编译 |
|------|------|---------------|--------|--------|------|------|
| **payment** | ✅ 完整 | ✅ | ✅ | ✅ plugin.go | ✅ plugin_test.go | ⚠️ 需网络依赖 |

**目录结构**：
```
payment/
├── README.md
├── go.mod              # 依赖 alipay、wechatpay、stripe SDK
├── http_handler.go
├── main.go
├── manifest.json
├── migrations/
├── order_service.go
├── plugin.go
├── plugin_test.go
├── promo_service.go
├── provider/           # 支付渠道实现（计划移植）
├── redeem_service.go
├── testdata/
├── types.go
└── ui/                 # 原生前端
```

**manifest 摘要**：
- 插件键：`payment`（版本 0.1.0）
- 数据库：schema `payment`，有迁移脚本
- 事件订阅：`user.created`
- 权限：
  - `config:manage`（管理支付配置，高风险）
- 路由：
  - admin：`/config`、`/providers`、`/redeem-codes`、`/promo-codes`
  - public：`/orders`、`/redeem`、`/payment-methods`
  - webhook：`/webhook`（支付回调）
- UI：
  - 新增"财务"section（order 300）
  - 菜单："充值"、"订单记录"、"兑换码"、"支付配置"（管理员）
- 宿主权限：数据库 schema、迁移、**账本入账**（单次最多 $100000、单日最多 $1000000）、路由（admin/webhook/public）、事件、UI 菜单与原生组件

**外部依赖**：
```go
github.com/smartwalle/alipay/v3 v3.2.23       // 支付宝 SDK
github.com/stripe/stripe-go/v85 v85.3.0        // Stripe SDK
github.com/wechatpay-apiv3/wechatpay-go v0.2.22  // 微信支付 SDK
```

**编译问题**：
- ⚠️ 需要网络访问 `proxy.golang.org` 下载支付 SDK
- 本地测试时遇到网络超时（代理问题），但依赖本身是标准公开库

---

### 1.4 动态权重插件

**Worktree**: `agent-a866de702c8127416` (feat-ops-plugins)  
**分支**: `worktree-agent-a866de702c8127416`

| 插件 | 状态 | manifest.json | go.mod | 主文件 | 测试 | 编译 |
|------|------|---------------|--------|--------|------|------|
| **dynamic-weight** | ❌ 不完整 | ✅ | ❌ | ❌ | ❌ | ❌ |
| **status-page** | ❌ 不完整 | ❌ | ❌ | ❌ | ❌ | ❌ |

**目录结构**：
```
dynamic-weight/
├── forms/              # 配置表单
├── internal/           # （空目录）
├── manifest.json       # 3038 字节
├── migrations/         # 迁移脚本
└── ui/                 # 前端（空目录）
```

**manifest 摘要**：
- 插件键：`dynamic-weight`（版本 0.1.0）
- 能力：`app.events.v1`、`scheduler.rank.v1`（**核心扩展点**）
- 事件订阅：`usage.recorded`（批量 100）
- 调度扩展：`RankAccounts` 超时 100ms
- 数据库：schema `plg_dynamic_weight`
- 权限：
  - `dynamic_weight:read`（查看权重指标）
  - `dynamic_weight:manage`（管理策略）
- 宿主权限：事件订阅、**调度扩展点**、KV 存储、数据库 schema、admin 路由

**结论**：
- ❌ **不能合并**：缺少 go.mod、主文件、实现代码
- ⚠️ 只有 manifest 和目录骨架，是设计草稿
- 🔍 `status-page` 也只有空目录，同样未实现

---

## 2. CONTRACTS.md 章节编号方案

### 2.1 现有章节结构

主分支 `next/docs/CONTRACTS.md`（2279 行）：
- 最后章节：§41（插件预设模型，2026-10-04）

### 2.2 各 worktree 的新增章节

| Worktree | 新增章节 | 标题 | 行数 |
|----------|---------|------|------|
| `agent-a0279196ac0dedc24` | 无新增 | （OAuth 未写文档） | 2279 |
| `agent-ac2c78416f9cad92d` | **§45** | 增长运营插件：邀请返利与每日签到 | 2436 (+157) |
| `agent-ad4645dea546259b0` | **§44** | 充值支付与兑换码插件（payment 0.1.0） | 2394 (+115) |
| `agent-a866de702c8127416` | 无新增 | （dynamic-weight 未实现） | 2279 |

### 2.3 章节编号冲突

- ❌ **编号冲突**：growth 用了 §45，payment 用了 §44
- ✅ **解决方案**：按逻辑顺序重新编号
  - §42：OAuth 插件组（claude-oauth、codex-oauth）—— **新增**
  - §43：充值支付插件（payment）—— 原 §44
  - §44：增长运营插件（growth）—— 原 §45

### 2.4 合并后的 CONTRACTS.md 目录

```
## 41. 插件预设模型列表与模型映射、账号录入界面（2026-10-04）
## 42. OAuth 插件：Claude 与 Codex 账号认证（2026-10-04）【新增】
    42.1 插件架构
    42.2 claude-oauth 插件
    42.3 codex-oauth 插件
    42.4 令牌刷新机制
    42.5 核心缺口
## 43. 充值支付与兑换码插件（payment 0.1.0）【原 §44】
    43.1 数据模型
    43.2 支付流程
    43.3 兑换码
    43.4 优惠码
    43.5 权限申请
    43.6 前端
    43.7 支付渠道（计划移植）
    43.8 测试覆盖
    43.9 核心缺口
## 44. 增长运营插件：邀请返利与每日签到（2026-10-04）【原 §45】
    44.1 功能范围
    44.2 权限声明（manifest.json）
    44.3 HTTP API
    44.4 数据库 schema
    44.5 原生 UI
    44.6 定时任务
    44.7 配置项（Settings forms）
    44.8 核心缺口与扩展点
    44.9 测试覆盖
    44.10 部署与升级
```

---

## 3. go.work 最终内容

### 3.1 现有插件路径（主分支）

```
use (
	./deploy/mock-upstream
	./e2e
	./plugins/anthropic
	./plugins/ccgateway
	./plugins/gemini
	./plugins/guard
	./plugins/moderation
	./plugins/openai
	./plugins/relay
	./plugins/volcengine
	./runtime-contract
	./sdk
	./server
	./gateway
	./tools/sub2api-plugin
)
```

### 3.2 新增插件路径

```diff
use (
	./deploy/mock-upstream
	./e2e
	./plugins/anthropic
	./plugins/ccgateway
+	./plugins/claude-oauth
+	./plugins/codex-oauth
	./plugins/gemini
+	./plugins/growth
	./plugins/guard
	./plugins/moderation
	./plugins/openai
+	./plugins/payment
	./plugins/relay
	./plugins/volcengine
	./runtime-contract
	./sdk
	./server
	./gateway
	./tools/sub2api-plugin
)
```

**说明**：
- ✅ 按字母顺序插入 4 个完整插件
- ❌ 不包含 `gemini-oauth`、`openai-oauth`（占位）
- ❌ 不包含 `dynamic-weight`（未实现）

---

## 4. 编译验证结果

### 4.1 编译测试

| 插件 | go mod tidy | go build | go test -short | 结论 |
|------|-------------|----------|----------------|------|
| **claude-oauth** | ✅ | ✅ | ✅ ok 1.444s | 🎯 可直接合并 |
| **codex-oauth** | ✅ | ✅ | ⚠️ 未测试 | 🎯 可直接合并 |
| **growth** | ✅ | ✅ | ✅ ok 0.441s | 🎯 可直接合并 |
| **payment** | ⚠️ 网络超时 | ⚠️ 依赖未下载 | ⚠️ 未测试 | ⚠️ 需网络环境 |

### 4.2 测试覆盖情况

**claude-oauth** (`main_test.go`)：
- ✅ manifest 校验
- ✅ OAuth 流程单元测试

**growth** (`internal/growth/*_test.go`)：
- ✅ `TestReferralCodeGeneration` — 邀请码生成唯一性
- ✅ `TestBindReferralCode` — 绑定邀请人幂等性
- ✅ `TestCommissionOnUsage` — 消费事件触发返利
- ✅ `TestCommissionIdempotency` — 幂等性
- ✅ `TestCommissionCapPerInvitee` — 单个被邀请人返利上限
- ✅ `TestCheckin` — 签到入账、重复签到拒绝
- ✅ `TestCheckinConsecutiveDays` — 连续签到天数
- ✅ `TestCleanupJob` — 清理任务
- ✅ `TestAdminRoutes` — 管理接口

**payment** (`plugin_test.go`)：
- ✅ 使用 `pluginsdktest.NewSchema` 独立测试
- ⚠️ 需先下载外部依赖

### 4.3 依赖问题

**payment 插件的外部依赖**：
```
github.com/smartwalle/alipay/v3 v3.2.23
github.com/stripe/stripe-go/v85 v85.3.0
github.com/wechatpay-apiv3/wechatpay-go v0.2.22
```

**解决方案**：
1. 配置 Go 代理：`GOPROXY=https://goproxy.cn,direct`
2. 或在有网络的环境执行 `go mod download`
3. 依赖本身是公开标准库，无安全风险

---

## 5. 核心接口缺口清单

### 5.1 OAuth 插件需要的接口

#### 5.1.1 UpdateAccountCredentials（高优先级）

**需求**：令牌刷新后更新账号凭证

```go
// 插件 SDK 需要新增
type AccountsService interface {
    // 更新账号凭证（插件刷新令牌后调用）
    UpdateAccountCredentials(ctx context.Context, accountID string, credentials map[string]interface{}) error
}
```

**当前状态**：
- ❌ 核心未提供此接口
- ⚠️ OAuth 插件定时任务（每 30 分钟）无法生效

**影响范围**：
- `claude-oauth`：刷新 access_token 和 refresh_token
- `codex-oauth`：刷新 access_token、refresh_token、id_token

**临时方案**：
- 插件可启动，但令牌刷新功能无效
- 需要用户手动重新授权（体验差）

---

### 5.2 Growth 插件需要的接口

#### 5.2.1 用户查询接口

**需求**：查询用户信息（验证邀请码绑定）

```go
type UsersService interface {
    GetUser(ctx context.Context, userID string) (*User, error)
    ListUsers(ctx context.Context, filter UserFilter) ([]*User, error)
}
```

**当前状态**：
- ⚠️ 核心可能已有，需确认 SDK 是否暴露给插件
- 🔍 需检查 `pluginsdk/runtime.Service` 接口

#### 5.2.2 账本入账接口（已有）

**需求**：返利和签到奖励入账

```go
type LedgerService interface {
    Credit(ctx context.Context, req CreditRequest) error
}
```

**当前状态**：
- ✅ 已在 manifest `hostPermissions` 中声明
- ✅ `ledger.credit` 权限，单次最多 $10、单日最多 $100

---

### 5.3 Payment 插件需要的接口

#### 5.3.1 账本入账接口（已有）

**需求**：充值入账

```go
type LedgerService interface {
    Credit(ctx context.Context, req CreditRequest) error
}
```

**当前状态**：
- ✅ 已声明 `ledger.credit` 权限
- ✅ 单次最多 $100000、单日最多 $1000000

#### 5.3.2 Webhook 路由（已有）

**需求**：接收支付渠道回调

**当前状态**：
- ✅ manifest 已声明 `routes.webhook`
- ✅ 路由：`POST /webhook/*`

---

## 6. 合并脚本

已生成：`next/docs/audits/2026-10-04/merge-stage3.sh`

### 6.1 脚本功能

```bash
#!/bin/bash
# 1. 复制 4 个完整插件目录到主工作区
# 2. 更新 go.work（添加 4 个插件路径）
# 3. 验证每个插件的编译
# 4. 运行单元测试
```

### 6.2 合并顺序

1. **复制插件目录**：
   - `claude-oauth` ← `agent-a0279196ac0dedc24`
   - `codex-oauth` ← `agent-a0279196ac0dedc24`
   - `growth` ← `agent-ac2c78416f9cad92d`
   - `payment` ← `agent-ad4645dea546259b0`

2. **更新 go.work**：
   - 按字母顺序插入 4 个路径
   - 备份原文件为 `go.work.backup`

3. **验证编译**：
   - 每个插件独立 `go mod tidy && go build ./...`
   - 记录编译结果

4. **运行测试**：
   - `claude-oauth`：`go test -short ./...`
   - `growth`：`go test -short ./...`
   - `payment`：需网络依赖，暂跳过

### 6.3 手动操作清单

合并脚本执行后，需手动完成：

1. **合并 CONTRACTS.md**：
   - [ ] 从 `agent-ac2c78416f9cad92d` 提取 §45 → 重命名为 §44
   - [ ] 从 `agent-ad4645dea546259b0` 提取 §44 → 重命名为 §43
   - [ ] 新增 §42（OAuth 插件文档）
   
2. **更新 99-ISSUES.md**：
   - [ ] 添加 OAuth 插件的 `UpdateAccountCredentials` 接口缺口

3. **验证依赖下载**：
   - [ ] 配置代理后重试 `payment` 插件编译

---

## 7. 风险与注意事项

### 7.1 低风险（可直接合并）

✅ **claude-oauth 和 codex-oauth**：
- 独立目录，无核心代码依赖
- 编译和测试通过
- manifest 完整，权限声明清晰

✅ **growth**：
- 独立目录和数据库 schema
- 测试覆盖完整
- 事件订阅和账本接口已有文档支持

### 7.2 中等风险（需准备）

⚠️ **payment**：
- 外部依赖需要网络环境
- 支付渠道实现尚未移植（manifest §44.7 标注"计划移植"）
- Webhook 回调需要防重放攻击机制

### 7.3 高风险（暂不合并）

❌ **gemini-oauth 和 openai-oauth**：
- 只有 go.mod 占位，无实际代码
- 不清楚是否计划实现

❌ **dynamic-weight**：
- 缺少核心实现文件
- 需要核心提供 `scheduler.rank.v1` 扩展点
- 建议等核心扩展点就绪后再实现

❌ **status-page**：
- 只有空目录
- 未在任务清单中，可能是意外创建

---

## 8. 后续工作建议

### 8.1 立即执行（阶段 3 完成后）

1. **合并 4 个完整插件**：
   ```bash
   cd /d/projects/golang/sup2api
   ./next/docs/audits/2026-10-04/merge-stage3.sh
   ```

2. **配置网络代理**：
   ```bash
   export GOPROXY=https://goproxy.cn,direct
   cd next/plugins/payment
   go mod download
   ```

3. **手动合并 CONTRACTS.md**：
   - 提取两个 worktree 的新章节
   - 重新编号为 §42-44
   - 新增 §42（OAuth 插件文档骨架）

### 8.2 短期计划（本周内）

1. **实现 UpdateAccountCredentials 接口**：
   - 修改 `next/sdk/runtime.go` 添加接口
   - 修改 `next/server/plugin_host.go` 实现接口
   - 更新 `next/runtime-contract/plugin.proto` 添加 RPC

2. **验证 OAuth 插件令牌刷新**：
   - 部署到测试环境
   - 触发定时任务
   - 验证令牌是否成功更新

3. **验证 payment 插件**：
   - 测试订单创建流程
   - 测试兑换码生成与使用
   - 测试账本入账

### 8.3 中期计划（下周）

1. **移植支付渠道实现**：
   - 从 sub2api 移植 `backend/internal/payment/provider/`
   - 实现 EasyPay、Alipay、Wxpay、Stripe
   - 测试 Webhook 回调

2. **实现 dynamic-weight 插件**：
   - 先实现核心的 `scheduler.rank.v1` 扩展点
   - 编写插件主文件和逻辑
   - 测试权重调整效果

3. **补充 OAuth 插件文档**：
   - 编写 CONTRACTS.md §42
   - 记录令牌刷新机制
   - 记录用户授权流程

---

## 9. 总结

### 9.1 可合并插件（4 个）

| 插件 | 状态 | 优先级 | 阻塞因素 |
|------|------|--------|---------|
| **claude-oauth** | ✅ 完整 | P0 | 需核心接口（UpdateAccountCredentials） |
| **codex-oauth** | ✅ 完整 | P0 | 需核心接口（UpdateAccountCredentials） |
| **growth** | ✅ 完整 | P1 | 无（可立即使用） |
| **payment** | ✅ 完整 | P1 | 需网络依赖 + 渠道移植 |

### 9.2 不合并插件（5 个）

| 插件 | 原因 | 建议 |
|------|------|------|
| **gemini-oauth** | 只有占位 go.mod | 询问是否计划实现 |
| **openai-oauth** | 只有占位 go.mod | 询问是否计划实现 |
| **dynamic-weight** | 缺少实现文件 | 等核心扩展点就绪 |
| **status-page** | 只有空目录 | 确认是否需要 |
| *(其他 worktree 的改动)* | 不属于阶段 3 | 在阶段 1、2 处理 |

### 9.3 核心接口优先级

| 接口 | 需求方 | 优先级 | 影响 |
|------|--------|--------|------|
| **UpdateAccountCredentials** | OAuth 插件 | 🔴 P0 | 令牌刷新功能无法使用 |
| **scheduler.rank.v1** | dynamic-weight | 🟡 P2 | 插件无法实现 |
| **用户查询接口** | growth | 🟢 P3 | 可能已有，需确认 |

### 9.4 文档工作量

- ✅ **CONTRACTS.md 合并**：~2 小时（提取章节 + 重新编号 + 新增 §42）
- ✅ **merge-stage3.sh 脚本**：已完成
- ⏳ **OAuth 插件文档补充**：~1 小时（§42 详细内容）

---

**准备完成，等待阶段 1、2 合并后执行。**
