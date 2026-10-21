# 12 交叉核验：请求转发链路、额度准入、控制器/出口容器、Worker 运行时设计权衡

核验日期 2026-10-21，基线 `feat/next-platform` HEAD `43d576838`。只读核验，没有改动源码或文档。

**方法**
- 三方材料都只当线索，每条结论回到源码重新判断。
- 写过两个临时测试：
  - `next/server/internal/ccgateway/zz_verify_path_test.go`：不连 PG，用现成的 `cachePanel` 假控制器和 httptest Worker，覆盖 7 种路由缓存错误路径；
  - `next/plugins/ccgateway/internal/ccgateway/zz_verify_path_test.go`：额度准入时间线和错误分类。
- 两个文件跑完都已删除。`git status --short` 里还剩 `server/internal/{account,ccgateway}/zz_verify_config_test.go`，属于同一会话的 verify-config 核验员，不是本报告产生的。

**与线上的关系**
- 线上源码是 `9dfcb60b9`。下面这些文件在 `9dfcb60b9..HEAD` 之间完全相同：`availability.go`、`classify.go`、`account/quota*.go`、`request_cache.go`、`cli_updates.py`、`network.py`、`xray-egress/service.py`、`request_log.go`。
- `client.go` 和 `runtime_features.go` 只改了 `d.unavailable()` 一处，与本主题无关。
- `manager.py` 的变化只有未推送的卷配额提交 `43d576838`。
- 结论：除 F-10、F-11 外，本表各条都对线上成立。

## 1. 核验表

