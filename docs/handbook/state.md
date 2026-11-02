# state 子系统手册：设置、配置、会话存储、记忆、认证、遥测与基础设施

> 适用版本：Claude Code 2.1.316（linux-x64 构建）。领域模块清单见 `analysis/segments/domains.json` 的 `state` 键（275 个重组模块、4,364 个顶层声明）。
> 命名：`naming/semantic-state.jsonl`（语义名）、`naming/docs-state.jsonl`（声明说明）、`naming/modules-state.json`（模块说明）。下文函数名优先用门面原名（`analysis/names/facade.jsonl`），其次本领域语义名、旧版名；括号里是声明 id（`chunk-xxx.js#压缩名`）。
> 路径写法：`utils/settings/settings.ts` 指重组源码 `src/utils/settings/settings.ts`（阅读树 `build/readable/src/…/*.js`）。`<配置目录>` = `$CLAUDE_CONFIG_DIR` 或 `~/.claude`。

## 0. 概述

state 领域是 CLI 的"持久状态与环境"层，几乎被所有其他子系统调用：

| 主题 | 负责什么 | 主要调用者 |
|---|---|---|
| 设置（settings） | 五个来源的 settings.json 读取、托管设置（文件/MDM/远程/策略 helper）、合并、写入、变更监视 | 启动（bootstrap）、权限、模型选择、hooks、插件、MCP |
| 全局配置（~/.claude.json） | 用户级持久状态：登录账户、项目信任、计数器、缓存 | UI、认证、遥测、命令 |
| 会话存储 | 转录 jsonl、resume/continue、/resume 列表、输入历史、AppState | 查询循环、REPL、SDK |
| 记忆 | CLAUDE.md 发现与 @include、自动记忆（memdir）、回合后提取、autoDream、多 store 同步 | 系统提示构建、查询循环 |
| 认证 | API key / OAuth / apiKeyHelper / 第三方云提供方 / 代理与 mTLS / 云端会话（teleport） | API 客户端、远程会话 |
| 遥测与分析 | logEvent → Datadog / 1P 事件日志、GrowthBook 特性开关、OpenTelemetry、调试与错误日志 | 全局（`logEvent` 约 1,400 处、`logForDebugging` 约 3,900 处） |
| 基础设施 | env/平台/cwd/git/worktree/IDE/fs/锁/字符串工具等 | 全局 |

它依赖的下层很少：`bootstrap/state.ts`（会话 id、原始 cwd、宿主选项、diskless 标志）、`constants/oauth.ts`（端点、client id）、`utils/secureStorage/*`（凭证存储，permissions 领域）、`utils/log.ts`（错误日志入口，ui 领域）。

一个贯穿全领域的 316 新特征：**storage v5 后端**（代码中 `Y()` 为真且传入 backend/storageV5 参数时）。配置、设置、转录、历史、调试日志、1P 失败事件等都有"直接读写文件"与"经存储接口读写 key"两条路径；**diskless 进程**（`X()`，宿主 `launchOptions.diskless()`）只能走后者，直接写盘会被拒绝。下文以文件路径描述，storage v5 下这些路径映射为同名存储 key。

## 1. 模块地图

分组（与 `artifacts/tmp/state/groups.json` 一致）：

