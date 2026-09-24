# sub2api-next 开发契约（阶段 0 冻结；2026-09-24 并入阶段 1 交付的变更）

本文件是所有开发 agent 的共同依据。**修改本文件、`sdk/proto`、`sdk/manifest`、`server/internal/core`、`server/internal/migrations/0001_core.sql` 必须经过主控**；发现契约不够用时，在交付说明里写明需要的改动，不要自行修改。

设计背景见 [ARCHITECTURE.md](ARCHITECTURE.md)。

---

## 1. 目录与负责人

| 路径 | 负责人 | 说明 |
|---|---|---|
| `sdk/proto`、`sdk/gen`、`sdk/manifest`、`sdk/protocol`（go-plugin 握手）、`sdk/pkgsig`（包签名格式） | 主控 | 契约 |
| `server/internal/core`、`config`、`store`、`httpapi`、`testutil`、`migrations`、`secret`（AES-GCM）、`deps`、`platforms`（内置平台定义，任何模块可 import）、`cmd/sub2api/main.go`、`internal/app` | 主控 | 共享基础、组装 |
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
| GET/POST `/me/api-keys`，DELETE `/me/api-keys/:id` | `apikey:self:manage`；创建返回一次性明文 `key`（`sk-s2a-` 前缀）；不含 `user_email`；普通用户不能修改自己的 Key，只能删除重建 |
| GET `/me/groups` | auth（当前用户可用的分组） |
| GET `/api-keys`，PATCH/DELETE `/api-keys/:id` | `apikey:all:read` / `apikey:all:manage` |
| GET/POST `/groups`，GET/PATCH/DELETE `/groups/:id` | `group:read` / `group:manage` |
| GET/POST `/proxies`，GET/PATCH/DELETE `/proxies/:id` | `proxy:read` / `proxy:manage`；密码省略或 `null` 不改、`""` 清除，没有掩码值（§15.4） |
| POST `/proxies/:id/test` | `proxy:manage`（会发起外部连接） |

### 5.4 账号（A；类型和表单来自插件注册表）

| 方法 路径 | 权限 | 说明 |
|---|---|---|
| GET `/account-types` | `account:read` | `[{plugin_key, plugin_name, plugin_version, asset_base, platform, type, label, description, form:{mode, page?, component?}, sensitive_fields}]` |
| GET `/account-types/:platform/:type/form` | `account:read` | `{schema, ui_schema}` |
| GET `/accounts`（`?plugin_key=&type=&group_id=&status=&q=`） | `account:read` | 列表含 `in_use`（实时并发）、`cooldown_until`、`orphaned` |
| POST `/accounts` | `account:create` | `{name, platform, type, group_ids[], proxy_id, priority, max_concurrency, schedulable, credentials:{...}}` |
| GET/PATCH `/accounts/:id` | `account:read` / `account:update` | 凭证中的敏感字段返回 `"******"`；PATCH 时敏感字段传 `"******"` 表示不修改 |
| DELETE `/accounts/:id` | `account:delete` | |
| POST `/accounts/:id/test` | `account:test` | `{model?}` → `{ok, status, latency_ms, message}` |
| POST `/accounts/:id/credentials/reveal` | `account:credential:view` | 明文凭证 |

### 5.5 计费（B）

| 方法 路径 | 权限 |
|---|---|
| GET/POST `/prices`（`?mode=&source=&plugin_key=&enabled=&q=`），GET/PATCH/DELETE `/prices/:id`；详情返回 `analysis`（表达式读取的参数、请求头、指标） | `price:read` / `price:manage` |
| POST `/prices/validate` `{mode, config?, expression?, platform?}` → `{ok, expression, errors[], warnings[]}` | `price:read` |
| POST `/prices/preview` `{price_id? \| mode+config/expression, usage:{p,c,cr,cc,cc1h,len?}, metrics:{}, headers:{}, params:{}, at?, group_id?}` → `{cost, base_cost, rate_multiplier, expression, expr_hash, tier, rules:[{cond,multiplier,matched}], breakdown:{...}}` | `price:read` |
| POST `/prices/:id/override`（复制插件默认价格为管理员价格） | `price:manage` |
| GET `/prices/history/:expr_hash` | `price:read` |
| GET `/me/balance` → `{balance}`；GET `/me/ledger`（`?kind=&from=&to=`） | `balance:self:read` |
| GET `/ledger`（`?user_id=&kind=&from=&to=`） | `balance:all:read` |
| POST `/users/:id/balance/adjust` `{amount, credit:bool, note}`，支持请求头 `Idempotency-Key` | `balance:adjust` |
| GET `/me/usage`，GET `/me/usage/:id`，GET `/usage`，GET `/usage/:id`（筛选参数见 §15.2；`/me/usage` 不支持 `user_id`、`account_id`、`account_type`） | `usage:self:read` / `usage:all:read` |
| GET `/usage/summary`（`/usage` 的全部筛选参数，加 `group_by=day\|model\|user`） | `usage:all:read` |
| GET/PUT `/settings/billing` `{missing_price_policy: reject\|free, min_balance, big_cost_warning_usd}` | `settings:read` / `settings:manage` |

价格表达式校验失败时 `details.fields[].message` 为 `{en, zh}`；表达式错误额外带 `detail`（位置信息）。结算时捕获的参数、请求头和 usage 口径存在 `usage_logs.billing_detail.inputs`。

- `/prices/preview` 的 `usage` 是按 exclusive 口径填写的 token 数（`p` 不含缓存），服务端按结算同样的规则归一化（ARCHITECTURE §7.3），所以试算结果与实际扣费一致
- 保存价格时，若表达式触发大额费用警告（`big_cost_warning_usd`），返回 400 `invalid_argument` 且 `details.confirmation_required=true`（附 `warnings`），前端二次确认后带 `confirm:true` 重新提交
- 列表接口 `/usage` 不含价格追溯字段；`price_id`、`expr_hash`、`billing_detail` 只在 `GET /usage/:id`、`/me/usage/:id` 返回
- 价格历史 `/prices/history/:expr_hash` 的 `expression` 为规范形式 `v1:<body>`；`/prices/:id` 保留录入时的文本，两者 `expr_hash` 相同

### 5.6 粘性会话（G 实现调度；规则 CRUD 由 G 负责）

