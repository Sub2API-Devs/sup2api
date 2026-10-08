# 核心 0.1.65 发布记录

## 候选及前置证据

2026-10-08，仅本平台 `sup2api-1..4`。服务器从 Git 获取精确提交 `1186563e47565e938da2cd2b1a9e8be6cd5ac2d5`，干净 detached checkout `/home/debian/sup2api/release-0.1.65`。未上传本地源码。准备脚本 6 项测试通过；默认 Docker builder/cache，临时 slice 限 2 CPU / 4 GiB，Go 并发 2，强制使用已有签名密钥。

0.1.64 是未发布候选：其 0042 幂等门禁失败，保留原签名资产；没有导入或上线，不覆盖、不混用其核心二进制。0.1.65 包含该修复及共享身份头单值校验。既有 0.1.63 的空工具 delta 502、旧插件 count_tokens 503 的实际失败记录保留于公开验收和独立审查文档。

- manifest：`5a85a05409c985fa6aa7f4803a9dfdf2c7aee7bf8407d6d7ecc0061f483b1e58`
- bundle：`812edd6cdce9e4893e5db88d50ec95f585cbe1370a283270fd8fc41df6f5b909`，110064978 字节
- envelope SHA256：`7259bef9827a9a7027f80f3deee1a4752d94d74dcc50c4251442b125d946b9be`
- core SHA256：`3bc10d807170335d54abb33eeb161f2e6718067829625901fd9e70983d5a7f14`
- CCGateway 0.1.10 包 SHA256：`951e6a0865048e7bab5cd242374cff1d36440f33eee5f24d8fcfd1fd7122bbe3`
- 插件 linux/amd64 二进制 SHA256：`9cac38aef69142e616ceae255b52a4c1ef23e724931daf4a588e304174799af1`
- schema_before：`a685e0d83523a7b5a7ee3017a93bd4d7a0a6f82714829374f93c9fcf1586b729`（四节点实际 0.1.63）
- schema_after：`df9d222590f04365c30fcaeb2ce4f9120c7c16ced7b32db751ea0205394b3ed6`
- trust SHA256：`e51300373d1ce798114d1b39207dcb0e9dd4b7e9dccaa7e1935f55e334847133`，与线上相同

Ed25519 签名、payload digest、tar 全文件路径/长度/模式/哈希、两份发布源完整 HTTPS GET 哈希均核验成功，公开文件模式 0644。证据在服务器 `stage/0.1.65/verification.json`；构建日志 `prepare-0.1.65-1186563e.log`。

## 备份与预检

仅备份平台数据库及本平台配置：`/home/debian/sup2api-managed/backups/v0.1.65-20261008T041334Z`。数据库 dump 20206677 字节，SHA256 `cd70fa4c971d996055bd2854f2937e41e171efb1c2898e7ce20c218494ac036d`；`pg_restore --list` 成功，未进行真实恢复演练。备份目录 0700、数据库及私密配置 0600。记录四节点原容器 ID、镜像、卷、current/previous、版本/schema；四个版本均 0.1.63。

候选已按签名 manifest 正常 import；首次 preflight revision 123、blockers=[]、四节点、primary sup2api-1。此阶段尚未切换；正式执行前必须重新预检并等待新 SHA Linux 数据库/race 和 Worker 21/22 更新成功信号。

恢复须协调数据库与四节点核心发行，不能在 schema 已变化后只换旧核心；数据库恢复会丢失备份时间之后写入，不能声称无损回滚。授权状态及账号容器不在本次核心升级变更范围内。

## 执行结果

准备完成后，root 确认当前任务状态为 paused，要求暂停新变更。本轮未执行核心升级计划、配置保存或 runtime/install；没有进行中的原子操作。四节点仍运行 0.1.63，CCGateway active/desired 仍为 0.1.9；默认新建 Worker 镜像仍为 ccgateway-worker:0.1.64，controller 仍为 ccg-controller:0.1.47，egress 原摘要不变。

新 SHA 的 Linux 七包门禁已由 audit 报告通过：609 项通过、2 项可选真实 CLI 跳过；contracts 55 项及 strict 33 项通过，原 0042 三项失败已转绿，race/vet 通过。此为其他 agent 的独立门禁报告，参见对应 Linux 验证文档。Worker 原地更新由 CC agent 单独负责，其最终状态应以其部署记录为准，不能从本核心记录推断。

