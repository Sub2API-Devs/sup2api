# Claude Code 2.1.304 内置 system 提示词的组装

> 2026-10-27 清理：文中引用的本机 `artifacts/` 与 ovh 上 `~/sup2api/checks/`、旧 `release-*`、`~/sup2api-managed/{stage,backups,publish,ccgateway-images}/` 下的旧版本原始记录已删除，路径仅作出处；现存位置见 [CLI-TEST-PLAN](CLI-TEST-PLAN.md)。
>
> 2.1.312 的复核（函数名对照、实抓数字、版本差异）见第 12 节。

2026-10-22。分析对象是 30 号容器当前使用的 CLI：v17（`ccgateway-v17-identity-line`，sha256 `000a5382…`），与本地 `artifacts/claude-2.1.304/claude-linux-v17-identity-line` 逐字节相同。做法是用 `restore-bun.cjs` 解包，再用 `@babel/parser` 给 53 MB 的 bundle 建顶层声明索引，沿调用链读源码（脚本在 `artifacts/claude-2.1.304/prompt-ast/`，`q.cjs find|show|callers`）。下文函数名是 Bun 重新打包后的名字，所以带数字后缀；与 `linux-restored` 里的同名函数对应。v17 只改了请求命令和内容策略，没有改提示词组装。

为核对，在 30 号容器里用官方 2.1.304 ELF（sha256 `ea0f1357…`）跑 `claude -p`，连接走 unix socket 上的假上游，占位令牌，没有请求到达真实上游。假上游让主代理调用一次 Agent（general-purpose），这样也抓到了子代理的请求。v17 自己跑不出子代理，因为它的工具调用都交给 mods（返回 `No tool.call mod handler answered Agent`）。用的模型是 `claude-opus-4-8` 和 `claude-sonnet-4-6`。临时文件已删除。

## 1. 总流程

一次请求最终的 `system` 由四层拼成：

1. **调用方的 system**：主代理是默认提示词（或 `--system-prompt` 等替代），子代理是代理自己的提示词。
2. **查询循环追加 systemContext**：`mSs`（appendSystemContext）把 `eq()` 的结果按 `key: value` 拼成一段加在最后。2.1.304 里它只剩 `perforceMode`（`CLAUDE_CODE_PERFORCE_MODE` 打开时），平时为空。
3. **API 层在最前插计费头和身份行**：`qmn2`（发请求的函数）里 `n2 = PAs(n2, n1n(...), …)`，即 `[kLo(...), n1n(...), ...system]`。**主代理、子代理以及其他所有经过 `qmn2` 的请求都有这两项**。
4. **切块**：`Jfr2` → `Fbo` 按动态分界 `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__` 切成文本块并加 `cache_control`。

环境信息（工作目录、平台、模型等）不在 `system` 里，而是作为消息附件发送，见第 5 节。

## 2. API 层：计费头与身份行

`PAs(system, identity, opts)`：

```js
let s = kLo(fingerprint, agentContext, previousRequestId, promptId, turnOrigin, turnPosition, { attributionProject: se67() });
return ki17([s, identity, ...system].filter(Boolean));
```

- **身份行** `n1n({isNonInteractive, hasAppendSystemPrompt, recorded})`：Vertex 用终端那句；有 `recorded` 就用它（会话快照里记下的）；非交互且有追加提示用 `ke`（"…running within the Claude Agent SDK."）；非交互用 `De`（"You are a Claude agent, built on Anthropic's Claude Agent SDK."）；否则 `le`（终端那句）。子代理沿用会话的这两个状态，所以和主代理是同一句。
- **计费头** `kLo`：`cc_version=<版本>.<指纹>; cc_entrypoint=<入口>;`，firstParty OAuth 时加 `cch=00000;`，另有 `cc_workload`、子代理的 `cc_is_subagent=true`，以及会话类字段 `cc_prev_req`、`cc_prompt_id`、`cc_turn_origin`、`cc_prompt_index`、`cc_turn_index`。子代理的指纹按它自己的第一条用户消息算，所以和主代理不同。
- **切块** `Fbo`：计费头单独一块，不缓存；身份行单独一块；分界之前的静态段合成一块，`scope: global`；分界之后的动态段合成一块。没有分界时（子代理）其余内容合成一块。