| # | 结论（来源） | 判定 | 修正严重度 | 关键证据 | 线上 |
|---|---|---|---|---|---|
| 1 | 409 `not_synchronized` 没有 `error.type`，分类为 RETURN_TO_CLIENT，不切换账号（M-L4 / 04-F1；A、B 漏报） | **成立** | P1（与 L3 叠加；单独看是 P2） | 响应体见 `client.go:261-263`；`classify.go:83-86` 设置 `ClientErrorType=invalid_request_error`、消息为空；`:144-147` 走 default。实测 `action=ACTION_RETURN_TO_CLIENT effect=UNSPECIFIED clientType="invalid_request_error" clientMsg=""`，网关补成 `upstream returned HTTP 409`（`dispatch.go:740-749`） | 是 |
| 2a | 只要 `client.Do` 出错就清掉该账号的路由（M-04 F8） | **成立**，范围限于模型请求那一次 `Do` | P3 | `client.go:239-251`。实测：传输错误和客户端取消后都是 `route=<none> desiredCached=false`。取消返回的错误统一是 `CCGateway model request failed`，与真正的传输错误无法区分 | 是 |
| 2b | 能力预检抢先碰到 409，“重试一次”失效，过期路由留在缓存（M-04 F2） | **成立**，影响时长需要补充 | P2 | `runtime_features.go:51-81` 吞掉所有错误，统一返回 ErrConflict；`client.go:228-231` 直接返回，不 forget、不 Kick、不标 stale。实测：`conflict: …capabilities…`，`route=aaaa`、`desired` 仍在缓存，`+tunnels=1`（没有重试）。补充：修订号变化时最多持续 30 s（desired TTL）；**修订号不变**时（容器重启后 `public()` 执行 `online.pop`，`manager.py:1015-1026`）要等 60 s 一次的 reconcile（`accounts.go:521`），因为预检不调用 `Kick` | 是 |
| 2c | 漏收配置广播时会继续连接旧控制器（B-F09；M 漏报） | **成立** | P2（概率低，但没有时间上限） | 路由只按运行环境 key 和修订号复用（`request_cache.go:148`），修订号不含控制器 host/port/CA/key（`accounts.go:130-146`，`network.go:57-73`）；旧 cfg 固化在 `pooledTunnelClient` 的闭包里（`controller_tunnel.go:158-164`）。实测：传入新 cfg，`same route object=true` | 是 |
| 2d | 预检遇到 401 或连接失败时不清除旧路由（B-F10） | **部分成立**：401 的前提不成立；连接失败不清路由属实 | P3（单独看；危害已并入 2b、2c） | 真实 Worker 的 `/healthz` 在鉴权之前就返回（`engine/main.go:66-70`，`worker/server.go:27` 把 `/` 交给 Runtime → Gateway），所以 key 不对也回 200，预检**不会**遇到 401。B 的复现用的是返回 401 的假 Worker。隧道层失败（409、控制器 401、拒绝、超时）不清路由，实测属实；其中有害的就是 2b 和 2c | 是 |
| 3a | 窗口重置后最长约 30 分钟拦截（M-L6 / 03-F-01；A、B 漏报） | **成立**，M 没有高估 | P1 | `availability.go:143-145`；`quota_refresh.go:91-93` 把插件建议的 reset+1s 钳到 now+30m；`quota_refresh_test.go:649-655` 把钳制写成了断言。实测：T+9m 为 AVAILABLE，T+10m2s 和 T+29m 都是 `UNKNOWN quota_reset_unconfirmed:5h`。没有其他刷新途径：manifest 的 quota 里没有 `headers`（`manifest.json:34-43`），被动采样 `observeQuota` 不触发；唯一的被动来源是 429 原生额度观测，它只写入 rejected 窗口，不更新 `updated_at` | 是 |
| 3b | 一次查询失败，账号 30 分钟不可调度（M-L7 / 03-F-02） | **成立** | P1（实际轻重取决于 usage 接口的失败率，至少 P2） | `availability.go:123-126`；`quota_refresh.go:84-85` 的退避是 `min(30m·2^n, 30m)`。实测：快照只有 1 分钟老，也是 `UNKNOWN quota_refresh_failed`；只有 `token_expired` 豁免 | 是 |
| 3c | 快照有效期等于查询周期，每轮都有 UNKNOWN 空窗（03-F-03） | **成立** | P2 | 插件的 `quotaRefresh=30m`（`quota.go:21`）；核心 `next_check_at` 是完成时间 +30m；扫描每 5 s 一次、并发 4、每批等 `wg.Wait`（`quota_refresh.go:193-317`）。实测 T+30m 为 `UNKNOWN quota_stale` | 是 |
| 4 | 每账号 egress 容器没有 CPU 限制（A-C5） | **成立**（代码层面），A 定的 High 偏高 | P3 | `manager.py:819-827` 只有 `mem_limit='128m'`；`common()`（`:498-502`）没有 `nano_cpus`；app 容器有（`:738`），shared egress 也有（`shared_egress.py:173`）。sing-box 只承载单个账号受 4 槽位限制的流量，属于加固项 | 是（使用每账号 egress 时） |
| 5 | `iterdir()` 抛异常会杀死自动更新线程，而且没有日志（A-C9） | **部分成立**：线程会死，“没有日志”不对，实际影响约等于零 | P3 | `cli_updates.py:182-190` 的 `iterdir()` 确实在 suppress 外面。但 Python 默认的 `threading.excepthook` 会把 traceback 打到 stderr，也就是容器日志。另外自动更新默认关闭：provision 写入 `auto_update:false`（`manager.py:715`），核心下发 `disable_auto_update`，`start(automatic=True)` 在 `auto_update` 为假时直接返回（`cli_updates.py:93`） | 线上存在但无影响 |
| 6-T1 | credit、结构化输出、ToolSearch、WebSearch 被缓冲成非流式（A） | **在生产路径上不成立 → 死代码问题** | P3（死代码） | `bufferCreditEvent`、`admitCredit` 都是 `*exchange` 的方法（`fallback_credit.go:90,277`），exchange 只在 `main.go:103` 构造，而 `main.go:99-102` 只要 `RequestMode` 非空就提前返回；`NewRuntime` 和独立入口都把空模式改成 build（`runtime.go:58-60`，`main.go:648-651`），`validateRequestMode` 只接受 direct/build。build/direct 路径每块都 Flush，A 对这部分的判断正确 | 否 |
| 6-T2 | 缺少策略头时退化为多轮（A） | **不成立** | — / P3（死代码） | 请求模式下没有策略头时，`requestMode = g.RequestMode`（build），照样只执行一次 `claude request`（`request_command.go:150,160-168,315`）。多轮只存在于不可达的 exchange。核心对模型请求总是设置策略头（`client.go:233-234`） | 否 |
| 6-T3 | passthrough 换模型重发（A） | **死代码** | P3 | `main.go:398-420` 属于 exchange 路径 | 否 |
| 6-T4 | 请求日志明文保存（A） | **成立**。A 写的“开启后”不对：**默认开启** | P2（隐私，需要产品决定） | `configureRequestLogs` 只检查 `request-logs.disabled` 是否存在（`request_log.go:152-163`）。build/direct 同样经过 `capture`（`main.go:71-74`），每请求上限 64 MiB，24 小时内软上限 512 MiB（`request_log.go:136,175,216`） | 是 |
| 6-T5 | 身份映射密钥可以枚举（A） | 不在本主题，等同 M-B4 | — | 交给身份核验员 | 未推送 |
| 6-T6 | 同一会话的并发请求不串行（A） | **死代码** | P3 | `main.go:108-109` 在 exchange 里。请求模式下每个请求都是独立的 CLI 进程，服务端不保存会话历史，不存在“合并顺序污染” | 否 |
| 6-T7 | controller key 等于宿主机 root（A） | **成立**（信任模型内的设计） | P3（应写进文档） | `upgrade.py:165-169` 以 host 网络加 docker.sock 读写权限运行任意通过 `valid_image` 校验的镜像；核心持有这个 key | 是 |
| 7-F3 | Worker 槽位写死为 4，账号并发默认 10（M） | **成立** | P2 | `runtime.go:160`；`0001_core.sql:261` 默认 10；先 `ReadAll` 最多 32 MiB（`request_command.go:191`），之后才检查槽位（`:296-303`）。实测槽位满的 429：`FAILOVER/COOLDOWN local=true` | 是 |
| 7-F4 | Worker 的 401 被当作凭据失效（M） | **成立**，而且确实能触发（因为 `/healthz` 不鉴权，预检会放行） | P3（触发条件少见） | 实测 `worker-401-bad-key action=FAILOVER effect=DISABLE local=false`；`client.go:252-256` 只做 forget，不重试 | 是 |
| 7-F5 | 请求日志在账号级锁内做清理和写入（M） | **成立**，严重度偏高 | P3（247 ms 是 NTFS 上测的，Linux 未测） | `capture()` 在 `d.lock()` 内调用 `pruneRequestLogs`（`request_log.go:224-241`），每个响应块都要拿同一把锁（`:83-96`），定时清理已经每分钟一次（`runtime.go:236-239`） | 是 |
| 8-F10 | 卷配额：ext4 上新建和重新授权都会 503（M） | **成立** | P2（`43d576838` 的发布阻断项） | 重新授权用新的 `d`+16 hex 草稿 key（`drafts.go:45,169`，`CCGATEWAY-REAUTH.md:20`），state 为 None，于是 `legacy=False`（`manager.py:660`），`account_volume` 创建卷时遇到 `no quota support` 抛出 DiskQuotaUnavailable，返回 503（`:358-370,1613-1616`） | 否（未推送） |
| 8-F11 | 内存降到 1 GiB（M） | **存疑**（没有数据），M 的判断准确 | P3 | `manager.py:738` 为 `mem_limit='1g'`，4 个槽位 | 否（未推送） |
| 9 | DNS 截断应答丢了 question 段（M-X1） | **成立** | P3（潜在） | `service.py:81-82` 生成 `answer[:2]+flags+\x00*8`，qdcount=0。Go 的 `dnsPacketRoundTrip` 在 `p.Question()` 失败时继续等待；glibc 的 `res_queriesmatch` 比对 qdcount，不一致就丢弃（TC 检查排在它之后），结果是等到超时，不会改走 TCP。只影响 shared xray 出口，而且应答要超过 1232 字节 | 只在用 shared xray 时 |
| 10 | A 的“安全已核对”清单 | **大体成立，有三处需要补充** | — | ① 直连出口不屏蔽宿主机自身的公网 IP，记忆里的这条仍然成立：`network.py:85-97` 直连时只 drop 私网和特殊地址，然后 accept 所有 IPv4 TCP；`business_rules` 同样如此（`:141-153`）。② “user=1000:1000”只适用于 app；egress 以 root 运行并带 `NET_ADMIN`（`manager.py:819-827`）。③ Worker `/healthz` 不鉴权（`main.go:66-70`，A 自己的 C10 也指出了）。其余几项属实：控制器绑 127.0.0.1、key 至少 32 位（`manager.py:1627-1629`）、`hmac.compare_digest`（`:1450`）、ConstantTimeCompare（`main.go:56`）、代理模式下 egress 只放行固定的代理 IP:port（`network.py:100`）。“激活必须经代理 probe”本次没有核 | 是 |

