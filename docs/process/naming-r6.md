# 第四阶段第二轮命名：name-r6（组 6）

范围：`analysis/segments/naming-round2.json` 第 6 项，共 1,982 个声明，分布在 303 个阅读树文件、167 个 chunk（约 606 KB）。主要目录：

- `services/artifacts`（814 个，占四成）：发布、读取、评论自动响应、持久监视、实时订阅、在线状态、设计系统指南、类型目录、同意分类等。
- `utils/sandbox`（171 个）：其中 `sandbox-adapter.js` 104 个，内容是命令后清理、拒绝路径的真实路径双胞胎、网络/自动挂载路径判断、写根推导。
- `utils/messages`（139 个）、`commands/plugin`、`services/tips`、`cli/bg`、`components/LogoV2`、`services/deviceBridge`。
- 以及 `query/turnHooks.js`、`services/extractMemories`、`utils/toolCgroup.js`、`components/rateLimit`、`upstreamproxy/toolTrust.js`、`utils/auth.js`、`skills/hostSkillMounts.js` 等。

## 结果

| 项 | 数量 |
|---|---|
| 本组声明（顶层）命名 | 1,982 / 1,982（全部） |
| 顶层绑定命名（含同一声明里的兄弟绑定） | 2,413 |
| 参数命名 | 501 |
| 局部变量命名 | 783 |
| `naming/semantic-r6.jsonl` 总条数 | 3,697 |
| 说明（`naming/docs-r6.jsonl`） | 1,157 条。需要说明的（≥300 字节或被导出、此前没有说明）1,052 个全部覆盖，另有 105 个较小的声明也写了说明 |
| 改名引擎校验 | 167 个 chunk 逐个调用 `renameModule`（只加载本表）：3,697 条全部改名，拒绝 0，冲突 0（`artifacts/tmp/r6/check.out`） |
| 与其他 `naming/semantic-*.jsonl` 的键重合 | 0 |

置信度分布：

- ≥0.7：1,830 条。局部名统一记为 0.7。
- 0.6–0.7：114 条。
- 正好 0.6：1,753 条。其中 1,374 条原先估计低于 0.6，按规则提升到下限，并在 `note` 里写了"把握较低：仅凭局部代码与调用语境推断"。

这些低把握的名字主要有三类：

- 数值常量，只看得到数值、要看使用处才能确定用途。
- artifacts 评论、监视子系统里大量相似的判断函数，名字只能按函数体本身来起。
- `sandbox-adapter` 里的路径解析和清理细节函数。

lead 合并时如有更可靠的来源（门面名、参考名），可以优先采用。

## 做法

1. `artifacts/tmp/r6/prep.mjs` 按阅读树文件生成 `dump/NNN.txt`：每个声明附代码和局部绑定表（局部表只列 ≥500 字节的声明），共 303 份。同时生成 `items.json`。
2. 逐份阅读后写规格 `artifacts/tmp/r6/spec/*.txt`：
   - `<压缩名> <新名> [置信度] [| 说明]` 命名一个声明。
   - 缩进行 `tok=新名` 命名该声明内的参数、局部或兄弟顶层绑定。`tok` 用压缩名、当前名或 `@偏移` 定位。
   - `<压缩名> = | 说明` 只写说明。
3. `artifacts/tmp/r6/build.mjs` 把规格组装成两份交付文件：
   - 检查是否用了保留字或全局名、键是否重复、是否还有未命名或缺说明的声明。
   - 把置信度提升到下限 0.6，并加上 note。
4. `artifacts/tmp/r6/check.mjs` 试跑改名引擎；`stats.mjs` 统计剩余项。

## 还没命名的

- 本组声明：0。
- 同一声明里的兄弟顶层绑定：42 个没写进本表（清单见 `artifacts/tmp/r6/unnamed-siblings.txt`）。
  - 37 个在阅读树里已经有可读名，来自门面或其他表，例如 `DEVICE_ATTESTATION_STATUS`、`SESSION_STREAM_CREATED_AT`、`QUOTA_AUTO_RESUME_CAP`、`INVALIDATE_TAG_LIVE`、`LIST_DESCRIPTION_MAX_RUNES`、`TENGU_MADRONE_SPINDLE_CORBEL`。按"门面原名优先"的规则没有覆盖。
  - 5 个是 `chunk-0wdgqhcf.js#oko` 同一声明里的 `zHs`、`sko`、`KHs`、`iko`、`VHs`（都是 128 或 1024）。本 chunk 内除导出列表外没有使用处，从数值看不出用途，没有硬起名。
- 参数与局部：≥500 字节、但一个局部名也没有的声明还剩 25 个（清单见 `artifacts/tmp/r6/no-locals-500.txt`）。
  - 大多是常量表、schema 或提示文案拼接函数，局部变量只有一两个，或者只是 React 编译器的缓存槽。例如 `JUMP_FRAMES`、`MCP_WIRE_ROUTES`、`TYPE_INSTANCE_SCHEMA`、`MONITOR_EVENT_KINDS`、`describeOtherCards`、`describeThreadTrigger`、`formatCorruptionReport`。
  - 其余是 React 组件和类：`ExportTranscriptView`（4.5 KB，79 个局部，多为编译器缓存槽 `$[n]` 和 JSX 中间值）、`AwsCredentialMemos`（类，方法参数是单字母）、`SessionFeatureValues`、`CloudSessionPluginsNotice`、`FlickerFreeRenderingNotice`。按覆盖率优先的顺序留到了最后。
  - 其他 ≥500 字节的函数都命名了参数和关键局部，例如 `sandbox-adapter` 的 `addRealPathDenyTwins`、`resolveRealPathForDeny`、`scrubBareRepoIndicator`、`collectGitConfigDenyPaths`，以及 `markHumanReplyProvenance`、`budgetProvenanceEntries`、`initToolCgroup`、`findUniqueWorktreeForBranch`。

