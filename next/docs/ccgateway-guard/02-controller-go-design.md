# CCGateway 控制器 Go 重写：架构设计

日期：2026-11-01。状态：设计稿（团队成员 B），待与 01（控制器行为规格，成员 A）、guard 细化（成员 C）合并。

依据：
- ccgateway 0.1.118 的 Python 控制器源码（`next/plugins/ccgateway/companions/controller/`，`7a72fd342` 之后未改）。
- `next/docs/CCGATEWAY-GUARD-DESIGN.md`（下称"guard 设计"），尤其 §2、§3、§4、§6、§8。
- 2026-11-01 用户的两次决定：
  - 控制器整体用 Go 重写；guard 是宿主机服务，持有 `docker.sock`，控制器只调 guard。
  - guard、控制器、共享 Xray 网关都由 docker compose 启动，compose 项目名 `ccgateway`，目录 `/opt/ccgateway/`。

本设计**取代** guard 设计 §8 的 Python 改造方案（`guard_client.py`、`Inspected` 等）。§8 的接口映射思路保留，落到 Go 的包和类型上。

不改的东西：
- 核心 ↔ 控制器的 HTTP 协议（CONTRACTS §49、§53）。
- Worker 协议，以及 Worker 本身。
- 控制器状态文件的格式：插件必须能回滚到 Python 版 0.1.118。

---

## 0. 摘要

| 项 | 结论 |
|---|---|
| 位置 | 过渡期新建 `next/plugins/ccgateway/companions/controller-go/`；切换稳定后删掉 Python 目录，再把它改名为 `controller/`（理由见 §1.1） |
| 模块 | `module ccgateway/controller`，`go 1.24`（与 worker 的 go.mod 相同），构建镜像 `golang:1.27-bookworm`（与 worker 相同） |
| 依赖 | 生产代码和测试都只用标准库，go.mod 没有 require |
| 进程 | 单个静态二进制 `/ccg-controller`：默认子命令 `serve`，另有 `healthcheck`，供 compose 健康检查和 guard 升级时等待健康 |
| Docker | 不碰 Docker。所有容器、网络、数据卷、镜像操作都经 `internal/guardapi` 调 guard |
| 兼容关键 | 几处哈希和标识依赖 Python `json.dumps` 的逐字节输出：`auth_fingerprint`、`container_identity`、出站 tag、清理 identity。必须用 Python 兼容的 JSON 编码器 `internal/pyjson` 重现（§6.4），否则升级后会重建全部账号容器 |

---

## 1. 模块与包结构

### 1.1 放在哪

**建议：过渡期新建 `companions/controller-go/`；切换稳定后删除 Python 的 `controller/`，再执行 `git mv controller-go controller`。**

理由：

1. **Python 源码是移植时的参照。** 移植期间，旧测试和 CI 里的 Python 步骤要继续跑。§8.5 的交叉核对作业也要在 CI 里运行 Python，生成参照输出。两种语言放在同一目录，`Dockerfile` 和 `README.md` 都会冲突。
2. **切换点只有一个提交。** 让 `build-ccgateway-images.sh` 和 CI 的镜像矩阵从 `controller/` 改指向 `controller-go/`，就是切换本身。回滚时只需 revert 这一个提交，或直接用 0.1.118 的镜像 digest。
3. **模块路径与目录名无关。** 模块名取 `ccgateway/controller`，和 worker 的 `ccgateway/worker` 对称。最后改名时 import 路径一律不动，只需改 go.work、CI 和构建脚本里的路径。
4. 不放进 `companions/` 根模块（`module ccgateway`，里面有 engine）。原因：
   - 控制器不需要 engine 和 contracts 的任何东西；
   - 独立模块让镜像构建上下文只有它自己；
   - 根模块的 `go test ./...` 不会被拖慢。

Python 目录里的手工脚本怎么处理：

| 脚本 | 处理 |
|---|---|
| `offline_migrate_account.py`、`offline_migration_probe.py`、`runtime_migration_probe.py` | 0.1.67→0.1.70 迁移用的一次性脚本，删除 |
| `shared_integration.py`、`shared_failure_test.py` | 改写成 Go 的真机集成测试（build tag，见 §8.6） |
| `shared_proxy_fixture.py` | 不 import 控制器模块，是独立进程，原样保留，移到 `controller-go/testdata/fixtures/` 作为集成测试的代理夹具 |
| `upgrade.py` | 删除，逻辑移交 guard（compose up + 健康检查 + 回滚） |

### 1.2 go.mod 与目录树

```text
companions/controller-go/
  go.mod                  module ccgateway/controller ; go 1.24（无 require）
  Dockerfile
  README.md               由 controller/README.md 迁移改写
  cmd/ccg-controller/
    main.go               子命令 serve / healthcheck；读环境、加锁、装配、信号
  internal/
    names/                键与镜像引用的正则、标签名、端口、资源命名（common.py 的常量部分）
    errs/                 控制器错误种类与应答表（common.ERRORS、http_api 的 *_ERRORS）
    pyjson/               Python json.dumps 兼容编码器、真值与 int() 语义、urlsplit 子集
    config/               CCG_* 环境变量解析与校验
    store/                数据根：文件锁、原子写入、state.json / egress-desired.json /
                          runtime.json / backups / worker-backups / shared-egress-state.json
    guardapi/             guard HTTP 客户端：接口、类型、错误映射、流式调用
      fakeguard/          内存实现（测试替身），带 guard 的策略校验
    netplan/              网络策略、网段与地址分配、账号防火墙规则文本、代理解析（network.py）
    xrayconf/             共享网关的 Xray 与 nft 配置生成，纯函数（shared_egress.py 前半）
    cliprofile/           CLI 版本校验与镜像内 CLI 探测（cli_profiles.py）
    containerfs/          容器内单文件读写、分段替换、身份（dockerfs.py）
    workeradmin/          调 Worker 管理口的 HTTP 客户端（common.worker_* 与 maintenance）
    accounts/             账号运行时生命周期 Manager + 共享网关编排（manager.py、shared_egress.py 后半）
    updates/              原地更新 Worker、Worker 与 CLI 成对激活（worker_update.py、runtime_updates.py）
    uploads/              可续传分块上传与导入（images.py）
    cleanup/              孤儿盘点与按清单清理（cleanup.py）
    admin/                health、目标镜像、控制器升级、网关重建（runtime_admin.py）
    api/                  HTTP 服务：鉴权、路由、错误应答、透传、隧道、上传端点（http_api.py）
  testdata/
    pycompat/             Python 生成的参照向量（JSON 编码、指纹、identity、tag）
    state/                Python 0.1.118 写出的状态文件样本（合成数据，不含真实凭证）
    http-golden/          Python 版控制器对固定请求序列的应答（§8.5）
    fixtures/shared_proxy_fixture.py
```

依赖方向（只允许向下依赖，不允许循环）：

```text
cmd → api → {admin, updates, uploads, cleanup} → accounts → {containerfs, cliprofile, xrayconf, netplan, workeradmin}
                                                         → guardapi → errs, names, pyjson
                                                         → store → pyjson
```

`accounts` 和共享网关的编排放在同一个包里。Python 里 `Manager` 和 `SharedEgress` 是互相调用的：`apply → shared.apply → m.activate → shared.healthy`，硬拆成两个包会产生循环依赖。纯配置生成单独放在 `xrayconf`，可以独立测试。

### 1.3 各包的职责与对外接口

下面只给关键签名。`ctx` 一律是第一个参数，下文省略 `context.Context` 的类型名。

**`names`**

```go
var Key       = regexp.MustCompile(`^(?:[1-9][0-9]{0,17}|d[0-9a-f]{16})$`)
var Draft     = regexp.MustCompile(`^d[0-9a-f]{16}$`)
var Revision  = regexp.MustCompile(`^[a-f0-9]{64}$`)
var ImageRef  = regexp.MustCompile(`^[a-z0-9][a-z0-9._/-]{0,127}(:[A-Za-z0-9._-]{1,128})?(@sha256:[0-9a-f]{64})?$`)
var AccountContainerRole = regexp.MustCompile(`^(?:app|egress)(?:-[A-Za-z0-9_.-]+)?$`)
const (LabelAccount = "io.sup2api.ccgateway.account"; LabelAuth = "...auth"; LabelImage = "...image"
       LabelNetwork = "...network"; LabelDiskQuota = "...disk-quota-bytes"
       LabelSharedOwner = "io.sup2api.ccgateway.shared"; LabelSharedSchema = "io.sup2api.ccgateway.shared-egress"
       LabelGuardAPI = "io.sup2api.ccgateway.guard-api"; WorkerPort = 8787)
func CheckKey(aid string) error          // errs.BadRequest("invalid runtime key")
func ValidImage(ref string) bool
func ContainerOf(prefix, aid, name string) bool  // Manager.container_of
```

Python 的 `re.fullmatch` 统一改写成带 `^…$` 的 RE2 模式。RE2 里的 `$` 不会在结尾换行符前匹配，和 `fullmatch` 一致。

**`errs`**：见 §3.6。

**`pyjson`**：见 §6.4。

**`config`**

```go
type Config struct {
    ControllerKey string; Root string; Prefix string; Bind string; Port int
    AppImage, EgressImage, ControllerImage, XrayImage, Version string
    AccountDiskBytes int64; RequireDiskQuota bool; DefaultCLIVersion string
    GuardURL, GuardToken string
    ProbeURL string // 固定 https://www.gstatic.com/generate_204，测试可改
}
func FromEnv(getenv func(string) string) (Config, error)
```

**`store`**：见 §6。

**`guardapi`**：见 §5。

**`netplan`**

```go
type Policy struct{ Pool string `json:"pool"`; Allocation string `json:"allocation"` }
func ParsePolicy(raw json.RawMessage) (Policy, error)               // network_policy
func AllocateSubnet(p Policy, occupied []netip.Prefix, r Rand) (netip.Prefix, error)
func AllocateAddresses(subnet netip.Prefix, allocation string, r Rand) (gateway, app netip.Addr)
func BusinessRules(gatewayIP netip.Addr) string                     // business_rules，逐字节相同
const PrivateDestinations = "0.0.0.0/8, 10.0.0.0/8, ..."
type Resolver interface{ LookupIPv4(ctx, host string) ([]netip.Addr, error) }
func PinProxy(ctx, r Resolver, proxy map[string]any) (Pinned, error) // proxy_outbound
```

**`xrayconf`**：`Node(proxy, salt)`、`Inbound(b)`、`Routes(bindings)`、`Firewall(bindings, nodes)`，以及常量 `Base`。输出与 Python 对应函数相同：tag 逐字节相同，配置在 JSON 值上相等。

**`cliprofile`**

```go
type Profile struct{ Version, RequestMode string; DisableAutoUpdate bool }
func Validate(raw json.RawMessage) (*Profile, error)                // nil 表示旧配置
const ProbeScript = `...`                                             // 逐字节复制 PROBE
func Resolve(ctx, g guardapi.Client, aid, image string, p *Profile) (map[string]string, error)
```

**`containerfs`**：账号容器内的文件操作。抽象成接口，`updates` 和测试都只依赖它。

```go
type App interface {   // guardapi 的账号容器句柄实现它
    ID() string; Attrs() guardapi.Container
    Exec(ctx, argv []string, user string) (code int, out []byte, err error)
    ArchiveGet(ctx, path string) (io.ReadCloser, error)
    ArchivePut(ctx, dir string, tar io.Reader, size int64) error
    Top(ctx) (guardapi.Top, error)
}
func WorkerTarget(c guardapi.Container) (path, base string, err error)
func WorkerIdle(ctx, a App, base string) (bool, error)
func Identity(c guardapi.Container) string            // container_identity，pyjson 编码
func SHA256In(ctx, a App, path string) (string, bool)
func Stage(ctx, a App, target string, data Blob, digest string) (tmp string, err error)
func Swap(ctx, a App, tmp, target string) error
func ReadFile(ctx, a App, path string, limit int64) ([]byte, error)
func WriteFile(ctx, a App, path string, data Blob) error
type Blob interface{ Size() int64; Open() (io.ReadCloser, error); SHA256() string } // 内存或 /data/.spool 文件
```

**`workeradmin`**

```go
type Client struct{ Transport http.RoundTripper; Port int } // 无代理、不跟随重定向
func (c *Client) Do(ctx, st *store.AccountState, method, path string, body io.Reader, t Timeouts) (*http.Response, error)
func (c *Client) PutEnvironment(ctx, st, env Environment) (Environment, bool)
func (c *Client) Maintenance(ctx, st, action, lease string) (*MaintenanceAck, error) // 409 → nil, nil
```

**`accounts`**

```go
type Manager struct { /* cfg, store, guard, locks, shared, mem, clock, rand, resolver, worker */ }
func New(opts Options) (*Manager, error)
func (m *Manager) Apply(ctx, aid string, body []byte) (Public, error)            // PUT config
func (m *Manager) Delete(ctx, aid string, account, purge bool) (DeleteResult, error)
func (m *Manager) DeleteLocked(ctx, h *Held, account, purge bool) (DeleteResult, error)
func (m *Manager) Public(ctx, aid string) (Public, error)
func (m *Manager) Runtimes(ctx) (RuntimeList, error)
func (m *Manager) ReadyState(ctx, aid, revision string) (*store.AccountState, error) // nil 表示未同步
func (m *Manager) Connection(ctx, aid, revision string) (*Connection, error)
func (m *Manager) EgressStatus(ctx, aid string) (EgressStatus, error)
func (m *Manager) Lock(ctx, aid string) (*Held, error); func (m *Manager) TryLock(aid string) (*Held, bool)
// 供 updates 使用（Python 里是 WorkerUpdates 调用 Manager 的方法）：
func (m *Manager) App(ctx, h *Held) (*guardapi.AppHandle, error)                  // owned(aid,'app')
func (m *Manager) State(aid string) (*store.AccountState, error); func (m *Manager) Save(h *Held, st *store.AccountState) error
func (m *Manager) Readiness(ctx, aid string, st *store.AccountState) string
func (m *Manager) GoOffline(aid string) string; func (m *Manager) OnlineAt(aid, rev string) bool
func (m *Manager) BusinessFirewall(ctx, h *Held, gatewayIP string) error
func (m *Manager) ReapplyShared(ctx, h *Held, st *store.AccountState) error         // shared.apply(aid, state, shared.desired(aid))
func (m *Manager) RunBackground(ctx)                                               // recover/collect 10 s + 代理复核 300 s
```

**`updates`**

```go
type Host interface { /* accounts.Manager 上述方法的子集，测试可替换 */ }
func UpdateWorker(ctx, h Host, g guardapi.Client, aid string, body []byte) (WorkerResult, error)
func UpdatePair(ctx, h Host, g guardapi.Client, aid string, body []byte) (PairResult, error)
```

