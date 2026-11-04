# 放置组 rest（place-rest）过程记录

日期 2026-11-03。范围是 `analysis/segments/leftover-work.json`：最终整合后仍未落位的 372 个模块、2,273 个声明、785,860 字节。

- 197 个 `_new/<导出名>.ts` 门面模块，共 1,925 个声明 / 711,524 字节。
- 13 个 `_misplaced/…` 模块，共 15 个声明 / 2,849 字节。
- 162 个 `_unattributed/…` 小段，共 333 个声明 / 71,487 字节。

## 1. 结果数字

| 项 | 数值 |
| --- | --- |
| 已放置 | 2,273 / 2,273 个声明，785,860 字节（100%） |
| 未放置 | 0 |
| 目标路径 | 351 个 |
| 其中并入已有模块 | 149 个路径（`analysis/segments/modules.json` 已有），350 个声明 / 90,845 字节 |
| 其中新建文件 | 202 个路径（含 vendor 7 个），1,923 个声明 / 694,015 字节 |
| semantic 名 | `naming/semantic-prest.jsonl` 596 条，置信度 0.75 |
| 中文说明 | `naming/docs-prest.jsonl` 688 条 |
| 模块说明 | `naming/modules-prest.json` 351 条，新文件以"2.1.316 新增"开头 |

semantic 的覆盖范围如下：

- 范围内所有 ≥150 字节、名字仍是压缩名的顶层声明（515 个），全部命名。
- `_unattributed`、`_misplaced` 中所有仍是压缩名的小声明，也全部命名。
- 门面原名（facade）和其他 semantic 文件已经命名的键都没有重写。已校验：596 条与其他 semantic 文件、facade.jsonl 的 (file,key) 重合 0 条。
- 键是绑定标识符在 `original/<chunk>` 中的字节偏移。已校验：596 条偏移处都是对应的压缩名。

docs 的覆盖范围：

- 197 个门面模块的主导出（由 `naming/final/top.json` 中与门面导出名同名的声明找出），每个写一条。
- 每个 ≥150 字节且命名过的声明，写一条。

## 2. 方法与脚本（`artifacts/tmp/prest/`）

| 脚本 | 作用 |
| --- | --- |
| `digest.mjs` → `digest.txt` | 每个剩余模块一段。内容包括：当前最佳名（top.json）、旧版同名导出（`analysis/reference/decls.jsonl`）、外部调用者与被调用者所在路径（按次数排序）、chunk 内左右邻居的路径、字符串。 |
| `decisions.tsv` | 人工判定表，每行 `模块路径或声明 id → 目标路径`。声明 id 优先，用来拆分一个模块。 |
| `pending.mjs` | 列出尚未判定的模块；加 `--peek N` 打印其声明源码。 |
| `build.mjs` → `naming/placement-grest.json`、`targets.json` | 生成放置表并校验：键都在 decls.jsonl 里，路径有扩展名，没有 `_new/`、`_unattributed/`、`_misplaced/` 前缀。另外区分并入已有模块和新建两类。 |
| `unnamed.mjs` → `unnamed.txt`、`minified.txt`、`toname.txt` | 列出范围内仍是压缩名的声明及其命名键。 |
| `names*.tsv`、`docs-extra.tsv` | 手写的名字、说明和门面主导出的说明。 |
| `emit.mjs` → `semantic-prest.jsonl`、`docs-prest.jsonl` | 生成命名和说明。键取自 top.json；top.json 没有的键，按源码中的声明关键字定位。 |
| `modules-desc.tsv`、`modules.mjs` → `modules-prest.json` | 生成模块说明。优先用手写说明，其次用门面主导出说明的首句，再次用其他组已有的模块说明。 |

判定依据按强度排列：

1. 门面导出名与旧版同名导出。
2. 字符串：日志前缀如 `[uds-messaging]`、`[deviceBridge]`、`[bridge:projects]`、`settingsPrime:`；遥测名 `tengu_*`；工具名；环境变量。
3. 唯一或集中的调用者。
4. chunk 内邻居。

门面模块原则上整体放置。下面两个是例外，它们的声明来自多个 chunk，是同名导出被合并成了一个门面，所以按 chunk 拆开：

- **`_new/DESCRIPTION.ts`**：来自 5 个 chunk，每个是一个工具的提示词。拆到 `tools/EndConversationTool/prompt.ts`、`tools/SendUserFileTool/prompt.ts`、`tools/SearchMcpRegistryTool/prompt.ts`、`tools/ListConnectorsTool/prompt.ts`、`tools/SuggestConnectorsTool/prompt.ts`。
- **`_new/call.ts`**：来自 3 个 chunk。拆到 `commands/restart/restart.ts`、`commands/skill-doctor/skill-doctor.ts`、`commands/stop/stop.ts`。

