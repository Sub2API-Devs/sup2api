# 第五阶段：放错文件与名字/说明配错（第三轮修正，fixer3）

日期 2026-11-03。输入是第三轮顶层命名组 `docs/process/naming-s0.md` … `naming-s9.md` 的"发现的问题 / 放错文件"一节，外加 `docs/process/tidy.md` 末尾"遗留"里的 2 个待决。每条都用 `artifacts/tmp/fixer3/` 的脚本核对过：当前归属取自 `analysis/segments/decl-path.jsonl`，名字取自 `naming/final/top.json`，另看调用方/被调方、chunk 左右邻居与代码片段。

## 交付

| 文件 | 内容 |
|---|---|
| `naming/placement-zzzzz-fixer3.json` | 216 条，覆盖 42 个目标路径（含 10 个新文件） |
| `naming/semantic-zzz-fixer3.jsonl` | 10 条名字修正，confidence 0.97 |
| `naming/docs-zzz-fixer3.jsonl` | 11 条说明改正 |
| `naming/modules-fixer3.json` | 10 条新文件/新增段落说明 |
| `artifacts/tmp/fixer3/gen.mjs` | 裁决表 → 交付文件的生成脚本（`node artifacts/tmp/fixer3/gen.mjs`） |
| `artifacts/tmp/fixer3/{lib,f3look,grp,q,table,batch,around,mods,names}.mjs` | 核对工具（本地副本，读同一份 analysis 数据） |

校验：`placement-zzzzz-fixer3.json` 216 个键全部命中 `analysis/scan/decls.jsonl`，目标路径全部合法（无 `_new/`、`_unattributed/`），无一条是"目标等于当前路径"的空操作。
`node --max-old-space-size=3000 tools/naming/annotate.mjs check naming/semantic-zzz-fixer3.jsonl` → `10 lines, 9 chunks, 0 problems, 0 suffixed by conflicts`。

## 汇总

| 项 | 数量 |
|---|---|
| 搬（声明） | 216 |
| 改名 | 10 |
| 说明改正 | 11 |
| 新文件 | 10（含 2 个 vendor 新文件） |
| 驳回（不搬/不改名） | 50 |
| tidy 遗留裁决 | 2（都维持现状，见末节） |

## 一、搬（216 个声明，42 个目标）

### 1.1 只有一个调用方/邻居就是目标模块

