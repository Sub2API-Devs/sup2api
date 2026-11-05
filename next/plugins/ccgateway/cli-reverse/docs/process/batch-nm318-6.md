# nm318-6：命名批次过程记录

## 范围与产出

- 输入 `artifacts/tmp/batches/nm318-6/plan.json`（下标 0）：500 个声明、plan 自报 1601 个仍压缩的绑定，范围按阅读树路径从 `src/components/Messages.js` 到 `src/services/api/claude.js`，跨 232 个源路径、104 个 chunk。
- `hints.jsonl` 328 条，分布在 91 个声明上（316 里占同一位置的局部名，工具判定 `local-not-aligned`/`conflict` 没自动迁移）。
- 产出 `naming/semantic-nm318-6.jsonl`：1666 行，全部是偏移键（`file` + `key:"@偏移"`）、`source` 一律 `semantic`、`confidence` 0.6–0.85；其中 1640 行落在 plan 声明区间内，26 行是按调用关系一并命名的同文件邻近辅助函数（口径见下）。
- `node --max-old-space-size=3000 tools/naming/annotate.mjs check naming/semantic-nm318-6.jsonl`：`0 problems, 0 suffixed by conflicts`。
- 用 `work/scan3.mjs`（把本表并入共享 final 的副本后逐声明回扫）复核：500 个声明全部不再有 `_K` 占位（`open 0, placeholders left 0`）。计划内绑定 100% 命名，没有跳过任何条目。

## 做法

- 用 `annotate.mjs show/id` 按声明读 2.1.316 对照（`tools/versions/inspect.cjs` 取同一函数），自己写了对齐脚本 `work/align.mjs`：把 316 方法体和 318 体按结构 token 做 LCS 对齐，把 hints 落在 316 上的名字映射到 318 的对应绑定，再人工按 318 的实际调用确认。
- 316 有同名且位置能对上的直接沿用（199 个 hint 名字原样使用）：如 `CollapsedReadSearchContent` 的 `interruptedRow`/`headerRow`/`autoBlockedNotice`/`deniedNotice`/`unavailableNotice`/`hintRow`/`hooksNotice`、`AssistantToolUseMessage` 的 `innerRow`/`contentColumn`/`outerBox`/`isResolved`/`isPendingClassifier`/`statusDot`/`paramText`/`renderTag`/`progressMessage`、`Messages` 的 `updateSummary`/`logoElement`/`renderItemStable`、`drainToolResults` 的 `retryRefusal`、`useReplBridge` 的 `isBriefOnly`/`hooksRow` 等。
- 其余按字符串字面量、遥测事件名、调用关系、属性名命名。典型依据：
  - 遥测/字符串：`tengu_usage_credits_admin_request_confirm_shown` → `logConfirmShown`；`"This is the git status at the start of the conversation"` → `getGitStatus` 内 `extraStatusLine`；`"This terminal is too short…"` → `TERMINAL_TOO_SHORT_MESSAGE`；`"remote_bootstrap"/"queue_dropped"` → `describeUnsentHeld`。
  - 调用关系：`assistantToolUseCounter` 式的自解释接收者决定参数名；`useRemoteSession` 里 `Bae` 的 `pressed/answered/stamp` 决定 `ticket`/`outcome`/`interruptedBySendNow`；`EscTakeBack` 的 `#a/#c` 由 `holdLine`/`remember*` 决定 `held`/`refusal`。
  - 属性名：`facts.sessionInterface.fit` → `misfit`；`claim.env`/`config.withheldInitialPrompt` 直接给出 `spawnReason`/`handoffUuidOf`。
  - vendor 还原：`claude.js` 尾部实为 lodash 片段的 `oTr`/`rTr`/`sTr`/`iTr`，按 lodash 原名给 `mapCollect`/`sortUnwrap`/`compareAscending`/`compareMultiple`。

## 口径说明

