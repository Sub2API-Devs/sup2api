# 2.1.316 → 2.1.318 升级（lead，2026-11-05）

本文记录把本目录主线从 2.1.316 换成 2.1.318 的全过程：做法、数据、坑、没做完的。按阶段追加，每个阶段完成就写盘。

## 0. 输入

| 输入 | 位置 | 说明 |
|---|---|---|
| 官方 2.1.318 linux-x64 ELF | sup2api `artifacts/claude-2.1.318/claude-linux-x64` | sha256 `708c77b204db30086ff6f1ed34577bda03e1be74ced80557cbf7b54249ebf0bd`，337,814,032 字节；manifest commit ca1fa9dea62c，buildDate 2026-11-03T19:21:35Z |
| 318 还原树 | sup2api `artifacts/claude-2.1.318/linux-restored/` | 3,100 个模块、2,857 个 JS、unresolved 为空；Bun 1.4.4（修订 **424a542a9**，316 是 71c9bf0ca），runtimeVersion v26.12.1 |
| 316 → 318 配对 | sup2api `artifacts/claude-2.1.318/equiv-316-318.json` | `tools/versions/equiv.cjs`，带 cli-mods 的种子（只多几个强制配对）；用时 12 分 14 秒 |
| 316 备份 | 本目录 `artifacts/versions/2.1.316-original/`、`2.1.316-naming/`、`2.1.316-analysis/`（vendor 只复制了顶层 json，没有 `index/`） | 换真值前复制，供命名迁移工具读取；不入库 |

开工核对：

- 本目录 `tools/extract/restore-bun.cjs` 与 sup2api `companions/cli-mods/tools/upgrade/restore-bun.cjs` 用 `cmp` 比较，逐字节相同。
- sup2api 的 `artifacts/claude-2.1.316/linux-restored/`（equiv 的旧树）与本目录 316 的 `original/` 逐模块 sourceSha256 相同（2,648 个 JS 记录 0 差异），只有 `reconstruction.json` 的 `input` 字段不同。所以 equiv 里的旧键（`文件:压缩名`）就是本目录 316 `original/` 的键。

equiv 总数：316 共 100,792 个单元，318 共 104,496 个；配上 96,886 个（same 94,629、changed 2,257），冲突 1,051 处（old-reached-twice 982、new-claimed-twice 69）。316 单元里没配上的 3,906 个；318 里没有对应旧单元的约 7,610 个。

## 1. 命名迁移工具 tools/versions/carry-names.mjs（2026-11-05）

### 1.1 先查清哪些是人工输入

按 `tools/` 里实际读取的文件逐个核对（grep `naming/`、`analysis/` 的读取点）：

| 文件 | 谁读 | 键 | 处理 |
|---|---|---|---|
| `naming/semantic-*.jsonl` | resolve.mjs、propagate.mjs、name-shape.mjs、q.mjs | `file` + 偏移 `key` | 迁移 |
| `naming/docs-*.jsonl` | readable.mjs、name-shape.mjs | 声明 id | 迁移 |
| `naming/placement-*.json` | segment.mjs | 声明 id → 目标路径 | 迁移（目标路径不变） |
| `naming/modules-*.json` | readable.mjs | 阅读树路径 | 原样复制 |
| `naming/_name-shape-verdicts.jsonl` | name-shape.mjs | `file` + 语句起点 `stmt` | 迁移 |
| `naming/_authored-short-names.jsonl` | leftover.mjs | `file` + 偏移 | 迁移 |
| `naming/worker-hooks-worker.json` | readable.mjs（worker-names.mjs） | hooks worker 里的偏移 `at` | 迁移有名字的行，骨架行由 `tools/naming/worker-bindings.mjs` 重建 |
| `naming/_dup-*.jsonl`、`_semantic-tools-lowconf.jsonl` | 没有工具读（草稿） | 偏移 / 声明 id | 也按同样规则迁移，保持整个目录都是 318 的键 |
| `naming/final/` | apply.mjs、readable.mjs、segment.mjs（上一轮的名字给新模块起名） | — | 生成物，删掉由 resolve.mjs 重算 |
| `analysis/*` | — | — | 全是工具写的：scan、reference、match、facades、segments、names 在流水线里重算；`analysis/vendor/` 由 `tools/vendor/run.sh` 重算（不在 pipeline.sh 里，要单独跑）；readability、name-shape、verify 是校验输出。`analysis/segments/naming-round*.json`、`leftover-work.json` 等是当初派活的计划，没有工具读，不迁移 |

