# tools 子系统手册（Claude Code 2.1.316）

> 领域成员 dom-tools，2026-11-03。所有结论以 `original/`（官方 2.1.316 linux-x64 ELF 提取物）为准；2.1.88（`references/claude-code-analysis`）只用于取名和对照。
> 写法：`模块路径 · 函数名`（模块路径是重组路径，见 `reconstructed/src/<路径>.js`），后面括号给声明 id `chunk-xxx.js#压缩名`。名字以当前命名表为准（门面名 > semantic > reference > auto）。
> 本手册的第 1–5、7–9 节由 core 部分写成；第 6 节"内建工具逐个说明"由 shell / file / agent / misc 四个分组的草稿合并而来（各自保留原小节编号，前面加 6.x 前缀）。

## 1. 概述

tools 子系统负责"模型可以调用的一切动作"：

- **工具定义**：每个工具是一个对象（`buildTool` 工厂产出），描述名字、输入/输出 schema、提示词、只读/并发/延迟等属性，以及 `create(ctx)` 返回的 `validateInput / checkPermissions / call`。
- **注册与工具池组装**：`tools.ts · getAllBaseTools` 列出当前环境可能出现的全部内建工具；`getTools` 按权限上下文、模式、`isEnabled` 过滤；`assembleToolPool` 再并入 MCP 工具。工具搜索（ToolSearch）决定哪些工具"延迟加载"——只在系统消息里宣告名字，模型用 ToolSearch 取 schema 后才进入请求的 `tools`。
- **执行编排**：一条回答里的多个 `tool_use` 按并发安全性分批（流式执行器边收边跑），每次调用走 输入校验 → validateInput → PreToolUse hooks → 权限决策 → call → 结果映射/持久化 → PostToolUse hooks 的完整生命周期。
- **各工具实现**与支撑模块（文件读写、diff、glob/ripgrep、notebook、图片/PDF、WebFetch、任务存储……）。

上下游：

```
query.ts（查询循环）
  ├─ services/api/claude.ts · queryModel ── 请求构建：工具 schema、延迟判定（isDeferredToolInConversation）、ToolSearch 模式、DeferredToolPlaceholder
  └─ 工具执行：StreamingToolExecutor（流式）/ runTools（非流式）
        └─ runToolUse → streamedCheckPermissionsAndCallTool → checkPermissionsAndCallTool
              ├─ services/tools/toolHooks.ts（PreToolUse / PostToolUse / PostToolUseFailure）
              ├─ utils/permissions/*（规则、模式、分类器、canUseTool 询问）—— permissions 领域
              ├─ tool.call（各工具实现）
              └─ utils/toolResultStorage.ts（大结果持久化）
REPL / print / SDK / 子代理 ── assembleToolPool / mergeAndFilterTools 组装工具池
utils/attachments.ts ── getDeferredToolsDelta 生成"延迟工具宣告"附件
```

## 2. 模块地图

领域共 194 个重组模块（每个模块的一句话说明在 `naming/modules-tools.json`）。按职责分组：

| 分组 | 主要模块 | 职责 |
|---|---|---|
| 接口与注册 | `Tool.ts`、`tools.ts`、`utils/toolPool.ts` | 工具默认属性、按名查找、工具注册表、工具池合并。**注意**：真正的工具工厂 `buildTool`（`chunk-g54kbxqw.js#on`）、`getTools`（`chunk-kxyd0g16.js#Z$`）、懒加载工具表（`chunk-kxyd0g16.js#Zi`/`chunk-kxyd0g16.js#fa`）写作时切在 `_unattributed/`（`chunk-g54kbxqw` part-024 与 `chunk-kxyd0g16` part-016..018），place-rest 后分别在 `services/tools/permissionCheckGuard.ts`（`buildTool`）与 `tools.ts` |
| 执行编排 | `services/tools/toolOrchestration.ts`、`services/tools/StreamingToolExecutor.ts`、`services/tools/toolExecution.ts`、`services/tools/toolHooks.ts` | 分批并发、流式执行、单次调用生命周期、工具 hooks。`runToolUse`（`chunk-e6aww6q8.js#$B`）写作时在 `_unattributed/` part-344，现在 `services/tools/toolExecution.ts` |
| 工具搜索 | `utils/toolSearch.ts`、`tools/ToolSearchTool/*` | 延迟加载模式与阈值、延迟判定、宣告附件、ToolSearch 工具 |
| shell | `tools/BashTool/*`（15 个）、`tools/PowerShellTool/*`（13 个）、`tools/shared/gitOperationTracking.ts` | Bash/PowerShell 工具、命令权限（AST 解析、只读判定、路径/sed/模式校验、沙箱）、git 操作统计 |
| 文件 | `tools/FileReadTool/*`、`tools/FileEditTool/*`、`tools/FileWriteTool/*`、`tools/GlobTool/*`、`tools/GrepTool/*`、`tools/NotebookEditTool/*`、`tools/LSPTool/*`，`utils/file.ts`、`utils/fileRead.ts`、`utils/readFileInRange.ts`、`utils/fileStateCache.ts`、`utils/fileReadCache.ts`、`utils/fileHistory.ts`、`utils/diff.ts`、`utils/glob.ts`、`utils/ripgrep.ts`、`utils/notebook.ts`、`utils/imageResizer.ts`、`utils/pdf.ts`、`utils/pdfUtils.ts`、`utils/truncate.ts`、utils/treeify.ts（阅读树无此文件）、`utils/codeIndexing.ts`、`utils/fileOperationAnalytics.ts`、`utils/filePersistence/*` | 文件读写编辑、搜索、notebook、LSP、读状态缓存、检查点 |
| 代理与任务 | `tools/AgentTool/*`（含 6 个内建代理定义）、`tools/SendMessageTool/*`、`tools/TaskCreateTool/*`、`tools/TaskGetTool/*`、`tools/TaskListTool/*`、`tools/TaskUpdateTool/*`、`tools/TaskStopTool/*`、`tools/TaskOutputTool/*`、`tools/TeamCreateTool/*`、`tools/TodoWriteTool/*`、`tools/shared/spawnMultiAgent.ts`、`utils/tasks.ts`、`utils/todo/types.ts` | 子代理启动、消息投递、任务列表存储 |
| 其他工具 | `tools/AskUserQuestionTool/*`、`tools/BriefTool/*`、`tools/ConfigTool/*`、`tools/EnterPlanModeTool/*`、`tools/ExitPlanModeTool/*`、`tools/EnterWorktreeTool/*`、`tools/ExitWorktreeTool/*`、`tools/ListMcpResourcesTool/*`、`tools/ReadMcpResourceTool/*`、`tools/MCPTool/*`、`tools/McpAuthTool/*`、`tools/RemoteTriggerTool/*`、`tools/ScheduleCronTool/*`、`tools/SkillTool/*`、`tools/WebFetchTool/*`、`tools/WebSearchTool/*` | 交互、计划模式、worktree、MCP 包装、Skill、Web、定时与远程触发 |
| 杂项 | `tools/utils.ts`、`tools/testing/TestingPermissionTool.tsx`、`tools/SyntheticOutputTool/*`、`tools/REPLTool/constants.ts` | 工具结果消息辅助、测试工具、StructuredOutput、REPL 常量 |

316 新增、但目前不在本领域模块里的内建工具（定义在各自 chunk，写作时多数切在 `_unattributed`，place-rest 后已落位）：`ReportFindings`、`ScheduleWakeup`、`Workflow`、`ListAgents`、`Monitor`、`SendFeedback`、`WaitForMcpServers`、`ReadMcpResourceDir`、`RefreshMcpTools`、`GetTask`、`Poll`、`FetchInboxMessage`、`SendFile`、`SendUserFile`、`PushNotification`、`ProposeSkills`、`ProposeGoal`、`PublishPlugin`、`EndConversation`、`DesignSync`、`ClaudeDesign`、`Projects`、`SendToProject(Context)`、`Artifact` 系列、`AppifactRepl`、`SearchMcpRegistry`、`SuggestConnectors`、`ListConnectors`、`ShareOnboardingGuide`、`ShowOnboardingRolePicker`、`OfferChromeSetup`、`ReadNotifications`。名字与启用条件见第 4.2 节表格。

## 3. Tool 接口：字段与生命周期

### 3.1 构造：`buildTool`（`chunk-g54kbxqw.js#on`）

2.1.88 的工具是"一个对象 + 方法"；316 改成"定义对象 + `create(ctx)` 工厂"：

```js
var GlobTool = buildTool({            // tools/GlobTool/GlobTool.ts（chunk-e6aww6q8.js#QL）
  name: "Glob", searchHint: "find files by name pattern or wildcard",
  backgrounding: "never", maxResultSizeChars: 1e5,
  get inputSchema() { … }, get outputSchema() { … },
  isConcurrencySafe() { return true }, isReadOnly() { return true },
  ruleContentField: "path", getPath(input) { … }, preparePermissionMatcher(input) { … },
  async prompt({ model, leanPrompt }) { … }, renderToolUseMessage, mapToolResultToToolResultBlockParam(data, id) { … },
  create(ctx) {                       // ctx：会话、权限、toolState……
    return { async validateInput(input) {…}, async checkPermissions(input, call) {…}, async call(input, call) {…} };
  },
});
```

`buildTool(def)` 的结果 = `{...TOOL_DEFAULTS, userFacingName: () => def.name}` ← `def` 的全部属性描述符 ← 包装方法：

| 包装方法 | 行为 |
|---|---|
| `create(ctx)` | 直接调用 `def.create`（先记录工具名与会话） |
| `call(input, toolUseContext, canUseTool, assistantMessage, onProgress, opts)` | 若该工具在本会话里"在别处运行"（`nae(session, name)`，如原生工具转发到宿主），且权限检查时与调用时的运行位置不一致，拒绝（`NativeToolElsewhereError` "where it runs changed after its permission was checked"）；在别处运行时走 `Jo` 转发；否则构造 call 上下文（`signal`、`abort`、`abortTurn`、`onProgress`、`ask`（工具内二次询问）、`runEngine`（Skill 等嵌套查询）、`permissionPhase/permissionRound`、`fileReadingLimits`、`globLimits`、`sameTurnToolUses`、`remoteCall`、`timing` 等 getter）后调用 `create(ctx).call(input, callCtx)` |
| `validateInput(input, ctx)` | 别处运行时只做 `refusedUnasked` 检查；否则调用工具的 `validateInput`，缺省 `{result: true}` |
| `checkPermissions(input, ctx)` | 别处运行时返回 passthrough（"X requires permission."）或宿主的检查；否则调用工具的 `checkPermissions`，缺省 `{behavior: "allow", updatedInput: input}` |
| `permissionCheckFailureDecision` | 权限检查本身失败时的兜底决策；只有 `create` 返回值里有这个方法的工具才调用（`Yl` 用全 undefined 代理探测） |

`Tool.ts · TOOL_DEFAULTS`（`chunk-g54kbxqw.js#ql`）：`isEnabled → true`、`isConcurrencySafe → false`、`isReadOnly → false`、`isDestructive → false`、`remoteExecution → {supported:false}`、`toAutoClassifierInput → ""`、`userFacingName → ""`（被 buildTool 改成工具名）。

### 3.2 字段

用 `artifacts/tmp/tools/core/toolfields.mjs` 统计 316 全部 92 个工具定义对象的顶层键（数字是出现次数，标"新"的是 2.1.88 `Tool.ts` 里没有的名字）：

| 类别 | 字段 |
|---|---|
| 身份与描述 | `name`(92)、`aliases`(8)、`searchHint`(82)、`description()`(92)、`prompt({model, leanPrompt, leanRewrite, tools, agents, getToolPermissionContext…})`(92)、`whenToUse`(1，新，延迟宣告行 "name: whenToUse")、`userFacingName`(61)、`getToolUseSummary`(17)、`getActivityDescription`(14) |
| schema | `inputSchema`(92，zod，多为 getter 懒构造)、`outputSchema`(85)、`inputJSONSchema`(2，MCP/StructuredOutput 直接给 JSON schema)、`strict`(8)、`coerceInput`(13，新：调用前修复常见输入错误，如参数别名)、`validationErrorSteer`(3，新)、`streamedInputRepairExemptKeys`(1，新) |
| 属性判定 | `isEnabled`(63)、`isConcurrencySafe(input)`(73)、`isReadOnly(input)`(76)、`notReadOnlyReason`(1，新)、`isDestructive`(5)、`isOpenWorld`(2)、`requiresUserInteraction`(6)、`isSearchOrReadCommand`(5)、`isMcp`(6)、`isLsp`(1)、`mcpInfo`(3) |
| 加载与延迟 | `shouldDefer`(55)、`alwaysLoad`(2)、`backgrounding`(89，新："never" / "self" / "detach"…)、`remoteExecution`(8，新：`{supported, decidingInputFields, refusedInputFields}`) |
| 权限 | `ruleContentField`(12，新：权限规则 `Tool(内容)` 匹配哪个输入字段)、`getPath`(12)、`preparePermissionMatcher`(8)、`toAutoClassifierInput`(65，自动模式分类器看到的输入摘要)、`suppressesAllPermissionUpdates`(7，新)、`suppressesAlwaysAllowRule`(7，新)、`ignoresWholeToolAllowRule`(4，新)、`enablesCodeExecution`(8，新)、`sandboxNetworkLists`(2，新)、`classifierOnly`(2，新)、`permissionCard/admitCardAnswer/shownCardInput`(新，交互卡片) |
| 结果 | `mapToolResultToToolResultBlockParam(data, toolUseId)`(92)、`maxResultSizeChars`(92)、`persistenceThresholdCeiling`(8，新)、`skipAggregateToolResultBudget`(7，新)、`extractSearchText`(14，转录搜索用)、`stripForStorage`(7，新)、`stripForCreation`(4，新)、`stripToolUseResultAtCreation`(2，新)、`preserveToolUseResultInSubagents`(5，新)、`outputSchemaAcrossProcesses`/`fromAnotherProcess`(4/6，新：跨进程/远程结果的安全子集) |
| 输入回填 | `backfillObservableInput`(5，hooks/权限看到的输入，如把相对路径展开)、`inputsEquivalent`(2)、`restoreTransientForRemap`(3，新)、`toFamilyParentInput/familyParentToolName`(1，新，V2 工具族) |
| 渲染 | `renderToolUseMessage`(84)，其余 `renderToolResultMessage`、`renderToolUseRejectedMessage`、`renderToolUseErrorMessage`、`renderToolUseProgressMessage`、`renderToolUseTag` 等多由各工具的 `UI.tsx` 提供 |
| 工厂 | `create(ctx)`(88)：返回 `{validateInput?, checkPermissions?, call, permissionCheckFailureDecision?}`；只有 4 个旧式工具直接在对象上定义 `call/checkPermissions` |

`call` 的返回值：`{data, newMessages?, contextLayers?（对后续调用上下文的修改，取代旧版 contextModifier）, endsTurn?, detached?（结果改为异步送达）, classifierContext?, mcpMeta?, remedy?, sandboxViolations?, sandboxed?, structured_output?}`。

### 3.3 生命周期（一次调用）

```
模型 tool_use ──► 查工具（toolMatchesName：name 或 aliases；toolAliases 映射先换名）
  ├─ 输入 JSON 解析 / inputSchema.safeParse（必要时 coerceInput 修复）→ 失败：InputValidationError
  ├─ validateInput(input)           → {result:false, message, errorCode, denyRule?, notAnError?, remedy?}
  ├─ PreToolUse hooks              → 可改输入（改后再过一次 validateInput）、给权限结论、阻止继续
  ├─ 权限：hook 结论 ∪ checkPermissions + 规则/模式/分类器 → allow / deny / ask（canUseTool 询问用户或 SDK 回调）
  ├─ call(input, callCtx)          → onProgress 进度；abort 信号
  ├─ mapToolResultToToolResultBlockParam → maxResultSizeChars 超限时持久化到磁盘（<persisted-output>）
  ├─ PostToolUse / PostToolUseFailure hooks
  └─ 结果消息（tool_result）+ contextLayers 应用到后续调用
```

详细步骤见第 5.3 节。

## 4. 工具注册与工具池组装

### 4.1 `getAllBaseTools`（`tools.ts`，`chunk-kxyd0g16.js#Yb`）

返回"当前环境下可能出现的全部内建工具"，按以下顺序（条件在括号里；无条件的固定出现，是否可用再看 `isEnabled`）：

`Agent` → `Bash`（`jd()`：非 Windows，或 Windows 找到 Git Bash）→ `Glob`、`Grep`（不在 `getShadowedSearchToolNames()` 里，见 4.4）→ `ExitPlanMode` → `Read` → `Edit` → `Write` → V2 别名工具（`ga?.()`，外部构建为 null）→ `NotebookEdit` → `xo` 展开 → `WebFetch` → `TodoWrite` → `ReportFindings` → `WebSearch` → `TaskStop` → `AskUserQuestion` → `SendFeedback` → `Skill` → `SendToProject`/`SendToProjectContext` → `EnterPlanMode` → `DesignSync` → `ClaudeDesign`（非 essential-traffic-only）→ `Projects` → `TaskCreate/TaskGet/TaskUpdate/TaskList`（`isTodoV2Enabled()` = `CLAUDE_CODE_ENABLE_TASKS !== false`）→ `Artifact`（懒代理）→ Artifact 附加工具 → `AppifactRepl` → `LSP`（`Dqe()` = 常量 true）→ `EnterWorktree`、`ExitWorktree`（`YNt()` = 常量 true）→ `SendMessage` → `SendFile` → `ListAgents` → `ShareOnboardingGuide` → `Poll` → `Workflow` → `CronCreate/CronDelete/CronList` → 自托管 runner 工具（`areWizardOperatorToolsEnabled()`）→ `ScheduleWakeup` → `RemoteTrigger` → `SearchMcpRegistry` → `SuggestConnectors` → `ShowOnboardingRolePicker` → `OfferChromeSetup` → `ReadNotifications` → `ENABLE_STUB_TOOLS`（`enable__mcp__claude-in-chrome` 等桩）→ `ListConnectors` → `PLUGIN_SKILL_TOOLS` → `Monitor` → `SendUserMessage`（Brief）→ `SendUserFile` → `ProposeSkills` → `ProposeGoal` → `PublishPlugin` → `PushNotification` → `FetchInboxMessage` → `EndConversation` → `PowerShell`（`isPowerShellToolEnabled()`）→ `ListMcpResourcesTool` → `ReadMcpResourceTool` → `ReadMcpResourceDir` → `RefreshMcpTools`（`CLAUDE_CODE_ENABLE_REFRESH_MCP_TOOLS`）→ `ToolSearch`（`isToolSearchEnabledOptimistic()`）→ `WaitForMcpServers` → `GetTask`。

- 大部分 316 新工具在各自 chunk 里，`tools.ts` 用顶层 `require("./chunk-…")` 懒加载（`chunk-kxyd0g16.js#Zi`、`#fa` 两条 var 语句）；`ArtifactTool` 用 `createLazyProxy`（`#Qr`）先放一个只有头部属性的对象。
- `tools.ts` 顶层执行 `registerAllBaseToolsProvider(getAllBaseTools)`（`Tool.ts · umi`），让 UI/消息层通过 `getAllBaseToolsFromRegistry()`（`QW`）按名查工具，避免循环依赖。
- `TOOL_CATALOG = {getAllBaseTools, getTools, assembleToolPool}`（`chunk-kxyd0g16.js#h5`，门面原名）挂在 `toolUseContext.options.toolCatalog`；执行器遇到未知工具名时用它给"你是不是想用 X"的提示。
- 2.1.88 里按 `USER_TYPE === 'ant'` 注册的 Config、Tungsten、REPL 在 316 外部构建中没有（`getReplTool`，`chunk-kxyd0g16.js#Sn` 恒 null）；`TestingPermission` 存在但 `isEnabled` 恒 false；TeamCreate/TeamDelete/TaskOutput 已移除（名字进退役名单 `chunk-e6aww6q8.js#_0e`）。

### 4.2 `getTools(permissionContext, opts)`（`chunk-kxyd0g16.js#Z$`，门面原名）

1. **简单模式**（`CLAUDE_CODE_SIMPLE` 且未 `skipSimpleModeFilter`）：只给 `Bash`（若 `jd()`）、`PowerShell`（若启用）、`Read`、`Edit`；协调者模式再加 `Agent`、`TaskStop`、`SendMessage`、`Workflow`（若 `Sg()`）。REPL 分支在外部构建不生效。
2. 否则：`getAllBaseTools()` 去掉 `ListMcpResourcesTool`、`ReadMcpResourceTool`、`ReadMcpResourceDir`、`StructuredOutput`（这些在有 MCP / SDK 需要时另行加入）。
3. `Aee(tools, ctx)`：按权限上下文过滤——整工具 deny 规则、MCP `effectiveMaxPermission === "blocked"`、`--tools` 启动列表之外的工具等。
4. REPL 过滤（外部构建不生效）；`dGt(...)` 为真（WebFetch 子代理开启，`CLAUDE_CODE_WEB_FETCH_AGENT` 或 GrowthBook `tengu_clever_orbit`）时去掉 `WebFetch`，改由内建代理 `web-fetch` 承担。
5. `onlyNames` 过滤，再逐个调用 `isEnabled()`。
6. 嵌入式搜索开启但 Bash 不可用时，把 `Glob`、`Grep` 与其 V2 别名补回。
7. 工具搜索相关（`hasPendingMcpClients()` 有待连接 MCP 服务器，或 `isDeclared()` 已声明）且池中没有 MCP 资源工具、没有 ToolSearch、没有 WaitForMcpServers 时，追加 `WaitForMcpServers`。

`/hooks` 命令用的 `getToolsWithHookOnlyTargets`（`chunk-ag5x7vhf.js#axs`，旧版名 `getTools` 是错配）在 getTools 结果后追加只会被 hook 匹配到的工具。

### 4.3 `assembleToolPool(permissionContext, mcpTools, opts)`（`chunk-kxyd0g16.js#qNt`，门面原名；旧版匹配错成 `getRuleByContentsForTool`）

内建 = `getTools(...)`；MCP = 机器级 MCP 工具 + 会话 MCP 工具，按名去重、`Aee` 过滤、处理遮蔽内建工具的规则；两组**各自**按名排序（`compareToolsByName`）后拼接，再按名去重（内建优先）。分区排序是为了提示缓存：内建工具构成稳定前缀，MCP 工具增减不影响前缀。print/SDK 路径另用 `utils/toolPool.ts · mergeAndFilterTools`（`chunk-0nt1vzp1.js#Ton`），协调者模式下再按协调者规则过滤。

### 4.4 为什么默认没有 Glob / Grep

调用链（详见 6.2 文件组第 1 节）：

```js
// tools.ts · getAllBaseTools
...[GlobTool, GrepTool].filter((t) => !getShadowedSearchToolNames().has(t.name)),
// chunk-e6aww6q8.js#Xoe  getShadowedSearchToolNames
if (!hasEmbeddedSearchTools() || !jd()) return new Set();   // 否则 {Glob, Grep, 及其 V2 别名}
// chunk-e6aww6q8.js#FC   hasEmbeddedSearchTools
if (!isEnvTruthy("true")) return false;                      // 旧版是 process.env.EMBEDDED_SEARCH_TOOLS，316 构建期替换成字面量
if (searchToolsOptIn()) return false;                         // chunk-ndmse9kj.js#Uws
return process.env.CLAUDE_CODE_ENTRYPOINT !== "local-agent";
```

316 外部构建默认带内嵌搜索：Bash 里的 `find`/`grep` 被 shell 快照函数改成调用 claude 二进制内嵌的 bfs/ugrep（`utils/bash/ShellSnapshot.ts · createFindGrepShellIntegration`，同样以 `FC()` 为条件），系统提示词、Bash 提示词、Explore/Plan 代理提示词也随 `FC()` 改写为"用 Bash 的 find/grep"。

开关：

| 让 Glob/Grep 回来的方式 | 机制 |
|---|---|
| `--tools` 或 `--allowedTools`（以及 settings 的 allow 规则经 CLI 传入的）点名 `Glob` 或 `Grep` | `utils/permissions/permissionSetup.ts · initializeToolPermissionContext` 执行 `replaceSearchToolsOptIn([Glob, Grep].some(点名))`（`chunk-ndmse9kj.js#Bws`），`searchToolsOptIn` 为真 → `FC()` 为假 |
| `CLAUDE_CODE_ENTRYPOINT=local-agent` | `FC()` 为假 |
| Windows 且找不到 Git Bash | `jd()` 为假（此时 Bash 本身也不注册） |
| Bash 不可用而嵌入式搜索仍开 | `getTools` 第 6 步把 Glob/Grep 补回 |

### 4.5 延迟加载：哪些工具要先 ToolSearch

**模式**（`utils/toolSearch.ts · getToolSearchMode`，`chunk-mp7v59a0.js#Jie`）：

| 条件（按顺序） | 模式 |
|---|---|
| `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` 或 HIPAA 组织，且非 force（`isToolSearchDisabledByBetas`） | `standard`（不延迟） |
| `isToolSearchForceOverride()`：firstParty 且 `ENABLE_TOOL_SEARCH`=`force`（或托管策略 hostToolSearchEnv 为 force） | `tst` |
| `ENABLE_TOOL_SEARCH`=auto:0 / auto:100 | `tst` / `standard` |
| `auto` 或 `auto:N` | `tst-auto`（延迟工具 token 数 ≥ 上下文窗口 N%（默认 10%）才开） |
| 真值 / 假值 | `tst` / `standard` |
| 未设置 | `tst`（默认就延迟） |

`isToolSearchEnabledOptimistic()`（`#Oh`）= 模式不是 standard，决定是否注册 ToolSearch 工具。2.1.88 里"第一方提供方但 `ANTHROPIC_BASE_URL` 不是官方地址时关闭"的分支在 316 删除了。

