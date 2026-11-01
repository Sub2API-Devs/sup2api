# 03 guard（Go）设计：代管 Docker 的宿主机服务

日期：2026-11-01。作者：agent 团队成员 C。状态：设计稿，待用户确认后实施。

依据：

- `next/docs/CCGATEWAY-GUARD-DESIGN.md`（下称"总设计稿"），方向已获认可；
- 同目录 `01-controller-behavior-spec.md`（A，下称"行为规格"）、`02-controller-go-design.md`（B，下称"控制器设计"）、`04-migration-rollout.md`（D，下称"发布方案"）；
- 用户 2026-11-01 的决定：控制器和 guard 都用 Go；guard 代为执行 Docker 操作，控制器不再持有 `docker.sock`、不再用 host 网络；guard、控制器、共享 Xray 网关三者都用 docker compose 启动，不用 systemd；
- 现有代码：`next/deploy/gateway/ovh/ccgateway-bridge-guard.py` 及其 7 项测试，控制器 `manager.py`、`shared_egress.py`、`dockerfs.py`、`images.py`、`cli_profiles.py`、`runtime_admin.py`、`upgrade.py`，以及 `companions/xray-egress/`；
- ovh 事实：Docker 29.5.2；iptables 1.8.11（nf_tables）；`FORWARD → DOCKER-USER → DOCKER-FORWARD`；账号内部网没有 raw 表 DROP 规则；NAT 网络自带 MASQUERADE；宿主机 Debian 13。

本文不改任何代码。文中的 Go 签名是实现时的约束，字段名和 JSON 名是对 B 的接口承诺。

## 目录

1. 目标、边界、与总设计稿的差异
2. 模块位置与结构
3. HTTP API
4. policy 包：所有 Docker 创建参数
5. dockerapi 包
6. files 包
7. firewall 包
8. watch 包
9. controller 包与 compose 操作（含 compose.yml 完整草案）
10. 配置、令牌
11. 测试计划
12. 安全审查清单
13. 对 B、A、D 需求的逐条答复
14. 风险与工作量

---

## 1. 目标、边界、与总设计稿的差异

### 1.1 目标

1. **控制器降权。** 控制器被完全攻破时，攻击者拿不到宿主机 root，读不到宿主机上的任意文件，碰不到宿主机上的其他服务和其他容器。控制器能做的 Docker 操作，只有 guard API 列出的这些，而且所有安全参数都由 guard 写死。
2. **账号隔离不变。** 账号容器只在自己的内部网，只能经共享网关出网（总设计稿 I1、I2）。
3. **数据路径不经过 guard。** 模型请求是"核心 → 控制器 → Worker"，guard 只参与配置变更和就绪查询。guard 重启时，已有连接不断，内核里的防火墙规则也不变。
4. **网桥放行改为事件驱动。** 取代每 3 秒全量扫描一次的 bridge guard（常驻约 23% 单核），目标平均低于单核 2%。
5. **兼容回滚。** guard 建出的资源（名字、标签、挂载、参数）与 Python 0.1.118 建出的完全同形，回滚到 Python 后能原样认领（行为规格 §10、§13）。

### 1.2 边界

guard 负责：

- 代为执行控制器需要的 Docker 操作（容器、网络、数据卷、镜像、exec、归档）；
- 写和复核所有挂进容器的宿主文件（`resolv.conf`、`app.nft`、`shared-egress/` 下的网关配置）；
- 维护三条 iptables 链：`CCG-PROXY-BRIDGE`、`CCG-CONTROL-FWD`、`CCG-CONTROL-IN`；
- 控制器自升级（改 `.env` → `compose up` → 等健康 → 失败回滚）；
- 网关的 `ensure`（拉起）和 `recreate`（显式维护）。

guard 不负责：

- 控制器的业务决定：账号走代理还是直连、Xray 配置、nft 规则文本、CLI 版本选择。控制器被攻破后仍能决定这些，这本来就是控制器的职责（总设计稿 §1）。
- 数据搬迁（adopt/release）：由核心的 shell 脚本完成（发布方案 §2.6）。guard 在容器里，跨两个 bind mount 不能 `rename(2)`。
- 自身升级：guard 只能由管理员在宿主机上手工 `compose pull/up guard` 升级，插件流程和控制器都碰不到 guard 的镜像。
- 核心与控制器之间的协议、Worker 协议、Xray 配置格式：都不改。

### 1.3 部署形态（以本节为准）

| 项 | 值 |
|---|---|
| compose 项目 | `ccgateway`；文件 `/opt/ccgateway/compose.yml`、`/opt/ccgateway/.env`（root 0600，存三个镜像引用和 guard 令牌，绝不挂进控制器）。模板嵌在核心里，由安装脚本写入 |
| 网络 | `ccg-control`：外部网络，安装脚本预先创建，子网 `172.29.255.0/29`，网关 `.1`，网桥名 `ccg-control0`；网关 uplink：外部网络 `ccg-d0000000000000000-xray-uplink` |
| guard | Go 静态二进制，镜像里另有 `iptables`（nft）、`nsenter`、`ip`、docker CLI 和 compose 插件；`network_mode: host`、`pid: host`；`cap_drop: ALL`，只加回 `NET_ADMIN`、`SYS_ADMIN`、`SYS_PTRACE`（§9.6 逐项说明）；`no-new-privileges`；`read_only`；`restart: unless-stopped`；监听 `172.29.255.1:8790`（`IP_FREEBIND`，网桥晚于 guard 出现也能绑定） |
| 控制器 | `ccg-controller`，网络 `ccg-control` 的 `.2`，`ports: 127.0.0.1:8787:8787`，只挂 `/opt/ccgateway-controller:/data`，`cap_drop: ALL`、`no-new-privileges`、`read_only`、`tmpfs /tmp`，限内存和进程数；镜像只有 CMD、没有 ENTRYPOINT，必须同时带 `io.sup2api.ccgateway.guard-api=1` 和 `io.sup2api.ccgateway.shared-egress=1` |
| 网关 | `ccg-shared-egress`，标签 `io.sup2api.ccgateway.shared=ccg`，参数照搬 `SharedEgress.create`，只声明 uplink 网络；接入账号网络由 guard API 在运行时完成。现网网关由 docker-py 建出，接管时不纳入 compose，留到单独维护窗口（发布方案 S6） |

### 1.4 与总设计稿的差异

| 编号 | 总设计稿 | 本文 | 理由 |
|---|---|---|---|
| X1 | guard 用 Python 标准库（§7），systemd 单元（§7.7） | Go，标准库，compose 服务 | 用户决定 |
| X2 | 配置文件 `/etc/ccgateway-guard/config.json` 列出多个实例，每实例一个令牌（§6.1） | **一个 guard 进程只服务一个实例**，配置全部来自环境变量，令牌在 `.env` | 隔离测试实例本来就是独立的 compose 项目（发布方案 §7），自带一个 guard。一进程一实例，令牌、前缀、链名不会串，代码里也没有"按令牌查实例"的分支 |
| X3 | 查询返回 inspect 的白名单子集（§6.1） | 本前缀、本账号的资源返回 **Docker 原始 inspect 字节**（不解码再编码） | `container_identity` 要用完整的 `Mounts`、`Labels`、`Args`（R1、RB4）；白名单会让配对激活过的账号回 409。只给控制器自己的资源，不多出权限（§13.2） |
| X4 | `PUT /v1/gateway` 由 guard 按 Docker API 创建网关；`POST /v1/gateway/start` | 删去这两个端点，改为 `POST /v1/gateway/ensure`、`POST /v1/gateway/recreate` | 网关定义归 compose；guard 不再自己拼网关的 create 请求 |
| X5 | 控制器容器由 guard 按写死的参数 `docker run`（§6.2"控制器自身"，§7.6 install/adopt/release） | 控制器由 compose 定义；guard 只做升级：改 `.env` → `compose up -d --no-deps controller` → 等 `healthy` → 失败恢复 `.env` 再 up | 用户决定；adopt/release 归核心脚本（发布方案 §2.6） |
| X6 | 升级健康检查访问 `<控制器IP>:<port>/health`（要管理密钥） | 等容器的 Docker 健康状态变为 `healthy`，并核对 `Config.Image` | 控制器镜像自带 `healthcheck` 子命令（控制器设计 §7.5）。guard 不读、不解析环境文件，也就拿不到 `CCG_CONTROLLER_KEY` |
| X7 | 一次性任务 `caps` 可选 `CHOWN`、`DAC_OVERRIDE`、`FOWNER`，内存 512 MiB | 允许集合不变；内存默认 1 GiB、上限 2 GiB；建议控制器的"准备数据卷"只要 `CHOWN`+`DAC_OVERRIDE`（§4.6） | R8：CLI 探测要读入并哈希最大 512 MiB 的文件 |
| X8 | 网络和卷的 `policy` 由 guard `json.dumps` 后写进标签 | 控制器直接传标签字符串 `policy_label`，guard 只校验它是 4 KiB 以内的 JSON 对象 | 标签要与 Python `json.dumps(policy, sort_keys=True)` 逐字节相同，B 已有 `pyjson`，guard 不必再实现一遍 |
| X9 | 网关 uplink 网由 `PUT /v1/gateway` 顺带建 | `POST /v1/gateway/ensure` 的可选参数 `uplink` 在 uplink 网不存在时创建它 | compose 把 uplink 声明为外部网络，必须先于 `up` 存在 |
| X10 | `CCG-CONTROL-FWD` 放行控制器的 DNS（UDP/TCP 53） | 默认**不放行**，控制器只能用 Docker 内置 DNS `127.0.0.11`；配置项可打开 | 内置 DNS 由 dockerd 在宿主机命名空间转发，根本不经过 FORWARD；放行 53 只会多一条向任意 DNS 服务器外联的通道（§7.4） |
| X11 | `CCG-CONTROL-IN` 只匹配 `-i ccg-control0`，另加一条 `-i lo` 的 DROP | 一条跳转、一条链：放行控制器 → guard 之后，**任何入接口**发往 `<guard 地址>:8790` 的包一律 DROP | 原写法漏掉了其他网桥上的容器和公网口：它们的入接口既不是 `ccg-control0` 也不是 `lo`，会落到 INPUT 的默认 ACCEPT（§7.5） |
| X12 | 只防出方向 | `CCG-CONTROL-FWD` 再加一条：发往 `ccg-control0` 的新连接一律 DROP | 其他容器和同网段主机不能绕过 `127.0.0.1` 端口映射直连 `172.29.255.2:8787`（§7.4） |
| X13 | guard 管理的临时文件在 `/var/lib/ccgateway-guard` | 仍在这里，但作为 compose 的挂载；`ready` 状态文件在 `/tmp`（tmpfs） | 只读根文件系统 |
| X14 | 本机进程访问 guard 的 CLI 不经端口 | 子命令 `ready`、`print-rules`、`diff-rules`、`print-cleanup` 都不走 HTTP | `ready` 若走 HTTP，会被 `CCG-CONTROL-IN` 的 DROP 拦下 |
| X15 | 导入白名单只看 `manifest.json` 的 `RepoTags` | 同时检查 `index.json` 的两种名字注解和旧格式的 `repositories` 文件，重名、非普通文件一律拒绝；只接受未压缩或 gzip | Docker 从这三处取标签，只查一处就能绕过（§3.6.4） |

---

## 2. 模块位置与结构

### 2.1 位置与模块

```text
next/plugins/ccgateway/companions/guard/
  go.mod            module ccgateway/guard ; go 1.24（与 companions/worker/go.mod 相同），没有 require
  Dockerfile
  README.md
  cmd/ccgateway-guard/main.go
  internal/...
  testdata/
```

- **独立模块。** 不放进 `companions/` 根模块（那里有 engine 和 jsonschema 依赖），也不和控制器（`companions/controller-go`，模块 `ccgateway/controller`）共用模块。guard 是 root 服务，依赖越少越好审；镜像构建上下文只有它自己。
- **只用标准库。** 不引入 `golang.org/x/sys`：需要的系统调用（`openat`、`renameat`、`fstat`、`setsockopt(IP_FREEBIND)`、`flock`）在 `syscall` 包的 linux 实现里都有（§6.5）。
- **不进插件包。** guard 镜像由 CI 单独构建（`ccgateway-guard`），或在 ovh 本地构建（发布方案 §3.4）。核心只在"安装控制器"时把 guard 镜像引用写进 `.env`，插件的 bundled、upgrade 流程不碰它。
- **与控制器的接口契约**：本文 §3 是 guard 一侧的权威定义；B 的 `guardapi` 包是客户端。两边的 JSON 名在 `internal/api/types.go` 里集中定义，B 照抄（不共享代码，避免模块依赖）。CI 加一个对拍测试：B 的 FakeGuard 和 guard 的 handler 对同一组请求给出相同的状态码和错误 `reason`（§11.6）。

### 2.2 目录树

```text
companions/guard/
  cmd/ccgateway-guard/
    main.go           子命令：serve | ready | print-rules [--chain X] | diff-rules [--chain X] |
                      print-cleanup | version
  internal/
    config/           环境变量解析与一致性校验（§10）
    names/            前缀、KEY、资源名的拼装与反解析，标签常量，正则
    dockerapi/        经 unix socket 调 Docker Engine API（固定版本，§5.1）的最小客户端（§5）
    policy/           所有 create 请求体的拼装（纯函数）与参数校验（§4）
    files/            挂载源目录下的安全读写与复核（§6）
    imagecheck/       导入归档的标签解析与白名单（archive_tags 的移植，§3.6.4）
    firewall/         三条链的规则计算、iptables-restore、veth 查找与缓存（§7）
    watch/            Docker 事件订阅、防抖、60 秒全量校对、ccg-control 端点核对（§8）
    compose/          执行 docker compose 子进程、.env 改写、compose 锁（§9）
    controller/       控制器升级的状态机（§9.2）
    gateway/          网关 ensure / recreate / 接入账号网络（§9.3、§3.7）
    accounts/         账号资源的业务逻辑：归属核对、删除前检查、R15 遗留辅助容器（§3.5）
    api/              HTTP 服务：鉴权、路由、请求体限制、错误映射、每账号锁（§3）
    obs/              结构化日志（一行 JSON）、计数器
  testdata/
    inspect/          Docker 29.5.2 真实 inspect 样本（合成账号，去掉 Env 的值）
    archives/         导入白名单的测试归档（生成脚本 + 小体积样本）
    iptables/         `iptables -S` 输出样本（规范化测试用）
  Dockerfile
```

依赖方向（只向下，不循环）：

```text
cmd → api → {accounts, gateway, controller} → {policy, files, firewall(通知), dockerapi, compose, imagecheck}
                                           → names, config, obs
watch → {firewall, dockerapi}；firewall → {dockerapi, names}
```

`api` 包**不允许**直接拼 Docker 请求体：所有 `dockerapi.ContainerCreate` 的参数都来自 `policy` 的函数。测试会扫描 `internal/api`、`internal/accounts`、`internal/gateway` 的源码，出现 `HostConfig{`、`CapAdd`、`Binds`、`Privileged` 字面量即失败（§11.2）。

### 2.3 各包的职责与关键类型

**config**

```go
type Config struct {
    Token          [32]byte       // CCG_GUARD_TOKEN，64 位小写十六进制解码而来
    Prefix         string         // ccg
    Listen         netip.AddrPort // 172.29.255.1:8790
    ControllerIP   netip.Addr     // 172.29.255.2
    ControlNetwork string         // ccg-control
    ControlBridge  string         // ccg-control0
    ControlSubnet  netip.Prefix   // 172.29.255.0/29
    ChainPrefix    string         // CCG → CCG-PROXY-BRIDGE / CCG-CONTROL-FWD / CCG-CONTROL-IN
    Project        string         // ccgateway
    ProjectDir     string         // /opt/ccgateway
    RuntimeRoot    string         // /opt/ccgateway-runtime
    StateDir       string         // /var/lib/ccgateway-guard
    DockerSocket   string         // /var/run/docker.sock
    PullRepos      []Pattern      // ghcr.io/sub2api-devs/ccgateway-*
    LoadRepos      []Pattern      // ccgateway-*, ghcr.io/sub2api-devs/ccgateway-*
    ControlDNS     bool           // 默认 false（X10）
}
func Load(getenv func(string) string) (*Config, error)
```

**names**

```go
const (
    LabelAccount   = "io.sup2api.ccgateway.account"
    LabelAuth      = "io.sup2api.ccgateway.auth"
    LabelImage     = "io.sup2api.ccgateway.image"
    LabelNetwork   = "io.sup2api.ccgateway.network"
    LabelDiskQuota = "io.sup2api.ccgateway.disk-quota-bytes"
    LabelShared    = "io.sup2api.ccgateway.shared"         // 网关归属 = 前缀
    LabelGuardAPI  = "io.sup2api.ccgateway.guard-api"      // 控制器镜像
    LabelSharedEgr = "io.sup2api.ccgateway.shared-egress"  // 控制器镜像与网关镜像
    LabelJob       = "io.sup2api.ccgateway.guard-job"      // guard 的一次性容器，值 = 前缀
    UplinkKey      = "d0000000000000000"
)
var KEY = regexp.MustCompile(`^(?:[1-9][0-9]{0,17}|d[0-9a-f]{16})$`) // 与 common.KEY_PATTERN 相同
var ContainerRole = regexp.MustCompile(`^(?:app|egress)(?:-[A-Za-z0-9_.-]+)?$`)

type Names struct{ Prefix string }
func (n Names) App(aid string) string          // <p>-<aid>-app
func (n Names) Net(aid string) string          // <p>-<aid>-net
func (n Names) LegacyUplink(aid string) string // <p>-<aid>-uplink（sing-box 时代遗留）
func (n Names) Volume(aid string) string       // <p>-<aid>-data
func (n Names) Gateway() string                // <p>-shared-egress
func (n Names) GatewayUplink() string          // <p>-d0000000000000000-xray-uplink
func (n Names) Controller() string             // <p>-controller
func (n Names) Oneshot() string                // <p>-oneshot-<16 位 hex>：guard 的一次性容器，沿用 Python 的名字（§4.1）
func (n Names) ParseContainer(name string) (aid, role string, ok bool)
func (n Names) ParseNetwork(name string) (aid, role string, ok bool)
```

反解析要求"前缀 + `-` + KEY + `-` + 角色"整段匹配。隔离实例的前缀 `ccg-gt` 的资源名 `ccg-gt-d00000000000a0001-app` 在生产 guard（前缀 `ccg`）眼里，`gt-d00000000000a0001` 不是 KEY，所以不会被误认。按标签查询的结果一律再过一遍名字反解析。

**dockerapi**（§5）

```go
type Client struct{ /* unix socket, API 版本前缀，§5.1 */ }
func (c *Client) ContainerInspect(ctx, idOrName string) (Raw, *ContainerInfo, error) // Raw = 原始字节
func (c *Client) ContainerCreate(ctx, name string, body policy.ContainerSpec) (id string, err error)
func (c *Client) ContainerStart/Stop/Restart/Kill(ctx, id string, ...) error
func (c *Client) ContainerRemove(ctx, id string, force, volumes bool) error
func (c *Client) ContainerWait(ctx, id string) (exitCode int, err error)
func (c *Client) ContainerLogs(ctx, id string, stdout, stderr bool, limit int64) ([]byte, error)
func (c *Client) ContainerList(ctx, filters Filters, all bool) ([]ContainerSummary, error)
func (c *Client) ContainerTop(ctx, id, psArgs string) (Raw, error)
func (c *Client) ArchiveGet(ctx, id, path string) (io.ReadCloser, http.Header, error)
func (c *Client) ArchivePut(ctx, id, path string, body io.Reader, size int64) error
func (c *Client) Exec(ctx, id string, argv []string, user string, limit int64) (code int, out []byte, err error)
func (c *Client) NetworkInspect/Create/Remove/Connect/Disconnect/List(...)
func (c *Client) VolumeInspect/Create/Remove/List(...)
func (c *Client) ImageInspect(ctx, ref string) (Raw, *ImageInfo, error)
func (c *Client) ImagePull(ctx, ref string) error
func (c *Client) ImageLoad(ctx, r io.Reader) ([]string /* Loaded image 行 */, error)
func (c *Client) Events(ctx, since time.Time, filters Filters) (<-chan Event, <-chan error)
func (c *Client) Version(ctx) (Version, error)

type Error struct{ Status int; Message string } // Docker 的 {"message"}；404、409 由调用方判断
```

**policy**（§4）

```go
type ContainerSpec struct { /* Docker create 请求体的子集，带 json 标签，见 §4.1 */ }
func App(n names.Names, root string, aid string, req AppInput, net NetInfo) (ContainerSpec, error)
func Job(n names.Names, aid string, req JobInput, image string) (ContainerSpec, error)
func FirewallHelper(n names.Names, root, aid string, appID, gatewayImageID, defaultGW string) ContainerSpec
func ImageReader(image string) ContainerSpec
func AccountNetwork(n names.Names, aid string, req NetworkInput) (NetworkSpec, error)
func GatewayUplink(n names.Names, req NetworkInput) (NetworkSpec, error)
func Volume(n names.Names, aid string, sizeBytes int64, bounded bool) VolumeSpec
func CheckEnv(env map[string]string) ([]string, error)
func InSubnet(ip netip.Addr, subnet netip.Prefix) error // 不是 .0、.1、广播地址
```

**files**（§6）

```go
type Root struct{ fd int; path string }   // /opt/ccgateway-runtime，O_DIRECTORY|O_NOFOLLOW 打开
func OpenRoot(path string) (*Root, error)
func (r *Root) WriteReplace(rel []string, data []byte, mode uint32) error // 临时文件 + fsync + renameat + fsync 目录
func (r *Root) RewriteInPlace(rel []string, data []byte, mode uint32) error // 保持 inode
func (r *Root) VerifyFile(abs string) error   // 挂载源复核：§6.3
func (r *Root) VerifyDir(abs string) error
```

**firewall**（§7）

```go
type Engine struct{ /* 上次写入的各链内容、veth 缓存、路由缓存 */ }
func (e *Engine) Recompute(ctx, reason string, accounts ...string) // 只算受影响的账号；空 = 全部
func (e *Engine) Desired(ctx) (map[string][]Rule, error)          // print-rules / diff-rules 用
func (e *Engine) InvalidateRoute(aid string)                        // 防火墙辅助容器执行后
```

**watch**（§8）

```go
func Run(ctx, docker *dockerapi.Client, fw *firewall.Engine, cache *State) error
type State struct{ /* 控制网端点、网关和各账号 app 的 (ID, StartedAt, Status) */ }
func (s *State) ControllerOK() bool  // .2 属于 <p>-controller 且带 compose 标签
```

**compose**（§9）

```go
type Runner struct{ Project, Dir, File, EnvFile string; lock *os.File }
func (r *Runner) Up(ctx, service string, profile string, forceRecreate bool) error
func (r *Runner) ReplaceEnv(set map[string]string, drop []string) (old []byte, err error)
func (r *Runner) RestoreEnv(old []byte) error
```

**controller**（§9.2）

```go
type Upgrader struct{ /* 状态 idle|running|done|failed，持久化在 StateDir/upgrade.json */ }
func (u *Upgrader) Start(image string) error   // 202；正在进行 → ErrBusy
func (u *Upgrader) Status() UpgradeStatus
func (u *Upgrader) Resume(ctx)                  // guard 启动时：上次中断的升级先收尾
```

**api**（§3）

```go
type Server struct{ cfg *config.Config; d *dockerapi.Client; locks *KeyedMutex; ... }
func (s *Server) Handler() http.Handler      // Go 1.22 ServeMux 的方法 + 路径模式
func (s *Server) Serve(ctx) error              // IP_FREEBIND 监听，§3.1
type KeyedMutex struct{ /* map[aid]*chan struct{}，可带超时地加锁 */ }
func (k *KeyedMutex) Lock(ctx, key string) (unlock func(), err error)
```

### 2.4 启动顺序（`serve`）

