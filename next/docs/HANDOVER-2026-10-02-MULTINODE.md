# 交接：多节点同步、主节点停机升级与节点鉴权

交接时间：2026-10-02。交接对象：接手当前工作区的 AI。

**当前不是完成验收状态。代码已大部分落地，最新修改尚未做完整 Linux/真实三节点验收。不要把历史测试写成当前实现通过。用户最新要求是整理交接，已通知各子代理停止扩展工作。**

> **接手后更新（2026-10-02 同日）**：§7 的 1–8 步已执行。Pause/Admit 竞态已修复并有回归；全部 Go 模块 `-race`、真实 PG/Redis 用例、真实三节点主节点优先升级均在隔离环境通过；OVH 隔离项目已清理。结果、本轮修复与仍未覆盖的场景见 [验证记录](audits/2026-10-02/MULTINODE-VALIDATION.md)。下文保留交接时的原始状态。

## 1. 先读与工作区保护

- 仓库：`D:\projects\golang\sup2api`；分支 `feat/next-platform`；当前 HEAD `7ec4a9fbc`（交接时已核实）。
- 大量修改和未跟踪文件来自之前多轮已授权工作，包括核心、SDK、7 个内置插件、前端和外壳；不是只有本轮节点鉴权。**不要 reset、clean、覆盖或丢弃这些改动。**
- 本轮没有提交、推送或部署到业务环境。继续开发不等于获准自行发布生产。
- 始终用中文回复。用户希望自主推进，不要重复请求已经给出的授权。
- 最新设计依据：[MULTINODE-SYNC-PROTOCOL.md](MULTINODE-SYNC-PROTOCOL.md)。文首状态仍落后于代码，验收后再更新。
- 历史背景：[HANDOVER.md](HANDOVER.md)、[整改记录](audits/2026-10-01/REMEDIATION.md)、[审计报告](audits/2026-10-01/REPORT.md)。这些文件存在旧版结论，以本交接的状态说明为准。
- 历史滚动升级验收：[SHELL-UPGRADE-VALIDATION.md](audits/2026-10-01/SHELL-UPGRADE-VALIDATION.md)。**它不能证明当前主节点停机升级与新鉴权已通过。**

## 2. 用户已经确定的方案

1. 指定固定主节点。正常运行时所有就绪节点可处理业务和后台任务。
2. 升级时从节点入口转发主节点，并完全停止各自核心和插件；取得实际停止确认后才允许主节点停止、迁移数据库、启动新版。
3. 主节点停机期间允许整个集群不可用，入口返回 503。外壳和本机管理 socket 保持运行。
4. 主节点就绪后承担业务，从节点后台逐个同步更新；核心、插件和资源全部就绪后才恢复本地服务与调度。
5. 每个节点有自己的可复用鉴权密钥。支持配置文件 `peer_auth_key` 或环境变量 `SUB2API_PEER_AUTH_KEY`；未指定则随机生成。
6. Redis 心跳续 TTL，但不更换密钥。Redis 记录失效后：配置模式恢复同一个密钥；自动模式重新生成。其他节点从 Redis 读取核验。
7. 不要重引入一次性 ticket、nonce、每请求签发或 replay cache。HTTPS 仍须校验证书和主机名。
8. PG 保存持久状态；Redis 提供节点凭证、现有分布式锁等。用户不要求新建 PG 租约框架。
9. 插件执行请求/一次轮询，核心负责调度、网络宿主能力、账务和持久异步任务。插件不自行决定哪个节点持续轮询。
10. 插件可独立更新，核心附带插件只是首装来源；核心升级不得覆盖已安装/禁用/删除状态。

## 3. 本轮已实现但仍待整体验证的代码

### 外壳与鉴权

- `next/shell/internal/peer/`：每节点 Redis 凭证、续期、丢失恢复、PG 当前 boot/禁用检查、登记锁、入站鉴权和出站 Transport。
- `next/shell/internal/proxy/`：节点 HTTPS 转发，保留业务 Authorization，清除节点凭证，避免重定向和业务请求自动重放。
- `next/shell/cmd/sub2api-shell/`：配置/启动接线，peer 续期，与发布站下载及节点下载通道分离。
- `next/shell/internal/control/runtime.go`：核心制品分发鉴权、准备/启动/停止协议接线。
- `release_origin` 下载路径修正：清单与 bundle 同目录，不额外拼 `/blobs`。
- 核心进程环境过滤节点密钥，避免传入核心及插件。

### 升级控制

