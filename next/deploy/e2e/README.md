# 隔离双节点 E2E 环境

这套 Compose 专供 `next/e2e`。它创建自己的 PostgreSQL、Redis、应用数据卷、签名插件市场和网络，默认项目名 `sub2api-next-e2e`，唯一宿主端口是 `127.0.0.1:3120`。Caddy 同时连接项目专用的 `edge` 网桥与 `internal: true` 的 `e2e` 内网；后端容器仅连接内网，一次性测试 runner 只连接 `edge`。不得使用业务项目名 `sup2api`、业务 `.env` 或单测项目 `sub2api-next-testdb` 的数据库和网络。

需要 Linux Docker Engine 与 Docker Compose v2。全部服务由 Compose 启动；推荐在 Docker 主机上通过 `test.sh` 的 Go 1.27 容器运行测试，也可以使用自备 Go 工具链通过 SSH 隧道访问远端环境。测试会创建账号、扣费、停止容器、杀插件进程和触发 OOM，因此仅运行在本目录提供的专用环境。

## 创建独立配置

从仓库根目录执行。下面生成器不会覆盖已经存在的 `.env`：

```sh
env_file=next/deploy/e2e/.env
(
  umask 077
  set -C
  {
    printf 'E2E_PROJECT=sub2api-next-e2e\n'
    printf 'E2E_APP_IMAGE=sup2api-e2e:local\n'
    printf 'E2E_MOCK_IMAGE=sup2api-e2e-mock:local\n'
    printf 'E2E_ADMIN_EMAIL=admin@sub2api.test\n'
    printf 'E2E_DB_PASSWORD=%s\n' "$(openssl rand -hex 24)"
    printf 'E2E_MASTER_KEY=%s\n' "$(openssl rand -base64 32)"
    printf 'E2E_JWT_SECRET=%s\n' "$(openssl rand -hex 32)"
    printf 'E2E_ADMIN_PASSWORD=%s\n' "$(openssl rand -hex 24)"
  } > "$env_file"
)
```

也可以复制 `.env.example` 后填写四项必需密钥。数据库密码放入连接 URL，因此使用十六进制等 URL 安全字符。`E2E_APP_IMAGE`、`E2E_MOCK_IMAGE` 可指向已经构建的镜像；两个应用节点和 `market-init` 必须使用同一个应用镜像。改用其他端口时同时设置 `E2E_PORT` 和 `E2E_PUBLIC_URL`，测试端再设置对应的 `E2E_BASE_URL`。

## 构建、校验和启动

从仓库根目录执行：

```sh
docker compose -f next/deploy/e2e/compose.yml --env-file next/deploy/e2e/.env config --quiet
docker compose -f next/deploy/e2e/compose.yml --env-file next/deploy/e2e/.env build node-1 mock-upstream
docker compose -f next/deploy/e2e/compose.yml --env-file next/deploy/e2e/.env run --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker compose -f next/deploy/e2e/compose.yml --env-file next/deploy/e2e/.env up -d --no-build --wait --wait-timeout 240
```

使用预先构建的镜像时跳过 `build`。`market-init` 会检查签名索引和公钥存在，随后复制镜像内市场到本项目的数据卷；配置错误或签名市场缺失会阻止节点启动。应用入口脚本从同一镜像的公钥配置市场及插件信任；不会关闭签名验证。

Caddy 路由：

- `/`：按最少在途请求选择节点，按 `/healthz` 的 200 状态做主动健康检查，网络失败后暂时被动剔除节点。只有 GET/HEAD 分支启用 5 秒的选择重试窗口；POST、PUT、DELETE 等写请求不启用重试，业务 503 不触发被动摘除。
- `/__node1/*`、`/__node2/*`：去掉前缀后固定访问指定节点，保留原响应与健康状态。
- `/__mock/*`：去掉前缀后访问 mock 的控制和观测接口。
- `/market/*`：只读提供签名索引、签名、公钥和插件包。

容器内 mock 地址为 `http://mock-upstream:8080`；Caddy 内部地址为 `http://caddy:3120`，用于测试的自调用保护检查。PG 用户和数据库均为 `sub2api`，SQL/Redis 检查通过专用容器的 `docker exec` 完成，无需发布数据库端口。

