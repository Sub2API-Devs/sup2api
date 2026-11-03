# 放置记录：组 3（place-g3）

范围：`analysis/segments/placement-work.json` 的 `groups[3].chunks`，共 228 个 chunk。主体是 `chunk-aepeg2w5`（模型/设置/遥测/认证底座）、`chunk-dcmhvw5a`（托管设置与插件标识）、`chunk-ha3km179`（query 循环）、`chunk-kxyd0g16`（新工具集）、`chunk-ah34pb7m`（消息渲染）、`chunk-cgr0tezp`（遮盖/清洗/fsSafety），以及 Fleet、daemon、Artifact、函数钩子、云网关等几十个中小 chunk。

## 数字

| 项 | 数量 |
| --- | --- |
| 范围内声明（unattributed + 本组 `_new` 模块） | 8,627 |
| 已放置 | 8,627（2,694,771 字节），**未放置 0** |
| 目标文件 | 587 个 |
| 其中 2.1.316 新增文件 | 398 个（6,691 个声明，2,271,831 字节） |
| 并入已有模块（`analysis/segments/modules.json` 已有路径） | 182 个（1,858 个声明，414,854 字节） |
| 旧版有同名文件、但本次切分没有该模块的（视为扩充） | 4 个（26 个声明） |
| 第三方 | 3 个（52 个声明，2,716 字节） |
| `naming/semantic-p3.jsonl` | 2,265 条（顶层名，少量为局部/多声明符）；用 `tools/rename/lib/rename.mjs` 逐模块试跑：192 个 chunk、2,265 条全部生效，0 冲突、0 拒绝 |
| `naming/docs-p3.jsonl` | 2,265 条 |
| `naming/modules-p3.json` | 587 条（每条标明"2.1.316 新增 / 并入已有模块 / 第三方"） |

命名覆盖的是"≥300 字节或被 ≥3 处跨 chunk 引用"的声明（共 2,274 个，门面原名的不改名）；其余小声明只做了放置。

## 产物怎么重建

脚本都在 `artifacts/tmp/p3/`：

- `build.mjs`：读 `assign-1.txt`、`assign-2.txt`、`assign-3.txt`（后读的覆盖前面的）和 `overrides.txt`，生成 `naming/placement-g3.json` 和 `files.json`。规则写法有五种：`c8/NNN 路径`（整个 part）、`c8/NNN@min 路径`（从某声明到 part 末尾）、`c8/* 路径`、`c8#min 路径`（`_new` 连续段）、`=chunk-x.js#min 路径`（单个声明）。
- `gen-names.mjs`：读 `names/01.txt`…`20.txt`，格式是 `<chunk8> <min>[.<局部>] <新名|-> [置信度] | 中文说明`；用 `bindingsOf` 解析 `@offset` 键，生成 semantic 与 docs。
- `modules-auto.mjs`：根据每个文件里声明的 docs 自动拼一句说明，`module-notes.txt` 里有手写说明的优先用手写的；新旧状态由 `analysis/segments/modules.json` 和 `references/claude-code-analysis/src` 判定。
- `check.mjs`：语义名试跑（复用 g0 的写法）。
- 浏览辅助：`digest.mjs`、`lazy.mjs`、`ctx.mjs`、`peek.mjs`、`top.mjs`、`list.mjs`、`dump.mjs`（生成 `work/batch-NN.txt` 命名清单）。

## 新建的目录与文件（按主题）

只列 2.1.316 新增文件，括号里是文件数。

### Agents 视图（Fleet）与后台会话

