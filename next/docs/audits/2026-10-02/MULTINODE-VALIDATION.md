# 主节点优先升级与 Redis 节点鉴权：2026-10-02 验证记录

范围：[多节点同步规约](../../MULTINODE-SYNC-PROTOCOL.md) 在 `feat/next-platform`（HEAD `7ec4a9fbc` 之上的改动，随后一并提交）的实现。验证在用户授权的 OVH 隔离 Compose 项目中完成，共三轮：第一轮发现并修复了下文 §3 的问题；第二轮在加入 `0021_plugin_rollout_cleanup.sql` 后对最终源码全部复跑；第三轮补上故障场景的真实三节点测试（§8）。[evidence/](evidence/) 中模块与变异日志来自第二轮，`realcore*.log.txt`、`module-shell.log.txt`、`plugin-build-*.log.txt` 与 `artifact-digests.txt` 来自第三轮。历史滚动升级记录见 [SHELL-UPGRADE-VALIDATION.md](../2026-10-01/SHELL-UPGRADE-VALIDATION.md)，本记录不覆盖它。

## 1. 环境

- 隔离项目 `sub2api-next-managed-check-20261002`、`…b`、`…c`：postgres:16、redis:7、golang:1.27 测试容器；第三轮另有用 `deploy/mock-upstream` 构建的模拟上游容器，核心在测试网络内直接访问它。数据库端口不对外开放。
- 源码：本机工作区 `next/` 全量打包（排除 node_modules、.git、密钥、证书、插件包、可执行文件）后解压到新目录，不使用旧快照或 overlay。第二轮包 SHA-256 `4dbef337e6c0c67efad19bfa173e95f4b210b7db62154c6ba8d5ef944f8826ae`，第三轮 `cd6efe21396fc730ffd9037ec95950592e42d665dbf9c09adfa48aa08d1b774c`。测试插件包（第三轮为 anthropic 与 volcengine）与签名密钥在隔离目录内现场生成。
- 运行脚本与原始日志在 [evidence/](evidence/)；`final-check.sh` 是所用脚本。日志不含连接串或密钥。

## 2. 结果

| 项目 | 结果 | 证据 |
|---|---|---|
| runtime-contract、sdk、tools、mock-upstream、shell、server、7 个插件：gofmt/vet/build/`go test -race -count=1` | 全部通过 | `modules.summary`、`module-*.log.txt` |
| e2e 只编译（gofmt/vet/build） | 通过 | `module-e2e.log.txt` |
| 真实 PG/Redis 用例确实执行（非跳过） | 18 个 PASS，0 SKIP | `db-guard.log.txt` |
| 真实三节点主节点优先升级（真实核心 R1→R2、真实新增 SQL、签名内置插件） | 通过 | `realcore.log.txt` |
| 真实三节点故障注入（§8） | 通过（两次） | `realcore.log.txt`、`realcore-faults-first.log.txt` |
| Pause/Admit 竞态回归能识别缺陷：去掉事务内复核后两条回归失败 | 符合预期 | `mutation.log.txt` |
| 0021 迁移、`TestTwoNodeRollout`、托管核心迁移等相关 PG 用例 `-race -v` 单独复跑 | 全部 PASS | 本文 §3 |
| 外壳 Docker 镜像构建与配置冒烟（第一轮） | 通过（见 §4） | 本文 |
| 完整业务镜像 `next/Dockerfile` 构建（含前端与插件，第二轮） | 通过 | 本文 |
| 本机 GOOS=linux/windows/darwin 构建 server、shell | 通过 | 本机执行 |

真实三节点（`TestRealCoreRollingUpgrade`，名称沿用历史，内容为 primary-first）实际覆盖：

- 节点 b 用配置密钥，a、c 自动生成；节点间只用 HTTPS + Redis 可复用密钥，不要求客户端证书。
- 所有从节点核心与插件进程组停止后主节点才进入维护；主节点迁移时检查从节点真实停止；只有主节点获得 `AllowMigration`，从节点没有迁移/bootstrap 权限。
- R2 额外的 `9999_managed_upgrade_probe.sql` 只应用一次；R1 已应用迁移的 ID 与校验和不变。
- 第三轮 8832 个业务探测请求，0 个意外失败；1639 个 503 都在主节点维护窗口（R2 测试迁移含 4 秒 `pg_sleep`，窗口比前两轮长）；2332 个请求经从节点转发成功（第一、二轮为 8379/1280/2306、8514/1277/2358）。
- 升级不改变插件已安装/启用状态（快照前后一致）。
- 删除 Redis 登记后：b 以原配置密钥重建，c 生成新密钥；两者 shell boot 不变，核心 boot、就绪、本地路由和 PG `ready` 均未受影响。
- SIGKILL 核心后按批准版本以新 boot 恢复。
- 启动即退出的候选版本使计划暂停，全部节点停止、入口 503，不回起旧从节点；同 schema 基线恢复计划完成后入口恢复，后续更新可创建。

R1/R2 由同一控制协议 2 源码构建，不证明从历史协议 1 核心直接托管升级。

## 3. 本轮修复

- **Pause/Admit 竞态**：`Engine.Admit` 的准入写入前只有事务外检查，计划在中间被暂停或新建时仍会写入准入。现在准入事务按计划行、集群行的顺序加共享锁并复核（与 Coordinate/rollback 加锁顺序一致）。新增两条 PG 回归，并用变异实验确认它们能抓到问题。
- **从节点维护态不自动恢复转发**：从节点因主节点不可用退回维护后，要等到自己的计划步骤才恢复转发；基线恢复中排在后面的从节点会在主节点已服务时持续 503。心跳现在会在主节点就绪时把维护态从节点切回转发（不启动核心；主节点和被禁用节点不受影响）。真实三节点恢复阶段因此通过。
- **Compose 默认部署无法启动**：`compose.yml` 未设置节点密钥时传入空的 `SUB2API_PEER_AUTH_KEY`，旧逻辑把空值当作无效覆盖并退出。现在空值视为未设置。
- **发布源证书**：服务进程下载核心包时只信任集群 CA，公开证书的 `release_origin` 会失败；现改为系统根证书加集群 CA，内容仍由签名和摘要约束，节点密钥不进入该客户端。
- **启动时登记失败直接退出**：被禁用、同 ID 冲突或 Redis 暂不可用时外壳退出，管理 socket 不可用。现在记录错误并保持维护态，后续心跳继续重试，引擎在登记成功前拒绝工作。
- **节点内部错误分类**：`AuthorizePeer` 统一返回 401（来源 boot 失效/未登记）、403（方向、范围或制品不允许）、503（存储不可验证），与规约 §4.4 一致。
- **插件上传**：大包解包与哈希移到集群变更锁之前，锁内只保留依赖共享状态的校验和提交。
- 核心 Hello 使用 runtime-contract 的集群/任务协议常量，并增加 SDK Host API 与 runtime-contract 一致性测试。
- 旧用例 `TestTwoNodeRollout` 在真实 PG 下失败：rollout 完成后，清理屏障覆盖了 `plugin_rollout_nodes` 中每个节点的 `active`/`failed` 结果。新增核心迁移 `0021_plugin_rollout_cleanup.sql`，把屏障移到独立表 `plugin_rollout_cleanup`，节点结果保持不变；迁移会搬走开发版写入的屏障行。外壳停机屏障同时检查新表（兼容 0021 之前的开发核心）。`TestTwoNodeRollout` 恢复原断言并同时断言清理跟踪，另有迁移回归。

新增回归：peer 授权分类、密钥来源优先级（含空环境变量）、核心环境过滤密钥、bundle URL 区分发布源与节点通道、enable/disable 本机命令、转发保留 `//`/`.`/编码路径/重复与空 query、业务 401/403 原样返回而节点内部失败（目标或源登记丢失）变为 503、维护态从节点恢复转发、readiness 等待权限撤销收敛。

## 4. Docker 冒烟

在隔离目录用 `deploy/shell/Dockerfile` 构建临时镜像（47 MB），使用示例 `node-a.json`：

- `SUB2API_PEER_AUTH_KEY=`（Compose 未设置时的形态）：通过配置读取，停在示例占位发布公钥校验处。
- 过短的密钥：以 `peer_auth_key must contain 32 to 512 printable ASCII bytes` 拒绝。
- 合法密钥：通过配置读取，同样停在占位公钥处。
- 镜像内 `sub2api-release` 可执行。

这只是镜像与配置冒烟，没有用该镜像跑完整集群。

## 5. 未覆盖与限制

- 测试中的外壳与生产相同代码路径（启动、登记、恢复、引擎循环、HTTPS 监听、监管真实核心进程组），但运行在测试进程内；"重启外壳"是在同一状态目录上以新 boot 重建这些对象，而不是重启独立的 `sub2api-shell` 进程或容器。核心、插件、PG、Redis 与模拟上游都是真实进程。
- WebSocket 跨登记 TTL 已在第 13 节用真实外壳测试（核心本身没有 WebSocket 接口，由回显服务代替核心）。SSE 已在 §8 覆盖。
- 未测试付费上游；视频任务与流式请求只连接模拟上游。
- Windows supervisor 无实际进程测试。
- 非 race 的 6 个 server 包组合运行中出现过一次失败，未能定位用例；随后 14 轮（含 `-count=8`）及第二轮全量 `-race` 均未复现。记录为未定位的偶发问题。

## 6. 清理

第一轮：日志保存后对隔离项目执行 `compose down -v`（共享缓存卷 `sub2api-next-ci_gomod`、`sub2api-next-ci_gocache` 为 external，保留），删除临时镜像和清理时拉取的 debian 镜像，核对绝对路径后删除 `ci/managed.bTbDH5`。第二轮按同样方式清理 `…-20261002b` 项目、临时业务镜像与 `ci/managed.kKn1Z6`；第三轮清理 `…-20261002c` 项目、模拟上游镜像与 `ci/managed.GPjmmb`，之后 :3130/:3131 健康检查均为 200。BuildKit 缓存与该主机其他项目共用，未清理。

## 7. 业务环境部署

用户确认后，提交 `7ad11483c` 并推送 `feat/next-platform`，再用 `deploy/single/deploy.sh` 部署 ovh 上的 `sup2api` 业务栈（两节点 :3130/:3131，共享 PG/Redis）。该栈运行核心本体，不经外壳托管；外壳托管流程本身尚未在业务环境上线。

- 部署前用 `pg_dump` 备份业务库到服务器 `~/sup2api/backups/pre-multinode-20261002.sql.gz`（权限 600，约 506 MB）。部署前库处于迁移 0015。
- 启动时应用核心迁移 0016–0021。两节点 `/healthz`、`/readyz` 返回 200，未鉴权的 `/api/v1/key/prices` 返回 401，控制台首页 200；部署后约 10 分钟内日志中除已知的"插件签名校验已关闭"警告外，没有 WARN/ERROR。
- `single/` 栈持续按包内版本收敛内建插件，这是该栈原有行为，不属于外壳托管的"核心升级不覆盖插件"规则。本次因此自动升级：anthropic、gemini、openai 0.1.7→0.2.0，moderation 0.1.4→0.1.5，volcengine 0.7.0→0.10.0（rollout 46–50 全部 `active`）。插件集合与启用状态不变。

## 8. 故障场景的真实三节点测试

`TestRealCoreFaultsDuringPrimaryFirstUpgrade`（`shell/internal/control/realcore_faults_linux_test.go`）与原测试共用 `realcore_harness_linux_test.go`：真实 R1/R2 核心进程、签名的 anthropic 与 volcengine 内置插件、真实 PG，以及一个 Docker 启动的模拟上游（`deploy/mock-upstream`）。所有外壳和核心经同一个 TCP 代理访问 Redis，测试可以切断它；节点登记 TTL 缩短为 3 秒，以便在测试时长内跨过多次过期。业务数据通过真实控制台 API 创建（管理员、分组、上游账号、用户、余额、API Key）。

每次核心启动都经过观察钩子检查：升级期间任何节点启动旧版本、从节点在新主节点就绪前启动或获得迁移权限、主节点在任一节点（含新 boot）没有真实停止确认时迁移、加入的新节点在计划未结束时启动核心，都会直接判失败。两次运行均无违规。

