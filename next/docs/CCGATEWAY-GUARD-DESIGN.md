# CCGateway 守护进程（guard）与控制器降权设计

日期：2026-11-01。状态：设计稿，待用户确认后实施。

用户要求（2026-11-01）：
- 控制器不再持有 Docker 权限，改由宿主机上的 guard 代为执行 Docker 操作。
- guard 只暴露为本场景定制的 HTTP API，不提供 Docker socket，也不兼容 Docker API。
- guard 只能在本机访问；控制器和 guard 处在同一个网络里，guard 不能被外部控制。
- 控制器不再使用 host 网络，改为普通网络加端口映射。

本文基于 ccgateway 0.1.118 的控制器代码（`7a72fd342`）、核心 0.1.226 的安装脚本，以及 2026-11-01 在 ovh 上只读核对到的事实。

## 1. 目标与边界

目标：

1. 控制器即使被完全攻破，也拿不到宿主机 root，读不到宿主机上的任意文件，碰不到宿主机上的其他服务（sup2api、codingplus、Caddy、数据库凭证等）。
2. 账号容器的隔离不变：只能经共享网关出网，不能直接用宿主 IP 出网。
3. guard 的 API 只覆盖控制器实际用到的操作。安全相关的参数一律在 guard 里写死，控制器只能传业务参数。
4. 模型请求的数据路径不经过 guard。guard 重启或故障时，已有连接不断，只是暂时不能做配置变更。
5. 顺带把现在每 3 秒全量扫描一次的网桥放行规则改成事件驱动（现常驻约 23% 单核）。

不在范围内：

- 核心与控制器之间的协议（CONTRACTS §49、§53）、Worker 协议、共享网关的 Xray 配置格式，都不改。
- 控制器被攻破时，它依然能读写账号数据、代理凭证，并决定每个账号走代理还是直连。这些本来就是控制器的职责，guard 不负责阻止。guard 保护的是宿主机和其他服务。

## 2. 现状分析

### 2.1 控制器现在的权限（ovh 实测）

| 项 | 现状 | 来源 |
|---|---|---|
| 用户 | root（uid 0），Docker 默认的 14 项能力 | `runtime.go:156` 的 `docker run` 未加限制 |
| 网络 | `--network host` | 同上；自升级 `upgrade.py:150` 照抄 |
| 挂载 | `/var/run/docker.sock`（读写）、`/opt/ccgateway-runtime`（读写） | 同上 |
| 自升级辅助容器 | host 网络 + `docker.sock` + 环境文件所在目录 **`/opt` 整个读写** | `runtime_admin.py:66-71` |
| 资源限制 | 无内存、无进程数上限 | — |

`docker.sock` 本身就等于宿主机 root：任何能调用它的进程都可以起一个特权容器，或者把宿主机的 `/` 挂进容器。

### 2.2 控制器的 Docker 调用清单

逐个文件统计生产代码中的调用点，测试和手工脚本不计，共约 110 处。

| 模块 | 用到的 Docker 操作 | 用途 |
|---|---|---|
| `manager.py` | `containers.get/list/create/run`、`networks.get/list/create`、`volumes.get/create`、`images.get/pull`、`exec_run`、`stop/remove`、`network.disconnect`，以及 `create_endpoint_config` 指定 IP | 账号容器、内部网和数据卷的整个生命周期；一次性辅助容器 `oneshot`（准备数据卷、校验配额、装防火墙）；就绪检查；删除 |
| `shared_egress.py` | `containers.get/create`、`start`、`exec_run`（`xray api`、`ip`、`nft`、`ss`）、`networks.get`、`net.connect/disconnect` | 共享网关的创建、挂接账号网络、下发路由和防火墙 |
| `dockerfs.py` | `put_archive/get_archive`、`exec_run(user=0)`（`sha256sum`、`chmod`、`stat`、`mv`、`rm`）、`top`、`containers.create`（不启动，用来读镜像里的文件） | 原地替换 Worker 和 CLI 文件 |
| `runtime_updates.py`、`worker_update.py` | 同上，另有 `restart`、`exec_run`（`node -e` 健康检查和身份校验） | Worker 和 CLI 成对激活、原地更新 |
| `cli_profiles.py` | `oneshot`：断网、root、去掉全部能力，跑 `node -e PROBE` | 校验镜像内置的 CLI |
| `images.py` | `images.load`（最大 4 GiB） | 控制面板上传镜像 |
| `cleanup.py` | `containers/networks/volumes.list` | 孤儿资源盘点 |
| `runtime_admin.py` | `images.get/pull`、`containers.get/run`（自升级辅助容器） | 目标镜像、自升级 |
| `upgrade.py` | `containers.get/rename/stop/run/remove` | 自升级：替换控制器容器 |

### 2.3 控制器对 host 网络的依赖

改用普通网络之前，下面几处依赖都要逐一解决：

1. **连 Worker：** 每个模型请求的隧道 `http_api.py:333` 和管理请求 `common.py:255` 都直接连 `app_ip:8787`。宿主机在每个账号内部网的网桥上都有地址（例如 `br-3787199ff48d 10.52.74.1/24`），所以 host 网络的控制器能连上。Worker 看到的来源是该网桥的 `.1`。
2. **分配网段：** `network.host_routes()` 读的是 `/proc/net/route`，换了网络命名空间后只能看到容器自己的路由，分配网段时会和宿主机路由冲突。
3. **监听地址：** `manager.py:1065` 只监听 `127.0.0.1`；改成端口映射后必须监听容器内的地址。
4. **核心和 Caddy 的入口：** Caddy（host 网络）通过 `127.0.0.1:8787` 访问控制器，旧的 SSH 模式经 SSH 转发到 `127.0.0.1:8787`。端口映射成 `127.0.0.1:8787` 后两条路径都不受影响。
5. **DNS：** `network.proxy_outbound()` 和 `Manager.proxy_moved()` 要解析代理域名，控制器需要能做 DNS 查询。
6. **自升级健康检查：** `upgrade.py:70` 检查的是 `127.0.0.1:<port>/health`。

### 2.4 现在就存在的风险：挂进容器的宿主文件放在控制器可写的目录里

宿主机路径挂进容器（bind mount）时，dockerd 在**每次启动容器时**以 root 身份解析源路径，并跟随符号链接。现在所有这类源路径都在控制器可写的 `/opt/ccgateway-runtime` 下：

| 源路径 | 挂进哪里 | 来源 |
|---|---|---|
| `/opt/ccgateway-runtime/<key>/resolv.conf` | 每个账号容器的 `/etc/resolv.conf`（只读） | `manager.py:664` |
| `/opt/ccgateway-runtime/<key>/app.nft` | 防火墙辅助容器 | `manager.py:352` |
| `/opt/ccgateway-runtime/shared-egress/` | 共享网关的 `/config`（只读） | `shared_egress.py:188` |

