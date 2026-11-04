# 第三方与运行时代码的最后压缩名：left-v（naming-leftover-vendor 全组）

范围：`analysis/segments/naming-leftover-vendor.json` 的两项，清单已排除 name-v2 正在写的 `naming-vendor.json[2]`（`@smithy/credential-provider-imds` … `lodash-es/uniqBy`）：

- **`[0]` vendor**：`dirs` 首 `vendor/@anthropic-ai/bedrock-sdk`、尾 `vendor/zod/v4`；200 个声明、`unnamed` 合计 **272**；涉及 18 个 chunk。
- **`[1]` runtime**：`dirs` 只有 `runtime/bun-runtime.js`；8 个声明、`unnamed` **31**；chunk 为 `chunk-rshven70.js`。

名字表 `artifacts/tmp/lead/final9`。起点：`naming/semantic-left-v.jsonl` 不存在（本组首个写者）。

## 交付

| 项 | 数量 |
|---|---|
| 命名表 | `naming/semantic-left-v.jsonl`，**187 行 / 20 个 chunk**（只 `cat 批次 >> 目标` 追加） |
| 批次 | 9 个批次文件 `artifacts/tmp/left-v/batch0[2-9].jsonl`（batch02 起；batch01 为第一批直接 heredoc 追加），每批 ≤30 个声明 |
| `annotate check naming/semantic-left-v.jsonl artifacts/tmp/lead/final9` | **0 problems，0 suffixed by conflicts** |
| 覆盖率 | 用 `tools/naming/resolve.mjs` 合入本表（`artifacts/tmp/left-v/final9r`）后按声明区间重渲染两组的全部 208 个声明：**剩余 `_K` 为 0**；187 条全部原样生效（0 条被丢弃、0 条被加 `_2` 后缀） |
| 唯一键 | 187 个（无重复行、无保留字、无非法的 `/^[\w$]{1,3}_K\d+$/` 或 `_2` 结尾的名字） |
| **命名数** | **187 个绑定**（vendor 156、runtime 31） |
| **未命名数** | **115 个绑定，全部是 `eval` 冻结**（见下节）；没有任何「看不出用途所以跳过」的绑定 |

拆分：`[0]` 实际待命名 156 个（清单 `unnamed` 272 − 已命名 1 − 冻结 115）；`[1]` 31 个全部待命名。清单 `unnamed` 与实际绑定数不一致（272 vs 156+115+1）是因为同一偏移被多个声明重复计数：`show` 渲染一个声明时，会把该 chunk 里**所有**仍压缩的顶层绑定和本声明内所有未命名绑定都标成 `_K`，于是 `E`/`S`/`I` 这类常量同时出现在“定义它的声明”和“引用它的声明”里（本组 11 个令牌共 168 个 token-声明对 vs 156 个唯一令牌）。

## 未命名清单（eval 冻结，`frozen=direct-eval`）

全部在 `chunk-pwh5dx3n.js`。`resolve.mjs` 对含直接 `eval(` 的模块冻结所有模块作用域绑定，rename 引擎会原样保留压缩名，所以按规则不写。共 **115** 个：

| file | scope | 数量 | 代表 key（压缩名） |
|---|---|---|---|
| `chunk-pwh5dx3n.js` | top | 110 | `@457`(k=@grpc/grpc-js constants)、`@4537`(K=logging)、`@6298`(ue=metadata)、`@52323`(lu=call)、`@264838`(Io=internal-channel)… |
| `chunk-pwh5dx3n.js` | local | 5 | `@78109`(exports)、`@78117`(module)、`@78157`(inquire)、`@78165`(moduleName)、`@78185`(mod) —— 位于 `vendor/unresolved-cjs/index.js` 的 `require(inquire)` 直接 eval 里 |

按归属包：`@grpc/grpc-js` 67（62 个模块的导出包裹 + 常量）、`protobufjs` 30 + `@protobufjs` 2、`@opentelemetry/otlp-grpc-exporter-base` 8、`unresolved-cjs` 6、`lodash.camelcase` 1、`@js-sdsl/ordered-map` 1。

