# ref-align 过程文档：一方已匹配声明与 2.1.88 源码按词法序列对齐，取回参数与局部名

代号 ref-align，第五阶段第一波（见 readability-guide.md）。交付：

- `tools/naming/reference-align.mjs`（主程序）
- `tools/naming/lib/ref-align-tokens.mjs`（两侧归一化 token）
- `tools/naming/lib/ref-align-source.mjs`（装载、作用域、标识符分类）
- `tools/naming/lib/ref-align-diff.mjs`（带权 LCS + 锚点递归对齐）
- `tools/naming/lib/ref-align-vote.mjs`（投票、置信度）
- `tools/naming/lib/ref-align-pair.mjs`（对齐对象的取舍、文件内重配）
- `tools/naming/lib/ref-align-units.mjs`（第二遍：函数级对齐）
- 输出 `analysis/names/reference-align.jsonl`（28,043 条，source `reference`，键为 original 里绑定声明标识符偏移 `@N`）

## 1. 结果

| src（一方） | 参数 | 局部 |
|---|---|---|
| 同源对比（开工时的 auto / facade / reference 三个来源 + 我的输出） | 17.7% → **19.5%**（剩 136,606 → 133,663，−2,943） | 32.6% → **35.0%**（剩 155,817 → 150,144，−5,673） |
| 现状对比（13:30 的全部来源：auto2 的 auto/propagate、vendor 等 + 我的输出） | 38.5% → **39.6%**（剩 102,156 → 100,215，−1,941） | 44.1% → **45.8%**（剩 129,264 → 125,237，−4,027） |

顶层不受影响（同源对比 0 变化；现状对比 −30，是 resolve 合并的连带结果）。现状对比的增量小于同源对比，是因为 auto2 已经给其中一部分绑定起了名字（与 auto/propagate 重叠 9,554 个绑定，其中约 4,760 个同名，见第 5 节）。

改名引擎：`tools/rename/apply.mjs original <final> <runnable> --force --check` 拒绝 0（rejected 0），α 校验 moduleDiffs 0、crossModuleDiffs 0、fileDiffs 0，ok。

原来的 reference.jsonl 只用了"参数个数相同就按位置取名"和"局部声明形状签名 LCS"，产出参数 5,328、局部 17,439；本工具对同一批匹配对做整段代码对齐，产出参数 9,613、局部 18,430，其中 12,910 个绑定是 reference.jsonl 没有的，15,133 个是两边都有的（一致 14,613、不一致 520）。

## 2. 做法

### 2.1 工作项与对齐对象

- 工作项：`analysis/match/decl-map.jsonl` 里带 `ref` 的（match.mjs 指纹 / 调用图传播，8,778）、`local-map.jsonl`（文件内匹配，750），以及只有 `refFile`（布局插值，只知道属于哪个旧版文件）的声明，共 16,724 个。
- 对齐对象（ref-align-pair.mjs）：
  - 已有匹配、整段对齐相似度 ≥ 0.5：照用（7,621 个）；
  - 已有匹配但相似度 < 0.5：在同一旧版文件里按锚点 token 多重集 Dice 取前 4 个候选对齐，相似度 ≥ 0.5 且比原匹配高 0.2 以上才换（switched，73 个）；
  - 只有文件归属：同样找候选，最好的 ≥ 0.5 且比第二名高 0.1 以上才用（file-local，487 个）；
  - 其余放弃（5,339 个，多数是布局插值的小声明在旧版文件里没有对应物）。
  - 换过对象的名字置信度 ×0.9。

### 2.2 两侧 token（ref-align-tokens.mjs）

把一个顶层声明按源码顺序转成同一套 token，抵消 Bun 压缩和 TS 的差异：

