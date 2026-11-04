# agents 子系统手册（Claude Code 2.1.316）

> 领域：`agents`（97 个重组模块，约 1,200 个顶层声明）。范围包括子代理与 fork、任务系统、团队/蜂群、协调者模式、SDK 控制协议、Remote Control（独立模式与 REPL 内桥）、远程会话查看、定时任务，以及若干挂在这个领域下的小模块（ultraplan、语音、后台维护等）。
>
> 依据：`original/` 中 2.1.316 的代码；名字取自门面原名（facade）、旧版 2.1.88 对照与本领域语义命名（`naming/semantic-agents.jsonl`）。引用格式 `重组路径 · 函数名`，声明 id 形如 `chunk-xxx.js#压缩名`。
>
> 注意：lead 在本手册写作期间重新切分过模块（门面强制归属等），少数声明的重组路径可能与下文不同；以声明 id 为准。

## 0. 总览

### 0.1 在整体中的位置

```
                     ┌──────────── 查询循环 query.ts / QueryEngine ────────────┐
用户输入 ─ REPL ──►  │ Agent 工具 ─► runAgent ─► 子查询循环（同进程）            │
                     │ TaskStop / SendMessage / TeamCreate / Cron* 工具        │
                     └──────┬─────────────────────┬────────────────────────────┘
                            │                     │
                tasks/*（任务注册表与通知）   utils/swarm/*（团队、mailbox、pane 后端）
                            │                     │
          ┌─────────────────┴───┐        ┌────────┴──────────┐
          │ 本地：LocalAgent/     │        │ 同进程 teammate    │
          │ LocalShell、Dream、…  │        │ tmux / iTerm2 pane │
          └─────────────────────┘        └───────────────────┘
SDK / 桌面端 / 网页 ◄── stream-json + control_request、control_response（entrypoints/sdk）──► cli/structuredIO.ts
claude.ai/code ◄── Remote Control（bridge/*：独立 environment 轮询 或 REPL 内 v2 桥）
```

- 被谁调用：工具层（`tools/AgentTool`、`tools/TaskStopTool`、`tools/SendMessageTool`、`tools/TeamCreateTool`、`tools/ScheduleCronTool`…）、REPL（后台任务面板、/remote-control）、CLI 入口（`claude remote-control`、`-p` 的 stream-json 模式）。
- 调用谁：查询循环（`query.ts` 的 `runQuery`）、权限系统（`canUseTool`、权限层）、会话存储（sidechain transcript、元数据）、GrowthBook、OAuth/认证、MCP 客户端。

### 0.2 模块地图

| 目录 / 模块 | 职责 |
|---|---|
| `reconstructed/src/Task.js`、`tasks.ts`、`tasks/types.ts`、`tasks/pillLabel.ts`、`tasks/stopTask.ts` | 任务公共定义：类型与 ID 前缀、状态基础对象、终态判断；任务实现注册表；后台任务胶囊文字；TaskStop 的实现 |
| `reconstructed/src/tasks/LocalAgentTask/LocalAgentTask.js` | 本地子代理任务：注册（前台/后台/恢复）、进度、自动转后台、完成/失败/被杀、task-notification |
| `reconstructed/src/tasks/LocalShellTask/*` | 后台 shell / Monitor 任务：前后台切换、卡住检测、结束通知、kill |
| `reconstructed/src/tasks/LocalMainSessionTask.js` | 主会话查询转后台（main-session） |
| `reconstructed/src/tasks/RemoteAgentTask/RemoteAgentTask.js` | 云会话任务（remote-agent / ultraplan / ultrareview / autofix-pr / remote-workflow）：注册、轮询、权限中继、恢复 |
| `reconstructed/src/tasks/InProcessTeammateTask/*` | 同进程 teammate 任务实现与查找 |
| `reconstructed/src/tasks/DreamTask/DreamTask.js` | autoDream 记忆整理任务 |
| `reconstructed/src/utils/forkedAgent.js` | fork 子代理基础设施：缓存安全参数、隔离的 ToolUseContext、`runForkedAgent` |
| `reconstructed/src/utils/agentContext.js` | 代理上下文判断（主线程/子代理/teammate、深度、后台）；混有若干无关 ALS 小封装 |
| `reconstructed/src/utils/teammate.js`、`teammateContext.ts`、`teammateMailbox.ts`、`inProcessTeammateHelpers.ts`、`agentSwarmsEnabled.ts` | teammate 身份、文件信箱协议、团队开关 |
| `reconstructed/src/utils/swarm/*` | 团队文件、权限同步、pane 后端（tmux/iTerm2/in-process）、同进程 teammate 运行循环、派生、重连 |
| `reconstructed/src/coordinator/coordinatorMode.js` | 协调者模式 |
| `reconstructed/src/entrypoints/sdk/controlSchemas.js`、`coreSchemas.ts`、`uiControlSchemas.ts` | SDK schema（写作时 316 真正的 zod schema 还在 `_unattributed/` 的 `chunk-bwbq4xvm`，place-rest 后已放入 `entrypoints/sdk/`；见第 5 章） |
| `reconstructed/src/bridge/*` | Remote Control：独立模式（environment 轮询）与 REPL 内 v2 桥 |
| `reconstructed/src/remote/*`、`server/*`、`assistant/sessionHistory.ts` | 查看/驱动远程会话、`claude server` 直连、远程事件分页 |
| `reconstructed/src/utils/cron*.js` | 定时任务（ScheduledTasks） |
| `reconstructed/src/utils/ultraplan/*` | ultraplan：轮询云会话里的 ExitPlanMode |
| `reconstructed/src/utils/background/remote/*` | 后台云会话前置条件 |
| `reconstructed/src/services/voice*.js`、`voice/voiceModeEnabled.ts` | 语音输入 |
| `reconstructed/src/utils/backgroundHousekeeping.js`、`agenticSessionSearch.ts` | 后台维护、跨会话检索 |
| `buddy/*`（2.1.88 路径；后续重切已把这些声明移走，阅读树无此目录） | **316 已删除伴侣精灵功能**，这些文件名下匹配到的都是无关代码（见 9.6） |

---

## 1. 子代理（Agent 工具）

Agent 工具本身在 tools 领域（`tools/AgentTool/*`，本领域只读引用）；本领域负责它依赖的任务、上下文与 fork 基础设施。

### 1.1 代理定义从哪里来

`tools/AgentTool/loadAgentsDir.ts · getActiveAgentsFromList` 合并所有来源，同名按以下顺序后者覆盖前者：

`built-in` → `plugin` → `userSettings`（~/.claude/agents）→ `projectSettings`（附加目录的先、再按路径排序）→ `flagSettings`（--agents）→ `policySettings`（托管）。

内置代理（`tools/AgentTool/loadAgentsDir.ts · getBuiltInAgents`（`chunk-e6aww6q8.js#lKe`））：

- 协调者模式下只返回协调者的 worker 代理（`getCoordinatorAgents`，见第 4 章）；`none` 时为空。
- 默认：`general-purpose`；按开关追加 Explore、Claude（`CLAUDE_AGENT`）、Plan 相关两个、verification、`claude-code-guide`（SDK 入口 `sdk-ts/sdk-py/sdk-cli` 不加）。
- 另有 fork 伪代理 `FORK_AGENT`（`tools/AgentTool/forkSubagent.ts`）：`agentType: fork`、`tools: ["*"]`、`maxTurns: 200`、`model: "inherit"`、`permissionMode: "bubble"`、系统提示词为空——只在 fork 开关打开且显式 `subagent_type: "fork"` 时使用。

自定义代理 markdown/JSON 的字段（`AgentJsonSchema`）：

| 字段 | 说明 |
|---|---|
| `description`（必填）、`prompt`（必填） | 何时使用、系统提示词正文 |
| `tools`、`disallowedTools` | 工具白名单 / 黑名单（支持 `Agent(type)` 形式限定可派生的代理类型） |
| `model` | 模型别名或 ID，`inherit` 表示继承父模型 |
| `effort` | effort 等级或整数 |
| `permissionMode` | 权限模式 |
| `mcpServers`、`hooks`、`skills` | 代理专属 MCP 服务器、钩子、预载 skill |
| `maxTurns`、`autoCompactWindow`、`initialPrompt`、`background`、`omitClaudeMd` | 回合上限、自动压缩窗口、首条提示、默认后台、不注入 CLAUDE.md |
| `memory` | `user` / `project` / `local` 代理记忆 |
| `isolation` | `worktree`（独立 git worktree） |
| `observer`、`observerMessage`、`observeSubagents` | 316 新增：观察者代理（只观察不改动，`isObserverAgentTask`） |

### 1.2 一次 Agent 调用的流程

```
tools/AgentTool/AgentTool.ts · AgentTool(agentInput…)
 ├─ 校验 subagent_type：权限规则 Agent(type) 拒绝 / allowedAgentTypes / 是否在本会话提供
 ├─ 选定代理定义（fork / 自定义 / general-purpose），处理 isolation（worktree / remote）
 ├─ 模型：utils/model/agent.ts · getAgentModel(agentModel, parentModel, toolModel, permissionMode)
 │     工具入参 model > 代理定义 model > CLAUDE_CODE_SUBAGENT_MODEL（缺省 inherit）；
 │     inherit → 父主循环模型；Bedrock 时补父模型的区域前缀；不可用时按家族降级并回调通知
 ├─ 工具：tools/AgentTool/agentToolUtils.ts · resolveAgentTools → filterToolsForAgent
 │     去掉不允许子代理用的工具；Agent 工具只在深度 < 最大深度时保留；
 │     plan 模式补 ExitPlanMode；异步子代理只保留异步可用工具（teammate 另有白名单）；
 │     再按 tools / disallowedTools 求交集，记录 invalid、unavailable
 ├─ 系统提示词：tools/AgentTool/runAgent.ts · getAgentSystemPrompt
 │     = 代理定义 getSystemPrompt（可带已加载的代理记忆）→ 加环境信息；失败用兜底提示词
 ├─ 同步 or 后台：
 │     后台（run_in_background / 代理 background / 宿主规则）→ tasks/LocalAgentTask/LocalAgentTask.ts · registerAsyncAgent（lfe）
 │     前台 → tasks/LocalAgentTask/LocalAgentTask.ts · registerAgentForeground（uXn），返回 backgroundSignal，
 │            autoBackgroundMs 到点自动转后台（见 2.5）
 └─ runAgent(...)（tools/AgentTool/runAgent.ts）：建子上下文、MCP、钩子，循环 runQuery，
       进度写入任务（updateProgressFromMessage / updateAgentProgressIfChanged）
       结束 → completeAgentTask / failAgentRun / killAsyncAgent → enqueueAgentNotification
```

最大派生深度：`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`，否则 GrowthBook `tengu_hazel_trellis`（默认 3），`getMaxSubagentSpawnDepth`（`chunk-k8xs47j2.js#OT`，`tools/AgentTool/spawnDepth.ts`）。深度来自 `utils/agentContext.ts · getAgentDepth`（主线程 0）。

### 1.3 子代理上下文（`createSubagentContext`）

`utils/forkedAgent.ts · createSubagentContext(parentContext, overrides)` 是所有子代理（含 fork、teammate 的部分路径）的 ToolUseContext 构造器：

| 字段 | 默认行为 |
|---|---|
| `abortController` | 父控制器的子控制器（`shareAbortController` 时共用） |
| `getAppState` | 包一层，强制 `toolPermissionContext.shouldAvoidPermissionPrompts` 为 true，并追加 `kind: "avoid_prompts"` 权限层（共享 abort 或自带 getAppState 时不加） |
| `setAppState` | 隔离：只允许回写父状态的 `frameUrls`（`shareSetAppState` 时共用） |
| `readFileState` | 克隆（`stripSeededFromContext`） |
| 文件历史 / denial tracking | 默认隔离（文件历史只转发 `touch` 操作） |
| `messageQueue`、`taskRegistry`、`queuedNotificationsRegistry`、`sessionHooksRegistry`、`credentials`、`storageV5`、MCP、浏览器、Artifact 注册表 | 共享 |
| `agentId` | 新生成；`queryTracking` 新 chainId、depth+1 |
| `options`（含工具集） | 默认继承；换工具集时若 refreshTools/refreshMcpClients 与父相同则清掉 |
| `agentContext` | 来自 overrides 或父 |

`utils/agentContext.ts` 里的上下文对象（`agentContext`）有三种 `agentType`：`main`、`subagent`（字段 `agentId`、`parentAgentId`、`depth`、`subagentName`、`isBuiltIn`、`isAsync`、`isMainSession`、`isBackgroundAgent`、`forkOfMainConversation`、`workflowRunId/workflowName`、`invokingRequestId/invocationKind/invocationEmitted`、`delegatedObservation`、`reapsShellsUnlessMoved`）、`teammate`（见第 3 章）。辅助判断：`getForegroundSubagentId`、`getBackgroundAgentId`、`isMainConversationContext`、`reapsShellsOnExit`、`getSubagentTelemetryFields`（遥测只报内置代理名，自定义一律 `user-defined`）、`consumeInvokingRequestId`。

### 1.4 fork 与上下文继承

fork 子代理"继承整个对话"：

- `utils/forkedAgent.ts · createCacheSafeParams(context)` 抽出系统提示词、user/system context、toolUseContext、父消息（`forkContextMessages`）、advisor 模型、sticky betas——这些与父请求一致，fork 的首个请求能命中父请求的提示缓存。
- `tools/AgentTool/forkSubagent.ts · buildForkedMessages(directive, assistantMessage, forkToolUseId)`：复制父 assistant 消息（换 uuid），给其中每个 tool_use 补 tool_result：发起 fork 的那个写"Fork started — that fork is you."，其余写"This is the parent's call…"，最后附上 fork 指令文本。worktree 隔离时再加 `buildWorktreeNotice`。
- `utils/forkedAgent.ts · runForkedAgent`（门面原名，外层维护活动 fork 计数）→ `runForkedAgentImpl`：
  1. `createSubagentContext`（默认 `isBackgroundAgent`、`memoryCaller: "worker"`、`requireCanUseTool`；指定 model 时加 `kind: "model"` 权限层）；
  2. 不声明 `ownPrefix` 时必须沿用父工具集（否则抛错，保证缓存前缀一致）；`toolCallRoutes` 只允许替换工具的 `call`；
  3. 初始消息 = 父消息 + promptMessages，记录 fork 点 uuid（`forkPointUuidOf`）；sticky betas 继承；
  4. 循环 `runQuery`，累计 usage、写 sidechain transcript（`skipTranscript` 时不写）；
  5. finally：杀掉该代理名下 shell 任务、清出它的排队消息、清空 readFileState；
  6. 记 `tengu_fork_agent_query`（缓存命中率等），默认回合上限超限时记 `tengu_forked_agent_default_turns_exceeded`。
- skill 的 `context: fork`：`utils/forkedAgent.ts · prepareForkedCommandContext` 负责校验 skill 可用、选基础代理、展开提示词、按 skill 的 allowed/disallowed tools 生成权限层与可用工具。

