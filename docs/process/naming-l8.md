# 第五阶段第四轮（参数/局部）命名：name-l8c（组 8 前半段，续做）

范围：`analysis/segments/naming-round4c.json` 第 8 项，**声明下标 0–677**（共 678 个声明；清单 `unnamed` 合计 4,892，84 个 chunk）。按阅读树路径从 `src/services/autoModeSetup/` 到 `src/services/mcp/claudeaiCachedInit.js`，覆盖：

- `autoModeSetup/pregather`、`ccr/recordCreatedPr`、`claudeAiLimits`、`closedIssues`、`cloudSession(s)`、`conversationImport`、`diagnosticTracking`、`errorTracking`、`extractMemories`、`feedback*`、`fileInputs`、`http/externalHttp`、`internalLogging`、`liveReplica`、`lowPriority*`、`lsp`、`mcp/`
- `claudeGateway/` 整片：auth（criJwt、googleGroups、oidc、tokens）、config（managedPolicies、schema、warnings）、spendLimits、ssrfGuard、store、upstreams（aws、forward、stream）、telemetry、messagesHandler、vouching、internalNetworks、hostCheck、loadTestMode 等
- `compact/` 整片：autoCompact、autoCompactWindow、compact、compactCarry、microCompact、precomputedCompact、reactiveCompact、idleCompaction、sleepCompaction 等
- `daemon/` 整片：controlClient/controlServer、ensureDaemon、jobState、leaseProtocol、reapJobs、rendezvous、spare、spawnBgSession、spawnLauncher、ptyHostClient
- `design/`、`deviceBridge/`、`deviceMcp/`、`gateway/`、`homeSeed/` 整片（到 `writeHomeSettings`）

## 前任写到哪里

接手时 `naming/semantic-l8.jsonl` 为 **5,741 行、87 个 chunk，`annotate check` 0 problems**（`artifacts/tmp/lead/prev-l8.jsonl` 与其一致）。用 `artifacts/tmp/lead/final5` 重算：本半段仍有 **4,844 个 `_K` 绑定，分布在 637 个声明里**（另有 41 个声明已由其他表/现有名字覆盖为 0）。

## 本次续写

| 项 | 数量 |
|---|---|
| 接手时行数 | 5,741（全部保留，只追加） |
| 本次追加条目 | **4,820**（57 批 `b1…b57`，`cat 批次 >> 目标` 追加，从未整体重写） |
| 最终行数 | 10,561 |
| 有新名字的声明 | 621 / 678（其余 57 个见“跳过”） |
| `annotate check` | **0 problems**（113 个 chunk；`suffixed by conflicts` 4，均为 final5 现有条目，与本表无关） |
| 剩余 `_K` 绑定 | **4**（4 个声明，均为刻意跳过的死变量/未用形参） |

置信度分布（本次 4,820 条）：0.85 4,704、0.8 94、0.75 14、0.7 8。

## 做法

1. `node tools/naming/annotate.mjs show analysis/segments/naming-round4c.json 8 <from> <30> artifacts/tmp/lead/final5` 按批渲染到 `artifacts/tmp/l8c/bN.txt`，每批 1–30 个声明，读一段写一段（批次 jsonl 也留在 `artifacts/tmp/l8c/`）。
2. 每批 `cat bN.jsonl >> naming/semantic-l8.jsonl` 后立刻 `annotate check`，全程保持 0 problems。
3. 因为 `show` 的 final5 不含我自己刚写的条目，最后用三步复核：
   - `check8.mjs`：复刻 `show` 的计数逻辑（final5 + 本表合并、`bindingsOf` 过滤），确认本半段剩余 `_K`；
   - `conf8.mjs`：按 `check` 相同的 rename 流程只列出“本表条目”引发的 `_2` 撞名，共 **25 处，已全部改名消除**（如 `sessionName`→`claimSessionName`、`threshold`→`effectiveThreshold`、`result`→`resolvedResult`、`index`→`rowIndex`、`waitedMs`→`waitedMsTotal` 等）；
   - `unused8.mjs`：按名字统计在声明体内的出现次数，专抓“声明后从未读取”的死变量。