`analysis/` 里没有需要人工裁决的输入：name-shape 的裁决在 `naming/_name-shape-verdicts.jsonl`。

### 1.2 做法

单元与 equiv.cjs 相同：每个模块级绑定一个单元，规范形是 equiv.cjs 的 token 列表（局部按首次出现编号、模块绑定写成 M、全局名和属性名保留）。规范形代码从 equiv.cjs 复制，工具启动时用 equiv 的配对重算 same/changed：94,629 / 2,257，与 equiv 输出完全一致，说明两边哈希一致。另外把"不声明绑定的顶层语句"（表达式语句、循环、匿名默认导出）也当成单元（键 `文件:#起点`），放置表里 1,001 个 `#@起点` 声明 id 和其中的局部名靠它们迁移。

- same 单元：顶层名和全部局部按编号一一对应。
- changed 单元：顶层名照带；局部名做 token 对齐（局部一律写成同一个通配 token），一个旧局部取对齐次数最多的新局部，要求占它已对齐出现的 3/4、全部出现的一半，并且一对一。对齐先用 Myers；差异太大时改用 patience 锚点分段（两边各只出现一次的 token 作锚点，取最长递增链，锚点之间递归）。对齐相似度低于 0.3 的配对当作配错，不带（与 equiv.cjs 的说明一致）。
- import 绑定：带到新文件里解析到配对单元的那个 import。
- 声明 id：通过声明的第一个能带过去的名字（或语句单元）找到新声明。

与方案的差别（都已经和主线程确认）：

1. **回退配对**。equiv 没配上的单元，在新树还没被配走的单元里找：a 规范形和引用都相同（先在 home 文件里按源码顺序取，否则全树唯一）；b 规范形相同、引用不同，只在 home 文件里唯一且不小于 12 个 token；c 内容相似（字符串/模板/属性名/全局名的 Jaccard ≥ 0.5、双向最佳、大小在 2 倍以内、不少于 40 个 token），之后局部名照样走对齐。c 有配错风险：经 c 带过去的名字 confidence 降 0.1、note 加 `carry:fallback-c`，说明行加 `carry:"fallback-c"`；报告的 `similarHome` 列出全部 c 配对（旧键、新键、Jaccard、对齐相似度、带过去的条数），供抽查。
2. **冲突单元**。equiv 的 old-reached-twice 单元默认不带；用 `--carry-conflicts same` 时，只带"与第一次配上的新单元哈希完全相同，并且这个新单元没有别的旧单元想配"的那些。

### 1.3 数据（artifacts/versions/carry-316-318.json）

单元（316 共 102,218 个，含 1,426 个语句单元）：same 99,115、changed 2,675、冲突不带 220、没配上 208。回退配对 a 4,599（其中语句单元约 1,190）、b 53、c 472。冲突 504 个：带 284，因为新单元也被别的旧单元争 166，哈希不同 54。

| 表 | 总数 | 带过去 | 其中 changed | 丢弃（原因） |
|---|---|---|---|---|
| semantic 等偏移表 | 328,078 | 325,757（99.3%） | 47,064 | 局部没对上 1,129、冲突 504、没配上 413、相似度低 227、差异过大 12、不是绑定 36 |
| docs 说明 | 37,162 | 36,995 | 1,593 | 没配上 79、冲突 79、相似度低 9 |
| placement | 59,584 | 59,310 | 1,559 | 没配上 167、冲突 80、相似度低 10、撞键 4 |
| name-shape 裁决 | 279 | 279 | 2 | — |
| hooks worker | 208（181 有名字） | 181 | 0 | 27 行是没有名字的骨架 |

经 c 带过去的有 8,241 行（472 个单元）。"不是绑定"的 36 条是 316 表里本来就指不到绑定的偏移（Babel 与 eslint-scope 的差别，或旧表的错键）。丢弃的每一条写在 `artifacts/versions/carry-316-318-dropped.jsonl`（含原因和所在单元），全部配对写在 `carry-316-318-pairs.jsonl`。

改进过程：只用 equiv 配对时偏移表只带过去 94.5%（没配上 12,057 条）；加回退配对后 98.1%；Myers 改 patience 锚点分段后"局部没对上"从 4,510 降到 1,129（queryModel `e_n` 一个函数就占 944 条）；冲突按上面的条件带回后 99.3%。

