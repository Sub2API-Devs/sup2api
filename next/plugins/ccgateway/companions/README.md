# CCGateway 运行组件

账号容器里运行的部分。平台插件在 `..`，核心的账号、配置与连接管理在 `../../../server/internal/ccgateway`，控制台页面在 `../../../web/src/views/ccgateway`。2026-10-23 以前的 README（早期内建版与已删除的 native 运行时）归档在 [docs/archive](../docs/archive/COMPANIONS-README-2026-10.md)。

## 请求链路

```
客户端 → 核心（调度、计费、WorkerPolicy） → ccgateway 插件（分类、冷却）
      → 控制器隧道（ccg-tunnel） → 账号 Worker :8787 /v1/messages
      → claude request --build|--direct（打包的定制 CLI，一请求一进程） → 上游
```

Worker 不组装请求：build 下把客户端的块原样包进信封交给 CLI，由 CLI 用 Claude Code 自己的函数组装（计费头、身份行、注入层、环境段、工具定义）；direct 下请求体原样交给 CLI，CLI 只动 system 开头的计费头（缺头或缺字段补原生值、按计费来源换字段，字符串 system 因此改成块数组），其余字节不变；两种模式的上游请求头都由 CLI 原生生成（见 [REQUEST-MODES](../docs/REQUEST-MODES.md)）。Worker 负责的只有：鉴权、请求策略（`X-CCGateway-Request-Policy`，`contracts/features.WorkerPolicy`）、身份与 agent 上下文映射、并发槽位、请求日志和错误来源标记。

## 目录

- `engine/`：Worker 的 HTTP 引擎（Go 包 `ccgateway/engine`）。`request_command.go` 是 `/v1/messages`；`request_identity.go`、`request_agent.go` 是身份与 agent 上下文；`request_log*.go` 是请求日志；`resource_*.go` 是资源身份（核心的 OAuth 资源路由）；`auth.go`、`usage.go` 是登录与用量；`cli_*.go` 是固定 CLI 的校验与 `/admin/cli`。
- `worker/`：账号 Worker 程序（Go 模块 `ccgateway/worker`）：配置、生命周期、`/health`、`/admin/features`；只使用 `engine.NewRuntime`。
- `contracts/`：跨组件合同（Go 模块）：WorkerPolicy、能力名、CC 上下文头表（插件转发与 Worker 读取共用）、错误来源、契约夹具 `testdata/`。
- `cli-mods/`：定制 CLI 的补丁与打包（`request` 命令及其支持模块）；`release/` 不进 Git，构建 Worker 前准备。
- `controller/`：Python 容器控制器（账号容器、网络、出口、隧道、升级）。
- `egress/`、`xray-egress/`：出口代理镜像。

## 构建

仓库根目录执行：

    docker build -f next/plugins/ccgateway/companions/worker/Dockerfile -t ccgateway-worker:dev next/plugins/ccgateway/companions
    docker build -f next/plugins/ccgateway/companions/controller/Dockerfile -t ccg-controller:dev next/plugins/ccgateway/companions/controller
    docker build -f next/plugins/ccgateway/companions/egress/Dockerfile -t ccgateway-egress:dev next/plugins/ccgateway/companions/egress

发布用 `next/deploy/docker/build-ccgateway-images.sh`。Worker 镜像从 `cli-mods/release/` 安装指定版本的定制 CLI，不在构建时下载官方 CLI。

## 测试

    go test ./...                      # companions（engine）
    (cd worker && go test ./...)
    (cd contracts && go test ./...)
    (cd cli-mods && node --test test/*.test.mjs)
    (cd controller && python -m unittest discover -p 'test_*.py')

本机是 Windows 时，部分进程级用例只在 Linux 上执行（CI 与发布主机）；`CCG_REAL_CLI` 指向真实 CLI 时才跑真实 CLI 用例。改 engine 后要同时 `GOOS=linux go vet ./...`。Worker → CLI 的请求字节由 `contracts/testdata/worker-cli-requests.json` 固定，改动后用 `CCG_UPDATE_CONTRACT_FIXTURES=1` 重新生成并检查差异。

Windows 上跑 Linux 用例：在有 Docker 的 Linux 主机上（如 ovh，源码放在一次性目录里），对 `next/plugins/ccgateway` 执行

    docker run --rm -v <ccgateway>:/src -w /src/companions golang:1.27-bookworm go test -count=1 -v ./engine/

不设 `CCG_REAL_CLI` 时 `TestRealCLI*` 在顶层显示 SKIP，不加 `-v` 只看到 `ok`，不能当作已验证。资源管理的四个用例（`TestRealCLIResource{HTTPIdentityAndProviderErrors,CarrierNeverGenerates,CancellationReleasesSpool,ManagementCancellationReleasesAuthorityAndSpool}`）在子进程里跑真实 CLI，要用**官方** Linux CLI：重建的 CLI 的 `auth status` 不退出（CONTRACTS §53.14），API key / env OAuth 的选择会超时 503。ovh 上的官方 2.1.304 在 `~/sup2api/checks/ccg-304-v12/claude-official-304`（SHA-256 `ea0f1357…f27912`）：

    docker run --rm -v <ccgateway>:/src -v ~/sup2api/checks/ccg-304-v12/claude-official-304:/opt/claude/claude:ro -e CCG_REAL_CLI=/opt/claude/claude -w /src/companions golang:1.27-bookworm go test -count=1 -v -run '^TestRealCLIResource' ./engine/

## 文档

- 请求模式与策略：[REQUEST-MODES](../docs/REQUEST-MODES.md)、[BUILD-REQUEST-COMPONENTS-DESIGN](../docs/BUILD-REQUEST-COMPONENTS-DESIGN.md)、[注入等级](../../../docs/ccgateway-feature-support/CC-INJECTION-LEVELS-DESIGN.md)
- 请求头：[REQUEST-HEADERS](../../../docs/ccgateway-feature-support/REQUEST-HEADERS.md)
- 请求日志：[级别](../../../docs/ccgateway-feature-support/REQUEST-LOG-LEVELS-DESIGN.md)、[查看](../../../docs/ccgateway-feature-support/REQUEST-LOG-VIEWER-DESIGN.md)
- 账号容器生命周期：[ACCOUNT-RUNTIME-LIFECYCLE](../docs/ACCOUNT-RUNTIME-LIFECYCLE.md)
- 契约：`next/docs/CONTRACTS.md` §53
