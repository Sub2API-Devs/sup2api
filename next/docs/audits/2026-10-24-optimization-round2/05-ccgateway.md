# CCGateway 栈优化计划（第二轮：抽象、复用、解耦、低嵌套、简洁）

范围：`next/plugins/ccgateway`（插件 Go）、`companions/engine`、`companions/worker`、`companions/contracts`、`companions/controller`（Python）、`companions/cli-mods`（JS）、`next/server/internal/ccgateway`（核心）。

上一轮（`2026-10-24-code-quality`，审 `f546fa31a..839d1c22e`）只看新增/重写的代码；这一轮看老代码。数据来源：`/d/tmp/gometrics/all.tsv`（非测试函数，按行数/嵌套排序）、`deadcode`、`staticcheck -checks U1000,S1000,S1002,S1023,ST1005`，以及人工阅读。

当前发布：core 0.1.185 / plugin 0.1.86；仓库 manifest 已是 0.1.87（未发布）。发布顺序仍是「先插件、后核心」，凡涉及核心↔Worker 线形的条目都在下文单独标注。

---

## 0. 六个开放项：能不能现在做

| 项 | 判定 | 理由与做法 |
|---|---|---|
| **W8** 删 `features.Catalog()` 与核心 `GET /system/ccgateway/features` | **可以现在做**（core + contracts 同一次改动，不需要插件发版） | 全仓确认：`next/web/src`、`next/sdk`、`next/e2e`、`next/tools` 均无调用；唯一使用者是核心 `features.go` 和 4 个核心测试。`Catalog()`/`CatalogVersion` 只被核心编译期引用，插件二进制（engine/worker）只用 `RequestRuntimeCatalog`，所以删除不产生任何线形风险。**建议保留路由**、把 `featuresGet` 改为返回 `features.RequestCatalog("request_build")`（W8 给的两个选项里较稳的一个：管理端 API 不消失，返回内容从 native 时代目录换成真实的 request 模式目录），再删 `Catalog`/`entry`/`CatalogVersion`，把 `BetaRules` 挪到 `features/betas.go`（核心默认策略仍用它）。需要同步：`features_test.go`（断言 `CatalogVersion` 的那条）、`flow_test.go`、`runtime_features_test.go`（`features.Catalog()` 当夹具 → `RequestRuntimeCatalog(nil)` 或 `RequestCatalog("request_build")`）、删 `TestNativeRuntimeCatalog`、contracts 的 `catalog_test.go`/`execution_catalog_test.go`；CONTRACTS 第 3934 行与 `docs/ccgateway-feature-support/ENVIRONMENT-RUNBOOK.md` 的「接口保留」说法要一并改写。 |
| **V2** 去掉控制台默认 `cli_version: '2.1.304'` | **可以现在做**（web + 契约夹具；无服务端行为变化） | `normalizeRequestPolicy` 改为只透传读到的值；`validRequestPolicy` 已允许缺省；核心 `mergeStoredPolicy` 对缺省保留已存值、`EffectiveRequestPolicy` 再补 `PinnedCLIVersion`，所以新配置也不会存空版本。步骤：改 `requestPolicy.ts` → `CCG_UPDATE_CONTRACT_FIXTURES=1` 重生成 `testdata/web-policy-payloads.json`（`global-legacy-direct`/`global-legacy-build` 两例的 body 会少 `cli_version`）→ 跑核心 `TestEditorPayloadsDecodeInTheCore`。`featureLayers.spec.ts:15` 的断言同步改。写者属 web（不在这份计划的四个写者内），夹具文件在 contracts 目录，需要和 contracts 写者同一个提交。 |
| **K10** `AccountDeletionOptions` 携带 `RetainDays` | **可以现在做**（core-only） | 端口只被 `account.Service` 和核心 `internal/ccgateway` 实现，插件不参与。改法：`RetainUntil *time.Time` → `RetainDays int`（0=立即）；`account/purge.go` 删掉 `SELECT now() + make_interval(days => $1)` 这一跳；`ccgateway/cleanup.go` 的 `MarkAccountDeleted` 直接用 `now() + make_interval(days => $2)`。**注意**：`account/handlers.go:1448` 的审计 detail 现在写 `retain_until`，要么让端口返回 `purge_after`（`UPDATE ... RETURNING purge_after`），要么改成写 `retain_days`（审计字段变化，仅内部）。推荐前者，审计不变。 |
| **V17** SDK `MaxRetentionDays` 注释/位置 | **可以现在做**（SDK 注释/常量位置；零风险） | `next/sdk/manifest/manifest.go:339-340`：把常量移到文件里常量集中的位置，或在 `AccountDeletion.RetentionDays` 的注释里写「1..MaxRetentionDays」。若以后采纳 V3 的 `Description`，在 `validate.go:826` 一并校验英文文本。 |
| **W14 ⑤** 删 `logFileKind` 的旧分类 | **部分可以现在做，`history` 要等** | 事实核对：`cli-*` 文件的生产写者（`runner.go` 的 `cli-stdout.jsonl`）在 `c9e54f679`（2026-10-12）删除；`upstream*` 只在测试里出现过；`history.json`/`history-prepared.jsonl` 直到 `9361e138f`（2026-10-24 04:48）才删除，而且 **当前线上 plugin 0.1.86 不含该提交，仍会写**。请求日志内容文件只保留 24h、摘要 7 天，所以：`cli-`、`upstream`（保留 `resource-` 前缀）可以立即删；`history` 分支至少等到 0.1.87 全量部署后 24h（保守按 7 天，即约 2026-10-31）再删。web 侧 `FILE_KINDS` 与 zh/en 的 `logViewer.kind.*` 要同步删 `cli`/`history`（`upstream` 保留，`resource-*` 仍归它）。 |
| **W20 ⑤** Worker 发布渠道自动检查 | **可以现在做**（plugin-only，无线形变化） | 生产 Worker 一律固定版本：`newPinnedCLIManagement` 把 `AutoUpdate` 置 false，所以 `autoUpdateCLI` 永远提前返回，`maintain` 里每 10 分钟的 `releases` ticker 只是空转。删 `autoUpdateCLI` 与该 ticker，保留 `check` 动作（控制台的「查看渠道版本」按钮仍能填 `latest_version`）；`auto_update` 字段继续原样回传（核心 `cliManagementState.valid()` 要求非 nil），不新增/不删除任何 wire 字段。控制台的「自动检查」开关本来只在 `!pinned_version` 时出现，生产看不到，可留到后续和 W15 一起清理。 |

---

## 1. 热点函数（非测试，按行数降序）

