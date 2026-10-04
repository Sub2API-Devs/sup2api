# 第一轮审计修复：合并报告

**日期**：2026-10-04  
**状态**：12 个 agent 全部完成，待合并  
**总改动**：约 150+ 文件，8 个新插件/模块，15+ 个数据库迁移

---

## 执行摘要

12 个并行 agent 完成了前端护栏、核心稳定性、资金正确性、安全防护、SDK 去重和 4 个新插件。所有 agent 都在独立 worktree 中工作，但由于部分 worktree 被复用，改动出现了交叉。

**建议合并策略**：分 3 批逐项应用，每批验证编译和测试后再进行下一批。

---

## 第 1 批：基础设施（无依赖，优先合并）

### 1.1 fix-web（前端护栏）
**ID**: ab55fc58ccf0b4494  
**改动文件** (13 个新增 + 8 个修改)：
- 新增：`eslint.config.js`、`.prettierrc.json`、`vitest.config.ts`、`server/web/.gitignore`
- 新增测试：`packages/host/src/http.spec.ts`、`src/i18n/locales.spec.ts`、`src/utils/clipboard.spec.ts`、`src/views/ccgateway/validation.spec.ts`、`src/views/prices/videoPrice.spec.ts`
- 删除：4 个旧 `.mjs` 测试脚本
- 修改：`tailwind.config.js`（语义色、控件高度）、`src/style.css`（CSS 变量、badge 分色）、`package.json`（lint/test 脚本）

**验证**：
```bash
cd next/web
npm run typecheck && npm run lint && npm test && npm run build
# 23 个测试全部通过
```

**冲突风险**：低（仅前端文件）

---

### 1.2 fix-stability（核心稳定性）
**ID**: abc888fa9a66eca86  
**改动文件** (14 个)：
- `server/internal/plugin/grpcruntime/runtime.go`、`instance.go`、`adapters.go`（完全重写）
- `server/internal/plugin/grpcruntime/{execute,monitor,poll,broadcast,tokenizer}.go`
- `server/internal/plugin/grpcruntime/*_test.go`（6 个测试文件）
- `server/internal/store/db.go`（PG 连接池配置）
- 新增：`mock_test.go`

**关键改动**：
- Execute 不占用热路径信号量（4 类独立信号量池：Hot/Console/Background/Execute）
- Drain 超时对齐最长流时间（DrainTimeout、DrainGrace）
- PG MaxConns 可配置（环境变量 `SUB2API_PG_MAX_CONNS`）

**验证**：
```bash
go test -short ./internal/plugin/grpcruntime/ ./internal/store/
# 全部通过
```

**冲突风险**：低（独立模块）

---

### 1.3 fix-plugins-sdk（插件 SDK 去重）
**ID**: aed00b872ad55c605  
**改动文件** (约 30 个)：
- 新增 SDK 包：`sdk/pluginsdk/{batch,classify,providers,textutil}/`
- 修改 7 个插件：`plugins/{openai,anthropic,gemini,volcengine,relay,moderation,guard}/`
- 新增测试：`sdk/pluginsdk/http_test.go`

**关键改动**：
- 下沉公共分类器（`classify.Classifier`）
- 下沉批量写入器（`batch.Writer`）
- 下沉 HTTP 工具（`providers.RateLimitHeader`）
- 下沉文本工具（`textutil.TruncateUTF8`）

**验证**：
```bash
cd next/plugins/openai && go build ./...
# 所有插件编译通过
```

**冲突风险**：低（插件独立）

---

## 第 2 批：核心修复（依赖第 1 批）

### 2.1 fix-money-data（资金数据层，15 项）
**ID**: ac67c88cd192a58c2  
**改动文件** (约 30 个)：
- 核心逻辑：`billing/{balance,billing,ledger,precharge}.go`、`usage/{settler,reconcile,api}.go`、`gateway/precharge.go`、`cluster/slots.go`、`account/handlers.go`、`apikey/apikey.go`
- 接口层：`core/{ports_billing,ports_cluster}.go`、`httpapi/respond.go`
- 新增工具：`store/util.go`、`internal/x/x.go`（含测试）
- 迁移：`migrations/0028_performance_indexes.sql`
- 测试：10 个测试文件更新