**请求级判定**（`isToolSearchEnabled`，`chunk-e6aww6q8.js#wGr`）：先排除不可用原因（`getToolSearchUnavailableReason`：模型不支持 tool_reference——默认 claude-3 系列，GrowthBook `tengu_tool_search_unsupported_models` 可改；Vertex 上低于 4.5 的模型；Foundry 部署不支持；请求没有工具；ToolSearch 未注册；ToolSearch 被 disallowedTools 去掉），再看本对话的"锁"：已经在没有 ToolSearch 的情况下跑过（原记名 getToolSearchLatch 为 false；待核实：当前阅读树无此名，门闩在 `resolveDeclaredToolSet` 的 `latch` 参数一带）则保持关闭直到压缩/清空，端点拒绝过也关闭；然后按模式决定。决策记 `tengu_tool_search_mode_decision`。ToolSearch 被去掉但其它条件满足时改用 `tool_addition` 方式（`toolSearchToolFilteredOut`，`chunk-e6aww6q8.js#SGr`）。

**单个工具是否延迟**（`tools/ToolSearchTool/prompt.ts`，门面原名）：

```
isDeferredTool(tool)            = describe hook 记录的结论（deferralOf） ?? isDeferredToolByEngine(tool)
isDeferredToolByEngine(tool)    = alwaysLoad → 否；isNeverDeferred → 否；否则 基础判定
  基础判定（chunk-3h9nvmn3.js#T）：isMcp → 是；tengu_shiny_stardust 开且是 ReportFindings、Workflow、ShareOnboardingGuide → 是；否则 shouldDefer === true
  isNeverDeferred（#O）：tengu_non_deferrable_builtins / 托管设置 non_deferrable_builtins 中的工具、ToolSearch、StructuredOutput、
                        fork 子代理开启时的 Agent、Brief(SendUserMessage)、后台会话里的 EnterWorktree、条件满足的 PushNotification
isDeferredToolInConversation(...)（#Gq）：请求级——已在本对话按值内联的工具不再延迟
```

请求构建（`services/api/claude.ts · queryModel`）里：延迟且尚未被发现（`extractDiscoveredToolNames`：tool_result 里的 `tool_reference`、宣告附件的 `surfacedNames`、压缩边界携带的 `preCompactDiscoveredTools`）的工具**不放进 `tools`**；名字通过 `deferred_tools_delta` 附件（`getDeferredToolsDelta`，`#V6s`，渲染成系统消息"Deferred tools appear by name…"）告诉模型；再追加占位工具 `DeferredToolPlaceholder`（`chunk-e6aww6q8.js#gun`：`{name, description:"Reserved placeholder that keeps deferred tool loading active; never call this tool.", input_schema:{}, defer_loading:true}`，GrowthBook `tengu_deferred_stub_tool` 默认 true），保证请求里至少有一个 `defer_loading` 工具。

### 4.6 316 实测"直接 12 个、延迟 11 个"的来历

`docs/process/verify.md` 7.3 节：`-p`、第三方 API、默认模型 claude-opus-5-5、无 MCP 时，请求 `tools` 有 12 个：Agent、Bash、Edit、ListAgents、Read、ReportFindings、ScheduleWakeup、Skill、ToolSearch、Workflow、DeferredToolPlaceholder、Write；系统消息宣告 11 个延迟工具：CronCreate/CronDelete/CronList、EnterWorktree、ExitWorktree、Monitor、NotebookEdit、SendMessage、TaskStop、WebFetch、WebSearch。按代码逐个对上：

| 工具 | 去向 | 代码依据 |
|---|---|---|
| Agent、Bash、Read、Edit、Write、Skill | 直接 | 无 `shouldDefer`；Skill `isEnabled = !Wb()` |
| ReportFindings（`chunk-kxyd0g16.js#_s`）、ScheduleWakeup（`#ds`，`shouldDefer: !1`）、ListAgents（`chunk-kv9asrky.js#g`，`isEnabled` = `isCrossSessionMessagingEnabled()`）、Workflow（`chunk-y1shfdfm.js#gi`，`isEnabled` = `isWorkflowsAvailable()`） | 直接 | 无 `shouldDefer`；`tengu_shiny_stardust` 默认 false，ReportFindings/Workflow 不延迟 |
| ToolSearch | 直接 | 总是内联 |
| DeferredToolPlaceholder | 直接（但 `defer_loading:true`） | `gun()`，不是 getAllBaseTools 的成员 |
| NotebookEdit、WebFetch、WebSearch、TaskStop、SendMessage、EnterWorktree、ExitWorktree、Cron 三件套、Monitor | 延迟 | `shouldDefer: !0`（Monitor `isEnabled` = `isBashAvailable()`；Cron `isEnabled` = `isKairosCronEnabled()`；WebFetch `!CLAUDE_CODE_DISABLE_WEB_FETCH && allow_web_fetch`） |
| Glob、Grep | 不注册 | 4.4 |
| TodoWrite、TaskCreate/Get/Update/List | 不可用 | 模型门 `chunk-e6aww6q8.js#t6`：主模型不在旧模型集合（claude-3*、opus-4-0…4-7、sonnet-4-0…4-6、haiku-4-5）时默认关闭；`--tools` 点名、后台会话或 `CLAUDE_CODE_ENABLE_TODO_TOOLS`=`1` 可开（见 6.3 第 0.1 节） |
| AskUserQuestion、ExitPlanMode、EnterPlanMode | 不可用 | `-p` 是非交互且没有提问通道：`ebe()` / ExitPlanMode.isEnabled 为假，EnterPlanMode 跟随 ExitPlanMode |
| LSP | 不可用 | `isEnabled = hasEverConnected()`（没有 LSP 服务器连过） |
| ListMcpResources/ReadMcpResource/ReadMcpResourceDir、WaitForMcpServers、RefreshMcpTools | 不在池中 | getTools 第 2 步去掉；没有 MCP 服务器 |
| SendUserMessage、SendFeedback、PushNotification、RemoteTrigger、Design/Projects/Artifact 等 | 不可用 | 各自 `isEnabled` 依赖登录态、GrowthBook 或会话类型（见 6.4 属性表与 4.2 附表） |
| PowerShell | 不注册 | linux 上需 `CLAUDE_CODE_USE_POWERSHELL_TOOL`=`true` |
| GetTask、TestingPermission | 不可用 | `isEnabled` 恒 false |

关掉工具搜索（去掉 `advanced-tool-use-2025-11-20` beta）后 11 个延迟工具全部内联、占位工具与 ToolSearch 不再发送：12 − 2 + 11 = 21，与实测一致。交互模式 13 个工具的多出项未在本领域核实（推测与交互会话启用的 AskUserQuestion/计划模式类工具有关，但这些多为 `shouldDefer`，需要运行时确认）。

### 4.7 附表：316 新增内建工具的启用条件（tools 领域外，定义在各自 chunk）

| 工具 | 声明 | isEnabled | shouldDefer |
|---|---|---|---|
| ReportFindings | `chunk-kxyd0g16.js#_s` | 默认 | 否（`tengu_shiny_stardust` 时延迟） |
| ScheduleWakeup | `chunk-kxyd0g16.js#ds` | 默认 | 显式 false |
| Workflow | `chunk-y1shfdfm.js#gi` | `Sg()` | 否（同上） |
| ListAgents | `chunk-kv9asrky.js#g` | `Pa()` | 否 |
| Monitor | `chunk-b91jfdd4.js#Be` | `jd()` | 是 |
| SendFeedback | `chunk-kxyd0g16.js#di` | `isFeedbackDraftsEnabled()` | 否 |
| WaitForMcpServers | `chunk-e6aww6q8.js#h1o` | 工具搜索可用时关；有连接中的 MCP 服务器时开 | 否 |
| ReadMcpResourceDir | `chunk-9ycd12hk.js#H` | 默认 | 是 |
| RefreshMcpTools | `chunk-kxyd0g16.js#Ai` | 有 MCP 配置 | 否 |
| GetTask | `chunk-kxyd0g16.js#ir` | 恒 false | — |
| Poll | `chunk-b5fpmtr5.js#q` | `isPollEventIngressActive()` | 否 |
| FetchInboxMessage | `chunk-psktkvhp.js#F` | `Wc() \|\| yEn()!==void 0` | 是 |
| SendFile | `chunk-dq968kwq.js#Ce` | `isPeerSendFileEnabled()` | 是 |
| SendUserFile | `chunk-gy7w3kfr.js#Ee` | firstParty 且 `allow_…` 或 `CLAUDE_CODE_ATTACHMENTS_BY_PATH` | `shouldDefer()` 动态 |
| PushNotification | `chunk-4rqaac63.js#b` | GrowthBook `tengu_kairos_push_notifications` | 是 |
| ProposeSkills | `chunk-2rkp9ne9.js#Ee` | 技能同步相关（`CLAUDE_CODE_SYNC_SKILLS`、`CLAUDE_CODE_SKILL_P…`） | — |
| ProposeGoal | `chunk-1rwh0063.js#X` | 交互、非子代理、目标功能开启 | 是 |
| PublishPlugin | `chunk-hcckvqyb.js#AOr` | `isPluginPublishAllowed()` | 是 |
| EndConversation | `chunk-t1kwhq0j.js#_` | 当前模型支持 | 是 |
| DesignSync / ClaudeDesign / Projects | `chunk-98n6ge4d.js#Qt` / `chunk-171dhyhe.js#At` / `chunk-eg496hkq.js#xn` | `UW()` / `kGe` / `allow_projects_tool` 且已登录 | DesignSync 是 |
| SendToProject / SendToProjectContext | `chunk-dz3q485w.js#Ar`/`chunk-dz3q485w.js#no` | `kht()` | 是 |
| Artifact / ArtifactComments / AppifactRepl | `chunk-cdrjna5f.js#WTe` 等 | Artifact 功能开启 | Artifact 否 |
| SearchMcpRegistry / SuggestConnectors / ListConnectors | `chunk-1kxhadxb.js#c` 等 | `gHe` | 是 |
| ShareOnboardingGuide / ShowOnboardingRolePicker / OfferChromeSetup / ReadNotifications | `chunk-kxyd0g16.js#Pn`/`chunk-kxyd0g16.js#Qt`/`chunk-kxyd0g16.js#to`/`chunk-kxyd0g16.js#An` | 各自 `isTeamOnboardingShareEnabled` / `isRemoteSession` / `isChromeSetupOfferEnabled` / `isQueuedNotificationsSupported` | OfferChromeSetup 是 |

## 5. 工具执行编排

### 5.1 非流式：`runTools`（`services/tools/toolOrchestration.ts`，`chunk-0h4e7gnq.js#Gn`）

1. `partitionToolCalls`：把一条回答里的 `tool_use` 按顺序分批——输入 `safeParse` 成功且 `isConcurrencySafe(input)` 为真的连续调用合成一批，其余每个单独一批；`isConcurrencySafe` 抛异常视为不安全。
2. 安全批：`runToolsConcurrently`，用 `all(generators, getMaxToolUseConcurrency())` 并发（`CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY`，默认 10）；各调用的 `contextLayers` 先按 tool_use id 暂存，整批结束后按 tool_use 原顺序应用到上下文。
3. 不安全批：`runToolsSerially`，每个调用的 `contextLayers` 立即应用。
4. 每个调用结束发 `{type: "set_in_progress_tool_use_ids", op: {action: "remove", ids}}`（UI 的转圈状态）。

### 5.2 流式：`StreamingToolExecutor`（`chunk-ha3km179.js#oi`）

回答还在流式到达时，每收到一个完整 `tool_use` 就 `addTool`：

- 找不到工具：MCP 服务器还在连接（`aGt`）则排队等待；否则立即生成 `<tool_use_error>Error: No such tool available: X</tool_use_error>`，并用 `TOOL_CATALOG.getAllBaseTools()` 等信息生成建议后缀（`explainUnavailableArtifactTool`，`chunk-e6aww6q8.js#Y1o`）。
- 能找到：判定并发安全后入队 `queued`。`processQueue` 的规则：当前没有执行中的工具，或"自己并发安全且执行中的都并发安全"才开始执行；遇到不安全的排队项就停下（保持顺序）。
- `executeTool`：为每个调用建子 AbortController（子中断会冒泡成整轮中断，除非已丢弃）；记录 `exclusiveCallQueuedBehind`（后面是否还有独占调用在排队，供工具决定是否转后台）；调用 `runToolUse`；进度消息放进 `pendingProgress` 立即可取（`tool_heartbeat` 只唤醒等待者）；工具结果消息放进 `results`；遇到第一个 `is_error` 后续不再判中断。
- 中断：`getAbortReason` 在每条产出前检查；中断原因 `turn-abort`（"interrupted"）、`background`（转后台，"cancelled"）、`remote-cancel`、用户拒绝等生成不同的合成 tool_result；用户中断后的宽限期 `getSerializedPetalLimit()`（GrowthBook `tengu_serialized_petal`，默认 0）到期仍未结束则放弃该调用（`tengu_aborted_tool_call_abandoned`）。`discard()` 用于流式回退（"Streaming fallback - tool execution discarded"）；`EndConversation` 结束时为 "Claude ended the conversation"。
- 产出顺序：`getCompletedResults` 按 tool_use 收到顺序产出已完成结果，遇到执行中的不安全工具就停；进度随时产出。`getRemainingResults` 在回答结束后等待全部完成（`Promise.race` 进度与完成）。并发安全工具的 `contextLayers` 在没有执行中工具时统一应用（`applyEndedRunLayers`），不安全工具的立即应用。

### 5.3 单次调用：`runToolUse` → `checkPermissionsAndCallTool`

`runToolUse`（`chunk-e6aww6q8.js#$B`，旧版同名；写作时切在 `_unattributed`，现在 `services/tools/toolExecution.ts`）：

1. 等待会话活动锁/前置排空；用 `findToolByName(tools, name, toolAliases)` 查工具，别名命中记 `tengu_dead_probe_tool_alias_exec`。
2. 工具缺失但 MCP 服务器连接中：`Lwt` 等待（`tengu_mcp_pending_tool_wait`）。
3. 隔离锁检查（`tengu_tool_use_isolation_latch_denied`，返回 permission-rule 错误）。
4. 判定运行位置（本机 / 宿主 `elsewhere` / 拒绝 `refused`）；远程工具显示状态通知。
5. 本机：`streamedCheckPermissionsAndCallTool`（`#g3r`）——把 `checkPermissionsAndCallTool` 包成异步流，进度消息即时入流（`tengu_tool_use_progress`），按需 `coerceInput`，运行模块级 `tool.call` hook（`W$n`），记录权限决策与沙箱违规（`logToolSafetyEvent`、`logHookPushbacks`：`chunk-e6aww6q8.js#fNn`、`chunk-e6aww6q8.js#pNn`）。

`checkPermissionsAndCallTool`（`#w3r`，约 35 KB）步骤：

1. **输入**：`parseToolInput`（`chunk-e6aww6q8.js#_Fn`）解析与 schema 校验。JSON 解析失败给出前 200 字节和常见原因（未转义反斜杠/控制字符/截断）；schema 失败时附：选项"本对话早先提供过但本会话不可用"（`buildUnavailableOptionNote`）、延迟工具"schema 未发送，先 ToolSearch select:"（`buildSchemaNotSentHint`）、MCP 缺必填参数统计。
2. **validateInput**（`runValidateInput`，`chunk-e6aww6q8.js#CGr`）：失败 → `<tool_use_error>…</tool_use_error>`（`notAnError` 时不加错误标记；带 `denyRule` 时记录拒绝决策；`remedy` 附在消息上）。中断则返回"已取消"（`buildCancelledToolResult`，阶段 validate_input）。
3. **PreToolUse hooks**（`runPreToolUseHooks`，`#IGr`）：产出 hook 消息、`hookPermissionResult`、`hookUpdatedInput`（改写后重新 validateInput）、`preventContinuation/stopReason`、`additionalContext`、`stop`、`defer`；hook 超时/异常时阻止执行（固定文案 `PRE_TOOL_HOOK_TIMEOUT_MESSAGE` / `PRE_TOOL_HOOK_ERROR_MESSAGE`）。
4. **权限**：`resolvePermissionDecisionForCall`（`#PGr`）→ `resolveHookPermissionDecision`（`#f5r`）：hook allow 仍要过 deny/ask 规则；无结论或 ask 走 `runPermissionPipeline`（`#HPe`：规则/模式评估 → 分类器/后处理 → 需要时 `canUseTool` 询问）。决策记 OTel `tool_decision`（`getToolDecisionForOTel`）、`tengu_tool_use_can_use_tool_allowed/rejected`；拒绝 → 错误结果（含"总是允许"之类反馈）。权限处理器返回的 `updatedInput` 不符合 schema 时报 "This is a configuration issue in your canUseTool callback…"。
5. **调用**：开始会话活动 `tool_exec`；协调者模式的 Bash 调用限制；工作目录在检查与调用之间变化则拒绝（"working directory changed between check and call"）；`tool.call(callInput, ctx, canUseTool, assistantMessage, onProgress, {userModified, permissionCheckedFor, runnerCheckedHere, timing…})`；`stall` 日志 `[Stall] tool_dispatch_start/end`。
6. **结果**：`detached` 结果直接用文本，否则 `mapToolResultToToolResultBlockParam`；`processToolResultBlock`（`utils/toolResultStorage.ts`）：空结果改成 "(X completed with no output)"，超过阈值 `getPersistenceThreshold(name, maxResultSizeChars, persistenceThresholdCeiling)`（默认上限 50 000 字符，GrowthBook `tengu_velvet_ibis` 可按工具覆盖）时写入磁盘，tool_result 换成 `<persisted-output>` 预览（`tengu_tool_result_persisted`）；`stripForCreation/stripForStorage` 精简转录里保存的 `toolUseResult`；权限 `acceptFeedback`、`contentBlocks` 追加到结果。
7. **PostToolUse hooks**（`runPostToolUseHooks`）可追加上下文、阻止继续、改写 MCP 工具输出；失败时 `runPostToolUseFailureHooks`。
8. **遥测**：`tengu_tool_use_success`/`tengu_tool_use_error`（错误分类 `classifyToolError`）/`tengu_tool_use_interrupted`、OTel `tool.output` 内容事件（`OTEL_LOG_TOOL_DETAILS` 等开关）。

### 5.4 进度、结果回传与上下文修改

- 进度：工具通过 `call` 上下文的 `onProgress(data)` 发进度；执行层包装成 `progress` 消息（`createProgressMessage`，`parentToolUseID` 用于子代理嵌套）；`hook_progress` 类型在展示时被 `filterToolProgressMessages` 过滤。
- 结果：每个调用最终产出 user 消息（`tool_result` 块 + `toolUseResult` 原始数据 + `sourceToolAssistantUUID`），可另带 `newMessages`（如 ToolSearch 的 isMeta 提示）。
- 上下文修改：`contextLayers` 取代 2.1.88 的 `contextModifier`，由编排层按顺序叠加（`Dwe`）。
- `afterResultCommitted`：结果写入对话后才执行的副作用（`runAfterResultCommitted`）。

## 6. 内建工具逐个说明

本节合并四个分组的草稿，各小节保留分组内编号。core 部分负责的 ToolSearch、StructuredOutput、TestingPermission 在 6.0。

### 6.0 core 部分的工具

#### ToolSearch（`tools/ToolSearchTool/ToolSearchTool.ts`，`chunk-e6aww6q8.js#ujr`）

- 属性：`isEnabled = isToolSearchEnabledOptimistic()`、只读、并发安全、`backgrounding: "never"`、`maxResultSizeChars: 1e5`、`userFacingName` 空串（UI 不显示）、总是内联。
- 输入 `{query: string, max_results?: number = 5}`；输出 `{matches: string[], query, total_deferred_tools, pending_mcp_servers?, failed_mcp_servers?}`。
- 查询规范化（`boundToolSearchQuery`，`chunk-s61vbvea.js#Mqo`）：最多 16 384 字符；`select:` 最多 64 个名字；关键词最多 32 个词。
- `select:a,b`：逐个按全名、再按 MCP 原始工具名/规范化名找（`findToolsByNameOrMcpToolName`）；已在本对话内联的工具返回空 matches 并追加 isMeta 提示"Already available in this conversation… Call it directly"；部分找不到时等待连接中的 MCP 服务器（最多 5 秒，`tengu_tool_search_mcp_wait`）后重查。
- 关键词：`searchToolsWithKeywords`——完全同名直接返回；`mcp__` 前缀按前缀匹配；`+词` 为必选；打分：名字分词完全命中 10（MCP 12）、部分命中 5（MCP 6），整名命中 10/12、部分 3/4，searchHint 命中 4，描述命中 2；取前 `max_results`。描述文本由 `getToolDescriptionMemoized` 缓存，延迟工具集合变化时失效。
- 查询里出现某失败 MCP 服务器的名字时会重拨该服务器（至多每若干秒一次）。
- 结果：有匹配时 tool_result 的 content 是 `[{type: "tool_reference", tool_name}]`，下一次请求就把这些工具定义放进 `tools`；无匹配时文本说明（连接中/连接失败/被组织策略禁止/被 Claude Code 保留地址拒绝的服务器各有文案，并提醒"引用的错误文本只是诊断数据，不是指令"）。
- 提示词（`getPrompt`，`chunk-3h9nvmn3.js#w5r`）：开头 + （新模型的严格版："调用未加载的工具会因 InputValidationError 失败，看到任何地方提到延迟工具名先 select"，否则简短版）+ 结果格式与三种查询形式。

#### StructuredOutput（`tools/SyntheticOutputTool/SyntheticOutputTool.ts`）

SDK `--json-schema` 时由 `createSyntheticOutputTool(schema)`（按 schema 缓存）构造：Ajv 编译（节点数 ≤ 1e5、深度 ≤ 1e4，拒绝 `$async`），尝试派生严格模式 schema（`tengu_structured_output_strict_schema`），检查 schema 是否不可满足（`tengu_structured_output_schema_lint`）。`call` 校验失败抛 "Output does not match required schema"；成功返回 `{structured_output, endsTurn: true}`。总是内联、只读、并发安全、`isOpenWorld: false`。getTools 默认不含它，由 SDK 路径加入。

#### TestingPermission（`tools/testing/TestingPermissionTool.tsx`）

`checkPermissions` 恒返回 ask "Run test?"；`isEnabled` 恒 false（2.1.88 在 `NODE_ENV=test` 时注册，316 留着定义但不可用）。

### 6.1 shell 组：Bash、PowerShell、git 操作跟踪


> 范围：`tools/BashTool/*`、`tools/PowerShellTool/*`、`tools/shared/gitOperationTracking.ts`（32 个重组模块）。
> 依据：`original/` 2.1.316 代码（声明 id 形如 `chunk-xxx.js#压缩名`）；旧版 2.1.88 仅作对照。
> 路径写法 `模块路径 · 函数名`，名字用本组 semantic 命名（括号里给声明 id）。

#### 1. 概述

两个 shell 工具都由 `on({...})`（Tool 构造器，见 core 组）定义，结构相同：工具对象上放静态属性与渲染/描述方法，`create(ctx)` 返回每个实例的 `validateInput / checkPermissions / permissionCheckFailureDecision / call`。

调用关系：

```
工具编排 (services/tools/*)
  → validateInput            BashTool.create().validateInput
  → checkPermissions         bashPermissions · bashToolHasPermission（经 hQ / XVt / VVt 两遍读法）
       ├ bashCommandHelpers · checkCommandOperatorPermissions（管道/子 shell）
       ├ bashPermissions · bashToolCheckPermission（单子命令）
       │    ├ pathValidation · checkPathConstraints
       │    ├ sedValidation · checkSedConstraints
       │    ├ modeValidation · checkPermissionMode（acceptEdits）
       │    └ readOnlyValidation · checkReadOnlyConstraints（只读自动允许）
       └ 沙箱自动允许 checkSandboxAutoAllow / checkSandboxAutoAllowForAst
  → call                     BashTool.create().call → runShellCommand → exec(…,"bash")
       └ 结果后处理：持久化、图片、gitOperationTracking · trackGitOperations / detectGitOperation、bashEditDiff、staleReadFileStateHint
```

AST 解析与语义检查不在本组：`utils/bash/ast.ts`（`w1`、`checkSemantics`、`parseForSecurity`）、`utils/bash/parser.ts · parseCommandRaw`。316 的 Bash 安全判定主要基于 tree-sitter AST，旧版 `bashSecurity.ts` 的二十多个正则校验器在 316 中已不存在（见第 6 节）。

#### 2. 模块地图

| 模块 | 职责 |
|---|---|
| `tools/BashTool/BashTool.tsx` | 工具定义（`chunk-e6aww6q8.js#Ni`）、schema、执行生成器 `runShellCommand`（`#UAs`）、只读文件记账 `recordShellFileReadsInReadState`（`#DVn`） |
| `tools/BashTool/bashPermissions.ts` | 规则匹配、单子命令判定、权限总流程 `bashToolHasPermission`（`#Wze`） |
| `tools/BashTool/bashCommandHelpers.ts` | 管道分段权限 `segmentedCommandPermissionResult` |
| `tools/BashTool/bashSecurity.ts` | 结果严重度/合并工具，`bashCommandIsSafeAsync`（`#VVt`，两遍读法） |
| `tools/BashTool/pathValidation.ts` | 路径提取器 `PATH_EXTRACTORS`、`checkPathConstraints`（`#tQ`）、`checkDangerousRemovalPaths`（`#nq`） |
| `tools/BashTool/readOnlyValidation.ts` | `COMMAND_ALLOWLIST`、`checkReadOnlyConstraints`（`#gpn`） |
| `tools/BashTool/sedValidation.ts` / `sedEditParser.ts` | sed 白名单与危险表达式 |
| `tools/BashTool/modeValidation.ts` | acceptEdits 下的文件命令自动允许 |
| `tools/BashTool/shouldUseSandbox.ts` | 是否进沙箱 |
| `tools/BashTool/destructiveCommandWarning.ts` | 破坏性命令模式（遥测与对话框警告） |
| `tools/BashTool/commandSemantics.ts` | 退出码语义 |
| `tools/BashTool/prompt.ts` | 工具描述、git/PR 指南、沙箱节 |
| `tools/BashTool/utils.ts` | 输出截断、图片、cwd 重置、后台说明 |
| `tools/BashTool/UI.tsx`、`BashToolResultMessage.tsx` | 渲染 |
| `tools/PowerShellTool/PowerShellTool.tsx` | 工具定义（`chunk-v0yfsee9.js#oi`）、`runPowerShellCommand`（`#io`） |
| `tools/PowerShellTool/powershellPermissions.ts` | 权限总流程 `powershellToolHasPermission`（`#zs`） |
| `tools/PowerShellTool/powershellSecurity.ts` | 24 个 AST 安全检查器 + `powershellCommandIsSafe`（`#Xt`） |
| `tools/PowerShellTool/pathValidation.ts` | `CMDLET_PATH_CONFIG`、`checkPathConstraintsForStatement`（`#ts`） |
| `tools/PowerShellTool/readOnlyValidation.ts` | `CMDLET_ALLOWLIST`、`isReadOnlyCommand`、git/docker/dotnet 只读检查 |
| `tools/PowerShellTool/modeValidation.ts` | acceptEdits 模式 |
| `tools/PowerShellTool/gitSafety.ts` | git 内部路径 / .git 检测 |
| `tools/PowerShellTool/clmTypes.ts`、`commonParameters.ts`、`destructiveCommandWarning.ts`、`prompt.ts`、`UI.tsx`、`toolName.ts` | 支撑 |
| `tools/shared/gitOperationTracking.ts` | git/gh 操作识别与遥测 |

