# query 子系统手册：从一次用户输入到模型请求与工具循环

> 适用版本：Claude Code 2.1.316（linux-x64）。所有结论都来自 `original/` 的代码，旧版（2.1.88）只用来取名字和对照差异。
> 路径写的是重组模块路径（阅读树在 `reconstructed/src/<路径>.js`，生成后在 `src/`）；函数写成 `路径 · 可读名`，后面括号是声明 id（`chunk-xxx.js#压缩名`），可用 `node tools/q.mjs show <id>` 查看。
> 可读名来自 `naming/semantic-query.jsonl`（本领域语义名）、门面名、旧版名，三者冲突时以门面名为准。

## 1. 概述

query 领域负责"一轮对话"在客户端里的全部工作：

- 把用户输入（或 SDK/队列命令）变成消息；
- 每轮决定模型、组装 system 提示词、生成附件；
- 把内部消息规整成 Messages API 的请求体，加缓存断点和 beta 头；
- 发流式请求，解析 SSE；遇到错误时重试、回退或自愈；
- 边流边执行工具，把结果作为下一轮输入，直到模型结束本轮；
- 管理上下文大小：自动压缩、microcompact、工具结果落盘；
- 统计 token 与成本。

在整体中的位置：

- **上游调用方**：
  - 交互 REPL：`screens/REPL.tsx` 经 `onQuery` 调 `query()`。
  - headless/SDK（`-p`、`--output-format stream-json`）：`cli/print.ts · runHeadlessStreaming` → `QueryEngine.ts · ask` → 未归属的 headless 引擎 `submitMessage`（`chunk-tyg7f3ek.js#nI`），最后同样进入 `query()`。
  - 子代理：`tools/AgentTool/runAgent.ts`。
  - 进程内队友、/btw side question，以及各种辅助查询（`queryHaiku`/`queryWithModel`）。
- **下游依赖**：
  - 工具执行：`services/tools/StreamingToolExecutor.ts`，属于 tools 领域。
  - 权限：`canUseTool`，属于 permissions 领域。
  - 钩子：`utils/hooks.ts`。
  - 会话存储、bootstrap 全局状态：state/bootstrap 领域。
  - 遥测：`services/analytics`。
  - SDK 客户端：vendor 的 `@anthropic-ai/sdk` 0.128.0，请求头 `X-Stainless-Package-Version` 即此版本。

## 2. 端到端路径

```
用户输入 / SDK 消息
  │  REPL.onSubmit 或 headless submitMessage（chunk-tyg7f3ek.js#nI 内 No → _i）
  ▼
utils/processUserInput/processUserInput.ts · processUserInput（jLt）        斜杠命令、bash 模式、@提及附件、UserPromptSubmit 钩子
  │  得到 messages + shouldQuery
  ▼
query.ts · query（chunk-ha3km179.js#J$）                 工具初始化；主线程可挂观察者（queryWithObserverTap #iy）
  ▼
query.ts · queryLoop（chunk-ha3km179.js#xc）             每轮一次迭代，迭代返回 NEXT_ROUND（#Oo）就继续
  │  ├─ 轮首：记忆召回预取、队列命令/ poll 事件折叠进本轮
  │  ├─ 消息预处理：applyToolResultBudget（大工具结果落盘）
  │  ├─ 模型：实时切换/拒答回退链/用量额度同意对话框
  │  ├─ deps.autocompact → 自动压缩（services/compact）
  │  ├─ 阻断上限检查（blocking_limit）
  │  ├─ 请求前公告：附件、advisor、延迟工具、PostModelSwitch 钩子
  │  ├─ 渲染 system 提示词（xu → getSystemPrompt #KI 的会话记录回放）
  │  └─ while(needsAttempt) 调 deps.callModel ───────────────┐
  ▼                                                          │
services/api/claude.ts · queryModelWithStreaming（#LGt）    │
  → queryModelWithToolSearchRecovery（#__n）                │
  → queryModel（chunk-e6aww6q8.js#e_n）                     │
      ├─ beta 列表、模型事实、工具 schema、工具搜索决策      │
      ├─ normalizeMessagesForRequest（#Qyn）→ normalizeMessagesForAPI（#AT）
      ├─ buildSystemPromptBlocks（#ZSr）                     │
      ├─ withRetry（#DEe）{ getAnthropicClient（#MN）         │
      │     buildRequestParams → addCacheBreakpoints（#YSr）  │
      │     anthropic.beta.messages.create({...,stream:true}) }
      └─ 解析 SSE → 产出 stream_event 与逐块 assistant 消息 ─┘
  ▼
queryLoop 消费事件：assistant 中的 tool_use 交给 StreamingToolExecutor 边流边跑；
  流结束后：错误恢复（反应式压缩 / max_output_tokens 续写 / 截断续写 / 畸形 tool_use 重试 / 仅思考提示）
  → 无工具调用：Stop 钩子（runStopHooksAndFinish）→ {reason:"completed"}
  → 有工具调用：收集剩余工具结果、附件（getAttachments #Bxr）、工具使用摘要
                → state = {messages:[...请求消息, ...assistant, ...toolResults], transition:"next_turn"} → NEXT_ROUND
```

## 3. 模块地图（总览）

| 区域 | 主要模块 | 本手册章节 |
|---|---|---|
| 主循环 | `query.ts`、`query/deps.ts`、`query/config.ts`、`query/stopHooks.ts`、`QueryEngine.ts` | 4、5 |
| Messages API 调用 | `services/api/claude.ts` | 6 |
| 客户端、beta、日志、成本 | `services/api/client.ts`、`utils/betas.ts`、`utils/api.ts`、`services/api/logging.ts`、`services/api/promptCacheBreakDetection.ts`、`cost-tracker.ts` 等 | 7 |
| 重试、错误、限额 | `services/api/withRetry.ts`、`services/api/errors.ts`、`services/api/errorUtils.ts`、`services/claudeAiLimits.ts`、`services/rateLimitMessages.ts` 等 | 8 |
| 系统提示词与常量 | `constants/prompts.ts`、`constants/system.ts`、`context.ts`、`utils/systemPrompt.ts`、`constants/*`、`context/*` | 9 |
| 消息模型与规范化 | `utils/messages.ts`、`utils/messages/*`、`utils/messageQueueManager.ts`、`utils/queryHelpers.ts`、`utils/conversationRecovery.ts` | 10 |
| 附件与工具结果预算 | `utils/attachments.ts`、`utils/toolResultStorage.ts` | 11 |
| 上下文压缩与 token | `services/compact/*`、`utils/tokens.ts`、`services/tokenEstimation.ts`、`utils/context*.ts`、各类摘要/建议服务 | 12 |
| 模型、effort、thinking、fast mode | `utils/model/*`、`utils/modelCost.ts`、`utils/effort.ts`、`utils/thinking.ts`、`utils/fastMode.ts`、`utils/advisor.ts` | 13 |

全部 120 个模块的一句话说明在 `naming/modules-query.json`，声明级说明在 `naming/docs-query.jsonl`。生成器会把它们写进阅读树的模块头注释和声明前的 JSDoc。

## 4. 查询主循环 `query.ts`

### 4.1 入口

- `query.ts · query`（`chunk-ha3km179.js#J$`，旧版同名）：
  1. 确保工具初始化（`awaitArtifactRosterSafe(tools)`，`chunk-s61vbvea.js#Xnt`）。
  2. `transcriptTap = $a(toolUseContext, messages)` 建转录 tap：assistant 带 tool_use 时先落盘。
  3. 运行 queryLoop。主线程且开了代理观察者（`isObserverAgentsEnabled()`）时走 `queryWithObserverTap`（`#iy`）。
  4. 结束时为本轮吸收的命令发 `command_lifecycle`（completed/cancelled），记录 turn 的成败与统计（`$u`），返回终止结果。
  - 子代理退出时通知预计算模块（`subagent_exit`）。
- `queryWithObserverTap`（`#iy`）：
  - 主线程先挂代理观察者 `ensureMainObserver`（`chunk-wjzg3t3t.js#sWs`）；非交互会话会等它就绪。
  - 把每个事件交给观察者 `capture`，遇到 `stream_request_start` 时 `flushSegment`。
- `queryLoop(params, startedCommandUuids, deliveredPollEventUuids, transcriptTap)`（`#xc`，75 KB）：
  - 外层是 `while(true){ r = yield* runIterationRecordingErrors(); if (r !== NEXT_ROUND) return r }`。
  - 旧版每轮递归调用 `query()`；316 改成返回哨兵 `NEXT_ROUND = "next_round"`（`#Oo`），并把下一轮状态写进 `state`。

### 4.2 一轮迭代（`runIteration`，在 `#xc` 内）

`params` 的主要字段：`messages, systemPrompt, userContext, systemContext, canUseTool, toolUseContext, fallbackModel, querySource, maxTurns, taskBudget, skipCacheWrite, toolChoice, stickyBetas, deps, inPlaceOfFirstRequest, maxOutputTokensOverride, ...`。

循环状态 `state = {guards, messages, toolUseContext, compactTracking, transition, resumeIncompleteThinking, pendingToolUseSummary, prevToolDurations}`。其中 `guards` 是各类"只做一次/计数"的闸门：

- `maxOutputTokensRecoveryCount`、`hasAttemptedReactiveCompact`、`reactiveCompactDeeperPass`
- `thinkingOnlyNudged`、`malformedToolUseRetryCount`、`refusalRetrySpent`、`mcpEndTurnOverrideSpent`
- `stopHookActive`、`stopHookBlockingCount`、`turnCount`

按调用顺序：

1. **进入前**
   - `inPlaceOfFirstRequest`（headless 交接轮次）不发请求，直接回放。
   - `contextRouting = Bs(userContext, systemContext)` 决定用户/系统上下文怎样进请求（`bare`、`rendering`）。
   - `deps = productionDeps()`（`query/deps.ts · productionDeps` `#qu`：`callModel = queryModelWithStreaming`、`autocompact`、`uuid`、`now`）。
   - `queryConfig = buildQueryConfig()`（`#Lu`：`CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES`、`!CLAUDE_CODE_DISABLE_FAST_MODE`）。
2. **轮首折叠**
   - 等相关记忆召回预取，最多 2 秒（`startRelevantMemoryPrefetch`，见第 11 节）。
   - 把消息队列里可折叠的 poll 事件、队列命令吸收进本轮（`absorbQueuedPollEvents` `#Rc`、`createFoldCommandFilter` `#wc`、`isCommandFoldable` `#dy`），产出 `command_lifecycle started`。
3. **钩子已要求停止 / 宿主要求后台化**：返回 `hook_stopped` / `background_requested`。
4. **消息预处理**
   - 产出 `{type:"stream_request_start"}`。
   - `queryTracking = {chainId, depth+1, roundStartedAtMs}`。
   - `messagesForQuery` 先经 `transcriptTap.withArrivedRows`，再经 `utils/toolResultStorage.ts · applyToolResultBudget`（`chunk-jcnpfn31.js#eii`，大工具结果落盘，见第 11 节）。
5. **模型决定**
   - 主线程时 `checkModelSwitch`（`chunk-e6aww6q8.js#f8s`）比较"会话选定模型/实时切换"，采纳 `session_pick` 或 `availability_chain`，并记 `tengu_live_model_switch`。
   - `resolveModelAndFacts(messages, permissionMode)` 得到 `attemptModel` 与 `attemptModelFacts`：`by()` 处理 plan 模式、200k 以上用 opusplan 一类规则，见第 13 节。
6. **自动压缩**：`autocompactOutcome = yield* deps.autocompact(...)`，取值：
   - `rapid_refill_breaker_tripped` → 产出错误消息，返回 `rapid_refill_breaker`。
   - `compacted` → 记 `tengu_auto_compact_succeeded`，扣 taskBudget，重算上下文路由，用 `buildPostCompactMessages` 替换 `messagesForQuery`，更新 MagicDocs，产出压缩边界与摘要消息。
   - `failed` / `not_needed` → 更新连续失败计数。
   - 之后可能触发预计算压缩（`bzr`），供下次反应式压缩直接换用。
7. **其他轮首附加**：目录同步通知、PostModelSwitch 钩子上下文、请求公告（`usageLimitNotices`（`chunk-89vj35pq.js#Gjs`）、`Dr`/`ol`/`rl`）、`hu`/`pu` 两组公告、advisor 决议（`resolveAdvisorState`（`chunk-mw4q1ac2.js#kFs`）→ `advisorModel/advisorDeferred/advisorActive`）。
8. **渲染 system 提示词**
   - `promptRender = xu(messagesForQuery, systemPrompt, {...})` 负责会话级回放：工具描述、wire 形状、提醒折叠都沿用上次记录，保证提示词缓存稳定。
   - `apiSystemPrompt = asSystemPrompt(RYs(promptRender.systemPrompt, contextRouting.systemContext))`。
9. **用量额度模型同意**：模型需要 usage credits（如 Fable）且有对话框能力时，`requestDialog(E0e, …)` 询问用户：
   - 同意 → `recordCreditsOnlyConsent`（`chunk-e6aww6q8.js#qYs`）开启额度。
   - 拒绝/未答 → 退回允许的回退模型（`model_consent_fallback` 系统消息）。
   - `CLAUDE_CODE_NO_MODEL_FALLBACK` 设置时不替换模型，直接报错。
10. **阻断上限**：未压缩且 token 估算达到 `blocked` 级（`pse`）时产出 prompt-too-long 错误，返回 `blocking_limit`；能走反应式压缩时除外。
11. **请求循环** `while (needsAttempt)`，每次尝试：
    - 计算拒答回退链状态（服务器/客户端回退、静默重试）。
    - 准备 batching/secondary 提醒。
    - 调用 `deps.callModel({messages, systemPrompt, thinkingConfig, tools, signal, options:{model, fallbackModel: modelChain[chainIndex+1], querySource, effortValue, maxOutputTokensOverride, fastMode, stickyBetas, taskBudget, …约 90 个字段}})`。
    - 逐个处理流出的事件：
      - `tool_drain_tick` → `drainCompletedToolResults`。
      - `model_fallback_triggered` → 跳出，换 `modelChain` 下一个模型，产出 `query_model_change` 与 `system/model_fallback`（文案 `formatModelFallbackMessage` `#ay`）。
      - `attachment` / `hint_clears` → 更新 `messagesForQuery`；`hint_clears` 会删除对应 readFileState。
      - `server_fallback` / `refusal_no_fallback` / `fallback_request` → 服务器拒答回退：换模型、墓碑化（tombstone）已丢弃的消息、横幅提示。
      - `streaming_fallback_began` → 放弃本次尝试的工具，可能提示"Retrying without streaming"。
      - `stream_event` 的 `message_delta` → 记 `lastStopReason`，同步 usage 到改写过的副本。
      - `assistant` → 修正工具输入（`Nu`），记 `permissionModeAtRequest`；判断是否"扣住"不发给 UI（max_output_tokens、prompt-too-long、截断、安全监控）；否则 yield。最后放进 `assistantMessages`，tool_use 块交 `StreamingToolExecutor` 的 `addTool`（`services/tools/StreamingToolExecutor.ts`，`chunk-ha3km179.js#oi`），实现边流边执行。
    - 抛错时 `endTurnOnError` 补齐缺失的 tool_result（`yieldMissingToolResultBlocks` `#Tc`），返回 `model_error` / `image_error`。
12. **流结束后的恢复**（按顺序，命中即返回 NEXT_ROUND 或终止）：
    1. 安全监控拦截（`isSafetyMonitorBlockedMessage`，旧版名误为 createAssistantAPIErrorMessage，见第 10 节）→ 补 tool_result。
    2. `executePostSamplingHooks`。
    3. **反应式压缩**：被扣住的 prompt-too-long 或媒体过大 → 压缩或换用预计算压缩，`transition = reactive_compact_retry / precomputed_compact_swap`。做不到时把错误给用户（`tengu_ptl_surfaced_to_user`）。
    4. **max_output_tokens 续写**：`maxOutputTokensRecoveryCount` ≤ 上限时追加 meta 用户消息"继续"。若唯一回答只有一个 thinking 且 stop_reason=max_tokens，则走"续写未完成思考"（`shouldResumeIncompleteThinking` `#ry`）。`transition = max_output_tokens_recovery`。
    5. **截断续写**：输出过程中连接被切（`isRecoverableTruncatedResponse` `#ny`，开关 `tengu_truncated_response_recovery`），仅子代理/非交互主线程。`transition = truncated_response_recovery`。
    6. **畸形 tool_use**：stop_reason=tool_use 但没解析出工具 → 墓碑化后加提示重试一次（`malformed_tool_use_retry`）；再失败返回 `malformed_tool_use_exhausted`。
    7. **仅思考回答**：end_turn 但没有文本 → 提示一次（`thinking_only_retry`）；仍为空返回 `api_error`（empty_completion）。
    8. API 错误消息 → 返回 `api_error`（含 errorKind、isTransient、quotaLimits）。
    9. 没有工具调用 → `runStopHooksAndFinish`：Stop 钩子阻断时把阻断错误作为消息进入下一轮（`stop_hook_blocking`），连续阻断上限 `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`（默认 8）；`preventContinuation` → `stop_hook_prevented`；否则 `completed`。
13. **工具阶段**
    - 活动分类器、任务摘要。
    - `getRemainingResults()` 收集剩余工具结果。
    - 可选生成工具使用摘要（`generateToolUseSummary`，`pendingToolUseSummary`）。
    - 处理：中止（`aborted_tools`）、工具延迟（`tool_deferred`）、钩子阻止继续（`hook_stopped`）。
    - 工具或 MCP `_meta` 要求结束本轮时走 `endTurnFromToolResult`（`#oy`），只跑 PostToolBatch 与 Stop 钩子，不再调模型。
    - 循环唤醒（ScheduleWakeup 的 loop）单工具时也直接结束。
    - 之后跑 PostToolBatch 钩子，生成本轮附件（`getAttachments`，见第 11 节），MCP 工具中途刷新。
    - 到达 `maxTurns` 时产出 `max_turns_reached` 并返回 `max_turns`。
    - 否则写入下一轮状态：`transition:{reason:"next_turn"}`，`messages = [...messagesForQuery, ...assistantMessages, ...toolResults]`，返回 NEXT_ROUND。

终止原因（`reason`）全集：

- 正常与限制：`completed`、`max_turns`
- 钩子：`hook_stopped`、`stop_hook_prevented`
- 中止与交接：`aborted_streaming`、`aborted_tools`、`tool_deferred`、`background_requested`
- 上下文：`blocking_limit`、`rapid_refill_breaker`
- 错误：`model_error`、`image_error`、`api_error`、`malformed_tool_use_exhausted`

进入下一轮的 `transition: { reason }`：`next_turn`、`stop_hook_blocking`、`max_output_tokens_recovery`、`truncated_response_recovery`、`malformed_tool_use_retry`、`thinking_only_retry`、`reactive_compact_retry`、`precomputed_compact_swap`、`refusal_retry`。

### 4.3 其他

- `query/stopHooks.ts · handleStopHooks`（`#li`）：工具/MCP 结束本轮或循环定时唤醒时使用。保存 cacheSafeParams 供 /btw 等复用，跑 Stop/SubagentStop 钩子；这时阻断不会再调模型，只记日志。
- `query.ts · markClassifierTurnAborted`（`#po`）、`markClassifierApiFailure`（`#Eo`）：通知活动分类器（chunk-wd9kxbpn，仅主线程 REPL）。
- `query.ts · getInterruptedMessageId`（`#Gn`）：用户取消/远程取消时，用于中断消息定位。

## 5. headless 引擎与 `QueryEngine.ts`

旧版的 `QueryEngine` 类在 316 里拆散了。

- `QueryEngine.ts · ask`（`chunk-tyg7f3ek.js#hm`）：`runHeadlessStreaming` 调用。配置项可以是函数（`resolveLazy` `#kr`）；按权限模式定主循环模型与 thinking；用 `Mp`（未归属）构建 headless `ToolUseContext`（`runQuery: query`、`isNonInteractiveSession: true`）。
- 引擎主体 `chunk-tyg7f3ek.js#nI`（未归属，35 KB）返回 `{submitMessage, interrupt, setModel, getMessages, keepArrivedRows, appendMessages, appendsSettled, getReadFileState, dispose}`。
  - `submitMessage`（内部 `No` → `_i`）依次：
    1. 判断本轮不允许的工具。
    2. `BE` 处理交接/孤儿权限。
    3. `processUserInput`（`chunk-xx1vmpsq.js#jLt`，`querySource:"sdk"`）。
    4. 通过 `vpt({run: query, queryParams})` 驱动 `query()`。
  - `Dy` 类是 headless 每轮的驱动器，管理 abort、轮次结果与 SDK 事件。
  - 这些建议归入 `QueryEngine.ts`（见过程文档）。

## 6. Messages API 调用 `services/api/claude.ts`

### 6.1 调用层次

- `queryModelWithStreaming`（`chunk-e6aww6q8.js#LGt`）：主循环的 `deps.callModel`。它把 `FallbackTriggeredError` 转成 `{type:"model_fallback_triggered"}` 事件，交给 queryLoop 换模型。
- `queryModelWithoutStreaming`（`#Rse`）：辅助查询用，消费同一个流，只取最后一条 assistant。网关上小模型失败时改用主模型。
  - `queryHaiku`（`#gRe`）、`queryWithModel`（`#ekr`）、`queryHaikuWithFallback`（`#BB`）都建在它上面：单条用户消息、无工具、thinking 机械关闭（`{type:"disabled", mechanical:true}`）、默认不开缓存，VCR 可录放。
- `queryModelWithToolSearchRecovery`（`#__n`）：捕获 `ToolSearchRefusedError`（`#Yte`）后加一条 critical_system_reminder 重跑 `queryModel`，这时延迟工具全部内联。
- `queryModel`（`#e_n`，129 KB）：一次请求的全部逻辑，见下。

### 6.2 `queryModel` 的步骤

1. **闸门**：
   - off-switch（`tengu-off-switch`）、按模型封锁（`tengu-model-error-overrides`）：有 fallback 时抛 `FallbackTriggeredError(model_blocked)`，否则产出错误消息。
   - Bedrock 推理配置文件解析。
2. **beta 与模型事实**：
   - `betaList = lRn(model, {isAgenticQuery})`：基础 beta 表，见第 7 节。
   - `modelFacts = Ec(model)`：上下文窗口、max_output_tokens、thinking 能力，见第 13 节。
   - 按条件追加 advisor、thinking-token-count（`AU`）等 beta。
   - `betas = Svi(thinkingConfig, alwaysOn)` 是 thinking 配置。
   - 会话级 `conversation`（`OYo(stickyBetas)`）记住被 API 拒绝过的 beta（`latchBetaRefused`），本会话不再发送。
3. **工具**：
   - 跑工具 describe 钩子。
   - 判断工具搜索（`isToolSearchEnabled`）、延迟工具与按值内联工具。
   - 生成工具 schema（`toolSchemas`）。
   - 额外工具（advisor `ADVISOR_20260301`）。
4. **消息规整**：`normalizeMessagesForRequest`（`#Qyn`）依次：
   - 无工具搜索时剥离 tool_reference/caller；
   - `ensureToolResultPairing`；
   - 去 advisor 块；可选去 web search；
   - 媒体数量/字节上限（`stripExcessMediaItems` `#f_n`，上限来自 `tengu_keen_pudding`/`tengu_media_byte_cap`/`tengu_golden_dove`）；
   - 最后 `normalizeMessagesForAPI`（`#AT`，见第 10 节）。

   返回 `messagesForAPI` 与若干降级回调：`midConvFallback`、`toolChangeFallback`、`inlineToolsFallback`。
5. **system 块**：`buildSystemPromptBlocks(systemPrompt, cacheEnabled, {cacheTtl, scopeRefused})`（`#ZSr`）→ `s2o` 切分出计费头、身份行、静态/动态段。启用缓存时带 `cache_control: getCacheControl({scope, ttl})`（`#vX`）。见第 7、9 节。
6. **缓存 TTL**：`should1hCacheTTL`（`#PTe`）规则：
   - 代理覆盖优先；
   - 订阅用户、不在超额、模型在 `tengu_prompt_cache_1h_config` 白名单内 → 1h；
   - `tengu_tidy_frost` 时活跃的 5m 缓存保持 5m；
   - `CLAUDE_CODE_MESSAGES_PROMPT_CACHE_TTL=5m` 强制消息缓存 5m。

   `getPromptCachingEnabled`（`#yfe`）读 `DISABLE_PROMPT_CACHING`，以及 `DISABLE_PROMPT_CACHING_HAIKU/SONNET/OPUS/FABLE/MYTHOS`。
7. **构建请求参数** `buildRequestParams(retryContext)`（旧版名 paramsFromContext；在 `#e_n` 内，每次重试重建）：
   - `paramsFromContext(beta)`：该 beta 被拒过则过滤掉。
   - `extraBodyParams = getExtraBodyParams(bedrockBetas)`（`#RV`，`CLAUDE_CODE_EXTRA_BODY`）。
   - `output_config`：effort（`applyEffortToOutputConfig`）、task_budget（`configureTaskBudgetParams` `#sSr`）、结构化输出 format。
   - `max_tokens = min(retryContext.maxTokensOverride || maxOutputTokensOverride || 模型默认, 模型上限)`。
   - `thinking`：
     - 模型支持 adaptive 时为 `{type:"adaptive", display}`；
     - 否则 `{type:"enabled", budget_tokens: clamp(1024, max_tokens-1), display}`；
     - 第一方且显式关闭时为 `{type:"disabled"}`，多余键由 `sanitizeDisabledThinking`（`#rSr`）去掉。
     - display 由会话设置与 highlights/updates 逻辑决定。
     - thinking-binding-controls 开启时附 `block_binding`。
   - thinking 开启时，`tool_choice: {type:"tool"}` 降为 auto；thinking 机械关闭且模型限制时 effort 被钳制。
   - `context_management = getAPIContextManagement({hasThinking, toolClearing})`（`chunk-e6aww6q8.js#$7t`，见第 12 节），只在带 context-management beta 时发送。
   - `speed:"fast"`：fast mode 条件见第 13 节。
   - `diagnostics.previous_message_id`：第一方、agentic 查询时发送。
   - `metadata = getAPIMetadata()`（`chunk-w5ndchqs.js#vVe`）。
   - 消息加缓存断点：`addCacheBreakpoints`（`#YSr`）用 `kun()` 选标记位置，再转成 `userMessageToMessageParam`/`assistantMessageToMessageParam`。实测缓存断点在"最后一条消息的最后一块"。
   - `CLAUDE_CODE_SIMULATE_PROXY_USAGE` 模拟代理：去掉 beta 与缓存标记，用于测试。
   - 请求体键顺序（实测）：`model, messages, system, tools, tool_choice?, metadata, max_tokens, thinking, temperature?, context_management, ..., output_config, speed?, diagnostics?`，最后由 `create` 加 `stream:true`。temperature 只在 thinking 关闭且模型接受时发送，默认 1。