4. 与前任条目重复的键：追加的 4,844 条里有 **20 条落在前任已有的键上**（同一绑定被重复命名），按“已有名字不改”原则从追加段删除，保留前任那行（最终 4,820）。
5. 按“看不出用途不命名”撤掉 4 条：`chunk-ksxq075c.js@28147`（原本按位置猜 `extra`）、`chunk-twq47pff.js@58931`（`P_K58931 = !1`）、`chunk-xr4xc2mq.js@16167`（第二个形参）；`chunk-98n6ge4d.js@23071`（`permissionCard` 第二参数，函数体未读取）。

## 跳过

- **4 个绑定刻意不命名**（逐字确认：声明后没有任何读取）：
  - `chunk-ksxq075c.js@28147`：`loadServingGroupProviders` 里 `Promise.all([import(...), import(...), void 0])` 解构出的第三个名字 —— 数组第三项本身就是 `void 0`，`...[]` 展开也是空，属于打包遗留。
  - `chunk-xr4xc2mq.js@16167`：`createAutoMemCanUseTool` 的第二个形参，函数体（内外闭包）从不读取。
  - `chunk-twq47pff.js@58931`：`createCloudHomeSeedAnnouncer` 里 `P_K58931 = !1` 及紧随的 `...!1`，均未被读取。
  - `chunk-98n6ge4d.js@23071`：`design/syncTool.js` 的 `permissionCard(input, options, notice)` 第二个形参，函数体只转发 `input` 和 `notice`。
- **57 个声明没有新增条目**：除上面 4 个外，其余 53 个声明里剩下的绑定在 final5 中已有可读名（或同一名字已由同一声明的兄弟条目覆盖），无需重复写。
- 没有整段放弃的声明；`unnamed` ≤ 2 的小声明（多为 `filter(x => …)` 回调、getter、一行解构）也都读完命名了。

## 发现的问题

- **两份近乎逐字的 MCP OAuth 实现**：`chunk-1kaj6e83.js` 与 `chunk-n1aavqzh.js` 在 `mcp/auth.js` 里各有一份 `performMCPOAuthFlow` / `revokeServerTokens` / `sanitizeOAuthErrorCodeForAnalytics` / `classifySdkAuthFailure` / `clearServerTokensFromLocalStorage` / `logStorageWriteFailure`（后一份多一条 issuer-echo 判定）。命名时必须两份交叉对照，否则同一函数在两份拷贝里会得到不同名字。
- **`errorMessage` 局部变量遮蔽同名 import**：`compact/compact.js#m8s`（`partialCompactConversation`）以一个名为 `errorMessage` 的局部（`string | undefined`）承载失败原因，文件同时 import 了工具函数 `errorMessage`；`finally` 里 `success: !errorMessage` 读的是局部。这是解包时就带进去的名字（不是我命名的），读者极易误读为调用 helper。
- **`isMarkdownTooComplex` 声明位置与使用方不一致**：它声明在 `daemon/spawnLauncher.js` 的声明范围里（`chunk-ksvdmrg0.js#dn`），实际只被 `daemon/controlServer.js` 的 `renderTranscriptTail`（同 chunk 另一个声明）用于决定预览是否走 markdown 渲染 —— 与文件职责不符。
- **`design/syncTool.js` 的 `permissionCard(input, options, notice)` 第二参数在函数体里从未读取**（已跳过命名）。
- **`lowPriority` 有两套实现**：`services/lowPriority/lowPriorityMode.js`（完整）与 `services/lowPriorityMode.js`（薄转发 + 文案），同一概念在两处，命名时需注意不要按文件直觉覆盖。
- **`deviceBridge/deviceRegistrationSocket.js` 的 `DeviceRegistrationSession`** 里留了 `reannounceSkipOutcome` / `endRotation` 等只在特定分支返回的原因字符串，属于状态机实现，命名按返回值语义（`rotationReason`、`skipOutcome`）而非变量位置。
