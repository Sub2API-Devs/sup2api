# 定时任务框架：gocron（每个节点）+ River（全集群一次）（完整设计）

2026-11-03，用户决定方向；同日用户要求“先完整设计框架”，本文是实现前的完整设计，未实现。第一版（`133ffdc6b`）只定了方向；第二版（`de650d9`）补齐接口、两个后端的具体做法、表结构、迁移文件、控制台接口、插件协议、依赖版本、发布与测试；本版（第三版）按用户要求把核心里**所有**散落的定时任务纳入框架（§14），并设计了查看执行情况的页面与运行历史（§8、§10）。与第一版的差异见 §0。

“红色账号停机 3 小时后停止容器”（`plugins/ccgateway/docs/ACCOUNT-RUNTIME-PARKING-DESIGN.md`）是框架上的第一个新任务，本文不重复它的内容。

## 0. 与第一版相比的改动

| 第一版 | 本版 | 原因 |
| --- | --- | --- |
| 运行状态表叫 `tasks` | 叫 `scheduled_tasks` | 核心已有 `async_tasks` 和 `core.AsyncTasks`/`TaskIntent` 等（插件异步任务，`internal/core/ports_tasks.go`），再叫 `tasks` 容易混 |
| node 任务默认在节点不可工作时跳过，`AnyNode` 例外 | 默认每个节点都跑，`RequireWork` 才看 `CanWork` | 权限版本、额度镜像、前端资源租约这三个 node 任务（权限版本、额度镜像、前端资源租约）都在请求路径上，节点没拿到后台许可时也必须跑；默认值应符合多数情况 |
| `Register` 只能在启动前调用 | 任何时候都能调用 | node 后端在构建核心服务后就启动（前端资源租约决定 `/healthz`，必须在 HTTP 之前跑），而有的模块在之后才构建；River 只有一个通用 kind，动态登记不需要重启客户端 |
| cluster 任务同一时段去重 | 同一时段去重 + 跨时段不叠跑（`scheduled_tasks` 行租约） | 只按时段去重时，一次跑超过间隔，下一时段会在另一节点同时跑 |
| 失败一律重试 5 次 | 间隔 < 10 分钟的周期任务不重试（下一时段就是重试），其他 5 次 | 每分钟一次的任务重试会和下一时段叠在一起 |
| 卡住超过 `Timeout + 1 小时` 救回 | River 的救回时间是整个客户端一个值：固定 75 分钟，cluster 任务超时上限 1 小时 | River `RescueStuckJobsAfter` 不能按任务设 |
| 每天约 1.7 万行 | 核心约 5.5 万行/天（§13） | 第一版按 11 个每分钟任务估算；现在全部任务迁入，含 3 个 5–10 秒的任务 |
| 回滚：旧核心忽略新表 | 0.1.235 是 schema 变化发布，升级计划不能自动回滚；旧核心按以往 schema 变化的做法手动回 | 托管核心启动时 `verifyCoreSchema` 发现库里有不认识的迁移会拒绝（`app/managed_checks.go` `appliedPrefix`） |
| — | 第二批改 Host API，要先升外壳再签核心包 | 2026-10-31 事故的教训（`deploy/gateway/ovh/README.md`）：核心的 HostAPIVersion 变了先升外壳 |
| 只迁 13 个现有循环，计费、凭证、全量同步放第三批，用量限制不迁 | 20 个现有循环全部迁入，其余后台机制逐个说明不进框架的原因（§14.3） | 用户要求把散落的定时任务统一到架构中 |
| 控制台只读页只看最近一次 | 概览、最近 30 次、24 小时统计、运行历史、失败详情、耗时趋势、节点矩阵（§10） | 用户要求界面上能查看执行情况 |
| 复用 `settings:read`/`settings:manage` | 新权限 `task:read`、`task:run` | 运维要看任务、不一定能改设置 |

## 1. 目标与不做的事

目标（2026-11-03 用户：“完成功能之余，把之前散落的定时任务统一到架构中，并且系统界面上提供相关的视图来查看定时任务执行情况”）：
- 核心和插件的定时任务只有一套接口（`core.Tasks`，插件经 SDK），业务代码不 import gocron 或 River。
- **核心里所有散落的定时任务都迁进框架**（§14 逐个列出：20 个现有循环，加上 2 个新任务共 22 个任务），原来的 ticker、Redis 锁、时段锁、advisory 锁删掉。
- “每个节点都跑”和“全集群只跑一次”两类语义分别由 gocron 和 River 保证。
- 每个任务有统一的超时、并发控制、运行记录；**控制台“系统 → 定时任务”能看到每个任务的状态、运行历史、失败详情，能手动运行**（§10）。

不做：
- 不做工作流、任务依赖、任务链。
- 不补跑错过的时段（主节点切换时可能漏一次，下一时段处理所有已到期的）。
- 不做失败告警通知（控制台显示连续失败次数；以后需要再接 `notify`）。
- 不把“不是定时任务”的后台机制塞进框架：缓冲刷新、队列消费、事件投递、请求内等待、节点存活与进程生命周期（§14.3 逐个说明原因）。

## 2. 名词

| 名词 | 含义 |
| --- | --- |
| 任务（task） | 一个有名字的处理函数加上它的计划；名字全局唯一 |
| node 任务 | 每个节点各跑各的，gocron 调度，状态只在本节点内存和 Redis |
| cluster 任务 | 全集群只跑一次，River 调度和执行，状态在 `scheduled_tasks` 表 |
| 周期任务 | 有 `Every` 或 `Cron` 的任务 |
| 单次任务 | 经 `Enqueue` 提交的一次执行，只有 cluster 任务有 |
| 时段（slot） | 周期任务一次计划执行对应的时间段，cluster 周期任务每个时段最多执行一次 |
| 可工作（`CanWork`） | 节点级后台许可（托管核心为 `mode=="serving" && admission.ClaimBackground`，单机恒为真），不是选主 |
| 主节点（leader） | River 选出的节点，只有它按周期投递，也只有它做 River 的清理和救回 |

任务名：`core.<包>.<任务>` 或 `plugin.<插件 key>.<任务 id>`，正则 `^(core|plugin)\.[a-z0-9_]+\.[a-z0-9_]+$`，最长 120 字符。插件拿不到别人的名字空间，名字前缀由框架加。

## 3. 总体结构

```
业务代码（核心各包）             插件（第二批）
   │ core.Tasks                    │ manifest jobs(scope=node) / SDK Host API
   ▼                               ▼
internal/task.Service ── registry（名字 → TaskSpec、来源）
   ├── node 后端：gocron Scheduler（每节点一个）
   │      └─ 状态：节点内存 + Redis hash tasks:node:{node_id}
   ├── cluster 后端：River Client（每节点一个，可工作时 Start）
   │      ├─ 一个通用 kind sup2api.task，worker 按 name 查 registry
   │      ├─ 周期配置：registry 中的 cluster 周期任务 → River PeriodicJobs（只有主节点投递）
   │      └─ 状态：scheduled_tasks（登记 + 最近一次运行 + 不叠跑租约）
   ├── 手动运行：cluster → 插入一个单次 River 任务；node → 集群事件 task:run
   └── HTTP：GET /system/tasks、POST /system/tasks/:name/run
```

依赖：`store.DB`（pgx 连接池）、`core.Bus`、`core.NodeRegistry`（节点 ID、存活节点）、Redis（node 状态）、`background.Executor`（cluster 执行计入节点活动、受许可控制）、`canWork func() bool`、`*slog.Logger`。

## 4. 核心接口

新文件 `internal/core/ports_scheduled_tasks.go`（`ports_tasks.go` 是插件异步任务，不动）。

