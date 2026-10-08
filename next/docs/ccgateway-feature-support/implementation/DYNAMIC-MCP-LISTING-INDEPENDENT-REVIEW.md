# Dynamic deferred MCP 独立复核

2026-10-09。仅审当前冻结候选，未修改作者业务文件，未操作线上或调用真实提供商。独立新增 `engine/mcp_dynamic_listing_review_test.go`。

复核范围为 dynamic listing helper、connector 准入、按位置 timeline、引用解析、response ledger 及普通客户端引用映射。单个动态服务器和 listing beta 是当前候选限定；不把这一结果扩大到多动态服务器、inline、compaction、fallback 或 safeguards 组合。

独立测试覆盖：

- listing/search 不能从未来 assistant 消息回流授权过去的引用或调用。
- 同一个 Request 的两个响应账本不共享新 listing 或已发现工具；Request 本身不被响应修改。
- 已完成发现后，`NoTools` 和未声明 server 仍拒绝新调用。
- 接受 listing 后修改调用者原始对象不影响目录；冲突第二份 listing 失败不改变既有索引。

作者现有 disabled、未知引用、批量失败、名字冲突和 rollback 测试一并阅读。现有 pinned 路径未被动态分支替换；新响应使用局部 timeline，完整历史则先按顺序编译证明，再用于 wire 名字映射。未发现需要阻断候选的新缺陷。

实际命令：

```text
go test . -run '^TestReviewDynamicMCP' -count=1
PASS 1.430s

CCG_REAL_CLI=<isolated CLI 2.1.292 executable>
go test . -run '^(TestRealCLIDynamicMCPListingHistory|TestRealCLIPinnedMCPDeferredSearch|TestReviewDynamicMCP.*|TestReviewPinnedSearch.*|TestPinnedMCPSearch.*)$' -count=1 -timeout=120s
PASS 14.385s
go vet ./...
PASS
```

真实 CLI 测试使用隔离配置和 loopback 假上游，覆盖 dynamic JSON/SSE 的新请求、续聊、cold、rollback 及现有 pinned 回归。它证明 CLI/网关的转换和生命周期，不是动态 MCP 的真实提供商资格或上线验收。官方合同来源沿用作者 PLAN，本复核没有新增联网协议证据。
