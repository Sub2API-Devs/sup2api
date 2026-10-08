# Core 0.1.70 发布记录

已完成发布：精确提交 `aa6b3a90500d9b64f85e937ba6d3a5730766b2a0`；catalog `.14`，CCGateway 插件新版本 `0.1.11`，配套 Worker `0.1.71`。仅本平台四节点；不重建账号容器，不改变其镜像引用、卷或授权。

## 构建与校验

OVH 使用 Git fetch 后的新 clean detached worktree `/home/debian/sup2api/release-0.1.70`。已提交 prepare-core-release.sh 使用原 default BuildKit cache、原签名密钥及独立 2 CPU/4 GiB slice。构建日志 `/home/debian/sup2api-managed/prepare-0.1.70-aa6b3a905.log`。

- Manifest：`521a4652f396f75d845ece5eed3f7ff85d1e98724b6d35196f91f4c91989471b`
- Bundle：`cca9641ca3ac82155104f137229a508ecac71a7336f1ecacdf55d2344d1a4467`，110104905 bytes
- Envelope SHA256：`99de1bc719e19065f3fd1567d868527c9ed52816637b30e669422324af051f0b`
- Core SHA256：`aaa0517685300a54df3a1c5a2d1a4d27051d16941a613fc5852fed7074fbd486`
- 新插件包 SHA256：`8d77b9724ccda822640166955109b69449ee59629f2fd32e217fef2a125049b5`
- 新插件 Linux amd64 binary SHA256：`d386b63f33e5cdc7ab3ccf2b85407e94bbfccd6f4844649db9148ce4d4eab051`
- Trust 不变：`e51300373d1ce798114d1b39207dcb0e9dd4b7e9dccaa7e1935f55e334847133`
- schema before/after 同为 `df9d222590f04365c30fcaeb2ce4f9120c7c16ced7b32db751ea0205394b3ed6`

独立核验 Ed25519 manifest 签名、包签名、所有 tar 文件 path/mode/size/hash，以及发布源完整 GET 字节相同。结果 `/home/debian/sup2api-managed/stage/0.1.70/verification.json`。新包用 .11 明确版本身份，不覆盖 .10。

Linux 隔离 2 CPU/4 GiB：SDK manifest/check race 1.119s、platforms 1.016s；core usagerules 1.023s、billing/expr 1.049s、ccgateway 1.047s，相关 vet 均通过。日志 `gate-0.1.70-aa6b3a905.log`。本轮 SQL schema 无变；SUB2API_TESTPG=off，不将本地已知 DB 环境失败或跳过包装成 DB 验证通过。

## 备份与预检

平台备份 `/home/debian/sup2api-managed/backups/v0.1.70-20261008T090414Z`：受限权限 pg_dump、四节点容器配置快照及 compose。dump 20252167 bytes，SHA256 `f3651cc3540132b12b2e8dc0609a22e5131b52fe3d089df9a04bc6579d255834`；pg_restore --list 可读，不宣称完整恢复演练。没有备份或操作其它数据库。

已导入签名 manifest；首次 preflight blockers=[]、revision=133，四节点列表准确。等待 Worker 双账号完成后正式执行时再预检，不使用陈旧 revision。当前阶段没有模型调用。

## 正式切换与维护观测

收到 Worker 作者同 SHA 双账号完成信号：Linux engine/Worker/contracts race+vet 通过；新镜像 `ccgateway-worker:0.1.71` ID `sha256:387e3e0b1278f1e9aaa4896c3b16012fce8e8ec49bbbb0f035bebcb3bd5c5185`，隔离 health/features catalog.14/CLI2.1.292 通过。#22→#21 均原地原子替换，授权登录保持；binary `d229d9d52d0ec720205e007ff2b506ec7687b8291506c6423d3317b0fbead1cd`。作者明确没有模型调用。

正式重新 preflight HTTP200、blockers=[]，创建计划 `4f16063e3a8f97df258c69cb0788f1eb`。t61.87s completed|27，66.02s 观测结束。日志 `/home/debian/sup2api-managed/upgrade-20261008T090834.log`。

每节点627次未认证价格路由探测，正常401；只有401/维护503，无连接失败样本：

- 节点1：355次503，t22.16–58.16，58.26恢复，36.10秒。
- 节点2：356次503，t22.16–58.26，58.37恢复，36.21秒。
- 节点3：377次503，t22.17–60.46，60.57恢复，38.40秒。
- 节点4：368次503，t22.17–59.51，59.62恢复，37.45秒。

这是约0.1秒采样的实际维护区间，不宣称零中断。四节点最终 local/ready=true/stopped=false，core 0.1.70、schema/corehash均匹配候选。CCGateway active/desired 0.1.11；四节点实际运行插件 binary 与新候选包哈希匹配。认证功能目录 API 返回 2026-10-08.14。证据 `stage/0.1.70/{nodes-after,deployment-summary}.json`。

## 默认镜像与账号保留

完整 public 配置读取后仅修改 images.app 为 `ccgateway-worker:0.1.71`；其它字段、秘密存在标记、网络、策略、controller/egress镜像逐项完全相同。runtime/install up_to_date=true；控制器仍 `ccg-controller:0.1.47`，启动 `2026-10-08T09:10:40.920522157Z`，实际 CCG_APP_IMAGE=.71。

刷新前后两个原账号的 ID、image ID/引用、mounts、user、entrypoint、command 和包含授权标签的完整 labels 完全相同。快照仅受限存储于 `/opt/ccgateway-runtime/manual-backups/default-image-0.1.71/{before,after}.json`，未打印授权内容。公共配置结果在 `/home/debian/sup2api-managed/worker-default-0.1.71/`。

所有运行态操作完成后已通知根代理开始真实验收。本部署过程0模型调用，health不替代 Sonnet/地域实际响应验收。失败恢复所需原 core release、平台 dump 与原 Worker 备份均保留；未触及其它服务。
