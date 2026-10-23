# 04 定制版 Claude Code CLI（cli-mods）审核

审核日期：2026-10-23；分支 `feat/next-platform`，HEAD `f546fa31a`；补丁标签 `ccgateway-v21-native-layers`（插件 0.1.80）。只读审核，除本文件外没有改仓库任何文件；临时脚本在 `%TEMP%\ccg-audit-d\`（`strict21.cjs`、`inout21.cjs`）。

## 1 范围与方法

**读过的代码**：`patch-cli-2.1.304.cjs`（全部 184 行）、`native-environment-2.1.304.inc.js`、`request-build-2.1.304.js`、`request-command.js`、`request-input.js`、`request-policy.js`、`request-parameters.js`、`request-identity.js`、`request-agent.js`、`request-options.js`、`request-error.js`、`request-output.js`、`content-policy.js`、`direct-billing.js`、`model-request.js`、`native-tools.js`、`tool-dispatch.inc.js`、`container-resources.js`、`request-build.js`（296/302 版）、`patch-cli.cjs`、`package-release.cjs`、`profiles/linux-x64-2.1.304.json`、`release/manifest.json`；Worker 侧只读对账 `engine/request_command.go`（信封、环境变量、参数）、`engine/request_agent.go`、`engine/request_identity.go`。

**原生对照**：`artifacts/claude-2.1.304/linux-restored/` 中的 `qmn`、`Gmn`、`sF`、`nl`、`ty`、`xFt`、`PAs`、`n1n`、`t1n`、`kLo`、`B1s`、`xh`、`Lcr`、`wx`、`r1e`、`pr`、`Wkt`、`JDr`、`fC`、`dN`、`jHs`、`ZUo`，以及打补丁后的 `linux-patched-v21-native-layers/chunk-rncrmfyt.js`（`qmn` 的 9 处锚点）。

**跑过的命令与结果**：
- `node --test test/*.test.mjs`：**169 通过、0 失败、0 跳过**，30 秒（本机有 artifacts 与 `node_modules/@babel/parser 8.0.4`）。所有测试只起 node 子进程、不联网、不执行 ELF。
- `node e2e/compare21.cjs`、`node e2e/compare.cjs gateway-build-fp,gateway-direct-fp`（仓库自带脚本）。
- 自写 `inout21.cjs`：把 `cap21/gateway-*/worker-in/*`（Worker 收到的客户端请求头与 body）与同一请求的上游抓包 `req-NN.json` 逐字段对比；`strict21.cjs`：官方参考 vs 网关出口逐头、逐字段、首条 user 消息逐块对比。
- 在还原源码上核对了补丁所有动态 `import()` 名字是否真被导出（全部存在）；`Ten` 锚点唯一；`rename()` 词表在 `tool-dispatch.inc.js` 内无误伤。
- `grep -a` 两个 ELF 的 Bun 版本字符串。

**样本的局限**：`cap21`（真实上游、21 号 API Key 账号）与 `e2e/cap`（假上游、OAuth 假账号）都是 **2026-10-22 用 CLI v18** 抓的；v19–v21 之后没有留下新的抓包（`e2e/levels/` 只有脚本）。v19–v21 改的是“没有计费头的请求”（注入）、direct 计费头、身份行与 turn，对**带计费头的 CC 请求**路径的影响我按源码逐项核对（见 §2.2），结论仍以 v18 抓包为实证基础。本机不能运行 Linux ELF，不能重新抓包。

## 2 对用户三个问题的直接回答

### 2.1 定制版是否“完全复用原生功能组装请求”

**结论：主体是，边缘不是。** 最终 body 的生成者是原生 `qmn`（通过 `Kvt`），system/messages/tools 走原生管线，计费头由原生 `PAs/kLo` 生成，身份行由原生 `n1n/t1n` 给出，请求头由原生 `sF` 创建的 SDK 客户端生成，内置提示词、首轮附件、turn 都调原生函数（`r1e/wx/pr/Wkt/eSt/JDr/POo/iws/h0n/gd/assembleToolPool`）。但有三类不是“直接调用原生”：

1. **按原生代码重组而不是调原生入口**（§3 分类 c）：`ccgatewayDefaultPrompt` 复刻了 `xh` 的组装顺序而不是调 `xh`（`xh` 需要 session/credentials/mcpClients，且会算 userContext）；`ccgatewayLayerAttachments` 复刻首轮附件列表而不是调原生首轮附件生产者；`ccgatewayEnvironment` 复刻 `Wkt` 以便只读所选字段；`fingerprintMessages` 复刻 `RIs` 对“第一条用户记录”的选取；`identityLineFor` 把 `n1n` 的选择规则再写了一遍并叠加入口表。这些都有版本哈希绑定作保护，但它们是“和原生一样”而不是“就是原生”。
2. **原生没有的新行为**（分类 d）：内容策略识别/改写（`content-policy.js` 464 行）、direct 的 JSON 原文拼接器、身份/agent ID 映射、断点上限裁剪、注入层放置。设计文档都有依据（§8 列出文档与代码不一致处）。
3. **原生被绕过的地方**：build 下 `Gmn` 直接返回外部消息（跳过原生历史修复/reminder 折叠/缓存标记 `Xfr`），`Xa=z2()` 置空，betas 用客户端的。这是刻意的“保真”，但意味着原生对历史的规整不再发生——与官方客户端自己发出的请求一致，因为客户端已经做过了。

### 2.2 组装后是否与客户端一致（除请求头拆分）

**对 Claude Code 客户端发出的请求（system 含计费头）：是。** 实证：`cap21` 中 Worker 收到的 15 个 CC 请求（主线程、子代理、压缩、第 2/3 轮、工具往返），build 与 direct 出口的 **body 逐字段、逐键序相同；请求头集合、顺序、值相同，唯一例外 `x-client-request-id`**（SDK 每次随机，官方同样随机）。与另一次官方直连参考相比，仅差每次运行必然不同的 ID（session、prompt、agent、cch、`previous_message_id`、工具耗时）。OAuth 假上游样本（`e2e/cap/*-fp`）同样只差被映射的 ID 与 `metadata.user_id`。

源码核对 v19–v21 对该路径的改动：`markPrompt` 给记录加 turn（只影响原生生成的那行，客户端计费头两字段都在时不被使用，`content-policy.js:377` 只补 `cc_version/cc_entrypoint`）；`clientBilling !== null → line:'none'`（CC 请求不再补身份行，`request-build-2.1.304.js:229`）；direct 的 `applyDirectBilling` 对完整头返回 `raw` 原字节（`direct-billing.js:95`）。没有发现会改变 CC 请求形状的新路径。

**有意且已记录的差异（CC 请求）**：OAuth build 的 `metadata.user_id` 和 `x-claude-code-session-id`、`x-claude-code-prompt-id`/`cc_prompt_id` 被映射（设计 §7、SUBAGENT 设计）；direct 不映射。

**未记录或记录不足的差异（CC 请求）**：
- **`User-Agent` 不是客户端的**：Worker 固定 `CLAUDE_CODE_ENTRYPOINT=sdk-cli`，原生 `dN()` 据此生成 `claude-cli/2.1.304 (external, sdk-cli)`；而计费头 `cc_entrypoint` 保留客户端的值（`cli`/`claude-desktop`/…）。官方客户端里两者取同一个来源永远一致；经网关后交互终端客户端会发出 `UA=sdk-cli` + `cc_entrypoint=cli`。`cap21` 没暴露是因为客户端恰好是 `-p`（sdk-cli）。见 D1。
- **运行时不同**：官方 ELF 内嵌 Bun **1.4.4**（288 MB），我们用 Bun **1.4.3** 重编（157 MB）。HTTP/TLS 层（ClientHello、h2 设置、头大小写）无法声称一致；`cch=00000` 也是由此而来。见 D2。
- beta 列表经过原生门控后可能**多出**客户端没发的 beta（现实中门控全关所以没出现）；OAuth 账号 + 非 OAuth 客户端时 `oauth-2025-04-20` 追加在末尾而官方在第 2 位。见 D4。

**对不是 CC 发出的请求（无计费头）：不一致，且设计上就不打算一致。** 生成参数按原生规则重新派生（`temperature:1`、`thinking:{type:disabled}`、`output_config.effort`、键序按原生），模型别名经 `fC` 归一，字符串 system 变数组，再按等级注入层。这些都在 README/CC-INJECTION-LEVELS-DESIGN 里写明；用户的“一致”问题应理解为只针对 CC 客户端。

### 2.3 “请求头拆分”实际指什么、边界在哪

客户端请求到 Worker 后，请求头被拆成四路，**没有任何一个客户端请求头原样转发**：

| 客户端头 | 去向 | 实施者 |
|---|---|---|
| `anthropic-version`、`anthropic-beta` | CLI 参数 `--header`/`--betas`（`request_command.go:430-438`）；CLI 只接受这两个（`request-options.js:43-47`）；最终由 `authenticatedRequestHeaders` 覆盖 SDK 生成的同名头（`request-options.js:88-99`） | Worker + CLI 补丁 |
| `x-claude-code-request-class/agent-id/parent-agent-id/agent-type/prompt-id` | 环境变量 `CCG_REQUEST_AGENT`（`request_agent.go:22-38`）→ `request-agent.js` 选出 `querySource/requestClass/agentContext/promptId` → **原生 `sF` 重新写出这 5 个头**（`chunk-38xgev2z.js sF`，`PVs/IVs/o1r`）；build+OAuth 时 prompt-id 被映射 | Worker + CLI 补丁 + 原生 |
| `x-claude-code-prev-tool-durations`、`x-cc-compaction-request`、`x-claude-code-compaction`、`x-cc-context-compacted`、`x-claude-code-context-compacted` | 同上环境变量 → `agent.headers` 原值直接放进请求头（`request-agent.js:88`，`request-command.js:117`） | Worker + CLI 补丁 |
| `x-claude-code-session-id` | 从 body `metadata.user_id` 解析（`request_identity.go`）→ `CCG_REQUEST_IDENTITY` → 补丁 `Yi` 让根会话用它（`patch-cli:65`）→ 原生 `nl()` 写头 | Worker + CLI 补丁 + 原生 |
| `user-agent`、`x-app`、`x-stainless-*`、`anthropic-dangerous-direct-browser-access`、`accept`、`accept-encoding`、`content-type`、`x-client-request-id`、`authorization`/`x-api-key` | **丢弃**，由 Worker 进程里的原生 SDK 重新生成（账号凭证由 `sF` 注入） | 原生 |
| 其他任何头 | 丢弃 | Worker |

边界：Worker 只读 `anthropic-*`、11 个 `x-claude-code-*`/`x-cc-*` 和 body；CLI 对 `--header` 白名单之外的名字直接报错；`ANTHROPIC_CUSTOM_HEADERS` 在请求期间被清空（`request-command.js:59`）。顺序由原生 `sF` 的 `defaultHeaders` 对象与 SDK 决定，`cap21` 15/15 与官方顺序一致。核心→Worker 一段由 audit-core/audit-worker 负责，本文不复核。

## 3 补丁清单与分类表

分类：(a) 直接调原生；(b) AST 原样复制原生代码；(c) 手写重实现原生已有逻辑；(d) 原生没有的新行为。补丁器通用前提：20 个模块 SHA-256 校验（L14-18）、AST 唯一命中（L37-38）、`once()` 锚点唯一（L32-35）、无变化报错（L40）、改后重 parse（L161）。

| # | 位置（补丁器行） | 改动 | 分类 | 说明 |
|---|---|---|---|---|
| 1 | `cli.js:Ve` L44 | `--ccgateway-info`；`request` 子命令：先调原生 `loadFastPathPolicy`，拒绝则 403 帧，否则 `runRequestCommand` | d | 入口；标签先写死 `v12` 再在 L47 替换（D8） |
| 2 | `chunk-0q47gehe:Pb` L45 | `tool.register` 透传 `kind:"native"` | d | mods 扩展 |
| 3 | `cli.js:Ve` L46-64 | 注入 `yBe/t1n/n1n/PAs/B1s/oJe/RIs/KF/Al/Zoe/ZUo` 等原生绑定；direct 的 `nativeBilling=()=>PAs([],void 0,{...})[0]`；能力列表追加 8 项 | a | 全部是把原生函数交给支持模块；`ccgAgent.turn` 用 inc 的 `ccgatewayPromptTurn`（c） |
| 4 | `chunk-dxktn51d:Yi` L65-66 | 根会话 ID 优先取 `CCG_REQUEST_IDENTITY.session_id` | d | 设计 §7“会话头一致” |
| 5 | `chunk-yqea5hk4:Ali` L69-78 | 资源清单改读 cgroup | d | 隐私审计文档 |
| 6 | `chunk-sx3g9k86:V` L79-87 | 启动事件 free_mem/loadavg 改容器值 | d | 同上 |
| 7-9 | core `GYr`/headless `Ua`/core `FH` L88-90 | native 工具注册、合并、定义 | d | mods |
| 10 | core `Ten` L91-95 | `tool_use` 只做字符串 JSON 解析 | c（删减原生） | `indexOf` 截取，304 内两锚点各 1 次，已核 |
| 11-13 | `N_e`/`mIt`/`ton`/`addTool` L96-99 | 恒等/简化 | c（删减原生） | request 路径不处理模型响应，不受影响 |
| 14 | core `bz` L100-104 | 替换为 `tool-dispatch.inc.js`，`rename()` 改名 11 个符号 | d | 词表无误伤（已核：每个名字 1-3 次命中，全是预期） |
| 15 | core `qmn` L105-128 | 9 处：wire tools 原样；`Xa={}`；betas 用客户端 `.map(ccgBeta)`；system/messages 用 wire；`Gf=sb=wire`；`fi.ccgatewayInput`；`RIs(ccgatewayFingerprintMessages)`；`PAs` 捕获；最终 `yield {type:"ccgateway_request", body:uXn(...)}` 不发送 | a+d | 原生生成所有生成参数；探针（`ccgatewayNativeProbe`）时 system/messages/tools 走原生 |
| 16-18 | core `Gmn`/`jA`/`Xfr` L131-133 | 外部输入跳过原生历史修复；`api_system` 保留；`ccgatewayWireSystem` 原样 | d（绕过原生） | 保真 |
| 19 | `chunk-38xgev2z:sF` L134-140 | `ccgatewayAPIKeyOnly`：只允许 firstParty+API Key，不读 OAuth，剥 auth 头交 SDK | d | 其余头（UA、x-app、stainless、agent 头）仍由原生生成 |
| 20 | `chunk-t61vswm2:PAs` L143 | 生成后回调捕获原生计费行 | a | — |
| 21 | core `_oo` L144 | 读 `ccgatewayProxyText` | d | 代理行按需 |
| 22 | terminal `computeToolPool` L145-149 | 缓存 key 带 revision | d | mods |
| 23 | 导入注入 L150-151、L160 | native-tools 导入；`ZUo as ccgBeta`、`POo as ccgDate` | a | — |
| 24 | L156-160 | 从 `chunk-wt08cjq1` 按 AST 取 `pr` → `ccgatewayJoinAppend`（谓词：名为 `pr` 且含 `\n\n`，该模块恰有 1 个 `pr`） | b | 只读该模块，不改 |
| 25 | 追加 `native-environment-2.1.304.inc.js` L160 | 见下表 | — | — |
| 26 | 支持模块 15 个 L169-182 | 复制并改前缀；request-command/request-build 用 296 时代名改名 + chunk 名映射 | — | 旧名映射仍在（D7） |

`native-environment-2.1.304.inc.js` 各函数分类：

| 函数 | 分类 | 对应原生 | 为什么没直接用 / 能否改 |
|---|---|---|---|
| `ccgatewayEnvironment` | c | `Wkt`（`chunk-rncrmfyt`，读全部字段） | 只读策略选中的字段，避免对未选字段做 git/gh 探测；可改为调 `Wkt` 再只取所需行，代价是多跑探测 |
| `ccgatewayEnvironmentVocabulary`/`ccgatewayLayerVocabulary` | d（用原生渲染器反推文字） | `zkt/_oo/Kkt/Gkt/ANe/xNe/Eoo/RBs/u7t/fSt/p4n` | 原生没有“词表”概念；做法合理 |
| `ccgatewayDefaultPrompt` | c | `xh`（`chunk-8w3jrzn0`）：`r1e(m3e(custom, Lcr().defaultSystemPrompt), {tools, memoryMechanicsPrompt, appendSystemPrompt: void 0})` + append | 已逐项核对等价：`Lcr` 在无 custom 时就是 `wx(tools, model, {excludeDynamicSections: undefined})`；`memoryMechanicsPrompt` 在无 custom 时为 null；无 `appendSystemPromptHead`。直接调 `xh` 需要 session/credentials/mcpClients 并会算 userContext，不可行 |
| `ccgatewayPermissionContext` | a | `gd()` | — |
| `ccgatewayLayerAttachments` | c | 首轮附件生产者 `Wkt/eSt/Jkt/ah/JDr/POo` | 原生没有“只造这四种”的入口；`JDr(session, records, model, void 0, false, void 0, false)` 的参数对应 `(session, msgs, model, agentId, reanchor, budget, onTop)`，agentId 空即主线程 |
| `ccgatewayMarkTurns`/`ccgatewayPromptTurn` | c | 查询循环给记录打 `turnOrigin/turnPosition`（`iws/h0n/pde/a3e`） | 原生在循环内做，没有独立函数；测试在还原源码上跑过 `iws/h0n` |

支持模块中其余 (c)/(d)：`fingerprintMessages`（c，复刻 `RIs` 的记录选取，因 wire 消息把 reminder 并进了同一条 user）；`identityLineFor`（c，`n1n` 规则 + 入口表）；`content-policy.js`（d）；`direct-billing.js`（d）；`request-agent.js` 派生/映射（d）；`limitBreakpoints`/`placeLayers`（d）；`nativeDefinition`（c，复刻 `FH` 的输出形状，只用于 mods 工具）；`request-identity.js flat()`（c，旧版 `user_…_account_…_session_…` 载体）。

## 4 组装路径表（build，带计费头的 CC 请求；无计费头时另有 §4 末注入段）

| 步骤 | 原生函数 | 自写代码 | 文件:行 |
|---|---|---|---|
| Worker 拆组件：model/systemPrompt/messages/tools/stream，其余进 `parameters`；`input_schema→inputSchema` 原位改名；`requestPolicy`、`runtimeContext` | — | Go | `engine/request_command.go:51-157` |
| 参数校验、策略校验、运行目录校验 | — | `validateBuildParameters`、`validateRequestPolicy`、`runtimeContext` | `request-build-2.1.304.js:135-137` |
| 组件 → CC 记录（保留 `ccgatewayWireMessage/WireSystem`）；reminder 引用用原生 `MDe` 渲染并要求逐字相同 | `MDe` | `prepareBuildInput` | `request-input.js:35-196` |
| 内容策略：识别环境段/计费行，按 client/worker/erase 改写；worker 值来自 `ccgatewayEnvironment` | `zkt/_oo` 等渲染器、`gH/Cl/hK/uoo/poo/moo/Nkt/foo` 读取器 | `applyContentPolicy` | `content-policy.js:218-316`；inc `:3-46` |
| 指纹消息（第一条 user 中第一个非 reminder 文本块） | 供 `RIs` 使用 | `fingerprintMessages` | `request-input.js:204-214` |
| 请求类别：从 `CCG_REQUEST_AGENT` + 首块计费头判定 main/subagent/compaction；prompt-id 映射（build+OAuth） | `Zoe`（querySource 命名） | `resolveAgentContext` | `request-agent.js:76-110` |
| 主线程记录打 turn/promptId | `iws/h0n/pde/a3e` | `markPrompt`→`ccgatewayMarkTurns` | `request-build-2.1.304.js:114-117`；inc `:141-151` |
| 客户端工具注册为 native 工具（仅供原生策略；wire 用客户端原定义） | — | `registerNative` | `request-build-2.1.304.js:171-176` |
| thinking 映射：`enabled→{enabled,budgetTokens}`、`adaptive→{enabled}`、否则 `disabled mechanical` | 原生 `Tqs` 再派生 | 映射表 | `:177-181` |
| options：`querySource/agentContext/getToolPermissionContext=gd()/maxOutputTokensOverride/effortValue/temperatureOverride/outputFormat/enablePromptCaching:false/skipMessageCacheMarkers` + `ccgateway*` | — | — | `:182-199` |
| **原生构造**：`Kvt → qmn`：betas=`clientBetas.map(ZUo)` 再经原生 `jHs`、`h1t/m1t/Hr/vv` 推送；`Gmn` 直接返回；`RIs(fingerprint)`；`n1n` 选身份行；`PAs(kLo)` 生成计费行并回调；`$c={model:fC(J.model), messages:wire, system:wire blocks, tools:wire, tool_choice, metadata:yBe(), max_tokens, thinking, temperature?, context_management?, output_config?, …}`；`yield ccgateway_request` | `qmn/fC/yBe/Tqs/CHe/n1n/PAs/kLo/RIs/ZUo/jHs` | 9 处锚点 | `patch-cli-2.1.304.cjs:105-128`；patched core `$c` |
| 并回原生不拥有的参数（`diagnostics` 只按客户端） | — | `mergeAdditionalParameters` | `request-parameters.js:53-72` |
| 计费行合并：首块开头的头缺 `cc_version/cc_entrypoint` 或选 worker 时用原生行的值；无头则整行插最前；`build_billing_entrypoint` 替换原生行的入口 | 原生行由 `PAs` 捕获 | `mergeBillingAttribution` | `content-policy.js:351-407` |
| `cc_prompt_id` 与映射后的 prompt-id 头对齐 | — | `setLeadingBillingField` | `:456-464` |
| 身份行：CC 请求 `none`；非 CC 按入口自适应 | `n1n` 三句、`t1n`、`B1s` | `identityLineFor`、`applyBuildCliPrefix` | `request-policy.js:37-43`；`request-identity.js:114-124` |
| metadata：Worker `rewrite` 决定是否替换 `user_id`（载体保留）；客户端无 metadata 则删除原生生成的 | `yBe` 作底 | `applyBuildMetadata` | `request-identity.js:65-77` |
| beta 头 = 客户端 ∪ 原生新增 ∪ 注入层 beta（客户端顺序优先）；OAuth 再追加 `gTe.header` | `YEr` 策略门 | `normalizeBetas`、`authenticatedRequestHeaders` | `request-build-2.1.304.js:232-235`；`request-options.js:88-99` |
| HTTP：原生 `sF` 创建客户端（`nl()` 写 x-app/UA/session；`PVs/IVs` 写 class/agent-type；agent-id/parent/prompt-id），`fetchOverride` 只改 version/beta；`timeout=min(deadline,600000)`→`x-stainless-timeout:600`；`maxRetries:0` | `sF/nl/dN/PVs/IVs` | `openModelRequest` | `model-request.js:38-95`；`request-command.js:122-129` |

**无计费头请求的注入段**（`injectLayers`，`request-build-2.1.304.js:48-93`）：工具 = 配置 − 客户端同名 → 原生 `assembleToolPool(gd(),[],{})` 排序；提示词 = `ccgatewayDefaultPrompt([...tools, ...clientTools], model, 客户端非身份行块)`；附件 = 配置 − 载体里已有开头的 → `ccgatewayLayerAttachments`；用一条占位提示跑一次**原生探针构建**（`ccgatewayNativeProbe`，system/messages/tools 全走原生），从探针 body 取提示词块（带原生缓存标记）、工具定义、附件在首条提示前后的位置与 beta；`placeLayers` 放回客户端消息；`limitBreakpoints` 超 4 个断点先去注入块的标记。

## 5 与客户端的差异表

“官方值”指官方 2.1.304 客户端直连时发出的值；“网关值”指经 build/direct 后上游收到的值。

| 字段 | 官方值 | 网关值 | 判定 | 依据 |
|---|---|---|---|---|
| body 全部键、键序、`messages`、`system`（含 `cache_control`）、`tools`、`max_tokens`、`thinking`、`context_management`、`output_config`、`stream` | 客户端值 | 相同 | 一致 | `inout21.cjs` 15/15；`strict21.cjs` 与参考同形 |
| `diagnostics.previous_message_id` | 客户端值 | 相同 | 一致（P1-7 已修） | 同上 |
| 请求头集合与顺序（`accept, content-type, user-agent, x-claude-code-session-id, x-stainless-*, anthropic-beta, anthropic-dangerous-direct-browser-access, anthropic-version, x-api-key/authorization, x-app, x-claude-code-*, x-client-request-id`） | — | 相同 | 一致 | `inout21.cjs`、`strict21.cjs` |
| `x-client-request-id` | 随机 | 随机 | 一致（本来就每次不同） | — |
| `metadata.user_id`（OAuth build） | 客户端 device/session | HMAC 映射 | 设计差异 | 设计 §7 |
| `x-claude-code-session-id`（OAuth build） | 客户端 | 映射值，与 metadata 一致 | 设计差异 | `Yi` 补丁 |
| `x-claude-code-prompt-id` 与 `cc_prompt_id`（OAuth build） | 客户端 | 映射值，两处一致 | 设计差异 | SUBAGENT 设计；`e2e/cap` 核对两处相同 |
| `User-Agent` | `claude-cli/2.1.304 (external, <客户端入口>[, agent-sdk/x])` | 恒为 `(external, sdk-cli)` | **未记录偏差** | D1 |
| `anthropic-beta` | 客户端列表 | 客户端列表 ∪ 原生门控新增；OAuth 账号 + 非 OAuth 客户端时 `oauth-2025-04-20` 在末尾（官方第 2 位） | 现实中相同；潜在偏差 | D4 |
| `cch`（网关自己生成计费头时） | 每次不同的 5 位 hex | `00000` | 已记录（SYSTEM-PROMPT-ASSEMBLY §7），未解决 | D2 |
| TLS/HTTP 运行时 | Bun 1.4.4 | Bun 1.4.3 | **未记录偏差** | D2 |
| `x-stainless-timeout` | 600 | `min(Worker 超时, 600)`，默认 600 | 一致（Worker 超时 <10 分钟时会变） | `model-request.js:78` |
| 非 CC 请求：`temperature/thinking/output_config` 新增、键序、`fC` 别名归一、字符串 system→数组、注入层 | 不适用 | 原生派生 | 设计差异（README、INJECTION-LEVELS §8） | — |
| `mid-conversation-system-clear-at-2026-08-21` 等 beta 缺失（`e2e/cap`） | 有 | 无 | 客户端对自定义地址少发，网关不补；direct 同样缺 | SUBAGENT 设计 :113 |

**结论句**：对 Claude Code 客户端的请求，除请求头拆分之外，组装结果与客户端一致——body 完全一致，头的值与顺序一致；但 **`User-Agent` 的入口段和底层 Bun 运行时不是客户端的**，这两点在“请求头拆分”的既有描述里没有写明，建议要么修（D1）、要么写进设计文档的边界。

## 6 发现表

| 编号 | 级别 | 状态 | 文件:行 | 问题 | 证据 | 建议 |
|---|---|---|---|---|---|---|
| D1 | P2 | 已确认 | `engine/request_command.go:463-470`；原生 `chunk-7p6jp6kj.js dN()`、`chunk-6qx5mjec.js kLo` | Worker 固定 `CLAUDE_CODE_ENTRYPOINT=sdk-cli`，UA 入口段永远是 `sdk-cli`，但计费头 `cc_entrypoint` 保留客户端值（或 `build_billing_entrypoint`）。官方两者同源永远相等；经网关后 `cli`/`claude-desktop`/`claude-vscode` 客户端会出现 UA 与计费头入口不一致，SDK 客户端的 `, agent-sdk/x.y` 段丢失 | `dN()`：`(external, ${TY()??a.CLAUDE_CODE_ENTRYPOINT??"cli"}…)`；`kLo`：`S=TY()??process.env.CLAUDE_CODE_ENTRYPOINT??"unknown"`；`cap21` 客户端全是 `-p` 所以没暴露 | Worker 按请求设置 `CLAUDE_CODE_ENTRYPOINT`：取首块计费头的 `cc_entrypoint`（经 `requestBilling` 口径），无头时取策略入口；并评估 `CLAUDE_AGENT_SDK_VERSION` 的透传。或在设计文档明确“UA 入口段不跟客户端” |
| D2 | P2 | 已确认 | `build.sh:2`、`CLAUDE-CODE-2.1.304-IMPLEMENTATION.md:113`；ELF 字符串 | 官方 `claude-linux-x64` 内嵌 **Bun v1.4.4 (de4bc695b)**，288 MB；我们的 v21 ELF 内嵌 **Bun v1.4.3 (c6da4a4d3)**，157 MB。运行时不同：TLS 指纹、HTTP 序列化、`cch` 计算（官方在运行时替换 `00000`）都无法声称一致；130 MB 体积差也说明官方产物不只是“Bun + 同一份 JS” | `grep -a "Bun v1"` 两个 ELF | 用与官方相同的 Bun 版本重编并比对体积；查清官方多出的 130 MB 是什么（可能含 `cch` 的原生实现）；在设计文档写明“传输层指纹与官方不同”这条边界 |
| D3 | P2 | 已确认 | `profiles/linux-x64-2.1.304.json`；`patch-cli-2.1.304.cjs:54-60,160`；`request-build-2.1.304.js:2-5` | 补丁与支持模块从 5 个**未做哈希绑定**的模块导入：`chunk-7y2kvacy`（`oJe/B1s`）、`chunk-jkcb7qdd`（`KF/lKe`）、`chunk-m5q1b1c4`（`Zoe`）、`chunk-eanw7pgv`（`m4t`=assembleToolPool）、`chunk-t2p0d04m`（`POo`）。设计 §11 把“模块哈希”当作符号绑定的锚点，对这 5 个不成立。另：所有动态 `import()` 的名字在补丁期不校验（本次人工核过全部存在） | 对照 profile 与 `grep -o "chunk-*"` | 把 5 个模块加入 profile；补丁器对每个 `import {x} from` 做一次导出存在性检查（AST 读 `export{}`） |
| D4 | P3 | 怀疑 | patched `qmn`：`mt=clientBetas.map(ccgBeta)` 之后仍经 `jHs(lt,mt,model)`、`UHt()&&…push(h1t)`、`Hr`、`m1t`、`uXn` 中 `vv` 推送；`request-options.js:95` | build 的 beta = 客户端 ∪ 原生门控新增。目前门控（statsig/GrowthBook）在 Worker 里关着所以抓包相同，但这是环境决定的，不是代码保证的；OAuth 账号 + 非 OAuth 客户端时 `oauth-2025-04-20` 追加在末尾，官方在 `claude-code-20250219` 之后第 2 位 | `chunk-w3f8f1dm.js jHs`；`e2e/cap/reference` 的 beta 顺序 | build 下把 `mt` 的后续原生推送也用 `wire` 条件短路，或在 `normalizeBetas` 后与客户端集合求差并记诊断；OAuth beta 按原生描述符表 `wR` 的位置插入 |
| D5 | P2 | 已确认 | `BUILD-REQUEST-COMPONENTS-DESIGN.md:15,289-295`；`:14,297-305`；`SUBAGENT-REQUEST-CONTEXT-DESIGN.md:138` | 事实源文档过期：结论与 §6.3 仍写“direct 补身份行”（v20 已去掉，`validateDirectPolicy` 丢弃 `build_identity_lines`）；§7 写“身份不可配置、核心不再下发”，而 `request-identity.js` 与 Worker 仍实现 client/worker/replace 三模式且 README v14 段说可配置；SUBAGENT :138 说 API Key UA 是 `ccgateway-request`（v18 已改为原生 UA） | 代码与文档对读 | 以 INJECTION-LEVELS §7/§12 为准回写 BUILD 设计；删掉或标注历史段 |
| D6 | P3 | 已确认 | `patch-cli-2.1.296.cjs`、`patch-cli-2.1.302.cjs`、`request-build.js`、`patch-cli.cjs:7`；`content-policy.js:221,353`；`model-request.js:71`；`release/manifest.json` | 死代码：296 补丁器无 profile、302 只被本地过期 release 引用（manifest 仍是 302 v7 / 304 v12）；`relay_mode==='direct'` 两处分支永不可达（两个校验器都拒绝该键）；`options.transformBody` 无人设置；`importFiles`/`rename` 的 296→304 名字映射只为复用旧文件名 | `grep` | 删 296；302 冻结到独立目录或删除；去掉 `relay_mode`、`transformBody`；支持模块直接用 304 名字 |
| D7 | P3 | 已确认 | `patch-cli-2.1.304.cjs:44,47,63,163` | 版本标签先写死 `ccgateway-v12-feature-policy` 再替换；能力列表在 L44、L63、L163 三处各写一份；注入 JS 为 1 KB 以上的单行字符串 | 读源码 | 能力列表与标签统一从 profile 读；注入代码移到 `.inc.js`（同 `tool-dispatch.inc.js` 做法） |
| D8 | P3 | 已确认 | `test/native-vocabulary.test.mjs:44,61,69`、`test/cli-prefix.test.mjs:167` | 4 个与原生对账的测试在没有 `artifacts/` 时 `skip`（有提示语），`artifacts/` 未入库也未被忽略（`?? artifacts/`）；CI 环境若无 artifacts 这些对账不会跑。`patch-wire-preservation-304` 缺 artifacts 时直接失败（符合要求） | 跑测试 | CI 提供 restored 树或把这 4 个也改成失败 |
| D9 | P3 | 已确认 | 测试整体 | 没有任何自动化测试把“客户端输入 → 上游输出”逐字段相等固化下来；`cap21` 的 15 对样本只能手工跑脚本比对，且是 v18 的 | §1 | 把 `worker-in` 与出口的脱敏样本作为夹具，加一条“除 x-client-request-id 外全等”的测试；v21 重抓一次 |
| D10 | P3 | 怀疑 | `request-build-2.1.304.js:52,65,125-126`；inc `:130` | 注入的 `total_tokens` 只放在第一条提示旁，而 CC 每个新提示都带 `<total_tokens>`；`JDr` 对不带 usage 的客户端记录算出的是满额上下文。多轮非 CC 请求在“低注入”下与 CC 形状不同 | `cap21/reference/req-04` 最后一条 user 首块是 `<total_tokens>` | 设计文档写明只补首轮；或按原生在最后一条提示也补 |
| D11 | P3 | 已确认 | `request-input.js:4`、`request-parameters.js:5-6` | 本地校验错误文字仍是 `request --build: …`，不是官方原文（上轮 F10 未关闭） | 读源码 | 同上轮建议 |
| D12 | P3 | 已确认 | `request-build-2.1.304.js:53` | 注入提示词的“已有”判断只认 `p4n` 安全段；设计 §2 还写了子代理段 `T7t` | 代码与文档对读 | 补 `T7t` 或改文档 |

已修且不再报：F1/F2（身份信封）、F3、F6（503）、F7（标签取自 profile）、F9（`system: []`，现总有计费头）、F15（API Key UA）、`x-stainless-timeout 3600`、P1-7（diagnostics）、`cc_version` 指纹取法。

## 7 代码规范观察

**抽象/解耦**：职责边界总体清楚（options/input/parameters/policy/content-policy/identity/agent/error/output 各管一段），但策略校验仍有两份：`content-policy.js validatePolicy`（:208）与 `request-policy.js validateRequestPolicy/validateSources`（:99-119），字段表 `fields`/`environmentFields`/`billingFields` 各写一遍（`content-policy.js:6-7`、`request-policy.js:3-8`）。建议 content-policy 只接受已校验的策略，字段表单一来源。

**复用（重复 ≥3 次）**：`const object = value => …`（`request-input.js:3`、`request-parameters.js:3`、`request-policy.js:9`）；`typeof content==='string' ? [{type:'text',text}] : content`（`request-build-2.1.304.js:23`、`request-input.js:8,208`、`content-policy.js:355`、`direct-billing.js:79`）；`system` 文本列表取法（`content-policy.js:421,444` 两处同句，`:430` 第三种写法）；`for await (const event of Kvt(…)) { if aborted…; if ccgateway_request…; if isApiErrorMessage… }`（`request-build-2.1.304.js:68-75,211-216`、`request-build.js:49-53`）；`splice()`（`content-policy.js:204`、`direct-billing.js:62`，签名不同）；UUID 正则两份（`request-identity.js:4` v4 严格、`request-agent.js:18` 宽松）。建议抽一个 `shared.js`（`object/toBlocks/systemTexts/uuid/splice/collectBuilt`）。

**简洁/长度**：`prepareBuildInput` 162 行（`request-input.js:35`，内含 4 个闭包，职责是“解析 + 引用展开 + 工具配对校验 + 工具拆分”）；`runRequestCommand` 147 行（`request-command.js:36`，输入/agent/direct/build/transport/错误体读取都在一个 try 里）；`buildRequest` 106 行；`applyContentPolicy` 99 行。建议 `prepareBuildInput` 拆成 `parseComponents/expandReferences/validateToolPairs/splitTools`；`runRequestCommand` 拆出 `readInput/prepareDirect/prepareBuild/readErrorBody`。

**嵌套 >4 层**：`request-input.js:172-176`（工具配对，for→for→if→if→if）、`request-command.js:141-148`（错误体循环）、`content-policy.js:233-238`（三层 for 内的 if）、`request-options.js:45`。前两处用早返回/提取函数即可降到 3 层。

**补丁器健壮性**：优点——哈希、唯一 AST 命中、唯一锚点、无变化即报错、输出目录必须新建、改后重 parse，失败都抛错不静默。不足——见 D3（导入模块未绑定、导出名不校验）、D7（标签/能力三处、单行注入）、`Ten` 用 `indexOf`（304 内唯一，换版本无保护）、`rename()` 盲替换（现无误伤）。

**错误处理**：错误文字不脱敏、HTTP 错误原字节透传（符合用户原则）；`localErrorFrame` 只对 `status===503` 特判，其余本地错误一律 400（`request-error.js:39-46`）。

## 8 对设计文档的异议

1. **BUILD-REQUEST-COMPONENTS-DESIGN 已不是事实源**：结论、§6.3、§7 与 v20/v21 代码冲突（D5）。应以 CC-INJECTION-LEVELS-DESIGN §7/§12/§13 为准重写，不要两份并存。
2. **“模块哈希是符号绑定的锚点”（§11）不成立**：5 个被导入的模块不在 profile（D3）。
3. **“请求头拆分”从未被定义**：文档里没有一处写明哪些头丢弃、哪些重生成、哪些透传（本文 §2.3 是第一次成文）。尤其 UA 入口段和 Bun 版本这两条边界应明示（D1、D2）。
4. **SYSTEM-PROMPT-ASSEMBLY §7 写“替换发生在官方 Bun 运行时里”**：现在可以补一条事实——官方运行时是 Bun 1.4.4、体积 288 MB，而非我们用的 1.4.3；“上游目前接受 00000”是观察，不是保证。
5. **INJECTION-LEVELS §2 第 4 层“或子代理段 T7t”**：代码没实现（D12）。
6. **INJECTION-LEVELS §13 “发出的提示词与 v20 逐字节相同”**：依据是缓存读取量相等，这是强间接证据但不是逐字节证明；可以接受，但措辞应改为“缓存命中量一致”。
7. **README 顶部仍是累积流水账**（上轮已提），v14 段“身份来源在插件设置中配置”与 BUILD §7“不可配置”互相矛盾，读者无法判断哪条现行。

## 9 未能验证的范围

- 没有在 Linux 上运行 v21 ELF；`cap21`/`e2e/cap` 是 v18 的抓包，v19–v21 对 CC 请求路径“无形状改变”的结论来自源码核对，没有 v21 实抓。
- 请求头的**大小写与 HTTP/TLS 层**（ClientHello、h2 设置、头序列化）无法从 Node 抓包判断；官方 Bun 1.4.4 与我们 1.4.3 的差异未量化。
- 官方 ELF 多出的约 130 MB 内容是什么、`cch` 在官方运行时如何计算，未分析。
- 原生 beta 门控（`jHs`、`UHt`、`Cun`）在生产 Worker 环境里的实际状态只按“抓包相同”反推，没有读运行时配置。
- Core→Worker 的头转发、控制器侧环境变量注入，由 audit-core/audit-controller 覆盖，本文未复核。
- `content-policy.js` 的识别规则矩阵（1620 例）以测试通过为准，未逐条人工复核。
- `e2e/levels/` 的 docker 离线矩阵与 31 号真实上游结果只见文档记录（INJECTION-LEVELS §11-13），没有留存抓包可复核。