**攻击方式：** 控制器把 `21/resolv.conf` 换成指向 `/root/.ssh/id_ed25519` 或 `/etc/shadow` 的符号链接，然后重启 21 号容器（原地更新 Worker 时本来就会重启）。宿主机上的这个文件就会被挂进账号容器，控制器再在容器里执行命令把它读出来。

所以只拿掉 `docker.sock` 还不够，挂载源必须放到控制器写不到的地方（见 §4）。

另有一点：`shared-egress/state.json` 里有所有账号的代理凭证，现在共享网关也能读到它（随整个目录挂进去）。网关其实只需要读 `boot.json`、`boot.nft`、`dns.json`、`active.nft`、`operation.json`（见 `xray-egress/service.py` 和 `shared_egress.py:150`）。

### 2.5 现有 bridge guard

`next/deploy/gateway/ovh/ccgateway-bridge-guard.py`：

- systemd 服务，以 root 运行。
- 每 3 秒执行一轮 `docker ps/inspect`、`nsenter` 和 `iptables-restore`，生成 `CCG-PROXY-BRIDGE` 链。
- 读控制器的 `state.json` 拿 `app_ip` 和 `gateway_ip`。

新 guard 会吸收它，并改为不读控制器的状态。

### 2.6 ovh 上已核对的事实（2026-11-01，只读）

| 事实 | 对设计的影响 |
|---|---|
| Docker 29.5.2，iptables 1.8.11（nf_tables），`FORWARD` 先跳 `DOCKER-USER` 再跳 `DOCKER-FORWARD` | 在 `DOCKER-USER` 里放行的流量不会再被 Docker 的隔离规则拦下（现有 bridge guard 就是这么工作的） |
| raw 表 `PREROUTING` 有 `-d <容器IP> ! -i <网桥> -j DROP`，只针对 NAT 模式网络里的容器；账号内部网的地址（如 `10.52.74.x`）没有这类规则 | 控制器可以经路由访问账号容器 |
| NAT 模式网络自带 `POSTROUTING -s <子网> ! -o <网桥> -j MASQUERADE` | 控制器发往账号网桥的连接会自动改成该网桥的 `.1` 地址，Worker 看到的来源与现在完全一致，回包走本网段直达，不经共享网关 |
| 宿主机 Python 3.13.5，没有安装 docker-py | guard 只用标准库，直接调 Docker Engine API |
| clicodeplus 上没有控制器和任何 `ccg-` 容器 | guard 只部署到 ovh |
| `/opt/ccgateway-runtime` 归 root、权限 0700；目录结构见 §4.1 | 迁移需要搬动文件 |

## 3. 目标拓扑

```text
               宿主机（host 网络命名空间）
  ┌───────────────────────────────────────────────────────────────┐
  │ Caddy ──127.0.0.1:8787(端口映射)──┐                            │
  │                                   ▼                            │
  │  ccg-control 网桥 ccg-control0  172.29.255.1/29                 │
  │    ├─ guard 监听 172.29.255.1:8790（systemd，root，持有 docker.sock）
  │    └─ ccg-controller 172.29.255.2:8787（非 host 网络，无 docker.sock）
  │                                                                │
  │  控制器 ──(DOCKER-USER 放行 + 自动 MASQUERADE)──► ccg-<key>-net 上的 app_ip:8787
  │  共享网关 ccg-shared-egress ──── 各账号内部网 + 自己的 uplink 网
  └───────────────────────────────────────────────────────────────┘
```

| 通信 | 走法 |
|---|---|
| 核心 → 控制器 | 不变：Caddy 或 SSH 转发到 `127.0.0.1:8787`，再经端口映射进控制器 |
| 控制器 → Worker | 内核转发：`ccg-control0` → `ccg-<key>-net` 的网桥，只放行到 `app_ip` 的 TCP 8787 |
| 控制器 → guard | `172.29.255.1:8790`，HTTP，带令牌 |
| 控制器 → 外网 | 只放行 DNS（UDP/TCP 53） |
| 账号容器、共享网关 | 不变 |

`ccg-control` 的子网写在 guard 配置里，默认 `172.29.255.0/29`，部署前要核对它没有被占用。它是普通的 NAT 模式网桥，不是内部网：控制器需要 DNS，内部网没有默认路由。除了 DNS 之外的外网访问由 guard 的规则拦掉。

## 4. 目录与所有权

### 4.1 迁移前（现状）

```text
/opt/ccgateway-runtime/            root 0700，整个目录挂进控制器（读写）
  .lock  runtime.json  uploads/  backups/
  <key>/state.json  egress-desired.json  worker-backups/ ...   ← 控制器的数据
  <key>/resolv.conf  <key>/app.nft                             ← 挂进容器的源文件
  shared-egress/state.json                                     ← 控制器的数据（含代理凭证）
  shared-egress/{boot.json,boot.nft,dns.json,active.nft,operation.json}  ← 网关的配置
/opt/ccgateway-runtime.env         核心写的环境文件
```

### 4.2 迁移后

```text
/opt/ccgateway-runtime/            guard 所有，控制器看不到
  <key>/resolv.conf                guard 写，挂进账号容器
  <key>/app.nft                    guard 写，挂进防火墙辅助容器
  shared-egress/{boot.json,boot.nft,dns.json,active.nft,operation.json}  guard 写，挂进网关
/opt/ccgateway-controller/         控制器数据根，在容器里挂为 /data（读写）
  .lock  runtime.json  uploads/  backups/
  <key>/state.json  egress-desired.json  worker-backups/ ...
  shared-egress-state.json         原 shared-egress/state.json
/opt/ccgateway-runtime.env         仍由核心写；guard 只改 CCG_CONTROLLER_IMAGE 一行
/etc/ccgateway-guard/config.json   guard 配置（root 0600）
/etc/ccgateway-guard/<实例>.token   控制器令牌（root 0600）
/var/lib/ccgateway-guard/          guard 自己的临时文件（导入镜像暂存、一次性任务）
```

要点：

- 现有的账号容器和共享网关**都不用重建**：它们的挂载源路径不变，只是这些路径的归属换成了 guard。
- 控制器的数据换到 `/opt/ccgateway-controller`，它再也看不到任何挂载源，§2.4 的攻击就不成立了。
- 网关不再能读到 `state.json`（代理凭证），因为它已经移出 `shared-egress/`。
- guard 每次写挂载源都用 `O_NOFOLLOW`，经目录文件描述符逐级打开（`openat`）。每次启动或重启容器之前，guard 都会复核这些源路径：不是符号链接、是普通文件或目录、属于 root。