此外，`_unattributed/chunk-18hwfzwa/part-001`、`-004`，`chunk-hantmvxa/part-001`，`chunk-vrb44rx7/part-001`，以及 `chunk-dcmhvw5a`、`chunk-z0q4jgnc` 的 lodash 片段，也按声明拆开。原因是同一 part 内的声明属于不同的调用模块。

## 3. 放回旧版路径的门面模块（导出名与旧版重合）

| 门面 | 目标 |
| --- | --- |
| `_new/applyCoordinatorToolFilter.ts` | `utils/toolPool.ts` |
| `_new/getDefaultAppState.ts` | `state/AppStateStore.ts` |
| `_new/setReplBridgeHandle.ts` | `bridge/replBridgeHandle.ts` |
| `_new/checkManagedSettingsSecurity.ts` | `services/remoteManagedSettings/securityCheck.tsx` |
| `_new/startCapturingEarlyInput.ts` | `utils/earlyInput.ts` |
| `_new/FocusManager.ts` | `components/design-system/color.ts`（该门面只剩 `color` 一个声明） |
| `_new/validateExplicitMessagingSocketPath.ts` | `utils/udsMessaging.ts`（旧版 setup.ts 从 `./utils/udsMessaging.js` 导入 startUdsMessaging） |
| `_new/precheckLaunchScope.ts` 及其 helpers | `commands/review/reviewRemote.ts`（checkOverageGate、launchRemoteReview 同名） |
| `_new/WORKFLOW_JOURNAL_HOST_COPY_FLAG.ts` | `tools/WorkflowTool/constants.ts`（旧版 WORKFLOW_TOOL_NAME 所在） |
| `_new/performRename.ts`、`_new/callUpgradeFromSurface.ts`、`_new/applyAutoCompactWindow.ts` | `commands/rename/rename.ts`、`commands/upgrade/upgrade.tsx`、`commands/autocompact/autocompact.ts` |
| `_new/*.helpers-*.ts` | 同前缀的主模块，或其调用模块（main.tsx、query.ts、setup.ts） |

## 4. 新建目录与文件（按主题）

没有新建顶层目录。新文件都放在其他组已经建立的目录下，例如 `services/artifacts/`、`tools/ArtifactTool/permissions/`、`remote/tools/serve/`、`services/remoteTools/`、`services/deviceBridge/`、`entrypoints/mcpServe/`、`cli/handlers/pluginTest/`、`utils/fsAnchor/`、`plugins/functionHooks/dispatch/`。

- **跨会话消息（UDS）**：`utils/udsMessaging.ts`（63 声明 33 KB）、`utils/peerIdleSubscriptions.ts`、`utils/crossSessionHoldReceipt.ts`、`utils/crossSessionMessagingGate.ts`、`utils/sessionNameUniqueness.ts`、`utils/peerSessions/listAgents.ts`、`utils/peerFileReceive.ts`、`utils/externalEventWake.ts`。
- **Remote Control 桥接**：
  - 收件箱：`bridge/sessionInbox.ts`、`bridge/sessionInboxPointers.ts`、`bridge/supervisedInbox.ts`。
  - 设备签名：`bridge/deviceBinder.ts`、`bridge/clientEventSigner.ts`、`bridge/deviceUnboundCreates.ts`。
  - Projects 线程回复：`bridge/projectsReplyEvaluation.ts`、`bridge/headlessHearthMount.ts`、`bridge/hearthBinding.ts`。
  - 工作区 diff：`bridge/workspaceDiff.ts`，51 声明 16 KB。
  - 其余：`bridge/worktreeState.ts`、`bridge/forkHistoryUpload.ts`、`bridge/bridgeSlashCommands.ts`、`bridge/gitSessionContext.ts`、`bridge/remoteControlHelp.ts`。
- **设备桥与远程工具**：
  - 设备桥：`services/deviceBridge/deviceRegistrationSocket.ts`（27 KB）、`services/deviceBridge/passthroughMarker.ts`、`services/deviceMcp/deviceToolNotices.ts`。
  - 远程工具：`services/remoteTools/{remoteFileRead,remoteDirectoryList,unattendedConsentStore,unattendedRunGrant,sessionRulesRendering,registerToolHosts}.ts`。
  - 服务端：`remote/tools/serve/{servingReadiness,hostInventory,servedOutput,servedAutoMode,servedBackgroundShells}.ts`、`remote/tools/sessionRepositoryTrust.ts`、`cli/headlessCloud/attachDeviceBinding.ts`。
