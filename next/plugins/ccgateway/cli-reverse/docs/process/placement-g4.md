# 放置记录：组 4（place-g4）

范围：`analysis/segments/placement-work.json` 的 `groups[4].chunks`，共 228 个 chunk（约 2.2 MB）。主体是 `chunk-tyg7f3ek`（print/SDK 无头运行主体，975 个声明）、`chunk-3wek6r2k`（启动与云会话）、`chunk-151tygw9`、远程工具（remote tools）与 serve 子系统、artifact 发布/评论服务、home seed、设备钩子，以及 Claude in Chrome 本地配对、插件发布、worktree 安全删除等几十个中小 chunk。

## 数字

| 项 | 数量 |
| --- | --- |
| 范围内声明（unattributed 5,590 + 17 个 `_new` 门面模块 529） | 6,119 |
| 已放置 | 6,119（2,487,544 字节），**未放置 0** |
| 目标文件 | 485 个 |
| 其中 2.1.316 新增文件 | 426 个（5,798 个声明，2,308,335 字节） |
| 并入已有模块（旧版源码或本次切分已有路径） | 55 个（305 个声明，178,550 字节） |
| 第三方（vendor 推测） | 4 个（16 个声明，659 字节） |
| `naming/semantic-p4.jsonl` | 3,575 条（顶层名）；用 `tools/rename/lib/rename.mjs` 逐模块试跑：169 个 chunk、3,575 条全部生效，0 冲突、0 拒绝；与 `naming/final/top.json` 中同 chunk 其他键无同名 |
| `naming/docs-p4.jsonl` | 372 条（导出/多处使用/较大的声明） |
| `naming/modules-p4.json` | 485 条（新文件写明"2.1.316 新增"，旧文件写"并入 …"） |

命名覆盖：≥250 字节或被其他目标文件引用的声明基本都已命名（剩余约 30 个，多为 `var a=..,b=..` 中的第二个绑定或已被其他组命名的）；门面原名与参考名不改，其他组已命名的 13 个键跳过（`!` 强制覆盖的除外）。小声明（常量、单行辅助）大多也一并命名。

## `_new` 门面模块的去向

- `listArtifacts` → 拆到 `services/artifacts/` 下 13 个文件（listArtifacts、publishArtifact、publishInstanceFiles、pagePreparation、composePage、readBack、publishConflicts、publishErrors、contract、frameFlags、capabilityRoster、readObservation、publishFiles）；`listArtifacts.helpers-06y4` → stubPublishDir、readBack、renderBudget。
- `setShareEntry` → `services/artifacts/shareEntries.ts`；`recordOwnPublish` → `services/artifacts/ownPublishes.ts`；`ASSET_UPLOAD_CARD_LEDE` → `tools/ArtifactTool/promptText.ts`。
- `FocusManager` → `ink/components/{Text,AnsiText,ClockContext,ErrorBoundary,Input}.tsx`、`ink/hooks/useTerminalHooks.ts`。
- `prepareSession` → `cli/startup/prepareSession.ts`；`createServingKit` → `remote/tools/serve/createServingKit.ts`；`createSessionEventTransport` → `remote/tools/sessionEventTransport.ts`。
- `runHomeSeed` → `services/homeSeed/runHomeSeed.ts`；`installSessionsBearerHooks` → `services/oauth/sessionsBearerHooks.ts`；`verifyTempDirOwnership` → `utils/tempDir.ts`；`CLI_CONSUMED_STAGE_MOUNT_PREFIX` → `utils/stageFileRoots.ts`。
- `NoticeUnderScene` → `components/design-system/NoticeUnderScene.tsx`；`isLockedOutByOrgMcpPolicy` → `services/mcp/orgMcpPolicyLockout.ts`；`inExcludedRepository` → `utils/git/excludedRepository.ts`；`main.helpers-3wek` → `services/mcp/mcpConfigProvenance.ts`。

## 产物怎么重建

脚本都在 `artifacts/tmp/p4/`：

