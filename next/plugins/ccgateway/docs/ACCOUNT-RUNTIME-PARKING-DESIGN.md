# 红色账号停机 3 小时后停止容器（设计）

2026-11-03，用户要求：禁用、自动禁用里标红的账号，停机一段时间后停止它的容器，时长定为 3 小时。本文是实现前的设计，未实现。

## 1. 现状

- 核心让控制器运行容器的条件只有“账号没删除”（`internal/ccgateway/accounts.go` `desiredIn`：`d.Enabled = !d.Deleted`）。禁用、自动禁用都不影响容器，这是 2026-10 “停用只限制调度”规则的结果（ACCOUNT-RUNTIME-LIFECYCLE.md “停用账号只阻断调度”）。
- 控制器已经支持“停而不删”：收到 `enabled:false` 的配置走 `block`（`controller-go/internal/accounts/apply.go`），只停 app 容器、解除共享出口绑定，容器、数据卷、登录态、状态目录都保留。再收到 `enabled:true` 时 `applyShared` → `provision` 保留原容器（`keepExisting`）→ `sharedActivate` 对停着的容器执行 start。2026-10-11 之前禁用账号就是这样阻断的，启停在生产上走过。
- 原容器原地启动，不重建，镜像不变：老账号醒来仍是 CLI 2.1.312，符合“老账号使用老版本”。
- 2026-11-03 ovh 实测：40 个禁用状态的 CC 账号容器全部在运行；其中红色（自动禁用且没有恢复时间）20 个，共占约 1.4 GiB 内存（全部 44 个账号容器约 3.3 GiB）。

## 2. 范围：哪些账号会停

与控制台红色标记一致（`web/src/views/accounts/accountStatus.ts`，CONTRACTS §73.4）：

| 状态 | 颜色 | 停容器 |
| --- | --- | --- |
| 正常（active 且可调度） | 绿 | 否 |
| 自动禁用，有恢复时间 | 黄 | 否（到点自动恢复，容器要在） |
| 自动禁用（含旧 `error`），没有恢复时间 | 红 | 是 |
| 手动禁用（`disabled`） | 红 | 是 |
| active 但被手动移出调度 | 红 | 是 |
| 已删除 | — | 现有删除/保留逻辑，不变 |

停机时长：进入红色状态满 3 小时。时长放在 CCGateway 设置里（`park_after_hours`，默认 3，0 表示不停），改设置立即生效。

## 3. 数据：迁移（幂等，只加可空列）

River 自身的表见 `next/docs/TASK-FRAMEWORK-DESIGN.md` §9，排在前面（本功能的迁移是 `0085_account_runtime_parking.sql`）；本功能另一个迁移：

```sql
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;
ALTER TABLE ccgateway_runtimes ADD COLUMN IF NOT EXISTS parked_at timestamptz;
ALTER TABLE ccgateway_runtimes ADD COLUMN IF NOT EXISTS woken_at timestamptz;
```

- `accounts.status_changed_at`：触发器（`CREATE OR REPLACE FUNCTION` + `DROP TRIGGER IF EXISTS` 再建）在 `status`、`auto_disabled_until`、`schedulable` 任一变化时写 `now()`；其他列的更新（`last_used_at`、额度、测试结果）不碰它。所有账号通用，不限 ccgateway。
- 回填：迁移时把现有账号的 `status_changed_at` 设为迁移时间。不用 `updated_at`，否则第一次定时任务就会停掉一批；按迁移时间算，现有红色账号上线 3 小时后才停。
- `ccgateway_runtimes.parked_at`：定时任务停掉这个容器的时间，即“已停止”标记。
- `ccgateway_runtimes.woken_at`：手动唤醒（见 §5）的时间，从这里重新计 3 小时。
- 旧版核心不认这三列，忽略即可；触发器对旧核心无影响。

## 4. 定时任务：满 3 小时仍是红色就停

### 4.1 用定时任务框架的全集群任务

