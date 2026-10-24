# Round 2 复审 — 核心服务端（commit fde7f9163）

范围：`next/server`（app / plugin / account / iam / ccgateway / gateway / usage / billing / usagerules / store / x / httpapi）。
对照：`2026-10-24-optimization-round2/01-server-path.md` §7、`02-server-platform.md` §7、`05-ccgateway.md` §6/§8。
工具：Read/Grep/git + `staticcheck -checks U1000,all` + `deadcode ./cmd/...`；`go build` 通过，`go test` 抽查 app / usage / gateway / usagerules / ccgateway / store / x / plugin/pkg / billing/expr 全绿（testpg 模板库正常创建，DB 用例未跳过）。

## 结论

结构方向正确：死代码 5 项（S1–S5）与 T2/T3/T5 确实删干净（全库 grep 无残留符号），`lockUsageRow`（5 处，SQL 一字未变）、`cacheBalance`（4 处，剩余 3 处形态不同、不合并是对的）、`validatePatches`（保留 attemptReturn/Failover 差异）、`tryStickyBinding`（置位/dropBinding/副作用逐条对齐）、`store.Filter`（`?`→`$n` 编号与旧实现等价）、`x.Unique`、`core.Text` 都是真的等价替换。`app` teardown 顺序经逐条推演与旧 `closers` 一致（settler/helper-history 的第二次注册只是空跑，去重无害）。

但有一处**由拆分引入的功能回归**（managed 节点的 job scheduler 实例与 API 持有的实例不再是同一个），一处错误路径的行为变化（`SweepDrafts` 在查询失败后仍继续跑后续两段），以及若干"只做了一半"的复用与新引入的多返回值过度抽象。共 14 项，无 nitpick。

## 问题表（按严重度）

