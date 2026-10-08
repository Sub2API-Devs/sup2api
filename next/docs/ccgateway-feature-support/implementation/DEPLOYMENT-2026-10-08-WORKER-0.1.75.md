# Worker 0.1.75 发布与 OAuth 生命周期恢复

精确候选 `2bd328b46b18415ff209ecfaa39e71f27c17407c`，服务器Git fetch后创建clean detached worktree `/root/ccgateway-features-2bd328b46`，产物目录 `/opt/ccgateway-runtime/feature-validation-2bd328b46`。没有上传源码；.75镜像tag预检不存在，开始时可用空间9.1GiB。

## 已完成门禁

Go1.27-bookworm，2CPU/2GiB，GOMAXPROCS2；复用编译缓存，不复用测试结果。engine race32.633s，contracts/worker race通过，三模块vet通过。禁网真实CLI2.1.292定向总185.850s：

- helper task-budget JSON/SSE50.77s；V2 inline-budget JSON/SSE66.53s。
- Linux专属单CLI身份计数4.01s：wrapper拒任何auth子命令；每次身份只有一个native process，APIkey上游零调用，OAuth profile恰一次。
- 保存OAuth、APIkey/OAuth原生认证、typed missing issuer、profile/provider错误、取消、输出资源能力与源身份否例全部通过。
- 状态快照默认/自定义路径、无CLI副作用、来源不确定等定向通过。

以上使用假凭据/假上游，不是线上刷新成功证据。

## 更新程序的约束

不再使用旧部署脚本中的`claude auth status`，也不在更新前访问旧/admin/status。before只读容器ID/image/mount及私有凭据hash/存在/到期元信息；after使用新local_snapshot，不将本地presence当在线有效。

原容器按#22→#21顺序唯一备份、原子替换、各重启一次，已完成。允许正常CLI刷新导致token文件合法轮换，不把credentials前后字节一致当身份保留判据。核心/默认镜像/controller由其他代理负责，不在本任务刷新。

## 最终制品和原容器更新

- standalone SHA256：`ac868ed98cefb14753cffd853f23269a170a9b689c044cf359c5511df98065b6`
- 新镜像 `ccgateway-worker:0.1.75`：`sha256:54eecc34e711c80a0792fe679d6dce17d2925ca03079aeef28cb9cf4d2ebdce7`
- 镜像内程序SHA256：`d2c0dd364ece0bf9e525783bd35ad15d0ae6511db9db7e64ee0134007ca198bb`
- 精确Version0.1.75/full revision、OCI revision、modified=false均核实。不同构建参数的standalone与镜像hash分别记录，没有混为同一文件。

新镜像独立禁网fixture：默认8787 health200/features200、catalog2026-10-08.16、helper schema[1]、CLI2.1.292。fixture已移除；旧镜像和备份保留，剩余空间8.7GiB。

新唯一备份：`/opt/ccgateway-runtime/manual-backups/20261008-2bd328b46-22`及同前缀`-21`。旧.74程序hash必须为`0cb68219fdcdc379aa1b9e7e015e2dcee1dafc4d04b3827c0cf82f9961e91bc4`才执行。替换前两次无活动CLI检查，临时程序hash核对后原子rename；每个原容器重启一次，#22健康后才开始#21。

before/after容器ID、imageRef、imageID、mount、labels逐字一致，仍为原`ccgateway:0.1.56`容器镜像引用。凭据存在性和本地账号身份摘要保持；没有Plugin override，Mod随嵌入程序更新。before未执行任何auth/status；after只调用新local_snapshot，其中#22报告stored OAuth存在但access已过期，#21报告APIkey存在，均online_verified=false。

## 一次真实只读身份验证：恢复成功

新版本稳定后，再确认无CLI、无owner，旧current锁为空且已过期2501887ms。仅将它原子移到私有备份`/work/config/.oauth-lock-backup-20261008-2bd328b46/lock`，未修改凭据。没有legacy锁需要搬移。

唯一一次 `GET /_ccgateway/resources/identity`：

- 2026-10-08T13:41:39.517Z—13:41:42.603Z，HTTP200，attempts=1。
- Worker request log：`fcaa69b6-1cfc-4ee7-9002-b05ba14b1207`。
- request_prepared=true、response_received=true、response_status=200、runner_failed=false。
- access expiry从`2026-10-08T10:17:15.085Z`变为`2026-10-08T21:41:41.362Z`，凭据文件hash变化，refresh token仍存在。这是正常原生CLI刷新，不是手工修改token。
- 返回principal同时匹配原本地账号配置派生摘要和之前持久资源identity；generation与原值一致。没有输出账号UUID、令牌或profile正文。
- 请求结束current/legacy/owner三锁均不存在；容器只有docker-init和ccgateway，没有CLI残留。

这证明原账号刷新与真实profile身份验证已恢复，不需要重新授权。本轮没有模型请求，也没有公共helper预算推理验收。root与API代理已收到稳定信号；核心/default/controller后续由API代理独占，避免并行刷新。

## 核心/default/controller稳定后的独立只读核验

API代理报告Core.72四节点/plugin.13及未来默认app.75、controller.48刷新稳定后，本代理独立重新读取两账号：容器ID/imageRef/imageID/mount/path/args/labels与发布后的私有快照逐字一致，程序hash仍为ac868ed98cefb14753cffd853f23269a170a9b689c044cf359c5511df98065b6。health/features继续精确2bd328/catalog.16/schema1/CLI292。

仅调用新local_snapshot：两账号credential_present=true、online_verified=false；#22 access_token_expired=false，#21 auth_method=api_key。未调用profile、模型、CLI auth status或旧status。证据`post-controller-21/22-container.json`、`post-controller-21/22-status.json`位于同制品目录。控制器刷新没有重建账号；后续公开预算推理由root独占执行，本核验不代替推理验收。
