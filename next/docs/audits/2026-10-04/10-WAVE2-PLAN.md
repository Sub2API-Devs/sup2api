# 第二轮规划：结构性重构与功能补全

## 执行摘要

第二轮在第一轮（6 个修复 agent + 4 个新插件 agent）全部合并后开始,涵盖 **结构性重构（A）、前端体系（B）、核心功能（C）** 三大类。建议分 **3 波**执行,每波 5–7 个 agent 并行,按文件与目录严格隔离避免冲突。

**核心依赖链**：
1. 公共层（store、httpapi 工具）→ service/repo 分层
2. 设计系统组件 → 逐页改版
3. 核心接口（插件权限授予、凭证回写、注册归因、发信）→ FG 功能与新插件

**关键决策**：
- A 类按模块与包目录划分 agent（store → billing → account → gateway）,每个 agent 只改自己负责的文件
- B 类前端按 UI/feature/page 三层切分：DS 组件 → 数据层与工具 → 逐页改版
- C 类核心功能每个独立 agent,只有需要核心接口的功能才等待核心改动合并

---

## 一、分工总表（3 波，共 18 个 agent）

### 第 1 波：公共层与基础设施（依赖：第一轮全部合入）

| Agent ID | 范围（只改这些文件/目录） | 禁改区域 | 产出 | 验收 |
|---|---|---|---|---|
| **be-common-layer** | `store/{tx.go,where.go,page.go,util.go}` 新建<br>`httpapi/{filters.go,adapters.go}` 新建<br>`core/i18n.go` 新建<br>`internal/x/` 新建包（Itoa64/TruncUTF8/Uniq） | 其他所有包 | store.OnCommit/Where/ListPage<br>httpapi.ApplyFilters/JSON/Body/Paged<br>core.T(ctx,en,zh)<br>x.{Itoa64,TruncUTF8,Uniq} | `go test ./store ./httpapi ./x -count=1` |
| **be-settings-cache** | `internal/settings/` 新建包：`doc.go, epoch.go`<br>迁移 `0027_settings_epochs.sql`（settings 表加 version 列） | 暂不改任何调用方 | `settings.Doc[T]`、`cache.Epoch[K,V]` 泛型 | 单测覆盖 Get/Patch/Invalidate |
| **be-netguard-security** | `netguard/netguard.go`（合并黑名单）<br>`secret/aad.go` 新建（集中 AAD）<br>`proxy/dialguard.go`（改调 netguard）<br>`billing/sync.go`（GuardedClient）<br>`remotedocker/` 同上 | gateway、plugin、ccgateway 暂不动 | 统一 SSRF 防护与 AAD 管理 | go test + 手工验证 SSRF 被拒 |
| **be-billing-refactor** | `billing/` 全部：提取 repo.go、重构 sync.go、统一 Quote<br>迁移 `0028_ledger_strict_idem.sql`（ledger 唯一索引改为 user+key） | account、usage、gateway 暂不调新接口 | billing.Quote(PriceInputs)<br>ledger 严格幂等<br>prices 分层 | TEST_DATABASE_URL 跑全部 billing 测试 |
| **be-iam-authz-audit** | `iam/` 全部：补 audit、补限速、修 P0-1<br>`authz/` 全部：补 audit、RoleAssigner 接口<br>`audit/http.go` 显式列字段<br>迁移 `0029_user_token_version.sql`（users.token_version）<br>更新 CONTRACTS §4、§5.2 | group、apikey 暂不动 | user:update 越权修复<br>step-up 限速<br>审计覆盖 iam/authz | CI + 手写越权用例 |
| **be-indexes-pagination** | 迁移 `0030_indexes_pagination.sql`（usage_logs/api_keys/audit_logs 索引）<br>`httpapi/respond.go`（page 上限）<br>`usage/api.go`（keyset 分页草图,可选） | 其他模块暂不改分页 | 3 个索引 + page 溢出修复 | 慢查询日志验证 |

第 1 波完成标志：`be-common-layer`、`be-settings-cache` 合入后,第 2 波的 service 分层 agent 可以开始调用新工具。

---