#### 3. Bash 工具

##### 3.1 属性一览（`chunk-e6aww6q8.js#Ni`）

| 属性 | 316 值 |
|---|---|
| name | `"Bash"`（`tools/BashTool/toolName.ts · BASH_TOOL_NAME`，`chunk-bwbq4xvm.js#Fe`） |
| userFacingName | `"Bash"`；`CLAUDE_CODE_BASH_SANDBOX_SHOW_INDICATOR` 且将进沙箱时为 `"SandboxedBash"` |
| searchHint | `"execute shell commands"` |
| description(input) | `input.description` 或 `"Run shell command"` |
| prompt | `prompt.ts · getSimplePrompt`（精简模式走 `getLeanPrompt`） |
| strict | `true` |
| enablesCodeExecution | `true` |
| ruleContentField | `"command"`（权限规则 `Bash(...)` 匹配的字段） |
| maxResultSizeChars | getter：`settings.bashOutputMaxChars` ?? 30000（`chunk-bhxaz9j0.js#$rt`） |
| persistenceThresholdCeiling | `MAX_CONTEXT_TOKENS`（持久化阈值上限，`chunk-yxnffbzs.js#FD`） |
| backgrounding | `"self"`（自己处理后台化） |
| remoteExecution | `{supported:true, refusedInputFields, decidingInputFields:["command","run_in_background","dangerouslyDisableSandbox"]}` |
| isConcurrencySafe(input) | `= isReadOnly(input)` |
| isReadOnly(input, ctx) | 非"仅云端执行"且 `isReadOnlyBashInput`（`#$mt` → `checkReadOnlyConstraints`） |
| notReadOnlyReason | 给出不是只读的原因与具体子命令 |
| isEnabled / shouldDefer / alwaysLoad | 未设置，取 `on()` 默认（见 core 组） |
| suppressesAllPermissionUpdates | 输入带远程机器字段（`_host`）且非本机时为 true |
| sandboxNetworkLists | 输入里的 `allowed_domains` 等（`getCommandNetworkLists`，`chunk-e6aww6q8.js#J_e`） |
| toAutoClassifierInput | 一般为命令文本；带远程机器或网络放行时为对象 |
| preparePermissionMatcher | `buildRuleRelevanceFilter(command)`（规则匹配器预编译） |
| isSearchOrReadCommand | `isSearchOrReadBashCommand`：全部是 find/grep/rg…（搜索）、cat/head/jq…（读）、ls/tree/du（列目录） |
| coerceInput | `normalizeBashInputAliases`（`chunk-e6aww6q8.js#MVn`）：`timeout_ms`→`timeout`、`command_description`→`description` 等别名纠正 |
| outputSchemaAcrossProcesses / fromAnotherProcess | 跨进程（远程/另一台机器）结果的安全子集与计数 |
| stripForStorage | 存储时可清空 stdout/stderr |
| extractSearchText | `stdout + "\n" + stderr` |

##### 3.2 输入 schema（`chunk-e6aww6q8.js#PAs` → `inputSchema`）

| 字段 | 类型 | 说明 |
|---|---|---|
| `command` | string | 必填；`refine(eT)` 拒绝会在审批框里隐藏的控制字符（"command contains control characters that would be hidden in the approval dialog"） |
| `timeout` | number? | 毫秒，"max `BASH_MAX_TIMEOUT_MS` for a foreground command" |
| `description` | string? | 主动语态的命令说明（不复述命令；简单命令 5–10 词） |
| `run_in_background` | boolean? | 后台运行；后台任务被禁用（`isBackgroundShellDisabled()`）时从 schema 中删除 |
| `dangerouslyDisableSandbox` | boolean? | 跳过沙箱 |
| 条件字段 | | `areCommandNetworkListsOffered()` 为真时附加 `allowedDomainsInputSchema`（auto 模式的 `allowed_domains`）；`attachedMachineInputField()`（远程机器 `_host` 字段） |

##### 3.3 输出 schema（`#T4n`）

`stdout`、`stderr`、`interrupted`、`isImage`?、`rawOutputPath`?、`backgroundTaskId`?、`backgroundOutputPath`?、`backgroundedByUser`?（Ctrl+B）、`backgroundedByTurnAbort`?、`backgroundedToDeliverMessage`?、`timedOutAfterMs`?（超时自动转后台）、`subagentCapApplied`?、`backgroundCwdHint`?、`backgroundEndsWithFinalResponse`?、`backgroundWakesOwner`?、`dangerouslyDisableSandbox`?、`returnCodeInterpretation`?、`noOutputExpected`?、`structuredContent`?、`persistedOutputPath? / persistedOutputSize? / stdoutHoldsOutputEnd?`、`memoryLimitNote`?（OOM）、`triggeredNote`?（特性开关规则给的建议）、`staleReadFileStateHint`?、`ghRateLimitHint`?、`gitOperation`?（不进模型）、`bashEditDiff`?（不进模型，供渲染与 PostToolUse hook）。

`mapToolResultToToolResultBlockParam`：structuredContent 优先；图片走 base64 校验；持久化输出生成预览包装；中断追加 `<error>Command was aborted before completion</error>`；后台任务追加 `formatBackgroundTaskMessage`（`tools/BashTool/utils.ts`，`chunk-e6aww6q8.js#RWr`）；全空且有提示时补 `(Bash completed with no output)`。

##### 3.4 validateInput（`create()` 返回对象的 `validateInput`）

按顺序：
1. 带远程机器字段但当前不支持 → errorCode 11。
2. 沙箱策略拒绝（`sandboxPolicyRefusal`，`chunk-e6aww6q8.js#I0e`：Windows 严格沙箱模式下不可沙箱化的命令）→ errorCode 14，遥测 `sandbox_policy_refusal`。
3. 长 sleep 拦截：后台任务未禁用、完成通知可用（`backgroundCompletionNoticeEnabled()`）、远程约束未禁止后台、未设 `run_in_background`、无 `shellWallCapMs` 时，`detectBlockedSleepPattern`（`#FAs`）发现首个子命令是 `sleep N` 且 N ≥ 25 秒（`MAX_BLOCKED_SLEEP_LINES` = 25）→ errorCode 10，提示改用 Monitor until 循环或 run_in_background。
4. 同一目录同一命令已在后台运行且 TaskStop 可用、开关 `tengu_woolly_toast` 打开 → errorCode 15。
5. 远程调用的后台槽位预留失败 → errorCode 12。
6. `checkAllowedDomainsInput(input, useSandbox)`：带 `allowed_domains` 但命令不会进沙箱时拒绝；`extractLiteralRmTargets(command, cwd)`：含字面量 `rm` 时预先解析删除目标做检查（经主机 `guardSyncedMemoryRemoval` 执行）。

##### 3.5 checkPermissions

`create()` 返回对象的 `checkPermissions` → `mergeBashSubcommandVerdicts(…, await bashToolHasPermissionTwoPass(…))`：外层是通用 shell 权限包装（core/permissions 组），核心判定是 `bashPermissions · bashToolHasPermission`。崩溃时 `permissionCheckFailureDecision` → `denyCrashedCheckUnderCommandClamp`（带 bashCommandClamp 的代理直接拒绝）。

`checkBashCommandClamp`（`chunk-e6aww6q8.js#hQ`）先检查代理的 `bashCommandClamps`（`findSpanNotCoveredByRuleGroups`，不匹配即拒绝，遥测 `tengu_bash_command_clamp_denied`），再在 `runWithDivergentShapes`（`chunk-e6aww6q8.js#Mze`）下调用 `bashToolHasPermission`；循环后续轮次可能执行不同命令时改为 `loop-later-pass` ask。`checkBashWithDeclarations`（`chunk-e6aww6q8.js#XVt`）再对声明前缀的多种读法分别检查并合并；`bashCommandIsSafeAsync`（`#VVt`）把"正常读法"与"refused 读法"两遍结果按严重度（`getDecisionSeverity`：allow 0/1、passthrough 2、ask 3–5、deny 6）择严。

`bashToolHasPermission`（`#Wze`）主流程：

1. `parseCommandRaw` → `w1`（AST 分析，得到简单命令列表或 too-complex）→ `checkSemantics`。
2. 语义有分歧（divergentShape）时，以 read 读法和 refused 读法各跑一遍，取更严者。
3. **too-complex**：`checkTooComplexCommandDeny`（deny 规则、读封锁、空变量危险删除、AST 危险删除）→ `checkSandboxAutoAllow`（沙箱内自动允许，带大量启发式排除）→ heredoc 差异时以 plainUnquotedHeredocs 重解析再试 → 解析为 ERROR 节点时要求确认 rm 安全 → 否则 ask（`bashMissKind: too-complex`）。
4. 读封锁（`permissions.blockReadsOutsideWorkingDirectories`）下，stdin 传代码（heredoc/管道到解释器）拒绝。
5. **语义检查失败**：`checkSemanticsDeny` 规则检查；`newline-hash` 时尝试沙箱自动允许；读封锁下拒绝；空变量删除；安全检查 `Iye`；否则 ask（`semantics`）。
6. 沙箱 AST 自动允许 `checkSandboxAutoAllowForAst`（`#Lze`）。
7. 精确规则 `bashToolCheckExactMatchPermission`（`#EQ`）：deny 直接返回。
8. 管道/操作符：`checkCommandOperatorPermissions`；有子 shell 时额外做读封锁与危险删除检查，并与路径约束择严。
9. cd 处理：去掉无效的 `cd <cwd>`；多个 cd → 逐步模拟 cd 目标是否都在工作目录内，并检查 rm 目标，否则 ask（`multi-cd`）；`cd X && …` 简单链可把有效 cwd 换成 X；cd + git → ask（`cd-git-compound`）；写 git 内部文件再运行 git → ask。
10. 每个子命令 `bashToolCheckPermission`（`#tYt`）：精确 → 前缀/通配规则 → `checkPathConstraints` → 读封锁下的 sed/env/读命令 → allow 规则 → `checkSedConstraints` → `checkPermissionMode`（acceptEdits）→ 只读自动允许（非 `parseForSecurity` 失败、无可疑 env 前缀、无可疑裸赋值）。
11. 任一子命令 deny → deny；整体路径约束 → 安全检查 `Iye`；全部 allow → allow（`subcommandResults`）。
12. 否则可调用 `getCommandSubcommandPrefix`（前缀提取器，可能调用模型）得到建议前缀，逐子命令 `checkSubcommandPermissionWithSuggestions`，按 deny>ask>passthrough>allow 合并，建议规则最多 `MAX_COLLECTED_RULES` = 5 条，目标 `localSettings`。

规则匹配（`filterRulesByContentsMatchingInput`，`#pQ`）：候选命令包括原文、去输出重定向、`stripSafeWrappers`（剥离安全 env、注释行、timeout/time/nice/stdbuf/nohup/command/builtin/noglob）后的形式；deny/ask 规则还会剥离全部前导 env 赋值与 sudo/env/strace/flock/… 包装（`unwrapCommandArgv`，`#owt`），防止 `FOO=1 rm` 或 `sudo rm` 绕过 deny。三种规则：exact、prefix（`xxx:*` 风格；prefix 不匹配复合命令，识别 `xargs <prefix>`）、wildcard。

安全环境变量白名单 `SAFE_ENV_VARS`（`#wQ`）：GOEXPERIMENT/GOOS/GOARCH/CGO_ENABLED/GO111MODULE、RUST_BACKTRACE/RUST_LOG、NODE_ENV、PYTHONUNBUFFERED 等、ANTHROPIC_API_KEY、LANG/LC_*、TERM/COLORTERM/NO_COLOR/FORCE_COLOR、TZ、颜色变量、COLUMNS/LINES、CI、DEBIAN_FRONTEND、GIT_TERMINAL_PROMPT；值像路径时不算安全（`isPathLikeEnvValue`）。

只读判定（`checkReadOnlyConstraints`，`#gpn`）：命令过长、too-complex、子 shell、后台 `&`、可疑裸赋值、未加引号变量展开、UNC 路径、cd+git、裸仓库迹象或不可信 `.git` 重定向、写 git 内部文件、沙箱下非原始目录的 git 都不算只读；每个简单命令再查重定向（只允许到 /dev/null 和 fd 复制）、/dev/tcp、env 前缀、通配、`COMMAND_ALLOWLIST`（选项级白名单，含 xargs、git 只读子命令、file、sed、sort、man、ps、grep、rg、fd、tree、date、jq、lsof、ss…）与 `READONLY_COMMANDS` 正则。Windows 上白名单去掉 xargs。

路径约束（`checkPathConstraints`，`#tQ`）：进程替换 `>(` `<(` 要求确认；输入重定向（通配或 cd 之后要确认）；每个路径受限命令（`PATH_EXTRACTORS` 覆盖 cd/ls/find/mkdir/touch/rm/rmdir/mv/cp/cat/head/tail/sort/uniq/wc/cut/paste/column/tr/file/stat/diff/awk/strings/hexdump/od/base64/nl/tac/rev/fold/expand/fmt/comm/cmp/pr/numfmt/tsort/man/grep/rg/sed/git/jq/sha*sum/md5sum/tee）按 `COMMAND_OPERATION_TYPE`（read/write/create）校验；rm/rmdir 走 `checkDangerousRemovalPaths`（可能为空的变量 + 顶层目录、反斜杠根、cd 后相对通配、无法静态解析的目标、关键系统目录、工作目录及其祖先、挂载盘根）——这些 ask 不能被 allow 规则自动放过；输出重定向（cd 复合命令中任何重定向都要确认）。

sed（`checkSedConstraints`）：只放行 `sed -n` 打印行或单个简单 `s/a/b/flags`（acceptEdits 时允许 `-i`）；`containsDangerousOperations` 拦截 w/W/e/r 命令与标志、花括号、换行、`!`、`~` 步进、非 ASCII 等。

acceptEdits（`checkPermissionMode`）：所有子命令都是 mkdir/touch/rm/rmdir/mv/cp/sed（touch 参数需为简单路径）时整体 allow。

##### 3.6 call 流程（`create()` 返回对象的 `call`）

1. `makeShellCallContext`（`#Hmt`）合成本次调用视图；`toolState.get(p_n).begin(...)` 开始记录。
2. 沙箱：`shouldUseSandbox(input, {disableUnsandboxedCommands, userTypedShellDispatch})`；Windows 策略拒绝抛 `SandboxPolicyRefusalError`；远程约束 `sandbox: "required"` 时需要严格沙箱且能完全约束，否则拒绝运行。
3. 文件监视/编辑 diff 准备（读写共享树、仓库根）。
4. `runShellCommand`（`#UAs`）：
   - 超时：`min(timeout || BASH_DEFAULT_TIMEOUT_MS, run_in_background ? 后台上限(tengu_crispy_glade) : BASH_MAX_TIMEOUT_MS, 远程 maxTimeoutMs)`；有 `shellWallCapMs` 时以它为上限；被截短时 `onNote(timeout_clamped)`。
   - 默认超时 120000 ms（`BASH_DEFAULT_TIMEOUT_MS`），最大 600000 ms（`BASH_MAX_TIMEOUT_MS`，不小于默认值），见 `chunk-4khf94hy.js#mpe`/`chunk-4khf94hy.js#gpe`。
   - 异步子代理的前台上限 `getSubagentForegroundCapMs`（GrowthBook `tengu_maple_ferry`，默认 0 不限）。
   - 显式 `run_in_background`：启动后立即登记后台任务并返回 `backgroundTaskId`。
   - 自动后台化：首个子命令不是 sleep（`isAutobackgroundingAllowed`）时，超时后转后台（`timedOutAfterMs`）。
   - 用户 Ctrl+B、回合中断（`turnAbortBackgrounds`）、为投递排队消息而转后台。
   - 2000 ms（`PROGRESS_THRESHOLD_MS`）后登记为前台任务并开始产出 `bash_progress`。
5. 结果处理：git `.git/index.lock` 遥测、退出码语义（`getCommandSemantic`）、cwd 跑出项目时重置并在 stderr 附 "Shell cwd was reset to …"、沙箱违规注释、OOM 提示、非零退出抛 `ShellError`（含输出尾部、触发规则提示）。
6. 成功后：输出持久化（超过阈值写入 tool-results 目录）、图片输出缩放（≤20MB）、`ghRateLimitHint`、后台 cwd 提示、`detectGitOperation` / `trackGitOperations`（PR 解决时 `markPrResolvedThisSession`）、`findStaleReadFileStateEntries`（命令匹配 `WRITE_COMMAND_MARKERS` 时提示先 Read 再 Edit）、`recordShellFileReadsInReadState`（cat/head/tail/sed -n 查看的文件计入 readFileState）、`bashEditDiff`。
7. 遥测：`tengu_bash_tool_command_executed` / `tengu_bash_tool_command_failed`（command_type、沙箱、破坏性类别、权限模式、executor_shell、`CLAUDE_CODE_SHELL` 是否覆盖…）、`tengu_bash_command_explicitly_backgrounded`/`tengu_bash_command_timeout_backgrounded`/`tengu_bash_command_turn_abort_backgrounded`、`tengu_bash_task_ack`、`tengu_code_indexing_tool_used`。

##### 3.7 沙箱（`shouldUseSandbox`）

强制沙箱环境（`If() && vQ()`）→ true；沙箱未启用 → false；Windows 上 bash 无可用沙箱实现 → false；`dangerouslyDisableSandbox` 只在未被强制（`disableUnsandboxedCommands`、代理 `unsandboxedCommandsDisabled`、`CLAUDE_CODE_EVAL_CONFINED`）且允许非沙箱命令（或用户手动 `!` 命令）时生效；命中 `sandbox.excludedCommands`（`containsExcludedCommand`）的命令不进沙箱。沙箱自动允许需要 `isAutoAllowBashIfSandboxedEnabled`。

##### 3.8 提示词（`prompt.ts`）

`getSimplePrompt`：工具说明、Windows Git Bash 提示、cwd 规则（`getCwdPersistenceNote`）、专用工具优先（无内嵌搜索工具时列 Glob/Grep；`FC()` 为真时只列 Read/Edit/Write——即 Glob/Grep 不可用时提示也随之变化）、# Instructions（路径引号、少用 cd、超时、后台、git、sleep、find 注意事项）、`getCommitAndPRInstructions`（Git 安全协议、提交/PR 步骤、署名）、`getMachinesSection`。`getSimpleSandboxSection` 进入系统提示（沙箱配置、何时可用 dangerouslyDisableSandbox / allowed_domains、macOS 本地端口、Windows localhost/Schannel/证书/Maven/git 注意）。

#### 4. PowerShell 工具

##### 4.1 属性一览（`chunk-v0yfsee9.js#oi`）

| 属性 | 316 值 |
|---|---|
| name | `"PowerShell"`（`chunk-bwbq4xvm.js#Ct`） |
| searchHint | `"execute Windows PowerShell commands"` |
| isEnabled | `true`；是否注册由 `utils/shell/shellToolUtils.ts · isPowerShellToolEnabled` 决定：非 Windows 需 `CLAUDE_CODE_USE_POWERSHELL_TOOL`=`true`；Windows 上显式设置优先，没有 Git Bash（`getGitBashPathCached() === null`）时启用，否则看 GrowthBook `tengu_cobalt_ridge`（默认 false） |
| strict / enablesCodeExecution / ruleContentField / backgrounding | 同 Bash |
| remoteExecution | 仅 Windows 支持（否则冻结的空配置） |
| maxResultSizeChars | 同 Bash |
| isConcurrencySafe / isReadOnly | `isReadOnlyPowerShellInput`：`hasSyncSecurityConcerns` 为假且 `isReadOnlyCommand(command)`；但同步接口不传解析结果，`isReadOnlyCommand` 在 `parsed` 为空时返回 false，所以 316 中 PowerShell 的 isReadOnly/isConcurrencySafe 实际恒为 false（旧版注释已说明此限制） |
| isSearchOrReadCommand | `classifyMcpToolForCollapse(command)`（PS 版搜索/读识别） |
| preparePermissionMatcher | 解析后对每个命令的原名与规范 cmdlet 名做大小写不敏感的前缀/通配匹配 |
| userFacingName | `"PowerShell"` |

##### 4.2 输入 / 输出

输入（`#no`→`inputSchema`）：`command`（拒绝隐藏控制字符）、`timeout`、`description`、`run_in_background`（后台禁用时去掉）、`dangerouslyDisableSandbox`、`allowed_domains`（auto 模式）、Windows 上的远程机器字段。
输出：`stdout`、`stderr`、`interrupted`、`returnCodeInterpretation`?、`isImage`?、`persistedOutputPath`?/`persistedOutputSize`?、后台相关字段（同 Bash 子集）、`gitOperation`?。

##### 4.3 validateInput / checkPermissions / call

- validateInput：远程字段不支持 → 12；含 U+FEFF / U+180E 不可见字符 → 13（`INVISIBLE_CHAR_REFUSAL`，`chunk-e6aww6q8.js#Y9n`）；沙箱策略拒绝 → 11；`checkAllowedDomainsInput`；长 `Start-Sleep N`（N≥25，条件与 Bash 相同另需 `jd()`）→ 10。
- checkPermissions：`checkPowerShellPermissions`（bashCommandClamp 时拒绝）→ `powershellToolHasPermission`；若请求 `dangerouslyDisableSandbox` 且本来会进沙箱，则额外要求 `sandboxOverride` 确认（"Run outside of the sandbox"）。
- call：与 Bash 类似；`runPowerShellCommand` 先检测 PowerShell 是否可用（不可用返回 "PowerShell is not available on this system."），`exec(command, signal, "powershell", …)`；遥测 `tengu_powershell_tool_command_executed/failed` 带 `powershell_edition`。

##### 4.4 权限流程（`powershellToolHasPermission`，`#zs`）

1. 去首尾空白（含 U+0085/U+180E），空命令允许。
2. 解析（`a0e`），精确规则 deny；前缀 deny/ask；UNC 路径 ask。
3. 解析失败 → ask（malformed syntax）。
4. `powershellCommandIsSafe`（24 个检查器，首个 ask 返回）。
5. `using` 语句、#Requires 指令、后台 `&` → ask；非文件系统提供程序路径与 UNC 参数 → ask。
6. git 相关攻击：cd + git、裸仓库迹象/不可信 .git 重定向、写 git 内部路径（HEAD/objects/refs/hooks/.git）后运行 git、xcopy/robocopy + git、解压归档后接其他命令；Windows 5.1 cwd 优先解析造成的命令遮蔽（先写 `./git.exe` 再运行 git）；写 `.git/`。
7. `checkPathConstraints`（`CMDLET_PATH_CONFIG`，含受保护路径删除 `dangerousRemovalDeny`、`cmd /c rd/del` 检查——开关 `tengu_curious_lake`，可用 `CLAUDE_CODE_DISABLE_POWERSHELL_CMD_RM_DENY` 关闭）。
8. 只读命令 allow；文件重定向 ask；acceptEdits 模式（Set/Add/Clear-Content、Remove-Item）。
9. 逐子命令 `powershellToolCheckPermission` 汇总（开关 `tengu_plumb_kestrel` 影响合并）。

安全检查器（`powershellSecurity.ts`）：Invoke-Expression、动态命令名、-EncodedCommand、嵌套 pwsh、下载执行（irm/iwr | iex）、BITS/certutil 下载、Add-Type、New-Object -ComObject / 非 CLM 类型（`tengu_prancy_lantern`）、-FilePath 执行脚本、Invoke-Item、计划任务、ForEach-Object -MemberName、Start-Process -Verb RunAs / 嵌套 PowerShell、危险脚本块、`$()`、可展开字符串、splatting、`--%`、.NET 成员调用、非 CLM 类型字面量、修改环境变量、加载模块、Set-Alias/New-Variable、WMI/CIM 起进程。

##### 4.5 提示词

`getPowerShellPrompt`（`chunk-mx04m55e.js#fWs`）：读 PowerShell 版本（desktop 5.1 / core 7+ / unknown），开关 `tengu_brass_sled` 时附"已验证的构建工具"；`getPrompt` 给出版本语法差异（&&/||、三元、??）、Unix 命令对照、退出码与 `-ErrorAction`、交互命令禁忌（以 `-NonInteractive` 运行）、here-string 规则、超时与输出截断、专用工具优先、并行/顺序调用、git 规则、Start-Sleep 规则。

#### 5. git 操作跟踪（`tools/shared/gitOperationTracking.ts`）

