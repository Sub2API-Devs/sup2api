# CCGateway 环境与操作指南

> **2026-10-09 21:00（北京时间）线上版本，优先于下文：**
> - OVH 外壳镜像 `sup2api-gateway:local` = `sup2api-gateway:d917b8c`（插件包上限 1 GiB、节点间拉包 30 分钟；20:47 起逐节点换，4→3→2→1，每节点约 10 秒）。
> - 核心 v0.1.84（manifest `8d34abdc9cec…`，源码 `84126d3f7`）；ccgateway 插件 0.1.16，包内带四个运行环境镜像（约 425 MB）。v0.1.83（`6f5a6b72…`）因核心与打包工具对 `images.json` 的 `file` 字段格式不一致而认不出包内镜像，已被 .84 取代。
> - 控制器 `ccgateway-controller:0.1.16`、#21/#22 worker = `ccgateway-app:0.1.16` 的程序（`06d0f4f0…`），由"推送并启用内置镜像"完成：控制器自升级、worker 原地替换（容器 ID 不变）、出口代理容器未动。配置里的镜像覆盖值已清空，今后插件升级带来的新镜像自动生效。
> - **核心发布**：`~/sup2api-managed/build-core.sh VERSION`（已加入：按插件版本缓存在 `~/sup2api-managed/ccgateway-images/<版本>/`，缺失时先跑 `build-ccgateway-images.sh`，再以 `REQUIRE_CCGATEWAY_IMAGES=1` 构建；原脚本备份 `build-core.sh.bak-20261009`）→ `sub2api-shell import` → `upgrade_observe.py`。改了 companions（worker/controller/egress）必须升 ccgateway 插件版本，否则复用旧缓存镜像。升级后在部署页点"推送并启用内置镜像"。
>
> **2026-10-09 18:43（北京时间）起：账号运行环境已从 cc-max 迁到 OVH 本机 Docker，优先于下文所有 cc-max 描述：**
> - OVH 上 `ccg-controller`（`ccg-controller:0.1.49`，host 网络，只听 127.0.0.1:8787，运行目录 `/opt/ccgateway-runtime`、环境文件 `/opt/ccgateway-runtime.env`，均 root 0700/0600）。**控制器端点 `https://ccmax.prophey.ai`**（19:45 起）：DNS 在 Cloudflare（仅 DNS，不走代理）A 记录 → `15.204.107.38`；由本机共用的 `caddy` 容器（`/home/debian/caddy/Caddyfile`，host 网络，管 80/443 上的其他站点）新增站点 `ccmax.prophey.ai { reverse_proxy 127.0.0.1:8787 { flush_interval -1 } }`，Let's Encrypt 自动证书；核心配置 `mode: controller`、`ccmax.prophey.ai:443`、不固定证书（系统根证书）。原先的 `ccg-gateway`（18443，Caddy 内置 CA）已删除。注意：OVH 主机的 systemd-resolved 会缓存否定应答，新域名在生效前被查询过时要 `sudo resolvectl flush-caches`，否则核心容器解析不到（19:41 因此回切过一次，约 1 分钟不可用）。
> - #21（`ccg-21-app/-egress`）、#22（`ccg-d1d2964e14bf728d9-app/-egress`）按原配置 1:1 在 OVH 重建：同名、同镜像 ID、同环境变量、同私网 IP 与子网、同标签/挂载/资源限制；容器可写层（换过的 worker `ddd30dd1…`、更新过的 Claude CLI 2.1.292 等）按 overlay upperdir 逐字节搬运并核对属主/权限/内容哈希；数据卷与 `/opt/ccgateway-runtime/<key>`（state、sing-box 代理配置、防火墙规则）同样搬运核对。出口代理不变：#21 `216.173.82.161`，#22 `47.147.29.235`（迁移后在容器内实测）。#20（已禁用）只迁了数据卷与目录，没有建容器（旧网络 172.18.0.0/16 与 OVH 冲突）；重新启用时控制器会按新地址池新建。
> - 19:00 已清理 cc-max 上的账号容器、控制器、Caddy、账号网络、数据卷、`/opt/ccgateway-runtime*`、`/opt/ccgateway-gateway`，**不再有回滚到 cc-max 的路径**。迁移时刻的完整备份（三个账号数据卷、#21/#22 容器可写层、运行目录、环境文件，含凭据）在 OVH `/opt/ccgateway-backups/ccmax-runtime-20261009.tar.gz`（root 0600，约 400 MB）。cc-max 上仍剩旧测试容器 `ccgateway-worker-test`、构建镜像与 `/root/ccgateway-features-*` 等构建目录，未动。
>
> **2026-10-09 18:10（北京时间）现状（部分已被上面替代）：**
> - Core `v0.1.82`（源码 `4d5c666ca`，manifest `91b20df66c49…`）四节点 primary-first 升级完成；插件版本不变（ccgateway 0.1.15 等）。
> - CCGateway 已切到**控制面板模式**（CONTRACTS §53）：配置 `mode: controller`，`130.94.122.254:443`，**不再保存 SSH 凭据**；cc-max 上 `ccg-gateway`（caddy:2-alpine，host 网络，监听 *:443，Caddy 内置 CA 证书，核心固定信任其根证书）反代到 `ccg-controller`（`ccg-controller:0.1.49`，仍只听 127.0.0.1:8787）。账号模型流量经控制器 `ccg-tunnel` 隧道到账号容器。
> - #21/#22 **未重建**：切换控制器时容器身份与启动时间完全不变；随后用 §53.7 原地更新把容器内 `/usr/local/bin/ccgateway` 从 `e2ab0ee3…`（.80）换成 `ccgateway-worker:0.1.81` 里的 worker（`ddd30dd1…`，含 Claude Code 2.1.292 tool_result 折叠修复），只重启了这两个容器，旧程序备份在 `/opt/ccgateway-runtime/<key>/worker-backups/`。新账号默认镜像 `ccgateway-worker:0.1.81`。
> - 以后更新 worker：部署页"上传镜像"（app）或"更新现有账号的 worker"，或 `POST /system/ccgateway/runtime/workers`；**不要**再用一次性 `update-account.sh`。改回 SSH 模式需重新填写 SSH 凭据。
> - OVH 托管栈只用 `/home/debian/sup2api-managed/compose.yml`（容器名 `sup2api-1..4`、`releases`，卷 `sup2api-managed_sup2api-N-data`）。**不要**在 `release-*/next/deploy/gateway/ovh` 下 `docker compose up`：那份 compose 的卷（`state-N`）、证书路径与线上不同，10-09 07:44 曾因此起了一套错卷的节点（发布服务器崩溃循环、节点不心跳），09:23 恢复原栈时全站 503 约 10 分钟。

