# sub2api-next 开发进度与交接记录

> 用途：记录派发给开发 agent 的任务、交付结果、待办事项与环境信息，保证上下文压缩或换人接手后能完整恢复现场。
> **每次合并分支、派发新任务、做出决策后都要更新本文件。**
> 最后更新：2026-09-24，11 个 agent 全部合并，`internal/app` 组装完成，ovh 上 17 条验收全部通过（部署提交 `e6f7e4483`）。

相关文档：[ARCHITECTURE.md](ARCHITECTURE.md)（设计）· [CONTRACTS.md](CONTRACTS.md)（开发契约）

---

## 1. 总体状态

| 阶段 | 内容 | 状态 |
|---|---|---|
| 0 | 备份、架构文档、契约（proto、manifest、核心表、core 接口、基础设施骨架） | ✅ 完成 |
| 1 | 9 个 agent 并行开发各模块 | ✅ 全部合并 |
| 2 | 网关（G）、事件投递与任务（H） | ✅ 全部合并 |
| 3 | 主控组装 `internal/app`、在 ovh 上用 compose 部署、跑 17 条验收测试 | ✅ 17/17 通过 |

**分支**：开发分支 `feat/next-platform`（本地），每个 agent 在独立 worktree 的 `next/<代号>` 分支上开发，完成后由主控 `git merge --no-ff` 合并。
**备份**：tag `legacy/v0.2.8`、分支 `legacy/main`（均已推送）。
**远程推送**：`feat/next-platform` 已全部推送到 origin。本机访问 GitHub 时好时坏，推送失败就稍后重试。

---

## 2. Agent 任务与交付

所有 agent 的任务说明都要求：先 `git merge --ff-only feat/next-platform` 再建分支；只改自己的目录；遵守 CONTRACTS；测试组件只用 docker compose；不 push；最终报告写清构造函数与契约变更需求。

| 代号（SendMessage 名称） | 负责目录 | 分支 | 状态 | 提交 | 合并提交 |
|---|---|---|---|---|---|
| a1-identity | `server/internal/iam`、`authz` | next/a1-identity | ✅ 已合并 | 3819efc0b、2ebef13d4 | 2591ae00f |
| a2-resources | `apikey`、`group`、`proxy`、`account` | next/a2-resources | ✅ 已合并 | 02312e823、e2dfca146、1b1ec5cf5、db777e933 | b1f39bfae |
| b-billing | `billing`（含 `expr`）、`usage`、`event` | next/b-billing | ✅ 已合并 | 6221b7db8 | 3041351c8 |
| c1-lifecycle | `plugin/pkg`、`install`、`market`、`api` | next/c1-lifecycle | ✅ 已合并 | 172997d83 | 60937afd0 |
| c2-runtime | `plugin/registry`、`grpcruntime`、`rollout`、`dbschema`、`routes` | next/c2-runtime | ✅ 已合并 | 21067e642 | 53ac81a60 |
| d-sandbox | `cluster`、`plugin/sandbox`、`plugin/egress`、`sdk/pluginsdk/egress` | next/d-sandbox | ✅ 已合并 | 009b0ed9f | f85721f9f |
| e-sdk-plugins | `sdk/pluginsdk`、`plugins/anthropic`、`plugins/guard`（Go）、`tools/sub2api-plugin` | next/e-sdk-plugins | ✅ 已合并 | 237873003 | 22b4387d6 |
| f-frontend | `web/`、`plugins/guard/ui/native` | next/f-frontend | ✅ 已合并（含 3 个子 agent） | 2c8cfe488、3fdab6209、a4af8d707 | 3bbdc760e |
| qa-deploy | `Dockerfile`、`deploy/`、`e2e/` | next/qa-deploy | ✅ 已合并 | 7d7ea1c15、ce5111dc5 | e55c32a85 |
| g-gateway（阶段 2） | `server/internal/gateway`（含粘性会话） | next/g-gateway | ✅ 已合并 | 6a1e91436 | da90fc0ec |
| h-events-jobs（阶段 2） | `event/delivery`、`job` | next/h-events-jobs | ✅ 已合并 | 04a6c87fb | c8caaca75 |

