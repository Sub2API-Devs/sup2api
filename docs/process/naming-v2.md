# 第三方代码（vendor）命名：name-v2（组 2，下标 [2]）

范围：`analysis/segments/naming-vendor.json` 第 2 项（下标 `[2]`），清单 `dirs` 首尾为 `vendor/@smithy/credential-provider-imds` … `vendor/lodash-es/uniqBy.js`，共 **473 个声明 / 计划 unnamed 1,444**，名字表 `artifacts/tmp/lead/final8`。起点：`semantic-v2.jsonl` 不存在（本组首个写者）。覆盖的包（按出现顺序）：

- `@smithy/*`：credential-provider-imds、eventstream-codec、fetch-http-handler、node-config-provider（`node-config-provider` + `defaults-mode` 内联）、node-http-handler、property-provider、shared-ini-file-loader（`getSSOTokenFilepath`）、signature-v4、types、util-middleware、util-uri-escape、util-utf8
- `@typespec/ts-http-runtime`：commonjs/enum 的 `proxyPolicy`、esm 的 logger/debug、pipeline、pipelineRequest、policies（agent/retry/formData/no-proxy）、restError、util（checkEnvironment/concat/delay/error）
- `acorn`、`acorn-walk`、`agent-base`、`ajv`（core、compile、vocabularies 的 applicator/format/discriminator/dynamic/unevaluated 等）、`ajv-formats`（formats/limit）、`ansi-styles`、`asciichart`、`asynckit`（index/lib state|iterate）、`auto-bind`、`axios`（esm + node adapters）、`bignumber.js`、`buffer-equal-constant-time`、`bun-resource`（两个 chunk 的资源包装）、`call-bind-apply-helpers`（functionCall/get-intrinsic 一条链）、`chalk`（`source/index.js` 与其 vendored ansi-styles/supports-color）、`chart.js`（片段）、`chokidar`（`index.js` 的 FSWatcher/DirEntry/WatchHelper + `runtime.js` 的 NodeFsHandler 与轮询表）
- `cli-highlight` 主题、`combined-stream`、`commander`（index/command/suggestSimilar）、`convert-to-spaces`、`cross-spawn`（parse/readShebang/resolveCommand）、`debug`、`default-browser-id`、`diff`（libesm 的 line/word/patch）、`ecdsa-sig-formatter`、`entities`（decode_codepoint/decode-data-xml）、`env-paths`、`es-object-atoms`、`es-toolkit`（withTimeout/colors/escape/unescape）、`eventsource-parser`、`execa`（index/lib pipe/stream）、`fast-sha256`、`fast-xml-parser`（`fxp.cjs` 的 DocTypeReader 等）、`fflate`、`follow-redirects`、`form-data`、`gaxios`、`gcp-metadata`、`get-east-asian-width`、`get-intrinsic`、`get-proto`
- `google-auth-library`（auth 的 oauth2client/googleauth/refreshclient/urlsubjecttokensupplier/awsrequestsigner/computeclient 等、crypto 的 browser/node/shared、gtoken/getCredentials、util、index）、`google-logging-utils`、`graceful-fs`、`highlight.js`（core 与一长串 languages）、`ignore`
- `jose`（dist/browser 的 aesgcmkw/pbes2kw/jwk_to_key、dist/node 的 jws/jwt/lib、dist/webapi 的 jws/jwe/jwk/lib/asn1/buffer_utils/content_encryption/key_management/pbes2kw/signing/validate）、`json-bigint`、`json-schema-typed`、`jsonc-parser`（edit/parser/main）、`jwa`、`jws`
- `lodash-es`（`_inlinedHelpers.js` 的整片内联助手链、`_baseGetTag`、`_deburrLetter`、`_unicodeWords`、`reject`、`toString`、`toInteger`、`toNumber`、`uniqBy`、`countBy`、`once` 等）

## 交付

