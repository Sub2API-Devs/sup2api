# Claude Code 附件组装机制与类型对照

本文分析官方 Linux x64/glibc Claude Code **2.1.296** 的客户端实现，不描述 CCGateway 对请求的处理。附件的收集、渲染、会话归一化是三个不同阶段：内部 `attachment` 记录不会直接作为同名 API 内容块发送。

整个版本的分析与补丁状态见 [留存总记录](CLAUDE-CODE-2.1.296-ANALYSIS-AND-CHANGES.md)。历史 JSONL 如何识别附件、按 parentUuid 恢复分支、校验 attachment 载荷并复用 rendered，见总记录第 4.1 节及 [源码证据](cli-research/2.1.296/history-attachment-evidence.json)。

依据是还原 JS 的 AST 分支和函数正文；没有逐类运行真实模型请求。配套 [附件渲染证据](cli-research/2.1.296/attachment-renderers.json) 保留源文件哈希、行号、字符偏移、分支正文和关键辅助函数。字符偏移不是 ELF 文件偏移。

## 1 统一组装流程

```text
数据采集 BDr / 专用生产者 / hooks
  → { type: 附件类型, ...各类字段 }
  → Zt：添加 uuid、timestamp，尝试保存 rendered / renderedRole
  → 内部会话中的 attachment 记录
  → 发模型请求前 resolveAttachments 调用 prompt.attachment
  → MDe / cLn：选择记录中的渲染内容、当前渲染器、mods 的改写结果
  → hT：合并到 user、tool_result，或聚合为 api_system
  → Jan / Xyr：整理历史并生成 API messages
```

- `BDr` 收集文件引用、IDE 状态、环境、工具目录变化、模式提示、诊断、任务和异步 hook 等来源；不同来源有自己的触发条件，并非每轮全部生成。
- `_Ze` 是附件默认渲染入口。它包含 88 个 `clr` 表项、22 个 `switch` 分支、3 个前置特殊类型，以及末尾 17 个兼容类型，共 130 个不同类型名。这个数字是该入口显式识别的类型数，不等于所有版本、所有生产者的完整协议集合。
- `xe({content, isMeta:true})` 创建内部 user 消息；`isMeta` 是客户端元数据。多数渲染器借助 `yl` / `Yl` 给文本加 `<system-reminder>` 包裹，图片等非文本块保持其类型。
- `zJ` 生成“Called the X tool with the following input: …”文本。`GJ` 调用工具的**结果格式化方法**，生成“Result of calling …”文本或图片内容块。这两步本身不执行工具，也不生成真实的 assistant `tool_use` / user `tool_result` 配对。
- `u7` 在附件生成时尝试保存 `rendered`，恢复历史时 `MDe` 可优先复用。部分类型或状态需要重新渲染，不能假定全部历史附件永远重新读取当前环境。
- `prompt.attachment` 接收渲染文本和类型、来源等信息，不是任意原始二进制的替换接口。其决定按附件 UUID 缓存。普通附件可被省略，但 `hT → cLn` 对部分功能性载体允许保留，不能把 `text:null` 理解为所有类型都必删。

## 2 文件 图片 PDF 和 IDE