定时任务框架见 `next/docs/TASK-FRAMEWORK-DESIGN.md`。停容器是一个全集群只执行一次的任务（`cluster`，River）：主节点每分钟投递一次（同一时段只投递一次），由一个可工作节点执行。

不为每个账号排“3 小时后执行”的单次任务：账号状态由很多地方写（控制台、故障策略、插件自动状态、到点恢复），每处都要记得入队，漏一处就不停；每分钟扫一次“已到期的”能覆盖所有写入方，节点重启、主节点切换也不丢。

### 4.2 停容器任务

cluster 任务 `core.ccgateway.park_runtimes`，每分钟一次，超时 50 秒：


```sql
UPDATE ccgateway_runtimes r SET parked_at = clock_timestamp()
FROM (SELECT r.key FROM ccgateway_runtimes r JOIN accounts a ON a.id = r.account_id
      WHERE <红色> AND r.parked_at IS NULL AND r.retired_at IS NULL AND a.deleted_at IS NULL
        AND a.status_changed_at IS NOT NULL
        AND greatest(a.status_changed_at, r.woken_at) <= clock_timestamp() - <时长>
      ORDER BY 1 LIMIT 200 FOR UPDATE OF r SKIP LOCKED) due
WHERE r.key = due.key RETURNING r.key, r.account_id
```

`<红色>` 与 §2 一致：

```
a.status = 'disabled'
OR (a.status IN ('auto_disabled','error') AND a.auto_disabled_until IS NULL)
OR (a.status = 'active' AND NOT a.schedulable)
```

- 判断在任务执行那一刻做：3 小时内账号恢复过、又被禁用，`status_changed_at` 已经更新，从新的时间重新算；恢复后没再禁用，就不是红色，不会停。
- 同一事务写审计 `account.runtime_parked`（原因“停机满 3 小时”）。提交后对每个账号 `Kick`，同步立即下发 `enabled:false`，控制器 `block` 停容器。
- 时长为 0 时任务不认领任何账号。
- 没有 `ccgateway_runtimes` 行的旧式数字 key 账号不处理（线上已没有）。

### 4.3 期望状态

`desiredIn` 多读一个 `parked`：

```
r.parked_at IS NOT NULL AND r.parked_at >= a.status_changed_at AND <红色>
```

`d.Enabled = !d.Deleted && !d.Parked`。`Enabled=false` 时 `desiredIn` 已经不带凭证和代理，控制器走 `block`，与删除保留期内的阻断相同。

`parked_at >= status_changed_at` 和 `<红色>` 两个条件让停机标记在账号状态一变就失效，不需要另外去清：账号恢复时同步立即算出 `Enabled=true`，把容器拉起来；之后再被禁用，旧标记早于新的 `status_changed_at`，不再生效，要重新等 3 小时。定时任务顺带把失效的标记清成 NULL，只为数据整洁。

去重：现有 `blockedRecently/markBlocked`（同一 revision 10 分钟内不重复阻断，2026-10-11 “每轮重写全部禁用账号配置”的修复）目前只对已删除账号生效，改为对所有 `!Enabled` 生效，否则停着的账号每 60 秒各发一次 PUT。

## 5. 重新启动（唤醒）

唤醒 = 在同一事务里写 `parked_at = NULL, woken_at = now()`，然后 `Kick`。

| 触发 | 做法 |
| --- | --- |
| 账号恢复正常 / 手动启用 / 重新可调度 | 状态变化使停机标记失效（§4.3），现有 `kickCCGateway` 立即同步 → 启动，不需要唤醒 |
| 重新授权（`refresh_auth`） | `ReauthDraft` 发现 `parked`：唤醒，等就绪最多 60 秒，再走现有授权流程；超时回 `runtime_not_ready`（现有原因码） |
| 账号“测试” | 测试前同上唤醒并等就绪（核心 account 测试入口调 ccgateway 的新方法 `WakeRuntime(ctx, id)`），再发测试请求 |
| 运行环境列表的“启动”按钮 | `POST .../sync` 对 `parked` 账号先唤醒再同步 |
| 手动刷新额度 | 不唤醒，回原因 `runtime_parked`（“容器已停止”），不再记成“额度查询失败” |