尚未执行：核心 0.1.65 切换、维护 503 采样、升级后四节点插件 0.1.10 实物核验、默认 Worker 镜像更新及控制器配置刷新。恢复后必须重新核验线上 revision/schema、预检以及 Worker 成功信号；本轮准备和 import 不等于上线成功，也没有因本核心准备产生维护中断。

## 恢复后的正式发布

用户明确要求继续后恢复执行；上述“尚未执行”为暂停时快照，不是最终状态。Worker 作者确认 #21/#22 已原地运行完整提交 1186563 / 0.1.65 / catalog.8，分别真实 READY 200，镜像 `ccgateway-worker:0.1.65` 构建并隔离验证通过。

使用已有服务器 observer，重新 preflight HTTP 200、blockers=[]，采用刚返回的 revision 创建计划 `73b5929c43c44808b7e6887d94881147`。计划于观察器 t=61.89s 完成 `completed|27`，t=66.01s 收尾。日志 `/home/debian/sup2api-managed/upgrade-20261008T042450.log`，完整核验 `stage/0.1.65/deployment-summary.json`。

四节点均 local / ready=true / stopped=false，运行核心 0.1.65，schema_after、core hash、release digest 与候选一致；数据库已执行 `0042_diagnostic_messages.sql`。CCGateway 正常自动 rollout 83 为 active，active/desired 均 0.1.10，数据库包哈希为候选 951e6a08...；四节点运行进程均指向 `0.1.10-951e6a08/bin/plugin`，实物二进制哈希均为候选 9cac38ae...。没有覆盖 immutable 0.1.9，也没有为该插件另行强制切换。

每个入口 627 个约 0.1 秒间隔探测，正常为未认证 401：

- 节点 1：355 次维护 503，t=22.21 至 58.21；t=58.31 恢复 401，观测区间 36.10 秒。
- 节点 2：366 次维护 503，t=22.21 至 59.35；t=59.45 恢复，37.24 秒。
- 节点 3：366 次维护 503，t=22.21 至 59.35；t=59.46 恢复，37.25 秒。
- 节点 4：357 次维护 503，t=22.21 至 58.41；t=58.52 恢复，36.31 秒。

样本仅包含 401/503，没有观测到连接失败；不能据此宣称零中断或所有真实请求均成功。功能验收由 root 另行记录。

## 默认镜像与控制器刷新

重新读取完整 public 配置，只复制允许保存的字段，并仅修改 `images.app` 为 `ccgateway-worker:0.1.65`。保存前后网络、请求策略、连接目标、controller/egress 镜像等均严格一致；秘密不读取、不输出，通过同目标 mergeConfig 保留，秘密存在布尔前后一致。随后调用正常 runtime/install 刷新控制器，HTTP 200；controller 仍为 ccg-controller:0.1.47，新环境默认 app 已为 0.1.65。

前后核对 #21/#22 的容器 ID、image ID、原镜像引用 `ccgateway:0.1.56`、卷、用户及启动命令均不变，没有重建账号。服务器前后快照 `/opt/ccgateway-runtime/manual-backups/default-image-0.1.65/{before,after}.json`；核心配置公共事实 `stage/0.1.65/config-public-{before,after}.json` 及 runtime-after.json。线上 controller 同 network/auth 的保留分支已由 Worker agent 实物核验。

刷新窗口实际出现一次公开 count_tokens 502，不能遗漏：RID `e5ae85862d01a2220454e972`，账号 22，usage 时间 `04:27:25.709Z`，错误是 `openAccountModel` 连接发现阶段 `CCGateway is unavailable`，尚未进入 Worker 请求。新 controller 启动 `04:27:24.893Z`，runtime/install 成功审计 `04:27:28.970Z`，该请求落在启动未健康窗口。已通知 root 在环境稳定后重试并分开记录功能结果，不以旧版 count_tokens 路由 503 解释本次新错误。

环境稳定后 root 已复验 count_tokens HTTP 200：RID `dd3364ed6056c8b951e369e7`，3.763 秒，`input_tokens` 为正整数。脱敏证据 `evidence/public-count-after-refresh-0.1.65.json`；首次运维窗口 502 仍保留，不能被成功重试覆盖。
