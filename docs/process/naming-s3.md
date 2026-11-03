# 第五阶段第二波（2a）命名：name-s3（组 2）

## 任务的纠正（协调者指令）

最初的任务给我的是 `analysis/segments/naming-round3.json` 的第 3 项（0-indexed `[3]`）。我照原任务做了一批（约 600 个绑定，草稿在 `artifacts/tmp/s3/n-group3-unused/01–07.txt`，未写入任何交付文件）。中途协调者纠正：

> name-s3: please switch groups now. Your scripts read naming-round3.json[3], but name-s4 has already written 3,177/3,188 entries for group [3]. Group [2] (0-indexed: ink/graphemeCells.js .. QueryEngine.js, 2,786 entries) has nobody on it. Change your scripts to read [2] and name all of group [2] instead, writing to naming/semantic-s3.jsonl and naming/docs-s3.jsonl (don't write anything for group [3]). Note this correction in docs/process/naming-s3.md. Same rules as before.

所以本表**只含第 [2] 组**的命名与说明；第 [3] 组一律不写（已在 `semantic-s4.jsonl`）。切换后 `prep2.mjs` / `build.mjs` 都改为读第 [2] 项，旧稿整批移到 `artifacts/tmp/s3/n-group3-unused/`。

## 范围

第 [2] 组：`dirs` 从 `ink/graphemeCells.js` 到 `QueryEngine.js`，共 **2,786 个顶层绑定 / 2,474 个声明 / 249 个阅读树文件 / 75 个 chunk**。按顶层目录：`plugins/` 2,234（`plugins/functionHooks/**` 1,428、`plugins/bundled/**` 794，其余 `builtinPlugins.js`、`plugins/hooksModules`）、`memdir/` 221、`ink/` 161（含 `ink/termio`）、`query/` 117、`keybindings/` 17、`QueryEngine.js` 13、`main/` 6、`query.js` 6、`interactiveHelpers.js` 4、`native-ts/color-diff` 3、`outputStyles/` 3、`migrations/` 1。内容主要是 2.1.316 新增的函数钩子（VM 边界、分发链、站点规则、$ 接口、worker 宿主、UI 元素与栅格）、内置插件（easel、mermaid、claudeTest、agentsMd、telemetry、tips、diff、claudePlatform 等）、记忆目录（索引/检索/写回）、ink 渲染（终端能力、termio、样式、图像）与查询恢复逻辑。

## 结果

| 项 | 数量 |
|---|---|
| 清单内顶层绑定 | 2,786 |
| 本表命名 | 2,770（覆盖 2,467 个声明） |
| 未写、沿用已有名（不覆盖） | 16 个绑定 / 7 个声明（见下） |
| `naming/semantic-s3.jsonl` | 2,770 条（全部 `source:"semantic"`，2,428 条带 `note`） |
| `naming/docs-s3.jsonl` | 2,470 条说明，覆盖全部 ≥300 字节或导出的声明（`needDoc` 剩 0；7 个整声明未命名的那几个由其他表已有说明） |
| 改名引擎校验 | 74 个 chunk（本表涉及的全部），改名 2,770、冲突 0、拒绝 0 |

置信度：0.9 5 条、0.85 66、0.8 696、0.75 685、0.7 977、0.65 165、0.6 176。

命名风格：函数/变量 lowerCamelCase，类 PascalCase（`HooksError`、`ReloadFailedError`、`SealedPluginError` 等），模块级常量 UPPER_SNAKE_CASE 带单位（`*_MS`、`*_BYTES`、`*_CHARS`、`*_SLOT`、`*_COUNT`），布尔 is/has/should/shouldn't 起始。同一文件里的一组相关常量成体系（如 `STAMP_ENVIRONMENT_SLOT` / `STAMP_CURRENT_CALL_SLOT` / `STAMP_CALLER_STACK_START` / `STAMP_SLOT_COUNT`、`MARKS_*_SLOT` / `MARKS_SLOT_COUNT`）。

## 未写（保留已有名）的 7 个声明

| 声明 | 已有名来源 | 原因 |
|---|---|---|
| `chunk-bzr73sfg.js#uv`（ink/render-node-to-output.js） | `semantic-ink.jsonl` | ink 组已给 `uv`/`cv` 命名 |
| `chunk-wz6vk74d.js#XQ`（ink/termio/ansi.js） | `semantic-ink.jsonl` | 同上（C0/ESC/BEL/分隔符与转义引导码表） |
| `chunk-wz6vk74d.js#gC`（ink/termio/csi.js） | `semantic-ink.jsonl` | 同上（CSI 终结字节表） |
| `chunk-ebxn0psw.js#mrn`（ink/termio/dec.js） | `semantic-ink.jsonl` | 同上（预生成 DEC 模式序列） |
| `chunk-dxdtyerk.js#x`（ink/termio/osc.js） | `semantic-ink.jsonl` | 同上（OSC 引导符与 ST） |
| `chunk-sc72x544.js#g`（plugins/bundled/modsGuide/clawdCooking.js） | `semantic-p6.jsonl` | p6 组已按原导出名 `put` 命名（字符网格写像素） |
| `chunk-sc72x544.js#dt`（同上） | `semantic-p6.jsonl` | p6 组已按原导出名 `POT` 命名（锅的像素画行数组） |

另有 **42 条兄弟绑定**（同一多绑定 `var`/`const` 里已有其他表写过名的项）按“不覆盖他人名”跳过，记录在 `artifacts/tmp/s3/skipped.txt`，例如 `chunk-xfwvhp77.js#gp` 的 `MAX_ENTRYPOINT_LINES`/`MAX_ENTRYPOINT_BYTES`/`MEMORY_FILE_RECALL_BYTES`、`chunk-ha3km179.js#dg` 的 `ug`、`chunk-3s7ydtfd.js#Pl` 的 6 个图表常量、`chunk-e6aww6q8.js#g1r` 的 `h1r`、`chunk-wnbbggnd.js#lie` 的 `okt`、`chunk-ae5g0zb5.js#Hn` 的 `Gt`、`chunk-ae5g0zb5.js#vs` 的 `wl`（全部来自 semantic-ink / s8 / p*/r* 等表）。

## 与其他表的关系

本表键与其他 `semantic-*.jsonl` 的重合全部是“同一绑定被别的表先写”，构建时按 `existing` 跳过、不覆盖。最终 2,786 个绑定中，2,770 由本表命名，16 由其他表命名，合起来 100% 有可读名。

## 发现的放错文件 / 名字配错的声明

范围里包含的文件头、JSDoc 里已标出问题的地方（`声明 id → 应归路径，证据`）：

- `chunk-3s7ydtfd.js#gS`（`describeTables`，`plugins/bundled/easel/readTable.js:1107`）→ 内容是把多张表按 `Math.floor(ln / 表数)` 分预算后拼列摘要，和 `readTable.js` 主题一致，但 JSDoc 写“与 EnterPlanMode 无关（切分错误）”，说明它曾被误配到 EnterPlanMode 一侧的 fingerprint；现在位置正确，问题只在旧版匹配。证据：`var gS=(e)=>e.flatMap(describeTableColumns(...))`。
- `chunk-d4eg9at2.js#yn`（`MAX_VALUES_STDIN_BYTES` / `MAX_OPTION_VALUE_BYTES`，`ink/root.js:125`）→ **应归 `cli/handlers/plugins.js`**。同一 chunk 的 59 个声明都映射到 `cli/handlers/plugins.js`（`plugin configure --values-stdin` 读取与错误文案），这两个常量一个给 `getOptions_2()` 的 stdin 读取上限（报错文案“The input on stdin is over the 256 KB limit.”）、一个给每个 userConfig 选项值的上限（报错“is too long (over 64 KB)”）。`ink/root.js` 文件头已注明“部分声明误归（sandbox-runtime 路径）”。证据：`reconstructed/src/cli/handlers/plugins.js:276` `import { Pn, getOptions_2 } from "../../ink/root.js"`，`getOptions_2` 只被 `pluginConfigureHandler` 调用。
- `chunk-4121qate.js#dd`（`CLASSIFY_MAX_TOKENS`，`plugins/functionHooks/api/operations.js:279`）→ 位置正确（`$.model.classify` 的 `maxTokens`），但旧名 `MAX_MCP_CONNECT_TRIES` 为错配：实际值是 `classifyWithModel()` 里 `maxTokens: dd`（20），与 MCP 连接无关。证据：同文件 L328。
- `chunk-bfnfj4kx.js#dos`（`resolveImportSpec`，`plugins/functionHooks/moduleLoader.js:197`）→ 位置正确；JSDoc“（旧版名配错）”说的是它下一行的 `isDotRelativePath`（旧版名 `resolveCwdReentry`），旧版对齐把两段弄反了。证据：`dos` 是 `[".","..","./","../"].includes(e) ? resolve(dirname(o), e, "index") : resolve(dirname(o), e)`，即解析相对导入。
- `chunk-dxdtyerk.js#V_`（`osc`，`ink/termio/osc.js:40`）→ JSDoc“（误归 deepLink）”属于它上一行的 `KNOWN_TERMINALS`/`VSCODE_FAMILY_TERMINALS`（`ink/terminal.js:183`，终端/IDE 名称集合），旧版把这两个常量归到了 deepLink 一侧；`osc` 本身位置正确。
- `chunk-s61vbvea.js#qL`（`readMemoryDirEntries`，`memdir/memoryScan.js:280`）→ JSDoc“读目录项（名字配错）”属于下一行的 `normalizeSource_3`（递归读目录）；`qL` 本身是“按是否只要普通文件决定归一化读取或递归 readdir”。两条都是记忆扫描的读目录，位置正确，只在名称/说明配对上有历史错位。
- `chunk-yb0ajcmt.js#Ce`（`averageOf`，`plugins/bundled/mermaid/flowchartLayout.js:278`）→ JSDoc“旧版名 percentile 为错配，归错文件”属于下一行的 `requiredCenterGap`（图表布局的最小中心间距）。`averageOf` 是求平均，被谱系布局与图表共用，位置在这次切分里合理，但旧版把它当 Mermaid 专用、且配了 `percentile` 名。
- `chunk-s61vbvea.js#RE`（`judgingResult`，`plugins/functionHooks/dispatch/inputJudging.js:43`）→ JSDoc“（归属疑误：插件函数 hooks）”指向下一行的派发函数；`RE` 自身是 `{raise, among, drawn}` 结果对象，属 `inputJudging.js` 合理。
- `chunk-s61vbvea.js#Qj`/`#wE`（`withPressContext`/`pressIdOf`，`plugins/functionHooks/ui/pressFill.js:72/45`）→ JSDoc“（归属疑误：插件函数 hooks）”指向 `logPressFill`（记录 `plugin_function_hooks_press_fill`）。命名本身正确，但该文件属于 functionHooks 的 ui 子系统，与 `pressFill` 主题一致，无需移动。
- `chunk-1tz177x8.js` 在 `plugins/functionHooks/hostBridge.js` 的声明（`sessionTargetId`/原 `isComputerUseLock`、`normalizePluginHostAction`，hostBridge.js:787/795）→ **应归 computerUse**，文件头与 JSDoc 都标“（误归 computerUse）”。它们不在本组清单（该 chunk 的三个声明属于别的组），仅记录。
- `chunk-4121qate.js#Nrs`（`["press",e,o].join("\0")`，`plugins/functionHooks/ui/elements.js` 中 JSDoc“（误归 computerUse）按 "press"+两个参数拼键”）→ 归属正常（ui 元素的 press 键拼接），错的是旧版归到 computerUse；它不在本组清单，只记录。
- `chunk-4121qate.js#gr`（`SLOW_HOOK_REPORT_INTERVAL_MS`，`plugins/functionHooks/dispatch/chain.js`）与 `#Gt`/`#rfr` 紧邻的 JSDoc“（切分误归 spawnMultiAgent）”属于 `#Cx`（把钩子成员按 hop 合并成执行阶段），三者都不在本组。

未在本组发现需要整体换文件、且本组声明确实错位的项；上面 `chunk-d4eg9at2.js#yn` 是唯一“声明在错文件、且由本表命名”的一例。

## 已知限制

- `plugins/functionHooks/**` 占本组一半以上（1,428 个绑定），其中 worker 心跳戳（stamp）与共享 marks 三个槽位的语义，是按宿主侧 `hooksWorkerHost.js:348-380` 的读取方式反推的（`STAMP_ENVIRONMENT_SLOT` / `STAMP_CURRENT_CALL_SLOT` / `STAMP_CALLER_STACK_START` / `STAMP_SLOT_COUNT`；`MARKS_*`）：写方在 worker 内的内联源码里，未在阅读树内逐处确认，故置信度给 0.6–0.7。
- `plugins/bundled/claudeTest/**` 只有英文文案与运行期探测逻辑作证据，部分常量只能按它在文案/探测里的落点命名（如 `PICTURE_ASK_MIN_GAP_MS`、`TMUX_PANE_ASK_GRACE_MS`）。
- 大量 `var` 多声明里，主绑定被别的表占去时改用 `-` 主行 + `+兄弟名` 的写法；这些绑定的位置/导出信息来自 `analysis/scan/decls.jsonl`，未逐个回读源码。

## 做法与工具（都在 `artifacts/tmp/s3/`）

- `prep.mjs` → `prep2.mjs`：按阅读树文件与声明分组，输出 `work2g2/NN.txt`（每个声明块含源码、本组绑定、兄弟绑定、导出与字节数、需要写说明的标记）。切到第 [2] 组即改 `SEG = 2`。
- `rest.mjs` / `tiny.mjs` / `compact.mjs` / `ids.mjs` / `show.mjs` / `needdoc.mjs` / `todo.mjs`：精简阅读、统计待办、抽取仍需说明的声明。
- `n/*.txt`：命名稿，行格式 `<declId> <Name|-> [置信度] [| 中文说明]`、`+压缩名=Name [置信度]`、`D <declId> <说明>`；01–18 为第 [2] 组，19–20 为给已命名导出/大声明补写说明。
- `build.mjs`：编译成 `naming/semantic-s3.jsonl` 与 `naming/docs-s3.jsonl`；检查名字合法性、与已有 semantic 名/说明的重合（重合则跳过并记 `skipped.txt`）、重复键；`--check` 时逐个 chunk 调 `tools/rename/lib/rename.mjs` 的 `renameModule`，统计 `renamed/conflicts/rejected`。
- `fixup.mjs`、`fixnames.mjs`、`ren2.mjs`、`rename2.mjs`：批量修主行兄弟绑定不在本组、同作用域重名、引擎自动加的 `_2` 后缀，以及成批改名。
- `weakdocs.json` / `docfix-list.txt` / `docs-audit.txt`：列出 ≥300 字节或已导出但说明过短/无中文的声明，用于批量补说明。
