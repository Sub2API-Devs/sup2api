# 计费头与内置提示词注入：现状、实测与规则

2026-10-30。对象：官方 CLI 2.1.312（sha256 `4f4178ce…`）与补丁 CLI 2.1.312 / patch `ccgateway-v38-cc-2-1-312`（本次升级的候选，待发布；第 1–3 节的实抓数字取自当时线上的 2.1.310 / `v36-content-guard`，2.1.312 的补丁逻辑与它相同，见 [CLAUDE-CODE-2.1.312-MIGRATION](CLAUDE-CODE-2.1.312-MIGRATION.md)）。所有数字都来自 ovh 一次性容器 + 假上游 + 占位令牌的实抓，不连真实上游、不登录。

> 版本说明：补丁标签用 v38 而不是 v37：`ccgateway-v37-content-guard` 已被 2.1.304 的 profile 占用（提交 3dcaddfd0），标签序号跨版本连续。

## 0. 速览

> **2026-11-03 起（CLI 2.1.316 / v45 `ccgateway-v45-first-party-shape`，能力 `build_first_party_shape_v1`）：** 用户决定"①②③ 都做，②③ 默认开"（证据 `artifacts/cc-thirdparty/REPORT.md`；生产上约 79% 的 ccgateway 请求来自改 base URL 接入的官方 CC）。改 `ANTHROPIC_BASE_URL` 接入的官方客户端发来的是**第三方形状**，build 把它**转成第一方形状**（直连 `api.anthropic.com` 时的样子），推翻 2026-10-30 的"客户端自带头原样保留、一个字段都不加"和"不拆分客户端结构"（仅限这种转换）。开关是 Worker 策略的 `first_party_shape`（缺省 = 开，核心按全局 → 分组 → 账号解析；显式 false 关）；direct 不转换；从不因为它拒绝请求。注入层闸门（有计费头不注入提示词/工具）不变。详见第 2.4 节与第 5 节。

- **计费头不是"有或没有"的问题，是"带几个字段"的问题。** 客户端连自定义 URL 时仍然发 `x-anthropic-billing-header`，只是只有 `cc_version`、`cc_entrypoint` 两个字段（另有 `cc_workload`、`cc_is_subagent` 不受门控）；连官方地址时才多出 `cch`、`cc_prev_req`、`cc_prompt_id`、`cc_turn_*`，system 也从 3 块变 4 块（多一个动态分界）。
- **第三方形状的头（只有上面四个字段之内）→ 转换**（2026-11-03 起，第 2.4 节）：用 CLI 自己的原生头构造器（`Dns`，经 `JXs` 截获）为这个请求写出第一方的整行，`cc_version`（含客户端指纹）与 `cc_workload` 取客户端的；`cch=00000` 占位；system 3 块在与原生静态段逐字一致时按原生 `s2o` 拆成 4 块；会话记忆补 `cc_prev_req`、`cc_prompt_id`、turn、`diagnostics`、`x-claude-code-prompt-id`。**第一方形状的头（带 `cch` 等）→ 原样保留**，一个字段都不加。
- **我们写的头只在客户端没带计费头时出现**，形状是"连官方地址"的（`_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`）；与真实 CC 唯一的差别是 `cch` 的值（第 4.4 节）。
- **内置提示词注入（high 等级）只在"请求没有计费头"时生效。** 已决定保持以计费头为准（第 4.1 节），转换不借道补提示词或工具。
- **会话记忆**（第 5 节）：v38 起用于我们写的头，v45 起也用于转换的请求；规则仍是"宁可少不可错"，证明不了接续就不带。
- **我们自己的不一致（不论开关，v45 起）**：子代理 `x-claude-code-agent-type` 不再写 `custom`（认出的内置类型写真值，认不出不发）；beta 跟着正文走（没有 global 缓存块且不是第一方头就不加 `prompt-caching-scope`，没有 `diagnostics` 不加 `cache-diagnosis`，没有 1h 缓存标记不加 `extended-cache-ttl`）；正文成员按原生构造器的顺序（`safeguards` 在 `output_config` 前）。

## 1. 客户端：自定义 URL 与官方地址的差异

### 1.1 计费头原文（官方 2.1.312，`claude -p hi`）

自定义 base URL（`ANTHROPIC_BASE_URL=http://127.0.0.1:8083`，不设 first-party 假设），74 字：