- `detectGitOperation(command, output)`（`chunk-s61vbvea.js#MKt`）：识别 commit（sha、committed/amended/cherry-picked、分支）、push、merge/rebase、gh pr 动作（`GH_PR_ACTIONS`、glab mr）、PR URL（GitHub/GHE/Bitbucket/GitLab/Gerrit），写入结果的 `gitOperation`（给客户端，不给模型）。
- `trackGitOperations(host, command, exitCode, output)`（`#utr`）：退出码 0 时发 `tengu_git_operation`，累加提交/PR 计数器，记录新 PR（`tengu_git_created_prs`；开关 `tengu_record_created_pr_to_ccr` 时登记到 CCR），记录推送分支以便稍后查询是否已有 PR；返回 `prResolved`。
- `countGitOpsFromCommand`（`chunk-s61vbvea.js#Dti`）：命令在别的进程执行时只做计数（`fromAnotherProcess`）。
- 注意：`isEssentialTrafficOnly()` 时不记录推送分支。

#### 6. 配置项、环境变量与特性开关

| 名称 | 作用 |
|---|---|
| `BASH_DEFAULT_TIMEOUT_MS` | 默认超时（120000） |
| `BASH_MAX_TIMEOUT_MS` | 前台最大超时（600000，不小于默认） |
| `BASH_MAX_OUTPUT_LENGTH` / settings `bashOutputMaxChars` | 输出长度上限（默认 30000，上限 150000） |
| `CLAUDE_CODE_SHELL` | 指定执行 shell（遥测 `executor_shell_overridden`） |
| `CLAUDE_CODE_BASH_SANDBOX_SHOW_INDICATOR` | 显示 "SandboxedBash" |
| `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` | 禁用后台任务（去掉 run_in_background，禁自动后台化） |
| `CLAUDE_CODE_EVAL_CONFINED` | 不允许 dangerouslyDisableSandbox / 无命令也进沙箱 |
| `CLAUDE_CODE_DISABLE_MOUNTED_DRIVE_RM_PROMPT` | 关闭"删除挂载盘根"确认 |
| `CLAUDE_CODE_USE_POWERSHELL_TOOL` | 启用/禁用 PowerShell 工具 |
| `CLAUDE_CODE_DISABLE_POWERSHELL_CMD_RM_DENY` | 关闭 `cmd /c rd/del` 受保护路径拒绝 |
| `PATHEXT` | PowerShell 可执行扩展名（命令遮蔽检测） |
| settings `permissions.blockReadsOutsideWorkingDirectories` | 读封锁：大量结构性 ask 变为拒绝 |
| settings `sandbox.excludedCommands`、`sandbox.network.allowLocalBinding`、自动允许沙箱命令开关 | 沙箱 |
| 代理 `bashCommandClamps` | 限定代理只能执行固定形式的 Bash 命令，PowerShell 一律拒绝 |
| GrowthBook `tengu_maple_ferry` | 异步子代理前台命令时长上限 |
| `tengu_crispy_glade` | 后台命令最长运行时间 |
| `tengu_cosmic_shore` / `PVt()` | 后台截止时间 |
| `tengu_woolly_toast` | 同命令仍在后台时拒绝重复启动 |
| `tengu_violin_rosin` | 后台确认遥测/消息形态（`isInputHoldOn()`，`chunk-e6aww6q8.js` 的 `plugins/functionHooks/inputHold.js`） |
| `tengu_wild_octopus` | git 命令识别时再做包装剥离 |
| `tengu_tender_thunder` | （readOnlyValidation 常量，用途未确认） |
| `tengu_quiet_larkspur`、`tengu_plain_sorrel`、`tengu_umber_plover` | 沙箱 AST 自动允许中解释器/dd 参数的宽松规则 |
| `tengu_amber_larch` | heredoc 差异时按 plainUnquotedHeredocs 重解析 |
| `tengu_cobalt_ridge` | Windows 上 PowerShell 工具默认启用 |
| `tengu_curious_lake` | PowerShell `cmd /c` 删除受保护路径拒绝 |
| `tengu_plumb_kestrel` | PowerShell 子命令结果合并 |
| `tengu_prancy_lantern` | New-Object 空冒号参数确认 |
| `tengu_hazy_peach` | PowerShell 命令名按扩展空白切分 |
| `tengu_brass_sled` | PowerShell 提示附已验证构建工具 |
| `tengu_record_created_pr_to_ccr` | 新 PR 记录到 CCR |
| `tengu_cozy_parasol` | git 安全配置加 core.alternateRefsCommand |

#### 7. 与 2.1.88 的差异（有 316 代码证据）

1. **安全检查从正则转为 AST**：旧版 `bashSecurity.ts` 有约 25 个校验器（`validateIncompleteCommands`、`validateIFSInjection`、`validateObfuscatedFlags`、`validateBraceExpansion`、`validateMidWordHash`… 以及 "Zsh equals expansion"、"$[] legacy arithmetic expansion" 等消息）。316 中这些消息字符串在全部 chunk 中都不存在；`bashSecurity.ts` 名下剩下的是结果合并/严重度函数（`chunk-e6aww6q8.js#Av`/`chunk-e6aww6q8.js#Pv`/`chunk-e6aww6q8.js#Nye`/`chunk-e6aww6q8.js#J7`）。安全分析改由 `utils/bash/ast.ts` 的 `parseForSecurityFromAst`（`chunk-r01896cg.js#w1`）/ `checkSemantics` / `parseForSecurity` 完成，权限主流程按 `too-complex` / 语义失败 / 简单命令三条路径走（`#Wze`）。
2. **两遍读法**：316 新增 `runWithRefusedReading`（`#Pze`）与 `bashCommandIsSafeAsync`（`#VVt`）的正常/refused 两遍检查、`runWithDivergentShapes`（`chunk-e6aww6q8.js#Mze`）与声明前缀多读法（`checkBashWithDeclarations`，`#XVt`），旧版没有。
3. **读封锁**：`permissions.blockReadsOutsideWorkingDirectories` 贯穿 Bash/PowerShell 路径校验（`hY(...)` 拒绝、`STRUCTURAL_MISS_KINDS` `#EYt`），旧版无。
4. **bashMissKind**：ask 理由带分类（too-complex/semantics/multi-cd/shell-operators/cd-git-compound/process-substitution/loop-later-pass/sed-dangerous/no-rule-match…），旧版无。
5. **bashCommandClamps**：代理级 Bash 命令限定（`denyForBashCommandClamp`/`denyCrashedCheckUnderCommandClamp`/`findSpanNotCoveredByRuleGroups`：`#L5s`/`#Ujr`/`#hDo`；PowerShell `#sn`/`#rn`），旧版无。
6. **Tool 新属性**：Bash/PowerShell 定义里新增 `enablesCodeExecution`、`ruleContentField`、`remoteExecution`、`backgrounding:"self"`、`persistenceThresholdCeiling`、`suppressesAllPermissionUpdates`、`notReadOnlyReason`、`sandboxNetworkLists`、`coerceInput`、`outputSchemaAcrossProcesses`、`fromAnotherProcess`、`stripForStorage`、`create()` 工厂与 `permissionCheckFailureDecision`；旧版直接在工具对象上写 `validateInput/checkPermissions/call`。
7. **maxResultSizeChars**：旧版固定 `30_000`，316 为 getter，可由 settings `bashOutputMaxChars` 覆盖。
8. **输入 schema**：旧版的内部字段 `_simulatedSedEdit`（sed 预览直接写文件）已删除，316 改为 `recordShellFileReadsInReadState` 记录只读查看；新增 `allowed_domains`（auto 模式）与远程机器字段；`command` 加控制字符校验。
9. **输出 schema**：删除 `assistantAutoBackgrounded`（旧版 15 秒 assistant 模式阻塞预算 `ASSISTANT_BLOCKING_BUDGET_MS`）；新增 `backgroundOutputPath`、`backgroundedByTurnAbort`、`backgroundedToDeliverMessage`、`timedOutAfterMs`、`subagentCapApplied`、`backgroundCwdHint`、`backgroundEndsWithFinalResponse`、`backgroundWakesOwner`、`stdoutHoldsOutputEnd`、`memoryLimitNote`、`triggeredNote`、`staleReadFileStateHint`、`ghRateLimitHint`、`gitOperation`、`bashEditDiff`。
10. **长 sleep 拦截**：旧版在 `feature('MONITOR_TOOL')` 下拦截 `sleep N`（N≥2，整数）；316 阈值 25 秒、接受小数，条件改为"后台未禁用且完成通知可用"，提示改为 Monitor until 循环（`#FAs`、`validateInput` errorCode 10）。PowerShell 同理拦截 `Start-Sleep`。
11. **新的 validateInput 错误码**：11（远程字段不支持 / PS 沙箱策略）、12（后台槽位）、13（PS 不可见字符）、14（Bash 沙箱策略）、15（同命令已在后台）。
12. **COMMON_BACKGROUND_COMMANDS**：316 增加 gh/dotnet/msbuild/nuget/bun/bunx/npx/deno/pwsh/pip/uv/poetry/gradle/mvn/nx/turbo/tsc/eslint/prettier/xcodebuild/swift/bazel/nix 等，wget 改为只在遥测表里（`#hCe`、`LOGGED_COMMAND_TYPES`）。
13. **规则匹配防绕过**：deny/ask 规则匹配剥离 sudo/doas/pkexec/env/strace/ltrace/flock/script/unshare/nsenter/ionice/taskset/chrt/watch 等包装（`#owt`、`WRAPPER_FLAGS_WITH_VALUE`），旧版只剥离 timeout/time/nice/nohup/stdbuf 与 env 赋值。
14. **危险删除**：`checkDangerousRemovalPaths` 新增空变量 + 顶层目录、Git Bash 反斜杠根、挂载盘根（`CLAUDE_CODE_DISABLE_MOUNTED_DRIVE_RM_PROMPT`）、cd 后相对通配等判定；PowerShell 新增 `cmd /c rd/del` 受保护路径检查（`#jt`）。
15. **PowerShell**：新增不可见字符拦截、沙箱外运行确认（`sandboxOverride`）、Windows 5.1 cwd 优先解析遮蔽检测、xcopy/robocopy 与归档解压 + git 检测；isEnabled 仍为 true，启用逻辑在 `isPowerShellToolEnabled`。
16. **git 跟踪**：新增 Gerrit/GitLab/Bitbucket PR URL、glab mr 动作、推送分支后的 PR 查询、CCR 记录、跨进程计数。
17. **destructiveCommandWarning**：Bash 模式表内容与旧版相同（16 条），316 每条新增 `category` 字段（`git_reset_hard`、`rm_recursive_force`、`kubectl_delete`…），供遥测 `destructive_category` 与 `destructive_target_scope` 使用（`DESTRUCTIVE_PATTERNS_2`（`chunk-e6aww6q8.js#IPo`）、`#uqt`）；旧版只有 `pattern`/`warning`。

#### 8. 未解之处

- `chunk-e6aww6q8.js#_4n`、`#Bjr`（checkPermissions 外层包装）未归属，未细读。
- `chunk-e6aww6q8.js#Iye`、`#yYt`（安全检查与 AST 危险删除）写作时在 `_unattributed/` 的 part-18x、未命名；现为 `checkInlineShellRemoval`（`tools/BashTool/inlineShellAnalysis.ts`）与 `checkDangerousRemovals`（`tools/BashTool/bashPermissions.ts`）。
- `tengu_tender_thunder`（`#B2t` 内常量）用途未在本组代码中找到使用点。
- `checkAllowedDomainsInput`、`extractLiteralRmTargets`（`chunk-e6aww6q8.js#Ajt`、`chunk-e6aww6q8.js#PYt`，validateInput 末段）写作时在未归属代码中，细节未读。
- PowerShell `isReadOnly` 恒 false 的结论基于 `kUt(command, undefined)` 早退，若 core 编排层另行传入解析结果需再核对。

### 6.2 文件组：Read、Edit、Write、Glob、Grep、NotebookEdit、LSP 与文件支撑


> 来源：dom-tools 文件组助手，2026-11-03。所有结论以 `original/` 316 代码为准，声明 id 形如 `chunk-xxx.js#压缩名`，路径写法 `模块路径 · 函数名`（名字为当前命名表结果，含本组 semantic 名）。

#### 1. 为什么 316 默认没有 Glob / Grep

**结论：316 官方构建把"内嵌搜索工具"开关编译为常量 true。只要满足下列条件，Glob 和 Grep 就会被从基础工具列表里拿掉，Bash 里的 `find` / `grep` 改由 claude 二进制内嵌的 bfs / ugrep 提供。**

调用链：

1. `tools.ts · getAllBaseTools`（`chunk-kxyd0g16.js#…`，偏移 155681 起）：
   `...[GlobTool, GrepTool].filter((n) => !Xoe().has(n.name))`；同一个过滤也作用在 V2 别名工具上：`...(ga?.() ?? []).filter((n) => !Xoe().has(n.underlyingV1ToolName))`。
2. `utils/embeddedTools.ts` · `getShadowedSearchToolNames`（`chunk-e6aww6q8.js#Xoe`，写作时在 `_unattributed/` part-034，即旧版 getRemovedSearchToolNames 一类）：
   ```js
   function Xoe() {
     if (!FC() || !jd()) return new Set();          // Glo
     // Klo = new Set([GLOB_TOOL_NAME, GREP_TOOL_NAME])，再加上 He 映射里两者对应的 V2 工具名
   }
   ```
3. `chunk-e6aww6q8.js#FC`（= 旧版 `utils/embeddedTools.ts · hasEmbeddedSearchTools`）：
   ```js
   function FC() {
     if (!isEnvTruthy("true")) return false;              // 旧版是 process.env.EMBEDDED_SEARCH_TOOLS，316 已被构建期 define 替换为字面量 "true"
     if (Uws()) return false;                              // 用户显式选择了搜索工具（searchToolsOptIn）
     return process.env.CLAUDE_CODE_ENTRYPOINT !== "local-agent";
   }
   ```
4. `chunk-g54kbxqw.js#jd`：`I() !== "windows"` 时为 true；Windows 上只有找到 Git Bash（`utils/windowsPaths.ts · getGitBashPathCached` → `findGitBashPath`，可由 `CLAUDE_CODE_GIT_BASH_PATH` 指定）才为 true。

因此在 Linux / macOS（以及装了 Git Bash 的 Windows）上默认：Glob、Grep 不注册；`utils/bash/ShellSnapshot.js · createFindGrepShellIntegration`（`chunk-e6aww6q8.js` 3053451 起）只在 `FC()` 为真时生成 shell 函数，把 `find` 包成 `argv0=bfs -S dfs -regextype findutils-default`，`grep` 包成 `argv0=ugrep -G --ignore-files --hidden -I --exclude-dir=.git …`（并拦截 `--config`、`--pager`、`-Z` 等危险参数后回落到系统命令），二者都执行 claude 自身二进制。提示词侧也随 `FC()` 改写：`constants/prompts.js`（`FC() && e.has(BASH_TOOL_NAME)`）、`tools/BashTool/prompt.js`（`FC()` 时不再劝阻在 Bash 里用 find/grep）、Explore/Plan/claude-code-guide 代理与 `tools/AgentTool/prompt.js`（"`grep` via the Bash tool"）。

**开关（如何让 Glob/Grep 回来）：**

| 方式 | 机制 | 代码位置 |
|---|---|---|
| `--tools` 或 `--allowedTools` 里点名 `Glob` 或 `Grep` | `initializeToolPermissionContext` 计算 `se(m)`（`--tools` 保留列表包含 m，或某条 allowedTools 规则的 toolName 为 m），执行 `Bws([GLOB_TOOL_NAME, GREP_TOOL_NAME].some(se))`，写入 `host.launchOptions.searchToolsOptIn`；之后 `getSearchToolsOptIn()` 为真 → `hasEmbeddedSearchTools()` 为假 | `utils/permissions/permissionSetup.js` 第 539 行；`bootstrap/state.ts` · `getSearchToolsOptIn`/`setSearchToolsOptIn`（`chunk-ndmse9kj.js#Uws`/`chunk-ndmse9kj.js#Bws`） |
| `CLAUDE_CODE_ENTRYPOINT=local-agent` | `FC()` 直接返回 false | `chunk-e6aww6q8.js#FC` |
| Windows 且未找到 Git Bash | `isBashAvailable()` 为假 → `getShadowedSearchToolNames()` 返回空集 | `chunk-g54kbxqw.js#jd` |

与 2.1.88 的差异：旧版 `hasEmbeddedSearchTools` 读环境变量 `EMBEDDED_SEARCH_TOOLS`（只在 ant-native 构建里设置），并且对 `sdk-ts`/`sdk-py`/`sdk-cli` 三种入口也返回 false；316 变成构建常量 true，只排除 `local-agent`，新增"用户点名即恢复"的 `searchToolsOptIn`，并新增 `jd()`（Windows 需 Git Bash）条件。旧版 `tools.ts` 写法是 `...(hasEmbeddedSearchTools() ? [] : [GlobTool, GrepTool])`。

LSP 工具同理：旧版 `...(isEnvTruthy(process.env.ENABLE_LSP_TOOL) ? [LSPTool] : [])`，316 是 `...(Dqe() ? [LSPTool] : [])`，`Dqe()` 为 `isEnvTruthy("true")`（`hooks/notifs/useLspInitializationNotification.js · Dqe`），即总是注册；是否可用由 `LSPTool.isEnabled() = hasEverConnected()` 决定，且 `shouldDefer: true`。

#### 2. 工具属性总表

`buildTool`（`chunk-g54kbxqw.js#on`）把定义与 `Tool.ts · TOOL_DEFAULTS` 合并：默认 `isEnabled → true`、`isConcurrencySafe → false`、`isReadOnly → false`、`isDestructive → false`、`toAutoClassifierInput → ""`、`userFacingName → name`、`remoteExecution` 为默认冻结对象。316 的工具定义多了一个 `create(toolContext)` 工厂，`validateInput`/`checkPermissions`/`call` 由它返回（每次调用经 `on` 包一层：远程会话转发、`nae` 拦截、未实现 `checkPermissions` 时默认 allow）。

| 工具 | name | searchHint | maxResultSizeChars | strict | isConcurrencySafe / isReadOnly | shouldDefer | isEnabled | 其他 |
|---|---|---|---|---|---|---|---|---|
| Read | `Read` | read files, images, PDFs, notebooks | Infinity | 是 | 是 / 是 | 否 | 默认 | backgrounding never；remoteExecution 支持，决定字段 file_path/offset/limit/pages/allow_large；ruleContentField file_path；coerceInput；outputSchemaAcrossProcesses、stripForStorage、stripForCreation、restoreTransientForRemap |
| Edit | `Edit` | modify file contents in place | 100000 | 是 | 否 / 否 | 否 | 默认 | 决定字段 file_path/old_string/new_string/replace_all；inputsEquivalent；permissionCheckFailureDecision；coerceInput |
| Write | `Write` | create or overwrite files | 100000 | 是 | 否 / 否 | 否 | 默认 | 决定字段 file_path/content；coerceInput 受 `tengu_noble_mountain`（默认 true）控制；inputsEquivalent 忽略末尾换行与记忆目录清洗差异 |
| Glob | `Glob` | find files by name pattern or wildcard | 100000 | 否 | 是 / 是 | 否 | 默认（但见第 1 节，默认不注册） | userFacingName "Search"；ruleContentField path；isSearchOrReadCommand {isSearch} |
| Grep | `Grep` | search file contents with regex (ripgrep) | 20000 | 是 | 是 / 是 | 否 | 默认（默认不注册） | userFacingName "Search"；ruleContentField path |
| NotebookEdit | `NotebookEdit` | edit Jupyter notebook cells (.ipynb) | 100000 | 否 | 否 / 否 | **是** | 默认 | userFacingName "Edit Notebook"；ruleContentField notebook_path；无 remoteExecution 声明 |
| LSP | `LSP` | code intelligence (definitions, references, symbols, hover) | 100000 | 否 | 是 / 是 | **是** | `hasEverConnected()` | isLsp；ruleContentField filePath |

所有带路径的工具都实现 `getPath`、`preparePermissionMatcher`（Read/Edit/Write/NotebookEdit 用路径匹配器 `matchesPathRule`（`chunk-82kqcve8.js#Gst`），Glob/Grep 用通配符匹配 pattern）、`backfillObservableInput`（把 `file_path` 展开为绝对路径，远程原生工具除外）、`toAutoClassifierInput`（自动模式分类器输入）、`suppressesAllPermissionUpdates`（带 `_host` 字段时不产生权限更新）。

#### 3. Read（`tools/FileReadTool/*`）

**输入 schema**（`chunk-e6aww6q8.js#wCr` fileReadInputSchema）：`file_path`（绝对路径）、`offset`（非负整数，可选）、`limit`（正整数，可选）、`pages`（字符串，空串视为未给；PDF 专用，每次最多 `MAX_PDF_PAGES_PER_READ` = 20 页）、`allow_large`（布尔，可选）、以及在多机会话下的 `_host`（`p3()`）。

**输出**（判别联合，`makeFileReadOutputSchema`）：`text`（filePath/content/numLines/startLine/totalLines/truncatedByTokenCap + 可选 artifactRead）、`image`（base64/type/originalSize/dimensions）、`notebook`（cells）、`pdf`（base64）、`parts`（PDF 页图：count/outputDir/firstPage/totalPages/pages）、`file_unchanged`（去重命中，source 可为 "seeded"）。

**validateInput**（`FileReadTool` 的 `validateInput`）顺序：`_host` 不可转发时报错（14）→ 空字节（`Mv`，2）→ 路径不稳定（`DL`）→ pages 合法性与预算（`validatePdfPagesParam`：只接受 "3"、"1-5"、"5-"；上下文压缩过一次后每消息/每轮的 PDF 页预算，错误码 17/18；超过 20 页为 8）→ 命中 Read deny 规则（1，带 denyRule）→ UNC 路径直接放行 → 二进制扩展名（4，除非有对应读取器）→ 设备/进程文件（`getDevicePathRefusal`，9）→ 远程调用的 PDF 传输预算（16）。

**checkPermissions**：在 `writePermissionStash` 记下本次读路径的所有拼写；macOS 上额外记录文件身份与截图备用路径身份；最后 `utils/permissions/filesystem · checkReadPermissionForTool`。

**call**（`readFileToolCall` → `callInnerWithFileHandle` → `callInner`）：

1. 设备守卫再查一次（`getDevicePathRefusal`），取已校验的文件身份。
2. 读取上限：`getDefaultFileReadingLimits()` = `{maxSizeBytes: 256KB, maxTokens: CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS || 25000}`，可被调用方 `fileReadingLimits` 覆盖（记 `tengu_file_read_limits_override`）；`allow_large: true` 时 `computeAllowLargeRoom` 按本轮剩余上下文（`(阈值 − 用量) × 0.7`）放宽 maxTokens 与 maxSizeBytes（字节 = token × bytesPerToken × 3）。
3. **去重**：`readFileState` 里有同一 offset/limit 的完整读记录且 mtime 未变 → 返回 `file_unchanged`（tool_result 文案 "Wasted call — file unchanged since your last Read…"）；启动预置的 CLAUDE.md 等（`seededFromContext`）全文读取也会命中，返回 system-reminder。GrowthBook `tengu_read_dedup_killswitch`、远程调用或 `dedupUnchangedReads === false` 时关闭。
4. 非 `CLAUDE_CODE_SIMPLE` 的本地调用触发动态技能目录发现（`pK`），并把路径加入嵌套记忆附件触发列表。
5. 按类型分派（`callInner`）：
   - `.ipynb`：`utils/notebook · readNotebook`，JSON 超过 maxSizeBytes 报错，token 校验后写 readFileState。
   - 图片（扩展名 png/jpg/jpeg/gif/webp，或无扩展名且末尾 16 字节魔数是图片）：`readImageWithTokenBudget`——校验魔数（扩展名是图片但内容不是时提示"多半是下载到了错误页"），按模型图片限制缩放（`utils/imageResizer · maybeResizeAndDownsampleImageBuffer`），超字节再压缩，估算 token 超限则压到 token 上限，最后兜底 400×400 JPEG q20；有尺寸信息时附一条 meta 用户消息说明坐标换算。
   - PDF：给了 pages → `utils/pdf · extractPDFPages`（pdftoppm 渲染为 JPEG，再逐页缩放，返回 `parts`）；未给 pages → 先 `pdfinfo` 取页数：超过 10 页时，`tengu_misty_sunbeam` 开启则自动读前 min(10, 每次上限) 页并告知总页数，否则报错要求 pages；页数未知且文件大于 `tengu_immutable_tide` 阈值、pdftoppm 可用时也要求 pages；模型不支持整份 PDF（`isNotClaude3Model`）时报错；否则 `readPDF` 整份 base64 作为 document 块。
   - 文本：`utils/readFileInRange · readFileInRange`。不带 limit 时按总大小 maxSizeBytes 拦截（`FileTooLargeError`）；带 limit 时不看总大小，只限制选区字节 `max(maxTokens × 128, 放宽字节)`（`SelectedRangeTooLargeError`）。随后 `validateContentTokens`：粗估 ≤ 上限/4 直接过，字符数 > 上限×128 直接判超，否则调 token 计数 API。**整文件读取（offset ≤ 1、无 limit、无 pages）超限时不再报错，而是自动截成第一页**：按 token/字符比例估行数并最多 6 轮缩减，正文前加 `[Truncated: PARTIAL view — <path>: showing lines 1-N of M total … Call Read with offset=N+1 limit=N for the next page, or Grep …]`，结果带 `truncatedByTokenCap: true`，readFileState 标 `isPartialView`。超长单行文件按字符截断。
6. 写 `readFileState`（content、timestamp=floor(mtime)、offset、limit），记 `tengu_session_file_read`、`logFileOperation`；文件是 artifact 保存源时附覆盖说明；记忆文件加新鲜度前缀。
7. ENOENT：先试 macOS 截图文件名的另一种空格（普通空格 ↔ U+202F）；仍不存在时报 "File does not exist. Note: your current working directory is …"，并给出 `findSimilarFile`（同名不同扩展名）或 `normalizePathForComparison`（路径落在 cwd 父目录时映射到 cwd）建议。