- `components/fleet/`（9）：FleetView、FleetViewInput、FleetList、FleetRow、fleetRows（会话名单存储）、fleetSessions（编辑器状态与派发建议）、fleetDispatch（提交派发、回复、/stop）、fleetActions（操作菜单、附加）、dispatchDefaults（新会话的模型/effort/快速模式默认值）。
- `daemon/`（7）：bgDispatch（后台会话管理主循环、PTY 启动、worker 管理）、bgManager、bgSpare（备用进程）、daemonAuth、deadProbe、lowMemory、runDaemonWorker。
- `daemon/jobs/`（5）：adoptRecord、attachBeacon、attachErrors、draftSweep、killJob。
- `daemon/attach/attachJob.ts`：附加到后台会话的 PTY（转发输入输出、窗口大小、分离键）。
- `cli/handlers/daemon.ts`、`cli/handlers/purgeProject.ts`、`cli/handlers/pluginCommands.ts`：`claude daemon …`、`claude project purge`、`claude plugin …`。

### query 循环拆出的新文件

- `query/`（12）：turnEndReasons、refusalRecovery、streamingFallback、outputLimitRecovery、malformedToolCallRecovery、toolDrain、promptSnapshot、autoModeGitState、autoModeContext、goalCheckIn、presenceCheck、postTurnSummary。

### 模型目录与模型策略

- `utils/model/`（23）：servedCatalog（服务端下发的模型目录，内含 version 3444 的内置目录 JSON）、catalogCapabilities、catalogEntries、catalogSeed、maskedIds（保密模型 id 的本地遮盖文件）、deniedModels、allowedProviders、modelUnavailability（回退阶梯、拒绝缓存）、modelFallback、mantleDefaultCheck、firstPartyBaseUrl、contextWindow1m、canonicalModelName、modelDisplay、smallFastModel、classifierModel、defaultModel、planModeModel、agentModelRestriction、sessionModelRestriction、thirdPartyModelDefaults 等。

### 托管设置、策略与签名缓存

- `utils/settings/`（16）：settingsSources（merge/first-wins）、settingsFileParsing、managedFileSettings、managedPath、managedRestrictionKeys、managedSettingsKeys、managedEnvKeys、policySettings、policyTiers（机器管理员层、登录组织固定）、policyCertificates（签名缓存的 JWS/DER 校验与内置根证书）、settingsSourceTrust、hooksValidation、otelEndpointValidation、marketplaceSettingsAliases、permissionRuleCarveOut、policyHelperGate。
- `services/remoteManagedSettings/`（5）：remoteSettingsState、remoteSettingsCache、unvouchedRestrictions（未担保文档只采用限制项）、storedLoginSurface、gatewaySettingsErrors。
- `services/policyLimits/`（6）：policyState、policyEvidence（HIPAA 等证据）、cacheStamp、capabilityBlocks、complianceTaints、policyMessages。

### 云网关与云会话

- `services/gateway/`（7）：gatewayDiscovery、gatewayAuth、gatewayCredentialStore、hostCheck、internalNetworks、vouching（担保）、constants。
- `services/cloudSessions/`（7）：eligibility、cloudSessionsOAuth、cloudSessionsPolicy、consoleSignIn、setupProgress、webSetup（/web-setup）、webSetupPostPushHook。
- `components/cloud/`（3）：CloudCreateChecklist、CloudLaunchSignInScreen、HostDeviceMcpConsent。
- `utils/teleport/cloudErrorMessage.ts`、`services/ccrMcp/stagedMcpCall.ts`、`services/ccrAgentProxy/agentProxy.ts`。

### Artifact 工具

- `tools/ArtifactTool/`（7）：UI、artifactPermissionRules（权限规则匹配、读取评论前须批准）、artifactAccessClasses、artifactAskMessages、artifactUrls、commentAnalystAgent（评论线程分析代理）、constants。
- `services/artifactPreview/browserDiscovery.ts`、`services/artifacts/artifactMount.ts`、`services/liveReplica/liveReplica.ts`（artifact 实时副本）。

### mods / 函数钩子引擎与内置插件

