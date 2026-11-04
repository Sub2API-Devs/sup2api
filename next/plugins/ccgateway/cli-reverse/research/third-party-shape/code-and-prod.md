# 官方 CC 经自定义 ANTHROPIC_BASE_URL 接入（"三方形状"）：现状、生产数据与"转成一方形状"的方案

2026-11-02，只读分析（未改任何受控文件）。代码以当前工作区 `feat/next-platform`（CLI 2.1.316 / patch v43–v44 时期）为准；官方二进制行为以 `artifacts/claude-2.1.316/linux-restored/` 与 2.1.312 的实抓为准。

## 0. 结论速览

- **今天的行为**：三方形状的 CC 请求在 build（默认 low）和 direct 下，计费头、system 三块、cache_control、身份行都**原样保留**；会话记忆（cc_prev_req/turn）**整条跳过**；不注入任何层；UA 保留客户端的；metadata.user_id 被映射成账号身份。**但我们的 CLI 自己按一方形状写请求头**（设了 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`），所以上游实际收到的是"三方计费头 + 三块 system + 一方才有的 `x-claude-code-request-class`/`x-client-request-id` 头"的混合形状（按代码推断，未实抓），真实 CC 不会这样发。
- **生产（近 7 天，ccgateway）**：24,974 条请求里 19,788 条（79%）UA 是 `claude-cli/…`，全部是 2.1.x，覆盖 54 个版本；其中 2.1.316（与我们 CLI 同版本）只有 1,210 条。数据库里**没有任何字段记录计费头长度/字段**，短头与长头的比例查不出来；Worker 请求日志里能区分的信息只在逐条文件里（见 3.3），按要求没有读。从入口看 `claude-desktop-3p` 4,024 条按定义就是三方模式，其余入口也都是改 base URL 接入，**预计几乎全部是 74 字短头 + 3 块**。
- **system 3→4 能否确定性还原**：能，但有前提。实测 2.1.312 Opus 4.8：三方合并块 == 一方静态块 + `"\n\n"` + 一方动态块（逐字相等，环境路径归一化后）；2.1.312 与 2.1.316 的 Sonnet 4.6 静态块逐字相同。只要能用原生构建器为同一模型/工具集生成静态块并做前缀匹配就能切；客户端版本与我们 CLI 版本不同、或客户端自定义了 system 时会匹配失败，只能不切。
- **与既有决定的冲突**：任何"把客户端的头改成一方形状"的做法都直接违反 2026-10-30 的"客户端自带头原样保留、一个字段都不加"（BILLING 文档 §0、§2.1、§5.1），切块/改 cache_control 违反"不拆分客户端结构"（preserve-client-structure）；补 diagnostics 碰到 tether 那条"先不管"。cch 只能写 `00000`（用户已定不计算），等于把"缺字段"这个特征换成"cch 是占位"这个特征。

## 1. 今天一个三方形状 CC 请求经过的路径

输入样本（官方 2.1.312，自定义 base URL，OAuth，`claude -p hi`；`artifacts/claude-2.1.312/captures-container/req-001.json`）：

- 计费头 74 字 `cc_version=2.1.312.0cd; cc_entrypoint=sdk-cli;`（子代理另有 `cc_is_subagent=true;`，`cc_workload` 也不受一方门控）
- system 3 块：头（无 cache_control）/ 身份行 62 字 `{ephemeral,1h}` / 合并提示词 5560 字 `{ephemeral,1h}`（一方是：身份行无标记、静态 1171 `{1h,scope:global}`、动态 4388 `{1h}`）
- 请求头：没有 `x-claude-code-request-class`/`-agent-type`/`-prompt-id`/`-prev-tool-durations`、`x-client-request-id`、压缩相关头；子代理的 `x-claude-code-agent-id`/`-parent-agent-id` **不受门控、照发**
- betas 少 `prompt-caching-scope-2026-01-05`、`thinking-binding-controls-2026-08-01`、`cache-diagnosis-2026-04-07`；body 没有 `diagnostics`
- 原生门控（2.1.316 还原代码）：计费头字段 `cch/cc_prev_req/cc_prompt_id/cc_turn_*/cc_prev_msg` 都要 `n==="firstParty"&&Oi()`（`chunk-3b05zaw0.js`，原 f3o）；request-class/agent-type/prompt-id 头要 `gir()`（`chunk-hwmsct5x.js` 的 MN 头组装，`gir` = `CLAUDE_CODE_GATEWAY_HINT_HEADERS` ?? `us()` ?? GrowthBook `tengu_splendid_sutton`）；`us()=Te()==="firstParty"&&Oi()`，`Oi()` → `Pu()` = 没设 `ANTHROPIC_BASE_URL` 或它是官方地址（`chunk-v9tcvh08.js`）；压缩头与工具耗时头 `a_n/l_n` 用 `us()/gir()`、`x-client-request-id` 用 `qae()`（`chunk-e6aww6q8.js`）。

### 1.1 核心与插件

| 项 | 处理 | 位置 |
|---|---|---|
| body | 原样交给插件/Worker | — |
| 入站头 | 只放行 anthropic-version、anthropic-beta、10 个 CC 上下文头、user-agent；x-stainless-*、x-app、x-claude-code-session-id 等全部丢掉 | `next/plugins/ccgateway/manifest.json:85-98`；`internal/ccgateway/ccgateway.go:116-131,140` |
| UA 入账 | `usage_logs.user_agent` 存客户端 UA（截 500） | `next/server/internal/gateway/pipeline.go:337` |

### 1.2 Worker（engine）

| 项 | 处理 | 位置 |
|---|---|---|
| CLI 环境 | 一律设 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1` | `engine/request_command.go:475` |
| 代理上下文 | 把放行的 CC 头（含 UA）交给 CLI | `engine/request_agent.go:39-51,65-81` |
| metadata.user_id | 默认 replace：device/session/parent 用账号密钥 HMAC 映射，客户端命名的会话 `named=true` | `engine/request_identity.go:140-151,377-420` |
| 会话记忆 | system 首块以计费头开头 → 直接跳过（不读、不写） | `engine/session_state.go:324`；`engine/request_body.go:91-106` |
| 线程判定 | 有 agent-id 头就是该子代理线程，否则主线程（三方子代理带 agent-id，判得出） | `engine/session_state.go:69-87` |

