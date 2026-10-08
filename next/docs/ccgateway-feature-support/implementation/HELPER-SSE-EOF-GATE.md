# 未终态 SSE 结束的同步派发门禁

2026-10-08，作者 audit_code_beta，未提交部署，无真实模型调用。

B 部分计量矩阵曾一次出现 3 个提供商调用而预期 2，重复运行又通过，原现象保留在 HELPER-HISTORY-RUNTIME-INDEPENDENT-REVIEW。静态链路确认：HTTP200 SSE 在 message_stop 前结束，原 relay 尚未 stopped，CLI 可在 runner 检查失败前立即重试。不能用概率重跑绿替代同步门禁。

sseWatch 新增 requireStop，仅对已选择 helper custody 或 PassUpstreamErrors 请求启用。原始 reader EOF/读取错误且未观察到真实 message_stop 时，先锁住后续派发再把原数据及原结束交给 CLI；不伪造 stop、不改签名、usage 或错误，不将 stop_reason 当作完整终态。原 source observer 已采到的部分计量仍保留。完整 helper tool_use + message_stop 可继续下一辅助轮。普通请求未开启错误直返时保持原 CLI 重试策略。

TestSSEIncompleteTerminationClosesDispatchBeforeCLIReadsEOF 使用本地真实 HTTP 上游，读取首响应至 EOF 后立刻同步发第二请求，完全不给 runner 异步检查机会：custody、错误直返（有/无生成观察器）各只有一次上游调用；普通默认、完整辅助终态两次均可通过。原 SSE 字节及 EOF 不变。与 TestRealCLIHelperHistoryPartialUsage 的 JSON/SSE 共 4 次隔离 CLI 调用合跑 PASS 3.432s，vet 通过。初次测试夹具少设 ReverseProxy.Transport 造成 ordinary 分支 nil transport panic，修正测试后通过；非产品失败。

提交范围仅 outbound_relay.go 的 requireStop/EOF 门禁与两个启用点、新 sse_completion.go / sse_completion_test.go。同一 relay 文件另含已独审 initial-thinking 桥与 B history 接线，需按实际候选一起审阅，不能误称本文件全部由此窄修覆盖。待另一代理独立复核。
