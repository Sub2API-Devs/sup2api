# 离线对拍：官方客户端直连 vs 客户端 → 核心 → Worker → CLI → 上游

2026-10-24。执行环境：ovh 一次性 `docker run --rm --network none --user 1000:1000` 容器，镜像 `ccgateway-app:0.1.87`（Worker `/usr/local/bin/worker` sha256 `2f742076…8c2a`，CLI `/opt/ccgateway/cli/2.1.304/claude` sha256 `558d7b31…5b5c`，patch `ccgateway-v23-bound-imports`）。官方客户端：`~/sup2api/checks/ccg-304-v12/claude-official-304`（sha256 `ea0f1357…27912`），复制进容器。

- **基线 A**：官方客户端 → 假上游（TLS over unix socket，`ANTHROPIC_UNIX_SOCKET` + `NODE_TLS_REJECT_UNAUTHORIZED=0`）。这就是官方发给 Anthropic 的请求形状。
- **被测 B**：同一个官方客户端 → `ANTHROPIC_BASE_URL=http://127.0.0.1:8788`（本地代理补 `X-CCGateway-Request-Policy`，模拟核心）→ Worker 8787 → 改过的 CLI → 同一个假上游。
- 两端都设 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`（否则客户端按第三方地址少发 cch/cc_prompt_id/turn 字段、request-class 等）。
- 假上游记录每个请求的 `rawHeaders`（保序）与 body；代理另记录**入站**请求（客户端 → 核心 的样子），用于区分「客户端没发」与「Worker 丢了」。
- 脚本：`artifacts/claude-2.1.304/e2e/wf-2026-10-24/`（`run.sh`、`proxy.cjs`、`fake-upstream.cjs`、`compare.cjs`、`mapcheck.cjs`、`checks.cjs`、`export-baseline.cjs`，以及 pass6–pass16 的单点脚本）。对比全文留存在同目录 `results/`（`compare-final.txt`、`checks-out.txt`、`map-build.txt`、`map-direct.txt`）。ovh 工作目录 `/tmp/ccg-audit-wf-2026-10-24` 已在测完后删除，只保留基线目录 `/tmp/ccg-audit-wf-baseline/`。

规模：30 个场景、A 侧 49 个请求、B 侧 54 个（多出的 5 个是非 CC curl 请求），全部在同一个 Worker 实例上跑（策略头逐请求切换）。

## 场景表

| # | 场景 | 模式/等级 | 结果 |
|---|---|---|---|
| 1 | 主线程单轮 `-p` 文本（stream，`--output-format json`） | build micro / low / high / 全擦除；direct | 通过（只有白名单差异） |
| 1b | 主线程单轮，`--output-format stream-json` | build low | 通过 |
| 2 | 两轮 + Bash 工具往返 | build low；direct | 通过 |
| 2b | 同会话第二轮（`--continue`，`cc_turn_index=2`） | build low | 通过 |
| 3 | 子代理：主 → Agent(LEVEL1) → Agent(LEVEL2)，共 5 个请求 | build low；direct | 通过 |
| 4 | 压缩：`/compact`（请求 class=compaction，带 `x-cc-compaction-request` 等） | build low | 通过 |
| 4b | 非必要流量开启（尝试触发标题/分类器等旁路请求） | build low | 客户端未发任何辅助请求（见 §1 第 14 项） |
| 5 | build 组件替换：等级 0/micro/low/high + 计费来源 worker + 附件 worker/erase | 四种 | 符合设计（见 §3.2） |
| 6 | 非 CC 请求（curl，无计费头） | direct / micro / low / high | 符合设计（见 §3.2） |
| 7 | 非 CC 带自有工具（含与内置同名的 `Bash`） | high | 通过（同名工具保留客户端定义） |
| 8 | 入口/UA：`CLAUDE_CODE_ENTRYPOINT=cli`、`sdk-ts`+`CLAUDE_AGENT_SDK_VERSION` | build low / billing=worker / entrypoint=sdk-cli | 通过（v22 的 D1 修复有效） |
| 9 | 边界：build 缺 tool_result、不安全 JSON 数字 | build / direct | 符合设计（§2） |
| 10 | 边界：无 stream、无 system | build / direct | 通过（§1 第 19 项） |
| 11 | 边界：大写 UUID session、计费头缺 cc_prompt_id、beta 分两行 | build / direct | 见 §2 |
| 12 | 上游 4xx 透传（状态/正文/头白名单） | build / direct | 通过（§1 第 22 项） |
| 13 | 登录态客户端的 account_uuid | build | 见 §3.2 第 1 条 |

## 1. 逐项结论（对照 03-static.md §6.1 的 22 项清单）

| # | 检查项 | 实测 |
|---|---|---|
| 1 | 请求行 | **A=49/49 全部 `/v1/messages?beta=true`，B=54/54 全部 `/v1/messages`**。static D1 成立，确认是系统性差异。归属 CLI（`cli-mods/model-request.js:78` `client.post('/v1/messages')`）。上游接受，但这是除 TLS/头序外唯一系统性请求行差异 → 缺陷（P2，建议修：原生 `beta.messages.create` 打的就是这个 query） |
| 2 | 头集合 | 除忽略项外**完全一致**（19 个可比头逐名逐值）。build 下 `x-claude-code-session-id` / `x-claude-code-prompt-id` 是映射值（设计如此，见 §3.2 第 1 条）；`x-client-request-id` 两侧都变（原生 SDK 生成，官方也随机） |
| 3 | 头顺序 | 三种模式（build/direct/子代理）与 A **逐位置相同**（19 个可比头），`user-agent` 原位不变 |
| 4 | `user-agent` | 默认 build：等于客户端原值，含 `, agent-sdk/0.2.71` 限定段（`sdk-ts` 入口时 A 与 B 均为 `claude-cli/2.1.304 (external, sdk-ts, agent-sdk/0.2.71)`）。`build_billing_sources.cc_version=worker` 时变为 `claude-cli/2.1.304 (external, sdk-cli)`，与改后的计费头入口一致。`CLAUDE_CODE_ENTRYPOINT=cli` 在本客户端 + `-p` 下不生效（A 侧自己就是 `sdk-cli`），A/B 同为 `(external, sdk-cli)`；另用 curl 送一个 `cc_entrypoint=my-custom-entry` 的计费头，UA 跟着变成 `(external, my-custom-entry)`，`cc_entrypoint` 来源 worker 时 UA 变 `(external, sdk-cli)` —— UA 与计费头入口永远一致，v22 D1 修复有效 |
| 5 | `anthropic-beta` | CC 请求：集合与顺序同 A，唯一差别是 `mid-conversation-system-clear-at-2026-08-21`（**入站请求里就没有**——客户端对自定义地址不发，`mapcheck` 已证）。子代理无 `extended-cache-ttl-2025-04-11`（入站也没有），与 A 一致。无 A 没有的 beta，除非注入层需要（非 CC high 加 `extended-cache-ttl` 等，符合设计） |
| 6 | `anthropic-version` | `2023-06-01` |
| 7 | `x-app` | `cli` |
| 8 | `x-stainless-*` | 与 A 完全相同（arch=x64、lang=js、os=Linux、package-version=0.128.0、runtime=node、runtime-version=v26.3.0、retry-count=0）——同一容器同一 CLI 运行时 |
| 9 | `x-stainless-timeout` | `600`（两侧） |
| 10 | `x-claude-code-session-id` | build+OAuth：= 出口 `metadata.user_id.session_id`（映射值），会话内稳定；direct：= 客户端值 = body metadata（入站→出口逐字节 body 相同，头也原值） |
| 11 | prompt-id ↔ 计费头 `cc_prompt_id` | 全部场景、两侧都完全相等（含子代理、压缩、非 CC 注入） |
| 12 | 子代理 | `request-class: subagent`、`agent-type: general-purpose`、`agent-id`/`parent-agent-id` = 客户端原值（嵌套 parent = 上层 agent-id）、system 3 块、计费头含 `cc_is_subagent=true` 且无 `cc_turn_*`、beta 无 extended-cache-ttl —— 逐条与 A 相同 |
| 13 | 压缩 | 压缩请求带 `x-cc-compaction-request: manual` 与 `x-claude-code-compaction: manual`（原值）；`request-class: compaction`，计费头无 turn 字段，与 A 逐字相同。压缩后首个请求：本客户端版本**不发** `*-context-compacted`（A 也没有），网关不补 —— 一致 |
| 14 | 辅助请求 | 客户端在 `-p` + 本配置下**不发**任何 request-class 非 main 的旁路请求（关/开非必要流量各测一次，A 侧都只有 1 个 messages 请求）。无样本可测；此场景留空 |
| 15 | 非 CC build | low：`system[0]` 是原生完整主线程计费头（`cc_version=2.1.304.e6a`、`cc_entrypoint=sdk-cli`、`cch=00000`、`cc_prompt_id`、`cc_turn_origin=sdk`、`cc_prompt_index=0`、`cc_turn_index=1`），`system[1]` 是身份行（OAuth 账号 → `agent_sdk` 那句），`system[2]` 是客户端 system；消息里补了环境附件（`# Environment` 系统轮，含工作目录/平台/系统版本，`platform_name`/`os_version` 来源 worker 时被换成 Worker 的值）。high：再补 CC 静态（`You are Claude Code, Anthropic's official CLI for Claude, running within …`）+ 动态提示词块，客户端 system **并入动态块尾部**（与原生 `--append-system-prompt` 一致，与 `--append-system-prompt` 的 A 基线形状相同），工具 `Bash,Edit,Read,Write`（无客户端工具时按原生顺序；客户端自带工具时注入的内置工具排在前、客户端工具排在后，同名工具用客户端的定义，实测 `plain-tools-high` 为 `Edit,Read,Write,Bash,MyTool`，其中 `Bash` 是客户端那份）。micro：只有计费头 + 身份行 |
| 16 | 非 CC direct | 入站 `{"model","max_tokens","system":"Answer concisely.","messages"}` → 出口同键序，`system` 变成 `[计费头块, {"type":"text","text":"Answer concisely."}]`，其余**逐字节相同**（无 `stream`、无 `thinking`/`output_config`）。不补身份行 ✓ |
| 17 | body（CC build） | 键集合、**键序**、值与 A 相同。允许差异：`metadata`（映射）、`cch`（值）、被映射的 prompt/session ID、子代理正文里的 agentId 与 `duration_ms`（每次运行不同）。`tools` 的定义（含键序）逐字节相同 |
| 18 | body（direct） | 与**入站请求**逐字节相同（`byte-identical=true`，含键序）；与 A 只差 ID/cch/metadata 值 |
| 19 | `stream` 缺省 | 客户端不发 `stream` 时，出口 body **没有** `stream` 键（build 与 direct 都是）——static D5/D6 成立，代码已是新行为，`REQUEST-MODES.md` §1.1 与 `BUILD-REQUEST-COMPONENTS-DESIGN.md` §2 的「发出 `stream:false`」已过期 |
| 20 | 上游不可见 | 54 个出口请求中 0 个含 `x-ccgateway-*`/`X-CCGateway-Request-Policy`/`x-request-id`/`x-stainless-helper`（唯一命中 `x-cc-compaction-request` 是客户端自己的 CC 头，不是网关头）✓ |
| 21 | 响应侧 | Worker 直接回的响应：`Cache-Control: no-store`、`Content-Type`、`Request-Id`（上游的，或 Worker 自己 uuid 的）、`Date`。**这些都会被核心的 `httpfacts.Apply` 白名单过滤，只有 `Request-Id`、`Content-Type`、`anthropic-ratelimit-*` 等能到客户端**（`gateway/forward.go:51`）；`Cache-Control: no-store` 是 Worker 自己加的（`engine/main.go:107`），官方没有，但到不了客户端。核心另加 `X-Request-Id`（官方没有，static 已记录） |
| 22 | 错误路径 | 上游 400 + 正文 `<>&` 原样到达（`{"type":"error","error":{"type":"invalid_request_error","message":"probe error <>&"}}`），`Content-Type` 同上游；上游的 `x-internal-route`、`set-cookie` 被白名单挡掉；`Request-Id: req_err_probe` 透传。Worker 在自己的响应上另带 `X-CCGateway-Error-Source: http`（`engine/request_error.go:172`），**但核心在错误路径用 `httpfacts.Select(h)`（`gateway/upstream_error.go:56`）重新白名单，这个头到不了客户端** —— 与 static #22 期望一致。直接裸连 Worker（无核心）时才会看到它，生产链路不暴露。 |