```go
type TaskScope string

const (
	TaskNode    TaskScope = "node"    // 每个节点各跑（gocron）
	TaskCluster TaskScope = "cluster" // 全集群一次（River）
)

type TaskSpec struct {
	Name        string        // core.<包>.<任务>
	Title       LocalizedText // 控制台显示的名称，中英文必填
	Description LocalizedText // 一句话说明
	Scope   TaskScope
	Every   time.Duration // 与 Cron 二选一；cluster 任务两者都空 = 只接受单次提交
	Cron    string        // 5 段 cron，UTC
	Timeout time.Duration // 必填；cluster 上限 1 小时，node 上限 10 分钟
	// RunOnStart：node 在本节点注册后立即跑一次；cluster 在新主节点上任时投递一次
	// （同一时段已投递过的不会重复）。
	RunOnStart bool
	// RequireWork 仅 node：本节点 CanWork 为假时跳过。默认 false，节点一启动就跑。
	// cluster 任务总是只在可工作节点执行，不需要这个字段。
	RequireWork bool
	// MaxAttempts 仅 cluster：0 取默认（周期间隔 < 10 分钟为 1，其他为 5）。
	MaxAttempts int
	Handler     TaskHandler
}

type TaskHandler func(ctx context.Context, run TaskRun) (TaskResult, error)

type TaskRun struct {
	Name        string
	ScheduledAt time.Time       // 计划时间；手动运行为提交时间
	Attempt     int             // 从 1 开始；node 恒为 1
	Args        json.RawMessage // 单次任务的参数；周期任务为 nil
	Manual      bool
	NodeID      string          // 执行节点
}

type TaskResult struct {
	Count   int    // 处理了多少条，写进运行记录
	Message string // 最多 2000 字符，超出截断
}

type Tasks interface {
	// Register 登记一个任务；名字重复、字段不合法返回错误。启动前后都可调用。
	Register(TaskSpec) error
	// Trigger 立即跑一次：node 在本节点跑（上一次没跑完则跳过）；cluster 插入一个
	// 手动单次任务（已有一个未执行的手动任务时不重复插入）。
	Trigger(ctx context.Context, name string) error
	// Enqueue 提交 cluster 单次任务；EnqueueTx 与业务写入同一事务，回滚则不投递。
	Enqueue(ctx context.Context, name string, args any, opts EnqueueOpts) error
	EnqueueTx(ctx context.Context, tx pgx.Tx, name string, args any, opts EnqueueOpts) error
}

type EnqueueOpts struct {
	RunAt     time.Time // 零值为立即
	UniqueKey string    // 同一任务、同一 UniqueKey 的未执行任务只保留一个
}

var (
	ErrTaskUnknown  = errors.New("task: unknown task")      // Trigger/Enqueue 的名字没登记
	ErrTaskInvalid  = errors.New("task: invalid spec")      // Register 校验失败（包装具体原因）
	ErrTaskNotReady = errors.New("task: backend not ready") // 后端还没启动
)

// TaskRetryAfter 让 cluster 任务 d 之后再执行，不计失败、不占重试次数
// （River JobSnooze）。node 任务返回它等同于本次跳过。
func TaskRetryAfter(d time.Duration) error
```

约定（写进 CONTRACTS）：
- 每个任务都要幂等。cluster 任务可能因救回、重试、滚动升级时新旧核心各跑一次而重复执行。
- Handler 不自己判断 `CanWork`、不自己加锁、不自己 recover，这些归框架。Handler 必须尊重 ctx：超时、关停、许可撤销都通过 ctx 取消。
- Handler 返回的错误会进运行记录和日志，不要把凭证、令牌拼进错误。
- 各包提供 `RegisterTasks(core.Tasks) error`，在 boot 里集中调用，包内不保存后端对象。

## 5. 生命周期

### 5.1 启动顺序（`internal/app/phases.go`）

1. `buildCoreServices`：创建 `b.work` 之后创建 `b.tasks = task.New(...)`，**立即** `b.tasks.StartNode(ctx)`（gocron 开始调度，此时还没有任务）。随后构建的各模块调用 `RegisterTasks(b.tasks)`。node 任务注册时就进 gocron，不用等。
2. `startHTTP`：`webui` 的前端资源租约此时注册（`RunOnStart`），`/healthz` 与托管核心的就绪检查照旧读 `sharedAssets.Ready()`。
3. `startBackground`（单机在 `run()` 里直接调用；托管核心在准入时由外壳触发）：`b.tasks.StartCluster(ctx)`。它创建 River 客户端、upsert 核心 cluster 任务的 `scheduled_tasks` 行，并启动“许可观察”协程（§7.1）。之后再注册的 cluster 任务（第二批的插件任务）直接加入 River 周期配置。
4. 托管核心的 `m.active` 仍是 `b.work.Active`：cluster 任务在 `background.Executor` 里执行（§7.2），排空时外壳看到的活动数已包含它们。

### 5.2 关停

`b.stopper.add("tasks", b.tasks.Stop)` 放在所有注册任务的模块之后，所以先于它们关停：
1. 停止许可观察；River `Stop`（软停：不再取新任务，等正在跑的，`SoftStopTimeout` 20 秒后取消它们的 ctx）。被取消的任务 River 记为失败并按重试策略处理，或由新主节点救回。
2. gocron `ShutdownWithContext`（同样最多 20 秒）。
3. 清掉本节点的 Redis node 状态。

整个过程不超过 45 秒，在现有 90 秒关停预算内。

### 5.3 许可变化

- node 任务不受许可影响（`RequireWork` 的除外，每次执行前判断）。
- cluster 后端：许可为真时 River `Start`（参与选主、执行），变假时 `Stop`。托管核心的许可是“准入后变真，排空时变假”，不会反复；但实现按可反复处理（River 支持停止后再启动）。
- 许可为假的节点仍可 `Enqueue`/`Trigger`：River 客户端不启动也能插入任务，由可工作节点执行。

## 6. node 后端（gocron v2）

- 每节点一个 `gocron.Scheduler`：`WithLocation(time.UTC)`、`WithLogger`（接 slog）、`WithLimitConcurrentJobs(8, LimitModeReschedule)`，不配分布式锁、不配选主。
- 每个任务：`Every` → `DurationJob`；`Cron` → `CronJob(spec, false)`；`WithSingletonMode(LimitModeReschedule)`（上一次没跑完，本次跳过并计一次“跳过”）；`WithName(name)`；`RunOnStart` → `WithStartAt(WithStartImmediately())`；`WithContext(nodeCtx)`。
- 执行包装：`RequireWork && !canWork()` → 跳过；`context.WithTimeout(Timeout)`；recover panic 记为失败；记录状态。
- 不经过 `background.Executor`：Executor 的 `Admitted` 就是 `CanWork`，会把默认在所有节点运行的 node 任务挡住。
- `Trigger`：gocron `Job.RunNow()`，同样受单例限制。
- 状态：每个任务一份内存记录（最近开始/结束时间、耗时、结果、处理条数、消息、错误、连续失败次数、跳过次数、下次运行时间）。每次运行结束写 Redis hash `tasks:node:{node_id}`（字段为任务名，值为 JSON），整个 key 的 TTL 2 分钟，任务服务自己每 30 秒续期一次；节点退出时删除。写 Redis 失败只记日志，不影响任务。
- 历史：每次运行（含跳过）写 Redis 列表，见 §8.3。
- 手动运行别的节点的 node 任务：发布集群事件 `task:run` `{"name":…,"node_id":…}`（`node_id` 为空表示所有节点），目标节点收到后调本机 `RunNow`。事件是尽力而为，控制台提示“已发送”，结果看状态。

## 7. cluster 后端（River）

### 7.1 客户端与许可

- 每节点一个 `river.Client[pgx.Tx]`，驱动 `riverpgxv5.New(b.db.Pool)`，`ID` 为 `<node_id>-<boot_id>`，`Logger` 接 slog，`Schema` 留空（表在 `public`，与核心表同一 search_path）。
- 客户端在 `StartCluster` 时创建一次，之后只 `Start`/`Stop`。许可观察协程每秒读一次 `canWork()`（只是一次加锁读）：假→真 `Start`，真→假 `Stop`。单机核心恒为真，创建后立即 `Start`。
- 主节点只能是正在 `Start` 的客户端，所以只在可工作节点之间选。托管核心滚动升级时，候选节点在准入前不可工作，不会抢主。

### 7.2 一个通用 kind

- River 只注册一个 worker：kind `sup2api.task`，参数：

```go
type taskArgs struct {
	Name   string          `json:"name" river:"unique"`
	Args   json.RawMessage `json:"args,omitempty"`
	Key    string          `json:"key,omitempty" river:"unique"` // 单次任务的 UniqueKey；手动运行为 "manual"
	Manual bool            `json:"manual,omitempty"`
}
func (taskArgs) Kind() string { return "sup2api.task" }
```