| id | file:line | kind | 问题 | 具体修法 | 风险 | 行为变化 |
|---|---|---|---|---|---|---|
| **R-S1** | `internal/app/phases.go:371` + `app.go:57` + `phases.go:507` | regression | `startBackground()` 现在同时承担"构造 jobs/delivery"和"启动"两件事，而它被注册为 `managed.start`（`m.start = b.startBackground`）。`run()` 先调一次（构造实例 A，managed 时直接返回），`startHTTP` 用 A 传给 `plugin/api.Deps{Jobs: b.jobs}`；随后 admission 再调 `m.start` → **重新构造实例 B**，`startOnce` 启动的是 B。于是 managed 节点上控制台"立即运行 job"打到从未 Start 的 A，恒返回 `ErrUnavailable`"job scheduler is not running"。拆分前 `jobs` 只构造一次，闭包与 API 持有同一指针。 | 把构造拆出去：`run()`（或新的 `b.buildBackground()`)里只 `job.New`/`delivery.New` + 注册 teardown；`startBackground()` 只保留 `startOnce.Do(... Start ...)`，`m.start` 指向它。构造必须幂等（`if b.jobs == nil`）。 | 中高（仅 managed/ovh 外壳路径；standalone 无影响） | 是（managed 节点 manual job run 从可用 → 不可用） |
| **R-S2** | `internal/ccgateway/sweep.go:72` | regression | `removeExpiredDrafts` 把"查询失败 / `rows.Err()`"也变成普通返回值，`SweepDrafts` 无论成败都继续调 `sweepRetired`、`sweepOrphans`。旧实现在这两个错误上**立即 return**，不会在 DB 已出错时继续做（可能带远程删除的）后续两段。注释"each one is still called after a cancelled draft pass, as before"只对"取消"成立，对"失败"不成立。 | `if e != nil { return removed, e }`（查询/rows.Err 属于硬失败）+ 取消时按旧路径 `return removed, ctx.Err()`；把注释改成"per-key 错误继续，查询错误中止"。 | 低（错误路径），但会放大故障时的副作用 | 是 |
| **R-S3** | `internal/gateway/resource_http.go:392`、`:424`、`:464` | over-abstraction | `prepareExisting` 返回 6 元组 `(r, ref, binding, ctx, release, ok)`，失败时 `ctx=nil`/`release=nil` 作哨兵；`existingGet`/`existingDelete` 各自再接 6 个入参。原来一个 112 行、深度 3、顺序可读的函数，现在读一条 DELETE 流程要跳 3 个函数并核对"失败时返回的零值不会被用到"。 | 引入小结果结构体：`type existingRef struct{ r core.ProviderResource; ref core.AccountRef; binding core.ResourceBinding }`（值 + `release func()` 作为第二个返回值，`ok` 用 error 代替），GET/DELETE 只接 `(existingRef, ctx)`；或者干脆保留单函数、只把 DELETE 尾段提成一个方法。 | 低 | 否 |
| **R-S4** | `internal/app/boot.go:52`、`phases.go:114`、`:241` | over-abstraction | `boot` 是 50 个字段的 god object，每个 phase 都读写共享状态，读一个阶段必须回看 struct 注释；`buildCoreServices`(124 行) / `startPluginRuntime`(92 行) 仍是长函数，只是从 `run` 搬到新文件。R-S1 的根因也在这里：phase 函数既当构造函数又当 admission 回调。 | 短期：拆 `buildBackground` 与 `startBackground`（R-S1），把 `canWork/canCoordinate` 之外的一次性局部（launcher、trust）不再入 struct。中期：把 `builtinReady`、`gate`、`startOnce` 这类"只给某一阶段和 managed 用"的字段收进子结构 `runtimeState`。 | 低 | 否 |
| **R-S5** | `internal/usage/api.go:156`、`internal/billing/balance.go:71`、`:140`、`internal/billing/prices.go:91` | missed reuse | `store.Filter` 只落到 `account.list` 与 `iam.ListUsers`，全库仍有 4 份等价实现：`usage/api.go` 的 `type filter`+`add`（`strings.ReplaceAll(cond,"?","$"+strconv.Itoa(len(args)))`）、`billing/balance.go` 两处 `add := func`、`billing/prices.go:91`。这正是 T25 想消灭的模式。 | `usage.filter` 改为内嵌/包装 `store.Filter`（`sql()` → `Cond()`，分页参数用 `Len()`）；三处 `add` 闭包改 `var f store.Filter`。顺带消除 R-S8 的死代码。 | 低（编号规则已验证一致；`usage` 的 `f.sql()` 只多一个前导空格差异需逐条比对） | 否 |
| **R-S6** | `internal/billing/prices.go:148`、`internal/usage/api.go:270` | missed reuse | `escapeLike` 与 `strings.NewReplacer("\\","\\\\","%","\\%","_","\\_")` 各一份，`store.Like` 仍只有 iam 一个调用者。 | 两处改 `store.Like`；`usage` 那处注意带 `ESCAPE E'\\'` 的 SQL 文本不动。 | 低 | 否 |
| **R-S7** | `internal/usage/settler.go:348`、`internal/billing/sync.go:440`、`internal/gateway/util.go:108`、`:118` | missed reuse | `x.Truncate` 落地后仍有 4 份同义实现：`usage.trunc`（rune 边界、无省略号）、`billing.truncate`（字节切+`…`）、`gateway.truncateUTF8`（rune 边界，与 `x.Truncate` 逐字相同）、`gateway.itoa`（= `x.Itoa64`）、`apikey.itoa`。01 文档把 billing/gateway 归到自己，实际未动。 | `usage.trunc`→`x.Truncate`、`gateway.truncateUTF8`→`x.Truncate`、`gateway.itoa`→`x.Itoa64`；`billing.truncate` 先确认是否需要 rune 边界（错误信息，可接受更短）再改 `x.TruncateEllipsis`。 | 低（`gateway`/`billing` 的截断点从字节变 rune，仅多字节文本有差） | 是（极小，需写进说明） |
| **R-S8** | `internal/store/filter.go:56` | leftover | `Filter.Len()` 无任何调用者（`deadcode ./cmd/...` 明确报 `unreachable func: Filter.Len`）。新代码里 `account.list`/`iam` 都用 `len(args)` 自己算。 | 要么在 R-S5 的迁移里真用上（分页 `$len+1`），要么删除。 | 无 | 否 |
| **R-S9** | `internal/plugin/grpcruntime/instance.go:390` | leftover | `dispenseClients` 的 `if p.conn == nil { return errors.New("dispense: no connection") }` 不可达：`newPluginClient` 只在 `pc.Conn != nil` 时构造并赋值 `p.conn`。这是拆分产生的防御性死分支。 | 删除该检查（`var conn grpc.ClientConnInterface = p.conn` 保留），或把 `conn` 作为参数传入 `dispenseClients(conn grpc.ClientConnInterface)` 从而不需要检查。 | 无 | 否 |
| **R-S10** | `internal/ccgateway/controller_uploads.go:331`、`:284` | over-abstraction | `applyLoadedImage` 返回 5 个值（含被替换的 `ctx` 与调用方必须 `defer` 的 `cancel`），"哪个 ctx 给审计、哪个决定 `runtimeState`"只写在注释里；`decodeLoadRequest` 返回匿名 struct（函数体内又重复一遍同样的 struct 字面量），调用方无法命名该类型。 | 命名类型 `type loadRequest struct{ Role string; Apply bool }`；`applyLoadedImage` 把"尾段 ctx"单独返回为 `tailCtx, cancel`（不与输入 ctx 同名替换），成功时 `(cfg, report, tailCtx, cancel, ok)` 或干脆让 `uploadLoad` 自己起 tail ctx（3 行）。 | 低 | 否 |
| **R-S11** | `internal/ccgateway/controller_install.go:222`、`:244` | over-abstraction | `installAdminKey` 6 入参/3 返回、`installGatewayPlan` 4 个命名返回 + `legacy` 布尔；`installAdminKey` 的 legacy 分支把"新的 cfg"当 `target` 返回（沿袭旧代码 `target = cfg` 的隐式重载），读代码时很难看出 target 究竟是"SSH 目标"还是"带管理密钥的配置"。 | 用一个小结构体 `installPlan{ target Config; version []byte; scheme, host string; legacy bool }` 贯穿，两个 helper 改成 `(plan) (installPlan, *core.Error)`；`legacy` 从布尔参数变成 plan 字段。 | 低（机械重构，错误码/文案不动） | 否 |
| **R-S12** | `internal/plugin/rollout/reconcile.go:384`、`:337` | over-abstraction | `rolloutNodeState(..., entryState func(string) (string, string))` 为了把一个已有方法传进去而引入闭包参数；`collectInstances(s, c *Controller, st *NodePluginState)` 只用到 `c.o.LoadRetry` 一个字段，却把整个 Controller 传进自由函数并顺手改 `st.Instances`（输入输出混在参数里）。`reconcileKey` 仍有 116 行。 | `rolloutNodeState` 改成 `(*slot)` 的方法或直接接 `*slot`；`collectInstances` 改 `func collectInstances(s *slot, loadRetry time.Duration) (instances []InstanceState, running []Instance, retryOK []bool)`，由调用方填 `st`。 | 低 | 否 |
| **R-S13** | `internal/usage/reconcile.go:433`、`:460` | over-abstraction | `askPoll` / `buildAndAsk` 各 7 个参数（`ctx, e, row, client, entry, acct, proxyID`），且都重新 `r := s.rec`；`askPlugin` 与两个子函数之间靠位置参数对齐，漏传一个只能靠编译错误发现。 | 把 `(client, entry, acct, proxyID)` 收成 `type observationCall struct{...}`（`askPlugin` 已构造，直接传值），两个子函数降为 3 参。 | 低 | 否 |
| **R-S14** | `internal/plugin/rollout/reconcile.go:573`、`internal/plugin/egress/egress.go:396`、`internal/iam/users.go:88` | regression（已声明） | 写者在 02 §7.4 承认的两处可观察差异，复核坐实：① `rollout`/`egress` 的截断点由字节改为 rune 边界（中文错误信息会变短 1–3 字节）；② `iam.ListUsers` 模糊搜索从复用 `$1` 改成同值 `$1`/`$2`，SQL 文本变化、服务端预处理参数个数由 1 变 2。均无功能差异，但需要在发布说明里保留一行。 | 不改代码；在 `CHANGELOG`/发布说明保留这两条（② 若在意 SQL 文本指纹，可给 `store.Filter` 加 `SameArg` 之类的具名参数复用能力，不建议为此改）。 | 无 | 是（已声明） |

