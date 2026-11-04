# vendor-names：第三方代码取回 npm 原名（过程记录）

负责人：vendor-names 成员（第五阶段第一波）。写入范围：`tools/naming/vendor-names.mjs`、`tools/naming/lib/vendor-*.mjs`、`analysis/names/vendor.jsonl`、本文件、`artifacts/tmp/vendor-names/`。

## 1. 结论（2026-11-03）

`analysis/names/vendor.jsonl` 共 87,740 条（source `vendor`），覆盖 250 个 npm 包，确定性输出（两次运行逐字节相同），全量约 20 秒到 2 分钟（看 npm 文件缓存冷热）。

自测按 readability-guide 第 3 节。"前" = 去掉 vendor.jsonl、其他 `analysis/names/*.jsonl` 不变时 resolve 的结果；"后" = 当前 `analysis/` 全部：

| vendor | 前 | 后 | 剩余 |
|---|---|---|---|
| 顶层 | 9.7%（剩 8,351/9,248） | **79.5%**（按引用 81.3%） | 1,895 |
| 参数 | 11.1%（剩 35,841/40,309） | **82.4%**（按引用 82.4%） | 7,110 |
| 局部 | 25.3%（剩 37,764/50,530） | **83.9%**（按引用 81.9%） | 8,139 |

（"前"比阶段起点 11.6% / 2.4% / 24.1% 略有出入：auto2 已改为只命名仍压缩的绑定，propagate.jsonl 是用早先一版 vendor.jsonl 生成的。）src 不受影响，只多了 65 个顶层名（一方模块导入第三方导出时跟随导出方）。

改名引擎：`apply.mjs original <final> <runnable> --force --check`：拒绝 0、冲突 4,716（都是引擎自动加后缀）、α 校验 moduleDiffs / crossModuleDiffs / fileDiffs 都是 0。vendor.jsonl 里没有冻结绑定，所有键都能用 `bindingsOf` 解析到。曾报过 124 条拒绝，全部来自 resolve.mjs 为 chunk-pwh5dx3n.js（直接 eval，模块作用域冻结）写的"保持"和"导入跟随导出方"条目，与 vendor.jsonl 无关。lead 已在 f2837bf / e1686b4 修复。

**目标 85% 三项都没达到**，剩下的是什么见第 4 节。要点：
- 参数和局部剩下的约一半是**取回了原名，但原名本来就只有 1–3 个字符**。度量把这类名字算作"仍压缩"，例如 `o`、`p`、`c`、`k2`、`_a`、`it`、`gen`、`cxt`：tsc 生成的 `__createBinding(o, m, k, k2)`、TS 降级临时变量 `_a`/`_b`、parse5 的 `p`（parser）、ajv 的 `it`/`gen`/`cxt`、node-forge/bignumber.js 的单字母变量都属于这一类。如果把它们算作可读，参数是 91.8%、局部 91.1%；再去掉私有包，参数 96.0%、局部 96.4%。
- 另一块是私有包 `@ant/managed-config` 等，npm 上没有源码可以对照。

## 2. 做法

### 2.1 对齐单元（run）
- **CommonJS 包裹** `var X = x(function(e, m){ … })`：包裹体整体对一个 npm 文件。包裹变量命名为 `require_<文件名>`，与 esbuild 的命名习惯一致：文件名是 `index`/`main` 时取上一级非通用目录名，再没有就取包名，例如 `require_semver`、`require_re`、`require_otlp_exporter_base`。包裹参数命名为 `cjsExports` / `cjsModule`；在 token 流里，这两个参数映射成 npm 侧的全局 `exports` / `module`。
- **提升的 ESM**（以及 Bun 转成 ESM 的 CJS，例如 react、scheduler）：同一 chunk 中属于同一 npm 文件、相邻的单元合成一个 run，与整个 npm 文件对齐。
- 单元的归属依次取 `unit-labels.jsonl` 的 `fid`、`decl-vendor.jsonl` 声明级（及 `parts`）的 `pkgFile`，最后取 `analysis/segments/decl-path.jsonl` 的 `vendor/<pkg>/<path>` 放置。放置来源可信度低，见 2.4。

