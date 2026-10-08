# 隐藏工具引用目录独立复核

日期：2026-10-08。候选尚未部署。没有额外公网模型调用。

## 真实故障

Worker .77 的公网首请求成功，工具结果续聊由真实 provider 返回 `Tool reference mcp__ccgateway__lookup_fixture not found in available tools`。隐藏历史、工具 ID 与 session_context 附件恢复正确，但新的 CLI 进程没有同步加载历史已发现的 deferred 工具。此前 ABC 假上游未验证工具引用是否有定义，因此其通过结果不能证明该条件。

## 独立前态复现

- 新增 `helper_history_catalog_abc_test.go`，假上游仅检查协议位置 `user.content[].tool_result.content[].tool_reference`，不扫描不透明 input；从 top tools 建立目录，并按公开 system 中 addition/removal 的真实位置更新。
- 七个单测证明缺定义拒绝、先添加后引用通过、未来添加不能授权过去引用、后续撤回不否定过去合法引用、撤回后引用拒绝、重加后引用通过、不透明 input 中同名字段不被扫描。`TestABCReferenceCatalogPosition` 最新 PASS 3.052s。
- 独立 clean worktree `artifacts/catalog-before-86c8` 固定 `86c8dfe2a7dc59f6f9aefe02980eabc502afc0d1`，编译旧 Worker；没有改动共享作者实现。
- `TestHelperHistoryABCCatalogRealDBCLI/false`：实际隔离 PostgreSQL、Core HTTP、旧 Worker、真实 CLI 2.1.292、假 OAuth/profile 与假 provider，FAIL 39.787s。工具结果续聊确实命中 provider 400：`Tool reference mcp__ccgateway__weather not found in available tools`。CLI 将该错误聚合为外层 502，不能把这次隔离的外层状态说成公网原始 400。
- 原真实 session_context、尾 TAB、冷导入/回退与用量断言没有删减；此红例在续轮中止，后续阶段未完成。
- 执行 session 80572 已终态，专用 SSH 隧道 45439 在 finally 关闭。未测试生产数据库、未变更生产配置。

## 待完成

等待 Worker 作者冻结目录恢复候选，使用相同严格假上游和账务断言复跑。此前未检查目录的绿色矩阵不充当本修复证据。

## 修复版 JSON 独立集成

作者冻结后，相同 `TestHelperHistoryABCCatalogRealDBCLI/false` 使用当前源码编译 Worker，PASS 131.127s（2026-10-08 15:53 UTC）。严格假上游拒绝条件未修改。5 次公开请求 / 6 次假 provider 调用，覆盖首轮、工具结果续聊、普通夹轮、新 Worker/cache 冷导入、回退；真实 session_context 后缀至少发生一次，尾 TAB 与原文保持，隐藏块与尾系统对象 hash 保持。强计量总 input 124 / output 131 / cache_creation_1h 1647 和唯一 usage/receipt、重复持久不重复计费断言均通过。

同一 shell session 50285 顺序运行 SSE 子组中；此刻不宣称 SSE 已通过。没有真实 provider 调用或生产部署。

## 修复版 SSE 独立集成终态

`TestHelperHistoryABCCatalogRealDBCLI/true` PASS 126.791s，同一严格假上游、真实 OAuth 形态 fixture、真实 Core/Worker/CLI 与隔离 PostgreSQL，5 次公开请求 / 6 次假 provider 调用。与 JSON 相同的目录、原文/TAB/可信后缀、隐藏历史、尾系统 hash、cold/rollback、124/131/1h1647 和唯一账务收据断言全部通过。session 50285 已终态，专用 SSH 隧道在 finally 关闭。

结论：本次目录恢复的独立隔离端到端门禁 GREEN，前态精确 .77 的 RED 保留。元字段/任意大整数/schema 冲突的独立 engine 测试属于其他审查文件，不把本 ABC 普通目录样本夸称涵盖全部工具元字段。真实 provider 修复后验收与部署仍未执行。