**`uploads`**：`New(dir string, g guardapi.Images)`，方法有 `Create`、`Status`、`Delete`、`Write(id, offset, length, r io.Reader)`、`Load`。

**`cleanup`**：`Inventory(ctx, m) (Inventory, error)`、`Cleanup(ctx, m, body []byte) (Result, error)`。

**`admin`**：`Health`、`RuntimeImages`、`SetRuntimeImages`、`UpgradeController`、`RecreateEgress`。最后一个是新增的维护操作，见 §7.4。

**`api`**

```go
type Server struct{ Key []byte; M *accounts.Manager; A *admin.Admin; U *uploads.Uploads; ... }
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) // 唯一入口，不用 ServeMux
func NewHTTPServer(addr string, s *Server) *http.Server
```

---

## 2. Python → Go 对照表

### 2.1 模块级

| Python | Go | 备注 |
|---|---|---|
| `common.py` 常量、正则、标签 | `names` | |
| `common.py` 异常类、`ERRORS`、`error_answer` | `errs` | |
| `common.write_private*`、`read_json` | `store.WriteAtomic`、`store.ReadJSON` | |
| `common.absent_ok`、`container` | 删除；改为 `errors.Is(err, guardapi.ErrNotFound)` | |
| `common.worker_session/worker_request/admin_headers` | `workeradmin` | |
| `common.resolv_conf` | 删除：guard 写文件，内容格式由 guard 写死（需求 R11） | |
| `manager.py` `Manager` | `accounts.Manager`（manager.go、provision.go、apply.go、delete.go、readiness.go、proxycheck.go） | |
| `manager.authentication`、`environment_value`、`auth_fingerprint` | `accounts/auth.go` | 指纹必须用 `pyjson`（§6.4） |
| `manager.main` | `cmd/ccg-controller/main.go` | |
| `shared_egress.py` 的 `node/inbound/routes/firewall/BASE` | `xrayconf` | |
| `shared_egress.SharedEgress` | `accounts/shared.go` 的 `shared` 类型 | `create` 删除（compose），见 §7 |
| `network.py` | `netplan` | `host_routes` 删除，改用 guard 的 `subnets` |
| `cli_profiles.py` | `cliprofile` | |
| `dockerfs.py` | `containerfs` | `image_container` 删除，改用 guard 的 `images/file` |
| `worker_update.py` `WorkerUpdates` | `updates/worker.go` | |
| `runtime_updates.py` `RuntimeUpdates` | `updates/pair.go` | |
| `images.py` `Uploads` | `uploads` | `archive_tags`、`_qualified`、`_names` 移交 guard（需求 R9） |
| `cleanup.py` | `cleanup` | |
| `runtime_admin.py` `RuntimeAdmin` | `admin` | |
| `http_api.py` `Handler` | `api` | |
| `upgrade.py` | 删除，移交 guard + compose | |
| `requirements.txt`（docker、requests） | 删除 | |

### 2.2 函数级（重要的）

| Python | Go | 改动 |
|---|---|---|
| `Manager.guard(aid)`（RLock） | `Manager.Lock(ctx, aid) (*Held, error)` | 不可重入，改为显式传 `*Held`（§4.1） |
| `request_guard`（20 s） | `Lock(ctxWithTimeout(20s))`，超时返回 `errs.RuntimeBusy` | |
| `owned(aid, role)`、`owned_resource`、`account_containers`、`_deletion_plan` 里的查询 | `guard.Account(aid)` 一次取回 | 归属核对在客户端再做一遍（guard 已做，双保险） |
| `_namespace_helpers`、`_stale_helper` | 删除 | Python 时代遗留的 `<p>-oneshot-*` 由 guard 识别和清理（需求 R15） |
| `oneshot` | 删除 | 改为 `guard.RunJob` |
| `helper` + `business_firewall` | `guard.InstallFirewall(aid, rules, gatewayIP)` | 规则文本仍由 `netplan.BusinessRules` 生成，脚本 `NFT_REPLACE` 移进 guard |
| `docker_ipv4_subnets` + `host_routes` | `guard.Subnets()` | |
| `ensure_network(aid,'net',…)` | `ensureNetwork`：先查 → 用 `netplan.AllocateSubnet` 选网段 → `guard.CreateNetwork` | 网段仍由控制器选（策略属于业务） |
| `ensure_network('d000…','xray-uplink',…)` | 删除 | uplink 网由 compose 定义 |
| `_data_volume`、`account_volume` | `guard.EnsureVolume(aid, size, allowUnbounded)` + 本地核对配额标签 | 核对逻辑不变 |
| `verify_disk_quota` | `guard.RunJob(volume:"ro", user:"1000:1000", entrypoint:["node"])`，退出码非 0 → `DiskQuotaUnavailable` | |
| `_create_app` 里的 `PREPARE_VOLUME` | `guard.RunJob(volume:"rw", user:"0", caps:[CHOWN,DAC_OVERRIDE,FOWNER])` | 需求 R8 |
| `_create_app` 的 `containers.create` | `guard.CreateApp(aid, AppRequest{...})` | 资源参数由 guard 写死 |
| `_record_runtime` 写 `resolv.conf`、`SharedEgress.resolv` | `guard.WriteResolv(aid, ns)` | 两处合并为一种写法：原地写，文件不存在就创建（需求 R11） |
| `ensure_image` | `guard.ImageInspect` → 404 时 `guard.ImagePull` → 再 inspect；拉取失败 → `ImagePullFailed` | |
| `app_image_id`（30 s 缓存） | 同上，缓存放在 `mem` 里 | |
| `readiness` | `guard.AccountState(aid)` 一次调用（§5.5） | |
| `SharedEgress.container/ensure/create` | `guard.Gateway()`、`guard.EnsureGateway()` | §7 |
| `SharedEgress.attach/disconnect` | `guard.ConnectGateway`、`DisconnectGateway` | |
| `SharedEgress.exec/api` | `guard.GatewayExec`；带 `obj` 时先 `guard.WriteGatewayFile("operation.json")` | |
| `SharedEgress.sync` 写 `dns.json`、`active.nft` | `guard.WriteGatewayFile` | |
| `SharedEgress.path` | `<root>/shared-egress-state.json` | guard 设计 §4.2 |
| `dockerfs.image_container` + `read_file(temp)` | `guard.ImageFile(ref, path, limit)` | |
| `dockerfs.put_archive/get_archive/exec_run/top` | `guardapi.AppHandle` 的方法 | |
| `Uploads._load` | `guard.ImageLoad(r, size)`（流式） | 403 → `UploadError(400,"load_forbidden")` |
| `RuntimeAdmin.upgrade_controller` | `admin.UpgradeController`：降级检查 + guard-api 标签检查 → `guard.UpgradeController` | |
| `cleanup.inventory` 的 Docker 列表 | `guard.Inventory()` | |
| `Manager.__init__` 的 `fcntl.flock` | `store.Lock`（Linux 用 `flock`，Windows 开发机用桩实现） | |
| `main()` 的 `127.0.0.1` | `CCG_CONTROLLER_BIND`（compose 下是 `0.0.0.0`） | |

### 2.3 删除或移交

| 删除的东西 | 去向 |
|---|---|
| `upgrade.py` 整个、`runtime_admin` 里起辅助容器的代码 | guard：`POST /v1/controller/upgrade` → 改 `.env` → `compose up` → 健康检查 → 失败回滚 |
| `SharedEgress.create` 与 uplink 网段分配 | compose 的 `egress` 服务；控制器只调 `POST /v1/gateway/ensure` |
| `oneshot`、`helper`、`_namespace_helpers`、`_stale_helper` | guard 的 `jobs`、`firewall`，以及遗留辅助容器的清理 |
| `host_routes`（`/proc/net/route`） | guard 的 `subnets` |
| `archive_tags`、`_qualified`、`_names` | guard 的 `images/load` |
| `image_container` | guard 的 `images/file` |
| `CCG_RUNTIME_ENV_FILE`、`CCG_CONTROLLER_NAME` 在升级中的作用 | guard 按实例写死；控制器仍读 `CCG_CONTROLLER_NAME` 并校验格式，只为与 Python 启动行为一致 |
| `DOCKER_SOCKET` | — |

---

## 3. HTTP 服务

### 3.1 服务器

```go
srv := &http.Server{
    Addr:              net.JoinHostPort(cfg.Bind, strconv.Itoa(cfg.Port)),
    Handler:           apiServer,               // 唯一 Handler，不用 http.ServeMux
    ReadHeaderTimeout: 240 * time.Second,
    IdleTimeout:       240 * time.Second,
    MaxHeaderBytes:    64 << 10,
    ErrorLog:          discardLogger,           // 不记 URL 和请求体
}
```

- **不用 `ServeMux`。** 它会把 `//`、`/./` 之类的路径 301 重定向到规范形式。Python 是对原始 `self.path` 做正则全匹配，所以 Go 也一律匹配 `r.RequestURI`（原始请求目标，含查询串）：
  - 带 `?x=1` 的路径匹配不上，返回 404，与 Python 相同；
  - 绝对形式的请求目标（`http://h/p`）也匹配不上，同样 404。
- **240 s 超时是"空闲"语义：** Python 的 `connection.settimeout(240)` 作用于每一次 recv 和 send，不是总时长。Go 里：
  - 读请求体（上传分块、PUT config）时，用 `http.ResponseController.SetReadDeadline` 每次读之前续期 240 s；
  - 写应答（透传流）时，每次写之前用 `SetWriteDeadline` 续期 240 s；
  - 封装成 `api.idleBody` 和 `api.idleWriter` 两个小类型。
- **不处理的方法：** GET/POST/PUT/DELETE 以外的方法，Python 没有 `do_X`，会回 501 HTML 错误页。Go 回 `501 {"error":"method_not_allowed"}`，带 `Connection: close`。核心从不发这类请求，只保状态码。
- **panic：** 每个请求 `defer recover()`。还没开始写应答的，按未命名错误回 `503 runtime_unavailable`，日志带堆栈。Python 由 `except Exception` 达到同样效果。

### 3.2 路由（与 `http_api.py` 一一对应）

```go
var routeAccount = regexp.MustCompile(`^/accounts(?:/(` + keyPattern + `)(?:/(config|status|connection|tunnel|worker|egress|` +
    `admin/(?:status|usage|features|request-logs(?:/(?:query|detail|read))?|cli|auth/(?:session|start|complete|cancel|logout|refresh))))?)?$`)
var routeUpload  = regexp.MustCompile(`^/images/uploads(?:/([A-Za-z0-9_-]{22})(/load)?)?$`)
var routeRuntime = regexp.MustCompile(`^/runtime/(images|controller|cleanup|egress/recreate)$`) // egress/recreate 是新增的，见 §7.4
```

处理顺序与 Python `handle_request` 完全一致：

1. 鉴权：
   - 取 `Authorization` 的第一个值，用 `strings.TrimPrefix(v, "Bearer ")` 去掉前缀。与 `removeprefix` 一致：不带 `Bearer ` 前缀、直接给出密钥的，也算通过。
   - 用 `subtle.ConstantTimeCompare([]byte(v), key)` 比较；长度不等时也走一次比较，不提前返回。
   - 失败回 `401 unauthorized`，带 close。
   - Python 遇到非 ASCII 的 Authorization 会抛 TypeError 并直接断开连接；Go 回 401。属于更正，不影响核心。
2. `/health`：设 close。方法不是 GET 时回 405（因为已设 close，也带 `Connection: close`）。是 GET 就回 200 和 health。
3. 上传或 runtime 路由 → `handleManagement`。
4. 账号路由匹配不上 → `404 not_found`，带 close。
5. `tunnel` → `handleTunnel`，从不读请求体；`worker` → `handleWorker`。
6. 其余账号路径：先 `readBody(32 MiB)`，再分派。出错时按 `DELETE /accounts/<key>` 用 `DeleteErrors`，其他用 `RequestErrors`。
7. `/accounts`（不带 key）不是 GET 时回 405，**不带** close（请求体已读完）。
8. 本地端点：`DELETE` 删除运行时，`PUT config`，`GET status`、`GET connection`、`GET egress`。对 `LocalPaths` 用了其他方法的回 405（不带 close）。其余路径走透传。

### 3.3 请求体与 JSON

```go
// readBody：与 Python read_body 相同
func readBody(r *http.Request, limit int64) ([]byte, error) {
    raw := r.Header.Get("Content-Length")
    if raw == "" { raw = "0" }
    if len(r.TransferEncoding) > 0 || !decimal.MatchString(raw) /* ^[0-9]{1,12}$ */ || atoi(raw) > limit {
        return nil, errs.BadRequest("invalid body")
    }
    return io.ReadAll(idleBody(r, 240*time.Second)) // 恰好 Content-Length 字节
}
```

- **Transfer-Encoding：** Go 服务器会把请求头里的 `Transfer-Encoding` 移到 `r.TransferEncoding`，所以检查 `len(r.TransferEncoding) > 0`。不认识的编码，Go 自己就回 501，属于框架层差异。
- **Content-Length：** 用原始请求头字符串核对 `^[0-9]{1,12}$`。Go 会把 `"00"` 解析成 0，Python 的隧道检查要求恰好是 `'0'`（见 §3.8），所以必须看原串。
- **JSON 解码：** 用 `json.Decoder` 加 `UseNumber`，解成 `any`，然后照 Python 的 `isinstance` 逐项校验。不要直接解码到结构体：结构体会把 `5.0` 当成 int，会忽略未知键，也分不清 `null` 和缺省。
  - `pyjson.IsInt(n json.Number)`：只接受 `-?[0-9]+`，与 Python `isinstance(x, int)` 一致。`5.0`、`5e0` 在 Python 里是 float，同样拒绝。
  - bool 不算 int：Go 里 JSON 的 `true` 解出来本来就是 `bool`，天然不同。
  - Python 允许重复键（后者生效），Go 解码到 `map[string]any` 也是后者生效，一致。
  - Python 接受 `NaN`、`Infinity`，Go 拒绝：PUT config 会变成"非法 JSON"，按 Python 的语义回 400 并掉线。核心不会发这类内容。
- **`PUT config`：** 请求体解析失败时把 `desired` 视为 nil，交给 `Apply`。Apply 回 400，并且让账号掉线（与 Python 相同）。

### 3.4 应答写法（与 Python `reply` 对齐）

```go
func reply(w http.ResponseWriter, status int, v any, close bool) {
    raw := pyjson.Marshal(v)                      // 与 json.dumps 默认格式相同：", " 和 ": "
    h := w.Header()
    h.Set("Content-Type", "application/json")
    h.Set("Content-Length", strconv.Itoa(len(raw)))
    h.Set("Cache-Control", "no-store")
    if close { h.Set("Connection", "close") }      // Go 看到这个头会在应答后关连接
    w.WriteHeader(status); w.Write(raw)
}
```

