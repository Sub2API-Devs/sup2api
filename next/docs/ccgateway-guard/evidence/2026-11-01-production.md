# 生产上线证据：ovh（2026-11-01，UTC）

执行人：主控会话（agent team 协调）。依据：04-migration-rollout.md S0–S5、05-test-plan.md §10。时间均为 UTC（北京时间 +8 小时）。

## 1. 版本

| 组件 | 版本 | 引用 / 摘要 |
|---|---|---|
| 核心 | 0.1.227（源码 `8dfe959da`） | manifest `066bc7bb…af81`，bundle `0e606373…154f`；两节点 sup2api-1、sup2api-ccp |
| 插件 ccgateway | 0.1.119（`8dfe959da`） | 包 `a1b8e1a7…cdc3` |
| 插件 ccgateway | 0.1.120（`69385b7bd`，控制器内存修复） | 包 `a69b619f…bea2`，rollout 218 |
| Go 控制器 | `ccgateway-controller:0.1.120` | 包内 `images/images.json` 的 controller 条目，标签 guard-api=1、shared-egress=1 |
| guard | `ccgateway-guard:0.1.119` → `ccgateway-guard:0.1.120-r2`（`3bb9d3a8d`） | 本地构建，镜像 ID `sha256:13bf8522…2aaf9e`（GHCR 私有，ovh 拉不到） |
| 共享网关 | 未动（S6 未执行） | `sha256:92305b5b…`，容器 `ccg-shared-egress` 自 2026-10-15 运行 |

## 2. 时间线

| 时间 | 阶段 | 结果 |
|---|---|---|
| 15:10 | S1：guard 换下 bridge guard | 新旧规则逐条一致；bridge guard 停止并 disable（unit 在 /etc/systemd/system，不能 mask）；guard CPU 约 0.05% |
| 15:18 | S2：核心 0.1.227 | 两节点完成 |
| 15:22 | S3：插件 0.1.119 | 两节点 active |
| 15:26 | S4：接管（adopt） | 没有重建任何账号容器；Python 控制器改名 `ccg-controller-prev` 并停止 |
| 15:26–15:33 | S5：草稿账号新建/删除；推送 egress+app | 草稿 5 秒就绪，删除后容器、网络、卷都清掉；Worker 原地更新，容器 ID 不变，网关未重建 |
| 15:33 | S5：Worker+CLI 成对激活 | **控制器在 1 GiB cgroup 中被 OOM 杀**（anon-rss 585 MB），15:34:04 自动重启并恢复 |
| 16:28 | `/opt/ccgateway/compose.yml` 控制器 `mem_limit` 1g → 2g | 改后与仓库模板（`54e6fd357`）逐字节一致；原文件备份在 `backups/ccgateway-0.1.120/compose.yml.before` |
| 16:33:18 | 插件 0.1.120 | rollout 218，12 秒两节点 active |
| 16:33:42–46 | 推送 controller 角色：控制器经 guard 自升级 | 约 4 秒；新容器 healthy，内存上限 2 GiB；网关未重建；规则数不变（CCG-CONTROL-FWD 62，CCG-PROXY-BRIDGE 54） |
| 16:35 | 推送 egress（成功）、app（失败） | **guard 在 256 MiB cgroup 中被 OOM 杀两次**（见 §3.2），自动重启；数据路径不受影响 |
| 16:41:02–08 | guard 换成 `0.1.120-r2` | compose 锁内改 `.env` 的 `CCG_GUARD_IMAGE`，`up -d --no-deps guard`；6 秒 healthy；`iptables -S` 前后完全一致 |
| 16:41:26–16:45:26 | 再推 app | 成功，`up_to_date=true`；guard 无重启，内核无 OOM |
| 16:46:32–16:52:39 | 成对激活复测 | 25 updated、7 not_running、2 busy（57、68）、1 failed（23 号 `not_found`，没有容器，0.1.115 起如此）；无 OOM、无重启 |
| 16:53:33–16:58:47 | 成对激活再跑一轮 | 27 updated、7 not_running、23 号 not_found |
| 17:00 | finish（A7） | 删除 `ccg-controller-prev`、`.env.prev`、`.transition`（删除前 inspect 与 `.env.prev` 存入备份） |

## 3. 两次内存事故

### 3.1 控制器（15:33）

- 原因：`containerfs.WriteFile` 写完 CLI 后用 `io.ReadAll` 读回校验，306 MiB 的 CLI 连同切片扩容约 550–700 MiB 堆；每个激活各读一遍镜像里的 CLI，没有并发上限。Python 版没有内存上限，所以没暴露。
- 修复（`8ae5fc771`、`7d4dd1bb8`）：回读边读边算哈希；大文件 spool 每 8 MiB 写穿并丢页缓存；同一镜像的文件只读一次、引用计数共享；同时最多 2 个激活（guard 只允许 4 路流式请求）。
- 隔离实例验证（1 GiB，3 账号同时激活，CLI 306 MiB）：修复前 memory.peak 顶到 1024 MiB、2 个账号 503；修复后 memory.peak 51 MiB（全程 78 MiB），全部 updated。
- 生产复测（16:46）：控制器 memory.peak 436 MiB，其中匿名内存 7 MiB，其余是干净的页缓存（`file_dirty` 为 0）。

### 3.2 guard（16:35）