| 组 | 模块（重组路径） |
|---|---|
| 设置与配置（48） | `utils/settings/*`（settings、types、constants、validation、changeDetector、mdm/*…）、`services/remoteManagedSettings/*`、`services/policyLimits/*`、`services/settingsSync/*`、`utils/config.ts`、`utils/env*.ts`、`utils/managedEnv*.ts`、`utils/platform.ts`、`utils/xdg.ts`、`utils/cachePaths.ts`、`utils/json.ts`、`types/{command,hooks,plugin}.ts` |
| 会话（38） | `utils/sessionStorage.ts`（最大，约 9.8k 行）、`utils/sessionStoragePortable.ts`、`utils/sessionRestore.ts`、`utils/crossProjectResume.ts`、`utils/listSessionsImpl.ts`、`history.ts`、`utils/pasteStore.ts`、`utils/imageStore.ts`、`state/*`、`utils/task/*`、`utils/concurrentSessions.ts`、`utils/session*.ts`、`utils/handlePromptSubmit.ts`、`utils/queueProcessor.ts`、`utils/plans.ts` |
| 记忆（29） | `utils/claudemd.ts`、`memdir/*`、`services/extractMemories/*`、`services/autoDream/*`、`services/teamMemorySync/*`、`services/SessionMemory/*`、`services/MagicDocs/*`、`utils/memoryFileDetection.ts` |
| 认证（30） | `utils/auth.ts`、`services/oauth/*`、`utils/authFileDescriptor.ts`、`utils/http.ts`、`utils/userAgent.ts`、`utils/proxy.ts`、`utils/mtls.ts`、`utils/caCerts*.ts`、`utils/aws*.ts`、`utils/billing.ts`、`utils/extraUsage.ts`、`utils/teleport.tsx`、`utils/teleport/*` |
| 遥测（39） | `services/analytics/*`、`types/generated/**`、`utils/telemetry/*`、`utils/telemetryAttributes.ts`、`utils/privacyLevel.ts`、`utils/debug*.ts`、`utils/errorLogSink.ts`、`utils/errors.ts`、`utils/diagLogs.ts`、`utils/stats*.ts` |
| git/IDE/fs（27） | `utils/git.ts`、`utils/git/*`、`utils/gitDiff.ts`、`utils/worktree.ts`、`utils/attribution.ts`、`utils/commitAttribution.ts`、`utils/ide.ts`、`utils/fsOperations.ts`、`utils/lockfile.ts`、`utils/which.ts`、`utils/windowsPaths.ts`、`utils/tmuxSocket.ts` |
| 其他基础设施（64） | `services/tips/*`、`services/notifier.ts`、`services/preventSleep.ts`、`utils/analyzeContext.ts`、`utils/collapse*.ts`、`utils/stringUtils.ts`、`utils/Cursor.ts`、`utils/suggestions/*`、`utils/releaseNotes.ts`、`utils/preflightChecks.tsx` 等 |

注意：大量核心实现目前仍在 `_unattributed/`（未归属段）里，例如托管层组合（`chunk-dcmhvw5a` part-051/052/056）、转录项目目录与路径清洗（`chunk-qzv7ezvq`、`chunk-f9pzpnqt`）、输入历史（`chunk-s61vbvea/part-008.js`）、调试日志类（`chunk-cgr0tezp/part-018.js`）、GrowthBook 客户端（`chunk-aepeg2w5/part-111.js`）。见第 11 节。

---

## 2. 设置：层级、合并与写入

### 2.1 来源与文件位置

`utils/settings/constants.ts`：`SETTING_SOURCES`（`chunk-5hsd6qen.js#oi`）= `userSettings, projectSettings, localSettings, flagSettings, policySettings`，**按此顺序合并，后者覆盖前者**。

| 来源 | 显示名 | 文件（`getSettingsFilePathForSource`，chunk-dcmhvw5a.js） | 可写 |
|---|---|---|---|
| userSettings | User | `<配置目录>/settings.json`（cowork 模式 `cowork_settings.json`，`--cowork` 或 `CLAUDE_CODE_USE_COWORK_PLUGINS`） | 是 |
| projectSettings | Project | `<项目根>/.claude/settings.json` | 是 |
| localSettings | Local | `<项目根>/.claude/settings.local.json`；兼容读取旧位置 `<cwd>/.claude/settings.local.json`（cwd 不是 git 根时） | 是（写入时自动加进全局 gitignore） |
| flagSettings | Flag | `--settings <文件或 JSON>`，再叠加 SDK 内联设置 | 否 |
| policySettings | Managed | 见 2.3（托管层组合） | 否 |

- `--setting-sources user,project,local` 只能裁剪前三个；`flagSettings` 与 `policySettings` 总是启用（`getEnabledSettingSources`，chunk-5hsd6qen.js#Po；`parseSettingSourcesFlag`，#Rfs）。
- diskless 或没有项目目录时 project/local 不读。
- 仓库可控来源（project/local）不被信任的键：`autoMode` 分类器规则只接受 user/flag/policy（`getAutoModeConfig`，否则打 `tengu_settings_auto_mode_rules_untrusted_source_ignored`）；`apiKeyHelper` 等会执行命令的设置来自 project/local 时需要工作区信任；`autoMemoryDirectory` 在未信任时不看 project/local。

### 2.2 读取与合并（`utils/settings/settings.ts`）

```
getInitialSettings (chunk-q8cqcff6.js#ft)          // 旧名 getSettings_DEPRECATED 是同一函数
  └ getSettingsWithErrors                            // 缓存在 settings store.mergedSettings
      └ loadSettingsFromDisk (chunk-dcmhvw5a.js)     // 每个来源：
          ├ policySettings → loadPolicySettings (#lgs) → resolvePolicySettings (#SI)
          ├ localSettings  → 先合并旧位置 settings.local.json
          ├ 其他          → parseSettingsFile (#parseSettingsFile，按文件内容缓存)
          │                  → parseSettingsFileUncached（路径安全检查：符号链接指向别处/无法核实则 fatal 拒读）
          │                  → parseSettingsContent (#ak，zod 校验；托管文档用宽容 schema)
          └ mergeWith(merged, sourceSettings, settingsMergeCustomizer (#UQ))
getSettingsForSource (chunk-q8cqcff6.js#be)         // 单来源（带 perSource 缓存）
```

合并规则 `settingsMergeCustomizer`（#UQ）：
- 数组：拼接去重（`fallbackModel` 例外，取后者）；
- `extraKnownMarketplaces`、`managedMcpServers`：对象浅合并；
- `modelPicker`：整体替换；
- 其余：lodash 默认深合并（对象递归，标量后者覆盖）。

合并后的强制项：policy 中的 `availableModels`、`enforceAvailableModels`、`modelPicker`、`deniedModels` **覆盖**合并结果（不是合并）；托管设置开启 `sandbox.filesystem.allowManagedReadPathsOnly` / `sandbox.network.allowManagedDomainsOnly` 时，其他来源的 `allowRead` / `allowedDomains` 被忽略并给出 statusOnly 警告。结束时记诊断日志 `settings_load_completed`（耗时、来源数、错误数）。

`getHighestSourceForKey`（#pI）从高到低找出某键来自哪个来源（/config、/status 用）。`getSettingsWithSources` 返回合并结果与各非空来源（/status、doctor 用）。

### 2.3 托管（policy）设置的组合

托管设置有多层，316 的组合逻辑比 2.1.88（"第一个非空者胜"）复杂得多。入口 `loadPolicySettings`（chunk-dcmhvw5a.js#lgs）→ `resolvePolicySettings`（#SI，位于 `_unattributed/chunk-dcmhvw5a/part-056.js`）。

| 层 | 来源 | 读取 |
|---|---|---|
| helper | `policyHelper` / `policyHelpers` 设置（企业 helper 程序输出设置；`composes: "tier"` 时它就是整层） | `NU()` 判定组合方式 |
| remote | 远程托管设置（2.4） | `FQ()` → remote-settings.json 缓存 |
| MDM | macOS plist（`plist`）或 Windows 注册表 `HKLM\SOFTWARE\Policies\ClaudeCode` 值 `Settings`（`hklm`） | `MdmSettingsLoader`（chunk-q8cqcff6.js#startMdmSettingsLoad）、`fireRawRead`（`reg query`）；linux 构建里 plist 分支为空 |
| file | `<托管目录>/managed-settings.json` + `<托管目录>/managed-settings.d/*.json`（按文件名排序依次叠加，后者覆盖） | `loadManagedFileSettingsFromDir`（chunk-dcmhvw5a.js#Tbr） |
| parent | 父进程传下来的托管切片（只收紧不放宽：deny 规则、禁用项、sandbox 限制等） | `extractParentManagedSlice`（#$ms） |
| hkcu | `HKCU\SOFTWARE\Policies\ClaudeCode`（用户可写，最低） | 仅在没有其他托管层时使用 |

- 托管目录（`utils/settings/managedPath.ts · getManagedFilePath`）：macOS `/Library/Application Support/ClaudeCode`，Windows `C:\Program Files\ClaudeCode`，其他 `/etc/claude-code`。WSL 下可经 `wslInheritsWindowsSettings` 继承 Windows 侧策略（`/mnt/c/...`）。verify.md 第 4 节记录了一个副作用：linux 构建在 Windows 上把 `/etc/claude-code` 解析成 `<当前盘>:\etc\claude-code`。
- 组合方式由 `managedSourcesBehavior` 决定：默认 **first-wins**（remote > MDM > file，取第一个有内容的层）；`"merge"` 时多层合并。`parentSettingsBehavior` 控制父进程切片是合并还是 first-wins。
- 宽容解析：托管文档里写错的值不使整份作废，而是按该字段的"限制性取值"处理（`buildPolicyTolerantSettingsSchema`，chunk-dcmhvw5a.js#bs），并给出警告。
- 宿主托管提供方（`CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST`）时，托管层里的模型相关设置与提供方环境变量被剥离（`stripHostManagedModelSettings`，#Mao），改由宿主覆盖（`pickHostModelOverlay`，#y1i）。
- 托管层的 env 默认取各层并集（`unionManagedTierEnv`，#FPi），`CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION` 关闭并集只用第一层。

### 2.4 远程托管设置与策略限制

**远程托管设置**（`services/remoteManagedSettings/index.ts`）：
- 端点 `getRemoteManagedSettingsEndpoint`：网关模式 `<gateway>/managed/settings`，否则 `<BASE_API_URL>/api/claude_code/settings`（Bearer 或 API key，`anthropic-beta: oauth-2025-04-20`）。
- `fetchAndLoadRemoteManagedSettings`：不适用（非第一方、无认证等）返回 `ineligible`；`CLAUDE_CODE_REMOTE_SETTINGS_PATH` 指定本地覆盖文件；否则带缓存 checksum 请求（304 沿用缓存），校验签名/组织后写 `<配置目录>/remote-settings.json`（`syncCacheState.ts`）。
- 启动时可等待首次加载（`waitForRemoteManagedSettingsToLoad`），之后后台刷新 `refreshRemoteManagedSettings`。含危险设置（会执行命令的 helper、hooks）时弹同意对话框（`securityCheck.tsx`）。
- verify.md 7.2 实测：第一方形状下启动时直连 `api.anthropic.com/api/claude_code/settings`，失败带指数退避重试 5 次。

**策略限制**（`services/policyLimits/index.ts`）：
- 适用判定 `isPolicyLimitsEligible`（返回不适用原因，undefined 表示适用）：只对第一方 API + 官方 base URL；API key 用户适用；Claude.ai OAuth 需要 `user:inference` 范围且订阅为 team/enterprise（其他订阅返回 `prosumer_oauth`）。
- `fetchPolicyLimits`：`GET /api/claude_code/policy_limits`，ETag/304，会话缓存 + 磁盘缓存 `<配置目录>/policy-limits.json`（校验签名与组织 pin）。
- 用途：`isPolicyAllowed(key)` 按策略禁用功能（如 `allow_remote_sessions`、`allow_product_feedback`），提示文案 "… disabled by your organization's policy"。

### 2.5 写入与变更监视

- `updateSettingsForSource`（chunk-q8cqcff6.js，按文件串行：`updateSettingsForSourceWithTransform`，#Da）：只写 user/project/local；先读原始文件（校验失败时保留原文，避免丢掉本版本不认识的键），`mergeWith` 时 `undefined` 表示删除键、数组整体替换；原子写（user 允许符号链接；project/local 检查父目录）；写 local 时异步把 `.claude/settings.local.json` 加进全局 gitignore；最后清缓存、通知变更。storage v5 时写存储记录，记录损坏/过大抛 `SettingsWriteRefusedError`。
- 变更监视 `utils/settings/changeDetector.ts`：监视各来源文件与 `managed-settings.d`（文件事件或轮询），MDM 定时重读，变化时发出 ConfigChange 事件；`applySettingsChange` 刷新 AppState 中依赖设置的部分。

### 2.6 设置 schema 与 env 应用

- `SettingsSchema`（`utils/settings/types.ts`）共约 **187 个顶层键**（2.1.88 为 75 个）。316 新增的部分：`policyHelper(s)`、`managedSourcesBehavior`、`parentSettingsBehavior`、`proxyAuthHelper`、`processWrapper`、`deniedModels`、`availableModelsMatch`、`enforceAvailableModels`、`modelPicker`、`modelPricing`、`modelOverrides`、`skillOverrides`、`claudeMd`（托管注入 CLAUDE.md）、`wslInheritsWindowsSettings`、`remoteTools`、`remoteControl`、`isolatePeerMachines`、`syncClaudeAiSkills/Plugins`、`disableWorkflows`、`disableArtifact`、`theme`、`verbose`、`editorMode` 等原先只在全局配置里的界面偏好。新旧差集用 `artifacts/tmp/state/{oldkeys,newkeys}.txt` 可复现。
- 设置里的 `env`：`applySafeConfigEnvironmentVariables`（chunk-q4qb1h08.js）在工作区信任前只应用安全来源（user/flag/policy）与安全变量名单（`utils/managedEnvConstants.ts` 的 SAFE_ENV_VARS 等），托管设置的值优先并在覆盖时警告；信任后应用全部。

---

## 3. 全局配置 `~/.claude.json`

### 3.1 文件位置

`getGlobalClaudeFile`（chunk-jhrww53q.js#fb）→ `resolveGlobalClaudeFile`（#y_）：
1. 若 `<配置目录>/.config.json` 存在且非空（或可写且默认文件不存在），用它（旧位置兼容）；
2. 否则 `$CLAUDE_CONFIG_DIR/.claude<后缀>.json`，未设置时 `~/.claude<后缀>.json`。后缀随 OAuth 环境：生产为空，`-staging-oauth`、`-local-oauth`、`-custom-oauth`。

注意：`CLAUDE_CONFIG_DIR` 同时决定配置目录（settings.json、projects/、history.jsonl…）和 .claude.json 的位置；未设置时配置目录是 `~/.claude/`，而全局配置文件是 `~/.claude.json`（在 HOME 下，不在 .claude 目录里）。

### 3.2 结构

默认值 `createDefaultGlobalConfig`（chunk-aepeg2w5.js）：`numStartups:0, theme:"dark", preferredNotifChannel:"auto", verbose:false, editorMode:"normal", autoCompactEnabled:true, autoScrollEnabled:true, showTurnDuration:true, diffTool:"auto", customApiKeyResponses:{approved:[],rejected:[]}, env:{}, tipsHistory:{}, memoryUsageCount:0, promptQueueUseCount:0, todoFeatureEnabled:true, messageIdleNotifThresholdMs:60000, autoConnectIde:false, autoInstallIdeExtension:true, fileCheckpointingEnabled:true, terminalProgressBarEnabled:true, cachedDynamicConfigs:{}, cachedGrowthBookFeatures:{}, respectGitignore:true, copyFullResponse:false, …`。

主要键（按用途；从代码中 `getGlobalConfig().X` 的读取统计得出，约 160 个不同键）：

| 用途 | 键 |
|---|---|
| 身份 | `userID`（64 hex，作遥测 device_id 与 `metadata.user_id.device_id`）、`machineID`、`firstStartTime`、`firstStartVersion`、`numStartups` |
| 登录 | `oauthAccount`（accountUuid、emailAddress、organizationUuid、organizationName、organizationRole、workspaceRole、displayName、billingType、hasExtraUsageEnabled、accountCreatedAt、subscriptionCreatedAt、seatTier、planDisplayName、claudeCodeTrial*…）、`primaryApiKey`、`customApiKeyResponses`、`hasCompletedOnboarding` |
| 项目 | `projects[<项目键>]`：`allowedTools, mcpServers, enabledMcpjsonServers, disabledMcpjsonServers, hasTrustDialogAccepted, hasClaudeMdExternalIncludesApproved, hasClaudeMdExternalIncludesWarningShown, exampleFiles, …` |
| 缓存 | `cachedGrowthBookFeatures(+At)`、`cachedDynamicConfigs`、`modelAccessCache`、`additionalModelOptionsCache`、`passesEligibilityCache`、`cachedExtraUsageDisabledReason`、`groveConfigCache` … |
| 界面与提示状态 | `tipsHistory`、`seenNotifications`、`lastReleaseNotesSeen`、各类 `has*Seen*`/`*SeenCount`、`diffSidebarOpen`、`copyOnSelect`、`leftArrowOpensAgents` … |
| 更新 | `installMethod`、`autoUpdates`、`autoUpdatesProtectedForNative`、`migrationVersion` |

`GLOBAL_CONFIG_KEYS`（47 个）是 `/config` 能直接改的键，`PROJECT_CONFIG_KEYS` = `allowedTools, hasTrustDialogAccepted`。

**项目键**：`getProjectPathForConfig`（chunk-aepeg2w5.js#dOe）= 原始 cwd 所在 git 根（无则 realpath），统一分隔符。`getCurrentProjectConfig` 取 `projects[键]`，不存在时 `DEFAULT_PROJECT_CONFIG`。

### 3.3 读写流程

- 启动 `enableConfigs`：读文件（损坏则备份为 `.corrupted.<ts>` 并提示恢复命令，`tengu_config_parse_error`）、`migrateConfigFields`（autoUpdaterStatus → installMethod/autoUpdates）、装入缓存；此前调用 `getGlobalConfig` 会抛 "Config accessed before allowed."。
- 读：`getGlobalConfig`（chunk-aepeg2w5.js#ue）返回内存缓存；其他进程改了文件时由 freshness watcher（`fs.watchFile` 或 storage 订阅，1 秒轮询）重新装入（`installGlobalConfigFromDisk`）。
- 写：`saveGlobalConfig(updater)` → `saveGlobalConfigQueued`（#yc）：先在内存乐观应用，再进 `global-config` 写队列；`saveConfigWithLock` 对 `.claude.json.lock` 加锁读-改-写，写前按间隔备份到 `<配置目录>/backups/.claude.json.backup.<ts>`，删除退役键（`stripRetiredConfigKeys`）。锁失败走回退写，但如果重读结果丢失了缓存里有的 `oauthAccount`/`hasCompletedOnboarding`，拒绝写入（`tengu_config_auth_loss_prevented`，注释引用 GH #3117）。

### 3.4 工作区信任

`checkHasTrustDialogAccepted`（chunk-aepeg2w5.js#Ts）：`CLAUDE_CODE_SANDBOXED` 视为已信任；会话内已接受；`projects[项目键].hasTrustDialogAccepted`；或在 git 根以内向上找到已信任的父目录（`walkUpForTrustedProject`）。`CLAUDE_CODE_IGNORE_PERSISTED_TRUST` 让持久化的信任记录全部失效（自托管 runner `--trust-workspace false` 时设置）。信任影响：project/local 设置中的 env 与 helper、apiKeyHelper、自动记忆目录设置、settings.local.json 写入等。

---

## 4. 会话存储（转录、resume、历史、AppState）

### 4.1 文件位置

| 内容 | 路径 | 代码 |
|---|---|---|
| 项目目录 | `<配置目录>/projects/<清洗名>`：路径中非 `[A-Za-z0-9]` 字符换成 `-`，超过 200 字符截断并加 `-<hash36>` | `getProjectDir`（chunk-qzv7ezvq.js#ZS）、`sanitizeProjectPath`（chunk-f9pzpnqt.js#b0） |
| 项目目录名覆盖 | `CLAUDE_CODE_PROJECT_DIR_NAME`（只在自定义配置目录或 diskless 时生效；`^[A-Za-z0-9_-]{1,64}$`） | `getProjectDirNameOverride`（chunk-cgcrer2m.js#wHn） |
| 主转录 | `<项目目录>/<sessionId>.jsonl` | |
| 子代理转录 | `<项目目录>/<sessionId>/subagents/[子目录/]agent-<agentId>.jsonl`，元数据侧车 `agent-<id>.meta.json` | `getAgentTranscriptPath`（chunk-qzv7ezvq.js#fm） |
| 远程代理元数据 | `<项目目录>/<sessionId>/remote-agents/remote-agent-<taskId>.meta.json` | |
| 输入历史 | `<配置目录>/history.jsonl`（0600，加锁追加） | `PromptHistoryStore`（chunk-s61vbvea.js#Pm） |
| 粘贴缓存 | `<配置目录>/paste-cache/<sha256 前 16 hex>.txt` | `utils/pasteStore.ts` |
| 图片缓存 | `<配置目录>/image-cache/<sessionId>/` | `utils/imageStore.ts` |
| 后台任务输出 | `<项目临时目录>/<sessionId>/tasks/<taskId>.output` | `utils/task/diskOutput.ts` |
| 并发会话 | `<配置目录>/sessions/<pid>.json` | `utils/concurrentSessions.ts` |
| Bash 会话环境 | `<配置目录>/session-env/…/{setup,sessionstart,cwdchanged,filechanged}-hook-N.sh` | `utils/sessionEnvironment.ts` |
| 计划文件 | `<计划目录>/<slug>.md`（设置 `plansDirectory`） | `utils/plans.ts` |

### 4.2 记录类型

写入策略表 `ENTRY_WRITE_POLICY`（chunk-e6aww6q8.js#v$i）列出 **47 种**记录类型（2.1.88 的 `types/logs.ts` 为 18 种）：

- **dedup-transcript**（按 uuid 去重；`isSidechain` 且有 agentId 时写子代理文件）：`user`、`assistant`、`attachment`、`system`、`progress`。
- **always**（元数据，直接追加）：`summary`、`custom-title`、`ai-title`、`last-prompt`、`tag`、`ended-by-model`、`continued-in`、`relocated`、`agent-name`、`agent-color`、`agent-setting`、`pr-link`、`frame-link`、`artifact-comment-monitor`、`artifact-autoreact-ledger`、`bridge-session`、`history-suppression`、`file-history-snapshot`、`file-history-delta`、`attribution-snapshot`、`mode`、`permission-mode`、`isolation-latch`、`dev-mods`、`memory-mode`、`atis-latch`、`tools-used`、`worktree-state`、`cost-state`、`queue-operation`。
- **route-by-agent**（有 agentId 时写子代理文件）：`content-replacement`、`api-request-shape`、`api-request-blob`、`api-request`、`fork-context-ref`、`observer-ref`。

消息记录的公共字段（`Project.insertMessageChain`）：`parentUuid`（压缩边界为 null，另记 `logicalParentUuid`）、`isSidechain`、`teamName`、`agentName`、`promptId`（user）、`agentId`、`sessionId`、`version`、`gitBranch`、`slug`、`cwd`、`userType`、`entrypoint`、`timestamp`、`uuid`，加消息本体。user 消息带 `sourceToolAssistantUUID` 时 parent 改指该 assistant。

### 4.3 写入链路

```
recordTranscript / recordSidechainTranscript
  → getProject (chunk-e6aww6q8.js#Na)：首次创建 Project，注册退出清理与 process.on("exit")
  → Project.insertMessageChain（trackWrite 计数）
      首条 user/assistant/system 到来前不建文件（materializeSessionFile），之前的元数据暂存 pendingEntries
  → Project.appendEntry：按 ENTRY_WRITE_POLICY 选目标文件 → enqueueWrite（按文件的 writeQueues）
  → scheduleDrain：100ms 定时器（FLUSH_INTERVAL_MS）
  → drainQueuesOnce：拼成 jsonl，单块 ≥100MB 分批 → appendToFile（O_APPEND；撕裂尾行先补换行）
```

- 删除消息、压缩重写、叶子撤回是写队列中的特殊项。
- 元数据（标题、tag、last-prompt…）会周期性在文件尾重写（`reAppendSessionMetadata`），让只读头尾的 lite 列表看到最新值。
- cwd 变化（进入 worktree）时 `relocateSessionTranscript`（#_Et）把转录迁到新项目目录，期间写入进 `relocationBuffer`，旧文件改名 `.superseded-<ts>`。
- 退出时 `sealAppendsForShutdown` + `flushSessionStorage` 保证落盘。

### 4.4 resume / continue

1. 参数解析 `parseSessionIdentifier`（chunk-ndmse9kj.js#Pbs）：`.jsonl` 路径（分配新 sessionId）、UUID、URL（远程 ingress）。
2. 入口 `utils/conversationRecovery.ts · loadConversationForResume`（query 领域）：
   - `--continue`（无参数）：`iBo`（chunk-e6aww6q8.js）列出当前项目的会话，跳过 bookkeeping、已被后台会话接续（continued-in）、superseded、正在运行的后台会话，取最新一条。
   - `--resume <id>`：`loadSessionFile`（chunk-e6aww6q8.js#Smo）按"会话记录的 projectDir → 当前项目目录 → 清洗名截断冲突的兄弟目录"定位文件，找不到再试 worktree 目录（`tengu_resume_worktree_fallback`）和全局扫描（`tengu_transcript_id_scan_fallback`）。
3. 加载：逐行解析（坏行跳过并计数）；`getLastSessionLog` 选叶子，`buildConversationChain` 沿 `parentUuid` 回溯（环检测 `tengu_chain_parent_cycle`、时间戳回退、补回并行 tool_result），`checkResumeConsistency`。
4. 列表（/resume 选择器）只读文件头尾（`readLiteMetadata`、`getSessionFilesLite`），选中后 `loadFullLog`。
5. 后处理 `processResumedConversation`（chunk-08s5p3av.js#u1n）：`--fork-session` 时生成新 sessionId 并复制 content-replacement，否则 `restoreSessionMetadata` + `adoptResumedSessionFile` 继续写原文件；恢复费用状态、worktree（不适用则退出）、代理定义、权限模式（存的 auto 在 proactivity=ask 时降级）；计划文件随之复制。
6. 跨项目：`checkCrossProjectResume` 给出 `cd … && claude --resume …` 提示；同仓库的 worktree 可直接恢复。
7. verify.md `tty-session` 场景实测：退出时打印 "Resume this session with: claude --resume <id>"。

### 4.5 输入历史 history.jsonl

`PromptHistoryStore.add`：`CLAUDE_CODE_SKIP_PROMPT_HISTORY` 关闭记录；敏感命令不记；与上一条相同则去重；粘贴内容 ≤1024 字内联，否则写 paste-cache 只记 `contentHash`。

记录形状：`{display, pastedContents: {[id]: {id, type: "text"|"image", content? | contentHash?, mediaType?, filename?}}, timestamp, project, sessionId}`。

写入批量追加（加锁、0600），失败重试最多 5 次，退出时 `flushOnExit`。读取倒序、本会话优先再同项目，最多 100 条；范围 session/project/everywhere。另有"清掉的草稿"可回翻。

### 4.6 AppState

`createStore`（chunk-2mbp91tg.js#hs）是最小 store：`setState(updater)`，引用不变不通知，变化时先 `onChange({newState, oldState})` 再通知订阅者。默认状态 `getDefaultAppState` 的主要字段：`settings, tasks, transcripts, runningSubagents, agentNameRegistry, toolPermissionContext, mainLoopModel, agent, agentDefinitions, fileHistory, attribution, mcp, plugins, todos, inbox, thinkingEnabled, fastMode, sessionEffort, promptSuggestion, replBridge*`，以及约 25 个 `artifact*ConsentSlugs` 字段（316 新增）。React 侧 `AppStateProvider`（不可嵌套）、`useAppState(selector)`、`useSetAppState`。

---

## 5. 记忆系统

### 5.1 CLAUDE.md 发现顺序

`utils/claudemd.ts · getMemoryFiles`（chunk-e6aww6q8.js#QHo）按以下顺序收集（后出现的在系统提示中靠后，优先级更高）：

1. **Managed**：`<托管目录>/CLAUDE.md`；宿主注入内容；托管设置 `claudeMd` 字段；`<托管目录>/.claude/rules/*.md`。
2. **User**（userSettings 启用且非 diskless）：`<配置目录>/CLAUDE.md`、`<配置目录>/rules/*.md`。
3. **从文件系统根到原始 cwd 的每一层**：`CLAUDE.md`、`.claude/CLAUDE.md`（Project）、`.claude/rules/*.md`、`CLAUDE.local.md`（Local）。cwd 在 git worktree 中时，主仓库里位于 worktree 之外的层不加载 Project 文件。projectSettings/localSettings 被 `--setting-sources` 禁用时跳过对应文件。
4. 外部注入的记忆文件（经 `claudeMdExcludes` 过滤）。
5. **`--add-dir` 目录**（需 `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD`）：CLAUDE.md、.claude/CLAUDE.md、.claude/rules、CLAUDE.local.md。
6. **AutoMem**：自动记忆可用且没有 --add-dir 时，读 `<自动记忆目录>/MEMORY.md`（截断 200 行 / 25,000 字节）。

其他规则：
- `.claude/rules/*.md` 的 frontmatter `paths:` 使其成为条件规则，只在访问匹配路径时加载（`processConditionedMdRules`）；访问 cwd 以下目录时 `getMemoryFilesForNestedDirectory` 补加载该目录的文件。
- 设置 `claudeMdExcludes` 排除 User/Project/Local 文件；`CLAUDE_CODE_DISABLE_CLAUDE_MDS` 关闭嵌套加载；`--bare` 时整个跳过。
- AGENTS.md 只统计是否存在（`tengu_claudemd__initial_load.agents_md_count`），**不加载内容**。
- 注入系统提示时前言为 "Codebase and user instructions are shown below…"（`MEMORY_INSTRUCTION_PROMPT`），每个文件附类型说明（`getClaudeMds`：project instructions, checked into the codebase / user's private project instructions, not checked in / user's auto-memory… / organization-managed policy instructions / user's private global instructions for all projects）。

### 5.2 @include

`parseMemoryFileContent` → `extractIncludePathsFromTokens`（用 marked 词法解析）：
- 语法 `@路径`，正则 `/(?:^|\s)@((?:[^\s\\]|\\ )+)/g`；`\ ` 表示空格；`#` 之后是片段，被去掉。
- 接受 `./相对`、`~/家目录`、`/绝对`（不能是 `/` 本身）、普通相对名（以字母数字 `._-` 开头）。
- 代码块、行内代码中的 `@` 忽略；HTML 注释先剥离（注释外残留文字里的 @ 仍识别）。
- 最大嵌套深度 5（`MAX_INCLUDE_DEPTH`，chunk-e6aww6q8.js#Jzr）；已处理路径去重；非文本扩展名跳过。
- 解析到原始 cwd 之外的"外部 include"需要项目配置 `hasClaudeMdExternalIncludesApproved`（审批对话框）；User 级文件总是允许。User 级顶层符号链接、多硬链接文件被拒绝。

### 5.3 自动记忆（memdir）

- **开关** `getAutoMemoryState`（chunk-aepeg2w5.js#yh）：`--safe-mode`/`CLAUDE_CODE_SAFE_MODE`、diskless → off；`CLAUDE_CODE_DISABLE_AUTO_MEMORY` 为真 → off、为假（如 `0`）→ 强制开；`CLAUDE_CODE_SIMPLE`（--bare）或远程会话（`CLAUDE_CODE_REMOTE` 且没有 `CLAUDE_CODE_REMOTE_MEMORY_DIR`）→ off；否则看设置 `autoMemoryEnabled`。
- **目录** `AutoMemPathResolver`（memdir/paths.ts，chunk-aepeg2w5.js#sc）：`CLAUDE_COWORK_MEMORY_PATH_OVERRIDE` → 设置 `autoMemoryDirectory`（policy → flag → 信任后 local/project → user）→ 默认 `<记忆根>/projects/<项目键>/memory/`。记忆根 = `CLAUDE_CODE_REMOTE_MEMORY_DIR` 或配置目录；项目键优先工作副本根，其次主仓库 git 根（worktree 共享主仓库的记忆），再项目根，清洗规则同转录目录。
- **入口文件** `MEMORY.md`：截断 200 行 / 25,000 字节并注明删掉了什么（`truncateEntrypointContent`）；提示词 `buildMemoryLines` 说明四种记忆类型 **user / feedback / project / reference**、frontmatter（name、description、type）、"What NOT to save"、单文件 ≤4096 字节建议。
- **相关记忆检索** `findRelevantMemories` / `selectRelevantMemories`：扫描记忆目录的 frontmatter 生成清单，用小模型挑选与当前请求相关的记忆。

### 5.4 回合后提取（extractMemories）与 autoDream

- **提取器** `initExtractMemories`（services/extractMemories）：本地模式由 GrowthBook `tengu_passport_quail` 打开（非交互会话还需 `tengu_slate_thimble`）；每 N 回合运行一次（`tengu_bramble_lintel`，默认 1）。跳过条件：本区间主模型已直接写过记忆、用户文字太少、权限规则会拒绝记忆写入（给用户警告）、超额计费、"first look" 小模型判否。之后派生记忆子代理，工具权限由 `createAutoMemCanUseTool` 限制（禁 MCP、只能读写记忆目录）。hosted 模式由 `CLAUDE_CODE_POST_TURN_MEMORY` + `CLAUDE_CODE_POST_TURN_MEMORY_CONFIG`（JSON：every_n_turns、prose_gate、when_overage、first_look…）配置。
- **autoDream**（services/autoDream）：配置 `tengu_onyx_plover`（null 表示关；minHours 默认 24、minSessions 默认 5）。距上次整理 ≥24 小时、期间有 ≥5 个其他会话改动过项目，且会话扫描 10 分钟节流通过时，取 `<记忆目录>/.consolidate-lock`（内容为 PID，mtime 记上次整理时间，1 小时内且持有进程存活则放弃），派生整理子代理；失败回滚锁的 mtime。

### 5.5 多 store 同步（取代旧 team memory）

`CLAUDE_MEMORY_STORES` 配置多个记忆 store（scope：user / account / team；account 目录 `<配置目录>/memory/personal/`，team 目录 `<自动记忆目录>/team/<mount>/`），经 Anthropic API `/v1/memory_stores`（beta `agent-memory-2026-07-22`）同步，本地 `.memory-sync` manifest 记录状态；周期重同步（`tengu_memory_store_resync_interval_minutes`，`CLAUDE_CODE_DISABLE_MEMORY_PERIODIC_RESYNC` 关闭）。写共享记忆前用 `scanForSecrets` 拒绝含密钥的内容（`services/teamMemorySync/secretScanner.ts`、`teamMemSecretGuard.ts`）。核心代码在 `_unattributed/chunk-s61vbvea/part-016~018.js`，尚未逐函数命名。

---

## 6. 认证

### 6.1 凭证来源

`utils/auth.ts`：

- **是否走 Claude.ai OAuth**：`isAnthropicAuthEnabled`（chunk-aepeg2w5.js#fl）。第三方提供方、WIF profile、存在 `ANTHROPIC_AUTH_TOKEN` / 已生效的 `ANTHROPIC_API_KEY` / apiKeyHelper / `CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR` 时为 false；`ANTHROPIC_UNIX_SOCKET` 时只看 `CLAUDE_CODE_OAUTH_TOKEN`。
- **Bearer 令牌来源** `getAuthTokenSource`（#ua），按顺序：`ANTHROPIC_AUTH_TOKEN` → `CLAUDE_CODE_OAUTH_TOKEN`（或宿主注入）→ OAuth 文件描述符（`CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR`，或 CCR 已知文件 `/home/claude/.claude/remote/.oauth_token`）→ apiKeyHelper → profile（WIF）→ 安全存储中的 claude.ai 令牌 → none。
- **API key 来源** `getAnthropicApiKeyWithSource`（#pR）：`ANTHROPIC_API_KEY`（需在 `customApiKeyResponses.approved` 中，按 key 末 20 位；否则首次使用时弹确认）→ `CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR` → apiKeyHelper → `~/.claude.json` 的 `primaryApiKey`（来源记为 "/login managed key"）。**316 不再从 macOS 钥匙串读 API key**（2.1.88 在 darwin 上会读），`saveApiKey` 仍会写钥匙串。
- **令牌存储**：`getClaudeAIOAuthTokens`（#D1）读安全存储的 `claudeAiOauth`；Linux/Windows 为明文 `<配置目录>/.credentials.json`，macOS 为钥匙串服务 "Claude Code<后缀>-credentials"（`utils/secureStorage/*`，permissions 领域）。
- **Anthropic 自有 API 的认证头**（profile、remote settings、policy limits、sessions…，`utils/http.ts`）：订阅用户 `Authorization: Bearer` + `anthropic-beta: oauth-2025-04-20`；API key 用户 `x-api-key`。

### 6.2 apiKeyHelper

设置 `apiKeyHelper` 指定的命令输出 API key。来自 project/local 设置且工作区未信任时拒绝执行；在项目根执行，超时 10 分钟；结果缓存 TTL 默认 5 分钟（`CLAUDE_CODE_API_KEY_HELPER_TTL_MS`）；失败时沿用旧值，没有旧值则缓存空格占位并记录失败。`--bare` 时只认 `--settings` 里的 apiKeyHelper。

### 6.3 OAuth 登录与刷新

- 配置（`constants/oauth.ts`，query 领域）：CLIENT_ID `9d1c250a-e61b-44d9-88ed-5944d1962f5e`；授权 `https://platform.claude.com/oauth/authorize`（Console）或 `https://claude.com/cai/oauth/authorize`（Claude.ai）；TOKEN_URL `https://platform.claude.com/v1/oauth/token`；scopes `user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload user:plugins`（Console 登录另加 `org:create_api_key`）。
- 登录流程 `OAuthService`（services/oauth/index.ts）：PKCE（S256）→ `AuthCodeListener` 在 127.0.0.1 随机端口起回调 `http://localhost:<port>/callback`（起不来时退回手动粘贴，redirect `https://platform.claude.com/oauth/code/callback`）→ `buildAuthUrl` → 浏览器 → `exchangeCodeForTokens` → `saveOAuthTokensIfNeeded`（写安全存储）→ `/api/oauth/profile` 写 `oauthAccount` → Console 登录时 `createAndStoreApiKey` 生成 API key 存为 `primaryApiKey`。
- **过期判断** `isOAuthTokenExpired`：提前 5 分钟视为过期。
- **刷新** `checkAndRefreshOAuthTokenIfNeeded` → `checkAndRefreshOAuthTokenIfNeededImpl`（#pl）：不需要/没有 refresh token/已知失效/账户冻结/非 claude.ai 令牌时不刷新；在配置目录加文件锁，ELOCKED 时随机等 1–2 秒、最多重试 5 次，仍失败则检测死锁持有者并接管；拿到锁后再读一次，别的进程已刷新就直接用（`tengu_oauth_token_refresh_race_resolved`）。`refreshOAuthToken` POST TOKEN_URL（grant_type=refresh_token）。
- **跨进程感知**：凭证文件 mtime（或存储 version）变化时清缓存。
- **401**：`handleOAuth401ErrorImpl` 清缓存后刷新；无 refresh token 时可由宿主启动器（`CLAUDE_CODE_HOST_AUTH_ENV_VAR`）或 SDK 回调续签；远程子进程连续认证失败超过 `CLAUDE_CODE_AUTH_FAIL_EXIT_MS`（默认 10 分钟）退出。
- **登出**（commands 领域 `performLogout`）：吊销 refresh token（`<TOKEN_URL>/revoke`）、清认证缓存、删 API key 与安全存储中的令牌、清 `oauthAccount`。

### 6.4 第三方提供方

`getAPIProvider`（services/api，query 领域）：网关条件优先（`gateway`），否则按 `CLAUDE_CODE_USE_BEDROCK` → `FOUNDRY` → `ANTHROPIC_AWS` → `ANTHROPIC_GOOGLE_CLOUD` → `MANTLE` → `VERTEX` 取第一个，都没有为 `firstParty`。

| 提供方 | 认证相关 |
|---|---|
| Bedrock | 设置 `awsAuthRefresh`（先用 STS GetCallerIdentity 检查现有凭证，无效才执行，超时 3 分钟）、`awsCredentialExport`（输出 STS JSON）；默认凭证链按区域缓存；env `AWS_BEARER_TOKEN_BEDROCK`、`ANTHROPIC_BEDROCK_BASE_URL`、`CLAUDE_CODE_SKIP_BEDROCK_AUTH` |
| Vertex | 设置 `gcpAuthRefresh`（google-auth-library 检查，结果缓存 1 小时）；项目 `ANTHROPIC_VERTEX_PROJECT_ID`/`GCLOUD_PROJECT`；区域 `CLOUD_ML_REGION`（默认 us-east5）与按模型的 `VERTEX_REGION_*`；`CLAUDE_CODE_SKIP_VERTEX_AUTH` |
| Foundry | `ANTHROPIC_FOUNDRY_RESOURCE`/`_BASE_URL`/`_API_KEY`/`_AUTH_TOKEN`、`CLAUDE_CODE_SKIP_FOUNDRY_AUTH` |
| Anthropic AWS / Google Cloud / Mantle | 316 新增，各有 `CLAUDE_CODE_SKIP_*_AUTH` |

这些 helper 来自 project/local 设置时同样需要工作区信任。第三方提供方下 1P 遥测、GrowthBook、Datadog、错误日志都不发（见 7.5）。

### 6.5 网络：代理、mTLS、CA、User-Agent

- 代理：`https_proxy`/`HTTPS_PROXY`/`http_proxy`/`HTTP_PROXY`，`NO_PROXY`；安装 undici 全局 dispatcher 与 axios 拦截器；316 新增 `proxyAuthHelper`（需 `CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER`）与经代理访问回环/云元数据地址的 SSRF 拦截。
- mTLS：`CLAUDE_CODE_CLIENT_CERT`、`CLAUDE_CODE_CLIENT_KEY`、`CLAUDE_CODE_CLIENT_KEY_PASSPHRASE`（Bun 下用 `Bun.FetchSession`）。
- CA：`NODE_EXTRA_CA_CERTS` 未在环境中时，可从 settings.env 或 `~/.claude.json` 的 env 读取注入。
- User-Agent：`claude-cli/2.1.316 (external, <entrypoint>[, agent-sdk/<v>][, client-app/<app>][, workload/<…>])`，与 verify.md 7.3 实测 `claude-cli/2.1.316 (external, sdk-cli)` 一致。

### 6.6 云端会话（teleport）

`utils/teleport.tsx`、`utils/teleport/api.ts`：Sessions API `<BASE_API_URL>/v1/code/sessions`（列表、`/<id>`、`/<id>/events`、`/<id>/archive`），环境 `/v1/environment_providers`。只在第一方 API 可用；需策略 `allow_remote_sessions`。创建时上传 git bundle、发初始消息；拉回本地时校验仓库一致、检出分支、转换事件。316 新增可信设备令牌头、设备登记与会话设备绑定。

---

## 7. 遥测与分析

### 7.1 logEvent 管线

```
services/analytics/index.ts · logEvent (chunk-8kte1b36.js#a)
  ├ sink 未挂上：入队（上限 1000，满了丢最旧并计数）
  └ sink.logEvent
services/analytics/sink.ts · initializeAnalyticsSink (chunk-ryc3zkv1.js#poe)：启动时挂 sink 并回放队列
  logEventToSinks (#M)：防重入
    采样：tengu_event_sampling_config[event].sample_rate（tengu_feature_ok 再按 feature 二级采样；0 丢弃）
    等待 GrowthBook 初始化
    ├ Datadog：shouldTrackDatadog = !killswitch.datadog && tengu_log_datadog_events
    │           trackDatadogEvent(event, stripProtoFields(meta))
    └ 1P：logEventTo1P (chunk-aepeg2w5.js#J8t)
```

- 事件名：`tengu_*`，全二进制约 3,400 个不同字符串。事件元数据（`services/analytics/metadata.ts · getEventMetadata`）附带 model、sessionId、userType、betas、env 块（platform、arch、terminal、shell、包管理器、运行时、CI/GitHub Action/远程标志、版本、部署环境…）、auth（account/organization uuid）等。
- `_PROTO_*` 字段只进 1P 的特权列，发 Datadog 前被 `stripProtoFields` 去掉。

### 7.2 Datadog

`services/analytics/datadog.ts · trackDatadogEvent`：只在 `getAPIProvider()==="firstParty"` 时发；事件必须在白名单内（243 个，2.1.88 为 41 个）；端点 `https://http-intake.logs.us5.datadoghq.com/api/v2/logs`，客户端 token `pubea5604404508cdd34afb69e6f42a05bc`（2.1.88 为另一个 token）；`ddsource=nodejs, service=claude-code, env=external`，ddtags 带 event、arch、entrypoint、model、platform、provider 等；刷新间隔 `CLAUDE_CODE_DATADOG_FLUSH_INTERVAL_MS`（默认 15s）。

### 7.3 1P 事件日志

- `initialize1PEventLogging`：批量配置 `tengu_1p_event_batch_config`；OTel LoggerProvider，logger 名 `com.anthropic.claude_code.events`，resource `service.name=claude-code`、`service.version=2.1.316`。
- `FirstPartyEventLoggingExporter`：`POST https://api.anthropic.com/api/event_logging/v2/batch`（2.1.88 为 `/api/event_logging/batch`；`ANTHROPIC_BASE_URL` 为 staging 时发 staging）；超时 10s、批 200、退避 500ms→30s、最多 8 次；失败批落盘 `<配置目录>/telemetry/1p_failed_events.*`，下次启动重发。
- 事件 protobuf `ClaudeCodeInternalEvent`（`types/generated/events_mono/claude_code/v1/`）：event_name、client_timestamp、model、session_id、user_type、betas、env（EnvironmentMetadata）、entrypoint、is_interactive、auth（account/organization uuid）、event_id、device_id、agent_id、parent_session_id、skill_name、plugin_name、mcp_server_name、git_remote_url 等。GrowthBook 曝光另有 `GrowthbookExperimentEvent`。

### 7.4 GrowthBook 特性开关

- 启用条件 `isGrowthBookEnabled`（chunk-aepeg2w5.js#Dm）= `!DISABLE_GROWTHBOOK && 1P 遥测未被屏蔽`；`CLAUDE_CODE_GB_DISK_CACHE_WHEN_TELEMETRY_OFF` 时遥测关闭也可读磁盘缓存。
- 客户端：remoteEval 模式，`apiHost` 默认 `https://api.anthropic.com`（`/api/eval/<key>` 或 `/api/eval-authed/<key>`），clientKey `sdk-zAZezfDKGoZuXXKe`；用户属性：id/deviceID（userID）、sessionId、platform、apiBaseUrlHost（非官方 base URL 时）、organizationUUID、accountUUID、userType=external、subscriptionType、rateLimitTier、organizationRole、email、appVersion、releaseChannel、entrypoint 等。
- 缓存：`~/.claude.json` 的 `cachedGrowthBookFeatures`；刷新间隔 `tengu_gb_refresh_interval_minutes`（5–360，默认 360 分钟）。本地覆盖 env `CLAUDE_INTERNAL_FC_OVERRIDES`。
- 取值接口：`getFeatureValue_CACHED_MAY_BE_STALE`（#v，全局约 900 处调用）、`getFeatureValueWithSource_CACHED_MAY_BE_STALE`、`getFeatureValue_SESSION_PINNED`（本进程首次读到后固定）、`checkGate_CACHED_OR_BLOCKING`、`getDynamicConfig_CACHED_MAY_BE_STALE`。特性名多为无意义代号（`tengu_onyx_plover`、`tengu_passport_quail`…），本手册在各节写明了已知含义。

### 7.5 关闭方式（"开关 → 关掉什么"，对照 verify.md 第 4 节、7.1 节）

隐私级别 `getPrivacyLevel`（utils/privacyLevel.ts）：`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` → `essential-traffic`；否则 `DISABLE_TELEMETRY` 或 `DO_NOT_TRACK` → `no-telemetry`；否则 `default`。1P 屏蔽门 `isFirstPartyTelemetryBlocked`（chunk-f22e0a61.js#Ey）= 隐私级别非 default || 非第一方提供方（且不是宿主托管）|| 网关 || `CLAUDE_CODE_CUSTOM_OAUTH_URL`。

| 开关 | 效果 |
|---|---|
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | 1P 事件、GrowthBook、Datadog（门取默认 false）、BigQuery 指标全关；错误日志不记；自动更新关闭；changelog 不拉取；verify.md 实测 Bootstrap、servedCatalog、插件下载等也据此关闭 |
| `DISABLE_TELEMETRY` / `DO_NOT_TRACK` | 1P、GrowthBook、Datadog、BigQuery 关；错误日志仍记 |
| `DISABLE_GROWTHBOOK` | 只关 GrowthBook（所有特性取默认值） |
| `DISABLE_ERROR_REPORTING` | 不写 `<缓存目录>/errors/*.jsonl` |
| 第三方提供方（Bedrock/Vertex/Foundry/…） | 1P、GrowthBook、Datadog、错误日志都不发 |
| killswitch `tengu_frond_boric` | 服务端远程关 Datadog / 1P |
| `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY` | 关反馈问卷 |
| `CLAUDE_CODE_ENABLE_TELEMETRY` | **打开**用户自配的 OTel 导出（默认关） |

### 7.6 OpenTelemetry（用户自配）

`utils/telemetry/instrumentation.ts · initializeTelemetry`：`CLAUDE_CODE_ENABLE_TELEMETRY` 为真时按 `OTEL_METRICS_EXPORTER` / `OTEL_LOGS_EXPORTER` / `OTEL_TRACES_EXPORTER`（otlp、prometheus、console）与 `OTEL_EXPORTER_OTLP_*` 建导出器；设置 `otelHeadersHelper` 可动态生成头。指标：`claude_code.session.count`、`lines_of_code.count`、`pull_request.count`、`commit.count`、`cost.usage`、`token.usage`、`code_edit_tool.decision`、`active_time.total`。事件 `claude_code.<name>`（user_prompt 等；提示词内容需 `OTEL_LOG_USER_PROMPTS`）。增强追踪的 span：`claude_code.interaction`、`llm_request`、`tool`、`tool.execution`、`subagent.spawn`、`hook`、`compaction`、`mcp.rpc` 等。另有不依赖该开关的 BigQuery 指标：team/enterprise 用户 `POST <BASE_API_URL>/api/claude_code/metrics`。

### 7.7 调试、错误与诊断日志

- 调试日志 `logForDebugging`（chunk-cgr0tezp.js#t）→ `DebugLogger`（`_unattributed/chunk-cgr0tezp/part-018.js`）：`--debug`、`-d`、`--debug=<过滤>`、`--debug-to-stderr`/`-d2e`、`--debug-file <路径>`、env `DEBUG`、`DEBUG_SDK`；级别 `CLAUDE_CODE_DEBUG_LOG_LEVEL`；路径 `--debug-file` > `CLAUDE_CODE_DEBUG_LOGS_DIR/<session>.txt` > `<配置目录>/debug/<sessionId>.txt`（维护 `latest` 链接）。过滤语法：逗号分隔分类，`!` 前缀表示排除。消息经密钥脱敏。
- 错误日志（`utils/log.ts · logError`，ui 领域）：写 `<缓存目录>/errors/<YYYY-MM-DD>.jsonl`；MCP 日志 `<缓存目录>/mcp-logs-<server>/`。缓存目录 = env-paths("claude-cli").cache。
- 诊断日志 `logForDiagnosticsNoPII`：仅在 `CLAUDE_CODE_DIAGNOSTICS_FILE` 设置时写 JSON 行（settings_load_started/completed、memory_files_started 等）。

---

## 8. 基础设施要点

- **环境探测**（utils/env.ts、envUtils.ts、platform.ts）：环境变量有集中注册表（`chunk-jhrww53q.js`，约 1,226 个名字，见 verify.md 7.1）；`isEnvTruthy` 接受 `1/true/yes/on`；`getPlatform` 返回 macos/windows/wsl/linux（linux 构建固化 platform=linux，再按 /proc/version 判 WSL）；`isBareMode` = `--bare` 或 `CLAUDE_CODE_SIMPLE`；`isSafeMode` = `--safe-mode` 或 `CLAUDE_CODE_SAFE_MODE`。
- **git**（utils/git.ts、utils/git/*）：git 根查找不 spawn（逐级 lstat `.git`）；worktree 的 `.git` 文件经 gitdir → commondir → 回指 → realpath 校验后才映射到主仓库根；分支/HEAD/远程 URL 由 `GitFileWatcher` 直接读 `.git` 文件并缓存，reftable 仓库才回退 spawn git。
- **worktree**（utils/worktree.ts）：`<仓库>/.claude/worktrees/<slug>`，分支 `worktree-<slug>`；加锁原因 `claude <agent|session> <id> (pid N start T)`，持有进程退出后自动释放；`.worktreeinclude` 复制被忽略文件；设置 `worktree.baseRef`。
- **署名**（utils/attribution.ts、commitAttribution.ts）：`attribution.commit/pr` 设置优先；`includeCoAuthoredBy: false` 时为空；默认 `Co-Authored-By: <模型名> <noreply@anthropic.com>`；另按文件按字符统计 Claude 贡献，PR 描述可附贡献比例。
- **IDE**（utils/ide.ts）：lockfile `<配置目录>/ide/<port>.lock`（JSON：workspaceFolders、pid、ideName、transport、authToken）；WSL 下也扫 Windows 侧目录；轮询最多 30 秒找工作区包含 cwd 的 IDE。
- **防睡眠**（实现 `chunk-0sfjpx19.js#fo`，未归属）：macOS 上引用计数地 spawn `caffeinate -i -t 300`，每 4 分钟续一次。
- **提示（tips）**：约 70 条内置；冷却按 `numStartups - tipsHistory[id]`；设置 `spinnerTipsEnabled`。
- **更新日志**：缓存 `<配置目录>/cache/changelog.md`（2.1.88 存在全局配置里）。
- **预检**（utils/preflightChecks.tsx）：首次运行 GET `<BASE_API_URL>/api/hello` 与 OAuth 源的 `/v1/oauth/hello`（verify.md `tty-first-run` 实测失败时显示 "Unable to connect to Anthropic services"）。

---

## 9. 配置项与环境变量速查（本领域读取的主要项）

**设置键**：`apiKeyHelper`、`awsAuthRefresh`、`awsCredentialExport`、`gcpAuthRefresh`、`otelHeadersHelper`、`proxyAuthHelper`、`processWrapper`、`policyHelper(s)`、`managedSourcesBehavior`、`parentSettingsBehavior`、`env`、`permissions`、`sandbox`、`model`/`availableModels`/`deniedModels`/`enforceAvailableModels`/`modelPicker`、`claudeMd`、`claudeMdExcludes`、`autoMemoryEnabled`、`autoMemoryDirectory`、`autoDreamEnabled`、`attribution`、`includeCoAuthoredBy`、`worktree.baseRef`、`plansDirectory`、`cleanupPeriodDays`、`spinnerTipsEnabled`、`forceLoginMethod`、`forceLoginOrgUUID`、`wslInheritsWindowsSettings`、`autoUpdatesChannel`。

**环境变量（按主题）**：
- 目录与模式：`CLAUDE_CONFIG_DIR`、`CLAUDE_CODE_PROJECT_DIR_NAME`、`CLAUDE_CODE_SIMPLE`、`CLAUDE_CODE_SAFE_MODE`、`CLAUDE_CODE_RESTRICTED`、`CLAUDE_CODE_SANDBOXED`、`CLAUDE_CODE_IGNORE_PERSISTED_TRUST`、`CLAUDE_CODE_USE_COWORK_PLUGINS`、`CLAUDE_CODE_REMOTE_SETTINGS_PATH`、`CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION`、`CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST`。
- 会话：`CLAUDE_CODE_SKIP_PROMPT_HISTORY`、`CLAUDE_CODE_RESUME_*`、`CLAUDE_CODE_SESSION_KIND`、`CLAUDE_ENV_FILE`、`CLAUDE_CODE_MAX_TURNS`。
- 记忆：`CLAUDE_CODE_DISABLE_AUTO_MEMORY`、`CLAUDE_CODE_DISABLE_CLAUDE_MDS`、`CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD`、`CLAUDE_CODE_REMOTE_MEMORY_DIR`、`CLAUDE_COWORK_MEMORY_*`、`CLAUDE_MEMORY_STORES`、`CLAUDE_CODE_POST_TURN_MEMORY*`。
- 认证：`ANTHROPIC_API_KEY`、`ANTHROPIC_AUTH_TOKEN`、`CLAUDE_CODE_OAUTH_TOKEN(_FILE_DESCRIPTOR)`、`CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR`、`CLAUDE_CODE_API_KEY_HELPER_TTL_MS`、`CLAUDE_CODE_USE_BEDROCK/VERTEX/FOUNDRY/ANTHROPIC_AWS/ANTHROPIC_GOOGLE_CLOUD/MANTLE`、`CLAUDE_CODE_SKIP_*_AUTH`、`CLAUDE_CODE_CLIENT_CERT/KEY(_PASSPHRASE)`、`NODE_EXTRA_CA_CERTS`、`HTTP(S)_PROXY`、`NO_PROXY`、`CLAUDE_CODE_CUSTOM_OAUTH_URL`。
- 遥测：`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`、`DISABLE_TELEMETRY`、`DO_NOT_TRACK`、`DISABLE_GROWTHBOOK`、`DISABLE_ERROR_REPORTING`、`CLAUDE_CODE_ENABLE_TELEMETRY`、`OTEL_*`、`CLAUDE_INTERNAL_FC_OVERRIDES`、`CLAUDE_CODE_DEBUG_LOG_LEVEL`、`CLAUDE_CODE_DEBUG_LOGS_DIR`、`CLAUDE_CODE_DIAGNOSTICS_FILE`。

**GrowthBook（本领域用到、含义已确认的）**：`tengu_event_sampling_config`（事件采样）、`tengu_log_datadog_events`（Datadog 开关）、`tengu_frond_boric`（Datadog/1P killswitch）、`tengu_1p_event_batch_config`、`tengu_gb_refresh_interval_minutes`、`tengu_cozy_dusk`（BigQuery 指标间隔）、`tengu_passport_quail` / `tengu_slate_thimble` / `tengu_bramble_lintel`（记忆提取）、`tengu_onyx_plover`（autoDream）、`tengu_moth_copse`（外部注入记忆文件）、`tengu_ochre_finch` / `tengu_gorse_fathom`（记忆提示变体）、`tengu_memory_store_resync_interval_minutes`、`tengu_mighty_sprout`（worktree 锁写法）、`tengu_context_usage_bulk_counts`（/context 批量计数）、`tengu_ccr_stored_gap_bridge_enabled`、`tengu_swift_whistle`（1P 认证附带）。

---

## 10. 与 2.1.88 的差异（有代码证据）

| 方面 | 2.1.88 | 2.1.316 |
|---|---|---|
| 托管设置 | remote > MDM > file > HKCU，第一个非空者胜 | 新增 policyHelper 层、父进程切片、宿主模型覆盖、`managedSourcesBehavior: merge`、宽容解析、WSL 继承 Windows 策略、env 并集 |
| 设置 schema | 75 个顶层键 | 约 187 个（见 2.6） |
| 存储 | 只写文件 | storage v5 后端与 diskless 进程（几乎所有持久化都有两条路径） |
| 转录记录类型 | 18 种 | 47 种（写入策略表），新增转录迁移（relocate）、撕裂尾行封闭、远程镜像 |
| 项目目录名 | 固定清洗 | 可由 `CLAUDE_CODE_PROJECT_DIR_NAME` 覆盖 |
| SessionMemory、MagicDocs | 存在 | 已删除（`DEFAULT_SESSION_MEMORY_TEMPLATE`、`# MAGIC DOC:` 在 316 中不存在；这些路径下的声明是错配） |
| 团队记忆 | `/api/claude_code/team_memory?repo=` | `/v1/memory_stores` 多 store 同步，新增 account 作用域 |
| 记忆提取 | 本地提取器 | 新增 hosted post-turn 配置、first look 预判、超额跳过、idle flush |
| API key | darwin 读钥匙串 | 只读 `primaryApiKey`；新增 WIF、宿主启动器令牌、4 种新提供方、proxyAuthHelper、SSRF 守卫 |
| Datadog | 41 个白名单事件、旧 token | 243 个、新 token、字段白名单与 ddtags |
| 1P 端点 | `/api/event_logging/batch` | `/api/event_logging/v2/batch` |
| 调试日志 | 函数式 | `DebugLogger` 单例类，新增 `CLAUDE_CODE_DEBUG_LOGS_DIR`、`latest` 链接 |
| worktree | 约 1,500 行 | 约 2,560 行：pid 锁、陈旧锁释放、符号链接祖先检查、`worktree.baseRef` |
| 提示（tips） | 47 条 | 约 70 条，新增市场插件推荐 |
| changelog | 存全局配置 | 缓存文件并迁移旧数据 |
| `isAutoMemoryEnabled`（旧名） | 返回"是否启用" | 同位置函数（chunk-aepeg2w5.js#Sh）返回"环境默认关闭"，语义相反 |

---

## 11. 未解之处与已知缺口

- 多 store 记忆同步引擎（`_unattributed/chunk-s61vbvea/part-016~018.js`、`chunk-hwmsct5x/part-008.js`）只定位未命名。
- `resolvePolicySettings`（chunk-dcmhvw5a.js#SI）中 "held"/"substitute"/"floors" 一系列托管文档保护机制（对不可信位置的托管文件只采纳限制性值）只读懂了骨架。
- 转录压缩重写（`Project.performCompactTranscript*`，阈值 20MB）与字节级转录扫描器（chunk-e6aww6q8.js#uIt，10KB）未细读。
- 401 处理后半段、teleport 环境选择与 git bundle 策略未细读（chunk-aepeg2w5.js#L1、chunk-e6aww6q8.js#teleportToRemote）。
- 若干判定函数含义未查：`Sgt()`（autoDream 前置条件）、`lk()`（自动记忆 off 条件）、`Slt()`（BigQuery 指标另一条件）。
- 本领域 4,364 个顶层声明中仍有约 500 个（入度 ≥1 的约 500 个）保持压缩名或自动名，多数是混入的外来代码（切分问题）或低引用常量；过程文档列出了建议的归属修正。