一致性约定（"字节级"指下列各项，而不是整段报文逐字节相同）：

| 项 | 做法 |
|---|---|
| 状态码 | 全部照搬 |
| `error` 码 | 全部照搬（§3.6 表） |
| 应答体 | 用 `pyjson.Marshal`。键的顺序按 Python 字典字面量的顺序，在 `api/answers.go` 里用有序结构体逐一写出。分隔符是 `", "` 和 `": "`，非 ASCII 字符转义成 `\uXXXX`。这样 §8.5 的差分测试可以直接比较字节 |
| `Content-Type`、`Content-Length`、`Cache-Control` | 相同 |
| `Connection: close` | 出现的位置与 Python 完全相同（下面逐条列出） |
| `Date` | 两边都有（Go 自动加） |
| `Server` | Python 会发 `BaseHTTP/0.6 Python/3.12.x`，Go 不发。有意不同：核心不读，也不该暴露版本 |
| 头的顺序 | Go 按键名排序，Python 按写入顺序。HTTP 语义上无关 |
| 原因短语 | 都用标准短语。只有不常见的状态码在透传时可能不同（Python 写空串，Go 写 `status code N`） |

带 `Connection: close` 的场景（逐条对应 Python 设置 `close_connection = True` 的地方）：

- `answer_error` 的所有错误应答；
- 401；
- `/health`（不论成功失败）；
- 路由不匹配的 404；
- 隧道的所有非 101 应答；
- 透传应答（一律带）；
- `handleManagement` 和 `handleWorker` 里用 `close=True` 的 405；
- `UploadError` 的应答。

**不带** close 的有：`/accounts` 非 GET 的 405、`LocalPaths` 的 405、成功的上传分块，以及本地端点的成功应答。

### 3.5 管理端点（上传、runtime、worker）

- **`handleManagement`：** 先捕获 `uploads.Error`：设 close，若应答还没开始，就回 `{status, {"error": code, ...extra}}`（例如 `offset_mismatch` 带 `offset`）。其他错误走 `answerError(MANAGEMENT_ERRORS)`。客户端断开（`EPIPE`、`ECONNRESET`、超时）只记日志，不再写应答。
- **`PUT /images/uploads/<id>`：**
  - 先核对请求头：没有 `Transfer-Encoding`；`Content-Length` 匹配 `^[0-9]{1,12}$` 且在 `1..64 MiB` 内；`X-CCG-Offset` 匹配 `^[0-9]{1,12}$`。不满足就是 `BadRequest('invalid chunk')`，回 400 `invalid_request`。
  - `uploads.Write` 从 `idleBody(r)` 恰好读 `Content-Length` 字节，每次最多 1 MiB，写到 `.part` 文件的偏移处。
  - 读到中途 EOF（`io.ErrUnexpectedEOF`）时，把文件截回原长度，返回 `UploadError(400, invalid_request)`。
  - 成功不带 close，连接可以复用。
- **`GET/DELETE` 单个上传、`POST .../load`、`GET /runtime/cleanup|images`：** 先 `readBody(64 KiB)` 丢弃请求体，与 Python 一致。
- **`POST /runtime/cleanup`：** `readJSON(8 MiB)`。
- **`POST /runtime/controller`：** 成功回 `202 {"accepted": true}`。
- **`handleWorker`：** 方法不是 POST 时回 405 并带 close。`readJSON(64 KiB)` 后，看请求体里有没有 `components`，决定走 `updates.UpdatePair` 还是 `UpdateWorker`。错误按 `WORKER_ERRORS` 应答。

### 3.6 错误种类与应答表

```go
package errs
type Kind uint8
const (BadRequest Kind = iota + 1; InvalidImage; RuntimeNotFound; NotDraft; InvalidCLIProfile; UnsupportedContainer
       UpgradeInProgress; ResourceInUse; OwnershipMismatch; ImagePullFailed; DiskQuotaUnavailable; ContainerChanged
       RuntimeBusy; ActivationFailed)
type Error struct{ Kind Kind; Code string /* 只有 ActivationFailed 用 */; Msg string; Names []string; Err error }
func (e *Error) Error() string; func (e *Error) Unwrap() error
func New(k Kind, msg string) *Error; func Activation(code, msg string) *Error; func InUse(names []string) *Error
type Set uint32
var Request    = SetOf(BadRequest, NotDraft, ImagePullFailed, InvalidCLIProfile, DiskQuotaUnavailable, ActivationFailed, ResourceInUse, RuntimeBusy)
var Delete     = Request | SetOf(OwnershipMismatch)
var Management = SetOf(BadRequest, InvalidImage, ImagePullFailed, UpgradeInProgress, RuntimeBusy)
var Worker     = SetOf(BadRequest, InvalidImage, RuntimeNotFound, UnsupportedContainer, ImagePullFailed, ContainerChanged, RuntimeBusy)
var Tunnel     = SetOf(BadRequest, RuntimeBusy)
// Answer 依次查表，规则同 common.error_answer：
func Answer(err error, named Set) (status int, code string, known bool)
```

应答表与 `common.ERRORS` 逐行相同：

| Kind | 状态码 | code |
|---|---|---|
| BadRequest | 400 | `invalid_request` |
| InvalidImage | 400 | `invalid_image` |
| RuntimeNotFound | 404 | `not_found` |
| NotDraft | 405 | `method_not_allowed` |
| InvalidCLIProfile | 409 | `cli_profile_unavailable` |
| UnsupportedContainer | 409 | `unsupported_container` |
| UpgradeInProgress | 409 | `upgrade_in_progress` |
| ResourceInUse | 409 | `resource_in_use` |
| OwnershipMismatch | 409 | `resource_in_use` |
| ImagePullFailed | 503 | `image_pull_failed` |
| DiskQuotaUnavailable | 503 | `disk_quota_unavailable` |
| ContainerChanged | 503 | `container_changed` |
| RuntimeBusy | 503 | `runtime_unavailable` |
| ActivationFailed | 503 | `egress_not_ready` 或 `proxy_check_failed` |
| 其余一切（含 guard 的 404、502，网络错误，普通 `error`） | 503 | `runtime_unavailable`，`known=false`，日志带错误链 |

注意 guard 的 404 **不能**自动映射成 `RuntimeNotFound`。Python 里漏到外层的 `docker.errors.NotFound` 回的是 503。只有 `running_worker` 和 `same_container` 这类显式转换的地方，才会产生 404 或 `container_changed`。

日志格式与 Python 相同，每次失败一行：方法、`key=`、`path=`、结果、错误类型名和消息（截到 300 字符）。不记请求体、请求头和 URL。

### 3.7 透传到 Worker（`pass_through` + `relay`）

```go
func (s *Server) passThrough(w http.ResponseWriter, r *http.Request, aid, path string, body []byte) {
    if !methodAllowed(path, r.Method) { replyErr(w, 405, "method_not_allowed", false); return }
    st, err := s.M.ReadyState(r.Context(), aid, r.Header.Get("X-CCG-Revision"))   // 持账号锁，最多等 20 s
    if err != nil { s.answerError(w, r, err, errs.Request); return }
    if st == nil { replyErr(w, 409, "not_synchronized", false); return }
    if (strings.HasPrefix(path, "admin/auth/") || path == "admin/usage") && st.AuthMode == "api_key" {
        replyErr(w, 409, "api_key_account", false); return
    }
    resp, err := s.Worker.Do(r.Context(), st, r.Method, path, bytes.NewReader(body),
        workeradmin.Timeouts{Connect: 5 * time.Second, Idle: 240 * time.Second}) // 不再持锁
    ...
    h := w.Header()
    h.Set("Content-Type", or(resp.Header.Get("Content-Type"), "application/json"))
    h.Set("Connection", "close")
    h.Set("Cache-Control", "no-store")
    if path == "admin/request-logs/read" { copy X-Log-File-Size / X-Log-Offset / X-Log-Length / X-Content-Type-Options（非空才复制） }
    h["Transfer-Encoding"] = []string{"identity"}   // 关键，见下
    w.WriteHeader(resp.StatusCode)
    rc := http.NewResponseController(w)
    for { n, err := resp.Body.Read(buf); if n > 0 { rc.SetWriteDeadline(now+240s); w.Write(buf[:n]); rc.Flush() }; if err != nil { break } }
}
```

逐项一致性：

- **不带 `Content-Length`、不分块、以关闭连接结束：** Python 是这么回透传应答的。Go 的 HTTP/1.1 服务器在没有 `Content-Length` 时默认改用 chunked。处理办法是把 `Transfer-Encoding` 设成 `identity`：Go（`chunkWriter.writeHeader`）看到它会删掉这个头、不分块，并在应答后关闭连接，正好就是 Python 的格式。用一个原始 TCP 测试锁住这一点：读到的应答头里没有 `Transfer-Encoding`，应答体以 EOF 结束。如果某个 Go 版本改了这个行为，退路是 `Hijack` 后手写状态行和头。
- **边到边写：** Python 是 `iter_content(chunk_size=None)` 每收到一块就 write + flush。Go 同样每次 Read 之后立刻 `Flush`。缓冲区 32 KiB，只限制单次读取量，不等攒满。
- **发给 Worker 的请求头：** 只发 `Authorization: Bearer <admin_key>`、`Content-Type: application/json`（GET 也发，与 Python 相同）。另外：
  - `User-Agent` 显式设为空，Go 就不发；
  - 设 `DisableCompression`，并显式发 `Accept-Encoding: identity`；
  - 调用方的任何头都不转发（`test_headers.py` 的不变量）。
  - 与 Python 的差别：requests 会发 `Accept-Encoding: gzip, deflate`，遇到压缩会透明解压。Worker 的管理端点不压缩，改成 identity 后行为等价，而且更直接。
- **请求体：** 空体用 `nil`。POST、PUT 时 Go 会发 `Content-Length: 0`，与 requests 相同。
- **超时：** 连接 5 s（`net.Dialer.Timeout`），读 240 s。读超时用连接包装 `idleConn`：每次 Read 之前设 `SetReadDeadline(now+240s)`。此外设 `ResponseHeaderTimeout: 240s`。
- **代理和重定向：** 不走代理（`Proxy: nil`）；不跟随重定向（`CheckRedirect` 返回 `http.ErrUseLastResponse`）。
- **客户端先断开：** `r.Context()` 取消会中止上游请求。Python 要等下一次写失败才发现，Go 的做法更早。断开只记 `connection dropped`。

### 3.8 隧道 `GET /accounts/<key>/tunnel`

```go
func (s *Server) tunnel(w http.ResponseWriter, r *http.Request, aid string) {
    // 1. 非 GET → 405 close；Upgrade 头 trim+lower == "ccg-tunnel"、Connection 逗号分隔后（trim+lower）含 "upgrade"、
    //    len(r.TransferEncoding)==0、原始 Content-Length 头是 "" 或 "0"；否则 400 invalid_request（都带 close）
    // 2. target, err := s.M.Connection(ctx, aid, rev)：err → answerError(errs.Tunnel)；nil → 409 not_synchronized
    // 3. up, err := net.DialTimeout("tcp", target.AppIP:Port, 5*time.Second)：失败 → 503 runtime_unavailable
    // 4. conn, rw, _ := http.NewResponseController(w).Hijack()
    //    写 "HTTP/1.1 101 Switching Protocols\r\nDate: ...\r\nConnection: Upgrade\r\nUpgrade: ccg-tunnel\r\n\r\n"
    // 5. 先把 rw.Reader.Buffered() 里已收到的字节（紧跟在 Upgrade 请求后面流水线发来的请求）发给 up
    // 6. splice(conn, up)
}
```

`splice` 的语义与 Python 相同：

```go
const tunnelIdle = 3700 * time.Second
func splice(client net.Conn, clientBuf *bufio.Reader, up net.Conn) {
    closeBoth := sync.OnceFunc(func() { shutdownRDWR(client); shutdownRDWR(up) })
    pump := func(dst, src net.Conn, srcR io.Reader) {
        buf := make([]byte, 64<<10)
        for {
            src.SetReadDeadline(time.Now().Add(tunnelIdle))
            n, err := srcR.Read(buf)
            if n > 0 {
                dst.SetWriteDeadline(time.Now().Add(tunnelIdle))
                if _, werr := dst.Write(buf[:n]); werr != nil { closeBoth(); return }
            }
            if err == io.EOF { closeWrite(dst); return }   // 半关闭：把 EOF 传给对端
            if err != nil { closeBoth(); return }          // 超时、复位：两边都结束
        }
    }
    done := make(chan struct{})
    go func() { pump(client, up, up); close(done) }()      // Worker → 客户端
    pump(up, client, clientBuf)                             // 客户端 → Worker（先吐出缓冲）
    <-done
    client.Close(); up.Close()
}
```

- **半关闭：** `closeWrite` 对 `*net.TCPConn` 调 `CloseWrite()`，与 `shutdown(SHUT_WR)` 等价。`Hijack` 拿到的连接在纯 TCP 下就是 `*net.TCPConn`。测试里还要覆盖 TLS 包装的情形：这时取不到 `*net.TCPConn`，降级为整体关闭。
- **空闲超时：** 3700 s，**按方向**计算：一个方向读或写等待超过 3700 s，就关掉两边。Python 对两个 socket 都 `settimeout(3700)`，所以客户端 3700 s 不发字节（例如一个超长的 SSE 应答）也会断。保持原样，不悄悄改语义。
- **流水线字节：** Python 用 `rfile.read1` 读走缓冲里已有的字节。Go 用 `bufio.Reader` 作为客户端方向的读端，Hijack 返回的 `rw.Reader` 里的缓冲自然先被读出。
- **生命周期跟踪：** 隧道 Hijack 之后，`http.Server.Shutdown` 管不到它。所以 `api` 在一个集合里登记活跃隧道，优雅退出时统一关闭（§4.5）。
- **101 应答：** 头里只有 `Date`、`Connection: Upgrade`、`Upgrade: ccg-tunnel`，少一个 `Server`。核心（`controller_tunnel.go`）只看状态码和 `Upgrade` 头。

---

## 4. 并发与锁

Python 靠 GIL 和 `RLock` 维持正确性，Go 是真并发。所有共享内存都要有明确的锁，CI 用 `go test -race`。

### 4.1 锁一览

