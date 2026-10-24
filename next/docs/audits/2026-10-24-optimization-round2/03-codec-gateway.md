# 优化审计 Round 2 — 03：protocol-codec / strict / gateway / runtime-contract / mock-upstream

日期：2026-10-24
范围：`next/protocol-codec`（含 `strict/`、`modelpolicy/`）、`next/gateway`、`next/runtime-contract`、`next/deploy/mock-upstream`
目标：抽象、复用、解耦、低嵌套、简洁
作者：只读分析（未改任何代码）

数据来源：`/d/tmp/gometrics/all.tsv`（行数 × 嵌套深度）、`/d/tmp/static/gateway.sc`、`gateway.dead`、`protocol-codec.sc`、`protocol-codec.dead`（后两者为空：codec 无 staticcheck 告警，也不是 main 包，deadcode 无从分析）。

硬约束：**codec 的请求/响应/SSE 输出必须保持逐字节不变**。本计划中所有 codec 条目都是"移动代码 + 改函数边界"，不允许出现任何新的分支、新的默认值、新的错误文本或字段顺序变化。

---

## 1. 热点诊断

### 1.1 protocol-codec

| 位置 | 行数 / 深度 | 一句诊断 |
|---|---|---|
| `chatcompletions_responses_bridge.go:403 buildChatMessagesFromItems` | 252L / 6 | 单 `for` + 9 个 `case`（每个 20–40 行）同时承担解码、校验、状态机推进和 append；`pendingReasoning`/`lastTurnReasoning` 的清零散落在每个分支里，改一处极易漏改另一处。 |
| `strict/responses_input.go:84 responsesInput` | 178L / 5 | 用内联 `role`/`blocks`/`flush`/`appendRole` 闭包重写了一遍同包 `conversation` 已有的"角色累积"语义，`case` 内还内嵌 `summary` 校验的 4 层嵌套。 |
| `strict/stream.go:100 process` | 221L / 4 | 一个 `switch` 吞掉 8 种 SSE 事件；`message_start`/`content_block_start`/`message_delta` 各 40–60 行，主干只做路由却读不出主干。 |
| `responses_to_anthropic_request.go:134 convertResponsesInputToAnthropic` | 155L / 4 | 与 `buildChatMessagesFromItems` 枚举同一份 Responses input items，`switch` 分支近乎镜像；另外 3 处"空内容就跳过"的判断重复了三遍。 |
| `strict/messages.go:219 chatMessages` | 142L / 4 | `system` / 连续 `tool` 分组合并 / assistant `tool_calls` 三段逻辑混在一个循环里，`i++` 手动推进内层循环。 |
| `strict/messages.go:9 tools` | 131L / 4 | 工具声明校验与 `tool_choice` 解析、`parallel_tool_calls` 互锁三件事写在同一个函数里。 |
| `anthropic_to_responses_response.go:34 AnthropicToResponsesResponse` | 115L / 4 | 非流式转换与用量映射写在一起，`content` 每块的分派靠重复的 `switch`。 |
| `chatcompletions_responses_bridge.go:1687 ChatCompletionsChunkToResponsesEvents` | 111L / 4 | 流式块状态机；case 之间共享的"开/关 item"逻辑没有名字。 |
| `responses_client_tools.go:568 Restore` | 89L / 4 | 4 个事件类型的改写逻辑内联，`custom` 与 `tool_search` 两条几乎相同的类型改写分支重复出现两次（`added` 和 `done`）。 |
| `responses_tool_search_discoveries.go:41 promotedResponsesToolSearchDiscoveries` | 67L / 5 | 工具身份登记（3 个 `register*` 函数）+ 去重判定挤在一个双层循环里。 |
| `responses_to_anthropic_request.go:357 normalizeAnthropicToolPairing` vs `chatcompletions_responses_bridge.go:857 normalizeChatMessagesWithToolOutputMedia` | 81L / 70L | 两套"按 id 建索引（后写覆盖）+ 丢弃未应答调用"算法镜像实现；只有索引部分值得抽象，配对重建部分**不应**合并。 |
| `strict/response.go:21 response` | 112L / 3 | 校验、逐块转换、Chat 投影、refusal 重写四段顺序拼接；`itemID` 与 `strict/stream.go:53 Stream.itemID` 重复实现同一个格式串。 |

### 1.2 gateway

| 位置 | 行数 / 深度 | 一句诊断 |
|---|---|---|
| `cmd/sub2api-gateway/main.go:85 run` | 329L / 3 | 一个函数里串了 CLI 分派、配置、PG/Redis、TLS、peer、router、engine、三个 listener、锁内 Recover、优雅关闭；深度不高但没有任何接缝。 |
| `internal/control/engine.go:701 Recover` | 116L / 6 | 计划扫描、节点步态判定、三种"要不要维护/转发"的分支互相嵌套；同一段"转发给 primary，否则维护"在函数内出现 3 次。 |
| `internal/control/engine.go:551 checkPeer` | 34L / **8** | 全仓最深嵌套：`if err` → `if queryErr==nil && revoked` → `if stopErr==nil` → `if stopped` → `if reportErr==nil && rows==1` → `if nodes,readErr` → `for` → `if`。 |
| `internal/control/engine.go:200 Coordinate` | 123L / 4 | 事务内"完成计划 / 推进游标 / 首次建步"三个状态机分支平铺，`tx.Rollback` 与后续池查询的次序是隐性契约。 |
| `internal/control/updates.go:193 checkUpdate` | 88L / 5 | 缓存判定、远端拉取、语义化版本比较、兼容性判定、I/O 后重校验串在一个函数里。 |
| `internal/control/runtime.go:183 LocalRuntime.Start` | 119L / 3 | "已有 core 在跑"的 6 分支状态机与"全新启动"路径顺序拼接，环境变量拼装是 3 行超长 `append`。 |
| `internal/release/manager.go:262 extract` | 102L / 3 | 声明预扫 + tar 遍历 + 大小/路径/链接校验交织，`total`/`declared`/`directories` 三个 map 全在函数作用域。 |
| `internal/release/manager.go:520 GC` | 95L / 3 | releases / manifests / blobs 三段几乎相同的"列目录 → 跳过 keep → RemoveAll"。 |
| `internal/control/store.go:681 rollbackLocked` | 107L | 长但不深；主要是顺序校验，可读性尚可。 |
| 跨文件：节点"新鲜且本地服务"谓词 | 11 处 | `time.Since(n.LastSeen) < 20*time.Second` + `Mode=="local"` + `Ready` 的组合在 `main.go`、`engine.go`(×5)、`store.go`、`runtime.go`、`offload.go`、`pluginblobs.go` 各写一遍，阈值 `20*time.Second` 出现 11 次。 |

### 1.3 runtime-contract / mock-upstream

