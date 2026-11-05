# 批次 nm318-11：第三方代码命名

## 范围与结果

- 输入：`artifacts/tmp/batches/nm318-11/{plan.json,hints.jsonl}`，一组 24 个声明（vendor/@anthropic-ai/claude-agent-sdk … vendor/zod/v4）。
- 按 `bindingsOf` 实测仍有压缩名的绑定 **135** 个（plan.json 写的 139 与 show 的"unnamed"计数都不准，以 `bindingsOf` 为准）。
- 已命名 **135 / 135**（100%），产物 `naming/semantic-nm318-11.jsonl` 共 135 行，一条一个真实偏移键。
  每个名字都锚在真实偏移键上，没有用 `top`/`export`。
- 另有 3 个声明（`vendor/axios/dist/esm/axios.js`、`vendor/tslib/tslib.es6.mjs`、`vendor/zod/v4/core/api.js`）按 `bindingsOf` 实测 0 个压缩绑定，全部已有可读名（`G`/`FormDataCtor`、`_extends` 等导出别名、`_lt`），故没有条目。
- 校验：`annotate.mjs check naming/semantic-nm318-11.jsonl` → `135 lines, 9 chunks, 0 problems, 0 suffixed by conflicts`。
- 跳过 0 个。
- confidence 分布：0.9×5、0.85×49、0.8×9、0.75×12、0.7×54、0.65×1、0.6×1。

## 依据

`vendor-ref/node_modules/` 里有对应的 npm 包源码，绝大多数名字直接来自包内原名，而不是猜：

| 文件 | 依据 |
|---|---|
| `@anthropic-ai/sandbox-runtime/dist/sandbox/mux-proxy.js` 0.0.81 | 完全同构的 npm 源码：`backendSeq`、`createMuxProxyServer`、`dispatchHttp`、`openSockets` 等；没有原名的（`handleClientConnection`、`listenOnIpv6`、`onErrorHandler`、`reservedPorts`、`ipv6Error`）按行为命名 |
| `@babel/runtime/helpers/esm/importDeferProxy.js` 7.29.10 | 包内是另一种实现（`_importDeferProxy`），318 里是 zod 风格的 `build`/`schema` ProxyHandler 变体；`materializeSchema` + `schemaProxyHandlers` 按行为命名，参数用 Proxy trap 的标准形参名（`target`/`prop`/`receiver`/`value`/`descriptor`） |
| `@modelcontextprotocol/client` 2.4.0 `src-D_zzAWoS.mjs` | 参考源里的 schema 表逐条对上（`JSONValueSchema`、`RequestSchema`、`PaginatedResultSchema`、`PromptSchema`、`RootSchema`）；`wireResult`、`dispatchRequest`、`liftedResult`、`wireResultResponse`、`stampErrorBrands` 都是参考源原名 |
| `@modelcontextprotocol/core` 2.4.0 `auth-CUe6YdwF.mjs` | 参考源 `auth-UMQCo-ad.mjs` 的 46 个 schema 逐条对上（OAuth/OpenID 各 schema、`SourceSchema` 的 `SafeUrlSchema`→`Re` 等） |
| `@modelcontextprotocol/core` `schemas-lGLjBX8n.cjs` | `JSONRPC_VERSION = "2.0"`，参考源同名常量 |
| `@protobufjs/aspromise` | `inquire()` 里的 `mod`（因与压缩名 `mod` 同字面改叫 `resolvedModule`） |
| `bignumber.js` | `toFraction` 里的 `this` 别名（参考源叫 `x`，压缩名也是 `x`，改叫 `thisBigNumber`） |
| `eventsource-parser` | `createParser(config)` 的 `config`，空函数 `noop` 作 `onEvent/onError/onRetry/onComment` 默认值 |
| `fuse.js` | bitap 内层循环下标 `textIdx` |
| `react` | `useRef`/`useState`（hints 里 316 同名）、`Fragment`（hints 里 316 同名，`Symbol.for("react.fragment")`） |
| `axios` | `vendor/axios/dist/esm/axios.js` 那一段里 `sn`/`FormDataCtor` 等本来就有名字（`G` 之类的非 `_K` 名），实测该声明不改也和 npm 源一致，故没有条目 |
| `@anthropic-ai/claude-agent-sdk/query.js` | 无 npm 源，按签名/属性名命名：`writeBehindPromptHold(promise, writeFn)`、`writePrompt(message)`、`writeStreamMessage(text)`、`streamInput` 的 `writePromises`/`line`、`hasHookSetToBlock` 的 `hookList`/`hook`、`mcpAuthenticate` 的 `options`、initialize 后的 `hookSupportError` |
| `.../transport.js` | `PROMPT_HOLD_SUBTYPES`（`new Set(["interrupt","cancel_async_message"])`） |

## 发现的问题

1. `plan.json` 的 `unnamed` 计数（139）和 `annotate.mjs show` 输出标题里的 "N unnamed" 都与 `bindingsOf` 不符（如 `chunk-tp1gh0pb.js#xe` 标 15，实测 14；`chunk-qg41pqt6.js#y1` 标 12，实测 11；`chunk-ww9agm6g.js#sn` 标 0 且确实 0 个）。用 `bindingsOf` 逐条核对才可靠，本批按实测值做满。
2. `hints.jsonl` 的三条都只有 `Fragment`/`useRef`/`useState` 两个 react 文件，已全部沿用；其余 vendor 文件在 316 里没有可迁移名字。
3. `chunk-qq5knpkd.js#ot`（`auth-CUe6YdwF.mjs`）里 `ResultMetaObjectSchema`（`kr = j(()=>Rt({get[Je](){...}}))`）本身已有名字，其 getter 里引用的 `bTt`（`ImplementationSchema`）也已有名字 —— 与参考源一致，无需处理。
4. `chunk-qq5knpkd.js` 里同时内联了 `@modelcontextprotocol/core` 的 `auth`/`schemas` 与 `@modelcontextprotocol/client` 的 schema 表，同一 `JSONValueSchema`/`RequestSchema`/`PaginatedResultSchema`/`PromptSchema`/`RootSchema` 各出现两份；client 那一份加 `Client` 后缀区分（其中 2026 命名空间里的那份再加 `2026`）。这些名字只在本块内使用，`check` 未报冲突，但读时要注意两套 schema 的语义不同。
5. `chunk-qg41pqt6.js#kH` 的 `OH`/`LH` 在 npm 源里是 `let backendSeq = 0` 与一个常量；318 里 `OH` 变成 `listenFrontEnd` 的端口重试次数（`for(let n=OH;;)`、`--n===0`），语义已不是常量 8 的原义，按新用途命名 `MAX_PORT_ATTEMPTS`，`LH` 仍是 `backendSeq`。
6. `chunk-qq5knpkd.js#Fc` 的 `e` 是 `JSONValueSchema`，自引用只出现在 thunk 里（`P(()=>me(o(),e))`），能安全改名。

## 反引号/反斜杠坑

写 JSONL 一律用 Write 工具或 `node -e` 的 JSON.stringify，`note` 里含反引号和 `${}` 的条目（`streamInput`、`mux` 相关）都核对过没有变形。
