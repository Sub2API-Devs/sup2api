# 第三方代码（vendor）命名：name-v5（组 5，下标 5）

范围：`analysis/segments/naming-vendor.json` 第 5 项（下标 5），107 个声明、1,433 个压缩绑定，名字表 `artifacts/tmp/lead/final8`。`dirs` 首个 `vendor/private-unresolved/index.js`、末个 `vendor/unresolved-cjs/index.js`，与派活消息一致。覆盖面：

- `vendor/private-unresolved/index.js`（14 个声明，约 1,150 个绑定，`chunk-1ny7cxrt.js`）：Claude Desktop 三方配置的私有包——表单字段元数据（`FORM_FIELDS`/`FORM_FIELD_BY_ID`）、配置评估（`evaluateConfig`）、hybrid 存储读写、tier 合并、成员版本戳（`x-availableInVersion`）、bootstrap JSON Schema 生成、配置参考文档表格、egress 服务清单，以及 `src/config/schema` 式的 barrel 导出模块。
- `vendor/protobufjs/*`（`chunk-pwh5dx3n.js`/`chunk-798ashq9.js`）：descriptor 扩展、parse/root/type/oneof/tokenize/util 等，基本只有循环下标 `i`、`self`、`unescape`、`loadFile/loadOrFetch` 这类零星局部名。
- `vendor/qrcode/lib`、`vendor/react`、`vendor/react-reconciler`、`vendor/scheduler`、`vendor/readdirp`、`vendor/retry`、`vendor/safe-buffer`、`vendor/semver`、`vendor/signal-exit`（两版）、`vendor/stack-utils`、`vendor/standardwebhooks`、`vendor/supports-color`（两版）、`vendor/tslib`（esm + cjs）、`vendor/turndown`、`vendor/unresolved-cjs`（多个 chunk 的零散 CJS 模块）。

## 结果

| 项 | 数量 |
|---|---|
| 命名条目 | **1,433**（`naming/semantic-v5.jsonl`，全 `cat 批次 >> 目标` 追加，共 21 个批次文件 `artifacts/tmp/v5/bNNN.jsonl`） |
| 覆盖 chunk | 23 |
| 落在本组声明区间的绑定 | 1,399 |
| 声明区间之外（`require_*` 的顶层懒加载函数，见下） | 34 |
| `annotate check naming/semantic-v5.jsonl artifacts/tmp/lead/final8` | **0 problems，0 suffixed by conflicts** |
| 覆盖复核（`artifacts/tmp/v5/remain.cjs`：final8 + 本表按声明区间重算） | 剩余 `_K` 只剩 **5 个**，全部是 frozen 绑定 |
| 应用本表后重渲染 23 个 chunk 的残留 `_K` | **0** |
| 合并 final8 后的最终复核（临时目录，顶层名并入 `top.json`） | 107 个声明逐个 `show`，全部 **0 unnamed** |

置信度分布：0.85 × 115、0.8 × 306、0.75 × 587、0.7 × 403、0.65 × 19、0.6 × 3。

## 跳过（5 个，全部 frozen）

`vendor/unresolved-cjs/index.js` 里 `td`（`chunk-pwh5dx3n.js@78095`，protobufjs 的 `inquire` 模块）整段用 `eval("quire".replace(/^/, "re"))(moduleName)` 动态取 `require`，`bindingsOf` 把该声明下的 5 个绑定都标成 `frozen: direct-eval`：`exports`（参数）、`module`（参数）、`inquire`（函数）、`moduleName`（参数）、`mod`（var）。按规则冻结绑定不能改名，`check` 会直接报 `rejected`，故留压缩名。tool 端 `check` 报的 `problems` 为 0，是因为这些绑定本来就不会出现在清单里（计划里这一条声明仍算 5 个 unnamed，但任何名字都会被拒绝）。

