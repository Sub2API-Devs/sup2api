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
- metadata（已纠正）：仅 user_id，可 null 或最多 512 字符。缺省不修改 CLI 默认 metadata；显式对象在已归属的主模型请求完整替换（包括 `{}`），JSON 形的 user_id 字符串也逐字保留。不改 HTTP 鉴权、账号头或 CLI 授权，不解析/混合两个 user_id。纠错依据和测试见下节。
- tool_choice：auto/none/any/tool；指定工具必须存在，最终按req.wireName映射，native工具名保持原样；disable_parallel_tool_use必须为bool且不能配none。显式thinking enabled/adaptive与forced选择冲突提前拒绝。
- forced tool_choice与内部ToolSearch/structured output组合先明确拒绝，理由是内部轮次尚无强制选择阶段适配。不是最终不可实现判定；后续需要计划阶段标识和发现完成后约束，不能靠隐藏改成auto完成。
- context_management/compaction/container/mcp_servers/diagnostics/inference_geo/fallbacks/fallback_credit_token及output_config.task_budget：缺少完整协议适配时，即使unknown_field=ignore也明确拒绝。复杂特性的逐项实施仍按方案进行；不能把明确语义请求当未知扩展静默删除。

thinking缺省/fast允许策略、CLI参数环境映射本批保持现有行为；beta名单等待单一contracts模块整合，未自行增加无证据beta。

## 验证

新增测试覆盖生成参数精确保留、副本隔离、metadata身份保护与失败原子性、非法字段与ignore策略、forced工具名称映射/并行控制、thinking冲突、内部轮次冲突、JSON整数精度。

既有RequestPolicyFields把旧的未知字段示例temperature改为fixture_unknown，以保留原来的未知字段回归意图。

本轮命令：`go test ./engine -run 'Test(GenerationPlan|ForcedToolChoice|RequestPolicy|RunnerRequestPolicy|StructuredOutputAndCache|FixedBeta)' -count=1`，通过（1.431s）。该结果是单测，未替代真实CLI隔离wire、真实账号、生产部署证据。

下一步：主任务接入relay主请求归属与能力registry后跑完整集成；forced+内部轮次限制需在能力展示中保留；新增生成参数需要确认JSON/SSE、stop_reason、usage及历史续聊不被CLI后处理丢失。原 metadata conflict 判定已在下述复核中撤销。

## 2026-10-08 上线前 metadata 规则纠错

初版与此前审查把 CLI 的 JSON 形 `metadata.user_id` 当作“必须保护、不能替换”的账号身份，写了不同值即拒绝的规则。这是未经官方协议证据支持的推断；它会拒绝通常自带另一份 user_id 的真实 Claude Code 客户端，因此撤销，不能沿用“单测通过”把它交付上线。

官方 [MetadataParam](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/metadata_param.py) 将 user_id 定义为外部用户的 opaque 标识，可用于滥用检测；它不是 API Key、Bearer 或 OAuth 文件。[Claude Code gateway compatibility guide](https://code.claude.com/docs/en/llm-gateway-protocol) 未给出必须让代理的内层 user_id 覆盖客户端归因的要求。不能从该文档未规定推导 OAuth 上游一定接受所有值；真实账号仍单独验证。

修正内容：

- 显式 metadata 对象由原 RequestPlan JSON 副本直接进入主请求，不进行 account_uuid/session_id 拆解、重编码或拼接虚构字段。
- `{}`、`user_id:null` 与“未传 metadata”区分；前两者按客户端对象发送，缺省保留内层默认。
- `FeatureDecisions` 为该字段明确记录 `explicit_client_object_replaces_cli_metadata`，没有无记录丢弃客户端值；决策记录不写用户标识明文。
- 主请求归属之外的 classifier/auxiliary/count 不覆盖。Bearer、API Key、账号头、CLI 本地授权完全是独立路径，本修改没有触碰。
- 旧“不同 user_id 必须报冲突”的测试改为验证显式归因替换；保留此历史纠错记录，不宣称初版策略一直正确。

`metadata_attribution_test.go` 覆盖空对象、null、512 个 Unicode 字符、带空格 JSON 形 user_id 的逐字保留，缺省保留 CLI、辅助/count 隔离与内层 Authorization 不变。相关单测通过。

`metadata_cli_compat_test.go` 直接让真实本地 CLI 请求 Worker HTTP 入口，再由内层 CLI 访问隔离假上游；没有从外层 body 删除其它字段来掩盖错误。首次测试遇到新 F-CACHE 的 system 块边界恢复 502：外层三块与内层三块分别完全相同，缓存恢复却仅尝试拼成一块匹配；已交缓存 owner 修复。这是另外一个上线前发现，不能把该失败计为 metadata 整体通过。最终重跑结果另行追加。

真实账号验收矩阵：#21 API Key 与 #22 OAuth 分别测试真实 CC 默认 user_id、普通 opaque user_id、显式 null/空对象、缺省；JSON/SSE 与续聊检查状态、usage、账号头独立、客户端 metadata 与实际上游 wire 一致。未进行这些账号调用之前，只能声明隔离协议验证。

### metadata 最终隔离整合结果

缓存 owner 修复了“已逐块一致仍强制单块匹配”和“内层 CC 在 user 前加合法附件导致整条相等失败”后，真实 nested CLI 测试已通过：CLI 2.1.292 → Worker 正式 HTTP handler → 内层 CLI → 隔离假上游，两种内层合成凭据模式（API Key / OAuth）均成功。

- 外层未手工构造 metadata，也没有剥去真实请求中的 system/cache/messages 等字段。CLI 生成 user_id 为 150 字节 JSON 形字符串，键为 account_uuid/device_id/session_id；具体值只在隔离测试内存使用，记录不包含标识原文。
- 外层使用 tools 空集、临时 HOME/config、禁用实验 beta、MAX_THINKING_TOKENS=0 来隔离此兼容性验证；这不代表启用所有 CLI 特性的请求都已适配。
- 最终上游 metadata 与真实外层 CLI 对象精确一致，X-Api-Key 或 OAuth Bearer 仍为内层 fixture 凭据，内层会话 header 保留。两层不会因为不同 user_id 被误拒。
- 每种模式另测空对象、null user_id、512 Unicode 字符、带空白的 JSON 形 opaque 字符串及缺省（保留内层值）；使用正常 Worker HTTP 请求，metadata 改变时续聊仍 prefix-hit。
- 这证明本地协议和客户端兼容，不证明真实 Anthropic OAuth 上游接受所有归因形态；#21/#22 仍按上方矩阵独立验收。
