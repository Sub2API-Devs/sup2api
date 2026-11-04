# 第二轮命名 · 组 2（name-r2）

范围：`analysis/segments/naming-round2.json` 第 2 项，1,627 个声明、606,147 字节、277 个阅读树文件。主要内容：bridge、commands、components（daemon/fleet/mcp）、entrypoints（controlSchemas/uiControlSchemas）、ink/wrapAnsi、memdir、plugins/bundled 若干、query/*、screens/repl/*、services（claudeGateway 全部、compact/*、analytics、rateLimit、taskFiles、teleport、lowPriorityMode）、skills、state、tools 的若干模块，以及 utils 下的 conversationRecovery、crossSessionMessages、messages、networkPaths、github/*、fsSafety/*、imageErrors、remoteTools/*、sessionActivity、transcriptWithholding、windowsProfileFolders、workflows 等。

## 交付物

| 文件 | 内容 |
| --- | --- |
| `naming/semantic-r2.jsonl` | 2,056 条，source 全为 `semantic` |
| `naming/docs-r2.jsonl` | 1,586 条 |

## 数量

- 范围内声明：1,627 个，**全部命名**（剩余未命名 0）。
- 顶层绑定：1,916 个（1,627 个声明本身，加上多声明语句中一并命名的兄弟绑定 289 个）。按种类：函数 1,381、var/const 518、类 17。
- 参数：23 个；局部变量：117 个（let/const 114，局部函数 3）。局部和参数集中在 ≥500 字节且逻辑较绕的函数，例如 `regroupSplitResponses`（2,603B）、`spliceBashTaskResult`（2,087B）、`hostPollEvents`（1,465B）、`createPolicyWebhook` 等。
- 说明：1,586 条，≥300 字节或导出的声明全部覆盖；1–4 行中文，写“做什么、关键分支”，不复述代码。
- 置信度：写在规格里的值低于 0.6 的一律按规则提到 0.6（不少是 0.4–0.55，表示把握不大），0.6–0.65 共 1,547 条，0.65–0.8 共 351 条，≥0.8 共 158 条。低置信度主要是：只有几行的谓词、文案常量、遥测字段函数、按调用方推测用途的小函数。

## 校验

- 改名引擎 `renameModule` 逐 chunk 校验（129 个 chunk）：**0 拒绝、0 冲突**。最初有 2 处同作用域冲突，已改名消除：`chunk-1ny7cxrt.js#ybe` 与本文件已有名重复，改为 `ADMIN_ERROR_TYPE_BY_STATUS`；`chunk-93kwxas0.js` 中 FleetRow 与 fleetRows 各有一份相同的“最近时间戳”函数，后者改为 `latestJobTimestamp`。
- 与目标文件已有名字撞名的已改：`SDKControlGetContextUsageStrictResponseSchema`、`readCappedImportFile`、`EXTRA_TELEMETRY_CODES`、`cleanupAfterCompaction`、`isInterruptOnlyMessage`、`flattenPastedBlocks`。
- 与其他命名表的键重合：只与 `naming/_semantic-tools-lowconf.jsonl` 重合 10 条（`chunk-s61vbvea.js` 的 gitOperationTracking 8 条、`chunk-3s7ydtfd.js` 的表格列摘要 2 条），本表名字基于完整函数体重新判断，由合并规则取舍。说明与已有说明表 id 重合 11 条（docs-extensions 5、docs-p5 2、docs-tools 2、docs-commands 1、docs-query 1）。

## 做法

1. `artifacts/tmp/r2/dump.mjs` 把每个声明的源码（含声明行）与调用方列表按阅读树文件导出到 `artifacts/tmp/r2/dump/000–017.txt`。
2. 逐份阅读，写成简单的规格文件 `artifacts/tmp/r2/spec/000–017.txt`（`<min> <名字> [置信度] | 说明`、`<min>.<局部> <名字>`、`<min>+<兄弟min> <名字>`）。
3. `artifacts/tmp/r2/build.mjs` 编译规格为两个 jsonl，并检查：文件/声明不存在、局部解析不到、重复键、同文件重名、与文件已有名字撞名；`--check` 跑改名引擎，`--left` 列未命名项。
4. `artifacts/tmp/r2/siblings.mjs` 查多声明语句的兄弟绑定当前名（兄弟必须用压缩名引用）。

## 剩余未命名

范围内声明 0 个未命名。以下属于“只命名了部分兄弟绑定”，其余兄弟保持原名，原因是含义只能从零散使用处猜，或已在其他组/阶段命名：

- `src/utils/crossSessionMessages.js` 的文案常量组：`P`、`i`、`u`、`R`、`m`、`L`、`A`、`y`、`H7o`、`O`、`w`（多句拼接的提示片段，命名价值低）。
- `src/utils/spellcheck.js` 的 `Sno` 常量组：只给 `Sno` 起名，`wno…Nye` 十余个时间/大小常量未逐个核对使用处。
- `src/utils/imageErrors.js` 的 `Me` 组中 `se`（=100）未命名。
- `src/tools/stubTools/enableStubTools.js`、`src/utils/github/ghApi.js` 等处已由前一阶段命名的兄弟（如 `API`、`regExp_*`、`weakMap`）未改动。

## 发现的问题（放错文件或名字不符）

格式：声明 id → 应归路径，证据。

- `chunk-e6aww6q8.js#fRe` → `src/services/compact/postCompactCleanup.js` 的真正主体；现有 `runPostCompactCleanup`（`chunk-1t61stbc.js`，指纹 0.926，89B）很可能错配。证据：fRe 622B，做缓存失效、beta 锁存重置、丢弃预计算压缩等，调用方是 SessionController、clearSessionCaches、triggerReactiveCompact、runAutoCompactIfNeeded、compactViaReactive。本组命名为 `cleanupAfterCompaction`。
- `chunk-ah34pb7m.js#FM` → EnterWorktree 工具的 UI（`src/tools/EnterWorktreeTool/UI.js`），而非 `src/tools/EnterPlanModeTool/UI.js`。证据：渲染“Switched to worktree (on branch …)”。
- `chunk-mvvq2nx1.js#Me`、`#Ce`、`#M`、`#U`、`#Y`、`#J`、`#A8r` → `src/utils/imageResizer.js`。证据：都是图片解码/缩放/JPEG 编码逻辑，调用方为 `loadImageDecoder`、`maybeResizeAndDownsampleImageBuffer@utils/imageResizer.js`、ArtifactTool 预览，与上传错误码无关。
- `chunk-s61vbvea.js#xAt`（createScrollTelemetryState）→ 滚动遥测所在的 UI 模块，而非 `src/utils/agentProcessRegistry.js`。证据：返回滚动、翻页、跳到底部计数，与代理进程登记无关。
- `chunk-847rdpmn.js#uMi` → FileReadTool 的权限路径模块；`chunk-847rdpmn.js#fMi` → `src/utils/authFileDescriptor.js`。证据：前者唯一调用方 `readFileToolCall`，后者唯一调用方 `readFromInheritedDescriptor@utils/authFileDescriptor.js`，都与原子写入暂存无关。
- `chunk-cdz6g143.js#jTt` → `src/utils/permissions/claudeStatePaths.js`。证据：返回全局配置/凭证/设备密钥路径，调用方 `G8o@utils/permissions/claudeStatePaths.js`、sandbox-adapter、readOnlyShellCheck，与 markdown 配置加载无关。
- `chunk-yxnffbzs.js#C`、`#g`（base58 UUID 编码）→ `src/tools/ArtifactTool/constants.js` 一带；`chunk-yxnffbzs.js#Hds`（括号字符正则）→ `src/services/remoteTools/resultConversion.js`。证据：调用方全部在这些模块。
- `chunk-0h4e7gnq.js#d2n`、`#c2n`、`#gyt` → SDK 消息适配（`src/remote/sdkMessageAdapter.js` 或 QueryEngine 侧），证据：把 SDK 的 model_refusal_* / model_consent_fallback 事件转回内部 system 消息，调用方为 readEngineTurn、convertSDKMessage、QueryEngine。已有说明里“旧版名 createMicrocompactBoundaryMessage/getUserMessageText 为错配”的注记也挂在这几处附近。
- `chunk-18hwfzwa.js#Die` → `src/screens/repl/` 的 effect 模块。证据：是 React hook（读 credentials/storageV5，订阅 GrowthBook 刷新），唯一调用方 ReplEffects，与终端探测无关；名字 `useFlagRefreshEffect` 置信度低。
- `chunk-e6aww6q8.js#y5s`、`#_5s`（首次内容绘制、输入框空闲上报）→ 启动/渲染打点模块，而非 `src/utils/conversationRecovery.js`。
- `src/services/lowPriorityMode.js` 的 `jQe`、`src/plugins/bundled/easel` 的 `Cn`、`src/services/compact/microCompact.js` 文件头、`src/tools/EnterPlanModeTool/UI.js` 文件头：已有说明已标注误归或旧名不符，本组只补了名字，未改动归属。
