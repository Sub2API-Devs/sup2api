# CCGateway 请求链路、隔离与原生工具映射（2026-10-16 讨论记录）

本文记录 2026-10-16 的一次代码梳理与讨论，用于跨机器同步。结论来自阅读代码和本机核对，**没有在 ovh 上实测**；标“推断”“未确认”的条目需要线上数据验证。没有修改任何代码。

## 1. 模型请求怎么到达 Worker（controller 模式）

模型请求不由 Controller 解析和转发。核心向 Controller 查询 Worker 的地址和 key，再请 Controller 打开一条字节隧道，然后由核心自己通过隧道向 Worker 发 HTTP/1.1 请求。

1. **网关选中账号**：`server/internal/gateway/dispatch.go:454-487`。上游 URL 为虚拟地址 `https://ccgateway.internal/v1/messages` 时，改用 `CCGateway.ModelClientFor(acc.ID, acc.ProxyID)`。
2. **改写并发送**：`server/internal/ccgateway/client.go:127` `forwardAttempt`。
   - 从缓存读取配置和账号期望的 revision（`requestConfig` / `requestDesired`，TTL 30 秒）。
   - 调用 `route()` 获取路由，再用 `openRoute()` 获取 client。
   - URL 改为 `http://<app_ip>:8787/v1/messages`。删除 `Authorization`，设置 `x-api-key: <worker key>`，加上 `X-CCGateway-Request-Policy`，删除 `X-CCG-Revision`。
   - 缓存的 revision 被拒（409）时，清缓存重试一次。收到 401 也清缓存，因为重建的 runtime 会换新的 Worker key。
3. **查询连接信息**（每个 revision 只查一次）：`direct.go:48` `fetchConnection`。
   - 请求 `GET /accounts/<key>/connection`，带 AdminKey 和 `X-CCG-Revision`。
   - Controller（`manager.py:862`）返回 `{app_ip, port: 8787, api_key, revision}`；revision 对不上时返回 409。
   - 核心校验：IP 在地址池内、私网 IPv4、端口 8787、revision 一致。
   - 结果按 runtime key 缓存为 `accountRoute`（`request_cache.go`），配置、账号或代理变更时经总线失效。
4. **开隧道**：`controller_tunnel.go:27` `dialTunnel`。
   - TLS 连接控制面板，可固定 CA，强制 HTTP/1.1。
   - 手写请求 `GET <base>/accounts/<key>/tunnel`，带 `Upgrade: ccg-tunnel`。收到 101 后，这条连接就是到 `app_ip:8787` 的原始 TCP。
   - `pooledTunnelClient` 中每条新连接都是一条新隧道。空闲连接保留 30 秒（短于 Worker 的 IdleTimeout 60 秒）供复用，连接数不在这里限制。
5. **Controller 侧**：`manager.py:1183` `handle_tunnel`。校验 Upgrade 头和 revision 后执行 `socket.create_connection((app_ip, 8787))`，两个线程双向拷贝字节，不检查、不记录内容，空闲超时 3700 秒。

其他模式由 `direct.go:96` `openAccountTransport` 处理：

| 模式 | 核心怎么到 `app_ip:8787` |
|---|---|
| `controller` | 上面的 ccg-tunnel |
| `ssh` | SSH direct-tcpip，每个请求一条连接，不放进 route 池 |
| `local` | 直接 HTTP |
| 未开 `AccountRuntimes` | `s.open()` 发给共享网关（旧路径） |

Controller 仍会自己做 HTTP 转发的部分（`manager.py:1379-1406`，基于 `requests.Session`）：

- `admin/*` 管理请求：用 admin_key 转发，超时 240 秒。
- `v1/messages` 旧中继：注释标为 legacy，用 api_key 转发，超时 3660 秒，逐块流式写回。注意 `CCGATEWAY-SINGLE-TURN.md` 中 #21 的真实客户端测试，走的正是 SSH 桥接到 Controller 的 `/accounts/21/v1/messages`，也就是这条路径。

`backend/internal/handler/admin/ccgateway_forward.go` 是旧 backend 的 SSH 反代实现，`next/` 不再使用。