### 第 2 波：service/repo 分层与网关重构（依赖：第 1 波的 common-layer、settings-cache）

| Agent ID | 范围 | 禁改 | 产出 | 验收 |
|---|---|---|---|---|
| **be-group-apikey-refactor** | `group/` 全部：repo/service/http 分层、删死代码、补审计<br>`apikey/` 全部：同上 | proxy、account | group/apikey 按模板重构 | go test ./group ./apikey |
| **be-proxy-refactor** | `proxy/` 全部：repo/service/http 分层、补审计、用 netguard | account、ccgateway | proxy 按模板重构 | go test ./proxy |
| **be-account-refactor** | `account/` 全部：repo/service/http 分层、大 handler 拆分、N+1 修复<br>删 ccgateway 具体依赖（改用 core 接口） | gateway、usage | account 按模板 + 槽位批量查询 | go test ./account<br>账号列表性能验证 |
| **be-usage-refactor** | `usage/` 全部：settler/reconcile 调用 billing.Quote、分层<br>`usagerules/` 不动（被 gateway 和 usage 共用） | gateway、billing | usage 调用统一计价 | go test ./usage |
| **gw-pipeline-refactor** | `gateway/pipeline.go`（call 拆子结构）<br>`gateway/{dispatch,forward,websocket,execute,hooks,rank}.go` 方法归类<br>`gateway/settings.go` 改用 settings.Doc | gateway 其他文件、account、usage | call 拆分 + 中间件化草图 | go test ./gateway |
| **gw-routes-call-split** | `gateway/{routes,sticky,sticky_api,errors,util}.go`<br>新建 `gateway/middleware/` 包（中间件化：auth/body/hooks/schedule/forward）<br>RL-4 与 RL-P1-8 修复（预扣移到槽位后） | pipeline.go 与 dispatch.go（已被前一 agent 改） | 网关 call 中间件化<br>HTTP/WS 统一调度 | go test ./gateway<br>WS 与 HTTP 冒烟 |

第 2 波完成标志：gateway、account、billing、usage 都完成分层,可以开始 C 类功能。

---

### 第 3 波：前端体系 + 核心功能（依赖：第 2 波 service 分层）

前端与功能并行,但前端内部有依赖：DS 组件 → 特性层 → 页面改版。

#### 前端（5 个 agent）

| Agent ID | 范围 | 禁改 | 产出 | 验收 |
|---|---|---|---|---|
| **fe-ds-components** | `packages/ui/src/` 新增 25 个组件<br>`style.css` 设计令牌<br>`tailwind.config.js` 主题 | 现有组件、views | DataTable（排序/勾选/批量）<br>FilterBar、BulkBar、Drawer<br>Select（可搜索）<br>ConfirmDialog（进度）等 | Storybook 或示例页 |
| **fe-data-composables** | `src/composables/` 新建 useData.ts、useAction.ts、useConfirm.ts、usePolling.ts<br>`src/api/client.ts` 泛型修复<br>`src/api/dto.ts` 新建（集中 DTO） | views、stores | 数据访问层<br>异步动作抽象<br>DTO 类型 | 单测或示例 |
| **fe-accounts-groups-proxies** | `views/{accounts,groups,proxies}/` 全部重写<br>AccountEditor 拆分（凭证/模型/调度 3 个子组件） | 其他 views | 3 个页面按 01 §3 改版 | 视觉走查 + 功能冒烟 |
| **fe-users-roles-keys** | `views/{users,roles,keys}/` 全部重写 | 其他 views | 3 个页面改版 | 同上 |
| **fe-dashboard-usage-prices** | `views/{dashboard,usage,prices,ledger}/` 重写<br>DashboardView 加模型分布/Top/快捷入口 | plugins、settings | 4 个页面改版 | 同上 |

前端 agent 可与下面核心功能 agent 完全并行。

#### 核心功能（C 类，5 个 agent，每个独立）

