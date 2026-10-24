# 审核 Round 2 — 03：protocol-codec / strict / gateway / runtime-contract / mock-upstream

审核对象：`a0d45b4fc`（`refactor(codec,gateway): per-type handlers and one freshness predicate (round 2 C1-C27)`）
对照基线：`a0d45b4fc~1`
审核日期：2026-10-24
审核方式：只读（除本文件外未改任何仓库文件）；临时验证代码全部放在 `$TEMP`（`D:\tmp\diffcheck`）。

---

## 结论（verdict）

**通过。** codec 的请求/响应/SSE 输出经差分验证逐字节不变，未发现逻辑回归；gateway 的 `run()` / `checkPeer` / `Recover` / `Coordinate` / `checkUpdate` 拆分的启动顺序、事务边界与错误文本均与基线一致。唯一的行为变更就是作者已披露的 20 秒新鲜度边界归一化（见 R-C4）。

不过本轮遗留 3 类问题：**测试网偏薄**（新增/重排的状态机几处未见断言，用变异测试证明）、**写后不读的死字段与单字段包装结构**（过度抽象），以及**新抽出的复用设施没有用到底**（`withTx`、`mock.begin` 仍有 4+1 处手写副本）。

### 实际做过的验证

1. **差分对拍（`D:\tmp\diffcheck`，一次性、不在仓库内）**
   把 `a0d45b4fc~1` 与 `a0d45b4fc` 的 `protocol-codec` 各复制成独立 module（`oldcodec` / `newcodec`），写一个同时依赖两者的 harness：
   - 固定语料 257 行：`ResponsesToChatCompletionsRequestWithOptions`（含 `ReasoningContentByID`）、`EffectiveResponsesTools`、`ResponsesToAnthropicRequest`、`ChatCompletionsToResponses` 往返、`AnthropicToResponses` / `AnthropicToChatCompletionsRequest`、`strict.Prepare`（chat/responses 各 8/4 例 + 57 例错误路径）、`strict.Plan.JSON`、`Adapter/Restorer` 全部事件；
   - 随机 fuzz 1600 例：26 种 Responses item 形状随机拼 1–10 项（覆盖 reasoning / pending-cached / 截断 `function_call` / 无 call_id output / tool_search / custom / namespace / agent_message / developer / tool role / 未知类型 / 纯字符串 / media output）；
   - strict 请求 fuzz 1500 例（chat 与 responses 双协议，含 refuse、tool run、image data-URI、非法字段）；
   - strict SSE 1203 例（21 种事件形状随机拼 1–10 个，含重复 start、乱序 index、thinking/redacted、未知 delta、error）；
   - 补充语料 7 例：`"tools":[]` 的 wire、仅含空白文本的 user 项、声明工具但只有 `parallel_tool_calls` 无 `tool_choice`。
   **结果：`IDENTICAL`，全部 4567 行输出逐字节相同**（只把 `created`/`created_at` 归一化，因为是时间戳）。
2. **变异测试**（对 `a0d45b4fc` 现码注入 18 个语义变异，逐个跑 `go test ./...`，并用上面的 harness 判断变异是否真的改变输出）。结果见 R-C1/R-C2/R-C3。
3. `staticcheck ./...`：`protocol-codec`、`gateway`、`runtime-contract`、`deploy/mock-upstream` 均 0 告警；`gofmt -l` 全净；`go test ./... -count=1` 四个模块全绿；`GOOS=linux go vet ./...`（gateway）通过。
4. `deadcode -test` 只剩两个历史符号（`modelpolicy.NormalizeEffortModelID`、`rc.Range.Contains`，均非本次引入），本次删除的 `singleSendTransport` / `Engine.LocalReady` / `Store.RefreshNodeDirectory` 在 `next/` 内确已无引用（仅 `artifacts/` 快照仍含旧文）。
5. 行数/深度（`/d/tmp/gometrics`）：`run` 329/3→10/1、`Recover` 116/6→24/2、`checkPeer` 34/8→12/2、`Coordinate` 123/4→53/2、`checkUpdate` 88/5→54/1、`process` 221/4→41/2、`responsesInput` 178/5→41/3、`buildChatMessagesFromItems` 252/6→49/3、`tools` 131/4→20/2、`convertResponsesInputToAnthropic` 155/4→93/3。收益真实。

---

## 问题表（按严重度）