| 报告 | 声明 | 从 → 到 | 证据 |
|---|---|---|---|
| s0 | `ag5x7vhf#rC/#ch/#_u/#oC/#mh` | `components/ContextVisualization.tsx` → `components/FullscreenLayout.tsx` | 全屏布局的 scroll test 占位区块。`ScrollTestFiller` 唯一调用方是 `FullscreenLayout:ScrollTraceRuler`，chunk 里 5 个声明连续（25016–27597），被 `FullscreenLayout` 的两条声明夹住；`/context` 可视化不含它 |
| s0 | `ah34pb7m#Qn/#rn` | `bridge/inboundMessages.ts` → `components/pluginUi/renderSiteExports.ts`（新） | 两个命名空间对象（`PlacedSite`、`CommandOutputSite`/`frameOf`/`printedTextOf` 的导出壳），消费方是 `components/Message`、`components/messages/UserTextMessage`；同 chunk 的其它消息渲染声明都在 `components/`，与桥接入站消息无关。各自的 `Ar(ns,{...})` 注册语句没有独立声明 id，会跟随所在文件 |
| s1 | `bwbq4xvm#k` | `components/permissions/…/QuestionNavigationBar.tsx` → `utils/betas.ts` | 唯一调用方 `utils/betas`（用它定义 beta 表），同 chunk 邻居是 `defineLocalBeta`/`BETA_CLAUDE_CODE`；被放的组件里零引用 |
| s1 | `vrr64ez0#_r` | `daemon/attach/attachJob.ts` → `daemon/jobs/adoptRecord.ts` | 该 var 解构出的 4 个名字（`ADOPT_RECORD_SCHEMA_BASE`/`ADOPT_RECORD_MAX_AGE_MS`/`MAX_ADOPT_SHELLS`/`adoptRecordSchema`）唯一调用方是 `daemon/jobs/adoptRecord`，attachJob 自身不用 |
| s2 | `bhxaz9j0#_Vt/#b/#FYo/#Toi/#A` | `utils/mcpOutputStorage.ts` → `services/artifacts/autoEditAttribution.ts` | 全部读写 `getLiveState().autoEditAttribution` / `pipelineReplyOrigins`；同 chunk 的 `koi`/`UYo`/`Aoi`/`Coi`/`Roi`/`xoi` 已在目标模块，位置相邻 |
| s2 | `tp07j3pd#M/#y/#_/#S/#b` | `services/api/requestHeaders.ts` → `services/cloudSessions/setupProgress.ts` | 唯一调用方全是 `setupProgress`（`updateSetupStep`/`readSetupStepFields`/`applySetupEvent`）；chunk 里紧跟 `STALE_AFTER_MS` 起的 21 个 setupProgress 声明，被放到了不相干的 SSRF 文件 |
| s3 | `d4eg9at2#yn/#bn` | `ink/root.ts` → `cli/handlers/plugins.ts` | `yn` 是 `--values-stdin` 的 256 KB/64 KB 上限，`bn`（`getOptions_2`）只被 `pluginConfigureHandler` 调用；同 chunk 其余 59 个声明都是 `plugin` 子命令 |
| s4 | `hwmsct5x#Qy/#fh` | `services/api/requestHeaders.ts` → `services/api/unwatchedReplyHold.ts` | 持留来源集合与 `heldReplyHoldMs` 是"无人观看时暂存流式回复"的参数，`unwatchedReplyHold` 里已经把整组 import 过去（其 `MAX_HELD_BYTES` 等常量的定义体就在这个 var 里） |
| s4 | `gfcxsygg#BQe/#Bht` | `services/artifacts/artifactReadConsent.ts` → `tools/AgentTool/agentColorManager.ts` | 颜色分配器/N 号空分配器，调用方 `screens/REPL`、`utils/queryContext`、`QueryEngine`、`entrypoints/mcp`；目标模块已有同族的 `NO_OP_COLOR_ASSIGNER` 语义 |
| s4 | `gfcxsygg#VMr/#Jce` | 同上 → `screens/repl/bridgeChannelSlot.ts`（新） | `BridgeChannelSlot` 唯一调用方 `screens/REPL:createBridgeChannelSlot`，`Jce` 是它的空槽位常量 |
| s5 | `77a3xzkb#i` | `services/lowPriorityMode.ts` → `services/lowPriority/lowPriorityMode.ts` | 读 `LOW_PRIORITY_STATE` 的宿主态访问器；`services/lowPriority/` 才是这一族的家，外层文件是 import 方 |
| s5 | `9cjx5pnm#R/#qs/#Ks` | `services/plugins/publish/validationCopy.ts` → `services/plugins/publish/publishSnapshot.ts` | 排除原因与路径助手（`getExclusionReason`/`exclusionEntriesFor`/`relativePosixPathOf`），`publishSnapshot` 的 `excludeListedFiles` 是唯一/主要调用方 |
| s5 | `cgr0tezp#Bs` | `services/mcp/officialRegistry.ts` → `utils/redaction/urlRedaction.ts` | 内容是"反斜杠+@ 的 URL 混淆检测"，唯一调用方是 `urlRedaction:isRestrictedDestination`；同 chunk 也在 `urlRedaction` 里 |
| s5 | `1ny7cxrt#Kbe/#Bbe` | `services/claudeGateway/spendLimits.ts` → `services/claudeGateway/usageMetering.ts` | SSE 用量解析状态与事件分隔正则，`usageMetering` 的 `accumulateSseUsage`/`finishSseUsage` 是消费者 |
| s6 | `8wvtd8sr#Js` | `tools/ArtifactTool/durableWake.ts` → `tools/ArtifactTool/artifactUrls.ts` | 纯转发 `return artifactCardTitle(e)`，目标模块才是实现 |
| s6 | `e6aww6q8#pet/#K6n/#V6n/#p$o/#B_e/#$Et/#zEt/#mNi/#m$o` | `services/pluginTest/claudeTestPlugin.ts` → `plugins/bundled/claudeTest/constants.ts` | claude-test 插件的 id/版本/文案/内容摘要/安装根与 skill 命令串，7 个调用方都是 `plugins/bundled/claudeTest/*` |
| s7 | `ah34pb7m#bWe` | `utils/claudeInChrome/toolRendering.tsx` → `utils/tasks.ts` | 统计可见任务数，调用方是 `components/tasks/*`、`PromptComposer`、`SystemTextMessage`，与 Chrome 渲染无关 |
| s7 | `jhrww53q#d_` | `utils/fsRemove.ts` → `utils/permissions/protectedDirs.ts` | 按受保护目录过滤，`refs=0`；判据函数 `classifyProtectedDir` 就在目标模块 |
| s7 | `xkyzvvf1#y3e` | `utils/deepFreezePlainData.ts` → `components/permissions/consentRows.ts` | `"(invalid tool name)"` 常量，调用方是同意行/权限对话框一族（`consentRows`、`useInboxPoller`、`forwardedPermissionDialog`） |
| s7 | `s61vbvea#bZs/#vqr` | `utils/attributionFileClasses.ts` → `utils/attribution.ts` | `Claude-Session:` 署名文本的校验（长度 1..2048、无控制字符），唯一调用方 `utils/attribution:getSessionTrailerParts` |
| s8 | `nt75hmzb` 的 31 个 daemon 路径声明 | `utils/sandbox/userNamespace.ts` → `services/daemon/paths.ts` | `services/daemon/paths` 第一行就 import 这些；文件里只剩 uid_map 解析属于 userNamespace。chunk 内 `paths` 的声明与它们交错，可以确认是同一切分块误放 |
| s8 | `q8cqcff6` 的 10 个 MDM 加载器声明 | `utils/settings/managedPluginTiers.ts` → `utils/settings/mdm/mdmLoader.ts`（新） | `mdmLoader`/`ensureMdmLoaded`/`mdmResult`/`setMdmReadOutcomes` 等被 `settings/mdm/settings`、`cli/fastPathSettings`、`main` 用；文件名"托管插件层级"名不副实（真正的层级常量只有 2 条，留在原文件） |
| s8 | `q8cqcff6` 的 21 个宿主环境变量簿记声明 | `utils/settings/managedSettingsFiles.ts` → `utils/settings/hostEnvWrites.ts`（新） | 宿主写过的环境变量快照/恢复（`withHostEnvRestored`/`withHostOwnedEnv`/`snapshotHostOwnedEnv`/缺失变量提示），与"读托管设置文件"只在 `AQ` 一处耦合 |
| s8 | `kswt4qha` 的 7 个 autoCompactOffer 声明 | `utils/permissions/permissionSetup.ts` → `services/compact/autocompactOffer.ts` | `readAutoCompactOffer`/`markAutoCompactOfferEligibleLogged`/`bumpAutoCompactOfferEsc`/`markAutoCompactOfferResolved`/`updateAutoCompactOffer`/`isAutoCompactOfferAnswered`/`ownPropertyValue` 的调用方是 `services/compact/autocompactOffer` 与 `sessionNotices` |
| s8 | `kswt4qha` 的 6 个 effort 携带声明 | 同上 → `utils/effort.ts` | `carriedEffortForModel`、`releaseCarriedEffortForEffortChange`、`releaseCarriedEffortIfModelChanged`、`hasCarriedRefusalEffort`、`isEffortCarryDisabled`、`isSpecialEffortKeywordDisabled` 的调用方是 `utils/effort`/`EffortSlider`/`onChangeAppState`/`queryLoop` |
| s8 | `dcmhvw5a#QOe/#CE/#$o/#lps/#dps/#ups` | `utils/permissions/autoModeRulesPrompt.ts` → `constants/figures.ts` | 界面字形常量（暂停/播放/菱形/竖条等），调用方遍布 `components/`；`constants/figures.ts` 已有同族的 `BRIDGE_SPINNER_FRAMES`，chunk 内紧邻 |
| s8 | `dcmhvw5a#Ib/#ze` | 同上 → `vendor/zod/v4/classic/deferredOptional.js`（新） | 直接操作 `_zod` 内部结构的 zod 扩展（`ZodDeferredOptional` + `deferredOptional` 包装） |
| s8 | `dcmhvw5a` 的 19 个 lodash 合并实现 | `utils/settings/settingsSourceTrust.ts` → `vendor/lodash-es/_mergeWithFamily.js`（新） | `baseMerge`/`createAssigner`/`isIterateeCall`/`safeGet` 已在 lodash-es 路径下，这一族是 `mergeWith` 的内联拷贝（`safeSet`/`baseIsEqualWith`/`mergeDeep`/`cloneDeepWith`/`toKeyString` 及其别名） |
| s8 | `ddkccdnb#cpr` | `utils/permissions/permissions.ts` → `utils/plugins/marketplaceNames.ts` | 市场名防冒充，只调用 `isOfficialMarketplaceRef`/`hasSimilarMarketplaceName` |
| s8 | `e6aww6q8#Lqe/#B4t` | `utils/permissions/autoModeUnavailable.ts` → `utils/permissions/browserComputerUseTools.ts` | 浏览器工具输入的只读判定，被 `BROWSER_TOOL_INPUT_CHECKS` 当回调用 |
| s8 | `e6aww6q8#ZGn` | `utils/sessionStorage.ts` → `utils/plugins/installedPluginsManager.ts` | 只有 `mkdirSync(pluginsDir)`，调用方是 `installedPluginsManager` 的两处写清单 |
| s8 | `e6aww6q8#Q9o` | `utils/sessionStorage.ts` → `commands/team-onboarding/gather.ts` | 团队引导转录扫描常量（扫描上限 50 MB、命令/工具名正则），唯一使用方 `gather:scanSessionUsage`；chunk 内被 `gather`/`api` 的声明夹住 |
| s8 | `e6aww6q8#Wen` | `commands/terminalSetup/index.ts` | 核对后无位移：同文件 `waitForStoreValue` 被同文件两处使用 → 驳回（见第三节） |
| s9 | `e6aww6q8#BTr/#jTr` | `utils/Shell.ts` → `utils/worktree.ts` | `WORKTREES_SEGMENT`/`WORKTREE_CONFIG_SUFFIXES` 是 git worktree 片段，`isWorktreeConfigPath` 唯一调用方是 `shell/argvLimits:checkArgvLimits` |
| s9 | `e6aww6q8` 的 8 个 sandbox 桩 | `utils/shell/bashProvider.ts` → `utils/sandbox/sandboxRuntimeStubs.ts`（新） | `SANDBOX_RUNTIME_DEFAULTS`/`getSandboxRuntimeDefaults`/`isPythonLegEnabled`/`isSandboxEnforcedStub`/`isContainersLegStub`/`getSandboxInnerShellStub`/`getSnapshotOverrideStub`/`getSandboxExtraArgsStub`（后者 `refs=0`），与 bash provider 无关 |
| s9 | `aepeg2w5` 的 13 个 CCR 客户端事件上传声明 | `utils/telemetry/memorySummary.ts` → `utils/telemetry/clientEventUploader.ts`（新） | `ClientEventUploader` 及其错误类、批量统计、签名与 JSON 归一化；同一文件里另一半才是内存归因 |
| s9 | `p52gp8zk#Me` | `utils/telemetry/gatewayIdentityAttributes.ts` → `utils/telemetry/repositoryAttributes.ts` | `OTEL_METRICS_INCLUDE_DEFAULTS` 与仓库属性同族（`repositoryAttributes` 里 4 处导入） |
| s9 | `t0gq9gyw#nOi/#dA/#Pt/#Tlo/#vt/#Y1e` | `utils/truncateGraphemes.ts` → `utils/mediaLimits.ts`（新） | 媒体/请求上限（base64 10 MB、图片边长、PDF 页数与整篇上限、按通道取限值、tile 计数），调用方是 FileReadTool、`api/claude`、`pdf`、`mcpOutputStorage`、`requestTooLarge` |
| s9 | `k50y1rw8#kAo/#CMr` | `utils/transcriptIds.ts` → `utils/teleport/dirSync.ts` | 目录同步记录键与文件名（`DIR_SYNC_RECORD_SUFFIX` 来自 `storageKeys`），转录定位只保留 `resolveTranscriptLocation` 一族 |
| s6 | `aepeg2w5#Aro` | `services/routines/routinesApi.ts` → `services/analytics/metadata.ts` | 设备显示名，被 `analytics/metadata` 与 `services/tools/toolExecution` 使用，与 routines API 无关 |
| s6 | `41w44bgm#Fs` | `skills/bundledSkills.ts` → `services/workflow/scriptFile.ts` | `O_NONBLOCK` 常量与 `O_NOFOLLOW` 同 var，唯一消费方 `scriptFile:loadWorkflowScriptFile`；目标模块里已有同义常量 |
| s8 | `18hwfzwa`（未给 id） | — | 拼接残留，无独立声明可搬 → 驳回 |

