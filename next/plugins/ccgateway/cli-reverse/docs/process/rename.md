# rename：作用域安全改名引擎与 α 等价校验

负责人：rename。写入范围：`tools/rename/`、`docs/process/rename.md`（另写了 `naming/README.md` 命名表规范）。

## 1. 交付物与用法

| 文件 | 作用 |
|---|---|
| `tools/rename/apply.mjs` | CLI / 库：`original/` + `naming/` → `runnable/` |
| `tools/rename/alpha-check.mjs` | CLI / 库：两棵树逐模块 α 等价 + 跨模块导入导出核对 |
| `tools/rename/lib/scope.mjs` | 作用域分析器（ES 模块严格模式语义），改名与校验共用 |
| `tools/rename/lib/rename.mjs` | 单模块改名：`renameModule`、`bindingsOf`、`makeOffsetMap`（供 `tools/emit` 复用） |
| `tools/rename/lib/global.mjs` | 跨模块：模块事实、导出改名计划 `buildGlobalPlan`、单线程 `planFromTree` |
| `tools/rename/lib/alpha.mjs` | 单模块比较 `compareModule`、跨模块 `crossCheck` |
| `tools/rename/lib/naming.mjs` | 命名表加载、合并（JSON / JSONL） |
| `tools/rename/lib/mentions.mjs` | 源码里"按文件名提及的模块"（require / Worker 路径），用于冻结导出名 |
| `tools/rename/lib/{parse,names,files,pool,worker}.mjs` | 解析选项、标识符合法性、文件列表、worker_threads 池 |
| `tools/rename/test/` | `node --test` 测试 + 工具：`gen-table.mjs`（压力命名表）、`babel-diff.mjs`（与 Babel 作用域差分）、`bun-smoke.mjs`（运行对拍） |

```bash
# 应用命名表（--check 生成后立刻做 α 校验）
node tools/rename/apply.mjs original naming runnable --force --report artifacts/tmp/rename-report.json --check
#   选项：--jobs n、--auto-import-names（外部模块别名导入用导入名作本地名，默认关）、--list-renamed（报告列出每个改名）
# α 校验（退出码 0 等价 / 1 有差异 / 2 运行错误）
node tools/rename/alpha-check.mjs original runnable --report artifacts/tmp/alpha-report.json
# 测试（全语料约 2.5 分钟；RENAME_CORPUS=0 只跑小测试；RENAME_BUN=1 加跑 Bun 对拍）
node --test "tools/rename/test/*.test.mjs"
# 辅助
node tools/rename/test/gen-table.mjs original out.json full|no-imports|collide|globals
node tools/rename/test/babel-diff.mjs original
node tools/rename/test/bun-smoke.mjs original runnable
```

库接口（lead 的阅读树生成器用）：

```js
import { renameModule, bindingsOf } from './tools/rename/lib/rename.mjs'
import { planFromTree } from './tools/rename/lib/global.mjs'
import { loadNaming } from './tools/rename/lib/naming.mjs'
const naming = loadNaming('naming')
const { plan } = planFromTree('original', naming.modules)          // 跨模块导出改名计划（约 6 秒）
const r = renameModule(file, source, naming.modules.get(file), plan)
// r = { code, edits:[{start,end,text}], offsetMap(o)→o', renamed, conflicts, rejected, warnings, stats }
// 顶层声明 [start,end) 在改名后代码里的文本：r.code.slice(r.offsetMap(start), r.offsetMap(end))
bindingsOf(file, source) // → [{ key:'@偏移', name, scope:'top'|'local', kind, declStart, topDeclStart, refs, frozen }]
```

`renameModule` 的第三个参数可以是 `naming.modules` 里的 Map 结构，也可以直接是命名表文件里的原始对象
（`{top:{…}, locals:{…}, "@N":…, exports:{…}}`）；第四个参数可以只给 `{exportRenames:{file:{旧:新}}}`。
`renameModule` 用同样的输入得到与 `apply.mjs` 逐字节相同的输出（已核对）。

## 2. 设计

### 2.1 基于偏移的文本替换

