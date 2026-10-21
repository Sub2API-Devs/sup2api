# CCGateway 审核 04：请求转发全链路（网关 → 核心 ccgateway 客户端 → 控制器隧道 → Worker → engine → CLI）

审核日期 2026-10-21，分支 `feat/next-platform`，HEAD `43d576838`。只读审核，没有改源码、文档或配置。

## 1. 范围与方法

范围：

- 网关：`next/server/internal/gateway/dispatch.go`（`forwardBuilt`、`classify`、`applyClassification`、`applyAccountEffect`），`gateway.go` 中的 `defaultHeaderWait`。
- 插件：`next/plugins/ccgateway/internal/ccgateway/{ccgateway.go,classify.go,availability.go}`、`manifest.json` 里的 passHeaders。
- 核心：`next/server/internal/ccgateway/{client.go,direct.go,request_cache.go,controller_tunnel.go,controller_conn.go,request_policy.go,runtime_features.go,feature_policy.go,errors.go,accounts.go}`。
- 控制器：`companions/controller/manager.py`，包括 `handle_tunnel`、`handle_request` 和旧 HTTP 中继、`connection`、`public`、`_provision`。
- Worker：`companions/worker/{cmd/worker/main.go,internal/server/*.go,internal/worker/worker.go,internal/config/config.go}`。
- engine：抽查主路径和错误路径，包括 `runtime.go`、`main.go`（`Gateway.ServeHTTP`、`authorized`、`admit`、Slots）、`request_command.go`（生产主路径）、`request_error.go`、`request_log.go`、`proxy.go`（CLI 环境）、`runner.go` 中的 `baseEnv`、`contracts/httpfacts`、`contracts/features/request_modes.go`。

方法：

- 按请求时序走读代码，并对照 CONTRACTS §49.19、§53.4/§53.5/§53.9/§53.12 和 `CLAUDE-CODE-2.1.304-IMPLEMENTATION.md`。
- 写了三个临时测试来验证假设，都以 `zz_audit_path_test.go` 命名，跑完已删除，`git status --short` 确认没有残留：
  1. `next/server/internal/ccgateway`：不连数据库（预先填好请求缓存），复现 F2。在 CLIVersion=2.1.304 下，缓存修订号过期时的“重试一次”不会发生，错误被报成能力冲突，过期路由仍留在缓存里。同一文件还测了策略头大小：默认策略约 2.4 KB，低于 Worker 的 16 KB 上限，不算问题。
  2. `next/plugins/ccgateway/internal/ccgateway`：确认 ClassifyError 对核心 409 `not_synchronized`、Worker 401、Worker 429、Worker 504、Worker 400 `Cannot read body` 的分类结果（F1、F3、F4、F11）。
  3. `companions/engine`：测量 `pruneRequestLogs` 的耗时（F5）。
- 在仓库外的临时副本上运行 `golang.org/x/tools/cmd/deadcode`（从本机模块缓存构建）。在副本中删掉 `Gateway.ServeHTTP` 里运行时不可达的 native 分支后再跑一次，用两次结果的差值估计死代码量（F6）。副本已删除。
- 实际运行的测试：`go test ./engine -run 'RequestCommand|RequestMode|RequestCancel|RequestError|RuntimeClose'`（PASS，其中 4 个 Linux shell fixture 用例在 Windows 上 SKIP）；`companions/worker` 下 `go test ./...`（PASS）；`gofmt -l` 无输出；`go vet ./internal/ccgateway` 和 `GOOS=linux go vet ./engine` 无输出。
- 控制器 Python 测试依赖 `fcntl`，Windows 无法导入 `manager.py`，没有跑。按要求没有跑需要 PG 的 next/server 测试。

## 2. 链路时序（文字）

