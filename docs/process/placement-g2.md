# 第三阶段放置：组 2（place-g2）过程记录

范围：`analysis/segments/placement-work.json` 的 `groups[2].chunks`（228 个 chunk），其中未归属声明（`_unattributed/…`）6,594 个、`_new/*` 门面模块 37 个（1,216 个声明），合计 7,810 个声明 / 2,547,141 字节。

## 1. 结果数字

| 项 | 数 |
|---|---|
| 范围内声明 | 7,810 个（未归属 6,594 个 / 2,210,045 字节；`_new/*` 1,216 个 / 337,096 字节） |
| 已放置 | **7,808 个 / 2,547,095 字节（99.998%）** |
| 未放置 | 2 个 / 46 字节（见第 6 节） |
| 目标文件 | 498 个：2.1.316 新增 421 个，并入已有模块路径 70 个，vendor 7 个 |
| `_new/*` 门面模块 | 37 个全部给出正式路径（见第 4 节） |
| 语义名 `naming/semantic-p2.jsonl` | 897 条（全部顶层绑定，偏移键用 `tools/rename/lib/rename.mjs` 的 `bindingsOf` 求得；门面已命名的 7 个只写说明不写名） |
| 说明 `naming/docs-p2.jsonl` | 188 条（大声明与关键入口） |
| 模块说明 `naming/modules-p2.json` | 498 条（每个目标路径一条；新文件写"2.1.316 新增"，已有路径写"已有模块；g2 补充…"，vendor 写"第三方"） |

文件规模：3–60 个声明的 401 个；少于 3 个的 79 个（多为独立小 chunk 的单个常量/门面，或并入已有模块的零星声明）；超过 60 个的 18 个（`plugins/functionHooks/sites/siteRules.ts` 120 个小规则对象、`ui/validateTree.ts` 105 个、`utils/settings/settings.ts` 163 个并入已有门面模块等，见第 7 节）。

## 2. 工具与重建

全部脚本在 `artifacts/tmp/p2/`，头注释写明输入输出：

| 脚本 | 作用 |
|---|---|
| `stats.mjs` | 范围统计 |
| `runs.mjs` → `runs.json` / `runs.txt` | 每个 chunk 内"连续同路径段"（段号是规格的键） |
| `dump.mjs` → `decls.txt`、`ctx.mjs` → `ctx.txt` / `graph.json` | 逐声明摘要（门面名、旧版名、字符串、chunk 内引用）、段的出入边 |
| `peek.mjs`、`sect.mjs` | 看源码头、看某段的声明行 |
| `ns.mjs` / `nsmap.mjs` / `nsrun.mjs` / `nsseq.mjs` | 找 Bun 命名空间导出语句 `Ar(ns,{…})`，按导出名给声明打标签，用来切 `h3t` / `x6` / `uSe` 三个混在一起的命名空间 |
| `spec.mjs` + `spec2.mjs` | **人工放置规格**：键为 `chunk短名 段号`，值为路径或 `[[起始声明, 路径], …]`；spec2 是对过大文件的细分覆盖 |
| `build.mjs` | 规格 → `naming/placement-g2.json`（报告未覆盖段、找不到的拆分点） |
| `filestats.mjs` → `filestats.txt` | 每个目标路径的声明数/字节、新旧 |
| `cands.mjs` → `cands.txt`、`names*.txt`、`emit.mjs` | 命名候选 → 手写名字表 → `semantic-p2.jsonl` / `docs-p2.jsonl` |
| `modules.txt`、`modules.mjs` | 模块说明 → `modules-p2.json`（校验与放置路径一一对应） |
| `validate.mjs` | 覆盖率、路径合法性、文件规模、语义名重复/格式 |

重建：`node artifacts/tmp/p2/build.mjs && node artifacts/tmp/p2/emit.mjs && node artifacts/tmp/p2/modules.mjs && node artifacts/tmp/p2/validate.mjs`。

## 3. 方法

