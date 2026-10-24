# CCGateway 请求工作流静态核对（拆分 → 组装 → 出口）

2026-10-24。审核对象：`feat/next-platform` HEAD `c949810e2`（线上核心 0.1.186 / 插件 0.1.87 / CLI v23，CLI profile `ccgateway-v23-bound-imports`，固定 2.1.304）。只读核对，不改代码。CodeGraph/Serena/WarpGrep 不可用，全部用 Read/Grep/git 与 `artifacts/` 里的历史抓包；§7 已并入 `01-offline.md`（17:23）与 `02-prod31.md`（17:37）的实测结果。

本文回答一个问题：一次客户端请求经过「核心 → 插件 → Worker → CLI 补丁 → 上游」之后，**出口（发给 Anthropic 的请求）里每个请求头与 body 字段的值是从哪来的**，以及**哪里会与官方 Claude Code 客户端不一致**。

---

## 0. 结论（先看这几条）

1. **请求头不是「透传」，而是「重新生成」**：核心只把 manifest `passHeaders` 列出的 13 个客户端头交给插件；插件按同一份 11 头的上下文表 + `anthropic-version`/`anthropic-beta` 再筛一次；Worker 只把它们变成 CLI 参数与环境变量；**上游请求的每一个头都由 Worker 容器里的原生 SDK / 原生 `nl()` / 补丁重新写出**。客户端头里真正「值原样」到上游的只有：`anthropic-version`、`anthropic-beta`（集合原样，**顺序会因原生追加项而变**，见 A5）、5 个请求上下文头、prev-tool-durations + 4 个压缩头、以及满足条件的 `user-agent`。两轮动态实测：出口 24 个头名称与顺序与官方相同、无网关头泄漏。
2. **body 对 CC 客户端基本逐字节保真**：build 用 `ccgatewayWireMessage` / `ccgatewaySystemBlocks` / `ccgatewayWireTools` 三处 wire 保真注入原生构造器，direct 在原始 JSON 文本上只改 system。两轮实测确认（`01-offline` 30 场景、`02-prod31` 13 次真实请求）：主线程/子代理/多轮/压缩的 body 键集合、键序、值与官方一致，差别只有被映射的 ID、`metadata` 与 `cch`；direct 与入站请求逐字节相同。
3. **两个静态可确认的出口差异**（都不在现有事实文档里），**均已被两个动态报告实测确认**（`01-offline.md`、`02-prod31.md`）：
   - **请求行缺 `?beta=true`**：官方 `beta.messages.create` 打的是 `/v1/messages?beta=true`，我们的 `model-request.js` 直接 `client.post('/v1/messages')`；history 抓包 26/26 vs 74/74，`01-offline` 49/49 A 对 54/54 B，`02-prod31` 同。见 §4-D1。
   - **非 CC 请求自己补的计费头 `cch=00000`**（官方运行时才算 5 位十六进制）；CC 请求保留客户端自己的 cch（两种模式都实测逐请求相等），不受影响。见 §4-D2。
4. **文档有若干处已过期**（`stream`/`system` 缺省填充、HEAD 与工作树的差别、stream:false），见 §5；两条已被 `01-offline` 实测确认（出口无 `stream` 键）。
5. **一个会影响真实请求的契约缺口（P1）**：请求头带 `fallback-credit-2026-06-01|2026-07-01` 或 `server-side-fallback-2026-07-01` 之一（不需要 token）→ 上游 200 后核心仍报错、客户端拿 502，`02-prod31` 两次复现，见 §4-D3。影响面是「任何主动带这几个 beta 的用户」，不是只有兑换场景。
6. 下面 §3 的表是本文的主要产出；§6 是给动态验证队友的期望清单（两轮实测结果已在 §7 归因）。

---

## 1. 静态链路与「拆分」发生在哪

```
客户端 ──► 核心 gateway.serve（pipeline.go:124）
             ├ passHeaders：只取 manifest 列的 13 个客户端头（pipeline.go:638-646 → dispatch.go:428）
             ├ 账号模型映射、资源/信用/helper 准备（dispatch.go:399-419, 542-558）
             └ managed CCGateway：ModelClientForRequest（client.go:103-119）
                  ├ clone 到 Worker 地址（client.go:306-314）
                  ├ 注入 X-CCGateway-Request-Policy（client.go:318-343）
                  └ 删 Authorization、改 x-api-key=Worker 密钥、删 X-CCG-Revision（client.go:347-351）
        ──► 插件（gRPC，BuildUpstreamRequest）
             ├ headers()：content-type + anthropic-version 默认，
             │   anthropic-version/beta 原值，11 个上下文头按正则校验后转发（ccgateway.go:114-139）
             └ 虚拟 URL https://ccgateway.internal/v1/messages，另加
                x-ccgateway-session-scope、x-request-id（ccgateway.go:152-168）
        ──► Worker：POST /v1/messages
             ├ admitRequest：路径/方法/anthropic-version/CLI 版本/能力门（request_command.go:97-116）
             ├ prepareRequest：读 body、解身份与 agent 上下文（120-132、239-299）
             ├ prepareInput：build → 组件信封；direct → 原 body（302-331）
             └ requestCommand：`claude request --build|--direct` + 参数/env（387-427）
        ──► CLI（Worker 容器里，一次请求一个进程）
             ├ 原生构造器 jOt/qmn 产出 body（build）或原 body（direct）
             ├ 原生 sF 创建 SDK 客户端 → 原生 SDK 生成 default headers
             └ 补丁在 fetch 边界只覆盖 anthropic-version / anthropic-beta（request-options.js:90-116）
        ──► 上游（Anthropic，或 API-key 账号配置的 base_url）
```

**拆分的三个关键点**

- **核心的「头白名单」是 manifest**（`plugins/ccgateway/manifest.json:81-95`、`140-154`）：managed 与 apikey 两种账号类型都列了同样 13 个名字。`passHeaders` 用 `gin.GetHeader`（只取第一个值）并按小写名放进 `InboundHeaders`（`server/internal/gateway/pipeline.go:638-646`）。
- **插件的第二道白名单**是 `features.AgentContextHeaders` + `features.ClientUserAgent`（`contracts/features/agent_context.go:43-65`）；值不匹配正则的头**丢弃而非拒绝**（`ccgateway.go:124-129`）。
- **Worker 只读 4 类东西**：`anthropic-version`（必须 2023-06-01）、`anthropic-beta`（转 `--betas`）、`X-CCGateway-Request-Policy`、11 个上下文头（转 `CCG_REQUEST_AGENT`）。**其余一切入站头丢弃**（`request_command.go:137-164, 239-299, 387-396`）。所以核心/插件/Worker 之间加的任何私有头（policy、resource、credit、session-scope、x-request-id）**都不可能出现在上游**。

**组装的三个关键点**

- **build 的 body 由原生构造器产出**：Worker 只写组件信封（`request_components.go:20-63`），CLI 用 `prepareBuildInput` 还原成 CC 记录（`request-input.js:237-245`），`jOt` 生成 `$c`，补丁再用 `ccgatewaySystemBlocks` / `ccgatewayWireMessages` / `ccgatewayWireTools` 覆盖回客户端的 wire 形态（`patch-cli-2.1.304.cjs:101-120`）。
- **build 的请求头由原生 `sF` 产出**：补丁把 `querySource`/`requestClass`/`agentContext`/`promptId` 交给原生，`PVs`/`IVs`/`o1r` 自己写 `x-claude-code-*`；计费头由 `kLo` 生成并被 `ccgatewayCaptureBilling` 捕获（`patch-cli-2.1.304.cjs:140`）。
- **direct 只改 system 的计费头**：`applyDirectBilling` 在原始 JSON 文本上 splice（`direct-billing.js:16-27`），其余字节不变；身份只用于让 CLI 采用客户端会话（`request-command.go:262-277` + `request_identity.go:295-337`）。