| id | 位置 | 类型 | 问题 | 具体改法 | 风险 | 行为变更 |
|---|---|---|---|---|---|---|
| R-C1 | `next/protocol-codec/chatcompletions_responses_bridge.go:452-478`（`chatItemBuilder.pendingReasoning` / `reasoningForAssistant` / `endThinkingSpan`） | 过度抽象 + 死分支 | 抽出的两个字段里 `pendingReasoning` 没有任何可观测作用。全仓只有 `appendReasoningItem` 写它，且写完立刻 `lastTurnReasoning = pendingReasoning`，所以**不变式 `pending != "" ⇒ pending == lastTurn` 恒成立**，`reasoningForAssistant()` 里的 `if b.pendingReasoning != ""` 分支永远与 `return b.lastTurnReasoning` 同值。变异测试证实：把 `endThinkingSpan()` 改成空函数（M17）、把 `reasoningForAssistant` 改成只读 `lastTurnReasoning`（M18）、删掉 `appendFunctionCallItem` 后的 `endThinkingSpan()`（M6），**单元测试与 4567 行差分输出全部零差异**。也就是说文档里"清零位置逐处对应"的论证，对 `pendingReasoning` 这一半是不可观测的 | 二选一：(a) 删掉 `pendingReasoning` 与 `endThinkingSpan`，只留 `turnReasoning` + `endTurn()`；(b) 若想保留"思考跨度"这个名字，就在 `endThinkingSpan` 的注释里写明它当前是冗余不变式的文档化，并**不要**把它当成必须逐处守住的契约。建议 (a)，净删约 20 行 | 低（有 4567 行差分 + 不变式论证；改完再跑一次 harness） | 否 |
| R-C2 | 同上 `appendMessageItem:685`、`dispatch:503`、`buildChatMessagesFromItems:427`、`appendAgentMessageItem:670` | 测试网不足 | 真正可观测的是 `endTurn()`（清 `lastTurnReasoning`）的调用位置，但现有 456 个测试只钉住了"链式工具调用重放"一条（`chatcompletions_responses_reasoning_cache_test.go:99`）。变异测试：把 user 侧消息分支的 `endTurn` 换成 `endThinkingSpan`（M2）、未知 item 类型分支换掉（M3）、空 `agent_message` 分支换掉（M4），**三处都在差分 harness 里改变了输出（第 15/52/120/124/163 行），但 `go test` 全绿**。这正是审计计划 §3.3 点名的"DeepSeek 400 / Codex 历史自愈"核心路径 | 补一个表驱动测试：给定 item 序列 → 断言每条 assistant 消息的 `ReasoningContent`。至少覆盖 ① reason→assistant→user→assistant（第二段必须为空）② reason→func_call→output→**user**→assistant ③ reason→`unknown_type`→assistant ④ reason→空 `agent_message`→assistant ⑤ reason→developer message→assistant。放 `chatcompletions_responses_reasoning_cache_test.go` 旁边 | 低 | 否（只加测试） |
| R-C3 | `next/runtime-contract/locklease/lock_test.go`（5 个测试） | 测试网不足（安全代码） | 新增测试是好事，但没钉住两条最关键的规则：① `Extend` 返回错误后**剩余时间耗尽**必须 `cancel(ErrLockLost)`——把 `if left <= 0 { return false, true }` 改成 `return false, false` 后测试仍全绿（被守护的 ctx 永不取消，锁已失效却继续干活）；② 退避等待期间 ctx 结束必须是"安静退出"而非"报丢锁"——把 `if !wait(...) { return false, false }` 改成 `true` 也全绿。这两条正是 `KeepLock` 文档承诺的安全性 | 各加一个 fakeLock 用例：前者让 `Extend` 持续返回错误且 `until` 设为 30ms 内到期，断言 `context.Cause == ErrLockLost`；后者让 `Extend` 报错、`wait` 用很短的真实 duration，在退避中 cancel parent，断言 `Cause` 是 `context.Canceled`（而非 `ErrLockLost`）且 `stop()` 立即返回 | 低 | 否（只加测试） |
| R-C4 | `next/gateway/internal/control/types.go:37-56`；边界敏感的调用点 `store.go:271`（Preflight）、`engine.go:459`（Execute 的转发目标判定） | 行为变更（已披露）+ 无测试 | `Fresh` 用 `now.Sub(LastSeen) < 20s`，恰好 20s 视为陈旧；基线里这两处写的是 `time.Since(...) > 20s`，恰好 20s 视为**仍新鲜**。作者已在结果表披露，判断是对的（另 9 处本来就是 `< 20s`），但：① 这两处语义是"blocker 判定 / 是否把请求转给 primary"，边界翻转的方向是**更保守**（恰好 20s 就从"可转发"变成"维护"），运维可见；② 新谓词**没有任何单元测试**（`grep 'Fresh(\|ServingLocal(' *_test.go` 零命中），而本次改动的核心风险恰恰是"11 处判断是否等价" | 在 `internal/control` 加一个 20 行表驱动测试：`Node{LastSeen: now-20s}`、`now-20s+1ns`、`now-19.999s`、零值，分别断言 `Fresh` / `ServingLocal`，并显式断言 `Enabled:false + Ready + local + 新鲜` 时 `ServingLocal == true`（把"不并入 Enabled"这条决定固化成测试）。若想彻底无行为变更，可给 `Fresh` 加一个 `FreshInclusive`/`StaleBefore` 变体只给这两处用——但我不建议，保持单一阈值更值 | 低 | 是（恰好 20s，已披露） |
| R-C5 | `next/gateway/cmd/sub2api-gateway/main.go:347,349`（`serveSet.redisClient` / `serveSet.peerManager`）、`:481-483`（`peerManagerDeps`）、`:576`（`listen(ctx)`） | 遗留死字段 + 过度抽象 | `redisClient` 与 `peerManager` 只被赋值、从不读取（`grep 's\.redisClient\|s\.peerManager'` 只有写入点）；struct 字段不受 staticcheck U1000 管辖，所以 0 告警掩盖了它们。`peerManagerDeps` 是只有一个字段的"依赖包"，存在的唯一作用是给 `newPeerManager` 多一层间接；`listen(ctx context.Context)` 的 ctx 完全未使用（编译不报，因为可以被 `_ =` 语义容忍——实际是未使用参数，只是 Go 不检查） | 删 `serveSet.redisClient`、`serveSet.peerManager`；`newPeerManager(redisClient *redis.Client)` 直接收参数、删 `peerManagerDeps`；`listen()` 去掉 ctx 参数（`build` 里同步改一行） | 极低 | 否 |
| R-C6 | `next/gateway/internal/control/store.go:535`（`Action`）、`:1088`（`ConfirmStoppedCore`）、`updates.go:345`（`importGitHub`）、`engine.go:367`（`Execute` 的落库事务） | 漏掉的复用 | C20 新增了 `withTx` 并替换了 5 处，但同文件/同类型里还剩 3 处、`engine.go` 1 处仍是 `Begin` + `defer tx.Rollback` + `Commit` 明文样板。`Action` 与 `ConfirmStoppedCore` 完全是 `s.withTx(ctx, func(tx pgx.Tx) error {...})` 的形状（`engine.go` 用 `e.Store.withTx`）。留着会让人以为 `withTx` 只适用于部分写路径 | 逐处机械替换，保持 `Begin`→`defer Rollback`→`Commit` 的语义（`withTx` 已与逐处写法等价，见下条核对结论）。`Action` 里 `tx` + `defer rows.Close()` 之类的组合要逐个看；建议一次一提交 | 低 | 否 |
| R-C7 | `next/protocol-codec/responses_to_anthropic_request.go:382-390`（`normalizeAnthropicToolPairing` 的 `userBlocks`） | 复用代价 | 为了用 `indexLastBy`，先把**所有** user 消息的 content block 摊平进一个 `[]AnthropicContentBlock` 再建索引；基线是单层 `for` 直接写 map。语义等价（后写覆盖不变），但长历史（Anthropic 侧常见 100+ 消息、每消息数十 block）多一次全量切片分配 + 拷贝，正好在这条请求热路径上 | 给 `indexLastBy` 加一个"逐条喂"的孪生 `indexLastInto(dst map[string]T, items []T, key func(T)(string,bool))`，或在 `normalizeAnthropicToolPairing` 里保持原双层循环、只把 Chat 侧的 `replies` 构建改用 `indexLastBy`。若坚持共用，就把注释里的"共享索引"缩到 Chat 侧 | 低 | 否（内存/GC 层面） |
| R-C8 | `next/deploy/mock-upstream/main.go:492-512`（`countTokens`） | 漏掉的复用 | C24 把 `messages()` 改成 `begin()`，但同一个文件里 `countTokens` 仍然手写 `readBody → record → resolve → sleep → setStatus(499) → status>=400 → setStatus(200)` 共 16 行，与 `begin` 逐字同构（错误格式同样是 Anthropic）。`listModels` / `listGeminiModels` / `webhook` 的差异是真实的（无 body/model），`countTokens` 不是 | `id, b, ok := s.begin(w, r, body, req.Model, false, req.Metadata, formatAnthropic); if !ok { return }`，保留 `setStatus(id, 200)` 与估算逻辑 | 极低 | 否 |
| R-C9 | `next/gateway/cmd/sub2api-gateway/main.go:128-135`（`run`） | 简洁/健壮性 | `if done, err := dispatchConfigCommand(opts); done { return err }`：`done == false` 时 `err` 被静默丢弃。当前 `dispatchConfigCommand` 的所有非命中路径都返回 `(false, nil)`，所以不是 bug；但这是一个"以后谁在里面加了提前 return 就静默吞错"的形状 | 改成 `done, err := dispatchConfigCommand(opts); if err != nil || done { return err }`（两行），或让 `dispatchConfigCommand` 返回 `(cmd func() error, ok bool)` | 极低 | 否 |
| R-C10 | `next/protocol-codec/strict/messages.go:193-215`（`conversation.addRole/flushRole` + 新增字段 `role/blocks`） | 耦合/复用边界 | 角色累积语义确实复用了，但实现方式是把 `role`/`blocks` 变成 `conversation` 的字段——而 `conversation` 同时被 `chatMessages`（chat 协议）使用，那里**从不**调用 `addRole`，这两个字段永远是零值。等于给一个共享类型挂了一份只有一个调用者用的可变状态，`finish()` 还需要读者自己确认"累积器已 flush" | 把 `role/blocks` 挪到一个只在 `responsesInput` 里用的 `roleAccumulator{ c *conversation }`（或 `func (c *conversation) newRoleRun() *roleRun`），`conversation` 保持原来的纯状态。语义零变化，读者不必再在 chat 路径上思考这两个字段 | 低 | 否 |
| R-C11 | `next/protocol-codec/responses_to_anthropic_request.go:287-311`（`convertRoleItemToAnthropic` + `appendIfNotEmptyAnthropic(..., rejectBlankText)`） | 过度抽象 | 同一个"角色"决定被拆成两处：调用点既要传 `role string`（选白名单函数），又要传一个独立的 `rejectBlankText bool`。目前 3 个调用点靠注释约定"assistant 才 true"，一旦有人写 `appendIfNotEmptyAnthropic(msgs,"assistant",c,false)` 就静默恢复成会 400 的行为，编译期无任何保护 | 合并成一个 `appendRoleItemAnthropic(messages, item, role ResponsesItemRole)`，内部同时决定白名单与是否拒绝纯空白；或至少用一个未导出的 `type anthropicItemRole struct{ name string; rejectBlankText bool }` 常量（`userItemRole` / `assistantItemRole`）。既去掉三处布尔字面量，也让"哪一种角色做哪种检查"只有一处定义 | 低 | 否 |
| R-C12 | `next/gateway/internal/control/engine.go:844-858`（`redirectToPrimary` 返回 `(attempted, ok)`） | 可读性/易误用 | 两个孪生布尔在相邻两个调用点用法相反：`recoverActivePlan:784` 只取 `ok`（`_` 掉 attempted），`:811` 只取 `attempted`（`_` 掉 ok）。两者都正确（我逐句核对过与原实现等价），但 `attempted=true, ok=false`（找到了新鲜 primary 但 Redirect 失败）在这种 `_` 掉一半的写法里几乎不可读，未来改动极易取错 | 拆成两个各自语义单一的函数：`hasFreshPrimary(nodes, primary) bool` 与 `redirectToPrimary(ctx, primary) bool`（后者内部再查一次节点或接收节点表）。`recoverActivePlan` 两处各自只调需要的那一个 | 低 | 否 |
| R-C13 | `next/gateway/internal/release/manager.go:550-612`（`pruneDir`）、`:265-287`（`validateDeclarations`） | 抽象正确性/收敛 | 这两处拆分是对的，但 `pruneDir(ctx, dir, keep, wantDir bool)` 的 `wantDir` 布尔 + 内部 `if wantDir { RemoveAll } else { Remove }` 把"删目录 vs 删文件"和"删整棵还是删一项"两件事压在一个参数上；`validateDeclarations` 的错误返回 `(nil, nil, err)` 让调用点必须记得"错误时不要用前两个返回值"（当前 `extract` 正确）。属可接受的中间态，不是缺陷 | 若下一轮再动：`pruneDir` 换成 `pruneEntries(ctx, dir, want func(os.DirEntry) bool, remove func(string) error)`；`validateDeclarations` 保持现状即可。**不需要现在改** | 极低 | 否 |
| R-C14 | `next/deploy/mock-upstream/apis.go:384-459`（`gemini`，74 行/深度 3） | 剩余热点 | C26 之后 `gemini` 仍是"action 解析 → JSON 校验 → begin → 三路 action 分派 → 非流式 / SSE / JSON 数组"五段拼接；`parseGeminiAction` 被判定"无收益"而未抽，判断成立，但函数体内 `case "generateContent"` 与 `case "streamGenerateContent"` 各自重复构造 `respID`/`model` 之外的请求校验，可再降一档 | 只做一件事：把 `if !stream { writeJSON(...) ; return }` 的整段抽成 `geminiJSON(w, id, model, b, respID)`，与 `geminiStreamJSON` 对称；`gemini` 立刻降到 ~45 行。纯搬家 | 极低（mock 仅测试用，`TestGemini` 覆盖） | 否 |
| R-C15 | `next/protocol-codec/strict/*_test.go`（`strict_test.go`、`independent_review_test.go` 等） | 测试网不足（错误契约） | 结果表 §5 与计划 §3.1 都强调"`fail(path, reason)` 的 path/reason 是对外契约"，但现有测试**没有**断言它们。变异测试证据（全部 `go test ./...` 全绿，同时我加语料后差分 harness 立刻出现差异）：① 把 responsesInput 收尾 flush 的 path 从 `"input"` 改成 `"input[0]"` → strictfuzz 17 行不同；② 把 `maxTokens` 的错误文本改成 `"explicit token limit required"` → 语料 1 行不同；③ 让 `tools: []` 不再输出 `"tools":[]` → 2 行不同；④ 去掉 `chatToolRun` 相邻性里的 `next["role"] != "tool"` 判定 → 语料 2 行 + strictfuzz 5 行不同；⑤ 让 user 侧也拒绝"仅空白文本" → 1 行不同。这五处正是"只搬代码/不改错误文本"必须守住的地方 | 加一组断言 path+reason 的用例：`Prepare("openai.responses", …input 末尾是 assistant…)` 触发 flush 错误并断言 path 为 `input`；`max_tokens` 缺失/为 0 时断言完整错误串；`"tools":[]` 断言 wire 含 `"tools":[]`；`[tool, user]` 断言不被并入同一 user turn；`role:user` 的影子文本块断言仍被保留 | 低 | 否（只加测试） |

