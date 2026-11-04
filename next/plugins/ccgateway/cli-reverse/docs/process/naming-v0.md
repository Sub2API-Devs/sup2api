# 第五阶段第二波（vendor）命名：name-v0（naming-vendor 组 0）

范围：`analysis/segments/naming-vendor.json` 第 0 项，528 个声明、清单 `unnamed` 合计 1,414，分布在 43 个 chunk。按路径：`vendor/_unknown`（anthropic-google-cloud-client、bedrockRuntimeConfig）、`vendor/@alcalzone/ansi-tokenize`、`vendor/@anthropic-ai/{bedrock-sdk,sdk,vertex-sdk,foundry-sdk,mcpb,claude-agent-sdk,sandbox-runtime}`、`vendor/@aws-crypto/*`、`vendor/@aws-sdk/*`（client-bedrock-runtime / client-bedrock / client-sts / client-sso / nested-clients / core / credential-provider-* / token-providers / middleware-* / xml-builder / util-user-agent-node / eventstream-handler-node）、`vendor/@azure/*`（core-client / core-rest-pipeline / core-tracing / core-util / identity / logger / msal-common / msal-node）、`vendor/@bufbuild/{cel,protobuf}`、`vendor/@growthbook/growthbook`、`vendor/@grpc/grpc-js`。开工前核对 `dirs` 首项 `vendor/_unknown/anthropic-google-cloud-client.js`、末项 `vendor/@grpc/grpc-js`，与派活一致。

## 结果

| 项 | 数量 |
|---|---|
| 组内仍为压缩名的绑定（final8 重算） | 1,411（清单写 1,414，差 3 是清单把已冻结/长度>3 的也算进去） |
| 冻结、不能命名（chunk-pwh5dx3n.js 的 protobufjs `inquire` 直接 eval 链） | 65 |
| 本表新命名 | 1,346 |
| 未命名 | 0 |
| `naming/semantic-v0.jsonl` 条数 | 1,346（43 chunk），去重后无重复键 |
| `annotate check` | 1,346 lines / 43 chunks / **0 problems** / 91 suffixed by conflicts（都是引擎的 `_2` 兜底，见下） |

用 final8 + 本表合并后重渲染全部 528 个声明：只剩 12 处 `_K` 显示，逐个核对都是**其它组声明**里的绑定（`chunk-3cddmtk7.js#Gur`、`chunk-fq0cr76a.js#cU`/`EC`、`chunk-mrx6y2r5.js#et`/`Bs`/`ua`/`Kn`/`tr`/`dy`、`chunk-m4dvt8pp.js#E`/`B`），不属于本组清单，故未写。

置信度：0.85 有 137、0.8 有 379、0.78 有 190、0.75 有 238、0.7 有 205、0.68 以下 96（最低 0.55）。全部 `source: semantic`。

## 命名依据

1. **npm 参考源码对齐**（`vendor-ref/node_modules` + `.versions/`）：`tools/naming/lib/vendor-align.mjs` 的 token 对齐，配两个自建工具：
   - `artifacts/tmp/v0/lib.mjs` / `lib2.mjs`：把 316 声明与上游文件（整文件 / 单个顶层语句）对齐，统计每个绑定的投票。
   - `artifacts/tmp/v0/lib3.mjs`：**逐语句**对齐（一条 316 语句对整份上游文件），修掉跨语句漂移；只采纳与声明级投票一致、且 `kind` 一致、share=1 的结果（"T3b-agree"，9 条）。
   全组约 115 条来自一致度 1.0 的对齐（T3）。
2. **字面量锚定**（最可靠，133 条 "T1"）：
   - 解构默认值：`constructor({baseURL: e = …})` 直接给 `baseURL` 等（anthropic-google-cloud-client 9 条、bedrock mantle-client 9 条、claude-agent-sdk 11 条、sdk uuid/process 3 条）。
   - AWS wire schema：`X = [3, "com.amazonaws.bedrockruntime", "ModelTimeoutException", …]` → 直接用字符串（client-bedrock-runtime / client-bedrock / client-sts / nested-clients 约 105 条）。
3. **包结构模式**（58 条 "T2"）：`X = Re(require_y())` → `import_y`；`X = init_y()` → `init_y`；当 y 已有名字时按 esbuild 风格带 `_2`/`_3`（`import_core_2`、`import_index_browser_2`），与 `analysis/names/vendor.jsonl` 的自动命名风格一致。**注意**：这一档最初因工具里的区间判断写反（`n0.start < b.declStart`）全被漏掉，修好后从 11 条涨到 58 条。
4. **逐句阅读**：`claude-agent-sdk` 的 index/query/transport/transcriptMirror（无 npm 源码，`vendor/` 里只有 placement）、`sandbox-runtime` 的 sandbox-utils 存储读取、`growthbook`、`grpc-js`、`azure` 的零散条目，按代码与字符串命名（约 480 条）。这批置信度 0.7–0.8。

## 跳过的（65 个）

全部是 `chunk-pwh5dx3n.js` 里 protobufjs `inquire` 直接 eval 波及的绑定（`bindingsOf` 报 `frozen`），引擎会拒绝改名，本表不写。