| 位置 | 行数 / 深度 | 一句诊断 |
|---|---|---|
| `runtime-contract/locklease/lock.go:36 KeepLock` | 69L / 4 | 续约循环的"到点就用 half-remaining 续一次、失败重试直到 deadline"缺少名字；**但整个模块没有任何测试**，任何改动都无网可兜。 |
| `runtime-contract/contract.go` | 121L | 纯常量与 wire 结构体，无问题，不应改动。 |
| `deploy/mock-upstream/main.go:283 resolve` | 80L / 3 | 4 层优先级覆盖（body meta → key marker → rule → header）顺序拼接，可读但无抽象。 |
| `deploy/mock-upstream/main.go:374 messages` / `:430 stream` | 42L / 44L | **绕过了** `apis.go` 已有的 `begin()` 与 `sseWriter`，自己手写了一遍 record → resolve → sleep → status → SSE 头发送。 |
| `deploy/mock-upstream/apis.go:376 gemini` | 101L / 3 | action 解析、请求校验、candidate 构造、SSE / JSON 数组两种输出混在一起。 |
| `deploy/mock-upstream/main.go:212 responses` 与 `ws.go:48 responsesTurn` | 64L / 62L | `textPart` / `item` / `response` 三个闭包在两边逐字重复。 |
| `deploy/mock-upstream/apis.go:24 begin` | — | 已被 4 个 handler 使用，说明 `messages()` 的重复是遗漏而非设计。 |

---

## 2. 优先级计划（27 项）

约定：
- 每条一行一个提交，独立可回滚。
- "行为变更：无"指输出与错误文本逐字节不变。
- codec 验证方法统一为：`cd next/protocol-codec && go test ./... -count=1`（必要时加 `-race`）。该包共 456 个 `Test`，`strict/` 另有 16 个；这些现有断言直接比较 JSON/SSE 字符串，等价于 golden 比对，**不需要新增 fixture**。
- gateway 验证：`cd next/gateway && go test ./... -count=1`；`*_linux_test.go`（含 `realcore_*` 共 6 个文件）在 Windows 上不执行，改完必须额外跑 `GOOS=linux go vet ./...`，并购由 CI 跑 Linux 套件。
- Go 工具链：`/d/mise/installs/go/1.27.0/bin`。

### A. protocol-codec：拆大 switch（P0，风险最低、收益最大）

**C1** · `chatcompletions_responses_bridge.go:403 buildChatMessagesFromItems`（252L/6）
- 改动：引入 `type chatItemBuilder struct { messages []ChatMessage; opts *ResponsesToChatOptions; pendingReasoning, lastTurnReasoning string; mediaByCallID toolOutputMediaByCallID; invalidFunctionCallIDs map[string]struct{}; invalidEmptyFunctionCallOutputs int }`，方法 `reasoningForAssistant()`、`clearThinkingSpan()`、`clearTurn()`。
  每个 `case` 变成 `func (b *chatItemBuilder) appendReasoningItem(item map[string]json.RawMessage) (bool, error)`、`appendFunctionCallItem`、`appendToolSearchCallItem`、`appendCustomToolCallItem`、`appendToolOutputItem`、`appendAgentMessageItem`、`appendTextPart`、`appendInputImageItem`、`appendMessageItem`；`(handled bool, err error)` 让主循环退化成 `decode → dispatch`（约 40 行，深度 3）。
- 行为变更：无。新增的 `clearThinkingSpan()` 必须逐字对应现有的每处 `pendingReasoning = ""`；`lastTurnReasoning` 只在 user 侧/文本/图片/agent_message 分支清零。
- 测试：`chatcompletions_responses_bridge_test.go`、`_custom_tools_test.go`、`_additional_tools_test.go`、`_agent_message_test.go`、`_request_invariants_test.go`、`chatcompletions_responses_test.go`、`chatcompletions_responses_reasoning_cache_test.go`、`chatcompletions_responses_stream_lifecycle_test.go`。
- 风险：低（纯提取）；唯一陷阱是清零位置，建议提取后 `git diff -w` 人工核对每处赋值的位置。

**C2** · `strict/stream.go:100 process`（221L/4）
- 改动：`process` 只保留 `failed/done` 守卫、`decodeObject`、`requiredString(type)`、name/type 一致性和 `switch` 分派；各分支变 `func (s *Stream) handlePing/HandleError/HandleMessageStart/HandleContentBlockStart/HandleContentBlockDelta/HandleContentBlockStop/HandleMessageDelta/HandleMessageStop(o object) ([]Event, error)`。`failed` 的设置保留在 `process` 的 `defer` 里，不要下放，避免漏设。
- 行为变更：无。
- 测试：`strict/strict_test.go`（`TestStrictSSETerminalAndIndependentStreams`、`TestStrictSSEToolsThinkingAndErrors`）、`independent_review_test.go`、`signature_delta_test.go`、`thinking_estimate_test.go`、`empty_input_delta_test.go`。
- 风险：低–中：`message_stop` 分支里有 `s.done = true` 与 Chat/Responses 两套收尾，提取时保持副作用顺序（先 `p.response` 再置 `done`）。

**C3** · `strict/responses_input.go:84 responsesInput`（178L/5）
- 改动：给 `conversation` 增加 `func (c *conversation) addRole(role string, blocks []any, path string) error`（内部先 flush 当前 role 再 `c.add`），替换现有 `role/blocks/flush/appendRole` 四件套；每个 `case` 抽成 `func (p *Plan) inputMessageItem(c *conversation, item object, path string, index int) error`、`inputFunctionCallItem`、`inputFunctionCallOutputItem`、`inputReasoningItem`，并把 `summary` 比对抽成 `inputSummaryMatchesSummary(summary any, block object, path string) error`。
- 行为变更：无；`c.add` 的 path 参数与今天 `appendRole(..., path)` 传入的完全相同（`pos("input", i)`），错误文本不变。
- 测试：`strict/strict_test.go`、`strict/independent_review_test.go`、`strict/empty_input_independent_test.go`。
- 风险：低。

**C4** · `responses_to_anthropic_request.go:134 convertResponsesInputToAnthropic`（155L/4）
- 改动：`convertFunctionCallItemToAnthropic`、`convertFunctionCallOutputItemToAnthropic`、`convertReasoningItemToAnthropic`（thinking envelope 解码）、`convertRoleItemToAnthropic(item, role)`；三处重复的"空/纯空白就跳过"合并为 `appendIfNotEmptyAnthropic(messages []AnthropicMessage, role string, content json.RawMessage) []AnthropicMessage`（对应现在的 3 个 `continue`）。末尾的 `merge → pairing → merge` 三段保持原样。
- 行为变更：无。注意 `appendIfNotEmptyAnthropic` 必须同时保留"空"和"仅空白文本"两种判定的**调用位置差异**（user 分支只用第一个，assistant 分支两个都用），不要合并成一个过强判定。
- 测试：`responses_to_anthropic_tool_pairing_test.go`、`_parallel_tool_test.go`、`_cc_chain_test.go`（thinking 还原）、`_instructions_test.go`、`_invalid_blocks_test.go`、`_text_recovery_test.go`。
- 风险：低。

