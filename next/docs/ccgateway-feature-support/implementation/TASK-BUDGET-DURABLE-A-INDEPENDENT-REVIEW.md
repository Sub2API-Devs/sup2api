# 隐藏历史持久层 A 独审

2026-10-08，整改后 GREEN；候选未接线、未部署、没有开放 general gate。

审阅 contracts/helperhistory、core port、internal/helperhistory 和0043。确认 AES-GCM AAD 覆盖 owner/binding/receipt/parent/namespace/prefix/chain/payload digest；完整公开前缀逐层恢复，混租户、换issuer、缺边界、过期、破坏密文拒绝；同公开前缀不同隐藏分支保留两份不可变证据再报冲突。冲突用量按统一503状态与历史同事务冻结，不先落200再依赖重复Submit修改。

独立发现两个阻断，真实隔离 PG 红灯25.554s：

- MaxRecords=1仍可Reserve，但完成会产生record和未ACKoutbox两份槽位，派发前额度不足。
- 允许65字节request ID，而usage表插入截64、同步持久接口拒>64，可能产生无法消费的outbox。

作者收紧RID<=64；预留每未完成请求的未来record+outbox，对已有冻结费用避免重复预留；同批补密文开销。新增独立 MaxRecords4两份并存reservation后拒绝第三，及同owner跨receipt替换密文否例。所有真实数据库测试通过后才标GREEN。

独立最终全包：9个真实DB用例+本地加密用例，PASS205.640s，无skip。独立4例分别12.99/6.26/15.09/27.20s；原5例冷恢复40.33、并发歧义28.75、过期/限额/outbox30.32、不重发22.76、无效完成仍保真实费用20.40s。contracts test0.239s、非DBtest1.419s及vet通过。

测试从本机Go经临时隐藏SSH tunnel访问 OVH 的独立 sub2api-next-testdb-pg-1（127.0.0.1:45432），由testutil创建临时数据库；没有访问生产数据库、上传源码或修改运行服务。密码只在本机进程环境内，隧道结束已清理。没有将这些结果称为Linux race或ABC端到端通过。

剩余集成边界：C必须同步usage入库后才ACK，失败用量仍走持久outbox；B必须验证主请求归属及工具配对，framing不是执行授权；carrier鉴权/旧Worker拒绝/限额/错误费用/真实长历史恢复仍待ABC整合独审。身份墓碑不自动回收、达到硬限额明确拒绝是现合同限制。