| 锁 | Go 实现 | 保护什么 | 对应 Python |
|---|---|---|---|
| 账号锁 | `accounts.locks`：`map[string]chan struct{}`（容量 1 的信号量），由一个 `sync.Mutex` 保护这个 map | 同一账号的配置、删除、更新、恢复、盘点 | `Manager.guard(aid)`（RLock） |
| network 锁 | `sync.Mutex` | 网段分配、建网（`_provision` 全程） | `network_lock`（RLock） |
| shared 操作锁 | `sharedOp sync.Mutex` | 网关的一切变更：configure、sync、fence、remove、collect、ensure | `SharedEgress.lock` 的写用途 |
| shared 数据锁 | `sharedMu sync.RWMutex`（叶子锁） | `data`、`boot`、`loadedNodes/Ports` 的读写 | `SharedEgress.lock` 的读用途 |
| mem 锁 | `sync.Mutex`（叶子锁） | `online`、`boots`、`imageSeen`、`dropped`、`diskQuotaSupport` | GIL |
| runtime 锁 | `sync.Mutex` | `SetRuntimeImages` | `runtime_lock` |
| upgrade 锁 | `sync.Mutex` | `UpgradeController`、`RecreateEgress` | `upgrade_lock` |
| uploads | `sync.Mutex` + `map[id]*sync.Mutex`；清理用 `TryLock` | 上传的创建、清理、单个上传的 I/O | `Uploads.lock` + `busy` |
| 数据根文件锁 | `flock(LOCK_EX\|LOCK_NB)` 锁 `<root>/.lock` | 同一数据根只能有一个控制器进程 | 同左 |

账号锁：

```go
type Held struct{ aid string; release func() }
func (l *locks) Lock(ctx context.Context, aid string) (*Held, error) {
    ch := l.get(aid)                       // 第一次用到时创建，此后一直保留（与 Python 相同；键的数量有上限）
    select {
    case ch <- struct{}{}: return &Held{aid, func() { <-ch }}, nil
    case <-ctx.Done():     return nil, errs.New(errs.RuntimeBusy, "account runtime is busy")
    }
}
func (l *locks) TryLock(aid string) (*Held, bool) // select + default
```

- **请求路径：** `connection`、`tunnel`、透传用 `context.WithTimeout(r.Context(), 20*time.Second)`，与 `REQUEST_LOCK_WAIT=20` 一致。
- **其他调用：** `apply`、`delete`、更新、清理、恢复用不设超时、只随进程退出取消的 ctx，与 Python 的无限等待一致。
- **不可重入的处理：** Python 用 RLock，唯一真正重入的地方是 `cleanup.clean_one`：持锁后调用 `manager.delete`，`delete` 再加锁。Go 的做法：
  - 凡是"调用方必须已持锁"的方法，都带 `*Held` 参数，例如 `DeleteLocked(h)`；
  - 方法开头断言 `h.aid == aid`，测试里违反就 panic。
  - 编译期就能看出哪些路径持锁。

### 4.2 锁顺序

```text
账号锁 → sharedOp → network 锁
叶子锁（任何时候都可以短暂获取，持有期间不做 I/O，也不再获取别的锁）：sharedMu、mem
独立的锁（不与上面的锁嵌套）：runtime 锁、upgrade 锁、uploads 的锁、文件锁
```

依据：
- `_apply_shared`：先 `_detach_shared`（取 shared，然后释放），再 `provision`（取 network，然后释放），最后 `shared.apply`（取 shared）。这一路上从不在持有 network 锁时去拿 shared 锁。
- 原来的 `SharedEgress.create` 会在持有 shared 锁时调 `ensure_network`（network 锁）。这条路径已随 compose 删除，所以 Go 版里 sharedOp 和 network 锁实际上不会嵌套。仍然规定 sharedOp 在前，留作防御。

用一个测试锁住顺序：在调试构建（`-tags lockcheck`）里，每把锁加锁时检查本 goroutine 已持有的锁的顺序号是否更小。CI 跑一遍这个 tag 的测试，生产构建没有开销。

### 4.3 把 shared 锁拆成两把的理由

Python 的 `SharedEgress.healthy()` 在**请求路径上**（经 `readiness`）获取 shared 锁。而 `configure`、`collect` 会持这把锁执行多次 exec，耗时可达数秒到数十秒，于是别的账号的 `connection` 要跟着排队。

Go 里，`healthy` 只在 `sharedMu.RLock` 下读一份绑定和 `boot` 的快照，不做 I/O。容器状态由 readiness 的那一次 guard 调用带回来（§5.5）。

这样做安全：
- 账号 X 的 `configure` 持有 X 的账号锁，X 自己的 readiness 也要先拿账号锁，所以读不到 X 的中间状态；
- 对其他账号 Y，X 的 configure 只会在 Y 的容器真的变了时（`sync` 里）把 Y 标为不活跃，这是本来就该被看到的；
- `boot` 只在 `ensure` 发现网关重启时才改。

### 4.4 后台循环

```go
func (m *Manager) RunBackground(ctx context.Context) {
    go every(ctx, 10*time.Second, func(ctx context.Context) { m.recover(ctx); m.collect(ctx) })   // shared.run
    go every(ctx, 300*time.Second, m.recheckProxies)                                               // watch_proxies
}
func every(ctx context.Context, d time.Duration, f func(context.Context)) {
    t := time.NewTimer(d)                 // 与 Python 相同：先睡一个周期再做第一次
    defer t.Stop()
    for { select { case <-ctx.Done(): return; case <-t.C: } ; safe(ctx, f); t.Reset(d) }  // 做完再计时，不会重叠
}
```

- `safe` 会 recover panic 并记一行 `shared egress pass failed: ...`，循环不因此退出，与 Python 的 `except Exception` 一致。
- `recover` 逐个账号 `Lock(ctx)`，阻塞等待（Python 也阻塞），可随 ctx 取消。`recheckProxies` 用 `TryLock`，拿不到就跳过，与 `acquire(blocking=False)` 一致。
- 代理复核：
  - DNS 用 `netplan.Resolver`。生产实现是 `net.Resolver{PreferGo: true}`，二进制是 CGO_ENABLED=0 的纯 Go 实现，查容器里的 `/etc/resolv.conf`，即 Docker 内置 DNS `127.0.0.11`。
  - 每次查询 10 s 超时。
  - `getaddrinfo` 的"第一个地址"与 Go `LookupNetIP(ctx, "ip4", host)` 的第一个地址，排序规则都是 RFC 6724，结果一般相同。`proxy_moved` 比较的是集合，不受顺序影响。
- 新增 `m.kickRecover()`：往一个容量为 1 的通道里塞一个值，让 recover 立刻跑一轮，不必等 10 s。只在网关重建后使用（§7.3）。

### 4.5 启动与退出

**启动顺序：**

1. `config.FromEnv`。缺 `CCG_GUARD_URL` 或 `CCG_GUARD_TOKEN`，或控制器密钥短于 32 字符，就打印原因并以退出码 2 退出。
2. `umask(077)`。
3. 打开数据根，`flock`。拿不到锁就退出。
4. 读 `runtime.json`，再读共享网关状态（含旧路径迁移，§6.3）。共享状态的 schema 不等于 1 时退出，与 Python 的 `RuntimeError` 一致。
5. 建 guard 客户端，调一次 `GET /v1/health`，检查 guard 的 features（需求 R17）。
   - guard 不可达时**不退出**，只记警告：控制器照常监听，`/health` 照常回答；凡是需要 guard 的操作，都按未命名错误回 503。
   - 这样 guard 重启期间，核心看到的是 `runtime_unavailable`，不是"控制器离线"。
6. 启动后台循环，再监听端口。

**退出：** 收到 SIGTERM 或 SIGINT 后：

1. 取消后台 ctx。
2. 调 `srv.Shutdown`，最多等 8 s。compose 默认 `stop_grace_period` 是 10 s；建议 compose 里写成 15 s，Shutdown 等 12 s。
3. 到时间后关闭所有登记的隧道，进程退出。

Python 没有处理 SIGTERM，收到就立即终止。Go 让进行中的 `apply` 有机会做完。状态文件都是原子写入的，被强制杀掉也不会损坏。

---

## 5. guard 客户端（`internal/guardapi`）

### 5.1 接口

按领域拆成几个小接口，组合成 `Client`，方便各包只依赖自己用到的那部分，测试替身也好写：

```go
type System interface {
    Health(ctx) (Health, error)
    Subnets(ctx) (Subnets, error)                 // {host_routes:[cidr], networks:[{name,labels,subnets}]}
    Inventory(ctx) (Inventory, error)             // 本前缀全部带 ccg 标签的容器、网络、卷
}
type Images interface {
    ImageInspect(ctx, ref string) (*Image, error) // 404 → ErrNotFound
    ImagePull(ctx, ref string) error              // 失败 → *Error{Code:"pull_failed"} 或 "forbidden"
    ImageLoad(ctx, r io.Reader, size int64) ([]LoadedImage, error)
    ImageFile(ctx, ref, path string, limit int64) (io.ReadCloser, int64, error)
}
type Accounts interface {
    Account(ctx, aid string) (*Account, error)              // app/others/network/uplink/volume/volume_users/gateway_attached
    AccountState(ctx, aid string) (*AccountState, error)    // ?fields=state：就绪检查专用
    CreateNetwork(ctx, aid string, req NetworkRequest) (*Network, error)
    DeleteNetwork(ctx, aid string, role string) error       // "net" | "uplink"
    EnsureVolume(ctx, aid string, req VolumeRequest) (*Volume, error)
    DeleteVolume(ctx, aid string) error
    CreateApp(ctx, aid string, req AppRequest) (*Container, error) // 只建不启动，与 Python 相同（需求 R21）
    AppAction(ctx, aid, action string, timeout time.Duration) error // start|stop|restart
    DeleteContainer(ctx, aid, suffix string) error
    AppExec(ctx, aid string, argv []string, user string) (ExecResult, error)
    AppArchiveGet(ctx, aid, path string) (io.ReadCloser, error)
    AppArchivePut(ctx, aid, dir string, tar io.Reader, size int64) error
    AppTop(ctx, aid string) (Top, error)
    WriteResolv(ctx, aid, nameserver string) error
    InstallFirewall(ctx, aid, rules, defaultGateway string) error
    RunJob(ctx, aid string, job Job) (JobResult, error)
}
type Gateway interface {
    Gateway(ctx) (*Container, error)                          // 不存在 → (nil, nil)；归属不符 → *Error{409}
    EnsureGateway(ctx) error                                  // compose up -d egress（不改镜像）
    RecreateGateway(ctx, image string) error                  // 维护操作，控制器只在显式请求时调用
    GatewayExec(ctx, argv []string) (ExecResult, error)
    ConnectGateway(ctx, aid, ipv4 string) error
    DisconnectGateway(ctx, aid string) error
    WriteGatewayFile(ctx, name string, data []byte) error
}
type Controller interface {
    UpgradeController(ctx, image string) error                // 202 → nil
    UpgradeStatus(ctx) (UpgradeStatus, error)
}
type Client interface{ System; Images; Accounts; Gateway; Controller }
```

`AppHandle` 把 `aid`、`Client` 和一份 inspect 包在一起，实现 `containerfs.App`。这样 `containerfs` 和 `updates` 的代码读起来就像 Python 里的容器对象。

### 5.2 类型：保留原始 inspect

```go
type Container struct {
    Raw map[string]any                       // guard 返回的原样内容（UseNumber 解码），container_identity 用
    ID string; Name string; Image string; Created string; Path string
    Status string; StartedAt string
    Labels map[string]string; Env []string; User string; ConfigImage string
    Networks map[string]Endpoint             // NetworkSettings.Networks
}
func (c *Container) BootID() string { return c.StartedAt }
```

为什么要留 `Raw`：`container_identity` 是对 `Image`、`Config.Image`、`Config.User`、`Labels`、`Mounts`（每项单独编码后排序）、`Path`、`Args` 的 `json.dumps(sort_keys=True)`。它保存在 `state.active_runtime.container_identity` 里，下次会拿来和当前容器比较。

- 字段少一个，或者 `null` 和 `[]` 不分，结果就不一样。
- `_same_runtime` 会因此判为"CLI 不一致"，账号的 PUT config 就回 `409 cli_profile_unavailable`。

所以 Go 必须对**原始值**用 `pyjson` 编码。这也要求 guard 不得裁剪 `Mounts` 的字段（需求 R1）。

### 5.3 错误映射

```go
type Error struct{ Status int; Code, Reason, Message string; Names []string } // 来自 guard 的 {"error","message","reason"?,"names"?}
var ErrNotFound    = &Error{Status: 404, Code: "not_found"}   // errors.Is 只比 Status/Code
var ErrUnavailable = errors.New("guard unavailable")           // 连接失败、超时、5xx 以外的协议错误
func (e *Error) Is(target error) bool
```

guard 的错误映射到控制器的错误：

| guard 应答 | 控制器错误 | 说明 |
|---|---|---|
| 404 `not_found` | `guardapi.ErrNotFound`（保持原样） | 调用方显式判断，相当于 Python 的 `docker.errors.NotFound`。漏到外层时回 503 |
| 409，`reason=ownership_mismatch` | `errs.OwnershipMismatch`（Names） | |
| 409，`reason=resource_in_use` | `errs.ResourceInUse`（Names） | |
| 409，`reason=upgrade_in_progress` | `errs.UpgradeInProgress` | |
| 409，`reason=exists` | 内部重试一次：重新查询，然后按"已存在"处理 | 并发建网 |
| 409，`reason=not_running` | `guardapi.ErrNotRunning` | `_worker_healthy` 遇到时当作"还没好"（Python 是吞掉 APIError） |
| 503 `disk_quota_unavailable` | `errs.DiskQuotaUnavailable`（并记录 `diskQuotaSupport=unavailable`） | |
| 503 `busy` | `errs.RuntimeBusy` | |
| 403 `forbidden` | 按端点：导入镜像 → `uploads.Error(400,"load_forbidden")`；升级 → `errs.InvalidImage`；拉取 → `errs.ImagePullFailed`；其他 → 未命名 | |
| 400 `invalid_request` | 未命名（控制器的 bug），日志写清是哪个端点 | |
| 502 `docker_error`、连接错误、超时 | 未命名 → 503 `runtime_unavailable` | |

### 5.4 传输、超时与流式

- **传输：** `http.Transport{Proxy: nil, DisableCompression: true, MaxIdleConnsPerHost: 16, IdleConnTimeout: 90s, ForceAttemptHTTP2: false}`，拨号用 `idleConn` 包装。基地址只接受 `http://<IPv4>:<port>`（启动时校验）。每个请求都带 `Authorization: Bearer <token>`。令牌只放在内存里，从不进日志和错误文本。
- **超时：** 按类别分，取值都高于 guard 自己的上限：

