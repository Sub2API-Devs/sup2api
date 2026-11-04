# buildable：让阅读树本身可以构建运行

负责人：buildable。写入范围：`tools/emit/readable.mjs` 及新增的 `tools/emit/{writes,init-deps,load-order,eval-order,defer}.mjs`、`tools/build/build.mjs`、`tools/verify/readable-check.mjs`（一行）、本文件、`artifacts/tmp/buildable/`。

## 1. 结论

- `tools/emit/readable.mjs` 生成的阅读树现在是一个可构建的源码项目：树根有 `package.json`（`npm run build` / `npm start -- <参数>`）、`build.mjs`（即 `tools/build/build.mjs` 的拷贝）、`.gitignore`（`dist/`）。构建用与官方相同的 **Bun 1.4.4**（`node_modules/bun/bin/bun.exe`，版本不是 1.4.4 时拒绝构建），**0 错误 0 警告**，约 25 秒，产物在 `<树>/dist/`：`cli.js` + 拆分出的 chunk + 资源，另有函数钩子 worker `dist/src/plugins/functionHooks/hooks-worker/hooks-worker.js`（与官方二进制里的相对位置一致）。
- **运行对照：`node tools/verify/compare.mjs original <树>/dist` 98/98 一致、两边预期 98/98 满足、没有重跑**（场景已由 scenarios 成员扩到 98 个；54 个旧场景是其子集）。负对照：在阅读树 `src/tools/FileEditTool/prompt.js` 里把 Edit 工具描述的句号改成感叹号、重新构建，`print-hi` 只报 `$.requests[0].body.tools[2].description` 这一处差异。
- 构建产物运行时不读 `original/`、`runnable/`、`artifacts/`：产物里没有任何项目绝对路径，资源由 Bun 复制进 `dist/`（`with { type: "file" }` → 带哈希的文件名），`import.meta.dir` 相对的查找（hooks worker、`vendor/clipboard-napi/…` 等）都相对 `dist/`，与官方二进制相对 `/$bunfs/root/` 一致。对照时的泄漏审计（输出/请求里出现项目根）为空。
- 阅读树仍然可读：没有 eval、字符串或逐 chunk 包装器。改动只有：动态加载的说明符指向阅读树模块；378 个生成的懒加载单元（几行 `export … from`）；21 条声明搬到给它赋值的模块；导入环里 5,801 条语句的加载时工作包成 `deferInit("<chunk>:<偏移>", () => { 原文 })`，旁边一行注释说明原因（第 4 节）。
- 静态校验（`readable-check`）：7,322 个文件 0 解析错误、0 重复声明、0 缺失导入文件/名字、81,667/81,667 个声明各出现一次、自由标识符 31 个且与现有 `reconstructed/` 的名单完全相同。deminify 未改动，其规范形证明不受影响（第 7 节）。

## 2. 命令

```bash
# 生成（与 pipeline 的 readable 步骤相同）
node --max-old-space-size=8000 tools/emit/readable.mjs --out reconstructed
# 构建、运行（在树根也可以 npm run build / npm start -- --version）
node reconstructed/build.mjs [--outdir dist] [--bun <路径>] [--sourcemap] [--minify]
node reconstructed/build.mjs run -- --version
# 静态校验、运行对照
node --max-old-space-size=8000 tools/verify/readable-check.mjs reconstructed
node tools/verify/compare.mjs original reconstructed/dist --name original-vs-reconstructed-dist
```

建议加进 `tools/pipeline.sh`（readable 之后）：

```bash
step build-readable;    node reconstructed/build.mjs | tail -1
if [ "${VERIFY:-0}" = 1 ]; then
  step verify-readable-build; node tools/verify/compare.mjs original reconstructed/dist --name original-vs-reconstructed-dist | tail -5
fi
```

需要 lead 处理的两件事：

1. **根 `.gitignore` 第 11 行 `build/` 会把 `tools/build/` 也忽略掉**（`git check-ignore -v tools/build/build.mjs` 命中），提交前要改成 `/build/` 或加 `!tools/build/`。
2. `reconstructed/dist/` 由生成的 `reconstructed/.gitignore` 忽略；如果希望根 `.gitignore` 也写明，加一行 `reconstructed/dist/`。

`compare.mjs` 只能把结果写到 `analysis/verify/<name>`；我的几次对照用 `--name ../../artifacts/tmp/buildable/verify/buildable-N` 写在自己的目录里（`artifacts/tmp/buildable/verify/buildable-{1,2,3}.{json,md}`）。`run.mjs` 不需要改：构建产物目录里有 `cli.js`，直接当作被测树。

## 3. 过程（问题按出现顺序）