### 1.3 定制 CLI（build，默认 low）

| 项 | 保留/改写/添加/丢弃 | 位置 |
|---|---|---|
| 入口 | 取客户端头里的 `cc_entrypoint`，并按它设 UA 与原生头 | `request-build.js:234-235`；`content-policy.js:516-519` |
| 环境字段 | **改写**：按 `build_attachment_sources` 把合并块里 `# Environment` 等字段换成服务端值或擦除（这是 low 的一部分，与注入层无关） | `request-build.js:236,269-273` |
| 计费头 | **保留**：头在首块开头且两字段齐 → `needed` 为空直接返回；Worker 拥有字段时只替换值 | `request-build.js:317`；`content-policy.js:429-459`（444-446）；`shared.js:18` |
| cc_prompt_id | 客户端没有 → 不写；只在客户端带了时按映射替换 | `request-build.js:319`；`request-agent.js:87-89,96` |
| system 块与 cache_control | **原样**：原生 system 被整体换成客户端块，原生缓存标记关闭 | `request-build.js:285,289`；`patches/2.1.316.cjs:59` |
| 注入层 | **全部跳过**（hasBilling 闸门） | `request-build.js:254`；`content-policy.js:523-529` |
| 身份行 | 客户端已有 → 不动；自带计费头 → `line:'none'` | `request-build.js:181-189,199-216,260` |
| turn 字段 | `markPrompt` 只给 records 标位置，但三方头里本来没有 turn 字段，`mergeBillingAttribution` 也不补 → 不出现 | `request-build.js:243` |
| 会话记忆 | `clientBilling !== null` → 不调用 `continueSession` | `request-build.js:247`；`request-session.js:198-211` |
| request-class | 客户端没 request-class 头 → 按 `cc_is_subagent` 判 main/subagent，**原生 MN 照样写 `x-claude-code-request-class`**（我们的 CLI 是一方形状），子代理还写 agent-type | `request-agent.js:84-86,97-107`；`request-command.js:259-263` |
| prompt-id 头 | promptId 为 undefined → 不写 | `request-agent.js:88-89` |
| x-client-request-id | 原生 `qae()` 在我们 CLI 里为真 → 会写（推断） | 原生 `chunk-e6aww6q8.js` `i_n` |
| UA | 头的 cc_version/cc_entrypoint 与发出的一致 → **保留客户端 UA** | `request-command.js:173`；`request-agent.js:124-129`；`patches/2.1.316.cjs:91` |
| x-claude-code-session-id | 用 Worker 映射的上游会话 | `patches/2.1.316.cjs:13` |
| betas | 客户端的原样，加构建器/登录必需的（oauth） | `request-build.js:328-329`；`request-command.js:174` |
| diagnostics | 只有客户端带了才发 → 三方客户端没有 → 不发 | `request-parameters.js:20-24,105` |
| context_management 等其余字段 | 客户端值覆盖 | `request-parameters.js:97-113` |

