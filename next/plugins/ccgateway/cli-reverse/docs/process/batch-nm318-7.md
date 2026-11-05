# nm318-7 命名批次过程记录

## 范围与结果

- 批次：nm318-7，范围 `src/services/api/claude.js` … `src/services/memorySync/syncConfig.js`（阅读树路径），`plan.json` 只有一组（下标 0），510 个声明、1598 个未命名绑定、75 个 chunk、202 条 316 名字提示。
- 产物 `naming/semantic-nm318-7.jsonl`：1604 行，覆盖 plan 里全部 1598 个绑定（命中率 100%，逐绑定核对：plan 范围内已无未命名绑定）。其中 322 行是顶层函数/类/常量，1282 行是参数与局部。
- `annotate.mjs check` 通过：`0 problems, 0 suffixed by conflicts`。
- 没有跳过任何绑定。清单里出现的 10 个「plan 计数比行数多」的声明，都是 plan 记录的是旧快照：`declStart` 之外还有绑定落在 `[start,end)` 里（plan 的 `unnamed` 计数与 `bindingsOf` 现算值有 ±1 偏差），逐绑定核对已全部覆盖。

## 做法

1. 先读 AGENTS.md、GUIDE-naming.md、TASK.md，把 plan 的声明清单导出到 `work/decls.txt`，按文件统计未命名绑定，先做排名前列的大声明。
2. 每个声明用 `annotate.mjs show` 看代码 + 属性名/字符串/调用关系，再用 `work/binds.mjs`/`work/unnamed.mjs` 精确取绑定偏移，`work/conflicts.mjs` 定位 check 报的冲突并改名。
3. 写盘节奏：每 20～40 行追加一次，每批后跑 `check`，冲突就改名复校（如 `mediaIndex`→`mediaIndexInBlock`、`context`→`toolContext`、`messages`→`allMessages`）。
4. 只写 `semantic-<code>.jsonl` 和本文件，其他都在 `work/` 草稿里。

## 命名依据（举例）

- 316 同名单元：`usedCountById`、`systemEnd`、`boundaries`、`configHashes`、`fetchCcrSenderAddress` 等沿用 hints。
- 字符串字面量：`NETWORK_EDGE_BLOCKED_MESSAGE`（apiError `network_edge_blocked`）、`TOOL_NAME_HEADER_SIZE_STEPS`、`MAX_TYPE_INSTRUCTIONS_CHARS`、`REPORT_PARAMS`、`JudgeHookConditionSchema`、`ARTIFACT_OUTPUT_SOURCE_QUERIES`。
- 调用关系：`iyn` → `serverToolChoice`（错误文案 `serverToolChoice: could not read the tools`）、`qjn` 内部循环 → `deniedEntry`、`recoverRejectedBetas` 被 `onApiError` 链式调用。
- 属性名：`normalizeOptions.onNormalizeStage` 来自 `r?.("before"|"normalize"|"images"|"post_process")`；`mediaTakenOut` 来自 `normalizeOptions.mediaTakenOut`。

## 发现的问题

1. **hint 名字只有 40/202 沿用**。316 的 hints 大多是局部变量名，318 里对应位置已经重排（`local-not-aligned`），多数只能按 318 现场语义重新命名；少数是顶层函数，也没沿用（例如 316 `MSr` 的 `iterator` 在 318 是带心跳的 `withStreamHeartbeat`）。
2. **`iyn` 的结果名 `llmSpan` 与用途不符**：`iyn(...)` 返回的是 `{type:"none"}`，被赋给 `tool_choice`；`llmSpan` 是 tracer span，实际传进了 `startLLMRequestSpan`。已在命名里按 `serverToolChoice` 记，但调用点的 `llmSpan` 是调用方文件里的名字，属于既有名，未改。
3. **plan 的 `unnamed` 与当前绑定表有偏差**：见上，10 个声明计数多 1～?；不影响覆盖，但会让「按 plan 计数算覆盖率」偏低（99.4% 对实际 100%）。
4. **`chunk-1hnjmk23.js` 里 `j2o` 声明范围包含 `AUTH_REQUIRED_MESSAGE` 等一整串认证文案**：起名字时按内容拆成了 `LOGIN_EXPIRED_RUN_LOGIN_MESSAGE` / `LOGIN_TIME_LIMIT_UNRENEWABLE_MESSAGE` / `LOGIN_TIME_LIMIT_SIGN_IN_MESSAGE`，与同段已展的 `*_MESSAGE` 风格一致。
5. **`chunk-5xgkngpb.js#Z_n`（`queryModel`）有 95 个参数/局部**：整段按注释里的 telemetry 状态机读完了（`clearAtProbeState`、`thinkingDisplayProbeState`、`contextBetaState` 等），部分「*Probe/state」一类按 `settle*`/`probe*` 命名，个别纯回调是 `noopAfterSend`/`noopAfterSuccess`（与 316 同名）。
6. **重名冲突比较集中**：`messages`、`context`、`schema`、`entry` 在 `queryModel` 里反复出现，最终用 `allMessages`/`toolContext`/`schema_2`/`refEntry` 等区分；`zhr` 系列 `recoveryState`、`healState`、`probeState` 各出现两次，第二次靠顺序后缀或语义后缀区分。

## 遗留

- 无未命名绑定。行数（1604）略多于 plan 计数（1598），因为几个声明里补了 plan 快照漏计的绑定；这是覆盖完整的副作用，不影响 check。
