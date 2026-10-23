# CCGateway 审核 · 02 控制器（2026-10-23，HEAD f546fa31a）

> 只读审核。审核员 B。本文件是唯一写入物。范围：`next/plugins/ccgateway/companions/controller/`。行号均为本次 HEAD 工作树。

## 0. 摘要（先看这里）

1. **控制器没有任何日志**（`log_message` 置空且全模块无 `logging`），apply / 激活 / 共享出口恢复 / CLI 更新线程的异常全部被 `except Exception` 吞成 `runtime_unavailable`；核心 `putConfig` 又丢掉控制器返回的 error 码。账号卡在 pending 时，两层都查不出原因（B1，P2）。
2. **共享 Xray 出口是生产路径（8 个账号，2026-10-15 迁移）但几乎没有单测**：`shared_egress.py` 542 行只有 3 个纯函数测试，`SharedEgress.apply/configure/sync/migrate/recover/remove` 与 `Manager.apply` 的 shared 分支零覆盖（B2，P2）。
3. **全局 `cli_version` 一改就全体离线且无路径可升级**：`_provision` 对已有容器的版本变化一律抛 `InvalidCLIProfile`（manager.py:667-670），核心把配对更新钉死在 2.1.304（workers.go:73）；该 409 原因被核心丢弃（B3，P2，控制器现象 + 核心根因）。
4. 上一轮的 F7/A7（`v1/messages` 中继）、F9（锁内 Docker inspect）、C9（测试依赖环境变量）、"宿主机公网 IP 未 drop" 均**未修**；`migrate-auth` 端点和官方 CLI 下载路径也已无调用方，可一并删除（B5–B8、B10、B12）。
5. 上一轮修复核对：P1-2（凭据不重新加密，11dc44a0e）、R3（无配额存储降级，0a8521a42）、请求日志三条 POST-only 路由（b986d7e23）在代码中确认到位。
6. 测试：Windows 下用 `$TEMP/pystub` 桩（`fcntl` + `host_routes=[]`）跑 13 个模块 **168/168 通过，0 跳过**（上一轮 Linux 163，新增 5 条是请求日志/配额用例）。

## 1. 范围与方法

读过的控制器文件（全文）：`manager.py`（1679 行，不是任务说明里的 8000；8087 是目录合计）、`network.py`、`cli_profiles.py`、`cli_updates.py`、`runtime_updates.py`、`images.py`、`upgrade.py`、`shared_egress.py`、`cleanup.py`、`migrate_egress.py`、`Dockerfile`、`VALIDATION.md`、`requirements.txt`；13 个 `test_*.py` 看了用例名、夹具（`FakeDocker`，`exec_run` 恒返回 0）和关键断言；7 个非 unittest 脚本只看头部与引用。

对账用的核心/Worker 文件（只读）：`server/internal/ccgateway/{direct.go,controller_tunnel.go,accounts.go,network.go,request_policy.go,cli_management.go,request_logs.go,request_log_viewer.go,workers.go,errors.go,http.go}`、`companions/engine/{cli_management.go,request_log_viewer.go,main.go,auth.go}`。

上一轮：`2026-10-21-ccgateway/99-FINAL.md` §2/§7，`01-lifecycle.md`、`04-request-path.md`、`06-quality.md`、`13-verify-tests.md` 中控制器相关条目。

命令与结果：

| 命令 | 结果 |
|---|---|
| `uv run --no-project --with-requirements requirements.txt python $TEMP/pystub/run_ctl_tests.py . test_manager` | 57 tests OK（10.1 s） |
| 同上，其余 12 个模块一次性 | 111 tests OK（31.8 s） |
| 静态统计 `def test_` | 168，与运行数一致，无 skip |
| 自写 AST 统计（放在 `$TEMP/pystub/ctl_metrics.py`，不入库） | 见 §4 |
| `grep` 核心对 `/accounts/<key>/{v1/messages,migrate-auth,egress}` 的调用 | 三者均无生产调用方 |

限制：本机无 Docker/Linux，`host_routes()`（读 `/proc/net/route`）被桩替换，`fcntl.flock` 为空操作；没有跑任何真实容器脚本；没有碰生产。

## 2. 事实链路图

### 2.1 模型请求：核心 → 控制器 → Worker