## 2. 争议条目详细论证

### 2.1 路由缓存的错误路径（第 2 项）：三方说法并不矛盾

`forwardAttempt` 里有两次 `client.Do`，处理方式正好相反：

| 阶段 / 错误 | 处理 | 位置 |
|---|---|---|
| `requestDesired` 读库失败 | transportError；路由不动 | `client.go:166-169` |
| `route()` 未命中 → `fetchConnection` 返回 409 | `notSynchronized()`：forget + Kick；desired 来自缓存时标 stale 并重试一次，否则返回 409 响应 | `client.go:203-205`，`direct.go:71-72` |
| `fetchConnection` 其他错误或校验失败 | transportError；这时还没有缓存路由 | `client.go:207` |
| 在加载期间路由被失效（gen 变化） | 本次请求照常使用，但不写入缓存（`closed=true`） | `request_cache.go:171-175` |
| 策略解析或校验失败 | `finish()`；路由保留 | `client.go:218-226` |
| **能力预检**：传输错误、隧道 409、控制器 401、非 200、版本或能力不符 | **一律 ErrConflict；不 forget、不 Kick、不标 stale；路由和 desired 都保留** | `runtime_features.go:59-80`，`client.go:228-231` |
| **模型请求 `Do`** 返回 errAccountNotSynchronized | `notSynchronized()` | `client.go:243-245` |
| **模型请求 `Do`** 其他错误，包括客户端取消 | **forgetAccount**：gen++、删除 desired 和路由、关闭空闲隧道、`forgetBlocked()` | `client.go:246-247`，`request_cache.go:207-220` |
| 模型响应 401 | forgetAccount，401 照样返回 | `client.go:252-256` |