| 场景 | 做法 | 结果 |
|---|---|---|
| SSE 跨登记过期与密钥更换 | 自动密钥节点 c 转发到主节点 a，模拟上游每 250 ms 推一个事件；流开始后删除 c 的 Redis 登记 | 流持续 13.5 秒（> 3 个 TTL），完整收到 `message_stop`；c 以新密钥重新登记，之后的新请求正常 |
| 停机前已提交的异步视频任务 | 升级前经 b 提交，上游查询被模拟上游挂起；升级排空各节点 | 上游只提交 1 次；3 次查询都用原账号，2 次被排空取消，无并行监控；主节点恢复后续查并结算一次（billed、17 output tokens、`poll_failures=0`），余额正好扣一次 |
| 升级中重启已停止从节点的外壳 | 主节点进入维护前，在同一状态目录上以新 boot 重启 c 的外壳 | 新 boot 在新主节点就绪前不启动核心，并重新写入停止确认；主节点迁移在该确认存在后才开始 |
| 升级中加入新节点 | 同一时刻启动新节点 d | d 登记并写入无步骤的停止确认，计划进行中不启动核心；计划完成后按新基线启动并本地服务 |
| 主节点迁移中断 | R2 测试迁移在建表后 `pg_sleep(4)`；迁移运行时 SIGKILL 主节点核心 | 计划暂停；探针表和迁移记录都不存在（事务回滚）；所有节点核心停止、入口 503 |
| 停机期间 Redis 断连 | 暂停期间切断 Redis 9 秒（3 个 TTL） | 所有登记过期后自动恢复；没有任何核心启动；恢复计划后迁移只应用一次，四个节点都运行目标版本 |
| 服务期间 Redis 断连 | 完成后再切断 Redis 9 秒 | 断连结束后各入口恢复；所有核心 boot 未变、未被重启或关闭 |

第一次单独运行该测试即通过；随后与原测试同批再次通过（`realcore.log.txt`，两项合计 427 秒，`-race`，无数据竞争报告）。shell 模块 `-race` 单元测试同批通过。

## 9. ovh 业务栈迁移为外壳托管四节点并实际升级

用户确认后，把 ovh 上的 `sup2api` 栈从两个 `single/` 容器迁移为四个外壳托管节点（3130–3133，主节点 sup2api-1），沿用原 PG、Redis、插件市场、主密钥、JWT 和管理员。部署文件见 [`deploy/shell/ovh`](../../../deploy/shell/ovh/README.md)。

- 迁移前再次备份业务库到 `~/sup2api/backups/pre-managed-migration-20261002.sql.gz`（约 584 MB）。
- 按 `deploy/shell` 的运维流程：集群 CA 与各节点证书、发布签名密钥（只在服务器）、用镜像构建阶段产出的 `bin/` 与 `builtin/` 打包签名 v0.1.0（与当时运行的核心同源）和 v0.1.1（同源、同 schema，只改版本号），`releases` 以集群 CA 证书提供 HTTPS 下载。
- `init` 通过私有 CA 的发布源导入 v0.1.0；这里发现并修复了 `init`/`import` 不信任集群 CA 的问题（`a18eb93d1`）。
- 切换：停止旧的两个容器（保留以便回退）后启动主节点，约 10 秒后 3130 就绪；三个从节点随后就绪。四个入口 `/readyz` 200，未鉴权业务接口 401，五个插件保持原状态与版本。
- 升级 v0.1.0→v0.1.1：在控制台 API 预检并创建计划，观察器同时记录（[原始记录](evidence/ovh-upgrade-0.1.1.jsonl.txt)、[时间线](evidence/ovh-upgrade-0.1.1-summary.txt)）：
  - 从节点依次转发→停核心：sup2api-2/3/4 的核心与插件进程分别在 17.2 s、24.0 s、31.4 s 消失，这期间四个入口全部正常应答（401），没有 503；
  - 32.6 s 主节点进入维护，四个入口开始 503；38.1 s 主节点旧核心退出，39.3 s 新核心启动，42.7 s 主节点恢复，43.4 s 起从节点入口恢复转发；全集群 503 约 10 秒；
  - 32.6 s 重启已停止从节点 sup2api-3 的容器：重启期间 7 次连接失败，新外壳 boot 重新写入停止确认，直到 56 s 它自己的启动步骤前都没有核心进程；
  - 从节点在主节点就绪后逐个启动新核心（47 s、57 s、65 s），各自准入后切回本地；70.8 s 计划完成，基线为 v0.1.1。全程除重启容器那 7 次外，只出现 401 与维护窗口内的 503，没有失败或暂停的步骤。
- 变化：外壳托管后 `/healthz` 由外壳应答，只返回状态码，不再带核心的 JSON 正文。
- 此后 ovh 不再使用 `single/deploy.sh`，核心更新按 `deploy/shell/ovh/README.md` 发布与升级。

## 10. 插件包改为节点间传输，PG 不再存包

按用户要求：插件包字节不存 PG；市场插件由各节点自己从市场下载，非市场插件（上传、首装）由主节点下发。设计与接口见[规约 §6.2](../../MULTINODE-SYNC-PROTOCOL.md)，核心迁移 `0022_plugin_packages_off_database.sql` 删除 `plugin_versions.package`、新增 `package_url`。

隔离环境（项目 `…-20261002d`，第四轮）全部通过（[真实核心日志](evidence/plugin-packages-realcore.log.txt)、[server -race](evidence/plugin-packages-module-server.log.txt)、[模块汇总](evidence/plugin-packages-modules.summary)）：全部 Go 模块 `-race`、真实 PG 用例、原有两项真实三节点测试，以及新增的 `TestRealCorePluginPackagesTravelBetweenNodes`：

| 场景 | 结果 |
|---|---|
| PG 结构 | `plugin_versions` 已无 `package` 列 |
| 首装插件（anthropic、volcengine） | 主节点外壳保存；两个从节点外壳的存储里都出现这两个包，说明它们经节点网络从主节点拉取 |
| 通过从节点 b 上传 guard | 上传返回前主节点已保存该包；启用后从节点 c 从主节点拉到 |
| 通过从节点 c 从市场安装 relay | `package_url` 指向市场；市场收到 4 次包下载（安装 1 次 + 每个节点各 1 次）；b 的外壳从未从主节点拉这个包；主节点另存一份作兜底 |
| 主节点停机，重启从节点 b | b 用本地缓存的核心版本和插件包，以新的核心 boot 恢复服务 |
| 主节点停机，新节点 d 加入 | 没有缓存，拿不到核心包，不启动核心、入口 503；主节点恢复后 d 自动启动，首装与上传的包从主节点拉取，市场包从市场下载 |

限制：没有外壳的核心只用本机目录，只支持单节点；`deploy/e2e` 与 `single/` 的两节点栈上传插件后另一节点拿不到包，按用户决定，这些部署以后都改为外壳托管。

### 10.1 ovh 部署

用户确认后部署到 ovh 四节点集群：

- 部署前备份业务库到 `~/sup2api/backups/pre-plugin-packages-20261002.sql.gz`。PG 中有 38 个插件版本，包共 496 MB。
- 用 [`export_plugin_packages.py`](../../../deploy/shell/ovh/export_plugin_packages.py) 把 38 个包逐个校验 sha256 后写入主节点 sup2api-1 的外壳存储（`plugin-blobs/`，属主 1000，目录 0700）。
- 逐个替换四个节点的外壳镜像（先从节点后主节点），每个节点约 5 秒恢复，其余节点期间正常。
- 签名 v0.1.2（含迁移 0022，`schema_before` 为 v0.1.1 的 schema），在控制台 API 创建主节点优先计划并记录（[原始记录](evidence/ovh-upgrade-0.1.2.jsonl.txt)、[时间线](evidence/ovh-upgrade-0.1.2-summary.txt)）：68.5 秒完成；从节点停核心期间四个入口全部正常应答；全集群 503 从 32.4 s 到 42.3–44.7 s，约 10–12 秒；迁移 0022 只由主节点执行。
- 部署后：`plugin_versions` 已无 `package` 列，五个插件保持启用与原版本，四个入口未鉴权业务接口 401，日志无新的 WARN/ERROR。对 sup2api-4 的外壳请求一个它本地没有的旧 volcengine 包，外壳从主节点拉取 13,846,219 字节并校验，摘要一致。
- `VACUUM FULL plugin_versions` 回收删除列后残留的空间：表从 529 MB 降到 184 kB。

## 11. CPU 保护

设计见 [规约 §5.1](../../MULTINODE-SYNC-PROTOCOL.md)。在 ovh 隔离目录用独立 Compose 项目（pg16、redis7、mock、golang:1.27）验证，完毕后 `down -v` 并删除目录，保留 external 卷，生产四个入口仍为 401。

| 项 | 结果 |
|---|---|
| 全部 Go 模块 `-race` | 除 server 外全部通过；server 的 `TestTwoNodeRollout` 在与真实三节点测试并行的满载下失败一次（重新启用插件时 rollout 因 `plugin generation changed before instance start` 失败），单独重跑 5 次通过，与本次改动无关，见下方限制 |
| PG/Redis 用例 | 19 通过、0 跳过，含 `TestPostgresCPUOffloadIsMarkedBeforeSheddingAndAuthorizesForwards`（先写标记再转移、先停转移再清标记；阈值与回差；转移只放行 `forward`） |
| 真实三节点 `TestRealCoreCPUOffloadMovesNewRequests` | 通过（[日志](evidence/offload-realcore.log.txt)）。通过控制台 API 开启（阈值 30 被拒）；主节点 a 报 95% 后，经 a 入口的 30 个请求由 b、c 各答 15 个；b 到 75% 后只转给 c；c 也到 85% 时没有目标，a 留在本地处理；a 降到 75% 继续转移，65% 停止；从节点 b 到 99% 时转给 a 和 c；关闭设置后停止。CPU 读数为注入值。日志里“cpu offload stopped”一行的 cpu_percent 打印成了指针，修正后单独重跑该测试通过（该次日志未保留） |
| 其余真实三节点测试 | 升级、故障、插件包三项在改动后的 harness 上全部通过 |
| 真实 CPU 测量 | 在 `--cpus 1` 的容器里跑满一个核，采样器读 cgroup `cpu.max` 得到 98–99.6% |

限制：

- 同一台机器上的节点共用 CPU。ovh 四个节点没有 CPU 配额，容器内可用 CPU 等于整机核数，单节点的 cgroup 占比很难达到阈值；整机满载时四个节点同时超阈值，也没有可转的目标。要在 ovh 起作用，需要给每个节点设置 `cpus:` 配额，或把节点放到不同机器。
- 只转新请求，进行中的请求不迁移；目标恰好在转移途中改变路由时，这一次请求返回 503，不重放。
- `TestTwoNodeRollout` 的偶发失败是已有的插件 rollout 竞态，已在第 12 节修复。

### 11.1 ovh 部署

用户确认后部署（提交 `3323e74ea`、`46b68b461`）：

- 部署前备份业务库到 `~/sup2api/backups/pre-cpu-offload-20261002.sql.gz`。
- 四个节点加 `cpus: 2`（容器内 `cpu.max` 为 `200000 100000`），逐个替换外壳镜像。第一次替换 sup2api-4 时新外壳登记失败（`column nodes.cpu_percent does not exist`）：外壳表结构原先只在 `init` 时安装，`serve` 不安装。该节点入口 503 约 5 分钟，其余三个正常；手动执行 schema.sql 后恢复。随后修正为 `serve` 启动时也安装（加咨询锁，脚本在测试库空库上连续执行两次通过），重建镜像后四个节点重新逐个替换，每个约 5 秒恢复，其余节点期间正常。
- 签名 v0.1.3（无 schema 变化），主节点优先升级（[原始记录](evidence/ovh-upgrade-0.1.3.jsonl.txt)、[时间线](evidence/ovh-upgrade-0.1.3-summary.txt)）：77 秒完成，全集群 503 从 36.7 s 到 46.6–48.1 s，约 10–11 秒。
- 设置是集群全局的：经 3131 开启（阈值 80），四个入口读到的都是同一设置；阈值 30 返回 400。
- 真实负载：在 sup2api-4 容器里跑两个忙循环 35 秒，其 10 秒平均 CPU 到 89.6% 时开始把新请求转给其余三个节点，期间经 3133 的请求都正常应答；循环结束后降到 60.7% 时停止。
- 部署后五个插件保持启用与原版本，日志除上面的转移记录外无 WARN/ERROR。CPU 保护保持开启，阈值 80。

## 12. 插件 rollout 因过时读取误判失败

**现象。** 第 11 节满载运行时 `TestTwoNodeRollout` 失败一次：停用后重新启用插件，rollout 因 `node node-b failed to prepare: conflict: plugin generation changed before instance start` 直接失败。

**原因。** 节点的一次 reconcile 先查 `plugins` 行、再查进行中的 rollout，是两次独立查询。Enable 恰好在两次之间提交时，这一轮拿到的是旧的 `row_version` 和新的 preparing rollout。启动 standby 时 `registerRuntime` 发现代数已变而拒绝，这本是正确的保护，但 `ensure` 把它记成实例启动失败，节点上报 failed，协调者随即判定整个 rollout 失败。生产中同样可能发生，表现为偶尔启用或升级插件无故失败。

**修复。** 代数变化单独用 `errStaleGeneration` 表示，`ensure` 遇到它不记录失败，节点上报 pending，下一轮用当前代数启动。插件卸载中等其他冲突仍按失败处理，过时代数仍不能启动实例。

**验证**（ovh 隔离目录，完毕已清理）：

