# 03 · Worker + engine 审核（2026-10-23）

- 审核员：C（Worker + engine，只读，未改任何源码）
- 分支 `feat/next-platform`，HEAD `f546fa31a`（上一轮 `43d576838` 之后 80 个提交，engine/worker/contracts 相关 18 个：levels v20/v21、agent context v18、direct billing、request log 分级与查看器、R1–R7 修复）
- 范围：`companions/worker/`（10 个源文件 929 行）、`companions/engine/`（137 个源文件 28,268 行 + 281 个测试文件）；对账 `companions/contracts/features`、`companions/cli-mods/*.js`、核心 `server/internal/ccgateway/{request_policy,feature_policy,client}.go`
- 严重度 P0–P3；每条标「确认」（亲自读到代码并能指出行号）或「怀疑」

## 1. 范围与方法

**读过的文件（完整）**：`worker/cmd/worker/main.go`、`worker/internal/{server/server.go,server/features.go,worker/worker.go,config/config.go,config/active_runtime.go}`、`worker/pkg/types/types.go`；engine `runtime.go`、`main.go`（1–200 行 + 函数表）、`request_command.go`、`request_identity.go`、`request_agent.go`、`request_error.go`、`request_log.go`、`request_log_viewer.go`、`request_trace.go`、`diagnostic_secrets.go`、`cli_pinned.go`、`runner.go`（1–200）、`proxy.go`（180–264）、`request_components.go`（1–180）、`cli_catalog.go`/`cli_catalog_capture.go`（捕获与快照部分）、`auth.go`（ServeHTTP）；contracts `features/{injection,levels,identity_line,identity,attachments,request_modes,agent_context}.go`、`requestfailure/failure.go`、`httpfacts/headers.go`、`testdata/worker-cli-requests.json`、`engine/contract_fixture_test.go`；cli-mods `request-policy.js`、`request-input.js`、`request-identity.js`、`request-agent.js`、`request-command.js`、`request-error.js`、`request-build-2.1.304.js`、`request-parameters.js`；核心 `request_policy.go`、`feature_policy.go:230-410`、`client.go:212-250`；设计文档六份；上一轮 `99-FINAL` §2/§7、`04-request-path`、`06-quality`。

**跑过的命令（均在 `companions` 模块内，Windows Go 1.27）**：

| 命令 | 结果 |
|---|---|
| `go vet ./...`、`GOOS=linux go vet ./...`（companions 与 worker 两个模块） | 全部无输出 |
| `go test -count=1 -v ./engine/` | 顶层 653 通过 / 93 跳过 / 0 失败；含子测试 1,516 通过 / 299 跳过；28.7 s |
| `go test ./catalog/ ./mod/ .` | 三个包无测试文件 |
| `worker` 模块 `go test -count=1 ./...` | 43 通过 / 1 跳过（`TestWorkerRealCLI`，需 `CCG_REAL_CLI`） |
| `contracts` 模块 `go test -count=1 ./...` | 7 个包 123 项全部通过 |

engine 跳过原因：`set CCG_REAL_CLI` 及其约 35 种变体 290 个（绝大多数验证 native 路径）；`shell fixture; executed on Linux release host` 2、`Linux executable fixture` 2、`Linux shell fixture` 1（即 `TestRequestCommandForwardsThroughExecutable`、`CancelsNativeProcess`、`StructuredStderrThroughProcess`、`MidStreamFailureAbortsHTTP`）；`symlinks unavailable here` 1；`CCG_LINUX_RESOURCE_SSH` 1；`CCG_COMPACT_REBUILD_INPUT` 1。没有为了跑通改任何代码。

函数长度与嵌套用一个放在 `%TEMP%` 的 node 脚本按 gofmt 缩进统计（非测试文件），结果见第 5 节；脚本不在仓库内。

## 2. 事实链路图

