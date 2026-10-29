# CCGateway Worker 引擎

2026-10-27 按代码整理（插件/Worker 0.1.103、CLI 2.1.304 / `ccgateway-v31-request-capture`）。以代码为准：本文每节都标了源码文件，路径相对 `companions/`。行为的设计理由见文末索引里的设计文档；本文只写"现在怎么跑"。

Worker 是每个账号容器里的 Go 程序（`worker/`），HTTP 面和全部请求逻辑在共享包 `engine/`（Go 包 `ccgateway/engine`）。Worker 不组装上游请求：每个 `/v1/messages` 启动一次打包的定制 CLI 的 `claude request --build|--direct`，由 CLI 用 Claude Code 自己的函数组装并发送（CONTRACTS §53.21）。

## 1. 进程与路由

**启动**（`worker/cmd/worker/main.go`、`worker/internal/config`、`worker/internal/worker/worker.go`、`engine/runtime.go`）：

1. `config.Load` 读环境变量（逐项见 [Worker README](../companions/worker/README.md)）；`CCG_REQUEST_MODE=native` 被当成维护专用 Worker（`MaintenanceOnly`，模式改为 build）。
2. `/opt/ccgateway/cli/active-runtime.json` 存在时（控制器原地更新写入），按它选 CLI：文件与上级目录必须 root 所有、不可组写/他写、不是符号链接，manifest 里该版本的 SHA-256 在这里算过一次（`CLIChecksumVerified`），模式取自它（`config/active_runtime.go`）。
3. `worker.New` 把 `CLAUDE_CONFIG_DIR`、`CLAUDE_SECURESTORAGE_CONFIG_DIR` 换成账号配置目录后交给 `engine.NewRuntime`；超时取 `REQUEST_TIMEOUT` 与 `CLI_TIMEOUT` 中较小的正值。
4. `NewRuntime`：校验选项（`CCG_API_KEY` 必填、`CCG_ADMIN_KEY` 不能与它相同、槽位 1–64）→ `loadPinnedCLI`（`--version` 要求 ≥ 2.1.287；固定版本时核对版本、SHA-256、补丁标签；`--ccgateway-info` 读能力；非维护专用时 CLI 必须声明 `request_<配置模式>`，否则启动失败）→ 在数据目录下建 `worker-<随机>` 临时目录 → 组装网关、管理、资源三部分 → 启动维护循环（每分钟清理日志、保温资源身份）。
5. 进程收到 SIGTERM/中断：`http.Server.Shutdown`（30 秒），`Runtime.Close` 等在途请求结束、给日志写入器 5 秒排空、删除临时目录。

GOMAXPROCS 按容器 CPU 配额设定（`main.go` 的 `//go:debug containermaxprocs=1`、`updatemaxprocs=1`，CONTRACTS §63.6）。HTTP 服务器：`ReadHeaderTimeout` 10 秒、`ReadTimeout` 30 秒、`IdleTimeout` 180 秒——必须大于核心隧道的 110 秒空闲，`worker/internal/server/timeouts_test.go` 守护（CONTRACTS §63.8）。

**路由**（`worker/internal/server/server.go`、`engine/runtime.go routes`）：

| 路径 | 处理 | 鉴权 |
|---|---|---|
| `GET /health` | Worker 健康（控制器读），未就绪 503 | 无 |
| `GET /admin/features` | 运行能力目录（`features.RuntimeCapabilities`，含 `cli_version` 探针） | 管理密钥 |
| `GET /healthz` | 网关健康（核心读，缓存 30 秒）：`claude_version`、`cli_patch`、`cli_sha256`、`capabilities`、`slots` | 无 |
| `POST /v1/messages`、`POST /v1/ccgateway/probe` | 请求命令（第 2 节） | 网关密钥 |
| `/_ccgateway/resources/…` | 资源代理（第 5 节） | 网关密钥 |
| `/admin/*`、`/admin/cli`、`/admin/runtime` | 管理接口（第 7 节） | 管理密钥 |