```
客户端 POST /v1/messages（API Key）
 └─ 网关 dispatch.forwardBuilt（dispatch.go:446）
     · 插件 BuildUpstreamRequest：URL = https://ccgateway.internal/v1/messages；请求头只放行
       anthropic-version / anthropic-beta / x-claude-code-agent-id，另加 x-ccgateway-session-scope（ccgateway.go:112-146）
     · client = CCGateway.ModelClientForRequest(account, proxy, group)（dispatch.go:489）
     · AcquireSlot(account, max_concurrency)（dispatch.go:341）
     · headerWait：流式 3 min / 非流式 10 min，超时取消 uctx（gateway.go:292-297, dispatch.go:570）
     └─ modelTransport.RoundTrip → forwardManaged（client.go:103-137）
         ctx = req.ctx + 1h1m
         └─ forwardAttempt（client.go:142-259）
             1. requestConfig（缓存 30 s）→ requestDesired（缓存 30 s，按账号）
             2. route(key, revision)：同修订号复用；否则 fetchConnection
                  GET <panel>/accounts/<key>/connection（15 s；Bearer AdminKey、X-CCG-Revision）
                  校验 app_ip 在地址池且为私网、port=8787、revision 一致、key 长度（direct.go:48-92）
                  控制器 connection()：持账号锁 → public()（docker inspect ×3）→ 比对 online 修订号（manager.py:1043-1051）
             3. resolvedWorkerPolicy（启用账号覆盖时每次查库）→ validateRequestPolicy
             4. CLIVersion==2.1.304（默认）→ 能力探测 GET /healthz（3 s，复用同一路由客户端）（client.go:227-232）
             5. 去掉 Authorization，x-api-key = Worker key，设置 X-CCGateway-Request-Policy
             6. pooledTunnelClient.Do：复用空闲隧道（30 s），否则 dialTunnel
                  TLS（固定 CA 或系统根）→ "GET <base>/accounts/<key>/tunnel" Upgrade: ccg-tunnel（建立上限 30 s）
                  控制器 handle_tunnel：再查一次 connection()；create_connection(app_ip:8787, 5 s)；
                  回 101；两个 pump 线程各设 3700 s 读超时；一侧 EOF 时对另一侧 SHUT_WR（manager.py:1372-1422）
                  409 → errAccountNotSynchronized → 缓存的修订号重试一次 / 新读的修订号直接回 409
             7. Worker 回 401 → forgetAccount；Do 出错 → forgetAccount；响应体 Close → finish（关闭并取消）
 └─ Worker（server.go:32：ReadHeaderTimeout 10 s，ReadTimeout 30 s，IdleTimeout 60 s，无 WriteTimeout）
     Runtime.ServeHTTP（runtime.go:247）：closed / maintenanceOnly / 维护租约 / cliGate.TryRLock / catalog 快照
     Gateway.ServeHTTP（main.go:61）：创建诊断目录（此时还没鉴权）→ RequestMode 非空时进入 serveRequestCommand（生产只走这条）
     serveRequestCommand（request_command.go:149）
       · authorized：常量时间比较 x-api-key（或 Bearer）
       · 读取策略头 → 读完整个请求体（≤32 MiB）→ identity / build 组件变换
       · Slots（容量 4）满 → 立即 429 rate_limit_error，Retry-After: 1
       · ctx = r.ctx + Timeout（默认 1 h）；exec.CommandContext(claude request --build|--direct --timeout-ms …)
         stdin = 组件 JSON；stdout → 首次写入时读 response-meta.json 写状态码和头，之后每块 Flush
         stderr → 解析 CCG_REQUEST_ERROR 协议帧；WaitDelay 2 s；ctx 结束时设置写截止时间
       · 客户端取消 → panic(ErrAbortHandler)；已开始输出后出错 → 中止连接（不发干净的 EOF）
 └─ CLI（单次请求，不执行工具）→ Anthropic
```

### 断开与取消的传播（已逐层核对，结论正常）

客户端断开后：网关 ctx 取消 → Go Transport 关闭这条 HTTP/1 连接，也就是隧道 TLS 连接 → Caddy 拆掉 upgrade 的两侧 → 控制器的 `read1` 读到 EOF，执行 `shutdown(SHUT_WR)` → Worker 的 HTTP server 后台读到 EOF，取消 `r.Context()` → `exec.CommandContext` 杀掉 CLI，`WaitDelay` 2 s 后回收管道 → handler 以 `ErrAbortHandler` 结束，defer 依次释放 Slots、删除临时目录、写诊断收尾 → 控制器 back pump 收到 EOF → 线程退出。`startBackgroundRead` 会清掉读截止时间（Go 1.27 `net/http/server.go:741`），所以 Worker 的 ReadTimeout 30 s 不会中途打断长时间运行的 handler。

### 超时层级

| 层 | 值 | 位置 |
| --- | --- | --- |
| 网关等待响应头 | 流式 3 min / 非流式 10 min | gateway.go:292-297 |
| 核心转发 ctx | 1 h + 1 min | client.go:115 |
| 核心 connection 查询 / 隧道建立 / 能力探测 | 15 s / 30 s / **3 s** | direct.go:53, controller_tunnel.go:22, runtime_features.go:52 |
| 核心空闲隧道 | 30 s（短于 Worker 60 s） | request_cache.go:30, controller_tunnel.go:159 |
| 控制器隧道每个方向的读超时 | 3700 s | manager.py:52, 1399-1400 |
| Worker 读请求头 / 整个请求（含 body） / 空闲 | 10 s / 30 s / 60 s | worker server.go:32 |
| Worker CLI 执行 | 默认 1 h（REQUEST_TIMEOUT / CLI_TIMEOUT） | worker config.go:88-110, request_command.go:304-318 |

各层整体是对齐的：1 h 执行 < 1h1m 核心 < 3700 s 隧道，核心空闲 30 s < Worker 空闲 60 s。例外是 3 s 的能力探测（F2）和整个请求 30 s 的 ReadTimeout（F11）。

