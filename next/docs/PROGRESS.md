# sub2api-next 开发进度与交接记录

> 用途：记录派发给开发 agent 的任务、交付结果、待办事项与环境信息，保证上下文压缩或换人接手后能完整恢复现场。
> **每次合并分支、派发新任务、做出决策后都要更新本文件。**
> 最后更新：2026-09-24，阶段 1 已合并 7/9，阶段 2 进行中。

相关文档：[ARCHITECTURE.md](ARCHITECTURE.md)（设计）· [CONTRACTS.md](CONTRACTS.md)（开发契约）

---

## 1. 总体状态

| 阶段 | 内容 | 状态 |
|---|---|---|
| 0 | 备份、架构文档、契约（proto、manifest、核心表、core 接口、基础设施骨架） | ✅ 完成 |
| 1 | 9 个 agent 并行开发各模块 | ⏳ 7 个已合并；C2、F 进行中 |
| 2 | 网关（G）、事件投递与任务（H） | ⏳ 进行中 |
| 3 | 主控组装 `internal/app`、在 ovh 上用 compose 部署、跑 17 条验收测试 | 未开始 |

**分支**：开发分支 `feat/next-platform`（本地），每个 agent 在独立 worktree 的 `next/<代号>` 分支上开发，完成后由主控 `git merge --no-ff` 合并。
**备份**：tag `legacy/v0.2.8`、分支 `legacy/main`（均已推送）。
**远程推送**：`feat/next-platform` 已推送到 origin（截至 `a95216e34`）。本机访问 GitHub 时好时坏，推送失败就稍后重试。

---

## 2. Agent 任务与交付

所有 agent 的任务说明都要求：先 `git merge --ff-only feat/next-platform` 再建分支；只改自己的目录；遵守 CONTRACTS；测试组件只用 docker compose；不 push；最终报告写清构造函数与契约变更需求。

| 代号（SendMessage 名称） | 负责目录 | 分支 | 状态 | 提交 | 合并提交 |
|---|---|---|---|---|---|
| a1-identity | `server/internal/iam`、`authz` | next/a1-identity | ✅ 已合并 | 3819efc0b、2ebef13d4 | 2591ae00f |
| a2-resources | `apikey`、`group`、`proxy`、`account` | next/a2-resources | ✅ 已合并 | 02312e823、e2dfca146、1b1ec5cf5、db777e933 | b1f39bfae |
| b-billing | `billing`（含 `expr`）、`usage`、`event` | next/b-billing | ✅ 已合并 | 6221b7db8 | 3041351c8 |
| c1-lifecycle | `plugin/pkg`、`install`、`market`、`api` | next/c1-lifecycle | ✅ 已合并 | 172997d83 | 60937afd0 |
| c2-runtime | `plugin/registry`、`grpcruntime`、`rollout`、`dbschema`、`routes` | next/c2-runtime | ⏳ 进行中（wip：fcb2609df、a88145fe8） | | |
| d-sandbox | `cluster`、`plugin/sandbox`、`plugin/egress`、`sdk/pluginsdk/egress` | next/d-sandbox | ✅ 已合并 | 009b0ed9f | f85721f9f |
| e-sdk-plugins | `sdk/pluginsdk`、`plugins/anthropic`、`plugins/guard`（Go）、`tools/sub2api-plugin` | next/e-sdk-plugins | ✅ 已合并 | 237873003 | 22b4387d6 |
| f-frontend | `web/`、`plugins/guard/ui/native` | next/f-frontend | ⏳ 进行中（已有 2c8cfe488、3fdab6209；另派生子 agent 做计费页面） | | |
| qa-deploy | `Dockerfile`、`deploy/`、`e2e/` | next/qa-deploy | ✅ 已合并 | 7d7ea1c15、ce5111dc5 | e55c32a85 |
| g-gateway（阶段 2） | `server/internal/gateway`（含粘性会话） | next/g-gateway | ⏳ 进行中 | | |
| h-events-jobs（阶段 2） | `event/delivery`、`job` | next/h-events-jobs | ⏳ 进行中 | | |

