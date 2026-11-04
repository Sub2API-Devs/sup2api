# 第三方代码（vendor）命名：name-v6（组 6，下标 6）

范围：`analysis/segments/naming-vendor.json` 第 6 项（下标 6），97 个声明、清单 `unnamed` 177，名字表 `artifacts/tmp/lead/final8`。`dirs` 首个 `vendor/vscode-jsonrpc/lib`、末个 `vendor/zod/v4`，与派活消息一致。覆盖面：

- `vendor/vscode-jsonrpc/lib/common/events.js`、`messageBuffer.js`、`node/main.js`（`chunk-t4ksmxzx.js`）：Event 命名空间、`\r` 常量、`__exportStar` 的目标参数、IPC reader/writer 的子进程参数。
- `vendor/which/which.js`（`chunk-m4p5zn6n.js`）、`vendor/yallist/yallist.js`（`chunk-1ny7cxrt.js`）。
- `vendor/yoga-layout/dist/src/generated/YGEnums.js`（`chunk-bzr73sfg.js`）：React DOM 侧沿用的 5 个事件优先级常量（`concurrentRoot`、`discreteEventPriority` 等，按 react-dom 原名）。
- `vendor/zod`（约 150 个绑定，本组主体）：`core/api`、`core/checks`、`core/compile`、`core/core`、`core/json-schema-processors`、`core/memoizer`、`core/parse`、`core/regexes`、`core/schemas`、`core/util`，以及 `classic/schemas`、`classic/compat`、`classic/errors`、`classic/external`、`locales/en`、`locales/fr`、`locales/he`；另有 `zod/lib/index.mjs`、`zod/v3/index.cjs`、`zod/v3/types.js` 的零星参数。

## 结果

| 项 | 数量 |
|---|---|
| 命名条目 | **176**（`naming/semantic-v6.jsonl`，全部 `cat 批次 >> 目标` 追加，8 个批次文件在 `artifacts/tmp/v6/`） |
| 覆盖 chunk | 9（`chunk-7vp249v4.js` 111、`chunk-1ny7cxrt.js` 23、`chunk-t7zrjgp6.js` 12、`chunk-j2t139r9.js` 7、`chunk-t4ksmxzx.js` 6、`chunk-dcmhvw5a.js` 6、`chunk-bzr73sfg.js` 5、`chunk-7gfe9gyh.js` 5、`chunk-m4p5zn6n.js` 1） |
| 唯一键 | 176（无重复行、无 `_K<偏移>` 形式的名字、无保留字/全局名） |
| `annotate check naming/semantic-v6.jsonl artifacts/tmp/lead/final8` | **0 problems，0 suffixed by conflicts** |
| 用 final8 + 本表重渲染全部 97 个声明 | **0 unnamed**（起始 `show` 头合计 216 个 `_K`，去重后 176 个键） |
| `tools/naming/resolve.mjs analysis <tmp>` 合入后的名字 | **176/176 与本表逐条一致**（无被后缀、无被替换） |

置信度分布：0.9 × 2、0.85 × 84、0.8 × 74、0.75 × 10、0.7 × 5、0.6 × 1。

## 跳过

**0 个**。本组 97 个声明没有 frozen（direct-eval）绑定，没有 `no binding at this offset`；起始出现的 176 个唯一 `_K` 键全部命名，重渲染残留 `_K` 为 0。

## 做法

- 只用 `show` 输出 + `cat` 追加；8 批，每批 8–30 行，每批后跑 `check`。
- 先命名跨声明复用的顶层绑定，再补局部参数：zod 的 `parse`/`parseAsync`/`safeParse`/`safeParseAsync`/`encode`/`decode`/`encodeAsync`/`decodeAsync`/`safeEncode`/`safeDecode`/`safeEncodeAsync`/`safeDecodeAsync`（`chunk-7vp249v4.js@79745…79844`）、`ZodType` 内层 `initLocaleError`、`ZodString`/`_ZodString`/`ZodJWT`/`ZodEmoji`/`ZodIPv6`/`ZodObject`/`ZodDefault`/`ZodPrefault`/`ZodCatch`、`$ZodCheckOverwrite`/`$ZodCheckMaxLength`/`$ZodCIDRv4`/`$ZodUndefined`/`$ZodEnum`/`$ZodTransform`/`$ZodPreprocess`/`$ZodLazy`/`$ZodCustom`、`_lt`/`_multipleOf`/`_check`/`_custom`。
- 第三方包按包自身习惯，并尽量与同包 cjs 版已重建的名字对齐（cjs 文件是同一包的另一份产物，导出名就是作者原名）：
  - `core/core.js`：`MIi` → `constantCatch`（cjs `util.constantCatch`）、`Fr` → `$constructor`（cjs `core.$constructor`）、`bY` → `INVALID`。
  - `core/util.js`：`iSr` → `getEnumValues`、`Zgs` → `joinValues`、`EIi` → `nullish`、`CIi` → `propertyKeyTypes`、`C` → `members`、`shs` → `hide`、`IIi` 内 `typeof` 临时变量 → `getParsedType` 里的 `dataType`（对象抽成 `parsedType` 后原名叫 `getParsedType`）。
  - `core/api.js`：`qn` → `anyType`、`ye` → `_lt`、`ze` → `_multipleOf`、`Qn` → `_custom`、`hu` → `custom`（对照 cjs `_any`/`_lt`/`_multipleOf`/`_custom`/`custom`）。
  - `core/parse.js`：`rr`/`nr`/`sr`/`ur` 是 `_encode`/`_encodeAsync`/`_safeEncode`/`_safeEncodeAsync` 的别名工厂，因同 scope 已有同名（`_encode` 等），命名 `decodeFactory`/`decodeAsyncFactory`/`safeDecodeFactory`/`safeDecodeAsyncFactory`（它们实际绑定的是 decode 方向的 `rr`/`nr`/`sr`/`ur`）。
  - `core/regexes.js`：`hr` → `nanoidLength`（生成 `^[a-zA-Z0-9_-]{n}$`）、`vr` → `emojiRegex`、`ar` → `cuid`、`Or` → `date`、`Ar` → `time`。
  - `classic/compat.js`：`Fgs`/`F1e`/`v1i` 按其调用的 `_coercedString`/`_coercedNumber`/`_coercedBoolean` 命名 `coerceString`/`coerceNumber`/`coerceBoolean`；`var e` 命名 `ZodFirstPartyTypeKind`（v3 兼容枚举壳）。
  - `locales/he.cjs`：`typeName`、`genderForm` 按希伯来语措辞（阴性/阳性）分支含义。
