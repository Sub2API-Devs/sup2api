# 第五阶段第四轮（参数/局部）命名：name-l3c（组 3，全段续做）

范围：`analysis/segments/naming-round4c.json` 第 3 项（下标 0 起），共 **1,673 个声明**，`dirs` 首尾 `src/components/MCPServerApprovalDialog.js` … `src/components/StructuredDiff.js`，67 个路径。本成员从下标 0 处理到末尾（与清单 `dirs` 首尾核对一致）。

## 前任写到哪里

接手时 `naming/semantic-l3.jsonl` 已有 **4,948 行**（`annotate check` 0 problems / 0 suffixed）。其中落在本组声明区间内的只有 **2,646 条**，分属 **46 个声明**，且这 46 个声明恰好已被前任全部命名完（其余 4,302 行写在了本组之外，是同文本块中其他组的声明）。因此本组剩余 **1,627 个声明 / 6,148 个压缩绑定**，与清单 `unnamed` 合计完全一致。

## 本次续写

| 项 | 数量 |
|---|---|
| 追加条目 | **6,174 行**（218 个批次文件 `b1…b218`，全部 `cat 批次文件 >> naming/semantic-l3.jsonl` 追加，未改动前任行） |
| 覆盖的声明 | **1,627 / 1,627**（加上前任的 46 个，本组 1,673 个全部覆盖） |
| 命名绑定 | **6,174**，本组内 `_K` 剩 0（另有 1 条 `@9012` 对前任 `window` 语义不准，见"问题"） |
| 最终表 | **11,122 行**、106 个 chunk，`annotate check` **0 problems / 0 suffixed by conflicts** |
| 复核方法 | `artifacts/tmp/lead/final5/locals.jsonl` + `tail -n +4949` 本表拼成 `artifacts/tmp/l3c/final`，`artifacts/tmp/l3c/next.mjs` 按 `bindingsOf` 重算全组 1,673 个声明的剩余 `_K`，迭代到 0 |

置信度分布（6,174 条）：0.85 / 187、0.8 / 3,405、0.75 / 2,117、0.7 / 411、0.6 / 54。0.6–0.7 集中在反射式跑腿变量（`const C = jsx(...)` 的临时元素、`Promise.all` 前的辅助 promise、无上下文的 props 透传参数）。

## 做法

- 每批 1–30 个声明，用自建的 `artifacts/tmp/l3c/{ctx,lines,usage,derive,memo,rules,conflict2}.mjs` 控制输出：`ctx` 打印整段短函数或仅占位行 ±1（带行号），`lines` 每个声明打成 1 行毛坯，`usage` 只打某偏移的全部出现行；`fmt/out.txt` 用于局部 grep。每批写完 `annotate check` + `conflict2` 诊断撞名，再 `cat >>` 追加。
- 大函数逐个声明处理：`RemoteEnvironmentDialog`（两个组件共 29 个绑定）、`sendToProject/SendToProjectDialog`（5 个函数 35 个绑定，全是字符宽度/换行排版）、`Settings/Status`（12）、`stagedSettingsReview`（4 个函数 38）、`Spinner.js` 系列（`useThinkingStatusTimer`/`OCr`/`wn`/`xn`/`SpinnerAnimationRow`/`spinnerStatus` 共 56 个绑定）。
- React Compiler 缓存绑定批量处理：写 `memo.mjs` 识别 `let/var x = w(N)` → `memoCache`（96 条，一批）；`rules.mjs` 按语法规则批量出候选（选择器箭头 `(x)=>x.field` → `state`、`.map((x,i)=>` 第二参 → `index`、`catch(e)` → `error`、`w(N)` → `memoCache`）78 + 30 条；`derive.mjs` 从 `x = jsxProd_default(Comp)` 推 `…Element` 名字，过滤掉与已有同名（含 `_2`）的候选，最终 245 条。每批仍先 `check` 再追加。
- 撞名一律改名，不留 `_2`：典型 `memoCache`→`…Memo`、`handleSelect`→`handleSelectMemo`、`label`→`…Label`、`timestamp`→`…Ts`、`isActive`→`isListActive`、`statusColor`→`statusColorValue`、`children`→`…Children`；累计约 60 处，最终 `0 suffixed by conflicts`。
- 追加后立即重建合并 final 并重算，避免"以为做完了其实没写进去"（前任就是因为不知道剩余量才越做越散）。

## 跳过 / 未命名

- **0 个声明被整段跳过**：1,673 个声明全部覆盖，本组剩余 `_K` 为 0。
- 表内所有名字均为真实语义名；期间写错的 `?` 占位（4 次）和重复键（4 条）已从表中清除，未留在最终表里。
- 没有给 top 级（模块作用域）绑定命名：工具只渲染参数/局部，top 级改名不影响 `show` 输出，按指南范围排除。

## 发现的问题（仅记录，未在本表覆盖）

1. **同偏移在不同声明重复出现**：`chunk-8jypjjdf.js@9012` 在本组声明 `PromptInputFooterSuggestions.js#MDe` 里是 `suggestionWindow(...)` 的返回值，前任命名为 `window`（与本文件里真正的 `window` 全局重名，读起来像浏览器窗口）。本组表里补了一条 `suggestWindow`（引擎按后写覆盖，`check` 0 problems），建议合并时以前者为准。
2. **清单把同一段代码算给两个组**：本组 46 个声明在接手时已被前任写满，而那些行多数落在别的组清单里——`naming-round4c.json` 的声明区间彼此有交叠（`naming-round4c` 与 `round4b` 也是同一批代码的两个切法）。续做时必须以"表里已有名字"为准，不能按清单 `unnamed` 直接开工。
3. **`Spinner.js#wn` 里的 `Et_K22038 = !1`**：常量 `false` 被塞进 memo 依赖链（`It_K22126 = Et_K22038 ? … : …`），实际是编译期残留的 `showLatestTip`-类开关被官方构建永久关掉；命名时按"永远不成立的分支"处理成 `forceSpinnerTip`，与真实语义（从未启用）有偏差。
4. **`SendToProjectDialog.js` 的 `wrapGraphemes` 参数 `l_K18394 = i_K18392`**：默认值引用前一个参数（`maxWidth = width`），但循环里又会被 `Math.max(1, i_K18392)` 重写——默认参数实际无效，读代码容易以为有独立上限。
5. **`RemoteEnvironmentDialog.js` 两份组件同名绑定**：`ce`（选择对话框）与 `de`（展示对话框）里都有 `selectedTarget / selectedTargetSource / environmentsError` 等同义但不同来源的绑定（一份来自 `fetchEnvironmentsAndPools` 结果、一份来自 props），`show` 头部只标路径不标导出名，容易改错一份。已分别用 `selectedTarget`/`currentSelectionElement` 一类名字区分。
6. **`StagedSettingsReview` 的 4 个 renderer 结构完全相同**（`Ot`/`tn`/`on`/`Ro`），只有文案与 `store` 不同（"proposal / file / not accepted / accepted"），参数名在四份之间反复撞名（`count`、`path`、`fileRecord`、`errorMessage`），只能靠声明区分；建议后续重命名时把 renderer 名加进参数名（如 `proposalCount`）。

## 备注

- 只写了 `naming/semantic-l3.jsonl`、本文件、`docs/WORKLOG.md` 一行和 `artifacts/tmp/l3c/`。
- 追加过程中做过几次对**自己新增尾部行**的原地修正（去重 4 条、删除 `?` 占位、改名），前任 4,948 行逐字节保留；唯一对前任行的改动（`@9012` 的 `window`）试过后已还原，改为追加一条 `suggestWindow` 覆盖。
