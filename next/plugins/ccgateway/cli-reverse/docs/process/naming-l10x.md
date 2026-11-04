# 第五阶段第四轮（参数/局部）命名：name-l10x（组 10 后半段）

范围：`analysis/segments/naming-round4c.json` 第 10 项，**声明下标 1493 到末尾**（1,389 个声明，共 2,882 个声明中的后半段，47 个 chunk）。按阅读树路径从 `src/services/repoRoots…` 起，主体是：

- `src/tasks/*`（resumeOrphanedTasks、stopTask、taskKinds、taskLoopRegistry、RemoteAgentTask 等）、`src/tools.js`、`src/Tool.js`
- `src/tools/ArtifactTool/**` 整片：`ArtifactTool.js`（`ArtifactToolDefinition` 单体，213 KB）、`actions/*.js`（database、comments、list、listByType、pin、share、uploadAsset、preview、watch、versions、delete、copyFrom、endpoints、readTypeFiles、quickstart、liveEdit、open、roomSend）、`artifactPermissionRules.js`、`permissions/*.js`、`preview/chromeSession.js|launchChrome.js|pageChecks.js|emulatorLook.js`、`publishEdits.js`、`publishFiles.js`、`publishResult.js`、`artifactResumeCarry.js`、`artifactAccessClasses.js`、`artifactAskMessages.js`、`UI.js`、`agentToolUtils.js`、`agentToolDefinition.js`、`AgentTool.js`、`artifactUrls.js`、`constants.js`
- `src/tools/ArtifactTool/preview/*` 的 CDP / Chrome 会话机制

## 前任写到哪里

接手时 `naming/semantic-l10.jsonl`（前半段，下标 0–1492）为 10,502 行；本表不碰它。用 `artifacts/tmp/lead/final5` 重算本半段：**1,384 个声明仍有压缩绑定，合计 6,036 个 `_K` 绑定**（只有 5 个声明本来就没有压缩名）。

## 本次续写

| 项 | 数量 |
|---|---|
| 接手时本半段剩余 `_K` 绑定 | 6,036（分布在 1,389 个声明中的 1,384 个） |
| 本次写入条目 | **6,108 条追加**（219 批 `b001…b219`，全部 `cat 批次 >> naming/semantic-l10x.jsonl`，从未整体重写） |
| 交付前去重 | 72 个同键重复（改名重写 + 两批覆盖同一批声明），按后写生效删到 **6,036 行 / 6,036 个唯一键**；备份 `artifacts/tmp/l10x/semantic-l10x.bak.jsonl` |
| 交付文件 | `naming/semantic-l10x.jsonl`，**6,036 行、47 个 chunk**，与 `final5`/`top.json` 重叠 0 条 |
| `annotate check` | **0 problems，0 suffixed by conflicts** |
| 声明覆盖 | 1,389 个声明中 **1,389 个已无可读压缩名**（合并目录复核 `decls-with-unnamed 0`、`unnamed-occurrences 0`） |
| 跳过 | **0 个绑定**（没有整声明放弃；低置信度 18 条是保留的占位名，见下） |

置信度分布（6,036 条）：0.9 452、0.85 5,449、0.8 113、0.75 4、0.7 8、0.6 1、0.5 9。

## 做法

1. 只看代码用 `node --max-old-space-size=3000 tools/naming/annotate.mjs show analysis/segments/naming-round4c.json 10 <from> <n> artifacts/tmp/l10x/final`；每批 1–30 个声明。
2. **`final5` 只给一个目录、看不到自己已写的名字**是这轮最大的坑：一开始直接传 `artifacts/tmp/lead/final5`，自己的名字不生效、每个声明都像没写过。改成 `artifacts/tmp/l10x/rebuild.sh`（复制 `top.json`/`summary.json`，把 `final5/locals.jsonl` 与本表 `cat` 成 `artifacts/tmp/l10x/final/locals.jsonl`），**每次追加后重建**，再 `show`。
3. 进度不靠清单里的 `unnamed`（会过期）：写 `artifacts/tmp/l10x/list-left.mjs` / `check-left.mjs`，用 `renameModule`+`bindingsOf` 从“最终绑定”重算，先给本表打上名字、其余仍转成 `<min>_K<offset>`，再统计每个声明里还剩多少；`dump-left.mjs <idx…>` 直接打印某声明的键清单和前 12 行压缩源码。
4. 大声明分段处理：`ArtifactToolDefinition`（下标 2307，213,560 字符，455 个绑定）用 `show … 10 2307 1` 导出成 `artifacts/tmp/l10x/p2307c.txt`（9,670 行），再用 `keys-ctx.mjs` 为每个剩余键抓 3 行上下文（`k2307.txt` / `k2307b.txt` / `k2307c.txt`），按主题分批命名，分 16 批（b204–b219）写完。`createChromePreviewSession`（2725）、`readArtifactAsset`（2052）各用一整批。
5. 每批都跑 `check`；出现 `suffixed by conflicts` 时用 `find-conflict.mjs`（后来改名 `conflicts.mjs`）定位——它把本表与合并目录一起喂 `renameModule`，只打印自己键的冲突原因。本轮只中 1 次：`@514226` 的 `hasOpenAction` 与同 chunk 外层 `captures-outer-or-global`，改名 `openActionAvailable`。
6. 交付前去掉重复键（同键后写生效），去掉后 `check` 仍 0 problems、`list-left.mjs` 报 `total decls left: 0`。

