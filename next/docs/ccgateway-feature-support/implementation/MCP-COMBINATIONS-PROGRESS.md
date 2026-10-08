# MCP 组合兼容：第八批设计与验证

## 官方证据与当前限制

官方 [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector) 支持 deferred toolsets 与 [Tool Search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)。[会话内工具变更](https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages) 明确两种 server-scoped 引用，以及 inline-tools-2026-09-15 + mcp-client-2026-09-15 下按值添加 mcp_toolset；连接 URL 与授权 token 始终只在顶层 mcp_servers，不属于 inline block。

当前整体拒绝 inline MCP 的理由“需要秘密时间线”过宽：实际需要分开服务器身份/凭据与工具可见性。当前公开 SDK 的 tool_reference 只有 tool_name，没有 server_name；官方未说明 Tool Search 返回 MCP 名称的跨服务器编码，不能凭 CLI 常见 mcp__ 前缀猜测。

已使用项目绑定 CodeGraph 确认 mapSearchReferences；已知文件通过原生工具精读。

## 实施路径

1. 顶层 mcp_servers 维持既有 URL 校验、按服务器名与准确 URL 分离凭据。允许其 toolset 在顶层或 inline 定义，不把 inline 定义提前移动到顶层；顶层工具目录顺序与缓存断点保留。
2. 独立 MCP 可见性时间线解释 mcp_tool_reference / mcp_toolset_reference / mcp_toolset definition，逐位置验证历史调用、撤销和重新添加；普通 client/server 工具时间线只处理其自身身份。MCP 身份始终是 server_name + tool name。
3. 复用现有 inline carrier，仅作为本地 CLI 运输载体；归属主请求内还原原角色/块/位置并严格核对完整历史。凭据仅主请求恢复，绝不写入 CLI 配置、消息或日志。
4. pending MCP 调用不能跨修改相关服务器/工具可见性；完整旧历史可按已有账本导入，但新调用必须符合当前 server/config/可见性。compaction.tool_changes 保留原签名块，按与普通时间线一致的基准重算。
5. ToolSearch+MCP 先支持引用确切已知客户端工具的组合；跨服务器 MCP reference 只有在取得真实编码证据后开放，不以猜测映射伪装支持。safeguards+MCP 必须另证客户端审查上下文对应提供商执行身份，不能因本地禁止执行就取消提供商审查。

## 验证计划

新会话添加/撤销/重加、同名不同服务器、disabled/deferred 配置、pending 禁止变更、历史回放/回退/冷导入、JSON/SSE、cache 原位置、秘密不落盘、服务器/token精确目的地，以及未知 reference fail-closed。所有 CLI 探针使用隔离假上游；真实提供商执行资格另列，不与结构保真混淆。

## 当前状态

设计确认，开始独立 helper 与主链窄接线；尚未宣称组合已完成或上线。

## 第八批实现与证据（2026-10-08）

- 新 `mcp_timeline.go` 分离服务器凭据与工具可见性。支持按值添加 MCP toolset、指定服务器的单工具/整套撤销与重加、配置 enabled/defer_loading、固定工具列表、compaction 净变更相对基准重算。历史逐位置校验，pending 调用不能跨相关变更。相同工具名属于不同服务器时不会相互撤销。
- `mcp_connector.go` 允许声明由 inline toolset 引用的顶层服务器；inline 块仍不得含 URL/token。顶层 tools 的缺失、null、空数组区别保留，不把新 toolset 前移到提示词前缀；沿用原载体还原与完整历史比对。
- 非 defer MCP + deferred client API ToolSearch 已开放，搜索引用仍只经过已声明 client/server 工具的准确映射。未知 MCP 风格字符串不被前缀规则放行；实际可能 defer 的 MCP 定义继续明确拒绝。与客户端 MCP transport 同名的服务器拒绝，避免命名空间碰撞。
- 纯 MCP + 显式 safeguards 已开放：凭据和工具身份恢复均在已归属主请求内，原 opaque classifier context 不改。客户端工具改名、inline+显式 safeguards、其它服务端工具/内部轮次仍保留具体限制。假审查结果仅用于验证响应字段保真，不构成真实提供商审查能力证明。

### 测试

- `TestMCPInlineAvailabilityIsServerScoped`、`TestMCPInlineBeforeDeclarationAndPendingDenied`：单工具/服务器边界、禁用、声明前调用、pending 变更、显式重新提供、私有凭据不进入计划。
- `TestMCPClientSearchRejectsAmbiguousReferences`：已知客户端名称双向映射；未知 MCP 名、不明引用、deferred MCP、transport namespace 碰撞明确拒绝。
- `TestMCPSafeguardsKeepIdentityRestrictions`：改名工具、inline context、MCP namespace 冲突拒绝。
- `TestRealCLIInlineMCPPositionAndHistory`：6 次新会话/续聊/冷导入/回退/SSE/撤销，原 block cache_control 位置及凭据目的地精确保留，PASS 5.533s。
- `TestRealCLIInlineMCPAbsentTopCatalog`：纯 inline MCP、顶层 tools 缺失保持，1 次，PASS 2.050s。
- `TestRealCLIMCPClientSearchAndInline`：5 次新/续/cold/rollback/SSE，准确客户端搜索引用与 MCP 并存，PASS 6.857s。
- `TestRealCLIMCPSafeguardsPreserveProviderContext`：2 次 JSON/SSE 最终 tools/mcp_servers/safeguards 相等与响应观察字段保真，PASS 2.726s。
- 全 engine 单测 PASS 4.827s，go vet ./engine PASS。上述 14 次新调用均是 Worker HTTP→真实 CLI→隔离假提供商；没有连接请求中的 MCP URL，没有访问真实第三方服务，没有发布或替换生产容器。

当前冻结供独立复核；剩余 deferred-MCP 搜索编码及真实提供商组合资格需单独证据。