- `next/shell/internal/control/{types,store,schema,engine,http,control_test}.go`（schema 文件实际为 `schema.sql`）：`primary-first-v1` 状态机与持久停止确认。
- 节点状态含 `Enabled`、`PeerProtocol`、`Strategy`、`JoiningPlan`、`Stopped`，验证当前 shell boot。
- 禁用节点：持久禁用、撤准入、删 Redis 凭证；启用后必须正常重新登记与准入，不直接 ready。
- 即使节点已被禁用、无法节点鉴权，也必须可执行本机维护与有界停机，并写入绑定当前 boot 的真实停止确认。
- 新加入节点等待当前计划完成后按新 baseline 启动，不动态加入正在执行的成员列表。
- 检查未受管核心、旧外壳能力、插件发布/卸载及旧进程清理状态；暂停的候选版本不能擅自获得准入。
- `ConfirmStoppedCore` 只有在进程组实际停止后才能清理插件持久 pending 标记。

### 核心准备与插件变更互斥

- `next/runtime-contract/` 控制协议为 **2**；业务集群协议 **1**、任务协议 **1**、Host API **4**。不要混淆四者。
- 核心 Prepare 拆分迁移、bootstrap、插件协调权限；普通从节点启动不能迁移或重做首装。
- 迁移在已有 PG 锁下校验不可变的已应用前缀及校验和，支持部分迁移后恢复；只读启动要求实际库存一致。
- `server/internal/core/mutation.go`、`server/internal/cluster/mutation.go`：核心升级与插件变更提交共用 Redis 锁 `system:cluster-change`。
- 安装/批准/拒绝、启用/升级/停用、卸载与运行中/暂停中核心计划互斥；紧急撤权可独立生效。
- 插件旧进程清理使用 `plugin_rollout_nodes` 的 `cleanup_pending`/`cleaned` 状态，不能仅凭 rollout 已完成/失败认定退出。
- 以上利用现有表和 Redis registry，无需新增核心 SQL migration。

### 管理入口、配置与发布工具

- `server/internal/updater/http.go`：节点 enable/disable 转发，权限 `system:update:recover` 且要求 step-up。
- `web/src/views/upgrades/UpgradesView.vue` 与中英文 upgrades 文案：节点停用/启用和状态展示。
- `deploy/shell/config/node-{a,b}.json`：`peer_auth_key` 替换旧 `allowed_peers`。
- `deploy/shell/compose.yml`、`.env.example`：每节点独立可选密钥变量。
- `shell/cmd/sub2api-release`：签名清单使用当前 `runtimecontract.Protocol`，不是硬编码 1。
- `.gitignore` 中放开 `next/shell/internal/release/*.go` 的规则必须保留，旧全局 release 忽略规则会吞掉源码。

## 4. 已验证与尚未验证

本轮已经通过：

- 本地前端 `vue-tsc -b` 与 Vite production build；已生成相应 server/web/dist 文件。
- 本地 release CLI/制品管理相关测试。
- OVH 真实 PG：迁移权限/实际迁移测试 `-race` 通过，日志 `migration-test.log`。
- OVH 真实 PG + Redis：控制层 TestPostgres/TestMaintenance/TestStep/TestCompatibility 的一次 `-race` 通过，日志 `control-test.log`。**该结果早于最新 disabled 安全停机与部分协议校验修改，需要重跑。**
- OVH 已构建真实签名 Anthropic 0.2.0 插件（amd64/arm64），用于后续验收；日志 `plugin-build.log`。
- 外壳子代理报告本地 peer/proxy/release/supervisor/control/CLI 测试通过；Windows supervisor 没有实际进程测试，新 Linux peer 三节点尚未执行。

尚未完成：

- 最终全源同步后的 server、shell、SDK、全部插件完整 Linux `-race`/构建验证。
- 新 Redis 节点鉴权下的真实三节点主节点停机升级，包含真正新增 SQL migration 和真实签名插件。
- 最新禁用/重新启用、凭证丢失自动恢复与长期准备阶段续期的综合验收。
- 最新外壳 Docker 镜像构建与配置冒烟。
- 文档最终状态修正、新验证记录和 OVH 环境清理。

不要宣称新方案已经部署，也不要用旧的“零 503 滚动升级”标准验收。本方案预期主节点维护窗口有 503。

## 5. OVH 隔离环境：仍存在，接手者必须处理

用户明确授权原话：**“允许，在 OVH 隔离验证并清理”**。此前自动审批两次拒绝源码传输后，用户专门给了此授权。后续无需再次问同一授权，但工具仍可能要求 escalation。