- 标识符按解析结果分类：
  - `L`：函数内的局部绑定（参数、let/const/var、嵌套函数名、catch 参数、解构绑定），通配，对齐后投票；
  - `L@<键>`：对象属性 / 解构属性 / JSX 属性的值是局部绑定时，把键名并进 token（`{signal: y}` → `L@signal`）。属性键压缩前后不变，这是最可靠的对齐点，也避免 `{a: x, b: y}` 与 `{b: y2, c: z}` 串位（抽查发现过 `S → signal` 这类串位，加了这条后消失）；
  - `M:<旧版名>` / `M`：模块级绑定。316 侧用已匹配顶层声明的 refName 还原（同 chunk 的顶层名，以及 `import {x} from "./chunk-…"` 按导出方的匹配还原），还原不了的是 `M`，可与任何 `M:…` 匹配；
  - `G:<名>`：全局（process、Object……）。
- 316 侧用 `tools/rename/lib/scope.mjs` 的作用域分析（与改名引擎同一套，所以绑定键 `@N` 就是 `bindingsOf` 的规范键）；旧版侧用 `@babel/traverse` 的 scope。
- 字面量带值；属性名 `.x`、对象键 `k:x`；关键字、运算符原样。
- 归一化：`!0/!1` → true/false，`void 0` → undefined，无插值模板 → 字符串，`const/let/var` → decl，箭头函数表达式体 → `{ return … }`，`?.` 与 `.` 同形，`x["a"]` 与 `x.a` 同形。
- 旧版 TS：类型节点全部跳过（`as`、`satisfies`、`!`、类型参数、interface/type/declare）。
- JSX 转成 Bun jsx 运行时调用形态：`M(组件, {属性…, children: …}, key)`，小写标签是字符串，文本按 React 规则清理空白，`key` 单独作第三个参数，单个子节点不包数组。

### 2.3 对齐（ref-align-diff.mjs）

- 带权 LCS：字面量、属性名、对象键、全局名、`M:<名>`、`L@<键>` 权重 4；`L`、`M`、关键字、运算符 2；标点 `( ) { } [ ] , : ; =` 1（不让标点凑长度导致串位）。
- 区间乘积 ≤ 3e6 直接 DP；更大的先去掉公共前后缀，再用两边各自唯一、内容相同的权重 4 token 做锚点（按位置取最长递增子序列，patience diff），递归处理锚点之间；没有锚点的大空档放弃。
- 相似度 sim = 2 × 对上的权重 / 两侧总权重。

### 2.4 投票（ref-align-vote.mjs）

- 每个对齐上的 (316 `L`, 旧版 `L`) 对投一票，票权 = 连续性（前后相邻的对齐对都在对角线上 1、一边 0.85、孤立 0.5）× 声明处加权（两边都是声明标识符 ×2）。
- 对每个 316 绑定：
  - agreement = 投给票数最多的旧版名字的票 / 全部票 ≥ 0.75（同一绑定的多次出现投票一致；按名字合计，因为 Bun 可能把旧版兄弟块里两个同名 `result` 合成一个变量）；
  - reverse = 该旧版绑定从这个 316 绑定得到的票 / 它得到的全部票 ≥ 0.6；
  - 一一对应：同一个旧版绑定被多个 316 绑定选中时，票数严格最多者留下，其余放弃（同名但不同作用域的旧版绑定互不排斥）。
- 多轮：上一轮采用的 (316 绑定, 旧版绑定) 换成两边相同的唯一锚点 `B:<n>` 重新对齐，剩下的再投票，最多 3 轮（第 2、3 轮多出约 700 个名字）。
- 质量门槛 q = min(整段 sim, 局部相似度) − (316 侧 < 120 个 token 时 0.08)；局部相似度是绑定首末出现范围各向外扩 12 个 token 内的对齐比例。q < 0.45 不要。小声明的惩罚来自抽查：错名集中在结构相近的小函数被别的函数顶替（`function uot(e){…}` 配成 `nodeTypeId(nodeType)`）。
- 置信度 = 0.9 × agreement × reverse × min(1, 覆盖率/0.8) × min(1, 0.6 + (q − 0.45) × 1.6) × 票数因子（1 票 0.85、2 票 0.95、≥3 票 1）× 连续性因子；对象是重配的 ×0.9；React Compiler 临时名 ×0.75；< 0.5 不输出。覆盖率 = 该绑定的出现有多少对上了旧版 `L`。

### 2.5 第二遍：函数级（ref-align-units.mjs）