## 5. guard 的网络与防火墙

guard 用三条自己的链，都用 `iptables-restore --noflush` 整链替换，不碰 Docker 和其他服务的规则：

| 链 | 挂在哪里 | 内容 |
|---|---|---|
| `CCG-PROXY-BRIDGE` | `DOCKER-USER` | 原有的账号 → 共享网关 veth 放行，逻辑不变；改为从 Docker 查询结果取地址，不读控制器状态 |
| `CCG-CONTROL-FWD` | `DOCKER-USER` | 见下 |
| `CCG-CONTROL-IN` | `INPUT`（只匹配 `-i ccg-control0`） | 见下 |

```text
# CCG-CONTROL-FWD：控制器 → 每个就绪账号的 Worker，以及回包
-A CCG-CONTROL-FWD -i ccg-control0 -s 172.29.255.2 -o <账号网桥> -d <app_ip> -p tcp --dport 8787 -j ACCEPT
-A CCG-CONTROL-FWD -i <账号网桥> -s <app_ip> -o ccg-control0 -d 172.29.255.2 -p tcp --sport 8787 \
   -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
# 控制器只能做 DNS 查询，其余外联一律丢弃
-A CCG-CONTROL-FWD -i ccg-control0 -s 172.29.255.2 -p udp --dport 53 -j ACCEPT
-A CCG-CONTROL-FWD -i ccg-control0 -s 172.29.255.2 -p tcp --dport 53 -j ACCEPT
-A CCG-CONTROL-FWD -o ccg-control0 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
-A CCG-CONTROL-FWD -i ccg-control0 -j DROP

# CCG-CONTROL-IN：从控制网进来、发给宿主机的流量，只允许控制器连 guard
-A CCG-CONTROL-IN -s 172.29.255.2 -d 172.29.255.1 -p tcp --dport 8790 -j ACCEPT
-A CCG-CONTROL-IN -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
-A CCG-CONTROL-IN -j DROP
```

几点说明：

- **为什么控制器只能连 guard：**
  - guard 只监听 `172.29.255.1`，不监听 `0.0.0.0` 或 `127.0.0.1`。
  - 宿主机进程从本机连这个地址时，入接口是 `lo`，根本不会进入只匹配 `ccg-control0` 的 `CCG-CONTROL-IN`，默认会被放行。为此 `INPUT` 里额外加一条：`-i lo -d 172.29.255.1 -p tcp --dport 8790 -j DROP`。guard 的命令行子命令在本机直接执行，不经过这个端口，所以不受影响。
  - 其他网桥上的容器发来的包，入接口不是 `ccg-control0`，同样到不了。
  - 最后还有令牌校验（§6.1）。
- **控制器能看到什么：**
  - 宿主机上只监听回环地址的服务（3130、8010、8795 等）它都连不到。
  - 监听 `0.0.0.0` 的公网端口，在 DNS 之外的外联被丢弃后也连不到。
  - 其他账号之外的容器也连不到。
- **规则什么时候更新：**
  - guard 订阅 Docker 事件（`/events`，只看带 ccg 标签的容器和网络的 start、die、connect、disconnect、destroy），收到后 200 ms 防抖，再按账号重算。
  - 另外每 60 秒全量校对一次。
  - guard 自己调用的 API（建容器、挂接网络等）完成后也会立即重算。
- **失败关闭：** 规则算不出来时，相关链只保留"控制器 → guard"一条，其余全部清空。这和现有 bridge guard 的语义一致：宁可断网，也不放宽。
- **guard 崩溃：** 已经写进内核的规则不会消失，现有连接不受影响。重启后先全量重算再开放 API。

## 6. guard API

### 6.1 通用约定

- 地址 `http://172.29.255.1:8790/v1/...`，HTTP/1.1。
- 鉴权：`Authorization: Bearer <令牌>`。
  - 令牌由 guard 生成，每个控制器实例一个，存放在 `/etc/ccgateway-guard/<实例>.token`。
  - guard 创建控制器容器时，以环境变量 `CCG_GUARD_TOKEN` 传进去。
  - 校验用常量时间比较。
  - 同时核对来源地址必须是该实例配置的控制器 IP。
- **实例：** guard 配置里列出各个控制器实例：名字、前缀、控制器 IP、端口、数据根、环境文件。生产只有 `ccg`。隔离测试时加一个实例，例如前缀 `ccg-gt`、IP `.3`，用自己的令牌。某个令牌只能操作它对应前缀的资源。现在 bridge guard 的 `--chain` 参数由此取代。
- **请求体：**
  - JSON 请求体不超过 1 MiB，未知字段一律 400。
  - 流式端点（导入镜像、写归档）单独限制大小。
- **名字：** 资源名字一律由 guard 拼出来，控制器只传账号号 `aid`（格式同 `common.KEY`）：
  - 账号容器 `<p>-<aid>-app`，内部网 `<p>-<aid>-net`，数据卷 `<p>-<aid>-data`。
  - 共享网关 `<p>-shared-egress`，网关的外联网 `<p>-d0000000000000000-xray-uplink`（沿用现名）。
  - 一次性任务 `<p>-job-<aid>-<随机>`。
- **错误：** `{"error": code, "message": 简短原因}`。

  | 状态码 | code | 含义 |
  |---|---|---|
  | 400 | `invalid_request` | 请求本身不合法 |
  | 403 | `forbidden` | 违反策略 |
  | 404 | `not_found` | 资源不存在 |
  | 409 | `conflict` | 同名资源属于别人，或资源仍被占用 |
  | 502 | `docker_error` | Docker 调用失败 |
  | 503 | `busy` | guard 暂时无法处理 |

- **查询返回的形状：** 查询类接口返回 Docker inspect 的**白名单子集**，键名与 Docker 一致：
  - `Id`、`Name`、`Created`、`Image`、`Path`、`Args`
  - `State.{Status,StartedAt}`
  - `Config.{Image,User,Labels,Env}`
  - `Mounts[].{Type,Name,Source,Destination,RW}`
  - `NetworkSettings.Networks.<name>.{NetworkID,IPAddress}`
  - `HostConfig.NetworkMode`

  这样控制器里读 `.attrs[...]` 的代码基本不用改。
- **日志：** guard 不记录请求体、环境变量的值、令牌和命令输出。每个请求只记一行：实例、方法、路径模板、结果码、耗时。

### 6.2 端点

**系统**

| 方法与路径 | 请求 | 返回与说明 |
|---|---|---|
| `GET /v1/health` | — | `{version, prefix, features}` |
| `GET /v1/subnets` | — | 宿主机路由（guard 读 host 的 `/proc/net/route`）以及所有 Docker 网络的 IPv4 子网和标签，替代控制器里的 `host_routes()` 和 `docker_ipv4_subnets()` |
| `GET /v1/inventory` | — | 本前缀下所有带 ccg 标签的容器、网络和数据卷（白名单子集），供 `cleanup.py` 用 |

