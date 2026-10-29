# CCGateway Worker

账号容器里的 Go 程序（模块 `ccgateway/worker`）：读配置、起 HTTP 服务、管生命周期，其余全部交给共享引擎 `../engine`（`engine.NewRuntime`）。每个 `/v1/messages` 运行一次打包的定制 CLI 的 `claude request --build|--direct`，由 CLI 用 Claude Code 自己的函数组装并发送；Worker 不组装请求。

一次请求在 Worker 里怎么走、日志、资源身份、管理接口与 `WorkerPolicy` 契约见 [Worker 引擎](../../docs/WORKER-ENGINE.md)。跨组件合同在 `../contracts`。

```text
worker/
├─ cmd/worker/main.go          # 入口：配置 → worker.New → server；SIGTERM 30 秒优雅退出；GOMAXPROCS 按容器配额
├─ internal/config/            # 环境变量（config.go）与控制器写的 active-runtime.json（active_runtime*.go）
├─ internal/worker/worker.go   # 包一层 engine.Runtime：注入账号配置目录、合并超时、/health 的内容
├─ internal/server/            # HTTP 服务器：/health、/admin/features，其余路由交给引擎
├─ pkg/types/                  # /health 的应答结构
├─ Dockerfile                  # 账号镜像（构建上下文是父目录 companions）
└─ Makefile
```

## 配置

以 `internal/config/config.go`、`active_runtime.go` 与引擎 `runtime.go`、`runner.go` 为准。"镜像"列是 `Dockerfile` 的 `ENV`；控制器创建或更新容器时还会设置固定 CLI 与密钥。

| 变量 | 程序缺省 | 镜像 | 说明 |
|---|---|---|---|
| `CCG_API_KEY` | — | — | 网关密钥（`x-api-key` 或 `Authorization: Bearer`）。必填，`NewRuntime` 拒绝空值。不传给 CLI |
| `CCG_ADMIN_KEY` | 空 | — | 管理密钥（只认 `Authorization: Bearer`），不能与 `CCG_API_KEY` 相同；为空时所有管理接口拒绝。不传给 CLI |
| `CCG_BIND` | 空（任意地址、端口 8788） | `0.0.0.0:8787` | `host:port`；host 只能是回环地址、未指定地址或 `localhost` |
| `WORKER_PORT` | — | — | 只覆盖端口，保留 `CCG_BIND` 的 host |
| `WORKER_ID` | 主机名 | — | 出现在 `/health` |
| `WORKER_CLI_PATH` | `/usr/local/bin/claude` | 链接到 `/opt/ccgateway/cli/<CLAUDE_VERSION>/claude` | CLI 路径（错误文字里的 `CCG_CLAUDE_PATH` 并不被读取） |
| `WORKER_CLI_VERSION`、`CCG_CLI_SHA256`、`CCG_CLI_PATCH` | 空 | 控制器设置 | 固定 CLI：任一非空则三项都必须给，启动时核对版本、SHA-256 与补丁标签（`--ccgateway-info`），不符不启动 |
| `CCG_REQUEST_MODE` | `build` | 控制器设置 | `build` 或 `direct`，只在请求没有核心策略头时生效；CLI 必须声明 `request_<模式>`，否则不启动。`native`（已退役）启动成维护专用 Worker：只开管理接口，业务请求 409 |
| `CCG_WORKING_DIRECTORY` | `/work` | `/work` | build 时 CLI 的工作目录，必须是已存在的绝对路径 |
| `CLAUDE_CONFIG_DIR` | `/root/.claude` | `/work/config` | 账号的 CLI 配置与登录；CLI 进程的 `CLAUDE_SECURESTORAGE_CONFIG_DIR` 也设成它 |
| `CCG_DATA_DIR` | `/work/history` | `/work/data` | Worker 数据目录（请求日志、资源身份、身份映射密钥、代理与环境设置） |
| `HISTORY_DIR` | 同 `CCG_DATA_DIR` | — | 覆盖数据目录 |
| `REQUEST_TIMEOUT` | 1 小时（`features.RequestTimeout`） | — | Go duration；未设时读旧容器的 `CCG_TIMEOUT`；解析失败按缺省 |
| `CLI_TIMEOUT` | 同上 | — | 只能调低：实际超时取两者较小的正值，作为 CLI 的 `--timeout-ms` |
| `CCG_REQUEST_SLOTS` | 4 | — | 同时运行的请求数（每个是一个 CLI 进程），1–64 |

引擎从进程环境另读：`CCG_EXTERNAL_EGRESS=1`（控制器设置，出口由独立容器透明代理，CLI 进程去掉全部代理变量）、`CCG_RESOURCE_BODY_LIMIT_BYTES`（资源正文上限，缺省与上限 512 MiB）、`CCG_RESOURCE_SPOOL_LIMIT_BYTES`（资源暂存总量，缺省 1 GiB、上限 4 GiB）、`CCG_RESOURCE_ISSUER_ID`/`CCG_RESOURCE_ISSUER_GENERATION`（API Key 账号的托管发放方）、`CLAUDE_CODE_USER_EMAIL`（身份映射用的登录邮箱，缺省读 `.claude.json`）。`CCG_ACCOUNT_DISK_QUOTA_BYTES` 由控制器设置，原样传给 CLI 报告磁盘余量。镜像还设了 `DISABLE_AUTOUPDATER=1`、`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`；每个 CLI 进程另由引擎加上遥测关闭开关（`runner.go telemetryDefaults`）。