### 1.4 抽查 e_n → Z_n（queryModel，changed，对齐相似度见报告）

`node tools/versions/carry-check.mjs artifacts/versions/2.1.316-original original artifacts/versions/2.1.316-naming naming artifacts/versions/carry-316-318-dropped.jsonl artifacts/versions/2.1.316-analysis/scan/decls.jsonl "chunk-e6aww6q8.js#e_n" 40 7`

该声明 944 条语义行带过去 924 条（20 条局部没对上），从带过去的里随机抽 40 条，逐条对照新旧两边标识符前后各 50 个字符的代码：40/40 指向同一个变量（例如 `redactFallbackCreditCode` 两边都是 `[x]=(y)=>(Z.fallbackCreditCode?y.split(…`，`warningThresholdMs` 两边都是 `BE/2` 那个，`mentionedBetasRetry` 在 318 里右边多了 `??abt(Ld)`，仍是同一个绑定）。结果保存在 `artifacts/tmp/upgrade-318/check-e_n.txt`。

## 2. 换真值（2026-11-05）

- 316 的 ELF 移到 `artifacts/official/2.1.316/`（连同它的 manifest），与 304/310/312 同样的布局；`artifacts/official/claude-linux-x64` 与 `official-manifest.json` 换成 318（sha256 `708c77b2…bf0bd`，与 manifest linux-x64 一致）。
- `rm -rf original && node tools/extract/restore-bun.cjs artifacts/official/claude-linux-x64 original 2.1.318`：3,100 个模块、2,857 个 JS，unresolved 为空，Bun 1.4.4 修订 424a542a9，runtimeVersion v26.12.1。与 sup2api 主线程的还原树逐文件相同（只有 `reconstruction.json` 的 `input` 字段不同）。
- `analysis/scan`：84,503 个顶层声明（316 是 81,667）；3 个模块 Babel 解析不了（BOM 资源脚本，与 316 相同）。
- 第三方识别：`tools/vendor/run.sh` 的 `SKIP_FETCH=1` 那几步（scan-original、match、report；npm 索引不依赖 original/，沿用 316 时下载和索引的结果），2 分 24 秒。257 个 npm 包（316 是 255；新增 `@babel/runtime` 7.29.10、`@protobufjs/aspromise` 1.1.2），6,052 条归属，其余包版本与 316 相同。

## 3. 流水线（第一轮，不含 VERIFY）

改过的工具（写死 316 的地方）：

| 文件 | 改动 |
|---|---|
| `tools/naming/lib/auto-common.mjs` | `COMPILER_RUNTIME` 原来写死 `chunk-s89ma3n1.js`，改为按内容找（唯一一个包 `.H.useMemoCache(` 的小 chunk；318 是 `chunk-zt8d60ng.js`，导出名从 `w` 变成 `S`） |
| `tools/naming/resolve.mjs` | 同上，改用 `COMPILER_RUNTIME` |
| `tools/verify/scenarios.mjs` | 版本号、commit 原来写死 316，改为从 `original/cli.js` 的 `VERSION`/`GIT_SHA` 读；三处描述里的"316"改成"官方构建"；/exit 后的恢复提示，318 会把启动参数带上（`claude --permission-mode default --resume <id>`），期望改为正则 `claude (--参数 值 )*--resume` |
| `tools/emit/readable.mjs` | 文件头和 package.json 里的版本号改为从 `original/cli.js` 读、Bun 版本从 `reconstruction.json` 读；导入环去重修了一个不收敛的问题（见下） |
| `tools/build/build.mjs` | 只改注释（318 同样是 Bun 1.4.4） |
| `tools/lib/fs-retry.mjs` | 重试时间 5 秒 → 30 秒：CodeGraph 索引器监视仓库时，`analysis/segments/*.json` 被锁超过 5 秒，流水线两次在 segment/domains 失败 |

坑：

