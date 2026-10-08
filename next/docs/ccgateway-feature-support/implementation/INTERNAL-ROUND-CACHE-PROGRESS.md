# 内部 CLI 回合缓存（第九批）

状态：实施中；未提交、未部署。API ToolSearch 和 API output_config.format 已有直接协议路径，本批只处理 CLI 内部 ToolSearch 及旧 synthetic StructuredOutput。

## 设计与准入

- 每请求独立账本，只由已归属主请求的完整 SSE 响应登记内部 assistant；记录准确内容、工具 ID、名称、输入及停止原因，不因名字相同就认定内部工具。客户端自己的 ToolSearch、混合外部调用不得混入。
- 客户端历史仍精确匹配全部角色和块；只在末尾允许已登记 assistant 及与其调用 ID 一一对应的 CLI 结果。新增结果的首份内容归档，后续回合不得改变，未知追加文本/调用/缺失结果拒绝。辅助分类请求不参与账本。
- 客户端工具和内部 helper 分开匹配，客户端顺序/schema/元字段/断点按原请求控制；新增 helper 不继承断点，不擅自将 deferred 工具提升为 eager。无法恢复完整客户端缓存工具前缀时明确拒绝。
- 每轮移除 CLI 自加缓存标记，再仅恢复客户端原块断点。原顶层 automatic cache_control 如存在则仍为顶层字段：按提供商规则覆盖当次实际主请求最后可缓存块，包括已追加内部回合；不偷改成固定客户端尾块。
- 信用+内部回合、forced tool_choice 和任务预算的现有门禁保持，除非另有完整等价证据。新规则不扩大引用恢复或普通历史匹配器的容错。

官方依据：[Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) 定义 tools→system→messages 全前缀与逐请求 automatic 末块行为。

## 验证要求

真实 CLI +隔离假上游逐轮检查 5m/1h、原工具与消息断点、自动顶层字段、JSON/SSE、续聊/回退/cold；验证客户端同名 ToolSearch、伪造/变更结果、混合外部调用和 schema 变化的拒绝。假上游通过不证明真实提供商计费或缓存命中。

## 当前实现与实证

- `internal_cache_rounds.go` 保留当前请求私有互斥账本，复用精确 UseNumber SSE 聚合器（每响应 32 MiB 上限、最多五个内部回合），校验完整原始 assistant 内容及唯一 message/tool ID。工具结果只能对应已观察调用；成功搜索结果只接受已声明客户端工具的 tool_reference。第一次由 CLI 产生的结果和整体 user 块序列登记后，后续重放必须相同。
- 真实 CLI 2.1.292 的额外目录包含 `DeferredToolPlaceholder`、`ToolSearch` 和 role=system 延迟目录；工具加载结果之后附字面 `Tool loaded.`。只接受结果已齐全之后的该限定结尾，不能夹带未知用户文字。现有 system 附件规则保持；新逻辑不把它们变为客户端缓存块。
- 客户端目录按原顺序恢复；只允许请求中明确延迟的无断点工具在发现前缺席，不提升为 eager。工具断点要求 `defer_loading:false`，避免第一轮缺失定义时把断点移到别处。helper 定义在同一请求内固定，不继承客户端断点。
- 每个实际主请求再次校验有效断点数和 TTL 顺序。automatic 初始可能与原尾块共享断点，追加内部回合后会占用独立断点；若变成第五个，明确失败，不删除或挪动原断点。
- 这类请求的本地 native checkpoint 暂不直接复用：此前内部回合没有跨请求证据账本，续聊按客户端完整历史重建。该限制不代表提供商 prompt cache 未命中；本批不宣称真实缓存计费命中。普通无内部回合缓存不受影响。
- 当前公共 API 的 output_config.format 已直接走 APIOutputFormat，继续支持原路径；旧内存合成 StructuredOutput 的追加格式化提示缺少已验证语义，继续明确拒绝其缓存组合。forced any/tool、任务预算和所有信用内部回合限制保持。

验证：新增真实 CLI 矩阵 JSON/SSE × 显式/automatic × 新请求/续聊/回退/新缓存，每次两轮搜索后回答，共 48 次隔离主模型请求，首次完整通过 14.964s。每轮断言工具 1h、system 1h、用户 5m 原位，内部追加块无显式断点，automatic 根字段不变。单元负例覆盖未观察调用、输入/ID 变更、跨请求借用证据、未知搜索引用、混合外部调用、客户端拥有同名工具、结果篡改/缺失、额外文字、helper schema 变化、重复调用 ID、第五断点，以及既有信用/预算/强制工具限制。全 engine 单测通过（5.129s），go vet ./engine 通过。相关旧 CLI 组合（原生缓存、none 工具选择、外层 CC metadata、服务端工具缓存）与新矩阵合跑通过 38.729s。当前实现冻结供独立复核；未提交、未部署。