完整 key 列表（file、key、压缩名、scope、路径）见 `artifacts/tmp/left-v/frozen.txt`（115 行）。这些绑定的“应该叫什么”其实都能从 npm 源码读出（`@grpc/grpc-js/build/src/*` 的 `export *` 包裹名、protobufjs 各 `module.exports = X`），只是工具链把整块 chunk 冻结了——需要 lead 决定是否放宽 `direct-eval` 冻结策略（例如只冻结真正被 eval 引用的名字），否则这一块永远是压缩名。

## 命名约定

- 有 npm 源码的一律对齐原始符号名：
  - lodash（`@mermaid-js/parser` 内联的 lodash 链，`vendor-ref/node_modules/lodash-es`）：`_getTag` 的 `mapTag/objectTag/promiseTag/setTag/weakMapTag/dataViewTag`（组内已占用的加语义前缀 `getTagMapTag` 等）、`_baseIsTypedArray` 的 `argsTag…uint32Tag` 一整排（写成 `typedArrayArgsTag…` 避开已占名）、`_baseIsArguments` 的 `argsTag`/`objectProto`/`hasOwnProperty`、`maxSafeInteger`（`MAX_SAFE_INTEGER_LIMIT`）、`isLength`、`isArrayLike`、`isBuffer`/`freeModule`/`freeProcess`、`stubFalse`、`LARGE_ARRAY_SIZE`(200)、`mapCacheSet`(MapCache.prototype.set)、`Hash`、`SetCache`、`equalArrays`、`isStrictComparable`、`matchesStrictComparable`、`getTag`。
  - domino（`@mixmark-io`）：`Event`(`EventClass`)、`EventTarget`(`EventTargetClass`)、`URL`(`URLClass`)、`require('./Event')`→`EventModule`、`window`（select.js 顶部的假 window）→`selectWindow`、`self`→`selfRef`、`element`/`array`→`elementRef`/`arrayRef`。
  - node-forge：`_this`→`selfRef`（aes.js/des.js 的 `var self = this`）、`jsbn` 的 `r/y/e/n`→`remainder/shiftedModulus/exponent/wordCount`、`util` 的 `n`→`count`/`bits`/`repeatCount`、ed25519 的 `pack25519/unpack25519(o, n)`→`input`。
  - protobufjs：循环下标统一 `idx`（`namespace.js`/`type.js`/`root.js`/`oneof.js`/`ext/descriptor`）、`tokenize.js` 的 `unescape`→`unescapeString`（`unescape` 是保留名）、`@opentelemetry/otlp-transformer` 的 `Span.Event` 构造函数→`SpanEvent`、`eventemitter` 的 `i`→`idx`/`argIdx`。
  - @anthropic-ai sdk：`uploads.mjs` 的 `fetch`→`fetchImpl`、`process`→`processModule`、`uuid.mjs` 的 `crypto`→`cryptoModule`、`mcp.mjs` 的 `No`→`toolHostTargetSchema`（= `toolHostSchema().transform(dropUndefined)`）。
  - domino 之外的其余小厂：`@js-sdsl` 的 `const i = this`→`selfRef`、`opentelemetry diag/context` 的 `self`→`selfRef`、`machine-id` 的 `process`→`processModule`、`@smithy/core` 的 cjs 包裹参数→`cjsExports`、`copyDocumentWithTransform` 的 `e`→`source`、`object-hash` 的 `var f = this`→`hashRef`/`arrayRef`、`pngjs` 的 `self`→`selfRef`、`parse5` 的 `document`→`documentNode`、`qrcode` 的 `i`→`coeffIndex`/`posIndex`、`react` 的 `i`→`childIndex`/`argIndex`、`retry` 的 `i`→`errorIndex`、`sdk-metrics Buckets.reverse` 的 `i`→`swapIndex`、`marked` 的 `Ue`→`escapeRegex`、`private-unresolved` 的 `qm`→`cryptoObject`、`__importStar` 的 `n`/`t`→`obj`/`moduleValue`、`normalize`/`detectSchemaVersion` 的 `e`→`configDocument`。