1. 按 chunk 把声明压成连续同路径段（481 个待放置段），对每段看字符串、导出、出入边、左右已归属模块。
2. 证据优先级：门面原名（`_new/*` 的导出名、`facade.jsonl`）→ Bun 命名空间导出语句里的原始导出名 → 日志前缀/遥测事件/错误文本（`[builderGit]`、`[byoc:git]`、`multi-store-sync[`、`[artifactPresence]`、`tengu_*`）→ 调用关系 → 旧版同名文件（只取目录与命名）。
3. 两个巨型 chunk 用命名空间导出切分：
   - `chunk-4121qate`（309 KB）：命名空间 `h3t`（264 个导出：`SITE_RULES`、`AGENT_SPAWN`、`TOOL_CALL`、`UI_RENDER`、`SESSION_*`…）是函数钩子**站点规则表**，放 `plugins/functionHooks/sites/*`；`x6`（门面 chunk-gfbwkdce 导出的 validateTree，205 个导出，本 chunk 134 个）是 **UI 树校验**，放 `ui/*`；VM 启动与边界复制源码放 `vm/*`；分层分发链放 `dispatch/*`；`$.*` 操作实现放 `api/*`。
   - `chunk-s61vbvea`（519 KB）：`uSe`（state session，30 个导出）→ `api/state.ts` 与 `ui/renderInstances.ts`；`_4o` → `api/settingsRead.ts`；`E4o` 与工具类型 d.ts 生成 → `types/*`；其余是 30 多个互不相关的源文件（历史文件、advisor、记忆同步、builderGit、设备钩子、PR 状态、远程工具…），逐段按字符串切。
4. 语义名只在看过声明字符串/源码后写；置信度按把握 0.6–0.95（低于 0.6 的写成 0.6 下限）；不给已有门面名的绑定写名。

## 4. `_new/*` 门面模块的正式路径

| 门面模块 | 目标路径 |
|---|---|
| `_new/validateTree.ts`（x6，跨 4121qate/s61vbvea） | 拆到 `plugins/functionHooks/ui/*` 与 `sites/*`（17 个文件，按 x6 导出名与 h3t 标签切） |
| `_new/engineMergeRead.ts` | `plugins/functionHooks/api/settingsRead.ts` |
| `_new/builtinToolSchemasOf.ts` | `plugins/functionHooks/types/builtinToolSchemas.ts` |
| `_new/startMemoryWatcher.ts` | `services/memorySync/memoryWatcher.ts` |
| `_new/memorySyncAvailability.ts` | `services/memorySync/availability.ts` |
| `_new/scanMemoryHeaders.ts` | `memdir/memoryScan.ts` |
| `_new/waitForOrgMemoryDecisionSettled.ts` | `services/orgMemory/orgMemoryDecision.ts` |
| `_new/noteStorePulls.ts` | `services/orgMemory/storePulls.ts` |
| `_new/negotiateOrgMemoryCredential.ts` | `services/orgMemory/credential.ts` |
| `_new/isSelectionMounted.ts` | `services/orgMemory/discovery.ts` |
| `_new/claudeSubprocessEnv.ts` | `utils/claudeSubprocessEnv.ts` |
| `_new/deviceHooksProcessMemories.ts` | `utils/hooks/deviceHooks/cloudRegistration.ts` |
| `_new/hasWorktreeCreateHook.ts` | `utils/hooks/worktreeHooks.ts` |
| `_new/precheckLaunchScope.ts` | `commands/review/ultrareviewPreconditions.ts` |
| `_new/WebFetchHistory.ts` | `tools/WebFetchTool/fetchHistory.ts` |
| `_new/withCliSections.ts` | `constants/promptSections.ts` |
| `_new/collectStalePins.ts` | `utils/model/stalePins.ts` |
| `_new/readDeviceSandboxSnapshot.ts` | `remote/tools/deviceSandboxPosture.ts` |
| `_new/watchToolHostAdvert.ts` | `remote/tools/toolHostAdvert.ts` |
| `_new/BashRepeatMeter.ts` | `tools/BashTool/repeatMeter.ts` |
| `_new/MonitorTool.ts` | `tools/MonitorTool/MonitorTool.ts` |
| `_new/readBlockExemptPathsInSettings.ts` | `utils/permissions/readBlock.ts` |
| `_new/rawSettingsKeyPresence.ts` | `utils/settings/settings.ts`（并入已有门面模块） |
| `_new/readArtifactForModel.ts` | `services/artifacts/readArtifactForModel.ts` |
| `_new/frameLiveSkipReasonPhrase.ts` | `services/artifacts/frameLive.ts`、`frameLiveWording.ts`、`frameLiveReplies.ts` |
| `_new/runCheckoutHook.ts` | `selfHostedRunner/lifecycleHooks.ts` |
| `_new/getAncestorPidsCheckedAsync.ts` | `utils/processIdentity.ts` |
| `_new/getBridgeDisabledDiagnosis.helpers-bbtr.ts` | `bridge/bridgeDisabledDiagnosis.ts` |
| `_new/markReplayNoOp.ts` | `services/daemon/rendezvous.ts` |
| `_new/TokenCache.ts` | `services/oauth/wifCredentials.ts` |
| `_new/call.ts` | `commands/usage-credits/usageCredits.tsx` |
| `_new/handleSetCwdControlRequest.ts`（本组 chunk 内只有路径隐藏字符提示） | `utils/unsafePathGlyphs.ts` |
| `_new/prepareSession.helpers-1ptr.ts` | `cli/startup/prepareSession.ts`（与 g4 同路径） |
| `_new/bgSupervisorStalledMessage.ts` | `utils/fleetGates.ts` |
| `_new/enqueueWorkflowNotification.ts` | `tasks/LocalWorkflowTask/LocalWorkflowTask.ts` |
| `_new/FleetNudgeStore.ts` | `components/fleet/FleetNudgeStore.ts` |
| `_new/OrgConfigConsentHost.ts` | `components/OrgConfigConsentHost.tsx` |