1. **阅读树去重不收敛**。`bashPermissions.js` 和 `powershellPermissions.js` 在 318 里各定义一个 `matchingRulesForInput`，又互相导入对方的；jose 的 `errors.js` 和 `content_encryption.js` 各有一个 `JOSENotSupported`/`JWEInvalid`。readable.mjs 的模块级去重每轮把两个身份都改成同一个 `_2` 名，下一轮又撞，8 轮后变成 `matchingRulesForInput_2_2_2_2_2_2_2_2` 并且仍然重复，Bun 构建报 7 处 "has already been declared"。修法：每轮一个身份只改一次名，一轮里发出去的新名字不再发第二次。改后 3 轮收敛，构建 0 错误。
2. **`*.mjs` 脚本没进命名迁移**。`build-report-lite-*.mjs`、`runner-scaffold-*.mjs` 在 `reconstruction.json` 里不算 JS 模块（restore-bun 当资源处理），但 scan.mjs 会扫描它们；carry-names 原来只认 `reconstruction.json` 里的 JS，于是这两个脚本的名字和放置全部丢掉（60 条）。已改为同时读取树顶层的 `*.mjs`。
3. **316 的推断放置**。316 阅读树里有一大批声明的文件是流水线推断的（reference 匹配、门面、layout），不在 placement 表里；318 里这些代码的匹配有一部分没再命中，落进 `_unattributed/`。新写 `tools/versions/carry-paths.mjs`：对配上的声明，318 落在临时目录、316 有正式路径的，按 316 的路径写一张放置表 `naming/placement-carry-316.json`（693 条：same 654、changed 39；冲突配对 24 条不带）。这张表排序在人工表之前，任何人工放置都会覆盖它。

文档引用：新写 `tools/versions/carry-doc-refs.mjs`，按配对把架构文档和手册里的 316 声明 id、chunk 名、字节区间、`#xxx` 简写换成 318 的：改了 1,312 处（声明 1,002、简写 166、chunk 139、区间 5），没动 23 处（声明没配上 2、简写找不到所属 chunk 18、chunk 拆散 3）。doc-refs 失败从 1,082 降到 40。

第一轮结果（`artifacts/tmp/upgrade-318/pipeline-3.log`）：resolve 命名顶层 100,789 个、加后缀 2,042、保留压缩名 3,757；α 校验 moduleDiffs/crossModuleDiffs/fileDiffs 全 0；阅读树构建 0 错误；对拍（修正恢复提示的期望之前）原版 vs runnable、原版 vs 阅读树构建产物各 98/98 一致（两个 tty 场景两边都不满足同一条期望，就是上面那条恢复提示）。可读率：src 顶层/参数/局部 96.2/96.8/97.1%（剩 3,609 / 5,448 / 6,917），vendor 99.3/99.9/100%（65 / 49 / 25）。临时目录：`_unattributed/` 1,131 个声明、`_new/` 若干，共 24 个目录。

## 4. 手工批次（交给 sonnet 子代理）

按主线程的分工，剩下的放置、命名、文档引用修复切成批次，放在 `artifacts/tmp/batches/`，由 `tools/versions/upgrade-batches.mjs` 生成（`batches.json` 是清单），说明在 `GUIDE-placement.md`、`GUIDE-naming.md`、各批的 `TASK.md`：

| 代号 | 内容 | 规模 | 产物 | 校验 |
|---|---|---|---|---|
| pl318-1…5 | 把 `_unattributed/`、`_new/` 里的声明放进源文件 | 336 / 325 / 325 / 325 / 306 个声明 | `naming/placement-<代号>.json`、`docs-<代号>.jsonl`、`modules-<代号>.json`、`docs/process/batch-<代号>.md` | `tools/versions/check-placement.mjs` 0 problems |
| nm318-1…10 | 一方代码仍压缩的绑定补语义名 | 每批约 1,600 个绑定、300–540 个声明；`hints.jsonl` 给出 316 有名字但没能迁移的绑定 | `naming/semantic-<代号>.jsonl`（只用偏移键）、`docs/process/batch-<代号>.md` | `annotate.mjs check` 0 problems、0 suffixed |
| nm318-11 | 第三方代码补名 | 24 个声明、139 个绑定 | 同上 | 同上 |
| dc318-1 | 文档里失效的引用 | 40 条（合并命名、放置之后重新生成） | 直接改文档 + `docs/process/batch-dc318-1.md` | doc-refs 0 FAIL |

### 1.5 补记：最终的迁移数字（修了 `*.mjs` 漏迁之后，第 3 节坑 2）

`artifacts/versions/carry-316-318.json` 的最终数字以这里为准，第 1.3 节表里是修之前的数：

