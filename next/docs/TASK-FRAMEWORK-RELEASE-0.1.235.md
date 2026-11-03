# 核心 0.1.235 发布清单：定时任务框架 + 红色账号停容器

计划见 `TASK-FRAMEWORK-PLAN.md`，契约见 `CONTRACTS.md` §77。只发核心，插件、控制器、Worker、CLI 都不发。

发布本身在 ovh 上由你执行。云端会话没有 ssh 和密钥，下面的命令都没有在线上跑过。

## 1. 这次发什么

- **提交**：分支 `feat/next-platform` 上包含本文件的那个提交。在 ovh 的 `src` 里取：

  ```bash
  git log -1 --format=%h -- next/docs/TASK-FRAMEWORK-RELEASE-0.1.235.md
  ```

  如果之后还有修正，取修正后的 HEAD。
- **内容**：
  - 定时任务框架：gocron 每节点跑，River 全集群跑一次。
  - 控制台“系统 → 定时任务”页面。
  - 13 个原有循环迁入框架，另有两个新任务：`core.ccgateway.park_runtimes` 和 `core.task.housekeeping`。完整清单见 §77.4。
  - CCGateway 账号红色满 `park_after_hours`（默认 3 小时）后，容器原地停止。
- **迁移**：0076–0085，都是幂等迁移。
  - 0076–0083：River 的表。
  - 0084：`scheduled_tasks` 表。
  - 0085：
    - `ccgateway_runtimes.parked_at`、`woken_at`、`blocked_revision`、`blocked_at`；
    - `accounts.status_changed_at`，带触发器和回填。

  这是 schema 变化发布。
- **不变**：
  - Host API 仍是 8；
  - 内置插件不升级；
  - 账号容器不重建、不换镜像。

## 2. 发布前

1. ovh 上更新 `src` 到上面的提交，跑 Linux 专属测试（`golang:1.27-bookworm` 一次性容器）。核心全量测试和 web `npm run check` 在云端已跑过，结果见 §8。
2. 备份数据库到 `backups/core-0.1.235/`（照 0.1.234 的做法）。
3. 记下当前状态，作为核对基准：
   - 两节点版本；
   - 数据库连接数；
   - 两个核心容器的内存，参考约 1.4 GiB；
   - 所有账号容器的 ID 和镜像，存到 `stage/0.1.235/containers-before.txt`；
   - 红色 CCGateway 账号的数量和 id。

## 3. `stage/0.1.235/` 要替换的地方

把 `stage/0.1.234/{build.sh,release.sh}` 复制到 `stage/0.1.235/`，然后逐项替换。0.1.232 和 0.1.233 都因为复制后没替换干净出过错。

| 位置 | 0.1.234 的值 | 0.1.235 改成 |
| --- | --- | --- |
| 版本号 `V` 和所有出现 `0.1.234` 的路径、标签、文件名（`v0.1.234.digests`、`backups/core-0.1.234`、镜像标签） | `0.1.234` | `0.1.235` |
| 提交号 `COMMIT` | `e3f5dde61` | §1 取到的提交 |
| build 的 schema 检查 | “schema 不变” | **“schema 必须变化”**：有迁移 0076–0085，与 0.1.233 的 build 相同 |
| 签名时的 `SOURCE_SCHEMA` | — | 旧契约 `c4cddb7f…`，即 0.1.234 的 schema。0.1.235 跨 schema，升级计划不能自动回滚 |
| 内置插件 `builtin/` | 0.1.233 的一套，其中 ccgateway 是 0.1.124 | 线上现有的一套，其中 ccgateway 是 **0.1.125**。内置插件只升不降，不要放回 0.1.124 |
| Host API | 8 | 8，不变 |

替换后检查，除了你有意保留的注释，应该没有输出：

```bash
grep -n '0\.1\.234\|e3f5dde' stage/0.1.235/*
```

## 4. 升级