- 每个候选名先用 `bindingsOf` + final8 的 top/locals 名字集合（`artifacts/tmp/v6/nm-<chunk>.txt`）与 `renameModule` 的 `conflicts` 预检，避免 `_2` 撞名。中途出现 4 个 `decode`/`decodeAsync`/`safeDecode`/`safeDecodeAsync` 同 scope 撞名，改成 `*Factory` 后清零；`nanoid`/`params` 也各撞过一次，改成 `nanoidLength`/`normalizedParams`。

## 发现的问题

1. **清单 `unnamed` 与 `show` 头部数字不一致，plan 合计 177、`show` 头合计 216（差 39）。** 15 个声明的计数偏小（`iA` 9 vs 30、`Ti` 12 vs 16、`kw` 4 vs 6、`Fr` 1 vs 2、`Y` 类 1 vs 2 等），应是 plan 生成后 `final8` 又被别的成员写入、plan 未重算。去重后的唯一键 176 才是真实量，重渲染 0 unnamed 可证。
2. **`show` 头部的 `unnamed` 把同一偏移重复计进多个声明。** `iA`(30) 与 `Ti`(16) 大量重叠（`@79745`…`@5291`），`qne`/`qn`、`wc`/`Zc`、`B1e`/`u`、`ie`/`yn`、`Ti`/`Ys` 也是同一键出现在两个声明。按头部数字累加会高估工作量。
3. **`bindingsOf` 的 `start` 与 `analysis/scan/decls.jsonl` 的声明区间不是同一坐标系，v5 文档里"按声明区间重算"的做法在本组不可用。** 用 `b.start >= d.start && b.start < d.end` 统计区间内绑定得到 0；`show` 的 `_K` 偏移才是可直接使用的 naming key。本组改以合并后的 final 目录整体重渲染（97/97 声明 0 unnamed、176/176 键名一致）作为覆盖证明。
4. **final8 里已有的若干 zod `core/api.js` 名字与函数体不符（未覆盖，仅记录）。**
   - `_creditCard`（原 `Fn`，`chunk-7vp249v4.js@53493`）函数体是 `format: "jwt"`，真实名应为 `_jwt`（cjs `api.cjs` 里 `_jwt` 正是 `format: "jwt"`，`_creditCard` 是 `credit_card`）。
   - `_mac`（原 `Rn`，`@52977`）函数体是 `format: "cidrv4"`，真实名应为 `_cidrv4`（cjs 里 `_cidrv4` 就是 `cidrv4`，`_mac` 是 `mac`）。
   - `_float32`（`Vn`，`@54333`）函数体是 `format: "int32"`，应为 `_int32`；`_uint32`（`Kn`）函数体是 `type: "boolean"`，应为 `_boolean`；`_bigint`（`Wn`）函数体是 `type: "undefined"`，应为 `_undefined`。
   规律是：本构建把 `mac`/`credit_card`/`float32`/`uint32`/`bigint` 这些格式/类型的构造函数整段裁掉了，重建时按"cjs 里的下一个名字"顺序贴名，于是从被裁掉的位置起整体错位一格。谁改这些名字要按函数体而不是按顺序。
5. **`classic/schemas.js` 的 `bigint`/`float32` 工厂链沿用了上面的错位。** final8 把 `QD`（体为 `_bigint(ZodUndefined, params)`，而 esm 的 `_bigint` 实际产 `type: "undefined"`）叫 `bigint`、`wIi`（`_float32(ZodNumberFormat, …)`，实际产 `format: "int32"`）叫 `float32`。为了不让本表再扩散错语义，我把 `wIi` 命名 `int32Schema`、`QD` 命名 `undefinedSchema`（并注明原因）；`E`/`M`/`zg` 分别命名 `numberSchema`/`booleanSchema`/`nullSchema`，`qne` 命名 `anySchema`。
6. **`classic/compat.js` 的 `var e; (function (o) {})(e || (e = {}))` 是空的兼容占位**（cjs 版同样为空，v3 只剩枚举壳）。命名 `ZodFirstPartyTypeKind` 只是借位；若要严格，应用 `compatTypeKindPlaceholder`。
