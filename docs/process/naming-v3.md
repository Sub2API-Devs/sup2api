# 第三方代码（vendor）命名：name-v3（组 3，下标 3）

范围：`analysis/segments/naming-vendor.json` 第 3 项（下标 3），100 个声明 / 1,842 个压缩绑定，名字表 `artifacts/tmp/lead/final8`。`dirs` 首项 `vendor/lodash-es/upperFirst.js`、末项 `vendor/private-unresolved/index.js`，与派活消息一致。覆盖面：

- `vendor/private-unresolved/index.js`（`chunk-1ny7cxrt.js`，85 个声明、约 1,600 个绑定）：Claude Desktop 的私有托管配置包——模型名检查、托管配置弃用批次、egress 主机表与凭据族识别、托管 MCP 服务器与 plugin 工具策略、托管配置 schema 的 Zod 字段元数据、inference 配置（gateway/anthropic/bedrock/mantle/vertex/foundry 六个 provider 分支及 credential 判别联合）、self-hosted 会话配置、插件市场与组织设置。
- `vendor/lodash-es/upperFirst.js`、`vendor/lodash.camelcase`、`vendor/lodash.includes`（`chunk-s61vbvea.js` / `chunk-pwh5dx3n.js` / `chunk-mrx6y2r5.js`）：与 npm 源码逐段对应，`baseSlice`/`createCaseFirst`/`hasUnicode`/`unicodeWords` 等按 lodash 原名命名；`var X = Y` 的别名链用 `<原名>Alias`。
- `vendor/long/umd`（`chunk-798ashq9.js`）、`lru-cache`（`dist/esm/index.min.js` + `index.js`）、`marked`、`mermaid`（min.js 与 dist chunk）、`mime-types`、`node-forge`（aes/asn1/des/ed25519/jsbn/pbkdf2/pkcs7/rsa/util/x509）、`npm-run-path`、`object-hash`、`oidc-token-hash`、`openid-client`、`p-map`、`parse5`（dist + lib）、`picomatch`、`pkce-challenge`、`pngjs`、`private-unresolved`（audio-capture / clipboard-napi / computer-use-swift 垫片）。

## 结果

| 项 | 数量 |
|---|---|
| 命名条目 | **1,840**（`naming/semantic-v3.jsonl`，全部 `cat 批次文件 >> 目标` 追加，共 58 个批次 `artifacts/tmp/v3/b*.jsonl`） |
| 覆盖 chunk | 17 |
| `annotate check naming/semantic-v3.jsonl artifacts/tmp/lead/final8` | **0 problems，0 suffixed by conflicts** |
| 覆盖率复核（`artifacts/tmp/v3/remain.cjs`，按 `bindingsOf` + 声明区间重算 final8+本表） | 只剩 **1 个** `__dirname`（见"跳过"） |
| 全组 `show` 重渲染后残留 `_K` | **0** |

置信度分布：0.9 × 25、0.85 × 379、0.8 × 1,116、0.75 × 309、0.7 × 10、0.65 × 1。

## 跳过（1 个）

`chunk-ha3km179.js@7751`（`vendor/private-unresolved/index.js` 的 `@ant/computer-use-swift` 垫片）里的 `var __dirname = "/home/runner/work/..."`。它是 Node CJS 注入的模块级全局名，`bindingsOf` 里 scope 仍算 local、refs=1，但改名会与真正注入的 `__dirname` 语义冲突，按"看不出用途/不宜改名"跳过。它本来也不在清单的 `unnamed` 里（清单显示 5 个 unnamed 对该声明已全部清空）。

## 做法