- worker 的 `Timeout(job)` 返回登记的 `Timeout`；`NextRetry(job)` 见 §7.6；`Work`：
  1. 按 `Name` 查 registry。查不到（滚动升级时旧核心收到新任务，或插件任务所在插件本机没加载）→ `JobSnooze(5s)`，最多推迟到任务首次插入后 `Timeout`，之后记失败。
  2. 在 `background.Executor` 的 `tasks` 组（并发 4，队列 16）里取许可：取不到（节点开始排空）→ `JobSnooze(5s)`，让别的节点执行。
  3. 取不叠跑租约（§7.4），取不到：周期任务记“跳过”并完成；手动/单次任务 `JobSnooze(10s)`。
  4. 调 Handler，recover panic；结束后在同一条 SQL 里释放租约并写运行状态（§8.1），并 `river.RecordOutput` 写本次结果（§8.2）。
  5. Handler 返回 `TaskRetryAfter(d)` → `JobSnooze(d)`；其他错误原样返回给 River 走重试。
- 队列：`core`（`MaxWorkers` 4）放核心任务；第二批加 `plugin`（`MaxWorkers` 4），插件任务慢不会挤占核心任务。

### 7.3 周期投递与“同一时段一次”

- 每个 cluster 周期任务对应一个 River `PeriodicJob`，`ID` 为任务名，用 `PeriodicJobs().AddSafely` 加入，`RemoveByID` 移除。计划用核心现有的 `job.ParseSchedule`（移到 `internal/task/schedule.go`，`internal/job` 改为引用它）：`@every d` 按 UTC 对齐到 d 的整数倍，cron 按 UTC。这与插件任务现在的计划语义完全相同。
- 只有主节点的 River 按这份配置投递。每个节点用自己的 registry 构建同一份配置，所以谁当主节点配置都一样（同一版本的核心任务相同；插件动态任务见 §11.3）。
- 插入时 `UniqueOpts{ByArgs: true, ByPeriod: P}`，唯一参数是 `name`（周期任务 `key` 为空）。`P`：`Every` 任务为间隔；`Cron` 任务为接下来 64 次触发里相邻两次的最小间隔。River 按 UTC 把计划时间向下取整到 P 的整数倍，同一段里只能插入一个；`ByState` 用默认值（包含已完成），所以已完成的那次也会挡住重复插入（已完成的行保留 24 小时）。
- 主节点切换：新主节点 `RunOnStart` 的任务立即投递一次，如果旧主节点在本时段已投递，唯一约束挡住；切换那一刻可能漏一个时段，不补跑。

### 7.4 跨时段不叠跑

`scheduled_tasks` 行上的租约：

```sql
UPDATE scheduled_tasks
   SET lease_job_id = $2, lease_node = $3, lease_until = now() + $4::interval,
       last_started_at = now()
 WHERE name = $1 AND (lease_until IS NULL OR lease_until < now())
RETURNING name
```

- 拿不到说明上一次还在跑（或执行它的节点已死、租约未过期）。租约时长 = `Timeout + 1 分钟`，节点死掉最多一个超时之后别人能接着跑。
- 释放：运行结束写状态时 `lease_until = NULL`（条件 `lease_job_id = $job`，防止释放别人的租约）。
- 这一步不占连接，不依赖 Redis，崩溃后自然过期。

### 7.5 单次任务与手动运行

- `Enqueue(name, args, opts)`：名字必须是已登记的 cluster 任务；`args` JSON 编码后不超过 64 KiB；`RunAt` → `ScheduledAt`；`UniqueKey` 非空时 `UniqueOpts{ByArgs: true, ByState: 未完成的状态}`（available、pending、running、retryable、scheduled），已完成的不挡新的。
- `EnqueueTx` 用调用方的 `pgx.Tx` 插入（River `InsertTx`），业务事务回滚则任务不存在。
- `Trigger` 对 cluster 任务插入 `{name, key:"manual", manual:true}`，唯一约束同上，所以连点只会排一个；它不受周期任务的时段唯一约束影响（`key` 不同），但受 §7.4 租约约束。

### 7.6 超时、重试、救回、保留

| 项 | 值 | 说明 |
| --- | --- | --- |
| 单次超时 | 登记的 `Timeout` | River `Worker.Timeout` |
| 超时上限 | cluster 1 小时，node 10 分钟 | 注册时校验 |
| 重试次数 | `MaxAttempts`，默认：间隔 < 10 分钟的周期任务 1 次（不重试），其他 5 次 | 插入时设 `InsertOpts.MaxAttempts` |
| 重试间隔 | min(River 默认退避 attempt⁴ 秒, 周期间隔/2, 10 分钟) | 自定义 `NextRetry` |
| 卡住救回 | 75 分钟 | `RescueStuckJobsAfter`，客户端级，是救回的下限：River 救回前还会看 `Worker.Timeout(job)`，超时更长的任务等超时过了才救回（2026-11-04 核实 v0.49.0 `job_rescuer.go`）。1 小时上限的真正理由是发布与插件升级会在 20–30 秒内中断运行，长任务应当分段（CONTRACTS §77.8） |
| 已完成保留 | 24 小时 | `CompletedJobRetentionPeriod` |
| 取消、丢弃保留 | 7 天 | 便于查失败原因 |
| 软停 | 20 秒 | `SoftStopTimeout` |
| River 重建索引 | 关闭 | `ReindexerSchedule` 设为 `NeverSchedule()`；表小，不需要定期 `REINDEX CONCURRENTLY` |

### 7.7 混合版本

- 第一批上线前的旧核心（0.1.234）不认识 River，不会执行 `sup2api.task`；新旧节点共存时，旧节点仍跑原循环，新节点跑任务，同一件事可能各做一次，第一批任务都幂等（§14）。
- 以后的版本新增核心任务：主节点是旧版本时，新任务不会被投递，直到新版本节点成为主节点（最多一个升级窗口）；旧版本节点取到不认识的任务名会 snooze（§7.2）。
- 删除核心任务：旧行由 `core.task.housekeeping` 清理（§8.1）。

## 8. 运行状态与运行历史

### 8.1 `scheduled_tasks`（cluster 任务的登记与最近一次运行）

```sql
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  name                  text PRIMARY KEY,
  source                text NOT NULL,              -- core | plugin_manifest | plugin_runtime
  plugin_key            text,                       -- 插件任务的插件
  schedule              text NOT NULL DEFAULT '',   -- "@every 1m" / cron / ''（只接受单次）
  timeout_ms            integer NOT NULL,
  max_attempts          integer NOT NULL DEFAULT 0,
  args                  jsonb,                      -- 插件动态任务的周期参数
  enabled               boolean NOT NULL DEFAULT true,
  seen_version          text NOT NULL DEFAULT '',   -- 最近一次登记它的核心版本
  seen_at               timestamptz NOT NULL DEFAULT now(),
  lease_job_id          bigint,
  lease_node            text,
  lease_until           timestamptz,
  last_job_id           bigint,
  last_node             text,
  last_started_at       timestamptz,
  last_finished_at      timestamptz,
  last_status           text,                       -- succeeded | failed | timeout | skipped
  last_count            integer,
  last_message          text,
  last_error            text,
  last_success_at       timestamptz,
  consecutive_failures  integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scheduled_tasks_plugin_idx ON scheduled_tasks (plugin_key) WHERE plugin_key IS NOT NULL;
```

- 核心 cluster 任务：`StartCluster` 时 upsert（只改 `schedule`、`timeout_ms`、`max_attempts`、`seen_version`、`seen_at`，不碰运行状态）。
- 每次运行结束更新一行：`last_*`、`last_success_at`、`consecutive_failures`（成功清零，失败 +1，跳过不变）、释放租约。`last_error` 截断到 2000 字符。
- 框架自带 cluster 任务 `core.task.housekeeping`（每小时）：删除 `source='core'` 且 `seen_at` 早于 7 天的行（已被删掉的核心任务）；清掉过期租约；正在登记的核心任务刷新 `seen_at`。

### 8.2 cluster 任务的运行历史：`river_job`

不另建历史表。每次执行就是一行 `river_job`（kind `sup2api.task`），River 已经记录了状态、尝试次数、每次尝试的错误（`errors`）、开始/结束时间、执行客户端（`attempted_by`）。框架补两样：

- worker 结束前调用 `river.RecordOutput(ctx, out)`，`out` 为 `{"status":"succeeded|failed|timeout|skipped","count":N,"message":"…","node":"…","duration_ms":N,"manual":bool}`，写进行的 `metadata.output`。跳过（租约被占）也是一行，状态 `skipped`。
- 0084 迁移给 `river_job` 加一个表达式索引，供视图按任务查历史：