主控自己的提交：`6de334386` 架构文档 · `5a3f05dc9` 阶段 0 契约 · `d2d44ad1b` 迁移测试 · `6e3d0fadc` 插件协议/签名/加密 · `8586025b6` 发布/schema/默认值接口与格式 · `7e8518afc` compose 测试规则 · `c3a19b057` Ledger.ApplyTx、0002 迁移、gofmt · `b84f458e9` 阶段 2 接口。

### 已发给运行中 agent 的补充约定
- **g-gateway**：`cache_creation_tokens` 是总量（含 1 小时），填 `UsageTokens` 时 `CacheCreation = 总量 − cache_creation_1h_tokens`；钩子 `prompt_text` 传纯文本；请求 ID 必须服务端生成（任务说明里已写）；已安装未启用插件的端点返回 503。
- **c2-runtime**：Windows 开发模式二进制为 `plugin.exe`；`SkipHostEnv=true`；`config_enc` AAD 为 `"plugin-config:"+key`；配置变更广播 `{"type":"config","plugin_key":k}`；Drop（purge）要显式删除迁移记录（0002 去掉了级联）；平台插件处理自己平台账号时必须携带解密凭证；可用 E 的 `build-demo.sh` 产出真实插件包测试。

---

## 3. 各模块对外接口（主控组装 `internal/app` 用）

```go
// cluster (D)
rdb, _ := cluster.OpenRedis(ctx, cfg.RedisURL)
cl := cluster.New(rdb, db.Pool, cluster.Options{NodeID, Addr, HostVersion, Logger}) // cl.Start(ctx) 先心跳再回收死节点槽位; Close()
// cl.Registry=core.NodeRegistry  cl.Locker=core.Locker  cl.Bus=core.Bus  cl.Slots=core.Slots
launcher := sandbox.NewLauncher(sandbox.LauncherOptions{})            // core.PluginLauncher
egressP := egress.New(db, egress.Options{NodeID, AlwaysAllow: []string{"<PG host:port>"}}) // core.EgressProvider; Close()
// main.go: runPluginExec = sandbox.RunExec

// event / billing / usage (B)
events := event.NewPublisher(db)                                      // core.EventPublisher
bill := billing.New(db, rdb, bus, events, registry)                   // Pricer, PriceCatalog, BalanceGate, Ledger; Close()
settler := usage.New(db, bill, events, usage.Options{})               // core.Settler; Start(ctx)/Stop(ctx)

// authz / iam (A1)
az := authz.New(authz.Deps{DB, Bus, Plugins: registry})               // Authorizer + PermissionCatalog; az.Start(ctx) 必须在 iam.Bootstrap 之前
idm := iam.New(iam.Deps{DB, Redis: rdb, Config: cfg, Events: events, Authz: az}) // TokenVerifier + StepUpVerifier; idm.Bootstrap(ctx)
r := httpapi.NewRouter(engine, idm, az, idm)

// A2
grp := group.New(db, rdb, bus)
keys := apikey.New(db, rdb, az)                                       // core.APIKeyAuthenticator; go keys.Run(ctx)
prx := proxy.New(db, cipher, bus, proxy.Options{})                    // core.ProxyDirectory; go prx.Run(ctx)
acc := account.New(account.Deps{DB, Redis, Cipher, Registry, Proxies: prx, Events, Slots, Bus, AllowPrivateUpstream}) // core.AccountDirectory; go acc.Run(ctx)

// C1
trust, _ := pkg.NewTrustStore(cfg.Plugins.OfficialRootKeys, cfg.Plugins.AllowUnsigned)
defaults := install.NewDefaultsApplier(az, bill, stickyCatalog /*G*/)  // core.PluginDefaultsApplier -> 交给 C2
inst := install.New(install.Deps{DB, Trust, Authz: az, Permissions: az, Defaults: defaults, Rollout /*C2*/, Schemas /*C2*/, Bus},
                    install.Options{HostVersion: Version, Plugins: cfg.Plugins})
mkt := market.New(db, inst, nil, cfg.Plugins.MaxPackageBytes); mkt.SeedSources(ctx, cfg.Plugins.MarketSourcesJSON)
api.New(api.Deps{DB, Install: inst, Market: mkt, Rollout, Nodes: cl.Registry, Registry, Authz: az, Cipher, Bus, Jobs /*H*/, Plugins: cfg.Plugins}).RegisterRoutes(r)

// 每个模块 .RegisterRoutes(r)；C2/G/H 的构造函数待其交付后补充
```

