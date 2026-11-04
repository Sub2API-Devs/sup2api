# doc-sync2：文档引用同步（reconstructed/ 按最终命名重建之后）

角色：doc-sync2。对象：`docs/ARCHITECTURE.md`、`docs/CHANGES-SINCE-2.1.88.md`、`docs/INDEX.md`、`docs/handbook/*.md`（十本）。目标：让文档里的代码引用与重新生成的阅读树 `reconstructed/` 一致，只改引用本身，不改结论与结构。

时间：2026-11-04（本地）。基线：`artifacts/tmp/lead/docrefs1.txt`（75 处 FAIL），逐条对照 `artifacts/tmp/lead/docfix.txt` 的原文与 `naming/final/top.json` 的候选名，再打开 `reconstructed/` 相应文件确认。

## 1. 结果

校验命令：`node --max-old-space-size=8000 tools/verify/doc-refs.mjs . docs/ARCHITECTURE.md docs/CHANGES-SINCE-2.1.88.md docs/INDEX.md docs/handbook/*.md`

| 文档 | 修正前 FAIL | 修正后 FAIL |
|---|---|---|
| ARCHITECTURE.md | 1 | 0 |
| CHANGES-SINCE-2.1.88.md | 0 | 0 |
| INDEX.md | 0 | 0 |
| handbook/agents.md | 5 | 0 |
| handbook/bootstrap.md | 1 | 0 |
| handbook/commands.md | 4 | 0 |
| handbook/extensions.md | 5 | 0 |
| handbook/ink.md | 0 | 0 |
| handbook/permissions.md | 3 | 0 |
| handbook/query.md | 18 | 0 |
| handbook/state.md | 0 | 0 |
| handbook/tools.md | 34 | 0 |
| handbook/ui.md | 4 | 0 |
| 合计 | 75 | **0** |

误报 1 处（`server/discover`，见第 3 节）。剩下 `OLD` 项（只在 2.1.88 存在的删除项与旧名）按约定保留。各文档末尾"引用校验结果"一节已用 `APPEND=1` 刷新（校验时间 2026-11-04 05:09 UTC）。

## 2. 逐处修法（旧 → 新）

### ARCHITECTURE.md（1）

- `reconstructed/src/entrypoints/_new/init.helpers-xdkv.js` → 改成过去时的描述，并指出这段代码（`installTelemetryMeter`）现在就在 `reconstructed/src/entrypoints/init.js`；同时把 `_new/` 现状写准：写作时 146 个文件、23 个 helpers，现在只剩 `reconstructed/src/cli/print/_new/elicitationRegistrar.helpers-tyg7.js` 一个 helpers 文件，另有若干 `_new/*.lazy.js` 是动态加载单元（`tools/emit/readable.mjs` 生成），不属于 `sole-consumer-new`。

### agents.md（5）

- `{kind:"avoid_prompts"}` → `kind: "avoid_prompts"`（`utils/forkedAgent.js` 的权限层字面量）
- `{kind:"model"}` → `kind: "model"`（同上，`runForkedAgentImpl` 指定 model 时的权限层）
- `Uee` → `claimTaskNotification`（`chunk-gppkhxdv.js#Uee`，`utils/task/framework.js`）
- `Kvt` → `agentIdMatches`（`stopTask` 的属主判断实际调 `services/remoteTools/backgroundCommands.js` 的 `agentIdMatches`）
- `/v1/code/sessions/${toInfraSessionId(r)}/archive` → `/v1/code/sessions/${toInfraSessionId(sessionId)}/archive`，并补上代码里的分支条件：`useCcrV2SessionCrud` 为假走 `/v1/sessions/{id}/archive`，为真走 code/sessions 那条（`bridge/bridgeApi.js` 的 `archiveSession`）。

### bootstrap.md（1）

- `t$o` → `cleanupNpmInstallations`（`utils/nativeInstaller/installer.js`）；同句的 `e$o` → `cleanupShellAliases`（同文件，删 shell 配置里的 claude alias）。

### commands.md（4）

- `{type:"text", …}`、`{type:"compact", …}`、`{type:"query", prompt}`、`{type:"skip"}` → `type: "text"`（带 value、level?）、`type: "compact"`（…）、`type: "query"`（带 prompt）、`type: "skip"`（阅读树里是 `type: "skip"` 这种写法）
- `xZt` → `hideSkillsBehindPlugins`（`src/commands.js`）
- `Jae` → `isUsing3PServices`（`utils/auth.js`，`!isFirstPartyProvider()`）
- `wtt` → `findBridgeFallback`（`src/commands.js`）