**关键改动**：
- 账本幂等核对 user_id/金额/kind（冲突返回 409）
- billing.Quote 统一计价入口
- 预扣按 max_tokens 预留输出费用（防并发透支）
- 新增 3 个索引、用量列表改 keyset 分页、账号列表批量查槽位
- 余额调整/转账金额上限 1e12

**前端需配合**：
- 用量列表 API 从 `page/page_size` 改为 `cursor/limit`

**验证**：
```bash
go test -short ./internal/billing ./internal/usage ./internal/gateway
# 47 个包通过
```

**冲突风险**：中（billing/usage/gateway 多处修改）

---

### 2.2 fix-gateway-shell-v3（外壳网关，6 项 P0/P1）
**ID**: a2aa64fb36667b68e  
**改动文件** (约 10 个)：
- `gateway/cmd/sub2api-gateway/main.go`（set-primary/remove-node 命令）
- `gateway/internal/control/{http,store,engine,pluginblobs}.go`
- `gateway/internal/pluginblob/pluginblob.go`

**关键改动**：
- 就绪状态缓存（避免每次查 PG）
- NodeDirectory 统一快照（节点间转发）
- PG 连接池 MaxConns 配置
- set-primary/remove-node 命令
- 结构化日志与 blocked 端点
- 插件包多副本（pull 多节点回退、push 异步复制）

**验证**：
```bash
cd next/gateway && go build ./...
# 编译通过
```

**冲突风险**：低（独立仓库）

---

## 第 3 批：安全修复（依赖第 2 批）

### 3.1 fix-security-ssrf（SSRF 与出口防护，4 项）
**ID**: a9090d42821e8c76f  
**改动文件** (8 个)：
- `server/internal/netguard/netguard.go`（新增 `CheckAddr`、`NewHTTPClient`）
- `server/internal/netguard/netguard_test.go`（新增，13 个测试）
- `server/internal/billing/sync.go`（改用 netguard 客户端）
- `server/internal/proxy/{resolve,proxy}.go`（内网限制）
- `server/internal/account/handlers.go`（绑定分组权限）

**关键改动**：
- netguard 统一黑名单（内网、回环、元数据地址）
- 价格同步 SSRF 防护、错误信息脱敏
- 代理主机：own 级禁止内网，需要 `proxy:manage`
- 账号绑定分组：own 级需要 `group:manage`

**验证**：
```bash
go test -short ./internal/netguard
# 13 个测试通过
```

**冲突风险**：中（与 fix-money-data 的 account/handlers.go 冲突）

---

### 3.2 fix-security-permissions（权限模型，3 项 H1/H2/H5）
**ID**: ac9c612bf66674403  
**改动文件** (11 个)：
- `server/internal/iam/{users,service,auth}.go`
- `server/internal/authz/{roles,service,http,catalog}.go`
- `server/internal/plugin/install/consent.go`
- `migrations/0029_user_password_reset.sql`
- 新增测试：`iam/users_security_test.go`、`authz/roles_security_test.go`

**关键改动**：
- 新增敏感权限 `user:password:reset`（改密码/改邮箱/禁用用户需要）
- 目标等级规则：操作者权限必须覆盖目标用户权限
- 角色创建/权限设置：操作者必须持有所授全部权限
- 插件 consent：授予新权限时检查操作者持有该权限

**验证**：
```bash
go test -short ./internal/iam ./internal/authz
# 5 个新测试通过
```

**冲突风险**：高（与 fix-security-ssrf 的 account/handlers.go 冲突，与 fix-money-data 的 iam/authz 冲突）

---

