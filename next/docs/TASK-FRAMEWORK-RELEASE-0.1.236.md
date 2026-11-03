# 核心 0.1.236 发布清单：计费、凭证、同步任务迁入框架

计划见 `TASK-FRAMEWORK-PLAN.md` B1–B4，契约见 `CONTRACTS.md` §77.7。只发核心，插件、控制器、Worker、CLI 都不发。

**前提**：0.1.235 已在线上跑稳，并按 `TASK-FRAMEWORK-RELEASE-0.1.235.md` §5 核对完。0.1.236 依赖 0.1.235 的迁移 0085（`blocked_revision`/`blocked_at`）。

发布本身在 ovh 上由你执行。云端会话没有 ssh 和密钥，下面的命令都没有在线上跑过。

## 1. 这次发什么

- **提交**：`bd07311`（分支 `feat/next-platform`）。之后的 B4 提交只改文档（CONTRACTS、计划、本文件），不影响构建。
- **内容**：7 个原有循环迁入框架。

  | 任务 | 类型 | 原来 |
  | --- | --- | --- |
  | `core.account.usage_limits` | cluster 5s | 每节点循环 + PG advisory 锁 |
  | `core.account.credential_refresh` | cluster 5m，接手时先跑 | 每节点循环 + Redis 锁 `account:refresh:sweep` |
  | `core.helper.usage_replay` | cluster 5s | 每个节点都回放 |
  | `core.ccgateway.runtime_sync` | cluster 1m，并发 4 | 每个节点各扫一遍 |
  | `core.usage.reconcile` | cluster 10s | 每节点循环 + Redis 锁 `usage:reconcile` |
  | `core.account.quota_sweep` | node 5s，可工作节点 | 每节点循环 |
  | `core.usage.settlement_retry` | node 30s，可工作节点 | 每节点循环 |

  另外，停用账号和停着的容器的 `enabled:false` 去重从“每个节点各记一份”改成记在 `ccgateway_runtimes`，两节点合计 10 分钟内只下发一次。
- **迁移**：没有。schema 不变，升级计划可以自动回滚。
- **不变**：
  - Host API 仍是 8；
  - 内置插件不升级；
  - 账号容器不重建、不换镜像；
  - 计费的行租约、幂等键、状态机都不变。

## 2. 发布前

1. ovh 上更新 `src` 到上面的提交，跑 Linux 专属测试（`golang:1.27-bookworm` 一次性容器）。核心全量测试在云端已跑过，结果见 §8。
2. 备份数据库到 `backups/core-0.1.236/`。
3. 记下当前状态，作为核对基准：
   - 两节点版本（应为 0.1.235）；
   - 数据库连接数；
   - 两个核心容器的内存；
   - 计费积压：

     ```sql
     select count(*) from pending_settlements where state = 'pending' and next_check_at < now() - interval '5 minutes';
     select billing_status, count(*) from usage_logs where billing_status in ('pending','failed') and created_at < now() - interval '5 minutes' group by 1;
     select count(*) from account_usage_deltas;
     ```
   - 控制器日志里每分钟 `enabled:false` 的次数。

## 3. `stage/0.1.236/` 要替换的地方

把 `stage/0.1.235/{build.sh,release.sh}` 复制到 `stage/0.1.236/`，然后逐项替换。

| 位置 | 0.1.235 的值 | 0.1.236 改成 |
| --- | --- | --- |
| 版本号 `V` 和所有出现 `0.1.235` 的路径、标签、文件名 | `0.1.235` | `0.1.236` |
| 提交号 `COMMIT` | `e58a4f2`（或 0.1.235 实际发布的提交） | `bd07311` |
| build 的 schema 检查 | “schema 必须变化” | **“schema 不变”**，与 0.1.234 的 build 相同 |
| 签名时的 `SOURCE_SCHEMA` | 0.1.234 的契约 `c4cddb7f…` | 删掉或改为 0.1.235 发布后的新契约。不跨 schema，升级计划可以自动回滚 |
| 内置插件 `builtin/` | 线上一套（ccgateway 0.1.125） | 不变 |
| Host API | 8 | 8，不变 |