| 类别 | 端点 | 超时 |
|---|---|---|
| 就绪检查 | `AccountState` | 总时长 5 s（远小于请求路径 20 s 的锁等待） |
| 普通查询和变更 | inspect、网络、卷、建容器、resolv、文件、connect | 总时长 60 s（Python 的 docker 客户端是 60 s） |
| exec | app/gateway exec | 总时长 120 s |
| 启停 | `AppAction` | timeout + 60 s |
| 一次性任务、防火墙 | `RunJob`、`InstallFirewall` | 150 s（guard 写死 120 s，加余量） |
| 拉取 | `ImagePull` | 30 min |
| 流式 | `ImageLoad`、`ImageFile`、归档 GET/PUT | 不设总时长，空闲 120 s（逐次读写续期） |
| 升级、网关重建 | `UpgradeController` 10 s（202 立即返回）；`RecreateGateway` 5 min | |

- **流式调用：**
  - `ImageLoad`：请求体是 `io.Reader`（打开的 `.part` 文件），明确给出 `ContentLength`。上传时边读边算 SHA-256（`io.TeeReader`）。导入前 `uploads.Load` 已经算过一遍并核对，这里再算是为了确认送出的字节与核对时相同。
  - `ImageFile` 和 `AppArchiveGet`：返回 `io.ReadCloser`。客户端用 `io.LimitReader(limit+1)` 截断，超出就报错，不信任对端声明的大小。
  - `AppArchivePut`：请求体由 `containerfs.tarStream(name, blob)` 拼成：`io.MultiReader(tar 头, blob 内容, 填充, 结尾两个空块)`。不在内存里再复制一份 512 MiB。
  - 大文件（CLI 最大 512 MiB，Worker 最大 256 MiB）在控制器里统一用 `containerfs.Blob` 表示。超过 1 MiB 的先落盘到 `<root>/.spool/<随机>`（0600，用完删除，启动时清空），哈希边读边算，每 8 MiB 写穿并丢掉页缓存（页缓存记在控制器的 cgroup 里）。写进容器后的回读也是边读边算哈希，不留在内存里。同一镜像的同一个文件只读一次，所有激活共享；同时最多 2 个激活。控制器容器是只读根文件系统加 64 MiB 的 `/tmp`，装不下，所以落在数据根里。2026-11-01 生产上第一版的回读用 `io.ReadAll`，成对激活时在 1 GiB cgroup 里被 OOM 杀；修复后实测匿名内存在 10 MiB 以内（evidence/2026-11-01-production §3.1）。Python 版的峰值接近 1 GiB，原因是 BytesIO 复制和 tar 复制。
- **输出上限：** exec 应答最多 24 MiB（guard 是 16 MiB 输出，base64 后约 21.3 MiB）；JSON 应答最多 8 MiB；任务的 stdout 最多 128 KiB。

### 5.5 请求路径上的就绪检查：一次调用

Python 每个请求的就绪检查要做 4 次 Docker inspect：`owned(app)`、`shared.container()`，`shared.healthy` 里还会再各做一次。

Go：

```go
func (m *Manager) Readiness(ctx context.Context, aid string, st *store.AccountState) string {
    rev, ok := m.mem.online(aid); if !ok { return "" }              // 不在线：不调 guard
    s, err := m.guard.AccountState(ctxTimeout(ctx, 5*time.Second), aid)
    // s = {app:{id,status,started_at,image,ip}, gateway:{id,status,started_at}}，app 或 gateway 不存在时为 null
    if err != nil || s.App == nil || s.Gateway == nil ||
        s.App.Status != "running" || s.Gateway.Status != "running" ||
        [2]string{s.App.StartedAt, s.Gateway.StartedAt} != m.mem.boots(aid) ||
        !m.shared.healthySnapshot(aid, st, s.App.ID, s.Gateway) {
        m.GoOffline(aid)
    }
    return m.mem.onlineRev(aid)
}
```

- **guard 调用出错时：** Python 遇到 `NotFound` 才掉线，遇到其他 Docker 错误会把异常抛到外层，回 503。Go 遇到 404 掉线；遇到其他错误（guard 不可达）同样回 503，**不掉线**。这样 guard 短暂重启不会把所有账号打成 pending。
- **`public()`：** 也复用这一次调用里的 `app.Image`，不再单独 inspect。`app_image_id` 保留 30 s 缓存。所以一次 `GET status` 只调 guard 一次，30 s 内另有一次 image inspect。
- **以后要再减：** 可以让 guard 按 Docker 事件维护一份容器状态缓存（guard 设计 §11 已提到），这里的接口不用改。

---

## 6. 状态文件

### 6.1 数据根与布局

容器内是 `/data`，宿主机上是 `/opt/ccgateway-controller`，由 compose 挂载。文件名和格式全部沿用 Python：

```text
/data/.lock                          flock
/data/runtime.json                   {"app","egress","env":{"app","egress"}}
/data/uploads/<id>.part|.json|.tmp
/data/backups/<key>.json             删除账号时保留的 state 副本
/data/<key>/state.json
/data/<key>/egress-desired.json      核心下发的配置去掉 auth
/data/<key>/worker-backups/<UTC>-<sha12>
/data/<key>/{sing-box.json,firewall.nft}    旧版遗留，drop_own_egress 删除
/data/shared-egress-state.json       原 shared-egress/state.json（含代理凭证）
/data/.spool/                        Go 新增：大文件暂存，启动时清空；Python 版不认识它，也不会碰它
```

`resolv.conf` 和 `app.nft` 不再出现在控制器的数据根里，它们在 guard 所有的 `/opt/ccgateway-runtime/` 下。

### 6.2 Go 结构体：保留未知字段

**原则：** 已知字段用结构体，便于类型检查；未知字段原样保留在 `Extra` 里，写回时合并。字段的"缺省"和"null"要能区分，因为 Python 用的是 `dict.get` 和 `pop`。

```go
type AccountState struct {
    APIKey     string          `json:"api_key"`
    AdminKey   string          `json:"admin_key"`
    AppIP      string          `json:"app_ip"`
    GatewayIP  string          `json:"gateway_ip"`
    Revision   string          `json:"revision"`
    Status     string          `json:"status"`            // pending|syncing|ready|blocked|egress_error
    CreatedAt  string          `json:"created_at"`
    Network    *netplan.Policy `json:"network,omitempty"`
    DiskQuota  *DiskQuota      `json:"disk_quota,omitempty"`
    AuthMode   Opt[string]     `json:"auth_mode"`
    CLI        Opt[json.RawMessage] `json:"cli"`        // 缺省 / null / {...} 三态
    Environment, EnvironmentCreated, EnvironmentDesired Opt[Environment]
    EnvironmentPending Opt[bool]
    ActiveRuntime Opt[json.RawMessage]                   // 内含 container_identity，原样保存
    EgressBackend Opt[string] `json:"egress_backend"`    // 一直写 "shared_xray"，0.1.117 以前的版本回滚时要读
    MigrationFailed Opt[json.RawMessage]
    Extra map[string]json.RawMessage `json:"-"`          // 其余一切键，含 OWN_EGRESS_STATE 遗留字段
}
type Opt[T any] struct{ Set bool; V T }                  // Set=false 表示缺省，写回时不输出这个键
func (s *AccountState) UnmarshalJSON(b []byte) error     // 先解成 map[string]json.RawMessage，取出已知键，余下放进 Extra
func (s AccountState) MarshalJSON() ([]byte, error)      // 已知键 + Extra 合并；Extra 里与已知键重名的忽略
func (s *AccountState) Pop(key string)                   // 对已知键置 Set=false，对 Extra 删除
```

其余文件：

| 文件 | 写法 |
|---|---|
| `egress-desired.json` | 不用结构体，原样存 `map[string]json.RawMessage`（删掉 `auth`）。读出来以后，`proxy`、`direct`、`revision` 交给 `pyjson` 的真值和类型函数处理（§6.4）。这样核心以后新增的键不会丢 |
| `runtime.json` | 结构体加 `Extra` |
| `backups/<key>.json` | `state.json` 的原样字节拷贝（Python 是 `json.dumps(state)`），不需要专门的结构体 |
| `shared-egress-state.json` | `{"schema":1, "salt", "bindings":{key: Binding}, "nodes":{tag: {"outbound": RawMessage, "endpoint": [ip, port] \| null}}}`。`Binding` 加 `Extra`；`outbound` 存成 RawMessage，用于原样下发给 `xray api ado`；从不重新生成已有节点 |
| `uploads/<id>.json` | `{"size": int, "sha256": str\|null}` |

### 6.3 原子写入与旧路径迁移

```go
// 与 write_private 相同：<name>.tmp → 0600 → 写入 → fsync → rename；Go 另外 fsync 所在目录（Linux）
func WriteAtomic(dir *os.Root, name string, data []byte) error
```

- **路径：** 用 Go 1.24 的 `os.Root` 打开数据根，所有路径都经由它，`..` 和符号链接逃不出数据根。§2.4 的攻击面已经随 guard 消失，这里只是纵深防御。
- **权限：** 目录 0700，文件 0600。`umask 077`。
- **临时文件名：** 仍是 `<name>.tmp`，与 Python 相同，回滚时残留的临时文件双方都不在意。
- **写序列化：** 同一文件的并发写由账号锁或 sharedOp 串行化，与 Python 相同。
- **共享状态的旧路径：** 启动时：
  - 新路径 `shared-egress-state.json` 不存在、旧路径 `shared-egress/state.json` 存在 → `rename` 到新路径，记一行日志；
  - 两个都在 → **拒绝启动**；
  - 两个都不在 → 新建（新 salt，空绑定），与 Python 相同。

  为什么两个都在要拒绝启动：如果随手新建一份空状态，salt 会变，所有出站 tag 都会变，绑定全丢，所有账号会被一起切断。宁可停在那里，让人看一眼。正常情况下 guard 的接管（adopt）已经把它搬好了。

### 6.4 `pyjson`：Python 兼容编码（兼容的关键）

下表这些值，都是对 `json.dumps(...)` 的结果做哈希，或者直接逐字节比较。Go 必须逐字节重现，否则升级后会出现表里的后果。

| 用途 | Python 表达式 | 编不一致的后果 |
|---|---|---|
| `auth_fingerprint` | `hmac(salt, json.dumps(identity, sort_keys=True))` | 存在容器标签 `AUTH_LABEL` 上。`_keep_existing` 判为凭证已变，**重建每个账号容器** |
| `container_identity` | `json.dumps({...}, sort_keys=True)`，`mounts` 每项是 `json.dumps(m, sort_keys=True)` 后排序 | 配对激活过的账号 PUT config 回 `409 cli_profile_unavailable` |
| 出站 tag | `sha256(salt + json.dumps(out, sort_keys=True))[:24]` | 每次 apply 都多出一个出站，旧的等 collect 回收；账号连接会被不必要地打断 |
| `NETWORK_LABEL` | `json.dumps(policy, sort_keys=True)` | 只写不读；不一致只影响排查 |
| 清理 identity | `sha256(json.dumps(resources, sort_keys=True))` | 用 Python 版盘点、Go 版清理时一律回 `changed`。结果安全，但升级窗口内清理不会生效 |
| HTTP 应答体 | `json.dumps(data)` | 不影响核心，但差分测试需要它 |

```go
package pyjson
// Marshal：与 json.dumps(v, sort_keys=sortKeys) 的默认参数（ensure_ascii=True、separators=(", ", ": ")）逐字节相同
func Marshal(v any) []byte            // map 按插入顺序输出时需要传 *Ordered；普通 map 一律排序
func MarshalSorted(v any) []byte      // sort_keys=True
```

编码规则：

