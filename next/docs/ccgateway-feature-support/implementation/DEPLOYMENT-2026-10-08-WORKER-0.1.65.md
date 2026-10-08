# Worker 0.1.65 最终候选部署记录

日期：2026-10-08。执行者 research_cc。状态：#22、#21及新Worker镜像均已完成；核心未由本任务升级。主代理随后通知当前goal实际paused；该通知到达前两个账号已完成所有原地操作和各一次真实READY验证。目前停止所有新远端变更，没有在途构建或部署。此完成记录不是恢复核心升级/默认镜像配置的授权。

## Git来源及受限验证

- 候选：`1186563e47565e938da2cd2b1a9e8be6cd5ac2d5`。服务器Git fetch并新建干净detached worktree `/root/ccgateway-features-1186563e4`，构建前HEAD及工作区干净状态核验通过。没有上传本地应用源码。
- 产物/日志：`/opt/ccgateway-runtime/feature-validation-1186563e4`。Go测试容器限制2CPU/2GiB（实际inspect NanoCpus=2000000000、Memory=2147483648），GOMAXPROCS=2，GOWORK=off；engine、Worker、contracts依次race/vet全部通过。engine race16.246s、Worker实现7.141s；contracts身份头与其余包通过。日志为engine/worker/contracts各自的race.log、vet.log。
- 本候选仅身份头与迁移窄修，主体真实CLI证据复用主代理已验cd4的diag/internal-cache/empty-delta66.208s；不称本次重新执行了这套矩阵。新helper的Linux负例随完整race实际执行。
- 本轮独立构建程序Version=0.1.65、Revision=完整候选SHA：`feature-validation-1186563e4/worker`，SHA256 `b117599a7582626a0917688caa4af15641bbec8b203415b14ad3b19a4450f3da`。

## 新镜像

- 新标签 `ccgateway-worker:0.1.65` 构建前确认不存在；旧0.1.64等镜像保留。使用Git worktree的companions上下文和 `-f worker/Dockerfile`，没有误用旧standalone Dockerfile。
- 顺序构建，legacy Docker builder参数memory=2g、CPU quota200000/period100000；在实际Go RUN容器inspect确认2GiB/2CPU限制。构建日志 `image-build.log`。
- CLAUDE_VERSION=2.1.292、WORKER_VERSION=0.1.65、SOURCE_REVISION=完整SHA；OCI revision label同SHA。
- 镜像ID：`sha256:817701ef7185777de4cfbe35ac3eba9fbb70cbcfba83c96858aa20f534fd264f`。
- 镜像内 `/usr/local/bin/worker` SHA256：`64ca2e8e5d112e0b8784b270ac8c6a43c46f02e69e7499cc249178e0a090f4d3`。它与原地程序因构建flags/path不同，hash不同；两者版本/revision均已实际核验，不混称同二进制。
- 独立fixture key/admin key容器在默认8787启动，/health与/admin/features均200；build0.1.65/fullSHA/modified=false、`code_catalog.catalog_version=2026-10-08.8`、实际CLI2.1.292、runtime_verified=false。未挂账号卷、未调用真实模型。验证容器随后停止并删除，仅删除本次独立验证容器。

## 账号原地更新与恢复路径

升级前live为747c版本，原程序SHA256 `5a9d84063c6dea9214c9aaf058b927cfda68d687cdc696fae2ca74bc35592fd5`。两次过程都先核原ID/hash、无活跃CLI，再独立备份；临时程序复制到容器、核hash、chmod755，再次查无活跃进程后原子mv到 `/usr/local/bin/ccgateway`，原容器restart。#22全部验证成功后才更新#21。

备份路径：

- `/opt/ccgateway-runtime/manual-backups/20261008-1186563e4-22`
- `/opt/ccgateway-runtime/manual-backups/20261008-1186563e4-21`

各含旧ccgateway程序、CLI symlink目标、container-before.json/container-after.json、deployed.sha256、verification.json。前后快照包含ID、image ID/ref、user、mounts、path/args，cmp逐字一致。未复制授权文件或输出任何凭据。需要回滚时可将本账号备份旧程序复制至临时文件、核旧hash、原子替换并原容器restart；本次未触发回滚。

保持不变：

- #22容器ID `9de9b219210f43379014eb2bb991bc7cb813e2ecd92a9ec0830e232e7f1c8e22`，数据卷 `ccg-d1d2964e14bf728d9-data`。
- #21容器ID `6b67d1ffb6e65ffd91a07ff43b18c987e454a2ec20342e064bd33dc91543ae2b`，数据卷 `ccg-21-data`。
- 两者仍引用 `ccgateway:0.1.56`、原image ID `sha256:789f605082fbec34e210d859fac06c9f9603e3ec8f535e249924074a5754b85d`、user1000:1000及原/work与resolv.conf挂载。没有重建容器、替换容器镜像引用或更换授权。

## 实际验收

两账号health/features均成功；build0.1.65/full1186563/modified=false、code_catalog .8、CLI2.1.292。登录仍true：#22 claude.ai，#21 api_key。凭据只在账号容器内存使用；auth status仅输出登录布尔/方式，无email、token、key。

各只发一次真实 `claude-opus-5-5`、max_tokens32短答请求，启用真实上游错误透传并关闭工具搜索，没有失败重试：

- #22：HTTP200/end_turn，准确READY，input65/output4，cache0。
- #21：HTTP200/end_turn，准确READY，input52/output4，cache0。

这只证明部署后的基本真实调用，不能据此声称所有beta/资源/工具/信用真实资格通过。公网核心工具回归由主代理在明确恢复后另行安排。

## 控制器与暂停边界

线上controller镜像仍 `ccg-controller:0.1.47`。只读检查实际/app/manager.py，确认existing且network/auth fingerprint相同直接return state分支存在（结果true）。本任务未更新控制器、未保存默认images.app。API代理已收到暂停消息，明确不会将Worker完成信号当作继续核心升级授权。

## 操作中非业务错误

- 一次shell最后tail参数带CR导致日志打印失败，发生在set-e测试/构建全部成功并已生成hash之后；重新读取contracts日志确认通过。后续远端操作流显式去掉CR。
- 一次只读for脚本缺终止换行报语法错误，后续修正；未修改线上。
- 初次部署检查docker top只给comm、Docker要求PID列，因此在创建备份或替换前停止；改pid,comm后重新开始。未在失败检查后冒然替换。

本地本文未提交。