| 文件:行 | 函数 | 行数 | 深度 | 诊断（一句话） |
|---|---|---|---|---|
| `contracts/credits/events.go:13` | `MessageFromEvents` | 223 | 5 | 一个循环 + 一个大 switch 处理 7 类 SSE 事件与状态机；长度全来自事件种类，可按事件类型拆处理器，delta 的 `key`/`expected` 两个 map 还是每次 delta 现建。 |
| `engine/resource_identity_carrier.go:210` | `initializeResourceAuthorization` | 146 | 5 | 一段里三件事：起 CLI 进程并抽帧、帧状态机（control/auth_status/system/result）、收尾与凭据前后校验。 |
| `core/controller_uploads.go:220` | `uploadLoad` | 123 | 3 | 解析 → 调控制器 load → apply（改配置、切镜像、worker 报告、审计）三段落在一个 handler。 |
| `core/controller_install.go:202` | `controllerInstall` | 111 | 3 | 0–5 步安装流程、legacy/新键两条分支、失败出口重复 6 次 `reasonError(..., "install_failed")`。 |
| `engine/resource_identity_carrier.go:70` | `resourceAuthorizationSource` | 104 | 3 | 环境去重、settings 检查、三种来源取凭据、base URL 校验、指纹拼装挤在一起；base URL 校验与 `resource_carrier.go:148` 重复。 |
| `core/request_logs.go:241` | `decodeRequestLogState` | 95 | 4 | 同一份 raw 解两次（legacy 一次、levels 一次），字段边界校验与输出构造混排。 |
| `core/feature_policy_http.go:25` | `accountFeaturePreview` | 95 | 3 | GET/POST 两套入参解析、权限与存在性、组列表扫描、策略解析顺序堆叠。 |
| `plugins/.../availability.go:54` | `evaluateQuotaAvailability` | 94 | 3 | 扫窗口、选阻塞窗口、决定可用性三阶段线性；末尾 `authRefused` 分支重复。 |
| `engine/resource_http.go:63` | `resourceBroker.ServeHTTP` | 92 | 2 | 准入、路由解析、spool、身份验证、转发放一处；identity-only 提前返回夹在中间。 |
| `worker/internal/config/active_runtime.go:24` | `loadActiveRuntime` | 88 | 2 | 读 selection、读 manifest、校验 sha、维护租约四段；`read` 闭包带 IO。 |
| `engine/resource_carrier.go:121` | `resourceManagementHTTP` | 86 | 3 | 操作校验、origin 校验、请求构造、响应 spool 四段。 |
| `contracts/features/runtime.go:37` | `DecodeRuntimeCapabilities` | 85 | 4 | 一个函数对 catalog/modes/helper/probes/features 五组字段做边界校验，两个 helper 版本循环完全同构。 |
| `core/workers.go:190` | `updateWorkerWithOptions` | 85 | 2 | 请求构造、调用、应答校验（paired 字段逐个比对）混在一起。 |
| `core/workers.go:279` | `runtimeWorkers` | 82 | 3 | 手写严格 JSON 解码闭包 + 前置检查；解码与 `cli_management.go:68` 同构。 |
| `engine/auth.go:276` | `authManager.ServeHTTP` | 80 | 3 | 先 4 个 `if Path==` 分派，再 `switch method+path`，两套分派并存。 |
| `plugins/.../classify.go:71` | `ClassifyError` | 80 | 2 | 本地拒绝与上游状态码两大组平铺；分支顺序即语义。 |
| `contracts/resources/ptc_references.go:49` | `requestResourceCapabilities` | 77 | 5 | tools 扫描、messages 扫描、parents 映射维护、各类 server_tool_use/code_execution_* 判断全在一处。 |
| `engine/usage.go:191` | `usage` | 75 | 2 | 取 token、组请求、错误映射三段。 |
| `engine/auth_snapshot.go:83` | `localAuthSnapshot` | 75 | 2 | env / 凭据文件 / settings 三处来源收集并拼结果。 |
| `contracts/helperhistory/contract.go:54` | `Validate` | 72 | 5 | payload→segment→message 三层校验交织，v1/v2 分支嵌在循环里。 |
| `core/bundle_push.go:208` | `runtimeBundled` | 70 | 3 | 角色循环 + 每角色推送/切换 + 尾部 worker 更新/审计。 |
| `contracts/credits/prompt.go:115` | `ClaimForResponse` | 70 | 2 | 解析 token、校验 refusal、两种续写形态求 digest。 |
| `core/request_log_viewer.go:311` | `requestLogFile` | 69 | 2 | 查询参数校验、转发、响应头与流拷贝。 |
| `core/accounts.go:326` | `Reconcile` | 66 | 3 | 加锁、已删除/代理不可用分支、远端状态读、写配置。 |
| `engine/request_log.go:416/503/590` | `capture`/`request`/`finish` | 65/60/51 | 2–5 | 诊断对象三段生命周期方法各自很长；`request` 里 messages 摘要整段内联。 |
| `engine/request_log_viewer.go:416` | `logFileKind` | 20 | 1 | 含三档已无生产写者的分类（W14⑤）。 |
| `core/config.go:705` | `save` | 60 | 3 | 校验、事务、缓存失效、踢运行环境。 |
| `core/sweep.go:58` | `SweepDrafts` | 65 | 3 | 三段清理（expired/retired/orphans）里只有第一段内联。 |
| `engine/request_command.go:431` | `writeOutcome` | 51 | 3 | 取消/超时/已输出/协议错误四态判定，顺序本身是语义。 |
| `engine/proxy.go:72` | `validateProxy` | 57 | 4 | 模式、URL、host、label 字符集四层校验内联。 |
| `engine/request_identity.go:227` | `clientIdentityFields` | 50 | 3 | 三种载体（object/字符串内嵌 object/legacy 扁平）分支。 |
| `cli-mods/content-policy.js:369` | `mergeBillingAttribution` | 55 | 4 | 找头、算缺字段、生成原生头、落编辑四段。 |
| `cli-mods/direct-billing.js:66` | `applyDirectBilling` | 56 | 3 | string-system 与 array-system 两条完整路径 + 无 system 的插入。 |
| `cli-mods/model-request.js:37` | `openModelRequest` | 57 | 3 | 客户端创建、fetchOverride、错误响应克隆、流读取器装配。 |
| `cli-mods/request-command.js:41` | `runRequestCommand` | 58 | 2 | 纯编排（options→prepare→open→stream），可保留。 |
| `controller/upgrade.py:108` | `upgrade` | 68 | 2 | 备份/换名/起新/等健康/回滚；顺序即安全语义。 |
| `controller/offline_migrate_account.py:189` | `apply` | 69 | 2 | 运维脚本的分阶段提交（未进镜像）。 |
| `controller/network.py:94` | `configuration` | 50 | 2 | sing-box 配置组装（dns/inbounds/outbounds/route）。 |
| `controller/shared_integration.py:13`、`integration_test.py:74`、`runtime_migration_probe.py:86`、`shared_failure_test.py:15`、`offline_migration_probe.py:15` | `main` | 175/140/133/131/112 | 2 | 运维/验证脚本的 `main`，**不在镜像里**（见 §3），不建议拆。 |

Python 生产模块整体健康：`manager.py`（1127 行）最长函数 33 行（`delete`、`_provision`），`http_api.py` 最长 36 行；没有超过 70 行的生产函数（`upgrade`、`offline_migrate_account.apply` 除外）。cli-mods 没有超过 60 行的函数，长度集中在少量 40–60 行函数。

---

## 2. 优先计划（X1–X33）

优先级：P0 = 纯结构/复用、行为等价、建议本轮做；P1 = 需要小心对照或跨模块协调；P2 = 可延后。

### P0 — 合同与 engine（Go 插件侧）

**X1** — `contracts/credits/events.go:13` — 拆分 `MessageFromEvents`
- 模块：contracts。
- 做法：引入 `streamState{message map[string]any; blocks []any; open int; input, previous string; hasInput, ended, stopped bool}`，把 switch 的每个 case 变成 `(*streamState).onMessageStart/…/onContentBlockDelta/onMessageStop(event) error`；`fail()` 变成状态上的 `err` 返回；`key`/`expected` 两个 `map[string]string` 提为包级表（`deltaTextFields`、`deltaBlockTypes`）。
- 行为/线形：无。仍是同一套「不修复、不丢未知 delta」的判定，错误文本不变。
- 测试：`contracts/credits` 现有 events 测试 + `events_estimated_tokens_review_test.go`；逐 case 对照后再跑。
- 风险：**中**（状态机语义密集，必须逐分支对照，不允许顺手「优化」判定顺序）。

**X2** — `engine/resource_identity_carrier.go:210` — 拆 `initializeResourceAuthorization`
- 做法：`startVerificationCLI(ctx, cli, env, dir) (frames <-chan Object, done <-chan error, readErr *error, stop func())`（进程、pipe、扫描 goroutine、退出 goroutine 原样搬走）+ `awaitInitialization(ctx, frames, done, before, env, refreshing) (*resourceAuthorization, error)`；`stage` 变量随处理器走。
- 行为：无（30s 超时、25ms tick、错误文案与 `stage` 名称保持不变）。
- 测试：`resource_identity_carrier_test.go`、`resource_identity_test.go`、`resource_carrier_cli_test.go`。
- 风险：中（并发收尾依赖 defer 顺序，必须原样保留 `input.Close/cancel/output.Close/<-done` 的次序）。

**X3** — `engine/resource_identity_carrier.go:70` — 拆 `resourceAuthorizationSource`
- 做法：`credentialSources(env) ([]string, error)`（重复 env 检查、settings 注入检查、snapshot 来源数）、`readCredential(source, env) (*resourceAuthorization, error)`（三种来源）、`resourceSourceIdentity(env, auth)`（指纹）。base URL 校验改为调 X4 的 `firstPartyOrigin`。
- 行为：无。
- 测试：同 X2，重点 `resource_issuer_eligibility_test.go`、`auth_snapshot_test.go`。
- 风险：中（安全判定，任何条件都不能合并或放松）。

**X4** — engine 复用打包（4 处重复）
- `interactiveCLIArgs() []string`：`auth.go:153` 与 `resource_identity_carrier.go:225` 的 13 个参数一字不差。
- `cliUserAgent(version string) string`：`usage.go:218` 与 `resource_carrier.go:101` 的 `"claude-code/2.1.7"` 兜底重复。
- `firstPartyOrigin(env []string) (*url.URL, error)`：`resource_identity_carrier.go:155`（Bearer 来源只许 first-party）与 `resource_carrier.go:148`（管理 API origin）合成一个校验器，**保留两处不同的错误文案**。
- 删除 `resource_identity.go:32` 的 `resourceEnv` 别名（只是 `environmentValue` 的转发）。
- 行为/线形：无。
- 测试：`resource_identity_test.go`、`usage_test.go`、`proxy_failclosed_test.go`。
- 风险：低。

**X5** — `engine/resource_http.go:63` — 拆 `ServeHTTP`
- 做法：`admitResource(w, r) (route, identityOnly, cancel, ok)`（认证、identityOnly 判定、路由解析、大小上限）、`serveIdentityOnly(w, id)`、`runResourceRequest`（slot、authority 锁、上下文档位）。
- 行为：无。
- 测试：`resource_carrier_test.go`、`resource_carrier_cli_test.go`。
- 风险：低-中（defer 顺序：spool 关闭、锁释放、slot 归还必须与现在一致）。

**X6** — `engine/resource_carrier.go:121` — 拆 `resourceManagementHTTP`
- 做法：`validateResourceExchange(op)`（identity 特例 + `resources.ValidateOperation` + upload/content-type 一致性）、`resourceTarget(env, route) (*url.URL, error)`（origin + base path 段校验，用 X4）、`resourceRequestBody(op)`。
- 行为：无。错误文案保持逐字一致。
- 测试：`resource_carrier_test.go`、`contracts/resources` 的 operation 测试。
- 风险：低-中。

**X7** — `engine/auth.go:276` — 分派表化 + 复用进程脚手架
- 做法：`/admin/proxy|environment|request-logs|request-logs/|usage` 前缀分派改成有序表 `[]struct{ prefix string; exact bool; handle func()}`；`switch method+path` 保持（它带 method 语义）；`start()` 的进程创建改调 X2 的 `startVerificationCLI` 风格辅助（或抽 `startStreamJSONCLI`）。
- 行为：无。
- 测试：`auth_test.go`、`auth_snapshot_test.go`、`cli_pinned_test.go`。
- 风险：低。