## 发现的问题（放错文件、名字不符）

格式：`声明 id → 应归路径，证据`。证据来自 `node tools/q.mjs callers`。

- `chunk-3n6ygrtf.js#A` `isValidStatusCacheLine`（components/LogoV2/Feed.js）→ services/api/metricsOptOut。证据：它校验的是指标状态缓存的行；除 Feed 外，`metricsOptOut.ts` 的 `#k` 也调用它。
- `chunk-18hwfzwa.js#Y5t` `isAncestorAgent`（components/LogoV2/ChannelsNotice.js）→ tasks/LocalAgentTask/agentMetaFiles。证据：唯一调用方是 `agentMetaFiles.ts` 的 `#z5t`。
- `chunk-25sm7c4g.js#pe` `getMcpResultWithContent`（hooks/useCanUseTool.js）→ remote/tools 的 callPlumbing。证据：调用方是 `callPlumbing.helpers-25sm` 的 `#Je`、`#Qe`。
- `chunk-e6aww6q8.js#JQt` `isTimeoutError`（hooks/useCanUseTool.js）→ services/api/errors。证据：调用方是 `getAssistantMessageFromError`、`classifyAPIError`。
- `chunk-axmbhcjg.js#pr` `hasAgentSetting`（components/LogoV2/CondensedLogo.js）→ services/homeSeed/hookAndSettingsInventory。证据：唯一调用方是该模块的 `#zt`。
- `chunk-18hwfzwa.js#DA` `PermissionModeLabel`、`#DQe` `getPrintableKeyInput`（components/ProactivityMenu.js）→ components/PromptInput。证据：`DA` 的调用方是 PromptInputFooterLeftSide 的 `ModeIndicator` 和 pluginUi/PromptHint。
- `chunk-ag5x7vhf.js#uye` `ExportTranscriptView`（utils/exportRenderer.js）→ screens/repl。证据：它是转录视图组件，调用方是 TranscriptView、MessageArea、SessionPreview 和导出用的 `streamRenderedMessages`；放在 utils 下不合适。
- `chunk-gppkhxdv.js#Uee` `claimTaskNotification`（utils/xmlTags.js）→ utils/task/framework。证据：调用方是 `getStatusText`、LocalAgentTask、LocalShellTask、RemoteAgentTask、LocalWorkflowTask 和 agentApi；它与 XML 标签无关。
- `chunk-nt75hmzb.js` 的守护进程函数（utils/sandbox/userNamespace.js）→ services/daemon 的路径/令牌模块。涉及 `#G$e`、`#Q`、`#Sli`、`#z$e`、`#wli`、`#Bwn`、`#O`、`#Eli`、`#vli`、`#Z`、`#nte`、`#V8o`，内容是守护进程运行目录、pipe.key、令牌文件、套接字目录和旧目录清理。证据：`Sli` 的调用方是 `services/daemon/controlServer.ts` 的 `#vxs`。同文件的 `#jqt` 是错误路径脱敏，也与用户命名空间无关。
- `chunk-e6aww6q8.js#_wn` `findReadableNugetPackagesDir`、`#hvr`（utils/sandbox/windowsGitIdentity.js）→ 单独的 Windows NuGet 可读性模块，或 utils/Shell。证据：唯一调用方是 `utils/Shell.ts` 的 `exec`；它处理 NuGet 包目录，与 git 身份无关。
- `chunk-jv307fw4.js#b0o` `splitManifestTypeFiles`（services/artifacts/frameComments.js）→ services/artifacts/publishedFiles。证据：调用方是 `publishedFiles.ts` 的 `#N` 和 `webfetchRead.ts` 的 `#Pe`；它拆分的是清单里的类型文件，不是框架评论。
- `chunk-s61vbvea.js#s4o` `enqueueArrivingFileMessage`、`#i4o`、`#rni`（bridge/attachmentFilesWait.js）→ cli/print/userPromptFiles。证据：`s4o` 的唯一调用方是 `userPromptFiles.ts` 的 `#pP`。
- `chunk-fq0cr76a.js#twn`、`#xv`（utils/sandbox/sandboxErrors.js）→ 沙箱设置读取模块。证据：它们只是按策略层读取 `sandbox.*` 设置，与错误无关。
- `chunk-ah34pb7m.js#qu` `usePlacedActionKeys`（components/CompactSummary.js）：调用方在 `bridge/inboundMessages.ts`（`@7736`），归属存疑，需要对照 UI 用法再确认。
- 命名上的说明：`chunk-5ghnps9r.js#l` 原先按"输出上限"理解，从使用处 `limits.max_call_ms` 确认是单次调用时限，已改为 `MAX_CALL_MS`；同声明里的 `d`、`u` 分别是 `MAX_REQUEST_BYTES`、`MAX_IN_FLIGHT`。

## 工具与产物

- 中间产物都在 `artifacts/tmp/r6/`：`prep.mjs`、`build.mjs`、`check.mjs`、`stats.mjs`、`needdoc.mjs`、`sibctx2.mjs`、`spec/`、`dump/`、`check.out`。
- 没有修改 `tools/`、`analysis/`、`reconstructed/`、`original/` 和其他命名表，也没有运行 `tools/pipeline.sh`。
