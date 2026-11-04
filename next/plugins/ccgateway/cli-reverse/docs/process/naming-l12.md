# 第五阶段第四轮（参数/局部）命名：name-l12c（组 12 收尾）

范围：`analysis/segments/naming-round4c.json` 第 12 项，**下标 0–1876（全组 1,877 个声明）**。这是接手前的剩余部分：前任已经把组的前半段大部分写完，我按"剩余仍为 `_K` 的绑定"逐批补完，直到全组剩余 0。

名字表：`artifacts/tmp/lead/final5`（`top.json` + `locals.jsonl`）。结果**追加**到 `naming/semantic-l12.jsonl`（前任写的 4,704 行原样保留，从未整体重写）。

## 覆盖的代码（按阅读树路径，`src/utils/abortController.js` … `src/utils/filePersistence`）

组内 176 个目录、1,877 个声明、151 个 chunk。接手时用 final5 重算，全组仍有 **6,528 个压缩绑定**，扩散到 144 个 chunk，主要集中在下述新写的文件（尤其 `claudeInChrome/fileUpload.js`、`filePersistence/`、`exportRenderer`、`externalEventRecords.js`、`earlyInput.js`）：

- `src/utils/exportRenderer.js` / `exportRenderer/*`、`exportTranscript`（ExportTranscriptView）
- `src/utils/fileUpload` 之前的大片：`file.js`、`fileHistory.js`、`fileKind.js`、`fileOperationAnalytics.js`、`filePathValidation.js`
- `src/utils/claudeInChrome/`（`fileUpload.js` 整片：screenNetworkPath / assertNotNetworkOrSuspicious / assertNoReadRule / screenUploadPath / screenUnreadUpload / vetUploadPath / validateUploadPath / validatePaneUploadPath / readAtMost / verifyHandleBinding / readValidatedFileWithin / readUploadFile / placeFilesByName 相关、`mcpServer.js` 的 createChromeContext、`chromeToolNames.js`、`ChromeSocketClient`）
- `src/utils/deepFreezePlainData.js`、`externalEventRecords.js`、`featureFlagReadout.js`、`controlMessageCompat.js`、`earlyInput.js`、`doctorContextWarnings.js`
- `src/utils/filePersistence/` 整片（`placeFilesByName.js`、`homeFilePublish.js`、`stageFileRoots.js` 等），见 `docs/process/naming-l12.md` 里的 `placeFilesByName` 说明

## 结果

| 项 | 数量 |
|---|---|
| 接手时 `naming/semantic-l12.jsonl` | 4,704 行（68 chunk，`check` 0 problems / 18 suffixed，冲突都属 final5 既有条目） |
| 组内声明数 | 1,877（下标 0–1876） |
| 接手时用 final5 重算仍压缩的绑定 | 6,528 |
| 本次写入行数 | 6,587（追加式；其中 45 个键各出现两行，是改名重写，后写生效） |
| 唯一键 | 6,528（**与重算的绑定数一致，全组剩余 0**） |
| 涉及 chunk | 144 个 |
| `check`（整表） | 0 problems，18 suffixed by conflicts（全部是前任既有条目，19 个 chunk 以外的行没有新增冲突） |
| `check`（只看本次写入的行 + final5） | 0 problems，**0 suffixed by conflicts** |
| 覆盖复核 | final5 + 本表合并重建 1,877 个声明，剩余 `_K` 为 **0**；1877 个声明里 26 个在 final5 阶段已无压缩绑定，其余 1,851 个全部由本表覆盖 |

置信度分布（6,587 行）：0.85 共 6,426、0.8 共 133、0.75 共 21、0.7 共 6、0.6 共 1。低置信度主要是死变量/未被读取的占位参数、React 编译缓存槽、以及只有字符串拼接的局部。

## 做法

- 每批 `node --max-old-space-size=3000 tools/naming/annotate.mjs show analysis/segments/naming-round4c.json 12 <from> 30 artifacts/tmp/l12c/final`，`final` 是 `final5` + 本表合并的临时目录（`top.json` 复制、`locals.jsonl = final5/locals.jsonl + semantic-l12.jsonl`），这样新命名的绑定会直接渲染成人名，便于下一批复用/避免重名。
- 每批写完 `cat artifacts/tmp/l12c/batchNNN.jsonl >> naming/semantic-l12.jsonl`，然后跑 `check`，再重建 overlay 与整组 dump，用 `artifacts/tmp/l12c/remain.cjs` 重算剩余 `_K` 偏移，定位下一批。
- 收尾前把全表 `check` 一遍，并用 `final5` + 本表重建 1,877 个声明逐条比对，确认本组剩余压缩绑定为 0。
- 中间一次提交出错：手写 JSONL 里 `{"file":"chunk-...js":"@..."}` 少了一个 `"key"`，导致 `JSON.parse` 全线失败；删掉那一行（`semantic-l12.jsonl` 第 10790 行、`batch071.jsonl` 第 71 行）后恢复。

## 改名重写（同一键多次出现）

共 45 个键出现两次以上（多为对整组 dump 的再读优化），典型：`result → cleanupResult`、`pendingCall → pendingEntry`、`tab → tabInfo`、`parsed → parsedPayload`、`chip → placeholderChip / containingChip`、`targetPath → fileTargetPath / linkedTargetPath`、`level → candidateLevel / lowerLevel`、`textContent → rawTextContent / collectIncludes`、`reusable → reuseStamp` 等。

另有 9 行起初覆盖了前任已有的名字（`module → sdkModule` 等），以为必须避开 `_2` 冲突；后按指南"已有名字不要改"把这些键改回前任的名字（`module`、`process`、`exports`），前辈的行依旧是最终生效值。

## 跳过