### 2.2 npm 文件候选（`npmCandidates`）
- 标签指向的文件。该版本目录里没有这个文件时，取版本号最接近、且有该文件的已安装版本。
- 带哈希的打包块（`ajvProvider-BIwGVY6G.mjs` 这类）：同前缀、同扩展名的哈希块，处理版本间哈希不同的情况。
- 压缩构建（`*.min.js`，或每行平均超过 400 字符）：优先用同目录的未压缩构建（`index.min.js` → `index.js`、`lib|dist|src|build/<名>`）。没有未压缩构建时，用带 source map 的压缩兄弟文件，名字从 map 的 `names` 按"生成位置 → 名字"取（`lib/vendor-sourcemap.mjs`，自写 VLQ 解码）。实际用到 14 个文件：lru-cache 11 `index.min.js`、marked 16.1.1、fast-xml-parser 5.5.9（`fxp.cjs` 没有 map，改用 `fxp.min.js` + map）、@mermaid-js/parser 打包块等。共取到 1,581 个名字。
- ESM 兄弟：标签是 `dist-cjs/…`、`dist/commonjs/…`、`build/src/…` 等 CommonJS 构建时，同时试 `dist-es/…`、`dist/esm/…`、`build/esm/…` 等。原因是 Bun 实际打包的是 ESM 版本；用 tsc 输出的 CommonJS 对齐，`checkUrl_1.checkUrl` 这类写法会错位。
- 选择标准是"对齐上的信息 token 数 + Dice"。只用 Dice 会偏向小文件，例如 mermaid 的 lodash 段曾被配到一个 274 token 的兄弟块。

### 2.3 token 流与对齐（`lib/vendor-tokens.mjs`、`lib/vendor-align.mjs`）
- 两边都先用 `tools/rename/lib/scope.mjs` 的 `analyze` 解析作用域。绑定到某个绑定的标识符变成通配符，分四类：普通 `I`、参数声明 `IP`、函数/类表达式名 `IN`、函数或类的名字 `IF`（`function f`、`f = () => {}`、`var f = class {}`）。全局变量（`g:`）、字符串、属性名、数字、正则、运算符都是字面 token。
- 针对 Bun 变换的归一化：
  - `!0`/`!1` → true/false；`void 0`、`undefined` → undef；`typeof x > "u"` 等 → `tundef x`；`===` → `==`；`a["b"]` → `.b`；无插值模板 → 字符串；
  - `function f(){}` 与 `f = function(){}` 输出相同的 token；`var x;` 后面的 `x = …`（Bun 的 `__esm` 懒初始化）与 `const x = …` 相同；
  - 解构 `{key: id}` 按 `id p:key` 输出，与 `const id = obj.key` 对得上；
  - npm 侧 `require("x")` → `call I`，对应 Bun 的 `require_x()`；npm 侧的导入绑定不参与投票（它们的本地名不是导出方的名字），只附带导入名 `p:<imported>`；`export default expr` 是伪绑定 `<文件名>_default`。
- 对齐：先去掉公共前后缀，用两边都只出现一次的字面 token 做锚点（取 LIS），在锚点之间递归，小段用带权 LCS（字面匹配 2 分、通配符 1 分）。悬殊的段截取靠近锚点的窗口。对齐后做"吸附"：通配符的伙伴挪到与其相邻字面 token 的伙伴旁边。这解决了平局时 `Et = new Set("…")` 被配到前一条 `let emojiRegex` 的问题。整体对齐后，对齐率低于 70% 的单元再单独与整个 npm 文件对齐一次（处理打包器调整过声明顺序的情况）。

### 2.4 投票与决定
- 每个对齐上的通配符对算一票："316 绑定 ↔ npm 绑定"。只有当 316 绑定是在与同一 npm 文件对齐的 run 里声明的，它的出现才投票。Bun 会把一个文件拆成几个 run，这些 run 都算；引用来自其他文件的 run 时不算，因为那里看到的是 npm 侧的导入别名。
- 文件级 316 绑定（模块作用域，或 CommonJS 包裹函数作用域）只能配 npm 的模块级绑定。它的声明还必须配到"该单元多数 token 对齐到的那条 npm 顶层语句"里声明的名字。被这两条拦下的票：6,594 张。
- 采用条件：
  - 同名票数 ≥ 70%（或 ≥ 60% 且至少 2 票）；
  - 被选中的 npm 绑定在该 run 内的反向票 ≥ 60% 指回这个 316 绑定；
  - 参数性一致；
  - 只有 1 票时：所在单元的信息 token 对齐率 ≥ 80%，且至少对上一个"特征 token"（≥ 4 字符的字符串或正则、≥ 5 字符的属性名、绝对值 ≥ 100 或非整数的数字）；
  - 只来自放置（decl-path）的文件：单元质量 ≥ 0.6；
  - run 只是一个大得多的 source map 打包块的一小部分（npm token 数超过 run 的 8 倍）：置信度 ≥ 0.8；
  - 主场出现次数 ≥ 3、但对上的不足 34% 时拒绝。