- 运行时代码（`[1]`）按 esbuild/Bun 的惯用名：`x`→`__commonJS`、`Re`→`__toESM`、`Ar`→`__export`、`Xa`→`__esm`、`q`→`__identity`、`n`→`__getValue`（`return this[prop]` 的 getter）、`r`→`__setValue`、`o`/`p`→`esmCacheNodeMode`/`esmCache`（两个 `??= new WeakMap()` 缓存）、`S` 里的 `defineExports(target, getters, setters)` 保持已有名。`Re` 的局部参数按 lodash 的 `__toESM` 习惯：`mod`/`isNodeMode`/`target`/`isObject`/`cache`/`cached`/`esmTarget`/`keyName`。
- `__toESM` 的 `a=…?b:(c ??= new WeakMap())` 里两个 WeakMap 的位置是**反的**：`b`（isNodeMode）走的是 `o`，`!b` 走 `p`，命名时按代码实际分支写（`esmCacheNodeMode = b ? o : p` → `isNodeMode ? (esmCacheNodeMode ??= …) : (esmCache ??)`）。

## 发现的问题

1. **清单 `unnamed` 与实际绑定数差一倍多（272 vs 271 个“声明内未命名绑定”，其中 115 冻结）。** `plan --tree vendor --top` 是按“每个声明渲染后可见的全部 `_K` 令牌”累计的，顶层常量在定义处和每个引用它的声明里都算一次；本组 156 个唯一令牌对应 168 个 token-声明对。做覆盖率时必须用 `bindingsOf` 按 `declStart ∈ [d.start,d.end)` 重算，否则会以为还剩 100 多个没做。
2. **`final9` 里 `source:"minified"` 的自别名条目会让 `show` 永远显示 `_K`（name === min）。** 本组 `chunk-z0q4jgnc.js` 的 48 个 lodash 顶层常量（`@884/@914/@981/…`）、`chunk-rshven70.js` 的 8 个运行时全在 `top.json` 里有一条 `{"name":"E","min":"E","source":"minified"}`；只要本表写入，`resolve.mjs` 会以 semantic 优先覆盖，实测 187 条全部原样生效、0 条被 `_2` 后缀。判断“是否已命名”要判 `source!=='minified'`，不能只看 key 存在。
3. **`annotate show` 头部标出的 chunk 与绑定实际 chunk 不一致的老问题本组也遇到 1 次**：`chunk-z0q4jgnc.js#z` 的 `E_K884/S_K914/I_K972` 实际定义在 `chunk-z0q4jgnc.js#qr/#Hr/#$r`（与 v1/v2 记录一致，同一个 chunk 内的相邻声明）。写 `file` 前用 `bindingsOf` 核对，`check` 也能兜住（`no binding at this offset`）。
4. **`annotate check` 不校验 `RESERVED`（与 name-v2 的结论一致，本组又踩一次）**：`protobufjs/src/tokenize.js` 的 `unescape` 被 `check` 放行，但 `resolve.mjs` 会丢弃它；已改名 `unescapeString`。本组另外主动避开了 `process`/`crypto`/`fetch`/`self`/`window`/`module`/`exports`/`URL`/`length`/`index` 等，改用 `processModule`/`cryptoModule`/`fetchImpl`/`selfRef`/`selectWindow`/`cjsModule`/`cjsExports`/`URLClass`/`repeatCount`/`idx`。**建议在 `annotate check` 里加 `RESERVED` 校验。**
5. **`final9` 与其它成员还在并行写的表共享，直接 `resolve.mjs` 到 `naming/final` 不能用来验本组**：`resolve` 会把 `naming/semantic-*.jsonl` 全量合并，而其它成员正在写同一批 chunk 的别的偏移。本组用的是“读 `final9` + 覆盖本表 187 条”的临时目录（`artifacts/tmp/left-v/mkfinal.mjs` → `final9m`），再用 `resolve.mjs analysis artifacts/tmp/left-v/final9r` 复核，两者结论一致（剩余 `_K` 都为 0）。
6. **运行时 `__toESM` 的两个 WeakMap 语义与变量名字母顺序无关**：`o` 只服务 `isNodeMode`（`b` 为真），`p` 服务默认分支；一开始按出现顺序命名为 `esmCache`/`esmCacheNodeMode` 会把两个缓存写反，已按分支改正。
7. **`defineExports`（`S` 声明里的第三个辅助）不是 esbuild 的 `__reExport` 而是 Bun 的 get/set 双向导出**：`(target,getters,setters)`，set 走 `__setValue.bind(all,key)`。名字按行为取 `defineExports`，与 `__export`（只有 getter + 可配置）区分开。