## 2. Controller 的职责

请求路径上，Controller 只提供 `connection` 查询、字节隧道和 `admin/*` 转发。它的主要工作是用 Docker SDK 管理每个账号的运行时：

- **运行时创建与同步**：`PUT /accounts/<key>/config` 对应 `apply`，生成 revision。
- **网络**：每个账号一个私有网络，负责子网和地址分配。
- **出口**：sing-box 出口，以及共享出口 xray。
- **认证**：oauth / api_key，以及 `migrate-auth`。
- **停用和删除**：`block` / `delete`。
- **原地更新 Worker**（§53.7）：替换程序文件，带备份、等空闲、健康检查和失败回滚。
- **其他**：CLI 更新、镜像上传和 `docker load`、运行时镜像设置、自升级、`/health`。

分工是：核心决定"要什么"，Controller 在宿主机上把它落实成容器、网络和出口，并给核心提供一条到容器的通道。

## 3. Worker 进程模型

- 每个账号容器里有一个常驻的 Worker HTTP 服务，监听 `:8787`（`worker/cmd/worker/main.go`、`worker/internal/server/server.go`），IdleTimeout 1 分钟。
- 路由：`/v1/messages`（worker key）、`/admin/*`（admin key）、资源前缀、`/health`（`engine/runtime.go:133-141`）。
- 后台循环：每 10 分钟同步一次 CLI 工具目录，并检查是否自动更新 CLI；每分钟清理缓存和请求日志（`runtime.go:150-180`）。
- **Claude Code CLI 按请求启动**（`engine/runner.go:134`）：
  1. 先启动一个只监听 127.0.0.1 随机端口的 Mod 控制服务；
  2. `startCLI` 执行 CLI，通过 stream-json 通信；
  3. 一轮结束后等待进程退出。
- 每个 Worker 同时最多处理 4 个请求（`Slots`，`runtime.go:119`）。原地更新时，`worker_idle` 判断的就是容器里除 docker-init 和 worker 之外没有别的进程。

## 4. 要不要把 Worker 并入 Controller：不建议

能删掉的只有 connection 查询、隧道、worker key、原地更新这几百行。engine 有几百个文件，迁过去只是换个地方运行；Controller 还是 Python 写的。

会失去的东西：

- **每个账号的隔离**：独立的网络、出口、凭据、CLI 数据目录和会话历史。
- **安全边界**：CLI 的执行环境会和 `docker.sock`（等同宿主机 root）放在一起。
- **故障和升级的影响范围**：从单个账号扩大到全部账号。
- **环境一致性**：每个账号在上游看来是一台独立的机器。

更划算的简化（动手前先确认线上和代码里都没有调用方）：

- 删除 Controller 里 `v1/messages` 的旧中继。当前测试还在用它，需要先把测试改走隧道。
- 删除不再使用的模式分支，比如 `AccountRuntimes=false` 的共享网关，以及可能已不用的 ssh 模式。
- 删除旧 backend 代码。

## 5. 跨容器隔离：客户端能否通过地址遍历攻击其他容器

**第一层：客户端碰不到地址，也不能在容器里执行代码。**

- 上游地址是虚拟地址，真实地址由核心校验（`direct.go:88`）。
- Controller 路由用严格正则：key 只能是数字或 `d`+16 位十六进制，子路径是白名单，还要求 admin key（`manager.py:77`）。
- 工具执行默认拒绝（`engine/runner_session.go:466` 回复 `deny: "Tools are executed by the API client"`），由客户端执行。只有 WebSearch、结构化输出等少数内部情况放行。
- 每个容器的 Worker key 独立生成。

**第二层：假设容器已被攻破。**