8. **发送**：`withRetry(() => getAnthropicClient({maxRetries:0, model, source, …}), async (anthropic, attempt, retryContext) => {...}, {model, fallbackModel, onError, …})`。
   - 每次尝试：
     - 建请求头（`buildRequestTraceHeaders` `#i_n`：x-client-request-id、traceparent；`anthropic-usage-limit`；压缩相关 `x-claude-code-context-compacted`/`x-claude-code-compaction`；`x-claude-code-prev-tool-durations`；fallback 标记头）。
     - 慢首字节告警（`CLAUDE_SLOW_FIRST_BYTE_MS`，默认 30 秒）。
     - `anthropic.beta.messages.create({...params, stream:true}, {signal, headers}).withResponse()`。
   - `onError` 依次识别约 40 种可自愈的错误，返回 `retry:<原因>` 标签。去 beta、去 `thinking.display`、去媒体块、降 effort、剥 advisor、去 web search 等都在这里决定，执行见第 8 节。
   - 标签全集（`grep "retry:"`）：`afk-beta, advisor-entry-refused, advisor-strip, api-system-cache-demote, beta-rejected:*, cache-keepalive-beta, context-1m-beta, context-hint, dispatch-header-strip, effort-unsupported, fallback-credit-*, inline-tools-strip, kept-reminder-*, media-item-limit:*, media-strip*, mid-conv-system, org-effort-cap:*, per-turn-timing-strip, prefix-lock-strip-*, prompt-end-mark, safeguards*, server-fallback-*, structured-outputs-unsupported, tether-*, thinking-binding-controls, thinking-display-highlights, thinking-display-unclaimed:*, thinking-resumption-beta, thinking-signature-strip, thinking-token-count-beta, thinking-token-count-unclaimed, thinking-type, tool-change-strip, web-search-strip`。
9. **SSE 解析**：流先过 `withStreamHeartbeat`（`#MSr`，空闲插 ping），有流看门狗与空闲超时（`CLAUDE_ENABLE_STREAM_WATCHDOG`，默认开）。按事件：
   - `message_start`：建 partial message，记 `cache_miss_reason`（diagnostics）。
   - `content_block_start` / `content_block_delta`：累积 text/thinking/signature/tool_use 的 input_json。
   - `content_block_stop`：用 `normalizeContentFromAPI` 把这个块变成一条独立的 assistant 消息并 yield。
     - 一个 API 响应会变成多条 assistant 消息，共享 `message.id`，带 `apiBlockIndex/requestId/requestedModel/effort`。
     - tool_use 在这里交给主循环开始执行。
   - `message_delta`：`updateUsage`（`#mRe`）累积 usage，写 stop_reason、`context_management`；处理 `max_tokens`/`model_context_window_exceeded`（`getMaxTokensStopMessage` `#t_n`）。
   - `message_stop`：结束。
   - 每个事件另以 `{type:"stream_event", event, ttftMs?, apiMessageId?}` 转发，供 SDK `--include-partial-messages` 与 UI 使用。
   - 流异常的处理：
     - 没收到 `message_start`、或没有完成的内容块 → `tengu_stream_no_events`，回退非流式（`executeNonStreamingRequest` `#fSr`，`adjustParamsForNonStreaming` `#tkr`，超时 `getNonstreamingFallbackTimeoutMs`）。
     - 中途断开 → 按流式重试决策（第 8 节）重试或回退。
10. **收尾**：
    - 成本 `addToTotalSessionCost`（cost-tracker，见第 7 节）。
    - 提示词缓存断裂检测（`checkResponseForCacheBreak`，第 7 节）。
    - API 指标日志 `logAPISuccess`/`logAPIError`（`services/api/logging.ts`）。

## 7. API 客户端、beta 头、请求日志与成本

> 子区域 client；命名与声明说明在 naming/semantic-query.jsonl、naming/docs-query.jsonl。
> 范围：`services/api/client.ts`、`utils/betas.ts`、`utils/api.ts`、`utils/apiPreconnect.ts`、`services/api/logging.ts`、`services/api/dumpPrompts.ts`、`services/api/emptyUsage.ts`、`services/api/firstTokenDate.ts`、`services/api/promptCacheBreakDetection.ts`、`services/vcr.ts`、`utils/queryProfiler.ts`、`cost-tracker.ts`、`costHook.ts`、`query/config.ts`、`query/deps.ts`、`query/stopHooks.ts`、`query/tokenBudget.ts`、`QueryEngine.ts`，以及切分更新后新进入 `utils/effort.ts` 的 64 个声明。函数名为本轮语义名（或旧版名/门面名），括号内为声明 id。

### 1. 模块地图

| 模块 | 职责 |
|---|---|
| `services/api/client.ts` | 创建 Anthropic SDK 客户端（8 个提供商分支）、默认请求头、认证、超时；`buildFetch` 包装 fetch（x-client-request-id、gzip、首字节/字节流看门狗、Bedrock 内容类型守卫） |
| `utils/betas.ts` | `anthropic-beta` 列表：基础条件表 + 每轮附加表 + SDK betas，第三方过滤；模型能力判定 |
| `utils/api.ts` | 工具 → API `tools[]` 元素（缓存键、strict、eager_input_streaming、defer_loading）；system 提示词分块 `splitSysPromptPrefix`；工具输入规整；上下文规模遥测 |
| `utils/apiPreconnect.ts` | 启动时 HEAD `/api/hello` 预热连接 |
| `services/api/logging.ts` | `tengu_api_query` / `tengu_api_success` / `tengu_api_error`、拒答事件、请求内容统计、网关识别 |
| `services/api/promptCacheBreakDetection.ts` | 提示词缓存断裂检测（请求前记哈希、响应后比 cache_read） |
| `services/api/dumpPrompts.ts` | 调试转储请求体到 `dump-prompts/*.jsonl` |
| `services/api/emptyUsage.ts`、`firstTokenDate.ts` | 全零 usage；组织首次使用日期 |
| `services/vcr.ts` | 测试录放（本构建关闭） |
| `utils/queryProfiler.ts` | 查询阶段剖析检查点（本构建关闭） |
| `cost-tracker.ts` | 每次响应累加成本与 token、/cost 与退出汇总 |
| `costHook.ts` | 切分后为空（原混入的 Linux 沙箱清理代码已移出） |
| `query/config.ts`、`query/deps.ts`、`query/stopHooks.ts` | queryLoop 的配置快照、可注入依赖、Stop 钩子收尾 |
| `query/tokenBudget.ts` | 切分后只剩归错的 PowerShell 常量（见建议） |
| `QueryEngine.ts` | headless 引擎入口 `ask()` |

### 2. 关键流程

#### 2.1 客户端创建：`services/api/client.ts · getAnthropicClient`（`chunk-hwmsct5x.js#MN`）

queryModel 每次尝试都在 `withRetry(() => getAnthropicClient({maxRetries: 0, model, source, promptId, ...}), ...)` 里取客户端（`chunk-e6aww6q8.js#e_n`）。`maxRetries: 0`，所以 SDK 不重试，`X-Stainless-Retry-Count` 恒为 0（实测一致），重试全部在 withRetry。

1. **默认头** `defaultHeaders`：
   - `Fl`（`chunk-hwmsct5x.js#Fl`，写作时称 getBaseAppHeaders、未归属；现在 `services/api/requestHeaders.ts`，仍为压缩名）：`x-app: cli`（后台会话 `cli-bg`）、`User-Agent: claude-cli/<版本> (<external|…>, <entrypoint>[, agent-sdk/…][, client-app/…])`（`chunk-aepeg2w5.js#wU`）、`X-Claude-Code-Session-Id`。
   - `getCustomHeaderMap`（`#v4t`）：`ANTHROPIC_CUSTOM_HEADERS`（`getCustomHeaders` `chunk-bwbq4xvm.js#ile` 每行 `名: 值`；HIPAA 组织丢弃其中 `anthropic-beta`）；桌面版加 `anthropic-client-platform: desktop_app`、`anthropic-client-version`；cowork 加 `x-cowork-enrollment`。
   - `chunk-bwbq4xvm.js#oj`：`ANTHROPIC_CUSTOM_HEADERS` 里的 `anthropic-beta` 单独合并。
   - 环境注入：`x-claude-remote-container-id`（`CLAUDE_CODE_CONTAINER_ID`）、`x-claude-remote-session-id`、`x-claude-remote-session-origin`、`x-client-app`（`CLAUDE_AGENT_SDK_CLIENT_APP`）、子代理 `x-claude-code-agent-id` / `x-claude-code-parent-agent-id`。
   - 网关提示头（`chunk-hwmsct5x.js#gir`：`CLAUDE_CODE_GATEWAY_HINT_HEADERS`，或第一方官方 API，或 GrowthBook `tengu_splendid_sutton`）开启时：`x-claude-code-request-class`（main/subagent/workflow/compaction/auxiliary/side_reply，`chunk-aepeg2w5.js#LEi`）、`x-claude-code-agent-type`、`x-claude-code-prompt-id`。实测第一方形状多出的 `x-claude-code-prompt-id`、`x-claude-code-request-class: main` 就来自这里。
   - `CLAUDE_CODE_ADDITIONAL_PROTECTION` → `x-anthropic-additional-protection: true`。
2. **认证**：OAuth 刷新（`checkAndRefreshOAuthTokenIfNeededWithOutcome`）→ 是否 claude.ai 订阅（`hasInferenceScope`）；非订阅时 `applyAuthTokenHeader`（`#lw`）把 `ANTHROPIC_AUTH_TOKEN` 或 apiKeyHelper 写成 `Authorization: Bearer`。
3. **公共选项** `clientOptions`：`timeout` = `API_TIMEOUT_MS` 或托管配置 `api_timeout_ms`，缺省 600 s（实测 `X-Stainless-Timeout: 600`）；`dangerouslyAllowBrowser: true`（SDK 因此发 `anthropic-dangerous-direct-browser-access: true`）；`fetchOptions` 来自代理层 `sa()`（`utils/proxy.ts`），`fetch` = `buildFetch`。
4. **按提供商分支**（`getProviderForModel(model)`）：
   - `gateway`：云网关 JWT（`Authorization: Bearer <jwt>`，baseURL 为网关 URL；未登录/过期抛错）。
   - `bedrock`：`AnthropicBedrock`（`chunk-h87x8cg3.js`）；`AWS_BEARER_TOKEN_BEDROCK` 或 AWS 凭证链；`ANTHROPIC_BEDROCK_SERVICE_TIER` → `X-Amzn-Bedrock-Service-Tier`；`CLAUDE_CODE_SKIP_BEDROCK_AUTH`。
   - `foundry`：`AnthropicFoundry`；`ANTHROPIC_FOUNDRY_AUTH_TOKEN` / `ANTHROPIC_FOUNDRY_API_KEY` / Azure `DefaultAzureCredential`；`ANTHROPIC_FOUNDRY_RESOURCE` 校验。
   - `anthropicAws`、`anthropicGoogleCloud`、`mantle`、`vertex`：各自 SDK 子类与凭证链，`CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH`/`CLAUDE_CODE_SKIP_ANTHROPIC_GOOGLE_CLOUD_AUTH`/`CLAUDE_CODE_SKIP_MANTLE_AUTH`/`CLAUDE_CODE_SKIP_VERTEX_AUTH` 跳过认证。
   - 第一方（默认）：API key（`x-api-key`）或 OAuth（`Authorization: Bearer`），`ANTHROPIC_BASE_URL` 覆盖 baseURL；`validateAuthHeaders`（`chunk-aepeg2w5.js#Vto`）校验头值合法；令牌在构建过程中变了就递归重建。
5. **base URL**：`getProviderBaseUrl`（`#uw`）。

#### 2.2 fetch 包装：`buildFetch`（`chunk-hwmsct5x.js#bw`）

每次请求：第一方直连（`isDirectAnthropicEndpoint` `#Nl`）时补 `x-client-request-id`（UUID）——实测第一方形状的第三个额外头；拒答回退锁存时加 `x-is-refusal-fallback`/`x-cc-fallback-latched-by`；慢速用量时 `anthropic-usage-limit: slow`；工具使用头；打 `[API REQUEST] <path> x-client-request-id=… source=…` 调试日志。大请求体 gzip（`requestBodyEncoding` 遥测）。首字节看门狗 `getFirstByteWatchdogPlan`（`#mw`）+ `fetchWithFirstByteTimeout`（`#gw`）：窗口 = 首字节超时（`CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS`，否则字节流空闲超时）+ 每 32 KB 请求体加 1 s。响应：Bedrock 流缺 content-type 补默认、类型不对抛 `BedrockUnexpectedContentTypeError`（`#Rh`）；SSE/eventstream 响应体套 `withByteIdleWatchdog`（`#_w`），超时抛 `StreamIdleTimeoutError`（`#Oir`），系统睡眠抛 `StreamSuspendedError`（`#k4t`）。

超时常量：`MIN_TIMEOUT_MS` 10 s、`MAX_TIMEOUT_MS` 30 min、第一方字节流空闲默认 180 s（`getByteStreamIdleTimeoutMs` `#dw`，GrowthBook `tengu_byte_stream_idle_timeout_ms`）；流空闲 `getStreamIdleTimeoutMs`（`#xEn`）≥300 s。

#### 2.3 beta 头组装：`utils/betas.ts`

queryModel 开头 `getMergedBetas(model, {isAgenticQuery})`（`chunk-aepeg2w5.js#lRn`）：

1. `getModelBetas`（`#one`）= `getAllModelBetas`（`#aRn`，缓存）→ `computeAllModelBetas`（`#m$`）按 **`MODEL_BETA_RULES`**（`chunk-aepeg2w5.js#f$`，@483833）逐条判断：

| beta | header | 条件 |
|---|---|---|
| claude_code | `claude-code-20250219` | 模型不是 haiku（代理式查询时 getMergedBetas 也会补） |
| oauth_auth | `oauth-2025-04-20` | claude.ai 订阅，或第一方系 + 无 API key + WIF 认证 |
| long_context | `context-1m-2025-08-07` | 选了 1M 变体且模型本身不是原生 1M |
| interleaved_thinking | `interleaved-thinking-2025-05-14` | 非 `DISABLE_INTERLEAVED_THINKING` 且 `modelSupportsISP`（haiku-4-5、3.x 不支持） |
| redact_thinking | `redact-thinking-2026-02-12` | 第一方 beta 可发 + 交错思考 + 交互式会话 + 未开启 showThinkingSummaries |
| context_management | `context-management-2025-06-27` | 第一方系提供商且未禁实验 beta，且 `modelSupportsContextManagement` |
| structured_outputs | `structured-outputs-2025-12-15` | 同上 + 模型支持 + GrowthBook `tengu_tool_pear` |
| web_search | `web-search-2025-03-05` | vertex 支持的模型、foundry |
| prompt_caching_scope | `prompt-caching-scope-2026-01-05` | `shouldUseGlobalCacheScope`（`#j3`）：第一方 beta 可发 + `Oi()`（官方 API 或 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL`）+ firstParty/anthropicAws |
| mid_conversation_system | （无 header，已 GA 的标记） | `shouldUseMidConvSystem` |

   然后追加 `ANTHROPIC_BETAS`（HIPAA 时忽略）。Bedrock 把 interleaved-thinking、context-1m、tool-search-tool 放进请求体 `anthropic_beta`（`getBedrockExtraBodyParamsBetas` `#qss`）；本会话被 API 拒绝过的 beta 去掉。
2. **`PER_TURN_BETA_RULES`**（`chunk-aepeg2w5.js#f$` 第二个绑定，@484523）：`per-turn-control-2026-07-01`（per_turn_timing 或模型支持 per_turn_effort）、`timing-2026-09-09`（`CLAUDE_CODE_PER_TURN_TIMING`）、`mid-conversation-tool-changes-2026-07-01`（`modelTakesToolAdditions`）、`inline-tools-2026-09-15`（再加 `CLAUDE_CODE_INLINE_TOOLS`）。
3. SDK `betas`：订阅用户忽略；非第一方系只保留 `THIRD_PARTY_SAFE_BETAS`（`#lA`）。
4. queryModel 里再按请求追加（`chunk-e6aww6q8.js#e_n` 的 `buildRequestParams`）：`thinking-token-count-2026-05-13`（模型支持且 thinking 可用）、`effort-2025-11-24`（`applyEffortToOutputConfig` 写 output_config.effort 时）、工具搜索 `advanced-tool-use-2025-11-20`（第一方）/`tool-search-tool-2025-10-19`（第三方，`#ult`）、`task-budgets`、`fast-mode-2026-02-01`、`extended-cache-ttl`、`prompt-caching-evict`、`cache-keepalive`、`afk-mode`、`dangerous-tool-use`、`thinking-display-updates`、`context-hint` 等；`thinking-binding-controls-2026-08-01` 在第一方 beta 可发且（非 OAuth 代理或 `ute()`）时加入；`cache-diagnosis-2026-04-07` 由 `zyn()`（`chunk-e6aww6q8.js#zyn`，未归属）判定：第一方且 `qae()`（官方 API）。最后 `paramsFromContext` 过滤本会话被拒的 beta，`CLAUDE_CODE_SIMULATE_PROXY_USAGE` 时只留 oauth。

**对照实测（verify.md 7.2/7.3）**：第三方形状（自定义 base URL）8 个 = claude-code（规则 1）+ interleaved-thinking + context-management（基础表）+ per-turn-control + mid-conversation-tool-changes（每轮表）+ thinking-token-count + effort + advanced-tool-use（queryModel 追加）。provider 仍是 `firstParty`（只是 `Oi()` 为假），所以第一方专属 beta 照发。第一方形状多出的 3 个都以 `Oi()` 为门：prompt-caching-scope（`#j3`）、thinking-binding-controls（`ute()` 分支）、cache-diagnosis（`zyn → qae`）。

#### 2.4 工具定义与 system 分块：`utils/api.ts`

- `toolToApiDefinition`（`chunk-e6aww6q8.js#gB`）：由几十个特性位（`K:` 编译目录、`L:` lean 提示词、`F:` 细粒度流、`S:` 工具搜索在场、`X:` structured outputs、Agent/Bash/Skill 等工具的状态位……）+ 工具名/schema 键组成缓存键；有提示词快照记录时复用记录的描述与 schema（`tryReuseRecordedToolEntry`），否则 `toolToAPISchema`（`#z8t`）+ 描述（`getToolDescriptionText`）生成 `{name, description, input_schema}`，再按条件加 `strict`、`eager_input_streaming`（`isFineGrainedToolStreamingEnabled`：`CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING`、GrowthBook `tengu_fgts`）、`defer_loading`、`cache_control`、`citations`。实验 beta 禁用时只保留 name/description/input_schema/cache_control(/defer_loading)。
- `splitSysPromptPrefix`（`chunk-w5ndchqs.js#s2o`）是 `buildSystemPromptBlocks`（`services/api/claude.ts`）的基础：
  - 计费头 `x-anthropic-billing-header:…` → 独立块，`cacheScope: null`（实测 system[0]）；
  - 身份行（三选一，`chunk-w5ndchqs.js` 的 `mt` 数组：CLI / Agent SDK 内 CLI / Claude Agent SDK）→ 独立块；
  - `# Reporting outcomes` 段单独一块；
  - 有 `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__` 且 `shouldUseGlobalCacheScope` 时：边界前为静态块（`cacheScope: "global"`，可再按 `__SYSTEM_PROMPT_STATIC_BREAKPOINT__` 切），边界后为动态块（`org` 或 null）；身份行此时无缓存 → 实测第一方 4 块、身份行无 cache_control、静态块 `scope: global`；
  - 否则身份行 `org`、其余合成一块 `org` → 实测第三方 3 块。
  - 事件：`tengu_sysprompt_boundary_found` / `tengu_sysprompt_missing_boundary_marker` / `tengu_sysprompt_using_tool_based_cache`。
- `appendSystemContextToPrompt`（`#RYs`）把 systemContext 拼到 system 末尾；`prependUserContextReminder`（`#xYs`）把 userContext 包成第一条 meta 用户消息（bare 模式用）。

#### 2.5 遥测与日志：`services/api/logging.ts`

- 发请求前 `logAPIQuery`（`#Mun`）→ `tengu_api_query`。
- 成功：`logAPISuccessAndDuration`（`#Lun`）统计输出文本/思考/工具输入长度、`detectGateway`（`#xJ`，按响应头前缀 litellm/helicone/portkey/cloudflare/kong/braintrust/bifrost 或 databricks 主机）→ `logAPISuccess`（`#ghr`）→ `tengu_api_success`。
- 失败：`logAPIError`（`#Oun`）→ `tengu_api_error`。
- 拒答：`logApiRefusal`（`#Nte`）→ `api_refusal`。
- 请求内容统计 `requestContentStats`（`#uhr`）、`sentImageStats`（`#Dun`）、`requestPrefixStats`（`#Umn`）。

#### 2.6 提示词缓存断裂检测：`services/api/promptCacheBreakDetection.ts`

请求前 `recordPromptState`（`chunk-g54kbxqw.js#Upi`）按跟踪键（`getTrackingKey` `#OYe`：repl_main_thread / sdk / agent:* / compact_fork）记录 system、工具、模型、fast、cache_control、beta、auto mode、超额、effort、thinking、额外 body 的哈希，与上次比对得 `pendingChanges`（`diffPromptScalars` `#Vs`）；`recordMessageHistory`（`#Bpi`）补消息哈希首差下标。响应后 `checkResponseForCacheBreak`（`#jpi`）：cache_read 低于上次 95% 且少 ≥2000 token（`isCacheReadDrop` `#Olr`）视为断裂，结合距上次回答是否超过 5 min/1 h 判断 TTL 过期，`reportCacheBreak`（`#Ns`）上报；人可读原因由 `#za` 生成，并显示在 `/cost` 的 "Prompt cache (main)" 行（`cost-tracker.ts · formatPromptCacheStatus`）。压缩、缓存删除通过 `notifyCompaction`（`#okn`）、`notifyCacheDeletion`（`#rkn`）重置基线。haiku 不检测。服务器 `cache-diagnosis` beta 返回的诊断由 `logCacheDiagnosisReceived`（`#Wpi`）上报。

#### 2.7 成本：`cost-tracker.ts`

queryModel 在每个响应结束时调用 `addToTotalSessionCost(cost, usage, model, querySource, effort, spawnedBySkill, activeSkill, activeMcpServer, activeMcpTool)`（`chunk-e6aww6q8.js#jtt`）：`addToTotalModelUsage`（`#QUt`）累加按模型 token（含 thinking、5m/1h 缓存写入、web search）与成本，更新总成本、OTel 成本/token 计数器（属性 model/speed/query_source/effort/归因）；usage 里的 advisor 子调用单独计价、记 `tengu_advisor_tool_token_usage` 后递归累加。`/cost` 与退出时 `formatTotalCost`（`#ORe`）输出总成本、API/墙钟时长、增删行、按模型用量、提示词缓存状态；`saveCurrentSessionCosts`（`#gGe`）写项目配置。

#### 2.8 queryLoop 依赖与收尾：`query/`

- `productionDeps`（`chunk-ha3km179.js#qu`）：`callModel = queryModelWithStreaming`、`autocompact`、`uuid`、`now`。
- `buildQueryConfig`（`chunk-ha3km179.js#Lu`）：`emitToolUseSummaries = CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES`、`fastModeEnabled = !CLAUDE_CODE_DISABLE_FAST_MODE`、`isAnt: false`。
- `handleStopHooks`（`chunk-ha3km179.js#li`）：工具/MCP 结束本轮或循环定时唤醒时调用，保存 cacheSafeParams、跑 Stop/SubagentStop 钩子（阻断被丢弃只记日志）、汇总钩子错误为通知。正常轮次末尾的 Stop 钩子走 queryLoop 内的 `runStopHooksAndFinish`（`chunk-ha3km179.js#xc` 内）。

#### 2.9 headless 入口：`QueryEngine.ts · ask`（`chunk-tyg7f3ek.js#hm`）

`runHeadlessStreaming`（`cli/print.ts`）调用 `ask(sessionConfig, {abortController, userSpecifiedModel})`：配置项可以是函数（`resolveLazy` `#kr`），按权限模式决定主循环模型与 thinking，构建 headless `ToolUseContext`（`runQuery: query`、`isNonInteractiveSession: true`）。真正的引擎（`submitMessage`、`interrupt`、`setModel`、`getMessages`……）在未归属的 `chunk-tyg7f3ek.js#nI`，其 `submitMessage` 调 `processUserInput`（`chunk-xx1vmpsq.js#jLt`）后进入 `query()`（`chunk-ha3km179.js#J$`）。

### 3. 数据结构：请求头（第一方客户端）

| 头 | 来源 | 备注 |
|---|---|---|
| `x-app` | `chunk-hwmsct5x.js#Fl` | `cli` / `cli-bg` |
| `User-Agent` | `chunk-aepeg2w5.js#wU` | `claude-cli/2.1.316 (external, sdk-cli)` 等 |
| `X-Claude-Code-Session-Id` | `#Fl` | 会话 id |
| `x-api-key` / `Authorization` | SDK（apiKey/authToken）、`#lw` | 订阅为 Bearer |
| `anthropic-version`、`X-Stainless-*` | SDK | Retry-Count 恒 0；Timeout 600 |
| `anthropic-dangerous-direct-browser-access` | SDK（`dangerouslyAllowBrowser: true`） | |
| `anthropic-beta` | `utils/betas.ts` + queryModel | 见 2.3 |
| `x-claude-code-prompt-id`、`x-claude-code-request-class`、`x-claude-code-agent-type` | 网关提示头（`#gir`） | 第一方官方 API 默认开 |
| `x-client-request-id` | `buildFetch` | 仅直连 Anthropic |
| `x-claude-code-agent-id` / `parent-agent-id` | 子代理 | |
| `x-cc-context-compacted` 等压缩头、`x-claude-code-prev-tool-durations` | `services/api/claude.ts` | |
| `anthropic-usage-limit` | buildFetch / queryModel | slow / extended |
| `ANTHROPIC_CUSTOM_HEADERS` 各项 | `#v4t` | |

### 4. 环境变量、设置、开关

- 环境：`ANTHROPIC_CUSTOM_HEADERS`、`ANTHROPIC_BETAS`、`ANTHROPIC_BASE_URL`、`ANTHROPIC_AUTH_TOKEN`、`API_TIMEOUT_MS`、`CLAUDE_STREAM_IDLE_TIMEOUT_MS`、`CLAUDE_BYTE_STREAM_IDLE_TIMEOUT_MS`、`CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS`、`CLAUDE_ENABLE_BYTE_WATCHDOG(_BEDROCK)`、`CLAUDE_CODE_DISABLE_BEDROCK_CONTENT_TYPE_(DEFAULT|GUARD)`、`CLAUDE_CODE_GATEWAY_HINT_HEADERS`、`CLAUDE_CODE_ADDITIONAL_PROTECTION`、`CLAUDE_CODE_CONTAINER_ID`、`CLAUDE_CODE_REMOTE_SESSION_ID`、`CLAUDE_AGENT_SDK_CLIENT_APP`、`CLAUDE_AGENT_SDK_VERSION`、`CLAUDE_CODE_ENTRYPOINT`、`CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS`、`DISABLE_INTERLEAVED_THINKING`、`CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS`、`CLAUDE_CODE_FORCE_MID_CONVERSATION_SYSTEM`、`CLAUDE_CODE_PER_TURN_TIMING`、`CLAUDE_CODE_INLINE_TOOLS`、`CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING`、`CLAUDE_CODE_SIMULATE_PROXY_USAGE`、`CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES`、`CLAUDE_CODE_DISABLE_FAST_MODE`、`CLAUDE_CODE_PROFILE_QUERY`（本构建不生效）、`CLAUDE_CODE_EFFORT_LEVEL`、各提供商 `ANTHROPIC_*_BASE_URL`、`AWS_BEARER_TOKEN_BEDROCK`、`ANTHROPIC_BEDROCK_SERVICE_TIER`、`ANTHROPIC_FOUNDRY_*`、`CLAUDE_CODE_SKIP_…_AUTH`（BEDROCK、VERTEX、FOUNDRY、ANTHROPIC_AWS、ANTHROPIC_GOOGLE_CLOUD、MANTLE）、`_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL`。
- 设置：`modelSettings.<模型>.{effortLevel,maxEffortLevel}`、`effortLevel`、`maxEffortLevel`、托管网络配置 `api_timeout_ms`/`stream_idle_timeout_ms`/`body_idle_timeout`。
- GrowthBook：`tengu_splendid_sutton`（网关提示头）、`tengu_byte_stream_idle_timeout_ms`、`tengu_stream_watchdog_default_on`、`tengu_tool_pear`（structured outputs）、`tengu_fgts`、`tengu_velvety_kay`（effort 提示）、`tengu_witty_wand`（默认 effort）、`tengu_prompt_cache_1h_config`。