### 1.2 tidy 遗留的 2 个待决

1. **`services/mcp/_new/discoverAuthorizationServer`**（现 `services/mcp/auth.ts`）：**维持**。它是 v2 副本，调用链在 `performMCPXaaAuth`/`ClaudeAuthProvider` 内部（`ke`→`Ze`/`Qe`），而 v1 副本（`services/mcp/xaa.ts` 的 `discoverProtectedResource`/`discoverAuthorizationServer`）自成一套、被 `performCrossAppAccess` 使用。`services/mcp/v1/` 目录在 2.1.88 也不存在（`references/claude-code-analysis/src/services/mcp/` 只有 `auth.ts` 与 `xaa.ts`），新建目录会把"v1/v2 两代副本"这个事实藏起来；现有说明已写明"v2 副本"，读者能分辨。
2. **`utils/_new/isSameWslDistro`**（现 `utils/idePathConversion.ts`）：**维持**并改名 `checkWSLDistroMatch`。2.1.88 里它就在 `utils/idePathConversion.ts` 且导出名就是 `checkWSLDistroMatch`（`references/…/utils/idePathConversion.ts:79`），`utils/ide.ts` 从那里导入；放进 `ide.ts` 反而偏离旧版。改名已写进 `semantic-zzz-fixer3.jsonl`。

