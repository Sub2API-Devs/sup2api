# 04 迁移与发布方案：Go 控制器 + guard（docker compose）

日期：2026-11-01。作者：agent 团队成员 D。状态：方案稿，待用户确认后执行。

依据：

- `next/docs/CCGATEWAY-GUARD-DESIGN.md`（下称"设计稿"）。
- 2026-11-01 用户的两次决定：
  1. 控制器用 Go 重写，新增宿主机服务 guard 代为执行 Docker 操作。
  2. guard、控制器、共享 Xray 网关三者都用 docker compose 启动，不用 systemd。
- 同目录成员 B（Go 控制器）、成员 C（guard）的设计。本文只规定迁移、发布、核心改动和验收；第 10 节列出本文对 B、C 的接口要求。

现网基线（取自 `next/deploy/gateway/ovh/README.md`）：

| 项 | 现状 |
|---|---|
| 核心 | 0.1.226（两节点 sup2api-1 / sup2api-ccp） |
| 插件 | ccgateway 0.1.118（Python 控制器 `7a72fd3424e9`） |
| 网关 | `ccg-shared-egress`，由 docker-py 创建，镜像 `sha256:92305b5b…` |
| bridge guard | systemd `ccgateway-bridge-guard`（`5b1e63bff`），约 23% 单核 |
| 控制器所在主机 | 只有 ovh（sup2api-1）跑控制器，clicodeplus 没有 |
| 连接方式 | 核心以 `controller` 模式经 `https://ccmax.prophey.ai`（共用 Caddy）→ `127.0.0.1:8787` 连控制器 |

版本号暂定：核心 **0.1.227**，插件 **ccgateway 0.1.119**。执行时如已被占用，顺延即可，文中的约束不变。

以下约定贯穿全文：

- 标 **【批准 An】** 的步骤动线上服务，执行前必须得到用户同意。
- 所有命令都在 ovh 上以 root 执行。`$DC` 指 `docker compose -p ccgateway --project-directory /opt/ccgateway -f /opt/ccgateway/compose.yml --env-file /opt/ccgateway/.env`。
- **任何时候都不对 ccgateway 项目执行不带服务名的 `up` 和 `down`。** 网关纳入 compose 之后，这两条命令会重建或删除网关，导致所有账号断网。

---

## 1. 阶段一览

| 阶段 | 内容 | 预期停机 | 批准点 | 回滚 |
|---|---|---|---|---|
| S0 | 构建、单测；一次性主机上演练核心安装脚本；ovh 隔离实例全量演练；备份；采集性能基线 | 无 | — | — |
| S1 | 停 systemd bridge guard → `compose up guard` | 模型请求不受影响：规则一直在内核里，切换期间最多约 5 秒不跟随新事件 | A1 | 删除 guard，恢复 bridge guard |
| S2 | 核心 0.1.227（compose 安装路径；内置 ccgateway 仍是 0.1.118） | 与历次核心发布相同（计划约 50 秒，主节点优先） | A2 | 外壳回滚到 0.1.226（schema 不变，允许回滚） |
| S3 | 插件 ccgateway 0.1.119：只做 upload/review/upgrade/testall，**不跑 bundled 和 paired**；把 Go 控制器镜像直接 `docker load` 到 ovh | 插件进程重启的几秒 | A3、A4 | rollout 回 0.1.118 包 |
| S4 | 接管（adopt）：停旧控制器、搬数据、`compose up controller` | **控制器不可用 15–40 秒**：新请求 503，进行中的隧道（长流）断开 | A5（低峰窗口） | 立即执行回滚脚本，约 15 秒 |
| S5 | 验收：功能、真实流量、负面检查、性能；最后执行 finish | 自升级往返 2 次，每次约 10 秒；Worker 原地更新时每账号几秒 | A6、A7 | 见第 5 节 |
| 观察期 | 7 天，每天对一次核对表 | 无 | — | release 手册（§5.3） |
| S6 | 独立维护窗口：网关纳入 compose 并重建 | **所有账号出网中断 10–60 秒** | A8 | 删除 compose 网关，恢复旧容器 |
| 收尾 | 删除历史目录、bridge guard 文件、旧镜像、Python 控制器 | 无 | A9 | — |

S1、S2、S3 之间相互独立，可以分天执行。S4 必须在 S1、S2、S3 都完成并观察过之后进行。S6 不是接管的前提，可以无限期推迟。

---

## 2. 核心改动（`server/internal/ccgateway`）

### 2.1 结论

| 问题 | 结论 |
|---|---|
| 是否涉及外壳 Host API | **否。** 只改 `runtime.go` 里经 SSH 或本机执行的脚本文本、`images.go` 的常量、配置里一个可选字段。`protocol.HostAPIVersion` 不变，所以**不需要先升外壳**。发布前照例核对 manifest 的 Host API = 8。 |
| 是否需要迁移脚本 | **否。** `ccgateway_remote` 配置是 settings 表里加密的 JSON，新增可选字段 `images.guard` 不改表结构；没有数据要改。`server/internal/migrations/` 不新增文件。 |
| 是否影响 ovh 线上的连接 | **否。** ovh 是 `controller` 模式：一键升级走 `panelUpgrade`，推送内置镜像走 `runtime/bundled`，两者都只调用控制器 API，不执行 `installScript`。新脚本只在"经 SSH 或本机安装控制器"时运行。 |
| clicodeplus | 没有控制器；核心照常升级，行为不变。 |
| 内置插件 | 0.1.227 的 `builtin/` **仍放 ccgateway 0.1.118 包**。内置插件只升不降，放进 0.1.119 会让核心升级时顺带升级插件，打乱 S2/S3 的先后顺序。等观察期结束、下一次核心发布时再换。 |

### 2.2 安装路径按控制器镜像的标签选择

在安装脚本里，拉到控制器镜像之后先读它的标签 `io.sup2api.ccgateway.guard-api`：

| 标签 | 路径 | 说明 |
|---|---|---|
| 不是 `1`（Python 0.1.118 及更早的镜像） | **旧路径**：`docker run --network host` 加 `docker.sock` | 命令序列与 0.1.226 **逐字相同**。只多一处检查：主机若已由 compose 管理，返回 `legacy_blocked` 并退出（见下文） |
| `1`（Go 控制器） | **compose 路径**：写 `compose.yml` 和 `.env`，执行 `compose up` | 第一次在装有旧控制器的主机上执行时，同时完成过渡（§2.5） |

按镜像标签选择而不是按"主机上有没有 guard"选择，理由如下：

- 插件回滚到 0.1.118 时，核心自动走回旧路径，不需要额外开关。
- Go 镜像在旧路径下一定起不来（没有 `CCG_GUARD_URL` 就退出），没有理由让它走旧路径。
- 主机状态（有没有 guard、guard 是否在跑）可能是半成品；镜像标签是确定的。

**`legacy_blocked` 检查。** 这是旧路径里唯一的新增，只在已过渡的主机上触发。条件是以下任一成立：

- `ccg-controller` 带 `com.docker.compose.project=ccgateway` 标签；
- `/opt/ccgateway-controller/.adopted` 存在。

这时旧路径会以 `/opt/ccgateway-runtime` 为数据根拉起 Python 控制器，而控制器数据已经搬走了。Python 控制器看到的是空状态，会把现有账号当成陌生资源处理，所以必须拒绝。回到 Python 只能走 release 手册（§5.3）。

### 2.3 compose 模板

模板是独立文件 `server/internal/ccgateway/compose/ccgateway.compose.yml`，用 `//go:embed` 嵌入核心，安装脚本以带引号的 heredoc（`<<'CCG_COMPOSE_EOF'`）原样写到 `/opt/ccgateway/compose.yml`。同一个文件也是 S1 手工部署和隔离实例使用的文件，**只有这一份来源**。

实例相关的值都用 `${VAR:-生产默认值}` 写。核心只写四个变量，其余变量用默认值，就是生产配置；隔离实例在自己的 `.env` 里覆盖这些变量（§7）。guard 内部的环境变量名由 C 定稿，下面是要点草案：

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
    cap_add: [NET_ADMIN, NET_RAW, SYS_ADMIN, SYS_PTRACE, DAC_OVERRIDE, CHOWN, FOWNER]
    security_opt: ["no-new-privileges:true"]
    read_only: true
    tmpfs: ["/tmp:size=64m"]
    environment:
      CCG_GUARD_TOKEN: ${CCG_GUARD_TOKEN:?}
      CCG_GUARD_PREFIX: ${CCG_PREFIX:-ccg}
      CCG_GUARD_LISTEN: ${CCG_GUARD_ADDR:-172.29.255.1}:8790
      CCG_GUARD_CONTROLLER_IP: ${CCG_CONTROLLER_IP:-172.29.255.2}
      CCG_GUARD_CONTROL_BRIDGE: ${CCG_CONTROL_BRIDGE:-ccg-control0}
      CCG_GUARD_CHAIN_PREFIX: ${CCG_CHAIN_PREFIX:-CCG}
      CCG_GUARD_PROJECT: ${CCG_PROJECT:-ccgateway}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ${CCG_RUNTIME_HOST_ROOT:-/opt/ccgateway-runtime}:${CCG_RUNTIME_HOST_ROOT:-/opt/ccgateway-runtime}
      - ${CCG_PROJECT_DIR:-/opt/ccgateway}:${CCG_PROJECT_DIR:-/opt/ccgateway}
      - ${CCG_RUNTIME_ENV:-/opt/ccgateway-runtime.env}:${CCG_RUNTIME_ENV:-/opt/ccgateway-runtime.env}:ro
      - ${CCG_GUARD_STATE:-/var/lib/ccgateway-guard}:/var/lib/ccgateway-guard
    logging: *log

  controller:
    image: ${CCG_CONTROLLER_IMAGE:?}
    container_name: ${CCG_PREFIX:-ccg}-controller
    restart: unless-stopped
    networks:
      control: {ipv4_address: "${CCG_CONTROLLER_IP:-172.29.255.2}"}
    ports: ["127.0.0.1:${CCG_CONTROLLER_PUBLISH:-8787}:8787"]
    env_file: [${CCG_RUNTIME_ENV:-/opt/ccgateway-runtime.env}]
    environment:            # 优先于 env_file 中的同名变量
      CCG_RUNTIME_ROOT: /data
      CCG_CONTROLLER_BIND: 0.0.0.0
      CCG_CONTROLLER_IMAGE: ${CCG_CONTROLLER_IMAGE:?}
      CCG_GUARD_URL: http://${CCG_GUARD_ADDR:-172.29.255.1}:8790
      CCG_GUARD_TOKEN: ${CCG_GUARD_TOKEN:?}
    volumes:
      - ${CCG_CONTROLLER_DATA:-/opt/ccgateway-controller}:/data
    cap_drop: [ALL]
    security_opt: ["no-new-privileges:true"]
    read_only: true
    tmpfs: ["/tmp:size=64m"]
    mem_limit: 1g
    pids_limit: 512
    labels: {io.sup2api.ccgateway.controller: "${CCG_PREFIX:-ccg}"}
    logging: *log

  egress:                    # 只在 S6 维护窗口显式启用（--profile egress）
    profiles: [egress]
    image: ${CCG_GATEWAY_IMAGE:?}
    container_name: ${CCG_PREFIX:-ccg}-shared-egress
    # 参数照搬 SharedEgress.create / guard 的 gateway_spec，由 C 定稿：
    # NET_ADMIN + NET_BIND_SERVICE、两个固定 sysctl、384m、2 CPU、unless-stopped、
    # 归属标签 io.sup2api.ccgateway.shared=<prefix>、shared-egress/ → /config:ro、uplink 网络
    logging: *log

networks:
  control:
    external: true
    name: ${CCG_CONTROL_NETWORK:-ccg-control}
  uplink:
    external: true
    name: ${CCG_PREFIX:-ccg}-d0000000000000000-xray-uplink