| 项 | 数量 |
|---|---|
| 命名表 | `naming/semantic-v2.jsonl`，**1,444 行 / 57 个 chunk**（只 `cat 批次 >> 目标` 追加，未用 Write 整体重写） |
| 批次 | 62 个批次文件（`artifacts/tmp/v2/b01–b62.jsonl`，后续补写批次 b24–b62 与 b51 内的修正），每批 ≤30 个声明 |
| `annotate check naming/semantic-v2.jsonl artifacts/tmp/lead/final8` | **0 problems，0 suffixed by conflicts** |
| 覆盖率 | 用 `tools/naming/resolve.mjs analysis artifacts/tmp/v2/final9` 合入本表后重渲染 473 个声明：**剩余 `_K` 为 0** |
| 唯一键 | 1,444（无重复行、无保留字、无 `_K` 形式的键名） |
| 跳过 | **0 个绑定**（详见下方「发现的问题」第 1、6 条：中间一度有 185 个键因两条工具/规则问题看似未命名，最终全部补齐） |

置信度分布：0.95 × 2、0.9 × 234、0.85 × 993、0.8 × 172、0.75 × 16、0.7 × 26、0.6 × 1。

## 命名约定

- CommonJS 包装函数（本仓库的 `x = (exports, module) => () => (module || x((module = {exports:{}}).exports, module), module.exports)`）：按包习惯保留 `require_<模块或文件名>`；内层导出对象用 `cjsExports`、模块对象用 `cjsModule`（与 final8/v1/v6 一致）。
- `var X = x(function(){...})` 懒初始化（`Xa(()=>{...})`）：按导出的工厂名（`init_credential_provider_imds_*` 由 final8 给，其余按包名）。
- 有 npm 源码的包一律对齐 npm 里真实的符号名（`isImdsCredentials`、`fromImdsCredentials`、`getExtendedInstanceMetadataCredentials`、`fromContainerMetadata`、`getCmdsUri`、`MessageDecoderStream`/`MessageEncoderStream`、`fromEnv`/`fromSharedConfigFiles`/`fromStatic`、`setConnectionTimeout`/`setRequestTimeout`/`setSocketTimeout`/`setSocketKeepAlive`、`NodeHttp2ConnectionPool`/`NodeHttp2ConnectionManager`、`resolveDefaultsModeConfig`/`inferPhysicalRegion`、`SignatureV4`/`SignatureV4Base`/`getCanonicalHeaders`/`getPayloadHash`/`getSigningKey`…，以及 lodash 的 `baseSortedIndexBy`/`baseSortedIndex`/`baseUniq`/`arrayIncludes`/`createBaseEach`/`createAggregator`/`baseAggregator`/`isPlainObject`/`baseToString`/`deburrLetter`/`unicodeWords`…）。
- 同一 `var A = B` 别名行统一 `<原名>Alias` 或 `import_<原名>`（如 `import_baseSortedIndexBy`、`baseEachAlias`）。
- UMD 包裹（acorn/acorn-walk）：`root`（`(function(root, factory){...})` 的外部参数）、`exports`（factory 的 exports 参数）；被 final8 判定为全局名而无法命中的情形改用 `acornExports`/`walkExports`。
- 压缩的类/工厂命名按其中的字符串与字段（`chokidar` 的 `FSWatcher`/`NodeFsHandler`/`WatchHelper`/`DirEntry`、`DefaultClipboardWatch` 读不到的私有包按行为）。

## 发现的问题