### extensions.md（5）

- 流程图代码块里的 `server/discover` → `discover 请求`；方法名本体移到图后的注里（`server/discover` 是 JSON-RPC 方法名，见第 3 节）
- `chunk-dg4taswx.js` 常量 `eae=5`、`cCt` → `ANSWER_STREAM_GRACE_MS` = 5（`chunk-dg4taswx.js#yfi` 语句内，落位 `services/mcp/mcpCallConstants.js`；在 `useManageMCPConnections` 里就是 `maxReconnectAttempts`）与 `retryDelayMs`（`chunk-dg4taswx.js#cCt`）
- `X2()` → `getHooksConfigFromSnapshot()`（`chunk-2jdf5m4m.js#X2`）= `getHooksFromAllowedSources` 的缓存
- `KE.noteHookFailure` → `attentionRegistryStore.noteHookFailure`（`utils/hooks.js` 调用处）
- `KTn()` → `peekSessionCommands()`（`skills/loadSkillsDir.js`，插件注册的会话命令）

### permissions.md（3）

- `Qie` → `NARROWING_RULE_SOURCES` = `["toolsNarrowing", "command"]`（`chunk-sfy7bm1n.js#_te` 语句内）
- `Kkn` → `chunk-e6aww6q8.js#Kkn`（名字 `findApplicableAllowRule` 保留，补真实声明 id）
- `iwt` → `onSafeAllowlist`，主要由 `isBrowserToolAutoAllowed`（`chunk-e6aww6q8.js#kWt`）判定；原 `iwt` 在阅读树里已不存在（`chunk-e6aww6q8.js#iwt` 现在是 `isAskOnMutationTool`，属另一分支），这一条在过程文档里记一笔：原文把"安全工具白名单"记成 `iwt`，实际是 auto 分支的 `onSafeAllowlist`。

### query.md（18）

| 行 | 旧 | 新 |
|---|---|---|
| 128 | `{type:"stream_request_start"}` | `type: "stream_request_start"` |
| 180 | `transition:{reason:"next_turn"}` | `transition` 的 `reason: "next_turn"` |
| 262 | `{type:"disabled"}` | `type: "disabled"` |
| 451 | `eh()` / `Lo()` | `isWigglyDoveHeaderEnabled()` / `wigglyDoveHeaderName()` |
| 515 | 表 2/5 行的 `i1` | `probeThinkingTokenCount` |
| 515 | 表 3/6 行的 `_Le` | `probeThinkingDisplay` |
| 515 | 表 4 行的 `Tae` | `maybeRefuseToolSearchFinal` → `refuseToolSearch`（`ToolSearchRefusedError`，`#Yte`） |
| 631 | `WI.composeSections` | 插件槽 `promptComposeSlot.composeSections`（`chunk-e6aww6q8.js#RZn`，落位 `plugins/functionHooks/promptComposition.js`） |
| 677 | 开关 `nb()`、OAuth `Oi()` | `canSendFirstPartyBetas()`、`isFirstPartyAnthropicBaseUrl()`（`shouldUseGlobalCacheScope` 的实际实现） |
| 772 | `vvt` 再按工具可见性重排 | `foldNotificationsIntoPoll` 把排队通知折进轮询事件（只在有 Poll 工具且轮询事件折叠开启时）；按代码改正了说法 |
| 779 | `D6n/Kbe` | `attachmentMessagesWithAnswer`（`chunk-e6aww6q8.js#D6n`）与 `attachmentToMessages`（`#Kbe`） |
| 785 | `Exs` / `Uri` / `tvt` | `sanitizeErrorToolResultContent`（`#Exs`）/ `countToolCallsSince`（`chunk-a76knw89.js#Uri`）/ `dropRedundantEmptyPolls`（`#tvt`）；`Uri` 那个实际是 `services/tools/batchTools.js` 的「把拆开的 batch 结果重新组合」，原写"校验工具引用"与行为不符，已按代码改 |
| 916 | `VCn()` | `shouldPrefetchArtifactOpening()` |
| 934 | `Ko()` | `isAgentSwarmsEnabled()` |
| 992 | `qhr`（常量在 `#Bge`） | `MAX_RESULT_BYTES` = 200000，在 `RESULT_LIMITS` 语句内（`chunk-yxnffbzs.js#Bge`） |
| 1129 | `kf()` | `isAutoCompactEnabled`（`chunk-9m4wzd68.js#kf`，`services/compact/compactSettings.js`） |
| 1145 | `{reason:"rapid_refill_breaker"}` | `reason: "rapid_refill_breaker"` |
| 1324 | `NK()` | `getDefaultMainLoopModelSetting_2()` |
| 1446 | `by`/`u8t` | `by`（即 `resolveRuntimeMainLoopModel`，`chunk-aepeg2w5.js#u8t`） |
| 1468 | 条件 `t$()` 且 agentic | 条件 `cacheDiagnosisOn()`、agentic 或 fork 点、有 betas、且非 `CLAUDE_CODE_SIMULATE_PROXY_USAGE`（按 `buildRequestParams` 代码写全） |

