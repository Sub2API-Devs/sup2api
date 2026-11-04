# 第五阶段（第三方 vendor）命名：name-v1（组 1，下标 [1]）

范围：`analysis/segments/naming-vendor.json` 第 1 项（下标 `[1]`），清单 `dirs` 首尾为 `vendor/@grpc/proto-loader` … `vendor/@smithy/core`，共 22 个目录 / **416 个声明 / 计划 unnamed 1,566**。实际覆盖的包：

- `@grpc/proto-loader`、`@hono/node-server`、`@js-sdsl/ordered-map`
- `@mermaid-js/parser`（其中 `chunk-L2OVAXIS.mjs` 实为打包进去的 lodash-es 全套，占 254 个声明 / 705 个绑定，是全组最大一块）
- `@mixmark-io/domino`（HTML DOM 实现）
- `@modelcontextprotocol/client`、`/core`、`/sdk`（含 ajv 8.18 生成的六个 meta-schema 校验函数、cfWorkerProvider 的一份副本）
- `@opentelemetry/*`（api、api-logs、core、exporter-prometheus、otlp-exporter-base、otlp-grpc-exporter-base、otlp-transformer、resources、sdk-metrics、sdk-trace-base、semantic-conventions）
- `@protobufjs/codegen`、`@protobufjs/path`
- `@smithy/core` 全部 submodules（cbor 最大，单声明 126 个绑定）

## 交付

| 项 | 数量 |
|---|---|
| 命名表 | `naming/semantic-v1.jsonl`，**1,519 行 / 36 个 chunk**（只追加，未整体重写） |
| 批次 | 73 个批次文件（`artifacts/tmp/v1/b01–b73.jsonl`），每批 ≤30 个声明，`cat 批次 >> 目标` 追加 |
| `annotate check` | **0 problems，0 suffixed by conflicts** |
| 覆盖率 | 用「final8 + 本表合并」重跑 `show` 0–415：全组剩余 `_K` 绑定 **0 个**（工具正则口径；`SPAN_KIND_*` 之类字符串常量不计） |
| 跳过 | **0**（无绑定级跳过；4 个未在首批清单里显现的绑定补在 b73） |

置信度分布：0.9 9、0.85 1,122、0.8 157、0.75 102、0.7 123、0.6 6。

## 命名约定

- CommonJS 包裹：`require_<模块名>`（沿用 final8 已有习惯），模块内 `exports.foo` 优先用 `foo` 作内部名（如 `cjsExports.Buckets` → `class Buckets`）。
- 懒初始化 `x(function(...))` 的产物按导出名（`require_cbor`、`require_protocols`、`require_retry`）。
- lodash 内建按 lodash 源码的真实函数名：`baseKeys`、`arrayLikeKeys`、`equalArrays`、`equalByTag`、`equalObjects`、`baseIsEqualDeep`、`isIndex`、`arrayFilter`、`baseFlatten` 等；一个变量再赋给另一个的 `var X = Y` 别名行统一叫 `<原名>Alias`。
- ajv 生成的 meta-schema 校验器：`validate<Vocabulary>Schema`，内部沿用 ajv codegen 的变量语义（`instancePath`、`parentData`、`parentDataProperty`、`rootData`、`dynamicAnchors`、`vErrors`、`errorsCount`、`errsBefore<关键字>`、`is<关键字>Valid`）。
- smithy：cbor/retry/protocols/event-streams 一律对齐 npm 源码里的真实符号（`decodeIndefiniteMap`、`defaultRetryDecider`、`getRetryAfterHint`、`EventStreamMarshaller`、`calculateBodyLength`…）。
- 同名撞车（同作用域已有同名）不硬碰，改用限定词：`*Alias`、`equal*Tag`、`errsBefore<关键字>`、`omitClone*Flag`、`<语义>Default`；本次已把 20 余处这类重名提前改名，最终 `check` 报 0 suffixed。

## 发现的问题