---

## 2. 需要留意的「非请求」路径

| 路径 | 行为 | 依据 |
|---|---|---|
| 账号测试 `/v1/ccgateway/probe` | 固定 build、不带客户端上下文（原生主线程），响应带 `X-CCGateway-Test-Mode: native_build` | `request_command.go:153-163`；插件 `BuildTestRequest`（`ccgateway.go:170-182`） |
| 能力预检 `GET /healthz` | 核心发送模型请求前读 Worker 能力与 CLI 版本，按路由缓存 30s | `runtime_features.go:54-69`；`request_cache.go:253-266` |
| count_tokens | 插件不声明 → 核心 404，不到 Worker | manifest 无 count_tokens；`ccgateway.go:147-151` |
| 资源（Files/Skills） | 独立管理 HTTP（Worker resource broker），不走 CLI | `engine/resource_http.go:63-110` |
| helper history | 核心仍 `EnableHelperHistory: true` 且会探测；Worker 的 requirement 路由**已删除**（404→`DeferToOrdinary`），`/admin/features` 也不再声明 `helper_history_schema_versions`，所以只有库里已有 `KnownReady` 链的会话会在发送前 400。见 §4-R8 | `server/internal/app/phases.go:290`；`helper_history_request.go:87-120,261-320`；`engine/helper_history_requirement_test.go`（断言 404）；`worker/internal/server/features.go:51-57` |
| 出口报文记录 | **不存在**：请求日志只有 `request.body`/`request-headers.json`/`build-components.json`/`events.jsonl`/`response.*`；`upstream*` 文件类型只属已删除的 legacy relay。出口只能「同镜像 + 同 CLI 回放同一份入站 body/头」取证 | `engine/request_log_diagnostic.go:65`；`engine/request_log_viewer.go:416-427` |

---

## 3. 主表：出口值来源

来源图例：**客户端原样**（值就是客户端发的那份）｜**原生重算**（Worker 容器里的原生 CLI/SDK 当场生成）｜**账号替换**（用账号凭证或账号私钥派生）｜**网关补充**（链路自己加，客户端没发）｜**丢弃**。

### 3.1 请求行与传输层

| 出口项 | 来源 | 依据（HEAD） | 备注 |
|---|---|---|---|
| method | 原生重算（固定 POST） | `cli-mods/model-request.js:74-83` | Worker 只接受 POST（`request_command.go:109-111`） |
| path / query | 原生重算：`/v1/messages` | `model-request.js:78` `client.post('/v1/messages', …)` | **官方是 `/v1/messages?beta=true`**（原生 `beta.messages.create`，`chunk-38xgev2z.js`）；抓包 26/26 vs 74/74，`01-offline` 49/49 vs 54/54，`02-prod31` 亦同 —— 见 §4-D1（**已实测确认**） |
| Host / baseURL | 账号替换（账号上游地址） | `sF` 的 baseURL（原生）；API-key 账号来自容器 env `ANTHROPIC_BASE_URL`（`ccgateway.go:82-91`） | OAuth 托管账号=api.anthropic.com |
| TLS/HTTP 版本、头序列化 | 原生重算（Worker 的 Bun 1.4.3） | `cli-mods/README`、`REQUEST-HEADERS.md:32` | 官方内嵌 Bun 1.4.4，指纹不可声称一致（已知边界） |
| accept | 原生重算 `application/json` | 原生 SDK `buildHeaders` | 与官方一致 |
| accept-encoding | 原生重算（Bun fetch） | 同上 | 抓包 `gzip, deflate, br, zstd`，与官方一致 |
| content-type | 原生重算 `application/json` | `model-request.js:76` | — |
| content-length | 传输层 | — | 随 body 长度 |
| connection / host | 传输层 | — | 两跳都重新生成 |

### 3.2 请求头

| 出口头 | 来源 | 依据（HEAD） | 主线程 | 子代理 | 辅助/压缩 | 非 CC |
|---|---|---|---|---|---|---|
| `authorization` | **账号替换**：CLI 自己登录令牌（OAuth） | 原生 `sF.authHeaders`；客户端 Authorization 在核心即被删（`server/internal/ccgateway/client.go:347-351`） | ✓ | ✓ | ✓ | ✓ |
| `x-api-key` | **账号替换**（API-key 账号） | 原生 SDK；`apiKeyRequestHeaders` 校验（`request-options.js:101-107`） | ✓ | ✓ | ✓ | ✓ |
| `user-agent` | **客户端原样**，仅当 ① CC 形状 ② 发出请求的计费头 `cc_version`+`cc_entrypoint` 与客户端首块计费头完全相同；否则**原生重算** `claude-cli/2.1.304 (external, <请求入口>…)` | 插件校验 `features.ClientUserAgent`（`agent_context.go:65`，`ccgateway.go:124-129`）；Worker 读入 `CCG_REQUEST_AGENT.client.user_agent`（`request_agent.go:39-51,64-80`）；`keepClientUserAgent`（`request-agent.js:122-129`）；`nl()` 补丁（`patch-cli-2.1.304.cjs:136`） | 默认保留 | 保留 | 保留 | 原生 |
| `x-app` | **原生重算**（`cli`/`cli-bg`） | 原生 `nl()` | ✓ | ✓ | ✓ | ✓ |
| `x-stainless-lang/pkg-version/os/arch/runtime/runtime-version` | **原生重算**（反映 Worker 容器运行时） | 原生 SDK `S5n()`（`chunk-qm6t5b60.js`），补丁未改 | ✓ | ✓ | ✓ | ✓ |
| `x-stainless-retry-count` | 原生重算 `0` | `maxRetries:0`（`request-command.js:203`，`model-request.js:81`） | ✓ | ✓ | ✓ | ✓ |
| `x-stainless-timeout` | 原生重算 `min(Worker 期限, 600s)/1000`（默认 600） | `model-request.js:81`；Worker `--timeout-ms`（`request_command.go:388`） | 600 | 600 | 600 | 600 |
| `x-client-request-id` | **原生重算**（每请求随机） | 原生 fetch 包装 `cy`（`chunk-38xgev2z.js`，`B.set(wke,ey())`） | 每次新值 | 同左 | 同左 | 同左 |
| `x-claude-code-session-id` | **网关补充**：body `metadata.user_id.session_id` → build 映射/或客户端原值 → `CCG_REQUEST_IDENTITY` → 补丁 `Yi` 让根会话用它 → 原生 `nl()` 写头 | `request_identity.go:120-129,295-337`；`request_command.go:401-404`；`patch-cli-2.1.304.cjs:71-72`；`request-identity.js:29-31` | build+OAuth=映射值；API-key=客户端值 | 同主线程（同一会话） | 同左 | 有 metadata 才一致，否则每请求随机 |
| `x-claude-code-request-class` | **客户端原样**（经 `CCG_REQUEST_AGENT.client.request_class`，由原生 `PVs` 重写）；缺失时按计费头 `cc_is_subagent` 推 subagent，否则 main | `request_agent.js:79-113`；原生 `PVs`/`rs8` | main | subagent | 客户端值（`auxiliary`/`compaction` 等） | main |
| `x-claude-code-agent-id` | **客户端原样**（不做账号映射）；缺失时按首条提示派生 `a`+16hex | `request_agent.js:95-105`（`agentID(derive(key,'agent-text',prompt))`） | 不发 | 客户端值/派生 | 视类别 | 不发（主线程） |
| `x-claude-code-parent-agent-id` | **客户端原样**（缺失不发） | 同上 | 不发 | 嵌套时有 | — | 不发 |
| `x-claude-code-agent-type` | **客户端原样**（`custom` 走 `agent:custom`）；缺失时由 querySource 推出 `custom` | `request_agent.js:104`；原生 `IVs` | 不发 | 客户端值 | — | 不发 |
| `x-claude-code-prompt-id` | **客户端原样**（API-key / direct）或 **账号替换**（build+OAuth：`uuidV4(HMAC(会话密钥,'prompt',clientPrompt))`） | `request_agent.js:84-94`；`request-identity` 无参与（仅 session） | 有 | 有（与父同值） | 有 | 派生值（无客户端值时） |
| `x-claude-code-prev-tool-durations` | **客户端原样** | `request_agent.js:91-92`（loopFields）→ `request-command.js:131` | 有则发 | 有则发 | 有则发 | — |
| `x-cc-compaction-request` / `x-claude-code-compaction` / `x-cc-context-compacted` / `x-claude-code-context-compacted` | **客户端原样** | 同上 | — | — | 有则发 | — |
| `anthropic-version` | **客户端原样**（插件对缺失补 2023-06-01；Worker 只接受这一个值） | `ccgateway.go:114-123`；`request_command.go:112-114`；`request-options.js:46-55,111-116` | 2023-06-01 | 同 | 同 | 同 |
| `anthropic-beta` | **客户端原样集合**（顺序保留）∪ **原生重算**（build 构造器可能追加；OAuth 账号补 `oauth-2025-04-20`） | build：`request-build.js:172,243` + `setProtocolHeaders`（`request-options.js:111-116`）；direct：同函数；OAuth 追加见 `request-options.js:96` | 客户端 ∪ 原生；**顺序已知差异**：`oauth-2025-04-20`、`extended-cache-ttl-2025-04-11` 被追加到末尾，官方分别在固定位置（`02-prod31` §4.1 实测集合相同、顺序不同） | 5m 缓存，无 `extended-cache-ttl` | 按 querySource | 依注入层 |
| `anthropic-dangerous-direct-browser-access` | 原生重算 `true` | 原生 `dangerouslyAllowBrowser:!0`（`sF`） | ✓ | ✓ | ✓ | ✓ |
| 其他任何客户端头（`x-stainless-*`、`x-app`、`accept`、`cookie`、`x-request-id`、`x-claude-code-session-id` 原值…） | **丢弃** | 核心 `passHeaders` 白名单（`pipeline.go:638-646`） | 丢弃 | 丢弃 | 丢弃 | 丢弃 |