顶层声明改动大、或只有文件归属时，里面的回调 / 方法 / 嵌套函数往往仍与旧版某个函数几乎一样。第二遍把两侧每个函数（≥ 24 个 token）当单元：

- 316 单元只处理"自己声明的绑定里还有没取到名字的"，外层先处理；
- 候选：同一旧版文件的全部函数单元，长度比在 1/2–2 之间，按锚点 Dice 取前 3 个对齐；
- 采用：最好的 sim ≥ 0.6，且比第二名高 0.1 以上；投票同上，只输出声明在单元内、第一遍没给名字的绑定（置信度 ×0.9）。
- 结果：尝试 16,610 个单元，对上 2,998 个，新增 1,135 个名字。第二遍对第一遍已命名绑定的独立复核：15,973 一致、10 不一致。

### 2.6 名字处理

- React Compiler 临时名（`t0`、`t12`、`$`、`_temp3`）照旧版取，置信度 ×0.75（1,814 条）。注意 `t0` 在 readability 度量里仍算压缩名。
- React Compiler 为避免遮蔽加的 `_0/_1` 后缀（`selected_1`、`content_0`）去掉，冲突交给改名引擎加后缀（463 条）。
- 旧版名 `_` 不取；与压缩名相同的不输出。
- 旧版 1–2 字符的名字（`q`、`r`、`p`……）只有在 readability 认为是惯用短名（i j k n m x y z e t v id fn cb ms …）时才取：其余的在度量里仍算压缩名，而 reference 优先级高于 auto，会盖掉 auto 给的描述性名字（例如 auto 给的 `question` 会被旧版的 `q` 盖掉）。因此丢了 3,570 个候选。
- 同一绑定被多个匹配对 / 单元覆盖时取置信度高者。

## 3. 数据

- 运行：约 65 秒（并行负载下 130 秒），`--max-old-space-size=7000` 足够。
- 316 侧 2,914,354 个 token；对齐 50,785 次；投票涉及 99,786 个 316 绑定。
- 候选去向：采用 28,043（含被更高置信度覆盖的重复）；投票不一致 27,480；质量门槛 9,693；置信度 < 0.5 7,483；短名 3,570；与压缩名相同 98；`_` 267。
- 输出：参数 9,613；let 17,548、catch 551、const 136、function 154、fnname 40、await using 1。来源：照用匹配 25,879、文件内重配 814、换对象 215、第二遍 1,135。
- 置信度：0.9 段 8,636、0.8 段 9,960、0.7 段 4,185、0.6 段 3,892、0.5 段 1,370。
- 整段 sim 分布（第一遍选中的对）：≥0.8 2,759，0.5–0.8 2,716，<0.5 2,706（已有匹配但同文件里没有更好的对象时照用，靠质量门槛逐个绑定把关）。

## 4. 抽查

脚本：`artifacts/tmp/ref-align/sample.mjs <jsonl> <n> <seed> [过滤]`，打印 316 声明处上下文、后续引用和旧版声明里该名字的行，逐条人工判断。