- **mcp serve**：`entrypoints/mcpServe/{toolOutputRequest,plainCallAsk,cpuReport,editResult,sessionTunnelLauncher}.ts`、`entrypoints/sessionTunnelInput.ts`、`services/mcpServe/{runMonitorCommand,uploadRules,servedCallError}.ts`。
- **MCP 客户端**：`services/mcp/{transportGuards,mcpInboundDoor,mcpTaskDrive,dialFailureLatch,toolSchemaSendability,listAuthError,fileGrants,revokeTokens}.ts`。
- **Artifact**：
  - `tools/ArtifactTool/corePrompt.ts`（28 KB 提示词段落）。
  - 同意记录：`tools/ArtifactTool/permissions/{consentStamps,readConsent}.ts`。
  - `tools/ArtifactTool/{docsCreateWake,subagentPublishArms}.ts`。
  - `services/artifacts/{artifactOpeningPrefetchContent,artifactsMcpLaptop,artifactsMcpTools,handoverRead,replyYieldHolder,shareEntryWarm,rosterWait,hookCoverage,htmlTokenizerBudget,startKitSwitch}.ts`。
  - 技能：`skills/bundled/{artifactDiagram,artifactTypeAlias}.ts`。
- **文件暂存与任务文件**：`utils/stageFile.ts`（19 KB）、`utils/stageFileStoreCheck.ts`、`utils/filePersistence/placeFilesByName.ts`、`services/taskFiles/{taskFileUpload,startTaskFiles}.ts`。
- **文件系统锚定**：`utils/fsAnchor/{treeAnchor,win32Nt,deviceTreeHost}.ts`。
- **设置、策略与启动**：
  - `utils/settings/{settingsPrime,customizationDisabled,policySnapshot,userIntentSettings}.ts`。
  - `services/policyLimits/{orgConfigStartup,orgConfigGateFlag,orgPolicyDeniedEvent}.ts`。
  - `cli/{managedConfigRefusal,startupFailureResult,fastPathSettings}.ts`。
  - `components/ManagedSettingsSecurityDialog/showStandaloneSecurityDialog.tsx`。
  - 认证：`utils/auth/{storedLoginRefused,personProxyAuthHelper,proxyAuthHelperConfig,gatewayAuthFastPath,oauthRefreshExitWait}.ts`、`utils/secureStorage/credentialsFileStore.ts`。
  - 存储：`utils/storage/{pinStorageV5,storageV5EnvPin}.ts`。
- **开关**：`services/analytics/{violinGates,violinFretGate,violinWillowGate,violinTipGate,lazyDoveGate}.ts`、`services/analytics/{safeMetadata,featureTelemetry,flushSinks}.ts`。
- **模型**：`utils/model/{thirdPartyDefaultFallbacks,bedrockDefaultCheck,knownModelNames,resetProviderCaches}.ts`。
- **其他新命令与工具**：
  - 命令：`commands/restart/restart.ts`、`commands/skill-doctor/skill-doctor.ts`、`commands/plugin/PluginEval.tsx`、`commands/goal/restoreGoal.ts`、`commands/color/setColor.ts`、`commands/theme/themeWriter.ts`、`commands/powerup/discoveryCopy.ts`、`commands/chrome/chromeDialogResponse.ts`。
  - 工具：`tools/MCPTool/displayOnlyTool.ts`、`tools/AgentTool/{forkDirective,built-in/claudeAgent}.ts`、`tools/BriefTool/pewterOwl.ts`、`tools/AppifactReplTool/{prompt,isEnabled}.ts`、`tools/FetchInboxMessageTool/prompt.ts`、`tools/ShareOnboardingGuideTool/prompt.ts`。
  - 插件测试：`cli/handlers/pluginTest/{refusal,endPluginTest,reportMark}.ts`。
- **诊断**：`utils/eventLoopStallDetector.ts`、`utils/gcCount.ts`、`utils/processStartTuning.ts`、`services/errorTracking/datadogErrorSink.ts`。
- **vendor**：
  - `vendor/chokidar/index.js`：门面 `_new/chunk-p13a1b4d.ts`，FSWatcher 加内联 anymatch，邻居是 `chokidar/runtime.js`。
  - `vendor/@opentelemetry/api-logs/NoopLoggerProvider.js`。
  - `vendor/lodash-es/{_arrayEach,_copyObject,_isPrototype,_overArg,reject}.js`：按 lodash 源码形状判定。

## 5. 2.1.316 新功能（手册素材）

- **跨会话消息与在场**：
  - 本机会话之间通过 UDS socket 互发消息，祖先进程判定自发消息，sockets 目录做严格的所有者和权限检查。
  - 空闲通知订阅（notify_when_idle）。
  - 被对方暂扣或拒绝时，发送方收到回执。
  - 会话名唯一性：冲突时改名并通知通信过的会话。
  - 给模型看的可达代理列表（ListAgents）。
  - SendFile 对端文件落地。
