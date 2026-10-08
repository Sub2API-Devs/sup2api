# Thinking 进度字段：Worker 只读复核

## 真实响应安全事实

Worker `.78` 日志 `a3033c97-7e35-44af-a2cb-cc9691dff7bc` 的公共SSE共13事件、1个message_stop、0个error。两个thinking_delta的thinking均为空字符串，estimated_tokens依次50和null；随后原opaque signature_delta，再text块及完整end_turn。最终实际usage为input2/output66、1h creation1585、cache read883、thinking_tokens46。进度50不是计费46，不能互相替代或相加。未输出签名、正文或身份。

## 路径结论

- Worker Accumulator 的thinking_delta仅拼接thinking字符串；不把estimated_tokens写入最终block或usage。原事件map保持，由buffer/emit向公共SSE透传。JSON/持久消息没有该瞬时进度字段，符合其不是最终内容的语义。
- initial_thinking_stream只转换非空thinking start；非start事件原字节返回，不吞estimated_tokens。
- `internal_cache_rounds.go` 在原始message_stop调用共享`credits.MessageFromEvents`。旧共享实现拒第三字段，隐藏thinking轮会污染严格ledger。因此共享修复不仅要求核心重编译，还要求同步新Worker；仅Core修复不足。
- 严格OpenAI转换 `protocol-codec/strict/stream.go` 也用封闭delta字段校验，当前会拒estimated_tokens，已交根代理安排独立修复。legacy typed AnthropicDelta没有该字段，只取thinking内容，不将进度作为usage；这不是进度跨协议保真证明。
- 没有发现Worker billing从estimated_tokens取数。计量继续只读实际usage；不以进度代替input/output/output_tokens_details。

## 独立验证

新增 `engine/thinking_estimate_review_test.go`，不修改Worker业务或共享API作者文件。目标1.203s通过：带大整数进度的完整hidden ToolSearch source ledger保持、原事件不mutate、opaque signature不变；null/0/大整数进度不进入最终message/usage；CLI bridge非start事件字节保持。

上述通过使用API代理候选共享修复，不代表旧线上版本已支持。未发新真实模型或身份请求，未改运行态；Core真实ABC与strict转换由各自owner验证。

## 最终隐藏轮真实CLI补充

检查Core ABC的ThinkingEstimates选项只在公开普通续聊响应注入；其首个隐藏响应未注入，因此另补独占 `TestRealCLIReviewHiddenThinkingEstimates`。CLI2.1.292隔离假上游的JSON/SSE各两次调用：隐藏ToolSearch轮带空thinking、estimated_tokens50→null及原opaque签名；下一主轮完整引用该隐藏历史，瞬时进度不进入消息/持久delta，签名保留。公开累计input40/output16精确，不把50当实际用量。该目标与原独立unit合跑 **7.178s**、vet通过。与CorePG矩阵互补，没有重复线上调用；等待根代理精确候选SHA后才构建Worker.79。