### 1.5 结果回传：task-notification

子代理结束时由 `tasks/LocalAgentTask/LocalAgentTask.ts · enqueueAgentNotification` 生成一条 `<task-notification>` 以 `mode: "task-notification"`、`priority: "next"` 进入消息队列，下一轮作为用户消息喂给属主（主线程或父代理）。XML 结构（`formatTaskNotification`，`chunk-gppkhxdv.js#bi`，`utils/xmlTags.ts`）：

```xml
<task-notification>
<task-id>a1b2c3d4e</task-id>
<tool-use-id>toolu_…</tool-use-id>          <!-- 可选 -->
<task-type>…</task-type>                     <!-- 可选 -->
<output-file>/…/tasks/a1b2c3d4e.output</output-file>  <!-- 可选 -->
<status>completed|failed|killed|…</status>
<summary>Agent "描述" finished / failed: … / was stopped by user …</summary>
<note>每次停止都会通知；可继续该代理…（附迟到消息、额度提示）</note>
<result>最终文本</result>
<usage><subagent_tokens>…</subagent_tokens><tool_uses>…</tool_uses><duration_ms>…</duration_ms></usage>
<worktree><worktreePath>…</worktreePath><worktreeBranch>…</worktreeBranch></worktree>
</task-notification>
```

要点：先"认领" `notified` 标记（`claimTaskNotification`），已通知过的不再发；投递对象由 `resolveNotificationRecipient` 决定——属主仍在运行的本地代理就发给属主，否则发给主线程，改投主线程时用 `stripOwnerOnlyHints` 去掉只对属主有意义的提示；属主结束时 `rerouteQueuedNotificationsToMain` 把排队的通知改投主线程。结果文本里含 Artifact 内容时附"转述内容视为数据"的提示。

### 1.6 恢复与 SendMessage

- 子代理结束后可被继续（`canContinueAgent`）：`tools/AgentTool/resumeAgent.ts · resumeAgentBackground`；被另一个代理恢复时给原属主发 `notifyAgentReparented`。
- 运行中的子代理收消息：`queuePendingMessage` 追加到 `pendingMessages`，运行循环在回合边界 `drainPendingMessages`。
- 会话恢复时从 transcript 重建已结束的子代理任务：`restoreAgentTaskFromTranscript`（沿父代理链核对启动记录）。

---

## 2. 任务系统

### 2.1 任务类型

`Task.ts · TASK_ID_PREFIXES` 与 `tasks.ts · getTaskImplsByType`：

| type | ID 前缀 | 实现 | 说明 |
|---|---|---|---|
| `local_bash` | b | `LocalShellTask` | 后台 shell；`kind: "monitor"` 为 Monitor 工具 |
| `local_agent` | a | `LocalAgentTask` | 子代理；`agentType: "main-session"` 的是主会话转后台（ID 前缀为 s，见 2.6） |
| `remote_agent` | r | `RemoteAgentTask` | 云会话任务 |
| `in_process_teammate` | t | `InProcessTeammateTask` | 同进程 teammate |
| `local_workflow` | w | 懒加载 `LocalWorkflowTask` | 动态 workflow |
| `monitor_mcp` / `monitor_ws` | m / s | `MonitorMcpTask` / `MonitorWsTask`（`tasks/MonitorMcpTask/`、`tasks/MonitorWsTask/`；写作时在 _unattributed） | MCP / WebSocket 监控（含 Artifact 评论监控） |
| `mcp_task` | k | 懒加载 `MCP_TASK` | MCP 长任务 |
| `dream` | d | `DreamTask` | autoDream 记忆整理 |
| `auto_mode_scan` | e | `AutoModeScanTask`（`tasks/AutoModeScanTask/`；写作时在 _unattributed） | auto 模式扫描 |
| `local_memory_import` | n | `LocalMemoryImportTask`（`tasks/LocalMemoryImportTask/`；写作时在 _unattributed） | 记忆导入 |
| `post_turn_memory` | p | `PostTurnMemoryTask`（`tasks/PostTurnMemoryTask/`；写作时在 _unattributed） | 轮后保存记忆 |

ID = 前缀 + 8 位 36 进制随机字符（`generateTaskId`，crypto.randomBytes）。旧版 2.1.88 只有 local_bash/local_agent/remote_agent/in_process_teammate/local_workflow/monitor_mcp/dream 七种。

任务实现对象只有 `{name, type, kill(taskId, taskRegistry, setAppState, killedBy, storageV5, source)}`。

### 2.2 公共字段与状态机

`Task.ts · createTaskStateBase(id, type, description, toolUseId)`：`{id, type, status: "pending", description, toolUseId, startTime, outputFile?（非远程模式）, outputOffset: 0, notified: false}`。各类型扩展字段（从注册函数读出）：

- local_agent：`agentId, ownerAgentId, parentAgentId, spawnDepth, prompt, model, effort, cwd, selectedAgent, agentType, abortController, spawnedSubagent, isBackgrounded, isObserver, forkedSkillName, forkWorker, isIdle, pendingMessages, retain, diskLoaded, keepaliveReasons(Set), progress, result, terminal, evictAfter, quietlyParked, waitingNoticeRecipient, autoBackgroundArmed, directCall, launchedWithDefaults, launchModel, awaitedByCaller/MainTurn, ownerCanContinueAgents, webFetchSavedFiles, outputFileUnreadable`
- local_bash：`command, shell, cwd, shellCommand, lastReportedTotalLines, isBackgrounded, agentId, caller(turn|agent), kind, isAdopted, autoBackgroundArmed, backgroundedToDeliverMessage, result{code, interrupted}`
- remote_agent：`remoteTaskType, sessionId, command, title, todoList, isRemoteReview, postReviewTo, applyFixesOnComplete, reviewInstructions, isUltraplan, ultraplanPhase, isLongRunning, pollStartedAt, restoredOnResume, remoteTaskMetadata, reviewProgress`
- in_process_teammate：`identity{agentId, agentName, teamName, color, planModeRequired, parentSessionId, resumableAgentId}, prompt, model, abortController, currentWorkAbortController, awaitingPlanApproval, permissionMode, isIdle, idleNotificationOwedToLead, pendingUserMessages, onIdleCallbacks, paneTeardown`
- dream：`phase(starting|updating), sessionsReviewing, filesTouched, turns(≤30), priorMtime, skipTranscript`

状态：`pending → running → completed | failed | killed`，另有 `paused`（远程）。终态判断 `isTerminalTaskStatus`。各转换点：

| 转换 | 函数 |
|---|---|
| → running | 各 register* 直接以 running 注册 |
| running → completed | `completeAgentTask`、`completeMainSessionTask`、`backgroundTask`（shell 结束）、`completeDreamTask`、远程轮询判定、teammate 循环正常退出 |
| running → failed | `failAgentRun`、`failAgentTask`、`notifyRemoteReviewFailed` 等 |
| running → killed | `killAsyncAgent`、`killTask`（shell）、`RemoteAgentTask.kill`、`DreamTask.kill`、`killInProcessTeammate` |

已结束的任务不会立刻删除：`computeEvictAfter` 设置 `evictAfter`（AP 毫秒后回收），有保活原因（`keepaliveReasons`：`agent:<id>`、`bash:<id>`、`workflow:<id>`、空闲窗口）时保留。

### 2.3 停止任务（TaskStop）

`tasks/stopTask.ts · stopTask(taskId, context)`：

1. 先按 ID 找，找不到时按名字/前缀模糊解析：ambiguous → `StopTaskError(…, "ambiguous")`，找不到 → `not_found`（附建议）。
2. 观察者代理不能停自己（`not_owner`）；非属主代理不能停别人的任务（`agentIdMatches` 属主判断）。
3. "已结束但循环还没退出"的 workflow/代理：重新中止并杀掉进程组，返回带 note 的结果。
4. 不在运行 → `not_running`；未知类型 → `unsupported_type`。
5. 调用任务实现的 `kill`；local_agent 级联停止其子代理（`isCascadeStopExempt` / `isSparedFromCascadeStop` 豁免的除外，并发 `cascadeSpared` 事件）。
6. shell 任务补发 stopped 通知，通知属主代理或 SDK 来源；MCP 任务被杀时附"不会再有结果"的说明。

### 2.4 通知

- 子代理：1.5 节。
- shell：`tasks/LocalShellTask/LocalShellTask.ts · backgroundTask` 在命令结束时写终态与 `terminal.summary`（`formatTaskTerminalSummary`："Background command "x" completed (exit code 0)" 等；Monitor 用 `formatMonitorTerminalSummary`），并调用 `finishLocalShellTask`（`chunk-e6aww6q8.js#Qpt`）生成通知（Monitor 不发）。
- 卡住检测：`startStallWatchdog` 发现输出停在交互式提示（`looksLikePrompt`）时，发一条带最后输出与 `INTERACTIVE_PROMPT_HINT` 的 task-notification。
- 远程：`notifyRemoteReviewCompleted/Failed`、`getStatusText`；会话恢复时没有结束记录的后台任务由 `enqueueOrphanedTasksNotification` 汇总通知为 failed/stopped。
- 队列中 task-notification 过多时 `collapseExcessTaskNotifications` 合并多余部分。
- 终止事件 `emitTaskNotification(taskId, status, {toolUseId, summary, …})`：发 SDK `task_notification` 系统消息等（`chunk-aepeg2w5.js#ya`，`utils/task/taskNotifications.ts`）。

### 2.5 前台与后台

- 子代理：前台注册 `registerAgentForeground` 返回 `backgroundSignal`；`moveAgentToBackground` 置 `isBackgrounded` 并 resolve。自动转后台定时器（`autoBackgroundMs`）到点时，若响应仍在流式（`response_streaming`）或有"必须独占"的工具调用排在它后面（`call_queued_behind`）则推迟（`getAutoBackgroundHoldReason`），记 `task_local_agent_auto_background`。
- shell：`registerForeground` 注册前台；Ctrl+B "全部转后台"（`backgroundAll`：先 shell 后子代理）；`backgroundExistingForegroundTask` 让 shellCommand 进入后台模式并启动卡住检测；为了投递新消息也会把前台 shell 转后台（`backgroundShellsToDeliverMessage`）。
- 进程退出时后台 shell 的处理 `getAtExitBehavior`：leave 或 kill。

### 2.6 主会话转后台

`tasks/LocalMainSessionTask.ts · startBackgroundSession({messages, queryParams, description, taskRegistry, agentDefinition})`：注册 `main-session` 任务（ID 前缀 `s`），以子代理身份（`isMainSession`、`isBackgroundAgent`）在新的 agentContext 中继续 `runQuery`，边跑边写 sidechain transcript 与进度；中止时发 stopped 通知；结束 `completeMainSessionTask`（transcript 只留最后一条）。

### 2.7 远程代理任务

`tasks/RemoteAgentTask/RemoteAgentTask.tsx`：

- 子类型 `REMOTE_TASK_TYPES`：remote-agent、ultraplan、ultrareview、autofix-pr、remote-workflow。
- `registerRemoteAgentTask`：写任务与元数据（`persistRemoteAgentMetadata`，供 `--resume` 后 `restoreRemoteAgentTasks` 恢复），启动 `startRemoteSessionPolling`。
- 轮询（每秒）：拉事件、追加输出与 todo；处理远端的 `control_request`——满足条件（有中继、非 -p、非 MCP/Skill/Workflow/计划模式工具、输入经 schema 解析不变、并发 ≤8）时在本地 `relayRemotePermissionRequest`（`canUseTool` 带 `forRemoteExecution`），否则记 `tengu_remote_agent_permission_fallback`；判定完成（result、会话归档、空闲 5 次、审查超时）、等待输入阻塞（`tengu_coral_anchor`）、remote-workflow 完成。
- ultrareview：解析 `<remote-review-progress>` 进度与 `<remote-review>` 结果，成功/失败各有通知（`--fix` 要求本地应用、发帖到 PR 的结果另发一条）。失败原因码见 `describeReviewFailure`。
- 前置条件：`checkRemoteSessionEligibility` → `utils/background/remote/remoteSession.ts · checkBackgroundRemoteSessionEligibility`（第 9.3 节）。

### 2.8 其他

- 胶囊：`tasks/pillLabel.ts · getPillLabel` 按类型给"2 shells, 1 monitor"、"1 team"、"ultraplan ready"、"3 cloud sessions"、"dreaming"、"memory import 2/5"等文案。
- 进度：`createProgressTracker` / `updateProgressFromMessage` / `applyStreamTokenEvent`；`updateAgentSummary` 在开启 SDK 进度摘要时发 `task_progress`。
- DreamTask：kill 时用 `priorMtime` 回滚整理锁。

---

## 3. 团队 / 蜂群模式（agent teams）

### 3.1 启用