```
核心 client.go:219-244  决定：resolvedWorkerPolicy → workerPolicy()（按 level 稀疏化、relay_mode、去掉 identity/identity_lines）
      json.Marshal(policy) 全字段 → X-CCGateway-Request-Policy；x-api-key=Worker key
 └─ Worker server.go:32          执行：http.Server（ReadHeaderTimeout 10s / ReadTimeout 30s / Idle 60s）
     mux: "/"→engine.Runtime，/health（worker 自己的）、/admin/features（worker 自己的）
 └─ engine Runtime.ServeHTTP runtime.go:246-294   决定：closed→503；maintenanceOnly→409；维护租约→503；
     authorized && /v1/messages → cliGate.TryRLock（CLI 维护中→503）→ catalog.snapshot()（native 工具目录未就绪→503）
 └─ Gateway.ServeHTTP main.go:61-102              决定：/healthz；newRequestDiagnostic + capture（鉴权之前，:71-73）；
     第一次解析策略头 relay_mode/cli_version（:77-98）→ 版本/模式不符 409；RequestMode!="" → serveRequestCommand
 └─ serveRequestCommand request_command.go:196-559  决定几乎全部：
     :202 authorized（第三次比较 key）→ 401
     :206-215 第二次解析策略头：ValidatePolicySchemaJSON（schema_version 只收 1）+ json.Unmarshal(buildRequestPolicy)；relay_mode 覆盖 requestMode
     :216-229 /v1/ccgateway/probe 强制 build；CLIInfo.supports("request_"+mode) 否则 409
     :230-247 POST、anthropic-version==2023-06-01、io.ReadAll ≤32 MiB（413/400）
     :248 prepareSecrets（fallback-credit beta / authorization_token → 日志脱敏模式）
     :249-274 identity：Identity.Validate；mode=Identity.Mode()（核心不发→replace）；无 request_identity_v1 且非显式→client；
              build 且 requestIdentityEnabled → resolveRequestIdentity（API Key 账号→client；OAuth 无邮箱→worker；否则 HMAC 映射 device/session/parent）
     :280-299 agent：CLI 有 request_agent_context_v1 且非 probe → resolveRequestAgent（读 10 个 x-claude-code-*/x-cc-* 头，会话级 HMAC key，build 才 map）；
              direct 时另用 mapRequestIdentity(nil, raw, "client") 取客户端 session 作为 identity
     :300 d.request(raw) 写 request.body（full 级别）+ 摘要字段
     :302-309 ValidateBillingEntrypoint、Billing.Validate
     :317-330 direct：entrypoint 需 direct_billing_v1；billing 来源需 direct_billing_v1+request_levels_v1；有 direct_billing_v1 就生成 CCG_DIRECT_POLICY（可为 "{}"）
     :331-388 build：IdentityLines/Sources/Injection.Validate；Injection=Effective()；四个能力门（409 ×2）；
              v2（build_content_preservation_v1）→ messagesBuildComponentsPolicy(raw, policy, WorkingDirectory)：
                 validateBuildNumbers + validateBuildContent；拆 model/system/messages/tools/stream，其余→parameters；
                 system 缺省→[]；tools input_schema→inputSchema 原位改名；stream 缺省→false；
                 requestPolicy{contract_version:2, sources, billing, entrypoint, identity_lines, injection}+runtimeContext
              v1（无 preservation，现网 v21 不走）→ 可选 transformBuildAttachments（Worker 本机 platform/os 改写）+ extractSystemComponents
     :389-401 direct：只校验 JSON 对象 + model 非空
     :406-413 槽位（Slots=4，runtime.go:160）满→429 Retry-After:1   ← 在读完 body、做完变换之后
     :414-470 ctx=r.ctx+Timeout（NewRuntime 默认 1h；此处兜底 10min）；exec claude request --build|--direct --response-meta <dir>/response-meta.json
              --timeout-ms N [--betas a,b] [--header anthropic-version:…]；stdin=input；
              env = baseEnv()（Overrides.Apply → Proxy.Environment → 遥测关闭 8 项 + DISABLE_NONESSENTIAL_TRAFFIC + CCG_REPORT_CONTAINER_RESOURCES；
                    先删继承的 CCG_HARDWARE_PROFILE_PATH / CCG_REPORT_CONTAINER_RESOURCES / CCG_REQUEST_IDENTITY / CCG_DIRECT_POLICY / CCG_REQUEST_AGENT）
                    + CCG_REQUEST_IDENTITY（删 CLAUDE_CODE_REMOTE_SESSION_ID）+ CCG_DIRECT_POLICY + CCG_REQUEST_AGENT + _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1
                    + CLAUDE_CODE_ENTRYPOINT（继承值非 cli 则保留，否则 sdk-cli）
              build+preservation 时 cmd.Dir=WorkingDirectory，否则临时请求目录
     :474-493 stdout→requestCommandOutput（首次写入先读 response-meta.json：状态+httpfacts 白名单头+Content-Type，之后每块 Flush）
              stderr→requestErrorReader（只认一行 CCG_REQUEST_ERROR 帧 ≤512 KiB；CCG_CONTENT_DIAGNOSTIC 行入 trace）
              ctx 结束时 SetWriteDeadline(now) 打断阻塞写
     :497-558 结果映射：客户端取消→panic(ErrAbortHandler)；超时→504 timeout_error（未发头）/中止（已发头）；
              帧+已发头→中止；帧未发头→frame.write（source=http 原样状态/正文/白名单头；其他 source → {"type":"error","error":{type,code,message}}）
              + X-CCGateway-Error-Source；无帧且 exit 0/2 → start()；否则 502 cli_process_error
 └─ CLI（cli-mods）执行：request-command.js → direct: validateDirectPolicy + directBuild（补/换计费头，主线程 turn）；
     build: buildRequest（prepareBuildInput → applyContentPolicy → injectLayers 探针构建 → Kvt 原生构造 → mergeAdditionalParameters
     → mergeBillingAttribution → identityLineFor）→ identityBuild（按 Worker rewrite 决定）→ prefixBuild（OAuth 身份行）→ 原生 HTTP 客户端
```