## 发现的问题

- **清单 `unnamed` 与真实绑定数不一致**：清单合计 1,414，按 `bindingsOf` + final8 重算是 1,411（差 3，冻结/名字长度>3 的计数差异）。另外同一个偏移会出现在多个声明里（例如 `chunk-3cddmtk7.js@20621` 既是 `#Te` 的绑定也在相邻声明范围内），按区间统计会重复计，必须按 `file+key` 去重。
- **`show` 头部 chunk 与实际绑定 chunk 常常不同**：`vendor/@aws-sdk/client-sso/package.json.js` 的 `@1973` 实际在 `chunk-kejz1rpb.js`，`vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs` 的 20 个绑定分布在 `chunk-p8kytbnw/38x90rmj/g54kbxqw/fe6rs39h/e6aww6q8` 五个 chunk。写错文件 `check` 会报 `no such binding at this offset`（本表因此改正 20 余条）。
- **AWS ruleset.js 无法按上游常量顺序还原**：316 里 Bun 把 `const F="required", G="type"…` 这一类极短初始化器的顺序打乱（每个 chunk 只保留部分），按位置映射试过两次都是乱配（`0/13` 一致）。最后改用**初始化器文本精确匹配**，只拿到 2 条完全一致的（`n`、`v`），其余 31 条按字面量语义命名（`stringParamSchema`、`isEndpointRef`、`globalStsEndpoint` 等）。如需原名，需要人工逐个比对上游文件。
- **final8 里存在 source=minified 的自别名条目**（如 `chunk-078pp0rm.js@2005` 的 `ipFamily`、`chunk-m4dvt8pp.js` 的若干），`show` 仍显示 `<min>_K<偏移>`，但 `resolve` 认作已命名。本组按"显示为 `_K` 就命名"补了 42 条（`ipFamily`、`runsOnBun`、`reduceAnsiCodes`、`is_buffer` 等），这些现在会覆盖同名的 minified 条目。
- **撞名 91 处**（report 的 `suffixed by conflicts`）：绝大多数是上游本身就有的重复（AWS 每个 client 都有 `AccessDeniedException`/`ConflictException` 等同名类和 `import_core`/`import_client` 等重复 import，源码里也是 `_2` 后缀，可以接受）。少数是本表引入的、语义上应区分而未区分：
  - `chunk-h87x8cg3.js@6812 parseBody`（AWS_restJson1 里解析 SSE body 的 JSON）与同 chunk 已有的 `parseBody` 撞了 → 实际生效 `parseBody_2`；
  - `chunk-fq0cr76a.js@643260 runsOnBun`（emitted-connection 里返回 "Bun 1.4.4" 的桩）与既有 `runsOnBun` 撞 → `runsOnBun_2`；
  - `chunk-fq0cr76a.js@645018 rootCertificates`、`chunk-078pp0rm.js@2005 ipFamily`、`chunk-hwmsct5x.js@49983 collectStainlessHelpers`、`chunk-3wydcdvj.js@21075 readEnv` / `@21128 loadConfigWithSource` 同类；
  - `chunk-aepeg2w5.js@6556 value`（growthbook 的闭包变量）因同名全局捕获被改成 `value_2`；`chunk-y805ph4h.js@66128 relative` 同理。
  这些在阅读树上会显示 `_2`，不影响正确性，但若要更干净，需要逐条换成限定词（例如 `parseSseBody`、`bunVersionString`、`cachedRootCertificates`）。
- **上游版本与 316 不一致的段落**：anthropic-google-cloud-client（`_unknown`）和 claude-agent-sdk（无 npm 包）在 `vendor-ref` 里没有对应源码；sandbox-runtime 0.0.81 也缺 316 新增的 store 读取（`transient-read-failure`、`not-a-regular-file` 等 77 个绑定）与 glob 复杂度评估，这些只能按代码命名。
- **`props4.mjs` 的结构识别条件写反**（`n0.start < b.declStart` 应为 `n0.end <= b.declStart`），导致 T2 一度为 0；修正后多出 47 条 `import_*` 命名。

## 工具与中间产物（都在 `artifacts/tmp/v0/`）

- `lib.mjs` / `lib2.mjs` / `lib3.mjs`：名字表加载、声明-上游文件对齐、语句级对齐。
- `props4.mjs`：分级提案（T1 解构/wire schema、T2 结构、T3 对齐、T4 弱对齐、T5 无证据、F 冻结）。
- `mk.mjs`：按 `路径|偏移\t名字\t置信度` 生成命名行（自动用真实 chunk 名）。
- `remain.mjs`：用 final8 + 本表重算剩余，`finalize.mjs` 过滤非法名。
- `conflicts.mjs`：列出本表引入的 `_2` 撞名。
- 批次文件 `batch/b01..b44.jsonl`（47 个，含 b08b/b34b/b37b/b37c 等合并件），全部用 `cat 批次文件 >> naming/semantic-v0.jsonl` 追加；中途有 2 行被后来的同名键覆盖（已去重，最终 1,346 行）。