还需主控做的组装事项：`main.go` 嵌入 `server/web`（前端 SPA 与 NoRoute 回退）；挂载网关中间件（G）与插件路由（C2）；import map / CSP nonce 注入（等 F 报告）。

---

## 4. 待写入 CONTRACTS.md 的变更

> 2026-09-24：A1、A2、B、C1、D、E、QA 的变更**已写入 CONTRACTS.md**（§5.1–5.7、§6、§7、§11.3–11.6）。下表保留作来源记录；未落地的只剩：`PricingEntry.note`、`gateway.endpoint`/`platform.register` 的 scope 格式、`EgressLogReader`（不做）、卸载清账号（见第 5 节 #6）。C2、F、G、H 交付后在此追加。

| 来源 | 变更 |
|---|---|
| A1 | `/me/menus` 分区带 `label{en,zh}`，分区 key `overview/gateway/finance/system/me/plugins`；`POST /auth/logout` 请求体 `{refresh_token?}` 可选；补 `GET /roles/:id`、`GET /users?role=`；`POST /users` 指定非默认角色需 `role:manage` + step-up；§7 删除 `authz:version`（以 PG `authz_meta` 为准）；只有超级管理员能授予/修改超级管理员 |
| A2 | `config:changed` payload `{"type":"proxy","id":N}`；`account.status_changed` 的 status 增加 `cooldown`；补 `GET /users/:id/groups`、`GET /groups/:id`、`GET /proxies/:id`；`/account-types` 增加 `plugin_version`、`asset_base`；平台插件默认拿到自己平台账号的解密凭证 |
| B | `core.Ledger.ApplyTx`（✅ 已加）；新增 `GET /me/usage/:id`；价格接口可选 `platform`、返回 `analysis`；preview 接受 `metrics`，返回 `base_cost/rate_multiplier/expression/expr_hash`；`usage.recorded` 增加 `cache_creation_1h_tokens`；调整余额接口支持 `Idempotency-Key`；校验错误格式 `{code, message:{en,zh}, detail}`；usage semantics 与捕获的参数存在 `billing_detail.inputs`（以后可改为独立列） |
| C1 | 新增 `GET /plugins/:key/versions/:version/review`；`config_enc` AAD；配置广播格式；主机版本传 `main.Version`（预发布后缀忽略）；节点状态 JSON 的 `state` 字段；市场源 url 可指向 `index.json` 或以 `/` 结尾的目录 |
| C1 待接 | `core.JobTrigger`（H 实现，✅ 接口已加）；`core.HookStatsSource`（G 实现，✅ 接口已加，C1 的 `api` 需改为使用它）；卸载时清除账号需要 A2 提供接口（未做） |
| D | 建议新增 `EgressLogReader` 接口（C1 目前直接查表，可不做）；`LaunchSpec.CPU` → `GOMAXPROCS=ceil(CPU)`；`MaxThreads` 只告警；槽位回收要求单实例 Redis 且节点 NTP 同步 |
| E | sdk 依赖 pgx；`go.work` 新增 3 个模块（✅ 已合并）；Windows 二进制 `plugin.exe`；缓存 token 口径（见第 2 节）；建议 `PricingEntry` 增加 `note`；`gateway.endpoint`、`platform.register` 的 scope 格式待定义 |
| QA | 网关请求 ID 必须服务端生成（已要求 G）；插件禁用后其端点返回 503（已要求 G）；市场地址是内网 `http://caddy:3120/market/index.json`，C1 下载时若有 SSRF 限制需在测试环境放行 |

---

## 5. 已知问题与待办