**tool_result 映射**：text 加行号（`addLineNumbers`；`tengu_tab_read_sep` 开启且内容有行首制表符时分隔符用 `:`）；空文件/offset 越界给 system-reminder 警告；image → image 块；pdf → 文本 + document 块；parts → 文本 + 每页 image 块（失败页给文字说明）；notebook → 单元内容块。

**提示词**（`tools/FileReadTool/prompt · renderPromptTemplate`）：lean 模式（`gD`：`leanPrompt ?? g3(model)`）给短版；完整版说明绝对路径、默认读 2000 行、图片/PDF/notebook、目录不可读、截图路径；结尾"不要读回刚编辑的文件"。

**与 2.1.88 的差异**（均有 316 代码证据）：
- 新增 `allow_large` 参数与按剩余上下文放宽上限（`#FCr`、`#oAe`、`#Wvn`）。
- 整文件读取 token 超限改为自动分页而非抛错（`#rEn` 的 catch 分支；旧版 `validateContentTokens` 直接 throw）。
- 新增 `parts` 输出与 PDF 页预算（每消息/每轮，错误码 17/18，`#IZe`），远程调用的 PDF/图片传输预算（`Tlo`：session/relay 512KB 图片、2.5MB 整份 PDF、每次 6 页；其他 300KB、禁止整份、每次 3 页）。
- 去重文案改为 "Wasted call …"，并新增启动预置文件的去重（`source: "seeded"`）。
- 设备文件黑名单扩展：其他进程的 `/proc/<pid>/fd/N`、`/proc/<pid>/(environ|cmdline|mem|maps|…)`、`/dev/pts`、通过 fd/cwd 目录穿越等（`#Sn`），旧版只有固定集合。
- 跨进程/远程执行字段：`remoteExecution`、`outputSchemaAcrossProcesses`、`fromAnotherProcess`、`stripForStorage`（存储时清空正文/base64）。
- 读取 Bash 后台任务输出文件时（`<taskdir>/<id>.output`）会经 `consumeClaudeCodeHints`（`chunk-e6aww6q8.js#HWt`；待核实：当前名与此处描述不符）处理并显示 "Read agent output"。
- 旧版 `MITIGATION_EXEMPT_MODELS`/网络安全提醒在 316 Read 结果中未见；被匹配成该名的 `chunk-aepeg2w5.js#c$` 实为模型排序比较（见 notes）。

#### 4. Edit（`tools/FileEditTool/*`）

**输入**（`#ISe`）：`file_path`、`old_string`、`new_string`（必须不同）、`replace_all`（默认 false）、可选 `_host`。
**输出**：filePath、oldString（实际匹配到的文本）、newString、originalFile、structuredPatch、userModified、replaceAll、gitDiff（可选）、staged、stagedWording；结果可附 staleRecovered、contentNotInModelContext、syncedSkillNext。

**validateInput**（错误码）：`_host` 未转发（14）、空字节、不稳定路径、"像用户电脑上的路径"（`eK`，云端 Linux 会话且 `tengu_hazy_cosmos`，22）、工作树/目录隔离（`DB`，12）、团队记忆/记忆目录内容检查（`ent`、`ESt`，0）、old==new（1）、Edit deny 规则（2）、Read deny 规则（13）、文件超过 1 GiB（10）、Perforce 只读（11，文案要求 `p4 edit`）、文件不存在（old_string 为空视为新建，否则 4）、新建但文件非空（3）、`.ipynb` 改用 NotebookEdit（5）、**未读或只读了部分（6，"File has not been read yet"）**、读后被修改（7）、非文本编码（15）、找不到 old_string（8）、多处匹配且未 replace_all（9）、settings 文件校验。

先读要求的细节：对 `jkn(model)` 列出的旧模型（claude-opus-4-6、haiku-4-5、opus-4-5/4-1/4-0、sonnet-4-5/4-0、3.x）严格要求先读；更新的模型若该路径的 Read 会被自动允许（`wwe`：没有限制 Read 的工具白名单，且权限层判定 allow），可以不先读（远程调用时再比对 `readBaseline`）。记 `tengu_edit_tool_not_read_hypothetical`。修改检测：readFileState 被标 `refreshedBehindModel`，或磁盘 mtime 新于记录且（不是完整读或内容哈希不同）时，尝试"stale 恢复"（编辑仍能唯一应用且读会被自动允许则放行，结果附提示），否则报 7。

**checkPermissions**：暂存路径拼写 → `checkWritePermissionForTool` → 叶子是符号链接时追加询问（`Ewe`）→ 对 new_string 做记忆目录清洗，变化时返回 `updatedInput`。

**call**（`editFileToolCall`）：Read deny 二次检查；不可写目标报错；远程/跨机输入做 `normalizeFileEditInput`（反净化 `<fnr>` 等 API 净化标签）；本地非 SIMPLE 触发技能目录；`beforeFileEdited` 钩子；`checkSettingsWrite`（`chunk-6zvepy0r.js#yVr`）判断是否需暂存给机主审阅；**未暂存时 `fileHistoryTrackEdit` 记录检查点**；在 `sV` 文件锁内：打开写句柄、`readFileForEdit` 读内容/编码/行尾、`OTs` 再查 stale、`findActualString` 定位（原样 → 弯引号归一 → `\uXXXX` 解码 → 文件中的转义形式）、`preserveQuoteStyle` 与 `preserveEscapeStyle` 让 new_string 跟随文件风格、记忆目录 lint、`getPatchForEdit` 生成 patch、团队共享条目处理，然后 `recheckBeforeWrite` + `Gut` 原子写（保留编码与 CRLF），更新 readFileState（timestamp=写后 mtime，可能标 contentNotInModelContext）；暂存时改为 `stageSettingsWrite`（`chunk-6zvepy0r.js#_Vr`）写暂存区并返回 `staged: true`。之后通知 LSP（changeFile/saveFile）、记 `tengu_write_claudemd`（CLAUDE.md）、`tengu_file_changed`、`tengu_edit_string_lengths`，可选 `fetchSingleFileGitDiff`。

**tool_result**：`The file X has been updated successfully.` + 用户修改说明 + "(file state is current in your context — no need to Read it back)" 或 stale 提示 + 技能同步提示。

**与 2.1.88 的差异**：新增 `\uXXXX` 转义匹配与风格保持（`#F`、`#N`、`#x7n`）；暂存审阅（staged）；Perforce 只读拒绝；用户电脑路径拒绝；Read deny 规则也阻止编辑（13）；按模型放宽先读要求；stale 自动恢复；`FILE_UNEXPECTEDLY_MODIFIED_ERROR` 文案改为提示 linter/formatter；提示词的行号前缀从"空格+行号+箭头/tab"改为"tab 或 `:`"，最小 anchor 提示从 `USER_TYPE=ant` 改为 GrowthBook `tengu_edit_minimalanchor_jrn`。

#### 5. Write（`tools/FileWriteTool/*`）

**输入**：`file_path`、`content`、可选 `_host`。**输出**：type（create/update）、filePath、content、structuredPatch、originalFile（新建或旧内容过大时为 null）、gitDiff、userModified、staged、stagedWording；跨进程版附 memdirStamped。

**validateInput**：同 Edit 的前置检查；**子代理写 `/^(REPORT|SUMMARY|FINDINGS|ANALYSIS).*\.`…（REPORT/SUMMARY/FINDINGS/ANALYSIS 开头的 .md） 被拒（5，记 `tengu_subagent_md_report_blocked`）**；deny（1）/Read deny（13）；目标是目录（17）或非普通文件（18）；Perforce 只读（6）；文件不存在直接放行；**只读过文件开头（`readFileState.holdsOnlyStartOf`）时拒绝整体覆盖（19）**；未读（2）/读后被修改（3）规则同 Edit。

**call**（`callFileWrite`，`chunk-e6aww6q8.js#jKo`）：与 Edit 类似（fileHistory、锁内 `assertWriteReadStateFresh` 再查、原子写、LSP、暂存）。tool_result：`File created successfully at: …` 或 `The file … has been updated successfully.`。

**与 2.1.88 的差异**：新增子代理报告文件拦截、只读开头拦截、目录/特殊文件拦截、暂存审阅、coerceInput。

#### 6. Glob（`tools/GlobTool/*`、`utils/glob.ts`）

**输入**：`pattern`、可选 `path`（不要写 "undefined"/"null"）、可选 `_host`。**输出**：durationMs、numFiles、filenames、truncated、totalMatches（可选）、countIsComplete（可选）。

**行为**：`getPath` 对绝对路径模式取静态前缀目录（`resolveAbsoluteGlobPattern`）；显式 path 不存在/不是目录时报错（`assertGlobDirectoryExists`）；`globFiles` 去掉模式中与搜索目录重复的前缀，再 `glob`：`rg --files --null --glob <pattern> --sort=modified --no-ignore --hidden`（`CLAUDE_CODE_GLOB_NO_IGNORE`、`CLAUDE_CODE_GLOB_HIDDEN` 设为假值可关闭后两项）+ Read deny 对应的 `--iglob` 排除 + 排除目录 `--glob !…`；结果按 Read deny 规则逐个过滤后分页，上限 `globLimits.maxResults ?? 100`。截断时 tool_result 末尾附 `formatGlobTruncationNote`（三种文案）。

**与 2.1.88 的差异**：新增 totalMatches/countIsComplete；`--sort=modified` 由 rg 完成；新增按 deny 规则过滤与重复前缀处理。

#### 7. Grep（`tools/GrepTool/*`）

**输入**（`#eVo`）：`pattern`、`path`、`glob`、`output_mode`（content | files_with_matches | count，默认 files_with_matches）、`-B`、`-A`、`-C`、`context`、`-n`（默认 true）、`-i`、**`-o`（316 新增，--only-matching）**、`type`、`head_limit`（默认 250，0 为不限）、`offset`、`multiline`。
**输出**：mode、numFiles、filenames、content、numLines、numMatches、totalFiles、totalLines、appliedLimit、appliedOffset。

**行为**（执行体 `runGrep`，`chunk-e6aww6q8.js#bVo`，写作时在 `_unattributed`，现在 `tools/GrepTool/GrepTool.ts`）：参数 `--hidden`、排除 VCS 目录（.git/.svn/.hg/.bzr/.jj/.sl）、`--max-columns 500`、multiline 用 `-U --multiline-dotall`、files 模式 `-l`、count 模式 `-c -H`、content 模式 `--json -n`；以 `-` 开头的 pattern 用 `-e`；glob 按空白与逗号拆分（保留 `{}`）；Read deny 对应 `--iglob`；任务输出文件单独处理（经 stdin 或 fd 传给 rg）。`validateInput` 额外要求 head_limit/offset 为非负整数（316 新增）。

#### 8. NotebookEdit（`tools/NotebookEditTool/*`）

**输入**：`notebook_path`、`cell_id`（可选；也接受 `cell-N` 数字下标）、`new_source`、`cell_type`（code/markdown，insert 时必填）、`edit_mode`（replace/insert/delete，默认 replace）。**输出**：new_source、old_source（316 新增，供单元级 diff）、cell_id、cell_type、language、edit_mode、error、notebook_path、original_file、updated_file。

**行为**：必须先 Read 过（9）且 mtime 未变（10）；文件上限 100MB（`SW`）；JSON 与 notebook 结构校验（6）；replace 指向末尾之后自动转 insert；nbformat ≥ 4.5 时新单元 id 取 `randomUUID().slice(0,8)`；code 单元替换后清空 execution_count 与 outputs；写后若结果超过上限则拒绝；`fileHistoryTrackEdit` 记检查点；用 `notebookToReadCells` 判断模型上下文是否仍与磁盘一致。

#### 9. LSP（`tools/LSPTool/*`）

**输入**：`operation`（goToDefinition、findReferences、hover、documentSymbol、workspaceSymbol、goToImplementation、prepareCallHierarchy、incomingCalls、outgoingCalls）、`filePath`、`line`、`character`（1 基）、`query`（316 新增，workspaceSymbol 用）。**输出**：operation、result、filePath、resultCount、fileCount。

**行为**：validateInput 用严格判别 schema 校验，文件需存在且是普通文件；call 等待 LSP 初始化，文件未打开则读入（超过 10MB 拒绝）后 `openFile`；`sendRequest`；incoming/outgoingCalls 先 prepare 再请求；定义/引用/实现/工作区符号结果用 `git check-ignore` 过滤；插件提供的 LSP 记 `tengu_plugin_lsp_request`。

#### 10. 支撑模块

##### 10.1 文件状态缓存（readFileState）
真正的缓存类是 `chunk-82kqcve8.js#$a`（写作时在 `_unattributed/` part-009，旧版 `FileStateCache`；现名 `RemoteFileState`，在 `utils/remoteFileState.ts`，待核实：现名与"缓存类"的描述不一致）：LRU（条目上限 + 总字节上限，默认 25MB），键为规范化路径；每条记录 content（超过 4KB 且不 keepContent 时只存哈希，`Bun.hash`）、timestamp、offset、limit、isPartialView、contentNotInModelContext、seededFromContext、readBaseline；`markStartOnly`/`holdsOnlyStartOf` 记录"只读过开头"；`everHeldPaths`。辅助：`mx`（是否完整读）、`Gie`（完整且在模型上下文中）、`y1`/`matchesReadContent`（`chunk-82kqcve8.js#_At`，内容比较，支持哈希与 readBaseline）。`utils/fileStateCache.ts` 中只有 `cloneFileStateCache`（子代理复制）、`mergeFileStateCaches`、`clearFileStateCacheKeepingSeeds`。

##### 10.2 fileHistory（检查点 / rewind）
- 开关 `fileHistoryEnabled`：云端/diskless 关闭；非交互需 `CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING`；交互看设置 `fileCheckpointingEnabled`（默认 true），`CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING` 关闭。
- 编辑前 `fileHistoryTrackEdit`：首次见到的文件创建 v1 备份（`~/.claude/file-history/<session>/<路径哈希16位>@v<n>`，新文件为 null）。
- 每条用户消息 `fileHistoryMakeSnapshot`：对已跟踪文件生成新版本（未变复用），快照上限 100（淘汰时删除无引用备份）。
- 状态更新统一走归约器 `applyFileHistoryOp`（track/snapshot/touch）。
- 回退 `fileHistoryRewind` → `applySnapshot` → `restoreBackup`（拒绝符号链接/硬链接目标、`tengu_lucky_finch` 时核对父目录身份）。
- resume 时 `copyFileHistoryForResume` 用硬链接/复制迁移备份（并发 16，rename 重试 100/200/400/800ms）。

##### 10.3 ripgrep（`utils/ripgrep.ts`）
`getRipgrepConfig`：`USE_BUILTIN_RIPGREP` 设为假值时优先系统 rg；Bun 单文件可执行时用自身（`argv0=rg`）；否则系统 rg。`ripGrep`：首用自检（`testRipgrepOnFirstUse`）、超时默认 20s（WSL 60s，`CLAUDE_CODE_GLOB_TIMEOUT_SECONDS` 覆盖）、输出收集上限 20MB、EAGAIN 等资源错误以 `-j 1` 重试、macOS 搜索 `~/Library/{Containers,Group Containers,Mobile Documents}` 时追加排除以免触发授权弹窗、spawn 错误净化（去掉路径）。

##### 10.4 其他
- `utils/readFileInRange.ts`：小文件整读快速路径、大文件流式；处理 BOM、UTF-16LE、CRLF；返回 notText（非 UTF-8/含 NUL/UTF-16BE）。
- `utils/imageResizer.ts`：错误类型编号表（`ERROR_TYPE_*`）、CMYK JPEG/动画 WebP 的说明、`compressImageBufferWithTokenLimit`（token/0.125×0.75 换算字节）。
- `utils/pdf.ts`：`readPDF`（上限 100MB）、`extractPDFPages`（pdftoppm）、pdftoppm stderr 分类。
- `utils/file.ts`：`writeFileAtomic`（临时文件 + fsync + rename，默认拒绝写穿符号链接）、`getDisplayPath`、`addLineNumbers`、`findSimilarFile`。
- `utils/fileOperationAnalytics.ts`：`logFileOperation` 只上报路径/内容哈希。
- `utils/codeIndexing.ts`：识别 sourcegraph/cody/aider 等代码索引工具（命令或 MCP 服务器名）。

#### 11. 配置项与环境变量（本组）

| 名称 | 类型 | 作用 |
|---|---|---|
| `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS` | env | Read token 上限（默认 25000） |
| `CLAUDE_CODE_GLOB_NO_IGNORE` / `CLAUDE_CODE_GLOB_HIDDEN` | env | Glob 是否 `--no-ignore` / `--hidden`（默认都开） |
| `CLAUDE_CODE_GLOB_TIMEOUT_SECONDS` | env | ripgrep 超时 |
| `USE_BUILTIN_RIPGREP` | env | 设为假值时优先系统 rg |
| `CLAUDE_CODE_ENTRYPOINT=local-agent` | env | 关闭内嵌搜索（恢复 Glob/Grep） |
| `CLAUDE_CODE_GIT_BASH_PATH` | env | Windows 的 Git Bash 路径（影响 `jd()`） |
| `CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING` / `CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING` | env | 文件检查点 |
| `CLAUDE_CODE_SIMPLE` | env | Read/Edit 不触发动态技能目录 |
| `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` | env | 影响 lean 提示词判定 |
| `CLAUDE_CODE_REMOTE_SESSION_ID`、`CLAUDE_CODE_ENVIRONMENT_KIND` | env | 文件持久化开关 |
| `fileCheckpointingEnabled` | settings | 文件检查点（默认 true） |
| `tengu_read_dedup_killswitch` | GrowthBook | 关闭 Read 去重 |
| `tengu_tab_read_sep` | GrowthBook | 行号分隔符可用 `:` |
| `tengu_misty_sunbeam` | GrowthBook | 超过 10 页的 PDF 自动读前几页 |
| `tengu_immutable_tide` | GrowthBook（数值） | 页数未知 PDF 要求 pages 的大小阈值 |
| `tengu_edit_minimalanchor_jrn` | GrowthBook | Edit 提示要求 old_string 尽量短 |
| `tengu_noble_mountain` | GrowthBook | Write coerceInput |
| `tengu_hazy_cosmos` | GrowthBook | 拒绝"用户电脑路径"（默认开） |
| `tengu_lucky_finch` | GrowthBook | rewind 恢复前核对父目录身份 |

#### 12. 未解之处

- `chunk-e6aww6q8.js#bVo`（Grep 真正的执行体）、`#M6r`（打开搜索根）、`chunk-82kqcve8.js#$a`（FileStateCache 类）、`chunk-e6aww6q8.js#Xoe`/`chunk-e6aww6q8.js#FC`（内嵌搜索开关）写作时都在 `_unattributed`、本组未命名；现为 `runGrep`、`resolveRipgrepTarget`、`RemoteFileState`、`getShadowedSearchToolNames`/`hasEmbeddedSearchTools`（待核实：`chunk-82kqcve8.js#$a` 现名 RemoteFileState，与"FileStateCache 类"的描述不一致）。
- 图片原始字节读取上限 `MAX_IMAGE_READ_BYTES` 的值未追到定义。
- `jd()` 在 Windows 的真实语义（Git Bash 可用）推断自 `mre → findGitBashPath`，未在 Windows 上实测。

### 6.3 代理组：Agent、SendMessage、Task*、TodoWrite、任务存储


> 由 dom-tools 的 agent 组分组助手撰写，供合并进 `docs/handbook/tools.md`。所有结论以 `original/` 316 代码为准，声明 id 形如 `chunk-xxx.js#压缩名`，函数名为本组 semantic 命名（`naming/semantic-tools.jsonl` 合并后生效）。多代理运行时（LocalAgentTask、队友循环、邮箱、协调者模式）属于 agents 领域，这里只讲工具视角。

#### 0. 本组工具一览

| 工具（name） | 定义声明 | 归属模块 | 注册 | shouldDefer | isEnabled | isConcurrencySafe | isReadOnly | maxResultSizeChars | searchHint | 其他 |
|---|---|---|---|---|---|---|---|---|---|---|
| `Agent`（别名 `Task`） | `chunk-0tkmvwy0.js#won` | `tools/AgentTool/agentToolDefinition.ts`（写作时在 `_unattributed/` 的 `chunk-0tkmvwy0` part-005） | `getAllBaseTools` 首项，常驻 | 否（直接给模型） | 默认 true | true | true | 100000 | delegate work to a subagent | `backgrounding:"self"`；`coerceInput`；`preserveToolUseResultInSubagents` 受 `tengu_velvety_sprout`；`restoreTransientForRemap` |
| `SendMessage` | `chunk-astf3mhy.js#Ls` | `tools/SendMessageTool/SendMessageTool.ts` | `getAllBaseTools` 里 `Ft()` 懒加载，常驻 | 是 | 未定义 → true（2.1.88 为 `isAgentSwarmsEnabled()`） | 默认 false | `typeof message === "string"` | 100000 | send messages to agent teammates | `backgrounding:"never"`；`coerceInput`；`backfillObservableInput`；子代理是否保留见 4.1 |
| `TaskCreate` | `chunk-kxyd0g16.js#Ui`(Br) | `tools/TaskCreateTool/TaskCreateTool.ts` | `isTaskToolsEnabled()` 时加入池 | 是 | `Wue()` = 任务工具启用 且 todo 类工具可用 | **false**（88 为 true） | 默认 false | 100000 | create a task in the task list | `coerceInput`、`validationErrorSteer` |
| `TaskGet` | `chunk-kxyd0g16.js#qi`(Ur) | `tools/TaskGetTool/TaskGetTool.ts` | 同上 | 是 | `Wue()` | true | true | 100000 | retrieve a task by ID | |
| `TaskList` | `chunk-kxyd0g16.js#Xi`(Yr) | `tools/TaskListTool/TaskListTool.ts` | 同上 | 是 | `Wue()` | true | true | 100000 | list all tasks | |
| `TaskUpdate` | `chunk-kxyd0g16.js#Ki`(Gr) | `tools/TaskUpdateTool/TaskUpdateTool.ts` | 同上 | 是 | `Wue()` | true | 默认 false | 100000 | update a task | `coerceInput` |
| `TaskStop`（别名 `KillShell`/`KillBash`） | `chunk-kxyd0g16.js#co`(He) | `tools/TaskStopTool/TaskStopTool.ts` | 常驻 | 是 | 默认 true | true | 默认 false | 100000 | kill a running background task | `remoteExecution.supported = tengu_violin_varnish` |
| `TodoWrite` | `chunk-kxyd0g16.js#Es`(Io) | `tools/TodoWriteTool/TodoWriteTool.ts` | 常驻 | 是 | `!isTaskToolsEnabled() && t6()` | 默认 false | 默认 false | 100000 | manage the session task checklist | `strict:true`；`userFacingName` 为空串 |

不存在于 316 的旧工具：`TeamCreate`、`TeamDelete`、`TaskOutput`（以及 `AgentOutputTool`/`BashOutputTool`/`AgentOutput`/`BashOutput`）都列在已退役名单 `chunk-e6aww6q8.js#_0e`（`new Set(["Frame","FrameRead","TeamCreate","TeamDelete","SuggestBackgroundPR","AutofixPr","TaskOutput",…])`），历史转录里出现这些名字时不报"无此工具"。TaskOutput 的继任者是 `GetTask`（`chunk-kxyd0g16.js#ir`，"check on a background shell command by task ID"），但其 `isEnabled()` 恒为 `false`，不在本组模块里。

##### 0.1 TodoWrite 与 Task* 二选一、以及"todo 类工具"开关

- `utils/tasks.ts · isTaskToolsEnabled`（`chunk-nw7jbebs.js#QM`，旧版名 isTodoV2Enabled）：`CLAUDE_CODE_ENABLE_TASKS !== false` 即为真。`tools.ts · getAllBaseTools` 中 `...(isTaskToolsEnabled() ? [TaskCreate, TaskGet, TaskUpdate, TaskList] : [])`；TodoWrite 的 `isEnabled` 是 `!isTaskToolsEnabled() && t6()`。所以默认走 Task*，`CLAUDE_CODE_ENABLE_TASKS`=`false` 才回到 TodoWrite。
- **316 新增的模型门** `chunk-e6aww6q8.js#t6`：
  ```js
  function t6(){ if(Cc()||jws()) return !0;            // 后台会话(bg)/bgTakeover，或 --tools 显式列出 todo/task 工具
    let e=V3t();                                        // 主循环模型的规范名
    if(e===void 0||tAr(e)||eAr(e)) return !0;          // 未知模型、application-inference-profile、旧模型集合 ZCr
    return i.CLAUDE_CODE_ENABLE_TODO_TOOLS===!0 }
  function Wue(){ return QM() && t6() }                 // Task* 的 isEnabled
  ```
  `TODO_TOOL_LEGACY_MODELS`（`chunk-e6aww6q8.js#ZCr`）= claude-3*/3-5*/3-7、opus-4-0…4-7、sonnet-4-0…4-6、haiku-4-5。也就是说，**在更新的模型（如 opus-5/sonnet-5/fable）上，TodoWrite 和 Task* 默认都不可用**，除非：后台会话、`--tools`（或 allowed tools 列表）显式包含 `c1r=[TodoWrite, TaskCreate, TaskGet, TaskUpdate, TaskList]` 中任一项（`utils/permissions/permissionSetup.ts · initializeToolPermissionContext`（`chunk-zfbhezv9.js#AIo`） 调 `Wws(c1r.some(...))` 设置 `todoToolsOptIn`），或 `CLAUDE_CODE_ENABLE_TODO_TOOLS`=`1`。这是 316 实测工具数比 88 少的原因之一（给 lead：直接/延迟工具计数时应考虑主模型）。

#### 1. Agent 工具

##### 1.1 定义与调用链

