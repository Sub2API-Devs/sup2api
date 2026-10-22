# 子代理请求上下文设计

2026-10-22。已实现为 CLI v18（`ccgateway-v18-agent-context`，能力 `request_agent_context_v1`），未发布，实施结果见第 9 节。依据见 [CLAUDE-CODE-2.1.304-SYSTEM-PROMPT-ASSEMBLY.md](CLAUDE-CODE-2.1.304-SYSTEM-PROMPT-ASSEMBLY.md) 第 9–11 节：build 原样保留子代理的提示词、消息和计费头，但请求头按主线程生成（`request-class: main`，没有 agent-id、agent-type、prompt-id），还多带了 1 小时缓存的 beta。原因是请求命令和原生构建都写死了 `querySource: 'sdk'` 和主线程上下文。

## 1. 已定的规则（2026-10-22 用户决定）

1. 插件把客户端的 `x-claude-code-request-class`、`agent-id`、`parent-agent-id`、`agent-type`、`prompt-id` 转发给 Worker；有就用。
2. 用客户端原始 body 判断（在补计费头之前）：
   - 首块以计费头开头 → CC 真实请求；计费头带 `cc_is_subagent=true` → CC 子代理，否则 CC 主线程。
   - 没有 → 非 CC 请求，**按子代理构建**。
3. 发往上游的 ID 都派生：用账号私钥 HMAC（现有 `identityDigest`），保持官方格式，并保持官方请求里所有的相等关系（第 4 节）。
4. parent-agent-id 不虚构：客户端没发就按“从主线程启动”处理，不发。

## 2. 每类请求交给原生代码的输入

原生 `sF3` 按 `source/querySource`、`requestClass`、`agentContext`、`promptId` 生成请求头；`kLo` 按 `agentContext`、`promptId` 生成计费头；`zbe2(querySource)` 决定缓存时长和 `extended-cache-ttl` beta。所以只需给对这四项，不手写请求头。

| 请求 | querySource | agentContext | promptId |
|---|---|---|---|
| CC 主线程 | `sdk`（不变） | 主线程（不变） | P′ |
| CC 子代理，agent-type 是内置类型 | `agent:builtin:<类型>` | `{agentType:"subagent", agentId:A′, parentAgentId:B′?, parentPromptId:P′}` | P′ |
| CC 子代理，agent-type 为 `custom` 或缺失 | `agent:custom` | 同上 | P′ |
| CC 请求，客户端 request-class 为 compaction | `compact` | 主线程 | P′ |
| CC 请求，客户端 request-class 为其他值（auxiliary 等） | `sdk`，并显式传 `requestClass` | 主线程 | P′ |
| 非 CC 请求 | `agent:custom` | `{agentType:"subagent", agentId:A′}` | P′（见第 3 节） |

- 内置类型以 CLI 自己的内置代理名单为准；不在名单里按 `custom`。agent-type 缺失时第一版不做提示词匹配。
- 非 CC 请求发出的形状：`request-class: subagent`、`agent-type: custom`、有 agent-id、没有 parent；缺计费头时 v17 补的原生整行会带 `cc_is_subagent=true` 和 `cc_prompt_id`；5 分钟缓存，不带 1 小时 beta。已知代价：会话里只有子代理请求、system 末尾没有 CLI 的 T7t 三段，与真实 CC 不同（用户已知并决定）。

## 3. ID 的来源与派生（build）

密钥是账号私钥（v14 身份映射同一把），每类 ID 用各自的域标签。S 是客户端会话（`metadata.user_id` 的 `session_id`），没有时为空串，按固定规则派生，不用随机值。

