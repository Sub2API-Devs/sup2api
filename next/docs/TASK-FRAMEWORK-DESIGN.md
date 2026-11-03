# 定时任务框架：gocron（每个节点）+ River（全集群一次）（设计）

2026-11-03，用户决定。本文是实现前的设计，未实现。顺带完成“红色账号停机 3 小时后停止容器”（`plugins/ccgateway/docs/ACCOUNT-RUNTIME-PARKING-DESIGN.md`），它是框架上的第一个新任务。

## 1. 原则

任务分两类，各用一种机制，上面一套统一的接口：

| 类型 | 例子 | 机制 |
| --- | --- | --- |
| 每个节点都要执行（`node`） | 刷新本地缓存、清理本机临时文件、上报本节点指标、本节点的租约 | gocron v2：每个节点各跑各的，不加锁 |
| 全集群只执行一次（`cluster`） | 清扫到期数据、清理旧记录、对账、通知、停容器 | River 周期任务：主节点投递，任意一个可工作节点执行一次 |

谁能注册哪类：

| | 每个节点（gocron） | 全集群一次（River） |
| --- | --- | --- |
| 核心 | 启动时注册 | 启动时注册；另可随时提交单次任务 |
| 插件 | 只能在 manifest 里显式声明，核心调度 | 运行时通过 SDK 注册；另可提交单次任务 |

解耦：业务代码（核心各包、插件）只认 `core.Tasks` 接口和 SDK 的任务 API，不 import gocron 或 River；两种机制是 `internal/task` 里可替换的后端。

## 2. 现状（2026-11-03 盘点）

- 核心约 40 个后台循环，各写各的 `time.NewTicker`，多节点去重有 Redis 锁、时段锁、advisory 锁、`SKIP LOCKED`，也有不去重的；没有统一的运行记录。明细见 §11。
- 已有的漏洞：出口日志清理每个节点都跑；helper outbox 两个节点读同一批；ccgateway 全量同步两个节点各跑一遍且不受 `CanWork` 控制。
- 插件定时任务（`internal/job`）：manifest `jobs` 静态声明 cron，各节点抢 Redis 锁 + `plugin_job_runs` 唯一索引，赢的节点调本机插件 `RunJob`。只有“全集群一次”，不能动态注册。在用的有 dynweight（`evaluate` 10s、`cleanup` 每小时）、guard（`rollup` 5m、`cleanup` 每天）、moderation（`cleanup` 每天、`analysis` 1m）、growth（`cleanup` 每天）。

## 3. 核心接口 `core.Tasks`

放在 `internal/core`（端口），实现在 `internal/task`。

```go
type TaskScope string

const (
    TaskNode    TaskScope = "node"    // 每个节点各跑（gocron）
    TaskCluster TaskScope = "cluster" // 全集群一次（River）
)

type TaskSpec struct {
    Name     string        // core.<包>.<任务>，如 core.ccgateway.park_runtimes
    Scope    TaskScope
    Every    time.Duration // 与 Cron 二选一
    Cron     string        // 5 段 cron
    Timeout  time.Duration // 必填
    RunOnStart bool        // node：节点启动即跑一次；cluster：新主节点上任即投递一次
    AnyNode  bool          // 仅 node：节点不可工作（CanWork 为假）时也跑；默认不跑
    Handler  TaskHandler
}

type TaskHandler func(ctx context.Context, run TaskRun) (TaskResult, error)

type TaskRun struct {
    Name        string
    ScheduledAt time.Time
    Attempt     int             // cluster 重试次数，从 1 开始
    Args        json.RawMessage // 单次任务的参数；周期任务为空
    Manual      bool
}

type TaskResult struct {
    Count   int    // 处理了多少条，进运行记录
    Message string
}

type Tasks interface {
    Register(TaskSpec) error // 启动阶段调用；Start 之后再注册报错
    // Trigger 立即跑一次：node 在本节点跑；cluster 立即投递（同一时段去重仍生效）。
    Trigger(name string) error
    // Enqueue 提交 cluster 单次任务；Tx 版本与业务写入同一事务，回滚则不投递。
    Enqueue(ctx context.Context, name string, args any, opts EnqueueOpts) error
    EnqueueTx(ctx context.Context, tx pgx.Tx, name string, args any, opts EnqueueOpts) error
}

type EnqueueOpts struct {
    RunAt     time.Time // 零值为立即
    UniqueKey string    // 相同 name+UniqueKey 的未执行任务只保留一个
}
```

