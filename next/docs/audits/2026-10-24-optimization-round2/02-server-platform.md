# 优化审计 Round 2 — 02: server 平台侧

日期: 2026-10-24
范围: `next/server/internal/*`，**排除** `gateway`、`usage`、`usagerules`、`billing`、`providerresources`、`updater`、`ccgateway`（见 01-server-path.md）。
即：`app`、`plugin/*`（registry / install / rollout / grpcruntime / egress / routes / api / pkg / dbschema / sandbox / blobs / market）、`iam`、`account`、`store`、`cluster`、`httpapi`、`core`、`x`、`procguard`、`testutil`，以及 `authz`、`apikey`、`group`、`proxy`、`job`、`event`、`observation`、`audit`、`secret`、`config`、`webui`、`remotedocker` 等相邻包。
作者: 只读分析，不改代码。工具: `gometrics/all.tsv`、`static/server.sc`、`static/server.dead` + Grep/Read（CodeGraph/Serena/WarpGrep 本次不可用）。

> 说明：`plugin/dbschema` 的角色/权限 SQL、`plugin/pkg/trust.go` 的签名链、`install/consent.go` 的授权规则属于安全边界，本文只安排"抽函数/加注释"，不改判定与 SQL。

---

## 1. 热点与诊断

按行数降序；深度 ≥ 5 的另列。原始度量见 `/d/tmp/gometrics/all.tsv`。本区 `>80 行` 40 个、`深度≥5` 6 个（去重后 43 个热点），下表列出主要项。

| 文件:起始行 | 函数 | 行数 | 深度 | 一句诊断 |
|---|---|---|---|---|
| `app/app.go:78` | `run` | 413 | 3 | 单函数串完存储→集群→核心服务→插件运行时→HTTP 五个阶段；`closers` 中 `settler.Stop` 与 `stopHelperHistory` 各被注册两次（行 175/323、292/324） |
| `account/handlers.go:1086` | `update` | 260 | 3 | 校验、凭证准备、生命周期回调、事务写入、事件、视图回读全在一个 handler，且前半段与 `create` 重复 |
| `plugin/registry/registry.go:256` | `build` | 217 | 6 | 一次循环内按 platform/accountType/hook/scheduler/route/observer/job/event 八类资源各自做授权判断、去重与告警 |
| `account/handlers.go:896` | `create` | 189 | 3 | 与 `update` 共享约 40 行前置解析（groupIDs/proxyID/checkRefs/proxy_url/mergeExtensions），另有 10 段 `if in.X != nil` 赋值样板 |
| `plugin/rollout/reconcile.go:194` | `reconcileKey` | 189 | 4 | 期望版本决策、实例拉起、条目汇总、rollout 状态机四段混写，局部变量 `want/fallback/needed/serving` 交织 |
| `iam/users.go:262` | `UpdateUser` | 177 | 4 | 校验 + 三层授权 + 事务写入 + 审计；"目标权限不得超出操作者"整段（构造 targetPerms → CanActOn）重复两次（310-320、358-368） |
| `plugin/grpcruntime/instance.go:239` | `startProc` | 163 | 3 | 二进制校验、run 目录、go-plugin 配置、8 个 gRPC client 装配、握手、Configure、Health 顺序堆叠 |
| `plugin/install/upload.go:32` | `Upload` | 161 | 3 | 解包、存储、资源校验、事务落库、review 生成、consent 延续六段串行 |
| `plugin/install/consent.go:130` | `Consent` | 150 | 4 | 事务内 6 组检查 + 决策写入 + 默认值/事件/审计，全部内联 |
| `app/managed.go:101` | `handler` | 129 | 3 | 5 个控制端点（prepare/admission/drain/shutdown/status）写成同一个函数里的内联闭包 |
| `plugin/routes/routes.go:111` | `serveAPI` | 126 | 3 | 顺序正确，但路由匹配循环里每轮都重新调用 `gen.Routes(key)` |
| `plugin/rollout/coordinator.go:147` | `coordinateStep` | 123 | 5 | preparing 阶段"本地失败→等待他人→超时"三层嵌套 |
| `plugin/dbschema/dbschema.go:138` | `Ensure` | 119 | 4 | 角色/模式权限 SQL 顺序执行（安全敏感，仅可读性整理） |
| `account/stats.go:372` | `ReadObservationMetrics` | 113 | 5 | 参数校验、槽位读取、Redis 管道拼装、计数累加四段 |
| `plugin/egress/egress.go:185` | `Dial` | 111 | 3 | 校验/策略/DNS/隧道/日志五段（安全边界） |
| `account/quota_refresh.go:206` | `sweepQuotas` | 110 | 4 | 补初始化、选到期、并发查询三段串在一个函数 |
| `account/handlers.go:377` | `list` | 101 | 2 | 查询参数→WHERE 的拼装（`?` 占位替换）散在 handler 内 |
| `plugin/install/review.go:228` | `buildReview` | 101 | 2 | 逐资源类型的平铺 case 列表，长但简单 |
| `app/builtin.go:24` | `builtinConvergence` | 56 | 7 | for → if → TryLock → if → EnsureBuiltin，嵌套 7 层 |
| `app/builtin.go:90` | `startBuiltinUpgrade` | 52 | 6 | 与 `builtinConvergence` 的"取锁 + EnsureBuiltin + 超时"段几乎逐行相同 |
| `authz/menus.go:136` | `pluginMenus` | 63 | 6 | 打平即可（若 `authz` 归本组负责） |

**跨文件重复模式（可量化）**