1. **`annotate.mjs show` 的「剩余」统计口径与 `resolve.mjs` 的保留名表冲突，导致 56 个合法命名在合并后静默失效。** `annotate check` 只校验「绑定存在 / 未 frozen / 名字是合法标识符」，**不检查名字是否在 `resolve.mjs` 的 `RESERVED` 里**；我早期按注释（`self`、`process`、`Buffer`、`crypto`、`exports`、`module`、`Request`、`Response`、`fetch`、`URL`、`escape`、`global`）命名 CommonJS 包裹参数和 Node 内建模块别名，`check` 全程 0 problems，但用 `resolve.mjs` 合入后这些名字被直接丢弃、`show` 里仍显示 `_K`。60 个受影响条目已全部改成 `cjsExports`/`selfRef`/`processModule`/`BufferCtor`/`cryptoModule`/`RequestCtor`/`fetchFn`/`URLCtor`/`escapeRegExp`/`globalObject` 等。**建议：`annotate check` 加一条「名字不得在 RESERVED 中」的校验**，否则后续成员会反复踩。
2. **`final8/top.json` 里大量 `source:"minified"` 的自别名条目会一直被 `show` 标成 `<名>_K<偏移>`。** 例如 `chunk-7vb8p3zb.js@6635` 的 `tos`、`chunk-m4p5zn6n.js@7232` 的 `Ce`、`chunk-5h78gfwc.js@45024` 的 `Ue`：`top` 里 name 与 min 相同，`annotate` 的判定 `top[file][key].name === b.name` 认为「已命名」从而仍显示 `_K`；但 `resolve.mjs` 优先取 semantic 候选（我的条目），所以只要我写入就能真正改掉。也就是说：**`show` 里显示 `_K` 不代表没有名字，只代表 final8 里没有名字**；重渲染必须用「final8 + 本表」合并后的目录（我用了 `resolve.mjs` 生成的 `artifacts/tmp/v2/final9`）才准确。本组 172 个这类键都是这样补齐的（第二遍扫描剩 173 个，其中 1 个是保留名问题）。
3. **`show` 头部 chunk 与绑定实际 chunk 不一致（v1 记录过，这次又遇到）。** 例如 `chunk-5h78gfwc.js#E` 里出现的 `@23869/@23891` 实际绑定在 `chunk-2tyrgda4.js`（`jose/dist/browser` 与 `dist/webapi` 共用一个 `init_content_encryption_2`）；`annotate check` 以 `no binding at this offset` 拦住，我据此改写了 `file` 字段。**写文件名前用 `bindingsOf` 核对或让 check 兜底**，本组累计修正 11 条（1 批全错、其余零散）。
4. **`resolve.mjs` 的 placeholder 归一化会吞掉「名字里带 `_K<偏移>`」的条目**：我最初有 3 行把 `<min>_K<off>` 写进 name（如 `b_K262`），`check` 不报错，但 `resolve` 会把它们当占位符处理。现已全部改为真实名字。名字里不要出现 `_K<数字>`。
5. **跨 chunk 的别名链容易撞名**：lodash 的 `_inlinedHelpers.js` 分散在 `chunk-bfnfj4kx.js` / `chunk-dcmhvw5a.js` / `chunk-8nhse09v.js` / `chunk-a16kyqj3.js` / `chunk-byv2e1t5.js` / `chunk-ktpw8eqa.js` 六个原始 chunk 里，同名函数（`baseSortedIndexBy`、`createBaseEach`、`baseIndexOf`、`toString`、`isPlainObject`、`baseToString`）在同一 chunk 的不同位置各出现一次。同名的第二次出现会被引擎加 `_2`，所以给它们加了限定词（`baseEachInline2`、`import_baseSortedIndexBy_2`、`toStringInline`、`isPlainObjectInline`、`MAX_ARRAY_LENGTH_PRIMARY`、`objectProtoBaseTag`、`symbolExport`）。
6. **`@typespec/ts-http-runtime` 的 `dist/esm` 与 `dist/commonjs` 是同一份源码的两份拷贝**，`vendor-ref` 的 `proxyPolicy.js` 与 chunk 内代码逐行一致（`globalNoProxyList`/`globalBypassedMap`/`loadEnvironmentProxyValue`/`getDefaultProxySettingsInternal`/`proxyPolicy`），但 chunk 里 `#private` 字段被降级成 `_` 前缀，需按行为对应而不能直接贴名字。
7. **`chokidar@6.0.0` 的 `index.js` 是重构过的版本**，`vendor-ref` 里 `runtime.js` 只有 `isWindows`/`normalizePath`/`EVENTS`/`WatchHelper` 等公共符号，而 chunk 里的 `NodeHttpHandler` 式实现（`NodeFsHandler`、`_handleFile/_handleSymlink/_handleRead/_handleDir/_addToNodeFs`、`watchFile/unwatchFile` 的订阅表）来源于另一个（v3/v4 血统的）分发文件，`vendor-ref` 中没有；这批名字（`delegateToSubscribers`/`watchWithNodeFs`/`watchWithPolling`/`setPollingInterval`/`refreshFolderStamp` 等）是按代码行为 + 与 v3 源码的对应关系命名的，置信度 0.8。
8. `acorn` 的 UMD 外层参数（`b_K262`）在 `check`/`resolve` 里都属于模块作用域，能被改名，但 `b_K443`（factory 的 exports 参数）如果命名为 `exports` 会被 `RESERVED` 丢弃，所以用了 `acornExports`。