主控自己的提交：`6de334386` 架构文档 · `5a3f05dc9` 阶段 0 契约 · `d2d44ad1b` 迁移测试 · `6e3d0fadc` 插件协议/签名/加密 · `8586025b6` 发布/schema/默认值接口与格式 · `7e8518afc` compose 测试规则 · `c3a19b057` Ledger.ApplyTx、0002 迁移、gofmt · `b84f458e9` 阶段 2 接口 · `7227ff4d5` 阶段 1 契约变更并入 CONTRACTS · `222d4b194` 前端 SPA 处理（CSP nonce）与 plugin-exec · `e7a64d627` 测试模板库 · `d87ae94d7` 插件迁移改用插件角色登录执行（修复 RESET ROLE 提权） · `8944ebb86` 移除误提交的 mock-upstream 二进制 · `d09008a43` `internal/app` 组装 · `a69f68f55` 挂载网关、插件详情接 JobTrigger/HookStatsSource · `896ea01a5`、`5bc00f3df`、`e6f7e4483` e2e 修复（见第 8 节）· `e96962948` 第二批契约并入。

### 已发给 agent 的补充约定（均已落实）
- **g-gateway**：`cache_creation_tokens` 是总量（含 1 小时），填 `UsageTokens` 时 `CacheCreation = 总量 − cache_creation_1h_tokens`；钩子 `prompt_text` 传纯文本；请求 ID 必须服务端生成（任务说明里已写）；已安装未启用插件的端点返回 503。
- **c2-runtime**：Windows 开发模式二进制为 `plugin.exe`；`SkipHostEnv=true`；`config_enc` AAD 为 `"plugin-config:"+key`；配置变更广播 `{"type":"config","plugin_key":k}`；Drop（purge）要显式删除迁移记录（0002 去掉了级联）；平台插件处理自己平台账号时必须携带解密凭证；可用 E 的 `build-demo.sh` 产出真实插件包测试。

---

## 3. 组装（`server/internal/app/app.go`）

所有模块已在 `app.Run` 中组装，启动顺序：PG + 核心迁移 → Redis → cluster（心跳）→ event/registry/packages → billing、usage → authz.Start → iam.Bootstrap → group/apikey/proxy/account → egress（`AlwaysAllow` 含 PG 地址）、launcher、dbschema、grpcruntime → gateway → DefaultsApplier(authz, billing, gateway) → rollout.Start → install、market.SeedSources → job、delivery → HTTP。关闭按相反顺序（先 `srv.Shutdown`）。

HTTP 挂载：`/healthz`（节点自我隔离时 503）→ `httpapi.NewRouter` → 各模块 `RegisterRoutes` → `routes.RegisterAssets(engine)`（`/plugin-ui`）→ `engine.NoRoute(gw.Middleware(), webui.Serve)`：先按插件声明分发网关端点，未命中再走控制台 SPA 回退（`/api/`、`/plugin-ui/` 前缀返回 JSON 404；index.html 每次替换 `__CSP_NONCE__` 并发 CSP 头）。

`main.go`：`plugin-exec` 子命令 → `sandbox.RunExec`；JSON 日志；`app.Run`。

---

## 4. 待写入 CONTRACTS.md 的变更

> A1、A2、B、C1、D、E、QA 的变更已于 `7227ff4d5` 写入 CONTRACTS。以下是 C2、G、H、F 交付后新提出的。
> **第二批已写入 CONTRACTS**（§5.5 补充、§5.7 补充、§7 Redis key 与节点状态格式、§11.6、§11.7）：处理意见为"写入"的各项，以及 F 列出的"已实现但未写入"。
> **仍待办**：`ClientRequestID`（core + 迁移 + B）、`/settings/gateway` 归属、SSRF 拨号钩子、F 列出的"仍缺"接口说明、标为"可选"的项。

