# 跨 Worker diagnostics 归属方案（第九批）

## 目标与官方语义

以同租户、同实际提供商身份的持久归属证明替代仅本地 Worker 的 message ID 索引，支持冷 Worker 和进程重启；不把任意 message ID 当授权。官方 cache diagnostics 的指纹按 organization/workspace 隔离，只在 diagnostics opt-in 请求保存，过期或不可比较仍是正常响应。核心目前无法证明两个 principal 对应同 workspace，所以本轮固定原 account/principal/generation，不跨账号猜测。

## 数据与接口

新增 core.MessageDiagnostics port：Record(ctx, DiagnosticMessage) 与 LookupOwned(ctx, ResourceOwner, messageIDHash)。记录包括 owner(UserID+GroupID)、SHA256 ID、ResourceBinding、ObservedAt、RetentionUntil；不保存提示词、OAuth或token。只登记 diagnostics 非null对象请求实际响应的 Message ID，空对象/previous:null亦 opt-in。默认平台保留24小时、每owner4096，构造可配置；这是归属证据期限，不是provider指纹期限。过期清理后不可证明归属须明确本地错误，不伪造上游notfound。幂等同ID不续期，不同owner/binding碰撞拒绝；事务owner锁及ID锁保护容量与唯一性。迁移0042独立表。

## 请求与调度

仅 Anthropic Messages。有 previous ID 时核心先校验owner索引，绑定原账号并与文件/credit亲和合并；未知owner返回统一notfound，不能因本地未知就访问共享workspace。无previous的opt-in首轮可以选可用CC账号，先验证稳定issuer。非CC原协议保持透传，不向其注入内部grant；CC索引只针对CC发行ID。插件hook后重新校验，Build后验证diagnostics对象未被改写。

可信头使用独立 diagnostics 名称：所有外来同family头在最终forward剥除，只对已归属CC请求写入 ID hash grant 与预期Principal/Generation；首轮tracking标志仅要求身份与发行结果。Worker以内部Host/Scope信任边界及实际issuer复核，精确比对previous ID hash；有可信grant不要求本地messageOwnership文件存在。无grant保留现有standalone本地索引行为，不开放公共ID任意查询。旧Worker需能力握手/明确拒绝，不能静默忽略grant。

## 响应登记

JSON只读取真实Message.id；SSE读取经过主请求归属及公开映射的message_start.message.id，绝不把辅助调用ID计入。先保证实际issuer一致再登记。需要登记成功才发行可跨Worker使用的ID；若存储失败不能编造diagnostics成功，按明确内部状态错误处理且已产生usage仍按原数据结算。正常provider previous_message_not_found/unavailable/null均原样HTTP200，不能转换为404。

取消前已发行的message_start可登记，即使之后生成被取消；没有实际responseID的失败不登记。索引与debug日志独立。认证刷新不换generation；真正issuer迁移的新binding不读取旧索引。迟到响应只能写原binding，不能覆盖新身份。

## 验证计划

- Store DB：owner隔离、并发record、同ID冲突、不续期、容量/清理、重建service查找、字段限制。
- Core真实HTTP fake provider：JSON/SSE opt-in发行→coldWorker续查，同ownerkey轮换，crossgroup/unknown拒绝；同账号换issuer拒绝；资源/credit亲和冲突，patch篡改，非CC无内部头。
- Worker：无本地索引有可信grant+issuer准入；伪造/错误hash/错issuer拒绝；正常diagnosticnotfound响应不报错；standalone兼容。
- 集成：实际CLI+隔离upstream的两个独立Worker cache目录，同原issuer ID往返；重启、null、空对象、cancel、流错误、未opt-in不建立claim。
- 最终精确Git SHA在Linux隔离DB/race/vet后再交独立复核，真实云仅另行证明provider诊断效果。

## 文件与协作

新增 contracts/diagnostics、core port、server/internal/messagediagnostics与0042；gateway独立diagnostics文件及最少pipeline/dispatch/forward/resource response hooks；app依赖接线；Worker api_diagnostics/message_ownership。内部cache agent拥有request/outbound的cachehooks，如需共改先协调。当前此文为实施前方案，不代表代码完成。