**谁决定、谁执行**：模式与能力门全部在 Worker 决定；身份映射值（device/session/parent 的 HMAC）由 Worker 算出、CLI 只写入；agent 上下文的会话级密钥由 Worker 算、ID 派生在 CLI；计费头、身份行、注入层、环境附件转换、工具定义、缓存标记全部在 CLI 用原生函数生成。核心的 `level` 不出核心。

## 3. 三段映射表

| 核心字段（`RequestPolicy`，`workerPolicy()` 后） | Worker 字段（`buildRequestPolicy` / 其他） | CLI 侧 | 一致性 |
|---|---|---|---|
| `level`（不发送，决定 relay_mode 与下发项） | — | — | Worker 不知道等级；只在 direct 带计费来源时要求 `request_levels_v1`（C11） |
| `relay_mode` build/direct（`RelayModeForLevel`） | `RelayMode` → `requestMode`；另在 main.go:78 匿名结构体再解析一次 | `--build`/`--direct` 参数 | 一致；Worker 解析两处 |
| `cli_version` "2.1.304"（默认总发） | main.go:94 与 runner.Version 比较 → 409 | — | 一致 |
| `schema_version` 1（非 omitempty，总发） | `ValidatePolicySchemaJSON` 只收 1 | — | 一致 |
| `build_billing_entrypoint`（默认 sdk-cli 时省略） | `Entrypoint`；需 `build_identity_line_v1`（build）/ `direct_billing_v1`（direct） | `requestPolicy.build_billing_entrypoint` / `CCG_DIRECT_POLICY.build_billing_entrypoint`；默认 `sdk-cli` | 一致。Worker 还用 `CLAUDE_CODE_ENTRYPOINT=sdk-cli` 兜底（C14） |
| `build_billing_sources`（去掉 client，稀疏） | `Billing`；UsesWorker 需 `build_billing_sources_v1`；direct 需 levels | 同名；缺省=client | 一致 |
| `build_attachment_sources`（低注入起才发，去掉 client） | `Sources`；RequiresV2/UsesWorker 门 | 同名；client/worker/erase | 一致 |
| `build_injection`（`LevelInjection` 后只剩 true 项） | `Injection`→`Effective()`；校验 4 附件 / 7 工具名；需 `build_injection_v1` | 同名；工具名只查正则，运行时查工具池 | 一致（Worker 更严） |
| `build_identity_lines` — **核心置 nil，永不下发** | `IdentityLines` 仍解析、校验、参与 `build_identity_line_v1` 门（:336,348） | `validateIdentityChoices` 接受后丢弃 | 三层死线字段（C4） |
| `request_identity_sources` — **核心置 nil，永不下发** | `Identity` 解析；`Explicit()` 分支 409（:257-263）走不到 | 不进信封（R1 修复已确认，:383） | Worker 侧死分支（C4） |
| `unknown_field`、`allow_fast`、`allow_effort`、`tool_search`、`custom_tool_prefix`、`thinking_disabled_compat`、`erase_client_attachments`、`replace_client_attachments`、`betas`（总发） | `json.Unmarshal` 静默忽略 | — | 核心发、Worker 忽略（上一轮 F6/A1 **未修**，C4） |
| （无） | `CCG_REQUEST_IDENTITY` `{version:2,mode,rewrite,session_id?,device_id?,parent_session_id?,carrier?}` | `identity()` 严格校验：v4 小写 UUID、64 hex | Go 侧 session 用 `nativeSessionName`（任意大小写/版本）→ 不一致（C6） |
| （无） | `CCG_REQUEST_AGENT` `{version:1,map,key?,client{10 个头}}` | `readRequestAgent` 同名字段、同正则 | 一致（逐条核对正则） |
| （无） | `CCG_DIRECT_POLICY` `{build_billing_entrypoint?,build_billing_sources?}` | `validateDirectPolicy` 另接受 `build_identity_lines` 后丢弃 | 一致 |
| （无） | `CCG_REPORT_CONTAINER_RESOURCES=1`（CLI 有 `container_resource_reporting_v1`） | `container-resources.js` 读它和 `CCG_ACCOUNT_DISK_QUOTA_BYTES`（控制器设在容器，Worker 透传） | 一致 |
| （无） | `anthropic-beta` → `--betas`；`anthropic-version` → `--header` | `parseRequestOptions` | 一致 |
| 超时：核心 1h+1m | Worker `REQUEST_TIMEOUT`/`CCG_TIMEOUT`/`CLI_TIMEOUT`（1h）→ `Options.Timeout`；`serveRequestCommand` 兜底 10 min | `--timeout-ms`（CLI 默认 600000） | 三层四个默认值（C15） |

