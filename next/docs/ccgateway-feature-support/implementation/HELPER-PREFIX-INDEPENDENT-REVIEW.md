# 前缀摘要与长 unknown Lookup 独立复核

范围：root新增helper_history_prefixes.go、共享CanonicalJSON(limit)、Lookup对长未知公共历史的兼容处理。未修改作者实现。

新增独立测试：
- gateway/helper_history_prefix_independent_test.go：-0、1E+3、1.2300、1e400、大整数、HTML转义/Unicode、夹入system消息；增量摘要与原CanonicalDigest逐项一致。模拟Clone返回ErrUnsupported，验证fallback同值且不改变运行中的hash状态；嵌套重复键和尾随JSON拒绝。
- contracts/helperhistory/canonical_limit_review_test.go：输入长度边界、非正limit、原数值lexeme、排序与字符串转义一致。
- helperhistory/lookup_independent_test.go：第529项才出现known，不能只查前512项；其他group保持unknown，移除唯一known后允许ordinary，重复prefix仍拒绝。

noDB验证：摘要目标2.765s，共享Canonical目标1.429s，gateway/helperhistory vet通过。FIPS覆盖的是Clone不可用/报错的行为模拟，未声称实际FIPS构建验证；fallback保持正确性，但会重新编码每个prefix，不享受可克隆哈希的线性成本。

真实DB测试正在等待API的ABC隔离PG用例释放，将由audit同一隧道顺序执行root作者长unknown例和上述独立末项发现例，避免并发重复建库。此记录暂不声明DB通过。

## 隔离 PostgreSQL 结果

API完成ABC JSON后，audit使用同一临时隐藏45439→OVH测试PG45432隧道顺序执行：
`go test -p1 ./internal/ccgateway ./internal/helperhistory -run '^(TestReviewHelperRequirementDBDirectTransportAndLegacy404|TestHelperHistoryDBLongUnknownHistoryRemainsOrdinary|TestIndependentHelperHistoryDBLongLookupDoesNotTruncateDiscovery)$' -count=1 -v`

本独审新增末尾known例实际PASS25.37s；root长unknown作者例实际PASS20.74s，helperhistory包47.478s。均非skip、独立临时DB；审查代理执行并回报完整命令，隧道finally释放。没有访问生产PG。本增量复核未发现阻断问题；测试与文档已冻结。