**镜像**

| 方法与路径 | 请求 | 规则 |
|---|---|---|
| `GET /v1/images/inspect?ref=` | — | `{Id, RepoTags, Config:{Labels, Env}}` |
| `POST /v1/images/pull` | `{ref}` | 带 `@sha256:` 摘要的引用不限仓库（拉取不会改动任何标签）。只带标签的引用，仓库必须在 `pull_repositories` 白名单里，默认 `ghcr.io/sub2api-devs/ccgateway-*` |
| `POST /v1/images/load` | 请求体为 tar 流（不超过 4 GiB） | guard 先把归档落盘到 `/var/lib/ccgateway-guard/loads/`，解析 `manifest.json` 和 `index.json`，复用 `images.archive_tags` 的逻辑。**归档里的每个标签都必须在 `load_repositories` 白名单里**，默认 `ccgateway-*`、`ghcr.io/sub2api-devs/ccgateway-*`；读不出清单的归档直接拒绝。返回 `[{id, tags}]` |
| `GET /v1/images/file?ref=&path=&limit=` | — | 镜像里单个普通文件的原始内容（`limit` 不超过 512 MiB）。guard 自己建一个不启动、断网的临时容器读取，读完删除 |

导入白名单是这次新发现的必要限制：`docker load` 和按标签拉取都会**改写已有标签**。如果控制器导入一个打着 `caddy:latest` 或 `postgres:16` 标签的归档，宿主机上那个服务下次重启就会跑攻击者的镜像。

**账号：查询、网络与数据卷**

| 方法与路径 | 请求 | 规则 |
|---|---|---|
| `GET /v1/accounts/{aid}` | — | 一次返回：`app`（容器或 null）、`others`（该账号其余容器：旧 egress、手工迁移留下的 rollback 副本）、`network`（含已接入的容器）、`uplink`（旧版遗留）、`volume`、`volume_users`、`gateway_attached`。取代 `owned`、`owned_resource`、`account_containers`，以及 `_deletion_plan` 里的查询 |
| `PUT /v1/accounts/{aid}/network` | `{subnet, gateway, policy}` | 建 `<p>-<aid>-net`：bridge 驱动，**一定是内部网**，关闭 IPv6，带账号标签，`policy` 写入 `NETWORK_LABEL`。子网必须在 RFC1918 范围内、前缀长度至少 24（与 `allocate_subnet` 的结果一致）、不与现有网络或宿主机路由重叠。已存在则 409 |
| `DELETE /v1/accounts/{aid}/network?role=net\|uplink` | — | 先强制断开共享网关；网上若还有不属于本账号、也不是网关的容器，返回 409 |
| `PUT /v1/accounts/{aid}/volume` | `{size_bytes, allow_unbounded}` | 已存在就原样返回。不存在时建 `local` 卷，带 `size` 选项和配额标签；存储不支持配额且 `allow_unbounded` 为真时改建无上限卷，否则 503 `disk_quota_unavailable` |
| `DELETE /v1/accounts/{aid}/volume` | — | 卷若被本账号以外的容器使用，返回 409 |

**账号：容器**

| 方法与路径 | 请求 | guard 写死的部分 |
|---|---|---|
| `PUT /v1/accounts/{aid}/app` | `{image, ipv4, env, labels:{auth, image}, memory_bytes?, nano_cpus?}` | 见下表 |
| `POST /v1/accounts/{aid}/app/start\|stop\|restart` | `{timeout?}` | 启动和重启前先复核挂载源（§4.2） |
| `DELETE /v1/accounts/{aid}/containers/{suffix}` | — | `suffix` 必须匹配 `app\|egress(-[A-Za-z0-9_.-]+)?`（即 `ACCOUNT_CONTAINER_ROLE`），容器的账号标签必须等于 `aid` |
| `POST /v1/accounts/{aid}/app/exec` | `{argv, user: ""\|"0"\|"1000"}` | 只能在 `<p>-<aid>-app` 里执行；输出不超过 16 MiB。容器本身已经没有任何能力，命令内容不限 |
| `GET /v1/accounts/{aid}/app/archive?path=` | — | 返回 tar 流（替代 `get_archive`） |
| `PUT /v1/accounts/{aid}/app/archive?path=` | 请求体为 tar 流（不超过 600 MiB） | 替代 `put_archive`；Docker 在容器自己的根文件系统里解包，归档里的链接跳不出容器 |
| `GET /v1/accounts/{aid}/app/top` | — | `{Titles, Processes}` |
| `PUT /v1/accounts/{aid}/resolv` | `{nameserver}` | 地址必须在该账号的子网内；guard 原地重写 `<aid>/resolv.conf`，保持 inode 不变（与 `SharedEgress.resolv` 现在的做法一致） |
| `PUT /v1/accounts/{aid}/firewall` | `{rules, default_gateway}` | guard 把规则写进 `<aid>/app.nft`（不超过 64 KiB），再用网关镜像起一次性辅助容器：加入 `container:<app id>` 的网络命名空间，只给 `NET_ADMIN`，只读挂载 `app.nft`，执行固定脚本 `NFT_REPLACE` 加 `ip route replace default via <default_gateway>`。`default_gateway` 必须在该账号子网内 |
| `POST /v1/accounts/{aid}/jobs` | `{image, entrypoint, argv, user: "0"\|"1000:1000", volume: "none"\|"ro"\|"rw", caps: []}` | 断网、去掉全部能力、`no-new-privileges`、进程数 64、内存 512 MiB、超时 120 s。`caps` 只能从 `CHOWN`、`DAC_OVERRIDE`、`FOWNER` 中选，且只在 `volume` 为 `rw` 时允许（准备数据卷要用）。只能挂本账号的数据卷，挂在 `/work`。返回 `{exit_code, stdout}`，stdout 不超过 64 KiB。容器无论成败都由 guard 删除 |

`PUT /v1/accounts/{aid}/app` 时 guard 写死的参数（对应现在的 `manager.common()` 和 `_create_app`）：

