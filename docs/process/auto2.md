# auto2：自动命名增强（第五阶段第一波）

负责：`tools/naming/auto-names.mjs`（改）、`tools/naming/propagate.mjs`（新）、`tools/naming/lib/auto-common.mjs`（新，两者共用）；
产物 `analysis/names/auto.jsonl`、`analysis/names/propagate.jsonl`（source 都是 `auto`）。临时文件在 `artifacts/tmp/auto2/`。

## 1. 结果

自测口径：同一批 facade / reference / vendor / semantic（2026-11-03 13:20 时的 38 个 semantic 表），只换 auto 的两个表，
`resolve.mjs` → `readability.mjs` 前后对比（`artifacts/tmp/auto2/summary/{before,after}.json`）：

| | 前（剩余压缩名 / 可读率） | 后 | 按引用加权 |
|---|---|---|---|
| src 参数 | 136,606 / 17.7% | **102,156 / 38.5%** | 20.4% → 39.8% |
| src 局部 | 155,817 / 32.6% | **129,264 / 44.1%** | 33.7% → 44.8% |
| src 顶层 | 21,780 / 76.2% | 22,081 / 75.9% | 75.9% → 75.7% |
| vendor 参数 | 8,822 / 78.1% | 8,018 / 80.1% | |
| vendor 局部 | 9,664 / 80.9% | 9,477 / 81.2% | |
| vendor 顶层 | 2,387 / 74.2% | 2,401 / 74.0% | |

顶层多出的 ~300 个"压缩名"是有意去掉的错名：旧 `method-name` 规则给顶层起的 `freeze`、`encode`、`ceil`、`create`、`str`
（`Object.freeze(...)`、`x.encode(...)` 的返回值），以及未压缩模块里被误改的名字（见 2.1）。宁可留压缩名也不留错名。

改名引擎 `apply.mjs --check`：α 校验 moduleDiffs / crossModuleDiffs / fileDiffs 全 0；rejected 124，**全部是 vendor 表给
`chunk-pwh5dx3n.js`（protobufjs `inquire` 直接 eval，绑定冻结）的 `require_*` 名字，基线同样 124**，auto 两表新增拒绝 0
（建议 vendor-names 生成时跳过冻结绑定）。冲突加后缀 2,833 → 4,583，主要是 `method`（1,247，旧规则）、
`sole-prop`（820）、`call-result`（495）——同一作用域里两个绑定得到同一个名字，引擎加 `_2`。

产物：`auto.jsonl` 125,984 条（旧 100,499），`propagate.jsonl` 39,567 条。auto-names 约 2.5 分钟，propagate 约 50 秒。

## 2. 做法

### 2.1 修 bug：只改仍是压缩名的绑定

旧 auto-names 对所有模块所有绑定都套规则，未压缩模块（例：`build-report-lite-jwtbvm49.mjs`）里 `segments`→`parts`、`flat`→`replaced`、
`names`→`mapped`、`byId`→`create`。现在 `lib/auto-common.mjs` 的 `minifiedModuleOf` 用与 `tools/verify/readability.mjs` 相同的判定
（模块里 >60% 的非导入绑定名字 ≤3 字符），不是压缩模块整个跳过；压缩模块里也只给 ≤3 字符的绑定起名。
`build-report-lite` 在新 auto.jsonl 里 0 条。propagate 同样只给"压缩模块里 ≤3 字符的局部 / 参数"起名。

### 2.2 auto-names 新增 / 改动的规则

都在一次 Babel 遍历里做；同一绑定多条规则命中取置信度最高的。snake_case 键（`stop_reason`）一律转成 camelCase 变量名。