1. `config.Load`；不合法就打印原因、退出码 2。
2. iptables 后端自检（§7.8）：`iptables -V` 必须含 `nf_tables`，`iptables -S DOCKER-USER` 必须成功；否则退出码 3，绝不写规则。
3. `dockerapi.Version`：daemon 支持 guard 固定的 API 版本（§5.1）；否则退出码 4。
4. `files.OpenRoot(RuntimeRoot)`：目录必须存在、属 root、不是符号链接、权限没有组和其他人的写位；`StateDir` 同样核对，清空 `StateDir/loads/` 的残留。
5. `controller.Resume`：处理上次中断的升级（§9.2.4）。
6. `firewall` 首轮全量计算并写入（**不先清空**，发布方案 §10 C2）；计算整体出错时失败关闭（§7.7）。
7. 启动 `watch`（订阅事件 + 60 秒校对）。
8. 开始监听 `Listen`，写 `/tmp/ccgateway-guard.ready`（§10.4）。此后才接受请求。

收到 SIGTERM：停止接受新连接，等进行中的请求最多 25 s（流式请求直接断开），**不清空任何链**，删除 ready 文件后退出。正在执行的控制器升级不会被打断：它在独立 goroutine 里，退出前把状态写进 `upgrade.json`，下次启动由 `Resume` 收尾。

---

## 3. HTTP API

### 3.1 服务器

- 地址 `http://172.29.255.1:8790/v1/...`，只有 HTTP/1.1（`http.Server` 不配 TLS，`TLSNextProto` 置空，拒绝 h2c 升级）。
- 监听：`net.ListenConfig{Control: setFreebind}`，`setFreebind` 对套接字设 `IP_FREEBIND=1`（`syscall.IP_FREEBIND`）。`ccg-control0` 还不存在时也能绑定，网桥出现后连接自然到达。绑定失败（端口被占）时每 2 s 重试，日志 `listen_retry`，不退出。
- 超时与上限：`ReadHeaderTimeout 5s`，`IdleTimeout 120s`，`MaxHeaderBytes 16 KiB`；不设整体 `ReadTimeout`/`WriteTimeout`（流式端点会被截断），改为每个处理函数自己的 `context` 超时，流式端点用"空闲 120 s"截止（每次读写成功就顺延）。
- 并发：普通请求信号量 32，流式请求（`images/load`、`images/file`、两个归档端点）单独信号量 4，其中 `images/load` 同时只允许 1 个。拿不到信号量立即回 503 `busy`。
- 只接受路由表里的方法；其他方法回 405 JSON，**在鉴权之后**（未鉴权的请求只会看到 401，探测不到路由）。

### 3.2 鉴权

每个请求按顺序检查，任何一项失败都回 401 `unauthorized`（不区分原因，日志里写原因）：

1. **来源地址**：`RemoteAddr` 的 IP 必须等于 `ControllerIP`（`172.29.255.2`）。
2. **令牌**：`Authorization` 必须恰好是 `Bearer ` 加 64 位小写十六进制；解码成 32 字节后与配置的令牌 `subtle.ConstantTimeCompare`。头里有非 ASCII 字符、多个 `Authorization` 头、没有 `Bearer ` 前缀，都直接拒绝（不复现 BUG-11 的宽松）。
3. **控制器身份**：`watch.State.ControllerOK()` 为真，即 `ccg-control` 网络上持有 `.2` 的端点是名为 `<p>-controller` 的容器，带标签 `com.docker.compose.project=<Project>`、`com.docker.compose.service=controller`。不满足时回 403 `controller_unguarded`（这是网络层被绕过的信号，单独计数并告警）。`GET /v1/health` 不做这一项，便于排查。

令牌只在一个 guard 实例内有效；隔离实例有自己的 guard、令牌、前缀，见 X2。

### 3.3 通用约定

**请求体：**

- JSON 端点：`Content-Type` 必须是 `application/json`；不超过 1 MiB（`http.MaxBytesReader`）；`json.Decoder` 开 `DisallowUnknownFields` 和 `UseNumber`；解码后 `dec.More()` 必须为假（只能有一个 JSON 值）；数字字段在结构体里用 `int64`，越界即 400。没有请求体的 POST（如 `start`）要求 `Content-Length: 0` 或空对象 `{}`。
- 原始字节端点（文件、归档、镜像）：必须有 `Content-Length`（不接受 chunked），超过各自上限直接 413 `too_large`，不读请求体。读取时再套一层 `io.LimitReader(n)`，实际字节数与 `Content-Length` 不符回 400。
- 查询参数：只接受文档列出的参数，出现其他参数回 400；每个参数只能出现一次。

**路径参数：**

- `{aid}` 必须匹配 `names.KEY`；否则 400 `invalid_request`。
- 资源名一律由 guard 拼出，控制器只传 `aid` 和角色后缀。

**应答：**

- 成功：JSON 端点返回 `200`（或 `201`/`202`，按端点说明），`Content-Type: application/json`；查询类返回 Docker 原始 inspect 字节（X3），外面套一层 guard 的对象。
- 错误：

```go
type ErrorBody struct {
    Error   string   `json:"error"`             // 下表的 code
    Reason  string   `json:"reason,omitempty"`  // 409 和部分 403/404/502/503 带
    Message string   `json:"message"`           // 简短英文原因，不含路径、环境变量、命令输出
    Names   []string `json:"names,omitempty"`   // 409 resource_in_use / ownership_mismatch 时，涉及的资源名
}
```

| 状态码 | `error` | `reason` | 含义 |
|---|---|---|---|
| 400 | `invalid_request` | — | 请求不合法：未知字段、格式、范围 |
| 401 | `unauthorized` | — | 来源地址或令牌不对（§3.2） |
| 403 | `forbidden` | `controller_unguarded`、`image_not_allowed`、`load_forbidden`、`image_not_guarded`、`image_not_gateway`、`mount_source_rejected`、`policy` | 违反策略 |
| 404 | `not_found` | `container`、`network`、`volume`、`image`、`path`、`gateway` | 资源不存在 |
| 405 | `method_not_allowed` | — | |
| 409 | `conflict` | `ownership_mismatch`、`resource_in_use`、`exists`、`not_running`、`upgrade_in_progress`、`gateway_not_compose`、`uplink_missing`、`subnet_overlap`、`mount_source_replaced` | 见各端点 |
| 413 | `too_large` | — | 请求体超过上限 |
| 422 | `unprocessable` | `not_regular_file`、`too_large` | `images/file` 的目标不是普通文件，或超过 `limit` |
| 502 | `docker_error` | `pull_failed`、`load_failed`、`helper_failed`、`job_failed`、`output_too_large`、`compose_failed` | Docker 或子进程失败 |
| 503 | `busy` / `disk_quota_unavailable` / `unavailable` | `lock_timeout`、`starting` | guard 暂时不能处理；卷不支持配额；guard 还在启动 |
| 504 | `timeout` | `exec_timeout`、`job_timeout` | 超过 guard 自己的时限 |

`reason` 的取值集合是接口的一部分，新增值要在 `features` 里加版本（§3.4.1）。B 的映射见控制器设计 §5.3；本文新增的 `gateway_not_compose`、`uplink_missing`、`subnet_overlap`、`output_too_large`、`exec_timeout`、`job_timeout` 由 B 归入"未命名 → 503 `runtime_unavailable`"，`subnet_overlap` 例外：B 应当把它当作"网段被并发占用"，重新取一次 `subnets` 再分配（与 `exists` 的重试同类）。

**日志：** 每个请求一行 JSON：`{"ts","method","route"（路径模板，如 /v1/accounts/{aid}/app/exec）,"aid","status","reason","ms"}`。不记请求体、查询参数的值（`path` 参数例外：它不含秘密，便于排查归档问题，截断到 256 字节）、环境变量、命令行、命令输出、令牌、镜像归档内容。

**每账号锁：** `KeyedMutex`，键是 `aid`；网关操作的键是 `"<gateway>"`；网络创建另有全局 `netAlloc` 锁（检查重叠和创建之间不能插入别的创建）。

| 端点类别 | 加锁 |
|---|---|
| 账号的变更（network、volume、app 的建删和启停、resolv、firewall、jobs、删除容器） | `aid` 锁，等待上限 30 s，超时 503 `busy`/`lock_timeout` |
| 网关接入、断开账号网络 | 先 `aid` 锁，再 `"<gateway>"` 锁（固定顺序，避免死锁） |
| 网关 ensure、recreate、files 写入、控制器升级 | `"<gateway>"` 锁；ensure/recreate 与控制器升级还共用 `lifecycle` 状态，二者互斥（409 `upgrade_in_progress`） |
| 查询、exec、归档、top、`fields=state` | 不加锁 |

控制器自己也有账号锁（控制器设计 §4），guard 的锁只是兜底：防止同一账号的变更交错（例如 `DELETE network` 与 `PUT gateway/networks` 并发）。exec 和归档不加锁，是因为它们可能持续几十秒，而控制器在配对激活时会在同一账号上连续执行很多次 exec；Docker 本身保证单次调用的原子性。

### 3.4 系统端点

#### 3.4.1 `GET /v1/health`

不要求 `controller_unguarded` 检查（§3.2 第 3 项）。

```go
type Health struct {
    Version    string   `json:"version"`     // guard 版本，ldflags 写入
    Prefix     string   `json:"prefix"`
    Features   []string `json:"features"`    // 见下
    Docker     string   `json:"docker"`      // 服务端版本，如 "29.5.2"
    Firewall   string   `json:"firewall"`    // ok | degraded（最近一次计算有账号失败） | failed（失败关闭中）
    Controller string   `json:"controller"`  // ok | unguarded
    Starting   bool     `json:"starting"`
}
```

`features` 第一版：`account-state-v1`、`exec-combined-v1`、`gateway-compose-v1`、`raw-inspect-v1`、`jobs-v1`、`load-gzip-v1`、`upgrade-compose-v1`。B 启动时检查必需的几项（R17）。

#### 3.4.2 `GET /v1/subnets`

```go
type Subnets struct {
    HostRoutes []string     `json:"host_routes"` // 宿主机 /proc/net/route 里掩码非 0 的路由，CIDR 文本
    Networks   []NetSubnets `json:"networks"`    // 所有 Docker 网络（不限前缀）
}
type NetSubnets struct {
    Name    string            `json:"name"`
    Labels  map[string]string `json:"labels"`   // 只给本前缀账号网络的 account 标签，其余为 {}
    Subnets []string          `json:"subnets"`  // IPv4 子网
}
```

- guard 是 host 网络，读到的 `/proc/net/route` 就是宿主机的路由表，解析规则与 `network.host_routes()` 相同（跳过掩码为 0 的默认路由）。
- `Networks` 包含所有 Docker 网络，所以自然包括 compose 定义的 uplink 网和 `ccg-control`（R16）。其他网络的标签不外泄，只给子网；本前缀的账号网络给 `account` 标签，控制器的 `_check_subnet_capacity` 靠它把"本账号的旧网段"排除在占用之外。

#### 3.4.3 `GET /v1/inventory`

```go
type Inventory struct {
    Containers []json.RawMessage `json:"containers"` // 本前缀、名字可反解析、带 account 标签的容器，原始 inspect
    Networks   []json.RawMessage `json:"networks"`   // 本前缀的 <aid>-net、<aid>-uplink 网络，原始 inspect
    Volumes    []json.RawMessage `json:"volumes"`    // 本前缀的 <aid>-data 卷，原始 inspect
}
```

上限：每类 4096 项，超过回 502 `docker_error`（与 `cleanup.MAX_KEYS` 同量级，控制器自己会再限）。供 `cleanup.inventory` 用。`ccg-controller`、`ccg-controller-prev`、`ccg-controller-upgrade`、`ccg-guard`、网关都没有 `account` 标签，不会出现在这里（发布方案 §10 对 B 的要求）。

### 3.5 账号端点

公共规则：

- 归属：账号容器、网络、卷的名字由 guard 拼出；资源存在但 `io.sup2api.ccgateway.account` 标签不等于 `aid` 时，一律 409 `ownership_mismatch`，`names` 给出资源名。网关的归属标签 `io.sup2api.ccgateway.shared` 不等于前缀时同样 409。
- "原始 inspect"是 Docker `GET /containers/{id}/json`（或 networks、volumes）返回的字节，guard 只校验它是一个 JSON 对象，不改动内容；`Args` 的 `null` 与 `[]`、数字的写法都保持原样（R1）。

#### 3.5.1 `GET /v1/accounts/{aid}`

```go
type Account struct {
    App             json.RawMessage   `json:"app"`              // <p>-<aid>-app 的原始 inspect；不存在为 null
    Others          []json.RawMessage `json:"others"`           // 本账号其余容器（egress、app-<后缀>、egress-<后缀>），原始 inspect
    Network         json.RawMessage   `json:"network"`          // <p>-<aid>-net 原始 inspect（含 Containers）；null
    Uplink          json.RawMessage   `json:"uplink"`           // <p>-<aid>-uplink（遗留）；null
    Volume          json.RawMessage   `json:"volume"`           // <p>-<aid>-data 原始 inspect；null
    VolumeUsers     []ContainerRef    `json:"volume_users"`     // 使用该卷的容器（不含已结束的遗留辅助容器，R15）
    NetworkForeign  []ContainerRef    `json:"network_foreign"`  // 账号网上既不属于本账号、也不是网关的端点（不含已结束的遗留辅助容器）
    GatewayAttached bool              `json:"gateway_attached"` // 网关在 <p>-<aid>-net 上
}
type ContainerRef struct {
    ID     string `json:"Id"`
    Name   string `json:"Name"`           // 不带前导 "/"
    Status string `json:"Status"`         // State.Status
}
```

- `Others`：用 `label=io.sup2api.ccgateway.account=<aid>` 列出容器，名字必须能反解析为本前缀、本 `aid`，角色匹配 `names.ContainerRole` 且不是 `app`（R19）。按名字排序。
- 名字是 `<p>-<aid>-app`、但标签不符：409 `ownership_mismatch`。其余容器标签不符的直接不列出（它们按名字本来就不属于本账号）。
- 网络、卷同名但标签不符：409 `ownership_mismatch`（与 `owned_resource` 相同，查询时就报，不等到删除）。

**`GET /v1/accounts/{aid}?fields=state`**（请求路径专用，R2）：

```go
type AccountState struct {
    App     *StateApp     `json:"app"`     // 不存在为 null
    Gateway *StateGateway `json:"gateway"` // 不存在为 null
}
type StateApp struct {
    ID        string `json:"id"`
    Image     string `json:"image"`      // inspect 的 Image（镜像 ID）
    Status    string `json:"status"`
    StartedAt string `json:"started_at"` // State.StartedAt 原文
    IP        string `json:"ip"`         // 在 <p>-<aid>-net 上的地址；不在该网上为 ""
}
type StateGateway struct {
    ID        string `json:"id"`
    Status    string `json:"status"`
    StartedAt string `json:"started_at"`
    IP        string `json:"ip"`         // 网关在 <p>-<aid>-net 上的地址；没接入为 ""
}
```

- 两次 inspect 并发执行；目标 p50 < 5 ms、p99 < 10 ms。以后要再快，可以改读 watch 维护的缓存，接口不变。
- app 或网关归属不符：409 `ownership_mismatch`。

#### 3.5.2 `PUT /v1/accounts/{aid}/network`

```go
type NetworkRequest struct {
    Subnet      string `json:"subnet"`       // 必填，IPv4 CIDR
    Gateway     string `json:"gateway"`      // 必填，必须等于子网的 .1
    PolicyLabel string `json:"policy_label"` // 必填，写进 io.sup2api.ccgateway.network；≤ 4096 字节，必须是 JSON 对象
}
```

- 建 `<p>-<aid>-net`：`bridge`，`Internal: true`，`EnableIPv6: false`，IPAM 一个池（子网 + `.1`），标签 `{account: aid, network: policy_label}`（§4.3）。
- 子网校验：在 `10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16` 内；前缀长度 24–29（`allocate_subnet` 的结果至少是 /24）；不与任何 Docker 网络的子网、宿主机路由、`ControlSubnet` 重叠，否则 409 `subnet_overlap`。检查与创建在 `netAlloc` 锁内完成。
- 已存在且属于本账号：409 `exists`（控制器重新查询后按"已存在"处理，控制器设计 §5.3）。已存在但不属于本账号：409 `ownership_mismatch`。
- 返回 201 和原始 inspect。

`aid` 为 `d0000000000000000` 时拒绝（403 `policy`）：网关 uplink 只能经 `gateway/ensure` 创建。

#### 3.5.3 `DELETE /v1/accounts/{aid}/network?role=net|uplink`

- `role=net`：`<p>-<aid>-net`；`role=uplink`：遗留的 `<p>-<aid>-uplink`。
- 不存在：404 `network`（R18，控制器当作已删除）。
- 顺序：
  1. 删除网上**已结束**的遗留辅助容器 `<p>-oneshot-*`（R15）；
  2. 网关在网上时强制断开（`force: true`）；
  3. 还有其他端点（本账号的容器也算：控制器应先删容器）→ 409 `resource_in_use`，`names` 列出端点名；
  4. 删除网络。
- 返回 204。随后触发 `firewall.Recompute(aid)`。

#### 3.5.4 `PUT /v1/accounts/{aid}/volume`

```go
type VolumeRequest struct {
    SizeBytes      int64 `json:"size_bytes"`      // 1 GiB ≤ x ≤ 1 TiB
    AllowUnbounded bool  `json:"allow_unbounded"`
}
type VolumeResult struct {
    Volume         json.RawMessage `json:"volume"`          // 原始 inspect
    Created        bool            `json:"created"`
    QuotaSupported *bool           `json:"quota_supported"` // 只在本次新建时有值；false = 存储不支持配额（控制器据此记录 disk_quota_support=unavailable）
}
```

- 已存在：归属相符就原样返回（`created=false`）；标签不符 409 `ownership_mismatch`。是否接受已有卷的配额，由控制器按 `account_volume` 的规则自己判断（guard 不判断"旧卷是否需要迁移"）。
- 不存在：建 `local` 卷，`DriverOpts {"size": "<size_bytes>"}`，标签 `{account, disk-quota-bytes: "<size_bytes>"}`。Docker 回的错误信息含 `no quota support`（不区分大小写，与 Python 相同）时：
  - `allow_unbounded=true`：改建无上限卷，只带 `account` 标签，`quota_supported=false`；
  - 否则：503 `disk_quota_unavailable`。

#### 3.5.5 `DELETE /v1/accounts/{aid}/volume`

不存在 404 `volume`；先删除使用该卷的**已结束**遗留辅助容器（R15）；还有任何容器在用（本账号的也算）→ 409 `resource_in_use` 加 `names`；否则删除，204。

#### 3.5.6 `PUT /v1/accounts/{aid}/app`（只创建，不启动，R21）

```go
type AppRequest struct {
    Image       string            `json:"image"`        // 本地已有的镜像引用或 sha256:<hex>
    IPv4        string            `json:"ipv4"`         // 在 <p>-<aid>-net 子网内
    Env         map[string]string `json:"env"`          // ≤ 128 个；名字 [A-Za-z_][A-Za-z0-9_]*；值不含 NUL；名字+值总长 ≤ 64 KiB
    AuthLabel   string            `json:"auth_label"`   // io.sup2api.ccgateway.auth，≤ 256 字节，可打印 ASCII
    ImageLabel  string            `json:"image_label"`  // io.sup2api.ccgateway.image，必须匹配 sha256:[0-9a-f]{64}
    MemoryBytes int64             `json:"memory_bytes,omitempty"` // 0 = 默认 1 GiB；上限 4 GiB；下限 256 MiB
    NanoCPUs    int64             `json:"nano_cpus,omitempty"`    // 0 = 默认 2e9；上限 4e9；下限 1e8
}
```

- 前置：`<p>-<aid>-net` 存在且属于本账号（否则 409 `ownership_mismatch` 或 404 `network`）；数据卷存在且属于本账号（否则 404 `volume`）；`<aid>/resolv.conf` 存在并通过复核（否则 403 `mount_source_rejected`，控制器应先 `PUT resolv`）；镜像本地存在（否则 404 `image`，guard 不在这里拉取）。
- `ipv4`：在子网内，不是网络地址、`.1`、广播地址，不等于网上已有端点的地址。
- 同名容器已存在：409 `exists`（R21）。
- 参数见 §4.2，返回 201 和原始 inspect。不触发防火墙重算（容器没有运行）。

#### 3.5.7 `POST /v1/accounts/{aid}/app/{action}`，`action` = `start` | `stop` | `restart`

```go
type ActionRequest struct {
    Timeout *int64 `json:"timeout,omitempty"` // 秒，stop/restart 的优雅时限，0–120，默认 10
}
```

- `start`、`restart` 之前复核挂载源（§6.3）：容器的 `Mounts` 里每个 `bind` 类型都必须是 `<RuntimeRoot>/<aid>/resolv.conf` 本身，且通过复核；`volume` 类型必须是 `<p>-<aid>-data`；出现其他挂载 → 403 `mount_source_rejected`，容器不动。这条检查也覆盖了"控制器通过别的途径建出的同名容器"——当然它建不出来，这里只是兜底。
- 已在运行时 `start` 返回 204（Docker 的 304 视为成功）；已停止时 `stop` 同样 204。
- 完成后触发 `firewall.Recompute(aid)`，并让该账号的路由缓存失效（新命名空间里还没有默认路由）。

#### 3.5.8 `DELETE /v1/accounts/{aid}/containers/{suffix}`

- `suffix` 必须匹配 `names.ContainerRole`（`app`、`egress`、`app-<x>`、`egress-<x>`）。
- 容器 `<p>-<aid>-<suffix>` 不存在：404 `container`；标签不符：409 `ownership_mismatch`。
- 强制删除（`force=true`，`v=false`：不删匿名卷以外的东西，账号数据卷是具名卷，不受影响）。204。然后 `firewall.Recompute(aid)`。

#### 3.5.9 `POST /v1/accounts/{aid}/app/exec`

```go
type ExecRequest struct {
    Argv []string `json:"argv"` // 1–256 项；每项 ≤ 128 KiB、不含 NUL；总长 ≤ 1 MiB
    User string   `json:"user"` // "" | "0" | "1000"
}
type ExecResult struct {
    ExitCode int    `json:"exit_code"`
    Output   string `json:"output"` // base64（标准编码），stdout 与 stderr 按到达顺序合并（R5）
}
```

- 只能在 `<p>-<aid>-app` 里执行；容器不在运行：409 `not_running`。
- 输出上限 16 MiB（解码后），超过就断开 attach 连接，回 502 `output_too_large`；总时限 110 s，超过回 504 `exec_timeout`。超时后容器里的进程不会被 guard 杀掉（Docker 没有"取消 exec"的接口），这与 Python 一致。
- 不限制命令内容：容器本身 `cap_drop: ALL`、`no-new-privileges`，`user: "0"` 也只是无能力的 root；它能做的事，控制器经 Worker 管理口本来就能做。

#### 3.5.10 `GET|PUT /v1/accounts/{aid}/app/archive?path=`

- `path`：绝对路径，`path.Clean` 后不变，≤ 4096 字节，不含 NUL。容器处于 `created`、`running`、`exited` 都可以（R6）。
- GET：返回 `application/x-tar`，原样转发 Docker 的流，并带回 `X-Docker-Container-Path-Stat` 头；guard 侧最多转发 600 MiB + 1 MiB，超过就断开（R20）。路径不存在：404 `path`。
- PUT：请求体是 tar，`Content-Length` ≤ 600 MiB；`path` 是目标目录，不存在 404 `path`。Docker 在容器自己的根文件系统和挂载视图里解包：写只读挂载（`/etc/resolv.conf`）会被 Docker 拒绝，归档里的链接跳不出容器。guard 不改归档内容，也不加 `noOverwriteDirNonDir` 等 docker-py 没有传的参数。成功 204。

#### 3.5.11 `GET /v1/accounts/{aid}/app/top`

固定 `ps_args=-eo pid,comm`（R7），返回 Docker 原文 `{Titles, Processes}`。不在运行：409 `not_running`。

#### 3.5.12 `PUT /v1/accounts/{aid}/resolv`

```go
type ResolvRequest struct {
    Nameserver string `json:"nameserver"` // 在 <p>-<aid>-net 子网内，不是 .0、.1、广播地址
}
```

- 内容固定为 `nameserver <ip>\noptions timeout:2 attempts:2\n`（与 `common.resolv_conf` 逐字节相同，R11）。
- 文件不存在：在 `<RuntimeRoot>/<aid>/` 下新建（目录不存在就建，root 0700），文件 root 0644。
- 文件已存在：原地改写，保持 inode（§6.2），因为它可能已经挂进正在运行的账号容器。
- 网络不存在时 404 `network`（没有子网就无法校验）。204。