---

## 逐项核对结论（无问题的部分，供后续轮次参考）

为免下轮重复劳动，把"看起来可疑但已逐句核对等价"的清单记在这里。

**codec（全部经 4567 行差分 + 变异测试佐证）**

- `buildChatMessagesFromItems` → `chatItemBuilder`：解码顺序、`null`/空串跳过、`dispatch → 普通 message 兜底` 的先后、`appendMessageItem` 里 `role=="assistant"` 取 `reasoningForAssistant()` 再清空的次序、`invalidFunctionCallIDs` / `invalidEmptyFunctionCallCount` 的递减、`delete(mediaByCallID, callID)` 都一致；`appendUserText`（纯字符串 item 与 `input_text`/`text` 共用）与 `appendUserContent`（`input_image`）都走 `endTurn`，与原分支的"双清"一致。
- `strict/stream.go` 的 8 个 handler：`failed/done` 守卫、`defer` 里置 `s.failed`、`handleMessageStop` 的"先 `p.response` 再 `s.done=true`"、`[DONE]` 与 refusal 收尾顺序全部保留（M8 变异证明"先 done 后 response"在当前测试下不可观测，说明现有测试确实没钉这条顺序 —— 但代码写法是对的）。
- `strict/responsesInput` + `conversation.addRole/flushRole`：`flushRole` 先清空累积器再 `c.add`，与旧闭包的"先 `c.add` 后清空但错误时同样丢弃"在可观测层面等价（出错即整体返回）；所有 path 仍是 `pos("input", i)`，`flush("input")` 的路径参数也一样。
- `strict/messages.go` `tools`/`toolChoice`/`applyParallelToolCalls` 拆分：字段白名单、`maxKey` 选择、`keys()` 调用位置、`len(choice)>0 && len(names)==0` 的末尾检查全部保持。
- `strict/messages.go` `chatMessages` → `chatRefusal`/`chatSystemMessage`/`chatToolRun`/`chatMessageBlocks`：refusal 折叠仍在 `role=="system"` 判定**之前**（顺序敏感，因为 refusal 会改 `m["content"]`）；`chatToolRun` 的 `i = next` + 循环自增与原 `i++` 等价；相邻 tool 分组只看 `a[i+1]`，未放宽。
- `strict/plan.go` `controls` 拆分：调用顺序 = 旧代码的书写顺序；错误文本（`explicit positive token limit required; no implicit conversion default`、`conflicts with max_completion_tokens`）逐字保留（M10 变异验证现有测试**未**断言该文本，属 R-C2 同类薄弱，但代码本身正确）。
- `strict/response.go` `convertResponseBlocks`/`projectToChat`/`refusalChatOverride` + `streamItemID`：`tool_use` 无调用的检查仍在逐块转换之后、`provider_details` 仍取原始 `m`、refusal 的 Chat 覆盖发生在 `projectToChat` 之后。
- `responses_to_anthropic_request.go`：`merge → pairing → merge` 三段未动；`default` 分支的 `item.Content == nil` 守卫保留；user 只判空、assistant 额外判纯空白（M15 变异未改变输出，因为 `convertResponsesUserToAnthropicContent` 对空白文本不产生"仅空白块"，但**语义分配本身是对的**）。
- `chatcompletions_to_responses.go` `parseAssistantContent` / `writeThinkingTag`：`thinking` 优先、`text` 兜底、非 thinking 部分直接拼接、解析失败返回空串全部一致。
- `responses_client_tools.go` `restoreOutputItem(event, call, done)`：`added` 阶段 `custom` 的 `Input=""`、`tool_search` 的 `Arguments="{}"`；`done` 阶段取缓冲参数、空则回落 `"{}"`；`Name`/`Namespace` 清零与 `clientItemID` 覆盖顺序一致。
- `responses_tool_search_discoveries.go` `admitToolDiscoveries`：外层 `json.Marshal` 预检、`promoted` 顺序、`namespace` 的子工具 `tools`/`children` 改写都保持。
- `pairing.go` `indexLastBy`：后写覆盖语义正确（M11 变异被 `TestResponsesToolOutputMedia_DuplicateCallIDIsLastWins` 抓住）。

