# API 格式与全 eager forced tools：独立复核

2026-10-08。候选代码；未部署、未调用真实提供商。

业务 diff 仅将 `forcedLoadedClientCatalog` 的 `JSONSchema != nil` 排除条件改为 `structuredOutput()`。后者精确定义为 JSONSchema 存在且不是 APIOutputFormat，因此允许原生 output_config.format，同时继续排除旧 synthetic helper 格式。其余显式 defer_loading:false、普通工具目录、无 inline/server/typed/MCP/safeguards 的限制不变。

读取并核对 RequestPlan、runner config 和目录过滤路径：原 API format 计划继续透传；没有改成 auto 或移除格式。maxTurns=1，Mod、stdio权限和响应目录仍禁止内部 ToolSearch helper 执行；完整客户端目录保留，非声明工具仍拒绝。

新增 `forced_api_format_review_test.go`：any/tool 两种选择，格式 schema 中 `9007199254740993` 精确保留、显式 disable_parallel_tool_use:false 不被覆盖、改变任一工具为 deferred 或隐式 defer 后不能获得该限定资格。

首次独立单测直接给 Apply 空 tools 目录，正确触发“forced loaded client tool missing”；修正为真实出站应有的完整目录后通过。这是测试夹具问题，没有改业务绕过校验。

独立执行：

- 新增边界及作者资格单测：PASS 1.243s。
- 旧 `TestForcedLoadedAdmissionAndExecutionBoundary`：PASS 0.309s；legacy synthetic、helper执行及目录边界仍有效。
- 单独复跑 `TestRealCLIForcedAPIFormat*`：真实 CLI 2.1.292、隔离假上游，26 次请求，PASS 31.462s。覆盖 JSON/SSE、any/tool、首轮/工具结果续聊/分支/冷启动、完整 schema/缓存/choice，以及 end_turn/refusal/max_tokens、恶意 helper 和 provider400。各外部请求最多一次主模型调用。
- `go vet ./engine` 通过。

结论：未发现阻断问题，可交根代理集成。provider400 保持原错误，不自动去格式、改 auto 或重试。真实提供商是否接受具体模型+格式+forced组合尚待受控验收，不能把隔离26请求称为真实资格证明。