- 单元：316 共 102,279 个，其中 same 99,174、changed 2,675、冲突不带 220、没配上 210。回退配对：a 4,597、b 53、c 472（经 c 带过去 8,241 行）。冲突 504 个：带过去 284 个，新单元被别的旧单元争 166 个，哈希不同 54 个。
- 偏移表：328,078 条，带过去 325,790 条（99.3%；same 278,726、changed 47,064）。丢弃的原因：局部没对上 1,129、冲突 504、没配上 415、相似度低 227、差异过大 12、不是绑定 1。
- 说明：37,162 条，带过去 37,022 条。丢弃：冲突 79、没配上 52、相似度低 9。
- 放置：59,584 条，带过去 59,367 条。丢弃：没配上 110、冲突 80、相似度低 10、撞键 4。
- name-shape 裁决 279/279；hooks worker 181/181（另有 27 行骨架）。

## 5. 版本变化清单（2026-11-05）

新写 `tools/versions/changes.mjs`。它按配对给出每个 changed / removed / added 单元，以及两边的名字、路径和新增、消失的内容 token，输出 `artifacts/versions/changes-316-318.jsonl`（6,788 行）。再加上全树字面量集合的对比和主线程的三份审查报告（g1、g2、sp-spec），整理成 `research/versions/CLAUDE-CODE-2.1.318-CHANGES.md`：影响请求的变化逐条列出（请求体、请求头与传输、提示词、计费与身份、工具、认证），其余按子系统汇总。

结论摘要：
- 计费头、指纹、身份行、默认工具池都没变。
- 新 beta 有三个：program-use-case-ids（请求体新增 `program_use_case_id`）、tool-provenance（`ownership_metadata`）、side-query。
- 工具清单头的元素多了可选的连接器字段，默认关。
- 新增 `resume_cache_warm` 预热、`RouteTurnedAway` 和 `network_edge_blocked` 两类错误；登录过期的文案改成"到时间上限"。
- compact 去掉了提示词变体表；`original_games` 段改写；REPL / 脚本模式默认关。

坑：removed（316 单元没配上）大多是重写，不是删除。抽查的字符串在 318 里都还在，清单里专门写明了。第三方的 changed 单元也不是包本身变了：MCP core 的是 zod schema 被包上了懒求值，gRPC / protobufjs 的是运行时助手换了名字（eval chunk 里作用域分析把助手当全局）。

## 6. 合并手工批次（2026-11-05/06）

### 6.1 复核

16 批全部到位（pl318-1…5、nm318-1…11），由 lead 逐个重新校验：
- 放置：`check-placement.mjs` 全部 0 problems，1,617 个声明全部放好，5 批之间没有重复的 id。
- 命名：`annotate.mjs check` 全部 0 problems、0 suffixed，共 18,553 行（nm318-1 2,313、-2 1,564、-3 1,803、-4 1,582、-5 1,449、-6 1,666、-7 1,604、-8 2,400、-9 1,411、-10 1,326、-11 135）。

### 6.2 批次与迁移表的分歧

有 224 个绑定，批次给的名字和迁移带过来的名字不同。追查后发现分两种情况：
- **多数是批次写错位**：名字写到了前一个或后一个绑定上，相当于整串往一边错了一格。原因是 `hints.jsonl` 给的是 316 的偏移（nm318-10 也指出了这一点）；另外 `show` 显示的 `_K` 偏移后面紧跟着另一个声明时，也容易看错（例如 `chunk-hjswk319.js` 的 `resumeMode`/`cloudValue`/`remoteTarget`/`isServeOnly`）。新旧两边绑定周围的代码逐字一致，说明迁移带过来的名字是对的。
- **少数是迁移错了**：绑定周围的代码在 318 里改了，迁移的局部对齐对错了对象。例如 `fileReferenceHintLatch` 的参数在 318 里变成了 Map 的键（`referenceKey`），`TERMINAL_REFRESH_ERRORS` 那一处在 318 是另一个常量。

为此做了两件事：
1. 新写 `tools/versions/settle-batch-overrides.mjs`，对每个分歧比较绑定在 316 和 318 两边前后各 60 个字符的代码（标识符先抹掉）。一致度 ≥ 0.4 的保留迁移的名字，否则用批次的名字。裁决写成 `naming/semantic-zzzzz-318-settle.jsonl`（confidence 0.99，排序最后，resolve 会优先取它）。结果：224 处里保留迁移的名字 215 处，用批次的名字 9 处。逐条记录在 `artifacts/versions/settle-318.jsonl`。阈值的依据：错位的那些一致度在 0.45–0.75 之间（附近只有小改动），用批次名字的 9 处都在 0.26 以下。
2. `carry-names.mjs` 的局部对齐另外再按反向跑一次，正反两次结果不一致的记为 `unstable`（318 上有 800 个）。只做统计，不再丢弃。曾经试过只保留正反一致的，但这 224 处分歧里只有 7 处会被它去掉，而追查的结果是迁移的名字基本都对，所以没有采用。