Babel 只用来解析和做作用域分析；输出时把原字符串里需要改名的标识符区间 `[start,end)` 换成新名字，其余字符一个不动。
因此空命名表时输出与 original 逐字节相同（文件头 `// @bun @bytecode` 注释、紧凑格式全部保留），Bun 运行风险最小；
`offsetMap` 也因此可以精确给出原偏移 → 新偏移（二分查找编辑表，区间两端都能映射，落在被替换标识符内部的偏移映射到替换文本末尾）。

需要改写结构而不是只换名字的位置：

| 原文 | 改名后 |
|---|---|
| 对象简写 `{a}` | `{a:newA}` |
| 解构简写 `{a}=o`、`{a=1}=o`、参数 `({a})` | `{a:newA}=o`、`{a:newA=1}=o` |
| `export {a}`（导出名不改） | `export {newA as a}` |
| `export {a as x}`（导出名改成 y） | `export {newA as y}` |
| `import {x as a}` | `import {x as newA}`；导出方把 x 改成 y 时 `import {y as newA}`，新本地名等于 y 时写成 `import {y}` |

JSX 在 2.1.316 里不存在（Bun 已编译掉），分析器遇到会报"不支持的节点"。

### 2.2 作用域分析器（lib/scope.mjs）

没有直接用 `@babel/traverse` 的作用域，原因：Babel 把函数表达式名和参数 / 函数体放在同一个作用域（`function f(f){}`、
`(function v(){let v})` 会被混成一个绑定），而且没有给出"var 提升穿过了哪些块"的信息。自写分析器按规范建模：

- 函数：函数表达式名作用域 → 参数作用域（非箭头函数带隐式 `arguments`）→ 函数体作用域；
  函数体里与参数同名的 `var` / 函数声明并入参数绑定。
- 块、`for (let …)`（头部作用域，含 for-in/of 右侧）、`switch`、`catch` 参数 + catch 块、类（类表达式名）、静态块。
- 严格模式：块内函数声明是块级绑定；`with` 不可能出现。
- `var` 提升：声明出现在语法作用域里，绑定在函数 / 模块作用域里；记录"穿过的作用域"（passOccs），改名时与引用同等对待
  （`{let x;{var v}}` 把 v 改成 x 会成为语法错误，必须拦下）。
- 直接 `eval`（被调用者是解析为全局的 `eval` 标识符）：调用处到模块作用域链上所有绑定冻结。

为了证明分析器本身没错，`test/babel-diff.mjs` 对每个标识符比较两边解析到的绑定（必须是双射）：
original 全部 2,650 个模块、2,715,671 个标识符 0 差异；在三种压力改名输出上也 0 差异（排除上面说的 Babel 自身的
函数表达式名混同，计数在 `skippedBabelLimitations`，original 上为 0）。

### 2.3 冲突检测

给作用域 S 里的绑定 b 起新名 X 时检查（全部按"当前最终名"，即考虑之前已经应用的改名）：

1. S 里已有别的绑定叫 X；
2. S 的"同名字空间伙伴"里有 X：参数 ↔ 函数体、catch 参数 ↔ catch 块（`function f(x){let x}` 语法错误）；
3. b 的引用 / 提升声明到 S 之间的内层作用域有 X（会被遮蔽）；
4. S 子树里有名为 X 的引用解析到 S 外（外层绑定或全局 `process`/`require`/`module`/`exports`/`Buffer`/`undefined`……，会被捕获）；
5. X = `module` 且某个出现后面紧跟 `{`（Babel 会把 `extends module{` 当成 module blocks 提案语法拒绝解析）。

冲突就试 `X_2`、`X_3`……。第 4 条用"穿越计数"实现：每个作用域维护 `名字 → 子树里穿过它向外解析的出现数`，
建表一次 O(引用×深度)，改名时增量更新；同一作用域同一基名的后缀从上次用到的序号继续。
第一版用"按名字列出所有引用再逐个判断是否在子树里"，全部改成 value/item 的压力表跑了 366 秒，换成穿越计数后 18 秒。

### 2.4 跨模块

两遍：第一遍（并行）收集每个模块的导入、导出、动态 import、文件名提及；`buildGlobalPlan` 决定每个模块的导出改名；
第二遍（并行）每个模块按计划改名。导出名冻结的模块（只改本地名）：

