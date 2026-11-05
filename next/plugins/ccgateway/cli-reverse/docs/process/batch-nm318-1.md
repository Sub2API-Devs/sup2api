# nm318-1 命名批次过程记录

批次范围：`src/_new/adoptRosterOrphans.js` … `src/_unattributed/chunk-5xgkngpb/part-003.js`，439 个声明、1,598 个待命名绑定（`plan.json` 下标 0）。

## 结果

- `naming/semantic-nm318-1.jsonl` 共 **2,313 行**（去重后仍 2,313 行，无重复键），覆盖 **2,310 / 2,310** 个 plan 绑定，覆盖率 100%。
- 全部走偏移键（`file` + `@N`），`source` 一律 `semantic`，`confidence` 0.6–0.9。
- `node --max-old-space-size=3000 tools/naming/annotate.mjs check naming/semantic-nm318-1.jsonl` → `2313 lines, 88 chunks, 0 problems, 0 suffixed by conflicts`。
- 没有跳过的条目，所以没有"死代码/看不懂"清单；少数确实只有极弱依据的局部变量是直接跳过的（见下）。

## 做法

1. 先读 `AGENTS.md`、`GUIDE-naming.md`、`TASK.md`，再按 `plan.json` 顺序用 `annotate.mjs show` / `id` 读 318 的代码；`hints.jsonl` 里 42 条 316 名字按需用 `tools/versions/inspect.cjs` 与 318 对照。
2. 草稿目录 `artifacts/tmp/batches/nm318-1/work/` 写了几支一次性小工具（只读，不影响其他批次）：
   - `bind.mjs`：列某 chunk 某偏移区间的绑定（键/名/种类/引用数），用来精确定位真实偏移；
   - `dump.mjs` / `left.mjs`：按声明打印原始源码与"仍未命名"的绑定，代替整文件读阅读树；
   - `prune.mjs`：删掉偏移写错的行与重复键（写错过 53 条，全部丢弃后按真实偏移重写）；
   - `conf.mjs`：用 `renameModule` 复刻 check 的逻辑，只打出**自己这张表**引起的冲突（`check` 的 `suffixed` 计数是全局的，看不出来源）；
   - `prog.mjs`：按声明统计覆盖率；
   - `fix.mjs`：批量改名。
3. 每批 8–15 个声明，写完立刻 `prune` + `conf` + `check`，冲突当场换名字。中途出现过一次 heredoc 把两行 JSON 吞掉半截（`"note":"…"` 后直接换行），按"合并断行"修好。

## 沿用 316 名字的部分

`hints.jsonl` 的 42 条里，能确认 318 语义未变的直接沿用：`syncLiveInFlightSnapshot` 的 `rows`/`includeSettled`、`setupBedrockCommand`、`setupVertexCommand`、`skillDoctorCommand`、`skillDoctorNonInteractiveCommand`、`sessionKeyOrHostKey`、`isOfficialFirstPartyEndpoint` 等。被工具标成 `conflict` 的原因都是 318 里同名绑定撞车或压缩名不同，不影响沿用。

## 命名依据示例

- 字符串：`MAX_SERVED_CERTIFICATES`（日志 "`${n} are already held to choose among the system store's cross-certificates`"）、`REMOTE_CONTROL_OFF_TITLE`/`_BODY`/`TURN_ON_AND_SEND_LABEL`（三句 UI 文案）、`HOOK_MESSAGES_CUT_NOTICE`、`MAX_ERROR_CHARS`。
- 遥测事件：`TENGU_WOOLLY_BLANKET`、`TENGU_GENTLE_CUPCAKE`、`CODE_MODE_OPT_IN_GATE`、`PROGRAM_USE_CASE_CHOICE_FLAG`、`MCP_DRIVE_DOWNLOAD_EVENTS`。
- 属性/调用关系：`inFlight.tasks` ← `rows.count`；`othersStoredTextIsTold` 的两张 action 白名单；`ReplSessions` 里 `#e`/`#t`/`#i` 语义明确后按 `pending`/`unwaited`/`settling`/`depth` 命名局部。

## 发现的问题

1. **`annotate.mjs show` 的 `_K` 偏移没法直接当键用**：输出是经过 prettier 的，`n_K17884` 里的数字是 original 里的绑定起点，但阅读树里的显示位置和 original 偏移差 2–4。最早按"目测位置"写了 53 条全错，`check` 全部报 `no binding at this offset`。**建议在 GUIDE 里补一句：键只能取自 `bindingsOf`（或原文件里的真实字节偏移），不能照 `show` 输出里的位置推算。**
2. **`check` 的 `suffixed by conflicts` 是全局的**：只要表里有任意一条在合并时被加后缀就非 0，但不告诉你是哪条。加一支只跑自己表的 `conf.mjs` 才定位得到。本轮共遇到 9 次冲突（`toolUseID`/`identity`/`self`/`relative`/`projectCommand`/`stillOurs`/`args`/`MAX_RESULT_CHARS`/`rest`），全部改名消掉。
3. **`plan.json` 里 `unnamed` 与实际可命名的绑定数不一致**：`chunk-gv3r3pqa.js#A` 写 13，实际有 17；`#W` 写 27，实际 40。以 `bindingsOf` 为准。
4. **同一份代码在 318 里被复制到多个 chunk**：`chunk-0f2rgfjp.js` 与 `chunk-5c6dj2v2.js` 的 `readMcpDirectory` 完全一样，`chunk-5m9bvhje.js` 里 `logEventTo1P` 出现两次（`part-001.js` 里被放置成 `logEventTo1P` 和 `logEventTo1P_2`）。给第二份起名时避让了同名。
5. 阅读树里 `_new/offInCodeModeNoteForModel.js` 的 `T`/`x`/`P` 三个 `var` 被 `deferInit` 包住、注释说是"共享一个赋值的绑定"，但语义清楚：`pinnedCodeMode`、`beforePin`、`codeModeBeforePinValue`。

## 已知偏弱的名字

- `chunk-mzw6m19v.js` 的 `buildConversationCopy`（原 `F`）里几个逐层 map 的局部（`nextRow`、`candidateRow`、`finalRow`）。
- `chunk-fmnbrxwy.js` 里 `fitSharedViews` 的预算循环变量（`remaining`、`kept`、`state0` 等），代码很长，只能按角色取名。
- `chunk-k3zg85zg.js` 里 `ReplSessions` 的若干 `get`/`has`/`set` 参数一律叫 `sessionId`，这是照方法用途取的，不是从调用方证据来的。