## 2. 补充构造（S1–S5，static §6.3）

| 项 | 实测 |
|---|---|
| S1 有 tool_use 无 tool_result | build 400 `{"type":"error","error":{"type":"invalid_request_error","code":"cli_invalid_request","message":"request --build: missing tool results"}}`；direct 200（原样转给上游）—— 与 static 预期一致 |
| S2 不安全 JSON 数字 `9007199254740993` | build 400 `build cannot represent an unsafe JSON number; use direct mode`（Worker 抛，`request_components.go:365`）；direct 200 |
| S3 大写 UUID session | 200；**出口用的是 Worker/CLI 自己映射出的 v4 session**，metadata 也是这个映射值 —— 头与 metadata 仍相等 ✓（R4 的担忧不成立：CLI 不接受非 v4 客户端 session 时改用自己生成的，body 也一起换） |
| S4 计费头缺 `cc_prompt_id`、头里有 prompt-id | 200；计费头**不被补** `cc_prompt_id`（保持客户端那两个字段），但 `x-claude-code-prompt-id` 被换成映射值 —— 与 R5 描述一致：这种请求的「头 = 计费头」不变式被打破（客户端自己就不一致，属于输入异常）。记录为已知边界 |
| S5 beta 分两行 | 200；出口 `claude-code-20250219,context-1m-2025-08-07,oauth-2025-04-20` —— **两行都保留**（Worker 用 `Header.Values` 全量拼接），static R7 的「只转第一行」在 v23 不成立 |