| Agent ID | 范围 | 依赖 | 产出 | 验收 |
|---|---|---|---|---|
| **fg-api-key-enhance** | `apikey/` 加额度/限速/IP/模型字段<br>迁移 `0031_apikey_limits.sql`<br>网关鉴权加检查 | be-group-apikey-refactor 合入 | FG-1：Key 限速与模型限制 | CONTRACTS §47<br>E2E 验证限流 |
| **fg-models-endpoint** | `platforms/models.go` 新建<br>`gateway/routes.go` 加 `/v1/models`<br>`web/views/models/` 模型广场页 | 无 | FG-2：客户端 /v1/models | curl /v1/models 返回 JSON |
| **fg-email-registration** | `internal/mailer/` 新建包<br>`iam/` 加注册/验证/找回密码<br>迁移 `0032_email_verification.sql`<br>`web/views/auth/` 加注册页 | be-iam-authz-audit 合入 | FG-3：邮件 + 自助注册 | CONTRACTS §48<br>注册流程冒烟 |
| **fg-account-health-check** | `account/health.go` 新建（巡检任务）<br>`gateway/autodisable.go` 加自动启用逻辑<br>设置 API 加 health_check 配置 | be-account-refactor 合入 | FG-4：账号巡检与自动恢复 | CONTRACTS §49<br>手工触发巡检 |
| **fg-ops-dashboard** | `usage/reports.go` 新建（多维报表）<br>`usage/export.go` 新建（CSV 导出）<br>`job/` 加 retention 配置<br>`web/views/dashboard/` 增强 | be-usage-refactor 合入 | FG-6：运营仪表盘与报表 | CONTRACTS §50<br>导出与保留期测试 |

其余 FG 功能（FG-5/7/8/9/10/11）因工作量或依赖复杂度,推到第三轮或独立插件实现。

---

## 二、各波依赖顺序与时间线

```
第一轮（6 fix + 4 plugins）合入
   ↓
【第 1 波】6 agent（公共层）→ 约 3–5 天并行 → 全部合入
   ↓
【第 2 波】6 agent（分层重构）→ 约 5–7 天并行 → 全部合入
   ↓
【第 3 波】10 agent（5 前端 + 5 功能）→ 约 7–10 天并行
```

关键路径：be-common-layer（1 天）→ be-billing-refactor（2 天）→ be-usage-refactor（2 天）→ fg-* 功能（各 1–2 天）。前端与功能可完全并行,但前端内部 DS 组件需先完成（2 天）。

---

## 三、C 类核心功能规格（CONTRACTS §47–§51）

### §47. API Key 增强：额度、限速、IP、模型限制（FG-1）

**数据模型**（迁移 `0031_apikey_limits.sql`）

```sql
ALTER TABLE api_keys ADD COLUMN quota_amount numeric(20,8);      -- null = 无限额度
ALTER TABLE api_keys ADD COLUMN quota_period varchar(20);        -- null | 5h | 1d | 7d
ALTER TABLE api_keys ADD COLUMN quota_consumed numeric(20,8) NOT NULL DEFAULT 0;
ALTER TABLE api_keys ADD COLUMN quota_reset_at timestamptz;
ALTER TABLE api_keys ADD COLUMN rpm_limit int;                   -- 0 = 无限
ALTER TABLE api_keys ADD COLUMN ip_whitelist jsonb NOT NULL DEFAULT '[]';  -- [] = 所有 IP
ALTER TABLE api_keys ADD COLUMN ip_blacklist jsonb NOT NULL DEFAULT '[]';
ALTER TABLE api_keys ADD COLUMN model_allowlist jsonb NOT NULL DEFAULT '[]';  -- [] = 所有模型
CREATE INDEX api_keys_quota_reset_idx ON api_keys (quota_reset_at) WHERE quota_reset_at IS NOT NULL AND deleted_at IS NULL;
```

**REST 接口**（apikey 负责）

- `POST /api-keys`、`PATCH /api-keys/:id` 接受上述字段（quota_consumed 只读）
- `GET /api-keys/:id` 返回 `quota_usage: {amount, period, consumed, reset_at, utilization}`
- 网关鉴权（`apikey.Authenticate`）加检查：IP 黑白名单（client_ip）、模型 allowlist（req.model）、RPM（Redis `rl:key:{id}:rpm:{minute}`）、额度（每次请求扣 total_cost,period 到期时重置 consumed）

