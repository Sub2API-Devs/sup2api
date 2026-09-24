# sub2api-next 开发契约（阶段 0，已冻结）

本文件是所有开发 agent 的共同依据。**修改本文件、`sdk/proto`、`sdk/manifest`、`server/internal/core`、`server/internal/migrations/0001_core.sql` 必须经过主控**；发现契约不够用时，在交付说明里写明需要的改动，不要自行修改。

设计背景见 [ARCHITECTURE.md](ARCHITECTURE.md)。

---

## 1. 目录与负责人

| 路径 | 负责人 | 说明 |
|---|---|---|
| `sdk/proto`、`sdk/gen`、`sdk/manifest` | 主控 | gRPC 契约、manifest 类型 |
| `server/internal/core`、`config`、`store`、`httpapi`、`testutil`、`migrations`、`cmd/sub2api/main.go`、`internal/app` | 主控 | 共享基础、组装 |
| `server/internal/iam`、`authz`、`apikey`、`group`、`proxy`、`account` | A core-data | |
| `server/internal/billing`（含 `billing/expr`）、`usage`、`event`（写入端 Emit） | B billing | |
| `server/internal/plugin`（除 `sandbox`、`egress`）、`plugin/grpcruntime`、`plugin/market` | C plugin-runtime | |
| `server/internal/cluster`、`plugin/sandbox`、`plugin/egress`、`sdk/pluginsdk/egress` | D sandbox-network | |
| `sdk/pluginsdk`（除 `egress`）、`plugins/anthropic`、`plugins/guard`（Go 部分）、`tools/sub2api-plugin` | E sdk-plugins | |
| `web/`、`plugins/guard/ui/native` | F frontend | |
| `server/internal/gateway` | G gateway（阶段 2） | |
| `server/internal/event/delivery`、`server/internal/job` | H events-jobs（阶段 2） | |
| `deploy/`、`e2e/` | QA | |

每个模块对外只暴露：构造函数、实现 `core` 接口的类型、`RegisterRoutes(r *httpapi.Router)`。**模块之间只通过 `core` 里的接口依赖，不 import 别人的包**（`core`、`store`、`httpapi`、`config`、`testutil` 除外）。组装由主控在 `internal/app` 完成。

## 2. 构建与测试

- Go 1.27；`next/go.work` 包含 `sdk`、`server`；新增的 Go module（插件、工具）加入 `go.work`，并在自己的 `go.mod` 里 `replace github.com/Sub2API-Devs/sup2api/next/sdk => ../../sdk`（按相对路径）
- 下载依赖：`GOPROXY=https://goproxy.cn,direct`（只在命令里临时设置）；整理依赖用 `GOWORK=off go mod tidy`
- 重新生成 proto：`cd sdk && buf generate`（工具在 `go env GOBIN`）
- 每个模块完成时必须通过：`go vet ./...`、`GOOS=linux go build ./...`、本模块的 `go test ./...`
- **数据库测试**：用 `testutil.DB(t)`，需要环境变量 `TEST_DATABASE_URL`（超级用户 DSN），没有时自动跳过。本机通过 SSH 隧道连接 ovh 上的测试库：`TEST_DATABASE_URL=postgres://postgres:sub2api@127.0.0.1:45432/postgres?sslmode=disable`（隧道：`ssh -N -L 45432:127.0.0.1:45432 -L 36379:127.0.0.1:36379 ovh`，主控已在本机常驻开启）
- **Redis 测试**：单元测试用 `github.com/alicebob/miniredis/v2`；集成测试可用 `TEST_REDIS_URL=redis://127.0.0.1:36379/0`
- Linux 专有代码用 `//go:build linux`，并提供非 Linux 的空实现，保证 Windows 上也能编译
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
| POST `/auth/logout` | auth | 吊销当前 refresh token |
| POST `/auth/step-up` | auth | `{password}` → `{step_up_token, expires_in}` |
| GET `/me` | auth | `{id, email, display_name, roles:[key], permissions:[key], superuser}` |
| GET `/me/menus` | auth | 侧边栏：`[{section, items:[{id, label, icon, path, plugin_key?}]}]`（核心菜单按权限过滤，加上插件菜单） |
| PUT `/me/password` | auth | `{old_password, new_password}` |

### 5.2 用户、角色、权限（A）