| 层 | 做法 | 位置 |
|---|---|---|
| 网络拓扑 | 每个账号一个 internal bridge（`net`）加一个 `uplink`，不同账号不在同一个二层网络 | `manager.py:546-547` |
| app 防火墙 | output 默认 drop，只放行网关 DNS、`127.0.0.1:8787` 和公网 TCP；私网、回环、链路本地、组播地址全部 drop | `network.py:141` |
| app 权限 | uid 1000，`cap_drop=ALL`，`no-new-privileges`；规则由一次性 helper 容器加 `NET_ADMIN` 写入 | `manager.py:436`、`:453` |
| egress | `ip_forward=0`，forward 链 drop，只对本账号 app_ip 做 tproxy；直连模式 drop 私网目标，代理模式只放行固定的代理 IP:端口 | `network.py:117-136` |
| 共享 xray | 接入多个账号网络，但关闭转发；规则按网卡加源 IP 绑定；私网目标 drop；API 只监听 127.0.0.1 | `shared_egress.py:74-108` |
| 资源 | 内存 2g、CPU 2 核、最多 256 个进程 | `manager.py:589` |

**剩余风险：**

1. 直连模式放行所有公网 TCP，而**宿主机自己的公网 IP 不在黑名单里**。被攻破的容器可以绕回宿主机，访问监听在 `0.0.0.0` 上的服务。建议额外 drop 宿主机公网 IP，或确认宿主机防火墙只开放必要端口。
2. 代理位于本机或内网时，攻击者可以经代理到达代理所在的网络。这由管理员控制，客户端无法利用。
3. `app.start()` 到 helper 写入 nft 之间有一段很短的空窗。这期间 internal 网络和 Docker 隔离仍然生效，核心也要等 `_activate` 完成才会路由请求过来，属于理论风险。
4. 容器根文件系统可写。

验证方法：在线上一个账号容器里用 `nc` 测试能否连到另一个账号的 IP，以及宿主机公网 IP 的几个端口。

## 6. 原生工具为什么被映射成 `mcp__ccgateway__*`

现象：本机 Windows CLI 2.1.296 客户端走 ovh、只开 #21 时，以下工具被改名为 `mcp__ccgateway__<name>`：

- Agent、Bash、PowerShell、Monitor、GetTask、CronCreate、PushNotification
- ListMcpResourcesTool、ReadMcpResourceTool、ReadMcpResourceDirTool
- 桌面版会话里还有 Artifact、DesignSync

而 CronDelete、CronList、ScheduleWakeup、TaskStop 都是原生的。

**结论：与操作系统和版本号都无关。** 内置的 2.1.292 目录本身就是在 Windows 上抓取的（`catalog/claude-2.1.292.capture.json` 中 `os: windows`），里面同样没有 Monitor、GetTask、PushNotification。CLI 提供哪些工具、每个工具的定义，取决于版本、环境变量、按账号下发的远程开关（GrowthBook）、MCP 配置和宿主程序（桌面版）。

另外，按 `CCGATEWAY-SINGLE-TURN.md` 的记录，#21 今天更新后**内部 CLI 仍是 2.1.292**。所以客户端 2.1.296 和 Worker 的版本本来就不同。不过匹配只比较定义，不比较版本号。

### 判定规则（engine）