- SSH 别名 `ovh`，地址 `15.204.107.38`。
- 隔离目录：`/home/debian/sub2api-next-test/ci/managed.bTbDH5`。
- Compose 文件：`sup2api-managed-compose.yml`。
- Compose 项目：`sub2api-next-managed-check-20261002`。
- 服务：pg、redis、profile verify 下的 gotest；无对公网开放的测试数据库端口。
- 源码挂载 `.:/src`，gotest 工作目录 `/src/next`，Go 1.27。
- 测试连接串已在隔离 Compose 中设置，读取该文件即可，不要将凭证抄入公共报告。
- 两个**外部共享缓存卷**：`sub2api-next-ci_gomod`、`sub2api-next-ci_gocache`，清理时不能删除。
- 生产容器 `sup2api-app-1`、`sup2api-app-2-1` 不属于本次测试，禁止误停。
- 当前远端源码是较早快照加部分 control overlay，**不是最终工作区**。必须重新同步后再运行最终测试。

远端已有测试制品（不代表新测试已运行）：

- `/src/checks/builtin/anthropic-0.2.0.s2plugin`。
- `/src/checks/keys/managed-test.key` 与 `.pub`，只用于隔离测试；私钥不得带入交付证据。
- `/src/checks/sub2api-plugin`。
- 插件包摘要：`32198e6e36dbf5d6f5719333e15e797957e9496818cba06f02b13248d15bc7da`。

完成验证后先保存日志、摘要和结果，再对**本项目**执行 compose down -v（保留 external 缓存卷），验证目录绝对路径后删除该临时目录。不要清理其他项目；最后检查生产两节点健康。当前交接时尚未执行清理。

## 6. 本地运行工具与现成脚本

Go shim 存在访问问题，使用 `D:\mise\installs\go\1.27.0\bin\go.exe`；gofmt 同目录。本机没有 gcc，不用本地 race 替代 Linux race。

PowerShell 测试前设置可写缓存：

```powershell
$env:GOCACHE = Join-Path $env:TEMP 'sup2api-primary-go-cache'
```

前端在 next/web：`node node_modules/vue-tsc/bin/vue-tsc.js -b`，再 `node node_modules/vite/bin/vite.js build`。Node 位于 `D:\app\nodejs\node.exe`。

本机 `%TEMP%` 已有：

- `sup2api-managed-compose.yml`：远端隔离 Compose。
- `sup2api-managed-source.tgz`：较早全源快照。
- `sup2api-managed-control.tgz`：较早控制层 overlay。
- `sup2api-build-plugin.sh`：已在远端执行。
- `sup2api-realcore-check.sh`：**已写好但尚未上传执行**，构建 R1/R2 并运行三节点测试。

realcore 脚本注意事项：

1. R1/R2 都从当前控制协议 2 核心构建，不证明历史协议 1 可以直接托管升级。
2. R2 在独立源码副本额外添加真实 SQL。脚本目前名字是 `0021_managed_upgrade_probe.sql`，建议改为 `9999_managed_upgrade_probe.sql` 避免后续迁移撞号；不要放入正式仓库。
3. `cp -a /src/next /src/checks/target-next` 首次可用，重复运行要避免嵌套目录。若清理，先核对完整绝对目标。
4. 设置 TEST_CORE_V1、TEST_CORE_V2、TEST_SHELL_NODES=3、TEST_BUILTIN_DIR 和 TEST_BUILTIN_KEY。
5. 测试仍名 `TestRealCoreRollingUpgrade`，内容正在改成 primary-first；不要凭函数名判断策略。

建议源码打包排除：node_modules、.git、.cache、runtimes、.env、*.key、*.pem、certs、*.s2plugin、*.exe、*.test。用 SCP 上传用户批准的隔离目录；不要包含部署密钥。overlay 解压不会删除远端已删源码，必要时对比文件清单。

## 7. 接手后的推荐顺序