`utils/agentSwarmsEnabled.ts · isAgentSwarmsEnabled`：需要 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` 或命令行 `--agent-teams`，且 GrowthBook `tengu_amber_flint`（默认 true）未关闭。

### 3.2 身份

两种 teammate：

- **同进程 teammate**：身份放在 AsyncLocalStorage（`utils/teammate.ts · getTeammateContext` / `runWithTeammateContext`，由 `utils/teammateContext.ts · createTeammateContext` 构造，`isInProcess: true`）。
- **pane teammate**（独立进程，跑在 tmux/iTerm2 pane 里）：进程级"动态团队上下文"（`utils/teammate.ts · setDynamicTeamContext`，按宿主保存在 `teammateIdentities`）。

`utils/teammate.ts` 的查询都先看同进程上下文、再看动态上下文：`getAgentId`、`getAgentName`、`getTeamName`、`getParentSessionId`、`isTeammate`、`isPlanModeRequired`（缺省读 `CLAUDE_CODE_PLAN_MODE_REQUIRED`）、`isTeamLead`（自身 agentId 等于 leadAgentId，或没有 agentId）。agentId 形如 `name@team`；leader 名固定 `team-lead`（`utils/swarm/constants.ts · TEAM_LEAD`）。成员名须匹配 `^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$`。

### 3.3 团队文件

路径 `<teams 目录>/<规范化团队名>/config.json`（`getTeamDir` / `getTeamFilePath`）；开启存储 v5 时存在存储后端（键 `STORAGE_SPACES.team(sanitizeName(teamName))`）。字段（`sanitizeTeamFile`/`isValidMember`/`isValidLeadProcess` 校验）：`leadAgentId`、`leadProcess{pid, pidSpace, claimedAt, procStart?}`、`members[]{agentId, name, joinedAt, mode, isActive, tmuxPaneId, backendType, …}`、`teamAllowedPaths[]{toolName, path}`。

操作（`utils/swarm/teamHelpers.ts`）：

| 函数 | 作用 |
|---|---|
| `readTeamFileAsync`（门面名，压缩名 nS） | 读（存储或文件），不存在返回 null |
| `updateTeamFile` | 加锁读-改-写（文件锁：`config.json` 加 `.lock` 后缀）；回调返回 false 不写；`bestEffortWrite` 写失败只记录。存储 v5 走 `updateTeamFileInStore`（锁可疑/不可读最多重试 5 次） |
| `removeTeamMember` / `removeMemberByAgentId`（`onlyIfJoinedBefore` 防误删重新加入的成员） / `removeTeammateFromTeamFile` | 删成员 |
| `setMemberMode`、`syncTeammateMode`、`setMemberActive` | 改成员权限模式、活动状态 |
| `setMemberPaneInfo` + `recordSpawnedTeammatePane` | 记录成员的 pane（tmuxPaneId、backendType） |
| `registerTeamForSessionCleanup` → `cleanupSessionTeams` | 会话结束时杀掉本会话创建的孤儿 pane（`killOrphanedTeammatePanes`），删除团队目录（`cleanupTeamDirectories`） |

### 3.4 Mailbox（文件信箱）协议

- 路径：`<teams 目录>/<团队>/inboxes/<代理名>.json`（`getInboxPath`，团队缺省为当前团队或 `default`）；存储 v5 时键为 `je.mailbox(team, agent)`。无盘会话且没有存储时读写都不做（`isMailboxUnavailable`）。
- 文件内容：JSON 数组，元素 schema（`mailboxMessageSchema`）：`{from, text, timestamp, type?, read?, color?, summary?, from_plugin?}`，写入时补 `msg_id`、`type: "message"`、`read: false`。无效条目读取时丢弃并安排修剪（`pruneInvalidMailboxEntries`），首次见到时上报一次。
- 锁：`proper-lockfile` 风格的 `<inbox>.lock`，重试 10 次（5–100ms）。
- 读写：`readMailbox`、`readUnreadMessages`、`writeToMailbox`（先确保目录与文件存在，再加锁追加并原子写）、`markSingleMessageAsRead`（**316 的实现是把该条删除**，同时去掉已读条目）、`markMessagesAsRead`（删除已投递的）、`markMessagesAsReadByPredicate`、`clearMailbox`。msg_id 台账 `reconcileMessageLedger` 跟踪仍在 inbox 中的 ID。
- 模型看到的格式：`formatTeammateMessage` → `<teammate-message teammate_id="…" color="…" summary="…" [verified="false"]>正文</teammate-message>`（来源被判为伪造时标 `verified="false"`，正文会清洗控制字符）。

结构化协议帧（`text` 字段里放 JSON）：

| type | 方向 | 字段 |
|---|---|---|
| `permission_request` | worker → leader | `request_id, agent_id, tool_name, tool_use_id, description, input, permission_suggestions` |
| `permission_response` | leader → worker | `request_id, subtype: success \| error, tool_use_id?, approved_request?{tool_use_id, tool_name, input_digest}, response?{updated_input, permission_updates}` 或 `error` |
| `sandbox_permission_request` | worker → leader | `requestId, workerId, workerName, workerColor, hostPattern{host}, createdAt` |
| `sandbox_permission_response` | leader → worker | `requestId, host, allow, timestamp` |
| `plan_approval_request` | worker → leader | `from, timestamp, planFilePath, planContent, requestId` |
| `plan_approval_response` | leader → worker | `requestId, approved, feedback?, timestamp, permissionMode?` |
| `shutdown_request` | leader → worker | `requestId, from, reason?, timestamp` |
| `shutdown_approved` | worker → leader | `requestId, from, timestamp, paneId?, backendType?` |
| `shutdown_rejected` | worker → leader | `requestId, from, reason, timestamp` |
| `idle_notification` | worker → leader | `from, timestamp, idleReason?(available\|interrupted\|failed), summary?, completedTaskId?, completedStatus?(resolved\|blocked\|failed), failureReason?, result?` |
| `task_assignment` | → worker | `taskId, subject, description, assignedBy, timestamp` |
| `team_permission_update`、`mode_set_request` | leader → worker | 只做识别；**同进程 teammate 一律丢弃 mode_set_request**（"permission mode changes are never accepted from the inbox"） |

`isStructuredProtocolMessage` 判定协议帧；协议帧不允许作为 teammate 的初始提示词（`PROTOCOL_FRAME_PROMPT_ERROR`）。计划审批回复与等待中的请求不匹配时，worker 用 `planVerdictMismatchRejection` 自行生成一个"拒绝并要求重新提交"的回复。

### 3.5 权限同步

worker 侧（`utils/swarm/permissionSync.ts`）：`createPermissionRequest`（ID `perm-<时间>-<随机>`）→ `sendPermissionRequestViaMailbox` 写入 team-lead 的 inbox；leader 审批后 `sendPermissionResponseViaMailbox` 回写。同进程 teammate 的 `canUseTool`（`utils/swarm/inProcessRunner.ts · createInProcessCanUseTool`）：

1. 先本地判定（`asksNoHost`）；只有 `ask` 才继续；宿主措辞的 ask 直接拒绝（要求让 lead 自己执行）。
2. 有 UI 对话通道（`requestDialog`）时走协调者权限处理并在 leader 的界面弹出对话框。
3. 否则注册回调、经 mailbox 发请求，每 500ms 轮询自己的 inbox，只接受 `from === "team-lead"` 的 `permission_response`，按 success/error 调 `processMailboxPermissionResponse`。

沙箱网络主机权限同理（`sendSandboxPermissionRequestViaMailbox` / `…Response…`，ID 前缀 `sandbox-`）。

### 3.6 Pane 后端

`utils/swarm/backends/registry.ts · detectAndGetBackend`（结果缓存）：

1. `teammateMode`（启动时快照 `captureTeammateModeSnapshot`：CLI `--teammate-mode` 优先，否则配置 `teammateMode`，缺省 `in-process`）为 `iterm2` → 必须在 iTerm2 且 it2 可用，否则报错。
2. 在 tmux 内（启动时的 `TMUX` env）→ tmux。
3. 在 iTerm2（`TERM_PROGRAM=iTerm.app` / `ITERM_SESSION_ID`）→ 未设 `preferTmuxOverIterm2` 且 it2 可用则 iTerm2；否则 tmux 可用就回退 tmux（提示安装 it2）；都不行报错。
4. 都不在但装了 tmux → 外部 `claude-swarm` tmux 会话（socket `claude-swarm-<pid>`，窗口 `swarm-view`）。
5. 否则报错并给安装说明（`getTmuxInstallInstructions`）。

是否用同进程 teammate（`isInProcessEnabled`）：非交互会话总是；`in-process` 是；`tmux/iterm2` 否；auto 时 pane 后端不可用已回退（`markInProcessFallback`）或既不在 tmux 也不在 iTerm2 时是。

- `TmuxBackend`：在 leader 窗口内时，首个 teammate 横向分出 70%，之后在已有 teammate pane 间交替纵横分割并 `main-vertical`（leader 30%）；外部会话时平铺。设置边框颜色与标题，用 `respawn-pane -k` 运行 teammate 命令（`remain-on-exit failed`）。分屏有锁串行化，空间不足给出专门提示。
- `ITermBackend`：it2 CLI `session split`（首个从 leader 会话垂直分），目标会话已死时剪除重试；不支持边框颜色/标题。
- it2 安装（`utils/swarm/backends/it2Setup.ts`）：uv → pipx → pip/pip3；验证 `it2 session list`，识别"Python API 未开启"；失败界面 `It2SetupPrompt`（重试 / 改用 tmux / 取消）。

### 3.7 派生

- 同进程：`utils/swarm/spawnInProcess.ts · spawnInProcessTeammate`：agentId=`name@team`、任务 ID 前缀 t、`createTeammateContext`、注册 `in_process_teammate` 任务；初始权限模式 `getTeammatePermissionMode`（要求计划模式 → plan；父为 plan/dontAsk → default；否则继承）；在 `agentNameRegistry` 登记名字（被活着的代理占用时另分配）。然后 `startInProcessTeammate` → `runInProcessTeammate`。
- pane：命令行由 `utils/swarm/spawnUtils.ts · buildInheritedCliFlags` 拼出继承的参数：权限/计划模式、`--proactivity`、`--disallowed-tools`（**无法原样重放的 CLI deny 规则会中止派生**）、`--tools`、`--model`、`--effort`、`--settings`、`--managed-settings`、`--plugin-dir/--plugin-dir-no-mcp/--plugin-url`、`--project-config-root`、`--mcp-config`、`--strict-mcp-config`、`--include-unsupported-models`、`--[no-]chrome`、`--restricted`；透传改动过的代理 env（`TEAMMATE_ENV_VARS`：HTTP(S)/ALL/NO_PROXY、CLAUDE_TEST_HEADED）。启动命令可用 `CLAUDE_CODE_TEAMMATE_COMMAND` 覆盖。
- 终止同进程 teammate：`killInProcessTeammate`：标 killed、中止、触发 onIdle 回调、带 10 秒超时等 pane 拆除、从 `teamContext` 与团队文件移除成员、发 stopped 通知。

### 3.8 同进程 teammate 运行循环

`utils/swarm/inProcessRunner.ts · runInProcessTeammate(config)`：

```
构造 agentContext{agentType: "teammate", isBackgroundAgent, parentSessionId, teamName, …}
系统提示词 = 默认提示词（teammate 版）+ "# Custom Agent Instructions" 自定义代理提示 [+ append]，或 replace
必需工具 = SendMessage (+ TaskCreate、TaskGet、TaskList、TaskUpdate，有任务列表工具时)
首次（非 standalone）尝试领取任务列表里的任务 tryClaimNextTask
loop（直到中止或退出）:
  ├─ 历史超过自动压缩阈值 → compactConversation（PreCompact 钩子阻止时继续不压缩）
  ├─ runWithTeammateContext → runAgent(…, canUseTool = createInProcessCanUseTool, isTeammate)
  │     流式更新进度、transcript、in-progress tool ids；Esc 只中止本轮工作（currentWorkAbortController）
  ├─ 回合结束：pollTeammateInbox 看有没有新消息（有则直接进入下一轮，必要时先发带结果的 idle_notification）
  ├─ 否则标 isIdle、触发 onIdleCallbacks，非 standalone 时给 leader 写 idle_notification
  │     （idleReason: available / interrupted / failed，附摘要与结果）
  └─ waitForNextPromptOrShutdown（每 500ms）：
        UI 注入的 pendingUserMessages → mailbox（pollTeammateInbox）→ 领取任务 → 空闲超时（开启时）
        shutdown_request 优先处理（交给模型决定 approve/reject）；leader 的 plan_approval_response 生效；
        mode_set_request 丢弃；伪造来源的消息过滤；标记已读失败 5 次后不标记直接投递
结束：标 completed（异常则 failed 并给 leader 发 failed 的 idle_notification），发终止通知
```

pane teammate 的空闲通知由 `utils/swarm/teammateInit.ts · initializeTeammateHooks` 注册的 Stop 函数钩子完成：每轮结束标成员不活跃并写 idle_notification；同时把团队文件里的 `teamAllowedPaths` 转成会话级 allow 规则（只允许受管规则时跳过）。

### 3.9 重连

`utils/swarm/reconnection.ts`：启动时 `computeInitialTeamContext`（从动态团队上下文与团队文件得到 `teamContext{teamName, teamFilePath, leadAgentId, selfAgentId, selfAgentName, isLeader, teammates}`）；恢复会话时 `initializeTeammateContextFromSession` 从团队文件找回自己的 agentId。

### 3.10 时序：leader 派生 teammate 到关闭

```
leader: TeamCreate → 写团队文件、registerTeamForSessionCleanup
leader: Agent（spawn） → detectAndGetBackend / isInProcessEnabled
   ├ in-process: spawnInProcessTeammate → startInProcessTeammate → runInProcessTeammate
   └ pane: 创建 pane（TmuxBackend、ITermBackend）→ respawn-pane 运行 claude（buildInheritedCliFlags）
          → setMemberPaneInfo；teammate 进程 setDynamicTeamContext、initializeTeammateHooks