- 新回归 `TestStaleReconcileReadDefersStandbyInsteadOfFailingRollout` 直接构造这次的过时读取：修复前报出与现场相同的错误而失败（[变异记录](evidence/rollout-stale-mutation.log.txt)），修复后先报 pending、下一轮 ready（[日志](evidence/rollout-stale-regression.log.txt)，0 跳过）。
- rollout 包 `-race -count=10` 通过；`TestTwoNodeRollout` 与整个 server 模块并行再跑 20 次通过；随后 server 模块 `-race` 全部通过（[日志](evidence/rollout-stale-module-server.log.txt)）。

### 12.1 ovh 部署

用户确认后部署：备份业务库到 `~/sup2api/backups/pre-v0.1.4-20261002.sql.gz`；签名 v0.1.4（无 schema 变化，外壳不变），主节点优先升级（[原始记录](evidence/ovh-upgrade-0.1.4.jsonl.txt)、[时间线](evidence/ovh-upgrade-0.1.4-summary.txt)）：77.4 秒完成，全集群 503 从 36.7 s 到 46.6–48.7 s，约 10–12 秒。之后四个节点均运行 v0.1.4 并本地服务，四个入口 401，五个插件保持启用与原版本，CPU 保护仍为开启、阈值 80，日志无 WARN/ERROR。

## 13. WebSocket 经外壳跨节点

当前核心没有任何 WebSocket 接口（网关与插件路由都会去掉 `Upgrade`），旧版 sub2api 的 OpenAI WebSocket 模式尚未移植到 next，因此业务 WebSocket 端到端无法测试。可测的是外壳这一层：`TestRealCoreShellsCarryWebSocketsAcrossNodes` 使用真实外壳代码（公网监听、Redis 节点密钥、节点间 TLS、私有监听）、真实 PG 与可切断的真实 Redis，每个节点的本地路由指向一个代替核心的 WebSocket 回显服务（harness 的 `standInCores`）。客户端是按 RFC 6455 握手与收发帧的最小实现。

| 场景 | 结果 |
|---|---|
| 经从节点 c 建立会话，转发到主节点 a | 101，`Sec-WebSocket-Accept` 原样到达；业务 `Authorization` 到达核心，`X-Sub2api-*` 内部头没有到达；c、a 两个外壳都把会话计入排空计数；70 000 字节的帧正常往返 |
| 删除 a、c 的 Redis 登记 | 两者以新的自动密钥重新登记；已有会话在之后 2 个 TTL（6 秒）里持续收发；新会话正常 |
| 切断 Redis 9 秒 | 已有会话继续收发；新会话被拒为 503；Redis 恢复、登记重建后新会话恢复 |
| a 因 CPU 转移 | 经 a 入口的新会话落到 b；经 c 转来的会话仍由 a 自己处理、不再转发；转移前已开的会话不迁移 |
| 关闭全部会话 | 三个外壳的排空计数和两个回显服务的连接数都回到 0 |

另加单元测试 `TestForwardedUpgradeStreamsOverPeerTLS`：升级连接经节点 TLS 与节点密钥转发后双向流式传输并计入排空。验证在 ovh 隔离目录进行（[日志](evidence/websocket-realcore.log.txt)），同一轮改动后的 harness 上其余四个真实三节点测试也全部通过，shell 模块 `-race` 通过；完毕已清理，生产四个入口 401。

## 14. OpenAI Responses WebSocket 模式

设计见 [OPENAI-RESPONSES-WEBSOCKET.md](../../OPENAI-RESPONSES-WEBSOCKET.md)，契约见 CONTRACTS §35。在 ovh 隔离目录用独立 Compose 项目（pg16、redis7、带 WebSocket 接口的 mock、golang:1.27）验证，openai 0.3.0 与 anthropic、volcengine 一起签名后作为首装插件放进核心包；完毕后 `down -v` 并删除目录，保留 external 卷，生产四个入口 401。

| 项 | 结果 |
|---|---|
| 全部 Go 模块 `-race` | 第一轮 volcengine 的清单测试失败（[日志](evidence/responses-ws-volcengine-first.log.txt)）：它把内置 openai 平台的全部协议与自身实现比较，新加的 `openai.responses_ws` 不在其中。volcengine 不声明 `platform.websocket.v1`，网关不会把 WebSocket 轮次交给它，测试改为只比较非 WebSocket 协议后通过；其余模块全部通过（[汇总](evidence/responses-ws-modules.summary)，[server](evidence/responses-ws-module-server.log.txt)）|
| PG/Redis 用例 | 19 通过、0 跳过 |
| 网关单元测试（真实 WebSocket 与模拟上游，`-count=40` 稳定） | 多轮共用一条上游连接且逐轮独立请求 ID、记录与计费；首个账号握手 401 后换号并禁用；所有账号都被拒时本轮报上游错误、连接保持；非 `response.create`、白名单外模型、无价格、余额不足按轮报错不断开；轮内重复 `response.create` 被拒；上游限流事件冷却账号；`response.failed` 记失败；上游断开以 1011 关闭；客户端断开记为取消并释放账号并发位；排空时空闲会话 1012、进行中一轮完成后 1012、超过宽限期强制 1012；首条消息超时 1008、空闲超时 1000；每 Key 连接上限 429；未声明能力的插件不被调度；握手期限不影响已建立的上游连接；账号模型映射逐轮生效 |
| 真实三节点 `TestRealCoreResponsesWebSocket` | 通过（[日志](evidence/responses-ws-realcore.log.txt)）。经从节点 b 建立会话：首个账号的 key 被 mock 拒绝，换到第二个账号并禁用前者；三轮对话 mock 只收到一次握手、三条消息；PG 中三条 `openai.responses_ws` 记录，用量 120/42/50、扣费大于 0、`node_id=b`。经转发节点 c 建立的会话由主节点 a 处理并记录在 a。排空 b 的核心时会话收到 1012，排空正常完成；客户端经 a 重连后继续，第五条记录写入 |
| 其余真实三节点测试 | 同一轮：升级、故障、CPU 保护、插件包、外壳层 WebSocket 均通过（第一轮完整日志被单测重跑覆盖，未保留） |

限制：未连接真实 OpenAI；ChatGPT OAuth/Codex 账号、上游连接池、`previous_response_id` 断线恢复、HTTP 桥接回退未移植（设计文档 §1）。

### 14.1 ovh 部署

用户确认后部署：

- 备份业务库到 `~/sup2api/backups/pre-v0.1.5-20261002.sql.gz`；签名 v0.1.5（无 schema 变化，外壳代码不变），主节点优先升级（[原始记录](evidence/ovh-upgrade-0.1.5.jsonl.txt)、[时间线](evidence/ovh-upgrade-0.1.5-summary.txt)）：77.6 秒完成，全集群 503 从 37.0 s 到 46.9–49.5 s，约 10–12 秒。
- 核心包附带的插件不会覆盖已启用版本，因此通过控制台 API 上传同一核心包中的 `openai-0.3.0.s2plugin`：签名有效、官方信任，权限与 0.2.0 相同，上传即批准；随后升级 rollout #51 在 2 秒内完成，四个节点都运行 0.3.0。
- 部署后：四个节点运行 v0.1.5 并本地服务；`GET /v1/responses` 不带升级返回 426，带升级但 key 无效返回 401；五个插件均启用（openai 0.3.0，其余版本不变）；日志无 WARN/ERROR。集群里有 2 个 openai 账号，它们连接真实上游，没有用它们发起会话。

## 15. 插件按节点独立更新，迁移由核心执行一次

规则见 CONTRACTS §36。ovh 隔离目录验证，完毕已清理，生产四个入口 401。

| 项 | 结果 |
|---|---|
| 第一轮全部模块 | 除 server 外通过（[汇总](evidence/pernode-modules-first.summary)）。server 两处是新测试自身的问题（[日志](evidence/pernode-module-server-first.log.txt)）：`TestSchemaRoleMigrateDSNDrop` 后面按旧行数断言，而重跑改过的脚本多插了一行；`TestRolloutDoesNotWaitForAStuckNode` 在启用的发布正式结束前就发起升级。改正后 server 模块 `-race` 全部通过（[日志](evidence/pernode-module-server.log.txt)），相关包 `-count=3` 通过 |
| 发布逻辑（PG，两个控制器各代表一个节点） | 节点 B 新版本启动失败：A 照常切换到 3.0.0，B 继续用 2.0.0 服务，发布完成并记录 B 失败；B 恢复后自行切到 3.0.0 并排空 2.0.0。两个节点都起不来：发布失败，提示“没有节点能准备新版本”，都留在旧版本。B 一直卡在启动：准备期满后不再等它，A 切换，B 用旧版本服务，放开后自行跟上。协调节点自己起不来：把协调权交给已就绪节点。数据迁移每次发布只执行一次并有记录（[日志](evidence/pernode-focus.log.txt)）|
| 迁移幂等 | `TestOfficialPluginMigrationsAreIdempotent`：anthropic（含 0.3.0-test 覆盖包）、guard、moderation、volcengine 的全部脚本按顺序执行两遍无错；核心迁移改动已应用文件仍被拒绝，插件迁移改动后重跑一次并更新校验和（含角色隔离下的定义者函数）|
| 真实三节点回归 | 六项全部通过（[日志](evidence/pernode-realcore.log.txt)）|

限制：没有在真实三节点上专门注入“某个节点插件起不来”的故障，这部分由 PG 测试覆盖。迁移在任何节点切换前执行，落后节点上的旧版本会运行在新表结构上，因此迁移必须向后兼容。

## 16. 内置插件随核心一起升级

规则见 CONTRACTS §37。ovh 隔离目录验证，完毕已清理，生产四个入口 401。

- 真实三节点 `TestRealCoreRollingUpgrade`（[日志](evidence/bundle-realcore.log.txt)）：R1 核心包内置 anthropic 0.2.1、openai 0.3.0、volcengine 0.10.1；R2 核心包把 anthropic 换成 0.3.0-test（带新迁移 `0002_add_family.sql`）。主节点优先升级完成后，新核心自动把 anthropic 升到 0.3.0-test，三个节点都运行新版本、旧实例清理完毕，迁移只执行一次；之后回退到 R1 的恢复计划没有把它降级。其余五项真实测试同一轮通过。
- 全部模块通过（[汇总](evidence/bundle-modules.summary)）；PG 用例 19 通过 0 跳过；`BuiltinsCommitted` 在 `BuiltinsReady` 的表格测试中逐例对照（只看集群版本，不看本节点实例）。

### 16.1 ovh 部署（v0.1.6，含 §15、§16）

用户确认后部署：

- 备份业务库到 `~/sup2api/backups/pre-v0.1.6-20261003.sql.gz`；签名 v0.1.6（核心迁移 0023，外壳代码不变），主节点优先升级（[原始记录](evidence/ovh-upgrade-0.1.6.jsonl.txt)、[时间线](evidence/ovh-upgrade-0.1.6-summary.txt)）：77.7 秒完成，全集群 503 从 37.0 s 到 46.9–49.5 s，约 10–12.5 秒。
- 内置插件随核心升级：计划完成 1 秒后（18:30:30）新核心依次发起 rollout #52 anthropic 0.2.0→0.2.1、#53 moderation 0.1.5→0.1.6、#54 volcengine 0.10.0→0.10.1，约 7 秒内全部完成，四个节点都为 `active`，旧实例清理全部 `cleaned`。gemini 0.2.0、openai 0.3.0 已是包内版本，未变；guard 不在核心包中，未动。
- 迁移：`schema_migrations` 记录 0023；三个插件改为幂等的脚本各在集群范围重跑一次（`plugin_migrations` 每个脚本一行，校验和与时间已更新），数据不变。
- 部署后：四个节点运行 v0.1.6 并本地服务，业务入口未带凭证返回 401；CPU 保护仍开启、阈值 80，各节点 CPU 约 0.3%、未转移。
- 日志问题：计划执行期间，已获准协调插件的节点每 12 秒左右就尝试一次内置插件升级，被“核心更新进行中”拒绝，每轮 5 条 ERROR（sup2api-1 三轮，sup2api-2、-3 各一轮）。原因是 `startBuiltinUpgrade` 用 `canCoordinate` 作门槛，而节点在计划的准备阶段就已获准协调插件。结果不受影响，计划完成后第一次尝试即成功，但门槛应同时要求没有进行中或暂停的核心计划，待修正。另有一条 WARN：包内 gemini 0.2.0 与库中已存的同版本内容不同（重新构建、未升版本号），按规则保留已存版本。

## 17. 升级可视化、插件历史与审计（v0.1.7）

实现见 CONTRACTS §38：修复内置插件升级前置门槛与节点版本字段；迁移 0024 持久化发布阶段及节点状态；补充内置升级和核心管理操作审计；新增发布历史接口、审计界面、外壳→核心→插件拓扑、总进度与节点步骤泳道。guard 仍由管理员独立管理，不新增到内置包。