1. **最终输出均匀随机 50 例（seed 2026）：50/50 正确。** 逐条：

   | # | 位置 | 压缩名 → 名字 | 依据（旧版） |
   |---|---|---|---|
   | 1 | chunk-18hwfzwa.js @1397231 | Be → word | staticPrefix 的 `for (const word of …split(' '))` |
   | 2 | chunk-bzr73sfg.js @178231 | n → node | applyOverflowStyles(node, style) |
   | 3 | chunk-7p2hc4jn.js @38297 | e → offset | snapToGraphemeBoundary(offset) |
   | 4 | chunk-18hwfzwa.js @641268 | ps → hasPendingChord | `?.pendingChord != null` |
   | 5 | chunk-e6aww6q8.js @4850251 | fs → resolve | `const resolve = resolveProgress` |
   | 6 | chunk-n1aavqzh.js @4884 | l → shouldClear | `res.status < 500` |
   | 7 | chunk-a658aeqp.js @5647 | c → normalized | `Math.min(rms / 2000, 1)` |
   | 8 | chunk-47mye09a.js @4200 | e → cwd | readLastFetchTime(cwd) |
   | 9 | chunk-anrta56w.js @4815 | e → data | settingsJsonToRules(data) |
   | 10 | chunk-zj31az9x.js @14700 | u → t0 | 组件参数 t0（Compiler 名） |
   | 11 | chunk-18hwfzwa.js @1444330 | h → viewedTeammate | `useAppState(_temp)` |
   | 12 | chunk-n1aavqzh.js @28492 | N → result | `await sdkAuth(…)` |
   | 13 | chunk-dcmhvw5a.js @14434 | n → segment | `for (const segment of slug.split('/'))` |
   | 14 | chunk-kxyd0g16.js @94157 | e → location | formatLocation(location, cwd) |
   | 15 | chunk-qg0af0yq.js @23943 | e → cwd | `cwd.normalize('NFC')`（Xn 是 setCwdState 里的 normalize） |
   | 16 | chunk-vkh471k3.js @4882 | c → urlMatch | parseGitRemote 的 URL 正则 |
   | 17 | chunk-ag5x7vhf.js @157732 | de → index | `itemKeys[index]` |
   | 18 | chunk-9h8dr0qb.js @114327 | Ve → handleEscape | `const handleEscape = t1` |
   | 19 | chunk-e6aww6q8.js @4822557 | n → parts | splitCommand 结果 |
   | 20 | chunk-8t8n4kdh.js @64545 | w → sentToken | `const { response, sentToken }` |
   | 21 | chunk-e6aww6q8.js @3872119 | r → name | `name => normalizeNameForMCP(name)` |
   | 22 | chunk-e6aww6q8.js @980221 | G → normalizedMessages | stripToolSearchFieldsFromMessages |
   | 23 | chunk-ag5x7vhf.js @174264 | xe → text | `let text = null` |
   | 24 | chunk-z1n5m6nf.js @63464 | n → serverStats | connectToServer 第三参数 |
   | 25 | chunk-ey2qag4x.js @50875 | rf → index | `visibleOptions.map((option, index)` |
   | 26 | chunk-t0gq9gyw.js @68218 | r → key | `const key = line.slice(0, i)` |
   | 27 | chunk-ag5x7vhf.js @171509 | Po → onLeaveK | `useCallback((k) => …)` |
   | 28 | chunk-1qpz7qcd.js @4925 | r → recentPostedUUIDs | handleIngressMessage 第二参数 |
   | 29 | chunk-axj4swpp.js @3589 | e → platform | `getPlatform()` |
   | 30 | chunk-ncz9bgnh.js @4791 | g → client | `for (const [id, client] of this.mcpClients)` |
   | 31 | chunk-v0yfsee9.js @64068 | e → parsed | checkAddType(parsed) |
   | 32 | chunk-7p2hc4jn.js @36762 | d → segment | MeasuredText 的子串 |
   | 33 | chunk-ey2qag4x.js @55317 | Mt → t16 | Compiler 名 |
   | 34 | chunk-yt6zn9vg.js @19238 | oe → change | `for (const change of diffLines(…))` |
   | 35 | chunk-bzr73sfg.js @292355 | f → start | widestLine 的 `let start = 0` |
   | 36 | chunk-bzr73sfg.js @288559 | u → color | styleBorderLine 参数 |
   | 37 | chunk-e6aww6q8.js @1053289 | e → rootNode | hasActualOperatorNodes(rootNode) |
   | 38 | chunk-cjvab7rz.js @401 | e → prefix | `${getTaskOutputDir()}/` |
   | 39 | chunk-e6aww6q8.js @4543887 | nt → commandName | `async ([commandName, metadata])` |
   | 40 | chunk-e6aww6q8.js @1054298 | s → children | `const children = node.children` |
   | 41 | chunk-887tgx6t.js @2010 | c → type | 解构 `type` |
   | 42 | chunk-nw7jbebs.js @18837 | n → taskId | claimTaskWithBusyCheck 参数 |
   | 43 | chunk-s4bxxzsw.js @27124 | s → editMode | `editMode === 'single'` |
   | 44 | chunk-bzr73sfg.js @302937 | ln → screenBottom | `Math.min(…)` |
   | 45 | chunk-g54kbxqw.js @68328 | s → toolSchemas | 解构 `toolSchemas` |
   | 46 | chunk-ncz9bgnh.js @7184 | e → length | `readUInt32LE(0)` |
   | 47 | chunk-vrb44rx7.js @70337 | _ → toActualIndex | `useCallback(…)` |
   | 48 | chunk-18hwfzwa.js @1756767 | He → reason | getAutoModeUnavailableReason() |
   | 49 | chunk-x6v6jz2y.js @20940 | o → t0 | NoSelect(t0)（Compiler 名） |
   | 50 | chunk-v0yfsee9.js @45758 | z → absolutePath | `isAbsolute(normalizedPath) ? …` |

