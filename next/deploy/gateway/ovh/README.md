# OVH当前部署入口

2026-10-09 18:43：Core .82四个gateway-managed节点`sup2api-1..4`，3130..3133；管理/主入口3130。CCGateway Controller（0.1.49）与账号Worker已从cc-max迁到本机Docker（`ccg-controller`、`ccg-gateway` 公网 `15.204.107.38:18443`、`ccg-21-*`、`ccg-d1d2964e14bf728d9-*`），cc-max 上的旧容器停止保留作回滚；详见环境指南顶部。不在OVH重建账号。

完整[当前状态](../../../docs/ccgateway-feature-support/HANDOFF-2026-10-09.md)、[环境/使用指南](../../../docs/ccgateway-feature-support/ENVIRONMENT-RUNBOOK.md)和精确部署基线集中维护于特性文档目录，不再在这里复制逐版本发布流水。

## 更新原则

1. 本地审查、提交、推送；服务器Git fetch精确SHA，clean detached工作树构建，禁止scp/rsync上传源码。
2. 从仓库内执行`prepare-core-release.sh VERSION FULL_GIT_SHA`。它准备签名制品、备份和预检，不创建升级计划或切服务；版本/制品不可覆盖。
3. 核固定Go编译器、六builtin不可变包、签名/hash、原schema、备份和fresh preflight，再由正常primary-first updater升级。四节点独立核版本/hash/ready，真实服务验收另记。
4. 服务端既有`~/sup2api-managed/upgrade_observe.py`节点映射为`sup2api-*`。仓库同名旧脚本映射不同，**不能直接覆盖服务端脚本或不核映射就运行**；不要传故障注入的第二参数。
5. CCGateway保存未来镜像配置不替换现有账号。#21/#22保留原容器/数据/授权，Worker需显式备份和原子替换程序；Controller更新另走明确步骤。

不要再使用`deploy/single/deploy.sh`，会与管理节点争用3130/3131。也**不要在本目录（或服务器上任何 `release-*/next/deploy/gateway/ovh`）执行 `docker compose up`**：线上节点由 `/home/debian/sup2api-managed/compose.yml` 管理（容器 `sup2api-1..4`/`releases`，卷 `sup2api-managed_sup2api-N-data`，证书挂载路径也不同），本目录的 `compose.yml` 卷名为 `state-N`，起出来是一套用旧状态卷、不心跳、发布服务器缺证书的错误节点（2026-10-09 07:44 发生过）。核心升级只走 `~/sup2api-managed/build-core.sh VERSION` → 主节点 `sub2api-shell import` → `upgrade_observe.py DIGEST`。不要把正常核心升级写成零中断，最近维护窗口约30–38秒。禁止生产DB运行测试fixture；测试使用隔离45432库。

`.env`、keys/certs/stage/publish及私有备份仅留服务器；不要提交或打印鉴权、密码、DSN、完整inspect。更详命令和恢复路径见环境指南。此文替代此前自动踢账号换镜像和tools/ccgateway旧路径说明。