| via | 规则 | 置信度 |
|---|---|---|
| `member-loose` | `a = x?.foo` / `x.foo ?? d` / `x && x.foo` / `c ? x.foo : null` → `foo`（原 `member` 只认 `x.foo`） | 0.3 |
| `sole-prop` | 绑定的每个真实用途都是 `{foo: a}` / `this.foo = a` / `x.foo = a`（忽略 React Compiler 的 `$[n]` 缓存读写）→ `foo` | 0.4 |
| `react-props` | `function X(e){let …,{a,b}=e…}`，函数体里调了 React hook / 编译器缓存 `w(N)` → `props` | 0.45 |
| `use-state` | `[a, b] = useState(x.foo)` → `foo` / `setFoo`（hook 由 React chunk 里 `X=function(t){return s.H.useState(t)}` 自动识别） | 0.35 |
| `use-ref` | `a = useRef(x.foo)` → `fooRef` | 0.35 |
| `iter` | 扩展：集合可以经过 `filter/slice/sort/concat/reverse`、`Array.from(x)`、`[...x]`、`Object.values(x)`；加了 `findLast`、`reduce` 第二参；`singular` 改为按最后一个驼峰词（`toolUses`→`toolUse`、`allTools`→`tool`、`fooList`→`foo`、不规则复数表） | 0.3 |
| `iter-keys` | `Object.keys(x).map((a)=>…)` / `for (a of m.keys())` → `key` | 0.35 |
| `entries` | `for ([a,b] of Object.entries(x))` / `Object.entries(x).map(([a,b])=>…)` → `key`, `value`（`.entries()` 不认：数组是下标） | 0.4 |
| `reduce-acc` | `xs.reduce((a, b) => …)` 的 `a` → `acc` | 0.35 |
| `loop-index` | `for (let a = 0; …; a++)` → 按嵌套深度取下一个没被占用的 `i/j/k/idx` | 0.35 |
| `promise-executor` | `new Promise((a, b) => …)` → `resolve`, `reject` | 0.5 |
| `event` | 参数上调了 `.preventDefault()` / `.stopPropagation()` / `.stopImmediatePropagation()` / `.currentTarget` / `.defaultPrevented` → `event` | 0.4 |
| `ink-input` | 参数用到 `upArrow/downArrow/escape/backspace/pageUp/wheelUp…` → `key`，其前一个参数 → `input` | 0.45 |
| `error-message` | Error 子类 `constructor(a){super(a)}` → `message`（自定义基类且 super 还有字符串参数时不认） | 0.45 |
| `catch` | 扩展：`p.catch((e)=>…)`、`p.then(_, (e)=>…)` | 0.4 |
| `split-lines` | `a = s.split("\n" / /\r?\n/ / 换行模板)` → `lines`；`for (x of s.split("\n"))` → `line` | 0.4 |
| `known-call` | 加 `setTimeout`→`timer`、`setInterval`→`interval`、`structuredClone`→`clone`、`Date.parse`→`timestamp`、`Promise.withResolvers`→`deferred` 等；只认全局（未被局部遮蔽） | 0.35 |
| `method` | 加 `x.at(-1)`→`last`、`x.at(0)`→`first` | 0.3–0.35 |
| `method-name` | **收紧**：只认 getter 类动词（`x.getFoo()`/`loadFoo`/`readFoo`/`findFoo`… → `foo`），去掉后的名字仍以动词开头的不要。旧规则把任意方法名当结果名（`safeParse`、`subscribe`、`str`、`freeze`、`encode`），抽查正确率约 55% | 0.25 |

保留不变的旧规则：`destructure`（加了嵌套模式）、`member`、`method`、`new`、`class-name`、`string-const`、`env`、`external-import`、`for-in`。

### 2.3 propagate.mjs：跨函数传播

1. **收集事实**（一次遍历所有 chunk）：每个绑定的键 `file@偏移`；函数声明 / `const f = (…) =>` / 类构造函数的参数表；
   每个调用 `f(…)` / `new F(…)` 的实参描述（局部绑定、`x.foo` → `foo`、`getFoo()` → `foo`）；`a = f()` 的结果；
   for-of / 迭代回调的元素；`useState` / `useRef`。