## 3. 主代理

### 3.1 选用哪份提示词

`Zsr`（`YV2` 内部，buildEffectiveSystemPrompt）按优先级：

1. `overrideSystemPrompt`：直接用，不追加任何东西。
2. 协调者模式且没有主线程代理：协调者提示词加追加项。
3. 主线程代理（`--agent`）：用代理的 `getSystemPrompt()`；代理设了 `appendSystemPrompt` 时放在默认提示词后面。
4. `--system-prompt`（`customSystemPrompt`）：替换默认提示词。
5. 默认提示词 `wx5` → `nin2`。

然后 `r1e` 把下列内容按分界插入：技能提案提示、`system_hint`、`I0s`（Edit/Write 相关）、协调者提示、`e2n().systemPromptSection`、`--append-system-prompt`。标为 `shared` 的放在分界之前，`session` 的放在分界之后。

### 3.2 默认提示词 `nin2`

`CLAUDE_CODE_SIMPLE` 打开时只有 `CWD: …\nDate: …`。否则分两部分。

**静态部分（分界之前，`scope: global`）**，由模型是否为 lean 决定：

- lean（`lW3` → `D43`：`CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT`、非 firstParty 模型、开关 `tengu_velvet_tide` 或模型能力 `simple_system_prompt`）：只有 `lean_body`，即开头一句、安全说明和 `# Harness`。实抓中 Opus 4.8 是这种，1171 字符。
- 非 lean：`intro`（`Orr`）、`# System`（`Drr`）、`# Doing tasks`（`Lrr`，输出风格不保留编码说明时去掉）、`# Executing actions with care`（`Nrr`）、`# Using your tools`（`$rr`）、`# Tone and style`（`Urr`）。实抓中 Sonnet 4.6 是这种，10695 字符。
- 开头一句：有输出风格时是 "You are an interactive agent that helps users according to your \"Output Style\"…"，否则是 "You are an agent working with the user toward their goals…"。

**动态部分（分界之后）**，每段都有条件，返回 null 就不出现：

| 段 | 内容或条件 |
|---|---|
| communication | 写代码风格等沟通说明（`mrr`） |
| pronouns | they/them 那段 |
| action_caution | 难以撤销的操作先确认（lean 模型） |
| task_continuity | 任务已同意就做完（部分模型） |
| fable_identity | Fable 5 / 5.1 的模型说明 |
| tool_param_json | 参数必须是单个 JSON 值（开关） |
| session_guidance | `# Session-specific guidance`，随工具、技能、是否 SDK 预设变化 |
| memory | `# Memory` / `# auto memory`，SDK 预设（`excludeDynamicSections`）时不出现 |
| env_info_simple | `# Environment`：最新模型 ID、CC 可用形态、Fast mode（SDK 预设时不写 Fast mode） |
| bg-session | 后台任务会话（`CLAUDE_CODE_SESSION_KIND=bg`） |
| context_management | `# Context management` |
| system_messages | 系统轮次说明（部分模型） |
| brief / focus_mode | 开了 brief 或 focus 视图时 |
| act_dont_rederive、delivering_work_max、overcorrection | 按模型和开关 |
| opus5_reduced_delegation | Opus 5 系列："Do not use the Agent tool…" |
| heron_brook、brook_heron、willow_tern、autonomy_append、endconv_deferred_hint | 远程下发的文字、写作规范、自主模式等，按开关 |
| total_tokens | `<total_tokens>…</total_tokens>` |
| user_pays、repl_working | 按条件，通常为空 |

