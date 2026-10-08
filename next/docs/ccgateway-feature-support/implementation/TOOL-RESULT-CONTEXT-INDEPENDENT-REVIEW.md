# 工具结果 session_context 修复独立复核

2026-10-08，审查作者冻结后的 `tool_result_context.go`、Mod 控制端、relay/runner 接线及 `mod/hooks/register.js`。本审查没有改生产实现；新增 `tool_result_context_review_test.go`。

未发现阻断。session_context 记录独立于日志开关，通过现有 loopback 随机控制路径/令牌鉴权，ready 后接收，单条最多 64 KiB、最多 32 个不同文本；map 读写由同一 mutex 保护。Runner 在 CLI 启动前设置 relay 控制端，Mod 等待确认才返回附件，避免先发请求后登记的顺序问题。

只对已经归属于主请求的私有解析副本进行规范化，按 tool_use_id 找完整客户端字符串，且要求后面恰好是本请求已登记的完整 wrapper。没有按任意 `<system-reminder>` 字样删除内容。全量历史对齐、缓存/引用恢复后，按原 user ordinal、block ordinal、tool ID 恢复原 wire 字符串。定位或内容验证失败时不编码出站；批量规范化/恢复均先验证全部候选再修改。count 原始请求桥接、信用原 wire 重放仍走既有先行分支。

独立测试覆盖：客户端自身相同 reminder 保留、缺少/错误登记保持不动、非完整/重复后缀保持不动、metadata 不一致时无部分规范化、第二块恢复失败时第一块无部分修改、原位恢复幂等、错误鉴权拒绝、大小/条数限额、关闭日志仍记录。作者拆分后的版本再次通过定向单测及 vet。

独立复跑真实 CLI 2.1.292 隔离假上游 `TestRealCLIToolResultSessionContextRoundtrip` 通过 6.273 秒：JSON/SSE 各首轮工具调用、结果续聊、冷缓存导入和回退，合计 8 次模型 fixture 请求。至少一轮实际生成嵌入结果的 session_context，并验证客户端原 prefix、原样恢复及 context 不重复；冷导入允许 CLI 将附件作为独立位置生成，不伪造要求每轮均嵌入。

该证据不等于修复已上线，也不替代修复后本地真实客户端连接正式服务的 Read 往返验收。线上更新仍须 root 提交后服务器 Git 构建，并保持既有账号容器/授权。