替换后检查，除了你有意保留的注释，应该没有输出：

```bash
grep -n '0\.1\.235\|e58a4f2' stage/0.1.236/*
```

## 4. 升级

- 照 0.1.235 跑 `upgrade_observe.py`，主节点 `sup2api-1` 先升，`sup2api-ccp` 后升。
- 滚动窗口内，0.1.235 节点仍跑原循环，0.1.236 节点跑任务，同一件事可能各做一次，都幂等：
  - 对账：行租约，同一条不会被两边同时查；
  - 用量汇总：`SKIP LOCKED`；用量限制写入前重查；
  - 结算重试：`SKIP LOCKED` + 幂等键；
  - helper 回放：回执事务 + outbox 摘要；
  - 运行环境同步：每个运行环境的 advisory 锁。0.1.235 节点不读 `blocked_revision`，窗口内 `enabled:false` 可能比平时多发几次。
- 新任务第一次登记时，`scheduled_tasks` 增加 5 行。

## 5. 线上核对

在两节点都升级完成后核对：

### 5.1 框架

- [ ] 两节点版本为 0.1.236，`/readyz` 返回 200，api.prophey.ai 返回 200。
- [ ] `select name, last_status, consecutive_failures from scheduled_tasks order by name;` 有 17 行（0.1.235 的 12 行加 §1 的 5 个 cluster 任务）。几分钟后都应是 `succeeded`（每小时的任务在第一个整点后）。
- [ ] 每个任务每个时段只执行一次（与 0.1.235 §5.1 相同的 SQL），没有结果。
- [ ] 控制台“系统 → 定时任务”：
  - [ ] 显示 17 个 cluster 任务；
  - [ ] 两个节点上各有 5 个 node 任务：`core.authz.version_poll`、`core.webui.asset_lease`、`core.account.quota_mirror`、`core.account.quota_sweep`、`core.usage.settlement_retry`；
  - [ ] `core.usage.reconcile` 的运行记录里有条数，耗时是整轮对账的时间。
- [ ] 旧锁不再出现：

  ```bash
  redis-cli --scan --pattern 'lock:*' | grep -E 'account:refresh:sweep|usage:reconcile'
  ```

  ```sql
  select count(*) from pg_locks
  where locktype = 'advisory' and objsubid = 1
    and objid = (hashtext('account.usage_limits')::bigint & 4294967295)::oid;
  ```

  都应该没有（SQL 结果为 0）。
- [ ] `river_job` 行数：每天约多 4.5 万行（两个 5 秒任务、一个 10 秒任务为主）。成功的 job 保留 24 小时，一天后行数应稳定。
- [ ] 两节点近 30 分钟没有 `task` 相关的 ERROR。

### 5.2 计费

- [ ] §2 的三条积压查询与发布前相当，不持续增长。
- [ ] 抽一条刚产生的预扣请求，按原来的方式确认它被对账、结算。
- [ ] 账号用量与用量限制：控制台账号详情的用量在几秒内更新；有用量限制的账号状态正常。

### 5.3 凭证与额度

- [ ] `core.account.credential_refresh` 最近一次 `succeeded`，计数合理；没有续期相关的 ERROR。
- [ ] 两节点 `core.account.quota_sweep` 都在跑；控制台额度显示正常更新。

### 5.4 运行环境同步

- [ ] `core.ccgateway.runtime_sync` 每分钟一次，`message` 为空（有失败时写失败个数）。
- [ ] 控制器日志：每分钟的 `GET status` 约为运行环境数，不再是“运行环境数 × 节点数”。
- [ ] 停着的容器：

  ```sql
  select count(*) from ccgateway_runtimes where parked_at is not null and (blocked_revision is null or blocked_at is null);
  ```

  一两分钟后为 0；控制器日志里同一个账号 10 分钟内只有一次 `enabled:false`。