## 5. 新功能主题（按字节）

| 主题 | 目录 / 文件 | 文件 | 字节 |
|---|---|---|---|
| **函数钩子（mods）引擎**：站点规则表、UI 树校验（Box/Text/Button/Input/Select/Image/Raster/Markdown）、VM realm 与边界复制、分层分发链（core/prepend/user/append、next.to）、`$.*` 操作（audio/clock/command/http/model.classify/process/prompt/session/state/telemetry/agent/tool/mcp）、桌面 Client 表面运行时、工具输入 d.ts 生成 | `plugins/functionHooks/{sites,ui,api,vm,dispatch,types,prompt,resources,telemetry}/` | 53 | 377 K |
| **Artifact**：发布来源校验、发布冲突与自动读回、读给模型、presence/实时订阅/持久唤醒、评论监视器、数据库 read_db/write_db、资源上传/列表/复制/删除、删除 Artifact | `services/artifacts/`、`tools/ArtifactTool/` | 28 | 345 K |
| **记忆**：多记忆库同步（manifest、基线、挂载目录、冲突与批量删除保护、导出流）、记忆监听器、记忆库技能、组织记忆（发现、凭据、读写决定、HTTP 客户端）、账号/协作记忆上下文、提示词段落 | `services/memorySync/`、`services/orgMemory/`、`services/accountMemory/`、`memdir/*` | 31 | 210 K |
| **远程工具 / 云会话**：本机为云会话提供工具（同意文案、工具宿主助手与广告、调用日志、本机设置冻结、设备沙箱快照、设备绑定、设备 MCP）、Sessions v2 客户端、远程会话事件、线帧规范化、远程后台命令与技能渲染、云插件转发与同步状态、首条消息等待设置上传 | `remote/`、`remote/tools/`、`services/remoteTools/`、`cli/headlessCloud/`、`bridge/*`、`services/homeSeed/` | 46 | 270 K |
| **托管设置 / policyHelper**：policyHelper 运行器（按 OS、远程下发、静态载荷兜底、环境变量清理脚本）、托管设置文件、MDM、设置种子、仅托管钩子 | `utils/settings/policyHelper/`、`utils/settings/*` | 15 | 109 K |
| **隔离 git（builderGit）**：为构建复制仓库、隔离 git 环境、seed-admin 私有 git 目录、沙箱可达范围、配置审查 | `utils/git/builderGit/` | 10 | 约 80 K |
| **后台守护进程**：systemd 用户服务安装、启动器、控制服务、会合点、二进制接管、作业目录 | `services/daemon/` | 9 | 79 K |
| **自托管 runner（BYOC）**：仓库准备（凭据助手、代理、fetch 重试、会话工作树）、API 错误、健康检查、生命周期钩子、decode-token、Prometheus 指标 | `selfHostedRunner/**`、`entrypoints/selfHostedRunner/metrics.ts` | 17 | 87 K |
| **设备钩子**：本机钩子注册到云会话、同意、策略资格、worker | `utils/hooks/deviceHooks/` | 5 | 约 45 K |
| **自动模式设置** `/auto-mode-setup`：预收集报告、home 仓库扫描、写入设置；自动模式规则编辑界面 | `services/autoModeSetup/`、`components/permissions/rules/*` | 7 | 约 70 K |
| **Projects 线程**：协调者消息、线程转录与提示词 | `services/projects/` | 2 | 34 K |
| **模型目录**：服务端/已发布模型目录（签名校验、缓存）、模型访问检查、过期固定 | `utils/model/*` | 5 | 36 K |
| **插件**：命令源（command source）、headersHelper、归档下载、插件发布检查、推荐/未用插件提示 | `utils/plugins/*`、`commands/plugin/publishCheck.ts`、`services/tips/*` | 9 | 约 40 K |
| **工作流**：加载、快照、日志、脚本 API 提示词、权限对话框、任务 | `services/workflow/`、`tools/WorkflowTool/`、`components/permissions/WorkflowPermissionDialog.tsx`、`tasks/LocalWorkflowTask/` | 10 | 约 55 K |
| 新工具 | Monitor（WebSocket 事件源）、PushNotification、EndConversation、SearchMcpRegistry、RefreshMcpTools、ReadMcpResourceDir、ListAgents、Inbox | 10 | 约 30 K |
| 新命令 | /ultrareview、/goal、/radio、/import、/promo、/consent、/color、重置限额、非交互 /model | 12 | 约 30 K |
| 其他 | Claude Design 同意与授权、WIF 凭据、后台作业分类、子代理交回报告、轮询事件 XML 信封、结构化输出 schema 可满足性、请求体 gzip、流错误类、400 分类、PR 状态（gh/glab/Gerrit）、WSL 挂载、Windows UNC/junction、不可见字符清除、kill ring | 多处 | — |