#### 3.5.13 `PUT /v1/accounts/{aid}/firewall`

```go
type FirewallRequest struct {
    Rules          string `json:"rules"`           // nft 规则文本，≤ 64 KiB，UTF-8，不含 NUL
    DefaultGateway string `json:"default_gateway"` // 在 <p>-<aid>-net 子网内，不是 .0、.1、广播，也不是 app 自己的地址
}
```

1. app 必须在运行（409 `not_running`）；网关必须存在（409 `not_running` 加 `names: [<p>-shared-egress]`，R12）。
2. guard 用 `WriteReplace` 写 `<aid>/app.nft`（root 0600）。
3. 用**网关容器 inspect 里的 `Image`**（镜像 ID）起辅助容器（§4.5），加入 `container:<app ID>` 的网络命名空间，执行固定脚本：`NFT_REPLACE` 加 `ip route replace default via <default_gateway>`。
4. 等待退出，时限 30 s；退出码非 0 → 502 `helper_failed`（`message` 只说"helper exited with N"，不带输出）；超时 → 先 kill 再删，504 `job_timeout`。无论成败都删除辅助容器。
5. 成功后让该账号的路由缓存失效并 `Recompute(aid)`。204。

#### 3.5.14 `POST /v1/accounts/{aid}/jobs`

```go
type JobRequest struct {
    Image       string   `json:"image"`        // 本地已有
    Entrypoint  []string `json:"entrypoint"`   // 1–4 项
    Argv        []string `json:"argv"`         // 0–64 项；限制同 exec
    User        string   `json:"user"`         // "0" | "1000:1000"
    Volume      string   `json:"volume"`       // "none" | "ro" | "rw"：本账号数据卷挂在 /work
    Caps        []string `json:"caps"`         // ⊆ {CHOWN, DAC_OVERRIDE, FOWNER}，且只在 volume=rw 时允许非空
    MemoryBytes int64    `json:"memory_bytes,omitempty"` // 0 = 1 GiB；上限 2 GiB
}
type JobResult struct {
    ExitCode int    `json:"exit_code"`
    Stdout   string `json:"stdout"` // base64，只含 stdout（R8），≤ 64 KiB（解码后）
}
```

- 参数见 §4.6。时限 120 s（超时 kill，504 `job_timeout`）。
- 退出码非 0 **不是** guard 的错误：照样 200 返回 `exit_code`，由控制器决定怎么映射（Python 的 `ContainerError`）。只有容器起不来（例如镜像不存在、Docker 拒绝）才是 502 `job_failed`。
- `volume` 不是 `none` 时卷必须存在且属于本账号（404 `volume`）。
- 无论成败，guard 都删除任务容器（`force=true`、`v=true`，带走镜像 `VOLUME` 声明产生的匿名卷）。guard 启动时还会清理带 `io.sup2api.ccgateway.guard-job=<前缀>` 标签的残留任务容器。

### 3.6 镜像端点

镜像引用校验沿用 `common.IMAGE_REF`：`[a-z0-9][a-z0-9._/-]{0,127}(:[A-Za-z0-9._-]{1,128})?(@sha256:[0-9a-f]{64})?`，或者镜像 ID `sha256:[0-9a-f]{64}`。

#### 3.6.1 `GET /v1/images/inspect?ref=`

```go
type ImageView struct {
    ID       string   `json:"Id"`
    RepoTags []string `json:"RepoTags"`
    Config   struct {
        Env    []string          `json:"Env"`
        Labels map[string]string `json:"Labels"`
    } `json:"Config"`
}
```

不存在 404 `image`（R10）。只返回这几个字段：镜像不归控制器所有，原始 inspect 里还有本机其他标签、构建历史，没有必要给。

#### 3.6.2 `POST /v1/images/pull`

```go
type PullRequest struct{ Ref string `json:"ref"` }
```

- 带 `@sha256:` 摘要的引用不限仓库：按摘要拉取不会改动本机任何标签。
- 只带标签（或什么都不带，即 `latest`）的引用：仓库部分必须匹配 `PullRepos`，否则 403 `image_not_allowed`。按标签拉取会把这个标签改指新内容；不限仓库的话，控制器能拉一个 `caddy:latest` 的新版本，替换掉宿主机上别的服务下次启动要用的镜像。
- 只读到流结束，任何一行带 `error` 或 `errorDetail` 就是 502 `pull_failed`（R4）。时限 30 min。成功回 204。

#### 3.6.3 `GET /v1/images/file?ref=&path=&limit=`

- `limit`：1 到 512 MiB，必填。`path`：绝对、规范化、≤ 4096 字节。
- 用 `policy.ImageReader` 建一个**不启动**、`NetworkDisabled`、`Entrypoint ["true"]` 的临时容器（与 `dockerfs.image_container` 相同），`GET archive` 取文件，用完强制删除。
- 应答：`application/octet-stream`，`Content-Length` 为文件大小，内容是文件本身（guard 解开 tar：只允许恰好一个条目，必须是普通文件）。
- 错误：镜像不存在 404 `image`；路径不存在 404 `path`；不是单个普通文件 422 `not_regular_file`；大小超过 `limit` 422 `too_large`（R4、R20）。
- guard 先读 tar 头，确认是普通文件且 `Size ≤ limit` 后才开始写应答头，然后边读边写，不在内存里整块缓存。

#### 3.6.4 `POST /v1/images/load`

请求体：未压缩的 tar，或 gzip 压缩的 tar（R9）；`Content-Length` ≤ 4 GiB；`Content-Type: application/x-tar` 或 `application/gzip`。

```go
type LoadResult struct {
    Images []LoadedImage `json:"images"`
}
type LoadedImage struct {
    ID   string   `json:"id"`   // sha256:<hex>
    Tags []string `json:"tags"` // 归档清单里给这个镜像的名字（_names 的语义）
}
```

步骤：

1. **落盘。** 写到 `StateDir/loads/<随机>.part`（0600），边写边数字节，与 `Content-Length` 不一致就删掉并回 400。每 8 MiB 用 `sync_file_range` 写穿并 `fadvise DONTNEED` 丢掉页缓存（`files.CopyWriteThrough`）：这些页记在 guard 的 256 MiB cgroup 里，脏页回写前不能回收，2026-11-01 生产上加载 app 镜像时因此被 OOM 杀了两次。磁盘剩余不足 `Content-Length` 的 1.2 倍时直接 503 `busy`。
2. **解析清单**（`imagecheck.Scan`）：读前几个字节判断格式，gzip 魔数 `1f 8b` 就套 `gzip.Reader`，否则按 tar；其他压缩格式（xz、bzip2、zstd，Docker 也认）一律 400，因为 guard 无法核对它们的内容。扫描整个归档，**只读元数据，不解出层**：
   - 收集所有名字规范化后（`path.Clean`，去掉开头的 `./`）等于 `manifest.json`、`index.json`、`repositories` 的条目。任一出现超过一次，或者不是普通文件（符号链接、硬链接都不行），或者超过 1 MiB → 403 `load_forbidden`。Docker 是先把归档解到临时目录再读这三个文件，重名时以最后一个为准，符号链接会被跟随，所以必须这样拒绝。
   - `manifest.json` 必须存在且能解析（读不出清单的归档直接拒绝，总设计稿 §6.2）。每一项的 `RepoTags` 收进候选名字。
   - `index.json` 存在时，每一项的注解 `io.containerd.image.name` 和 `org.opencontainers.image.ref.name` 都收进候选名字（后者只有一个标签时，按 Docker 的规则与仓库拼成完整名字；拼不出来就拒绝）。
   - `repositories` 存在时（旧格式），它的每个 `仓库:标签` 也收进候选名字。
3. **白名单。** 每个候选名字的仓库部分（规范化：`x` → `docker.io/library/x`，与 `_qualified` 相同，然后两种写法都与 `LoadRepos` 比较）都必须匹配；任何一个不匹配 → 403 `load_forbidden`（R9），`message` 不带名字。候选名字为空（归档不带任何标签）是允许的：导入一个不带标签的镜像不会改动任何已有标签。
4. **导入。** 把落盘的文件原样（压缩的就原样压缩）交给 `POST /images/load?quiet=1`，读完逐行 JSON，任何一行带 `error` → 502 `load_failed`。
5. **事后核对。** Docker 输出的每一行 `Loaded image: <名字>` 都必须在第 2 步的候选集合里；不在 → 这说明解析与 Docker 不一致：记 `load_tag_mismatch` 告警（最高级别），回 502 `load_failed`。已经改动的标签无法撤销，所以第 2 步才是真正的防线，这一步只是发现问题。
6. **结果。** 按 `archive_tags` 的逻辑把 `manifest.json` 的 `Config` 摘要（经典镜像存储）和 `index.json` 的 `digest`（containerd 镜像存储，Docker 29 新装主机的默认值）对应到名字；`Loaded image ID:` 行（不带标签的镜像）也列出，`tags` 为空。返回 200。
7. 不论成败，删除落盘文件。

磁盘峰值：guard 落盘 4 GiB，控制器自己的上传暂存 4 GiB，合计约 8 GiB（R20）。guard 落盘是必须的：要先读完整个归档才能核对标签，而 Docker 一边读一边就会改标签。

### 3.7 网关端点

#### 3.7.1 `GET /v1/gateway`

返回 `{"gateway": <原始 inspect 或 null>, "managed_by": "compose" | "legacy" | ""}`。

- `managed_by`：容器带 `com.docker.compose.project=<Project>` 且 `com.docker.compose.service=egress` 为 `compose`；否则为 `legacy`（docker-py 建出的现网网关）。
- 同名容器存在但 `io.sup2api.ccgateway.shared` 不等于前缀：409 `ownership_mismatch`（R13，控制器设计 §5.1 的 `Gateway()`）。

#### 3.7.2 `POST /v1/gateway/ensure`

```go
type EnsureRequest struct {
    Uplink *UplinkRequest `json:"uplink,omitempty"`
}
type UplinkRequest struct {
    Subnet      string `json:"subnet"`
    Gateway     string `json:"gateway"`      // 子网的 .1
    PolicyLabel string `json:"policy_label"`
}
```

流程（§9.3 详述）：

1. 网关存在且在运行：直接返回 200 `{"gateway": <inspect>, "action": "none"}`。
2. 网关存在但已停止：复核 `/config` 挂载源（§6.3），用 Docker API `start`（不经 compose：避免 compose 因为配置漂移而重建），`action: "started"`。
3. 网关不存在：
   - uplink 网 `<p>-d0000000000000000-xray-uplink` 不存在：请求里有 `uplink` 就先按 §4.3 建它（NAT 模式 bridge、非内部网，校验同 §3.5.2）；没有就 409 `uplink_missing`（控制器分配网段后带上 `uplink` 重试）。
   - `compose --profile egress up -d --no-deps egress`，`action: "created"`。
4. 等容器 `running` 并持续 3 s（网关镜像没有健康检查），时限 30 s；否则 502 `compose_failed`。
5. 成功后 `Recompute()` 全部账号。

`ensure` 从不改镜像，也不重建正在运行的网关。

#### 3.7.3 `POST /v1/gateway/recreate`

```go
type RecreateRequest struct{ Image string `json:"image"` }
```

1. 镜像本地存在（404 `image`），且带 `io.sup2api.ccgateway.shared-egress=1`（否则 403 `image_not_gateway`）。
2. 现有网关是 `legacy`：409 `gateway_not_compose`。把 docker-py 建的网关纳入 compose 是单独的维护窗口（发布方案 S6），由管理员手工执行。
3. 与控制器升级互斥：409 `upgrade_in_progress`。
4. 改 `.env` 的 `CCG_GATEWAY_IMAGE`（旧内容留在内存和 `StateDir/gateway.json`），`compose --profile egress up -d --no-deps --force-recreate egress`。
5. 等待同 `ensure` 第 4 步。失败：恢复 `.env`，再 `up --force-recreate` 一次，回 502 `compose_failed`，`message` 写明是否已恢复。
6. 同步执行，时限 4 min（B 的客户端是 5 min）。成功返回 200 和新的 inspect。

重建后所有动态接入的账号网络都会丢失，由控制器的 recover 重新接入（控制器设计 §7.3）。

#### 3.7.4 `POST /v1/gateway/exec`

请求、应答同 §3.5.9，但没有 `user`（固定用镜像默认用户，即网关里的 root，与 `SharedEgress.exec` 相同）。网关不在运行 409 `not_running`。在网关里执行命令不会多出权限：网关的路由、防火墙、Xray 配置本来就由控制器生成。

#### 3.7.5 `PUT /v1/gateway/networks/{aid}`

```go
type ConnectRequest struct{ IPv4 string `json:"ipv4"` }
```

- 网关必须存在（404 `gateway`）；`<p>-<aid>-net` 必须存在且属于本账号。
- 地址在子网内，不是 `.0`、`.1`、广播地址，不等于网上已有端点的地址。
- 网关已在网上：地址相同 204，不同 409 `exists`。
- `POST /networks/{id}/connect`，`EndpointConfig.IPAMConfig.IPv4Address = ipv4`。204，然后 `Recompute(aid)`。

#### 3.7.6 `DELETE /v1/gateway/networks/{aid}`

强制断开（`Force: true`）；网关或网络不存在、网关不在网上都回 204（与 `SharedEgress.disconnect` 吞掉 NotFound 相同）。然后 `Recompute(aid)`。

#### 3.7.7 `PUT /v1/gateway/files/{name}`

- `name` ∈ `boot.json`、`boot.nft`、`dns.json`、`active.nft`、`operation.json`；请求体原始字节，≤ 4 MiB，`Content-Type: application/octet-stream`。
- 写到 `<RuntimeRoot>/shared-egress/<name>`：`WriteReplace`（临时文件 + 改名，root 0600）。挂进网关的是整个目录，网关进程按名字打开，能看到新文件。
- 目录不存在就建（root 0700），所以网关不存在时也能写（R13：`ensure` 之前先写 `boot.json` 等）。
- 不加网关锁以外的锁；控制器的 sharedOp 已串行化这些写入。

### 3.8 控制器端点

#### 3.8.1 `POST /v1/controller/upgrade`

```go
type UpgradeRequest struct{ Image string `json:"image"` }
```

- 镜像本地存在（404 `image`；guard 在这里不拉取，控制器先调 `images/pull`）。
- 镜像必须同时带 `io.sup2api.ccgateway.guard-api=1` 和 `io.sup2api.ccgateway.shared-egress=1`，否则 403 `image_not_guarded`（R14）。
- 正在升级，或网关正在重建：409 `upgrade_in_progress`。
- 通过后回 202 `{"accepted": true}`，在后台执行 §9.2 的状态机。控制器会在 compose 重建自己时收到 SIGTERM。

#### 3.8.2 `GET /v1/controller/upgrade`

```go
type UpgradeStatus struct {
    State     string `json:"state"`      // idle | running | done | failed
    Image     string `json:"image"`      // 本次目标
    Previous  string `json:"previous"`   // 升级前 .env 里的 CCG_CONTROLLER_IMAGE
    Step      string `json:"step"`       // env_written | compose_up | waiting_health | rolling_back | finished
    Result    string `json:"result"`     // started | unhealthy | compose_failed | env_failed
    Rollback  string `json:"rollback"`   // "" | restored | restore_failed
    StartedAt string `json:"started_at"` // RFC 3339
    EndedAt   string `json:"ended_at"`
}
```

状态保存在 `StateDir/upgrade.json`，guard 重启后仍可查询。

### 3.9 流式端点一览

| 端点 | 方向 | 上限 | 截止 | 内存 |
|---|---|---|---|---|
| `POST /v1/images/load` | 请求体 → 落盘 → Docker | 4 GiB | 空闲 120 s；导入阶段 30 min | 64 KiB 缓冲 |
| `GET /v1/images/file` | Docker → 应答 | `limit` ≤ 512 MiB | 空闲 120 s | 64 KiB |
| `GET /v1/accounts/{aid}/app/archive` | Docker → 应答 | 601 MiB | 空闲 120 s | 64 KiB |
| `PUT /v1/accounts/{aid}/app/archive` | 请求体 → Docker | 600 MiB | 空闲 120 s | 64 KiB（`io.Copy` 直通） |
| `PUT /v1/gateway/files/{name}` | 请求体 → 文件 | 4 MiB | 30 s | 整块（小） |
| exec 的输出 | Docker → 应答（JSON） | 16 MiB | 110 s | 整块，base64 后约 21.4 MiB |

流式请求与 Docker 之间直接管道相连，客户端断开就取消对 Docker 的请求（`context` 传到 `dockerapi`）。

### 3.10 Python 控制器的 Docker 调用 → guard 端点

按行为规格 §10 和总设计稿 §2.2 的调用清单逐项对照。"—"表示这个调用在 Go 控制器里消失。

| Python 位置 | Docker 调用 | guard 端点 |
|---|---|---|
| `manager.owned(aid, role)` | `containers.get(<p>-<aid>-<role>)` | `GET /v1/accounts/{aid}`（`app`、`others`） |
| `manager.owned_resource(networks/volumes)` | `networks.get`、`volumes.get` | `GET /v1/accounts/{aid}`（`network`、`uplink`、`volume`） |
| `manager.readiness` + `shared.healthy` | 4 次 `containers.get` | `GET /v1/accounts/{aid}?fields=state` |
| `manager.app_image_id` | `images.get(app_image).id` | `GET /v1/images/inspect` |
| `manager.ensure_image` | `images.get`、`images.pull` | `GET /v1/images/inspect`、`POST /v1/images/pull` |
| `check_business_image`、`_check_downgrade`、egress 标签检查 | `image.attrs['Config']` | `GET /v1/images/inspect` |
| `manager.docker_ipv4_subnets`、`network.host_routes` | `networks.list`、读 `/proc/net/route` | `GET /v1/subnets` |
| `manager.ensure_network(aid,'net',…)` | `networks.create(internal=True)` | `PUT /v1/accounts/{aid}/network` |
| `shared.create` 里的 `ensure_network(UPLINK,'xray-uplink',…)` | `networks.create(internal=False)` | `POST /v1/gateway/ensure`（`uplink` 参数） |
| `_remove_replaced`、`drop_own_egress`、`_remove_resources` | `network.remove` | `DELETE /v1/accounts/{aid}/network?role=net\|uplink` |
| `manager._data_volume` | `volumes.get`、`volumes.create(size)`，无配额时再建 | `PUT /v1/accounts/{aid}/volume` |
| `_remove_resources` | `volume.remove` | `DELETE /v1/accounts/{aid}/volume` |
| `verify_disk_quota` | `oneshot(node, user 1000, ro 卷)` | `POST /v1/accounts/{aid}/jobs`（`volume: ro`） |
| `_create_app` 的 `PREPARE_VOLUME` | `oneshot(sh -ec, user 0, rw 卷, 默认能力)` | `POST /v1/accounts/{aid}/jobs`（`volume: rw`，`caps: [CHOWN, DAC_OVERRIDE]`） |
| `cli_profiles.resolve_profile` | `oneshot(node -e PROBE, user 0, 无挂载)` | `POST /v1/accounts/{aid}/jobs`（`volume: none`） |
| `_record_runtime` 写 `resolv.conf`，`SharedEgress.resolv` | 宿主文件写入 | `PUT /v1/accounts/{aid}/resolv` |
| `_create_app` | `containers.create(... endpoint_config ...)` | `PUT /v1/accounts/{aid}/app` |
| `shared.apply` 的 `app.start()`、`http_api` 之外的 `start` | `container.start` | `POST /v1/accounts/{aid}/app/start` |
| `manager.block` | `app.stop(timeout=10)` | `POST /v1/accounts/{aid}/app/stop` |
| `worker_update` 的 `container.restart(timeout)` | `container.restart` | `POST /v1/accounts/{aid}/app/restart` |
| `_remove_replaced`、`drop_own_egress`、`_remove_resources` | `container.remove(force=True)` | `DELETE /v1/accounts/{aid}/containers/{suffix}` |
| `manager.business_firewall` → `helper` | 写 `app.nft`；`oneshot(网关镜像, container:<app>, NET_ADMIN)` | `PUT /v1/accounts/{aid}/firewall` |
| `activate` 的 `PROBE_SCRIPT`、`dockerfs.sha256_in/stage/swap/discard`、`runtime_updates` 的各个 `node -e`、`worker_update` 的健康检查 | `app.exec_run(..., user=…)` | `POST /v1/accounts/{aid}/app/exec` |
| `dockerfs.read_file` | `get_archive` | `GET /v1/accounts/{aid}/app/archive` |
| `dockerfs.stage`、`write_file` | `put_archive` | `PUT /v1/accounts/{aid}/app/archive` |
| `dockerfs.worker_idle` | `container.top(ps_args='-eo pid,comm')` | `GET /v1/accounts/{aid}/app/top` |
| `dockerfs.image_container` + `read_file` | `containers.create(entrypoint=true, network_disabled)`、`get_archive`、`remove` | `GET /v1/images/file` |
| `images.Uploads._load` + `archive_tags` | `images.load` | `POST /v1/images/load` |
| `manager.account_containers`、`_deletion_plan` 的 `containers.list(label=…)`、`containers.list(volume=…)`、`network.attrs['Containers']` | 列表与 inspect | `GET /v1/accounts/{aid}`（`others`、`volume_users`、`network_foreign`、`gateway_attached`） |
| `_namespace_helpers`、`_stale_helper` | `containers.list(name=<p>-oneshot-)` | — guard 在删网络和卷时处理（R15） |
| `cleanup.inventory` | `containers/networks/volumes.list` | `GET /v1/inventory` |
| `shared.container()` | `containers.get(<p>-shared-egress)` + 归属检查 | `GET /v1/gateway` |
| `shared.ensure` / `create` | `containers.get/create`、`start` | `POST /v1/gateway/ensure` |
| `runtime_admin` 对 egress 目标的"之后新建网关用新镜像" | — | `POST /v1/gateway/recreate`（只在显式维护时） |
| `shared.exec`、`api`、`load_inventory`、`attach` 的 `ip -j -4 addr`、`sync` 的 nft、`activate` 的 `ss` | `gateway.exec_run` | `POST /v1/gateway/exec` |
| `shared.api` 写 `operation.json`，`create`/`sync` 写 `boot.*`、`dns.json`、`active.nft` | 宿主文件写入 | `PUT /v1/gateway/files/{name}` |
| `shared.attach` | `net.connect(gateway, ipv4_address)` | `PUT /v1/gateway/networks/{aid}` |
| `shared.disconnect` | `net.disconnect(gateway, force=True)` | `DELETE /v1/gateway/networks/{aid}` |
| `runtime_admin.upgrade_controller` → `upgrade.py` | `containers.run(新镜像, upgrade.py, host 网络, docker.sock)`；`rename/stop/run/remove` | `POST /v1/controller/upgrade`、`GET /v1/controller/upgrade` |
| `runtime_admin` 的 `containers.get(helper)` | 自升级辅助容器 | — |

### 3.11 端点最终清单与总设计稿 §6 的差异

