# doc-sync：子系统手册引用同步

角色：doc-sync。对象：`docs/handbook/*.md` 十本手册。目标：让手册里的代码引用（路径、名字、声明 id、字面量）与当前阅读树 `reconstructed/` 一致，只改引用，不改结论与结构。

时间：2026-11-03 11:20–12:40（本地时间）。校验对象：`reconstructed/` 提交 5a1c926（"final reading tree"）之后的工作区。

## 1. 结果

校验脚本：`node --max-old-space-size=8000 tools/verify/doc-refs.mjs . docs/handbook/<x>.md`。"检查数"是脚本统计到的引用总数（改写后部分引用被拆开或补了声明 id，所以检查数变多）；"只在 2.1.88"是脚本标 OLD 的项，属预期，保留。

| 手册 | 修正前 检查 / 失效 | 修正后 检查 / 失效 | 修正后只在 2.1.88 |
|---|---|---|---|
| agents.md | 1347 / 52 | 1375 / 0 | 10 |
| bootstrap.md | 493 / 45 | 525 / 0 | 2 |
| commands.md | 324 / 40 | 443 / 0 | 2 |
| extensions.md | 2086 / 63 | 2130 / 1 | 14 |
| ink.md | 691 / 28 | 722 / 0 | 5 |
| permissions.md | 1083 / 88 | 1174 / 0 | 9 |
| query.md | 2839 / 103 | 2969 / 0 | 16 |
| state.md | 787 / 38 | 835 / 0 | 4 |
| tools.md | 2409 / 130 | 2559 / 0 | 16 |
| ui.md | 845 / 24 | 909 / 0 | 11 |
| 合计 | 12,904 / 611 | 13,641 / 1 | |

extensions.md 剩下的 1 处是误报：第 44 行代码块里的 `server/discover` 是 JSON-RPC 方法名，脚本在代码块里把带斜杠的词一律按路径检查。已在该代码块后加一行注说明，没有改图。

每本手册末尾新增"N. 引用校验结果"一节（编号接在原最后一节之后），用 `APPEND=1` 写入。

## 2. 做法

### 2.1 工具（`artifacts/tmp/docsync/`，只读辅助，可复现）

| 脚本 | 作用 |
|---|---|
| `lk.mjs` | 查询：`min <压缩名>`（`naming/final/top.json` 里该压缩名在各 chunk 的最终名与声明位置）、`old <旧名>`（在全部命名表里找曾用名，再映射到当前名）、`id <声明 id>`、`name`、`re`、`at <chunk> <偏移>`（按 `//@` 出处行找包含某字节偏移的声明） |
| `mins.mjs` | 批量查压缩名，优先列出指定 chunk（手册上下文所在 chunk）的绑定；import 绑定也显示其导入名 |
| `ctx.mjs` | 把校验脚本的 FAIL 行配上手册原文上下文 |
| `apply.mjs` | 按 `行号<TAB>旧<TAB>新` 表做行内替换；任一行不匹配就整本不写；行号 0 表示全文替换 |
| `pairs.mjs` | 自动改写 "`压缩名`（可读名）"、"`可读名`（`压缩名`）"、"`压缩名` 可读名"、"*可读名*（`压缩名`）" 几种写法：只有当 symbols.jsonl 中恰有一个声明满足"名字 = 可读名且 id 尾 = 压缩名"时才改成 "`可读名`（`chunk-xxx.js#压缩名`）"，否则不动 |
| `ids.mjs` | 规范声明 id：`chunk-x#y`、`x#y` 补成 `chunk-x.js#y`；`chunk-x.js#A/#B` 拆成 `chunk-x.js#A`/`chunk-x.js#B`；只改 symbols.jsonl 里存在的 id |
| `stale.mjs` | 补充检查：反引号里形如压缩名（2–4 字符、大小写混合）却不是当前任何符号名的词。校验脚本会因为子串命中而放过它们（例如 `Z3s` 是某个更长名字的子串），这类是"名字已改但脚本测不出"的失效 |
| `paths.mjs`、`pathfn.mjs`、`pathfn2.mjs` | 补充检查：反引号里的文件路径是否存在；"路径 · 函数名"（脚本对含空格的引用不检查）中的函数是否在该文件 |
| `chk.mjs` | 用与校验脚本相同的规则检查单个词（缓存语料到 `corpus.cache`） |

所有替换表都留在该目录（`edits-*.tsv`），修改前的手册副本在 `artifacts/tmp/docsync/orig/`。