- 本地：server Go 测试、前端类型检查与生产构建通过。前端输出到临时目录，未覆盖工作区原有 `server/web/dist/index.html`。mock 浏览器检查了拓扑、版本与 fallback、升级泳道和审计列表，无控制台错误；未完成深色模式视觉验证。
- OVH：使用独立项目 `sub2api-observe-ac7lwd`，私有 PG 16、Redis 7、源码构建 mock；不发布端口，不连接生产数据库。首次准备遗漏 guard 的忽略目录 UI 构建产物，补建后完成打包；首次业务故障测试发现复用的旧 mock 缺少视频接口，改为独立项目从当前源码构建 mock 后重跑。
- 六项真实多节点回归全部通过（[日志](evidence/observability-realcore.log.txt)，661.5 秒）：升级中断与 Redis 故障、正常升级及基线恢复、CPU 转移、插件包跨节点、Responses WebSocket、外壳 WebSocket。正常升级进行了 8,559 次入口探测，计划内 503 为 1,642 次，其余无失败；内置 anthropic 在三个节点升至 0.3.0-test，迁移一次，新增断言验证发布历史、各节点历史和唯一一条内置升级审计。测试包摘要见 [digests](evidence/observability-artifact-digests.txt)。
- 全模块格式检查、`go vet`、构建与 `go test -race` 最终通过，e2e 只编译（[最终汇总](evidence/observability-modules.summary)）。首轮 server 的旧 `TestManagedRuntimeMigrationDoesNotBootstrap` 只删除 0023 记录，0024 留在库中导致历史缺口；改为删除连续后缀、按同一边界计算预期契约后，单例和 server 完整重跑通过（[首轮汇总](evidence/observability-modules-first.summary)、[首轮 server](evidence/observability-module-server-first.log.txt)、[单例](evidence/observability-migration-focus.log.txt)、[最终 server](evidence/observability-module-server.log.txt)）。业务代码没有因该夹具修正再变更，六项真实测试无需重复运行。
- PG/Redis 专项 19 项通过、0 跳过（[日志](evidence/observability-db-guard.log.txt)）。新增历史事务、去重、失败重试、保留期、接口权限与分页、Unix socket 管理桥审计测试也包含在 server 的完整回归中。前端构建记录见 [日志](evidence/observability-web-build.log.txt)。
- 生产只读核验：四个入口 `/api/v1/me` 未带凭证均为 401；四个外壳与 releases 容器已配置 `json-file`、`max-size=50m`、`max-file=5`，无需重复重建以启用轮转。
- 验证结束后已删除独立项目的容器、网络、临时 mock 镜像及目录，保留两个 external Go 缓存卷；再次核验生产入口与日志配置正常（[清理证据](evidence/observability-cleanup.txt)）。本地 mock 预览进程已关闭。
- 上述验证完成后经用户确认部署，结果见 §17.1。历史不回填上线前的状态，CPU 虚线是候选关系而非流量追踪。

### 17.1 ovh 部署（v0.1.7）

用户确认后，功能提交 `c19d2f506` 已推送并用于构建。生产数据库备份为 `~/sup2api/backups/pre-v0.1.7-20261002T210347.sql.gz`，gzip 校验通过；签名发布 digest 为 `756aa8fe2044a34815f3bb3891db75198174b0a4bad0ec0e26956474c27096e7`。外壳容器未重建。

- 计划 `8cd204029be9745c95a722fd5881f7ff` 完成全部 27 步，观测到完成时刻为 78.38 秒（从创建计划算约 75.2 秒）。各入口 503 自 36.8 秒开始，主节点于 46.8 秒恢复，其余于 48.4–48.5 秒恢复，即约 10–11.7 秒；无其他状态异常。见 [原始观测](evidence/ovh-upgrade-0.1.7.jsonl.txt)、[时间线](evidence/ovh-upgrade-0.1.7-summary.txt)。
- 四节点均为 v0.1.7、本地服务且 ready；迁移 `0024_plugin_history.sql` 已应用。anthropic 0.2.1、gemini 0.2.0、moderation 0.1.6、openai 0.3.0、volcengine 0.10.1 在四节点全部 active，无 standby/fallback；本次包内版本没有更高，因此不产生插件升级。guard 保持独立管理。
- 审计列表、发布列表和 anthropic 历史接口均通过认证访问验证；anthropic 已持久化四个节点的状态。CPU 保护开启、阈值 80，各节点未触发转移；四个业务入口无凭证均返回 401。见 [上线核验](evidence/ovh-upgrade-0.1.7-verify.txt)。
- 生产首页引用的新前端资源已验证：`AuditView-BflBeuok.js`、`NodesView-DnvgxrQ0.js`、`UpgradesView-_igUsw0f.js` 均返回 200。
- 未出现此前内置升级反复被拒的 ERROR。启动仍有原配置 `SUB2API_PLUGIN_VERIFY_SIGNATURES=false` 的 WARN；此次未改变该配置。此升级计划由旧 v0.1.6 核心创建，不会补写为新管理审计；新审计从 v0.1.7 处理的后续操作开始。

## 18. 网关 PG 控制状态、Redis 遥测与升级唤醒（最终隔离验证）

实现规则见 CONTRACTS §39 和多节点规约 §13。组件称呼统一为网关（Gateway），源码与部署目录改为 `next/gateway`、`next/deploy/gateway`，二进制为 `sub2api-gateway`；前端拓扑、升级及 CPU 保护页面同步显示网关。既有 `shell_boot_id`、`shell_protocol`、`shell.json` 保持兼容，历史审计和证据不改名。网关 schema 增加启动身份绑定的遥测能力标记，没有新增核心数据库迁移。

本节记录 2026-10-03 最终源码的隔离验收结果，随后已按 §18.1 部署。网关改动通过重建网关镜像并逐个替换容器交付，单发核心包不会生效；前端命名变化通过 v0.1.8 核心发布交付。

- 隔离环境为 OVH 独立项目 `sub2api-state-cd5brf`，使用私有 PG 16、Redis 7、源码构建 mock，不发布端口、不连接生产数据库。当前验证入口为 `next/deploy/ci/check.sh`，历史 evidence 中的运行脚本保留原样。
- 六项真实多节点回归最终全部通过，共 **524.597 秒**：升级中断与 Redis 故障、正常升级及基线恢复、CPU 转移、插件包跨节点、Responses WebSocket、网关层 WebSocket。该轮使用完成命名迁移、Redis 时间安全修复后的最终代码，而非用先前一轮代替最终结果。见 [最终真实回归](evidence/gateway-state-realcore.log.txt)。
- 全模块格式检查、`go vet`、构建与 `go test -race` 最终通过，e2e 仅编译。初次 gateway 模块在 `gofmt` 检查阶段失败，尚未进入该模块后续检查；格式修正后完整重跑 gateway 的格式、vet、build 与 race 测试并通过。其余模块通过。见 [最终汇总](evidence/gateway-state-modules.summary)、[初次汇总](evidence/gateway-state-modules-first.summary)、[gateway 初次日志](evidence/gateway-state-module-gateway-first.log.txt)、[gateway 最终日志](evidence/gateway-state-module-gateway.log.txt)、[server 日志](evidence/gateway-state-module-server.log.txt)。普通模块运行未提供真实核心路径时跳过的 RealCore 用例，由上一项独立真实回归覆盖，不把跳过算作通过。
- PG/Redis 专项 **30 项通过、0 跳过**，包含迁移幂等、升级创建/暂停/恢复/回退、核心准入并发检查、节点禁用后的停止确认、CPU 转移授权，以及新增状态拆分测试。见 [数据库专项](evidence/gateway-state-db-guard.log.txt)。
- 混合版本兼容测试按旧网关的 SQL 读写方式验证：新从节点保留低频 PG 心跳与 CPU；回退旧二进制后的新 boot 不读取前 boot 报告；实时停止报告不能代替 PG 的计划绑定停止证明。禁用节点不仅写入停止证据，还必须被协调器确认停止步骤并通过迁移屏障。这些是兼容路径测试，不声称已完成生产新旧二进制混合部署验收。
- 遥测验证 TTL、Redis 清空后恢复、错 boot/控制快照拒绝、迟到序号拒绝，以及纯 CPU/错误观察更新不改变 PG 行的 `xmin`。新鲜度采用 Redis TIME 生成固定截止时间、Lua 写入剩余 TTL、原子读取报告及 PTTL；PG 等待与 Redis 往返计入本地单调时钟预算，读取节点按本地单调时钟折算报告年龄，不依赖跨主机壁钟一致。覆盖时钟偏差、迟到重放不能续期、慢提交过期和 API 拒绝旧序号；报告过期或 Lua 拒绝时返回错误，防止继续启用旧的 CPU 转移目标。见 [遥测专项](evidence/gateway-state-telemetry.log.txt)。
- 通知测试验证集群隔离、合并、Redis 重启重订阅、通知全部丢失时仍通过轮询完成两节点升级，以及没有状态变化时不触发连续推进。步骤结果先提交 PG，再上报执行后的节点状态并通知；锁丢失不能记完成。测试超时留有 CI 调度余量，不作为升级性能基准。
- 前端类型检查和生产构建通过，输出到临时目录，保留原有未提交的 `server/web/dist/index.html`。本轮没有新增浏览器视觉验收。见 [前端构建](evidence/gateway-state-web-build.log.txt)。
- 网关滚动替换工具通过 15 项保护条件测试，默认 dry-run，要求无活动核心计划、只改变四节点镜像、保留回退镜像及配置，按从节点先、主节点后的顺序执行。持久化配置前再次检查全部四节点的健康、镜像与新启动身份。见 [部署保护测试](evidence/gateway-roll-guard.log.txt)。生产替换记录见 §18.1。
- 隔离验证完成后已移除独立项目容器、网络、专用 mock 镜像及已核对绝对路径的临时目录；保留 external Go 缓存卷。生产四入口仍返回 401，日志轮转保持 50m × 5，无活动升级计划。见 [清理核验](evidence/gateway-state-cleanup.txt)。

### 18.1 ovh Git 构建部署（gateway + v0.1.8）

用户明确授权通过 `ssh ovh` 同步 Git 后构建更新。功能提交 `ae0249fa2` 已推送，OVH `~/sup2api/src` 快进到该提交；直接运行仓库中的 `next/deploy/gateway/ovh/prepare.sh`，在 OVH 构建网关镜像及签名核心包，没有上传本地产物。生产 PG 备份为 `~/sup2api/backups/pre-v0.1.8-20261003T070557Z.sql.gz`，gzip 校验通过；原配置另备份在 `pre-gateway-20261003T070557Z/`，prepare 前后四节点 JSON 内容一致。

- 网关镜像 `sup2api-gateway:ae0249fa2`，ID `sha256:097107120158ea3f9eb486e022027fe07ade4071891f8a10e5d9b08ce2eb322a`。先 dry-run 验证只有镜像差异，再按 2 → 3 → 4 → 1 替换；逐节点及最终全体复查通过，正式 Compose 与 `.env` 已记录新镜像。入口进程为 `sub2api-gateway`，原有配置、协议字段与旧二进制别名继续兼容。
- 原运行镜像元数据已不可用，因此显式指定保留的 `sup2api-shell:local` 作为回退镜像；工具逐节点核对 gateway/release 两个二进制哈希一致后才接受，回退镜像及配置记录于 `~/sup2api-managed/gateway-rollbacks/20261003T071047Z-0f981add/`。未删除数据卷、未重建 releases、未运行 single 部署脚本。
- 网关替换观测总长 31.51 秒，每个入口分别约 5.12 秒不可用（连接失败及 503），四个窗口互不重叠；这是单入口重启中断，不承诺固定连接自动切换。见 [替换记录](evidence/ovh-gateway-0.1.8-roll.txt)、[HTTP 采样](evidence/ovh-gateway-0.1.8-http.jsonl.txt)。
- 随后导入核心 v0.1.8：manifest digest `16174eaba7803f5724fffcbf1d7b2d60b77cfad6e6fe98b67ac0ac2e6dbcac22`。计划 `52ff082a57cc8da1b7d7473af695c25f` 完成全部 27 步，观测时刻 3.13 秒创建、25.39 秒完成，约 **22.26 秒**。各入口 503 从 15.6 秒开始，分别于 20.1、21.6、20.2、20.8 秒恢复，即约 **4.5–6 秒**；无其他状态异常。相比 §17.1 的约 75 秒流程更短，但这是两次实际发布观测，并非受控性能基准。见 [原始记录](evidence/ovh-upgrade-0.1.8.jsonl.txt)、[时间线](evidence/ovh-upgrade-0.1.8-summary.txt)。
- 四核心均为 0.1.8、local/ready；anthropic 0.2.1、gemini 0.2.0、moderation 0.1.6、openai 0.3.0、volcengine 0.10.1 在四节点全部 active，无 standby/fallback。guard 仍独立管理。审计、发布历史、插件历史接口及四节点 HTML 引用的 JS 均通过访问核验；无凭证业务入口返回 401。
- 生产间隔 8 秒的两次取样确认：四节点 `telemetry_boot_id` 均绑定当前 gateway boot，Redis 序号持续增长且 TTL 有效，而 PG 节点行 `xmin` 与 `last_seen` 不变。证明稳态遥测不再持续改写 PG，不代表网关完全不访问 PG。见 [上线核验](evidence/ovh-upgrade-0.1.8-verify.txt)。
- 新建升级的 `system.upgrade.create` 审计记录存在。四容器都运行目标镜像，日志轮转仍为 50m × 5；本轮新容器日志无 ERROR，只有既有关闭插件签名验证配置的启动 WARN。见 [运行时核验](evidence/ovh-gateway-0.1.8-runtime.txt)。