**权限**：复用现有 `apikey:all:manage` / `apikey:self:manage`。

**事件**：复用 `balance.changed`（Key 额度也是余额的一种）。

**前端**：AllApiKeysView 与 MyApiKeysView 加"额度/限速/IP/模型"配置卡片。

**测试**：E2E 验证 RPM 限流、IP 黑名单拒绝、模型限制生效。

---

### §48. 客户端模型列表 + 模型广场（FG-2）

**数据模型**：复用现有 `prices` 表的 model 字段,新增 `model_metadata` 表（可选,phase 2）：

```sql
CREATE TABLE model_metadata (
    id varchar(200) PRIMARY KEY,
    display_name jsonb NOT NULL,       -- {en, zh}
    description jsonb,
    provider varchar(50) NOT NULL,
    category varchar(50),               -- chat | image | audio | embedding
    context_window int,
    pricing_unit varchar(20),           -- per-1k-tokens | per-image | per-minute
    deprecated boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);
```

**REST 接口**（platforms 负责,网关路由）

- `GET /v1/models`（公开,不鉴权）：返回 OpenAI 格式 `{object:"list", data:[{id,object:"model",created,owned_by}]}`。模型来源：`SELECT DISTINCT model FROM prices WHERE enabled=true UNION SELECT DISTINCT jsonb_object_keys(model_mapping) FROM accounts WHERE deleted_at IS NULL`,按 id 排序。
- `GET /api/v1/models/catalog`（`price:read`）：管理员模型目录,返回 `[{id, display_name, provider, category, context_window, has_price, deprecated}]`,前端模型广场页使用。

**前端**：新建 `web/views/models/ModelsView.vue`（卡片布局,支持搜索与分类筛选）。

**测试**：`curl -H "Authorization: Bearer sk-xxx" /v1/models` 返回 JSON；模型广场页正确显示。

---

### §49. 邮件服务 + 自助注册、邮箱验证、找回密码（FG-3）

**数据模型**（迁移 `0032_email_verification.sql`）

```sql
ALTER TABLE users ADD COLUMN email_verified boolean NOT NULL DEFAULT false;
CREATE TABLE email_verifications (
    id bigserial PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email varchar(255) NOT NULL,
    token varchar(64) NOT NULL UNIQUE,
    purpose varchar(20) NOT NULL,       -- registration | password_reset
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_verifications_token_idx ON email_verifications (token) WHERE used_at IS NULL;
```

**核心接口**（iam 负责）

- `internal/mailer/mailer.go`：`Send(ctx, to, subject, body, html)`,支持 SMTP 与 SendGrid（环境变量配置）。
- `POST /auth/register`（公开）：`{email, password, display_name, invite_code?}` → 201,发验证邮件。
- `POST /auth/verify-email`（公开）：`{token}` → 200,标记 `email_verified=true`。
- `POST /auth/forgot-password`（公开）：`{email}` → 200（无论邮箱是否存在,防止枚举）。
- `POST /auth/reset-password`（公开）：`{token, new_password}` → 200。

**设置**（`GET/PUT /settings/registration`,`settings:read` / `settings:manage`）

```json
{
  "enabled": false,
  "require_invite_code": false,
  "invite_codes": ["alpha2026"],
  "require_email_verification": true,
  "default_role": "user",
  "smtp_host": "",
  "smtp_port": 587,
  "smtp_user": "",
  "smtp_password_enc": "",
  "from_email": "noreply@example.com"
}
```

**前端**：`web/views/auth/{RegisterView,VerifyEmailView,ForgotPasswordView,ResetPasswordView}.vue`。

**测试**：注册流程 E2E（mock SMTP）,验证邮件发送与 token 校验。

---

### §50. 账号健康巡检 + 自动启用 + 管理员错误策略（FG-4）

**数据模型**：复用 `accounts.status_reason`、`settings.auto_disable`。新增字段：

```sql
ALTER TABLE settings ADD COLUMN health_check jsonb NOT NULL DEFAULT '{"enabled":false,"interval_minutes":60,"auto_enable":true,"success_threshold":2}';
```