### 5. 与 2.1.88 的差异（有代码证据）

- 提供商从 firstParty/bedrock/vertex/foundry 扩到 8 个（新增 gateway、mantle、anthropicAws、anthropicGoogleCloud），`getAnthropicClient` 各有分支。
- beta 列表由 if 链改成条件表（`MODEL_BETA_RULES`、`PER_TURN_BETA_RULES`），新增 per-turn-control、timing、mid-conversation-tool-changes、inline-tools、thinking-token-count、thinking-binding-controls、thinking-display-updates、cache-diagnosis、cache-keepalive、prompt-caching-evict、dangerous-tool-use、server-side-fallback、fallback-credit、message-threads 等 header（`chunk-bwbq4xvm.js#i9t` 常量组）。
- 新增网关提示头（request-class/agent-type/prompt-id）、`x-client-request-id`、首字节与字节流看门狗、请求体 gzip、Bedrock 内容类型守卫。
- system 分块新增 `__SYSTEM_PROMPT_STATIC_BREAKPOINT__` 与独立的 "# Reporting outcomes" 块。
- effort：新增 xhigh、ultracode 关键字、组织/设置上限（`getEffortCap`）、按模型设置表（`buildEffortSettingsTable`）、会话 effort 三态。
- 缓存断裂检测扩展到 16 种变化类型，并接入服务器 cache diagnosis。

### 6. 未解之处

- `chunk-e6aww6q8.js#e_n` 内 thinking-binding-controls 的 `ute()`（`chunk-w7m8zp6e.js#ute`）在第三方形状下为何为假只读到一半（与 OAuth/自定义 base URL 有关）。
- `chunk-hwmsct5x.js#rh`（权限上下文头值，`eh()` 门控）具体写哪个头（`Lo()` 返回的头名）未展开。
- `chunk-tyg7f3ek.js#nI`（headless 引擎主体，约 35 KB）未归属、未命名。
- `chunk-g54kbxqw.js#jpi` 后半段（磁盘基线比对）细节未逐行核对。

## 8. 重试、错误与限额

> 子区域 errors；命名与声明说明在 naming/semantic-query.jsonl、naming/docs-query.jsonl。
### 模块地图

| 重组路径 | 职责 |
|---|---|
| `services/api/withRetry.ts` | `withRetry` 重试器：重试/退避/fallback/放弃的决策，凭证刷新，快速模式冷却，上下文溢出调整，执行 `onError` 返回的 `retry:<原因>` 标签，持久重试（RETRY_WATCHDOG）；另有流式重试决策表 `decideStreamRetry` 系列、`shouldRetry`、`FallbackTriggeredError`、`CannotRetryError` |
| `services/api/errors.ts` | 错误判定函数族（beta 被拒、thinking/effort/advisor/媒体/工具配对/结构化输出……），`getAssistantMessageFromError`（异常 → 面向用户的 assistant 错误消息），`classifyAPIError`（遥测分类），提示词过长、拒答、用量信用文案 |
| `services/api/errorUtils.ts` | 沿 cause 链取连接错误码 `extractConnectionErrorDetails`，`formatAPIError` 连接/SSL/超时文案，`summarizeApiError` 重试提示摘要 |
| `services/claudeAiLimits.ts` | 从 `anthropic-ratelimit-unified-*` 头计算订阅额度状态与早期预警，过期清理，配额探测请求 |
| `services/rateLimitMessages.ts` | 限额被拒/预警/使用 overage 时的提示文本与升级建议 |
| `services/mockRateLimits.ts`、`services/rateLimitMocking.ts` | 内部测试用限额模拟（伪造头、伪造 429） |
| `services/api/filesApi.ts` | Files API `/v1/files` 上传/下载/删除，3 次指数退避 |
| `services/api/sessionIngress.ts` | `session_ingress` 会话日志追加（Last-Uuid 乐观并发）与读取、teleport 事件分页 |
| `services/api/grove.ts` | Grove（消费者条款/数据使用）设置与通知配置 |
| `services/api/bootstrap.ts` | `/api/claude_cli/bootstrap`（网关为 `/v1/models` 发现）启动数据 |
| `services/api/overageCreditGrant.ts`、`referral.ts`、`usage.ts`、`ultrareviewQuota.ts`、`metricsOptOut.ts`、`adminRequests.ts` | overage 赠送活动、Guest Passes/推荐、/usage 利用率、ultrareview 配额、指标开关、云会话令牌与 GitHub App 重新同步 |

### 关键流程 1：一次模型请求的重试（withRetry）

调用链：`query.ts · queryLoop` → `deps.callModel = services/api/claude.ts · queryModelWithStreaming` → `queryModelWithToolSearchRecovery`（`chunk-e6aww6q8.js#__n`）→ `queryModel`（`#e_n`）→ `services/api/withRetry.ts · withRetry`（`chunk-e6aww6q8.js#DEe`）。

`withRetry(getClient, operation, options)` 是异步生成器（重试等待期间 `yield` 系统重试消息给 UI），返回 `operation` 的结果。`queryModel` 传入的 SDK 客户端 `maxRetries: 0`，所以 SDK 自己不重试，请求头 `X-Stainless-Retry-Count` 恒为 0（与 verify.md 7.4 实测一致），所有重试都由 `withRetry` 做。

1. 次数：`resolveMaxRetries`（`#F_r`）→ `getMaxRetriesFromEnv`（`#JQe`）：`CLAUDE_CODE_MAX_RETRIES`（非持久模式超过 15 时截到 15 并告警），默认 10；持久模式（`CLAUDE_CODE_RETRY_WATCHDOG` 且 `_SCOPE` 不是 `capacity`）默认 300。循环 `attempt = 1 … maxAttempts+1`。
2. 起手：若 accessFallbackModel 可用且当前模型无权访问，直接抛 `FallbackTriggeredError(…, "permission_denied")`。
3. 每次尝试前：
   - 本轮 API 尝试预算（`options.modelCallRetries?.takeApiAttempt()`）耗尽 → `CannotRetryError(NoApiAttemptsLeftError)`。
   - 上次是陈旧连接（ECONNRESET/EPIPE 一类）→ 关 keep-alive；配了 `CLAUDE_CODE_CLIENT_CERT` 时重载 mTLS。
   - 客户端为空、凭证轮换、或上次是 401/OAuth 吊销/云凭证错误 → 刷新凭证再 `getClient()`：OAuth 用 `Fk` 强制刷新（失败 2 次或磁盘满抛 `OAuthRefreshDiskFullError`；账号冻结抛 account_on_hold）；主机托管凭证调用宿主的 getHostAuthToken 回调（失败 2 次放弃）。
4. `operation(client, attempt, retryContext)`：`retryContext = {model, fastMode, maxTokensOverride}`，`queryModel` 用它构建请求参数（`buildRequestParams(retryContext)`）。成功即返回。
5. 出错后的判定顺序（`catch (error)`）：
   1. 直接放弃（`CannotRetryError`）：DLP 拒绝、安全监控拦截、输出内容过滤、需要验证、区域特性拒绝、路由最终答复（403 模型无权时先试 fallback）。
   2. 无响应计数（`noResponseRetryLedger`，非持久模式只允许 1 次）；非流式超时重试（`CLAUDE_CODE_NONSTREAMING_TIMEOUT_RETRIES`）。
   3. **`options.onError(error)` 自愈**：`queryModel` 的 onError 返回字符串标签 `retry:<原因>` 时，若本次 `withRetry` 调用还没用过这个标签（`usedRetryLabels` 集合），记下标签、`attempt--`、**不等待**立即重发；同一标签第二次出现不再触发。标签通常意味着 `queryModel` 已修改了闭包里的 beta 列表或消息（去掉某 beta、去 `thinking.display`、去媒体块、降 effort、剥 advisor/web search 内容……），下一次 `operation` 重建请求时生效。返回 `undefined` 则继续下面的普通判定。
   4. 低优先级等待（额度窗口快恢复时排队）：等待后 `attempt--`。
   5. 模型访问被拒/不存在、或 5xx（非持久模式）且有 fallback 模型 → `FallbackTriggeredError(reason = model_not_found / permission_denied / server_error)`；AWS 凭证未变而被拒时先探测 fallback 模型可达性。
   6. 快速模式（`fastModeActive`）遇 429/529：有 overage-disabled-reason 头则关快速模式立即重发；retry-after < 20 秒则短等后同模式重试；否则进入冷却（`max(retry-after 或 30 分钟, 10 分钟)`）、关 fastMode 重发。400 "does not support the `speed` parameter" / "Fast mode is not enabled" 同样关快速模式重发。
   7. 529：后台查询来源（不在 `RETRY_ON_529_QUERY_SOURCES`）直接放弃；对 Opus/Fable 等或有 fallback 时连续 3 次（`MAX_529_RETRIES` = 3，压缩名 Ute，在 `chunk-e6aww6q8.js#Bte` 语句内）→ 有 fallback 抛 `FallbackTriggeredError(…, "overloaded")`，否则抛 repeated 529 错误。
   8. 次数用尽 → `CannotRetryError`（401 且还有凭证续期机会时多给一次）。
   9. 远程 401/403、AWS/GCP 凭证错误、API key helper、WIF 交换各有独立的小上限（多为 2 次），同时清对应凭证缓存。
   10. `shouldRetry`（`#M_r`）为假：若是有状态码的 HTTP 错误、不在 `NON_RETRYABLE_STATUS_CODES` 且不命中 `NON_FALLBACK_ERROR_PREDICATES`、又有 fallback 模型 → `FallbackTriggeredError(…, "last_resort")`；否则 `CannotRetryError`（`api_request_non_retryable`）。
   11. 上下文溢出（400 "input length and `max_tokens` exceed context limit: a + b > c"，`parseMaxTokensContextOverflowError`）：`retryContext.maxTokensOverride = c - a - 1000`，低于 3000 或没进展则放弃，否则立即重发。
6. 等待时长：持久模式 429/529 用 `getRateLimitResetDelayMs`（`anthropic-ratelimit-unified-reset`）或指数退避（上限 5 分钟、总上限 6 小时、受 `CLAUDE_CODE_RETRY_WATCHDOG_MAX_WAIT_MS` / `_MAX_USAGE_LIMIT_WAIT_MS` 限制），按 30 秒分片等待，可被 `subscribeRetryWake` 唤醒，用量限额解除时（`isUsageLimitLifted`，`_USAGE_LIMIT_RECHECK_MS` 间隔检查）提前结束；远程 401/403 与 API key helper 等 1 秒；其他用 `xU(attempt, retry-after, 上限, random, 基数)`（基数 500ms、默认上限 32 秒，529 可用 `CLAUDE_CODE_OVERLOADED_RETRY_BASE_DELAY_MS`/`_MAX_DELAY_MS` 覆盖），非持久模式下延迟超过 max(60 秒, 上限×1.25) 直接放弃（`tengu_api_retry_after_too_long`）。
7. 每次等待记 `tengu_api_retry`（errorType 来自 `classifyAPIError`），并 `yield createSystemAPIErrorMessage(...)` + `onRetryStatus({kind:"retrying", attempt, maxRetries, retryInMs, deadline})`，UI 显示"Retrying in Ns"。

`shouldRetry`（`#M_r`）可重试：持久模式下 429/529；远程模式 401/403；API key helper 401/403；overloaded_error；上下文溢出；OAuth 401/吊销（订阅登录或宿主托管）；代理 407（可提示认证时）；`x-should-retry: true`；非 SSL 的网络错误；408/409；429（非订阅用户或企业或非额度类）；5xx。不可重试：用量信用不足、组织消费上限（`isSpendLimitError`）、`x-should-retry: false` 的 429/529/503。

#### 400 逐级去特性（与 verify.md 7.4 对照）

400 自愈的"决策"在 `queryModel` 的 `onError` 里（`chunk-e6aww6q8.js#e_n`），`withRetry` 只负责"每个标签一次、不计次、不等待"地重发。`onError` 依次尝试约 30 个专用识别器（mid-conv system、safeguards、tether、afk beta、advisor 剥离、媒体剥离、结构化输出、effort、thinking 类型/签名/绑定/highlights、web search、工具变更/内联工具……），都不命中时走"未认领"兜底链：`$gt → Hgt → i1(thinking-token-count) → Ogt(fallback credit) → SI → a1(tether/kept-reminder) → OLe → _Le(thinking.display) → L5(safeguards) → Tae(工具搜索)`。

实测"上游对所有请求回 400"时 6 个请求的由来：

| 请求 | 触发 | 标签 / 机制 |
|---|---|---|
| 1 | 原样 | — |
| 2 | `i1`：去掉 `thinking-token-count-2026-05-13` beta | `retry:thinking-token-count-unclaimed` |
| 3 | `_Le`：去掉 `thinking.display` | `retry:thinking-display-unclaimed:<字段>`（此处为 withoutField） |
| 4 | `Tae`：本次请求声明了延迟工具 → 抛 `ToolSearchRefusedError`（`#Yte`）；外层 `queryModelWithToolSearchRecovery` 以 `toolSearchRefusal` 重新调用一次 `queryModel`（去掉 `advanced-tool-use` beta，延迟工具全部内联，并加一条 critical_system_reminder）。新的 `queryModel` 调用重新构建 beta 列表，所以 thinking-token-count 又回来了 | 异常而非标签 |
| 5 | 新调用里的 `i1` | `retry:thinking-token-count-unclaimed` |
| 6 | 新调用里的 `_Le` | `retry:thinking-display-unclaimed:<字段>`（同上） |

第 6 次后所有识别器都返回空，`shouldRetry(400)` 为假 → `CannotRetryError` → `getAssistantMessageFromError` 生成 `API Error: 400 …` 文本。`-p` 模式把它写到 stdout 并退出 1。

### 关键流程 2：流式失败的重试决策

`decideStreamRetry`（`#nJe`）给 `queryModel` 的流处理用（计数结构 `EMPTY_RETRY_COUNTS`，`#gyn`）：
- `noResponse`：电脑休眠（suspended）→ `retryAfterSleep`（`tengu_tidy_cloud` 时最多 10 次）；断网且重连预算未用完 → reconnects+1；否则普通次数。
- `httpError` → `decideHttpErrorRetry`（`#V_r`）：529 → `decideOverloadedRetry`；持久模式 429 重试；fallback 可帮助 → `useFallbackModel`；408/409/429/5xx 计次；404 → `retryWithoutStreaming`。
- `streamFailed` → `decideStreamFailureRetry`（`#Y_r`）：按原因 × 进度（nothing/started/thinkingOnly/partialOutput/output）。已有正文输出时多为 `keepPartial`（保留部分回答）；只有 thinking 时按原因限次；其余多数改非流式重试一次（`retryWithoutStreaming`）。
- 断网重连次数：`getMaxReconnects`（`#vyn`）主线程订阅用户按 `tengu_patient_tide`（上限 300）。

### 关键流程 3：错误 → 用户文案

- `services/api/errors.ts · getAssistantMessageFromApiError`（`#WJ`）→ `getAssistantMessageFromError`（`#c3o`，16 KB）：按顺序匹配超时、图片/PDF、DLP、off-switch、模型封锁、用量信用与消费上限（`getUsageCreditsRequiredMessage`）、1M 上下文需信用、提示词过长（单轮会话用 `formatSingleExchangePromptTooLong`，可压缩时提示 `/compact`）、媒体错误、effort 与 thinking 冲突、工具配对错误（"API Error: 400 due to tool use concurrency issues" + `/rewind` 提示）、Opus 在 Pro 不可用、余额不足、各类认证（API key、OAuth 吊销、组织禁用 API key、云凭证、网关、`/login`）、模型不存在等，产出 `Fs({content, error, apiError, errorDetails})`，再补 `apiErrorStatus/requestId/apiErrorCode`。
- 文案前缀：`API_ERROR_MESSAGE_PREFIX = "API Error"`、`PROMPT_TOO_LONG_ERROR_MESSAGE = "Prompt is too long"`（`chunk-gr2vfhah.js#md`）；`startsWithApiErrorPrefix` 还识别 AWS/Google Cloud 凭证错误前缀。
- 连接类文案：`services/api/errorUtils.ts · formatAPIError`（`chunk-gr2vfhah.js#GEe`）：休眠断流、提前关闭、无响应、超时、SSL 证书逐码说明（建议 `NODE_EXTRA_CA_CERTS`）、HTML 错误页只取 `<title>`。
- 遥测分类：`classifyAPIError`（`#Zue`，约 60 类）；可重试粗分类 `categorizeRetryableAPIError`（`#q8n`）。
- 拒答：`getRefusalMessage`（`#nWt`）在 stop_reason=refusal 时生成安全策略说明与换模型提示。

### 关键流程 4：订阅限额头 → 状态 → 提示

- 每次响应头 → `services/claudeAiLimits.ts · computeNewLimitsFromHeaders`（`chunk-w5ndchqs.js#we`）读取 `anthropic-ratelimit-unified-status / -reset / -fallback / -representative-claim / -overage-status / -overage-reset / -overage-disabled-reason / -upgrade-paths / -overage-period-{monthly,channel}-utilization`，以及各窗口 `-{5h,7d,7d_oi,overage}-{utilization,reset,surpassed-threshold,status}`（`getHeaderBasedEarlyWarning`）。
- 早期预警 `getEarlyWarningFromHeaders`：先用服务器 surpassed-threshold，再用 `EARLY_WARNING_CONFIGS`（5h：利用率 ≥90% 且窗口时间进度 ≤72%；7d：75%/60%、50%/35%…）。
- 过期：`expireStaleLimits`（`chunk-0h4e7gnq.js#Sd`）重置时间已过清回 allowed，overage 重置已过剥离 overage 字段。
- 429 时 `extractQuotaStatusFromErrorHeaders`（`#aJs`）构造 rejected 状态。
- 文案：`services/rateLimitMessages.ts · getRateLimitMessage`（`#Qe`）→ 错误 `getLimitReachedText`（"You've hit your 5-hour limit …"）、预警 `getEarlyWarningText`、overage `getUsingOverageText`、升级建议 `getWarningUpsellText`（按 pro/max/team/enterprise）。

### 其他小 API（各一两句）

- Files API：`assertFilesApiAvailable` 只允许第一方，HIPAA 组织禁用上传；上传 `uploadFile`（multipart，500 MB 上限），下载到 `<配置目录>/<sessionId>/uploads`（禁止 `..`），删除返回 auth/forbidden/not_found；`retryWithBackoff` 3 次、500ms×2^n。
- Session ingress：`appendSessionLogImpl` PUT 带 `Last-Uuid`，409 时用服务器最后 uuid 修正，最多 10 次；读取支持 `CLAUDE_AFTER_LAST_COMPACT`；teleport 事件每页 1000 条最多 100 页。
- Grove：`/api/oauth/account/settings`（grove_enabled）、`/api/claude_code_grove`（通知配置、宽限期、提醒频率）、`grove_notice_viewed`；非交互模式 `checkGroveForNonInteractive`。
- Bootstrap：第一方 `/api/claude_cli/bootstrap`；网关模式需 `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY` 才查 `/v1/models`。
- overage 赠送（FotW）：`GET/POST /api/oauth/organizations/:orgUUID/overage_credit_grant?campaign=…`，本地缓存 `fotwEligibilityCache`、`fotwClaimedFeatures`、`fotwUpsellFulfilled`。
- Guest Passes/推荐：`passesEligibilityCache`，Max/Team 订阅才检查。
- `/usage`：`fetchUtilization` 带结果重放缓存，auth_rejected 时等待刷新再试。
- ultrareview 配额：`CLAUDE_CODE_ULTRAREVIEW_QUOTA_FIXTURE` 可注入。

### 数据结构

```ts
// withRetry 的第三个参数（从调用点读出的字段）
RetryOptions = { model, fallbackModel?, accessFallbackModel?, toolFreeHelper?, fastMode?, maxRetries?,
  initialConsecutive529Errors?, modelCallRetries?, noResponseRetryLedger?, clock?, random?, signal?,
  querySource?, credentials?, storageV5?, isNonStreamingRequest?, isResumePrefillRequest?,
  nonStreamingTimeoutMs?, failedStreamOutlastedTimeout?, modelIsRefusalFallbackTarget?,
  onError?: (err) => Promise<string | undefined>,      // "retry:<原因>"
  onRetryStatus?, subscribeRetryWake?, onQuotaWindowWait?, isUsageLimitLifted?, lowPriorityWait? }
RetryContext = { model, fastMode?, maxTokensOverride? }
FallbackTriggeredError { originalModel, fallbackModel, reason: "overloaded"|"permission_denied"|"model_not_found"|"server_error"|"last_resort"|"model_blocked", originalError, blockMessage }
CannotRetryError { originalError, retryContext }  // name = "RetryError"
StreamRetryCounts = { retries, sleptThrough, reconnects, overloaded, stalls, truncations, afterThinkingOnly, outputFiltered, triedWithoutStreaming }
StreamRetryDecision = { decision: "retry"|"useFallbackModel"|"retryWithoutStreaming"|"keepPartial"|"fail", counts }
// 额度状态（computeNewLimitsFromHeaders.base）
ClaudeAILimits = { status: "allowed"|"allowed_warning"|"rejected", resetsAt?, unifiedRateLimitFallbackAvailable,
  rateLimitType?: "five_hour"|"seven_day"|"seven_day_opus"|"seven_day_sonnet"|"seven_day_overage_included"|"overage",
  overageStatus?, overageResetsAt?, overageDisabledReason?, overageScope?, upgradePaths?, isUsingOverage,
  overageInUse?, overagePeriodMonthly?, overagePeriodChannel?, rateLimitGraceActive?, lowPriorityOffer?, utilization?, surpassedThreshold? }
```

### 配置项与环境变量

- 重试：`CLAUDE_CODE_MAX_RETRIES`、`CLAUDE_CODE_RETRY_WATCHDOG`、`CLAUDE_CODE_RETRY_WATCHDOG_SCOPE`（`capacity` 只对容量错误持久）、`CLAUDE_CODE_RETRY_WATCHDOG_MAX_WAIT_MS`、`CLAUDE_CODE_RETRY_WATCHDOG_MAX_USAGE_LIMIT_WAIT_MS`、`CLAUDE_CODE_RETRY_WATCHDOG_USAGE_LIMIT_RECHECK_MS`、`CLAUDE_CODE_OVERLOADED_RETRY_BASE_DELAY_MS`、`CLAUDE_CODE_OVERLOADED_RETRY_MAX_DELAY_MS`、`CLAUDE_CODE_NONSTREAMING_TIMEOUT_RETRIES`、`FALLBACK_FOR_ALL_PRIMARY_MODELS`、`IS_SANDBOX`。
- 凭证：`CLAUDE_CODE_CLIENT_CERT`、`CLAUDE_CODE_DISABLE_MTLS_RELOAD_ON_STALE_CONNECTION`、`CLAUDE_CODE_REMOTE`、`CLAUDE_CODE_REMOTE_SESSION_ID`、`AWS_BEARER_TOKEN_BEDROCK`、`CLAUDE_CODE_SKIP_BEDROCK_AUTH`、`CLAUDE_CODE_SKIP_AWS_CRED_CACHE`、`CLAUDE_CODE_USE_BEDROCK/VERTEX/ANTHROPIC_AWS/ANTHROPIC_GOOGLE_CLOUD/MANTLE`。
- 其他：`ANTHROPIC_BASE_URL`、`CLAUDE_CODE_API_BASE_URL`（Files API）、`CLAUDE_AFTER_LAST_COMPACT`、`CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY`、`CLAUDE_CODE_ULTRAREVIEW_QUOTA_FIXTURE`、`DISABLE_COMPACT`（影响提示词过长文案）。
- GrowthBook：`tengu_tidy_cloud`（休眠穿越重试，默认开）、`tengu_patient_tide`（断网重连次数）、`tengu_sharded_moonbeam`、`tengu_valiant_finch`（限额读数）、`tengu-off-switch`、`tengu-model-error-overrides`（在 queryModel 中）。
- 遥测事件：`tengu_api_retry`、`tengu_api_opus_fallback_triggered`、`tengu_api_model_not_found_fallback_triggered`、`tengu_api_fallback_last_resort`、`tengu_api_529_background_dropped`、`tengu_api_custom_529_overloaded_error`、`tengu_max_tokens_context_overflow_adjustment`、`tengu_api_retry_after_too_long`、`tengu_api_persistent_retry_wait`、`tengu_beta_400_healed`。

### 与 2.1.88 的差异（有代码证据）

- 新增 `onError` 自愈钩子与 `retry:<原因>` 标签机制（2.1.88 的 `withRetry.ts` 无 onError 参数）；316 的 400 去特性链全部基于它。
- 持久重试从 `CLAUDE_CODE_UNATTENDED_RETRY`（`feature('UNATTENDED_RETRY')`）改为 `CLAUDE_CODE_RETRY_WATCHDOG` 系列（316 original 中已无 UNATTENDED_RETRY 字符串），并新增 `_SCOPE`、等待上限与用量恢复检查、`subscribeRetryWake` 提前唤醒、低优先级等待。
- `CLAUDE_CODE_MAX_RETRIES` 非持久模式截到 15（旧版直接 parseInt）。
- 新增 `FallbackTriggeredError` 的 `reason` 多种取值（旧版只有 529 overloaded 触发 fallback），以及 accessFallbackModel、"last_resort" 回退。
- 新增流式重试决策表（`decideStreamRetry` 系列：休眠穿越、断网重连、keepPartial、改非流式）。
- 新增提供商：anthropicAws、mantle、anthropicGoogleCloud 的凭证错误识别与重试；WIF 交换 401。
- 限额：新增 `seven_day_overage_included`（显示名 "Fable limit"）、`overage` 窗口，按窗口的 utilization/surpassed-threshold 头和时间相对预警；`anthropic-ratelimit-unified-overage-period-monthly-utilization`/`anthropic-ratelimit-unified-overage-period-channel-utilization`。
- 常量保持：默认 10 次、FLOOR_OUTPUT_TOKENS 3000、基础退避 500ms、持久退避上限 5 分钟/总 6 小时/心跳 30 秒、快速模式冷却 30 分钟/20 秒/10 分钟与旧版一致。

### 未解之处

