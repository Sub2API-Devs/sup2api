# deminify：阅读树去压缩痕迹 + 同一导入多别名合一

负责人：deminify。写入范围：`tools/emit/deminify.mjs`（新）、`tools/emit/deminify-dir.mjs`（新）、`tools/emit/readable.mjs`（调用 deminify、符号索引行号）、`tools/verify/readable-check.mjs`（改成逐文件处理，内存）、本文件、`artifacts/tmp/deminify/`。

## 1. 结论先行

- `tools/emit/deminify.mjs` 是一个 Babel AST 变换，`readable.mjs` 在 prettier 之前对每个输出文件调用一次（`--no-deminify` 可关）。规则 15 条（第 3 节），另有 3 条只做统计的保护计数。
- 新阅读树（`artifacts/tmp/deminify/reconstructed`，与 `reconstructed/` 同一套输入）：
  - 同一导入多别名 **51,842 → 0**（885 个文件），导入说明符 185,554 → 133,712；`//@ cross-chunk alias` 9 → 0；
  - `!0`/`!1` 81,415 → 0，`void 0` 69,890 → 0，可简写属性 55,215 → 0，`typeof x > "u"` 392 → 0；
  - 语句位置的逗号表达式 38,643 → 0，`return`/`throw` 逗号表达式 16,883 → 0，`if (a(), b)` 12,876 → 0，箭头函数逗号体 696 → 0，语句位置 `&&`/`||` 211 → 0、`?:` 108 → 0，多声明符 `let a, b` 47,979 → 0（for 头里的 237 处按规则保留）；
  - 行数 2,209,162 → 2,484,445（+12.5%），字节 79.08 MB → 79.29 MB。
- **等价性**（第 4 节），四层：
  1. 运行时：同一变换作用于 `runnable/` 的拷贝 → `node tools/verify/compare.mjs original artifacts/tmp/deminify/runnable-dm`：**54/54 一致，预期 54/54 满足，无不稳定场景**；
  2. 静态全覆盖：2,650 个可运行模块逐个比较"规范形"（把每条规则都规约掉的标准形式），**0 个差异**；打印器自身往返（不加任何规则）**0 个差异**；负对照（改一处 true/undefined/if 条件/删一条语句）全部被检出；
  3. 阅读树：`--no-deminify` 与默认输出逐文件比规范形，7,053 个文件中 7,046 个相同，其余 7 个恰好是含 `//@ cross-chunk alias` 的文件（9 条别名常量被去掉，设计如此，见 3.2）；
  4. 17 个手写边界用例（`artifacts/tmp/deminify/selftest.mjs`）变换前后在 node 下输出逐字一致。
- 阅读树静态校验：**0 解析错误、0 重复声明、0 缺失导入文件/名字、81,667/81,667 声明各一次、自由标识符 31 个且与 `reconstructed/` 名单完全相同**；JSDoc、文件头、`//@` 出处行全部保留（`comments-lost` = 0）。
- 顺带修了两处：`readable-check.mjs` 原来同时保留 7,053 个 AST，在 8,000 MB 下对**现有** `reconstructed/` 就已经 OOM（我第一次跑基线就崩了），改成逐文件处理后约 55 秒、内存充足；`symbols.jsonl` 的行号对多名字声明全指向第一行，拆开声明后改为指向各自那一行，"名字出现在所指行"从 80,395/100,842（79.7%）升到 99,943（99.1%）。

## 2. 用法

```bash
# 阅读树（默认就做 deminify；--no-deminify 关闭）
node --max-old-space-size=8000 tools/emit/readable.mjs [--out reconstructed]

# 等价性证明：同一变换作用于 runnable 的拷贝，再做运行时对照
node --max-old-space-size=8000 tools/emit/deminify-dir.mjs runnable artifacts/tmp/deminify/runnable-dm --force --check-printer --check-canonical
node tools/verify/compare.mjs original artifacts/tmp/deminify/runnable-dm --name deminify-runnable-dm
```

- `deminify-dir.mjs <src> <dest> [--force] [--no-unify] [--only a.js,b.js] [--report x.json] [--check-printer] [--check-canonical]`：整目录复制，`*.js`/`*.mjs`（不含 `*.min.js`）逐个变换；报告默认写到 `<dest>.deminify.json`（每文件命中数、两种静态检查的差异列表）。全量 2,650 个文件约 100 秒，带两种检查约 200 秒（`--max-old-space-size=8000` 内）。
- `readable.mjs` 末尾打印 `[emit] deminify {...}` 命中统计和 `deminifyFailures`（解析失败的文件原样保留；本次 0）。整棵树 deminify 约 40 秒。
- 库接口：`deminifyCode(code, {unify, crossChunkAlias}) → {code, stats, error?}`，`equivalentByCanon(a, b)`、`printerRoundTrip(code)` 返回 `null` 或第一处差异的 AST 路径。