单次任务的处理函数就是同名 `cluster` 任务的 Handler（`Every`/`Cron` 都为空表示只接受单次提交）。

约定：
- 每个任务都要幂等。cluster 任务会被 River 救回重跑、失败重试，滚动升级期间新旧核心也可能各跑一次。
- Handler 不自己判断 `CanWork`、不自己加锁，这些归框架。
- 任务名全局唯一；插件任务名由框架加前缀 `plugin.<插件>.`，插件拿不到别人的名字空间。

## 4. 实现 `internal/task`

```
internal/task/
  registry.go   任务登记：名称、范围、计划、来源（核心/插件静态/插件动态）、处理函数
  node.go       node 后端：gocron
  cluster.go    cluster 后端：River 客户端、通用 worker、周期配置同步
  plugin.go     插件任务：manifest 读取、Host API、调用插件 RunJob
  status.go     运行状态：tasks 表、节点内存状态
  http.go       控制台接口
```

### 4.1 node 后端（gocron v2）

- 每个节点一个 gocron Scheduler，不配分布式锁、不配选主。
- 每个任务用 singleton 模式：上一次没跑完，本次跳过并记一次，不叠跑。
- `CanWork` 为假时跳过（`AnyNode` 的除外）；用现有 `background.Executor` 限并发；关停时等待正在运行的任务，最多到各自超时。
- 运行状态只记在本节点内存（最近一次时间、耗时、结果、连续失败次数），经现有节点心跳带给控制台；不写数据库，几秒一次的任务也不会产生数据库行。

### 4.2 cluster 后端（River）

- **一个通用任务类型**：River 里只注册一个 kind `sup2api.task`，参数是 `{name, args, unique_key}`，worker 按 `name` 查登记表再调 Handler。这样新增任务、插件动态注册都不需要给 River 注册新 worker（River 要求 worker 在客户端启动前注册好）。
- **周期任务**：River 的周期配置在内存里，只有主节点按它投递。每个节点都从登记表构建同一份配置（核心任务 + 插件动态任务）；登记表变化时经集群事件 `task:changed` 通知各节点重建，另每 60 秒自检一次，保证谁当主节点配置都一致。
- **只投递一次**：周期投递按“任务名 + 时段”去重（River 唯一任务，`name` 和时段作为唯一参数）。主节点切换的那一刻可能漏一次，不补跑（River 的持久周期任务是收费的 Pro 功能）；我们的任务都是“处理当前所有已到期的”，漏一次下一次补上。
- **单次任务**：`Enqueue` 写 River 的 `ScheduledAt`；`UniqueKey` 作为唯一参数。
- **只在可工作节点执行**：`CanWork` 为真的节点启动带 worker 的 River 客户端（参与选主、执行）；许可撤销时软停（等正在跑的，超时取消），恢复时重新启动。其他节点用不启动的客户端只做投递。单机核心恒为真。
- **默认值**：超时取任务的 `Timeout`；失败重试最多 5 次（River 默认 25 次太多，周期任务下一时段会再跑）；卡住超过 `Timeout + 1 小时` 救回；已完成的任务保留 24 小时由 River 清理。

### 4.3 运行状态

新表 `tasks`，每个 cluster 任务一行：名称、来源、计划、超时、参数（插件动态任务）、是否启用、最近一次运行的节点/开始/结束/结果/处理条数/错误、连续失败次数、更新时间。

- 核心任务启动时 upsert（只更新计划和超时，不覆盖运行状态）。
- 插件动态任务的注册信息也存在这里（§5.2），这张表就是 cluster 任务的登记表。
- 每次运行结束更新一行，不写历史；24 小时内的明细在 River 的 `river_job`。插件任务另外照旧写 `plugin_job_runs`，插件页的历史不变。

## 5. 插件