- `chunk-e6aww6q8.js#e_n` 的 onError 中 `$gt`、`Hgt`、`SI`、`OLe`、`l$`（空函数）几个兜底识别器的具体含义未逐一核对（这些是写作时的压缩名，当前阅读树的 onError 中已无同名绑定，未重新对应，待核实）。
- `chunk-hwmsct5x.js#W8r`（低优先级等待决策）与 `chunk-77a3xzkb.js#s`、`chunk-fm6h4dv7.js#M7`（低优先级 arm 条件）只做了粗命名。
- `chunk-e6aww6q8.js#AQt` 恒返回 false（构建裁剪），原本的用途不明。
- `chunk-w5ndchqs.js#pe`（fetchUtilization）内部的重放缓存 `be` 与挂起集合 `V` 未展开。

## 9. 系统提示词、上下文与常量

> 子区域 prompts；命名与声明说明在 naming/semantic-query.jsonl、naming/docs-query.jsonl。
范围：`constants/*`（本领域部分）、`context.ts`、`utils/systemPrompt.ts`、`context/*`。名字为本次 semantic 名（或已有的旧版/门面名），后附声明 id。

### 1. 模块地图

| 模块 | 职责 |
|---|---|
| `constants/prompts.ts` | 系统提示词的分段生成与组合：事实 → 会话段决策（带会话内记录/回放）→ 渲染为 `[{id,scope,text}]` → 按 shared/动态分界/session 排序。另含环境块、模型身份行、输出风格/语言段落文本 |
| `constants/systemPromptSections.ts` | `systemPromptSection(name, compute)` 分段工厂（会话内缓存） |
| `constants/system.ts` | 三条身份行与 `getCLISyspromptPrefix`；计费归属头 `getAttributionHeader`；请求入口名改写 |
| `utils/systemPrompt.ts` | `buildEffectiveSystemPrompt`：override / coordinator / 代理 / --system-prompt / 默认 的优先级与 --append-system-prompt |
| `context.ts` | git 状态快照、系统上下文（Perforce）、用户上下文（CLAUDE.md、用户邮箱、附加项目、日期）的构建与缓存 |
| `constants/outputStyles.ts` | 内置输出风格（Proactive/Concise/Explanatory/Learning）与自定义风格加载、当前风格选择 |
| `constants/oauth.ts` | OAuth 环境、scope、端点配置、自定义 OAuth URL 白名单 |
| `constants/xml.ts` | 消息中的 XML 标签名常量 |
| `constants/messages.ts`、`product.ts`、`files.ts`、`figures.ts`、`github-app.ts`、`keys.ts`、`spinnerVerbs.ts`、`turnCompletionVerbs.ts`、`common.ts` | 固定文本、URL、二进制扩展名、界面符号、GitHub App 工作流、GrowthBook key、转圈动词等 |
| `context/*.tsx` | React Context：排队消息、FPS、Mailbox、模态尺寸、通知队列、覆盖层登记、会话统计、语音状态 |

### 2. 关键流程

#### 2.1 系统提示词组装（316 新结构）

旧版 `getSystemPrompt` 是一个函数直接拼数组；316 改成"提示词组合器"三步，入口是 `constants/prompts.ts · getSystemPrompt`（`chunk-e6aww6q8.js#KI`，旧版名在 316 里落在了 `#Aur` 上，见 notes）。

1. `constants/prompts.ts · getSystemPrompt(tools, model, options)`（`#KI`）
   调 `composeSections(factsFn, renderFn)`（`WI.composeSections`，`chunk-e6aww6q8.js#RZn`），再 `orderPromptSections(sections, 动态分界标记)`（`chunk-e6aww6q8.js#J7n`）：先放所有 `scope === "shared"` 段，然后（全局缓存可用 `shouldUseGlobalCacheScope()` 时）插入 `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__`（`chunk-dcmhvw5a.js` 导出 `h$`），再放 `scope:"session"` 段；最后每段过一次提示词消融替换 `y0e`。返回字符串数组。
2. `computePromptFacts`（`#gan`）→ `buildPromptFacts`（`#a7e`）：事实 = `{model, promptModel, tools[名字], outputStyle{name,isKeepingCodingInstructions}, traits[]}`，traits ∈ `bare / lean / sdk-preset(excludeDynamicSections) / teammate / analysis / print / skills / send-user-message`。
3. `composeSessionSystemPrompt`（`#kan`）
   - `decideSystemPromptSections`（`#Cur`）：`CLAUDE_CODE_SIMPLE` 时只产出 `bare` 段（`CWD: … Date: …`）。否则对每个会话段调用 `decideSection`（`#dh`）：段 key（如 `communication:<L>:send_user_msg`：communication 段在需要时加 `:send_user_msg` 后缀）在会话记录（`bootstrap promptAssembly`）里已有就回放（`replayRecordedSection` `#_an`），否则算决策、渲染并记录（`recordSectionAnswer` `#San`）。这保证同一会话里各段文本稳定、缓存不断。
   - `buildSystemPromptSectionList`（`#Aur`）按顺序渲染：
     - shared 段（非 lean）：`intro`（`getSimpleIntroSection` `#sur`）、`system`（`#aur`）、`doing_tasks`（`#lur`，输出风格不保留编码指令时省略）、`actions`（`getActionsSection` `#dur`）、`tools`（`getUsingYourToolsSection` `#fur`）、`tone`（`#yur`）。lean 模型只有一个 `lean_body`（`getLeanBodySection` `#ian`）。
     - session 段：`communication`、`pronouns`、`action_caution`、`task_continuity`、`fable_identity`、`tool_param_json`、`session_guidance`、`memory`、`surface`、`env_info_simple`/`env_info_static`（最新模型清单）、`bg-session`、`context_management`、`system_messages`、`brief`、`focus_mode`、`act_dont_rederive`、`delivering_work_max`、`overcorrection`、`subagent_steer_delegation`、`opus5_reduced_delegation`、`original_games`、`heron_brook`、`brook_heron`、`willow_tern`、`autonomy_append`、`endconv_deferred_hint`，再加 `total_tokens`、`user_pays`、`repl_working`。渲染函数表在 `getSectionRenderers`（`#ban`）。
     - lean 改写（`mme(model)`）时每段用 `<tag>…</tag>` 包起来（`tagLeanSection` `#l7e`、标签名 `getLeanSectionTagName` `#vur`）。
4. 模块加载时 `setPromptComposer({facts, detachedSections})`（`chunk-e6aww6q8.js:2280125-2280246`，`constants/prompts.ts`）把这套组合器注册到 bootstrap，分离运行的代理（后台/hook）用 `composeDetachedSections`（`#han`）按记录的事实重算。

调用方（`tools/q.mjs callers #KI`）：AgentTool、`fetchSystemPromptParts`（utils/queryContext）、/btw、/context、/compact、进程内队友、analyzeContextUsage 等。

#### 2.2 生效系统提示词优先级

`utils/systemPrompt.ts · buildEffectiveSystemPrompt`（`chunk-e6aww6q8.js#Gcr`）：

1. `overrideSystemPrompt` → 直接用。
2. coordinator 模式且无主线程代理 → coordinator 提示词（`chunk-yxywkh50.js getCoordinatorSystemPrompt`）+ 输出风格提示 + 另一段 + `--append-system-prompt`，记 `coordinator_mode_start`。
3. 主线程代理（`--agent`）：内置代理调 `getSystemPrompt({toolUseContext})`，自定义代理 `getSystemPrompt()`；代理带 `appendSystemPrompt` 时追加在默认/自定义提示词后，否则替换。
4. 否则 `customSystemPrompt`（`--system-prompt`）优先于默认 `getSystemPrompt` 结果。
5. 最后 `iqe(..., {tools, appendSystemPrompt})` 追加 `--append-system-prompt`。返回 `{prompt, servesDefault}`。

query 主循环另把 `--system-prompt`/`--append-system-prompt` 拼成 `userSystemPrompt` 选项（`query.ts · joinCustomAndAppendSystemPrompt`，`chunk-ha3km179.js#sy`）供遥测/录制。

#### 2.3 请求里的 system 块：计费头、身份行、静态/动态分界

在 `services/api/claude.ts · queryModel`（`chunk-e6aww6q8.js#e_n`）里：

1. `utils/fingerprint.ts · computeFingerprintFromMessages`（`chunk-s61vbvea.js#Vei`）：取第一条非 meta user 消息的文本，取下标 4、7、20 三个字符（缺省补 "0"），`sha256("59cf53e54c78" + 三字符 + "2.1.316")` 的前 3 位十六进制。这就是实测 `cc_version=2.1.316.<3hex>` 的后缀（"hi" 与 "run the tools" 不同、同提示词稳定）。
2. `constants/system.ts · getCLISyspromptPrefix`（`chunk-w5ndchqs.js#p7n`）选身份行：
   - vertex 恒为 `"You are Claude Code, Anthropic's official CLI for Claude."`；
   - 有录制值（恢复/分叉）用录制值；
   - 非交互（`-p`、SDK）：有 `--append-system-prompt` 用 `"…running within the Claude Agent SDK."`，否则用 `"You are a Claude agent, built on Anthropic's Claude Agent SDK."`（与 verify.md 7.3 的 `-p` 实测一致）；
   - 交互用 CLI 行。
3. `buildSystemWithAttribution`（`chunk-w5ndchqs.js#JXs`，`services/api/claude.ts`）：`[getAttributionHeader(...), 身份行, ...systemPrompt]`。
4. `constants/system.ts · getAttributionHeader`（`chunk-3b05zaw0.js#Dns`）生成 `x-anthropic-billing-header: cc_version=2.1.316.<指纹>; cc_entrypoint=<入口>;`，入口取 `entrypointOnRequests`（可被 `CLAUDE_CODE_ENTRYPOINT_ON_REQUESTS`、local_projects 改写）或 `CLAUDE_CODE_ENTRYPOINT`（`-p` 为 `sdk-cli`）。追加字段（按顺序）：
   - ` cch=00000;`：第一方且 OAuth 订阅，或 vertex；发送前由原生层改写（JS 层看不到，见 verify.md 7.2）；
   - ` cc_workload=…;`（AsyncLocalStorage 里的 workload）；
   - ` cc_is_subagent=true;`（子代理且非主会话）；
   - 以下只在第一方 + OAuth：` cc_prev_req=req_…;`、` cc_prompt_id=<uuid>;`、` cc_turn_origin=…;`、` cc_prompt_index=N; cc_turn_index=M;`；
   - `cc_gateway=<1|env>;`（gateway 提供商或自定义网关，主机未被担保）；
   - ` cc_project=…; cc_project_src=…;`（项目 id 合法、来源在白名单、订阅归属可发）；
   - 第一方 + OAuth 时压缩前的响应：` cc_prev_msg=msg_…;`、` cc_prev_prompt_index; cc_prev_turn_index`。
   - `CLAUDE_CODE_ATTRIBUTION_HEADER` 为假值时返回空串（除非 `ignoreEnvOptOut` 且第一方直连）。旧版还看 GrowthBook `tengu_attribution_header`，316 只看环境变量。
5. `utils/api.ts · splitSysPromptPrefix`（`chunk-w5ndchqs.js#s2o`）切块并定 cacheScope：
   - 计费头块：`cacheScope:null`；身份行块：全局缓存模式下 `null`，否则 `"org"`；`# Reporting outcomes` 块（`akn`）单列 `null`；
   - 全局缓存（`shouldUseGlobalCacheScope()`：第一方或 anthropicAws、开关 `nb()`、OAuth `Oi()`）且找到分界标记：分界前的静态部分 `cacheScope:"global"`，分界后动态部分 `"org"`（或静态被再切分时 `null`）；
   - 其他情况：其余文本合成一块 `"org"`。
   这对应实测：第三方 3 块（计费头、身份行带 cache_control、主提示词），第一方 4 块（计费头、身份行无 cache_control、静态 1,229 字 `scope: global`、动态 4,432 字）。
6. `services/api/claude.ts · buildSystemPromptBlocks`（`#ZSr`）把块转成 `{type:"text", text, cache_control?}`，`scope:"global"` 时 `cache_control` 带 `scope`。

#### 2.4 用户上下文与系统上下文进入请求

- `context.ts · getUserContext`（`chunk-e6aww6q8.js#gqo`）生成块：`claudeMd`（CLAUDE.md 合并文本，可被关闭）、`userEmail`（有登录邮箱时）、`attachedProject`（`chunk-5eyj98zq.js getProjectContextBlock`）、`currentDate: "Today's date is …"`。块可被 `resolvePromptContext` 钩子改写。会话级缓存与失败重读（5s/30s/120s）在 `getOrBuildUserContext`（`#EP`）。
- `context.ts · getSystemContext`（`#mqo`）：316 只剩 `CLAUDE_CODE_PERFORCE_MODE` 时的 `perforceMode` 说明；gitStatus 不再在这里，而是 query 主循环里的 `Dr`（`chunk-ha3km179.js#Dr`）按需 `getGitStatus`（`#nqo`，可被 `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS`/`includeGitInstructions`、远程模式、`omitGitStatus` 关掉）后放进"已通告"上下文。
- `query.ts` 里的 `Bs`（`chunk-ha3km179.js#Bs`）决定上下文怎么送：`bare` 分叉不带；"inline" 模式走旧路径（`utils/api.ts · prependUserContextReminder` `#xYs` 把块作为首条 isMeta user 消息的 system-reminder，`appendSystemContextToPrompt` `#RYs` 把系统上下文 `key: value` 追加到 system）；默认模式把 CLAUDE.md、日期等转为附件/通告，最终成为实测里的 **role 为 system 的消息**（`# Environment` 环境块由 `getEnvironmentSection` `#pkt` + `computeSimpleEnvInfo` `#Sio` 生成、延迟工具列表、Skill 列表、`Today's date is …`）。第一条 user 消息里的 git 署名 system-reminder 也来自这些通告。
- 环境块内容：`Primary working directory`、worktree 提示与 git stash 警告、`Is a git repository`、附加目录、`Platform`（linux 构建固化为 linux）、`Shell`（`getShellInfoLine` `#uio`）、`OS Version`（`getUnameSR` `#fio`）、scratchpad、代理与 `gh` 说明。模型身份行（"You are powered by the model named …"、知识截止）是单独的 `model` 附件（`buildModelEnvInfoAttachment` `#Bkt`），模型变化时才重发（`isSameModelIdentity` `#Wkt`）。

#### 2.5 输出风格与语言

- `constants/outputStyles.ts · getOutputStyleConfig`（`#Rwt`）：插件强制风格优先，否则 `settings.outputStyle`（默认 `default` → null）。`getAllOutputStyles`（`#rRo`）合并内置、插件、用户、项目、策略。
- 内置风格表 `OUTPUT_STYLE_CONFIG`（`#q0t` 语句，`GZ`）：`default`(null)、`Proactive`、`Concise`、`Explanatory`、`Learning`。316 新增 Proactive、Concise（旧版只有 Explanatory/Learning）。
- 风格与语言在 316 不再是系统提示词分段，而是附件文本：`getOutputStyleChangeText`（`#Ykt`）→ `"# Output Style: <名>\n<提示词>"`；`getLanguageChangeText`（`#Xkt`）→ `"# Language …"`（`#Lio`）。系统提示词只在 intro 开场（`can(opening)`，`opening = output-style|default`）和 `doing_tasks` 是否保留上体现。

#### 2.6 OAuth 常量

`constants/oauth.ts · getOauthConfig`（`chunk-6ysndsgz.js#nn`）：环境恒为 prod（`#E`），生产配置 `PROD_OAUTH_CONFIG`（`#a`）：`BASE_API_URL: "https://api.anthropic.com"`、`CONSOLE_AUTHORIZE_URL: "https://platform.claude.com/oauth/authorize"`、`CLAUDE_AI_AUTHORIZE_URL: "https://claude.com/cai/oauth/authorize"`、`TOKEN_URL: "https://platform.claude.com/v1/oauth/token"`、create_api_key/roles 等；`CLAUDE_CODE_CUSTOM_OAUTH_URL` 只接受白名单（`#u9e`：staging、fedstart）。scope：`user:inference`、`user:profile`、`user:sessions:claude_code`、`user:mcp_servers`、`user:file_upload`、可选 `user:plugins`、`user:projects:read/write`、Console 的 `org:create_api_key`；`CLAUDE_CODE_OAUTH_SCOPES` 可覆盖推理 scope（`getRequestedOAuthScopes` `chunk-aepeg2w5.js#kT`）。OAuth beta 头常量 `oauth-2025-04-20`（`#c` 语句）。

### 3. 数据结构

- 提示词事实：`{model, promptModel, tools: string[], outputStyle: {name, isKeepingCodingInstructions} | null, traits: string[]}`（`#a7e`）。
- 段：`{id, scope: "shared" | "session", text}`；段 key 带后缀（`:L` lean、`:R` lean 改写、`:sdk` 等），记录时去掉 `:` 之后部分（`ile`）。
- 会话决策：`{kind:"full", leanRewrite, opening, explainsSystemTurns, namesPastedContentTag, separatesVerifiedFromAssumed, feedback, isReplMode, hasEmbeddedSearch, memoryStatic, totalTokens, closesOnWhoPays, session:{communication, pronouns, …, endConversationHint}}` 或 `{kind:"bare", place:{cwd,date}|null}`（`#Cur`）。
- 环境事实 schema `envInfoFactsSchema`（`#rFe`）：`{workingDirectory?, isWorktree, isGitRepo, additionalWorkingDirectories[], platform, shell?, osVersion?, scratchpadDirectory?, githubCli?, agentProxy?}`；变更 schema `envInfoChangeSchema`（`#lFe`）按 field 区分。
- 模型身份 `{modelId, marketingName|null, knowledgeCutoff|null}`（`vio` 语句里的 `fFe`）。
- 用户上下文块 `{claudeMd, userEmail?, attachedProject?, currentDate}`。

### 4. 配置项、环境变量、开关

- 环境变量：`CLAUDE_CODE_SIMPLE`（只发 CWD/Date）、`CLAUDE_CODE_ATTRIBUTION_HEADER`、`CLAUDE_CODE_ENTRYPOINT`、`CLAUDE_CODE_ENTRYPOINT_ON_REQUESTS`、`CLAUDE_CODE_TURN_UPDATES`、`CLAUDE_CODE_ACT_DONT_REDERIVE`、`CLAUDE_CODE_BISON_CAIRN`、`CLAUDE_CODE_LARCH_CISTERN`、`CLAUDE_CODE_BASALT_COVE`、`CLAUDE_CODE_PEWTER_OWL_TOOL`、`CLAUDE_CODE_PERFORCE_MODE`、`CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS`、`CLAUDE_CODE_SESSION_KIND=bg` + `CLAUDE_JOB_DIR`（bg-session 段）、`CLAUDE_CODE_USER_EMAIL`、`CLAUDE_CODE_DISABLE_BUNDLED_SKILLS`、`CLAUDE_CODE_CUSTOM_OAUTH_URL`、`CLAUDE_LOCAL_OAUTH_*`、`CLAUDE_CODE_OAUTH_SCOPES`、`CLAUDE_CODE_DISABLE_ATTACHMENTS`（total_tokens 段）。
- settings：`outputStyle`、`language`、`spinnerVerbs`（replace/append）、`includeGitInstructions`、`viewMode` 为 `"focus"`（focus_mode 段）、`disableBundledSkills`。
- GrowthBook：`tengu_cedar_lantern`（act_dont_rederive，默认开）、`tengu_wobbly_dahl`（user_pays）、`tengu_silent_harbor`（tool_param_json）、`tengu_verified_vs_assumed`、`tengu_slate_bittern`（opus5 减少委派）、`tengu_idempotent_wolf`（haiku 5.5 early stopping）、`tengu_amber_sextant`（autonomy_append）、`tengu_virtual_pancake`（粘贴内容标签说明）、`tengu_velvet_possum`（大 CLAUDE.md 只读开头）；模型特性 `fable_5_mitigations`、`opus_5_prompt_bundle`、`fable_5_1_prompt_bundle`、`turn_updates`、`original_games_guidance`、`haiku_5_5_early_stopping_guidance`。遥测 `tengu_brook_heron_applied`、`tengu_heron_brook_applied`、`tengu_willow_tern_applied`、`tengu_sysprompt_boundary_found`、`tengu_sysprompt_missing_boundary_marker`、`tengu_sysprompt_using_tool_based_cache`。

### 5. 与 2.1.88 的差异（有代码证据）

- 组装方式：旧版 `getSystemPrompt` 直接 `[...静态段, BOUNDARY, ...resolveSystemPromptSections(dynamic)]`；316 拆成事实/决策/渲染三步，会话段决策被记录并回放（`#dh`、`#_an`、`#San`），新增 lean 模型的单段正文与 lean 改写的 XML 标签包装（`#ian`、`#l7e`）。
- 段落增删：316 不再有 `# Output efficiency`、`# Scratchpad Directory`、`# Function Result Clearing` 文本（在 original 中搜不到）；`language`、`output_style`、`env_info`、`MCP Server Instructions` 从系统提示词移到附件/增量消息（`mcp_instructions_delta` 附件生成 "# MCP Server Instructions"）。新增段：communication（多种模式）、pronouns、action_caution、task_continuity、fable_identity（Fable 5 / 5.1 身份）、tool_param_json、surface、bg-session、context_management、system_messages、focus_mode、act_dont_rederive、delivering_work、corrections、opus5_reduced_delegation、heron_brook/brook_heron/willow_tern、autonomy_append、endconv_deferred_hint、total_tokens、user_pays。
- 计费头：旧版只有 `cc_version`、`cc_entrypoint`、`cch`、`cc_workload`；316 增加 `cc_is_subagent`、`cc_prev_req`、`cc_prompt_id`、`cc_turn_origin`、`cc_prompt_index/cc_turn_index`、`cc_gateway`、`cc_project/cc_project_src`、`cc_prev_msg/cc_prev_prompt_index/cc_prev_turn_index`；`cch` 条件从构建开关改为"第一方 OAuth 或 vertex"；开关去掉了 GrowthBook `tengu_attribution_header`。
- 身份行：三条与旧版相同；316 vertex 恒用 CLI 行，并支持录制值复用。
- 系统上下文：旧版 `getSystemContext` 返回 gitStatus；316 只剩 perforceMode，gitStatus 改由主循环按需通告。
- 输出风格：新增内置 Proactive、Concise；风格提示通过附件发送。
- OAuth：新增 `user:plugins`、`user:projects:*`、design scope、fedstart 白名单。

### 6. 未解之处

- `chunk-e6aww6q8.js#Cur` 内多个开关函数在 `chunk-p1bhnnws.js`/`chunk-m8whhcc1.js`（`iR`、`yS` 模型特性表），具体特性取值来自模型目录，未逐个核对。
- `chunk-372tanf4.js#f` 语句里的 `WWe=2` 导出常量用途未确认，未命名。
- `buildSystemWithAttribution`/`prependAttributionHeader`（`chunk-w5ndchqs.js#JXs`/`chunk-w5ndchqs.js#QXs`，写作时未归属）：place-rest 后分别放在 `services/api/claude.ts` 与 `utils/model/modelAccessCheck.ts`（后者位置可疑），见 notes。
- `cch` 的实际计算在原生层，JS 不可见。

## 10. 消息模型与规范化

> 子区域 messages；命名与声明说明在 naming/semantic-query.jsonl、naming/docs-query.jsonl。
> 负责模块：`utils/messages.ts`、`utils/messages/mappers.ts`、`utils/messages/systemInit.ts`、`utils/messageQueueManager.ts`、`utils/queryHelpers.ts`、`utils/conversationRecovery.ts`、`utils/promptCategory.ts`、`utils/userPromptKeywords.ts`、`utils/stream.ts`、`utils/streamJsonStdoutGuard.ts`、`utils/streamlinedTransform.ts`。
> 函数名为本轮命名后的可读名，括号里是声明 id（`chunk#压缩名`）。

### 模块地图

| 模块 | 职责 |
|---|---|
| `utils/messages.ts` | 内部消息的构造（user/assistant/system/progress）、固定文案（中断、拒绝、分类器拒绝）、判定函数、UI 拆块 `normalizeMessages`、发 API 前的 `normalizeMessagesForAPI`、附件转消息 `normalizeAttachmentForAPI`、思考块/advisor 块剥离、tool_use/tool_result 配对修复、plan mode 提示词、UI lookups 增量缓存 |
| `utils/messages/mappers.ts` | 内部消息 ↔ SDK 消息（`toSDKMessages`/`toInternalMessages`）、compact_metadata 转换、本地命令输出转 assistant |
| `utils/messages/systemInit.ts` | SDK/stream-json 首条 `system/init` 消息 |
| `utils/queryHelpers.ts` | `normalizeMessage`（内部消息 → SDK 流消息）、`isResultSuccessful`、从历史重建 readFileState、提取 Bash CLI 名；恢复时处理孤立权限、延迟工具、跨进程交接的轮次 |
| `utils/conversationRecovery.ts` | `loadConversationForResume`、旧附件迁移、中断检测（补 "Continue from where you left off."） |
| `utils/messageQueueManager.ts` | 本切片只有队列的边角：`PRIORITY_ORDER`、`recordQueueOperation`、`popAllEditable`、`isSlashCommand`；队列本体是未归属的 `chunk-e6aww6q8.js#jzo`（见“未解之处”） |
| `utils/promptCategory.ts` | querySource 标签（`agent:builtin:x`、`repl_main_thread:outputStyle:<x>`） |
| `utils/streamJsonStdoutGuard.ts` | stream-json 模式下保证 stdout 每行都是 JSON |
| 其他 | `userPromptKeywords`（"continue/keep going"）、`stream`（单消费者异步队列）、`streamlinedTransform`（仅一个辅助函数） |

### 关键流程

#### 1. 消息构造函数族

- `utils/messages.ts · createUserMessage`（`chunk-e6aww6q8.js#De`）：所有 user 消息的出口。`content` 为空时用 `"(no content)"`；其余字段原样透传（见下文数据结构），uuid/timestamp 可由调用方注入（queryLoop 的 `deps.uuid/now`）。
- `createUserInterruptionMessage`（`#Sk`）：内容 `[Request interrupted by user]`，`toolUse` 为 true 时为 `[Request interrupted by user for tool use]`；带 `interruptedMessageId`、`interruptedByShutdown`。queryLoop 在中止时产出它。
- `baseCreateAssistantMessage`（`#a6n`）/`createAssistantMessage`（`#vd`）：合成 assistant，`message.model="<synthetic>"`、`stop_reason: "stop_sequence"`、全零 usage；API 错误消息额外带 `isApiErrorMessage/apiError/apiErrorParams/apiErrorIsTransient/quotaLimits/error/errorDetails/truncatedAfterOutput`。（API 错误文案的生成在 api-errors 子区域。）
- system 消息：`createInformationalSystemMessage`（`#Lv`，subtype `informational`）、`createSystemMessage`（`#Nt`，带 toolUseID/preventContinuation）、`createCompactBoundaryMessage`（`#z2`）、`createSystemAPIErrorMessage`（`#kV`，重试进度）、`createTurnDurationMessage`（`#jzt`）、`createStopHookSummaryMessage`（`#bXs`）、`createPermissionRetryMessage`、`createBridgeStatusMessage`、`createCloudSessionStatusMessage`、`createScheduledTaskFireMessage`、`createAwaySummaryMessage`、`createMemorySavedMessage`、`createAgentsKilledMessage`、`createCommandInputMessage`（`#vb`，subtype `local_command`）。
- `createProgressMessage`（`#Nzt`）、`createToolUseSummaryMessage`（`#wXs`，type `tool_use_summary`）。
- 固定文案常量：`INTERRUPT_MESSAGE*`、`CANCEL_MESSAGE`、`REJECT_MESSAGE`（`chunk-yxnffbzs.js#Gk`/`chunk-yxnffbzs.js#Bh`），以及 316 新增的一组“未完成”文案：轮次被交付消息打断、会话结束、复制会话缺结果、审批过期/未答等（`TOOL_CALL_ENDED_FOR_DELIVERY`、`TOOL_CALL_SESSION_ENDED`、`TOOL_RESULT_NOT_IN_COPY`、`APPROVAL_EXPIRED_MESSAGE`…）。权限拒绝文案（`AUTO_REJECT_MESSAGE`、`DONT_ASK_REJECT_MESSAGE`、`buildYoloRejectionMessage`、`buildClassifierUnavailableMessage`、`buildDangerousRemovalDenial`）也在这里。

