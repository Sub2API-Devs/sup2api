# 第五阶段第四轮（参数/局部）命名：name-l14c（组 14，续做）

范围：`analysis/segments/naming-round4c.json` 第 14 项（下标 14），共 **84 个目录 / 2,009 个声明 / 109 个 chunk**，目录首尾为 `src/utils/inboxClassification.js` … `src/utils/permissions`，实际是 `src/utils/` 中段到末尾的字母序：

- `instructionFileAccess.js`、`invisibleChars`、`json*`、`keyedSemaphore`、`lockfile`、`log.js`、`loop/`
- `markdown*`（markdown、markdownConfigLoader、markdownFileLinks、markdownHeadings、markdownInlineRendering）
- `mcp/`、`mcpWebSocketTransport`、`memoize`、`messageQueue*`、`messages.js` + `messages/`、`messagingSocket/`
- `model/` 整片（bedrock、bedrockDefaultCheck、modelCatalog、publishedCatalogCache、servedModelCatalog、startupModelResolution、thirdParty*、vertexUpgrade …）、`modelCost.js`
- `nativeInstaller/`（download.js、installer.js、pidLock.js）、`notifications/`、`path*` 一族、`pdf`/`pdfUtils`
- `peer*`（peerAddress、peerAddressing、peerFileReceive、peerIdleSubscriptions、peerInbound、peerMessageHeaders、peerSendSigner、peerSessions/）
- `src/utils/permissions`（最大的一块，4,122 个绑定，含 filesystem、permissions、permissionSetup、yoloClassifier、classifier* 等）

## 前任写到哪里

接手时 `naming/semantic-l14.jsonl` 为 **5,591 行 / 145 个 chunk，`annotate check` 0 problems**（与 `git HEAD` 逐行一致）。前任没有留 `docs/process/naming-l14.md`。

用 `artifacts/tmp/lead/final5` 重算：本组 2,009 个声明里，除 final5 已命名的之外还有 **6,975 个绑定**显示为 `_K<偏移>`（计划文件里 `unnamed` 求和是 6,991，差 16 个是长度 >3 或 frozen 的绑定，不算压缩名）。

## 本次续写

| 项 | 数量 |
|---|---|
| 接手时行数 | 5,591（一行未删、未重写，`git diff` 为 5,591 行后纯追加） |
| 本次追加条目 | **6,982**（190 个批次文件，全部 `cat 批次 >> 目标`） |
| 最终行数 | 12,573 |
| 覆盖的声明 | 1,977 / 2,009（其余 32 个接手时本组已无未命名绑定，未写） |
| 覆盖的绑定 | 6,975（组内剩余 `_K` 为 **0**） |
| `annotate check` | **0 problems / 0 suffixed by conflicts** |
| 覆盖复核 | 用「final5 + 本表合并」重跑 `show 14 0 2009`，组内剩余 `_K` 偏移 **0**；计划里 `unnamed` 为 1–3 的 32 个声明复查后全部已有名字 |

置信度分布（本次 6,982 条）：0.9 29、0.85 5,573、0.8 1,218、0.75 127、0.7 28、0.6 4、0.55 1、0.5 2。

## 做法

- 自写 `artifacts/tmp/l14c/` 下若干只读小工具：`remdecl.mjs`/`ctx.mjs`/`batch.mjs`（按声明批量展示、只打含未命名键的行及上下文）、`remaining.mjs`（用「final5 + 本表」重算组内剩余 `_K`）、`conf3.mjs`/`conf4.mjs`/`conf5.mjs`（复算会被加 `_2` 的同作用域撞名）、`stats.mjs`/`cover*.mjs`/`untouched.mjs`（接手前/后的覆盖率统计）。node 一律 `--max-old-space-size=3000`。
- 每批 1–40 个声明（多数 10–20 个），读完立刻写 `artifacts/tmp/l14c/bNN.jsonl`，先 `check` 批次、再 `cat >> naming/semantic-l14.jsonl`，并定期 `check` 全表。
- 大声明优先：`ManagedEnvApplier`（124 绑定）、`normalizeMessagesForAPI`（197）、`hasPermissionsToUseToolInner`（181）、`buildClassifierTranscriptEntries`（134）、`initializeToolPermissionContext`（44）、`clampArtifactClassifierState`（29）、`filterManagedPermissionRules`（28）先一次做完，再回头扫零散 1–3 个绑定的声明。
- 复用名字表：把 `final5/{top.json,locals.jsonl}` 复制到 `artifacts/tmp/l14c/final/`，再把本表 `cat >>` 到 `final/locals.jsonl`，就能用自己最新的命名做 `show`/统计，不必等 lead 重跑 resolve。
- 撞名处理：`check` 只报总数，另用 `conf*.mjs` 拿到明细后逐条改成更具体的名字（`cwd`→`inputPath`、`handledOffIds`→`handedOffSet`、`state`→`noticeState`、`message`→`rowMessage`/`sourceMessage`、`index`→`cursor`、`block`→`rowBlock` 等），最终全表 `0 suffixed by conflicts`。

