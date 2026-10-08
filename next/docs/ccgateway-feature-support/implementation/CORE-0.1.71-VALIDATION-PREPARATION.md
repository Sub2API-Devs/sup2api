# Core 0.1.71 / Plugin 0.1.12 Linux 验证与签名准备

候选：`428164d4756e64163710910224957744554a2011`。本记录仅门禁和签名准备，不表示已导入或升级。

2026-10-08，OVH服务器 Git fetch 后建立 clean detached `/home/debian/sup2api/release-0.1.71`，没有上传本地源树。测试输出独立目录 `/home/debian/sub2api-next-test/validation-428164d47`。

隔离门禁：Go1.27-trixie Docker，2CPU/2GiB、GOMAXPROCS2/GOMEMLIMIT1400MiB、CGO/race、只读源码、既有sub2api-next-ci缓存。Docker inspect核测试PG仅sub2api-next-testdb-pg-1/loopback45432，凭据只进程环境，不打印。六包gateway、ccgateway、helperhistory、usage、app、migrations执行 `go test -json -race -p 1 -parallel 2 -timeout 25m -count=1`，后续同包vet和全部contracts race/vet；每步骤日志与exit独立保存，任何失败停止后续步骤。

初始执行会话96538：已开始core-race，尚未获得终态；不得把运行中或可选CLI跳过计为DB通过。未创建stage、未构建签名制品、未导入manifest或升级四节点。

## Linux 门禁终态

session96538正常结束：六包race 726项通过、3项可选CLI跳过（ABC实际CLI、OpenAI真实CLI链和数字链）；没有DB用例跳过。contracts64项通过；core/contracts两组vet均exit0，race失败0。迁移 `TestMigrationsFromFirstIdempotentRunTwice` 实际通过，候选包含0043/0044/0045/0046均参与迁移模板和幂等检查。

helperhistory真实PG通过15项：长lookup不截断、命名空间前发现、长unknown普通历史、过期/损坏known、延期记录重启取消、坏页不饿死后项、完成槽位预留、冻结数值词法、未完成预留计额、同owner密文交换拒绝、冷链完整性、并发歧义、过期配额outbox、uncertain不重新派发、非法完成保留uncertain用量。其它usage/app/gateway实际DB结果保存在完整core-race.log，不用本地先前绿替代。

门禁通过后启动签名准备会话27855，使用已提交prepare-core-release.sh、default原cache/keys、2CPU4GiB slice，输出prepare.log。此时仍未导入manifest、未创建升级计划。

## 签名制品准备完成（仍未导入）

prepare会话27855 exit0。目标Core0.1.71、精确428164d47；源schema `df9d222590f04365c30fcaeb2ce4f9120c7c16ced7b32db751ea0205394b3ed6`，候选schema `e8ec13814e64ced829fe95d94c719afe902eed9d7b50370634d5d129ec321138`。

- manifest：`f2d7d55a952db9ab6b7bcd0e00b3b34ff273bc38d54dc78f4d75b65f2c24c94e`
- bundle：`a9ef77332c85d3985e433f89306c33a6f9246e0fc8ab1cb3843cb195d335a508`，110181762 bytes。
- core binary：`1e9641f9c8dc6f1b75010a786123395451ea0442a1a78eb02fc396682281e632`
- 新CCGateway0.1.12包：`0bbcacca59def9b4011e80b8d895898c198a72611f280a5fabe5ab40556970d7`
- 插件linux-amd64 binary：`b9f030ecbc206c8cd4b460d02675ae2711129c75d1b59781d13056c87db4a467`
- trust：`e51300373d1ce798114d1b39207dcb0e9dd4b7e9dccaa7e1935f55e334847133`，与live原信任相同。

独立校验通过：Ed25519 manifest签名及payload摘要、bundle摘要、全部tar路径/mode/size/hash、插件ZIP规范摘要和Ed25519签名；从既有release-origin使用CA验证TLS与正确releases主机名完整GET两份制品，逐字节哈希相同。证据 `/home/debian/sup2api-managed/stage/0.1.71/verification.json`。最初误用tarfile探测s2plugin格式得到ReadError，随即按真实ZIP格式校验成功；这不是构建或签名失败。

四节点仍Core0.1.70，未导入manifest、未建升级计划、未变默认镜像/控制器；等待root确认Worker.73门禁与下一步发布授权。所有旧制品保持不变。