```
核心 forwardAttempt → route/openRoute
 ├─ fetchConnection (direct.go:48-92)
 │    GET <base>/accounts/<key>/connection, Authorization: Bearer AdminKey, X-CCG-Revision
 │    key 必须匹配 accountKeyPattern 或 draft；15 s 超时；409 → errAccountNotSynchronized
 │    响应 ≤ 8192 B；校验 app_ip 为 IPv4、在配置的 pool 内、私网；port == 8787；
 │    revision 相等；api_key 长度 16..512（direct.go:88）
 │   控制器 Handler.handle_request (manager.py:1482)
 │    hmac.compare_digest(Bearer, server.key) (1485-1487) → 401
 │    ROUTE.fullmatch (100-101，KEY_PATTERN = 1-18 位数字 | d+16hex)
 │    先读 ≤ 32 MiB 请求体 (1506-1511) → connection 分支 (1567-1573)
 │    Manager.connection (1078-1086)：with guard(aid) → state 存在、revision 非空、
 │      public(aid)['revision'] == revision（public 做 2-3 次 docker inspect，1048-1076）
 │    返回 {app_ip, port 8787, api_key, revision}；否则 409 not_synchronized
 └─ pooledTunnelClient / dialTunnel (controller_tunnel.go:27-82, 158-170)
      GET <base>/accounts/<key>/tunnel, Upgrade: ccg-tunnel, X-CCG-Revision；30 s 建立上限；
      DialContext 只允许拨 connection 给的 target（121-123, 160-163）
     控制器 handle_tunnel (1407-1457)：GET、Upgrade/Connection 头、无请求体 → 再查 connection()
      → socket.create_connection(app_ip:8787, 5 s) → 101 → 两个 pump，各 3700 s 读超时，
      一侧 EOF 对另一侧 SHUT_WR；内容不检查不记录
     Worker :8787 用 CCG_API_KEY 校验（控制器 _provision:753 注入）
```

### 2.2 `/admin/*` 透传（控制器自己做 HTTP 转发的全部路径）

`ROUTE` 允许的 admin 路径（manager.py:101）：`admin/status|usage|features|request-logs[/query|/detail|/read]|cli[/catalog]|auth/(session|start|complete|cancel|logout|refresh)`。流程（1589-1640）：

1. 方法表：`admin/request-logs` GET/PUT；`request-logs/query|detail|read` **仅 POST**；`admin/cli` GET/POST/PUT；`admin/usage|features|cli/catalog` 仅 GET；其余 GET/POST。与核心一致：`request_logs.go:59`（GET/PUT）、`request_log_viewer.go:92,347`（POST）、`cli_management.go:148`；与 Worker 一致：`engine/request_log_viewer.go:160`（非 POST 拒绝）。
2. 取账号锁（`admin/cli/catalog` 非阻塞，忙则 503 `cli_maintenance_busy`），锁内：state 存在且 `public()['revision']` == `X-CCG-Revision`，否则 409；`admin/auth/*`、`admin/usage` 对 api_key 账号 409 `api_key_account`；取 `admin_key`（1597-1612）。
3. 锁外 `requests` 转发到 `http://app_ip:8787/<path>`，`upstream_headers` 只带 `Authorization: Bearer admin_key`、`Content-Type` 和 5 个 anthropic/ccgateway 头（169-176）；`timeout=(5, 240)`；流式回写；**只回传 Content-Type 与 `LOG_READ_HEADERS`**（`X-Log-File-Size/Offset/Length`、`X-Content-Type-Options`，1630-1633），不回传 Content-Length，用 `Connection: close` 定界。核心侧 `request_log_viewer.go:359-365` 用这三个头校验 offset/length 再 `io.CopyN`。

控制器自己发起的 Worker 调用（非透传）：`_sync_environment` PUT `/admin/environment`（590-623）；`cli_updates.request` GET/POST `/admin/cli`（cli_updates.py:64-72）；`runtime_updates.maintenance` POST `/admin/runtime`（runtime_updates.py:68-85）。

### 2.3 旧 `v1/messages` 中继

`ROUTE` 仍匹配 `v1/messages(/count_tokens)?`（100），1619-1621 为它保留 3660 s 特例，secret 用 `api_key`（1610）。核心侧 grep：`VirtualURL`、`client.go:231` 是网关内部路径匹配；所有对控制器的调用（`runtimeRequest` 17 处、`cleanup.go:78`、`controller_tunnel.go:53`、`direct.go:60`、`workers.go:216`）路径均不是 `v1/messages`；`drafts_test.go:244` 还断言 `POST /accounts/<key>/v1/messages` 调用数为 0。唯一引用是 `integration_test.py:101`（真实 Docker 脚本）。**可以删除**（见 B5）。

### 2.4 PUT config → revision → 容器 → 核心校验