## 19. 拓扑视角与自有 GitHub 核心更新（2026-10-03）

- 节点视图新增“图表 / 拓扑图”切换，保留原详情卡片，默认用组件节点和连接关系展示 gateway、核心、插件；支持缩放、滚动和跨节点转发/CPU 候选箭头。核心报告过期时显示未知，灰色归属线不代表实时流量。
- 左上角显示核心版本及新版本提示，设置新增公开 GitHub 仓库地址。导入受信签名发布后跳转并选中目标版本，继续使用原预检与计划；不会直接替换运行核心。配置空值关闭检测。参见 CONTRACTS §40 和 [发布资产说明](../../../deploy/gateway/github/README.md)。
- 本地前端类型检查和构建通过，输出到 TEMP，未改写原有未提交 dist。浏览器使用模拟数据验证了视角切换、缩放、版本面板、签名发布导入后的目标预选，以及完整 GitHub URL 保存规范化后检测结果切换；模拟活动计划仍阻止开始新升级。浏览器验证不是实际 GitHub 下载验收。见 [构建记录](evidence/online-update-web-build.log.txt)。
- OVH 私有 PG/Redis 项目 `sub2api-online-sfz5x6`：gateway `go vet`、构建、完整普通 `go test -race` 通过，顶层 85 项通过；需要额外真实核心制品的 6 项 RealCore 用例跳过，本轮未声称重跑 §18 的真实多节点六项。覆盖来源规范化、PG 持久化、缓存绑定基线和源修订、来源变更与导入竞争、取消不缓存、已安装同摘要、同版本不同签名身份、旧来源不静默替换等。GitHub HTTP 用模拟 transport 验证重定向域/协议限制、签名、缺失/不匹配资产、bundle 校验及非公网目标拒绝。见 [gateway 回归](evidence/online-update-gateway.log.txt)。
- server app/updater/httpapi 的 vet、全模块构建和相关 `-race` 测试通过：19 项、0 跳过。验证改源需要权限及二次认证，导入沿既有敏感权限，审计仅记录成功操作并包含仓库/tag/digest。见 [服务端回归](evidence/online-update-server.log.txt)。
- 初次上传因根 `.gitignore` 的 `release/` 规则遗漏新增 GitHub provider 源文件，已为真实 Go release 包增加例外；随后 vet 发现测试复制带锁 Manager，已改成独立实例并完整重跑 gateway 通过。这两次前置失败未计为测试通过。
- GitHub 资产导出工具 4 项测试通过，验证原签名字节保留、仅导出声明资产、拒绝 payload/bundle 篡改和输出目录覆盖；另用生产已有 v0.1.8 的签名包只读导出到隔离目录成功，未上传任何 GitHub Release，未复制签名私钥。见 [资产工具测试](evidence/online-update-assets.log.txt)。
- 测试后已停止并移除 `sub2api-online-sfz5x6` 私有容器与网络，核对绝对路径后删除 `online.sFZ5X6`（包括测试导出的资产），保留 external Go 缓存卷；本地模拟预览进程已关闭。

### 19.1 OVH v0.1.9 上线

沿用已授权的 Git 同步、服务器构建及网关滚动替换流程，部署功能提交 `d7c31a7af`。数据库备份 `~/sup2api/backups/pre-v0.1.9-20261003T082940Z.sql.gz` 已通过 gzip 校验。

- 网关镜像 `sup2api-gateway:d7c31a7af`，ID `sha256:4e7d50471c4a9c8fae64a016ae381db9890383cbc77bfb35120e0879a447f0ee`。按 2 → 3 → 4 → 1 顺序替换，每节点与最终全体健康检查通过。总观测 29.85 秒，各入口分别中断约 4.98–5.14 秒，无四入口同时中断。回退配置及原镜像记录为 `~/sup2api-managed/gateway-rollbacks/20261003T083234Z-9812cf26/`。见 [滚动记录](evidence/ovh-gateway-0.1.9-roll.txt)、[采样](evidence/ovh-gateway-0.1.9-http.jsonl.txt)、[汇总](evidence/ovh-gateway-0.1.9-summary.json)。
- 核心签名 manifest digest `d75f903267998ea9d30fed3d0b01154b3749a514d615306a7d3578b82a94a803`；计划 `02907eefd59f6eee1b6b13713248f418` 完成全部 27 步，观测从 3.13 秒创建到 25.52 秒完成，约 22.39 秒。各入口 503 从 15.6 秒开始，在 20.1–22.4 秒恢复，即约 4.5–6.8 秒。见 [原始记录](evidence/ovh-upgrade-0.1.9.jsonl.txt)、[时间线](evidence/ovh-upgrade-0.1.9-summary.txt)。
- 四节点均为核心 0.1.9、local/ready；五个插件版本保持既有值且全部 active，无 standby/fallback。接口、前端 HTML 引用 JS、401 鉴权边界通过；8 秒取样再次确认 Redis 更新、PG 节点行不随遥测改写。
- 四入口认证调用 `/system/version` 均返回 `managed=true, version=0.1.9`；更新源为空，`/system/update-check` 明确返回未配置且无更新。没有擅自选择或写入用户的 GitHub 仓库，没有创建 GitHub Release；因此生产验证的是新接口和关闭状态，GitHub 网络/制品异常由隔离模拟传输测试覆盖，并非宣称已从真实 GitHub Release 完成一次升级。见 [上线验证](evidence/ovh-upgrade-0.1.9-verify.txt)。
- 四容器目标镜像、入口程序与日志轮转（50m × 5）均正确，新容器日志无 ERROR。见 [运行时记录](evidence/ovh-gateway-0.1.9-runtime.json)。

## 20. Vue Flow 交互节点图（2026-10-03）

- 将静态 SVG 拓扑替换为 Vue Flow + d3-force。网关、核心、插件是独立圆节点，按所属集群节点分簇，提供拖动、平移、缩放、自动布局、适应画布、可折叠概览、点击详情与邻接高亮。原图表视角保留。
- 浏览器使用四节点、五插件的本地模拟数据验收：28 个组件节点、24 条归属边；转发场景另出现 1 条主节点转发边、2 条 CPU 接收候选边。候选仍是推算关系，不宣称实时请求流量。
- 实际指针拖动改变坐标，超过 5 秒自动刷新后坐标保持；放大从 0.580454 到 0.696544，刷新后保持；画布平移后的 transform 也保持。点击核心显示版本、状态、启动身份、地址并高亮邻接；概览开关、图表切换卸载与重建通过。浏览器控制台无 error。
- npm run typecheck、生产构建通过（989 modules，7.51s）；产物位于 TEMP，保留原有未提交 dist。节点图路由块约 250.29 kB / gzip 83.19 kB。本轮只改前端，无数据库迁移、网关状态或升级协议变化。

### 20.1 OVH v0.1.10 上线

功能提交 c29b5866e 已推送并在 OVH 快进同步，由服务器 Git 工作区构建签名核心包。数据库备份 ~/sup2api/backups/pre-v0.1.10-20261003T090026Z.sql.gz 已通过 gzip 校验。

- manifest digest 为 e5f260243b0645411b6d0a6269baacc0eef5750b6282d877f1ac7a45980deab0。计划 4fb45439f097039087248e862410bd64 完成 27 步，从观测 3.13 秒创建到 24.92 秒完成，约 21.79 秒；各入口 503 约 4.4–7.2 秒。见 [原始记录](evidence/ovh-upgrade-0.1.10.jsonl.txt)、[时间线](evidence/ovh-upgrade-0.1.10-summary.txt)。
- 四核心均为 0.1.10、local/ready，五插件版本保持且全部 active。历史、审计、版本、更新源接口与静态 JS 通过；PG 节点行保持稳定，Redis 遥测持续更新。见 [上线核验](evidence/ovh-upgrade-0.1.10-verify.txt)。
- 未重建网关容器，启动身份与运行镜像仍是 v0.1.9 时的值。prepare 会重建本地网关镜像标签，镜像摘要变为 af4c84fea266127c120418a0b6bad891a3a5517afbb912895ced8eb6abb0f35c；原镜像元数据已不可访问，无法重新打标签，但核对新镜像和运行容器中 gateway/release 两个二进制 SHA256 完全一致。实际运行容器没有切换镜像。
- 四入口节点图 JS 均返回 200 且包含 Vue Flow；日志轮转保持 50m × 5，本次升级日志无 ERROR。见 [运行时核验](evidence/ovh-upgrade-0.1.10-runtime.json)。

### 20.2 主从角色展示补充

- 根据用户反馈，进一步把 primary_node 对应网关放在中心并使用星标、双环及升级主节点标识；外围网关明确显示升级从节点，补充升级协调关系连线。主节点只协调升级控制流程，业务仍可在各节点独立处理，不能把协调线当作实际请求流量。
- 角色来源必须是成功的网关状态报告，且主节点在报告集合中存在；缺失或读取失败时不推断主从。主节点变更计入布局身份，日常刷新仍保持用户位置和视角。
- prepare 增加 SKIP_GATEWAY_BUILD=1，用于仅更新核心时复用现有网关制品，避免重新构建和改写网关镜像标签；默认仍保留原有构建行为。
- 主从版浏览器核验：1 个主节点、3 个从节点、3 条升级协调关系；角色摘要明确 sup2api-1，节点详情显示升级角色，标签不折断；类型检查与最终生产构建通过，见 [构建记录](evidence/primary-nodegraph-web-build.log.txt)。

### 20.3 OVH v0.1.11 上线

- 功能提交 854f23350 已推送并在 OVH 从 Git 构建；备份为 ~/sup2api/backups/pre-v0.1.11-20261003T090741Z.sql.gz，gzip 校验通过。本次使用 SKIP_GATEWAY_BUILD=1，复用网关镜像工具，仅升级核心。
- manifest digest ca2449a463d8f890a4d1e9f05f36b409666d49f26867ac667a147402457a7918；计划 7b51446aa8bc29bf29b934840e1aa475 完成 27 步，从创建到完成约 21.83 秒。各入口 503 约 4.5–5.8 秒，网关容器及启动身份不变。见 [原始记录](evidence/ovh-upgrade-0.1.11.jsonl.txt)、[时间线](evidence/ovh-upgrade-0.1.11-summary.txt)。
- 四节点核心 0.1.11、local/ready，插件全部 active；主从版节点图 JS 在四入口返回 200，并包含 primaryRole/coordination 逻辑。版本、历史、审计、鉴权和 PG/Redis 分工检查全部通过，无本次 ERROR。见 [上线核验](evidence/ovh-upgrade-0.1.11-verify.txt)、[运行时核验](evidence/ovh-upgrade-0.1.11-runtime.json)。

## 21. 当前访问节点标记（2026-10-03）

- 已认证版本接口返回实际核心节点 ID/boot；公网入口网关仅在成功响应覆盖入口身份头。客户端和下游伪造头被清除，私有转发跳不签发公网入口身份，gzip 正文保持不变。前端同次请求读取头与正文，区别当前访问网关和本次响应核心，不猜测缺失身份。
- OVH 私有环境 current-node.VDJUM4 / sub2api-current-vdjum4：gateway proxy/cmd/control 的 vet 与 -race 测试通过，63 顶层通过、6 个需要额外真实核心制品的 RealCore 用例跳过；server app/httpapi 的 vet 与 -race 测试通过，17 顶层通过、无跳过。覆盖真实测试 HTTP 转发、本地/CPU 转移、私有入口、伪造头、鉴权、gzip，并执行现有 WebSocket/SSE 回归。本轮不声称重新跑过真实核心升级故障注入。见 [gateway 测试](evidence/current-node-gateway.log.txt)、[server 测试](evidence/current-node-server.log.txt)。
- 浏览器四场景通过：local 为入口2/核心2；routing 为入口4/核心1；legacy 无入口头时仅标核心1；failure 503 时两个标记均清空。主从角色保留，核心标记匹配节点 ID 及 boot。前端客户端专项测试还验证 401 刷新、403 二次认证后读取最终响应头，失败不采集身份；执行命令 node scripts/http-headers-test.mjs。
- 前端类型检查及生产构建通过，产物位于 TEMP，原有未提交 dist 未改写。见 [构建记录](evidence/current-node-web-build.log.txt)。独立代码审查未发现阻断问题。

### 21.1 OVH v0.1.12 上线

