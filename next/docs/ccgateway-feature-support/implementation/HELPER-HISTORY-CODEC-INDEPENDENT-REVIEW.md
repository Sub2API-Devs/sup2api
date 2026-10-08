# 隐藏历史 B 纯 codec 阶段独立复核

2026-10-08。作者 research_cc，独立复核 audit_code_beta。范围仅 engine/helper_history.go、新测试与 internal_cache_rounds 的 roundIDs/hidden 证据字段；尚未接 runtime、核心 carrier 或持久恢复，不据此开放 general task_budget gate。未发真实提供商请求，未部署。

## 已发现并整改

1. capture 使用原 internalCacheRounds 比较 content，但忽略隐藏 message 顶层字段。独立两红例 assistant.output_config / user.clear_at 均被未观察地保存。作者将 capture/replay 共享 envelope 限定 role/content，避免为隐藏轮次注入未知语义；不影响普通公开 inline 参数支持。初次编译测试夹具错误使用不存在的ToolChoice，改为实际RequestPlan后复现两RED1.179s。
2. 原先把 thinking/text 都当 visible overlap 拒绝。根代理明确整个发现轮次没有外发，独立 whole hidden text + thinking/signature + ToolSearch 正例RED1.375s。作者支持整条已确认隐藏的 text/thinking/redacted_thinking/helper调用，保持原字节与顺序；真正混入客户端调用或未登记block仍拒。replay仅对tool_use检查调用ID，不能要求thinking带工具ID。
3. 作者补原provider message ID + runner实际隐藏确认，区别“看到了原SSE”与“该整轮未公开”。独审正例显式模拟该确认，负例验证单纯观察/错误message ID不足以capture。实际runtime调用点尚属下一阶段，不能用单测模拟宣称运行时已建立此证明。

## 独立回归

新增 helper_history_review_test.go，覆盖：

- 完整隐藏text/thinking/signature保真，公开user/final assistant原JSON不被修改。
- 未观察envelope controls拒绝。
- 错tool_result ID、额外结果、未知tool_reference、客户端同名ToolSearch、禁用搜索、forced全eager目录拒绝。
- 已观察但未确认隐藏、错误provider message ID拒绝。
- 确认后签名篡改、未知隐藏块、未适配server_tool_use拒绝。

并独立重跑作者数字/目录/anchor/顺序/重复调用ID/别名隔离等测试。`go test ./engine -run 'Test(HelperHistory|ReviewHelperHistory)' -count=1` PASS1.539s；`go vet ./engine` PASS。作者随后确认本纯codec阶段freeze。

## 结论和后续门禁

本纯codec阶段GREEN，无已知阻断。它复用既有主SSE/helper结果ledger，不把私有payload当公开执行注册；只在完整配对、目录与公开前缀锚点一致后返回克隆消息视图。

尚未验证：真正endSearchRound调用隐藏确认、跨HTTP导出/提交/恢复、cold/rollback、同prefix多隐藏分支、实际cache/attachment/typed目录组合、核心同issuer grant与错误/费用提交顺序。B runtime与C接通后必须真实CLI假上游完整矩阵另审；官方资格仍需另行小型真实验收。不得把本GREEN表述为通用预算隐藏历史功能完成。