```
核心 Reconcile (accounts.go:352-368)：GET status；status=='ready' && revision==d.Revision → 不动；否则 putConfig
 revision = sha256(id|type|proxy_id|deleted_at|p.updated_at|hex(credentials_enc)|settings|retired_at)
           再叠 |network:… |cli:…（accounts.go:135,146; network.go:64-72）——由核心计算，控制器只做字符串比较
 d.CLI 总是存在：EffectiveRequestPolicy.CLIVersion 缺省 2.1.304（request_policy.go:72,174-175）
控制器 apply (784-870)：
 校验 cli / revision(64 hex) / network → 写 egress-desired.json
 未启用或无 proxy 且非 direct → block()（停容器、status blocked、revision ''）
 shared_xray：network 不许变；public()['revision']==revision → 直接返回；否则 shared.remove → provision → shared.apply
 其余：provision()（network_lock 内 _provision）：
   存在容器且 network、AUTH_LABEL 指纹、same_runtime 三者不变 → 只处理 locale/timezone 变化，返回（655-666）
   指纹/网络变 → 先校验镜像、CLI profile(oneshot 探针)、卷配额、子网容量，再 remove 旧 app（709-712）→ create 新 app（769-773）
   版本变而其他不变 → raise InvalidCLIProfile（667-670）
 public()['revision']==revision 且 app/egress running → 返回（826-829，幂等出口）
 online.pop → status syncing → configuration() → reuse_egress（revision 相同或 sing-box.json 内容相同，831-842）
 sing-box check oneshot → 必要时重建 egress → start → _activate：nft helper oneshot、等 :15001 ≤ 6 s、
   app 内 node fetch probe_url 10 s → state.revision=revision, status ready, boots, online[aid]=revision（899-903）
 任一异常：Handler 1549-1551 online.pop → 503/400/409；核心 putConfig 只看状态码（accounts.go:438-440）
```

- **幂等性**：同配置重复 PUT 不产生新 revision（revision 由核心算），不重启容器（826-829 提前返回）。代价是 1 次 `owned(app)`、1 次 `images.get(egress)`、1 次 `owned(egress)`、`save` 两次、`public()` 2-3 次 inspect。
- **仅 revision 变（指纹、网络、CLI 不变）**：不重建任何容器，但 `online.pop` → 2 个 oneshot 容器 + 一次经代理的外网探测 → 期间 `connection()` 返回 None（上一轮 F2 控制器侧，仍如此）。
- **回滚**：没有。`_provision` 先删旧 app 再建新 app；`apply` 在 sing-box check 通过后删旧 egress；`_activate` 探测失败只抛异常，不恢复旧 egress。依赖核心的 Kick 重试（5 s × 12）和 60 s 对账自愈；重试时 `reuse_egress` 通过 sing-box.json 内容比较命中，不会反复重建 egress。
- **锁**：`guard(aid)` 覆盖整个 apply；`network_lock` 只覆盖 `_provision`。

### 2.5 CLI 固定

- 核心总是下发 `cli:{version,request_mode:'build',disable_auto_update:true}`（network.go:68-72）；控制器 `validate_profile` 要求三键齐全且 `disable_auto_update is True`（cli_profiles.py:7-14）；无 `cli` 的旧核心由 Dockerfile `CCG_DEFAULT_CLI_VERSION=2.1.304` 兜底（manager.py:672-676）。
- 建容器前 `resolve_profile` 在目标镜像里跑 oneshot 探针（cli_profiles.py:18-29）：读 `/opt/ccgateway/cli/manifest.json`，校验 version/mode 已打包、`patch` 形如 `ccgateway-*`、路径 realpath 在 root 下、沿途目录 root-owned 且非 group/other 可写、文件 SHA-256 等于 manifest；结果注入 `WORKER_CLI_PATH/VERSION`、`CCG_CLI_SHA256/PATCH`、`CCG_REQUEST_MODE`（cli_profiles.py:41-43）。Worker 启动再核对一次（engine/main.go:641 `verifyPinnedCLI`）。
- 配对更新 `runtime_updates.py`：从镜像读 manifest+CLI+Worker，校验 ELF 魔数与 SHA（92-109）；容器内 `TRUST_SCRIPT` 校验 root 可信；写入新的不可变 release 目录；`INFO_SCRIPT` 执行 `--ccgateway-info` 核对 version/patch/capabilities（25-34）；切 `active-runtime.json` 指针 + 换 worker 文件，两步都在 Worker admission 暂停期间；健康检查核对 `cli_version/cli_patch/cli_sha256`（151-159）。
- `auto_update` 关闭的落实点：① 容器 env `DISABLE_AUTOUPDATER=1`（TELEMETRY_ENV:61）；② 新卷写 `/work/data/cli-update.json {"auto_update":false}`（749-751）；③ 控制器 `cli_updates.start` 对 `state.cli` 存在的账号拒绝手动更新、自动更新直接返回（cli_updates.py:89-94）；④ Worker 对 pinned 的 PUT auto_update=true / begin-install 返回 409（engine/cli_management.go:130-133,194-197）。
- **但**官方 CLI 下载代码仍在（见 B7）。

### 2.6 隔离（network.py）