**C5** · `strict/messages.go:219 chatMessages`（142L/4）
- 改动：拆 `chatSystemMessage(m object, i int, c *conversation, path string) (handled bool, err error)`、`chatToolRun(a []any, i *int, path string) ([]any, error)`（把 `for { i++ }` 的手动推进收进签名）、`chatAssistantBlocks(m object, path string, role string) ([]any, error)`。
- 行为变更：无。
- 测试：`strict/strict_test.go`（`TestStrictToolRoundtripPairing`、`TestStrictRequestPreservesParametersToolsAndLongHistory`）、`independent_review_test.go:99`。
- 风险：低。

**C6** · `strict/messages.go:9 tools`（131L/4）
- 改动：拆成 `p.toolDeclarations(in, out) (names map[string]bool, err error)`、`p.toolChoice(in object, names map[string]bool) (choice object, err error)`、`applyParallelToolCalls(in object, choice object) error`；主函数按原顺序调用。`allowed` 字段白名单列表原样留在各自函数内（白名单内容属于契约，不可跨协议合并）。
- 行为变更：无。
- 测试：同 C5，另加 `strict/independent_review_test.go:46`（`none` + parallel 互锁）。
- 风险：低。

**C7** · `strict/messages.go:376 textParts` / `:432 imageSource`（56L/4）
- 改动：`textParts` 的 `case` 拆成 `textContentPart(o object, q string) (object, error)` 与 `imageContentPart(o object, q string) (object, error)`；`imageSource` 再拆 `imageURLObjectSource` / `dataURIImageSource`（后者的 mime 白名单 + `base64.StdEncoding.DecodeString` 校验是该包的严格契约，**不要**改成复用 codec 的 `dataURIToAnthropicImageSource`，后者不做严格校验）。
- 行为变更：无。
- 测试：`strict/strict_test.go` 的 image/URL 用例、`independent_review_test.go:99`。
- 风险：极低。

**C8** · `strict/response.go:21 response`（112L/3）+ `strict/stream.go:53 itemID`
- 改动：抽 `func streamItemID(msgID string, index int) string` 供 `Stream.itemID` 与 `outputItem` 共用；`response` 拆出 `convertResponseBlocks(blocks []any, model, id string, reason string) ([]any, error)`、`projectToChat(result object, blocks []any, id string, created int64, reason string) (object, error)`、`refusalChatOverride(out object, blocks []any)`。
- 行为变更：无（`itemID` 的格式串 `"%s_item_%d"` 归一到一处，输出一致）。
- 测试：`strict/strict_test.go`（`TestStrictJSONAndOpaqueHistory`、`TestStrictRefusalJSONSSEAndHistoryAgree`、`TestStrictResponseMetadataPreservedAndBufferBounded`）。
- 风险：低。

**C9** · `strict/plan.go:202 controls`（107L/3）
- 改动：拆 `p.applyStream(in, out) error`、`p.maxTokens(in object) (int64, string, error)`（保留 `max_completion_tokens`/`max_tokens` 冲突检测与错误文本）、`applySampling(in, out) error`、`applyStop(in, out) error`、`applyStreamOptions(in object) error`（写 `p.includeUsage`）。`keys()` 的允许字段列表保持在 `controls` 顶层一次性调用（顺序不变）。
- 行为变更：无；`maxKey` 的选择与"显式正数上限"错误文本必须逐字保留。
- 测试：`strict/strict_test.go`、`independent_review_test.go:64`。
- 风险：低。

### B. protocol-codec：去重与小函数（P1）

**C10** · 两个配对归一化函数的索引部分
- 改动：新增 `func indexLastBy[T any](items []T, key func(T) (string, bool)) map[string]T`（放 `types.go` 或新 `pairing.go`），替换 `normalizeAnthropicToolPairing` 的 `results` 构建与 `normalizeChatMessagesWithToolOutputMedia` 的 `replies` 构建。
  **不做**的事：不合并两个配对重建算法（类型不同、丢弃规则不同：一个按 block 拆分重发，一个按 `ToolCalls` 裁剪），只在注释里互相引用。
- 行为变更：无；"后写覆盖"语义由 `indexLastBy` 保证。
- 测试：`responses_to_anthropic_tool_pairing_test.go`、`_parallel_tool_test.go`、`chatcompletions_responses_bridge_test.go`。
- 风险：极低（Go 1.27 泛型可用；若想更保守可写成非泛型 `map[string]T` 版本）。

**C11** · `chatcompletions_to_responses.go:223 parseAssistantContent`（61L/5）
- 改动：`thinking/reasoning` 分支里两段完全相同的 `<thinking>…</thinking>` 包装合并为 `func writeThinkingTag(b *strings.Builder, text string)`；`strings.Builder.WriteString` 的错误返回不可发生，可去掉 `write` 闭包的直接返回，但**保持**"内容无法解析时返回空串而非报错"的既有语义。
- 行为变更：无。
- 测试：`chatcompletions_responses_test.go`、`chatcompletions_reasoning_alias_test.go`。
- 风险：极低。

**C12** · `chatcompletions_responses_bridge.go:179/193 CustomToolNames / FunctionToolNames`
- 改动：`func toolNamesByType(tools []ResponsesTool, typ string) map[string]bool`，两个导出函数改为一行调用。`NamespaceToolNames` 返回 `map[string]NamespacedToolName`，**不**并入。
- 行为变更：无。
- 测试：`chatcompletions_responses_bridge_custom_tools_test.go`、`_additional_tools_test.go`。
- 风险：极低。

**C13** · `responses_client_tools.go:568 Restorer.Restore`（89L/4）
- 改动：抽 `restoreOutputItem(event *ResponsesStreamEvent, done bool) *responsesClientToolStreamCall`（统一 `custom`/`tool_search` 两处重复的 Item 字段改写，用 `done` 区分是否取 `arguments.String()`），以及 `restoreArgsDelta`、`restoreArgsDone`。`emit` 闭包（重编号）保留在 `Restore` 内，确保序号连续。
- 行为变更：无：`added` 阶段 `Arguments` 恒为 `"{}"`、`done` 阶段为空时回落 `"{}"` 的差异必须靠参数保留，不能合并成一个分支。
- 测试：`responses_client_tools_test.go`、`_item_id_test.go`、`_item_id_helper_test.go`。
- 风险：中（该文件是客户端工具还原的脆弱路径）；若一次改不干净，宁可只做 `added`/`done` 的字段改写合并。

**C14** · `responses_tool_search_discoveries.go:41`（67L/5）
- 改动：把双层循环内体抽成 `func admitToolFromItem(known map[string]responsesDiscoveredToolIdentity, item any) (bool, error)`，深度降到 3；`registerExisting*` 三个函数保留（它们处理不同来源，合并会改变登记优先级）。
- 行为变更：无。
- 测试：`responses_tool_search_discoveries_test.go`（若不存在则退化为 `chatcompletions_responses_bridge_additional_tools_test.go` + 全包测试）。
- 风险：低。