> 「客户端原样」的 5 个上下文头 + 4 个压缩头 + prev-tool-durations 之所以能原样出去，是因为 `request-command.js:131` 把它们放进 `outgoing.headers`，SDK 最后一级 `r.headers` 覆盖默认头；而 `np`/`nl` 之外的头不会被 SDK 过滤。

**核心/Worker 私有头（都不出口）**

| 头 | 谁加 | 谁读 | 依据 |
|---|---|---|---|
| `X-CCGateway-Request-Policy` | 核心 | Worker（`ParseWorkerPolicy`） | `client.go:318-343`；`request_command.go:137-152` |
| `x-ccgateway-session-scope` | 插件 | **无人读**（native 清理后残留） | `ccgateway.go:162`；engine 全目录 grep 无消费者（见 §4-D4） |
| `x-request-id`（核心 rid） | 插件 | Worker 只用于日志 id 与响应 `request-id` | `ccgateway.go:163-167`；`request_log_diagnostic.go:275-280` |
| `X-CCGateway-Resource-*`、`X-CCGateway-Fallback-Credit(-Track)` | 核心 | engine 请求命令路径**不读** | `resource_references.go:222-225,266`；`fallback_credit.go:137-140`；见 §4-D3 |

### 3.3 body 字段（build / direct 对照）

| 字段 | build（来源） | direct（来源） | 依据 |
|---|---|---|---|
| `model` | 客户端（经核心账号映射）→ 原生 `fC()` 归一 | 客户端（字节） | `dispatch.go:399-409`；`request-build.js:198`；`request-options.js:84` |
| `messages` | 客户端原样（`ccgatewayWireMessages` 覆盖原生结果） | 客户端字节 | `request-input.js:250-257,261-267`；`patch-cli:112-113` |
| `system` | 客户端块原样（内容策略只改已识别环境行）→ 计费头合并 → 条件身份行 | 客户端字节 + 计费头 splice（字符串 system → 块数组） | `request-build.js:234,241-243`；`content-policy.js:369-399`；`direct-billing.js:16-39` |
| `tools` | 客户端原样（键序、键名；`input_schema`↔`inputSchema` 原位往返） | 客户端字节 | `request_components.go:126-168`；`request-parameters.js:41-52`；`request-build.js:211` |
| `tool_choice` | 原生重算（客户端值作为 `toolChoice` 选项） | 客户端 | `request-build.js:202`；`patch-cli:115` |
| `max_tokens` | 原生重算（`maxOutputTokensOverride`） | 客户端 | `request-build.js:203` |
| `thinking` | 原生重算（由 `thinkingConfigFor` 映射回） | 客户端 | `request-build.js:142-145,182` |
| `temperature` | 原生重算（`temperatureOverride`，模型规则可省略） | 客户端 | `request-build.js:204` |
| `metadata` | **账号替换**：build 有客户端身份→按账号密钥映射（`replace`）；没有→删掉原生 metadata | 客户端原样 | `request-identity.js:66-78`；`request_identity.go:120-129,295-337` |
| `context_management` | 客户端（参数并回，覆盖原生） | 客户端 | `request-parameters.js:14,55-73` |
| `output_config.effort/format` | 原生重算 | 客户端 | `request-build.js:203-204`；`request-parameters.js:63-71` |
| `output_config` 其他子键 | 客户端并回 | 客户端 | `request-parameters.js:63-71` |
| `top_p`、`top_k`、`stop_sequences`、`service_tier`、`safeguards`、`speed`、`mcp_servers`、`container` 等 | 客户端并回（原生不拥有） | 客户端 | `request-parameters.js:14-20,60-61` |
| `diagnostics` | 仅客户端发时原样 | 客户端 | `request-parameters.js:20,62` |
| `stream` | 仅客户端发时，置于最后一个键 | 客户端 | `request-input.js:243`；`request-build.js:246-248` |
| `betas`（body 里的，非 CC 常规） | 不并回 body，并入请求头 | 客户端 | `request-parameters.js:14`；`request-build.js:172` |

### 3.4 四类请求的差异