| 来源 | 变更 | 处理意见 |
|---|---|---|
| C2 | Redis `plugin:ledger:{key}:{credit\|debit}:{yyyymmdd}`（每日累计，TTL 48h） | 写入 §7 |
| C2 | `plugin:events` 广播 `{"type":"rollout"\|"config","plugin_key","rollout_id"}`；`ReportPlugin` JSON = `rollout.NodePluginState`（serving、standby、rollout_id、rollout 状态、instances） | 写入 §7 |
| C2 | Disable 立即提交；Enable 优先 `active_version` 否则最新已批准版本；plugins 行删除后各节点一次对账内停实例 | 写入 §5.7 |
| C2 | MigrateData 可能因协调者接管重复执行，插件必须幂等 | 写入 SDK 文档 |
| C2 | 超时：控制台平台调用 10s、热路径 2s、Scheduler 200ms、钩子最多 2s | 写入 §11 |
| C2 | ~~`SET LOCAL ROLE` 迁移可被 `RESET ROLE` 绕过~~ | ✅ 主控已修（`d87ae94d7`，0003 迁移 + 插件角色登录执行） |
| G | `UsageRecord.ClientRequestID` + `usage_logs.client_request_id` 列 | 待做（core + 0004 迁移 + B） |
| G | Redis `hook:stats:{plugin}:{hook}`（HASH）、`hook:statidx:{plugin}`（SET），TTL 7d；`hook:breaker` 值为熔断截止毫秒，TTL 30s | 写入 §7 |
| G | `usage_logs.error_type` 新增 `model_not_allowed`、`price_not_configured`、`rate_limited`、`invalid_request`、`plugin_unavailable` | 写入 §6 / 表注释 |
| G | `PlatformBinding` 缺凭证授权标记，网关总是给平台插件传解密凭证 | 符合"平台插件默认拿自己平台账号凭证"，保持 |
| G | `/settings/gateway` GET/PUT 无归属 | 待定：建议 G 在 gateway 包补 |
| G | `plain` 错误格式即核心 REST 格式；anthropic 格式 `error.code` 可带 `guard_blocked` | 写入 §3 |
| G | `HookBinding` 加 `ID`（现在未写 id 时用 manifest 下标） | 可选；C1 详情已按同规则匹配 |
| G | SSRF：共享代理客户端无法拨号时校验，防不住 DNS rebinding | 待 D 提供拨号钩子 |
| G | `sticky_rules UNIQUE(name, source)` 使两个插件不能声明同名默认规则 | 保持（后来者跳过并记日志） |
| H | `core.Locker` 增加续租（`Extend`） | 可选 |
| H | core 定义"有新事件"频道 `events:appended`，B 的 Publisher 提交后发布 | 可选（现最多延迟 1s） |
| H | job cron 默认 UTC（支持 `CRON_TZ=`）、`@every` 对齐周期；`OnEvents` 确认 id 不超过游标算失败 | 写入 §11 |
| H | `plugin_job_runs.triggered_by`；`core.JobTrigger.NextRun` | 可选 |
| F | 已实现但未写入：`/ui/plugins` 的 `host_ui_compat`；插件设置 `{schema, ui_schema, values}`；价格保存 `confirm` 与 `details.confirmation_required`；角色 `permission_keys`、`user_count` | 写入 §5 |
| F | 仍缺：`POST /me/api-keys`、`PATCH /api-keys/:id` 字段；列表筛选参数；`/nodes` 响应结构；代理密码 `"******"` 不修改；`/sticky-rules/stats` 对应键与 flush 返回；发布记录 `migrations[]`；核心版本与资源上限查询接口 | 按后端现状补写；核心版本可放 `/healthz` 或 `/me` |
| F | 插件包 `i18n/*.json` 未自动加载（原生插件需 `host.addMessages`） | 后续 |

---

