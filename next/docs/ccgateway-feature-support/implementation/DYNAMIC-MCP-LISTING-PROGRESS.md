# Dynamic MCP listing 实施进度

2026-10-09。单 dynamic deferred MCP 窄切片业务、说明和作者测试冻结，未提交、未部署、未升 catalog/plugin 版本，由 root 统一整合。设计与官方合同见 [PLAN](DYNAMIC-MCP-LISTING-PLAN.md)；独立复核见 [REVIEW](DYNAMIC-MCP-LISTING-INDEPENDENT-REVIEW.md)。

## 实际验证

所有本机测试设置 `SUB2API_TESTPG=off`，未连接坏本机 PG；纯测试清空 CCG_REAL_CLI。目录为 `next/plugins/ccgateway/companions`。

1. 新正例 `TestDynamicMCPListingCurrentAndHistoricalDiscovery` 在旧业务 RED 1.217s：`deferred MCP search requires a complete pinned tool listing`。保留正例业务预期后，实现转绿，动态与原 pinned/MCP 定向 1.511s。
2. `go test ./engine -run TestRealCLIDynamicMCPListingHistory -count=1 -timeout 180s`，CCG_REAL_CLI 指向本机 2.1.292，PASS 8.554s。JSON/SSE 各 fresh、continuation、cold、rollback，共精确 8 次主调用，无额外重试。使用隔离 HOME/USERPROFILE/CLAUDE_CONFIG_DIR、dummy key、loopback 假提供商，禁非必要流量与自动更新；无生产授权或模型调用。
3. 完整 engine PASS 4.519s，`go vet ./engine` 通过；features 测试 PASS 1.111s。
4. CC 独立纯测试 PASS 1.430s；其 dynamic+既有 pinned+独立真实 CLI 组合 PASS 14.385s，vet 通过。独立文件归 CC，未修改其断言。
5. 最后将 configureDynamicListing 历史内层扫描抽为纯谓词，保持原 guard 语义。`go test ./engine -run 'TestDynamicMCP|Test.*Dynamic.*Listing|TestPinnedMCP|TestReviewPinned' -count=1` PASS 1.381s，`go vet ./engine` exit 0。此次只提取函数，未重复昂贵 CLI。

真实 CLI 用实际首次公开输出构造后续完整历史；continuation/cold 不补新 listing/search，按历史发现继续调用。rollback 使用发现前的请求，必须重新发现。断言包含出站 tools 声明 digest 不变、全部历史 block 保真、SSE 重组内容、凭据不泄漏及各格式精确四次调用。它证明 CLI 与网关生命周期，不能替代提供商动态 MCP 资格。

## 冻结范围与未完成范围

新文件：`engine/mcp_dynamic_listing.go`、`engine/mcp_dynamic_listing_test.go`、`engine/mcp_dynamic_listing_cli_test.go` 和本 PLAN/PROGRESS。集成修改限 connector、search identity、timeline、server history、client tools、response 中的对应 resolver 接线，以及 features 两处说明。CC 独立 test/doc 由其维护。本代理不修改并行 forced mixed、估计字段、部署文件或生产状态。

首批明确拒绝多动态/混合 MCP、inline、compaction、fallback、safeguards 和冲突重复目录。官方历史复用已确认且实现，不再列为待证；真实提供商资格、发布和线上动态 MCP 验收尚未执行。冻结不表示总体兼容目标完成。