能力声明口径：Worker `/healthz`（engine）返回 `claude_version`+`capabilities`；Worker `/health`（server.go）返回 `cli_version`+`capabilities`；`/admin/features` 另有一套 `RuntimeCapabilities`。`requestCapabilities()`（cli_pinned.go:51-82）最多声明 12 个能力，`request_levels_v1` 只是转发 CLI 的声明。

## 4. 发现表

| # | 级别 | 位置 | 问题 | 证据 | 建议 | 状态 |
|---|---|---|---|---|---|---|
| C1 | **P2** | `runtime.go:205-227,280-291`；`cli_catalog_capture.go:168-288`；`cli_catalog.go:131-139` | **请求模式的就绪与每个 `/v1/messages` 都被 native 工具目录探针门控。** 启动时 `catalog.sync` 对 7 个场景各启动一次 `claude -p … --model claude-opus-5-5` 打回环假上游（每个最长 30 s）；任一失败 → `snapshot()` 报错 → `/v1/messages` 一律 503 `Claude Code tool catalog is not ready`，`/health` 停在 `starting`。请求模式只用快照里的 `version`（`forContext`，cli_catalog.go:262-270），工具目录无人消费 | `Runtime.ServeHTTP` 对已鉴权的 `/v1/messages` 强制 `r.catalog.snapshot()`；`captureToolCatalog` 全是 native 工具表逻辑；`cliSnapshot.tools` 在 `request_command.go` 无引用 | 请求模式下 `newCLICatalog` 只做 `checkCLIVersion`，不捕获工具目录；就绪 = `readCLIRequestInfo` 成功。随 C5 一起删 | 确认 |
| C2 | **P2** | `request_command.go:198-201`；`request_error.go:169-171`；插件 `classify.go:121`；`server/internal/account/testreq.go:315` | **Worker 本地错误没有机器可读的来源标记，插件靠错误文案判断。** `fail()` 生成的 401/400/404/405/409/413/429 不设 `X-CCGateway-Error-Source`（只有 CLI 帧路径设）；全仓库消费该头的只有账号测试 `testreq.go`，业务分类器匹配字面量 `"Gateway concurrency limit reached"`。于是 401 `Invalid gateway API key` 仍被当上游凭据失效（上一轮 F4），409 `configuration_error`、400 `Cannot read body` 原样到客户端（上一轮 F10/F11），`type` 非官方枚举 | `requestfailure.SourceHeader` 定义了 6 个值，`fail()` 路径一个都不写；`grep -rn X-CCGateway-Error-Source` 只有 4 个文件 | `fail()` 统一经 `localRequestError(...).write(w)`，source=`internal`（鉴权用 `gateway_auth`）；插件用 `requestfailure.Source()` 判 LocalFailure，不比对文案；`type` 只用官方枚举，code 放头里 | 确认（部分为上一轮未修） |
| C3 | P2 | `request_command.go:238` vs `:406-413`；`runtime.go:160` | 槽位仍在读完 ≤32 MiB 请求体、做完身份/agent/组件变换之后才占；`Slots` 仍写死 4，不告诉核心 | 上一轮 F3 原样 | 鉴权后立即占槽；槽位数进 `Options` 并在 `/healthz` 返回 | 确认，上一轮未修 |
| C4 | P2 | 核心 `client.go:243`；`request_command.go:39-49,257-263,336,348` | 契约漂移三处：(a) 核心 `json.Marshal(policy)` 下发 9 个请求模式不消费的字段（含线上曾开的 `thinking_disabled_compat=omit`），Worker 静默忽略；(b) `build_identity_lines` 核心永不发、Worker 仍解析并以它触发 `build_identity_line_v1` 门、CLI 收到即丢；(c) `request_identity_sources` 同理，`Identity.Explicit()` 的 409 走不到。契约夹具 `build-identity-lines` 用例固化了死字段 | 见第 3 节映射表 | contracts 定义唯一 wire 结构体 `features.WorkerPolicy`（只含 6 个字段）供核心 marshal、Worker unmarshal；删 `IdentityLines`、`Identity` 字段与对应门；核心对旧字段 reject 或从存储下线 | 确认，上一轮 F6/A1 未修 |
| C5 | P2 | `main.go:103-141,574-733`；`companions/main.go`、`companions/Dockerfile`；`catalog/`；`tool_matching.go:33-45` | native 执行链、`Serve()`/`listen`/`maintain` 旧入口、2.1.288/2.1.292 嵌入目录全部仍在。生产 `RequestMode` 恒非空（worker config.go:102,132），`exchange`/`Request` 结构体 52 字段 158 方法只有测试在跑。本轮长函数前 30 名里 19 个在死路径 | 上一轮 A2/A3/F6 原样；`Runtime` 仍构造 `HistoryCache`、`NativeAllowed`、每分钟 `cache.prune()` | 先把 `ServeHTTP` 的 `RequestMode==""` 改为 500 显式断开，再按 deadcode 清单分批删（预计 −7k 行源码、−2 万行测试），然后拆包（第 5 节） | 确认，未修 |
| C6 | P3 | `request_identity.go:298`、`native.go:13` vs `cli-mods/request-identity.js:4-19` | Go 接受任意大小写、任意版本位的 UUID 作为 `session_id` 交给 CLI；CLI 只接受小写 v4（`4[0-9a-f]{3}-[89ab]`），否则 `throw Error('Invalid Worker request identity')`，请求以 CLI 阶段错误失败。触发：mode=client（API Key 账号的 build、以及所有 direct）且客户端 `metadata.user_id` 的 `session_id` 不是小写 v4。真 CC 用 `crypto.randomUUID()` 不触发，其他 SDK 客户端可能 | 两处正则并列即见 | Go 侧用与 JS 相同的严格正则，不匹配就不下发 `session_id`（CLI 用原生随机会话） | 确认（触发面小） |
| C7 | P3 | `main.go:71-73`；`request_log.go:79-90,130-138,150-154,411-436,488-489`；`request_log_viewer.go:89-107`；`request_log.go:232` | 请求日志：(a) `capture()` 仍在鉴权前执行，未鉴权请求也建目录写 `request-headers.json`；(b) `save("request.body")`（≤32 MiB）与每个响应块的 `diagnosticWriter.Write` 仍在账号级 `store.mu` 内；(c) 启动时 `ensureIndex` 同步读遍 7 天摘要（128 MiB 预算 ≈ 数万个 `metadata.json`）。上一轮 F5 的"每请求清理"已改为每分钟最多一次（`:432-436`），算部分修复 | 代码即证据 | 诊断目录在 `authorized` 之后建；`store.mu` 只保护 `enabled/active/index`，文件写入用请求级锁；索引延迟构建或异步 | 确认，F5 部分修复 |
| C8 | P3 | `main.go:77-98` 与 `request_command.go:206-215`；`runtime.go:280`/`main.go:77`/`request_command.go:202` | 策略头解析两次（第一次不校验 `schema_version`、用匿名结构体），鉴权常量时间比较三次；两处 409 文案不同（`Worker CLI version/mode differs…` / `Loaded CLI does not support the requested mode`） | 代码即证据 | 把头解析提到 `Gateway.ServeHTTP` 一次，结果随 ctx 传入；`authorized` 只做一次 | 确认 |
| C9 | P3 | `request_command.go:234-236,282-286,390-404`；`request_identity.go:152-182,225-274` | direct 不是纯透传：Worker 解析 body（`model` 非空、`metadata`/`metadata.user_id` 结构、重复键报 `duplicate request identity property`、非字符串/对象报错）并以非官方文案 400；`anthropic-version` 只接受 `2023-06-01` | 代码即证据 | direct 下身份/agent 解析失败只记诊断、不拦截（让上游决定）；或至少错误形状走 C2 的本地标记 | 确认 |
| C10 | P3 | `request_command.go:70,131-134`；cli-mods `request-input.js` `stream: components.stream === true` | build 下 Worker 的两处非原生改写未写进设计文档：客户端没发 `stream` 时组件给 `false`，最终 wire 多出 `"stream":false`；`system` 缺省给 `[]`（最终总有计费头，影响仅形状）。`input_schema`→`inputSchema` 原位改名已在文档 §2 | `BUILD-REQUEST-COMPONENTS-DESIGN.md` §2 表只写"stream → components.stream" | 组件里 `stream` 缺省就不发；文档补齐 | 确认 |
| C11 | P3 | `request_command.go:319-323` vs `:331-355` | Worker 只在 direct 带计费来源时要求 `request_levels_v1`，build 路径完全不检查该能力；旧 v19 CLI（有 injection 无 levels）配新核心会被 Worker 放行（核心另有预检，但 Worker 作为第二道不一致） | 两段能力门并列即见 | build 与 direct 用同一张能力门表（见第 5 节） | 确认 |
| C12 | P3 | `worker/internal/config/active_runtime.go:93-104` → `engine/cli_pinned.go:97-110` + `runtime.go:88` | 启动时同一个 CLI ELF 被 SHA-256 两次、`--ccgateway-info` 执行两次（`verifyPinnedCLI` 内一次、`NewRuntime` 再一次） | 代码即证据 | `active_runtime` 把校验结果带进 `Options`，或 `NewRuntime` 复用 `verifyPinnedCLI` 的 `info` | 确认 |
| C13 | P3 | `worker/internal/server/{server.go,features.go}`、`engine/main.go:66-70`、`worker/pkg/types/types.go`、`worker/coverage`、`worker/tools/ccgateway-worker/coverage` | Worker 模块与 engine 各有一套健康/能力端点（`/health` `cli_version` vs `/healthz` `claude_version`；`/admin/features` 与 `/admin/*` 各自比对 admin key）；`types.Request/Message/Response/Event/Session` 是 native 时代遗物；两个 coverage 产物仍被 git 跟踪 | 上一轮 A4/S10/S11 原样 | 端点收敛到 engine；`types` 只留 `HealthStatus`；`git rm coverage` | 确认，未修 |
| C14 | P3 | `request_command.go:463-470` | Worker 决定 `CLAUDE_CODE_ENTRYPOINT`（继承值为 `cli` 或空时改 `sdk-cli`），这与策略里的 `build_billing_entrypoint` 默认 `sdk-cli` 是两条独立链路，一旦策略默认改动会分叉；属于"Worker 替 CLI 决定原生值" | 注释说明是为了补 `claude request` 跳过的初始化 | 让 CLI 的 `request` 命令自己设默认入口，Worker 不碰 | 怀疑（行为正确，耦合待确认） |
| C15 | P3 | `runtime.go:143-146`、`request_command.go:414-417`、`worker/config.go:88,110`、cli `request-command.js` | 超时默认值四处（1h / 10 min / 1h / 600 s），三个环境变量名（`REQUEST_TIMEOUT`、`CCG_TIMEOUT`、`CLI_TIMEOUT`） | 代码即证据 | 一个常量放 contracts，Worker 与核心共用 | 确认 |
| C16 | P3 | `worker/internal/worker/worker.go:28-35`；`engine/proxy.go:186-197` | CLI 子进程继承 Worker 全部环境变量（只剔 `CLAUDE_CONFIG_DIR` 两项）；`CCG_API_KEY`/`CCG_ADMIN_KEY` 只在 `CCG_EXTERNAL_EGRESS=1` 时才被剔除。生产由控制器设该变量，独立运行时密钥进入 CLI 环境 | 代码即证据 | 子进程环境改为白名单，而不是黑名单 | 确认 |

