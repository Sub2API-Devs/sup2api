# 第五阶段第四轮（参数/局部）命名：name-l13c（组 13，续做）

范围：`analysis/segments/naming-round4c.json` 第 13 项（下标 0–316，共 317 个声明），清单 `dirs` 首尾为 `src/utils/fileRead.js` … `src/utils/imageWebp.js`，实际是 `src/utils/` 里 `forkSourceNote` 之后到 `imageWebp` 的字母序：

- `fsAnchor/`（treeAnchor、win32Anchor、win32Nt）、`fsBoundRead`、`fsSafety/atomicWriteStaging`、`fsWatchProbe`、`fullscreen`
- `git*`（git、git/builderGit/gitDirIdentity、gitConfigFilters、gitFilesystem、gitIndexReader、gitLanes、git/worktreeRemoval、gitDiff、github/ghApi）、`ghPrStatus`
- `hooks.js`、`hooks/` 整片：`deviceHooks/*`（commandReach、consent、deviceHookSession、runDeviceHook、shellReader、vouching）、`editHook`、`functionHookMatchers`、`hookCommandAnalysis`、`hooksSettings`、`matcherGrammar`、`servedHooks/*`（destructiveCommands、hookPins、hookSandbox、hostPaths、notices、runServedHook）、`sessionHooks`、`ssrfGuard`、`terminalSequence`、`worktreeHooks`
- `hostAgentPolicy`、`hostCredsFile`、`hostEnvironment`、`hostnameMatching`、`hostScoped`、`hostSessionsBearer`、`hostSuppliedKey`、`hoverRest`
- `http`、`hyperlink`、`ide`、`identity`、`idePathConversion`、`idleTimeout`、`ignorePatterns`
- `imageErrors`、`imageFormats`、`imagePaste`、`imageResizer`、`imageStore`、`imageValidation`、`imageWebp`

## 前任写到哪里

接手时 `naming/semantic-l13.jsonl` 为 **10,204 行、97 个 chunk，`annotate check` 0 problems**（文件时间 21:38）。用 `artifacts/tmp/lead/final5` 重算：组内 317 个声明里还有 **235 个声明、880 个绑定**显示为 `_K<偏移>`。

## 本次续写

| 项 | 数量 |
|---|---|
| 接手时行数 | 10,204（全部保留，未重写） |
| 本次追加条目 | **874**（分批 `cat 批次 >> 目标` 追加） |
| 最终行数 | 11,078 |
| 覆盖的声明 | 234 个（`todo.json` 里 235 个，剩 1 个只含死变量，见“跳过”） |
| `annotate check` | **0 problems**（全表 121 个 chunk） |
| 我新增行导致的重名 `_2` | 已全部消除（见下） |

置信度分布（本次 874 条）：0.85 163、0.8 578、0.75 89、0.7 35、0.65 4、0.6 4、0.55 1。低档主要是：React Compiler 缓存槽、只有字符串字面量的局部、同名参数在多层闭包里只能按调用点判断。

## 做法

1. 先写 `artifacts/tmp/l13c/scan.mjs`，复刻 `annotate show` 的计数逻辑（final5 + 本表合并、`bindingsOf` 过滤），把“组内仍剩压缩名的声明”落成 `todo.json`，避免对 317 个声明盲扫。
2. 写 `artifacts/tmp/l13c/render.mjs`（复刻 `show`，支持一次渲染多个下标到一个文件），每批 10–30 个声明渲染到 `bN.txt` 再读，控制上下文。
3. 每批写一个 `batchN.jsonl`，先 `annotate check` 再 `cat >> naming/semantic-l13.jsonl`，共 23 批。
4. 额外写 `conf2.mjs` / `mine-conf2.mjs`：按 check 相同的 rename 流程只列出“我新增的键”引发的 `_2` 冲突，逐条改成更具体的名字。本批共撞名 6 处并已改：`stagingPromise`→`previousStaging`、`skippedDirs`→`pendingRemovals`、`probeEntry`→`newProbeEntry`、`relation`→`workspaceRelation`、`spellings`→`computedSpellings`、`ext`→`extension`。
5. 全表复核：`annotate check` → 0 problems；`scan.mjs` 重算剩余 → 只剩 1 个声明的 6 个死变量。

