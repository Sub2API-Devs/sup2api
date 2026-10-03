# 网关托管的主节点优先升级

> 状态（2026-10-03）：OVH 已采用网关托管四节点部署，核心 v0.1.7 上线记录见 [验证记录](../../docs/audits/2026-10-02/MULTINODE-VALIDATION.md)。组件源码、构建入口和命令统一使用 `gateway`。为兼容已有部署，容器仍读取 `/etc/sub2api/shell.json`，现有管理 socket、数据库字段及协议名称保持兼容。从旧 mTLS/`allowed_peers` 网关迁移须先人工更新全部网关。

本入口适用于 Linux、共享 PostgreSQL 和 Redis 的集群。网关监听公网入口并管理本机核心进程，核心只监听回环地址。节点间通过HTTPS传输，并使用Redis中每节点一份的可复用密钥鉴权。每个节点运行自己的核心及插件，不通过远程RPC代替插件运行。

升级允许短暂停机：所有从节点先转发到主节点并停止核心，随后主节点停止、执行迁移并启动目标版本。主节点就绪后恢复服务；从节点在后台逐个更新，核心及插件就绪后恢复本地服务。主节点停机期间所有入口返回 503，管理页面也暂时不可用；网关及其本机管理 socket 保持在线。

核心签名密钥和插件签名密钥彼此独立。核心替换不会覆盖数据库中已安装、停用或已删除的插件状态。新版本必须包含实际可执行的数据迁移和旧任务兼容逻辑，停机并不自动转换任务数据。

## 构建与发布

从 `next/` 构建网关镜像：

```sh
docker build -f deploy/gateway/Dockerfile -t sup2api-gateway:local .
```

网关镜像不包含业务核心。现有 `next/Dockerfile` 的 `build` 阶段继续用于构建带控制台的核心和插件；取出 `/out/bin/` 和需要随首装提供的 `/out/builtin/`，组成独立的暂存目录。不要把市场缓存、私钥或构建目录放入暂存目录。

在可信 Linux 构建机安装 `sub2api-release`（`go build ./gateway/cmd/sub2api-release`）。首次生成发布密钥，私钥留在构建机：

```sh
sub2api-release keygen --out ./keys
sh deploy/gateway/package-release.sh ./stage ./publish ./keys/release.key release-2026 v1.0.0 SOURCE_COMMIT
```

脚本从实际核心读取迁移库存摘要，再签署清单。输出 `<manifest-digest>.json` 和 `<bundle-digest>.tar.gz`，将两个文件以原名发布在 `release_origin` HTTPS 目录下。例如 `https://releases.example.com/sup2api/`。不得覆盖已有内容或复用同一个 release ID 发布不同内容。网关拒绝重定向下载、未知签名、摘要不符、符号链接和未声明文件。

含数据库迁移时，在脚本最后追加第七个参数 `SOURCE_SCHEMA`，填写升级前基线核心的 `schema-contract` 输出。目标摘要仍从暂存目录的新版核心读取。例如：

```sh
sh deploy/gateway/package-release.sh ./stage ./publish ./keys/release.key release-2026 v1.1.0 SOURCE_COMMIT SOURCE_SCHEMA
```

不提供 `SOURCE_SCHEMA` 表示数据库契约不变；若与实际集群不符，预检会拒绝升级。直接使用 `sub2api-release pack` 时，对应参数是 `--schema-before` 和 `--schema`。发布前备份数据库；数据库迁移开始后不能通过切回旧二进制撤销。

`linux-static-v1` 要求核心及插件使用兼容的 Linux 静态二进制；发布机和运行机架构须一致。跨架构构建时直接调用 `pack --os linux --arch ... --schema ...`，schema 必须来自该源版本的实际核心，不能填写任意标签。

## 配置节点

复制 `.env.example` 到 `.env`，填入同一集群的数据库、Redis、主密钥和 JWT 密钥。迁移已有集群时必须沿用原密钥及数据库。

修改 `config/node-a.json` 和 `config/node-b.json`：