- 功能提交 3a2017de8 已推送并通过 OVH Git 工作区构建。备份 ~/sup2api/backups/pre-v0.1.12-20261003T091818Z.sql.gz 已通过 gzip 校验。隔离测试容器及网络已移除，并核对绝对路径后清理 current-node.VDJUM4；本地四个模拟预览进程和浏览器标签已关闭。
- 网关镜像 sup2api-gateway:3a2017d，ID sha256:6097e75847d14de6402a5aad1b5007b768f3a5b58cdf0de1c439d80a669a7f10。dry-run 验证仅镜像变化，按 2→3→4→1 更新并逐个检查启动身份、核心基线、ready/local 和 401；总耗时 28.67 秒，单入口中断约 5.12–5.22 秒，采样未出现四入口同时不可用。原镜像元数据缺失时使用两个二进制哈希均匹配的 sup2api-gateway:d7c31a7af 回退镜像；回退记录在 gateway-rollbacks/20261003T092722Z-e1c0f76b。见 [dry-run](evidence/ovh-gateway-0.1.12-dryrun.txt)、[滚动记录](evidence/ovh-gateway-0.1.12-roll.txt)、[采样](evidence/ovh-gateway-0.1.12-http.jsonl.txt)、[汇总](evidence/ovh-gateway-0.1.12-summary.json)。
- 核心 manifest digest 3390359cc782d852e766cca123565a5111aecee7dd7d9ddd2552718bbf752d72；计划 f8c071d5c9717b1f23806861bc6116e1 完成 27 步，从创建到完成约 21.83 秒。各入口核心更新 503 约 4.5–7.3 秒。见 [原始记录](evidence/ovh-upgrade-0.1.12.jsonl.txt)、[时间线](evidence/ovh-upgrade-0.1.12-summary.txt)。
- 四核心均为 0.1.12、local/ready，五插件版本保持且全部 active；历史、审计、鉴权、PG 稳态行与 Redis 遥测检查通过。向四个真实入口请求版本接口并附客户端伪造身份头，返回的入口和核心 ID 分别正确匹配 sup2api-1..4，核心 boot 与注册身份一致。生产稳态为本地处理，跨节点转发与 CPU 场景由隔离 HTTP 测试和浏览器 mock 覆盖，没有人为改动生产路由制造转发。见 [上线验证](evidence/ovh-upgrade-0.1.12-verify.txt)。
- 四入口新节点图 JS 均返回 200 且包含身份逻辑；运行目标镜像，日志轮转保持 50m × 5，新网关与核心升级日志无 ERROR。见 [运行时核验](evidence/ovh-upgrade-0.1.12-runtime.json)。

### 21.2 主从名称简化与 v0.1.13

用户要求界面直接使用“主节点 / 从节点”。提交 846e2ce6d 统一中文及英文的节点标签、顶部统计、详情角色与升级页标签；协调关系说明保留。前端类型检查与构建通过（7.60 秒），输出到 TEMP，原 dist 修改保持不动。

OVH 从 Git 构建核心 v0.1.13，复用既有网关镜像，未替换网关容器。备份 pre-v0.1.13-20261003T100113Z.sql.gz 校验通过。manifest digest 77600fb9383d16f68ebb3384894dce1dff5fdbe88ca8085ae26a8b63e59a57ba；计划 e82d1e09b36557781934ee9a0fbee607 完成全部 27 步，从创建到完成 22.13 秒，各入口 503 约 4.6–7.5 秒。四核心版本、插件 active、访问身份/boot、接口与 PG/Redis 检查全部通过；四入口实际返回的中文资源均含新标签且不再含“升级主节点”。见 [采样](evidence/ovh-upgrade-0.1.13.jsonl.txt)、[时间线](evidence/ovh-upgrade-0.1.13-summary.txt)、[上线核验](evidence/ovh-upgrade-0.1.13-verify.txt)、[文案核验](evidence/ovh-upgrade-0.1.13-labels.json)。

## 22. 火山方舟插件 0.11.0（2026-10-03）

两种稳定类型 ID 分别显示“字节火山方舟 · 官方通用”和“豆包视频”。官方新增原生 Anthropic Messages，OpenAI/视频仍使用官方路径；豆包视频新增独立视频任务端点与素材库端点，保留旧账号配置与文本兼容能力。素材库不再在 relay 缺少地址时隐式回退到官方，签名使用准确请求路径。权限集合未扩大，核心、网关及数据库结构均无修改。

参考 new-api 的 `plugins/tasks/doubao/plugin.js`、`relaykit/dto/channel_settings.go`、`service/assetlib/upstream.go`、`common/asset_library_key.go`；官方 Messages 路径及认证另核对火山方舟官方文档，未沿用参考项目中经 OpenAI 转换的旧实现。

- 本地插件 vet/test、前端类型检查通过；独立安全审查未发现阻断项。
- OVH 私有测试项目 `sub2api-ark-w3tbrd`：完整 vet 与 race 测试顶层 **106 通过、0 跳过、0 失败**，含数据库任务/素材库回归、HTTP 路径与签名检查。见 [完整测试记录](evidence/volcengine-0.11.0-tests.log.txt)。
- 浏览器使用 `SUB2API_MOCK_VOLCENGINE=1` 的只读 fixture，直接读取实际 manifest/schema，检查两种账号表单和路径帮助；自定义字段按单行文本输入显示。没有保存真实账号，也未调用付费上游视频生成。

### 22.1 OVH 插件独立上线

功能提交 `6cf124291` 已推送，OVH 快进同步 Git 后以 Docker build 阶段构建，提取签名插件包；没有替换核心包或网关容器。备份 `~/sup2api/backups/pre-volcengine-0.11.0-20261003T104349Z.sql.gz` 通过 gzip 校验。

- 包 `~/sup2api/plugin-releases/volcengine-0.11.0/volcengine-0.11.0.s2plugin`，SHA256 `4e3e73edc2671154693e4e8038c0ad41497eb6cd2697c2472fb4d54150cf5503`。管理 API 校验 official/valid，宿主兼容，无新增/扩大的权限，自动沿用授权。上传首次因未携带二次认证提前断开，按正常密码确认取得 step-up token 后成功；没有绕过认证。见 [安装校验](evidence/volcengine-0.11.0-upload.json)。
- 发布 **55**：0.10.1 → 0.11.0，2026-10-03 10:46:42.802206 UTC 创建，10:46:44.805092 UTC 完成，约 **2.003 秒**，四节点 active。原采样脚本误等待终态出现在 current 接口（完成后该接口返回 null），因此采样持续到 120 秒超时；另用发布历史只读核验终态通过，未重复发起升级。见 [原采样](evidence/volcengine-0.11.0-roll.jsonl)、[最终核验](evidence/volcengine-0.11.0-final.jsonl)。
- 每个入口 477 次鉴权探测全部 401，无 503 或连接失败；这证明探测期间入口可用，不代表运行了付费模型请求。四节点 volcengine serving=0.11.0、active，无 standby/fallback；核心仍为 0.1.13，core boot 与升级前一致。四入口均返回新账号类型、官方 Anthropic 平台及新端点表单。
- 完整只读核验通过，包括历史/审计 API、静态文件、访问身份、PG 稳态行与 Redis 遥测；网关镜像仍为 `sup2api-gateway:3a2017d`，容器启动时间未变化，本次日志无 ERROR。见 [系统核验](evidence/volcengine-0.11.0-verify.txt)、[运行时](evidence/volcengine-0.11.0-runtime.jsonl)。
- 私有测试容器与网络已清理，核对绝对路径后移除测试工作区，保留共享 Go 缓存。本地表单预览进程与标签已关闭。

## 23. 账号界面整理（2026-10-03）

参考 new-api 默认主题渠道列表与 channel-mutate-drawer 的信息分层，使用本项目现有 Vue/UI 组件实现，不引入 React 或改变账号 API。

- 列表将 ID、名称、插件类型、最近使用合并展示；分组标签、状态原因、并发与优先级/权重更紧凑。筛选栏支持高级条件收起、已生效提示、一键清除与紧凑显示；总数来自服务端，不把当前页当全局统计。
- 新建类型支持服务商/类型搜索。编辑窗口扩大并分成接入配置、模型配置、调度与限流；凭证靠前，底部操作固定，窄屏导航横排。分区使用 v-show 保持插件组件与输入状态，验证失败返回相应区域。
- 原生约束在提交入口显式寻找第一个无效字段，切换到对应分区后显示浏览器提示，避免隐藏字段无法聚焦或多个错误抢焦点；schema、iframe/native 凭证校验和提交 payload 保留。重复插件名称展示已合并。
- 类型检查和生产构建通过（8.93 秒），产物在 TEMP，保留原 dist 修改。见 [构建](evidence/accounts-web-build.log.txt)。独立代码审查与浏览器验收覆盖类型选择、输入跨区保持、缺少凭证返回接入区、多项无效数字返回首项、搜索及高级条件清除、密度开关和 390px 窄屏；浏览器无 error，没有修改真实账号。

### 23.1 OVH v0.1.14 上线

功能提交 `1a58ab1f4` 已推送，OVH 从 Git 构建签名核心，使用 `SKIP_GATEWAY_BUILD=1` 复用原网关。备份 `~/sup2api/backups/pre-v0.1.14-20261003T110647Z.sql.gz` 通过 gzip 校验。核心 manifest digest `97910a9171a3624f5332cf28ecda81693fed0a5723855cc7d30f1d1fcda38fd9`。首次预检在导入制品前返回 404，登记签名制品后预检无阻断，才创建计划。

计划 `43a058ce02550c2fc77ae411c1cee1e3` 完成全部 27 步，观测创建到完成约 22.45 秒；各入口 503 约 4.5–7.3 秒。四节点核心均为 0.1.14、local/ready，volcengine 保持 0.11.0，其余插件版本不变且 active。鉴权、版本身份、历史与审计 API、PG 稳态与 Redis 遥测检查通过。四入口实际返回 `AccountsView-Be4x68Km.js`，包含新列表与分区校验逻辑。网关镜像及容器启动时间不变，本次日志无 ERROR。

见 [采样](evidence/ovh-upgrade-0.1.14.jsonl.txt)、[时间线](evidence/ovh-upgrade-0.1.14-summary.txt)、[系统核验](evidence/ovh-upgrade-0.1.14-verify.txt)、[前端与运行时核验](evidence/ovh-upgrade-0.1.14-runtime.jsonl)。另在普通 mock 中编辑已有账号并从模型分区保存成功，原凭证留空保留提示与模型回填正常。本地两个模拟预览已关闭，未修改生产账号。

## 24. CCGateway next 集成与 OVH v0.1.15（2026-10-03）

用户明确要求将旧版 CCGateway 管理功能接入 next 并部署 OVH。功能提交 `e9b6e4f50` 增加 `/system/ccgateway` 管理页（系统设置、插件列表均有入口），加密 SSH/sidecar 配置、Docker 管理、代理及 OAuth 管理；`ccgateway` 0.1.0 插件提供无需账号密钥的 `managed` 类型，仅支持 Messages。模型与账号测试由核心精确匹配插件、类型及虚拟 URL 后转发，其他账号保持原私网访问防护；沿用既有鉴权、调度、限流、JSON/SSE 用量计费。

验证使用 OVH 独立项目 `sup2api-ccgateway-eypkbe` 的 PG/Redis，未连接生产数据库。相关服务端包及插件 `go test -race`、`go vet`、编译通过；数据库加密/审计/模型转发测试与 JSON/SSE 网关入口用例实际执行，未跳过。插件 linux/amd64、linux/arm64 打包通过。前端类型检查、临时目录构建、OAuth 链接与会话校验、双语键检查通过，本地模拟管理页无浏览器错误。

发布在 OVH 从 Git 构建，保留 gateway 镜像 `sup2api-gateway:3a2017d`。数据库备份 `~/sup2api/backups/pre-v0.1.15-20261003T124432Z.dump` 已用 pg_restore 目录读取校验。0.1.14 与 0.1.15 schema-contract 相同。manifest digest `8731191ad7c21e319ffb693fbbc070e5368108a51a1893c7abcabf95f3fb1e7f`，bundle digest `7608a94dc2866ce95eb8458fa73a0da136538148f1b4ef5a7d2becef636ae9ec`。

计划 `86807adfc443bfedb71a6e205020376a` 完成全部 27 步，从创建到观测完成约 22.42 秒；四入口 503 约 4.5–5.7 秒。四核心均为 0.1.15、local/ready，CCGateway 0.1.0 已启用且四节点 active。部署后四入口均实际提供 `CCGatewayView-DJjjpaBe.js`，本次四节点日志 ERROR 计数为 0。

OVH 已配置到 cc-max 的专用 SSH 私钥，端口转发限定远端 127.0.0.1:8787；私钥及两个容器密钥经管理员 API 加密持久化，不写入账号、审计或本记录。四入口均通过 Docker 连接、容器状态、网关健康与代理读取验证，代理保持 inherit/revision 3。Claude 状态为未授权，未创建生产调度账号，未执行云端模型调用；需要用户在管理页完成 Claude OAuth 后接入账号。

