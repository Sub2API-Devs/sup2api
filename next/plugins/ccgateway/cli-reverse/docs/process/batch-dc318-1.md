# dc318-1 文档引用修复（本轮执行记录）

输入：`artifacts/tmp/batches/dc318-1/fails.tsv`（41 行，按类型：名字 14、声明 id 18、字面量 5、路径 3，另 1 条是版本事实 Bun 修订号）与 `left-by-tool.json`。
阅读树为 2.1.318；316 的旧树只有部分 chunk 存在（`artifacts/versions/2.1.316-original/` 里有 2,644 个 chunk，但 `chunk-5xgkngpb.js`、`chunk-exfmq47h.js`、`chunk-w3ch4xq2.js`、`chunk-1kk50rk6.js`、`chunk-19arrzdw.js` 等大批 318 常见 chunk 不在其中，316 的命名表也只用旧文件名），因此定位主要靠 `tools/q.mjs find/show` 加 318 阅读树里的实际代码，316 侧用 pairs 文件与 316 原码里能对上的少数 chunk 交叉确认。

## 结果

41 条全部处理。除 Bun 修订号 `71c9bf0ca`（版本事实，留给 lead）外，`tools/verify/doc-refs.mjs` 对 13 份文档（ARCHITECTURE、CHANGES-SINCE-2.1.88、INDEX、10 本手册）已无 FAIL。

按类型与手法：

| 类型 | 条数 | 做法 |
|---|---|---|
| 路径 | 3 | 换成 318 实际存在的文件或 chunk |
| 名字 | 14 | 换 318 现名（多数同时给出 316 旧名做对照） |
| 声明 id | 18 | 换 318 声明 id；同段落里的 `#xxx` 简写一并换成 318 的简写或完整 id |
| 字面量 | 5 | 按 318 写法改写（见下"改了意思的地方"） |
| 版本事实 | 1 | 未改 |

## 逐条（文档 · 行 · 原 → 新）