## 二、改名（10）

| 声明 | 原名 | 新名 | 依据 |
|---|---|---|---|
| `s61vbvea#Xh` | getAutoUpdatedPluginNames | `filterHooksByPluginHold` | 按"钩子是否来自托管/可更新插件"过滤一组钩子，返回组或空数组；与"列插件名"无关（s2） |
| `hnwnzznd#nAo` | isUrl | `urlMatchesHost` | `r===e \|\| e==="http://"+r \|\| e==="https://"+r`，是"与主机相同"而不是"是 URL"（s2） |
| `v9tcvh08#se` | CLAUDE_3_5_HAIKU_CONFIG | `MODEL_CONFIGS` | 一条 var 里是 haiku35…fable51 的整张配置表，不止 3.5 haiku（s2） |
| `mxpjbr4y#z` | isResultTruncated | `formatHomeSeedNoticeLine` | 拼 `${前缀}: ${正文}${后缀}` 一行，与截断无关（s5） |
| `cgr0tezp#Bs` | normalizeUrl | `hasConfusableAuthority` | 反斜杠+@ 的 URL 混淆检测，不是规范化（s5） |
| `ddkccdnb#cpr` | copsSimilar | `hasSimilarMarketplaceRef` | 市场名相似检查；原名是压缩名（s8） |
| `e6aww6q8#ZGn` | appendEntryToFile | `ensurePluginsDirectoryExists` | 函数体只有 `mkdirSync(pluginsDir)`（s8） |
| `e6aww6q8#WTr` | WINDOWS_PROFILE_ENV_VARS | `INJECTABLE_ENV_VARS` | 集合里并入了代理 CA/token 变量，范围比"Windows 档案变量"大（s9） |
| `gjx0rh1b#Kr` | BUNDLE_OUTPUT_NAME | `createBundleOutput` | 该声明是函数（建临时目录并返回 bundle 路径），旧版把这处声明贴到了函数头（s9） |
| `j0y6ypnr#Lai` | isSameWslDistro | `checkWSLDistroMatch` | 旧版导出名（见 1.2） |