1. 阅读本文件与规约，git status 核实保留全部改动；先核对下节子代理最终状态，不假设代理仍在运行。
2. 审查跨模块接线：peer 登记/恢复与 Store.Register，Redis 条目丢失不能误清 ready 或重启现有核心；disabled/boot 替换后必须能停机。
3. 核实请求密钥不能进入核心/插件/发布站；鉴权失败不能回退 mTLS 放行；业务请求不重放。
4. 核实插件提交锁的时限只覆盖短提交，不使大下载或卸载等待因 25 秒超时失败；插件实际退出后才解除迁移屏障。
5. 同步最终源码，重跑控制层与迁移真实 PG/Redis 测试，再跑全套必要测试和构建。
6. 执行真实三节点+真实新增 SQL+签名插件验收，修复失败后复测。必要时补异步任务在停机恢复后继续处理的证据；不能声称已测试付费上游。
7. 更新 MULTINODE-SYNC-PROTOCOL、deploy/shell/README、CONTRACTS、HANDOVER、PROGRESS 的旧状态描述。创建独立 2026-10-02 验证记录，不覆盖历史证据。
8. 保存证据、清理隔离环境、报告已验证范围与剩余限制。没有用户发布要求则不 commit/push/部署业务环境。

## 8. 子代理冻结交接

三个子代理均已保存、停止编辑；没有提交、部署或启动新的远端测试。本次主控在交接请求后只整理文档。

### shell_runtime 最终回报

- 新 peer、代理、发布客户端隔离、CLI、supervisor 环境过滤和真实测试接线均已保存/gofmt。
- 最后本地 peer/proxy/release/control/CLI 测试通过；supervisor Windows 无实际测试。增加独立续期后还未重新做 Linux 交叉编译。
- `peer.Run` 覆盖初次 Recover/准备超过 30 秒的阶段；Engine 心跳也调用 Maintain，由 Manager mutex 串行。
- **真实测试尚缺**：删除 Redis 凭证后自动/固定模式恢复且 core boot 不变；实际迁移库存前后对比；异步任务记录与失败计数不变。
- **专门回归尚缺**：release_origin 路径、密钥环境过滤、配置优先级、enable/disable CLI；代理 `//`、`.`、编码路径以及业务 401/403 与内部鉴权失败的完整组合。

### upgrade_control 最终回报

- 最后本地 `go test ./shell/internal/control` 通过；目标 cluster/task={1,1}、Host API=4 的预检限制已接共享常量。
- 同 boot Redis 缓存重建保留 ready/stopped；禁用安全停止 ACK、准入节点行锁、物理停止清理等最新修改待远端重验。
- 普通新升级仍拒绝包含禁用节点的计划；**禁用不是移除，也不能据此绕过停止证明**。永久移除需另行设计受控隔离。
- 同 schema 的受限回退保留，跨 schema 回退拒绝。
- 最终只读复审尚未完成。

### core_admission 最终回报与明确风险

- 最后本地测试通过：cluster、core、plugin/install、plugin/rollout、plugin/grpcruntime、plugin/registry、app。
- 本机无 TEST_DATABASE_URL，新增 PG 案例只编译/跳过，未真实执行或 race。
- 新测试文件：`cluster/mutation_test.go`、`plugin/install/mutation_test.go`、`plugin/rollout/cleanup_test.go`、`plugin/grpcruntime/grant_revocation_test.go`。
- 变更入口 25 秒提交上下文/30 秒锁。卸载仅提交 quiesce 标记时持锁，排空等待用原 ctx；清除过程由持久 plugin_uninstalls 屏障保护。市场远程下载在 Upload 前；Upload 仍需复核本地大包验包时限是否合理。
- HostService 新调用检查 PG 当前权限和 scope；紧急撤权递增 row_version，readiness 比较本地与 PG 权限。**readiness 撤权判断尚缺专门测试**。
- **优先待验证竞态**：代理只读发现 `Engine.Admit` 在事务前做 `admissionAllowed`，写 PG 准入前可能未再次校验计划状态；首次准入与并发 pause 可能交错。节点行锁解决的是 Disable/Admit，不自动证明 Pause/Admit 安全。该发现尚未确认修复，接手者必须核查实际代码并增加并发回归。
- 核心 Hello 仍按实际 cluster/task=1 与 SDK HostAPI=4 报告，可进一步统一常量并断言 SDK 一致性。

## 9. 可直接发给下一位 AI 的任务

> 先读 `next/docs/HANDOVER-2026-10-02-MULTINODE.md` 和 `next/docs/MULTINODE-SYNC-PROTOCOL.md`，保留当前 feat/next-platform 全部未提交改动。继续完成主节点停机升级和 Redis 每节点可复用密钥同步机制。优先核查 Pause/Admit 竞态，补缺失回归，重新同步最终源码到已授权的 OVH 隔离目录，完成真实 PG/Redis race 和真实三节点跨 schema 升级验收。更新文档并清理本次隔离环境，保留共享缓存和生产容器。没有额外发布授权时不要提交、推送或部署业务环境。可使用 agent team 并行处理，但以实际测试证据为准。