```

要点：

- **`.env` 是镜像的唯一来源。** 控制器的 `CCG_CONTROLLER_IMAGE` 由 `environment` 从 `.env` 取，压过 `env_file` 里的同名行。guard 做自升级时只改 `.env` 一行，不需要写 `/opt/ccgateway-runtime.env`，guard 对它只读挂载。
- **`env_file` 由 compose 客户端读取。** 谁执行 compose，谁就要能读到这个文件：主机上是核心的脚本，自升级时是 guard。所以 guard 必须在**同一路径**只读挂载 `/opt/ccgateway-runtime.env`。`/opt/ccgateway` 也要挂在同一路径，因为 compose 会按项目目录解析相对路径。
- **`ccg-control` 设为外部网络。** 这与协调稿"网络写在 compose 里"不同，理由有三：
  1. guard 是 host 网络，要绑定 `172.29.255.1`，这个地址必须先于控制器存在。S1 只起 guard，compose 不会替它建只有 controller 用的网络。
  2. 外部网络不会因为误执行 `down` 被删掉。
  3. 安装脚本可以在建网络时检查子网冲突，并给出明确的结果码。

  如果 B、C 坚持由 compose 管理这个网络，guard 就必须在地址出现之前等待（重试绑定），不能退出。
- **`egress` 放在 `profiles: [egress]` 下。** 默认的 `up` 不会碰它，S6 之前它不会被创建。`${CCG_GATEWAY_IMAGE:?}` 必须始终有值，因为 compose 会对整个文件做插值；安装脚本保证它有值。
- **控制器只挂 `/data` 一个目录。** 不挂 `.env`（里面有 guard 令牌和 guard 镜像），也不挂 `docker.sock`。令牌只以环境变量的形式交给控制器。

### 2.4 `installScript` 的新写法

签名不变：`installScript(img RuntimeImages, workloadOptional bool)`，`RuntimeImages` 新增 `Guard` 字段（§2.8）。脚本仍然只拼接常量和通过 `validImage` 的引用。下面是完整骨架，`<…>` 内是 0.1.226 的原文：

```sh
set -u
umask 077
APP='<app>'
EGRESS='<egress>'
CTL='<controller>'
GUARD='<guard>'
ROOT='/opt/ccgateway-runtime'
ENVF='/opt/ccgateway-runtime.env'
DIR='/opt/ccgateway'
DATA='/opt/ccgateway-controller'
<workload 拉取：0.1.226 原文>
docker image inspect "$CTL" >/dev/null 2>&1 || docker pull -q "$CTL" >/dev/null 2>&1 || { echo CCG_RESULT=image_pull_failed; exit 1; }
API=$(docker image inspect --format '{{index .Config.Labels "io.sup2api.ccgateway.guard-api"}}' "$CTL" 2>/dev/null)
OWNER=$(docker inspect --type container --format '{{index .Config.Labels "com.docker.compose.project"}}' ccg-controller 2>/dev/null)
if [ "$API" != 1 ]; then
  if [ "$OWNER" = ccgateway ] || [ -e "$DATA/.adopted" ]; then echo CCG_RESULT=legacy_blocked; exit 1; fi
  <0.1.226 原文：从 mkdir -p "$ROOT" 到 echo CCG_RESULT=started，逐字不变>
  exit 0
fi

# ---- compose 路径 ----
dc() { docker compose -p ccgateway --project-directory "$DIR" -f "$DIR/compose.yml" --env-file "$DIR/.env" "$@"; }
<adopt 与 release 两个函数，见 §2.6>
restore_env() { [ -e "$DIR/.env.prev" ] && mv -f "$DIR/.env.prev" "$DIR/.env"; }
docker compose version >/dev/null 2>&1 || { echo CCG_RESULT=compose_unavailable; exit 1; }
# 旧 bridge guard 还在跑时，两个进程会争写同一条链
if systemctl is-active --quiet ccgateway-bridge-guard 2>/dev/null; then echo CCG_RESULT=bridge_guard_active; exit 1; fi
docker image inspect "$GUARD" >/dev/null 2>&1 || docker pull -q "$GUARD" >/dev/null 2>&1 || { echo CCG_RESULT=image_pull_failed; exit 1; }
mkdir -p "$ROOT" "$DATA" "$DIR" /var/lib/ccgateway-guard && chmod 700 "$ROOT" "$DATA" "$DIR" || { echo CCG_RESULT=install_failed; exit 1; }
# 搬数据必须是同一文件系统内的 rename
[ "$(stat -c %d "$ROOT")" = "$(stat -c %d "$DATA")" ] || { echo CCG_RESULT=install_failed; exit 1; }
if ! { cat > "$ENVF.tmp" && chmod 600 "$ENVF.tmp" && mv -f "$ENVF.tmp" "$ENVF"; }; then
  rm -f "$ENVF.tmp"; echo CCG_RESULT=install_failed; exit 1
fi
if ! { cat > "$DIR/compose.yml.tmp" <<'CCG_COMPOSE_EOF'
<compose 模板原文>
CCG_COMPOSE_EOF
} || ! chmod 600 "$DIR/compose.yml.tmp" || ! mv -f "$DIR/compose.yml.tmp" "$DIR/compose.yml"; then
  rm -f "$DIR/compose.yml.tmp"; echo CCG_RESULT=install_failed; exit 1
fi
# .env：保留主机上已有的令牌、网关镜像和其他实例变量；第一次改动前留一份 .env.prev
TOKEN=$(sed -n 's/^CCG_GUARD_TOKEN=\([0-9a-f]\{64\}\)$/\1/p' "$DIR/.env" 2>/dev/null | head -n 1)
[ -n "$TOKEN" ] || TOKEN=$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')
GW=$(sed -n 's/^CCG_GATEWAY_IMAGE=\([A-Za-z0-9][A-Za-z0-9._\/:@-]*\)$/\1/p' "$DIR/.env" 2>/dev/null | head -n 1)
[ -n "$GW" ] || GW=$EGRESS
[ -e "$DIR/.env.prev" ] || [ ! -e "$DIR/.env" ] || cp -p "$DIR/.env" "$DIR/.env.prev" || { echo CCG_RESULT=install_failed; exit 1; }
if ! { { grep -E '^CCG_[A-Z0-9_]+=' "$DIR/.env" 2>/dev/null | grep -Ev '^CCG_(GUARD_IMAGE|CONTROLLER_IMAGE|GATEWAY_IMAGE|GUARD_TOKEN)='
         printf 'CCG_GUARD_IMAGE=%s\nCCG_CONTROLLER_IMAGE=%s\nCCG_GATEWAY_IMAGE=%s\nCCG_GUARD_TOKEN=%s\n' "$GUARD" "$CTL" "$GW" "$TOKEN"; } > "$DIR/.env.tmp" \
       && chmod 600 "$DIR/.env.tmp" && mv -f "$DIR/.env.tmp" "$DIR/.env"; }; then
  rm -f "$DIR/.env.tmp"; restore_env; echo CCG_RESULT=install_failed; exit 1