- `plugins/functionHooks/`（12）：沿用 place-g7 的目录约定（源码字符串 `/./src/plugins/functionHooks/hooks-worker/hooks-worker.js`）。hookApiSurface、stateAtoms、builtinHooksModule、moduleLoader、moduleScan、clientSurfaceScan、eventPatterns、stateScan、hookDispatch、hooksWorkerClient、modAdmission、promptMentionRunner。
- `plugins/bundled/`（9）：telemetry、secDefault、easel、agentsMd、claudeTest 等内置插件的 index/配置/事件 schema/发送器。
- `utils/plugins/`（9）：pluginPolicyColdStart、pluginLoadState、pluginInventory、pluginRelevance、pluginSkillBudget、reloadImpact、securityDefaultPlugin、officialMarketplaceNames、pluginSourceUrl。

### 记忆存储与新工具

- `services/memoryStore/`（4）：localMemoryStore、memoryDocumentFs、memoryFrontmatter、memoryKeys。`tools/MemoryTool/`（3）：memory_list、memory_write。`memdir/memoryTool.ts`。
- 新工具（各一个目录）：SendFeedbackTool（反馈草稿）、SendFileTool、FetchInboxMessageTool、ScheduleWakeupTool、ReportFindingsTool、NotificationsTool、OnboardingGuideTool、RolePickerTool、ChromeSetupOfferTool、RefreshMcpServersTool、SuggestConnectorsTool、SearchMcpRegistryTool/UI、TaskOutputTool/GetTaskTool、SendMessageTool/isolationDispatchGate、WebFetchTool/harnessNotes、MonitorTool/UI。
- 新任务类型：`tasks/MonitorMcpTask`、`tasks/LocalMemoryImportTask`、`tasks/PostTurnMemoryTask`、`tasks/AutoModeScanTask`、`tasks/RemoteAgentTask/remoteAgentKinds.ts`。

### 安全与健壮性底座

- `utils/fsSafety/`（6）：hardenedRead、guardedFileRead、boundOpen（打开后经 /proc/self/fd 核对就是权限批准的那个路径）、pathRevalidation、networkPathCheck、atomicWriteStaging。
- `utils/redaction/`（2）：urlParsing、urlRedaction；`utils/errorRedaction.ts`、`services/analytics/metadataSanitizers.ts`、`utils/printableName.ts`（扩充）、`utils/sanitization.ts`（扩充：易混淆字符骨架、不可见字符）。
- 密钥扫描器 SecretScanner 并入已有的 `services/teamMemorySync/secretScanner.ts`（扩充为 scan/redact/显示遮盖）。
- `utils/permissions/`（10）：approvalPayloadSerialization（审批载荷的显示与预算）、askFirstReasons、autoModeRulesPrompt、autoModeDescription、browserToolNames、disallowedToolsFlag、protectedEnvAndGitPaths、protectedSettingsPaths、protectedDirNames、gitCommandRules。
- `utils/auth/`（6）：cloudAuthRefreshLock（AWS/GCP 认证刷新单飞锁）、oauthRefreshLock、oauthSlotRefreshLock、lockHolderLiveness、credentialEpoch、managedHelpers。
- `utils/network/privateHostCheck.ts`、`utils/hostnameMatching.ts`、`utils/cidr.ts`、`utils/anthropicHosts.ts`、CA 证书拒绝名单（并入 `utils/caCerts.ts`）。

### 遥测与 GrowthBook

- `services/analytics/`（13）：growthbookClient、growthbookCredentials、growthbookGates、flagOverrides、eventSerialization、anthropicTelemetryExport、authOutcomeTelemetry、telemetryCodes、privacyLevel、metadataSanitizers、telemetryCredentialGuard、juniperShoalConfig、violinRibGate。
- `utils/telemetry/memorySummary.ts`：内存归因、客户端事件签名与上传队列。

### Remote Control 与桥接

- `bridge/`（10）：bridgeEntitlement、bridgeGates、bridgeReconnectBudget、headlessWorkSecretSession、mcpApprovalTickets、previewTunnel、remoteBridgeArchive、remoteBridgeCloseCodes、remoteBridgeSettle、remoteControlPolicy。
- `utils/claudeInChrome/bridgeClient.ts`：Claude in Chrome 桥接客户端与本地扩展连接池。
- `services/pushNotifications/permissionPush.ts`、`services/tips/remoteControlNudges.ts`。

