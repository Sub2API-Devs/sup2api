# sub2api-next 开发契约（阶段 0 冻结；2026-09-24 并入阶段 1 交付的变更）

本文件是所有开发 agent 的共同依据。**修改本文件、`sdk/proto`、`sdk/manifest`、`server/internal/core`、`server/internal/migrations/0001_core.sql` 必须经过主控**；发现契约不够用时，在交付说明里写明需要的改动，不要自行修改。

设计背景见 [ARCHITECTURE.md](ARCHITECTURE.md)。

---

## 1. 目录与负责人

| 路径 | 负责人 | 说明 |
|---|---|---|
| `sdk/proto`、`sdk/gen`、`sdk/manifest`、`sdk/protocol`（go-plugin 握手）、`sdk/pkgsig`（包签名格式） | 主控 | 契约 |
| `server/internal/core`、`config`、`store`、`httpapi`、`testutil`、`migrations`、`secret`（AES-GCM）、`deps`、`cmd/sub2api/main.go`、`internal/app` | 主控 | 共享基础、组装 |
| `server/internal/iam`、`authz`（含 `/me/menus`） | A1 identity | 用户、登录、JWT、step-up、RBAC、权限目录 |
| `server/internal/apikey`、`group`、`proxy`、`account` | A2 resources | API Key、分组、代理、账号、账号类型接口 |
| `server/internal/billing`（含 `billing/expr`）、`usage`、`event`（Emit 写入端） | B billing | |
| `server/internal/plugin/pkg`（解包、manifest 校验、签名与信任）、`plugin/install`（上传、审查、授权确认、卸载）、`plugin/market`、`plugin/api`（`/plugins`、`/publishers`、`/market`、`/nodes`、`/ui/plugins` 接口） | C1 plugin-lifecycle | |
| `server/internal/plugin/registry`（generation）、`plugin/grpcruntime`（进程、能力适配、HostService）、`plugin/rollout`（两阶段发布、对账）、`plugin/dbschema`（插件 schema、角色、迁移、DSN）、`plugin/routes`（`/api/v1/p/:key/*`、`/plugin-ui`） | C2 plugin-runtime | |
| `server/internal/cluster`、`plugin/sandbox`、`plugin/egress`、`sdk/pluginsdk/egress` | D sandbox-network | |
| `sdk/pluginsdk`（除 `egress`）、`plugins/anthropic`、`plugins/guard`（Go 部分）、`tools/sub2api-plugin` | E sdk-plugins | |
| `web/`、`plugins/guard/ui/native` | F frontend | |
| `server/internal/gateway`（含粘性会话、`/sticky-rules` 接口） | G gateway（阶段 2） | |
| `server/internal/event/delivery`、`server/internal/job` | H events-jobs（阶段 2） | |
| `deploy/`、`e2e/`、`Dockerfile` | QA | |

每个模块对外只暴露：构造函数、实现 `core` 接口的类型、`RegisterRoutes(r *httpapi.Router)`。**模块之间只通过 `core` 里的接口依赖，不 import 别人的包**（`core`、`store`、`httpapi`、`config`、`testutil` 除外）。组装由主控在 `internal/app` 完成。

## 2. 构建与测试

