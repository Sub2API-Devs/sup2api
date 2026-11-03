# 第五阶段第二波命名：name-s4（组 4）

范围：`analysis/segments/naming-round3.json` 第 4 项（`dirs` 46 项），共 3,188 个声明、3,600 个顶层绑定，分布在 325 个阅读树文件、121 个 chunk。

主要目录：`services/artifacts`（1,183 个绑定：artifact 发布/冲突/类型/评论自动回复/数据库/在线状态/实时订阅）、`services/api`（767：请求体 gzip、缓存保活、缓存断裂检测、错误分类、认证遥测、claude.js 主请求流程）、`remote/tools`（429：远程工具协议、服务端调用、served 通道）、`services/analytics`（258：Datadog、GrowthBook、遥测元数据与脱敏）、`screens`（240：REPL 与 repl 子目录、replDialogState）、`services/accountMemory`、`services/agentImport`、`services/agentStatus`、`selfHostedRunner`（git、健康检查、生命周期钩子）、`remote`（RemoteSessionManager、SessionsV2Client、远程模式）、`schemas`。

## 结果

| 项 | 数量 |
|---|---|
| 顶层绑定已覆盖 | 3,600 / 3,600（2,328 个声明全部绑定都有名字） |
| 本表新命名 | 3,218（`naming/semantic-s4.jsonl`） |
| 清单内但已有可读名（facade/其他 semantic/auto，未重复写） | 382 |
| 与本表名字相同的既有条目（写入了同名） | 25（例如 `USER_TEXT_KINDS`、`SETTINGS_FETCH_OUTCOMES`、`SERVING_POLICY_DEFAULTS`） |
| 说明（`naming/docs-s4.jsonl`） | 724 条（≥300 字节的 115 个声明全覆盖；562 个导出声明全部覆盖） |
| 改名引擎校验 | 121 个 chunk 逐个调用 `renameModule`（只加载本表）：3,218 条、改名 3,218、拒绝 0、冲突 0。见 `artifacts/tmp/s4/rename-check.txt` |

置信度分布：0.85 的 99 条、0.8 的 964、0.75 的 923、0.7 的 857、0.65 的 139、0.6 的 236。

说明的 724 条里：263 条手工对照代码写（含 115 个 ≥300 字节声明的全部；阅读树里 `//@` 标记之后的 JSDoc 其实属于下一个声明，这几处常见的错位已按代码判断、没有照抄）；其余 461 条是给“导出但任何表都没写过说明”的声明生成的形态说明（`导出函数/类/常量 \`name\`：参数…，返回…` / 值…）。这与上一轮“按代码写 1–3 行说明”的标准相比偏机械：本轮清单里 562 个导出声明中有 461 个在阅读树里既无 JSDoc 也无别的表写过说明，逐个手写说明会挤掉命名覆盖率（指南要求覆盖率优先），因此对这些小函数/常量采用“签名 + 返回表达式/字面值”的机器可核对描述。

## 命名做法

- 先按文件 dump（`artifacts/tmp/s4/dump/*.txt`：每个声明一段源码 + 该声明里每个顶层绑定的文件内用法，已去掉注释/字符串后按标识符匹配，避免把同名子串当引用），再逐文件读命名，决定写在 `artifacts/tmp/s4/n/bNN.txt`，由 `artifacts/tmp/s4/build.mjs` 编译成两个 jsonl。
- 常量组按指南成体系命名并带单位：`MAX_*_MS`、`*_TIMEOUT_MS`、`MAX_*_BYTES/CHARS`、`DEFAULT_*`、`*_RE`；同一文件里相关的一组（如 gzip 分块的 `GZIP_BLOCK_BYTES` / `GZIP_DICTIONARY_BYTES` / `BLOCK_IDLE_DROP_MS`）一起命名。
- 单字母 `alwaysFalse`/`noop` 这类同名桩函数在同一个 chunk 里会有几十个（`chunk-18hwfzwa.js` 有 8 个 `alwaysFalse`），按文件加了后缀（`alwaysFalseInRepl`、`logDiffAlwaysFalse`、`alwaysFalseLiveRow`…）；`selectTurnIsLoading`、`selectPanelFileView` 等选择器同理区分文件。
- 与既有表键重合 20 处**全部同名**（semantic-p4/p3/p0/r2/agents），没有覆盖别人的名字；与 `final/top` 里的 auto 名重合 13 处取了我的名字（多为 `regExp`→更具体的 `*_RE`、`sorted`→`SORTED_RELAY_ROUTES`、`WHOAMI`→`WHOAMI_PATH`、`ACT_0`→`ACTIVITY_IDLE`），都是 auto 规则按变量名瞎起的名字，属于本表该覆盖的范畴。

## 还没命名的

清单内已没有未命名绑定（3,600 全覆盖）。过程中主动放弃、按同名/占位命名的几类：

- 空实现/恒值桩：`noop`、`alwaysFalse`、`noopDialogHost`、`noopSenderHeader`、`emptyString`、`UNSET_REGEX_A/B`（编译期留空的正则槽位）、`COLLAB_SCHEMA_INCLUDED`/`HANDLERS_SCHEMA`（编译期 false 的 schema 开关）。含义确定（就是占位），但名字只能表达“占位”，置信度给 0.6–0.7。
- `wigglyDove.js` 里 77 个 `return "两字母"` 的函数：这是一张混淆字段代号表（`wiggly-dove` 请求头的字段名映射），每个函数只回一个固定代号，无法从代码得知代号对应哪个字段，统一命名 `wigglyDoveFieldCode<Token>`，置信度 0.6。
- `services/artifacts/publishSource.js` 的 41 个 schema 常量：按它生成的字段（`readSourceSchema`、`commentsListSourceSchema`、`assetUploadSourceSchema`…）命名，个别（`$o`/`jHs` 这类重复实现）只到 0.6。

