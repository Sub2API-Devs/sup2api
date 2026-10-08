# Core .74 / Worker .79 发布

候选精确 `7d322abd9cf8579fe229aa74f50ee654c1d1e2d4`；门禁/签名制品/备份见 CORE-0.1.74-VALIDATION-PREPARATION.md。root在Worker .79原账号22→21部署及独立hash核验成功后明确放行本平台四节点发布。没有操作其他服务。

重新preflight HTTP200、blockers=[]；正常updater plan `d783b718bffa3d13ab9b33d7830d2ce2` 创建202，目标manifest `1c8ea5ba21190c95732ad00f834e41f7b505fd0403ef8833a540c5d885ecfa0c`，仅sup2api-1..4。observer session51409记录匿名prices状态与节点/步骤变更；没有故障注入参数。

备份 `/home/debian/sup2api-managed/backups/core-0.1.74-20261008T165135Z` 包含数据库可读dump及四节点私有inspect；原.73制品与发布记录保留。schema无变化，失败时使用既有updater恢复流程，不删除账号或授权卷。

Worker .79镜像已核 `sha256:c7282386bab45314d7ae432c220bd3e3f87b1f82303a9d246cefa63576770704`；未来default刷新前已取 `/opt/ccgateway-runtime/default-0.1.79-before.json`（0600），含两个原账号Id/Image/Mounts/Config/Path/Args。此时尚未保存未来default。

## 完成与维护窗口

计划最终completed|27（62.45s），observer完成66.57s，日志 `/home/debian/sup2api-managed/upgrade-20261008T165751.log`。匿名prices探针401共1083次、503共1445次；首50322.22s、末50359.44s，观测窗口约37.22s，没有声称零中断。

四节点实际Core version均0.1.74，程序hash均 `44c94eb1aaae1640774995c65094f40ab0476d94d4885f6055b2e34f17b582ec`，schema同 `e8ec13814e64ced829fe95d94c719afe902eed9d7b50370634d5d129ec321138`；权威节点状态均local/ready=true/stopped=false/目标release1c8ea5ba...。CCGateway enabled、active=desired=0.1.13；四节点实际/proc插件程序hash均 `1e5a7cd7726860f59e01663be42154157da4585b71ce630d43b1e9d74277a315`，与已签不可变包一致。

## 未来默认镜像

核心全部ready后完整public配置读改，仅images.app由.78改为.79，PUT200；正常runtime/install200，Controller仍.48，其他public字段/secret flags完全一致。私有事实 `/home/debian/sup2api-managed/default-worker-0.1.79-verification.json`。

cc-max `/opt/ccgateway-runtime/default-0.1.79-before.json` 与 `default-0.1.79-after.json`（0600）核原21/22 Id/Image/Mounts/完整Config/Path/Args完全一致，均running。没有重建旧账号、没有更换原imageRef.56或授权卷。#22只读active/schedulabletrue/reason空，cooldown TTL=-2，不做人工清除。全部稳定后通知root独占公网验收；本代理无profile/quota/模型调用。