- 每账号两张 bridge：`net`（`internal=True`，app + egress）、`uplink`（egress 独占）；IPv6 关闭；子网从 RFC1918 池按 /24 分配并避开宿主机路由与已有 Docker 子网（manager.py:557-577）。
- egress 容器 nft（`configuration`，89-138）：prerouting 只对 `app_ip` 的 TCP 做 tproxy、DNS 到 gateway；forward 全丢；input 默认丢，只收 lo/established/带 mark 的 tproxy 流/app 的 DNS；output 默认丢，代理模式只放 `代理 IP:端口`，直连模式丢私有/回环/链路本地/组播/保留后放任意 IPv4 TCP。
- app 容器 nft（`business_rules`，141-153，由 helper 在 app 的 netns 内安装）：output 默认丢；只放 established、到 gateway 的 53、`127.0.0.1:8787`，再丢私有目的地，其余 IPv4 TCP 放行（走默认路由到 egress 被 tproxy）。app 以 1000:1000、`cap_drop ALL`、`no-new-privileges`、`pids_limit 256`、1 GiB/2 CPU 运行（528-532, 769-773）。
- 代理主机名在**宿主机**解析一次（network.py:73），钉进 sing-box 与 nft。

## 3. 发现表

级别：P0 阻断 / P1 线上损害 / P2 应修 / P3 改进。"已知"= 上一轮已报且未修。