```
x-anthropic-billing-header: cc_version=2.1.312.0cd; cc_entrypoint=sdk-cli;
```

官方地址形状（测试里设 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1` 复现），192 字：

```
x-anthropic-billing-header: cc_version=2.1.312.0cd; cc_entrypoint=sdk-cli; cch=081e5;
cc_prompt_id=8e41506e-3c26-496b-9d05-672bed941943; cc_turn_origin=sdk; cc_prompt_index=0; cc_turn_index=1;
```

`cch` 每次请求不同（另一条实测 `db5d7`），由官方 Bun 运行时按请求内容计算；JS 里只有占位 `00000`。会话第二次起的请求还带 `cc_prev_req=<上一次上游响应的 request-id>`（离线回归 `turn2-build-low` A 侧：`cch=…; cc_prev_req=req_ccgaudit1; cc_prompt_id=…`）。

官方字段顺序（`chunk-pdqv9ngw.js` 的 `f3o`）：`cc_version; cc_entrypoint; [cch]; [cc_workload]; [cc_is_subagent=true]; [cc_prev_req]; [cc_prompt_id]; [cc_turn_origin]; [cc_prompt_index; cc_turn_index]; [cc_gateway]; [cc_project…]`。`cch`、`cc_prev_req`、`cc_prompt_id`、turn 字段都只在 firstParty 且 `Pi()`（官方地址形状）时写。

2.1.316 起末尾还可能有 `cc_prev_msg=<msg_…>; cc_prev_prompt_index; cc_prev_turn_index`（原生 `Dns`）：CC 自己做完上下文压缩（`/compact`、自动、reactive）后，主线程请求带上压缩前最后一次主应答里最后一条 assistant 的 `message.id` 与那次的 turn 位置，直到压缩后第一次完整成功的主应答为止；压缩后的第一条请求同时带 `*-context-compacted` 请求头。条件与 `cc_prev_req` 相同（官方地址形状），子代理不带，状态只在进程内存。**客户端自带的原样保留；我们写的头不补**（第 5.2 节）。

### 1.2 同一差异也体现在 system 的分块上

| | 自定义 URL | 官方地址 |
|---|---|---|
| system 块数 | 3 | 4 |
| 计费头 | 74 字 | 192 字 |
| 身份行 | 62 字 | 62 字 |
| 静态提示词 | 与动态段合并（Opus 4.8 合计 5561） | 1171，`cache_control {ttl:1h, scope:global}` |
| 动态段 | — | 4388，`{ttl:1h}` |
| 分界符 | 无 `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__` | 有（切块后不外发） |

代码上这是 `A6()`（分界符开关）为假时 `sI` 走 `b8n(s, null)` 的结果，详见 [CLAUDE-CODE-2.1.304-SYSTEM-PROMPT-ASSEMBLY](CLAUDE-CODE-2.1.304-SYSTEM-PROMPT-ASSEMBLY.md) 第 12 节。

### 1.3 认证方式不影响这个差异

三种认证方式、同一个自定义 base URL，实抓结果完全一致（都是 74 字头、3 块）：

| 认证 | 请求头 |
|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | `Authorization: Bearer sk-ant-oat01-…` |
| `ANTHROPIC_AUTH_TOKEN` | `Authorization: Bearer …` |
| `ANTHROPIC_API_KEY` | `x-api-key: sk-ant-api03-…` |

差别只在认证头本身，计费头和 system 分块相同。

## 2. 我们这边：计费头是谁写的

客户端的头有四种情形：第一方形状（2.1，原样）、没有（2.2，我们写）、不在首块或冲突（2.3）、第三方形状（2.4，2026-11-03 起转换）。

`mergeBillingAttribution`（`companions/cli-mods/content-policy.js:429`）只管理两个字段：

```js
const billingFields = ['cc_version', 'cc_entrypoint'];   // companions/cli-mods/shared.js:18
```

`cch`、`cc_prev_req`、`cc_prompt_id`、`cc_turn_origin`、`cc_prompt_index`、`cc_turn_index` 都不在管理范围内。于是有三种情形：

### 2.1 客户端自带第一方形状的头 → 原样保留

（2026-11-03 前这一节适用于所有自带头的客户端；之后第三方形状的头走 2.4。）只要头在第一块开头且能解析、两个字段都在，就一个字符都不改。实测（build 矩阵 req-004）：客户端给 `… cc_version=2.1.310.077; cc_entrypoint=cli;`，我们发出去的 system 就只有这一块，长度原封不动，**没有追加 `cch`，没有 turn 字段**。

真实 CC 客户端自己写的 `cc_prev_req` 与上游一致：Worker 把上游响应头 `request-id` 原样交回（`contracts/httpfacts`），核心也照样转给客户端（`next/server/internal/gateway/forward.go` 的 `httpfacts.Apply`），所以客户端记下的就是上游的 `req_…`。核心另设的 `X-Request-Id` 是核心自己的 ID，CC 不用它。离线回归 `turn2-build-low` B 侧（官方客户端经网关）第二轮 `cc_prev_req=req_ccgaudit1`，正是假上游给第一轮的 ID。

### 2.2 客户端没带头 → 我们写一整条

Worker 设了 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`（`engine/request_command.go` `requestCommand`），所以 CLI 写的是官方地址形状：