plan 的 `unnamed` 只统计"声明锚点在本声明"的绑定，所以 window 内的 import 绑定、以及被其它声明"认领"的绑定会被算到别处；plan 里 1601 这个总数也含少量本就落在区间内的 import/重复锚点。按"plan 区间内的偏移"重新计数：区间内已有 1640 条覆盖，回扫后区间内的 `_K` 占位为 0。另有 26 条写在区间外，都是同一 chunk 的邻近小辅助函数（`configFingerprint`、`writtenPathsOf`、`refusalMessageOf`、`applyDisallowedTools`、`canStopRemoteWorkflow`、`localWorkflowsOn` 等），不属本批路径但缺名字就看不懂调用者，所以一并命名。

## 沿用的 316 名字（抽样）

`updateSummary`、`logoElement`、`renderItemStable`、`innerRow`、`contentColumn`、`outerBox`、`isResolved`、`isPendingClassifier`、`statusDot`、`paramText`、`renderTag`、`progressMessage`、`isBriefOnly`、`replResultIds`、`hasReplActivity`、`emptyRows`、`summaryToolUses`、`emptyIdSet`、`summarizedIdSet`、`denialRef`、`hooksRow`、`emptyRowList`、`interruptedRow`、`headerRow`、`interruptedNotice`、`autoBlockedNotice`、`deniedNotice`、`unavailableNotice`、`hintRow`、`hooksNotice`、`tccStatusColumn`、`modelSelector`、`defaultModeRow`、`nextContext`、`screenReaderPrefix`、`permissionsHint`、`hintList`、`consentStrings`、`askRuleStrings`、`askRuleText`、`themeColor`、`consentBlock`、`consentConfigText`、`askRuleBlock`、`disclosureBlock`、`hasBackgroundTasks`、`memoRunningWorkflows`、`remoteTasks`、`visibleTaskCount`、`firstStart`/`firstEnd`/`secondEnd`、`setOverrideColors`、`color`/`shimmerColor`/`heading`、`countNonAmbientTasks`、`footerElement`/`earlyReturnValue`、`showIntroText_`/`helpText_`/`skipExitHandling_`/`cleanupDeps`/`cancelOnUnmount`、`bodyText_`/`noteElement`/`confirmElement`、`ORIGINAL_GAMES_LINE`、`serverName`/`options`、`writePrintResult`/`resultMessage`/`outputFormat`/`resultText`/`maxTurnsMatch`、`child_`/`jti`/`status`、`joinedKinds`、`hasAgentPanelTask`/`shouldDrain`、`commandFieldName`/`commandText`/`gauge`/`currentNotice`、`themeContext`/`themePrefix`/`themesPath`、`isSelfExplanatory`、`cloudToolsAnswered`/`isAttachModeValue`/`pendingResumeMessages`、`mayAutoChart`/`payload`/`next`、`reportPluginProblem`/`plugin`/`problem`/`repeat`、`forgetSessionStartCall`、`checkToolGroupCalls`/`checked*Prop`、`retryRefusal`、`hooksWorkerClient` 的 `repeat`、`renderHookDurationLine` 的 `hook`/`index`、`drainToolResults` 的 `meta`/`executor`、`RemoteSessionManager` 的 `content`/`opts`/`firstUuid`/`namedUuids`、`EscTakeBack` 的 `noteStoppedTurnEnded`/`beforeInterrupt`、`RemoteTransport` 的 `guard`/`prevState`、`serveToolCall` 的 `misfit`/`refusal`、`useRemoteSession` 的 `dropReplyChannel` 系、`SessionController` 的 `loadMore`/`pointerFailedToAppend`/`startRows`、`ResumeConversation` 的 `loadMore`/`morePending` 等。

## 冲突处理

`check` 与"final 表 + 本表"复扫（`work/` 下临时脚本）共报出约 30 次同作用域或遮蔽冲突，全部换名解决，没有依赖自动 `_2` 后缀：