- Go 1.27；`next/go.work` 包含 `sdk`、`server`；新增的 Go module（插件、工具）加入 `go.work`，并在自己的 `go.mod` 里 `replace github.com/Sub2API-Devs/sup2api/next/sdk => ../../sdk`（按相对路径）
- 下载依赖：`GOPROXY=https://goproxy.cn,direct`（只在命令里临时设置）；整理依赖用 `GOWORK=off go mod tidy`
- 重新生成 proto：`cd sdk && buf generate`（工具在 `go env GOBIN`）
- 每个模块完成时必须通过：`go vet ./...`、`GOOS=linux go build ./...`、本模块的 `go test ./...`
- **数据库测试**：用 `testutil.DB(t)`，需要环境变量 `TEST_DATABASE_URL`（超级用户 DSN），没有时自动跳过。本机通过 SSH 隧道连接 ovh 上的测试库：`TEST_DATABASE_URL=postgres://postgres:sub2api@127.0.0.1:45432/postgres?sslmode=disable`（隧道：`ssh -N -L 45432:127.0.0.1:45432 -L 36379:127.0.0.1:36379 ovh`，主控已在本机常驻开启）
- **Redis 测试**：单元测试用 `github.com/alicebob/miniredis/v2`；集成测试可用 `TEST_REDIS_URL=redis://127.0.0.1:36379/0`
- Linux 专有代码用 `//go:build linux`，并提供非 Linux 的空实现，保证 Windows 上也能编译
- **所有测试组件一律用 docker compose 启动，禁止在服务器上直接安装或运行任何服务/进程**。测试服务器 ovh 上：测试库为 compose 项目 `sub2api-next-testdb`（目录 `~/sub2api-next-test/testdb`）；需要在 Linux 上运行的 Go 测试（seccomp、/proc 等）用 `next/deploy/ci/compose.yml` 的 `gotest` 服务：把代码同步到 `~/sub2api-next-test/ci/<agent代号>/`，在该目录执行 `docker compose -f next/deploy/ci/compose.yml run --rm gotest go test ...`，用完删除同步目录。不要触碰服务器上的其他 compose 项目和容器
- 前端：Node 24，npm；`web/` 下 `npm ci && npm run build`，产物输出到 `server/web/dist`（由 `server/web` 用 `embed` 嵌入）

## 3. 通用约定

### 3.1 REST 响应

| 情况 | 格式 |
|---|---|
| 成功 | `{"data": ...}` |
| 列表 | `{"data": [...], "page": {"page": 1, "page_size": 20, "total": 123}}`，查询参数 `page`、`page_size`（最大 200） |
| 失败 | HTTP 状态码 + `{"error": {"code": "...", "message": "...", "details": {...}}}` |
| 字段校验失败 | `invalid_argument`，`details.fields = [{"field","code","message"}]` |

错误码（`core/errors.go`）：`invalid_argument` 400、`unauthenticated` 401、`step_up_required` 403、`permission_denied` 403、`not_found` 404、`conflict` 409、`insufficient_balance` 402、`model_price_not_configured` 403、`model_not_allowed` 403、`rate_limited` 429、`no_available_account` 503、`plugin_unavailable` 503、`unavailable` 503、`internal` 500。

### 3.2 数据格式

- ID：JSON 数字（int64）
- 时间：RFC 3339 字符串（UTC）
- 金额：**字符串**，最多 8 位小数，如 `"12.34000000"`，Go 侧用 `decimal.Decimal`
- 多语言文本：`{"en": "...", "zh": "..."}`；前端按当前语言取值，缺失时退回 `en`
- JSON 字段名：snake_case

### 3.3 鉴权

- 控制台：`Authorization: Bearer <access_token>`（JWT，HS256，`sub` 为用户 ID，默认 2 小时有效）
- 敏感操作：先 `POST /api/v1/auth/step-up {"password"}` 得到 `step_up_token`（5 分钟有效，存 Redis），再在请求头带 `X-Step-Up-Token`
- 路由注册：`r.Public` / `r.Authed` / `r.Perm(method, path, permission, handler)`；权限标记为 sensitive 时自动要求 step-up
- 网关：由插件声明的端点按 `auth.headers` 读取 API Key；错误格式按端点的 `errorFormat`

## 4. 权限清单（核心）

模块、key、是否敏感（🔐）。由 A 在 `authz` 中注册为 core 权限，启动时同步到 `permissions` 表。