- 两节点使用相同的 `cluster_id`、`primary_node`、发布源和可信公钥。
- 公钥为 `release.pub` 文件中的 base64 内容；公钥 ID 与打包参数一致。
- 节点 ID、状态卷、TLS 私钥各自独立。示例把 `node-a` 指定为升级协调节点。
- `peer_url` 必须能被另一节点访问，服务器证书DNS SAN必须包含相应主机名并允许ServerAuth。客户端验证CA及主机名，不再要求客户端证书或`allowed_peers`列表。
- `peer_auth_key` 留空时自动生成节点密钥；也可在配置中指定至少32字节的独立随机密钥。非空的`SUB2API_PEER_AUTH_KEY`环境变量覆盖配置文件，空值视为未设置；Compose分别使用`NODE_A_PEER_AUTH_KEY`与`NODE_B_PEER_AUTH_KEY`，不要给两个节点填写同一个密钥。
- 心跳只续期Redis登记，不更换密钥。登记丢失时自动模式生成新值，配置模式登记原值，其他节点直接读取新登记。普通缓存过期不重启核心；Redis不可用时拒绝新的节点间请求，已通过鉴权的流式请求按原有生命周期收尾。登记失败（节点被停用、同 ID 实例仍在线或 Redis 不可用）时网关不退出，保持维护态并持续重试。
- `plugin_max_bytes`（可选，默认 256 MiB）限制网关保存的单个插件包。插件包保存在状态卷的 `plugin-blobs/`，主节点保存全部非市场插件包，从节点只缓存自己拉取过的包。
- `release_origin` 下载使用系统根证书及 `ca.crt`，可用公开证书；内容由发布签名和摘要约束，节点密钥不会发往发布源。
- `trusted_proxies` 默认为空；若前置 TLS 终止代理，填入其实际连接源 CIDR，代理须覆盖客户端带来的转发头。仅这些直接代理的单值 `http` / `https` 协议头可信。
- 每节点的 `certs/<node>/` 放置 `node.crt`、`node.key` 和 `ca.crt`，权限须允许容器 UID 1000 读取。不要挂载 CA 私钥。

Compose 仅映射两个回环 HTTP 入口，生产反向代理分别指向 8081/8082，检查 `/readyz`。7443 只供容器内网使用；跨机器部署应通过私网连接，核心 18080 不对外开放。外层反向代理的可信网段需要通过网关配置显式设置，不能信任任意客户端转发头。

## 首次启动

初始化独立的 `updater` schema 并导入已签名基线（命令输出该清单摘要）：

```sh
docker compose run --rm node-a init -manifest https://releases.example.com/sup2api/MANIFEST_DIGEST.json
```

全新业务数据库首次启动主节点时显式传入 `serve -bootstrap`。该参数允许初次业务迁移、管理员创建及内建插件安装；准备阶段仅允许推进插件激活，仍不接收业务请求或领取业务任务。正常升级的迁移许可与首装独立，不重做管理员创建或内建插件导入。可通过临时 Compose override 将 `node-a.command` 设为 `["serve", "-bootstrap"]`，启动完成后移除 override 并恢复普通 `serve`。

已有且契约一致的业务数据库直接启动：

```sh
docker compose up -d node-a
docker compose exec node-a sub2api-gateway status
docker compose up -d node-b
```

先确认主节点完成首装，再启动从节点。从节点从主节点拉取已校验制品；插件依据共享数据库中的安装状态自行同步，全部就绪后才能准入。

## 升级和恢复

导入目标版本后，在控制台“系统 → 核心升级”选择版本，执行预检并创建计划：

```sh
docker compose exec node-a sub2api-gateway import -manifest https://releases.example.com/sup2api/NEXT_MANIFEST_DIGEST.json
```

执行顺序：

1. 所有节点预下载并验证发布包。
2. 所有从节点将入口转发到主节点，排空并停止核心及插件；必须收到真实停止确认，不能把失联当作停止。
3. 主节点进入维护，排空并停止旧核心。此时整个集群暂时不可用。
4. 只在主节点启动目标核心并运行数据库迁移，按已批准版本加载插件。检查通过后恢复主节点服务。
5. 从节点依次启动同一目标核心、同步插件并通过检查，再恢复本地流量和后台任务；此前继续转发主节点。