## 3. 发现表

| # | 严重度 | 标题 | 置信度 |
| --- | --- | --- | --- |
| F1 | P1 | 运行环境未同步时，核心的 409 `not_synchronized` 直接返回给 API 客户端，不切换到其他账号，错误文本也不是官方格式 | 确认（分类已用测试验证） |
| F2 | P2 | 每请求一次的能力探测（2.1.304 默认开启）抢在真正请求之前碰到 409，使“缓存修订号被拒后重试一次”的机制失效，过期路由仍留在缓存中，错误被报成能力冲突 | 确认（测试复现） |
| F3 | P2 | Worker 并发槽位写死为 4，账号 max_concurrency 默认 10；多出的请求先上传完整请求体再收到 429，并让账号进入约 1 s 冷却 | 很可能 |
| F4 | P2 | Worker key 不匹配时返回的 401 被插件当作上游凭据被拒，账号冷却 60 s，若管理员配置了 401 自动停用规则则会被停用 | 确认（分类）/ 触发频率存疑 |
| F5 | P2 | 请求日志：每个请求都在账号级锁内同步遍历清理目录，并在锁内写最大 32 MiB 的请求体；所有流式输出的每一块都要拿这把锁 | 确认（实测 3000 个目录 247 ms） |
| F6 | P2 | engine 的 native exchange 分支在生产中不可达（RequestMode 总是非空），留下大量死代码；核心仍下发一批 Worker 在请求模式下完全忽略的策略字段 | 确认 |
| F7 | P3 | 控制器旧 HTTP 中继里的 `v1/messages(/count_tokens)` 路由已没有生产调用方；CONTRACTS 和 README 仍写着走这条路径 | 确认 |
| F8 | P3 | 只要 `client.Do` 出错（包括客户端取消、等待响应头超时）就清掉该账号的路由和 blocked 记录 | 确认 |
| F9 | P3 | 控制器每次建隧道或查 connection 都在账号锁内调用 3–4 次 Docker API，会被同账号进行中的 apply 阻塞 | 确认 |
| F10 | P3 | Worker 自己生成的错误在结构和类型上偏离官方：多出 `error.code`，使用非官方 type，文本也不同 | 确认 / 官方文本存疑 |
| F11 | P3 | Worker 的 ReadTimeout 30 s 覆盖整个请求体，慢链路上传大请求会得到 400 `Cannot read body`，原样返回客户端，不切换账号 | 很可能 |
| F12 | P3 | 请求路径上的重复开销：每次请求都编译正则、查一次账号功能策略、多一次 /healthz 往返 | 确认 |
| F13 | P3 | 明文 HTTP 控制面板不限制目标地址，管理密钥、Worker key 和对话内容都以明文传输 | 确认（设计选择） |

## 4. 发现详述

### F1（P1）409 `not_synchronized` 直接返回给客户端，不切换账号

- **证据**
  - `client.go:180-188`：`notSynchronized()` 在修订号是新读的（`cached=false`）时直接返回 `notSynchronizedResponse`。`client.go:132-135`：重试后仍过期也返回它。`client.go:261-263`：响应体是 `{"error":"not_synchronized"}`，状态码 409。
  - 插件 `classify.go:83-86`：响应体里没有 `error.type`，于是设置 `ClientErrorType="invalid_request_error"`，`ClientMessage=""`。`classify.go:144-147`：409 落到 default，结果是 `ACTION_RETURN_TO_CLIENT`。
  - 网关 `dispatch.go:740-749`：消息为空时补成 `"upstream returned HTTP 409"`，然后返回 `attemptReturn`，不切换账号。
  - 临时测试实测：`core not_synchronized 409: action=ACTION_RETURN_TO_CLIENT effect=UNSPECIFIED clientType="invalid_request_error" clientMsg=""`。
  - `availability.go:15-41` 和 `guardAvailability` 都不检查运行环境是否就绪，所以选账号阶段不会排除未同步的账号。
- **触发条件**：控制器在线的修订号不等于核心期望的修订号，而且核心是刚从数据库读的。常见情形：
  - 账号编辑、换代理、CLI 版本或环境变化导致修订号改变，而 reconcile 和容器重建还没完成；
  - 容器重启，包括 `mem_limit='1g'` 下被 OOM 杀掉后重启：`public()` 发现 StartedAt 变了会 `online.pop`（manager.py:1015-1026），在线修订号变成空，直到下一次 PUT config 才恢复；
  - 新账号保存后的第一批请求。
- **影响**：
  - 整个同步窗口内（几秒到几十秒，重建容器时更长），落到该账号的请求全部直接失败，即使分组里还有健康账号；
  - 粘性会话绑定在这个账号上时，同一会话会连续失败（推断）；
  - 客户端看到 409 `invalid_request_error`、消息 `upstream returned HTTP 409`。Anthropic 官方 API 不会返回这种错误，违反“错误与官方一致”的原则，Claude Code 也不会把它当作可重试错误。
  - CONTRACTS §49.19（CONTRACTS.md:3304-3305）只写了“照旧回 409”，没有规定客户端最终看到什么、是否切换账号。