```sql
CREATE INDEX IF NOT EXISTS river_job_task_name_idx
  ON river_job ((args->>'name'), id DESC) WHERE kind = 'sup2api.task';
```

保留：成功的 24 小时、失败/丢弃/取消的 7 天（§7.6），所以视图能看 24 小时的全部运行和 7 天内的失败。需要更久的统计时再加汇总表（不在本次范围）。

### 8.3 node 任务的状态与历史：Redis

不进数据库（几秒一次、每节点各一份，写库量与价值不成比例）。

- 当前状态：hash `tasks:node:{node_id}`，字段为任务名，值为 JSON（最近一次开始/结束、耗时、结果、处理条数、消息、错误、连续失败次数、跳过次数、下次运行时间、计划、超时）。TTL 2 分钟，任务服务每 30 秒续期；节点退出时删除。
- 运行历史：list `tasks:node:{node_id}:runs:{name}`，每次运行 `LPUSH` 一条 JSON 并 `LTRIM` 到最近 100 条，TTL 24 小时。跳过也记一条。
- 写 Redis 失败只记日志，不影响任务；控制台读不到某节点时显示“无数据”。

## 9. 数据库迁移

迁移都在 `next/server/internal/migrations/`，每个文件一个事务，跨节点 advisory 锁串行（`store.Migrate`）。

### 9.1 River 表：0076–0083

River v0.49.0 的 PostgreSQL 迁移在 `riverdriver/riverpgxv5@v0.49.0/migration/main/00N_*.up.sql`，共 8 个版本。每个版本一个核心迁移：

| 文件 | River 版本 | 内容 |
| --- | --- | --- |
| `0076_river_v001.sql` | 1 | `river_migration`（旧结构） |
| `0077_river_v002.sql` | 2 | `river_job_state`、`river_job`、索引、`river_leader` |
| `0078_river_v003.sql` | 3 | `tags` 非空 |
| `0079_river_v004.sql` | 4 | `pending` 状态、`river_queue` |
| `0080_river_v005.sql` | 5 | `river_migration` 改为 (line, version)、唯一键、`river_client` |
| `0081_river_v006.sql` | 6 | 批量唯一 `unique_states` |
| `0082_river_v007.sql` | 7 | `river_notification` 等 |
| `0083_river_v008.sql` | 8 | PostgreSQL 为空操作（`SELECT 1`） |

- 生成：用锁定版本模块里的 SQL（`riverpgxv5.Driver.GetMigrationFS`，等同 `river migrate-get --line main --version N --up`），只把 `/* TEMPLATE: schema */` 替换为空（表放 `public`），文件头注明来源模块、版本与原文件 SHA-256。不改写 River 的 DDL，以免以后 River 的迁移对不上。
- 可重复执行：核心从 `FirstIdempotentMigration`（0026）起的迁移都必须能再跑一遍（`TestMigrationsFromFirstIdempotentRunTwice`），River 的 SQL 不满足。所以每个文件把 River 的 SQL 包在一个 `DO` 块里：`river_migration` 已有这个版本就直接返回，否则 `EXECUTE` River 的 SQL，再写版本行（v1–v4 `INSERT INTO river_migration (version)`，v5 起 `(line, version)`，都 `ON CONFLICT DO NOTHING`；v5 自己会把旧行搬到新结构）。版本行也让 `rivermigrate` 的校验与以后的升级认得这份库。
- 测试：`internal/migrations/river_migrations_test.go` 的 `TestRiverMigrationsMatchModule` 按上面的规则从依赖模块生成期望内容并与目录里的文件逐字比较，`go.mod` 里 River 的版本也要一致；`SUB2API_WRITE_RIVER_MIGRATIONS=1` 时写出文件。
- 以后升级 River：先把新增版本导出成新的核心迁移（编号接着往后），再升依赖。

### 9.2 `0084_scheduled_tasks.sql`

§8.1 的表和索引；§8.2 的 `river_job_task_name_idx`；`plugin_job_runs` 加 `scope text NOT NULL DEFAULT 'cluster'`（第二批才用，先加好免得再发一次 schema 变化）。

### 9.3 `0085_account_runtime_parking.sql`

停容器的列与触发器，见停容器设计 §3；另加 `ccgateway_runtimes.blocked_revision bigint`、`blocked_at timestamptz`（可空，§14.1 运行环境同步的阻断去重用，0.1.236 才读写，先加好免得再发一次 schema 变化）。

### 9.4 权限与验证

- 用与生产相同的非超级用户账号在测试库执行（River 的迁移只建表、类型、函数、索引，都不需要超级用户；`river_leader`、`river_client` 是 UNLOGGED 表，Supabase 允许）。
- 空库、已迁移库各执行两遍；托管核心的 schema 契约（`SchemaContract`）随之变化，发布时 `SOURCE_SCHEMA` 传旧契约。

## 10. 控制台：“系统 → 定时任务”

### 10.1 权限与菜单

- 新权限（`authz/catalog.go`）：`task:read`“查看定时任务”、`task:run`“手动运行定时任务”（敏感）。第二批加 `task:manage`“管理插件定时任务”（启用/停用插件动态任务）。
- 内置角色：管理员全部；“运维”（`operator`）给 `task:read` 和 `task:run`。
- 菜单：`authz/menus.go` 系统组，放在“集群节点”之后：`{"tasks", lt("Scheduled tasks", "定时任务"), "clock", "/system/tasks", []string{"task:read"}}`。

### 10.2 接口（`internal/task/http.go`，挂在 `/api/v1`）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/system/tasks` | `task:read` | 概览 + 全部任务的当前状态 |
| GET | `/system/tasks/:name` | `task:read` | 单个任务详情：登记信息、当前状态、24 小时统计、排队中的单次任务数 |
| GET | `/system/tasks/:name/runs` | `task:read` | 运行历史；cluster 读 `river_job`，node 读 Redis（`node_id` 必填） |
| POST | `/system/tasks/:name/run` | `task:run` | 手动运行；body `{"node_id":""}` 只对 node 任务有意义，空为所有节点 |
| PATCH | `/system/tasks/:name` | `task:manage` | 第二批：`{"enabled":bool}`，只允许插件动态任务 |

`GET /system/tasks`：

```json
{
  "summary": {"total": 22, "running": 1, "failing": 0, "failed_24h": 3, "leader": "sup2api-1"},
  "cluster": [{
    "name": "core.ccgateway.park_runtimes", "title": "停止红色账号的容器", "source": "core", "plugin_key": null,
    "schedule": "@every 1m", "timeout_ms": 50000, "enabled": true,
    "running": false, "lease_node": null,
    "last": {"node": "sup2api-1", "started_at": "…", "finished_at": "…", "duration_ms": 120,
             "status": "succeeded", "count": 0, "message": "", "error": ""},
    "last_success_at": "…", "consecutive_failures": 0, "next_run_at": "…",
    "recent": ["succeeded", "succeeded", "skipped", "failed", "…"],
    "stats_24h": {"runs": 1440, "failed": 0, "skipped": 2, "avg_ms": 95, "max_ms": 820}
  }],
  "nodes": [{
    "node_id": "sup2api-1", "alive": true,
    "tasks": [{"name": "core.authz.version_poll", "title": "刷新权限版本", "schedule": "@every 30s",
               "last": {…}, "consecutive_failures": 0, "skipped": 0, "next_run_at": "…",
               "recent": ["succeeded", "…"]}]
  }]
}
```

- `recent` 为最近 30 次的结果（新的在前）；cluster 的 `stats_24h` 用一条聚合查询从 `river_job` 算出（走 §8.2 的索引），每次请求一次，不缓存。
- `next_run_at` 由计划算出；`leader` 读 `river_leader`（显示节点 ID，不显示 boot ID）。
- `failing` 是 `consecutive_failures > 0` 的任务数（cluster + 各节点 node 任务）。

`GET /system/tasks/:name/runs?status=failed&limit=50&before_id=…&node_id=…`：

```json
{"runs": [{"id": 912345, "node": "sup2api-ccp", "scheduled_at": "…", "started_at": "…", "finished_at": "…",
           "duration_ms": 130, "attempt": 1, "max_attempts": 1, "status": "failed", "manual": false,
           "count": 0, "message": "", "error": "…", "errors": [{"attempt": 1, "at": "…", "error": "…"}]}],
 "next_before_id": 912300}
```

