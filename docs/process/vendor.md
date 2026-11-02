# vendor：第三方包识别（过程记录）

负责人：vendor 成员。写入范围：`tools/vendor/`、`vendor-ref/`、`analysis/vendor/`、本文件。

## 1. 结论（2026-11-03）

| 项 | 值 |
|---|---|
| 顶层声明单元总字节（`orig-decls` 全部单元） | 38,808,000 |
| npm 第三方 | 6,382,353 B（16.4%），255 个包，6,044 条声明记录 |
| 私有包（npm 上没有） | 655,485 B（1.7%）：`@ant/managed-config` 651,521 B（63 个 CJS 包裹）、`@ant/computer-use-swift`、2 个未署名的 `@ant/(unnamed)`、2 个原生 .node 包裹 |
| CJS 包裹但未认出包 | 3,651 B（12 个，都很小，见 5.3） |
| Bun 运行时帮助函数 | 983 B（`chunk-rshven70.js` 全部 8 个导出） |
| 第三方合计占比 | **18.1%**（按声明字节） |
| 另有整文件资源脚本 | `mermaid.min.js`（mermaid 11.16.1，3.57 MB 解压后）、`hljsBundle.generated.min.js`（highlight.js 11.11.1 自定义 IIFE，605 KB）、`chart.umd.min.js`（Chart.js 4.5.1，209 KB）；都是 zstd 压缩，Babel 不解析，记在 `packages.json.resourceScripts` |
| 与一方匹配器冲突 | 144 条声明（32 KB），`analysis/vendor/firstparty-conflicts.jsonl` |

版本判定依据统计（263 个条目）：`fingerprint` 156、`fingerprint-range` 79（若干版本代码完全相同，给出区间）、`string+fingerprint` 16、`string` 4、`none` 7（私有/未解析）、Bun 1。

## 2. 交付物

- `analysis/vendor/decl-vendor.jsonl`：每个被判为第三方/运行时的顶层声明一行
  `{id, file, names, pkg, version, pkgFile, method, score, bytes, versionCandidates?, privateName?, parts?}`。
  - `id` 与 `analysis/scan/decls.jsonl` 约定相同（`${file}#${names[0] ?? '@'+start}`）。
  - `version` 是单一版本或区间 `a..b`（区间内所有版本的对应代码与 316 一样好），`versionCandidates` 列出全部候选。
  - `parts`：同一条 `var a=…,b=…` 语句里各声明符归属不同时才出现（Bun 会把相邻模块的 var 合并成一条语句，见 6.2）。
  - `pkg` 特殊值：`bun-runtime`（Bun 帮助函数）、`private-unresolved`（带 `privateName`）、`unresolved-cjs`、`bun-resource`（`module.exports=__cc_resource_N` 包裹）。
  - `method`：`cjs-fingerprint`、`cjs-require-graph`、`cjs-fingerprint+context`、`cjs-layout`、`esm-fingerprint`、`esm-layout`、`embedded-runtime`、`helper:bun-runtime`、`cjs-unmatched(+string-clue)`、`native-addon`、`resource-wrapper`。
- `analysis/vendor/packages.json`：`totals`、`externals`（未打包、保持外部导入的包）、`resourceScripts`、`packages`（每包 kind、version、versionBasis、versionCandidates、otherCopies、versionStringsInCode、versionRanking、bytes、decls、chunks、files、methods）。
- `analysis/vendor/helpers.json`：`runtimeChunks` + 每个 chunk 的帮助函数本地名：`roles`（角色 → 本地名）、`imported`（从运行时 chunk 导入）、`defined`（本 chunk 内定义）。
- `analysis/vendor/firstparty-conflicts.jsonl`：`decl-map.jsonl` 里有 `refFile`、本阶段判为第三方的声明，带双方方法与得分、`vendorShare`（声明内第三方字节占比）。
- `vendor-ref/package.json`：参考包清单（node_modules 与 `.versions/` 不入库，约 4 GB）。
- `tools/vendor/`：见第 3 节。中间产物 `analysis/vendor/index/`（不入库，约 900 MB）。

## 3. 工具与复现

```
bash tools/vendor/run.sh               # 完整：npm install、扫描、匹配、两轮版本探测、报告（约 1 小时，主要是下载与索引）
SKIP_FETCH=1 bash tools/vendor/run.sh  # 复用已下载的包（约 15 分钟）
```