- 每批 `show` 1–8 个声明；`chunk-1ny7cxrt.js` 的几个巨型声明（`@700307`、`@849854` 等 300–500 绑定）拆成 5–7 批追加，`check` 每批后跑。
- 私有包按导出名 + 代码行为命名：`x(function(cjsExports){...})` 的包裹参数统一叫 `cjsExports`/`cjsModule`；顶层 `var X = x(function(...){})` 叫 `require_<模块语义>`；barrel 里 `var A = require_x()` 叫 `<模块>Module`；`Object.defineProperty` 转发用的中间变量按被转发导出名命名。
- Zod 字段元数据一律按 `flatKey`（`inferenceBedrockRegion`、`selfHostedUrl` 等）与 `title` 文案命名；带 predicates 回调的配置字段里 `show`/`required`/`warn` 的第 1 个参数统一叫 `values`，第 2/3 个叫 `config`/`intl`。
- 第三方包按包自身习惯：lodash 用原名（`baseSlice`、`createCaseFirst`、`rsAstralRange`、`reUnicodeWord`）；lru-cache 用 `LRUCache`/`Stack`/`maxEntrySize`/`ttlAutopurge` 等既有属性名；p-map 用 `iterable`/`mapper`/`concurrency`/`stopOnError`；parse5 用 `TAG_NAMES`/`NAMESPACES`/`DOCUMENT_MODE`；node-forge 的 `bnp*`/`clone` 系列保留短参数（`r`/`y`/`e`）因为它们就是 jsbn 原名的缩写。
- 同一作用域重名（`_2` 后缀）逐批用 `artifacts/tmp/v3/conf.mjs` 检查并改名，最终本表 0 suffixed：先是 `chunk-s61vbvea.js` 里 `rsAstralRange` 等 6 处（second copy 改成 `rsUnicode*`），再有 `link`→`inlineLink`、`a`→`versionA/versionB`、`a`→`leftPolicies/rightPolicies`、`determineEcDPoPAlgorithm`→`ecDPoPAlgorithmHelper`、`require_packer`→`packerModule`。

## 发现的问题

1. **`show` 的偏移键必须按 (file, key) 核对，不能只看偏移。** `lru-cache/index.js` 的 5 个 `e_K18640` 等绑定实际在 `chunk-1ny7cxrt.js`，而我最初按 show 头部所在的 `chunk-02nm3ce0.js` 写入，`check` 报 5 个 `no binding at this offset`。同样 `chunk-s61vbvea.js@584205` 这类偏移在 `top.json` 里已有 `{"name":"MB","source":"minified"}` 的"保持"条目——它不会在 `show` 里显示 `_K`，但如果手写同名会与 final8 的 `minified` 条目共存（本表 91 条都属这种"同名自别名"，合并时后写生效，不影响）。
2. **`vendor/private-unresolved/index.js` 的模块间依赖链极深。** `Ir`（inference 配置）依赖 `Ar`（托管 MCP）、`Ar` 依赖 `Sc`（凭据头检测）与 `Xr`（弃用批次），`$n` 又依赖前面七八个模块；这些顶层模块绑定在 final8 里只有 2–3 个字母的压缩名，我是先一次性命名全部 12 个跨声明复用的模块变量（`yt`/`gr`/`Ar`/`Ir`/`Xr`/`$n`/`mn`/`Sc`/`wm`/`Hu`/`oa`/`Ns`），再逐声明写局部名，否则每个声明都要重复推理。
3. **`marked` 的 block/inline grammar 大对象里，同一偏移同时是声明起点和 `_K` 显示名。** `B__K381059` 这类"压缩名里带下划线"的绑定（`B_` 是原压缩名）在 prettier 输出里看起来像 `B__K381059`，实际 key 是 `@381059`，正常命名即可。
4. **`lru-cache/dist/esm/index.min.js` 的 `unsafeExposeInternals` 返回对象里同时出现 `c.#e`/`c.#D`/`c.#O` 等私有方法与 `#l`/`#c` 等字段**，私有名不在 `bindingsOf` 里，`show` 也不会给它们 `_K`，只有公开 getter 的参数是待命名项；这一条声明看似 90+ unnamed，实际可命名的是 100 多个短参数。
5. **`vendor/private-unresolved/index.js` 的 self-hosted 与 inference 两段有大量逐字重复的字段元数据**（`helperScriptLeaves` 被 `HelperScriptCreds` 与 self-hosted 两处复用），命名的正确顺序是先按一处命名、另一处写相同名字即可，不要为第二处另起一套。