## 6. 未放置

| 声明 | 字节 | 原因 |
|---|---|---|
| `chunk-2nmyajw8.js#@3234`（`j();` 初始化调用） | 4 | 和下一条同段 |
| `chunk-2nmyajw8.js#NDe`（`function NDe(o){return yt(cvs,()=>Qut(o))}`，导出） | 42 | 在 Table 组件 chunk 末尾，但和表格无关；`cvs` 来自 `bootstrap/stateSlices`，`Qut` 在 chunk-fnk5kvbf 也是未归属（`_unattributed/chunk-fnk5kvbf/part-003.js`）。等 Qut 所在模块定名后跟随 |

## 7. 给 lead 的建议

1. **与 g7 的 functionHooks 文件可能同源**（g7 不改动，请 lead 合并时判断）：g7 平铺在 `plugins/functionHooks/` 根下，我放在子目录。疑似同一源文件的对应：
   - `api/settingsRead.ts` ↔ g7 `settingsReadApi.ts`
   - `api/sessionOps.ts`（prompt.fill/submit、session.*、state、telemetry 操作）↔ g7 `sessionApi.ts` / `promptApi.ts`
   - `api/operations.ts`（audio/clock/command/http/model/process）↔ g7 `audioApi.ts` / `commandApi.ts` / `httpApi.ts` / `modelApi.ts` / `processApi.ts`
   - `api/agentToolOps.ts`（agent/tool/mcp/ui.log）↔ g7 `agentApi.ts` / `toolApi.ts` / `mcpApi.ts` / `uiApi.ts`
   - `api/register.ts` ↔ g7 `pluginRegister.ts`；`api/interfaces.ts` ↔ g7 `interfaceCalls.ts` / `engineCreate.ts`
   - `vm/moduleLoader.ts` ↔ g7 `hooksModuleLoader.ts`（g3 也有 `moduleLoader.ts`）
   - `dispatch/chain.ts` ↔ g7 `apiDispatch.ts` / `providerTiers.ts`
   我的 `api/*` 是 `$.*` 操作的**参数校验与实现体**（在 4121qate），g7 的 `*Api.ts` 多是宿主侧接线；若 lead 判定同源，建议按 g7 的平铺名合并。