**X8** — `engine/request_log.go`（876 行）文件级拆分 + 三个长方法
- 做法：拆成 `request_log_store.go`（`requestLogStore`：new/persist/prune/change/put/serve/describe/applyLevel/discard）、`request_log_diagnostic.go`（`requestDiagnostic`：capture/request/fail/finish/stopContent）、`request_log_prune.go`（`pruneRequestLogs`/`requestLogUsage`/`clearContent`/`safeHeaders`）；`request()` 里的 messages 摘要提 `messageSummaries(messages []any) ([]Object, bool)`；`capture()` 里建目录提 `startLogDirectory()`；`finish()` 里 metadata 落盘提 `writeMetadata()`。
- 行为：无（文件名与内容不变）。
- 测试：`request_log_test.go`、`request_log_levels_test.go`、`request_log_locks_test.go`、`request_log_viewer_test.go`。
- 风险：低（纯移动；注意 `d.lock()`/`s.mu` 的调用位置不能变）。

**X9** — `engine/usage.go:122/191`、`engine/proxy.go:72` — 小提取
- `parseProxyURL(raw) (*url.URL, bool)` 与 `scanProxyEnv(env) (raw string, invalid bool)`；`validateProxy` 里 host/label 校验提 `validProxyHost(host) string`（返回错误文案）。
- 行为：无。
- 测试：`usage_test.go`、`proxy_test.go`、`proxy_failclosed_test.go`。
- 风险：低。

**X10** — `worker/internal/config` — 拆 `loadActiveRuntime` 与 `Load`
- 做法：`readTrustedJSON(root, path string, out any) error`（读闭包）、`verifyManifestEntry(...)`、`applyMaintenanceLease(selection)`；`Load` 里的 `CCG_BIND` 解析提 `parseBind() (host string, port int, err error)`。
- 行为：无。
- 测试：`active_runtime_test.go`、`config_test.go`。
- 风险：低（安全校验原样搬，不能合并分支）。

**X11** — `contracts/features/runtime.go:37` — 拆 `DecodeRuntimeCapabilities`
- 做法：`validateEnvelope(raw)`、`validateCatalog(features []Feature)`、`validateUniqueRange(list []int, name string) error`（helper schema 与 payload 两个循环合一）、`validateProbes`、`validateModes`。
- 行为：无，错误文案保持。
- 测试：`features` 现有测试 + `next/server/.../runtime_features_test.go`。
- 风险：低-中（两个 helper 版本循环的错误文案不同：`oversized/invalid helper history capability` 与 `oversized/invalid helper payload capability`，合并后要按 name 生成）。

**X12** — `contracts/helperhistory/contract.go:54` — 拆 `Validate`
- 做法：`validateSegment(version int, s Segment, previous int) (int, error)`、`validateMessage(raw json.RawMessage, kind string, pairIndex int) (int, error)`。
- 行为：无。
- 测试：`helperhistory` 包内测试 + `engine/helper_history*_test.go`。
- 风险：低-中（pairIndex 的自增语义要保持）。

**X13** — `contracts/resources/ptc_references.go:49` — 拆扫描
- 做法：`scanTools(tools []any, outputs *bool)`、`scanBlock(block map[string]any, role string, parents map[string]bool, outputs *bool) error`、`pendingParents(parents)`。
- 行为：无。
- 测试：`resources` 包测试 + `engine` 的 ptc 相关夹具。
- 风险：低-中。

**X14** — `contracts/credits/prompt.go:115` — 拆 `ClaimForResponse`
- 做法：`claimFromDetails(details, object) (tokenHash, model string, prefill *bool, err error)`、`continuationDigests(source Object, messages, content []any, betas []string) ([]string, error)`。
- 行为：无。
- 测试：`contracts/credits` 现有测试（含 fallback credit 回归）。
- 风险：低-中。

### P1 — 插件 internal 与 core

**X15** — `plugins/ccgateway/internal/ccgateway` — `availability.go` + `classify.go`
- `evaluateQuotaAvailability`：拆 `scanWindows(snapshot) (windows map[string]*Window, invalid bool, shared, scoped *Window)`、`blockedWindow(shared, scoped)`、`finalState(...)`；删掉末尾重复的 `authRefused` 分支（语义相同，由 `out.Reason` 初值承担）。
- `ClassifyError`：保留 case 顺序，把本地分支收成 `classifyLocal(resp, code, source, localReason, msg, now, cooldown)`、429 上游分支已是 `classifyRateLimit`。
- 行为：无（配额/冷却判定不变）。
- 测试：`availability_test.go`、`classify_test.go`、`scoped_quota_test.go`。
- 风险：中（配额语义敏感，删除「重复分支」前要逐条比对 Reason/State/RetryAt 三个字段）。

**X16** — W8（contracts 半边）删除 native 目录
- 做法见 §0。`features/catalog.go` 只留 `Feature`/`Document` 类型（这两个类型被 `RequestCatalog`/`Wire` 用），删 `Catalog`、`entry`、`CatalogVersion`；`BetaRules` 移到 `features/betas.go`（核心 `request_policy.go:75` 继续用）。
- 行为：管理端 `GET /system/ccgateway/features` 的返回内容变化（若采纳「改返回 `RequestCatalog`」）。
- 测试：contracts `catalog_test.go`/`execution_catalog_test.go` 删除或改写；核心 4 个测试同步。
- 风险：低-中（只是 API 内容，无部署耦合）。

**X17** — W14⑤（engine）删除死分类
- 现在：`logFileKind` 删 `strings.HasPrefix(name, "cli-")` 与 `strings.HasPrefix(name, "upstream")`（**保留 `resource-`**），`response-meta.json` 也已不在日志目录（它写在请求临时目录），可一并删。
- 之后（约 2026-10-31）：删 `history` 分支；web `FILE_KINDS` 与 zh/en `logViewer.kind.cli/history` 同步删。
- 行为：≤7 天旧日志的分组标签变化（仅展示）。
- 测试：`request_log_viewer_test.go`（若断言 kind，需同步）。
- 风险：低。

**X18** — W20⑤（engine）删自动检查
- 做法：删 `autoUpdateCLI`、`maintain` 的 `releases` ticker（保留 1 分钟的 prune ticker）；`check`/`sync` 动作与 `/admin/cli` 字段不动。
- 行为：固定版本 Worker 完全无变化；非固定（开发）Worker 不再自动刷新 `latest_version`，只能手动 check。
- 测试：`cli_management_test.go`、`cli_pinned_test.go`（若有用例覆盖 ticker，一并删）。
- 风险：低。

**X19** — core W8 半边：`featuresGet` 改返回 `RequestCatalog("request_build")`（或删路由，按 §0 结论选一个）
- 测试：`features_test.go`（断言改成 `CatalogVersion` 来自 `RequestCatalog`，或整条删除）、`flow_test.go`、`runtime_features_test.go`、删 `TestNativeRuntimeCatalog`。
- 行为：管理端 API 内容变化。
- 风险：低。

**X20** — `core/controller_uploads.go:220` — 拆 `uploadLoad`
- 做法：`decodeLoadRequest(c) (loadInput, bool)`、`sanitizeLoadedImages(loaded) ([]loadedImage, string, bool)`、`applyLoadedImage(ctx, uid, role, ref) (*workersReport, *core.Error)`（config 更新 + 切换 + 尾部 2 分钟 ctx）。
- 行为：无。
- 测试：`controller_install_test.go`（load 路径）、`controller_uploads` 相关。
- 风险：低-中。

**X21** — `core/controller_install.go:202` — 拆 `controllerInstall`
- 做法：`resolveInstallPlan(in, cfg, version) (plan installPlan, *core.Error)`（legacy/新键、target、endpoint、domain/pinCA）、`runInstallSteps(ctx, plan)`（0–5 步，每步已基本是独立辅助）；把 6 处重复的 `httpapi.Fail(c, reasonError(core.ErrUnavailable, "install_failed"))` 收成 `s.failInstall(c, e)`。
- 行为：无。
- 测试：`controller_install_test.go`（1120 行，覆盖各步失败）。
- 风险：中（安装流程有顺序语义，只做提取，不改分支）。

**X22** — `core/request_logs.go:241` — 拆 `decodeRequestLogState`
- 做法：`decodeLegacyState(raw) (requestLogState, error)`、`decodeLevelState(raw, legacy) (requestLogLevelState, error)`、`validateLogLimits(...)`/`validateLogUsage(...)`。
- 行为：无（两次 Unmarshal 保留，或合并成一次 `map[string]RawMessage` 读取后分别解码——后者更省，但要保证未知字段仍被丢弃）。
- 测试：`request_logs_test.go`、`request_log_limits_test.go`。
- 风险：低-中。

**X23** — `core/feature_policy_http.go:25` — 拆 `accountFeaturePreview`
- 做法：`previewAuthorize(c, id) (scope, ok)`（权限键、EXISTS 查询）、`previewInput(c) (groupID int64, draft *AccountFeaturePolicy, ok bool)`（POST body / GET query）、`accountGroups(ctx, id, groupID) ([]featureGroupRef, bool)`。
- 行为：无。
- 测试：`feature_policy_test.go`、`feature_policy_matrix_test.go`。
- 风险：低。

**X24** — `core/workers.go` — 三处收敛
- 做法：`decodeStrictJSON(raw []byte, v any) error`（`workers.go:303` 与 `cli_management.go:68` 同构：null 检查 + DisallowUnknownFields + 尾随 JSON）；`workerAnswer` 结构 + `answerResult(answer, options, key) workerResult`；`runtimeKeysOf(list) []string`。
- 行为：无。
- 测试：`workers_test.go`、`cli_management_test.go`。
- 风险：低。