另外修了 `carry-names.mjs`：316 的表里有 45 个名字带 annotate 占位（形如 `ke_K125619Element`，resolve 会把它换成那个偏移处绑定的最终名字），里面的偏移是 316 的。原来照抄，318 里就指向了别的绑定。现在把占位里的偏移也迁到 318（44 条），迁不过去的就丢弃。

### 6.3 坑：只差大小写的两个模块

第一次全量流水线在阅读树构建时失败：`No matching export … "NO_HOOK_CALLBACK_MESSAGE"`。原因是 pl318-5 把一个声明放到了 `utils/hooks/asyncHookRegistry.ts`，而已有的模块是 `utils/hooks/AsyncHookRegistry.ts`。两个路径只差大小写，在 Windows 上会写到同一个文件，后写的那个把先写的覆盖掉了。修法：把这条放置改成已有路径的写法，删掉对应的模块说明；`check-placement.mjs` 加了一条检查，目标路径和已有模块只差大小写时报错。全树这样的情况只有这一处。

### 6.4 第一次完整验收（`SCAN=1 VERIFY=1`，日志 `artifacts/tmp/upgrade-318/pipeline-full-2.log`，耗时 37 分钟）

| 项 | 结果 |
|---|---|
| resolve | 命名顶层 103,678、加后缀 2,052、保留压缩名 868、局部 502,335 |
| α 校验 | moduleDiffs / crossModuleDiffs / fileDiffs 全 0 |
| 阅读树构建 | Bun 1.4.4，0 错误，2,857 个文件 |
| 对拍：原版 vs runnable | 98/98 一致，预期 98/98 |
| 对拍：原版 vs 阅读树构建产物 | 98/98 一致（`print-bash-stdout-unshimmed` 第一次不一致，重跑后一致，316 时也有过） |
| 对拍：原版 vs 去压缩树 | printer 与规范形 0 差异，98/98 一致 |
| readable-check | 84,503/84,503，0 解析错误、0 重复、0 缺失导入；自由标识符 33 个，与原版相同（见下面的坑） |
| decl-equiv | 84,498/84,503；剩下 5 处与 316 是同样的 5 处第三方写法（MCP client 的 `var X = class e`、正则 flags） |
| 可读率 | src 顶层 / 参数 / 局部 = 99.2 / 100 / 100%（剩 795 / 67 / 42）；vendor 100 / 100 / 100%（剩 4 / 0 / 0） |
| 剩余压缩名 | src：unnamed 899、dead 4、authored 1；vendor：dead 2、authored 2 |
| name-shape | 标记 225 处、193 条语句，175 条已裁决，18 条没裁决 |
| doc-refs | FAIL 40 |
| 临时目录 | 1 个（`_unattributed/` 下 3 个 part，共 6 个声明） |

坑：readable-check 的"自由标识符与原版相同"一开始是 false。原因是流水线只在 `analysis/verify/readable-check-original.json` 不存在时才重新生成这个基线，而文件里还是 316 的结果（32 个）。用 318 重新生成后是 33 个，与阅读树完全相同。`pipeline.sh` 已改为：基线比 `original/reconstruction.json` 旧就重做。316 的那份另存到 `artifacts/versions/2.1.316-analysis/verify/`。

