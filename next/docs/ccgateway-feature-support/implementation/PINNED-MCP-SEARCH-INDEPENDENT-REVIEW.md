# Pinned MCP + API ToolSearch 独立复核

2026-10-08；候选代码，未部署，未新增真实提供商调用。

复核范围：`mcp_search_identity.go`、`mcp_search.go`、`mcp_timeline.go`，以及 client_tools/inline_timeline/server_history 的相关窄改动。未修改作者实现。

结论：本轮未发现阻断该限定候选的实现问题。前提是完整 pinned 目录；真实提供商的搜索引用编码仍需另行验证，不由本次假上游矩阵推导。

## 身份及状态

- 独立核对 [官方 TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/src/resources/beta/messages/messages.ts)：BetaToolChangeToolReference 的注释说明 MCP 模型名为 `{server}_{name}`；搜索引用本身只有 tool_name。此注释不是公开 MCP 搜索响应实测。
- 实现由明确的 server/tool pair 枚举完整键；没有 split 或以 `mcp__` 前缀推断身份。不同 pair 的拼接碰撞、普通/typed/server 目录冲突均拒绝。
- 存在 deferred 工具时要求其他 MCP 目录也 pinned，避免混合动态目录隐藏碰撞；限制是有意限定，不伪称动态目录已支持。
- 历史按出现位置处理，后面的 discovery 不得授权前面的 MCP 调用；整组撤销后不可调用。冷请求重新计算，不复用上一次请求的可用集合。
- 新响应发现只进入该响应的 ledger，不修改 Request/MCP timeline。搜索结果包含禁用项时，整批发现失败，不部分加载先前合法项。
- 搜索索引仅持有 server/tool 名称，不复制 URL/token；凭据仍按已有 MCP secret plan 绑定原服务器。该改动没有另建日志或输出凭据路径。

## 独立测试

新增 `mcp_pinned_search_review_test.go`：response ledger 隔离、不能跨服务器、包含禁用项的批次失败无部分发现、未来 discovery 不能回填历史调用、整组撤销、回退至新请求后发现状态消失。

最初撤销测试把 system change 放在不合法的位置，现有输入校验先行拒绝。修正为 user → system 的合法末尾变更后，才测试撤销后的调用拒绝；这是独立测试夹具修正，不是实现缺陷。

- 作者边界测试加独立新增测试：PASS 1.399s。
- 独立复跑 `TestRealCLIPinnedMCPDeferredSearch`：真实 CLI 2.1.292，隔离假上游，JSON/SSE × new/continuation/cold/rollback，共 8 次主请求，PASS 6.98s。包含更新后的返回引用断言；完整 pinned 目录、凭据绑定、搜索历史、无额外重试验证均通过。
- `go vet ./engine` 通过。

没有重跑真实 provider。日志秘密保护延用已有 guard；本次未把源代码审查冒充新增全量日志泄漏实验。真实匿名 MCP 验收若返回其他引用编码，应保留拒绝并记录原始结构证据，不增加猜测映射。