| 上游值 | 客户端来源（优先级从高到低） | 派生 | 格式 |
|---|---|---|---|
| session-id（U） | `metadata.user_id` | 现有 `identityDigest(key, "session", S)` | UUID |
| agent-id（A′） | 请求头 agent-id，**原值不映射**（2026-10-22 改，见第 12 节）；没有请求头的 CC 子代理和非 CC 请求：第一条用户消息的文字 | 有请求头时不派生；否则 HMAC(会话密钥, "agent-text", 来源) | `a` + 16 位小写十六进制 |
| parent-agent-id（B′） | 请求头 parent-agent-id，原值不映射 | — | 同上 |
| prompt-id（P′） | 请求头 prompt-id；否则计费头的 `cc_prompt_id`；非 CC：第一条用户消息的文字 | `identityDigest(key, "prompt", 来源)` | UUID v4 |

- “一律优先请求头”：同一个子代理只要请求头里有 agent-id，就始终用它，避免一部分轮次用请求头、一部分用 body 而对不上。
- P′ 同时写进请求头和计费头的 `cc_prompt_id`（CLI 改写这一个字段的值，其余字节不动）。
- API Key 账号沿用现有规则：不映射。request-class、agent-type 是类别名，不派生。

## 4. 必须保持的关联（测试逐条断言）

| 关联 | 保证方式 |
|---|---|
| 请求头 session-id = metadata `session_id` | 同一函数 |
| 同一会话所有请求 session-id 相同 | 输入同为 S |
| 同一子代理各轮 agent-id 相同 | 输入同为 (S, A) |
| 子代理的 parent-agent-id = 上一层的 agent-id | 同一函数、同一 S |
| 请求头 prompt-id = 计费头 `cc_prompt_id` | 同一函数，一起改 |
| 子代理与父线程 prompt-id 相同 | 输入相同 |
| metadata `parent_session_id` = 父会话 session-id | 现有映射同一函数 |
| 重启、重新授权后不变 | 私钥在账号数据卷 |

不同账号的密钥不同，同一客户端会话在两个账号上派生出不同的值（换账号即换上游用户）。

## 5. direct

direct 的 body 原样转发，客户端的 `metadata.session_id`、`cc_prompt_id` 都是原值。为保持关联，direct 的请求头也用客户端原值：session-id 用 metadata 里的原值，agent-id、parent-agent-id、prompt-id 用客户端请求头的原值；非 CC 请求的 agent-id 仍派生（body 里没有对应值）。

现有问题（2026-10-22 重放确认）：direct 现在不给 CLI 身份上下文，CLI 用自己随机的会话 ID 发请求头，和 body 里客户端的 `session_id` 对不上。按上面的规则一起修。

## 6. 实现位置

- **插件**（`internal/ccgateway/ccgateway.go` `headers`）：多放行四个头，各自校验格式（可打印 ASCII、长度上限；prompt-id 必须是 UUID；request-class、agent-type 限定字符集）。
- **Worker**（请求命令路径）：解析这些头和 body 里的判断依据，按第 3 节派生，作为新的环境变量交给 CLI；新能力 `request_agent_context_v1`，旧 CLI 不给。
- **CLI**：请求命令创建客户端时、build 交给原生构建时，用这份上下文代替写死的 `sdk` 和主线程上下文；改写计费头的 `cc_prompt_id`。

## 7. 验证

- 单元测试：第 4 节全部关联，含会话为空、嵌套子代理、只有 body 标记、非 CC 请求。
- 30 号：官方 CLI + 假上游抓主线程、子代理、嵌套子代理、压缩请求，经网关 build 和 direct 后重放，逐字段与官方对比，并核对第 4 节关联；非 CC 请求单独抓一次。真实上游各发一次确认 200。

## 8. 待确认

1. CC 请求的 compaction / auxiliary：querySource 的取法未实测，第一版按第 2 节，测完再定。
2. agent-type 缺失时是否做内置提示词匹配：第一版不做。

## 9. 实施结果（2026-10-22，未发布）