网关密钥：`x-api-key` 或 `Authorization: Bearer`，常量时间比较（`engine/request.go keyMatches`）；`CCG_API_KEY` 为空时不校验（只在测试里出现，`NewRuntime` 要求它非空）。管理密钥只认 `Authorization: Bearer <CCG_ADMIN_KEY>`，为空时所有管理接口都拒绝（`AdminAuthorized`）。

**业务准入**（`engine/runtime.go ServeHTTP/admit`）：`/v1/messages` 与 probe 先过 Runtime：关闭中 503；维护专用 409 `configuration_error`；持有维护租约 503；密钥只比较一次并放进 context；密钥正确而 `/admin/cli sync` 发现 CLI 变了时 503（`cliCheck.ready`）。

## 2. `/v1/messages` 一次请求

源码：`engine/request.go`（`Gateway.ServeHTTP`）、`engine/request_command.go`（`serveRequestCommand` 起）。顺序如下，每一步拒绝时有自己的答复：

1. **请求 ID 与日志对象**：`newRequestDiagnostic` 取 `X-Request-ID`（符合 `features.RequestIDPattern`，否则生成 UUID），写回响应头 `request-id`；日志在 `finish` 时收尾（defer）。
2. **鉴权**：密钥不对 401 `authentication_error`。未鉴权的请求不建日志目录、不写任何文件（审核 C7）。
3. **日志入口**：`diagnostic.capture` 决定本请求的日志级别并包一层 `diagnosticWriter`（第 4 节）。
4. **策略头解析**（`admitRequest` → `parseRequestPolicy`）：读 `X-CCGateway-Request-Policy`（`features.ParseWorkerPolicy`，≤ 16 KiB，未知键忽略）。头无效 400；`cli_version` 与 Worker 的 CLI 不同 409；`relay_mode` 决定模式，没有策略头时用容器模式；路径不是 `/v1/messages` 或 probe 404；probe 固定 build 并回 `X-CCGateway-Test-Mode: native_build`。之后：能力门（`requestCapabilityGates`，不满足 409 `configuration_error`）、方法必须 POST（405）、`anthropic-version` 只接受 `2023-06-01`（400）。
5. **fallback credit 跟踪**（`request_credit.go admitCredit`）：核心标了跟踪头的请求先核验资源发放方（自己占一个槽位），答复头带 `Principal`/`Generation`，结束后用 trailer 回执。
6. **并发槽位**：非阻塞地占 `Slots`；满了立即 429 `rate_limit_error`、`Retry-After: 1`。槽位在读请求体之前占（审核 C3）。
7. **读体与单次解析**（`prepareRequest`）：最多 32 MiB（超出 413）；`parseRequestBody` 解析一次，凭据扫描、身份读取、日志摘要与 build 信封都读这一份（CONTRACTS §63.8）。`screenSecrets` 在任何正文落日志之前判断是否转为凭据安全模式。
8. **身份与 agent 上下文**（`resolveRequestContext`，`request_identity.go`、`request_agent.go`）：
   - 身份（CLI 声明 `request_identity_v1` 时启用）：build 下客户端的 `metadata.user_id` 用账号密钥映射（`replace`）；没带的给账号自己的身份，会话由对话第一条消息映射；读不出的当作没带。API Key 账号原样（`client`），OAuth 但不知道登录邮箱时用 CLI 自己的身份（`worker`）。direct 不改 metadata，只在 CLI 支持 agent 上下文时让 CLI 采用客户端的会话 ID。映射密钥是数据目录里的 `request-identity.key`（32 字节，首次生成），按登录邮箱派生（`requestIdentityKey`）。
   - agent 上下文（CLI 声明 `request_agent_context_v1` 且不是 probe）：按 `features.AgentContextHeaders` 读客户端的 CC 上下文头（支持 `client_user_agent_v1` 时加 UA），映射键按客户端会话限定；build 映射 prompt ID，direct 原样。
   - 会话记忆（`session_state.go`，CLI 声明 `build_session_state_v1` 时）：进程内存按（上游会话，线程）记住最后一次完整成功应答的上游 `request-id`、该请求的消息摘要，主线程另记 CLI 报告的 turn 位置与 prompt 哈希（4096 条 LRU、闲置 24 小时）。`attachSessionState` 只对客户端命名的会话、system 首块不以计费头开头、分得出线程（子代理要有 agent ID）的非 probe 请求使用；同一线程有请求在途时并发的请求都不读不写；只在请求消息以被记住请求的消息开头、其后第一条是 assistant 且再无别的 assistant 时，把记忆放进 `CCG_REQUEST_IDENTITY.previous`。`runCLI` 在 `writeOutcome` 报告完整应答、2xx 且 meta 的 `session.thread` 与所查线程一致时调用 `rememberSessionState`，整条记住或不记。规则全文见 [CLAUDE-CODE-BILLING-AND-PROMPT-INJECTION](CLAUDE-CODE-BILLING-AND-PROMPT-INJECTION.md) 第 5 节。
