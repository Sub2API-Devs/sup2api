# 第九批 Diagnostics 独立复核

日期：2026-10-08。复核者 research_cc，原作者 audit_code_beta。未提交、未部署。

## 已复现并修正

1. 诊断响应 Ready/issuer 校验失败时未读用量，JSON/SSE 原始 11/7 被记录为 0/0；SSE 登记失败只读 message_start，使实际输出 7 丢为 0。新增失败专用有界读取，按原响应计量并保留插件 usage capture，不向客户端输出未经登记的内容。复用已有资源响应事件解析及同一 32 MiB 上限；正常路径不预先累计，避免随后信用/资源缓冲重复计量。超过限额或连接中断不能凭空补计未收到事实。
2. JSON/SSE 仅依赖 type/id，使 role=user 的假消息也进入归属表。现要求真实 message 结构（assistant、非空字符串 ID/model、content 数组、usage 对象）才登记；SSE 首事件身份之前不外发。错误 envelope 不发明消息登记。
3. core 响应 principal/generation 多值只取第一个，Worker diagnostics 授权同样存在歧义。现两端拒绝多值；不改变实际 issuer 核验或信任边界。
4. Store 对同 owner/binding 的过期 ID 返回成功却不延长 retention，导致“登记成功、立即查不到”。现在明确返回已过期错误，保持不能复活；核心也防御持久接口返回过期记录。

## 归属与组合核对

- 所有者是 user+group，因此同用户同组平台 API key 轮换可继续；跨 user/group 拒绝，账号候选仍经原组权限。既有 ID 固定 account/principal/generation，换 issuer 不发送旧授权。未知 ID 在 CCGateway 不放行，非 CCGateway 保留原提供商直通行为，内部授权头由核心清除再生成。
- JSON/SSE 的诊断+信用、诊断+资源输出模式以及三者组合均覆盖：正常 refusal 仍 200；诊断存储失败外部 503，不发行未登记信用 token；原 11/7 用量仅计一次。核心先持久诊断 ID、再进入原资源/信用缓冲，不将任何登记失败当作自动重试理由。
- 冷 Worker 测试通过核心可信 ID hash/实际 issuer 授权继续，无需旧 Worker 内存归属索引；未移除 Worker 直连的原本地归属限制。
- Store 的过期清理是 owner 写入时清理，当前没有全表周期清扫。本轮未扩展为后台清理任务。

## 验证

- 新 8 个 JSON/SSE 红灯先复现缺陷，修复后通过。新增 stateful 组合 12 用例及平台 key 轮换/跨组/跨用户/过期负例。
- 核心 `go test ./internal/gateway -run '^TestReviewDiagnostics|^TestDiagnostics|^TestFallbackCreditHTTPRegistry|^TestResourceOutputsHTTPRegistration' -count=1`：通过 3.030s。
- Worker `go test ./engine -run '^TestReviewDiagnostics|^TestRealCLIDiagnosticsTrustedColdWorker$' -count=1`：真实 CLI 2.1.292 隔离假上游通过 5.841s；新增四种重复 capability/issuer 头负例。
- core gateway/messagediagnostics 与 engine 的 go vet 通过。
- `TestDiagnosticsDBOwnershipRetentionAndConcurrentRecords` 已补过期 Record 不假成功断言，但本机 embedded PostgreSQL 无法启动：测试数据目录缺少 global/pg_control。该 DB 测试未通过，须 Linux 候选提交验证，不以非 DB 测试代替。没有改动本机数据库环境。