## 抽样核对写者"完成"声明

| 声明 | 核对结果 |
|---|---|
| S1–S5 死代码删除 | 通过。全库 grep `readPrefix`/`errBadUpstreamURL`/`errPrivateUpstream`/`cloneAttemptFacts`/`changedAfterCommit`/`expr.Version(` 均无命中；`billing/helpers_test.go:111` 的 `(*env).plugin` 仍是 U1000（测试 helper，写者判断正确）。 |
| S6 `lockUsageRow` SQL 未变 | 通过。`usage/settler.go:372` 与旧 `id = $1` 仅空格差异；5 个调用点的 `err` 作用域均为闭包内新变量，`ledgerRes, err = ...` 的目标仍正确。 |
| S7 `cacheBalance` | 通过。4 处直调合并；`settler.go` 的 `insertAtomic` 内 3 处属"先收集后统一刷"，不合并是正确的。 |
| S10 `validatePatches` 保留 kind 差异 | 通过（`attemptReturn` 仅首个守卫，其余 `attemptFailover`，`attemptDone` 作成功哨兵）。 |
| S13 `tryStickyBinding` | 通过（逐分支比对：bound 在候选内但不可用 → 不 dropBinding；不在候选内且非冷却 → dropBinding；`s.tried` 只置一次）。 |
| S16 `existing` 拆分 | 通过（DELETE 用 `reservation.Resource.OperationID` 调 `FinishDelete`；GET content/metadata 两路未变）。仅结构可读性问题（R-S3）。 |
| T4 跳过判断 | 通过。`egress/logwriter_test.go:372` 确实调用 `tr.size()`，deadcode 不统计测试文件，写者判断正确。 |
| T17 teardown 顺序不变 | 通过（反序后唯一差异是去掉了 `settler.Stop`/`stopHelperHistory` 的第二次空跑，位置与首次一致）。但同一改动带进 R-S1。 |
| T25 `store.Filter` 编号 | 通过（`?`→`$n` 自增按"本条件内第 k 个"计算，与旧 `len(args)` 语义相同；`iam` 的双参数版本结果等价）。 |
| 静态检查 | 通过。`staticcheck`（all 去掉 ST10xx/SA1019）仅 6 条，全部落在改动前已有文件；`U1000` 仅测试 helper。`deadcode ./cmd/...` 与写者清单一致，**新增 1 条**：`store.Filter.Len`（R-S8）。 |
| 测试 | 抽查 app / usage / gateway / usagerules / ccgateway / store / x / plugin/pkg / billing/expr 全绿；testpg 模板库建立正常，DB 用例实际执行。 |