| # | 级别 | 位置 | 问题 | 证据 / 说明 | 建议 | 状态 |
|---|---|---|---|---|---|---|
| B1 | P2 | manager.py:1300-1301, 1659-1662, 1233-1237, 1402-1405; shared_egress.py:534-541; cli_updates.py:187-190; 核心 accounts.go:438-440 | **控制器零日志，异常全被吞**。`log_message` 置空（有正当理由：URL/体含 OAuth 材料），但全目录没有 `import logging`；`handle_request`/`_management`/`handle_worker` 的 `except Exception` 把 `egress not ready`、`account proxy connectivity check failed`、Docker APIError、KeyError 一律变成 503 `runtime_unavailable`；`_reactivate`/`shared.recover`/`cli_updates.run` 用 `except Exception: pass/return False`。核心 `putConfig` 非 200 一律 `errors.New("account runtime synchronization failed")`，不读控制器的 `{"error":code}`（`cli_profile_unavailable`、`disk_quota_unavailable`、`image_pull_failed` 全部丢失），只在 `reconcileKicked` 打一行 Warn。 | 已确认。结果：账号卡 pending/`runtime_sync_failed` 时宿主机和核心都没有原因。 | 控制器加 `logging` 到 stderr（只记异常类型+消息+key+路径，不记体/头）；核心 `putConfig` 用已有的 `runtimeError(status, raw)` 解析 reason 并写进 `account_lifecycle_sync.reason` | 新 |
| B2 | P2 | shared_egress.py 全文; manager.py:809-818, 1052-1055; test_shared_egress.py | **生产出口路径几乎无测试**。线上 8 个账号走 `shared_xray`（docs/CCGATEWAY-SHARED-XRAY-EGRESS.md 首段）。单测只有 3 个（`routes`/`node`/`firewall` 纯函数）；`SharedEgress.ensure/attach/sync/configure/apply/remove/migrate/recover/collect`、`Manager.apply` 的 shared 分支、`public()` 的 shared 健康判断、`delete()` 的 shared 解绑都没有单测；`shared_integration.py`/`shared_failure_test.py` 是需要真实 Docker、镜像钉在 `0.1.55` 的手工脚本。`migrate` 104 行、6 层嵌套、三段嵌套 try 的状态机，任何回归都不会被 CI 发现。 | 已确认 | 用 test_manager 的 `FakeDocker` 为 `SharedEgress` 补 configure/apply/fence/remove/recover 的用例；`migrate` 至少覆盖 prepared→stopped→failed 三相 | 新 |
| B3 | P2 | manager.py:650-654, 667-670; 核心 network.go:68-72, request_policy.go:225, workers.go:73 | **全局 `cli_version` 一改即全体离线，且没有升级路径**。核心把 `RequestPolicy.CLIVersion` 拼进每个账号 revision；控制器对"已有容器 + 指纹/网络不变 + 版本变"一律 `InvalidCLIProfile`（409 `cli_profile_unavailable`）。于是：通过 API 把 `cli_version` 改成任何非 2.1.304 的值（UI 不暴露该字段，但 `PUT remote-config` 只做正则校验）→ 所有账号 revision 变 → 每次 PUT 都 409 → `connection()` 对新 revision 永远 None → 全体 pending，核心只记 `account runtime synchronization failed`（B1）。设计上的出路是先做配对更新（`active_runtime.version` 匹配后 `same_runtime` 为真），但核心 `workers.go:73` 只接受 `cli_version == "2.1.304"`，`_provision` 也从不把 `state['cli']` 更新成配对后的版本（只靠 `active_matches`）。 | 已确认（代码推断，未实测） | 控制器：`cli_version` 变化但镜像已打包该版本时允许走配对更新路径而不是 409；核心：`cli_version` 保存前校验镜像 manifest，`workers.go` 去掉硬编码；B1 的 reason 透传 | 新（与上一轮"2.1.304 改为按能力判断"相关） |
| B4 | P3 | manager.py:867-869→882; 1201→1221-1231; runtime_updates.py:237-258 | **app 容器每次启动到 nft helper 之间无 `ccg_app` 规则**。`app.start()` 之后才跑 `self.helper(...)`；`_restart_healthy` 重启后要等健康检查（最多 30 s）再 `_reactivate`。窗口内 Worker 进程的 netns 是 Docker 默认路由（bridge .1 = 宿主机），`internal` 网络阻断外联但不阻断到 .1 的宿主机监听端口（如 Caddy 443）。Worker 可信且此时 `connection()` 为 None 不会有 CLI 请求，故影响低。 | 已确认代码顺序；影响为推断 | 在容器 create 时就把 `ccg_app` 规则作为 init 步骤（如 egress 镜像 entrypoint 先装规则再 exec worker），或 app 容器加 `--network none` 启动后再 connect | 新 |
| B5 | P3 | manager.py:100, 169-176, 1610, 1619-1621; CONTRACTS.md:3723 | `v1/messages(/count_tokens)` 中继无调用方（§2.3）。`upstream_headers` 转发的 5 个 anthropic/ccgateway 头只对它有意义。 | 已确认 | 从 ROUTE 删掉；`upstream_headers` 只留 Authorization/Content-Type；`integration_test.py:101` 改测 connection/tunnel；CONTRACTS §53.5 删"旧的模型转发路径保留" | 已知（F7/A7/Q4），未修 |
| B6 | P3 | manager.py:101, 905-948, 1556-1565; test_manager.py:414-456 | `POST /accounts/<draft>/migrate-auth` 与 `Manager.migrate_auth` 无调用方：核心 `reauth.go`/`drafts.go` 不调用；唯一出现是 `server/internal/account/ccgateway_reauth_test.go:48` 假控制器的一个 case。原地重新授权方案（stepup-removed 之后）已不需要跨容器复制凭据。 | 已确认 | 删除端点、方法、3 个测试和假控制器分支 | 新（上一轮 01 §6 列为未验证） |
| B7 | P3 | cli_updates.py:13-50, 113-179; runtime_updates.py:19, 143; cli_profiles.py:1 | **官方 CLI 下载/替换路径仍在**：`fetch_release` 从 `downloads.claude.ai` 下载官方 ELF，`install_locked` 把它换到 `WORKER_CLI_PATH`（缺省 `/usr/local/bin/claude`）。对 pinned 运行环境不可达（`start:89-92` + Worker 409），只对 `state` 无 `cli` 的 legacy 运行环境可达；而现在核心总是下发 `cli`，legacy 容器在 `_provision` 会先撞 B3 的 409。同目录 `runtime_updates.py:19` 写 "No ... downloaded official CLI"，`cli_profiles.py:1` 写 "never latest"，自相矛盾。 | 已确认 | 删除 `fetch_release`/`install`/`install_locked`（~130 行）与 `test_cli_updates.py` 对应 3 条；`admin/cli` POST update 固定 409 | 新 |
| B8 | P3 | manager.py:1081-1083, 1417, 1597-1612; 1048-1066 | `connection`、`tunnel`、所有 `admin/*` 透传都在账号 RLock 内调 `public()`（2-3 次 `containers.get` + 30 s 缓存的 `images.get`），apply/配对更新持锁期间全部排队；锁等待没有超时，核心侧放弃后控制器线程仍等到锁释放再撞 BrokenPipe。 | 已确认 | `public()` 只读内存 `online/boots`，由后台线程或 Docker events 维护；`acquire(timeout=…)` | 已知（F9），未修 |
| B9 | P3 | network.py:71-74; manager.py:836 | 代理主机名只在 apply 时于**宿主机**解析一次并钉进 sing-box + nft。DNS 轮换的代理服务商（多 A 记录、变更 IP）会让该账号出口静默失效，而 revision 不变 → 核心不会重新 PUT → 要等到任何配置改动。`getaddrinfo` 只取第一条记录。 | 怀疑（设计如此，但无文档、无告警） | 文档写明；或 `_activate` 探测失败时让核心可见（B1）；或定期对比解析结果触发重新 apply | 新 |
| B10 | P3 | test_manager.py:193-196; manager.py:672; test_cli_profiles.py:27,36 | 测试仍依赖宿主环境变量：`Base.setUp` 只 pop `CCG_CONTROLLER_VERSION`，不清 `CCG_DEFAULT_CLI_VERSION`（Dockerfile 里设了它；上一轮 Linux 复现 79 个 error）。 | 已确认 | `setUp` 同时 pop `CCG_DEFAULT_CLI_VERSION`、`CCG_ACCOUNT_DISK_*`、`CCG_CONTROLLER_NAME/PORT` | 已知（C9），未修 |
| B11 | P3 | manager.py:184-186, 759-765 | `authentication()` 对 `api_key`/`base_url` 做严格校验，却把 `locale`/`timezone` "pass through without validation" 直接写进 `LANG/LC_ALL/TZ`。核心有校验（account/ccgateway.go:72、environment.Locale），属纵深防御缺口；控制器把核心当 root 信任是既定前提。 | 已确认 | 控制器侧加 `[A-Za-z0-9_.@-]{1,64}` / IANA 时区形状校验 | 新 |
| B12 | P3 | network.py:96-97, 149-150; shared_egress.py:100 | 直连模式 output 链只丢私有/保留地址，宿主机自身公网 IP 仍可达。 | 已确认 | 产品/安全决定 | 已知，未修 |
| B13 | P3 | manager.py:1391-1399 vs 1385,1389,1404; 1659-1662 | `_management` 对 `InvalidImage/ImagePullFailed/UpgradeInProgress` 的 `fail()` 不检查 `response_started`，与同函数其他分支不一致（这三类目前都在 reply 之前抛出，暂无后果）；`handle_request` 的 `except Exception` 把编程错误（KeyError/TypeError）也映射成 503，掩盖缺陷（见 B1）。 | 已确认 | 统一成异常→(status, code) 表 + 一个 `error_response()`（上一轮 S13） | 新/部分已知 |
| B14 | P3 | shared_egress.py:512-541; manager.py:1678 | `shared.run` 每 10 s 对**所有**运行环境逐个 `with self.m.guard(key)`（即使不用共享出口），再 `collect()` 在 xray 容器里 exec `ss`。一次慢 apply 会让整轮 recover 排队；同时也是 B8 锁竞争的来源之一。 | 已确认 | 只遍历 `data['bindings']`；不用共享出口时不启动线程 | 新 |
| B15 | P3 | cli_updates.py:181-190 | `run()` 的 `root.iterdir()` 在 `suppress` 之外，一次 OSError 线程即死；用的 key 正则 `(?:[1-9][0-9]*|d[0-9a-f]{16})` 与 `KEY_PATTERN` 不同（无 18 位上限）。 | 已确认 | 随 B7 一起删除即可 | 已知（C9-A），未修 |
| B16 | P3 | manager.py:803-806, 825; 743-746 | `egress-desired.json` 在 apply 里写两次（block 前一次、provision 后一次，内容相同）；`_provision` 连续两次 `save`（743 未含 disk_quota，746 含）。无害但多两次 fsync。 | 已确认 | 合并 | 新 |

