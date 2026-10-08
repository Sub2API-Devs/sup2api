# Core 0.1.76 发布准备

精确候选5fc8326f9587a41e69b565364f20a284bd86317e，内容为缓存TTL证据与独立UI。只准备Core.76；Plugin.14必须与live不可变包相同，Worker.80/Controller.48/未来default均不变，不操作21/22。

服务器Git fetch后新增clean detached /home/debian/sup2api/release-0.1.76，未上传源码。执行句柄29841，日志/home/debian/sub2api-next-test/validation-5fc8326f9。

顺序执行：Linux usagerules/gateway/core/usage四包race+vet（2CPU2GiB；此组关闭DB），随后TestCacheWriteEvidenceDBFrozenReplayKeepsPriceAndUniqueReceipt在独立testdb45432实际运行race（非skip），然后Git内既有prepare-core-release.sh受限2CPU4GiB/defaultcache/原keys构建签名。DB凭据仅进程环境，未打印或写DSN文件；fixture独立建删临时数据库，不触生产DB。

最终门禁、签名、Plugin.14逐字hash、完整TLS GET、备份与freshpreflight待运行结果追加。尚未创建升级计划或修改运行服务。

## 最终门禁及不可变包阻断

29841终态exit0：Linux四包race分别usagerules1.053s/gateway7.482s/core4.318s/usage1.035s，vet通过。隔离PG指定case实际PASS0.10s、包1.122s，非skip；core-race-vet.exit和cache-evidence-pg.exit均0。复用隔离库已有迁移模板，不声称重跑全量DB。

prepare成功，manifest66232982c31bd3c7a94759a326f7f52dcdff7cbafcae5488af4e29a438ec7bc7，bundle3489b3456a4f207c3b2b0dc3ec94f395f11a0781ac3b24a368a9dd51f3e88cb1。独立Ed25519签名、payload摘要及tar各文件mode/size/hash验证通过，但在Plugin.14不可变摘要检查主动失败，尚未执行完整TLS GET、manifest import或preflight。保留已签.76资产，绝不改payload/重签同版本。

旧Plugin.14包a7e0d1f0eea17c32812e03fc9b267e20b8d07d5d75bcae4953b627ccd86ae7cf；新包911340c8e79cf0ff07e8e02b266e8e79fa932bec5c1b4434eebcf88cfe55ce20。zip逐项仅两个平台binary与signature.json不同，manifest等相同。旧amd64 binary2f836e52bd5da8c645c1891e834219f87ecda42753a1656f7fe2c0b519d2bede，新49e5f14a5ccc0c50a0a0982a305c10091a6e351f6062ad5a33b79f6be4d2d784。

直接buildinfo确定根因：旧.75 Plugin由go1.27.1编译，新.76由go1.27.2编译，prepare日志也分别打印这两个版本。两者没有VCS revision/time/modified字段，外部模块版本/sum、buildflags相同。Dockerfile明确-buildvcs=false，因此不是VCS猜测。浮动golang:1.27-trixie工具链漂移改变产物；源不变不保证二进制不变。

Git609691490→5fc8326对应SDK、plugin产品（排除不参与插件依赖的companions）、plugin构建工具、go.work/sum、Docker/build脚本共167文件blob逐项一致；集合摘要56b541fccd084cca4ae12930e5a34bf1f7f0561537b56166884675d1dc4b236b。唯一相关companion差异是新增独审_test.go。没有凭409依赖数推断二进制相同。

平台备份/home/debian/sup2api-managed/backups/core-0.1.76-20261008T184118Z/database.dump（21550996bytes/0600），pg_restore-list可读；四节点私有inspect已存。当前Core仍.75，Worker.80/Controller.48/default未改，账号未操作，没有额外模型/profile/quota。

此记录是准备失败被正确阻断，不是生产升级故障，也没有新增维护503。

## 官方工具链摘要与全部内置包对比

从两次实际 prepare.log 的 FROM 解析得到：

- .75：`docker.io/library/golang:1.27-trixie@sha256:8f58fd67ea075142d947a60e0caa4317746a55118d312f027793d382c7741734`，同日志实际 `go version go1.27.1 linux/amd64`。
- .76：`docker.io/library/golang:1.27-trixie@sha256:2f84bc93ecfb2689f782b153fdcd368b5a7ab96c1386c65cdaccf35e726d6a44`，实际 `go version go1.27.2 linux/amd64`。

只读 `docker buildx imagetools inspect` 旧 index digest 成功，旧镜像仍可获取。其 linux/amd64 manifest 为 `sha256:8b6d507b46291cf17022e79e4edcc7fefb0ee1cd66ad40088a55e429552d6f05`；官方注释 version=`1.27.1-trixie`、source revision=`c4664da1bd8d0cbc975460744d90c031b409c215`、created=`2026-10-06T03:15:21Z`。这是实际已发布构建日志与镜像元数据的交叉证据，不是根据标签猜测。

全部六个内置包的旧 .75 → 未发布 .76 SHA256 均改变：

- anthropic 0.2.5：`12bc82d165339257e9ee453f8361dcd69ed4457ec52cce5f8e4582a89c7ba3de` → `5ac2a566f1dcb5f60274296452b2d009f5f9a51152f741b3a163f2c9dfc11791`。
- ccgateway 0.1.14：`a7e0d1f0eea17c32812e03fc9b267e20b8d07d5d75bcae4953b627ccd86ae7cf` → `911340c8e79cf0ff07e8e02b266e8e79fa932bec5c1b4434eebcf88cfe55ce20`。
- gemini 0.2.4：`629d5728a31b4f910ef6e6a37a3abe5a9baaa427c4d5129d731c3703ce6bf65d` → `e1590a5d39aa26c02b4caaca0b53ceef5e1e9ef171143023558bf1fb5487e859`。
- moderation 0.1.6：`26617c054dd57cddad74ac0c19d28fbb9ef7c84125a1496a84b08fe65759260f` → `f6325e4e4343a27ee454a04e16f7ec1b5326d47f4e9eb4487c3d0725703ca80c`。
- openai 0.3.4：`95418ded28ca16b26395c8d87f720e49dd7d5968b11ea2a8b7e2a4d8cd0babb7` → `a393acd2da4fbce54bebbadf6afcd8612e497f6fdabc80eda5714d67e322dfa5`。
- volcengine 0.12.3：`2b41b16353778fb61abbd2e21bce1a3d075fd95b1ca747b87f59db6808e1a065` → `2552c4568c79b7ecb3c3555e87cb402339033ef2bd7e4b572b24f013eb831742`。

根代理据此选择正式固定 Go 1.27.1 的上述 index digest，修改源码并提交新 SHA 后，用新 Core .77 目录重跑受限 Linux 门禁、隔离 PG 和签名构建。未来必须重新逐一核六个不可变包，不能只核 CCGateway，也不能事先把固定编译器当成可重现性已经证明。.76 已签资产保持原样，不做包替换、不覆盖版本，不执行 import/upgrade。