9. **信封或原文**（`prepareInput`，`request_components.go`）：build 把客户端的块原样装进信封（`model`、`messages`、`systemPrompt`、`tools`、`stream`、`parameters`、`attachments: []`、`requestPolicy` = `WorkerPolicy.CLI()`、`runtimeContext.workingDirectory`），客户端没发的键不写；direct 的 stdin 就是原始请求体（只要求是带 `model` 的 JSON 对象），CLI 支持 `direct_billing_v1` 时另给计费上下文。
10. **启动 CLI**（`runCLI`、`requestCommand`）：在 `worker-*/request-<随机>/` 建请求临时目录，参数与环境见下表；build 的工作目录是账号工作目录（`CCG_WORKING_DIRECTORY`），direct 是请求临时目录。超时用 `exec.CommandContext` + `WaitDelay` 2 秒；超时到点时同时给响应写入设截止时间，慢客户端也会被结束。
11. **流式转发**（`requestCommandOutput`）：CLI 的 stdout 是上游响应体，`--response-meta` 文件给出上游状态与响应头。第一次写 stdout 时读 meta、按 `httpfacts.Apply` 选出可转发的头、写状态，此后每块写完立即 Flush。被跟踪的 credit 请求另留副本算回执。
12. **错误来源标记**（`writeOutcome`、`request_error.go`）：CLI 的错误只以 stderr 上的一行 `CCG_REQUEST_ERROR <json>`（协议 `ccgateway.request.error.v1`）交回；上游 HTTP 错误的正文较大时写在 `<meta>.error-body` 旁路文件里，Worker 校验长度后原字节转发。判定顺序：调用方先断开 → 不伪造答复，记 499 或 `client_canceled`；无帧且超时 → 504 `timeout_error`（来源 `timeout`）；响应已开始后出错 → 中断连接（`http.ErrAbortHandler`），不追加 JSON；有帧 → 按帧答复（上游 401 时记下令牌不可用，`noteAuthenticationRefused`）；帧格式不对 → 502 `cli_error_protocol`；进程失败且无帧 → 502 `cli_process_error`。来源头 `X-CCGateway-Error-Source` 与原因头的取值见 CONTRACTS §53.20、[REQUEST-MODES](REQUEST-MODES.md) §1.6。Worker 自己的拒绝一律经 `apiError`，来源 `gateway`、原因按状态码（`gatewayReason`）。
13. **上游请求记录**（`keepUpstreamRequest`，defer 在 `writeOutcome` 之前注册）：CLI 写的 `sent.json`/`sent.body` 在临时目录删除前改名移到日志暂存目录，交给后台写入器（第 4 节）。
14. **日志完成**：`finish` 记 `stage`、`status`、`duration_ms`、`log_status`，读出客户端收到的响应头，把收尾任务交给后台写入器后立即返回。

### 2.1 CLI 的参数与环境

参数（`requestCommand`）：

```
claude request --build|--direct --response-meta <请求目录>/response-meta.json --timeout-ms <毫秒>
       [--header anthropic-version:<值>] [--betas <客户端 anthropic-beta，逗号连接>]
       [--capture-request <请求目录>/sent [--capture-body]]
```

入站的网关凭据从不变成上游凭据：只转 `anthropic-version` 与 `anthropic-beta`；`--capture-*` 只在 CLI 声明 `request_capture_v1` 且本请求在记日志时加，`--capture-body` 只在完整级别、非凭据安全模式时加。