证据：[服务端测试](evidence/ccgateway-next-server-tests.log.txt)、[插件竞态测试](evidence/ccgateway-next-plugin-tests.log.txt)、[插件打包](evidence/ccgateway-next-package.log.txt)、[升级采样](evidence/ovh-upgrade-0.1.15.jsonl.txt)、[升级时间线](evidence/ovh-upgrade-0.1.15-summary.txt)、[四节点验证](evidence/ccgateway-v015-verify.txt)。用户原有 `server/web/dist/index.html` 修改和交接文件继续保留，未纳入提交。

### 24.1 插件显示名称调整

用户澄清：仅 CCGateway 插件名称使用英文，其余界面继续适配多语言；火山插件中文名称改为「字节火山方舟、豆包视频」。CCGateway 原有 name.en/name.zh 均为 CCGateway，已内置并启用，不更改管理页语言。

提交 `e92d0fbae` 将 volcengine 名称改为中文「字节火山方舟、豆包视频」、英文「Volcengine Ark, Doubao Video」，发布 0.11.1。现有清单测试通过，OVH 从 Git 构建签名包并通过管理员 API 升级，四节点 active。包 SHA256 `6902dfcb949456078fe44afb609407368b42282a89afc743bbc18a1b151bf341`。没有更换核心或 gateway。

现有插件升级不会刷新 plugins.name，因此在版本收敛后，使用事务仅将该字段同步为已验签、指定 digest 的 0.11.1 manifest.name，并记录 plugin.name.sync 审计（含旧名与新名）。四入口再次确认新名称与版本，CCGateway 保持 builtin/enabled。见 [四入口名称验证](evidence/plugin-names-0.11.1.jsonl)。

### 24.2 插件设置入口与 OVH v0.1.16

提交 `870151ec6` 为声明 schema 设置的插件增加列表行内设置按钮，CCGateway 管理页放入自身详情的设置页签，旧地址重定向，移除列表顶部和系统设置的专属入口。保留多语言与权限检查。本次仅调整页面归属，CCGateway 的 SSH、Docker、授权业务仍在核心，未宣称完成插件解耦。

前端类型检查、临时目录生产构建、插件 API 包测试通过。OVH 从 Git 构建 v0.1.16，数据库备份 `/home/debian/sup2api/backups/pre-v0.1.16-20261003T133128Z.dump` 经 pg_restore 目录校验。与 v0.1.15 schema-contract 一致。manifest digest `c41d3d2264f5df4512bc5c918bac07af5128d656fdc2822d369cde2f7b1172c5`，bundle digest `1fd7b504d56fb3c1dcd441cef2619566390cfb6538b24d6873dea41821c80df3`。

计划 `5e8c433078dc54b3a682d3abae25b1b0` 预检无阻断，完成全部 27 步，创建至完成约 23.26 秒，入口采样 503 持续约 4.7–7.3 秒。四入口均报告核心 0.1.16，实际静态文件包含行内设置按钮、详情内嵌管理页及旧路由重定向；列表 API 返回 has_settings。验收脚本已适配 CCGateway 页面改由 PluginDetailView 异步加载。

四节点 CCGateway 0.1.0 enabled/active，SSH Docker 连接与健康检查通过，代理保持 inherit/revision 3，Claude 仍未授权；未执行模型调用。自本次发布前 13:32 UTC 起的四节点日志 ERROR 计数均为 0。Gateway 镜像保持 `sup2api-gateway:3a2017d`。

证据：[升级采样](evidence/ovh-upgrade-0.1.16.jsonl.txt)、[时间线](evidence/ovh-upgrade-0.1.16-summary.txt)、[入口与静态文件核验](evidence/plugin-settings-v016-verify.jsonl)、[远程连接验证](evidence/ccgateway-v016-verify.txt)。本轮通过 API 和实际发布文件验证，未新增浏览器交互验收。

### 24.3 账号独立容器与代理出口：OVH v0.1.17

功能提交 `f5bf3db7c`，发布源码 `664446e86`。OVH 和 cc-max 均从已推送 Git 源码构建。核心支持账号 ID 路由、代理版本校验和变更同步；远程 Docker SDK 控制器管理每账号业务容器、数据卷、隔离网络和 sing-box 出口。普通模型请求不写代理配置。此前用户要求取消的 CCGateway 二次密码确认也随本版上线，登录与权限检查保留。完整插件/核心解耦仍未完成。

上线前确认四节点 local/ready、上一计划 completed，生产没有存续 CCGateway 账号，旧共享容器未登录 Claude。数据库备份 `/home/debian/sup2api/backups/pre-v0.1.17-20261003T143517Z.dump` 已通过 pg_restore 目录校验；新旧 schema-contract 相同。

核心 manifest digest `bce6037066046f19c54f064f6ea57a4311390321678bd7702b7c6662b979adde`，bundle digest `61729f587ea26a809ac8de77b985f6f082b1a159e634083e32af43e4e275eadd`。计划 `eb0b71f3019f771d8f589148fca3c7d4` 预检无阻断，完成 27 步，创建至完成约 23.39 秒；四入口采样 503 约 4.6–6.6 秒。

cc-max 控制器先在 18787 验证鉴权，再停止保留旧 `ccgateway` 容器，由 `ccg-controller` 接管 127.0.0.1:8787，未公开 Docker API 或控制器端口。状态目录 `/opt/ccgateway-runtime` 为 0700，私有环境文件为 0600；新控制器密钥经已固定主机指纹的 SSH 读取到内存，再经管理员 API 加密保存，未写入源码或证据。控制器使用固定镜像 ID：

- business: `sha256:f932a297826ee2f3d357fdfe8dbd7bb2d8b51e12e5e4fd975f57adad8f736fbf`
- egress: `sha256:1b86d28994088831707f7b215dc9a10a1c4ff0f7aadf26a0b159c3c29a6b4eeb`
- controller: `sha256:aacacfd73160095890ba9e6c4c9c7ddec57872a4736e04ab3d2d810ce90635ac`

四入口 account_runtimes=true，核心版本均 0.1.17，插件 CCGateway 0.1.0 四节点 active；实际页面文件 `CCGatewayView-BGtlswZF.js` 包含账号运行管理。OVH 到控制器的 SSH direct-tcpip HTTP 鉴权验证通过；本次配置 PUT 无 step-up token 成功。四节点 14:37 UTC 以来 ERROR 计数为 0。Gateway 镜像与容器未替换。

旧加密配置备份在 OVH `~/sup2api-managed/ccgateway/pre-v017-config.encrypted.json`，旧远程业务容器及数据卷保留。回退需先恢复控制器端口到旧容器，再恢复原加密连接配置；不要在新账号已投入使用后直接执行旧模式回退。

未创建生产测试账号、未填写真实代理、未完成 Claude OAuth 或发起模型调用。网络隔离、并发、HTTP/SOCKS5、DNS、断代理阻断与恢复已在上一轮隔离环境验证，见 [运行环境验证](../../../../tools/ccgateway/runtime/VALIDATION.md)。本轮验证上线后的版本、配置、页面文件、鉴权和 SSH 转发，不将其描述为真实模型调用成功。

证据：[采样](evidence/ovh-upgrade-0.1.17.jsonl.txt)、[时间线](evidence/ovh-upgrade-0.1.17-summary.txt)、[四节点与转发验证](evidence/ccgateway-v017-verify.jsonl)。后续使用 `python3 verify-account-runtimes.py` 检查新版；旧 verify-ccgateway.py 针对共享容器，不适用于账号模式。

### 24.4 CCGateway 双认证与真实代理调用：OVH v0.1.18

2026-10-04（北京时间），功能源码 `d0fabc4dc`，回归测试补充 `45df24181`。CCGateway 0.1.1 提供 OAuth（兼容原 managed）与 API Key 两种账号类型，使用同一业务镜像、独立容器和代理出口。API Key 与 Base URL 经标准账号 API 校验并加密保存，读取时密钥掩码；控制面通过固定主机指纹的 SSH 同步凭证。更换凭证重建该账号业务容器并保留卷，代理变化仅重建出口。API Key 账号拒绝 OAuth 操作及旧共享运行模式。没有伪造 OAuth 授权结果。

插件单测、核心 ccgateway 数据库集成测试、account 完整包测试、go vet、前端类型检查和生产构建通过。gateway 首次回归中 CCGateway 两项测试因仅有调度内存假账号、缺少权威数据库账号失败；补齐数据库 fixture 后所有 TestCCGateway 子测试通过，并补测 API Key 不能误用共享容器。其余 gateway 测试在首次运行中通过。隔离 Docker 测试覆盖密钥轮换、数据保留、OAuth 环境恢复、代理更新不重建业务容器，以及两个账号 16 次并发、HTTP CONNECT/SOCKS5、DNS、阻断直连与重启恢复，全部通过。

OVH 从 Git 构建核心 0.1.18，备份 `/home/debian/sup2api/backups/pre-v0.1.18-20261003T184653Z.dump` 经 pg_restore 目录校验，schema-contract 未变。manifest `2a2a704e11f4ec2178e056b3560c2b07dadc780c811da1d54dd6aa20158630ed`，bundle `dfee56889207f4f8b39125702704d05bebb82cdbeab3e19d1ed535dc6c65dd08`。升级计划 `b4b79799c3cca635866e9d93b42f9791` 完成 27 步，创建至完成约 23.37 秒，四入口 503 采样约 4.6–6.0 秒。四核心 0.1.18、CCGateway 0.1.1 四节点 active；两种账号类型及 API Key 表单均通过四入口验证，静态管理页为 `CCGatewayView-9gpd20ro.js`。发布至验收时四节点 ERROR 为 0，未替换 gateway 容器。

cc-max 控制器由同一 Git 源码构建，固定镜像 `sha256:95d00e6d164a8fc19a81ce3544f608938eeda5bd51bf9abe88490bb251f6d861`；业务和 sing-box 镜像沿用 v0.1.17 的固定 ID。旧控制器停用保存为 `ccg-controller-v017`，仍只通过 SSH 访问 127.0.0.1:8787。存在 API Key 账号后不要回退控制器而继续使用新版账号。

通过正式账号 API 创建 **账号 21：CCGateway API Key 联调测试**，绑定已有代理 6，配置用户指定的十个模型。旧临时注入账号 20 已停用，其业务容器停止并保留数据。新账号由控制器自动配置 `ccg-21-app`，健康结果为 `api_key`；验证读取密钥掩码、携带掩码编辑后仍正常、OAuth start 返回 400。容器以 UID 1000、cap-drop ALL 运行，无代理环境变量，控制器 state.json 不含上游密钥。API Key 本身按此认证方式注入业务容器环境，不等于对 Claude Code 隐藏 API Key。

实际链路为 OVH 网关 → 核心 → 固定指纹 SSH → cc-max 控制器 → 账号独立业务容器 → sing-box → 用户提供的 HTTP CONNECT 代理 → 用户指定 API 中转。模型 `claude-haiku-4-5-20251001` 的 JSON 请求 HTTP 200、约 2.87 秒，SSE HTTP 200、完整 message_stop、约 3.10 秒，两次均返回 OK。用量记录归属账号 21 / ccgateway，各输入 193、输出 4、费用 0.00021300，billing_status=billed。真实 OAuth 登录未执行，其余九个模型仅配置白名单，未逐个调用。

临时平台 API Key 13 已撤销，测试分组 6 已禁用并从用户、账号解除；账号 21 保持 active 但 schedulable=false、无分组，供后续手动测试或配置调度。隔离 PostgreSQL、SSH 隧道和 Docker 测试资源已清理。原有 dist/index.html、.mcp.json 和交接文件未纳入提交。

证据：[升级采样](evidence/ovh-upgrade-0.1.18.jsonl.txt)、[升级时间线](evidence/ovh-upgrade-0.1.18-summary.txt)、[四入口验证](evidence/ccgateway-v018-verify.jsonl)、[正式账号真实调用](evidence/ccg-formal-relay-result.jsonl)、[Docker 认证与代理验证](evidence/ccgateway-auth-runtime-test.txt)。本轮以 API、实际发布静态文件和真实调用验收，未新增浏览器交互验收。

### 24.5 HTTP 页面复制修复与用户密钥调用验证：OVH v0.1.19

2026-10-04（北京时间），源码 `900faa572`。原复制函数仅调用 navigator.clipboard.writeText；HTTP 公网 IP 页面不具备安全上下文，异常被吞掉且弹窗没有失败提示。新增共享剪贴板 helper，优先使用 Clipboard API，不可用或拒绝时在当前弹窗内临时选中文本执行 copy；复制后清空并移除临时元素、恢复焦点/选区。API Key 弹窗增加中英文失败提示，成功时仍显示已复制。真实密钥没有写入源码或证据。