建议主控加进 `tools/pipeline.sh`（readable 之后，可选，约 6 分钟）：上面"等价性证明"两条命令。

## 3. 规则、命中次数与等价性论证

命中次数：**阅读树**（readable.mjs，按输出模块）/ **runnable**（按 chunk）。两者的 import-alias 差别大，是因为阅读树把多个 chunk 合进一个文件，别名主要就是这样来的。

| 规则 | 变换 | 阅读树 | runnable |
|---|---|---|---|
| import-alias | 同来源同导入名的多余说明符删除，引用改用保留名 | 51,842 | 2,406 |
| cross-chunk-alias | `const a = b; //@ cross-chunk alias` 删除，`a` → `b` | 9 | 0 |
| bool | `!0` → `true`，`!1` → `false` | 81,415 | 81,433 |
| void0 | `void 0` → `undefined` | 69,890 | 69,900 |
| shorthand | `{a: a}` → `{a}`，`{a: a = 1}` → `{a = 1}` | 55,233 | 55,233 |
| typeof-u | `typeof x > "u"` → `typeof x === "undefined"`（`<` → `!==`，含镜像与 `>=`/`<=`） | 392 | 392 |
| seq-stmt | 语句 `a(), b();` → `a(); b();` | 38,913 | 38,934 |
| seq-return / seq-throw | `return a(), b;` → `a(); return b;`（throw 同） | 15,509 / 1,374 | 15,511 / 1,376 |
| seq-if-test | `if (a(), b) S` → `a(); if (b) S` | 12,876 | 12,879 |
| arrow-seq | `() => (a(), b)` → `() => { a(); return b; }` | 696 | 696 |
| logical-stmt | 语句 `x && y();` → `if (x) y();`，`x \|\| y();` → `if (!x) y();` | 864 | 864 |
| cond-stmt | 语句 `c ? a() : b();` → `if (c) a(); else b();` | 298 | 299 |
| split-decl | `let a = 1, b = 2;` → 两条声明 | 47,979 | 47,988 |
| braces-added | 上述替换发生在单语句位置（if/else/循环体/标签体）时包一层 `{}`（统计） | 24,998 | 25,002 |
| import-alias-kept / import-fresh-name / cross-chunk-alias-kept / void0-shadowed / seq-kept-string | 保护分支（见下），本次全部 0 次 | 0 | 0 |
| comments-lost | 输入里的注释变换后没有挂在任何节点上（必须为 0） | 0 | 0 |

logical-stmt / cond-stmt 的命中数比变换前树里的统计（211 / 108）多，是因为逗号表达式拆开后露出了更多语句位置的 `&&`、`?:`（访问器会继续处理替换出来的新语句）。

规则按三遍执行，每遍重新建立作用域：①别名合一 ②标记可替换的 `void 0` ③其余改写。改写不新增、不删除、不改名任何绑定（第①遍只改引用名，见 3.1），所以第③遍不会影响作用域判断。

### 3.1 import-alias：同一导入只保留一个本地名

`import { join, join as join_2 } from "path"` 两个说明符在本模块里是两个绑定，但都是指向**同一个模块记录的同一个导出绑定**的只读活绑定：同一模块里同一 specifier + 同一 import attributes 的请求，宿主必须返回同一个模块记录（ECMA-262 HostLoadImportedModule 的幂等要求），命名空间对象每个模块也只有一个。所以所有别名在运行时不可区分（读到的永远是同一个值；对任一个赋值都是同样的 TypeError）。

做法：按 `(来源, attributes, 导入名)` 分组（`*`、`default` 也分组），选一个保留名：优先与导入名相同的那个，其次 `导入名_N` 中 N 最小的，再其次最短的。对每个别名的每处引用（含赋值目标、`export { x as y }` 的本地名、对象简写里的值），检查在**引用所在作用域**里用保留名解析到的是否正是保留的导入绑定（`scope.getBinding`）；任何一处会被局部绑定遮蔽，就换下一个候选；所有候选都不行时用一个全文件都没出现过的新名字（`导入名_N`），新名字不可能被遮蔽。导出说明符只改本地名，导出名不变（`export { r1 as r2 }`）。删掉说明符后若一条 import 变空，保留为 `import "x"`：模块请求列表的顺序与内容不变，求值顺序不变。