| 参数 | 值 |
|---|---|
| 名字和标签 | `<p>-<aid>-app`；账号标签由 guard 加，控制器只能传 `auth`、`image` 两个标签 |
| 用户 | `1000:1000` |
| 能力与安全 | 去掉全部能力，`no-new-privileges`，`init`，不允许特权、设备、宿主命名空间和 sysctl |
| 网络 | 只接 `<p>-<aid>-net`，`ipv4` 必须在该子网内、不是 `.0`、`.1`、广播地址，也不和网关冲突 |
| 挂载 | 只有两个：卷 `<p>-<aid>-data` → `/work`（读写），`/opt/ccgateway-runtime/<aid>/resolv.conf` → `/etc/resolv.conf`（只读） |
| 资源 | 内存默认 1 GiB、上限 4 GiB；CPU 默认 2、上限 4；进程数 256 |
| 日志 | json-file，20 MiB × 3 |
| 环境变量 | 不超过 128 个，变量名匹配 `[A-Za-z_][A-Za-z0-9_]*`，总长不超过 64 KiB |
| 镜像 | 本地必须已有 |

**共享网关**

| 方法与路径 | 请求 | 规则 |
|---|---|---|
| `GET /v1/gateway` | — | 网关容器或 null；归属标签不等于本前缀时返回 409 |
| `PUT /v1/gateway` | `{image, uplink:{subnet, gateway}}` | uplink 网不存在就先建：NAT 模式 bridge，非内部网。网关参数照搬 `SharedEgress.create`：`NET_ADMIN` 和 `NET_BIND_SERVICE`、两个固定 sysctl、`/opt/ccgateway-runtime/shared-egress` → `/config`（只读）、384 MiB、2 CPU、`unless-stopped`。镜像必须带 `io.sup2api.ccgateway.shared-egress=1` 标签 |
| `POST /v1/gateway/start` | — | — |
| `POST /v1/gateway/exec` | `{argv}` | 输出不超过 16 MiB。网关的路由和防火墙本来就由控制器生成，在网关里执行命令不会多出权限 |
| `PUT /v1/gateway/networks/{aid}` | `{ipv4}` | 把网关接入 `<p>-<aid>-net`，地址必须在该子网内 |
| `DELETE /v1/gateway/networks/{aid}` | — | 断开 |
| `PUT /v1/gateway/files/{name}` | 原始内容（不超过 4 MiB） | `name` 只能是 `boot.json`、`boot.nft`、`dns.json`、`active.nft`、`operation.json`；先写临时文件再改名（挂载的是目录，网关能看到新文件） |

**控制器自身**

| 方法与路径 | 请求 | 规则 |
|---|---|---|
| `POST /v1/controller/upgrade` | `{image}` | 返回 202，在后台执行，逻辑来自 `upgrade.py`：改名为 prev、停止、用写死的参数启动、等健康、失败回滚。镜像必须带新标签 `io.sup2api.ccgateway.guard-api=1`，旧的、需要 `docker.sock` 的控制器镜像一律拒绝 |
| `GET /v1/controller/upgrade` | — | `{state: idle\|running\|done\|failed, result, rollback}` |

控制器容器的参数全部由 guard 写死：

```text
name=<实例名>  restart=unless-stopped
network=ccg-control  ipv4=<实例 IP>  publish=127.0.0.1:<port>:<port>/tcp
cap_drop=ALL  security_opt=no-new-privileges  read_only=true  tmpfs=/tmp:size=64m
mem=1g  pids=512  log=json-file 20m×3
mounts: /opt/ccgateway-controller → /data（读写），仅此一个
env: 环境文件内容 + CCG_RUNTIME_ROOT=/data + CCG_CONTROLLER_BIND=0.0.0.0
     + CCG_GUARD_URL=http://172.29.255.1:8790 + CCG_GUARD_TOKEN=<令牌>
```

核心的 `inspectScript` 读的是控制器容器 `Config.Env` 里的 `CCG_APP_IMAGE` 和 `CCG_EGRESS_IMAGE`。guard 原样带上环境文件的内容，所以这部分不用改。

### 6.3 guard 保证的不变量

| 编号 | 不变量 | 怎么做到 |
|---|---|---|
| I1 | 账号容器只在自己的内部网 | 建容器时网络写死；没有任何"把账号容器接到别的网络"的端点 |
| I2 | 只有共享网关能接入非内部网（它的 uplink），网关进入账号网只能通过 `gateway/networks` | 同上 |
| I3 | guard 建的容器不会有特权、设备、宿主命名空间、`docker.sock`，或职责表之外的能力 | 所有容器的创建参数只在 `policy.py` 里拼装（§7.2），控制器只能填空 |
| I4 | 挂载源都在 guard 所有的目录，启动和重启前复核 | §4.2 |
| I5 | 只碰本前缀、带 ccg 标签的资源；同名而属于别人的资源返回 409 | 每个端点先查询并核对标签 |
| I6 | 镜像标签只会在白名单仓库内变动 | 拉取和导入的规则（§6.2） |
| I7 | 控制器容器只由 guard 创建 | 参数写死，核心安装脚本也改为调用 guard（§9） |
| I8 | guard 只接受控制器的连接 | 监听地址、防火墙、令牌加来源地址，三层同时生效 |
| I9 | 网桥放行规则失败关闭 | §5 |
| I10 | 日志里没有敏感内容 | §6.1 |

## 7. guard 的实现（代码说明）

源码放在 `next/plugins/ccgateway/companions/guard/`，与控制器同处 ccgateway 插件目录，接口契约一起维护，但**不进插件包**：guard 是 root 服务，只能手工部署，否则核心就能通过插件包给宿主机推送 root 代码。

guard 只用 Python 3 标准库（ovh 是 3.13，没有 docker-py），测试方式与控制器相同。

```text
companions/guard/
  ccgateway_guard/
    dockerapi.py   经 unix socket 调 Docker Engine API 的最小客户端
    policy.py      名字、正则、白名单，以及所有容器、网络、数据卷创建参数的拼装（纯函数）
    files.py       guard 所有文件的安全写入和挂载源复核
    api.py         HTTP 服务：鉴权、路由、请求体限制、错误映射
    firewall.py    三条链的规则计算与应用（含原 bridge guard 的逻辑）
    watch.py       Docker 事件订阅、防抖、60 秒全量校对
    controller.py  控制器的安装、升级、接管（adopt）和释放（release）
    __main__.py    命令行：serve / install-controller / controller-finish / controller-rollback /
                   adopt-controller / release-controller / print-rules
  ccgateway-guard.service
  config.example.json
  test_*.py
```

### 7.1 `dockerapi.py`

用 `http.client.HTTPConnection` 的子类连 `/var/run/docker.sock`：

```python
class UnixConnection(http.client.HTTPConnection):
    def __init__(self, path, timeout):
        super().__init__('localhost', timeout=timeout)
        self.path = path

    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.settimeout(self.timeout)
        self.sock.connect(self.path)
```

只实现要用到的接口：

- `containers/{id}/json`、`create`、`start`、`stop`、`restart`、`DELETE`、`top`、`archive`（GET/PUT）
- `exec`：create 加 start，`Detach=false`、`Tty=false`，按 Docker 的 8 字节帧头拆分 stdout 和 stderr，最后用 `exec/{id}/json` 取退出码
- `networks` 的 create、connect、disconnect、DELETE
- `volumes` 的 create、DELETE
- `images/create`（拉取）、`images/load`、`images/{ref}/json`
- `events`（流式）

