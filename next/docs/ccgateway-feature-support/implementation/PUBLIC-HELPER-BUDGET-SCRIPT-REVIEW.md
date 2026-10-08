# 公开预算验收脚本独审

2026-10-08，audit_code_beta；本次真实请求为 0。

public_helper_budget.py 最多顺序执行 4 次，无错误重试：JSON 工具交回、JSON 工具结果续聊、不携预算的普通 SSE 续聊、从原工具调用回退到另一结果。仅合成 prompt/marker，Key 仅 SUP2API_API_KEY 环境变量；复用 Probe 标准公开鉴权/beta，没有私有控制 header、不改变账号配置。公开报告只保留状态、类型、usage、摘要，不保存正文或 Key。

独审窄修：tool ID 必须非空字符串再计算 hash；任务结果必须完整 text 等于目标 marker，不能只命中子串；共用 streamed_message 的 signature_delta 按官方语义替换签名，不能拼接旧签名。

纯合成验证通过：成功严格 4 次；首失败/首 refusal 仅 1 次；第二轮 refusal/错误 marker 仅 2 次；非字符串 tool ID 不崩溃也不继续；第三请求确无 task_budget、使用 SSE；第四回到原工具调用并替换 synthetic 结果。签名 start+delta 得到最后完整签名，缺 message_stop 拒绝。

另用真正 Probe 类搭配内存 HTTP 响应（未联网）验证 200/refusal：protocol_passed=true、outcome=normal_provider_refusal，任务 passed=false，严格 1 次。报告不包含测试 Key 或回复正文。

internal_rounds_verified/durable_receipts_verified 保持 false，不以公开工具往返自行证明内部搜索、持久链或单次计费；这些必须由 Worker 日志与 DB receipt 独立关联。没有主动冷重启，也不宣称真实提供商预算执行或缓存节省。