### 其他

- 限额：`services/rateLimit/rateLimitWall.ts`、`components/rateLimit/{quotaAutoResume,usageCreditsOffer}.tsx`。
- 工作流与循环：`services/workflows/{workflowScriptMeta,harnessFraming,bundledWorkflows}.ts`、`commands/workflows`、`commands/remote-workflow`、`utils/loop/autonomousLoop.ts`、`commands/goal`、`components/goal`。
- 新命令：`commands/config/{configShorthand,configSettings}`、`commands/scroll-speed`、`commands/import`、`commands/focus`、`commands/list-agents`、`commands/stop`、`commands/skills/skillOverrideEdit`、`commands/permissions/worktreeRegistrationDrops`。
- 项目与目录：`services/projects/`、`services/projectsRelay/`、`services/repoRoots/`（RegisterRepoRoot）、`components/projects/`（Continue in Projects 对话框）。
- 自托管 runner：`services/selfHostedRunner/`（3）。
- 无障碍：`utils/accessibility/screenReader.ts`、`ink/render-to-screen-reader.ts`。
- 存储键：`utils/storage/storageKeys.ts`（统一的存储命名空间与键校验）。
- 迁移：`migrations/` 下 5 个新迁移（模型别名、Fable5→Fable 别名、通知关闭记录、用户意图写入设置、公用辅助）。

## 2.1.316 新功能（手册素材）

1. **Agents 视图（Fleet）**：一个全屏会话面板，汇总本地、接管的、远程和待创建的会话，按 needs/live/done 分桶；可派发新会话（模板、routine、仓库、worktree、技能、模型建议）、回复、附加、停止、重命名、分组、删除，有 vim 模式与搜索。
2. **后台守护进程与后台会话**：`claude daemon run/status/logs/stop/install`；后台会话在 PTY 中运行，可 attach/detach，有备用进程预热、低内存保护、死进程探测、草稿清理、接管记录。
3. **云网关（Cloud gateway）**：网关发现、主机检查、内网判定、证书固定、担保（vouching）、凭据存储；`allowedProviders` 设置限制可用提供商。
4. **远程托管设置与策略限制**：签名缓存（JWS + 内置根证书）、组织固定、未担保文档只采用限制项、HIPAA 等合规证据、能力封锁、缓存戳；托管设置支持 merge/first-wins 策略、drop-in 目录、机器管理员层。
5. **模型目录**：服务端下发模型目录（内置一份 2026-10-30 的目录），按界面（cc/ccr/ccd）提供；保密模型 id 遮盖；`deniedModels`/`availableModels` 的条目解析与提示；模型不可用时按提供商回退阶梯；Mantle（Bedrock）默认模型检查；1M 上下文 beta 被拒时自动去掉。
6. **Artifact 工具**：live-edit/preview/publish/list/读取评论，权限按访问类别（删除、公开修改等）询问，评论线程分析代理，预览浏览器发现，artifact 实时副本。
7. **mods / 函数钩子**：插件可带 hooks 模块，在独立 worker 中运行；模块扫描、状态原子、事件模式、客户端表面扫描、准入检查；内置插件 telemetry、secDefault、easel、agentsMd、claudeTest。
8. **记忆存储与记忆工具**：`memory_list`、`memory_write`（带版本冲突处理），本地记忆存储、frontmatter、账户镜像。
9. **新工具**：SendFeedback（反馈草稿排队）、SendFile（跨会话发送文件）、FetchInboxMessage、SuggestConnectors、SearchMcpRegistry、RegisterRepoRoot、ScheduleWakeup、ReportFindings、GetTask、Notifications、OnboardingGuide、RolePicker（Cowork）、ChromeSetupOffer、RefreshMcpServers。
10. **Remote Control 增强**：占位清理、关闭码、归档、预览隧道、重连预算、MCP 审批票据、长回合与权限请求时的 Remote Control 提示、权限推送通知。
11. **云会话**：资格判断、OAuth 与控制台登录、创建清单、`/web-setup`（用 GitHub 账号）、设备 MCP 透传与授权。
12. **限额墙与自动恢复**：限额重置声明、额度用完后自动恢复、使用额度提议。
13. **目标与循环**：`/goal` 与回合内 check-in；自主 `/loop`（动态节奏 tick、loop.md）；工作流脚本 meta 解析、harness 来源说明、`/workflows`、`/remote-workflow`。
14. **安全底座**：fsSafety（不跟随链接打开、打开后核对路径、网络路径拒绝、原子写入暂存）、受保护路径（git 目录、设置文件、环境变量）、密钥扫描与错误/URL 遮盖、审批载荷安全显示、CA 证书拒绝名单、SSRF 私网主机判断、认证刷新文件锁。
15. **其他**：屏幕阅读器模式、`/config` 简写、`/scroll-speed`、`/import`、`/focus`、`/session`、`/list-agents`、`claude project purge`、`claude plugin …`、项目中继与来源标记、自托管 runner、Continue in Projects。

