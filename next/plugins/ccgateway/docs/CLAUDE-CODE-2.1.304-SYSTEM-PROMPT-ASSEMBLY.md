# Claude Code 2.1.304 内置 system 提示词的组装

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