临时测试的原始输出：

```
probe-409-stale-cached-revision  err=…conflict: The account Worker/CLI does not confirm… | route=aaaa/key=kkkk desiredCached=true | +connections=0 +tunnels=1
probe-401 (假 Worker)            call0/call1 同上，route 保留
probe-transport-failure          call0/call1 同上，route 保留
model-do-transport-error         err=CCGateway model request failed | route=<none> desiredCached=false
model-401                        status=401 | route=<none> desiredCached=false
model-client-cancel              err=CCGateway model request failed | route=<none> desiredCached=false
config-change-missed-route-reuse same route object=true
```

三种说法各自对应其中一部分：
- M-F8（“任何 Do 出错都清”）说的是第二次 `Do`，清得过于积极；
- M-F2 和 B-F10 说的是第一次 `Do`（预检），又完全不清；
- B-F09 说的是路由的键里没有控制器配置。

所以三者不矛盾，合起来就是同一个缺陷：两次 `Do` 对错误的处理不对称。

B-F10 有一处前提错误：真实 Worker 的 `/healthz` 不鉴权，所以它的复现（假 Worker 对 `/healthz` 回 401）在生产中不会出现。Worker key 不对时，预检照样通过，接着模型请求得到 401，这时会 forget。这正是 M-F4 的路径，所以 M-F4 是可以触发的。

预检吞错误的真实危害有两种：
1. 2b：缓存的修订号过期，或者修订号没变但控制器那边 online 被清掉，一律报成“能力冲突”。网关把它当传输错误，冷却 10 秒后切换账号，而且不触发 Kick；
2. 2c：控制器的地址或 key 换了，而本节点漏收了广播。所有账号的旧路由都无法自愈，只有再保存一次配置、账号变更或者重启进程才能恢复。

修复：
- 预检遇到 errAccountNotSynchronized 时走 `notSynchronized()`；
- 预检遇到其他隧道层错误时 forget；
- 路由的键里加入控制器连接指纹；
- 模型请求的 `Do` 在 `req.Context().Err()!=nil`（客户端取消）时不要 forget。

### 2.2 409 not_synchronized（第 1 项）

只有在**路由未命中**、修订号又是刚从库里读出来的时候，才会把 409 返回给客户端。路由已命中时，同样的不同步会被预检吞掉，变成切换账号（2b）。

路由未命中的情况包括：
- 账号保存后修订号变化（L3 会让这种情况变得很常见）；
- 任何一次 forget 之后的第一个请求，例如客户端刚取消过（2a）、刚遇到过传输错误；
- 新账号的第一批请求。