**X25** — core 的小提取（一批）
- `httpapi.NoStore(c)`：21 处 `c.Header("Cache-Control", "no-store")` → 一处实现。
- `s.installLock(c, ctx) (context.Context, func(), bool)`：6 处 `lockInstall` + 两种失败答复（`install_failed` / `install_in_progress`）。
- `detached(c, d) context.Context`：8 处 `context.WithTimeout(context.WithoutCancel(audit.Context(c)), d)`。
- `core/runtime.go:313` 拆 `installedFromScript(out) *installedRuntime`、`installedFromHealth(h) *installedRuntime`。
- `core/request_log_viewer.go:311` 拆 `parseFileQuery(c) (offset int64, download bool, ok bool)`、`copyLogChunk(...)`。
- 行为：无。
- 测试：各自 handler 现有测试。
- 风险：低。

**X26** — `core/sweep.go:58`、`core/bundle_push.go:208` — 拆分
- `SweepDrafts`：把 expired 查询 + 删除循环提 `removeExpiredDrafts(ctx) (int, error)`，与 `sweepRetired`/`sweepOrphans` 并列。
- `runtimeBundled`：角色循环提 `pushRolesAndSwitch(ctx, cfg, b, uid, wanted, current) ([]bundledResult, *workersReport, Config)`；`pushBundled` 的分块上传循环提 `uploadArchives(ctx, cfg, id, rc, img)`。
- 行为：无。
- 测试：`cleanup_test.go`（sweep 相关）、`bundle_test.go`、`worker_health_test.go`。
- 风险：低-中。

**X27** — K10：`AccountDeletionOptions` 改 `RetainDays`（见 §0）
- 模块：core（`internal/core/ports_account_lifecycle.go`、`internal/account/purge.go`+`handlers.go`、`internal/ccgateway/cleanup.go`、`cleanup_test.go`）。
- 行为：无外部线形；审计 `retain_until` 保留（端口返回 `purge_after`）。
- 测试：`cleanup_test.go`、`internal/account` 删除用例（需要 PG）。
- 风险：低-中（SQL 语义要一一对应；`make_interval(days => $n)` 与 Go 端 `AddDate` 的区别要写清）。

**X28** — V17：SDK 常量/注释（见 §0）
- 模块：`next/sdk/manifest`。行为/线形：无。测试：`sdk/manifest/check` 现有用例。风险：无。

### P2 — controller / cli-mods（收益小，排最后）

**X29** — `controller/upgrade.py:108` — 拆 `upgrade`
- `swapController(client, name, prev, image, env)`、`waitControllerHealthy(port, key, image, deadline)`、`restoreOnFailure(...)`；执行顺序与 `put_back_env()` 的调用点保持原样。
- 风险：中（回滚语义；需要 `test_upgrade.py` 全部通过）。

**X30** — `controller/network.py:94` — 拆 `configuration`
- `singboxDNS()`、`singboxInbounds(gateway_ip)`、`singboxRoute(out)`；字符串片段一字不改。
- 风险：低（有 `test_network.py`）。

**X31** — `cli-mods/content-policy.js:369` — 拆 `mergeBillingAttribution`
- `findBillingHeader(c, blocks)`、`neededBillingFields(target, replaced)`、`nativeBillingLine(c, policy, nativeBilling)`、`applyBillingEdits(...)`。
- 风险：中（字节级编辑；必须跑 `package.json` 的 171 个用例与 assembly replay）。

**X32** — `cli-mods/direct-billing.js` — 扫描器外置 + 拆分
- `skipWs/skipString/skipValue/members/elements` 移到 `raw-json.js`（新支持模块，需在 `patch-cli-2.1.304.cjs` 的 `supportInputs` 列表登记，否则安装时不会被改名安装）；`applyDirectBilling` 拆 `systemAsBlocks`、`insertSystem`、`arraySystemEdits`。
- 风险：中（锚点/安装列表改动会触发 patch 脚本的唯一性断言，需重跑 full assembly 测试）。

**X33** — `cli-mods/model-request.js:37` — 拆 `openModelRequest`
- `captureErrorResponse(response, entry)`、`sendOnce(client, options, entry)`；`close/readModelResponse` 不动。
- 风险：低-中。

---

## 3. 不要动的

1. **`engine/request_log.go` 的锁顺序与剪枝/预算算法**（W6/W9 已审）：`capture`/`finish`/`change`/`pruneFiles`/`buildIndex` 的 `s.mu → d.mu` 顺序、reserve/budget 计算、`clearFull` 的语义。X8 只许移动文件与提纯函数。
2. **`engine/resource_identity_carrier.go` 的安全判定条件**（`resourceBackendSupported`、env 重复拼写检查、settings 注入检查、OAuth first-party origin、指纹与 transition 校验）：只拆结构，不合并、不放松任何条件，错误文案逐字保留。
3. **`core/client.go` 的 `attempt` 状态机与 `request_cache` 失效链**（K15 已审）：`resolveRoute`/`resolveShared`/`notSynchronized`/`end()` 的关闭与重试语义。
4. **`engine/request_command.go:431 writeOutcome`**：取消/超时/已开始输出/协议错误的判定顺序是语义，不拆。
5. **`plugins/.../classify.go` 的 case 顺序与 `cooldown` 时长**：路由与计费语义，X15 只提函数不改顺序。
6. **`contracts/features/wire.go` 的 `WorkerPolicy` 线形与 `ParseWorkerPolicy`**：跨核心与 Worker 的合同，任何字段增删都要走 W15 那种双形状兼容，不属本轮。
7. **`contracts/credits/events.go` 的判定本身**：不修复不完整流、不丢未知 delta，X1 只搬代码。
8. **`cli-mods/native-environment-2.1.304.inc.js`、`patch-cli-2.1.304.cjs` 的锚点/edit 列表**：hash 绑定，只允许 X32 那种「新增一个支持模块并在 `supportInputs` 登记」的最小改动。
9. **`controller` 的容器生命周期与回滚顺序**（`manager.py delete/_deletion_plan`、`shared_egress.py migrate/_cut_over`、`upgrade.py` 的 rename/stop/restore 顺序）：只在完全覆盖的测试下做纯提取。
10. **`controller` 的运维/验证脚本**（`offline_migrate_account.py`、`offline_migration_probe.py`、`runtime_migration_probe.py`、`integration_test.py`、`shared_integration.py`、`shared_failure_test.py`、`migrate_egress.py`）：Dockerfile 不 COPY，不是生产代码，长 `main` 属正常。
11. **`worker` 的空目录与 `worker.exe`/`coverage.*`**：本机产物，`git` 已忽略，只清理不入库。
12. **`core/features.go` 路由本身**（若采纳 §0 的「保留路由、换返回」方案）与 `runtime_features.go` 的 `serveFeatures`（每账号能力查询）：后者是活的，不要与 W8 混在一起删。
13. **测试夹具 `contracts/testdata/*.json`**：只能由生成器（`CCG_UPDATE_CONTRACT_FIXTURES=1`）重写，不能手改。

---

## 4. 执行顺序（按写者）

依赖关系：X4 被 X3/X6 使用；X1–X14 全部是插件 Go 侧，互不依赖；X16/X19（W8）必须同一个提交；X17 与 web 的 `FILE_KINDS` 同批；X27 改端口签名，需 `next/server` 同一次编译。

### (a) Go 插件 / engine / worker / contracts（`next/plugins/ccgateway`、`companions/{contracts,engine,worker}`）

1. X1 events.go（最大收益，先做能立刻降低合同层复杂度）
2. X2 + X4 进程脚手架/复用（同一文件族，一起做）
3. X3 + X6 origin 校验复用
4. X5 resource_http、X7 auth 分派
5. X8 request_log 文件拆分
6. X9 usage/proxy 小提取
7. X10 worker config
8. X11 + X12 + X13 + X14 contracts 其余拆分
9. X15 插件 internal（availability/classify）
10. X16（与 core X19 同提交）、X17、X18
11. 验证：`go build ./...`、`go vet`、`GOOS=linux go vet`、`go test -count=1 ./...`（contracts / engine / worker / 插件四个模块），`staticcheck -checks U1000,...` 保持只有已知 4 处 ST1005。

### (b) 核心 `next/server/internal/ccgateway`（+ `internal/core`、`internal/account`、`next/sdk`）

1. X19（与 X16 同提交，紧跟插件之后发布）
2. X27 K10 端口（core 内三处 + 测试）
3. X22、X23（handler 拆分）
4. X20、X21（安装/上传流程）
5. X24、X25、X26（复用与小提取）
6. X28（SDK，可与任一提交并行）
7. 验证：`go build ./...`、`go vet`、`go test -count=1 ./internal/ccgateway ./internal/account ./internal/core`（PG 测试要真跑，`TEST_DATABASE_URL`），契约测试 `TestEditorPayloadsDecodeInTheCore` 与 `contract_fixture_test.go`。

### (c) controller（`companions/controller`）

1. X29 `upgrade.py`
2. X30 `network.py`
3. 验证：`python -m pytest`（190 用例），重点 `test_upgrade.py`、`test_network.py`、`test_tunnel.py`。

### (d) cli-mods（`companions/cli-mods`）

1. X33 `model-request.js`（最小）
2. X31 `content-policy.js`
3. X32 `direct-billing.js` + `raw-json.js` + `patch-cli-2.1.304.cjs` 的 `supportInputs` 登记（最后做，因为会动安装列表）
4. 验证：`npm test`（171 用例，0 跳过）、assembly replay/coverage、`profiles/linux-x64-2.1.304.json` 的模块哈希保持不变。

### 与 V2 的协调

V2 属 web 写者：改 `requestPolicy.ts` → 用 web 的 `contractFixtures.spec.ts` 重生成 `contracts/testdata/web-policy-payloads.json` → contracts 写者只需保证文件变化被提交 → core 写者跑契约测试。建议排在 (a) 的 X16 之后、任何插件发版之前（夹具变化不进插件二进制，但属于同一发布窗口）。

### 建议的发布切分