```
tools.ts · getAllBaseTools → AgentTool(won)
  └ create(deps).call(input, ctx) → ctx.runEngine(callAgentTool, {agentInput, assistantMessage, onProgress, timing})
       callAgentTool (chunk-0tkmvwy0.js#Xo, tools/AgentTool/AgentTool.tsx)
        ├ 前置检查：assertAgentCwdAllowed(cwd)、深度上限、停止中、容器重启恢复(ResumedAgentCallRegistry)、队友限制、deny 规则
        ├ 队友分支（name 且有 teamContext）→ wxo(agent.spawn 钩子) → spawnMultiAgent.handleSpawn → {status:"teammate_spawned"}
        ├ 选代理：fork(FORK_AGENT) | mbe(可提供代理) 中精确/规范化匹配 | 缺省 general-purpose
        ├ decideAgentLaunchMode → {effectiveIsolation, isRemoteLaunch, shouldRunAsync}
        ├ requiredMcpServers 等待（最长 30s）、checkSubagentConcurrencyLimit、assertCanLaunch(预算)
        ├ wxo(agent.spawn 钩子) 改写 → checkSpawnHookRewrite 重新跑权限规则
        ├ getAgentModel / r2n(effort, token 预算)
        ├ 远程：teleportToRemote → registerRemoteAgentTask → {status:"remote_launched"}
        ├ 后台：lfe(注册 LocalAgentTask) → runAsyncAgentLifecycle(makeStream=runAgent) → {status:"async_launched"}
        └ 同步：uXn(注册) → runAsyncAgentLifecycle + onMessage 转进度 → rLr 等待（可被转后台）→ finalizeAgentTool → {status:"completed"}
```

`create()` 返回对象的 `checkPermissions`：当前权限模式满足 `isAutoClassifierActive(mode)`（`mode==="auto"` 或 plan 且 auto 生效）时，除 `tryAutoApproveWebFetchDispatch`（`chunk-0tkmvwy0.js#jn`，dontAsk 下 web-fetch 代理派发、prompt 中 1–8 个 URL 均被 WebFetch 允许）外都返回 `passthrough`（"Agent tool requires permission to spawn subagents."，交分类器/询问）；其余模式直接 `allow`。另外 `Agent(<type>)` 形式的 deny 规则在 callAgentTool 中检查（`getDenyRuleForAgent_12(ctx, "Agent", type)`）。`toAutoClassifierInput` = `"(<subagent_type>): <prompt>"`。

##### 1.2 输入 schema（`chunk-0tkmvwy0.js#jo` 同一语句里的 Go/xo/Qn/qo，`getAgentInputSchema`）

| 字段 | 类型 | 说明与条件 |
|---|---|---|
| `description` | string | 3–5 词短描述（折叠空白） |
| `prompt` | string | 任务内容 |
| `subagent_type` | string? | 代理类型；`"fork"` 显式选择 fork（fork 门开时）；省略时用 general-purpose（不可用则报错 "subagent_type is required…"） |
| `model` | enum `sonnet/opus/haiku/fable`? | `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` 时整个字段被移除；coordinator 模式且 `CLAUDE_CODE_COORDINATOR_FORCE_WORKER_INHERIT_MODEL` 时被忽略；fork 忽略 |
| `effort` | `EFFORT_LEVELS`?；相对 effort 开启时加 `lower`/`higher` | 有 effort 环境覆盖（`getEffortEnvOverride`）时移除；相对 effort 开关 = `isRelativeEffortDisabled()`：子代理默认模型为 inherit、无模型强制、`CLAUDE_CODE_SNAPPY_PELICAN` 或 `tengu_snappy_pelican` |
| `run_in_background` | boolean? | **默认后台**（描述 "Agents run in the background by default"）；`nat()`（后台任务禁用）或 `NSt()`（fork 门由 env 开启）时移除；有后台启动规则时描述被替换 |
| `name` | string?（`^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$`，不能是 main/team-lead/user/system 或 agentId 形状） | 让代理可被 `SendMessage({to:name})` 寻址；有团队上下文时派生队友 |
| `team_name` | string? | 已弃用、忽略（会话只有一个隐式团队） |
| `mode` | permission mode? | 已弃用、忽略（子代理继承父权限模式，定义 frontmatter 可覆盖） |
| `isolation` | `worktree` \| `remote`? | worktree：临时 git worktree；remote：云端（始终后台，受门控） |
| `cwd` | string? | 只在内部 schema `xo` 中存在，模型可见 schema（`Qn`）已 `omit({cwd})` |

##### 1.3 输出 schema（`chunk-0tkmvwy0.js#Ho`）与回传文本

- `completed`：`agentToolResultSchema`（`chunk-0h4e7gnq.js#CBs`：agentId、content[]、totalTokens、totalToolUseCount、totalDurationMs、usage、toolStats、modelsUsed、handback…）+ prompt、worktreePath/Branch、canContinueAgent。回传 = 报告正文 + `agentId: …（use SendMessage with to: '<id>' … to continue this agent）` + `<usage>subagent_tokens/tool_uses/duration_ms</usage>`；Explore/Plan（`x5t`）且无 worktree 时只回正文。
- `async_launched`：agentId、description、outputFile、resolvedModel、modelsUsed、canReadOutputFile、sharesCwd。回传要求模型"不要猜结果，等通知"，并禁止 Read/tail output_file。
- `remote_launched`：taskId、sessionUrl、outputFile。
- `teammate_spawned`（不在 schema 联合中，单独分支）：agent_id、name，"will receive instructions via mailbox"。

##### 1.4 关键约束（错误均为 `AgentPreconditionError`/`AgentTypeError`）

| 约束 | 来源 |
|---|---|
| 嵌套深度：`depth >= getMaxSubagentSpawnDepth()` 拒绝；`getMaxSubagentSpawnDepth()` = `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` 或 GrowthBook `tengu_hazel_trellis`，默认 3 | `chunk-k8xs47j2.js#OT` |
| 并发：`taskRegistry.getConcurrentSubagents() >= CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`（默认 20），`tengu_amber_kestrel` 或 ultracode 豁免 | `checkSubagentConcurrencyLimit` |
| 预算：`maxBudgetUsd` 用尽时不能再启动 | `assertCanLaunch` |
| 队友（进程内）不能派生队友、不能后台派生、不能派生 `background:true` 的代理 | callAgentTool |
| fork 不能用 `isolation:"remote"`，fork 内不能再 fork | `getForkPreconditionError` |
| `isolation:"remote"` 在 `CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG` 下禁止；不合格时 `Pn` 回退 worktree/本地 | `REMOTE_AGENT_RESTRICTED_CONFIG_ERROR` |
| `cwd` 与 `isolation:"worktree"` 互斥 | 钩子改写检查 |
| `requiredMcpServers` 不满足 → 报错并提示 /mcp | callAgentTool |

##### 1.5 启动形态（`decideAgentLaunchMode`，`chunk-0tkmvwy0.js#So`）

`shouldRunAsync = isRemoteLaunch || (I && !backgroundTasksDisabled)`，其中 `I = run_in_background===true || 定义 background===true || (非 web-fetch 代理 && (coordinator 非队友 || forceAsync || (非队友非无头子代理 && run_in_background!==false)))`。`forceAsync` = fork 门开且由 env 开启（`NSt`）且不是队友/无头子代理。后台被禁用的条件：`CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`、`--bare`、策略 `backgroundTasksDisabled/backgroundAgentLaunchDisabled`（`chunk-apw2zhyn.js#nat`/`chunk-apw2zhyn.js#C4`）。同步代理 2 秒后发 `background_hint` 进度，用户可将其转入后台（`raceAgentLaunch` 返回 moved 时结果改为 async_launched）。

##### 1.6 子代理工具集（`agentToolUtils.ts`）

- `filterToolsForAgent`（`#Iu`）：去掉子代理记忆模式禁止的工具；MCP 工具保留；plan 模式保留并补 ExitPlanMode；去掉仅主线程工具（`EXTERNAL_ALWAYS_AVAILABLE_TOOLS` 集，`chunk-hg2zbde4.js#Akt` 语句内）；Poll 只给非队友；非内建代理再去掉 `EXTERNAL_ALWAYS_AVAILABLE_SET`（同一个 var 语句）；无盘会话去掉 `ONBOARDING_TOOL_NAMES`（`chunk-hg2zbde4.js#usi` 语句内）；`EXTERNAL_EXTRA_TOOL_NAMES`（外部构建为空集）里的工具只给协调者固定工具（`isCoordinatorPinnedTool`）；SendMessage 只在 `canSubagentSend()`（未禁止对外消息或子代理发送已开放）时保留；**Agent 工具只在 `agentDepth < getMaxSubagentSpawnDepth()` 时保留**；后台（isAsync）代理只保留异步安全工具 `EXTERNAL_ALWAYS_AVAILABLE_TOOLS_2`（`chunk-hg2zbde4.js#Ckt`）（队友可额外保留团队工具 `COORDINATOR_TASK_TOOL_NAMES`（`chunk-hg2zbde4.js#Ckt` 语句内））。队友版本把 SendMessage 设为 `alwaysLoad`（不走 ToolSearch 延迟）。
- `resolveAgentTools`（`#mP`）：按定义 `tools`/`disallowedTools` 解析，支持 `*`、`Agent(type1,type2)`（同时产出 allowedAgentTypes）、`mcp__server`/`mcp__server__*`、工具别名/V1 底层名/Artifact 替身；**Glob/Grep 被嵌入式搜索取代**（`!isRemoteOnlyCheck("Grep") && hasEmbeddedSearchTools()`，即 bfs/ugrep 嵌入且 Grep 未被显式保留）且代理未拿到 Bash 时，把定义里写的 Glob/Grep 补回为真实工具；有 TaskStop/REPL 时自动带 GetTask。
- fork 与 `resumeAgentBackground` 用 `useExactTools`：完整继承父工具池（保证 prompt cache 一致）。

##### 1.7 runAgent（`chunk-0h4e7gnq.js#pP`，`tools/AgentTool/runAgent.ts`）要点

1. 插件代理先过插件信任检查；设置 session 的隔离根（worktree）。
2. 模型：`uYs(TCe(def, parentModel), parentModel, model, mode, onModelRestricted, "spawn"|"resume")`。
3. 权限模式：spawn 模式 > 定义 `permissionMode` > 父模式；`bubble` 在父为 plan/dontAsk 时跟随父；`bypassPermissions` 仅在父会话已是 bypass 且未受限时生效（`isBypassPermissionsAuthorized`）；`CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG` 下个人代理不能放宽模式；后台代理默认 `shouldAvoidPermissionPrompts`（除非 bubble/有对话框通道）；worktree 路径加入 additionalWorkingDirectories。
4. 工具：`resolveAgentTools`（见上），零工具时记 `tengu_subagent_zero_tools`。
5. 系统提示词：override（fork 用父渲染好的）或 `getAgentSystemPrompt`（含代理记忆 `loadAgentMemoryPrompt`）；`CLAUDE_CODE_ENABLE_APPEND_SUBAGENT_PROMPT` 时追加 appendSubagentSystemPrompt；`omitClaudeMd` 控制是否注入 CLAUDE.md。
6. frontmatter MCP 服务器（`initializeAgentMcpServers`）、skills 预加载（最多 32 个）、SubagentStart 钩子、定义内 hooks 注册到 sessionHooksRegistry。
7. `createSubagentContext` 后进入 query 循环（`maxTurns ?? def.maxTurns`），逐条 yield；max turns 到达记 `tengu_agent_max_turns_reached`；sidechain 转录写入；结束时 SubagentStop 钩子、清理 MCP 与钩子。

##### 1.8 结果整理与安全审查

- `finalizeAgentTool`（`#ean`）：取最后的文本作为报告；SubagentHandback 工具（`SUBAGENTHANDBACK = "SubagentHandback"`）送达时用其报告并标 `handback: send|flagged|withheld`；附加 max turns/模型 fallback 提示；有持久化的 tool result 文件时 `fitReportWithPersistedFilesNote` 截断；遥测 `tengu_agent_tool_completed`、OTel `subagent_completed`。
- `classifyHandoffIfNeeded`（`#S2n`）：auto 模式下用分类器审查子代理的动作与报告（site `handoff`），拦截时在报告前加 "SECURITY WARNING…"（flagged/refused/unavailable）。
- `reviewWorkflowAgentDispatch`（`#RBs`）：auto 模式下审查工作流派发的子代理 prompt（site `workflowGate`）。

##### 1.9 内建代理（`tools/AgentTool/loadAgentsDir.ts · getBuiltInAgents`，`chunk-e6aww6q8.js#lKe`）

| agentType | 条件 | 工具 | 模型 | 其他 |
|---|---|---|---|---|
| `general-purpose` | 总是（default 模式） | `*` | 默认 | |
| `statusline-setup` | 非 `--safe-mode`（`isSafeMode()`） | Read, Edit | sonnet | color orange |
| `claude` | 未禁用 agent view（`CLAUDE_CODE_DISABLE_AGENT_VIEW` / `disableAgentView`） | `*` | 默认 | `appendSystemPrompt: !0`，后台作业叙述规范（FleetView 默认代理） |
| `Explore` | `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` 未设 | 除 Agent/ExitPlanMode/Edit/Write/NotebookEdit 等 | inherit | omitClaudeMd，只读搜索 |
| `Plan` | 同上 | 同 Explore | inherit | omitClaudeMd，只读规划 |
| `web-fetch` | `V2()`：WebFetch 可用、非 `CLAUDE_CODE_SIMPLE`/`CLAUDE_CODE_DISABLE_WEB_FETCH`、策略允许、default 模式 | WebFetch | 订阅条件 + `tengu_nimble_wren` 时 haiku，否则 inherit | maxTurns 15，color blue；userFacingName 显示为 Fetch；忽略 isolation |
| `claude-code-guide` | 非 SDK 入口（`CLAUDE_CODE_ENTRYPOINT` ≠ sdk-ts/sdk-py/sdk-cli） | Glob, Grep, Read, WebFetch, WebSearch（嵌入搜索时 Bash 代替 Glob/Grep） | haiku | permissionMode dontAsk |
| `fork` | fork 门开（`getForkSubagentEnabledSource() !== "disabled"`：未被策略/`CLAUDE_CODE_FORK_SUBAGENT=false`/非交互门关闭） | `*`（useExactTools） | inherit | maxTurns 200，bubble，显式 `subagent_type:"fork"` |
| `worker` | coordinator 模式时唯一内建代理 | `*` | 默认 | maxTurns 500，bubble |
| （无） | `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS` 且非交互 | | | |

自定义代理来源与优先级（`getActiveAgentsFromList`）：built-in < plugin < userSettings < projectSettings（其他目录在前）< flagSettings(`--agents`) < policySettings，同名后者覆盖；插件可在运行时 `registerAgent`（`getRuntimeRegisteredPluginAgents`）。frontmatter/JSON 字段见 `AgentJsonSchema`（`chunk-e6aww6q8.js#fte`）：description、prompt、tools、disallowedTools、model（inherit）、effort、permissionMode、mcpServers、hooks、maxTurns、autoCompactWindow、skills、initialPrompt、memory(user/project/local)、background、omitClaudeMd、isolation、observer/observerMessage/observeSubagents。

##### 1.10 fork 子代理（`forkSubagent.ts`）

`buildForkedMessages` 复制父 assistant 消息，为其中每个 tool_use 生成占位 tool_result：自己的 Agent/Task 调用写 "Fork started — that fork is you."，其他调用写 "This is the parent's call, not yours…"，再附 `FORK_WORKER_PREAMBLE`（`chunk-e6aww6q8.js#i7e`）包装的指令（"You are a worker fork… Do NOT spawn subagents…"）。系统提示词沿用父线程 `renderedSystemPrompt`，工具池原样继承，worktree 下追加 `buildWorktreeNotice`。fork 内再 fork 被 `isInForkChild` 拦下。

##### 1.11 代理记忆（`agentMemory.ts`）

`memory` 字段 → `getAgentMemoryDir`：project `.claude/agent-memory/<type>/`、local `.claude/agent-memory-local/<type>/`（`CLAUDE_CODE_REMOTE_MEMORY_DIR` 下改到 `projects/<root>/agent-memory-local`）、user `<记忆根>/agent-memory/<type>/`。`isInsideAgentMemoryDir` 被权限系统用来放行记忆读写。`loadAgentMemoryPrompt` 生成 "Persistent Agent Memory" 段并附 `CLAUDE_COWORK_MEMORY_EXTRA_GUIDELINES`。旧版的记忆快照同步（agentMemorySnapshot）在 316 只剩无引用 schema。

##### 1.12 环境变量与开关（Agent）

`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`、`tengu_hazel_trellis`、`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`、`tengu_amber_kestrel`、`CLAUDE_CODE_FORK_SUBAGENT`、`CLAUDE_CODE_SUBAGENT_MODEL_FORCE`、`CLAUDE_CODE_COORDINATOR_FORCE_WORKER_INHERIT_MODEL`、`CLAUDE_CODE_SNAPPY_PELICAN`/`tengu_snappy_pelican`（相对 effort）、`CLAUDE_CODE_STREAMED_BUMBLEBEE`/`CLAUDE_CODE_STREAMED_BUMBLEBEE_TEXT`、`tengu_streamed_bumblebee`/`tengu_streamed_bumblebee_text`（token 预算说明）、`CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`、`CLAUDE_AUTO_BACKGROUND_TASKS`、`CLAUDE_CODE_WORKER_CHECKIN_SCHEDULE`、`CLAUDE_CODE_REMOTE*`、`CLAUDE_CODE_EVAL_CONFINED`、`CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG`、`CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS`、`CLAUDE_CODE_DISABLE_AGENT_VIEW`、`CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS`、`CLAUDE_CODE_ENTRYPOINT`、`CLAUDE_CODE_ENABLE_APPEND_SUBAGENT_PROMPT`、`CLAUDE_CODE_MEMORY_SUBAGENT_APPEND`、`CLAUDE_CODE_SUBAGENT_PROMPT_SNAPSHOT`、`CLAUDE_CODE_REMOTE_MEMORY_DIR`、`CLAUDE_COWORK_MEMORY_EXTRA_GUIDELINES`；GrowthBook：`tengu_velvety_sprout`、`tengu_neapolitan`（远程隔离）、`tengu_twinkling_boole`（worktree 隔离建议）、`tengu_nimble_wren`、`tengu_zinc_harbor`（队友能否带 name 派生）。

#### 2. SendMessage

##### 2.1 输入（`getSendMessageInputSchema`，`chunk-astf3mhy.js#Pe`）

| 字段 | 说明 |
|---|---|
| `to` | 单行、限长。本地版："a background agent's name or agentId, a teammate name, or \"main\""；跨会话版另可写 ListAgents 列出的名字/地址（`uds:`、`bridge:`、`local_<uuid>`、`did:` 等） |
| `summary` | ≤200 字符（超长截断不报错）；本地版为 UI 预览，跨会话版只记在自己转录 |
| `message` | 纯文本；agent swarms 开启时可为结构化：`shutdown_request{reason?}`、`shutdown_response{request_id, approve, reason?}`、`plan_approval_response{request_id, approve, feedback?}` |
| `notify_when_idle` | 仅跨会话版：订阅本机另一会话下次空闲/退出时的一次性通知；可不带 message（纯订阅）；只有主会话能用 |

schema 选择：策略 `messagingBeyondOwnAgentsDisabled` → 只能发本会话代理或 main；跨会话开关 `Pa()` = 非上述策略且（`CLAUDE_CODE_HARBOR_KITE` 或 `tengu_harbor_kite`，Windows 另需 `tengu_harbor_kite_win`）；`isAgentSwarmsEnabled()` 决定 message 能否结构化。

##### 2.2 校验与权限

`validateInput` 拒绝：`to:"*"`（"broadcast … is no longer supported"）、跨会话未开时的 uds/bridge 地址、`to` 含 `@`、空消息（非纯订阅）、文本消息为团队协议帧或生命周期 JSON、跨会话发结构化消息、shutdown_response 不发给 team-lead、批准时带 reason、拒绝时缺 reason。`checkPermissions`：`isolatePeerMachines` 设置下跨机器 bridge 地址需授权；auto 模式返回 passthrough（分类器审查 "to X: …"）。`toAutoClassifierInput` 形如 `to <to>: <message> [summary: …]`。

##### 2.3 投递路由（`deliver`）

先经插件 message 钩子（`ws`），再按 `Hon(...)` 解析的收件人类型：`main`（子代理发给主会话）、`agent-live`（写入运行中子代理队列）、`agent-stopped`/`agent-evicted`（恢复该代理并把新消息作为续写，完成后 `buildInlineHandback` 交回报告；用户停止的不恢复）、`local-session`（本机其他会话，UDS）、`cloud-session`（bridge）、`mailbox`（团队队友邮箱 `handleMessage`）、结构化协议（`handleShutdownRequest/Approval/Rejection`、`handlePlanApproval/Rejection`）、`not-found`/`ambiguous`（给出 Did you mean 与 ListAgents 提示）。观察者（observer）代理不能用 SendMessage（改用 ObserverReport）。

#### 3. Task* 与任务存储（`utils/tasks.ts`）

- 列表 id：`getTaskListId` = `CLAUDE_CODE_TASK_LIST_ID` > 队友所属团队名 > 当前团队/会话列表/lead 团队 > 会话 id。
- 位置：`<配置目录>/tasks/<listId>/<taskId>.json`（`getTaskOutputDir`（`chunk-nw7jbebs.js#NP`）= `join_2(getClaudeConfigDir(), "tasks", sanitizePathComponent(e))`）；`.highwatermark` 记录用过的最大 id，删除/重置后 id 不复用。云端（`X()`）会话改用 v5 键值存储 `task/<list>/<id>`，锁变成进程内 `taskList.locks.run`。
- 锁：列表级锁文件 `<dir>/.lock`（`lock(path, LOCK_OPTIONS_2)`，`LOCK_OPTIONS_2` = retries 30，5–100ms）用于创建/重置/带忙碌检查的认领；任务级锁 `<task>.json.lock` 用于更新。
- 创建：`createTask` 在列表锁内取 `max(文件最大 id, high-water)+1`。
- TaskUpdate：`status:"deleted"` 调 `deleteTask`（顺带从他人 blocks/blockedBy 中移除）；`completed` 前跑 TaskCompleted 钩子（阻塞则失败）；agent swarms 下 `in_progress` 且无 owner 时自动设为当前代理名，设置 owner 时往其邮箱写 `task_assignment`；`addBlocks`/`addBlockedBy` 调 `blockTask` 建双向依赖；metadata 合并时值 null 删除键。
- TaskCreate：`coerceTaskCreateInput` 纠正常见错形（task 包裹、别名字段）；TaskCreated 钩子阻塞则删除新任务并报错；成功后 UI 切换到 tasks 展开视图。
- TaskList 过滤 `metadata?._internal` 任务，blockedBy 只显示未完成的阻塞者。
- 队友退出：`unassignTeammateTasks` 把其未完成任务改回 pending/无 owner 并生成通知。

##### TaskStop

输入 `task_id`（兼容已弃用 `shell_id`；也接受队友/命名后台代理的名字），远程执行开关（`tengu_violin_varnish`）下 schema 增加远程字段并可停止远程主机上本会话的后台命令。校验：任务存在、处于 running（或代理类/挂起类可停）；调用 `stopTask(..., killedBy:"parent")`。输出 message/task_id/task_type/command。

##### TodoWrite

输入 `todos: [{content, status: pending|in_progress|completed, activeForm}]`（`strict:true`）。保存在 AppState 的 `todos`（按 agentId 或会话 id），全部 completed 时清空；输出 oldTodos/newTodos；回传固定文本提醒继续使用清单。

#### 4. 队友派生（`tools/shared/spawnMultiAgent.ts`）

`handleSpawn`（`chunk-cne5hsvz.js#Ae`）由 Agent 工具的 name 分支调用：prompt 不能是团队协议帧；进程内队友开启时走 `handleSpawnInProcess`（写成员记录、清空邮箱、`spawnInProcessTeammate` 并启动循环）；否则检测 pane 后端（tmux / iTerm2），不可用且队友模式为 auto 时回退进程内（提示只显示一次），否则 `use_splitpane` 决定分屏或新窗口。运行时注册的插件代理只能进程内运行。`buildInheritedCliFlags` 把父权限模式翻译为队友进程参数（bypass → `--dangerously-skip-permissions`，acceptEdits/auto → `--permission-mode …`，plan_mode_required → plan）。会话启动时 `initializeSessionTeam`（`chunk-6cc2zqkz.js#P`，旧名 TeamCreateTool）建立唯一的隐式团队与 team-lead 成员。

#### 5. 与 2.1.88 的差异（有 316 代码证据）