还没过的几项和处理方法：
- **剩余压缩名 899 个**，其中 790 个是顶层名。第一轮批次规则写的是"只命名显示为 `_K` 的绑定"，有几批以为这些顶层名已经有名字（nm318-5、-9、-10 共 719 个）。另外 24 个不在任何批次里（放置之后声明换了文件）。已经用 `upgrade-batches.mjs` 切出第二轮：`artifacts/tmp/batches-r2/nm318r-1…4`，共 908 个绑定，TASK.md 末尾写明顶层名也要命名，并提醒错位和 316 偏移这两个坑。
- **6 个声明还在临时目录**：放置之后它们在 chunk 里的邻居换了文件，按位置推断不出归属。由 lead 直接放置（`naming/placement-zzzzzzz-318-lead.json`、`naming/modules-318-lead.json`）：WrapUp 的提示常量放到 `tools/WrapUpTool/prompt.ts`，确认对话框的两个辅助放到 `components/dialogs/PermissionPromptDialog.tsx`，WebSearch 的 3 个放到 `UI.tsx` / `WebSearchTool.ts`。依据是调用方。
- **name-shape 18 条没裁决**：多数是 318 新命名的常量。切成 `artifacts/tmp/batches-r2/ns318-1`，裁决由子代理写，lead 合并进 `naming/_name-shape-verdicts.jsonl`。
- **doc-refs 40 条**：`artifacts/tmp/batches/dc318-1/fails.tsv` 已按当前阅读树重新生成（名字 14、声明 id 18、字面量 5、路径 3），可以派 dc318-1。其中 `71c9bf0ca` 这一条（ARCHITECTURE 里的 Bun 修订号）属于版本事实，由 lead 改。

### 6.5 核对批次 ck318-1（主线程决定：核对点名的已有名字，并从 800 个正反对齐不一致的局部里抽 100 个）

- `carry-names.mjs` 现在会额外写出 `<report>-unstable.jsonl`：每个正反对齐不一致的局部，带新旧偏移和反向对齐的候选。用同样的参数重跑一遍到临时目录（`artifacts/tmp/upgrade-318/naming-e`），产出的表与 `naming/` 下逐字节相同，800 条清单在 `artifacts/tmp/upgrade-318/carry-e-unstable.jsonl`。
- 抽样脚本 `artifacts/tmp/upgrade-318/ck-sample.mjs`：**种子 318**，线性同余洗牌后取前 100 个，输出 `artifacts/tmp/batches-r2/ck318-1/unstable-sample.jsonl`（100 个里只有 7 个带反向候选，其余是反向对齐没给出任何对应，正向是唯一的候选）。
- 点名的 7 项写在 `artifacts/tmp/batches-r2/ck318-1/items.jsonl`：nm318-4 两项（`Pt` 的第三个参数 / `importModuleDynamically`，`Lu` 的 `dispatchCtx`），nm318-6 五项（`Jc`/`iU`、`ph` 的局部、`CWe` 的局部、`Jm` 的三个计数器、`chunk-5xgkngpb.js` 末尾的 lodash 片段）。
- 预看：抽样第 2 个就是放错的，`entrypoint` 被带到了 318 `replaceWrapUpOffered` 的参数上，反向候选才是对的。所以这 800 个里确实有一部分错，要等抽样结果估计比例，再决定是全量复核，还是在工具里改用反向结果。

## 7. 第二轮批次与最终验收（2026-11-06）

### 7.1 合并

- **命名 nm318r-1…3**：分别 301、306、298 行，check 均为 0 problems、0 suffixed，全部合并。nm318r-4 只有 4 行（第三方），没有合并，移到了 `artifacts/tmp/batches-r2/dropped/`。原因有两个：
  - `_lt`、`G` 是 npm 源码里的原名，已经登记为作者原名，不应该再改名；
  - `__rest`、`__read` 被判成压缩名，是 `tools/verify/readability.mjs` 剥"模块冲突标签"的正则误伤（`_rest` 正好是 4 个字母）。正则已改为标签前面必须是字母、数字或 `$`，不能是 `_`。