## 建议修复顺序

1. R-S1（功能回归，managed 路径）→ 2. R-S2（错误路径副作用）→ 3. R-S5/R-S6/R-S7/R-S8（一次性收尾，全部是机械替换，做完 T25/T6 才算真正闭环）→ 4. R-S9 → 5. R-S3/R-S10/R-S11/R-S12/R-S13（可读性，逐项独立提交，不动行为）→ R-S14 只写发布说明。

## 处理结果（2026-10-24，只改 `next/server`）

处理范围仅限 `next/server`；未提交。`sdk`、`plugins`、`codec`、`gateway`（独立模块）与他人的 web/controller/cli-mods 未动；`next/server/web/dist` 未动（工作区里它是其他写者的改动）。

| id | 处理 | 位置与验证 |
|---|---|---|
| **R-S1** | **已修（回归）**。拆成 `buildBackground()`（只构造、`b.jobs != nil` 时幂等返回）与 `startBackground()`（只跑 `startOnce.Do(Start...)`）；`run()` 只构造，`publishManaged` 把 `buildBackground` 之后同一对实例交给 `plugin/api.Deps{Jobs}`，admission 的 `m.start` 调用的 `startBackground` 启动的就是它。standalone 仍在 `run()` 内立即启动 | `internal/app/phases.go:369-401`、`internal/app/app.go:54-61`。新增 `TestBackgroundBuiltOnceForAdmission`（`internal/app/background_test.go`）：旧代码上按预期失败于「admission rebuilt the scheduler the console holds」，修复后通过；并断言控制台持有的 scheduler 已启动（`RunNow` 不再回答 "job scheduler is not running"） |
| **R-S2** | **已修（回归）**。恢复「查询失败/`rows.Err()` 即中止」：查询拆成 `expiredDraftKeys`（返回硬错误），`SweepDrafts` 在该错误上直接 `return 0, e`；随后两段仍按旧顺序执行，per-key 错误继续收集（首错返回），取消返回 `ctx.Err()` | `internal/ccgateway/sweep.go:58-134`。新增 `TestSweepStopsWhenTheDraftQueryFails`（`internal/ccgateway/drafts_test.go`）：表不可读时旧代码继续走到 `GET /accounts`，测试在旧代码上失败、修复后通过 |
| **R-S3** | **已修**。`prepareExisting` 返回 `(existingResource, release, ok)`，`existingResource` 是 4 字段值结构（行、issuer 身份、binding、lease ctx）；`existingGet`/`existingDelete` 只接 `(id[, content], existingResource)` | `internal/gateway/resource_http.go:370-420,467` |
| **R-S4** | **已修（短期项 + 收拢）**。`buildBackground` 与 `startBackground` 已拆（R-S1）；`trust` 改为 `buildCoreServices` 的返回值、`startPluginRuntime(trust)` 的参数；`launcher`、`packageStore`、`packageHTTP`、`egress`、`schemas`、`rt`、`resources`、`helpers`、`observations`、`mutations`、`defaults` 只作阶段内局部变量，不再入 `boot`；`gate`/`builtinReady`/`startOnce`/`startErr` 收进 `runtimeState` 子结构（嵌入 `boot`，调用点不变）。两个阶段函数本身未再拆（中期项，留给后续） | `internal/app/boot.go:46-110`、`internal/app/phases.go:111-330`、`internal/app/app.go:47-56` |
| **R-S5** | **已修**。`usage.filter` 整体删除，`parseFilter`/`addContainsFilters`/`addTimeRange` 改用 `store.Filter`（`Cond()`/`Args()`/`Len()`）；summary 的三个标记参数改为按 `Len()` 推算 `$n`（不再直接改内部 slice）；`billing.myLedger`/`listLedger` 两处 `add` 闭包、`billing.listPrices` 的 `add` 闭包全部改为 `var f store.Filter` | `internal/usage/api.go`、`internal/billing/balance.go:65-170`、`internal/billing/prices.go:85-125`。SQL 文本逐条比对：`?`→`$n` 编号、` WHERE ` 前缀、分页参数位置均与旧实现一致；`prices` 的 `q` 条件由「同一 `$n` 用两次」变为「两个同值参数」，语义相同（与 R-S14 ② 同类，见下） |
| **R-S6** | **已修**。`billing.escapeLike` 删除 → `store.Like`；`usage` 的 `strings.NewReplacer` → `store.Like`；顺带 `plugin/api.likePatterns` 里的同一份转义也改用 `store.Like`（转义表逐字符相同） | `internal/billing/prices.go`、`internal/usage/api.go:261-272`、`internal/plugin/api/ops.go:286-295` |
| **R-S7** | **已修**。`usage.trunc`→`x.Truncate`、`gateway.truncateUTF8`→`x.Truncate`（保留 `n <= 0` 原样返回的旧语义）、`gateway.itoa`→`x.Itoa64`、`billing.truncate`→`x.TruncateEllipsis`、`apikey.itoa` 删除（直接用 `strconv.Itoa`） | `internal/usage/settler.go:348`、`internal/gateway/util.go:108-117`、`internal/billing/sync.go:441`、`internal/apikey/apikey.go:317`。**已声明行为差异**：`billing.truncate` 由字节切改为 rune 边界切（仅多字节错误信息变短 1–3 字节）；`event/delivery` 的定长 `truncate` 保持字节精确（它的注释已说明长度是契约，不是遗漏）。`usage.trunc`/`gateway.truncateUTF8` 与 `x.Truncate` 的 rune 判定逐字节相同 |
| **R-S8** | **已修（采用「真用上」）**。`store.Filter.Len()` 被 R-S5 迁移后的分页与 summary 标记参数使用（`usage/api.go`、`billing/balance.go` ×2、`billing/prices.go`），`deadcode` 不再报 | `internal/store/filter.go:55` 未改，调用点见上 |
| **R-S9** | **已修**。删除不可达的 `p.conn == nil` 检查，`dispenseClients` 不再返回 error（`newPluginClient` 只在 `pc.Conn != nil` 时构造 proc） | `internal/plugin/grpcruntime/instance.go:386-399`、调用点 `:277` |
| **R-S10 / R-X13** | **已修**。`decodeLoadRequest` 返回命名类型 `loadRequest{Role, Apply}`；`applyLoadedImage` 降为 3 个返回值 `(Config, *workersReport, bool)`，不再替换输入 ctx；尾部 2 分钟预算由调用点在 `workers != nil` 时用新的 `tailContext(ctx)` 起（`bundle_push` 同一处也改用它） | `internal/ccgateway/controller_uploads.go:220-350`、`internal/ccgateway/bundle_push.go:241-243` |
| **R-S11** | **已修**。新增 `installPlan{target, version, scheme, host, legacy, port, domain, pinCA, caddyConfig}` 贯穿 `installDestination`/`installAdminKey`/`installGatewayPlan`，三者都改为 `(plan, *core.Error)`；`legacy` 成为 plan 字段，网关计划也写入 plan | `internal/ccgateway/controller_install.go:206-276,278-350`。错误码/文案逐条未改 |
| **R-S12** | **已修**。`rolloutNodeState` 改为 `(*slot)` 方法（不再传闭包）；`collectInstances(s, loadRetry)` 返回 `(instances, running, retryOK)`，由 `reconcileKey` 填 `st.Instances` | `internal/plugin/rollout/reconcile.go:274-280,334-402` |
| **R-S13** | **已修**。新增 `observationCall{client, entry, acct, proxyID}`；`askPoll`/`buildAndAsk`/`askMonitor` 都降为 `(ctx, e, row, call)` | `internal/usage/reconcile.go:396-430,433-500`、`internal/usage/monitor.go:65-120` |
| **R-S14** | **不改代码**，按建议保留发布说明条目：① rollout/egress/usage 的截断点由字节改为 rune 边界；② iam 模糊搜索由复用 `$1` 改为两个同值参数（另：本轮 R-S5 让 `billing.listPrices` 的 `q` 也变成两个同值参数，行为相同、SQL 文本变化）。**需要写进 CHANGELOG/发布说明** | — |