## 5. 已知问题与待办

| # | 问题 | 负责 | 状态 |
|---|---|---|---|
| 1 | 客户端 `X-Request-Id` 不能用作计费幂等键 | G | ✅ 服务端生成 |
| 2 | `main.go` 未嵌入前端 | 主控 | ✅ `webui` 包 |
| 3 | 插件出现新外部域名时告警 | D | 未做 |
| 4 | 登录限速、refresh token 重放检测 | A1 | 未做 |
| 5 | 测试建库慢 | 主控 | ✅ 模板库（瓶颈主要在经隧道的查询延迟，约 290ms/次） |
| 6 | 卸载插件时清除其账号 | A2 + C1 | 未做 |
| 7 | 钩子统计接到 C1 详情页 | 主控 | ✅ |
| 8 | guard 包缺原生界面 | F | ✅ Docker 构建时 build-ui.sh 产出 |
| 9 | `api_keys.group_id` 外键无级联 | — | 保持现状 |
| 10 | 本机 `python` 是应用商店占位程序 | — | 用编辑工具或 perl |
| 11 | C2：旧版本缓存目录不清理、`Packages` 持有文件句柄；`/api/v1/p` 未接节点自我隔离；资源限制改动下次重启生效；节点只校验 sha256 不重复验签 | C2 | 后续 |
| 12 | SSRF DNS rebinding（见第 4 节 G） | D + G | 后续 |
| 13 | 市场页无法判断兼容性（没有接口暴露核心版本） | 主控 | 后续 |
| 14 | 出口日志只在连接关闭时写入，长连接（keep-alive、数据库）在关闭前不出现在"外部访问"页 | D | 后续：考虑连接建立时写一行 `open` 记录或定期落盘 |
| 15 | guard 规则改动在其他节点最多延迟 5 秒生效（插件内轮询）；插件没有广播通道 | E / 核心 | 后续：可给 SDK 提供集群广播能力 |
| 16 | 钩子熔断按节点计数（每节点连续 10 次失败），集群内各节点独立熔断 | G | 符合 §6.3，保持 |

---

## 6. 环境

**本机（Windows）**
- Go 1.27（mise，`GOBIN=/d/mise/installs/go/1.27.0/bin`，内有 buf、protoc-gen-go、protoc-gen-go-grpc）；Node 24、npm 11；无 Docker、PG、Redis、WSL
- Go 依赖代理：命令内临时设置 `GOPROXY=https://goproxy.cn,direct`（与仓库 Dockerfile 一致）
- 常驻 SSH 隧道（后台任务）：`ssh -N -o ServerAliveInterval=15 -L 45432:127.0.0.1:45432 -L 36379:127.0.0.1:36379 -L 3120:127.0.0.1:3120 ovh`（测试库、Redis、Caddy 控制台；网络抖动会断，断了重建）
- 浏览器实测控制台：`.claude/launch.json` 里的 `sub2api-next-ovh` 是本机 Node 反向代理（5174 → 3120）
- 测试环境变量：`TEST_DATABASE_URL=postgres://postgres:sub2api@127.0.0.1:45432/postgres?sslmode=disable`、`TEST_REDIS_URL=redis://127.0.0.1:36379/0`
- proto 生成：`cd next/sdk && buf generate`

**测试服务器 ovh**（`ssh ovh`，15.204.107.38，Debian 13，Docker 29 + Compose v5；机器上有大量其他服务，**只许动 `~/sub2api-next-test/` 与 `sub2api-next-*` 项目**，所有组件只用 docker compose）

> **2026-09-24 起 ovh 上只运行 `sup2api` 一个服务（用户要求不要启动多个服务）**。`sub2api-next-test`（3120）与 `sub2api-next-testdb`（45432/36379）已 `docker compose down`（数据卷保留）。需要跑 e2e 或数据库单测时先征得用户同意再临时启动，用完即停。