| # | 方法与路径 | 与 §6 相比 |
|---|---|---|
| 1 | `GET /v1/health` | 增加 `docker`、`firewall`、`controller`、`starting` |
| 2 | `GET /v1/subnets` | 不变；明确包含所有 Docker 网络（R16） |
| 3 | `GET /v1/inventory` | 返回原始 inspect |
| 4 | `GET /v1/images/inspect` | 不变 |
| 5 | `POST /v1/images/pull` | 不变 |
| 6 | `POST /v1/images/load` | 接受 gzip；检查三处标签来源（X15） |
| 7 | `GET /v1/images/file` | 错误码细化（R4） |
| 8 | `GET /v1/accounts/{aid}` | 原始 inspect（X3）；新增 `network_foreign`；新增 `?fields=state`（R2） |
| 9 | `PUT /v1/accounts/{aid}/network` | `policy` 改为 `policy_label` 字符串（X8）；不存在时 201，已存在 409 `exists` |
| 10 | `DELETE /v1/accounts/{aid}/network` | 删除前清理遗留辅助容器（R15） |
| 11 | `PUT /v1/accounts/{aid}/volume` | 返回 `created`、`quota_supported` |
| 12 | `DELETE /v1/accounts/{aid}/volume` | R15 |
| 13 | `PUT /v1/accounts/{aid}/app` | 标签字段名改为 `auth_label`、`image_label`；只建不启动（R21） |
| 14 | `POST /v1/accounts/{aid}/app/{start\|stop\|restart}` | 不变 |
| 15 | `DELETE /v1/accounts/{aid}/containers/{suffix}` | 不变 |
| 16 | `POST /v1/accounts/{aid}/app/exec` | 输出改为 `output`（合并、base64，R5） |
| 17 | `GET /v1/accounts/{aid}/app/archive` | 支持已停止的容器（R6） |
| 18 | `PUT /v1/accounts/{aid}/app/archive` | 同上 |
| 19 | `GET /v1/accounts/{aid}/app/top` | 固定 `ps_args`（R7） |
| 20 | `PUT /v1/accounts/{aid}/resolv` | 不存在时新建（R11） |
| 21 | `PUT /v1/accounts/{aid}/firewall` | 辅助镜像 = 网关正在运行的镜像（R12） |
| 22 | `POST /v1/accounts/{aid}/jobs` | 内存 1 GiB 起、可到 2 GiB；新增 `memory_bytes`（R8） |
| 23 | `GET /v1/gateway` | 新增 `managed_by` |
| 24 | `POST /v1/gateway/ensure` | **新增**，取代 `PUT /v1/gateway` 和 `POST /v1/gateway/start` |
| 25 | `POST /v1/gateway/recreate` | **新增**（R13） |
| 26 | `POST /v1/gateway/exec` | 同 16 |
| 27 | `PUT /v1/gateway/networks/{aid}` | 不变 |
| 28 | `DELETE /v1/gateway/networks/{aid}` | 不存在时 204 |
| 29 | `PUT /v1/gateway/files/{name}` | 网关不存在时也允许（R13） |
| 30 | `POST /v1/controller/upgrade` | 改为 compose 流程（X5）；要求两个镜像标签 |
| 31 | `GET /v1/controller/upgrade` | 字段扩充 |
| — | `PUT /v1/gateway`、`POST /v1/gateway/start` | **删除**（X4） |

其他差异：一实例一 guard（X2）；鉴权增加控制器身份核对（§3.2 第 3 项）；错误体增加 `reason`、`names`（R4）；新增 405、413、422、504。

---

## 4. policy 包：所有 Docker 创建参数

### 4.1 原则

1. **请求体只在这里拼。** 每种资源一个纯函数，输入是已经校验过的业务参数，输出是完整的 Docker 请求体结构体。测试对每个函数断言**整个** JSON（黄金文件 `testdata/policy/*.json`），改动任何一项都会失败，审查时一眼能看到。
2. **与 Python 同形。** 名字、标签、挂载写法（`Binds` 字符串而不是 `Mounts` 对象）、资源参数都与 docker-py 生成的请求一致，这样 inspect 出来的 `Mounts[].Mode`、`Propagation` 等字段与 Python 建的容器相同，回滚后 Python 能原样认领（RB8）。只在 Python 明显不安全的地方收紧（一次性容器），逐项标出。
3. **控制器只能填空。** 能力、安全选项、网络模式、挂载、重启策略、日志、特权、设备、命名空间、sysctl，没有一项来自请求。
4. **没写的字段用 daemon 默认值**，与 Python 当时得到的相同（例如 `IpcMode`、`ShmSize`、`Ulimits`、AppArmor 和 seccomp 默认配置）。
5. **一次性容器的名字**沿用 Python 的 `<p>-oneshot-<16 位 hex>`，另带标签 `io.sup2api.ccgateway.guard-job=<前缀>`、不带账号标签。理由：guard 崩溃留下的残留，回滚后的 Python 也认得（`_stale_helper`）；guard 启动时、删网络和卷时（R15）用同一套规则清理。总设计稿 §6.1 的 `<p>-job-<aid>-<随机>` 不再使用。

公共片段：

```go
var noNewPriv = []string{"no-new-privileges:true"}
var appLog = LogConfig{Type: "json-file", Config: map[string]string{"max-size": "20m", "max-file": "3"}}
var oneshotLog = LogConfig{Type: "json-file", Config: map[string]string{"max-size": "1m", "max-file": "1"}}
```

### 4.2 账号容器 `policy.App`

```json
{
  "Image": "<image>",
  "User": "1000:1000",
  "Env": ["<按名字排序的 K=V>"],
  "Labels": {
    "io.sup2api.ccgateway.account": "<aid>",
    "io.sup2api.ccgateway.auth": "<auth_label>",
    "io.sup2api.ccgateway.image": "<image_label>"
  },
  "HostConfig": {
    "Binds": [
      "<p>-<aid>-data:/work:rw",
      "/opt/ccgateway-runtime/<aid>/resolv.conf:/etc/resolv.conf:ro"
    ],
    "NetworkMode": "<p>-<aid>-net",
    "Memory": 1073741824,
    "NanoCpus": 2000000000,
    "PidsLimit": 256,
    "Init": true,
    "CapDrop": ["ALL"],
    "SecurityOpt": ["no-new-privileges:true"],
    "LogConfig": {"Type": "json-file", "Config": {"max-size": "20m", "max-file": "3"}},
    "Privileged": false
  },
  "NetworkingConfig": {
    "EndpointsConfig": {"<p>-<aid>-net": {"IPAMConfig": {"IPv4Address": "<ipv4>"}}}
  }
}
```

| 项 | Python（`manager._create_app` + `common`） | guard | 说明 |
|---|---|---|---|
| 名字 | `<p>-<aid>-app` | 同 | |
| 镜像 | `plan.image_ref` | `image`，本地必须已有 | |
| 用户 | `1000:1000` | 同 | |
| 标签 | account、auth、image | 同；account 由 guard 加 | 控制器只能填 auth、image 两个值 |
| 网络 | `network=<net>` + `create_endpoint_config(ipv4)` | `NetworkMode` + `EndpointsConfig` | 同形 |
| 挂载 | `volumes={vol: rw, resolv: ro}` → `Binds` | 同两条 `Binds` | Python 的源路径是 `self.dir(aid)/resolv.conf`，即 `/opt/ccgateway-runtime/<aid>/resolv.conf`；迁移后路径不变（发布方案 §2.6） |
| 内存 | `mem_limit='1g'` = 1073741824 | 默认同值，可在 256 MiB–4 GiB 内指定 | |
| CPU | `nano_cpus=2e9` | 默认同值，可在 0.1–4 内指定 | |
| 进程数 | 256 | 同 | |
| init | 是 | 同 | |
| 能力 | `cap_drop=ALL` | 同；没有 `CapAdd` | |
| 安全 | `no-new-privileges:true` | 同 | |
| 日志 | json-file 20m×3 | 同 | |
| 重启策略 | 无 | 无（不写 `RestartPolicy`） | 宿主机重启后由核心下发时启动（BUG-23） |
| 环境 | `app_environment` 的 dict | 控制器传入，guard 只校验格式和大小 | 内容（含凭据）是控制器的职责 |
| 特权、设备、宿主命名空间、sysctl、`docker.sock` | 无 | 无，且没有任何字段能设 | I3 |

### 4.3 网络

**账号内部网 `policy.AccountNetwork`：**

```json
{
  "Name": "<p>-<aid>-net",
  "Driver": "bridge",
  "Internal": true,
  "EnableIPv6": false,
  "IPAM": {"Driver": "default", "Config": [{"Subnet": "<subnet>", "Gateway": "<.1>"}]},
  "Labels": {"io.sup2api.ccgateway.account": "<aid>", "io.sup2api.ccgateway.network": "<policy_label>"}
}
```

**网关 uplink `policy.GatewayUplink`：** 同上，但 `Name` 为 `<p>-d0000000000000000-xray-uplink`、`Internal: false`、账号标签为 `d0000000000000000`。它是 NAT 模式网桥：网关经它出网，Docker 自带 MASQUERADE。

| 项 | Python（`ensure_network`） | guard |
|---|---|---|
| 驱动 | bridge | 同 |
| internal | 账号网 True，uplink False | 同，由函数决定，不来自请求 |
| IPv6 | False | 同 |
| IPAM | 一个池：子网 + `.1` | 同；`gateway` 必须等于 `.1` |
| 标签 | account + `network=json.dumps(policy, sort_keys=True)` | account + `policy_label`（控制器用 pyjson 编好，X8） |
| 网段 | `allocate_subnet` 在控制器里算 | 仍由控制器算；guard 校验 RFC1918、前缀 24–29、不重叠 |
| 网桥名、MTU 等 `Options` | 无 | 无 |

### 4.4 数据卷 `policy.Volume`

```json
{"Name": "<p>-<aid>-data", "Driver": "local",
 "DriverOpts": {"size": "<size_bytes>"},
 "Labels": {"io.sup2api.ccgateway.account": "<aid>", "io.sup2api.ccgateway.disk-quota-bytes": "<size_bytes>"}}
```

无配额时：`{"Name", "Driver": "local", "Labels": {"io.sup2api.ccgateway.account": "<aid>"}}`，与 `_data_volume` 的第二次 `volumes.create` 相同。

### 4.5 账号防火墙辅助容器 `policy.FirewallHelper`

```json
{
  "Image": "<网关容器 inspect 的 Image，即镜像 ID>",
  "Entrypoint": ["sh", "-ec"],
  "Cmd": ["<NFT_REPLACE>ip route replace default via <default_gateway>"],
  "Labels": {"io.sup2api.ccgateway.guard-job": "<p>"},
  "HostConfig": {
    "NetworkMode": "container:<app 容器 ID>",
    "CapDrop": ["ALL"],
    "CapAdd": ["NET_ADMIN"],
    "SecurityOpt": ["no-new-privileges:true"],
    "Binds": ["/opt/ccgateway-runtime/<aid>/app.nft:/app.nft:ro"],
    "Memory": 67108864,
    "PidsLimit": 32,
    "LogConfig": {"Type": "json-file", "Config": {"max-size": "1m", "max-file": "1"}}
  }
}
```

`NFT_REPLACE` 是 guard 里的常量，与 `manager.NFT_REPLACE` 逐字相同：

```text
if nft list table inet ccg_app >/dev/null 2>&1; then { printf "delete table inet ccg_app\n"; cat /app.nft; } | nft -f -; else nft -f /app.nft; fi; 
```

| 项 | Python（`manager.helper`） | guard | 说明 |
|---|---|---|---|
| 镜像 | `image_of(shared.container())` | 同（R12） | 控制器不能指定 |
| 入口 | `sh -ec` + 固定脚本 | 同；脚本由 guard 拼，控制器只给网关地址（已校验） | |
| 网络 | `container:<app.id>` | 同 | 只进账号容器的网络命名空间 |
| 能力 | ALL 去掉，加 NET_ADMIN | 同 | NET_ADMIN 只对这个命名空间有效（没有用户命名空间，作用于 app 的网络命名空间） |
| 挂载 | `app.nft` 只读 | 同 | |
| 内存、进程数 | 无 | 64 MiB、32 | 收紧 |
| 名字 | `<p>-oneshot-<hex>` | 同 | §4.1 第 5 条 |
| 日志 | daemon 默认 | json-file 1m×1 | 收紧 |

### 4.6 一次性任务 `policy.Job`

```json
{
  "Image": "<image>",
  "Entrypoint": ["<entrypoint...>"],
  "Cmd": ["<argv...>"],
  "User": "0 | 1000:1000",
  "Labels": {"io.sup2api.ccgateway.guard-job": "<p>"},
  "HostConfig": {
    "NetworkMode": "none",
    "CapDrop": ["ALL"],
    "CapAdd": ["<caps，可为空>"],
    "SecurityOpt": ["no-new-privileges:true"],
    "Binds": ["<p>-<aid>-data:/work:rw|ro"],
    "Memory": 1073741824,
    "PidsLimit": 64,
    "NanoCpus": 2000000000,
    "LogConfig": {"Type": "json-file", "Config": {"max-size": "1m", "max-file": "1"}}
  }
}
```

`volume: none` 时没有 `Binds`；`caps` 为空时没有 `CapAdd`。stdout 用 `GET /containers/{id}/logs?stdout=1&stderr=0` 取（json-file 驱动），与 docker-py `containers.run` 默认只返回 stdout 相同；1 MiB 的日志上限远大于 64 KiB 的返回上限。

控制器的三种用法与 Python 对照：

| 用法 | Python | guard 请求 | 变化 |
|---|---|---|---|
| 准备数据卷（`PREPARE_VOLUME`） | user 0，`network none`，卷 rw，**Docker 默认 14 项能力，没有 no-new-privileges**，无资源上限 | user `0`，`volume: rw`，`caps: [CHOWN, DAC_OVERRIDE]` | 去掉 12 项能力，加 no-new-privileges 和上限（BUG-20） |
| 配额校验（`verify_disk_quota`） | user 1000:1000，`cap_drop ALL`，nnp，卷 ro | user `1000:1000`，`volume: ro`，`caps: []` | 只加上限 |
| CLI 探测（`resolve_profile`） | user 0，`cap_drop ALL`，nnp，无挂载 | user `0`，`volume: none`，`caps: []`，内存 1 GiB | 只加上限（R8：要读入并哈希最大 512 MiB 的文件） |

**准备数据卷需要的最小能力。** 脚本：

```sh
mkdir -p /work/config /work/data; rm -f /work/data/environment.json;
printf '{"auto_update":false,"channel":"stable"}\n' > /work/data/cli-update.json;
chown -R 1000:1000 /work
```

以 uid 0 运行但没有能力时，内核把它当普通用户做权限检查。逐条看：

| 操作 | 新卷（`/work` 属 root） | 已用过的卷（内容属 1000，CLI 会建 0700 目录） | 需要的能力 |
|---|---|---|---|
| `mkdir -p /work/config /work/data` | root 是属主，能建 | `/work` 已被 chown 给 1000，root 不再是属主 | `DAC_OVERRIDE` |
| `rm -f /work/data/environment.json` | 不存在，无操作 | 在 1000 所有的目录里删文件 | `DAC_OVERRIDE` |
| 写 `/work/data/cli-update.json` | 能写 | 覆盖 1000 所有的文件 | `DAC_OVERRIDE` |
| `chown -R 1000:1000 /work` | 改属主 | 改属主；递归进入 1000 所有的 0700 目录 | `CHOWN`；遍历目录要 `DAC_OVERRIDE`（它也覆盖目录的搜索权限，不需要 `DAC_READ_SEARCH`） |

`FOWNER` 不需要：脚本没有 `chmod`、`utime`、设置 ACL，也不在带粘滞位的目录里删别人的文件。guard 的允许集合仍包含 `FOWNER`（R8），以免将来脚本加 `chmod -R` 时要改 guard；但控制器只应请求 `CHOWN` 和 `DAC_OVERRIDE`，guard 在日志里对带 `FOWNER` 的任务记一笔，便于审查。

这些能力的作用范围：容器没有网络，只挂本账号的数据卷，`no-new-privileges` 阻止镜像里的 setuid 程序提权。它能改的只有本账号卷里的文件，而控制器经 Worker 本来就能改这些文件。

### 4.7 读镜像文件 `policy.ImageReader`

```json
{"Image": "<ref>", "Entrypoint": ["true"], "NetworkDisabled": true,
 "Labels": {"io.sup2api.ccgateway.guard-job": "<p>"},
 "HostConfig": {"NetworkMode": "none", "CapDrop": ["ALL"], "SecurityOpt": ["no-new-privileges:true"],
                "LogConfig": {"Type": "none"}}}
```

与 `dockerfs.image_container` 相同：从不启动，读完强制删除（`v=true`）。名字用 `<p>-oneshot-<hex>`（Python 用 Docker 随机名，guard 改为可识别的名字，便于清理残留）。

### 4.8 网关（compose 服务 `egress`）

网关不再由 guard 拼 create 请求（X4），定义在 compose.yml（§9.5）。逐项对照 `SharedEgress.create`：

| 项 | Python | compose |
|---|---|---|
| 名字 | `<p>-shared-egress` | `container_name: ${CCG_PREFIX:-ccg}-shared-egress` |
| 镜像 | `CCG_XRAY_IMAGE` 或 egress 目标，须带 `shared-egress=1` | `${CCG_GATEWAY_IMAGE}`（`.env`）；guard 在 `recreate` 前核对标签 |
| 网络 | uplink 网 | `networks: [uplink]`（外部网络） |
| 标签 | `shared=<p>` | `labels: {io.sup2api.ccgateway.shared: ${CCG_PREFIX:-ccg}}`（另有 compose 自己的标签） |
| init | 是 | `init: true` |
| 能力 | ALL 去掉，加 NET_ADMIN、NET_BIND_SERVICE | `cap_drop: [ALL]`，`cap_add: [NET_ADMIN, NET_BIND_SERVICE]` |
| 安全 | no-new-privileges | 同 |
| sysctl | `net.ipv4.ip_forward=0`、`net.ipv6.conf.all.disable_ipv6=1` | 同 |
| 挂载 | `<root>/shared-egress` → `/config` 只读 | 同（bind，`create_host_path: false`） |
| 内存 | 384m | `mem_limit: 384m` |
| 进程数 | 256 | `pids_limit: 256` |
| CPU | 2 | `cpus: 2` |
| 环境 | `GOMAXPROCS=2` | 同 |
| 重启 | unless-stopped | 同 |
| 日志 | json-file **10m**×3 | 同（不是 20m） |

`/config` 里不再有 `state.json`（迁到控制器数据根，发布方案 §2.6），网关读不到代理凭证。

### 4.9 控制器（compose 服务 `controller`）

同样在 compose.yml 里，guard 不拼请求体。与 0.1.226 `docker run` / `upgrade.py` 的对照：

| 项 | 旧（host 网络 + `docker.sock`） | compose |
|---|---|---|
| 网络 | host | `ccg-control`，`ipv4_address: 172.29.255.2`；`ports: 127.0.0.1:8787:8787` |
| 挂载 | `docker.sock` 读写、`/opt/ccgateway-runtime` 读写 | 只有 `/opt/ccgateway-controller:/data` |
| 用户、能力 | root，Docker 默认 14 项能力 | root（第一期），`cap_drop: [ALL]`，没有 `cap_add` |
| 根文件系统 | 可写 | `read_only: true`，`tmpfs: /tmp:size=64m` |
| 资源 | 无 | `mem_limit: 2g`（2026-11-01 由 1g 提高，见 evidence/2026-11-01-production §3），`pids_limit: 512` |
| 环境 | 环境文件 | `env_file` + `environment`（`CCG_RUNTIME_ROOT=/data`、`CCG_CONTROLLER_BIND=0.0.0.0`、`CCG_GUARD_URL`、`CCG_GUARD_TOKEN`、`CCG_CONTROLLER_IMAGE`） |
| 健康 | 无（升级脚本自己轮询 `/health`） | `healthcheck: ["CMD", "/ccg-controller", "healthcheck"]` |
| 镜像要求 | — | guard-api=1 且 shared-egress=1；只有 CMD |

---

## 5. dockerapi 包

### 5.1 传输与 API 版本

- `http.Transport{DialContext: 拨 unix socket, Proxy: nil, DisableCompression: true, MaxIdleConnsPerHost: 16, IdleConnTimeout: 90 s, ForceAttemptHTTP2: false}`；基地址 `http://docker/v<版本>`。
- **固定 API 版本，取值与 Python 控制器实际使用的版本相同。** 0.1.118 的控制器镜像装的是 `docker==7.1.0`，`docker.from_env(timeout=60)` 没有指定版本。S0 在该镜像里执行 `python -c "import docker; print(docker.from_env().api.api_version)"`（只读）读出这个值，写进 guard 的常量 `dockerapi.Version`。本文暂按 1.47 书写，若读出的是别的值（例如 docker-py 的默认值 1.45，或协商得到的 1.52）就以读出的为准。理由：inspect 的应答形状随 API 版本变化，`container_identity` 要与 Python 存下的值逐字节相同（RB4），guard 返回的原始 inspect 必须与 Python 当时看到的同一版本。Docker 29 支持的最低版本是 1.44，1.44 以上需要的字段（`EndpointsConfig.IPAMConfig`、`Mounts`、`State.Health`、`/events` 过滤器）都在。启动时 `GET /version`（不带版本前缀）核对 `MinAPIVersion <= dockerapi.Version <= ApiVersion`，并把双方版本写进日志。§11.7 的集成测试对同一个 Python 建的容器，比较 guard 的原始 inspect 与 docker-py 的 `attrs` 算出的 `container_identity` 是否相同。
- 每个调用都带 `context`；默认时限 60 s（与 docker-py 相同），exec 110 s，拉取和导入 30 min，事件流不设时限。
- 应答读取：inspect 和 list 最多读 8 MiB（`io.LimitReader`），`json.Valid` 后作为 `Raw` 返回；需要内部判断的字段另外解码到小结构体（`ContainerInfo{ID, Name, Image, State{Status, Running, Pid, StartedAt, Health}, Config{Image, Labels}, HostConfig{NetworkMode}, Mounts[], NetworkSettings.Networks}`）。
- 错误：非 2xx 时读最多 64 KiB 的 `{"message"}`，返回 `*dockerapi.Error{Status, Message}`。`Message` 只用于判断（例如卷的 `no quota support`、exec 的 `is not running`）和 guard 自己的调试日志（截断到 200 字节，且只在 `debug` 级别），**从不**进入给控制器的应答。`start`/`stop` 的 304 视为成功。

### 5.2 端点清单

| 用途 | Docker API |
|---|---|
| 版本 | `GET /version` |
| 容器 | `GET /containers/{id}/json`、`POST /containers/create?name=`、`POST /containers/{id}/start`、`POST /containers/{id}/stop?t=`、`POST /containers/{id}/restart?t=`、`POST /containers/{id}/kill`、`POST /containers/{id}/wait?condition=not-running`、`DELETE /containers/{id}?force=1&v=0\|1`、`GET /containers/json?all=1&filters=`、`GET /containers/{id}/top?ps_args=`、`GET /containers/{id}/logs?stdout=1&stderr=0` |
| 归档 | `GET /containers/{id}/archive?path=`、`PUT /containers/{id}/archive?path=` |
| exec | `POST /containers/{id}/exec`、`POST /exec/{id}/start`、`GET /exec/{id}/json` |
| 网络 | `GET /networks`、`GET /networks/{id}`、`POST /networks/create`、`DELETE /networks/{id}`、`POST /networks/{id}/connect`、`POST /networks/{id}/disconnect` |
| 卷 | `GET /volumes?filters=`、`GET /volumes/{name}`、`POST /volumes/create`、`DELETE /volumes/{name}` |
| 镜像 | `GET /images/{ref}/json`、`POST /images/create?fromImage=&tag=`、`POST /images/load?quiet=1` |
| 事件 | `GET /events?since=&filters=` |

没有 `POST /containers/{id}/update`、`/commit`、`/build`、`/plugins`、`/swarm`、`/secrets`、`/images/{name}/tag`、`/images/{name}` 的 DELETE、`/system/prune` 等任何其他接口。`dockerapi` 包只导出上表的函数，测试用一个记录请求的假 socket 断言它不会发出别的路径（§11.2）。

### 5.3 exec 与帧解析

1. `POST /containers/{id}/exec`：`{"AttachStdout": true, "AttachStderr": true, "AttachStdin": false, "Tty": false, "Cmd": argv, "User": user, "Privileged": false}`（没有 `Env`、`WorkingDir`，与 docker-py `exec_run` 默认相同）。409 → `not_running`。
2. `POST /exec/{id}/start`：`{"Detach": false, "Tty": false}`，请求头带 `Connection: Upgrade`、`Upgrade: tcp`。daemon 回 101（`http.Response.Body` 是 `io.ReadWriteCloser`）或 200 加原始流，两种都接受。
3. 解析多路复用帧：每帧 8 字节头 `[stream, 0, 0, 0, size(大端 uint32)]`，`stream` 为 1（stdout）或 2（stderr）；0（stdin）或其他值视为协议错误。载荷按到达顺序追加到同一个缓冲区（R5 的合并输出）。累计超过上限（16 MiB）就关闭连接，返回 `ErrOutputTooLarge`。读到 EOF 结束；半帧（头或载荷不完整）是协议错误。
4. `GET /exec/{id}/json`：`Running` 为假时取 `ExitCode`；流结束后仍在运行的，100 ms 一次最多等 1 s，仍未结束则报错（不会发生在正常路径上）。