2. **开发中的低置信度段抽查（第 5 版，置信度 0.5–0.8，50 例人工标注，`artifacts/tmp/ref-align/labels-v5.txt`）：41 对 9 错。** 错的集中在两类：结构相近的小函数被别的函数顶替（`uot(e)` → nodeType、`jv(e)` → p、`n$s` 的 `s` → toolCallCount、`ge` 的 `t` → lines），以及两侧长度差很多的大声明里局部窗口凑巧对上（`he → block`、`Wd → t`、`$r → t8`）。据此加了质量门槛（第 2.4 节 q = min(sim, local) − 小声明惩罚）；加完后这 9 个错的全部被拒，41 个对的保留 22 个。
3. 第 7 版均匀 30 例：30/30；第 7 版 0.5–0.62 段 20 例：其中 6 例核对了旧版行（npmTag、fileAdded、settingsPath、timedOut、errOutput、summary），其余从上下文看一致，未见错。
4. 第二遍（函数级）20 例：20/20（issue、x、themeName、notification、prevTask、isSandboxed、fileContent、item、entry、id、systemMessages、tr、el、authHeaders、metaMessages……）。
5. 文件内重配 / 换对象 12 例：12/12（marketplaceName、j、fileBaseName、amPmPattern、path、init、remoteConfig、keepAlive、nl、childSize、log……）。
6. 第二遍对第一遍的独立复核：15,973 一致、10 不一致（第二遍只填空，不覆盖第一遍）。

## 5. 与其他来源的分歧

### reference.jsonl（同为 source `reference`，resolve 按置信度取高者）

两边都有 15,133 个绑定：一致 14,613，不一致 520。不一致里 304 个只是 React Compiler 后缀（旧的 `selected_1`、我的 `selected`）。其余 216 个按 resolve 结果：我的置信度更高 155、旧的更高 57、相等 4。

随机抽 30 个"名字真不同"的（`artifacts/tmp/ref-align/conflicts.mjs`）：**我的对 24、旧的对 1、说不清 5。** 旧的错误多是"形状签名 LCS"把同一函数里相同形状的声明串位：`W = useRef(false)` 旧的给 prevRangeRef（旧版是 `useRef<…>(null)`），我的给 skipMeasurementRef（旧版 `useRef(false)`）；`_ = useRef(0)` 旧的 mountTime、我的 stalledIntensityRef；`ee = Oi(o)` 旧的 b11、我的 factoid；`r` 旧的 content（配到了另一个函数 linkifyUrlsInText）、我的 line。旧的对的 1 例：`c = (PATH||"").split(…)` 旧的 pathDirectories、我的 path（316 把两行合成了一行）。

**建议（给主控）**：其中 57 个旧名因置信度更高胜出、按抽查多数是错的。可在 resolve 里让 `via` 以 `align-` 开头的条目在同源分歧时优先，或把 reference-names.mjs 的局部名置信度下调；我没有改别人的文件。

### auto / propagate（auto2 的产出，source `auto`，优先级低于 reference）

