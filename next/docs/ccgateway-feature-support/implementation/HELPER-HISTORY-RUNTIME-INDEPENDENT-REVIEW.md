# Helper history B 运行时独立复核

2026-10-08，审查者 audit_code_beta，作者 research_cc。当前结论：部分计量独立通过；运行时 system 边界仍有一项红灯，未开放 general task_budget，也未声明整链验收完成。没有真实模型调用、部署或提交。

## 已核路径

审查 helper_history_runtime/transport/accounting、主请求原始观察钩子与整轮隐藏确认。载体要求内部鉴权、请求摘要、模型/CLI/策略 namespace 和实际 issuer authority；并发 attempt 互斥。公开输出有界缓冲后携带 delta；原始提供商 source observer 位于 initial-thinking/MCP 转码之前。

纯 codec 阶段的整轮隐藏 text/thinking/signature 及未知消息 envelope 控制校验沿用此前独立测试。完整被隐藏轮次包含非 tool_use 块不等于与公开内容重叠，必须由 runner 实际丢弃点确认；不能仅凭已观察 SSE 推断隐藏。

## 实际红灯

TestReviewHelperRuntimeDoesNotDropUnrecordedSystemBetweenRounds：原捕获过滤 assistant/user 之间非空 system，持久 payload 不含该消息，冷恢复改变上下文。作者已窄拒绝，独立回归转绿。

TestReviewHelperRuntimeDoesNotMoveLeadingSystemAcrossHiddenRound：public user 后、hidden assistant 前的非空 system 同样被过滤；恢复的 hidden pair 插在 public user 后，跨过该 system 改变位置。独立运行 1.342s 仍 RED。已交作者核对真实 CLI 前导块；只有经过证明的严格空壳可作为无语义例外，不能将未知非空 system 或带 output_config/clear_at 的消息视为空壳。未以删除红例或放宽公开历史对齐解决。

## 部分计量独立证据

TestHelperHistoryFailedNextWireKeepsConsumedUsage、TestHelperHistoryIncompleteSecondCallKeepsSeparateFacts 与 TestRealCLIHelperHistoryPartialUsage 独立运行 PASS 3.308s。真实本机 CLI 对隔离假上游 JSON/SSE 共 4 次调用：前一 helper 轮真实 20/8 完成，第二轮真实 input 17 后 EOF，保持原 502 与两个 provider call，整体 Complete=false；未重复调用，未把缺失 output 估成零。

已完整的公开聚合优先，不能再叠加原始调用；大整数事实保留原 JSON 数值。尚未复核 C 核心结算接线，本测试不证明 outbox/结算已闭环；A Lookup 与 C 消费者另由 CC 独立执行数据库复核。

## 提交边界

initial-thinking 桥及其独立测试已分别通过，可按 INITIAL-THINKING-STREAM-BRIDGE / INITIAL-THINKING-INDEPENDENT-REVIEW 单独冻结。outbound_relay 同时有 B 请求恢复钩子，不能用整个文件提交方式将仍红的 B 当作桥修复。B 运行时文件与上述两项独立测试须待边界修复及矩阵增量复跑后再更新本结论。

## System 边界整改增量

作者证实真实 CLI 前导不是空壳，而是 ToolSearch 目录提示及缓存标记。因此扩展尚未发布的 v1，保存已归属初次主请求在公开边界上的 system 来源，再将后续完整实际 system + hidden A/U 按原位写入段；冷恢复仅对同边界完全相同的系统序列去重。真实观察到的单文本块折叠为字符串单独窄验真，持久保存实际后续对象，不复制旧缓存标记。

原两个 system 红例现已转绿。独立新增 TestReviewHelperReplaySystemRequiresExactBoundaryObject 验证冷恢复完全同对象去重、异对象拒绝；TestReviewHelperSystemMatchingDoesNotPartiallySuppress 验证数量/中途不匹配不能先删除一部分，公开 system 不能被私有段吞掉。独立 review 目标 PASS 1.335s，vet 通过。

整改后独立真实 CLI carrier 12 次及 partial 4 次隔离调用合跑 PASS 13.485s（非真实云端）。之后作者新增全有/全无匹配 helper 的窄改已独立读源码并经上述负例覆盖，其完整矩阵另由作者复跑。保留未定位现象：作者一次组合测试观察 partial 共 3 calls 而预期 2；后续独立本轮通过、作者 count5 共 20 calls 也通过，不能据重跑将原现象删除。最终提交需 root 结合作者调查结论决定，不将这一过程称真实提供商预算能力已验证。

后续该偶发现象已定位为未终态 SSE EOF 到 runner 检查之间的 CLI 重试窗口，由审查者另成为作者窄修同步门禁，详见 HELPER-SSE-EOF-GATE.md。B 原 system/恢复/部分计量独立审查无新增阻断；新的 EOF 实现不可由本报告自审称绿，交 root 独审。EOF 目标加 4 次 CLI PASS 3.432s，全 engine 4.255s、vet 通过（作者验证）。

## 可信预算载体限定准入独审

新增 parsePolicyRequestWithHelper 仅由 main 读取私有 context 后调用；普通 parsePolicyRequestWithResources 恒传 nil，count 路径不接该状态。serveHelperHistory 在 Worker 鉴权、载体单值/摘要/namespace、实际 issuer authority 全部成功后才设置 authenticated。预算门禁只允许这个状态，synthetic structured 等原门禁仍在；native 映射和其他准入后仍必须执行 admitHelperHistory 的完整历史/组合校验，未直接派发。

独立 helper_history_budget_review_test 覆盖裸伪造 header 不能授权 parser、真实 Gateway 无 Worker key 为 401、有 key 但普通请求体伪装载体为 400、未 authenticated 的内部结构拒绝、可信状态也不能省官方 beta。定向 PASS 1.142s。普通载体 12 次、partial 4 次与同步 EOF/伪造负例联合独立 PASS 12.638s。

独立执行 TestRealCLIHelperHistoryTaskBudget PASS 10.369s、vet 通过，12 次隔离假上游调用覆盖 JSON/SSE 的新请求、工具结果续聊、普通续聊、冷恢复和回退；每轮 total=20000、remaining=11000 原值，不按 usage 猜扣。与普通 carrier 分别执行，避免把未携预算的测试误报为预算验收。本阶段 B 独审通过；A/C 真正公开 API 跨节点持久化闭环仍需核心整合验收，不能只凭 Worker 私有载体测试宣称线上已支持。