| 维度 | CC 主线程 | CC 子代理 | CC 辅助/压缩 | 非 CC |
|---|---|---|---|---|
| 判定 | system 任一块首行是 `x-anthropic-billing-header:` 且 `cc_is_subagent≠true` | 同上且 `cc_is_subagent=true`，或客户端 request-class 头 | 客户端 request-class 头（`auxiliary`/`compaction`/…） | system 中任何块都没有计费头 |
| 出口 request-class | main | subagent | 客户端值原样 | main（无客户端头时） |
| 出口 agent 头 | 无 | agent-id/agent-type/parent（客户端值）、prompt-id | 无（除非客户端发） | 无 |
| 计费头 | 客户端原样；缺字段/worker 来源时补原生值；`cc_prompt_id` 与 prompt-id 头同步映射 | 同左，带 `cc_is_subagent=true`、无 turn 字段 | 同左 | 若缺 → **网关补充**完整主线程原生行（含 `cc_prompt_id`/turn 字段/`cch=00000`） |
| 身份行 | 客户端有就留、没有不补 | 同左 | 同左（CC 的辅助请求本来没有） | OAuth build：按入口补一句（高注入+有客户端 system → `official_cli_sdk`，否则 `agent_sdk`；cli → `official_cli`）；API-key 账号不补 |
| 注入层（`build_injection`） | 不做 | 不做 | 不做 | 按等级：附件 / 提示词 / 工具 |
| 缓存 TTL / beta | 客户端自己的标记；`sdk`→1h | `agent:*`→5m，无 `extended-cache-ttl` | `compaction`→`compact` | 视 querySource |

依据：`content-policy.js:369-399,460-473,486-506`；`request-agent.js:79-113`；`request-build.js:151-184,227-250`；`request-entry.inc.js:32-57`；`direct-billing.js`；`patch-cli-2.1.304.cjs:101-120`。

### 3.5 响应回头（反向，简记；不在主表范围）

| 出口项（Worker→核心→客户端） | 来源 | 依据 |
|---|---|---|
| 状态、`Content-Type`、`request-id`/`anthropic-request-id`/`retry-after`/`x-should-retry`/`anthropic-ratelimit-*`/`anthropic-fast-*` | 上游原值（经 `httpfacts.Select` 白名单） | `contracts/httpfacts/httpfacts.go`；Worker `engine/request_command.go:520-528`、`request_error.go:172-190` |
| 其余上游头（`set-cookie`、`x-internal-route`、`server` 等） | **丢弃** | 同上 |
| `X-CCGateway-Error-Source`/`-Reason`、`Cache-Control: no-store` | Worker 自己加，**到不了客户端**（核心错误路径与正常路径都再白名单一次） | `engine/main.go:107`；`server/internal/gateway/upstream_error.go:55-65`；`forward.go:51` |
| `X-Request-Id` | **核心补充**（自己的 rid；官方没有这个头） | `server/internal/gateway/pipeline.go:129-130` |
| 流式 | 核心统一改写为 `text/event-stream` + `X-Accel-Buffering: no` | `forward.go:267-277` |

`01-offline` #21/#22 实测与本表一致。

---

## 4. 代码与文档不一致 / 可能导致出口与官方不同的缺陷

### 4.1 静态可确认、且现有文档未记录的差异

**D1（P2）出口 URL 缺 `?beta=true`。〔已实测确认〕**
官方 Claude Code 走 SDK 的 beta 命名空间：`this._client.post("/v1/messages?beta=true", …)`（`chunk-38xgev2z.js` 的 `beta.messages.create`），历史抓包里 reference 26/26 是 `/v1/messages?beta=true`。我们的 request 命令在 `cli-mods/model-request.js:78` 直接 `client.post('/v1/messages', …)`，抓包 74/74 是 `/v1/messages`。
动态确认：`01-offline` A 侧 49/49 带、B 侧 54/54 不带（客户端对自定义 base URL 也发 `?beta=true`，本地探针实抓）；`02-prod31` 真实链路同（13 次真实上游全 200）。
影响：请求行（path+query）与官方不同；上游目前接受（线上 200），但这是除传输层指纹外唯一**系统性**的请求行差异。修法：改用 `beta.messages.create` 或显式带 query。

**D2（P3）非 CC 请求的 `cch` 恒为 `00000`。〔实测确认〕**
官方 ELF 在运行时把 `cch=00000` 换成每次不同的 5 位十六进制（`CLAUDE-CODE-2.1.304-SYSTEM-PROMPT-ASSEMBLY.md` §7）；我们重编的 CLI 没有这段，非 CC 请求由 `mergeBillingAttribution` / `applyDirectBilling` 插入的原生行里 `cch` 一直是 `00000`（`01-offline` #15/#16、`02-prod31` §4.5 均实测）。CC 请求不受影响：两种模式都把客户端的 `cch` 原样保留（`01-offline` 逐请求相等，如 `29f01`→`29f01`）。已在 SYSTEM-PROMPT-ASSEMBLY §7 记录，但 REQUEST-HEADERS 的「已知边界」只写了 `cch` 一句，容易被读成只影响账号测试。注意 build 会改写映射后的 `cc_prompt_id`，所以 `cch` 与 body 的对应关系在 build 下已不成立（设计内）。

**D3（P1，跨路径）核心仍在发/仍在等已无消费者的头。〔已实测确认，判级由 P2 升 P1〕**
- `X-CCGateway-Resource-Outputs/-Refs/-Contexts`、`X-CCGateway-Fallback-Credit`、`-Track`、`Principal`、`Generation` 由核心设在发往 `/v1/messages` 的请求上（`server/internal/gateway/resource_references.go:222-225,266`；`fallback_credit.go:137-140`），但 engine 的请求命令路径**没有任何读取**（engine 非测试代码 grep 全空）。
- **触达面（决定 P1 的关键）**：`checkFallbackCredit` 只要请求头里出现三个名字之一就进入 credit 路径——`fallback_credit.go:34-52`（`!parameter.Present && !credits.Enabled(betas)` 才返回）、`contracts/credits/prompt.go:28-38`（`fallback-credit-2026-06-01`、`fallback-credit-2026-07-01`、`server-side-fallback-2026-07-01`）。**不需要 `fallback_credit_token`，也不需要伪造任何东西**：任何客户端主动带这三个 beta 之一就会命中。
- **名单不对称（已用真实请求决定性验证，`02-prod31` §4.6）**：`features/betas.go:18-21` 把**四个**名字都标成 `forward`，`credits.Enabled` 只认**三个**。实测各 1 次：只带 `server-side-fallback-2026-06-01` → **200 正常通过**（不进 credit 路径）；只带 `fallback-credit-2026-07-01` → 上游 200 + 客户端 502。于是这四个名字目前有三种行为：3 个 502、1 个 200、四个都转发给上游。
- 后果 1：带上述 beta 的请求会让核心 `forward()` 进入 `forwardResourceResponse`（`forward.go:65`，`(resourceAccess.outputs) || creditAccess != nil`），随后 `observeFallbackCredit` 要求响应里有 `Resource-Principal/Generation` 与 `X-CCGateway-Fallback-Credit-Ready`（`fallback_credit.go:149-193`），而 Worker 的模型响应从不带这些头 → 报 “fallback credit issuer evidence mismatch”。native 时代 §53.13 的「准入拒绝 fallback_credit_token」已随 C1/C5 删除（该节本身已标注为历史），新路径既不拒绝也不消费：`fallback_credit_token` 留在 body 里，build 经 `parameters` 并回、direct 原样，最终发给上游。**〔实测〕** `02-prod31` §4.6：上游真实 200 后核心才报错，客户端拿到 502 `upstream_error` / “upstream response could not be converted”，即每次白打一次上游；两次复现一致。官方基线的 beta 列表不含这些，正常 CC 流量不受影响。
- 后果 2：资源输出（`Outputs`）同样需要响应里的 `Resource-Principal/Generation`（`resource_response.go:95-99`），而 Worker 模型路径不设 → 会 502。触发条件很窄：只有 body 出现 `container`、`container`/`code_execution`/`bash` 这类执行工具或工具变更时 `Outputs` 才为真（`contracts/resources/ptc_references.go:51-79`），真实 CC 客户端不会发。文件/技能引用本身靠 body 里的远端 id，不依赖这些头。
- 后果 3（服务端工具）：typed 工具（`tools[].type != "custom"`）在 build 里进 `extraToolSchemas` 后被**原样**并入最终 `tools`（`request-input.js:221-231`、`request-build.js:202`、`patch-cli:105`），direct 更是不动；`mcp_servers`、`container` 也作为 `parameters` 并回。§53.13/§53.14 的「准入拒绝」在请求命令路径不存在。是否需要恢复这些拒绝属于产品决策（工具调用反正交回客户端），但文档必须更新。
- 处置建议（二选一）：①核心对 CCGateway 不再设这两类头、也不做 `observeFallbackCredit`/资源输出断言；②engine 请求命令路径恢复读取并在响应上回写 `Resource-Principal/Generation`（`Ready` 证据仍需 Worker 侧支持）。payment 目前延后，但 P1 的影响面是「任何用户主动带 beta」，不是只有兑换场景。

