# 已完成客户端工具历史：独立复核

2026-10-08，候选实现；未部署、未新增真实提供商调用。

## 两项独审整改

1. 原实现只要当前存在 ServerTools/MCP 或历史搜索结果，就拒绝所有未声明但已完成的客户端调用。独立 Web/MCP 两例先红：`tool_use` 且 caller 缺省/direct、完整结果配对已由 validateConversation 验证，旁边的 provider 目录不会令历史身份变成 server tool。作者移除全局拒绝，保留未知搜索引用和 programmatic caller 的专门校验。新响应执行目录未增加任何退休工具。
2. 根代理发现历史 `tool_use.cache_control` 在 wireMessage 中先被剥离，原始指纹因此匹配失败，退休工具被错误加 MCP 前缀。独立测试复现 `retired_fixture` 被改名。作者改为两端使用既有 withoutProtocolCache 的相同规范化；仅剥协议缓存元字段，保留 name/input/caller/toolset/ID 等语义。独立否例确保 opaque input 内的 cache_control 不被忽略。

新增 `completed_client_history_review_test.go`，保留上述红转绿证据；目标测试最终 PASS 1.558s。没有由审查者直接改作者业务。

## 接线检查

- compileCompletedClientHistory 位于 validateConversation 成功之后，不能用重复、错配或结果提前的历史建立身份。
- map 仅保存完成调用块的传输身份，不添加 Tools、SDK tools、响应可执行目录或搜索目录；新未知 tool_use 仍拒绝。
- constant config tag 隔离旧重命名快照，但不随每次新历史 ID 改变，避免把正常续聊全部变成 rebuild；具体历史仍由消息指纹限定。
- toolset/caller 仍完整参与指纹；caller=direct 偷带 server parent 的非法形态仍拒绝。programmatic caller 不使用此豁免。
- 原 inline 时间线使用其既有位置合同，本次不跳过 inline 的定义/撤销检查。

## 验证进度

独立复跑作者原 `TestRealCLICompleted*`：17 次真实 CLI 2.1.292 隔离假上游请求，PASS 15.090s，包含普通退休工具/typed旧名、JSON/SSE、新/续/prefix-hit/cold/rollback，以及恶意新调用不得获权。

作者整改冻结后，独立执行 `TestRealCLICompletedHistoryMixedCatalog`（Web/MCP 各1次）与 `TestRealCLICompletedClientHistory/bash/false`（新/续/冷/回退4次）共6次真实 CLI 隔离请求，PASS 5.212s。后者已加入历史工具块 1h 缓存断点的精确位置/TTL、原name/大整数与 prefix-hit 断言。两项整改最终通过；这组是修复后的出站证据，不借旧17次通过代替。

最终结论：本次限定实现独审绿色，可进入根代理整合；新增工具结果、当前执行权限、未知搜索引用和 programmatic 身份均未由旧历史旁路。未宣称真实提供商已接受所有组合。