- **修复建议**：
  - 核心在请求路径上不要合成 409，改为合成可切换账号的本地错误，例如 503 加 `{"type":"error","error":{"type":"overloaded_error"|"api_error","message":…}}`，再加一个内部头（如 `x-ccgateway-local: not_synchronized`）；
  - 插件看到这个头时返回 `ACTION_FAILOVER`、`LocalFailure=true`，冷却几秒，不计入管理员的自动停用规则；
  - 补一个网关级测试：账号 A 返回 not_synchronized 时，请求应由账号 B 完成。

### F2（P2）能力探测使“过期修订号重试一次”失效

- **证据**
  - `client.go:227-232`：只要 `policy.CLIVersion == "2.1.304"` 就会在真正请求前调用 `requireRequestPolicyCapabilities`，而这是默认值（`request_policy.go:56, 94-96`），所以实际上每个请求都会探测。
  - `runtime_features.go:51-81`：`client.Do` 出错时不往上传，统一返回 `core.ErrConflict`“The account Worker/CLI does not confirm …”。
  - `client.go:228-231`：这个错误直接 `return nil, false, err`，`stale` 为 false，不会走 `notSynchronized()`，也就不 `forgetAccount`、不 `Kick`、不重试。
  - 现有的 `request_cache_test.go:118` 用的是 `CLIVersion: "2.1.302"`，刚好绕开了探测，所以 CONTRACTS §49.19 的“重试一次”只在测试里成立。
  - 临时测试复现：缓存修订号 rev1，控制器已切到 rev2，空闲隧道已关。第二次调用返回 `conflict: The account Worker/CLI does not confirm the requested feature policy capabilities or CLI version.`，`desired` 仍在缓存中，路由仍指向 rev1。
- **触发条件**：本节点漏收 `account:changed` 或 `config:changed` 总线消息（总线是尽力而为的，§49.19），或其他节点已经把运行环境改到新修订号，并且此时没有可复用的空闲隧道。另外，在 3 s 内建不成新隧道也会触发：首个请求要完成 TCP、TLS、Upgrade、控制器侧 Docker inspect 和 HTTP。
- **影响**：
  - 网关把它当作传输错误（status 0），插件判为冷却 10 s 并切换账号（`classify.go:101-106`）。只有这一个账号时，客户端收到 502 `upstream connection failed`；
  - `desired` 要等 30 s TTL 过期才会重读，期间每 10 s 冷却结束后还会再失败一次；
  - 慢网络下的连接失败被记成“能力或版本不符”，误导排查方向。
- **修复建议**：
  - `requireCapabilities` 在 `client.Do` 出错时，如果是 `errors.Is(err, errAccountNotSynchronized)`，就原样返回；`forwardAttempt` 对探测返回的这个错误同样走 `notSynchronized()`；
  - 其他传输错误按传输错误上报，并 `forgetAccount`；
  - 探测超时至少与隧道建立上限一致；
  - 可以考虑在路由上缓存探测结果，用 Worker 启动标识或 healthz 里的 CLI SHA 作为失效条件，省掉每请求一次往返（见 F12）；
  - 现有缓存测试要补一组 CLIVersion=2.1.304 的用例。

### F3（P2）Worker 槽位写死为 4，与核心的账号并发上限不一致

- **证据**
  - `engine/runtime.go:160`：`Slots: make(chan struct{}, 4)`，不可配置，也没有告诉核心。
  - `migrations/0001_core.sql:261`：账号 `max_concurrency` 默认 10，网关按这个值发放槽位（`dispatch.go:341`）。
  - `request_command.go:191-200` 先 `io.ReadAll` 读完最多 32 MiB 的请求体，直到 `:296-303` 才检查槽位。
  - 槽位满时 `classify.go:120-134` 判为 `LocalFailure`，按 Retry-After=1 冷却约 1 s 并切换账号。
  - `controller_tunnel.go:153-157` 的注释写着“the account's concurrency is the core's slots”，与 Worker 实际只有 4 个槽位不符。
- **影响**：
  - 第 5 到第 10 个并发请求都要先把请求体（图片、长历史）完整上传一遍，再收到 429；
  - 每次 429 都让整个账号冷却不到 1 s，期间新请求也不会选这个账号，哪怕已有槽位空出来；
  - 单账号分组的客户端会看到 429 `Gateway concurrency limit reached`；
  - 资源类、额度类操作也共用这 4 个槽位（`resource_http.go:105`、`fallback_credit.go:129`）。
- **修复建议**：
  - 先鉴权并占槽，再读请求体；
  - 把槽位数做成配置并在 `/healthz` 里返回，核心按 `min(账号 max_concurrency, Worker 槽位)` 发放；或者在 ccgateway 账号表单里默认填 4，并限制上限。