- 原因：guard 把上传的镜像归档写到 `/var/lib/ccgateway-guard/loads/*.part`，按网络速度写入的脏页记在 guard 自己的 256 MiB cgroup 里。内核报告 `file_dirty 258457600`、`file_writeback 20480`、`anon 94208`：页缓存回写不及，无法回收。0.1.119 的 app 推送没有出事，是因为当时 guard 刚启动、余量更大（未深究）。
- 修复（`3bb9d3a8d`）：`files.CopyWriteThrough` 每 8 MiB `sync_file_range` 写穿并 `fadvise DONTNEED`，结束后丢掉整个文件的缓存。
- 生产复测：app 镜像再推送成功，guard 当前内存 9–15 MiB，无重启。

## 4. 验收项

| 项 | 结果 |
|---|---|
| 草稿账号新建与删除 | 通过 |
| egress/app 推送：原地更新、网关不重建 | 通过 |
| 成对激活 Worker+CLI 2.1.312 | 通过（0.1.120 之后） |
| 控制器自升级往返（IT-F14 的生产版本） | 通过：0.1.119 → 0.1.120 经 guard 完成，约 4 秒，账号保持就绪 |
| 全部账号健康 | 27 个账号 healthy，CLI 2.1.312 |
| 规则数 | CCG-CONTROL-FWD 62、CCG-PROXY-BRIDGE 54，全程不变 |
| 真实流量 | 约 16:20–17:00 的 40 分钟内 152 次 200；5xx 4 次：16:33:42–43 各 1 次（控制器自升级窗口），75 号 2 次 502（其中 1 次在 Worker 原地更新期间；75 号之前也有零星 502） |

## 5. 备份与回滚

- `~/sup2api-managed/backups/ccgateway-guard/{s0-20261101,s4-20261101}`、`backups/core-0.1.227`、`backups/ccgateway-0.1.120`（数据库、控制器状态、compose.yml 和 `.env` 的修改前版本、Python prev 容器的 inspect 与 `.env.prev`）。
- finish 之后回到 Python 只能走 04 §5.3 的 release 手册；Python 控制器镜像已在 D10 删除（§7），需要时从 Git 源码重建。
- guard 回滚：`.env` 的 `CCG_GUARD_IMAGE` 改回 `ccgateway-guard:0.1.119`，`up -d --no-deps guard`（会重新带回 §3.2 的问题）。

## 6. S6：网关纳入 compose（17:14，用户要求不等观察期，直接做）

- 前置：`docker inspect ccg-shared-egress` 存档（`backups/ccgateway-s6/egress-inspect.json`）。现网参数与 compose 的 egress 服务一致：镜像 `sha256:92305b5b…`、`cap_drop ALL` + `NET_ADMIN`/`NET_BIND_SERVICE`、sysctl、只读 `/config`、标签 `io.sup2api.ccgateway.shared=ccg`。compose 另加 `init`、384m、2 CPU。
- 操作（compose 锁内）：`--profile egress config -q` → `docker stop ccg-shared-egress` 并改名 `-legacy` → `--profile egress up -d --no-deps egress`。
- 结果：网关 17:14:54 停止，guard 17:15:02 把 `CCG-PROXY-BRIDGE` 写成 0 条，控制器 recover 逐个接回，17:15:48 回到 52 条（26 个运行中账号 × 2）。**单个账号最长中断约 54 秒。** 新网关带 compose 标签 `com.docker.compose.service=egress`，镜像未变。
- 真实请求在窗口内失败 3 次（17:14:50–57，2 次 503 `not ready`、1 次 502），之后恢复 200。26 个账号 healthy（21 号在 17:01:57 被人从控制台删除，与本次操作无关）；guard、控制器零重启。

## 7. D10 收尾清理（17:17–17:22）

先存档到 `backups/ccgateway-guard/d10-20261101/`（SHA256SUMS 在内），再删除：

| 内容 | 存档 |
|---|---|
| 容器 `ccg-shared-egress-legacy` | `egress-legacy-inspect.json` |
| `/usr/local/libexec/ccgateway-bridge-guard.py`、`/etc/systemd/system/ccgateway-bridge-guard.service`（`daemon-reload` 后 unit 已不存在） | `bridge-guard-files.tgz` |
| `/opt/ccgateway-runtime/controller-before-0.1.115`，5 个账号目录下的 `worker-backups-before-*`（0.1.114、0.1.123、quota-0.1.125） | `history-dirs.tgz`（约 270 MB 原始） |
| `/opt/ccgateway-runtime/{migration-304-core172,offline-migrations,quota-0.1.125-workers}`（10 月的迁移遗留） | `runtime-old-migrations.tgz` |
| `~/ccg-gt-l7`、`~/ccg-gt-memfix-evidence`、`/tmp/guard-r2` | `test-evidence.tgz`（前两项） |
| 镜像 `ccgateway-controller:0.1.16`–`0.1.118`（全部 Python 版）、`ccgateway-controller:it`、`ccgateway-guard:it`、`ccgateway-guard:0.1.120`（未带写穿修复） | 无（可从 Git 源码重建） |

保留：`ccgateway-controller:0.1.119/0.1.120`、`ccgateway-guard:0.1.119/0.1.120-r2`；旧版 app、egress 等镜像不在 D10 范围内，未动。

仓库侧：Python 控制器源码、CI 步骤与 bridge guard 文件单独提交删除（见 git 历史）。

## 8. 其他

- 核心默认镜像已改为 CI 的 `3bb9d3a8d` 构建（`b121d5cfa`），随下次核心发布生效；生产 compose.yml 已是 2g 模板。
