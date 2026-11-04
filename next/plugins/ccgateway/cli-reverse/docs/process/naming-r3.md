# 第二轮命名 · 组 3（name-r3）

范围：`analysis/segments/naming-round2.json` 第 3 项，1,847 个声明、606,147 字节、324 个阅读树文件、148 个 chunk（≥300 字节 535 个，≥500 字节 243 个）。主要内容：tools/BashTool 全部子模块（bashPermissions、bgWorktreeGuard、destructiveTargets、expansionAnalysis、inlineShellAnalysis、sandboxExclusions/Network/Violations/FailureHints、writeObserver、bashEditDiff/bashEditRecorder、readCommandParsing、commandClassification、cdTracking 等）、utils/model 全部（modelCatalog/*、servedModelCatalog、publishedCatalogCache、thirdPartyModelAccess、vertexUpgrade、modelOptions、modelUnavailability、promptBundles、allowedProviders、modelIds 等）、components/permissions、services/pluginEval、tools/SendMessageTool（crossSessionAddressing、selfTarget、isolationDispatchGate）、services/mcpServe、utils/attachments/*、utils/shell/*、utils/bash/*、utils/cleanup、services/memoryStore、services/agentStatus、services/lowPriority、services/feedback、remote/remotePermissionModeSync、utils/messageProvenance、utils/claudemd、nativeInstaller、sessionStoragePortable 等。

## 交付物

| 文件 | 内容 |
| --- | --- |
| `naming/semantic-r3.jsonl` | 2,786 条，source 全为 `semantic` |
| `naming/docs-r3.jsonl` | 1,039 条 |

## 数量

- 范围内声明：1,847 个，**全部命名**（剩余未命名 0）。
- 顶层绑定：2,304 个（1,847 个声明本身，加上多声明语句中一并命名的兄弟绑定 457 个）；范围内顶层绑定共 2,325 个，未命名的 21 个见下文。
- 参数：187 个；局部变量：295 个。集中在 ≥500 字节的函数（243 个中 81 个写了参数/局部名，例如 `downloadAndVerifyBinary`、`fetchReleaseManifest`、`pruneHistoryFile`、`findVertexFallback`、`registerVertexLadder`、`mergeCatalogOptions`、`buildEnvArgv`、`findTranscriptInOtherProjects`、`getPostCompactEnvironmentAttachments`、`readProcessTree`、`neutralizeConfusables` 等）。其余 ≥500 字节函数的局部多已是阅读树里的可读自动名（`filtered`、`sliced`、`lower` 等）或循环变量，未逐个改名。
- 说明：1,039 条；≥300 字节的 535 个与被导出（文件末尾 `export {…}` 中以压缩名出现）的 660 个全部覆盖。1–4 行中文，写“做什么、关键分支”。
- 置信度：0.6–0.65 共 1,848 条，0.65–0.8 共 913 条，≥0.8 共 25 条。规格里写低于 0.6 的统一提到 0.6；局部名上限 0.7。低置信度主要是：功能开关读取函数（只知开关名，不知开关语义，如 `isTinglyPearlEnabled`）、文案常量、遥测字段函数、按调用方推测用途的小谓词、markdown lexer 内部步骤。

## 校验

- 改名引擎 `renameModule` 逐 chunk 校验（148 个 chunk，2,786 条）：**0 拒绝、0 冲突**。
- 与其他命名表的键重合：只与 `naming/_semantic-tools-lowconf.jsonl` 重合 32 条（BashTool 一带），本表名字基于完整函数体重新判断，由合并规则取舍。说明 id 与已有说明表重合 5 条（docs-p5 3、docs-commands 1、docs-p2 1）。

## 做法

1. `artifacts/tmp/r3/prep.mjs` 用 `bindingsOf` 取每个声明的顶层绑定（`压缩名@偏移`）、调用方与 ≥500 字节函数的参数/局部列表，按阅读树文件导出到 `artifacts/tmp/r3/work/01–29.txt`，索引写 `artifacts/tmp/r3/index.json`。
2. 逐份阅读写规格 `artifacts/tmp/r3/names/01–29.txt`：`<id> <名字> [置信度] | 说明`、`+<兄弟压缩名>=<名字>`、`. <局部压缩名[.k]>=<名字> …`；`90–95.txt` 是只补说明的行（名字写 `-`），`96.txt` 补了 6 个兄弟绑定。
3. `artifacts/tmp/r3/build.mjs` 编译为两个 jsonl 并检查：未知 id、局部解析不到、保留字/全局名、置信度越界、重复键；`--check` 跑改名引擎。`needdoc.mjs`、`exported.mjs`、`expdoc.mjs` 列出缺说明的 ≥300B / 导出声明。
4. 坑：局部必须用压缩名引用（阅读树里显示的 `mapped`、`sliced` 等自动名不能用），同名局部用 `.k` 区分；<500 字节的函数在索引里没有局部列表，不能写局部。

## 剩余未命名

范围内声明 0 个未命名。21 个兄弟绑定未改名，原因：

- 已有可读名（来自门面原名或前一阶段）：`chunk-7mtn3rbz.js` 的 `CLAUDE_AI_MOBILE`、`chunk-s4bxxzsw.js#Yo` 组中的 `ContinueInProjectsTool`、`projectContinuePermissionDialog`、`WorkflowTool`、`workflowPermissionDialog`、`MonitorTool`、`chunk-18hwfzwa.js` 的 `TENGU_PLUGIN_RATINGS_STORE_CONFIG`、`chunk-63f0f3kd.js` 的 `BOT_PROTECTED_TENGU_STEADY_THIMBLE`、`chunk-astf3mhy.js` 的 `NOTIFY_IDLE_MAIN_ONLY_ERROR`，不覆盖。
- 含义无法确定：`components/Messages.js` 的 `vs`、`Ts`、`av`（三个空数组常量，作默认值用）；`components/usageCredits/creditOffers.js` 的 `nat`、`rat`、`sat`、`E8`、`iat`、`aat`（2000/30/500/1000/1e5/1e6 数值常量，使用处分散）；`utils/model/thirdPartyModelAccess.js` 的 `Q`（=5）与 `le`（=300）；`utils/shell/diskSpaceWarning.js` 的 `Pco`（=5000）。

## 发现的问题（放错文件或名字不符）

格式：声明 id → 应归路径，证据。

- `chunk-18hwfzwa.js#u5e` → `components/PromptInput/Notifications`（issue 关闭通知）。证据：唯一调用方 Notifications.helpers-18hw.js，文案 “Your issue has been closed”，与权限解释无关。
- `chunk-vrb44rx7.js#Od` → `commands/plugin/ManagePlugins.js`。证据：唯一调用方 ManagePlugins，判断插件 failureCode not_installed，与 ComputerUseApproval 无关。
- `chunk-e6aww6q8.js#gyt` → `plugins/functionHooks/toolApi.js`。证据：调用方只有 functionHooks/toolCheckHooks、toolApi，与 Edit 权限对话框无关。
- `chunk-e6aww6q8.js#_yt` → `plugins/functionHooks/toolCheckHooks.js`。证据：唯一调用方 toolCheckHooks，生成 {decision, reason, rule, hook}。
- `chunk-9h8dr0qb.js#di` → `components/Settings/Usage.js`。证据：唯一调用方 Settings/Usage，内容为额度/消费上限面板，与 AddWorkspaceDirectory 无关。
- `chunk-66jn0ssz.js#xe` → `utils/peerMessaging`（对等消息丢弃原因表）。证据：内容为 rate-limited/duplicate/hop-loop 等原因，与 shell 权限辅助无关（模块头已注明混入）。
- `chunk-p2qwpk2k.js#Tm`、`#Ts`、`#Mn`、`#Nl` → `components/agents/AgentsMenu.js`（或 autoModeRuleEdits 的显示辅助模块）。证据：调用方是 AgentsMenu。
- `chunk-wy9dbk5f.js#ln` → vendor lodash `isEmpty`。证据：类数组判定、取 tag、原型判定，结构与 lodash/isEmpty.js 一致。
- `chunk-hny2rpzz.js#ymt` → `components/messages` 或 `tools/MCPTool/displayOnlyTool.js`。证据：调用方为 SkillProposalMessage 与 displayOnlyTool，未被 MCPTool/UI 使用。
- `chunk-4bsqyjz4.js#rzs` → `tools/AgentTool/UI.js`。证据：唯一调用方 AgentTool/UI。
- `chunk-0m7em5b4.js#aBs` → `tools/AgentTool/agentInputSchema.js`。证据：唯一调用方 agentInputSchema，校验 cwd 参数。
- `chunk-aepeg2w5.js#LU` → vendor lodash `clamp`（不属于 `utils/model/telemetryModelName.js`）。证据：toNumber 归一参数后调用 baseClamp。
- `chunk-ndmse9kj.js#xI` → `utils/signal.js` 一类（惰性信号代理，与 --resume 解析无关）。证据：只转发 subscribe/emit/clear，调用方为 messageQueueManager、pluginsChangedSignal、sandboxErrors、permissionCardKinds 等。