### tools.md（34）

- `Jr()`（自托管 runner 工具）→ `areWizardOperatorToolsEnabled()`
- `P6s()` / `ftt()` → `hasPendingMcpClients()` / `isDeclared()`（`tools/WaitForMcpServersTool`）
- 表格里的 `R5()` / `G2()` / `y2e()` / `cGn()` → `isFeedbackDraftsEnabled()` / `isPollEventIngressActive()` / `isPeerSendFileEnabled()` / `isPluginPublishAllowed()`
- `sGt/Mn/dIr/NGn` → 拆成四个独立名字：`isTeamOnboardingShareEnabled` / `isRemoteSession` / `isChromeSetupOfferEnabled` / `isQueuedNotificationsSupported`
- `Sdt` → `MAX_CONTEXT_TOKENS`（`chunk-yxnffbzs.js#FD` 语句内）
- `J_e` → `getCommandNetworkLists`（`chunk-e6aww6q8.js#J_e`）
- `oie()` → `backgroundCompletionNoticeEnabled()`
- `kWr=25` → `MAX_BLOCKED_SLEEP_LINES` = 25
- `Ajt(input, useSandbox)` / `PYt(command, cwd)` / 主机 `LVn` → `checkAllowedDomainsInput(input, useSandbox)` / `extractLiteralRmTargets(command, cwd)` / `guardSyncedMemoryRemoval`
- `Mze`（两处）→ `runWithDivergentShapes`（`chunk-e6aww6q8.js#Mze`）
- `aDo=5` → `MAX_COLLECTED_RULES` = 5
- `L0e` → `isInputHoldOn()`（`plugins/functionHooks/inputHold.js`）
- `Xoe()` → `getShadowedSearchToolNames()`（配 `isBashAvailable()` 为假返回空集）
- `H8=20` → `MAX_PDF_PAGES_PER_READ` = 20
- `$Yt` → `isNotClaude3Model`
- `y3o`（"图片原始字节读取上限 `MAX_IMAGE_READ_BYTES` 的值未追到定义"）→ 去掉压缩名，只留 `MAX_IMAGE_READ_BYTES` 及其未追到的说明
- `OT()`（三处）→ `getMaxSubagentSpawnDepth()`（`chunk-k8xs47j2.js#OT`）
- `Akt` / `csi` / `usi` / `xfn` / `msi` → `EXTERNAL_ALWAYS_AVAILABLE_TOOLS`（`chunk-hg2zbde4.js#Akt` 语句内）/ `EXTERNAL_ALWAYS_AVAILABLE_SET`（同一 var 语句）/ `ONBOARDING_TOOL_NAMES`（`#usi` 语句内）/ `canSubagentSend()` / `COORDINATOR_TASK_TOOL_NAMES`（`#Ckt` 语句内）；同时把"云会话去掉 `usi` 集"改成代码里的实际分支（无盘会话去掉 `ONBOARDING_TOOL_NAMES`）
- `Gr()` → `isSafeMode()`
- `V(e,n)` → `lock(path, LOCK_OPTIONS_2)`（`LOCK_OPTIONS_2` = retries 30，5–100ms）
- `ohi=["sonnet","opus","haiku","fable"]` → `AGENT_MODEL_CHOICES` = `["sonnet", "opus", "haiku", "fable"]`（`chunk-ymw5z3js.js`，落位 `tools/AgentTool/constants.js`）
- `Nw()` → `isSillyShoreGateOn()`
- `_1r` → `isPlanModeToolUnavailable`
- `Zoe(session)` → `isSkillsSyncActive()`
- `B2()` → `areSkillsConvertedAsPlugins()`
- `_Qo` → `isStandardSearchMode()`
- `M$()` → `hasOutermostCallFrame()`
- `zb()` / `ebe()` / `zue(cT())` → `canPromptUserForPermission()`（其实现用 `getAllowedChannels()` 与 `hasPermissionPromptTool(getPermissionPromptToolName())`）
- `Sn()`（"恒 null"）→ 改写成"这些工具在外部构建中为 null"，不引用已失效的名字