fi
# 控制网
NET=$(docker network inspect --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' ccg-control 2>/dev/null)
if [ -z "$NET" ]; then
  docker network create --driver bridge --subnet 172.29.255.0/29 --gateway 172.29.255.1 \
    -o com.docker.network.bridge.name=ccg-control0 --label io.sup2api.ccgateway.control=ccg ccg-control >/dev/null 2>&1 \
    || { restore_env; echo CCG_RESULT=control_network_conflict; exit 1; }
elif [ "$NET" != 172.29.255.0/29 ]; then restore_env; echo CCG_RESULT=control_network_conflict; exit 1; fi
dc config -q >/dev/null 2>&1 || { restore_env; echo CCG_RESULT=install_failed; exit 1; }
# guard 先行：只有显式安装才会更新 guard
if ! dc up -d --no-deps guard >/dev/null 2>&1; then
  restore_env; dc up -d --no-deps guard >/dev/null 2>&1; echo CCG_RESULT=guard_unavailable; exit 1
fi
i=0
until dc exec -T guard ccgateway-guard ready >/dev/null 2>&1; do
  i=$((i+1)); [ "$i" -ge 30 ] && { echo CCG_RESULT=guard_unavailable; exit 1; }; sleep 1
done
# 上次安装若在改名后中断（只剩 prev）：先改回原名，与旧路径相同
if ! docker inspect --type container ccg-controller >/dev/null 2>&1 && docker inspect --type container ccg-controller-prev >/dev/null 2>&1; then
  docker rename ccg-controller-prev ccg-controller >/dev/null 2>&1
  OWNER=$(docker inspect --type container --format '{{index .Config.Labels "com.docker.compose.project"}}' ccg-controller 2>/dev/null)
fi
if docker inspect --type container ccg-controller >/dev/null 2>&1 && [ "$OWNER" != ccgateway ]; then
  [ -z "$OWNER" ] || { echo CCG_RESULT=install_failed; exit 1; }   # 名字被别的 compose 项目占用
  # 过渡：旧方式装出来的控制器
  docker rm -f ccg-controller-prev >/dev/null 2>&1
  : > "$DIR/.transition"
  docker rename ccg-controller ccg-controller-prev >/dev/null 2>&1 || { rm -f "$DIR/.transition"; echo CCG_RESULT=install_failed; exit 1; }
  docker stop ccg-controller-prev >/dev/null 2>&1
else
  # 已经是 compose（或全新主机）：上一轮未 finish 的 prev 作废，与旧路径的 rm -f prev 同义
  docker rm -f ccg-controller-prev >/dev/null 2>&1
  rm -f "$DIR/.transition"
fi
if ! adopt; then
  release; rm -f "$DIR/.transition"
  docker rename ccg-controller-prev ccg-controller >/dev/null 2>&1 && docker start ccg-controller >/dev/null 2>&1
  echo CCG_RESULT=install_failed; exit 1
fi
if ! dc up -d --no-deps controller >/dev/null 2>&1; then
  <与 rollbackScript 的 compose 分支相同的内联恢复>
  echo CCG_RESULT=controller_unhealthy; exit 1
fi
echo CCG_RESULT=started
```

说明：

- **CCG_RESULT 协议不变。** 结果仍然只由脚本打印，仍以最后一行 `CCG_RESULT=` 为准。compose、docker 和 guard 的输出一律重定向到 `/dev/null`，不会出现第二个 `CCG_RESULT`。`CCG_ROLLBACK` 之类的附加信息如果需要，单独占一行，并且放在 `CCG_RESULT` 之前（核心的正则 `^CCG_RESULT=([a-z_]+)\s*$` 不接受同一行带尾巴）。
- **`started` 之后的流程不变。** 核心照旧轮询 `/health`（经 Caddy 或 SSH 转发到 `127.0.0.1:8787`，端口映射后路径相同）；成功就执行 `finishScript`，失败就执行 `rollbackScript`。
- **guard 令牌只在主机上生成，从不离开主机。** 它不在脚本文本、stdin 或核心的任何数据里。
- **只在 compose 路径做的保护：** 检查 `bridge_guard_active`，以及搬数据前检查两个目录在同一文件系统（`stat -c %d`）。

### 2.5 `finishScript` 与 `rollbackScript`

两者仍是常量，测试里的 `kind()` 判断照旧用等值比较，不受影响。

**finishScript：**

```sh
docker rm -f ccg-controller-prev >/dev/null 2>&1
rm -f /opt/ccgateway/.env.prev /opt/ccgateway/.transition
echo CCG_RESULT=done
```

旧路径的主机上没有这两个文件，`rm -f` 什么也不做，所以和原来等价。在 compose 主机上，`ccg-controller-prev` 就是过渡前的 Python 控制器容器。

**rollbackScript：**

```sh
set -u
DIR='/opt/ccgateway'; ROOT='/opt/ccgateway-runtime'; DATA='/opt/ccgateway-controller'
dc() { …同上… }
<release 函数>
OWNER=$(docker inspect --type container --format '{{index .Config.Labels "com.docker.compose.project"}}' ccg-controller 2>/dev/null)
if [ "$OWNER" = ccgateway ] || [ -e "$DIR/.env.prev" ] || [ -e "$DIR/.transition" ]; then
  dc rm -sf controller >/dev/null 2>&1
  if [ -e "$DIR/.transition" ]; then
    release || { echo CCG_RESULT=restore_failed; exit 1; }
    [ -e "$DIR/.env.prev" ] && mv -f "$DIR/.env.prev" "$DIR/.env" && dc up -d --no-deps guard >/dev/null 2>&1
    rm -f "$DIR/.transition"
    if docker inspect --type container ccg-controller-prev >/dev/null 2>&1; then
      if docker rename ccg-controller-prev ccg-controller >/dev/null 2>&1 && docker start ccg-controller >/dev/null 2>&1; then
        echo CCG_RESULT=restored; exit 0
      fi
      echo CCG_RESULT=restore_failed; exit 1
    fi
    echo CCG_RESULT=removed; exit 0
  fi
  if [ -e "$DIR/.env.prev" ]; then
    if mv -f "$DIR/.env.prev" "$DIR/.env" && dc up -d --no-deps guard controller >/dev/null 2>&1; then
      echo CCG_RESULT=restored; exit 0
    fi
    echo CCG_RESULT=restore_failed; exit 1
  fi
  echo CCG_RESULT=removed; exit 0
fi
<0.1.226 rollbackScript 原文>
```

compose 路径的语义与旧路径一一对应：

| 旧路径 | compose 路径 |
|---|---|
| prev 容器 | `.env.prev`（旧的镜像引用）。compose 重建容器时不保留旧容器，旧镜像仍在本地 |
| 改回 prev 并启动 | 恢复 `.env.prev`，再 `up -d --no-deps guard controller` |
| 删除 prev | 删除 `.env.prev` |

过渡失败时还要把数据搬回去（`release`），再启动 Python prev 容器。过渡回滚时，guard 保持运行。它只维护网桥规则，与 Python 控制器（host 网络）互不干扰，就是 S1 之后的状态。

### 2.6 数据搬迁（adopt / release）

搬迁写在核心的 shell 脚本里，在主机上执行，而不放在 guard 里，理由有三：

1. guard 在容器里。把 `/opt/ccgateway-runtime` 和 `/opt/ccgateway-controller` 当作两个 bind mount 挂进去，两者之间的 `rename(2)` 会返回 `EXDEV`，只能逐个复制。`cli-backups` 和 `worker-backups` 有数百 MB，复制既慢又要占双倍磁盘。
2. 回滚必须在 guard 镜像本身有问题时也能执行。
3. 核心的过渡安装和 ovh 的手工接管可以用同一段文本。

这一点与设计稿 §7.6（由 guard 执行 adopt 和 release）不同，需要 C 知悉。guard 不再需要挂载控制器的数据目录。

**规则**（`KEY` 与 `common.KEY` 相同：`[1-9][0-9]*` 或 `d[0-9a-f]{16}`）：

| 路径（相对 `/opt/ccgateway-runtime`） | 类别 | adopt | release |
|---|---|---|---|
| `.lock` | 控制器 | 搬到 `$DATA/.lock` | 搬回 |
| `runtime.json` | 控制器（目标镜像，以及当时环境里的镜像） | 搬 | 搬回 |
| `uploads/` | 控制器（未完成的分块上传） | 搬。S4 前确认为空，或者都是 1 小时前的残留 | 搬回 |
| `backups/` | 控制器 | 搬 | 搬回 |
| `<key>/state.json`、`<key>/egress-desired.json` | 控制器 | 搬到 `$DATA/<key>/` | 搬回 |
| `<key>/worker-backups/`、`<key>/cli-backups/` | 控制器（原地更新的回滚副本） | 搬 | 搬回 |
| `<key>/worker-backups-before-0.1.114/` 等历史子目录 | 控制器的历史数据 | 搬（随账号目录一起，控制器看到的内容不变）；观察期后经用户确认删除 | 搬回 |
| `<key>/` 下其他不认识的文件 | — | 默认归控制器，照搬，并在 `$DATA/.adopted` 里列出 | 搬回 |
| `<key>/resolv.conf` | **挂载源** | **留在原处，归 guard**（已挂进账号容器，inode 不能变） | 不动 |
| `<key>/app.nft` | **挂载源** | **留，归 guard** | 不动 |
| `shared-egress/state.json` | 控制器（含所有账号的代理凭证） | 搬到 `$DATA/shared-egress-state.json` | 搬回 `shared-egress/state.json` |
| `shared-egress/{boot.json,boot.nft,dns.json,active.nft,operation.json}` | **网关配置**（目录已挂进网关） | **留，归 guard** | 不动 |
| `shared-egress/` 下其他文件（如 `*.tmp`） | — | 留，并列出 | 不动 |
| `controller-before-0.1.115/` 等不是 `KEY` 的历史目录 | 历史备份 | **留在原处**，不再挂进任何容器，也不归 guard 使用；S5 结束后打包到 `~/sup2api-managed/backups/ccgateway-guard/`，经用户确认后删除（A9） | 不动 |
| 其他不认识的顶层项 | — | 留，并列出 | 不动 |

实现要点：

- 只用 `mv`。adopt 先检查两个目录在同一设备，所以每次 `mv` 都是原子的 `rename`。
- adopt 是幂等的。最后写 `$DATA/.adopted`（内容是搬过的相对路径清单）；文件已存在就直接返回成功。在全新主机上也写这个文件（清单为空），以后的旧路径安装就会被 `legacy_blocked` 拦住。
- 冲突即失败：目标已存在时，adopt 返回失败，调用方随即执行 release。release 按 `.adopted` 的清单逐项搬回，**另外**把 Go 控制器后来新建的 `$DATA/<key>/` 也整个搬回去（Python 也要用）。目标已存在就停下，报 `restore_failed`，两边都保留，由人处理。release 最后删除 `.adopted`。
- 目录权限：`$DATA` 归 root、权限 0700（第一期控制器在容器里仍是 root）；`$ROOT` 归 root、权限 0700，由 guard 使用。

### 2.7 结果码

`installRuntime` 里的 `switch reason` 增加三项，透传给控制台；另外两项只写日志，对外报 `install_failed`：

| 结果码 | HTTP | 对外 reason | 含义 |
|---|---|---|---|
| `compose_unavailable` | 503 | `compose_unavailable` | 主机或本机模式下的核心没有 `docker compose` v2 |
| `guard_unavailable` | 503 | `guard_unavailable` | guard 起不来，或 30 秒内不就绪 |
| `legacy_blocked` | 409 | `legacy_blocked` | 主机已由 compose 管理，拒绝用旧镜像按旧方式安装 |
| `control_network_conflict` | 503 | `install_failed`（日志写原值） | `ccg-control` 子网被占用或不一致 |
| `bridge_guard_active` | 503 | `install_failed`（日志写原值） | systemd bridge guard 仍在运行 |

`slog.WarnContext` 改为同时记录原始结果码。控制台（`next/web`）为前三项加中文提示，这是可选的，不加时会显示通用的失败文案。`details.rollback` 的取值不变（`restored`、`removed`、`restore_failed`、`rollback_failed`）。

### 2.8 `controllerEnv`、`inspectScript`、`images.go`

- **`controllerEnv` 不改。** 环境文件里仍写 `CCG_RUNTIME_ROOT=/opt/ccgateway-runtime`：
  - compose 用 `environment` 把它覆盖成 `/data`；
  - 回滚到 Python 时，同一个文件原样可用。

  `CCG_CONTROLLER_IMAGE` 照写（安装时与 `.env` 一致；自升级后以 `.env` 为准）。ovh 的环境文件里有手工加的行（如 `CCG_XRAY_IMAGE`、磁盘配额相关的变量）。核心从 stdin 重写环境文件时会丢掉这些行，这是现有行为，不在本期修改。S4 的手工接管用现有文件只改一行（§4 S4），所以会保留。
- **`inspectScript` 不改。** compose 创建的容器名仍是 `ccg-controller`，`Config.Env` 是 `env_file` 和 `environment` 合并后的结果，过滤只留镜像两行。`CCG_GUARD_TOKEN` 与 `CCG_CONTROLLER_KEY` 一样不会离开主机。
- **`images.go`：**
  - 新增常量 `GuardImage = "ghcr.io/sub2api-devs/ccgateway-guard@sha256:<64 hex>"`。
  - `RuntimeImages` 增加 `Guard` 字段，配置里对应可选覆盖值 `images.guard`（与 `gateway` 一样，用于 GHCR 私有时指向主机上本地构建的标签）。`EffectiveImages()` 在未覆盖时使用 `GuardImage`。
  - **guard 镜像不进插件包，插件的 bundled 和 upgrade 流程不碰 guard。** 只有管理员显式执行"安装控制器"或"重新安装"（经 SSH 或本机）时，才会写入 guard 镜像。
  - `ControllerImage` 换成 CI 构建的 Go 控制器 digest，`EgressImage` 随 0.1.119 更新。`AppImage` 仍然构建不出来（`cli-mods/release` 不在 Git 里），维持原值。注意：没有插件包的新主机，从此按默认引用安装的就是 Go 控制器，必须走 compose 路径，也就需要 `docker compose` 和 guard 镜像可拉取。
  - 更新注释里的来源说明。

### 2.9 可选：核心拦下接管前的控制器自升级

这一项建议做，但不是 S4 的前提，因为不做也不会造成故障（§3.5）。

- `build-ccgateway-images.sh` 在 `images.json` 每个角色下增加 `"labels": {"io.sup2api.ccgateway.guard-api": "1"}`（只写这一个标签）。`parseBundle` 用的是非严格的 `json.Unmarshal`，旧核心会忽略这个字段，所以向后兼容。
- 新核心在 `panelUpgrade` 和 `pushBundledRole("controller")` 里加一道检查：内置控制器带这个标签，而当前控制器的 `/health.features` 里没有 `guard-api-v1` 时，直接返回 `controller_adopt_required`（409），不再请求自升级。
- 改动约 30 行，再加一个测试和一条控制台文案。

### 2.10 Go 测试

修改：

- `TestPinnedImages`：加入 guard，正则 `ccgateway-(app|egress|controller|guard)`。
- `TestInstallScriptContainsNoInput`：替换表加入 `GUARD`。断言 compose 模板经 `<<'CCG_COMPOSE_EOF'`（带引号）写入，模板里没有 `'`，也没有单独成行的 `CCG_COMPOSE_EOF`。断言脚本不含 `CCG_CONTROLLER_KEY`、`CCG_GUARD_TOKEN=` 的取值。
- `TestRuntimeInstallFailures`：增加 `compose_unavailable`、`guard_unavailable`、`legacy_blocked` 透传；`control_network_conflict` 和任意未知结果码都映射为 `install_failed`。
- `TestRuntimeImageOverrides`：`images.guard` 的覆盖和校验。
- `fakeHostOps.kind()` 不用改：脚本里仍有 `docker run -d --name ccg-controller`，finish 和 rollback 按常量比较。

新增：

- `TestInstallScriptLegacyBranchUnchanged`：从脚本里取出 `if [ "$API" != 1 ]` 分支，去掉新增的 `legacy_blocked` 一行后，与 `testdata/install-legacy-0.1.226.sh`（0.1.226 原文）逐字比较。rollbackScript 的旧分支也做同样的比较。
- `TestComposeTemplatePolicy`：用 `gopkg.in/yaml.v3` 解析嵌入的模板（模块里已有，从 indirect 改为 direct），逐项断言：
  - `controller`：
    - 没有 `network_mode` 和 `pid`，不是 `privileged`；
    - `volumes` 只有 `…:/data` 一项，不含 `docker.sock`；
    - `ports` 只绑定 `127.0.0.1`；
    - `cap_drop: [ALL]`，没有 `cap_add`；
    - `read_only: true`，有 `no-new-privileges`；
    - `environment` 里有 `CCG_GUARD_URL`、`CCG_GUARD_TOKEN`、`CCG_RUNTIME_ROOT=/data`、`CCG_CONTROLLER_BIND`、`CCG_CONTROLLER_IMAGE`。
  - `docker.sock` 只出现在 `guard` 里。
  - `egress` 的 `profiles` 等于 `[egress]`。
  - `networks` 都是 `external`。
  - 所有插值变量都在白名单内，默认值等于生产常量（子网 `172.29.255.0/29`、`.1`、`.2`、端口 8787、路径）。
- `TestComposeScriptsBehaviour`：只在 Linux 上运行，CI 的 ubuntu runner 会跑。用 `PATH` 上的假 `docker`、`systemctl`、`stat`（shell 桩，把每次调用和参数记到文件里）真实执行 `sh` 脚本，覆盖这些场景：
  1. 全新主机。
  2. 旧控制器过渡（含搬迁清单，按 §2.6 的表构造一个目录树）。
  3. compose 主机重装。
  4. `up controller` 失败时的内联回滚。
  5. 过渡后健康检查失败 → `rollbackScript` 搬回数据并恢复 prev。
  6. compose 主机升级失败 → 按 `.env.prev` 恢复。
  7. finish 清理标记。
  8. `legacy_blocked`。
  9. 中断恢复（只剩 prev）。

  断言最后一行 `CCG_RESULT`、目录树、`.env` 内容和 docker 调用序列。Windows 上没有 `sh` 时以 `t.Skip("needs /bin/sh")` **明示跳过**；发布前必须在 Linux 上跑过（CI，或按 ovh 一次性 golang 容器的做法），并核对 `-v` 输出里这个测试是 PASS，不是 SKIP。
- 黄金文件 `testdata/compose-install.golden.sh`、`compose-rollback.golden.sh`、`compose-finish.golden.sh`：安装脚本用占位引用（`placeholder-app:0`、`placeholder-egress:0`、`placeholder-controller:0`、`placeholder-guard:0`，都能通过 `validImage`）渲染，`-update` 时重新生成。它们有两个用途：代码审查时能看到完整脚本；S4 手工接管时把占位引用 `sed` 成真实引用后**原样执行**，保证生产执行的就是核心里的文本。

---

## 3. 插件与镜像

### 3.1 Go 控制器镜像的要求（交给 B）

| 要求 | 原因 |
|---|---|
| 镜像里**没有 `python`**；用 `CMD ["/ccg-controller"]`，**不设 `ENTRYPOINT`** | 旧 Python 控制器自升级时会执行 `containers.run(<新镜像>, ['python', 'upgrade.py', ref], …)`。不设 ENTRYPOINT 时，这条命令会替换 CMD，`python` 不存在，Docker 启动失败，`APIError` 被映射为 503 `runtime_unavailable`，旧控制器完全不受影响，核心立即得到错误（§3.5）。如果设了 ENTRYPOINT，参数就会传给 Go 程序，那么程序必须对任何多余参数立即以非零码退出 |
| 标签 `io.sup2api.ccgateway.guard-api=1` | 核心按它选择安装路径（§2.2）；guard 的自升级接口只接受带它的镜像 |
| 保留标签 `io.sup2api.ccgateway.shared-egress=1` | §57 规定：控制器自升级时拒绝降级到不声明共享网关的镜像。Python 0.1.118 的 `_check_downgrade` 和 Go 版的同类检查都依赖它 |
| 缺少 `CCG_GUARD_URL` 或 `CCG_GUARD_TOKEN` 时立即退出，退出码非零，并打印原因 | 被旧路径或 Python 自升级误启动时不会造成任何影响 |
| 不包含任何 Docker 客户端代码 | 即使被挂上 `docker.sock` 也用不上 |
| `/health` 的 `features` 在现有各项之外增加 `guard-api-v1`；`controller_image` 取自 `CCG_CONTROLLER_IMAGE` | 核心据此判断是否已接管（§2.9）；验收也要用 |
| 镜像构建上下文为 `companions/`（如果 Go 代码复用 companions 模块），`Dockerfile` 放在 `companions/controller/Dockerfile` | 构建脚本和 CI 要对齐（§3.2） |

数据兼容性要求见 §5.4。

### 3.2 构建脚本和 CI

`next/deploy/docker/build-ccgateway-images.sh`：

- 控制器改为 `docker build … -f "$companions/controller/Dockerfile" "$companions"`，构建上下文由 B 确定。
- `save` 之前检查控制器镜像带有 `guard-api=1` 和 `shared-egress=1`，否则 `die`。不能把一个"会被当成旧控制器安装"的镜像打进包里。
- 可选：在 `images.json` 里写 `labels`（§2.9）。
- **guard 不在这个脚本里构建。** 插件包仍然只有四个角色：app、egress、controller、gateway。

`.github/workflows/ccgateway-images.yml`：

- `test` job：
  - Go 控制器和 guard 若在 `companions` 模块里，现有的 `go vet` 和 `go test ./...` 已经覆盖；若是独立模块，各加一步。
  - **Python 控制器的测试保留到观察期结束。** 回滚依赖 0.1.118，§5.4 的兼容测试也要在 Python 侧运行。
  - 增加一步：用 `gofmt` 和 `go vet` 检查 guard。
- `images` matrix：
  - `ccgateway-controller` 的 context 和 file 按上面修改。
  - 新增 `ccgateway-guard`（context 和 file 由 C 确定）。它的 digest 用于 `images.go` 的 `GuardImage`。
- `bundle` job：断言 `images.json` 只有四个角色，且控制器镜像带 `guard-api=1`。
- `paths` 加上 guard 源码目录。

另外新增 `next/deploy/docker/build-ccgateway-guard.sh <版本>`：在 ovh 上本地构建 `ccgateway-guard:<版本>`，供 GHCR 私有期间使用（§3.4）。

### 3.3 插件 manifest

- `version`：`0.1.119`，镜像标签随之变为 `ccgateway-*:0.1.119`。
- `hostCompat`：改为 `>=0.1.227 <0.2.0`。旧核心按旧路径安装 Go 镜像必然失败，这样可以保证"先核心、后插件"。两节点的核心都要先升到 0.1.227，否则插件市场会拒绝。
- 别的不变。插件的 gRPC 二进制（`main.go`、`internal/`）这一版若没有改动，只是随版本号重打包。

### 3.4 guard 镜像怎么到 ovh

GHCR 包现在是私有的，核心把 digest 固定为默认值，但 ovh 不一定拉得到。有两种做法，**需要用户决定**：

1. 把 `ghcr.io/sub2api-devs/ccgateway-guard` 设为公开（只公开 guard 一个包）。
2. 在 ovh 上用 `build-ccgateway-guard.sh` 从发布提交本地构建，`.env` 的 `CCG_GUARD_IMAGE` 写本地标签。ovh 是 `controller` 模式，核心不会改写这个值。部署记录里写下镜像 ID，并与 CI 构建的镜像核对 `org.opencontainers.image.revision` 标签。

建议用第 2 种；以后在新主机上经控制台安装，再用 `images.guard` 覆盖值或者第 1 种做法。

### 3.5 旧 Python 控制器被要求升级到 Go 镜像时会怎样

触发途径有三个：

- 控制台的"一键升级"（`panelUpgrade`）；
- "推送并启用内置镜像"（`runtime/bundled`，角色顺序 controller → egress → app）；
- `rollout.py bundled`。

S3 之后，内置控制器是 Go 镜像，而线上跑的还是 Python 0.1.118。这时调用的过程：

1. 核心经分块上传把 `controller.tar.gz` 传给 Python 控制器，后者 `docker load`。镜像被加载到主机上，无害；实际上 S3 本来就要把它放到主机上。
2. 核心调用 `POST /runtime/controller {"image": "ccgateway-controller:0.1.119"}`。
3. Python 的 `upgrade_controller` 依次执行：
   1. `ensure_image`：本地已有。
   2. `_check_downgrade`：Go 镜像带 `shared-egress=1`，通过。
   3. `containers.run(ref, ['python', 'upgrade.py', ref], name='ccg-controller-upgrade', network_mode='host', docker.sock…)`。
4. Docker 创建容器成功，启动时报 `exec: "python": executable file not found`，docker-py 抛出 `APIError`。
5. Python 的 `error_answer` 把它映射为 503 `runtime_unavailable`。核心的 `requestUpgrade` 收到明确的错误应答，立即返回失败。
6. 结果：bundled 结果里 controller 一项为 `failed`，`runtime_unavailable`；egress 和 app 照常执行，由 Python 控制器完成。**旧控制器没有被停止，也没有改名，环境文件没有改动。** 主机上留下一个 Created 状态的 `ccg-controller-upgrade` 容器。下次升级时 Python 会把它删掉（状态不是 running）；S4 的前置检查里也会手工删除。

**如果 B 违背 §3.1，设了 ENTRYPOINT**：步骤 4 会启动成功，`/ccg-controller python upgrade.py <ref>` 因为多余参数或缺少 `CCG_GUARD_URL` 退出，辅助容器自动删除。Python 已经回了 202，核心会等满 `controllerUpgradeWait`（90 秒）之后报 `controller_unhealthy`。旧控制器同样不受影响，只是慢、日志噪声大。设计稿 §8.3 写的"`upgrade.py` 健康失败后回滚"在 Go 镜像下不会发生：那个分析的前提是新镜像里还有 `upgrade.py`。

### 3.6 怎样避免接管前误触发

按优先级排列：

1. **操作上：S3 只执行 `upload`、`review`、`upgrade`、`testall`，不执行 `bundled`、`bundled-roles` 和 `paired`。** egress 和 app 的 0.1.119 推送放到 S5，由 Go 控制器经 guard 完成，同时作为"原地更新 Worker"和"目标镜像"的验收。
2. **通知：** S3 之后控制台的运行环境页会显示"不是最新"。在用户群或操作记录里注明：S4 完成之前，不要点"一键升级"和"推送并启用内置镜像"。
3. **镜像兜底：** §3.1 的要求保证误点也不会造成故障。
4. **核心兜底（可选）：** §2.9 的 `controller_adopt_required`。

---

## 4. 上线阶段

### S0 准备（无停机）

工作内容：

1. 合并 B、C 的代码和本文的核心改动，整体只用一个发布提交 `<C0>`。核心 0.1.227、插件 0.1.119、guard 都从 `<C0>` 构建，S1 用的 `compose.yml` 也取自 `<C0>`。
2. 测试：
   - `next/server` 执行 `go test ./internal/ccgateway/...`，`TestComposeScriptsBehaviour` 在 Linux 上必须是 PASS。
   - `companions`（控制器和 guard）执行 `go test ./...`。
   - Python 0.1.118 测试，加上 §5.4 的兼容夹具。
   - 按 `tests-must-not-silently-skip` 的要求核对没有被跳过的测试。
3. **演练核心安装脚本**（§2.10 的黄金脚本，真实执行，**不在 ovh 生产的 Docker 上**）。首选一台一次性 VM。没有 VM 时，备选是 ovh 上的 `docker:dind` 容器；它需要 `--privileged`，**属于批准事项 A0**。演练分三轮：
   - **第一轮：模拟现状。** 用 0.1.226 的旧路径脚本装 Python 0.1.118 控制器，起一个假账号（`d0000000000000001`），手工补齐 §2.6 表里的各类文件，包括 `controller-before-0.1.115/` 和 `worker-backups-before-0.1.114/`。
   - **第二轮：过渡。** 执行 compose 路径的安装脚本，核对搬迁结果、`.adopted` 清单、`legacy_blocked`。然后故意让健康检查失败，执行 rollbackScript，确认数据搬回、Python 恢复。再过渡一次，执行 finish。
   - **第三轮：升级。** 先 compose 升级，再 compose 回滚（`.env.prev`），最后 release 手册（§5.3）。
4. ovh 隔离实例全量演练（§7），包括 Python → Go 接管和 Go → Python release 的往返。
5. 备份（只读操作，不需要批准）。目录 `~/sup2api-managed/backups/ccgateway-guard/`：
   - `runtime-root.tgz`：`/opt/ccgateway-runtime` 整体，排除 `*/cli-backups` 和 `*/worker-backups*` 以控制体积，只记录这几个目录的清单和大小。
   - `runtime.env`：权限 0600。
   - `docker inspect ccg-controller ccg-shared-egress` 的结果。
   - `iptables -S` 和 `iptables -S -t raw`。
   - 数据库备份，按惯例做。
6. 基线采集（只读）：
   - bridge guard CPU：取 `systemctl show ccgateway-bridge-guard -p CPUUsageNSec` 两次读数，间隔 10 分钟，换算成单核百分比，预期约 23%。
   - 就绪耗时：在 ovh 上用 python3 小脚本，带管理密钥对 21 号和 51 号账号各请求 200 次 `GET /accounts/<key>/connection`，再测一次隧道握手（`/accounts/<key>/tunnel` 到 101 的时间），记录 p50、p95、p99。
   - 近 24 小时核心请求日志的首 token 和 `upload_ms` 分位数。
7. 前置核对（只读）：
   - `docker compose version`：v2，记下版本。
   - `ip -4 route` 和 `docker network inspect $(docker network ls -q)`：确认 `172.29.255.0/29` 没有被占用（隔离实例还要用 `172.29.255.8/29`）。
   - `iptables -V`：`nf_tables`。在 guard 镜像里执行 `iptables -V`，也必须是 nf_tables。
   - `cat /etc/docker/daemon.json`：确认 userland-proxy 没有关闭，这关系到 Caddy 能否经 `127.0.0.1:8787` 访问端口映射。
   - `stat -c %d /opt /opt/ccgateway-runtime`：确认同一设备。
   - 列出 `/opt/ccgateway-runtime.env` 的变量名，不列值。

成功判据：所有测试通过且没有被跳过；三轮演练和隔离实例全部通过；基线已记录。

### S1 guard 替换 bridge guard

**前置检查：**

- S0 完成，没有遗留的隔离实例链（§7 的清理已执行）。
- `systemctl is-active ccgateway-bridge-guard` 为 active。
- `iptables -S CCG-PROXY-BRIDGE | wc -l` 为 23 行（链头加 22 条规则，对应 11 个账号；按当天的实际数为准）。

**命令：**

```sh
# 1) 文件（不影响运行）
install -d -m 700 /opt/ccgateway /var/lib/ccgateway-guard
install -m 600 <C0>/next/server/internal/ccgateway/compose/ccgateway.compose.yml /opt/ccgateway/compose.yml
TOKEN=$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')
GW=$(docker inspect --format '{{.Image}}' ccg-shared-egress)        # 当前网关镜像 sha256:92305b5b…
umask 077; printf 'CCG_GUARD_IMAGE=%s\nCCG_CONTROLLER_IMAGE=%s\nCCG_GATEWAY_IMAGE=%s\nCCG_GUARD_TOKEN=%s\n' \
  ccgateway-guard:<ver> ccgateway-controller:0.1.119 "$GW" "$TOKEN" > /opt/ccgateway/.env
$DC config -q
# 2) 只计算不写入：与内核里的现行规则对比
$DC run --rm --no-deps guard ccgateway-guard print-rules --chain CCG-PROXY-BRIDGE > /tmp/ccg-new.rules
iptables -S CCG-PROXY-BRIDGE > /tmp/ccg-old.rules
diff <(sort /tmp/ccg-old.rules) <(sort /tmp/ccg-new.rules)          # 必须为空
```

`print-rules` 不写任何规则，也不需要控制网。

**【批准 A1】切换：**

```sh
docker network create --driver bridge --subnet 172.29.255.0/29 --gateway 172.29.255.1 \
  -o com.docker.network.bridge.name=ccg-control0 --label io.sup2api.ccgateway.control=ccg ccg-control
systemctl disable --now ccgateway-bridge-guard
systemctl mask ccgateway-bridge-guard          # 防止重启主机后两个维护者并存
$DC up -d --no-deps guard
```

**预期停机：** 模型请求不受影响。旧服务停止时不清空链，规则一直留在内核里。guard 启动后先全量计算再写入，并且不能在启动时清空链（§10 C 的要求）。从停旧服务到 guard 首次写入约 5 秒，这期间新起的账号容器不会被放行，所以要避开正在新建或原地更新的时段。

**观察指标：**

- `docker logs ccg-guard`：首轮规则数为 11 个账号、22 条；随后应有 `controller_unguarded` 告警（控制器还不是 guard 建的），这是 S1 到 S4 之间的**预期告警**。
- 再次执行 `iptables -S CCG-PROXY-BRIDGE` 并对比，内容相同。
- `iptables -S DOCKER-USER`：有 `CCG-PROXY-BRIDGE` 和 `CCG-CONTROL-FWD` 两个跳转，各只有一条。
- `iptables -S INPUT`：有 `CCG-CONTROL-IN` 和 `-i lo -d 172.29.255.1 --dport 8790 -j DROP`。
- `ss -ltnp | grep 8790`：只监听 `172.29.255.1`。
- 宿主机执行 `curl -m3 http://172.29.255.1:8790/v1/health`，必须失败（负面检查提前做）。
- CPU：`docker stats --no-stream ccg-guard`，加上 cgroup 的 `cpu.stat usage_usec` 10 分钟差值。
- 控制台测试 21、51–59 返回 200。
- **【批准 A1 附带，可选】** 事件跟随测试：`docker restart ccg-50-app`。50 号是已知 401 的账号，重启不影响业务。要求 1 秒内重算，规则仍是 22 条，50 号的 veth 已更新。

**成功判据：** 规则逐条一致；24 小时内控制台测试和真实流量的成功率与前一天相当；guard 平均 CPU 低于单核 2%；没有 `bridge_guard_error` 类的事件。

**回滚**（约 1 分钟，模型请求不受影响）：

```sh
$DC rm -sf guard
systemctl unmask ccgateway-bridge-guard && systemctl enable --now ccgateway-bridge-guard   # 3 秒内重写 CCG-PROXY-BRIDGE
iptables -D DOCKER-USER <CCG-CONTROL-FWD 的跳转规则>; iptables -F CCG-CONTROL-FWD; iptables -X CCG-CONTROL-FWD
iptables -D INPUT <CCG-CONTROL-IN 跳转>; iptables -D INPUT -i lo -d 172.29.255.1 -p tcp --dport 8790 -j DROP
iptables -F CCG-CONTROL-IN; iptables -X CCG-CONTROL-IN
docker network rm ccg-control      # 可选
```

具体规则用 `iptables -S | grep -n CCG-CONTROL` 取出原文，再改成 `-D` 删除。C 应当提供 `ccgateway-guard print-cleanup`，直接输出这些命令。

### S2 核心 0.1.227

**前置检查：**

- 核心 manifest 的 Host API 为 8，与外壳一致。
- `builtin/` 里的 ccgateway 仍是 0.1.118 包。
- 没有新的迁移（`ls server/internal/migrations | tail` 与 0.1.226 相同）。
- schema 契约 hash 不变。

**命令：** 照 `stage/0.1.227/{build.sh,release.sh}`，复制 0.1.226 的流程，再执行 `upgrade_observe.py`。**【批准 A2】** 遇到 "waiting for fresh follower observations" 暂停时，直接执行 `sub2api-shell resume -id <计划>`。

**预期停机：** 与 0.1.226 相同（计划约 50 秒，没有暂停）。控制器不受影响。

**观察指标：**

- 两节点 `sub2api version` 为 0.1.227，readyz 返回 200。
- `GET /system/ccgateway/runtime`（controller 模式）：`installed` 与之前相同，`bundled.version=0.1.118`。
- 控制台测试 21、51–59 返回 200。

**成功判据：** 以上全部满足，1 小时内没有新的 ccgateway 错误类型。

**回滚：** 外壳回滚到 0.1.226。schema 不变，计划允许回滚。

### S3 插件 ccgateway 0.1.119

**前置检查：**

- 两节点都是 0.1.227。
- 插件包用 `sup2api-plugins-2026` 签名、验签通过。
- `images.json`：controller 带 `guard-api=1`，四个角色齐全。

**命令（【批准 A3】）：** `stage/ccgateway-0.1.119/rollout.py` 按 `upload` → `review` → `upgrade` → `testall` 的顺序执行。**不执行** `bundled-roles`、`bundled`、`paired`。

**把 Go 控制器镜像放到主机上（【批准 A4】，低风险，只加载镜像）：**

```sh
PKG=<ovh 上 0.1.119 包的路径>
mkdir -m 700 /tmp/ccg119 && cd /tmp/ccg119 && unzip -q "$PKG" images/images.json images/controller.tar.gz
# 核对 sha256 与 images.json 一致后：
docker load -i images/controller.tar.gz
docker image inspect --format '{{index .Config.Labels "io.sup2api.ccgateway.guard-api"}} {{.Id}}' ccgateway-controller:0.1.119
```

**预期停机：** 每个节点重启插件进程，有几秒请求失败，与以往插件升级相同。

**观察指标：**

- `rollout.py testall`：21、51–59 返回 200，50 返回 401。
- 运行环境页 `up_to_date=false`。这是预期的，按 §3.6 发通知。

**回滚：** `rollout.py` 回到 0.1.118 包（`upgrade` 指向旧包）。主机上已加载的 Go 镜像可以留着。

### S4 接管（adopt）

**前置检查（只读）：**

- S1–S3 都已完成并观察至少 24 小时。
- 在低峰窗口执行（北京时间 04:00–06:00）。
- 控制器：`/health` 显示 0.1.118，`features` 里没有 `guard-api-v1`。
- `docker ps -a --filter name=ccg-controller-upgrade`：如果存在，先 `docker rm` 掉（§3.5 的残留）。
- `ls -la /opt/ccgateway-runtime/uploads`：为空，或只有 1 小时前的残留。
- 没有正在进行的 bundled、paired 或账号授权。
- 当天重做一次 S0 第 5 步的备份。
- 记录接管前所有 `ccg-*-app` 容器的 ID 和 StartedAt：

  ```sh
  docker ps --filter label=io.sup2api.ccgateway.account --format '{{.ID}} {{.Names}} {{.Status}}' > /tmp/ccg-before.txt
  ```

**命令：**

```sh
# 1) 准备要执行的脚本：黄金文件 → 真实引用
APP=$(sed -n 's/^CCG_APP_IMAGE=//p' /opt/ccgateway-runtime.env)      # 保持现值，不改 Worker 目标
EGRESS=$(sed -n 's/^CCG_EGRESS_IMAGE=//p' /opt/ccgateway-runtime.env)
sed -e "s|placeholder-app:0|$APP|" -e "s|placeholder-egress:0|$EGRESS|" \
    -e "s|placeholder-controller:0|ccgateway-controller:0.1.119|" -e "s|placeholder-guard:0|ccgateway-guard:<ver>|" \
    <C0>/…/testdata/compose-install.golden.sh > /root/ccg-adopt.sh
# workloadOptional=true 渲染（控制面板安装语义），app/egress 已在本地
# 2) stdin：现有环境文件只改控制器镜像一行（保留手工加的 CCG_XRAY_IMAGE 等）
sed 's|^CCG_CONTROLLER_IMAGE=.*|CCG_CONTROLLER_IMAGE=ccgateway-controller:0.1.119|' /opt/ccgateway-runtime.env > /root/ccg-env.new
chmod 600 /root/ccg-env.new
```

**【批准 A5】执行：**

```sh
sh /root/ccg-adopt.sh < /root/ccg-env.new 2>/dev/null | tail -n 1      # 期望 CCG_RESULT=started
KEY=$(sed -n 's/^CCG_CONTROLLER_KEY=//p' /opt/ccgateway-runtime.env)
for i in $(seq 30); do
  curl -s -m3 -H "Authorization: Bearer $KEY" http://127.0.0.1:8787/health | grep -q '"controller_image": *"ccgateway-controller:0.1.119"' && break
  sleep 2
done
```

为缩短决策时间，A5 同时请用户**预先批准**一条规则：60 秒内 `/health` 不正常，或者第一轮控制台测试有 2 个以上账号失败，就立即执行 `sh compose-rollback.golden.sh 2>/dev/null | tail -n 1`（期望 `restored`），事后再汇报。

**finish 暂不执行。** prev（Python 容器）保留到 S5 验收完成（A7），这样回滚只需一条脚本。

**预期停机：** 15–40 秒，由三部分组成：

- Python 停止，最多 10 秒；
- 搬迁（rename，可忽略）和 compose 起容器，几秒；
- Go 控制器 recover 和账号就绪。

这期间核心对新请求返回 503 `runtime not ready`，客户端会重试；进行中的隧道（长流）断开。与 0.1.118 发布时控制器自升级的窗口相同。

**观察指标：**

- `/health` 的 `features` 含 `guard-api-v1`；`docker logs ccg-guard` 里不再有 `controller_unguarded`。
- `docker inspect ccg-controller`：`NetworkMode=ccg-control`，IP 为 `.2`，`Mounts` 只有 `/opt/ccgateway-controller → /data`，`CapDrop=[ALL]`，`ReadonlyRootfs=true`，`Privileged=false`，带 compose 项目标签。
- **账号容器一个都没有被重建**：与 `/tmp/ccg-before.txt` 对比，ID 相同，StartedAt 没变。
- `/opt/ccgateway-controller/.adopted` 的清单与 §2.6 一致；`/opt/ccgateway-runtime` 下只剩挂载源、`shared-egress` 的五个文件和历史目录。
- `iptables -S CCG-CONTROL-FWD`：对每个就绪账号有两条规则。
- 控制台测试 21、51–59 返回 200，50 返回 401。
- 核心日志：窗口之后不再有 `runtime not ready`。

**成功判据：** 以上全部满足，30 分钟内真实流量成功率回到基线。

**回滚：** 见第 5 节。

### S5 验收

按第 6 节逐项执行。需要改动线上状态的项目集中在 **【批准 A6】**：

- 新建一个草稿账号，随后删除；
- 推送内置 egress 和 app（0.1.119），执行 paired；
- 上传 r2 镜像，往返两次自升级。

全部通过后 **【批准 A7】** 执行 finish：

```sh
sh compose-finish.golden.sh 2>/dev/null | tail -n 1     # done：删除 Python prev 容器、.env.prev、.transition
```

之后回到 Python 就只能走 release 手册（§5.3）。

### 观察期（7 天）

每天核对一次：

- `docker ps` 中 `ccg-guard` 和 `ccg-controller` 都是 Up，RestartCount 为 0；
- guard 日志里没有失败关闭类事件；
- `CCG-PROXY-BRIDGE` 的规则数等于就绪账号数 × 2；
- 控制台测试 21、51–59 返回 200；
- ccgateway 的 5xx 比例与基线相比；
- guard 的平均 CPU。

观察期内**不执行**：S6、删除 bridge guard 文件、删除 Python 0.1.118 镜像、删除历史目录、在 CI 中去掉 Python 测试。

### S6 网关纳入 compose（独立维护窗口）

**前置检查：**

- 观察期结束。
- 低峰窗口。
- 记录 `docker inspect ccg-shared-egress`：镜像、uplink IP、在各账号网络上的地址、sysctl、cap、挂载、标签。
- C 已实现"网关由 compose 管理"的模式：S6 之后 guard 的 `PUT /v1/gateway` 遇到 compose 管理的网关返回 409；网关不存在时只能执行 `up -d --no-deps egress`，不能再自己按 Docker API 创建。
- 控制器 recover 会按状态里记录的 `gateway_ip`，把网关重新接入每个账号网络。

**命令（【批准 A8】）：**

```sh
# .env 中 CCG_GATEWAY_IMAGE 保持现网镜像（sha256:92305b5b…），本次不换 Xray 版本
$DC --profile egress config -q
docker stop ccg-shared-egress && docker rename ccg-shared-egress ccg-shared-egress-legacy
$DC --profile egress up -d --no-deps egress
# 等控制器 recover：/accounts/<key>/egress 的 ready 逐个变为 true
```

**预期停机：** 所有账号出网中断 10–60 秒（网关停止到 recover 完成）。0.1.118 隔离实验中，新网关 3.3 秒就绪；11 个账号逐个重新接入。

**观察指标：**

- 每个账号 egress `ready=true`。
- `CCG-PROXY-BRIDGE` 重算后仍是 22 条（对端 veth 换了）。
- 控制台测试全部返回 200。
- 网关的 `/config` 只读，并且看不到 `state.json`（S4 之后就已经看不到）。

**回滚：**

```sh
$DC --profile egress rm -sf egress
docker rename ccg-shared-egress-legacy ccg-shared-egress && docker start ccg-shared-egress
```

控制器 recover 会重新接入各账号网络。成功后观察 24 小时，再删除 `-legacy` 容器（A9）。

### 收尾（【批准 A9】）

删除以下内容：

- `controller-before-0.1.115/` 等历史目录，以及各账号的 `worker-backups-before-0.1.114/`（先打包备份）；
- ovh 上的 `/usr/local/libexec/ccgateway-bridge-guard.py` 和 unit 文件（`systemctl unmask` 之后删除）；
- Python 0.1.118 控制器镜像（要保留到确定不再需要回滚为止）；
- `ccg-shared-egress-legacy`；
- 仓库中的 `next/deploy/gateway/ovh/ccgateway-bridge-guard.{py,service}`、`test_ccgateway_bridge_guard.py`，以及 Python 控制器的源码和 CI 步骤。这一步单独提交。

---

## 5. 回滚矩阵

### 5.1 各阶段失败

| 失败发生在 | 现象举例 | 操作 | 停机 | 结果 |
|---|---|---|---|---|
| S1 对比 | `diff` 非空 | 不切换，修 guard | 0 | 不变 |
| S1 切换后 | 规则缺失、账号不通、guard 崩溃循环 | §S1 的回滚 | 0（规则在内核里）；若 guard 写错规则，到旧服务重写前会有几秒不通 | bridge guard 恢复 |
| S2 | 核心问题 | 外壳回滚到 0.1.226 | 与发布相同 | 0.1.226 |
| S3 | 插件问题 | rollout 回 0.1.118 包 | 几秒 | 0.1.118 |
| S4 脚本内部 | `CCG_RESULT` 不是 `started` | 脚本已自行恢复（搬回数据、Python 改回原名并启动），或者报 `install_failed` 且没有改动；核对 `docker ps` 和 `/health` | 约 15 秒 | Python 0.1.118 + guard |
| S4 健康失败或测试失败 | `/health` 不正常、账号 503、出现重建 | `compose-rollback.golden.sh`（期望 `restored`） | 约 15 秒 | Python 0.1.118 + guard |
| S4 回滚报 `restore_failed` | 搬回时冲突 | 按 `.adopted` 清单手工处理，再按 §5.3 第 3 步用 `docker run` 起 Python | 数分钟 | Python 0.1.118 |
| S5（finish 之前） | 任何验收项失败且无法当场修复 | 同"S4 健康失败" | 约 15 秒 | Python 0.1.118 + guard |
| S5 之后、观察期内 | 线上发现问题 | §5.3 release 手册 | 约 20 秒 | Python 0.1.118，可选恢复旧 bridge guard |
| S6 | 网关接不回、账号出网失败 | §S6 的回滚 | 10–60 秒 | docker-py 网关 |

"Python 0.1.118 + guard"这个组合可以长期运行：guard 只维护网桥规则，API 闲置。这就是 S1–S3 期间的状态。如果怀疑 guard 本身有问题，再执行 S1 的回滚换回 bridge guard。

### 5.2 跨阶段的组合

- **核心回滚（0.1.227 → 0.1.226）不影响控制器。** ovh 是 controller 模式，不跑安装脚本。0.1.226 的安装脚本（旧路径）在已接管的主机上没有 `legacy_blocked` 保护，所以**核心回到 0.1.226 期间，绝不能经 SSH 在 ovh 上"安装控制器"**。这条写进部署记录。
- **插件回滚（0.1.119 → 0.1.118）要在控制器回滚之后进行。** 否则内置控制器变成 Python 镜像，而线上是 Go 控制器：
  - 有人点"一键升级"时，guard 拒绝不带 `guard-api` 的镜像（403），核心报失败，没有危害；
  - 但控制台会一直显示"不是最新"。

  正确顺序：先 release 控制器，再回滚插件。

### 5.3 release 手册：任何时候回到 Python 0.1.118

适用于 finish 之后，或者脚本回滚不可用的情况。每一步都需要用户批准。

1. 冻结变更：通知不要做账号改动；确认没有进行中的 bundled、paired 和授权。
2. `$DC rm -sf controller`。从这一刻起控制器不可用。
3. 执行 `release` 函数，取自 `compose-rollback.golden.sh` 的同名函数，可以单独提取成 `release.sh`。它按 `.adopted` 和 `$DATA/<key>/` 搬回，`shared-egress-state.json` 搬回 `shared-egress/state.json`，最后删除 `.adopted`。
4. 用 0.1.226 的原参数起 Python 控制器：

   ```sh
   CTL=<0.1.118 控制器镜像，ID 7a72fd3424e9 的 ref>
   sed -i "s|^CCG_CONTROLLER_IMAGE=.*|CCG_CONTROLLER_IMAGE=$CTL|" /opt/ccgateway-runtime.env
   docker run -d --name ccg-controller --restart unless-stopped --network host \
     --env-file /opt/ccgateway-runtime.env -v /var/run/docker.sock:/var/run/docker.sock \
     -v /opt/ccgateway-runtime:/opt/ccgateway-runtime --log-opt max-size=20m --log-opt max-file=3 "$CTL"
   ```

5. 等 `/health` 返回 0.1.118，执行控制台测试。
6. 按需执行以下一项或两项：
   - **只回控制器：** guard 保持运行。
   - **全回：** `$DC rm -sf guard`，再执行 S1 回滚里的 `systemctl unmask/enable --now ccgateway-bridge-guard` 和链清理。

   协调稿写的是"compose down controller 和 guard"。这里改用 `rm -sf <服务名>`：S6 之后不带服务名的 `down` 会删掉网关。
7. 插件 rollout 回 0.1.118（§5.2）。

停机：第 2 步到第 5 步约 20 秒。账号容器和网关全程不重建，因为 Go 控制器经 guard 建的账号容器，参数和标签与 Python 建的相同（§5.4）。

### 5.4 状态文件兼容性（对 B 的硬性要求）

| 方向 | 要求 | 验证 |
|---|---|---|
| Python → Go（接管） | Go 能读 0.1.118 写的全部文件：`runtime.json`（含 `env` 字段的语义：只有当前环境变量与记录一致时才用它覆盖）、`<key>/state.json`、`egress-desired.json`、`shared-egress-state.json`（即原 `shared-egress/state.json`）、`worker-backups/`、`cli-backups/` 的目录结构 | 隔离实例接管；用 ovh 脱敏后的真实状态做夹具测试 |
| **账号容器不重建** | Go 计算的凭据指纹、网络策略标签（`NETWORK_LABEL`）、`auth` 和 `image` 标签，与 Python 的计算结果逐字相同；recover 的判断与 Python 一致 | S4 的 ID 对比，隔离实例的 ID 对比 |
| Go → Python（回滚） | 观察期内 Go 写出的文件 Python 0.1.118 能直接读：<br>- 路径布局相同，只有 `shared-egress-state.json` 由 release 搬回；<br>- 字段名和类型相同；<br>- **往返时保留不认识的字段**（Go 用 `map` 或 `json.RawMessage` 收集多余的键，原样写回）；<br>- 新字段只能是可选的；<br>- 不删除 Python 会读的字段（包括 `egress_backend: shared_xray`，继续写）；<br>- 文件权限 0600、目录 0700，原子写 | `companions/contracts/testdata/state/` 放 Go 生成的样例，由 Python 0.1.118 的测试加载并断言，在 CI 中运行（所以 Python 测试保留到观察期结束）；隔离实例做 Go → Python 的 release 往返 |
| 资源 | Go 经 guard 建的账号容器、网络、数据卷，名字、标签和挂载与 Python 建的相同，Python 能接手 | 隔离实例：Go 新建一个账号 → release → Python 能 provision、能删除 |

---

## 6. 验收清单

除注明外，以下都在生产环境执行（S5）。标"隔离"的只在 §7 的隔离实例里执行。

### 6.1 功能

| 项 | 怎么做 | 判据 |
|---|---|---|
| 新建账号 | 生产：在控制台新建一个草稿账号，不授权 | guard 依次完成：建网络、数据卷、准备卷任务、防火墙辅助、app、网关接入；控制台显示运行环境就绪；`CCG-CONTROL-FWD` 多出 2 条规则 |
| 删除和清理 | 生产：删除上面的草稿；`GET /runtime/cleanup` 盘点（只读）。隔离：完整的 cleanup 清除孤儿 | 资源删除；网关断开；规则减少；盘点里没有残留 |
| 改代理 | 隔离：给测试账号换代理（`shared_proxy_fixture.py`） | 网关不重启，新连接走新出站，`dns.json`、`active.nft` 由 guard 写入 |
| 改网络池 | 隔离 | 网关先离开旧网络、再接入新网络；app 重建、数据卷保留；旧网络删除（与 0.1.118 的隔离测试相同） |
| 阻断和恢复 | 隔离：让账号处于阻断状态（例如代理缺失时 fail-closed），再恢复 | 阻断期间请求失败、规则仍然失败关闭；恢复后 200 |
| 原地更新 Worker | 生产：S5 中 `rollout.py bundled-roles egress,app` 之后的 app 推送 | 各账号 Worker 程序被替换，容器 ID 不变，`/healthz` 显示新版本；23 号 `not_found` 是已知现象 |
| Worker 与 CLI 成对激活 | 生产：`rollout.py paired`（CLI 版本不变的成对更新） | 结果与 0.1.118 时一致（updated 和 not_running 的分布相同） |
| 上传镜像 | 生产：控制台上传 `ccgateway-controller:0.1.119-r2`（同一源码，只是另打一个标签） | 分块上传 → guard 导入（标签在白名单内）→ 返回 `{id, tags}` |
| 目标镜像 | 生产：bundled egress（`PUT /runtime/images` egress） | 拒绝不带 `shared-egress=1` 的镜像；现网关**不重建** |
| 控制器自升级 | 生产：启用上传的 r2 → guard 改 `.env` 并执行 `up -d --no-deps controller` → 再执行"推送并启用内置镜像"切回 0.1.119（同时清除覆盖值）。隔离：自升级到一个坏镜像（健康失败） | 两次往返 `/health` 都报告正确的镜像，各约 10 秒；坏镜像会自动恢复，`.env` 回到旧值 |
| 核心重新安装 | 生产：控制台"一键升级"（controller 模式，已是最新时应直接返回 200）。S0 的一次性主机：经 SSH 安装和重装 | 生产没有动作；一次性主机按 §2.4 和 §2.5 的全部分支通过 |

### 6.2 真实流量

- 控制台测试 21、51–59 返回 200。50 号是已知的刷新令牌失效（401），不计入。
- 接管后 24 小时：clicodeplus 和 ovh 两个入口的真实 ccgateway 请求成功率不低于前 7 天的均值；没有新的错误类型。

### 6.3 安全负面检查

做法：生产的 Go 控制器镜像里没有 shell，用临时容器 `docker run --rm --network container:ccg-controller curlimages/curl:<固定版本>` 共享控制器的网络命名空间。这样流量的来源 IP 和入接口与控制器完全相同。

| 检查 | 命令要点 | 期望 |
|---|---|---|
| 控制器连不到宿主机上只监听 127.0.0.1 的服务 | `curl -m3 http://172.29.255.1:3130/`、`:8010`、`:8795`、`:6379` | 全部超时或被拒绝 |
| 控制器连不到宿主机的公网端口 | `curl -m3 https://<ovh 公网 IP>/`、`http://172.17.0.1:3130/` | 失败 |
| 控制器连不到外网 | `curl -m3 https://1.1.1.1/`；用 `nslookup example.com` 对照 | HTTPS 失败；DNS 成功 |
| 控制器只能连到 Worker 的 8787 | `curl app_ip:8787/healthz` 通；`curl app_ip:22`、其他容器 IP 不通 | 符合 |
| 宿主机进程连不到 guard | 在宿主机上执行 `curl -m3 http://172.29.255.1:8790/v1/health` | 失败（`lo` 上的 DROP） |
| 其他容器连不到 guard | `docker run --rm alpine wget -T3 -qO- http://172.29.255.1:8790/v1/health` | 失败 |
| 令牌或来源不对 | 在控制器网络命名空间里用错误令牌访问 | 401 |
| 导入带 `caddy:latest` 标签的归档被拒 | **隔离实例**：busybox 改标签成 `caddy:latest` 后 `docker save`，经隔离控制器的上传接口导入。**生产**：改用一个主机上不存在的非白名单名字 `ccgw-negtest/caddy:latest` 走控制台上传 | 隔离和生产都返回 400 `load_forbidden`；`docker image inspect caddy:latest` 的 ID 不变（生产不用真的 `caddy:latest`，以免检查本身有缺陷时改写现有标签） |
| 符号链接挂载源被拒 | 隔离：以 root 把测试账号的 `resolv.conf` 换成指向 `/etc/hostname` 的符号链接，再经控制器触发重启 | guard 返回 403，容器不动；把文件恢复后可以正常重启 |
| 账号容器仍然无法直连外网 | 生产：`docker exec ccg-21-app node -e` 不经代理直接连 `1.1.1.1:443` | 失败；经网关的正常请求返回 200 |
| 控制器容器的形态 | `docker inspect ccg-controller` | 没有 `docker.sock`；不是 host 网络；`CapDrop=ALL`；只读根文件系统；只挂一个目录 |
| 网关读不到凭证 | `docker exec ccg-shared-egress ls /config` | 没有 `state.json` |
| 令牌不外泄 | 核心的 `GET /system/ccgateway/runtime`、guard 日志、核心日志 | 都不含令牌 |

### 6.4 性能

| 指标 | 方法 | 判据 |
|---|---|---|
| 网桥规则维护的 CPU | 与 S0 基线对比：cgroup `cpu.stat` 10 分钟差值 | 平均值从约 23% 单核降到 2% 以下；事件突发时的峰值不计 |
| 就绪检查耗时 | 与 S0 相同的 200 次 `/connection` 和隧道握手 | p50 不比基线差；p95 不超过基线加 10 ms。不达标时由 C 按事件缓存容器状态（设计稿 §11） |
| 首 token | 核心请求日志 24 小时的分位数对比 | 差异在日常波动范围内 |
| `iptables-restore` 次数 | guard 指标或日志 | 只在规则变化时执行（不再是每 3 秒一次） |

---

## 7. ovh 隔离测试实例

目标：在生产主机上跑一套完整的 guard、控制器和网关，**不碰前缀为 `ccg` 的任何资源、链、目录或端口**。所有值都靠 §2.3 模板的变量覆盖，模板文件与生产是同一份。

| 项 | 值 |
|---|---|
| compose 项目和目录 | `-p ccgateway-gt`，`/opt/ccgateway-gt/{compose.yml,.env}`（0700/0600） |
| 前缀 | `CCG_PREFIX=ccg-gt`；控制器环境 `CCG_RUNTIME_PREFIX=ccg-gt`、`CCG_CONTROLLER_NAME=ccg-gt-controller` |
| 控制网 | `CCG_CONTROL_NETWORK=ccg-gt-control`，`172.29.255.8/29`，网桥 `ccg-gt-ctl0` |
| guard | `CCG_GUARD_ADDR=172.29.255.9`，端口 8790；容器 `ccg-gt-guard` |
| 控制器 | `CCG_CONTROLLER_IP=172.29.255.10`，`CCG_CONTROLLER_PUBLISH=18787`（映射 `127.0.0.1:18787`） |
| 链 | `CCG_CHAIN_PREFIX=CCG-GT` → `CCG-GT-PROXY-BRIDGE`、`CCG-GT-CONTROL-FWD`、`CCG-GT-CONTROL-IN`（都不超过 28 个字符） |
| 目录 | 挂载源 `/opt/ccgateway-gt-runtime`；控制器数据 `/opt/ccgateway-gt-controller`；环境文件 `/opt/ccgateway-gt-runtime.env`（单独生成的 `CCG_CONTROLLER_KEY`）；guard 状态 `/var/lib/ccgateway-gt-guard` |
| 令牌 | 单独随机生成，写在 `/opt/ccgateway-gt/.env` |
| 网关 | `ccg-gt-shared-egress`，uplink `ccg-gt-d0000000000000000-xray-uplink`，镜像为插件包的 0.1.119 egress |
| 测试账号 | `d00000000000a0001`、`d00000000000a0002`、`d00000000000a0003`，都是合成的 key。凭据用假值，上游用"离线端到端"做法的假上游；代理用 `shared_proxy_fixture.py`。**不复制任何真实账号的 OAuth 凭据**：刷新令牌会轮换，复制会让生产账号失效 |
| 驱动方式 | 不接核心。用 ovh 上的 python3 脚本（基于 `shared_integration.py` 和 `shared_failure_test.py`），以管理密钥直接调用 `127.0.0.1:18787` 的控制器 API |

**演练顺序：**

1. **Python 0.1.118 起步。** 以旧方式起 `ccg-gt-controller`（host 网络，`127.0.0.1:18787`，根目录 `/opt/ccgateway-gt-runtime`），建两个测试账号，制造 §2.6 表里的各类文件。
2. **起 gt guard。** 先执行 `print-rules`，与旧 bridge guard 的 `--prefix ccg-gt --chain CCG-GT-PROXY-BRIDGE --once` 结果对比；再执行 `up guard`。
3. **接管。** 用黄金脚本的 gt 变体：只替换路径和前缀常量，用 `diff` 证明除这些常量外与黄金文件一致。核对账号容器不重建。
4. 执行 §6.1 全部功能项和 §6.3 全部负面检查，**包括 `caddy:latest` 和符号链接两项**。
5. **自升级。** 先升到 r2，再升到坏镜像（自动恢复）。
6. **release。** 回到 Python 0.1.118，确认它能读 Go 写的状态，能管理 Go 新建的第三个账号；然后再接管一次。
7. **S6 演练。** gt 网关纳入 compose 并重建，测量中断时长。
8. **性能。** gt guard 的 CPU；就绪耗时与 gt 下的 Python 对比。

**清理（每次演练后都执行，并写入记录）：**

```sh
docker compose -p ccgateway-gt --project-directory /opt/ccgateway-gt --profile egress rm -sf
docker rm -f $(docker ps -aq --filter name='^ccg-gt-') 2>/dev/null
docker network rm $(docker network ls -q --filter name='^ccg-gt-') 2>/dev/null
docker volume rm $(docker volume ls -q --filter name='^ccg-gt-') 2>/dev/null
# 链：先删跳转（DOCKER-USER、INPUT 中带 CCG-GT 的规则，用 iptables -S 取原文改 -D），再 -F/-X 三条链
# 以及 INPUT 里的 -i lo -d 172.29.255.9 --dport 8790 -j DROP
rm -rf /opt/ccgateway-gt /opt/ccgateway-gt-runtime /opt/ccgateway-gt-controller /opt/ccgateway-gt-runtime.env /var/lib/ccgateway-gt-guard
```

清理后核对：

- `docker ps -a`、`docker network ls`、`docker volume ls` 中都没有 `ccg-gt-` 开头的资源；
- `iptables -S | grep -c CCG-GT` 为 0；
- 生产的 `CCG-PROXY-BRIDGE` 规则数不变。

测试镜像（`ccgateway-*:0.1.119-r2`、坏镜像、`caddy:latest` 测试归档）在演练后删除；**不删除**主机上原有的 `caddy` 镜像。

---

## 8. 部署记录、CONTRACTS、内存说明

### 8.1 部署记录模板（追加到 `next/deploy/gateway/ovh/README.md` 顶部，与现有条目同一体例）

```markdown
2026-11-xx 宿主服务 **ccgateway guard**（`<C0>`，镜像 `ccgateway-guard:<ver>` ID `<…>`，北京时间 hh:mm）替换 systemd `ccgateway-bridge-guard`：
- compose 项目 `ccgateway`（`/opt/ccgateway/{compose.yml,.env}`，0600），控制网 `ccg-control` 172.29.255.0/29（`ccg-control0`），guard 监听 172.29.255.1:8790。
- 替换前 `print-rules` 与内核现行 `CCG-PROXY-BRIDGE` 一致（N 条，M 个账号）；旧服务 disable + mask，文件保留在 `/usr/local/libexec/` 供回滚。
- CPU：旧 ≈23% 单核 → 新 x%（10 分钟 cgroup 差值）。事件跟随：`docker restart ccg-50-app` 后 y ms 重算。
- 预期告警 `controller_unguarded` 持续到接管。
- 备份 `backups/ccgateway-guard/`（`runtime-root.tgz` <sha>、`iptables-before.txt`）。

2026-11-xx 核心 **0.1.227**（`<C0>`，manifest `<…>`，计划 `<id>` completed/N，T 秒，无迁移，Host API 8 不变）：安装脚本按控制器镜像标签 `io.sup2api.ccgateway.guard-api` 选择 docker run 或 compose（CONTRACTS §76）；内置 ccgateway 仍为 0.1.118。核心回到 0.1.226 期间不得经 SSH 在 ovh 安装控制器。

2026-11-xx 插件 **ccgateway 0.1.119**（`<C0>`，包 `<sha>`，rollout N）：Go 控制器（`ccgateway-controller:0.1.119` ID `<…>`，labels guard-api=1 / shared-egress=1）；只做 upload/review/upgrade/testall，未推送 bundled。

2026-11-xx **接管**（北京时间 hh:mm:ss–hh:mm:ss，控制器不可用 N 秒）：
- 执行 `compose-install.golden.sh`（`<C0>`）渲染版，结果 `started`；`.adopted` 清单 K 项；历史目录 `controller-before-0.1.115/` 等留在原处。
- 账号容器 ID 全部未变（附对比）；`/health` 0.1.119 + `guard-api-v1`。
- 验收（第 6 节）：功能 …；控制台测试 21、51–59 200，50 401；负面检查 N/N；就绪 p50/p95 前 a/b ms → 后 c/d ms。
- finish 于 hh:mm 执行（Python prev 容器已删）。回滚：release 手册（`next/docs/ccgateway-guard/04-migration-rollout.md` §5.3）。
- 脚本 `stage/ccgateway-guard/`，备份 `backups/ccgateway-guard/`。

2026-11-xx **网关纳入 compose**（维护窗口，出网中断 N 秒）：…
```

### 8.2 CONTRACTS 要更新的章节

| 章节 | 改动 |
|---|---|
| **新增 §76 CCGateway guard 与 compose 部署** | 拓扑；compose 项目、文件、权限；`.env` 的四个变量及其唯一来源；安装路径选择规则；三个脚本的语义与结果码（`compose_unavailable`、`guard_unavailable`、`legacy_blocked` 等）；数据根拆分与 adopt/release 表；guard API 契约（引用 C 的文档）；自升级由 guard 执行；guard 不进插件包、只有显式安装才更新；网关纳入 compose 的维护规则；"不带服务名不得 up 或 down" |
| §49.16 | 镜像增加 `guard`（`images.guard`）；安装脚本分两条路径，旧路径不变；新结果码；"一键升级"在 controller 模式下仍走自升级 |
| §53.3、§53.9 | 安装的前置条件：compose 路径需要 `docker compose` v2（本机模式要求核心环境里也有）；安装会创建 compose 项目和 `ccg-control` 网络 |
| §53.5 | 控制器自升级改由 guard 执行（`upgrade.py` 和辅助容器删除）；健康地址；`features` 增加 `guard-api-v1`；Python 控制器遇到 Go 镜像的行为（§3.5） |
| §53.10 | `images.json` 可选的 `labels` 字段（如实现 §2.9）；插件 `hostCompat >= 0.1.227`；构建脚本校验控制器标签；guard 不是包内角色 |
| §57 | 网关参数由 guard 写死；控制器状态移到 `/data/shared-egress-state.json`，网关读不到；网关重建只能经 compose 维护操作（S6 之后） |

### 8.3 内存说明（由主控在上线后写入）

- 新增 `ccgateway-guard-compose.md`，包括：
  - 拓扑和 compose 项目；
  - 线上版本（核心 0.1.227、插件 0.1.119、guard `<ver>`）；
  - 不带服务名不得 `up` 或 `down`；
  - release 手册的位置；
  - 隔离实例的参数；
  - `controller_unguarded` 的含义；
  - 观察期截止日。
- 在 `MEMORY.md` 索引中加一行。
- 更新 `ccgateway-request-path-and-isolation.md`：控制器不再是 host 网络，也没有 `docker.sock`；控制器到 Worker 的路径经 `CCG-CONTROL-FWD`。
- 更新 `egress-shared-xray-migration.md`：网关是否已纳入 compose（S6 的状态）。
- 更新 `pending-release-0172.md` 一类的发布状态条目，或者在新文件里给出线上版本。

---

## 9. 风险登记与时间

### 9.1 风险登记

| # | 风险 | 可能性 | 影响 | 应对 |
|---|---|---|---|---|
| R1 | Go 控制器与 Python 的指纹、标签或状态解读不一致，接管后重建全部账号容器或丢失状态 | 中 | 高：所有账号中断，可能需要重新授权 | §5.4 的契约测试；隔离实例往返；S4 对比容器 ID，发现重建立即回滚 |
| R2 | guard 容器里的 iptables 后端不是 nf_tables，或 `nsenter` 被 seccomp/AppArmor 拦住，导致规则写到别的表或失败关闭 | 中 | 高：所有账号断网 | S0 核对镜像内 `iptables -V`；隔离实例先跑；S1 先 `print-rules` 对比；guard 启动时不清空链 |
| R3 | 两个规则维护者并存（bridge guard 被 systemd 拉起，或 gt 链名冲突），规则来回抖动 | 低 | 高 | `systemctl mask`；compose 路径检查 `bridge_guard_active`；gt 用独立链名，清理后核对 |
| R4 | 误执行不带服务名的 `compose up` 或 `down`，重建或删除网关 | 中（人为） | 高：所有账号出网中断 | 文档、记录、内存三处写明；S6 之前网关不在 compose 里；脚本只用 `--no-deps <服务名>` |
| R5 | 搬迁中断或跨文件系统，数据分裂；release 冲突 | 低 | 中 | 同一设备检查；`mv` 原子；`.adopted` 清单；冲突即停；有备份 |
| R6 | 端口映射后 Caddy 连不上 `127.0.0.1:8787`（userland-proxy 被关闭等） | 低 | 高：核心连不上控制器 | S0 核对 `daemon.json`；隔离实例用 18787 验证同一路径 |
| R7 | 每次请求的就绪检查经 guard 变慢 | 中 | 中：首 token 变慢 | 合并为一次调用；S0 和 S5 对比；不达标就加事件缓存，暂停推进 |
| R8 | 接管窗口里长流断开、新请求 503 | 高（必然） | 低到中 | 低峰执行；15–40 秒；与以往自升级的窗口相同 |
| R9 | guard 镜像分发（GHCR 私有）；新主机按默认 digest 拉不到，安装失败 | 中 | 低（只影响新主机） | ovh 本地构建；`images.guard` 覆盖值；由用户决定是否公开 guard 包 |
| R10 | 接管前有人点"一键升级"或"推送内置镜像" | 中 | 低：失败无害，日志噪声 | 通知；镜像没有 python；可选的 `controller_adopt_required` |
| R11 | 主机 compose 与 guard 镜像内 compose 的版本不同，config-hash 不同，显式安装时意外重建控制器 | 中 | 低：一次约 10 秒的重建 | guard 镜像里的 compose 版本固定为与 ovh 相同；只在显式安装或升级时出现 |
| R12 | 控制台重装会重写环境文件，丢掉手工加的行（如 `CCG_XRAY_IMAGE`） | 低 | 中：之后新建的网关会用新镜像 | 现有行为；S4 手工接管保留原文件；在 §76 里记录 |
| R13 | guard 成为单点：guard 挂掉时无法做配置变更 | 低 | 中 | 数据路径不经过 guard；`restart: unless-stopped`；内核规则保留 |
| R14 | 控制器在 `ccg-control` 上解析代理域名失败（内置 DNS 转发被 `CCG-CONTROL-FWD` 拦截） | 低 | 中：改代理失败 | 隔离实例实测；负面检查里对照 `nslookup` |

### 9.2 时间估计（只算上线部分；开发和测试另计）

| 项 | 实际操作时间 | 日历 |
|---|---|---|
| S0：一次性主机演练（三轮）、隔离实例全量演练、备份、基线 | 1–1.5 天 | 第 1–2 天 |
| S1 切换和观察 | 0.5 小时 + 24 小时观察 | 第 3 天 |
| S2 核心 | 1 小时 | 第 3 或第 4 天 |
| S3 插件和镜像加载 | 1 小时 | 第 4 天 |
| S4 接管（低峰） | 1 小时窗口（停机 15–40 秒）+ 2 小时观察 | 第 5 天 |
| S5 验收和 finish | 0.5 天 | 第 5 天 |
| 观察期 | 每天 15 分钟 | 第 5–12 天 |
| S6（可选，独立窗口） | 1 小时（中断 10–60 秒） | 第 12 天之后 |
| 收尾 | 1 小时 | S6 后，或第 13 天 |

总计：操作约 3 天，日历约 2 周。

---

## 10. 对 B、C 的接口要求与待决事项

**对 B（Go 控制器）：** 见 §3.1 和 §5.4。另外两点：

- 读取 `CCG_CONTROLLER_BIND`。
- 控制器的清理逻辑不得把 `ccg-controller-prev`、`ccg-controller-upgrade`、`ccg-guard` 当作孤儿处理（它们都没有账号标签，只需确认这一点）。

**对 C（guard）：**

1. 命令行子命令：`serve`、`ready`（就绪返回 0，供安装脚本轮询）、`print-rules [--chain]`（只计算，不写入）、`print-cleanup`（输出清理链和 INPUT 规则的命令）。
2. **启动时不清空 `CCG-PROXY-BRIDGE`**：先全量计算，再整链替换；只在计算出错时失败关闭。
3. 链名前缀、监听地址、控制器 IP、网桥名、compose 项目名都可以配置（§2.3、§7）；生产默认值与设计稿相同。
4. 控制器自升级的流程：
   1. 改 `/opt/ccgateway/.env` 的 `CCG_CONTROLLER_IMAGE` 一行（原子写，旧值留在 guard 自己的状态里）；
   2. 执行 `docker compose -p ccgateway … up -d --no-deps controller`；
   3. 访问 `http://<控制器IP>:8787/health`（管理密钥从只读挂载的环境文件里取），确认报告的是新镜像；
   4. 失败就恢复 `.env` 并再执行一次 `up`。

   只接受带 `guard-api=1` 的镜像。guard 镜像里的 compose 版本与 ovh 主机相同。
5. **adopt 和 release 不在 guard 里**（§2.6）；guard 不挂载控制器的数据目录。
6. `controller_unguarded` 告警的判断改为：`ccg-controller` 没有 `com.docker.compose.project=ccgateway` 标签。
7. S6 之后的网关模式：遇到 compose 管理的网关，不再用 Docker API 创建或删除，只执行 `up -d --no-deps egress`（网关不存在时）和网络接入。
8. guard 镜像里的 `iptables` 用 nf_tables 后端，启动时自检，不一致就拒绝启动。

**待用户决定：**

1. guard 镜像的分发方式：公开 GHCR 上的 guard 包，还是在 ovh 本地构建（§3.4）。
2. 核心安装脚本的演练环境：一次性 VM，还是 ovh 上的特权 dind 容器（A0）。
3. 是否实现 §2.9 的核心兜底，以及是否给新结果码加控制台文案。
4. S4 的时间窗口，以及是否预先批准"健康失败即回滚"。
5. S6 是否执行，在什么时候执行。
6. 收尾时删除历史目录和 Python 镜像的时间点。
