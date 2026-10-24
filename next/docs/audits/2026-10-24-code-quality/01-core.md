# 2026-10-24 代码质量审核 01：核心服务端

范围：`f546fa31a..HEAD` 里 `next/server` 的核心部分（`internal/ccgateway`、`internal/account`、`internal/gateway`、`internal/core`、迁移 0057），看的是这些文件现在的代码，重点是这次新写或重写的部分。只读审核，没有改代码。

## 摘要

- 这轮把不少大函数拆开了（`forwardAttempt` 改成 `attempt`、`mergeConfig`、`serveRuntime`、`runtimeBundled`、`installTarget`、`sweepRetiredKey`），新增的 `readBounded` 和 `newNoRedirectClient` 也替掉了大部分重复写法，方向是对的。
- 剩下价值最高的是**复用**：
  - 草稿动作 `AccountPreparationAction` 把刚抽出来的 `runtimeAction` 又整段写了一遍。
  - 删除运行时有两个几乎一样的 `DELETE /accounts/<key>`（`purgeRuntime` 和 `deleteRemote`）。
  - 请求路径上的“代际 + TTL”读穿缓存写了三遍。
- **解耦**和真问题：
  - `purgeAndRecord` 替调用方提交了事务。
  - `save` 把存储或加密失败报成 400。
  - `admitSavedCLIVersion` 自己往 HTTP 里写失败响应，读配置失败时最后会被说成 `config_changed`。
  - `account:changed` 的发布逻辑写了三份，其中 `purged()` 漏了本节点的 CCGateway 缓存失效。
- 函数长度：`controllerInstall` 还有 139 行，`account.delete` 涨到 70 行。
- 工具检查：staticcheck 和 deadcode 在这次改动的新代码里都没有报告（报出来的 `readPrefix`、`errBadUpstreamURL` 等不在本次改动的文件里）。
- 按要求不碰的：`attempt.resolveShared`（旧共享运行时，ssh/local）在等用户决定，这里不提改法。只记一点：拆分以后它和 `resolveRoute` 各自给 `client/base/close/modelKey` 赋值，以后删除时整段删掉即可，不影响其他步骤。

## 问题表