- 与 `naming/final` 已占用的同名局部撞车：`innerPaddingX`→`paddingX`、`apps`→`appsList`、`framed`→`isFramed`、`PermissionPrompt`→`permissionChoicePrompt`、`ruleValue`→`expandedRuleValue`、`isSuspicious`→`isSuspiciousFlag`、`steps`→`scriptSteps`、`argsDisplay`→`argsDisplayValue`、`taskDecorations`→`decorations`、`sessionStore`→`sessionStoreRef`、`count`→`repeatCount`、`window`→`contextWindow`（`window` 是全局名）、`abortController`→`turnAbortController`、`host`→`taskHost`、`logError`→`logTaskError`、`writerFailed`→`writerFailedFlag`、`callModel`→`baseCallModel`、`selectId`/`selectViewingAgentTaskId`/`selectIdleTeammatesExpanded`/`selectRemoteWorkflowRunIds` 等选择器加 `Selector` 后缀、`useCanUseTool`→`useCanUseToolRef`、`hasAgentPanelTask`→`panelTaskOnStore`、`child`→`spawnedChild`、`localWorkflowsEnabled`→`localWorkflowsOn`、`unsubTranscript` 与已有绑定同名则保留一个。
- `treeExpandGlyph`/`canCarry`/`remoteDroppedMcpMessages`/`initialSessionState`/`hasLocalJsxOverlay`/`localWorkflowsEnabled` 等属于"捕获外层或全局"：改成 `glyphOf`/`carryAllowed`/`droppedMcpMessages`/`baseInitialSessionState`/`hasLocalOverlay`/`localWorkflowsOn`。

## 发现的已有问题（未改，供 lead 处理）

1. `chunk-hnxhr3bs.js` 的 `Jc`（本批 `expandKey` 所在文件）在 316 里叫 `iU`，而 318 同 chunk 另有 `iU`（`isNotInformational`，本批已命名），说明 316→318 的符号重排让少量 final 名可能落在错的对象上。
2. `naming/final` 在 `chunk-wjygkcr4.js` 里已把 `ph`（`CollapsedReadSearchContent`）的多个局部命成 `emptyRows`/`summaryToolUses`/`emptyIdSet`/`summarizedIdSet`，但 318 里同名语义已重构（`summaryToolUses` 变成 `summarizedIds` 的输入、`emptyIdSet` 实际是 `lookups.toolResultByToolUseID.get(...)` 的结果），本批按 318 实际含义另起了 `emptyRows`/`summaryToolUses`/`emptyIdSet` 同形名才对齐，改读时容易与 final 混淆。
3. `chunk-czq1j3j2.js` 的 `CWe`（`useRemoteSession`，74 个绑定）里 `#a/#c`、`Rr/qr`、`Os/hs` 等一行多个 ref 的写法，只能按调用点（`holdLine`/`remember*`/`releaseHeldSends`/`accepting`）推断；若后续改动调用顺序，需要复核 `held`/`refusal`/`isAccepted`/`isDialogsDone` 这几个名字。
4. `chunk-0yw3taqg.js` 的 `Jm`（`reconcileSavedFilesForTurn`）里 `H_K110682`/`j_K110686`/`I_K110690` 三个计数器在遥测块里分别叫 `cut_picture_count`/`hidden_picture_count`/`cut_read_count`，据此命名；同一函数的 `316` 侧并无 hint，属完全新写，后续若重构需复核。
5. `chunk-5xgkngpb.js` 末尾的 lodash 片段（`oTr`/`rTr`/`sTr`/`iTr` 与三个别名）被 2.1.318 直接内联，`naming/final` 里没有任何对应名；本批按 lodash 原名补上，但这部分属于 vendor 代码，可考虑归到 vendor 分类。

## 跳过的条目

没有跳过任何条目：500 个声明、区间内所有 `_K` 占位都命名完毕（回扫 `open 0, placeholders left 0`）。`unnamed` 为 0 的声明本来就已命名完毕，不属于本批。

## 校验

```
node --max-old-space-size=3000 tools/naming/annotate.mjs check naming/semantic-nm318-6.jsonl
1666 lines, 104 chunks, 0 problems, 0 suffixed by conflicts
```

```
node --max-old-space-size=3000 artifacts/tmp/batches/nm318-6/work/scan3.mjs
decls 500, open 0, placeholders left 0
```