| compose 项目 | 目录 | 内容 | 端口（仅本机回环） |
|---|---|---|---|
| sub2api-next-testdb | `~/sub2api-next-test/testdb` | postgres:16（密码 sub2api）、redis:7 | 127.0.0.1:45432、127.0.0.1:36379 |
| sub2api-next-test | `~/sub2api-next-test/src/next/deploy` | pg、redis、node-1、node-2、caddy、mock-upstream、market-init；密钥与管理员账号在 `~/sub2api-next-test/.env` | 127.0.0.1:3120（Caddy） |
| sub2api-next-ci | `next/deploy/ci/compose.yml` | `gotest` 容器，接入 testdb 网络，用于 Linux 专有测试 | 无 |
| **sup2api**（单节点正式部署） | `~/sup2api`（`src` 为 GitHub 稀疏克隆，`.env` 为密钥与管理员账号） | app、pg、redis、market（market 为内置签名插件市场，仅内网） | 127.0.0.1:3130（app） |

- 部署：本机 `bash next/deploy/scripts/sync.sh --up`（tar 经 ssh 同步并在远程构建、启动）；远程 `up.sh`、`down.sh [--purge]`、`logs.sh`
- sup2api 部署/更新：本机 `ssh ovh 'bash -s' < next/deploy/single/deploy.sh`（服务器从 GitHub 拉 `feat/next-platform`，见 `next/deploy/single/README.md`）
- 访问：`ssh -N -L 3120:127.0.0.1:3120 ovh` 后打开 http://127.0.0.1:3120；测试路由 `/__node1/*`、`/__node2/*`、`/__mock/*`、`/market/*`
- 当前 ovh 上运行的是 QA 的骨架版本（只有 `/healthz`），市场索引为空

**插件打包**（在 `next/` 下）：`go run ./tools/sub2api-plugin keygen --key-id sub2api-dev --out <keydir>`，然后 `sh tools/sub2api-plugin/scripts/build-demo.sh <outdir> <keydir> sub2api-dev`，产出 anthropic 0.1.0/0.2.0、guard 0.1.0、`test/guard-0.1.1-test` 与签名索引。

---

## 7. 关键决策记录

| 决策 | 内容 |
|---|---|
| 插件运行方式 | gRPC 独立进程（go-plugin）；宿主只依赖 `Runtime/Instance` 与 core 能力接口，预留 JS 运行方式 |
| 平台 | 生产只支持 Linux（含 Docker）；Windows/macOS 仅插件开发模式 |
| 多节点 | 节点对等；Redis 存节点注册与实时状态；插件发布"先准备、再激活"，发起节点协调、租约过期由其他节点接管，PG 里的 CAS 为提交点 |
| 资源限制 | 不用 cgroup；oom_score_adj + nice + GOMEMLIMIT + 内存看门狗 + rlimit |
| 网络 | 默认不限制只记录；Linux 严格模式用 seccomp 保证插件所有连接走 gRPC 出口隧道；UDP 默认禁止，DNS 由核心代解析 |
| 权限 | 用户/角色/权限 RBAC；插件可注册用户权限（禁用保留、卸载销毁）；插件申请宿主能力需管理员分级确认 |
| 计费 | 按次/按 token/表达式三种方式统一为表达式；参考 new-api 设计但不复制代码（new-api 为 AGPL，本项目 LGPL）；只支持管理员调整余额；表达式没写的缓存类别（`cr`/`cc`/`cc1h`）不收费，`p` 始终是不含缓存的纯输入（2026-09-24 用户决定） |
| 粘性会话 | 核心负责调度，平台插件提供默认规则，管理员可覆盖，复杂取值可由插件扩展点计算 |
| 网关端点 | 由插件在 manifest 中声明，核心按声明执行通用流水线 |
| 测试与部署 | 所有测试组件只用 docker compose；ovh 独立目录部署，对外只绑定 127.0.0.1 |

---

## 8. 接下来 / e2e 记录