## 3. 结论

### 3.1 完全一致（除下列白名单项）

对 **带计费头的 CC 请求**（主线程 build micro/low/high/erase、主线程 direct、stream 与非 stream、两轮工具、同会话第二轮、两级子代理 5 个请求、压缩、`cli`/`sdk-ts` 入口）：

- 请求方法、URL 路径（除 `?beta=true`）、头**名集合、顺序、值**（除映射 ID 与随机 ID）；
- body 的键集合、**键序**、每个值（除 `metadata`、`cch`、映射 ID、子代理正文里的 agentId/耗时）；
- `system` 块数、文本、`cache_control`（含 `ttl: 1h` / `scope: global`）、计费头每个字段、身份行；
- `messages`（含 `system-reminder`、附件块原样保留）、`tools`（名单、顺序、定义、键序）、`betas`（除客户端自己没发的那个）、`thinking`、`tool_choice`、`metadata` 结构、`stream`、`max_tokens`、`context_management`、`output_config`、`diagnostics`；
- 跨请求的 ID 关系：同一会话 session-id 相同且 = metadata；子代理两轮 agent-id 相同；嵌套 parent = 上层 agent-id；子代理/压缩与主线程 prompt-id 相同；prompt-id 头 = 计费头 `cc_prompt_id`（S4 的异常输入除外）。

