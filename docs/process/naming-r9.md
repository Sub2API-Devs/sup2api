# 第四阶段第二轮命名：name-r9（组 9）

范围：`analysis/segments/naming-round2.json` 第 9 项，共 2,086 个声明、约 606 KB，分布在 313 个阅读树文件、118 个 chunk。主要是 `src/plugins/functionHooks/**`（站点规则、hooks worker 宿主、模块扫描与加载、VM 隔离、`$` API 表、UI 渲染/按键/栅格/图片校验），其余是 bootstrap/stateSlices、components/messages、FeedbackSurvey、CustomSelect、tasks、daemon、query、remote、services（skillsSync、queuedNotifications、conversationImport 等）、tools（DesignTool、FileWriteTool、SyntheticOutputTool）、utils/*（processUserInput、highlight、fullscreenBootGuard、wireToolInputEcho、toolchainDetection 等）。

## 结果

| 项 | 数量 |
|---|---|
| 顶层声明命名 | 2,086 / 2,086（全部） |
| 同一声明里的兄弟绑定、参数与局部变量 | 89（参数 13、局部及兄弟绑定 76） |
| `naming/semantic-r9.jsonl` 总条数 | 2,175 |
| 说明（`naming/docs-r9.jsonl`） | 1,323 条；需要说明的（≥300 字节或被导出）1,267 个全部覆盖，另有 56 个较小声明也写了说明 |
| 改名引擎校验 | 118 个 chunk 逐个 `renameModule`：请求 2,175，改名 2,175，冲突 0，拒绝 0，告警 0（`artifacts/tmp/r9/rename-check.json`） |
| 与其他命名表的键重合 | 0 |

置信度：0.6 共 1,781 条，0.65 共 231 条，0.7 共 92 条，0.75 共 70 条，0.8 共 1 条。0.6 这一档里包含原本低于 0.6、按规则提升到下限的名字。这些主要是函数钩子引擎内部的小工具函数和站点校验函数，只读了本体和调用方。`functionHooks` 的名字是按"事件名 + 动作"对齐的，例如 `UI_FOCUS_SITE`、`checkPinnedKeys`、`dispatchUiScroll`，整体一致。不过单个名字的用词可能还需要统一。

## 还没命名的

- 顶层：0。
- 参数与局部：只给少数大函数命名了关键局部变量，包括 `callFileWrite`（Write 工具执行，4 KB）、`submitPromptWithHooks`、`checkSkillHooksFit`、`runForkStopHooks`、`unsatisfiableReason`、`ansiToPng` 的常量组。其余 ≥500 字节函数的参数和局部变量仍是压缩名。原因是按"覆盖率优先"先完成了全部顶层命名和说明，时间留给了说明。这些函数大多是短参数的校验或映射函数，读顶层名和说明已经能看懂。

## 说明重合（交给 lead 取舍）

下面 6 个声明在其他说明表里已经有说明。本组的说明是对照本体重写的，有分歧的地方以代码为准：

- `chunk-e6aww6q8.js#Ato`（docs-commands）：旧说明只写了"动态 local 命令"，本组补充了来源（`$.command.register`）和缺少 command.run 钩子时的提示。
- `chunk-s61vbvea.js#Mei`（docs-extensions）：旧说明是"按环境 id 取出待填充的 press 记录"。本体是标记已作答，并删掉同一环境里更早的已作答记录。
- `chunk-s61vbvea.js#Y4r`（docs-extensions）：两者含义一致，本组的说明列出了全部成员。
- `chunk-dcmhvw5a.js#Zxi`（docs-extensions）：两者含义一致。
- `chunk-ndmse9kj.js#UMe`、`#j`（docs-p2）：旧说明分别是"设置保留/安装状态切片"和"会话用量计数切片"。本体分别是设置读取的全局缓存（epoch、seed、安装判定）和会话费用账本（费用、耗时、增删行数、侧查询、claim/scopeTo）。

## 发现的问题（放错文件、名字不符）

- `chunk-ah34pb7m.js#I7` → `components/messages/UserTextMessage.js`。证据：`UserTextMessage.js` 文件头说明真正的 UserTextMessage 组件就是这个未归属声明。
- `components/messages/nullRenderingAttachments.js` 混入了消息转发和归属相关的代码（切分误归），应拆到对应的消息工具模块。
- `components/FeedbackSurvey/useMemorySurvey.js` 的 `isMemoryDirMarkdownFile`（旧名 `isSessionPlanFile`，名字与实现不符）→ `memdir/`。证据：判断的是记忆目录下的 Markdown 文件。
- `components/ModelPinWizard.js` 的 `CandidateStatusRow`：文件头已经标为放错位置，应移到候选列表组件。
- `plugins/functionHooks/sites/promptContextSites.js` 的 `isInstallationRelevantToCurrentProject`：名字不符。实际做的是托管目录路径限制判断，与安装无关。
- `tools/shared/spawnMultiAgent.js#generateUniqueTeammateName` → `plugins/functionHooks/dispatch/chain.js`，并改名为 `groupByHop`。证据：`dispatch/chain.js` 第 445 行用它把处理器按 `hop` 分组（`{hop, members}`），与队友命名无关；它是指纹匹配误归，误命名也来自那次匹配。
- `components/teams/TeamsDialog.js#toggleTeammateVisibility`（chunk-e6aww6q8.js:59263，指纹匹配置信度 0.659）→ `plugins/functionHooks/coreHandlers.js`，并改名为 `defaultDescribe`。证据：只有 `commandApi.js`（`cOn`、`yOn` 的 describe 结果）和 `_new/eventCatalog.helpers-e6aw.js` 的核心处理器调用它；它返回的是 label、description、isHidden 形状的描述。
- `plugins/functionHooks/ui/pressFill.js`：`logPressFill` 的归属存疑。它是 uiApi 填充输入框时用的按键作答记录，本文件的 `Oei`/`Mei` 也只服务于这条路径，可以并入 `ui/interactions.js`。
- `utils/toolchainDetection.js` 的 `detectTerminal`：文件内注释已经写"误归 deepLink"。它返回的是平台名（darwin/linux/win32），名字应为 `hostPlatform`。
- `utils/sessionStart.js` 的 `isMainThreadSource_2`、`isMainThreadSource_3`：名字不符。两者返回的都是提示缓存 TTL（"5m"/"1h"），与 `N9e`、`L9e estimateCacheWriteCost` 一起应归 `services/api/promptCacheTtl` 一类模块。证据：`L9e` 的调用方是 `services/api/claude.js`。
- `utils/resultError.js#Qe`（`ASYNC_HOOKS_MODULE`，AsyncLocalStorage 回退）→ `utils/debug.js`。证据：只有 `utils/debug.js` 的 `uo`、`Er`、`DebugLogger` 使用。
- `utils/directMemberMessage.js#zQt`（`cyclePermissionModes`）→ `utils/permissions/getNextPermissionMode.js`。证据：唯一调用方是 `getNextPermissionMode`。
- `utils/cwd.js` 的 `_gr`（`turnAttributionKeyOf`）、`GRn`、`messageTurnAttributionKey`、`Rlt`：回合归属键逻辑，与 cwd 无关，应归到消息归属模块。证据：调用方是 `handlePromptSubmit` 和 `cli/print`。
- `remote/controlRequestShape.js` 的 `He`、`It`、`xe`、`Be`、`Ft`：都是 SessionsV2Client 的常量和时钟工具 → `remote/SessionsV2Client.js`。证据：调用方只有 `SessionsV2Client`。
- `services/queuedNotifications/queuedNotifications.js` 的 `XTe`（`controlHandlerError`）、`wB`（`logHandlerFailure`）：控制请求处理失败的通用函数，与排队通知无关，应归 `cli/print/controlErrors`。证据：调用方是 `cli/print/dispatchControlRequest.js`、`sessionControlRequests.js`、`pollEvents.js` 等。
- `utils/processUserInput/surfaceCommandNotices.js` 的 `et`、`_t`：超额额度领取（`fotwClaim`、`claimOverageCreditGrant`），与命令通知无关，应归 `services/overageCredit/` 一类模块。
- `tools/RolePickerTool/RolePickerTool.js` 的 `ut`、`pt` → `tools/OnboardingGuideTool/`。证据：唯一调用方是 `OnboardingGuideTool.Vt`。
- `utils/queryHelpers.js` 的 `p6`（`appendRowsWithHooks`）、`tVn`、`nVn`、`rVn`：session.append 钩子的行追加机制，更适合放在 `plugins/functionHooks/sessionEvents.js` 旁边。证据：调用方有 `raiseSessionAppend`，并使用 `getPluginRegistry().appendsInFlight`。
- `query/presenceCheck.js`：混合了"在吗"检测、提交路由、Artifact 补丁回合和运行中回合观察四块。文件头已经注明，建议拆分。
- `components/messages` 与 `ide/` 里还有若干 `_new` 门面模块未定正式路径。

## 做法

1. `artifacts/tmp/r9/extract.mjs`：从 segments 取本组声明，按文件生成 20 份视图（`views/000.txt`–`019.txt`）。每个声明附字节数、是否导出和调用方（单行 `export {…}` 也能识别）。
2. 逐份阅读视图，在 `artifacts/tmp/r9/n/000.txt`–`019.txt` 写命名表（`压缩名 新名 置信度 说明`，局部写成 `压缩名.局部名 新名`）；`020.txt` 只补说明（`压缩名 ! 说明`）。
3. `artifacts/tmp/r9/build.mjs`：用 `bindingsOf` 把压缩名解析成 `@偏移` 键，生成 `naming/semantic-r9.jsonl` 和 `naming/docs-r9.jsonl`，同时把置信度下限设为 0.6。`artifacts/tmp/r9/needdoc.mjs` 列出还缺说明的声明。
4. `artifacts/tmp/r9/check.mjs`：对涉及的 118 个 chunk 逐个调用 `renameModule`，结果是 0 冲突、0 拒绝。另外检查了与其他 `naming/semantic-*.jsonl` 的键重合（0），以及是否使用了保留字或全局名（0）。