我的名字与 auto 重叠 8,336 个（一致 4,290），与 propagate 重叠 1,231 个（一致 472），合计 9,554 个绑定；不一致时 reference 胜出。抽看两边各 12 例，分歧大多是"原名 vs 推断名"（mine `relPath` / propagate `relativePath`、mine `config` / propagate `globalConfig`、mine `half` / auto `max`、mine `contentWidth` / auto `max`），原名更准确的居多；但其中有 React Compiler 临时名盖掉 auto 描述性名字的情况（469 个 `t0`/`$` 类与 auto/propagate 重叠，例如组件参数 `t0` 盖掉 auto 的解构推断名）。任务要求临时名照旧版取，所以保留；**建议**主控在 resolve 里对 `note: "React Compiler 临时名"` 的条目让 auto 的描述性名字优先（这些条目都有 note 字段可识别）。

## 6. 已知限制

- **召回上限来自代码本身**：已匹配声明里剩下的压缩名，多数在 316 改写较多的代码里（第一遍整段 sim < 0.5 的对有 2,706 个；第二遍 16,610 个单元里约 1.3 万个找不到 sim ≥ 0.6 的旧版函数）。没有任何旧版归属的一方声明（约 2.4 万个 >150 字节）我做了实验：在全部旧版顶层声明里按锚点找最相似的，300 个样本里只有 13 个 sim ≥ 0.6，而且其中好几个是结构相近的不同函数（例如 `bedrockGuardrails` 配到 `familyHasSpecificEntries`），所以没有做全局搜索（`artifacts/tmp/ref-align/global-exp.mjs`）。
- 投票不一致而放弃的 27,480 个候选里，高相似度（sim ≥ 0.7）且最终仍是压缩名的约 1,900 个，主要是旧版绑定同时被多个 316 绑定投票（reverse 不够），常见于 316 把一个变量拆成两个或合并了两个变量。
- 名字是 2.1.88 的名字：316 语义变了的地方名字可能过时（抽查里的 `path`/`pathDirectories`、`credentials`/`output` 即属此类，两边都说得通）。
- 一一对应只在单个匹配对 / 单元内保证；跨匹配对（316 里复制的代码配到同一个旧版函数）不排斥，同一 316 绑定取置信度最高的那次。
- 超大声明（区间乘积 > 3e6）只靠唯一锚点切分，没有锚点的大空档放弃。
- 依赖 match.mjs / match-local.mjs 的匹配与文件归属；匹配错了的对，若整段相似度 ≥ 0.5 就照用（抽查未见此类错名，但不能排除）。
- 1–2 字符的旧版原名（非惯用短名）一律不取（3,570 个候选）。

## 7. 要加进 tools/pipeline.sh 的命令（由主控加）

放在 `reference-names` 之后、`auto-names` / `propagate` 之前（auto2 的 propagate 会把 reference 名字当传播源）：

```bash
step reference-align;   $N tools/naming/reference-align.mjs | cut -c1-300
```

输入：`analysis/match/decl-map.jsonl`、`analysis/match/local-map.jsonl`、`analysis/scan/decls.jsonl`、`analysis/reference/decls.jsonl`、`references/claude-code-analysis/src`、`original/`；`analysis/names/reference.jsonl` 只用于分歧统计（没有也能跑）。输出先写 `.tmp` 再改名。确定性：同样输入同样输出。

## 8. 调试与复现（artifacts/tmp/ref-align/）

- `REF_ALIGN_DEBUG=<目录>`：另写 `stats.json`、`cands.jsonl`（每个候选及被拒原因：agree / tie121 / lose121 / lowsim / lowconf / short / same / underscore）、`pairs.jsonl`（重配记录）、`units.jsonl`（第二遍）。`REF_ALIGN_LIMIT=<n>` 只跑前 n 个 316 文件，`REF_ALIGN_PASS2=0` 关第二遍。
- `show-pair.mjs <316 声明 id> [行数] [只看差异]`：打印一个匹配对的两侧 token 对齐。
- `sample.mjs`、`conflicts.mjs`、`pairsim.mjs`、`feat.mjs`（标注样本的特征）、`why.mjs` / `nocand.mjs`（剩余压缩名的原因分类）、`global-exp.mjs`（全局搜索实验）。
- `measure.sh <jsonl> <tag>`：用开工时的来源快照（A0）做同源前后对比。
- `final-stats.json`：最终运行的统计；`rename-report.json`、`apply.log`：改名引擎 --check 结果。