拉取和导入的响应是逐行 JSON，要读到结束并检查里面的 `error` 字段。

### 7.2 `policy.py`：全部安全参数集中在这里

每种容器一个纯函数，输出 Docker create 请求体。测试按函数断言完整的 `HostConfig`，改了任何一项测试都会失败。

```python
BASE_HOST = {'CapDrop': ['ALL'], 'SecurityOpt': ['no-new-privileges:true'], 'Init': True,
             'Privileged': False, 'ReadonlyRootfs': False,
             'LogConfig': {'Type': 'json-file', 'Config': {'max-size': '20m', 'max-file': '3'}}}

def app_spec(inst, aid, req, net):
    host = dict(BASE_HOST, Memory=bounded(req.get('memory_bytes'), GIB, 4 * GIB),
                NanoCpus=bounded(req.get('nano_cpus'), 2 * CPU, 4 * CPU), PidsLimit=256,
                NetworkMode=net.name,
                Mounts=[{'Type': 'volume', 'Source': inst.name(aid, 'data'), 'Target': '/work'},
                        {'Type': 'bind', 'Source': inst.resolv(aid), 'Target': '/etc/resolv.conf',
                         'ReadOnly': True}])
    return {'Image': req['image'], 'User': '1000:1000', 'Env': env_list(req['env']),
            'Labels': {LABEL: aid, AUTH_LABEL: label(req, 'auth'), IMAGE_LABEL: label(req, 'image')},
            'HostConfig': host,
            'NetworkingConfig': {'EndpointsConfig': {net.name: {'IPAMConfig': {'IPv4Address': in_subnet(req['ipv4'], net)}}}}}
```

同一个文件里还有：

- `job_spec`：一次性任务
- `firewall_helper_spec`：账号防火墙辅助容器
- `gateway_spec`：共享网关
- `controller_spec`：控制器
- `account_network_spec` 和 `uplink_network_spec`：两种网络
- `volume_spec`：数据卷

**校验函数：**
- `in_subnet`：地址必须在子网内
- `env_list`：校验变量名、数量和总长
- `bounded`：限定上下限
- 仓库白名单的匹配

**API 层的约束：** `api.py` 只能调用这些函数来创建资源，不允许自己拼请求体。代码审查时守住这一条，同时加一个测试：扫描 `api.py`，不允许出现 `HostConfig` 字面量。

### 7.3 `files.py`

- `write_owned(dirfd, name, data, mode)`：
  1. 用 `os.open(name, O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW, dir_fd=...)` 写临时文件。
  2. `fsync`。
  3. `os.replace(..., src_dir_fd=..., dst_dir_fd=...)` 改名。
  4. 目录 fd 从 `/opt/ccgateway-runtime` 开始，用 `O_DIRECTORY|O_NOFOLLOW` 逐级打开。
- `rewrite_in_place`：给已挂进容器的 `resolv.conf` 用。用 `O_WRONLY|O_NOFOLLOW` 打开，截断后写入，保持 inode 不变。
- `verify_sources(container)`：按 inspect 出来的 `Mounts` 逐个 `lstat` 整条路径，要求：
  - 路径上没有符号链接，
  - 都属于 root，
  - 都在 `/opt/ccgateway-runtime` 下，
  - 文件型挂载是普通文件且 `st_nlink == 1`（防硬链接）。

  `start`、`restart` 之前都必须调用；不通过就返回 403，容器不动。

### 7.4 `api.py`

- `ThreadingHTTPServer` 绑定在 `<控制网网关>:8790`。接受连接后先核对来源 IP 属于某个实例，再核对令牌。
- 路由是固定的正则表，与控制器的 `http_api.py` 是同一种写法。
- 每个账号一把锁，避免同一账号的并发操作交错。控制器自己也有账号锁，这里是兜底。
- 流式端点（导入镜像、归档）分块转发，不整块读进内存。
- 端点处理函数基本是：校验，调用 `policy.*` 拼出参数，调用 `dockerapi`，按需通知 `firewall.recompute(aid)`，最后返回白名单子集。

### 7.5 `firewall.py` 和 `watch.py`

- `bridge_rules(aid)`：沿用现有的 `rules_for_account` 和 veth 查找逻辑。
  - 账号容器、网关、网络都改从 Docker 的查询结果取（app 在 `<p>-<aid>-net` 上的地址，网关在同一网络上的地址），不再读控制器的 `state.json`。
  - 账号容器没在运行就不放行，这包含了原来 `blocked` 的判断。
- `control_rules(aid)`：§5 里控制器 → Worker 的两条规则。
- `apply_all(rules)`：沿用现在的 `apply()`，对三条链分别做 `iptables-restore --noflush`，确保跳转规则存在。
- **veth 缓存：** 按 (容器 ID, StartedAt) 缓存 veth 名字。容器不重启就不再 `nsenter`，这正是现在 23% CPU 开销的主要来源。
- **按需应用：** 规则与上次相同就不调用 `iptables-restore`。

`watch.py` 订阅 `/events`，过滤条件为 `type=container,network` 且带 `label=io.sup2api.ccgateway.account` 或网关的归属标签。事件进队列，200 ms 合并后重算受影响的账号；网关的事件触发全部账号重算。断线后重新订阅，并立刻全量校对。

### 7.6 `controller.py`

| 命令或函数 | 作用 |
|---|---|
| `install(inst, image)` | 取代核心 `installScript` 里 `docker run` 那一段：改名为 prev、停止、用 `controller_spec` 启动，打印 `CCG_RESULT=started`；失败则恢复 prev |
| `finish`、`rollback` | 对应核心的 `finishScript` 和 `rollbackScript` |
| `upgrade(inst, image)` | `POST /v1/controller/upgrade` 的后台任务，移植自 `upgrade.py`；健康检查改为直接访问 `<控制器IP>:<port>/health` |
| `adopt(inst, image)` | 一次性迁移（§10 第 4 步）：停旧控制器 → 按 §4 搬文件 → 以 guard 方式启动新控制器 → 等健康；失败则把文件搬回去并恢复旧控制器 |
| `release(inst, image)` | `adopt` 的逆操作，用于回滚到 0.1.118：把文件搬回，按旧方式（host 网络 + `docker.sock`）启动指定镜像 |

环境文件只改 `CCG_CONTROLLER_IMAGE` 一行，原地写入并 `fsync`。这样 systemd 只需要放行这一个文件的写权限，不用放开整个 `/opt`。

### 7.7 systemd 单元

