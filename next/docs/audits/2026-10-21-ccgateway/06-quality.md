# 06 · CCGateway 代码规范与测试质量（横切审核）

- 审核日期：2026-10-21；分支 `feat/next-platform`，HEAD `43d576838`
- 审核员：audit-quality（只读；度量脚本与输出均在 `%TEMP%\ccg-audit-quality\`，未改动仓库源码）
- 范围：`next/plugins/ccgateway`（main.go、internal/ccgateway、manifest、forms）、`next/server/internal/ccgateway`、`next/web/src/views/ccgateway`、companions（engine、contracts、catalog、worker、controller、cli-mods、mod、egress、xray-egress）
- 工具：gocyclo 0.6、gocognit、dupl 1.1、staticcheck 0.8.2（2026.x）、deadcode（x/tools 0.51）、自写 go/ast 统计（函数长度/参数/嵌套/无断言测试）、radon（controller）、vitest、node --test、unittest
- 限制：本机 Windows，无 Docker/WSL；controller 有 9/15 个测试模块因 `import fcntl` 在 Windows 上无法导入；next/server 需要 PG 的测试按约定未跑（只单独跑了不需要 PG 的 `TestPortScript`）。

严重度：P0 阻断 / P1 真实缺陷 / P2 应尽快整改 / P3 改进项。置信度：高 / 中 / 低。

---

## 0. 结论摘要

1. **生产里跑不到的代码很多。** 把三个生产入口（`server/cmd/sub2api`、`plugins/ccgateway`、`companions/worker/cmd/worker`）合起来做 deadcode 分析，engine 有 **161 个函数、约 4.1k 行**（占 engine 函数总行数 22,970 的约 18%）从任何入口都调用不到，只有测试在调。另外，engine 的整条 "native" `/v1/messages` 执行链（`exchange.admit/session/execute`、原生历史、MCP/inline 时间线、2.1.288/2.1.292 工具目录等）在生产中**结构上不可达**：两个构造函数都把 `RequestMode` 强制设成 `build`，而 native 分支只在 `RequestMode == ""` 时才会走。把这条分支去掉再做 what-if 分析，还会多出约 119 个函数、约 2.8k 行死代码。复杂度最高的函数大多落在这些死路径上。
2. **策略契约漂移（P1 待确认）。** 核心保存、校验、下发 `thinking_disabled_compat`、`erase_client_attachments`、`replace_client_attachments`、`tool_search`、`custom_tool_prefix`、`unknown_field`，修改这些字段还会让 `FeatureRevision` 自增。但 engine 在 build/direct 模式下（生产只有这两种模式）用的是只有 6 个字段的 `buildRequestPolicy`，上面这些字段**一个都不会生效**。前端已经不展示这些设置，i18n 文案却还留着。按记忆，线上开过 `thinking_disabled_compat=omit`，在 build 模式下这个开关已经不起作用。
3. **同一份契约写了多份。** `RequestPolicy` 在核心、engine 各定义一份（engine 里实际还有两份），前端再一份；附件字段表有 4 份（Go contracts、cli-mods 两个 JS 文件、TS）；`validToolSearch` 与正则逐字重复；前端 Beta 列表与 `features.BetaRules()` 不一致；`"2.1.304"` 在核心硬编码了 6 处。
4. **CI 覆盖有缺口。** contracts 模块的 119 个测试、cli-mods 的 116 个 node 测试、engine 4 个 `.mjs` 测试中的 3 个、`install-locales.test.cjs`，以及整个 next/web（ccgateway 有 259 个 spec），**没有任何 workflow 在跑**。`ccgateway-images.yml` 只在 push 时触发，PR 上不触发。
5. **测试数量多，但默认环境下约 17% 被跳过。** companions 共 1,790 个测试（含子测试），默认运行 1,489 个通过、301 个跳过；顶层 725 个里 95 个跳过，其中绝大多数由 `CCG_REAL_CLI` 门控，CI 从不设置这个变量。门控代码散在 49 个文件里，有 66 处 `os.Getenv("CCG_REAL_CLI")`，跳过文案约 40 种。断言密度不错：991 个 Test 函数里只有 3 个没有断言。

---

## 1. 度量

### 1.1 规模（git 跟踪文件，非测试 / 测试）

| 模块 | 源文件/行 | 测试文件/行 |
|---|---|---|
| plugins/ccgateway/internal | 6 / 971 | 7 / 969 |
| server/internal/ccgateway | 39 / 8,830 | 39 / 8,172 |
| web/src/views/ccgateway | 28 / 4,337 | 20 / 2,889 |
| companions/engine（单包） | 137 / 27,306 | 277 / 38,499 |
| companions/contracts | 29 / 2,512 | 36 / 1,564 |
| companions/worker | 10 / 929 | 7 / 1,244 |
| companions/controller（Python） | 15 / 4,458 | 15 / 3,422 |
| companions/cli-mods（JS） | 23 / 2,141 | 44 / 5,429 |

Go 函数总数 1,342（engine、contracts、server、plugin、worker）。按长度：≤20 行 811 个，21–50 行 376 个，51–100 行 120 个，101–200 行 30 个，>200 行 5 个。按嵌套深度：≥5 层 22 个，6 层 3 个（`compileMCPTimeline`、`compileToolTimeline`、`alignInternalCacheSuffix`）。gocyclo 平均 8.5，>15 的 194 个，>25 的 70 个；gocognit 平均 11.1，>30 的 99 个。

### 1.2 复杂度 Top 30（gocyclo / gocognit，非测试）

| # | 函数 | 位置 | cyclo | cognit | 行数 | 生产可达 |
|---|---|---|---|---|---|---|
| 1 | `credits.MessageFromEvents` | contracts/credits/events.go:13 | 95 | 212 | 223 | 仅核心可达，worker 侧不可达 |
| 2 | `(*Gateway).serveRequestCommand` | engine/request_command.go:149 | 94 | 130 | 290 | **是（唯一生产请求路径）** |
| 3 | `nativeChain` | engine/native_branch.go:162 | 88 | 147 | 251 | native 路径 |
| 4 | `(*Runner).runNativeWebSearch` | engine/native_web_search.go:13 | 73 | 133 | 214 | native 路径 |
| 5 | `mergeConfig` | server/.../config.go:321 | 71 | 74 | 157 | 是 |
| 6 | `features.DecodeRuntimeCapabilities` | contracts/features/runtime.go:37 | 67 | – | – | 是 |
| 7 | `(*Request).compileToolTimeline` | engine/inline_timeline.go:25 | 65 | 169 | 183 | native 路径 |
| 8 | `(*Service).controllerInstall` | server/.../controller_install.go:202 | 60 | 74 | 229 | 是 |
| 9 | `(*modControl).ServeHTTP` | engine/mod_control.go:117 | 59 | – | – | 是 |
| 10 | `resources.ValidateOperation` | contracts/resources/operations.go:29 | 54 | – | – | 是 |
| 11 | `(*Runner).run` | engine/runner.go:149 | 53 | 62 | 184 | native 或目录校验 |
| 12 | `(*Prepared).resumeScopedTurn` | engine/history.go:297 | 52 | 67 | 135 | native 路径 |
| 13 | `(*Runner).initializeResourceAuthorization` | engine/resource_identity_carrier.go:234 | 50 | 79 | 146 | 是 |
| 14 | `transformBuildAttachments` | engine/build_attachments.go:112 | 49 | 88 | 145 | 是（v1） |
| 15 | `NewRuntime` | engine/runtime.go:57 | 48 | 59 | 189 | 是 |
| 16 | `(*Service).serveRuntime` | server/.../accounts.go:622 | 46 | 58 | 153 | 是 |
| 17 | `validateProxy` | engine/proxy.go:72 | 44 | – | – | 是 |
| 18 | `(*Request).compileMCPTimeline` | engine/mcp_timeline.go:70 | 44 | 112 | 134 | native 路径 |
| 19 | `(*exchange).execute` | engine/main.go:344 | 44 | 77 | 140 | native 路径 |
| 20 | `resourceAuthorizationSource` | engine/resource_identity_carrier.go:70 | 43 | – | – | 是 |
| 21 | `(*Request).alignInternalCacheSuffix` | engine/internal_cache_rounds.go:108 | 43 | 89 | 100 | native 路径 |
| 22 | `restoreHistoryCitations` | engine/citation_restore.go:23 | 43 | 82 | – | native 路径 |
| 23 | `checkCodeExecutionResult` | engine/code_execution.go:122 | 42 | 81 | 117 | native 路径 |
| 24 | `messagesBuildComponentsPolicy` | engine/request_command.go:47 | 41 | 67 | 101 | 是 |
| 25 | `resourceManagementHTTP` | engine/resource_carrier.go:127 | 40 | – | – | 是 |
| 26 | `checkBrowserState` | engine/browser_state.go:10 | 40 | 82 | – | native 路径 |
| 27 | `(modelTransport).forwardAttempt` | server/.../client.go:142 | 40 | – | 118 | 是 |
| 28 | `validateContextManagement` | engine/context_compaction.go:118 | 39 | 97 | – | native 路径 |
| 29 | `checkWebTool` | engine/web_tools.go:46 | 38 | 65 | – | native 路径 |
| 30 | `(*Accumulator).blockStart` | engine/response.go:110 | 38 | – | – | native 路径 |

gocognit 独有的高分项：`extractSystemComponents`（request_components.go:181，78）、`(*Request).applyHelperHistory`（helper_history_runtime.go:97，59，死代码）、`helperhistory.Validate`（contract.go:54，59）、`normalizeToolResultContextsOf`（tool_result_context.go:39，57，死代码）。

**结论：** 30 个最复杂的函数里有 16 个只在 native 路径或测试里运行。先删死路径，比重构这些函数收益大得多。生产路径上真正需要拆分的是 `serveRequestCommand`、`mergeConfig`、`controllerInstall`、`serveRuntime`、`forwardAttempt`、`NewRuntime`。

### 1.3 Python（radon，controller）

- `manager.py`：1,637 行（SLOC 1,368），MI = **0.00（C 级）**，注释率 7%；`class Manager` 横跨 290–1258 行（968 行）。
- 函数复杂度：`Handler.handle_request` F(77)（manager.py:1447）、`Manager._provision` F(70)（:595）、`Manager.apply` E(39)（:749）、`Handler._management` E(35)（:1305）、`authentication` D(28)（:157）、`Manager.delete` D(26)（:928）。
- `shared_egress.py` MI 7.91（C）；`SharedEgress.migrate` E(34)（:396）、`RuntimeUpdates.update` E(34)（runtime_updates.py:161）。
- 测试/探针脚本与生产模块放在同一目录且不带 `test_` 前缀，unittest 发现不了：`integration_test.py`（main F(53)）、`shared_integration.py`（F(46)）、`shared_failure_test.py`、`offline_migration_probe.py`、`runtime_migration_probe.py`。好在 Dockerfile 只 COPY 了 9 个生产模块（controller/Dockerfile:5）。

### 1.4 重复代码

- **token 级重复很少。** dupl 阈值 120 时源码 0 组；阈值 60 时 4 组，都很小：config.go:362–370 与 371–379，media_blocks.go:26 与 web_tools.go:118，native_web_search.go:23 与 runner.go:186，helperhistory/json.go:62 与 resources/references.go:80。测试代码阈值 150 时 2 组：`forced_*_cli_test.go` 三个文件共享约 20 行，`cwd_probe_cli_test.go:66` 与 `inline_system_cli_test.go:251`。
- **问题在语义重复**，即同一契约、同一流程各写一份，见 §2。
- 前端：`CCGatewayAccountAuth.vue`（674 行）与 `CCGatewayAccountReauth.vue`（330 行）有 19 行完全相同的非平凡逻辑，包括状态/健康 ref、`pollTimer`、`stamp !== serial` 防竞态、blocked 处理（Auth.vue:94–115、190–199、355–359、502）。其余 .vue 文件之间共享行 ≤7。

### 1.5 staticcheck / deadcode

- staticcheck：plugin、contracts、worker 干净；server 5 条；companions 87 条。其中 **engine 非测试 U1000（未使用）51 条**，例如 `client_tools.go:268/300/358`、`mcp_connector.go:21–25（字段）/29/49/55/110/129/469`、`inline_tools.go:151/242/282/319`、`image_carrier.go:57/66`、`usage.go:94/110/114`、`shell_tool_env.go:21/27`、`helper_history_requirement.go:13`、`request_policy.go:211/259`、`context_compaction.go:209/232`、`task_budget.go:62`、`thinking_output_plan.go:12`、`api_speed.go:10`、`advisor_tool.go:72`。另有 ST1005（错误字符串首字母大写）约 25 条、SA4006 3 条（见 §4.3）、SA1006 1 条（inline_system.go:65）。
- deadcode（三个生产入口合并分析）：共 167 条，engine 161 条（约 4,116 行）。按文件统计行数最多的：`tool_result_context.go`（13 个函数，几乎整个文件）、`mcp_connector.go`（12 个）、`helper_history_*.go`（共约 30 个）、`history_alignment.go`、`history_omissions.go`、`task_budget.go`、`fallback_history.go`、`inline_tools.go`。核心有 3 条：
  - `server/internal/ccgateway/direct.go:31 openAccountModel`：只被测试调用，`controller_conn_test.go` 6 处、`direct_test.go` 2 处。
  - `workers.go:185 updateWorker`。
  - `runtime_features.go:21 requireBuildAttachmentCapability`。
  - worker 1 条：`internal/config/config.go:168 getEnvInt`。
- what-if 分析：在临时副本里把 `engine/main.go:103–141` 的 native 分支换成 `serveRequestCommand`，从 worker 入口再做 deadcode，engine 额外不可达约 119 个函数、约 2.8k 行。主要是 `fallback_credit.go`（353 行）、`history.go`（323）、`gateway_attachments.go`（202）、`helper_history.go`（185）、`resource_capabilities.go`（158）、`native_branch.go`（153）、`internal_cache_rounds.go`、`session_branch.go`、`message_ownership.go`。

---

## 2. 架构与契约

### A1 [P1 待确认 / 中-高] 核心下发的多个策略字段在 build/direct 模式下不生效

- 核心 `RequestPolicy` 定义了 `ThinkingDisabledCompat`、`EraseClientAttachments`、`ReplaceClientAttachments`、`ToolSearch`、`CustomToolPrefix`、`UnknownField`，并做校验、默认值和合并：server/internal/ccgateway/request_policy.go:12–38、56、104–143；分组覆盖见 feature_policy.go:19–28、59、109、173。修改这些字段时 `FeatureRevision++`（config.go:386–393）。之后整份序列化放进 `X-CCGateway-Request-Policy` 头（client.go:233–234）。
- engine 的生产路径 `serveRequestCommand` 只解析 `buildRequestPolicy{contract_version, build_attachment_sources, build_billing_sources, request_identity_sources, relay_mode, cli_version}`（engine/request_command.go:38–45、159–168）。交给 CLI 的 `components["requestPolicy"]` 也只有这 6 个字段（:136–139）。
- 真正应用 erase/replace/thinking compat 的代码在 native 路径：`passthrough.go:47`（`eraseClientAttachments`）、`:95`（`applyThinkingDisabledCompat`）、`request_policy.go(engine):80–112`。生产到不了这里，见 A2。
- 前端也不再展示这些设置：`thinkingDisabledCompat`、`customToolPrefix`、`toolSearch` 的 i18n 文案（web/src/i18n/locales/zh/ccgateway.ts:64–79）没有任何 .vue 在用。`requestPolicy.ts:24–64` 里的 `setAttachmentAction`、`attachmentAction` 等函数只有 spec 在调。
- 影响：API 仍接受、存储、按版本号冲突校验这些字段，但它们没有效果，管理员和 API 调用方容易被误导。按记忆，线上开过 `thinking_disabled_compat=omit`，build 模式下这个开关已失效。
- 建议：二选一。
  - (a) 在 contracts 新增 `features.WorkerPolicy`，作为唯一的 wire 结构体，核心与 engine 共用；把仍需支持的字段接到 build 路径，比如在 `messagesBuildComponentsPolicy` 之前对 `raw` 执行 thinking omit 和附件擦除。
  - (b) 正式下线：`mergeConfig` 与 `FeatureOverrides.Validate` 对这些字段一律报错或忽略，并把它们排除在 `featureChanged` 比较之外；删掉 i18n 和 TS 里的死字段。
  - 需要 audit-models / audit-path 确认 2.1.304 CLI 自身是否处理了 thinking disabled。

### A2 [P2 / 高] engine 的 native 执行链在生产中结构上不可达，但仍占 engine 大部分复杂度

- 两个构造函数都会把空的 `RequestMode` 改成 `"build"`：`engine/runtime.go:58–60`、`engine/main.go:648–651`。`validateRequestMode` 只接受 `""`、`direct`、`build`（request_command.go:24–29）。
- `Gateway.ServeHTTP` 中，`g.RequestMode != ""` 时直接 `serveRequestCommand` 并返回（main.go:99–102）；之后 `exchange.admit/session/execute` 这一段（main.go:103–141）只有在测试里直接构造 `&Gateway{}` 时才会执行。
- 同类残留：`Runtime.ExecutionModes` 的 `return []string{"native"}`（runtime.go:320）；engine `RequestPolicy` 默认 `RelayMode: "native"` 且只接受 native（engine/request_policy.go:47、108–112），而核心只会发 build/direct（server request_policy.go:91–93、131–132）；2.1.288/2.1.292 原生工具目录嵌入在 catalog/assets.go:5–9，被 tool_matching.go:33–45 加载。
- 影响：engine 有 137 个源文件，`Request` 结构体 52 个字段、158 个方法（基本都为 native 服务），维护者很难判断哪些代码真正在线上运行。复杂度 Top 30 中 16 个在这条路径上。大量 `CCG_REAL_CLI` 测试也在验证这条不会上线的路径。
- 建议：先在 `ServeHTTP` 对 `RequestMode == ""` 直接返回 500 `configuration_error`，把 native 分支显式断开；再按 deadcode 清单分批删除（工作量建议见附录 B）；最后删掉 `catalog/` 包和 `tool_matching.go` 的嵌入目录。如果要保留 native 作研究用途，把它移到 `engine/internal/native` 子包，并加上构建标签。

### A3 [P2 / 高] 遗留入口 `engine.Serve` 与 `NewRuntime` 是两套重复的启动流程

- `companions/main.go:10` 调 `engine.Serve()`（engine/main.go:588–671），由 `companions/Dockerfile:4` 构建。但发布脚本只用 `worker/Dockerfile`（deploy/docker/build-ccgateway-images.sh:54、91；ccgateway-images.yml:120）。
- `Serve` 与 `NewRuntime`（runtime.go:57–245）的 Gateway 组装几乎逐行相同：Gateway 字面量对比 main.go:647 与 runtime.go:160，authManager 对比 main.go:669 与 runtime.go:171–172。`Serve` 缺少 `resourceBroker`、`cliManagement`、工作目录校验，行为已经分叉。
- 仓库根目录还残留本地构建的 `companions/ccgateway.exe`、`ccgateway.test.exe`（已被忽略）。
- 建议：删除 `companions/main.go`、`companions/Dockerfile`，以及 `engine.Serve`、`listen`、`maintain`、`envDefault`（main.go:582–733）。如果需要本地单进程调试，用 `NewRuntime` 加 `http.ListenAndServe` 写一个 10 行的 cmd。

### A4 [P2 / 高] 策略、字段表、版本号多处定义，没有跨语言一致性测试

| 内容 | 位置 | 是否一致 |
|---|---|---|
| Worker 策略结构 | server request_policy.go:12；engine request_policy.go:16 和 request_command.go:38；web requestPolicy.ts:70 | 字段集合各不相同，默认值冲突（核心 `AllowFast:true, RelayMode:"build"`，engine `AllowFast:false, RelayMode:"native"`） |
| build 附件字段 | contracts/features/attachments.go:14；cli-mods/request-policy.js:3–6；cli-mods/content-policy.js:3；web requestPolicy.ts:2 | 目前一致，没有测试守护 |
| 可擦除附件类型 | attachments.go:76；web requestPolicy.ts:11–20 | 一致；engine 另有别名（client_attachment_erase.go:39） |
| Beta 规则 | contracts/features/catalog.go:98（15 条以上）；web requestPolicy.ts:103–111（7 条） | **不一致**（核心会用 `defaultRequestPolicy().Betas` 覆盖，前端这份是死数据） |
| `validToolSearch` 与正则 | server request_policy.go:145–153；engine request_policy.go:387–394 | 逐字重复 |
| custom_tool_prefix 规则 | server request_policy.go:118、145；engine request_policy.go:90；web requestPolicy.ts:152 | 三份 |
| schema_version | contracts catalog.go:7 为 1；web requestPolicy.ts:147 接受 1 或 2 | **不一致**（前端放行，服务端会拒绝） |
| 健康检查载荷 | engine main.go:68 用 `claude_version`；worker pkg/types/types.go:53 用 `cli_version`；核心 runtime_features.go:62–66 用局部结构 | 两个端点、两套命名 |

- 建议：
  - 把 wire 结构体（`WorkerPolicy`、`Health`）和字段表都放进 contracts。
  - 由 contracts 生成 `contracts/features/vocabulary.json`（类似已有的 locales.json 做法），前端和 cli-mods 从这个 JSON 导入，不再手写。
  - 至少加一个 Go 测试，读取 `cli-mods/request-policy.js`、`content-policy.js` 与 `web/.../requestPolicy.ts` 的字面量，与 `features.BuildAttachmentFields` 对比。

### A5 [P2 / 高] `"2.1.304"` 硬编码，版本相等判断代替了能力判断

- 核心：client.go:227、request_policy.go:56、95、runtime_features.go:27、33、workers.go:73（错误信息里也写死了版本）；前端 requestPolicy.ts:100、145 附近（`cli_version: '2.1.304'`）。
- client.go:227 只要 `CLIVersion == "2.1.304"` 就调 `requireRequestPolicyCapabilities`，而默认值恰好就是 2.1.304，等于**每个模型请求前都多一次 `GET /healthz`**（runtime_features.go:50–80，超时 3s，按注释不缓存）。engine 自己已经做了同样的检查：版本不一致返回 409（main.go:94），能力不足返回 409（request_command.go:179、239–247），核心这次探测是重复的。
- 建议：在 contracts 定义 `features.DefaultCLIVersion`，同时提供 `features.RequiredCapabilities(policy)`，由策略字段推导所需能力，不再比较版本号；核心侧的 `/healthz` 预检改成按 revision 缓存，或直接删掉、依赖 engine 返回的 409。具体性能影响请 audit-path 评估。

### A6 [P2 / 高] `AccountRuntimes=false` 共享网关分支与 ssh/local 遗留模式仍然交织在请求热路径里

- `mergeConfig` 总是把 `c.AccountRuntimes` 设为 true（config.go:334），但 `decodeStored`（config.go:253–279）不做归一化。旧库里 `account_runtimes:false` 的配置因此会继续走 `!cfg.AccountRuntimes` 分支：client.go:151–200（`forwardAttempt` 里 6 处判断）、accounts.go:267、468、542，cleanup.go:57，sweep.go:197，usage.go:53，workers.go:330，drafts.go:144。
- ssh/local 遗留：config.go:58、303–310、335–339、413–415、`mergeLegacy` 482–519，client.go:30，controller_install.go:159、240。
- 影响：`forwardAttempt` 的圈复杂度到 40，主要由两套模式交叉造成；共享网关模式已不是产品形态，但仍可被激活。
- 建议：在 `decodeStored` 里一次性归一化（`AccountRuntimes = true`；`ssh/local` 映射成 `disabled`，或保留只读提示），然后删除所有 `!cfg.AccountRuntimes` 分支、`Service.open`，以及 `APIKey` 在共享模式下的用法。如需迁移，参照 CONTRACTS 的做法写一次性迁移。

### A7 [P2 / 中] controller 遗留的 `/v1/messages` 中继仍在路由里

- manager.py:80–81 的 `ROUTE` 仍包含 `v1/messages(?:/count_tokens)?`。manager.py:1576–1600 的中继分支，注释自己写着 "Legacy relay: the core now talks to the account directly or through the tunnel"。核心侧没有任何地方调用 controller 的 `/accounts/<id>/v1/messages`（client.go 走 route/openRoute）。
- 建议：从 `ROUTE` 去掉 `v1/messages`，删掉 `relay_timeout = 3660` 的特殊分支，并补一个 404 测试。

### A8 [P2 / 中] engine 扁平单包的边界

- 137 个源文件按前缀可以自然分组：`resource_*` 13 个、`helper_history_*` 10 个、`request_*` 9 个、`tool_*` 8 个、`cli_*` 6 个、`mcp_*` 5 个、`inline_*` 5 个、`fallback_*` 5 个、`native_*` 4 个、`history_*` 4 个。导出了 77 个顶层符号，worker 只用到 `NewRuntime`、`Options`、`Runtime` 三个。
- 包级可变全局：`modControls sync.Map`（mod_control.go:21）、`cliCatalogProbes`（cli_catalog_capture.go:21）、`refusedTokens`（usage.go:74）。单进程单账号时没问题，但这类全局状态让多个 Runtime 实例和并行测试互相影响。
- 建议顺序：先完成 A2、A3 的删除，engine 预计能降到 90 个文件左右。然后拆出几个子包：`engine/resource`（resource_*、resource_lease_*）、`engine/requestcmd`（request_command、request_error、request_log、build_attachments）、`engine/cli`（cli_catalog*、cli_management、cli_install）、`engine/auth`。依赖方向为 `requestcmd → resource/cli/auth → contracts`。根包只保留 `Runtime` 组装，其余符号改成非导出。

### A9 [P3 / 高] 核心 `Service` 是"上帝对象"

- server/internal/ccgateway 一个包有 39 个源文件，`*Service` 上挂了 152 个方法。职责混在一起：配置存取、controller 安装、运行时调和、草稿与授权、请求转发、镜像与 bundle、CLI 管理、用量统计。
- 建议：按文件前缀拆成内部子包或独立组件结构体，例如 `controllerClient`（controller_api/conn）、`reconciler`（accounts/sweep/lifecycle）、`installer`（controller_install、bundle_install、images）、`policy`（request_policy、feature_policy）。`Service` 只负责组合并注册路由。

### A10 [P3 / 中] 错误码没有集中定义

- 核心有 124 处 `errors.New("...")` 字面量，用户可见的错误码散落各处。controller 有 14 个错误码（`self.fail(…, 'code')`），其中 `cli_maintenance_busy`、`cli_profile_unavailable`、`cli_update_unavailable` 在核心和前端都没有对应处理，只会以原始代码显示（ccgError.ts 有回退逻辑）。
- contracts 里已经有 `requestfailure`，但只覆盖 Worker 请求失败。
- 建议：在 contracts 新增 `reasons` 包，用常量列出 reason 及其 HTTP 状态码。核心、controller（生成一份 Python 常量文件）、前端 `knownReason` 都从这里取，并用测试守住三边一致。

---

## 3. 风格

| # | 严重度/置信度 | 位置 | 问题 | 建议 |
|---|---|---|---|---|
| S1 | P2/高 | server accounts.go:120、125、189、241（`credentials bool`）；:622（`draft bool`）；client.go:142（`resource bool`）；engine tool_result_context.go:39、259、request.go:338 | 布尔参数让调用处难读，例如 `s.desired(ctx, id, false)` 出现约 15 处 | 拆成 `desired` 与 `desiredWithCredentials`，或改成 `type readMode int`；`serveRuntime` 改为 `serveAccountRuntime` 与 `serveDraftRuntime` |
| S2 | P3/高 | accounts.go:622、runtime_features.go:83 `serveRuntime(c *gin.Context, ctx context.Context, …)` | ctx 不在第一个参数；同时传 gin.Context 和 ctx，职责重复 | ctx 放第一位，或统一用 `c.Request.Context()` |
| S3 | P2/高 | 核心 `"controller"` 37 处、`"ssh"` 19、`"local"` 14、`"disabled"` 8；engine `"direct"` 17、`"native"` 11、`"build"` 8 | 模式名是魔法字符串 | 定义 `type Mode string` 常量（核心 config.go）和 `type RequestMode string`（放 contracts，核心与 engine 共用） |
| S4 | P3/高 | server request_policy.go:133 | 每次调用都执行 `regexp.MustCompile` | 提到包级变量 |
| S5 | P3/中 | engine 有 87 行超过 200 字符、6 行超过 400 字符（runner_config.go 2 行、main.go:647 Gateway 字面量、runtime.go:160、contracts/features/catalog.go:36–58 中文长串） | 单行塞太多内容，diff 和审阅困难 | 结构体字面量按字段换行；feature catalog 的说明文字移到 JSON 或嵌入文件 |
| S6 | P3/高 | 嵌套 6 层：mcp_timeline.go:70、inline_timeline.go:25、internal_cache_rounds.go:108；5 层 19 处 | 深嵌套 | 都在 native 路径，随 A2 一起删；保留的部分用提前返回和抽取函数处理 |
| S7 | P3/高 | ST1005 约 25 处（runner.go:67、96，structured.go:43/50/67，session_branch.go:126/130，server helper_history.go:28/50/61 等） | 错误字符串首字母大写或以标点结尾 | 统一小写，或者确认这些是对外 API 文案，那就用常量并注明 |
| S8 | P3/中 | 注释密度：engine 5%、contracts 5%、plugin 6%、server 9%、manager.py 7% | 结合 §1.2 的复杂度，偏低 | 至少为 Top 30 中保留的生产函数写上不变量注释 |
| S9 | P3/高 | 过时注释或路径：flow_test.go:161（`tools/ccgateway/runtime/manager.py`）；images.go:9–13（GHCR digest "from source 22cfdb506"，镜像已随插件包发布，见 §53.10）；worker/test/integration/README.md:26（`cd tools/ccgateway-worker`）；contracts/features/catalog.go:36、37、42、58（"Claude Code 2.1.288–2.1.296 的渲染文本"，当前是 2.1.304） | 误导读者 | 逐处更新；catalog 的版本说明改成引用 `DefaultCLIVersion` |
| S10 | P3/高 | worker 已跟踪的 `coverage`（193 行，路径 `github.com/yourusername/ccgateway-worker/...`）与 `tools/ccgateway-worker/coverage` | 脚手架时期的产物进了仓库 | `git rm`；把 `coverage` 加进 worker/.gitignore |
| S11 | P3/高 | worker/pkg/types/types.go:7–50（`Request`、`Message`、`Response`、`Event`、`Session` 带 gin `binding` 标签，但模块不依赖 gin） | 只有带 integration 标签的 e2e 测试在用；`Session` 是 native 时代的结构 | 只保留 `HealthStatus`，其余移到 e2e 测试文件内 |
| S12 | P3/高 | cli-mods：`patch-cli-2.1.296.cjs`（142 行）没有对应 profile 和 release，但 `patch-cli.cjs:7` 仍然接受 2.1.296；`release/manifest.json:4–13` 中 2.1.302 的 patch 为 `ccgateway-v7-request-modes`、modes 含 `native`，而 `package-release.cjs:7` 和 `patch-cli-2.1.302.cjs:87` 都是 v11，**按当前源码无法复现已发布的 2.1.302 产物** | 旧版本补丁与发布物漂移 | 删除 2.1.296 补丁和分派项；2.1.302 要么用 v11 重新打包，要么从 release 中移除（确认线上已全部是 2.1.304 后） |
| S13 | P3/中 | controller manager.py:1601–1625 | 一长串 `except X: fail(code)` | 改成 `{ExceptionType: (status, code)}` 表加一个处理函数，同时解决 A10 的码表问题 |
| S14 | P3/高 | TODO/FIXME/HACK/XXX | 全范围 0 处 | 无需处理，说明遗留事项都没有登记；建议把 A2/A3/A6/A7 记进问题表 |

---

## 4. 测试质量（横切）

### 4.1 本次实际运行结果（Windows 11，Go 1.27，Node 24.20，Python 3.14）

| 模块 | 命令 | 结果 |
|---|---|---|
| next/plugins/ccgateway | `go test -count=1 ./...` | 32 个顶层 / 145 个（含子测试）全部通过，4.4s |
| companions（engine 等） | `go test -count=1 ./...` | 顶层 725 个：通过 630、跳过 95；含子测试 1,790 个：通过 1,489、**跳过 301**、失败 0；31s |
| companions/worker | `go test -count=1 ./...` | 顶层 22 个：通过 21、跳过 1（`real_cli_test.go`，需要 `CCG_REAL_CLI`）；e2e 带 `//go:build integration` 标签，默认不编译（`go vet -tags=integration` 能通过） |
| companions/contracts | `go test -count=1 ./...` | 57 个顶层 / 119 个全部通过 |
| controller（Python 3.14 venv，docker==7.1.0、requests==2.32.5） | `python -m unittest discover -p 'test_*.py'` | 跑了 43 个，**9 个模块导入失败**：test_cleanup、cli_profiles、cli_updates、headers、manager、runtime、tunnel、uploads、worker，原因是 `manager.py:10 import fcntl`，属于 **Windows 特有问题**；能导入的模块全部通过。本机没有 Linux 环境，无法补跑 |
| cli-mods | `node --test test/*.test.mjs` | 116 个全部通过，跳过 0，21s（**依赖仓库外的未跟踪目录**，见 T5） |
| engine `.mjs` | `node --test` 4 个文件 | 9 个全部通过 |
| contracts/environment | `node --test install-locales.test.cjs` | 2 个全部通过 |
| web ccgateway | `npx vitest run src/views/ccgateway` | 20 个文件、259 个全部通过，11s（有 `[Vue warn] injection "Symbol(router)" not found` 噪音，来自 AccountRuntimes.spec） |
| server `TestPortScript` | `go test -run '^TestPortScript$'` | Git Bash 下**通过**；在 PowerShell（PATH 中没有 `sh`）下**失败**，报 `controller_config_test.go:390: local script failed to run`。原因是 `remotedocker.RunLocalScript` 固定执行 `exec.Command("sh","-c",…)`（server/internal/remotedocker/local.go:39）。`runtime_test.go` 也有同样依赖 |