teammate: 执行 → 需要权限时 permission_request → leader 审批 → permission_response
teammate: 回合结束 → idle_notification → leader 看到 <teammate-message>
leader: SendMessage → writeToMailbox → teammate pollTeammateInbox 取到 → 新一轮
leader: shutdown_request → teammate 模型回复 shutdown_approved（带 paneId）/ shutdown_rejected
leader: 杀 pane / killInProcessTeammate → removeMemberByAgentId；会话结束 cleanupSessionTeams
```

---

## 4. 协调者模式（coordinator）

- 判定：`coordinator/coordinatorMode.ts · isCoordinatorMode` —— `CLAUDE_CODE_COORDINATOR_MODE` 为真，并且不处于某受限场景（除非 `CLAUDE_CODE_REMOTE`）。恢复会话时 `matchSessionMode(sessionMode)` 把 env 切到与会话记录一致，记 `tengu_coordinator_mode_switched`，返回"Entered/Exited coordinator mode to match resumed session."。
- 内置代理：协调者模式下 `getBuiltInAgents` 只返回 worker 代理（`chunk-ncsga3m8`，现 `coordinator/workerAgent.ts`）：`tools: ["*"]`、`maxTurns: 500`、`permissionMode: "bubble"`；worker 系统提示词要求：只做被分配的事、改动后提交（不许 `git add .`）、可再分派（深度允许时）、auto 模式被拒时原样报告、输出给协调者（"What you did or found" + 一句 Summary）。
- 系统提示词 `getCoordinatorSystemPrompt`：角色是"跨多个 worker 编排软件工程任务的协调者"；工具 Agent（派新 worker）、SendMessage（继续已有 worker）、TaskStop、Workflow（可用时）、Skill（只读加载）、PR 活动订阅、跨会话 peer（ListAgents/SendMessage）；模型参数规则（`CLAUDE_CODE_COORDINATOR_FORCE_WORKER_INHERIT_MODEL` 或 `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` 时忽略 model）；通讯工具模式下"裸文本不会到达用户，每轮必须以通讯工具结束"。
- user context `getCoordinatorUserContext` → `workerToolsContext`：列 worker 可用工具（`CLAUDE_CODE_SIMPLE` 时只有 Bash/PowerShell/Read/Edit/Agent）、Artifact 交付规则、MCP 服务器名、scratchpad 目录、skill 指引（`CLAUDE_CODE_COORDINATOR_SKILL_GUIDANCE`）。
- scratchpad：`isScratchpadEnabled`（GrowthBook `tengu_scratch`，或 Artifact 工具可用）。
- 其他 env：`CLAUDE_CODE_COORDINATOR_PROPAGATE_NESTED_MEMORY`（AgentTool 读取）。

与 2.1.88：旧版协调者提示词约 300 行、工具只有 Agent/SendMessage/TaskStop；316 增加 Workflow、Skill 只读加载、PR 订阅、跨会话 peer、通讯工具模式、Artifact 交付规则、scratchpad 开关改为 `tengu_scratch`。

---

## 5. SDK 控制协议

### 5.1 帧

stdin/stdout 上逐行 JSON（stream-json）。控制帧：

```jsonc
{"type":"control_request","request_id":"<发送方选定，在途唯一>","request":{"subtype":"…", …}}
{"type":"control_response","response":{"subtype":"success","request_id":"…","response":{…},
   "pending_permission_requests":[…], "pending_user_dialog_requests":[…], "pending_elicitation_requests":[…]}}
{"type":"control_response","response":{"subtype":"error","request_id":"…","error":"…","error_code":"…","model":"…", …}}
{"type":"control_cancel_request","request_id":"…"}      // 撤回在途请求
{"type":"keep_alive"}                                     // 任一方随时可发
```

316 的 zod 定义在 `chunk-bwbq4xvm`（约 780KB 的 schema 大 chunk；写作时在 `_unattributed/`，现已放入 `entrypoints/sdk/`）；`entrypoints/sdk/*.ts` 名下匹配到的多是发送/处理助手。协议表本身带方向标注（`var X4 = [g(schema, "client"|"agent"|"both", responseSchema), …]`），以下按它整理。

### 5.2 control request 全表（98 种）

**client → CLI（客户端驱动循环，80 种）**（括号：无响应体 / 无响应）

- 会话与模型：`initialize`、`interrupt`、`set_permission_mode`、`set_model`、`set_max_thinking_tokens`（无响应体）、`rename_session`（无响应体）、`set_color`（无响应）、`set_cwd`、`claim_session`、`message_rated`、`rewind_files`、`cancel_async_message`、`seed_read_state`（无响应体）、`turn_handoff`、`apply_flag_settings`（无响应体）、`get_settings`、`update_settings`（无响应体）、`set_prompt_suggestions_paused`（无响应体）。
- 查询：`get_context_usage`、`get_session_cost`、`get_usage`、`get_status`、`list_models`、`get_binary_version`、`get_plan`、`get_hooks_listing`、`list_permission_rules`、`get_workspace_diff`、`read_file`、`list_directory`、`file_suggestions`、`export_conversation`。
- 对话框数据：`get_memory_dialog`、`get_skills_dialog`、`get_chrome_dialog`、`get_sandbox_dialog`。
- Chrome：`get_chrome_browsers`、`select_chrome_browser`、`set_chrome_browser_hints`（无响应体）。
- 云会话：`list_cloud_sessions`、`get_cloud_session`、`get_cloud_session_transcript`。
- MCP：`mcp_status`、`mcp_call`、`mcp_read_resource`、`mcp_set_servers`、`mcp_reconnect`（无响应体）、`mcp_toggle`（无响应体）、`set_mcp_permission_mode_override`（无响应）。
- 插件/技能/风格：`reload_plugins`、`reload_skills`、`reload_output_styles`、`register_repo_root`。
- 任务：`stop_task`（无响应体）、`start_shell_task`、`background_tasks`、`get_task_output`。
- 设备钩子与远程工具：`register_device_hooks`、`upload_device_hook_template`、`remote_tools_announce`。
- 反馈：`submit_feedback`、`submit_survey_feedback`。
- UI 表面（316 新增的"远程渲染 UI"协议）：`ui_attach`、`ui_detach`、`ui_render`、`ui_press`、`ui_client_module`、`ui_client_press`、`ui_message`、`ui_client_fault`、`ui_input`、`ui_select`、`ui_panes`、`ui_pane_show`、`ui_pane_focus`、`ui_close`、`ui_scroll`、`ui_focus`、`ui_prompt_edit`、`ui_prompt_autocomplete`。

**CLI → client（循环发起并等待回复，17 种）**：`can_use_tool`（权限请求：`tool_name, mcp_server, input, permission_suggestions, blocked_path, decision_reason*` 等）、`hook_callback`（`callback_id, input, tool_use_id, issued_at, deadline_ms`）、`oauth_token_refresh`、`host_auth_token_refresh`、`elicitation`（MCP elicitation：`mcp_server_name, message, mode, url, elicitation_id, requested_schema…`）、`request_user_dialog`（`dialog_kind, payload, tool_use_id`）、`remote_tool_call`、`remote_plumbing_call`、`remote_tools_probe`、`remote_tools_reannounce`（无响应体）、`remote_control_work_secret`、`ui_copy`、`ui_prompt_read`、`ui_prompt_fill`、`ui_prompt_paint`、`ui_prompt_suggest`、`ui_read_selection`。

**双向**：`mcp_message`（SDK MCP 服务器的 JSON-RPC 透传）。

主要请求字段（从 schema 读出）：

| subtype | 字段 |
|---|---|
| `initialize` | `hooks, sdkMcpServers, sdkMcpServerConfigs, sdkMcpServerManifests…, jsonSchema, systemPrompt, appendSystemPrompt, systemPromptSnapshot, planModeInstructions, appendSubagentSystemPrompt, …` |
| `interrupt` | `reason, cancel_queued, send_now, message_uuid, for_user_message_uuids, worker_epoch` |
| `set_permission_mode` | `mode, ultraplan, from_settings` |
| `set_model` | `model, system_prompt, only_if_model_is_current` |
| `set_max_thinking_tokens` | `max_thinking_tokens, thinking_display` |
| `rename_session` | `title, source, session_id` |
| `get_context_usage` | `detail`（响应见 `SDKControlGetContextUsageResponseSchema`） |
| `rewind_files` | `user_message_id, dry_run` |
| `mcp_call` | `tool, arguments, expires_at, timeout_ms, result_not_for_model, input_files, output_files` |
| `claim_session` | `cwd, env, additional_directories, permission_mode, system_prompt, append_system_prompt, agents, title, sdk_mcp_servers, include_initialize, workspace_trust` |
| `start_shell_task` | `command, args, cwd, env, timeout_ms, description` |
| `read_file` | `path, max_bytes, encoding, anchor` |
| `turn_handoff` | `messages, tool_use_ids, stopped, requires_rewind_request_id, relay_marker, memory_context, …` |
| `register_device_hooks` | `instance_id, display_name, lease_s, worker_epoch, hooks, templates, held` |

### 5.3 SDK 消息类型

顶层 `type`：`assistant`、`user`、`result`、`stream_event`、`system`、`keep_alive`、`control_request/response/cancel_request`、`rate_limit_event`、`tool_progress`、`auth_status`、`tool_use_summary`、`prompt_suggestion`、`transcript_mirror`、`update_environment_variables`、`queued_notification`、`conversation_reset`、`bash_command`（不经模型与权限执行的 shell 命令）、`os_notification`、`session_notice`、`autocompact_state`、`active_goal`、`api_metrics`、`tombstone`、`command_lifecycle`、`compact_start/progress/end`、`thinking_progress`、`hint_clears`、`stream_mode`、`set_expanded_view`、`open_message_selector`、`ui_message`、`press` 等（`@internal` 标注的多为内部宿主使用）。

`system` 子类型（56 种）：`init`、`status`、`compact_boundary`、`informational`、`api_retry`、`api_error`、`hook_started/progress/response`、`task_started/progress/updated/notification/summary`、`post_turn_summary`、`session_state_changed`、`session_title_changed`、`session_metadata`、`local_command_output`、`files_persisted`、`file_snapshot`、`file_attachments_missing`、`elicitation_complete`、`memory_saved`、`memory_recall`、`model_fallback`、`model_consent_fallback`、`model_refusal_fallback/no_fallback`、`notification`、`permission_denied`、`permission_check_status`、`permission_retry`、`plugin_install`、`stop_hook_summary`、`thinking`、`thinking_tokens`、`turn_duration`、`turn_preempted`、`turn_handoff_available`、`background_tasks_changed`、`agents_killed`、`commands_changed`、`cloud_session_delta`、`code_change_published`、`control_request_progress`、`dev_intent`、`feedback_draft_queued`、`inherited_asks_settled`、`instruction_size_warning`、`mirror_error`、`peer_message_hold`、`per_turn_effort_changed`、`scheduled_task_fire`、`vcs_state_changed`、`worker_shutting_down`、`away_summary`、`ui_focus/ui_invalidate/ui_log/ui_panes/ui_placed/ui_scroll/ui_status/ui_toast`、`upgrade_relay_marker`。`result` 的 subtype：`success`、`error_during_execution`、`error_max_turns`、`error_max_budget_usd`、`error_max_structured_output_retries`（-p 文本输出见 `writePrintResult`）。

钩子事件消息受开关控制：`setAllHookEventsEnabled`；`CLAUDE_CODE_EMIT_USER_PROMPT_SUBMIT_HOOK_EVENTS`（读取后清除）开启 UserPromptSubmit 的开始/结束事件。钩子事件名共 33 个（`HOOK_EVENTS`），316 新增 `PostToolBatch`、`UserPromptExpansion`、`StopFailure`、`PreModelSwitch`、`PostModelSwitch`、`TeammateIdle`、`TaskCreated`、`TaskCompleted`、`DirectoryAdded`、`MessageDisplay` 等。

### 5.4 与 2.1.88 的差异

旧版 `controlSchemas.ts` 只有 23 个 subtype（apply_flag_settings、can_use_tool、cancel_async_message、elicitation、get_context_usage、get_settings、hook_callback、initialize、interrupt、mcp_message、mcp_reconnect、mcp_set_servers、mcp_status、mcp_toggle、reload_plugins、rewind_files、seed_read_state、set_max_thinking_tokens、set_model、set_permission_mode、stop_task 及 success/error）。316 增至 98 种请求，新增云会话、Chrome、UI 表面、设备钩子、远程工具、turn_handoff、claim_session、文件/目录读取、任务控制、反馈等，并显式标注每个请求的发起方（client/agent/both）；control_response 增加 `pending_…_requests` 列表（`pending_permission_requests`、`pending_control_requests`、`pending_dialog_requests`、`pending_elicitation_requests`、`pending_human_requests`、`pending_user_dialog_requests`）；新增 `control_request_progress` 系统消息。旧版 `system` 子类型约 15 种，316 为 56 种。

---

## 6. Remote Control 独立模式（claude remote-control / bridgeMain）

（本章与第 7 章由分身整理、经主笔核对。）

### 概述与位置

`claude remote-control`（以及桌面端/守护进程托管的无头模式）把**本机当成一台"环境"（environment）**登记到 Anthropic 的 Environments API。claude.ai/code 或手机 App 上发起的会话会作为 **work** 下发；本机轮询领取 work，为每个会话派生一个子 `claude --print --sdk-url …` 进程，子进程以 worker 身份直连 CCR v2 会话（`/v1/code/sessions/{id}`）收发事件。Claude 与工具都在本机运行，网页/App 只做显示和输入。

与 REPL 内的 `/remote-control`（env-less v2 桥，见上一章）的区别：独立模式**仍然注册 environment、轮询 work**，可同时服务多个会话（`--capacity`，默认 32），并可为每个会话开 git worktree。

- 调用方：CLI 子命令分派进入 `bridge/bridgeMain.ts · bridgeMain`；宿主托管时进入 `bridge/bridgeMain.ts · runBridgeHeadless`（调用方不在本领域）。
- 它调用：Environments API 客户端（`bridge/bridgeApi.ts`）、会话创建（`bridge/createSession.ts`）、work secret/registerWorker（`bridge/workSecret.ts`）、子进程派生（`bridge/sessionRunner.ts`）、可信设备（`bridge/trustedDevice.ts`）、bridge pointer（`bridge/bridgePointer.ts`）、终端界面（`bridge/bridgeUI.ts`）、轮询配置（`bridge/pollConfig.ts`）、JWT 刷新（`bridge/jwtUtils.ts`）。

### 模块地图

| 模块 | 职责 |
|---|---|
| `reconstructed/src/bridge/bridgeMain.js` | 参数解析 `parseArgs`、入口 `bridgeMain`、无头入口 `runBridgeHeadless`、主循环 `runBridgeLoop`、`stopWorkWithRetry`、worktree 清理、退避常量 `DEFAULT_BACKOFF`、`--help` 文本 |
| `reconstructed/src/bridge/bridgeApi.js` | `createBridgeApiClient`（Environments API 全部调用）、`handleErrorStatus`、`BridgeFatalError`、untrusted_device 自动恢复（另混入大量与 bridge 无关的内容块小助手，见建议） |
| `reconstructed/src/bridge/sessionRunner.js` | `createSessionSpawner`：子 CLI 参数与环境、stdout 活动解析、句柄（kill/writeStdin/updateAccessToken） |
| `reconstructed/src/bridge/workSecret.js` | `decodeWorkSecret`、`registerWorker`、`buildCCRv2SdkUrl`、`sameSessionId`、网关 URL 规范化 |
| `reconstructed/src/bridge/pollConfig.js`、`pollConfigDefaults.ts` | 轮询间隔配置 schema 与默认值（`tengu_bridge_poll_interval_config`） |
| `reconstructed/src/bridge/capacityWake.js` | `createCapacityWake`：会话结束腾出容量时提前唤醒轮询等待 |
| `reconstructed/src/bridge/bridgeUI.js` | `createBridgeLogger`：横幅、QR、状态行、会话列表 |
| `reconstructed/src/bridge/bridgeStatusUtil.js` | 连接 URL、shimmer、/rc 状态标签、OSC8 链接 |
| `reconstructed/src/bridge/bridgePointer.js` | `bridge-pointer.json` 读写/清除/跨 worktree 查找 |
| `reconstructed/src/bridge/trustedDevice.js` | 可信设备强制判断、token 读取、注册（`/api/auth/trusted_devices`）、拒绝提示 |
| `reconstructed/src/bridge/jwtUtils.js` | `decodeJwtPayload/Expiry`、`createTokenRefreshScheduler` |
| `reconstructed/src/bridge/bridgeEnabled.js` | `isBridgeEnabled`、各 `tengu_*` 开关、`getCcrAutoConnectDefault`、`checkBridgeMinVersion` |
| `reconstructed/src/bridge/bridgeConfig.js` | `getBridgeBaseUrl`、`getBridgeAccessToken` |
| `reconstructed/src/bridge/createSession.js` | `createBridgeSession`（预创建会话）、`postPeerMessage`（向别的会话投递消息） |
| `reconstructed/src/bridge/debugUtils.js` | 调试日志脱敏截断、错误详情、`parseRetryAfterMs`、`logBridgeSkip` |
| `reconstructed/src/bridge/types.js` | 登录要求等文案常量、`FOLDER_ALREADY_SERVED_ERROR_TYPE` |
| `reconstructed/src/bridge/bridgeDebug.js` | `injectBridgeFault` 故障注入 |

### 关键流程

```
bridgeMain(argv, storageV5, credentials)                         bridge/bridgeMain.ts
 ├─ parseArgs → --help 则 printHelp
 ├─ 企业 launcher 检查（Ym）；lockCurrentVersion
 ├─ --permission-mode 合法性；--allow-unattended-tool-calls 需要真终端
 ├─ enableConfigs / initSinks；工作区信任（未信任则 offerBridgeWorkspaceTrust，信任后重置 GrowthBook）
 ├─ --chrome 策略检查；登录检查（getBridgeAccessToken / getBridgeAccessTokenAsync），否则打印 BRIDGE_LOGIN_ERROR 退出
 ├─ 首次使用确认（全局配置记录）；--continue → readBridgePointerAcrossWorktrees 找最近 pointer
 ├─ getBridgeBaseUrl（不可用即退出）；选择 spawn 模式（项目配置 remoteControlSpawnMode，未设时交互询问 same-dir、worktree）
 ├─ --session-id / pointer 恢复：readBridgePointer → 同进程仍在跑则拒绝；getBridgeSessionOrStatus 查会话，404 清 pointer
 ├─ createBridgeApiClient({baseUrl, getAccessToken, onAuth401, getTrustedDeviceToken, untrustedDevice, …})
 ├─ tryRegisterEnvironment → api.registerBridgeEnvironment (POST /v1/environments/bridge)
 │    └─ 409 bridge_folder_already_served → 致命；失败记 tengu_bridge_registration_failed
 ├─ 写 bridge pointer（writeBridgePointer），启动每小时刷新（startPointerRefreshTimer）
 ├─ 恢复已有会话：unarchiveBridgeSessionIfNeeded → api.reconnectSession(env, session)
 ├─ createBridgeLogger 横幅 / QR；createSessionSpawner；可选 createBridgeSession 预建会话（tags: remote-control-cli）
 ├─ 信号与键盘（Ctrl-C/D 退出、空格 QR、w 切换 same-dir↔worktree）
 └─ runBridgeLoop(config, envId, envSecret, api, spawner, logger, signal, DEFAULT_BACKOFF, initialSessionId, getAccessToken, …)

runBridgeLoop                                                     bridge/bridgeMain.ts
 loop:
  ├─ 选择间隔：满载 multisession_poll_interval_ms_at_capacity(10min)，部分 partial_capacity(2s)，空闲 not_at_capacity(2s)；
  │   watch_sessions 开启时由 sessions watch 调度器（GET /v1/code/sessions/watch SSE）决定何时轮询
  ├─ api.pollForWork(envId, envSecret, signal, reclaim_older_than_ms, poll_interval_ms)  GET /v1/environments/{id}/work/poll
  ├─ 无 work → 等待（capacityWake 可提前唤醒）
  ├─ work.data.type 非 session（tool host 等）→ toolHostHandler.handle 或 stopWork（tengu_bridge_work_mode_unsupported）
  ├─ decodeWorkSecret(work.secret)   失败 → tengu_bridge_work_secret_failed + stopWorkWithRetry
  ├─ acknowledgeWork                POST …/work/{id}/ack
  ├─ （版本/机器通道下限检查，拒绝时 stopWork）
  ├─ registerWorker(buildCCRv2SdkUrl(apiBase, sessionId), ingressToken)  POST /v1/code/sessions/{id}/worker/register，最多 5 次 → worker_epoch
  ├─ safeSpawn(spawner, {sessionId, sdkUrl, accessToken, workerEpoch, serverConfig, modelArgs, …}, cwd|worktree)
  │    └─ sessionRunner · createSessionSpawner.spawn → 子进程 claude --print --sdk-url … --input/output-format stream-json
  ├─ 心跳：non_exclusive_heartbeat_interval_ms>0 时 heartbeatWork；会话 keepalive
  ├─ 会话结束：tengu_bridge_session_done；cleanupSessionWorktree；stopWorkWithRetry（3 次指数退避）
  ├─ token：会话 ingress token 由 createTokenRefreshScheduler 到期前刷新，子进程经 stdin update_environment_variables 接收
  ├─ environment secret 临期（computeSecretRenewAt，tengu_keen_lantern）→ 重新注册续期
  ├─ 404/401（environment 丢失，tengu_glimmering_glade / tengu_lucky_quill）→ 重新注册 environment，记 tengu_bridge_env_reregister
  └─ 错误：BridgeFatalError → 退出（tengu_bridge_fatal_error）
          连接错误（CONNECTION_ERROR_CODES / 5xx）→ 2s→120s 指数退避，累计 10 分钟放弃（tengu_bridge_poll_give_up）
          其他错误 → 0.5s→30s，10 分钟放弃；两次错误间隔 > 240s 视为系统睡眠，重置预算
 退出：停所有会话、按需重排队（tengu_bridge_shutdown_requeue）、deregister / markOffline、tengu_bridge_shutdown
```

`runBridgeHeadless(opts, signal)`：流程与 `bridgeMain` 相同但不交互——设置无效或策略拒绝时抛 `BridgeHeadlessPermanentError`（宿主不再重试），暂态问题抛遥测安全错误（宿主重试）；日志走 `createHeadlessBridgeLogger`；可选择 `createSessionOnStart`；支持 project thread 会话重排队（`tengu_bridge_project_thread_requeue`）。

### 数据结构

**work secret**（work.secret，base64url JSON，`bridge/workSecret.ts · decodeWorkSecret`）：

| 字段 | 说明 |
|---|---|
| `version` | 必须为 1 |
| `session_ingress_token` | 会话 ingress JWT（子进程的 `CLAUDE_CODE_SESSION_ACCESS_TOKEN`，也用于 ack/heartbeat/registerWorker） |
| `api_base_url` | API 基址 |
| `claude_code_args` | 可选，额外 CLI 参数（转成模型参数等） |
| `mcp_config` | 可选 `{content, path?, mode?}` |
| `auto_mode_environment` | 可选字符串数组（auto 模式环境事实） |
| `worktree` | 可选布尔 |

**poll config**（`tengu_bridge_poll_interval_config`，默认值见 `pollConfigDefaults.ts`）：

| 字段 | 默认 |
|---|---|
| `non_exclusive_heartbeat_interval_ms` | 0 |
| `multisession_poll_interval_ms_not_at_capacity` | 2000 |
| `multisession_poll_interval_ms_partial_capacity` | 2000 |
| `multisession_poll_interval_ms_at_capacity` | 600000（0 或 ≥100；心跳与此至少一个 >0） |
| `reclaim_older_than_ms` | 5000 |
| `session_keepalive_interval_v2_ms` | 120000 |
| `sse_connect_timeout_ms` | 30000（0 或 ≥20000） |
| `watch_sessions` | false |
| `watch_connected_poll_interval_ms` / `watch_fallback_poll_interval_ms` | 60000 / 30000（15000–96000） |
| `watch_session_end_window_ms` | 600000 |

**DEFAULT_BACKOFF**：`connInitialMs 2000, connCapMs 120000, connGiveUpMs 600000, generalInitialMs 500, generalCapMs 30000, generalGiveUpMs 600000`；`stopWorkBaseDelayMs` 由配置传入。

**bridge pointer**（`~/.claude/projects/<目录编码>/bridge-pointer.json`，或存储 v5 键）：`sessionId`（可为空串）、`environmentId`、`source`（standalone/repl）、`pid`、`procStart`、`activeSessionIds`、`activeSessionIdsPersistedAt`、`projectThreadSessionIds`、`parkedProjectThreadSessionIds` 及其时间戳（数组上限 64）。mtime 超过保留期（`--continue` 帮助里说"约 4 小时"）或 schema 不符时被清除；`--continue` 会在同仓库的其他 worktree 中找最新的一个。

**registerBridgeEnvironment 请求体**：`machine_name, machine_id?, directory, branch, git_repo_url, max_sessions, metadata{worker_type, machine_id?, tool_host?, tool_host_cc_version?, tool_host_platform?, tool_host_blocker?}, host?(工具宿主描述), environment_id?(复用)`；响应含 `environment_id, environment_secret, environment_secret_expires_in`。

**poll 响应**：`{id, state, secret, data:{type:"session"|…, id, mode?}}`；heartbeat 响应 `{lease_extended, state}`。

**子进程环境**（`sessionRunner`）：`CLAUDE_CODE_ENVIRONMENT_KIND=bridge`、`CLAUDE_CODE_SESSION_ACCESS_TOKEN`、`CLAUDE_CODE_WORKER_EPOCH`、`CLAUDE_CODE_RESUME_INTERRUPTED_TURN(_MAX_AGE_MS)`（epoch>1 时）、`CLAUDE_CODE_BRIDGE_OWNER_ACCOUNT_UUID/ORG_UUID`、`CLAUDE_CODE_BRIDGE_SOURCE_DIR`、`CLAUDE_CODE_BRIDGE_MCP_CARRIER`、`CLAUDE_CODE_BRIDGE_PROMPT_SHA256`、`CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT`/`CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT`/`CLAUDE_CODE_BRIDGE_CHILD_MACHINE_SETTINGS`/`CLAUDE_CODE_BRIDGE_CHILD_PROJECTS_ENTRYPOINT`/`CLAUDE_CODE_BRIDGE_CHILD_CLI_ENTRYPOINT`、`SESSION_INGRESS_URL`（有 mcp_config 时）、`CLAUDE_CODE_EXIT_AFTER_STOP_DELAY`（idle 退出）；同时清除宿主的 OAuth/API key/FD 类凭证变量（`CLAUDE_CODE_OAUTH_TOKEN`、`…_FILE_DESCRIPTOR`（如 `CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR`、`CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR`）、`CLAUDE_CODE_ACCOUNT_UUID` 等）。子进程退出码映射为 `completed / idle / interrupted / failed`。

### 配置项、环境变量与开关

| 名称 | 类型 | 用途 |
|---|---|---|
| `tengu_ccr_bridge` | GrowthBook | Remote Control 总开关（`isBridgeEnabled`） |
| `tengu_bridge_poll_interval_config` | GrowthBook 配置 | 轮询间隔（上表） |
| `tengu_bridge_min_version` | GrowthBook 配置 | 最低版本（`checkBridgeMinVersion`，函数内读取，键名取自旧版，未在 316 字符串中核对） |
| `tengu_bridge_unarchive_on_resume` | GrowthBook | 恢复前解档被回收会话 |
| `tengu_glimmering_glade` | GrowthBook（代号） | 轮询 404/401 与 secret 临期时触发重新注册（由用法推断） |
| `tengu_lucky_quill` | GrowthBook（代号） | 401 也触发重新注册（推断） |
| `tengu_keen_lantern` | GrowthBook（代号） | environment secret 到期前续期（推断） |
| `tengu_ccr_v2_session_crud_cli` | GrowthBook | 归档等走 `/v1/code/sessions/{cse_id}/archive` |
| `tengu_ccr_v2_bridge_create_cli` | GrowthBook | 预创建会话用 v1alpha2 接口 |
| `tengu_ccr_v2_send_events_cli` | GrowthBook | peer 消息走 v2 事件接口 |
| `tengu_bridge_repl_v2_cse_shim_enabled`、`tengu_bridge_partial_messages`、`tengu_bridge_auth_revive`、`tengu_bridge_resume_respects_local_owner`、`tengu_bridge_owner_pinned_end`、`tengu_bridge_owner_check_attribution`、`tengu_bridge_host_declined_end`、`tengu_bridge_signed_out_neutral` | GrowthBook | REPL 桥相关（见上一章） |
| `tengu_luminous_seal`、`tengu_wobbly_pinwheel`、`tengu_copper_kestrel`、`tengu_ethereal_mist`、`tengu_wild_gosling`、`tengu_humble_petal`、`tengu_moonlit_lagoon`、`tengu_sequential_puffin`、`tengu_composed_quail`、`tengu_gravel_chorus` | GrowthBook（代号） | 由 `bridgeEnabled.ts` 统一读取；用途未确认（只列调用方：/clear、print 模式、remoteBridgeCore、initReplBridge 等） |
| `tengu_cobalt_harbor` | GrowthBook | 启动时自动开 Remote Control 的默认值（`getCcrAutoConnectDefault`） |
| `tengu_sessions_elevated_auth_enforcement` | GrowthBook | 可信设备功能 |
| `tengu_sessions_elevated_auth_disable_proactive_enrollment` | GrowthBook | 暂停自动注册 |
| `tengu_bridge_attestation_enforce`、`tengu_bridge_attestation_enforce_config` | GrowthBook | 设备证明强制及接受等级（默认 `VERIFIED_KEYLESS_DEVICE`） |
| `require_trusted_devices` | 组织策略 | 是否强制可信设备 |
| `allow_remote_control`、`remote_control_at_startup` | 组织策略 | 是否允许 / 启动时默认连接 |
| `CLAUDE_TRUSTED_DEVICE_TOKEN` | env | 直接提供设备 token（跳过注册） |
| `CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX` | env | 自动生成会话名前缀（`--remote-control-session-name-prefix` 也会写入） |
| `CLAUDE_CODE_REMOTE` | env | 云容器中，跳过设备注册 |
| `CLAUDE_CODE_CHILD_SESSION` | env | 子会话中禁止 `--allow-unattended-tool-calls` |
| `ANTHROPIC_UNIX_SOCKET` | env | 设置时 Remote Control 不可用 |
| 全局配置 `iterm2…`/`remoteControlSpawnMode`（项目配置） | 配置 | spawn 模式记忆 |

遥测事件：`tengu_bridge_started / shutdown / registration_failed / reconnected / env_reregister / heartbeat_error / heartbeat_mode_entered|exited / session_started / session_done / work_secret_failed / work_mode_unsupported / poll_give_up / fatal_error / policy_teardown / spawn_mode_chosen|toggled / project_thread_requeue / watch_miss / watch_summary / token_refreshed / repl_skipped`。

### HTTP 端点

| 方法 | 路径 | 调用者 |
|---|---|---|
| POST | `/v1/environments/bridge` | registerBridgeEnvironment |
| GET | `/v1/environments/{envId}/work/poll` | pollForWork（参数 reclaim_older_than_ms、poll_interval_ms） |
| POST | `/v1/environments/{envId}/work/{workId}/ack` | acknowledgeWork |
| POST | `/v1/environments/{envId}/work/{workId}/stop` | stopWork（`{force}`） |
| POST | `/v1/environments/{envId}/work/{workId}/heartbeat` | heartbeatWork |
| DELETE | `/v1/environments/bridge/{envId}` | deregisterEnvironment |
| POST | `/v1/environments/bridge/{envId}/offline` | markEnvironmentOffline |
| POST | `/v1/environments/{envId}/bridge/reconnect` | reconnectSession（`{session_id}`） |
| POST | `/v1/sessions/{id}/archive`（`useCcrV2SessionCrud` 为假）或 `/v1/code/sessions/${toInfraSessionId(sessionId)}/archive`（为真） | archiveSession（409 视为已归档） |
| POST | `/v1/code/sessions/{id}/tool_hosts/refuse` | refuseToolHost |
| GET | `/v1/code/sessions?limit=1`、`/v1/code/sessions/watch` (SSE) | sessionsWatch.mintResumeToken / open |
| POST | `/v1/code/sessions/{id}/worker/register` | registerWorker |
| POST | `/v1/sessions`（v1）或 v1alpha2 会话接口 | createBridgeSession |
| POST | `/api/auth/trusted_devices` | enrollTrustedDevice |

请求头：`Authorization: Bearer <OAuth>`、`anthropic-version: 2023-06-01`、`anthropic-beta`（environments beta）、`x-environment-runner-version`、`X-Trusted-Device-Token`（有时）。401 → `onAuth401` 刷新 OAuth 后重试一次；403 `untrusted_device` → 注册设备后重试一次（`recoverUntrustedDevice`）。

### 与 2.1.88 的差异（有代码证据）

- **会话传输统一为 CCR v2**：旧版按 `secret.use_code_sessions` 在 v1（`buildSdkUrl` 生成 `ws://…/session-ingress`）与 v2 之间选择；316 的循环直接 `registerWorker` + `buildCCRv2SdkUrl`，`buildSdkUrl` 只剩一个本地主机名集合（`chunk-aepeg2w5.js#cF`）。
- **新参数**：`--remote-control-session-name-prefix`、`--[no-]chrome`、`--allow-unattended-tool-calls`（需开关）、`--enable-live-preview/--preview-port`（解析但"not available in this build"）；**删除** `--session-timeout`（`sessionTimeoutMs` 在 316 无出现），`--sandbox/--no-sandbox` 改为明确报错。
- **environment 生命周期**：新增 environment secret 续期（`computeSecretRenewAt`、`environment_secret_expires_in`）、environment 丢失自动重新注册（`tengu_bridge_env_reregister`）、`markEnvironmentOffline`、同目录重复服务检测（409 `bridge_folder_already_served`）。
- **sessions watch**：新增 `GET /v1/code/sessions/watch` SSE 驱动的轮询调度（`watch_*` 配置、`tengu_bridge_watch_*` 事件）。
- **工具宿主（tool host）**：注册时通告 `tool_host`，非 session 类 work 交给 `toolHostHandler`；`refuseToolHost` 新增。
- **可信设备**：自动注册扩展为 proactive / lazy / server_denied / device_bind 四种触发，带拒绝后冷却（1 天）、设备证明配置（attestation）。
- **恢复**：`unarchiveBridgeSessionIfNeeded` 解档被回收会话；pointer 增加 `activeSessionIds`、project thread 字段并支持跨 worktree 查找。
- **子进程**：环境变量大幅增加（属主账号、MCP carrier、提示词 SHA、恢复中断回合等），并主动清除宿主凭证 FD 变量。
- **无头模式** `runBridgeHeadless` 与 `BridgeHeadlessPermanentError` 为 316 新增（旧版只有交互式 bridgeMain）。

### 未解之处

- 代号开关用途：`chunk-71c4j971.js#lPe`、`#eir`、`#f8r`、`#p8r`、`#D9o`、`#JTt`、`#L9o`、`#N9o`、`#lEn`、`#B9o`（只按调用方推断，置信度 0.45–0.5）。
- `chunk-wbbfk060.js#Rr` 内部大量单字母局部（`$e`、`We`、`qe`、`Se`、`ke`、`_e`、`Ge` 等集合/映射）只命名了部分；会话超时/project thread park 逻辑未逐行梳理。
- `chunk-b30925fy.js#dBn`、`#KIs` 常量组的确切语义（续期重试次数/间隔）为推断。
- `chunk-wbbfk060.js#rs` 中 `rs/os/is/yr` 的用途为推断。
- `chunk-4121qate.js#bx`（插件向下调用）、`chunk-tyg7f3ek.js#qP` 等误归属声明的完整语义未深挖。

---

## 7. REPL 内的 Remote Control 与远程会话查看

### 概述与位置

REPL 里执行 `/remote-control`（或启动参数、恢复会话时自动重连）会把当前会话"镜像"到 claude.ai / 手机端，让远端能看到对话、发消息、回答权限请求、发控制命令。316 里这条路径只剩 **env-less（v2）桥**：不再注册 environment、不再轮询 work，而是直接

1. `POST /v1/code/sessions` 建一个 `cse_*` 云会话（或解档复用旧会话）；
2. `POST /v1/code/sessions/{id}/bridge` 取 `worker_jwt`、`api_base_url`、`worker_epoch`；
3. 以 worker 身份连接：SSE 读 `/worker/events/stream`，CCRClient 写事件、发心跳、上报状态。

调用方：REPL 的 Remote Control 开关/命令、恢复会话的自动重连逻辑（不在本领域，经 `bridge/initReplBridge.ts · initReplBridge` 进入）。
它调用：Code Session API（`bridge/codeSessionApi.ts`）、trusted device（`bridge/trustedDevice.ts`）、JWT 刷新调度（`bridge/jwtUtils.ts · createTokenRefreshScheduler`）、v2 传输（`bridge/replBridgeTransport.ts`，底层 SSETransport/CCRClient 在 cli/transports）、入站附件（`bridge/inboundAttachments.ts`）、GrowthBook 配置（`bridge/envLessBridgeConfig.ts`）。

`remote/` 与 `server/` 是"反方向"的：本地 REPL 去**查看/驱动**一个远程会话（云会话或 `claude server` 直连会话），把对端的 SDK 消息转成本地消息显示。

### 模块地图

| 模块 | 职责 |
|---|---|
| `reconstructed/src/bridge/initReplBridge.js` | 入口与门控：重连目标与属主校验、策略/OAuth/信任设备/版本检查、标题派生，调用核心 |
| `reconstructed/src/bridge/remoteBridgeCore.js` | 核心 `initEnvLessBridgeCore`：建/复用会话、取凭证、建传输、帧分派、FlushGate、恢复、拆除；`withRetry`/`withRetryAndAuthRecovery` 等助手 |
| `reconstructed/src/bridge/codeSessionApi.js` | `createCodeSession`（POST /v1/code/sessions）、`fetchRemoteCredentials`（POST …/bridge）、HTTP 失败分类、untrusted_device 子原因 |
| `reconstructed/src/bridge/replBridgeTransport.js` | `createV2ReplTransport`：epoch、SSE 读流、CCRClient 写流、关闭码 4090–4094 |
| `reconstructed/src/bridge/bridgeMessaging.js` | `isSDKControlRequest/Response`、`isEligibleBridgeMessage`（出站过滤）、`handleIngressMessage`（入站分派）、`BoundedUUIDSet`、回写 control_response |
| `reconstructed/src/bridge/flushGate.js` | `FlushGate`：回放历史/重连时暂存出站帧 |
| `reconstructed/src/bridge/envLessBridgeConfig.js` | `tengu_bridge_repl_v2_config` 配置与最低版本检查 |
| `reconstructed/src/bridge/sessionIdCompat.js` | `cse_` ↔ `session_` 前缀互转（另混入 CCR MCP 代理 URL 代码） |
| `reconstructed/src/bridge/inboundAttachments.js` | 远端发来的文件附件下载、落盘 uploads、内联图片、`@"path"` 前缀 |
| `reconstructed/src/bridge/inboundMessages.js` | base64 图片 media_type 补全（另混入远程工具执行结果转换） |
| `reconstructed/src/bridge/bridgePermissionCallbacks.js` | 从 allow 决定中取审批票据 |
| `reconstructed/src/bridge/replBridgeHandle.js` | 当前桥句柄的 session_* 兼容 ID |
| `reconstructed/src/remote/sdkMessageAdapter.js` | SDK 消息 → 本地消息（查看远程会话用） |
| `reconstructed/src/remote/RemoteSessionManager.js`、`remotePermissionBridge.ts` | 可中继控制帧判定、为远程权限请求合成 assistant 消息 |
| `reconstructed/src/server/directConnectManager.js`、`server/types.ts` | WebSocket 直连 `claude server` 会话；connect 响应 schema |
| `reconstructed/src/assistant/sessionHistory.js` | 远程会话事件分页、判断远程回合是否进行中、会话端点 URL/头 |

### 关键流程

```
initReplBridge(options)                                   bridge/initReplBridge.ts
 ├─ 读 CLAUDE_BRIDGE_REATTACH_* 环境交接 / 恢复指针（PX）→ reattachTarget、seq、mustReattach
 │   └─ 属主校验：resolveOwnerCheckIdentity({site:"restored"|"env_handoff"}) 与当前登录比对；不符 → applyOwnerVeto（抑制历史回填）
 ├─ 门控：isBridgeEnabledBlocking(桥开关) → OAuth 令牌 → allow_remote_control 策略（latched、org_denied、route_missing）
 │        → outboundOnly 时 allow_remote_sessions → 本地另一进程持有？（tengu_bridge_resume_respects_local_owner）
 │        → OAuth 死令牌跨进程退避（bridgeOauthDeadExpiresAt、bridgeOauthDeadFailCount）→ trusted device（preflightTrustedDeviceBlocking）
 │        → getOrganizationUUID → checkEnvLessBridgeMinVersion
 ├─ 标题：initialName > 当前会话标题 > AI 标题 > 最近人类输入；之后第 1/3 条用户消息触发 AI 生成
 └─ initEnvLessBridgeCore({...全部回调})                   bridge/remoteBridgeCore.ts
     ├─ cfg = getEnvLessBridgeConfig()
     ├─ 会话：work secret → 直接用 reattachSessionId
     │        重连 → unarchiveSession（gone 且 mustReattach → 失败；gone → createSessionWithRetry 新建）
     │        新建 → createSessionWithRetry → createCodeSession（Project 被拒且非显式指定时去掉 grouping 重试）
     ├─ 凭证：withRetryAndAuthRecovery(fetchBridgeCredentials)
     │        = fetchCredentialsWithTrustedDevice → codeSessionApi · fetchRemoteCredentials
     │          （403 untrusted_device → 自动注册设备后重试；409 → epoch 冲突回调）
     ├─ 传输：createV2ReplTransport({sessionUrl, ingressToken: worker_jwt, epoch, initialSequenceNum})
     │        └─ CCRClient.initialize(epoch) 成功 → 打开 SSE（outboundOnly 不开读流）
     ├─ wireTransportCallbacks
     │   ├─ onConnect：flushInitialHistory（过滤 isEligibleBridgeMessage、截断到 initialHistoryCap、historical:true）
     │   │              或进入 transcript 延迟上传（transcript_mirror:"deferred"），随后 drainFlushGate
     │   ├─ onData → handleIngressMessage
     │   │     control_response        → onPermissionResponse（远端回答了本地的权限请求）
     │   │     control_request         → __i（服务端控制请求分派，见下表）→ sendControlResponseWhenSettled
     │   │     control_cancel_request  → 取消对应的可取消请求
     │   │     queued_notification     → 通知缓冲 / MCP send_message 转 user 帧
     │   │     user                    → 去回显/去重/去 replay/去子代理帧 → onInboundMessage（附件经 resolveInboundAttachments）
     │   └─ onClose(code) → CLOSE_CODE_RECOVERY[code] → rebuildTransport（重取凭证、重建传输、搬运未投递事件）
     ├─ createTokenRefreshScheduler：按 token_refresh_buffer_ms 提前刷新 worker JWT
     └─ 返回 handle：writeSdkMessages / sendControlRequest / sendControlResponse / sendControlCancelRequest /
                    sendResult / subscribePR / fetchInboxMessage / teardown / archive …
```

#### 会话 ID 兼容

服务端 v2 用 `cse_<id>`，v1 兼容层（归档、旧 API）用 `session_<id>`，裸 ID 相同。`bridge/sessionIdCompat.ts · toCompatSessionId`（cse→session）、`toInfraSessionId`（session→cse）、`sessionIdBody`（去前缀）、`inSessionIdCostumeOf`（按参考 ID 的前缀形式转换）；`assistant/sessionHistory.ts · buildSessionEndpoint` 在 v2 下走 `/v1/code/sessions/{cse_id}`，v1 下走 `/v1/sessions/{session_id}` 并加 `anthropic-beta: ccr-byoc-2025-07-29`、`x-organization-uuid`。是否启用前缀 shim 受 `tengu_bridge_repl_v2_cse_shim_enabled`（默认 true）控制（`isCseShimEnabled`，在 initReplBridge 开头注入）。

#### 服务端控制请求（远端 → 本地，`chunk-1qpz7qcd.js#__i`）

`initialize`、`set_model`、`set_max_thinking_tokens`、`set_permission_mode`、`rename_session`、`set_color`、`file_suggestions`、`read_file`、`get_workspace_diff`、`get_context_usage`、`get_usage`、`mcp_status`、`mcp_authenticate`、`mcp_oauth_callback_url`、`mcp_reconnect`、`mcp_set_servers`、`interrupt`、`apply_flag_settings`、`stop_task`、`background_tasks`、`cancel_async_message`、`side_question`、`fork_conversation`。

规则：进程退出中且不在白名单的请求回 error；outbound-only（只镜像）会话除 `initialize` 外全部回 `OUTBOUND_ONLY_ERROR`（"This session is outbound-only…"）；宿主可用 `answerSharedControlRequest` 抢先回答。`get_workspace_diff` 有超时提示文本，`side_question` 超时 660s（`SIDE_QUESTION_TIMEOUT_MS`，未完全确认）。本地 → 远端方向只有 `can_use_tool`（权限请求，远端用 control_response 回答）与 `request_user_dialog`。

#### 出站过滤与 FlushGate

`bridge/bridgeMessaging.ts · isEligibleBridgeMessage` 决定哪些本地消息上传：user/assistant（非虚拟）、附件中的 `hook_system_message`、`tool_host_result_lines`、来自用户的 prompt 型 `queued_command`；system 中 `local_command`、`model_consent_fallback`，以及受"状态帧闸门"控制的 `compact_boundary`。上传前经账户记忆脱敏（`accountMemoryRedactor`）和 `toSDKMessages`。

核心维护两个 `FlushGate`：`messageFlushGate`（对话消息）和 `frameFlushGate`（SDK 事件/控制帧）。历史回放、重连恢复期间 `start()`，新写入进入队列；结束时 `drainFlushGate` 按 seq 归并两路队列一次 `writeBatch`。去重用三个 `BoundedUUIDSet`（容量 `uuid_dedup_buffer_size`）：已发出的、已收到的、已转发的帧。

#### 关闭码与恢复（`CLOSE_CODE_RECOVERY`）

| 码 | 含义 | 恢复 |
|---|---|---|
| 401 | JWT 过期 | 刷新 OAuth 后重取 /bridge、重建传输 |
| 4090 | epoch 不匹配/被取代 | `classifySupersession`：superseded_by_worker、session_not_active→archived 等，不再重连 |
| 4091 | CCR initialize 失败 | 重建 |
| 4092 | SSE 自身关闭（默认） | 重建 |
| 4093 | 心跳失败而 SSE 正常（`tengu_bridge_selfheal_heartbeats`） | 重建，失败可重试（有次数上限） |
| 4094 | worker 凭证过期 | 重新铸造凭证（`tengu_bridge_auth_revive`） |

#### 入站附件

`bridge/inboundAttachments.ts · resolveInboundAttachments`：从帧的 `file_attachments`（`extractInboundAttachments`）取列表，限数量并发下载 `GET {base}/api/oauth/files/{file_uuid}/content`（可加 `?model_copy=inference_highres`），复用预取/在途下载，401 时刷新 OAuth 重试一次；写入会话 `uploads/` 目录（`link(2)` 原子放置，同名不同内容的旧文件移到 `.kept-<时间>-<id>/`，受 `tengu_tidy_shelf` 控制），图片按尺寸内联为 image block；结果拼成 `@"path"` 前缀插到用户消息最后一个文本块前（`prependPathRefs`），失败的写 `[SendFile: "名字" was not delivered — 原因]`。

#### 拆除与归档

`handle.teardown`：停止刷新与心跳、在 `teardown_archive_timeout_ms` 内 flush 并（非 neverArchive、非 work secret 时）`archiveSession`（POST `/v1/sessions/{session_id}/archive`）；记 `tengu_bridge_repl_teardown {archive_status}`。会话被别的 worker 取代或已归档时跳过归档（`archiveStatusCode`）。

### 数据结构（从代码读出）

- **`/bridge` 响应**：`{worker_jwt: string, expires_in: number, api_base_url: string, worker_epoch: number, mcp_config?}`；请求体可带 `expected_epoch`；409 体内 `expected_epoch`、`actual_epoch`。
- **创建会话请求**：`{title, bridge: {}, tags?, session_grouping_id?, config: {cwd, model?, sources?, outcomes?, reuse_outcome_branches?}}`；响应 `session.id` 必须以 `cse_` 开头。
- **失败对象**：`{terminal: true, reason: "grouping_rejected"|"request_rejected"|"malformed_response"|"invalid_session_id"|"untrusted_device"|"session_stale_relogin", status?, detail?, refusal?, source?}`；`{terminal: false, reason: "oauth_rejected"}`；瞬时失败为 `null`。
- **untrusted_device 拒绝**（`readUntrustedDeviceRefusal`，`chunk-kgtpkbhq.js#zJ`）：`{kind: "token_refused"}`、`{kind: "signature_wanted", subReason: "served_call_unsigned"}`、`{kind: "unrecognized", subReason}`。
- **入站帧**：`control_request {request_id, request: {subtype, …}}`、`control_response {response: {subtype: "success"|"error", request_id, response?|error?}}`、`control_cancel_request {request_id}`、`queued_notification {notification}`、`user {uuid, message, parent_tool_use_id, isReplay?}`。
- **env-less 配置**（`DEFAULT_ENV_LESS_BRIDGE_CONFIG`）：init_retry_max_attempts 3、init_retry_base_delay_ms 500、init_retry_jitter_fraction 0.25、init_retry_max_delay_ms 4000、http_timeout_ms 10000、uuid_dedup_buffer_size 2000、heartbeat_interval_ms 20000、heartbeat_jitter_fraction 0.1、token_refresh_buffer_ms 300000、teardown_archive_timeout_ms 1500、connect_timeout_ms 15000、oauth_retry_max_attempts 3、oauth_retry_base_delay_ms 2000、min_version "0.0.0"。
- **直连**：`connectResponseSchema {session_id, ws_url, work_dir?}`；WebSocket 上 NDJSON 帧。

### 配置项、环境变量与开关

环境变量：`CLAUDE_BRIDGE_REATTACH_SESSION`、`_SEQ`、`_GROUPING`、`_OUTBOUND_ONLY`、`_OWNER_ACCT`、`_OWNER_ORG`、`_NO_BACKFILL`（父进程交接重连目标，读取后即删除）、`CLAUDE_CODE_CCR_LONG_POLL`、`CLAUDE_CODE_REMOTE_SEND_KEEPALIVES`、`CLAUDE_CODE_WORKER_EPOCH`、`CLAUDE_CODE_DIAGNOSTICS_FILE`。

全局配置键：`bridgeOauthDeadExpiresAt`、`bridgeOauthDeadFailCount`（死令牌连续 3 次后跨进程退避）。

组织策略：`allow_remote_control`、`allow_remote_sessions`（outbound-only 镜像需要）。

GrowthBook（这几个模块里读到的；默认值在括号内）：
- 配置：`tengu_bridge_repl_v2_config`（上表）。
- 行为开关：`tengu_bridge_repl_v2_cse_shim_enabled`(true)、`tengu_bridge_selfheal_heartbeats`(true)、`tengu_bridge_auth_revive`(true)、`tengu_bridge_resume_respects_local_owner`(true)、`tengu_bridge_owner_pinned_end`(true)、`tengu_bridge_owner_check_attribution`(true)、`tengu_bridge_host_declined_end`(true)、`tengu_bridge_signed_out_neutral`(true)、`tengu_bridge_partial_messages`(false)、`tengu_bridge_requires_action_details`(false)、`tengu_bridge_subagent_frames`(true)、`tengu_bridge_subagent_text`(false)、`tengu_bridge_recovery_patience`(true)、`tengu_bridge_rc_projects_hint`(true)、`tengu_bridge_rc_child_*`（artifact/auto_compact/idle_exit_ms/restart_resume）、`tengu_bridge_child_auto_mode`/`_auto_over_settings`/`_machine_settings`、`tengu_bridge_placeholder_sweep`、`tengu_tidy_shelf`（附件冲突处理 off/count/on/tell）、`tengu_lucky_widget`（大图要 model copy）。
- CCR 传输调参：`tengu_ccr_stream_event_flush_ms`、`_stream_first_flush_ms`、`_no_subscriber_flush_ms`、`_no_subscriber_hold_ms`、`_drop_unwatched_stream_events`、`_skip_redundant_heartbeat`、`_reconnect_beat`、`_reactivation_beat`、`_idle_heartbeat`、`_sse_keepalive_max_interval_s`、`_sse_long_poll_fallback`(true)、`_upload_trim`、`_upload_hold_marker`、`_handoff_metadata`。
- 代号开关（用途未确认，只知在本区域读取）：`tengu_luminous_seal`（状态帧闸门，传给 `setBridgeStateFramesGate`）、`tengu_bridge_attestation_enforce`（设备签名，见 trustedDevice）、`tengu_amber_ferry`、`tengu_amber_relay`、`tengu_cobalt_harbor`、`tengu_composed_quail`、`tengu_copper_kestrel`、`tengu_dazzling_garden`、`tengu_ethereal_mist`、`tengu_gentle_grove`、`tengu_gentle_orchard`、`tengu_glimmering_glade`。

遥测事件（部分）：`tengu_bridge_repl_ws_connected`、`tengu_bridge_repl_teardown`、`tengu_bridge_message_received`、`tengu_bridge_repl_env_expired_fresh_session`、`tengu_bridge_restored_pointer_takeover`、`tengu_bridge_owner_veto_after_dead_pointer`、`tengu_bridge_transcript_deferral`、`tengu_bridge_repl_events_carried_over`、`tengu_bridge_auto_title_skipped`。

### HTTP 端点

| 方法 | 路径 | 用途 |
|---|---|---|
| POST | `/v1/code/sessions` | 创建云会话（cse_*） |
| POST | `/v1/code/sessions/{cse_id}/bridge` | 取 worker 凭证（会递增 epoch；头可带 `X-Trusted-Device-Token`） |
| POST | `/v1/sessions/{session_id}/archive`、`/unarchive`（v2 下 `/v1/code/sessions/{id}/…`） | 归档/解档 |
| GET | `{sessionUrl}/worker/events/stream` | SSE 读事件（长轮询回退） |
| POST | `{sessionUrl}/worker/register` | 无 epoch 时注册 worker（`bridge/workSecret.ts · registerWorker`） |
| GET | `/api/oauth/files/{uuid}/content`（可加 `?model_copy=inference_highres`） | 下载入站附件 |
| — | `/v2/ccr-sessions/{id}/mcp?mcp_server_id=…`、`/v2/ccr-sessions/{id}/memory/mcp` | 云会话 MCP 代理（sessionIdCompat.ts 里的混入代码） |

公共请求头（`oauthHeaders`）：`Authorization: Bearer`、`Content-Type: application/json`、`anthropic-version: 2023-06-01`、`anthropic-client-platform`、`User-Agent`。

### remote/ 与 server/

`remote/sdkMessageAdapter.ts · convertSDKMessage` 把远端 SDK 帧映射为本地消息：

| SDK 帧 | 本地结果 |
|---|---|
| `control_request/response/cancel_request` | 忽略（由会话管理器另行中继，`isRelayableControlFrame`） |
| `assistant` | `convertAssistantMessage`（remoteSourced，带 API 错误字段） |
| `user` 含 tool_result | 本地 user 消息（可带 `remoteToolDenialKind`） |
| `user` 普通文本 | 默认忽略，`convertUserTextMessages` 或中断标记时转换；子代理帧、非允许来源的合成帧忽略 |
| `stream_event` | stream_event（带 ttftMs） |
| `result` | success 忽略；错误 → warning 级 informational |
| `system/init` | 忽略（另由 `parseInitFrame` 采纳 model/cwd/命令/技能/插件/MCP/工具/epoch） |
| `system/status` | `requesting` → `stream_request_start`；其它 → informational（compacting 特殊文案） |
| `system/compact_boundary`、`model_refusal_fallback`、`model_fallback`、`model_consent_fallback`、`informational`、`tool_host_result`、`local_command_output` | 对应本地 system / attachment / assistant 消息 |
| `system/permission_denied`、`tool_progress`、`auth_status`、`tool_use_summary`、`rate_limit_event`、`active_goal`、`autocompact_state` | 忽略（rate_limit/autocompact 另有采纳器 `createRemoteRateLimitAdopter`、`adoptRemoteAutocompactState`） |
| `env_manager_log` | env_log |
| `conversation_reset` | conversation_reset（newConversationId） |

`server/directConnectManager.ts · DirectConnectSessionManager`：用 `ws_url` 建 WebSocket（Bearer 头），NDJSON 逐行解析；`control_request` 只支持 `can_use_tool`（交给 `onPermissionRequest`，其它回 error），其余 SDK 消息交给 `onMessage`；发送 user 消息、`interrupt` 控制请求、权限响应。`assistant/sessionHistory.ts` 提供远程会话事件分页（`fetchLatestEvents`/`fetchOlderEvents`）与"远程回合是否仍在进行"判断（`classifyLatestTurnState`：worker result → over，worker assistant 或客户端 user → under_way）。

### 与 2.1.88 的差异

- **env-based REPL 桥被删除**：2.1.88 的 `bridge/replBridge.ts`（2406 行，`initBridgeCore`、`startWorkPollLoop`，注册 environment 后轮询 work）在 316 中没有对应代码——其特征字符串（"reconnectSession exhausted"、"deregistering environment"、"Poll loop recovered"）在 original 全部不存在。旧版 `initReplBridge` 用 `isEnvLessBridgeEnabled() && !perpetual` 在 v1/v2 之间选择，316 的 `initReplBridge` 无条件调用 `initEnvLessBridgeCore`。环境/轮询模式只保留在独立的 `claude remote-control`（bridgeMain）里。
- **服务端控制请求大幅扩展**：旧版 `bridgeMessaging.ts` 只处理 initialize、interrupt、set_max_thinking_tokens、set_model、set_permission_mode 五种；316 有 23 种（新增 rename_session、set_color、file_suggestions、read_file、get_workspace_diff、get_context_usage、get_usage、mcp_*、apply_flag_settings、stop_task、background_tasks、cancel_async_message、side_question、fork_conversation），并新增 outbound-only 模式与"进程退出中拒绝"。
- **核心体量**：旧版 `remoteBridgeCore.ts` 1008 行；316 的 `initEnvLessBridgeCore` 单函数 65KB，新增：work secret（宿主下发凭证）路径、属主校验与跨账号否决、trusted device 自动注册与签名、关闭码 4093/4094 恢复、transcript 延迟上传（deferred mirror）、账户记忆脱敏、PR 订阅、inbox 拉取、`request_user_dialog`、Project（session_grouping）。
- **入站附件**：旧版下载后简单写文件；316 增加预取复用、401 重试、`.kept-` 冲突保留、图片内联、model copy、详细计时遥测。
- **会话 ID shim**：两版都有 `toCompatSessionId/toInfraSessionId`；316 的 `/bridge` 增加 `expected_epoch` 与 409 epoch 冲突处理。
- **sdkMessageAdapter**：316 新增 model_refusal_fallback、model_consent_fallback、tool_host_result、env_manager_log、conversation_reset、autocompact_state 采纳、rate_limit 采纳器；旧版的 `convertToolProgressMessage` 在 316 中改为直接忽略 tool_progress。
- **buddy/伴侣** 等无关；`server/directConnectManager` 两版结构相同，316 加了"连接尚未建立/已关闭"的返回原因。

### 未解之处

- `chunk-4cm44bmp.js#_Ks` 内大量单字母局部（`e`、`r`、`i`、`y`、`R`、`_`、`S` 等出现几十次）未逐一命名；状态机变量 `I`、`re`、`Be`、`Se`、`Me`、`ae` 的确切语义（已拆除/owner changed/恢复中/…）只做了推测，未写入命名表。
- `chunk-cg2r2hy6.js#ji` 的 `D`（`pinSessionId(getSessionId())` 的结果，疑似"绑定会话键"）、`resolveOwnerCheckIdentity(...)`（`chunk-cg2r2hy6.js#tt`）的 server vouch 机制没有完全读懂。
- `tengu_luminous_seal`、`tengu_amber_ferry`、`tengu_amber_relay` 等代号开关的具体作用未确认。
- `chunk-1qpz7qcd.js#__i` 的 `side_question`、`fork_conversation` 分支细节没有展开（写作时该声明在 `_unattributed`，现为 `handleReplBridgeControlRequest`，`bridge/replControlHandler.ts`）。
- `chunk-n4bsg1hp.js#Mn`（单个附件解析，11KB）只命名了函数，内部局部未命名。

---

## 8. 定时任务（ScheduledTasks / cron）

### 8.1 模块

| 模块 | 职责 |
|---|---|
| `reconstructed/src/utils/cron.js` | 5 字段 cron 解析（`parseCronExpression`：`*`、`*/n`、`a-b/n`、列表，星期 7=0）、下次运行（`computeNextCronRun`，最多查约一年，日与星期都受限时 OR 语义，DST 缺口处理）、`cronToHuman`、间隔写法转换 `parseScheduleInput`（5m/2h/1d，最小 1 分钟） |
| `reconstructed/src/utils/cronTasks.js` | `.claude/scheduled_tasks.json` 读写（`readCronTasks`/`writeCronTasks`）、`addCronTask`、`removeCronTasks`、`markCronTasksFired`、`listAllCronTasks`；带抖动的下次时间 |
| `reconstructed/src/utils/cronJitterConfig.js` | 抖动配置（GrowthBook `tengu_kairos_cron_config`，60s 刷新） |
| `reconstructed/src/utils/cronScheduler.js` | 调度器 `createCronScheduler` |
| `reconstructed/src/utils/cronTasksLock.js` | 调度锁 `.claude/scheduled_tasks.lock` |

### 8.2 数据

任务（文件中）：`{id(8 位), cron, prompt, createdAt, lastFiredAt?, recurring?, permanent?, createdBySessionId?, createdByPid?, createdByProcStart?, createdInProject?, plugin?}`。非持久化（durable=false）的任务只放在会话内存（`addSessionCronTask`，可带 agentId）。会话以 `--project-config-root` 启动时持久化任务不可用。

抖动默认值（`DEFAULT_CRON_JITTER_CONFIG`）：`recurringFrac 0.5`、`recurringCapMs 30min`、`oneShotMaxMs 90s`、`oneShotFloorMs 0`、`oneShotMinuteMod 30`、`recurringMaxAgeMs 7 天`、`cacheLeadMs 15s`。

- 循环任务：`jitteredNextCronRunMs` 在两次运行间隔内按任务 ID 的稳定系数（`jitterFrac`，ID 前 8 位十六进制）延后，上限 recurringCapMs；"每 N 分钟"（N≥5）改为**提前** cacheLeadMs 触发以命中提示缓存。
- 一次性任务：`oneShotJitteredNextCronRunMs` 落在整点/半点时按 ID 提前最多 90 秒。
- 循环任务超过 7 天（`permanent` 除外）最后触发一次后删除（`isRecurringTaskAged`，记 `tengu_scheduled_task_expired`）。

### 8.3 调度流程

```
createCronScheduler({onFire, onFireTask, onMissed, isLoading, assistantMode, dir, lockIdentity, getJitterConfig, filter, getExtraTasks, leaseFileTasks})
 start():
   有任务（hasCronTasksSync）/助手模式/有额外任务时开启定时任务功能；
   tryAcquireSchedulerLock（独占创建锁；同会话换 PID 接管；持有者进程活着则放弃；陈旧锁删除重试）
   load(initial)：读文件任务 + getExtraTasks；判断哪些任务属于本会话/本项目（创建者会话 transcript 是否在本项目）
       首次加载：错过的一次性任务 → onMissed 或 buildMissedTaskNotification（要求先用 AskUserQuestion 确认）
   每秒 check()；文件监听（chokidar）变化时重载
 check():
   对每个可归属任务：首次计算 nextFireAt（带抖动）→ 到点：onFireTask、onFire(prompt)，记 tengu_scheduled_task_fire
     循环 → 重新计算并批量写 lastFiredAt；一次性 → 删除（处理器要求保留的除外）
     处理器抛错：持久化一次性任务保留到以后会话，其余丢弃本次
 stop()：释放锁、关监听