### ui.md（4）

- `Mie`（引擎）→ `runWithQueryParams(...)`（`screens/repl/ReplSessionScope.js`，`REPL.js` 里 `engine ?? runWithQueryParams({...})`）
- `AIe`（bridge 回复）→ `ReplBridgeConnector`
- `Se(lVt)` → `useContext(rootSessionSlot) !== null`（`lVt` 已改名 `rootSessionSlot`，`Se` 是实现 `isInsidePanelHost` 的上下文读取）
- `VI()` → `useHasBlockingDialog()`；同句的 `Ie(chrome, BV)`、`hasTeamModal`、`isModalOpen` 一并换成实际调用 `useStoreSelector(chrome, isExiting)`、`useHasModalDialog()`、`useHasModalUserDialog()`

## 3. 误报

1. **`server/discover`（extensions.md 第 44 行）**：JSON-RPC 方法名，位于流程图代码块里。校验脚本对代码块里带斜杠的词一律按路径检查，因此必然报 FAIL。上一轮的做法是保留并加注，但仍计一处失效；本轮把图里的文字改成 `discover 请求`，方法名本体放在图后的注里（写成"JSON-RPC 方法名是 server/discover"）。这样既保留信息又不再被误判。

其余 74 处都是真实的引用失效（旧压缩名、改名后的旧名、`key=value` 形式的字面量、字面量的花括号缩写、已删除的 `_new/` 路径）。

## 4. 改引用时发现的说法与代码不符（已按代码改正）

- query.md：`vvt` 被描述为"按工具可见性重排"，实际 `foldNotificationsIntoPoll` 是把排队通知折进轮询事件；`Uri`（`batchTools.countToolCallsSince`）被描述为"校验工具引用"，实际是把拆开的 batch 调用结果重新组合成单个 tool_result；`t$()` 被当作 `diagnostics.previous_message_id` 的条件，实际条件是 `cacheDiagnosisOn()` 且（agentic 或 fork 点）且有 betas 且非模拟代理用量。
- permissions.md：auto 模式的"安全工具白名单"记名 `iwt`，实际是 `onSafeAllowlist`（主要判据 `isBrowserToolAutoAllowed`）；`iwt` 现在指 `isAskOnMutationTool`。
- tools.md：`filterToolsForAgent` 原文写"云会话去掉 `usi` 集"，代码里是"无盘会话去掉 `ONBOARDING_TOOL_NAMES`"；`Xoe()` 的判定实际由 `isBashAvailable()` 决定（`getShadowedSearchToolNames` 在 Bash 不可用时返回空集）。
- ARCHITECTURE.md：`_new/` 子目录现状（146 文件 / 23 helpers）已过期，改为现在只剩 1 个 helpers 文件，并说明 `_new/*.lazy.js` 是动态加载单元。

## 5. 遗留

1. 校验脚本的两个盲区仍在（与 `docs/process/doc-sync.md` 第 5 节相同）：名字/字面量用"在语料里出现即通过"的子串规则，可能放过已改名但碰巧是别的标识符子串的压缩名；含空格的引用（"`路径 · 名字`"写在一个反引号里）不做检查。本轮只针对 lead 给出的 75 处 FAIL，没有再做全量 `stale`/`paths` 补查。
2. 多处 FAIL 按"名字 + 声明 id"改写后，检查数略增（例如 query.md 2973 → 2980），属正常。
3. `p3()`、`TD`、`bte`、`ste` 等仍保留的压缩名是文档有意保留的写作时记名或已有对应 id 的引用，不在本轮 FAIL 清单里，没有动。