| 方法 路径 | 权限 |
|---|---|
| GET `/users`（`?q=&status=`） | `user:read` |
| POST `/users` `{email, display_name, password, role_keys[], max_concurrency}` | `user:create` |
| GET/PATCH `/users/:id` | `user:read` / `user:update` |
| DELETE `/users/:id` | `user:delete` |
| PUT `/users/:id/roles` `{role_keys[]}` | `role:manage` |
| PUT `/users/:id/groups` `{group_ids[]}` | `group:manage` |
| GET `/roles` / POST `/roles` / PATCH `/roles/:id` / DELETE `/roles/:id` | `role:read` / `role:manage` |
| PUT `/roles/:id/permissions` `{permission_keys[]}` | `role:manage` |
| GET `/permissions` | `role:read`；按 module 分组：`[{module, label, source, plugin_key, status, permissions:[{key,label,sensitive,status}]}]` |

### 5.3 API Key、分组、代理（A）

| 方法 路径 | 权限 |
|---|---|
| GET/POST `/me/api-keys`，DELETE `/me/api-keys/:id` | `apikey:self:manage`；创建返回一次性明文 `key`（`sk-s2a-` 前缀） |
| GET `/me/groups` | auth（当前用户可用的分组） |
| GET `/api-keys`，PATCH/DELETE `/api-keys/:id` | `apikey:all:read` / `apikey:all:manage` |
| GET/POST `/groups`，GET/PATCH/DELETE `/groups/:id` | `group:read` / `group:manage` |
| GET/POST `/proxies`，PATCH/DELETE `/proxies/:id`，POST `/proxies/:id/test` | `proxy:read` / `proxy:manage` |

### 5.4 账号（A；类型和表单来自插件注册表）

| 方法 路径 | 权限 | 说明 |
|---|---|---|
| GET `/account-types` | `account:read` | `[{plugin_key, plugin_name, platform, type, label, description, form:{mode, page?, component?}, sensitive_fields}]` |
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
| GET/POST `/prices`，GET/PATCH/DELETE `/prices/:id` | `price:read` / `price:manage` |
| POST `/prices/validate` `{mode, config?, expression?}` → `{ok, expression, errors[], warnings[]}` | `price:read` |
| POST `/prices/preview` `{price_id? \| mode+config/expression, usage:{p,c,cr,cc,cc1h,len?}, headers:{}, params:{}, at?, group_id?}` → `{cost, tier, rules:[{cond,multiplier,matched}], breakdown:{...}}` | `price:read` |
| POST `/prices/:id/override`（复制插件默认价格为管理员价格） | `price:manage` |
| GET `/prices/history/:expr_hash` | `price:read` |
| GET `/me/balance` → `{balance}`；GET `/me/ledger` | `balance:self:read` |
| GET `/ledger`（`?user_id=&kind=`） | `balance:all:read` |
| POST `/users/:id/balance/adjust` `{amount, credit:bool, note}` | `balance:adjust` |
| GET `/me/usage`，GET `/usage`（`?user_id=&group_id=&account_id=&model=&from=&to=&success=`），GET `/usage/:id` | `usage:self:read` / `usage:all:read` |
| GET `/usage/summary`（`?from=&to=&group_by=day\|model\|user`） | `usage:all:read` |
| GET/PUT `/settings/billing` `{missing_price_policy: reject\|free, min_balance, big_cost_warning_usd}` | `settings:read` / `settings:manage` |

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
| `usage.recorded` | `{request_id, user_id, api_key_id, group_id, account_id, plugin_key, platform, protocol, model, success, status_code, error_type, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, total_cost, billing_status, latency_ms, created_at}` | B（结算后） |
| `account.created` / `account.updated` / `account.deleted` | `{account_id, plugin_key, platform, type, name}` | A |
| `account.status_changed` | `{account_id, platform, status, reason, cooldown_until?}` | A |
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
| `authz:version` | STRING | A |
| `stepup:{token}` | STRING user_id，TTL 5m | A |
| `apikey:{sha256}` | STRING 缓存（JSON），TTL 60s | A |
| `balance:{user_id}` | STRING 余额缓存 | B |
| `sticky:{rule}:{group}:{model}:{hash}` | STRING account_id，TTL | G |
| `sticky:stats:{rule}` | HASH hits/misses/rebinds | G |
| `plugin:kv:{plugin_key}:{ns}:{key}` | STRING | C |
| `hook:breaker:{plugin}:{hook}` | STRING | G |

广播频道：`plugin:events`、`authz:changed`、`account:changed`、`config:changed`（`core/ports_cluster.go`）。

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