| 类型 | 使用的数据与组装结果 |
|---|---|
| `file`，子类型 `text` | 使用 `filename` 和 Read 风格的 `content.file`。先生成 Read 调用说明，再调用 Read 的结果映射器生成正文及行号；`truncated` 为真时再追加截断提示。空文件、超出偏移有对应提示。 |
| `file`，子类型 `image` | Read 调用说明 + 原生 `image` 内容块。Read 映射器从 `file.base64`、`file.type` 生成 `source:{type:"base64",data,media_type}`；图片不会变成 JSON 字符串。 |
| `file`，子类型 `notebook` | Read 调用说明 + notebook 结果映射。`GJ` 对包含 image 的内容数组保留内容块；其余非字符串结果在这里序列化为文本。不能笼统视为原始 notebook 文件直传。 |
| `file`，子类型 `pdf` | 此分支**先把 `file.base64` 清空**，再调用 Read 结果映射器，因此只得到 PDF 路径、大小等读取说明，不携带 PDF 文档正文。实际 Read 工具的 pdf/parts 输出路径可以携带 document 或页面 image，这是另一条路径。 |
| `directory` | 用 `path` 生成 `ls` 命令的文字说明，用 `content` 作为 Bash 结果格式化器的 stdout；这里不再次执行 `ls`。 |
| `at_mention_reference` | 由 `mentions`、`unread`、`fileSize` 生成“用户引用了这些路径，但未附正文”的说明。区分太大、未能检查、当前会话不自动附加三种原因。 |
| `compact_file_reference` | 只有 `filename` 和“压缩前读过，正文未保留”的提示，建议需要时重新 Read。 |
| `pdf_reference` | 由路径、页数、大小、`readableWhole`、`stillArriving`、`wholeRefusedByModel` 选择提示：整份可读、尚在下载、应分页读取或模型不支持整份 PDF。不会附文档正文。 |
| `edited_text_file` | `filename` + `snippet`。有 snippet 时包含带行号的变化；没有时仅说明文件已变化、需要时重新读取。 |
| `selected_lines_in_ide` | 文件路径、起止行号、经过格式化的选中文本，以及与当前任务可能无关的说明。 |
| `selected_lines_in_diff` | diff 路径（可选）、选中行数、格式化的选中内容。 |
| `opened_file_in_ide` | 仅说明 IDE 打开了哪个文件，不自动包括全文。 |
| `inlined_image_paths` | 按显示顺序列出已附图片的落盘路径，说明模型已经看到图片，不必只为看图再读文件。没有图片字节。 |
| `read_truncation_notice` | 渲染已有的 `banner`。正文截断本身由更早的读取步骤决定。 |
| `artifact_opening_prefetch` | 非空 `content` 经文本处理后发送；不是这里再次打开 artifact。 |
| `mcp_resource` | 遍历 `content.contents`：文本生成“完整资源内容”提示、资源文本及无需重复读取的说明；blob 仅生成 MIME 类型占位文字，不把二进制展开成图片或文件。空资源和不可显示资源各有提示。 |

直接粘贴或 SDK 输入的 `image` 不必经过内部 `file` attachment：输入处理器会先处理 base64、按模型限制缩放或重新编码，并可能添加图片来源、尺寸及坐标换算文字，然后把图片放入 user 的 content。不要把这条路径和上表的文件附件混为一谈。

## 3 环境 系统指令与会话上下文

| 类型 | 组装规则 |
|---|---|
| `environment` | 验证 `snapshot`。首次通过 `Wat → pUn` 生成完整环境：主目录、git/worktree 状态、额外目录、平台、shell、OS、scratchpad、GitHub CLI 等条件字段；存在 `changes` 时由 `qat` 仅说明对应变化，如目录迁移、额外目录增删、scratchpad 或 GitHub CLI 状态变化。 |
| `model` | 验证 `identity`；合法的 `text` 覆盖默认文本，否则组合营销名、精确 model ID、可选知识截止日期。 |
| `instructions` | 使用 `files` 的路径、类型、正文。首次添加指令文件前言及各文件内容；`changed` 时输出更新文件替代旧副本的说明及 `removed` 列表，可附重新读取原因。AutoMem 的正文有额外处理。 |
| `nested_memory` | `Contents of <path>:` 加该目录指令/记忆文件正文。不要仅凭类型名把它解释为账号长期记忆。 |
| `date` | 首次输出当前日期；`changed` 为真时输出日期更新说明。 |
| `date_change` | 使用 `newDate` 生成日期变化说明。 |
| `session_context` | 验证后按固定键 `userEmail`、`attachedProject`、`gitStatus`、`perforceMode` 生成标题和内容。变化时明确替换早前值；变为空时可以明确宣布旧值不再适用。 |
| `context_sections` | 对 `sections` 依次生成 `# name` + `text`，最后添加这是自动附加上下文的说明。 |
| `coordinator_context` | 仅对应模式启用时发送。包含 worker 工具上下文；变化时说明替换旧列表，变为空时说明旧列表失效。 |
| `prefix_delta` | 直接包装已有 `text`，非字符串则不生成内容。 |
| `thread_state` | `sinceUser` + 非负整数 `repliesSinceUser`，说明用户最后发言时间及随后 assistant 回复次数。 |
| `remote_session_change` | 组合 commit/PR 署名规则变化及可选的跨设备发文件提示，不是完整远端历史。 |
| `fork_briefing` | 非空 `text` 经处理后附加，空值不发。 |
| `dir_sync_notice` | 对目录同步相关 `content` 格式化后附加。 |
| `sandbox_instructions` | 使用 `content`；空字符串时使用内置默认说明；非字符串不发。 |
| `language` | 语言偏好提示；null 表示清除偏好、跟随用户语言。 |
| `output_style_instructions` | 风格名 + 完整 prompt；null 时声明恢复默认风格。 |
| `output_style` | 每轮较短的风格提醒，使用 `style` 与可选 `turnReminder`；空名或过长名称被省略。 |