## 三、驳回（46）

**位置本身合理（26）**

- s2 `utils/pastedContent`：13 个声明同 chunk 连续、互相调用，模块主题就是粘贴内容标签与展开，拆开反而切断私有助手（`K_s`/`q_s`/`zhe`）。
- s2 `gitSafeExec#Ot`：与同文件 `envReaderHolder` 相依，调用方 `gitSafeInvocation`/`gitConfigAudit` 同属 git 安全族。
- s2 `utils/messages` 的 `QAs`/`JAs`/`L6s`（模型结果内联代码改写）：与消息规整同族，被 `directMemberMessage` 使用。
- s2 `messageQueueManager#OIt`（hasUnpassedScreening）：队列筛查本身。
- s2 `errors#JY`（withTelemetryFacts）：给错误对象附加遥测字段，就近于错误工具。
- s2 `deviceHooks` 的 `Ir`/`Ln`：同一个 `var` 里的执行器与超时/上限常量，被 deviceHooks 五个文件共用。
- s2 `model#Uu` / `modelOptions#FU`/`LU`：两文件互为镜像的数值夹取，合并要 lead 定，不在本轮范围。
- s2 五处"旧版名配错"注释（`classifierModel`、`planModeModel`、`configs`、`model`、`modelAllowlist`、`thirdPartyDefaultFallbacks`）：现状名（`inherit1mSuffix`、`isTierDefaultModelEnv`、`prependClaudePrefixIfVersioned` 等）已正确，只是旧注释过时。
- s3 十一条"位置正确、只是旧版匹配错"：`gS`（describeTables）、`dd`（CLASSIFY_MAX_TOKENS）、`dos`（resolveImportSpec）、`V_`（osc）、`qL`（readMemoryDirEntries）、`Ce`（averageOf）、`RE`（judgingResult）、`Qj`/`wE`（pressFill）、`Nrs`（press 键）、`gr`（SLOW_HOOK_REPORT_INTERVAL_MS）。
- s4 `requestHeaders#Lb`：`TENGU_BUZZING_PIKE` 组本来就在 `services/api/gzipRequestBody.ts`（报告看的是旧快照），无操作。
- s5 `ptag3qm7` 的 `n`/`Rso`/`c`/`D3e`/`YCi`：`ccrMetaMcp` 就是 hearthbot 的 meta MCP，hearth 工具名在这里是对的。
- s5 `82kqcve8#gm`/`#wa`（解析 retry-after）：唯一用户是 `orgMemory/storeApi` 自己的 `parseStoreHttpError`，不是通用 HTTP 客户端。
- s6 `88g43zt5#dn`、`9fcadreh#DCs/#LCs`、`tmx5d02z#ji`、`9tyqgtn4#lTs/#mTs`、`6vnxsn99#Cn`：位置正常，仅为记录。
- s7 `kxyd0g16#Le`、`dq968kwq#me/$e/Ie`、`y1shfdfm#Kt`：文件内的常量区位置差异，不是跨文件错放。
- s9 `e6aww6q8#WRo/#qRo`（POWERSHELL_UTF8_PRELUDE / PS_DEFAULT_CHILD_ENV）：被 `powershellProvider` 自身三处使用，同文件合理。
- s9 `e6aww6q8#Wen`（waitForStoreValue）：同文件两处使用，`terminalSetup` 就是它的家。
- s8 `18hwfzwa@730567` 段（可选 require 槽位）：拼接残留，没有独立声明可指定目标。