- **plugin 0.1.87**（已含 0.1.86 之后的全部修复）：X1–X18 中除 X16 外的全部；X16 取决于 core 提交。若想一次发版，把 X16/X19 放进同一提交、先发插件再发 core。
- **core 0.1.186**：X19–X28 + V2/V17（V2 的 web 部分另算）。
- **controller 与 cli-mods**：不随核心版本走，按各自打包流程单独发。

---

## 5. 验证清单（本轮通用）

- 四个 Go 模块：`go build ./...`、`go vet ./...`、`GOOS=linux go vet ./...`、`go test -count=1 ./...`（核心 PG 用例必须真连库，不允许静默跳过）。
- `staticcheck -checks U1000,S1000,S1002,S1023,ST1005`：engine 仍只有 4 处已知 ST1005；contracts 无输出。
- `deadcode`：contracts 无 main 包（不可用），worker 与插件入口无不可达函数。
- controller：`python -m pytest` 全绿。
- cli-mods：`npm test` 全绿；assembly replay 与 `profiles/linux-x64-2.1.304.json` 校验通过。
- web（V2/W14⑤ 涉及）：`npx vue-tsc --noEmit`、`npx vitest run`。
- 线形：本轮所有 P0 项均为零线形变化；只有 X16/X19（管理端 features 返回内容）、X17（旧日志分组标签）、X18（非固定版本 Worker 不再自动刷新 `latest_version`）、X27（审计内部字段可选）需要写进发布说明。

---

## 6. 处理结果（2026-10-24，写者：(a) Go 插件 / engine / worker / contracts）

范围：只改 `next/plugins/ccgateway/**` 与 `companions/{engine,worker,contracts}`。controller / cli-mods / core / web / sdk 均未触碰（X29–X33、X19–X28 不在本写者）。未提交、未推送。

### 6.1 已完成

| 项 | 状态 | 实际改动 |
|---|---|---|
| **X1** `credits/events.go` | 完成 | `MessageFromEvents` 从 223 行/深度 5 降为「拆帧 + 循环调 `apply`」；新增 `creditStream` 状态结构（`message/blocks/open/input/hasInput/ended/stopped`），六个事件处理器 `onMessageStart/onContentBlockStart/onContentBlockDelta/onContentBlockStop/onMessageDelta/onMessageStop`；delta 内部再分 `onStringDelta/onCitationDelta/onInputJSONDelta`。两个每次 delta 现建的 map 提为包级 `deltaTextFields`/`deltaBlockTypes`。统一错误 `errCreditStream`（`errors.New`，文本逐字不变），`fail()` 闭包消失。判定顺序、错误文案、`mergeCreditFacts` 语义均未改。 |
| **X2** `initializeResourceAuthorization` | 完成 | 拆为 `startVerificationCLI`（进程/pipe/两个 goroutine/退出）+ `awaitResourceInitialization`（原状态机，`stage` 变量随处理器走）+ `resourceInitializationFailure(stage)`。`verificationCLI` 结构持有 `input/output/writer/cancel/frames/done/processErr/readErr`；`stop()` 保留原 defer 顺序（stdin → cancel → output → `<-done` → writer）。30s 超时、25ms tick、stage 名与错误文本不变。 |
| **X3** `resourceAuthorizationSource` | 完成 | 拆为 `credentialSources(env)`（backend 支持、CLI helper/managed settings 拒绝、env 重复拼写、settings 注入、来源唯一性）、`readCredential(env, source)`（三种来源 + token 校验 + OAuth first-party base URL）、`resourceSourceIdentity(env, auth, token, refresh)`（指纹）。统一错误 `errUnverifiedResourceSource`。**所有安全条件与错误文本逐字保留**，只是顺序重排为同样的判定链条。 |
| **X4** engine 复用打包 | 完成 | 新增 `engine/cli_command.go`：`interactiveCLIArgs()`（auth.go 与 resource_identity_carrier.go 两份 13 参数合一）、`fallbackCLIVersion = "2.1.7"`、`cliUserAgent(version)`（usage.go 与 resource_carrier.go 两份 UA 兜底合一）。新增 `firstPartyOrigin(target *url.URL, basePath string) bool` 于 `resource_carrier.go`，同时服务「Bearer 来源只许 first-party」与「管理 API origin」两处（两处错误文案各自保留）。删除 `resource_identity.go` 的 `resourceEnv` 别名，全部改调 `environmentValue`（15 处）。 |
| **X5** `resourceBroker.ServeHTTP` | 完成 | 拆为 `admitResource`（认证、identityOnly、路由、大小上限）、`spoolInput`、`verifiedIdentity`、`serveResourceIdentity`、`dispatchResource`；`ServeHTTP` 只剩顺序编排。defer 顺序（input.Close → 锁 → slot → body.Close）与原来一致；大小上限检查仍在解析路由之后、spool 之前。 |
| **X6** `resourceManagementHTTP` | 完成 | 拆为 `validateResourceExchange(op)`（identity 特例 / `resources.ValidateOperation` / upload 与 payload 一致性 / multipart boundary）、`resourceTarget(env, route, auth)`（origin、base path 段校验、OAuth first-party、拼路径）、`resourceRequestBody(op)`（spool 读取与双层上限）。错误文案逐字保留。 |
| **X7** `authManager.ServeHTTP` | 完成 | 五个 `if Path==` 前缀分派改为有序表 `serveSubRoute`（`/admin/request-logs` 精确、`/admin/request-logs/` 前缀）；`method+path` switch 保持原样；`start()` 改用 `interactiveCLIArgs()`。 |
| **X8** `request_log.go`（876 行） | 完成 | 文件级拆为 `request_log_diagnostic.go`（`requestDiagnostic` + `diagnosticWriter` + capture/request/fail/finish）、`request_log_store.go`（`requestLogStore` + serve/put/applyLevel/clearFull/discard/describe）、`request_log_prune.go`（`pruneRequestLogs`/`requestLogUsage`/`clearContent`/`safeHeaders`/`removeLogPath`）。另提三个纯函数：`startLogDirectory(header)`（capture 内建目录段）、`messageSummaries(messages)`（request 内 messages 摘要，返回 `truncated`）、`writeMetadata()`（finish 内落盘段，返回 metadata 字节）。**锁顺序、reserve/budget、clearFull/discard 语义与调用点全部原样**。 |
| **X9** `usage.go` / `proxy.go` 小提取 | 完成 | `parseProxyURL(raw)`、`scanProxyEnv(env)` 从 `envProxy` 内的闭包提为包级函数；`validProxyHost(host) string`（返回错误文案）替换 `validateProxy` 内内联的 host/label 校验。 |
| **X10** `worker/internal/config` | 完成 | `loadActiveRuntime` 拆为 `activeRuntimeSelection.validate`、`readTrustedJSON(root, path, out)`、`verifyRuntimeManifestEntry(...)`、`applyMaintenanceLease(selection)`；选择/清单结构提为命名的 `activeRuntimeSelection`/`activeRuntimeManifest`/`activeRuntimeEntry`。`Load` 的 `CCG_BIND` 解析提为 `parseBind()`（默认端口提为 `defaultWorkerPort`）。所有校验分支与错误文本未变。 |
| **X11** `features.DecodeRuntimeCapabilities` | 完成 | 拆为 `rejectExplicitHelperPayload`、`validateEnvelope`、`validateModes`、`validateUniqueRange(list, name)`（两个 helper 版本循环合一，错误文案按 name 生成：`oversized/invalid helper history capability` 与 `helper payload` 两类逐字保留）、`validateProbes`、`validateCatalog`。 |
| **X12** `helperhistory.Validate` | 完成 | 拆为 `validateSegment(version, s, previous) (int, error)` 与 `validateMessage(raw, kind, pairIndex) (int, error)`；`pairIndex` 自增语义、system-only 的 `continue`（不推进 pairIndex）原样保留。 |
| **X13** `resources/ptc_references.go` | 完成 | 拆为 `scanTools`、`scanBlock(block, role, parents, outputs)`、`pendingParents(parents)`；三个 caller 错误文本（`programmatic server caller / programmatic caller / invalid execution parent ID / duplicate active execution parent`）逐字保留。 |
| **X14** `credits.ClaimForResponse` | 完成 | 拆为 `claimFromDetails(details, object)`（token/hash/refusal/model/prefill）与 `continuationDigests(source, messages, content, betas)`；digest 去重仍在调用方（两种 echo 形态）。 |
| **X15** 插件 internal `availability.go` / `classify.go` | 完成 | `evaluateQuotaAvailability` 拆为 `scanQuotaWindows`、`blockedWindow`、`finalQuotaState`；末尾重复的 `authRefused` 分支改为 `return`（Reason 已由初值承担，State/RetryAt 与改动前逐字段一致）。`ClassifyError` 的四个本地分支收为 `classifyLocal`，case 顺序（transport → local → billing → 401/403 → 429 → 529 → 5xx → 4xx）与 cooldown 时长未变。 |
| **X16**（W8 contracts 半边） | 完成 | `features/catalog.go` 只留 `Feature`/`Document` 类型与 `PolicySchemaVersion`；删除 `Catalog()`、`entry()`、`CatalogVersion` 常量。`BetaRules`/`BetaRule` 移到新文件 `features/betas.go`（内容逐字不变）。删除 `catalog_test.go`、`execution_catalog_test.go`、`cache_diagnostics_catalog_test.go`、`credit_mcp_catalog_test.go`、`helper_inline_catalog_test.go`；`TestBetaRulesAreIndependentAdmissionRules` 保留为 `betas_test.go`（`Catalog` 相关的 schema/独立值断言随 `Catalog` 一起删）。三个用 `Catalog()` 当夹具的测试改为 `RequestRuntimeCatalog(nil)`。 |
| **X17**（W14⑤ engine 半边） | 完成（保守） | `logFileKind` 删除 `cli-`、`upstream` 前缀与 `response-meta.json` 分类（**保留 `resource-`**）。`history` 分支按计划留到 0.1.87 全量部署 24h/7 天后（约 2026-10-31）再删——线上 0.1.86 仍会写 `history*`。 |
| **X18**（W20⑤ engine 半边） | 完成 | 删除 `autoUpdateCLI` 与 `maintain` 里的 10 分钟 `releases` ticker（保留 1 分钟 prune ticker）；`check`/`sync` 动作、`/admin/cli` 字段、`auto_update` 回传全部不动。 |