| 模块 | 权限 |
|---|---|
| user | `user:read` `user:create` `user:update` `user:delete`🔐 |
| role | `role:read` `role:manage`🔐 |
| apikey | `apikey:self:manage` `apikey:all:read` `apikey:all:manage` |
| group | `group:read` `group:manage` |
| account | `account:read` `account:create` `account:update` `account:delete`🔐 `account:test` `account:credential:view`🔐 |
| proxy | `proxy:read` `proxy:manage` |
| price | `price:read` `price:manage` |
| balance | `balance:self:read` `balance:all:read` `balance:adjust`🔐 |
| usage | `usage:self:read` `usage:all:read` |
| sticky | `sticky:read` `sticky:manage` |
| plugin | `plugin:read` `plugin:install`🔐 `plugin:manage` `plugin:uninstall`🔐 `plugin:grant:high` `plugin:grant:critical`🔐 `plugin:egress:read` `plugin:market:read` |
| publisher | `publisher:read` `publisher:manage`🔐 |
| node | `node:read` |
| gateway | `gateway:use` |
| settings | `settings:read` `settings:manage` |

内置角色：`super_admin`（superuser）、`admin`（全部核心权限）、`user`（`apikey:self:manage` `balance:self:read` `usage:self:read` `gateway:use`）。新用户默认分配 `user` 角色。插件权限的 key 为 `plugin.<插件key>:<插件内 key>`，模块为 `plugin.<插件key>`。

## 5. REST API（`/api/v1`）

标注：负责人 / 所需权限（`-` 公开，`auth` 仅需登录）。

### 5.1 认证与当前用户（A）

| 方法 路径 | 权限 | 说明 |
|---|---|---|
| POST `/auth/login` | - | `{email, password}` → `{access_token, refresh_token, expires_in, user}` |
| POST `/auth/refresh` | - | `{refresh_token}` → 同上（轮换 refresh token） |
| POST `/auth/logout` | auth | 请求体 `{refresh_token?}` 可选；吊销该 refresh token |
| POST `/auth/step-up` | auth | `{password}` → `{step_up_token, expires_in}` |
| GET `/me` | auth | `{id, email, display_name, roles:[key], permissions:[key], superuser}` |
| GET `/me/menus` | auth | 侧边栏：`[{section, label:{en,zh}, items:[{id, label, icon, path, plugin_key?}]}]`；section 为 `overview/gateway/finance/system/me/plugins`（核心菜单按权限过滤，加上插件菜单） |
| PUT `/me/password` | auth | `{old_password, new_password}` |

### 5.2 用户、角色、权限（A）

| 方法 路径 | 权限 |
|---|---|
| GET `/users`（`?q=&status=&role=`） | `user:read` |
| POST `/users` `{email, display_name, password, role_keys[], max_concurrency}` | `user:create`；指定非默认角色另需 `role:manage` + step-up |
| GET/PATCH `/users/:id` | `user:read` / `user:update` |
| DELETE `/users/:id` | `user:delete` |
| PUT `/users/:id/roles` `{role_keys[]}` | `role:manage`；只有超级管理员能授予/撤销 `super_admin` |
| GET `/users/:id/groups`，PUT `/users/:id/groups` `{group_ids[]}` | `group:read` / `group:manage` |
| GET `/roles` / GET `/roles/:id` / POST `/roles` / PATCH `/roles/:id` / DELETE `/roles/:id` | `role:read` / `role:manage` |
| PUT `/roles/:id/permissions` `{permission_keys[]}` | `role:manage` |
| GET `/permissions` | `role:read`；按 module 分组：`[{module, label, source, plugin_key, status, permissions:[{key,label,sensitive,status}]}]` |

### 5.3 API Key、分组、代理（A）

| 方法 路径 | 权限 |
|---|---|
| GET/POST `/me/api-keys`，DELETE `/me/api-keys/:id` | `apikey:self:manage`；创建返回一次性明文 `key`（`sk-s2a-` 前缀） |
| GET `/me/groups` | auth（当前用户可用的分组） |
| GET `/api-keys`，PATCH/DELETE `/api-keys/:id` | `apikey:all:read` / `apikey:all:manage` |
| GET/POST `/groups`，GET/PATCH/DELETE `/groups/:id` | `group:read` / `group:manage` |
| GET/POST `/proxies`，GET/PATCH/DELETE `/proxies/:id`，POST `/proxies/:id/test` | `proxy:read` / `proxy:manage` |

### 5.4 账号（A；类型和表单来自插件注册表）