- cluster：`status` 过滤对应 `river_job.state` 与 `metadata.output.status`；`limit` 最大 200；按 `id` 倒序翻页。排队中的（`available`/`scheduled`/`retryable`）也在列表里，状态为 `queued`/`retrying`。
- node：从 Redis 列表取，最多 100 条，`before_id` 不适用（一次返回全部）。
- 手动运行写审计 `task.run_manual`（任务名、节点、操作人）。
- 错误：不认识的任务 404 `task_not_found`；node 任务查历史缺 `node_id` 400 `node_required`；对插件 manifest 任务 PATCH 400 `task_not_editable`；节点不在线 409 `node_offline`。

### 10.3 页面（`web/src/views/tasks/`）

**顶部概览**：五个数字卡片：任务总数、正在运行、连续失败中的任务（大于 0 标红）、24 小时失败次数、当前主节点。页面可见时每 10 秒自动刷新，右上角显示上次刷新时间和“刷新”按钮。

**页签一：全集群任务**（表格，默认按名称排序，失败中的置顶）：

| 列 | 内容 |
| --- | --- |
| 任务 | 中文名称；下面一行灰色小字为任务名（`core.account.usage_limits`）；插件任务带插件标签 |
| 计划 | “每 1 分钟”“每天 03:00（UTC）”；只接受单次提交的显示“按需” |
| 状态 | 运行中（蓝，显示节点）/ 成功（绿）/ 失败（红）/ 跳过（灰）/ 从未运行 |
| 最近 30 次 | 30 个小方块，颜色同状态，悬停显示时间、节点、耗时 |
| 上次运行 | 相对时间 + 节点 + 耗时 |
| 下次运行 | 相对时间 |
| 24 小时 | 运行次数 / 失败次数 / 平均耗时 |
| 连续失败 | 数字，大于 0 标红 |
| 操作 | “立即运行”（`task:run`），点后按钮显示“已提交” |

筛选：来源（核心 / 插件）、状态（全部 / 失败中 / 运行中）、搜索名称。

**页签二：每节点任务**：行为任务、列为节点的矩阵。单元格显示上次结果的颜色点、相对时间和耗时；节点离线的列标灰。行尾“立即运行”可选“所有节点”或某个节点。

**任务详情抽屉**（点任务行或单元格打开）：
- 基本信息：中文名称和说明、任务名、范围（全集群一次 / 每个节点）、计划、超时、最多尝试次数、来源、是否需要后台许可（node）、最近成功时间。
- 运行历史表：时间、节点、尝试次数、耗时、结果、处理条数、消息；失败行展开显示错误全文和每次尝试的错误。状态筛选（全部 / 失败 / 跳过 / 排队中），“加载更多”翻页。node 任务在抽屉顶部选节点。
- 耗时趋势：最近 100 次的耗时折线（超时线为红色虚线），只在 cluster 任务和已选节点的 node 任务上显示。
- “立即运行”。

**文案**：每个核心任务在登记时带中英文名称和一句说明（`TaskSpec.Title`、`TaskSpec.Description`），页面不自己维护任务名映射；插件任务用 manifest `jobs[].title`（第二批新增，没有时显示 id）。状态、错误码进 `reasonMessages`，中英文。

**其他入口**：
- “集群节点”页每个节点卡片加一行“定时任务：N 个，失败 M 个”，点击跳到每节点页签并定位到该节点。
- 插件详情页的“任务”页签保持现状（`plugin_job_runs`），第二批加一个链接“在定时任务中查看”。

## 11. 插件（第二批，2026-11-04 已实现，核心 0.1.237；与本节不同之处见 CONTRACTS §77.8）

### 11.1 manifest

```json
"jobs": [
  { "id": "refresh_cache", "scope": "node", "schedule": "@every 30s", "timeoutSec": 10 },
  { "id": "cleanup", "schedule": "0 3 * * *", "timeoutSec": 300 }
]
```

- `scope`：`node` 或 `cluster`，省略为 `cluster`（兼容现有四个插件）。
- 校验（上传时）：间隔不小于 5 秒；`node` 任务每个插件最多 10 个、超时不超过 10 分钟；`cluster` 任务超时不超过 1 小时（0.1.238 起；之前允许 24 小时，现有插件最长 600 秒）。已存的旧版本不再检查，超出部分登记时截断。
- 只有 manifest 能声明 `node` 任务。核心在本节点加载这个插件版本时注册（名字 `plugin.<key>.<id>`），卸载、停用、换版本时注销；执行时调本机插件实例的 `RunJob`。

### 11.2 协议

`app.proto` `RunJobRequest` 增加字段（旧插件不读，不受影响）：

```proto
message RunJobRequest {
  string job_id = 1;
  int64 scheduled_at_unix = 2;
  bool manual = 3;
  bytes args = 4;      // 单次任务参数（JSON），周期任务为空
  string scope = 5;    // "node" | "cluster"
  int32 attempt = 6;
  string run_id = 7;   // River job id 或 node 运行 id
}
message RunJobResponse {
  string message = 1;
  int32 count = 2;          // 新增
  int64 retry_after_ms = 3; // 新增：>0 表示让核心稍后再执行（TaskRetryAfter）
}
```

Host API（插件 → 核心，`host.proto` 新增，需要 `jobs` 权限）：

| 方法 | 作用 |
| --- | --- |
| `SyncTasks(tasks[])` | 用一组任务整体替换本插件的运行时周期任务（声明式，重复调用幂等） |
| `UpsertTask(id, schedule, args, timeout_sec, enabled)` | 新增或修改一个 |
| `DeleteTask(id)` | 删除一个 |
| `ListTasks()` | 列出本插件的运行时周期任务 |
| `EnqueueTask(id, args, run_at_unix, unique_key)` | 单次任务 |

- Host API 版本号加一。**先升外壳，再用新外壳签核心包**（2026-10-31 事故教训）。
- 只接受当前生效插件版本实例的调用；灰度期间旧版本的 `SyncTasks` 返回成功但忽略，避免来回覆盖。
- 执行节点本机没加载当前版本的这个插件：snooze 5 秒，最多推迟到超时，再不行记失败。
- 限制：每插件 200 个运行时周期任务、间隔不小于 10 秒、参数不超过 64 KiB、未执行的单次任务最多 1 万个；超出返回 `RESOURCE_EXHAUSTED`，不静默丢弃。
- 插件停用：worker 遇到它的任务直接完成并记“跳过（插件已停用）”，周期配置移除；启用后恢复。卸载：删 `scheduled_tasks` 行，取消未执行的单次任务（`river_job` 按 `args->>'name'` 前缀）。

### 11.3 插件动态任务的周期配置同步

- 运行时周期任务存在 `scheduled_tasks`（`source='plugin_runtime'`），这张表就是它们的登记表。写入后发布集群事件 `task:changed`；每个节点收到后（另每 60 秒自检一次）从表重建本节点 River 周期配置中插件那部分（按 ID 增删），保证谁当主节点配置一致。
- 现有 manifest `jobs`（`cluster`）：核心在插件当前版本生效时替它写 `source='plugin_manifest'` 的行，行为与现在相同，插件不用重新发布。

### 11.4 SDK（Go）

```go
tasks := host.Tasks()
_ = tasks.Sync(ctx, []sdk.Task{{ID: "evaluate", Every: 10 * time.Second, Timeout: time.Minute}})
_ = tasks.Enqueue(ctx, "review", args, sdk.RunAt(t), sdk.UniqueKey(id))

app.HandleJob("evaluate", func(ctx context.Context, run sdk.JobRun) (sdk.JobResult, error) { … })
```

`HandleJob` 是 `RunJob` 的分发器，node 与 cluster 任务都用它；核心是旧版本（没有这些 Host API）时 `Sync` 返回 `ErrUnimplemented`，SDK 文档要求插件把它当非致命错误。

### 11.5 `internal/job` 退役

第二批上线后，manifest `jobs` 全部经 §11.1/§11.3 调度；`internal/job` 的 Redis 锁、时段唯一索引不再使用；`plugin_job_runs` 继续写（插件页历史），由框架在每次插件任务运行时写入；`job.retention`（#31）已在第一批迁成 `core.jobs.retention`。

## 12. 依赖

