# pl318-5：放置批次过程记录

## 范围与结果

- 306 个声明、75,600 字节、138 个 chunk，**全部放置**（`unplaced` 为 0），`check-placement.mjs` 输出 `0 problems`。
- 目标 144 个文件：86 个新建，58 个并入既有模块。
- 225 条 `docs`（导出的、被多处使用的、超过 300 字节的），86 条新文件说明。

判定顺序：同 chunk 前后最近声明同路径 → 并回该文件（51 条）；`old.path`（2.1.316 有配对，11 条，`status` 全是 `conflict`/`equiv`）→ 沿用；其余按主题判定（244 条）。判定依据按强弱：门面导出名、`analysis/scan/decls.jsonl` 的 `strings`/`props`/`refs`、引用者已放置路径、chunk 内相邻声明、`reconstructed/src` 里既有文件的导入点、`node tools/versions/inspect.cjs` 的 316 原文、`references/claude-code-analysis/src` 的目录惯例。

## 本批的主线：2.1.318 的 Code 模式（REPL/Eval）

pl318-1 已经确定那一大批 REPL 实现落在 `tools/REPLTool/`。本批补齐它周边散落的一层，文件数最多的是 `utils/codeMode/`（24 个新文件）：

- 会话与恢复：`sessionResumeHooks.ts`、`remoteSessionId.ts`、`replSessionEnd.ts`、`replTurnLedger`（`query/replTurnLedger.ts`）
- 异步 eval 通道：`outputEnvelope.ts`、`pendingEvals.ts`、`receiptEvalId.ts`、`asyncReplReceipt.ts`、`waitForNews.ts`、`scriptCallStream.ts`、`scriptRowUUIDs.ts`、`scriptErrorMessages.ts`、`scriptAskDeclined.ts`、`localScriptTask`（`tasks/localScriptTask.ts`）
- 事件与状态：`utils/pollEvents/replEvalEvents.ts`、`utils/pollEvents/evalSettleKind.ts`、`runningScripts.ts`
- 能力与闸门：`hiddenToolNames.ts`、`modHooksGate.ts`、`modStartupCheck.ts`、`inProcessBuiltinRefusal.ts`、`scriptHelperNames.ts`、`scriptHelperPairs.ts`、`typedEvents.ts`、`vscodeExtensionStream.ts`、`modelSwitchNotice.ts`、`displayableScriptDescription.ts`
- 开关与常量：`constants/codeModeShape.ts`、`utils/env/codeModeEnv.ts`、`utils/permissions/connectorCardAllows.ts`
- 界面：`components/codeMode/CodeModeOptIn.tsx`

`chunk-3tew89vt.js` 确认是 `/use-case` 命令本体（`screens/repl/commandDialogLoaders.js` 里 `"use-case": () => import("../../_unattributed/chunk-3tew89vt/call.lazy.js")`），放 `commands/use-case/useCase.ts`。

## 其余主题与新建文件

- **MCP 目录读取**：`readMcpDirectory.ts` / `readMcpDirectoryV2.ts` —— 同一个 `resources/directory/read` 分页读取按 SDK 代各有一份，`services/mcp/runtimeTripwire.ts` 的 `mcpDirectoryReadModule()` 按 `mcpSdkGeneration()` 二选一 require。目录分页上限与 InvalidParams 退化逻辑一致，只有 SDK 的 Client 与错误类型不同。
- **MCP 与连接器**：`commands/mcp/addWeb.ts`（`/mcp add --web` 完整流程，含 claude.ai 目录查询、密钥泄露检测、交互轮询）、`services/mcp/redirectUriOnlyRefusal.ts`、`utils/codeMode/mcpNeedsAuth.ts`、`tools/ListConnectorsTool/UI.tsx`、`tools/SuggestConnectorsTool/UI.tsx`、`hooks/notifs/useMcpConnectivityStatus.tsx`（MCP 连接配置对齐）、`services/mcp/skillDirectoryResource` 的 `I`（REPL/MCP serve 判定）。
- **mcp serve 工具宿主**：`toolHostIds.ts`、`shellDirectoryHeld.ts`、`readBaselineOfCall.ts`、`remote/tools/reauthoredRequest.ts`、`remote/tools/replRowTools.ts`。
- **云端会话**：`commands/send-to-project/{sendToProjectBridge,remoteControlOffRequest}.ts`、`components/projects/{continueInProjectsComposeRequest.ts,askMoveFirstMessage.tsx}`、`utils/cloudSession/localSessionMoveCandidate.ts`、`remote/startRefusalNotice.ts`、`cli/startup/wrapUpPrompt.ts`、`commands/clear/clearCommand.ts`。
- **登录与凭证**：`cli/handlers/performLogout.ts`、`utils/auth/credentialExpiry.ts`、`utils/secureStorage/preservedTmpNotice.ts`。
- **Artifact**：`tools/ArtifactTool/docsCreateWake.ts`、`services/tools/streamingStopNotice.ts`、`components/useMaxOverflow.ts`。
- **插件/hook**：`plugins/hooksModules/{privacyPluginName,loadedModuleMatchers}.ts`、`utils/hooks/{personalHooksOff,asyncHookRegistry,hookRunContext}.ts`；`chunk-d5d5va77`+`d775357q` 是“插件是不是会检查工具调用的 mod”的判定与启动检查。
- **安装器与重启**：`utils/nativeInstaller/{bundlePaths,lockDir}.ts`、`utils/relaunchHintFlags.ts`、`entrypoints/selfHostedRunner/runId.ts`。
- **遥测**：`utils/telemetry/seatAttributes.ts`（anthropic.plan / seat_type 映射）。
- **上游连接池**：`upstreamproxy/ccrPoolRetire.ts`（会话服务器无响应时退役连接）。
- **内嵌资源**：`skills/bundled/assets/{storybookCompare,storybookSource}.ts`（`chunk-6hqkes0x` 的 `SKILL_FILES` 表把这两个 chunk 当作 storybook 技能的 `lib/source-storybook.mjs`、`storybook/compare.mjs`）、`tools/REPLTool/preludes.ts`（`chunk-n51jggtb` 新增的 `shell.prelude`）。