| 方法 路径 | 权限 |
|---|---|
| GET/POST `/sticky-rules`，PATCH/DELETE `/sticky-rules/:id` | `sticky:read` / `sticky:manage` |
| POST `/sticky-rules/:id/flush` → `{deleted: n}`；`key_includes` 不含 `rule` 的规则返回 409 | `sticky:manage` |
| GET/PUT `/settings/sticky` `{enabled, default_ttl_seconds, keep_on_account_disabled}` | `sticky:read` / `sticky:manage` |
| GET `/sticky-rules/stats` → `[{rule_id, rule, source, hits, misses, rebinds}]`（统计按规则名，同名规则共享，见 §15.5） | `sticky:read` |

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
- `/nodes` 中每个节点、插件详情 `nodes[]` 中每项的插件状态字段为 `state`（结构见 §15.3）；插件列表与详情的节点汇总都叫 `node_summary` `{total, states}`
- 市场源 `url` 可以指向 `index.json`，也可以是以 `/` 结尾的目录（自动补 `index.json`）
- 插件详情中的钩子统计来自 `core.HookStatsSource`（G），手动执行任务通过 `core.JobTrigger`（H）
- 发布行为（C2）：Disable 立即提交，返回时状态已是 `disabled`；Enable 优先启用 `active_version`，否则取最新的已批准版本；`plugins` 行删除后，各节点在一次对账内停止实例
- **内置插件**（`plugins.builtin=true`，本期为 anthropic）：随镜像提供（`SUB2API_BUILTIN_PLUGIN_DIR`，默认 `/opt/sub2api/builtin`），核心启动时在一个节点上（锁 `plugins:builtin`）自动上传、授予全部宿主权限（新插件权限授予 `admin` 角色）、首次安装后启用，镜像带新版本时自动升级；管理员禁用后保持禁用。签名密钥由入口脚本通过 `SUB2API_BUILTIN_TRUST_KEY` 始终信任。`DELETE /plugins/:key` 对内置插件返回 403，`details.reason = "builtin"`；列表与详情返回 `builtin` 字段
- 升级包的宿主权限没有新增或扩大时，上传即沿用原授权（版本直接为 `approved`）；否则进入 `awaiting_consent`，旧版本继续运行
- 插件设置：GET `/plugins/:key/settings` → `{mode, schema, ui_schema, values, page, component, secret_fields}`（`schema` 在非 schema 模式为 `null`）；PUT 请求体 `{values:{...}}`，整体替换（§15.8）
- `/ui/plugins` 每项另含 `name`、`host_ui_compat`

`review` 结构：`{plugin_key, version, name, publisher, trust, signature_status, host_compat_ok, capabilities[], gateway_endpoints:[{id, platform, method, path, protocol, billing}], platforms:[{id, label, endpoints:[{method, path, protocol, billing}], sticky_rules}], account_types:[{id, label, platforms, form_mode}], hooks[], jobs[], events[], routes[], menus[], user_permissions[], database:{schema, migrations[]}, resources, external_services[], host_permissions:[{id, risk, scope, reason, optional, requires:"plugin:grant:high|critical"}], diff?:{added[], widened[], removed[]}}`。

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
| `hook:breaker:{plugin}:{hook}` | STRING 熔断截止毫秒时间戳，TTL 30s | G |
| `hook:stats:{plugin}:{hook}` | HASH 调用/拒绝/超时/错误计数与延迟桶，TTL 7d | G |
| `hook:statidx:{plugin}` | SET 该插件出现过的钩子 id，TTL 7d | G |
| `plugin:ledger:{key}:{credit\|debit}:{yyyymmdd}` | STRING 插件当日入账/扣款累计，TTL 48h | C2 |

广播频道：`plugin:events`、`authz:changed`、`account:changed`、`config:changed`（`core/ports_cluster.go`）。权限版本以 PG `authz_meta` 为准，Redis 不存。`config:changed` payload：代理 `{"type":"proxy","id":N}`，插件配置 `{"type":"config","plugin_key":k}`。`plugin:events` payload：`{"type":"rollout"|"config","plugin_key","rollout_id"?}`。

节点插件状态（`node:plugins:{boot_id}` 每个插件一个 JSON，C2 写、C1 与控制台读）：`{state, serving, standby?, rollout_id?, rollout?, error?, instances:[{version, state, error?, restarts}]}`。`state` 汇总本节点：有进行中的发布时等于 `rollout`（`pending|ready|active|failed`），否则按在服务的实例为 `active|pending|failed`，没有在服务的版本为 `stopped`。

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
- 插件未启用（已禁用或未安装）时，它声明的网关端点不存在，请求返回 404；`plugin_unavailable` 只用于插件已启用但进程暂时不可用（按失败切换处理）
- 错误格式：`plain` 即核心 REST 格式 `{"error":{code,message}}`；`anthropic` 格式在 `error` 中额外带 `code`（如钩子拒绝时的 `guard_blocked`）
- 所有尝试都失败时：最后一次是上游错误则返回该错误（按 ClassifyError 的状态码与类型）；是插件或账号问题返回 503 `no_available_account`；有账号但并发槽位全满返回 429
- `usage_logs.error_type` 取值另含 `model_not_allowed`、`price_not_configured`、`rate_limited`、`invalid_request`、`plugin_unavailable`、`blocked_by_hook`
- 钩子熔断按节点计数：同一钩子在本节点连续失败 10 次后熔断 30 秒
- 测试环境的市场地址为内网 `http://caddy:3120/market/index.json`（市场客户端目前不过滤内网地址；市场源只有 `publisher:manage` 能配置）

### 11.7 插件调用超时（C2）与任务、事件（H）

- 超时：控制台路径的平台调用（ValidateCredentials、BuildTestRequest）每次插件调用 10 秒，账号测试接口整体（含向上游发测试请求）30 秒；请求热路径 2 秒，调度扩展点 200 毫秒，钩子按 manifest 且最多 2 秒
- 数据迁移 `MigrateData` 在协调者被接管后可能重复执行，插件必须保证幂等
- 任务 cron 默认按 UTC 计算（可用 `CRON_TZ=` 前缀指定时区）；`@every` 的触发时间对齐到周期整数倍，各节点一致；每个触发时间点全集群只执行一次
- 事件投递至少一次：`OnEvents` 返回的确认 id 没有超过游标时按失败处理（退避，连续 10 次失败的批次进入死信）；新订阅从当前最大事件开始，不回放历史

### 11.4 测试用 mock 上游（QA 实现）

compose 里的 `mock-upstream` 服务模拟 Anthropic `/v1/messages` 与 `/v1/messages/count_tokens`：流式与非流式都返回带 usage 的响应；请求头 `x-mock-status: 429|401|529|500` 时返回对应错误（429 带 `retry-after: 2`）；`x-mock-delay-ms` 控制延迟。测试环境设置 `SUB2API_GATEWAY_ALLOW_PRIVATE_UPSTREAM=true`，账号 `base_url` 指向 `http://mock-upstream:8080`。

## 12. 账号类型与端点多对多、全局定价（2026-09-24，ARCHITECTURE 6.6 / 7.3）

本节优先于前文中与之冲突的描述。

**manifest**：`accountTypes` 移到顶层（任何插件都可声明），每个账号类型有 `protocols: [{protocol, requestFields?, passHeaders?, usage?}]`，列出上游原生支持的协议；`platform` 不再含 `accountTypes`；`pricing[]` 不再有 `platform`。声明账号类型需要 capability `platform.adapter.v1` 和宿主权限 `platform.register`。

**core**：`AccountTypeKey{PluginKey, Type}`；`ProtocolConverters.CanConvert(clientProtocol, upstreamProtocol)`（网关实现，账号模块用来列出经转换可服务的端点）；`AccountTypeBinding{Plugin, Type, FormSchema, FormUI, Client}`（`Client` 为声明插件）；`Generation.AccountType(pluginKey, typeID)`、`AccountTypesForProtocol(protocol)`；`AccountRef` 去掉 `Platform`；`AccountDirectory.Candidates(ctx, groupID, []AccountTypeKey)`；`Pricer.Resolve(ctx, model)`；`PriceCatalog.SyncPluginDefaults(ctx, tx, pluginKey, entries)`；`UsageRecord` 新增 `AccountType`、`UpstreamProtocol`，`Platform`/`Protocol` 为客户端端点的平台和协议，`PluginKey` 为账号类型所属插件。

**proto**：`RequestMeta.protocol` = 发给上游的协议；新增 `RequestMeta.client_protocol` = 客户端端点协议；`Account.platform` = 客户端端点所属平台，`Account.type` = 账号类型 id。

