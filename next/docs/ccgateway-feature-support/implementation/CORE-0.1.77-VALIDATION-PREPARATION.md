# Core 0.1.77 发布准备

候选精确 Git `84fe9d0a10b6b770077697c2658ee5319d21f86c`。服务器 fetch 后新建 clean detached `/home/debian/sup2api/release-0.1.77`，没有上传源码。只准备 Core .77，不创建升级计划；生产 Core .75、Worker .80、Controller .48、默认镜像与账号 21/22 均保持。

执行句柄 `56825`，日志 `/home/debian/sub2api-next-test/validation-84fe9d0a1`。顺序四包 usagerules/gateway/core/usage Linux race+vet、隔离 PostgreSQL `TestCacheWriteEvidenceDBFrozenReplayKeepsPriceAndUniqueReceipt`（必须非 skip）、既有 prepare 脚本签名。测试明确固定 `golang:1.27.1-trixie@sha256:8f58fd67ea075142d947a60e0caa4317746a55118d312f027793d382c7741734`，2CPU/2GiB；构建使用已提交 Dockerfile 相同摘要、2CPU/4GiB、原 default cache/签名密钥。

后续必须逐项核六个 builtin 不可变包与当前 .75 完全相同，以及 trust/schema、签名、完整 TLS GET、平台受限备份和 fresh preflight。未发布 .76 已签资产与原备份完整保留，不通过覆盖旧包回避可重现性检查。当前阶段结果待句柄终态追加。

## 执行进度

初始句柄 56825 因执行命令把 `./internal/core` 误写成 `./core`，setup failed/exit1；这是 orchestration 路径错误，原日志保留为 `core-race-vet.log`，不是产品测试断言失败。原句柄终态后纠正路径，新顺序句柄 `44004`，没有重启仍在运行的进程。

`core-race-vet-corrected` exit0：Go 实际输出 `go1.27.1 linux/amd64`，四包 race 分别 1.039s/7.390s/4.315s/1.035s，vet 全部通过。随后隔离 PG 新 case 正在运行，不用此前 .76 的 Go1.27.2 结果替代。

本平台备份 `/home/debian/sup2api-managed/backups/core-0.1.77-20261008T185816Z`，数据库 dump 21551000 bytes、0600，`pg_restore --list` 成功；四节点私有 inspect 同目录保存。未备份或操作其它平台数据库。

## 最终准备结果

句柄 44004 exit0。隔离 PostgreSQL 指定 case 实际 PASS 0.10s、包 1.122s，非 skip，日志再次确认 Go1.27.1；沿用已有隔离迁移模板，不声称重跑所有 DB 测试。随后 prepare 签名 exit0。

- manifest：`6a0a3573f73fa34692bd9fec5f2bf0f534ab45104ae8fe5896b679f73e8969cb`。
- bundle：`55ece348abf4ba8e27dafac633d427e9b9220c40ec6465bc87d58242ac175c3b`，110186802 bytes。
- schema before/after 均 `e8ec13814e64ced829fe95d94c719afe902eed9d7b50370634d5d129ec321138`。
- 独立 Ed25519、payload digest、bundle digest、tar 各文件 mode/size/hash 全通过。
- anthropic .2.5、ccgateway .1.14、gemini .2.4、moderation .1.6、openai .3.4、volcengine .12.3 六个包逐项与 .75 完全相同，trust.pub 相同。完整摘要见服务器 stage/0.1.77/verification.json；CCGateway 包仍 `a7e0d1f0eea17c32812e03fc9b267e20b8d07d5d75bcae4953b627ccd86ae7cf`。
- 经既有 CA 验证、正确 releases 地址解析的完整 TLS GET，manifest 3191 bytes 与 bundle 110186802 bytes 分别逐字匹配本地签名制品。未使用跳过 TLS 校验。

2026-10-08 19:11:14 UTC 正常 manifest import 成功。平台管理登录仅进程内存，未输出或保存 token；随后 fresh preflight HTTP200、expected_revision=145、blockers=[]，仅 sup2api-1..4，strategy=primary-first-v1。完整结果私有 0600 保存 stage/0.1.77/preflight.json。没有创建升级计划或切换服务，没有 browser/profile/quota/model 调用；四节点保持 .75。根代理正式放行后仍须重新 fresh preflight，不能把此次 revision 当永久有效。