**上一轮已修、本轮复核通过**：R1（信封剥离 identity，`:383`；cli-mods 只收 6 键）、R2（按能力判断）、R5（账号卷随机密钥 HMAC，`request_identity.go:51-113`）、R6（`rewrite` 由 Worker 决定并保留载体）、P1-7（`diagnostics` 只按客户端发送，`request-parameters.js` `clientOnlyFields`）、C3 计费歧义（CLI 侧 400/503，Worker `localErrorFrame` status 503 走 `internal`）、跨层夹具（`contract_fixture_test.go` 10 用例全过；但夹具不含 `CCG_REQUEST_AGENT`，agent 上下文没有 Worker→CLI 字节级夹具）。上一轮"未能验证：CLI 是否先写完 `response-meta.json` 再写 stdout"——本轮读 `request-command.js` 确认 `await fs.writeFile(options.meta…)` 在输出循环之前，成立。

**Worker 这一层自己拼装/改写了什么（对应用户"完全复用原生组装"的要求）**：

| 内容 | 位置 | 文档 |
|---|---|---|
| `metadata.user_id` 的映射值（device/session/parent 的 HMAC-SHA256 → hex/UUID） | `request_identity.go:295-317` | §7 已写（密钥不出 Worker，故由 Worker 算） |
| agent 上下文的会话级密钥 `identityDigest(key,"agent-context",session)` | `request_agent.go:85-91` | SUBAGENT 设计已写 |
| `CLAUDE_CODE_ENTRYPOINT=sdk-cli` 默认 | `request_command.go:463-470` | 未写（C14） |
| `stream:false`、`system:[]` 缺省填充 | `request_command.go:70,131` | 未写（C10） |
| `tools[].input_schema`→`inputSchema` 原位改名 | `:123-128` | 已写 |
| v1 路径：`transformBuildAttachments` 用 Worker 本机事实改写环境段、`extractSystemComponents` 抽 reminder | `build_attachments.go:112`、`request_components.go:181` | 已写（v1）；v21 不走，应删或 build tag |
| 自造错误体 `{"type":"error","error":{type,code,message}}` 与非官方 type/文案 | `main.go:43-47`、`request_error.go:195-200` | 未写（C2） |
| `request-id` 响应头（上游有则被覆盖） | `request_log.go:479`、`httpfacts.Apply` | 未写 |