- 没有整段跳过的声明；`unnamed = 1/2` 的小声明也全部读完。
- 只有 1 个绑定是刻意标成 `unused`（`chunk-23fm9f0d.js@27737`：`D = !1;` 之后被 `|| !0` 短路，永远不参与判断；同函数里它就是死变量，confidence 0.6）。另一个曾标 `unused` 的 `chunk-e6aww6q8.js@641175` 经复查是 `writeReuseStamp` 的 `reuseStamp` 形参，已改为 `reuseStamp`。

## 发现的问题（仅记录，未在本文覆盖）

1. **命名表口径**：`PLACEABLE_FILE_TYPES = 3000` / `COPIED_BYTES_LIMIT = 134217728` 这两个常量名与实际值完全不符（前者是"每轮最多放置的文件数"，后者是"每次最多复制的字节数"）。这是前面阶段生成的常量名，建议按 `MAX_PLACED_FILES_PER_ROUND` / `MAX_COPIED_BYTES` 之类改名。
2. **`placeFilesByName` 参数顺序错位**（`reconstructed/src/utils/filePersistence/placeFilesByName.js:203`）：签名是 `(args, context, timeBudgetMs = PLACEABLE_FILE_TYPES, byteBudget = COPIED_BYTES_LIMIT)`，而 `placeFilesUnchecked(fileNames, args, context, allowedTypes, byteLimit)` 的第三个参数实际是**时间预算**（`performance.now() + d` 作 deadline，超过就记 `over_time_budget`），第四参才是**字节预算**（`r - O` 传给 `placeOneFile` 作 `maxBytes`）。也就是说 `PLACEABLE_FILE_TYPES = 3000` 被当成 **时间预算（3000 ms）** 使用，`COPIED_BYTES_LIMIT = 134217728`（128 MB）被当成**字节预算**——名字与语义正好倒错，读代码时极易误判；`refreshFilesPlacedByName(files, byteLimit = COPIED_BYTES_LIMIT)` 又只把这个常量当字节预算，两处用法不一致。
3. **`placeFilesUnchecked` 的 `context` 参数只读 `aborted`**：`o_K4701` 整个函数里只用来 `context.aborted` 检查取消，名字 `context` 偏宽；`timeBudgetMs` 是从调用点传进来的 `d`，默认 3000 ms，建议至少把参数名改成 `deadlineMs`。
4. **`writeReuseStamp` 的 `listedFor` 语义**：`listedFor` 既当"已列出过的名字数组"又当字符串参数（`s`），`SAFE_LISTED_NAME_RE` 只检查后者；`r.listedFor.includes(s)` 与 `[...r.listedFor, s]` 的写法说明两者不是同一类型，容易读错。
5. **`screenUnreadUpload` 与 `screenUploadPath` 互为递归**（深度 `MAX_PATH_ALIAS_DEPTH = 3`），`seen` 集合上限 `MAX_SCREENED_PATHS = 64`；`screenUploadPath` 直接把 `screenUnreadUpload(...).judged` 当返回值，名字 `judged` 与返回值 `judgedPath` 的语义（展开后的绝对路径）不完全一致，但沿用了已有名字。
6. **`assertNoReadRule` 遍历 `paths`（Set）**，对每个 path 调两次 `matchingRuleForInput`（deny/ask），`caseInsensitiveTarget` 由调用方传 `{ caseInsensitiveTarget: !0 }`；`{ caseInsensitiveTarget: true }` 那次是对大小写折叠后的路径二次检查，读时注意。
7. **`ChromeSocketClient`** 的 `escape` / `placeholder` 系列（`placeholderStartingAt` / `placeholderContaining` / `placeholderEndingAt`）以及 `Cursor` 的 Vim 移动方法，压缩名多为单字母，命名以"游标落在哪个占位符上"为准；`prevVimWord` 里 `placeholderEndingAt` 与 `placeholderContaining` 的先后顺序决定了"退到占位符起点"还是"退到词首"，读时不要按普通文本处理。
8. **`createChromeContext`**（`mcpServer.js`）里 `claudeInChromeSession()` 返回的 `session` 只用于 `onPeerRosterChanged: () => bumpBrowserRoster(session)`，其他回调都用闭包变量（`pairedDeviceId`、`logger`、`storageV5`），该函数的 `options` 参数里 `availabilityFunnel`、`storageV5`、`credentials`、`bearerGate` 都是注入的依赖，与 `env_2` 分开读。
9. **`identityFreeze` / `identityFreeze2/3/4`**（`deepFreezePlainData.js`）是四个逐字的恒等函数，分别导出给不同调用方；`deepFreezeToolName`、`mintDisplayedUpdates` 三个冻结/浅拷贝函数的错误信息都写着 "plain data only"，`mintDisplayedUpdates` 只对数组做深冻结并拒绝稀疏数组。
10. **`getErrnoPath_2`**（`errors.js`）带 `_2` 后缀，说明与另一处同名函数重复；`fileKind.js`/`filePathValidation.js` 里也有类似的 `_2` 复制品，属前面阶段遗留。

## 产物（`artifacts/tmp/l12c/`）

- `batch001.jsonl`–`batch080.jsonl`：每批命名条目（`cat >>` 追加用；共 6,587 行）。
- `final/`：`final5` + 本表合并的临时 `top.json` / `locals.jsonl`，仅用于 `show`/复核（不改 `artifacts/tmp/lead/final5`）。
- `remain.cjs`：按 dump 重算每组声明仍为 `_K` 的绑定（最终 0）。
- `find.cjs` / `range.cjs` / `view.cjs` / `extract.cjs`：按偏移查上下文、按声明区间看代码的辅助脚本。
- `final_dump.txt`：全组 1,877 个声明的最终渲染（1,877 个 `===` 段）。
