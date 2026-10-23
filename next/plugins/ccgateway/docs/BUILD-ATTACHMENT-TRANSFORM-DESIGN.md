# build 模式的附件提取与转换研究

> 2026-10-24：第 8 节的实现（Worker 在 `claude request --build` 前提取上下文、用本机事实改写平台/系统版本，即 v1 路径）已随 native 清理删除（CONTRACTS §53.21）。现在 Worker 把客户端的块原样交给 CLI，十个环境字段由 CLI 用原生渲染转换，见 [build 组件设计](BUILD-REQUEST-COMPONENTS-DESIGN.md) 第 5 节。第 1–3 节的附件清点仍可作参考。

2026-10-20。第 1–7 节保留调查阶段的证据与设计，第 8 节记录随后完成的实际实现。业务接入、插件设置和测试已完成本地修改，未部署；实际配置以第 8 节为准。

目标：客户端发送完整 Messages 请求，Worker 在 `claude request --build` 前提取上下文，按配置混合信息来源。例如平台和 OS 使用 Worker，cwd、Git 和项目指令使用客户端。继续保持一次客户端请求触发一次模型生成，工具调用交回客户端。

## 1. 附件有多少种

检查官方 Linux x64/glibc **2.1.302** 的还原模块 `chunk-8242685m.js`，默认渲染入口 `xct` 显式识别 **131 个不同类型名**：

| 入口 | 数量 | 含义 |
|---|---:|---|
| `awr` 分发表 | 89 | 按类型调用渲染函数，其中 26 项无条件返回空数组 |
| `switch(e.type)` | 22 | 文件、任务、工具目录等复杂渲染 |
| 前置特殊分支 | 3 | `teammate_mailbox`、`team_context`、`proactivity`，受条件控制 |
| 尾部兼容忽略列表 | 17 | 接受类型名，但此入口不产生消息 |
| 合计 | **131** | 不能解释成每次请求发送 131 个附件 |

因此有 43 项在此入口不直接产生正文，剩余 88 项也可能因内容为空、模式或功能开关而不输出。无正文不等于内部记录没有用途。相较已存档的 2.1.296 清单，新增 `output_limit_note`，没有删除类型。

这是**指定版本渲染入口的完整枚举**，不是所有版本、平台和生产者的永久协议全集。内部类型、实际发送块数量、可配置的语义字段数量，是三种不同口径。

完整的 131 项名称、分支、行号和字符偏移见 [attachment-inventory.json](cli-research/2.1.302/attachment-inventory.json)。[复现脚本](cli-research/2.1.302/inspect-attachments.cjs) 使用已有 Babel parser 做 AST 分析，不执行目标代码；先验证源模块 SHA-256：

```text
91c62b6b31e5c5cb52418ee9007dbcbdc26bacc5346fdf65f241b70a5fb4f6c8
```

### 1.1 可能产生正文的 88 项

以下分组仅为阅读方便；类型名来自 AST 枚举。

| 类别 | 类型 |
|---|---|
| 环境、身份、上下文与风格 | `environment`、`model`、`date`、`date_change`、`session_context`、`context_sections`、`coordinator_context`、`instructions`、`nested_memory`、`prefix_delta`、`thread_state`、`remote_session_change`、`fork_briefing`、`dir_sync_notice`、`sandbox_instructions`、`language`、`output_style`、`output_style_instructions` |
| 文件、IDE 与资源 | `file`、`directory`、`edited_text_file`、`at_mention_reference`、`compact_file_reference`、`pdf_reference`、`selected_lines_in_ide`、`selected_lines_in_diff`、`opened_file_in_ide`、`inlined_image_paths`、`read_truncation_notice`、`artifact_opening_prefetch`、`mcp_resource`、`diagnostics` |
| 工具、Agent、Skill 与命令 | `deferred_tools_delta`、`agent_listing_delta`、`mcp_instructions_delta`、`mcp_dropped_tools_delta`、`tool_search_usage_reminder`、`tool_hosts_notice`、`tool_hosts_correction`、`advisor_tool`、`agent_mention`、`peer_mention`、`skill_mention`、`skill_listing`、`dynamic_skill`、`invoked_skills`、`unknown_command_fallback` |
| 任务、团队、队列与 Hook | `poll_events`、`queued_command`、`task_status`、`todo_reminder`、`task_reminder`、`team_context`、`teammate_mailbox`、`async_hook_response`、`hook_success`、`hook_blocking_error`、`hook_additional_context`、`hook_stopped_continuation` |
| 模式与工作流 | `plan_file_reference`、`plan_mode`、`plan_mode_reentry`、`plan_mode_exit`、`auto_mode`、`auto_mode_exit`、`proactivity`、`ultra_effort_enter`、`ultra_effort_exit`、`ultrathink_effort`、`workflow_keyword_request`、`workflow_size_guideline_change` |
| 预算与提醒 | `critical_system_reminder`、`token_usage`、`total_tokens_reminder`、`output_limit_note`、`silent_turn_reminder`、`elapsed_time_reminder`、`batching_reminder`、`secondary_reminder`、`budget_usd`、`output_token_usage`、`attention_budget`、`context_efficiency`、`bash_output_audience_note` |
| 记忆 | `relevant_memories`、`cowork_memory_context`、`account_memory_recall`、`memory_update` |

