# 核心 0.1.68 / Worker 0.1.69 发布记录

2026-10-08。精确 Git SHA `decd22f1f7e43f5fd45f426d192553f1d9f6494e`，服务器 clean worktree `/home/debian/sup2api/release-0.1.68`。核心及默认 Worker 镜像发布已完成，稳定后已通知根代理进行真实验收。后续仅文档提交没有混入构建。

## 已完成准备

复用 Git-only `prepare-core-release.sh`，default builder/cache、既有签名密钥，2 CPU/4 GiB、Go并发2。没有上传本地源码或修改其他服务。

- manifest：`6fd5b5cb63afc69f1cb26a0dda61241fff1e70e73b3d5211aa25d9416eab70df`
- bundle：`4515eefff8d1cc7c8904f98caaf8a877b311922f9995262057ade3ca28faa73b`，110065390 字节
- envelope SHA：`7f09da9f1bf955eed111467ffdb03fa62535289b5d75dd1da6196352c09ba1ae`
- core SHA：`5a1db7662fc992316872460579493316e996c2e6204589eb0a61a919b263d192`
- schema 前后：`df9d222590f04365c30fcaeb2ce4f9120c7c16ced7b32db751ea0205394b3ed6`

签名验证、payload digest、tar 全文件路径/模式/长度/哈希、origin 两资产完整 HTTPS GET、Git clean 均通过。CCGateway 0.1.10 包仍 `951e6a0865048e7bab5cd242374cff1d36440f33eee5f24d8fcfd1fd7122bbe3`，未覆盖旧包。

服务器受限 readonly 源码容器测试：core ccgateway/features race 分别 1.047s/1.045s，vet 通过；SUB2API_TESTPG=off，未宣称重跑数据库，schema 未变。

备份 `/home/debian/sup2api-managed/backups/v0.1.68-20261008T070409Z`：dump 20237714 字节，SHA `01901465e90f403b952788331be08613a65d38b0ee3d169a1647930136d45504`；pg_restore --list 通过（非恢复演练）。私密目录0700/文件0600；保存本平台配置和四节点事实，四节点当时均0.1.67。

已正常 import；准备时 preflight blockers=[]、revision129。正式切换前仍需再次获取即时 revision。

构建日志 `/home/debian/sup2api-managed/prepare-0.1.68-decd22f1.log`；详细核验 `stage/0.1.68/{verification,preflight}.json`。

## Worker 门禁与核心切换

Worker 作者报告精确同 SHA 的 Linux engine/Worker/contracts race+vet 通过；镜像 `ccgateway-worker:0.1.69` ID `sha256:0b77a33491887eba6c4a725031c3f53968f4d392242e3012a55cb2a3d6d10328`，health/catalog.12/CLI2.1.292 验证通过。#22→#21 原容器原子补丁完成、登录保持，每账号各一次 READY HTTP200/end_turn。活跃 Worker 二进制 `56e7db4cc4ba05a04ba3f6b78d5ca702b7a151e540f29e4aa880c63c861cb58d`。收到此成功信号后才执行核心发布。

正式执行重新 preflight200、blockers=[]，即时revision创建计划 `3d0acbc75783fa45f6a67eabaddb51fe`。观察日志 `/home/debian/sup2api-managed/upgrade-20261008T070826.log`：t=61.69s completed|27，65.76s收尾。

四节点各625次HTTP探测，正常为未认证401，仅出现401/维护503，没有连接失败样本：

- 节点1：355次503，t22.20–58.19，58.29恢复，36.09秒。
- 节点2：366次503，t22.20–59.33，59.43恢复，37.23秒。
- 节点3：371次503，t22.20–59.86，59.96恢复，37.76秒。
- 节点4：362次503，t22.20–58.91，59.02恢复，36.82秒。

这是约0.1秒采样观测区间，不宣称零中断。四节点最终 local/ready=true、stopped=false，实际 core0.1.68 和二进制哈希匹配候选；目录版本2026-10-08.12。插件 active/desired0.1.10，四节点实际包951e6a…及运行二进制 `9cac38aef69142e616ceae255b52a4c1ef23e724931daf4a588e304174799af1` 均相同，没有重装覆盖旧版本。

## 默认镜像与账号保持

完整读取 public 配置后仅克隆允许字段并修改 images.app 为 `ccgateway-worker:0.1.69`。其他公开字段、秘密存在标记、controller/egress 镜像及网络/请求策略逐项相同。安全 runtime/install 返回 up_to_date=true；controller仍 `ccg-controller:0.1.47`，启动时间 `2026-10-08T07:10:45.003288881Z`，实际 CCG_APP_IMAGE=.69。

两账号默认更新前后 ID、imageID、原imageRef、mounts、用户、命令及真实auth标签完全一致；未重建、未改授权。快照 `/opt/ccgateway-runtime/manual-backups/default-image-0.1.69/{before,after}.json`；配置证据 `/home/debian/sup2api-managed/worker-default-0.1.69/`。

核心和controller刷新均与真实模型验收串行。全部稳定后通知根代理执行引用续聊、pinned MCP 等真实验收；本记录不把健康/READY或隔离测试当作这些功能的真实提供商证明。