- 置信度 = 0.95 × 同名票占比 × min（±16 token 窗口对齐率 / 0.9，单元信息对齐率 / 0.8，1）×（0.6 + 0.4 × 覆盖率）× 单次出现 0.9 × 仅放置 0.9。低于 0.5 不输出。分布：≥ 0.9 的 78,317 条，0.75–0.9 的 8,194 条，0.6–0.75 的 1,071 条，< 0.6 的 158 条。
- 派生名：`var Y = __toESM(require_x())` → `import_x`（223 条，包括导入自其他 chunk 的包裹）；Bun `__esm` 初始化函数 → `init_<文件名>`（66 条）；`var A = B` 或 `__esm` 里的 `A = B`（export default）→ `<B 的名字>_default`（63 条）；`X = class Y {}` 的表达式名 Y 跟随 X（3 条）。

### 2.5 各类数量

| via | 条数 |
|---|---|
| local | 44,326 |
| param | 34,132 |
| top | 5,427 |
| cjs-param | 2,134 |
| cjs-wrapper | 1,366 |
| cjs-import | 223 |
| esm-init | 66 |
| default-alias | 63 |
| expr-name | 3 |

拒绝（全量运行，`VN_DEBUG` 可逐条看原因）：share 1,956、reverse 1,179、novote 1,439、weak-single 400、same（原名与压缩名相同）234、conf 95、placement-unit 76、coverage 46、map-bundle 31、kind 28、npm-minified 7。

## 3. 抽查

`artifacts/tmp/vendor-names/sample.mjs <jsonl> <n> <seed>`：先在每个包各抽一例，再轮转补足；每例并排打印 316 上下文与 npm 对应声明的上下文，逐例人工判断。

| 批次（版本） | 例数 / 包数 | 错误 | 处理 |
|---|---|---|---|
| A（中期） | 60 / 约 55 | 1：`chunk-85hd307w.js` `h → fromJson`（一方主题代码，被 segmenter 放进 vendor/cli-highlight，按放置对齐） | 增加单元信息质量，放置来源要求 ≥ 0.6 |
| 单票专项 | 25 | 3：chart.js 的 `Kk/pps/Gxi`（一方 spinner 代码被标为 chart.js）、fflate `w → _c`（差一位） | 单票规则、覆盖率 |
| B | 60 | 2：`R=Re(Rx()) → _config_0`、yoga `Fc=2 → BoxSizing` | 单票需特征 token；新增 `IF` 通配类 |
| C | 60 | 1：zod-to-json-schema `Et → emojiRegex`（应为 ALPHA_NUMERIC，LCS 平局） | 对齐吸附；此改动同时把 zod regexes 中原先错配的 `gr/xr/Te`（extendedDuration/uuid4/regex）纠正为 guid/email/integer |
| 改动复核 | 43 条名字变化 | 3：tslib `Ebi`、mcpb `k`、sandbox-runtime `Be=["/proc",…] → remainder` | 文件级绑定只配 npm 模块级绑定，声明须在对齐的那条语句里 |
| D | 60 | 1：`chunk-85hd307w.js` `d → style`（来自引用处的单票） | 文件级规则扩展到所有出现 |
| **E（最终版）** | **60 / 56 个包** | **0** | — |

最终版 E 批覆盖 yallist、vscode-jsonrpc、lodash.\*、npm-run-path、has-symbols、eventsource、http(s)-proxy-agent、fast-uri、picomatch、es-define-property、safe-buffer、is-unicode-supported、standardwebhooks、is-inside-container、graceful-fs、retry、ignore、wsl-utils、is-docker、jsonwebtoken、ecdsa-sig-formatter、jose 4、long、auto-bind、object-hash、oidc-token-hash、execa、default-browser、uuid（经 mermaid 打包）、entities、acorn-walk、json-schema-traverse、es-set-tostringtag、delayed-stream、function-bind、follow-redirects、react-reconciler、has-flag、@anthropic-ai/sdk、ansi-styles、asciichart、ajv、dijkstrajs、pngjs、signal-exit 3、env-paths、which、jws、get-intrinsic、json-bigint、path-key、readdirp、pkce-challenge、lru-cache 11（source map）、form-data、jsonc-parser，共 56 个包。

前后五批合计抽查 300 例，发现 8 例错误，都已用通用规则修掉并复查。另外，B 批之后规则收紧，被删掉的 269 个名字中抽 20 例，约 2/3 是对的（例如 `diffArrays`、`isStream`、`getSignals`）。这些名字缺少特征 token，无法与错配区分，所以宁缺毋错。

## 4. 剩余与限制

剩余"仍压缩"的绑定（`artifacts/tmp/vendor-names/left.mjs`）：