- `plan.tsv`：放置计划，每行 `chunk<TAB>起始键<TAB>目标路径`（起始键 `*` 表示从 chunk 开头；目标 `-` 表示不放置，最终没有用到）。`apply.cjs` 把每个 unattributed/_new 声明分给"同 chunk 中起点 ≤ 它的最近一条计划"，生成 `naming/placement-g4.json`。切分依据是连续段内"前向引用为 0"的边界（Bun 按源文件顺序拼接）。
- `names-01.tsv` … `names-11.tsv`：命名表。`@chunk-xxx.js` 或 `@@目标路径` 切换查找范围；行格式 `压缩名<TAB>新名[<TAB>中文说明]`，新名前加 `!` 强制覆盖他组名，`-` 只写说明。`names-10/11` 由同名 `.src`（空格分隔）经 `src2tsv.sh` 转换。
- `gen.mjs`：命名表 → `naming/semantic-p4.jsonl`、`naming/docs-p4.jsonl`（`bindingsOf` 解析 `@offset` 键，支持同一声明中的第二个绑定；跳过门面键与他组已命名键）。
- `modules-1/2/3.src` + `genmodules.mjs` → `naming/modules-p4.json`（核对与 placement 的目标路径一一对应）。
- 校验：`check.mjs`（逐模块试跑改名引擎）、`collide.mjs`（与 `naming/final/top.json` 同 chunk 其他键重名检查）、`todo.mjs`（列出仍未命名的重要声明）。
- 浏览辅助：`lib.cjs`、`overview.cjs`、`segs.cjs`、`brief.cjs`、`detail.cjs`、`remaining.cjs`、`dump.mjs`（按目标文件列声明与代码片段，已知名替换）、`unnamed.sh`、`pathinfo.mjs`。

## 新建的目录与文件（按主题）

只列 2.1.316 新增文件，括号里是文件数。

### print/SDK 无头运行（chunk-tyg7f3ek 拆分）

- `cli/print/`（55）：回合主循环与闸门（turnLoop、turnGate、turnDispatch、turnStartChecks、runEndReasons）、用户帧接收与重投（userFrameIntake、userPromptFiles、inboundMessages、queuedMessageUtils）、唤醒路由（wakeRouter、backgroundWait、waitingStatus）、停放权限提示（parkedPrompts、permissionAsks）、远程取消与输入框（remoteCancel、remoteComposer）、fork/回退（forkConversation、rewindConversation）、poll-event、插件面板（pluginUiPanes）、子代理恢复（agentResume）、artifact 编辑代理共同投递、会话通知、任务列表恢复、CPU 采样、堆/上传普查、宿主遥测代理等。
- `QueryEngine.ts`（并入）：runHeadlessTurn、回合行持久化、无头工具上下文、SDK init 消息。
- `cli/structuredIOProtocol.ts`、`cli/transportState.ts`、`cli/sdkMcpManifests.ts`、`cli/transports/sdkUrlValidation.ts`。

### 启动与云会话

- `cli/startup/`（10）：prepareSession（会话准备主流程）、awaitInitialize（`--await-initialize`）、agentsFlag、appendPromptHead、interactiveInputCheck、launcherHostLogin、sessionLaunchOptions、startupWorkGate、startupTelemetry、startupMisc。
- `cli/cloudSession/`（4）：launchFlags（云会话参数转发/忽略/拒绝）、validateCloudFlags、hostedSessionRestrictions、headlessCloudClient。
- `main/fastPathSubcommands.ts`、`main/resumeFlagScan.ts`。

### 远程工具（remote tools）与 serve

- `remote/tools/`（14）：协议常量/结构/版本协商、工具描述、调用管道（经设备桥或会话通道）、会话事件传输、目标同步、调用结果、输入 schema 展开、服务通道。
- `remote/tools/serve/`（21）：本机为云会话执行工具的整条链路：准入、调用账本、权限决定、安全检查、凭证路径守卫、shell 读取与设置文件变化追踪、输出溢出、结果整形、后台命令、服务策略与状态。
- `entrypoints/mcpServe/`（6）：`claude mcp serve` 的工具宿主调用、权限上下文、Chrome 上传。
- `utils/hooks/deviceHooks/`（7）：设备钩子（云会话转发钩子到本机执行）：命令可达路径分析、简化 shell 读取器、担保（vouching）、执行与结果归类、钩子会话与远程工具通告。

### Artifact