```
cc_version=2.1.312.<指纹>; cc_entrypoint=sdk-cli; cch=00000; [cc_prev_req=req_…;] cc_prompt_id=…; cc_turn_origin=sdk; cc_prompt_index=0; cc_turn_index=<n>;
```

其他会一起出现的：`request-class`/`agent-type`/`prompt-id` 那组请求头、静态块的 `scope:global`。`cc_prev_req` 与 turn 字段的来源见第 5 节。

### 2.3 头存在但不在第一块开头、或解析冲突

`mergeBillingAttribution` 会把原生那条放到最前面，客户端那条原地保留（上游接受两条头）；如果冲突且策略要求 Worker 提供字段，直接报错。这类请求按"客户端自带头"处理：不使用第 5 节的会话记忆，也不转换。

### 2.4 客户端自带第三方形状的头 → 转成第一方形状（2026-11-03，v45）

**识别**（`content-policy.js thirdPartyBilling`）：system 首块整块就是一行能解析的头，字段只在 `cc_version`、`cc_entrypoint`、`cc_workload`、`cc_is_subagent=true` 之内，`cc_version` 形如 `<版本>.<3 位指纹>` 且版本 ≥ 2.1.304（还原过的四个版本第一方字段集相同）；Worker 设了 `CCG_FIRST_PARTY_SHAPE=1`（build、非控制台测试、CLI 声明了能力、策略不是显式 false）。

| 项 | 做法 | 来源 |
|---|---|---|
| 计费头 | 原生 `Dns` 为本请求写的整行（build 截获，`JXs`），字段顺序与写法原生；`cc_version` 换回客户端原值（含客户端按首个 prompt 算的指纹）、`cc_workload` 取客户端的，Worker 拥有 `cc_version` 时保留原生值；原生行与客户端的入口或子代理标记不一致、或不是第一方形状（没有 `cch`）时**整条不转换**（system 也原样） | `content-policy.js completeBillingHeader` |
| `cch` | `00000` 占位（10-30 决定不计算，与我们写的头相同） | 原生 |
| `cc_turn_origin` / `cc_prompt_index` / `cc_turn_index` | 按历史原生计数（`ccgatewayMarkTurns`，`cli` 入口为 human），Worker 证明接续时按第 5 节修正 | 原生 |
| `cc_prompt_id` 与 `x-claude-code-prompt-id` | 客户端给了（hint 头）就用它的（映射）；否则主线程按（上游会话，本 prompt 的 turn 序号，prompt 内容哈希）派生 UUIDv4：同一轮的请求（工具循环、重试）相同，下一个 prompt 不同；子代理取父线程本轮的值（Worker 从父线程上次应答的 Agent 调用配对出来，或本线程的记忆），取不到就不带 | `request-agent.js`，第 5 节 |
| `cc_prev_req` | 第 5 节的记忆（续接成立才带） | 原生写字段 |
| `diagnostics` | 只在原生构造器本来会写 diagnostics 时：线程的首个请求（消息里还没有 assistant）`{previous_message_id:null}`；Worker 证明续接上一次应答时为那次应答的 `message.id`；其余（截断、改写、并发、没见过的应答）**不带** | `request-build.js diagnosticsFor` |
| system 3 → 4 | 第三块恰好以原生静态段 + `"\n\n"` 开头才拆：静态段用 CLI 自己的提示词构造器按请求的模型与工具渲染（客户端提醒里列出的延迟工具也算进工具池，先带延迟工具渲染、再不带），一处不同就不拆；拆块与缓存标记交给原生 `s2o`/`ZSr`/`vX`：身份行去掉标记、静态块 `scope:global`、动态块保留客户端的 TTL | `first-party-shape.js` |
| beta | 转换后正文是第一方形状：`prompt-caching-scope`、`cache-diagnosis`（有 diagnostics 时）随原生构造器保留；客户端自己的 beta 不动；加进来的 beta 按 CC 的顺序放（模型表 → 主查询自己推的 effort 等 → 构造器的），转换后与官方一方只差不做的 `mid-conversation-system-clear-at` | `request-betas.js bodyBetas` |
| 子代理的 `x-claude-code-agent-type` | 从父线程 Agent 调用的 `subagent_type` 得出、且是 CC 内置类型时写真值（`general-purpose` 等）；认不出不发（此前写 `custom`） | 第 5 节 |
| 压缩请求 | 末条用户消息以 CC 压缩提示词构造器的开头（原生 `Tsn` 对两种总结形式的输出）开始 → 按 CC 的压缩请求构建：`x-claude-code-request-class: compaction`，头里没有 `cc_prompt_id`/turn，带主线程的 `cc_prev_req` 与 diagnostics，应答不推进主线程记忆。客户端自己带了压缩头（hint 头）就原样透传 | `request-build.js compactionRequest` |