环境（`runner.go baseEnv` + `requestCommand`），每个进程只读一次：

| 来源 | 内容 |
|---|---|
| Worker 自己的环境 | 原样继承，但去掉 `CCG_API_KEY`、`CCG_ADMIN_KEY`（任何大小写，`withoutWorkerSecrets`）；`CLAUDE_CONFIG_DIR`/`CLAUDE_SECURESTORAGE_CONFIG_DIR` 指向账号配置目录 |
| 账号设置 | `/admin/environment` 的语言/时区覆盖（`environment.json`）；`/admin/proxy` 的代理（`proxy.enc`）。`CCG_EXTERNAL_EGRESS=1`（控制器设置，出口由独立容器透明代理）时去掉全部代理变量 |
| 遥测开关 | `DISABLE_AUTOUPDATER`、`DISABLE_TELEMETRY`、`DO_NOT_TRACK`、`DISABLE_ERROR_REPORTING`、`DISABLE_GROWTHBOOK`、`DISABLE_FEEDBACK_COMMAND`、`CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY` 为 1，`CLAUDE_CODE_ENABLE_TELEMETRY=0`，`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`（`telemetryDefaults`） |
| 容器资源 | CLI 声明 `container_resource_reporting_v1` 时 `CCG_REPORT_CONTAINER_RESOURCES=1`（CLI 再读控制器给的 `CCG_ACCOUNT_DISK_QUOTA_BYTES`）；继承来的 `CCG_HARDWARE_PROFILE_PATH` 删除 |
| 本请求 | `CCG_REQUEST_IDENTITY`（身份，同时删 `CLAUDE_CODE_REMOTE_SESSION_ID`）、`CCG_DIRECT_POLICY`（direct 计费上下文）、`CCG_REQUEST_AGENT`（agent 上下文，同时设 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`，让自定义上游的账号也按官方 API 写上下文头） |
| 入口 | `CLAUDE_CODE_ENTRYPOINT` 默认 `sdk-cli`；已配置且不是 `cli` 的值保留。请求自己的入口由 CLI 按计费头设置（`client_user_agent_v1`） |

### 2.2 能力门

`requestCapabilityGates`（`request_command.go`）与核心的预检是同一张表：

| 条件 | 要求的 CLI 能力 |
|---|---|
| build，且不是容器模式（或 CLI 有 info） | `request_build` |
| direct，同上 | `request_direct` |
| build | `build_content_preservation_v1` |
| 带核心策略头 | `request_levels_v1` |
| build 且附件来源需要 v2 或用到 worker 来源 | `build_attachment_sources_v2` |
| build 且计费来源用到 worker | `build_billing_sources_v1` |
| build 且下发了入口 | `build_identity_line_v1` |
| build 且下发了注入 | `build_injection_v1` |
| direct 且下发了入口或计费来源 | `direct_billing_v1` |

Worker 在 `/healthz` 报的能力（`cli_check.go requestCapabilities`）是 CLI 能力与 Worker 自身能力的交集，另加 `build_attachment_sources_v1`（v2 的别名）、`request_policy_mode_v1`（CLI 有 direct 时）、`request_log_policy_v1`（Worker 自己的，总是报）。

## 3. 并发槽位

`Gateway.Slots` 是容量为 `CCG_REQUEST_SLOTS`（默认 4，上限 64）的通道，每个槽位对应一个 CLI 进程（`runtime.go`）。

- 模型请求：非阻塞占用，满了 429 + `Retry-After: 1`，在读体之前。
- fallback credit 的发放方核验：在模型请求占槽之前另占一个。
- 资源操作与资源身份探测：等待槽位（`waitResourceSlot`），到截止时间仍等不到答 503。
- 后台身份保温：没有空闲槽位就跳过这一轮。

## 4. 请求日志

设计：[级别](../../../docs/ccgateway-feature-support/REQUEST-LOG-LEVELS-DESIGN.md)、[查看](../../../docs/ccgateway-feature-support/REQUEST-LOG-VIEWER-DESIGN.md)、[上游请求记录](../../../docs/ccgateway-feature-support/REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN.md)、[级别随请求下发](../../../docs/ccgateway-feature-support/REQUEST-LOG-POLICY-DESIGN.md)、[异步写入](../../../docs/ccgateway-feature-support/REQUEST-LOG-ASYNC-DESIGN.md)；CONTRACTS §64、§65。**核心不记任何请求日志**，日志只在 Worker 的数据卷里。

### 4.1 级别与来源

源码：`request_log_diagnostic.go capture`、`request_log_store.go`。

- 三级：`off` 不记；`summary` 只记形状（metadata、事件、遮蔽后的请求头与响应头、上游请求的事实），不记正文；`full` 另记请求与响应正文。
- 来源（metadata `log_level_source`）：策略头的 `request_log`（`policy`，核心按账号设置或 CCGateway 默认规则解析后下发）；没有时用 Worker 本地级别（`local`）。策略头说 `off` 时本请求完全不建日志。
- 本地级别存在数据目录的 `request-logs.json`（`{"level","full_until"}`）；旧 Worker 的 `request-logs.disabled` 标记读作 off、写 off 时也写它，便于回滚。都没有时为 **off**（2026-10-27 起）。本地 `full` 到 `full_until` 后回到 summary（由后台写入器保存）。
- 级别在请求开始时决定；清空正文会让进行中的请求停止保存正文（`stopContent`）。

### 4.2 文件布局

`<HISTORY_DIR>/request-logs/<随机 UUID>/`，目录名就是日志 ID（metadata `log_directory`），目录与文件权限 0700/0600：

| 文件 | 级别 | 内容 |
|---|---|---|
| `request-headers.json` | 摘要 | 进入 Worker 的请求头，`Authorization`、`Proxy-Authorization`、`X-Api-Key`、`Cookie`、`Set-Cookie`、`X-CCG-Revision` 为 `[REDACTED]`（`safeHeaders`） |
| `events.jsonl` | 摘要 | 事件（`request_received`、`request_command`、`cli_error`、`request_agent`…）；摘要级别每个字符串最多 256 字节 |
| `upstream-request.json` | 摘要 | CLI 发出的请求：方法、URL、按名排序的小写请求头（凭据 `[REDACTED]`）、正文编码/字节数/SHA-256、model、stream、attempts |
| `response-headers.json` | 摘要 | 客户端收到的响应头（遮蔽同上） |
| `metadata.json` | 摘要 | 最后写；状态、阶段、耗时、模式、模型、消息形状、`body_sha256`、`upstream_*`、`body_changed`、会话 ID、错误、`log_status`、`log_dropped_*`、`response_capture` 等 |
| `request.body` | 完整 | 客户端原始请求体 |
| `build-components.json` | 完整 | build 交给 CLI 的信封 |
| `upstream-request.body` | 完整 | CLI 发出的正文（可能带原生补的末尾空白，比较用 `content_sha256`） |
| `response.json` / `response.body` | 完整 | 组装后的完整 Messages 响应；无法组装时为原始字节 |

同级还有：`request-logs.json`（本地级别）、`request-logs-staging/`（上游记录暂存，启动时清空）、`request-logs.deleted-*`（关闭或清空时挪开、随后删除，启动时补删）。

### 4.3 异步写入（`request_log_sink.go`）

请求路径上没有日志磁盘 I/O：请求只把工作交给后台写入器。

- 每个日志库一个写入器：任务队列 8192、在途字节上限 128 MiB（原子计数）、**单个 goroutine** 按入队顺序执行，所以同一请求的文件先于它的 `metadata.json` 落盘。
- `submit` 从不等待：队列满或字节超限即丢弃，请求的 metadata 记 `log_status: partial`、`log_dropped_bytes`/`log_dropped_writes`，`events.jsonl` 补一条 `log_dropped`。收尾任务用 `submitAlways`（队列满时由一个 goroutine 代为等待），不会丢。
- 任务 panic 只计数、记 Worker 日志，写入器继续。停止时排空 5 秒。
- 锁的顺序 `store.io → store.mu → d.mu`，只有 `store.io` 会跨磁盘持有，而请求从不拿它（文件头注释与 `request_log_diagnostic.go` 锁说明）。

**响应组装**（`request_log_response.go`）：`diagnosticWriter` 先写给客户端，再把这块的副本交给写入器；收尾时按 `Content-Type` 组装——SSE 还原成一条完整 Messages 响应（`response.json`），JSON 原样（校验合法），带压缩编码或其他类型存原始字节（`response.body`）。metadata 记 `response_capture`（`complete`/`truncated`/`dropped`/`omitted`）、`response_assembled`、`response_events`。不再保存原始 SSE。

**上游请求**（`request_log_upstream.go`）：只在 CLI 确实发出时保存（有响应 meta，或错误帧来源是上游 `http`）；文件先改名到暂存目录（同盘改名，请求路径不读不拷），后台读 `sent.json`（≤ 256 KiB）写成 `upstream-request.json`、平铺搜索字段，再把正文移成 `upstream-request.body`。`body_changed` 比较客户端正文与上游正文的 `content_sha256`（去掉末尾空白）。

### 4.4 凭据安全模式

`diagnostic_secrets.go prepareSecrets`：请求带 `fallback-credit-*`/`server-side-fallback-*` beta、正文不是合法 JSON（含 float64 放不下的数字）、或正文里有凭据键（`authorization_token`、`fallback_credit_token`，不分大小写，`\u` 转义拼写也识别）时，metadata 记 `capture_policy: structured_redacted_only`：不保存原始正文与响应正文（`response_capture: omitted`），不请求 `--capture-body`，其余文件按检测到的令牌遮蔽（`redactCapture`），`events.jsonl` 以外的追加写跳过。

### 4.5 预算与清理

`request_log_diagnostic.go` 常量、`request_log_prune.go`：

| | 摘要 | 完整 |
|---|---|---|
| 保留 | 7 天 | 24 小时 |
| 总预算 | 128 MiB | 512 MiB |
| 单请求上限 | 256 KiB | 64 MiB |

单请求超限后停止记录，metadata 记 `log_status: truncated`、`log_limit_bytes`、`log_overflow_stage`。清理按目录时间从旧到新：正文文件按完整的保留与预算删，整个目录按摘要的保留与预算删；没有 metadata 的中断目录超过 24 小时删。清理由维护循环每分钟执行，请求只发一次非阻塞的提醒（`pruneDue`）。只删名字是 UUID 的目录。

### 4.6 设置与查看接口

- `GET /admin/request-logs`：本地级别、`full_until`、各级限制、`usage`（`summary_bytes`、`full_bytes`、`requests`）、`viewer`/`viewer_search`/`clear_all` 能力位。
- `PUT /admin/request-logs`：`{"level":"off"|"summary"}`、`{"level":"full","full_for_hours":1|4|24}`、`{"clear_full":true}`（删全部正文、留摘要）、`{"clear_all":true}`（删全部日志、级别不变）、旧核心的 `{"enabled":bool}`。设为 off 会结束进行中请求的日志并删除已有日志；策略头的 off 只是不记，不删（CONTRACTS §65.1）。
- `POST /admin/request-logs/query`：内存索引分页（默认 50、最多 100），按请求 ID、状态、模型、级别、时间、模式、会话 ID、SHA-256（客户端或上游，大小写不限）、`changed` 筛选。
- `POST /admin/request-logs/detail`：一个请求的 metadata、文件列表、事件（不要正文时事件有上限 2000 条/2 MiB）。
- `POST /admin/request-logs/read`：按块读正文文件（每块最多 1 MiB）。谁能读正文由核心决定（`settings:manage` 且审计）。

## 5. 资源身份与资源代理

源码：`resource_http.go`、`resource_identity*.go`、`resource_carrier.go`、`resource_spool*.go`、`resource_concurrency.go`；合同 `contracts/resources`。

- 路径前缀 `/_ccgateway/resources`。`GET /_ccgateway/resources/identity`（无 query、无正文）是身份探测；其余只放行 `/v1/files`、`/v1/skills` 的白名单操作（`resources.ValidateOperation`），上传必须是带 boundary 的 multipart。
- 身份：启动 CLI 核验当前凭据的发放方（`principal_id`、`generation`、`auth_type`），按凭据指纹缓存 10 分钟（凭据变化即重新核验）；账号最近 30 分钟有请求时，满 8 分钟在后台重新核验（`keepIdentityWarm`，CONTRACTS §63.4）。冷缓存的核验同一时刻只跑一次。API Key 账号需要托管的 `CCG_RESOURCE_ISSUER_ID`/`CCG_RESOURCE_ISSUER_GENERATION`，没有时立即 503 `resource_identity_unsupported`。
- 授权锁：重新授权与资源操作独占，身份探测与被跟踪的 credit 请求共享；拿不到锁或槽位 503。每个操作 10 分钟截止。
- 请求核对 `X-CCGateway-Resource-Principal`/`-Generation` 与核验结果，不符 409；答复带同样两个头。
- 资源 IO 走独立的管理 HTTP（不经模型 runner）。上传与响应先落盘（`resource-spool/`）：单个正文上限 `CCG_RESOURCE_BODY_LIMIT_BYTES`（默认与上限 512 MiB），总暂存 `CCG_RESOURCE_SPOOL_LIMIT_BYTES`（默认 1 GiB，上限 4 GiB）。

## 6. 固定 CLI 校验

源码：`cli_pinned.go`、`cli_check.go`、`runner.go`、`worker/internal/config/active_runtime.go`。

- 启动时：`claude --version`（10 秒）→ 版本 ≥ 2.1.287；固定了版本（`WORKER_CLI_VERSION`/`CCG_CLI_SHA256`/`CCG_CLI_PATCH` 任一非空，或 active-runtime）时三项都必须给、版本与可执行文件一致、SHA-256 一致（active-runtime 已算过则不重算）；`claude --ccgateway-info`（15 秒，去掉 Worker 密钥、`DISABLE_AUTOUPDATER=1`）输出 ≤ 8 KiB 的 `{version, patch, capabilities}`，版本须一致、补丁标签须等于固定值。任一失败 Worker 不启动（维护专用且未固定版本时除外，能力为空）。
- 能力只按 `--ccgateway-info` 的列表判断，从不按版本号推断。
- 运行中：`POST /admin/cli {"action":"sync"}` 重新读 `--version`；与启动时不同或读不到时业务请求 503，`catalog.state=failed`，恢复后自动放行。CLI 不会被原地替换：新 CLI 是控制器的配对更新（Worker+CLI 一起换，第 7 节 `/admin/runtime`）。
- 启动时的版本门（≥ 2.1.287）与错误文字里提到的 `CCG_CLAUDE_PATH`（`resolveCLI`）是早期留下的；实际读的变量是 `WORKER_CLI_PATH`。

## 7. 管理接口

全部要 `Authorization: Bearer <CCG_ADMIN_KEY>`，`Cache-Control: no-store`。源码：`auth.go`（路由表 `serveSubRoute` 与 `ServeHTTP`）、`cli_management.go`、`runtime_maintenance.go`、`usage.go`、`proxy.go`、`runtime_environment.go`、`worker/internal/server/features.go`。

| 接口 | 作用 |
|---|---|
| `GET /admin/status` | 本地授权快照（不启动 CLI）：登录状态、订阅类型、邮箱、环境覆盖 |
| `GET /admin/auth/session`、`POST /admin/auth/{start,complete,cancel}` | OAuth 授权码登录会话 |
| `POST /admin/auth/refresh` | 让 CLI 自己刷新令牌（刷新令牌动作） |
| `POST /admin/auth/logout` | `claude auth logout` |
| `GET/PUT /admin/proxy` | 账号代理（加密存 `proxy.enc`） |
| `GET/PUT /admin/environment` | 账号语言/时区覆盖（`environment.json`） |
| `GET/PUT /admin/request-logs`、`POST /admin/request-logs/{query,detail,read}` | 请求日志（第 4.6 节） |
| `GET /admin/usage` | 用存储的 OAuth 令牌查订阅用量（未登录 400；上游拒过的令牌在改变前直接报不可用） |
| `GET/PUT/POST /admin/cli` | CLI 视图（字段形状沿用旧的工具目录状态，`tool_count` 恒 0）；PUT `{"auto_update","channel"}`，固定版本时开自动更新 409；POST `{"action":"check"}` 查 `https://downloads.claude.ai/claude-code-releases/<stable|latest>` 的最新版本号，`{"action":"sync"}` 重新读 CLI 版本 |
| `GET/POST /admin/runtime` | 维护租约：`pause`（无在途请求时发 48 位十六进制租约，5 分钟）、`validate`（续期）、`resume`；租约期间业务请求 503 |
| `GET /admin/features` | 运行能力目录（Worker 程序自己的路由） |