| 步 | 现象 | 处理 |
|---|---|---|
| 1 | `bun build` 现有阅读树：164 个错误，全是 `Could not resolve "./chunk-xxx.js"` | 动态加载改指向阅读树模块（4.1） |
| 2 | 52 个 `Cannot assign to import "y"` | 声明搬到给它赋值的模块（4.2） |
| 3 | 构建 0 错误，运行 `--version`：`Gn is not a function` | 求值顺序（4.3–4.5） |
| 4 | 推迟加载时初始化后依次遇到：函数参数里的回调立即执行（`[…].flatMap(f)`）、Bun 运行时 `x(() => …)` 懒包装、加载时 `require()` 读到未完成的模块、`??=` 赋值被当成读取、`process.env` 属性读取、推迟语句与不推迟语句的副作用顺序 | 逐条改进 `init-deps.mjs` 的"加载时依赖"模型与 `eval-order.mjs` 的规则（4.4） |
| 5 | 推迟批次运行中 `require()` 一个只在懒加载里出现的模块，它读到本批次里还没运行的值 | chunk 求值顺序把"加载时的 require/import"当作求值中途的依赖（4.5） |
| 6 | `--version` 通过；`compare` 98/98 | — |
| 7 | 加入 hooks worker 后同一模块在不同加载/程序里打开、关闭不同的环，裸 begin/run 互相干扰 | 环按关闭它的模块命名，worker 线程的环加 `worker:` 前缀（4.6） |

## 4. 修法与等价性

### 4.1 动态加载（`readable.mjs` 的 `dynamicTarget` / `rewriteDynamicLoads`）

原构建的入口静态闭包只有 8 个 chunk、53 个声明，其余代码都经 `import("./chunk-x.js")` / `require("./chunk-x.js")` 加载（1,035 个目标，其中 509 个是门面 chunk）。被加载的 chunk 的导出表就是源模块的导出表。

- 导出名全部是同一个阅读树模块的同名声明 → 说明符直接改成该模块（655 个）。
- 否则（名字分散在几个模块、需要改名、含外部模块再导出、`export * as`）→ 生成 `<门面路径或首个名字>.lazy.js`：只有 `export { a, b as c } from "…"`，导出名与原 chunk 完全相同（378 个，含 4 个"只有裸 `import "./chunk-…"`"的空 chunk，它们改成按原顺序导入这些 chunk 语句所在的模块）。
- `export default <表达式>`（scan 记为 `(expression)`）按该语句所在模块的 `default` 导出处理。

等价性：`import()` 得到的命名空间、`require()` 得到的对象，属性名与原 chunk 的导出名相同，属性是同一个声明的活绑定（ESM 的 `export … from` 不复制值）。差别：直接指向模块时命名空间可能多出该模块被别处导入的名字（只有枚举命名空间的代码能看到；全树没有这种用法，运行对照一致）。加载的求值内容：原构建求值目标 chunk 的静态闭包；阅读树求值目标模块的静态闭包，这些模块绝大多数已在启动时求值（4.3），所以 `import()` 只是取命名空间。

### 4.2 跨模块赋值（`writes.mjs`，`readable.mjs` 的 "Assignments across modules"）

ESM 不能给导入的绑定赋值，而放置可能把 `var y;` 与 `function f() { y = 1 }`（或第二个 `var y = …`）分到不同模块。Bun 从不把绑定和给它赋值的语句拆到不同 chunk，所以这种语句组总在同一个 chunk 里。按"共享被赋值绑定"做并查集，一个组跨多个模块时整组搬到其中字节最多的模块（21 组、21 条语句），插在该模块里同一 chunk 的语句之间、按原偏移的位置，所以 chunk 内语句的相对顺序不变；被搬的声明的出处行注明 `(moved: shares a binding it assigns)`。其它模块对它的读取改为从新模块导入（活绑定，读到的值相同）。

### 4.3 为什么不能只调导入顺序

阅读树按源文件聚合，入口的静态闭包是 5,412 个模块（源码本来如此：未打包运行源码时这些模块就在启动时求值，打包器把纯声明推迟到了懒 chunk 里）。这些模块的导入图里有一个 **3,675 个模块的强连通分量**（导入边来自函数体里的引用，环在源码层面合法）。ESM 在环里按深度优先后序求值：被依赖模块 M 打开时，若它的某个"加载时使用者"U 不在 DFS 栈上，U 一定先于 M 求值；要让环里所有基础模块都在使用者之前求值，就要求它们的全部使用者都在栈上，这对一个使用者分布在几百个模块里的基础语句（例如 `LAZY_COMPONENT_REGISTRY = new LazyRegistry()`，673 个加载时使用者）不可能做到。实测：按 chunk 序列重建源码模块顺序再给导入排序，违例不降反升；把基础语句挪到"先求值层"也不行——它们连函数体在内的引用闭包有 22,684 个声明。所以必须改结构：推迟环里语句的加载时工作。