- `services/artifacts/`（28）+ `comments/`（7）：发布主流程（部署重试、槽位、冲突、路径固定、多文件）、页面组装与运行时注入（图表/mermaid/高亮）、内容类型、回读、共享条目状态、打开前预取、评论读取/回复/解决/提及/同意、召唤唤醒。
- `tools/ArtifactTool/`（5）+ `permissions/`（5）：提示词与页面规则、发布 edits、缩略图、起步套件、权限规则与所有权同意。

### 设置推送与同步（home seed）

- `services/homeSeed/`（7）：把本机设置打包推送到云会话（设备签名的同步文件通道、就绪等待、记录与提示）。
- `bridge/`（新增 9）：deviceKey、deviceRegistry（设备注册表）、bridgeServerConfig、remoteControlEntry、attachmentUpload 等。
- `utils/secureStorage/{deviceKeyStore,storageWriteLock}.ts`。

### 新工具与命令

- `tools/ProjectsTool/`（9）：读写会话挂载的 claude.ai Project。
- `tools/WorkflowTool/`（1）+ `world/`（4）：确定性 JS 工作流脚本、world 存储/日志/运行登记。
- `tools/ListConnectorsTool`、`tools/ProposeGoalTool`、`tools/ScheduleWakeupTool/prompt.ts`、`tools/MonitorTool/prompt.ts`、`tools/SkillTool/pluginLoadFailureNote.ts`、`tools/WebFetchTool/sanitizeListing.ts`。
- 命令：`commands/advisor`、`commands/stop`、`commands/context/*`、`commands/statusline/*`。

### 插件、mods 与 MCP

- `services/plugins/devMods/`（3）：dev mods 同意与热重载；`services/plugins/publish/`（5）：插件发布（快照、上传、内容扫描）；`pluginTag.ts`、`pluginReadmeAdvice.ts`。
- `utils/plugins/`（7）：claude.ai 市场同步、缓存路径、设置来源、展示元数据、安全复制。
- `services/mcp/`（14）：CCR MCP 地址、设备 MCP、自动转后台、配置来源合并、注册建议、启停提示、remote-browser。

### 策略、权限与安全底座

- `services/policyLimits/`（5）：组织配置门控（orgConfigGate/Eligibility/Messages）、策略裁决、合规污点。
- `utils/permissions/`（10）：自动模式转换、分类器 MCP 上下文与模型配置、Claude 状态路径保护、managed agents 命令守卫、本人决定、权限上下文刷新。
- `utils/git/`（5）：worktree 注册/校验/安全删除、安全 ref 名；`utils/fsBoundRead.ts`、`utils/atomicPublishWrite.ts`、`utils/localHostnames.ts`、`utils/processWrapper.ts`。

### Claude in Chrome、computer use、守护进程与其他界面

- `utils/claudeInChrome/`（6）+ `localPairing/`（4）：本地配对（ECDH 握手、JWKS、断言）、socket 客户端、浏览器工具 schema。
- `components/daemon/`（4）、`utils/daemon/daemonLock.ts`：后台服务列表、定时任务、远程控制服务器。
- `components/`：PowerupLessons（入门能力课）、SendToProjectDialog、ResumeStaleConversationDialog、vertexSetup、WorkflowProgress、权限参数卡片与同意行、design-system（ConfirmSelect、TreeConnectors、FocusColumn、NoticeUnderScene）。
- `entrypoints/selfHostedRunner/`（7）：自托管 runner 编排器（健康检查、指标、SCM 连接器、spawn 钩子）。
- `constants/promptSections.ts`：系统提示词各段；`services/prompts/responsiveModePrompt.ts`。
- `utils/telemetry/`（6）：账户记忆脱敏、网关身份、仓库属性、第三方事件记录。
- `utils/model/servedModelCatalog.ts`、`providerAttribution.ts`、`modelOverrideNotices.ts`。

## 2.1.316 新功能（手册素材）

