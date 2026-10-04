# SQLite 后端与内存 Redis：设计

2026-10-05。用户决定在 PostgreSQL 之外**真正支持 SQLite**，并支持进程内 Redis（`memory://`），用于本地集成测试与 `sub2api-plugin dev` 一键启动检查插件。

约束：SQLite 只用于单节点（开发、测试、dev 命令），多节点/外壳托管遇到 SQLite 拒绝启动；PostgreSQL 仍是生产唯一后端，行为不得退化；同一套集成测试在两种后端都跑。

## 1. 现状

- server/internal 下 import pgx 的文件：非测试 57、测试 21；sdk 与 plugins 非测试另有 20。非测试 SQL 调用点约 569 处。
- `pgx.Tx` 出现在 52 个文件，`core` 有 11 个端口签名直接暴露 `pgx.Tx`。
- pgx 专有 API：`CollectRows`/`RowTo*` 14、`Batch` 4（event、usage/settler、webui/shared_assets、egress/store）、`CopyFrom` 1、`Pool.Acquire` 2（store/migrate、ccgateway/accounts）、`BeginTx(RepeatableRead, ReadOnly)` 1（authz）、`pgconn.PgError` 3、`pgx.Identifier` 6。
- 最重的包：plugin/*（190 处，dbschema 整包要另写）、usage（82，SKIP LOCKED、写 CTE、jsonb 运算）、billing（52，基本机械替换，金额在 Go 里用 decimal 算）、authz（37，多数组 unnest、只读快照事务）、account、iam、event（`pg_current_snapshot()` 判断 id 间隙）、ccgateway（为持有 advisory 锁而开事务，持锁期间调 Docker）。
- 迁移 0001–0029 共约 1060 行，含 plpgsql/SECURITY DEFINER（0003、0023）、触发器（0024）、`text[]`、jsonb、`numeric(20,8)`、大量 ALTER/RENAME/数据修正。
- 插件：有 DB 的 6 个（anthropic、growth、guard、moderation、payment、volcengine），都经 `host.DB()` 拿 `*pgxpool.Pool`；moderation/volcengine 的并发测试用 `pg_locks`，guard 用 `LOCK TABLE`。
- Redis：GET/SET/DEL/EXISTS/INCRBY/DECRBY/EXPIRE/PEXPIRE/PTTL/HSET/HGETALL/SMEMBERS/ZSET 系列/SCAN/TIME/PUBLISH/SUBSCRIBE/Pipelined，Lua 只用 `redis.call`、`tonumber`、`tostring`、`math.floor`、`string.match`。miniredis v2.39 全部支持；注意 **TTL 不会自动递减**（需定时 `FastForward`），且不支持 `CLIENT SETINFO`（客户端设 `DisableIdentity: true`）。

## 2. 抽象层（方案 a）

不改用 database/sql（PG 侧丢掉 pgx 的数组/jsonb 编解码、Batch、CopyFrom，热路径风险大），也不按模块抽 repository（570 处 SQL 写两份必然漂移）。做法：`store.DB.Pool` 字段名不变、类型改为自定义接口；PG 适配层零语义透传；SQLite 后端 + PG 子集 SQL 改写器；改写器覆盖不了的约 20 处按 Dialect 分支。

```go
type Result interface{ RowsAffected() int64 }
type Row interface{ Scan(dest ...any) error }
type Rows interface{ Next() bool; Scan(...any) error; Close(); Err() error }
type Querier interface {
    Exec(ctx context.Context, sql string, args ...any) (Result, error)
    Query(ctx context.Context, sql string, args ...any) (Rows, error)
    QueryRow(ctx context.Context, sql string, args ...any) Row
}
type Tx interface{ Querier; Commit(context.Context) error; Rollback(context.Context) error }
type Pool interface {
    Querier
    Begin(ctx context.Context) (Tx, error)
    Ping(ctx context.Context) error
    Close()
    Dialect() Dialect // Postgres | SQLite
}

func (db *DB) Tx(ctx, fn func(Tx) error) error     // SQLite: BEGIN IMMEDIATE，写连接
func (db *DB) ReadTx(ctx, fn func(Tx) error) error // PG: RepeatableRead+ReadOnly；SQLite: DEFERRED，读连接
func (db *DB) PG() (*pgxpool.Pool, bool)           // 仅 PG 专属代码
func XactLock(ctx, tx Tx, k LockKey) error         // PG 生成与现在逐字相同的 SQL；SQLite 空操作
func WithSessionLock(ctx, db *DB, k LockKey, try bool, fn func() error) (bool, error)
// Batch/SendBatch、CopyRows、CollectRows/RowTo、ErrNoRows = pgx.ErrNoRows、IsUniqueViolation、IsFKViolation
```

锁 key 的 PG 表达式必须与现在逐字一致，否则滚动升级时新旧节点拿的不是同一把锁。

### SQLite 后端
- 驱动 modernc.org/sqlite（纯 Go，Windows 不需要 cgo；内置 SQLite 3.51，支持 RETURNING、UPSERT、`UPDATE…FROM`、FILTER、`->`/`->>`）。
- 写池 `MaxOpenConns=1`、`_txlock=immediate`；读池 N 个、`query_only=1`；每连接 WAL、`busy_timeout=30000`、`foreign_keys=ON`、`synchronous=NORMAL`、`case_sensitive_like=ON`。池外语句按首关键字分流，事务内一律写连接。
- 测试库用 `t.TempDir()` 下的 WAL 文件（不用 `:memory:` 共享缓存，会出现表级 SQLITE_LOCKED），迁移跑一次做模板、每个测试复制。

### 锁与事务
- `FOR UPDATE`/`FOR SHARE`/`NOWAIT`/`SKIP LOCKED` 去掉：所有写事务 IMMEDIATE，全库串行，比行锁更强。
- `pg_advisory_xact_lock` 在 SQLite 下空操作；会话级锁（Migrate、ccgateway）用进程内互斥。
- ccgateway 的 Reconcile 改为 `WithSessionLock(try)` 不再开事务，否则调 Docker 期间一直占着全局写锁。

### 改写器
词法分析（识别字符串、引号标识符、注释、`$$`、`$n`、`::`），按 token 规则改写并缓存；**不认识的结构返回 `ErrUnsupportedSQL`，绝不默默放过**。规则包括：`$n→?n`；`::T` 转 CAST 或去掉（`::jsonb→CAST AS TEXT`）；`= ANY(e)→IN (SELECT value FROM json_each(e))`；多数组 `unnest(...) AS t(...)`→`json_each` 按 key JOIN；`array_agg→json_group_array`；`array_append→json_insert`；`jsonb ||→json_patch`；`jsonb_build_object→json_object`；`GREATEST/LEAST→max/min`；`IS [NOT] DISTINCT FROM→IS NOT/IS`；`ILIKE→lower() LIKE lower() ESCAPE '\'`；`interval`/`make_interval`/`EXTRACT(EPOCH…)` 换算为微秒整数；`now()`→注入的事务开始时间参数；`clock_timestamp()`→UDF。裸写的 `'{}'`（空数组与空对象同形）报错，PG 侧改为 `'{}'::text[]` 或 `'{}'::jsonb`。

### 值与错误
- 时间存 INTEGER（UTC 微秒）；`numeric` 存 TEXT 规范小数（DECIMAL 亲和性会转 REAL 丢精度）；json 存 TEXT + `CHECK(json_valid(col))`；数组存 JSON TEXT；bigserial→`INTEGER PRIMARY KEY AUTOINCREMENT`（事件游标依赖 id 单调）。
- 参数与 Scan 双向转换对齐 pgx 语义；`sql.ErrNoRows→store.ErrNoRows`。
- 错误码 2067/1555 唯一冲突、787 外键；启动时读 `pragma index_list/index_info` 建"列集合→唯一索引名"映射（有名约束判断只有 job/job.go:322 一处）。
- 单节点保护：配置校验拒绝 SQLite/`memory://` + Managed；`<db>.lock` 文件锁防双进程；cluster 发现其他活节点即退出。

## 3. 迁移
- `server/internal/migrations/sqlite/0001_baseline.sql` 手写 0029 时的最终结构（含 plugin_history 的 SQLite 触发器），执行后把 0001–0029 全部记为已应用，保证 `schema_migrations` 与 PG 一致。
- 从 0030 起每个 PG 迁移必须有同名 SQLite 文件（无关的放只有注释的文件）。SQLite 库只用于开发，基线有破坏性修改时 `--reset` 重建。
- 对等测试三层：①静态检查文件一一对应；②PG 导出规范化 catalog 写 `testdata/schema.golden.json`（表、列、类型类别、主键、唯一索引名/列/谓词、外键、CHECK 数），SQLite 每次比对，PG 在 CI 比对；③用 go/ast 扫描所有常量 SQL 逐条过改写器，除白名单外不得出现 ErrUnsupported。

## 4. 插件数据库（SQLite 模式）
- 宿主代理 SQL 会话：`host.proto` 新增双向流 `SQLSession`（一个流一个连接，事务挂在流上；Begin/Exec/Query/Commit/Rollback，值用带类型 oneof）。宿主为每个插件开 `<DataDir>/<key>/db/plugin.sqlite`（不在插件 WorkDir 下，Landlock 也不允许直接访问），复用核心的后端与改写器。需 `db.schema` 授权；禁止 ATTACH/DETACH/VACUUM INTO/load_extension/白名单外 PRAGMA；限制返回行数、超时、会话数。
- 不让插件直接开文件：每个插件二进制要多链接 5–8MB，且隔离只能靠自觉。
- SDK：新增 `pluginsdk/db`（与第 2 节同形 + `Dialect()`）与 `Host.SQL(ctx)`（PG 模式包装现有 pgxpool，SQLite 模式返回远程驱动）；`GetDSNResponse` 加 `backend`；`Host.DB()` 标记 Deprecated，SQLite 模式返回 `ErrBackendUnsupported`；`pluginsdktest.NewDB` 有 TEST_DATABASE_URL 用 PG，否则进程内 SQLite（后端与改写器最终放 `sdk/dbx`，只在测试 import）。
- 插件迁移由宿主按 DDL 模式翻译；`ADD COLUMN IF NOT EXISTS` 由执行器先查 `pragma table_info`；manifest `database` 新增可选 `sqliteMigrations` 覆盖目录；dbschema 拆为 pg/sqlite 两套 Manager。
- 现有插件改动：payment、growth 换类型；guard 换 BeginFunc/Batch/CollectRows，`LOCK TABLE→db.XactLock`；moderation：Batch、advisory、unnest；volcengine 自定义接口改返回 `db.Result`；依赖 `pg_locks` 的测试标 RequirePG。

## 5. Redis 内存模式
`SUB2API_REDIS_URL=memory://`，只改 `cluster.OpenRedis`：起 miniredis 监听 `127.0.0.1:0`，普通 go-redis 客户端连过去（`DisableIdentity: true`），走真实 TCP，Lua/Pipeline/PubSub 路径不变；200ms ticker 调 `FastForward`；关闭时先关客户端再关 miniredis。redsync 单实例 quorum 为 1，行为正常。

## 6. dev 命令
- 核心以子进程运行：server main 加 `sub2api dev --data <dir> --addr 127.0.0.1:3120 --token <t>`，默认 `sqlite:<data>/core.db` + `memory://`；MasterKey/JWT 首次生成存 `<data>/secrets.json`（0600）；DevMode、AllowUnsigned、AllowPrivateUpstream；管理员随机凭据写 `<data>/admin.json`、不打日志；仅 dev 模式、仅回环、校验 token 的 `POST /api/v1/dev/plugins`（复用内置插件安装流程：上传、自动同意 hostPermissions、启用或升级、等 active）。
- `sub2api-plugin dev [--dir .] [--core <bin>] [--data .sub2api-dev] [--watch] [--reset]`：`build --dev` → 不签名打包、版本改写为 `X.Y.Z-dev.<unixms>` → 找核心（`--core`、`SUB2API_CORE_BIN`、PATH）→ 等 `/healthz` → 上传 → 打印控制台 URL。`--watch` 轮询源码、manifest、迁移、UI 产物，去抖后重建上传，经 rollout 重启插件（约 1–3 秒）；构建失败保留旧版本。

## 7. 分阶段计划（同一 Go 模块同一时间一个写者）

| 阶段 | 写入模块 | 内容 | 验收 | 工作量 |
|---|---|---|---|---|
| P0 解耦 | server | 接口与 PG 适配；`pgx.Tx`/Collect/ErrNoRows 批量替换；Batch/Copy/Acquire/BeginTx/advisory 改用助手；`'{}'` 显式标注 | PG 测试与 e2e 全绿；store、dbschema/pg、managed、testutil 外无 pgx import | 2–3 人日 |
| P1 SQLite + 内存 Redis | server | 后端、改写器、值转换、错误映射；`migrations/sqlite` 基线；约 20 处 Dialect 分支；`memory://`；单节点保护；testutil 默认 SQLite + `RequirePG`；语料与对等测试 | 无环境变量时 DB 测试 ≥90% 在 SQLite 通过，其余注明原因；有 PG 全绿；`sqlite:`+`memory://` 能启动、登录、建账号、经网关完成一次计费请求；托管模式或第二进程被拒 | 2–3 周 |
| P2 插件 DB | 先 sdk 后 server | `sdk/dbx`、`pluginsdk/db`、`Host.SQL`、远程驱动、SQLSession、`sqliteMigrations`、pluginsdktest；服务端 SQLSession、dbschema/sqlite、DDL 翻译 | 测试插件在两种后端跑通迁移与增删改查 | 1.5–2 周 |
| P3 插件迁移 | plugins/* | 6 个插件改用 `Host.SQL` | 各插件测试两种后端通过 | 每个 0.5–1 天，可并行 |
| P4 dev 命令 | server、tools/sub2api-plugin | 第 6 节 | Windows/Linux 上 `sub2api-plugin dev plugins/growth` 能启动并热重载 | 约 1 周 |
| P5 CI | CI 配置 | SQLite 快速任务 + PG/Redis 全量任务 | 统计跳过数并设上限 | 1 天 |

## 8. 风险
1. 单写者自死锁/长阻塞：事务内又在池上写，或事务内做外部 IO。兜底：全量测试、写事务超 1 秒告警、ccgateway 改会话锁。
2. 并发扣费与幂等：SQLite 全局串行会掩盖 PG 下行锁顺序问题。账本并发、幂等重放、SKIP LOCKED 认领测试必须在 PG 任务跑；**SQLite 通过不等于 PG 没问题**。
3. 时间语义：`clock_timestamp()` 与 `::text` 后的时间格式与 PG 有差异。
4. 金额：SQL 内 `sum(total_cost)` 在 SQLite 变 REAL（只影响报表）；在 SQL 里比较/运算金额会按字符串比较出错。语料测试检查金额列上的 SQL 算术。
5. JSON：jsonb 键规范化/去重、`->>` 类型、`json_patch` 遇 null 删键、BLOB 被当二进制 JSONB。测试按结构比较。
6. GREATEST/LEAST 的 NULL 处理不同（PG 忽略 NULL）。
7. 事件投递的间隙判断在 SQLite 下依赖 AUTOINCREMENT + 串行提交，需专门测试。
8. 改写器误改：遇到不认识的结构报错 + 语料测试 + 双后端同测。
9. `RequirePG` 必须写原因，CI 统计跳过数。
10. P0 大范围替换引入 PG 回归：适配层只透传，合并前跑全量 PG 测试与 e2e，对网关与计费热路径做基准。