**数据库（0005）**：`accounts.platform` 删除（账号类型 = `plugin_key` + `type`）；`model_prices.platform` 删除，唯一约束改为：管理员价格每个 `model_pattern` 一条，插件默认价格每个 `(plugin_key, model_pattern)` 一条；`usage_logs` 新增 `account_type`、`upstream_protocol`。

**调度**：端点协议 P → 候选账号类型 = 原生支持 P 的，加上支持 Q 且核心有 `P→Q` 转换器的（原生优先）→ 分组内这些类型的账号。请求由账号类型所属插件构造；需转换时核心转换请求体和响应（含 SSE）。用量规则：账号类型为该协议声明的 `usage`，否则取声明该协议端点的平台的 `usage`；`requestFields`、`passHeaders` 同理。错误格式始终是端点的 `errorFormat`。

**计费**：`Resolve(model)` 只按模型匹配：管理员价格优先，其次插件默认价格；同一来源内模式越具体越优先（精确优先于通配、通配越长越优先），同样具体的插件默认价格取最早安装的插件；表达式结果为基础价格 × 分组倍率。

**凭证授权**：`accounts.credentials` 的范围为 `{"types": "own"}`：插件只能拿到自己声明的账号类型的账号凭证。

**REST 变更**

| 接口 | 变更 |
|---|---|
| GET `/account-types` | 每项 `{plugin_key, plugin_name, plugin_version, asset_base, trust, type, label, description, form, sensitive_fields, protocols:[protocol], endpoints:[{method, path, protocol, platform, native}]}`；`endpoints` 为该类型当前可服务的已启用端点（`native=false` 表示经核心转换） |
| GET `/account-types/:plugin_key/:type/form` | 取代 `/:platform/:type/form` |
| GET `/accounts` | 筛选参数 `?plugin_key=&type=&group_id=&status=&q=`（去掉 `platform`）；每项返回 `plugin_key`、`type`、`type_label`，不再有 `platform` |
| POST `/accounts` | `{name, plugin_key, type, group_ids[], proxy_id, priority, max_concurrency, schedulable, credentials}` |
| GET/POST `/prices`、preview、validate | 去掉 `platform`（请求与响应） |
| 插件 `review` | 顶层 `account_types:[{id, label, protocols[]}]`；`platform` 不再含 `account_types` |
| 使用记录 | 列表与详情新增 `account_type`、`upstream_protocol` |
| 事件 `account.*` | payload `{account_id, plugin_key, type, name}`（`status_changed` 另含 `status, reason, cooldown_until?`），去掉 `platform` |

**转换失败**：请求无法转换时返回 400 `invalid_argument`（记录类型 `invalid_request`，同类型其他账号跳过、不计失败切换次数）；上游响应无法转换且尚未写出内容时返回 502 `upstream_error`，上游已产生的用量照常计费。没有任何账号类型能服务该端点时返回 503 `no_available_account`。

**组装**：同一个 `convert.Registry`（`convert.Default()`）交给 gateway（`Deps.Converters`）和 account（`Deps.Converters`）。

**插件未启用**：端点不存在，返回 404（见 §11.6）。

## 13. 平台声明端点、账号类型声明平台、内置平台（2026-09-25，ARCHITECTURE 6.6）

本节优先于 §12 及前文中冲突的描述。§12 中"全局定价""凭证授权""转换失败""插件未启用 404"等仍然有效。

**概念**：平台声明端点；账号类型声明支持的平台；账号属于账号类型；分组是一组账号（可混放类型）；API Key 只绑定一个分组。核心内置平台 `anthropic`、`openai`、`gemini`（`server/internal/platforms`，嵌入的 JSON，格式同 manifest `Platform`；任何模块都可以 import，和 `core` 一样）。

**manifest**：删除顶层 `gateway`、`platform`；新增 `platforms: [Platform]`（插件自己的新平台）：`{id, label, endpoints:[Endpoint], requestFields, passHeaders, usage, stickyRules}`，平台协议由端点推出（`Platform.Protocols()`）。`Endpoint` 新增 `usage`（覆盖平台用量规则）、`request.modelParam`（模型取自路径参数）、`request.stream`（端点固定为流式）；路径段可以是 `:param` 或 `:param:suffix`（如 `/v1beta/models/:model:generateContent`）。端点协议必须是 `<平台 id>.<名称>`。`AccountType.protocols` 改为 `platforms: [{platform, requestFields?, passHeaders?, usage?: {<protocol>: UsageRules}}]`。

**校验与冲突**：插件平台 id 不能是内置 id，也不能与其他已安装插件的平台 id 重复；插件平台的端点（method + 路径模式重叠）不能与内置平台或其他插件平台冲突；声明平台需要 `gateway.endpoint`、`platform.register`；声明账号类型需要 `platform.adapter.v1`、`platform.register`、`accounts.credentials {"types":"own"}`；账号类型的 `platforms` 非空，引用的平台可以是内置平台、本插件平台或其他插件平台（未启用时该类型暂时不服务它）。

**core**：`EndpointBinding{Plugin, Platform, Endpoint}`；`PlatformBinding{Plugin, Builtin, Platform}`（去掉 `Client`）；`Generation.Platforms()`、`Platform(id)`、`PlatformForProtocol(protocol)`、`AccountTypesForPlatform(platformID)`（取代 `PlatformsForProtocol`、`AccountTypesForProtocol`）；`AccountTypeBinding.Supports(platformID)`（取代 `Protocol()`）。`Generation.Endpoints()` 包含内置平台和已启用插件平台的端点。

**调度**：端点 → 平台 P、协议 X；候选账号类型 = `AccountTypesForPlatform(P)`（原生），加上支持其他平台 Q、且 Q 的某个协议 Y 满足 `CanConvert(X, Y)` 的类型；候选账号 = API Key 所属分组中这些类型的账号。requestFields / passHeaders：账号类型对该平台的覆盖 → 平台默认。用量规则：账号类型 `usage[协议]` → 端点 `usage` → 平台 `usage`（需转换时按上游协议 Y 所属平台和端点取）。内置平台的默认粘性规则写入 `sticky_rules`，`source='builtin'`、`plugin_key` 为空，只允许改启用状态和优先级。

**REST 变更**

| 接口 | 变更 |
|---|---|
| GET `/platforms`（新，`account:read`） | `[{id, label, builtin, plugin_key, plugin_name, endpoints:[{method, path, protocol, billing}], account_types:[{plugin_key, type, label}]}]`：内置平台 + 已启用插件的平台，以及支持它的已注册账号类型 |
| GET `/account-types` | 每项新增 `platforms:[{id, label, builtin, available}]`（`available`=该平台当前存在）；去掉 `protocols`；`endpoints` 为这些平台的端点（`native=true`）加可经转换服务的端点（`native=false`），每项含 `platform` |
| GET `/groups`、`/groups/:id`、`/me/groups` | 新增 `platforms:[id]`：分组内账号的类型所支持的平台（去重、排序），即绑定该分组的 API Key 能访问的平台 |
| GET `/me/api-keys`、`/api-keys` | 每项新增 `platforms:[id]`（同其分组） |
| 插件 `review` | `platforms:[{id, label, endpoints:[{method, path, protocol, billing}]}]`，`account_types:[{id, label, platforms:[id], form_mode}]`；`gateway_endpoints` 由平台端点推出 |
| 使用记录 | 不变（`platform` = 端点所属平台） |