**D4（P3）`x-ccgateway-session-scope` 已成为死头。**
插件仍在加（`plugins/ccgateway/internal/ccgateway/ccgateway.go:162`），CONTRACTS §53.12 仍说它「只用于消息与资源归属」，但 native 路径删除后 engine 无任何读取；它唯一可见的地方是 Worker 请求日志的 `request-headers.json`（含 `user_id:key_id`）。不影响上游，属残留。

### 4.2 文档 vs 代码（README/契约层）

| # | 文档说法 | 代码事实 | 位置 |
|---|---|---|---|
| D5 | `REQUEST-MODES.md` §1.1：「客户端没发 `stream` 时 build 发出 `"stream":false`（审核 C10）」 | 不发：Worker 只在客户端带 `stream` 时写信封键，CLI 只在 `'stream' in body` 时补 | `request_components.go:41-59`；`request-input.js:243`；`request-build.js:246-248`；测试 `request-parameters-304.test.mjs`「sends stream only when the client did」 |
| D6 | `BUILD-REQUEST-COMPONENTS-DESIGN.md` §2 表：`system` 缺省 `[]`、`stream` 缺省 `false`；§2 约束「两处缺省填充不是原生行为（C10）」；§11 已知缺口同句 | 缺省时不写 `systemPrompt`、不写 `stream` | 同上 |
| D7 | `BUILD-REQUEST-COMPONENTS-DESIGN.md` §10：「HEAD 时 `request_policy_mode_v1` 与 `build_content_preservation_v1` 只在 cli_version 为 2.1.304（或 direct）时要求」「HEAD 每个请求都读一次 /healthz、不缓存」 | HEAD 已缓存 30s（`request_cache.go:29,253-266`），且两项能力**总是**要求（`runtime_features.go:23-48`） | 见左 |
| D8 | `REQUEST-MODES.md` §1.5 括号：「HEAD 是读完 body、装好信封之后才占槽位」 | HEAD 在 `admitRequest` 之后、读 body 之前占槽（`request_command.go:78-91`），即文档描述的「工作树」行为已经在 HEAD | 见左 |
| D9 | `REQUEST-HEADERS.md:3`：「没有任何一个客户端请求头是原样转发的」 | 同文 ③ 与 ⑤ 的表又说 loop 状态头「原值放回」、UA 在条件满足时原样；措辞自相矛盾（机制上是重写，值上不全是） | 见左 |
| D10 | `REQUEST-HEADERS.md` 未提出口 URL、`x-stainless-*` 的取值来自 Worker 容器 | D1、§3.2 | 建议补「已知边界」 |
| D11 | `BUILD-REQUEST-COMPONENTS-DESIGN.md` 首段仍写 CLI `ccgateway-v22-client-entrypoint` | profile 是 `ccgateway-v23-bound-imports` | `cli-mods/profiles/linux-x64-2.1.304.json` |
| D12 | `CONTRACTS.md` §53.12 保留 session-scope 用途 | D4 | — |
| D13 | `SUBAGENT-REQUEST-CONTEXT-DESIGN.md` §1/§2/§9 中「非 CC 按子代理」行 | 文首已有 2026-10-24 失效说明；正文表格未标注，读者易误用 | — |
| D14 | `CONTRACTS.md` §53.13 标题仍是「固定 native 请求策略与原生表达（**当前工作树**）」，并列出大段「准入拒绝：assistant prefill、非流式 max_tokens:0 预热、`fallback_credit_token`、container/container skills、mcp_servers、code_execution/web_fetch/API tool_search/advisor、typed 工具集、inline 工具定义、图片 transformations…」 | §53.21 宣布 native 路径整体删除时，只点名 §53.11、§53.14–§53.16，**没有点名 §53.13**；而请求命令路径（`request_command.go` + `messagesBuildComponents`）不实现这些准入拒绝：`mcp_servers`、`container`、typed 工具（`type != custom`）只被原样搬进 `tools`/`parameters` 并回 body（`request_components.go:144-168`、`request-parameters.js:14,41-52`），`fallback_credit_token` 也照发（D3）。读者按 §53.13 会以为这些请求被拒 | 见左 |

### 4.3 其他静态风险（尚不能断定是 bug，但会造成与官方不一致或失败）

**R1（P2）build 的硬拒可能拒绝官方会放行的请求。**
`validateToolPairs`（`request-input.js:198-217`）要求每个 `tool_use` 在下一轮 user 里都有 `tool_result`，否则 400；`validateBuildNumbers` / `parseRequestJSON`（`request_components.go:350-381`、`request-options.js:71-85`）拒绝任何 >2^53 的整数。真实 CC 一般满足这两条，但「工具被打断」「工具入参里出现大整数」这类边缘请求在 direct 会被上游处理，在 build 会先被网关 400。建议动态构造一条 `assistant(tool_use) → user(text)` 的请求验证。

**R2（P3）OAuth 账号 + 非 OAuth 客户端时 `oauth-2025-04-20` 被追加到 beta 列表末尾。**
`authenticatedRequestHeaders` 用 `normalizeBetas(policy.betas, policy.oauthBeta)`（`request-options.js:96`），Set 插入序决定位置；官方把它放在第 2 位。真实 CC 客户端自己会带它，因此只在「客户端不是 OAuth 形状」时出现。

**R3（P3）build 的 beta 仍可能被原生门控追加。**
补丁把 `mt` 重置为客户端 beta（`patch-cli-2.1.304.cjs:110`），但 `qmn` 后续仍有 `if(gW==="1h"&&Py()&&!zr.includes(g1t))zr.push(g1t)`、advisor 等推送；当前环境（statsig 关闭）没有触发，属环境而非代码保证。历史上 `gateway-build-key-fp` 相对 `reference-key` 多出 `extended-cache-ttl-2025-04-11` 就是这一类。

**R4（P3）会话头与 body 的一致性有前提。〔实测：担忧不成立，改为记录机制〕**
direct 只在客户端 session 是**小写 v4 UUID** 时采用它（`identity.go:13-16` + `request-identity.js:8-25`）；否则 CLI 用本进程随机会话。build 的 OAuth `replace` 模式总会生成映射 UUID。`01-offline` S3（大写 UUID）：出口用 CLI 自己生成的 v4 session，**body metadata 也一起换成同一个值**，头与 metadata 仍相等，只是不再等于客户端原值。即不变式保住了，代价是「direct 号称原样」在异常 session 下不成立（仍属可接受）。