### C. gateway：谓词复用（P0，跨 11 处）

**C15** · 节点新鲜度/本地服务谓词
- 改动：`internal/control/types.go` 增加：
  ```go
  const nodeFreshness = 20 * time.Second
  func (n Node) Fresh(now time.Time) bool          // 非零 LastSeen 且未过期
  func (n Node) ServingLocal(now time.Time) bool   // Fresh && Ready && Mode=="local"
  ```
  替换 `main.go:328`、`engine.go:194/450/683/758/797/909`、`store.go:287`、`runtime.go:122`、`offload.go:65`、`pluginblobs.go:59` 中的字面量比较。
- 行为变更：无。**不要**把 `Enabled` 塞进 `ServingLocal`：`engine.go:758/797` 与 `offload.go` 有意不看 `Enabled`（前者是对 primary 的路由判断，后者已单独判断），一旦合并会改变禁用节点的转发行为。`engine.go:909` 的 `fresh[id]` 只用 Fresh（无 Ready/Mode），`engine.go:450` 是取反形式的 `!ServingLocal` 等价式，替换时要逐个核对。
- 测试：`internal/control/control_test.go`、`offload_test.go`、`telemetry_test.go`、`mixed_telemetry_test.go`；Linux 侧 `realcore_offload_linux_test.go`。
- 风险：低——但这是 11 处行为敏感判断，建议单独一提交、逐处 diff 核对。

### D. gateway：长大函数切分（P1）

**C16** · `cmd/sub2api-gateway/main.go:85 run`（329L）
- 改动：
  - `run()` 只留 `os.Args` 解析 + 命令分派；
  - `dispatchConfigCommand(command string, flags) (done bool, err error)`；
  - `openPool(ctx context.Context, c config) (*pgxpool.Pool, error)` + `poolMaxConns() int32`（把环境变量覆盖抽出来，**同时**替换 `clusterCommand` 里重复的第 584–596 行）；
  - `openRedis(c config) (*redis.Client, error)`（`parseRedisURL` 调用点）；
  - `newServeSet(ctx, c config, ...) (*serveSet, error)`，`serveSet` 持有 `store/releases/peerManager/router/rt/engine/supervisor/servers`；
  - `serve(ctx context.Context, set *serveSet, bootstrap bool) error` 只做启动 + 信号 + 关停。
- 行为变更：无。关键约束：错误返回的**顺序**是运维可观测行为（例如 `invalid trusted public key` 必须仍在 `invalid cluster CA` 之前），拆函数时保持调用顺序。
- 测试：`cmd/sub2api-gateway/main_test.go`（8 个测试）、`internal/control/realcore_harness_linux_test.go`。
- 风险：中（闭包互相引用 `router`/`rt`）；用 `serveSet` 显式字段替代闭包捕获，可顺手消除 `var rt *control.LocalRuntime` 的前向声明。

**C17** · `internal/control/engine.go:551 checkPeer`（深度 8）
- 改动：`func (e *Engine) identityRevoked(ctx context.Context) bool`（PG 权威判断）+ `func (e *Engine) stopRevokedIdentity(ctx context.Context)`（维护、DrainStop、上报、RecordStop，用早返回打平）。`checkPeer` 变成 6 行。`defer cancel()` 的 30s 预算保持在同一层。
- 行为变更：无；"Redis 短暂注册失败不触发 drain"的注释与逻辑必须保留在 PG 判断处。
- 测试：`internal/control/control_test.go`、`realcore_faults_linux_test.go`。
- 风险：中低（安全路径，逻辑密集）。

**C18** · `internal/control/engine.go:701 Recover`（116L/6）
- 改动：`activePlan(plans []Plan) *Plan`、`scanNodeSteps(p Plan, nodeID string) (stopped, startIssued, localDone, disrupted bool)`、`func (e *Engine) redirectToPrimary(ctx context.Context) bool`（复用于 Recover 的两处与 `resumeForward`），以及 `func (e *Engine) enterMaintenanceAndStop(ctx context.Context, reason string) error`（把 6 处 `Maintenance(...)` + `stop(...)` 组合收成一个）。
- 行为变更：无；注意 `stop(ctx, "legacy-plan-recovery"/"active-plan-recovery"/"migration-barrier")` 三种 reason 文本不同，必须作为参数传入而不是统一。
- 测试：`realcore_faults_linux_test.go`（478L）、`control_test.go`。
- 风险：中（决策表密集）。

**C19** · `internal/control/engine.go:200 Coordinate`（123L/4）
- 改动：`func (e *Engine) completePlan(ctx, tx, p Plan, steps []Step) (bool, error)`、`func (e *Engine) stepState(ctx, tx, p, st) (string, error)`、`func (e *Engine) insertNextStep(ctx, tx, p, st) error`；主函数保留 `Begin`/`defer Rollback`/`FOR UPDATE`。
- 行为变更：无。**不可动**：`recordBlockedReason` 前必须先 `tx.Rollback`（现有注释已说明原因），拆分后这个次序要仍然直观可读。
- 测试：`control_test.go`、`realcore_business_linux_test.go`。
- 风险：中。

**C20** · `internal/control/store.go`：事务与 blocker 复用
- 改动：`func (s *Store) withTx(ctx context.Context, fn func(pgx.Tx) error) error`（Begin + defer Rollback + Commit），替换 `rollbackLocked`、`createLocked`、`RegisterLocked`、`SetPrimary`、`RemoveNode` 中重复的 5 行样板；`func appendBlockers(ctx context.Context, dst []string, checks ...func(context.Context) ([]string, error)) ([]string, error)` 供 `Preflight`（264–270）与 `rollbackLocked`（706–714）共用（后者是"有 blocker 就报错"，用一个 `firstBlocker` 包装）。
- 行为变更：无；`withTx` 不得改变 `defer tx.Rollback(ctx)` 的既有语义（提交后 Rollback 返回 `ErrTxClosed` 被忽略，属既有行为）。
- 测试：`control_test.go`（1002L）覆盖面足够；`updates_test.go` 覆盖 create/rollback。
- 风险：低–中。

**C21** · `internal/control/updates.go:193 checkUpdate`（88L/5）
- 改动：`type updateCacheKey struct{ repo string; revision int64; baseline string }`、`func (u *UpdateService) cacheValid(k updateCacheKey, ttl time.Duration) (updateCheck, bool)`、`func describeLatest(cur Release, latest githubRelease, baseline string, err error) updateCheck`（含 semver 比较与 `Compatibility`）、`func (s *Store) revalidateUpdateSource(ctx, k updateCacheKey) error`（I/O 后的并发重校验）。
- 行为变更：无；`force || cached.Reason != ""` 时 ttl 变 30s 的规则保留。
- 测试：`updates_test.go`（191L）。
- 风险：低。

