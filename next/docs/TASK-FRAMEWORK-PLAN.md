# 定时任务框架：执行计划

2026-11-03，用户：“现在来逐步完成这些改动，你需要先设计执行计划、拆分任务”。设计见 `TASK-FRAMEWORK-DESIGN.md`（第三版 `d78b06c`）与 `plugins/ccgateway/docs/ACCOUNT-RUNTIME-PARKING-DESIGN.md`。设计 §17 的决定按推荐做法执行（用户要求开始实施，未提出修改）；实施中如需偏离设计，先改设计文档再改代码。

## 规则

- 每一步单独提交到 `feat/next-platform`，提交前该步的测试全部通过，构建不坏；提交用明确路径。
- 只改 `next/`。同一 Go 模块同一时间只有一个人写。
- 数据库测试不能跳过：云端会话没有嵌入式 PG 的下载源，用本机 PostgreSQL 16（`TEST_DATABASE_URL`）跑，确认测试真的执行了（`-v` 看到用例运行，不是 SKIP）。
- 框架接入启动流程（A5）之前，新代码不影响运行中的行为；原循环在对应任务迁移那一步才删除。
- 每步结束更新本文的状态列。

## 阶段 A：核心 0.1.235（框架 + 页面 + 停容器 + 低风险任务）

| 步 | 内容 | 主要文件 | 验证 | 状态 |
| --- | --- | --- | --- | --- |
| A1 | **迁移**：0076–0083 River v1–v8（从 `riverpgxv5@v0.49.0` 生成，补版本行）；0084 `scheduled_tasks`、`river_job_task_name_idx`、`plugin_job_runs.scope`；0085 停容器的列、`status_changed_at` 触发器与回填、`blocked_revision`/`blocked_at`。加依赖 River v0.49.0、gocron v2.22.0 | `server/internal/migrations/`、`server/internal/task/rivermig/`、`server/go.mod` | 迁移文件与模块 SQL 一致；空库、已迁移库重复执行；非超级用户执行；`rivermigrate` 校验为最新；触发器只在三列变化时写时间 | 完成 |
| A2 | **接口与登记**：`core.Tasks` 等类型；`internal/task` 的 registry、名字与字段校验、计划解析（`job.ParseSchedule` 移到 `internal/task/schedule.go`，`internal/job` 改为引用）、ByPeriod 计算 | `server/internal/core/ports_scheduled_tasks.go`、`server/internal/task/{registry,schedule}.go` | 单元测试：校验规则、重复名、计划与 cron 最小间隔 | 完成 |
| A3 | **node 后端**：gocron 调度、单例、`RequireWork`、超时与 panic、Redis 状态与历史、`task:run` 事件、`Trigger` | `server/internal/task/node.go`、`status.go` | 两个“节点”都跑；上次未完成跳过；许可为假时跳过；关停等待；Redis 写入、截断、TTL | 完成 |
| A4 | **cluster 后端**：River 客户端与许可观察、通用 worker、周期配置、时段唯一、租约、单次任务与 `UniqueKey`、`EnqueueTx`、重试与 snooze、`RecordOutput`、`scheduled_tasks` 写入、`core.task.housekeeping` | `server/internal/task/cluster.go`、`lease.go`、`housekeeping.go` | PG 测试：两客户端同一时段一次；主节点停掉后接任；超过间隔不叠跑；租约过期可接手；许可撤销/恢复；重试次数；单次任务按时、去重、事务回滚不投递；未知任务 snooze | 完成 |
| A5 | **接入启动流程**：`phases.go` 创建服务、`StartNode`、`StartCluster`、关停顺序；单机与托管两种模式 | `server/internal/app/` | app 测试：单机启动后两个后端都在跑；托管核心准入前 River 不启动、准入后启动、排空后停止 | 完成 |
| A6 | **HTTP 接口**：`/system/tasks`、`/:name`、`/:name/runs`、`/:name/run`；权限 `task:read`/`task:run`、运维角色、菜单、审计 | `server/internal/task/http.go`、`server/internal/authz/{catalog,menus,roles}.go` | 接口测试：权限、404/400/409、历史筛选与翻页、统计、审计 | 完成 |
| A7 | **控制台页面**：概览、全集群任务、每节点矩阵、详情抽屉（历史、错误、耗时趋势）、手动运行、节点页入口、中英文 | `web/src/views/tasks/`、`web/src/api/`、`web/src/router/`、i18n | `npm run check`（类型、lint、vitest）；页面单元测试：状态颜色、计划描述、空数据、节点离线 | 完成 |
| A8 | **停容器**：`core.ccgateway.park_runtimes`、`desiredIn` 的 `parked`、阻断去重扩到所有 `!Enabled`、唤醒（重新授权、测试、运行环境“启动”）、额度查询回 `runtime_parked`、设置项 `park_after_hours`、控制台文案与原因码 | `server/internal/ccgateway/`、`server/internal/account/`、`web/src/views/{accounts,ccgateway,settings}` | 停容器设计 §9 的单元测试全部；同步只下发一次 `enabled:false` | 完成 |
| A9 | **迁移 0.1.235 的 13 个现有循环**，删除原循环和锁：A9a account（#3、#6、#8、#9）；A9b authz #18、webui #41；A9c ccgateway #21、helper #12b；A9d 清理类（#17、#28、#31、#32b、#34b） | 各包 + `app/phases.go` | 原有测试改为通过任务入口调用，结果不变；原 Redis 锁 key 不再出现 | 完成 |
| A10 | **防回退检查**：`internal/` 下 `time.NewTicker`/`time.Tick` 白名单测试（0.1.236 要迁的暂列白名单） | `server/internal/task/ticker_guard_test.go` | 测试通过；新增 ticker 会失败 | 完成 |
| A11 | **文档**：CONTRACTS §77（接口、表、原因码 `account_parked`/`runtime_parked`、任务约定、不再接受新的业务 ticker） | `docs/CONTRACTS.md` | — | 完成 |
| A12 | **全量验证与发布材料**：每个 Go 模块 `go test`（`go.work` 内全部）、`npm run check`、构建；写发布清单（`stage/0.1.235/` 要替换的版本号和提交号逐项列出）、部署记录草稿、线上核对步骤 | `docs/TASK-FRAMEWORK-RELEASE-0.1.235.md` | 全部通过；发布本身在 ovh 由你执行 | 完成 |