### 5.1 每个节点都跑：manifest 显式声明

```json
"jobs": [
  { "id": "refresh_cache", "scope": "node", "schedule": "@every 30s", "timeoutSec": 10 }
]
```

- 只有 manifest 能声明 `node` 任务，运行时不能注册（避免插件在每个节点上无节制地加循环）。
- 核心在本节点加载这个插件版本时向 gocron 注册，卸载、停用、换版本时注销；执行时调本机插件实例的 `RunJob`。
- manifest 校验：`node` 任务间隔不小于 5 秒，每个插件最多 10 个。

### 5.2 全集群一次：运行时注册

SDK Host API 新增（插件 → 核心）：

| 方法 | 作用 |
| --- | --- |
| `SyncTasks(tasks[])` | 用一组任务整体替换本插件的周期任务（插件启动时调用，声明式，重复调用幂等） |
| `UpsertTask(id, schedule, args, timeoutSec, enabled)` | 新增或修改一个 |
| `DeleteTask(id)` | 删除一个 |
| `ListTasks()` | 列出本插件的全部周期任务 |
| `EnqueueTask(id, args, runAt, uniqueKey)` | 单次任务 |

- 执行时核心调用插件的 `RunJob`，`job_id` 就是注册时的 `id`，插件自己按 id 分发。`RunJobRequest` 增加 `args`、`scope`、`attempt`、`run_id`；旧插件不读这些字段，不受影响。
- 只接受当前生效插件版本的实例调用：插件灰度发布期间新旧版本都在跑，旧版本的 `SyncTasks` 被忽略，避免两版本来回覆盖。
- 执行节点先确认本机加载了当前版本的这个插件；没有（灰度、刚启动）就推迟 5 秒让别的节点取，最多推迟到任务超时，再不行记失败。
- 需要 manifest 已有的 `jobs` 权限。限制：每个插件最多 200 个周期任务、间隔不小于 10 秒、参数不超过 64 KiB、未执行的单次任务最多 1 万个；超出返回错误，不静默丢弃。
- 插件停用：不投递、不执行，启用后恢复；卸载：删除它的周期任务、取消未执行的单次任务。

### 5.3 现有 manifest `jobs` 的兼容

现有四个插件的 `jobs` 没有 `scope`，按“全集群一次”处理：核心在插件当前版本生效时替它调用一次 `SyncTasks`，行为与现在相同，插件不用重新发布。以后这四个插件改为启动时自己 `SyncTasks`，manifest 里的旧写法标为过时。

### 5.4 SDK（Go）

```go
tasks := host.Tasks()
tasks.Sync(ctx, []sdk.Task{{ID: "evaluate", Every: 10 * time.Second, Timeout: time.Minute}})
tasks.Enqueue(ctx, "review", args, sdk.RunAt(t), sdk.UniqueKey(id))

app.HandleJob("evaluate", func(ctx context.Context, run sdk.JobRun) (sdk.JobResult, error) { … })
```

`HandleJob` 是 `RunJob` 的分发器，node 和 cluster 任务都用它。

## 6. 数据库

### 6.1 迁移

- River 的表（`river_migration`、`river_job`、`river_leader`、`river_queue` 及类型、函数）用 `river migrate-get --line main --version N --up` 按版本导出，每个版本一个核心迁移文件，原样保存并注明来源版本，能加 `IF NOT EXISTS` 的加上。现有 `store.Migrate` 每个文件一个事务、跨节点 advisory 锁串行，符合 River“每个版本一个事务”的要求。实现时在测试库上用与生产相同的非超级用户账号执行。
- `tasks` 表、`plugin_job_runs` 加 `scope` 列：另一个迁移，只加表和带默认值的列。
- 停容器的列与触发器：再一个迁移（见停容器设计 §3）。
- 以后升级 River：先把它新增的迁移版本导出成新的核心迁移，再升依赖。

### 6.2 连接