**没有可用的目标（9）**

- s5 `e6aww6q8#iZt`：`[...new Map().values()]` 空实现，无目标。
- s7 `claudeInChrome` 的 `ise`/`FNo`/`PQ`：导入方分散在四个 chunk，没有单一去向。
- s7 `eg496hkq` 的 `It`/`Pt`（36/1024）：声明体在 `ProjectsTool` 的大 var 里，拆出来会切断同 var 的其他绑定。
- s9 `k50y1rw8#c`/`#d`/`#C$s`/`#R$s`：转录定位与目录同步记录共用 `sanitizeIdSegment`，只搬了 `kAo`/`CMr` 两条；其余留在 `transcriptIds`。
- s9 `words.ts` 的 `repairMalformedStringsDeep`/`taggedId`：已在 `utils/stringUtils`，`utils/words` 里是导入别名。
- s9 `shutdown/pendingWrites#n0e`：与 `untrustedValues#Pf` 逻辑重复，但改结构超出本轮（建议后续复用一个）。
- s9 `statusNoticeDefinitions#_I`：21 个 notice 对象是同一张表，只建议加注释。

**报告者自己存疑或只是建议（6）**

- s6 `zv6whf9m#we`/`#yz`：构建裁剪残留，只记录。
- s7 `2x56e6nv` 的 `BROWSER_TOOL_INPUT_SCHEMAS` 拆分（fileUploadTool / browserTools）：建议级，拆分需要同时改导出名冻结表。
- s8 `e6aww6q8` 的 `appendEntryToFile`：已按改名处理，不再搬。
- s9 `3dq9c61y#z`：`detectTerminal` 在旧版归 `deepLink`，但本 chunk 里真正的 `detectTerminal` 已被命名成 `hostPlatform`（只被 `collectHostProfile`/`gatherHostProfile` 用），位置是工具链探测自身。
- s9 `aepeg2w5#Zj`：`teleport/api` 里本来就合理。
- s1/s3 未给声明 id 的若干"备注"（如 `mcpStringUtils` 的 remote-browser 文案、`issuerKey`）：只记录。