本指南供接手 AI 直接定位环境和执行检查。2026-10-09 本轮实际执行了本机工具定位、两台服务器 SSH 只读检查、容器选定字段/程序哈希/健康状态及 Core 节点状态查询；没有读取凭据值、运行 OAuth 探针、调用模型、重启、写数据库或部署。下面测试、构建、更新和恢复命令是后续操作方法，不代表本轮执行结果。当前状态见 [HANDOFF](HANDOFF-2026-10-09.md)，代码结构见 [IMPLEMENTATION-GUIDE](IMPLEMENTATION-GUIDE.md)，未闭环范围见 [REMAINING-WORK](REMAINING-WORK.md)。

## 1. 本机入口

- Windows / PowerShell，仓库 `D:/projects/golang/sup2api`，产品代码在 `next/`，真实本地 Claude 测试项目为 `D:/projects/test`。
- 远端 `https://github.com/Sub2API-Devs/sup2api.git`，工作分支 `feat/next-platform`。共享工作区已有其他 AI 开发，本轮先观察到 `c6c8bf888` 并继续推进；**线上 Core 源码仍为 `1c35179527a7632f3ea06b9d9014d81854112956`**。最新开发HEAD以现场Git为准，不提交全部未跟踪文件。
- `go.exe`：`D:/mise/shims/go.exe`，本轮版本 `go1.27.0 windows/amd64`；Node：`D:/app/nodejs/node.exe`，`v24.20.0`。
- Python 用 `py -3`，本轮 `3.14.7`；启动器即使出现旧式启动器警告仍可工作。PATH 的 `python.exe` 是 Microsoft WindowsApps 别名，不用它跑脚本。
- 原生 CLI：`C:/Users/16790/AppData/Roaming/npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe`，本轮 `2.1.292`。`claude.ps1/.cmd` 是包装入口，Go 的 `CCG_REAL_CLI` 应指向原生 exe。
- Playwright 包：`C:/Users/16790/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`；现有视觉脚本直接引用此路径。用 `load_workspace_dependencies` 刷新运行时路径；浏览器使用已安装 Edge，具体 launch 参数以脚本为准。