未发现 P0/P1。上一轮已修条目核对：P1-2（`account/handlers.go` 明文相同保留密文，11dc44a0e）✓；R3（`account_volume(allow_unbounded)`、`CCG_ACCOUNT_DISK_QUOTA_REQUIRED`，manager.py:386-416）✓；请求日志路由与 Worker/核心三方方法一致（§2.2）✓。

## 4. 代码规范观察

数据来自 `$TEMP/pystub/ctl_metrics.py`（AST，只统计生产模块）。

### 4.1 抽象 / 解耦：是单文件巨类，且有循环依赖

- `manager.py` 1679 行 = 常量+异常+纯函数（1-310）+ `class Manager`（312-1290，约 980 行，职责：Docker 生命周期、网络、卷配额、运行时镜像、控制器自升级、Worker 原地更新）+ `class Handler`（1293-1664，HTTP 路由、鉴权、错误映射、隧道、旧中继）+ `__main__`。
- 其他模块反向依赖 `manager`：`from manager import …` 懒导入 13 处（cleanup.py:11,53,82；cli_updates.py:144；runtime_updates.py:93,115,126,162；shared_egress.py:34,153,222,397,514）。`cli_updates`/`shared_egress` 又被 `Manager.__init__`/`shared` 懒导入（368, 376）。这是循环依赖的症状：公共件（`KEY`、`LABEL`、`BadRequest`、`read_single_file`、`tar_file`、`write_private`、`container_identity`、`worker_target`、`worker_idle`）应独立成模块。
- 可执行的拆分方向（不改行为）：
  1. `common.py`：正则/标签/异常类/`write_private*`/`rfc3339`/`check`；`VERSION`、`SHA256`、`IMAGE_REF` 正则各只定义一次（现 `VERSION` 在 cli_profiles.py:5、cli_updates.py:14、runtime_updates.py:13 三份；`SHA256` 在 images.py:25、manager.py:41,98、runtime_updates.py:15 四份；`IMAGE_REF/IMAGE_ID/CONTROLLER_NAME` 在 manager.py:78-82 与 upgrade.py:26-28 两份）。
  2. `dockerfs.py`：`read_single_file`、`tar_file`、`container_identity`、`worker_target`、`worker_idle`、`_sha256/_stage/_swap/_discard/_restore`（现为 Manager 方法但不用 self 状态，runtime_updates/cli_updates 都在借用）。
  3. `lifecycle.py`（`Manager`）：`account_volume/verify_disk_quota/ensure_network/provision/_provision/apply/_activate/block/delete/public/connection/runtimes`。
  4. `worker_update.py`：`worker_program/_wait_idle/_backup_worker/_worker_healthy/_restart_healthy/_reactivate/update_worker`，与 `runtime_updates.py` 合并成一个"原地更新"模块。
  5. `runtime_admin.py`：`runtime_images/set_runtime_images/upgrade_controller/cleanup_*/health`。
  6. `http_api.py`（`Handler`）：路由表 `[(method, regex, handler)]` + 异常→(status, code) 字典；`handle_tunnel` 独立。
  7. `main.py`：环境读取与线程启动。