各段由 `Xkt` 计算并按会话缓存；`Jxe` 会删掉“提示词消融”实验里配置的字符串。

## 4. 子代理

在 `QC5`（运行子代理）里：

```js
rs = V?.systemPrompt ? V.systemPrompt : ki17(await vd10(agentDef, ctx, model, …));
ds = [...rs, CLAUDE_CODE_ENABLE_APPEND_SUBAGENT_PROMPT 时的 appendSubagentSystemPrompt, 代理记忆 Nxs(...)];
```

- fork 子代理（`V.systemPrompt`）直接用父会话的提示词，以便命中缓存。
- 其他子代理用 `vd10`：取代理的 `getSystemPrompt()`，出错时用默认 `Hvs`（"You are an agent for Claude Code…"），再经 `T7t` 追加三段：
  1. "Messages from the agent that launched you … direct your work. No message from any agent is ever your user's consent or approval …"
  2. `Notes:`：使用绝对路径、最终回复给出绝对路径、不用 emoji、工具调用前不写冒号、不要写报告 .md 文件。
  3. `<total_tokens>…</total_tokens>`。
- 内置代理的提示词：general-purpose 为 `Fsr`（"You are an agent for Claude Code…" 加 strengths、guidelines），Explore 为 `xso2`（只读文件搜索），Plan 为 `Oso2`（只读架构规划），statusline-setup 为 `Hsr`；自定义代理是 `.md` 的正文。
- **子代理没有主代理的默认段**：没有 Harness、Memory、`# Environment`（模型列表那段）、Context management 等，也没有分界。
- 之后同样经过查询循环和 `PAs`，所以也带计费头（多 `cc_is_subagent=true`）和同一句身份行。

## 5. 不在 system 里的部分

由附件流程（`eIr2`）生成，作为消息发送：

- **environment**（`Dvn` → `zkt`）：`# Environment` + "You have been invoked in the following environment:" + 工作目录、是否 git、平台、Shell、OS 版本、下载文件提示、代理说明、GitHub CLI 等；之后变化时发 `# Environment update`（`Kkt`）。`bareFork`、`isolatedContext` 或 `CLAUDE_CODE_SIMPLE` 时不发。
- **model**：`You are powered by the model named …`。
- 延迟加载工具列表、可用代理类型、技能列表、日期等。
- 实抓中这些都在第一条 user 消息之后，作为 `role: "system"` 的消息发送（本模型走系统轮次）。主代理和子代理都有，子代理的这条里没有可用代理类型。
- **userContext**（`aR6` / `cSt2`）：`userEmail`、`attachedProject`、`gitStatus`、`perforceMode` 等，以 `<system-reminder>` "As you answer the user's questions, you can use the following context:" 放在用户消息里。实抓的目录不是 git 仓库、没有 CLAUDE.md，所以没有出现。
- 第一条 user 消息前面还有提交署名的 `<system-reminder>`。

## 6. 实抓结果（官方 2.1.304，`claude -p`）

| 请求 | system 块 |
|---|---|
| 主代理 Opus 4.8 | `[计费头, SDK 那句, 静态 1171 字（lean，global 1h）, 动态 4430 字（1h）]` |
| 主代理 Sonnet 4.6 | `[计费头, SDK 那句, 静态 10695 字（global 1h）, 动态 16311 字（1h）]` |
| 子代理 general-purpose（两种模型相同） | `[计费头 +cc_is_subagent, SDK 那句（ephemeral）, 代理提示词 + T7t 三段 2720 字（ephemeral）]` |

两种模型的身份行都是 SDK 那句，入口都是 `sdk-cli`（`-p`，没有追加提示）。

## 7. 发现：官方二进制会算 `cch`