```powershell
Set-Location D:/projects/golang/sup2api
git status --short
git rev-parse HEAD
git branch --show-current
Get-Command go,node,py,ssh,rg | Select-Object Name,Source
ssh -G ovh | Select-String '^(hostname|user|port|identityfile) '
ssh -G cc-max | Select-String '^(hostname|user|port|identityfile) '
```

本机 SSH 配置实际解析为 `ovh = debian@15.204.107.38:22`、`cc-max = root@130.94.122.254:22`，identity 为 `~/.ssh/id_rsa`。保留已有主机指纹验证；缺少别名/密钥时从本机可信 SSH 配置和用户安全会话恢复，不能关闭 `StrictHostKeyChecking` 或从文档推导私钥。

## 2. OVH：Core、插件和独立测试数据库

- Git 主仓库 `/home/debian/sup2api/src`；精确 `.78` clean detached 构建树 `/home/debian/sup2api/release-0.1.78`。
- 正式运行目录 `/home/debian/sup2api-managed`（0700），`compose.yml`、私有 `.env`（0600）、`config/sup2api-{1..4}.json`、`certs/`、`keys/`、`stage/`、`publish/` 在这里。
- 容器 `sup2api-1`、`sup2api-2`、`sup2api-3`、`sup2api-4`；宿主端口依次 `3130/3131/3132/3133 → 8080`，主节点为 1。容器内 `/etc/sub2api/shell.json` 挂对应节点配置，`/var/lib/sub2api` 是各节点独立持久卷。
- 公共平台入口 `http://15.204.107.38:3130/`；API 模型路径 `/v1/messages`，管理前缀 `/api/v1`。管理凭据优先经 SSH 回环使用。`https://ccgateway.internal` 是 Core 内部特殊 transport 标识，不是公网 URL。
- PostgreSQL `sup2api-pg-1`、Redis `sup2api-redis-1`、插件市场 `market` 和制品服务 `releases` 属于现有服务；不要拿生产 PG 跑 fixture、清理其他服务或启动 `deploy/single`。
- 隔离 Compose 在 `/home/debian/sub2api-next-test/testdb/docker-compose.yml`，项目 `sub2api-next-testdb`；PG `sub2api-next-testdb-pg-1`，`127.0.0.1:45432 → 5432`；Redis `sub2api-next-testdb-redis-1`，`127.0.0.1:36379 → 6379`。目录没有 `.env`，PG 密码由 Compose 的 `POSTGRES_PASSWORD` 配置；值须只在受控进程内读取。
- `.78` 发布日志 `/home/debian/sup2api-managed/upgrade-20261008T195114.log`；备份 `/home/debian/sup2api-managed/backups/core-0.1.78-20261008T194528Z`。数据库 dump、完整 inspect 和配置备份是私有恢复材料，不提交 Git。