**active-runtime.json**：控制器原地更新时写 `/opt/ccgateway/cli/active-runtime.json`（`schema_version: 1`、`manifest`、`version`、`request_mode`、可选维护租约）。存在时它优先于上面的 CLI 与模式变量：Worker 从它指向的 release manifest 取路径、SHA-256、补丁标签，当场算一次哈希；文件、二进制与所有上级目录必须 root 所有、不可组写/他写、不是符号链接（只在 Linux 上能通过，`active_runtime_linux.go`）。所以容器里查实际 CLI 看 active-runtime，不看 `/usr/local/bin/claude`。

已不读取（CONTRACTS §53.21）：`WORKER_PLUGIN_PATH`、`CCG_NATIVE_TOOLS`、`CACHE_DIR`、`MAX_CACHE_SIZE`、`HISTORY_RETENTION`、`LOG_LEVEL`、`HEALTH_TIMEOUT`。不要记录任何密钥的值。

## 端点

| 端点 | 所在 | 说明 |
|---|---|---|
| `GET /health` | `internal/server` | 控制器读：`status`（未就绪时 `starting` 并回 503）、`worker_id`、`cli_version`、`uptime`、`cli_patch`、`cli_sha256`、`capabilities`、`maintenance_only` |
| `GET /admin/features` | `internal/server` | 管理密钥；运行能力目录（协议版本、构建版本与 revision、执行模式、能力目录、策略 schema 版本、`cli_version` 探针） |
| `GET /healthz` | 引擎 | 核心读：`claude_version`、`cli_patch`、`cli_sha256`、`capabilities`、`slots` |
| `POST /v1/messages`、`POST /v1/ccgateway/probe` | 引擎 | 网关密钥；请求命令（probe 是控制台的账号测试，固定 build） |
| `/_ccgateway/resources/…` | 引擎 | 网关密钥；资源身份与 Files/Skills 资源代理 |
| `/admin/status`、`/admin/auth/*`、`/admin/proxy`、`/admin/environment`、`/admin/request-logs[/…]`、`/admin/usage`、`/admin/cli`、`/admin/runtime` | 引擎 | 管理密钥；逐项见 [Worker 引擎](../../docs/WORKER-ENGINE.md) 第 7 节 |

HTTP 服务器的超时：读请求头 10 秒、读请求 30 秒、空闲连接 180 秒。空闲 180 秒必须大于核心隧道的 110 秒（CONTRACTS §63.8，`internal/server/timeouts_test.go` 守护），改任何一边都要同时确认另一边。

## 构建

构建上下文必须是父目录 `companions`（Dockerfile 要复制 `go.mod`、`contracts/`、`engine/`、`cli-mods/release/` 与 `cli-mods/profiles/`）。仓库根目录执行：

```sh
docker build -f next/plugins/ccgateway/companions/worker/Dockerfile -t ccgateway-worker:dev next/plugins/ccgateway/companions
```

- 构建参数：`WORKER_VERSION`、`SOURCE_REVISION`（写进 `/admin/features` 的 build 信息）、`BUILD_MAX_PROCS`（缺省 2）、`CLAUDE_VERSION`（缺省 2.1.312）。
- 镜像只从 `cli-mods/release/` 安装定制 CLI，不在构建时下载官方 CLI；`release/` 不进 Git，要先按 [CLI 升级手册](../../docs/CLI-UPGRADE-RUNBOOK.md) 第 6 节准备。构建时核对该版本 ELF 的 SHA-256 与 release manifest 一致、补丁标签与 `cli-mods/profiles/linux-x64-<版本>.json` 的 `extension` 一致，不一致构建失败。
- 发布用 `next/deploy/docker/build-ccgateway-images.sh <插件版本> <输出目录>`，镜像名 `ccgateway-app:<插件版本>`。
- 本地编译程序：`make build`（`bin/worker`）；`make docker-build` 等价于上面的 docker 命令（上下文 `..`）。

## 测试

```sh
cd next/plugins/ccgateway/companions/worker
go test ./...                 # 或 make test（-race，带覆盖率）
```

- `internal/worker/real_cli_test.go` 的 `TestWorkerRealCLI` 要 `CCG_REAL_CLI` 指向真实 CLI，用合成密钥与本地假上游；不设时 SKIP，不加 `-v` 看不出来。
- `active-runtime` 的所有权校验只在 Linux 上通过，相关用例要在 Linux 上跑。本机是 Windows 时在 Linux 主机（ovh 一次性 `golang:1.27-bookworm` 容器）执行，命令见 [companions README](../README.md)。
- 引擎与合同的测试另跑（`companions` 与 `contracts` 两个模块），真实 CLI 用例必须用独立的临时配置与假上游，不能把真实账号环境给整个测试包。
- 发布前的离线端到端回归在 `../cli-mods/test/e2e/`，测试方案见 [CLI-TEST-PLAN](../../docs/CLI-TEST-PLAN.md)。
