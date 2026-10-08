# Cache TTL evidence 独立复核

2026-10-09，当前先完成已冻结UI阶段。未修改作者业务文件，未操作生产或发模型请求。

实际序列化核对：`usage/settler.go`的billingInputs使用小写`additional`/`replacement`；`core.PricedUsage`没有Metrics JSON重命名，因此嵌套字段为大写`Metrics`。UI `componentCacheWriteMetrics`读取路径与实际Go结构一致，按每项独立展示，不合并不同attempt的TTL事实。

新增 `cacheWriteEvidence.independent.spec.ts`：真实大小写结构11/22/33三组件独立投影；固定计数对象返回副本，不修改来源；任意evidence扩展字段和未知版本的秘密fixture不回显；不安全int64、错误数值、null不能伪造已知0。

`UsageTokens`新增1h计入列表显示合计，避免只有1h的记录显示空；不修改保存的计数。`UsageTokenFacts`仅中性化收费桶标签；`BillingBreakdown`仅使用可选标签，原quantity/rate/cost不改。未知或不安全证据降级缺失提示，不冒称完整TTL。通用metrics排除整个cache evidence对象，合法投影只输出固定字段。

独立命令 `npm test -- src/views/usage`：5 files/20 tests PASS，2.10s；`npm run typecheck` PASS。没有运行浏览器或宣称线上视觉验收。此阶段未发现UI阻断问题。

## Core冻结后独立测试

仅新增 `usagerules/cache_write_evidence_review_test.go`、`gateway/cache_write_evidence_review_test.go`，未修改作者业务。独立实测通过：

- 真builtin Anthropic规则：SSE先100/1h100/5m0，再总量1319得到未分类1219；同总量后补5m1219变完整，原Tokens不变。
- 父级cache_creation:null清除已知TTL事实，保留null而不造0；旧收费数学不改。对外发布指针的修改不会污染下一帧，旧快照也不随新帧变化。
- 非法类型、负数、小数、int64溢出和sum>total记录inconsistent；不匹配的其他提供商路径不生成Anthropic证据。
- 9007199254740993经过typed→冻结字节→UseNumber解码→再编码，原字节和digest严格一致；decoded深拷贝修改不污染源，也不舍入。
- Replacement第一轮事实不进入第二轮，外部改写不污染再次读取；Additional null/absent逐项分开、外部Metrics map改写不影响内部。
- plugin没有host证据时不能创建保留key；已有host证据不能被覆盖，decoded快照与插件输出不共享嵌套对象。

命令：`go test ./internal/usagerules -run '^TestReviewCacheEvidence' -count=1` PASS1.240s；随后扩大到`go test ./internal/usagerules ./internal/gateway ./internal/core -run '^(TestReviewCache|TestCache)' -count=1`，usagerules1.134s/gateway2.924s通过，core该筛选没有测试（不计core测试证据）；三包vet通过。

本独审直接通过core冻结编码接口验证完整字节，但没有再次连接PG或声称独立DB冷重放验证。真实PG唯一usage/receipt、费用和1219partial存储证据来自API作者另记的39.050s门禁。数据库持久消费者另只读确认仍以frozen envelope/digest逐字校验。未发现新阻断；UI与Core层均未部署，计费数学没有由独审改动。