| id | 位置 | 准则 | 问题 | 具体改法 | 风险 | 行为变化 |
|---|---|---|---|---|---|---|
| K1 | `ccgateway/lifecycle.go:43-104` 和 `ccgateway/accounts.go:733,768` | 复用 | `AccountPreparationAction` 把 `runtimeAction` 整段又写了一遍：动作到路径的映射、`readBounded(65536)`、session 404 当作 nil、`safeResult`、`sessionResult`；sync 的错误映射也和 `serveSync` 不一样（一个用 `transportError`，一个保留控制器给的 reason）。 | 草稿的 health/session/start/complete/cancel 改为调用 `runtimeActionPath` 加 `s.runtimeAction(ctx, desired, true, ...)`，删掉 `paths` 表和重复的读取、解析；把 `serveSync` 里的错误映射抽成 `syncFailure(err) *core.Error`，两处共用；`status` 分支保留（phase 的算法不同）。 | 中 | 有：草稿 sync 失败时会带上控制器给的 reason，和账号一致 |
| K2 | `ccgateway/cleanup.go:82`，`ccgateway/drafts.go:332` | 复用 | `purgeRuntime` 和 `deleteRemote` 都发 `DELETE /accounts/<key>`，请求头都是 Delete-Account 和 Delete-Data，失败都走 `deleteFailure`。区别只是一个走 `cleanupConfig`（每次多一次 `GET /health`）加 `controllerCall`，一个走 `runtimeRequest`；404 的处理也不一样，一个算失败，一个算已删除。 | 保留一个 `deleteRuntime(ctx, key, opts)`，参数说明是否要求 `cleanupFeature`、404 是否算已删除；两个调用方只传参数；能力检查只在 `runtimeCleanup` 入口做一次，每轮 Reconcile 不用都打 `/health`。 | 中 | 无（参数保持各自现有语义时） |
| K3 | `ccgateway/request_cache.go:144,168,262` | 复用 | `requestConfig`、`requestDesired`、`requestAccountFeatures` 是同一套读穿缓存写了三遍：先加锁看 TTL，记下 gen，解锁加载，再加锁比较 gen 后写回；`cachedConfig`、`cachedDesired`、`cachedFeatures` 三个类型只有值的类型不同。 | 加一个泛型 `type cacheEntry[V any] struct{v V; at time.Time}` 和 `func readThrough[K comparable, V any](c *requestCache, m *map[K]cacheEntry[V], k K, load func() (V, error)) (V, bool, error)`；config 用一个固定 key（或单独写一个小函数）。三个函数各缩到 3 行左右。 | 低 | 无 |
| K4 | `ccgateway/config.go:744`，`config.go:642` | 真问题 / 解耦 | ① `save` 把非校验、非冲突的错误（存储、加密）一律报成 400 `invalid_argument`，但它们其实是服务端故障。② `admitSavedCLIVersion` 自己调 `httpapi.Fail` 写响应，返回 `(string, bool)`；`Load` 失败时它直接放行，结果到事务里版本一变，`mergeStored` 就报 `config_changed`，原因说错了。 | ① 兜底分支改为 `core.ErrUnavailable`（或直接 `httpapi.Fail(c, e)` 交给 Fail 当内部错误记日志）。② 改成 `admitSavedCLIVersion(ctx, in) (string, error)`，不碰 `gin.Context`；`Load` 失败时直接返回这个错误，由 `save` 统一调 Fail。 | 低 | 有：状态码和错误原因变得准确 |
| K5 | `ccgateway/cleanup.go:115`（被 `accounts.go:363` 调用） | 解耦 / 简洁 | `purgeAndRecord` 在函数里面提交了 `Reconcile` 打开的事务，调用方看不出来；提交之后的 `markBlocked` 也没用，因为下一次 `desiredIn` 读到 `Purged` 就直接返回，`runtimeKeys` 也已经排除了 purged 的行。 | 把它拆成 `s.purgeRuntime` 和 `recordPurged(ctx, tx, key, id) error`（只执行 UPDATE），`tx.Commit` 放回 `Reconcile` 里显式写；删掉这里的 `markBlocked`。 | 低 | 无 |
| K6 | `account/service.go:211`，`account/purge.go:111`，`ccgateway/request_cache.go:335` | 复用 / 解耦（含小问题） | `account:changed` 的消息组装和发布写了三份（`{"account_id":id}` 两次，`purge` 一次）；本节点直接失效也只有 `changed()` 做了，`purged()` 没调 CCGateway 的本地失效，只能等总线投回本节点或者 30 秒 TTL 过期。 | 在 core（或 account 包）加 `PublishAccountChanged(ctx, bus, id)`，消息 payload 只在一处组装；account 里抽一个 `notifyChanged(ctx, id)`，同时做 `invalidate`、`CCGateway.AccountChanged`（id 为 0 时走 `invalidateRequests(true)`）和发布，`changed` 和 `purged` 都调它；`workerChanged` 改用同一个发布函数。 | 低 | 有：插件清除后本节点的请求缓存立刻失效 |
| K7 | `ccgateway/accounts.go:686,768` | 简洁 / 抽象 | `runtimeAction` 返回 `(out, failure, done)` 三个值，`done=false` 且 `failure=nil` 只代表一种情况（旧镜像没有 session 接口），调用方得知道这层约定才能写 `if !done { OK(nil) }`。session 只能用 GET，本来就不会走记录审计的分支。 | 去掉 `done`，旧镜像的 session 返回 `(nil, nil)`；`serveRuntime` 直接 `httpapi.OK(c, out)`；把注释移到 `runtimeAction` 里 404 那一处。 | 低 | 无 |
| K8 | `gateway/helper_history_request.go:302` | 解耦 | gateway 拿 `cfg.EffectiveRequestPolicy()`（存储形态，含已经只存不发的 identity lines、unknown_field、betas 等）序列化后算 helper history 的 namespace。gateway 依赖了 ccgateway 的存储结构；改一个早已不生效的存储字段也会让 namespace 漂移；也没跟随 A1 改成线上实际发送的 `features.WorkerPolicy`。 | 在 ccgateway 加 `func (c Config) HelperHistoryPolicy() ([]byte, error)`，内容是 `json.Marshal(workerPolicy(c.EffectiveRequestPolicy()))`；gateway 只调这个方法。 | 中 | 有：namespace 会变一次，已有的 helper history 会失效，要配合发布说明 |
| K9 | `ccgateway/controller_install.go:202-340` | 低嵌套 / 简洁 | `controllerInstall` 拆过以后还有 139 行；`net.ParseIP(host)` 算了两次（`domain`，以及 `scheme=="https" && ParseIP!=nil`，其实就等于 `scheme=="https" && !domain`）；挑选 caddyfile 和第 5 步“保存连接”还在主函数里。 | `pinCA := scheme == "https" && !domain`；抽出 `installCaddyfile(scheme, host, port, email) (string, *core.Error)`；第 5 步抽成 `s.connectInstalled(ctx, uid, legacy, version, panel) (Config, *core.Error)`，把 fields 选择和 `updateConfigAt` 的回调都放进去。主函数可以降到 80 行左右。 | 低 | 无 |
| K10 | `account/handlers.go:1423-1493` | 低嵌套 / 简洁 | `delete` 涨到 70 行，事务回调里嵌了 retain 校验、多一次 `SELECT now()+make_interval` 查询、audit detail 组装。 | 抽出 `s.deletionOptions(ctx, tx, pk, typ, retain) (core.AccountDeletionOptions, error)`，把天数校验、resource 校验和计算 `RetainUntil` 都放进去；`retain_resources` 的解析抽成 `parseRetain(c) (bool, bool)`。也可以考虑让 `AccountDeletionOptions` 改成携带 `RetainDays`，由 SQL 直接算 `now()+make_interval`，省掉一次往返（这样要改 core 端口，可以暂缓）。 | 低 | 无 |
| K11 | `ccgateway/feature_policy_sanitize.go:25,44` | 复用 | `sanitizePolicy` 和 `sanitizeOverrides` 两个函数的结构完全一样（level、entrypoint、两个 `keepValid`、injection），只差 `string` 和 `*string`。 | 加 `dropInvalid(name string, v *string, valid func(string) error, dropped []string) []string`（空串不处理），两个函数分别传 `&p.Level` 和 `o.Level`（nil 时跳过）；或者让 `sanitizePolicy` 先转成 `FeatureOverrides` 再复用 `sanitizeOverrides`。 | 低 | 无 |
| K12 | `ccgateway/cleanup.go:137,236,272`，`accounts.go:155,518` | 复用 | “已删除账号、已 retired、未 purged，以及 purge_after 是否到期”这组 SQL 条件在 5 处各写一遍（`desiredIn`、`runtimeKeys`、`cleanupKeepKeys`、`retainedRuntimes`、`runtimePurge`），写法还略有不同（`COALESCE(r.purge_after,r.retired_at)` 和 `purge_after > now()`）。 | 定义常量 `sqlRetainedUntil = "COALESCE(r.purge_after, r.retired_at)"` 和 `sqlNotPurged = "r.purged_at IS NULL"` 拼进查询；或者在迁移里加一个视图 `ccgateway_retained_runtimes`。 | 低 | 无 |
| K13 | `ccgateway/helper_history.go:30`，`controller_tunnel.go:147,166` | 复用（含小问题） | `readBounded` 和 `newNoRedirectClient` 没有替换干净：`helper_history.go:30` 读了 4097 字节，却从不检查是否超过 4096，被截断的文档会被交去解码；两个隧道 client 自己写 `CheckRedirect` 并返回错误，而 local 路由用的 `newNoRedirectClient` 是把 3xx 当作普通响应返回，同一个 Worker 换一种传输方式结果就不同。 | `helper_history.go:30` 改用 `readBounded(res.Body, 4096)`；两个隧道 client 改用 `newNoRedirectClient(fixedTarget{...})`。如果确实要求遇到重定向就报错，就给 `newNoRedirectClient` 加一个选项，让两种传输方式一致。`usage.go:85` 需要截断语义，保持现状。 | 低 | 有（极小）：隧道上的 3xx 从传输错误变成普通响应 |
| K14 | `ccgateway/config.go:368,606` | 真问题（潜在） | `mergeFeatureGroups` 让 `c.CCFeatureGroups = old.CCFeatureGroups`，两边共用同一个 map，之后 `pruneFeatureGroups` 再 `delete`，`old` 也被改了。现在 featureChanged 在 prune 之前就算完了，所以暂时没有影响，但以后谁在 prune 之后比较 old 和 saved 都会出错。 | `mergeFeatureGroups` 里改成 `c.CCFeatureGroups = maps.Clone(old.CCFeatureGroups)`。 | 低 | 无 |
| K15 | `ccgateway/client.go:206,307-330` | 简洁 / 抽象 | `attachPolicy` 的失败路径先 `a.finish()`（里面已经 cancel 了），再 `a.refuse()`（又 cancel 一次）；第一个错误分支直接返回 `&outcome{err}`，没走 `fail`；几个出口各自决定由谁关连接和 ctx，不统一。 | 让 `refuse` 和 `fail` 在已经设置 `a.finish` 时调用 `a.finish()`，否则调 `a.cancel()`（抽成 `a.end()`），`attachPolicy` 里删掉手写的 `a.finish()`，三个出口都改为 `return a.fail(err)` 或 `return a.refuse(...)`。 | 低 | 无 |
| K16 | `ccgateway/feature_policy.go:424` | 简洁 | `workerPolicy` 里 `CLIVersion` 为空时用 `defaultRequestPolicy().CLIVersion` 补上：既为了一个常量构造整个默认策略（含 Betas），而且这个分支实际走不到，因为 `EffectiveRequestPolicy` 已经补成了 `PinnedCLIVersion`，各层覆盖也改不了 cli_version。 | 直接写 `PinnedCLIVersion`；如果确认没有测试传空值，就删掉这个分支。 | 低 | 无 |
| K17 | `ccgateway/errors.go:102` | 简洁 | `syncError` 的空码分支写成 `reasonError(..., "sync_failed").WithDetails({"reason":"sync_failed", ...})`，但 `WithDetails` 本来就是合并，reason 写了两遍；有码分支同样又写了一次 `"reason": code`。 | 两处的 `WithDetails` 只传 `{"status": status}`。 | 低 | 无 |
| K18 | `account/purge.go:18` | 简洁 | `deletionResource` 里有“`LifecycleResources` 没有、`pluginKey=="ccgateway"` 就回退到 `s.d.CCGateway`”的特判；生产环境 `app.go:216` 已经注册了，这个分支只有测试会走到。 | 删掉这个回退，在测试的 Deps 里补上 `LifecycleResources: {"ccgateway": ccg}`；account 包里少一处按插件名写的特判。 | 低 | 无（生产） |
| K19 | `ccgateway/cleanup.go:310` | 复用 | `runtimePurge` 手写 `c.JSON(202, gin.H{"data": ...})`，绕过了 httpapi 的响应封装。 | 在 `httpapi/respond.go` 加 `Accepted(c, data)`，这里改为调用它。 | 低 | 无 |
| K20 | `ccgateway/feature_policy.go:175` | 复用 | `sourceField("build_billing_sources", []string{"cc_version","cc_entrypoint"}, ...)` 是硬编码；2026-10-21 的审核（02-layers）已经指出过没有 `BuildBillingFields` 常量，测试 `feature_policy_matrix_test.go:35` 也重复写了这个列表。 | 在 `contracts/features` 加 `BuildBillingFields`（和 `BuildAttachmentFields` 对称），这里、`BuildBillingSources.Validate` 和测试都引用它。（需要改 contracts 包。） | 低 | 无 |
| K21 | `account/lifecycle_events.go:135` | 低嵌套 | “deleted 阶段的失败记下原因后吞掉”嵌在通用的错误处理里面，有三层 if，通用路径读起来费劲。 | 抽出 `deletedCleanupFailure(ctx, id, pluginKey, err) core.AccountSynchronization`，调用处写成 `if phase == "deleted" { state, err = deletedCleanupFailure(...), nil }`。 | 低 | 无 |