本次 0 次需要换候选、0 次用新名字（`randomUUID_2…_21` 在各自作用域里都没有同名局部绑定）。

例（`src/cli/print.js` 开头）：

```js
// 前
import { randomUUID, randomUUID as randomUUID_2, …, randomUUID as randomUUID_21 } from "crypto";
import { join, join as join_2, …, join as join_7, sep, dirname } from "path";
    uuid: randomUUID_4(),
// 后
import { randomUUID } from "crypto";
import { join, sep, dirname } from "path";
    uuid: randomUUID(),
```

一方模块之间的导入同样处理（来源是相对路径）。经由不同路径到达同一声明（例如 A 从 B 导入 x，又从再导出 x 的 C 导入 x）不合并：来源不同，说明符层面无法证明是同一个；`readable.mjs` 生成时已经按 `resolveExport` 把再导出链解析到声明所在文件，实际阅读树里没有这种情况（变换后重复说明符为 0）。

### 3.2 cross-chunk-alias（只在阅读树）

`readable.mjs` 在"chunk A 导入的 x 其实就定义在同一个输出模块里"时写 `const x_2 = x; //@ cross-chunk alias`。原始程序里 `x_2` 是 `import {x as x_2}` 的活绑定，直接用 `x` 比 const 拷贝更贴近原语义（拷贝在 `x` 之后被重新赋值时会过时，在 `x` 初始化前求值会进 TDZ）。条件：别名常量没有被赋值、所有引用处用 `x` 解析到模块顶层的 `x`，否则保留（本次 0 次保留）。runnable 没有这种行，运行时对照覆盖不到；阅读树规范形对比里恰好这 7 个文件、9 行不同，其余全同。

### 3.3 bool：`!0` / `!1`

`!` 对数字字面量只做 ToBoolean 再取反，`!0` 恒为 `true`、`!1` 恒为 `false`，没有副作用。替换是把一元表达式换成更高优先级的原子表达式，不会改变周围的结合（`-!0` → `-true` 仍是 −1，`(!0).x` → `true.x`），括号由打印器按 AST 决定。

### 3.4 void0：`void 0` → `undefined`

`void 0` 恒为 undefined。标识符 `undefined` 只有两种可能：解析到某个局部绑定（参数、变量、catch 参数、函数/类名、导入），或解析到全局对象的 `undefined` 属性——后者自 ES5 起不可写、不可配置，值恒为 undefined。所以只要在**该处作用域**里 `undefined` 没有绑定（`scope.getBinding('undefined')`，覆盖所有外层），替换就等价。所有文件都是 ES 模块（严格模式）：没有 `with`，直接 eval 也不能往外层作用域注入绑定，所以静态判断是完整的。`delete void 0` 不替换（`delete undefined` 在严格模式是语法错误）。本次 0 处被遮蔽（自测里覆盖了参数和局部 `const undefined`）。

### 3.5 shorthand

规范把 `{a}` 定义为 `{a: a}`（PropertyDefinition: IdentifierReference），把模式里的 `{a = 1}` 定义为 `{a: a = 1}`（SingleNameBinding）；只改打印形式。排除：计算键、字符串键、`__proto__`（对象字面量里 `{__proto__: x}` 设置原型，`{__proto__}` 定义自有属性，两者不等价；模式里虽然没区别也一并排除）。值是 Identifier 节点说明它本来就是标识符引用，不会出现 `{yield}` 之类的保留字问题。打印器自身往返检查把 `shorthand` 标志之外的差异都算差异。

### 3.6 typeof-u

`typeof` 的结果只可能是 `"undefined" "object" "boolean" "number" "bigint" "string" "symbol" "function"`（Bun/JSC 没有 `document.all`）。按码元比较，`"undefined" > "u"`（`"u"` 是它的真前缀），其余都以小于 `u` 的字母开头；没有一个等于 `"u"`。所以 `typeof x > "u"` ⇔ `typeof x >= "u"` ⇔ `typeof x === "undefined"`，`<`/`<=` ⇔ `!==`，`"u" < typeof x` 等镜像同理。两边都只求值一次 `typeof x`（对未声明标识符都不抛错）。自测对 9 种值 × 6 种写法逐一核对。