## 14. 第四轮：OpenAI/Gemini 账号接入、安全加固、插件运行时完善、接口收尾（2026-09-25）

本节优先于前文中冲突的描述。

### 14.1 OpenAI / Gemini 账号接入

- 新增**内置插件** `openai`（账号类型 `apikey` → 平台 `openai`）和 `gemini`（账号类型 `apikey` → 平台 `gemini`），与 anthropic 一样随镜像提供、只能禁用不能卸载（`build-go.sh` 的 `BUILTIN_PLUGINS="anthropic openai gemini"`）。字段：`api_key`（敏感）、`base_url`（默认 `https://api.openai.com` / `https://generativelanguage.googleapis.com`）、`model_mapping`；提供主流模型默认价格。
- openai 插件：`openai.chat` 流式请求强制 patch `stream_options.include_usage=true`，保证上游返回用量。
- gemini 插件：流式请求（`gemini.stream_generate`）上游一律带 `?alt=sse`（网关按客户端是否带 `alt=sse` 重新组装）；模型取 `meta.model`，上游路径 `/v1beta/models/{model}:{action}`，Key 放 `x-goog-api-key`。
- 用量映射值支持 `a+b` 求和（缺失按 0）；`gemini.json` 的 `output_tokens` = `candidatesTokenCount + thoughtsTokenCount`。
- 新接口 `GET /me/platforms`（登录即可）：`[{id, label, builtin, endpoints:[{method, path, protocol, billing}]}]`，当前可用的全部平台（不含账号类型），用于普通用户创建 Key 时预览端点。

### 14.2 安全加固

- **登录限速**：同一邮箱在同一 IP 15 分钟内失败 5 次、或同一 IP 15 分钟内失败 20 次后，登录返回 429 `rate_limited`，`details.retry_after_seconds`；成功登录清除该邮箱+IP 的计数。Redis key `login:fail:e:{sha256(email|ip)}`、`login:fail:ip:{ip}`（带 TTL）。 客户端 IP 取 `c.ClientIP()`：只有来自 `SUB2API_TRUSTED_PROXIES`（逗号分隔的 IP/CIDR，默认空 = 不信任任何代理）的请求才采用 `X-Forwarded-For`。
- **refresh token 重放检测**：refresh token 属于一个家族（`refresh_tokens.family_id`，登录时新建）；轮换时旧 token 标记 `replaced_at`；再次出示已轮换或已吊销的 token 时吊销整个家族并返回 401。
- **SSRF 拨号时校验**：`proxy` 模块给**直连**（不经代理）的上游 HTTP 客户端设置拨号检查，拒绝回环、私有、链路本地、未指定地址，防 DNS 重绑定；`SUB2API_GATEWAY_ALLOW_PRIVATE_UPSTREAM=true` 时放行（`proxy.Options.AllowPrivate`）。经代理的连接不检查（由代理解析）。
- **插件新外部域名告警**：出口隧道每次连接 upsert `plugin_egress_domains`；首次出现的 host 记 WARN 日志并写事件 `plugin.egress_new_domain`。`GET /plugins/:key/egress` 增加 `domains:[{host, first_seen_at, last_seen_at, connections, new}]`（`new` = 24 小时内首次出现）。
- **出口日志长连接**：连接建立时即写一行（`result='open'`），关闭时更新 `result/duration_ms/bytes/closed_at`，控制台立即可见。

### 14.3 插件运行时完善

- **卸载清除账号**：`DELETE /plugins/:key?purge=&purge_accounts=true` 时调用 `core.PluginAccountPurger.PurgePluginAccounts`（账号模块实现，软删除该插件所有账号类型的账号并发事件）；默认保留（孤立账号）。
- **旧版本缓存清理**：节点上不再被 active/desired/standby 引用的插件版本，实例排空后删除其解包目录并关闭包文件句柄。
- **节点重新验签**：节点解包前除 sha256 外再用信任库验证包签名（官方根密钥 + publisher_keys），失败则拒绝加载并在节点状态中报告。
- **资源限制即时生效**：`PUT /plugins/:key/resources` 后广播 `{"type":"resources","plugin_key"}`，各节点用新限制逐个重启该插件实例（先启动新实例再排空旧实例）。
- **插件接口节点自我隔离**：节点 `Healthy()` 为 false 时 `/api/v1/p/:key/*` 与网关端点返回 503 `unavailable`。
- **市场兼容性**：`GET /market/plugins` 每个版本增加 `compatible`（按核心版本判断 `host_compat`）；响应顶层 `host_version`。
- **插件集群广播**：能力 `app.broadcast.v1` + 宿主权限 `broadcast`（低风险）。`HostService.Publish(topic, payload)` 经 Redis 频道 `plugin:broadcast:{plugin_key}` 发出，其他节点把消息交给本地该插件实例的 `AppService.OnBroadcast`（跳过来源节点）。guard 规则修改后广播 `rules.changed`，其他节点立即重载。

### 14.4 接口收尾

- **客户端请求 ID**：网关把客户端 `X-Request-Id`（截断到 128 字符）写入 `UsageRecord.ClientRequestID`；`usage_logs.client_request_id`；管理员使用记录列表/详情返回 `client_request_id`，支持 `?client_request_id=` 精确筛选。
- **`GET/PUT /settings/gateway`**（`settings:read` / `settings:manage`，网关负责）：`{max_attempts, platform_call_timeout_ms, default_hook_timeout_ms}`，校验范围 1–10、100–30000、50–2000。
- 前端此前提出的缺失接口说明见 §15（按后端现状整理）。

## 15. 接口细节补充（按 2026-09-25 代码现状）

本节按 `feat/next-platform`（b1348a775）上 `next/server/internal/**` 的处理器代码整理，描述**现有行为**，供前端对接；与前文不一致之处列在 §15.10，以代码为准，前文待主控裁定后统一。路径均相对 `next/server/internal/`。

通用补充：
- 列表接口（标"分页"）都读 `?page=&page_size=`（默认 1 / 20，`page_size` 最大 200，非法值回落默认），响应 `{data:[...], page:{page, page_size, total}}`（`httpapi/respond.go`）。标"不分页"的接口直接返回 `{data:[...]}`，不读分页参数。
- 时间范围参数 `from`、`to` 一律为 RFC 3339（Go `time.RFC3339`，可带小数秒），语义为 `from <= t < to`（`to` 不含）；格式错误返回 400 `invalid_argument`。时区偏移中的 `+` 在查询串里须编码为 `%2B`（或直接用 `Z`）。
- 布尔查询参数：`/usage` 的 `success` 按 Go `strconv.ParseBool`（`true/false/1/0/t/f`）；`/prices` 的 `enabled` 仅 `true` 或 `1` 视为真，其他任意非空值视为假。
- 创建成功返回 201 `{data}`，删除成功返回 204 无响应体。

### 15.1 API Key（`apikey/apikey.go`、`apikey/platforms.go`）

响应对象 `APIKey`：

| 字段 | 说明 |
|---|---|
| `id`、`user_id` | |
| `user_email` | 只在管理员接口 `/api-keys` 返回；`/me/api-keys` 不含此字段 |
| `name` | 1–100 字符 |
| `key_prefix` | 明文前 12 个字符（如 `sk-s2a-AbCde`），用于识别 |
| `group_id`、`group_name` | |
| `platforms` | `[id]`，该 Key 所属分组内账号类型支持的平台（去重、排序，只含当前存在的平台）；无注册表时为 `[]` |
| `status` | `active` \| `disabled` |
| `expires_at`、`last_used_at` | 可为 `null`；`last_used_at` 每 10 秒批量落库，有延迟 |
| `created_at` | |
| `key` | 明文 Key（`sk-s2a-` + 40 位 base62），**只在创建响应中出现一次** |