companions 的跳过原因分布：`set CCG_REAL_CLI` 236 个，其余约 40 种 `set CCG_REAL_CLI for …` 文案合计约 55 个，`shell fixture; executed on Linux release host` 2 个、`Linux executable fixture` 2 个、`set CCG_COMPACT_REBUILD_INPUT` 1 个。

### 4.2 CI 覆盖

| 测试集 | 现有 CI | 结论 |
|---|---|---|
| plugins/ccgateway（Go） | next-ci.yml `plugins` job（遍历 `next/plugins/*/go.mod`） | 已覆盖 |
| companions、worker（Go，含 gofmt/vet） | ccgateway-images.yml:42–52 | 已覆盖，但**只在 push 到 main/feat-next-platform 时触发，PR 不触发**（:15–24） |
| **companions/contracts（Go，119 个）** | 无。它是独立模块，companions 里的 `go test ./...` 不会进入嵌套模块；next-ci 只遍历 `next/plugins/*/go.mod` | **从不运行**，gofmt/vet 也从不检查 |
| controller unittest | ccgateway-images.yml:61–65（Python 3.12，Linux） | 已覆盖；integration_test.py、shared_* 这类探针不在内（符合预期） |
| **cli-mods node（116 个）** | 无 | 从不运行 |
| engine `.mjs` | 只有 `attachment_policy_mod_test.mjs`（ccgateway-images.yml:57） | `resource_error_cause_mod_test.mjs`、`resource_error_cause_review_test.mjs`、`single_turn_mod_test.mjs` 从不运行 |
| contracts `install-locales.test.cjs` | 无 | 从不运行 |
| **next/web（含 ccgateway 259 个 spec）** | 无（整个 next/web 没有 typecheck、lint 或 test） | 从不运行 |
| server/internal/ccgateway（含 PG） | next-ci.yml `server` job | 已覆盖 |
| `CCG_REAL_CLI` 门控（约 95 个顶层） | 无，只有文档提到（CONTRACTS.md、ENVIRONMENT-RUNBOOK.md） | 只能手动跑 |