### 3.7 逗号表达式拆成语句：seq-stmt / seq-return / seq-throw / seq-if-test / arrow-seq

- `a, b;`（表达式语句）：先求 a 再求 b，结果丢弃；`a; b;` 完全相同。语句的完成值只对 `eval`/脚本的结果可见，这些模块不是 eval 的输入。
- `return a, b;` / `throw a, b;` / `if (a, b) S else T`：都是先求 a、再求 b，然后用 b 的值返回/抛出/判断；拆成 `a; return b;` 等顺序不变。生成器/异步函数里的 `yield`/`await` 只是表达式的一部分，跟着各自的表达式走，求值顺序不变（自测 `gen`）。
- `(…) => (a, b)` → `(…) => { a; return b; }`：简洁体就是"求值并返回"；`this`/`arguments`/`new.target`/`super` 在箭头函数里两种写法都是词法的；没有引入声明，所以参数表达式作用域与函数体作用域的区分无关；`async` 箭头里的 `await` 照常。
- **指令序言**：拆出来的语句如果是裸字符串字面量，放在函数体/块开头会变成指令（`"use strict"` 会改变语义）。前面若干个表达式里有裸字符串时整条不拆（`seq-kept-string`，本次 0 次；runnable 里 605 处只是 `return …, "failed"` 这种最后一个是字符串，最后一个不会变成表达式语句，照常拆）。
- **单语句位置**（`if (x) a(), b();`、`for (…) a(), b();`、`l: a(), b();`、`else if (a(), b)`）：替换成块 `{ a(); b(); }`。块会新建词法环境，但里面只有表达式语句/`if`，没有词法声明，不可观察。标签放在块上：原来标签在表达式语句上，没有任何 `break l`/`continue l` 能指向它（表达式里不能出现跨函数的 break），所以也不变。
- **ASI**：输出由 Babel 打印器按 AST 生成，每条语句都有分号，不依赖 ASI。

例（`src/utils/Shell.js`）：

```js
// 前
if ((session?.setCwd(Ja), setCwdForCallChain(Ja), permissionCheckedCwdOf(session) !== void 0))
  return (
    logFeatureSad("mcp_serve_call_directory", "start_directory_gone"),
    createFailedCommand(`Working directory "${cwd}" is gone …`)
  );
// 后
session?.setCwd(Ja);
setCwdForCallChain(Ja);
if (permissionCheckedCwdOf(session) !== undefined) {
  logFeatureSad("mcp_serve_call_directory", "start_directory_gone");
  return createFailedCommand(`Working directory "${cwd}" is gone …`);
}
```

（`src/cli/print.js`）：

```js
// 前
async function handleOrphanedPermissionResponse({ message: message, setAppState: setAppState, …, denyIsRefusal: denyIsRefusal = isPermissionCardHoldEnabled() }) {
  let nt = (ie, Se) => (logForDiagnosticsNoPII("warn", "cli_orphan_answer_dropped", () => ({ … })), !1);
// 后
async function handleOrphanedPermissionResponse({ message, setAppState, …, denyIsRefusal = isPermissionCardHoldEnabled() }) {
  let nt = (ie, Se) => {
    logForDiagnosticsNoPII("warn", "cli_orphan_answer_dropped", () => ({ … }));
    return false;
  };
```

### 3.8 logical-stmt / cond-stmt

- `x && y;`（语句）：求 x；ToBoolean(x) 为真才求 y；结果丢弃 ⇔ `if (x) y;`。`x || y;` ⇔ `if (!x) y;`：`!` 只做 ToBoolean，ToBoolean 不调用任何用户代码（不会触发 `valueOf`/`toString`/getter），所以不多求值任何东西；`!a || y` 直接写成 `if (a) y`。`??` 不处理（不是 ToBoolean）。
- `c ? a : b;`（语句）⇔ `if (c) a; else b;`。
- **悬空 else**：新的 `if` 若成为某个带 else 的 `if` 的 consequent（直接或经 `for`/标签等嵌套），打印器会给外层 consequent 加花括号；规则本身在"新 if 恰好是 if 的 consequent"时也主动加块。规范形检查会把任何 else 归属变化报出来（负对照 `if(a)if(b)c();else d()` 与 `if(a){if(b)c()}else d()` 被判为不同）。自测 `dangling`。

### 3.9 split-decl