### 4.2 复用：重复 3 次以上的片段

| 片段 | 次数 | 位置 | 收口 |
|---|---|---|---|
| `labels.get(LABEL) != aid → raise ValueError('… ownership mismatch')` | 9 | cleanup.py:22；manager.py:404,496,561,721,924,981,1000,1005 | `owned_resource(collection, name, aid)` |
| `with contextlib.suppress(docker.errors.NotFound)` | 15 | manager.py:468,643,711,716,719,820,955,974,979,995,998,1003,1063 等 | `maybe(collection.get, name)` 返回 None |
| `self.online.pop(aid, None)` | 19 | manager.py 12 处、runtime_updates.py:230、shared_egress.py:298 等 | `drop_readiness(aid)`（同时 pop `boots`，现在两者有时一起 pop 有时不） |
| `self.close_connection = True` / `if not self.response_started: self.fail(...)` | 20 / 8 | Handler 三个 handler 的 except 链 | 一个 `error_response(exc)` |
| `dict(v.split('=',1) for v in attrs['Config'].get('Env',[]) if '=' in v)` | 3 | cli_updates.py:131；runtime_updates.py:131；shared_egress.py:504 | `container_env(c)` |
| `requests.Session()` + `trust_env=False` + Bearer admin_key | 5 | manager.py:608-612,1622-1625；cli_updates.py:27,65；runtime_updates.py:70 | `worker_session()` / `worker_call(state, method, path, …)` |
| `attrs['State']['StartedAt']` 作为启动标识 | 8 | manager.py:902,1058,1199,1203；shared_egress.py:181,293 | `boot_id(c)` |
| 遍历 `networks.list()` 的 IPAM IPv4 子网 | 2（各 6 行） | manager.py:567-572, 699-704 | `docker_ipv4_subnets()` |
| `json.loads(path.read_text()) if path.exists() else …` | 5（生产） | manager.py:359,502,842；shared_egress.py:118,354 | `read_json(path, default)` |
| ELF 魔数检查 | 3 | cli_updates.py:48；runtime_updates.py:104,107 | 常量 + 函数 |

### 4.3 简洁：超过 80 行的函数

| 函数 | 行数 | 位置 | 备注 |
|---|---|---|---|
| `Handler.handle_request` | 181 | manager.py:1482 | 路由、鉴权、7 个端点内联、锁、转发、8 段 except |
| `Manager._provision` | 158 | manager.py:625 | 校验、指纹、CLI、配额、子网、删旧、建网、写文件、建容器、保存 |
| `RuntimeUpdates.update` | 137 | runtime_updates.py:161 | 三段嵌套 try/except/finally |
| `SharedEgress.migrate` | 104 | shared_egress.py:396 | 三相状态机 + 回滚 |
| `Manager.apply` | 87 | manager.py:784 | |
| （非生产）`integration_test.main` 140、`shared_integration.main` 175、`shared_failure_test.main` 131、`runtime_migration_probe.main` 133、`offline_migration_probe.main` 112 | | | 手工脚本 |

### 4.4 嵌套：函数体内 ≥ 4 层的块（函数体本身算第 1 层）

深度 6：`Handler.handle_request`（1517-1549：try→if→if→try→except）、`Handler.handle_tunnel`（1438-1449 的 `pump` 闭包）、`RuntimeUpdates.update`（257-296）、`SharedEgress.migrate`（432-484）。深度 5：`Manager.account_volume`（396-400）、`ensure_network`（569-571）、`_provision`（701-721）、`delete`（979-1000）、`cleanup.cleanup`（110-112）、`CLIUpdates.install_locked`（170-173）、`images.archive_tags`/`Uploads.write`、`SharedEgress.remove`（342-345）。

