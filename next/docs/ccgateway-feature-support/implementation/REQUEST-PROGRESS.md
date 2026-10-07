# 请求侧实施记录

日期：2026-10-08。本记录只描述当前工作区实现和验证，不代表部署完成。负责范围为 Worker request/request_policy、新增 feature_plan 及测试；relay接入和能力注册表由主任务整合。

## 已实施接口

- `Request.Plan *RequestPlan`：私有字段保存原始body副本及验证后的JSON值；外部取值均返回副本，保留json.Number避免整数经float64损失精度。
- `Request.HasMainRequestFeatures()`：供relay判断是否必须适配主模型请求。
- `Request.ApplyMainRequestFeatures(message Object) error`：最终主请求覆盖生成参数；验证后整体提交patch，失败不部分改动message。
- `Plan.RawRequest()`、`MainRequestFields()`、`FeatureDecisions()`：诊断使用；decisions只列路径/动作/阶段，不重复输出用户数据。

调用条件：relay必须先识别这是客户端主模型请求；不能对分类器、token count或其它内部请求应用。接收和验证字段不是支持完成，必须接入该函数并验证实际wire。

## 参数行为

- temperature/top_p：接受0..1数值；top_k接受非负整数；保留显式值，模型/账号的更严格限制仍由上游原样返回，不能静默删除采样以使请求成功。
- stop_sequences：字符串数组，保留空数组与各字符串；只在真实生成请求中发送，不做客户端截断。
- service_tier：auto/standard_only；不与speed或CC fastMode混淆。
- metadata：仅user_id，null或最多256字符；合并保留CLI其它metadata键。**若CC已有不同的user_id，明确返回冲突，不覆盖其账号/会话归因，不悄悄仅存日志当作上游已采用。** 用户body仍受账号调试日志开关管理；目前没有公开API第二槽位可在不改变原字段语义下同时传两个user_id，此部分是条件能力。
- tool_choice：auto/none/any/tool；指定工具必须存在，最终按req.wireName映射，native工具名保持原样；disable_parallel_tool_use必须为bool且不能配none。显式thinking enabled/adaptive与forced选择冲突提前拒绝。
- forced tool_choice与内部ToolSearch/structured output组合先明确拒绝，理由是内部轮次尚无强制选择阶段适配。不是最终不可实现判定；后续需要计划阶段标识和发现完成后约束，不能靠隐藏改成auto完成。
- context_management/compaction/container/mcp_servers/diagnostics/inference_geo/fallbacks/fallback_credit_token及output_config.task_budget：缺少完整协议适配时，即使unknown_field=ignore也明确拒绝。复杂特性的逐项实施仍按方案进行；不能把明确语义请求当未知扩展静默删除。

thinking缺省/fast允许策略、CLI参数环境映射本批保持现有行为；beta名单等待单一contracts模块整合，未自行增加无证据beta。

## 验证

新增测试覆盖生成参数精确保留、副本隔离、metadata身份保护与失败原子性、非法字段与ignore策略、forced工具名称映射/并行控制、thinking冲突、内部轮次冲突、JSON整数精度。

既有RequestPolicyFields把旧的未知字段示例temperature改为fixture_unknown，以保留原来的未知字段回归意图。

本轮命令：`go test ./engine -run 'Test(GenerationPlan|ForcedToolChoice|RequestPolicy|RunnerRequestPolicy|StructuredOutputAndCache|FixedBeta)' -count=1`，通过（1.431s）。该结果是单测，未替代真实CLI隔离wire、真实账号、生产部署证据。

下一步：主任务接入relay主请求归属与能力registry后跑完整集成；metadata conflict、forced+内部轮次限制必须在能力展示中保留；新增生成参数需要确认JSON/SSE、stop_reason、usage及历史续聊不被CLI后处理丢失。