direct（level none）：客户端头齐全就整个 body 逐字节转发（`request-command.js:214-238`，`direct-billing.js:43-54`），会话记忆同样只在 `requestBilling(body.system) === null` 时用（`request-command.js:232`）；请求头仍由我们的一方形状 CLI 生成，request-class 的混合问题同样存在。

## 2. 转成一方形状要动的地方与约束

### 2.1 挂点

| 要做的事 | 挂点 |
|---|---|
| 判定"这是三方形状的 CC 请求" | CLI：`request-build.js:241`（clientBilling 已解析）；建议条件 = 首块开头的头只有 `cc_version`/`cc_entrypoint`（可选 `cc_workload`/`cc_is_subagent`）+ UA 是 `claude-cli/` + 没有 request-class 头 |
| 重写计费头 | 不能用 `applyBillingFields` 的"缺的追加到行尾"（`content-policy.js:489-502`）：一方顺序是 `cc_version; cc_entrypoint; cch; [cc_workload]; [cc_is_subagent]; [cc_prev_req]; [cc_prompt_id]; [turn…]`，追加会把 cch 放到 cc_is_subagent 后面。应让原生头函数（`patches/2.1.316.cjs:97` 截获的 JXs 产物）按客户端的 version 字符串与入口重出一整行，再把 `cc_version` 换回客户端原值（含客户端算的指纹后缀） |
| 会话记忆 | Worker `session_state.go:324` 去掉 `leadsWithBillingHeader()` 闸门；CLI `request-build.js:247` 放开 `clientBilling===null`；`rememberSessionState` 依赖 CLI 报告 `session` |
| prompt-id | `request-agent.js:87-89`：CC 请求没给时派生；同时要让 MN 写 `x-claude-code-prompt-id` 与头里的 `cc_prompt_id` 一致 |
| system 3→4 | `request-build.js` 在 `options.ccgatewaySystemBlocks`（:289）之前切块；`limitBreakpoints`（:118-125）要覆盖 |
| betas | `finishBuilt` 的 addedBetas（:328），用 `finalBetas`/`betaOrder` 定位置（`request-command.js:184-187`） |
| diagnostics | `request-parameters.js:24` 的 clientOnly 规则；需要 Worker 记住上次应答的 `message.id` |
| 注入闸门 | `request-build.js:254` 必须保持（用户规则），转换不能借道去补提示词/工具 |
| 回归 | e2e 套件所有客户端都设了一方假设（`cli-mods/test/e2e/README.md:32`），三方形状完全没有覆盖，需新增"不设该变量"的 A/B 场景 |

### 2.2 各字段的约束