- 照 0.1.234 跑 `upgrade_observe.py`，主节点 `sup2api-1` 先升，`sup2api-ccp` 后升。
- 滚动窗口内，新节点跑任务，旧节点跑原循环。同一件事可能各做一次，都是幂等的。
- 旧节点不认识 River 的表，也不会碰它们。
- 0.1.234 节点的 ccgateway 全量同步不会停容器。所以在两节点都升完之前，即使有账号到了 3 小时，也可能被旧节点重新启动。升完后最多 1 分钟内会再停下。

## 5. 线上核对

### 5.1 框架

在两节点都升级完成后核对：

- [ ] 两节点版本为 0.1.235，`/readyz` 返回 200，api.prophey.ai 返回 200。
- [ ] `select * from river_leader;` 有一行，对应主节点上的 River 客户端。
- [ ] `select name, last_status, consecutive_failures from scheduled_tasks order by name;` 有 12 行，见 §77.4。几分钟后，每分钟的任务都应是 `succeeded`；每小时的任务在第一个整点后应是 `succeeded`。
- [ ] 每个任务每个时段只执行一次：

  ```sql
  select args->>'name', scheduled_at, count(*) from river_job
  where kind = 'sup2api.task' and not coalesce((args->>'manual')::bool, false)
  group by 1, 2 having count(*) > 1;
  ```

  应该没有结果。
- [ ] 控制台“系统 → 定时任务”：
  - [ ] 显示 12 个 cluster 任务；
  - [ ] 两个节点上各有 3 个 node 任务：`core.authz.version_poll`、`core.webui.asset_lease`、`core.account.quota_mirror`；
  - [ ] 手动运行 `core.jobs.retention` 后，历史里出现一条手动运行；
  - [ ] 节点页的“任务”列能链接过来。
- [ ] 数据库连接数比发布前多 2 个左右（River）。
- [ ] 旧的 Redis 锁不再出现：

  ```bash
  redis-cli --scan --pattern 'lock:*' | grep -E 'retention|purge|sweep|plugin-writes|lifecycle-status|preparations'
  ```

  应该没有输出。
- [ ] 两节点近 30 分钟没有 `task` 相关的 ERROR。
- [ ] （可选，要短暂停一个节点）停掉主节点所在核心，几秒内另一节点接任：控制台 `leader` 变为它，`scheduled_tasks` 继续更新。

### 5.2 停容器

- [ ] 上线后马上核对：
  - [ ] `GET /system/ccgateway/remote-config` 带 `park_after_hours: 3`；
  - [ ] `select count(*) from ccgateway_runtimes where parked_at is not null;` 为 0；
  - [ ] `accounts.status_changed_at` 已回填，没有 NULL。
- [ ] 3 小时内：没有任何容器被停，`account.runtime_parked` 审计为 0。注意回填值是迁移时间，所以第一批最早在上线 3 小时后才停。
- [ ] 3 小时后：
  - [ ] 红色 CCGateway 账号的 app 容器都已 Exited，数量应等于 §2 记下的红色账号数（之后变红的另算）；
  - [ ] 黄色和正常账号的容器仍在运行；
  - [ ] 每个停掉的账号各有一条审计 `account.runtime_parked`；
  - [ ] 控制器日志没有每分钟重复下发 `enabled:false`。
- [ ] 账号列表：红色徽标的悬停说明末尾有“容器已停止（停机满设定时长）……”。
- [ ] 账号容器列表：停掉的账号显示“已停止（停机满设定时长）”，并有“启动”按钮。
- [ ] 选一个红色**老**账号（CLI 2.1.312）点“测试”：
  - [ ] 测试前后容器 ID 相同，镜像仍是老版本，CLI 仍是 2.1.312；
  - [ ] 测试结果与停之前相同；
  - [ ] 有审计 `account.runtime_woken`；
  - [ ] 之后这个账号要再红满 3 小时才会被停。
- [ ] 内存对比 §2 的基准。

### 5.3 老容器重建的 CLI 版本（A8 核对时发现）

- **场景**：容器启动时，如果共享出口把 `resolv.conf` 换成新文件（`ErrMountReplaced`），控制器会删掉 app 容器，让核心重建。
- **正常情况**：重建按 `st.CLI` 记录的版本选镜像，老账号保持老 CLI。
- **风险**：CLI profile 之前创建的老式容器，`st.CLI` 没记版本，重建时会用目标镜像，CLI 会变新。停、启会让这条路径比以前常走。