```

调度锁内容 `{sessionId, pid, procStart?, acquiredAt}`；进程退出时登记清理（`registerSchedulerLockCleanup`）。

与 2.1.88：旧版已有 cron/cronScheduler/cronTasks/cronTasksLock；316 新增 `permanent`、`plugin`、`createdBy*`/`createdInProject` 归属判断（防止从别的 checkout 复制来的文件被误触发）、`getExtraTasks`（routine 触发器）、`cacheLeadMs` 提前触发、错过任务交给处理器保留、`--project-config-root` 限制。

---

## 9. 其他模块

### 9.1 ultraplan

`utils/ultraplan/ccrSession.ts · pollForApprovedExitPlanMode(sessionId, timeoutMs, onPhaseChange, shouldStop, credentials)`：每 3 秒拉云会话事件，`ExitPlanModeScanner` 跟踪 ExitPlanMode 调用与 tool_result：结果含 `## Approved Plan:`（或 edited by user）→ approved（在远端执行）；结果是错误且含 `__ULTRAPLAN_TELEPORT_LOCAL__` 标记 → teleport（计划传回本地执行）；其它错误结果 → rejected（继续等）；非成功 result → terminated。阶段 running / needs_input / plan_ready 变化时回调（驱动胶囊文字）。连续 5 次网络错误放弃，超时区分"等批准超时"与"从未到达 ExitPlanMode"。`utils/ultraplan/keyword.ts` 查找 ultrareview 关键词触发位置。