### 1.2 不直接产生正文的 43 项

分发表中 26 项：`withheld_memory`、`prompt_snapshot`、`prompt_render_point`、`thinking_stripped`、`advisor_stripped`、`thinking_drop`、`credential_org`、`deferred_tools_record`、`tool_host_result_lines`、`already_read_file`、`async_hook_response_batch`、`batching_reminder_sent`、`secondary_reminder_sent`、`command_permissions`、`edited_image_file`、`hook_cancelled`、`hook_error_during_execution`、`hook_non_blocking_error`、`hook_system_message`、`hook_permission_decision`、`hook_deferred_tool`、`goal_status`、`session_cron_carry`、`structured_output`、`max_turns_reached`、`teammate_shutdown_batch`。

兼容忽略的 17 项：`autocheckpointing`、`background_task_status`、`todo`、`task_progress`、`ultramemory`、`compaction_reminder`、`current_session_memory`、`thinking_reminder`、`companion_intro`、`pen_mode_enter`、`pen_mode_exit`、`ultrawork_request`、`echo_activities`、`verify_plan_reminder`、`fold_nudge`、`context_tip`、`audio_transcript`。

## 2. HTTP 请求还能提取到什么

客户端内部基本路径：

```text
生产者收集结构化事实
  → attachment（type、snapshot/context/files 等）
  → en / Vte 保存渲染快照
  → $Fe / xct 选择已记录或重新生成的渲染
  → _A / gRn / TYr 合并与序列化
  → Messages HTTP body
```

普通 HTTP 请求没有统一的顶层 `attachments` 数组，也不保证保留 `attachment.type`、UUID、`snapshot`、`changes`、`isMeta`。不能从渲染文本完整逆推出全部原始对象。

需要区分的载体：

| 载体 | 提取方式与边界 |
|---|---|
| 顶层 `system` 字符串或 text 块 | 按已验证的上下文段落识别；保留块顺序和 `cache_control`。不能把所有 system 提示都当附件。 |
| `messages[].role == system` | 保留整个消息；只分析 text 块，保留 `clear_at`、`output_config`、`tool_addition`、`tool_removal` 等功能字段。 |
| user text 中的 `<system-reminder>` | 平衡标签定位原始范围，再按版本模板识别内部语义。标签本身不证明附件类型，也不证明内容来源可信。 |
| `tool_result.content` 中的 text | 当前 build 会提取 reminder 并原位恢复；转换阶段默认保持原文，因为它也可能只是文件或命令输出中的引用。 |
| image、document、工具调用参数、thinking 等 | 保持原始结构，不扫描二进制、签名、工具 JSON 或任意字符串做全文替换。 |

建议提取记录至少保存 `carrier`、消息/块位置、原始文本范围、识别的语义字段、原始片段、识别规则版本、是否歧义。完整原附件类型未知时应明确标为未知。Go 文本范围为 UTF-8 字节位置；源码库存中的 AST 位置为 UTF-16 字符偏移，两者不能混用。

**实测样本：** 本轮用本地官方 Windows CLI 2.1.302，在独立合成 Git 项目中请求回环 mock；客户端正常退出，只有 1 次模型 POST，没有真实上游生成。该请求第一条 user 消息含 6 个 reminder：环境、模型、Token 预算、项目 `CLAUDE.md`、Git 上下文、日期，随后才是用户问题。

环境显示 `Platform: win32`、`Shell: PowerShell`、Windows 版本和客户端工作目录；Git 上下文含分支、未提交修改、提交摘要。`CLAUDE.md` 是独立 instructions 渲染，不能只在旧式 `# claudeMd` 中寻找。原始样本没有附件类型字段，text 块只有 `type/text` 等 API 字段。