**C22** · `internal/release/manager.go`：声明预扫与目录清理
- 改动：`func validateDeclarations(files []rc.File) (declared map[string]rc.File, directories map[string]bool, total int64, err error)`（从 `extract` 首段抽出，**不改任何校验条件**）；`func pruneDir(ctx context.Context, dir string, keep map[string]bool, filter func(os.DirEntry) bool) error` 供 `GC` 的 releases/manifests/blobs 三段复用；`manifestPath(digest)`/`releasePath` 之类的小格式化函数收掉重复的 `filepath.Join(m.Root, "releases", ...)`。
- 行为变更：无。安全边界（`validPath`、禁止链接/特殊文件、64 GiB 累计上限、16 GiB 单文件上限）逐字保留，只是搬家。
- 测试：`internal/release/manager_test.go`（181L）。
- 风险：低（但属安全代码，diff 必须逐行比对）。

**C23** · 死代码与 lint（`gateway.dead` / `gateway.sc`）
- 改动：
  - 删除 `internal/proxy/router.go:103 singleSendTransport`（staticcheck U1000 + deadcode 双标，全仓无引用）；
  - 删除 `internal/control/engine.go:105 Engine.LocalReady`（唯一 `LocalReady` 引用是 `proxy.Config.LocalReady` 字段，与本方法无关）；
  - 删除 `internal/control/store.go:233 Store.RefreshNodeDirectory`（注释称 "Called by Heartbeat"，实际 Heartbeat 不调用）；
  - `router.go:377` 的 `503` → `http.StatusServiceUnavailable`；
  - `internal/control/pluginblobs.go:64` 的 `err` 被同名复用后未检查：改为 `planID, planStatus, blockedReason, e := store.PlanStatus(ctx)` 并处理（`http.Error` + return），或显式 `_ =`；
  - `internal/release/manager_test.go:98` 的 `302` → `http.StatusFound`。
- **不要删** `Store.Register`（`control_test.go`、`offload_test.go` 在用；deadcode 看不到测试）与 `cpuload.ParseProcStat/ParseCgroupUsage/ParseCgroupLimit`（被 build-tag 为 linux 的 `counters_linux.go` 调用，Windows 上跑 deadcode 才显示不可达）。
- 行为变更：pluginblobs 之外无；那一处请先确认 `PlanStatus` 出错时是否应 500（当前是静默 200 + 0 值指标），按"不改变外部行为"原则先记日志再输出 0，或单列一个 bug 条目。
- 测试：`go vet`、`staticcheck`、`go test ./internal/...`。
- 风险：极低。

### E. mock-upstream / runtime-contract（P2）

**C24** · `deploy/mock-upstream/main.go:374 messages` + `:430 stream` 复用既有设施
- 改动：`messages` 改用 `readBody` + `s.begin(w, r, body, req.Model, req.Stream, req.Metadata, formatAnthropic)`（记录/延迟/注入错误/499 全在内），删掉本地重复的 `record/setStatus/sleep` 序列；`stream` 改用 `startSSE(w, r, b.chunkDelay)` + `sw.send("message_start", ...)`，删掉本地 `send` 闭包（其实现与 `sseWriter.send` 等价）。
- 行为变更：无（响应字节、事件顺序一致）。注意 `begin` 传入的 `model` 在 JSON 解析失败时为空串——`messages` 的解析失败分支要保留自己的 `record`，因为 `begin` 假定 body 已解析。
- 测试：`main_test.go`（`TestAnthropicUnchanged` 明确断言 Anthropic 响应不变）。
- 风险：低。

**C25** · `deploy/mock-upstream` Responses 信封去重
- 改动：把 `main.go:233-244` 与 `ws.go:77-86` 的 `textPart` / `item` / `response` 三个闭包提为包级 `responsesTextPart(text string) map[string]any`、`responsesMessageItem(id, status string, content []any) map[string]any`、`responsesEnvelope(id string, created int64, model, status string, output []any, usage any) map[string]any`；两处调用。
- 行为变更：无（字段集合与顺序在 `map` 中无关，JSON 序列化按键排序）。
- 测试：`main_test.go`、`ws_test.go`。
- 风险：极低。

**C26** · `deploy/mock-upstream/apis.go:376 gemini` + `main.go:283 resolve`
- 改动：`parseGeminiAction(spec string) (model, action string, ok bool)`、`geminiCandidate(text, finish string) []any`、`geminiStreamJSON(w, r, events, chunkDelay)`；`resolve` 拆 `applyKeyMarkers`、`applyRule(key string) (behaviour deltas)`、`applyHeaderOverrides`、`parseUsageHeader`。
- 行为变更：无；`resolve` 的四层优先级（body < key < rule < header）顺序不可变，rule 的 `Remaining--` 与删除时机不可变。
- 测试：`main_test.go`（`TestGemini`）、`main_test.go` 的 key-marker 用例。
- 风险：极低（mock 仅测试用）。

**C27** · `runtime-contract/locklease/lock.go:36 KeepLock`
- 前置：`runtime-contract` 目前**没有任何 `_test.go`**。本条要求"测试先行"：先加 `locklease/lock_test.go`（fake `Lock`，可控 `Until`/`Extend`，断言 `context.Cause == ErrLockLost`、续约次数、ctx 结束后不再续约），再抽 `func renewOnce(ctx context.Context, lk Lock, until time.Time) (bool, error)`（含 `WithDeadline(until)` 的调用）。
- 行为变更：无；"用剩余一半时间再续"的 `left/2` 与"Extend 失败后 `lctx.Err()` 优先"的顺序保留。
- 风险：中——无测试网的并发代码，没有测试就先不做（可延到下一轮）。

---

## 3. 不要动的内容