其余（计费头、身份行、注入层、环境附件、工具定义、缓存标记、turn 字段）都在 cli-mods 用原生函数生成，Worker 不碰。

## 5. 代码规范观察

**抽象**：`serveRequestCommand`（`request_command.go:196-559`）现在 **364 行**（上一轮 290 行，又长了 74 行），圈复杂度只增不减；它同时做鉴权、策略解析、7 个能力门、身份、agent、build/direct 两套输入准备、子进程生命周期、6 种结果映射。建议按边界拆成 5 个函数/类型：`parseRequestPolicy(r) (policy, mode, err)` → `admitRequest(w,r) (raw, err)` → `requestContext{identity,agent,direct}` 的 `resolve()` → `prepareInput(mode, policy, raw)` → `cliRun{cmd,output,stderr}.run(ctx)` 返回一个 `outcome` 枚举，再由 `writeOutcome` 单独映射到 HTTP。能力门做成表：`[]struct{when func(policy) bool; capability string; message string}`，build/direct 共用（同时解决 C11）。

**复用**：
- `os.Getenv("CCG_REAL_CLI")` 66 处、跳过文案约 35 种（上一轮 T1 未修）。
- `json.Unmarshal(x,&model)!=nil || strings.TrimSpace(model)==""` 的 model 校验在 `request_command.go:63,397` 与 `validateBuildContent` 三处。
- 代理变量剔除列表在 `proxy.go:192` 与 `:230` 附近两份；`envWith` 的 remove 列表与 `baseEnv` 的 values 列表手工同步。
- 策略头解析与 409 两份（C8）；健康载荷两份（C13）；`RequestPolicy` 在 Worker 层有 3 份（engine 原生 `request_policy.go:16`、`buildRequestPolicy`、`main.go:78` 匿名）。