**gateway**

- `run()` 拆分：`parseCLI`（argv 切片等价）→ `dispatchConfigCommand`（socket 只在为空时读配置、token 兜底顺序）→ `newShell`（pool 环境变量覆盖 → store → trusted keys → release mgr → publisher client → `EnsureSchema` 仅 init/serve）→ `newServeSet`/`build`（harden → supervisor → management token → TLS/CA → redis → ownNode → slog 默认 logger → peer manager 注册/`Maintain`/`Run`/`Unregister` cleanup → buildRuntime → listen）与旧代码顺序逐段一致；错误文本顺序（`invalid trusted public key` 早于 `invalid cluster CA`）未变。
- 关停顺序：`serve()` 内 `SetRoute(maintenance)` → `supervisor.Terminate` → public/private/local 三个 `Shutdown`，随后 `newServeSet` 的 deferred `close()` 按注册逆序跑（listener.Close → peer Unregister → redis.Close → supervisor.Close → db.Close），与旧 `defer` LIFO 完全一致。
- `Recover`：`activePlan` 取首个 running/paused（原 `break` 等价）；`recoverActivePlan` 的四条分支与三处 `stop` reason（`legacy-plan-recovery` / `migration-barrier` / `active-plan-recovery`）逐一对应；`startIssued && member` 的"准备好但不自动 admit"提前返回保留。
- `checkPeer` → `identityRevoked` + `stopRevokedIdentity`：PG 权威判定的注释与"Redis 短暂注册失败不 drain"的意图都搬过去了；`bounded` 的 30s 预算创建位置从 `Maintenance` 之后改到之前（`Maintenance` 本身不受预算约束，与旧代码相同）；早返回打平后 `RowsAffected()==1` 失败时不再上报，与旧代码"嵌套 if 不满足就不做后两步"等价。
- `Coordinate` → `completePlan`/`settleExistingStep`/`insertNextStep`：`FOR UPDATE` 仍在主函数；`recordBlockedReason` 前的 `tx.Rollback` 在 `completePlan` 与 followersStopped 分支都保留；`pgx.ErrNoRows` 从"判断 state 是否为 done"变成 `settleExistingStep` 的 `exists` 布尔，调用点 `exists || err != nil` 与旧 `err == nil` 分支等价；`insertNextStep` 的 disabled 节点暂停逻辑未变。
- `store.go` `withTx`/`appendBlockers`/`firstBlocker`：`RegisterLocked`、`createLocked`、`rollbackLocked`（含 `superseded` 提前返回时**提交**事务这一细节）、`SetPrimary`、`RemoveNode` 五处替换等价；`ErrConflict` 从闭包返回后仍在函数外转成 `(Plan{}, err)`。
- `checkUpdate`/`cacheValid`/`describeLatest`/`revalidateUpdateSource`：TTL 规则（`force || cached.Reason != "" → 30s`）、`fetch` 失败与 `verifiedRelease` 失败的 Reason 覆盖顺序、I/O 后"仓库/版本 revision/基线"三重校验顺序全部保持。
- `release/manager.go`：`validateDeclarations` 的 4 个安全条件（`validPath`/digest/`16GiB`/mode 位）与 64GiB 累计上限逐字保留；`pruneDir` 对 releases 用 `RemoveAll`、manifests/blobs 用 `Remove`、`ValidDigest` 名字过滤、`ctx.Err()` 逐项检查、缺目录不算错——三段行为一致。
- 删除 `Engine.LocalReady`：唯一使用者是 `proxy.Config.LocalReady` 这个**字段**（`main.go` 的闭包直接调 `rt.Status`），`localReady` 字段与 `Heartbeat` 里的 `Store` 也同步删净，未留悬空。