**R5（P3）build 的辅助请求缺 prompt ID 时会改写计费头的能力受限。〔实测确认〕**
`setLeadingBillingField` 只改**已存在**的字段（`content-policy.js:508-517`）；若客户端计费头里没有 `cc_prompt_id`，即使我们把 prompt-id 头映射成新值，计费头也不会补上——官方两者同源，恒等。只在客户端本身用了非官方 base URL（不带 cc_prompt_id）时出现。`01-offline` S4 复现：「头 = 计费头 `cc_prompt_id`」的不变式在这种异常输入下被打破。

**R6（P3）`x-stainless-os/arch/runtime-version` 反映 Worker 容器而非客户端机器。**
`S5n()` 用 `process.platform/arch/version`。离线对拍在同一 Linux 容器里跑时两者相同（`01-offline` #8 实测八项全同）；真实 macOS/Windows 客户端经网关后上游看到的是 Linux/x64。这是服务端重建的固有代价，但 REQUEST-HEADERS 的「已知边界」没有点名这几个头。

**R7（P3）核心 `passHeaders` 只取多值头的第一个值。〔实测：v23 不成立〕**
核心确实用 `gin.GetHeader`（`pipeline.go:641`，等于 `Header.Get`），但 Worker 侧用 `r.Header.Values("anthropic-beta")` 全量拼接后交 `--betas`（`request_command.go:393-395`）。`01-offline` S5（beta 分两行）出口保留了两行全部 beta。结论：本项撤回，仅在「重复的 `user-agent`」这类单值头上仍只取第一条（无实际影响）。

**R8（P2）helper history 与已删除的 Worker 路由不一致。〔实测：现网不成立，机制保留〕**
核心 `EnableHelperHistory: true`（`app/phases.go:290`）。`discoverHelperHistory` 对「body 里有 assistant 消息」的请求做前缀查询：未知状态走 requirement 探测（Worker 已返回 404 → `DeferToOrdinary` → 不包装），但**已登记的 KnownReady 链**会跳过探测，直接走 `helperHistoryRuntime`；后者要求 Worker 的 `/admin/features` 声明 `helper_history_schema_versions`，而新 Worker 的文档里已不写这个字段（`plugins/ccgateway/companions/worker/internal/server/features.go:51-57`）→ `helperRuntimeNamespace` 返回 `ErrUnsupported("Worker does not support helper history custody")` → `helperRuntimeFailure` 原样返回 Unsupported → dispatch 走 `invalidModelReference` → 客户端收到 **400**（`helper_history_request.go:111-120,261-275`；`dispatch.go:548-558`）。
`02-prod31` §4.7：生产库 `select count(*) from provider_helper_records where expires_at > now()` = **0**，且本链路（`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`）没有辅助请求 —— 现网不会触发。机制本身仍在：一旦有 native 时代遗链或将来重新启用 custody，就会稳定 400。

**观测盲区（记录）**：核心/Worker **不记录** Worker→Anthropic 的出口报文。`engine/request_log_*` 的 `upstream*` 文件类型只属于已删除的 legacy relay（`engine/request_log_viewer.go:416-427`）。要看出口只能「同镜像 Worker + 同 CLI 回放同一份入站 body/头到假上游」（`02-prod31` §1 的做法）。§6 的清单里凡涉及「出口抓包」的项都应在回放环境做，不能用生产日志代替。

**R9（P3，文档）`CONTRACTS.md` §53.13 仍以「当前工作树」的口吻描述已删除的 native 表达**，包括「准入拒绝 typed 工具集 / inline 工具定义 / mcp_servers / container / 图片 transformations」等；请求命令路径不实现这些拒绝（§4.2 D14）。

---

## 5. 与「官方一模一样」的距离（一句话版）

- **CC 客户端的主线程/子代理/多轮/压缩请求：body 与请求头集合、顺序、值都与官方直连一致**（`01-offline` 30 场景 + `02-prod31` 13 次真实请求双证），差别只有：被有意映射的 ID（session/prompt；agent-id 不映射）、`metadata.user_id`、`account_uuid`、beta 的顺序（A5），以及 D1 的 URL query。
- **辅助请求**：代码路径与主线程相同（不注入、不补身份行），但**两轮动态测试都没采到样本**（客户端在本配置下不发），仍属代码推断。
- **非 CC 请求**：设计上就不与任何官方客户端一致（按注入等级补成主线程形状），只能保证「像 CC」；实测差异集中在 `cch=00000`、原生默认的 `thinking`/`temperature`/键序。
- **传输层**（TLS、HTTP 版本、`cch`、`x-stainless-*` 的平台含义）不可能一致，属已知边界；出口报文的可观测性也是空白（A14）。
- **另有一个与「像不像」无关、但会让请求失败的口径缺口**：fallback-credit beta → 上游 200 后客户端 502（A2/D3）。

---

## 6. 给动态验证队友的检查清单（建议逐条勾）

> 期望值基于 HEAD 代码；历史抓包 `artifacts/claude-2.1.304/e2e/cap*` 是 v18–v22 时代的产物，只作形状参考。本清单已在 2026-10-24 由 `wf-offline`（v23，30 场景）与 `wf-prod31` 逐条执行，结果与归因见 §7。

### 6.1 wf-offline（docker 离线对拍：官方客户端直连 vs 经 Worker）