### 9.2 后台云会话前置条件

`utils/background/remote/remoteSession.ts · checkBackgroundRemoteSessionEligibility`：`CLAUDE_CODE_EVAL_CONFINED` → eval_confined；组织策略 `allow_remote_sessions` → policy_blocked；未登录 → not_logged_in；不在 git 仓库 → not_in_git_repo；没有 GitHub 远端（允许 bundle 时：`CCR_FORCE_BUNDLE`/`CCR_ENABLE_BUNDLE`/`tengu_ccr_bundle_seed_enabled` 可跳过）→ no_git_remote；GitHub App 未安装 / 账号未连接。`utils/background/remote/preconditions.ts · checkGithubAppInstalled` 调 `/api/oauth/organizations/{org}/code/repos/{owner}/{repo}`（15s 超时，状态未定时可请求服务端重新同步），`checkGithubTokenSynced` 调 `/sync/github/auth`。

### 9.3 语音

- 录音（`services/voice.ts`）：原生 `audio-capture-napi`（需 ALSA 声卡）→ `arecord` → SoX `rec`；16kHz 单声道 16-bit PCM，静音判停 2.0 秒 / 3%；远程或云环境不可用；WSL 与缺 SoX 给出具体安装说明（apt/dnf/pacman 探测）。
- 转写（`services/voiceStreamSTT.ts · connectVoiceStream`）：WebSocket `wss://<API>/api/ws/speech_to_text/voice_stream?encoding=linear16&sample_rate=16000&channels=1&endpointing_ms=300&utterance_end_ms=1000&language=…&use_conversation_engine=true[&forward_interims=typed]`，OAuth Bearer；`{"type":"KeepAlive"}` 每 8 秒、`{"type":"CloseStream"}` 收尾；关键词经 `x-config-keyterms` 头（≤1024 字符，`services/voiceKeyterms.ts` 提供全局术语与文件名拆词）。连接失败时 `probeVoiceConnectivity` 请求 `/api/hello` 诊断。`forward_interims=typed` 由 `CLAUDE_CODE_VOICE_FORWARD_INTERIMS_TYPED` 或 `tengu_brick_follow` 打开。

