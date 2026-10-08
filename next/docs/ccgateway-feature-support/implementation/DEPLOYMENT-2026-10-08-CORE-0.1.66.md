# 核心 0.1.66 / 默认 Worker 0.1.67 发布

## 精确候选

服务器 Git fetch 并建立 clean detached `/home/debian/sup2api/release-0.1.66`，完整提交 `779c0630d8451ca9ff5840c2a552c5b3568aca0b`。沿用已提交 prepare-core-release.sh、default builder/cache/已有签名密钥，构建限 2 CPU / 4 GiB、Go 并发 2；脚本六项隔离测试通过。

- manifest：`8456c2c6f29c0c36299c301cc385e9a051875885ea2439230ed85637c9adb190`
- bundle：`2faf0d2f9d14476bd27c84fb16598ed749cdbefeada54747c9ef475405614a5f`，110064957 字节
- envelope SHA256：`af6336b14717ba60badd3bdb8c704b258a76e348bd44f221c864458dff290470`
- core SHA256：`ac27403bde0132770cf815b4016662baa54d45d825181c0f211122338f9e07a3`
- schema_before = schema_after：`df9d222590f04365c30fcaeb2ce4f9120c7c16ced7b32db751ea0205394b3ed6`
- trust SHA256：`e51300373d1ce798114d1b39207dcb0e9dd4b7e9dccaa7e1935f55e334847133`

Ed25519 签名、payload digest、bundle 全文件路径/尺寸/模式/哈希，以及两个发布资产完整 HTTPS GET 哈希均通过；Git 构建前后 clean。CCGateway 插件仍 0.1.10，包 SHA256 `951e6a0865048e7bab5cd242374cff1d36440f33eee5f24d8fcfd1fd7122bbe3`、linux/amd64 binary `9cac38aef69142e616ceae255b52a4c1ef23e724931daf4a588e304174799af1`，实物与当前已安装包相同，不需覆盖 immutable 版本或升 0.1.11。

本地受影响 core ccgateway 测试 1.933 秒、features 0.253 秒与 vet 通过；服务器精确 Git 源码 readonly、2 CPU / 2 GiB 容器执行同两包 race 测试 1.047/1.045 秒及 vet 通过。此次 `SUB2API_TESTPG=off`，没有声称重跑数据库门禁；schema 未变，复用前一精确 0042 修复候选的数据库证据。

## 备份与预检

平台专属备份 `/home/debian/sup2api-managed/backups/v0.1.66-20261008T050741Z`。dump 20222155 字节，SHA256 `1ce2d9d7a6b855a8f1df222a6ea5cb72f0d2ea2730d409a4b5c78a7d5f23d02b`，pg_restore --list 成功（非真实恢复演练）；私密文件 0600、目录 0700。同时保存四节点 ID/image/mount/current/previous/version/schema；准备时四节点均 0.1.65。

签名 manifest 已正常 import，首次 preflight revision125、blockers=[]。日志 `prepare-0.1.66-779c0630.log`，证据 `stage/0.1.66/verification.json` 与 preflight.json。

## 实际发布

Worker 作者完成镜像和 #22/#21 原地更新后报告各一次 READY HTTP 200/end_turn、完整提交一致、catalog.9、CLI2.1.292及原身份不变；收到此信号后才启动核心 observer。Worker 0.1.67 镜像 ID `sha256:84ca20e9fa449926f3721b7cc92fed59f5d05aa0fddf6310b92de10aa7869307`，双账号程序 hash `ce7b5dcd3b2edb50b39b8ea9d00c84debf22411ca68d36b534c03f22a41e67b8`。其门禁/原地补丁由 Worker 部署记录单列。

正式执行重新 preflight HTTP200、blockers=[]，采用即时 revision 创建计划 `08730b8784d76876e1b6915506acdfee`，t=62.19s completed|27，t=66.30s 收尾。服务器日志 `upgrade-20261008T051148.log`，结果 `stage/0.1.66/deployment-summary.json`。

四节点 local / ready=true / stopped=false、version0.1.66、corehash ac27403b...、schema df9d2225... 与目标完全一致。CCGateway active/desired 0.1.10、数据库 packageSHA 951e6a08...；四节点进程仍运行 `0.1.10-951e6a08/bin/plugin`，实物 hash 9cac38ae...。认证读取核心目录为 `2026-10-08.9`。

每节点631次探测，正常为未认证401；维护窗口均仅观测401/503，无连接失败样本：

- 节点1：355次503，t22.19至58.14，58.24恢复，观测36.05秒。
- 节点2：365次503，t22.20至59.18，59.28恢复，37.08秒。
- 节点3：357次503，t22.20至58.35，58.45恢复，36.25秒。
- 节点4：378次503，t22.20至60.55，60.66恢复，38.46秒。

这是采样区间，不能宣称零中断或全部真实请求均成功。

## 默认 Worker 镜像同步

核心稳定后重新读取完整 public 配置，只复制允许保存字段，将 images.app 从0.1.66改为 `ccgateway-worker:0.1.67`；其它字段与秘密存在布尔逐项一致，秘密由同连接目标 mergeConfig 保留。正常 runtime/install 返回200、up_to_date=true，controller仍 `ccg-controller:0.1.47`，默认app已.67，启动时间 `05:14:06.318595254Z`。

核对 #21/#22 前后 ID、image ID、原镜像引用、挂载、用户、启动命令及真实授权标签完全相同，没有重建或重新授权。快照 `/opt/ccgateway-runtime/manual-backups/default-image-0.1.67/{before,after}.json`；OVH公共配置与运行结果 `/home/debian/sup2api-managed/worker-default-0.1.67/`。

核心发布及控制器刷新与 root 的模型验收串行；全部稳定后通知开始最终真实 CLI。此操作未额外发模型请求，不把作者 READY 或隔离测试当作真实 per-turn/forced 模型资格证明。