## 发现的问题

1. **偏移跨 chunk 重号，极易写错归属**。同一个 `@2730`、`@7632`、`@2822429` 这样的键在不同 chunk 里都存在，按 `show` 输出里看到的位置直接写 `file` 会张冠李戴。本轮至少 6 次写错后由 `check` 的 “no binding at this offset” 或 `show` 头部定位纠正（例如 `@2730/@2732/@2750` 实际属于 `chunk-s93zf4b4.js#Mgt`，不是 `chunk-c0w5a81j.js`）。建议后续给 `show` 输出在每行前直接带 `file`，或在 `check` 失败时打印该偏移实际所在的 chunk+声明。
2. **顶层绑定写进 `semantic-*.jsonl` 不会生效**。本表里有 13 行（`@990663`、`@990977`、`@994211`、`@1350`、`@1237`、`@16527`、`@17322`、`@12801`、`@11338`、`@66244`、`@2642`、`@6792`、`@10485` 等）实际是 `scope: "top"` 的模块级 `var`/`function`，`annotate` 会先应用 `final5/top.json` 的条目再 `Object.assign` locals，等于既没覆盖也没报错；`check` 也不报错。这些名字要在下一次 lead 跑 `tools/naming/resolve.mjs` 时才会进 `top.json`，在那之前 `show` 里仍显示 `_K`。建议 `check` 对 `scope==='top'` 的行给一条 warning。
3. **批次文件曾被破坏过三种形态**：两行被粘成一行（`},{` 出现在同一行）、键名写成 `"name"` 而不是 `"key"`、以及行尾多余逗号。都靠 `check` 的 “no binding at this offset” / 解析报错发现，之后用 node 按 JSON 重写修复。
4. **与前任重复 14 行**（同一 `file`+`key`）：其中 10 行同名、4 行是我给已有键另起的名字。已按「保留前任行」原则删除我的重复行；后续 3 行同类重复（`@272871`、`@287748`、`@287752`）也一并去重，最终 0 重复。
5. **死变量不少**：本组 `refs === 0` 的绑定有 155 个（占约 2%），集中在 `yoloClassifier.js`、`permissions.js`、`installer.js`。其中 8 个只给占位名（`unusedA`/`unusedB`/`unused`/`unusedNull`/`unusedFlag`/`unusedRetryFlag`/`unusedFallbackFlag`，置信度 0.5–0.6），例如 `classifyYoloAction` 里 `let _r = !1` 与 `let Es = !1` 赋值后从不读取（疑似删掉的分支残留）。
6. **`chunk-e6aww6q8.js` 是 400 万字符的万能桶**：本组 109 个 chunk 里它一个就占了几十个阅读树文件（permissions、model、messages、notifications、peer* 的一部分等）。每次 `show` 都要重建整 chunk 的绑定表，单次 20–40 s，是本组最费时的部分；本表为它写了约 2,000 行。
7. **`show` 的 “N unnamed” 计数会漂移**：同一批名字里含 `_K` 数字（如 `unused_K...`）或名字里出现别的偏移时，头部计数会被正则误算（本表统计“剩余”时必须用 `file|key` 与命名表比对，不能只看头部数字）。
8. **同一作用域里 `state`/`context`/`entry`/`message`/`options` 这类通用名极密**：`permissions/filesystem.js`、`permissionRecord.js`、`yoloClassifier.js` 相邻函数几乎每个都叫 `context`，必须加限定词（`grantContext`、`callContext`、`finalDecision` 等）才不撞名，读起来也更清楚。

## 跳过

无绑定级跳过（组内剩余 `_K` 为 0）。32 个声明未写，原因是接手时用 final5 查它们已经没有任何未命名绑定；8 个只赋值不读的绑定给了 `unused*` 占位名而不是按语义命名。