### 9.4 后台维护

`utils/backgroundHousekeeping.ts · startBackgroundHousekeeping`（每宿主一次，远程模式不跑）：初始化 extractMemories 与 autoDream、后台更新插件市场；交互式时注册 deep link 协议；延迟执行慢操作（用户 1 分钟内有操作就推迟）：清理旧消息文件、写 `.last-cleanup`、清理旧版本。

### 9.5 跨会话检索

`utils/agenticSessionSearch.ts`（send-to-project）：读取最近的会话日志，生成标题（自定义 > AI > 摘要 > 首条提示）/日期/分支/转写摘要（中间省略），汇总 MCP 调用与工具使用和时间跨度。

### 9.6 伴侣精灵（buddy）已删除

2.1.88 的 `buddy/*`（物种、稀有度、精灵帧、`/buddy` 命令）在 316 中不存在：物种字符编码、稀有度序列 `common…legendary`、`companionMuted` 等特征都搜不到。重组树里 `buddy/*` 名下的声明全是匹配误差，实际是：编辑器等待提示、~/.claude.json 身份读取、`@azure/identity` 的 tenant 处理与常量、zod 内部、Artifact 发布记录、文字闪光组件、预填提示词警告 hook 等（逐条见 `naming/docs-agents.jsonl` 与过程文档建议）。