```ini
[Service]
User=root
ExecStart=/usr/bin/python3 -I -m ccgateway_guard serve
Environment=PYTHONPATH=/usr/local/lib/ccgateway-guard
Restart=always
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/opt/ccgateway-runtime /opt/ccgateway-controller /opt/ccgateway-runtime.env /var/lib/ccgateway-guard /run
CapabilityBoundingSet=CAP_NET_ADMIN CAP_NET_RAW CAP_SYS_ADMIN CAP_SYS_PTRACE CAP_DAC_OVERRIDE CAP_CHOWN CAP_FOWNER
RestrictAddressFamilies=AF_UNIX AF_INET AF_NETLINK
IPAddressDeny=any
IPAddressAllow=172.29.255.0/29
```

- `nsenter` 需要 `SYS_ADMIN` 和 `SYS_PTRACE`，`iptables` 需要 `NET_ADMIN` 和 `NET_RAW`。
- 访问 Docker 走 unix socket，不受 IP 过滤影响。
- guard 自己不需要访问外网：拉镜像是 dockerd 的事。

## 8. 控制器改动（代码说明）

### 8.1 新模块 `guard_client.py`

基于 `requests.Session`，设置 `trust_env=False`，基地址和令牌取自环境变量。对外提供的对象尽量保持 docker-py 的读取形状，`manager.py` 里的大量 `.attrs[...]`、`.status`、`.labels`、`.id`、`.name` 都不用改：

```python
class Inspected:
    """A guard inspect answer shaped like a docker-py object (read side only)."""
    def __init__(self, guard, kind, key, attrs):
        self.guard, self.kind, self.key, self.attrs = guard, kind, key, attrs

    id = property(lambda self: self.attrs['Id'])
    name = property(lambda self: self.attrs['Name'].lstrip('/'))
    status = property(lambda self: self.attrs['State']['Status'])
    labels = property(lambda self: self.attrs['Config'].get('Labels') or {})

    def reload(self):
        self.attrs = self.guard.inspect(self.kind, self.key).attrs

class AppContainer(Inspected):
    def exec_run(self, argv, user=''):
        out = self.guard.post(f'/v1/accounts/{self.key}/app/exec', {'argv': argv, 'user': user})
        return out['exit_code'], base64.b64decode(out['output'])

    def put_archive(self, path, data): ...
    def get_archive(self, path): ...
    def top(self, ps_args=None): ...
    def restart(self, timeout=10): ...
    def stop(self, timeout=10): ...
```

写操作不再模仿 docker-py，而是一个端点对应一个方法：`create_app`、`create_network`、`ensure_volume`、`run_job`、`install_firewall`、`write_resolv`、`create_gateway`、`connect_gateway`、`write_gateway_file`、`load_image`、`upgrade_controller`……

**错误映射：** guard 的 409 映射成现有的 `OwnershipMismatch` 或 `ResourceInUse`，503 `disk_quota_unavailable` 映射成 `DiskQuotaUnavailable`，404 映射成 `NotFound`（定义在 `common.py` 里，替代 `docker.errors.NotFound`）。现有的错误应答表 `common.ERRORS` 不变。

### 8.2 各模块怎么改

| 现在的调用（位置） | 改成 |
|---|---|
| `docker.from_env()`（`manager.py:171`、`:185`） | `GuardClient.from_env()`；`requirements.txt` 去掉 `docker` |
| `host_routes()`、`docker_ipv4_subnets()`（`network.py:25`、`manager.py:354`） | `guard.subnets()`；`host_routes` 从控制器删除 |
| `ensure_network`（`manager.py:362`） | 先在本地算出子网（`allocate_subnet` 不变），再 `guard.create_network(aid, subnet, policy)` |
| `_data_volume` 和 `account_volume`（`:374-409`） | `guard.ensure_volume(aid, size, allow_unbounded)`；配额标签的核对逻辑不变 |
| `oneshot` 加 `PREPARE_VOLUME`、`verify_disk_quota`、`cli_profiles.resolve_profile` | `guard.run_job(aid, image, entrypoint, argv, user, volume, caps)`；脚本仍由控制器定义，guard 只限定运行条件 |
| `helper` 加 `business_firewall`（`:344`、`:725`） | `guard.install_firewall(aid, rules, gateway_ip)`；`app.nft` 不再写入控制器目录 |
| `_record_runtime` 写 `resolv.conf`（`:623`）和 `SharedEgress.resolv`（`shared_egress.py:334`） | `guard.write_resolv(aid, nameserver)` |
| `_create_app`（`:653`） | `guard.create_app(aid, image, ipv4, env, labels)` |
| `owned`、`owned_resource`、`account_containers`、`_deletion_plan`、`_namespace_helpers` | `guard.account(aid)` 一次取回；残留的一次性容器由 guard 自己清理，`_namespace_helpers` 和 `_stale_helper` 删除 |
| `_remove_resources`、`drop_own_egress` | `guard.delete_container`、`delete_network`、`delete_volume` |
| `readiness`（每个请求都会调用） | 新增 `GET /v1/accounts/{aid}?fields=state`，一次调用返回账号容器和网关的状态、StartedAt。现在每个请求做两次 Docker inspect，改后变成一次 guard 调用，guard 内部再做两次 inspect |
| `SharedEgress.create`、`container`、`ensure`、`attach`、`disconnect`、`exec` | `guard.create_gateway`、`gateway()`、`start_gateway`、`connect_gateway`、`disconnect_gateway`、`gateway_exec` |
| `SharedEgress.api` 和 `sync` 写 `operation.json`、`active.nft`、`dns.json` | `guard.write_gateway_file(name, data)`；`SharedEgress.path` 改为 `<数据根>/shared-egress-state.json` |
| `dockerfs.*` | 签名不变，传入的容器换成 `AppContainer`；`image_container` 和 `read_file(temp, ...)` 改为 `guard.image_file(ref, path, limit)` |
| `Uploads._load`（`images.py:247`） | `guard.load_image(file)`，流式上传；guard 返回 403 时映射为 `UploadError(400, 'load_forbidden')` |
| `upgrade_controller`（`runtime_admin.py:51`） | 降级检查保留，然后 `guard.upgrade_controller(ref)`；`upgrade.py` 整个删除，逻辑移到 guard |
| `cleanup.inventory` | `guard.inventory()` |
| `main()`（`manager.py:1057`） | 监听地址取自 `CCG_CONTROLLER_BIND`（guard 模式下是 0.0.0.0）；缺少 `CCG_GUARD_URL` 或 `CCG_GUARD_TOKEN` 时直接退出并打印原因 |

### 8.3 控制器镜像

- `Dockerfile` 不再复制 `upgrade.py`。
- 新增标签 `io.sup2api.ccgateway.guard-api=1`。
- 去掉 docker 依赖。