### F4（P2）Worker 401 被当作上游凭据失效

- **证据**
  - `client.go:252-256`：注释写“A recreated runtime has a new Worker key; an upstream 401 only costs one connection lookup”，但代码只做了 `forgetAccount`，401 照样返回给网关。
  - Worker 返回 `401 authentication_error "Invalid gateway API key"`（`request_command.go:155-157`、`main.go:176-178`）。
  - 插件 `classify.go:113-119` 判为 `ACCOUNT_EFFECT_DISABLE` 加切换账号，`LocalFailure=false`。临时测试：`worker bad key 401: action=FAILOVER effect=DISABLE local=false`。
  - 网关 `dispatch.go:770-777` 把 DISABLE 降为冷却（60 s 默认冷却）；但如果管理员配置了 401 自动停用规则（§42），账号会被停用（`autoDisableAccount`）。
- **触发条件**：控制器的运行环境状态被重建，`state` 不存在时会生成新的 `api_key`（manager.py:704），而核心缓存的路由（以 key 和修订号为键）还带着旧 key。修订号由核心根据期望状态计算，状态重建后修订号可能不变，这时路由不会自动失效。这种情况不常见。
- **影响**：每次发生都会让一个账号冷却 60 s，甚至被停用，本来只需要重新查一次 connection。
- **修复建议**：
  - Worker 鉴权失败时附带内部来源头（例如 `x-ccgateway-error-source: gateway_auth`）；
  - 核心收到这种 401 时 `forgetAccount` 后在本次请求内重试一次。请求在 Worker 鉴权阶段就被拒，还没执行，有 GetBody 时重放是安全的；
  - 插件对这种 401 判 `LocalFailure`，不判 DISABLE。

### F5（P2）请求日志在账号级锁内做同步清理和大文件写入

- **证据**
  - `request_log.go:224-241`：`capture()` 在 `d.lock()` 内调用 `pruneRequestLogs(root)`。`d.lock()` 会同时持有 `store.mu`（`:36-47`），这把锁是整个账号（整个 Worker）共用的。
  - `pruneRequestLogs`（`:177-222`）对每个目录做 Stat 和 WalkDir。
  - `save()`（`:107-128`）在同一把锁内 `os.WriteFile` 请求体，最大 32 MiB（`request_command.go:228` → `d.request(raw…)` → `save("request.body")`）。
  - `diagnosticWriter.Write`（`:83-96`）的每个响应块都要先拿这把锁，再写给客户端。
  - `runtime.go:236-239` 每分钟已经清理一次，每请求的清理是重复的。
  - 实测（Windows NTFS）：3000 个请求目录、每个 6 个文件，一次清理 247 ms。日志保留 24 h，重度使用的账号一天几千个请求是常态，Linux overlayfs 上会快一些，但同样是 O(N)。
  - 另外，`main.go:71-74` 在鉴权之前就创建诊断目录并触发清理，未鉴权的请求也会产生 IO。
- **影响**：
  - 新请求进入时，同账号所有正在流式输出的请求都会停顿，停顿时长随保留的目录数线性增长；
  - 写大请求体时也会阻塞其他流。
- **修复建议**：
  - 删掉 `capture()` 里的同步清理，只保留定时清理；
  - `store.mu` 只保护 `enabled` 和 `active`，文件 IO 改用请求级锁，或者在锁外完成；
  - 诊断目录在鉴权之后再创建。
- **相关观察**：请求日志默认开启（`configureRequestLogs` 只看 disabled 标记文件），完整请求体和响应会在账号卷里保留 24 h、最多 512 MiB。是否默认开启属于隐私层面的产品决定，建议在文档或 UI 里明确说明。

### F6（P2）native 分支在生产中不可达，策略字段被静默忽略

- **证据**
  - `runtime.go:58-60`：`RequestMode` 为空时设为 `"build"`，`:162` 赋给 Gateway。独立命令 `main.go:648-651` 也一样。
  - `main.go:99-102`：`if g.RequestMode != "" { g.serveRequestCommand(...); return }`，所以 `:103-141` 的 `exchange`（admit、session、execute）只有测试会直接构造 Gateway 走到。
  - `2.1.304-IMPLEMENTATION.md:234` 写明“正式请求模式为 build／direct”。
  - deadcode（GOOS=linux，worker 入口）：原样就有 161 个 engine 函数静态不可达；在临时副本中删掉这段 native 分支后，增加到 274 个。增加的主要分布在 history.go、tool_result_context.go、session_branch.go、native_branch.go、message_ownership.go、gateway_attachments.go 等。runner_session.go 等仍被资源和额度相关路径引用。
  - 核心 `request_policy.go:12-38` 每次请求都下发 `erase_client_attachments`、`replace_client_attachments`、`thinking_disabled_compat`、`tool_search`、`custom_tool_prefix`、`unknown_field`，而 `serveRequestCommand` 只解析 `buildRequestPolicy` 里的 6 个字段（`request_command.go:38-45`）。`features/request_modes.go:39` 自己也写着“不启用旧 native 的附件擦除、工具前缀或字段忽略策略”。