#### 2. 发 API 前：`normalizeMessagesForAPI`（`chunk-e6aww6q8.js#AT`，16 KB）

调用链：`query.ts · queryLoop` → `services/api/claude.ts · queryModel` → `normalizeMessagesForRequest`（`#Qyn`，剥 tool_reference/caller、`ensureToolResultPairing`、去 advisor、媒体数量上限）→ **`normalizeMessagesForAPI(messages, tools, model, options)`** → `addCacheBreakpoints`（转 `MessageParam`，`api_system` → `role:"system"`）。queryLoop 里处理工具结果时也直接调用它（`AT([E], tools, model, {reminderFold})`）。

按顺序：

1. `messagesWithoutAccountMemory`（`chunk-f25sswmp.js#Kqt`）：按 `accountMemoryWithheld` 处理账号记忆附件。
2. `promoteAndFilterThinking`（`#c8e`）：字符串 assistant 内容提升为文本块（记 `tengu_assistant_string_content_promoted`），反复过滤“只有思考”的孤立 assistant 与空白 assistant 直至稳定；`zvt` 再做一次 user 内容修整。
3. 计算剥离计划：`thinkingStripPlan` = 传入计划 ∪ `thinking_stripped` 附件（`collectThinkingStripPlan`），`advisorStrippedIds` = 传入 ∪ 最后一个 `advisor_stripped` 附件之前的 id。
4. `systemTurnsOn = rne(model)`：模型支持中途 system 消息（catalog 能力 `mid_conversation_system`；`CLAUDE_CODE_FORCE_MID_CONVERSATION_SYSTEM` 强开；HIPAA 下关闭；由 `utils/betas.ts · computeMidConvSystemSupport`（`chunk-aepeg2w5.js#d$`） 判定）。Sonnet 5（`shouldKeepMidConvSystemReminderTags`，`chunk-aepeg2w5.js#Cmr`）另有特殊处理（system 文本不再包 `<system-reminder>`）。
5. `reorderAttachmentsForAPI`（`#bxs`）：附件上移到最近的 assistant 或 tool_result 之后；`vvt` 再按工具可见性重排。
6. 媒体错误自愈：扫描 API 错误消息（`errorDetails` 里的图片/文档错误），给之前的 user/附件消息标记要剥离的媒体类型（`stripTargets`）。
7. 主循环 `for (message of orderedMessages)`：
   - `progress`、可忽略的 system（`F_`：非 local_command 的 system、虚拟、合成 API 错误等）→ 跳过；
   - `system/local_command` → 转成 user 消息，与前一条 user 合并；
   - `user` → 处理任务投递（taskDelivery）、task-notification 格式化、空内容丢弃、媒体剥离，然后 `mergeUserMessages` 合并到前一条 user；
   - `assistant` → 只保留 `web_search_result_location` 引用、同 `message.id` 的片段合并（`mergeAssistantMessagesById`）、按需移动 tool_use（`moveToolUsesToEnd`）；
   - `attachment` → `D6n/Kbe`：**316 的附件优先用写入时预渲染好的 `rendered` 文本**（带 `renderedRole: user|system`），没有时才调用 `normalizeAttachmentForAPI`（`#ogt`）。得到的消息：
     - `systemTurnsOn` 且该附件应提升为 system（`renderedRole==="system"` 或已知类型且不是 nested_memory/relevant_memories 等）→ 文本收集到 `fo`，在下一条非附件消息前由 `fs()` 生成一条 **`api_system` 消息**（`jde("")`，记录 `foldedAttachmentTypes`、工具增删 `toolAdditions/toolRemovals`）；这就是实测请求里第二条 `role:"system"` 的消息（环境块、延迟工具列表、代理类型、技能列表、日期）。
     - 否则包成 `<system-reminder>` 的 isMeta user 消息，合并进前一条 user（`mergeUserMessageWithReminders`：reminder 文本并入 tool_result，tool_result 置前）。
     - 角色与记录不符时记 `tengu_attachment_role_unknown_or_differs`。
8. 收尾管道：`removeEmptyTextBlocksBetweenThinking`（`#DPs`）→ `filterOrphanedThinkingOnlyMessages`（`#B6n`）→ 必要时 `mergeAdjacentUserMessages` → `filterTrailingThinkingFromLastAssistant`（`#N6n`，最后一条 assistant 不能以思考结尾；`preserveTrailingThinking` 时保留，用于续写未完成思考）→ `filterWhitespaceOnlyAssistantMessages`（`#$6n`）→ `ensureNonEmptyAssistantContent`（`#LPs`）。
9. `systemTurnsOn` 时合并相邻 `api_system`（`mergeAdjacentApiSystemMessages`，`#qxs`）；否则 reminderFold 开启时做数组级 smoosh（`countToolCallsSince`，`chunk-e6aww6q8.js#k6n`；该名是旧版匹配名，与行为不符）。
10. 可选 `echoApiBlockOrder` 按原始块顺序重排；按计划剥离思考（`stripThinkingFromMessages`）与 advisor 块（`stripAdvisorBlocks`）；`Exs` 清理；`Uri` 校验工具引用；`tvt` 最后修整。

`ensureToolResultPairing`（`#R_n`，在 `normalizeMessagesForRequest` 中调用）：删除会话恢复后孤立的 tool_result（首条时换成 `[Orphaned tool result removed due to conversation resume]`）、重复的 tool_use 与无结果的 server/mcp tool_use（夹在思考块间时换 `[Tool use removed]`，全删时 `[Tool use interrupted]`），为缺结果的 tool_use 补 `SYNTHETIC_TOOL_RESULT_PLACEHOLDER`；修复时记 `tengu_tool_result_pairing_repaired`。

#### 3. 附件 → 消息：`normalizeAttachmentForAPI`（`#ogt`，29 KB）

agent teams 开启时先处理 `teammate_mailbox`、`team_context`；然后 `switch` 处理 26 种：`file`（image/text/notebook/pdf，生成“Called the Read tool…/Result of calling…”两条 isMeta 消息）、`invoked_skills`、`todo_reminder`、`task_reminder`、`tool_search_usage_reminder`、`relevant_memories`、`queued_command`、`diagnostics`、`plan_mode`/`plan_mode_reentry`（`getPlanModeInstructions` 族）、`attention_budget`、`auto_mode`、`mcp_resource`、`task_status`、`async_hook_response`、`hook_success`、`context_efficiency`、`deferred_tools_delta`、`agent_listing_delta`、`mcp_instructions_delta`、`mcp_dropped_tools_delta`、`memory_update`。结果几乎都用 `wrapMessagesInSystemReminder` 包裹。一组仅供 UI 的类型（`autocheckpointing`、`todo`、`task_progress`、`compaction_reminder`、`thinking_reminder`、`audio_transcript` 等 17 种）返回 undefined；其他未知类型记错误后返回 undefined。附件类型清单与生成条件见 attachments 子区域。

#### 4. UI 侧：拆块与 lookups

- `normalizeMessages`（`#Gm`）：每个内容块拆成一条消息（多块消息用 `deriveUUID` 派生 uuid），可传缓存 Map；`IncrementalMessageNormalizer`（`chunk-ag5x7vhf.js#cs`）只重算变化部分。
- `buildMessageLookups` 的 316 实现是增量类 `MessageLookupsAccumulator`/`MessageLookupsBuilder`（`chunk-ag5x7vhf.js#vw`/`chunk-ag5x7vhf.js#Ol`），每行再由 `RowLookupsProjector` 切出相关子集，避免整表重渲染。
- `reorderMessagesInUI`（`#kzo`）把 PreToolUse 钩子、tool_use、tool_result、PostToolUse 钩子聚在一起。
- `handleMessageFromStream`（`#Mzo`）：把流事件转成 UI 状态（`requesting`→`thinking`/`responding`/`tool-input`→`tool-use`、首 token 时间、流式文本、流式 tool_use 列表）。

#### 5. SDK 输出（`-p --output-format stream-json`）

- `utils/queryHelpers.ts · normalizeMessage`（`chunk-0h4e7gnq.js#J7`）：assistant 经 `normalizeMessages` 拆块、过滤空块后发 `{type:"assistant", message, parent_tool_use_id:null, session_id, uuid, request_id?, supersedes?, tool_use_meta?}`；子代理 progress 转带 `parent_tool_use_id/agent_id/subagent_type` 的消息；`tool_heartbeat` 转 `tool_progress`；附件 `tool_host_result_lines`/`hook_system_message` 转 system 消息。
- `utils/messages/mappers.ts · toSDKMessages`（`#f2n`）/`toInternalMessages`（`#pyt`）：会话导入导出（含 `compact_metadata` snake_case 转换）。
- `utils/messages/systemInit.ts · buildSystemInitMessage`（`chunk-gr407tas.js#Wgt`）：`{type:"system", subtype:"init", cwd, session_id, tools, mcp_servers:[{name,status,source?}], …}`，失败的 MCP 服务器也列出。
- `utils/streamJsonStdoutGuard.ts`：`StdoutGuard`（`chunk-tyg7f3ek.js#IA`）替换 `process.stdout.write`，按行缓冲，非 JSON 行转到 stderr 并加 `[stdout-guard]` 前缀。

#### 6. 恢复与交接（queryHelpers / conversationRecovery）

- `loadConversationForResume`（`chunk-e6aww6q8.js#C0e`）：加载最新/指定/fork 会话 → 反序列化（`deserializeMessages` 去坏 text 块、`migrateLegacyAttachmentTypes`）→ 中断检测（`detectTurnInterruption`，`chunk-tyg7f3ek.js#QM`）→ 必要时追加 `"Continue from where you left off."`（`#v3e`）。
- 无头会话（`chunk-tyg7f3ek.js#BE`）在处理用户输入前调用：`handleOrphanedPermission`（`chunk-0h4e7gnq.js#vBs`，重放或拒绝孤立的权限请求）、`resumeDeferredToolUse`（`#EBs`）、`handleHandedOffTurn`（`#TBs`，执行/补写跨进程交接来的工具调用）、`answerCallsNeverSent`（`#wo`，为从未发出的调用补 is_error 结果）。
- `extractReadFilesFromMessages`（`#g2n`）：从历史 Read/Write/Edit 重建 readFileState（LRU 10）。

#### 7. 队列（只覆盖本切片部分）

队列本体（`chunk-e6aww6q8.js#jzo`，20 KB，未归属）导出 `enqueue/dequeue/peek/remove/removeByFilter/popAllEditable/getCommandsByMaxPriority` 等旧版接口，316 新增 poll 事件（`enqueuePollEvent`、`drainPollEventChunk`）、轮首/轮中折叠（`getTurnStartFoldCommands`、`registerFoldInFlight`、`suspendMidTurnFold`）、重新入队窗口（`startRequeueWindow`/`requeueTaken`）、取消挂起、提交追踪等。优先级 `PRIORITY_ORDER = {now:0, next:1, later:2}`（`chunk-e6aww6q8.js#jmo`）；每次操作经 `recordQueueOperation` 写入会话存储（`type:"queue-operation"`）。

### 数据结构

**内部 user 消息**（`createUserMessage` 返回）：
`{type:"user", message:{role:"user", content}, uuid, timestamp, isMeta, promptShellHandOff, mcpSkill, invokedSkill?, ephemeral, turnCompanion, usageLimitNote, replacesSpan, isVisibleInTranscriptOnly, isVirtual, isCompactSummary, repeatsCompactSummary?, modelOnlyText?, summarizeMetadata, toolUseResult, classifierMetaLines, classifierBoundary?, serverClassifierContext, hostClassifierContext, toolDenialKind, toolDenialEndsTurn, toolDenialMonitorBlocked?, toolDenialUnanswered, toolDenialAfterRun?, toolDenialFromHost?, userFeedback, toolResultRemedy, permissionDecision?, sandboxViolations?, sandboxed?, mcpMeta, toolEndsTurn, imagePasteIds, sourceToolAssistantUUID, permissionMode, origin, promptSource, promptId?, interruptedMessageId, refusedMessageId?, interruptedByShutdown}`，本地命令输出另有一个符号键字段。

**内部 assistant 消息**（`baseCreateAssistantMessage`）：
`{type:"assistant", uuid, timestamp, message:{id, type:"message", role:"assistant", model, content, stop_reason, stop_sequence, stop_details, usage, container, diagnostics, context_management}, requestId, apiError, apiErrorParams?, apiErrorIsTransient, quotaLimits, error, errorDetails, truncatedAfterOutput, isApiErrorMessage, isVirtual}`；流式产出的还会有 `apiBlockIndex/apiBlockIndices`、`permissionModeAtRequest`、`resumedFromIncompleteThinking`、`supersedesUuids`、`attributionAgent/Skill/Plugin/McpServer/McpTool`、`advisorModel`、`isUnmetered` 等（见 `normalizeSingleMessage` 透传的字段）。

**其他 type**：`system`（subtype 有 informational、local_command、compact_boundary、api_error、turn_duration、stop_hook_summary、permission_retry、bridge_status、cloud_session_status、scheduled_task_fire、away_summary、memory_saved、agents_killed、model_fallback、model_refusal_fallback、model_refusal_no_fallback、model_consent_fallback、notification 等）、`progress`（`{toolUseID, parentToolUseID, data}`）、`attachment`（`{attachment:{type,…}, rendered?, renderedRole?}`）、`api_system`（中途 system 轮，`toolAdditions/toolRemovals/toolDefinitions/foldedAttachmentTypes/ephemeralSuffix`）、`tool_use_summary`、`tombstone`（queryLoop 撤回消息用）。

**system-reminder 包裹**：`<system-reminder>\n…\n</system-reminder>`；316 新增带 id 形式 `<system-reminder id="…">\n…\n</system-reminder id="…">`（`wrapInIdSystemReminder`/`unwrapSystemReminder`）。

### 配置项、环境变量、开关

| 名称 | 作用 |
|---|---|
| `CLAUDE_CODE_FORCE_MID_CONVERSATION_SYSTEM` | 强制开启中途 `role: "system"` 消息（附件折叠成 api_system） |
| catalog 能力 `mid_conversation_system`、HIPAA 组织 | 决定 systemTurnsOn（HIPAA 时关闭） |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` / `tengu_amber_flint` | agent teams：teammate_mailbox、team_context 附件 |
| `tengu_amber_prism` | 拒绝文案后附“下一条可能是纠正”提示（需自动记忆开启） |
| `tengu_silly_waterfall` 等 | 续写时清理占位消息（`dropRedundantResumeMessages`） |
| `tengu_velvet_gannet` | MCP 交接调用的孤立询问延后 |
| `tengu_lantern_snuffer` | 工作流因限额暂停的提示 |
| 遥测 | `tengu_tool_result_pairing_repaired`、`tengu_filtered_trailing_thinking_block`、`tengu_filtered_orphaned_thinking_message`、`tengu_filtered_whitespace_only_assistant`、`tengu_fixed_empty_assistant_content`、`tengu_assistant_string_content_promoted`、`tengu_reorder_tool_uses_skipped_for_thinking`、`tengu_attachment_role_unknown_or_differs`、`tengu_content_block_healed`、`tengu_tool_input_json_parse_fail` |

### 与 2.1.88 的差异（有代码证据）

1. **中途 system 消息**：旧版附件一律转 `<system-reminder>` 的 user 消息；316 在模型支持时折叠成 `api_system`（发出时 `role:"system"`），与 verify.md 7.3 实测第二条消息一致。
2. **附件预渲染**：316 附件带 `rendered/renderedRole`，`Kbe` 优先使用；`normalizeAttachmentForAPI` 的 switch 从旧版 57 个 case 缩到 26 个，旧版的 `date_change`、`directory`、`edited_text_file`、`nested_memory`、`skill_listing`、`token_usage`、各类 `hook_*` 等不再在这里渲染；新增 `attention_budget`、`tool_search_usage_reminder`、`mcp_dropped_tools_delta`、`memory_update`。
3. **思考块剥离计划**：新增 `thinking_stripped`/`advisor_stripped` 附件驱动的按消息剥离，以及 `keepForeignThinking`（all/upgrade/none）剥掉其他模型的带签名思考。
4. 旧版由 `tengu_chair_sermon` 门控的 smoosh，316 改为由 reminderFold（`resolveReminderFold_2`，`chunk-e6aww6q8.js#Uzt`）决定；旧版的 `tengu_toolref_defer_j8m` 开关在 316 原文中已不存在，`relocateToolReferenceSiblings` 未找到对应实现（同名声明是错配）。
5. **带 id 的 system-reminder** 与 `stripTrailingMessageIdTag`（`[id:xxxx]` 标签）。
6. 新增大量“未完成调用”与权限拒绝文案（交付打断、会话结束、复制会话、审批过期、内置 rm -rf 保护、无审批界面、分类器不可用/要求等待）。
7. UI lookups 改为增量累加 + 每行投影（旧版每次重建 `buildMessageLookups`）。
8. queryHelpers 新增跨进程交接（handoff）、延迟工具恢复、孤立权限重放。

### 未解之处

- `chunk-e6aww6q8.js#jzo`（队列本体）、`#k6n`（reminderFold 时的数组级 smoosh）、`#Kbe`/`#D6n`（附件渲染入口）、`#zvt`、`#Exs`、`#tvt`、`chunk-a76knw89.js#Uri` 写作时都在 `_unattributed`、未命名；place-rest 后已落位并依次命名为 `createMessageQueueManager`、`countToolCallsSince`、`attachmentToMessages`、`attachmentMessagesWithAnswer`、`stringifyObjectToolResults`、`sanitizeErrorToolResultContent`、`dropRedundantEmptyPolls`、`countToolCallsSince`（待核实：`#k6n` 与 `#Uri` 的名字是旧版匹配名，与行为不符）。
- `messagesWithoutAccountMemory`（账号记忆附件处理，`chunk-f25sswmp.js#Kqt`）的具体规则未细看。
- `normalizeMessagesForAPI` 内部许多局部状态（`fo/un/ao/rr/bo/vn` 等折叠缓冲、`Cr` 无 assistant 时的延后声明）只命名了主干变量。
- `chunk-ag5x7vhf.js#cs` 的损坏探针 `Cp` 的检查条件未细看。

## 11. 附件与工具结果预算

> 子区域 attachments；命名与声明说明在 naming/semantic-query.jsonl、naming/docs-query.jsonl。
### 概述

"附件"是 Claude Code 在每轮请求前自动注入的上下文：@ 提及的文件、IDE 选区、计划模式提醒、待办提醒、延迟工具增量、CLAUDE.md、相关记忆等。它们先以内部 `attachment` 消息存进对话（`{type:"attachment", uuid, timestamp, attachment:{type,...}}`），发请求前由 `utils/messages.ts · normalizeAttachmentForAPI`（`chunk-e6aww6q8.js#ogt`）转成 user 角色的 `isMeta` 消息，大多包在 `<system-reminder>` 里。

调用方：
- `query.ts · queryLoop`（`chunk-ha3km179.js#xc`）：每次工具执行后调用 `getAttachmentMessages`；轮首调用 `getQueuedCommandAttachments` 吸收队列命令；入口启动相关记忆预取；每轮调用 `applyToolResultBudget`。
- `utils/processUserInput/processUserInput.ts · processUserInputBase`：用户提交提示词时调用 `getAttachmentMessages`（带 input）。
- `services/compact/compact.ts`：压缩后用 `generateFileAttachment` 重新注入最近读过的文件，并用 `getRevokedDeferredToolNames` 计算撤回的工具。
- `services/tools/toolExecution.ts · checkPermissionsAndCallTool`：工具结果经 `processToolResultBlock` 判断是否落盘。

### 模块地图

| 模块 | 职责 |
|---|---|
| `utils/attachments.ts` | 附件生成：`getAttachments` 与约 60 个生成器；@ 提及解析；记忆附件；待办/任务/计划/自动模式提醒；延迟工具与 MCP 增量 |
| `utils/toolResultStorage.ts` | 大工具结果落盘（`tool-results/`）、`<persisted-output>` 预览、每批工具结果的聚合预算与替换状态 |
| `utils/messages.ts`（另一子区域） | `normalizeAttachmentForAPI`：附件 → API 消息；`ATTACHMENT_MESSAGE_RENDERERS`（`chunk-e6aww6q8.js#MKr`）为按类型的渲染表 |

### 关键流程

#### 1. 每轮生成附件

```
queryLoop / processUserInputBase
  └─ utils/attachments.ts · getAttachmentMessages (chunk-e6aww6q8.js#yRe)
       └─ getAttachments (#Bxr)
            ├─ areAttachmentsDisabled (#v7e) → 只给 queued_command / agent_listing_delta / sandbox_instructions …
            ├─ 用户输入类（input 非空）
            │    at_mentioned_files → getAtMentionedFileAttachments (#gPr) → processAtMentionedFiles (#hPr) → generateFileAttachment (#CJn)
            │    mcp_resources → getMcpResourceAttachments (#SPr)
            │    agent_mentions → processAgentMentions (#yPr)
            │    skill_mentions、peer_mentions (#_Pr)
            ├─ 全线程类 allThreadProducers（主线程和子代理都跑）
            └─ 仅主线程类 mainThreadProducers
       └─ dedupeWithheldMemory (#Uxr) → 每个附件包成 attachment 消息，记 tengu_attachments
```

- 每个生成器由 `maybe(label, fn)`（`#bu`）包装：计时、5% 采样记 `tengu_attachment_compute_duration`、出错只返回空数组。
- 所有生成器共享一个 1 秒超时的 AbortController（`attachmentAbortController`）。
- `options` 的 `inputMentionsOnly` 时只算用户输入类和嵌套记忆。
- 子代理委托观察（`isDelegatedObservationContext(agentContext)`）时直接返回空。

#### 2. 附件类型清单（getAttachments 里的生成器，按 label）

| label → type | 生成函数（声明 id） | 触发条件 / 开关 |
|---|---|---|
| at_mentioned_files → file / directory / compact_file_reference / pdf_reference / already_read_file / at_mention_reference | `getAtMentionedFileAttachments` `#gPr`、`processAtMentionedFiles` `#hPr`、`generateFileAttachment` `#CJn`、`tryGetPDFReference` `#ACn` | 输入含 `@path`、`@"带空格路径"`，可带 `#L10-20`；`CLAUDE_CODE_EVAL_CONFINED` 时不处理；`CLAUDE_CODE_DISABLE_FILE_MENTIONS` 或宿主不读文件时走 `getFileMentionReferences` `#pPr`，只给 at_mention_reference |
| mcp_resources → mcp_resource | `getMcpResourceAttachments` `#SPr` | `@server:uri` |
| agent_mentions → agent_mention | `#yPr` | `@agent-x` 或 `@"x (agent)"` |
| skill_mentions → skill_mention | `buildSkillMentionAttachments`（`chunk-e6aww6q8.js#wRn`） | 人工输入、主线程、有 Skill 工具 |
| peer_mentions → peer_mention | `getPeerMentionAttachments` `#_Pr` | 人工输入且有同伴会话 |
| queued_commands → poll_events + queued_command | `getQueuedCommandAttachments` `#KKe`、`buildPollEventsAttachment` `#Wxr` | 消息队列里 mode 为 prompt/task-notification 的命令 |
| sandbox_instructions | `getSandboxInstructionsAttachments`（`chunk-e6aww6q8.js#Kmn`） | 有沙箱 Bash 类工具 |
| artifact_opening_prefetch | `prefetchArtifactOpening`（`chunk-e6aww6q8.js#rPr`） | 开关 `VCn()`，主线程首轮 |
| environment / model / session_settings | `detectEnvironmentDirectoryChange`（`#XCn`）/ `getRuntimeModelSwitchAnnouncements` / `getOutputStyleAndLanguageAttachments`（`#ZCn`） | 环境、运行时模型切换、会话设置（语言、输出风格）变化公告 |
| ultrathink_effort | `#iPr` | 输入含 ultrathink 且开关开 |
| deferred_tools_delta | `getDeferredToolsDeltaAttachments` `#TJn` | 工具搜索可用；延迟工具出现/撤回；`tengu_composed_treehouse` 加 deniedLead |
| agent_listing_delta | `getAgentListingDeltaAttachment` `#Eve` | 有 Agent 工具，可用代理类型变化 |
| mcp_instructions_delta | `getMcpInstructionsDeltaAttachment` `#A7e` | MCP 服务器 instructions 增减 |
| mcp_dropped_tools_delta | `getMcpDroppedToolsAttachment` `#x7e` | MCP 工具被丢弃 |
| tool_hosts_notice / tool_hosts_correction | 远程会话提供的回调、`Atr` | 远程工具宿主 |
| changed_files → edited_text_file / edited_image_file | `getChangedFiles` `#Yjo` | 已读文件在磁盘上变化；diff 片段总长 16KB；计划模式跳过；`tengu_fallow_plover`/`tengu_mossy_thrush` |
| nested_memory | `getNestedMemoryTriggerAttachments` `#CCn` → `getNestedMemoryAttachmentsForFile` `#rAn` → `memoryFilesToAttachments` `#vCn` | 读文件等操作触发的路径对应目录的 CLAUDE.md；`CLAUDE_CODE_DISABLE_CLAUDE_MDS` 关闭；`tengu_paper_halyard` 排除 Project/Local |
| dynamic_skill | `getDynamicSkillAttachments` `#CPr` | 文件操作触发了新技能目录 |
| skill_listing | `getSkillListingAttachments` `#APr` | 有 Skill 工具；首次全量，之后增量（digest 比较） |
| plan_mode / plan_mode_reentry | `getPlanModeAttachments` `#Zxr` | permission mode=plan；每 5 轮一次，每 5 次一个完整版 |
| plan_mode_exit | `#ePr` | 离开计划模式后一次 |
| proactivity | `nGe` | 主动性设置 |
| auto_mode / auto_mode_exit | `#tPr` / `#nPr` | auto 或 bypassPermissions 模式；`tengu_vivid_crown` |
| todo_reminders → todo_reminder 或 task_reminder | `#FPr` / `#HPr` | 距上次 TodoWrite（或任务工具）与上次提醒都 ≥10 轮；`CLAUDE_CODE_TODO_REMINDER_MODE`、`tengu_soft_slate_nudge` |
| tool_search_usage_reminder | `#UPr` | 实验配置 `Nas()` 非空，每 N 轮 |
| teammate_mailbox / team_context | `#zPr`（316 恒为空） / `getTeamContextAttachment` `#qPr` | 代理团队模式 `Ko()` |
| agent_pending_messages → queued_command | `getAgentPendingMessageAttachments` `#zxr` | 子代理的待处理消息 |
| critical_system_reminder | `#bCn` | `criticalSystemReminder_EXPERIMENTAL` |
| spawned_loop_memory_withdrawal | `withdrawCoworkMemoryContext`（`chunk-s61vbvea.js#mVo`） | 子代理工具步骤后撤回协作记忆 |
| silent_turn_reminder | `#Xxr`、`#Yxr` | 主线程、非用户发起的轮次、连续静默轮或秒数超阈值 |
| host_status_nudge / host_prompt_reminder | `getCriticalReminderAttachment`（`chunk-e6aww6q8.js#CRn`）/ `#bCn` | 宿主回复门策略 `replyGatePolicy` |
| elapsed_time_reminder | `getElapsedTimeReminderAttachments`（`chunk-e6aww6q8.js#$Rn`） | 非用户发起轮、模型开关 |
| total_tokens_reminder | `#VPr` | 模式非 off（countdown/padded-countdown…），格式 `<total_tokens>N tokens left</total_tokens>` |
| budget_usd | `#XPr` | `--max-budget-usd` |
| workflow_keyword_request / ultra_effort_enter / ultra_effort_exit / workflow_size_guideline_change | `#aPr` / `#lPr` / `latestWorkflowSize`（`chunk-6rgkw5kr.js#MJs`） | 主线程、工作流开关 `Sg()` |
| ide_selection → selected_lines_in_ide / selected_lines_in_diff | `getSelectedLinesFromIDE` `#wCn` | 主线程、连接了 IDE |
| ide_opened_file → opened_file_in_ide (+ nested_memory) | `#ECn` | 主线程 |
| queued_ide_selections | 同上 | 队列命令里带 IDE 选区 |
| output_style | `#fPr` | 非默认输出风格 |
| diagnostics / lsp_diagnostics → diagnostics | `#OPr` / `#IPr` | 有编辑类工具；IDE MCP 或 LSP 有新诊断 |
| unified_tasks → task_status | `#jPr` | 后台任务状态变化 |
| async_hook_responses → async_hook_response… | `#GPr` | 异步钩子完成 |
| late_memory_context | `collectCcrMemoryAttachments`（`chunk-s61vbvea.js#fZs`） | `CLAUDE_CODE_MEMORY_CONTEXT_NO_WAIT` 且工具步骤后 |
| low_resource_status | `lowResourceReminders`（`chunk-e6aww6q8.js#eCn`） | 磁盘/内存不足提示 |
| memory_update | `#WPr` | 记忆同步/待处理更新 |
| withheld_memory | `#oAn` | 有因权限未显示的记忆 |
| token_usage | `#KPr` | `CLAUDE_CODE_ENABLE_TOKEN_USAGE_ATTACHMENT` |

