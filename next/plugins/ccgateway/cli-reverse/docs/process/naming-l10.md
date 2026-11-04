# 第五阶段第四轮（参数/局部）命名：name-l10c（组 10 前半段续做）

范围：`analysis/segments/naming-round4c.json` 第 10 项，**声明下标 0 到 1492**（共 2,882 个声明的前半段；后半段 1493+ 归 name-l10x，写 `naming/semantic-l10x.jsonl`）。路径从 `src/services/repoRoots` 起到 `src/tools/ArtifactTool` 之前，主体是：

- `src/services/selfHostedRunner/**`（governedGit、handleSession、launcherHooks、selfHostedRunner 主函数）
- `src/services/sessionStatus|skillsSync|teleport|tips|tools|usageCreditOffers|usageInsights|workflow`
- `src/skills/**`（bundled 全套、loadSkillsDir、reservedSkillNames、saveSkillPrompt、skillChangeWatch、skillNameRules、skillPathPlaceholders、syncedSkills、mcpSkillPrompt）
- `src/state/**`（dialogQueue、inProgressToolUses、sliceHelpers、applySessionSettingsPatch）
- `src/tasks/**`（LocalAgentTask、LocalShellTask、LocalWorkflowTask、McpTask、MonitorTask、RemoteAgentTask、resumeOrphanedTasks 等）

## 前任写到哪里

接手时 `naming/semantic-l10.jsonl` 为 **5,334 行 / 140 chunk**（与 git HEAD 逐行一致，check 0 problems）。但前任的行大多落在同 chunk 的其它组声明区间；用 `final5` + `bindingsOf` 按下标 0–1492 重算，本半段仍有 **1,458 个声明 / 6,067 个 `_K` 绑定**（计划里的 `unnamed` 是接手时的旧值，个别声明显示 0 但仍能查到残留，不能当进度用）。

## 本次续写

| 项 | 数量 |
|---|---|
| 接手时本半段剩余 `_K` 绑定 | 6,067（分布在 1,493 个声明中的 1,458 个） |
| 本次写入条目（保留前任行后新增） | **6,014 条**（`b133`–`b145` 共 13 批，全部 `cat 批次 >> naming/semantic-l10.jsonl`） |
| 交付前去重 | 33 个同键重复行按「先写生效」删掉，备份 `artifacts/tmp/l10c/semantic-l10.bak.jsonl`（原 11,363 行 → 11,348 行） |
| 交付文件 | `naming/semantic-l10.jsonl`，**11,348 行 / 145 chunk**，其中 5,334 行为前任原样保留（逐行未丢） |
| `annotate check` | **0 problems，0 suffixed by conflicts** |
| 本范围剩余 `_K` | **0**（`artifacts/tmp/l10c/mine.mjs` 用 `renameModule`+`bindingsOf` 重算 0–1492 全部 1,493 个声明，`# decls 0 keys 0`；`show` 里剩下的 `_K` 只是字符串常量 `GIT_SSL_KEY`、`SETUP_FAILURE_KIND_*` 的误匹配） |
| 跳过 | **0 个声明**；18 个绑定给的是低置信度占位名（见「跳过」） |

置信度分布（本次 6,014 条）：0.85 5,791、0.8 160、0.75 22、0.7 9、0.65 1、0.6 13、0.5 18。

## 做法

1. **`show` 必须用「final5 + 本表」的合并目录**，否则自己的名字不生效、每个声明看着都像没写过（l10x 文档里也记了同一个坑）。做法：每次追加后重建 `artifacts/tmp/l10c/final7/`（复制 `final5/top.json`，把 `final5/locals.jsonl` 与本表 `cat` 成新的 `locals.jsonl`），再从 final7 跑 `show`。注意合并必须按 `file+key` 去重，`final5` 自己也有重复键。
2. 进度不靠清单 `unnamed`：`artifacts/tmp/l10c/mine.mjs` 逐声明重算（本表打名字、其余仍转成 `<min>_K<offset>`，再数还剩几个），输出 `decls 0 keys 0` 才算完；`dump.mjs` 按大小把待办声明切批（`t01..t05`），`ctx2.mjs`/`ctx.mjs` 按偏移抓原始源码上下文，`peak.mjs` 出一行式「键 → 首次出现」清单。
3. 大声明单独处理：`handleSelfHostedSession`（`chunk-hm0ce8vc.js#ou`，58 KB、21 个残留绑定）与 `createWorkflowAgentRuntime`（`chunk-41w44bgm.js#is`，46 KB、164 个绑定）各占一整批（`b140`/`b144`）；后者一次性按语义给 164 个键命名，`check` 直接通过。
4. 每批跑 `check`；出现 `suffixed by conflicts` 时用 `artifacts/tmp/l10c/diag.mjs`（把本表与 final5 合并后喂 `renameModule`，只打印自己键的冲突原因），本轮中过 4 次，均已改名：`@3785402`…（前批）、本批 `@17530 error→handledError`（same-scope）、`@27095 stats→linkStats`（captures-outer-or-global）、`@5979 runSkillRuntime→resolvedRuntime`（捕获外层）、`@299 nextState→patchedState`（param-body-or-catch-clash）、`@87254 dumpableError→coreDumpError`。

## 跳过

0 个声明、0 个绑定完全放弃。18 个不能确证用途的绑定写了占位名（confidence 0.5），建议后续复核：

