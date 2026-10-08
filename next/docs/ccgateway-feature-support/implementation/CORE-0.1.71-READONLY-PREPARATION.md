# Core 0.1.71 / CCGateway 0.1.12：只读发布准备

观测时间：2026-10-08 11:16:22 UTC。仅查询 OVH 本平台，未 fetch、构建、导入、创建升级计划、重启或保存配置。待 root 下发精确 Git SHA。

## 当前事实

- sup2api-1..4 均运行 Core 0.1.70，数据库节点状态 enabled=true、ready=true、mode=local；四端口匿名入口均401。没有 running/paused 升级。
- 当前 baseline：`521a4652f396f75d845ece5eed3f7ff85d1e98724b6d35196f91f4c91989471b`。
- 四节点 schema 相同：`df9d222590f04365c30fcaeb2ce4f9120c7c16ced7b32db751ea0205394b3ed6`。
- 四节点插件信任公钥哈希相同：`e51300373d1ce798114d1b39207dcb0e9dd4b7e9dccaa7e1935f55e334847133`。
- CCGateway enabled，active/desired=0.1.11；plugin_versions 没有0.1.12，未覆盖旧包。
- 目标 `/home/debian/sup2api-managed/stage/0.1.71`、`publish/v0.1.71.digests`、`/home/debian/sup2api/release-0.1.71` 和 Docker `sup2api-core-build:0.1.71` 均尚不存在。
- `/home/debian/sup2api/src` clean，观测HEAD为 `aaa7ee9ec43343e6bbb327cbdfd8742d4adad5c0`；这不是本次获准构建的候选SHA。
- 既有release-0.1.70 checkout为 `aa6b3a90500d9b64f85e937ba6d3a5730766b2a0`。本地与此checkout的prepare-core-release.sh哈希相同：`12fec42526fdc6b0ae020fc04a47fbf8f66a491ec406acb18a89e029395911c3`。
- 原release.key/release.pub存在；私钥模式0600，只查询存在性/长度/权限，没有读取或输出内容。
- 管理目录及Docker所在文件系统约890.27 GiB可用，47%已用。default BuildKit builder仍driver=docker，Docker仍systemd cgroup v2。
- 独立测试容器sub2api-next-testdb-pg-1运行，pg_isready报告accepting connections，仅127.0.0.1:45432映射。没有读取DSN或操作生产数据。

## 等待精确SHA后的既有流程

重新核对目标未占用，从服务器Git fetch精确提交并创建clean detached新worktree；不能构建当前任意HEAD或上传本地源树。签名prepare脚本仍使用default命名缓存、原key，独立2CPU/4GiB临时slice、BUILD_MAX_PROCS=2、REQUIRE_EXISTING_DEV_KEY=1。脚本从四个live节点取得source schema，候选必须保留原trust哈希。

本批包含新的helper持久表/迁移，不能沿用上一轮“schema未变化”的结论。应由精确候选重跑受影响Linux DB/race/vet，签名制品完整GET比对，备份本平台数据库与四节点事实，然后才导入/preflight。插件候选必须明确新版本0.1.12，并验证新包/实际binary和升级后的四节点active/desired；不能覆写immutable0.1.11。

只读准备时本地manifest仍写0.1.11，已通知root在候选提交前处理版本身份。Worker配套版本/正式能力广告及核心候选门禁的开放由root另行明确；本文件不授权提前改默认镜像，也不把ABC隔离成功当作生产已经启用。