---

## 10. 配置项、环境变量与开关汇总（本领域）

环境变量（除第 6、7 章已列）：

| 变量 | 作用 |
|---|---|
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | 打开团队功能（另需 `tengu_amber_flint`） |
| `CLAUDE_CODE_PLAN_MODE_REQUIRED` | teammate 必须先走计划模式（无上下文时） |
| `CLAUDE_CODE_TEAMMATE_COMMAND` | pane teammate 的启动命令 |
| `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` | 子代理最大派生深度（否则 `tengu_hazel_trellis`，默认 3） |
| `CLAUDE_CODE_SUBAGENT_MODEL` | 子代理默认模型（缺省 inherit） |
| `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`、`CLAUDE_CODE_COORDINATOR_FORCE_WORKER_INHERIT_MODEL` | 忽略 Agent 调用的 model 参数 |
| `CLAUDE_CODE_COORDINATOR_MODE`、`CLAUDE_CODE_COORDINATOR_SKILL_GUIDANCE`、`CLAUDE_CODE_COORDINATOR_PROPAGATE_NESTED_MEMORY` | 协调者模式 |
| `CLAUDE_CODE_SIMPLE` | 简化工具集（协调者提示词随之变化） |
| `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` | 禁用后台任务（AgentTool 读取） |
| `CLAUDE_CODE_ENABLE_APPEND_SUBAGENT_PROMPT`、`CLAUDE_CODE_SUBAGENT_PROMPT_SNAPSHOT`、`CLAUDE_CODE_MEMORY_SUBAGENT_APPEND`、`CLAUDE_CODE_WORKER_CHECKIN_SCHEDULE` | AgentTool 中读取（细节在 tools 领域） |
| `CLAUDE_CODE_EMIT_USER_PROMPT_SUBMIT_HOOK_EVENTS` | SDK 发 UserPromptSubmit 开始/结束事件 |
| `CLAUDE_CODE_EVAL_CONFINED`、`CCR_FORCE_BUNDLE`、`CCR_ENABLE_BUNDLE` | 云会话资格 |
| `CLAUDE_CODE_VOICE_FORWARD_INTERIMS_TYPED` | 语音转写转发 typed interims |
| `CLAUDE_CODE_ARTIFACT_COMMENTS` | Artifact 评论（混在 cronTasks.ts 的代码） |
| `TMUX`、`TMUX_PANE`、`TERM_PROGRAM`、`ITERM_SESSION_ID`、`SESSION_INGRESS_URL` | 环境探测 |

全局配置键：`teammateMode`、`preferTmuxOverIterm2`、`iterm2It2SetupComplete`、`remoteControlSpawnMode`（项目）、`bridgeOauthDeadExpiresAt/FailCount`。

GrowthBook（本领域非 bridge 部分）：`tengu_amber_flint`（团队）、`tengu_hazel_trellis`（派生深度）、`tengu_scratch`（scratchpad）、`tengu_kairos_cron_config`（cron 抖动）、`tengu_coral_anchor`（远程任务等待输入判失败）、`tengu_linear_brook`（远程审查启动失败快速判失败）、`tengu_breezy_diffie`（远程审查连续 404 判 session_not_found）、`tengu_wild_tome`（fork 中继 relayFork）、`tengu_pencil_farmer`（输入默认优先级 next）、`tengu_brick_follow`（语音 interims）、`tengu_ccr_bundle_seed_enabled`、`tengu_teal_corbel`（Artifact 评论）、`tengu_coordinator_*` 遥测。Remote Control 的开关见第 6、7 章"配置项、环境变量与开关"。

---

## 11. 与 2.1.88 的主要差异

1. **任务类型**：新增 `mcp_task`、`monitor_ws`、`auto_mode_scan`、`local_memory_import`、`post_turn_memory`；子代理任务新增观察者代理、fork worker、保活原因、静默停放、自动转后台的推迟条件、级联停止豁免。
2. **TaskStop**：模糊名字解析、属主检查、"已结束但循环未退出"的重新中止、级联停止与豁免事件。
3. **fork**：`runForkedAgent` 强制缓存前缀一致（不声明 ownPrefix 不许改工具集）、工具调用路由、relayFork（`tengu_wild_tome`）。
4. **团队**：存储 v5（团队文件/信箱可放存储后端）、协议帧 schema 校验与修剪、伪造来源检测（`verified="false"`）、`mode_set_request` 永不接受、计划审批绑定校验、空闲通知带结果与失败原因、外部 claude-swarm 会话、CLI deny 规则不可重放时中止派生。
5. **SDK 控制协议**：从 23 种请求扩展到 98 种，显式方向表，新增 UI 表面协议、设备钩子、远程工具。
6. **Remote Control**：REPL 内只剩 v2 env-less 桥（旧 `bridge/replBridge.ts` 整体删除）；独立模式统一 CCR v2、environment secret 续期、sessions watch、tool host、无头模式。
7. **定时任务**：归属判断、permanent、routine 额外任务、提前触发命中缓存。
8. **伴侣精灵 buddy 删除**。

---

## 12. 未解之处

- 写作时在 `_unattributed`、与本领域强相关、未在本领域命名的代码（place-rest 后均已落位）：服务端控制请求分派 `chunk-1qpz7qcd.js#__i`、SDK schema 大 chunk `chunk-bwbq4xvm.js`、`monitor_mcp/monitor_ws/mcp_task/auto_mode_scan` 的任务实现（`chunk-kxyd0g16`、`chunk-xf84t5b0`）、终止事件 `ya`（`chunk-aepeg2w5`）、task-notification 构造 `bi`（`chunk-gppkhxdv`）。
- `chunk-e6aww6q8.js#wwt`（`getOwnToolSurface`）、`#ZBo` 的确切语义。
- `utils/agentContext.ts` 下若干 AsyncLocalStorage 封装（`chunk-e6aww6q8.js#Pet`、`#q2e`、`chunk-s61vbvea.js#Cyn`、`chunk-tyg7f3ek.js#ip`、`chunk-7kr2r08r.js#Rn`）的用途只做了推测。
- `chunk-18hwfzwa.js#tKo` 常量组（频率/冷却）用途未确认；`chunk-aat7wt0p.js#pLi`（token 序列匹配）用途未确认。
- 子代理 `runAgent` 内部（tools 领域）未逐行核对；本章 1.2 只描述到调用关系。
- 第 6、7 章各自的未解之处见章内。

## 13. 引用校验结果

校验时间 2026-11-04 06:40（UTC），对象为当时的 `reconstructed/`。脚本检查本文所有代码样式引用：路径是否存在（相对仓库根，或相对 `reconstructed/src/`，`.ts/.tsx` 对应 `.js`）；声明 id 是否在 `reconstructed/symbols.jsonl`；"路径 · 函数名"中的函数是否属于该文件；标识符与字面量是否出现在 `reconstructed/symbols.jsonl` 或阅读树代码中。在 2.1.316 找不到、但在 2.1.88 源码（`references/claude-code-analysis/src`）中存在的，计为"只在 2.1.88 中存在"（删除项、旧名，属预期）。

- 共检查 1374 处引用：名字 999/1003（另 4 个只在 2.1.88 中存在），路径 155/159（另 4 个只在 2.1.88 中存在），字面量 171/173（另 2 个只在 2.1.88 中存在），声明id 39/39；占位符与含空格的说明性文字 224 处未检查。
- 只在 2.1.88 中存在（删除项或旧名，预期如此）：`approve/reject`、`Ctrl-C/D`、`secret.use_code_sessions`、`--session-timeout`、`sessionTimeoutMs`、`bridge/replBridge.ts`、`initBridgeCore`、`startWorkPollLoop`、`companionMuted`
- 未通过：0 处。