**runtime-contract / mock-upstream**

- `locklease.renewOnce`：`WithDeadline(until)` 包裹 `Extend`、`lctx.Err()` 优先于 `err == nil`、`left/2` 的休眠点、退避 `min(max(left/4,50ms),left)`、双重 `Until` 余量检查全部逐行对应（变异验证见 R-C3）。
- `mock-upstream`：`messages` 改走 `begin(formatAnthropic)` 后响应字节与事件顺序不变（`TestAnthropicUnchanged` + `main_test.go` SSE 断言通过）；`stream()` 的 7 个事件与 `sseWriter.send` 等价（全部带 event 名，不触发 data-only 分支）；`resolve` 四层优先级 body < key < rule < header 与 `rule.Remaining--`/删除时机不变（锁仍在 `applyRule` 外层持有）；`gemini` 的 `candidate` 构造、`alt=sse` 与非 sse 两条输出路径、`usageMetadata` 累积语义不变；`responsesTextPart`/`responsesMessageItem`/`responsesEnvelope` 三处共用后 SSE 与 WS 输出的 map 键集合一致。

---

## 建议的处理顺序

1. R-C1（删 `pendingReasoning`/`endThinkingSpan`）+ R-C2（补 assistant `ReasoningContent` 矩阵测试）——一起做，先加测试再删代码。
2. R-C15（strict 错误 path/reason 与 wire 断言）+ R-C3（两条 `locklease` 安全用例）——独立提交，纯测试。
3. R-C4（`Fresh`/`ServingLocal` 表驱动测试）——独立提交，纯测试；边界归一化本身不必回滚。
4. R-C5 / R-C9（gateway 死字段、`peerManagerDeps`、`listen` 参数、`run` 的 err 丢弃）——`cmd/sub2api-gateway` 一个提交。
5. R-C6（剩余 4 处 `withTx` 收敛）——一个提交，逐处 `git diff -w` 核对。
6. R-C7 / R-C10 / R-C11 / R-C12（codec 复用代价与抽象微调）——可合并为一个 codec 提交，改后重跑差分 harness。
7. R-C8 / R-C14（mock 收尾）——一个提交。
8. R-C13 记录在案，本轮不动。