## 跳过

- **6 个绑定**：`chunk-p5msxby3.js` @3368/@3377/@3386/@3395/@3404/@3409（`function anchorOver` 开头 `d=void 0,h=void 0,O=void 0,v=void 0,G=!1,Z=!1`）。逐字正则确认这 6 个名字在声明范围内**各只出现 1 次（就是声明本身）**，从未被读取——打包时被删掉的功能分支留下的死变量。按指南“看不出用途的宁可不命名”，跳过。
- 没有整段放弃的声明；`unnamed=1` 的小声明（多数是 `filter(x => ...)` 回调、`getter`）也都读了。

## 发现的问题（未在本表覆盖，仅记录）

1. **重复逻辑缺陷（上游遗留）**：`src/utils/imagePaste.js` 的 `getClipboardCommands`（`chunk-n770a3wm.js#D`）最后一行 `return { commands: commands.linux || commands.linux, screenshotPath: linux }` —— 三元退化成同一分支，darwin/win32 两张命令表构造完从不返回；同处还有一个声明后从未使用的 `c=""`。看起来是压缩/裁剪时丢掉的条件，真实客户端在 mac 上也会走 linux 命令表。
2. **死开关**：`src/utils/imageResizer.js` 的 `imageDecodingOff`（`chunk-mvvq2nx1.js` @5354，`var Me=!1`）在本 chunk 里只有初始化为 `!1`、从未被赋 `!0`；`isImageDecodingDisabled = imageDecodingOff || !isDisklessMode()` 的主分支实际由 `!isDisklessMode()` 决定，`loadImageDecoder_2` 开头的 `!isImageDecodingDisabled()` 等于“在 claude-code-server（diskless）会话里返回拒绝桩”，逻辑本身自洽，但 `imageDecodingOff` 这个名字容易让人以为有开关可改。
3. **一个 chunk 跨大量阅读树文件**：`chunk-e6aww6q8.js` 在这一组里同时承载 `hooks/servedHooks/*`、`ssrfGuard`、`terminalSequence`、`ide.js`、`hookSandbox` 等多个阅读树文件；按阅读树路径检索只能看到片段，审核时按 `file`（chunk）+ 偏移定位更稳。
4. **既有名字与形态不符**：`chunk-e6aww6q8.js` 里 `stageDeviceHooks` 的 `Ee`（我命名为 `ensureStagingDir`）实际是个自愈重试的 **async 函数**，第一次读很容易当成变量；同类还有 `rethrowUnlessExhaustion`（`chunk-e6aww6q8.js#e4s` 内的 `Ie`）既是“重抛”又被当 `catch` 映射器用，语义偏窄。
5. **`_2` 后缀集中**：`chunk-e6aww6q8.js`、`chunk-mvvq2nx1.js` 里大量 `xxx_2/_3`（如 `filtered_2`、`hook_2`）是引擎对同作用域重名的兜底；这次能避的都避开了，但前任留下的仍在，后续若要清理需整文件视角统一。
6. **同名不同义**：`hostPaths.js` 的 `hostPathDeps`（`chunk-e6aww6q8.js#FAo`）把 `getSettingsFilePathForSource`、`settingsReachRootsForSource`、`collectSettingsWriteRoots` 三个不同签名都收进同一个 deps 对象，参数名只能按 `settingSource` 统一，读时容易误判哪个多了一个 `launchDir` 参数。

## 产物（均在 `artifacts/tmp/l13c/`，不改 final5）

- `scan.mjs` / `todo.json`：重算组内剩余压缩名的声明清单
- `render.mjs`：批量渲染指定下标声明（已应用 final5 + 本表）
- `conf.mjs` / `conf2.mjs` / `mine-conf2.mjs`：定位本表引发（或全量）的 `_2` 冲突
- `b1..b23.txt`：每批渲染原文；`batch1..batch23.jsonl`：每批命名条目
- `mine-add.jsonl`：本次追加的 874 条；`prev-part.jsonl`：接手时的 10,204 行快照（用于核对前缀未被改动，md5 一致）