- **name-shape ns318-1**：18 条裁决，14 条误报、4 条改名。裁决追加进 `naming/_name-shape-verdicts.jsonl`，改名在 `naming/semantic-ns318-1.jsonl`。
- **文档 dc318-1**：修了 41 处引用。剩下的 Bun 修订号由 lead 在改版本事实时处理。
- **核对 ck318-1**：点名的 7 项里 4 项改名、3 项保留；100 个抽样里 6 个改名，按比例估计 800 个里约 48 个放错。改名在 `naming/semantic-ck318-1.jsonl`。
- **env 注册表整片错位**（nm318r-2 发现）：`chunk-xjnnz630.js` 有 1,302 个 getter，迁移带过来的名字整体错了位。Bun 把每个源模块的命名空间写成 `__export(ns, {KEY: () => local, …})`，KEY 就是原始导出名。新写 `tools/versions/export-map-names.mjs`：一个 chunk 里所有导出表的键和现有名字作为集合重合 ≥ 80%、但对上本位的不到 95% 时，就是"名字对、位置错"，按键改名。输出 `naming/semantic-zzzzzz-export-maps.jsonl`，共 1,037 条：env 注册表 995 条，另外 4 个 chunk 42 条，都是同样的错位。default 键不改。改完后 env 注册表里不再有错位的 `_2` 名（剩下的 10 个 `_2` 是导入的同名函数，正常）。
- **方法插入导致参数整体后移**（ck318-1 类别 1）：新写 `tools/versions/fix-moved-params.mjs`。对 800 个正反对齐不一致的局部，比较参数所在方法在 316 和 318 里的名字：方法名变了，就到 316 里找同名方法同位置参数的名字。可比的 74 个里，60 个没有移动，14 个移动了：修复 8 个（`naming/semantic-zzzzz-318-moved.jsonl`），另外 6 个是 318 新增的方法，316 里没有对应，由 lead 按代码命名（`naming/semantic-zzzzz-318-lead.jsonl`，例如 `replaceWrapUpOffered` 的参数 `wrapUpOffered`）。ck318-1 的类别 2（名字描述的是 316 的实现细节）只能读代码，抽样已经修了命中的几条，其余作为已知限制写进 README。
- 第三轮全量验收后剩下 4 个参数、局部还是压缩名，lead 直接命名（同一个表）。

### 7.2 最终验收（`SCAN=1 VERIFY=1`，`artifacts/tmp/upgrade-318/pipeline-full-4.log`，32 分钟）

| 项 | 结果 |
|---|---|
| resolve | 顶层：命名 104,473、加后缀 2,058、保留原名 73（门面原名与本来就可读的名字） |
| α 校验 | moduleDiffs / crossModuleDiffs / fileDiffs 全 0 |
| 阅读树构建 | Bun 1.4.4，0 错误，2,857 个文件，38.5 秒 |
| 对拍：原版 vs runnable / 阅读树构建产物 / 去压缩树 | 三组都是 98/98 一致，预期 98/98，这一轮没有需要重跑的场景 |
| 去压缩 | 2,859 个模块，printer 和规范形 0 差异 |
| readable-check | 84,503/84,503，0 解析错误、0 重复、0 缺失导入；自由标识符 33 个，与原版相同 |
| decl-equiv | 84,498/84,503，剩下 5 处与 316 相同，都是第三方的有意写法 |
| 可读率 | src 顶层 / 参数 / 局部 100 / 100 / 100%（剩 1 / 0 / 0），vendor 100%（剩 2 / 0 / 0） |
| 剩余压缩名 | 3 个，都是 authored（`esc`、`_lt`、`G`），命名缺口 0 |
| name-shape | 190 条语句全部裁决 |
| doc-refs | 0 FAIL（架构文档、变化总表、索引、10 本手册）。`doc-refs.mjs` 的路径根补了 `research/`，因为手册顶部新加的说明引用了版本变化清单 |
| 临时目录 | 0 |

### 7.3 版本事实

- README：统计表全部换成 318 的实测值，已知限制里的数字也更新了：`_2` 后缀 1,731 个、React Compiler 缓存 564 个文件、print.js 19,737 行、`deferInit` 5,997 条。
- AGENTS、PLAN（加第 7 节）、ARCHITECTURE（sha、Bun 修订号、模块表、代码量、新增和对应文件数）、INDEX、`package.json`、`naming/README.md` 也都改了。
- 10 本手册和变化总表改了标题、适用版本、User-Agent、计费头版本号，并在开头加了一句说明：本篇写于 2.1.316，代码引用已按 318 校验，行为描述没有逐条重新核对，316 → 318 的变化看版本变化清单。手册正文没有逐条重新审读，这是剩下的风险。
- 版本变化清单第 3 节补了一段放置之后的数字（`tools/REPLTool` 新增 454 个单元，是 318 最大的新模块）。

### 7.4 没做完、有风险的

- 800 个正反对齐不一致的局部，抽样估计约 5% 放错。参数后移那类已经用工具修了；"名字描述的是 316 实现细节"那类没法用工具找，剩下的约 30–40 个没有逐个复核。
- 只用正向对齐的局部（4 万多个）没有抽样。正反两次对齐一致的那些，出错的概率应该更低，但没有量化。
- 手册的行为描述没有按 318 逐条复核，只校验了引用。
- `naming/_dup-*`、`_semantic-tools-lowconf.jsonl` 这些草稿表也按规则迁移了，但没有工具读它们。