任务容器的 stdout 用 `logs?stdout=1&stderr=0` 取，返回的是同样的多路复用帧（非 TTY），只保留 `stream == 1` 的载荷，上限 64 KiB。

### 5.4 拉取与导入的逐行 JSON

两者的应答体都是一串 JSON 对象（每行一个），HTTP 状态码在开始时就是 200，失败只体现在某一行里：

```go
type progress struct {
    Status      string `json:"status"`
    Stream      string `json:"stream"`
    Error       string `json:"error"`
    ErrorDetail *struct{ Message string `json:"message"` } `json:"errorDetail"`
}
```

- 用 `bufio.Reader` 逐行读，单行最多 1 MiB（超过即协议错误，防止异常大行占满内存）；空行跳过；每行 `json.Unmarshal` 到 `progress`，解析失败是协议错误。
- `Error != ""` 或 `ErrorDetail != nil`：记住第一处错误，**继续读到 EOF**（提前关闭连接会让 daemon 中止操作，状态不可预测），最后返回错误。
- 正常结束必须是 EOF；连接中途断开（`io.ErrUnexpectedEOF`、上下文取消）是错误。
- 导入：从 `Stream` 里收集 `Loaded image: <名字>` 和 `Loaded image ID: sha256:<hex>` 两种行（去掉结尾换行），交给 §3.6.4 第 5 步核对。

### 5.5 事件流

- `GET /events?since=<上次的 time>&filters={"type":["container","network"]}`。不按标签过滤：网络事件的 `Actor.Attributes` 里没有网络的标签，按标签过滤会漏掉 connect/disconnect。流量很小（ovh 上每分钟几条）。
- 解码：`json.Decoder` 循环 `Decode(&Event)`，`Event{Type, Action, Actor{ID, Attributes map[string]string}, Time, TimeNano}`。`Action` 可能带冒号后缀（`exec_start: sh -c ...`、`health_status: healthy`），只取冒号前的部分。
- 返回 `<-chan Event` 和 `<-chan error`；流结束或出错时关闭，由 watch 负责重连（§8）。

---

## 6. files 包

### 6.1 目录句柄与路径规则

guard 管理的宿主文件只有这些，都在 `RuntimeRoot`（`/opt/ccgateway-runtime`）下：

| 相对路径 | 写法 | 权限 | 谁读 |
|---|---|---|---|
| `<aid>/resolv.conf` | 新建：`WriteReplace`；已存在：`RewriteInPlace` | root 0644 | 账号容器（只读 bind） |
| `<aid>/app.nft` | `WriteReplace` | root 0600 | 防火墙辅助容器（只读 bind） |
| `shared-egress/{boot.json,boot.nft,dns.json,active.nft,operation.json}` | `WriteReplace` | root 0600 | 网关（目录只读 bind；网关进程是 root） |

另有 `ProjectDir/.env`（§9.4）和 `StateDir` 下 guard 自己的文件，用同一套函数。

- **打开根目录：** 从 `/` 开始逐级 `openat(..., O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC)`，每一级 `fstat`：必须是目录、属 uid 0、没有组和其他人的写位（`mode & 0o022 == 0`）。任何一级不满足就拒绝启动（§2.4 第 4 步）。根目录的 fd 常驻。
- **相对路径：** 每一段匹配 `[A-Za-z0-9._-]{1,64}`，不是 `.` 或 `..`；`<aid>` 段必须匹配 KEY。每次操作都从根 fd 起逐级 `openat(O_NOFOLLOW|O_DIRECTORY)`，从不拼接字符串路径再 `open`。
- **建目录：** 只允许 `<aid>` 和 `shared-egress` 两种目录，`mkdirat(0700)` 后再 `openat(O_NOFOLLOW)` 并 `fstat` 核对。

### 6.2 写入

**`WriteReplace(dir, name, data, mode)`（新 inode）：**

1. `openat(dirfd, ".<name>.tmp-<8 字节 hex>", O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC, mode)`；
2. 写满 `data`；`fchmod(mode)`（不依赖 umask）；`fsync`；
3. `renameat(dirfd, tmp, dirfd, name)`：目标若是符号链接，被替换的是链接本身，不会跟随；目标是目录则失败；
4. `fsync(dirfd)`；
5. 任何一步失败都 `unlinkat` 临时文件。

**`RewriteInPlace(dir, name, data, mode)`（保持 inode，只给 `resolv.conf`）：**

1. `openat(dirfd, name, O_WRONLY|O_NOFOLLOW|O_NONBLOCK|O_CLOEXEC)`。`O_NOFOLLOW` 使符号链接返回 `ELOOP`；`O_NONBLOCK` 使事先放好的 FIFO 返回 `ENXIO` 而不是阻塞住 guard。文件不存在就改走 `WriteReplace`。
2. `fstat`：必须是普通文件、属 uid 0、`nlink == 1`。不满足（被换成了链接、硬链接或特殊文件）：不写，返回 `ErrMountSource`。处理办法见 §6.4。
3. `pwrite(data, 0)`，再 `ftruncate(len(data))`。先写后截断，读者不会看到空文件（Python 是先截断再写，会有一瞬间是空的）；`fchmod(0644)`；`fsync`。

`.env` 的改写用 `WriteReplace`（inode 变化没有关系，compose 每次按路径读）。

### 6.3 挂载源复核

`VerifyFile(abs)` 和 `VerifyDir(abs)` 在每次 `start`、`restart`（账号容器）和网关 `start`、`ensure`、`recreate` 之前调用：

- 路径必须以 `RuntimeRoot + "/"` 开头，剩余部分按 §6.1 的规则切段；
- 逐级 `openat(O_NOFOLLOW|O_DIRECTORY)`，每一级属 root、没有组和其他人的写位；
- **文件**（`resolv.conf`）：最后一段 `openat(O_RDONLY|O_NOFOLLOW|O_NONBLOCK)` + `fstat`：普通文件、属 root、`nlink == 1`、`mode & 0o022 == 0`；
- **目录**（`shared-egress`）：除上面的目录检查外，读出全部目录项，每项都必须是普通文件、属 root、`nlink == 1`。符号链接、子目录、FIFO、硬链接都拒绝。文件名只能是 5 个网关配置文件，或临时文件（guard 的 `.<名字>.tmp-<hex>`、Python 留下的 `*.tmp`）；**出现 `state.json` 也拒绝**：它含所有账号的代理凭证，接管时应已搬走（发布方案 §2.6），还在就说明搬迁没做完，网关不能带着它启动（BUG-20 第三项）。
- 不通过：403 `mount_source_rejected`，容器不动，日志 `mount_source_rejected` 带相对路径和原因（`symlink`、`hardlink`、`owner`、`type`）。

此外，账号容器 inspect 里的 `Mounts` 必须**恰好**是 §4.2 的两项（§3.5.7），网关必须恰好是 `/config` 一项绑定加 compose 声明的网络。

### 6.4 启动时的全量复核

接管前，`/opt/ccgateway-runtime` 由 Python 控制器读写，可能留着它（或攻击者）放进去的链接。guard 每次启动时扫描所有 `<aid>/resolv.conf`、`<aid>/app.nft` 和 `shared-egress/`：

- 结果写日志 `mount_source_sweep {checked, rejected:[相对路径+原因]}`，`/v1/health` 的 `firewall` 字段不受影响，但另有计数器。
- 不自动修复：不通过的账号，`start`/`restart` 一律 403，直到控制器再次 `PUT resolv`。那时 `RewriteInPlace` 会失败，guard 改用 `WriteReplace` 把它换成正常文件（新 inode），并回 409 `mount_source_replaced`、`names: [<p>-<aid>-app]`，提示"运行中的容器可能仍挂着旧的目标文件，必须删除重建"。B 把它归入"未命名 → 503"，同时记错误日志；运维按日志处理（这只会出现在接管前就被篡改过的主机上）。
- 发布方案 S4 的前置检查应当加一项：`find /opt/ccgateway-runtime -type l -o -links +1 -type f` 输出为空（§13.3）。

### 6.5 syscall 与 x/sys 的取舍

用到的系统调用：`Open`、`Openat`、`Fstat`、`Mkdirat`、`Renameat`、`Unlinkat`、`Fchmod`、`Fsync`、`Ftruncate`、`Pwrite`、`Flock`、`SetsockoptInt(IP_FREEBIND)`。它们在 Go 1.24 标准库 `syscall` 的 linux/amd64、linux/arm64 实现里都有，所以**不引入 `golang.org/x/sys`**：

- 好处：模块没有任何外部依赖，guard 的供应链只有 Go 工具链本身；审查只看标准库。
- 代价：`syscall` 包已冻结，没有 `openat2(RESOLVE_NO_SYMLINKS)` 这类新接口。用逐级 `openat(O_NOFOLLOW)` 达到同样的效果（多几次系统调用，文件很少，可以忽略）。
- 不用 Go 1.24 的 `os.Root`：它允许根目录内部的符号链接（只防止逃出根目录），而这里要求整条路径上没有任何链接；`Root.Rename`、`Chmod` 要到 1.25 才有。

这些代码放在 `//go:build linux` 的文件里；其他平台的桩实现返回 `errors.ErrUnsupported`，只为了让开发机上 `go vet ./...` 能通过。相关测试也是 linux 专属，CI 必须在 Linux 上跑并核对数量（§11.4）。

---

## 7. firewall 包

### 7.1 三条链与跳转

链名 = `ChainPrefix` + 固定后缀；生产 `CCG`，隔离实例 `CCG-GT`。`ChainPrefix` 匹配 `[A-Z][A-Z0-9-]{0,14}`，保证链名不超过 28 个字符。

| 链 | 跳转位置 | 跳转规则（生产） |
|---|---|---|
| `CCG-PROXY-BRIDGE` | `DOCKER-USER` 第 1 条 | `-m comment --comment ccgateway-managed-proxy-bridge -j CCG-PROXY-BRIDGE` |
| `CCG-CONTROL-FWD` | `DOCKER-USER` 第 1 条 | `-m comment --comment ccgateway-managed-control-fwd -j CCG-CONTROL-FWD` |
| `CCG-CONTROL-IN` | `INPUT` 第 1 条 | `-m comment --comment ccgateway-managed-control-in -j CCG-CONTROL-IN` |

- 第一条跳转的注释与现有 bridge guard 完全相同，所以 S1 切换时 guard 认得内核里已有的跳转，不会再插一条。非默认前缀时注释加 `-<链名小写>` 后缀，与 bridge guard 的 `--chain` 规则一致（测试 6）。
- 三条链只匹配与 ccgateway 相关的流量，彼此不相交，跳转的先后没有关系。`DOCKER-USER` 在 `DOCKER-FORWARD` 之前（ovh 已核对），链里 ACCEPT 的包不会再被 Docker 的隔离规则拦下。
- 跳转维护：每次写规则后，以及每 60 s，执行 `iptables -w 5 -S DOCKER-USER`（和 `INPUT`），按注释和目标找出本链的跳转。没有就 `-I <链> 1`；多于一条就逐条 `-D` 多余的（崩溃重启可能留下重复）。从不改动其他规则。

### 7.2 `CCG-PROXY-BRIDGE`：账号 → 共享网关的 veth 放行

逻辑从 `ccgateway-bridge-guard.py` 的 `rules_for_account` 移植，**输入全部改为 Docker 查询结果**，不读控制器的 `state.json`：

| 原输入 | 新来源 |
|---|---|
| `state.app_ip` | app 在 `<p>-<aid>-net` 上的 `IPAddress` |
| `state.gateway_ip` | 网关在 `<p>-<aid>-net` 上的 `IPAddress` |
| `state.status == 'blocked'` | 不再需要：阻断时控制器会停掉 app 并把网关断开（`manager.block` → `shared.remove`），app 不在运行就不放行 |
| `<root>/<aid>/` 目录枚举 | 本前缀、名字可反解析的 `<p>-<aid>-app` 容器（`watch.State` 维护） |

纯函数：

```go
type BridgeInput struct {
    AID          string
    App, Gateway *dockerapi.ContainerInfo
    Network      *dockerapi.NetworkInfo
    AppVeth, GatewayVeth string
    DefaultRoute string            // app 网络命名空间里唯一一条默认路由的网关；没有或多于一条为 ""
    Prefix       string
}
func BridgeRules(in BridgeInput) []Rule // 不满足任何一条就返回 nil（不报错）
```

全部条件（任何一条不满足就不放行这个账号）：

1. `AID` 匹配 KEY；
2. 两个 veth 都匹配 `veth[0-9a-f]+` 且不相同；
3. app 和网关都是 `running`；
4. app 的 `account` 标签等于 `AID`；
5. 网络 `Internal` 为真，`account` 标签等于 `AID`；
6. 网关的 `shared` 标签等于 `Prefix`；
7. app 只接了这一张网（`NetworkSettings.Networks` 的键集合恰好是 `{<p>-<aid>-net}`）；
8. app 和网关在这张网上的 `NetworkID` 都等于网络的 `Id`；
9. 两个地址都是这张网子网内的合法 IPv4，且不相同；
10. `DefaultRoute` 等于网关在这张网上的地址（原 `discover` 里的路由检查，移进纯函数，方便测试）。

规则文本与现有完全相同：

```text
-A CCG-PROXY-BRIDGE -m physdev --physdev-is-bridged --physdev-in <app veth> --physdev-out <gw veth> \
   -s <app>/32 -p tcp -m comment --comment ccgateway-<aid>-proxy-out -j ACCEPT
-A CCG-PROXY-BRIDGE -m physdev --physdev-is-bridged --physdev-in <gw veth> --physdev-out <app veth> \
   -d <app>/32 -m conntrack --ctstate ESTABLISHED,RELATED -m comment --comment ccgateway-<aid>-proxy-return -j ACCEPT
```

账号按 KEY 的字符串顺序排列，保证同样的输入总是得到同样的规则文本（用于"规则不变就不写"）。

### 7.3 veth 查找、路由与缓存

- **veth：** `nsenter -t <State.Pid> -n ip -j address`，找出 `addr_info[].local` 等于该地址的唯一接口（多于或少于一个都算失败），取它的 `link_index`，再在宿主机 `/sys/class/net/*/ifindex` 里找到同号的接口名。新增一项核对：`/sys/class/net/<veth>/master` 指向这个账号网络的网桥（`com.docker.network.bridge.name` 选项，或 `br-<网络 ID 前 12 位>`）。宿主机接口表按需刷新：查不到时重读一次。
- **默认路由：** `nsenter -t <app Pid> -n ip -j route show default`。
- **缓存：**
  - veth：键 `(容器 ID, StartedAt, 地址)`。容器不重启、地址不变，就不再 `nsenter`。这是现在 23% CPU 开销的主要来源（每 3 秒对每个账号执行 3 次 `nsenter`）。
  - 默认路由：键 `(app ID, StartedAt, routeGen[aid])`。账号容器没有 `NET_ADMIN`，它的路由只会被 guard 起的防火墙辅助容器改动，所以 `PUT firewall`、`start`、`restart` 之后 `routeGen[aid]++` 即可。
  - 缓存项在容器 `destroy` 事件或 60 s 校对发现容器不在时删除。
- `nsenter` 和 `ip` 是镜像里的固定路径（`/usr/bin/nsenter`、`/usr/sbin/ip`），参数由 guard 拼，PID 来自 Docker inspect；每次调用时限 5 s，输出上限 1 MiB。

### 7.4 `CCG-CONTROL-FWD`：控制器 → Worker

对每个满足条件的账号（app 在运行、只在 `<p>-<aid>-net` 上、标签正确、地址合法；**不要求**网关存在，因为控制器在网关就绪之前就要连 Worker 管理口），生成两条：

```text
-A CCG-CONTROL-FWD -i ccg-control0 -o <账号网桥> -s 172.29.255.2/32 -d <app>/32 -p tcp -m tcp --dport 8787 \
   -m comment --comment ccgateway-<aid>-control -j ACCEPT
-A CCG-CONTROL-FWD -i <账号网桥> -o ccg-control0 -s <app>/32 -d 172.29.255.2/32 -p tcp -m tcp --sport 8787 \
   -m conntrack --ctstate ESTABLISHED,RELATED -m comment --comment ccgateway-<aid>-control-return -j ACCEPT
```

链尾固定两条：

```text
-A CCG-CONTROL-FWD -i ccg-control0 -m comment --comment ccgateway-control-egress-deny -j DROP
-A CCG-CONTROL-FWD -o ccg-control0 -m comment --comment ccgateway-control-ingress-deny -j DROP
```

- 控制器发往账号网桥的连接，经 `ccg-control` 自带的 `-s 172.29.255.0/29 ! -o ccg-control0 -j MASQUERADE` 改成账号网桥的 `.1`，Worker 看到的来源与 host 网络时代相同；回包在 PREROUTING 还原目的地址，所以第二条按 `-d 172.29.255.2` 匹配。
- 链尾的 `egress-deny`：控制器不能经宿主机转发到任何别的地方（其他容器、公网、宿主机所在网段）。
- 链尾的 `ingress-deny`（X12）：其他网桥上的容器、同网段的主机不能直连 `172.29.255.2:8787`。核心和 Caddy 走的是 `127.0.0.1:8787` 的端口映射，由 docker-proxy 在宿主机本地发起，经过的是 OUTPUT 和 INPUT，不经过 FORWARD，不受影响。每账号规则里的回程一条按 `-d 172.29.255.2` 匹配，原因见上一条。
- **DNS（X10）：** 控制器在用户自定义网络上，`/etc/resolv.conf` 指向 Docker 内置 DNS `127.0.0.11`。内置 DNS 由 dockerd 在宿主机的网络命名空间里向上游转发，查询不经过 FORWARD，也不经过 INPUT。所以默认不放行 53 端口。配置 `CCG_GUARD_CONTROL_DNS=1` 时，在两条 DROP 之前加入：

  ```text
  -A CCG-CONTROL-FWD -i ccg-control0 -s 172.29.255.2/32 -p udp -m udp --dport 53 -j ACCEPT
  -A CCG-CONTROL-FWD -i ccg-control0 -s 172.29.255.2/32 -p tcp -m tcp --dport 53 -j ACCEPT
  -A CCG-CONTROL-FWD -o ccg-control0 -d 172.29.255.2/32 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
  ```

  发布方案 §6.3 的负面检查"`nslookup example.com` 成功"正好验证默认配置可用。

### 7.5 `CCG-CONTROL-IN`：只允许控制器连 guard

全部是静态规则，不依赖 Docker：

```text
-A CCG-CONTROL-IN -i ccg-control0 -s 172.29.255.2/32 -d 172.29.255.1/32 -p tcp -m tcp --dport 8790 \
   -m comment --comment ccgateway-control-guard -j ACCEPT
-A CCG-CONTROL-IN -d 172.29.255.1/32 -p tcp -m tcp --dport 8790 -m comment --comment ccgateway-control-guard-deny -j DROP
-A CCG-CONTROL-IN -i ccg-control0 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
-A CCG-CONTROL-IN -i ccg-control0 -m comment --comment ccgateway-control-host-deny -j DROP
```

- 第二条不带入接口（X11）：宿主机本地进程（入接口 `lo`）、其他网桥上的容器、从公网口进来的包，只要目的是 guard 的端口，一律丢弃。
- 第三条放行控制器回给宿主机的包，即 docker-proxy 转发 `127.0.0.1:8787` 时，控制器返回的应答。
- 第四条：控制器发给宿主机任何地址（`172.29.255.1` 上的其他端口、`172.17.0.1`、公网 IP）的新连接一律丢弃。宿主机上只监听回环的服务（3130、8010、8795、6379 等）本来就连不到；监听 `0.0.0.0` 的服务也被这一条挡住。
- 其他入接口的流量落到链尾，返回 INPUT 继续原有的处理，不受影响。

### 7.6 写入：`iptables-restore --noflush`

```text
*filter
:CCG-PROXY-BRIDGE - [0:0]
-F CCG-PROXY-BRIDGE
-A CCG-PROXY-BRIDGE ...
:CCG-CONTROL-FWD - [0:0]
-F CCG-CONTROL-FWD
-A CCG-CONTROL-FWD ...
COMMIT
```

- 执行 `iptables-restore -w 5 --noflush`，输入从 stdin 给，时限 15 s。`--noflush` 加上只点名自己的链，Docker 和其他服务的规则都不受影响。
- **只写变了的链。** 每条链保留上次成功写入的规则文本；算出来相同就跳过。一次写入里出现的几条链在同一个事务里替换（nft 后端是一个 netlink 批次，原子生效）。
- **防外部改动：** 每 60 s 的校对里，对每条链执行一次 `iptables -w 5 -S <链>`，规范化（§7.9）后与上次写入的内容比较。不同（有人手工 `-F` 了、dockerd 重建了表）就强制重写，并记 `chain_drift`。
- 首次写入（启动时）不先清空链（发布方案 §10 C2）：首轮全量计算成功才整链替换，所以 S1 切换时，bridge guard 留在内核里的规则一直生效，直到被内容相同（或更新）的规则替换。

### 7.7 失败关闭

| 情况 | 处理 |
|---|---|
| 单个账号的数据取不到（容器在 inspect 和 nsenter 之间消失、nsenter 失败、地址有歧义） | 只去掉这个账号的规则，其他账号不受影响（测试 7）；日志 `account_bridge_skipped {aid, type}`；500 ms 后对该账号重试一次 |
| 整体计算失败（Docker 不可达、列容器失败、宿主机接口表读不出） | `CCG-PROXY-BRIDGE` 和 `CCG-CONTROL-FWD` 的账号规则全部清空（`CCG-CONTROL-FWD` 只留链尾的两条 DROP），`CCG-CONTROL-IN` 照常（静态规则）；`/v1/health` 的 `firewall` 报 `failed`；每 2 s 重试 |
| `iptables-restore` 失败 | 记 `firewall_apply_failed`，2 s 后重试；内核里保留的是上一次成功写入的规则（事务没有生效）；`firewall` 报 `failed` |
| guard 崩溃或重启 | 内核里的规则不变，已有连接不受影响；重启后先全量计算再开放 API（§2.4） |

与现有 bridge guard 的语义一致：宁可断网，也不放宽。

### 7.8 iptables 后端与 `xtables.lock`

**后端必须是 nf_tables。** 内核里 legacy（x_tables）和 nf_tables 两套表可以同时存在，各自挂在 netfilter 钩子上，包要依次通过两边。ovh 的 Docker 用的是 iptables-nft，`DOCKER-USER`、`DOCKER-FORWARD` 都在 nf_tables 里。guard 若用 iptables-legacy：

- 它写的 `CCG-PROXY-BRIDGE` 在 legacy 表里，`DOCKER-USER`（nf_tables）根本跳不过去；
- 即使在 legacy 的 FORWARD 里 ACCEPT，包仍要经过 nf_tables 的 FORWARD，被 Docker 的隔离规则丢弃。

结果是账号全部断网，而且两边的规则互相看不见，很难排查。所以：

- guard 镜像基于 Debian 13（`debian:trixie-slim`，按摘要固定），装 `iptables`（1.8.11，与宿主机相同，避免低版本列不出高版本写的规则），`update-alternatives` 固定到 `iptables-nft`；
- 启动自检（§2.4 第 2 步）：`iptables -V` 输出必须含 `(nf_tables)`；`iptables -S DOCKER-USER` 必须成功（链不存在说明 Docker 用了别的防火墙后端，例如 Docker 29 的实验性 nftables 后端，guard 也拒绝启动）；`/proc/net/ip_tables_names` 存在且非空时（宿主机上有人用 legacy 表）记告警 `legacy_tables_present`。

**`xtables.lock`：** iptables-nft 靠 netlink 事务的代际号检测并发修改，冲突时自己重试，并不依赖这个文件；guard 仍按部署要求挂载 `/run/xtables.lock`，并一律带 `-w 5`，以便与宿主机上仍按 legacy 方式加锁的工具互斥。注意两点：

- compose 用长语法挂载并设 `create_host_path: false`：源文件不存在时 `up` 直接失败，而不是让 Docker 在 `/run` 下建一个同名**目录**（那会让宿主机上所有 legacy 工具拿不到锁）。
- `/run` 是 tmpfs，重启后文件不一定存在（iptables-nft 不创建它），guard 容器会因此起不来。安装脚本因此同时写 `/etc/tmpfiles.d/ccgateway-guard.conf`（一行 `f /run/xtables.lock 0600 root root -`），开机时由 systemd-tmpfiles 在 dockerd 之前建好。这只是一个静态配置文件，不是 systemd 服务。S0 应在 ovh 上确认重启后的情况；如果确认宿主机上没有任何工具用这个锁，可以去掉这个挂载（§14 待定项）。

