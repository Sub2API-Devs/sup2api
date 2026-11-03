# 第 5 组（naming-round4c 下标 5）前半段 0–1262：参数/局部变量命名

## 交接状态

- 接手时 `naming/semantic-l5.jsonl` 已有 **5,546 行**（前任成员写到 naming-round4c 第 5 组前段，`check` 0 problems）。前任没有留下 `docs/process/naming-l5.md` 和 WORKLOG 行。
- 清单 `analysis/segments/naming-round4c.json` 的 `[5]`：2,706 个声明、11,607 个压缩绑定；本成员的范围是 `decls[0..1262]`（1,263 个声明，原文 `unnamed` 合计 5,805），后半段 1263–2705 由另一成员做。

## 本次续写

- 用 `artifacts/tmp/lead/final5` + 本表合并，按 final5 重算后本范围内实际还剩 **5,663 个绑定**（前任已写掉一部分，`unnamed` 已重算）。
- 分 70 余批、每批 30–170 个绑定写入，**追加 5,663 条**到 `naming/semantic-l5.jsonl`（全程 `cat 批次文件 >>` 追加，未整体重写；文件 5,546 → 11,209 行）。
- 最终 `check`：`11209 lines, 36 chunks, 0 problems, 4 suffixed by conflicts`。本范围内剩余 `_K` 偏移 **0**。
- 为了让"同一作用域同名"基本消失，把本表里 177 个以下划线结尾的占位名（`module_`、`value_`、`frame_` …）统一改成序数前缀（`secondModule`、`thirdValue`…），随后按引擎的 `conflicts` 结果迭代修正 3 轮，共改名 101 条；现在本表引起的 `_2` 撞名只剩 4 条，全部来自前任的行（`chunk-bss4k1z9.js` 的 `recentNotes`、`previous`、`aboutShown`、`acceptLine`），按规则没有去改。
- 中途有两个绑定（`chunk-wyqg6m3h.js@48139`、`@48284`，`drawWindow` 里的 `hunkSegment`/`sliceWindow` 参数）第一次漏掉，复核覆盖时补上。

## 跳过

- 没有跳过的绑定：本范围 5,663 个压缩绑定全部命名，复核 `mkplan` 显示 `decls remaining 0 names 0`。
- 曾写过 3 行无效 key（`@164876`、`@4147545`、`@4147545` 附近）被 `check` 拒绝后立即删除，未留在表里。

## 发现的问题（未在本表覆盖，只记录）

1. **已有名字不准（不动，记录）**
   - `src/memdir/memoryIndex.js`：`fieldBoostFactor` 实际算的是 BM25 的 IDF `log((N - df + 0.5) / (df + 0.5))`；`BM25_K1 = 0.7` 与 `bm25Search.k1 = 1.2` 同时存在；`MAX_TERM_KEY_CHARS = 16` 被 `dropDocuments` 当"少量/大量删除"的阈值用，和名字无关。
   - 同文件 `stemWord` 实际做的是"双辅音 + 结尾 l 去重"，`measureWord` 才是波特词干化主流程，名字与内容颠倒。
   - `src/plugins/functionHooks/hooksModuleLoader.js`：`describeHooksModuleState` 名字像"描述状态"，实际是**加载并登记**一个 hooks 模块、返回模块记录（`enter/leave/dispatch/discard/retire`）；`validateHooksModuleExports` 也不是校验导出而是**组装运行期**（invoke/iterate/stream 等）。
   - `src/plugins/functionHooks/api/register.js`：`passThroughFn`、`identityResult`、`identityValue` 一类恒等函数散布多个文件，容易误读。
2. **疑似死代码 / 退化逻辑**
   - `src/memdir/memoryWriteLint.js#lintMemoryWrite`：函数体只有 `let vscodeClient = getCliOwnedState().vscodeClient; return;`，三个参数都没用（本次仍按其位置命名为 `payload/opts/ctx`，置信度 0.6）。
   - `src/plugins/functionHooks/eventPayloads.js#EVENT_PAYLOAD_SHAPES`：约 35 个事件处理器都是 `(e) => e` 恒等，只有 `tool.call` 补 `tool_use_id`、`telemetry.log` 走 `defaultRoute`、`skill.prompt` 走 `normalizeSkillPromptPayload`。
3. **本地变量与全局常量撞名**
   - `src/memdir/memdir.js` 的 `buildMemoryDirectoryLine` 里压缩绑定被 reference 命名为 `CLAUDE_COWORK_MEMORY_EXTRA_GUIDELINES`，与同名常量遮蔽，读起来容易误判。
4. **跨 chunk 的同名声明**
   - `src/plugins/functionHooks/hostBridge.js` 的声明分散在 `chunk-pwe88xvs.js` 与 `chunk-1tz177x8.js` 两个 chunk；`sessionAppend.js` 在 `chunk-3xb70ww4.js`，`apiDispatch.js` 在 `chunk-e6aww6q8.js` 与 `chunk-pwe88xvs.js`。按 chunk 找声明容易漏。

## 交付

- `naming/semantic-l5.jsonl`：11,209 行，`check` 0 problems。
- 批次文件与临时脚本在 `artifacts/tmp/l5c/`（`t*.txt` 输入、`b*.jsonl` 输出、`emit.cjs`、`mkplan.mjs`、`short.mjs`、`coverage.mjs` 等）。
- 未 commit、未跑 pipeline、未派生子代理。
