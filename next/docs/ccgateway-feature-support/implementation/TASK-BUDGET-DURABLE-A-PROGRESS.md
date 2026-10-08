# 通用预算隐藏历史：工作包 A 进度

2026-10-08，独立候选，未提交、未部署、未开放 general gate。仅新增 contracts/helperhistory、core/ports_helper_history.go、internal/helperhistory 与迁移0043；B/C 的 Worker/gateway/settler 未编辑。

## 当前合同

- `helperhistory.Payload/Segment` 仅完整隐藏 assistant/user 对，AfterMessage 为零基公开消息位置，同位置段保留数组顺序；拒绝混合可见块重叠，不能借整段插入移动签名。PublicAnchorDigest 是原公开 messages 到该消息的完整前缀，ToolCatalogDigest 是原 tools 数组；共同 `CanonicalDigest` 严拒重复键、保留数组与数字词法，不使用 float64。载荷 raw message 原字节另行保留。Validate 拒未知版本/未知顶层与段字段、重复 JSON key、超限和角色次序异常；运行态主请求/工具身份配对仍由 Worker 验证，framing 不是执行授权。
- core `HelperHistory.Reserve/MarkDispatched/Commit/Resolve/MarkUncertain/Abort`。Reserve 必须带全部已公开 assistant 边界的 PriorPrefixes；缺中间或早期边界、不同 owner/binding/namespace 不恢复。
- `Completion.Usage *UsageRecord` 是核心已冻结完整费用快照，必须与 reservation RequestID/owner/account 匹配。Commit 同事务写 immutable record 与 AES-GCM 加密 usage outbox。`PersistUncertainUsage` 用于已派发但不能提交可恢复历史的真实费用；不从猜测生成 usage。
- `PendingUsage` 只读、不消费、不要求独占lease；C 使用既有 usage_logs(request_id) 唯一约束及同步持久入口后 `AckUsage(RequestID,Digest)`。ACK后attempt仍保留usage_digest，重复Commit不能重建费用/修改tokens。C消费者/同步持久入口尚未实现，不宣称结算闭环已接通。

## 存储边界

0043 创建 attempts、immutable records、usage outbox。Owner事务锁串行化容量/记录竞争；冲突公开prefix保留两个hidden digest并拒绝Resolve，不能回滚冲突证据后first-wins。父链持久引用避免每轮全链复制；parent chain精确校验后保留原issuer，冷重启只依DB及master cipher。

使用现 secret.Cipher AES-256-GCM；AAD绑定owner/binding/receipt/parent/namespace/prefix/摘要，换行换租户密文不可读。无OAuth/MCP凭据。默认256MiB内容额度、4096个记录/未完成记录与未ACKusage槽；单payload及总恢复链32MiB、最多512公开边界。相同attempt重复派发失败，不将uncertain变回可派发。

**身份墓碑不可自动淘汰**：ciphertext过期可由 `ExpirePayloads` 清理，prefix identity仍计入硬限额；否则将来同公开prefix的新链会被旧客户端误认。达到限额派发前拒绝，不能声称无限透明续会话。管理员物理删除identity不是安全的自动回收；要重新使用命名空间须额外客户端epoch/handle产品合同，当前未提供。此边界已由root确认。平台Retention是本地保留政策，不是官方task_budget TTL；父过期不会通过子记录续期复活。Host应周期调用ExpirePayloads，即使无新请求也清内容。

## 已执行证据

本地 contracts/helperhistory test 1.254s + vet；core helperhistory 非DB加密/AAD/无效参数 test 1.583s + vet。最初本机 SUB2API_TESTPG=off 的四DB明确skip，没有当作绿灯。

随后本机运行 Go，通过临时SSH tunnel→OVH隔离PG45432（容器sub2api-next-testdb-pg-1），testutil创建迁移模板和每例独立临时数据库；没有向服务器上传源码，也没有访问生产DB。最初连接忘记容器默认POSTGRES_USER/DB导致认证失败，无业务结果；改为Postgres默认用户/库后：

- TestHelperHistoryDBChainColdIntegrity PASS 101.26s：新链、重启读取、完整字节大整数、缺边界/owner/issuer拒绝、密文损坏。
- TestHelperHistoryDBAmbiguityConcurrent PASS 27.79s：同prefix不同隐藏分支并发，一次成功一次冲突，两个证据和两个实际费用outbox保留，Resolve拒绝。
- TestHelperHistoryDBExpiryQuotaAndOutbox PASS 29.44s：费用读取/ACK摘要、重复Commit不重放ACK费用、冻结费用篡改拒绝、过期拒绝和墓碑占额。
- TestHelperHistoryDBUncertainNoRedispatch PASS 22.88s：CAS派发一次、不可abort已发请求、uncertain费用持久、禁止自动重发。

总181.905s全部真实DB非skip，临时SSH进程已关闭，测试数据库自动清理。此轮编译后另补总恢复链32MiB、ExpirePayloads维护函数/索引与对应删除内容断言，最终字节仍需定向DB再验及独审；没有用上述通过覆盖新增代码未执行部分。