### 6.2 未做 / 需其他人完成

| 项 | 归属 | 说明 |
|---|---|---|
| **W8 核心半边（X19）** | server 写者 | 本写者在 contracts 侧已删 `Catalog()`/`CatalogVersion`。**`next/server` 当前工作树里 `internal/ccgateway/features.go` 已被改成 `features.RequestCatalog("request_build")`（另一 agent 的未提交改动），但 `git show HEAD:` 里仍是 `features.Catalog()`**。server 写者需确认这个改动被保留，并核对：`features_test.go`（已改为 `want := features.RequestCatalog("request_build")`，看起来已同步）、`flow_test.go:299`、`runtime_features_test.go:49` 已经用 `RequestRuntimeCatalog(nil)`（当前工作树里已同步）。删除 `Catalog` 后 HEAD 版核心会编译失败，所以 **contracts 的删除必须与核心 `featuresGet` 的改动同一次提交**；若 server 写者回退了 `features.go`，需要按 §0 的方案 B（保留路由、返回 `RequestCatalog`）重做。另需更新 `next/docs/CONTRACTS.md:3934` 与 `docs/ccgateway-feature-support/ENVIRONMENT-RUNBOOK.md:214`（「接口保留」的说法），本写者未改文档。 |
| **V17（X28）SDK `MaxRetentionDays`** | sdk / server 写者 | `next/sdk/manifest/manifest.go:337-340` 的 `MaxRetentionDays = 30` 仍紧跟 `AccountDeletion` 类型定义，没有说明 `RetentionDays` 的合法区间。建议：在 `AccountDeletion.RetentionDays` 的注释里写明「1..MaxRetentionDays」，或在 `validate.go` 对 `RetentionDays < 0 || > MaxRetentionDays` 报错。`next/sdk` 不在本写者模块内。 |
| **K10（X27）`AccountDeletionOptions`** | server 写者 | 端口定义在 `next/server/internal/core/ports_account_lifecycle.go:49-52`（`RetainUntil *time.Time`），实现是 `internal/account/purge.go` 与 `internal/ccgateway/cleanup.go`；**插件不参与**，所以本写者不改。按 §0：改为 `RetainDays int`，`purge.go` 去掉 `now() + make_interval(days => $1)` 一跳，`cleanup.go` 直接用 `now() + make_interval(days => $2)`；`account/handlers.go:1448` 的审计 `retain_until` 建议由端口返回 `purge_after`（`UPDATE ... RETURNING purge_after`）保持不变。`cleanup_test.go` 有两处 `AccountDeletionOptions` 构造需同步。 |
| **W20 worker 侧** | 本写者已核实 | `companions/worker` 里没有任何 release/channel 定时器（grep `Ticker|release|channel` 无生产命中），只有 engine 的 `maintain` 有 ticker，已在 X18 删除。worker 侧无需改动。 |
| X29–X33 | controller / cli-mods 写者 | 不在本写者范围，未触碰。 |

### 6.3 验证

四个模块（`next/plugins/ccgateway`、`companions`、`companions/contracts`、`companions/worker`）分别执行：

- `gofmt -l .`：无输出。
- `go build ./...`：通过。
- `go vet ./...` 与 `GOOS=linux go vet ./...`：通过。
- `go test -count=1 ./...`：全绿（plugin 2 包、engine 1 包 24.5s、contracts 7 包、worker 3 包；无跳过）。
- `staticcheck -checks U1000,S1000,S1002,S1023,ST1005`：plugin / contracts / worker 无输出；engine 仍只有已知 4 处 ST1005（`cli_check.go:65`、`cli_management.go:206`、`runner.go:30,61`），与改动前一致。
- `deadcode`：engine 模块 `deadcode: no main packages`（不可用）；worker 0 条；plugin 二进制仍是 43 条，全部落在 `contracts/features` 的公共 API（被核心或插件反射式使用，逐条与改动前相同，**engine 无新增不可达函数**）。

跨模块检查：`next/server` `go build ./...` 与 `go vet ./internal/ccgateway/` 通过（contracts 删除未破坏核心），`go test -run 'TestFeatureCatalog|TestRuntimeCapabilities' ./internal/ccgateway/` 通过；`GOOS=linux go build` 覆盖 `plugins/ccgateway/...` + `companions/...` + `server/...` 通过。

线形影响（需写进发布说明）：X16 使 contracts 少了一个导出 `Catalog`/`CatalogVersion`（仅核心编译期使用，插件二进制不受影响）；X17 只改旧日志文件的 `kind` 标签（`cli`/`upstream` 归一为 `other`/`upstream`），X18 只影响非固定版本 Worker 的自动 `latest_version` 刷新。其余各项均为零线形变化。

---

## 7. 处理结果（2026-10-24，写者：(c) controller / (d) cli-mods）

范围：只改 `next/plugins/ccgateway/companions/controller/**` 与 `next/plugins/ccgateway/companions/cli-mods/**`（controller 的 `README.md` 未触碰）。Go 插件、核心、web、deploy 均未改。未提交、未推送。

### 7.1 controller（X29、X30）

**X29 长函数 / 深嵌套复查**：用临时 AST 脚本量了 13 个进镜像的生产模块（`Dockerfile` 的 `COPY` 列表）。改前只剩 `upgrade.py:upgrade` 一个 >60 行的函数（68 行），另有 `images.py` 的 `Uploads.write`（嵌套 5 层）与 `archive_tags`（嵌套 5 层，含内嵌 `document()`）超出「>4」的口径；`Uploads.load` 与 `shared_egress` 的 `configure`/`collect`/`_prepare`/`recover` 是 4 层，在阈值内。

| 位置 | 改法 | 行为 |
|---|---|---|
| `upgrade.py` `upgrade` 68 行 | 提为 `prepare_environment(env_file, image, name, port)`（读文件、`with_image`、解析并校验 root/key/port，返回原文本/新文本/env/root/port）、`swap_controller(client, name, prev)`（残余 `-prev` 先并回、删旧 `-prev`、把当前 `<name>` 改名；**不 stop**）、`start_controller(client, image, prev, name, env, root)`（stop 旧的 `-prev` + `containers.run` 原参数）、`wait_controller_healthy(...)`（原来的 deadline 循环）。`upgrade()` 只剩「校验 → 写 env → swap → start+wait → 失败回滚/成功删 `-prev`」的编排，约 30 行。 | 不变。rename/stop/run 的顺序、两处 `put_back_env` 的时机、`install_failed`/`controller_unhealthy`/`invalid_request` 与 `restored`/`removed`/`restore_failed` 全部逐字保留；`test_upgrade.py` 的容器调用序列断言（`rename→stop→run`、残余 `-prev` 先删、中断恢复）原样通过。 |
| `images.py` `Uploads.write` 嵌套 5 | 提 `_copy(part, length, reader, offset)`（原来的分块循环 + 早结束 `400 invalid_request` + `truncate(offset)` 回卷）；`write` 只留校验与调用。 | 不变（写入完整或全不写、回卷位置仍是 chunk 起点）。 |
| `images.py` `archive_tags` 嵌套 5 | 内嵌 `document(name)` 提为模块级 `_archive_member(archive, name)`（`getmember` 的 `KeyError`、非普通文件/超过 1 MiB 还是 `None`）。 | 不变（`manifest.json`/`index.json` 任一个不可读仍是 `{}`）。 |
| `images.py` `Uploads.load` | 顺带提 `_digest(path)`、`Uploads._load(part)`（daemon 调用的异常映射）、`_names(tags, image)`；`load` 的三段顺序与 `finally: _remove` 保持。 | 不变（`checksum_mismatch`/`load_failed`/`incomplete` 与 tags 回退规则不变）。 |

剩下的 `shared_egress` 4 层函数（`configure`/`collect`/`_prepare`/`recover`）按 X29 的口径（>4 才动）保留；它们各自的 `with self.lock` + `try/except` 已经是必要结构，再拆只会把「锁内顺序」藏进更多层。

**X30 跨模块重复**：上一轮 P1–P19 之后还剩这几处，全部收进 `common.py`（`common` 不 import 任何 controller 模块，仍无环）：

