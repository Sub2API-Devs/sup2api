# 第六批资源登记与 PTC 持久化独立审查

2026-10-08。审查对象为另一 agent 实现的 `core/provider_resource_observations.go`、`providerresources/observations.go`、`contexts.go`、0039 migration，以及 quotaAt/Finalize 的关联修改。未修改 Skills/0040，实现和审查未混同真实数据库或生产验收。

## 已修复的问题

PTC 的原唯一键包含 owner。虽然每次 BindContext 都验证目标容器属于当前 owner，但同一 account/principal/generation/plugin/parent ID 可以由另一 owner 绑定到其自己的另一容器。该结构未兑现“同一提供商执行父 ID 不可改绑”的边界。

修复保持 owner 作为读取 ACL，增加提供商 parent 身份的独立事务锁；查询已有绑定时跨 owner 核对，已有 owner 或 container 不同均拒绝。0039 增加不含 owner 的全局 parent 唯一索引，过期旧容器也不释放 parent 身份用于重新归属。锁顺序仍为 owner → 单一远端身份，和资源登记/Finalize 一致，没有引入反向多 owner 锁链。

## 已核对的行为

- RegisterObserved：owner 锁串行化配额与删除，远端身份锁协调不同 owner 及 Finalize。历史记录包括 tombstone，不因删除释放远端 ID 给新 owner；已有多条历史身份时拒绝。
- 容器 expiry 必须由 provider 报告，dispatch 时间来自核心；过期后新开始的请求不能复活容器。过期前开始且真实返回更晚 expiry 的在途请求可以续期。迟到响应不缩短已确认的新 expiry；非 ready 状态不能被观察操作恢复。
- 过期容器释放资源数量、字节和活跃上下文配额。若在途响应使其重新可用，重新检查完整数量、字节及旧上下文恢复后的配额，失败由同一事务回滚。
- 文件 expiry 不当作删除证据释放配额；已过期文件不能由新观察延长复活。Finalize 保留已有截止上限并按 provider 更早截止收紧；重复完成需原操作与 metadata/bytes 一致。
- ResolveContext 要求 owner、完整 issuer binding、插件及 parent 精确一致，并确认目标容器仍 ready 且未过期。
- 同一远端文件的 Finalize 与 RegisterObserved 共用身份锁；数据库唯一索引作为第二层约束。未发现另一处明确事务/配额绕过，未为实现简单而删除这些边界。

## 新增独立测试

`providerresources/observations_review_test.go`：

1. `TestReviewObservedDBParentIdentityAcrossOwners`：跨 owner 同 parent 拒绝、过期后仍不可重新归属，以及两 owner 并发抢同 parent 恰好一方成功。
2. `TestReviewObservedDBRenewalReacquiresAllQuotas`：过期释放配额；在途续期分别受数量、字节、上下文限制；失败不部分提交；容量足够后续期与重复登记不双重占用。
3. `TestReviewObservedDBFinalizeCannotRaceAdoption`：上传完成与另一 owner 观察相同远端文件并发，恰好一个所有者登记成功。

## 实际执行与限制

- 包级 DB 测试实际尝试运行，但本机 embedded PostgreSQL 缺少 `data/global/pg_control`，启动失败；新 DB 用例未执行到断言。未删除或重建本机数据库目录，没有将 skip 当作通过。
- 非 DB 目标测试 `TestObservedContainerExpiryEvidence`、`TestResourceQuotaExpiryClassification`、`TestResourceIntentValidation`、`TestResourceQueryValidation`：PASS 0.376s。
- `go vet ./internal/providerresources`：PASS。
- 第六批候选通过 Git 更新到 Linux 后，应执行 `go test ./internal/providerresources -count=1`，包含所有新 DB 用例和 0039/0040 migration。该验证由主 agent 统一安排。

未提交、推送或部署；CodeExec/PTC engine 作者区保持冻结。