2. **布局阶段的一处错归**（不在我的范围，未改）：`chunk-2nmyajw8.js` 的 `B,G,W,L,P,Ep`（列宽计算、表格 Row）被布局放在 `native-ts/yoga-layout/enums.ts`，其实是一个表格组件；我把同 chunk 前半段放到 `components/design-system/Table.tsx`，建议 fixer 把这 6 个也搬过去。
3. **fixer 已读的是 08:27 的中间版本**：之后我细分了 8 个大段（builderGit、memorySync、policyHelper、BYOC git、presence、路径分类，见 `spec2.mjs`），并补放了 `2nmyajw8` 段 0 与 `207srz4f#A2t`。fixer 的 `decide.mjs` 需要重跑。
4. **与其他组共用的路径**（46 个，合并时注意）：`history.ts`（g3/g5/g7）、`utils/permissions/permissions.ts`（g0/g6/g7）、`utils/sessionStorage.ts`（g0/g1/g7）、`utils/toolResultStorage.ts`（g1/g3/g5）、`services/api/gzipRequestBody.ts`（g1/g5）、`cli/headlessCloud/cloudPlugins.ts`（g5）、`utils/model/servedModelCatalog.ts`（g4）、`remote/tools/protocolConstants.ts` / `toolHostAdvert.ts`（g4）、`services/artifacts/publishConflicts.ts`（g4）、`services/artifacts/durableWatch.ts`、`services/design/designApi.ts`、`tools/ArtifactTool/*`（g1）、`utils/worktreeIsolation.ts` / `utils/plans.ts` / `utils/Shell.ts`（g7）、`tasks/LocalShellTask/backgroundNotices.ts` / `tasks/LocalWorkflowTask/LocalWorkflowTask.ts`（g6）等。完整清单可用 `filestats.txt` 与各组 placement 交叉求得。
5. **vendor 判断**：
   - `chunk-rbe666af#rw` = p-map（"Expected `concurrency` to be an integer from 1 and up…" 是 p-map 原文）→ `vendor/p-map/index.js`
   - `chunk-a16kyqj3` 的 freeGlobal/`return this`、baseGetTag → `vendor/lodash-es/_root.js`、`_baseGetTag.js`；`chunk-s61vbvea` 末尾的 Unicode 范围正则与 `upperFirst` → `vendor/lodash-es/upperFirst.js`
   - `chunk-4yss8b2e` / `chunk-72ngr4xp` 是 https-proxy-agent / @smithy/shared-ini-file-loader 的默认导出转发 → `vendor/<pkg>/default.js`
   - `chunk-3cddmtk7` 段 14 位于 @aws-sdk/client-bedrock-runtime 中间，包内文件未定 → `vendor/_unknown/bedrockRuntimeConfig.js`
   - `chunk-n5fvvrgq` 含 highlight.js 风格的语言语法数据，但外层是 Claude 自己的有界高亮包装，按第一方放 `utils/highlight/`；若 vendor 成员能认出具体语言文件，可拆出语法部分。
6. **超过 60 个声明的文件**多是"规则表/文案表"型（siteRules 120 个小规则对象、sensitivePaths 路径名表、boundedHighlight 语言表、pollEvents 信封解析），或是一个大类加辅助函数（`bootstrap/stateSlices.ts` 的多个状态切片类、`cli/headlessCloud/cloudPlugins.ts`）。拆分证据不足，没有硬拆。

## 8. 坑

- heredoc 里的反斜杠会被吃掉（`validate.mjs` 的 `'\\'` 变成 `'\'`），改用 `String.fromCharCode(92)` 或 Write/Edit 工具。
- `runs.json` 的段号是全 chunk 段序（含已归属段），规格里只有未归属/门面段有键；拆分点必须是段内第一个声明，否则 `build.mjs` 会报 "first start … at N"。
- 多声明符 var（`ft+3` 这种）只有第一个绑定有声明 id；语义名按第一个绑定起，说明描述整条语句。