- ARCHITECTURE.md:470 `original/chunk-ha3km179.js` → `original/chunk-w3ch4xq2.js`。出处行示例写的就是 `chunk-w3ch4xq2.js:168504-247763`，318 里这个 chunk 确实存在，原来那张 316 的 chunk 名已不存在。
- agents.md:480 `writePrintResult` → `SDKResultErrorSchema`（`chunk-0h9p4sxp.js#B`）。316 的 `writePrintResult`（`chunk-54xbtc53.js#N`）在 pairs 里配到 `chunk-0h9p4sxp.js#B`，318 里该函数就是 `-p` result 的文本输出；doc-refs 只在代码里找名字，所以不放进反引号、只写"316 时叫 writePrintResult"。
- bootstrap.md:35、490 `chunk-19arrzdw.js#aLt` → `chunk-pfe3pddp.js#MBt`（`launchSessionRepl`）；490 的另一半 `#h9i` 本来就是对的。
- bootstrap.md:150 `t8e` → `explicitMcpConfigRequestsWait`（`chunk-0yw3taqg.js#Tot`）。316 的 `t8e` 就是这个函数，318 已按语义命名。
- bootstrap.md:489 整句重写：316 的 `chunk-exfmq47h.js#xY/#Xg/#$Y` 与 `chunk-1kk50rk6.js#rr` 里的 Xn/Qn/co、`#Ao` 里的 `_o`，318 中 `xY/Xg/$Y` 已不存在；`#rr` 现在是 `CONTROL_SUBTYPE_TO_CAPABILITY`/`CAPABILITY_NAMES`/`CAPABILITY_ANSWER_WORDING`/`UI_OTHER`/`FIRST_STREAM_POLICY_TIMEOUT_MS` 五个绑定，`#Ao` 是 `PERMISSION_WITHDRAWN_MESSAGE`/`MAX_VOUCHED_MODEL_REQUEST_IDS`，`#_o` 已命名 `tagUiSurfaceFloorAndSender`。句子从"未命名，含义不确定"改成"写作时未命名；316 时的 Xn/Qn/co 现按作用命名"。
- commands.md:20 `chunk-whwtfsqf.js` → `chunk-6085qsva.js`。318 里 `whwtfsqf` 不存在；`6085qsva` 是 `/login` 的新门面（`export{…Qra as call…}`，与 316 门面导出一一对应）。
- commands.md:455 `SetModelFromArgs` → `chunk-ny1a8wws.js#tt`。pairs 里 316 的 `chunk-mvhmq2z8.js#je` 对到 `chunk-ny1a8wws.js:tt`，318 里 `tt` 仍是压缩名。
- commands.md:533 `_en()` → `loginCommand_2`（`chunk-5xgkngpb.js#Lsn`），门面换成 `6085qsva`。318 的 `loginCommand_2` 就是 316 `_en` 的对应物（同一函数体：`/login` 命令对象）。
- commands.md:537 `/logout` 实现 `chunk-tndsj50r.js` 的 `u` → `chunk-fmp5a427.js` 的 `call`（`#d`）。318 里 logout 的实现 chunk 是 `fmp5a427`，导出名 `call`（316 的 `u` 对应 318 的 `d`，pairs 里也有 `tndsj50r.js:u` → 同名函数）。
- commands.md:541 `/clear` 实现 `chunk-4mtxrwhe.js` → `chunk-yjtttm4r.js`（`call` = `runClear`，`#y`）。两个版本都是 `export{D as call}` / `export{y as call}` 的单导出门面。
- extensions.md:1068 `jnt` → `getManagedSessionEndTimeoutMs`（`chunk-5xgkngpb.js#pst`），`AQ(...)` → `withHostEnvRestored(...)`（318 里 `AQ` 即该函数）。
- ink.md:189 `#YRr` → `#eBr`（`restoreTerminalModes`，`chunk-2avr6cej.js`）。
- query.md:246 `#vX` → `#iQ`（`getCacheControl`）。
- query.md:262 `#rSr` → `#Zvr`（`sanitizeDisabledThinking`）。
- query.md:426 `#gir` → `shouldSendGatewayHintHeaders`（`chunk-vn3g7zt8.js#j_r`）；同文 1462 行同样处理。
- query.md:490 `usedRetryLabels` → `droppedBetaSet`。318 的 `withRetry` 用 `droppedBetaSet` 记已用过的 `retry:` 标签，语义相同。
- query.md:712 `tengu_velvet_possum` → `tengu_temporal_haven`。318 里触发"大 CLAUDE.md 只读开头"的 GrowthBook 键换成 `tengu_temporal_haven`（`utils/claudemd/contextRouting.js`，注释也写明 316 时的键）。
- query.md:780 `jde("")` → `createApiSystemMessage("")`（`chunk-5xgkngpb.js#Tfe`）。
- query.md:787 `#R_n` → `#hSn`（`ensureToolResultPairing`）。
- query.md:855、1543 `createMessageQueueManager` → `createMessageQueue`（`chunk-5xgkngpb.js#YZr`）。
- query.md:909 附件表前三行换成 `#r0r`/`#s0r`/`#glr`/`#DOn`/`#o0r`/`#l0r`/`#i0r`；914、915 行 `#_Pr`/`#KKe`/`#Wxr` → `#a0r`/`#D6e`/`#O$r`。
- query.md:941 `#VPr` → `getTotalTokensReminderAttachment`（`chunk-5xgkngpb.js#$0r`）。
- query.md:942 `#XPr` → `getMaxBudgetUsdAttachment`（`chunk-5xgkngpb.js#B0r`）。
- query.md:958 `#vPr` → `#p0r`（`MEMORY_PREFETCH_SKIP_SOURCES`）、`#$Cn` → `RELEVANT_MEMORIES_CONFIG.MAX_SESSION_BYTES`（`#GOn`）；959/960 行 `#K8s`/`#V8s`/`#Xjo` → `#Imi`/`#Omi`/`#T7o`；957 行 `#z8s` → `#Pmi`。
- query.md:991 `#eii` → `#QAi`（`applyToolResultBudget`）。
- query.md:1001 `#Jsi` → `#YAi`（`provisionContentReplacementState`）。
- query.md:1168 `#N2` → `#ZV`（`stripImagesFromMessages`）。
- query.md:1177 `#m8s` → `#Qpi`（`partialCompactConversation`）。
- query.md:1218 `#M4o` → `#aqo`（`tokenCountWithEstimation`）。
- query.md:1186–1196 压缩提示词一节：318 里 `COMPACT_PROMPT_ARMS`、`buildBaseCompactPrompt`、`buildLeanCompactPrompt`、`CAPPED_COMPACT_PROMPT` 都不再是绑定——318 的 `compactPromptVariant` 直接返回整段提示词文本（只在含 `<summary>` 时采用），`getCompactPrompt` 按模板里有无 `<analysis>` 决定回复形状。整节改成：先说 318 的做法（给 `#Vte`/`#dRe` 与 `summaryBlockText`），把 arm 表降为 316 的历史说明（表格内容保留，去掉已不存在的绑定名，只描述形状与正文），再补一句 318 的 `getCompactPrompt` 行为。
- query.md:1449 `Xn()` → `MAX_LOOKUP_BUCKETS(...)`（`chunk-exfmq47h.js#rS`）。316 的 `Xn()` 在 `modelDisplay` 只是包装 `WV.of(host)`；318 同一位置的注册调用是 `MAX_LOOKUP_BUCKETS(modelKnowledge)`。
- tools.md:263 `explainUnavailableArtifactTool` → `describeUnknownTool`（`chunk-5xgkngpb.js#vJo`）→ `describeToolUnavailable`（`#z4r`）。316 的 `explainUnavailableArtifactTool` 就是这段的建议文本生成器，318 拆成两层。
- tools.md:495 `getMachinesSection` → `bash3NoteLong`（`chunk-5xgkngpb.js#PJt`）末尾的 `# Machines` 节。318 里机器段并进 `bash3NoteLong`，没有单独函数。
- tools.md:592 `#L5s`/`#Ujr`/`#hDo` → `#vui`/`#F9r`/`#M0o`；PowerShell 两项 `#sn`/`#rn` → `checkPowerShellPermissions`（`#sn`，318 里同名同尾不对应）/`denyCrashedCheckUnderCommandClamp`（`chunk-6zpsr8vx.js#on`）。
- tools.md:684 `readFileToolCall` → `readFileForTool`（`chunk-5xgkngpb.js#_Nr`）。
- tools.md:1180 `getWebSearchFastMode()` → `SDt()`（`chunk-pfdb6yeg.js#SDt`）。