| 方法 路径 | 权限 | 说明 |
|---|---|---|
| GET `/account-types` | `account:read` | `[{plugin_key, plugin_name, plugin_version, asset_base, platform, type, label, description, form:{mode, page?, component?}, sensitive_fields}]` |
| GET `/account-types/:platform/:type/form` | `account:read` | `{schema, ui_schema}` |
| GET `/accounts`（`?platform=&group_id=&status=&q=`） | `account:read` | 列表含 `in_use`（实时并发）、`cooldown_until`、`orphaned` |
| POST `/accounts` | `account:create` | `{name, platform, type, group_ids[], proxy_id, priority, max_concurrency, schedulable, credentials:{...}}` |
| GET/PATCH `/accounts/:id` | `account:read` / `account:update` | 凭证中的敏感字段返回 `"******"`；PATCH 时敏感字段传 `"******"` 表示不修改 |
| DELETE `/accounts/:id` | `account:delete` | |
| POST `/accounts/:id/test` | `account:test` | `{model?}` → `{ok, status, latency_ms, message}` |
| POST `/accounts/:id/credentials/reveal` | `account:credential:view` | 明文凭证 |

### 5.5 计费（B）

| 方法 路径 | 权限 |
|---|---|
| GET/POST `/prices`（`?platform=`），GET/PATCH/DELETE `/prices/:id`；详情返回 `analysis`（表达式读取的参数、请求头、指标） | `price:read` / `price:manage` |
| POST `/prices/validate` `{mode, config?, expression?, platform?}` → `{ok, expression, errors[], warnings[]}` | `price:read` |
| POST `/prices/preview` `{price_id? \| mode+config/expression, usage:{p,c,cr,cc,cc1h,len?}, metrics:{}, headers:{}, params:{}, at?, group_id?}` → `{cost, base_cost, rate_multiplier, expression, expr_hash, tier, rules:[{cond,multiplier,matched}], breakdown:{...}}` | `price:read` |
| POST `/prices/:id/override`（复制插件默认价格为管理员价格） | `price:manage` |
| GET `/prices/history/:expr_hash` | `price:read` |
| GET `/me/balance` → `{balance}`；GET `/me/ledger` | `balance:self:read` |
| GET `/ledger`（`?user_id=&kind=`） | `balance:all:read` |
| POST `/users/:id/balance/adjust` `{amount, credit:bool, note}`，支持请求头 `Idempotency-Key` | `balance:adjust` |
| GET `/me/usage`，GET `/me/usage/:id`，GET `/usage`（`?user_id=&group_id=&account_id=&model=&from=&to=&success=`），GET `/usage/:id` | `usage:self:read` / `usage:all:read` |
| GET `/usage/summary`（`?from=&to=&group_by=day\|model\|user`） | `usage:all:read` |
| GET/PUT `/settings/billing` `{missing_price_policy: reject\|free, min_balance, big_cost_warning_usd}` | `settings:read` / `settings:manage` |

价格表达式校验失败时 `details.fields[].message` 为 `{en, zh}`；表达式错误额外带 `detail`（位置信息）。结算时捕获的参数、请求头和 usage 口径存在 `usage_logs.billing_detail.inputs`。

### 5.6 粘性会话（G 实现调度；规则 CRUD 由 G 负责）

| 方法 路径 | 权限 |
|---|---|
| GET/POST `/sticky-rules`，PATCH/DELETE `/sticky-rules/:id` | `sticky:read` / `sticky:manage` |
| POST `/sticky-rules/:id/flush` | `sticky:manage` |
| GET/PUT `/settings/sticky` `{enabled, default_ttl_seconds, keep_on_account_disabled}` | `sticky:read` / `sticky:manage` |
| GET `/sticky-rules/stats` → `[{rule, hits, misses, rebinds}]` | `sticky:read` |

### 5.7 插件（C；D 提供 egress 和资源数据）