同一请求顶层 system 另有一个 `# Environment` 标题，内容是模型和产品说明，并非 OS/cwd。仅匹配标题会误改。环境识别至少要同时匹配 `You have been invoked in the following environment:` 与相应字段。

本地合成证据：`artifacts/attachment-probe-BMPwq4/{request-1.json,summary.json}`；探测脚本 `artifacts/probe-build-attachments.cjs`。此样本只验证首轮常见载体；不能据此宣称 131 类、多轮环境变化和所有 beta 均已动态验收。

## 3. 环境与 Git 的数据边界

2.1.302 的 `aNe` 环境 schema 包含：

```text
workingDirectory, isWorktree, isGitRepo, additionalWorkingDirectories,
platform, shell, osVersion, scratchpadDirectory, githubCli, agentProxy
```

`Ryt` 收集 Worker 原生环境快照，`xyt → pZn` 渲染完整块；`Oyt` 渲染变化。变化 schema `lNe` 的字段为工作目录、worktree、是否 Git、额外目录、scratchpad、GitHub CLI、agentProxy；不是完整快照的所有字段都有变化记录。

`session_context` 的固定键 `QMn` 是 `userEmail`、`attachedProject`、`gitStatus`、`perforceMode`。它有首次、变化、重新读取、清空旧值等不同文案。项目指令另由 `instructions` / `o_t` 渲染，且可包含更新和删除文件说明。

针对本次需求建议的来源：

| 字段/上下文 | 来源 | 理由 |
|---|---|---|
| 平台 `platform`、OS 版本 `osVersion` | **Worker** | 按用户要求使用实际 Worker 环境 |
| cwd、额外工作目录 | **客户端** | 客户端工具操作的是这些目录 |
| `isGitRepo`、worktree、`gitStatus`、项目/perforce 信息 | **客户端** | Worker 不能通过自己的仓库推断客户端仓库 |
| Shell | 默认客户端，独立可选 Worker | 工具由客户端执行；Windows 客户端仍可能需要 PowerShell 命令，不能随 OS 整组隐式改成 Bash |
| scratchpad、GitHub CLI、agentProxy 等能力 | 客户端 | 描述工具实际可访问的路径和能力，不应借 Worker 能力暗示客户端也具备 |
| CLAUDE.md、规则、IDE、文件、Skill、MCP、任务、Hook | 客户端 | 均属于客户端项目和执行状态 |
| 日期、模型身份 | 默认保留，后续可独立配置 | 不必为了 OS 替换改动无关内容；模型身份若替换应使用实际映射后的模型 |

cwd 使用客户端只改变发给模型的上下文；**不能据此对 Worker 执行 chdir、打开该路径或运行 Git**。客户端路径即使恰好在 Worker 存在，也不能自动转换成访问权限。

平台来自 Worker、路径与 Shell 来自客户端，是刻意混合的上下文，不再代表单一机器。UI 应分别标明来源；若后续实测影响工具命令选择，应增加明确的“工具执行环境”说明，而非把客户端 Shell 也静默替换。

## 4. 调查时的实现与缺口

当前 build 业务链路：

```text
Gateway.ServeHTTP
  → serveRequestCommand
  → messagesBuildComponents
  → extractSystemComponents
  → claude request --build
  → prepareBuildInput
  → buildRequest / XPt
  → 单次发送
```

- `engine/request_components.go` 已用位置引用提取 user reminder 和完整 role=system 消息，保留嵌套 tool_result、媒体、原始块属性；不会据此辨认 131 类原始类型。
- 顶层 system 目前作为 `systemPrompt` 保留，没有拆出环境语义字段。role=system 消息目前整条提取，没有进行内部语义解析。
- `cli-mods/request-input.js` 将普通 reminder 借 `hook_additional_context` 加已渲染快照送回原生渲染器。这是传输载体，不能声称识别到的真实原类型就是 Hook。
- CLI 组件接口另支持 `{afterMessage, role, attachment:{type,...}}`。它要求显式结构化输入；普通 HTTP 适配器不会自动还原原 attachment payload。
- 旧 `client_attachment_erase.go`、`environment_attachments.go`、`attachment_parts.go`、`gateway_attachments.go` 已有字段拆分、删除、Worker 渲染替换。它们通过 `exchange.admit → parsePolicyRequestWithGateway` 生效；当前 build/direct 在进入 `exchange` 前已经分流，所以**这套附件策略未接入当前 build 业务入口**。
- `RequestPolicy` 和前端 TypeScript 仍保存 `erase_client_attachments`、`replace_client_attachments`，但当前 `RequestPolicySettings.vue` 只显示模式和 CLI 版本，附件控件已经移除。保存旧字段不等于 build 中执行转换。