## 四、说明改正（11）

见 `naming/docs-zzz-fixer3.jsonl`。其中 5 条是改名后同步（`Xh`、`nAo`、`se`、`z`、`Bs`、`ZGn`、`WTr`、`Lai`），2 条是原说明与代码不符（`cpr`、`pe`），其余（`z`@3dq9c61y、`WTr`、`pe`）是补足证据。

## 五、新文件（8 个一方 + 2 个 vendor；另有一个并入已有模块）

| 文件 | 内容 |
|---|---|
| `cli/print/hostOtelEvents.ts` | 宿主 OTel 事件信封校验/限流/丢弃上报 + 反馈问卷枚举与显示配置 |
| `components/pluginUi/renderSiteExports.ts` | `PlacedSite`/`CommandOutputSite` 导出壳 |
| `screens/repl/bridgeChannelSlot.ts` | REPL 桥/频道槽位 |
| `utils/settings/mdm/mdmLoader.ts` | MDM 加载器宿主态 |
| `utils/settings/hostEnvWrites.ts` | 宿主环境变量簿记与恢复 |
| `utils/mediaLimits.ts` | 媒体/请求体积上限 |
| `utils/telemetry/clientEventUploader.ts` | CCR 客户端事件上传队列 |
| `utils/sandbox/sandboxRuntimeStubs.ts` | sandbox-runtime 配置桩 |
| `plugins/bundled/claudeTest/constants.ts`（并入已有） | claude-test 插件 id/版本/文案/安装根/命令串 |
| `vendor/lodash-es/_mergeWithFamily.js` | mergeWith 家族内联片段 |
| `vendor/zod/v4/classic/deferredOptional.js` | zod 延迟可选类型 |

