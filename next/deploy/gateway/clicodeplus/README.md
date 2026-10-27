# sup2api 两节点部署（2026-10-27 起）

用户要求：clicodeplus 和 ovh 各一个节点，api.prophey.ai 先走 clicodeplus 本机节点、容灾到 ovh；数据库沿用 Supabase；Redis 用 valkey.prophey.ai，只允许两台节点服务器连接；不再在 ovh 上跑四个节点。

## 拓扑

```
客户端 ── api.prophey.ai（DNS → clicodeplus 64.186.225.70）
            │ clicodeplus Caddy（/root/caddy/Caddyfile，片段见 Caddyfile.sup2api）
            ├─① 127.0.0.1:3140 → sup2api-ccp（本机节点，/root/sup2api-node）
            └─② 127.0.0.1:3141 跳板 → https://sup2api.15.204.107.38.sslip.io
                   │ ovh Caddy（~/caddy/Caddyfile，片段见 ../ovh/Caddyfile.host-sup2api）
                   └→ 127.0.0.1:3130 → sup2api-1（主节点，~/sup2api-managed）

两节点共用：PostgreSQL（Supabase）+ Redis（rediss://…@valkey.prophey.ai:6380/0）
节点之间：HTTPS 7443（sup2api-1 ↔ sup2api-ccp，证书由 ovh 的 certs/ca.crt 签发）
```

- **选路**：`lb_policy first` 加主动健康检查（每 5 秒查 `/readyz`，3 秒超时）。本机节点健康时只走本机；不健康或连不上时转 ovh。连接失败的请求在 5 秒内重试别的上游。同一组上游不能混用 http 和 https，所以 ovh 经本机 3141 的 HTTP 跳板再转 HTTPS。
- **客户端 IP**：
  - clicodeplus Caddy 把客户端 IP 写进 `X-Forwarded-For`，3141 跳板原样转发。ovh Caddy 信任 64.186.225.70，取出真实地址后用 `{client_ip}` 传下去。
  - 每个节点的 `trusted_proxies` 只有本机 Docker 网关：sup2api-ccp 是 `10.234.10.1/32`（网络 `sup2api-node` 10.234.10.0/24），sup2api-1 是 `192.168.96.1/32`（`sup2api_default`）。
  - 切换前经 api.prophey.ai 进来的请求，`client_ip` 都记成 clicodeplus 的地址；切换后是真实地址。
- **主节点** sup2api-1：负责升级协调和插件包存储，发布源 `releases` 也在 ovh。核心发布流程不变（`stage/<版本>/build.sh`、签名、`sub2api-shell import`、`upgrade_observe.py`），从节点 sup2api-ccp 经 7443 从主节点拉取核心和插件包。
- **Redis**：在 40.160.152.211（`ssh valkey`，经 ovh 跳板）的 `~/valkey-stack`。Valkey 8 不发布端口，Caddy 四层代理在 6380 做 TLS 终结。
  - 白名单在 Caddy 的 layer4 路由里，按来源 IP 匹配，只放行 64.186.225.70 与 15.204.107.38，其他连接直接关闭。443 只用于 Let's Encrypt 续签证书。
  - redis-cli 测试要加 `--sni valkey.prophey.ai`（不带 SNI 时 Caddy 选不到证书）；go-redis 会自动带上。
- **节点间端口 7443**：两台机器都直接对外发布，不装防火墙（用户决定）。每个请求都要带 Redis 里登记的节点密钥，否则 401。
- **密钥**：
  - clicodeplus：`/root/sup2api-node/.env`（600）。
  - ovh：`~/sup2api-managed/.env`（600），数据库地址已从 compose 明文移入这里。
  - 节点配置 `config/*.json` 不再写数据库和 Redis 地址，由环境变量提供。

## 切换记录（2026-10-27 UTC）