- **字符串：**
  - `"` 编成 `\"`，`\` 编成 `\\`；`\n \r \t \b \f` 用短转义；
  - 其余 `< 0x20` 的字符编成 `\u00XX`（小写十六进制）；
  - 0x7F 原样输出；
  - 非 ASCII 字符编成 `\uXXXX`（小写），BMP 之外的字符拆成代理对；
  - 不转义 `<`、`>`、`&`、U+2028、U+2029（Go 的 `encoding/json` 会转义它们，这正是不能直接用它的原因）。
- **键的排序：** 按 Unicode 码点排序。合法 UTF-8 按字节排序与按码点排序结果相同。
- **数字：**
  - int 输出十进制；
  - `json.Number` 中只含整数的原样输出；
  - float 按 Python `repr` 输出：最短往返位数；整数值也带 `.0`；指数 `< -4` 或 `>= 16` 时用 `1e+16`、`1e-05` 这种形式。实现 `pyFloatRepr`，用参照向量测试。
- **其他：** `true`、`false`、`null`。

同一个包里还有几个 Python 语义的小工具：

| 函数 | 用途 |
|---|---|
| `Truthy(v any) bool` | `null`、`false`、`0`、`0.0`、`""`、`[]`、`{}` 为假。用于 `not desired.get('enabled', True)`、`desired.get('proxy')` |
| `IsInt(v any) bool` | 对应 `isinstance(x, int)`，排除 bool |
| `IntOf(v any) (int64, error)` | 对应 `int(proxy['port'])`：int；float 向零截断；bool 视为 0 或 1；字符串去掉两端空白后按十进制解析，允许 `_` 分隔。核心只发整数，其余分支只为与 Python 一致，有测试覆盖 |
| `IsSpace(r rune) bool` | 对应 `str.isspace`：比 `unicode.IsSpace` 多了 U+001C 到 U+001F，用于 base_url 校验 |
| `URLSplit(s string) (scheme, netloc, hostname string, hasUserinfo bool)` | `urllib.parse.urlsplit` 的子集。`net/url.Parse` 会拒绝 Python 接受的一些串（例如非法的 `%` 转义），所以 `authentication()` 不用 `url.Parse` |
| `IPNetwork(s string)` | `ipaddress.ip_network(strict=False)` 的子集：支持 `a.b.c.d`、`a.b.c.d/len`、`a.b.c.d/掩码`，拒绝带前导零的写法 |

### 6.5 与 Python 互读兼容的测试方法

1. **参照向量（`testdata/pycompat/*.json`）：** 由一个 Python 脚本 `testdata/gen_pycompat.py` 生成，只用标准库，直接调用 Python 版控制器的函数：
   - `auth_fingerprint`；
   - `node()` 的 tag；
   - `container_identity`（喂入合成的 docker inspect）；
   - `json.dumps` 的边界值（各类转义、非 ASCII、float、嵌套）。

   在 CI 的 Python 步骤里生成，或在 ovh 的一次性容器里生成（本机的 python 只是占位，不能用）。结果提交进仓库。Go 测试逐条比较字节。
2. **Python → Go 往返：** `testdata/state/` 放 Python 0.1.118 写出的合成状态，覆盖：
   - 各种 status；
   - 有和没有 `cli`、`active_runtime`、`environment_desired`；
   - 遗留的 `uplink_ip`；
   - 一个未知键 `future_field`。

   Go 读入后写回。断言：未知键还在；已知键的 JSON 值与原文件相等（解析后用 `reflect.DeepEqual` 比较，不比字节）；缺省的键没有被写成 `null`。
3. **Go → Python 回读：** CI 新增一步 `controller-compat`：
   - `go test -run TestWriteCompatFixtures` 把 Go 写出的状态文件放到临时目录；
   - 用 Python 3.12 跑 `controller/compat_read.py`。它只 import Python 版的 `common.read_json`，以及 `SharedEgress` 读状态的那段逻辑，逐个读入，断言字段与期望一致。

   这一步保证插件能回滚到 0.1.118。Python 源码删除后，这一步改为读取 0.1.118 镜像里的源码（`docker run --rm <0.1.118 digest> python - < compat_read.py`），在发布主机上执行。

---

## 7. 共享网关在 compose 下的行为

### 7.1 职责划分

| 事情 | 谁做 |
|---|---|
| 网关容器的定义（镜像、能力、sysctl、`/config` 挂载、资源、重启策略、uplink 网） | compose（`/opt/ccgateway/compose.yaml` 的 `egress` 服务，`container_name: ccg-shared-egress`） |
| 拉起、重建 | guard：`POST /v1/gateway/ensure`（等价于 `compose up -d egress`，不改镜像）；`POST /v1/gateway/recreate {image}`（维护操作） |
| 接入和断开账号网络、在网关里 exec、写 `/config` 里的文件、绑定状态、恢复 | 控制器 |

compose 的 `egress` 服务**必须**带标签 `io.sup2api.ccgateway.shared=ccg`（需求 R13）。Go 版（经 guard 的 409）和回滚后的 Python 0.1.118 都靠这个标签认领网关。

### 7.2 `ensure` 的新流程（取代 `SharedEgress.ensure/create`）

```text
ensure(existingOnly):
  c := guard.Gateway()
  if c == nil || c.Status != "running":
      if existingOnly: 返回错误（cleanup 的 remove 不去拉起网关，语义同 Python）
      if c == nil: 写 boot.json(BASE)、boot.nft(Firewall({}, {}))、dns.json({})   ← 只在网关不存在时写
      guard.EnsureGateway()
      c = guard.Gateway()；仍不是 running → 错误
  boot := (c.ID, c.StartedAt)
  if boot != shared.boot:  loadInventory(c)；shared.boot = boot     ← Xray API 就绪（最多 40×250 ms），lso/lsi
```

- **为什么只在网关不存在时写 `dns.json={}`：** 网关运行时，这个文件里是活跃账号的映射，写成空会断掉 DNS。`boot.json` 和 `boot.nft` 是常量，什么时候写都一样。
- **兜底：** compose 在控制器不知情时重建网关，`dns.json` 里留着旧映射。网关启动后 Xray 按 `boot.json` 起来，下一次 `sync` 会重写。在此之前，旧映射最多让旧地址的 DNS 查询走到对应端口的入站，而这些入站在 Xray 重启后还不存在，所以查询失败，属于失败关闭。

### 7.3 网关被 compose 重建之后的完整恢复

compose 重建网关（`compose up` 时配置有变、镜像有变、手工 `--force-recreate`，或 guard 的 recreate）会产生这些后果：

- 新的容器 ID 和 `StartedAt`；
- **所有动态接入的账号网络全部丢失**，网关只剩 compose 里定义的 uplink；
- Xray 进程里的出站、入站、路由规则全部清空；
- `ccg_shared` nft 表只剩 `boot.nft`。

控制器的恢复要做到完整，靠下面五步。

**1. 发现。** 有两条途径，都会让 `ensure` 的 `boot != shared.boot` 成立：
- 请求路径：`Readiness` 的 guard 调用带回网关的 ID 和 `StartedAt`，与 `boots[aid]` 不同 → 该账号掉线；
- 后台：10 s 一轮的 recover，或网关重建后的 `kickRecover`，会调 `ensure`。

**2. 重置内存。** `ensure` 发现 boot 变了就调 `loadInventory`，用新进程的空 `lso`、`lsi` 结果覆盖 `loadedNodes` 和 `loadedPorts`。这样下一次 `sync` 会把 `data.nodes` 里的**全部**出站、全部绑定的入站重新 `ado`/`adi`。

**3. 逐个账号重建绑定。** `recover` 遍历 `bindings ∪ 数据根里的 key 目录`。对 `status == "ready"` 且 app 在运行的账号：
- 因为 boot 变了，`healthy` 为假，于是执行 `shared.apply(aid, state, desired)`：
  - 先 `fence`：把本账号标为不活跃，再 `sync`；
  - 然后 `attach`：网关不在账号网上，就按网络当前的端点，选 `.2` 起第一个空闲地址，调 `guard.ConnectGateway`；
  - 在网关里执行 `ip -j -4 addr`，取出新的接口名；
  - 用新的 `gateway`、`interface`、`network_id`、`container_id` 写回绑定。
- 再 `sync`：重新下发出站、入站，`adrules` 全量路由，`dns.json`、`active.nft`，以及 nft 原子替换。
- `state.gateway_ip` 更新为新地址（多半与原地址相同，因为旧端点已随旧容器消失），然后 `guard.WriteResolv` 原地改写 `resolv.conf`。
- 最后 `activate`：
  - 用 `InstallFirewall` 重装账号防火墙，并把默认路由指向新的网关地址；
  - 等网关 `:15001` 监听；
  - 经代理探测；
  - 记下新的 boots，账号重新就绪。

**4. 恢复不了的账号。**
- **非 ready 的账号**（`pending`、`syncing`、`egress_error`）：Python 的规则是"失败的新配置按核心的重试策略走"，recover 跳过它们。它们的公开状态是 `pending`，核心 3 秒一轮的对账会重新 `PUT config` → `_apply_shared` → `shared.apply`，走的是同一条恢复路径。
- **单个账号 apply 失败：** 状态变成 `egress_error`，账号掉线并记日志，同样交给核心对账。下一轮 recover 不会反复重试它，与 Python 一致。
- **app 没在运行的账号：** 不处理。等核心的配置让它启动，或保持阻断。

**5. 恢复时长。** recover 按 key 顺序串行执行，每个账号大约 1–3 s（exec 加探测）。有 10 个账号时，全部恢复约需 30 s，期间这些账号的模型请求会收到 `not_synchronized`。

改进：
- 在 `RecreateEgress` 之后立即 `kickRecover`，不用等 10 s；
- recover 可以改成有限并发（例如 4），因为账号之间只在 sharedOp 上串行，而 sharedOp 只覆盖 `configure`。这一步放到第二期，本期保持串行，与 Python 一致。

**测试：** FakeGuard 支持"重建网关"：换 ID、清空端点、清空 Xray 状态。测试断言一轮 recover 之后：
- 所有 ready 账号都重新接入网关；
- 出站、入站全部重新下发；
- `gateway_ip` 和 `resolv.conf` 已更新；
- readiness 恢复；
- 非 ready 账号没有被动过。

### 7.4 `PUT /runtime/images` 里 egress 的语义与 health

**语义：**
- 和以前一样，`PUT /runtime/images {"egress": ref}` 只是**记录目标镜像**。会做两项校验：镜像必须存在于本地（不存在就经 guard 拉取）；镜像必须带 `io.sup2api.ccgateway.shared-egress=1` 标签，否则回 `400 invalid_image`。目标写进 `runtime.json`。
- 控制器**从不**因此重建网关。Python 版在网关不存在时会用新镜像创建网关，这条路径现在由 compose 接管：compose 用自己定义的镜像。
- `CCG_XRAY_IMAGE` 仍表示"固定网关镜像"：设置了它，"网关目标镜像"就是它，否则是 egress 目标。

**与核心的兼容：**
- `GET /health` 的 `egress_image` 仍报**目标**镜像（`runtime.json` 或环境变量里的值），不报网关实际运行的镜像。
- 核心的 `runtimeView.UpToDate` 比较的是 `in.EgressImage == img.Egress`，`panelUpgrade` 在 PUT 之后也读 `h.EgressImage`。如果改成报实际镜像，一键升级后会永远显示"未更新"。
- 核心解码 health 时不禁止未知字段，所以可以新增字段。

**health 新增一个字段**（核心忽略，控制台以后可以展示）：

```json
"egress_gateway": {
  "status": "running",                 // running | stopped | absent | unknown（guard 不可达）
  "image_id": "sha256:...",            // 网关容器实际运行的镜像 ID（inspect 的 Image）
  "target_image": "ccgateway-egress:0.1.119",
  "target_id": "sha256:...",           // 目标镜像在本机的 ID；本机还没有时为空
  "update_available": true             // image_id 和 target_id 都非空且不同
}
```

- 取值方式：`guard.Gateway()` 和 `ImageInspect(target)`，都放进 30 s 缓存，与 `app_image_id` 共用缓存机制。health 是高频轮询的接口，不能每次都调 guard。
- guard 不可达时 `status` 为 `unknown`，其余字段为空，health 本身仍回 200。

**新增维护端点**（可选；核心现在不调用，要不要做由用户决定）：

| 方法与路径 | 请求 | 行为 |
|---|---|---|
| `POST /runtime/egress/recreate` | `{}`（必须是空对象，其他一律 400） | 1. 持 upgrade 锁，再持 sharedOp。2. 校验目标镜像带标签。3. `guard.RecreateGateway(target)`。4. 把 `shared.boot` 置空，把所有在线账号标为掉线（`GoOffline` 加清 boots），然后 `kickRecover`。5. 回 `200 {"recreated": true, "image": target}`。错误：`invalid_image`（400）；`upgrade_in_progress`（409，guard 正在重建或升级）；guard 失败时回 503 |

- 加入 features `egress-recreate-v1`，核心按 feature 判断是否显示按钮。
- 这个端点只做"显式维护"；任何后台路径都不会调用它。
- 不做这个端点也可以：运维直接在宿主机上执行 guard 的命令行（`ccgateway-guard recreate-gateway`），控制器会在 10 s 内经 recover 发现并恢复（§7.3）。

### 7.5 控制器自升级（compose 下）

`POST /runtime/controller {"image"}`：

1. 用 `single_image` 校验请求体，不合法回 `BadRequest`。
2. 持 upgrade 锁，`ensureImage(ref)`。拉不到回 `image_pull_failed`。
3. 降级检查：保留 Python 的 `_check_downgrade`，即目标镜像没有 `shared-egress=1` 标签且存在共享绑定时，回 `BadRequest`。
   新增检查：目标镜像没有 `io.sup2api.ccgateway.guard-api=1` 标签时，回 `InvalidImage('controller image does not support the guard')`。这样会先挡住"把 0.1.118 Python 镜像当升级目标"的误操作；guard 自己也会再拒绝一次（403）。
4. `guard.UpgradeController(ref)`：
   - 202 → 控制器回 `202 {"accepted": true}`；
   - 409 → 回 `upgrade_in_progress`。
   - 之后的事情（改 `.env` 的 `CCG_CONTROLLER_IMAGE`，删掉 `CCG_CONTROLLER_VERSION` 行，`compose up -d controller`，等待健康，失败回滚）都由 guard 负责。控制器会在 compose 重建自己时，收到 SIGTERM 正常退出。

**`healthcheck` 子命令：**
- `/ccg-controller healthcheck` 读 `CCG_CONTROLLER_KEY`、`CCG_CONTROLLER_PORT`、`CCG_CONTROLLER_IMAGE`，向 `127.0.0.1:<port>/health` 发请求，超时 3 s。
- 应答为 200 且 `controller_image` 等于环境里的镜像时，退出码 0；否则 1。
- compose 写 `healthcheck: {test: ["CMD", "/ccg-controller", "healthcheck"], interval: 5s, start_period: 10s}`。guard 只需要等容器状态变成 `healthy`，不必自己拿控制器密钥去调 `/health`。镜像是 scratch，没有 shell，所以必须用 exec 形式。

---

## 8. 测试策略

### 8.1 原则

- **只用标准库 `testing`。** 表驱动；HTTP 用 `httptest` 和真实 `net.Listener`，不用 testify。
- **默认测试集（`go test ./...`）不需要 Docker、guard、网络，也不需要 Linux。**
  - 本机是 Windows，可以直接跑。文件锁在 Windows 上用桩实现（`store/lock_windows.go`：进程内互斥 + 独占创建锁文件），注明"只供开发机"。
  - Linux 专属的断言（权限位 0600/0700、`flock` 的跨进程语义、目录 fsync）放在 `//go:build unix` 的文件里。Linux CI 一定会编译和运行它们。这不是"跳过"，是按平台分文件。
- **默认测试集里禁止出现 `t.Skip`。** CI 用脚本检查：

  ```sh
  go test -count=1 -race -json ./... > test.json
  grep -q '"Action":"skip"' test.json && { echo 'skipped tests'; exit 1; }
  ```

  再加一道数量下限：通过的测试函数数量不得少于 `testdata/test-count.min`（初始值 = 移植的 185 项 + 新增项），防止测试被悄悄删掉。
- **需要真机的测试** 放在 build tag `guardintegration` 后面。打了 tag 却缺少环境变量（`CCG_IT_GUARD_URL` 等）时，用 `t.Fatal`，不用 `t.Skip`。

### 8.2 FakeGuard（`guardapi/fakeguard`）

它在 Python `FakeDocker` 的内存模型基础上，按 guard 的**端点语义**实现：

- **资源命名与归属：** 名字由前缀和 aid 拼出；标签不符时回 409 `ownership_mismatch`；本前缀之外的资源一律看不见。
- **策略校验（与 guard 的 `policy.py` 相同的规则）：**
  - 子网必须在 RFC1918 范围内，前缀长度至少 /24，且与现有网段不重叠；
  - app 的地址必须在子网内，不能是 `.0`、`.1`、广播地址或网关地址；
  - 环境变量的名字、数量、总长；
  - 任务的能力白名单；
  - 网关文件名白名单。

  违反时回 400 或 403，于是控制器的 bug 在单元测试里就会暴露，不必等到真机。
- **可编排的行为：**
  - exec 按 argv 前缀注册应答，例如 `["xray","api","lso"]` 回 JSON，`sha256sum` 回哈希；
  - 一次性任务按入口点注册退出码；
  - 镜像文件、归档内容；
  - 注入故障：某端点第 N 次调用返回某个错误；
  - "重建网关"（§7.3）。
- **调用记录：** `Calls()` 返回有序的 `(method, path, body)` 列表。原来断言 Docker 调用的测试，改为断言 guard 调用。

**契约夹具：** 成员 C 在 `companions/guard/testdata/api-contract/` 放一组"请求 → 应答"样例，覆盖每个端点的成功、拒绝和错误形状。

- guard 的 Python 测试用它驱动真实的 `api.py`；
- Go 用 `fakeguard_contract_test.go` 读同一组文件（相对路径 `../../../guard/testdata/api-contract`）驱动 FakeGuard，断言应答相同；
- `guardapi` 客户端的解码测试也用这组样例。

这样 FakeGuard 和真 guard 的偏差在两边 CI 都会暴露。

### 8.3 测试文件对照（Python 196 项）

| Python 文件（项数） | Go 位置 | 说明 |
|---|---|---|
| `test_manager.py` `DiskQuotaTests`（12） | `accounts/disk_quota_test.go` | 卷与配额标签的核对逻辑不变；`verify_disk_quota` 改为断言任务参数 |
| `test_manager.py` `KeyTests`（2） | `names/names_test.go`、`api/route_test.go` | |
| `test_manager.py` `ManagerTests`（37） | `accounts/{provision,apply,delete,runtimes}_test.go` | `oneshot` 相关的一项改为"guard 任务失败时不留痕"；与 `_namespace_helpers` 相关的两项改为"遗留的 oneshot 辅助容器由 guard 识别，控制器不把它们算作外来用户"（用 FakeGuard 的 `volume_users` 语义） |
| `test_manager.py` `HandlerTests`（17） | `api/handler_test.go` | `httptest` 加原始 TCP 断言（Connection: close、透传无 TE） |
| `test_manager.py` `ConnectionTests`（2）、`ConnectionStateTests`（1） | `accounts/readiness_test.go`、`api/connection_test.go` | 新增断言：每次就绪检查恰好一次 `AccountState` 调用 |
| `test_manager.py` `ProxyRecheckTests`（3） | `accounts/proxycheck_test.go` | `Resolver` 替身 |
| `test_manager.py` `EnvironmentValidationTests`（1） | `accounts/auth_test.go` | 另加 `pyjson.URLSplit` 和 `IsSpace` 的表驱动测试 |
| `test_cleanup.py`（17） | `cleanup/cleanup_test.go` | 用 FakeGuard 的 `Inventory` 和 `Account` |
| `test_cli_profiles.py`（7） | `accounts/cli_profile_test.go` + `cliprofile/validate_test.go` | 探测任务的 stdout 由 FakeGuard 编排 |
| `test_headers.py`（1） | `workeradmin/headers_test.go` | 断言发出的请求头恰好是那几个，不多一个 |
| `test_network.py`（7） | `netplan/netplan_test.go` | `Rand` 替身取代 `patch('secrets.choice')` |
| `test_runtime.py` `RuntimeImageTests`（6） | `admin/runtime_images_test.go` + `api` | |
| `test_runtime.py` `ControllerUpgradeTests`（5） | `admin/upgrade_test.go` | 改写：调用 guard、降级检查、guard-api 标签、409 冲突、非法输入。"自定义名字、端口、环境文件"这一项不再适用，改为"升级请求只带 image" |
| `test_runtime_updates.py`（14） | `updates/pair_test.go` | `updates.Host` 和 `containerfs.App` 的替身 |
| `test_shared_egress.py` `SharedConfigTests`（3） | `xrayconf/xrayconf_test.go` | 另加参照向量：tag 逐字节比较 |
| `test_shared_egress.py` `SharedApplyTests`（7） | `accounts/shared_test.go` | "网关镜像取自 egress 镜像"一项改为：不建网关，只 `EnsureGateway`；health 报告是否有更新。新增：§7.3 的重建恢复、§7.4 的 recreate 端点 |
| `test_tunnel.py`（5） | `api/tunnel_test.go` | 真实回环 listener 充当 Worker：流水线字节、SSE 分段、半关闭、头大小写 |
| `test_upgrade.py`（11） | **不移植** | 逻辑在 guard 和 compose 里，由成员 C 的测试覆盖 |
| `test_uploads.py`（8） | `uploads/uploads_test.go` + `api/uploads_test.go` | "标签来自归档清单"一项移交 guard；控制器这边改为"原样返回 guard 给的 `id` 和 `tags`" |
| `test_worker.py` `WorkerUpdateTests`（21） | `updates/worker_test.go` | |
| `test_worker.py` `ProgramArchiveTests`（5） | `containerfs/containerfs_test.go` | `image_container` 删除失败那一项改为"guard 的 `images/file` 返回 404 和非普通文件时的映射" |
| `test_worker.py` `WorkerHandlerTests`（2） | `api/worker_handler_test.go` | |

合计：196 − 11（升级，移交 guard）= 185 项要移植。另外新增：

- `pyjson` 参照向量和往返测试；
- 状态文件 Python ↔ Go 互读；
- FakeGuard 契约测试；
- `guardapi` 客户端的错误映射、超时、流式截断；
- 锁顺序（`-tags lockcheck`）；
- 网关重建后的恢复；
- recreate 端点；
- `healthcheck` 子命令；
- 优雅退出时关闭隧道。

### 8.4 时间、随机数与 DNS 的替身

Python 测试里用 `patch` 替换的东西，在 Go 里都是 `accounts.Options` 的字段：

| 字段 | 生产实现 | 测试替身 |
|---|---|---|
| `Clock`（`Now`、`Sleep`、`After`） | 真实时间 | 假时钟：`wait_idle` 的 120 s、健康等待的 30 s、激活的 30×0.2 s 都可以瞬间推进 |
| `Rand` | crypto/rand | 固定序列 |
| `Resolver` | `net.Resolver{PreferGo: true}` | 内存表 |
| `WorkerPort` | 8787 | 测试改成回环端口，对应 `patch('manager.ACCOUNT_PORT')` |
| `WorkerTransport` | 正常的 HTTP 传输 | 指向测试服务器 |
| `BusinessRules` | `netplan.BusinessRules` | 可替换，对应 `patch('manager.business_rules')` |

### 8.5 差分测试（Python 版作为参照）

在 Python 源码删除之前，CI 里加一个作业 `controller-differential`：

1. 用 Python 3.12 跑 `controller/differential_dump.py`（新写，只在 CI 用）。它用 Python 的 `Handler` 和 `FakeDocker`，执行一个固定的请求序列（约 60 条：各端点的成功和各类错误、405、404、401、带查询串、坏的 Content-Length、`Transfer-Encoding` 等），把每条应答的状态码、除 `Date` 和 `Server` 以外的头集合、应答体写进 `http-golden/*.json`。
2. Go 的 `api/golden_test.go` 用 FakeGuard 准备等价的初始状态，重放同一序列，逐条比较。

这一项的价值在于把 §3 里"Connection: close 出现在哪些地方""哪些错误命名、哪些不命名"之类容易遗漏的细节一次锁死。

### 8.6 真机测试（ovh，隔离实例）

- 用 build tag `guardintegration`。在 ovh 上，以一次性容器 `golang:1.27-bookworm` 运行，接入 `ccg-control` 网络。使用 guard 的隔离实例：前缀 `ccg-gt`，地址 `.3`，单独的令牌，单独的数据根。
- 移植 `shared_integration.py` 和 `shared_failure_test.py` 的场景：
  - 两个账号绑定共享网关；
  - 重启网关后恢复；
  - 失败关闭：IP 直连、DNS 绕行、私网目标都被拦下。
- 再加上 guard 设计 §8.4 的负面检查，以及 §7.3 的"compose 重建网关后完整恢复"。
- 代理夹具沿用 `shared_proxy_fixture.py`，作为独立的 Python 进程运行。
- 按记忆中的做法，测试账号默认用 30 号。但本集成测试只用 `d` 开头的草稿 key，不碰真实账号。

---

## 9. 构建与镜像

### 9.1 Dockerfile（`controller-go/Dockerfile`）

```dockerfile
FROM golang:1.27-bookworm AS build
WORKDIR /src
COPY go.mod ./
COPY . .
ARG VERSION=dev
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 GOWORK=off \
    go build -trimpath -ldflags "-s -w -X main.buildVersion=${VERSION}" -o /out/ccg-controller ./cmd/ccg-controller \
 && mkdir -p /out/data /out/tmp && chmod 0700 /out/data && chmod 1777 /out/tmp

FROM scratch
COPY --from=build /out/ccg-controller /ccg-controller
COPY --from=build /out/data /data
COPY --from=build /out/tmp /tmp
LABEL io.sup2api.ccgateway.shared-egress="1" \
      io.sup2api.ccgateway.guard-api="1"
ARG VERSION=dev
ENV CCG_CONTROLLER_VERSION=$VERSION
ENV CCG_DEFAULT_CLI_VERSION=2.1.312
USER 0:0
EXPOSE 8787
ENTRYPOINT ["/ccg-controller"]
CMD ["serve"]
```

- **为什么用 `scratch`：**
  - 不依赖新的仓库（发布主机已经有 `golang:1.27-bookworm`，它也是 worker 的构建镜像）；
  - 没有 shell，没有包管理器；
  - 纯 Go 的 DNS 解析只需要 Docker 注入的 `/etc/resolv.conf` 和 `/etc/hosts`；
  - 控制器不发 TLS 请求，不需要 CA 证书；
  - 不需要时区，一律 UTC。
- **用户：**
  - 本期 `USER 0:0`，与 guard 设计 §11 一致：数据根现在归 root，0700。容器已经去掉全部能力，用 `no-new-privileges`，根文件系统只读，所以容器内的 root 不对应宿主机权限。
  - 第二期建议改成 `USER 10001:10001`。前提是 compose 或 guard 的 adopt 把 `/opt/ccgateway-controller` 整体 chown 给 10001。回滚到 Python 版时不必改回，因为 Python 以 root 运行，读得了。代码里不写死 uid，只需改这一行，再由 guard 做 chown。
- **版本号：**
  - `CCG_CONTROLLER_VERSION` 优先，与 Python 相同：
    - 镜像的 `ENV` 来自构建参数 `VERSION`；
    - 环境文件里也可以覆盖，但 guard 在升级时会删掉这一行，与 `upgrade.py` 的 `with_image` 相同。
  - 都没有时，用 ldflags 注入的 `buildVersion`，再没有就是 `dev`。
- **`CCG_DEFAULT_CLI_VERSION`：** 换 CLI 版本的流程（cli-version-upgrade）以后改这个 Dockerfile 里的值。相关文档里写着改 Python Dockerfile 的地方，要在切换时一并更新。
- **镜像标签：** `io.sup2api.ccgateway.shared-egress=1`（沿用）；`io.sup2api.ccgateway.guard-api=1`（新增，guard 升级时检查）。
- **compose 健康检查：** 用 `/ccg-controller healthcheck`，见 §7.5。

### 9.2 `.github/workflows/ccgateway-images.yml` 怎么改

- **`test` 作业：**
  - 新增步骤 `controller (Go)`：

    ```yaml
    - name: controller (Go)
      working-directory: next/plugins/ccgateway/companions/controller-go
      run: |
        go vet ./...
        go vet -tags lockcheck ./...
        go test -count=1 -race -json ./... > "$RUNNER_TEMP/controller-test.json"
        sh ./scripts/check-tests.sh "$RUNNER_TEMP/controller-test.json"   # 任何 skip 即失败，通过数不得低于下限
        go test -count=1 -tags lockcheck ./internal/accounts/...
    ```

  - 现有 `ccgateway (Go)` 步骤里的 `gofmt -l .` 是从 `companions/` 往下递归的，已经覆盖 `controller-go/`，不用改。根模块的 `go vet ./...` 和 `go test ./...` 不会进入嵌套模块，所以必须有上面这一步。
  - `controller (Python)` 保留到 Python 目录删除为止。
  - 新增步骤 `controller compat`（§6.5 第 3 条）和作业 `controller-differential`（§8.5）。删除 Python 目录时，这两项一并移除或改为使用 0.1.118 镜像。
  - guard 用 Python 实现，`setup-python` 一直要保留，用来跑 guard 的测试。
- **`images` 作业的矩阵：**

  ```yaml
  - name: ccgateway-controller
    context: next/plugins/ccgateway/companions/controller-go
    file: next/plugins/ccgateway/companions/controller-go/Dockerfile
  ```

  构建参数 `VERSION=${{ steps.meta.outputs.short }}` 不变。
- **`bundle` 作业：** 不改。它调用构建脚本。
- **`next/go.work`：** 加上 `./plugins/ccgateway/companions/controller-go`。

### 9.3 `next/deploy/docker/build-ccgateway-images.sh` 怎么改

```sh
echo "==> building $controller (VERSION $short)"
docker build "$@" $labels --build-arg VERSION="$short" -t "$controller" "$companions/controller-go"
# 防止把旧的 Python 控制器打进插件包：
[ "$(docker image inspect --format '{{index .Config.Labels "io.sup2api.ccgateway.guard-api"}}' "$controller")" = 1 ] \
  || die "$controller lacks io.sup2api.ccgateway.guard-api=1"
```

另外：
- 开头检查 `[ -f "$companions/controller-go/Dockerfile" ]`；
- 头部注释里的 `controller.tar.gz` 说明改为"Go 控制器（guard 模式）"。

`images.json` 的格式和角色名都不变，核心不受影响。

**发布顺序上的约束：** 这一版插件包里的控制器**只支持 guard 模式**。

- clicodeplus 没有控制器，不受影响。
- ovh 要先装好 guard 和 compose，再由 guard 的 adopt 接管（guard 设计 §10）。
- 核心的"一键升级"对只有旧控制器的宿主机会推送新镜像，然后调用旧控制器的 `upgrade.py`。新控制器缺少 `CCG_GUARD_URL` 会直接退出，健康检查失败，`upgrade.py` 自动回滚。这与 guard 设计 §8.3 的分析一致，不会造成破坏，但要在发布说明里写明。

---

## 10. 对 guard API 的需求（在 guard 设计 §6 之外）

下面每一项都是控制器需要、而 §6 没写或写得不够的。编号供与成员 C 对齐时引用。

| 编号 | 需求 | 原因 |
|---|---|---|
| R1 | 账号容器的查询结果，`Mounts[]` 要**原样**返回 Docker 的全部字段（Type、Name、Source、Destination、Driver、Mode、RW、Propagation），`Config.Labels` 不过滤，`Args` 的 `null` 和 `[]` 要保留 | `container_identity` 与 Python 存下来的值逐字节比较（§5.2）；裁剪会让配对激活过的账号回 409 |
| R2 | 新增 `GET /v1/accounts/{aid}?fields=state`：一次返回 `app{Id,Image,State.Status,State.StartedAt,IP}` 和 `gateway{Id,State.Status,State.StartedAt}`，归属不符时回 409。目标耗时 < 10 ms | 请求路径上的就绪检查，从 4 次 Docker inspect 变成 1 次 guard 调用（§5.5） |
| R3 | 明确网络和卷的返回形状。网络：`Id, Name, Created, Labels, IPAM.Config[].{Subnet,Gateway}, Containers.{id}.{Name,IPv4Address}`。卷：`Name, Driver, Options, Labels, CreatedAt`。`volume_users`：`[{Id, Name, State.Status}]` | `first_subnet`、`attach` 选空闲地址、配额标签核对、`ResourceInUse` 的名字、清理 identity |
| R4 | 409 的应答体带 `reason`（`ownership_mismatch`、`resource_in_use`、`exists`、`not_running`、`upgrade_in_progress`）和 `names`。`images/file` 的错误区分 404、`not_regular_file`、`too_large`。拉取失败用 `pull_failed`。防火墙辅助容器失败用 `helper_failed` | 控制器要据此映射到不同的错误码（§5.3） |
| R5 | exec 返回 `{exit_code, output}`，`output` 是 stdout 和 stderr **按到达顺序合并**的结果（docker-py `exec_run` 的默认行为），base64 编码。容器不在运行时回 409 `not_running` | `sha256sum`、`stat`、`ip -j`、`xray api lso` 的输出解析，以及 `LEGACY_SNAPSHOT_SCRIPT`，都依赖合并输出 |
| R6 | 归档的 GET 和 PUT 要能用于**已停止**的容器（created、exited）。GET 的路径不存在时回 404；PUT 的目标目录不存在时回 404 | `restore_worker` 会把备份写进已退出的容器；`prior_selection` 靠 404 判断是否是旧版 |
| R7 | `app/top` 固定使用 `ps_args=-eo pid,comm` | `worker_idle` 读的是 `COMMAND` 列 |
| R8 | 一次性任务的内存至少 1 GiB（或者可配置）；返回的 `stdout` 只含 stdout；`PREPARE_VOLUME` 需要 `CHOWN`、`DAC_OVERRIDE`、`FOWNER` 三个能力；支持 `user:"0"` 加 `volume:"none"` | `resolve_profile` 会在 node 里读入并哈希最大 512 MiB 的 CLI，512 MiB 内存不够；Python 的 oneshot 用的是 Docker 默认能力，而且没有内存上限 |
| R9 | `images/load` 要接受 **gzip 压缩的** tar：插件包里打的是 `docker save \| gzip`，核心推送时原样上传。返回的 `id` 形如 `sha256:<hex>`，`tags` 由归档的清单决定（即原来 `_names` 的结果）。拒绝时回 403 `load_forbidden` | 上传导入保持原语义；核心推送内置镜像走的正是这条路 |
| R10 | `images/inspect` 返回 `Id`、`RepoTags`、`Config.{Env,Labels}`，不存在时回 404 | `ensure_image`、`check_business_image`、标签检查 |
| R11 | `PUT resolv`：文件不存在时创建（root，0644）；内容固定为 `nameserver <ip>\noptions timeout:2 attempts:2\n`；地址必须在该账号子网内 | 合并了 `_record_runtime`（新建）和 `SharedEgress.resolv`（原地改写）两种写法 |
| R12 | `PUT firewall` 的辅助容器镜像取当前网关**正在运行的**镜像，与 Python 的 `image_of(shared.container())` 相同；网关不存在时回 409 | 不能让控制器指定镜像 |
| R13 | 网关（compose）：<br>- `GET /v1/gateway` 返回 `Id, Image, Config.Image, State.{Status,StartedAt}, Config.Labels, NetworkSettings.Networks.*.IPAddress`；<br>- `POST /v1/gateway/ensure`；<br>- `POST /v1/gateway/recreate {image}`（检查标签，改 compose 用到的镜像变量，然后 `up -d --force-recreate egress`）；<br>- 网关不存在时也允许 `PUT /v1/gateway/files/*`（先建目录）；<br>- compose 的 `egress` 服务必须带 `io.sup2api.ccgateway.shared=<前缀>` 标签 | §7。Python 0.1.118 回滚后也靠这个标签认领网关 |
| R14 | 控制器升级（compose）：<br>- `POST /v1/controller/upgrade {image}` 回 202；正在进行时回 409 `upgrade_in_progress`；缺 guard-api 标签时回 403；<br>- 改写 `.env` 时删掉 `CCG_CONTROLLER_VERSION` 行（`upgrade.py` 的 `with_image`）；<br>- 等健康可以用容器的 `healthy` 状态（控制器镜像自带 `healthcheck` 子命令） | §7.5 |
| R15 | Python 时代遗留的 `<p>-oneshot-*` 辅助容器：已结束的，不计入 `volume_users` 和网络端点，并在删除卷或网络时一并删掉；正在运行的照常计为外来用户（`_stale_helper` 的语义） | `_namespace_helpers` 和 `_stale_helper` 已从控制器删除 |
| R16 | `subnets` 要包含 compose 定义的 uplink 网和 `ccg-control` 网 | 分配网段时避开它们 |
| R17 | `GET /v1/health` 的 `features` 列出 `account-state-v1`、`gateway-compose-v1`、`exec-combined-v1` 等，控制器启动时检查 | 版本不匹配时，在日志里尽早暴露，而不是等到某个账号出错 |
| R18 | `DELETE container`、`network`、`volume` 遇到已不存在的资源时回 404（控制器视为已删除），`DELETE container` 要强制删除 | `absent_ok` 的语义 |
| R19 | 账号查询的 `others` 包括 `egress` 和 `app-<后缀>` 容器，字段同 R1，外加 `Created` | 清理盘点的 `resource_row` |
| R20 | 流式端点的大小上限：<br>- `images/file` 512 MiB + 1 MiB；<br>- 归档 PUT 600 MiB；<br>- 归档 GET 同样 600 MiB；<br>- `images/load` 4 GiB（注意 guard 要落盘，加上控制器自己的上传暂存，宿主机磁盘的峰值占用约 8 GiB） | 与 Python 的 `WORKER_MAX_BYTES`、`MAX_CLI`、`MAX_SIZE` 对齐 |
| R21 | `PUT /v1/accounts/{aid}/app` 只创建、不启动；同名容器已存在时回 409 `exists`。启动由控制器在 `shared.apply` 里显式调 `app/start` | 与 Python 的 `containers.create` 加之后 `app.start()` 的顺序一致；创建与启动之间控制器要先写状态 |

---

## 11. 风险与取舍

### 11.1 最大的五个风险

| # | 风险 | 后果 | 缓解 |
|---|---|---|---|
| 1 | **序列化兼容**：`auth_fingerprint`、`container_identity`、出站 tag 依赖 `json.dumps` 的逐字节输出 | 升级后重建全部账号容器，或配对激活过的账号回 409 | `pyjson` 加 Python 生成的参照向量（§6.4、§6.5）；上线前在隔离实例上用生产状态的**副本**做一次"Go 读、只计算不写"的比对：所有账号的指纹和 identity 都必须与现值相同 |
| 2 | **guard 返回的形状和语义与 docker-py 有差异**：Mounts 被裁剪、exec 输出不合并、停止的容器不能读写归档、top 的列不同 | 原地更新、配对激活、identity 比较出错 | 需求 R1、R5、R6、R7；共享契约夹具（§8.2）；真机测试覆盖原地更新和配对激活 |
| 3 | **Python 隐式语义在移植中走样**：真值、`int()`、`urlsplit`、`isspace`、RLock 重入、哪些错误命名哪些不命名、`Connection: close` 出现在哪里 | 某些边界输入的应答变了，或某条路径死锁 | 185 项测试一一移植；§8.5 的差分测试；`pyjson` 的语义工具都有表驱动测试；不可重入锁改为显式传 `*Held`，加锁顺序检查 |
| 4 | **网关由 compose 管理以后的恢复**：compose 任何一次重建都会丢掉全部动态接入 | 所有账号同时掉线，串行恢复约 1–3 s × 账号数 | §7.3 的完整恢复路径和测试；重建后 `kickRecover`；第二期做有限并发恢复；recreate 只在显式维护时执行，控制器绝不自动调用 |
| 5 | **资源与真并发**：<br>- 控制器内存上限 2 GiB（原 1 GiB，2026-11-01 提高），CLI 最大 512 MiB；<br>- 上传导入时磁盘双份占用；<br>- Go 的真并发暴露数据竞争 | OOM、磁盘满、偶发的状态错乱 | 大文件经 `Blob` 落盘、全程流式（§5.4）；`-race`；mem 锁和 sharedMu 只做内存操作；上传上限仍是 4 个并发、4 GiB；磁盘水位在部署说明里写明 |

### 11.2 其他风险与取舍

- **FakeGuard 与真 guard 偏离：** 共享契约夹具，加真机集成测试。
- **guard 不可达期间：** 控制器照常回答 `/health`；需要 guard 的操作回 503；就绪检查遇到 guard 不可达**不掉线**（§5.5）。取舍：guard 宕机期间，如果账号容器恰好停了，在 guard 恢复前，请求会一直按旧的就绪状态继续发过去，连接 Worker 时失败，回 503 `runtime_unavailable`，并不会出错到别的账号。
- **不追求整段报文逐字节相同：** `Server` 头、头的顺序、少数原因短语不同。§3.4 定义了一致的范围，差分测试只比较这个范围。
- **模块独立：** 代价是 CI 多一个步骤，go.work 多一行。好处是零依赖、构建上下文小，以后改名也不改 import。
- **同时维护两套实现的时间窗：** 只在移植期间存在。切换以后 Python 的 `controller/` 冻结，不再改功能，只用于差分测试和回滚兼容检查。
- **本期仍以 root 运行：** 见 §9.1。

---

## 12. 工作量与实施顺序

### 12.1 估计

Python 生产代码约 3500 行，不含手工脚本和 `upgrade.py`。按经验 Go 是它的 1.8–2.2 倍。

| 部分 | 生产代码（行） | 测试（行） | 人日 |
|---|---|---|---|
| names、errs、pyjson、config、store（含参照向量、互读） | 900 | 900 | 4 |
| guardapi 客户端 + FakeGuard + 契约测试 | 1100 | 900 | 5 |
| netplan、xrayconf、cliprofile | 500 | 500 | 2 |
| accounts（生命周期、共享网关、就绪、恢复、代理复核） | 1700 | 1800 | 8 |
| containerfs、workeradmin、updates | 1000 | 1300 | 5 |
| uploads、cleanup、admin | 600 | 700 | 3 |
| api（路由、错误、透传、隧道、上传端点、golden） | 800 | 1100 | 4 |
| cmd、Dockerfile、CI、构建脚本、差分作业 | 200 | 100 | 2 |
| ovh 隔离实例的集成测试与修正 | — | 400 | 4 |
| **合计** | **约 6800** | **约 7700** | **约 37 人日** |

由一个写者顺序完成，约 7–8 周。按 §12.3 并行，日历时间约 3–4 周，前提是 guard API 先冻结。

### 12.2 实施顺序

0. **冻结接口：** 与成员 C 敲定 guard API，把 §10 的需求并入 guard 设计 §6，C 提交契约夹具。这一步之前不写 `guardapi`。
1. **基础层：** `names`、`errs`、`pyjson`（先做参照向量）、`config`、`store`。
2. **guard 客户端：** `guardapi` 的接口、类型、HTTP 客户端，以及 FakeGuard。
3. **纯函数包：** `netplan`、`xrayconf`、`cliprofile`。
4. **accounts：**
   - provision、apply、block、delete、readiness、public、connection；
   - shared 编排（含 §7.2、§7.3）；
   - 代理复核。
5. **更新：** `containerfs`、`workeradmin`、`updates`。
6. **管理功能：** `uploads`、`cleanup`、`admin`（含 §7.4、§7.5）。
7. **HTTP 层：** `api` 的全部端点，以及 golden 和差分测试。
8. **构建：** `cmd`、Dockerfile、CI、构建脚本。
9. **真机：** 在 ovh 上用隔离实例 `ccg-gt` 配合真实 guard 跑集成测试。然后用生产状态的副本做指纹和 identity 比对（风险 1）。
10. **发布：** 核心（guard 设计 §9）→ 插件 → guard adopt → 验收。每一步动线上之前都先征得用户同意。

### 12.3 并行切分

用户的规则是"同一 Go 模块同时只让一个写者写"。`controller-go` 是一个模块，所以：

**方案 A（遵守规则，推荐默认）：**
- 控制器模块始终只有**一个写者**，按 §12.2 顺序做；
- 并行发生在**模块之间**：
  - 写者 1：`controller-go`（Go）；
  - 写者 2：成员 C 的 guard（Python，`companions/guard/`）和契约夹具；
  - 写者 3：核心 `server/internal/ccgateway/runtime.go` 的安装脚本（guard 设计 §9），加上 compose 文件和部署文档；
  - 写者 4：在 `controller/`（Python 目录）里写 `gen_pycompat.py`、`differential_dump.py`、`compat_read.py`，产出 `controller-go/testdata/` 的数据文件。
- 写者 4 只往 `testdata/` 里放数据文件，不改 Go 代码。和写者 1 约定：`testdata/pycompat/`、`testdata/http-golden/`、`testdata/state/` 归写者 4，其余归写者 1。如果这也被视为写同一个模块，就改为写者 4 把数据交给写者 1 提交。

**方案 B（需要用户明确同意：同一模块按目录分给多个写者）：**
1. 第 1、2 步由一个写者完成，产出：
   - 全部接口，包括 `guardapi.Client`、`containerfs.App`、`updates.Host`，以及 `api` 需要的 `Backend` 接口；
   - `store` 的类型；
   - FakeGuard。

   合并后**冻结 go.mod 和这些接口文件**。
2. 然后各写者在各自的 git worktree 里，按目录独占：
   - 写者 1：`netplan`、`xrayconf`、`accounts`（最大的一块）；
   - 写者 2：`containerfs`、`workeradmin`、`updates`、`cliprofile`；
   - 写者 3：`uploads`、`cleanup`、`admin`、`api`。
   - 每个写者只依赖已冻结的接口；测试用 FakeGuard，以及其他包的替身。
3. 主控按 1 → 2 → 3 的顺序合并，每次合并后在 Linux 上跑全量 `go test -race`。合并之后有一个写者负责集成（第 8、9 步）。

方案 B 能把日历时间从 7–8 周缩短到 3–4 周。代价是冻结后若要改接口，必须由主控协调。

---

## 附：与其他文档的关系

- `CCGATEWAY-GUARD-DESIGN.md`：
  - §8 的 Python 改造方案由本文取代；
  - §10 的需求请并入它的 §6；
  - §7 的 compose 变更以协调者 2026-11-01 的通知为准：网关由 compose 定义，`PUT /v1/gateway` 取消，改为 `ensure` 和 `recreate`。
- `01-controller-behavior-spec.md`（成员 A）：描述 Python 版的外部行为。本文 §3 的一致性要求，以及 §8.3 的测试对照，都应能在那份规格里找到对应条目。合并时，两份文档对同一行为的描述有冲突的，以 Python 源码为准。