### 4.5 死代码 / 遗留分支

- `v1/messages` 中继与 3660 s 特例（B5）；`upstream_headers` 的 5 个业务头。
- `migrate_auth` 与 `migrate-auth` 路由（B6）。
- `cli_updates.fetch_release/install/install_locked`（B7）。
- `_provision` 的 `retired_mode`（request_mode 为 `native` 的遗留，678）、`runtime_updates.prior_selection` 的 `native` 分支（146-149）、`WORKER_NAMES` 里的 `ccgateway`（旧 `docker-entrypoint.sh ccgateway`，89）：有明确注释，属兼容期代码，建议写下线条件。
- 核心 `accountDesired` 顶层 `locale`/`timezone`（accounts.go:54-55）在控制器从不读取（只读 `auth.locale/timezone`，631-640）——线上冗余字段。
- `manager.py:1-7` docstring 与 CONTRACTS §53.9 不一致（见 §5）。

### 4.6 异常处理吞错

全部静默（无日志）的位置：`_sync_environment`（605-617，文档化的"never fails the apply"）、`_reactivate`（1233-1237）、`runtimes()`（1036-1037, 1043-1044）、`public()`（1060-1061, 1063-1066）、`_management` 与 `handle_request` 的 `except Exception`（1402-1405, 1659-1662）、`cleanup.cleanup`（118-119，只给 `resource_cleanup_failed`）、`SharedEgress.recover/run`（534-541）、`CLIUpdates.run`（187）、`CLIUpdates.start/install_locked` 的 `suppress(Exception)`（109, 170, 175）、`runtime_updates.update` 的 7 处 `suppress(Exception)`。见 B1。

## 5. 对设计文档 / README 的异议

（`controller/README.md` 另一会话在改，按指示不报它。）

1. **CONTRACTS §53.5 "旧的模型转发路径保留（SSH 模式不用）"（CONTRACTS.md:3723）说法不成立**：§53.9 已把 SSH 降为安装方式而非连接方式，而且核心在任何模式下都经 `connection` 直连 `app_ip:8787`（`direct.go:96-109`），从没调过控制器的 `/v1/messages`。保留理由不存在，应直接写"已删除"。
2. **`manager.py:1-7` 模块 docstring** "The core reaches it over an SSH tunnel or through the Caddy HTTPS gateway" 过时，SSH 隧道已不是连接方式。
3. **`cli_profiles.py:1` "never latest" 与 `cli_updates.py` 的官方最新版下载并存**（B7）；`runtime_updates.py:19` "No user path, shell or downloaded official CLI" 与同包代码矛盾。设计意图是对的，代码没删干净。
4. **CONTRACTS §53.7（3741）"provision 只在凭据指纹或网络策略变化时重建 app 容器"** 现已不完整：CLI 版本变化会 409 而非重建（667-670）；legacy/`native` 容器在指纹或网络变化时会**顺带换成目标镜像**（677-680），与 671 行注释 "Credential/network changes must not incidentally upgrade the image" 相左。文档应写清三种情形。
5. **`VALIDATION.md`** 是 2026-10-03/04 的验证记录：描述的是 SSH 隧道、每账号 sing-box、"十个用户指定模型白名单"等已被替代的拓扑，不覆盖隧道、共享 Xray、CLI 固定、请求日志。放在生产目录里会被误读为当前验证状态，建议移到 `docs/audits/` 或加"历史"标题。
6. **CONTRACTS §53.5 隧道一节**与代码一致（锁内查、5 s 连接、3700 s、SHUT_WR）；§53.7 的 10 步与 `update_worker` 一致；无异议。

## 6. 未能验证的范围

- 所有 Linux 专属行为：`fcntl.flock` 单写者锁、`/proc/net/route` 读取（被桩替换为空列表）、nft/tproxy/sing-box/xray 真实效果、`ss`/`top` 进程表解析。
- 任何真实 Docker 路径：`oneshot` 的失败清理、`put_archive`/`get_archive`、卷配额探测（`statfsSync`）、egress 重建、共享 Xray 的 `attach/sync` 与 Xray API；`integration_test.py`、`shared_*`、`*_probe.py` 均未运行。
- Caddy 对 `ccg-tunnel` Upgrade、close 定界响应体与 240 s/3700 s 超时的实际行为；控制器在 Caddy 后的并发线程数上限。
- B3、B4、B9 的实际触发只做了代码推断，没有在隔离环境复现。
- 控制器自升级 `upgrade.py` 的真实滚动（只跑了 10 条基于假 client 的单测）。
- 生产环境状态（按要求未接触 ovh / `~/sup2api-managed`）。