### 2.2 顺序

1. 跑基线（`before.txt`，611 处失效：字面量 322、名字 160、路径 90、声明 id 39）。
2. 逐本按 FAIL 清单人工核对：对每个压缩名或旧名，先在手册上下文所在的 chunk 里查（同一个压缩名在不同 chunk 指不同东西，例如 `NI` 在 REPL chunk 是 `useRenderMode` 的导入，在 config chunk 是 `isCwdHomeOrConfigDir`），再读阅读树对应代码确认行为与手册描述一致，然后写替换表。
3. 跑三个自动步骤：`pairs.mjs`（123 处）、`ids.mjs`（87 处）、把 `reconstructed/src/...ts(x)` 改为实际存在的 `.js`。
4. 补充检查（`stale.mjs`、`paths.mjs`、`pathfn*.mjs`）找脚本测不出的失效，再修一轮。
5. `APPEND=1` 写入各手册的校验结果节。

## 3. 典型改动

- **压缩名 → 当前名（声明 id）**：手册里大量用压缩名指函数，第四阶段命名后它们都有了语义名或门面名。例：`Z3s`（buildBuiltinCommandTable）→ `buildBuiltinCommandTable`（`chunk-e6aww6q8.js#Z3s`）；`ZAe` → `DIALOG_REGISTRY`（`chunk-18hwfzwa.js#ZAe`）；`dJn/Tjo/HTe` → `triggerReactiveCompact`/`tryReactiveCompact`/`runReactiveCompact`。导入绑定按导入名改（`Od(model)` → `getProviderForModel(model)`）。
- **旧名 → 新名**：命名轮次改过的名字。例：`getHighestSourceForKey` → `getEffectiveSettingSource_2`（`chunk-q8cqcff6.js#pI`）；`extractParentManagedSlice` → `keepRestrictiveFromParent`；`ENTRY_WRITE_POLICY` → `ENTRY_APPEND_POLICY`；`StyleAtlasRecorder` → `StylePoolMonitor`；`isProtectedSystemPath` → `isDangerousRemovalPath`（门面名）；`resolveModelSetting`/`parseUserSpecifiedModel` 两个名字在命名中互换了位置，手册改成"`parseUserSpecifiedModel`（`#Ut`，写作时称 resolveModelSetting）→ `resolveModelAliasSetting`（`#fG`）"。
- **临时路径 → 正式路径**：`_unattributed/chunk-x/part-NNN.js`、顶层 `_new/<名>`（`_new/decideWithToolCheckHooks` → `utils/permissions/permissions.ts`，`_new/exec` → `utils/Shell.ts`，`_new/INLINE_CODE_FLAGS` → `types/permissions.ts`，`_new/SandboxManager` → `utils/sandbox/sandbox-adapter.ts`，`_new/extractOutputRedirections` → `utils/bash/commands.ts`）。说法上保留"写作时在 _unattributed"的历史，加上现在的位置，不删原结论。commands.md 第 6 节表格里 40 处 `_u/NNN` 简写全部按命令对象的 `name:` 定位改成 `commands/` 下的正式路径。
- **声明 id 失效**：多声明符 `var` 语句里的附属绑定没有自己的 id（例如 `chunk-kxyd0g16.js#NEo` 是 `TOOL_POOL_MEMO_TTL_MS`，实际在 `chunk-kxyd0g16.js#Z$` 语句内）；工具对象的 id 变了（`chunk-kxyd0g16.js#fo` → BriefTool `chunk-kxyd0g16.js#cs`，Cron 三件套、EnterPlanMode、EnterWorktree、ReadMcpResource 同理）；`chunk-x#y` 缺 `.js` 的写法补全。
- **字面量写法**：与代码对齐。花括号或方括号缩写展开（`CLAUDE_CODE_USE_{BEDROCK,VERTEX,…}` → 逐个列出，展开前先确认每个名字都在代码里）；`key=value` 写法改成代码里的形状或拆开（`ENABLE_TOOL_SEARCH=force` → `ENABLE_TOOL_SEARCH`=`force`）；`Class.method` 写法在类方法不是静态成员时改成"`Class` 的 `method`"；转义序列改成常量名（`ESC[I` → `FOCUS_IN`（`csi("I")`））；可选字段的 `?` 移到反引号外；`cells[2i]` 改成代码里的 `cells[2 * g]`。
- **2.1.88 的 `.ts` 路径**：手册约定 `.ts`/`.tsx` 对应阅读树同路径 `.js`，已能解析的不动；`reconstructed/src/xxx.ts` 这种写全路径的改成实际的 `.js`；`build/readable/src/` 统一改为 `reconstructed/src/`（阅读树现在在 `reconstructed/`）。