SSH 登录后运行以下只读检查；生产 API 未认证 `401` 是正常保护，不代表模型能力已验收：

```sh
ssh ovh
for n in sup2api-1 sup2api-2 sup2api-3 sup2api-4; do
  docker inspect "$n" --format '{{.Name}}|{{.Config.Image}}|{{.State.Status}}'
  docker exec "$n" /var/lib/sub2api/current/bin/sub2api version
  docker exec "$n" sha256sum /var/lib/sub2api/current/bin/sub2api
done
for p in 3130 3131 3132 3133; do curl -s -o /dev/null -w "$p %{http_code}\n" "http://127.0.0.1:$p/api/v1/key/prices"; done
docker exec sup2api-pg-1 psql -U sup2api -d sup2api -AtF'|' -c 'select node_id,mode,ready,stopped from updater.nodes order by 1'
docker exec sup2api-1 sub2api-gateway status -config /etc/sub2api/shell.json | python3 -c 'import sys,json; d=json.load(sys.stdin)["data"]; print({"baseline":d["baseline"],"nodes":[{k:n.get(k) for k in ("node_id","mode","ready","stopped")} for n in d["nodes"]]})'
```

本轮四节点 `.78`、程序 SHA256 `872573c772bd97322fc076b006b34fcc732f47c5dd9aa8f3836ddb36d6d1a689`，local/ready=true/stopped=false，四入口 `401`。Docker 日志轮转为每文件 50m、5 个文件；必要时 `docker logs --since 10m --tail 100 sup2api-1` 私下检查，分享前脱敏。

## 3. cc-max：Controller 与保留原授权的账号容器

- Git 主仓库 `/root/sup2api`，Worker `.80` 构建树 `/root/ccgateway-features-609691490`，源码 `60969149045452a96e5f0b125c912ddf28f8eeba`。
- Runtime `/opt/ccgateway-runtime`（0700），Controller 私有文件 `/opt/ccgateway-runtime.env`（0600）；容器 `ccg-controller`，镜像 `ccg-controller:0.1.48`，host network，实际管理监听 **127.0.0.1:8787**，无管理 Key 的 `/health` 返回 `401`。
- #21：`ccg-21-app`，持久卷 `ccg-21-data` 挂 `/work`；#22：`ccg-d1d2964e14bf728d9-app`，卷 `ccg-d1d2964e14bf728d9-data`。相应 egress 容器为同前缀 `-egress`；每账号独立网络和代理。
- 两个 app 的镜像标签仍 `ccgateway:0.1.56`，实际 `/usr/local/bin/ccgateway` 为 `.80`，SHA256 `e2ab0ee3884ccbf725064f93e23dd48b6f55cdd5967dc8154627a825ea187f79`。普通重启保留原地程序，重建可能恢复旧镜像；不要删除/重建 #21/#22。
- 本地未来默认镜像 `ccgateway-worker:0.1.80`，镜像内程序是 `/usr/local/bin/worker`，构建参数不同，哈希不同。保存默认镜像配置不会自动替换已有账号；镜像推送仓库未闭环。
- Worker 内部监听 `8787`，宿主 Controller 的同端口与它们处于不同网络空间。Core 按 Controller 的带 revision 连接信息动态发现私网 IP，再经 SSH 直连；不要固定每账号 IP 或逐账号维护 permitopen。
- 现场还有 `ccgateway-worker-test`，宿主 `8788`，属于旧测试资源，不代表生产默认镜像。新隔离测试不要占用它或生产 `8787`。
- `/work/data/cache` 和 `/work/data/request-logs` 现场存在；授权/config 在 `/work` 持久卷内，勿读取或复制 OAuth 内容。账号管理 API 只提供日志开关/限额状态，日志正文留在容器文件；关闭会删除已有日志。
- 最新构建门禁/制品 `/opt/ccgateway-runtime/feature-validation-609691490`；原地更新备份 `/opt/ccgateway-runtime/manual-backups/20261009-609691490-21` 与 `...-22`，旧 `.79` 程序名 `ccgateway`。

