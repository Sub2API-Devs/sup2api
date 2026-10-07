# F-THINKING / F-OUTPUT 实施进度

2026-10-08。延续 THINKING-OUTPUT-PLAN；此文件记录实际修改，设计文件中的“尚未实现”描述是当时阶段状态。

## 请求侧

- `thinking_output_plan.go` 在策略解析后生成完整 thinking/output_config 主请求计划；不会把 CLI 默认 adaptive/display updates 或 effort medium 当作 API 的省略值。当前插件策略只有 AllowEffort 开关、没有管理员默认 effort；显式允许的 effort 优先，禁用时明确拒绝，不能被 unknown ignore 静默丢弃。
- thinking 区分省略与 disabled；支持结构合法的 enabled/adaptive/between_tools 以及 omitted/summarized/updates；updates 与 block_binding 必须带各自 beta。between_tools 不接受额外字段及 xhigh/max effort。其余模型能力和账户限制保持上游原错，不虚构本地模型能力名单。
- [官方 manual budget 规则](https://platform.claude.com/docs/en/build-with-claude/extended-thinking#budget-rules-and-tuning) 的 interleaved 例外已实现：带对应 beta 时可有 budget_tokens >= max_tokens；无 beta 仍拒绝。真实 CLI 的 4096 budget / 2048 max 出站与签名续聊已验证，模型是否支持该组合仍由上游决定。
- beta registry 登记 updates、binding、旧 structured outputs。旧 output_format 没有旧 beta 时明确拒绝，API format 本身无需该 beta。
- `APIOutputFormat` 区分 HTTP API 约束与旧内部 Runner synthetic codec。HTTP format 永远不传 --json-schema、不注册 StructuredOutput、不触发格式重提示。旧库级手工 Request.JSONSchema 模式及其测试仍保留，不能误称已删除全部旧代码。

## 响应、重试与历史

- 已归属 API format 主请求使用 SSE 完成观察器，在最后 message_stop 交给 CLI **之前**禁止后续上游请求；内部 ToolSearch 轮次除外，客户端工具结果仍交给客户端。observer也认识pause_turn完成，但服务端pause_turn跨轮输入恢复仍不是本阶段完成项。
- Worker 完整终止后返回原 stop/usage/content，不等待 CLI 的 refusal 或 max_tokens 补偿循环。正常、拒绝、截断都是一次上游；不会合成 StructuredOutput 数据或伪造终止理由。
- [官方 structured outputs 的 enum/const 大小写例外](https://platform.claude.com/docs/en/build-with-claude/structured-outputs#invalid-outputs) 也可能正常end_turn。API路径本地JSON/schema校验仅作diagnostic，不把原始上游200改为502，不声明本地替上游成功完成约束。
- 正常 JSON 输出保留 native checkpoint；进程活着时仅读取观察，进程停止后才 capture/重写。匹配 response ID 还必须匹配完整内容与工具名映射，不能将只写了部分块的 JSONL 当完成历史。
- API format 对已有缓存会话采取 fork，防止提前结束污染原 checkpoint。无可靠 native 或 refusal 时写 ResponseOnly snapshot：同一 quota、24h expiry、原始响应 envelope 与客户端 hash关联；此记录不能拿来 native resume，下一完整客户端历史从原生旧前缀或重建恢复。没有伪造 native assistant、没有重放旧响应两次。

## 已执行验证

- `TestRealCLIThinkingAndAPIOutputSurface`：CLI 2.1.292 九组隔离探针，4.11s；明确记录 CLI 参数拒绝和原生重试行为。
- `TestRealCLIThinkingPlanPreservesExplicitAndAbsent`：HTTP→真实CLI→假上游，六种thinking配置逐项核对实际wire，保留空thinking签名；第二轮把客户端签名历史回传并核对wire仍有原signature，PASS 9.27s。签名是假值，仅证明字节保真，不证明上游密码学验签。
- `TestRealCLIAPIOutputIsConstrainedWithoutSyntheticTools`：end_turn/refusal/max_tokens × JSON/SSE六组，核对API format、无synthetic tool、一次云调用、usage/stop、checkpoint重启恢复；JSON组继续下一轮并验证旧assistant只出现一次，PASS 6.67s。
- 原六类response envelope字段在start/delta/stop、JSON/SSE、有无format的12个HTTP真实CLI组合 PASS 9.644s。
- 完整既有 `TestRealCLI` PASS 46.895s；旧格式夹具已改为真API text JSON及单请求断言，保留inline system/工具/续聊验证。
- 常规engine最新 PASS 4.538s；`go vet ./engine`通过。独立审查进行中。
- 最终独立审查修正：observer、runner内部轮次判断及权限callback复用Request-aware `internalHistoryAssistant`，客户端自有ToolSearch不得当作内部搜索。补实际捕获ToolSearch schema后真实CLI普通/APIformat外部handoff+tool_result续聊 PASS 3.14s，普通模式prefix-hit；大小写不符schema的上游200在JSON/SSE均保留 PASS 1.58s。最终常规engine PASS 4.427s、vet通过。以上是本阶段时点，其他agent后续修改需主线程重新集成验证。

## 明确边界

未提交、未部署。没有用真实账号证明 updates/binding/between_tools、约束解码效果或跨账户签名有效。system/tools/模型/账户/历史前缀变化可能导致上游绑定拒绝；网关不会删除、改写signature或偷偷drop thinking，drop_block只能由请求中的上游绑定策略执行。新能力不能由fake PASS直接标成线上可用。