## 备注

- `layerField` 和 `scalarField`、`sourceField`、`injectionField` 把原来散落在 `ResolveFeaturePolicy`、`applyFeatureOverrides` 里的键清单和默认值收到了一处，可以接受。每个标量字段两个闭包有点重，但比原来四处重复要好，不建议再改。
- `attempt` 和 `outcome` 的拆法（返回 nil 表示继续）是合理的，问题只在出口不统一（K15）。
- `admitCLIVersion` 放在事务外、`mergeStored` 在事务内用 `admitted` 再核对一次，这个两段式本身没问题，只是 K4 提到的报错路径需要修。

## 处理结果（2026-10-24）

只改了 `next/server`，没有提交。每一条都先对着代码核实过，审核说得不对的地方在下表里直接写明。

| id | 结果 | 说明 |
|---|---|---|
| K1 | 已修 | `AccountPreparationAction` 改为调用 `runtimeActionPath` 和 `runtimeAction(…, draft=true, …)`，删掉了 `paths` 表以及重复的读取和解析；sync 和账号共用新抽出的 `syncFailure`。**审核有两处不准**：① `transportError` 遇到 `*core.Error` 会原样返回，所以控制器给的 reason 以前其实也保留了，真正不同的只是兜底（以前是 `runtime_unavailable`，现在和账号一样是 `sync_failed`）；② 草稿 status 的 phase 算法和 `serveStatus` 的草稿分支完全一样，并不是"算法不同"，所以也合并了：新增 `runtimeStatus`（读取并解析控制器的 status）和 `draftStatus`，`serveStatus` 和草稿动作共用。新测试 `TestPreparationSyncAndStatusMatchTheDraftEndpoints`。 |
| K2 | 已修（部分照做） | 新增 `deleteRuntime(ctx, key, notFoundRemoved, header...)`，`purgeRuntime` 和 `deleteRemote` 都调用它，404 的语义仍按各自原来的（purge 算失败，草稿或退役的算已删除）。purge 改走 `runtimeRequest`；生产环境下它和 `controllerCall` 走的是同一个 `s.open`。**审核说的"每轮 Reconcile 不用都打 `/health`"不照做**：purge 每个已删除账号只做一次（失败了才重试），不是每轮都做；这个能力检查防的是旧控制器删不掉数据卷却回 200、核心就把它记成已清除，所以保留在 `purgeRuntime` 里。 |
| K3 | 已修 | 泛型 `cacheEntry[V]` 加 `readThrough`；`requestConfig`、`requestDesired`、`requestAccountFeatures` 各缩成一行，三个 `cached*` 类型删掉了。配置也存在 map 里，用固定 key `configKey{}`；测试改用 `keptConfig(...)`。 |
| K4 | 已修（真问题） | ① `save` 的兜底分支直接 `httpapi.Fail(c, e)`，存储或加密失败变成 500 `internal` 并记日志（以前是 400 `invalid_argument`）。② `admitSavedCLIVersion(ctx, in) (string, error)` 不再碰 `gin.Context`；`Load` 失败时直接返回这个错误，不会再走到事务里被说成 `config_changed`。新测试 `TestSaveReportsStoredConfigFaults`：已存配置无法解密时，带或不带 cli_version 都返回 500。 |
| K5 | 已修 | `purgeAndRecord` 改为 `purgeDeleted`，只做清除和事务内的 UPDATE，`tx.Commit` 放回 `Reconcile` 里显式写；删掉了没用的 `markBlocked`（下次读到 `Purged` 就直接返回，`runtimeKeys` 也排除了已清除的行）。 |
| K6 | 已修（真问题） | `core.PublishAccountChanged(ctx, bus, id)` 统一组装 `{"account_id":id}`，`account.changed` 和 `ccgateway.workerChanged` 都用它。account 包新增 `invalidateNode(id)`（目录快照 + `CCGateway.AccountChanged`），`changed` 和 `purged` 都调用它；`AccountChanged(0)` 表示所有账号，等同于总线上不带 id 的消息（`invalidateRequests(true)`）。`purged` 的批量 payload（reason、plugin_key、count）保持不变。新测试 `TestPurgePluginAccountsDropsCCGatewayRequestCache`；确认过不加这个修复时该测试会失败。 |
| K7 | 已修 | 去掉了 `done`；旧镜像没有 session 接口时返回 `(nil, nil)`，注释移到 404 那一处。 |
| K8 | 跳过（需要发布决定） | 没有改。影响：namespace 的输入会从存储形态（含 identity lines、unknown_field、betas 等不再下发的字段）换成线上实际发送的 `WorkerPolicy`，所有账号的 helper history namespace 会变一次，已有的 helper history 全部失效、要重新建立；如果是多节点滚动升级，新旧节点算出的 namespace 不同，升级期间同一个会话可能在两个 namespace 之间来回。要做的话应当和一次核心发布一起做，并写进发布说明。 |
| K9 | 已修 | 合并成 `pinCA := scheme == "https" && !domain`（`ParseIP` 只算一次）；抽出 `installCaddyfile`、`installController`（旧流程里控制器已是最新且支持 tunnel 就跳过）和 `connectInstalled`（fields 的选择和 `updateConfigAt` 的回调都在里面）。`controllerInstall` 从 139 行降到 111 行；剩下的是一串线性步骤，每步各带一次 `Fail`，管理密钥那一段要返回四个值，就不再拆了。 |
| K10 | 已修 | 抽出 `parseRetain(c)` 和 `markResourcesDeleted(ctx, tx, id, pk, typ, retain) (*time.Time, error)`，天数校验、resource 校验、`RetainUntil` 的计算和 `MarkAccountDeleted` 都放在里面；`delete` 从 70 行降到 50 行。`AccountDeletionOptions` 改为携带 `RetainDays` 需要改 core 端口，按审核的建议暂缓。 |
| K11 | 已修 | 抽出 `invalid(name, v, valid, &dropped)`（处理标量）和 `sanitizeSources`（处理两张来源表和 injection），两个 sanitize 函数各剩 3 个调用。 |
| K12 | 已修 | `cleanup.go` 里定义 `sqlPendingPurge`、`sqlInRetention`、`sqlPurgeAt` 三个常量，`desiredIn`、`cleanupKeepKeys`、`retainedRuntimes`、`runtimePurge` 都引用它们（`cleanupKeepKeys` 的子查询补上了别名 r）。核对过两种写法语义一致：没有 purge_after 的行在两边都算到期。`runtimeKeys` 只有一个 `r.purged_at IS NULL` 条件，没有改；UPDATE 语句没有别名，保留原文。 |
| K13 | 部分修 | 两个隧道 client 改用 `newNoRedirectClient`，隧道和 local 路由对 3xx 的处理一致了（Worker 不会发重定向，实际没有影响）。**`helper_history.go:30` 审核说错了**：读 4097 字节正是为了让 `DecodeRequirement` 自己发现超长（它会拒绝超过 4096 字节的内容，并被归类为 `invalid_document`），被截断的文档不会被当成有效内容解码；改成 `readBounded` 反而会把这种情况变成未分类的错误，所以没有改。 |
| K14 | 已修 | 改成 `maps.Clone(old.CCFeatureGroups)`；`TestFeatureConfigRevisionAndOmission` 里加了断言：删除 saved 里的 key 不会影响 old。 |
| K15 | 已修 | 新增 `a.end()`：已经打开连接时调 `finish`，否则调 `cancel`。`fail` 和 `refuse` 都走它，`attachPolicy` 的三个出口统一写成 `return a.fail(...)` 或 `return a.refuse(...)`，不再手写 `a.finish()`。`send` 失败和 notSynchronized 的路径不变：前者要先关连接再决定是否保留 ctx，后者要保留 ctx 用于重试。 |
| K16 | 已修 | 删掉了这个分支，并加注释说明 cli_version 已由 `EffectiveRequestPolicy` 补上，各层也覆盖不了它。 |
| K17 | 已修 | 两处 `WithDetails` 都只传 `{"status": status}`。 |
| K18 | 已修 | 删掉按插件名写的回退；account 测试里的 `withCCGateway` 也像 `app.go` 一样把 ccg 注册进 `LifecycleResources`。account 包的测试全部通过。 |
| K19 | 已修 | 新增 `httpapi.Accepted`，`runtimePurge` 改为调用它。 |
| K20 | 跳过（不在本次范围） | 要改的是 `next/plugins/ccgateway/companions/contracts/features`，不属于这次的改动范围。需要的改动：在 `features` 里加 `BuildBillingFields = []string{"cc_version","cc_entrypoint"}`（和 `BuildAttachmentFields` 对称），`BuildBillingSources.Validate`、`feature_policy.go:175` 的 `sourceField` 和 `feature_policy_matrix_test.go:35` 都改为引用它。 |
| K21 | 已修 | 抽出 `deletedCleanupFailure`；调用处改成 `switch { case err == nil: case phase == "deleted": …; default: … }`，只有一层。 |