## 4. 加了"待核实"的地方

这些是改引用时发现手册描述与当前名字或代码对不上的，按要求只加注，不改结论：

- extensions.md 2.x：`sdk/sse-ide/ws-ide` 只能由宿主注册的判定原记名 `isHostOnlyTransport`，当前阅读树无此名，未重新定位。
- query.md：`#k6n` 与 `chunk-a76knw89.js#Uri` 现在都叫 `countToolCallsSince`（旧版匹配名），与"reminderFold 的数组级 smoosh"等行为不符；onError 兜底链中的 `$gt`、`Hgt`、`OLe` 是写作时的压缩名，当前 `queryModel` 的 onError 里已无同名绑定。
- state.md：`artifact…ConsentSlugs` 手册写"约 25 个"，阅读树能找到的不同键名是 14 个；`chunk-hwmsct5x` part-008（多 store 记忆同步）的去向未查明，当前 `services/memorySync/` 只含 `chunk-s61vbvea` 与 `chunk-82kqcve8`。
- tools.md：`getToolSearchLatch` 在阅读树里找不到（门闩疑在 `resolveDeclaredToolSet` 的 `latch` 参数一带）；`chunk-82kqcve8.js#$a` 现名 `RemoteFileState`，与手册"FileStateCache 缓存类"的描述不一致（两处）；`chunk-e6aww6q8.js#HWt` 现名 `consumeClaudeCodeHints`，与"读后台任务输出时处理"的描述不符。
- 另有几处在正文里注明"当前语义名与行为不符"而未标待核实：ui.md 的 `useAwaySummaryOnce`（`chunk-18hwfzwa.js#VEe`，实为文件历史快照初始化）、`useStartupNotifications`（`#jEe`，返回空闲阈值）；query.md 的 `prependAttributionHeader` 被放在 `utils/model/modelAccessCheck.ts`（位置可疑）。

## 5. 遗留问题

1. **permissions.md 正文重复**：第 1–9 节在文件里出现了两遍（第 7–558 行与第 559–1128 行），第一份末尾第 553 行在句子中间被插入了文件标题 `# 权限、Shell 与沙箱子系统手册…`。这是写作阶段的拼接错误，属于结构问题，本轮按"不改结构"没有动，两份里的引用都已同步修正。建议 dom-permissions 或 lead 删除第 7–558 行（第一份正文、第 553 行的残句和随后重复的文件头），保留第 559 行起的完整版本。
2. **校验脚本的盲区**：脚本对名字和字面量用"在语料里出现即通过"的子串规则，所以 `Z3s`、`hkr` 这类已改名的压缩名会因为碰巧是别的标识符的子串而通过。本轮用 `stale.mjs` 补查，剩 3 个都是合理用法（`_SEQ` 是环境变量后缀缩写，`$VAR` 是插值语法，`OLe` 已加待核实）。对含空格的引用（包括"`路径 · 名字`"写在一个反引号里）脚本不检查，本轮用 `pathfn.mjs` 补查后已全部可解析。
3. **非代码路径**：`paths.mjs` 报出的未存在路径都是运行时文件或相对写法（`.claude/settings.json`、`.claude-plugin/plugin.json`、`state/settings-review.json`、`jobs/`、ui.md 里相对 `components/` 的 `Spinner/*` 等），不是阅读树引用，没有改。
4. **2.1.88 项**：保留的 OLD 项（如 `contextModifier`、`tengu_sm_compact*`、`utils/computerUse/appNames.ts`、`validateIncompleteCommands`）是手册有意对比的删除项或旧名。
5. **名字会继续变**：WORKLOG 显示第五阶段"全项目人类易读"已启动，会再次改名（尤其仍为压缩名的 `Tp`、`Fl`、`Mze`、`Nke`、`FEe`、`qCe`、`Xn` 等）。本轮在改写时尽量同时写出声明 id，下次同步可以直接用 id 查。重新生成 `reconstructed/` 后再跑一次 `tools/verify/doc-refs.mjs` 与 `artifacts/tmp/docsync/stale.mjs` 即可发现新的失效。
6. **未逐项细读的大段**：commands.md 第 6 节表格的"实现"列（chunk 名）和各手册的"实测"段落没有逐条对照代码，只核对了脚本能检查到的引用。