- **目录探测**：Worker 启动或 CLI 版本变化时，`cli_catalog_capture.go:224` 跑 7 个场景：sdk、named、teams、powershell、fixed-model、plan、search。
  - 每个场景只开一个开关，比如 teams 只设 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`，search 只设 `ENABLE_TOOL_SEARCH`。
  - 探测环境是空 HOME、假 API key、`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`、`--strict-mcp-config` 加空 MCP，因此**拿不到任何远程开关**。
- **内置目录**只有 2.1.288 和 2.1.292（`tool_matching.go:33`），其他版本依赖运行时快照（`cliSnapshot`）。
- **匹配**：工具名相同，且 `input_schema` 的 digest 完全一致（`sameToolSchema`，`tool_matching.go:77-91`）。
- **一个请求只选一个 profile**：选匹配数最多的那个（`tool_matching.go:57-69`）。只在其他 profile 里匹配上的工具都算不上原生。
- **改名**：没匹配上的工具由 `wireName` 改名为 `mcp__ccgateway__<name>`（`request.go:767`）。
- **启动后核对**：`verifyNativeWireTools` 再核对一次 CLI 实际提供的名字、描述和 schema。

### 逐个原因

| 工具 | 原因 | 状态 |
|---|---|---|
| Bash / PowerShell | 用户 `~/.claude/settings.json` 的 env 设置了 `BASH_DEFAULT_TIMEOUT_MS` 和 `BASH_MAX_TIMEOUT_MS`。客户端 `timeout` 描述为 "max 1800000"，目录里是 "max 600000"，`run_in_background` 的描述也不同 | 已核对 |
| CronCreate | 用户账号的开关 `tengu_kairos_cron_durable=false`，客户端的 CronCreate 没有 `durable` 字段；目录里的字段是 `cron, durable, prompt, recurring`。只有这一个工具受影响，所以 CronDelete 和 CronList 能匹配 | 已核对 |
| PushNotification | 用户账号的开关 `tengu_kairos_push_notifications=true`。探测环境没有开关，CLI 就不提供这个工具 | 已核对开关 |
| Monitor / GetTask | 两份内置目录里都没有。推测也是远程开关控制的，但没找到对应的开关名 | 推断 |
| ListMcpResources* / ReadMcpResource* | 只在配置了带资源的 MCP 服务器时出现。用户本机配置了 codegraph、serena 等，探测时 MCP 为空 | 已核对 |
| Artifact / DesignSync | 桌面版专属工具，无头 CLI 不提供 | 已核对 |
| Agent | 见下文 | 部分核对 |

**Agent**：用户贴出了客户端的完整定义。和 2.1.292 的 teams 变体（含 `name`、`mode`、`team_name`）相比，有两处差异：

- 客户端**没有 `run_in_background`**；
- `effort.description` 末尾多了一句 `Ignored for subagent_type: "fork": a fork runs at your own effort.`。

也就是说，客户端用的是**开启 fork 子代理的版本**，工具描述里也写了 `"fork" forks yourself` 和 `Subagents run in the background`。在本机的远程开关和环境变量里搜索 fork、subagent、background，没有找到对应项。

此外，用户的 env 同时开了 teams、tool search 和 powershell，而 profile 一次只开一个开关。即使目录里有 fork 版，Agent 也可能因 profile 选择而落空。`6f0253b01` 加了 search profile 之后，这种情况更容易出现。

用户贴出的 schema 是模型转述的，缺少顶层的 `$schema`。逐字节判断需要看 Worker 请求日志里客户端的原始 `tools`。

### 未确认 / 下一步

1. 读取线上 `GET /accounts/21/admin/cli/catalog`：确认 `installed_version`，以及 Agent、Bash、CronCreate 各有哪些变体，有没有 fork 版。
2. 打开请求日志，查看一次请求的 `effective-config.json`（`--tools` 和 env），确认选中的是哪个 profile。
3. 待回答：这些工具定义能否在官方 Agent SDK 里全部找到。
   - 已找到的包：全局 npm 包 `@anthropic-ai/claude-code` 2.1.296 里有 `sdk-tools.d.ts`，尚未打开查看；Agent SDK 有副本，路径为 `~/.ccgui/dependencies/claude-sdk/node_modules/@anthropic-ai/claude-agent-sdk` 和 `~/.codemoss/` 下的同名路径。
   - 初步判断：工具定义是 CLI 运行时按环境变量和开关生成的，SDK 里大概率只有输入类型，找不到所有变体的确切定义。

### 修复方向

工具被改名属于对客户端结构的偏差，按"尽量不改客户端结构"的原则应该修。宿主专属工具和 MCP 资源工具除外，它们本来就没有原生对应。

1. **环境变量类**（Bash 超时、teams、powershell、search，可能还有 fork）：从客户端的工具定义反推环境变量（`timeoutNeutral` 已经能识别超时数值），用相同的值启动 CLI，再由 `verifyNativeWireTools` 核对。至少也应该增加几个开关组合在一起的 profile。这一类最确定，改动集中在 `cli_catalog_capture.go` 和 `tool_matching.go`。
2. **账号开关类**：探测时把该账号自己的 GrowthBook 缓存带进探测用的 HOME。开关是按账号下发的，客户端账号和 #21 不同，所以这类差异无法保证一致，映射是预期行为。
3. **MCP 资源类**：保持映射。Worker 不应该加载客户端的 MCP。