## 发现的 2.1.318 新功能（供版本变化清单）

1. `/use-case` 命令与 Life Sciences 使用场景选择；`/goal` 命令实现（`commands/goal/goalCommand.ts`）。
2. `/mcp add --web`：把 claude.ai 连接器加进来，含 https 与密钥泄露校验、目录命中、组织策略与团队/企业分支，交互轮询连接结果。
3. Code 模式周边：一次性征询对话框与重启、`<repl-output>` / `event kind="repl-eval"` 异步通道、eval 结算 "lost" 状态、pending eval 状态行、脚本内 ask 被拒的中断原因、mod 插件检查工具调用时的拒绝、Code 模式模型提示、会话恢复来源。
4. MCP 资源目录读取（directoryRead 能力 + `resources/directory/read` 分页，按 SDK 代两份）。
5. 发送到项目前自动开 Remote Control（预检设备与账号）、把会话移到云端的对话框、云端启动被拒的说明（含连接 GitHub 的直达链接）。
6. 登录凭证到期窗口告警；登出流程重做（分来源撤销、重登录保留、配置未保存告警）。
7. 会话服务器连接池退役、`request_reauthored` 闸门、ReadEnvironment 的 `toolHost` 字段。
8. 重启参数白名单（`CLAUDE_CODE_RELAUNCH_RESUME_HINT_FLAGS`）。
9. anthropic.plan / anthropic.seat_type 遥测。
10. 工作流被终止/失败/已结束的停止原因文案、`local_script` 任务类型。

## 无法判断/按主题就近归属

无留空条目。以下几处证据偏弱，命名批次可调：

- `chunk-9sx87q0n.js#RGs` 放 `utils/messages/ultrathinkOrigin.ts`：唯一引用者是同文件族的 `Zln`（ultrathink 消息判定），函数本身只是“是否外部来源”的复合判定。
- `chunk-0p9n1dy7.js#ZBt`（frame→快照缓存）放 `remote/remoteSessionEvents.ts`：前一个已放置声明是同文件，后一个是 `workflows.tsx`。
- `chunk-8tee4zrd.js` 五个声明（pending eval 文案与状态行）放 `utils/codeMode/pendingEvals.ts`：chunk 内无相邻已放置声明，靠 `enqueuePollEvent`、`REPL_STATUS_EVENT_KIND`、`late/detached/notYetStarted` 字面判定。
- `chunk-35jvkmb5.js#uq`/`z_s` 放 `utils/errors/hostError.ts`：`chunk-rzkdw64q.js` 的 `export{uq as isHostError,z_s as vmThrowToString}` 给出名字，但 316 里没有对应文件。
- `chunk-nw81sbzb.js#$fs` 并入 `utils/mediaLimits.ts`（值 512000 与 `MODEL_COPY_IMAGE_BYTES` 相同）、`Ee` 并入 `utils/computerUse/wrapper.tsx`（同 chunk 的 `HIi` 用它做“副本可用”判定）。两者在现代码路径上都是 `utils/mediaLimits` / `utils/computerUse` 的私有量。
- `chunk-vn9gygmp.js`（`shell.prelude.js`）放 `tools/REPLTool/preludes.ts`，与 pl318-1 已建的 preludes 文件同主题；`chunk-n51jggtb` 的 `No()` 用 `require("./chunk-vn9gygmp.js")` 取它。
- `chunk-46zjpx8m.js#V`/`H` 与 `chunk-d6ed5cww.js#rXs` 都在 `commands/send-to-project/`：`V`/`H` 是 Remote Control 前置流程，`rXs` 是项目名兜底，`d6ed5cww` 的后一个已放置声明就是 `projectArgs.ts`。

## 特别说明

- `chunk-0f2rgfjp.js` 与 `chunk-5c6dj2v2.js` 的声明内容除 SDK 符号名外完全相同（`y` 657 字节、`u` 120 字节、上限常量），是同一源文件的两次编译产物（v1/v2 SDK）。分别放 `readMcpDirectory.ts` / `readMcpDirectoryV2.ts`。
- `chunk-c3ck1mmp.js` 与 `chunk-srde02wt.js` 各只有一个同名同内容函数（`c`，渲染 tool_ui）；两者分别被 `chunk-wjygkcr4.js` 作为 ListConnectors / SuggestConnectors 的 `ui` 引用，故各自放对应工具的 `UI.tsx`。
- 300 字节以上的 `chunk-8tee4zrd.js#h`（1614）、`chunk-v6cve82g.js#Ge`（6712）、`chunk-js21vjmb.js#g`（2091）都是单函数，随所在文件走，不再拆分。