- River 与 gocron 都用核心现有的 pgx 连接池（每节点默认最多 20）；River 每个执行节点另占一个 LISTEN 连接。
- 2026-11-03 线上：Supabase `max_connections` 120（与 epusdt、newapi 等共用，它们约 20），sup2api 账号上限 70，两节点核心各 13 个空闲连接，插件账号共约 8 个。上线后约 +2，不需要外部连接池。
- 核心直连 Supabase 5432（不经过连接池），LISTEN/NOTIFY 可用。以后节点多了，调小每节点上限或用 Supabase 连接池的会话模式；不用事务模式（会让迁移的会话级 advisory 锁和 LISTEN 失效）。

### 6.3 数据量

cluster 周期任务每分钟一次每天 1440 行。第一批约 11 个核心任务，每天约 1.7 万行；加上插件任务（dynweight `evaluate` 每 10 秒一次，每天 8640 行）约 2.6 万行，River 保留 24 小时后清理。几秒一次的本节点事务走 gocron，不进数据库。

## 7. 控制台

“系统 → 定时任务”，只读，`settings:read`：

- 全集群任务：名称、来源（核心 / 插件）、计划、上次运行的节点、时间、耗时、结果、处理条数、连续失败次数、下次运行时间；失败的显示错误信息。
- 每节点任务：按节点分列，每个任务在各节点的最近一次运行。
- 操作（`settings:manage`）：手动运行一次（`Trigger`）、启用/停用插件动态任务。

插件页的任务历史保持不变（`plugin_job_runs`）。

## 8. 迁移范围与分批

分类见 §11：A = 全集群一次，B = 按行到期，C = 每个节点都跑，D = 进程内机制或已有可靠认领（不进框架）。

**第一批：核心 0.1.235（框架 + 核心任务 + 停容器）**

| 任务 | 范围 | 现在 | 间隔 |
| --- | --- | --- | --- |
| `core.ccgateway.park_runtimes` 停容器（新） | cluster | — | 1 分钟 |
| `core.account.automatic_recovery`（#6） | cluster | 每节点 + SKIP LOCKED | 1 分钟 |
| `core.account.lifecycle_status`（#8） | cluster | Redis 锁 | 1 分钟 |
| `core.account.preparation_cleanup`（#9） | cluster | Redis 锁 | 1 分钟 |
| `core.ccgateway.draft_sweep`（#21） | cluster | Redis 锁 | 1 分钟 |
| `core.helper.payload_expiry`（#12b） | cluster | 无 | 1 分钟（原 5 秒） |
| `core.audit.plugin_writes_purge`（#17） | cluster | 时段锁 | 1 小时 |
| `core.events.retention`（#28） | cluster | 时段锁 | 1 小时 |
| `core.jobs.retention`（#31） | cluster | 时段锁 | 1 小时 |
| `core.notify.purge`（#32b） | cluster | 时段锁 | 1 小时 |
| `core.egress.logs_prune`（#34b，修复每节点都跑） | cluster | 无 | 1 小时 |
| `core.authz.version_poll`（#18） | node | 本地 ticker | 30 秒 |
| `core.account.quota_mirror`（#3，事件触发改用 `Trigger`） | node | 本地 ticker + 事件 | 60 秒 |
| `core.webui.asset_lease`（#41） | node | 本地 ticker | 30 秒 |

原循环删除。插件定时任务这一批不变（仍走 `internal/job`）。

**第二批：插件任务（核心 + SDK，插件可不发）**
- manifest `scope`、SDK Host API、`RunJob` 新字段、`HandleJob` 分发器、插件页。
- `internal/job` 退役：现有 manifest `jobs` 经 §5.3 兼容改由 River 调度，Redis 锁与 slot 唯一索引不再使用（表保留做历史）。
- 之后四个插件各自改为启动时 `SyncTasks`，随各自下次发布。

**第三批：牵涉计费、凭证或行为变化的核心任务，逐个评估**
- 凭证续期清扫（#5）：先原样做成 cluster 任务。
- ccgateway 全量同步（#20）：现在两节点各跑且不受 `CanWork` 控制；改 cluster 会改变谁来跑，一轮可能很长（每个 key 最长 90 秒），要拆成每个 key 一个单次任务或设足够超时。
- 用量结算重试（#40）、用量对账（#38）：涉及计费，已有逐行租约和幂等键，只用 cluster 任务触发清扫、去掉 Redis 锁，不重写状态机。
- 额度清扫（#4）：内存游标改存数据库。
- helper outbox（#12a）：补上认领。