```sh
ssh cc-max
for n in ccg-21-app ccg-d1d2964e14bf728d9-app; do
  docker inspect "$n" --format '{{.Name}}|{{.Id}}|{{.Config.Image}}|{{.State.Status}}|{{.HostConfig.NetworkMode}}'
  docker exec "$n" sha256sum /usr/local/bin/ccgateway
  docker exec "$n" node -e 'fetch("http://127.0.0.1:8787/health").then(async r=>console.log(r.status,await r.text()))'
done
docker inspect ccg-controller --format '{{.Name}}|{{.Config.Image}}|{{.State.Status}}'
```

原 `.56` 容器没有 curl，上面的 Node fetch 本轮可用。两 Worker `/health` 均 `200`、CLI `2.1.292`；不代表 OAuth/余额在线有效。Docker app 日志轮转为 20m×3；`docker logs --since 10m --tail 100 ccg-controller` 等输出也须先脱敏。**不要运行 `claude auth status`、profile、手工 refresh/清锁作为健康检查**，曾发生探针遗留 OAuth 锁。

查询具体请求先在平台用量找时间/账号/attempt，再到对应Worker列文件：`docker exec ccg-d1d2964e14bf728d9-app find /work/data/request-logs -maxdepth 2 -type f`（#21改容器名）。每请求目录内可有`events.jsonl`、`effective-config.json`、`mod-config.json`、`feature-decisions.json`、`history-native.jsonl`、`upstream-request-*.body`及响应；按实际文件和partial/truncated状态判断。正文用受控SSH私下读取，不把整个目录提交Git或回显到公开报告。Core管理`GET /api/v1/system/ccgateway/accounts/22/request-logs`只返回enabled/限额，不是日志下载接口。Worker目前无Core RID header直接联结，需时间/账号/上游ID/usage交叉核对。

## 4. 凭据与管理访问

平台 API Key、Core 管理 token、Controller 管理 Key、Worker 调用/管理 Key、上游 OAuth/API Key 是不同层。平台 Key 从用户当前安全会话取得，进程变量名 `SUP2API_API_KEY`；不能拿 bootstrap 管理 token 当模型 Key。不得把秘密值放命令参数、Git、报告、HAR/trace/storageState 或完整 inspect 输出。

Core 管理 token 可在 **OVH 内部**读取 `/home/debian/sup2api-managed/.env` 的 `SUB2API_BOOTSTRAP_ADMIN_EMAIL/PASSWORD` 后向 `http://127.0.0.1:3130/api/v1/auth/login` 登录；仅在内存保留返回 token，随后请求管理 API。参考已存在 [verify-ccgateway.py](../../deploy/gateway/ovh/verify-ccgateway.py) 的 `api` 和登录部分，**不要直接以 `--configure/--enable-plugin` 执行它来获取访问**，这些参数会写配置。如下模板只输出无秘密的摘要；失败只记状态码，不输出响应体：

```python
# 在 ovh 的 python3 中运行；不向终端输出 env/token/完整响应。
import json, pathlib, urllib.request, urllib.error
v = dict(x.split('=', 1) for x in pathlib.Path('/home/debian/sup2api-managed/.env').read_text().splitlines() if '=' in x)
def api(path, body=None, token=None):
    h = {'Content-Type': 'application/json'}
    if token: h['Authorization'] = 'Bearer ' + token
    q = urllib.request.Request('http://127.0.0.1:3130/api/v1' + path, headers=h,
        data=None if body is None else json.dumps(body).encode())
    try:
        with urllib.request.urlopen(q, timeout=15) as r: return json.load(r)['data']
    except urllib.error.HTTPError as e: raise SystemExit('HTTP ' + str(e.code)) from None
token = api('/auth/login', {'email':v['SUB2API_BOOTSTRAP_ADMIN_EMAIL'], 'password':v['SUB2API_BOOTSTRAP_ADMIN_PASSWORD']})['access_token']
d = api('/system/ccgateway/runtime', token=token)
print({k:d.get(k) for k in ('up_to_date','controller_version')})
token = ''; v.clear()
```

