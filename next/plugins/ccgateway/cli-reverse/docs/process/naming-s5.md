# 第五阶段第二波（2a）命名：name-s5（组 5）

范围：`analysis/segments/naming-round3.json` 第 4 项（0 起算，文档里称第 5 组），共 2,784 个待命名顶层绑定，分布在 371 个阅读树文件、194 个 chunk。目录为 `services/` 的全部内容：autoContinueAtUsageLimit、autoDream、autoModeSetup、awaySummary、aws、ccr、ccrAgentProxy、ccrMcp、classifierSummary、claudeAiLimits、claudeGateway（auth/config/store/telemetry/upstreams 等）、clientDataUrl、closedIssues、cloudSession(s)、compact、conversationImport、daemon、design、designSync、deviceBridge、deviceMcp、diagnosticTracking、errorReportingGate、errorTracking、extractMemories、feedback、fileInputs、gateway、homeSeed、liveReplica、lowPriority、lowPriorityMode、lsp、mcp（最大一块，约 830 个）、mcpServe、memoryStore、memorySync、modelCatalog、notifications、oauth、orgMemory、orgSurvey、pluginEval、plugins。

## 结果

| 项 | 数量 |
|---|---|
| 顶层绑定已覆盖 | 2,784 / 2,784（100%） |
| `naming/semantic-s5.jsonl` 条数 | 2,784 |
| 涉及 chunk | 194 |
| 说明（`naming/docs-s5.jsonl`） | 2,143 条。本组 ≥300 字节的声明共 298 个，其中 212 个此前没有任何 docs 表说明、全部补上（其余 86 个别的表已写）；导出的声明也全部有说明。`doclist.mjs` 复查"≥300 字节且无任何 docs 表说明"剩 0 |
| 改名引擎校验 | 194 个 chunk 逐个调 `renameModule`（只加载本表）：改名 2,784、拒绝 0、冲突 0。见 `artifacts/tmp/s5/rename-check.txt` |
| 与其他命名表键重合 | 1 处（`chunk-ksvdmrg0.js@24108`，`semantic-ink.jsonl` 也叫 `DIM`，同名） |

置信度分布（0.6–0.95 规则内）：0.90 的 59 条、0.85 的 1,751、0.80 的 675、0.75 的 142、0.70 的 111、0.65 的 14、0.60 的 32。0.65 及以下的都是"看过代码但把握不足"的占位函数、恒真/恒假桩、开关读取函数与表头常量，`note`/说明里写明了依据。

## 未命名的

无。2,784 个绑定全部写入。确认含义不足的部分没有跳过而是给了保守命名（例如 `chunk-1dth5azr.js@5123`、`chunk-jxbwsn01.js@241` 两个恒 false 的桩叫 `alwaysFalse`；`chunk-qv1jytq6.js@5992/6001` 两个只出现在 `EVAL_RESULT_KEYS` 校验里的表头常量叫 `CONFIG_ONLY_KEYS`；`chunk-zhrgwca4.js@1097`、`chunk-wm1cd8qt.js@13258` 是 `{}` + `Ar(...)` 的模块命名空间占位，叫 `devModsDialogNamespace` / `pluginPublishNamespace`），置信度压在 0.5–0.6 并写进第 2 轮补漏文件 `n/099.txt`。

## 改名引擎试跑发现并已经处理的两处同作用域冲突

- `chunk-aepeg2w5.js@486521`（aws/caFetchHandler 的 `dA`）与 `@129224`（gateway/constants 的 `sl`）同属一个 chunk 模块作用域，都取 `fetchHttpHandlerModule` 冲突。后者改成 `smithyFetchHttpHandlerModule`。
- `chunk-wy9dbk5f.js@19864`（mcpServe/hookCalls 的 `hn`）与 `@34594`（mcpServe/mcpRelayCalls 的 `Yn`）都取 `MAX_LISTING_BYTES`。后者改成 `MAX_RELAY_LISTING_BYTES`。

## 发现的放错文件的声明

按阅读树里的 `//@` 注释与代码内容对照（行号指阅读树文件）：

