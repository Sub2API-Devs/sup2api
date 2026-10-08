# 模型预填与服务端暂停续接的区别

2026-10-08，主代理再次核对官方资料。本文补充 FINAL-FEATURE-CLOSURE 的 Sonnet 边界，不改写既有失败或隔离测试记录。

[Opus 5.5 迁移指南](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide)明确：Opus 4.6 及以后的 Opus 不接受最后一条 assistant 的文字预填。官方[输出一致性指南](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency)对 Claude 4.6 及以后模型给出相同限制，包含 Sonnet 4.6。不能为使这类请求“成功”而把它改成 user、删除安全附件或偷偷追加提示。

[停止原因文档](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons)另外明确支持 `pause_turn`：将提供商返回的 assistant 内容完整回传，让服务端工具继续执行。这不是普通文字预填，不能因为上面的模型限制一并拒绝。

当前 Worker 的 Opus 假上游测试证明了 assistant 尾部传输结构可恢复，不证明真实模型接受任意文字预填。Sonnet 的 CLI 若在临时触发 user 消息中追加安全附件，当前严格检查会拒绝；这仍可能影响合法服务端暂停续接，需要寻找保持安全上下文的等价 CLI 接口，不能简单绕过检查。

真实 API 验收必须分三类记录：普通文字预填的模型原生拒绝；服务端暂停续接；普通 assistant 历史后追加 user 的正常续聊。后两者不能借第一类的限制省略测试。