Controller 管理凭据由 `/opt/ccgateway-runtime.env` 的可信配置在 cc-max 进程内读取，或由 Core 已保存加密配置使用；不要读取 OAuth。OVH 专用 SSH identity/known_hosts 在 `/home/debian/sup2api-managed/ccgateway/`，不要替换成本机通用 Key。UI 只读验收脚本 [cache-ttl-production-ui.mjs](implementation/evidence/cache-ttl-production-ui.mjs) 通过私有 stdin 接收内存 token、SSH loopback base 与已验收 usage 行；它限制 GET、401 即停，不保存会话。新会话没有平台 Key 时仍能继续离线/假上游验证，真实调用明确标未执行。

## 5. 隔离验证命令与跳过边界

以下 PowerShell 按需要选择，不是每次全部执行。`next/plugins/ccgateway/companions` 是共享 engine 模块，worker/contracts 各有独立 go.mod。`CCG_REAL_CLI` 只放在定向 CLI 测试作用域，全模块 race 先清掉它，避免意外扩大真实 CLI 范围。

```powershell
Remove-Item Env:CCG_REAL_CLI -ErrorAction SilentlyContinue
Push-Location next/plugins/ccgateway/companions
go test -count=1 ./engine
go vet ./engine
$env:CCG_REAL_CLI = 'C:/Users/16790/AppData/Roaming/npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe'
go test -count=1 -v ./engine -run 'TestRealCLI(DynamicMCPListingHistory|ForcedMixed.*|PinnedMCPDeferredSearch|HelperHistory.*|InlineInternalSearch)$'
Remove-Item Env:CCG_REAL_CLI
Pop-Location
Push-Location next/plugins/ccgateway/companions/contracts; go test -count=1 ./...; go vet ./...; Pop-Location
Push-Location next/plugins/ccgateway/companions/worker; go test -count=1 ./...; go vet ./...; Pop-Location
Push-Location next/plugins/ccgateway; go test -count=1 ./...; Pop-Location
Push-Location next/web; npm test; npm run typecheck; npm run build; Pop-Location
```

这些 CLI 用例用临时 HOME/USERPROFILE/CLAUDE_CONFIG_DIR、假 Key、回环假提供商，验证实际出站/续聊/冷导入/回退，不证明真实模型接受或账号资格。没有 `CCG_REAL_CLI` 时真实 CLI 测试 skip；必须看 `-v` 输出。Linux 门禁按改动用 `go test -race`，Windows race 需本机 C 工具链；缺少时记录未执行，不能把普通 test 当 race。不要自动重生成 `CCG_NATIVE_CATALOG_OUTPUT` 版本夹具。

本机嵌入 PG 曾缺 `global/pg_control`，未修复；用已存在 OVH 隔离 PG。先另开 PowerShell 前台隧道 `ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:45432:127.0.0.1:45432 ovh`（若本地占用，选择空闲本地端口并同步修改 DSN）。随后从可信 Docker 配置在 Python 内存取得测试密码并启动 Go，**不打印密码或 DSN**：