---

## 处理结果

处理时间：2026-10-24。范围：`next/protocol-codec`、`next/gateway`、`next/runtime-contract`、`next/deploy/mock-upstream`（未提交）。
差分 harness（`D:\tmp\diffcheck\harness2`）的 "new" 侧每次都从工作树重建（改名 + import 重写，删测试文件），最后一次结果仍为 **IDENTICAL（4567 行输出全同）**。

### 逐项结果

| id | 结论 | 做了什么 |
|---|---|---|
| R-C1 | **已修（采纳 (a)）** | 先补测试（R-C2）再删代码：删掉 `chatItemBuilder.pendingReasoning`、`reasoningForAssistant()`、`endThinkingSpan()` 及 10 处 `endThinkingSpan()` 调用（另 4 处 `reasoningForAssistant()` 改为直接读 `lastTurnReasoning`）；`endTurn()` 只清 `lastTurnReasoning`，`appendReasoningItem` 直接写 `lastTurnReasoning`。`appendAssistantToolCall` 的形参由 `pendingReasoning` 改名 `reasoning`（它早就不是 pending 语义）。三处注释（`chatcompletions_anthropic_bridge.go`、`chatcompletions_anthropic_reasoning_passback_test.go`）里指向已删符号的文字同步改掉。净删约 40 行，差分与全部单元测试零差异 |
| R-C2 | **已修（补测试）** | 新增 `chatcompletions_responses_turn_boundary_test.go`：表驱动 9 例，逐条断言每个 assistant 消息的 `ReasoningContent`。覆盖审查列出的 ①～⑤（user 后清空、func_call→output→user、unknown type、空 agent_message、developer message），另加"仅空白 user 文本"、"纯字符串 user 项"、"agent_message 带正文"、"tool output 不清轮次"。**变异验证**：M2（user 分支换 endThinkingSpan）、M3（unknown 分支换 endTurn）、M4（空 agent_message 换 endTurn）、以及"tool output 换 endTurn"四个变异逐个跑，全部 FAIL |
| R-C3 | **已修（补测试，其中一条审查建议经核实不可观测）** | `locklease/lock_test.go` 加两例：`TestKeepLockLosesLockWhenValidityExpiresDuringExtendErrors`（Extend 挂到 `until` 之后仍失败，断言 `Cause == ErrLockLost`）与 `TestKeepLockContextEndsDuringBackoffIsQuiet`（Extend 持续报错，在退避中 cancel parent，断言 `Cause == context.Canceled` 且 `stop()` 立即返回）。**变异验证**：`if left <= 0 { return false, false }` → 第一例 FAIL（被抓住）。审查建议的第二条变异（`if !wait(...) { return false, true }`）实测**不可观测**：`lctx` 只可能被 parent 或 `stop()` 的 `cancel(context.Canceled)` 先取消，`context.WithCancelCause` 保留首个 cause，之后 goroutine 再 `cancel(ErrLockLost)` 是无操作（本地用同版本 Go 单独验证过），所以这条只能把"安静退出"的对外契约（cause 为 Canceled、`stop` 立即返回）钉住，无法区分实现里的 true/false 字面量 —— 已在测试注释里写明 |
| R-C4 | **已修（补测试，边界不改）** | 新增 `gateway/internal/control/freshness_test.go`：`TestNodeFreshnessBoundary` 断言零值、`now`、`now-20s+1ns`（新鲜）、恰好 `now-20s`（陈旧）、`now-20s-1ns`、未来时间；`TestNodeServingLocalConditions` 断言 `Enabled:false+Ready+local+新鲜 ⇒ ServingLocal==true`，以及未 ready / 非 local / 陈旧 / 零 LastSeen 四种 false。按建议保持单一阈值，不加 `FreshInclusive` |
| R-C5 | **已修** | 删 `serveSet.redisClient`、`serveSet.peerManager`；删 `peerManagerDeps`，`newPeerManager(redisClient *redis.Client)` 直接收参；`listen()` 去掉未使用的 `ctx` 参数（`build` 里同步改）。`go build`/`vet`/`staticcheck` 全净 |
| R-C6 | **已修（4 处）** | `Store.Action`、`Store.ConfirmStoppedCore`、`Store.importGitHub`（补 `pgx` import）、`Engine.Work` 的落库段都改成 `withTx`。`Engine.Work` 的语义细节需保留：`RowsAffected()==0` 的"late result"分支必须返回 `Execute` 的错误而不是 nil，因此用 `execErr` + `late` 布尔在闭包外还原旧行为；`finished.RowsAffected()==0` 时提前提交、跳过 progress/Heartbeat/Notify 的顺序也保持。其余两处 `Begin`（`Coordinate` 的 `FOR UPDATE` 主循环、`Admit` 的提交段）**故意保留**：前者需要 `tx` 跨多个 helper 使用并在失败时手动 `Rollback` 再 `recordBlockedReason`，套 `withTx` 会把"先回滚再记账"的顺序打乱；后者是提交后立刻用 `rev` 调 `Runtime.Admit`，形状不同。带 `TEST_DATABASE_URL` 跑 `internal/control` 全绿（19s，0 skip） |
| R-C7 | **已修** | `pairing.go` 拆出 `indexLastInto(dst, items, key)`，`indexLastBy` 变成它的薄封装；`normalizeAnthropicToolPairing` 改为逐条消息把 block 喂进同一个 map，不再把所有 user block 摊平成一个大切片。分配从 O(全部 user block) 降到 O(一个 map) |
| R-C8 | **已修** | `countTokens` 改用 `s.begin(w, r, body, req.Model, false, req.Metadata, formatAnthropic)`，去掉手写的 record/resolve/sleep/499/status 共 16 行，保留 `setStatus(id, 200)` 与估算。新增 `TestCountTokensReusesBegin` 钉住记录字段（path/model/metadata user id/stream=false/status）与注入错误形状 |
| R-C9 | **已修** | `run()` 改成 `done, err := dispatchConfigCommand(opts); if err != nil || done { return err }`。当前 `dispatchConfigCommand` 的非命中路径仍返回 `(false, nil)`，行为不变，形状不再吞错 |
| R-C10 | **已修** | `conversation` 的 `role`/`blocks` 字段与 `addRole`/`flushRole` 移到新类型 `roleRun`（`c.newRoleRun()`），`chatMessages` 路径不再看到这两个零值字段。`responses_input.go` 的 `inputItem`/`inputMessageItem`/`inputFunctionCallItem`/`inputFunctionCallOutputItem`/`inputReasoningItem` 改收 `*roleRun` |
| R-C11 | **已修** | 合并成 `convertRoleItemToAnthropic(messages, item, anthropicItemRole)`，内部同时决定白名单与是否拒收纯空白；用未导出的 `anthropicItemRole{name, rejectBlankText}` 常量 `userItemRole` / `assistantItemRole` 取代三处 `("user", false)` / `("assistant", true)` 字面量。`appendIfNotEmptyAnthropic` 删除。新增 `responses_to_anthropic_blank_text_test.go`（空白 user 保留 / 空白 assistant 丢弃 / 仅未知分片的 user 合并到下一轮），**变异验证**：把 user 调用点改成 `rejectBlankText=true` → FAIL |
| R-C12 | **已修** | 拆成 `freshPrimary(ctx, primary) (Node, bool)` 与 `redirectToPrimary(ctx, primary Node) bool`。`recoverActivePlan` 第一处改成"有新鲜 primary 且 Redirect 成功才算 forwarded"；第二处改成"有新鲜 primary 就 Redirect（尽力而为）并 stop"，与旧 `attempted` 语义逐字对应，不再有取一半的孪生布尔 |
| R-C13 | **按建议不动** | 记录在案 |
| R-C14 | **已修** | 抽出 `geminiJSON(model, b, respID)`，与 `geminiStreamJSON` 对称；非流式分支只剩一行调用 |
| R-C15 | **已修（补测试）** | 新增 `strict/error_contract_test.go`：`TestStrictFlushAtEndOfInputReportsBareInputPath`（末尾 flush 的 path 恰为 `input`）、`TestStrictMissingTokenLimitErrorContract`（缺/0 时 `max_tokens` 与 `max_output_tokens` 的完整 reason 串，以及 `max_tokens` vs `max_completion_tokens` 冲突）、`TestStrictEmptyToolsListStaysOnWire`（`"tools":[]`）、`TestStrictToolRunAdjacency`（`[tool, tool, user]` 不被并成一轮）、`TestStrictChatEmptyMessagePath`。**变异验证**：flush path 改 `input[0]`、maxTokens 文案改 `"explicit token limit required"`、`tools:[]` 不再输出、`chatToolRun` 去掉 `role != "tool"` 判定，四个变异逐个跑，全部 FAIL |