另外本组还有 36 个 frozen 绑定（30 个 protobufjs 模块的顶层 `x(function(cjsExports, cjsModule){...})` 包裹函数，也是 `direct-eval`），它们本来就没有 `_K` 显示（已有 `uh`/`th`/`ja` 之类的短名），不在补名范围。

## 做法

- 只用 `show` 输出 + `cat` 追加；每批 1–12 个声明，`check` 每批后跑一次（多数批次 0 problems）。
- 私有包（`private-unresolved`）按代码行为 + 导出名命名：模块顶层的 `x(function(e){...})` 包裹函数叫 `moduleExports`，`require_*` 叫 `require_<模块语义>`，barrel 里 `var A = require_x()` 的中间变量叫 `<模块>Module`，`get` 转发用的临时名按被转发符号命名。
- 第三方包遵循包自身习惯：CommonJS `cjsExports`/`cjsModule` 包裹参数；`scheduler` 的 `unstable_*` 系列直接使用 `unstableImmediatePriority` 这类导出名；React 的 `react.production.js` 顶层逐个变量按 `REACT_FRAGMENT_TYPE` 等 Symbol 用途命名，hook 短名按 `useState`/`useMemo`/… 命名；`tslib` 的 `__importStar`/`__disposeResources`/`__rewriteRelativeImportExtension` 取 `exporter("...")` 的第一个参数字符串；qrcode/readdirp 等按类/导出名（`ReaddirpStream`、`readdirp`、`mask`、`paletteFor`）。

## 发现的问题

1. **偏移键只能按文件绑定，`show` 输出里同一偏移跨 chunk 会撞车。** 第 96 项 `td` 的 `exports` 参数在 `chunk-pwh5dx3n.js@40006` 与真实绑定偏移不符（实际在 `@78109`），我先把 `@40006` 当成了它。`bindingsOf` 显示 `@40006` 在 `chunk-pwh5dx3n.js` 里根本不存在，报 `no binding at this offset`；该偏移实际属于 `chunk-798ashq9.js` 的 `service.js`（`this` 包装）。同样 `chunk-vwj6ccer.js@247013` 根本不是绑定（是 `TurndownService.prototype` 对象字面量起点），`show` 的 prettier 输出里出现的 `_K` 偏移不一定都是绑定。做法是每批写之前用 `k` 在 `bindingsOf` 里核一遍；本报告提到的两次都是这样发现并改掉的。
2. **声明 96 的 `td` 被 plan 当成有 5 个 unnamed，但全是 frozen。** 也就是说本组清单的 `unnamed` 合计（1,433）里含 5 个永远无法满足的绑定，用它算"完成度"会永远差 5。
3. **`vendor/private-unresolved/index.js` 里的 barrel 声明（`chunk-1ny7cxrt.js#wz`）跨 33 个内部模块。** `show` 只给 `var A_K = require_x(); Object.defineProperty(...get: ...)` 的转发，但每个转发块没有显式模块名，只能从 `get` 里返回的导出名反推（如 `refuseForHybrid` → `hybridRefusalModule`）。这一条声明一个就写了 55 个名字，且大量 `Object.defineProperty` 转发并未产生新绑定——写名字前要先看 `bindingsOf` 的那些偏移是不是 request 变量本身。
4. **`vendor/react/cjs/react.production.js` 的导出别名链。** 末尾 `export{g5r,Fy,s5o,Kc,i5o,fo,Nbn,...}` 与 `var X_K = ...` 是两个不同的绑定空间，导出名（`Children`、`Fragment`）不适合作为内部变量的名字，否则 `final8` 的合并会出现同名重复，因此内部变量用 `ReactChildren`/`REACT_FRAGMENT_TYPE` 这类带前缀的名字。
5. **没有发现现有名字明显错误。** 抽查 `supports-color`、`signal-exit`、`semver` 的现有自动名（`supportsColor`、`processOk`、`compareBuild`）都与代码一致。