| 项 | 2.1.88 | 316 | 证据 |
|---|---|---|---|
| Agent `model` 枚举 | sonnet/opus/haiku | 加 `fable` | `AGENT_MODEL_CHOICES` = `["sonnet", "opus", "haiku", "fable"]`（`chunk-ymw5z3js.js`，落位 `tools/AgentTool/constants.js`） |
| Agent `effort` 参数 | 无 | 新增，含相对 lower/higher | `chunk-0tkmvwy0.js#jo`（Go/qo） |
| `run_in_background` 语义 | "Set to true to run in background" | 默认后台，传 false 才同步 | 同上描述文本 + `decideAgentLaunchMode` |
| fork 选择方式 | 门开时省略 subagent_type 即 fork | 必须显式 `subagent_type:"fork"`，"never the default" | `FORK_AGENT` 的 `whenToUse`（`chunk-e6aww6q8.js#yq`） |
| `isolation:"remote"` | 仅内部构建 | 对外，受 `tengu_neapolitan` 等门控 | `isRemoteAgentIsolationAvailable()`、`teleportToRemote` 分支 |
| `team_name`/`mode` 参数 | 有效 | 已弃用并忽略，单一隐式团队 | xo 描述 |
| TeamCreate/TeamDelete/TaskOutput 工具 | 存在 | 移除，列入退役名单 | `chunk-e6aww6q8.js#_0e` |
| SendMessage isEnabled | `isAgentSwarmsEnabled()` | 未定义（常驻），跨会话/notify_when_idle/UDS/bridge 寻址 | `chunk-astf3mhy.js#Ls` |
| SendMessage 广播 `to:"*"` | 支持 | 拒绝 | validateInput |
| TaskCreate 并发安全 | true | false | `chunk-kxyd0g16.js#Ui` |
| Task*/TodoWrite 启用 | `isTodoV2Enabled()` / 取反 | 再加模型门 `todoToolsEnabled()`（新模型默认不给） | `chunk-e6aww6q8.js#t6`/`chunk-e6aww6q8.js#Wue` |
| verificationAgent | `tengu_hive_evidence` 下的验证代理 | 同位置换成 `web-fetch` 代理 | `chunk-e6aww6q8.js#FSt` |
| 新内建代理 | — | `claude`（FleetView 默认）、`web-fetch` | `CLAUDE_AGENT`（`chunk-fgpf3f12.js#e`，压缩名 F7e）、`WEB_FETCH_BUILTIN_AGENT`（`chunk-e6aww6q8.js#FSt`） |
| 子代理交回 | 直接文本 | SubagentHandback 工具 + handoff 分类器审查 + SECURITY WARNING | `finalizeAgentTool`、`classifyHandoffIfNeeded` |
| 深度/并发/预算上限 | 无显式深度上限 | `getMaxSubagentSpawnDepth()` 默认 3、并发默认 20、预算检查 | `checkSubagentConcurrencyLimit` 等 |
| 插件 `agent.spawn` 钩子、`requiredMcpServers` 等待、observer 代理 | 无 | 新增 | callAgentTool |
| 代理记忆快照同步 | 有 | 只剩无引用 schema | `chunk-e6aww6q8.js#ZGl` |
| 任务存储 | 文件 | 文件 + v5 键值存储、high-water mark ifAbsent 重试 | `createTask` |

#### 6. 未解之处

- `chunk-0h4e7gnq.js#zxo` 中 `WORKFLOW_GATE_TIMEOUT_MS = 2*wfn+60000` 的确切用途未追。
- `todoToolsEnabled()` 中 `jws()` 的 `todoToolsOptIn` 由 `initializeToolPermissionContext`（`chunk-zfbhezv9.js#AIo`，permissionSetup）根据 `--tools`/`--allowedTools` 解析结果设置，细节属 permissions 领域。
- `getHostAgentPolicy()`（`chunk-5xbkq5z7.js`）策略对象各字段（backgroundTasksDisabled、messagingBeyondOwnAgentsDisabled、subagentSends 等）来源未追。
- SendMessage 的 `resolveCrossSessionAddress` 收件人解析（`chunk-n0beqxxz.js#Hon`，写作时在 `_unattributed`）与 UDS/bridge 传输属 agents/bridge 领域。

### 6.4 其他工具：交互、计划/worktree、MCP、Skill、Web、定时与远程


> 本节由 dom-tools 的 misc 分组整理，供合并进 `docs/handbook/tools.md`。所有结论以 `original/` 2.1.316 代码为准；路径写法 `重组模块路径 · 函数名`，声明 id 为 `chunk-xxx.js#压缩名`。
> 名字在命名表生效前，阅读树里部分符号仍是压缩名；括号中给出本组建议的语义名（`artifacts/tmp/tools/misc/semantic.jsonl`）。

#### 0. 属性速查表

`on({...})` 是工具定义工厂（`services/tools/permissionCheckGuard.ts` · `buildTool`，`chunk-g54kbxqw.js#on`；写作时在 `_unattributed/` part-024）。下表"未声明"表示该字段沿用工厂默认值（由 core 组说明）。`shouldDefer: true` 的工具默认不进初始工具列表，需要 ToolSearch 加载。

| 工具名（name） | 声明 id | isEnabled | shouldDefer | 只读 | 可并发 | maxResultSizeChars | backgrounding | 其他 |
|---|---|---|---|---|---|---|---|---|
| `AskUserQuestion` | `chunk-a91k35xs.js#Hoe` | `ebe()`：非交互会话且无可用提问通道时关 | 否（2.1.88 为 true） | 是 | 是 | 100000 | never | requiresUserInteraction；admitCardAnswer/shownCardInput；validationErrorSteer |
| `SendUserMessage`（别名 `Brief`） | `chunk-kxyd0g16.js#cs`（BriefTool，压缩名 fo） | `fH() \|\| Mqe()` | 否 | 是 | 是 | 100000 | never | briefStandalone |
| `EnterPlanMode` | `chunk-a5k9jscj.js#Ze`（EnterPlanModeTool，压缩名 gWn） | 跟随 ExitPlanMode 的 `isEnabled()` | 是 | 是 | 是 | 100000 | never | 子代理拒绝 |
| `ExitPlanMode` | `chunk-fnhsh6ng.js#I9` | 有 channels 的非交互会话关；无提问通道的非交互会话关 | 是 | 否 | 是 | 100000 | never | requiresUserInteraction（队友除外）；diskless 时 inputJSONSchema 改为 `{plan}` |
| `EnterWorktree` | `chunk-kxyd0g16.js#Di`（EnterWorktreeTool，压缩名 Ar） | 未声明 | 是 | 未声明 | 未声明 | 100000 | never | userFacingName 随 path 变化 |
| `ExitWorktree` | `chunk-kxyd0g16.js#Lr` | 未声明 | 是 | 未声明 | 未声明 | 100000 | never | isDestructive = action==="remove" |
| `ListMcpResourcesTool`（别名 `ListMcpResources`） | `chunk-9ycd12hk.js#uF` | 未声明 | 是 | 是 | 是 | 100000 | never | |
| `ReadMcpResourceTool`（别名 `ReadMcpResource`） | `chunk-9ycd12hk.js#G`（ReadMcpResourceTool，压缩名 fF） | 未声明 | 是 | 是 | 是 | 100000 | never | suppressesAlwaysAllowRule = `SFe()` |
| `mcp`（模板）→ `mcp__<server>__<tool>` | `chunk-79gnqwq0.js#Ize` | 未声明 | 由 alwaysLoad 决定 | readOnlyHint | readOnlyHint 或 mayOverlap | 100000（大结果服务器可调） | self | isMcp；见 §3 |
| `mcp__<server>__authenticate` | `chunk-rbwn7je9.js#pe` | 恒真 | — | 否 | 否 | 10000 | — | 权限直接 allow |
| `Skill` | `chunk-a5k9jscj.js#vQe` | `!Wb()`（host 未禁用斜杠命令） | 否 | — | — | 100000 | never | preserveToolUseResultInSubagents = `isSillyShoreGateOn()`；call 走 runEngine |
| `WebFetch` | `chunk-e6aww6q8.js#Rw` | `!CLAUDE_CODE_DISABLE_WEB_FETCH && dn("allow_web_fetch")` | 是 | 是 | 是 | `FD` | detach | ruleContentField "url"；skipAggregateToolResultBudget；coerceInput |
| `WebSearch` | `chunk-kxyd0g16.js#wo` | `allow_web_search` 且提供方支持 | 是 | 是 | 是 | 100000 | detach | coerceInput 去掉 mode；stripForCreation |
| `CronCreate` | `chunk-kyk75gag.js#d`（CronCreateTool，压缩名 F） | `isKairosCronEnabled()` | 是 | — | — | 100000 | never | enablesCodeExecution |
| `CronDelete` | `chunk-e1hwptaj.js#s`（CronDeleteTool，压缩名 C） | 同上 | 是 | — | — | 100000 | never | |
| `CronList` | `chunk-8985aafb.js#c`（CronListTool，压缩名 O） | 同上 | 是 | 是 | 是 | 100000 | never | |
| `RemoteTrigger` | `chunk-y8ff1x9z.js#dt` | 订阅登录 + 非远程 + 两个策略开关 | 是 | 读类 action | 是 | 100000 | never | enablesCodeExecution |

不在 316 中的旧版工具：`Config`（旧版仅 `USER_TYPE=ant` 注册；316 的 `tools/ConfigTool/*` 三个模块全是误归代码，见 notes）。

#### 1. AskUserQuestion

- 模块：`tools/AskUserQuestionTool/AskUserQuestionTool.tsx`、`prompt.ts`；名称常量 `chunk-4121qate.js#wUe`、`chunk-ft22tw4r.js#bs`（同值 `"AskUserQuestion"`）。
- 输入 schema（`AskUserQuestionTool.tsx · inputSchema`/`questionSchema`）：
  - `questions`：1–4 项；每项 `question`、`header`（短标签，prompt 写明最长 `rdi`=12 字符）、`options` 2–4 项（`label`、`description`、可选 `preview`）、`multiSelect`（默认 false）。
  - host `questionOptionDescriptionsOptional()` 为真时选项 `description` 可选（`B`/`me`/`Ae`）。
  - host `extendedQuestionsEnabled()`（`getExtendedQuestionsEnabled`，`chunk-ndmse9kj.js#zMe`）为真时用扩展 schema（`_e`）：可选 `title`；问题可带 `kind`（choice/text/number）、`description`、`placeholder`、`min`/`max`/`step`/`defaultValue`/`unit`；`ye` 的 superRefine 校验字段组合（choice 至少 2 项、text/number 不能有选项或 multiSelect、number 需 min<max 且默认值在区间内）。
  - 公共字段 `answers`（问题文本 → 答案，数组答案用 ", " 连接）、`annotations`（preview/notes）、`metadata.source`。
  - 唯一性 refine `j`：问题文本唯一、每题选项 label 唯一。
- 输出 schema：`questions`、`answers`、`response`（自由文本回复）、`annotations`（含 `unanswered`：skipped/replied_in_chat/dismissed）、`afkTimeoutMs`、扩展模式下 `followUp`。
- 权限与执行：`checkPermissions` 恒为 `ask`（"Answer questions?"），由权限组件（`components/permissions/AskUserQuestionPermissionRequest/*`）展示并把答案写回输入；`call` 只是整理数据并记 `tengu_ask_user_question_completed`。HTML 预览格式下 `validateInput` 用 `validateHtmlPreview` 拒绝完整文档、script/style、非 HTML。
- 结果映射（`mapToolResultToToolResultBlockParam`）：AFK 超时（`K` 生成说明）、用户要求追问（followUp，要求模型再调用一次且不要开始任务）、自由回复、所有答案都合规（"Your questions have been answered"）、答案需细读（"Read the answers carefully"）、未作答。
- `validationErrorSteer`：少于 2 个选项的 choice 题被拒时，给模型特定指引（不要重试、不要凑第二个选项；扩展模式下改用 `kind:"text"`）。
- prompt 组成：lean 模式与常规模式两套基础段；工具列表含 EnterPlanMode/ExitPlanMode（`isPlanModeToolUnavailable` 为假）时附计划模式说明；GrowthBook `tengu_cinder_plover`、`tengu_cinder_wren` 远程追加文本；`cdi`（问题需自足）；扩展问题说明 `ldi`；按 `getQuestionPreviewFormat()` 追加 markdown/html preview 说明。
- 与 2.1.88 差异：旧版 `shouldDefer: true`，316 去掉（初始即加载）；旧版 isEnabled 只看 KAIROS channels，316 改为 `ebe()`；新增扩展问题（kind/title/followUp）、afkTimeoutMs、validationErrorSteer、admitCardAnswer/shownCardInput（`chunk-a91k35xs.js#Hoe`）。

#### 2. 计划模式：EnterPlanMode / ExitPlanMode

##### EnterPlanMode（`tools/EnterPlanModeTool/EnterPlanModeTool.ts · EnterPlanModeTool`）
- 输入空对象；输出 `{message}`。
- `validateInput`：`agentId` 存在（子代理）时拒绝。
- `checkPermissions`：diskless 会话（`X()` → host `launchOptions.diskless()`）且当前模式不是 auto/plan 时以 `safetyCheck` 询问，`personOnly: true`、`classifierApprovable: false`（理由：计划模式下自动检查可能批准只读动作）；其他情况直接允许。
- `call`：记录模式切换 `Ake(mode,"plan")`，`setToolPermissionContext(prepareContextForPlanMode → setMode plan, destination session)`。
- 结果文本附带计划阶段的 6 条要求（探索、找相似实现、比较方案、用 AskUserQuestion 澄清、设计策略、用 ExitPlanMode 提交），并强调不要写文件。

##### ExitPlanMode（`tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts · ExitPlanModeV2Tool`）
- 输入：`allowedPrompts`（已废弃，passthrough）；diskless 会话下 `inputJSONSchema` 换成 `{plan: string}`（必填、无其他字段），JSON 序列化后 ≤ 32768 字节（`z`）。normalizeToolInput 会从磁盘注入 `plan`/`planFilePath`（`$e`）。
- 输出：`plan`、`isAgent`、`filePath`、`hasTaskTool`、`planWasEdited`、`awaitingLeaderApproval`、`requestId`。
- `validateInput`：fork 子代理（`subagentName === FORK`）在团队或计划模式下拒绝；diskless 会话的子代理拒绝；不在 plan 模式时拒绝并记 `tengu_exit_plan_mode_called_outside_plan`；diskless 校验 plan 非空与大小。
- `checkPermissions`：队友（有 team name）直接允许；否则询问 "Exit plan mode?"。
- `call`：
  1. diskless 时 plan 缺失抛 `PlanPreconditionError`；否则读计划文件（`getPlanFilePath_2`），用户在 UI 编辑过的 plan 会写回文件。
  2. 队友且需要审批（`planModeRequired` 或任务的 permissionMode 为 plan）：把 `plan_approval_request` 写入 team-lead 邮箱，返回 `awaitingLeaderApproval`。
  3. 恢复 `prePlanMode`：若原为 auto 而 auto 不可用（`canPlanReturnToAutoMode`），回退 default 并发通知；auto 时剥离危险规则、否则恢复先前被剥离的规则。
  4. `hasTaskTool`：多代理 swarm 开启、有 Agent 工具且没有 SendMessage 时为真（影响结果提示）。
- 结果文本：提交审批 / 子代理被批准（回复 "ok"）/ 空计划 / "User has approved your plan…" + 计划正文（编辑过时标 "edited by user"）。
- 与 2.1.88 差异：isEnabled 不再依赖 `feature('KAIROS')` 编译开关，改为运行时 `getAllowedChannels()` 与提问通道判断；新增 diskless 直接传 plan 的模式与 32768 字节上限、fork 子代理限制。

#### 3. MCP 相关工具

##### MCPTool 模板（`tools/MCPTool/MCPTool.ts · MCPTool`）
- 自身只是模板：`name: "mcp"`、`isMcp: true`、`uiTableKey: "mcp"`、`backgrounding: "self"`、输入 passthrough、输出为字符串/内容块数组/结构化内容；`call` 返回空，`checkPermissions` 为 passthrough。
- 真正的服务器工具在 `services/mcp/client.ts` 中由 `{...MCPTool, ...}` 生成（client.js 约 4870 行起），覆盖：
  - `name`：`mcp__<server>__<tool>`（SDK 服务器且 `CLAUDE_AGENT_SDK_MCP_NO_PREFIX` 时可不加前缀）；`mcpInfo`（服务器名、scope、插件来源、toolName、title、角色、effectiveMaxPermission…）。
  - `alwaysLoad`：服务器未设"全部延迟"，且服务器配置 alwaysLoad（dynamic scope 下工具 `_meta["anthropic/alwaysLoad"] === false` 可退出）或工具 `_meta["anthropic/alwaysLoad"] === true`。
  - `searchHint`、`prompt({loadedThroughToolSearch})`（经 ToolSearch 加载时给不同文本）。
  - `isReadOnly`/`isConcurrencySafe`/`isDestructive`/`isOpenWorld` 来自 MCP annotations（readOnlyHint/destructiveHint/openWorldHint）。
  - `checkPermissions`：先处理第一方设计服务器的同意流程；`requiresUserInteraction` 时强制 ask；否则 passthrough 并建议 `localSettings`（远程浏览器服务器可能是 `session`）的整工具 allow 规则。
  - `maxResultSizeChars`：大结果服务器取 min(配置, Tle)，否则 100000。
- `stripForCreation` 清空 base64 document 的 data，`mapToolResultToToolResultBlockParam` 回传前去掉这些空文档块（`chunk-79gnqwq0.js#i`、`#m`）。
- UI（`tools/MCPTool/UI.tsx`）：进度条（progress/total）、结果超过约 10000 token 时警告、Slack 发消息结果压缩成 "Sent a message to #频道"（`trySlackSendCompact`）、参数单行显示并转义控制字符（`renderToolUseMessage_3`）。
- 折叠分类：2.1.88 的 `classifyMcpToolForCollapse(serverName, toolName)`（按工具名白名单判断 search/read）在 316 中找不到；`tools/MCPTool/classifyForCollapse.ts` 里匹配到的全是别处代码（见 notes）。

##### McpAuth 占位工具（`tools/McpAuthTool/McpAuthTool.ts · createMcpAuthTool`）
- 名称 `mcp__<server>__authenticate`，`mcpInfo.isAuthStub: true`，权限直接 allow，结果上限 10000 字符。
- `call`：托管策略禁止 / 服务器被禁用 / 项目未审批 → 错误；claude.ai 连接器或不支持 OAuth 的传输 → unsupported（让用户走 /mcp）；否则启动 `performMCPOAuthFlow`（不打开浏览器，返回授权 URL），同一服务器 10 分钟内可复用进行中的流程；完成后检查身份纪元、服务器是否仍启用，再 `reconnectMcpServerImpl` 并由连接接管（adoptServer）。

##### ListMcpResources / ReadMcpResource
- `ListMcpResourcesTool`（`chunk-9ycd12hk.js#uF`）：输入 `server?`；遍历本回合可见的 MCP 客户端（排除对当前代理隐藏的），对有 `resources` 能力的服务器 `fetchResourcesForClient`；claude.ai 代理或特定 HTTP 服务器遇到发现错误会重连重试一次；过滤 MCP Apps UI 资源（ui:// 或 text/html;profile=mcp-app）。
- `ReadMcpResourceTool`（`chunk-9ycd12hk.js#G`）：输入 `server`、`uri`；`SFe()` 为假时直接 allow，否则 passthrough；插件服务器记插件使用；MCP Skill 访问检查（`Ifn`、`a1r`，未列出的资源返回说明）；`-32601` 和资源不存在转成可读错误（提示重新 list 或改用目录读取工具）；blob 内容存成文件（`KC`），返回路径说明。
- 与 2.1.88 差异：新增别名（ListMcpResources/ReadMcpResource）、MCP Apps UI 资源过滤、Skill 资源访问控制、目录资源提示。

#### 4. Skill（`tools/SkillTool/SkillTool.ts`）

- 输入：`skill`（列表中的名字，不要猜）、`args?`。输出两种：inline（`success`、`commandName`、`allowedTools`、`model`、`status: "inline"`、`readOnly`）与 forked（`agentId`、`result`、`background`、`toolsUsedLine`）。
- `isEnabled`：`!Wb()`（host 的 `disableSlashCommands` 未开）。
- `validateInput`（`SkillTool` 的 `validateInput`）流程：
  1. 去掉前导 `/`（记 `tengu_skill_tool_slash_prefix`）；`me()` 加载命令表，`oe()` 解析（可能结果：命中、listingName、suggestion、ambiguous、none）。
  2. 远端 skill 需要物化（`isSkillsSyncActive()`、`startPendingDownload`（`chunk-e6aww6q8.js#RCe`））时下载，失败返回 "could not be downloaded … Proceed without it."（errorCode 10）；有 `loadDefinition` 的先加载定义。
  3. MCP 来源 skill、被同步否决/主机目录隐藏的 skill 一律当作 Unknown。
  4. 未找到：目录作用域变体、listingName 提示正名、后缀匹配建议、编辑距离 ≤2 的近似名、插件加载错误说明。
  5. 在自己 fork 出的上下文中再调用同一 skill → 拒绝（errorCode 9）。
  6. `checkSkillPermission`（`chunk-e6aww6q8.js#jKe`）检查：disable_model_invocation、not_loaded、not_allowlisted、override_disabled、not_prompt_type、mcp_prompt、deny_rule。
- `checkPermissions`：Skill deny 规则（支持前缀匹配 `matchesSkillRule`）→ MCP skill 拒绝 → ask 规则（`areSkillsConvertedAsPlugins()` 开时）→ allow 规则（插件边界可能 held-back）→ 只含安全属性的 prompt skill（`SAFE_SKILL_PROPERTIES` 表 `Ke`）或协调者只读加载直接允许 → 否则询问并建议 `Skill(name)` 或 `Skill(name:*)`。
- `call` → `runEngine(runSkillInvocation)`（`chunk-a5k9jscj.js#je`）：
  - 已被停止的代理不能再启动 skill；设置 `options.activeSkill`。
  - fork 型（`NZn(...) === "fork"` 且非只读加载）：插件输入被 hold 时拒绝；`executeForkedSkill` 用 `prepareForkedCommandContext` 准备工具/权限层/文件读状态，可后台运行（返回 "Running in the background as @名字"），前台用 `runAgent`（querySource `agent:custom`）跑完并转发 `skill_progress`。
  - inline 型：`processPromptSlashCommand` 展开 skill 正文为新消息（过滤进度与命令标签消息、标注 toolUseID），返回 `contextLayers`：`allowed_tools`、`model`（`clt` 判断模型覆盖可生效时）、`effort`。
  - 协调者模式（`wme(ctx)`）：只读加载，结果 "Loaded skill instructions (read-only)… delegate execution to a worker."
- skill 列表（`tools/SkillTool/prompt.ts`）：预算 `getCharBudget` = `SLASH_COMMAND_TOOL_CHAR_BUDGET` 或 上下文窗口 × 4 × 设置 `skillListingBudgetFraction`（默认 0.01），未配置时 GrowthBook `tengu_typed_pebble` 可抬高；单条描述上限 `settings.skillListingMaxDescChars`（默认 1536）；超预算时打包 skill 保留全文，其余按优先级保留描述或只留名字（`tengu_skill_descriptions_truncated`）。
- 与 2.1.88 差异：旧版无 isEnabled；316 新增远端物化、目录作用域 skill、只读加载（协调者）、fork 后台运行、contextLayers 返回模型/effort、held-back 插件边界规则、`SAFE_SKILL_PROPERTIES` 大幅扩充（`chunk-a5k9jscj.js#vQe`）。

#### 5. WebFetch（`tools/WebFetchTool/*`）

- 输入：`url`（zod url）、`prompt`、`offset`?（非负整数，长页面续读，316 新增）。输出：`bytes`、`code`、`codeText`、`result`、`durationMs`、`url`、`artifactRead`?。
- `isEnabled`：未设置 `CLAUDE_CODE_DISABLE_WEB_FETCH` 且策略开关 `allow_web_fetch`。
- 权限（`create()` 返回对象的 `checkPermissions`）：
  1. 若 URL 是 claude.ai artifact（`parseArtifactUrlInput`）：artifact 专用 deny/ask 规则；工具集有 artifact 读取途径时，处理跨组织、他人 artifact、会话网络关闭等情况（多为 safetyCheck 询问、不可由分类器批准、`localDisplayOnly`）。
  2. 规则内容为 `domain:<host>`（`inputToPermissionRuleContent`），artifact 场景额外加 viewer/origin 的 domain；依次检查 deny、ask。
  3. allow 规则命中 → 允许；`CLAUDE_CODE_EVAL_CONFINED` 未设置且 URL 在预批准列表 → 允许（reason "Preapproved host"）；否则询问并建议 localSettings `WebFetch(domain:host)`。
  4. `permissionCheckFailureDecision`：PermissionRequest hook 批准时附带了 WebFetch 不能核对的参数 → 拒绝。
- 预批准列表（`tools/WebFetchTool/preapproved.ts`）：约 100 个文档站（Anthropic/Claude 官方、MCP、各语言与框架文档、云厂商文档等），分主机名完全匹配与主机+路径前缀；路径前缀拒绝 `%2f/%5c/%2e` 编码；github.com 与 raw.githubusercontent.com 只放行 anthropics 组织或仓库根/main 分支路径（`chunk-e6aww6q8.js#KTe`、`#rar`）。
- 抓取（`utils.ts · getURLMarkdownContent`）：
  1. URL 校验：≤2000 字符、无凭证、主机至少两段（无点主机提示改用 Bash curl）。
  2. urls 缓存命中直接返回（LRU 按字节 50MB，TTL 来自 `webFetchCacheTtlMs()`）。
  3. 有 CCR web-fetch 代理时走代理：`provenance_denied` 交给 `uin` 向用户确认；目标站错误记入 `targetFailures`（5 分钟）；代理报告的最终 URL 不满足同站规则时当作重定向返回。claude-code-server 无代理时直接报错。
  4. 直连：http 升级为 https；域名预检 `checkDomainBlocklist`（GET `api.anthropic.com/api/web/domain_info`，10s/30s 超时，结果缓存 5 分钟；`settings.skipWebFetchPreflight` 可跳过；限流时错误文本要求不要循环重试）。
  5. `getWithPermittedRedirects`：不自动跟随重定向，自行判断 `isPermittedRedirect`（同协议/端口、去 www 后同主机、无凭证、预批准路径不能跳出预批准）；最多 10 次；10MB 上限、60 秒超时、Accept 优先 text/markdown；出口代理拦截抛 EgressBlockedError；整体 deadline 来自 `nte()`。
  6. 二进制内容另存文件；HTML 用 turndown 转 markdown（超过 1MB 截断）。
- `call` 主流程：
  1. 去重（GrowthBook `tengu_rosy_flute` 或 `CLAUDE_CODE_PROJECTS_SESSION`）：同一对话中同 URL+prompt+offset 已抓过且结果仍可见时，直接返回"Already fetched … use that earlier result"（`tengu_velvet_cairn` 控制）。
  2. 近期失败记忆（`tengu_patient_finch`）：同站 5 分钟内失败过，返回 "Not fetched … failed Ns ago"。
  3. 结果：HTTP 错误 → `formatHttpErrorResult`；站点答复类错误 → "Not fetched…"；重定向 → "REDIRECT DETECTED"，给出要再次调用的参数（子代理调用时附"重定向目标不可信"提示）；子代理调用（`isWebFetchSubagentContext`）→ 原文模式 `Far`；offset 超出 → "Nothing left to read"；预批准站点且为短 markdown → 原文返回；否则用次级模型 `applyPromptToMarkdown`（querySource `web_fetch_apply`，内容截断到 `Tnr`，非预批准站附版权准则），截断时附 "covers only characters a to b" 说明。
  4. 旧缓存副本超过 `Nar` 时附 "stored copy … retrieved on" 说明。