## 8. 与核心的契约：`WorkerPolicy`

核心每个请求带 `X-CCGateway-Request-Policy`，线形是 `contracts/features.WorkerPolicy`（`features/wire.go`，CONTRACTS §53.18、§65.3）。只有 Worker 读的键，核心只存不发的设置不在线上。

| 键 | 类型 | Worker 怎么用 |
|---|---|---|
| `schema_version` | int | 必须是 0（缺省）或 `PolicySchemaVersion` = 1 |
| `relay_mode` | `build`/`direct` | 本请求模式，由注入等级推出（0 → direct）；空用容器模式 |
| `cli_version` | `x.y.z` | 必须等于 Worker 的 CLI 版本，否则 409 |
| `build_billing_sources` | 对象 | 计费头字段来源，进 CLI 信封（direct 进 `CCG_DIRECT_POLICY`）；默认 `client` 的项不发 |
| `build_billing_entrypoint` | 字符串 | 计费头入口；默认 `sdk-cli` 不发 |
| `build_attachment_sources` | 对象 | 环境附件来源（等级低及以上才发） |
| `build_injection` | 对象 | 非 CC 请求补的层，只含本等级加上的项（`Effective()`） |
| `request_log` | `off`/`summary`/`full` | 本请求日志级别；空用 Worker 本地级别。资源请求的策略头只有这一个键 |