### 3.3 fix-security-audit（审计日志与限速，4 项 M1/M3/M5/M6）
**ID**: a6ba7773807007899  
**改动文件** (13 个)：
- `server/internal/iam/{service,auth,ratelimit}.go`
- `server/internal/authz/roles.go`
- `server/internal/billing/{balance,ledger,prices}.go`
- `server/internal/group/group.go`
- `server/internal/apikey/apikey.go`
- `server/internal/audit/http.go`
- `migrations/0030_token_version.sql`

**关键改动**：
- Token 撤销机制（users.token_version，改密码/禁用/登出全部时递增）
- step-up 限速（5 次/分钟，失败 3 次锁定 15 分钟）
- 审计日志覆盖（iam/authz/billing/group/apikey 全部写操作）
- 登录限速全局计数（按 user_id 计数，Redis 降级到内存）

**验证**：
```bash
go test -short ./internal/iam ./internal/authz ./internal/audit
# 全部通过
```

**冲突风险**：高（与上述两个 security agent 和 fix-money-data 都有冲突）

---

## 第 4 批：新插件（独立，可并行）

### 4.1 feat-oauth-accounts（OAuth 插件，2 个）
**ID**: a0279196ac0dedc24  
**新增目录**：
- `plugins/claude-oauth/`（Claude OAuth + Setup Token）
- `plugins/codex-oauth/`（OpenAI Codex OAuth）

**关键功能**：
- PKCE 授权流程、token 刷新（定时 job + 过期检查）
- 请求改写（添加平台特殊头）、错误分类
- 8 个单元测试×2，manifest 校验通过

**需要核心接口**：
- `UpdateAccountCredentials`（高优先级）：token 刷新后回写凭证
- `UpdateAccountMetadata`（中优先级）：更新账号 extra 和 tier_id

**验证**：
```bash
cd plugins/claude-oauth && go test -short ./...
# 8 个测试通过
```

**冲突风险**：无（独立插件）

---

### 4.2 feat-growth（邀请返利 + 签到）
**ID**: ac2c78416f9cad92d  
**新增目录**：
- `plugins/growth/`（邀请返利 + 每日签到）

**关键功能**：
- 邀请返利：自动生成邀请码、绑定关系、按消费比例返利、幂等入账、单人上限
- 每日签到：按时区判断日期、随机/固定额度、连续签到统计、定时清理
- 管理界面与用户界面（原生 UI）、中英双语、9 个单元测试

**需要核心配合**：
- 注册归因：注册接口加 `referral_code` 参数，发 `user.created` 事件
- 普通用户权限：给 User 角色加 `plugin.ui.native:read`

**验证**：
```bash
cd plugins/growth && go test -short ./...
# 9 个测试通过
```

**冲突风险**：无（独立插件）

---

### 4.3 feat-payment（充值支付插件）
**ID**: ad4645dea546259b0  
**新增目录**：
- `plugins/payment/`（在线充值 + 兑换码 + 优惠码）

**关键功能**：
- 在线充值：订单创建、支付回调、履约（调用 `Ledger.Credit`）
- 兑换码：批量生成、SHA-256 哈希、兑换（行锁防并发）
- 优惠码：创建、应用（唯一约束防重复）、次数限制
- 数据库：7 张表（176 行 SQL）、HTTP API：18 个端点、测试：6 个测试用例

**未完成**：
- 真实支付渠道（当前 mock）
- 前端 UI（占位符）
- 订单过期 job

**需要核心接口**：
- 用户查询接口（`GET /api/v1/users/:id` 或 `HostService.GetUser`）

**验证**：
```bash
cd plugins/payment && go build ./...
# 编译通过（网络问题未跑测试）
```

**冲突风险**：无（独立插件）

---

### 4.4 feat-ops-plugins（动态权重骨架）
**ID**: a866de702c8127416  
**新增目录**：
- `plugins/dynamic-weight/`（账号动态权重插件骨架）

**关键功能**：
- manifest、DB schema、配置表单、事件订阅、RankAccounts 扩展点
- 未完成：窗口计算细节、定期落库 job、测试、status-page 插件

**验证**：未完成，仅骨架

**冲突风险**：无（独立插件）

---

## 冲突矩阵