1. **`show` 头部 chunk 与绑定实际所属 chunk 不一致。** 声明 `chunk-bwbq4xvm.js#Ep` 的输出里出现 `u_K260599`，但该偏移的绑定在 `chunk-798ashq9.js`；`chunk-3kpg9vdk.js` 的 `@3195/@3200/@6589` 实际属 `chunk-pjt9hgpa.js`，`@21475` 属 `chunk-exz1ts42.js`。按 show 头部写 file 字段会被 `check` 报 `no binding at this offset`——好在 `check` 会拦下，我因此修正了 8 条。教训：写文件名前用 `bindingsOf(file)` 核对，或用 `check` 逐批兜底（每批都跑了）。
2. **`final8/top.json` 里有一类 `source:"minified"` 的自别名条目**（`name` 与压缩名相同，如 `mve`、`$d`、`Td`、`ss`）。它们在 `show` 里仍显示成 `<名>_K<偏移>`（工具判定「名字与压缩名不同」才跳过），很容易在批量 grep 统计时漏掉；本组最后 4 个未命名绑定就是它们。用 `bindingsOf` 全量枚举（不过 idx 区间）才找全。
3. **`annotate check` 不检查重复行。** 我在 b39/b46 两批里重复写了同样 8 个键（其中 `@16911` 出现两个不同名字：`DEFAULT_ENV_VARS` / `DEFAULT_INHERITED_ENV_VARS`），`check` 仍然 0 problems。交付前已按「同键保留先写」去重（1,527 → 1,519），并把 `@16911` 定为 `DEFAULT_INHERITED_ENV_VARS`（对应 domino/stdio 的继承环境变量白名单）。
4. `@mermaid-js/parser` 的 `chunk-L2OVAXIS.mjs` 与 `vendor-ref` 里的 npm 包不同版本布局（bundle 667 KB vs chunk 11 KB），sourcemap 无法直接定位；命名依据是 `reconstructed/` 里的分块注释 + lodash 源码比对。该文件被拆进 `chunk-z0q4jgnc.js` / `chunk-xfjxv2be.js` / `chunk-dcmhvw5a.js` 三个原始 chunk，跨 chunk 的同一函数别名链（`RR = F`、`Uut = X` 之类）需要注意不能取同一个名字，否则同作用域撞名。
5. `@js-sdsl/ordered-map` 整段是红黑树实现，方法名（`I/B/_/g/O`、`R/K/L/k`）都是压缩后的方法名，只给参数/中间变量命名，方法本身不动；`TreeNode` 的 `t_2/e/s` 参数在多个方法里重复出现，用 `node/otherNode/child` 之类的上下文名区分。
6. `@opentelemetry/semantic-conventions` 的 19 个 `k8s.*` 常量原文是 `TEMPO_*` 命名（官方构建把 `TEMPO_` 前缀当作内部量），因此统一命名 `TEMPO_K8S_*`，与 `cjsExports.SEMRESATTRS_K8S_*` 的导出名区分开（两者不是同一批）。
7. `@modelcontextprotocol/client` 的 `cfWorkerProvider-l7BFVI5n.mjs` 与 `ajvProvider-BIwGVY6G.mjs` 含两份几乎相同的 meta-schema 校验器（五个 vocabulary 各一份），命名时按 `validate<Vocabulary>Schema` 统一，避免两份之间出现不同叫法。

## 做法

- 自写只读小工具放在 `artifacts/tmp/v1/`：`remain.mjs`/`todo.mjs`/`todo2.mjs`（用 `final8 + 本表` 按声明区间重算剩余 `_K`）、`coverage.mjs`（全组枚举并列出未命名键）、`unnamed.mjs`/`unnamed2.mjs`（复刻 `show` 的渲染）、`findconf.mjs`（打印会被加 `_2` 的冲突键）、`finalmerged/`（把本表合并进 `top.json` 的目录，只读用）。node 一律 ≤3000 MB。
- 节奏：`show` 一批 ≤30 个声明 → 写批次文件 → `cat 批次 >> naming/semantic-v1.jsonl` → `annotate check`（每批都跑）→ `findconf` 查撞名。中途 `check` 出现的冲突（同名 tag、同名 `objectProto`、`baseUnary`、`omit`、`skipValidation`、`callbackFutures` 等）当场改成限定词。