核心升级期间，主节点不把流量转发给从节点；正常服务期间的 CPU 保护可将主节点新请求转移到满足条件的从节点。网关执行后台升级，不要求浏览器保持连接。签名清单不等于启动授权：核心会核对数据库中的本次 boot ID、摘要及准入记录。所有节点完成才提交新集群基线。

管理页面暂时不可用时，仍可从本机 Unix 管理 socket 操作：

```sh
docker compose exec node-a sub2api-gateway status
docker compose exec node-a sub2api-gateway pause -id UPGRADE_ID
docker compose exec node-a sub2api-gateway resume -id UPGRADE_ID
docker compose exec node-a sub2api-gateway rollback -id FAILED_UPGRADE_ID
```

节点管理可从控制台或本机恢复命令进行：

```sh
docker compose exec node-a sub2api-gateway disable-node -id node-b
docker compose exec node-a sub2api-gateway enable-node -id node-b
```

停用节点会持久撤销身份和核心准入，再使Redis登记失效；重新启用只允许它重新登记，仍须完成版本同步、插件加载和准入。主节点停机期间通过本机管理socket执行恢复命令，不依赖控制台在线。

暂停在步骤边界生效，已开始的排空/替换会安全收尾。仅尚未切流的计划允许 `cancel`。失败后先修复原因再恢复同一计划；从节点更新失败时，已就绪主节点继续服务，从节点继续转发。主节点更新失败时保留维护状态，不擅自启动旧从节点。

`rollback` 仅用于数据库和相关协议契约相同、当前插件仍兼容的版本，回到最近一次全部节点完成的基线。取得协调锁及全部节点操作锁后，以新的主节点优先恢复计划接替原计划，也会产生停机窗口。跨数据库契约或不兼容协议的回退被拒绝；需修复迁移或通过数据库备份恢复。不会直接改软链接、强杀写入进程或自动执行向下迁移。

锁用 Redis 互斥并续期；失锁取消执行，不写成功结果。进程或整机重启后，重新取锁并根据 PG 步骤和本地日志恢复。发现上一进程仍存活、遗留子进程组或无法确认的启动意图时，会拒绝启动第二个核心；运维须先核对进程和日志，不能仅凭锁过期删除状态文件。

网关自身和 OS 依赖升级仍通过容器镜像发布。更换网关前先从负载均衡摘除该节点并等待请求排空，再更新容器；不要让新旧网关同时访问同一节点状态卷。

## 自动验证入口

`go test -race ./gateway/... ./runtime-contract/... ./server/internal/app/...` 执行基础测试。设置 `TEST_DATABASE_URL`、`TEST_REDIS_URL` 可运行真实持久化/锁测试；Linux 下再设置 `TEST_CORE_V1`、`TEST_CORE_V2` 指向两个不同源快照构建的核心，执行 `TestRealCoreRollingUpgrade`。该测试需测试数据库用户具备 CREATEDB，仅使用隔离测试环境。

`TEST_SHELL_NODES=3` 可追加三节点验证。设置 `TEST_BUILTIN_DIR`（包含已签名 `.s2plugin`）和 `TEST_BUILTIN_KEY=keyId=base64-public-key` 后，会首装真实插件并验证升级前后插件批准版本/状态不变。`TEST_EXPECT_MIGRATION` 填写只加在 R2 独立源码副本中的测试迁移文件名（该迁移须创建只有一行的 `managed_upgrade_probe` 表），测试会确认它只应用一次。默认保留插件安全隔离；仅在明确不验证沙箱的环境中才使用 `TEST_PLUGIN_DEV_MODE`。再设置 `TEST_MOCK_URL`（用 `deploy/mock-upstream` 启动的模拟上游，核心须能访问）并让 R2 测试迁移包含 `pg_sleep`，会运行 `TestRealCoreFaultsDuringPrimaryFirstUpgrade`：网关重启、新节点加入、迁移中断、Redis 断连、跨停机的异步视频任务与跨登记过期的 SSE。2026-10-02 所用脚本见 [final-check.sh](../../docs/audits/2026-10-02/evidence/final-check.sh)。