- 与 2.1.88 差异：新增 `offset` 续读、artifact 读取权限链、CCR 代理抓取与 provenance 确认、去重与失败记忆、子代理原文模式、`backgrounding: "detach"`、`permissionCheckFailureDecision`、`CLAUDE_CODE_DISABLE_WEB_FETCH`/`CLAUDE_CODE_EVAL_CONFINED`/`skipWebFetchPreflight`；旧版 `maxResultSizeChars: 100_000` 现为常量 `FD`。缓存上限 50MB 与旧版一致。

#### 6. WebSearch（`tools/WebSearchTool/*`）

- 输入：`query`（≥2）、`allowed_domains?`、`blocked_domains?`（二者不能同时给）；快搜实验 `getWebSearchFastMode()`（`CLAUDE_CODE_WEB_SEARCH_FAST_ARG` 或 GrowthBook `tengu_sleepy_shore`）开启时多一个 `mode`（standard/extended，默认 extended；选 `standard` 时 `isStandardSearchMode()` 为真，次级查询带 `search_profile: "fast"`）。实验关时 `coerceInput` 去掉多余的 mode。
- 输出：`query`、`results`（结果块 `{tool_use_id, content:[{title,url,snippet?}]}` 或文字）、`durationSeconds`、`searchCount`。
- `isEnabled`：策略 `allow_web_search`；提供方 firstParty（或 `gI` 判定的兼容方）/foundry 开，vertex 看模型（`pno`），gateway 关，其他关。
- 权限：`passthrough` + localSettings allow 建议。
- `call`：
  1. 搜索预算 `taskRegistry.getWebSearchBudget()`：用尽时不搜索，返回说明（非交互为每轮、交互为每会话；可能每小时回补；提示用户调高 `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`），并明确禁止用 curl/浏览器/第三方代理绕开。
  2. 有 CCR 代理（`shouldUseCcrWebSearchProxy(session)`）时走代理 route "web-search"。
  3. 否则发起次级流式查询：模型为主循环模型（`tengu_plum_vx3` 开时用 `getSmallFastModel()`），system prompt "You run a web search for another Claude model…"，thinking 关闭，`extraToolSchemas: [{type:"web_search_20250305", name:"web_search", allowed_domains, blocked_domains, max_uses: 8, search_profile?}]`，强制 `toolChoice` 为 web_search，querySource `web_search_tool`，不启用 prompt cache。从流里解析 `server_tool_use` 的 query 增量与 `web_search_tool_result` 数量发进度。foundry 部署需模型支持 web_search。
- 结果映射：`CLAUDE_CODE_WEBSEARCH_CITATIONS` 开且有 snippet 时返回 `search_result` 块（启用 citations）；否则拼文字 + "Links: JSON" + 必须附来源的提醒。
- 与 2.1.88 差异：新增搜索预算、CCR 代理、快搜 mode、citations 模式、`backgrounding: "detach"`、foundry/gateway 分支；旧版 vertex 判断按模型名包含 opus-4/sonnet-4/haiku-4，316 改为 `pno(...)`。

#### 7. Worktree：EnterWorktree / ExitWorktree

##### EnterWorktree（`chunk-kxyd0g16.js#Di`）
- 输入：`name?`（每段只允许字母数字 . _ -，总长 ≤64，`validateWorktreeSlug`（`chunk-e6aww6q8.js#EKe`）校验）或 `path?`（`git worktree list` 中已有的 worktree），二者互斥。输出 `worktreePath`、`worktreeBranch`、`message`。
- `validateInput`：cwd 被固定的子代理（`hasOutermostCallFrame()`）只能用 path；已在 worktree 会话中只能用 path。
- `checkPermissions`：新建直接允许；path 位于 `.claude/worktrees/` 管理位置内直接允许；否则 safetyCheck 询问（会迁移工作目录、写权限与 CLAUDE.md/settings 来源；路径做显示净化 `sanitizeForDisplay`），`classifierApprovable: false`。
- `call`：子代理场景只切该代理 cwd（检查写权限），返回 `contextLayers: [{kind:"working_directory"}]`；主会话 `createWorktreeForSession`（git 或配置的 worktree hooks），切换 cwd/originalCwd，保存 worktree 状态，清理 cwd 相关缓存与系统提示段，消息区分 Created/Reused（已合并上游后重置）/Resumed/Entered。

##### ExitWorktree（`chunk-kxyd0g16.js#Lr`）
- 输入：`action`（keep/remove）、`discard_changes`?。输出含 `originalCwd`、`worktreePath`、`tmuxSessionName`、`discardedFiles/Commits`、`restoredCwd`、`originalCwdMissing`。
- `validateInput`：子代理禁用；无 EnterWorktree 会话 → no-op 说明；进入的是他人/既有 worktree 不能 remove；remove 且未 discard 时 `countWorktreeChanges` 统计未提交文件（含子模块）与新增提交，有则拒绝并要求先确认。
- `call`：keep → `keepWorktree`；remove → 杀 tmux 会话、`cleanupWorktree`；两者都 `restoreSessionAfterWorktreeExit`（原目录不存在时回退 worktree/home/临时目录，不扩大权限锚点，清 worktree 状态与缓存）。
- 外部构建里 `zr`/`Wi`（嵌套 worktree 统计）为空实现。

#### 8. 定时任务：CronCreate / CronDelete / CronList（`tools/ScheduleCronTool/*`）

- 开关：`isKairosCronEnabled()` = `!CLAUDE_CODE_DISABLE_CRON && GrowthBook tengu_kairos_cron (默认 true，5 分钟刷新)`；`isDurableCronEnabled()` = `tengu_kairos_cron_durable`（默认 true）。旧版还要求编译开关 `feature('AGENT_TRIGGERS')`，316 已无此条件。
- CronCreate 输入：`cron`（5 字段本地时间）、`prompt`、`recurring?`（默认 true）、`durable?`。输出：`id`、`humanSchedule`、`recurring`、`durable`、`nextFireAt`。
  - 权限：auto 模式 passthrough（交分类器），否则 allow。
  - 校验：特定上下文拒绝（`wee(ctx)`）、表达式非法、一年内无匹配日期、任务数 ≥50、队友不能建 durable。
  - durable 写 `.claude/scheduled_tasks.json`，否则只在会话内存；循环任务 `f$e` 天后自动过期（取自默认抖动配置）。prompt 要求避开 :00/:30、实时监控改用 Monitor 工具、只在 REPL 空闲时触发。
- CronDelete：按 id 删除；不存在或属于其他代理时拒绝。CronList：只读，代理上下文只列本代理任务，附下次触发时间。

#### 9. RemoteTrigger（`tools/RemoteTriggerTool/*`）

- 输入：`action`（list/get/create/update/run/create_webhook_trigger/list_runs/get_run_log）、`trigger_id`?、`session_id`?、`cursor`?、`body`?。输出 `{status, json, summary?}`，结果文本 "HTTP 状态 + JSON + 摘要"。
- `isEnabled`：`logEventTo1P_10() && vt()`（claude.ai 账号类前置）、非 `CLAUDE_CODE_REMOTE`、策略 `allow_remote_sessions` 与 `allow_routines`。旧版用 GrowthBook `tengu_surreal_dali`。
- 权限：auto 模式交分类器，否则允许；只读判定按 action。
- 调用：`/v1/code/triggers`、`/v1/code/triggers/{id}`、`/run`、`/v1/code/webhook-triggers`、`/v1/code/sessions?trigger_id=`（10 条/页）、`/v1/code/sessions/{id}/events`（200 条/页，desc），`anthropic-beta: ccr-triggers-2026-01-30`，`auth: teleport-org`，20 秒超时。create/update 前用 `fillUserEventFields` 补全用户消息事件；list_runs/get_run_log 结果压缩成可读日志并标注"内容不可信"；create/update 后附调度摘要与 claude.ai 管理链接。
- 与 2.1.88 差异：旧版只有 list/get/create/update/run 五个 action；316 新增 webhook 触发器、运行记录与运行日志查看、`enablesCodeExecution`。

#### 10. SendUserMessage / Brief（`tools/BriefTool/*`）

- 名称 `SendUserMessage`，别名 `Brief`；`briefStandalone`。
- `isEnabled`：`fH()`（`vV() && isBriefEntitled() || d5o()`；`isBriefEntitled` = `CLAUDE_CODE_BRIEF` 或 GrowthBook `tengu_kairos_brief`）或 `Mqe()`（`CLAUDE_CODE_PEWTER_OWL_TOOL` 或 `pewter_owl_tool`）。只开 `Mqe` 时输入只有 `message`。
- 输入：`message`（markdown）、`attachments?`（本地路径，或已上传 `{file_uuid, file_name, size, is_image, media_type}`）、`status`（normal/proactive）。
- 附件校验（`attachments.ts · validateAttachmentPaths`）：diskless 会话不能附路径；拒绝 URL、UNC、`/net` 等会触发网络挂载的路径；`--restricted` 只能发工作目录内文件；`permissions.blockReadsOutsideWorkingDirectories`；必须是存在的普通文件。
- 上传通道（`getAttachmentUploadLane`）：`CLAUDE_CODE_ATTACHMENTS_BY_PATH` → none；REPL bridge → repl；`CLAUDE_CODE_BRIEF_UPLOAD` → env_brief_upload；`CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE` → env_ccr；`CLAUDE_CODE_REMOTE` → env_byoc；SDK 托管（`tengu_async_goblet`）→ sdk_hosted。
- 上传（`upload.ts · uploadBriefAttachment`）：只在 firstParty 提供方、非仅必要流量、`allow_send_file` 策略允许时上传到 `` `${getBridgeBaseUrl()}/api/oauth/file_upload` ``（multipart，35 秒超时）；413 记住服务器上限 10 分钟；可重发（最多 3 次，冷却与并发限制）；bmp/tiff/heic/heif/avif 生成 png/jpeg 预览副本，大图缩放；还支持写入项目文件夹（door 通道，重名加时间戳）。
- 结果：附件送达情况；SDK 本地渲染时提示远程查看端看不到；失败时 `is_error`。
- 与 2.1.88 差异：旧版 isEnabled 为 `isBriefEnabled()`；316 加入 `Mqe()` 第二开关、已上传附件对象、上传通道体系、预览副本与重发、项目文件夹写入。

#### 11. 本组读到的环境变量与开关汇总

| 名称 | 类型 | 作用 | 位置 |
|---|---|---|---|
| `CLAUDE_CODE_DISABLE_WEB_FETCH` | env | 关闭 WebFetch | `chunk-e6aww6q8.js#Rw` |
| `CLAUDE_CODE_EVAL_CONFINED` | env | 不对预批准站点自动放行 | 同上 |
| `CLAUDE_CODE_PROJECTS_SESSION` | env | 打开 WebFetch 去重历史 | 同上 |
| `allow_web_fetch` / `allow_web_search` / `allow_remote_sessions` / `allow_routines` / `allow_send_file` | 策略开关 | 对应工具或上传 | 各工具 isEnabled / 上传检查 |
| `skipWebFetchPreflight` | settings | 跳过域名预检 | `chunk-e6aww6q8.js#k1o` |
| `tengu_rosy_flute`、`tengu_velvet_cairn`、`tengu_patient_finch` | GrowthBook | WebFetch 去重影子日志、去重提示、失败记忆 | `chunk-e6aww6q8.js#Rw` |
| `CLAUDE_CODE_WEB_SEARCH_FAST_ARG` / `tengu_sleepy_shore` | env / GrowthBook | WebSearch 快搜 mode | `chunk-22r83hv0.js#XAt` |
| `tengu_plum_vx3` | GrowthBook | WebSearch 改用小模型 | `chunk-kxyd0g16.js#wo` |
| `CLAUDE_CODE_WEBSEARCH_CITATIONS` | env | search_result 引用块 | 同上 |
| `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` | env | 搜索预算（提示文本中出现，预算实现在 taskRegistry） | 同上 |
| `CLAUDE_CODE_DISABLE_CRON`、`tengu_kairos_cron`、`tengu_kairos_cron_durable` | env / GrowthBook | Cron 工具与持久化 | `chunk-gzp2tk59.js#DP`、`#Cxe` |
| `CLAUDE_CODE_BRIEF`、`tengu_kairos_brief`、`CLAUDE_CODE_PEWTER_OWL_TOOL`、`pewter_owl_tool` | env / GrowthBook | Brief 工具 | `chunk-tvzx5sxd.js#Nnr`、`chunk-gt4x42hj.js#Mqe` |
| `CLAUDE_CODE_ATTACHMENTS_BY_PATH`、`CLAUDE_CODE_BRIEF_UPLOAD`、`CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE`、`CLAUDE_CODE_REMOTE`、`tengu_async_goblet` | env / GrowthBook | Brief 附件上传通道 | `chunk-qq39x404.js#VVn` |
| `SLASH_COMMAND_TOOL_CHAR_BUDGET`、`skillListingBudgetFraction`、`skillListingMaxDescChars`、`tengu_typed_pebble` | env / settings / GrowthBook | skill 列表预算 | `chunk-e6aww6q8.js#xwt`、`#eGt` |
| `tengu_cinder_plover`、`tengu_cinder_wren` | GrowthBook | AskUserQuestion prompt 追加文本 | `chunk-a91k35xs.js#Hoe` |
| host `launchOptions.extendedQuestionsEnabled / questionOptionDescriptionsOptional / diskless / disableSlashCommands` | 启动选项 | AskUserQuestion 扩展、计划模式 diskless、Skill 开关 | `chunk-ndmse9kj.js#zMe`、`#qws`、`#Bo`、`#Wb` |
| `CLAUDE_AGENT_SDK_MCP_NO_PREFIX` | env | SDK MCP 工具不加 mcp__ 前缀 | `services/mcp/client.ts` |

#### 12. 未解之处

- `chunk-a91k35xs.js#Hoe` 的 isEnabled 是 `canPromptUserForPermission()`，依赖 `getAllowedChannels()`（提问通道列表）与权限提示工具名（`hasPermissionPromptTool(getPermissionPromptToolName())`），具体通道来源未追。
- `chunk-e6aww6q8.js#Rw` 的 `FD`（WebFetch maxResultSizeChars）、`Tnr`（次级模型输入上限）、`Nar`（旧副本阈值）、`webFetchCacheTtlMs()`（`chunk-g54kbxqw.js#E7o`，缓存 TTL）的值在其他 chunk，未读取。
- `chunk-kxyd0g16.js#wo` 搜索预算 `taskRegistry.getWebSearchBudget()` 与 `maxWebSearchesPerSession()` 的具体上限未追。
- `chunk-9ycd12hk.js#G` 的 `SFe()`（ReadMcpResource 是否需要权限）含义未确认。
- `chunk-a5k9jscj.js#vQe`（SkillTool）用到的 `checkSkillPermission`、`reservedSkillRuleMatch`（held-back 规则）细节属于 Skill/权限领域，未展开。
- RemoteTrigger isEnabled 中的 `logEventTo1P_10()` 与 `vt()` 是名字配错的函数，含义只按调用位置推测为账号/订阅前置。

## 7. 配置项、环境变量与特性开关（core 部分；各工具的见 6.x 各节）

| 名称 | 类型 | 作用 | 位置 |
|---|---|---|---|
| `ENABLE_TOOL_SEARCH` | env（也可来自管理员层环境） | 工具搜索模式：未设/真值 → tst；假值 → standard；`auto`/`auto:N` → tst-auto；`auto:0`/`auto:100`；`force`（仅 firstParty）强制开 | `getToolSearchMode`、`isToolSearchForceOverride` |
| `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | env | 关闭工具搜索（非 force 时） | `isToolSearchDisabledByBetas` |
| `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` | env | 并发工具上限，默认 10 | `getMaxToolUseConcurrency` |
| `CLAUDE_CODE_SIMPLE` | env | 简单模式工具集（Bash/PowerShell/Read/Edit） | `getTools` |
| `CLAUDE_CODE_ENABLE_TASKS` | env | `false` 时用 TodoWrite 代替 Task* | `isTodoV2Enabled` |
| `CLAUDE_CODE_ENABLE_TODO_TOOLS` | env | 新模型上也启用 TodoWrite/Task* | `chunk-e6aww6q8.js#t6` |
| `CLAUDE_CODE_ENABLE_REFRESH_MCP_TOOLS` | env | 注册 RefreshMcpTools | `getAllBaseTools` |
| `CLAUDE_CODE_ENTRYPOINT=local-agent` | env | 关闭嵌入式搜索（恢复 Glob/Grep）；REPL 模式判定 | `hasEmbeddedSearchTools`、`isReplModeEnabled` |
| `CLAUDE_CODE_USE_POWERSHELL_TOOL` | env | 注册 PowerShell | `isPowerShellToolEnabled` |
| `CLAUDE_CODE_WEB_FETCH_AGENT` | env | WebFetch 改由 web-fetch 子代理承担（getTools 去掉 WebFetch） | `chunk-e6aww6q8.js#mjr`/`#V2` |
| `CLAUDE_CODE_SESSION_KIND=bg` | env | 后台会话：EnterWorktree 不延迟；TodoWrite/Task* 模型门放行 | `isBgSessionEnterWorktree`、`t6` |
| `--tools` / `--allowedTools` | CLI | 点名 Glob/Grep → `searchToolsOptIn`；点名 TodoWrite/Task* → `todoToolsOptIn` | `permissionSetup.ts` |
| `tengu_tool_search_unsupported_models` | GrowthBook | 不支持 tool_reference 的模型名模式（默认 claude-3 系列） | `getUnsupportedToolReferencePatterns` |
| `tengu_non_deferrable_builtins` | GrowthBook（可按模型分键） | 总是内联的内建工具；托管设置 `non_deferrable_builtins` 同义 | `getNonDeferrableBuiltins` |
| `tengu_deferred_stub_tool` | GrowthBook（默认 true） | 发送 DeferredToolPlaceholder | `gun` |
| `tengu_shiny_stardust` | GrowthBook（默认 false） | ReportFindings/Workflow/ShareOnboardingGuide 也延迟 | `isDeferSpecialToolsEnabled` |
| `tengu_drifting_heron` | GrowthBook（默认 true） | 关闭时 PushNotification 可不延迟 | `isPushNotificationDeferrable` |
| `tengu_fancy_milner` | GrowthBook（默认 true） | ToolSearch 识别"已按值内联"的工具 | `isToolDefinedByValueEnabled` |
| `tengu_tranquil_starlight` | GrowthBook | Chrome select 查询加 browser_batch | `maybeAddBrowserBatchToChromeSelect` |
| `tengu_clever_orbit` | GrowthBook（默认 false） | 同 `CLAUDE_CODE_WEB_FETCH_AGENT` | `isWebFetchAgentFlagOn` |
| `tengu_velvet_ibis` | GrowthBook（对象，按工具名） | 覆盖大结果持久化阈值 | `getPersistenceThreshold` |
| `tengu_serialized_petal` | GrowthBook（数值，默认 0） | 用户中断后放弃未结束工具调用的宽限毫秒 | `StreamingToolExecutor` |

## 8. 与 2.1.88 的差异（core 部分；各工具的差异见 6.x）

| 变化 | 316 证据 |
|---|---|
| 工具定义改为"定义对象 + `create(ctx)` 工厂"，工厂统一包装 call/validateInput/checkPermissions，并支持"工具在别处运行"（原生工具转发、跨机器） | `chunk-g54kbxqw.js#on`；88 个定义含 `create` |
| 新增约 35 个工具字段：`backgrounding`、`remoteExecution`、`coerceInput`、`ruleContentField`、`whenToUse`、`stripForStorage/Creation`、`outputSchemaAcrossProcesses`、`persistenceThresholdCeiling`、`suppressesAlwaysAllowRule` 等 | 第 3.2 节统计（`artifacts/tmp/tools/core/toolfields.mjs`） |
| 内建工具从约 40 个增至约 80 个；大部分新工具懒 require | `chunk-kxyd0g16.js#Yb`/`chunk-kxyd0g16.js#Zi`/`chunk-kxyd0g16.js#fa` |
| Glob/Grep 默认不注册（嵌入式搜索变成构建常量），新增"点名即恢复"的 searchToolsOptIn 与 Windows Git Bash 条件 | `chunk-e6aww6q8.js#FC`/`chunk-e6aww6q8.js#Xoe`、`chunk-ndmse9kj.js#Uws`/`chunk-ndmse9kj.js#Bws` |
| LSP、Worktree 工具总是注册（旧版靠 `ENABLE_LSP_TOOL`、`isWorktreeModeEnabled`） | `Dqe()`、`YNt()` 恒 true |
| TodoWrite/Task* 增加主模型门（新模型默认关） | `chunk-e6aww6q8.js#t6` |
| 工具搜索：默认模式仍是 tst，但删除了"自定义 base URL 时关闭"；新增 force、HIPAA/实验 beta 关闭、Vertex/Foundry 判定、本对话锁（held_off）、端点拒绝记忆、`tool_addition` 模式、DeferredToolPlaceholder、不可延迟列表、`whenToUse` 宣告行、按值内联（surfaced/again）、describe hook 改写延迟结论 | `utils/toolSearch.ts`、`tools/ToolSearchTool/prompt.ts` 各函数 |
| 不支持 tool_reference 的默认模型从 `haiku` 改为 claude-3 系列 | `chunk-mp7v59a0.js#T` |
| `getDeferredToolsDelta` 从"added/removed"扩展为 pending/needsAuth/failed MCP、撤回/恢复、线上隐藏、surfaced/loaded 等十余个字段 | `chunk-e6aww6q8.js#V6s`/`chunk-e6aww6q8.js#Jke` |
| ToolSearch 新增：已内联工具提示、MCP 服务器等待与重拨、失败原因分类文案、查询长度上限 | `chunk-e6aww6q8.js#ujr`、`chunk-s61vbvea.js#Mqo` |
| 执行：`contextModifier` → `contextLayers`；新增 `detached` 结果、`afterResultCommitted`、中断宽限放弃、隔离锁、运行位置判定、工作目录变化检查、"选项本会话不可用"/"schema 未发送"提示 | `chunk-ha3km179.js#oi`、`chunk-e6aww6q8.js#$B`/`chunk-e6aww6q8.js#w3r`/`chunk-e6aww6q8.js#QNn`/`chunk-e6aww6q8.js#S3r` |
| 工具池组装：机器级 MCP 工具、遮蔽内建规则、`TOOL_CATALOG` | `chunk-kxyd0g16.js#qNt`/`chunk-kxyd0g16.js#h5` |
| Config、Tungsten、REPL、TeamCreate/TeamDelete、TaskOutput 不在外部构建中 | 这些工具在外部构建中为 null；退役名单 `chunk-e6aww6q8.js#_0e` |

## 9. 未解之处

- `TOOL_POOL_MEMO_TTL_MS`（= 30000；压缩名 NEo，在 `chunk-kxyd0g16.js#Z$` 语句内）：工具池记忆化的 TTL，具体缓存位置未追到。
- `chunk-e6aww6q8.js#t6` 的旧模型集合 `TODO_TOOL_LEGACY_MODELS`（`chunk-e6aww6q8.js#ZCr`）与 `mainLoopCanonicalModel()` 规范化细节由 agent 组读出，未在运行时验证；交互模式请求 13 个工具（`-p` 为 12）的差异未逐项核实。
- `Aee`（`chunk-a76knw89.js` 一带，getTools 的权限过滤）只读了开头：deny 规则、`effectiveMaxPermission === "blocked"`、`--tools` 启动列表外的工具（`tool_outside_launch_list`）；完整规则属于 permissions 领域。
- `chunk-ae5g0zb5.js#Ku`（旧版名 `isSyntheticOutputToolEnabled`）条件与 StructuredOutput 的关系存疑，可能是错配。
- 远程/宿主执行（`nae`、`Jo`、`_si`、`hosts.runToolUse`）只看到入口，转发协议未深入。
- 各分组的未解之处见 6.1–6.4 各自末节。

## 10. 引用校验结果

校验时间 2026-11-04 06:40（UTC），对象为当时的 `reconstructed/`。脚本检查本文所有代码样式引用：路径是否存在（相对仓库根，或相对 `reconstructed/src/`，`.ts/.tsx` 对应 `.js`）；声明 id 是否在 `reconstructed/symbols.jsonl`；"路径 · 函数名"中的函数是否属于该文件；标识符与字面量是否出现在 `reconstructed/symbols.jsonl` 或阅读树代码中。在 2.1.316 找不到、但在 2.1.88 源码（`references/claude-code-analysis/src`）中存在的，计为"只在 2.1.88 中存在"（删除项、旧名，属预期）。

- 共检查 2571 处引用：路径 223/224（另 1 个只在 2.1.88 中存在），名字 1627/1637（另 10 个只在 2.1.88 中存在），字面量 374/378（另 4 个只在 2.1.88 中存在），声明id 329/329，路径·函数 3/3；占位符与含空格的说明性文字 371 处未检查。
- 只在 2.1.88 中存在（删除项或旧名，预期如此）：`aGt`、`validateIncompleteCommands`、`validateIFSInjection`、`validateObfuscatedFlags`、`validateBraceExpansion`、`validateMidWordHash`、`assistantAutoBackgrounded`、`ASSISTANT_BLOCKING_BUDGET_MS`、`p3()`、`USER_TYPE=ant`、`cell-N`、`tengu_hive_evidence`、`tools/MCPTool/classifyForCollapse.ts`、`tengu_surreal_dali`
- 未通过：0 处。