**实现**
- 插件 `internal/ccgateway/ccgateway.go`：放行 `x-claude-code-request-class`、`agent-id`、`parent-agent-id`、`agent-type`、`prompt-id`，格式不对的丢掉。
- Worker `engine/request_agent.go`：读这些头，算出会话范围的映射密钥 `identityDigest(账号密钥, "agent-context", S)`，经 `CCG_REQUEST_AGENT` 交给 CLI（build 且 OAuth 时 `map: true`）；API Key 账号不给密钥；登录邮箱未知时用 Worker 私钥派生。direct 另给客户端模式的身份上下文，让 CLI 采用客户端会话。控制台测试不给。
- CLI `request-agent.js`：判断请求类别、派生 ID（账号映射在 CLI 内用会话密钥做 HMAC，标签 agent/prompt 分开，agent 与 parent 同一标签），选出 `querySource`（CC 自己的 `Zoe`）、子代理上下文和 `promptId`。请求命令把它们交给 CC 创建客户端的 `sF`，build 交给原生构建，direct 交给补计费头的 `kLo`；build 改写客户端计费头的 `cc_prompt_id`。判断用的计费头前缀、首条提示文字都取自原生（`oJe`、`KF` + `fingerprintMessages`）。
- 第 3 节与设计的差别：会话密钥由 Worker 算好交给 CLI，账号密钥不出 Worker；派生在 CLI 里做，因为判断 CC 请求要用 CLI 的原生词表。

**测试**：插件、Worker（含新测试 `TestRequestAgentContext`）、contracts、cli-mods 152 项全过。

**30 号抓包**（v18 ELF sha256 `eb151345…`，线上 v17 Worker 生成 build 输入，v18 CLI 按 v18 Worker 的方式带上下文发到假上游）：

| 请求 | request-class | agent-type | agent-id / parent | prompt-id | 1 小时 beta | 计费头 |
|---|---|---|---|---|---|---|
| build 主线程 | main | — | — | 映射值 | 有 | `cc_prompt_id` 改为映射值，turn 字段保留 |
| build 子代理 | subagent | general-purpose | 映射值 | 同主线程 | **无** | `cc_is_subagent=true`，`cc_prompt_id` 映射值 |
| build 嵌套子代理 | subagent | Explore | 新值 / parent = 上一行的 agent-id | 同上 | 无 | 同上 |
| build 子代理，无请求头 | subagent | custom | 由首条提示派生 | 由 `cc_prompt_id` 映射 | 无 | 同上 |
| build 压缩 | compaction | — | — | 同主线程 | 有（原生按 `compact` 判断） | 同主线程 |
| build 非 CC | subagent | custom | 派生 | 派生 | 无 | 原生补的整行带 `cc_is_subagent=true` 和同一 `cc_prompt_id` |
| direct 子代理 | subagent | general-purpose | 客户端原值 | 客户端原值 | 无 | 原样 |
| direct 非 CC | subagent | custom | 派生 | 派生 | 无 | 补的头带 `cc_is_subagent=true` 和同一 `cc_prompt_id` |

第 4 节的关联逐条核对通过：子代理两轮 agent-id 相同；嵌套 parent 等于上层 agent-id；子代理、压缩与主线程 prompt-id 相同；每个请求的 prompt-id 头等于计费头 `cc_prompt_id`；同一会话 session-id 相同且等于 metadata；direct 全部是客户端原值。没有上下文时仍是原来的主线程行为。

**未完成**：30 号的 OAuth 令牌在 2026-10-22 04:22–05:23（UTC）之间被上游吊销（此后所有请求 401 "OAuth access token has been revoked."，包括线上用户请求），真实上游测试没有做。需要 30 号重新授权后补测，再发布。

## 10. 端到端：真实客户端 → 网关 → 出口（2026-10-22，离线）

ovh 上一次性容器（`ccgateway-app:0.1.74` 镜像，`--network none`）：官方 Claude Code 2.1.304 客户端用 `ANTHROPIC_BASE_URL` 指向本地 Worker（当前源码构建 + v18 CLI），假装已登录；Worker 的账号是假的 OAuth 凭证，出口走 unix socket 上的假上游，记录每个请求并让对话跑出主线程 → 子代理 → 嵌套子代理。同一对话另由客户端直连假上游作为对照（Anthropic 从真实客户端收到的样子）。没有任何请求出网。脚本在 `artifacts/claude-2.1.304/e2e/`。