| 字段 | 原生怎么来 | 能否从三方请求还原 |
|---|---|---|
| `cch` | 官方 Bun 运行时按请求内容算，JS 里是 `00000` | 不算（用户 2026-10-30 已定）。只能写 `00000`，与我们自己写的头一致，但比"没有 cch"多一个已知假值 |
| `cc_prev_req` | 本线程 transcript 最后一条 assistant 的 requestId | Worker 已有记忆（§5），三方 CC 都带命名会话、全量历史，`continuedBy` 通常成立；压缩、回退、换分支后不成立 → 不带（与现规则一致）；进程重启丢 |
| `cc_prompt_id` | 每次用户提交 prompt 随机 UUID，本轮工具循环与子代理（parentPromptId）共用 | 不能从历史得到原值；可派生为 HMAC(会话, 最后一个 prompt 的序号+内容)：本轮内稳定、跨轮变化，上游看不出差别。子代理要拿父线程当前 prompt-id，需 Worker 按会话记住主线程最新值，否则只能单独派生 |
| `cc_turn_origin` / `cc_prompt_index` / `cc_turn_index` | 原生按 transcript 计数（cli 入口为 human） | `ccgatewayMarkTurns` 已能按历史算（`native-environment.inc.js:162-171`）；CC 压缩后历史变短，原生仍延续计数，我们会回退到小值（记忆在压缩后不成立，修不了） |
| `cc_prev_msg` 等（2.1.316 压缩后） | 压缩前最后一条主应答的 message.id | 需另记 message.id；现有设计对我们写的头也不补（§1.1），建议同样不补 |
| system 3→4 | `sI` 末尾 `b8n(s, A6()?uN:null)`：有分界符才切 | 见 2.3 |
| cache_control | 一方：身份行无标记、静态 `{1h,scope:global}`、动态 `{1h}` | 把身份行的标记移到静态块并加 `scope:global`，合并块的标记留在动态块；断点总数不变。需加 `prompt-caching-scope-2026-01-05` |
| request-class / agent-type 头 | gir() 时写 | 我们的 CLI 已在写（现在反而是不一致的来源） |
| `x-claude-code-prev-tool-durations` | 本轮各工具耗时 | 无法还原（客户端没给，网关不知道工具耗时），只能不发 |
| 压缩头 `x-cc-context-compacted` 等 | us()/gir() | 三方客户端不发，网关也无从判断哪一条是"压缩后第一条"（可看 messages 是否以压缩摘要开头，但不可靠），建议不发 |
| `diagnostics.previous_message_id` | 历史最后一条 assistant 的 message.id，首轮 null | 需 Worker 记住应答的 message.id（与 request-id 同一机制）；配 `cache-diagnosis-2026-04-07` |
| `thinking-binding-controls-2026-08-01` | 一方抓包有、三方没有，门控未查清 | 需先在还原代码里确认条件再决定 |

### 2.3 system 3→4 能否确定性还原

- 实测（`captures-fp/req-001.json` 与 `captures-container/req-001.json`，同为官方 2.1.312 Opus 4.8）：三方合并块 `startsWith(一方静态块)`，紧跟 `"\n\n"`，其后与一方动态块逐字相等（唯一差别是两次运行的 HOME 路径 `/t/home` 与 `/t/home2`）。即 merged = static + `"\n\n"` + dynamic，分界符本身不外发。
- 静态块跨版本稳定性：2.1.304 = 2.1.312（BILLING/ASSEMBLY 文档 §12.2：1171 / 10695），2.1.312 = 2.1.316（官方抓包 Sonnet 4.6 静态块逐字相等，本次核对）。
- 确定性的做法：用我们 CLI 的原生构建器（`ccgatewayDefaultPrompt` 同一路径，`native_systemPromptBlocks`）为该请求的模型与客户端工具集生成静态块文本，`merged.startsWith(static + "\n\n")` 成立才切；不成立就不切。不靠关键词猜。
- 匹配不上的情形：客户端版本的静态段与我们 CLI 不同（生产 54 个版本里 2.1.280 以下 659 条、2.1.280–2.1.303 1,680 条，变化可能性最大）；静态段随模型（lean/全量）、输出风格、工具集合（"# Using your tools" 是否提到 Bash 等）变化，客户端工具集要以请求里的为准；客户端自定义 system（SDK `systemPrompt`、部分桌面/插件场景）时本来就没有静态段——这种情况下一方 CC 也是不切块的，所以"匹配不上就不切"本身与一方行为一致。
- 风险：切错（把客户端自己的文字当成静态段）会产生真实 CC 不会发的形状，且 `scope:global` 会把错误的文本放进跨会话共享缓存；切换生效那一刻每个在途会话的缓存前缀会变一次（一次性 cache miss）。