**e2e 运行方式**（本机，经 `127.0.0.1:3120` 隧道到 ovh Caddy）：
```bash
cd next/e2e
export E2E_ADMIN_EMAIL=$(ssh ovh "grep ^SUB2API_BOOTSTRAP_ADMIN_EMAIL= ~/sub2api-next-test/.env | cut -d= -f2-")
export E2E_ADMIN_PASSWORD=$(ssh ovh "grep ^SUB2API_BOOTSTRAP_ADMIN_PASSWORD= ~/sub2api-next-test/.env | cut -d= -f2-")
export E2E_DOCKER_HOST=ovh E2E_RUN_PENDING=1
go test -count=1 -timeout 50m -v ./...
```

| 轮次 | 部署提交 | 结果 | 根因与修复 |
|---|---|---|---|
| 1 | `a69f68f55` | 19 个用例全失败 | 多数是 `WaitPlugin` 等不到节点 `state=active` 连带超时：C2 上报的节点 JSON 没有契约里的 `state` 字段 → 补派生 `state`；`/healthz` 返回 `"OK"` → 改 `"ok"`；e2e 建角色没带 step-up、review 账号类型键是 `id`；派生 guard 包沿用原二进制导致 GetInfo key 不符 → e2e 用 `-X buildKey` 重编；升级不增权限也要求确认 → C1 自动沿用授权（`896ea01a5`） |
| 2 | `896ea01a5` | 中止 | e2e 把节点 `state` 当字符串读（实际是上报对象，取 `state.state`）；建带角色的用户要 step-up |
| 3 | `896ea01a5` | 7/17 通过（AC01–03、14–16） | 其余都卡在 e2e 以数字发 `rate_multiplier`（契约为十进制字符串） |
| 4 | `896ea01a5` | 13/17 通过 | AC08：预览不按结算方式归一化 → 服务端改为同一 `expr.Normalize`；列表不含 `price_id` → e2e 取详情；表达式未给缓存定价时缓存按输入价计（后按用户决定改为不收费，见第 7 节）。AC10：其他节点规则 5 秒内刷新 → e2e 等一个周期；熔断按单节点连续 10 次失败 → e2e 循环到熔断打开。AC11：guard 按分钟桶统计 → e2e 用整分钟窗口；游标字段 `cursor.last_event_id`。AC13：设置接口体为 `{values:{...}}`；出口日志在连接关闭时写入（keep-alive 最长 90 秒） |
| 5 | `5bc00f3df` | AC08/10/13 单独通过（AC08 仅剩价格历史比较：历史存规范形式 `v1:...`，e2e 改为按哈希和去前缀比较） | |
| 6 | `5bc00f3df` | 全量（含 `E2E_LONG=1`）：AC01–09 通过；AC10 起本机 SSH 隧道断开（网络问题）导致后续全失败 | 重建隧道（PG、Redis、3120 合为一个后台任务） |
| 7 | `5bc00f3df` | 重跑 AC10–17：AC12、AC17 失败 | AC12：任务接口返回 `{jobs, recent_runs}`，e2e 按数组读 → 改读 `recent_runs`；AC17：计时包含 ssh 执行 docker kill 的耗时 → 改为 kill 返回后计时 |
| 8 | `5bc00f3df` | AC12、AC17 通过 → **17 条验收全部通过** | 另在浏览器实测控制台（经本机 Node 反向代理）：登录、概览、guard 原生插槽卡片、插件详情正常；修复插件文字图标 `text:X` 显示为破图（`e6f7e4483`） |

**后续**
1. 第 4 节"仍待办"：`ClientRequestID`、`/settings/gateway` 归属、F 列出的"仍缺"接口说明。
2. 第 5 节未做项按优先级排期：登录限速与 refresh token 重放检测（#4）、卸载插件清账号（#6）、SSRF 拨号钩子（#12）、新外部域名告警（#3）、出口日志长连接（#14）。
3. 每个里程碑后推送 `feat/next-platform`（网络不稳时重试）。