| 方法 路径 | 权限 | 请求 | 响应 / 约定 |
|---|---|---|---|
| GET `/me/api-keys` | `apikey:self:manage` | 分页；无筛选参数 | 当前用户未删除的 Key，`id` 倒序 |
| POST `/me/api-keys` | `apikey:self:manage` | `{name, group_id, expires_at?}` | 201 `APIKey`（含 `key`）。`name` 去首尾空格后 1–100 字符；`expires_at` 必须晚于当前时间；`group_id` 须为 `active` 且对该用户可用（`visibility=public` 或已分配给用户），否则 `details.fields[{field:"group_id", code:"not_available"}]` |
| DELETE `/me/api-keys/:id` | `apikey:self:manage` | | 204；只能删自己的 Key（软删除），他人的 Key 返回 404 |
| GET `/api-keys` | `apikey:all:read` | 分页；`?user_id=&group_id=&status=&q=` | 全部未删除的 Key，`id` 倒序。`q` 模糊匹配 Key 名称、用户邮箱（ILIKE），或按前缀匹配 `key_prefix`；`user_id`/`group_id` 非整数返回 400 |
| PATCH `/api-keys/:id` | `apikey:all:manage` | `{name?, status?, group_id?, expires_at?}` | 200 `APIKey`（不含 `key`）。省略的字段不修改；`status` 只能 `active`/`disabled`；`expires_at: null` 清除过期时间，非 null 必须晚于当前时间；改 `group_id` 时按**Key 所有者**校验分组可用性 |
| DELETE `/api-keys/:id` | `apikey:all:manage` | | 204（软删除） |

- 普通用户**没有**修改自己 Key 的接口（没有 `PATCH /me/api-keys/:id`），只能删除重建。
- 修改或删除后立即清除该 Key 的 Redis 缓存（`apikey:{sha256}`），网关侧立即生效。

### 15.2 列表接口的筛选与排序

| 接口 | 分页 | 筛选参数 | 排序 | 代码 |
|---|---|---|---|---|
| GET `/users` | 分页 | `q`（邮箱或显示名 ILIKE）、`status`（`active`\|`disabled`）、`role`（角色 key） | `id` 升序 | `iam/users.go` |
| GET `/groups` | 分页 | `q`（名称 ILIKE）、`status` | `id` 升序 | `group/group.go` |
| GET `/me/groups` | 不分页 | 无（只返回 `active` 且对当前用户可用的分组；字段 `{id, name, description, rate_multiplier, model_allowlist, platforms}`） | `id` 升序 | `group/group.go` |
| GET `/accounts` | 分页 | `plugin_key`、`type`、`status`、`group_id`（整数）、`q`（名称 ILIKE） | `priority` 升序，再 `id` 升序 | `account/handlers.go` |
| GET `/proxies` | 分页 | `q`（名称或主机 ILIKE）、`status` | `id` 升序 | `proxy/proxy.go` |
| GET `/prices` | 分页 | `mode`（`per_request`\|`per_token`\|`expression`）、`source`（`admin`\|`plugin_default`）、`plugin_key`、`enabled`、`q`（`model_pattern` 或 `note` ILIKE） | `model_pattern`、`source`、`plugin_key`（NULL 在前）、`id` | `billing/prices.go` |
| GET `/usage` | 分页 | `user_id`、`api_key_id`、`group_id`、`account_id`（整数）；`model`、`platform`、`billing_status`、`request_id`、`account_type`（精确匹配）；`success`；`from`、`to` | `created_at` 倒序，再 `id` 倒序 | `usage/api.go` |
| GET `/me/usage` | 分页 | 限定当前用户；`api_key_id`、`group_id`、`model`、`platform`、`billing_status`、`request_id`、`success`、`from`、`to`（**不支持** `user_id`、`account_id`、`account_type`） | 同上 | `usage/api.go` |
| GET `/usage/summary` | 不分页 | 同 `/usage` 的全部筛选参数，加 `group_by=day\|model\|user`（默认 `day`）；未给 `from` 时默认最近 30 天 | 按 `key` 升序 | `usage/api.go` |
| GET `/ledger` | 分页 | `user_id`（整数）、`kind`（`usage`\|`admin_adjust`\|`plugin_credit`\|`plugin_debit`\|`refund`）、`from`、`to` | `id` 倒序 | `billing/balance.go` |
| GET `/me/ledger` | 分页 | 限定当前用户；`kind`、`from`、`to` | `id` 倒序 | `billing/balance.go` |
| GET `/plugins` | 分页 | 无 | `key` 升序 | `plugin/api/plugins.go` |
| GET `/sticky-rules` | 不分页 | 无（返回全部来源的规则，含被同名规则遮蔽的和停用的） | `priority` 升序，再 `id` 升序 | `gateway/sticky_api.go`、`gateway/sticky.go` |
| GET `/roles` | 不分页 | 无 | 内置角色在前，再 `id` 升序 | `authz/roles.go` |
| GET `/plugins/:key/egress` | 明细分页 | `from`、`to`（默认最近 24 小时） | 汇总按连接数倒序（最多 200 条）；明细按 `started_at` 倒序 | `plugin/api/ops.go` |

响应字段补充：
- `/usage`、`/me/usage` 列表项：`id, request_id, created_at, user_id, user_email?, api_key_id, api_key_name?, group_id, group_name?, account_id, account_name?, plugin_key, platform, protocol, account_type, upstream_protocol, endpoint, model, upstream_model, stream, status_code, success, error_type, error_message, attempts, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, cache_creation_1h_tokens, total_cost, rate_multiplier, billing_status, billing_mode, matched_tier, latency_ms, first_token_ms, sticky_hit`（`?` 为空串时省略）。`/me/usage`（列表与详情）把 `account_id` 置 `null`，`account_name`、`account_type`、`upstream_protocol` 置空，详情另把 `node_id` 置空。
- `/usage/:id`、`/me/usage/:id` 详情另含：`plugin_version, metrics, sticky_rule, hook_decisions, price_id, price?:{id, model_pattern, source, plugin_key}, expr_hash, billing_detail, ledger_id, client_ip, user_agent, node_id`。`/me/usage/:id` 访问他人记录返回 404。
- `/usage/summary` 每项：`{key, user_email?, requests, success, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, total_cost}`；`group_by=day` 时 `key` 为 UTC 日期 `YYYY-MM-DD`，`user` 时为用户 id 字符串并带 `user_email`；`cache_creation_tokens` 为 5 分钟与 1 小时缓存写入之和。
- `/ledger`、`/me/ledger` 列表项：`{id, user_id, user_email?, user_name?, delta, balance_after, kind, ref_type, ref_id, idempotency_key, operator_id, plugin_key, note, created_at}`（金额为字符串）。
- `/prices` 列表项：`{id, model_pattern, mode, config, expression, expr_version, expr_hash, source, plugin_key, enabled, note, updated_by, updated_at}`；`analysis` 只在详情返回。
- `/users` 列表项：`{id, email, display_name, status, max_concurrency, roles:[key], group_ids:[id], balance?, last_login_at, created_at, updated_at}`；`balance` 只对有 `balance:all:read` 的调用者返回。