- `chunk-hm0ce8vc.js` 的 17 个：`@83574 unusedSlot`、`@83659/83671/84342 unusedFlag*`、`@99829 unusedPrewarmState`、`@99900/99903 unusedGitState*`、`@99906 unusedGitList`、`@99921/99927 unusedGitFlag*`、`@103031 unusedTrustResult`、`@113393 unusedChildCwd`、`@127431/127434 unusedCleanup*`、`@127437/127447/127814 unusedChild*`。这些在 `handleSelfHostedSession` 里只声明不读；**外层同名变量另有绑定**（例如 `bs`/`Zi`/`No`/`Os` 在 clone 阶段被赋成函数，子作用域里又各声明了一个没人用的同名 let），renameModule 会把「重名」判成捕获外层而拒绝，只能另取占位名。
- `chunk-hm0ce8vc.js @277799 unusedStartPhases`：`selfHostedRunnerMain` 里 `let startCommandPhases = undefined` 之后从未读取。

## 发现的问题

- **`handleSelfHostedSession`（`chunk-hm0ce8vc.js#ou`）里同名 let 重复声明**：`bs`、`Zi`、`No`、`Os` 在模块/外层各有一个真正使用的函数，子作用域里又各写了一个 `let <同名>` 且不读；`Gu`、`jh`、`zh`、`Xh`、`Jh`、`Zh` 同样只声明。压缩器保留了成对的作用域，读代码时极易误以为两处是同一个变量。`Js`/`Zn` 一类还在通往 `disableCoreDumps` 的回调里藏了只赋值不读的 `dumpableError`。
- **`selfHostedRunnerMain`（`chunk-hm0ce8vc.js#yR`）里 `Tn` 被同名复用**：先是 `let Tn = {}`（登记 holder），几百行后同函数内又有 `let Tn = false`（reap 标记），改名时前者冲突，只能给 `@277869 stateHolder`、`@279747 holderValue` 这种弱名。
- **`chunk-41w44bgm.js#is` 的 `createWorkflowAgentRuntime` 单声明 46 KB / 164 个压缩绑定**，其中大量是「同名不同义」：`Z` 在四种循环里分别是 record、block、entry、result；`Ue` 既是 handback 回调参数又是 tool_use 计数；`bn` 既是 stall 汇总对象又是 child 进程句柄。整批命名只能靠上下文逐个区分，同一段里 `Eo/Ao/vr/Vn/Tn` 五个嵌套闭包变量连成一条「当前阶段 → 最近条目」的取值链。
- **`secretScanTool.js` 的 `formatScanNotRun`（`chunk-jy3v56kg.js#Kn`）名字与用途不符**：它并不是「格式化没跑的原因」，而是把一组**绝对路径透传**的 host 桩塞给 `registerSecretScanSkillHook`，用来让 skill 提示词在不扫描的情况下也能生成说明；参数 `absolute/shownPlain/isNetworkPath/resolveFolder` 全在别处另有实现，读第一遍很容易当成真正的扫描入口。
- **`loop.js` 的 `monitorRearmInstruction(e)` 参数不是布尔**：传的是 `"iterations"` / `"ticks"` 字面量，选文案用严格比较 `e === "iterations"`，命名成 `cadenceWord` 才看得懂；同文件 `buildLoopSteps34` 返回的两个函数参数 `n` 在两条分支里顺序相反（先确认再决策 / 先决策再确认），只看名字会以为行为一致。
- **`transcriptScan.js` 的 47 个「标记」全是 `TextEncoder` 编码后的字节串**（`'"type":"assistant"'` 等），不是字符串；函数 `hasNumericTurnField`、`parseUsageRecord` 直接在 `Uint8Array` 上做 `indexOfBytes`，命名必须叫 `*_MARKER` 才不会误读。同文件 `#t`（`attributeLoopRuns`）把 25 个类型分派塞进一个闭包里，`sawUsage/fireDepth/pendingReuse` 三个状态互相决定分支。
- **19 个模块级（top-scope）绑定也顺手命名了**：`@g748wv6p.js@577`、`rr1dnehg@567`、`vjr65ep9@552`、`e6aww6q8@1805731/@1805783`、`zv6whf9m@13133`、`0sxtya66@835/@872/@949/@979/@1007/@1234`、`hantmvxa@108589`、`dx6xs6zp@1001/@1052/@1103/@1154/@1205/@1256`。它们落在本组的 chunk 里但不在任何声明的 `[start,end)` 区间内（顶层名字表 `top.json` 的范围），本表能生效（`show` 里已显示，check 通过），但严格说属另一张表，合并时若与顶层命名冲突以顶层为准即可。
- **`show` 的 `unnamed` 计数偏保守**：它的正则 `\b[\w$]{1,3}_K\d+\b` 会把 `GIT_SSL_KEY`、`SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED` 一类常量误算成未命名（decl 6 稳定报 11 个），确认剩余量必须用 `renameModule` 重算。
- **`chunk-e6aww6q8.js` 是 400 万字符的万能桶**：本组几十个阅读树文件（LocalShellTask、loadSkillsDir、reservedSkillNames、skillChangeWatch、mcpResultMeta 等）共用它，单次 `show` 20–40 秒；同一 chunk 里偏移跨多个声明，写名前必须用 `bindingsOf` 核对归属，否则会像本轮的 `@17530`/`@20616` 一样写到隔壁声明里（check 能发现 no binding，但同 chunk 相邻声明不会报错）。
- **`reservedSkillNames.js` 里 `function FileStateCache(e)` 名不副实**（做的是「按名字查保留命名空间」的带缓存版本，与 file state 无关），这是前任的行，按规则未覆盖，仅记录。