```python
# 从仓库根用 py -3 执行；先确认隧道连的是隔离 PG，不能换生产容器名。
import json, os, subprocess, urllib.parse
raw = subprocess.check_output(['ssh','ovh','docker','inspect','sub2api-next-testdb-pg-1'], text=True)
v = dict(x.split('=',1) for x in json.loads(raw)[0]['Config']['Env'] if '=' in x)
env = os.environ.copy(); env.pop('SUB2API_TESTPG', None)
env['TEST_DATABASE_URL'] = 'postgresql://postgres:' + urllib.parse.quote(v['POSTGRES_PASSWORD'], safe='') + '@127.0.0.1:45432/postgres?sslmode=disable'
subprocess.run(['go','test','-count=1','-v','./internal/usage','./internal/gateway','-run','CacheWriteEvidence|HelperCustody'], cwd='next/server', env=env, check=True)
```

需要 Core＋真实 CLI＋隔离上游完整隐藏历史时，在上述子进程 env 加原生 `CCG_REAL_CLI`，定向 `go test -count=1 -v ./internal/gateway -run 'TestHelperHistoryABC(Inline)?RealDBCLI$'`。测试会创建/删除隔离数据库及迁移模板，需 CREATEDB；这属于测试写入。`SUB2API_TESTPG=off` **仅在 TEST_DATABASE_URL 未设置时**跳过数据库测试；设置了 DSN 会优先使用它。仅 skip 的成功不能记作账务/PG通过。隧道结束按 Ctrl+C 关闭，不清理服务器旧资源。

真实平台 API/本地 Claude 用已保留的 [live_api_smoke.py](evidence/live_api_smoke.py)、[public_dynamic_mcp.py](evidence/public_dynamic_mcp.py)、[public_forced_mixed.py](evidence/public_forced_mixed.py)、[public_helper_budget.py](evidence/public_helper_budget.py)、[local_claude_smoke.py](evidence/local_claude_smoke.py)。这些命令会消费额度，先从安全会话将 Key 放进当前进程，不回显，测试选小量明确断言，先错即停：

```powershell
py -3 next/docs/ccgateway-feature-support/evidence/live_api_smoke.py --base http://15.204.107.38:3130 --only json --output artifacts/api-json.json
py -3 next/docs/ccgateway-feature-support/evidence/public_dynamic_mcp.py --base http://15.204.107.38:3130 --output artifacts/dynamic.json
py -3 next/docs/ccgateway-feature-support/evidence/public_forced_mixed.py --base http://15.204.107.38:3130 --output artifacts/forced.json
py -3 next/docs/ccgateway-feature-support/evidence/public_helper_budget.py --base http://15.204.107.38:3130 --inline --output artifacts/helper-inline.json
py -3 next/docs/ccgateway-feature-support/evidence/local_claude_smoke.py --cli C:/Users/16790/AppData/Roaming/npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe --base http://15.204.107.38:3130 --project D:/projects/test --output artifacts/local-read.json
```

先确认 `artifacts` 输出目录存在；本地 Read 用例要求测试项目有 `pelican-bicycle.svg`。该脚本只对子进程设置 API 入口，禁用 setting sources/会话持久化，不改全局 Claude 配置；它不替代使用临时配置的隔离 engine 用例。公网分组请求不能保证覆盖 #21/#22，更不能证明强制 cold restart；须用管理侧 usage/attempt/account 与 Worker 日志核对。HTTP 200 refusal、tooltoo_many_requests、仅结构返回都不等于功能成功执行。

## 6. Git-only 构建、受控更新与恢复

正式发布顺序是本机审查/适当测试→提交/推送→服务器 Git fetch 精确 SHA→新 clean detached worktree→构建/签名/核哈希→备份/fresh preflight→正常 updater。禁止上传源码树/压缩包替代 Git，也不执行旧 `deploy/single`、旧滚动迁回 single 或自动重建已有账号。

OVH shell 模板，替换 VERSION/FULL_SHA 为经批准的实际值，不能重复占用 `.78`：

```sh
version=VERSION; sha=FULL_SHA; repo=/home/debian/sup2api/src
git -C "$repo" fetch origin "$sha"
git -C "$repo" worktree add --detach "/home/debian/sup2api/release-$version" "$sha"
cd "/home/debian/sup2api/release-$version"
test "$(git rev-parse HEAD)" = "$sha" && test -z "$(git status --porcelain --untracked-files=all)"
sh next/deploy/gateway/ovh/prepare-core-release.sh "$version" "$sha"
```