`node scripts/clipboard-test.mjs` 验证安全上下文 API、HTTP 缺失 API、权限拒绝回退、弹窗焦点、原文含换行、失败返回与临时密钥清理；前端类型检查与生产构建通过。测试使用模拟 DOM，未声称在用户浏览器中实际读取剪贴板。四入口实际静态文件均加载 `MyApiKeysView-BbOUoWh_.js` 和 `clipboard-xio_Sz47.js`，包含兼容复制和错误提示。

部署前使用用户提供的平台密钥，从本机访问用户指定的 HTTP 公网入口 3130，测试 `claude-haiku-4-5-20251001`：非流式 HTTP 200、OK、3.97 秒；SSE HTTP 200、OK、完整 message_stop、4.24 秒。非流式用量输入 193、输出 4。没有改动该密钥或账号的调度配置，没有将此结果扩展为十个模型全部可用。

OVH 从 Git 构建 v0.1.19，数据库备份 `/home/debian/sup2api/backups/pre-v0.1.19-20261003T191310Z.dump` 经 pg_restore 校验，schema-contract 不变。manifest `9093ef942953f018c99bc24a22f9738ac55c7d70b0ad810d81ba600743cc2d42`，bundle `1260beae448723053d63b46d17a06e55d837a0d5f18e8489f3766618d286f3e0`。计划 `98adfd0c2267ffa67a9ea8eacf8027ee` 无预检阻断、完成 27 步，创建至完成约 23.15 秒，四入口 503 采样约 4.6–7.3 秒；四节点版本均为 0.1.19。CCGateway 控制器与业务镜像未更新。

证据：[升级采样](evidence/ovh-upgrade-0.1.19.jsonl.txt)、[时间线](evidence/ovh-upgrade-0.1.19-summary.txt)、[四入口复制代码验收](evidence/clipboard-v019-verify.jsonl)。


### 24.6 CCGateway 原生持久化会话：OVH v0.1.20

2026-10-04（北京时间），功能源码 `ac714743e`，已推送并从 Git 在两台服务器构建。四核心更新到 0.1.20，内置 CCGateway 0.1.2 自动升级、四节点 active。保留原有账号、分组、API Key 与代理配置；账号 21 保持 active/schedulable。未替换 gateway 容器。

数据库备份 `/home/debian/sup2api/backups/pre-v0.1.20-20261004T052315Z.dump` 通过 pg_restore 目录校验，schema-contract 不变。manifest `3f4d9ce43fab94ae7279ebae86b50a038c30887490375d61588e957149fb04ca`，bundle `90bac013a6f41ff0d83200c676e3af8ab74ecb1932137ffe7986f7bed46c3cc7`。计划 `aed434484151cab0b7150b6ceb8d32e4` 完成 27 步，创建至完成约 23.27 秒，各入口 503 采样约 4.6–7.1 秒。四入口版本、插件、账号类型、固定指纹 SSH 与静态管理页验收通过，验收窗口四节点 ERROR 为 0。

cc-max 业务镜像固定为 `sha256:5e3cbd59154dc8f115f2a982083af5a54341badb9e5dc03df6d3591089887f0f`，控制器为 `sha256:e7f52f7e0f63afba4991b6c8ccbd2ab4ebd8aa7982a02ce93a2006d73bd217ce`。备份 `/opt/ccgateway-runtime/pre-native-session-20261004T052331Z` 包含旧控制器/账号配置、运行环境与账号数据卷归档，权限受限，凭据未进入仓库。业务容器 `f065c739268a` ready；sing-box 与账号数据卷保留。

普通续聊保留 CLI 原生会话 ID；按客户端完整历史指纹寻找最新或共同助手节点，旧节点/中间修改走原生 fork，找不到共同节点则导入历史。system 与工具配置每次重新应用，当前固定关闭 system-prompt snapshot。清理 CLI 内部工具拒绝结果，包括并行工具块间交错记录；客户端真实工具结果保留。Mod 在第二次模型请求发送前阻止 CLI 自动续写，保持一条 API 请求只提交一条助手响应。原生历史保留 24 小时并受容量限制。

验收模型为 `claude-haiku-4-5-20251001`，其他模型没有据此宣称验证通过：

- 公网 3130 长上下文 SSE：约 50,563 tokens，三轮 HTTP 200，缓存读取为 0 / 50,563 / 50,610；首轮标识与 Record 0007 的值均正确。另一个约 9k 的三轮测试缓存读取为 0 / 9,124 / 9,170。
- 公网自定义工具：240 条预置历史，五轮模型调用，客户端实际写/读/写/读；文件内容和早期标识正确，缓存读取为 0 / 8,664 / 8,858 / 9,015 / 9,198。
- 公网 MCP 工具：实际使用官方 `@modelcontextprotocol/sdk` 1.32.0 的 stdio 客户端/服务端，工具定义来自 listTools，执行走 callTool。五轮、四次真实文件操作通过，缓存读取为 0 / 8,688 / 8,879 / 9,033 / 9,214。MCP 服务运行在测试客户端，CLI 仍通过网关的 SDK MCP 适配层订阅这些 API 工具。
- 原生 Read/Write：在同版本隔离账号容器中启用原生白名单，经真实上游与实际代理进行五轮、四次客户端文件操作；执行前文件不存在，证明不是容器内先执行。缓存读取为 0 / 9,441 / 9,612 / 9,746 / 9,907。生产原生工具白名单未更改，不能将这项声称为公网原生工具入口测试。
- 公网聊天/分支/编辑/回退：11 个请求全部断言通过，覆盖普通续聊、从首个节点开分支、原分支不变、中间历史修改、回退后续聊、首条消息修改重建、再次续接主分支。读取本次测试对应的原生索引，确认 11 个检查点、5 个原生会话；主分支检查点长度为 2/4/6/8/10。回退恢复对话上下文，不撤销客户端文件操作。
- 源码回归：Go test/vet、23 次真实 CLI 对模拟上游请求、4 个控制器单测通过；覆盖配置变更、工具移除、并行结果、重启恢复、调用者隔离、无自定义会话头及输出上限防自动续写。

系统提示词快照另做了五次隔离 CLI 对模拟上游的抓包验证：A+on→A，A+on→A，B+off→B，B+on→A，B+off→B。关闭快照不会更新旧快照，因此“只和上一轮比较，变化时 off，下一轮不变再 on”会恢复旧提示词。若后续启用条件快照，必须校验当前配置与实际持久化快照一致，或先安全刷新快照；本次生产继续保持 off，已验证这不妨碍上游缓存命中。

证据：[升级采样](evidence/ovh-upgrade-0.1.20.jsonl.txt)、[升级时间线](evidence/ovh-upgrade-0.1.20-summary.txt)、[四入口验收](evidence/ccgateway-v020-verify.jsonl)、[50k 上下文](evidence/ccg-v020-public-50k.json)、[自定义工具](evidence/ccg-v020-public-tools.jsonl)、[MCP 工具](evidence/ccg-v020-public-mcp.jsonl)、[原生工具摘要](evidence/ccg-v020-native-tools-summary.json)、[分支与回退](evidence/ccg-v020-public-branches.json)、[快照切换](evidence/ccg-v020-snapshot-toggle.json)。

### 24.7 SDK MCP 名称与预扣费：OVH v0.1.21

2026-10-04 15:29–15:30（北京时间），源码 `21c039700` 已推送，并在 OVH、cc-max 从 Git 构建。包含合并提交 `d1ab16d55` 的视频计费、请求预扣费与管理界面，以及 CCGateway SDK MCP 名称保留、条件提示词快照和会话生命周期修复。

四核心均为 0.1.21；内置插件 Anthropic 0.2.2、OpenAI 0.3.1、Gemini 0.2.1、CCGateway 0.1.3、Volcengine 0.12.0 已启用，Moderation 保持 0.1.6。平台插件必须升版本：新核心调用 `EstimateUsage`，同版本重新打包会被内置安装逻辑保留旧二进制。Relay 市场包也升至 0.2.1，生产未安装它。CCGateway 四节点 active，固定指纹 SSH 转发与四个管理页入口通过；验收窗口四节点 ERROR 为 0。未替换 gateway 容器。

新增迁移 `0025_request_precharges.sql`，旧 schema `5698cd713b25a12f8cdb4c9242b9ead9110f16bdae33383907ac787c9abe8f5d`，新 schema `22358faf75ba5b4673da3b2a4a0e900d9efa7992923f2175e928c52381e9617c`。签包显式携带旧 schema，使用维护升级；跨 schema 不能自动回退旧二进制。数据库备份 `/home/debian/sup2api/backups/pre-v0.1.21-20261004T072823Z.dump` 通过 pg_restore 目录校验。

manifest `2274367dbfc17f4519e00233b40e37d757feb385e4293c1e34e3dd5a6703d71d`，bundle `27a8009e0faf544b8739dafd1c3654cca7a403a09da52386438af7cd7ac5860c`。计划 `78e1555c1eaf9093018e5390b2827abe` 完成 27 步，创建至完成约 23.25 秒。四入口 503 采样窗口分别约 4.7、6.3、6.9、7.4 秒；这些窗口不包含内置插件后续升级等待。

cc-max 账号 21 的新运行镜像固定为 `sha256:8974324d0c45b35b5358094128f109bcc9b25d7a5b84f9faa5f6d30d293e8d3a`，容器 `4bc9073f879f` ready。控制器镜像仍为 `sha256:e7f52f7e0f63afba4991b6c8ccbd2ab4ebd8aa7982a02ce93a2006d73bd217ce`，重启加载新应用镜像配置；sing-box 和账号数据卷保留。私有备份 `/opt/ccgateway-runtime/pre-sdk-mcp-20261004T072910Z` 包含原运行配置与数据卷。

自定义工具全部由 SDK MCP 注册。标准 `mcp__server__tool` 保持原名，普通工具归入 `ccgateway` 服务并在客户端响应还原名称；最终 wire 名碰撞返回 400。内置工具只在白名单、显式选择、CLI 版本及完整定义均匹配时启用，否则使用 SDK MCP。Mods 只做执行拦截、就绪确认和单轮控制，不注册工具。重复隔离实验发现同名 SDK 服务与 Mods 注册存在竞态，因此最终实现统一 SDK MCP。

提示词快照优先精确比较所恢复检查点中的 `systemPrompt`；缺失时使用该检查点成功请求的系统摘要，按 5m/1h TTL 失效，不影响 24h 原生历史。旧快照不一致、未知格式或携带旧工具定义时关闭。真实 CLI 对本地模拟上游的 38 次调用通过，覆盖名称保留、并行回传、schema 更新、提示词切换和原有分支/回退。Windows test/vet 与相关 SDK/插件/前端检查通过。

发布前在 OVH 独立测试 PostgreSQL 中实际应用迁移并通过并发预扣、幂等释放、视频配置往返、异步任务预留/失败退款、结算事务回滚等测试。生产视频生成未实调，不能将这些断言作为视频供应商端到端验收。

真实上游验收使用 `claude-haiku-4-5-20251001`：

- 发布前隔离账号经实际 sing-box/代理完成三轮长会话与五轮客户端文件工具；工具缓存读取为 0 / 8,641 / 8,810 / 8,952 / 9,122，文件内容及早期标识正确，测试资源已清理。
- 公网并行调用 `mcp__files__lookup`、`mcp__other__lookup`、普通 `local_lookup`，客户端执行并回传三个结果；后续 files 工具 schema 改为 number，实际调用参数为数值 7，回传后同时记得新结果与旧 other 服务结果。四轮全部通过。
- 公网约 9k 长上下文三轮通过，cache_read 为 0 / 9,124 / 9,170，标识与 Record 0007 值 98 正确。
- 首次系统切换探针第三轮被模型拒答：回复明确引用新 B 值，但未满足精确输出断言；原始失败证据保留，第四轮未执行。改为普通仓库标签后单独复测四轮，结果为 AMBER / AMBER / COBALT / COBALT，全部通过。未将拒答误报为网关回退，也未把原失败计为成功。
- 共 14 个公网请求 HTTP 200，TTFT 约 3.12–3.89 秒、中位数 3.47 秒。原始报告的 token 到达速率受 SSE 合并影响，尤其短输出不能据此判断模型真实生成 TPS。
- 按这 14 个 request_id 核对生产账本：均 billed、CCGateway 0.1.3、预扣一次且释放一次、无遗留预扣，总记账 0.02314990。

证据：[升级采样](evidence/ovh-upgrade-0.1.21.jsonl.txt)、[时间线](evidence/v021-upgrade-summary.txt)、[四入口验收](evidence/v021-runtime-verify.jsonl)、[真实 PG 测试](evidence/v021-isolated-db.log)、[隔离上游](evidence/ccg-v021-isolated.jsonl.txt)、[公网原始结果及拒答](evidence/ccg-v021-public-result.json)、[业务标签复测](evidence/ccg-v021-system-business.json)、[账本核对](evidence/v021-ledger-check.json)。
