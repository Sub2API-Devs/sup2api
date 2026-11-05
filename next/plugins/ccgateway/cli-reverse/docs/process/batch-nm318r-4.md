# nm318r-4（第二轮）命名过程

## 范围与结论

- 批次范围：`vendor/axios/dist/esm/axios.js` … `vendor/zod/v4/core/api.js`，3 个声明、4 个 plan 内绑定，`hints.jsonl` 为空（0 条）。
- 4 个绑定 **全部命名**，覆盖率 4/4。`check`：`4 lines, 3 chunks, 0 problems, 0 suffixed by conflicts`。
- 用临时 final 副本（`work/final`）应用本批名字后重跑 `tools/verify/readability.mjs`：3 个声明所在文件在 `todo.jsonl` 里 0 条，`vendor.top` 的 `minified` 从 4 降到 0。

## 关键发现：本批一个 `_K` 都没有

`annotate.mjs show` 三处都是 0 unnamed，绑定上根本没有 `_K` 占位符。plan 里的 `unnamed` 计数来自 `analysis/readability`，它的判定是"模块整体被压缩 + 最终名仍只有 1–3 个字符（或等于压缩名）"，所以下面 4 个**已经有人给过短名**的绑定被算了进来：

| 绑定 | 原有名 | 来源 | 新名 |
|---|---|---|---|
| `chunk-ww9agm6g.js@47490` | `G` | semantic(v2) + `_authored-short-names` | `globalObject` |
| `chunk-01zearth.js@313` | `__rest` | auto | `__restDestructure` |
| `chunk-01zearth.js@501` | `__read` | auto | `__readIterable` |
| `chunk-m4y44r15.js@54816` | `_lt` | semantic(v6、zzzz-fixer4) | `_lessThan` |

偏移全部用 `bindingsOf()` 逐条核对过（`work/ph.mjs`），确认落在 plan 声明的 start–end 内、且就是 show 里那个标识符，没有相邻错位；hints 为空，不存在抄 316 偏移的问题。

## 逐个依据

- `@47490`：`var G = getGlobal()`，紧接两行 `FormDataCtor = typeof G.FormData < "u" ? G.FormData : void 0`，`isFormData` 后面也用它做 `instanceof`。axios 上游源码里这个常量作者自己就叫单字母 `G`（`vendor-ref/node_modules/axios/lib/utils.js:256`），单字母因此被 readability 判成压缩名。用 `globalObject` 比留 `G` 可读，也不和同模块已有的 `getGlobal` 冲突。
- `@313` / `@501`：来自 `import_tslib.default` 的 32 个解构之一。上游原名是 `__rest` / `__read`。readability 剥模块冲突标签的正则 `(?<=[\w$])_[a-z0-9]{4}\d*$` 恰好把 `__rest`、`__read` 剥成 `_`（长度 1）而记成压缩名，同列表中其它 `__xxx`（`__assign`、`__await`、`__param`……）都不受影响。保留 `__` 前缀与同列表一致，各加一个说明词的后缀。
- `@54816`：zod 的 check 工厂，body 是 `new $ZodCheckLessThan({check:"less_than",...,inclusive:!1})`，参数 `value`/`params`，与相邻 `_lte`(`@54898`)、`_gt`(`@54979`)、`_gte`(`@55064`) 同族（下划线=内部工厂，`classic/schemas.js` 以 `lt` 暴露）。按要求调用方 `_lt(value,params)` 的原名只差两个字母，故选 `_lessThan`。

## 已有名的核对（未改）

- `chunk-ww9agm6g.js` 里同批声明的 `isFormData`/`proto`/`kind`/`isURLSearchParams`/`isReadableStream` 等 14 个名字与 axios 上游逐字一致，没有问题。
- `chunk-m4y44r15.js` 的 `_lte`、`_gt`、`_gte`、`_multipleOf` 与 zod 上游一致；`@54619 _null_2` 是模块名冲突加的后缀（同 chunk 里另有 `null`），不是错名。
- `chunk-01zearth.js` 的解构列表与 tslib 上游顺序、名字逐项一致，没有错位。

## 其它发现（不算错，记一笔）

- `chunk-01zearth.js`（tslib 的 es6 包装）里 32 个解构名只 `export{vkr,kkr,RUi,pen,WSs,xUi}` 六个（awaiter/generator/values/await/asyncGenerator/asyncValues），`__rest`、`__read` 等 26 个在该 chunk 内 `refs=0`，是纯粹拉过来再被丢弃的绑定。真正的实现与使用都在 `reconstructed/vendor/tslib/tslib.js`（那边是 `__rest`/`__read` 原名）。所以这两个名字在本 chunk 内不会被别处引用，改名安全。
- 同一 regex 副作用还会落在别处：任何 `__` + 恰好 4 个小写字母的名字都会被写进 readability 的 todo。除本批两处外，`__read`/`__rest` 在 `tslib.js`、`reconstructed/dist/chunk-xtsax7jd.js` 里用的是同一批名字但没被 plan 收进来（那两处来自其它 chunk 的声明）。是否要统一追加后缀由 lead 定；本批只动 plan 内的两个。

## 产物

- `naming/semantic-nm318r-4.jsonl`（4 行，全部 `source:"semantic"`，顶层绑定均带 note）
- 本文件
- 草稿：`artifacts/tmp/batches-r2/nm318r-4/work/`（`dump.mjs` 绑定清单、`ph.mjs` 占位符核对、`bad.mjs` 复现 readability 判定、`show.txt`、`final/` 临时命名表、`readability*/` 校验输出）