| | 原名本身 ≤ 3 字符 | 私有包（无源码） | 未归属到 npm 文件 | npm 文件里未命名 | unresolved-cjs / 资源 |
|---|---|---|---|---|---|
| 顶层 | 87 | 68 | 430 | 1,290 | 20 |
| 参数 | 3,819 | 1,759 | 521 | 958 | 53 |
| 局部 | 3,640 | 2,786 | 527 | 1,167 | 19 |

1. **短原名**（约 7.5k）：见第 1 节。它们是真实原名，这里不改成长名字；要改属于语义命名的工作。
2. **私有包**（约 4.6k）：`@ant/managed-config`（651 KB）、`@ant/(unnamed)` 等，npm 上没有源码，归第二波语义命名。
3. **未归属**（约 1.5k）：阅读树放在 `vendor/` 下，但 tools/vendor 没有标签，decl-path 指向的文件又不存在。大头是 `@anthropic-ai/claude-agent-sdk`（vendor-ref 里没有这个包）、`lodash-es/_inlinedHelpers.js` 这类虚拟路径、`_unknown/`。另外有少数一方代码被放进 vendor/（例如 cli-highlight 主题、chart.js 名下的 spinner），这类本来就不该取 npm 名。
4. **npm 文件里未命名**（顶层约 1.3k、参数/局部约 2.1k）：
   - 只有 1 票、又缺少特征 token 的单元，例如 `function Ge(e,n){return D(e,fo,n)}`；
   - 一对一平局：Bun 内联或合并了常量、对象，例如 AWS endpoint ruleset 里共享的 `{ref:"UseFIPS"}`、highlight.js 语言文件的关键字串，两边形状不再对应；
   - 316 与 npm 版本有差异的段：sandbox-runtime、MCP SDK v2 的 2.0.x 未发布构建（见 vendor.md 5.2）；
   - `@mermaid-js/parser` 压缩打包块里的 lodash/langium（435 个顶层）：块很大，只保留置信度 ≥ 0.8 的名字。
5. 名字来自对应版本的 npm 源码。tools/vendor 判定为版本区间时取区间里已安装的版本；版本差异导致的错位由投票阈值兜底。来自 source map 的名字（1,581 条）对应原作者源码，不是 npm dist 里的名字，例如 marked 的 `cap`、`src`。
6. 改名冲突由引擎加后缀，同一 chunk 里多个同名 `require_index` 的消歧交给 resolve。CommonJS 包裹参数统一叫 `cjsExports`/`cjsModule`，不叫 `exports`/`module`，以免遮蔽 Bun 运行时的全局 `module`。

## 5. 加进 tools/pipeline.sh 的命令

放在 `auto-names` 之后、`propagate`（读 vendor.jsonl）和 `resolve` 之前：

```bash
step vendor-names;      $N tools/naming/vendor-names.mjs
```

依赖：`analysis/vendor/`（`bash tools/vendor/run.sh` 的产物，含不入库的 `index/`）、`vendor-ref/node_modules`（含 `.versions/`）、`analysis/segments/decl-path.jsonl`。

## 6. 文件

- `tools/naming/vendor-names.mjs`：主程序（run 构造、候选、投票、决定、派生名）。
- `tools/naming/lib/vendor-tokens.mjs`：归一化 token 流（四类通配、信息 token 与特征 token 判定）。
- `tools/naming/lib/vendor-align.mjs`：锚点 + 带权 LCS + 窗口 + 吸附。
- `tools/naming/lib/vendor-sourcemap.mjs`：source map `names` 解码。
- 调试脚本（`artifacts/tmp/vendor-names/`）：`sample.mjs`（抽查）、`why.mjs`（按拒绝原因看例子，配合 `VN_DEBUG`）、`left.mjs`（剩余分类）、`measure.sh`（单独评测一个 vendor.jsonl）、`frozen.mjs`（检查键与冻结绑定）、`try-align.mjs`（单段试对齐）。

## 7. 坑

1. Git Bash 下用 `node -e` 或 `sed` 改含 `\n` 的 JS 源码时，反斜杠被吃掉，本阶段踩到 3 次（lead.md 第 11 节）。之后带反斜杠的改动一律用 Edit。
2. 用"多数 token 是 ≤ 2 字符名"判断 npm 文件是否压缩，会把 jsbn、bignumber.js、node-forge 这类手写短名的源码误判为压缩构建。改为按每行平均长度判断。
3. 候选文件按 Dice 选会偏向小文件。一个 run 只占大文件的一小部分时，应按对齐上的信息 token 数选。
4. 文件级绑定的单票最容易错（形状相同的声明到处都是）。需要同时满足"配 npm 模块级绑定"和"声明须在单元对齐的那条语句里"两个约束。