上线前在控制器状态里查一次，有没有 `cli` 为空的账号运行环境：

- [ ] 如果有，把这些账号记下，建议先排除：把 `park_after_hours` 设为 0，或先给它们补上 CLI profile，再开停容器。
- [ ] 如果没有，在部署记录里写“无老式容器”。

## 6. 回滚

0.1.235 跨 schema，升级计划不能自动回滚。手动回滚到 0.1.234 照以往 schema 变化发布的做法，参照 0.1.186、0.1.195 的记录：托管核心启动时，会因库里有它不认识的迁移（`appliedPrefix`）而拒绝。

回滚后：

- 旧核心的原循环恢复工作。
- River 的表和 `scheduled_tasks` 留着无害。
- 旧核心认为所有容器都应运行，会在 60 秒内把停着的容器全部启动，停容器的回滚是安全的。
- 0085 的新列旧核心不读。

## 7. 部署记录草稿

发布后写到 `next/deploy/gateway/ovh/README.md` 顶部，尖括号内由你填：

```markdown
2026-11-<日> 核心 **0.1.235**（`<提交>`，北京时间 <开始>–<结束>；核心 manifest `<…>`，计划 `<id>` completed/<n>，迁移 0076–0085，schema `c4cddb7f…` → `<新契约>`，Host API 8，内置插件与线上相同（ccgateway 0.1.125））：
- 内容（用户 2026-11-03 要求“散落的定时任务统一到框架，系统界面查看执行情况”和“红色账号停机 3 小时停容器”，CONTRACTS §77）：gocron + River 定时任务框架；控制台“系统 → 定时任务”；13 个原有循环迁入；新任务 `core.ccgateway.park_runtimes`（红色满 `park_after_hours`=3 小时停容器，测试/重新授权/“启动”唤醒）。
- 核验：两节点 0.1.235、`/readyz` 200；`river_leader` <节点>；`scheduled_tasks` 12 行全部 succeeded；每时段无重复运行；连接数 +<n>；旧锁 key 不再出现；3 小时后停了 <n> 个红色账号的容器，黄色/正常账号未受影响；老账号 <id> 测试唤醒后容器 ID/镜像/CLI 不变；<老式容器核对结果>。
- 回滚注意：跨 schema，手动回滚（参照 0.1.186/0.1.195）；旧核心 60 秒内会重新启动停着的容器。
- 脚本 `stage/0.1.235/`；备份 `backups/core-0.1.235`（`<sha>`）。
```

## 8. 云端已跑的验证

- Go：`go.work` 里每个模块都跑了 `go test ./... -count=1`，PG 测试用本机 PostgreSQL 16 真实执行，没有跳过。结果见下。
- web：`npm run check`（类型、lint、vitest）通过。
- 控制台：在 mock 下截图核对：
  - 定时任务页；
  - 账号容器列表的“已停止”与“启动”；
  - 设置项；
  - 账号悬停说明。

结果（2026-11-03，提交 814b709 之上加本文件）：

- `server`：53 个包全部 ok，没有失败。
- `deploy/mock-upstream`、`gateway`、`protocol-codec`、`runtime-contract`、`sdk`、`tools/sub2api-plugin`：全部 ok。
- 全部插件模块全部 ok，包括 ccgateway 和它的 companions（contracts、controller-go、guard、worker）。
- `e2e`：29 个用例都在第一步失败，原因是 `E2E_BASE_URL is not set`。它要一套已部署的双节点栈（`deploy/e2e`，Docker），云端没有，所以**没有跑**。需要的话在 ovh 上按 `deploy/README.md` 起 e2e 栈后再跑。
- Linux 专属测试（Docker、sandbox 等）照惯例在 ovh 的 `golang:1.27-bookworm` 容器里跑，见 §2。
- web：
  - `npm run check`：117 个文件、989 个测试全过；
  - `npm run build`：通过。