| 条件 | 原因 | 2.1.316 |
|---|---|---|
| 被 `import("./x.js")` 加载 | 命名空间对象被解构、`.then(m => m.foo)`、`(await import()).foo` | 1,527 处动态 import |
| 文件名在源码任何位置被提及（静态 import 来源除外） | `require("./chunk-x.js").foo`（551 处）、`import.meta.dir+"/…/hooks-worker.js"` | 311 个模块被提及 |
| 没有被任何模块静态导入 | 入口、Worker 脚本、只经 require 加载 | |
| `import * as ns` / `export … from` / `export * from` 涉及 | 按属性名访问 / 传递改名不做 | 本地模块 0 处 |
| 存在非字面量的本地 `import()` | 无法确定目标 | 0 处（全部冻结的开关） |

合计 1,041 个模块导出名冻结。**发现**：最初只按 `import()` 冻结（759 个），`require("./x.js")` 加载的约 280 个模块
导出名会被改掉，而 `-p hi` 的运行对拍覆盖不到这些路径，是靠扫描"文件名出现在哪些字符串里"发现的；现在用过近似
（按文件名匹配源码全文，包括注释）兜底，多冻结只会少改导出名，不会出错。

### 2.5 α 等价校验（lib/alpha.mjs）

- 两边各自独立解析、独立做作用域分析；同步遍历 AST：节点类型、字段集合、字面量原文（`extra.raw`）、括号、注释逐条
  （含文件头）必须一致；忽略位置和 `ObjectProperty.shorthand`。
- 标识符：绑定 / 引用两边解析到的绑定必须构成一致的双射（同时比较绑定种类 let/var/param…）；解析为全局的名字不能变；
  属性名、标签、私有名等非绑定名不能变；直接 eval 可见的绑定名不能变；绑定总数相同。
- 跨模块：每个模块的导出名映射是双射；导入方 `import {x}` 的 x 必须等于导出方的新导出名；外部模块（node 内建、
  资源）的导入名不变；导出名冻结的模块（同 2.4 的判据，由 A 侧独立计算）导出名不变。
- 文件集合相同；非 JS 资源和不能解析的 3 个 zstd 资源脚本必须逐字节相同。

## 3. 测试数据（2026-11-03，本机 20 线程，默认 12 个 worker）

语料：2,882 个文件 = 2,650 个可解析 JS 模块（约 48 MB）+ 3 个不能解析的压缩资源脚本 + 229 个资源。
绑定 674,774 个（不含隐式 arguments 138 个），其中 import 85,832、param 206,302、let 247,165、function 67,299、var 55,712；
比较的标识符 4,025,733 个；导入 specifier 85,427 个。冻结绑定 129 个（全部在 chunk-pwh5dx3n.js 的直接 eval 链上）。