**核心接口**（account 负责）

- `account/health.go`：后台任务 `HealthCheckLoop`,每 `interval_minutes` 扫描 `status='disabled' AND status_reason LIKE 'matched auto-disable%'` 的账号,调用 `POST /accounts/:id/test`（内部调用,不经 HTTP）,连续成功 `success_threshold` 次后 `status='active'`、清空 `status_reason`、发 `account.status_changed` 事件。
- `GET/PUT /settings/health-check`（`settings:read` / `settings:manage`）：`{enabled, interval_minutes, auto_enable, success_threshold}`。

**网关改动**（gateway 负责）

- `gateway/autodisable.go` 的 `AutoDisable` 改名为 `HandleAccountFailure`,合并自动禁用与自动启用逻辑：成功响应时,若账号曾被自动禁用且 `auto_enable=true`,调用 `account.TryAutoEnable(ctx, id)`（插件返回 nil error、status 2xx、effect != DISABLE,连续成功计数 +1,达到 `success_threshold` 后启用）。

**前端**：`views/settings/SettingsView.vue` 加"账号健康巡检"卡片。

**测试**：手工禁用账号（写 `status_reason='matched auto-disable rule: status 401'`）,启动巡检任务,验证自动恢复。

---

### §51. 运营仪表盘、多维报表、导出、保留期（FG-6）

**数据模型**：复用 `usage_logs`、新增保留期配置。

```sql
ALTER TABLE settings ADD COLUMN usage_retention jsonb NOT NULL DEFAULT '{"enabled":true,"keep_days":90,"archive_before_delete":false}';
```

**REST 接口**（usage 负责）

- `GET /usage/summary` 增强：支持 `group_by=day,model,user,account,platform,error_type`（多维）,返回 `{groups: [{key, label, metrics: {requests, tokens, cost, error_rate}}], total}`。
- `POST /usage/export`（`usage:all:read`）：`{from, to, filters, format: csv|json}` → 后台任务 ID,完成后可下载（或直接流式返回 CSV）。
- `GET/PUT /settings/usage-retention`（`settings:read` / `settings:manage`）：`{enabled, keep_days, archive_before_delete}`。

**后台任务**（job 负责）

- `job/retention.go` 加 usage 保留：每天 `DELETE FROM usage_logs WHERE created_at < now() - interval '$1 days' AND billing_status <> 'pending'`（pending 的不删）。

**前端**（dashboard 负责）

- `DashboardView.vue` 增强：时间范围选择器（今日/昨日/7日/30日/自定义）、模型分布饼图、Top 10 用户/账号、错误率趋势、快捷入口（价格/账号/用量）。
- `UsageView.vue` 加"导出"按钮与"多维分析"标签页（切换 group_by）。

**测试**：报表接口返回正确聚合、CSV 导出格式正确、保留期任务删除旧数据。

---

## 四、对审计条目的异议

| 条目 | 异议 | 理由 |
|---|---|---|
| BE-P1-10（44 个 handler 直写 SQL） | **同意,但分 6 批**（不是一次全改） | 第 2 波的 6 个 agent 各改一个模块,避免冲突 |
| RL-4（网关中间件化） | **同意,拆 2 个 agent** | gw-pipeline-refactor（call 拆分）+ gw-routes-call-split（中间件化） |
| FG-5/7/9/11（支付/通知/2FA/订阅） | **推迟到第三轮或插件** | 工作量 ≥ 1 周,且支付需要对接第三方 |
| UI-P1-2（STable 缺排序/勾选/批量） | **同意,但在 fe-ds-components 一次做完** | 这是设计系统组件,不在页面改版里零散做 |
| AR-P1-4（网关与核心表契约） | **暂不做,等架构收敛** | 多节点架构本身在演进（见 CONTRACTS §33–40）,过早抽象会僵化 |
| PL-P1-1（轮询 3 套、提交 2 套） | **同意,但归插件 SDK agent** | 这是第一轮 fix-plugins-sdk 的延续,不在第二轮 |