## 第三方代码

- `vendor/lodash-es/_inlinedHelpers.js`：`chunk-dcmhvw5a` 的 part 001/002、part 004 末尾（`ot` 起的类型判断）和 `chunk-bfnfj4kx` part 001 前段，是内联进一方 chunk 的 lodash-es 辅助函数（`[object Object]`、`Function.prototype.toString`、baseFor、深合并）。
- `vendor/@mermaid-js/parser/chunk-L2OVAXIS.mjs`：`chunk-z0q4jgnc` 的少量片段。
- `vendor/@aws-sdk/token-providers/index.js`：`chunk-k63efphf` 的片段。
- highlight.js 的 Cedar 语言定义和语言名表（`aepeg2w5` 的 rz、G6e）没有放 vendor，归到 `utils/cliHighlight.ts`，因为它们和一方的高亮配置写在一起。

## 无法判断的部分

无。所有范围内声明都给了路径。置信度较低、建议后续复核的有：

- `query/` 下拆出的 12 个文件的边界是按字符串主题切的（拒绝恢复、流式回退、输出上限恢复等），原始文件可能更少。
- `components/fleet/` 里 FleetList/FleetRow/fleetRows 三者的边界不太确定，相邻声明互相引用很多。
- `chunk-t0gq9gyw` part 005、`chunk-cjydagjy` part 003、`chunk-dcmhvw5a` part 004 原先是混合段，已经按声明拆开（git 配置解析、git 仓库缓存、文件监视器、启动 MCP 头快照、启动器主机登录、市场名、插件来源 URL、私网主机判断等）。

## 给 lead 的建议

1. `analysis/segments` 里有几处整段误归：`chunk-dcmhvw5a` part 004 被当成一个文件（`utils/worktreeResumeHint.ts`），实际混了 6 个主题；`chunk-t0gq9gyw` part 005 整段标成 `utils/pdf.ts`，实际只有前 3 个声明属于 PDF。建议切分器在出现大量互不引用的声明时降低"同文件"置信度。
2. `aepeg2w5` 是巨型底座 chunk（模型、设置、遥测、认证、遮盖都在里面），多组都可能引用它的符号；semantic 名以本组为准时，跨组合并请检查同一 `@offset` 是否被别组也命名过。
3. `plugins/functionHooks/` 目录与 place-g7 已对齐，合并时两组文件不应冲突，但 `hookApiSurface`/`stateAtoms` 等名字建议 lead 统一一次。
4. `modules-p3.json` 中自动生成的说明取自该文件最大的两个声明的 docs，个别文件读起来像在描述两件事，说明那里原本就可能是两个文件，可作为二次拆分的线索。