1. 14:47 Redis 主机 Caddy 加 layer4 白名单。两台服务器 TLS + 密码 PING 通过，不在白名单的地址被直接断开。
2. 签发 `sup2api-ccp` 证书（SAN `sup2api-ccp`，3 年）。网关镜像 `sup2api-gateway:0.1.125` 经 `docker save | docker load` 复制到 clicodeplus，镜像 ID 一致。
3. 14:55 ovh Caddy 加 `sup2api.15.204.107.38.sslip.io`；clicodeplus Caddy 改为本机优先 + ovh 容灾。此时本机节点未启动，流量全部经 HTTPS 到 ovh，没有中断。
4. 14:57 备份 `~/sup2api-managed/backups/topology-2026-10-27/database.dump`，以及 compose、sup2api-1 配置、.env 的 `*.bak-pre-topology-20261027`。
5. `disable-node` 停用 sup2api-2/3/4（PG 中 enabled=f、stopped=t），然后删除容器。
6. 14:58:54 用新 compose 重建 sup2api-1（Redis 换成 valkey.prophey.ai，端口改为 127.0.0.1:3130 + 7443），14:59:06 就绪。**全站中断约 12 秒**，这是唯一一次中断。
7. 14:59:43 启动 sup2api-ccp：从主节点拉取核心 0.1.208，6 个插件（含 ccgateway 0.1.106）启动，15:00:02 就绪，Caddy 随即把流量切到本机。
8. 删除 ovh 的 `sup2api-valkey` 容器、`.env` 里不再使用的 `REDIS_PASSWORD`/`PG_PASSWORD`、sup2api-2/3/4 的状态卷（约 230 GB，都是可重新下载的发布包与插件包缓存，磁盘 47% → 33%）。

核对：
- 切换后真实请求 22 条全部 200，其中 sup2api-ccp 18 条、sup2api-1 4 条。
- 账号测试：35 号经 api.prophey.ai（sup2api-ccp）200，21 号经 sup2api-1 200。36 号在两个节点上都是上游 429，与切换无关。
- Redis 中只有 sup2api-1、sup2api-ccp 两个节点登记。

## 网关 0.1.126（2026-10-27 15:27–15:32 UTC，修复上线时发现的两个问题）

源码 ，镜像 （ID ），在 ovh 的干净 worktree  构建，再用  复制到 clicodeplus。两边的  里  都改成了这个版本。

**每个请求多约 0.26 秒（已修）**
- 原因：网关对每个公网请求都向核心查一次是否就绪（ →  → ），这一步要和 PostgreSQL 来回十几次。核心本身只要 1 ms，网关这一层却花了 366 ms。clicodeplus 到 Supabase 约 30 ms、到 Redis 约 25 ms，所以在这台机器上最明显。
- 修法：，结果在 1 秒内直接复用。过期后，上次是「就绪」的，先照常放行、同时在后台刷新，请求不用等；上次是「未就绪」的，每次都重新检查。
- 效果：

| 路径 | 修复前 | 修复后 |
|---|---|---|
| 本机节点  | 0.36 s | 0.3 ms |
| 本机节点  | 0.36 s | 约 1 ms |
| api.prophey.ai | 0.38–0.48 s | 0.02–0.03 s |
| 经 ovh 的容灾路径 | 0.10 s | 0.023 s |

**节点管理命令引用了不存在的表（已修）**
- 、 和插件包回退都查 、 这两张表，但网关的建表脚本从来没有创建过它们（2026-10-04 审计合并时引入）。
-  现在只删节点登记和准入记录；计划步骤、停止确认和事件保留，作为审计记录。
- 插件包回退改为依次去其他启用中的节点取，对方没有这个包就返回 404。
-  原本把主节点名当成基线版本来比较（ 的返回值顺序读错了），所以对任何节点都拒绝，已一起修正。
- 新增 PG 测试 。在全新数据库上，网关全部测试通过；共享测试库里有 14 个用例因为残留的插件数据失败，未改的代码在同一个库上同样失败。

**上线顺序**
1. 先更新 ovh 的 sup2api-1，它当时只做容灾、几乎没有流量。15:27:14 启动，15:27:28 就绪。
2. 用新网关  删除 sup2api-2/3/4 的登记，集群里现在只剩 sup2api-1 和 sup2api-ccp。
3. clicodeplus：先把本机上游从 Caddy 摘掉（流量全部走 ovh），再重建容器（按 180 秒宽限排空，实际停了 8 秒）。15:32:02 就绪后恢复 Caddy。
4. 这次实际生效的是 。

核对：上线后真实请求全部 200（sup2api-ccp 23 条、sup2api-1 1 条）；账号测试 35 号经 api.prophey.ai 200（1.1 s），21 号经 sup2api-1 200。

## 已知问题

- **资源余量小**：clicodeplus 6 核、7.7 GB 内存，节点约用 1.8 GB，可用约 3.6 GB，磁盘剩 27 GB。
- **业务查询仍比 ovh 慢**：clicodeplus 离数据库约 30 ms，需要多次查库的接口（例如仪表盘概览约 0.5 秒）仍比 ovh 节点慢。这是距离造成的，不是就绪检查的问题。
