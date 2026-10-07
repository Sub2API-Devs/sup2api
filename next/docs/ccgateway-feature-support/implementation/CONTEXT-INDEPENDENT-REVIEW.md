# Context / Compaction / Continuation 独立复核

日期：2026-10-08。复核 research_cc 新增实现；通用 API terminal / response-only 基础设施部分此前由本复核者编写，因此只称为该基础上的回归验证，不将自己的实现标作独立审查。

依据：[Context editing](https://platform.claude.com/docs/en/build-with-claude/context-editing)、[Compaction on demand](https://platform.claude.com/docs/en/build-with-claude/compaction-on-demand)、[Compaction overview](https://platform.claude.com/docs/en/build-with-claude/compaction)。已核对 beta 区分、signed block 首位和原样回传、context 与 on-demand 互斥、threshold 与 signed 协议分开，以及 generation task_budget.remaining 组合限制。后者已通知 task-budget owner；不得本地修改签名解决上游兼容错误。

发现并修复一处误判：`verifyCompactionHistory` 原来仅凭首块存在 signature 就要求它是 signed compaction 首块，可能把合法的 thinking signature + 后续 threshold compaction 当成 signed compaction。条件现先检查 type==compaction，独立回归覆盖。

新增独立验证：

- 40 轮 compaction 长历史精确对齐；summary/signature 被改或者首位插入 system 均拒绝；缺 beta 拒绝。
- Response-only 快照重启后仅重建，不做原生 resume，compaction block 恰好导入一次，signature 不变。
- continuation 的传输触发消息前多出安全附件时拒绝，并确保失败路径不修改输入。没有把 Sonnet 的内部安全附件移动到 top-system，也没有删除它。计数模式单独发客户端原始 body，不涉及生成历史改写。
- 独立重跑 `TestRealCLIContextCompactionGateway` 与 `TestRealCLIAssistantTailContinuation`，真实 CLI 2.1.292 接隔离假上游，PASS 21.132s。覆盖 JSON/SSE、signed/threshold/空结果/nullable no-op、assistant/user 签名块回放。合成签名只证明字节保留，不证明官方密码学校验或真实账号支持。

JSONL 等待优化：原 500ms 窗口每 10ms 可重新读取整个大历史，现先比较路径/长度/修改时间；文件未变时不重复解析，partial write 后增长或修改时间变化仍重试。新增 missing/partial/idle/完成写入/同长度更新时间测试。最终子进程退出后的 captureNative 和完整性校验仍保留。

仍未覆盖的能力不是完成项：非空 tool_changes 回放明确拒绝，等待 inline-tool history adapter；真实 provider 对 compaction 签名与 thinking 前缀绑定的接受性尚未实测。安全附件导致 assistant-tail 不能保真的模型组合仍明确失败，不以搬移附件换取通过。