**不进框架**
- 用量限制（#7，5 秒、对时延敏感；它是全集群一次的，进 River 每天 1.7 万行且时延不稳）。
- 基础设施类每节点循环：内置插件收敛（#13，驱动就绪状态）、节点心跳（#23）、插件进程对齐（#35，5 秒 + 广播）。它们是框架自己依赖的东西，留在原处。
- D 类：缓冲刷新、队列、健康检查、pub/sub、请求内等待，以及有自己顺序/游标/租约语义的事件投递（#26）、通知投递（#32a）、插件发布协调（#36）。

## 9. 发布与回滚

- 第一批只发核心，插件不发。
- 滚动升级窗口内：新节点用新框架跑第一批任务，旧节点仍跑原循环；同一任务可能各跑一次，第一批任务都幂等，可接受。
- 回滚：旧核心不认 River 和 `tasks` 表，原循环恢复工作；新表留着无害。停容器的回滚见停容器设计 §8。
- 第二批的回滚：旧核心回到 `internal/job`；插件若已改为 `SyncTasks`，旧核心没有这个 Host API 会返回未实现，插件应把它当作非致命错误（SDK 里处理）。

## 10. 验证

- 单元（嵌入式 PG，不能跳过）：
  - cluster：两个 River 客户端（模拟两节点）同一时段只执行一次；停掉主节点后另一节点接任并继续投递；`CanWork` 撤销后不再执行、恢复后继续；失败按次数重试；单次任务按时执行、`UniqueKey` 去重、事务回滚不投递；登记表变化后两节点周期配置一致。
  - node：两个节点都跑；上次未完成时跳过；`CanWork` 为假时跳过（`AnyNode` 除外）；关停等待。
  - 插件（第二批）：`SyncTasks` 只接受当前版本；本机没有该插件版本时推迟；限制超出返回错误；停用、卸载的清理；旧 manifest `jobs` 兼容。
  - 迁移：River 迁移在空库、已迁移库上重复执行都成功；非超级用户账号执行。
  - 第一批每个迁移的任务：原有测试改为通过任务入口调用，结果不变。
- 线上（ovh）：
  - `river_leader` 有主节点；`river_job` 每个任务每个时段只有一条；第一批任务的旧 Redis 锁 key 不再出现。
  - 停掉主节点所在核心，另一节点几秒内接任。
  - 数据库连接数比上线前多 2 个左右。
  - 控制台“定时任务”页显示全部任务、两个节点的 node 任务状态。

## 11. 盘点明细（2026-11-03）