### 15.3 GET `/nodes`（`node:read`，`plugin/api/ops.go`；状态 JSON 见 `plugin/rollout/types.go`、`plugin/rollout/reconcile.go`）

不分页，`data` 为当前存活节点数组：

```
[{node_id, boot_id, addr, host_version, started_at, last_heartbeat,
  plugins: { "<plugin_key>": <节点插件状态 JSON> }}]
```

节点插件状态 JSON（每个节点每个插件一份，C2 写入 `node:plugins:{boot_id}`）：

| 字段 | 说明 |
|---|---|
| `state` | 本节点汇总：有进行中的发布时等于 `rollout`；否则按在服务的实例为 `active` \| `pending` \| `failed`；没有在服务的版本为 `stopped` |
| `serving` | 正在服务的版本号（省略表示无） |
| `standby` | 发布中预热的新版本号（省略表示无） |
| `rollout_id` | 进行中的发布 id（省略表示无） |
| `rollout` | 本节点在该发布中的状态 `pending` \| `ready` \| `active` \| `failed`（省略表示无发布） |
| `error` | 错误信息（省略表示无） |
| `instances` | `[{version, state, error?, restarts}]`，实例 `state` 取值 `starting` \| `ready` \| `restarting` \| `failed` \| `draining` \| `stopped` |

- 若某节点写入的状态不是合法 JSON，该值原样作为 JSON 字符串返回。
- 插件列表 `/plugins` 每项的 `node_summary` 为汇总 `{total, states:{<state>: n}}`：`total` 为存活节点数，未上报该插件的节点计入 `absent`，无法解析的计入 `unknown`。
- 插件详情 `/plugins/:key` 中：`node_summary` 同上；`nodes` 为逐节点列表 `[{node_id, boot_id, addr, last_heartbeat, state:<上表 JSON>}]`（只含上报了该插件的节点）。列表中没有 `nodes` 字段。

### 15.4 代理（`proxy/proxy.go`）

响应对象：`{id, name, protocol, host, port, username, has_password, status, account_count, created_at, updated_at}`。**密码从不返回**，只有 `has_password`；`account_count` 为引用该代理的未删除账号数。

| 方法 路径 | 权限 | 请求 | 约定 |
|---|---|---|---|
| POST `/proxies` | `proxy:manage` | `{name, protocol, host, port, username?, password?, status?}` | `name` 1–100 字符（去首尾空格）；`protocol` 为 `http` \| `https` \| `socks5`；`host` 不含 `/ ? # @` 和空白、≤255；`port` 1–65535；`username` ≤255；`password` ≤1024；`status` 为 `active`（默认）\| `disabled`；前四项必填 |
| PATCH `/proxies/:id` | `proxy:manage` | 同上，全部可选 | 省略的字段不修改。**密码约定：省略或 `null` 表示不修改；`""` 表示清除密码；其他任何字符串（包括 `"******"`）都会被保存为新密码**。代理没有掩码约定，前端不要回填 `"******"` |
| DELETE `/proxies/:id` | `proxy:manage` | | 仍被账号引用时返回 409 `conflict`，`details.account_count` |
| POST `/proxies/:id/test` | `proxy:manage`（注意不是 `proxy:read`） | 无请求体 | `{ok, status, latency_ms, message}` |

测试说明：用数据库中保存的设置新建客户端（**禁用状态的代理也能测**），经代理 `GET https://www.google.com/generate_204`（`proxy.Options.ProbeURL` 可配），超时 15 秒。`ok` = 上游状态码 < 400；`status` 为上游状态码（连接失败时为 0）；失败时 `message` 为错误信息或 HTTP 状态行，成功时为空串。测试失败仍返回 HTTP 200。

修改或删除代理后在 `config:changed` 广播 `{"type":"proxy","id":N}`，各节点丢弃缓存的客户端。

### 15.5 粘性会话（`gateway/sticky_api.go`、`gateway/sticky.go`、`gateway/settings.go`）

规则对象：

| 字段 | 说明 |
|---|---|
| `id` | |
| `name` | `^[A-Za-z0-9][A-Za-z0-9_.\-]{0,99}$`，不能是 `stats`；同一 `source` 内唯一 |
| `source` | `admin`（管理员创建）\| `plugin_default`（插件 manifest 平台的 `stickyRules`）\| `builtin`（内置平台默认规则） |
| `plugin_key` | `plugin_default` 为插件 key，其他为 `null` |
| `enabled`、`priority` | 数字小的先评估；新建默认 `enabled=true`、`priority=100`；默认规则按声明顺序初始为 100、101… |
| `match` | `{protocols:[], models:[], user_agent_contains:[]}`（空数组 = 不限；`models` 为通配；`user_agent_contains` 不区分大小写，任一命中即可） |
| `key_sources` | `[{type, path?, name?, needs?}]`，`type` 为 `body`（需 `path`）\| `header`（需 `name`）\| `api_key` \| `user` \| `plugin`（`needs` 为交给插件 `ResolveAffinityKey` 的 body 路径）；至少一项 |
| `value_regex` | 可空；须能编译 |
| `ttl_seconds` | 0–2592000，0 表示使用 `/settings/sticky` 的 `default_ttl_seconds` |
| `key_includes` | `group` \| `model` \| `rule` 的子集，新建默认三项全含 |
| `on_failure` | `failover`（默认）\| `stick` |
| `updated_by`、`updated_at` | |

| 方法 路径 | 权限 | 请求 / 响应 | 约定 |
|---|---|---|---|
| GET `/sticky-rules` | `sticky:read` | → `[规则]` | 不分页 |
| POST `/sticky-rules` | `sticky:manage` | `{name, enabled?, priority?, match?, key_sources, value_regex?, ttl_seconds?, key_includes?, on_failure?}` → 201 规则 | 只能创建 `source=admin`；同名 admin 规则已存在返回 409 |
| PATCH `/sticky-rules/:id` | `sticky:manage` | 同上字段均可选 → 200 规则 | `admin` 规则可改全部字段；`plugin_default` / `builtin` 规则**只能改 `enabled`、`priority`**，带其他字段返回 400 `invalid_argument`（如需改定义，新建同名 admin 规则覆盖） |
| DELETE `/sticky-rules/:id` | `sticky:manage` | 204 | 只能删 `admin` 规则，其他返回 400；已有绑定不删除（等 TTL 过期），若没有其他同名规则则清除统计 |
| POST `/sticky-rules/:id/flush` | `sticky:manage` | → `{deleted: n}` | 删除该规则名下的全部绑定，`deleted` 为删除的 Redis key 数（无 Redis 时为 0）；Redis 出错返回 503。`key_includes` 不含 `rule` 的规则返回 409 `conflict`：它的绑定 key 是 `sticky:_:…`，与其他同类规则共用，无法单独清除，只能等 TTL 过期 |
| GET `/sticky-rules/stats` | `sticky:read` | → `[{rule_id, rule, source, hits, misses, rebinds}]` | 每条规则一项，顺序同规则列表；`rule_id` 对应规则 `id`，`rule` 为规则名 |
| GET `/settings/sticky` | `sticky:read` | → `{enabled, default_ttl_seconds, keep_on_account_disabled}` | 默认 `true`、3600、`false` |
| PUT `/settings/sticky` | `sticky:manage` | 三个字段均可选（省略的不改）→ 修改后的完整对象 | `default_ttl_seconds` 1–2592000 |