## 4 工具目录与能力变化

| 类型 | 组装规则 |
|---|---|
| `deferred_tools_delta` | 综合 added/removed/readded/restored/replaced/surfaced 名称及说明行，生成新增、恢复、撤销、重新加载等消息；已 surfaced 的条目避免重复文字声明。另包含 MCP 待连接、失败、需认证、被组织策略禁用等不同提示。 |
| `tool_search_usage_reminder` | 未发现工具的部分名称 + 剩余数量，提示先通过 ToolSearch 加载定义。没有名称则不发。 |
| `agent_listing_delta` | 首次/新增 agent 类型说明行，移除列表，以及条件性的并行调用提示。无变化不发。 |
| `mcp_instructions_delta` | 新增服务的说明块与断开服务的名称，明确旧说明何时失效。 |
| `mcp_dropped_tools_delta` | 列出因输入 schema 不可接受而被排除的 MCP 工具及原因，附自动上下文说明。 |
| `tool_hosts_notice` | 非空 `lines` 逐行拼接，附自动上下文说明。 |
| `tool_hosts_correction` | 非空 `lines` 逐行拼接。 |
| `advisor_tool` | 根据 `available`、`abbreviated` 选择 advisor 能力的提示。 |

`deferred_tools_delta` 不总是“只有一段提示词”。在会话中 system 消息和相应 tool-change/inline-definition 能力启用时，`hT` 还会从此记录提取工具新增、移除及定义，附到内部 `api_system` 载体。文字渲染、结构化工具变化和顶层 `tools` 是相互配合的路径。

## 5 Skill 命令与引用

| 类型 | 组装规则 |
|---|---|
| `agent_mention` | 将 `agentType` 包装为用户希望调用该 agent 的提示。 |
| `peer_mention` | 已确定时包含准确 session token 和位置；有歧义时列出候选及剩余数量，并提示先确认目标。不在渲染时发送消息。 |
| `skill_mention` | 包含 `skillName`，区分用户要求执行与仅提及的情况。 |
| `skill_listing` | 非空 `content` 前加可用 Skill 列表标题。 |
| `dynamic_skill` | 校验发现目录的范围、相对路径、skill 名称，输出新发现的目录及名称列表。 |
| `invoked_skills` | 压缩后恢复早前调用过的 skill：逐项拼 name、path、content，并声明这是早前执行的上下文，不应重新执行一次性动作。 |
| `unknown_command_fallback` | 未知命令名、建议命令、可用命令及额外数量，明确命令没有运行，当前输入作为普通请求处理。 |

## 6 记忆 任务和异步消息