| 重复 | 收敛 |
|---|---|
| `log.warning(... type(e).__name__, str(e)[:300])` 在 `cleanup`(2)、`manager`(1)、`shared_egress`(2)、`worker_update`(2) 共 7 处 | `common.failure_text(exc)`（`类型: 前 300 字`）；日志文字逐字不变。 |
| `desired.get('image') if isinstance(...) and set(desired)=={'image'} else None; if not valid_image(ref): raise BadRequest('invalid image reference')`（`runtime_admin.upgrade_controller`、`worker_update.update_worker`） | `common.single_image(desired)`；错误码与文本不变。 |
| `client.containers.get(name)` + `except NotFound: None`（`upgrade.py`、`manager._shared_gateway_id`，`runtime_admin` 里包在 suppress 里的同一写法） | `common.container(client, name)`；`upgrade.py` 删掉自己的同名副本。 |
| `str(ipaddress.IPv4Address(x))`（`network.configuration`/`business_rules`、`shared_egress.firewall`） | `common.ipv4(value)`（`ValueError` 语义不变；地址仍是先规范化再进 nft/路由规则）。 |
| `[0-9a-f]{64}` / `sha256:[0-9a-f]{64}` / 22 位 upload id 三个正则各写两份（`images.py` 自己一份、`common.py` 一份；`http_api.UPLOAD_ROUTE` 再硬编码一次 22 位） | `images.py` 改用 `common.SHA256_HEX`/`IMAGE_ID`，并把 `UPLOAD_ID_PATTERN` 导出给 `http_api.UPLOAD_ROUTE`。 |
| `json.loads((dir/'sing-box.json').read_text())`（`manager._egress` 的 reuse 判断、`_pinned_address`） | `Manager._singbox(aid)`：读不到/损坏返回 `None`（原先一处 suppress、一处靠调用方的 suppress，等价）。 |
| `state.update(egress_backend=LEGACY, gateway_ip=state['legacy_gateway_ip'], revision=''); resolv; save`（`shared_egress._back_while_stopped`、`_failed` 的回滚段） | `SharedEgress._switch_to_legacy(aid, state)`；写盘顺序与内容不变。 |

`network.py` 的 `configuration`（原 50 行，imports 无变化）按 X30 拆为 `singbox_dns(with_detour)`、`singbox_inbounds(gateway_ip)`、`singbox_route()`、`singbox_config(out, gateway_ip)`；`configuration` 只留「direct/proxy 两种 outbound + egress 明细 + nft 表」。**nft 与 sing-box 的字符串片段一字未改**（direct 的 `detour` 仍只在 proxy 为空时省略，代理配置的 `detour` 与 `tls` 不变）。

### 7.2 W14⑤（日志分类清理）核对与文档化

结论：**清理/剪枝代码与 `logFileKind` 完全无关，删分类不会误删任何新文件**；`history` 仍需等。

- 核对 `engine/request_log_prune.go`（上一轮 X8 拆分后的位置）：`pruneRequestLogs`/`requestLogUsage`/`clearContent` 只认两件事——文件是否在 `summaryFiles`（`metadata.json`、`events.jsonl`、`request-headers.json`、`response-headers.json`），以及目录/文件的 mtime 与预算。**没有任何按文件名前缀（`cli-`/`upstream`/`history`/`resource-`）删除的分支**，`logFileKind` 只被浏览器的 `files[]` 列表用来给 `kind` 标签。
- 工作树里 `logFileKind` 已（由 (a) 写者，X17）删掉 `cli-`、`upstream`、`response-meta.json` 三档，**保留 `resource-` 与 `history`**；`history` 分支等 0.1.87 全量部署后 24h（保守按 7 天，约 **2026-10-31**）再删。
- 事实核对：`cli-stdout.jsonl` 的写者在 `c9e54f679`（2026-10-12）删除；`upstream*` 只在测试里出现；`history.json`/`history-prepared.jsonl` 的写者随 `9361e138f`（2026-10-24 04:48）删除，而该提交**不是** `24c316eee`（0.1.86）的祖先——线上 0.1.86 仍会写，`24c316eee` 之前的 Worker 也一样。
- web 侧 `requestLogViewer.ts` 的 `FILE_KINDS` 仍是 `['request','build','history','cli','upstream','response','other']`，属 web 写者；等 `history` 分支一起删（`upstream` 保留，`resource-*` 仍归它）。

### 7.3 cli-mods（X31、X32、X33）

| 项 | 结果 | 说明 |
|---|---|---|
| **X31 死代码** | 无，另删一个残留声明 | 用临时脚本扫了全部支持模块：没有「导出但无人 import」的名字，也没有未使用的 import/私有声明。唯一残留是 `native-tools.d.ts`——它声明的是 2.1.296 时期 Mod 宿主 `$.tool.register` 的扩展示例（`NativeToolAPI.register`），J1 删掉整条 Mod 工具链后已无任何引用（全仓 grep 0 命中），本次删除。 |
| **X32 `runRequestCommand`** | 拆完，58 → 44 行 | 提 `installListeners(controller, run)`/`removeListeners(listeners)`（SIGINT/SIGTERM/stdout error，`interrupted`/`outputError`/`timedOut` 放进 `run` 对象）、`readRequest(state, options, signal, controller, run, { apiKey, natives })`（读输入、解析、`checkModelRequest`、启动总 deadline、`prepareOutgoing`）。主函数只剩「help → meta 清理 → 读入 → 发送 → 2 或 0 → 错误帧」，`apiKey` 仍在删除 `ANTHROPIC_CUSTOM_HEADERS` 前取出、`finally` 里恢复。 |
| **X33（其他 JS 项）** | 三项都做 | ① `content-policy.js`：`mergeBillingAttribution` 55 → 31 行，拆 `findBillingHeader`（扫块找头 + 多头的 conflict）、`nativeHeader`（native 行 + 按策略替换 `cc_entrypoint`）、`applyBillingFields`（替换/追加缺失字段）。② `direct-billing.js`：`applyDirectBilling` 56 → 26 行，拆 `systemAsBlocks`、`billingItems`、`insertSystem`、`arraySystemEdits`（后者的 pending/order 语义原样）。③ 计划 X32 的「扫描器外置」照做：`skipWs`/`skipString`/`skipValue`/`members`/`elements`/`member` 移到新支持模块 `raw-json.js`，并在 `profiles/linux-x64-2.1.304.json` 的 `supportModules` 登记（补丁器与 `test/support.mjs` 共用这份清单）。`model-request.js`：`openModelRequest` 57 行拆 `openEntry`、`captureErrorResponse`、`sendOnce`。 |

出口等价性（改动含字节级编辑，逐项对拍）：

- `applyDirectBilling`：旧实现（HEAD）与新实现并排跑了 198 组（11 种 body × 3 种 nativeBill（正常/空/null）× 3 种策略 × 2 种 entrypoint 来源），返回值与抛出的 `message|status|code` **全部相同**。
- `content-policy` 的计费半边：`mergeBillingAttribution` 10 种 system × 4 种策略 × 4 种 native 共 160 组，加上 `billingEntrypoint`/`leadingBilling`/`requestBilling`/`hasBilling` 各 10 组，返回值、diagnostic 序列与错误 **全部相同**。
- 补丁产物：用 HEAD 版 cli-mods 与改后版各跑一次 `patch-cli.cjs`，`cli.js` 与 7 个被改写的原生 chunk **逐字节相同**（哈希逐一比对）；差异只在 4 个支持模块（`content-policy`/`direct-billing`/`model-request`/`request-command`）与新增的 `ccgateway-raw-json.js`。
- `npm test`：**171 通过、0 失败、0 跳过**（含 `patch-wire-preservation-304`、assembly replay、契约夹具）。`profiles/linux-x64-2.1.304.json` 的 `modules`（原生模块哈希）未变，只增加了 `supportModules` 里的 `raw-json`。

**v23 原地重编**（ELF 未发布，补丁标签仍 `ccgateway-v23-bound-imports`）：

1. `node patch-cli.cjs artifacts/claude-2.1.304/linux-restored artifacts/claude-2.1.304/patched-v23`（先清空输出目录）；
2. 在 `patched-v23` 里 `bun build cli.js src/plugins/functionHooks/hooks-worker/hooks-worker.js --compile --target=bun-linux-x64 --outfile ../claude-linux-v23-bun143`（Bun 1.4.3，两个入口都给）；
3. `node package-release.cjs artifacts/claude-2.1.304/claude-linux-v23-bun143 artifacts/claude-2.1.304/patched-v23/ccgateway-patch.json artifacts/claude-2.1.304/release-v23`。

新 ELF SHA-256：**`558d7b314d44ec6a695c7c463d4cf1e79ed315fca23c5c70e44bea368d675b5c`**（旧 `df6e562b…94ea`）。`cli-mods/README.md` 的版本行与 v23 记录已同步。

### 7.4 验证

- controller：13 个生产模块 `py_compile` 全过；`pyflakes` 无告警；`uv run --no-project --with-requirements requirements.txt python run_ctl_tests.py . test_cleanup test_cli_profiles test_headers test_manager test_network test_runtime test_runtime_updates test_shared_egress test_tunnel test_upgrade test_uploads test_worker` → **190 通过、0 失败、0 跳过**（`test_upgrade`/`test_network`/`test_uploads` 全绿）。
- 复查后的脚本结果：生产模块里**没有 >60 行的函数**；嵌套 >4 的只剩 `Proxy.handle`（`integration_test.py`，不进镜像，§3 第 10 条不动）。
- cli-mods：`npm test` → **171 通过、0 跳过**（见 7.3）。

### 7.5 需要别人跟进的

- (a) 写者的 X17 已把 `history` 分支留下；**2026-10-31 之后**删 `logFileKind` 的 `history` 分支时，web 的 `FILE_KINDS` 与 zh/en `logViewer.kind.history` 要同步（web 写者），逻辑见 7.2。
- `next/docs/audits/2026-10-23-ccgateway/99-FINAL.md:126` 里的 v23 ELF sha（`df6e562b…94ea`）需要改成 `558d7b31…5b5c`（文档写者）。
- 发布时把 `artifacts/claude-2.1.304/release-v23/` 替换 `cli-mods/release/`（release 目录不进 Git）。

---

## 8. 处理结果（2026-10-24，写者：核心 `next/server`，X19–X28 中标记 core 的项）

范围：`next/server/internal/ccgateway/**`（X19–X27）、`internal/core`、`internal/account`（X27）。`next/sdk` 不在本写者模块内（X28 未做）。未提交、未推送。