### 需要其他写者/Docs 处理的事项

- `next/docs/CONTRACTS.md:4035`、`:4046` 仍把 `F-CLIENT-ATTACHMENT-ERASE`／`F-CLIENT-ATTACHMENT-REPLACE` 当作特性目录锚点，这两个 ID 已随 native 目录删除（R-X3 ③）；应改指向 `F-BUILD-ATTACHMENTS` 或注明已删。
- `next/web/mock/ccgateway.ts` 的 `/features` 夹具已在本轮同步为 `2026-10-20.request-attachments-v1` 的两条目录（web 写者改的，已核对），R-X3 ② 无需再动。
- R-X12 的选择：`runtime/bundled` 的 body 改为 `decodeStrictJSON`（与同目录其他控制台端点一致），未知字段从 200 变 400 —— 需要一行发布说明。

### 验证（每项各跑一次，无循环）

- `go build ./...`：通过。
- `GOOS=linux go vet ./...`：通过（exit 0）。
- `gofmt -l` 对 `internal/app internal/ccgateway internal/gateway internal/usage internal/billing internal/plugin internal/apikey internal/store`：无输出。
- `staticcheck`（`internal/app/... ccgateway/... gateway/... usage/... billing/... plugin/{rollout,grpcruntime,api}/... apikey/... store/...`）：仅既有的 ST1005/U1000/SA1019 与 `billing/prices.go:483` 的 SA4006（该行不在本轮改动内，HEAD 同样存在）。本轮未新增。
- `go test -count=1 ./...`（`next/server` 全量，约 13 分钟）：49 个包 `ok`，exit 0；PG 用例实际执行（testutil/testpg 模板库正常，DB 包耗时与上一轮一致），无跳过。