## 发现的放错文件的声明

- `chunk-hwmsct5x.js#Lb`（`requestHeaders.js` 里的 `TENGU_BUZZING_PIKE`、`Fb`、`Db`、`Nb`、`Bb` 等一组）→ 应归 `services/api/gzipRequestBody.js`，证据：整组只用于 `gzipRequestBody` 的复用校验（`Dir(n) >= Fb`、`!Db.some(...)`、`Nb.has(querySource)`），`requestHeaders.js` 只是同 chunk 的另一段代码。
- 同一 `requestHeaders.js` 里的 `HELD_REPLY_SOURCES`、`CONTENT_BLOCK_DELTA_EVENT_BYTES`、`PING_EVENT_BYTES`、`MAX_HELD_BYTES`、`heldReplyState`、`fh`（`heldReplyHoldMs`）→ 应归 `services/api/unwatchedReplyHold.js`（该文件 `import { MAX_HELD_BYTES } from "./requestHeaders.js"` 却只用它，且这组其它成员没有被 requestHeaders 自己的逻辑用到）。
- 同一 `requestHeaders.js` 里的 `ALLOWLISTED_BLOCK_TYPES`、`EXTRA_ALLOWLISTED_BLOCK_TYPES`、`redactUnknownBlockType`、`isKnownBlockType` → 属遥测内容块类型白名单（`analytics/metadataSanitizers.js` 的 `EVENT_FIELD_VALIDATORS` 与它同源），放在请求头模块不合理。
- `chunk-gfcxsygg.js#Uht`、`Bht`、`createColorAssigner`、`BridgeChannelSlot`、`freeze_2`（在 `services/artifacts/artifactReadConsent.js`）→ 与 artifact 读取同意无关：颜色分配器用在 `QueryEngine.js`/`utils/queryContext.js`，`BridgeChannelSlot` 用在 `screens/REPL.js`，应归 `bridge/` 或 `screens/repl/` 的桥接槽位模块。
- `chunk-3zy56vtn.js` 的 `A`（`toolHostAdvert.js` 里 `ge(new Map(), o => o.clear())`）→ 是 `toolHostHelper.js` 的工具宿主作用域 Map，证据：`toolHostAdvert.js` 未使用它，`toolHostHelper.js` 的 `de()`/`yt` 才是它的消费者。
- `chunk-jd7h5dfe.js` 整个 chunk 只有 304 字节（`var A = ge(new Map, o => o.clear()); async function xbo(){return !1}`），这段被 placement 到 `toolHostAdvert.js`，但该文件完全不用它；同 chunk 的 `xbo` 也没有归属，像是「影子桩」chunk被并进了不相干的文件。
- `chunk-aepeg2w5.js` 的 `metadata.js` 里 `las`（`["parent-transcript.jsonl"]`）、`aas`（`getClaudeConfigDir()/jobs`）、`Oro`（job 存储空间）→ 属任务作业目录，应在 `utils` 或 `daemon` 侧，与遥测元数据无关。
- `chunk-4xpk3fhh.js` 同时贡献 `artifactToolGates.js`（artifact 总开关判定）与 `hostEgressProbe.js`（artifact 内容出网探测），后者更像 `services/artifacts` 的独立模块；本组按 placement 归属命名，未挪动。

## 其他观察

- 本组涉及的 chunk 名都以 `original/` 实际文件为准（例如 `chunk-4xpk3fhh.js`），不要从阅读树文件名推断 chunk 名。
- `analysis/segments/naming-round3.json` 第 3 项（本组）：`dirs` 列出 46 条细目录，而 `items` 的 `path` 全部落在 `remote|screens|schemas|selfHostedRunner|services` 五个顶层目录（细目录其实是 `dirs` 里的子目录，只是路径前缀写法不同）；按 `items` 实际路径工作，未发现遗漏文件。
- 同一 chunk 内多个文件共享作用域：改名引擎按 chunk 校验，所以同名（如 `alwaysFalse`、`noop`、`MAX_RESPONSE_BYTES`）必须按文件区分；最终 0 冲突是逐处消解的结果，代价是一批带文件后缀的名字（`...Repl`、`...LiveRow`、`...Guard`）。若后续在阅读树层面（跨 chunk 聚合后）重新整理，可以考虑把这些桩函数统一成 `noop` / `alwaysFalse`（它们不会在同一聚合文件里共存）。

## 做法与工具（都在 `artifacts/tmp/s4/`）

- `dump.mjs`：按阅读树 path 导出待命名声明（源码 + 该声明内每个顶层绑定的文件内用法，注释/字符串掩码）。`items.json`/`bindings.json`：声明与顶层绑定索引。
- `n/bNN.txt`：人工命名决定，`N <标识> <新名> [置信度] [| 备注]`、`D <声明 id> <说明>`；`build.mjs` 编译并校验（文件、名字合法性、门面/vendor 保护、覆盖率）。
- `validate.mjs`：只加载本表跑 `renameModule`；`validate2*.mjs`/`validate3*.mjs`：合并 `final/top` 后对比（结论：本表带来的冲突为 0，残留 4 条来自 final 里 `rm`/`rm_2` 这对 auto 名自身重名）。
- `gendocs5.mjs` / `fixdocs.mjs` / `auditdocs.mjs`：为 461 个“导出且无说明”的声明补说明（无 JSDoc 时按签名/字面值生成），并核对说明没有误用相邻声明的 JSDoc。