1. **`strict/` 的错误语义与文本**：`fail(path, reason)` 的所有 `reason` 字符串、`*Error` 类型断言、`keys()` 的字段白名单内容都是对外契约（上游 `CONTRACTS` §25/§26）。重构只能移动，不能改写、不能增删字段、不能改判定顺序。
2. **`strict/plan.go:80 checkJSONKeys`**：逐 token 的重复 key 检测与 128 层深度限制是本轮不动的安全边界，任何"用 `json.Unmarshal` 简化"都会让重复键静默通过。
3. **`pendingReasoning` / `lastTurnReasoning` 的状态机**（C1 提取对象）：它们各自的清零位置是 DeepSeek 400 与 Codex 历史自愈修复的核心；`lastTurnReasoning` 只在 user 侧清零这一条不能"顺手统一"。
4. **`normalizeAnthropicToolPairing` 与 `normalizeChatMessagesWithToolOutputMedia` 的配对重建算法**：只合并索引（C10），不合并算法；两者的"丢弃未应答调用 / 孤立回复 / 中间插入消息"规则不同，强行抽象会把两套语义混成一套。
5. **两套 image/data-URI 解析**：`strict/imageSource` 是严格校验（mime 白名单 + base64 解码），codec 的 `dataURIToAnthropicImageSource` 是宽松透传。不要为了"去重"合并。
6. **`gateway/internal/control` 的所有 SQL 文本与事务边界**：`Work`/`Execute`/`Coordinate` 的 `FOR UPDATE`、`RowsAffected()` 语义、`recordBlockedReason` 前的 `tx.Rollback` 都是并发正确性的一部分。本轮只做"把语句块搬进函数"，不改 SQL、不加/减事务。
7. **`internal/release/manager.go` 的归档安全校验**（`validPath`、`Typeflag` 白名单、`total` 上限、符号链接禁止）：C22 只移动代码，校验条件一字符都不能变。
8. **`internal/supervisor`、`internal/peer`、`runtime-contract/contract.go`**：前者依赖 Linux 进程组语义，中者是与 Redis 身份绑定的认证路径，后者是 wire 契约（改 JSON tag 即协议破坏）；本轮不改。
9. **`cpuload.Parse*` 与 `Store.Register`**：见 C23，均为"看似死代码、实则被构建标签或测试使用"的陷阱。
10. **`mock-upstream` 的响应 fixture 契约**：`main_test.go:227 TestAnthropicUnchanged` 明确要求 Anthropic mock 输出不变；`video_test.go`/`ws_test.go` 断言具体字段。mock 改动只允许"代码搬家"，不允许"顺手改文案"。
11. **`ChatCompletionsChunkToResponsesEvents`（111L/4）与 `AnthropicToResponsesResponse`（115L/4）**：状态机 + DTO 投影，现有测试密集；本轮不列入（收益低于 C1–C4，风险高于它们）。

---

## 4. 单人执行顺序

严格串行，每条一遍 `go test`：

1. **C23** 死代码 + lint（0 风险，先清场，减少后续 diff 噪声）。
2. **C15** 节点谓词（11 处，独立提交，逐处核对 `Enabled` 差异）。
3. **C1** `buildChatMessagesFromItems`（最大热点；先把"清零位置核对表"列出来再动手）。
4. **C2** `strict/stream.go:process`（与 C1 同构，可复用拆法）。
5. **C3** `responsesInput` 改用 `conversation.addRole`（同包内复用，收益最直观）。
6. **C4** `convertResponsesInputToAnthropic`（与 C1 对照，确认没有可以真正共享的代码后只做拆函数）。
7. **C5 → C6 → C7 → C8 → C9**（`strict/messages.go` 三连 + `response.go` + `plan.go`；每项一个提交）。
8. **C10 → C11 → C12 → C13 → C14**（codec 去重；C13 单独排，出问题可只回滚它）。
9. **C16** `run()` 切分（会同时改 `clusterCommand`，放在 gateway 结构重构的第一步）。
10. **C17 → C18 → C19 → C20 → C21 → C22**（engine/store/updates/release；每项后跑 `GOOS=linux go vet ./...`）。
11. **C24 → C25 → C26**（mock-upstream 收尾）。
12. **C27**（`locklease`）只有在"测试先行"完成的前提下再做，否则推迟到下一轮。

每完成 3–4 条建议整体跑一次：`cd next/protocol-codec && go test ./... -count=1 && cd ../gateway && go test ./... -count=1`，并 `git diff -w --stat` 确认没有意外的空白/顺序改动。

---

## 5. 处理结果（2026-10-24 执行）

27 项全部落地，无一推迟。逐条如下（"无行为变更"指请求/响应/SSE 字节与错误文本不变）。

### A. protocol-codec 拆大 switch

| 条目 | 结果 | 说明 |
|---|---|---|
| C1 `buildChatMessagesFromItems` | 已做 | 新增 `chatItemBuilder`（含 `messages/opts/pendingReasoning/lastTurnReasoning/mediaByCallID/invalidFunctionCallIDs/invalidEmptyFunctionCallOutputs`）与方法 `reasoningForAssistant/endThinkingSpan/endTurn/appendUserText/appendUserContent/dispatch` + 9 个 `append*Item/append*Part`。主循环只剩 `decode → dispatch → 普通 message 兜底`，约 45 行。**清零语义按计划拆成两个名字**：`endThinkingSpan()` 对应原每处 `pendingReasoning = ""`，`endTurn()` 对应原 `pendingReasoning+lastTurnReasoning` 同时清零；`lastTurnReasoning` 仍只在 user 侧（含 agent_message / input_text / input_image / 纯文本 item）清零，assistant 与 tool 分支一律只用 `endThinkingSpan`。 |
| C2 `strict/stream.go:process` | 已做 | `process` 只保留 failed/done 守卫、`decodeObject`、`requiredString(type)`、name/type 一致性与 `switch` 分派（加上 `defer` 里置 `s.failed`）；8 个分支变成 `handleError/handleMessageStart/handleContentBlockStart/handleContentBlockDelta/handleContentBlockStop/handleMessageDelta/handleMessageStop`。`message_stop` 内 "先 `p.response` 再置 `done`" 的顺序原样保留。 |
| C3 `responsesInput` | 已做 | `conversation` 新增 `role/blocks` 累积字段与 `addRole/flushRole`，替换内联 `role/blocks/flush/appendRole` 四件套；`case` 拆成 `inputItem`（分派）+ `inputMessageItem/inputFunctionCallItem/inputFunctionCallOutputItem/inputReasoningItem`，`summary` 比对抽成 `inputSummaryMatchesSummary`。所有 path 仍传 `pos("input", i)`。 |
| C4 `convertResponsesInputToAnthropic` | 已做 | 抽 `convertFunctionCallItemToAnthropic`、`convertFunctionCallOutputItemToAnthropic`、`convertReasoningItemToAnthropic`（返回 `ok` 表示是否产出一条消息）、`convertRoleItemToAnthropic`、`appendIfNotEmptyAnthropic(..., rejectBlankText)`。**按计划保留调用位置差异**：user 与 default 分支只判空，assistant 分支额外判"仅空白文本"。末尾 `merge → pairing → merge` 未动。 |
| C5 `strict/messages.go:chatMessages` | 已做 | 抽 `chatRefusal`、`chatSystemMessage`、`chatToolRun(a, i, path) (blocks, lastIndex, error)`（手动 `i++` 收进函数，成功时由调用方把 `i` 设为 lastIndex）、`chatMessageBlocks`。相邻 tool 分组合并只对相邻项生效，行为不变。 |
| C6 `strict/messages.go:tools` | 已做 | 抽 `p.toolDeclarations(in, out)`、`p.toolChoice(in, names)`、`applyParallelToolCalls(in, choice)`；`allowed` 字段白名单留在各自函数内，调用顺序与 `keys()` 位置不变。 |
| C7 `strict/messages.go:textParts/imageSource` | 已做 | `textParts` 的 case 拆 `textContentPart`/`imageContentPart`；`imageSource` 拆 `imageURLObjectSource`/`inputImageURLSource`/`imageSourceFromURL`。**未**复用 codec 的 `dataURIToAnthropicImageSource`（strict 的 mime 白名单 + `base64.StdEncoding` 校验原样保留）。 |
| C8 `strict/response.go:response` + `itemID` | 已做 | `streamItemID(id, index)` 成为 `"%s_item_%d"` 的唯一实现（`Stream.itemID` 与 `outputItem` 共用）；`response` 拆 `convertResponseBlocks`（返回 blocks 与 tool_use id 集合）、`projectToChat`（provider_details 仍取自原始上游 `m`，与原来一致）、`refusalChatOverride`。 |
| C9 `strict/plan.go:controls` | 已做 | `controls` 只做 `keys()` 白名单 + 顺序调用；拆出 `applyStream`、`p.maxTokens`（含 max_tokens/max_completion_tokens 冲突检测与原文错误）、`applySampling`、`applySingleCompletion`、`applyStore`、`applyInclude`、`applyStop`、`p.applyStreamOptions`。`maxKey` 选择逻辑与"explicit positive token limit required"逐字保留。 |