### 4.4 规则：环里的语句等环完成再做加载时工作（`init-deps.mjs`、`eval-order.mjs`、`defer.mjs`、`runtime/deferred-init.js`）

原构建求值一个 chunk 的语句时，它 import 的 chunk 都已求值完，语句能触及的一切（读的绑定、调用的函数以及它们再调用的）都已完成。ESM 对不在环里的模块给出同样的保证：它在所有（传递）依赖之后求值。环里的模块则可能在它能触及的模块求值之前运行。规则（每次加载——启动、每个 `import()`/`require()` 目标、hooks worker——分别算强连通分量）：

环里模块的语句在加载时如果
1. 以"可能运行代码"的方式触及本环的绑定：调用、`new`、读属性、作为调用参数、展开、`extends`；
2. 读取本环里还没求值或已被推迟的值（`var x;` 无初始化的除外：它在之前之后都是 `undefined`）；
3. 加载模块（`require()` / `import()`）；

就推迟。调用环外模块是安全的：环外模块不能到达本环（否则它在环里），且已完成。同一 chunk 中原偏移在后的语句不可能是加载时依赖（原构建能运行），这类边直接丢弃。

加载时依赖由 `init-deps.mjs` 从原 chunk 的 AST + 改名库的作用域分析得到：嵌套函数体不算，立即调用的函数体、类的 `extends`/静态成员/计算键、作为参数传给调用的函数（例如 `[a].flatMap(f)`、`new Promise(fn)`）算；Bun 运行时的懒包装（`__esm`/`__commonJS` 等，参数在包装结果被调用时才运行）不算；`x = v` 只写不读（`x ??= v` 读）；读全局对象的属性（`process.env.X`）记为"有副作用"。

**副作用顺序**：一个环里一旦有语句推迟，按官方顺序在它之后、加载时有副作用（调用或可能运行代码的使用）的语句也一并推迟，使互相能看到彼此副作用的语句保持官方顺序；只有字面量、函数、纯读取的语句不推迟（5,801 条推迟中 2,852 条属于这一类）。

**运行**：推迟的语句改写成（`defer.mjs`，原文不改，只在外面包一层）

```js
var a; var b;          // 声明留在原位（let/const 改为 let，class 改为 let C = class C {…}）
deferInit("chunk-x.js:1234", () => {
  a = <原初始化式>;
  ({ b } = <原初始化式>);
});
```

`export default <表达式>` 改为 `let defaultExport; deferInit(…, () => { defaultExport = … }); export { defaultExport as default };`。环里最先求值的模块开头调用 `beginDeferredInits("<关闭环的模块>")`，最后求值的模块（关闭环）末尾调用 `runDeferredInits("<同名>")`，后者按官方顺序（chunk 求值顺序表 `CHUNK_ORDER`，再按偏移）运行环内登记的工作。环像求值一样嵌套。没有打开的环时 `deferInit` 立即运行（该模块在本次加载里不在环里，依赖都已完成）。入口模块的语句从不推迟。

等价性论证：
- 推迟的语句仍按官方顺序运行，且运行时环已完成：环里所有模块已求值（不推迟的语句都运行过），被推迟的语句按官方顺序一条条运行，所以每条运行时，它在原构建里能看到的状态（之前的 chunk 与本 chunk 之前的语句）都已建立；这正是原构建运行它时的状态（模型所覆盖的依赖内）。
- 不推迟的环内语句：按规则它在加载时不调用、不触及本环任何东西，只读已求值的本环值或环外（已完成的）模块，所以结果与原构建相同。
- 改写本身：声明留在模块顶层，导出与导入的活绑定不变；箭头函数里 `this`、`import.meta` 与模块顶层相同；含顶层 `await`、块内 `var`/函数声明的语句拒绝改写（本次 0 条）。`const`→`let` 与 `class` 声明→`let` 只在"给常量赋值""TDZ 期间读取"这类原构建会抛错的路径上有区别。
- 模型的局限：函数调用只看到"调用了本环的函数"（保守推迟），读值只看本语句一层；对象属性在别处被改写之类的深层依赖不在模型里。98 个场景的运行对照是最终证据。

### 4.5 chunk 求值顺序（`load-order.mjs` 的 `chunkEvalOrder`）

`CHUNK_ORDER` 与模块内语句的排列都用它：从 `cli.js` 深度优先后序遍历静态导入；**加载时的 `require()`/`import()`**（顶层语句里的，或顶层语句调用的本 chunk 函数里的）当作求值中途的依赖、排在静态导入之后；函数体里的动态加载在全部静态闭包之后按首次出现排队。这样"推迟批次里一条语句 `require()` 一个懒模块"时，懒模块需要的、同在本批次的工作已经先运行（原构建里它们在那次加载中求值）。