## 六、给 lead 的提醒

1. **`cli/print/mcpTurnRedial.ts` 被拆走 27/37 个声明**，剩下的 `createMcpRetryOrchestrator`/`createNextTurnRedialer`/`PendingMcpToolsByServer`/`ck`/`RO`/`mk`/`tK`/`MO`/`EO`/`IO`/`OO`/`fk` 才是"下一回合重拨"。`hostTelemetryProxy.ts` 从新文件 import 的 16 个名字要跟着改导出方。
2. **`services/daemon/paths.ts` 一次收 31 条**，与原有 14 条同处一文件后约 45 个声明，仍是单一职责（daemon 运行时/套接字/密钥路径），可接受。
3. `utils/settings/managedSettingsFiles.ts` / `managedPluginTiers.ts` 在搬空后只剩"读托管设置文件"与"插件层级常量"，文件头说明应同步改写（本轮只写了新文件的说明，没改旧文件说明，避免与 doc-sync 冲突）。
4. **与更早放置表的覆盖关系**：按文件名排序 `placement-zz-fixes.json` < `placement-zzz-lead.json` < `placement-zzzz-tidy.json` < `placement-zzzzz-fixer3.json`，本表最后加载。与 `zz-fixes` 有 4 个键、与 `zzzz-tidy` 有 1 个键重合，都是本轮有意改判（见下一条）；与 `zzz-lead` 无重合。
5. **导出清单要跟着核对**：本轮有 5 个键覆盖了更早的放置表（`placement-zz-fixes` 的 9cjx5pnm#R/#qs/#Ks、1ny7cxrt#Kbe，`placement-zzzz-tidy` 的 jhrww53q#d_），它们的原模块（validationCopy、spendLimits、fsRemove）的 `export {…}` 仍列着这些名字；重新生成阅读树后需要确认这些模块不再导出已搬走的绑定（emit 对找不到本地绑定的导出项应有兜底）。

## 七、未做/未覆盖

1. **说明改正只覆盖 11 条**：其余"名字配错但没改名"的声明（如 `hookUpdatedInput#DGe` 名已正确、`classifierModel` 等旧注释）只在本文记录，没有覆盖其他人的 docs 表。
2. **s3 的 `plugins/functionHooks/hostBridge#sessionTargetId`/`normalizePluginHostAction`（`chunk-1tz177x8`）**：报告说"应归 computerUse"，但两者被 `hostBridge` 自身与 engineShim 使用，属"误归 computerUse"这条旧注释的遗留，不改。
3. **s6 `3zy56vtn#A`**：报告给的 id 不存在（`chunk-3zy56vtn` 里没有 `A`），同 chunk 的 `jd7h5dfe#A`（`scopedMap`）我判定为 `toolHostAdvert` 里的死代码（只在该文件 `identity(new Map, o=>o.clear())` 自用），不搬。
4. **`utils/truncateGraphemes` 的 `isAllPrintable`/`sanitizeDisplayChars` 一族**（s9 提到"混放"）：是显示文本净化，与媒体上限不同族，留在原文件。