## 3. 生产证据（ovh → Supabase，只读）

做法：SQL 写成文件 scp 到 ovh，`postgres:16-alpine` 一次性容器，`PGOPTIONS=-c default_transaction_read_only=on` 且脚本首行 `SET default_transaction_read_only = on`，只有 SELECT；临时 SQL 文件已删除。DSN 在 ovh 的 `~/.secrets/supabase-sup2api.dsn`（本机没有该文件）。

### 3.1 近 7 天 ccgateway 请求的 UA

| UA | 请求 | 成功 | API Key | 账号 |
|---|---|---|---|---|
| `claude-cli/…` | 19,788 | 18,561 | 2 | 51 |
| 其他 | 5,186 | 3,852 | 2 | 51 |

其他里 `Go-http-client` 5,083 条，其余是 Claude-Desktop-KIE-compat、claude-local-gateway、ZCode、kimi-code-desktop（共 103 条）。全部只有 1 个用户、2 个 Key：Key 118 是单一来源 IP（16,056 条 CC + 5,062 条 Go-http），像是一个下游中转；Key 14 有 4 个 IP（3,739 条 CC）。也就是说大部分 CC 流量经过一层下游中转，UA 被原样带过来了。

按入口：cli 9,789、claude-desktop-3p 4,024、claude-vscode 3,429、sdk-cli 1,919、local-agent 536、sdk-ts 95、sdk-py 3。

按版本：2.1.304–2.1.311 13,932；2.1.312–2.1.315 2,329；2.1.316 1,210；2.1.280–2.1.303 1,680；2.1.280 以下 659（共 54 个版本）。

### 3.2 短头还是长头：数据库里查不到