所以 L4 和 F8、L3 是互相放大的关系。M 把 L4 定为 P1，成立。

### 2.3 额度准入（第 3 项）：A 和 B 漏报，M 没有高估

- 准入快照的新鲜度完全靠每 30 分钟一次的主动查询：
  - ccgateway 的 manifest 没有声明 quota `headers`，网关的 `observeQuota`（`dispatch.go:657-666`）不会触发；
  - 唯一的被动来源是 429 原生额度观测（`classify.go:122`），而且它只写入 rejected 窗口，不更新 `updated_at`（`store/account_quota.go:165-181`）；
  - 没有任何“reset 之后立刻复查”的路径。
- 核心把 UNKNOWN 当作 503（`gateway/availability.go:45-50,170-182`）。所有账号都 UNKNOWN 时，单账号分组直接失败。
- 活跃账号每次 5h 窗口重置，平均被拦约 15 分钟，最长 30 分钟，约占 5% 的时间；7d 系列窗口的重置同理。
- 测试 `quota_refresh_test.go:651` 和 `availability_test.go` 把这两种行为都写成了期望值，修复时要一起改。
- F-02 的实际轻重取决于 `/api/oauth/usage` 返回 429/5xx 的频率，以及代理抖动的频率，本次没有线上数据，所以写成“P1，至少 P2”。

### 2.4 A 的设计权衡在生产路径上的可达性（第 6 项）

- 生产 Worker 的 `RequestMode` 永远非空，取值只能是 direct 或 build。
- `Gateway.ServeHTTP` 在构造 exchange 之前就转进 `serveRequestCommand`。
- 所以以下几项只存在于不可达的 native exchange 里，应归入 06 号报告的死代码清理，不再作为运行时承诺问题：
  - T1 中的 credit、结构化输出、ToolSearch、WebSearch 缓冲；
  - T2 的“缺头即多轮”；
  - T3 的跨模型重发；
  - T6 的同会话并发合并。
- T2 的说法本身就是错的：请求模式缺少策略头时，仍然只执行一次 build。
- 在生产路径上仍然成立的只有 T4（而且是默认开启）和 T7（信任模型）。

### 2.5 A-C5 / A-C9 的严重度

- C5：代码属实。但 egress 只转发单个账号的 HTTPS 流量，这个流量本身被 4 个槽位限制住，内存还有 128 MiB 上限。CPU 打满要靠异常或攻击才会出现，属于加固项，定 P3，不是 High。
- C9：异常路径属实。但“无日志”不对，线程死时会打印 traceback。而且线上默认 `auto_update:false`，这个线程实际上什么也不做。

## 3. 三方在本主题的准确度

**M（主控）：准确度最高。**
- L4、F2、F3、F8、F10、F11、X1 以及额度 F-01、F-02、F-03 全部核实成立，证据行号准确。
- 不足：
  - F2 只写了修订号变化时“最多 30 s”，没有覆盖修订号不变、online 被清的情况（要等 60 s 一次的 reconcile，期间没有 Kick）；
  - 漏掉了 B-F09（路由键里没有控制器配置）；
  - F5 的 P2 根据 NTFS 上的测量，略偏高。

**A：代码层面的观察大多属实，但没有区分生产可达性，严重度偏高。**
- C5、C9 属实，但分别是 P3 加固项、几乎无影响。C9 写的“无日志”不对。
- T1、T2、T3、T6 都落在死代码上，其中 T2 的“缺头退化为多轮”在生产中不成立。
- T4 写成“开启后”，实际默认开启。
- 完全没有覆盖额度准入（L6、L7）和 409 不切换账号（L4）。
- 安全清单基本正确，但漏了直连出口不屏蔽宿主机公网 IP、egress 以 root 运行并带 NET_ADMIN 这两点。

**B：在这个主题上发现少，但有一条独有的有效发现。**
- F09（漏收广播后继续走旧控制器）成立，是 M 和 A 都没有提到的。
- F10 的 401 前提不成立（假 Worker 的 `/healthz` 回 401，与真实实现不符），连接失败那部分属实，但危害已经包含在 M-F2 和 F09 里。
- 漏报 L4、额度准入、Worker 槽位。