2. **名字来源**：`analysis/names/*.jsonl`（除 `propagate.jsonl` 自己）+ `naming/semantic-*.jsonl`，按 resolve.mjs 的优先级
   （facade > semantic > vendor > reference > auto，再比置信度）取每个绑定当前最好的名字。未压缩模块里的原名也算证据。
   太弱的 auto 名（`method`、`method-name`、`known-call`、`loop-index`、`for-in`、`entries`、`reduce-acc` …）不当证据；
   `method` / `method-name` 起的名字（`filtered`、`mapped`）允许被传播出来的名字覆盖。
3. **跨 chunk**：被调用者是导入绑定时，按 `import {X as y} from "./chunk-…"` 找到导出方 `export {local as X}` 的声明（导出链最多追 8 层）。
4. **规则**（每轮先收集所有提议、再一起采纳，到不动点为止；2.1.316 上 3 轮收敛）：

| via | 规则 | 置信度 |
|---|---|---|
| `call-arg` | `f(a)`：被调函数第 i 个参数已命名 `foo` → 实参 `a` = `foo`。所有调用一致（或 ≥3 次里 ≥2/3）；`f` 的调用点 ≤3 个（被到处调用的工具函数参数名太泛，例 `jsonStringify(value)`）；实参是循环元素的不改（交给 iter-name）；`value/input/data/item/arg…` 这类泛名不当证据 | 0.35–0.45 |
| `call-param` | 所有调用点的实参名（标识符名、`x.foo`→`foo`、`getFoo()`→`foo`）≥75% 一致，且一致的调用 ≥2 个、≥调用点的一半；或函数只有一个调用点 → 参数 = 这个名字 | 0.35–0.45 |
| `call-result` | `a = getFoo(…)` / `await loadFoo(…)` / `getFoo().then((a)=>…)` / `[a,b] = await Promise.all([getA(), getB()])` 且 `getFoo` 已有名字 → `foo`（动词表见 `resultNameOf`；`useFoo(selector)` 跳过） | 0.35 |
| `iter-name` | `for (a of messages)` / `messages.map((a)=>…)`，集合是已命名的局部 → `message` | 0.35 |
| `use-state` | `[a, b] = useState(…)`，一边已命名 → 另一边 `setFoo` / `foo` | 0.4 |
| `use-ref` | `a = useRef(foo)` 或 `a.current = foo` 只有一种值 → `fooRef` | 0.35 |

`call-arg` / `call-param` 找到的名字**不再当下一轮的证据**：第一版允许链式传播，抽查 call-arg 只有约 71% 正确
（`e`→`a5`、`n`→`originalHeadCommit` 这类在链上越走越偏），去掉后升到约 90%。`call-result` / `iter-name` / `use-state` 的名字可以继续传。
note 字段写证据：`passed as foo (2 calls) [reference/param] r1`（参数名的来源与轮次）、`callers pass foo (3/4)`、`= getFoo()`、`element of foos`。

## 3. 抽查（每条随机 ≥30 例，`node artifacts/tmp/auto2/sample.mjs <jsonl> <via> 30 <seed>`）

