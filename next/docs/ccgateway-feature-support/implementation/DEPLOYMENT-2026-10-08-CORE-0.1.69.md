# 核心 0.1.69 / Worker 0.1.70 发布记录

2026-10-08。精确提交 `e463222dce5353b5e0bb6e95265bf9886efc0930`，OVH clean worktree `/home/debian/sup2api/release-0.1.69`。核心发布、默认未来镜像更新及账号保持核对均已完成，稳定后通知根代理开始API验收。本发布阶段没有模型调用。

## 构建、资产及备份

服务器 Git fetch 精确提交，复用 prepare-core-release.sh、default builder/cache 和现有签名密钥，2CPU/4GiB/Go并发2。未上传本地源码，未构建其他服务。

- manifest `931be9566648101b5d12f3396b5781aab79a98da77354509af834f2024349f2f`
- bundle `e038fae474f4fb06b277e022cfcf7065c4d566aee6f6e50c3b59e6d6c402b7aa`，110065895字节
- envelope SHA `4f0bb892319d6a96e55cc30c6f8cdb0b8b1f078d30ca6440208552c17018d31c`
- core SHA `e9fb6e3e2375a08d577ea60acdd291e409874c1a25ff7debfc470bacc9a196b5`
- schema 前后 `df9d222590f04365c30fcaeb2ce4f9120c7c16ced7b32db751ea0205394b3ed6`

签名/payload digest、tar全部路径/模式/长度/哈希、origin完整HTTPS GET、Git clean通过。CCGateway插件0.1.10包仍 `951e6a0865048e7bab5cd242374cff1d36440f33eee5f24d8fcfd1fd7122bbe3`，不覆盖旧包。

受限只读源码容器的 core ccgateway/features race分别1.047s/1.048s、vet通过。SUB2API_TESTPG=off；schema未变，不宣称重跑数据库测试。

本平台备份 `/home/debian/sup2api-managed/backups/v0.1.69-20261008T082327Z`：dump20246982字节、SHA `04e53dab850f977a16614e71b25171fa6818d7de6cfd18557a7d78cbc666db36`。pg_restore --list通过，未作完整恢复演练。保存本平台配置及四节点事实，四节点当时均0.1.68；目录0700/私密文件0600。

已正常import，准备时preflight blockers=[]、revision131。正式升级仍重新获取即时revision。构建日志 `prepare-0.1.69-e463222d.log`，资产证据 `stage/0.1.69/{verification,preflight}.json`。

## Worker 门禁与核心发布

Worker作者报告：同SHA的Linux engine/Worker/contracts race+vet通过；image `ccgateway-worker:0.1.70` ID `sha256:045a0e72c16b28e7afb88758f777fd1f19d3098d8b216565fe63cb0388b0e6d6`，隔离health/features.catalog.13/CLI2.1.292通过。#22→#21各原地原子替换/restart一次，登录保持，身份/image/mounts前后相同；活跃binary `2b09a0444d680734243f781c3ebc5559ec3ef83dd3155c25a1f8c61a3d45d054`。本轮作者明确未发模型请求。

收到双账号成功信号后，正式重新preflight200无blockers，即时revision创建升级计划 `352f1a1bffa70e2c37cae72efb44bb39`，仅本平台四节点。t62.34s completed|27，66.45s结束，日志 `/home/debian/sup2api-managed/upgrade-20261008T082816.log`。

各节点632次探测，正常为未认证401，仅观测401/维护503，无连接失败样本：

- 节点1：356次503，t22.13–58.21，58.32恢复，36.19秒。
- 节点2：359次503，t22.13–58.52，58.63恢复，36.50秒。
- 节点3：378次503，t22.13–60.51，60.62恢复，38.49秒。
- 节点4：372次503，t22.13–59.88，59.98恢复，37.85秒。

以上为约0.1秒采样区间，不宣称零中断。四节点最终core0.1.69、local/ready=true、stopped=false，corehash/schema一致。CCGateway active/desired0.1.10，四节点包951e6a…、实际运行plugin二进制 `9cac38aef69142e616ceae255b52a4c1ef23e724931daf4a588e304174799af1` 一致。认证读取目录为2026-10-08.13。

## 默认镜像与既有账号保护

完整public配置读取后，只修改images.app为 `ccgateway-worker:0.1.70`；其余字段、秘密存在标记、controller/egress/网络/策略全部逐项相同。runtime/install成功，up_to_date=true；controller仍 `ccg-controller:0.1.47`，`2026-10-08T08:30:32.306196265Z` 启动，实际CCG_APP_IMAGE=.70。

#21/#22前后ID、imageID、原imageRef、mounts、用户、命令及真实auth标签完全相同；没有重建或更改授权。快照 `/opt/ccgateway-runtime/manual-backups/default-image-0.1.70/{before,after}.json`，公共配置证据 `/home/debian/sup2api-managed/worker-default-0.1.70/`。

完整结果保存在 `stage/0.1.69/{nodes-after,deployment-summary}.json`。所有变更结束后才通知根代理开始API验收；本记录没有把health当作实际模型功能验收。