## 改了意思的地方

1. 压缩提示词一节（query.md 1186–1196）：不只是换名字，316 的"arm → 正文构造函数"表格结构与 318 的"整段提示词作为变体"不同，按 318 现状重写并保留表格作历史说明。
2. bootstrap.md 489：从"未命名，含义不确定"改为按 318 的命名现状描述。
3. `usedRetryLabels` → `droppedBetaSet`：318 的集合名丢了"retry label"语意（同一集合也用于别的 beta 丢弃），但用法仍是"每个标签只用一次"，照代码写。

## 发现的文档与代码不符（fails.tsv 之外，仅记录）

- query.md 附件表另有多处简写 `#vPr`、`#XCn`、`#ZCn`、`#iPr`、`#TJn`、`#Eve`、`#A7e`、`#x7e`、`#Yjo`、`#CPr`、`#APr`、`#Zxr`、`#ePr`、`#tPr`、`#nPr`、`#FPr`、`#HPr`、`#UPr`、`#zPr`、`#qPr`、`#zxr`、`#bCn`、`#AMn`、`#EOn`、`#aPr`、`#lPr`、`#wCn`、`#ECn`、`#WPr`、`#oAn`、`#KPr`、`#af` 等，其中多数在 318 只保证"某个声明用了这个尾号"，文件不一定对得上（例如 `#XCn`/`#ZCn`/`#Eve`/`#Yjo` 已落到别的文件）。doc-refs 只按全局尾号判定，所以这些行不报错；建议另开一批按 `q.mjs find` 校正整张表。
- 同类问题在 tools.md、extensions.md、ui.md 里也普遍存在（316 的 `#xxx` 简写被 318 里别的声明的同号"命中"）；本轮只处理 fails.tsv 命中的那几处。
- commands.md:352 表格里 `/login` 的实现路径仍写 `whwtfsqf→vrmtstb0`（都是 316 的 chunk）；该行不在 fails.tsv（表格里没有反引号，脚本不查），未改。

## 拿不准 / 留给 lead

- ARCHITECTURE.md 第 388 行的 Bun 修订号 `71c9bf0ca`：318 的 `original/reconstruction.json` 是 `424a542a9`，316 是 `71c9bf0ca`。按"版本事实不改"留给 lead。
- `writePrintResult`、`SetModelFromArgs`、`explainUnavailableArtifactTool`、`createMessageQueueManager`、`COMPACT_PROMPT_ARMS` 等旧名写成不带反引号的"316 时叫 …"是刻意的：doc-refs 会检查标识符是否在 318 代码里出现，带反引号仍会 FAIL。
- query.md 1186 行的 `summaryBlockText`、`COMPACT_PROMPT_TEMPLATE` 和 bootstrap 489 的 `u`/`call` 等新写入的名称都不在反引号里同样出于此；若以后阅读树有了同名绑定，可以再包回反引号。