建议：
1. ccgateway-images.yml 的 `test` job 加上 `pull_request` 触发；新增一步 `sh .github/next-ci/next-check-module.sh next/plugins/ccgateway/companions/contracts`。也可以让 next-ci 的 plugins job 递归检查 go.work 中所有 `plugins/**` 模块。
2. 新增 node 步骤：`cd companions/cli-mods && npm ci && npm test`，再跑 `node --test` 覆盖其余 3 个 engine `.mjs` 和 `install-locales.test.cjs`。缺少基线的 `patch-wire-preservation-304` 测试需要先按 T5 修好。
3. next-ci 新增 `web` job：`npm ci && npm run check`（typecheck、lint、vitest）。
4. 加一个手动触发的 workflow（`workflow_dispatch`，自托管 Linux runner），设置 `CCG_REAL_CLI`，定期跑真实 CLI 测试，避免门控测试长期失效。

### 4.3 测试问题清单

| # | 严重度/置信度 | 位置 | 问题 | 建议 |
|---|---|---|---|---|
| T1 | P2/高 | engine 49 个测试文件、66 处 `os.Getenv("CCG_REAL_CLI")`、约 40 种 `t.Skip` 文案 | 门控逻辑复制粘贴；CI 从不设置该变量，约 17% 的用例默认不运行，可能长期失效 | 抽出一个 `requireRealCLI(t) string` 辅助函数；用 `go test -tags realcli` 或单独的包隔离；配合 §4.2 第 4 条定期运行。随 A2 删除只验证 native 路径的真实 CLI 测试 |
| T2 | P2/高 | server direct.go:31 `openAccountModel`（只有 controller_conn_test.go:202、275、283、292、416、511 和 direct_test.go:31、41 在用） | 测试验证的是生产不走的辅助函数，真实路径 `route`/`openRoute`（client.go:192–200）覆盖更弱 | 把这些测试改为驱动 `modelTransport.forwardAttempt` 或 `s.route`+`s.openRoute`，然后删除 `openAccountModel` |
| T3 | P2/高 | 约 160 个 engine 死函数大多有专门测试（如 tool_result_context、mcp_connector、helper_history_*、task_budget） | 测试在维护死代码，使 engine 测试膨胀到 3.85 万行 | 随 A2 一起删除对应测试 |
| T4 | P2/高 | server controller_config_test.go:304 `TestPortScript`、runtime_test.go（依赖 `sh`） | 在没有 `sh` 的 Windows 环境下失败（已复现），开发者本机检查不稳定 | 测试开头加 `if _, err := exec.LookPath("sh"); err != nil { t.Skip("needs POSIX sh") }`；或者让 `RunLocalScript` 支持注入 shell |
| T5 | P2/高 | cli-mods/test/patch-wire-preservation-304.test.mjs:19–21、46 | 依赖仓库根目录**未跟踪**的 `artifacts/claude-2.1.304/linux-restored`，并通过 `next/web/package.json` 借用 web 的 `@babel/parser`，没有用 cli-mods 自己声明的 devDependency。放进 CI 会直接失败；billing-fingerprint-oracle.test.mjs:9–10 在没有基线时会跳过 | 用 cli-mods 自己 `npm ci` 安装的 `@babel/parser`；基线不存在时用显式 `skip` 并在 CI 输出里标注，或者在 CI 中从受控位置下载基线 |
| T6 | P3/中 | engine runner_lifecycle_test.go:168–172（要求墙钟时间 `< time.Second`，并在 Cleanup 里 sleep 2.5s）；gateway_test.go:301（假上游 sleep 1s）；request_cancellation_test.go:62（sleep 1 分钟，靠取消打断）；runner_lifecycle_test.go:104（sleep 30s，同上）；workers_test.go:144；flow_test.go:340–348（20ms 轮询，最长 20s） | 共 14 处 `time.Sleep`。依赖墙钟的断言在慢 runner 上可能偶发失败，固定 sleep 拉长了测试时间 | 用 channel 或 `synctest`（Go 1.25 起可用）替换；放宽 runner_lifecycle 的 1s 阈值，或改成只断言"没有等待子进程" |
| T7 | P3/高 | gateway_test.go:796（`configAnswer` 赋值后没有使用）；inline_system_history_test.go:174（`r`）；sonnet_pause_history_cli_test.go:105（`prefix`） | staticcheck SA4006 报值没有使用，说明可能漏了断言（例如重启后的应答内容没校验） | 补上断言，或改成 `_` |
| T8 | P3/高 | staticcheck U1000 中的测试辅助函数：helper_history_inline_test.go:153、mcp_deferred_search_test.go:16、mcp_dynamic_listing_test.go:15、mcp_search_test.go:3、mcp_timeline_test.go:3、system_restore_test.go:9 | 夹具定义了却没人用 | 删除 |
| T9 | P3/中 | 测试文件按"来源"命名：48 个 `*_review_test.go`、17 个 `*_probe_test.go`、8 个 `*_independent_test.go`、9 个 `*_compat_test.go` | 文件名反映的是哪一轮审核加的，不是被测对象，很难找到某个功能的全部测试 | 按被测文件合并（例如 `references_review_test.go` 合入 `references_test.go`） |
| T10 | P3/高 | worker/test/integration/e2e_test.go（Chinese `t.Skip("跳过超时测试")` 等，`testing.Short` 门控，默认指向 `localhost:8788`）；scripts/run-tests.sh、Makefile、docker-compose.test.yml | 脚手架时期的集成测试，路径与当前结构不符（README:26），而且只用到了要删的 `types.Request` | 删除，或者重写成对 `cmd/worker` 的 httptest 端到端测试 |
| T11 | P3/中 | 断言密度 | 991 个 Test 函数中只有 3 个没有断言（2 个 `TestMain`、1 个是其他审核员临时加的 `zz_audit_path_test.go`）——**好** | 保持 |
| T12 | P3/低 | web AccountRuntimes.spec.ts | 缺少 router 注入，产生 `[Vue warn]` 噪音 | mount 时提供 `global.plugins: [router]` 或 stub |