| 方法 路径 | 权限 | 说明 |
|---|---|---|
| GET `/plugins` | `plugin:read` | 列表：key、名称、状态、active/desired 版本、发布者、信任级别、各节点状态汇总 |
| GET `/plugins/:key` | `plugin:read` | 详情：manifest 摘要、授权、节点状态、钩子统计、任务、事件游标、资源 |
| POST `/plugins/upload`（multipart `file`） | `plugin:install` | → 安装审查信息 `review`（见下） |
| POST `/plugins/install-from-market` `{source_id, key, version}` | `plugin:install` | → `review` |
| GET `/plugins/:key/versions/:version/review` | `plugin:read` | 重新获取待确认版本的 `review` |
| POST `/plugins/:key/versions/:version/consent` `{grants:[{permission, scope?}], denied:[permission], role_keys_for_new_permissions:[]}` | `plugin:install` + 按风险 `plugin:grant:high`/`plugin:grant:critical` | 确认授权 |
| POST `/plugins/:key/versions/:version/reject` | `plugin:install` | |
| POST `/plugins/:key/enable`、`/disable` | `plugin:manage` | 发起发布 → `rollout` |
| POST `/plugins/:key/upgrade` `{version}` | `plugin:manage` | 发起升级 → `rollout` |
| GET `/plugins/:key/rollouts/current`，POST `/plugins/:key/rollouts/:id/cancel` | `plugin:read` / `plugin:manage` | |
| DELETE `/plugins/:key?purge=true` | `plugin:uninstall` | |
| GET/PUT `/plugins/:key/settings` | `plugin:read` / `plugin:manage` | |
| GET `/plugins/:key/grants`，DELETE `/plugins/:key/grants/:permission` | `plugin:read` / `plugin:manage` | |
| PUT `/plugins/:key/resources` `{memory_mb, cpu, max_threads, max_open_files}` | `plugin:manage` | |
| PUT `/plugins/:key/egress-policy` `{policy}` | `plugin:manage` | |
| GET `/plugins/:key/egress`（`?from=&to=`） | `plugin:egress:read` | 按域名汇总 + 明细 |
| GET `/plugins/:key/jobs`，POST `/plugins/:key/jobs/:job_id/run` | `plugin:read` / `plugin:manage` | |
| GET `/plugins/:key/events` | `plugin:read` | 游标、积压、死信 |
| GET `/ui/plugins` | auth | 前端扩展：`[{key, version, asset_base, menus, pages, slots, native_entry, trust}]`（按权限过滤） |
| GET `/nodes` | `node:read` | |
| GET `/market/sources`、GET `/market/plugins?source_id=` | `plugin:market:read` | |
| GET/POST `/publishers`，POST `/publishers/:id/keys`，POST `/publishers/:id/revoke`，POST `/publisher-keys/:key_id/revoke` | `publisher:read` / `publisher:manage` | |

补充约定（C1）：
- 插件配置加密存于 `plugin_installs.config_enc`，AES-GCM 的 AAD 为 `"plugin-config:"+key`；配置变更后在 `config:changed` 广播 `{"type":"config","plugin_key":k}`
- 宿主版本取 `main.Version`，比较兼容范围时忽略预发布后缀
- `/nodes` 与插件详情中每个节点的插件状态字段为 `state`（`pending|ready|active|failed`）
- 市场源 `url` 可以指向 `index.json`，也可以是以 `/` 结尾的目录（自动补 `index.json`）
- 插件详情中的钩子统计来自 `core.HookStatsSource`（G），手动执行任务通过 `core.JobTrigger`（H）

`review` 结构：`{plugin_key, version, name, publisher, trust, signature_status, host_compat_ok, capabilities[], gateway_endpoints[], platform:{id, protocols, account_types[]}, hooks[], jobs[], events[], routes[], menus[], user_permissions[], database:{schema, migrations[]}, resources, external_services[], host_permissions:[{id, risk, scope, reason, optional, requires:"plugin:grant:high|critical"}], diff?:{added[], widened[], removed[]}}`。

### 5.8 插件自己的接口与静态资源（C）