旧实现有可复用部分，但不能原样接入：它主要匹配旧渲染模板；环境字段没有细分 worktree、scratchpad 等；session 细分未覆盖完整 302 上下文；只改直接 text，不递归改 tool_result（这一点应保持保守）；Worker 渲染缺失曾可能被当作空正文删除。旧的 `parsePolicyRequestWithGateway` 还带其他请求过滤逻辑，不宜为了附件转换整体重新引入。

## 5. 建议的最小实现

在 `messagesBuildComponents` 的组件构造流程中加入独立的转换阶段，覆盖顶层 system、提取后的 system 消息和 reminder，完成转换后仍交给现有原生 builder。第一版仅支持明确识别的环境平台/OS 字段，保留其余内容。

1. **提取保留位置。** 复用现有引用与块结构；补充顶层 system 的语义扫描。普通用户文本、代码块、引用和 tool_result 默认不参与语义改写。重复字段、不完整模板、嵌套或未知结构保留原样并记录未匹配原因。
2. **准备 Worker 快照。** 使用固定 CLI 版本的环境收集/渲染能力，或只提取已验证的 Worker 环境渲染字段。优先给定制 CLI 增加仅采集/渲染上下文的内部入口，调用 `Ryt/xyt`，不运行 Agent 循环，不调用模型，不加载客户端目录。既有 `renderGatewayAttachments` 的回环渲染可作过渡，但不是每次请求启动一次普通 CC 的最终方案。
3. **按字段原位替换。** 复用环境行拆分，替换 `Platform:`、`OS Version:` 的值；保留客户端 cwd、Git、Shell、其他行、包裹、顺序和换行。不要整块删除 environment 再追加一块 Worker environment。
4. **保留未知和功能性结构。** 不为了“统一”把所有历史重新分类或重新渲染，不改变 `clear_at`、工具目录增删、工具 ID、图片/文档或 thinking 签名。若将来支持显式 typed attachment，也必须另外验证其 payload 和来源。
5. **不凭空补附件。** 默认仅替换已经识别到的字段；请求没有该字段则不插入。Worker 快照不可用与合法空字段必须分开处理；要求使用 Worker 而采集失败时给明确错误，不将客户端内容静默删除。未知客户端模板保持原文并留下跳过原因。
6. **稳定与可观察。** 缓存按实际 CLI/Worker 环境身份和配置 revision 隔离，避免每轮带临时时间、请求目录等变化。记录命中数、来源、位置、规则版本和前后摘要，不把完整 Git/指令正文放进普通审计日志。配置改变和 Worker 镜像改变会影响缓存前缀，应可定位。

解析的语义标签只是转换依据，不授予客户端指令更高权限。不能让入站请求自行选择管理策略；策略继续由认证后的平台下发。

## 6. 调查阶段的配置草案

复用已有 `request_policy`，在“CC 特性”下恢复一个只在 build 模式启用的“附件转换”设置组。无需把全部 131 类暴露成配置项；默认全部保留客户端内容，提供按字段选择“保留客户端 / 使用 Worker / 移除”的控件，只开放已实现的操作。

本次需求可以沿用现有字段表达，**以下是待接通后的目标配置，目前写入它不会让 build 自动执行替换**：

```json
{
  "request_policy": {
    "relay_mode": "build",
    "cli_version": "2.1.302",
    "replace_client_attachments": ["platform_name", "os_version"],
    "erase_client_attachments": []
  }
}
```

未列出的 cwd、Git、Shell、指令等保留客户端内容。若明确要 Shell 也采用 Worker，再加入 `"shell"`；不建议默认用 `"environment"` 或 `"platform"` 整组替换。删除能力与替换能力分开标注；不支持的删除规则不应作为可用选项展示。

旧的组/子项冲突校验和配置持久化可以复用。第一版按现有全局 CCGateway 配置生效；`WorkerRequestPolicy(accountID)` 目前返回全局策略，并没有账号独立覆盖。无此需求时不新增账号级表结构。

direct 模式保持完整 body 转发，UI 明确转换不生效。应在 Worker 能力中声明 build 附件转换支持，平台在应用规则前检查能力；否则旧 Worker 会继续忽略配置，造成“保存成功但没替换”。本次只列出接入设计，未新增该 capability。

## 7. 验证范围与后续验收