- 解析：≤ 16 KiB，先过 schema 校验（`ValidatePolicySchemaJSON`），未知键忽略（发布顺序先插件后核心，新 Worker 要接受旧核心的多余键）。
- 交给 CLI 的部分：`WorkerPolicy.CLI()` → 信封的 `requestPolicy`（`contract_version` = 2 与上面四个 build 键）。
- 跨层夹具：`contracts/testdata/core-worker-policies.json`（核心生成、engine 读同一份字节）、`contracts/testdata/worker-cli-requests.json`（Worker → CLI 的请求字节）。改动后用 `CCG_UPDATE_CONTRACT_FIXTURES=1` 重新生成并检查差异。
- 能力名常量都在 `contracts/features`（`attachments.go`、`identity_line.go`、`injection.go`、`levels.go`、`request_modes.go`、`agent_context.go`、`wire.go`）。超时缺省 `features.RequestTimeout` = 1 小时（`timeouts.go`）。

## 9. 相关文档

- 模式、策略、能力门、错误来源：[REQUEST-MODES](REQUEST-MODES.md) §1
- build 信封与 CLI 组装：[BUILD-REQUEST-COMPONENTS-DESIGN](BUILD-REQUEST-COMPONENTS-DESIGN.md)
- 身份行与注入等级：[CC-INJECTION-LEVELS-DESIGN](../../../docs/ccgateway-feature-support/CC-INJECTION-LEVELS-DESIGN.md)
- agent 上下文：[SUBAGENT-REQUEST-CONTEXT-DESIGN](SUBAGENT-REQUEST-CONTEXT-DESIGN.md)
- 上游请求头的来源：[REQUEST-HEADERS](../../../docs/ccgateway-feature-support/REQUEST-HEADERS.md)
- 容器生命周期与原地更新：[ACCOUNT-RUNTIME-LIFECYCLE](ACCOUNT-RUNTIME-LIFECYCLE.md)、[控制器 README](../companions/controller/README.md)、CONTRACTS §53.7
- 升级 CLI：[CLI-UPGRADE-RUNBOOK](CLI-UPGRADE-RUNBOOK.md)