| 文件 | 作用 |
|---|---|
| `lib/common.mjs` | 特征提取（复用 `tools/ast/lib/features.mjs` 的 walk，另加数字/正则、字符串 trim、不截断）、流式 JSONL 读写、声明名、形状 |
| `scan-original.mjs` | 重扫 `original/`：每条语句拆成声明符“单元”，记 token、引用、包裹类型（cjs/esm）、包裹体类型（json/native/resource）、包裹内调用顺序；识别帮助函数角色 → `index/orig-decls.jsonl`、`helpers.json` |
| `index-npm.mjs` | 扫 `vendor-ref/node_modules` 与 `.versions/`：每文件 token 与 require 解析，每文件顶层单元 → `index/npm-files.jsonl`、`npm-decls.jsonl`、`packages.json`（含依赖关系） |
| `match.mjs` | 归属（第 4 节）→ `index/unit-labels.jsonl`、`versions.json`、`match-debug.json` |
| `probe-versions.mjs` | 对已匹配的包从 registry 下载候选版本 tarball（`npm pack`，不安装、不跑脚本），解到 `.versions/<name@ver>/package` |
| `report.mjs` | 生成交付物 |
| `show-chunk.mjs`、`coverage.mjs`、`find-missing.mjs` | 调试：按 chunk 顺序看标签、按 chunk 覆盖率、找未识别且不像一方代码的连续段 |

安全：npm 包只作为文本读取并用 Babel 解析，`npm install`/`npm pack` 都带 `--ignore-scripts`，没有 `require` 或执行任何包内代码。

## 4. 做法

### 4.1 单元与特征

minify 只改绑定名，字符串、模板文本、属性名、非整数/大数字、正则字面量都保留，这些作为 token（`s:`/`p:`/`n:`/`r:` 前缀）。权重 = IDF（按 npm “文件键”计，见 4.3），相似度 = 加权 Dice。

单元不是语句而是**声明符**：Bun 会把相邻的 `var` 合并（跨模块边界也合并），预打包的 dist 文件也常一条语句声明几十个包裹。81,667 条语句 → 102,120 个单元。

### 4.2 Bun 运行时帮助函数

按结构识别，不看名字：把初始化表达式里的标识符都换成 `_` 后与模板比较。

- 共享运行时 `chunk-rshven70.js`（938 字节）：`x`=__commonJS（78 个 chunk 导入）、`Re`=__toESM（74）、`Ar`/`H1i`=__export（54）、`Be`=`import.meta.require`（52）、`Xa`=__esm（5）、`S`/`vn`=React Compiler 哨兵 `Symbol.for("react.memo_cache_sentinel"/"react.early_return_sentinel")`（138/26，注意它们出现在一方 React 组件里，不代表第三方）。
- 在 316 中，各 chunk 导入时**本地名与导出名相同**（都是 `x`、`Re`…），所以“每个 chunk 本地名不同”的担心不成立；但预打包的 npm dist 文件自带一套 esbuild 风格运行时（例：`chunk-r1g76qsy.js` 的 `J`/`qn`/`Ic`/`Eo`，来自 @modelcontextprotocol 的 .cjs 产物），这些在 `helpers.json.chunks[*].defined` 里，声明归到所在包（method `embedded-runtime`）。
- `chunk-0wqny7vr.js`（`b`/`c`/`de`… 恒等转换）是一方代码（日志字段类型标记），不是运行时。

### 4.3 参考包与版本空间