官方 ELF 发出的计费头里，`cch` 是每次请求不同的 5 位十六进制值（实抓 `aff14`、`10dd7`、`b31b0`、`f3b2f`、`c0663`）。JS 源码里只有 `kLo` 写的占位 `cch=00000;`，没有任何替换代码，所以替换发生在官方 Bun 运行时里，发送前按请求内容计算。我们用标准 Bun 1.4.3 重新编译的 CLI 发出的是原样 `00000`：同一容器、同样的 `claude -p` 换成 v17 跑，计费头是 `cch=00000;`，其余字段相同。上游目前接受 `00000`，但这是和官方客户端可区分的差异。BILLING / SYSTEM-PREFIX 文档里“官方二进制发送时是否改写没有核实”一条，由此确认：会改写。

## 8. 与 ccgateway 的关系

- build：客户端的 system 代替默认提示词，所以第 3 节的默认段不会出现；第 2 节 `PAs` 的计费头和身份行仍由 CLI 在最前补上，这就是 v16/v17 计费头与身份行规则作用的位置。
- direct：body 原样转发，CC 的组装流程都不经过；v17 只按策略补计费头和身份行。
- 子代理请求在客户端本地生成，到达网关时已经是第 4 节的形状（代理提示词 + `cc_is_subagent`）。

## 9. 子代理请求经过网关（2026-10-22，30 号，v17）

把第 6 节抓到的官方主代理、子代理请求原样发给 30 号 Worker，build 用线上策略（`cc_version` 取服务端，平台和 OS 版本取服务端），direct 用线上 direct 策略；再把日志里的输入交给同一个 CLI，重放到假上游，看实际发出的内容。四次真实上游都是 200。

- **计费头正确**：两种模式发出的计费头都和客户端逐字相同，包括 `cc_is_subagent=true`、`cch`、`cc_prompt_id`。build 下 `cc_version` 取服务端，算出的指纹和客户端相同（主代理 `1d1`、子代理 `9a4`），诊断为 `unchanged`。身份行、块数、缓存标记也和客户端相同。
- **请求头不对**。官方子代理请求带 `x-claude-code-request-class: subagent`、`x-claude-code-agent-id`、`x-claude-code-agent-type`、`x-claude-code-prompt-id`；我们发出的只有 `request-class: main` 和会话 ID，主代理请求也少了 `prompt-id`。所以上游看到的是：body 写着子代理，请求头却是主线程。
  - 插件只转发客户端的 `x-claude-code-agent-id`（`internal/ccgateway/ccgateway.go` `headers`），不转发 agent-type、request-class、prompt-id。
  - Worker 的旧会话路径把派生的 A' 写进 `ANTHROPIC_CUSTOM_HEADERS`（`runner_config.go` `cliEnv`），但 2.1.304 走的请求命令（`request_command.go`）不设这个变量；即使设了，`request-command.js` 也会先删掉它。所以 A' 在请求命令路径上不会发出。
  - `request-class` 由 CLI 发请求时的 `agentContext: El()`（主线程）决定。
- 重放时没有 Worker 的身份上下文，会话 ID 是随机的，这里不据此判断会话 ID 是否正确。

## 10. 子代理相关字段在 CLI 里的来源

请求头都在创建客户端的 `sF3`（原 `eF`）里生成，输入是 `source`（取 `querySource`）、`requestClass`、`agentContext`、`promptId`；计费头在 `kLo` 里生成。除 `request-class` 和 `cch` 外，都只在对应输入有值时才出现。