| 模块 | 版本 | 说明 |
| --- | --- | --- |
| `github.com/riverqueue/river` | v0.49.0 | 2026-10-05 发布。v0.50.0（10-27）、v0.51.0（11-01）发布不满两周，不用 |
| `github.com/riverqueue/river/riverdriver/riverpgxv5` | v0.49.0 | 与 river 同版本 |
| `github.com/riverqueue/river/rivertype`、`rivershared`、`riverdriver` | v0.49.0 | 间接依赖，随 river |
| `github.com/go-co-op/gocron/v2` | v2.22.0 | 2026-07-09 发布；v2.23.0（10-26）不满两周 |

- River v0.49.0 要求 pgx v5.11.0（核心已是这个版本）、Go 1.26（核心 1.27）、`robfig/cron/v3`（核心已用）。gocron 引入 `google/uuid`、`jonboulle/clockwork`。
- River 是 MPL-2.0（文件级 copyleft，只用不改源码没有义务）；gocron 是 MIT。
- `go mod tidy` 后提交 `go.mod`/`go.sum`；只改 `next/server` 模块。

## 13. 连接与数据量

- River 用核心现有连接池（每节点默认最多 20）。正在 `Start` 的客户端另占一个长连接做 LISTEN（取任务通知、选主通知）；不可工作节点不占。上线后集群多约 2 个连接（2026-11-03：Supabase `max_connections` 120，sup2api 账号上限 70，两节点核心各约 13 个）。
- 不经过 Supabase 的事务模式连接池（会让迁移的会话 advisory 锁和 LISTEN 失效）。以后节点多了，调小每节点上限或用会话模式；也可以对 River 开 `PollOnly`（不 LISTEN，每秒轮询）。
- `river_job` 每天行数（成功的保留 24 小时，所以表里常驻约一天的量）：

| 任务 | 间隔 | 行/天 |
| --- | --- | --- |
| `core.account.usage_limits`、`core.helper.usage_replay` | 5 秒 | 2 × 17280 |
| `core.usage.reconcile` | 10 秒 | 8640 |
| 7 个每分钟任务（停容器、自动恢复、生命周期状态、准备清理、草稿清扫、helper 负载过期、运行环境同步） | 1 分钟 | 7 × 1440 |
| `core.account.credential_refresh` | 5 分钟 | 288 |
| 6 个每小时任务 | 1 小时 | 144 |
| 合计（核心） | | 约 5.5 万 |
| 第二批插件任务（dynweight `evaluate` 10 秒等） | | 约 +9 千 |

  每行约 1 KB（含 `metadata.output`），常驻约 60 MB 以内；River 的清理任务每次删一批，不会长时间锁表。§8.2 的索引只覆盖本框架的行。
- node 任务不写库：Redis 每节点每任务最多 100 条历史，5 个 node 任务 × 2 节点约 1000 条，可忽略。

## 14. 散落定时任务的统一（全部迁移清单）

分类见 §18 盘点：A = 全集群一次，B = 按行到期，C = 每个节点都跑，D = 进程内机制或已有可靠认领。迁移原则：

- **全集群一次（A）** → cluster 任务，删掉 Redis 锁、时段锁、advisory 锁。
- **按行到期、多节点分摊（B）**：已经用行租约或 `SKIP LOCKED` 让多个节点分摊的，保持“每个可工作节点都跑”的语义 → node 任务 + `RequireWork`，行级认领原样保留；只有一个节点在跑（靠 Redis 锁）的 → cluster 任务。
- **每个节点都跑（C）** → node 任务。
- 原循环、原锁删除；原有测试改为通过任务入口调用，结果不变；控制台能看到每一个。
- 每个任务的 Handler 就是原循环体里那一次调用，不改业务逻辑；改了间隔或语义的在“要点”里写明。

### 14.1 迁进框架的任务（20 个现有循环 + 2 个新任务；插件任务调度 #30 在第二批）

**cluster 任务（17 个）**

| 任务名 | 中文名 | # | 计划 / 超时 | 原位置与原去重 | 要点 |
| --- | --- | --- | --- | --- | --- |
| `core.ccgateway.park_runtimes` | 停止红色账号的容器 | 新 | 1m / 50s | — | 停容器设计 §4 |
| `core.account.automatic_recovery` | 自动禁用到点恢复 | 6 | 1m / 50s | `account/automatic_state.go` `runAutomaticStateSweep`，每节点 + SKIP LOCKED | 保留 SKIP LOCKED（与手动操作并发）；`RunOnStart`（原来启动即跑一次） |
| `core.account.usage_limits` | 执行账号用量限制 | 7 | 5s / 30s | `runUsageLimitsLoop` → `runUsageLimits`，会话 advisory 锁 | 删 advisory 锁（不再占一个连接）；租约保证不叠跑；第一版设计说“不迁”，现按用户要求迁入 |
| `core.account.lifecycle_status` | 回写账号同步状态 | 8 | 1m / 50s | `account/lifecycle_status.go`，Redis 锁 | |
| `core.account.preparation_cleanup` | 清理过期的账号准备 | 9 | 1m / 50s | `account/preparation_cleanup.go`，Redis 锁 | |
| `core.account.credential_refresh` | 续期快过期的 OAuth 凭证 | 5 | 5m / 4m | `account/refresh.go` `runRefreshSweep`，Redis 锁 + 每账号锁 | 删扫描级 Redis 锁；**每账号锁保留**（手动刷新、请求路径也会续期，它防的是并发续期同一账号，不是调度） |
| `core.helper.usage_replay` | 回放 helper 用量 | 12a | 5s / 45s | `app/helper_history.go`，每节点都跑、无认领 | 改为一个节点跑，修复两节点读同一批；回放本来就幂等（回执事务 + outbox 摘要） |
| `core.helper.payload_expiry` | 清空过期 helper 负载 | 12b | 1m / 50s | 同上，5 秒 | 5 秒改 1 分钟（过期负载晚最多 1 分钟清空） |
| `core.audit.plugin_writes_purge` | 清理旧插件审计 | 17 | 1h / 5m | `audit/plugin_writes.go` `Run`，时段锁 | 写队列 `writeLoop` 不动 |
| `core.ccgateway.draft_sweep` | 清理废弃草稿和孤立运行环境 | 21 | 1m / 50s | `ccgateway/sweep.go`，Redis 锁 + `CanWork` | |
| `core.ccgateway.runtime_sync` | 全量同步账号运行环境 | 20 | 1m / 10m | `ccgateway/accounts.go` `Run`，两节点都跑、不受 `CanWork` 控制，每 key advisory 锁 | 改为一个可工作节点跑；每 key advisory 锁保留（事件触发的单 key 同步 #19 仍在每个节点上）；一轮内并发 4 个 key，每个最长 90 秒；`sweepNow` 改 `Trigger`；阻断去重移到数据库（见下） |
| `core.events.retention` | 清理 7 天前事件 | 28 | 1h / 5m | `event/delivery/retention.go`，时段锁 | |
| `core.jobs.retention` | 清理插件任务记录 | 31 | 1h / 5m | `job/retention.go`，时段锁 | 调现有 `PurgeRuns` |
| `core.notify.purge` | 清理旧通知 | 32b | 1h / 5m | `notify/worker.go` 清理，时段锁 | 投递 #32a 不动 |
| `core.egress.logs_prune` | 删除 7 天前出口日志 | 34b | 1h / 5m | `plugin/egress/logs.go`，每节点都跑 | 修复每节点重复删除；刷新 #34a 不动 |
| `core.usage.reconcile` | 对账到期的待结算用量 | 38 | 10s / 2m | `usage/reconcile.go` `reconcileLoop`，Redis 锁 + 行租约 | 删 Redis 锁；行租约、幂等键、状态机不动；Handler 等本轮派发的对账请求结束再返回（原来派发即返回），这样运行记录里的条数和耗时是真实的 |
| `core.task.housekeeping` | 定时任务自身维护 | 新 | 1h / 1m | — | §8.1 |

**node 任务（5 个）**

