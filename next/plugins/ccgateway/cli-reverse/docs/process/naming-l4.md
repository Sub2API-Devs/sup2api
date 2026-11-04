# name-l4b：第 4 组续做（naming-round4b[4]，918 个声明）

## 前任写到哪里（接手状态）

- 清单：`analysis/segments/naming-round4b.json` 的 `[4]`，共 **918 个声明**、6,063 个压缩绑定，`dirs` 首尾 `src/components/StructuredDiff` … `src/main.js`。
- 名字表：`naming/semantic-l4.jsonl`，接手时 **5,693 个唯一键（5,694 行，1 行重复键 `chunk-18hwfzwa.js@1688892`）**，`check` 0 problems、46 suffixed。
- 用 `artifacts/tmp/lead/final4` 合并本表重算，接手时该组仍有约 6,063 个 `_K` 绑定未命名（前任中止在 `main.js` 一带）。

## 本次续写

- 新增 **5,730 个 (file,key)**（净增 5,729 行：前任那行重复键只剩一条）。批次文件 52 个（`artifacts/tmp/l4/names-b0xx.jsonl`，每批 5–120 个声明），一律 Write 写好再用 `cat 批次 >> naming/semantic-l4.jsonl` 追加；最终 **11,423 行 / 197 个 chunk**，无重复键。
- `node --max-old-space-size=3000 tools/naming/annotate.mjs check naming/semantic-l4.jsonl`：**11,423 lines, 197 chunks, 0 problems, 102 suffixed by conflicts**（其中 46 处属前任既有行，本表新增行引起 **56** 处）。
- 覆盖范围（新增行数前几）：`chunk-18hwfzwa.js` 1,248、`chunk-bzr73sfg.js` 938、`chunk-shkzs7rp.js` 327、`chunk-axsvbsqv.js` 308、`chunk-vrr64ez0.js` 294、`chunk-ss669z1x.js` 282、`chunk-xx1vmpsq.js` 196、`chunk-x6v6jz2y.js` 189、`chunk-tw8fk0yz.js` 189、`chunk-ag5x7vhf.js` 119、`chunk-e6aww6q8.js` 115、`chunk-530hfzwb.js` 115。
- 合并 `artifacts/tmp/lead/final4` + 本表重算（`artifacts/tmp/l4/final`）：**第 4 组 918 个声明剩余 `_K` 为 0**（`show … 4 0/200/400/600/800 200` 五次，全部报 `0 unnamed`，并单独核了 900–917 这 18 个 `main.js` 声明）。
- 大件：`engine/queryEngine` 的 `createQueryEngine`（176 个绑定）、`hooks/useReplBridge` 的 `wvt`（294）、`hooks/useRemoteSession` 的 `MUe`（247）、`main.js` 的 `run`（79）、`buildCliProgram`（48）、`runPreparedHeadless`（54）、`runInteractiveSession`（190 → 0）、`runOnboardingAndSetupScreens`、`logTenguInit`；`ink/*` 整片（components/dom/events/graphemeCells/layout/output/render-*/screen/search/selection/…）；`keybindings/*`；`daemon/*`。

## 撞名与改名

- 全部 `_2` 后缀都用自写脚本 `artifacts/tmp/l4/conflict.mjs` 逐个取出，按原因分成 `same-scope` 与 `captures-outer-or-global` 两类。能改好的都改成更具体的名字（如 `style`→`currentStyle` 思路，`refused`→`refusedOptions`）；剩下 56 处集中在几个上千行的大组件里（`chunk-bzr73sfg.js` 的 render/layout 系列、`chunk-shkzs7rp.js#_i`），同一函数内确实有两个不同层级的同名概念，再拆只会让名字更失真，保持引擎加 `_2`。
- 清掉了 13 条踩全局名的行：`process`（`chunk-ss669z1x.js` 的 bgDispatch，9 处）改为 `processes`/`workerProcess`，`window`→`bridgeWindow`，`set`→`pendingSet`/`entriesA`，`$`→`memoCache`。
- 撤回 2 条误改前任的行（`chunk-bzr73sfg.js@257386`、`chunk-xe7zq1p4.js@11066`），已恢复前任原名；另有 1 行写到不存在的 `chunk-ag5xvhf-x.js`，已删。

## 跳过的

- 最终没有剩余未命名绑定，跳过的只有**「给名但不算真看懂」**的：36 个 `unused*` / `flagA-C` / 看不出用途的 `placeholder*` 类占位名，对应打包残留的死变量（只赋值不读、或读取结果直接丢弃）。它们确实看不出业务用途，给占位名是为了满足「不留 `_K`」，置信度压到 0.6–0.65。
- 前任已命名的绑定一律不覆盖；同一 (file,key) 不重复写。

## 发现的问题（未在本表覆盖，只记录）

1. **文件名与内容不符**：`src/ink/line-width-cache.js` 里实际是终端输入读取器（`createInputReaderState`/`feedInputReader`/`flushInputReader`，见 reconstructed 版本），只有末尾一个 `lineWidth` 与文件名相关；`ink/render-to-screen-reader.js` 里同时塞了 `truncateStyledText`/`sanitizeForScreenReader`。后续按路径找代码会走错。
2. **`main.js#_i`（runInteractiveSession）里有整段死代码**：`let turnUploaderModule = null, flagD = !1`，于是 `turnUploader` 与 `turnUploaderV2` 恒为 `null`，`uploadOptions.onTurnComplete`/`onCaptureSnapshot` 永远不会被装上——turn 上传链路在这版构建里是死的（`flagD` 我按位置命名为 `flagD`）。同一函数里远程创建的 `appendSystemPrompt: [null, null].filter(...).join(...)` 恒为空串。
3. **`dialogLaunchers` 一带的 `noWorkflowFooter(collected, props)` 永远 `return null`**，是无用桩；`chunk-530hfzwb.js#M_o`（useVimInput）末尾还有 1 个只声明不使用、`&&` 短路掉的标志位。
4. **同名概念多版本残留**：`hasCursorUpViewportYankBug` 在本组出现两份（其中一份连类名都被引擎加了 `_2`），`primeWindowsProfileDirs` 等多处「探测一次只开一个开关」的 profile 代码在改造后留下前后两版；`useReplBridge` 里 `unsupportedKinds`/`supportedKinds` 的用法与名字相反，`useRemoteSession` 里若干 `has*` 实际存的是字符串/对象——这两处是前任既有名字，按规则未覆盖。
5. **同一组件内同名冲突密集**：React Compiler 产物里 memo cache 与同名临时变量反复出现，整表统计同一声明内重名 768 处（大部分是 `$[n]` 缓存与各层 `task`/`delta`/`index`），引擎会自动加 `_2`/`_3`，读代码时要靠位置区分。
6. **跨 chunk 的同一文件**：`main.js` 的声明散在 `chunk-shkzs7rp.js`、`chunk-cjydagjy.js`、`chunk-3wek6r2k.js` 三个 chunk 里，`keybindings/*` 同样分散；按声明 id 找文件时要先看 `file` 字段，不能按 chunk 归属推断模块。

## 交付

- `naming/semantic-l4.jsonl`（11,423 行，check 0 problems）
- `docs/process/naming-l4.md`（本文）
- `docs/WORKLOG.md` 一行
- 草稿与批次文件留在 `artifacts/tmp/l4/`（`final/`、`names-b0xx.jsonl`、`rem*.txt`、`conflict.mjs`）