| 字段 | 原生取值 | 输入从哪来 |
|---|---|---|
| `x-claude-code-request-class` | `PVs`：显式 `requestClass` 优先；`compact` → compaction；`rs8(querySource)`：`sdk`/`repl_main_thread*` → main，`agent:*`/`hook_agent` → subagent（上下文带 `workflowRunId` 时为 workflow），其他 → auxiliary | `querySource`；子代理由 Agent 工具（`xo36`）用 `Zoe2(类型, 是否内置)` 得到 `agent:builtin:<类型>` 或 `agent:custom` |
| `x-claude-code-agent-type` | `IVs`：`agent:builtin:<类型>` 取类型，`agent:custom*` 为 `custom`，teammate 上下文为 `teammate` | 同上 |
| `x-claude-code-agent-id` | `agentContext.agentId`（主线程上下文不发），经 `o1r` 转义 | Agent 工具里 `jy()` 生成：`a` + 16 位随机十六进制 |
| `x-claude-code-parent-agent-id` | `agentContext.parentAgentId` | 发起者的 `agentId`；从主线程发起时为空，所以实抓没有 |
| `x-claude-code-prompt-id` | 参数 `promptId`，须为 UUID | `OUe(messages, ctx)`：最后一条用户记录的内部字段 `promptId`；子代理没有时用上下文的 `parentPromptId`（发起时父线程的 prompt-id） |
| `x-claude-code-session-id` | `q3()`，进程会话 ID | 进程级 |
| 以上四个分类头的总开关 | `m6n()`：`CLAUDE_CODE_GATEWAY_HINT_HEADERS`，或 firstParty 且开关 `tengu_splendid_sutton` | 30 号上为开 |
| 计费头 `cc_is_subagent=true` | `agentContext.agentType === "subagent" && !isMainSession` | 同 agent-id |
| 计费头 `cc_prompt_id` | 同 `promptId`（firstParty 且官方地址） | 同 prompt-id |
| `cc_turn_origin`、`cc_prompt_index`、`cc_turn_index` | 最后一条用户记录的内部字段 `turnOrigin`、`turnPosition` | 进程内的对话记录，wire 上没有 |
| `cc_prev_req` | 最后一条 assistant 记录的 `requestId`（`req_…`） | 进程内的对话记录 |

请求命令现在给的是 `source/querySource: 'sdk'`、主线程上下文 `Al3()`（`{agentType: "main", agentId: q3()}`）、不传 `promptId`。build 交给原生构建的也是 `querySource: 'sdk'` 和主线程上下文；而且 build 在 `qmn2` 创建客户端之前就把 body 交出来了，所以 build 的请求头同样由请求命令那次 `sF3` 决定。

客户端能提供的：请求头里有 request-class、agent-type、agent-id、prompt-id、parent-agent-id（嵌套时）；body 里只有计费头的 `cc_is_subagent`、`cc_prompt_id`，以及 `metadata.user_id` 的 `session_id`。turn 和 prev_req 只在客户端自己的进程里，网关只能沿用客户端计费头里的值。

## 11. 主代理与子代理请求的差异，以及 build 缺什么（2026-10-22）

两类差异（官方 2.1.304 实抓 Opus、Sonnet 两组，差异项相同；成因见 bundle）：

- **由请求内容决定**，客户端发来时已经带着，build 原样保留就行：子代理提示词 + T7t 三段、没有分界（因此身份行带 ephemeral、其余块 5 分钟缓存）、子代理自己的附件集合与顺序（`QC5` 收集，没有可用代理列表）、少 ScheduleWakeup/Workflow（`tu14`）、计费头的 `cc_is_subagent` 与指纹。
- **由 `querySource` / `agentContext` 决定**，网关重建时必须传对：
  - `x-claude-code-request-class`、`agent-type`（`PVs`/`IVs`，来自 `agent:builtin:<类型>`/`agent:custom:<类型>`）；
  - `agent-id`、`parent-agent-id`、`prompt-id` 回退到 `parentPromptId`（`sF3`、`OUe`）；
  - 缓存 TTL：`zbe2` 的 1 小时名单默认只有 `repl_main_thread*`、`sdk`、`auto_mode`、`memdir_relevance`，子代理为 5 分钟，所以**不带 `extended-cache-ttl-2025-04-11`**（`qmn2` 只在 1 小时时加这个 beta）。

build 实测（30 号线上 Worker + v17，官方主代理/子代理请求，重放到假上游逐字段对比）：