**客户端指向自定义地址时，客户端自己就少发很多东西**（对照 Worker 收到的请求）：CC 只在官方地址时写 `cch`、`cc_prompt_id`、`cc_turn_*`、`cc_prev_req`，发 request-class / agent-type / prompt-id / prev-tool-durations 请求头、`diagnostics`，system 分块和 `scope: global` 缓存也按官方地址才有。于是出口的 agent-type 只能是 custom、没有 prompt-id、计费头只有两个字段、system 3 块而不是 4 块。agent-id、parent-agent-id、session-id 头不受影响。

客户端设 **`_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`**（CC 自带开关，`Ri7()`）后，客户端按官方地址的形状发；经网关后出口与对照逐字段比较：

| 差异 | build | direct | 来源 |
|---|---|---|---|
| ID 值（session、agent、parent、prompt） | 映射值 | 客户端原值 | 设计如此；对照是另一次会话 |
| `cch` 值 | 客户端算的值，但 build 改了 `cc_prompt_id` 和 metadata，可能已不匹配 body | 客户端算的值，body 原样 | — |
| `anthropic-beta` 少 `mid-conversation-system-clear-at-2026-08-21` | 是 | 是 | 客户端对自定义地址就不发 |
| `x-stainless-timeout` 3600（官方 600） | 已修 | 已修 | 客户端超时保持 600 秒，Worker 的期限另行生效（`model-request.js`） |
| 缺 `x-claude-code-prev-tool-durations` | 已修 | 已修 | 插件、Worker 转发，CLI 原样发出 |
| 工具定义键顺序（`description` 在 `name` 前） | 已修 | — | Worker 按客户端键顺序传工具，CLI 原位改名 `input_schema` |

其余全部一致：request-class、agent-type、parent 关系、计费头字段集合（含 `cc_is_subagent`、turn 字段、`cc_prev_req`）、system 文本与分块缓存、messages、tools 内容、metadata 结构、diagnostics、其余 beta。

修复后（v18 ELF sha256 `64c3759c…`）重跑：上表三项消失；默认客户端、设开关的 OAuth 客户端、设开关的 API Key 客户端都跑通（API Key 客户端本身就按 5 分钟缓存、个别工具说明不同，见 [接入说明](CLIENT-SETUP.md)）。

**新发现的关联问题（已于第 12 节解决）**：子代理结束后，父线程收到的 tool_result 正文里写着子代理的 agentId（`agentId: a… (use SendMessage with to: 'a…', …)`），这是客户端的原值。build 映射 agent-id 后，上游看到的子代理请求头是映射值，父线程正文里却是原值，两者对不上；官方请求里两者相同。agent-id 本来就以原值出现在正文里，映射它并不能隐藏什么。

## 11. #21 真实上游端到端（2026-10-22）

#21（CCGateway API Key 联调测）的 app 容器里另起一个私有 Worker（当前源码 + v18 CLI，独立数据和配置目录，线上 Worker 不受影响），官方 2.1.304 客户端（`_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`，API Key 方式）经它访问账号的真实上游；对照组是同一客户端直连该上游。所有上游请求都过一个只记录不改动的转发器。场景：子代理（general-purpose）、`--continue` 续问、`/compact`、Explore、项目自定义代理、Read 工具，`claude-sonnet-4-6`。容器内除 8787 外的回环 TCP 会被出口接管，客户端改经 unix socket 连这个 Worker（测试用 Worker 临时加了 unix 监听，未提交）。