相关记忆（`relevant_memories`、`account_memory_recall`）不在 `getAttachments` 里产出，而是 queryLoop 入口用 `startRelevantMemoryPrefetch`（`#z8s`）异步预取：
- 前提：主线程、querySource 不在跳过集合 `#vPr`（extract_memories/auto_dream/prompt_suggestion/compact）、自动记忆或账户召回开启、最后一条用户消息有空白或含 CJK、会话累计未超 60KB（`#$Cn`）。
- `shouldBlockOnMemoryPrefetch`（`#K8s`，`tengu_mill_orange`）为真时 `awaitMemoryPrefetch`（`#V8s`）最多阻塞 2 秒。
- 结果经 `filterDuplicateMemoryAttachments`（`#Xjo`）去掉已读的，并写入 readFileState。

#### 3. 附件变成 API 消息

`utils/messages.ts · normalizeAttachmentForAPI`（`chunk-e6aww6q8.js#ogt`）：
- 先查渲染表 `ATTACHMENT_MESSAGE_RENDERERS`（约 90 种类型）。
- `file` 类伪造一对 Read 工具调用：`createToolUseMessage(Read, {file_path})` + `createToolResultMessage(FileReadTool, content)`，用 `wrapMessagesInSystemReminder` 包裹。
- 其余类型生成 `createUserMessage({content, isMeta:true})`，文本外包 `<system-reminder>`。
- `teammate_mailbox`/`team_context` 只在团队模式渲染。
- 一部分类型（如 `…_sent` 记录、`prompt_render_point`）只是会话记录，不发给模型。

实测（`docs/process/verify.md` 7.3）：第二条消息 role=system 的环境块就来自 environment/session_settings 一类附件（316 新增的"附件承载环境信息"路线）。

另外 `chunk-0sfjpx19.js#CAs` 里的集合 `Pn` 列出 114 种"附属"附件类型（`--resume-drops-turn` 判断一段对话能否丢弃时使用），可作为 316 附件类型的完整清单。

#### 4. 工具结果落盘与预算（toolResultStorage）

单个结果：
1. `services/tools/toolExecution.ts` → `processToolResultBlock`（`chunk-jcnpfn31.js#bpe`）→ `maybePersistLargeToolResult`（`#V`）。
2. 空结果改成 `(<工具名> completed with no output)`，记 `tengu_tool_empty_result`。
3. 阈值 `getPersistenceThreshold`（`#_pe`）：工具声明的 `maxResultSizeChars` 与默认 50,000 取小；GrowthBook `tengu_velvet_ibis` 可按工具名覆盖。
4. 超阈值时 `persistToolResult`（`#rJ`）写入会话目录 `tool-results/<id>.txt|.json`。宿主存储可用时改存宿主；超过 1GB 截断。
5. 内容替换成：
   ```
   <persisted-output> Output too large (X). Full output saved to: <path> Preview (first 2KB): … </persisted-output>
   ```
   由 `buildLargeToolResultMessage` `#F5o` / `buildPersistedOutputMessage` 生成，预览 2,000 字符，在换行处截断。
6. 宿主存储落盘失败时就地截断：`<truncated-output> … </truncated-output>`。
7. 含连续 5,000 个以上非空白字符的结果不交给宿主内联（`hasLongUnbrokenRun`）。

聚合预算：
1. `query.ts · queryLoop` 每轮调用 `applyToolResultBudget`（`#eii`）→ `enforceToolResultBudget`（`#ae`）。
2. 按"一次助手回答后的一组工具结果"分组（`#H`）。每组上限 200,000 字符（`qhr`，常量在 `chunk-yxnffbzs.js#Bge`）。
3. 候选按替换状态分三类（`#re`）：mustReapply（已替换，原样重放）、frozen（已见过，不再动）、fresh（新的）。
4. 超预算时从 fresh 里按大小降序落盘（`#oe`、`#ie`）。
5. 所有见过的 id 进 `seenIds`。一旦决定就不再改变，保证后续请求前缀字节稳定（提示词缓存）。
6. 记 `tengu_message_level_tool_result_budget_enforced`。
7. 新替换通过回调 `recordContentReplacement` 写入会话存储；恢复会话时 `reconstructContentReplacementState`（`#R5r`）重建。
8. `getBudgetExemptToolNames`（`#Zsi`）：`maxResultSizeChars` 为无穷或 `skipAggregateToolResultBudget` 的工具不参与。

`contentReplacementState = {seenIds:Set<toolUseId>, replacements:Map<toolUseId, string>}`：
- 由 `provisionContentReplacementState`（`#Jsi`，开关 `tengu_hawthorn_steeple`）创建。
- 子代理用 `cloneContentReplacementState` / `reconstructForSubagentResume`。

钩子输出超 10,000 字符时也落盘：`persistLargeHookOutput`（`#USe`），文件名 `hook-<id>-<source>`。

### 数据结构

Attachment 公共形状为 `{type, ...}`。常见字段（从生成器读出）：

| type | 字段 |
|---|---|
| file | filename, content{type: text/image/notebook/pdf, …}, truncated?, displayPath |
| directory | path, content, displayPath |
| at_mention_reference | mentions[], unread?("too_large"), fileSize?, arePdfsToReadPlainly?, displayPath? |
| pdf_reference | filename, displayPath, pageCount, fileSize |
| edited_text_file | filename, snippet |
| selected_lines_in_ide | ideName, lineStart, lineEnd, filename, content, displayPath |
| selected_lines_in_diff | lineCount, content, filePath |
| opened_file_in_ide | filename |
| nested_memory | path, content, displayPath（超长截断） |
| withheld_memory | entries[{path, displayPath,…}], by |
| relevant_memories | memories[{path, content, mtimeMs, header, limit}] |
| queued_command | prompt（字符串或块数组）, source_uuid, delivery_id, imagePasteIds?, fileAttachments?, inlinedImagePaths?, imageFileUuids, commandMode, origin, promptRewritten?, toolsUsedDelta? |
| poll_events | envelopes, kinds, toolsUsed?, media?, remainingWakeCount, timestamp, provenance, declared?, userRoleGuard? |
| plan_mode | reminderType(full/sparse), isSubAgent, planFilePath?, planExists, planGoesToExitTool? |
| plan_mode_exit | planFilePath?, planExists |
| auto_mode | autoModeConsentFlow, finishExposedWork, bashFirst, bashFirstSteer?, steerOnly, … |
| todo_reminder | content（待办数组）, itemCount |
| task_status | taskId, taskType, status, description, deltaSummary, outputFilePath?, canContinueAgent |
| deferred_tools_delta | surfacedNames, replacedNames, removedNames, readdedNames, retractedTools[{name,cause}], deniedLead? |
| agent_listing_delta | addedTypes, removedTypes, addedLines |
| mcp_instructions_delta / mcp_dropped_tools_delta | 由 `getMcpInstructionsDelta`（`#Dan`）/ `buildMcpDroppedToolsDelta`（`#ARn`）计算的增量字段 |
| skill_listing | content, skillCount, isInitial, names, digests |
| dynamic_skill | skillDir, skillNames, displayPath |
| output_style | style, turnReminder |
| token_usage | used, total, remaining |
| budget_usd | used, total, remaining |
| total_tokens_reminder / silent_turn_reminder | text |
| team_context | agentId, agentName, teamName, teamConfigPath, taskListPath, hasTaskListTools |
| critical_system_reminder | content |
| ultra_effort_enter | reminderType(full/sparse) |

### 配置项与环境变量

- 环境变量：
  - `CLAUDE_CODE_DISABLE_ATTACHMENTS`、`CLAUDE_CODE_SIMPLE`：只留必需附件。
  - `CLAUDE_CODE_DISABLE_CLAUDE_MDS`：不注入嵌套 CLAUDE.md。
  - `CLAUDE_CODE_DISABLE_FILE_MENTIONS`：@ 文件只给引用。
  - `CLAUDE_CODE_EVAL_CONFINED`：不处理 @ 文件与 MCP 资源。
  - `CLAUDE_CODE_ENABLE_TOKEN_USAGE_ATTACHMENT`。
  - `CLAUDE_CODE_TODO_REMINDER_MODE`。
  - `CLAUDE_CODE_JUNIPER_SUNDIAL`：ultra effort 提醒间隔。
  - `CLAUDE_CODE_MEMORY_CONTEXT_NO_WAIT`。
  - `CLAUDE_COWORK_MEMORY_INDEX_CONTENT`。
- GrowthBook：
  - `tengu_soft_slate_nudge`：todo 提醒开关。
  - `tengu_juniper_sundial`。
  - `tengu_paper_halyard`：排除 Project/Local 记忆。
  - `tengu_fallow_plover`、`tengu_mossy_thrush`：变更文件。
  - `tengu_snuggly_goblet`：提及文件按上下文预算。
  - `tengu_composed_treehouse`。
  - `tengu_vivid_crown`：auto 模式 finishExposedWork。
  - `tengu_velvet_ibis`：按工具覆盖落盘阈值。
  - `tengu_hawthorn_steeple`：聚合预算替换状态。
  - `tengu_mill_orange`：记忆预取阻塞。
  - `tengu_moth_copse`。
- 遥测事件：`tengu_attachments`、`tengu_attachment_compute_duration`、`tengu_at_mention_*`、`tengu_tool_result_persisted`、`tengu_message_level_tool_result_budget_enforced`、`tengu_memdir_prefetch_blocking_wait`、`tengu_lsp_diagnostics_injected`、`tengu_ultrathink`、`tengu_ultra_effort`、`tengu_workflow_keyword`、`tengu_juniper_shoal_shown`。

### 与 2.1.88 的差异

对比方法：`references/claude-code-analysis/src/utils/attachments.ts` 里的 `type: '…'` 字面量，对比 316 的 `Pn` 集合（`chunk-0sfjpx19.js#CAs`）与生成器清单。

**316 新增**（2.1.88 源码中没有）：
- 记忆与上下文：withheld_memory、account_memory_recall、cowork_memory_context、memory_update、environment、model、session_context、language、context_sections、project_doc_reads、prompt_snapshot、prompt_render_point。
- 提及：peer_mention、skill_mention、at_mention_reference。
- 工具与 MCP：mcp_dropped_tools_delta、poll_events、tool_search_usage_reminder、tool_hosts_notice、tool_hosts_correction、tool_host_result_lines、deferred_tools_record。
- 提醒：silent_turn_reminder、elapsed_time_reminder、total_tokens_reminder、batching_reminder、secondary_reminder。
- effort 与工作流：ultra_effort_enter、ultra_effort_exit、workflow_keyword_request、workflow_size_guideline_change。
- 其他：selected_lines_in_diff、sandbox_instructions、artifact_opening_prefetch、proactivity、goals、goal_status、thread_state、prefix_delta、thinking_stripped、advisor_stripped、advisor_tool、thinking_drop、credential_org、remote_session_change、read_truncation_notice、bash_output_audience_note、unknown_command_fallback、output_limit_note、hook_deferred_tool、hook_plugin_listing、async_hook_response_batch。

**2.1.88 有、316 不再产出**：
- compaction_reminder、companion_intro、bagel_console、current_session_memory、skill_discovery、verify_plan_reminder（生成器 label 已不存在）。
- 原 verifyPlanReminder（2.1.88 名）曾被错配到 `chunk-nkdv7dw8.js#At`（现已改名 `getUserPromptFromMessage`）。

**其他变化**：
- 待办提醒同时支持新任务系统（task_reminder）。
- 工具结果新增"每组聚合预算 + 替换状态"机制，旧版只有单结果落盘。
- 落盘可写入宿主存储（`dy()`）；新增 `<truncated-output>` 截断路径。

### 未解之处

- `chunk-e6aww6q8.js#uPr`（按值声明工具的增量）与 `#TJn` 的门闩逻辑（`shouldAnnounceDeferredTools`/`canInlineToolAdditions`/`toolSearchRejectedOn`：`chunk-a76knw89.js#JYr`、`chunk-a76knw89.js#XYr`、`chunk-e6aww6q8.js#PKe`）只做了粗命名。
- `chunk-e6aww6q8.js#rPr`（artifact_opening_prefetch）、`#ZCn`/`#XCn`（环境/会话设置公告）不在本领域模块里，未展开。
- `chunk-tmx5d02z.js#sn`、`#Xe`：图片收集器，归属不明。
- `chunk-e6aww6q8.js#iAn`：恒返回 `{}`，可能是构建期裁掉的字段。

## 12. 上下文压缩、token 统计与辅助摘要

> 子区域 compact；命名与声明说明在 naming/semantic-query.jsonl、naming/docs-query.jsonl。
> 依据：`original/` 2.1.316 代码；函数名为本次 semantic/旧版/门面名，后附声明 id。旧版 2.1.88 只作对照。
> 阅读树路径以 `reconstructed/src/<路径>.js` 为准。

### 1. 模块地图

| 模块（重组路径） | 职责 | 说明 |
|---|---|---|
| `services/compact/autoCompact.ts` | 自动压缩窗口、阈值、等级、是否该压缩、快速回填熔断 | 主入口 autocompact 本体 `runAutoCompactIfNeeded`（`chunk-e6aww6q8.js#yzr`；写作时在 `_unattributed/` part-258，现已在本文件） |
| `services/compact/compact.ts` | 整段压缩、部分压缩、摘要请求、压缩后附件 | 反应式压缩核心 `triggerReactiveCompact`/`tryReactiveCompact`/`runReactiveCompact`（`#dJn`/`#Tjo`/`#HTe`）写作时在 `_unattributed/` part-231，现在 `services/compact/reactiveCompact.ts` |
| `services/compact/prompt.ts` | 摘要提示词 8 种变体、部分压缩提示词、analysis/summary 处理 | 变体选择 `qee` 在 part-231 |
| `services/compact/microCompact.ts` | keep-recent 清理、空闲返回后服务端 clear_tool_uses 规划 | 混入日期解析、MCP 说明（错归） |
| `services/compact/apiMicrocompact.ts` | 请求体 `context_management` | 一个函数 |
| `services/compact/compactWarningState.ts` | 压缩警告抑制标志 | |
| `services/compact/postCompactCleanup.ts` | 是否做压缩后清理 | |
| `services/compact/sessionMemoryCompact.ts` | **316 无 session memory 压缩**；此处是反应式压缩结果组装 + 一个 headless 辅助（均错归） | 见第 7 节 |
| `utils/tokens.ts` | 从 usage 读 token、累计丢弃 token、状态栏上下文 | 混入 2 个错归 |
| `services/tokenEstimation.ts` | countTokens API、粗估 | 混入 1 个错归 |
| `utils/context.ts` | 上下文百分比、max_output_tokens | |
| `utils/contextAnalysis.ts` / `utils/contextSuggestions.ts` | /context 统计与优化建议 | |
| `services/AgentSummary/agentSummary.ts` | 后台代理进度摘要 | |
| `services/PromptSuggestion/*.ts` | 提示建议（预测下一句） | speculation.ts 大多错归 |
| `services/toolUseSummary/toolUseSummaryGenerator.ts` | 工具批次标签 | |
| `services/awaySummary.ts` | **实为 Artifact 评论快速确认**（错归） | |
| `utils/sideQuestion.ts` | /btw 旁路提问 | 混入拼写检查正则 |

### 2. 自动压缩阈值

调用链：`query.ts · queryLoop`（`chunk-ha3km179.js#xc`）→ `deps.autocompact`（`query/deps.ts · productionDeps` 把它绑定到 `yzr`，`chunk-e6aww6q8.js#yzr`）→ `services/compact/autoCompact.ts · shouldAutoCompact`（`#npr`）→ `calculateTokenWarningState`（`#pse`）。

1. **自动压缩是否开启**：`isAutoCompactDisabledByEnv`（`chunk-9m4wzd68.js#o`，旧版名 isAutoCompactEnabled 语义相反）读 `DISABLE_COMPACT`/`DISABLE_AUTO_COMPACT`；`kf()`（同 chunk，未归属）= 未被 env 禁用 且 设置 `autoCompactEnabled`（默认 true）。
2. **自动压缩窗口** `getAutoCompactWindow`（`#BS`，旧版 getEffectiveContextWindowSize）返回 `{window, configured, source}`，优先级：
   - 设置里嵌套的 `{ceiling, inner}` 取上限；
   - `CLAUDE_CODE_AUTO_COMPACT_WINDOW`（source=`env`）；
   - 设置 `autoCompactWindow`（数字，或 `{default, byModel}`；`"auto"` 表示不覆盖，source=`settings`）；
   - 否则 `resolveAutoCompactWindow`（`chunk-e6aww6q8.js#bUo`，`services/compact/autoCompactWindow.ts`）：clientdata 下发窗口（`clientdata`）→ 实验窗口 `a6e`（`experiment`）→ 禁用 1M（`CLAUDE_CODE_DISABLE_1M_CONTEXT`）或特定模型时 200k（`model-default`）→ 模型表（如 `claude-sonnet-5` 在 remote_cowork/local-agent 表面默认 500k，其余 1M）→ 未知模型强制（`unknown-model`，可用 `CLAUDE_CODE_DISABLE_UNKNOWN_MODEL_WINDOW_ENFORCEMENT` 关）→ `auto`。
   - window 永远不超过模型上下文窗口。
3. **有效窗口** `DZ`（part-167）= window − min(模型 maxOutputTokens, 20000)（旧版 MAX_OUTPUT_TOKENS_FOR_SUMMARY 同值）。
4. **压缩阈值** `getAutoCompactThresholdTokens`（`#LB`）→ `AJ`：有效窗口 − 13000（旧版 AUTOCOMPACT_BUFFER_TOKENS）；`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` 给出百分比时取 `floor(窗口×pct)` 与之较小值；远程（`CLAUDE_CODE_REMOTE`）200k 窗口下 GrowthBook `tengu_peppy_gosling` 可抬高百分比（`getAutoCompactThresholdConfig`，`#_ke`）。
5. **等级** `calculateTokenWarningState`（`#pse` → `computeTokenWarning`（`#Z4e`，`services/compact/autoCompactWindow.ts`））：
   - `blocked`：token ≥ 窗口 − 3000（或 `CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE`）；
   - `compact`：自动压缩开启且 ≥ 阈值；
   - `warn`：≥ 阈值 − 20000；否则 `ok`；附 `pctLeft`。
6. **预计算压缩**：`isAtPrecomputeThreshold`（`#gQt`）用 `阈值 − 窗口×缓冲比例`；比例 `getPrecomputeBufferFraction`（`#w6o`）来自 GrowthBook `tengu_amber_moleskin`（按窗口大小、repl/sdk 区分的表）或 `tengu_amber_rokovoko`（默认 0.2）。queryLoop 在 `shouldArmPrecompute(...)`（`#Ojo`）为真时调 `armPrecomputedCompact`/`latchArmGate`（`#bzr`/`#_zr`）后台预先生成摘要（压缩前一轮就开始），真正压缩时 `runIdleCompaction` / `triggerReactiveCompact`（`#apr`/`#dJn`）直接换上（`precomputed_compact_swap`）。
7. **是否压缩** `shouldAutoCompact`（`#npr`）：querySource 为 `compact` 或特定辅助来源、窗口已被 `usesLongContextWindow`（`chunk-e6aww6q8.js#F8n`）判为无需本地压缩、自动压缩关闭时为 false；token = `Tp` 估算（最近 usage + 之后消息粗估）− snip 节省 + 服务端已清理量；等级为 compact/blocked 即压缩。远程 fork 达到阈值但未达“无 PCT 覆盖阈值”时可跳过（`tengu_fork_early_compact`）。
8. **熔断**：
   - 快速回填：`checkRapidRefillBreaker`（`#ajr`）——压缩后不到 `RAPID_REFILL_TURN_WINDOW`=3 轮又需压缩，连续 3 次即 `trip` → autocompact 返回 `rapid_refill_breaker_tripped`，queryLoop 产出 `autocompact_thrashing` 错误并以 `{reason:"rapid_refill_breaker"}` 结束。
   - 连续失败：`hzr`=3 次失败后返回 `failure_breaker_open`（同旧版 MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES）。

#### autocompact 结果类型（`yzr` 返回，queryLoop 消费）

| kind | 含义 | queryLoop 的处理 |
|---|---|---|
| `not_needed` | 未到阈值或 `DISABLE_COMPACT` | 继续；带 consecutiveFailures 时更新跟踪 |
| `compacted` | 压缩成功，`result` 为 CompactionResult，附 thresholdSource/thresholdWindow/routedThroughReactive/afterIdle | 记 `tengu_auto_compact_succeeded`，用 `buildPostCompactMessages` 替换消息，`createCompactTracking`（`#SUo`）重置跟踪，产出压缩后行 |
| `failed` | 压缩失败（含 compactFailure.reason：aborted/exhausted/too_few_groups/error） | 累加失败计数，可能产出提示 |
| `hook_blocked` | PreCompact 钩子阻断 | 不压缩 |
| `failure_breaker_open` | 连续失败熔断 | 不再尝试 |
| `rapid_refill_breaker_tripped` | 快速回填熔断 | 产出错误并结束本轮 |

`runAutoCompactIfNeeded`（`#yzr`）的路由：窗口来源不是 `auto`（即用户/服务端配置了窗口）、自动模式分类器溢出、或指定了压缩模型时，走**反应式压缩管线**（`triggerReactiveCompact`，`tengu_auto_compact_routed_reactive`）；否则调用 `compactConversation`。可用更大模型压缩（`findLargerWindowModel`（`#rpr`），`compact_larger_model`）。

### 3. 整段压缩 `compactConversation`（`chunk-e6aww6q8.js#mzr`）

1. 空消息抛 `ERROR_MESSAGE_NOT_ENOUGH_MESSAGES`。`preCompactTokenCount = Tp(messages)`。
2. 事件：`compact_progress{hooks_start pre_compact}`、`sdk_status: compacting`；`executePreCompactHooks`；钩子阻断 → `throwIfPreCompactHookBlocked`（`#Cln`）抛 `CompactionError`（`#EX`）；钩子追加指令用 `mergeHookInstructions`（`#qwt`）合并。
3. 选提示词：`summaryPromptArm = qee()` = `CLAUDE_CODE_CURRIED_TRINKET` 或 GrowthBook `tengu_curried_trinket`（默认 `control`），取值见第 4 节；`transcriptPath = Yee(ctx)`（可用时告诉模型完整转录路径）；`getCompactPrompt`（`#Fee`）生成文本，包成 user 消息。
4. `streamCompactSummary`（`#Pln`）发摘要请求：
   - 默认（`tengu_compact_cache_prefix` 开，且非冷压缩）用 `runForkedAgent` 共享主会话提示词缓存：`querySource:"compact"`、`maxTurns:1`、`canUseTool` 一律拒绝（`createCompactCanUseTool`，`#u8e`）、`skipCacheWrite`、`skipTranscript`；成功记 `tengu_compact_cache_sharing_success`。
   - 失败/无文本回退直连：消息去媒体（`stripImagesFromMessages`，`#N2`）、冷压缩（`CLAUDE_CODE_COLD_COMPACT`）时只留必要附件并把字符串截到 100 字符（`keepEssentialAttachmentsOnly`/`stripNonEssentialContent`）；工具只带 Read（+ToolSearch、MCP 工具，若工具搜索开启）；沿模型 fallback 链与拒答回退重试。
5. 摘要文本以 "Prompt is too long" 开头 → `truncateHeadForPromptTooLong`（`#Rln` → `truncateHeadForPTLRetry` `#a8e`）按超出量（或 20%）丢最早的 API 轮次组，最多 `MAX_PTL_RETRIES`=3 次；仍失败抛 `ERROR_MESSAGE_PROMPT_TOO_LONG`。
6. 无摘要 / API 错误 → `tengu_compact_failed` 并抛错。
7. 清空 `readFileState`，`buildPostCompactAttachments`（`#jTe`，见第 5 节）。
8. 边界：`createCompactBoundaryMessage("auto"|"manual", preTokens, lastUuid)` 生成 `system/compact_boundary`，`compactMetadata` 含 preTokens、postTokens、durationMs、preCompactDiscoveredTools、cumulativeDroppedTokens（`setCumulativeDroppedTokens`，`#wK`）。
9. 摘要消息：`createUserMessage({...Bee(summaryText, {...}), isCompactSummary:true, isVisibleInTranscriptOnly:true})`；`Bee` 用 `formatCompactSummary`（`#jsr`）去 analysis、把 summary 变成 "Summary:"，前面是 `COMPACT_CONTINUATION_PREAMBLE`。
10. 遥测 `tengu_compact`（pre/post token、ptlAttempts、promptCacheSharingEnabled、summaryPromptArm、上下文构成 `tokenStatsToStatsigMetrics(analyzeContext(...))`）；`executePostCompactHooks`。
11. 返回 CompactionResult（见第 9 节）；`finally` 发 `compact_end`、`{ type: "sdk_status", status: null }`。