**解耦**：engine 单包 137 文件、52 个导出顶层符号（含方法名去重），worker 只用 `NewRuntime/Options/Runtime` 三个；`modControls`、`cliCatalogProbes`、`refusedTokens` 三个包级可变全局仍在。建议顺序：先做 C5 删除（engine 预计 ≈60 文件），再拆：`engine/requestcmd`（request_command、request_error、request_identity、request_agent、request_components、build_attachments、diagnostic_secrets）、`engine/requestlog`（request_log、request_log_viewer、request_trace）、`engine/cli`（cli_pinned、cli_catalog*、cli_management、cli_install）、`engine/resource`（resource_*）、`engine/auth`；根包只留 `Runtime`/`Gateway` 组装，依赖方向 `requestcmd → cli/auth/requestlog → contracts`。Worker 模块的 `internal/server` 只剩 `http.Server` 包装，应把 `/health`、`/admin/features` 并入 engine。**文件数是否合理**：不合理——按前缀自然分组（`resource_*` 13、`helper_history_*` 10、`request_*` 11、`cli_*` 6、`mcp_*` 5、`inline_*` 5、`fallback_*` 5、`native_*` 4、`history_*` 4）就是子包边界，且其中约一半只服务死路径。

**简洁 / 超过 80 行的函数（非测试，生产可达）**：`serveRequestCommand` 364；`NewRuntime` 188（runtime.go:57）；`initializeResourceAuthorization` 146（resource_identity_carrier.go:210）；`captureToolCatalog` 121（随 C1 删）；`serveCLI` 119（cli_management.go:96）；`modControl.ServeHTTP` 113（mod_control.go:117）；`messagesBuildComponentsPolicy` 107（request_command.go:51）；`resourceAuthorizationSource` 104；`resourceBroker.ServeHTTP` 92（resource_http.go:63）；`Gateway.ServeHTTP` 82（含死分支）；`authManager.ServeHTTP` 80。v1 专用：`transformBuildAttachments` 145、`extractSystemComponents` 126。死路径上另有 `nativeChain` 251、`runNativeWebSearch` 214、`Runner.run` 184、`compileToolTimeline` 183、`exchange.execute` 137 等 19 个。单行超长：`runtime.go:160` Gateway 字面量、`cli_catalog_capture.go:241,248`、`cli_pinned.go:56`。

**低嵌套 / 深度 ≥5 的生产可达块**：`request_command.go:90`（`messagesBuildComponentsPolicy` 的 system 块字段循环）、`request_components.go:59`（`validateBuildContent` 的 tool_result 递归闭包）、`request_log.go:528`（`request()` 的消息摘要 switch）、`diagnostic_secrets.go:35`（`prepareSecrets` 的递归 visit）、`resource_identity_carrier.go:332`；v1：`build_attachments.go:195`、`request_components.go:257`。前三者都可用"提取 `summarizeMessage(m)` / `validateBlock(block,path)` 小函数 + 提前返回"消掉两层。

**legacy 分支清单**（除 C5）：`request_command.go:527-529,551` 旧 CLI exit code 2 + meta 的 HTTP 错误契约；`:356-388` v1 路径；`request_log.go:199-233,255-262,715-723` `request-logs.disabled` 标记与 `{"enabled":bool}` PUT 兼容（设计文档要求保留，合理）；`request_log_viewer.go:366-383` `logFileKind` 的 `upstream*/resource-*/cli-*/history*` 都是 native 文件名；`worker/config.go:114-119` `native` 模式降级为维护模式（迁移期，合理）；`request_log.go:77` 注释与 `main.go:144-155` 的 `exchange` 注释仍描述 native。