模块内语句：同一个源文件由几个 chunk 的片段组成，按 chunk 在 `CHUNK_ORDER` 里的顺序、chunk 内按偏移排列（510 个模块因此调整），每个 chunk 内的相对顺序不变。

### 4.6 多个程序与多种角色

- **hooks worker**：`original/src/plugins/functionHooks/hooks-worker/hooks-worker.js` 是 worker 线程的入口（`HOOKS_WORKER_URL = import.meta.dir + "/./src/plugins/…"`），不在扫描的 chunk 里。生成器把它原样写到 `src/plugins/functionHooks/hooks-worker/hooks-worker.js`，26 个对 chunk 导出的导入改指声明所在模块，126 行裸 `import "./chunk-…"` 去掉（阅读树每个模块自己导入所需）。`build.mjs` 把它作为第二个入口单独构建到 `dist/src/plugins/functionHooks/hooks-worker/`。它在 worker 线程里是另一个程序，从零求值，单独作为一次加载参与 4.4 的计算。冒烟测试：用 Bun `new Worker()` 启动原版与构建版 worker，都发出 `{"type":"online"}`（`artifacts/tmp/buildable/worker-smoke.js`）。现有场景不覆盖函数钩子。
- 一个模块每个程序只求值一次，由最先到达它的那次加载决定角色：启动时求值的模块只带启动加载里的角色；只在懒加载里出现的模块带所有懒加载里的角色（同一组模块从不同方向进入时 first/root 会互换）；worker 线程的环名加 `worker:` 前缀，运行时用 `isMainThread` 只处理本程序的环。`runDeferredInits(name)` 只在名为 `name` 的环正在求值时才运行（连同其中嵌套打开的环），否则什么也不做。

## 5. 构建（`tools/build/build.mjs`）

- `bun build <入口> --target=bun --format=esm --splitting --outdir dist --entry-naming [name].[ext] --chunk-naming chunk-[hash].[ext] --asset-naming [name]-[hash].[ext]`，CLI 与 worker 各一次。产物约 150 MB、约 2,650 个文件（不压缩；`--minify`、`--sourcemap` 可选）。
- 没有用 `--bytecode`：Bun 1.4.4 报 "ESM bytecode requires --compile"；试了 `--compile --bytecode`（单文件可执行，同官方），bytecode 生成失败（"Failed to generate bytecode"），未深究。官方 chunk 的 `// @bun @bytecode` 指令因此不复现，功能上无影响；启动比官方慢约 0.6 秒（`version` 0.9–1.5 s 对 2.2 s，主要是阅读树在启动时求值 5,412 个模块，而官方只求值 8 个 chunk）。
- `.node` 原生模块与 zstd 资源由 Bun 作为资源复制，加载方式与原构建相同。

## 6. 运行对照结果

| 运行 | 场景 | 一致 | 说明 |
|---|---|---|---|
| buildable-1 | 98 | 98 | 引入 hooks worker 与命名环之前 |
| buildable-2 | 98 | 98 | 加入 worker、命名环 |
| buildable-3 | 98 | 98 | 最终生成器、整树重新生成（生成约 2 分钟、构建 21 秒），两边预期 98/98，无重跑 |
| 负对照 | 1 | 0 | Edit 描述句号→感叹号，只报 1 处 |

## 7. readable-check 与 deminify

- `readable-check.mjs` 只改一处：树根的 `dist/`（构建产物）与 `node_modules/` 不参与检查（与 `assets/` 同理）。完整性证明不变：它按 `//@ chunk:起-止` 出处行统计 81,667 个声明，推迟的语句、搬家的声明都保留出处行和原文（推迟只在外面包一层）；生成的 `*.lazy.js`、`runtime/deferred-init.js`、hooks worker 没有出处行，不影响计数；导入/导出与自由标识符检查覆盖了它们。
- `deminify.mjs` 未改。推迟改写发生在 deminify 之前，deminify 处理的是"包了一层的原文"，规则与证明（对 runnable 的规范形对比与运行对照）照旧适用；本树的运行对照 98/98 也覆盖了这一点。

## 8. 遗留问题

1. 根 `.gitignore` 的 `build/` 忽略了 `tools/build/`（见第 2 节）。
2. 加载时依赖模型是近似的（4.4 末），靠运行对照兜底；场景没覆盖的启动路径、函数钩子 worker 的真实使用仍可能有顺序问题。一个可做的加强：运行时在 `deferInit` 登记时记录、在环外读到未初始化绑定时报错的调试模式。
3. 副作用顺序规则推迟了 2,852 条语句，阅读时多一层包装；可以用更细的副作用分析（区分只写本模块私有状态的调用）减少。
4. 启动比官方慢约 0.6 秒；没有 bytecode。
5. hooks worker 自身的名字仍是压缩名（它不在命名表里）。