- **影响**：
  - 大量不再执行的代码仍要维护，增加审计面；本次指定的 history、continuation、client_tools、tool_result_context、usage 大部分属于这类；
  - 管理端仍能保存这些不会生效的开关。记忆中线上开过 thinking_disabled_compat=omit，现在已不起作用。
- **修复建议**：
  - 删除 native exchange 分支及其独占代码，或至少用 build tag 隔离；
  - 核心不再下发请求模式不消费的字段，或在界面上标为“请求模式不支持”。与 02/03 号审核的界面和模型结论合并处理。

### F7（P3）控制器旧 v1/messages 中继已无生产调用方

- **证据**
  - `manager.py:80-81`：ROUTE 仍接受 `v1/messages(?:/count_tokens)?`；`:1579-1583` 为它保留了 3660 s 的特殊超时。
  - 核心里没有任何地方拼出 `/accounts/<key>/v1/messages`：搜索结果只有 `client.go:19`（虚拟 URL）和 `:227`（路径判断）；模型请求只走隧道（`request_cache.go:159-167`）。
  - 仍在用的只有 `integration_test.py:101`。文档还写着这条路径：`CONTRACTS.md:3095`（“模型请求 `/accounts/<key>/v1/messages`”）、`controller/README.md:137`。
  - 注意：同一个中继函数仍承载 `admin/*`，例如 `runtime_features.go:95` 的 `admin/features`，这部分不能删。
- **修复建议**：从 ROUTE 中去掉这两个路径和特殊超时，改写 integration_test 里的过期修订号用例（改测 tunnel 或 connection），并同步更新 CONTRACTS 和 README。

### F8（P3）任何 `Do` 错误都会清掉该账号的路由

- **证据**：`client.go:239-251`：只要 `client.Do` 返回错误，就调用 `forgetAccount`，客户端取消和等待响应头超时触发的 `ucancel` 也算。`forgetAccount`（`request_cache.go:207-220`）会增加全局 gen、关闭空闲隧道，并调用 `forgetBlocked()`（`accounts.go:393-397`）。
- **影响**：
  - 用户按 Esc 之类的取消很常见，每次都让下一个请求重新查 connection、新建 TLS 隧道；
  - 全局 gen 变化让其他账号正在加载的 cfg/desired 也不会写入缓存；
  - 已阻断的运行环境会在下一轮扫描时被重新 PUT。
- **修复建议**：`req.Context().Err() != nil` 时不清理；请求路径上不调用 `forgetBlocked`。

### F9（P3）控制器建隧道走 Docker API 并持有账号锁

- **证据**：
  - `manager.py:1043-1051`：`connection()` 在 `with self.guard(aid)` 内调用 `public()`；
  - `public()`（`:1013-1031`）至少调用 `owned(app)`、`owned(egress)`、`image_of(owned(app))` 三次容器 inspect，shared xray 模式下还要调用 `shared.healthy`，再加一次 `owned(app)`；
  - `guard` 是每账号一把 RLock（`:453-456`），`apply()` 全程持有它（`:750`），而 apply 可能要拉镜像、重建容器，耗时数十秒以上。
- **影响**：
  - 每条新隧道多出几十毫秒的 Docker 往返；
  - 同账号 apply 期间所有新隧道和 connection 查询都被阻塞，超过核心 15/30 s 上限后报连接失败，账号冷却 10 s；
  - 被阻塞的控制器线程要等 apply 结束才退出。
- **修复建议**：connection 和 tunnel 的检查只读内存里的 `online[aid]` 和 state 缓存，不调 Docker；锁用 `acquire(timeout=…)`，超时直接返回 409 或 503。

### F10（P3）Worker 本地错误格式偏离官方

- **证据**：
  - `request_error.go:195-200`：非 http 来源的帧编码为 `{"type":"error","error":{"type","code","message"}}`，比官方多出 `error.code`；
  - 非官方的 type：`configuration_error`（409，`request_command.go:180, 212, 241, 245`）、`gateway_credit_storage`（`main.go:263`）；
  - 自定义文本：`Invalid gateway API key`、`Gateway concurrency limit reached`、`Request exceeds 32 MiB`、`Cannot read body`、`CLI request timed out`；
  - 核心 409 `{"error":"not_synchronized"}`（F1）。
  - 插件只要看到 `error.type` 就原样透传（`classify.go:80-86`），所以这些字段会到达客户端。
- **影响**：不符合“尽量不改客户端结构、错误文字与官方逐字一致”的项目原则。
- **修复建议**：code 改放内部响应头；type 只用官方枚举；能对应官方错误的场景用官方文本（具体官方文本需要对照官方实测确认，本条中的文本对照标为存疑）。