**部分压缩** `partialCompactConversation`（`#m8s`）：消息选择器触发，`direction` 为 `from`（摘要所选位置之后，保留之前）或 `up_to`（摘要之前，保留之后；保留段含 thinking 时 `decideKeptThinkingStrip` 决定是否剥离并加 `thinking_stripped` 标记）。提示词用 `getPartialCompactPrompt`（`#Asn`），用户反馈作为 "User context:"，边界带 userFeedback 与摘要条数，遥测 `tengu_partial_compact`/`tengu_partial_compact_failed`。

**反应式压缩**（prompt too long 之后）：queryLoop 收到被扣住的 `prompt_too_long`/`image_error` 错误时，经 `canReactiveCompact`（`#lJn`，未尝试过、非 compact 来源、自动压缩开、远程会话 bridge 打开）后调 `triggerReactiveCompact` → `tryReactiveCompact` → `runReactiveCompact`（`services/compact/reactiveCompact.ts`，按 API 轮次分组保留尾部、只摘要头部，可回退整段），成功由 `buildReactiveCompactionResult`（`#szr`）组装，迁移 `transition: reactive_compact_retry`（或 `precomputed_compact_swap`）进入下一轮；可有一次“更深一层”压缩（`reactiveCompactDeeperPass`）。失败则把错误交给用户（`tengu_ptl_surfaced_to_user`）。

### 4. 压缩提示词（`services/compact/prompt.ts`）

- 结构：`getNoToolsPreamble`（只回文本）+ 正文 + 可选 "Additional Instructions:" + `getNoToolsTrailer`。
- 变体表 `COMPACT_PROMPT_ARMS`（`chunk-e6aww6q8.js#$sr` 语句内，偏移 2096868，`services/compact/prompt.ts`）：

| arm | 回复形状 | 正文 |
|---|---|---|
| `control`（默认） | analysis + summary | `buildBaseCompactPrompt({analysisFirst:true})`：旧版 9 节摘要结构 |
| `no_scratchpad` | 仅 summary | 同上不要 analysis |
| `no_scratchpad_capped` | 仅 summary | 限 2000 词 |
| `no_scratchpad_keep_asks` | 仅 summary | 早先摘要中的用户请求原样保留 |
| `lean` | 仅 summary | `buildLeanCompactPrompt`：说明下个窗口还会有什么（最近 5 个文件、计划/技能/后台任务、可选转录路径） |
| `short` / `short_v2` | 仅 summary | 简短指令（v2 附继续未完成工作的 resumeGuidance） |
| `capped` | 仅 summary | `CAPPED_COMPACT_PROMPT`，2000 词以内 |

- 部分压缩：`PARTIAL_COMPACT_PROMPT`（from）与 `PARTIAL_COMPACT_UP_TO_PROMPT`（up_to，第 8/9 节改为 Work Completed / Context for Continuing Work）。
- 316 新增的通用说明：`SECURITY_INSTRUCTIONS_NOTE`（保留安全相关指令原文）、`USER_MESSAGE_DEFINITION_NOTE`（只有 user 角色才算用户消息）。

### 5. 压缩后重新注入的附件 `buildPostCompactAttachments`（`#jTe`）

顺序：最近读过的文件（`createPostCompactFileAttachments`，最多 5 个、每个 5000 token、合计 50000）→ 后台代理 `task_status`（`createAsyncAgentAttachmentsIfNeeded`）→ 后台 shell `task_status` → peer handback 的 queued_command → `plan_file_reference` → `plan_mode`（plan 模式时）→ `invoked_skills`（每个 5000、合计 25000）→ 延迟工具/代理列表/MCP 说明等增量公告（压缩后要重新公告）→ projects 线程请求携带、`goal_status`、`session_cron_carry` → SessionStart(`compact`) 钩子结果。子代理（`isDelegatedObservationContext(agentContext)`）不注入后台任务类附件。

### 6. microcompact 与 API 侧 context_management

- **请求体**：`getAPIContextManagement`（`#$7t`）在启用 thinking 时生成 `{edits:[{type:"clear_thinking_20251015", keep:"all"}]}`，与 verify.md 7.3 实测一致；有工具清理计划时追加。queryModel 仅在带 context-management beta 时发送。
- **空闲返回后服务端清理**：`planToolResultClearingAfterIdle`（`chunk-g54kbxqw.js#Hlr`）——GrowthBook `tengu_jiggly_blossom`（on/shadow/off），用户空闲 ≥3900 秒（缓存已失效）回来后，若可清理工具调用足够多，生成 `{type:"clear_tool_uses_20250919", trigger:{type:"tool_uses",value}, keep:{type:"tool_uses",value:12}, clear_at_least:{type:"input_tokens",value:20000}, exclude_tools}`；响应里的 `applied_edits` 由 `recordIdleClearingServerReport`（`#lmi`）记录，`addClientEstimatedClearedTokens`（`#A7o`）补 `client_estimated_cleared_input_tokens`。可清理工具集合 `vt`：Read、Bash 类、Grep、WebFetch 等。
- **keep-recent 本地清理** `maybeTimeBasedMicrocompact`（`#ami`）：由上下文提示控制器（`chunk-gzv3xh26.js`）触发，保留最近 N 个结果，其余替换为 `"[Old tool result content cleared]"`（`TIME_BASED_MC_CLEARED_MESSAGE`），节省 <20000 token 不做；随后 `suppressCompactWarning` 并通知缓存删除。
- 旧版的 cached microcompact（`tengu_cached_microcompact`、cache_edits）在 316 中找不到。

### 7. session memory 压缩

旧版 `services/compact/sessionMemoryCompact.ts`（`tengu_sm_compact*` 系列）在 316 中**没有任何遥测串或对应代码**。此路径下两个声明：`chunk-e6aww6q8.js#szr` 实为反应式压缩结果组装，`chunk-tyg7f3ek.js#Gb` 实为 headless 停放轮次 uuid 计算。316 的 SessionMemory 仍存在（queryLoop 调 `manuallyExtractSessionMemory`），但不参与压缩路径；压缩由“预计算摘要 + 反应式管线”取代。

### 8. token 计数与估算

- **以 API usage 为准**：`tokenCountWithEstimation`（`#M4o`）取最近一次响应的上下文 token（遇到 compact_boundary 为 0）；`Tp`（`chunk-e6aww6q8.js#Tp`，`services/compact/autoCompact.ts`，仍为压缩名）= 锚点 usage + 之后消息粗估，是阈值判断用的主函数。`getTokenUsage`（`chunk-e6aww6q8.js:1534635-1534844`，`utils/tokens.ts`）跳过合成占位、`isUnmetered`；`getTokenCountFromUsage`（`chunk-g54kbxqw.js#Ste`）取 `iterations` 最后一项。
- **粗估**：`roughTokenCountEstimation`（`#pc`）按 4 字节/token；json/jsonl/jsonc 2 字节；图片/文档固定 2000；tool_use 为名字+输入 JSON 长度。
- **countTokens API**：`countMessagesTokensWithAPI`（`#gVe`）——Bedrock 用 `CountTokensCommand`；否则 `anthropic.beta.messages.countTokens`（去 caller/tool_reference、去工具 schema 的 defer_loading 等，含 thinking 时带 thinking）；网关 501 时 `countTokensViaHaikuFallback` 发 max_tokens=1 的真实请求读 usage。
- **max_output_tokens**：`getModelMaxOutputTokens`（`chunk-aepeg2w5.js#age`）{default, upperLimit}：模型目录覆盖 → 目录值 → claude-3 老模型 4096/8192 → 默认 32000/128000；再受 clientdata `heather_vale` 与能力表约束。主循环再经 `CLAUDE_CODE_MAX_OUTPUT_TOKENS` 调整（见 claude.ts 片段）。
- **累计丢弃**：边界上 `cumulativeDroppedTokens` 记录历次压缩丢掉的总 token。

### 9. 数据结构

**CompactionResult**（compactConversation/partial/reactive 共用）：
`{ boundaryMarker, summaryMessages, messagesToKeep, attachments, hookResults, userDisplayMessage?, preCompactTokenCount, postCompactTokenCount, truePostCompactTokenCount, compactionUsage, ptlAttempts?, promptCacheSharingEnabled?, replacement? }`；`buildPostCompactMessages`（`#EW`）按 边界→摘要→replacement→保留→附件→钩子 拼接。

**compact_boundary 消息** `compactMetadata`：`trigger(auto|manual)`、`preTokens`、`postTokens`、`durationMs`、`cumulativeDroppedTokens`、`preCompactDiscoveredTools`、`preservedSegment`（`{headUuid, anchorUuid, tailUuid}`）、`preservedMessages`（`{anchorUuid, uuids, allUuids}`）、`precomputed?`、`preCompactArtifactReadVersions`（可选）、userFeedback（部分压缩）。

**compactTracking**（queryLoop 状态）：`{compacted, turnId, turnCounter, consecutiveFailures, consecutiveRapidRefills}`。

**等级**：`{level: "ok"|"warn"|"compact"|"blocked", pctLeft?}`。

### 10. 辅助摘要/建议

- **提示建议**（`services/PromptSuggestion/promptSuggestion.ts`）：`shouldEnablePromptSuggestion`（`CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION` > GrowthBook `tengu_chomp_inflection` > 交互会话 > 非 swarm 队员 > 设置 `promptSuggestionEnabled`）；每轮主线程结束 `executePromptSuggestion` → `tryGenerateSuggestion`（至少 2 条回答、无 API 错误、非 plan 模式、未限额、缓存不冷：非缓存 token >1 万则跳过，`tengu_chomp_thaw` 可放行缓存写入）→ fork（`prompt_suggestion`）→ `stripSuggestionWrapper` → `shouldFilterSuggestion`（12 类过滤，含中日韩文本）。
- **代理进度摘要** `startAgentSummarization`（`chunk-0h4e7gnq.js#xu`）：3–5 个词现在进行时。
- **工具批次标签** `generateToolUseSummary`（`chunk-ha3km179.js#Ja`）：`CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES` 打开（`buildQueryConfig` 返回的 `queryConfig.gates.emitToolUseSummaries`），小模型、约 30 字符过去时；queryLoop 把结果作为 `pendingToolUseSummary` 在下一轮产出。
- **/btw 旁路提问** `runSideQuestion`（`chunk-pphytj9x.js#JHt`，门面名）：fork（`side_question`，单轮、拒绝工具、共享缓存），对进行中的工具补“仍在进行”占位结果，带历史 btw 问答；回答写入 `session.btwHistory`。
- **/context 建议**（`utils/contextSuggestions.ts`）：≥80% 警告、单工具 ≥15% 且 ≥1 万 token、Read ≥5%、记忆文件 ≥5% 且 ≥5000、自动压缩关闭且 50–80%。

### 11. 配置项与开关

| 名称 | 作用 |
|---|---|
| `DISABLE_COMPACT` | 关闭所有压缩（autocompact 直接 not_needed） |
| `DISABLE_AUTO_COMPACT` | 关闭自动压缩 |
| 设置 `autoCompactEnabled` | 默认 true |
| 设置 `autoCompactWindow` | 数字 / `"auto"` / `{default, byModel}` / `{ceiling, inner}` |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | 自动压缩窗口（优先于设置） |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | 阈值百分比 |
| `CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE` | 阻断阈值 token |
| `CLAUDE_CODE_COLD_COMPACT` | 冷压缩（去非必要内容，不共享缓存） |
| `CLAUDE_CODE_CURRIED_TRINKET` / `tengu_curried_trinket` | 摘要提示词变体 |
| `CLAUDE_CODE_DISABLE_1M_CONTEXT` | 禁用 1M，窗口回到 200k |
| `CLAUDE_CODE_DISABLE_UNKNOWN_MODEL_WINDOW_ENFORCEMENT` | 不对未知模型强制窗口 |
| `CLAUDE_CODE_MAX_CONTEXT_TOKENS` | 未知模型窗口判定的一部分 |
| `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION` | 提示建议开关 |
| `CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES` | 工具批次标签 |
| GrowthBook | `tengu_compact_cache_prefix`（共享缓存摘要，默认开）、`tengu_amber_moleskin` / `tengu_amber_rokovoko`（预计算缓冲）、`tengu_peppy_gosling`（远程 PCT）、`tengu_jiggly_blossom`（空闲后工具清理）、`tengu_chomp_inflection` / `tengu_chomp_thaw`（提示建议） |

### 12. 与 2.1.88 的差异（有代码证据）

1. **session memory 压缩消失**：`tengu_sm_compact*` 在 original 中 0 处；路径被反应式压缩取代。
2. **预计算 + 反应式压缩**：新增 `isAtPrecomputeThreshold`、`precomputed_compact_swap`、`reactive_compact_retry`、`tengu_reactive_compact_*`、`tengu_auto_compact_routed_reactive`。
3. **自动压缩窗口来源多样化**：旧版只有 env 覆盖；316 有 settings（含 byModel/ceiling）、clientdata、实验、模型默认表、unknown-model。
4. **快速回填熔断**（`tengu_auto_compact_rapid_refill_breaker`，3 轮内连续 3 次）为新增。
5. **摘要提示词 A/B**：旧版只有一种 BASE；316 有 8 个 arm，并新增 lean/short/capped 文本与安全指令说明。
6. **摘要请求共享缓存**：`tengu_compact_cache_prefix` 走 fork（旧版有 promptCacheSharing 但实现不同）；冷压缩 `CLAUDE_CODE_COLD_COMPACT` 新增。
7. **microcompact**：旧版 cached microcompact（cache_edits）消失；新增服务端 `clear_tool_uses_20250919` 空闲清理与 keep-recent 清理。
8. **压缩后附件**增加 background shell、peer handback、goal_status、session_cron_carry、projects 线程携带。
9. **累计丢弃 token**（`cumulativeDroppedTokens`）新增。
10. `awaySummary.ts` 的旧版功能（离开摘要）在 316 中未定位到；该路径被 Artifact 评论快速确认占用（可能是错归，见过程文档）。

### 13. 未解之处

- `chunk-e6aww6q8.js#yzr`（autocompact 本体）、`#dJn`/`#Tjo`/`#HTe`（反应式压缩）、`#qee`（变体选择）、`#Bee`（摘要消息构造）、`#Tp`/`#U4e`（token 锚点估算）、`#bUo`（窗口默认来源）、`#Z4e`/`#AJ`/`#DZ`（阈值）写作时都在 `_unattributed`，建议归入 autoCompact.ts / compact.ts / tokens.ts 后再命名（place-rest 后已落位到 `services/compact/` 下各文件并有了名字）。
- `chunk-e6aww6q8.js#rpr`（更大模型压缩）的选择条件未细读。
- `chunk-gzv3xh26.js` 的上下文提示控制器（触发 keep-recent 清理、`buildRequestParams` 加 beta）未展开。
- 旧版 awaySummary 的真实位置未找到。

## 13. 模型选择、能力、价格、effort、thinking、fast mode、advisor

> 子区域 model；命名与声明说明在 naming/semantic-query.jsonl、naming/docs-query.jsonl。
> 范围：`utils/model/*`、`utils/modelCost.ts`、`utils/effort.ts`、`utils/fastMode.ts`、`utils/thinking.ts`、`utils/advisor.ts`。下文函数名为本轮语义命名（或旧版名），括号内是声明 id。

### 1. 模型地图

| 重组模块 | 职责 |
|---|---|
| `utils/model/configs.ts` | 由内置 **model-catalog**（`chunk-v9tcvh08.js` 的 `uio`，带注释 "Hand-maintained baked-in model catalog"）生成每个模型在 8 个提供商下的 id（`CLAUDE_*_CONFIG`）、`OPUS_FALLBACK_ORDER`、第一方 id ↔ catalog 键 |
| `utils/model/providers.ts` | `getAPIProvider`（`chunk-v9tcvh08.js#Te`）判定提供商；第一方主机白名单 |
| `utils/model/modelStrings.ts` | 当前提供商的模型字符串表（Bedrock 区域前缀与推理配置文件发现），`settings.modelOverrides` 应用/反查 |
| `utils/model/aliases.ts` | 别名 → 内置默认模型（`resolveBuiltinAlias`） |
| `utils/model/model.ts` | 用户指定模型解析（`parseUserSpecifiedModel`）、各档默认模型、`[1m]` 处理、显示名、旧 Opus 重映射 |
| `utils/model/agent.ts` | 子代理模型解析（`getAgentModel`）；第三方档位固定检测；混入 /model 选项构建函数 |
| `utils/model/modelOptions.ts` | /model 选择器选项（`getModelOptions`、`getModelOptionsBase`） |
| `utils/model/modelAllowlist.ts` | availableModels 相关：已知模型名、版本前缀匹配、别名展开 |
| `utils/model/deprecation.ts` | 弃用表与提示、旧 Opus 4/4.1 自动重映射 |
| `utils/model/validateModel.ts` | /model、--model 校验与服务器探测 |
| `utils/model/bedrock.ts` | Bedrock 客户端、推理配置文件、区域前缀；混入环境变量注册表一段 |
| `utils/model/modelSupportOverrides.ts` | 第三方 `ANTHROPIC_DEFAULT_…_MODEL_SUPPORTED_CAPABILITIES`（如 `ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES`） |
| `utils/model/modelCapabilities.ts` | 本地能力缓存（316 中读取开关恒关）；混入 accessFallbackModels 解析 |
| `utils/model/contextWindowUpgradeCheck.ts` | 1M 升级提示 |
| `utils/model/check1mAccess.ts` | 订阅用户 1M 依赖 usage credits |
| `utils/model/antModels.ts` | **切分错误**：里面是文件路径敏感性判定 |
| `utils/modelCost.ts` | 价格表与成本计算 |
| `utils/effort.ts` | effort 级别与默认值、支持判定 |
| `utils/thinking.ts` | thinking 支持与形态、ultrathink |
| `utils/fastMode.ts` | fast mode（penguin）组织状态、冷却、拒绝处理 |
| `utils/advisor.ts` | 服务器端 advisor 工具 |

### 2. 关键流程

#### 2.1 主循环模型的决定顺序

1. `utils/model/model.ts · getUserSpecifiedModelSetting`（`chunk-aepeg2w5.js#a8t`）：会话初始模型（`--model`，bootstrap `getInitialMainLoopModel`）> `ANTHROPIC_MODEL` > `settings.model`；经 `normalizeModelSetting`（`#fmr`）：不在白名单时尝试白名单替代（`Hk`），持久化来源的未解析别名丢弃。
2. 会话内覆盖：bootstrap `getMainLoopModelOverride`（/model 切换）优先于上一步，见 `getUserSpecifiedModelSetting`（`chunk-aepeg2w5.js#Z_`，写作时未命名、在 `_unattributed`）。
3. 无用户设置时走默认 `resolveDefaultMainLoopModelSetting()`/`resolvePlanModeModel()`（`chunk-aepeg2w5.js#tne`、`chunk-aepeg2w5.js#Fw`）：服务端下发/组织默认（`attribution: org/served`）→ `ANTHROPIC_DEFAULT_MODEL`（env）→ 档位默认 `envDefaultModel()`（`chunk-aepeg2w5.js#rm`）：
   - 订阅用户有 Opus 权限（`hasOpusAccess`：max；team/enterprise/pro 视条件）或第一方类提供商 → 默认 Opus（`getDefaultOpusModel` 并按 1M optIn 加 `[1m]`）；
   - Mantle → `opus55`；Bedrock/Vertex → 只有 Sonnet 权限时 Sonnet，否则 Opus；
   - 其余（Foundry 等）→ 默认 Sonnet。
   - 托管 `availableModels`+`enforceAvailableModels` 可把默认改到被允许的模型（`om()`）。
4. `parseUserSpecifiedModel`（`#Ut`，写作时称 resolveModelSetting）→ `resolveModelAliasSetting`（`#fG`，写作时称 parseUserSpecifiedModel）：
   - 别名：`opus`→`getDefaultOpusModel()`（`ANTHROPIC_DEFAULT_OPUS_MODEL` > settings 档位覆盖 > catalog 默认），`sonnet`/`opusplan`→`getDefaultSonnetModel`，`haiku`→默认 Haiku（`TD`），`fable`→默认 Fable（`getDefaultFableModel`，`chunk-aepeg2w5.js#E6e`），`best`→`NK()`（catalog `best: "fable"` 可用则 Fable，否则 Opus）；`[1m]` 后缀保留。
   - 旧 Opus（`claude-opus-4-0/4-1` 及带日期 id，`LEGACY_OPUS_FIRSTPARTY`）在第一方类提供商上自动换成默认 Opus，`CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP=1` 关闭。
5. plan 模式：`getRuntimeMainLoopModel()`/`resolveRuntimeMainLoopModel()`（`chunk-aepeg2w5.js#by`、`chunk-aepeg2w5.js#u8t`）对 `opusplan`/`haiku` 设置做 plan 时升级（Opus/Sonnet），受白名单时降档并告警。
6. 主循环每轮 `queryLoop` 里再经 fallback 链、拒答回退、额度同意等改写（见 query 手册）。

#### 2.2 别名与 316 模型 id（catalog `aliases`）

| 别名 | 默认（第一方等） | 按提供商覆盖 |
|---|---|---|
| opus | `claude-opus-5-5` | foundry `claude-opus-4-6`，gateway `claude-opus-4-7` |
| sonnet | `claude-sonnet-5-5` | bedrock/vertex/foundry/mantle `claude-sonnet-4-5`；anthropic_aws、gateway `claude-sonnet-4-6` |
| haiku | `claude-haiku-5-5` | bedrock/vertex/foundry/mantle/aws/gcloud/gateway `claude-haiku-4-5` |
| fable | `claude-fable-5-1` | gateway `claude-fable-5` |
| best | catalog `best: "fable"`，不可用时 opus | |
| opusplan | plan 时 Opus、其余 Sonnet | |
| `xxx[1m]` | 1M 上下文变体 | |

别名列表 `E8 = [sonnet, opus, haiku, fable, best, sonnet[1m], opus[1m], fable[1m], opusplan]`，族列表 `v8 = [sonnet, opus, haiku, fable]`（`chunk-jabbzrn8.js#fve`）。

#### 2.3 各提供商模型字符串

- catalog 每个模型有 `provider_ids`：`first_party`、`bedrock`（如 `us.anthropic.claude-opus-5-5`）、`vertex`、`foundry`、`anthropic_aws`、`anthropic_google_cloud`、`mantle`（如 `anthropic.claude-opus-5-5`）、`gateway`。转换函数 `z()`/`F()`（`chunk-v9tcvh08.js`）生成 `No`（键 haiku35…fable51）。
- `utils/model/modelStrings.ts · getModelStringsForProvider`（`#Ai`）：提供商缺该模型时借用；Bedrock 前缀 = `ANTHROPIC_BEDROCK_REGION_PREFIX` 或由 AWS 区域推断（us-gov-/us-/eu-/…）。
- Bedrock 首次使用异步 `getBedrockModelStringsFromProfiles`（`#WN`）：`ListInferenceProfiles(SYSTEM_DEFINED)` 匹配 `findFirstMatch`，找不到用硬编码。
- `getModelStrings`（`#ep`）再叠加 `settings.modelOverrides`（第一方 id → 自定义 id）。

#### 2.4 上下文窗口与 max_output_tokens

catalog 字段 `context` 与 `max_output_tokens`（摘录）：

| 模型 | 窗口 | 默认/上限输出 |
|---|---|---|
| opus-5-5 | 1M（native_1m） | 128000 / 128000 |
| opus-5、4-8、4-7 | 1M | 64000 / 128000 |
| opus-4-6 | 200k，可 1M beta | 64000 / 128000 |
| sonnet-5-5 | 1M | 128000 / 128000 |
| sonnet-5 | 1M | 64000 / 128000 |
| sonnet-4-6 | 200k，可 1M | 32000 / 128000 |
| haiku-5-5 | 1M | 128000 / 128000 |
| haiku-4-5 | 200k | 32000 / 64000 |
| fable-5、5-1，mythos-5、5-1 | 1M | 64000 / 128000 |

- 请求的 `max_tokens`：`services/api/claude.ts · getMaxOutputTokensForModel`（`chunk-aepeg2w5.js#tRn`）= 模型默认，`CLAUDE_CODE_MAX_OUTPUT_TOKENS` 可在上限内调整。实测 opus-5-5 发 `max_tokens` 为 128000（verify.md 7.3）与此一致。
- `getSonnet46ContextWindowOverride`（`#Zxt`）：客户端数据 `kelp_forest_sonnet` 可把 sonnet-4-6 窗口调到 200k–1M。
- 1M 合并：`isOpus1mMergeEnabled`（`#ige`）第一方、非 Pro、未设 `CLAUDE_CODE_DISABLE_1M_CONTEXT`；`opus1mMergeTagsDefaultOpus`（`#T6e`，写作时称 isDefaultOpus1mOptIn）时 opus 默认带 `[1m]`。

#### 2.5 价格（`utils/modelCost.ts`）

- catalog `pricing_tiers`（$/百万 token：输入/输出，缓存写 5m/1h，读，web 搜索 $0.01/次）：tier_2_10、tier_2_10_cache_read_0_10、tier_3_15、tier_5_25、tier_15_75、tier_10_50、tier_10_50_cache_read_0_25、tier_4_20_cache_read_0_20、haiku_35、haiku_45、haiku_55（10 万 token 以上换长提示词价）。
- 映射：opus-5-5 → $4/$20（读 0.2）；opus-4-5…opus-5 → $5/$25；sonnet-5-5 → $2/$10（读 0.1）；sonnet-5 → $2/$10；sonnet-3.x/4.x → $3/$15；haiku-5-5 → $0.1/$0.5；fable-5-1/mythos-5-1 → $10/$50（读 0.25）。
- fast mode 价（`getFastModeCosts` `#Wxt`，`getModelCosts` `#e8t`）：opus-5-5 $8/$40；opus-4-8/opus-5 $10/$50；opus-4-6/4-7 $30/$150。
- 计算：`calculateUSDCost`（`#PIe`）→ 组织价格（`policySettings.modelPricing`，`getOrgModelPricing` `#Di`，带 multiplier）或 `getModelCosts` → `tokensToUSDCost`（`#Gxt`：缓存写按 1h/5m 拆分，`inference_geo=us` ×1.1）。未知模型记 `tengu_unknown_model_cost` 并按默认模型价。
- 促销：GrowthBook `alder_ford`（`PRICING_PROMOTION_SCHEMA`）让某模型在截止前按另一模型计价。

#### 2.6 effort（`utils/effort.ts`）