| 字段 | 主代理 | 子代理 |
|---|---|---|
| system、messages、thinking、context_management、output_config、diagnostics、max_tokens | 与客户端相同 | 与客户端相同 |
| 工具定义 | 内容相同，键顺序 `description, name, input_schema`（官方 `name` 在前） | 同左 |
| `request-class` | main，一致 | **main**（官方 subagent） |
| `agent-id`、`agent-type` | — | **缺** |
| `prompt-id` | **缺** | **缺** |
| `anthropic-beta` | 一致 | **多 `extended-cache-ttl-2025-04-11`**（按 `sdk` 算成 1 小时），而 system 缓存标记是客户端的 5 分钟 |
| metadata | 身份映射，按设计 | 同左 |

结论：子代理的提示词不需要 build 另外补，客户端已经带着，build 也没有加默认段。缺的是第二类：把 `querySource`、子代理 `agentContext`（派生的 agent ID）和 `promptId` 交给原生构建与请求命令，请求头和 beta 就由原生代码按子代理生成。

## 12. 2.1.312 复核（2026-10-30）

用官方 2.1.312（sha256 `4f4178ce…`，与官方 manifest 一致）实抓，不登录：ovh 一次性容器 `node:22-bookworm-slim`，CLI 全部流量走容器内的假上游（`http://127.0.0.1:8080`，`ANTHROPIC_BASE_URL` 允许回环 http），`CLAUDE_CODE_OAUTH_TOKEN` 放占位令牌。脚本在 `artifacts/claude-2.1.312/container-test/`，抓回的 body 在 `artifacts/claude-2.1.312/captures-fp/`；bundle 源码用 `artifacts/claude-2.1.312/linux-restored/` 逐函数核对。

**必须设 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`**。同一个容器不设它跑 `claude -p hi`，system 只有 3 块、计费头退化成 74 字、没有 `cch`/`cc_prompt_id`/`cc_turn_*`；设了才和客户端直连官方地址一致。测其它客户端形状时同样适用（见 [CLI-TEST-PLAN](CLI-TEST-PLAN.md)）。

### 12.1 函数名对照

2.1.312 重新打包后名字全变了，职责与本文第 2–3 节一一对应：

| 2.1.304 | 2.1.312 | 作用 |
|---|---|---|
| `YV2` / `Zsr` | `Hir`（外层 `XY`） | buildEffectiveSystemPrompt：override > 协调者 > 主线程 agent > `customSystemPrompt` > 默认 |
| `Xkt` | `sI` → `bon`/`mXe`（特征）、`osr`/`Ron`（段与决定）、`rsr`（段表） | 段引擎 |
| `nin2`、各 `# ` 段 | `rsr` + `Drr`/`Nrr`/`Frr`/`$rr`/`jrr`/`Krr`；lean 为 `pon` | 静态提示词 |
| `r1e` | `L2e` | 按 `shared`/`session` 插段 |
| `PAs` | `d2s` | `[计费头, 身份行, ...调用方 system].filter(Boolean)` |
| `n1n` | `b6n` | 身份行选择（`ie` 终端 / `Ue` SDK+append / `Pe` SDK） |
| `kLo` | `f3o` | 计费头 |
| `Jfr2`/`Fbo` | `b8n`（`sI` 末尾 `b8n(s, A6()?uN:null)`） | 按分界符切块 |

### 12.2 实抓结果（`claude -p hi`，设了 first-party 假设）

| 模型 | system 块 | 长度 | 缓存标记 |
|---|---|---|---|
| Opus 4.8（lean） | 计费头 / 身份行 / 静态 / 动态 | 192 / 62 / **1171** / **4388** | — / — / `ephemeral 1h scope:global` / `ephemeral 1h` |
| Sonnet 4.6 | 计费头 / 身份行 / 静态 / 动态 | 192 / 62 / **10695** / **16269** | 同上 |