### 3.2 有意的差异（符合设计/文档）

1. `metadata.user_id`：build 映射（device_id 与 session_id 变 HMAC 值，`account_uuid` 变成 Worker 账号的 UUID），direct 原值。设计（build 设计 §7）。
2. `cch`：**CC 请求两种模式都原样保留客户端的 `cch`**（入站→出口逐请求相等，如 `29f01`→`29f01`、`96de9`→`96de9`），只有网关**自己补计费头**（非 CC 请求）时才是 `cch=00000`。与官方 5 位 hex 形状一致；build 改了映射后的 `cc_prompt_id`，`cch` 仍是客户端的值（设计如此）。
3. `build_billing_sources.cc_version/cc_entrypoint=worker`：两个字段换成服务端值，`x-anthropic-billing-header` 其他字段与 `cc_prompt_id`/turn 段保留；UA 随之变成原生 `(external, sdk-cli)`（因为不再保留客户端 UA）。符合 §6.1 #4。
4. 附件转换（low 起）：`platform_name`/`os_version` 用 worker 时换成 Worker 容器的值（`Platform: linux`、`OS Version: Linux 6.12.95+deb13-amd64` 与官方容器相同，看不出差别；`primary_directory: worker` 换成 Worker 的 `/t/workdir`，可看出）；`erase` 时对应行整行删除（`git_repository: erase` → `- Is a git repository: false` 消失；全部十项 `erase` 时十行全消失，只剩后续段落）。符合设计。
5. 非 CC 请求的注入：micro = 计费头+身份行，low = 再补环境附件，high = 再补静态/动态提示词与 `Bash,Edit,Read,Write`；客户端 system 并入动态块尾部；同名工具保留客户端定义（`plain-tools-high` 里客户端的 `Bash` 定义原样保留，只补了 `Edit,Read,Write` 并排在客户端工具前）—— 与 03-static 与注入等级设计一致。
6. 非 CC direct：只把 `system` 字符串变成 `[计费头, 客户端 system]` 块数组，其余逐字节。
7. `session-id`/`prompt-id` 在 build 映射后仍是合法 v4，且头与 body 一致。
8. `x-stainless-*` 取自 Worker 容器（同一 Linux 镜像，所以与 A 同值；真实生产里客户端是 Windows/macOS 时该段会不同）—— 已知边界（static R6）。
9. Worker 自己加 `Cache-Control: no-store`，但被核心的白名单挡在客户端之外（无影响，仅记录）。