**为什么不需要兼容旧方式：**
- 新控制器缺了 `CCG_GUARD_URL` 就会退出。
- 万一旧控制器用自己的 `upgrade.py`，按旧方式把它拉起来，健康检查会失败，`upgrade.py` 会自动恢复旧控制器。
- 所以控制器只需要实现 guard 一种后端。

### 8.4 测试

- **`FakeGuard`：** 在现有测试里 `FakeDocker` 的内存模型上，实现 guard 的端点语义，并且直接调用真实的 `policy.py`。控制器的测试替身由此换成 FakeGuard，现有 196 项测试的断言基本保留，只是断言对象从 Docker 调用变成 guard 调用。
- **guard 自己的测试：**
  - `policy.py` 每个函数都断言完整参数。
  - API 的拒绝路径逐条覆盖：未知字段、越界 IP、非白名单仓库、符号链接挂载源、错误前缀、错误令牌、错误来源地址。
  - 用伪造的事件流测 `firewall.py`，确认规则只在变化时才应用。
- **ovh 真机集成测试：** 用独立实例（前缀 `ccg-gt`、IP `.3`、单独令牌），把现有的 `shared_integration.py` 和 `shared_failure_test.py` 跑一遍，再加：
  - 控制器经路由连 Worker，Worker 看到的来源地址是网桥的 `.1`；
  - 控制器能解析代理域名（Docker 内置 DNS 经转发规则出网）；
  - 控制器访问宿主机 `127.0.0.1:3130` 失败；
  - 控制器访问外网 443 失败；
  - 宿主机进程访问 guard 端口失败。

## 9. 核心改动

`server/internal/ccgateway/runtime.go`：

- `installScript` 里启动控制器的那段改为：如果存在 `/usr/local/sbin/ccgateway-guard`，写好环境文件后执行 `ccgateway-guard install-controller --instance ccg --image "$CTL"`，由它输出 `CCG_RESULT`；否则仍走旧的 `docker run`。所以没装 guard 的宿主机行为不变。
- `finishScript` 和 `rollbackScript` 同样先判断 guard 是否存在。
- `inspectScript` 不变。

这一步属于核心发布。在核心更新之前，**不要在控制台上对 ovh 执行"重新安装控制器"**，否则会按旧方式建出带 `docker.sock` 的控制器。为防万一，guard 的全量校对一旦发现 `ccg-controller` 不是自己建的（缺少 guard 标签），会记录告警 `controller_unguarded`；它不会自动改动，由人处理。

## 10. 上线步骤

每一步动线上服务前都先征得用户同意。

1. **部署 guard（替换 bridge guard）：**
   1. 先用 `ccgateway-guard print-rules` 和现有 bridge guard 的输出对比，确认 `CCG-PROXY-BRIDGE` 的规则完全一致。
   2. 停掉旧服务 `ccgateway-bridge-guard`，启动 `ccgateway-guard serve`。这时 guard 会建好 `ccg-control` 网络和三条链，但还没有控制器接入，`CCG-CONTROL-FWD` 里只有 DNS 和丢弃规则。
   3. 账号网络不受影响，只是放行规则的维护者换了。
2. **发布核心：** 安装脚本能识别 guard（§9）。两个节点都发；clicodeplus 上没有 guard，行为不变。
3. **发布插件：** 新版控制器只支持 guard 模式。这一版的插件包在 ovh 上**不要走控制器自升级**（会失败后自动回滚，但没有必要），由第 4 步接管。
4. **接管：** `ccgateway-guard adopt-controller --instance ccg --image <新控制器 digest>`。
   - 停旧控制器，按 §4 搬文件，改目录归属，以 guard 方式启动新控制器，等健康。
   - 期间控制器不可用约 10–20 秒：新的模型请求会失败，进行中的隧道会断，与一次普通的控制器自升级相同。
   - 安排在低峰时段执行。
5. **验收：**
   - 新建账号、改代理、改网络池、阻断与恢复、原地更新 Worker、Worker 与 CLI 成对激活、上传镜像、清理孤儿、控制器再自升级一次。
   - 21 号和 51–59 号账号的真实请求返回 200。
   - 再按 §8.4 做一遍负面检查。
6. **记录：** 部署记录写进 `next/deploy/gateway/ovh/README.md`，接口写进 CONTRACTS 新一节。

**回滚：**
- `ccgateway-guard release-controller --instance ccg --image <0.1.118 控制器 digest>`：把文件搬回原位，按旧方式启动。
- 再停 guard、恢复旧的 bridge guard。
- 账号容器和网关全程不重建。

## 11. 风险与待定

| 项 | 说明 | 处理 |
|---|---|---|
| 请求路径多一跳 | 就绪检查从直连 Docker 改为经 guard | 合并成一次调用（§8.2）；上线前对比 `readiness` 的耗时，必要时 guard 按事件缓存容器状态 |
| guard 成为单点 | guard 停了以后不能建容器、改配置 | 数据路径不经过 guard，已建立的规则留在内核里，现有请求不受影响；systemd 自动重启 |
| `ccg-control` 子网冲突 | 默认 `172.29.255.0/29` | 部署前核对；也写在配置里可改 |
| 控制器仍以 root 运行 | 已经不再有宿主权限，只在自己的容器内是 root | 第二期改为非 root（数据根改归属 10001），本期不做 |
| 控制器被攻破后仍能把账号配置成直连 | 直连是业务功能 | 不在 guard 的职责内（§1） |
| 导入白名单可能挡住手工构建的镜像 | 例如本地构建的 `cc-max` 标签 | 白名单写在配置里，需要时加仓库名 |
| 一次性任务的镜像不限 | 断网、去掉能力、只挂本账号数据卷，影响仅限该账号 | 接受 |
| 现有 bridge guard 测试 | 7 项要迁到新模块 | 随第 1 步完成 |

## 12. 工作量估计

| 部分 | 估计 |
|---|---|
| guard（7 个模块、单元测试、systemd） | 约 1500 行代码，加上测试 |
| 控制器（`guard_client.py`、10 个模块改调用、FakeGuard、测试改写） | 改动约 1200 行 |
| 核心 | `runtime.go` 三个脚本，加测试 |
| 真机验证 | 隔离实例完整跑一遍，然后接管生产 |

建议的实施顺序：`policy.py` 加 `dockerapi.py` → guard 的 API 和测试 → `firewall.py` 和 `watch.py`（可以先单独替换 bridge guard，立刻拿到 CPU 收益）→ 控制器的 `guard_client.py` 与各模块改造 → `controller.py`（install、upgrade、adopt、release）→ 核心脚本 → 真机隔离测试 → 生产接管。