## 跳过

- **0 个绑定**。确实无法解读的写成弱语义占位名而不是留空，全部标了低置信度，建议后续复核：
  - `chunk-djnrvf1b.js @354 unused`、`chunk-8wvtd8sr.js @146392 unusedA` / `@146394 unusedB` / `@117992 unused`、`chunk-pgmvyg3g.js @28472 unused`、`chunk-qxvqcab6.js @15590 unused`：形参/解构项只写不读。
  - `chunk-8wvtd8sr.js @159434 reserved`、`chunk-0sfjpx19.js @67272 / @69231 / @71489 reserved`：预留占位，无读取点。
  - `chunk-hantmvxa.js @24446 _args`（剩余参数仅转发）、`chunk-8wvtd8sr.js @385827 utils`（打包残骸命名空间）。
  - `chunk-6vnxsn99.js @71102 task`、`chunk-0h4e7gnq.js @82201 trigger`、`chunk-m79qv8gp.js @1767 text`、`chunk-8wvtd8sr.js @155169 result` / `@155171 leadIn`、`chunk-0sfjpx19.js @52859 agentSendSeqByAgentId`：类型/用途只能从调用点大致推断，取保守名。

## 发现的问题

- **`launchChrome.js` 的 `createChromePreviewSession`（`chunk-8wvtd8sr.js#nh`）对 `Fetch.enable` 连发两次**：`await sendToPage("Fetch.enable", …)` 与 `await cdp.send("Fetch.enable", …)` 用同一组 `{patterns:[{urlPattern:"*"}]}`，第二句是页会话的重复开启（相似写法在 `publishEdits` 里也出现过一次 `close()` 的收尾重复）。像是把“在主 target 上开 Fetch 域”写了两遍，官方行为可核对。
- **`launchChrome.js` 的 `close()` 分支不对称**：`options.broken || cdp.closedBecause || chromeHost.noSandbox()` 走 `runCleanups()+browser.close()`，正常分支只 `Target.disposeBrowserContext`；`finally` 里再装一个 `browser.betweenCalls` 只做 `Fetch.failRequest`，`runCleanups` 与它谁先谁后取决于 `disposeBrowserContext` 是否抛错，`betweenCalls` 的清理时机很容易漏。
- **`uploadAsset.js` 的 `readArtifactAsset`（`chunk-vn5yv2ce.js#BGs`）三条取数路径的标志位互相纠缠**：`runnerDirect`（agent 可直读）、`needsRelay`（走 mount 中继）、`viaMountRelay = needsRelay && !tokenless`、`answeredViaFrame`（frame 直答）四个布尔组合出 4 条分支，`tokenless` 在 relay 分支里还要再判一次 `assetToken === void 0` 抛 internal——同一事实（有没有 token）在 3 处分别判断，改名时只能按各自分支另取名字。
- **`ArtifactTool.js` 的 `ArtifactToolDefinition`（`chunk-8wvtd8sr.js#il`）单声明 213 KB / 455 个压缩绑定**：`show` 一次 9,670 行，`_K` 偏移跨 30 万字符；同一个 chunk 里还有另外两个超过 10 万字符的声明（`#cu` 83,636–94,022、`#Xf` 175,650–179,080），三者的局部名在 final 里按偏移排序会交错，`keys-ctx.mjs` 按“首次出现 3 处”抓上下文时容易落到相邻声明里，必须靠 `id` 输出对齐。
- **`ArtifactTool.js` 里同一概念多套写法**：`targetSlug` / `targetUrl` / `targetName` / `storedUrl` / `storedTarget` / `frameUrl` / `frameEntry` 指同一 artifact 的地址在 6 个分支里各取一名；`publishFilesInput`、`publishRoot.files`、`files` 三个来源在 `hn_K573574` 一处合并，读代码时极容易误以为其中两个是同一变量。
- **`publishFiles.js` 的 `root` 语义分叉**：`expandPath(root)` / `rootWithoutFilesMessage` / `servedPathRoot` 都用 `root`，但前者是“源文件根目录”、后者在 map 形式下是“served 根”，命名上分开成 `rootPath` 与 `servedRootPath` 才能读出区别。
- **`@529741`~`@538876` 一段（`ArtifactTool.js` 后半的权限/声明分支，约 26 个键）在两批里被各命名一次**：后批把 `needsAsk`→`needsAskRule`、`assetPin`→`uploadPin`、`readVerdict`→`pinnedSource`、`openedFile`→`readResult`、`prior`→`pathToCheck`、`stems`→`pinMismatch`、`describeRefusal`→`askCowritten` 等改过一次；交付时按后写去重，没有留下两套名字，但说明这段代码在两轮阅读里语义判断不完全一致，值得复核（尤其 `@532235 hasTargetPin`→`hasPin`、`@533240 readFileResult`→`lockedType` 这两处改名的目标绑定是否真的相同）。
- **`final5` 既有名字里有几处可疑**（按指南不在本表覆盖，仅记录）：`chunk-8wvtd8sr.js#cu` 附近的 `artifactVersionObserved` 返回对象里 `observed` 与 `siblingInFlight` 两个字段来自同一 `Promise.all`，命名看不出谁先谁后；`chunk-vn5yv2ce.js` 里 `getFrameHost().headers` 在外层被展开后又在内层用 `headers && {headers}` 条件挂回，`headers` 在两层各有含义。