### 3.3 已知边界（记录，不修或另议）

1. **请求行缺 `?beta=true`**（static D1，54/54）。上游当前接受。
2. **`cch` 仅在网关自己补头时是 `cch=00000`**（非 CC 注入路径、direct 为无计费头请求补头的路径）；官方客户端自己算的是 5 位 hex。真 CC 请求经网关时 `cch` 是客户端原值（build 映射了 `cc_prompt_id`，`cch` 不再对应 body——设计内）。
3. 网关自己补的计费头里 `cc_version` 指纹是 `2.1.304.e6a`（Worker CLI 自己算的），客户端是 `2.1.304.9a4`/`1d1`/`166`/`799`（按请求类型）；注入场景下这是「服务端生成的 CC 头」，符合设计。
4. 传输层：Bun 1.4.3 重编，TLS/h2/头大小写无法与官方 1.4.4 一致（static D2，未变）。
5. 子代理正文里的 `agentId` 与 `<usage>duration_ms` 每次运行不同（官方同样如此）。

### 3.4 缺陷

| # | 缺陷 | 证据 | 位置 | 严重度 |
|---|---|---|---|---|
| N1 | 出口 URL 无 `?beta=true`（确认 static D1，非新问题） | 49/49 A 请求带、54/54 B 请求不带 | `companions/cli-mods/model-request.js:78` `client.post('/v1/messages', …)` | P2 |
| N2 | 文档过期：`REQUEST-MODES.md` §1.1 与 `BUILD-REQUEST-COMPONENTS-DESIGN.md` §2、§11 仍写「客户端没发 stream 时发出 `stream:false`、system 缺省 `[]`」 | 实测出口无 `stream` 键（build/direct） | 两份文档 | P3（与 static D5/D6 一致） |

（原以为的「`X-CCGateway-Error-Source` 泄漏给客户端」在核对核心后**不成立**：错误路径用 `httpfacts.Select(h)` 重新白名单，该头不出现在客户端。）

`X-CCGateway-Request-Policy`、`x-ccgateway-session-scope`、`x-request-id`、`x-api-key`、`x-stainless-helper` 在 54 个出口请求里**全部 0 次**出现（第 20 项 ✓）。

### 3.5 未覆盖 / 局限

- 辅助请求（标题生成、分类器等）：官方 2.1.304 `-p` 在本配置（开/关非必要流量）下都没发，`request-class != main` 的旁路请求没有样本。需要用别的触发方式（例如交互式 CLI 的 `/rename`、或 `ANTHROPIC_BASE_URL` 下的某些开关）再测。
- API Key 账号路径（`apiKeyRequestHeaders`、无 `authorization`、beta 无 `oauth-2025-04-20`）：本轮只跑 OAuth 账号；API Key 的形状在 `pass7` 的 curl 里间接看到一点（`anthropic-beta` 只剩注入需要的几项），但没有与「真 CC + API Key 直连」的 A/B 对照。31 号已补跑同一 ELF 的 API-key 直连参考（`02-prod31.md`）：API-key 下客户端本身就不发 `ttl=1h`、少 `extended-cache-ttl` 等 beta，子代理工具集少 `ListAgents`/`ReportFindings` —— 这些同样属客户端鉴权形态，不是网关改写。
- 响应侧 `X-Request-Id`（核心加）与 Worker 的 `Request-Id` 同时存在时客户端看到哪个，需要经核心（本轮代理不模拟核心的响应头逻辑）再测。
- 交互式（非 `-p`）客户端、`client-app`/`workload` UA 限定段、Windows/macOS 客户端未测。