| 表 | via | 命中 | 抽查 | 正确 | 备注 |
|---|---|---|---|---|---|
| auto | destructure | 41,226 | 30 | 30 | 旧规则 |
| auto | sole-prop | 18,105 | 30 | 29 | `t`→`keywords`（hljs 语言定义里 `keyword:` 键的那份对象）勉强 |
| auto | method | 14,711 | 30 | 30 | 名字泛（`filtered`、`mapped`）但不错 |
| auto | member | 10,085 | 30 | 30 | 会出现 `CLAUDE_JOB_DIR` 这类全大写名（`e=env.CLAUDE_JOB_DIR`） |
| auto | catch | 9,370 | 30 | 30 | |
| auto | iter | 4,227 | 30 | 30 | |
| auto | known-call | 3,781 | 30 | 30 | |
| auto | member-loose | 3,222 | 30 | 30 | |
| auto | loop-index | 2,467 | 30 | 30 | |
| auto | entries | 2,128 | 30 | 30 | 去掉 `.entries()` 后（数组 `.entries()` 第一项是下标，原先 ~25% 错） |
| auto | method-name | 2,112 | 30 | 29 | 收紧后；旧版约 55% |
| auto | react-props | 975 | 30 | 30 | |
| auto | promise-executor | 900 | 30 | 30 | |
| auto | iter-keys | 881 | 30 | 30 | |
| auto | reduce-acc | 550 | 30 | 30 | |
| auto | split-lines | 145 | 30 | 30 | |
| auto | event | 133 | 30 | 30 | 第一版用 `.target`+`.key` 判定，误中 eval grader 谓词，已去掉 |
| auto | error-message | 121 | 30 | 30 | 自定义基类 `super(e,"code","msg")` 已排除 |
| auto | use-state | 42 | 30 | 29 | `[k,I]=useState(N.wall)` → `wall/setWall` 偏弱 |
| auto | ink-input | 37 | 37 | 37 | 全量 |
| auto | use-ref | 5 | 5 | 5 | 全量；首字母大写的 `NEGATIVE_INFINITYRef` 已排除 |
| propagate | call-param | 19,497 | 40 | 38 | 错例：参数是 store 却按调用处的 `shown` 命名 |
| propagate | call-result | 13,019 | 40 | 38 | 错例：`useAppState(selector)`（已修）、`useSpinnerField("x")`→`spinnerField` 偏弱 |
| propagate | call-arg | 4,655 | 40 | 36 | 错例：`n=Il()`（worktree 会话）→`originalHeadCommit`；`e`→`live` 存疑 |
| propagate | iter-name | 2,312 | 35 | 35 | `allAgent` 已改成 `agent` |
| propagate | use-ref | 79 | 30 | 29 | `nodeId_3Ref`（引擎后缀进了证据）已修 |
| propagate | use-state | 5 | 5 | 5 | 全量 |

没上线的规则：`a = await fetchX()`/`getX()` 的局部函数版就是 `call-result`；`setTimeout` 返回值 → `timer` 并进了 `known-call`；
`.exec` → `match` 原 `method` 表已有；`new AbortController()` 原 `new` 规则已覆盖（→ `abortController`）。
`entries` 的 `.entries()`（约 75% 正确）和旧 `method-name`（约 55%）低于 90%，已下线 / 收紧。

## 4. 已知限制

- 参数仍是最大缺口（src 还剩 10.2 万）：大量参数所在函数没有已命名的调用者也没有已命名的实参（React 组件内部闭包、
  回调参数、对象方法），传播够不到；组件 props 解构之外的局部多数是 React Compiler 的 `$[n]` 缓存临时变量（`let T; if ($[0]!==f) T=…`），
  `sole-prop` 只覆盖了它们中"只被放进一个属性"的那部分。
- `method` 旧规则的名字（`filtered`、`mapped`、`found`、`joined`）正确但信息量低，且同一函数里多处 `.filter()` 会得到 `filtered_2`、`filtered_3`；
  propagate 允许覆盖它们，但只在有更好证据时。
- 只解析直接调用 `f(…)`；`obj.method(…)`、`f.call(…)`、回调传给其他函数后的调用都不追。
- 命中的置信度都 ≤0.5，任何 vendor / reference / semantic 名字都会压过它们。
- `call-param` 用单个调用点时置信度 0.35，误名多半出在这里（调用处变量名描述的是调用者的语境）。

## 5. 加进 tools/pipeline.sh（由主控加）

顺序：auto-names 在 vendor / ref-align 之前（它们不读 auto），propagate 在所有名字来源之后、resolve 之前：

```bash
step auto-names;   $N tools/naming/auto-names.mjs                 # → analysis/names/auto.jsonl（已有，原位置不变）
# … vendor-names、ref-align …
step propagate;    $N tools/naming/propagate.mjs                  # → analysis/names/propagate.jsonl（读全部 names + naming/semantic-*）
step resolve;      $N tools/naming/resolve.mjs | head -10
```

（`$N` 用 pipeline.sh 里的定义；两者都先写临时文件再改名。）