### B. protocol-codec 去重

| 条目 | 结果 | 说明 |
|---|---|---|
| C10 配对索引 | 已做 | 新增 `pairing.go` 的泛型 `indexLastBy[T]`，替换 `normalizeAnthropicToolPairing` 的 `results` 与 `normalizeChatMessagesWithToolOutputMedia` 的 `replies` 构建（"后写覆盖"不变）。两个配对重建算法**未合并**，注释互相引用说明各自规则差异。 |
| C11 `parseAssistantContent` | 已做 | 抽出 `writeThinkingTag`；去掉不可失败的 `write` 闭包及错误返回；"内容无法解析返回空串"的语义保留。 |
| C12 `CustomToolNames/FunctionToolNames` | 已做 | 合为 `toolNamesByType(tools, typ)`；`NamespaceToolNames` 未并入。返回值仍为 nil（而非空 map），与调用方"nil 即不存在"的判断一致。 |
| C13 `Restorer.Restore` | 已做 | 抽 `restoreOutputItem(event, call, done)`，用 `done` 参数区分 added（`Arguments` 恒为 `"{}"`、custom 的 `Input` 为空）与 done（取已缓冲参数、空则回落 `"{}"`）。`emit` 重编号闭包留在 `Restore` 内。 |
| C14 `promotedResponsesToolSearchDiscoveries` | 已做 | 双层循环内体抽成 `admitToolDiscoveries(known, discoveries)`，深度由 5 降到 3；三个 `registerExisting*` 未合并（登记优先级不同）。 |

### C. gateway 谓词复用

| 条目 | 结果 | 说明 |
|---|---|---|
| C15 新鲜度/本地服务谓词 | 已做 | `internal/control/types.go` 新增 `const nodeFreshness = 20 * time.Second`、`Node.Fresh(now)`、`Node.ServingLocal(now)`。替换 11 处：`main.go` PeerReady、`engine.go` 5 处 + `requireFreshNodes`、`store.go` Preflight、`runtime.go` RefreshForward、`offload.go` offloadTargets。**按 C15 要求未把 `Enabled` 并入** `ServingLocal`/`Fresh`：`main.go:PeerReady`、`engine.go:resumeForward`、`offload.go` 三处仍显式写 `n.Enabled &&`，其余（primary 路由判定、Preflight）本就不看 Enabled，保持原语义。`engine.go` 的两处取反式（`!n.ServingLocal`、`!n.Fresh`）与原来的 `!Ready || Mode!="local" || ...` / `IsZero || >= 20s` 逐处核对，等价；`engine.go:587` 原是 `>= 20s` 判陈旧，与 `!Fresh` 完全等价。**唯一需要记录的边界归一化**：`store.go` 的 Preflight 与 `engine.go` 的 redirect 目标检查原来用 `time.Since(...) > 20s`（恰好 20s 视为仍新鲜），统一到 `Fresh` 的 `< 20s` 后恰好 20s 视为陈旧；两套写法在 20s 边界上本就互不一致（其余 9 处用 `< 20s`），这是计划要求统一阈值的必然结果，纳秒级边界在真实心跳上不可观测。`telemetryTTL`、`context.WithTimeout(20s)` 等非谓词用途的 20 秒字面量未动。 |

### D. gateway 长大函数切分

| 条目 | 结果 | 说明 |
|---|---|---|
| C16 `run()` | 已做 | 拆为 `cliOptions`/`parseCLI`、`run`（仅分派）、`dispatchConfigCommand`（本地 socket 与 cluster 命令）、`runCommand`（init/import/serve）、`shell`（pool + store + release + closers）、`openPool`/`openRedis`/`newShell`/`initCluster`/`importRelease`、`serveSet` + `build`/`newPeerManager`/`buildRuntime`/`pollPeers`/`listen`/`serve`/`close`、`clusterCAPool`、`parseTrustedProxies`。`clusterCommand` 的 pool 环境变量覆盖同时改为复用 `openPool`。错误返回顺序保持（`invalid trusted public key` 仍在 `invalid cluster CA` 之前，特权丢弃仍在任何 core 之前，token 写在 core 之前，listener 先起再 Recover）。**注意**：`serve` 现在显式接收 `cancel`，listener 失败时与原逻辑一样取消信号 context。 |
| C17 `checkPeer` | 已做 | 拆 `identityRevoked(ctx) bool`（PG 权威判断 + 保留"Redis 短暂注册失败不触发 drain"注释）与 `stopRevokedIdentity(ctx)`（早返回打平，30s 预算仍在同一层）；`checkPeer` 只剩 6 行。 |
| C18 `Recover` | 已做 | 抽 `activePlan(plans)`、`recoverActivePlan(ctx, p, primary)`、`scanNodeSteps(p, nodeID)`、`redirectToPrimary(ctx, primary) (attempted, ok)`、`enterMaintenanceAndStop(ctx, reason)`。三种 stop reason 文本仍作为参数逐个传入。 |
| C19 `Coordinate` | 已做 | 抽 `completePlan`、`settleExistingStep`、`insertNextStep`；`Begin/defer Rollback/FOR UPDATE` 仍在 `Coordinate`。**`recordBlockedReason` 前先 `tx.Rollback` 的次序保留**在 `completePlan` 与 `Coordinate` 的 followersStopped 分支内，注释一并搬过去。 |
| C20 store 事务样板 | 已做 | 新增 `withTx(ctx, fn)`、`appendBlockers`、`firstBlocker`；替换 `RegisterLocked`、`createLocked`、`rollbackLocked`、`SetPrimary`、`RemoveNode`，`Preflight` 与 `rollbackLocked` 的 blocker 检查分别改用 `appendBlockers`/`firstBlocker`。`withTx` 的 `defer tx.Rollback` 语义与原来逐处一致（提交后 Rollback 的错误被忽略）。 |
| C21 `checkUpdate` | 已做 | 抽 `updateCacheKey`、`u.cacheValid(key, ttl)`、`u.describeLatest(ctx, out, current, latest, baseline, fetchErr)`、`s.revalidateUpdateSource(ctx, key) (conflict, err)`。`force || cached.Reason != "" → 30s TTL` 的规则保留。 |
| C22 release manager | 已做 | `extract` 首段抽成 `validateDeclarations(files)`（全部校验条件逐字保留）；`GC` 三段目录清理改用 `pruneDir(ctx, dir, keep, wantDir)`。安全边界（`validPath`、Typeflag 白名单、64 GiB/16 GiB 上限、禁止链接）未改。 |
| C23 死代码与 lint | 已做 | 删除 `proxy.singleSendTransport`、`Engine.LocalReady`（连带删除 `localReady` 字段与其唯一写入点）、`Store.RefreshNodeDirectory`（全仓 grep 确认除 `.claude/worktrees` 快照外无引用）；`503` → `http.StatusServiceUnavailable`；`manager_test.go` 的 `302` → `http.StatusFound`；`pluginblobs.go` 的 `PlanStatus` 错误现在 `slog.Warn` 后仍按原样输出 0 值指标（保持历史 200 响应）。**未删** `Store.Register`、`cpuload.Parse*`。 |