- 级别 `EFFORT_LEVELS = low, medium, high, xhigh, max`（`chunk-dcmhvw5a.js#Ei`）。`med` 视作 medium，`ultracode` 视作 xhigh。
- 支持判定 `modelSupportsEffort`（`chunk-kswt4qha.js#iS`）：API 拒绝过 → 否；3P 能力覆盖；`CLAUDE_CODE_MODEL_CAPABILITIES`；服务端目录 `effort_levels`；旧模型（3.x、opus-4-0/4-1、sonnet-4-0/4-5、haiku-4-5）否；`CLAUDE_CODE_ALWAYS_ENABLE_EFFORT`；catalog 能力 `effort`；第一方类提供商默认支持。`max`/`xhigh` 同理（能力 `max_effort`/`xhigh_effort`）。
- 本轮 effort `resolveEffortValue()`（`chunk-kswt4qha.js#aS`，`utils/effort.ts`）：钩子给的值 > `CLAUDE_CODE_EFFORT_LEVEL`（`unset/auto` 表示不发）> 本轮 effort > 会话设置 > 默认。默认 `getDefaultEffortForModel()`：GrowthBook `tengu_witty_wand`（按模型）> 组织默认（`default_effort_level`）> fallback 携带 > 服务端目录 `default_effort` > catalog `default_effort`（opus-5-5/sonnet-5-5/haiku-5-5 为 medium，opus-5/4-8/fable 为 high，opus-4-7 xhigh）。实测默认 `output_config.effort` 为 medium（opus-5-5）一致。
- 组织上限：`modelSettings.<模型>.maxEffortLevel` 与账户 `maxEffortLevel` 取较低，`resolveAppliedEffort`（`#Zkn`）截断，max/xhigh 不支持时降为 high。
- 子代理：`CLAUDE_CODE_SUBAGENT_EFFORT`。

#### 2.7 thinking（`utils/thinking.ts`）

- 默认开启；`MAX_THINKING_TOKENS<=0` 或 `settings.alwaysThinkingEnabled=false` 关闭（`shouldEnableThinkingByDefault` `#Bss`）。
- 形态 `modelSupportsAdaptiveThinking`（`#dlt`）：支持 adaptive（catalog 能力 `adaptive_thinking`；`CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` 只对 opus-4-6/sonnet-4-6 生效）→ `{type:"adaptive", display}`；否则 `{type:"enabled", budget_tokens}`（预算默认 = 上限-1，夹在 1024 与 max_tokens-1 之间）。组装在 `services/api/claude.ts · queryModel` 的 `buildRequestParams`。
- `rejects_disabled_thinking` 模型（`isThinkingAlwaysOn` `#alt`）：用户关思考时 `upgradeDisabledThinkingForModel`（`#Svi`）改发 adaptive；提示 "Thinking can't be turned off for …"。
- display：设置 `showThinkingSummaries` → `summarized`；highlights 被拒后改 `omitted`。实测 `thinking={type: adaptive, display: omitted}`。
- `ultrathink` 关键字（`hasUltrathinkKeyword`），开关 `CLAUDE_CODE_DISABLE_ULTRATHINK` 与 GrowthBook `tengu_turtle_carbon`；彩虹高亮色 `RAINBOW_COLORS`。

#### 2.8 fast mode（`utils/fastMode.ts`）

1. 总开关 `isFastModeEnabled`（`chunk-aepeg2w5.js#ys`）：第一方且未设 `CLAUDE_CODE_DISABLE_FAST_MODE`。
2. 组织状态预取 `prefetchFastModeStatus`（`#zUe`）→ `fetchFastModeStatus`（`#l0`）`GET /api/claude_code_penguin_mode`（10 秒超时、30 秒节流），401/撤销时刷新 OAuth；结果写 `penguinModeOrgEnabled` 缓存。`CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK` 跳过。
3. 不可用原因 `getFastModeUnavailableReasonCode`（`#ED`）：not_first_party / disabled_by_env / GrowthBook `tengu_penguins_off` / model_not_allowed / 托管 `fastMode=false` 或 `fastModePerSessionOptIn` / SDK 需显式开启 / pending / 组织 disabled 原因（free、preference、extra_usage_disabled、network_error、unknown）。
4. 模型支持：`_y()` 看 catalog 能力 `fast_mode`（opus-4-6 起）。
5. 请求：`queryModel` 在 fast 开、可用、未冷却、模型支持且未被拒时发 `speed:"fast"`。
6. 运行期：被限流 → `triggerFastModeCooldown`（`#eEi`）；API 拒绝 → `handleFastModeRejectedByAPI`（`#tEi`）；超额拒绝 → `handleFastModeOverageRejection`（`#oEi`）；fallback 模型拒绝 fast → `markFallbackModelFastRejected`（本会话标准速度）。
7. 状态 `getFastModeState`（`#Qte`）：on / cooldown / off，写入 SDK result 的 `fast_mode_state`。

#### 2.9 advisor（`utils/advisor.ts`）

- 服务器端工具 `{type: "advisor_20260301", name: "advisor", model, defer_loading?}` 由 `queryModel` 附加到 tools（`extraToolSchemas`）。
- 可用 `isAdvisorEnabled`（`chunk-s61vbvea.js#V2t`）：未设 `CLAUDE_CODE_DISABLE_ADVISOR_TOOL`、未被拒（进程级或按 base URL）、第一方/anthropicAws/anthropicGoogleCloud、允许实验 beta；`isAdvisorToolEnabled` 再要 `CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL` 或 GrowthBook `tengu_sage_compass2`。
- 资格：catalog `advisor_rank`（haiku-4-5 1、sonnet-4-6 2、opus-4-6 3、sonnet-5/haiku-5-5 4、opus-4-7/4-8 5、sonnet-5-5 6、opus-5/5-5 7、fable-5/mythos-5 8、fable-5-1/mythos-5-1 9），顾问 rank ≥ 2 且不低于被顾问模型（`resolveAdvisorModel` `#INe`）。
- 设置 `settings.advisorModel`，/advisor 命令 `setAdvisorModelCommand`（`chunk-9b6702jm.js#Jht`）。用量来自 `usage.iterations` 中 `advisor_message`，单独计价（`getAdvisorUsage`）。

#### 2.10 弃用与白名单

- 弃用表 `DEPRECATED_MODELS`（`#Ak`）：opus-4-1、opus-4-0（重映射到 "the latest Opus"）、sonnet-4-0、3-opus、3-7-sonnet、3-5-haiku，各提供商退役日期（如 sonnet-4-0 第一方 2026-06-15）。
- 白名单：`settings.availableModels`、托管 `enforceAvailableModels`、服务端 `model_access` 权利、`deniedModels`；`isModelAllowed`（`chunk-aepeg2w5.js#ro`，`utils/model/modelAllowlist.ts`）为总判定。校验 `validateModel`（`chunk-ewfzwa2f.js#f0r`）对未知名字发 `max_tokens=1` 的探测请求。

### 3. 数据结构

- **catalog 条目**（`chunk-v9tcvh08.js` schema `I()`）：`id, family, display_name, knowledge_cutoff, provider_ids{first_party,bedrock,vertex,foundry,anthropic_aws,anthropic_google_cloud,mantle,gateway}, eager_input_streaming{bedrock,vertex}, vertex_region_env_var, fallback_3p, context{window, maximum_window, native_1m, supports_1m_beta, supports_1m_suffix, clamp_long_context_without_beta}, max_output_tokens{default, upper}, pricing(档名|对象), capabilities[], default_effort, effort_cost_index{low..max}, image_limits{maxWidth,maxHeight,maxImageTokens,maxBase64Size}, advisor_rank, fallback_chain[], picker{section,badge,disabled_reason,tiers}, deprecation{retirement_dates, remapped_to}, min_cli_version`。顶层：`schema_version, pricing_tiers, models, aliases{default, per_provider}, defaults, best, latest_per_family, alias_migration`。
- **能力名**（`chunk-v9tcvh08.js#Ofs`）：effort、max_effort、xhigh_effort、adaptive_thinking、rejects_disabled_thinking、thinking_disabled_effort_cap、mid_conv_system、mid_conv_tool_change、per_turn_effort、per_turn_timing、context_management、fast_mode、lean_prompt、fable_5_mitigations、refusal_fallback、no_refusal_fallback、opus_5_prompt_bundle、fable_5_1_prompt_bundle、opus_5_5_prompt_bundle、turn_updates、thinking_display_updates、tool_loaded_text 等；可用 `CLAUDE_CODE_MODEL_CAPABILITIES="模型=能力,-能力;…"` 覆盖。
- **ModelCosts**：`{inputTokens, outputTokens, promptCacheWriteTokens, promptCacheWrite1hTokens?, promptCacheReadTokens, webSearchRequests, longPrompt?{abovePromptTokens,…}}`。
- **APIProvider**：`firstParty | bedrock | vertex | foundry | anthropicAws | anthropicGoogleCloud | mantle | gateway`。
- **fast mode 组织状态**：`{status: pending|enabled|disabled, reason?, source?: server|guess}`；运行期 `{status: active|cooldown, resetAt, reason}`。

### 4. 环境变量、设置与开关

- 模型：`ANTHROPIC_MODEL`、`ANTHROPIC_DEFAULT_MODEL`、`ANTHROPIC_DEFAULT_OPUS_MODEL`/`ANTHROPIC_DEFAULT_SONNET_MODEL`/`ANTHROPIC_DEFAULT_HAIKU_MODEL`/`ANTHROPIC_DEFAULT_FABLE_MODEL`（及 `_NAME/_DESCRIPTION/_SUPPORTED_CAPABILITIES`）、`ANTHROPIC_SMALL_FAST_MODEL(_AWS_REGION)`、`ANTHROPIC_CUSTOM_MODEL_OPTION(_NAME/_DESCRIPTION)`、`CLAUDE_CODE_SUBAGENT_MODEL(_FORCE)`、`CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP`、`CLAUDE_CODE_DISABLE_1M_CONTEXT`、`CLAUDE_CODE_MODEL_CAPABILITIES`、`CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST`。
- 提供商：`CLAUDE_CODE_USE_BEDROCK`/`CLAUDE_CODE_USE_VERTEX`/`CLAUDE_CODE_USE_FOUNDRY`/`CLAUDE_CODE_USE_ANTHROPIC_AWS`/`CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD`/`CLAUDE_CODE_USE_MANTLE`/`CLAUDE_CODE_USE_GATEWAY`、`ANTHROPIC_BEDROCK_BASE_URL`、`ANTHROPIC_BEDROCK_REGION_PREFIX`、`CLAUDE_CODE_SKIP_BEDROCK_AUTH`、`AWS_REGION` 等（见 bedrock.ts 中的注册表片段）。
- effort/thinking：`CLAUDE_CODE_EFFORT_LEVEL`、`CLAUDE_CODE_SUBAGENT_EFFORT`、`CLAUDE_CODE_ALWAYS_ENABLE_EFFORT`、`MAX_THINKING_TOKENS`、`CLAUDE_CODE_DISABLE_THINKING`、`CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING`、`CLAUDE_CODE_DISABLE_ULTRATHINK`、`CLAUDE_CODE_MAX_OUTPUT_TOKENS`。
- fast/advisor：`CLAUDE_CODE_DISABLE_FAST_MODE`、`CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK`、`CLAUDE_CODE_SKIP_FAST_MODE_NETWORK_ERRORS`、`CLAUDE_CODE_DISABLE_ADVISOR_TOOL`、`CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL`。
- 设置：`model`、`availableModels`、`enforceAvailableModels`、`deniedModels`、`modelOverrides`、`modelSettings.<模型>.{effortLevel,maxEffortLevel}`、`modelPicker`、`modelPricing`（托管）、`fastMode`、`fastModePerSessionOptIn`、`alwaysThinkingEnabled`、`showThinkingSummaries`、`advisorModel`、`ultracode`。
- GrowthBook：`tengu_witty_wand`（默认 effort）、`tengu_slate_finch`、`tengu_turtle_carbon`、`tengu_penguins_off`、`tengu_sage_compass2`、`tengu_calm_seal`、`tengu_gypsum_kite`、`tengu_prompt_cache_1h_config`、`alder_ford`（促销定价）、`tengu_mossy_gray`、`tengu_crimson_vector`（图片限制）；客户端数据 `kelp_forest_sonnet`、`accessFallbackModels`。

### 5. 与 2.1.88 的差异（代码证据）

- **模型表从硬编码改为 catalog**：88 的 `configs.ts` 手写 11 个 `CLAUDE_*_CONFIG`（到 opus-4-6/sonnet-4-6）；316 由内置 JSON catalog 生成，新增 opus-4-7/4-8/5/5-5、sonnet-5/5-5、haiku-5-5、fable-5/5-1、mythos-5/5-1（`chunk-v9tcvh08.js` 的 `N` 表）。
- **默认模型**：88 默认 Opus 回落链到 `claude-opus-4-6`；316 默认 Opus 为 `claude-opus-5-5`（`OPUS_FALLBACK_ORDER` 从 opus55 起），Sonnet 默认 `claude-sonnet-5-5`，Haiku `claude-haiku-5-5`。
- **新别名**：`fable`、`best`、`fable[1m]`（88 别名为 sonnet/opus/haiku/best/sonnet[1m]/opus[1m]/opusplan 一类）。
- **提供商**：88 只有 firstParty/bedrock/vertex/foundry；316 加 anthropicAws、anthropicGoogleCloud、mantle、gateway。
- **effort**：88 级别 low/medium/high/max；316 新增 `xhigh`，并有组织上限、按模型保存、GrowthBook 默认。
- **价格**：316 新增 $2/$10、$4/$20、$10/$50 等档，haiku-5-5 长提示词价、`inference_geo` ×1.1、组织托管价格、促销定价。
- **advisor**：88 已有 advisor（开关来自 GrowthBook config 且仅第一方 beta）；316 改为 catalog `advisor_rank` 资格制、可用于 anthropicAws/GoogleCloud、按 host 熔断。
- **能力缓存**：88 的 `modelCapabilities` 在 eligible 时读写缓存；316 `isModelCapabilitiesCacheEnabled` 恒为 false，能力改由 catalog + 服务端目录。

### 6. 未解之处

- `Z_`、`tne`、`Fw`、`rm`、`om`、`ro`、`by`/`u8t`、`aS`、`gcr`、`_y` 等核心判定写作时在 `_unattributed` 的 `chunk-aepeg2w5`、`chunk-kswt4qha` 中，未纳入本领域命名（应归 `utils/model/model.ts`、`utils/effort.ts`、`utils/fastMode.ts`）；place-rest 后已落位并命名为 `getUserSpecifiedModelSetting`、`resolveDefaultMainLoopModelSetting`、`resolvePlanModeModel`、`envDefaultModel`、`resolveAvailableModels`、`isModelAllowed`、`getRuntimeMainLoopModel`/`resolveRuntimeMainLoopModel`、`resolveEffortValue`、`getDefaultEffortForModel`、`supportsFastMode`（分布在 `utils/model/` 多个文件与 `utils/effort.ts`、`utils/fastMode.ts`）。
- 服务端模型目录（served catalog，`activeServedCatalog()`（`chunk-aepeg2w5.js#uR`）/`Xn()`）与 `modelKnowledge` 回调的完整语义未追完（`chunk-aepeg2w5.js:462260-462820`，`utils/model/modelDisplay.ts`）。
- `chunk-e6aww6q8.js#cVe` 同句的 `FG` 槽用途未查清。
- mythos 模型（无 bedrock id）在哪些条件下对用户可见（`isMythosModelValue`/`isMythosAvailable`：`chunk-aepeg2w5.js#c8t`、`chunk-aepeg2w5.js#rno`）未完全确认。

## 14. 请求头与请求体：代码 ↔ 实测对照

实测来自 runtime 成员的假上游抓包（`docs/process/verify.md` 7.2–7.4，`-p hi`）。

| 实测 | 代码出处 |
|---|---|
| `POST /v1/messages?beta=true`，SSE | `anthropic.beta.messages.create(..., stream:true)`（`#e_n`） |
| `User-Agent: claude-cli/2.1.316 (external, sdk-cli)`、`x-app: cli`、`X-Claude-Code-Session-Id` | `getAnthropicClient`（`chunk-hwmsct5x.js#MN`）默认头，见第 7 节 |
| `X-Stainless-Retry-Count` 始终 0 | 客户端 `maxRetries:0`，重试全在 `withRetry` |
| 第一方多 `x-claude-code-prompt-id`、`x-claude-code-request-class`、`x-client-request-id` | 网关提示头开关 `gir`、`buildRequestTraceHeaders`（`#i_n`），见第 7 节 |
| `anthropic-beta` 第三方 8 个 / 第一方 11 个 | `utils/betas.ts` 基础表 + queryModel 追加，逐个对照见第 7 节 |
| `system` 第三方 3 块 / 第一方 4 块，计费头 `cc_version=2.1.316.<3hex>` | `buildSystemPromptBlocks` → `s2o`；计费头 `getAttributionHeader`（`chunk-3b05zaw0.js#Dns`），后缀算法见第 9 节 |
| `messages` 第二条 role=system（环境、延迟工具、代理类型、Skill 列表、日期） | `normalizeMessagesForAPI` 的中途 system 消息（`api_system`），见第 10 节 |
| tool_result 最后一块带 `cache_control: {type: ephemeral}` | `addCacheBreakpoints`（`#YSr`） |
| `metadata.user_id` = 由 `device_id`、`account_uuid`、`session_id` 组成的 JSON 字符串 | `getAPIMetadata`（`chunk-w5ndchqs.js#vVe`） |
| `max_tokens` 为 128000、`thinking={type: adaptive, display: omitted}`、`output_config={effort: medium}` | 模型目录（`claude-opus-5-5` 的默认值），`buildRequestParams`，见第 13 节 |
| `context_management.edits=[{type: clear_thinking_20251015, keep: all}]` | `getAPIContextManagement`（`chunk-e6aww6q8.js#$7t`），见第 12 节 |
| 第一方 `diagnostics: {previous_message_id: null}` | `buildRequestParams` 末尾（条件 `t$()` 且 agentic） |
| 400 时 6 个请求逐级去特性 | `queryModel` 中 `onError` 返回的 retry 标签 + `queryModelWithToolSearchRecovery`，逐行对照见第 8 节 |

## 15. 配置项与环境变量（汇总，详见各节）

| 类别 | 名称 | 作用 | 节 |
|---|---|---|---|
| 输出长度 | `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | 主循环 max_tokens，在模型上限内调整 | 6、13 |
| thinking | `CLAUDE_CODE_DISABLE_THINKING`；settings `alwaysThinkingEnabled`、thinking display | 关闭/配置 thinking | 6、13 |
| effort | `CLAUDE_CODE_EFFORT_LEVEL`、settings `effortLevel`；GrowthBook 组织上限 | output_config.effort | 13 |
| fast mode | `CLAUDE_CODE_DISABLE_FAST_MODE`；settings `fastMode` | `speed:"fast"` | 13 |
| 模型 | `ANTHROPIC_MODEL`、`ANTHROPIC_DEFAULT_OPUS_MODEL`/`ANTHROPIC_DEFAULT_SONNET_MODEL`/`ANTHROPIC_DEFAULT_HAIKU_MODEL`、`ANTHROPIC_SMALL_FAST_MODEL`、`CLAUDE_CODE_NO_MODEL_FALLBACK` | 模型与别名、回退 | 4、13 |
| 缓存 | `DISABLE_PROMPT_CACHING`（及 `DISABLE_PROMPT_CACHING_HAIKU`/`DISABLE_PROMPT_CACHING_SONNET`/`DISABLE_PROMPT_CACHING_OPUS`/`DISABLE_PROMPT_CACHING_FABLE`/`DISABLE_PROMPT_CACHING_MYTHOS`）、`CLAUDE_CODE_MESSAGES_PROMPT_CACHE_TTL`；`tengu_prompt_cache_1h_config`、`tengu_tidy_frost` | 提示词缓存与 TTL | 6 |
| 请求体扩展 | `CLAUDE_CODE_EXTRA_BODY`、`CLAUDE_CODE_EXTRA_METADATA`、`ANTHROPIC_CUSTOM_HEADERS` | 附加 body/metadata/头 | 6、7 |
| 端点与认证 | `ANTHROPIC_BASE_URL`、`_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL`、`ANTHROPIC_API_KEY`、`ANTHROPIC_AUTH_TOKEN`、`CLAUDE_CODE_USE_BEDROCK`/`CLAUDE_CODE_USE_VERTEX`/`CLAUDE_CODE_USE_FOUNDRY`、各提供商 `*_BASE_URL`、`ANTHROPIC_UNIX_SOCKET` | 客户端与第一方/第三方形状 | 7 |
| 超时/流 | `API_TIMEOUT_MS`、`CLAUDE_SLOW_FIRST_BYTE_MS`、`CLAUDE_ENABLE_STREAM_WATCHDOG`、`CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS` | 请求与流看门狗 | 6、8 |
| 重试 | `CLAUDE_CODE_MAX_RETRIES`、`CLAUDE_CODE_RETRY_WATCHDOG`（及 `CLAUDE_CODE_RETRY_WATCHDOG_SCOPE`/`CLAUDE_CODE_RETRY_WATCHDOG_MAX_WAIT_MS`/`CLAUDE_CODE_RETRY_WATCHDOG_MAX_USAGE_LIMIT_WAIT_MS`/`CLAUDE_CODE_RETRY_WATCHDOG_USAGE_LIMIT_RECHECK_MS`）、`CLAUDE_CODE_OVERLOADED_RETRY_BASE_DELAY_MS`/`CLAUDE_CODE_OVERLOADED_RETRY_MAX_DELAY_MS`、`CLAUDE_CODE_NONSTREAMING_TIMEOUT_RETRIES` | withRetry | 8 |
| 计费头 | `CLAUDE_CODE_ATTRIBUTION_HEADER` | 关闭 system[0] 计费头 | 9 |
| 中途 system | `CLAUDE_CODE_FORCE_MID_CONVERSATION_SYSTEM` | 强制 role=system 中途消息 | 10 |
| 压缩 | `DISABLE_AUTO_COMPACT`/`DISABLE_COMPACT` 一类、`CLAUDE_CODE_AUTO_COMPACT_WINDOW`、`CLAUDE_CODE_COLD_COMPACT`；`tengu_curried_trinket`、`tengu_jiggly_blossom` | 自动/手动压缩与摘要提示词 | 12 |
| 主循环 | `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`（默认 8）、`CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES`；`tengu_truncated_response_recovery` | Stop 钩子阻断上限、工具摘要、截断续写 | 4 |
| 测试 | `CLAUDE_CODE_SIMULATE_PROXY_USAGE` | 模拟代理（去 beta 与缓存标记） | 6 |

精确的读取位置与默认值写在各节的"配置项"小节和 `naming/docs-query.jsonl` 对应声明的说明里。

## 16. 与 2.1.88（旧版）的差异要点

以下各条都有代码证据，证据位置见各节。

- **主循环**
  - 递归调用改成 `NEXT_ROUND` 哨兵循环。
  - 新增恢复路径：截断续写、仅思考提示、畸形 tool_use 重试、续写未完成思考、快速回填熔断、预计算压缩换用。
  - 新增服务器/客户端拒答回退链（tombstone 撤回、横幅），以及用量额度模型同意对话框。
  - 轮首把消息队列折叠进本轮（第 4 节）。
- **QueryEngine**：旧版的类拆成 `ask()` 加未归属的 headless 引擎（第 5 节）。
- **请求构建**
  - 每次重试重建参数。
  - 400 自愈从少数几个场景扩展到约 40 个 `retry:` 标签。
  - 工具搜索被拒时整体重跑。
  - 流看门狗与心跳。
  - 媒体数量与字节上限（第 6、8 节）。
- **重试**
  - 持久重试改成 `CLAUDE_CODE_RETRY_WATCHDOG` 系列。
  - `FallbackTriggeredError` 的触发原因扩展到 6 种。
  - 新增流式重试决策表（第 8 节）。
- **system 提示词**
  - 改成"事实 → 会话段决策 → 渲染"的组合器，按会话记录回放。
  - 计费头多了约 10 个字段。
  - Output efficiency 等段落消失，语言、输出风格等改成附件（第 9 节）。
- **消息**
  - 中途 role=system 消息（`api_system`）。
  - 附件预渲染（`rendered/renderedRole`）。
  - 外来模型的签名 thinking 会被剥离（第 10 节）。
- **附件**：约 60 种新附件类型，6 种被删除（第 11 节）。
- **压缩**
  - 316 没有 session memory 压缩。
  - 自动压缩有 6 种结果，autoCompactWindow 有 7 种来源。
  - 摘要提示词有 8 个 A/B 变体。
  - 空闲回来时追加服务端 `clear_tool_uses_20250919`（第 12 节）。
- **模型**
  - 全部来自内置模型目录。
  - 新别名 fable/best，新提供商 anthropicAws/anthropicGoogleCloud/mantle/gateway。
  - 新增 `xhigh` effort。
  - 美国推理区加价 1.1 倍（第 13 节）。

## 17. 未解之处（汇总）

各节"未解之处"列了声明 id，这里只汇总最影响理解主流程的几项：

- headless 引擎 `chunk-tyg7f3ek.js#nI`/`#Mp`/`#BE`/`#Dy` 仍未归属，只读了入口和返回对象（第 5 节）。
- queryLoop 内的拒答回退级联（`#xc` 中 `resolveRefusalFallback`（`chunk-e6aww6q8.js#fJn`）/`Ol`/`ar` 一组）只按事件类型梳理，没逐分支核对。
- `queryModel` 的 `onError` 兜底链中的 `$gt`、`Hgt`、`SI`、`OLe` 没逐一核对含义（第 8 节；写作时的压缩名，当前阅读树中已无同名绑定，待核实）。
- 自动压缩本体 `chunk-e6aww6q8.js#yzr`，以及反应式压缩 `triggerReactiveCompact`、`tryReactiveCompact`（`#dJn`、`#Tjo`）等写作时仍在 `_unattributed`，手册按其行为描述（第 12 节）；现已放入 `services/compact/autoCompact.ts`、`services/compact/reactiveCompact.ts`。
- 消息规整流水线的若干步骤（`#k6n`、`#Kbe`、`#D6n`、`#zvt` 等）与消息队列核心 `createMessageQueueManager`（`#jzo`）写作时仍在 `_unattributed`（第 10 节），现已放入 `utils/messages.ts`、`utils/messageQueueManager.ts`。
- `cch` 在 JS 层是 `00000`，官方二进制在发送前由原生代码替换，JS 里看不到（第 9 节）。

## 18. 引用校验结果

校验时间 2026-11-03 04:39（UTC），对象为当时的 `reconstructed/`。脚本检查本文所有代码样式引用：路径是否存在（相对仓库根，或相对 `reconstructed/src/`，`.ts/.tsx` 对应 `.js`）；声明 id 是否在 `reconstructed/symbols.jsonl`；"路径 · 函数名"中的函数是否属于该文件；标识符与字面量是否出现在 `reconstructed/symbols.jsonl` 或阅读树代码中。在 2.1.316 找不到、但在 2.1.88 源码（`references/claude-code-analysis/src`）中存在的，计为"只在 2.1.88 中存在"（删除项、旧名，属预期）。

- 共检查 2969 处引用：路径 268/276（另 8 个只在 2.1.88 中存在），名字 1754/1760（另 6 个只在 2.1.88 中存在），字面量 365/367（另 2 个只在 2.1.88 中存在），声明id 566/566；占位符与含空格的说明性文字 421 处未检查。
- 只在 2.1.88 中存在（删除项或旧名，预期如此）：`costHook.ts`、`query/tokenBudget.ts`、`CLAUDE_CODE_UNATTENDED_RETRY`、`tengu_attribution_header`、`utils/streamlinedTransform.ts`、`streamlinedTransform`、`tengu_toolref_defer_j8m`、`services/compact/sessionMemoryCompact.ts`、`tengu_cached_microcompact`、`tengu_sm_compact*`、`utils/model/antModels.ts`
- 未通过：0 处。