`let a = 1, b = 2;` → `let a = 1; let b = 2;`（var/const 同）。声明在进入作用域时就整体实例化（var 提升、let/const 进入 TDZ），与它们写在几条语句里无关；初始化按源码顺序逐个声明符进行，拆开后顺序不变；`let p = 1, q = () => r, r = p + 1` 这类前面引用后面的写法，TDZ 行为也相同（自测 `splitDecl`）。不拆：`for (let i = 0, j = 1; …)` 头部（每次迭代复制绑定，必须是一条声明；237 处保留）、`export var a, b`、`using`。在单语句位置只可能是 `var`（`else var a = 1, b = 2;`、`l: var …`），拆后包块：块内 var 仍提升到函数作用域，等价（自测 `elseVar`）。

### 3.10 注释、文件头、出处行

- Babel 把注释挂在节点上；替换节点时，旧节点的注释被搬到新节点上，所以 JSDoc、文件头 `/** … */`、`//@ chunk:start-end …` 都跟着声明走。
- 坑：两条语句之间的注释同时是前一条的 trailing、后一条的 leading。前一条被替换后，新节点没有位置信息，打印器会把这条注释接在新节点**行尾**，`//@` 出处行就不再位于行首（readable-check 的声明覆盖从 81,667 掉到 78,127 就是这样发现的）。处理：替换出来的节点上，已作为别的节点 leading 注释的 trailing 注释删掉（只交给后一条打印）。
- 每个文件都检查"输入中的每条注释在输出 AST 中仍挂在某个节点上"（`comments-lost`），全树 0。`//@ cross-chunk alias` 是随别名行一起删的，不计。
- 阅读树对比里 JSDoc 行数 31,920 → 36,000 不是 deminify 造成的：`naming/docs-s*.jsonl` 在 `reconstructed/` 生成之后又增加了说明（`--no-deminify` 的输出同样多）。

### 3.11 打印器层面的两处细节

- **`// @bun` 指令**：Bun 只认文件第 0 字节开始的 `// @bun`。`original/` 的每个 chunk 都以 `\n// @bun @bytecode` 开头，指令**不生效**；Babel 打印器会丢掉开头的换行，指令就生效了，Bun 不再转译模块，`cli.js` 里的 `require(...)` 报 `require is not defined`——第一次运行时对照 54 个场景全部失败就是这个原因。`deminifyCode` 保留输入开头的空白。
- **逻辑运算的右结合括号**：打印器把 `a && (b && c)` 打成 `a && b && c`（值与短路顺序相同，`&&`/`||`/`??` 满足结合律，但树不同）。打印前给右侧同运算符的子表达式加显式括号，保证输出重新解析得到同一棵树；阅读树随后的 prettier 会再去掉这些括号，不影响可读性。

## 4. 等价性证明

### 4.1 运行时对照（runnable）

`runnable/` 是主控用改名引擎生成的、与 original 同 chunk 布局的可运行树（10:49 生成，与 `naming/final` 同批）。拷贝后用 `deminify-dir.mjs`（`unify: true`，与阅读树同一个函数；`crossChunkAlias` 在 runnable 里不存在）变换全部 2,650 个模块（0 个跳过），然后：

```
node tools/verify/compare.mjs original artifacts/tmp/deminify/runnable-dm --name deminify-runnable-dm
- 场景：54；归一化后一致：54；预期满足：基线 54，候选 54
- 重跑后才一致（不稳定）的场景：无
```

报告：`artifacts/tmp/deminify/deminify-runnable-dm.{json,md}`（compare.mjs 写在 `analysis/verify/`，已挪到我的目录下，免得混进 verify 成员的结果）。

### 4.2 静态全覆盖：规范形

运行时场景只走到执行过的代码。`equivalentByCanon(输入, 输出)` 对**每个文件的每一行**做静态检查：把两边都化到一个规范形，再逐节点比较 AST（忽略位置、注释、`extra`）。规范形把每条规则都规约掉：导入的每处引用改成 `$import:<来源>|<attributes>|<导入名>`、删掉说明符列表；`true/false` → `!0/!1`；全局 `undefined` → `void 0`；各种 typeof 比较 → `typeof x > "u"` / `< "u"`；语句位置的逗号表达式、return/throw/if 条件里的逗号表达式、箭头函数逗号体 → 语句列表；多声明符 → 单声明符；语句位置 `&&`/`||`/`?:` → if；if 条件去掉 `!!`；单语句位置里"只有一条非词法声明语句的块"视为该语句。每一步都是 3 节里论证过的等价变换，所以**两边规范形相同 ⇒ 输出与输入语义相同**；反过来规范形不对 `shorthand` 之外的任何东西放水（调用顺序、else 归属、绑定解析、字面量值都参与比较）。