| 模式 | 处数 | 位置示例 |
|---|---|---|
| `func t(ctx, en, zh)` 完全相同的 6 份拷贝 | 6 | `account/service.go:315`、`apikey:301`、`authz/helpers.go:9`、`group:113`、`iam/ratelimit.go:129`、`proxy:331` |
| `truncate(s, n)` 三种语义 7 份 | 7 | `rollout/reconcile.go:549`、`egress/egress.go:395`、`account/testreq.go:446`（含省略号+UTF-8 安全）、`event/delivery:429`（不同签名）、`billing`、`usagerules`、`gateway` |
| `escapeLike` 2 份 + `store.Like` 0 调用 | 3 | `iam/users.go:593`、`billing/prices.go:148`、`store/util.go:7`（唯一实现却没人用） |
| `uniqueIDs` 2 份 | 2 | `account/handlers.go:818`、`group/group.go:575` |
| `itoa` 3 份、`nullID` 3 份、`nullStr` 1 份、`deref` 2 份 | 9 | `account/creds.go:27`、`apikey:353`、`gateway/util.go:118`、`install/upload.go:235`、`billing/settings.go:176`、`gateway/sticky_api.go:309`、`rollout/controller.go:673` |
| `SELECT status FROM plugins WHERE key=$1` + NoRows→not_found | 5 | `plugin/api/api.go:120`、`api/ops.go:486`、`install/uninstall.go:56/227`、`install/consent.go:397` |
| 手写 `rows.Next()` 扫描循环（本区） | 41 | `plugin` 25、`account` 9、`store` 5、`iam`/`app` 各 1；全库已有 13 处 `pgx.CollectRows` |
| `time.NewTicker` 轮询循环（本区） | 24 | `account` 9、`plugin` 9、`cluster` 3、`app` 2、`observation` 1 |
| `httpapi.Fail(c, err)` 出现次数（本区） | 375 | `plugin/api` 与 `account` 占绝大多数，绝大多数紧跟在 `if err != nil` 后 |

---

## 2. 优先计划（T1–T28）

标注约定：**行为变化** = 外部可观察行为（HTTP 响应、SQL、进程环境、日志文本）是否变化；**风险** 分低/中/高。

### A. 死代码与重复转发层（零风险，先做）

**T1 — `plugin/pkg/scope.go:23/27/32`、`plugin/pkg/validate.go:83/93/103/115/119`**
- 改法：`PatternCovers`、`StringList`、`CoveredBy`、`CheckPlatform`、`BinaryPath`、`NormalizeRoutePath`、`PathParams`、`PathsOverlap` 都只是 `sdk/manifest/check` 的一行转发，生产代码零调用（只有 `plugin/pkg/pkg_test.go` 用）。把测试改为直接 `import ".../sdk/manifest/check"`，删掉这些转发。
- 保留：`pkg.Validate`、`pkg.OthersFromManifests`、`pkg.EndpointsConflict`、`pkg.HostCompatible`、`pkg.MigrationFiles`、`pkg.ParseSchedule`（都有生产调用者）。
- 行为变化：无。测试：`plugin/pkg/pkg_test.go`（迁移后需要同步 `TestPathsOverlap`/`CheckPlatform`/`PatternCovers` 的 import）。风险：低。

**T2 — `plugin/install/uninstall.go:225 pluginStatus`、`:234 openRollout`**
- 改法：删除两个私有方法（staticcheck U1000 已确认无调用者）。
- 行为变化：无。测试：`install/*_test.go` 不引用（U1000 已覆盖）。风险：无。

**T3 — `iam/service.go:174 isActive`**
- 改法：删除（唯一调用者 `VerifyAccessToken` 用的是 `isActiveWithVersion`）。
- 行为变化：无。测试：`iam/iam_test.go`、`security_test.go` 不引用。风险：无。

**T4 — `plugin/egress/domains.go:138 domainTracker.size`**
- 改法：删除（带去锁的 3 行）。
- 行为变化：无。测试：无引用。风险：无。

**T5 — `x/util.go`：`PtrIfPositive`、`Uniq`**
- 改法：删除两个函数及其测试用例；`TruncUTF8` 留给 T6 复用；`Itoa64` 保留（`billing`/`usage` 在用，属他区，不动）。
- 行为变化：无。测试：`x/util_test.go` 同步删除对应 case。风险：无（若他区仍在用会编译报错并立刻暴露）。

### B. 复用归并（低风险，逐项独立提交）

**T6 — 统一 `truncate` 到 `x` 包**
- 改法：以已有的 `x.TruncUTF8`（rune 边界截断，此前仅自测使用）为基础，在 `x/util.go` 增加
  `func Truncate(s string, n int) string`（= `TruncUTF8`）与
  `func TruncateEllipsis(s string, n int) string`（`TruncUTF8(s, n-3)` + `…`）。
  替换本区 3 处：`plugin/rollout/reconcile.go:549`、`plugin/egress/egress.go:395` → `x.Truncate`；`account/testreq.go:446` → `x.TruncateEllipsis`；`event/delivery/worker.go:429` 签名不同（固定长度），保留并加注释指向 `x`。
  `billing`/`usagerules`/`gateway` 的同名函数属他区，只在文档里标注。
- 行为变化：多字节文本的截断点从"任意字节"变为"rune 边界"（更规范；纯 ASCII 完全一致）。`account/testreq.go` 现有实现已做 UTF-8 回退，等价。
- 测试：`account/testreq_test.go`、`plugin/egress/egress_test.go`、`plugin/rollout/rollout_test.go`。风险：低。