| 任务名 | 中文名 | # | 计划 / 超时 | `RequireWork` | 原位置 | 要点 |
| --- | --- | --- | --- | --- | --- | --- |
| `core.authz.version_poll` | 刷新权限版本 | 18 | 30s / 10s | 否 | `authz/service.go` `Start` 里的 ticker | 订阅 `authz:changed` 不动 |
| `core.account.quota_mirror` | 刷新本节点额度镜像 | 3 | 60s / 30s | 否 | `account/quota_mirror.go` `run` | 启动预热（失败退避重试）留在模块里，预热成功后才登记；`kick` 改 `Trigger` |
| `core.webui.asset_lease` | 续期前端资源租约 | 41 | 30s / 30s | 否 | `webui/shared_assets.go` `Start` | `RunOnStart`；`Ready()` 仍由模块维护；在 `startHTTP` 登记，早于就绪检查 |
| `core.account.quota_sweep` | 查询到期的账号额度 | 4 | 5s / 60s | 是 | `account/quota_refresh.go` `runQuotaSweep` | 多节点分摊、行租约保留；本地 `quotaSweepMu` 由单例模式代替；分页游标仍在本节点内存（重启从头扫，行租约保证不重复查询） |
| `core.usage.settlement_retry` | 释放过期预扣并重新结算 | 40 | 30s / 5m | 是 | `usage/settler.go` `retryLoop` | 多节点分摊、SKIP LOCKED 和幂等键保留 |

**`core.ccgateway.runtime_sync` 的阻断去重**：现在“同一 revision 10 分钟内不重复下发 `enabled:false`”（`blockedRecently/markBlocked`）记在节点内存里。改为任意可工作节点执行后，内存去重会变成“每个节点各发一次”。0085 迁移给 `ccgateway_runtimes` 加 `blocked_revision bigint`、`blocked_at timestamptz`（可空），去重改为读写这两列（条件更新，谁先写谁发），事件触发的单 key 同步也用它。

### 14.2 插件任务调度（#30）

第二批（§11），`internal/job` 退役。

### 14.3 不进框架的后台机制（逐个说明）

这些不是“按计划周期执行的工作”，放进调度器反而会丢语义：

| # | 机制 | 不进框架的原因 |
| --- | --- | --- |
| 1、2、10、11、29、33、34a、39 | `last_used_at`、被动额度样本、观测指标、API Key 使用时间、hook 计数、观测批次、出口日志、用量队列的写缓冲 | 攒批写：间隔只是攒批窗口，满了要提前写，关停时必须最后刷一次；按计划调度会丢这两点 |
| 16 | 插件审计写队列 | 队列消费者，不是定时任务 |
| 19、27 | 运行环境单 key 同步、投递 worker 启停 | 事件触发，按事件到达即处理 |
| 25 | Redis pub/sub 接收 | 长连接接收，不是周期执行 |
| 26、32a | 事件有序投递、通知投递 | 有游标/顺序/租约语义，自己的认领比框架的租约更细；它们本身是“消费者” |
| 22 | 请求内等待（升级、安装、健康、上传、启动重试） | 属于一个请求，请求结束就结束 |
| 13、14 | 内置插件收敛、内置插件升级 | 决定节点能否就绪，运行到完成就退出；在 River 启动（准入）之前就必须跑 |
| 15 | 托管核心准入校验（1 秒） | 进程生命周期控制，撤销准入时要排空，不能依赖它所控制的后台调度 |
| 23 | 节点心跳 | 决定本节点在别的节点眼里是否存活；错过一次就可能被判死、并发槽被回收，不和业务任务共用调度器 |
| 24 | 并发槽续期与回收 | 同上，续期失败会让请求的并发槽丢失 |
| 35、36 | 插件进程对齐、插件发布协调 | 插件运行时的控制回路（5 秒 + 广播即时触发，关停顺序要早于插件实例）；第二批的插件 node 任务依赖它们加载插件 |
| 37 | 子进程监督、资源采样 | 每个插件进程一个，随进程生灭 |

以后新增的后台工作，凡是“按计划周期执行、彼此独立”的，一律用 `core.Tasks`；代码评审时不再接受新的业务 ticker（写进 CONTRACTS）。

## 15. 发布与回滚

建议一轮开发、分两个核心版本发布，把牵涉计费、凭证、运行环境同步的迁移和框架本身分开，出问题时容易定位：

| 版本 | 内容 |
| --- | --- |
| 核心 0.1.235 | 框架（§4–§10，不含插件部分）、“定时任务”页面、停容器、迁移 0076–0085；§14.1 中不涉及计费和凭证的任务：#3、#6、#8、#9、#12b、#17、#18、#21、#28、#31、#32b、#34b、#41，以及两个新任务 |
| 核心 0.1.236 | #4 额度查询、#5 凭证续期、#7 用量限制、#12a helper 用量回放、#20 运行环境同步、#38 对账、#40 结算重试。不改 schema（0085 已带上 #20 要用的列），可以自动回滚 |
| 第二批 | 插件任务（§11）：先升外壳（Host API 版本变化），再签核心 |

- 0.1.235 是 schema 变化发布：签名时 `SOURCE_SCHEMA` 传旧契约，主节点优先升级。
- 滚动窗口：新节点跑新框架，旧节点跑原循环，同一件事可能各做一次（都幂等）。0.1.236 滚动时，0.1.235 节点上 #4/#5/#7/#12a/#20/#38/#40 仍是原循环、新节点是任务，同理各做一次，都幂等。
- 回滚：0.1.235 跨 schema，升级计划不能自动回滚。手动回滚到 0.1.234 时，旧核心的原循环恢复工作、不认 River 表和 `scheduled_tasks`（新表留着无害）；停容器的回滚效果见停容器设计 §8。托管核心启动时会因库里有它不认识的迁移而拒绝（`appliedPrefix`），手动回滚要按以往 schema 变化发布的做法处理（参照 0.1.186、0.1.195 的记录）。0.1.236 回到 0.1.235 是同 schema，可自动回滚。
- 每个版本发布后在 `next/deploy/gateway/ovh/README.md` 顶部写部署记录，并做 §16 的线上核对。

## 16. 验证

单元（嵌入式 PG `sdk/testpg`，不能跳过；River 测试用 `rivertest` 只做断言，数据库仍是嵌入式 PG）：

- 迁移：River 迁移在空库、已迁移库上重复执行都成功；非超级用户执行；迁移文件与模块 SQL 一致（§9.1）；`rivermigrate` 的 `Validate` 认为库是最新的。
- cluster：
  - 两个客户端（模拟两节点）同一时段只执行一次；停掉主节点所在客户端，另一个接任并继续投递。
  - 一次运行超过间隔：下一时段跳过（租约），不叠跑；持租约的节点死掉，租约过期后别人能跑。
  - 许可撤销后不再执行、恢复后继续；许可为假的节点能 `Enqueue`。
  - 失败按 `MaxAttempts` 重试；每分钟任务不重试；`TaskRetryAfter` 不计失败。
  - 单次任务按 `RunAt` 执行、`UniqueKey` 去重（已完成的不挡新的）、`EnqueueTx` 回滚不投递。
  - 不认识的任务名 snooze，超时后记失败。
  - 状态行：成功清零连续失败、失败加一、跳过不变；错误截断。
- node：两个节点都跑；上次未完成时跳过；`RequireWork` 在许可为假时跳过；`Trigger` 立即执行；关停等正在跑的（最多 20 秒）；Redis 状态写入与 TTL。
- 接口与页面：权限（`task:read` 看、`task:run` 运行）；404/400/409；手动运行写审计；`next_run_at`、`leader`、`recent`、`stats_24h` 正确；cluster 历史按状态筛选与翻页、包含排队中的；node 历史按节点；前端单元测试覆盖状态颜色、计划的中文描述（每 N 分钟 / cron）、空数据与节点离线。
- 每个迁移的任务：原有测试改为通过任务入口调用，结果不变；原 Redis 锁 key、`usageLimitsLock` advisory 锁不再出现；#20 阻断去重改用数据库列后，两个节点交替执行时同一 revision 10 分钟内只下发一次。
- 静态检查：`internal/` 下除 §14.3 列出的文件外不再有 `time.NewTicker`/`time.Tick`（测试里加一个 grep 白名单检查），防止以后再出现散落的定时任务。

线上（ovh，发布后）：
- `river_leader` 有主节点；`river_job` 每个任务每个时段只有一条；`scheduled_tasks` 全部 `succeeded`。
- 停掉主节点所在核心，另一节点几秒内接任（控制台 `leader` 变化）。
- 数据库连接数比上线前多 2 个左右。
- 控制台“定时任务”页显示全部 22 个任务、两个节点的 node 任务状态；手动运行生效；故意让一个任务失败（测试环境）能在历史里看到错误全文。

## 17. 需要你确认的决定