**不做**（用户 2026-11-03）：`mid-conversation-system-clear-at` beta、1 小时缓存 TTL、订阅用户才有的工具/技能、改标题请求的模型。**做不到**：`x-claude-code-prev-tool-durations`（网关不知道工具耗时）、压缩头 `x-cc-compaction-request`/`x-claude-code-compaction`（manual/auto 不可知）、压缩后的 `cc_prev_msg` 一组。

**回退**：任何一步对不上都退回"原样"，而且是整条：头补不全 → system、prompt-id 一律不动；静态段对不上 → 只转头不拆块（与 CC 自己发自定义 system 时一致）。

## 3. 内置提示词注入：现在的判断逻辑

### 3.1 等级 → 策略（核心）

`features.LevelInjection(level, configured)`（`companions/contracts/features/levels.go`），默认等级 `low`。2026-11-02 起（用户要求"低注入可以注入这两块固定提示词，改一改，高注入额外可选工具注入"，CONTRACTS §53.22）：

| 等级 | 注入内容 |
|---|---|
| none / micro | 无（none 还是 direct） |
| low | 首轮附件：environment、model、total_tokens、date；`system_prompt` 可选，**默认关**，显式 `true` 才补（静态块 + 动态块）；不补工具 |
| high | 首轮附件；`system_prompt` 默认 `true`；默认工具 Bash / Read / Edit / Write；另可选 Agent、ListAgents、ReportFindings、ScheduleWakeup、Skill、ToolSearch、Workflow、WebSearch、NotebookEdit（默认关，只带定义） |

存档策略里显式写的值优先——**显式 `system_prompt: false` 会压过等级**，之后把等级调到 high 也不会恢复。反过来，显式 `system_prompt: true` 从 low 起生效：在 high 下自定义过这一层、之后降到 low 的策略，以及在 high 分组下把等级降到 low 的账号，都会补提示词（已接受，§53.22 的 (a)(b)）。ListAgents 到 Workflow 这 6 个工具只发给声明 `build_injection_tools_v2` 的 CLI，核心对旧 CLI 会去掉它们，其余照发。

### 3.2 CLI 侧四层判断

1. **计费头闸门**（`companions/cli-mods/request-build.js:238`）
   ```js
   const layers = billing.hasBilling(initial.systemBlocks) ? null : await injectLayers(...)
   ```
   `hasBilling`（`content-policy.js:523`）= system 里任意一块能解析出 `x-anthropic-billing-header:`。为真 → 整个注入层跳过（提示词、工具、附件、身份行都不加）。

2. **补不补提示词**（`request-build.js:60`）
   ```js
   const prompt = chosen.systemPrompt
             && !clientSystem.some(block => block.text.includes(vocabulary.systemPrompt));
   ```
   `vocabulary.systemPrompt` = 原生安全段的**完整原文**（`native-environment.inc.js:200` → `native_securityParagraph`），`includes` 精确子串匹配。客户端只写半截或改写 → 匹配不上 → 仍然补。