| # | 位置 | 间隔 | 做什么 | 现在的去重 | 分类 |
| --- | --- | --- | --- | --- | --- |
| 1 | account/service.go `Run` | 10s | 写 `last_used_at` 缓冲 | — | D |
| 2 | account/quota.go `quotaRecorder.run` | 5s | 写被动额度样本缓冲 | — | D |
| 3 | account/quota_mirror.go `run` | 60s | 刷新本节点额度镜像 | — | 第一批（node） |
| 4 | account/quota_refresh.go `runQuotaSweep` | 5s | 补额度行、查到期额度 | 行租约 + 本地 singleflight | 第三批 |
| 5 | account/refresh.go `runRefreshSweep` | 5m | 续期快过期的 OAuth 凭证 | Redis 锁 + 每账号锁 | 第三批 |
| 6 | account/automatic_state.go `runAutomaticStateSweep` | 1m | 自动禁用到点恢复 | SKIP LOCKED | 第一批（cluster） |
| 7 | account/automatic_state.go `runUsageLimitsLoop` | 5s | 汇总用量并执行用量限制 | 会话 advisory 锁 | 不迁 |
| 8 | account/lifecycle_status.go | 1m | 回写账号同步状态 | Redis 锁 | 第一批（cluster） |
| 9 | account/preparation_cleanup.go | 1m | 处理过期的账号准备 | Redis 锁 | 第一批（cluster） |
| 10 | account/stats.go `run` | 1s | 观测指标写 Redis | — | D |
| 11 | apikey/apikey.go `Run` | 10s | 写 API Key `last_used_at` | — | D |
| 12a | app/helper_history.go | 5s | 回放 helper 用量 outbox | 无认领 | 第三批 |
| 12b | app/helper_history.go | 5s | 清空过期 helper 负载 | 无（幂等） | 第一批（cluster） |
| 13 | app/builtin.go 收敛 | 5s 至就绪 | 内置插件检查/安装 | Redis 锁 | C（不进框架） |
| 14 | app/builtin.go 升级 | 10s 至完成 | 核心更新后升级内置插件 | Redis 锁 | D |
| 15 | app/managed.go `watchAdmission` | 1s | 校验本节点 admission | — | D |
| 16 | audit/plugin_writes.go `writeLoop` | 队列 | 写插件审计 | — | D |
| 17 | audit/plugin_writes.go `Run` | 1h | 清理旧插件审计 | 时段锁 | 第一批（cluster） |
| 18 | authz/service.go | 30s | 轮询权限版本 | — | 第一批（node） |
| 19 | ccgateway/accounts.go `reconcileKicked` | 事件 | 同步单个运行环境 | 每 key advisory 锁 | D |
| 20 | ccgateway/accounts.go `Run` | 60s | 全量同步运行环境 | 每 key advisory 锁，两节点都跑 | 第三批 |
| 21 | ccgateway/sweep.go | 1m | 删除废弃草稿、退役和孤立运行环境 | Redis 锁 | 第一批（cluster） |
| 22 | ccgateway 各处请求内等待 | 2–3s | 升级、安装、健康、上传、启动重试 | — | D |
| 23 | cluster/registry.go | 5s | 节点心跳 | — | C（不进框架） |
| 24 | cluster/slots.go | 5s/30s | 并发槽续期与回收 | Lua 原子 | D |
| 25 | cluster/bus.go | 接收 | Redis pub/sub | — | D |
| 26 | event/delivery/worker.go | 1s | 有序投递事件给插件 | Redis 锁 + 游标 | D |
| 27 | event/delivery/delivery.go `watch` | 事件 | 启停投递 worker | — | D |
| 28 | event/delivery/retention.go | 1h | 清理 7 天前事件 | 时段锁 | 第一批（cluster） |
| 29 | gateway/gateway.go `statsLoop` | 2s | hook 计数写 Redis | — | D |
| 30 | job/job.go | cron | 插件定时任务 | Redis 锁 + 唯一索引 | 第二批（插件） |
| 31 | job/retention.go | 1h | 清理插件任务记录 | 时段锁 | 第一批（cluster） |
| 32a | notify/worker.go `step` | 2s | 投递通知 | SKIP LOCKED + 租约 | D |
| 32b | notify/worker.go 清理 | 1h | 清理旧通知 | 时段锁 | 第一批（cluster） |
| 33 | observation/hub.go | 200ms | 观测批次发给插件 | — | D |
| 34a | plugin/egress/logs.go 刷新 | 2s | 写出口日志 | — | D |
| 34b | plugin/egress/logs.go 清理 | 1h | 删除 7 天前出口日志 | 无，每节点都跑 | 第一批（cluster） |
| 35 | plugin/rollout/controller.go | 5s | 本地插件进程与数据库对齐 | — | C（不进框架） |
| 36 | plugin/rollout/coordinator.go | 1s/5s | 驱动插件发布、续租约 | 数据库租约 | D |
| 37 | plugin/grpcruntime 等 | 1s/10s | 子进程监督、资源采样 | — | D |
| 38 | usage/reconcile.go | 10s | 认领到期待结算、调插件对账 | Redis 锁 + 行租约 | 第三批 |
| 39 | usage/settler.go `worker` | 200ms | 写用量队列 | — | D |
| 40 | usage/settler.go `retryLoop` | 30s | 释放过期预扣、重结算 | SKIP LOCKED + 幂等键 | 第三批 |
| 41 | webui/shared_assets.go | 30s | 前端资源租约 | advisory 锁 | 第一批（node） |