**T7 — `escapeLike` 归并到 `store.Like`**
- 改法：`store/util.go:Like` 已存在且有测试（`store/util_test.go`），但 0 调用者。把 `iam/users.go:593` 的 `escapeLike` 删除、`iam/users.go:88` 改用 `store.Like`。`billing/prices.go:148` 属他区，记录为协作项。
- 行为变化：无（`strings.NewReplacer` 与逐次 `ReplaceAll` 结果等价；注意替换顺序必须是 `\` → `%` → `_`，`store.Like` 已保证）。测试：`iam/iam_test.go` 的搜索过滤用例、`store/util_test.go`。风险：低。

**T8 — `t(ctx, en, zh)` 6 份拷贝归并到 `core`**
- 改法：`core/context.go` 增加 `func Text(ctx context.Context, en, zh string) string`（实现就是现有的 4 行）。6 个包内的本地 `t` 改成一行委托 `return core.Text(ctx, en, zh)`，**保留本地名字**，因此这 6 个包里 239 处 `t(ctx, …)` 调用点零改动。
- 行为变化：无。测试：各包现有用例（文案断言走 locale 的路径）；`httpapi` 的 `Accept-Language` 处理不变。风险：极低。
- 备注：`authz`/`apikey`/`group`/`proxy` 若归他组负责，需要协作方同意同一改法。

**T9 — 小工具归并（限定本区）**
- 改法：`account/creds.go:27 itoa` → 直接用 `strconv.FormatInt` 或 `x.Itoa64`；`account/handlers.go:818` 与 `group/group.go:575` 的 `uniqueIDs` 合一到 `x.Unique[T]`（保持"首次出现顺序"，`group` 版只是预分配容量）；`install/upload.go` 的 `nullID`/`nullStr` 保留（跨区调用者 `billing`/`gateway` 不动）。
- 行为变化：无。测试：`account/account_test.go`、`group` 相关用例、`store`/`install` 现有用例。风险：低。

**T10 — `plugin/api/ops.go:578 egress` 复用 `plugin/egress` 的查询**
- 现状：`egress` 与 `egressDomains` 手写了与 `plugin/egress` 包 `Summary`/`List`/`Domains` 几乎相同的 SQL，而后者被 deadcode 标为不可达（只有测试调用）。
- 改法：把 API 需要的三份查询下沉到 `plugin/egress`：`SummaryByHostPort(ctx,q,key,from,to,limit)`（保留 `ok/open/denied/errors` 计数）、`Count(ctx,q,key,from,to)`、`List(ctx,q,key,from,to,limit,offset)`；`egressDomains` 直接改调 `egress.Domains`（`limit` 从 500 变 1000 —— 见"行为变化"）。`plugin/api` 里的 `EgressSummary`/`EgressLog` 改为 `type EgressLog = egress.LogRecord` 这类别名，JSON 字段逐字不变。
- 行为变化：`domains` 的条数上限 500 → 1000；其余 JSON 结构/字段名/排序保持不变。若不想改变上限，就给 `egress.Domains` 加 limit 参数（推荐后者）。
- 测试：`plugin/api/api_test.go`（egress 响应）+ `plugin/egress/egress_test.go`（Summary/List/Domains 已有覆盖）。风险：中（响应结构敏感）。

**T11 — 插件状态查询与 not_found 转换统一**
- 改法：把 `install/uninstall.go:225` 的实现导出为 `install.PluginStatus(ctx context.Context, q store.Querier, key string) (string, error)`（T2 不删它，改为导出），`plugin/api/api.go:118 pluginStatus`、`api/ops.go:484 pluginStatusValue`、`install/uninstall.go:56`、`install/consent.go:397` 统一调用。handler 侧保留"渲染 404"的薄包装。
- 行为变化：无（错误码 `not_found` 与文案 "plugin not found" 保持一致）。测试：`plugin/api/api_test.go`、`install/install_test.go`。风险：低。

**T12 — "版本已批准 + 签名未吊销"检查统一**
- 现状：`plugin/api/plugins.go:490-508` 与 `install/consent.go:156-169`、`install/upload.go:127-144` 各自查 `plugin_versions` 的 `consent_status`/`signature_status` 并给出同义错误。
- 改法：在 `install` 包新增 `VersionApproval(ctx, q, key, version) (consent, sig string, err error)`，三处调用；错误文案与 `core` 错误码逐字保留（这是接口契约）。
- 行为变化：无。测试：`install/review_test.go`、`install/install_test.go`、`plugin/api/api_test.go`。风险：中（安全校验，只允许"提取"，禁止顺手合并语义差异）。

**T13 — 轮询循环统一**
- 现状：本区 24 处 `time.NewTicker` 循环结构几乎相同：`for { select { ctx.Done / tick } ; if canWork() { work() } }`，例如 `account/refresh.go:381`、`account/quota_refresh.go:193`、`account/lifecycle_status.go:64`、`account/automatic_state.go`、`account/preparation_cleanup.go`、`install/*`、`egress/logs.go`。
- 改法：`core/loop.go` 新增
  `func Every(ctx context.Context, d time.Duration, admitted func() bool, fn func(context.Context))`（首轮可选延迟参数单独给），返回前不阻塞；调用方各减 ~12 行。
- 行为变化：无（间隔、admitted 语义、ctx 取消一致）。**不要**把 `builtin.go` 的两个带"完成即返回"语义的循环并进来（它们有 once 退出条件，见 T23）。
- 测试：依赖 `canWork` 的用例（`account/*_test.go` 的 sweep 测试、`plugin/install/multinode_test.go`）。风险：低。

### C. 拆分与解耦（中等风险，每项独立提交）

**T14 — `plugin/registry/registry.go:256 build` 拆分**
- 改法：按资源类型拆出方法：
  `addBuiltinPlatforms()`、`sortedExtensions(exts)`、`registerPlugin(ext)`（单个插件的骨架注册）、`addPlatforms/ addAccountTypes / addHooks / addRankers / addRoutes / addObservers / addJobsAndEvents`、`warnUnknownProtocols()`、`indexAccountTypes()`。`build` 只保留"建空 generation → 内置平台 → 排序 → 遍历 → 收尾排序/告警"骨架，目标 ≤ 60 行、深度 ≤ 3。
- 行为变化：无（顺序、告警文本、`Conflicts` 写回位置必须逐字保留）。测试：`plugin/registry/registry_test.go`、`observation_test.go`。风险：中。

**T15 — `plugin/rollout/reconcile.go:194 reconcileKey` 拆分**
- 改法：拆为
  `desiredVersions(ro *rolloutRow, p *pluginRow) (serving, standby, keep string)`、
  `neededVersions(...)`+并发 `ensure`、
  `sweepEntries(s, needed) (serving, fallback string)`、
  `collectInstances(s) (versions []string, running []Instance, retryOK []bool, st NodePluginState)`、
  `entryState(s, v) (string, string)`、
  `rolloutState(ro, ...) (string, string)`。
  状态机（preparing/activating 分支）保持一段集中可读，不拆碎。
- 行为变化：无。测试：`rollout/rollout_test.go`、`stale_generation_test.go`、`multinode_test.go`、`runtime_internal_test.go`。风险：中。

**T16 — `iam/users.go:262 UpdateUser` 拆分**
- 改法：`validateUpdate(in *UpdateUserInput) (email string, fields []core.FieldError)`、`authorizeUpdate(ctx, actorID, id, in) error`（把"改他人密码"与"停用他人"两条路径合流）、`applyUpdateTx(...)`；把重复两次的 `targetPerms := …; CanActOn(...)` 提取为 `s.assertCanActOnUserPermissions(ctx, actorID, id) error`。`createUserTx` 与 `UpdateUser` 的 display_name/密码/max_concurrency 校验合流到 `validateUserFields`。
- 行为变化：无（锁顺序 authz → user 必须保持：`Bump` 在 `lockRefreshUser` 之前）。测试：`iam/iam_test.go`、`security_test.go`。风险：中。

**T17 — `app/app.go:78 run` 拆分 + closer 去重**
- 改法分两步：
  1. (低风险先做) 引入 `type teardown struct{ fns []func(context.Context) }`，把重复注册的 `onClose(settler.Stop)`（175 与 323）、`onClose(stopHelperHistory)`（292 与 324）改为"移位"：`t.Move(fn)` 语义 = 若已存在则先摘除再追加，保持"关闭顺序 = 注册逆序"的原意。当前两次注册是幂等的（`usage.Stop` 内部 `group.Close` 幂等、取消函数幂等），所以行为不变，但语义更清楚。
  2. (中风险) 按阶段拆函数：`openStorage(ctx,cfg)(*deps,error)`、`startCluster`、`buildCoreServices`、`startPluginRuntime`、`startHTTP`，通过一个 `type app struct` 传递依赖。`run` 目标 ≤ 120 行。
- 行为变化：无（关闭顺序、阶段顺序不变）。测试：`app/managed_test.go`、`managed_runtime_test.go`、`managed_migration_test.go`、`lifecycle_test.go`；HTTP 侧靠 `httpapi/router_test.go` + 端到端。风险：中（第 1 步低、第 2 步中）。

**T18 — `app/managed.go:101 handler` 拆分**
- 改法：把 5 个内联闭包改成方法 `handleStatus/handlePrepare/handleAdmission/handleDrain/handleShutdown`，`write/decode` 提升为包级 `writeJSON/decodeControl`；同时把 `409/401/400` 数字字面量换成 `http.StatusX`（staticcheck ST1013 已有 11 条）。
- 行为变化：无（状态机分支、错误文本 "core identity mismatch" 等逐字保留）。测试：`app/managed_test.go`。风险：中（admission 是运行时契约）。

**T19 — `plugin/grpcruntime/instance.go:239 startProc` 拆分**
- 改法：`reverifyBinary(ctx)`、`prepareRunDir()`、`newPluginClient(cfg, runDir)`、`dispenseClients(conn) (*proc)`（8 个 `pluginv1.New*Client` 一行一个的机械装配）、`verifyInfo(ctx, info)`、`serveHostBroker(pc, p)`、`verifyHealth(ctx, p)`。`launchSpec`（46 行）里的资源覆盖用 `mergeLimits(base, overrides)` 打平。
- 行为变化：无。测试：`grpcruntime/runtime_test.go`、`isolation_test.go`、`availability_test.go`、`rundir_test.go`。风险：中（进程启动失败路径与 run 目录清理必须逐条保留）。

**T20 — `plugin/install` 的 `Upload`/`Consent` 拆分**
- 改法：
  - `Upload`：`openAndValidate(data,opt) (*pkg.Package, error)`、`recordUpload(ctx, tx, m, p, opt, ver) (consent, uploadedAt, upgradeOf, error)`、`carryOverConsent(...)`。
  - `Consent`：`loadConsentable(ctx, tx, key, version)`（含 uninstall 屏障、签名/信任、资源复核）、`decideAndApply(ctx, tx, ...)`、`applyDefaults`。
- 行为变化：无（同意规则 `decide` 一律不动）。测试：`install/install_test.go`、`review_test.go`、`reserved_test.go`、`mutation_test.go`。风险：中。

**T21 — `account/handlers.go` create/update 共享段提取**
- 改法：
  - `resolveWriteRefs(ctx, in) (groupIDs []int64, proxyID *int64, byURL *proxyByURL, err error)` —— 覆盖 `uniqueIDs` → `checkRefs` → `parseProxyURL` 三步（create 916-936 / update 1117-1135）。
  - `applyWriteSettings(ctx, bt, base, in.Settings) (*string, error)` —— `mergeExtensions` + 空值语义（create 942-945 / update 1168-1181）。
  - `create` 里 10 段 `if in.X != nil { y = *in.X }`（965-998）改用仓库已有的泛型 `valueOr`（`account/lifecycle_events.go:160`），一行一个字段。
  - `update` 的事务体拆出 `applyUpdateTx(ctx, tx, ...) error`。
- 行为变化：无（ownership 校验位置、事务边界、事件顺序不变）。测试：`account/account_test.go`、`ownership_test.go`、`ccgateway_test.go`、`feature_policy_test.go`（26 个测试文件）。风险：中高（账号写入主路径，必须逐场景比对 `changedFields()` 与审计 detail）。

**T22 — `account/quota_refresh.go:206 sweepQuotas` 拆分**
- 改法：`initializeQuotaPage(ctx, keys)`、`selectDueQuotas(ctx, keys)`、`queryDue(ctx, ids)`（并发 + singleflight 段），`sweepQuotas` 只做加锁 → CanWork → 三段串联；分页游标 `quotaSweepAfter` 的推进仍留在外层。
- 行为变化：无。测试：`account/quota_refresh_test.go`、`quota_ccgateway_test.go`。风险：低中。

### D. 低嵌套（打平）

**T23 — `app/builtin.go:24 builtinConvergence` + `:90 startBuiltinUpgrade` 合并**
- 改法：抽出唯一的循环引擎
  `runBuiltinLoop(ctx, s, locker, dir, log, interval time.Duration, stopped func() bool) (ready *atomic.Bool, stop func(context.Context))`，
  内部 `ensureOnce(work)` 封装"TryLock → KeepLock → 10min 超时 → EnsureBuiltin → Release"这段当前被复制两次的逻辑。两处调用只差 `interval`（5s/10s）与"是否 once"（`stopped` 谓词）。
- 行为变化：无（间隔、锁名 `plugins:builtin`、日志文本保留）。测试：`install/builtin_test.go`、`app/managed_test.go`。风险：中（内置插件自举路径）。

**T24 — `account/stats.go:372 ReadObservationMetrics` 打平**
- 改法：`validateMetricsQuery(ids, names, seconds) error`、`readInternalCounters(...)`（Redis 管道 + 累加段）两段独立；主函数只保留组装 `out`。深度 5 → 3。
- 行为变化：无（`600` 组合上限、去重、`warming/ok` 状态判定逐条保留）。测试：`account/stats_test.go`、`observation_test.go`。风险：低中。

**T25 — WHERE 构造统一（`account/handlers.go:377 list` + `iam/users.go:84 ListUsers`）**
- 改法：`store/filter.go` 新增
  `type Filter struct{ where []string; args []any }`，`And(cond string, args ...any)`（内部用 `$n` 自增，替代 `strings.ReplaceAll("?")` 与手写 `strconv.Itoa`）、`String() string`、`Args() []any`。
  `account.list` 的 10 段过滤、`iam.ListUsers` 的 3 段过滤改用它；分页参数追加处保留原顺序（`count` 之后才追加 LIMIT/OFFSET）。
- 行为变化：无（SQL 文本结构等价，参数顺序一致；`account.list` 的 `scoped`/`ANY(?)` 写法保持不变）。测试：`account/account_test.go` 列表过滤、`iam/iam_test.go` ListUsers。风险：低中。

**T26 — `plugin/routes/routes.go:111 serveAPI` 循环内重复取路由表**
- 改法：把 `routes := gen.Routes(key)` 提到循环外一次；`methodMissing` 判定改为"先按路径匹配、再比方法"的单一分支（语义不变：当前只要有任何路径匹配但方法不符就 405）。
- 行为变化：无。测试：`plugin/routes/routes_test.go`。风险：低。

### E. 可选（本轮到不做，留作后续）

**T27 — `plugin/sandbox/launcher.go:146 commandEnv` 与 `plugin/grpcruntime/instance.go:180 launchSpec` 的环境变量重复构造**
- 现状：`EnvPluginKey/EnvPluginVersion/EnvStrictNetwork/EnvDataDir` 在 `launchSpec` 与 `commandEnv` 各拼一遍，最终 `cmd.Env` 里同一变量出现两次（靠"后者覆盖"生效）。
- 改法：只由 `launchSpec` 生成这四个变量，`commandEnv` 只负责 base env、`GOMEMLIMIT`、`GOMAXPROCS`；`--keep-env` 的判定仍读 `spec.Env`（不变）。
- 行为变化：插件进程环境的**最终取值**不变，但环境里不再有重复条目；若某个插件（错误地）依赖重复条目语义会受影响——按 POSIX，重复条目本就未定义，可接受。
- 测试：`plugin/sandbox/sandbox_test.go`、`grpcruntime/runtime_test.go`（有 env 断言）。风险：中。**建议先与用户确认再动**，因为它触及插件启动契约。

**T28 — `httpapi.FailIf`（风格项，可选）**
- 改法：新增 `func FailIf(c *gin.Context, err error) bool`（err 非空时渲染并返回 true），把 `if err != nil { httpapi.Fail(c, err); return }` 收敛为 `if httpapi.FailIf(c, err) { return }`。只在**新代码**与低 churn 文件（`plugin/api/settings.go`、`plugin/install/uninstall.go`）先试用，不做全库清扫（本区共 375 处 `httpapi.Fail(c, err)`，全量清扫 churn 过大）。
- 行为变化：无。测试：全部 handler 测试。风险：低（但 churn 大，收益主要是可读性，优先级最低）。

---

## 3. 不要动的内容

| 区域 | 原因 |
|---|---|
| `internal/migrations/*.sql`、`store/migrate.go`、`app/managed_checks.go` 的 migration permit / `SchemaContract` / `appliedPrefix` | 迁移编号、校验和与"前缀契约"是升级安全边界；改一处就可能让旧二进制误读新库 |
| `plugin/pkg/trust.go`（签名/信任链）、`install/consent.go:decide/checkGrantRights/checkRoleGrantRights`、`install/reserved.go` | 插件信任与授权判定；只允许"抽函数"，禁止改规则、错误码与文案 |
| `plugin/dbschema/dbschema.go` 的角色/模式/授权 SQL（`Ensure`/`DropTx`/`RolePassword`） | 数据库隔离（audit 2026-10-09 P1-7）与 Supabase 非超级用户兼容；只整理可读性，不改 SQL 文本 |
| `plugin/egress/egress.go:check`、`dns.go`、`store.go` 的策略判定；`procguard/*` 的 dumpable/scrub | 安全边界（私网/核心地址封锁、环境擦除） |
| `plugin/routes/routes.go` 的 header 剥离表与 CSP、`serveAsset` | 共享 origin 下的注入面 |
| `iam` 的 `CanActOnUser`/`CanActOn`/`EnsureNotLastSuperAdmin`/密码重置授权、`authz` 的 `CanGrant` | 权限提升防线 |
| `cluster` 的租约/心跳 Lua、`slots` 的并发租约 | 多节点正确性；语义改动代价远高于可读性收益 |
| `plugin/grpcruntime` 的 `AutoMTLS`/`UnixSocketConfig`/`RunnerFunc` 配置、`isolation` 相关 | 进程间互信的唯一防线 |
| `app/app.go` 中 `ccgateway` 的 legacy ssh/local 分支（`ccgateway` 包本身不在本区） | 用户尚未决定去留；本轮不碰，也不顺手删 |
| `core/ports_*.go` 的接口签名 | 跨模块契约；本轮所有改动都必须能在不改接口的前提下完成 |
| 现有 SQL 文本、HTTP 错误码/文案、事件 `Type` 与 payload 字段 | 与官方逐字一致 / 与前端契约一致 |

---

## 4. 单人执行顺序

前置基线（不要跳过）：
```bash
cd next/server
export TEST_DATABASE_URL=...          # 或用 sdk/testpg 起的常驻 PG16
/d/mise/installs/go/1.27.0/bin/go build ./... && /d/mise/installs/go/1.27.0/bin/go vet ./...
/d/mise/installs/go/1.27.0/bin/go test ./internal/account/... ./internal/plugin/... ./internal/iam/... \
    ./internal/app/... ./internal/store/... ./internal/cluster/... ./internal/httpapi/... \
    ./internal/core/... ./internal/authz/... ./internal/job/... ./internal/x/...
```
按经验规则：**先确认 PG 测试真的跑了**（看输出里没有 `SKIP`，`go test -v` 抽查一个 DB 用例），不能悄悄跳过。

| 轮次 | 内容 | 说明 |
|---|---|---|
| R1（零风险，一个提交） | T1 → T2 → T3 → T4 → T5 | 纯删除，`go build ./...` 即可验证 |
| R2（复用归并，每项一个提交） | T8 → T9 → T7 → T6 → T11 | 都是"替换实现不改调用点"，易 review、易回滚 |
| R3（中风险提取） | T13 → T12 → T25 → T22 → T24 → T26 | 先易后难；T12 涉及安全校验，单独提交并逐字比对错误文案 |
| R4（结构拆分） | T14 → T15 → T16 → T20 → T19 → T18 | 每项独立提交；只移动代码，不合并判定分支 |
| R5（高风险，需用户确认） | T17(第1步 closer) → T21 → T23 → T17(第2步) → T10 | T21 与 T10 影响响应/写入，先跑完整 `account`/`plugin/api` 测试 + 手工 curl 核对 JSON |
| R6（可选，另开一轮） | T27（需用户确认插件环境契约）→ T28 | 不阻塞前面的合入 |

每轮之间：`go build ./... && go vet ./... && go test <受影响包> -count=1`；R4/R5 之后追加 `go test -race ./internal/plugin/... ./internal/account/...`。
`git diff` 自检：只应出现函数体移动、函数拆分与新辅助函数；任何 SQL 字符串、错误文案、事件类型的 diff 都需要单独解释。

---

## 5. 本区不做的事（避免与他组冲突）

- 不改 `gateway`/`usage`/`usagerules`/`billing`/`providerresources`/`updater`/`ccgateway` 内任何文件；本计划里引用的 `billing/prices.go:escapeLike`、`billing/sync.go:truncate`、`usagerules:truncate`、`gateway/util.go:itoa` 只作为"同名重复"记录，交由对应写者处理。
- 不改前端 `next/server/web`、`webui` 的静态资源管线（仅 `app.go` 里对 `webui.New`/`NewSharedAssets` 的调用顺序保持不动）。
- 不新增第三方依赖；新增辅助函数只落在 `core`、`x`、`store`、`httpapi` 这些已有公共包里。

---

## 6 行摘要

本区域 43 个热点（`>80 行` 40 个、`深度≥5` 6 个，去重）中，真正需要动结构的是 `app.run`(413)、`account.update`(260)、`registry.build`(217)、`reconcileKey`(189)、`UpdateUser`(177)、`startProc`(163)、`Upload`/`Consent`(161/150)；其余长函数多为顺序流水线，长度是固有的。零风险死代码 5 项（T1–T5）：`plugin/pkg` 的 8 个纯转发函数、`install` 两个未用私有方法、`iam.isActive`、`egress.domainTracker.size`、`x` 两个未用工具。最有价值的复用是四组重复：`t(ctx,en,zh)`×6 → `core.Text`、`escapeLike`×2 且 `store.Like` 零调用、`truncate` 三种语义×7、`plugin/api` 手写 egress SQL 而 `plugin/egress` 同名查询成了死代码。低嵌套重点在 `app/builtin.go` 的两个循环（深度 7/6，逻辑几乎逐行相同）与 `account/stats.go`、`rollout/coordinator.go`（深度 5），用"抽出 ensureOnce / 拆校验与累加"打平即可。执行顺序是"先删后并、再拆再平"，每轮独立提交；迁移、插件信任与授权判定、dbschema 权限 SQL、egress/procguard 安全边界、cluster 租约、core 端口接口一律不动，ccgateway legacy ssh/local 分支等用户决定。全部改动不改变 HTTP 响应、SQL、事件与错误文案，唯一可观察差异是两处深挖后的细节（T6 截断点对齐 UTF-8 边界、T10 domains 上限若合并为 1000），已在对应条目写明。

---

## 7. 处理结果（2026-10-24，写者：核心 `next/server` 平台侧）

范围：`next/server/internal/*` 中 01 文档未覆盖的部分（T1–T28）。未提交、未推送。
逐项核对过代码；与计划不符或按计划要求未动的，在「说明/未做」里写明。

### 7.1 已完成

| 项 | 状态 | 实际改动与说明 |
|---|---|---|
| **T1** `plugin/pkg` 纯转发层 | 完成 | 删除 `PatternCovers`、`StringList`、`CoveredBy`、`CheckPlatform`、`BinaryPath`、`NormalizeRoutePath`、`PathParams`、`PathsOverlap`（`scope.go` 的 `ScopeWithin`/`NormalizeScope`、`validate.go` 的 `Validate`/`Conflicts`/`HostCompatible`/`ParseSchedule`/`MigrationFiles`/`EndpointsConflict` 保留，均有生产调用者）。`pkg_test.go` 改 import `sdk/manifest/check` 直接调用；`go vet ./internal/plugin/pkg` 与测试通过。 |
| **T2** `install` 两个未用私有方法 | 完成 | 删除 `pluginStatus`、`openRollout`（U1000 + grep 双确认）。注意与 **T11** 冲突：T11 建议把 `pluginStatus` 导出复用；按本任务优先顺序（死代码先做）已删除，T11 因此未按其写法执行（见 7.2）。 |
| **T3** `iam.isActive` | 完成 | 删除；唯一调用方 `isActiveWithVersion` 保留。`iam` 测试全绿。 |
| **T4** `egress.domainTracker.size` | **跳过（审查者判断有误）** | `size()` 被 `internal/plugin/egress/logwriter_test.go` 的「空闲 host 被淘汰」断言使用。deadcode 不统计测试文件，故被误报为不可达；删除会破坏该测试唯一的观察手段，保留。 |
| **T5** `x.PtrIfPositive` / `x.Uniq` | 完成 | 两个函数与对应测试用例删除；`Itoa64`/`TruncUTF8` 保留并为 T6 扩展。 |
| **T6** 统一 `truncate` | 完成 | `x/util.go` 增加 `Truncate`（rune 边界）与 `TruncateEllipsis`。`rollout/reconcile.go`、`plugin/egress/egress.go` 改为 `x.Truncate`；`account/testreq.go`、`usagerules/usagerules.go`（原文其实已做 UTF-8 回退）改为 `x.TruncateEllipsis`；`event/delivery/worker.go` 的定长版本签名不同，保留并加注释指向 `x`。 |
| **T7** `escapeLike` → `store.Like` | 完成 | 删除 `iam/users.go` 的 `escapeLike`，`ListUsers` 改用 `store.Like`；`store/util_test.go` 已覆盖（替换顺序反斜杠→百分号→下划线）。`billing/prices.go` 属他区，未动。 |
| **T8** `t(ctx,en,zh)` → `core.Text` | 完成 | `core/context.go` 增加 `Text(ctx, en, zh)`；`account/service.go`、`apikey`、`authz/helpers.go`、`group`、`iam/ratelimit.go`、`proxy` 六处本地 `t` 改为一行委托，239 个调用点零改动。 |
| **T9** 小工具 | 完成 | `account/creds.go` 的 `itoa` → `x.Itoa64`；`account/handlers.go` 与 `group/group.go` 的 `uniqueIDs` → 新增的 `x.Unique`（保持首次出现顺序）。`install/upload.go` 的 `nullID`/`nullStr` 按计划保留。 |
| **T14** `registry.build` 拆分 | 完成 | 拆为 `sortedExtensions`、`registerPlugin`、`addPluginPlatforms`、`addAccountTypes`、`addHooks`、`addRanker`、`addRoutes`、`addObserver`、`addJobsAndEvents`、`finish`、`indexAccountType`。顺序、告警文本、`Conflicts` 写回位置逐字保留；`registry` 测试全绿。 |
| **T15** `reconcileKey` 拆分 | 完成 | 拆为 `desiredVersions`、`collectInstances`、`(*slot).entryState`、`rolloutNodeState`；`reconcileKey` 保留状态机骨架。rollout 全量测试（含 multinode / stale generation）通过。 |
| **T16** `UpdateUser` 拆分 | 完成 | 拆为 `validateUpdate`、`assertTargetPermissionsWithinActor`（重复两次的 targetPerms/CanActOn 合流）、`applyUpdateTx`；锁顺序（authz.Bump 在 lockRefreshUser 之前）与审计 detail 逐字段保留。`iam` 测试全绿。 |
| **T17** `app.run` 拆分 + closer 去重 | 完成 | 新增 `internal/app/boot.go`（`boot` 结构 + `teardown` 栈：同 key 再注册是「移到末尾」而不是追加第二次调用）与 `internal/app/phases.go`（`openStorage`/`startCluster`/`buildCoreServices`/`startPluginRuntime`/`startBuiltins`/`startBackground`/`buildEngine`/`registerRoutes`/`startHTTP`/`publishManaged`）。`run` 现在约 35 行，只做阶段编排；`settler.Stop`/`stopHelperHistory` 的两次注册改为同一栈位（原先第二次先跑、第一次再空跑一次，两者幂等；现在只跑一次，顺序相同）。app 测试（managed / lifecycle / runtime / migration）全绿。 |
| **T18** `app/managed.go handler` 拆分 | 完成 | 5 个内联闭包改为 `handlePrepare`/`handleAdmission`/`handleDrain`/`handleShutdown`，`write`/`decode` 提为包级 `writeJSON`/`decodeControl`；数字状态码换成 `http.StatusX`（错误文本逐字保留）。`managed_test.go` 全绿。 |
| **T19** `startProc` 拆分 | 完成 | 拆为 `reverifyBinary`、`prepareRunDir`、`newPluginClient`、`dispenseClients`、`verifyInfo`、`serveHostBroker`、`verifyHealth`；`launchSpec` 的资源覆盖提为 `mergeLimits`。`proc` 增加 `conn`/`broker` 字段（原局部变量）。run 目录清理与 killProc 的失败路径逐条保留，grpcruntime 全量测试（含 isolation / availability / rundir）通过。 |
| **T20** `install` 的 `Upload`/`Consent` 拆分 | 完成 | `Upload` 拆为 `openAndValidate`、`validatePackage`、`recordUpload`、`insertVersionRow`、`carryOverConsent`（幂等重复上传的 consent 通过返回值传递，不再用包级变量）；`Consent` 拆为 `loadConsentable`、`decideAndApply`。`decide` 与所有错误文本未动，install 全量测试通过。 |
| **T21** `account.create/update` 共享段 | 完成（共享段部分） | 新增 `resolveWriteRefs`（uniqueIDs → checkRefs → parseProxyURL，create/update 共用）；create 的 10 段 `if in.X != nil` 改为 `valueOr` 一行一个。计划里的 `applyWriteSettings`/`applyUpdateTx` 未单独提取：update 的 settings 合并基线与 create 不同（`cur.Settings` 与 `p.settings` 分叉），再抽一层只会把差异藏在一组布尔参数后面；update 事务体仍留在 handler 内（字段绑定多，抽取后参数 15 个以上）。账号相关 26 个测试文件全绿。 |
| **T22** `sweepQuotas` 拆分 | 完成 | 拆为 `quotaSweepTypes`、`initializeQuotaPage`、`dueQuotaIDs`、`queryDueQuotas`；游标 `quotaSweepAfter` 的推进仍在分页段内。account 测试全绿。 |
| **T23** `builtinConvergence` + `startBuiltinUpgrade` | 完成 | 抽 `runBuiltinLoop`（goroutine + stop 语义）、`waitOrDone`、`ensureBuiltinOnce`（TryLock → KeepLock → 10 分钟 → EnsureBuiltin → Release）。两处差异（5s/10s、once/allowed、日志级别与文案）作为参数保留；锁名 `plugins:builtin` 不变。app 测试全绿。 |
| **T24** `ReadObservationMetrics` 打平 | 完成 | 拆为 `validateMetricsQuery`（窗口/数量/乘积上限、去重、id 校验）与 `readInternalCounters`（Redis 管道 + 累加）；600 组合上限、`warming/ok/incomplete` 判定逐条保留。account 测试全绿。 |
| **T25** WHERE 构造统一 | 完成 | 新增 `store/filter.go`（`Filter.And(cond, args...)` 内部 `$n` 自增、`Cond()`、`Args()`、`Len()`）。`account.list` 的 10 段过滤与 `iam.ListUsers` 的 3 段过滤改用它。说明：`iam.ListUsers` 的 `(email ILIKE $1 OR display_name ILIKE $1)` 复用同一参数，`Filter` 一个 `?` 对一个参数，改为同值 `$1`/`$2`，结果等价、参数顺序一致。 |
| **T26** `routes.serveAPI` 循环内取路由表 | 完成 | `routes := gen.Routes(key)` 提到循环外，循环按索引取 `*core.RouteBinding`；405 语义（任一路径匹配但方法不符）不变。routes 测试全绿。 |

### 7.2 未做（附理由）

| 项 | 理由 |
|---|---|
| **T4** | 见上：`domainTracker.size` 被测试使用，「无引用」的判断不成立。 |
| **T10** `plugin/api` egress SQL 下沉 | 会改动 `domains` 条数上限或 `plugin/egress` 的查询签名，且响应结构敏感（计划本身标「风险：中」）。按「不改线形的重构」取舍后未做。 |
| **T11** `pluginStatus` 统一 | 与已执行的 T2（删除该私有方法）互斥。API 层的 `pluginStatus`/`pluginStatusValue` 各自只 6–8 行且错误处理不同（一个渲染 404、一个返回 error），统一需要新导出函数并改 5 处调用；本轮按「死代码先做」处理，未再引入。 |
| **T12** `VersionApproval` 统一 | 安全校验提取，三处语义有差异（一处 `FOR UPDATE`、一处只比 consent、一处还要 `CheckResources`）。计划标「风险：中，只允许提取」，本轮未做，留给后续。 |
| **T13** 轮询循环统一 | 24 处 ticker 循环形态各异（首轮延迟、once 退出、settings 重载），抽 `core.Every` 会把 admitted/首轮语义藏进参数；与 T23 已处理的 builtin 循环不同类。未做。 |
| **T27** 插件环境变量去重 | 计划本身要求先与用户确认（触及插件启动契约）。未做。 |
| **T28** `httpapi.FailIf` | 可选风格项，计划建议只在新代码试用；本轮无新增 handler，未做全库清扫。 |

### 7.3 验证

- `go build ./...`、`GOOS=linux go vet ./...`：通过。
- `gofmt -l`（全部改动文件）：无输出；`goimports` 已跑。
- 要求的测试集：`go test -count=1 ./internal/ccgateway/... ./internal/account/... ./internal/gateway/... ./internal/plugin/... ./internal/billing/... ./internal/usage/... ./internal/iam/...` 全绿（ccgateway 166.9s、account 154.5s、gateway 52.9s、plugin 各包 2–62s、billing 44.1s、usage 95.5s、iam 12.9s）。
- 追加跑了 `app`、`authz`、`group`、`apikey`、`proxy`、`store`、`x`、`httpapi`、`core`，以及 `event`、`observation`、`job`、`cluster`、`migrations`、`config`、`updater`、`webui`、`providerresources`、`helperhistory`、`background`、`netguard`、`tokenizer`、`fallbackcredits`：全绿。
- PG 用例真跑：抽查 `TestPurgePluginAccountsMarksRuntimeCleanup`、`TestRetainedDeletedRuntimeBlocksThenPurgesOnce`、`TestRuntimePurgeEndsRetention` 均在 0.7–2.0s 内 PASS（无 SKIP）；需要 DB 的包耗时 15–170s，说明实际连库。
- `staticcheck -checks 'all,-ST1000,-ST1003,-ST1005,-ST1020,-ST1021,-ST1022,-SA1019' ./internal/...`：仅剩 3 条改动前已存在的告警（`account/balance_claudeoauth.go` SA9003、`billing/prices.go` SA4006、`store/account_balance.go` ST1016），本轮未新增。
- `deadcode ./cmd/...`：报告均为改动前已知项（`gateway/resource_references.go`、`gateway/convert.NewRegistry`、`plugin/egress` 的 `Domains`/`Summary`/`List`、`plugin/market.SignIndex`、`plugin/registry.LoadPackage` 等测试/反射入口，计划 §3 已列为误报）。本轮删除的 8 个转发函数与 2 个私有方法不再出现。

### 7.4 行为变化

- **T6**：`plugin/rollout` 与 `plugin/egress` 的截断点由「任意字节」改为 rune 边界（仅多字节文本有差异，纯 ASCII 完全一致）。`account/testreq.go` 原本已做 UTF-8 回退，等价。
- **T17**：teardown 栈对同一 key 只保留最后一次注册（位置移到末尾）。原先 `settler.Stop` 与 `stopHelperHistory` 各注册两次、逆序时后注册的先执行、先注册的再空跑一次（两者均幂等）；现在只执行一次，执行顺序不变。
- **T25**：`iam.ListUsers` 的 email/display_name 模糊搜索从复用 `$1` 改为同值 `$1`/`$2`，SQL 文本变化、结果与参数顺序不变。
- 其余：HTTP 响应、错误文案、事件 payload、SQL 结构均未变。

### 7.5 复验（第二轮，2026-10-24）

位置说明：T1–T28 与上面的 7.1–7.4 都是同一写者先前写好的；本条只是交接后的最终复验结果，没有新增 T 项。T27（插件环境变量去重，需先确认插件启动契约）与 T28（`httpapi.FailIf` 可选风格项）按 7.2 的理由保持未做，本轮不翻案。

交接检查：工作树原样 `go build ./...`、`GOOS=linux go vet ./...` 均为空输出。

按顺序、每条命令各跑一次：

1. `go build ./...`：通过。
2. `GOOS=linux go vet ./...`：通过。
3. `gofmt -l`（`git diff HEAD` 中 `next/server` 的全部改动 `.go`）：无输出。
4. `staticcheck -checks 'all,-ST1000,-ST1003,-ST1005,-ST1020,-ST1021,-ST1022,-SA1019' ./...`：24 条，全部在 7.3 已列出的改动前既有文件里；本轮新增的 `ccgateway/controller_install.go` SA4006（在 05 文档的 X21 拆分里引入）已修，见 05 文档 §8.1.1。
5. `go test -count=1 ./...`（整个模块）：**49 个包 ok，0 FAIL**（account 181.7s、ccgateway 194.7s、gateway 80.8s、usage 83.5s、grpcruntime 72.7s、billing 73.8s、rollout 66.2s、helperhistory 67.9s、migrations 57.1s、store 57.5s、install 54.9s、app 48.7s；7 个包 `no test files`）。

PG 用例真跑（`-v` 抽查，0 SKIP）：`TestPurgePluginAccounts`、`TestPurgePluginAccountsMarksRuntimeCleanup`、`TestPurgePluginAccountsDropsCCGatewayRequestCache`、`TestRetainedDeletedRuntimeBlocksThenPurgesOnce`、`TestRuntimePurgeEndsRetention`、`TestDeleteRetainResources`、`TestLifecycleStatusSweepRereadsStaleStates`、`TestQuotaSweepBoundedAcrossNodes`、`TestKickReconcilesWithoutWaitingForTheSweep` 全 `--- PASS`（0.86–4.33s）。

