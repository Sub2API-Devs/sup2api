# 交接：定时任务框架 + 红色账号停机 3 小时停容器（2026-11-03）

接手的 AI 请先读完本文，再读两份设计文档。用中文回答用户。

## 1. 现在的状态

- **只有设计，没有任何实现代码。** 两份设计文档已提交：
  - `next/docs/TASK-FRAMEWORK-DESIGN.md`：定时任务框架（gocron 每个节点 + River 全集群一次），含核心约 40 个后台循环的盘点和分批。2026-11-03 用户要求先完整设计框架，已补成完整设计（接口、两个后端、表、迁移文件、控制台接口、插件协议、依赖版本），§17 列了待用户确认的决定。
  - `next/plugins/ccgateway/docs/ACCOUNT-RUNTIME-PARKING-DESIGN.md`：红色账号停机满 3 小时后停止（不删除）容器。
- 线上现状：核心 0.1.234（两节点），ccgateway 插件 0.1.125（CLI v46）。最近一次发布记录在 `next/deploy/gateway/ovh/README.md` 顶部。
- **第一批的范围用户还没有明确说“开始做”。** 最后一轮是我问“第一批可以开始做吗？”，用户回复“提交所有代码，然后给我一份说明，我交接给其他 AI 继续做”。开工前先向用户确认第一批范围（见 §4）。

## 2. 用户的决定（按时间）

1. 自动禁用/禁用中**红色**的账号（手动禁用、没有恢复时间的自动禁用、active 但被移出调度），**停机 3 小时后停止容器**。黄色（有恢复时间、会自动恢复）不停。用户确认是“停止”不是“删除”。
2. 用**定时任务**来做：“三小时后如果状态还是禁用，就停止掉”。
3. 核心要有统一的定时任务框架，所有定时任务迁过去；用户选了 **River**（Postgres 任务队列）。
4. 最终分工（用户原话整理）：
   - 每个节点都要执行（刷新本地缓存、清理本机临时文件、上报本节点指标）→ **gocron**，每个节点各跑各的，不加锁。
   - 全集群只执行一次（日报、通知、对账、扣款）→ **River 周期任务**，主节点投递，只执行一次。
   - 插件的“每个节点”任务**只能在 manifest 显式声明**，核心调度；插件的“全集群一次”任务**运行时通过 SDK 注册**。
   - 核心的“每个节点”任务启动时用 gocron 注册，“全集群一次”用 River。
   - 要抽象、解耦，**一套 API** 完成任务框架。
5. 数据库连接：用户担心节点多了连接过多。已查：每个核心节点有 pgx 连接池（默认最多 20，`SUB2API_PG_MAX_CONNS` 或 DSN `pool_max_conns` 可调），线上远没到上限，不需要外部连接池（数字见框架设计 §13）。

## 3. 关键事实（已核对代码与线上）

- 核心让控制器运行容器的条件只有“没删除”：`next/server/internal/ccgateway/accounts.go` `desiredIn` 里 `d.Enabled = !d.Deleted`（约 181 行）。
- 控制器已支持停而不删：`next/plugins/ccgateway/companions/controller-go/internal/accounts/apply.go` `block` 调 guard 的 `ActionStop`（guard `internal/api/handlers.go` 约 681 行 `ContainerStop`）；再收到 `enabled:true` 时 `applyShared` → `provision`（`keepExisting` 保留原容器）→ `sharedActivate` 对停着的容器 start。**原容器原地启动，镜像不变**，老账号仍是 CLI 2.1.312（用户硬规则：只有新账号用新版本，老账号保持老版本，绝不能让老账号因此换成新 CLI）。
- 例外：`sharedActivate` 遇到 `resolv.conf` 被换成新文件（`ErrMountReplaced`）会删 app 容器让核心重建。实现时要核对重建用的镜像，保证老账号不换版本。
- 容器没就绪时核心直接回 503 `not_synchronized`（`ccgateway/client.go` `notSynchronizedResponse`），插件换号，不触发故障规则。
- 同步：`ccgateway/accounts.go` `Run`（每 60 秒全量）+ 账号变更 `kickCCGateway` 立即同步；`blockedRecently/markBlocked` 只对已删除账号去重，要扩到所有 `!Enabled`（否则停着的账号每分钟各 PUT 一次，2026-10-11 出过这个问题）。
- 重新授权要求容器 ready（`ccgateway/reauth.go` `ReauthDraft`）；测试在 `internal/account/testreq.go` `runTest`；手动查额度在 `internal/account/quota.go` `runQuotaQuery`。这三处要处理停着的容器（设计 §5）。
- 账号表没有“状态变化时间”，要加 `accounts.status_changed_at` + 触发器（设计 §3）。
- `CanWork`（`app/managed.go`、`app/phases.go` 约 157 行）是节点级的“可以跑后台任务”许可，不是选主；River 的执行客户端只在它为真的节点启动（框架设计 §7.1）。
- 自动禁用到点恢复的写法（`internal/account/automatic_state.go` `SweepAutomaticState`）是“按行到期 + SKIP LOCKED”的参考。
- 插件定时任务现状：`internal/job/job.go`（Redis 锁 + `plugin_job_runs` 唯一索引，调插件 `RunJob`）；manifest `Job` 在 `next/sdk/manifest/manifest.go` 约 736 行；`RunJob` 在 `next/sdk/proto/sub2api/plugin/v1/app.proto`。
- 迁移：`internal/store/migrate.go`，每个文件一个事务、跨节点 advisory 锁；最新是 `0075_failure_policy_stored_login_keywords.sql`，新迁移从 0076 起。
- 线上数字（2026-11-03）：40 个 CC 账号是禁用状态，其中红色 20 个，它们的 app 容器约占 1.4 GiB 内存（全部 44 个约 3.3 GiB）。Supabase `max_connections` 120（共用），sup2api 账号上限 70，两节点核心各约 13 个连接。
- River：v0.5x（MPL-2.0，未到 1.0），pgx v5；周期任务只由主节点投递，主节点切换可能漏一次（持久周期任务是收费 Pro）；默认重试 25 次、卡住 1 小时救回；`river migrate-get` 可导出 SQL。gocron：go-co-op/gocron v2。实现时以锁定版本的文档为准。