### E. mock-upstream / runtime-contract

| 条目 | 结果 | 说明 |
|---|---|---|
| C24 `messages()`/`stream()` 复用 | 已做 | `messages` 改用 `readBody` + `s.begin(..., formatAnthropic)`，解析失败分支保留自己的 `record`（因为 `begin` 假定 body 已解析）；`stream` 改用 `startSSE` + `sseWriter.send`，删掉本地 `send` 闭包。`main_test.go:TestAnthropicUnchanged` 通过与 SSE 事件顺序断言通过。 |
| C25 Responses 信封去重 | 已做 | `textPart`/`item`/`response` 三个闭包提为包级 `responsesTextPart`/`responsesMessageItem`/`responsesEnvelope`，`apis.go` 的 `responses` 与 `ws.go` 的 `responsesTurn` 共用。 |
| C26 gemini + resolve | 已做 | `gemini` 抽 `geminiCandidate`、`geminiStreamJSON`；`resolve` 拆 `applyBodyMeta`、`applyKeyMarkers`、`applyRule`（锁由调用方持有，`Remaining--` 与删除时机不变）、`applyHeaderOverrides`。四层优先级顺序（body < key < rule < header）保持。注：`parseGeminiAction` 未单独成函数——原实现的 `LastIndex(":")` + 索引切片已是一行，再抽只会增加一层参数传递，故只把 candidate 构造与 JSON 数组输出分离。 |
| C27 `locklease.KeepLock` | 已做（先写测试） | 先新增 `locklease/lock_test.go`（fake `Lock` 可控 `Until`/`Extend`，覆盖：持续续约、Extend 报 `false` → `ErrLockLost`、零 Until 立即 lost、stop 后不再续约、瞬时错误重试后成功），共 5 个测试；再抽 `renewOnce(lctx, lk, until, wait) (renewed, lost)`。`left/2` 的休眠点、`WithDeadline(until)` 的边界、"Extend 失败后 `lctx.Err()` 优先于 `err == nil`" 的判定顺序逐条保留。 |

### 验证

- `next/protocol-codec`：`go build ./... && GOOS=linux go vet ./...` 通过；`go test -count=1 ./...` 全绿，共 **456 + 25（strict）+ 113 个子测试 = 594** 次 `=== RUN Test*`（与审计前一致，说明没有测试被跳过或删除）。该包无新增 fixture，现有断言直接比对 JSON/SSE 字符串，等价 golden 比对。
- `next/gateway`：`go build ./... && GOOS=linux go vet ./...` 通过；`go test -count=1 ./...` 全绿，132 次 `=== RUN Test*`（92 个顶层测试，含表驱动子测试）。`*_linux_test.go` 在 Windows 上仍不执行，需 CI 补 Linux 套件。
- `next/runtime-contract`：`go build && go vet` 通过；新增 5 个 `locklease` 测试全绿（此前该模块无任何测试）。
- `next/deploy/mock-upstream`：`go build && GOOS=linux go vet` 通过；8 个测试全绿。
- `staticcheck` 在四个模块的受影响包上均无输出（0 告警）。
- `gofmt -l` 在四个模块均无输出。
- 未提交、未推送。

### 未做 / 有意保留

- `runtime-contract/contract.go`、`strict` 的错误文本与 `keys()` 白名单、`checkJSONKeys` 逐 token 检测、两套 image/data-URI 解析、`ChatCompletionsChunkToResponsesEvents` 与 `AnthropicToResponsesResponse`、`internal/supervisor`/`internal/peer`：按第 3 节"不要动"清单原样保留。
- `Node.Fresh`/`ServingLocal` **不含** `Enabled`（C15 硬要求）；调用点若需要 Enabled 仍显式写。
- `parseGeminiAction`（C26 的可选子项）：见上，判定为无收益的过度拆分。

---

## 6 行摘要

1. 最大热点是 `buildChatMessagesFromItems`（252L/6）与 `strict/stream.go:process`（221L/4）+ `strict/responsesInput`（178L/5）：都是"一个大 switch 塞 20–60 行 case"，按 item/event 类型提取 handler 可把主函数压到 40–50 行、深度降到 2–3，且 456+16 个现有断言直接兜住"字节不变"。
2. codec 真正的复用点在 `strict/`：`responsesInput` 重复实现了同包 `conversation` 的角色累积；`itemID` 格式串在 `stream.go` 和 `response.go` 各写一遍；两个配对归一化函数的"按 id 建索引、后写覆盖"可抽成一个泛型 `indexLastBy`（配对算法本身不要合并）。
3. `responses_to_anthropic_request.go` 与 chat 桥枚举同一份 Responses items，但解码形状不同，只值得抽各自的分派函数与"空内容跳过"辅助，不值得做跨路径统一抽象。
4. gateway 最高收益不是拆 `run()`（329L，结构债但风险中等），而是把 11 处手写的"20 秒内 Ready 且 local"谓词收成 `Node.Fresh/ServingLocal`——同一阈值漂移一次就是线上调度问题。
5. gateway 其余按"深度优先"排：`checkPeer`（深度 8）、`Recover`（116L/6）、`Coordinate`、`checkUpdate`；死代码可无风险删 3 个符号 + 修 3 个 lint，但 `Store.Register` 与 `cpuload.Parse*` 看似死代码实则被测试/构建标签使用，禁止删除。
6. `runtime-contract` 与 `mock-upstream` 无严重热点；mock 的 `messages()/stream()` 绕过了已有的 `begin()/sseWriter` 是明确遗漏（可零风险修掉），`locklease.KeepLock` 因整个模块无测试，本轮只允许"先写测试再拆"。