- [ ] 改一个账号的代理后，`core.ccgateway.runtime_sync` 历史里出现一条手动运行。
- [ ] 内存、连接数对比 §2 的基准。

## 6. 回滚

0.1.236 不改 schema，升级计划可以自动回滚到 0.1.235。回滚后：

- 0.1.235 的原循环恢复工作；
- `scheduled_tasks` 里 5 个新任务的行留着无害，`river_job` 里已投递的这些任务的 job 会被 0.1.235 节点取消（任务未登记）；
- `blocked_revision`/`blocked_at` 0.1.235 不读，留着无害。

## 7. 部署记录草稿

发布后写到 `next/deploy/gateway/ovh/README.md` 顶部，尖括号内由你填：

```markdown
2026-11-<日> 核心 **0.1.236**（`bd07311`，北京时间 <开始>–<结束>；核心 manifest `<…>`，计划 `<id>` completed/<n>，无迁移，schema 不变，Host API 8，内置插件与线上相同（ccgateway 0.1.125））：
- 内容（CONTRACTS §77.7）：`core.account.usage_limits`、`core.account.credential_refresh`、`core.helper.usage_replay`、`core.ccgateway.runtime_sync`、`core.usage.reconcile` 改为全集群任务，`core.account.quota_sweep`、`core.usage.settlement_retry` 改为可工作节点的 node 任务；停用和停着的运行环境 `enabled:false` 去重记在 `ccgateway_runtimes`。
- 核验：两节点 0.1.236、`/readyz` 200；`scheduled_tasks` 17 行全部 succeeded；每时段无重复运行；旧锁不再出现；计费积压与发布前相当（<数字>）；控制器每分钟 `GET status` <n>（发布前 <n>）；停着的容器 10 分钟内只阻断一次。
- 回滚注意：不跨 schema，可自动回滚。
- 脚本 `stage/0.1.236/`；备份 `backups/core-0.1.236`（`<sha>`）。
```

## 8. 云端已跑的验证

- Go：`go.work` 里每个模块都跑了 `go test ./... -count=1`，PG 测试用本机 PostgreSQL 16 真实执行，没有跳过。
- 新增或改动的测试：
  - ccgateway：`TestBlockedOnceAcrossNodes`（两节点交替 6 轮只阻断 1 次；kick 后再阻断 1 次；记录过期后换节点再阻断）、`TestRuntimeSyncReconcilesEveryRuntime`、`TestRuntimeSyncOffWithoutAccountRuntimes`、`TestRegisterTasks`；原 `TestBlockedRuntimeIsNotRewrittenEveryPass` 不变并通过；
  - account：`TestAccountTaskSpecs`、`TestUsageLimitsTaskFoldsAndEnforces`；原额度、续期、用量限制测试不变并通过；
  - usage：`TestReconcileTaskWaitsForTheSweep`、`TestSettlementRetryTask`、`TestUsageTaskSpecs`；`TestReconcileRunsOnOneNodeOnly` 去掉锁后仍只查一次；
  - app：`scheduled_tasks` 里核心 cluster 任务为 17 个；
  - task：ticker 白名单收紧到设计 §14.3，`TestNoNewBusinessTickers` 通过。
- web 没有改动，没有重跑。

结果（2026-11-03）：

- `server`：53 个包全部 ok，没有失败。
- `deploy/mock-upstream`、`gateway`、`protocol-codec`、`runtime-contract`、`sdk`、`tools/sub2api-plugin`、全部插件模块（含 ccgateway 的 companions）：全部 ok。
- `e2e`：29 个用例都在第一步失败，原因是 `E2E_BASE_URL is not set`，与 0.1.235 相同，**没有跑**。需要的话在 ovh 上按 `deploy/README.md` 起 e2e 栈后再跑。