- `ANY /api/v1/p/:key/*path`：按 manifest `routes` 匹配；`scope=admin|user` 需要登录并检查 `plugin.<key>:<permission>`；`webhook` 和 `public` 不鉴权；转发给插件 `HTTPService.HandleHTTP`
- `GET /plugin-ui/:key/:version_hash/*path`：插件包内 `ui/`、`forms/`、`i18n/` 下的文件；带长缓存头

### 5.9 网关端点（G）

由 generation 中的 `EndpointBinding` 动态注册（`engine.NoRoute` 之前的分发中间件，参考 new-api `router/plugin-router.go`）。本期只有 `kind=proxy`。

## 6. 事件（outbox 表 `events`）

`core.EventPublisher.Emit(ctx, tx, events...)` 在业务事务里写入。payload（JSON）：

| 类型 | payload | 写入方 |
|---|---|---|
| `usage.recorded` | `{request_id, user_id, api_key_id, group_id, account_id, plugin_key, platform, protocol, model, success, status_code, error_type, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, cache_creation_1h_tokens, total_cost, billing_status, latency_ms, created_at}` | B（结算后） |
| `account.created` / `account.updated` / `account.deleted` | `{account_id, plugin_key, platform, type, name}` | A |
| `account.status_changed` | `{account_id, platform, status, reason, cooldown_until?}`；status 含 `cooldown` | A |
| `user.created` / `user.updated` | `{user_id, email, status}` | A |
| `balance.changed` | `{user_id, ledger_id, delta, balance_after, kind}` | B |
| `plugin.enabled` / `plugin.disabled` | `{plugin_key, version}` | C |

## 7. Redis key

| key | 类型 | 负责人 |
|---|---|---|
| `node:live` | ZSET boot_id → 心跳毫秒 | D |
| `node:info:{boot_id}`、`node:plugins:{boot_id}` | HASH，TTL 15s | D |
| `slot:{kind}:{id}` | ZSET member=`{boot_id}:{request_id}` score=过期毫秒 | D |
| `lock:{name}` | STRING owner token | D |
| `cooldown:account:{id}` | STRING reason，TTL | A |
| `stepup:{token}` | STRING user_id，TTL 5m | A |
| `apikey:{sha256}` | STRING 缓存（JSON），TTL 60s | A |
| `balance:{user_id}` | STRING 余额缓存 | B |
| `sticky:{rule}:{group}:{model}:{hash}` | STRING account_id，TTL | G |
| `sticky:stats:{rule}` | HASH hits/misses/rebinds | G |
| `plugin:kv:{plugin_key}:{ns}:{key}` | STRING | C |
| `hook:breaker:{plugin}:{hook}` | STRING | G |

广播频道：`plugin:events`、`authz:changed`、`account:changed`、`config:changed`（`core/ports_cluster.go`）。权限版本以 PG `authz_meta` 为准，Redis 不存。`config:changed` payload：代理 `{"type":"proxy","id":N}`，插件配置 `{"type":"config","plugin_key":k}`。

槽位回收（D）要求 Redis 为单实例（非 Cluster），且各节点时钟经 NTP 同步。

## 8. 系统设置（`settings` 表）

| key | 值 | 默认 |
|---|---|---|
| `billing` | `{missing_price_policy, min_balance, big_cost_warning_usd}` | `reject`、`"0"`、`"10"` |
| `sticky` | `{enabled, default_ttl_seconds, keep_on_account_disabled}` | `true`、3600、`false` |
| `gateway` | `{max_attempts, platform_call_timeout_ms, default_hook_timeout_ms}` | 3、2000、300 |

## 9. 环境变量

见 `server/internal/config/config.go`。测试额外使用 `TEST_DATABASE_URL`、`TEST_REDIS_URL`。

## 10. 交付要求（每个 agent）

1. 只修改自己负责的目录；需要改契约时在交付说明中列出
2. 代码注释和标识符用英文；用户可见的文案同时提供 `en` 和 `zh`
3. 通过第 2 节的检查；数据库相关逻辑必须有测试（可用 `TEST_DATABASE_URL` 时运行）
4. 在自己的分支上提交，提交信息格式 `feat(next/<模块>): ...`
5. 交付说明写明：完成了什么、没完成什么、对其他模块的假设、需要主控组装的内容（构造函数签名、依赖）