## 4. 下一步（第一批，核心 0.1.235）

范围见框架设计 §14：框架本身 + 停容器 + 12 个全集群任务（含停容器和框架自带的 `core.task.housekeeping`）+ 3 个每节点任务。插件不发、插件定时任务这一批不动。建议顺序：

1. **依赖与迁移**：加 River、gocron 依赖（锁定版本）；用 `river migrate-get` 按版本导出 SQL 成核心迁移；`scheduled_tasks` 表（框架设计 §9）；停容器的列与触发器（回填用迁移时间，不用 `updated_at`）。在测试库上用非超级用户账号执行。
2. **`internal/core` 接口 + `internal/task` 实现**（框架设计 §4–§8）：通用 River kind `sup2api.task`、周期配置从 registry 构建、`scheduled_tasks` 行租约防叠跑、`CanWork` 控制 River 客户端启停、gocron singleton 模式。
3. **停容器**（停容器设计 §4–§6）：`core.ccgateway.park_runtimes`、`desiredIn` 的 `parked`、去重扩展、唤醒（重新授权、测试、运行环境列表“启动”）、额度查询回 `runtime_parked`、控制台文案与设置项（默认 3 小时，0 为不停）。
4. **迁移第一批现有循环**，删除原循环。
5. **控制台**“系统 → 定时任务”只读页 + 手动运行。
6. **CONTRACTS**：新增章节（现在最后一节是 §76），写清接口、表、原因码 `account_parked`/`runtime_parked`。
7. 测试、发布、线上核对（两份设计的 §9/§10）。

第二批（插件任务：manifest `scope`、SDK Host API、`HandleJob`、旧 `internal/job` 退役）和第三批（凭证续期、全量同步、用量结算/对账、额度清扫）都要单独发布，开工前再和用户确认。

## 5. 必须遵守的规则（详见仓库根 `AGENTS.md` 与用户记忆）

- 只改 `next/`；不要动 `backend/`、`frontend/`、根目录 `deploy/`、`Dockerfile*`、`Makefile`、`deploy-ovh-dev.sh`。
- 数据库变更只走幂等迁移（`next/server/internal/migrations/NNNN_*.sql`），只加有默认值或可空的列，旧核心能忽略。
- 提交用明确路径，不要 `git add -A`；推送用 `git -c http.proxy=http://127.0.0.1:7890 push`。
- 测试不能悄悄跳过：合并后每个 Go 模块都要 `go test`，确认 PG 测试真的跑了（嵌入式 PG `sdk/testpg`）。Linux 专属测试在 ovh 的 `golang:1.27-bookworm` 一次性容器里跑（本机是 Windows，没有 Docker）。
- 同一 Go 模块同一时间只让一个 agent 写。
- 日志不能阻塞请求路径。
- 老账号保持老 CLI 版本：停/启容器不能重建、不能换镜像。
- 插件包签名密钥固定 `sup2api-plugins-2026`（这批不发插件，用不到）。
- 不要动 clicodeplus 上其他服务的磁盘；删除前先核对归档。

## 6. 发布

- 核心发布照 0.1.234 的做法：ovh 上 `stage/0.1.234/{build.sh,release.sh}` 复制为 `stage/0.1.235/`，**逐处替换版本号和提交号再跑**（0.1.232/0.1.233 都因为复制后没替换干净出过错），然后 `upgrade_observe.py` 主节点优先升级两节点。
- 计划暂停（例如 ccp 解析 Supabase 超时）时核对后 `sub2api-shell resume`。
- 发布后在 `next/deploy/gateway/ovh/README.md` 顶部写部署记录（参照 0.1.234 那条：提交、时间、manifest、计划、迁移、核验、回滚注意）。
- 上线后核对（停容器设计 §9）：3 小时内没有容器被停；3 小时后 20 个红色账号的 app 容器为 Exited，黄色和正常的仍在运行；挑一个红色老账号点“测试”，唤醒前后容器 ID 和镜像相同。
- 回滚：旧核心不认新表，原循环恢复，会在 60 秒内把停着的容器全部拉起来。

## 7. 环境

- 两节点：ovh `sup2api-1`（主，端口 3130），clicodeplus `sup2api-ccp`（ssh 别名 `clicodeplus`，端口 3140）；共用 Supabase（DSN 在 ovh `~/.secrets/supabase-sup2api.dsn`），查库用一次性 `postgres:16-alpine` 容器并 `SET default_transaction_read_only=on`。
- 本机 Windows + Git Bash，路径用 `/d/...` 或 `D:/...`。
