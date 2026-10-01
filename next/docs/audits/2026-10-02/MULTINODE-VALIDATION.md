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
- WebSocket 跨登记 TTL 未在多节点上测：模拟上游没有 WebSocket 接口；proxy 单元测试覆盖升级连接的流式与计数。SSE 已在 §8 覆盖。
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