### F11（P3）ReadTimeout 30 s 覆盖整个请求体

- **证据**：
  - Worker `server.go:32` 设 `ReadTimeout: 30 * time.Second`；
  - `request_command.go:191-199` 在 `io.ReadAll` 失败且不是 MaxBytesError 时返回 400 `Cannot read body`；
  - 插件对 400 走 default，`RETURN_TO_CLIENT`（临时测试：`worker read body 400: action=RETURN_TO_CLIENT`）。
- **触发条件**：核心到控制面板跨地域，吞吐低于约 1 MB/s 时，32 MiB 的请求体在 30 s 内传不完。
- **影响**：客户端收到 400，不切换账号也不重试。
- **修复建议**：放宽 ReadTimeout，或者只靠 ReadHeaderTimeout 加 `http.ResponseController` 设置 body 读取截止时间；读取超时映射为 408/5xx 本地错误，可切换账号。

### F12（P3）请求路径上的重复开销

- `request_policy.go:133`：`validateRequestPolicy` 每次调用都执行 `regexp.MustCompile`，而它在每个请求上都会被调用（`client.go:223`）。
- `feature_policy.go:255-260`：分组允许账号覆盖时，每个请求都查一次 `LoadAccountFeaturePolicy`，与 `request_cache.go` 开头“不再每次读库”的设计意图不一致。
- F2 的能力探测给每个请求加一次经 Caddy、控制器到 Worker 的往返。
- 建议：把正则提到包级变量；账号功能策略并入 `requestDesired` 缓存，账号变更时随总线失效；探测结果按路由缓存。

### F13（P3，设计选择）明文 HTTP 控制面板不限制目标

- `config.go:420-455`、`controller_config.go:145-153`：`scheme: "http"` 可以配给任意主机。这时 AdminKey、Worker key（connection 应答）和全部对话内容都以明文经过网络（§53.9 是用户决定）。
- 建议：限制为回环或私网地址；若必须支持公网明文，在界面上明确警告。

### 已核对且没有发现问题的点

- **请求头隔离**：manifest 只放行 3 个请求头（`manifest.json:81-85`，`ccgateway.go:112-122`）。核心删掉 Authorization，用 Worker key 覆盖 x-api-key，删掉 X-CCG-Revision（`client.go:236-238`）。Worker 只把 anthropic-version 和 anthropic-beta 传给 CLI（`request_command.go:319-328`）。Idempotency-Key 不会被转发，所以 Go Transport 不会重放 POST。
- **重试安全**：`forwardManaged` 只在拨号或查 connection 阶段出现 409 时重试，此时请求还没写出（`client.go:117-131`），不会重复执行或重复计费。网关切换账号只发生在上游明确失败之后。
- **SSRF**：`fetchConnection` 校验 IPv4、地址池、私网、端口 8787、修订号和 key 长度（`direct.go:84-90`）。controller 模式下真实连接由控制器按自己的 state 建立，核心给的目标只用于标识；隧道只允许拨到那一个目标（`controller_tunnel.go:121-124, 160-163`）。dialTunnel 拒绝含 CR/LF 的字段（`:28-30`）。
- **密钥比较**：Worker 用 `subtle.ConstantTimeCompare`（`main.go:56`、`auth.go:276`、`features.go:36`），控制器用 `hmac.compare_digest`（`manager.py:1451`）。核心只拿得到 Worker key，Worker 的管理接口需要 admin key，而 admin key 只在控制器手里，跨层隔离成立。
- **TLS**：只允许 HTTP/1.1，有固定 CA 时只信任这些根，否则用系统根（`controller_conn.go:43-92`）。
- **CLI 环境**：控制器给 Worker 设置了 `CCG_EXTERNAL_EGRESS=1`（manager.py:718），`proxy.go:186-197` 据此从 CLI 环境里去掉 CCG_API_KEY 和 CCG_ADMIN_KEY。
- **日志脱敏**：诊断日志对 Authorization、X-Api-Key、Cookie、X-CCG-Revision 打码（`request_log.go:165-173`）。控制器不记录请求（`log_message` 为空，manager.py:1265-1266）。
- **request_cache 串号**：路由以运行环境 key 为键，desired 以账号 id 为键；路由替换和 gen 竞争的处理正确（`request_cache.go:145-189`），没有发现跨账号串号的路径。
- **流式中断**：输出开始后出错时用 `ErrAbortHandler` 中止，不伪造干净的 EOF（`request_command.go:405-417`）；网关侧有 `TestCCGatewayInterruptedStreamReachesClientWithoutCleanEOF` 覆盖。

## 5. 测试覆盖评估