读取和写入使用独立的代理 handler，因为 Caddy 的 `lb_retry_match` 只限制连接建立后的失败，拨号失败仍可对任意方法重试；仅靠该选项无法保证 POST 不重试。直连节点辅助路由不做跨节点回退，以保留节点故障的真实结果。参见 [Caddy 重试与健康检查说明](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#load-balancing)。

## 运行测试

在 Docker 主机上的完整仓库目录中执行，宿主无需安装 Go：

```sh
sh next/deploy/e2e/test.sh
# 只跑选定用例；参数直接传给 go test。
sh next/deploy/e2e/test.sh -run '^TestAC(14|15|17)'
```

脚本只接受 `sub2api-next-e2e` 或 `sub2api-next-e2e-<后缀>` 项目名；启动 runner 前核对 6 个运行中容器的 Compose 项目、服务标签和 `edge` 网络归属。它不会启动或重建后端服务。默认读取同目录 `.env`，可用 `E2E_ENV_FILE` 指定其他独立配置；自定义项目时必须显式传入同一个名称，例如 `E2E_PROJECT=sub2api-next-e2e-ci sh next/deploy/e2e/test.sh`，脚本中的项目名优先于 `.env`。

如果部署文件与源码快照分别存放，给脚本设置 `E2E_SOURCE_ROOT=/绝对路径/仓库根目录`，该目录必须包含 `next/e2e`、`next/sdk` 和 `next/plugins/guard`；默认从脚本所在目录推导仓库根目录。源码绑定仍固定落在 runner 的 `/src`，不改变测试内的定位规则。

`runner` 位于 `test` profile，普通 `up` 不会运行它。它把完整仓库只读挂到 `/src`，在 `/src/next/e2e` 当场编译并执行测试，使用项目专属的 Go 模块和构建缓存；测试目标固定为 `http://caddy:3120`，Docker 操作固定走本机 socket。默认开启 `E2E_LONG=1`；`E2E_GO_IMAGE` 和 `E2E_GOPROXY` 可在 `.env` 中调整。Docker CLI 默认 `/usr/bin/docker`，可通过脚本环境变量 `E2E_DOCKER_BIN` 指定，必须是与 Linux runner 架构匹配的可执行文件。首次运行需要拉取 Go 镜像及下载模块；runner 可通过 `edge` 出网，数据库和业务节点仍仅连接内网。

AC14/AC15 会重编译派生 guard 插件，因此**只复制预编译测试二进制并不够**：执行环境必须有 Go 1.27 和完整源码，且源码位于 `runtime.Caller` 记录的编译路径。不要用 `-trimpath` 编译 E2E 测试，也不要编译后搬走源码。`test.sh` 同路径编译和执行，满足这个要求。

runner 为执行故障注入而挂载 `/var/run/docker.sock`，拥有宿主 Docker 管理权限；项目校验用于防误操作，不是 Docker 权限隔离。它只应执行受信任的仓库测试。其余部署服务均不挂载 socket。脚本要求在测试 Docker 主机本地执行，不接受远程 Docker context；远端测试先 SSH 到专用源码目录再执行同一条命令。

也可以在有 Go 1.27 的主机上，从编译时相同的完整源码目录直接运行：

```sh
set -a
. ./next/deploy/e2e/.env
set +a
export E2E_BASE_URL="${E2E_PUBLIC_URL:-http://127.0.0.1:3120}"
export E2E_DOCKER_HOST=local
export E2E_LONG=1
(cd next/e2e && go test -count=1 -timeout=30m -v ./...)
```

如果 Docker 位于远端，在本机建立 `ssh -N -L 3120:127.0.0.1:3120 <测试主机>`，将 `E2E_DOCKER_HOST` 改为该 SSH 主机名，并给测试进程提供**这套 E2E 环境**的管理员凭据及 `E2E_PROJECT`。`E2E_NODE_URLS`、`E2E_MOCK_URL` 默认从 `E2E_BASE_URL` 推导，不需要逐项指定。不要把单测的 `TEST_DATABASE_URL` / `TEST_REDIS_URL` 指向这里；E2E 自己创建完整业务状态。

节点采用 `restart: "no"`，保证 SIGKILL 后不会自动复活干扰接管断言；测试负责重启，测试异常退出后可重新 `up -d`。节点内存固定为 1 GiB，匹配 AC14 的 1500 MiB OOM 场景，插件内存上限为 1024 MiB。节点停止宽限为 180 秒，允许 HTTP、后台工作和账务完成排空。

插件的 strict network、seccomp、数据库角色隔离和签名校验全部开启，开发模式及未签名包关闭。唯一网络策略例外是 `SUB2API_GATEWAY_ALLOW_PRIVATE_UPSTREAM=true`：mock 位于专用容器私网；该设置只适合隔离测试，不应复制到生产。两个网络都由本次 Compose 项目创建，没有外部网络引用或宿主网络。`edge` 为 Caddy 提供宿主端口发布通路，也供显式启动的 runner 访问入口；PG、Redis、节点和 mock 不因此获得外部网桥连接。

## 保留现场与清理

```sh
docker compose -f next/deploy/e2e/compose.yml --env-file next/deploy/e2e/.env ps -a
docker compose -f next/deploy/e2e/compose.yml --env-file next/deploy/e2e/.env logs --no-color > e2e-stack.log
# 停止环境，保留数据库和其他测试数据。
docker compose -f next/deploy/e2e/compose.yml --env-file next/deploy/e2e/.env down
```

需要全新数据库重跑时，核对 `.env` 中项目名为本次专用 E2E 项目，再对上述同一条 `down` 命令添加 `--volumes`。若还要删除仅被 `test` profile 使用的 Go 缓存卷，清理时需显式启用该 profile：

```sh
docker compose --profile test -f next/deploy/e2e/compose.yml --env-file next/deploy/e2e/.env down --volumes
```

这会删除该项目的全部测试数据及运行器缓存；普通 `down --volumes` 可能保留未启用 profile 的缓存卷。不要用 `docker system prune` 或操作其他项目。