分两次写：X19–X23、X25–X27 是第一次；X24 的剩余两项（`workerAnswer`/`runtimeKeysOf`）与 §8.1.1 的 SA4006 修复是交接后的第二次，第八节的验证结果也是第二次的完整跑。需要发布决策的 K8、W15、V2 按计划跳过（§0 已把 V2 判为 web 写者负责；K8/W15 属线形/插件侧，不在本写者范围）。

### 8.1 已完成

| 项 | 状态 | 实际改动与说明 |
|---|---|---|
| **X19**（W8 核心半边） | 完成 | `internal/ccgateway/features.go` 的 `featuresGet` 改为 `httpapi.OK(c, features.RequestCatalog("request_build"))`（§0 推荐的「保留路由、换返回」方案，管理端 API 不消失）。`features_test.go` 改为与 `RequestCatalog("request_build")` 比对（不再引用 `CatalogVersion`）；`flow_test.go:299`、`runtime_features_test.go:49` 的 `Catalog: features.Catalog()` 夹具改为 `features.RequestRuntimeCatalog(nil)`；删除 `TestNativeRuntimeCatalog`。与 (a) 写者对 contracts 侧 `Catalog()`/`CatalogVersion` 的删除配套，`go build ./...` 与 `go test ./internal/ccgateway/` 均通过。 |
| **X20** `uploadLoad` 拆分 | 完成 | 拆为 `decodeLoadRequest`（body/role 校验）、`sanitizeLoadedImages`（ID/tag 上限与 `load_failed`）、`applyLoadedImage`（配置写入 + 切换 + worker 报告 + 2 分钟尾部预算，返回该预算的 context 与 cancel 供 handler 使用）。原 `if in.Apply` 分支顺序与错误文本未变。 |
| **X21** `controllerInstall` 拆分 | 完成 | `failInstall` 收敛 3 处 `install_failed`；`installDestination`（target + endpoint）、`installAdminKey`（legacy 保留/新建 key）、`installGatewayPlan`（domain/pinCA/端口/Caddyfile）；5 步安装顺序、失败出口与错误文本逐字保留；`installLock`（见 X25）。 |
| **X22** `decodeRequestLogState` 拆分 | 完成 | 拆为 `decodeLegacyState`、`decodeLevelState`（返回「是否有 levels」）、`validateLogLimits`、`validateLogTierLimits`、`validateLogUsage`。两次 `json.Unmarshal` 保留（未知字段仍被丢弃），错误文本逐字保留。 |
| **X23** `accountFeaturePreview` 拆分 | 完成 | 拆为 `previewAuthorize`（权限对 + EXISTS）、`previewInput`（POST body / GET query + draft 校验）、`accountGroups`（组列表 + 选中组必须存在）。GET/POST 的 404/400 语义不变。 |
| **X24** core 三处收敛 | 完成 | 新增 `decodeStrictJSON(raw, v)`（先 DisallowUnknownFields、再拒绝尾随 JSON），`runtimeWorkers` 与 `cliManagementBody` 共用；`runtimeWorkers` 的 null-body/null-field 检查保留在调用处。`workerAnswer` 结构（命名匿名 struct，json tag 不变）+ `pairedActivation(options)`/`result(key, options)` 收敛 `updateWorkerWithOptions` 的应答校验与字段回显；`runtimeKeysOf(list []remoteRuntime)` 收敛 `runtimeWorkers` 的去重/过滤循环（`make` 空切片代替 nil，仅内部使用、无序列化）。 |
| **X25** core 小提取 | 完成 | `httpapi.NoStore(c)` 取代本模块 21 处（并顺手替换 account/apikey/app 里同样的 6 处 `Cache-Control`）；`installLock(c, ctx)` 收敛 5 处（runtime/workers/bundle/controller uploads/controller install），`cleanup.go` 的 `core.ErrUnavailable` 答复与其余不同，保持原样；`detached(c, d)` 收敛 8 处 `context.WithTimeout(context.WithoutCancel(audit.Context(c)), …)`；`runtimeStateHealth` 拆出 `installedFromScript`/`applyHealthToInstalled`；`requestLogFile` 拆出 `parseFileQuery`、`parseLogChunkHeaders`、`copyLogChunk`。 |
| **X26** `SweepDrafts` / `runtimeBundled` | 完成 | `SweepDrafts` 的 expired 查询 + 删除循环提为 `removeExpiredDrafts`（与 `sweepRetired`/`sweepOrphans` 并列，首错与 ctx 语义保持）；`runtimeBundled` 的角色循环提为 `pushRolesAndSwitch`（返回 results/workers/cfg/switched）。计划里的 `uploadArchives` 未单独提取：`pushBundled` 的分块上传循环与它前面的 archive 读取/压缩是一个整体（共享 `hashes`/`img`/`rc`），再拆只会把这些参数打包成 struct，行数不变。 |
| **X27**（K10）`AccountDeletionOptions` | 完成 | 端口改为 `RetainDays int`，`MarkAccountDeleted` 现在返回 `(time.Time, error)`——即 `purge_after`（`UPDATE ... RETURNING purge_after`，立即删除时是 `now()`），这样 `account/handlers.go` 的审计 `retain_until` 字段**保持不变**且少一次 `SELECT now() + make_interval`。`account/purge.go` 删除那一跳；`ccgateway/cleanup.go` 直接用 `now() + make_interval(days => $2::int)`。`cleanup_test.go` 的两处构造改为保留天数（3 天 / 1 天 / 0）。`account` 与 `ccgateway` 的删除/保留用例（含审计 `retain_until` 断言）全绿。 |

### 8.1.1 顺手修掉的一处回归（X21 拆分的遗留）

`installAdminKey` 拆分时保留了 `(Config, []byte, Config, *core.Error)` 的旧返回形状，但调用处改成了 `cfg, version, target, failure = ...` 的原地赋值，而 `cfg` 此后不再被读取——`staticcheck` 报 `controller_install.go:301 SA4006: this value of cfg is never used`（HEAD 版本没有这条告警，属本轮引入）。改为入参 `cfg` 只读、返回 `([]byte, Config, *core.Error)`（去掉第一项 `cfg`），调用处同步为 `version, target, failure = ...`。行为不变：legacy 无 key 分支仍返回 `legacyControllerKey` 的 `cfg2`，它只是不再被赋回外层的 `cfg`。

### 8.2 未做（附理由）

| 项 | 理由 |
|---|---|
| **X28**（V17，SDK 常量/注释） | `next/sdk/manifest` 不在本写者模块内（另一写者负责），未动。 |
| X29–X33 | controller / cli-mods 写者负责，未触碰。 |
| 7.5 节的文档跟进项 | 文档写者负责，未改 `CONTRACTS.md` 与 runbook。 |

### 8.3 验证（第二轮：本写者交接后的最后一次完整跑，2026-10-24）

交接检查：先前写者留下的 `next/server` 工作树 `go build ./...` 与 `GOOS=linux go vet ./...` 均为空输出（未破坏编译）。

按顺序、每条命令各跑一次：

1. `go build ./...`：通过。
2. `GOOS=linux go vet ./...`：通过。
3. `gofmt -l`（`git diff HEAD` 中 `next/server` 的全部改动 `.go`）：无输出。
4. `staticcheck -checks 'all,-ST1000,-ST1003,-ST1005,-ST1020,-ST1021,-ST1022,-SA1019' ./...`（整个模块）：24 条，全部位于本轮未触碰的文件（`account/balance_claudeoauth.go` SA9003、`account/ownership_test.go` ST1013 ×2、`billing/helpers_test.go` U1000、`billing/prices.go` SA4006、`cluster/cluster_test.go` U1000、`iam/iam_test.go` SA4006、`plugin/grpcruntime/mock_test.go` U1000 ×14、`store/account_balance.go` ST1016），逐条 `git show HEAD:` 核对确认改动前已存在。**本轮新引入的 1 条（`ccgateway/controller_install.go` SA4006）已修**，见 §8.1.1；`./internal/ccgateway/` 单独跑无输出。
5. `go test -count=1 ./...`（整个模块，一次跑完）：**49 个包 ok，0 FAIL**（account 181.7s、ccgateway 194.7s、gateway 80.8s、usage 83.5s、grpcruntime 72.7s、billing 73.8s、rollout 66.2s、helperhistory 67.9s、migrations 57.1s、store 57.5s、install 54.9s、app 48.7s，其余 1–40s；7 个包 `no test files`）。

PG 用例真跑：`-v` 抽查 `TestDeletedRuntimePurgesDataAndRetriesFailure`（含 true/false 子例）、`TestRetainedDeletedRuntimeBlocksThenPurgesOnce`、`TestDeletedRuntimePurgedDespiteUnusableProxyAndLegacyMark`、`TestPurgeConflictNamesResourceInUse`、`TestRuntimePurgeEndsRetention`、`TestSweepRemovesAbandonedDrafts`、`TestDeleteRetainResources`、`TestPurgePluginAccountsMarksRuntimeCleanup`、`TestPurgePluginAccountsDropsCCGatewayRequestCache`、`TestPurgePluginAccounts`、`TestQuotaSweepBoundedAcrossNodes`——全部 `--- PASS`，0.86–4.33s，无 SKIP（唯一允许跳过的是 `CCG_REAL_CLI` 系列）。

### 8.4 行为变化

- **X19**：`GET /system/ccgateway/features` 返回内容从 native 时代目录变为 `request_build` 的请求模式目录（§0 已列为发布说明项）。
- **X27**：`AccountDeletionOptions.RetainUntil` → `RetainDays`（端口签名变化，仅 `account` 与核心 `ccgateway` 实现，插件不参与）；审计 `retain_until` 字段与含义不变。
- 其余：HTTP 响应结构、错误码/文案、SQL 语义均未变。