## 6. 对设计文档的异议

1. **`BUILD-REQUEST-COMPONENTS-DESIGN.md` §6.3、§10、结论第 15 条**：写 direct "补计费头**与身份行**"、"`relay_mode` 为 direct 时只在…身份行偏离默认时要求 `direct_billing_v1`"。代码已是 levels 口径：direct 只补计费头，身份行一律不加（`request-policy.js` `validateDirectPolicy` 把 `build_identity_lines` 丢掉；`request_identity.go:24-26` 注释也这样写）。文档没更新。
2. **同文 §7**："direct 不解析身份、不设这个变量（`CCG_REQUEST_IDENTITY`）"——**错**。`request_command.go:294-298`：CLI 有 `request_agent_context_v1` 时 direct 也调 `mapRequestIdentity(nil, raw, "client")` 并设 `CCG_REQUEST_IDENTITY`（让 CLI 采用客户端会话）。SUBAGENT 文档第 86 行写对了，两份文档互相矛盾。
3. **同文 §2** 的行号 `request_command.go:47`/`:268` 已过期（现 `:51`/`:379`）；§6.1 的"缺省 → `[所选或默认的一句]`"在 build 总带计费头后已不可达。
4. **`REQUEST-MODES.md`**：(a) 开头"top_p、stop_sequences、调用方 metadata 等没有映射的字段不会自动补传"与 `request-parameters.js` `mergeAdditionalParameters` 相反——非 `nativeFields` 的字段会原样并回（top_p、stop_sequences 会发出去），metadata 由身份逻辑处理；(b) 同一文档内 "v16 起 direct 为纯透传"、"v17 起只补缺的计费头和身份行"、"2026-10-19 请求模式只保留 build/direct" 三段并存，没有一段是当前状态；(c) "Core 缺省配置为 build / CLI 2.1.302" 过期。该文件已成发布日志，应拆成"当前契约"与"历史"。
5. **`CC-INJECTION-LEVELS-DESIGN.md` §6 表**："micro | build | 再加身份行"。核心 `workerPolicy()` 把 `BuildIdentityLines` 置 nil，Worker 在 micro 下收到的和 none 只差 `relay_mode`；身份行是 CLI 在 build 下自适应补的，不是"下发项"。表格会让读者以为 Worker 收到了身份行配置。同节"核心对每个带等级的策略都要求这个能力"只在核心成立，Worker 的 build 路径不查（C11）。
6. **`PASSTHROUGH-DESIGN.md`**（标题"native-only 当前设计"）：描述的是生产不可达的 native 模式，"Worker 能力仅声明 `execution_modes: ["native"]`" 与 `Runtime.ExecutionModes()`（runtime.go:303-320 返回 `request_direct/request_build`）相反。应标注"已归档，不描述当前行为"。
7. **`contracts/features/request_modes.go:36-41`** `F-REQUEST-MODES` 的 Reason 文案"build 由 Worker 提取上下文后交 CLI 构建，可能改变文本块形状"是 v1 描述；v2 下 Worker 不提取。这段文字会原样出现在控制台能力目录里。
8. **`REQUEST-LOG-LEVELS-DESIGN.md` §1**"有 `request-logs.disabled` 文件就是关"只对旧 Worker成立，现以 `request-logs.json` 为主、标记为兼容（§9 写对了，§1 应改为"现状（旧）"）。
9. **R1 修复说明**（99-FINAL §7）说"Worker 剥离出信封"——成立；但 `buildRequestPolicy` 仍保留 `Identity` 字段并以它做 409 门，"剥离"只做了一半（C4）。

## 7. 未能验证的范围

- 4 个 Linux 进程级用例在 Windows 上 SKIP（同上一轮）；`CCG_REAL_CLI` 门控的 ~290 项未跑；本机无 docker/WSL，无法复现 ovh 离线容器矩阵。
- cli-mods 的运行时行为（`Kvt`、`MDe`、`injectLayers` 探针构建、`identity()` 抛错落在哪个 phase）只按源码阅读，没有在编译后的 CLI 上执行；C6 的最终 HTTP 状态（400 还是 502）据此标为"按阶段"。
- C1 的启动耗时与失败概率没有线上数据；只确认了结构上的门控关系。
- 核心预检（`requireRequestPolicyCapabilities`）是否已覆盖 C11 的缺口，属于核心审核员范围，本报告只指出 Worker 一侧未做。
- `EnvironmentOverrides.Apply`、`resource_*`（额度/资源旁路）、`cli_management`/`cli_install`、`mod_control` 未逐行审查，只在链路涉及处读过。
- 控制器注入 `CCG_ACCOUNT_DISK_QUOTA_BYTES` 的取值与 `container-resources.js` 的消费只对了名字，没有验证数值语义。