| 声明 id | 现在的位置 | 应归位置 | 证据 |
|---|---|---|---|
| `chunk-mxpjbr4y.js#z` | `services/homeSeed/homeSeedMessages.js` | 云会话权限规则提示（应在 homeSeed 的规则/计划提示里，与 `RULES_NOT_IN_FORCE` 同块） | 函数返回 `RULES_NOT_IN_FORCE` / `SETTINGS_STAY` 拼出的提示行，旧版名 `isResultTruncated` 明显错配，注释已标"与 Write UI 无关，归属疑似错误" |
| `chunk-twq47pff.js#Rt` | `services/homeSeed/applyHomeSeed.js` | 技能改进/技能目录相关模块 | 内容是"路径在技能根内且 kind 不是 output_style"，旧版名 `getOutputStyleAttachment` 错配，注释标"归错文件" |
| `chunk-77a3xzkb.js#i` | `services/lowPriorityMode.js` | `services/lowPriority/`（低优先级等待模块） | 取 `LOW_PRIORITY_STATE` 并按"实验组/重置点/冷却"判断能否提供低优先级；文件 import 自 `lowPriority/lowPriorityMode.js`，功能在本文件之上（注释标"疑似归错文件"） |
| `chunk-e6aww6q8.js#iZt` | `services/mcp/mcpSkills.js` | `tools/ReadMcpResourceTool` 或 attachments 的资源位置合并 | 函数体是 `[...new Map().values()]` 空实现；其使用者（`countUniqueFiles`）按服务器名合并位置，注释标"归属疑似错误，不属于 LSPTool" |
| `chunk-9cjx5pnm.js` 的 `relativePosixPathOf` / `exclusionEntriesFor` | `services/plugins/publish/validationCopy.js` | 插件打包/上传扫描（`publishSnapshot` 的排除规则那一组） | `getExclusionReason` 用一种很窄的排除原因枚举（link/special/hard-link/backslash/never/generated/secret/ignored），与 `publishSnapshot` 的 gitignore/secret 扫描同块；注释标"归属疑似错误" |
| `chunk-82kqcve8.js` 的 `getRetryAfter`（本组清单外的同名族函数） | `services/orgMemory/storeApi.js` | 通用 HTTP 客户端 | 从响应头解析 retry-after，与 orgMemory 无关；注释标"疑似归错文件" |
| `chunk-dcmhvw5a.js` 的 `normalizeUrl` | `services/mcp/officialRegistry.js` | 通用 URL 安全工具 | 实为"反斜杠 + @ 的 URL 混淆检测"，注释标"归属疑为通用 URL 安全工具" |
| `chunk-ptag3qm7.js` 的别名表与 `n()` | `services/mcp/ccrMetaMcp.js` | hearthbot（Slack）连接器模块 | 注释标"归属疑误：hearthbot/Slack 连接器"；本组把组内名字统一成 `HEARTH_*` 前缀 |
| `chunk-1ny7cxrt.js` `createSseUsageState` 兄弟常量（`Bbe`/`S1`/`Hbe`） | `services/claudeGateway/spendLimits.js` | 用量计费（`usageMetering.js`） | SSE 用量解析状态与 `accumulateSseUsage` 同块，旧版名 `getParentCacheSuppressReason` 错配，注释标"归错文件"。本组把这三个常量起名为 `SSE_EVENT_SEPARATOR_RE` / `CHARS_PER_OUTPUT_TOKEN` / `DATA_PREFIX_LENGTH` |
| `chunk-aepeg2w5.js` `revokeGatewayToken_2` 附近 | `services/gateway/gatewayAuth.js` | 登出/网关模块（本身就在 gateway，但注释指出旧版名 `_fetchMetricsEnabled` 属于遥测模块） | 注释标"旧版名 _fetchMetricsEnabled 为错配；应归登出/网关模块" |

另有几处"名字配错但不是放错文件"，本组没有改它们的文件归属，只在说明里保留：`mcp/config.js` 的 `hasBlockingResult`（旧名存疑，疑似 MCP 配置代码误归 hooks.ts）、`mcp/xaaIdpLogin.js` 的 `issuerKey`（实为 URL 路径首段判定）、`mcp/mcpStringUtils.js` 两处 remote-browser 权限文案（归属疑为权限/auto 模式）。

## 做法与工具（`artifacts/tmp/s5/`）

- `dump.mjs`：按 reconstructed 路径分组导出声明源码、同名兄弟绑定键、文件内引用与 chunk（每 24 个路径一片 → `m/000.md` … `m/023.md`）。
- `refs.mjs` / `peek.mjs` / `uses.mjs`：按 offset 打印 original 里的上下文、列出某标识符的 AST 引用位置。
- `n/000.txt` … `n/023.txt` + `n/099.txt`（第 2 轮补漏）：逐片的命名决定，格式 `F 路径` / `T 压缩名 新名 置信度 | 备注` / `D 压缩名 中文说明`；同名兄弟绑定用 `名@偏移` 或 `chunk#名` 消歧。
- `build.mjs`：把决定编译成 `naming/semantic-s5.jsonl` / `naming/docs-s5.jsonl`，并统计覆盖率、把 0.6 以下剔到 `build-report.json` 的 `lowconf`。`build-skipped.txt` 记录"清单里不存在该绑定"的行（属性名、函数名、嵌套名等，本身不需要顶层名）。
- `doclist.mjs`：列出仍缺说明的 ≥300 字节声明（当前为空）。
- `validate.mjs`：逐 chunk 调 `renameModule`，结果 `rename-check.txt`。

## 注意

- `naming/semantic-s5.jsonl` 里的 `chunk-ksvdmrg0.js@24108`（`DIM`）与 `semantic-ink.jsonl` 同名，是同一常量的两条记录，合并时不会冲突。
- 本组大量常量是 2.1.316 新增的 GrowthBook 开关读取（`tengu_*`），命名统一按 `isXxxEnabled` 形式，并在说明里写开关名；`opr`、`mri` 这类只有一行 `getFeatureValue_CACHED_MAY_BE_STALE` 的函数按注释补了语义名。
