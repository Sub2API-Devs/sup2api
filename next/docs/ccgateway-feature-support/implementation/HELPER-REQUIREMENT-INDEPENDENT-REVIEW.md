# 纯准入需求查询独立复核

2026-10-08，audit_code_beta。未调用真实模型、未部署，作者 C/Worker 代码未改。

Worker 端仅以 typed helperCustodyRequiredError 返回 needs_custody；一般解析错误为 defer_to_ordinary，并非合法准入证明。该判断在完整解析末尾，不能用前面的预算错误掩盖后面的非法参数。纯路由先于日志/资源/会话处理；即使 Gateway 无配置 Key 也拒绝，不能继承普通测试 Gateway 的无 key 行为。

新增独立 TestReviewHelperRequirementAuthorizationAndInvalidPlan：空 key、错 key、错误 method、超过 32MiB、合法预算搭配非法 temperature，分别保持 401/405/413/defer。Runner/resources/cache/slots 为 nil，日志目录不产生文件。连同作者纯需求矩阵 PASS 1.146s。真实本机 CLI TestRealCLITaskBudgetCompatibility 6 次假上游调用 PASS 5.005s，覆盖普通请求、续聊、预算变化、回退、冷导入、SSE；vet 通过。

核心 unknown 路径使用最终 body 询问同账号的直接 Worker transport，服务层重新注入有效策略与内部 key，控制器只作连接发现，不接收该 body。known 链不查询此端点，也不能借 404 降级。404 仅代表旧 Worker 未提供需求查询，回到普通执行及其旧 gate，不代表已支持；其它错误/不明 decision 明确失败。大于私有限额的 unknown 普通请求保持原公开路径，不被私有 32MiB 截断。

新增 TestReviewHelperRequirementDBDirectTransportAndLegacy404 覆盖控制器仅 connection GET+revision、Worker固定path/body/key/policy、合法decision、404/defer、重复decision与503拒绝、连接关闭。当前只编译通过，等待与 ABC 共享隔离库串行运行，不把 DB skip 算通过。

root public prefix 优化独立新增 TestReviewPublicHelperPrefixCloneAndFallbackPreserveNumbers：大整数、1.00词法、HTML字符串、逐prefix摘要、不可Clone回退、重复JSON字段拒绝，PASS 2.978s。Lookup 在已知发现后才应用私有链512限制，未知普通长历史仍unknown；更长位置的known发现由CC新增独立DB负例，与直连测试合并待跑。

## 隔离数据库实际验收完成

等 ABC session13317 完成并释放后，在同一个 45439 SSH 隧道连接隔离 OVH PG45432，`go test -p 1 ./internal/ccgateway ./internal/helperhistory` 仅匹配以下三个目标；均实际执行，非 skip：

- TestReviewHelperRequirementDBDirectTransportAndLegacy404 PASS 14.80s，ccgateway 包 16.878s。
- TestIndependentHelperHistoryDBLongLookupDoesNotTruncateDiscovery PASS 25.37s：第 529 个前缀才出现的 known 不得截断漏检，跨分组未知、移除唯一 known 后未知、长列表重复仍拒。
- TestHelperHistoryDBLongUnknownHistoryRemainsOrdinary PASS 20.74s，helperhistory 包合计 47.478s。

测试 exit0，临时数据库由测试工具清理，隧道 finally 关闭；未访问生产 DB。Worker 准入、Core 直连及 root 长历史摘要/发现改动本次独立审查无剩余阻断。此结论仍不将 fake provider 与纯准入查询提升为真实模型资格验证。