3. **工具与附件**：按选中的名字/类别补，客户端已带的不重复（工具按名字，附件按载体开头 `opensWith`）。

4. **身份行**（`request-build.js:165`）：`own = clientBilling !== null`（请求自带计费头）→ `line:'none'`，不加身份行；否则按 entrypoint 选（`cli`→`official_cli`，`sdk-cli`→`agent_sdk`，有追加提示词时→`official_cli_sdk`）。

补提示词时走 `ccgatewayDefaultPrompt`（`native-environment.inc.js:135`）：原生 `sI` 出段 → `L2e` 加工具相关段 → 客户端 system 里非身份行的部分追加在最后 → 切块。

### 3.3 归纳

| 请求 | 会补提示词吗 |
|---|---|
| 自带计费头（任何真实 CC 客户端） | **永不** |
| 无计费头 + high（未关）+ system 不含完整安全段原文 | 会 |
| 无计费头 + low + 显式 `system_prompt:true` + system 不含完整安全段原文 | 会（2026-11-02 起；不补工具） |
| 无计费头 + system 含完整安全段原文 | 不补提示词（工具/附件照补） |
| low 等级未选 / 显式 `system_prompt:false` / none、micro | 不补 |

### 3.4 实测矩阵（补丁 CLI 2.1.310 / v36，`request --build`）

| 场景 | system 块 | 长度 |
|---|---|---|
| high，客户端无 system | 4 | 141 / 62 / **1171** / **4223** |
| high，客户端带 system | 4 | 141 / 94 / 1171 / 4253（客户端原文接在最后） |
| high，模型是别名 `claude-sonnet-4-5-20250929` | 4 | 141 / 62 / **10617** / **15693** |
| high，客户端 system 含半截安全段 | 4 | 141 / 94 / 1171 / 4368 |
| **high，客户端自带计费头** | **1** | 客户端自己的头，无注入 |
| low | 2 | 141 / 62 |

能力门控不是问题：CLI 声明了 `build_injection_v1` 与 `request_levels_v1`（`--ccgateway-info` 可查）。

## 4. 已决定的事项

### 4.1 计费头仍是"要不要补"的总开关（已决定：保持以计费头为准）

`hasBilling` 同时决定"这条请求是不是 CC 自己的"和注入层是否执行：请求里只要有计费头，哪怕 system 只剩头和身份行，也不补提示词。曾提议把它降级为只管计费归属、按内容判定是否补提示词；**用户已否决（2026-10-30："还是以计费头为准"）**，保持现状。

### 4.2 "已带提示词"的判据（已决定：不改）

只认安全段完整原文的 `includes`：客户端写了改版/截断的安全段会被判为"没有"而补出第二份；客户端把 system 清空则检测不到"它本来该有"。这两点已知，随 4.1 一并保持现状。

### 4.3 按内容判定的方案（已撤回）

原先建议的"含 CC 静态段特征则不补、只有计费头 + 身份行则补"等内容判定规则，随 4.1 的决定撤回，不实施。

### 4.4 `cch=00000`（已决定：保持占位，不处理）