### 7.9 命令行：`print-rules`、`diff-rules`、`print-cleanup`

- `print-rules [--chain X]`：只计算，不写入，按 `iptables-restore` 的格式输出。不需要控制网，也不需要 API 端口。
- `diff-rules [--chain X]`：计算，再读 `iptables -S X`，两边都**规范化**后比较，输出差异，相同时退出码 0。规范化：每条规则切成选项单元（基本匹配 `-s -d -i -o -p`、每个 `-m <模块>` 连同它的选项、目标）；补上 `iptables -S` 会自动加的 `-m tcp`/`-m udp`；地址统一带 `/32`；模块内部的选项排序。`CCG-PROXY-BRIDGE` 按集合比较（顺序无关）；两条 CONTROL 链按顺序比较（DROP 必须在最后）。发布方案 S1 第 2 步的 `diff <(sort …) <(sort …)` 应改为 `ccgateway-guard diff-rules --chain CCG-PROXY-BRIDGE`：`iptables -S` 输出的选项顺序和写入时不同，直接比文本永远不相等。
- `print-cleanup`：输出删除三个跳转、清空并删除三条链的命令（`iptables -D … / -F / -X`），供回滚和清理隔离实例用（发布方案 S1、§7）。只打印，不执行。

### 7.10 现有 7 项测试的移植

| Python 测试 | Go 测试（`firewall/bridge_test.go`） | 变化 |
|---|---|---|
| `test_syncing_account_targets_only_its_proxy_peer` | `TestBridgeRulesTargetOnlyProxyPeer` | 断言相同：`--physdev-out` 是网关 veth；含 `<app>/32`、`tcp`；回程规则带 `ESTABLISHED,RELATED` |
| `test_stopped_or_blocked_account_has_no_exception` | `TestBridgeRulesStoppedOrBlocked` | "blocked" 改为模拟阻断后的 Docker 状态：app 为 `exited`；以及网关已断开（不在网上） |
| `test_public_or_wrong_owner_network_is_rejected` | `TestBridgeRulesRejectPublicOrForeignNetwork` | 相同 |
| `test_changed_endpoint_or_additional_network_is_rejected` | `TestBridgeRulesRejectChangedEndpoint` | 原来是"网关地址与 state 不符"；改为三种：默认路由不指向网关、网关端点的 `NetworkID` 不是这张网、app 多接了一张网 |
| `test_peer_must_be_this_controllers_shared_gateway` | `TestBridgeRulesPeerMustBeOwnGateway` | 相同（`egress_backend` 那一步删去：已经没有 state 输入） |
| `test_separate_chain_flushes_only_itself` | `TestRestoreScriptTouchesOnlyOwnChain` | 断言脚本含 `:CCG-NPTEST-BRIDGE - [0:0]\n-F CCG-NPTEST-BRIDGE\n-A CCG-NPTEST-BRIDGE `、不含 `CCG-PROXY-BRIDGE`；跳转注释带 `-ccg-nptest-bridge` 后缀 |
| `test_disappearing_account_does_not_remove_other_accounts` | `TestDisappearingAccountKeepsOthers` | 假 Docker（两个 app、一个网关）+ 假命令执行器（22 号的 `nsenter` 返回失败），断言结果只有 21 号的两条规则 |

新增：`TestRulesDeterministic`（同样输入两次结果逐字节相同）、`TestControlRules*`（§7.4、§7.5 的完整文本，DNS 开关两种）、`TestApplySkipsUnchanged`、`TestApplyFailClosed`、`TestJumpDedup`、`TestNormalize`（用 `testdata/iptables/` 里 ovh 真实的 `iptables -S` 样本，与生成的规则规范化后相等）、`TestVethCache`（容器不重启时不调用 `nsenter`）、`TestRouteCacheInvalidation`。

---

## 8. watch 包

### 8.1 维护的状态

```go
type State struct {
    mu         sync.RWMutex
    apps       map[string]Snap   // aid → <p>-<aid>-app 的 {ID, Status, StartedAt, Pid}
    gateway    *Snap             // <p>-shared-egress
    controller ControlEndpoint   // ccg-control 上持有 ControllerIP 的端点：容器 ID、名字、compose 标签
    foreign    []string          // ccg-control 上其他端点的名字（应当为空）
}
```

只存最少的字段，供防火墙计算、`ControllerOK()` 和日后 `fields=state` 的缓存使用。完整 inspect 仍按需向 Docker 查询。

### 8.2 事件

| 事件 | 来源判断 | 动作 |
|---|---|---|
| container `start`、`die`、`stop`、`kill`、`destroy`、`rename` | `Actor.Attributes["name"]` 反解析为 `<p>-<aid>-app` | 更新 `apps[aid]`，`Recompute(aid)`；`destroy` 时清该容器的 veth 缓存 |
| 同上 | 名字是 `<p>-shared-egress` | 更新 `gateway`，`Recompute()` 全部账号 |
| 同上 | 名字是 `<p>-controller` | 重新核对控制网端点 |
| network `connect`、`disconnect` | 网络名（`Actor.Attributes["name"]`）反解析为 `<p>-<aid>-net`，或等于 `ControlNetwork` | 前者 `Recompute(aid)`；后者重新核对控制网端点 |
| network `destroy`、`create` | 同上 | 同上 |
| 其他（exec、health_status、本前缀之外的名字） | — | 忽略 |

**防抖：** 事件进队列，按账号合并，200 ms 内没有新事件才计算（最长 1 s 必算一次，避免持续抖动时一直不算）。网关事件合并成一次"全部账号"。guard 自己的 API 调用完成后直接调用 `Recompute`，不等事件。

**`Recompute` 的串行化：** 计算和写入在一个 goroutine 里执行（单写者），请求方只投递"哪些账号要算"；同一时刻只有一次 `iptables-restore`。

### 8.3 全量校对

每 60 s 一次，以及每次重新订阅之后立即一次：

1. 列出本前缀的 app 容器、网关、`ccg-control` 的端点，重建 `State`；
2. 全部账号重算（veth 和路由走缓存，所以没有变化时几乎不调用 `nsenter`）；
3. 链内容核对（§7.6）和跳转核对（§7.1）；
4. 清理：带 `io.sup2api.ccgateway.guard-job=<前缀>` 且已结束超过 10 min 的一次性容器（guard 崩溃的残留）；`StateDir/loads/` 里超过 1 h 的文件。

### 8.4 控制网端点核对

`ccg-control` 网络的 `Containers` 里：

- 持有 `ControllerIP` 的端点必须是名为 `<p>-controller`、带 `com.docker.compose.project=<Project>` 和 `com.docker.compose.service=controller` 的容器，`ControllerOK()` 才为真；
- 有其他端点（任何容器）时，记告警 `control_network_foreign {names}`。控制网上本应只有控制器；guard 没有任何 API 能把容器接到这个网络，出现别的端点说明有人在宿主机上手工操作过。
- 不满足时：API 回 403 `controller_unguarded`（§3.2），日志每分钟一条 `controller_unguarded`。S1 到 S4 之间（控制器还是 host 网络的 Python 版）这是**预期告警**（发布方案 S1 观察指标），并且那时控制器根本不会调 guard。

### 8.5 断线与重连

- 事件流断开（dockerd 重启、socket 错误）：1 s 后重新订阅，`since` 取最后一个事件的时间减 1 s（重复事件无害，计算是幂等的），然后立刻全量校对。
- 连续失败时退避到最多 10 s；在此期间整体计算会失败，按 §7.7 失败关闭。dockerd 重启期间账号容器本来也会受影响（ovh 没有开 live-restore），失败关闭不会让情况更糟。

### 8.6 启动顺序（与 §2.4 对应）

```text
config → 后端自检 → Docker 版本 → 文件根 → 挂载源扫描(§6.4) → 残留任务清理
       → 升级状态收尾(§9.2.4) → 全量校对(首轮写规则，不先清空) → 订阅事件 → 监听 API → ready 文件
```

订阅事件放在首轮校对之后、监听之前：首轮期间发生的变化会在订阅时由 `since` 补回（订阅的 `since` 取首轮开始的时间）。

---

## 9. controller 包与 compose 操作

### 9.1 执行 compose（`compose.Runner`）

命令固定为：

```text
/usr/bin/docker compose -p <Project> --project-directory <ProjectDir> -f <ProjectDir>/compose.yml \
    --env-file <ProjectDir>/.env [--profile egress] up -d --no-deps [--force-recreate] <service>
```

- **干净的环境变量。** 子进程只拿到 `PATH=/usr/local/bin:/usr/bin:/bin`、`HOME=/tmp`、`DOCKER_CONFIG=/tmp/.docker`、`DOCKER_HOST=unix://<DockerSocket>`。compose 插值时，进程环境变量的优先级**高于** `--env-file`；guard 自己的环境里有 `CCG_GUARD_TOKEN`、`CCG_GUARD_*` 等，若原样继承，`.env` 就不再是镜像和令牌的唯一来源。
- **服务名白名单：** 只有 `controller` 和 `egress`。guard 不会对 `guard` 服务执行任何 compose 命令，也从不执行不带服务名的 `up`、`down`、`rm`（发布方案的约定）。
- **compose 锁：** 每次操作前对 `<ProjectDir>/.compose.lock` 取 `flock(LOCK_EX)`（等待上限 60 s），覆盖"改 `.env` → `up` → 等健康 → 必要时回滚"整个过程。请 D 在核心的安装、finish、rollback 脚本里用 `flock /opt/ccgateway/.compose.lock` 包住对 `.env` 和 compose 的操作，避免管理员手工安装与 guard 的自升级交错（§13.4）。
- **预检：** 操作前先 `compose ... config -q`；失败直接返回 `compose_failed`，不改任何东西。
- **时限与输出：** `up` 时限 120 s；stdout 丢弃，stderr 只保留最后 2 KiB，失败时以 `warn` 级别记录（compose 的错误信息只含服务名、镜像名和路径，不含环境变量的值）。
- **版本：** guard 镜像里的 compose 插件版本与 ovh 主机相同（发布方案 §10 C4），启动时把 `docker compose version --short` 写进日志。

### 9.2 控制器升级

#### 9.2.1 状态机

```text
idle ──POST upgrade──► running/env_written ──► running/compose_up ──► running/waiting_health ──► done(started)
                              │                      │                       │
                              └──────── 任一步失败 ───┴───────────────────────┴──► running/rolling_back
                                                                                  ├─► failed(rollback=restored)
                                                                                  └─► failed(rollback=restore_failed)
```

每次状态变化都先写 `StateDir/upgrade.json`（`WriteReplace`，0600），再执行下一步。

#### 9.2.2 步骤

1. **校验**（同步，决定 202 还是错误）：引用合法；镜像本地存在；带 `guard-api=1` 和 `shared-egress=1`；当前不在升级、也不在重建网关。记下当前 `.env` 的 `CCG_CONTROLLER_IMAGE`（`previous`）和当前控制器容器的 ID。
2. **改 `.env`**（§9.4）：`CCG_CONTROLLER_IMAGE=<新引用>`，删掉 `CCG_CONTROLLER_VERSION` 行。
3. **`compose up -d --no-deps controller`。** compose 发现镜像变了，停掉旧容器（SIGTERM，`stop_grace_period` 15 s）、建新容器。
4. **等健康**：每 1 s inspect 一次 `<p>-controller`，最多 60 s。成功条件全部满足：
   - 容器 ID 与升级前不同（确实重建了）；
   - `Config.Image` 等于新引用；
   - `State.Running` 为真，`State.Health.Status` 为 `healthy`。控制器镜像的 `healthcheck` 子命令会核对 `/health` 报告的 `controller_image` 等于环境里的镜像（控制器设计 §7.5），所以 `healthy` 就意味着"新镜像在服务"。
   - `State.Health` 不存在（镜像或 compose 没有健康检查）直接判失败：guard 不退回到"自己拿密钥调 `/health`"（X6）。
   - `Health.Status` 变成 `unhealthy`、或者容器退出，立即判失败，不必等满 60 s。
5. **成功：** `done`，`result=started`。
6. **失败：** `rolling_back`：把 `.env` 的镜像改回 `previous`，再 `up -d --no-deps controller`，按第 4 步的条件等 60 s（这次核对 `Config.Image == previous`）。成功 `rollback=restored`，否则 `restore_failed`（日志 `controller_restore_failed`，最高级别）。`result` 记失败原因：`env_failed`、`compose_failed`、`unhealthy`。

与 Python `upgrade.py` 的对应：`with_image` → 第 2 步；`swap_controller`/`start_controller` → 第 3 步（compose 代替改名和 `docker run`）；`health_image` 轮询 60 s → 第 4 步；`restore` → 第 6 步。不再有 `<name>-prev` 和 `<name>-upgrade` 两个容器。

#### 9.2.3 与核心安装脚本的关系

核心的 compose 安装路径（发布方案 §2.4）用 `.env.prev` 实现它自己的回滚；guard **不读不写** `.env.prev` 和 `.transition`。guard 的升级只改 `.env` 里的一行，旧值记在 `upgrade.json`。两者靠 compose 锁互斥（§9.1）。

#### 9.2.4 guard 重启时的收尾（`Resume`）

`upgrade.json` 的状态是 `running` 时：

- 步骤是 `env_written` 或 `compose_up`：不知道 compose 有没有执行完，按第 4 步检查一次。若新镜像已经 `healthy`，记为 `done`；否则进入回滚。
- 步骤是 `waiting_health`：剩余时间按 60 s 重新计时后继续等。
- 步骤是 `rolling_back`：重新执行第 6 步。

### 9.3 网关 ensure 与 recreate

**ensure**（§3.7.2 的实现）：

```text
lock "<gateway>"
c := inspect(<p>-shared-egress)            // 不存在 → nil；归属不符 → 409
switch {
case c != nil && running:  return none
case c != nil && stopped:  VerifyDir(shared-egress); docker start; wait running ≥3s; return started
case c == nil:
    if !exists(uplink): if req.Uplink == nil → 409 uplink_missing; 建 uplink（§4.3）
    VerifyDir(shared-egress)               // 目录不存在则先建（root 0700）
    compose --profile egress up -d --no-deps egress
    wait running ≥3s（30 s 上限）
    return created
}
Recompute(全部账号)
```

- 已停止的网关用 Docker API 启动，不走 compose：compose 若认为配置有变（例如现网的 docker-py 网关根本不带 compose 标签，或者 compose 版本对配置哈希的算法变了），会重建网关，所有账号断网。
- `wait running ≥3s`：网关镜像没有健康检查；`service.py` 先应用 `boot.nft` 再启动 Xray，起不来会退出。连续 3 s 处于 running 且 `RestartCount` 不变，视为启动成功；Xray API 是否就绪由控制器的 `load_inventory` 判断（最多 40×250 ms）。

**recreate**（§3.7.3 的实现）：

```text
lock "<gateway>"；与控制器升级互斥
c := inspect；c 是 legacy → 409 gateway_not_compose
镜像核对 shared-egress=1
old := .env 的 CCG_GATEWAY_IMAGE；写 StateDir/gateway.json {old, new}
.env: CCG_GATEWAY_IMAGE=<new>
compose --profile egress up -d --no-deps --force-recreate egress
wait running ≥3s；失败 → .env 改回 old → 再 up --force-recreate → 502 compose_failed
Recompute(全部账号)
```

guard 重启时 `gateway.json` 表示上次 recreate 没做完：若网关在运行且镜像等于 `new`，删除记录；否则按"失败"恢复 `old`。

### 9.4 `.env` 改写

- 打开 `ProjectDir` 时按 §6.1 的规则逐级核对（root 所有、不可被他人写）；`.env` 本身必须是普通文件、属 root、`nlink == 1`、权限 0600。
- 解析：按行处理，**保留**所有行原样（包括注释、空行、核心写的其他实例变量）；只删除"去掉行首空白后以 `CCG_CONTROLLER_IMAGE=` 或 `CCG_CONTROLLER_VERSION=` 开头"的行（与 `upgrade.with_image` 相同），然后在末尾追加 `CCG_CONTROLLER_IMAGE=<ref>`。网关同理，只针对 `CCG_GATEWAY_IMAGE=`。
- 写入的值先过 `IMAGE_REF` 正则（不含空白、引号、`$`、换行），所以不会破坏 compose 的 `.env` 语法，也不会被插值。
- `WriteReplace(0600)`，即临时文件、`fsync`、`renameat`、`fsync` 目录。
- `CCG_CONTROLLER_VERSION` 只可能来自手工编辑：核心的 `controllerEnv` 不写它（已在仓库中核对）。若它出现在 `/opt/ccgateway-runtime.env`（`env_file`）里，guard 改不了（只读挂载），会通过 `env_file` 传给新控制器，让它报旧版本号。guard 在升级成功后检查新容器 `Config.Env` 里是否有这个变量，有就把 `UpgradeStatus.Result` 记为 `started`，同时日志告警 `controller_version_pinned`。

### 9.5 compose.yml 草案

D 的模板（发布方案 §2.3）是这份文件的唯一来源；下面是 guard 一侧要求的完整内容，变量名与 D 一致。

```yaml
name: ccgateway

x-log: &log
  driver: json-file
  options: {max-size: 20m, max-file: "3"}

services:
  guard:
    image: ${CCG_GUARD_IMAGE:?}
    container_name: ${CCG_PREFIX:-ccg}-guard
    restart: unless-stopped
    network_mode: host
    pid: host
    cap_drop: [ALL]
    cap_add: [NET_ADMIN, SYS_ADMIN, SYS_PTRACE]
    security_opt: ["no-new-privileges:true"]
    read_only: true
    tmpfs: ["/tmp:size=64m,mode=0700"]
    mem_limit: 256m
    pids_limit: 256
    stop_grace_period: 30s
    environment:
      CCG_GUARD_TOKEN: ${CCG_GUARD_TOKEN:?}
      CCG_GUARD_PREFIX: ${CCG_PREFIX:-ccg}
      CCG_GUARD_LISTEN: ${CCG_GUARD_ADDR:-172.29.255.1}:8790
      CCG_GUARD_CONTROLLER_IP: ${CCG_CONTROLLER_IP:-172.29.255.2}
      CCG_GUARD_CONTROL_NETWORK: ${CCG_CONTROL_NETWORK:-ccg-control}
      CCG_GUARD_CONTROL_BRIDGE: ${CCG_CONTROL_BRIDGE:-ccg-control0}
      CCG_GUARD_CONTROL_SUBNET: ${CCG_CONTROL_SUBNET:-172.29.255.0/29}
      CCG_GUARD_CHAIN_PREFIX: ${CCG_CHAIN_PREFIX:-CCG}
      CCG_GUARD_PROJECT: ${CCG_PROJECT:-ccgateway}
      CCG_GUARD_PROJECT_DIR: ${CCG_PROJECT_DIR:-/opt/ccgateway}
      CCG_GUARD_RUNTIME_ROOT: ${CCG_RUNTIME_HOST_ROOT:-/opt/ccgateway-runtime}
    volumes:
      - {type: bind, source: /var/run/docker.sock, target: /var/run/docker.sock, bind: {create_host_path: false}}
      - {type: bind, source: "${CCG_RUNTIME_HOST_ROOT:-/opt/ccgateway-runtime}", target: "${CCG_RUNTIME_HOST_ROOT:-/opt/ccgateway-runtime}", bind: {create_host_path: false}}
      - {type: bind, source: "${CCG_PROJECT_DIR:-/opt/ccgateway}", target: "${CCG_PROJECT_DIR:-/opt/ccgateway}", bind: {create_host_path: false}}
      - {type: bind, source: "${CCG_RUNTIME_ENV:-/opt/ccgateway-runtime.env}", target: "${CCG_RUNTIME_ENV:-/opt/ccgateway-runtime.env}", read_only: true, bind: {create_host_path: false}}
      - {type: bind, source: "${CCG_GUARD_STATE:-/var/lib/ccgateway-guard}", target: /var/lib/ccgateway-guard, bind: {create_host_path: false}}
      - {type: bind, source: /run/xtables.lock, target: /run/xtables.lock, bind: {create_host_path: false}}
    healthcheck:
      test: ["CMD", "/usr/local/bin/ccgateway-guard", "ready"]
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 30s
    labels: {io.sup2api.ccgateway.guard: "${CCG_PREFIX:-ccg}"}
    logging: *log

  controller:
    image: ${CCG_CONTROLLER_IMAGE:?}
    container_name: ${CCG_PREFIX:-ccg}-controller
    restart: unless-stopped
    networks:
      control: {ipv4_address: "${CCG_CONTROLLER_IP:-172.29.255.2}"}
    ports: ["127.0.0.1:${CCG_CONTROLLER_PUBLISH:-8787}:8787"]
    env_file: ["${CCG_RUNTIME_ENV:-/opt/ccgateway-runtime.env}"]
    environment:
      CCG_RUNTIME_ROOT: /data
      CCG_CONTROLLER_BIND: 0.0.0.0
      CCG_CONTROLLER_IMAGE: ${CCG_CONTROLLER_IMAGE:?}
      CCG_GUARD_URL: http://${CCG_GUARD_ADDR:-172.29.255.1}:8790
      CCG_GUARD_TOKEN: ${CCG_GUARD_TOKEN:?}
    volumes:
      - {type: bind, source: "${CCG_CONTROLLER_DATA:-/opt/ccgateway-controller}", target: /data, bind: {create_host_path: false}}
    cap_drop: [ALL]
    security_opt: ["no-new-privileges:true"]
    read_only: true
    tmpfs: ["/tmp:size=64m"]
    mem_limit: 2g
    pids_limit: 512
    stop_grace_period: 15s
    healthcheck:
      test: ["CMD", "/ccg-controller", "healthcheck"]
      interval: 5s
      timeout: 4s
      retries: 3
      start_period: 10s
    labels: {io.sup2api.ccgateway.controller: "${CCG_PREFIX:-ccg}"}
    logging: *log

  egress:
    profiles: [egress]
    image: ${CCG_GATEWAY_IMAGE:?}
    container_name: ${CCG_PREFIX:-ccg}-shared-egress
    restart: unless-stopped
    init: true
    networks: [uplink]
    cap_drop: [ALL]
    cap_add: [NET_ADMIN, NET_BIND_SERVICE]
    security_opt: ["no-new-privileges:true"]
    sysctls:
      net.ipv4.ip_forward: "0"
      net.ipv6.conf.all.disable_ipv6: "1"
    environment: {GOMAXPROCS: "2"}
    volumes:
      - {type: bind, source: "${CCG_RUNTIME_HOST_ROOT:-/opt/ccgateway-runtime}/shared-egress", target: /config, read_only: true, bind: {create_host_path: false}}
    mem_limit: 384m
    pids_limit: 256
    cpus: 2
    labels: {io.sup2api.ccgateway.shared: "${CCG_PREFIX:-ccg}"}
    logging: {driver: json-file, options: {max-size: 10m, max-file: "3"}}

networks:
  control:
    external: true
    name: ${CCG_CONTROL_NETWORK:-ccg-control}
  uplink:
    external: true
    name: ${CCG_PREFIX:-ccg}-d0000000000000000-xray-uplink
```

与 D 的草案相比的改动（请 D 合入模板）：

| 项 | D 草案 | 这里 | 理由 |
|---|---|---|---|
| guard 能力 | 7 项 | `NET_ADMIN`、`SYS_ADMIN`、`SYS_PTRACE` | §9.6 |
| guard 挂载 | 短语法 | 长语法 + `create_host_path: false`；新增 `/run/xtables.lock` | 源不存在时失败，而不是建目录（§7.8） |
| guard 环境 | 7 个 | 加 `CONTROL_NETWORK`、`CONTROL_SUBNET`、`PROJECT_DIR`、`RUNTIME_ROOT` | 隔离实例要能全部覆盖（§10） |
| guard 健康检查、内存、进程数 | 无 | `ready` 子命令；256m；256 | 安装脚本可直接用 `docker inspect` 看健康状态 |
| controller 健康检查 | 无 | `/ccg-controller healthcheck` | guard 升级靠它（X6） |
| egress | 只有注释 | 完整参数（§4.8） | |