[prepare-core-release.sh](../../deploy/gateway/ovh/prepare-core-release.sh) 仅准备制品，要求既有签名钥/相同 trust/一致在线基线；2 CPU/4 GiB cgroup 限额，不导入、不创建升级计划。核 builtin 同版本包不可变、签名/TLS/schema、备份恢复列表后，取 `publish/vVERSION.digests` 的 manifest_digest，以主节点 `sub2api-gateway import -config /etc/sub2api/shell.json -manifest https://releases/sup2api/DIGEST.json` 导入。再在控制台正常 preflight 创建计划，或使用已核服务器 `/home/debian/sup2api-managed/upgrade_observe.py DIGEST`，**不传 fault/follower 参数**。服务端 `CONTAINER={n:n for n in PORTS}` 已修；仓库旧 observer 映射仍旧，不能直接覆盖服务端。`.78` 实测维护 503 窗口 37.87s，不是零中断。

Worker 在 cc-max `/root/sup2api` 同样 Git fetch 精确 SHA、新建 detached tree；镜像构建上下文必须 `next/plugins/ccgateway/companions`：`docker build --build-arg WORKER_VERSION=VERSION --build-arg SOURCE_REVISION=FULL_SHA -f next/plugins/ccgateway/companions/worker/Dockerfile -t ccgateway-worker:VERSION next/plugins/ccgateway/companions`。先在独立资源配额的门禁容器验证 engine/contracts/worker、真实 CLI 假上游及新镜像 health/features；镜像构建本身的资源限制按当前 host BuildKit/cgroup 条件核验后再运行，不靠默认无限资源。不要将 `CCG_REAL_CLI` 注入整个 race 容器。源码 SHA、standalone 与镜像程序哈希分别记录。

账号程序原地更新依次 #22→#21，保留 ID/卷/config/凭据：确认无活动 CLI→保存旧程序及私有元数据→新程序复制到同目录唯一临时文件→校验批准哈希/0755→再次确认无活动 CLI→原子 mv→仅重启原容器→health/features/ID/卷核对→逐账号实际功能验收。服务器已有 `feature-validation-609691490/update-account.sh` 是已完成 `.79→.80` 的一次性脚本，旧哈希和备份目录写死，**不要重跑**。保存默认镜像与更新现有账号是两件操作；runtime/install是另一个安装入口，不能用它代替保留容器的程序补丁流程，执行前应核当前重建/安装边界。

Core 失败恢复先只读 `status`，按原因选择正常状态机的 pause、resume 或 rollback；例如满足回滚条件时运行 `docker exec sup2api-1 sub2api-gateway rollback -config /etc/sub2api/shell.json -id UPGRADE_ID`，暂停/继续则分别将动作改为 `pause`/`resume`。rollback 仅限数据库/协议契约一致、插件兼容且旧签名制品存在；跨 schema 需独立备份恢复方案，不能猜测执行 SQL 向下迁移。本轮未验证 `.78` 实际回滚。

Worker 恢复在确认无活动 CLI 后，对目标账号选择相应 `...-21/ccgateway` 或 `...-22/ccgateway`，旧 SHA256 必须 `0c44e181c3e60257e3f0668144139dc471529f859148f6f1aa8136b56e897231`。用 `docker cp OLD_BACKUP CONTAINER:/usr/local/bin/ccgateway.restore-UNIQUE`、容器内 `chmod 755`/`sha256sum`、再次查活动 CLI、同目录 `mv` 原子恢复，再 `docker restart -t 30 CONTAINER`；重复健康/身份/历史/实际工具验证。恢复前还需核新历史与旧能力/policy 兼容，不能只恢复程序就宣称恢复完成。