| 测试 | 结果 | apply 耗时 | alpha 耗时 |
|---|---|---|---|
| (a) 空命名表 | 2,650 个模块逐字节相同；α 等价 | 9–12 s | 11–14 s |
| (b) 全量随机改名（每个绑定 → `原名_xxxx`） | 674,645 个绑定改名（= 全部 − 冻结），27,119 个导出改名，0 冲突；α 0 差异 | 9–15 s | 12–16 s |
| (b) 同上但不给导入绑定写条目（导入方走默认跟随） | 668,314 个绑定改名；α 0 差异 | 12–15 s | 14 s |
| (b') 局部全改成 `value`、顶层全改成 `item` | 525,531 次冲突自动加后缀；α 0 差异 | 11–19 s | 12–20 s |
| (b') 轮流改成 process/require/Object/undefined/module/exports/Buffer/console | 290,616 次冲突；α 0 差异 | 10–14 s | 10–14 s |
| lead 的 naming/final（2026-11-03 04:21 版） | 136,500 个绑定改名、4,067 个导出改名、3,018 次冲突、124 个被拒（直接 eval）；α 0 差异 | 12 s | 16 s |
| (d) scope.mjs vs @babel/traverse | 2,715,671 个标识符 0 差异 | — | 17 s |
| (e) Bun 1.4.4 运行对拍（`--version`、`--help`、`-p hi` 的请求体归一化后） | original 与上面 5 种改名输出全部一致 | — | 每棵树约 5 s |

runtime 成员用 `.rn-tmp/out-full`、`out-final` 跑了 42 个场景对拍，42/42 一致（见 WORKLOG 05:05）。

`node --test "tools/rename/test/*.test.mjs"`：46 个测试全部通过（单模块正例 18、α 负例 18、跨模块 5、全语料 5），约 2.5 分钟。

### 负例覆盖（每条都断言被拒绝且报告类别正确）

- 两个不同绑定改成同名导致捕获（内层遮蔽外层）→ `bijection` / `binding-kind`；同作用域改成同名 → B 无法解析；
  参数与函数体 var 合并 → `bijection`；
- 漏改一个引用（变成全局）→ `capture`；一个引用改成另一个绑定的名字 → `bijection`；全局 `process` 被改名 → `global`；
  全局引用被新局部绑定捕获 → `capture`；let ↔ var 种类变化；
- 属性名、简写键未展开、字符串、数字原文（`1` vs `0x1`）、正则标志、模板文本、注释、文件头注释、参数个数、运算符、
  标签名、私有名、括号 → 各自类别；直接 eval 可见的绑定被改名 → `eval`；
- 跨模块：导出改名未同步到导入方 → `import-sync`；导入了不存在的导出；导入方换成了另一个导出；外部模块导入名被改
  → `import-external`；被 `import()` 加载的模块导出名被改 → `frozen-export`；模块内两个导出改成同名；
- 端到端：applyNaming 生成后把一个导入方文件回退成旧版 → alphaCheck 报 `import-sync`；资源字节被改、文件缺失 → 文件级差异。
- 全语料压力输出在修复前被校验器拦下的真实错误（说明校验有效）：参数与函数体 `let` 同名（190 个模块"已声明"语法错误）、
  `class A extends module{`（6 个模块 Babel 拒绝解析）。

## 4. 已知限制

1. **α 等价是 AST 层面的**。依赖名字字符串的运行时反射不在保证范围：函数 / 类的 `.name`（函数声明、类声明、
   `let a=()=>{}` 的名字推断都来自绑定名）、`Function.prototype.toString()`、错误栈里的函数名会随改名变化。
   压缩后的名字本来就是任意的，正常代码不会依赖它们，但日志、错误栈、React 组件名会显示新名字。
2. 导出名冻结判据是启发式的过近似（第 2.4 节）。如果有模块通过既不是 `import()`、也不在源码里出现文件名的方式加载
   （例如运行时拼出 `"chunk-" + id + ".js"`），且它被别的模块静态导入，导出名会被改；2.1.316 里没有发现。
3. 直接 eval 链上的绑定（129 个）、Annex B catch var、`export var/function/class` 声明的绑定不改名（后两者 original 里 0 处）。
4. 冲突后缀是确定性的，但不一定是最小的（同作用域同基名的序号单调递增）；交换两个名字（a↔b）会得到 `b_2` 和 `a`。
5. 只保证 chunk 级正确。阅读树把同一源文件分散在多个 chunk 的声明聚合后，需要 lead 的生成器在模块级再检测一次冲突。
6. 只支持 ASCII 标识符作新名字；不支持 JSX、TypeScript（2.1.316 里没有）。
7. 校验器与改名器共用 `lib/scope.mjs`；用 Babel 差分（2.2 节）和 Bun 运行对拍兜底，没有第三套独立实现。

## 5. 坑

- Babel 8 对 `class A extends module{…}` 报"需要 moduleBlocks 插件"，是解析器按提案语法抢先识别 `module {`；合法 JS，但为了让
  整条流水线（scan、emit、alpha）都能解析，引擎避开这种改名。
- `apply.mjs --check` 动态导入 `alpha-check.mjs`，后者原先从 `apply.mjs` 导入 `listFiles`，形成"顶层 await 未完成的循环导入"，
  进程静默退出（Node 只打印 unsettled top-level await 警告）；`listFiles` 挪到 `lib/files.mjs`。
- 在 Git Bash 的 heredoc 里写含反斜杠的 JS 补丁会被转义吃掉，改用 Write 写补丁脚本。
- original 里 3 个"BOM 资源脚本"（chart.umd.min.js、hljsBundle.generated.min.js、mermaid.min.js）其实是 zstd 帧（`28 B5 2F FD`），不是 UTF-8 文本；按字节原样复制，不能读成字符串再写回。