### 9.6 guard 容器的权限，逐项理由

| 项 | 取值 | 理由 |
|---|---|---|
| `network_mode: host` | 是 | 要在宿主机命名空间写 iptables；要绑定 `ccg-control0` 上的 `172.29.255.1`；`/sys/class/net` 要反映宿主机的接口 |
| `pid: host` | 是 | `nsenter -t <PID>` 用的是 Docker inspect 给出的宿主机 PID |
| `NET_ADMIN` | 加 | iptables-nft 经 netlink 修改 nf_tables |
| `SYS_ADMIN` | 加 | `nsenter -n` 调用 `setns(CLONE_NEWNET)`，内核要求 `CAP_SYS_ADMIN`；Docker 默认的 seccomp 配置也只在有这项能力时放行 `setns` |
| `SYS_PTRACE` | 加 | 打开 `/proc/<PID>/ns/net` 要通过 ptrace 访问检查；账号容器的进程是 uid 1000，与 guard（uid 0）不同，没有这项能力就会被拒绝 |
| `NET_RAW` | **不加** | iptables-nft 不用原始套接字；D 草案里的这一项是从 legacy 时代沿用的 |
| `DAC_OVERRIDE`、`CHOWN`、`FOWNER` | **不加** | guard 访问的文件和目录（`/opt/ccgateway-runtime`、`/opt/ccgateway`、`docker.sock`、`/run/xtables.lock`、`StateDir`）都属 root，uid 0 作为属主就有权限；guard 建的文件本来就属 root，不需要 chown，chmod 自己的文件也不需要 `FOWNER`。如果某个目录不属 root，那正是 §6.1 要拒绝的情况 |
| `no-new-privileges` | 是 | guard 不执行任何 setuid 程序 |
| `read_only` + `tmpfs /tmp` | 是 | 镜像内容不可改；可写的只有 `/tmp`（ready 文件、docker CLI 配置）和显式挂载 |
| `docker.sock` | 挂 | guard 的本职 |
| `/opt/ccgateway-runtime` | 读写 | 挂载源的所有者 |
| `/opt/ccgateway` | 读写 | 改 `.env`、compose 锁；compose 按同一路径解析项目目录 |
| `/opt/ccgateway-runtime.env` | 只读 | 只给 compose 子进程读（`env_file`）；guard 自己的代码不打开它 |
| `StateDir` | 读写 | 导入镜像的暂存、升级与重建的状态 |
| AppArmor、seccomp | Docker 默认 | 默认的 `docker-default` AppArmor 配置允许对同一配置下的容器做 ptrace 读，账号容器也是 `docker-default`；S0 要在 ovh 隔离实例上实测 `nsenter` 可用（§14） |

guard 就是一个持有 `docker.sock` 的 root 进程，这些限制挡不住"guard 自身被攻破"，它们的作用是缩小 guard 里的普通缺陷（例如路径处理错误）能造成的损害，并让 guard 的权限在 `docker inspect ccg-guard` 里一目了然。

### 9.7 guard 镜像

```dockerfile
FROM golang:1.24-bookworm@sha256:<固定> AS build
WORKDIR /src
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal
ARG VERSION=dev
RUN CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -X main.version=${VERSION}" \
      -o /out/ccgateway-guard ./cmd/ccgateway-guard

FROM debian:trixie-slim@sha256:<固定>
ARG DOCKER_CLI_VERSION COMPOSE_VERSION
RUN apt-get update && apt-get install -y --no-install-recommends iptables iproute2 util-linux ca-certificates curl gnupg \
 && <添加 Docker 官方 apt 源，校验密钥指纹> \
 && apt-get install -y --no-install-recommends docker-ce-cli=${DOCKER_CLI_VERSION} docker-compose-plugin=${COMPOSE_VERSION} \
 && update-alternatives --set iptables /usr/sbin/iptables-nft \
 && apt-get purge -y curl gnupg && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*
COPY --from=build /out/ccgateway-guard /usr/local/bin/ccgateway-guard
ENV DOCKER_CONFIG=/tmp/.docker
LABEL io.sup2api.ccgateway.guard="1"
CMD ["/usr/local/bin/ccgateway-guard", "serve"]
```

- **不设 ENTRYPOINT**：发布方案 S1 用 `$DC run --rm --no-deps guard ccgateway-guard print-rules`，安装脚本用 `dc exec -T guard ccgateway-guard ready`，命令都从程序名开始。
- 构建上下文是 `companions/guard/`；CI 矩阵新增 `ccgateway-guard`（发布方案 §3.2），`org.opencontainers.image.revision` 由 CI 写入，ovh 本地构建时由 `build-ccgateway-guard.sh` 写入，便于核对。
- `docker-ce-cli` 与 `docker-compose-plugin` 的版本作为构建参数，取 ovh 主机当前的版本。

---

## 10. 配置、令牌

### 10.1 配置项

guard 只从环境变量读配置（compose 的 `environment`），没有配置文件。启动时全部校验，任何一项不合法就退出（退出码 2），日志写出变量名和原因，不写值。

| 变量 | 默认（生产） | 校验 | 隔离实例（发布方案 §7） |
|---|---|---|---|
| `CCG_GUARD_TOKEN` | 必填 | `^[0-9a-f]{64}$` | 单独生成 |
| `CCG_GUARD_PREFIX` | `ccg` | `^[a-z][a-z0-9-]{0,32}$`，不以 `-` 结尾 | `ccg-gt` |
| `CCG_GUARD_LISTEN` | `172.29.255.1:8790` | IPv4:端口，地址在 `CONTROL_SUBNET` 内 | `172.29.255.9:8790` |
| `CCG_GUARD_CONTROLLER_IP` | `172.29.255.2` | 在 `CONTROL_SUBNET` 内，≠ 监听地址 | `172.29.255.10` |
| `CCG_GUARD_CONTROL_NETWORK` | `ccg-control` | Docker 网络名 | `ccg-gt-control` |
| `CCG_GUARD_CONTROL_BRIDGE` | `ccg-control0` | `^[a-z0-9-]{1,15}$`（接口名上限） | `ccg-gt-ctl0` |
| `CCG_GUARD_CONTROL_SUBNET` | `172.29.255.0/29` | IPv4 前缀，/24–/30 | `172.29.255.8/29` |
| `CCG_GUARD_CHAIN_PREFIX` | `CCG` | `^[A-Z][A-Z0-9-]{0,14}$` | `CCG-GT` |
| `CCG_GUARD_PROJECT` | `ccgateway` | compose 项目名规则 | `ccgateway-gt` |
| `CCG_GUARD_PROJECT_DIR` | `/opt/ccgateway` | 绝对路径 | `/opt/ccgateway-gt` |
| `CCG_GUARD_RUNTIME_ROOT` | `/opt/ccgateway-runtime` | 绝对路径 | `/opt/ccgateway-gt-runtime` |
| `CCG_GUARD_STATE_DIR` | `/var/lib/ccgateway-guard` | 容器内路径，固定 | 同（宿主机侧由挂载区分） |
| `CCG_GUARD_DOCKER_SOCKET` | `/var/run/docker.sock` | 绝对路径 | 同 |
| `CCG_GUARD_PULL_REPOS` | `ghcr.io/sub2api-devs/ccgateway-*` | 逗号分隔；每项是仓库名，只允许末尾一个 `*`；不允许单独的 `*` | 同 |
| `CCG_GUARD_LOAD_REPOS` | `ccgateway-*,ghcr.io/sub2api-devs/ccgateway-*` | 同上 | 同 |
| `CCG_GUARD_CONTROL_DNS` | `0` | `0` 或 `1`（X10） | 同 |
| `CCG_GUARD_LOG` | `info` | `info` 或 `debug` | |

一致性检查：监听地址、控制器 IP 都在控制网子网内且互不相同；控制网子网不与 `RUNTIME_ROOT` 之外的任何东西有关系，但启动后 `subnets` 会把它报给控制器（R16）；链名前缀加最长后缀（`-PROXY-BRIDGE`，13 个字符）不超过 28 个字符。

仓库模式匹配：`*` 只匹配仓库名的最后一段里不含 `/` 的字符，所以 `ccgateway-*` 匹配 `ccgateway-controller`，不匹配 `ccgateway-x/caddy`。比较前把名字规范化为 `docker.io/library/...` 的完整形式，模式也同样规范化后再比。

### 10.2 令牌

- **生成：** 由核心的安装脚本在宿主机上生成，32 字节随机数的十六进制（`od -An -N32 -tx1 /dev/urandom`），写进 `.env` 的 `CCG_GUARD_TOKEN`（发布方案 §2.4）。已存在且格式正确就保留，重装不会换令牌。S1 手工部署时同样生成。
- **存放：** 只在 `/opt/ccgateway/.env`（root 0600，目录 0700）。不进核心的数据库、脚本文本、stdin、日志；不进镜像。
- **传递：** compose 把它作为环境变量交给 guard 和控制器两个容器。宿主机 root 可以从 `docker inspect` 看到它，这与 root 能直接读 `.env` 等价。控制器容器里的进程能读到它（这正是它的用途）。
- **校验：** 常量时间比较，加来源 IP 和控制器身份（§3.2）。令牌只是三层中的一层：即使令牌泄露，只有 `172.29.255.2` 上的、由 compose 管理的控制器容器能连到 guard。
- **轮换：** 编辑 `.env` 换一个新值，然后 `compose up -d --no-deps guard controller`（两个容器都会重建，控制器中断约 10 s）。guard 不提供在线轮换接口。
- **不按控制器分令牌**：一个 guard 只服务一个控制器（X2）。

### 10.3 guard 自己的状态文件

`StateDir`（容器内 `/var/lib/ccgateway-guard`，宿主机 root 0700）：

| 文件 | 内容 |
|---|---|
| `upgrade.json` | 控制器升级的状态（§9.2） |
| `gateway.json` | 网关重建的进行中记录（§9.3） |
| `loads/*.part` | 导入镜像的暂存，用完即删，启动时清空 |

都不含令牌和凭证。

### 10.4 ready 文件

`/tmp/ccgateway-guard.ready`（tmpfs）：

```json
{"pid": 12345, "version": "0.1.0", "since": "2026-11-01T00:00:00Z", "heartbeat": "2026-11-01T00:00:05Z"}
```

- `serve` 完成启动顺序（§2.4）后写入，之后每 5 s 更新 `heartbeat`；退出时删除。
- `ready` 子命令：文件存在、`heartbeat` 不超过 15 s、`/proc/<pid>` 存在且 `cmdline` 是 `ccgateway-guard serve`，退出码 0；否则 1。它不走 HTTP（X14），因此不受 `CCG-CONTROL-IN` 影响。compose 的健康检查和安装脚本的轮询都用它。

---

## 11. 测试计划

### 11.1 原则

- `go test ./...` 在任何平台都**不跳过**任何已编译的测试：没有 `t.Skip`。需要 Linux 的测试用文件级 `//go:build linux`，需要真实 Docker 的用 `//go:build integration`，需要 root 和网络命名空间的用 `//go:build netns`。
- 每种 tag 都对应一个固定的 CI 或手工步骤，并在 `-v` 输出里**核对测试数量**：步骤脚本统计 `--- PASS` 的行数，与 `testdata/expected-tests.txt` 里登记的数量相同才算通过（不少于，避免新增测试后忘了登记；不多于，避免登记了却没编译进来）。这是按"测试不能悄悄跳过"的规则做的。
- 与外部的边界（Docker、iptables、nsenter、compose）都经接口注入：`dockerapi` 对一个假的 unix socket 服务器测试；`firewall` 的命令执行器、`compose` 的子进程执行器都是接口，单元测试用记录调用的假实现。

### 11.2 单元测试（所有平台）

| 包 | 测试 |
|---|---|
| `config` | 每个变量的合法与非法值；一致性检查；隔离实例的完整覆盖 |
| `names` | 拼装与反解析的往返；`ccg` 与 `ccg-gt` 两个前缀互不误认；KEY 边界（18 位数字、`d` 加 16 位 hex、前导 0） |
| `policy` | 每个函数一个黄金文件（§4），整份 JSON 逐字节比较；参数边界（内存、CPU、环境变量数量和总长、caps 组合） |
| `api` | 路由表：每个端点的方法、路径、鉴权；`DisallowUnknownFields`；多余的 JSON 值；查询参数白名单；`Content-Length` 规则；错误体形状 |
| `api` 静态检查 | 扫描 `internal/api`、`internal/accounts`、`internal/gateway` 的源码，出现 `HostConfig{`、`CapAdd`、`Binds`、`Privileged`、`SecurityOpt` 即失败（§2.2） |
| `dockerapi` | 对假 socket：请求路径白名单（只发 §5.2 的路径）；exec 帧解析（正常、跨读边界、半帧、未知流号、超限）；逐行 JSON（错误行在中间、超长行、提前断开）；事件解码（带冒号后缀的 Action） |
| `imagecheck` | §11.3 的归档表 |
| `firewall` | §7.10 的移植测试和新增测试；规范化器对 `testdata/iptables/` 的真实样本 |
| `compose` | `.env` 改写：保留其他行、删除两种行、追加；拒绝非法引用；子进程环境只有四个变量；服务名白名单 |
| `controller` | 状态机的每条边：成功、`compose_failed`、健康超时、`unhealthy` 提前失败、回滚成功、回滚失败、重启后的 `Resume`（三种步骤） |
| `watch` | 防抖（200 ms 合并、1 s 上限）；事件路由（本前缀、隔离前缀、无关名字）；控制网端点核对 |

### 11.3 拒绝路径的表驱动测试

每张表一个 `Test…Rejects`，每行一个子测试，断言状态码、`error` 和 `reason`，并断言假 Docker **没有收到任何变更请求**：

| 表 | 行（举例） |
|---|---|
| 鉴权 | 错误来源 IP；缺头；裸令牌没有 `Bearer `；大小写不同的十六进制；63 位；非 ASCII；两个 `Authorization` 头；控制网端点不是 compose 的控制器 |
| 资源归属 | 同名容器、网络、卷的标签是别的账号；网关标签是别的前缀；`aid` 为 `0`、`01`、19 位数字、`d` 加 15 位 |
| 网络 | 公网子网；/23；/30；与 `ccg-control` 重叠；与宿主机路由重叠；`gateway` 不是 `.1`；`policy_label` 不是 JSON 对象、超过 4 KiB；`aid` 是 `d0000000000000000` |
| 账号容器 | `ipv4` 是 `.0`、`.1`、广播地址、子网外、已被占用；环境变量名非法、129 个、总长超限、值含 NUL；`image_label` 不是镜像 ID；内存 8 GiB；`resolv.conf` 是符号链接或硬链接 |
| 启停 | 容器多了一个挂载；`resolv.conf` 被换成链接；`timeout` 为 121 |
| exec | `user` 为 `root`、`1000:1000`；`argv` 为空、257 项、含 NUL |
| 归档 | 相对路径；带 `..`；含 NUL；4097 字节；PUT 超过 600 MiB；没有 `Content-Length` |
| 任务 | `caps` 含 `SYS_ADMIN`、`NET_ADMIN`；`volume: ro` 却带 caps；`user` 为 `1000`；内存 4 GiB；`entrypoint` 5 项 |
| 防火墙 | `default_gateway` 是 app 自己的地址、子网外；规则 64 KiB + 1；网关不存在 |
| 镜像拉取 | `caddy:latest`；`docker.io/library/postgres:16`；`ghcr.io/sub2api-devs/other:1`；不带标签的 `ccgateway-x`（隐含 latest，按白名单判断） |
| 镜像导入 | 归档带 `caddy:latest`；`manifest.json` 出现两次（第二个带 `caddy:latest`）；`./manifest.json` 与 `manifest.json` 并存；`manifest.json` 是符号链接；只有 `repositories` 且含非白名单名字；`index.json` 的 `io.containerd.image.name` 是 `docker.io/library/caddy:latest`；`org.opencontainers.image.ref.name` 只给标签；xz 压缩；没有 `manifest.json` |
| 网关文件 | 名字 `state.json`、`../x`、`boot.json/`；4 MiB + 1 |
| 升级 | 镜像缺 `guard-api` 或 `shared-egress` 标签；正在升级；正在重建网关；镜像不在本地 |
| 网关重建 | 镜像缺 `shared-egress=1`；网关是 legacy |

### 11.4 Linux 测试（`//go:build linux`）

- `files`：在 `t.TempDir()` 里构造目录树（测试以普通用户运行时，把"属 root"的要求通过一个测试钩子换成"属当前 uid"，钩子只在测试构建里存在），覆盖：符号链接在路径中间、在末端；硬链接；FIFO（确认不会阻塞）；`RewriteInPlace` 前后 inode 相同；`WriteReplace` 后 inode 不同、没有临时文件残留；目录权限带组写位时拒绝。
- `api` 的监听：`IP_FREEBIND` 绑定一个本机没有的地址成功。
- `firewall` 的 `/sys/class/net` 读取：用假的 sysfs 目录。
- 运行方式：CI 的 ubuntu runner；本机（Windows）按"Linux Go 测试在 ovh 容器里跑"的做法，`git archive` 传到 ovh 的 `/tmp`，用 `golang:1.24-bookworm` 一次性容器执行 `go test -v ./...`（`linux` 是 GOOS 约束，在 Linux 上自动生效，不需要 `-tags`），核对数量。

### 11.5 需要 root 和网络命名空间的测试（`//go:build netns`）

在一次性特权容器里运行（ovh 上 `docker run --rm --privileged golang:1.24-bookworm`，属于发布方案的批准事项 A0，或者 CI 的 runner 直接以 sudo 运行）：

- 建两个网络命名空间和一个网桥，用 `iptables-nft` 真实执行 `iptables-restore --noflush`，断言只有本链变化、跳转不重复、规范化后与 `iptables -S` 一致；
- 模拟 `DOCKER-USER` 已有其他规则时，本链插入第 1 条且不影响其他规则；
- 失败关闭：让 `iptables-restore` 失败（语法错误的规则），断言内核里保留上一次的规则。

### 11.6 与 B 的对拍

`guard/testdata/contract/*.json`：每个文件是一组"请求 → 期望的状态码、`error`、`reason`、应答的键集合"。guard 的 `api` 测试对真 handler（配假 Docker）执行；B 的 `fakeguard` 测试对 FakeGuard 执行同一批文件（B 从 guard 目录复制，CI 里比较两份是否相同）。这样 FakeGuard 的策略校验与真 guard 不会悄悄分叉。

### 11.7 ovh 隔离实例（集成，`//go:build integration`）

按发布方案 §7 的隔离实例（前缀 `ccg-gt`、链 `CCG-GT-*`、控制网 `172.29.255.8/29`）：

1. `print-rules`、`diff-rules` 与旧 bridge guard（`--prefix ccg-gt --chain CCG-GT-PROXY-BRIDGE --once`）的结果一致；
2. 全部端点的正常路径：建网、建卷、准备卷、配额校验、CLI 探测、建 app、resolv、防火墙、启动、exec、归档往返、top、网关 ensure（不存在 → compose 创建）、接入、写文件、断开、删除；
3. 负面检查（发布方案 §6.3）：`caddy:latest` 归档被拒且宿主机标签不变；符号链接挂载源被拒；控制器网络命名空间里连不到宿主机 3130/8010/8795/6379、公网、其他容器，DNS 可用；宿主机本地和其他容器连不到 guard；
4. 控制器升级：到 r2 成功；到"健康检查必定失败"的坏镜像，自动恢复；升级过程中 `docker restart ccg-gt-guard`，`Resume` 正确收尾；
5. 网关 recreate：账号经控制器 recover 全部恢复，测量中断时长；
6. 事件：`docker restart ccg-gt-<aid>-app` 后 1 s 内规则更新、veth 变化；
7. 性能：10 分钟 cgroup `cpu.stat` 差值；`fields=state` 的 p50、p99；
8. 清理（发布方案 §7 的清理表加上 `print-cleanup` 的输出），核对生产的 `CCG-*` 链和 `ccg-*` 资源没有任何变化。

集成测试要求环境变量 `CCG_GUARD_IT_PREFIX=ccg-gt` 显式给出，缺失时测试**失败**（不是跳过），防止误对生产前缀执行。

---

## 12. 安全审查清单

假设：控制器被完全攻破（攻击者能以控制器的身份执行任意代码、持有 guard 令牌、能读写 `/data`）。下表逐条列出它能尝试的路径，以及挡住它的机制。"残余"列是挡不住、但在设计边界内的部分。

### 12.1 经 guard API

| # | 攻击 | 防护 | 残余 |
|---|---|---|---|
| A1 | 建特权容器、挂宿主机 `/`、挂 `docker.sock`、加危险能力、用宿主机命名空间 | 所有 create 请求体只在 `policy` 里拼，没有任何请求字段对应这些参数（§4.1）；静态检查测试（§11.2） | — |
| A2 | 让账号容器接入别的网络（公网、uplink、控制网） | 只有建容器时指定网络，没有"把账号容器接到某网络"的端点（I1）；网关只能接入本前缀的账号网（§3.7.5） | — |
| A3 | 借 bind mount 读宿主机文件：把 `resolv.conf` 换成指向 `/etc/shadow` 的链接，再重启容器（总设计稿 §2.4） | 挂载源在 `/opt/ccgateway-runtime`，控制器容器里看不到；写入一律 `O_NOFOLLOW`，逐级 `openat`；启动前复核（§6.3）；接管时的全量扫描（§6.4） | 接管前就已被篡改、且一直在运行的容器（§6.4 的处理） |
| A4 | 用硬链接或 FIFO 做挂载源 | 复核要求 `nlink == 1`、普通文件；`O_NONBLOCK` 打开 | — |
| A5 | 借 `docker load` 或按标签拉取，改写宿主机上别的服务用的标签（`caddy:latest`、`postgres:16`） | 拉取：只带标签的引用限白名单仓库（§3.6.2）。导入：落盘后解析三处标签来源，重名、链接、未知压缩一律拒绝，白名单之外拒绝；事后核对 `Loaded image` 行（§3.6.4） | 白名单仓库内的标签可以被控制器改写（本来就归它管） |
| A6 | 导入超大或畸形归档耗尽磁盘、内存 | `Content-Length` ≤ 4 GiB，磁盘剩余检查，单个 `images/load` 并发，流式处理，元数据文件 ≤ 1 MiB | 4 GiB 的磁盘占用（落盘期间） |
| A7 | 在账号容器里 exec 拿宿主机权限 | 账号容器 `cap_drop: ALL`、`no-new-privileges`、uid 1000；`user: "0"` 也是无能力的 root | 容器内核漏洞（与现在相同） |
| A8 | 一次性任务提权 | 网络 `none`；只能挂本账号的卷；能力只能从 3 项里选、且只在 `rw` 时；`no-new-privileges`；资源上限；120 s；用完删除（§4.6） | 本账号卷内的文件可被改（本来就可以） |
| A9 | 防火墙辅助容器做坏事 | 镜像由 guard 取网关的运行镜像；只进本账号 app 的网络命名空间；只有 `NET_ADMIN`；脚本固定，控制器只给已校验的地址；规则文本只作用于该命名空间 | 控制器能给自己的账号写任意 nft 规则（本来就是它的职责） |
| A10 | 在网关里 exec 改路由，让账号直连 | 网关在 uplink 上本来就能出网，它的路由和防火墙本来就由控制器生成 | 控制器决定每个账号走代理还是直连（总设计稿 §1 明确不在范围内） |
| A11 | 往 `/config` 写任意文件 | 只允许 5 个固定文件名；`WriteReplace` 不跟随链接；目录复核 | 文件内容由控制器决定（本来就是） |
| A12 | 用归档 PUT 写宿主机 | Docker 在容器的根文件系统里解包；写只读挂载会被拒绝；只能对本账号的 app 操作 | Docker 自身的 `docker cp` 类漏洞（CVE-2018-15664 已在 19.03 修复，ovh 是 29.5.2） |
| A13 | 删除、停止别的服务的容器、网络、卷 | 名字由 guard 拼；按名字反解析 + 标签双重核对归属（I5）；`suffix` 正则 | — |
| A14 | 并发请求打乱同一账号的操作顺序 | 每账号锁（§3.3）；网络创建的全局锁（防止网段重叠） | — |
| A15 | 拖垮 guard（大量请求、慢速请求体） | 并发信号量、`ReadHeaderTimeout`、空闲截止、请求体上限、`MaxHeaderBytes` | guard 暂时不可用 → 控制器回 503；数据路径不受影响 |
| A16 | 让 guard 的日志泄露秘密，或利用日志注入 | 日志只记路径模板、状态码、`aid`（已校验）、`reason`；一行 JSON 编码 | — |
| A17 | 控制器把自己升级成旧的、持有 `docker.sock` 的 Python 镜像 | 升级只接受带 `guard-api=1` 的镜像（§3.8.1）；compose 的控制器定义里没有 `docker.sock` | 有人造一个带这个标签、但行为不同的镜像：它仍然只能拿到 compose 给的权限 |
| A18 | 升级时把 `.env` 写坏（注入换行、`$` 插值），从而改 guard 镜像或令牌 | 镜像引用过 `IMAGE_REF` 正则；只改一行；`.env` 不对控制器开放 | — |
| A19 | 借 compose 重建 guard 或网关 | guard 只对 `controller`、`egress` 两个服务执行 `up`；`egress` 只在显式 `recreate`/`ensure` 时，且 `ensure` 不重建正在运行的网关 | 控制器能触发网关重建（短暂断网，§13.1 R13） |
| A20 | 控制器调用 `recreate` 指定非网关镜像 | 必须带 `shared-egress=1` 标签 | 白名单内、带该标签的任意镜像（与 Python 时代相同） |