| 类型 | 组装规则 |
|---|---|
| `relevant_memories` | 每条 memory 用已有 header 或由路径/mtime 生成 header，再加正文，经 memory 文本处理器包装。第一条有相关性说明，可按开关加入引用格式要求。 |
| `cowork_memory_context` | 有 `anchor` 时本渲染器不再输出；正常值输出记忆快照；null 时说明早前快照被移除，`toolsOnly` 决定提示是否同时覆盖早前工具结果。 |
| `account_memory_recall` | `content` 经 memory 文本处理器包装。 |
| `memory_update` | `sync_unsaved` 直接包装 summary；其他来源组合更新来源、summary、变化路径、当前上下文中已过时的路径。 |
| `todo_reminder` | 在适用开关下，生成状态 + 内容的编号清单及 TodoWrite 提醒。 |
| `task_reminder` | 在 task 工具启用时，生成任务 ID、状态、subject 清单及维护提示。 |
| `task_status` | 按 stopped/running/其他状态分支：停止原因，后台 shell/monitor/agent 状态，进度摘要、输出文件路径、可否继续联系等。 |
| `teammate_mailbox` | 团队模式启用时交给团队消息格式化器，使用 `messages` 和 `recipientIsLead`；未启用则空。 |
| `team_context` | 团队模式启用时，组合自己的名称、团队配置路径、可选任务清单路径和队长信息。 |
| `poll_events` | 没有 `deliveredVia` 时，组合事件 envelopes、来源摘要和剩余唤醒数量；有 media 时生成 text + 媒体块。有 userRoleGuard 时用另一格式化器。已交付事件在此不重复渲染。 |
| `queued_command` | 根据来源、是否用户回合、是否批量转发选择包装。普通数组 prompt 分离文字和 image，文字合并后附图片；可追加已落盘图片路径。批处理头已经渲染的记录返回空。 |
| `diagnostics` | 先过滤/整理 files，再生成诊断文本；无有效项目则空。 |

`poll_events`、部分 queued task delivery 在 `hT` 中有专门分支，可能被放入已有工具结果或构造合成工具回合。不能仅凭 `_Ze` 的默认渲染结果断言它们最终一定是普通 user 文本。

## 7 模式与执行提醒

| 类型 | 组装规则 |
|---|---|
| `plan_mode` | `Jqr` 选择 subagent、sparse、full 三种模板。使用计划路径、是否已有计划、自定义 workflow，以及可选 workshop/prototype 信息。 |
| `plan_mode_reentry` | 重新进入计划模式的提示、已有计划路径、如何判断沿用或重写计划。 |
| `plan_file_reference` | 计划路径 + `planContent` 全文 + 条件性的继续工作提示。 |
| `plan_mode_exit` | 已退出计划模式及可选计划文件位置。 |
| `auto_mode` | 依 `bypass`、`steerOnly`、`autoModeConsentFlow`、`bashFirst`、`bashFirstSteer` 拼不同版本的自动模式说明。 |
| `auto_mode_exit` | 退出说明；可按标记添加恢复专用文件工具的提示。 |
| `proactivity` | withdrawn 时生成撤回提示；否则校验 level/tools 后生成对应级别的主动工作说明。 |
| `ultrathink_effort` | 固定的深度推理请求提醒。 |
| `workflow_keyword_request` | 固定的 workflow 请求提醒。 |
| `ultra_effort_enter` | full/sparse 两种 ultra 工作模式提示。 |
| `ultra_effort_exit` | 模式关闭提示。 |
| `workflow_size_guideline_change` | 将 `size` 交给专用模板函数。 |
| `critical_system_reminder` | 原有 `content` 直接加 system-reminder 包裹。 |
| `bash_output_audience_note` | 固定提示，解释用户未必能看到完整命令输出。 |

## 8 用量和时间

| 类型 | 组装规则 |
|---|---|
| `token_usage` | `used / total / remaining` 拼 token 余额。 |
| `budget_usd` | 同样三个字段拼美元预算。 |
| `output_token_usage` | 当前回合用量、可选回合预算、会话用量。 |
| `total_tokens_reminder`、`silent_turn_reminder`、`elapsed_time_reminder`、`batching_reminder`、`secondary_reminder` | 渲染器只包装已有 `text`，具体数字或策略已经由生产者计算，不在这里重新计算。 |

`batching_reminder_sent` / `secondary_reminder_sent` 的默认渲染器虽为空，`hT` 在 kept-reminder、system-turn 等条件成立时会读取其中 `text`、`clearAt`，恢复相应提醒。这是“渲染器为空不等于整条记录毫无影响”的具体例子。

## 9 Hooks

| 类型 | 组装规则 |
|---|---|
| `hook_additional_context` | 非空 content 数组以换行拼接，前加 `<hookName> hook additional context:`，经 `TE` 处理，再包 system-reminder。prompt.submit、tool.call 和配置 hooks 可以共用这种记录形状。 |
| `hook_blocking_error` | hookName + command + blockingError 文本，经相同处理和包裹。 |
| `hook_stopped_continuation` | hookName + stopped continuation 提示 + message。停止行为由控制流处理，这里只描述上下文渲染。 |
| `hook_success` | 仅 SessionStart、UserPromptSubmit、UserPromptExpansion 的非空 content 输出成功信息；其他 hookEvent 返回空。 |
| `async_hook_response` | 分别取 response.systemMessage 和 response.hookSpecificOutput.additionalContext，过滤非字符串/空值、经 TE 处理后各自包装。 |