`usage_logs` 的 49 列里没有计费头或 system 结构信息；ccgateway 的 `plugin_detail` 为空，`metrics` 只有 cache_write_evidence/inference_geo/service_tier/speed/web_*，`anomalies` 只有 failure_policy。所以短头与长头的比例**没法从数据库得出**。推断：claude-desktop-3p 按定义是三方模式；其他入口要变成长头，用户得自己设 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL`（内部变量，几乎没人设），所以预计接近 100% 是短头。

### 3.3 Worker 请求日志：已跳过

能区分的事实只在逐条请求的文件里：`metadata.json` 的 `anthropic_beta`（客户端入站 beta，一方客户端带 `prompt-caching-scope-2026-01-05`/`cache-diagnosis-2026-04-07`）、`request-headers.json`（有没有 `x-claude-code-request-class`），full 级别时还有 `request.body`。控制器 API 的列表索引（`engine/request_log_viewer.go` 的 `logEntry`/`logQuery`）没有这些字段，只能逐条调 `detail`；直接 `docker exec` 进账号容器读文件又不属于"控制器 API"。按要求**没有读**。如需数字，可在用户同意后在 ovh 上对各 `ccg-*-app` 容器只读统计 `metadata.json` 里 `anthropic_beta` 是否含 `prompt-caching-scope`（只输出计数）。

## 4. 方案与风险

| 方案 | 内容 | 主要风险 | 与既有决定的冲突 |
|---|---|---|---|
| A 全量转一方（开关，默认关） | 识别三方 CC 请求 → 原生重出整行头（cch=00000、cc_prev_req 走记忆、派生 cc_prompt_id、turn 按历史+记忆）、静态前缀匹配成功才 3→4 并移动 cache 标记、补 betas、补 prompt-id 头；匹配失败整条退回原样 | 版本不一致时只能部分转换（头一方 + 3 块），切错污染 global 缓存；cch=00000 是新的可识别特征；压缩后 turn 回退；子代理 prompt-id 关联靠记忆；上线时缓存前缀变一次；e2e 无覆盖 | 违反"客户端自带头原样保留、一个字段都不加"（BILLING §0/§2.1、billing-header-gates-injection 第 2 条只授权补"我们写的头"）；违反 preserve-client-structure（拆块、改 cache_control；判断标准是官方 Messages API，API 不会拆块，"客户端连官方地址时自己会拆"只能算论据，需用户明确认可）；§5.1"客户端自带头的请求不读也不写记忆"要改；diagnostics 部分碰 tether"先不管" |
| B 只转头与请求头，不动 system | 计费头补一方字段，保持 3 块 | 造出"一方头 + 三方 system（无 scope:global）"的组合；真实 CC 只在自定义 system 时这样发，默认提示词下不会 | 同 A 的计费头冲突；不碰结构规则 |
| C 反向统一成纯三方形状 | 对保留客户端三方头的请求，不让我们的 CLI 加一方才有的 `x-claude-code-request-class`/`-agent-type`/`x-client-request-id`（`request-command.js:259-263` 传给 createClient 的参数，或按客户端头形状给 CLI 关掉 gir） | 不会变成一方形状，只是消除今天的混合；需要先实抓确认我们 CLI 现在确实在加这几个头 | 不冲突，符合"客户端结构原样"；但改变了"一律按一方形状出头"（`request_command.go:475` 的决定 4.4 是针对我们自己写的头，需说明适用范围） |
| D 让客户端自己出一方形状 | 在 CLIENT-SETUP 里让用户设 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1` | 内部变量，随版本可能失效；会打开其他一方行为（GrowthBook、tether/cache_touch 判定、/api/oauth/* 等调用会打到我们的网关），需实测哪些端点会 404；桌面 3p、下游中转（Key 118）用户控制不了；子代理/压缩头都会带来，要确认插件放行和 Worker 处理都对 | 不冲突：客户端自己写的头原样保留，cch 也是客户端真算的，保真度最高 |

建议：先做 C（修掉今天的混合形状，最小、无冲突），并对 D 做一次离线实测（e2e 套件已有现成的对照方法）。A 只有在用户明确推翻"自带头原样保留"和"不拆块"两条之后再做，并且要按"全有或全无"实现：静态前缀匹配不上就整条不转。

## 5. 顺带发现

- **非 CC 请求的派生 `cc_prompt_id` 整个会话不变**：`request-build.js:242` 传给 `resolveAgentContext` 的 `prompt` 是 `fingerprint[0].message.content`，即对话的第一个 prompt（`request-input.js:280-290`），派生值 `uuidV4(derive(key,'prompt-text',prompt))`（`request-agent.js:88-89`）因此每轮相同；原生是每次提交 prompt 换一个。属于我们自己写的头与官方不一致，建议另行确认。
- 三方形状下的子代理会带 `x-claude-code-agent-id`（原生不门控），所以 Worker 的线程判定对三方子代理是有效的；放开记忆时不需要额外的线程来源。

## 6. 引用的记忆与文档

- `C:/Users/16790/.claude/projects/D--projects-golang-sup2api/memory/`：billing-header-gates-injection.md、preserve-client-structure.md、official-cch-computed.md、e2e-offline-gateway-test.md、request-levels-injection.md、cc-message-threads-tether.md
- `next/plugins/ccgateway/docs/CLAUDE-CODE-BILLING-AND-PROMPT-INJECTION.md` §0–§5；`CLAUDE-CODE-2.1.304-SYSTEM-PROMPT-ASSEMBLY.md` §12
- 抓包：`artifacts/claude-2.1.312/captures-container/req-001.json`（官方三方）、`captures-fp/req-001.json`（官方一方）、`artifacts/claude-2.1.316/captures/official-request-2.1.31{2,6}.json`
- 原生门控清单：`artifacts/cc-thirdparty/gates-316.txt`