唤醒后账号如果仍是红色，定时任务从 `woken_at` 起再满 3 小时会再次停止。

启动期间的请求：容器没就绪时核心直接回 503 `not_synchronized`（`client.go` `notSynchronizedResponse`，来源标为核心），插件换号并短暂冷却，不触发故障规则、不会把账号再次禁用。

## 6. 控制台

- 账号列表：红色状态徽标的悬停说明末尾加一行“容器已停止（停机满 3 小时），测试或重新授权会自动启动”。账号视图加只读字段 `runtime_parked`，由 ccgateway 用一条批量查询填（与额度快照的批量填充同一做法），非 ccgateway 账号没有这个字段。
- 运行环境列表：`GET .../status` 对 `parked` 回 `status:"blocked"`、`reason:"account_parked"`，显示“已停止（禁用满 3 小时）”，“同步”按钮文字改为“启动”。
- CCGateway 设置：新增“红色账号停机多久后停止容器”，小时数，0 为不停。
- 中英文文案；原因码 `account_parked`、`runtime_parked` 进 `reasonMessages` 与 CONTRACTS。

## 7. 不变的部分

- 插件、控制器、Worker、CLI 都不改：这次只发核心（含控制台、River 和本功能的迁移）。
- 容器原地启停，不重建，镜像不变；新老账号各自保持原 CLI 版本。
- 数据卷、登录态、会话历史、请求日志全部保留。
- 黄色账号、正常账号行为不变。
- 孤立资源清理照旧把所有未删除账号列入保留名单，停着的容器不会被当成孤立资源删掉。

## 8. 代价与风险

- 容器停着时不续期凭证、不能手动查额度。红色账号本来不接请求，多数已是登录失效。
- 手动禁用的账号重新启用后，容器要十几秒才就绪；这段时间请求换号（见 §5）。
- 少数情况下启动会重建容器：共享出口改写 `resolv.conf` 为新文件时（`ErrMountReplaced`），控制器删 app 容器让核心重建。这是现有路径，不是这次新增，但停启会让它更常走到；重建出的容器用哪个镜像要在实现时核对，保证老账号不会因此换成新 CLI。
- 回滚：旧版核心认为这些账号都应运行，会在 60 秒内把停着的容器全部启动，回滚是安全的。

## 9. 验证

- 单元（核心 `internal/ccgateway`、`internal/account`，嵌入式 PG，不能跳过；框架本身的测试见 TASK-FRAMEWORK-DESIGN.md §16）：
  - 触发器：改 `status`/`auto_disabled_until`/`schedulable` 写时间，改其他列不写。
  - 定时任务：各种状态 × 满/未满 3 小时 × `woken_at` × 时长 0；两个任务并发跑同一批账号只认领一次；3 小时内恢复又禁用的从新时间算。
  - 停机标记失效：账号恢复后 `Enabled=true`；再次禁用后旧标记不生效。
  - 同步：停机后只下发一次 `enabled:false`，10 分钟内不重复；恢复后下发 `enabled:true`。
  - 唤醒：重新授权和测试会等就绪，超时回 `runtime_not_ready`；手动刷新额度回 `runtime_parked`。
- 控制台：列表悬停文案、运行环境列表状态和按钮、设置项。
- 线上（ovh）：
  - 上线后核对迁移、设置默认 3 小时、3 小时内没有任何容器被停。
  - 3 小时后核对：20 个红色账号的 app 容器为 Exited，黄色和正常账号的容器仍在运行，控制器日志没有每分钟重复阻断。
  - 选一个红色老账号点“测试”：记录唤醒前后的容器 ID 和镜像，确认是同一个容器、镜像仍是老版本，测试结果和停之前一致。
  - 内存占用对比上线前（约 1.4 GiB）。
- 发布：与定时任务框架第一批一起，核心 0.1.235，两节点主节点优先；插件不发。