- **同名遮蔽**：同名规则只有来源级别最高的一条参与调度（`admin` > `builtin` > `plugin_default`），级别比较时**不看 `enabled`**，所以停用的同名 admin 规则也会遮蔽默认规则。
- **统计与绑定按规则名**（不是 id）：统计 key `sticky:stats:{name}`，绑定 key `sticky:{name}:{group}:{model}:{sha256}`（名称中 `[A-Za-z0-9_.-]` 以外的字符替换为 `_`）。同名规则共享同一份统计，`/stats` 中同名的多项数值相同；flush 任一同名规则都会清除该名称下的全部绑定。
- `key_includes` 不含 `rule` 的规则，其绑定 key 的规则段为 `_`，与其他同类规则共用；flush 这类规则返回 409，控制台不显示"清除绑定"。
- 插件安装/升级时覆盖其 `plugin_default` 规则的定义（保留管理员设置的 `enabled`、`priority`），不再声明的规则删除；内置规则在网关启动时同步，语义相同。

### 15.6 发布记录（`plugin/api/plugins.go`、`plugin/rollout/controller.go`、`core/ports_plugin_infra.go`）

`Rollout` 结构（`POST /plugins/:key/enable|disable|upgrade` 的响应、`GET /plugins/:key/rollouts/current`、插件详情的 `rollout` 字段相同）：

```
{id, plugin_key, action, from_version, target_version, phase, coordinator, error,
 nodes: [{node_id, boot_id, state, error}]}
```

- `action`：`enable` \| `upgrade` \| `disable`；`phase`：`preparing` \| `activating` \| `active` \| `failed` \| `cancelled`；`coordinator` 为协调节点 id；`nodes[].state`：`pending` \| `ready` \| `active` \| `failed`。进行中时 `nodes` 为各节点实时上报，结束后为落库的最终状态。
- `GET /plugins/:key/rollouts/current`（`plugin:read`）只返回 `phase` 为 `preparing`/`activating` 的发布；没有进行中的发布时返回 `{data: null}`（HTTP 200）。插件不存在 404。插件详情的 `rollout` 同理可为 `null`。
- **迁移进度 `migrations[]` 未提供**：`Rollout` 没有数据库迁移的逐项进度字段，迁移失败只体现在 `phase=failed` 与 `error`（以及节点 `error`）。
- `POST /plugins/:key/rollouts/:id/cancel`（`plugin:manage`）成功返回 204。
- `disable` 可带可选请求体 `{reason}`（默认 `"disabled by administrator"`）。`enable` 在插件处于 `awaiting_consent` 时返回 409；`upgrade` 的版本未批准返回 409、签名已吊销返回 403。

插件详情 `GET /plugins/:key` 顶层字段：列表项全部字段（`key, name, status, status_reason, active_version, desired_version, current_version, publisher, trust, signature_status, pending_versions, egress_policy, installed_at, updated_at, builtin`）加 `manifest`（当前版本的 `review` 结构，无版本时 `null`）、`grants:[{permission, risk, scope, status, plugin_version, granted_by, granted_at}]`、`nodes`（逐节点，见 §15.3）、`node_summary`、`hooks:[{id?, point, order, failure, timeout_ms, needs, stats}]`、`jobs`、`events`、`resources:{requested, overrides, effective, max_memory_mb}`、`versions:[{version, consent_status, signature_status, package_sha256, package_size, uploaded_at}]`（上传时间倒序）、`rollout`。插件 `status` 取值 `awaiting_consent` \| `installed` \| `enabling` \| `enabled` \| `upgrading` \| `disabled`；`trust` 为 `official` \| `verified` \| `community` \| `unsigned`；`signature_status` 为 `valid` \| `unsigned` \| `revoked`。

### 15.7 角色（`authz/roles.go`、`authz/http.go`）

角色对象：`{id, key, name:{en,zh}, description:{en,zh}, builtin, superuser, permission_keys:[key], user_count, created_at, updated_at}`。
- `permission_keys` 按权限目录的 `sort`、`key` 排序；`superuser=true` 的角色（`super_admin`）不存权限行，`permission_keys` 为 `[]`，但拥有全部权限，前端应按 `superuser` 判断。
- `user_count` 为持有该角色的未删除用户数。

| 方法 路径 | 权限 | 请求 | 约定 |
|---|---|---|---|
| GET `/roles` | `role:read` | | 不分页，内置在前 |
| GET `/roles/:id` | `role:read` | | 不存在 404 |
| POST `/roles` | `role:manage` | `{key, name, description?, permission_keys?}` | `key` 匹配 `^[a-z][a-z0-9_]{1,49}$`；`name.en` 必填；key 重复 409；未知权限 `details.fields[{field:"permission_keys", code:"unknown"}]` |
| PATCH `/roles/:id` | `role:manage` | `{name?, description?}` | 内置角色也可改名称和描述；给了 `name` 时 `name.en` 不能为空 |
| DELETE `/roles/:id` | `role:manage` | | 内置角色 409；用户的该角色随之删除 |
| PUT `/roles/:id/permissions` | `role:manage` | `{permission_keys}` | 整体替换；超级管理员角色 409；已移除（`status=removed`）的权限视为未知 |

### 15.8 插件设置与前端扩展（`plugin/api/settings.go`、`plugin/api/ui.go`）

GET `/plugins/:key/settings`（`plugin:read`）→

| 字段 | 说明 |
|---|---|
| `mode` | `schema` \| `iframe` \| `native` \| `none`（manifest 未声明 `ui.settings` 时为 `none`） |
| `schema` | `mode=schema` 时为包内 JSON Schema 文件的**内容**（JSON），否则 `null` |
| `ui_schema` | `mode=schema` 且声明了 `uiSchema` 时为其内容，否则 `null` |
| `page` | `mode=iframe` 的入口（省略表示无） |
| `component` | `mode=native` 的组件名（省略表示无） |
| `values` | 当前配置值（解密后）；敏感字段非空时为 `"******"` |
| `secret_fields` | 敏感字段名（Schema 顶层属性中 `writeOnly: true`、`format: "password"` 或 `x-sensitive: true` 的），排序 |

PUT `/plugins/:key/settings`（`plugin:manage`）请求 `{values:{...}}`：
- `values` 是**完整**配置，整体替换（省略的键会被删除）；敏感字段传 `"******"` 表示保留原值。
- `mode=schema` 时按 Schema 校验，失败返回 `invalid_argument`，`details.fields[].field` 为 `values` + JSON Pointer（如 `values/api_key`），`code` 为 `schema`。
- 成功后返回与 GET 相同的结构；审计只记录变更的键名；并在 `plugin:events` 广播配置变更。
- 插件没有可用版本时 GET/PUT 都返回 404（`plugin has no version`）。

GET `/ui/plugins`（登录即可）→ 不分页数组，只含当前 generation 中已启用且声明了 `ui` 的插件：

| 字段 | 说明 |
|---|---|
| `key`、`version` | |
| `name` | `{en, zh}` |
| `asset_base` | `/plugin-ui/{key}/{version_hash}`，拼接包内相对路径加载资源 |
| `menus` | `[{id, section, label, icon?, page, permission?, order?}]`；按调用者权限过滤（`permission` 为插件内 key，检查 `plugin.<key>:<permission>`） |
| `pages` | `{<page_id>: {type, title?, source?, columns?, schema?, submit?, src?, component?}}`；只被无权限菜单引用的页面被去掉 |
| `slots` | `[{slot, component, permission?}]`，按权限过滤 |
| `native_entry` | 仅 `trust` 为 `official`/`verified` 时返回 manifest `ui.native.entry`，否则空串 |
| `trust` | |
| `host_ui_compat` | |