1. **表名**：`scheduled_tasks`（避开已有的 `async_tasks`）。
2. **node 任务默认每个节点都跑**，`RequireWork` 才看许可（第一版相反）。
3. **cluster 任务超时上限 1 小时**。（原写“River 的救回时间是全局的”不准确：救回取全局值与任务超时中较大者。真正的理由是发布、插件升级会在 20–30 秒内中断运行，长工作应当分段续跑。）0.1.238 起插件 `cluster` 任务上传时就限制在 1 小时，旧 manifest 已存的版本在登记任务时截断并记 WARN。
4. **每分钟及更频繁的周期任务失败不重试**，等下一次。
5. **`core.helper.payload_expiry` 从 5 秒改为 1 分钟**。
6. **依赖版本**：River v0.49.0、gocron v2.22.0（较新的版本发布不满两周）。
7. **用量限制 #7 迁进 River**（第一版说不迁）：每 5 秒一次，每天多 1.7 万行（保留 24 小时）；好处是去掉一个常驻 advisory 锁连接、能在页面上看到。
8. **按行分摊的两个任务（#4 额度查询、#40 结算重试）做成“每个可工作节点都跑”的 node 任务**，保持现在多节点分摊的行为，而不是改成只有一个节点跑。
9. **运行历史不另建表**：cluster 任务用 `river_job`（成功的看 24 小时、失败的看 7 天），node 任务每节点每任务在 Redis 保留最近 100 次。要更长的历史需另加汇总表。
10. **新权限 `task:read`、`task:run`**，运维角色默认都有；而不是复用 `settings:read`/`settings:manage`。
11. **分两个核心版本发布**（§15）：0.1.235 框架 + 页面 + 停容器 + 低风险任务，0.1.236 计费/凭证/同步相关任务。

## 18. 盘点明细（2026-11-03）

| # | 位置 | 间隔 | 做什么 | 现在的去重 | 去向 |
| --- | --- | --- | --- | --- | --- |
| 1 | account/service.go `Run` | 10s | 写 `last_used_at` 缓冲 | — | 不进框架（§14.3） |
| 2 | account/quota.go `quotaRecorder.run` | 5s | 写被动额度样本缓冲 | — | 不进框架（§14.3） |
| 3 | account/quota_mirror.go `run` | 60s | 刷新本节点额度镜像 | — | node `core.account.quota_mirror`（0.1.235） |
| 4 | account/quota_refresh.go `runQuotaSweep` | 5s | 补额度行、查到期额度 | 行租约 + 本地 singleflight | node `core.account.quota_sweep`（0.1.236） |
| 5 | account/refresh.go `runRefreshSweep` | 5m | 续期快过期的 OAuth 凭证 | Redis 锁 + 每账号锁 | cluster `core.account.credential_refresh`（0.1.236） |
| 6 | account/automatic_state.go `runAutomaticStateSweep` | 1m | 自动禁用到点恢复 | SKIP LOCKED | cluster `core.account.automatic_recovery`（0.1.235） |
| 7 | account/automatic_state.go `runUsageLimitsLoop` | 5s | 汇总用量并执行用量限制 | 会话 advisory 锁 | cluster `core.account.usage_limits`（0.1.236） |
| 8 | account/lifecycle_status.go | 1m | 回写账号同步状态 | Redis 锁 | cluster `core.account.lifecycle_status`（0.1.235） |
| 9 | account/preparation_cleanup.go | 1m | 处理过期的账号准备 | Redis 锁 | cluster `core.account.preparation_cleanup`（0.1.235） |
| 10 | account/stats.go `run` | 1s | 观测指标写 Redis | — | 不进框架（§14.3） |
| 11 | apikey/apikey.go `Run` | 10s | 写 API Key `last_used_at` | — | 不进框架（§14.3） |
| 12a | app/helper_history.go | 5s | 回放 helper 用量 outbox | 无认领 | cluster `core.helper.usage_replay`（0.1.236） |
| 12b | app/helper_history.go | 5s | 清空过期 helper 负载 | 无（幂等） | cluster `core.helper.payload_expiry`（0.1.235） |
| 13 | app/builtin.go 收敛 | 5s 至就绪 | 内置插件检查/安装 | Redis 锁 | 不进框架（§14.3） |
| 14 | app/builtin.go 升级 | 10s 至完成 | 核心更新后升级内置插件 | Redis 锁 | 不进框架（§14.3） |
| 15 | app/managed.go `watchAdmission` | 1s | 校验本节点 admission | — | 不进框架（§14.3） |
| 16 | audit/plugin_writes.go `writeLoop` | 队列 | 写插件审计 | — | 不进框架（§14.3） |
| 17 | audit/plugin_writes.go `Run` | 1h | 清理旧插件审计 | 时段锁 | cluster `core.audit.plugin_writes_purge`（0.1.235） |
| 18 | authz/service.go | 30s | 轮询权限版本 | — | node `core.authz.version_poll`（0.1.235） |
| 19 | ccgateway/accounts.go `reconcileKicked` | 事件 | 同步单个运行环境 | 每 key advisory 锁 | 不进框架（§14.3） |
| 20 | ccgateway/accounts.go `Run` | 60s | 全量同步运行环境 | 每 key advisory 锁，两节点都跑 | cluster `core.ccgateway.runtime_sync`（0.1.236） |
| 21 | ccgateway/sweep.go | 1m | 删除废弃草稿、退役和孤立运行环境 | Redis 锁 | cluster `core.ccgateway.draft_sweep`（0.1.235） |
| 22 | ccgateway 各处请求内等待 | 2–3s | 升级、安装、健康、上传、启动重试 | — | 不进框架（§14.3） |
| 23 | cluster/registry.go | 5s | 节点心跳 | — | 不进框架（§14.3） |
| 24 | cluster/slots.go | 5s/30s | 并发槽续期与回收 | Lua 原子 | 不进框架（§14.3） |
| 25 | cluster/bus.go | 接收 | Redis pub/sub | — | 不进框架（§14.3） |
| 26 | event/delivery/worker.go | 1s | 有序投递事件给插件 | Redis 锁 + 游标 | 不进框架（§14.3） |
| 27 | event/delivery/delivery.go `watch` | 事件 | 启停投递 worker | — | 不进框架（§14.3） |
| 28 | event/delivery/retention.go | 1h | 清理 7 天前事件 | 时段锁 | cluster `core.events.retention`（0.1.235） |
| 29 | gateway/gateway.go `statsLoop` | 2s | hook 计数写 Redis | — | 不进框架（§14.3） |
| 30 | job/job.go | cron | 插件定时任务 | Redis 锁 + 唯一索引 | 第二批（插件） |
| 31 | job/retention.go | 1h | 清理插件任务记录 | 时段锁 | cluster `core.jobs.retention`（0.1.235） |
| 32a | notify/worker.go `step` | 2s | 投递通知 | SKIP LOCKED + 租约 | 不进框架（§14.3） |
| 32b | notify/worker.go 清理 | 1h | 清理旧通知 | 时段锁 | cluster `core.notify.purge`（0.1.235） |
| 33 | observation/hub.go | 200ms | 观测批次发给插件 | — | 不进框架（§14.3） |
| 34a | plugin/egress/logs.go 刷新 | 2s | 写出口日志 | — | 不进框架（§14.3） |
| 34b | plugin/egress/logs.go 清理 | 1h | 删除 7 天前出口日志 | 无，每节点都跑 | cluster `core.egress.logs_prune`（0.1.235） |
| 35 | plugin/rollout/controller.go | 5s | 本地插件进程与数据库对齐 | — | 不进框架（§14.3） |
| 36 | plugin/rollout/coordinator.go | 1s/5s | 驱动插件发布、续租约 | 数据库租约 | 不进框架（§14.3） |
| 37 | plugin/grpcruntime 等 | 1s/10s | 子进程监督、资源采样 | — | 不进框架（§14.3） |
| 38 | usage/reconcile.go | 10s | 认领到期待结算、调插件对账 | Redis 锁 + 行租约 | cluster `core.usage.reconcile`（0.1.236） |
| 39 | usage/settler.go `worker` | 200ms | 写用量队列 | — | 不进框架（§14.3） |
| 40 | usage/settler.go `retryLoop` | 30s | 释放过期预扣、重结算 | SKIP LOCKED + 幂等键 | node `core.usage.settlement_retry`（0.1.236） |
| 41 | webui/shared_assets.go | 30s | 前端资源租约 | advisory 锁 | node `core.webui.asset_lease`（0.1.235） |

