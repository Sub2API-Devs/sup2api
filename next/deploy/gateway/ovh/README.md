# OVH当前部署入口

2026-10-09：Core .78四个gateway-managed节点`sup2api-1..4`，3130..3133；管理/主入口3130。Controller与账号Worker运行在cc-max，不在OVH重建账号。

完整[当前状态](../../../docs/ccgateway-feature-support/HANDOFF-2026-10-09.md)、[环境/使用指南](../../../docs/ccgateway-feature-support/ENVIRONMENT-RUNBOOK.md)和精确部署基线集中维护于特性文档目录，不再在这里复制逐版本发布流水。

## 更新原则

1. 本地审查、提交、推送；服务器Git fetch精确SHA，clean detached工作树构建，禁止scp/rsync上传源码。
2. 从仓库内执行`prepare-core-release.sh VERSION FULL_GIT_SHA`。它准备签名制品、备份和预检，不创建升级计划或切服务；版本/制品不可覆盖。
3. 核固定Go编译器、六builtin不可变包、签名/hash、原schema、备份和fresh preflight，再由正常primary-first updater升级。四节点独立核版本/hash/ready，真实服务验收另记。
4. 服务端既有`~/sup2api-managed/upgrade_observe.py`节点映射为`sup2api-*`。仓库同名旧脚本映射不同，**不能直接覆盖服务端脚本或不核映射就运行**；不要传故障注入的第二参数。
5. CCGateway保存未来镜像配置不替换现有账号。#21/#22保留原容器/数据/授权，Worker需显式备份和原子替换程序；Controller更新另走明确步骤。

不要再使用`deploy/single/deploy.sh`，会与管理节点争用3130/3131。不要把正常核心升级写成零中断，最近维护窗口约38秒。禁止生产DB运行测试fixture；测试使用隔离45432库。

`.env`、keys/certs/stage/publish及私有备份仅留服务器；不要提交或打印鉴权、密码、DSN、完整inspect。更详命令和恢复路径见环境指南。此文替代此前自动踢账号换镜像和tools/ccgateway旧路径说明。