基线 A = 官方客户端 → 假上游；被测 B = 同一客户端（`ANTHROPIC_BASE_URL` 指向 Worker）→ Worker → 改过的 CLI → 同一假上游；两端都设 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`。

| # | 检查项 | 期望值 |
|---|---|---|
| 1 | 请求行 | 两者 method POST；B 目前是 `/v1/messages`，A 是 `/v1/messages?beta=true` —— **记录差异**（D1），并看上游是否区分 |
| 2 | 头集合 | A 与 B 的**头名集合完全相同**；唯一允许值不同的是 `authorization`/`x-api-key`、`x-client-request-id`（随机）、被映射的 ID 头 |
| 3 | 头顺序 | B 与 A 的顺序一致（历史抓包 v18 起一致）；不一致时记录首个偏离位置 |
| 4 | `user-agent` | build 默认（首块计费头 `cc_version`、`cc_entrypoint` 都还是客户端值时）= 客户端原值，含 `, agent-sdk/…`/`, client-app/…` 限定段；把 `build_billing_sources.cc_version` 改成 `worker` 后应变为原生 `dN()` 的值 `claude-cli/2.1.304 (external, <请求入口>)`，限定段只剩 Worker 进程 env 里有的（`CLAUDE_AGENT_SDK_VERSION`/`CLAUDE_AGENT_SDK_CLIENT_APP`，通常为空） |
| 5 | `anthropic-beta` | 对 CC 请求：集合与顺序同 A；子代理无 `extended-cache-ttl-2025-04-11`；若出现 A 没有的 beta，记录（R3） |
| 6 | `anthropic-version` | `2023-06-01` |
| 7 | `x-app` | `cli` |
| 8 | `x-stainless-*` | 与 A 相同（同一 Linux 容器）；额外记录它们随容器变化的含义（R6） |
| 9 | `x-stainless-timeout` | `600` |
| 10 | `x-claude-code-session-id` | build+OAuth：= 出口 `metadata.user_id` 里的 `session_id`（映射后的值），同一会话内稳定；direct：= 客户端值且 = body metadata 的 session；client 的 session 若改成非 v4（如大写/v7）则观察 R4 |
| 11 | `x-claude-code-prompt-id` ↔ 计费头 `cc_prompt_id` | 两者字符串完全相等（build+OAuth 均为映射值；API key/direct 均为客户端值） |
| 12 | 子代理 | `request-class: subagent`；`agent-id`/`parent-agent-id` 等于客户端原值（嵌套时 parent=上层 agent-id）；`agent-type` 等于客户端值；system 3 块；计费头含 `cc_is_subagent=true`、无 `cc_turn_*`；beta 不含 `extended-cache-ttl` |
| 13 | 压缩/上下文压缩 | 压缩请求带 `x-cc-compaction-request` 与 `x-claude-code-compaction`（原值）；压缩后首个请求带两个 `*-context-compacted`（原值） |
| 14 | 辅助请求（标题/分类器等，request-class 非 main） | 只有计费头、**无身份行**、无注入；`request-class` 头与客户端一致 |
| 15 | 非 CC（curl，无计费头） | build low：body.system[0] 是**原生完整计费头**（含 `cc_prompt_id`、`cc_turn_origin=sdk`、`cc_prompt_index/cc_turn_index`、`cch=00000`），OAuth 账号 system[1] 是身份行；high：再补 CC 静态/动态提示词 + 工具，客户端 system 并入动态块；API-key 账号**不补身份行** |
| 16 | 非 CC direct | body 只在 system 上被改（字符串 system → 块数组 + 计费头），其余字节逐字节同输入；不补身份行 |
| 17 | body（CC 主线程/子代理 build） | 键集合、键序、值与 A 相同；允许差异：`metadata`、`cch`、被映射的 ID、模型自己生成的文字 |
| 18 | body（direct） | 除 system 外逐字节相同；`stream`/`tools`/`messages` 键序不变 |
| 19 | `stream` 缺省 | 客户端不发 `stream` 时，出口 body **没有** `stream` 键（验证 D5/D6 的现状） |
| 20 | 上游不可见 | 出口请求里**不能出现**任何 `x-ccgateway-*`、`X-CCGateway-Request-Policy`、`x-request-id`、`x-stainless-helper` |
| 21 | 响应侧 | 回给客户端只有 `Content-Type` + `request-id`/`anthropic-request-id`/`retry-after`/`x-should-retry`/`anthropic-ratelimit-*`/`anthropic-fast-*`，另加网关注入的 `X-Request-Id`（官方没有这个头，记录即可） |
| 22 | 错误路径 | 上游 4xx/5xx 的状态、`Content-Type`、正文原字节到客户端；`X-CCGateway-Error-Source/Reason` 不出现在客户端（`httpfacts.Select` 白名单） |

### 6.2 wf-prod31（31 号真实链路）

先读生产策略（全局→分组→31 号账号）确定期望：`level`、`relay_mode`、`build_billing_sources.{cc_version,cc_entrypoint}`、`build_billing_entrypoint`、`build_attachment_sources`、`build_injection`。

| # | 检查项 | 期望值 |
|---|---|---|
| P1 | 主线程 build | 200；出口计费头 `cc_entrypoint` = 客户端值（若 `cc_entrypoint` 来源不是 worker），`cc_version` 视配置；`x-claude-code-request-class: main`；`x-claude-code-prompt-id` = 计费头 `cc_prompt_id` |
| P2 | 子代理 | 200；request-class/agent-type/agent-id/parent/prompt-id 与客户端一致；`cc_is_subagent=true`；无 1h beta |
| P3 | 压缩 | 200；压缩头原样；`cc_prompt_id` 与头一致 |
| P4 | direct | 200；body 除 system 外不变；`x-claude-code-session-id` = body metadata session |
| P5 | API-key 账号（若有） | 200；`x-api-key`、无 `authorization`；beta 不含 `oauth-2025-04-20` |
| P6 | 请求日志 | Worker `request-headers.json` 应看到 `X-CCGateway-Request-Policy`、`x-ccgateway-session-scope`、`x-request-id`、`x-api-key`、13 个透传头；上游抓包中这些**都不出现** |
| P7 | URL query | 记录 Worker→上游是否 `/v1/messages`（预期是，见 D1） |
| P8 | helper history | 查 `provider_helper_records`（该用户/分组）是否有未过期链；如有，用一个能匹配其前缀的对话复测是否稳定 400（R8）。实测：2026-10-24 生产库为 0，现网不触发 |
| P9 | fallback credit | ~~若线上有兑换码/credit 场景~~ → **改为无条件必测**：只要请求头带 `fallback-credit-2026-06-01`/`-07-01`/`server-side-fallback-2026-07-01` 之一（不需要 token）就应复现 502（D3，已由 prod31 确认两次） |
| P10 | 资源引用 | 带 files/skills 引用的一条请求是否 200，响应里新注册的文件是否出现（D3 后果 2） |
| P11 | 取消/超时 | 客户端取消 → 499 诊断、不伪造响应；Worker 超时 → 504 `timeout_error`（与请求头无关，确认 `x-stainless-timeout` 仍是 600） |

### 6.3 建议补充的离线专用构造（只在这里能看清）

| # | 构造 | 期望 | 实测（01-offline §2） |
|---|---|---|---|
| S1 | `assistant(tool_use)` 后接 `user(text)`（无 tool_result） | build 400（`missing tool results`）；direct 应 200 或上游错误（R1） | build 400 `cli_invalid_request` "missing tool results"；direct 200 —— 符合 |
| S2 | 工具入参含 `9007199254740993` | build 400（unsafe JSON number）；direct 原样（R1） | build 400 `build cannot represent an unsafe JSON number`；direct 200 —— 符合 |
| S3 | `metadata.user_id` 为大写 UUID / 非 v4 | 观察 session 头与 metadata 是否仍相等（R4） | 200，出口 session 与 metadata **一起**换成 CLI 映射值，头仍等于 body（R4 撤回） |
| S4 | 客户端计费头缺 `cc_prompt_id` 但发了 `x-claude-code-prompt-id` | R5：计费头不会被补 | 200，计费头不补 `cc_prompt_id`、prompt-id 头被映射 → 不变式打破（R5 确认） |
| S5 | 同一 `anthropic-beta` 分两行发送 | 核心只转第一行（R7） | 200，两行**都保留**（R7 撤回） |

---

## 7. 归因（队友报告 → 代码位置）

截至 **2026-10-24 17:37 UTC**，两份动态报告都已回填：
- `01-offline.md`（17:23，30 场景 / A 49 请求 / B 54 请求，镜像 `ccgateway-app:0.1.87`，CLI `558d7b31…`，官方 ELF `ea0f1357…`）
- `02-prod31.md`（17:37，真实账号 31，13 次真实上游请求）

### 7.1 逐条归因

| # | 现象（队友报告） | 归属 | 代码位置 | §4 预判 |
|---|---|---|---|---|
| A1 | 出口请求行 `/v1/messages`，官方 `/v1/messages?beta=true`（offline 49/49 对 54/54；prod31 全量） | **CLI 补丁**（固定写死路径） | `cli-mods/model-request.js:78` `client.post('/v1/messages', …)`（应走 `beta.messages.create` 或显式 query） | D1 ✓ 成立（升级为两轮双证） |
| A2 | 带 fallback-credit beta 的普通 Messages（无 token）：上游真实 200，客户端 502 `upstream_error` / "upstream response could not be converted"（prod31 g，两次一致，白打上游一次） | **核心 + Worker 契约缺口**：核心设 `X-CCGateway-Fallback-Credit-Track` + principal/generation、随后校验响应身份头；Worker 请求命令路径既不读入站头也不回写响应头 | 核心 `server/internal/gateway/fallback_credit.go:34-52`（`credits.Enabled` 命中即进入）、`:137-140`（设头）、`:149-193`（`observeFallbackCredit` 的 `ValidateIdentityHeaders` 失败 → 转换失败分支 `forward.go:65,113-118`）；名单见 `contracts/credits/prompt.go:28-38`；Worker 侧无消费者（engine 非测试代码 grep 为空） | D3 ✓ **成立，P2→P1**（未预判到「上游已计费」与「无需 token」两点） |
| A3 | 生产库无未过期 helper history 链；链路无辅助请求 → R8 现网不成立 | 机制仍在（核心 `EnableHelperHistory: true` + Worker 不再声明 schema） | `server/internal/app/phases.go:290`；`server/internal/gateway/helper_history_request.go:111-120,261-320`；`plugins/ccgateway/companions/worker/internal/server/features.go:51-57` | R8 ✓ 机制正确，现网不触发 |
| A4 | 出口 24 个头名称与顺序与官方完全相同；`user-agent` 原样（含 `, agent-sdk/0.2.71`） | 原生 `sF`/`nl()` + 补丁 `keepClientUserAgent` | `patch-cli-2.1.304.cjs:136`；`request-agent.js:122-129`；`request-command.js:131-134` | §3.2 断言 ✓ |
| A5 | `anthropic-beta` 集合相同、**顺序不同**（`oauth-2025-04-20`、`extended-cache-ttl-2025-04-11` 追加在末尾） | **CLI 补丁**（beta 合并用 Set 插入序） | `request-options.js:2-17`（`normalizeBetas`）+ `:96`（`normalizeBetas(policy.betas, policy.oauthBeta)`）+ `request-build.js:243`；原生 `g1t` 推送位置见 `chunk-rncrmfyt.js` 的 `if(gW==="1h"&&Py()&&!zr.includes(g1t))zr.push(g1t)` | R2/R3 方向 ✓，本轮首次由生产链路确认（原判 P3） |
| A6 | 非 CC 请求：出口计费头 `cch=00000`；system 变 `[计费头, 身份行, 原 system]`；补 `thinking:disabled`、`temperature:1`；beta 只有注入所需 4 项 | 设计+已知边界（官方运行时才算 cch） | `request-build.js:234`（`mergeBillingAttribution`）；`content-policy.js:369-399`；`request-build.js:198-215`（`buildOptions` 的原生默认） | D2 ✓；其余 §3.3/§3.4 已描述 |
| A7 | 出口 `stream` 键在客户端未发时**不存在**（build 与 direct） | 代码已是新行为，**文档过期** | `request_components.go:41-59`；`request-input.js:243`；`request-build.js:246-248` | D5/D6 ✓ 实测确认 |
| A8 | S5 beta 分两行：**两行都保留** | Worker 用 `Header.Values` 全量拼接（我此前只看了核心的 `GetHeader`） | `request_command.go:393-395`（`h.Values("anthropic-beta")`） | R7 **撤回**（见 §4.3 R7） |
| A9 | S3 大写 UUID session：出口 session 与 metadata 一起换成 CLI 映射值，头与 body 仍相等 | Worker/CLI 的 session 采纳规则 + 身份映射 | `engine/ids.go:13-16`；`request-identity.js:8-31`；`request_identity.go:295-337` | R4 **撤回**（不变式保住） |
| A10 | S4 计费头缺 `cc_prompt_id`：头被映射、计费头不补 | CLI 的 `setLeadingBillingField` 只改已存在字段 | `content-policy.js:508-517`；`request-build.js:236` | R5 ✓ 确认 |
| A11 | S1/S2 build 硬拒（缺 tool_result、不安全数字），direct 放行 | 设计如此（Worker/CLI 的 build 校验） | `request-input.js:198-217`；`request_components.go:350-381`；`request-options.js:71-85` | R1 ✓ 确认（属设计，不算缺陷） |
| A12 | 上游 4xx 状态/正文/`Content-Type` 原样；`X-CCGateway-Error-Source` 未泄漏 | 核心错误路径二次白名单 | `server/internal/gateway/upstream_error.go:55-65`（`httpfacts.Select`）；Worker `engine/request_error.go:172` | §6.1 #22 ✓ |
| A13 | 出口 `x-stainless-*` 与官方同值（同容器）；`x-stainless-timeout=600` | 原生 SDK + `maxRetries:0`/`timeout` | `model-request.js:81`；`request-command.js:203` | R6/§3.2 ✓（生产环境 macOS/Windows 客户端仍会出现差异，R6 保留） |
| A14 | **观测盲区**：核心/Worker 不记录 Worker→上游报文，出口只能回放取证 | 产品缺口（可观测性） | `engine/request_log_viewer.go:416-427`（`upstream*` 只属已删 legacy relay）；`request_log_diagnostic.go:65`（摘要文件列表） | 本轮新增记录（原 §6 未点明） |

### 7.2 需要更新的判级（以动态结果为准）

- **D1**：P2 保持（系统性、易修、上游目前接受）。
- **D3**：**P2 → P1**。不只是「无人消费的头」，而是：带三个 fallback-credit beta 之一（`fallback_credit.go:34-52` + `contracts/credits/prompt.go:28-38`）的**任何**请求，上游已 200 计费后客户端拿 502。修法二选一，见 D3「处置建议」。`02-prod31` 已同步把该行改为 P1。
- **A5（beta 顺序）**：P3 保持，但应写进 REQUEST-HEADERS 的「已知边界」。
- **A14**：作为可观测性项单列（不影响出口正确性，但让所有出口核对只能靠回放）。
- 撤回 **R4、R7**；确认 **R5、R1**；R8 记为「机制成立、现网不触发」。
- 附注（`contracts/features/betas.go:18-21` 与 `contracts/credits/prompt.go:28-38` 的名单不一致，已实测）：四个 fallback beta 目前有**三种行为**——`fallback-credit-2026-06-01`/`-07-01`/`server-side-fallback-2026-07-01` 命中 credit 路径并稳定 502；`server-side-fallback-2026-06-01` 被 `BetaRules` 标 `forward` 却不在 `Enabled`，实测 **200 正常通过**（仍转发给上游）。清理项：两个名单要么都含四个、要么都不含，且四个名字的行为要统一（要么都进 credit 路径、要么都不进）。`02-prod31` §4.6 有这两次真实请求的记录。

### 7.3 动态报告里仍缺的样本（建议下一轮）

| # | 缺失 | 影响 |
|---|---|---|
| 1 | 辅助请求（标题/分类器/`request-class≠main`）无样本：offline 开/关非必要流量都不发，prod31 同样 | 已可结案为「该 ELF 2.1.304 在此配置（`-p`）下不发辅助请求」——两处独立环境一致（offline 基线 07、prod31），§3.4 的「辅助请求」一行仍只有代码推断，但现实流量里不会出现 |
| 2 | offline 未跑 API-key 账号的 A/B 对照（只间接看到 curl 形状） | `apiKeyRequestHeaders` 路径的「beta 不含 `oauth-2025-04-20`」仍只有代码依据 |
| 3 | 交互式客户端、`client-app`/`workload` UA 限定段、Windows/macOS 客户端 | `keepClientUserAgent` 的限定段逻辑（`dN()` 的 `CLAUDE_AGENT_SDK_CLIENT_APP`/workload）只有 `sdk-ts` 一例 |
| 4 | 生产出口的真实报文（受 A14 限制） | prod31 的出口结论全部来自「同镜像回放」，不是生产抓包 |

（待补。若队友报告在我完成后才出现，以他们的最终版为准，本节的「预判」列即 §4 的 D/R 编号。）