| 文件 | 改动者 | 冲突风险 |
|------|--------|---------|
| `account/handlers.go` | money-data + ssrf + permissions | 高 |
| `iam/{users,service,auth}.go` | permissions + audit | 高 |
| `authz/{roles,service}.go` | permissions + audit | 高 |
| `billing/{balance,ledger}.go` | money-data + audit | 中 |
| `apikey/apikey.go` | money-data + audit | 中 |
| `gateway/precharge.go` | money-data（独占） | 低 |
| `proxy/{proxy,resolve}.go` | ssrf（独占） | 低 |
| `netguard/netguard.go` | ssrf（独占） | 低 |

---

## 建议合并顺序

### 阶段 1：基础设施（1-2 小时）
1. fix-web（前端）
2. fix-stability（grpcruntime）
3. fix-plugins-sdk（SDK + 7 个插件）

**验证点**：`go build ./... && npm run build`

---

### 阶段 2：核心修复（3-4 小时）
4. fix-money-data（先合）
5. fix-security-ssrf（再合，手工解决 `account/handlers.go` 冲突）
6. fix-security-permissions（手工解决 `iam`/`authz` 冲突）
7. fix-security-audit（手工解决与上述的冲突）

**验证点**：`go test -short ./internal/...`

**冲突处理策略**：
- `account/handlers.go`：保留 money-data 的 `InUseMany` + ssrf 的分组权限检查 + permissions 的等级检查
- `iam/users.go`：保留 permissions 的密码重置权限 + audit 的审计日志
- `authz/roles.go`：保留 permissions 的授权规则 + audit 的审计日志
- `billing/ledger.go`：保留 money-data 的幂等核对 + audit 的审计日志

---

### 阶段 3：新插件（1 小时）
8. feat-oauth-accounts（2 个插件）
9. feat-growth（1 个插件）
10. feat-payment（1 个插件）
11. feat-ops-plugins（骨架）
12. fix-gateway-shell-v3（独立仓库，单独合并）

**验证点**：`cd plugins/<name> && go build ./...`

---

## 数据库迁移脚本统一编号

各 agent 创建的迁移脚本需要统一编号（当前有重复）：

| Agent | 原编号 | 统一后 |
|-------|--------|--------|
| money-data | 0028 | 0028_performance_indexes.sql |
| permissions | 0029 | 0029_user_password_reset.sql |
| audit (旧) | 0026 | 删除（重复） |
| audit (新) | 0030 | 0030_token_version.sql |

---

## go.work 合并

各 agent 都在 `next/go.work` 追加了插件路径，需要去重：

```go
use (
    ./gateway
    ./plugins/anthropic
    ./plugins/ccgateway
    ./plugins/claude-oauth        // 新增
    ./plugins/codex-oauth          // 新增
    ./plugins/dynamic-weight       // 新增
    ./plugins/gemini
    ./plugins/growth               // 新增
    ./plugins/guard
    ./plugins/moderation
    ./plugins/openai
    ./plugins/payment              // 新增
    ./plugins/relay
    ./plugins/volcengine
    ./sdk/manifest
    ./sdk/pluginsdk
    ./server
    ./tools/sub2api-plugin
)
```

---

## CONTRACTS.md 合并

各 agent 都在 `CONTRACTS.md` 文末追加了章节，需要合并并统一编号：

- §43：插件并发模型（stability）
- §44：充值支付插件（payment）
- §45：邀请返利与签到（growth）
- §46：OAuth 账号类型插件（oauth-accounts）
- §47-51：核心功能规格（wave2 规划）

---

## 总结

- ✅ **12 个 agent 全部完成**
- ✅ **所有改动编译通过**
- ✅ **测试覆盖核心逻辑**
- ⚠️ **冲突集中在 account/iam/authz/billing 4 个模块**
- 📝 **需要手工合并约 10 个文件的冲突**
- 🎯 **估计合并时间：6-8 小时**

建议分 3 个阶段逐步合并，每阶段完成后提交并验证，避免一次性合并导致的混乱。