过滤后 `menus`、`slots`、`pages` 全空的插件不返回。

### 15.9 账号（`account/handlers.go`、`account/creds.go`、`account/testreq.go`）

账号对象（列表与详情）：

| 字段 | 说明 |
|---|---|
| `id`、`name`、`plugin_key`、`type` | |
| `type_label` | 账号类型名称 `{en, zh}`；类型未注册（插件禁用/卸载）时为 `null` |
| `group_ids` | `[id]` |
| `groups` | `[{id, name}]`，按 id 升序 |
| `proxy_id` | 可为 `null`（直连） |
| `status` | `active` \| `disabled` |
| `status_reason` | 管理员禁用时为 `"disabled by administrator"`，重新启用时清空 |
| `schedulable`、`priority`、`max_concurrency` | `max_concurrency=0` 表示不限 |
| `in_use` | 当前占用的并发槽位数（集群实时） |
| `cooldown_until` | 冷却截止时间（按 Redis TTL 推算，精确到秒），未冷却为 `null` |
| `cooldown_reason` | 冷却原因，未冷却时省略 |
| `orphaned` | 声明该账号类型的插件未启用（禁用或卸载）时为 `true` |
| `settings` | 非敏感的设置字段（账号类型 `settingsFields` 列出的顶层键），明文 JSON 对象 |
| `credentials` | **仅详情**（`GET /accounts/:id`、创建与修改的响应）：设置字段与加密字段合并后的完整对象，账号类型 `sensitiveFields` 中的非空值替换为 `"******"`；类型未注册时加密部分的所有顶层值都显示为 `"******"`。列表不含此字段 |
| `last_used_at`、`created_at`、`updated_at` | |

创建与修改：
- POST `/accounts`（`account:create`）：`{name, plugin_key, type, group_ids?, proxy_id?, priority?, max_concurrency?, schedulable?, status?, credentials}`；默认 `priority=10`、`max_concurrency=10`、`schedulable=true`、`status=active`。`priority` 0–1000000；`max_concurrency` 0–100000；`proxy_id`、`group_ids` 必须存在（`details.fields[].code = "not_found"`）；账号类型未注册返回 `field:"type", code:"unknown"`。凭证先按表单 Schema 校验，再调插件 `ValidateCredentials`（字段错误路径为 `credentials.<a>.<b>`），插件可规范化凭证。
- PATCH `/accounts/:id`（`account:update`）：同上字段均可选，`plugin_key`/`type` 不可修改（忽略）。`proxy_id: null` 改为直连；`group_ids` 整体替换。`credentials` 给出时为**完整对象**（省略的键会被删除），敏感字段传 `"******"` 保留原值；插件未启用时修改凭证返回 503 `plugin_unavailable`；并发修改凭证返回 409。修改 `status` 会发 `account.status_changed` 事件。
- DELETE `/accounts/:id`（`account:delete`）：软删除，清除分组关系与冷却，204。
- POST `/accounts/:id/credentials/reveal`（`account:credential:view`）：→ `{credentials:{...}}`（合并后的明文），写审计日志。

POST `/accounts/:id/test`（`account:test`）：
- 请求体可省略或为空；可选 `{model}`（交给插件 `BuildTestRequest`，为空时由插件选默认模型）。
- 响应 `{ok, status, latency_ms, message}`：由声明插件构造测试请求，核心经账号的代理（或直连）发出；`ok` = 上游 2xx；`status` 为上游状态码（未发出或网络错误时为 0）；失败时 `message` 为上游响应体前 1 KB（为空时为状态行）或错误信息，成功时为空串。整个测试（含插件构造请求）超时 30 秒。
- 测试失败（包括上游地址为内网/回环被拒、代理被禁用）仍返回 HTTP 200、`ok:false`；只有插件未启用（503 `plugin_unavailable`）、账号不存在（404）、插件调用出错时返回错误状态。
- 直连时目标地址为回环、私有、链路本地等地址会被拒绝（`SUB2API_GATEWAY_ALLOW_PRIVATE_UPSTREAM=true` 时放行）；经代理且本地无法解析的域名交给代理。

### 15.10 与前文不一致的裁定（2026-09-25）

以下各项已裁定，前文相应位置已按裁定改写。

| # | 问题 | 裁定 |
|---|---|---|
| 1 | `/sticky-rules/stats` 另含 `rule_id`、`source`，统计按规则名共享 | **以代码为准**。同名规则本来就是"管理员规则覆盖默认规则"的关系，是同一条逻辑规则，统计和绑定按名称共享是有意的。§5.6 已改 |
| 2 | flush 的返回；`key_includes` 不含 `rule` 的规则无法 flush | 返回 `{deleted: n}`，以代码为准。**改代码**：这类规则原来静默返回 `deleted: 0`，看起来像已清除，现在改为返回 409 `conflict` 并说明原因；控制台对这类规则不再显示"清除绑定"。§5.6、§15.5 已改 |
| 3 | 插件设置 GET 另含 `mode`、`page`、`component`、`secret_fields`；PUT 整体替换 | **以代码为准**。§5.7 已改 |
| 4 | `/ui/plugins` 另含 `name` | **以代码为准**。§5.7 已改 |
| 5 | 插件列表的 `nodes` 是汇总对象，详情的 `nodes` 是逐节点数组，同名不同结构 | **改代码**：列表和详情的汇总统一叫 `node_summary`，`nodes` 只在详情中出现、表示逐节点列表。控制台插件列表原来把汇总对象当成 `{state: 数量}` 解析，节点列显示错误，已一并修正。§5.7、§15.3 已改 |
| 6 | `POST /proxies/:id/test` 的权限；代理密码约定 | **以代码为准**：测试会向外发起连接，需要 `proxy:manage`；代理密码没有掩码值，省略或 `null` 不改、`""` 清除（控制台已按 §15.4 实现）。§5.3 已改 |
| 7 | `/ledger` 另支持 `from`、`to`；`/me/ledger` 支持 `kind`、`from`、`to` | **以代码为准**。§5.5 已改 |
| 8 | `/usage` 的筛选参数更多；`/me/usage` 不支持 `user_id`、`account_id`、`account_type` | **以代码为准**，参数以 §15.2 为准。§5.5 已改 |
| 9 | `/prices` 的 `platform` 筛选已删除 | **以代码为准**：`mode`、`source`、`plugin_key`、`enabled`、`q`。§5.5 已改；§5.4 `/accounts` 的 `platform` 筛选同理改为 `plugin_key`、`type` |
| 10 | 账号测试超时 30 秒与平台调用 10 秒 | **两者都对，不冲突**：每次插件调用（`BuildTestRequest`）限 10 秒（`grpcruntime.TimeoutPlatformConsole`），测试接口整体（含向上游发送测试请求）限 30 秒。§11.7 已改 |
| 11 | `/me/api-keys` 不含 `user_email`；普通用户没有修改自己 Key 的接口 | **以代码为准**：用户只能删除后重建（Key 绑定的分组不应由用户随意切换，名称和过期时间也不是必要功能）。以后需要再加 `PATCH /me/api-keys/:id`。§5.3 已改 |
| 12 | §14 部分条目当时尚未实现 | 已于第四轮实现，见 §14 |