本轮已完成：源模块哈希验证、131 类 AST 清点、与 296 清单对比；官方 Windows 302 合成请求本地捕获；现有 Go 组件提取相关 5 个测试、JS 构建/输入相关 8 个测试通过。测试验证已有提取/恢复能力，不证明尚未实现的混合来源转换已经生效。

实施后的必要验收：

- Windows 客户端 → Linux Worker：只改变平台/OS，cwd、Shell、Git、CLAUDE.md、媒体和工具输入完全保留。
- 顶层 system、user reminder、role=system 及多轮目录变化；明确保留 system 生命周期和工具目录变更。
- 新旧 CLI 模板、CRLF、Unicode 路径、额外目录、worktree、缺失字段和未知字段。
- 引用/代码/工具结果中的同名文字不误改；未配置时保持内容；重复应用规则结果不变。
- 连续两轮工具往返，模型请求数仍由客户端请求决定；流式输出不等待整段完成。
- CLI/Worker 能力不匹配、快照采集失败和跨节点配置 revision 一致性。

## 8. 实际实现

入口是 **CCGateway 插件设置 → CC 特性 → 附件转换**。平台名称和系统版本分别选择“保留客户端 / 使用 Worker”，默认均保留客户端。保存走已有 `PUT /system/ccgateway/remote-config`，读取、加密持久化和每次请求下发沿用 `request_policy`；不是浏览器偏好，也不是账号级开关。

最终使用独立字段，避免升级后激活历史 native 模式留下的擦除/替换配置：

```json
{
  "request_policy": {
    "relay_mode": "build",
    "cli_version": "2.1.302",
    "build_attachment_sources": {
      "platform_name": "worker",
      "os_version": "worker"
    }
  }
}
```

缺少字段或值为 `client` 都保留客户端；只接受上述两个键以及 `client/worker` 值。工作目录、Git、Shell、文件和其余附件不变。暂不提供“擦除”，也不将旧 `erase_client_attachments/replace_client_attachments` 接入 build。

Worker 在 `serveRequestCommand` 的 build 组件构造前调用 `transformBuildAttachments`，仅修改已识别环境段的两行。完整 user 环境 reminder、顶层 system、role=system 的直接 text 块可参与；user 混合正文、代码围栏、指令附件中的引用、嵌套/不平衡标签、重复字段和未知模板保留。工具结果不递归改写，其他块字段、缓存标记和 system 生命周期保持。没有匹配或未启用转换时，这一阶段返回原字节。

这两项不需要重建完整 CLI 环境快照：平台来自 Worker 的 `runtime.GOOS`（Windows 映射为 `win32`）；Unix 系统版本来自本机 `uname -sr`，对应 302 原生环境使用的 `node:os.type() + os.release()`，Windows 开发环境使用 `cmd.exe /d /c ver`。OS 观测结果在 Worker 进程内缓存；读取失败返回明确 503，重启 Worker 后重新采集。无 CC 渲染探针、额外模型调用、客户端路径访问或 chdir，不需要修改 CLI 补丁。

build Worker 的 `/healthz` 声明 `capabilities: ["build_attachment_sources_v1"]`，`/admin/features` 的 build 目录增加 `F-BUILD-ATTACHMENTS`。启用 Worker 来源时，核心在发送模型正文前通过**同一账号路由**读取 `/healthz`，核对能力及 CLI 版本。旧 Worker、未知能力、版本不符或探测失败都阻止模型发送；不跨原地更新缓存能力，避免降级后静默忽略配置。这个额外请求仅为本地 Worker 能力查询，不是上游模型请求。

direct 模式不探测、不转换，配置保留但控件禁用，切回 build 后生效。账号连通性 probe 在业务配置为 direct 时仍走原生 build，但不启用这些附件规则。

诊断事件 `build_attachment_transform` 记录选择的来源、改变数量及各字段的位置和前后摘要，不记录新增的完整上下文正文。既有请求详情日志仍遵循其原有启用策略。

验证覆盖插件设置保存/重新加载、direct 禁用但保留选择、后端配置往返和 Worker 下发、旧 Worker 在发送前被拒绝、字段替换/CRLF/Unicode/未知格式/引用边界、媒体和工具历史不变、重复转换幂等。用调查阶段的官方客户端合成捕获作为输入执行 Worker HTTP → 实际子进程测试：两次客户端请求只启动两次 CLI peer，direct 正文逐字节不变；该 peer 模拟 CLI 传输，不是一次真实上游模型验收。