## 交接待办

C需明确歧义Commit失败的最终HTTP状态如何冻结到outbox，不能先存Success200后用重复Submit试图覆盖唯一RID；作者正在对齐，不先宣称全完。B需验证完整隐藏轮次的公开边界定位及当前目录，不允许注册隐藏工具获得执行资格。Root统一候选Git和Linux/race；本机race可用性及最后迁移重复执行需独审。

## 后续定向修正与最终交接（同日）

- 总恢复链上限/ExpirePayloads 新索引迁移后的两DB定向PASS109.255s；新例验证无效Completion不部分提交receipt，随后仍可持久实际费用的503失败记录。
- 与C确认并落统一 `core.HelperHistoryStorageFailure`：503、Success=false、gateway_helper_history_storage 和固定非敏感文案。公开prefix冲突在检测之后、同事务写入失败元数据的usage outbox，tokens/price原样；不存在“先200落库再重复Submit改状态”。一般Commit回滚由C统一HelperHistoryStorageFailure→PersistUncertainUsage。
- outbox原文大小限制2MiB，派发前额度同时预留此最大费用记录空间，已有outbox密文字节也计入owner字节额度。旧secret组件没有key-id轮换能力，仍属部署运维限制。
- 最新五DB全量PASS148.449s（44.15/28.13/31.08/23.04/20.73s），全部真实执行，无skip；包含冲突保留两笔实际费用且一条失败503、到期清ciphertext保identity、不重发、费用owner错误回滚等。
- 在上述全量之后，按C最终调用合同补 `PersistUncertainUsage` 对已committed、完全相同冻结失败usage幂等成功（不降级receipt、不改费用），异值仍拒绝；此窄路径另跑并发冲突DB增量，结果见末尾。不能根据Commit返回的非空Record推断事务成功，该注意已写port注释。

工作包A尚不包含C同步usage.PersistUsage消费者、host维护调度、Worker carrier/grant及账本恢复。它们由B/C实现后必须整链验证，不能因A存储DB通过就开放general gate。root负责提交/部署；本代理不提交、不上传源代码、不修改线上配置。

最终增量：TestHelperHistoryDBAmbiguityConcurrent PASS 33.06s（包34.455s），已覆盖committed失败usage的幂等补持久；contracts最后test0.246s及两包vet通过。A源码冻结待独审，无剩余作者已知阻断；Linux race/最终Git候选集中门禁尚未运行。

## 独立复核整改（尚待复核者最终PG结果）

research_api 在真实隔离PG25.554s复现两个RED：MaxRecords=1仍可Reserve而提交会产生record+outbox两槽；65字节核心RequestID可进入账本但usage持久入口只支持64。作者已窄修：RequestID入口上限64；已有尚未冻结usage的reservation按未来两槽计数，新Reserve也必须剩余两槽；已冻结uncertain按未来record一槽加真实outbox单独计数，ACK后不重占usage槽，aborted仅保留一元数据槽。字节额度同时预留密文开销，记录保存真实ciphertext大小；已冻结usage不重复预留2MiB。作者过期额度例由MaxRecords1改2，仍证明既存墓碑一槽不足以接纳新两槽。新增独审“MaxRecords4仅允许两份并存reservation”测试由reviewer拥有。

本次作者非DB1.360s及vet绿，源码再freeze；不将前一轮全PG结果冒充此修复后的最终结果。独立reviewer将运行真实PG全部测试并补证据。

## 派发前只读发现接口（C协调新增）

按root授权新增 Lookup(ctx, owner, allPublicPrefixes)，不要求尚未选定的account/model/CLI/policy namespace。结果使用core.HelperHistoryLookupState三态：Unknown、KnownReady、KnownUnrestorable；不能依错误文案判断。只有全部前缀没有任何owner记录才Unknown；任一已知但缺边界、过期、密文损坏、原链不完整、跨namespace多链或hidden冲突都不能退化成Unknown。KnownReady返回完整Chain与Namespace/Binding供C固定原账号后再做实际资格/配置校验。DB基础设施错误单独返回error，不能当Unknown路由。

新增lookup.go/lookup_test.go，0045仅加owner/group/public_prefix_digest查询索引；没有改C的0044、FrozenEnvelope、usage编码。复用同owner事务锁和原resolve完整链校验，不另建宽松恢复器。两项真实DB定向验证正在执行；本机SUB2API_TESTPG=off首次明确skip只证明编译，vet通过。最终结果将在下文追加。

Lookup最终真实隔离PG结果：TestHelperHistoryDBLookupBeforeNamespace PASS113.31s（全unknown、ready固定binding、跨owner无披露、部分known未知后缀、冷完整链、丢早期边界、颠倒顺序、跨namespace歧义）；TestHelperHistoryDBLookupExpiryAndCorruptionStayKnown PASS23.19s（损坏/过期清内容仍known-unrestorable）。包136.857s，全部非skip，SSH tunnel和测试DB已清理；无生产访问/源码上传。Lookup增量再次freeze交C接线和独审。