| 范围 | 已有测试 | 缺口 |
| --- | --- | --- |
| 核心请求缓存 / 重试 | `request_cache_test.go: TestRequestCacheControllerMode`（需要 PG；复用、过期修订号重试、总线失效、真的未同步时回 409） | 用的是 CLIVersion 2.1.302，没覆盖默认 2.1.304 下的探测（F2）；没断言 401 后 forget；没有并发请求和路由替换竞争的测试 |
| 核心隧道 | `controller_conn_test.go: TestControllerTunnel / TestControllerTunnelHTTP / TestControllerBasePath`（字节与 SSH 路径一致、409/503/伪 Upgrade、101 后紧跟的数据不丢、目标限制、头注入） | 隧道断开、空闲复用竞争、建立超时的用例没有 |
| 核心 connection 校验 | `direct_test.go`、`accounts_test.go` | 越界 IP、公网 IP、端口不对的拒绝缺少专门的表驱动用例（代码逻辑正确） |
| 网关 ccgateway | `gateway/ccgateway_test.go`（JSON/SSE 计费、未配置、API Key 拒共享运行环境），`ccgateway_error_stream_test.go`（中断流） | 409 not_synchronized、401、429 槽位满、传输错误时的切换账号和客户端可见错误都没有端到端断言（F1、F3、F4） |
| 插件分类 | `classify_test.go`、`scoped_quota_test.go` | 核心本地 409、Worker 鉴权 401 的分类没有测试 |
| 控制器隧道 | `test_tunnel.py`（流式加半关闭、Upgrade 头大小写、拒绝、停止的运行环境、不可达）、`test_headers.py` | 只能在 Linux 上运行（依赖 fcntl）；没有 apply 持锁期间建隧道的测试（F9） |
| Worker server | `server_test.go`、`features_test.go`、`worker_test.go`、`real_cli_test.go`（真实 CLI，可选） | ReadTimeout 与大请求体的组合没有测试（F11） |
| engine 请求模式 | `request_command_test.go`、`request_cancellation_test.go`、`request_error_test.go`、`request_mode_guard_test.go` 等 | 4 个进程级用例在 Windows 上 SKIP，只在 Linux 发布机运行；槽位满时请求体已被读完的问题没有用例覆盖（F3） |
| 请求日志 | `request_log_test.go`（并发 trace/metadata）、`request_log_limits_test.go`（核心侧） | 没有锁竞争和清理开销的测试（F5） |
| 全链路 | 文档记录过 Linux 上的真实 CLI 10/10 和 216 组合测试（2.1.304-IMPLEMENTATION.md:226, 244），但那是本地模拟上游 | 仓库内没有可重复运行的“网关 → 核心 → 真控制器 → 真 Worker → 假 CLI”集成测试，断线、超时、重试、并发边界都没有覆盖 |

## 6. 代码规范观察

- 几个 Go 文件的 import 没有分组，标准库和项目包混在一起，例如 `client.go:3-17`、`request_policy.go:3-9`、`worker/internal/worker/worker.go:3-14`、`worker/internal/server/server.go:3-11`。gofmt 不报错，但与项目其他文件的 goimports 风格不一致。
- `client.go:227` 的判断条件超过 300 字符，可抽成 `needsCapabilityProbe(policy, cfg)`；能力探测本身也应从 forwardAttempt 拆出去。
- `client.go:115` 的 `time.Hour+time.Minute` 和 Worker 的默认 1 h 分别写在两处，没有共享常量，以后改一边容易漏另一边。
- `manager.py` 有 1637 行，`handle_request` 约 170 行，里面混着路由、鉴权、旧中继和异常映射，建议按路由拆分。
- 注释质量高，大多写明了原因和 CONTRACTS 章节号。gofmt 和 vet 均无输出。

## 7. 未能验证的范围

- engine 的 4 个进程级 Linux 用例（`TestRequestCommandForwardsThroughExecutable`、`CancelsNativeProcess`、`StructuredStderrThroughProcess`、`MidStreamFailureAbortsHTTP`）在 Windows 上 SKIP；控制器 Python 测试因缺 `fcntl` 无法运行；本机没有 Docker 和可用的 WSL。
- 下面几项没有实测，只是代码推断：
  - Caddy 对 ccg-tunnel upgrade 连接的半关闭和超时行为，以及配置变化时是否会断开 upgrade 连接；
  - CLI 是否一定先完整写好 `response-meta.json` 再写 stdout（`requestCommandOutput.start` 依赖这一点）；
  - 请求模式下 CLI 是否会派生子进程（`CommandContext` 只杀主进程）。
- 多节点总线丢消息的实际频率，以及 F4 的触发频率（状态重建而修订号不变），都没有线上数据。
- 网关 `c.forward` 的 SSE 转发和计费细节归网关或计费审核，这里只核对了与 CCGateway 相关的接口点。
- engine 中资源（resources）、额度（fallback credit）、helper history 等旁路接口，只在 F3（共用槽位）和 F6（可达性）中涉及，没有逐行审查。