- **外部事件唤醒**：`<wake reason="external-event">` 文本协议，限定 source/kind/from/trust 字段。
- **Remote Control**：
  - 会话收件箱（FetchInboxMessage）。
  - Projects 线程回复闸门：tengu_rc_thread_reply_gate 要求模型回复项目线程。
  - hearth 回复挂载。
  - 桥接斜杠命令可用性。
  - 分叉会话上传历史。
  - 工作区 diff：复制 .git 到临时目录后再算，避免执行仓库的 git 配置。
- **设备绑定与设备桥**：
  - 设备密钥签 session_bind、tool_host_link v1/v2、tool_host_resume、客户端事件（JCS 规范化）。
  - WebSocket 设备注册公告本机工具与透传工具，包括心跳、重连和争用退避。
- **无人值守服务**：同意文件、运行授权，以及托管设置禁止，决定远端调用能否在本机 auto 模式下运行。
- **mcp serve**：
  - 工具输出对象协议：版本协商、拒绝规则摘要。
  - 需要人批准的调用（anthropic/permissionAsks）。
  - RunMonitorCommand。
  - 工具容器 CPU 报告。
- **MCP 客户端加固**：
  - 响应大小与压缩编码限制：只接受 gzip 和 deflate。
  - 入站检查替换 tools/call 结果。
  - 懒拨号失败闩锁。
  - 不被 API 接受的 schema 丢弃或规范化。
  - MCP 任务（com.anthropic/agent-task）驱动。
- **Artifact**：
  - 开场预取类型说明。
  - 本机 Artifacts MCP 服务。
  - 评论自动回复的跨会话让出与接管。
  - 交接读取与副本核对。
  - 各类同意的记录与按账号纪元重置。
  - Design 和 Slides 走已发布 Artifact 类型新建。
  - 画图技能。
- **stage_file / 任务文件**：从 filestore 暂存到 /uploads 和 /outputs，按大小与 md5 判断是否相同；start_task 和 update_task 附件上传与删除。
- **文件系统锚定**：用 /proc/self/fd、macOS O_NOFOLLOW_ANY、Windows ntdll 三种后端防 TOCTOU，用于 worktree 清理。
- **设置预读与 v5 存储后端**：settingsPrime 启动时通过存储后端预读各设置层；tengu_hover_rest 决定是否使用 v5 后端。
- **组织配置闸门**：启动早期执行，凭据刷新导致不可用时会重试。
- **第三方提供商默认模型回退**：Bedrock、Vertex、Mantle 探测默认模型可用性并回退，同时记住模型访问情况。
- **其他**：
  - 事件循环卡顿检测（区分睡眠唤醒）。
  - Datadog 错误跟踪。
  - /restart、/skill-doctor、/plugin eval。
  - VS Code 扩展用的 edit-permission-rules 等 stdin 子命令。
  - EndConversation 工具（tengu_umber_kestrel）。
  - SendUserFile、SearchMcpRegistry、ListConnectors、SuggestConnectors 工具提示词。

## 6. 不确定的判断

全部声明都已给出路径，但下面这些是按弱证据判定的：

- `chunk-a2g5s7cw.js#jG`（78/75/70）→ `utils/exitCodes.ts`：只凭 sysexits 数值和守护进程类调用者。
- `chunk-18hwfzwa.js#@1667001`、`@1667005`（两个 `j()` 调用）→ `screens/REPL.tsx`：只凭邻居。
- `vendor/lodash-es/*`：按代码形状判定。`reject.js` 与 g0 共用同一路径。
- `chunk-aepeg2w5.js#oR` → OpenTelemetry NoopLoggerProvider：唯一调用者是 ProxyLogger。
- `_misplaced/buddy/sprites.ts`（SOURCELESS_RANK）→ `services/artifacts/publishConflicts.ts`：唯一调用者。
- `_misplaced/services/api/errorUtils.ts`（TLS 错误码集合）→ `services/policyLimits/prefetchToggle.ts`：唯一调用者。它也可能是共用的 errorUtils，因为与旧版 errorUtils 同名常量相近。

## 7. 给 lead 的建议

- `_new/DESCRIPTION.ts` 与 `_new/call.ts` 是多个源文件同名导出被合并成一个门面。门面推断时，跨 chunk 的同名导出应该分开。
- 并入已有模块的 149 个路径中，不少路径属于其他组或其他领域，例如 `utils/messages.ts`、`services/mcp/client.ts`、`commands/review/reviewRemote.ts`、`bridge/replBridgeHandle.ts`。生成时同一路径会出现多个来源，模块说明以先到者为准。我只为没有说明的路径补写了说明。
- `utils/udsMessaging.ts` 与已有的 `utils/udsMessaging/` 目录同名并存，这与旧版一致：旧版既有 `utils/udsMessaging.ts`，也有 `utils/udsMessaging/` 下的文件。