1. **远程工具（remote tools）**：云会话可以把工具调用转回本机执行（设备桥 / 会话通道），本机侧有完整的准入、权限、凭证路径守卫、安全检查与输出溢出；`claude mcp serve` 增加工具宿主模式。
2. **设备钩子转发**：云会话中的钩子转发到本机执行，先静态分析命令会读写/执行的路径并做担保判定。
3. **Home seed**：把本机用户设置打包、设备签名后推送到云会话，等待云端确认读取。
4. **设备注册与设备密钥**：cowork 远程设备密钥保存在钥匙串，向账号设备注册表登记。
5. **Artifact 发布与评论**：多文件发布、路径固定、缩略图、页面运行时（图表/mermaid/高亮）、评论读取/回复/解决、@Claude 召唤唤醒。
6. **Projects 工具**：读写会话挂载的 claude.ai Project（文档、文件、记忆、本地上传）。
7. **Workflow 工具**：确定性 JS 脚本编排子代理，带 world 事实存储与日志重放。
8. **组织配置门控**：按提供方、套餐、凭证形态决定是否必须加载组织策略/远程设置，失败时阻止会话。
9. **Claude in Chrome 本地配对**：ECDH 握手 + JWKS 断言的加密通道。
10. **无头运行大改**：回合闸门、停放权限提示、远程取消、fork/回退控制请求、poll-event、插件 UI 面板、`--await-initialize`。
11. **其他**：dev mods 热重载、插件发布与打标签、后台守护进程管理界面、自托管 runner、入门能力课、ListConnectors / ProposeGoal / ScheduleWakeup 工具、/advisor、Vertex 设置向导、Windows 沙箱配置。

## 未放置部分

无。只含资源包装或单个 `j();` 初始化调用的小声明（4–54 字节）并入了相邻模块；14 个旧版组件文件只并入了一个初始化调用（modules-p4.json 中写"仅并入模块初始化调用"）。

## 第三方（推测）

- `chunk-byv2e1t5` → `vendor/lodash-es/toString.js`
- `chunk-xa96axyz` → `vendor/@anthropic-ai/vertex-sdk/internal/utils/values.mjs`
- `chunk-my7fcfze` → `vendor/@aws-sdk/nested-clients/sts-default.js`
- `chunk-m61cyfw5` → `vendor/@smithy/node-config-provider/default.js`
- 设计系统包技能的三个资源 chunk（package-validate/resync/emit `.mjs`）放到 `skills/bundled/designSystemPackage/*Script.ts`。

## 与其他组共用的目标路径

刻意合并（同一源文件被 Bun 拆到多个 chunk）：

- g0：`services/api/promptCacheBreakDetection.ts`、`utils/cronTasks.ts`、`utils/model/providers.ts`、`ink/components/ClockContext.tsx`、`dialogLaunchers.tsx`、`utils/sandbox/sandboxErrors.ts`
- g1：`services/api/promptCacheBreakDetection.ts`、`services/artifacts/artifactToolGates.ts`、`services/artifacts/frameFlags.ts`、`ink/render-border.ts`、`tools/ArtifactTool/publishEdits.ts`、`tools/ProposeGoalTool/ProposeGoalTool.ts`
- g3：`tools/WebFetchTool/prompt.ts`、`utils/model/providers.ts`、`tools/ScheduleCronTool/UI.tsx`、`utils/tasks.ts`、`ink/components/Text.tsx`、`ink/components/ErrorBoundary.tsx`、`services/policyLimits/complianceTaints.ts`、`utils/git/gitConfigParser.ts`
- g5：`utils/remoteSessionEnv.ts`、`utils/plugins/marketplaceNames.ts`
- g6：`utils/tasks.ts`、`services/policyLimits/complianceTaints.ts`、`cli/handlers/plugins.ts`、`services/mcp/mcpSkills.ts`
- g7：`utils/cronTasks.ts`、`utils/tasks.ts`、`services/mcp/mcpSkills.ts`、`utils/plugins/marketplaceNames.ts`

## 给主控的建议

- 共用路径的 modules 说明需要合并（各组各写了一句）。
- 同一目标文件来自不同 chunk 时，语义名是按 chunk 试跑的；合并成一个源文件后需要再查一次同文件内重名（例如 `services/api/promptCacheBreakDetection.ts` 三组都有声明）。
- `utils/entrypointKinds.ts` 与 `utils/sessionShape.ts` 的入口判定函数很多、名字相近（isCoworkSession / isCoworkAny 等），后续若有字符串证据可再细化。
- `cli/print/` 已拆成 55 个文件，仍有几个大文件（parkedPrompts 48 KB、turnStartChecks 35 KB），如需更细可按类再拆。
