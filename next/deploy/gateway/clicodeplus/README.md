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

## 已知问题

- **clicodeplus 节点每个请求多约 0.26 秒**：
  - 网关对每个请求都向核心查一次就绪状态（`LocalReady` → `/v1/status` → `approvedPluginsReady`），这一步要和数据库来回十几次。
  - clicodeplus 到 Supabase 约 30 ms、到 Redis 约 25 ms；ovh 分别是 8 ms 和 2 ms。实测核心本身 1 ms，网关一层 366 ms；经 ovh 容灾路径约 0.10 秒。
  - 修法：缓存就绪结果，需要发核心新版本。
- **`remove-node` 失败**：删除 `updater.node_artifacts` 时报这张表不存在，事务整体回滚。sup2api-2/3/4 因此仍以「停用、已停止」留在 `updater.nodes`。按设计停用节点的记录本来就保留，不参与调度和升级。
- **资源余量小**：clicodeplus 6 核、7.7 GB 内存，节点约用 1.8 GB，切换后可用 3.6 GB、磁盘剩 27 GB。
- **`stop_grace_period: 180s`**：两份 compose 都已写入，下次重建容器时生效。此前 ovh 的线上 compose 没有这项，Docker 默认停止时只等 10 秒。