| # | 问题 | 负责 | 状态 |
|---|---|---|---|
| 1 | 客户端 `X-Request-Id` 不能用作计费幂等键 | G | 已在任务中要求 |
| 2 | `main.go` 未嵌入前端，控制台页面出不来 | 主控 | 组装时处理 |
| 3 | 插件出现新外部域名时告警 | D | 未做 |
| 4 | 登录限速、refresh token 重放检测 | A1 | 未做 |
| 5 | 测试建库慢（经隧道每个测试约 10 秒），建议 testutil 用模板库 | 主控 | 待优化 |
| 6 | 卸载插件时清除其账号 | A2 + C1 | 未做 |
| 7 | 钩子统计接到 C1 详情页 | G + 主控 | 等 G |
| 8 | guard 包缺原生界面 | F | F 交付后 QA 构建会自动带上 |
| 9 | `api_keys.group_id` 外键无级联（删分组时 A2 先物理删除已软删除的 Key） | — | 保持现状 |
| 10 | 本机 `python` 是 Windows 应用商店占位程序，不能用来改文件 | — | 用编辑工具代替 |

---

## 6. 环境

**本机（Windows）**
- Go 1.27（mise，`GOBIN=/d/mise/installs/go/1.27.0/bin`，内有 buf、protoc-gen-go、protoc-gen-go-grpc）；Node 24、npm 11；无 Docker、PG、Redis、WSL
- Go 依赖代理：命令内临时设置 `GOPROXY=https://goproxy.cn,direct`（与仓库 Dockerfile 一致）
- 常驻 SSH 隧道（后台任务）：`ssh -N -L 45432:127.0.0.1:45432 -L 36379:127.0.0.1:36379 ovh`
- 测试环境变量：`TEST_DATABASE_URL=postgres://postgres:sub2api@127.0.0.1:45432/postgres?sslmode=disable`、`TEST_REDIS_URL=redis://127.0.0.1:36379/0`
- proto 生成：`cd next/sdk && buf generate`

**测试服务器 ovh**（`ssh ovh`，15.204.107.38，Debian 13，Docker 29 + Compose v5；机器上有大量其他服务，**只许动 `~/sub2api-next-test/` 与 `sub2api-next-*` 项目**，所有组件只用 docker compose）

| compose 项目 | 目录 | 内容 | 端口（仅本机回环） |
|---|---|---|---|
| sub2api-next-testdb | `~/sub2api-next-test/testdb` | postgres:16（密码 sub2api）、redis:7 | 127.0.0.1:45432、127.0.0.1:36379 |
| sub2api-next-test | `~/sub2api-next-test/src/next/deploy` | pg、redis、node-1、node-2、caddy、mock-upstream、market-init；密钥与管理员账号在 `~/sub2api-next-test/.env` | 127.0.0.1:3120（Caddy） |
| sub2api-next-ci | `next/deploy/ci/compose.yml` | `gotest` 容器，接入 testdb 网络，用于 Linux 专有测试 | 无 |

- 部署：本机 `bash next/deploy/scripts/sync.sh --up`（tar 经 ssh 同步并在远程构建、启动）；远程 `up.sh`、`down.sh [--purge]`、`logs.sh`
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
| 计费 | 按次/按 token/表达式三种方式统一为表达式；参考 new-api 设计但不复制代码（new-api 为 AGPL，本项目 LGPL）；只支持管理员调整余额 |
| 粘性会话 | 核心负责调度，平台插件提供默认规则，管理员可覆盖，复杂取值可由插件扩展点计算 |
| 网关端点 | 由插件在 manifest 中声明，核心按声明执行通用流水线 |
| 测试与部署 | 所有测试组件只用 docker compose；ovh 独立目录部署，对外只绑定 127.0.0.1 |

---

## 8. 接下来

1. 等 C2、F、G、H 交付，逐个合并（注意 `go.mod` / `go.work` 冲突：保留两边依赖后 `GOWORK=off go mod tidy`）。
2. 把第 4 节的契约变更写入 CONTRACTS.md。
3. 主控组装 `internal/app` 与 `main.go`（第 3 节）。
4. `sync.sh --up` 部署到 ovh，设置 `E2E_RUN_PENDING=1` 跑 e2e，逐条修复 17 条验收标准。
5. 网络恢复后推送 `feat/next-platform`。