例如原版 prompt.submit 的 context `['A','B']` 通常先渲染为：

```text
<system-reminder>
prompt.submit hook additional context: A
B
</system-reminder>
```

这段文本随后仍受 `prompt.attachment` 和 `hT` 的位置归一化影响。它不是直接替换顶层 system prompt。

## 10 不在默认附件渲染器中生成内容的类型

下面 28 类显式返回空数组；它们可能用于状态、持久化、其他预处理或专门的 hT 分支，不能等同于“功能不存在”：

`withheld_memory`、`prompt_snapshot`、`prompt_render_point`、`thinking_stripped`、`advisor_stripped`、`thinking_drop`、`credential_org`、`deferred_tools_record`、`tool_host_result_lines`、`already_read_file`、`async_hook_response_batch`、`batching_reminder_sent`、`secondary_reminder_sent`、`command_permissions`、`edited_image_file`、`hook_cancelled`、`hook_error_during_execution`、`hook_non_blocking_error`、`hook_system_message`、`hook_permission_decision`、`hook_deferred_tool`、`goal_status`、`session_cron_carry`、`structured_output`、`max_turns_reached`、`teammate_shutdown_batch`、`attention_budget`、`context_efficiency`。

末尾还有 17 类兼容记录直接返回 undefined，默认不渲染：

`autocheckpointing`、`background_task_status`、`todo`、`task_progress`、`ultramemory`、`compaction_reminder`、`current_session_memory`、`thinking_reminder`、`companion_intro`、`pen_mode_enter`、`pen_mode_exit`、`ultrawork_request`、`echo_activities`、`verify_plan_reminder`、`fold_nudge`、`context_tip`、`audio_transcript`。

这些结论针对当前默认渲染入口。历史记录自带的合法 rendered 内容、前置预处理及其他执行路径应单独判断；遇到未知类型，当前代码记录 normalizeAttachmentForAPI 诊断，并返回未定义的默认渲染结果。

## 11 最终角色与摆放位置

默认渲染阶段多数先创建 `isMeta:true` 的 user 记录。`VDn` 把以下类型归为应保持 user 侧的上下文：

- `dir_sync_notice`、`unknown_command_fallback`、`session_context`、`instructions`、`coordinator_context`、`context_sections`、`remote_session_change`、`fork_briefing`、`poll_events`、`cowork_memory_context`、`account_memory_recall`、`artifact_opening_prefetch`。
- `relevant_memories` 取决于对应开关；`queued_command` 等还按来源和其他谓词判断。

其他类型可以被视作 system 候选，但只有满足 `hT` 的类型、记录角色、内容可提取性和模型 mid-conversation-system 能力条件，才会聚合为 `api_system`。包含媒体的内容不应简单按纯文本系统提醒处理。

不走会话中 system 路径时，附件可合并到相邻 user；紧邻工具结果的附件还可能经 `_Dn → lLn` 折叠到 `tool_result.content`，并有提醒类别和结果类型的例外。因此没有一张仅以附件 type 为键、对所有模型和回合都固定的最终 role 表。

## 12 后续修改需要区分的入口

- 改“采集哪些附件”：检查 `BDr` 及产生该类型的专门逻辑。
- 改“某类附件默认长什么样”：检查 `clr[type]`、`_Ze` 分支及其辅助模板。
- 让 mods 改附件文字：检查 `prompt.attachment`、UUID 缓存和 `cLn` 的保留条件；该接口不是完整多模态消息重写器。
- 改“附件合并到哪里”：检查 `VDn`、`hT`、`_Dn/lLn` 及后续 API 序列化。
- 改“历史恢复后是否复用旧文字”：检查 `Zt/u7` 保存的 rendered 字段以及 `MDe` 的复用条件。

本轮只增加分析资料，没有改变 CLI、mods 或网关执行行为。