静态块长度与第 6 节 2.1.304 的 1171 / 10695 完全一致。工具 12 个（Agent、Bash、Edit、ListAgents、Read、ReportFindings、ScheduleWakeup、Skill、ToolSearch、Workflow、DeferredToolPlaceholder、Write），`max_tokens` 64000（Opus）/ 32000（Sonnet），`stream: true`，`/v1/messages?beta=true`。计费头两次抓到的 `cch` 不同（`081e5`、`db5d7`），确认第 7 节的运行时计算在 2.1.312 上仍然如此。

### 12.3 与 2.1.304 的差异

- **分界符是开关控制的**。2.1.312 的 `sI` 末尾是 `b8n(s, A6()?uN:null)`：`A6()` 为假时（本次不设 first-party 假设就是这样）不插 `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__`，静态段和动态段合成一块，system 只有 3 块。为真时才是本文第 2 节的 4 块。
- **动态段的形态取决于 `leanRewrite`**。`cfe(model)` 为真时每段包成 XML 标签（`<communication>`、`<environment>`…，`esr` 改名表 + `gXe`），否则仍是 `# 标题`。本次 Opus 4.8 实抓是后者。
- **环境附件的载体仍随模型**：Opus 4.8 走 `role:"system"` 消息，Sonnet 4.6 塞进首条 user 的 system-reminder（与第 5 节一致）。
- **`--append-system-prompt`**：实测拼在提示词块的**最末尾**（`…<total_tokens>…</total_tokens>\n\n<追加文本>`），同时身份行从 `Pe` 变 `Ue`；不设 first-party 假设的那一对是 5560 → 5574 字。

### 12.4 lean 静态块全文（Opus 4.8，1171 字）

```
You are an agent working with the user toward their goals, using your own judgment along the way.

IMPORTANT: Assist with authorized security testing, defensive security, CTF challenges, and educational contexts. Refuse requests for destructive techniques, DoS attacks, mass targeting, supply chain compromise, or detection evasion for malicious purposes. Dual-use security tools (C2 frameworks, credential testing, exploit development) require clear authorization context: pentesting engagements, CTF competitions, security research, or defensive use cases.

# Harness
 - Text you output outside of tool use is displayed to the user as Github-flavored markdown in a terminal.
 - Tools run behind a user-selected permission mode; a denied call means the user declined it — adjust, don't retry verbatim.
 - `<system-reminder>` tags in messages and tool results are injected by the harness, not the user. Hooks may intercept tool calls; treat hook output as user feedback.
 - Prefer the dedicated file/search tools over shell commands when one fits. Independent tool calls can run in parallel in one response.
 - Reference code as `file_path:line_number` — it's clickable.
```

非 lean 的静态块仍是第 3.2 节那六段（`# System`、`# Doing tasks`、`# Executing actions with care`、`# Using your tools`、`# Tone and style`，Sonnet 4.6 另有 `# Text output (does not apply to tool calls)` 等由动态段承载）。

### 12.5 动态块段序（Opus 4.8 实抓，按出现顺序）

communication（无标题，`Write code that reads like the surrounding code…`）、pronouns、action_caution、`# Session-specific guidance`、`# Memory`、`# Environment`、`# Context management`、act_dont_rederive、`<total_tokens>…</total_tokens>`。Sonnet 4.6 在此之上还有 `# Text output (does not apply to tool calls)`、`# auto memory`、`<types>/<type>`。`rsr` 的完整段表（含按模型、开关、工具、技能打开才出现的段）见第 3.2 节的表，2.1.312 只是条目顺序和命名有调整。

### 12.6 与 ccgateway 的补充

请求等级 `low`（默认）只注入环境附件、不注入这段提示词，所以客户端自己没有 system 时，build 出来的请求 system 就只有计费头 + 身份行两块——不是丢段。`high` 才会把上面这份（lean 或全量）注入进去（`next/plugins/ccgateway/companions/contracts/features/levels.go` 的 `LevelInjection`）。