- runnable 2,650 个文件：`canonDiffs` **0**。
- 打印器自身往返（不加任何规则，只 parse → print → parse）：`printerDiffs` **0**（只容许 `shorthand` 标志与单语句位置的单语句块）。
- 负对照（`artifacts/tmp/deminify/mutate.mjs`，在真实 chunk 的变换结果上改一处）：`return true` → `return false`、`=== undefined` → `=== null`、`if (x)` → `if (!x)`、删掉一条调用语句——全部检出；手写负对照（`a&&b()` 对 `if(!a)b()`、调换两条语句顺序、别名合一后引用被参数遮蔽、悬空 else 归属改变）全部检出。

### 4.3 阅读树

`readable.mjs --no-deminify` 与默认输出逐文件比规范形（`artifacts/tmp/deminify/canon-trees.mjs`）：7,053 个文件里 7,046 个相同；7 个不同的恰好是含 `//@ cross-chunk alias` 的 7 个文件（`commands.js`、`commands/model/model.js`、`plugins/bundled/claudeTest/constants.js`、`services/api/client.js`、`services/mcp/config.js`、`utils/sessionStorage.js`、`utils/transcriptRequestBlobs.js`），差别是顶层少了别名常量，见 3.2。

`tools/verify/readable-check.mjs artifacts/tmp/deminify/reconstructed`：

```
{"files":7053,"declarations":{"expected":81667,"found":81667,"duplicated":0},"parseErrors":0,"duplicateDeclarations":0,
 "missingImportFiles":0,"missingImportNames":0,"freeIdentifiers":31}
```

自由标识符名单与 `reconstructed/` 的完全一致（报告新增 `freeNames` 字段，便于直接比较）。`tools/q.mjs` 读 original/ 与 analysis/，不受影响（`show`/`find` 抽查正常）；`tools/verify/readability.mjs`、`doc-refs.mjs` 读 `manifest.json` / `symbols.jsonl`，格式未变。

### 4.4 自测

`node artifacts/tmp/deminify/selftest.mjs [-v]`：17 个用例在 node 下分别以 ES 模块运行变换前后的代码，输出逐字比较，全部相同；同时规范形检查也全部通过。覆盖：bool、void0（参数/局部遮蔽、delete）、shorthand（`__proto__`、模式默认值、参数解构）、typeof（9 种值 × 6 种写法）、逗号表达式（if/else、for 体、标签、throw）、logical/cond（嵌套 else-if）、悬空 else（for 体、标签体）、split-decl（TDZ、闭包前向引用、switch case、for 头）、else 里的 var、箭头函数（this、async）、if 条件逗号、生成器/async 里的 yield/await、导入别名（命名空间、局部遮蔽迫使换名、全部遮蔽迫使新名、export 别名）、指令序言保护。

## 5. 已知限制

- 只处理**语句位置**的逗号/逻辑/条件表达式。表达式内部的（`x = (a(), b)`、实参里的逗号、`for (;; i++, j++)` 的更新部分、`return c ? a : b`）保持原样：拆开需要引入临时变量或改变表达式结构，收益小、风险大。
- 数字、字符串字面量保持原写法（`1e3`、`'\x41'`），打印器用原始文本。
- 别名合一只合并"同来源、同 attributes、同导入名"的说明符；不同来源到达同一声明的不合并（当前阅读树没有这种情况）。
- `cross-chunk-alias` 只出现在阅读树，其等价性靠 3.2 的论证与规范形对比（只有这 9 行不同），不在运行时对照覆盖内。
- 运行时对照只能覆盖 54 个场景走到的代码；其余代码的保证来自 4.2 的规范形检查——它依赖 Babel 解析器/作用域分析本身正确，以及 3 节的逐条论证。
- 阅读树行数 +12.5%（主要是拆声明和拆逗号表达式）。
- 本次产物都在 `artifacts/tmp/deminify/`：`reconstructed/`（新阅读树，可直接替换比较）、`runnable-dm/`（变换后的可运行树）、`runnable-dm.json`（每文件命中数与检查结果）、`treestats-{before,after}.json`、`canon-trees.json`、`check-final.json`。正式 `reconstructed/` 由主控用 pipeline 重新生成。