1. `vendor-ref/package.json`：旧版源码直接依赖 + chunk 里能看到的传递依赖；能从代码字符串定版本的钉死（`@anthropic-ai/sdk` 0.128.0 来自 `X-Stainless-Package-Version`，zod 4.6.2 来自 `{major:4,minor:6,patch:2}`，axios 1.15.2、openid-client 5.7.1、google-auth-library 10.6.2、gaxios 7.1.4、@grpc/grpc-js 1.14.4、@azure/* 、AWS 3.936.0、OTel api 1.9.0/core 2.7.1/sdk-logs 0.208.0、acorn 8.15.0 等来自内嵌 package.json 或 VERSION 常量），其余 `--before=2026-10-31` 取最新。安装 968 个包。
2. 第一轮匹配后，`probe-versions.mjs` 对 164 个已匹配的包（≥1.5 KB）下载：代码里出现的版本串 + 最近 8 个 minor 线各自最新补丁 + 更老 major 的最新版（990 个 tarball）；第二轮再补“选中 minor 线和下一条 minor 线”的全部补丁版（1,420 个）。合计 3,258 个包版本、132,666 个文件、142 万个 npm 单元。
3. **匹配与版本解耦**：同一包内同一路径的所有版本是一个“文件键”的不同变体。匹配按文件键做（IDF 也按文件键计，多版本不稀释 token）；每个单元记下“达到最高分的版本集合”。版本在最后（4.6）统一判定。

### 4.4 CommonJS 包裹（A 阶段）

1,580 个 `var X=x(function(exports,module){…})`。
- A1 指纹：与 CJS/JSON 文件键的最佳变体比 Dice，≥0.45 接受（1,393 个）。
- A2 require 图：已认出的包裹体内按顺序调用的其他包裹 = 该 npm 文件的 `require()` 列表，在列表里配对；列表长度相等且已知位置一致时按位置配（处理 `module.exports=()=>…` 这类几乎没有 token 的文件）。若某包裹的指纹标签不在调用者的 require 列表里，而列表中有分数接近的文件，以列表为准（例：yallist 的 `iterator.js` 原被配到 es-toolkit 的 `head.js`）。
- A3/A4 上下文：近似平局或弱候选（≥0.2）按调用者/相邻包裹所属包决定（highlight.js 不同版本的语言文件、@smithy 内部）。
- 包裹体是 `module.exports=require("./x.node")` → 原生插件；`=__cc_resource_N` → 资源；纯字面量对象 → JSON。

### 4.5 提升的 ESM 代码（B 阶段）

ESM 依赖（以及 Bun 转成 ESM 的 CJS，如 react/scheduler）被直接提升到 chunk 顶层，无边界。每个 chunk 做一次 Viterbi 分段：

- 状态 = 候选文件键（每单元按稀有 token 召回前 8 个）+ “未知”。
- 发射：取该文件键中最匹配的 npm 单元，`max(-5, 2m - W - 0.35(W_N - m) - 4)`（m 共享权重，W 本单元权重，W_N 对方权重），所以本单元多出的 token 和对方多出的 token 都扣分；未知发射 0。
- 转移：同文件 0，同包换文件 1.5，其他 8；两个单元之间夹着 CJS 包裹时禁止“继续同一文件”。
- 没有 token 的单元靠两侧插值（`esm-layout`）。

随后的过滤：
- **段过滤**：连续同包的一段，只有满足其一才保留：≥3 个不同 npm 声明以 ≥0.6 且共享权重 ≥20 匹配、有一个近乎相同（≥0.95）且共享权重 ≥25 的声明、总增益 ≥80、覆盖该文件 ≥50% 权重；或与相邻已确认段的包有依赖关系（Bun 连续输出一棵依赖树，例 open → default-browser → run-applescript → is-wsl）。去掉 347 个。
- **边缘修剪**：段边缘的纯插值单元，若 lead 的一方匹配器给了 ≥0.5 的匹配，让给一方（10 个）。

### 4.6 版本判定（C 阶段）

每个包：对所有“版本集合比该文件全部版本更窄”的单元，按 权重×分数 给版本投票，最高票（容差 min(20, 0.2%)）为主版本（可能是区间）；没被主版本解释的单元若权重足够（≥150）再选第二份拷贝（真实存在：jose 4.15.x 是 openid-client 5 的依赖，另有 jose 6.x；lru-cache 6 在 openid-client 下；highlight.js 10.x/11.8 的个别语言文件）。代码里出现的版本串与候选一致时记为 `string+fingerprint`。

## 5. 结果

### 5.1 包清单（按字节，前 30，npm）

| # | 包 | 版本 | 依据 | 字节 | 声明 | chunk |
|---|---|---|---|---|---|---|
| 1 | zod | 4.6.2 | fingerprint（另有字符串 `{major:4,minor:6,patch:2}`） | 732,400 | 599 | chunk-1ny7cxrt.js、chunk-7vp249v4.js 等 6 个 |
| 2 | highlight.js | 11.11.1 | string+fingerprint | 585,093 | 187 | chunk-egr0twnb.js |
| 3 | node-forge | 1.4.0 | fingerprint | 291,739 | 41 | chunk-fq0cr76a.js |
| 4 | @grpc/grpc-js | 1.14.4 | string+fingerprint | 272,422 | 65 | chunk-pwh5dx3n.js |
| 5 | @anthropic-ai/sandbox-runtime | 0.0.81 | fingerprint | 263,351 | 639 | chunk-fq0cr76a.js 等 6 个 |
| 6 | @mixmark-io/domino | 2.2.0 | fingerprint | 238,082 | 54 | chunk-vwj6ccer.js、chunk-ktx79ksk.js |
| 7 | ajv | 8.13.0 | fingerprint | 232,909 | 88 | chunk-r1g76qsy.js 等 4 个 |
| 8 | @anthropic-ai/sdk | 0.128.0 | string+fingerprint | 224,310 | 343 | chunk-hwmsct5x.js 等 12 个 |
| 9 | @opentelemetry/otlp-transformer | 0.208.0..0.209.0 | range | 215,323 | 23 | chunk-798ashq9.js、chunk-3nztfxrw.js |
| 10 | @modelcontextprotocol/client | 2.0.0 | fingerprint | 205,080 | 271 | chunk-r1g76qsy.js 等 8 个 |
| 11 | @bufbuild/protobuf | 2.12.1 | fingerprint | 153,617 | 62 | chunk-fq0cr76a.js |
| 12 | @bufbuild/cel | 0.4.0 | fingerprint | 152,551 | 36 | chunk-fq0cr76a.js |
| 13 | parse5 | 7.2.0..7.2.1 | range | 125,788 | 197 | chunk-6ja29j2n.js |
| 14 | acorn | 8.15.0 | string+fingerprint | 121,891 | 1 | chunk-ejvzjw0g.js |
| 15 | react-reconciler | 0.33.0 | fingerprint | 119,221 | 1 | chunk-bzr73sfg.js |
| 16 | @azure/msal-common | 15.13.1 | string+fingerprint | 115,522 | 159 | chunk-mrx6y2r5.js |
| 17 | protobufjs | 7.6.0（另 8.0.x 一份） | fingerprint | 115,271 | 47 | chunk-pwh5dx3n.js、chunk-798ashq9.js |
| 18 | google-auth-library | 10.6.2 | string+fingerprint | 102,429 | 44 | chunk-na3pph4p.js |
| 19 | @modelcontextprotocol/sdk | 1.29.0 | fingerprint | 96,273 | 119 | 10 个 chunk |
| 20 | @smithy/core | 3.30.0 | fingerprint | 96,078 | 28 | 7 个 chunk |
| 21 | jose | 6.2.2（另 4.15.x、6.2.5/6 两份） | fingerprint | 90,518 | 282 | chunk-5h78gfwc.js、chunk-2tyrgda4.js |
| 22 | @azure/msal-node | 3.8.1 | string | 75,922 | 65 | chunk-mrx6y2r5.js |
| 23 | @aws-sdk/core | 3.936.0 | fingerprint | 67,146 | 6 | 3 个 chunk |
| 24 | @aws-sdk/nested-clients | 3.936.0 | string+fingerprint | 62,443 | 46 | 6 个 chunk |
| 25 | @opentelemetry/sdk-metrics | 2.7.1 | fingerprint | 60,191 | 49 | chunk-wrv5s6k4.js |
| 26 | axios | 1.15.2 | string+fingerprint | 57,161 | 180 | chunk-h6b7mazd.js、chunk-tyg7f3ek.js |
| 27 | @azure/identity | 4.10.1 | string | 56,697 | 105 | chunk-mrx6y2r5.js |
| 28 | vscode-jsonrpc | 8.2.0..8.2.1 | range | 54,972 | 16 | chunk-t4ksmxzx.js |
| 29 | @opentelemetry/semantic-conventions | 1.37.0..1.39.0 | range | 54,603 | 6 | chunk-bwbq4xvm.js |
| 30 | openid-client | 5.7.1 | string+fingerprint | 54,561 | 29 | chunk-1ny7cxrt.js |

完整清单见 `packages.json`。按方法：`cjs-fingerprint` 4.13 MB（1,236 条）、`esm-fingerprint` 1.85 MB（3,373）、`esm-layout` 0.24 MB（1,183）、`cjs-require-graph` 0.15 MB（132）、其余很少。

### 5.2 版本上值得注意的

- `@anthropic-ai/sdk` 0.128.0：代码字符串与指纹一致（后续版本 0.129+ 明显更差）。但一方 chunk 里有几段 `lib/internal/tracing/response.mjs` 风格代码只与 0.134+ 匹配（见冲突表 `mRe`/`HGt`/`$jo`），更可能是一方代码借用了相同的用量字段名，已列入冲突。
- `@modelcontextprotocol/client`/`core` 2.0.0、`@modelcontextprotocol/sdk` 1.29.0：两套 MCP SDK 同时在包里（新的 v2 拆包 + 旧 v1）。v2 的投票明显集中在 2.0.0（2.1.0 差约 1.8 万权重），但 2.0.0 本身也只解释了部分单元，可能是 2.0.x 之后的未发布构建或带补丁版本，未进一步核实。
- react `19.3.0..19.3.1`、scheduler `0.26..0.28`：React 核心在 chunk-p86mcgbc.js/chunk-nn4p932b.js（Bun 把 CJS 转成 ESM 后提升），证据少（约 6 KB）；react-reconciler 0.33.0 对应 React 19.2 线（`19.2.0` 字符串在 reconciler 里），两者结论有张力，以 react-reconciler 为准更可信。
- `highlight.js`：主体 11.11.1（与资源 bundle 的 banner 一致），另有 10.x 与 11.8 的几个语言文件（老 CJS 依赖带进来的拷贝，A4 上下文判定，可信度中）。
- `chart.js`：代码里只有 2 个零散声明匹配到 4.6.1，真正的 Chart.js 是资源脚本 4.5.1；这 105 字节可疑。`mermaid` 同理（声明级 796 B，真正的是资源脚本 11.16.1）。
- `fingerprint-range` 79 个：区间内版本对 316 来说不可区分，若要唯一版本需要别的证据（例如 lockfile），本阶段不再细分。

### 5.3 未识别部分

1. 私有包 `@ant/managed-config`（651 KB，chunk-1ny7cxrt.js 中连续 63 个 CJS 包裹）：托管配置 schema、SQL 计费表、Desktop 版本门槛等，字符串 `@ant/managed-config/deprecationClock` 指明包名。以 CJS 包裹形式存在，说明它是从 node_modules 打进来的工作区包。
2. `@ant/(unnamed)`：同一 chunk 的 `Hu`（模型档位 `sonnet/opus/haiku/fable/mythos`）、`__`（`TIER_ALIASES`、`isDefinitelyNotAnthropicModel`），紧挨 managed-config，可能是同一工作区的另一个包。
3. `unresolved-cjs` 12 个（3.6 KB）：如 `chunk-edce4vxq.js` 的 `ss`/`Nme`/`$me`（AWS body-length / hash 工具，@smithy 版本差异太大）、`chunk-pwh5dx3n.js#td`（`@protobufjs/inquire` 被打包器改写成显式分支）、`chunk-h6b7mazd.js#yo`（`Number.isNaN` polyfill，几乎无 token）、`chunk-m4p5zn6n.js#Et`/`yn`（path-key 与 merge-stream 的变体）、`chunk-hrs3dad1.js#N`（`@ant/computer-use-input` 的桩）。
4. 不在 CJS 包裹里、也不像一方代码的连续段（`tools/vendor/find-missing.mjs`）：主要是一方的大段提示词/文本（如 changelog `chunk-v5a4j103.js#WTo` 90 KB、通知分类提示词 `chunk-jt8fac03.js#e`）、`chunk-18hwfzwa.js#rKe` 的 emoji 别名表（与 emojilib 有重叠，但结构不同，判为一方）、`chunk-p5akk6be.js#I` 同形字表、`chunk-n332mrkv.js` 的 ajv standalone 生成的校验函数（ajv 编译产物，属于一方 schema 的编译结果，不是 npm 文件）。

## 6. 坑

1. **Babel 无法解析的“JS”**：`chart.umd.min.js` 等 3 个文件以 `28 b5 2f fd` 开头，是 zstd 压缩的资源，Node 24 的 `zlib.zstdDecompressSync` 可解，版本从 banner 读。
2. **Bun 合并 var**：一条 `var a=…,b=…` 可能横跨两个源模块，也可能前半是 npm、后半是一方。必须按声明符匹配，再在 `decl-vendor.jsonl` 里用 `parts` 表示混合。
3. **CJS 也会被提升**：react、scheduler 等 CJS 文件被 Bun 转成 ESM 并提升，没有包裹。npm 侧要对 CJS 文件也建顶层单元，否则这些完全找不到。
4. **只装一个版本会错配**：第一版只用 `npm install` 的版本时，jose、zod v3、lru-cache、highlight.js 等多拷贝包被错配或空白，openid-client 的 lru-cache 6 被配到 11。改为“文件键 + 多版本变体”后解决；版本空间要靠 `probe-versions` 补。
5. **IDF 稀释**：把多版本文件当独立文档算 IDF，常见 token 的 df 被版本数放大，召回失败（yallist `iterator.js`）。改为按文件键算 df，召回阈值放宽到 df ≤ 3000。
6. **一方代码会“像”第三方**：Anthropic 自己的代码与 `@anthropic-ai/sdk`、`sandbox-runtime`、MCP SDK 处理同样的数据结构，单个声明的指纹能到 0.7–1.0（如只含 `"tool_use"`/`"server_tool_use"` 的 Set）。所以 ESM 部分必须要求“成段证据”（4.5 段过滤），只靠单声明分数会把一方代码大片误判。
7. **少量通用属性名**：`{r,g,b}` 这种颜色对象让 `@kurkle/color` 吃掉了一方 `utils/ansiToSvg.ts` 一整段；段过滤要求共享权重 ≥20 后消失。
8. **Windows 上的 GNU tar**：`tar -xzf D:\...` 把 `D:` 当远程主机；用相对路径 + `--force-local`。
9. **heredoc 里改代码会吃反斜杠**（lead 在 WORKLOG 记过同一个坑）：本阶段也踩到，`match.mjs` 的路径偏好正则、`scan-original.mjs` 的 `.node` 正则被吃掉，已改回并全部 `node --check`。
10. **大文件**：npm 单元 JSONL 超过 600 MB，`readFileSync().split` 超过 V8 字符串上限，改为流式读写（`eachJsonl`/`jsonlWriter`）。

## 7. 给 lead 的建议

1. **匹配器排除**：`decl-vendor.jsonl` 中 `pkg` 不是 `null` 的声明不应参与一方匹配（包括 `private-unresolved`：`@ant/managed-config` 在旧版源码里没有，配上的都是误配）。`parts` 存在时按声明符处理。
2. **冲突表** 144 条（`firstparty-conflicts.jsonl`）：其中 117 条第三方得分 ≥0.9。确定是第三方的典型：`chunk-1ny7cxrt.js#vu`（openid-client base64url，被配成 utils/powershell/parser.ts）、`chunk-798ashq9.js#xr`（protobufjs utf8，被配成 utils/stringUtils.ts）、`chunk-20ppca50.js` 整段（open/default-browser/is-wsl 等，被配成 desktopDeepLink.ts/platform.ts，旧版很可能是把这些包 vendored 进来）。需要人工看的（第三方证据弱或一方证据强）：`chunk-e6aww6q8.js#mRe/HGt/$jo`（用量合并，更像一方）、`chunk-fq0cr76a.js` 中 sandbox-runtime 与 `utils/sandbox/*` 的重叠（316 里 sandbox-runtime 是 npm 包，但一方适配层也在同一 chunk）、`vendorScore<0.6` 的 10 条。
3. **`chunk-0wqny7vr.js` 不是运行时**，`S`/`vn`（React Compiler 哨兵）出现在一方组件里，不能用“导入了运行时 chunk”来判第三方。
4. 切分（segments）阶段可直接用 `decl-vendor.jsonl` 的 `pkgFile` 作为第三方段的目标路径：`vendor/<pkg>/<pkgFile>`；同一 `pkgFile` 的声明在 chunk 内是连续的。
5. 资源脚本（mermaid/highlight.js/chart.js）整文件属于第三方，emit 时原样放进 `vendor/`。