## 11. 跨 agent 约定的格式

### 11.1 插件市场索引（C1 读取，E 的 `sub2api-plugin index` 生成）

`index.json`：

```json
{
  "version": 1,
  "generated_at": "2026-09-24T12:00:00Z",
  "plugins": [{
    "key": "anthropic",
    "name": {"en": "Anthropic", "zh": "Anthropic"},
    "description": {"en": "...", "zh": "..."},
    "publisher": "sub2api",
    "versions": [{
      "version": "0.1.0",
      "url": "https://example.com/anthropic-0.1.0.s2plugin",
      "sha256": "<hex of the .s2plugin file>",
      "size": 1234567,
      "host_compat": ">=0.1.0 <0.2.0"
    }]
  }]
}
```

`index.json.sig`：一行 base64，内容为 Ed25519 对 ASCII 字符串 `"sub2api-market-index-v1:" + sha256hex(index.json 原始字节)` 的签名，使用市场源配置的公钥验证。`url` 可以是相对地址（相对 index.json 所在目录）。

### 11.2 插件出口 SDK（D 实现 `sdk/pluginsdk/egress`，E 调用）

```go
package egress
// Install routes http.DefaultTransport and net.DefaultResolver through the
// host EgressService. Safe to call once, after InitHost.
func Install(client pluginv1.EgressServiceClient) error
// DialContext opens a tunnelled TCP connection (for DB/Redis/gRPC clients).
func DialContext(ctx context.Context, network, address string) (net.Conn, error)
```

插件的 PostgreSQL 连接（受限 DSN）必须使用 `DialContext`（pgx: `cfg.DialFunc = egress.DialContext`）。

### 11.3 插件主进程启动（C2 调 D）

C2 通过 `core.PluginLauncher.Command` 得到 `*exec.Cmd` 交给 go-plugin 的 `ClientConfig.Cmd`；进程启动后调用 `Watch`。主进程的隐藏子命令 `sub2api plugin-exec` 由 D 实现 `sandbox.RunExec(args []string) int`，主控在 `main.go` 接上。

- 插件二进制路径 `runtimes/{os}-{arch}/plugin`，Windows 开发模式为 `plugin.exe`；go-plugin 使用 `SkipHostEnv=true`，插件只拿到 `LaunchSpec.Env`
- 无 cgroup：`LaunchSpec.CPU` 仅换算成 `GOMAXPROCS=ceil(CPU)`；`MaxThreads` 超限只告警不杀进程；`MemoryMB` 超限由看门狗重启
- 平台插件处理本平台账号时，`Account` 消息里携带解密后的凭证

### 11.5 缓存 token 口径（E 插件上报，G 填写 `core.UsageTokens`）

Anthropic 的 `cache_creation_input_tokens` 是总量（含 1 小时缓存）。`UsageTokens.CacheCreation = 总量 − cache_creation_1h_tokens`，`CacheCreation1h = cache_creation_1h_tokens`，两者不重叠。

### 11.6 网关请求 ID 与插件端点状态（G）

- 请求 ID 一律服务端生成（客户端的 `X-Request-Id` 只记录，不作计费幂等键）
- 已安装但未启用的插件，其声明的网关端点返回 503 `plugin_unavailable`
- 测试环境的市场地址为内网 `http://caddy:3120/market/index.json`（市场客户端目前不过滤内网地址；市场源只有 `publisher:manage` 能配置）

### 11.4 测试用 mock 上游（QA 实现）

compose 里的 `mock-upstream` 服务模拟 Anthropic `/v1/messages` 与 `/v1/messages/count_tokens`：流式与非流式都返回带 usage 的响应；请求头 `x-mock-status: 429|401|529|500` 时返回对应错误（429 带 `retry-after: 2`）；`x-mock-delay-ms` 控制延迟。测试环境设置 `SUB2API_GATEWAY_ALLOW_PRIVATE_UPSTREAM=true`，账号 `base_url` 指向 `http://mock-upstream:8080`。
