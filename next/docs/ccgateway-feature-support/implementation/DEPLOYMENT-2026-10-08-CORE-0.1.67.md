# 核心 0.1.67 / 默认 Worker 0.1.68 发布记录

2026-10-08，仅本平台四节点；Git-only 精确提交 `9ba4b278217f077e39cc4e31bc63f50658382133`，服务器 clean worktree `/home/debian/sup2api/release-0.1.67`。包含已独审的 inline custom 内部搜索、MCP 输入流桥和并行工具结果尾白保真修复。发布成功不代替用户要求的真实五路 Read 验收。

## 构建及签名证据

沿用 prepare-core-release.sh、default builder/cache 和已有签名密钥，2 CPU/4 GiB、Go并发2。脚本六项测试通过；服务器精确源码readonly容器2CPU/2GiB，core ccgateway/features race测试1.046/1.045秒与vet通过。此次SUB2API_TESTPG=off，未冒称重跑数据库；schema0042与已部署版本完全相同。

- manifest `4696c65b887751a09b1ecb316fe3fa150a72ed3ac88ad0456380b34bfa10395e`
- bundle `62b56d2d7294cab27d32fc70ef551127731024a453e5f39936a296144040ff6f`，110065322字节
- envelope SHA256 `e4ea2975ddb243314e590e2855aa32693c188b521c8fffe597369b610f705758`
- core SHA256 `d40ca055b2df4bc27bf14c4e788a94aa8fee681ef540b52070d1b79e0a18f0e3`
- schema前后均 `df9d222590f04365c30fcaeb2ce4f9120c7c16ced7b32db751ea0205394b3ed6`
- trust SHA256 `e51300373d1ce798114d1b39207dcb0e9dd4b7e9dccaa7e1935f55e334847133`

签名、payload digest、tar全文件路径/模式/长度/哈希、发布源两资产完整HTTPS GET全部通过；Git前后clean。CCGateway插件0.1.10包SHA `951e6a0865048e7bab5cd242374cff1d36440f33eee5f24d8fcfd1fd7122bbe3`，binary `9cac38aef69142e616ceae255b52a4c1ef23e724931daf4a588e304174799af1`，与线上现存实物相同，没有覆盖旧包。

## 备份与门禁

专属备份 `/home/debian/sup2api-managed/backups/v0.1.67-20261008T060906Z`：dump20227924字节，SHA256 `cde48da1f5767ff9cf1f2fa7028f1ca82b849c6a407f8792c12ea49ca6f333f7`，pg_restore --list成功（非完整恢复演练）。私密文件0600、目录0700；保存本平台配置及四节点ID/image/mount/current/previous/version/schema，准备时均0.1.66。

签名候选正常import，首次preflight revision127、blockers=[]。等待Worker作者报告镜像0.1.68健康、CLI2.1.292/catalog.10、双账号原地更新且各真实READY200后，才执行核心升级；Worker具体门禁/补丁记录另列。镜像ID `sha256:6a148f68b718ab9ade96b5e2b6b3350217b1b0b1ba9ba0d15be018a564dcdc04`，运行程序SHA `8adafe7352d044ff94bcfaab49f75fe840a7d2dff372dc8def55a7ac5046ad8d`。

## 实际升级与中断

正式执行再次preflight200、blockers=[]，使用即时revision创建计划 `f4c9d0ef3d72d92748f8e5bd1767ec93`。t=62.47s completed|27，t=66.56s收尾。日志 `/home/debian/sup2api-managed/upgrade-20261008T061344.log`。

每节点633次探测，正常为未认证401，维护期间仅观测401/503，无连接失败样本：

- 节点1：356次503，t22.17至58.27，58.37恢复，观测36.20秒。
- 节点2：366次503，t22.17至59.30，59.41恢复，37.24秒。
- 节点3：371次503，t22.17至59.83，59.93恢复，37.76秒。
- 节点4：363次503，t22.17至58.99，59.09恢复，36.92秒。

这是约0.1秒采样下的区间，不宣称零中断。最终四节点local/ready=true/stopped=false，core0.1.67/hash/schema/manifest一致；插件active/desired0.1.10，各节点实际进程及文件哈希一致。认证读取核心目录为2026-10-08.10。详细事实在 `stage/0.1.67/{verification,preflight,deployment-summary}.json`；构建日志prepare-0.1.67-9ba4b278.log。

## 默认镜像和账号保护

核心稳定后完整读取public配置，仅复制允许保存字段并改images.app为 `ccgateway-worker:0.1.68`；网络/策略/SSH目标、controller/egress及秘密存在布尔均前后一致，未读取或输出秘密。runtime/install200、up_to_date=true，controller仍ccg-controller:0.1.47，启动06:16:21.447147384Z，defaultapp确为.68。

#21/#22前后ID、imageID、原imageRef、卷、用户、命令及真实auth标签完全一致，无账号重建或重新授权。快照 `/opt/ccgateway-runtime/manual-backups/default-image-0.1.68/{before,after}.json`；配置公共证据 `/home/debian/sup2api-managed/worker-default-0.1.68/`。

核心与controller刷新期间和root模型验收串行；全部稳定后通知root进行真实五Read、MCP、inline验收。该记录没有把单READY或健康检查当作多工具功能完成。后续若失败继续保留原请求错误，不用自动重试掩盖。