## 阶段 B：核心 0.1.236（计费、凭证、同步相关任务）

| 步 | 内容 | 验证 | 状态 |
| --- | --- | --- | --- |
| B1 | #20 `core.ccgateway.runtime_sync`：一个可工作节点跑、一轮并发 4、`sweepNow` 改 `Trigger`；阻断去重改用 `blocked_revision`/`blocked_at`（事件触发的单 key 同步也用） | 两节点交替执行时同一 revision 10 分钟内只下发一次；原同步测试不变 | 待做 |
| B2 | #7 `core.account.usage_limits`（删 advisory 锁）、#5 `core.account.credential_refresh`（删扫描级 Redis 锁，保留每账号锁）、#4 `core.account.quota_sweep`（node + `RequireWork`） | 原有测试；用量限制不叠跑；`usageLimitsLock` 不再出现 | 待做 |
| B3 | #12a `core.helper.usage_replay`、#38 `core.usage.reconcile`（删 Redis 锁，Handler 等本轮结束）、#40 `core.usage.settlement_retry`（node + `RequireWork`） | 原有计费测试全部通过；对账条数进运行记录 | 待做 |
| B4 | 白名单收紧到 §14.3；CONTRACTS 更新；全量验证；发布材料 | 全部通过 | 待做 |

## 阶段 C：插件任务（第二批，另行确认后开工）

设计 §11：manifest `scope`、`RunJob` 新字段、Host API、SDK `HandleJob`、`internal/job` 退役、插件页链接。Host API 版本变化，先升外壳再签核心。

## 风险与应对

| 风险 | 应对 |
| --- | --- |
| River 迁移在 Supabase 非超级用户下失败 | A1 用非超级用户角色在本机 PG 执行；发布前在测试库再跑一次 |
| 滚动升级窗口内新旧节点各跑一次 | 所有迁移的任务都幂等（设计 §14）；逐个在 A9/B 的测试里确认 |
| 前端资源租约迁移影响 `/healthz` 就绪 | A5/A9b 的 app 测试覆盖“未就绪 → 就绪”顺序 |
| 停启容器让老账号换 CLI | A8 核对 `ErrMountReplaced` 重建路径用的镜像，写测试；上线后按停容器设计 §9 核对容器 ID 和镜像 |
| 云端会话不能发布、不能连 ovh | A12/B4 产出发布清单，你在本机执行；部署记录由你确认后补进 README |