验证（`next/server`）：`go build ./...`、`go vet ./...`、`GOOS=linux go vet ./...` 都通过；改动过的文件 gofmt 无输出；staticcheck 只报了几处原有问题（`helper_history.go` 的 ST1005、`ownership_test.go` 的 ST1013），都不在本次改动的行里。`go test -count=1 ./internal/ccgateway/... ./internal/account/... ./internal/gateway/... ./internal/migrations/... ./internal/core/... ./internal/httpapi/...` 全部 ok。PG 测试用嵌入式测试库真实跑了，没有 SKIP；跳过的只有 9 个需要真实 CLI 或 Worker 可执行文件的集成测试（要设 `CCG_REAL_CLI` 等环境变量），本来就是按需运行的。

需要同步的契约文档（未改 `CONTRACTS.md`）：

- §53.20（`CONTRACTS.md` 约 4100 行，"保存配置"那一条）：原文"只有存储/加密失败才是笼统文案"改为"存储/加密失败，以及已存配置无法读取，为 500 `internal`（以前是 400 `invalid_argument`）；cli_version 校验前读不到已存配置时也报这个错误，不再出现 `config_changed`"。
- 账号准备的 sync 动作：失败时的 `details.reason` 和账号的 sync 一致：优先用控制器给的 reason，没有就是 `sync_failed`（not_configured 情形不变）；以前兜底是 `runtime_unavailable`。准备动作里 health/session 的结果解析失败，现在统一报 503 `runtime_unavailable`（以前可能是 500）。
- 隧道路由遇到 Worker 的 3xx，现在作为普通响应返回，不再是传输错误；如果契约写过"隧道禁止重定向"，要改成"不跟随重定向"。