> R-C15 中"user 侧也拒绝仅空白文本"这一条落在 codec 的 `appendIfNotEmptyAnthropic`（不是 `strict`），已在 R-C11 的 `responses_to_anthropic_blank_text_test.go` 里钉住并做过变异验证。审查原文把它列在 strict 测试网里，此处补正。

### 验证（每模块一次）

| 模块 | go build | GOOS=linux go vet | gofmt -l | staticcheck | go test -count=1 ./... |
|---|---|---|---|---|---|
| protocol-codec | OK | OK | 空 | 0 告警 | 全绿 |
| gateway | OK | OK | 空 | 0 告警 | 全绿（`internal/control` 用临时 PG 跑，0 skip） |
| runtime-contract | OK | OK | 空 | 0 告警 | 全绿 |
| deploy/mock-upstream | OK | OK | 空 | 0 告警 | 全绿 |

差分 harness：`corpus` 257 / `fuzz` 1600 / `extra` 7 / `strictfuzz` 1500 / `streamfuzz` 1203，**全部 0 差异，IDENTICAL**。

### 新增测试文件

- `next/protocol-codec/chatcompletions_responses_turn_boundary_test.go`
- `next/protocol-codec/responses_to_anthropic_blank_text_test.go`
- `next/protocol-codec/strict/error_contract_test.go`
- `next/gateway/internal/control/freshness_test.go`
- `next/deploy/mock-upstream/main_test.go`（追加 `TestCountTokensReusesBegin`）
- `next/runtime-contract/locklease/lock_test.go`（追加两例）
