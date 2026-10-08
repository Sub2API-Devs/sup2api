# Helper usage 重放与阻塞复核

2026-10-08。C receipt / consumer 审查者 audit_code_beta；A 延后调度补丁作者 audit_code_beta，须 root 另行独审。没有真实模型调用、生产数据库操作、提交或部署。

## 原红与计费合同

TestReviewHelperUsageConflictDoesNotStarveNextRecord 独立 RED 2.323s：首条不可持久化记录导致 drain 立即返回，后面的合法记录未 ACK。仅改 continue 仍不能解决前 64 条永久坏记录覆盖固定批次的问题；PendingUsage 任一密文损坏导致整批失败也有同类风险。

C 的 TestHelperUsageReceiptDBConflictAndMissingRow 在隔离 OVH PG45432 独立实际运行 PASS 33.719s，非 skip：相同事实重放不重复落账，变更事实不 ACK，receipt 缺 usage 行不复活，普通已存在 usage 无 receipt 不伪确认，旧冻结 envelope 保留兼容。该结果不替代本次新延后调度数据库测试。

## 窄修分工

A 未发布 0043 增 next_attempt_at/retry_count/failure_code；DeferUsage 仅记录固定 delivery 分类并延后一分钟，保留原密文和摘要。PendingUsage 只选到期记录，单条完整性/封装错误按固定 integrity/envelope 分类延后并继续；先关闭读取结果集再更新，避免占有唯一连接时等待自己。内部损坏摘要按数据库原身份隔离，公共 Defer 接口仍验证摘要格式。错误原文、原 payload、凭据均不写诊断字段。

C 消费者逐条失败延后并继续本批，汇总错误；context 取消立即停止，不误 ACK、不将取消当永久坏记录。ACK 仍仅在相同冻结事实已持久后发生。延后失败本身会明确返回错误，不能宣称调度已恢复。

新增 A TestHelperHistoryDBOutboxCorruptPageDoesNotStarve 验证前 64 条密文损坏、第 65 条合法；坏项保留、下批取合法、正常项投递错误也延后、时间推进后重试、错误摘要 ACK 拒绝。真实数据库结果待本轮结束补充；本地 SUB2API_TESTPG=off 的编译结果不能算 DB 通过。

全流程不把未知消费估为零，不删除冲突事实，不承诺损坏账单可自动修复。固定一分钟为调度公平性退让，管理员仍需修复长期冲突或密钥/数据损坏。

## A 作者实际数据库结果

TestHelperHistoryDBOutboxCorruptPageDoesNotStarve 在隔离 OVH PG45432 PASS 134.483s，非 skip；用量数据仅为合成 fixture，SSH 隧道与临时测试数据库由 finally/测试清理关闭。前 64 条损坏仍保留，第 65 条正常可处理，持久错误分类计数符合预期。vet 通过。该新 A 实现是作者验证，root 另行独审，不能用本结果冒充独立验收。