### 3.6 与 02-prod31 的交叉验证（2026-10-24）

31 号生产链路（`02-prod31.md`）用本目录第 4 节的基线做对照，两处需要对齐：

1. **`?beta=true`**：一致——客户端对这个 ELF、对自定义 base URL 也会发（我的入站抓包 49/49 都带），是 CLI 出口固定 `client.post('/v1/messages')` 丢的。生产与离线同一结论。
2. **`anthropic-beta` 顺序**：生产报「集合相同、顺序不同（`oauth-2025-04-20` 与 `extended-cache-ttl` 被追加到末尾）」。离线复测（pass17，curl 送一个 API-key 形状的 beta 表 + OAuth 账号）得到 `claude-code-20250219,context-management-2025-06-27,mid-conversation-tool-changes-2026-07-01,prompt-caching-scope-2026-01-05,effort-2025-11-24,extended-cache-ttl-2025-04-11,cache-diagnosis-2026-04-07,oauth-2025-04-20` —— 规则是 `normalizeBetas(客户端, 原生新增, oauth)` 的首次出现顺序（`request-options.js:2-17`，调用点 `request-build.js:243`、`request-options.js:96`），**客户端自己带 oauth/ttl 时顺序与官方逐位相同**（本报告的 OAuth A/B 50 余个请求无一例顺序差异）。所以生产看到的顺序差只在「客户端 beta 表不含 oauth/1h-ttl」（API-key 形状的客户端经 OAuth 账号）时出现，属于合并规则的结果，宜记为场景相关而非普遍缺陷。
3. 另一点只在本离线数据里可证：`mid-conversation-system-clear-at-2026-08-21` 的缺失**在入站就发生了**（客户端对自定义 base URL 不发），与鉴权形态无关；做生产对照时这一项不应算到网关。

## 4. 基线 A 文件（给 wf-prod31）

路径：ovh `/tmp/ccg-audit-wf-baseline/`（共 8 个文件，728 KiB，**令牌已打码**为 `Bearer REDACTED`/`REDACTED`）。

格式：每个文件一个场景，`{"scenario","source","note","captured_at","requests":[{index,method,url,headers:[[name,value],…保序],body}]}`。

| 文件 | 内容 | 请求数 |
|---|---|---|
| `01-main-text.json` | 主线程单轮 `-p "Reply with the single word OK."` | 1 |
| `02-main-text-direct.json` | 同一对话（direct 只改投递方式，客户端请求相同） | 1 |
| `03-tool-two-rounds.json` | 第 1 轮 Bash tool_use，第 2 轮 tool_result + 文本 | 2 |
| `04-subagent.json` | 主 → Agent(LEVEL1) → Agent(LEVEL2)，按线上顺序 | 5 |
| `05-compact.json` | 第 1 轮 + `/compact`（request 2 是压缩请求） | 2 |
| `06-turn2.json` | 同会话两轮（`--continue`，第 2 个 `cc_turn_index=2`） | 2 |
| `07-aux-nonessential.json` | 开启非必要流量（客户端仍未发辅助请求） | 1 |
| `08-noncc-reference.json` | 官方主线程请求，作为「非 CC 请求应长成什么样」的参考 | 1 |

注意：这些 A 都是「官方客户端在**本容器**里跑出来的」，所以 `x-stainless-os=Linux`、`runtime-version=v26.3.0`、`system` 里的 `# Environment` 是容器的值（`/t/run`、`Linux 6.12.95…`）、`memory` 路径是容器路径、`<total_tokens>15000000` 是本轮上下文的预算。做 31 号对照时这些字段只能看形状，不能看值。
