# Core 0.1.78 发布准备

> 本轮准备已完成，随后 .78 已正式发布并通过生产 UI 复验。下文按当时准备阶段保留过程，阶段中的“生产保持 .77 / 尚未 createplan”不是当前状态。最终见 [发布完成](DEPLOYMENT-2026-10-09-CORE-0.1.78.md)与[生产复验](UI-PRODUCTION-CORE-0.1.78.md)。

精确候选 `1c35179527a7632f3ea06b9d9014d81854112956`，服务器 Git fetch 后新建 clean detached `/home/debian/sup2api/release-0.1.78`，未上传源码。仅三处 host UI 及验证脚本变更，不重复后端 PG/模型测试；前端由正式 Docker 生产流程构建。

执行句柄55728，日志 `/home/debian/sub2api-next-test/validation-1c3517952/prepare.log`。复用已提交 prepare-core-release.sh，固定 Go1.27.1 官方 digest、原 default BuildKit cache/签名密钥与2CPU/4GiB限制。完成后逐一核六插件不可变包、签名/trust/schema/完整 TLS GET、平台备份和新鲜预检。当前不创建升级计划，不操作21/22、Worker .80、default、Controller .48；生产保持 .77。

结果待实际句柄追加。发布如获批准，UI验收复用已有 usage744/clientRID，不增加模型调用。

## 最终准备结果

55728 exit0，正式 Docker 前端生产构建及 prepare 完成。日志实际 FROM `golang:1.27.1-trixie@sha256:8f58fd67ea075142d947a60e0caa4317746a55118d312f027793d382c7741734`，运行 Go1.27.1。工作树保持精确候选且 clean。

- manifest `300d9c5e3125e72367465e567db6933a8df392482b2ea412276b9beb58f37f78`。
- bundle `a5982dd0cec7625da94a9239299c39d95121e39588ef92d1ef21c3920b194be0`，110172269 bytes。
- Core binary `872573c772bd97322fc076b006b34fcc732f47c5dd9aa8f3836ddb36d6d1a689`。
- schema before/after `e8ec13814e64ced829fe95d94c719afe902eed9d7b50370634d5d129ec321138`，未变。
- 六个 builtin 包逐项与 .77/.75 原包 SHA 完全相同，trust.pub相同；CCGateway .14 仍 `a7e0d1f0eea17c32812e03fc9b267e20b8d07d5d75bcae4953b627ccd86ae7cf`。
- 独立 Ed25519、payload/bundle SHA、tar 文件mode/size/hash全部通过；完整 TLS GET manifest3191 bytes和bundle110172269 bytes逐字相等，未跳过证书校验。

平台受限备份 `/home/debian/sup2api-managed/backups/core-0.1.78-20261008T194528Z`，dump21965769 bytes、0600、pg_restore-list成功，四节点私有inspect已存。旧 .76失败制品和全部先前备份不变。

2026-10-08 19:46:57 UTC manifest import成功。正常管理登录token仅内存；freshpreflight HTTP200/revision147/blockers=[]，只sup2api-1..4，primary-first-v1，私有结果在stage/0.1.78/preflight.json。没有createplan/切服务/browser/模型请求。正式发布需根代理另行放行并再次预检。