---

## 5. 前端（views/ccgateway）

- F1 [P3/高] 死代码：`requestPolicy.ts` 中的 `setAttachmentAction`、`attachmentAction`、`attachmentChildren`、`attachmentRows`、`erasableAttachments`、`replaceableAttachments`、`buildAttachmentFields`（:2–64）只被 spec 使用；`defaultRequestPolicy().betas`（:103–111）与服务端不一致，而且服务端会覆盖它。建议与 A1 一起处理。
- F2 [P3/中] `CCGatewayAccountAuth.vue`（674 行）与 `CCGatewayAccountReauth.vue` 重复实现了运行时状态轮询（见 §1.4）。建议抽出 `useRuntimeStatusPoll(key, {interval})` 组合式函数，统一返回 `{status, health, blocked, stop}`，同时收敛 `serial` 防竞态逻辑。
- F3 [P3/中] `validRequestPolicy` 接受 `schema_version === 2`（requestPolicy.ts:147），服务端只接受 1（contracts catalog.go:7）。建议从 contracts 生成的词表读取版本号（见 A4）。

---

## 附录 A · 复现命令（均在仓库外执行）

```sh
B=%TEMP%/ccg-audit-quality/bin   # GOBIN，通过 127.0.0.1:7890 代理安装
gocyclo -ignore '_test\.go' plugins/ccgateway/internal server/internal/ccgateway plugins/ccgateway/companions | head -30
gocognit -ignore '_test\.go' -top 30 <同上>
cd next && deadcode -filter ccgateway ./server/cmd/sub2api ./plugins/ccgateway ./plugins/ccgateway/companions/worker/cmd/worker
cd companions && staticcheck ./...
dupl -t 60 -files < 非测试 go 文件列表
radon cc -s -n C manager.py ...; radon mi -s ...
```

what-if 分析：把 companions 复制到 `%TEMP%\ccg-audit-quality\whatif`，在副本中把 `engine/main.go` 的 native 分支替换为 `g.serveRequestCommand(...)`，然后从 worker 入口运行 `deadcode`，结果在 `whatif/dc-whatif.txt`。

## 附录 B · 建议的整改顺序

1. 确认并处理 A1（策略字段不生效）。可能与线上行为有关，优先级最高。
2. CI 补齐（§4.2 第 1–3 条）：contracts、cli-mods、web、PR 触发。改动小、收益大。
3. A3 删除 `engine.Serve` 入口；A7 删除 controller 的 v1/messages 中继；S10、S11、S12 清理残留产物。
4. A2 分批删除 native 路径和 deadcode 清单中的函数（engine 预计减少约 7k 行源码，测试减少更多），同步完成 T1、T3。
5. A6 归一化并删除共享网关和 ssh/local 分支，简化 `forwardAttempt` 和 `mergeConfig`。
6. A4、A5 契约收敛到 contracts（wire 结构体、词表、DefaultCLIVersion、RequiredCapabilities）。
7. A8、A9 包拆分，安排在删除完成之后。