Worker 连的是官方 API，应当对齐"真实 CC 直连官方地址"的形状，所以 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1` 是对的，不该去掉（去掉后是"自定义地址"形状，反而与真实 CC 直连官方时不同）。我们写的头与真实 CC 唯一的差别是 `cch` 的值：官方二进制在发送前由 Bun 运行时把 JS 里的占位 `00000` 换成按请求计算的值（[CLAUDE-CODE-2.1.304-SYSTEM-PROMPT-ASSEMBLY](CLAUDE-CODE-2.1.304-SYSTEM-PROMPT-ASSEMBLY.md) 第 7 节），我们用 oven/bun 编译的 CLI 不做这一步。**用户决定 cch 保持 `00000` 占位、不处理**（2026-10-30）。客户端自带头里的 `cch` 是客户端自己算的，原样保留。

## 5. 会话记忆：`cc_prev_req` 与 turn 字段（v38 起；v45 起也用于转换的请求）

> 2026-11-03（v45）：会话记忆也用于第 2.4 节转换的第三方形状请求，并多记三件事：应答的 `message.id`（下一次请求的 `diagnostics.previous_message_id`）、本线程头里用的 `cc_prompt_id`、子代理的类型；另外从父线程上次应答里读出 Agent 调用（prompt 与 `subagent_type`），给子代理的第一个请求配对。规则与下表相同：证明不了接续就不给。

真实 CC 从自己的 transcript 读两件事：上一次应答的请求（最后一条 assistant 消息的 `requestId`，`mmr`）与本轮的位置（最后一个 prompt 的 `turnPosition`，`vKn` 按之前的 prompt 计数）。客户端发来的是对话消息而不是 CC 的 transcript：没有 request-id，历史还可能被截断或压缩。所以对**我们写的头**，Worker 按会话线程记住这两件事，CLI 把它们放回 CC 自己读的位置，由原生 `f3o` 写字段（不拼字符串）。

### 5.1 规则

| 项 | 规则 |
|---|---|
| 作用范围 | 客户端没带计费头、由我们写头的请求（build 与 direct 都是），以及 v45 起 build 转换的第三方形状请求；客户端自带第一方形状头的请求（含真实 CC 的子代理）不读也不写记忆。Worker 的闸门：转换开着（`requestPlan.shape`）时首块带头的请求也查记忆，由 CLI 决定用不用（只有它转换了才用、才报告 `session`）；转换关着时，system 首块以 `x-anthropic-billing-header:` 开头的请求在算消息摘要之前就跳过；头在别处的由 CLI 判定（它保留客户端的头、不报告 `session`，Worker 不存） |
| 存什么 | 每个（上游会话 U，线程）一条：最后一次**成功**上游响应的 `request-id`、该请求的消息摘要（逐条规范 JSON 的 sha256，v45 起去掉 `cache_control`、字符串内容视为一个文本块，因为 CC 重发同一条消息时会挪走缓存标记、把只剩一块文本的内容写成字符串），主线程另存 CLI 报告的 turn 位置与 prompt 哈希。转换的请求另存：应答的 `message.id`（Worker 读客户端收到的应答字节，流式读 `message_start`，JSON 读 `id`；只收 `^msg_[A-Za-z0-9_]{1,64}$`）、CLI 报告的 `prompt_id`、子代理的 `agent_type`、应答里的 Agent 调用（prompt 的哈希与 `subagent_type`，最多 16 个，有一个读不全就都不存） |
| 会话键 U | Worker 交给 CLI 的上游会话（`CCG_REQUEST_IDENTITY.session_id`），且只用于客户端自己命名的会话（metadata 带 `session_id`，映射后作为 U）。选 U 而不是客户端会话 S：U 是上游看到的会话，S 经账号密钥映射成 U，一一对应 |
| 线程 | 主线程，或子代理的 agent ID（请求头 `X-Claude-Code-Agent-Id`）。`X-Claude-Code-Request-Class` 是 `subagent`/`workflow` 却没有 agent ID 的请求分不出线程，Worker 不用记忆。CLI 只在 Worker 查的线程与它实际构建的线程一致时才用，并在响应元数据里报告线程；不一致则不用、不存 |
| `cc_prev_req` | CLI 把记住的 request-id 放到最后一条 assistant 记录的 `requestId`（direct 传给原生 `d2s` 的 `previousRequestId`）。只有本次请求的最后一条 assistant 正是被记住请求的应答时，Worker 才交出记忆：消息以被记住请求的消息开头，其后第一条是 assistant（那次的应答），再往后没有别的 assistant。否则整条记忆都不交（不带 `cc_prev_req`，turn 也按历史计数）；首轮、换对话、截断历史、客户端插入或多出 assistant 都是这样 |
| turn 字段 | 仍先按历史由原生计数（`ccgatewayMarkTurns`）。拿到记忆时（上一行的续接成立）修正：最后一条用户消息是新输入（不是 tool_result 续发，且 prompt 哈希不同）→ `turnIndex = max(历史值, 记忆+1)`，`promptIndex = max(历史值, 记忆 + (cli 入口 ? 1 : 0))`；tool_result 续发或同一输入重试 → 取 `max(历史值, 记忆值)`；超出原生上限（1e7）或不合 `$3` 校验则用历史值。结果写回 prompt 记录的 `turnPosition`，由原生写字段 |
| 派生会话 | 客户端没命名会话时，Worker 按对话首条消息派生会话；首条消息相同的不同对话共享它（离线回归 `noncc-identity2`：对话 A 的后续轮会拿到对话 B 的 request-id），所以派生会话**完全不用记忆**，`cc_prev_req` 不带、turn 按历史计数（派生会话的历史必然从首条消息开始，原生计数本身就对） |
| 子代理线程 | 只存 request-id，不存也不写 turn（官方子代理的头没有 turn 字段）；转换的子代理另存 prompt-id 与类型 |
| 子代理的第一个请求（v45，转换） | 消息里还没有 assistant 时，Worker 到父线程（`X-Claude-Code-Parent-Agent-Id` 指的子代理，否则主线程）的记忆里找上次应答的 Agent 调用：其 prompt 必须是本请求首条用户消息里的一个文本块；父线程没有请求在途；只有一个调用匹配（或多个但类型相同）。成立才给 `spawn`（父线程的 prompt-id 与类型）。CLI 只采用 CC 内置的类型 |
| `cc_prompt_id`（v45，转换的主线程） | 客户端没给时按（上游会话，turn 序号，prompt 哈希）派生，见 2.4；记忆里的 prompt-id 只给子代理用 |
| `diagnostics`（v45，转换） | 首个请求 `null`；续接成立时为记住的 `message.id`；否则不带 |
| 压缩请求（v45，转换） | 属于主线程：读主线程记忆写 `cc_prev_req` 与 diagnostics；报告里没有 turn，所以不更新主线程（与 CC 一样，压缩应答不进主线程 transcript） |
| 并发 | 主线程与子代理线程同一机制：同一（会话，线程）已有请求在途时，后来的请求不读记忆；这些重叠的请求（包括先到的那个）都不写记忆，因为不知道对话接着哪一次应答往下走 |
| 失败 | 只有完整成功（2xx 且流完整）的请求才更新记忆；失败、开始输出后中断或被取消都不推进。整条记住或不记：request-id 不合法、主线程的 turn 或 prompt 哈希不合法时记忆保持原样，没有可记的也不新建条目 |
| 容量与过期 | 每个 Worker 最多 4096 条，按最近应答淘汰；闲置 24 小时过期。理由：一个 Worker 只服务一个账号、同时只有几个请求，一天内活跃的会话线程远少于 4096；24 小时覆盖当天续聊，更久的续聊回到按历史计数。只在进程内存，不落盘：Worker 重启或淘汰后视为新会话 |
| 能力 | `build_session_state_v1`：Worker 只对声明了它的 CLI 发 `previous`（旧 CLI 会拒绝未知字段） |

### 5.2 实际启用的情形与故意不做的情形

| 情形 | 是否使用记忆 | 原因 |
|---|---|---|
| 非 CC 请求（无计费头），客户端命名会话，主线程，带完整历史 | 是：`cc_prev_req` 有；turn 原生计数本就正确 | 我们写头 |
| 同上，只发最后一轮 / 压缩过的历史 | 否：`cc_prev_req` 不带，turn 按历史计数（0.1.114 起；此前 turn 会按记忆修正） | 不能证明是同一段历史时宁可不带 |
| 同上，tool_result 续发 | 是：`cc_prev_req` 与本轮 turn | 消息接着上一次请求 |
| 非 CC 请求，派生会话（metadata 不带会话） | 否：不带 `cc_prev_req`，turn 按历史 | 首条消息相同的对话共享派生会话，无法区分 |
| 客户端自带第一方形状的头（含主线程与子代理） | 否 | 客户端自己的头原样保留；真实 CC 自己写的 `cc_prev_req` 已与上游一致（2.1 节） |
| 客户端自带第三方形状的头，转换开着（v45） | 是：主线程、子代理、压缩请求都按上表 | 转换后的头是我们写的（2.4 节）；记忆规则相同 |
| 同上，转换关着（策略 `first_party_shape:false`）或 direct | 否 | 客户端的头原样保留 |
| 带子代理头但没有计费头的请求 | 否 | v28 起这类请求一律按主线程构建，Worker 查的是子代理线程，线程不一致，CLI 不用、Worker 不存 |
| 子代理请求没有 agent ID（`X-Claude-Code-Request-Class: subagent`/`workflow`，Worker 的 `sessionThread` 判定）、同一线程（主线程或子代理）并发、fork/compact | 否 | 无法确定是哪个线程的哪一次请求 |
| 控制台账号测试（probe） | 否 | 网关自己的请求，不属于对话 |
| 压缩后的 `cc_prev_msg`/`cc_prev_prompt_index`/`cc_prev_turn_index`（2.1.316 起的原生字段） | 不补 | Worker 只看得到"同一会话、历史对不上"，分不清压缩与编辑重发、分叉、截断；官方总把它与 `*-context-compacted` 头成对发出，而非 CC 请求的这组头一律丢弃（v28），单独补会造出官方没有的形状。历史对不上时本来就不带 `cc_prev_req`，与官方压缩后的表现一致。我们的 CLI 进程里不会发生压缩，原生也就不会写这三个字段 |

v45 之前，子代理线程的记忆实际不会被写入：没有计费头的请求总是主线程。v45 起转换的第三方子代理（带 `X-Claude-Code-Agent-Id`）会写入并使用它。键与线程校验仍按（会话，线程）实现并有单测覆盖；`continueSession` 的子代理分支 v45 起由转换的请求用到（`continueDirectSession` 的仍不可达）。

## 6. 复现方法

容器：ovh，`node:22-bookworm-slim`（跑官方 ELF 与假上游）或 `ccgateway-app:0.1.113`（跑补丁 CLI，路径 `/opt/ccgateway/cli/2.1.310/claude`）。挂载目录 `~/cc312`。

| 脚本（`artifacts/claude-2.1.312/container-test/`） | 作用 |
|---|---|
| `run.sh` | 官方 CLI，自定义 URL 形状（3 块） |
| `run-fp.sh` | 官方 CLI + `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`（4 块） |
| `run-auth.sh` | 三种认证方式的对照 |
| `run-build.sh` | 补丁 CLI + `request --build`，high/带 system/别名/带计费头/半截安全段/low |
| `run-build-nofp.sh` | 同上但不设 first-party 假设（看生成的头怎么变） |
| `fake-upstream.cjs` | 记录每个请求并把最小合法响应回给 CLI |

抓回的 body：`captures-fp/`（官方 4 块）、`captures-auth/`（三种认证）、`captures-build/`（补丁 CLI 矩阵）、`captures-nofp/`（不设假设）。

命令示例：

```bash
ssh ovh 'docker run --rm -v /home/debian/cc312:/t -w /t --entrypoint bash ccgateway-app:0.1.113 /t/run-build.sh'
```

会话记忆（第 5 节）的端到端验证在离线回归里：`cli-mods/test/e2e` 的 `noncc-session` 场景与 `turn2-build-low`，断言在 `verify.cjs` 9b。

## 7. 代码索引

| 位置 | 内容 |
|---|---|
| `companions/contracts/features/levels.go:82` | `LevelInjection`：等级 → 注入项 |
| `companions/cli-mods/request-build.js:238` | 计费头闸门（`hasBilling ? null`） |
| `companions/cli-mods/request-build.js:60` | 提示词"已带"判据（安全段子串） |
| `companions/cli-mods/request-build.js:165` | `identityRequest`（own → 不加身份行） |
| `companions/cli-mods/request-build.js:231` | 我们写头时接上会话记忆（`continueSession`） |
| `companions/cli-mods/content-policy.js:523` | `hasBilling` |
| `companions/cli-mods/content-policy.js:429` | `mergeBillingAttribution`（只管 `cc_version`/`cc_entrypoint`） |
| `companions/cli-mods/shared.js:18` | `billingFields` |
| `companions/cli-mods/native-environment.inc.js:135` | `ccgatewayDefaultPrompt` |
| `companions/cli-mods/native-environment.inc.js:200` | `vocabulary.systemPrompt` = 原生安全段原文 |
| `companions/cli-mods/request-session.js:39` | `sessionTurn`：turn 修正规则 |
| `companions/cli-mods/request-session.js:68` | `continueSession`：request-id 与 turn 放回记录 |
| `companions/engine/session_state.go:262` | `attachSessionState`：按（会话，线程）交出记忆，消息续接与命名会话的校验 |
| `companions/engine/session_state.go:294` | `rememberSessionState`：成功后按 CLI 报告记住 |
| `next/server/internal/ccgateway/runtime_features.go:46` | 核心侧的注入能力预检 |
| `next/plugins/ccgateway/companions/engine/request_command.go:240` | Worker 侧的同名能力门控 |
| `next/server/internal/gateway/forward.go:51` | 核心把上游 `request-id` 等响应头转给客户端 |