- 结果：对照 14 个、build 15 个、direct 16 个上游请求全部 200，六个场景两种模式都完成。
- body：按场景、请求类型、轮次配对的 12 个请求，body 键、system、tools、metadata、thinking、context_management、output_config、首条 user 消息和消息形状全部与对照一致（模型自己的回答、ID 除外）。
- 请求头：API Key 账号的出口只剩最小集合（`apiKeyRequestHeaders`：x-api-key、version、content-type、`user-agent: ccgateway-request`、accept、beta），官方客户端发的 `user-agent: claude-cli/…`、`x-app`、`x-stainless-*`、`anthropic-dangerous-direct-browser-access` 和全部 `x-claude-code-*` 都没有。这是 API Key 路径原有的做法，与 v18 无关。
- 新发现：客户端在压缩请求上带 `x-cc-compaction-request: manual` 和 `x-claude-code-compaction: manual`，压缩后的下一个请求带 `x-cc-context-compacted`、`x-claude-code-context-compacted`（CC `Zmn2`，按 `compactionRequestKind` / `contextCompactedKindForWire`）。网关目前不转发、请求命令也不设，OAuth 和 API Key 两条路径都缺。

## 12. 补齐：API Key 原生头、压缩头、agent-id 原值（2026-10-22，随插件 0.1.75 部署 ovh）

用户要求三项都加上（“就算是 apikey，真实 cc 也会带上相关计费头”）。

**改动**
- API Key 路径保留 CC 构建的全部请求头（`request-options.js` `apiKeyRequestHeaders`），只核对认证是配置的 key、设 version 和请求的 beta；登录专用的 `oauth-2025-04-20` beta 不随 API Key 发（CC 自己用 API Key 时也不发）。
- 四个压缩头 `x-cc-compaction-request`、`x-claude-code-compaction`、`x-cc-context-compacted`、`x-claude-code-context-compacted`：插件放行（`^[a-z][a-z_]{0,31}$`），Worker 经 `CCG_REQUEST_AGENT` 交给 CLI，CLI 原样发出（与 prev-tool-durations 同一处理）。
- agent-id、parent-agent-id 在 build 也用客户端原值，只在客户端没有时派生；prompt-id 仍按第 3 节映射。第 4 节的关联不变（原值本身就满足），并且与父线程正文里的 agentId 一致。
- Worker 给带上下文的请求命令设 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`：账号上游不是官方地址时（#21 这种 API Key + 自定义 base URL），CC 原本不写 request-class、agent-type、prompt-id 头，上下文会丢；设了以后按发往 Anthropic 的样子发。账号上游本来就是官方地址时无变化。控制台测试和旧 CLI 不设。

**测试**：插件、Worker 全包、companions、cli-mods 156 项全过。v18 ELF sha256 `8b6eb1e4…`。

**离线端到端**（同第 10 节环境）：
- OAuth 账号 + 设开关的 OAuth 客户端：与对照的差别只剩 ID / `cch` 值和客户端自己不发的 `mid-conversation-system-clear` beta。
- API Key 账号 + 设开关的 API Key 客户端（对照：真实客户端用 API Key 直连）：请求头除上面那个 beta 外与对照一致（user-agent、x-app、x-stainless-*、全部 x-claude-code-*），body 除 ID、子代理耗时外一致。若客户端用 OAuth 方式接入而账号是 API Key，body 是客户端 OAuth 形状（1 小时缓存、ScheduleWakeup 说明），这是客户端决定的，网关原样转发。
- 两种账号 build / direct 下，正文里的 agentId 全部与请求头 agent-id / parent-agent-id 对得上。

**#21 真实上游重跑**（只跑 build、direct，对照沿用同日先跑的一组）：build、direct 各 16 个请求全部 200，六个场景完成。与对照相比请求头已无差别（request-class、agent-type、prompt-id、prev-tool-durations 都有；压缩请求带 `x-cc-compaction-request: manual`、`x-claude-code-compaction: manual`，与对照相同）；正文 agentId 与请求头一致。剩下的差别只有 Explore 场景里模型自己写的子代理任务文字（每次运行不同）。

**已知**：没有密钥的 API Key 账号，非 CC 请求的 agent-id 由首条提示文字直接哈希，同样文字在不同 API Key 账号上得到同一个值。
