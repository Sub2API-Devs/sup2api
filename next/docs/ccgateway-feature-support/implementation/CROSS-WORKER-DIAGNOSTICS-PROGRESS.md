# 跨 Worker diagnostics 实施进度（第九批）

已落地：`contracts/diagnostics` 内部grant/ready/tracking合同、core.MessageDiagnostics、`messagediagnostics` SQL服务与0042；core准入/账号固定/identity预检/插件后参数一致性、响应发行前登记；Worker实际issuer验证并允许可信grant替代本地messageOwnership，standalone无grant保留旧行为。

持久状态仅SHA256 messageID、UserID+GroupID、账号/issuer/generation和平台24h默认归属保留期，默认4096条/owner可构造配置。Record并发锁、同ID冲突、幂等不延长、期限清理；这不承诺provider指纹保存24h。未知ID只排除共享CC路由，普通非CC Anthropic路径保留原协议；已知CC ID固定原账号/issuer，资源与credit绑定冲突拒绝。Worker换进程/换缓存目录时仍需保留可信issuer generation状态，而非把全新账号误认同一identity。

普通SSE只暂存首个message_start登记后立即恢复流，不累计整个回答；JSON按现有32MiB响应上限登记后重放。正常provider诊断notfound/unavailable仍200。旧Worker无Ready或issuer不符明确失败，不能把忽略grant当成功。响应身份/存储故障单独gateway_diagnostics_storage；已观察usage进入既有结算。客户端诊断内部头最终剥除再可信注入，绑定不会借关闭日志丢失。

本机验证：

- Core `go test ./internal/gateway ./internal/messagediagnostics ./internal/app -count=1`：PASS 7.360s/0.386s/4.114s；同包vet通过。PostgreSQL本机明确关闭，0042 DB不可称已验收。
- `TestDiagnosticsHTTPColdBindingJSONAndSSE`：JSON/SSE首次登记和后续grant、原账号固定、未知ID与issuer更换拒绝，provider previous_message_not_found保持200。
- `TestDiagnosticsHTTPOwnerStorageAndLegacyWorkerBoundaries`：跨owner模型前拒绝、存储失败、旧Worker缺Ready失败、非CC原样透传且无内部头。
- engine diagnostics/MessageOwnership目标单测PASS1.283s、vet通过。
- `TestRealCLIDiagnosticsTrustedColdWorker`：真实CLI2.1.292 + 隔离假提供商，首Worker JSON发行，关闭后第二个独立history/cache Worker使用保留issuer状态通过核心式可信grant续用该ID（SSE）；错误/缺grant在模型前拒绝，共2次模型请求，PASS5.946s。没有证明真实云指纹命中。
- 新 `TestDiagnosticsDBOwnershipRetentionAndConcurrentRecords` 覆盖8并发幂等、重新建service查找、跨owner/issuer冲突、期限不延长、容量与过期释放，待精确Git候选LinuxDB运行。

审查仍须补：独立agent审安全头/存储失败usage/取消、整合cacheagent并行修改后的最终候选回归。尚未提交或部署；此前747c168 Linux结果不涵盖0042。