### 12.2 经网络

| # | 攻击 | 防护 |
|---|---|---|
| N1 | 控制器连宿主机上只监听回环或 `0.0.0.0` 的服务 | `CCG-CONTROL-IN` 末条 DROP；回环服务本来就不在 `ccg-control0` 上 |
| N2 | 控制器连其他容器、公网、宿主机所在网段 | `CCG-CONTROL-FWD` 只放行到各 app 的 8787，链尾 DROP |
| N3 | 控制器用 DNS 隧道外传数据 | 默认只能用 Docker 内置 DNS（X10）；DNS 隧道仍可行（残余，与任何允许 DNS 的系统相同） |
| N4 | 其他容器或宿主机本地进程连 guard | `CCG-CONTROL-IN` 第 2 条：任何接口发往 guard 端口都 DROP（X11）；来源 IP + 令牌 + 控制器身份 |
| N5 | 其他容器直连控制器 `172.29.255.2:8787` | `CCG-CONTROL-FWD` 的 `ingress-deny`（X12）；核心仍经 `127.0.0.1:8787` |
| N6 | 在控制网上伪造 `.2` | 控制网上只有控制器；guard 没有接入控制网的 API；端点核对（§8.4）发现别的端点就告警并拒绝 |
| N7 | 账号容器直连外网 | 内部网 + 网关的 nft（不变）；`CCG-PROXY-BRIDGE` 只放行到网关 veth |
| N8 | 账号容器连控制器或 guard | 账号网是内部网；`CCG-CONTROL-FWD` 只放行控制器发起、Worker 回的包；`CCG-CONTROL-IN` 的 DROP |

### 12.3 guard 自身

| # | 风险 | 防护 |
|---|---|---|
| G1 | guard 的代码缺陷被利用 | 标准库、无外部依赖；路径和名字一律由 guard 拼；`cap_drop` 到 3 项；只读根文件系统；`no-new-privileges`；审查重点见 §12.4 |
| G2 | 插件或核心给宿主机推送新的 guard | guard 镜像不在插件包里；插件流程和控制器都不碰 `guard` 服务；只有管理员显式安装才会改 `CCG_GUARD_IMAGE`（发布方案 §2.8） |
| G3 | guard 被换成别的镜像（供应链） | 镜像按摘要固定；本地构建时核对 `revision` 标签 |
| G4 | iptables 后端不一致导致规则无效却看似正常 | 启动自检（§7.8） |
| G5 | 规则计算出错时放宽 | 失败关闭（§7.7） |
| G6 | 令牌泄露 | 只在 `.env` 和两个容器的环境里；泄露后仍要满足来源 IP 和控制器身份 |

### 12.4 代码审查必查项

1. `internal/api` 里任何一个处理函数，是否在调用 `dockerapi` 之前完成了 `aid`、名字、归属的核对；
2. 所有路径参数是否都经过规范化和长度检查；所有文件操作是否都经 `files` 包；
3. 所有 create、connect 是否都经 `policy`；
4. 错误应答里是否只有固定的 `message` 文本，没有拼接 Docker 的原始错误；
5. 流式端点是否都有上限和截止；
6. compose 子进程的环境是否是干净的四个变量；
7. 日志调用里是否出现请求体、环境变量、命令输出。

---

## 13. 对 B、A、D 需求的逐条答复

### 13.1 B 的 R1–R21（控制器设计 §10）

| 编号 | 答复 | 说明 |
|---|---|---|
| R1 | **采纳**（超集） | 账号容器、其余容器、网络、卷都返回 Docker 原始 inspect 字节（X3），`Mounts` 全部字段、`Labels` 全部、`Args` 的 `null`/`[]` 原样保留。API 版本与 Python 相同（§5.1） |
| R2 | **采纳** | `?fields=state`（§3.5.1）；另给 `gateway.ip`（网关在本账号网上的地址），控制器可以顺带核对绑定；归属不符 409 |
| R3 | **采纳**（超集，小改） | 网络、卷是原始 inspect，所列字段都在。`volume_users` 的形状改为 `[{Id, Name, Status}]`（`Status` 是平铺的 `State.Status`）；新增 `network_foreign`，直接给出删除前要报的外来端点 |
| R4 | **采纳**（扩充） | `reason` 与 `names` 见 §3.3；`images/file`：404 `path`、422 `not_regular_file`、422 `too_large`；拉取 502 `pull_failed`；辅助容器 502 `helper_failed`；导入 403 `load_forbidden`。新增的 reason 见 §3.3 末尾 |
| R5 | **采纳** | `{exit_code, output}`，合并输出按到达顺序，base64；不在运行 409 `not_running` |
| R6 | **采纳** | 归档 GET/PUT 支持 created、exited；路径或目标目录不存在 404 `path` |
| R7 | **采纳** | 固定 `ps_args=-eo pid,comm` |
| R8 | **修改后采纳** | 内存默认 1 GiB、上限 2 GiB（请求字段 `memory_bytes`）；`stdout` 只含 stdout；允许集合 `{CHOWN, DAC_OVERRIDE, FOWNER}` 不变，但分析表明准备数据卷只需要前两项（§4.6），请 B 只请求 `CHOWN`、`DAC_OVERRIDE`；`user:"0"` + `volume:"none"` 支持 |
| R9 | **采纳**（收紧） | 接受 gzip；返回 `sha256:<hex>` 和清单里的名字。检查范围扩大到 `index.json` 和 `repositories`，重名、链接、xz/bzip2/zstd 一律拒绝（插件包是 gzip，不受影响） |
| R10 | **采纳** | `{Id, RepoTags, Config.{Env, Labels}}`，不存在 404 |
| R11 | **采纳** | 不存在就建（root 0644，目录 0700）；内容逐字节固定；已存在原地改写（先写后截断，不出现空文件） |
| R12 | **采纳** | 辅助镜像取网关 inspect 的 `Image`；网关不存在 409 `not_running`，`names` 是网关名 |
| R13 | **大部分采纳，两处修改** | `GET /v1/gateway` 返回原始 inspect（含所列字段）加 `managed_by`；`ensure` 采纳，**修改**：增加可选的 `uplink` 参数，uplink 网不存在且没给参数时回 409 `uplink_missing`（compose 把 uplink 声明为外部网络，必须有人先建）；`recreate {image}` 采纳，**修改**：现网 docker-py 网关（legacy）一律 409 `gateway_not_compose`，纳入 compose 只在 S6 手工做；`recreate` 是同步的（最多 4 min）；网关不存在时写 `files` 采纳；compose 的 `egress` 带 `shared=<前缀>` 标签采纳（§9.5） |
| R14 | **采纳** | 202；409 `upgrade_in_progress`；缺标签 403 `image_not_guarded`（同时要求 `guard-api=1` 和 `shared-egress=1`）；删 `CCG_CONTROLLER_VERSION` 行；健康判断用容器的 `healthy`（X6），guard 因此不需要控制器密钥 |
| R15 | **采纳** | 删网络、删卷前清理已结束的 `<p>-oneshot-*`，正在运行的算外来用户；guard 自己的一次性容器也沿用这个名字（§4.1），回滚后 Python 能认出 guard 崩溃留下的残留 |
| R16 | **采纳** | `subnets.networks` 是所有 Docker 网络，含 uplink 和 `ccg-control` |
| R17 | **采纳** | `features` 含 `account-state-v1`、`gateway-compose-v1`、`exec-combined-v1`，另有 `raw-inspect-v1`、`jobs-v1`、`load-gzip-v1`、`upgrade-compose-v1` |
| R18 | **采纳**，一处例外 | `DELETE container/network/volume` 不存在 404；删容器强制。例外：`DELETE /v1/gateway/networks/{aid}` 在网关或网络不存在时回 204，与 `SharedEgress.disconnect` 吞掉 NotFound 相同，B 不必特判 |
| R19 | **采纳** | `others` 含 `egress`、`egress-*`、`app-*`，原始 inspect 自带 `Created` |
| R20 | **采纳** | `images/file` 的 `limit` ≤ 512 MiB；归档 PUT ≤ 600 MiB；GET 转发上限 601 MiB；导入 ≤ 4 GiB（guard 落盘）。宿主机磁盘峰值约 8 GiB 的提醒保留 |
| R21 | **采纳** | 只建不启动，同名 409 `exists`。另加一条前置：`resolv.conf` 必须已经存在并通过复核，所以 B 必须先 `PUT resolv` 再 `PUT app`（与 Python `_record_runtime` 在 `_create_app` 之前的顺序一致） |

**给 B 的其他接口变化**（不在 R1–R21 里，B 需要相应修改 `guardapi`）：

1. `CreateNetwork` 的请求体是 `{subnet, gateway, policy_label}`，`policy_label` 由 B 用 pyjson 按 `json.dumps(policy, sort_keys=True)` 编好（X8）；409 `subnet_overlap` 时重新取 `subnets` 再分配一次。
2. `CreateApp` 的字段名是 `auth_label`、`image_label`、`memory_bytes`、`nano_cpus`。
3. `EnsureGateway(ctx, uplink *UplinkRequest)`：处理 409 `uplink_missing`。
4. `Gateway(ctx)` 解码 `{"gateway": …, "managed_by": …}`。
5. `VolumeResult.quota_supported == false` 时记录 `disk_quota_support=unavailable`。
6. 新的 reason：`mount_source_replaced`、`gateway_not_compose`、`output_too_large`、`exec_timeout`、`job_timeout` 都归入"未命名 → 503"并记日志。
7. 401 统一表示"来源、令牌不对"，403 `controller_unguarded` 表示网络层被绕过；两者都应当让控制器在日志里尽早报警，而不是逐个账号报错。
8. 契约对拍测试（§11.6）。

### 13.2 `container_identity`：返回完整 inspect，还是由 guard 代算

**结论：返回完整 inspect（Docker 原始字节），由控制器按 W12 计算。** 不由 guard 代算。

| 比较项 | 返回完整 inspect | guard 代算 |
|---|---|---|
| 与 Python 存下的值逐字节相同（RB4） | 控制器已有 pyjson（state 文件本来就要它）；原始字节里 `null`/`[]`、数字写法都没有经过 guard 的再编码 | guard 也要实现一份 Python `json.dumps` 兼容编码（`ensure_ascii`、分隔符、键排序、浮点数），两份实现可能不一致 |
| 语义归属 | `container_identity` 是控制器的业务规则（W12：原地更新时"什么不能变"），留在控制器 | 把控制器的规则写进只能手工升级的 root 服务；规则一改，guard 也要升级 |
| 回滚兼容 | Python 0.1.118 用 docker-py 的 `attrs`（同一 API 版本的同一份 inspect）计算，结果天然一致 | 一致性取决于 guard 的实现，没有天然保证 |
| 安全 | 只返回本前缀、本账号的资源。里面的 `Env` 含账号凭证，但这些是控制器自己建容器时传进去的；`GraphDriver`、`ResolvConfPath` 等宿主机路径价值很低 | 返回的信息更少 |
| guard 复杂度 | 透传字节，几乎没有代码 | 多一个编码器和对应的测试向量 |

真正的风险在 API 版本：同一个容器在不同 API 版本下 inspect 出来的键可能不同。§5.1 让 guard 使用与 Python 相同的版本，§11.7 用真实容器比对。

### 13.3 A 的需求（行为规格）

| 项 | 答复 |
|---|---|
| RB4（`container_identity` 用完整 inspect） | **满足**：§13.2 |
| BUG-20 ①：准备数据卷的一次性容器以 root 运行、保留 Docker 默认能力、没有 `no-new-privileges` | **修复**：只给 `CHOWN`、`DAC_OVERRIDE`（允许集合上限三项），加 `no-new-privileges`、网络 `none`、资源上限（§4.6）。行为不变：脚本的每一步在这两项能力下都能完成 |
| BUG-20 ②：bind mount 源在控制器可写的目录下 | **修复**：控制器的数据搬到 `/opt/ccgateway-controller`（由核心脚本完成），挂载源留在 `/opt/ccgateway-runtime`，只有 guard 能写；写入 `O_NOFOLLOW`，启动前复核，启动时全量扫描（§6）。请 D 在 S4 前置检查里加一条：`find /opt/ccgateway-runtime \( -type l -o \( -type f -links +1 \) \) -print` 输出为空 |
| BUG-20 ③：`shared-egress/state.json` 随目录挂进网关 | **修复**：搬迁由核心脚本完成；guard 只允许写 5 个网关文件名；网关启动前的目录复核遇到 `state.json` 直接拒绝（§6.3） |
| 控制器镜像必须同时带 `guard-api=1` 和 `shared-egress=1` | **满足**：`POST /v1/controller/upgrade` 两个都要求，缺一个 403 `image_not_guarded`。说明：guard 只把关自升级；核心安装脚本按 `guard-api` 选路径（发布方案 §2.2），构建脚本核对两个标签（发布方案 §3.2） |
| 行为规格 §10 的资源规格（O1–O8） | **逐项对齐**：§4 的对照表。O7 的一次性容器按 BUG-20 收紧；O8 读镜像文件改为可识别的名字；O9（自升级）由 compose 取代 |

### 13.4 D 的要求（发布方案 §10 对 C）

| # | 要求 | 答复 |
|---|---|---|
| 1 | 子命令 `serve`、`ready`、`print-rules [--chain]`、`print-cleanup` | **采纳**，另加 `diff-rules [--chain]`。请 D 把 S1 第 2 步的 `diff <(sort …)` 改为 `ccgateway-guard diff-rules --chain CCG-PROXY-BRIDGE`：`iptables -S` 的选项顺序与写入时不同，直接比文本不会相等（§7.9） |
| 2 | 启动时不清空 `CCG-PROXY-BRIDGE`，先算后换，只在出错时失败关闭 | **采纳**（§7.6、§7.7） |
| 3 | 链名前缀、监听地址、控制器 IP、网桥名、compose 项目名可配置 | **采纳**，另加控制网名和子网、项目目录、挂载源根目录（§10.1）；请 D 在模板和隔离实例的 `.env` 里补上 `CCG_CONTROL_SUBNET`、`CCG_PROJECT`、`CCG_PROJECT_DIR`、`CCG_RUNTIME_HOST_ROOT`、`CCG_GUARD_STATE`、`CCG_RUNTIME_ENV` |
| 4 | 自升级：改 `.env` 一行（旧值留在 guard 状态里）→ `compose up -d --no-deps controller` → 访问 `/health`（密钥从只读环境文件取）确认新镜像 → 失败恢复 `.env` 再 up；只接受 `guard-api=1`；compose 版本与主机相同 | **修改后采纳**：第 3 步改为等容器的 Docker 健康状态 `healthy` 并核对 `Config.Image`（X6、§9.2）。控制器镜像的 `healthcheck` 子命令自己核对 `/health` 报告的镜像，所以语义相同，而 guard 不读、不解析环境文件，拿不到 `CCG_CONTROLLER_KEY`。其余照办；另外要求 `shared-egress=1` |
| 5 | adopt、release 不在 guard 里；guard 不挂控制器数据目录 | **采纳** |
| 6 | `controller_unguarded` 的判断改为 `ccg-controller` 没有 compose 项目标签 | **采纳并加强**：同时核对控制网 `.2` 端点就是这个容器、`service=controller`（§8.4）；不满足时 API 回 403 |
| 7 | S6 之后的网关：不再用 Docker API 创建或删除，只在不存在时 `up -d --no-deps egress`，加上网络接入 | **采纳，并提前到 S6 之前**：guard 从一开始就没有"按 Docker API 创建网关"的路径（X4）。S6 之前网关是 legacy：已停止时用 Docker API 启动，`recreate` 拒绝 |
| 8 | 镜像里的 iptables 用 nf_tables，启动自检 | **采纳**（§7.8），另检查 `DOCKER-USER` 存在、legacy 表是否有内容 |

**反过来对 D 的请求**（请合入发布方案）：

1. compose 模板按 §9.5 修改：guard 的能力只有 3 项、挂载用长语法和 `create_host_path: false`、新增 `/run/xtables.lock`、guard 和 controller 的健康检查、`egress` 的完整参数。
2. 安装脚本写 `/etc/tmpfiles.d/ccgateway-guard.conf` 并 `touch /run/xtables.lock`（§7.8）；或者在 S0 确认后去掉这个挂载。
3. 核心的脚本对 `.env` 和 compose 的操作用 `flock /opt/ccgateway/.compose.lock` 包住（§9.1）。
4. S4 前置检查加挂载源的链接与硬链接扫描（§13.3）。
5. §6.3 的负面检查加两项：其他容器直连 `172.29.255.2:8787` 失败；在控制器网络命名空间里向 `1.1.1.1:53` 直接发 DNS 查询失败（内置 DNS 仍然成功）。
6. S1 第 2 步用 `$DC run --rm --no-deps guard ccgateway-guard diff-rules --chain CCG-PROXY-BRIDGE`。这一步同时验证了 guard 容器里的 `nsenter` 能工作（§14 风险 2）：它和 `serve` 用的是同一套权限。

---

## 14. 风险与工作量

### 14.1 最大的五个风险

| # | 风险 | 后果 | 应对 |
|---|---|---|---|
| 1 | **compose 意外重建网关**：`up` 认为 `egress` 的配置变了（compose 版本不同导致配置哈希不同、`.env` 被改、有人手工执行不带服务名的 `up`），或者对 legacy 网关执行 compose | 网关换新容器，所有动态接入的账号网络丢失，全部账号断网，直到控制器 recover（约 30 s/10 个账号） | guard 只在网关**不存在**时执行 compose，已停止时用 Docker API 启动（§9.3）；legacy 网关拒绝 `recreate`；guard 镜像的 compose 版本与主机相同；`profiles: [egress]` 让默认的 `up` 碰不到它；S6 在隔离实例上先演练"compose 对带运行时接入网络的网关执行 `up`"是否会重建 |
| 2 | **容器里的 `nsenter` 被 AppArmor 或 seccomp 拦住**（`docker-default` 配置、`setns` 规则、ptrace 访问检查） | 每个账号的 veth 都查不到，`CCG-PROXY-BRIDGE` 为空：S1 切换后全部账号无法经网关出网 | S0 在隔离实例上先跑；S1 第 2 步用 `$DC run … diff-rules`，它与 `serve` 权限相同，查不到 veth 就会有差异，不会切换；兜底方案是 `security_opt: apparmor=unconfined`（要用户批准），或改为在 guard 进程内 `setns` 加 netlink 查询（同样需要 `SYS_ADMIN`，但不再依赖外部程序） |
| 3 | **导入时的标签解析与 Docker 不一致**（containerd 镜像存储、OCI 注解的拼法、某种归档布局） | 误拒：核心推送内置镜像失败；漏判：控制器能改写白名单外的标签 | 解析尽量保守（重名、链接、未知压缩、读不出清单都拒绝）；事后核对 `Loaded image` 行并告警；测试用 Docker 29 两种镜像存储真实 `docker save` 的归档；生产负面检查只用不存在的名字（发布方案 §6.3） |
| 4 | **inspect 的形状与 Python 看到的不同**（API 版本不同） | `container_identity` 不一致，配对激活过的账号 `PUT config` 回 409 `cli_profile_unavailable` | guard 的 API 版本取 Python 实际使用的版本（§5.1）；原始字节透传（§13.2）；集成测试对同一容器比较两边算出的 identity |
| 5 | **控制器升级停在中间**（guard 在 compose 执行期间重启、compose 失败、健康检查误判） | 控制器被停掉而没有恢复，全部模型请求 503 | `upgrade.json` 每步先落盘，`Resume` 收尾（§9.2.4）；失败自动恢复旧镜像；compose 锁防止与安装脚本交错；最后手段是管理员 `$DC up -d --no-deps controller`，或核心的 rollbackScript（`.env.prev`） |

### 14.2 其他风险

- **`/run/xtables.lock` 在重启后不存在**，guard 起不来（§7.8）。应对：tmpfiles 配置；或 S0 确认后去掉这个挂载。
- **Docker 将来切到原生 nftables 防火墙后端**：`DOCKER-USER` 不再存在，guard 拒绝启动（失败安全，但要改设计）。
- **磁盘**：导入时 guard 落盘 4 GiB，加上控制器的上传暂存，峰值约 8 GiB。
- **`fields=state` 的耗时**：两次 inspect，预计 p99 < 10 ms；不达标时改读 watch 的缓存（接口不变）。
- **iptables 版本差**：guard 镜像与宿主机都是 1.8.11；宿主机以后升级 iptables 时，guard 镜像要跟着重建，否则 `iptables -S` 可能列不出新版本写的规则（只影响 `diff-rules` 和漂移检测）。
- **`br_netfilter` 与 `physdev`**：沿用现有 bridge guard 的前提（模块已加载）；guard 启动时检查 `/proc/sys/net/bridge/bridge-nf-call-iptables` 为 1，否则告警。
- **控制网上出现别的容器**：只能由宿主机 root 手工造成；guard 告警并拒绝 API（§8.4）。

### 14.3 待用户决定

1. `/run/xtables.lock`：保留挂载并加 tmpfiles 配置，还是 S0 确认无人使用后去掉（§7.8）。
2. 控制器的 DNS：默认只用 Docker 内置 DNS、不放行 53 端口（X10）。
3. 一次性任务的允许能力集合是否保留 `FOWNER`（§4.6，建议保留集合、控制器不用）。
4. legacy 网关的 `recreate` 一律拒绝，纳入 compose 只在 S6 手工做（R13 的修改）。
5. AppArmor 兜底：风险 2 发生时是否允许 `apparmor=unconfined`。

### 14.4 工作量

| 部分 | 估计（人日） |
|---|---|
| `config`、`names`、`obs` | 0.5 |
| `dockerapi`（含 exec 帧、逐行 JSON、事件、假 socket 测试） | 2 |
| `policy`（含黄金文件） | 1 |
| `files`（含 Linux 测试） | 1.5 |
| `imagecheck`（含测试归档） | 1.5 |
| `api` 的 31 个端点、鉴权、限流、拒绝路径表 | 4 |
| `accounts`、`gateway` 的业务逻辑（归属、删除前检查、R15、ensure/recreate） | 1.5 |
| `firewall`（移植 + 两条新链 + 规范化 + 测试） | 2.5 |
| `watch` | 1 |
| `compose`、`controller`（升级状态机、`Resume`） | 2 |
| Dockerfile、CI、契约对拍文件 | 1 |
| ovh 隔离实例集成测试与修正 | 3 |
| **合计** | **约 21.5 人日** |

实施顺序：`names`/`config` → `dockerapi` → `policy` → `files` → `firewall` + `watch`（此时 `print-rules`/`diff-rules` 已可用，可以先在隔离实例上替换 bridge guard，对应 S1）→ `api` 与业务包 → `imagecheck` → `compose` 与 `controller` → 集成测试。可以三人并行：dockerapi/policy/imagecheck 一组，firewall/watch 一组，api/files/compose 一组；同一个 Go 模块同时只让一个人写同一个包，按目录划分。
