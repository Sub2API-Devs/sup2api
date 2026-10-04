# 2026-10-04 审计问题总表（供评估）

8 份报告中的全部问题汇总在这里，一行一条。重复发现合并为一条，并用"同"注明出处。
详细的触发场景、证据和改法见各分报告（编号前缀对应：UI=01、FE=02、FG=03、BE=04、PL=05、AR=06、RL=07、SEC=08）。

**评估方法**：在"决定"列填写 `✅ 做` / `⏸ 延后` / `❌ 不做`，有补充可以直接写在后面。
**工作量**：S ≤ 半天，M 1–3 天，L > 3 天，XL > 1 周。
**路线图阶段**（见 00-SUMMARY）：0 护栏、1 稳定性、2 安全、3 资金、4 前端、5 后端/插件抽象、6 功能。

---

## 一、稳定性与容量（阶段 1）

| ID | 级 | 问题 | 位置 | 量 | 决定 |
|---|---|---|---|---|---|
| RL-P0-1 / PL-P0-1 | P0 | Execute 在整条流期间都占着插件信号量（默认 64）。单节点单插件最多 64 个在途请求，第 65 个请求 failover 后返回 503；预扣估算也排在同一个信号量上，长流一多就会全站 500 | `grpcruntime/execute.go:193`、`runtime.go:90`、`app.go:226` | S | |
| PL-P0-2 | P0 | 插件升级或重启时只 Drain 30 秒，之后杀掉进程，正在进行的长流被截断 | `grpcruntime/instance.go:589`、`rollout/controller.go:110` | M | |
| AR-P0-1 | P0 | 准入看门狗每秒查一次 PG，超时 1 秒，查询出错也当成"准入被撤销"，进入不可逆排空。PG 抖 1 秒就会让 4 个核心全部重启（文档写的是 15 秒） | `app/managed.go:260-291`、`managed_checks.go:204` | M | |
| AR-P0-2 | P0 | 网关每个请求都同步调用核心 `/v1/status`，每次约 17 条 PG 查询，超过 1 秒直接返回 503 | `gateway/.../main.go:259`、`proxy/router.go:148,169,208`、`managed_checks.go:221` | S–M | |
| AR-P1-1 | P1 | 节点间转发时每个请求直查 PG 和 Redis（约 25 条查询），并且每次新建 TLS 连接（DisableKeepAlives） | `peer/peer.go:292-357`、`control/store.go:804-899`、`router.go:75` | M–L | |
| AR-P1-2 | P1 | pgxpool 没有设置 MaxConns，ovh 上每个池可达 384 个连接，而 PG 的 max_connections 是 100 | `store/db.go:27`、`gateway main.go:104` | S | |
| PL-P1-5 | P1 | 插件实例只有一个信号量，热路径、控制台、后台任务、迁移共用，慢调用会饿死热路径 | `grpcruntime/runtime.go:41-67` | S | |
| PL-P1-6 | P1 | 插件实例超过重启预算后进入 Failed，只要期望状态不变就永远不会自动恢复 | `rollout/reconcile.go:401`、`instance.go:440,495` | S | |
| PL-P1-4 | P1 | 每次 HostService 调用都查 PG 校验授权，moderation 的钩子在热路径上因此每个请求多一次 PG | `grpcruntime/host.go:46-64` | S | |
| PL-P1-3 | P1 | EstimateUsage 默认实现来回调用（核心→插件→核心 CountTokens） | `pluginsdk/estimate.go:25`、`gateway/precharge.go:36` | S | |
| RL-P1-1 | P1 | 上游 SSE/body 没有空闲超时，上游卡住时槽位永远不释放，也没有 ping 保活 | `forward.go:306-385`、`dispatch.go:438` | S | |
| RL-P1-2 | P1 | WebSocket 回合没有超时，回合进行中空闲计时器被跳过 | `websocket.go:228,558` | S | |
| RL-P1-7 | P1 | 槽位续租只要失败一次（Redis 抖动 3 秒），本节点所有在途请求就会被取消，而且被误记为 client_canceled | `cluster/slots.go:239-250` | S | |
| RL-P1-6 | P1 | 预扣（2 个 PG 事务）发生在用户并发槽之前，被拒的请求也会白写一次账，形成 DoS 面 | `pipeline.go:172-184` | S | |
| RL-P1-8 | P1 | 每个请求要同步完成 3 个 PG 事务、锁 2 次余额行、写 3 条 ledger | `billing/precharge.go:46`、`usage/executions.go`、`settler.go` | M–L | |
| RL-P1-9 | P1 | ccgateway 托管模式下，每个请求都要读库、解密、新建 SSH 隧道，并且有 4 分钟硬上限 | `ccgateway/client.go:82-112` | M | |
| RL-P1-10 | P1 | API Key 鉴权每个请求都做一次 PG 4 表 JOIN，没有缓存；PG 故障时全站鉴权失败 | `apikey/apikey.go:226-249` | M | |
| BE-P1-14 | P1 | 列表每页都对全表 count(*)，usage 用 OFFSET 分页；page 参数没有上限，过大时会溢出成负数 OFFSET，导致 500 | `usage/api.go:228`、`respond.go:53` 等 9 处 | M | |
| BE-P1-15 | P1 | 账号列表每一行都查一次 Redis（N+1，每页最多 200 次） | `account/handlers.go:228` | S | |
| BE-P1-13 | P1 | 缺索引：`usage_logs.client_request_id`、`api_keys.group_id`、`audit_logs.action` | 迁移 | S | |
| AR-P2-10 | P2 | 共享 Redis 没有持久化、noeviction 200MB，而且属于另一个 compose 项目；对 single 执行 down 会连带停掉集群的 PG 和 Redis | `deploy/single/compose.yml:33` | M | |
| AR-P2-15 | P2 | 网关周期性查询多且重复（Heartbeat 每秒和每 3 秒各一次，peerCache 每 3 秒一次） | `engine.go:40-185`、`main.go:232` | S | |
| RL-P2-9 | P2 | 设置的 TTL 缓存没有 singleflight，过期瞬间并发请求都打到 DB；出错时没有负缓存 | `gateway/settings.go:139`、`sticky.go:156`、`billing/settings.go:43` | S | |
| RL-P2-7 | P2 | 每次 attempt 都做一次 DNS 解析，走代理时也在本地解析 | `dispatch.go:381`、`netguard.go:73` | S | |
| RL-P2-8 | P2 | 限流器先查 `TIME` 再执行脚本，多一次 RTT；每次选号都重新查 Exhausted | `account/limiter.go` | S | |
| RL-P2-10 | P2 | `cloneUsage` 通过 JSON 往返做深拷贝，int64 会变成 float64 | `execute.go:254` | S | |
| RL-P2-11 | P2 | 非流式响应被 forwardJSON 和 spool 各缓冲一份，最坏占用 2 倍内存 | `forward.go:162`、`spool.go` | M | |
| RL-P2-12 | P2 | `io.ReadAll` 没有按 Content-Length 预分配 | `pipeline.go:255` | S | |
| RL-P2-13 | P2 | 每个 SSE 事件做 2–3 次 gjson 校验和解析 | `forward.go:313`、`usagerules.go:258,300` | S | |
| RL-P2-14 | P2 | 没有 id 的 hook 每次调用都做一次 reflect.DeepEqual | `hooks.go:360` | S | |
| RL-P2-16 | P2 | 网关路径没有 recover；http.Server 没有设置 IdleTimeout；requestGate 每个请求加一次互斥锁 | `app.go:340,383`、`lifecycle.go:23` | S | |
| RL-P2-20 | P2 | 记录确认失败时直接断开连接，PG 故障期间客户端会重试，导致上游被重复消耗 | `gateway/execute.go:143` | S | |
| RL-P2-21 | P2 | 没有并发等待队列，槽位满了直接返回 429 | `dispatch.go:89` | M | |

## 二、转发正确性与账号调度

| ID | 级 | 问题 | 位置 | 量 | 决定 |
|---|---|---|---|---|---|
| RL-P1-4 | P1 | `stick` 规则在绑定账号忙或被限流时仍会换号并改写绑定，违反 CONTRACTS §18.1，prompt 缓存失效 | `dispatch.go:157-183,79-84` | S | |
| RL-P1-3 | P1 | SSE 流内的 error 事件（例如 overloaded）不会触发账号冷却，而 WS 路径会 | `forward.go:76` | S–M | |
| RL-P2-1 | P2 | 粘性 `hit` 在 failover 后没有复位，命中统计偏高，并且跳过了插件的 RankAccounts | `dispatch.go:172`、`rank.go:73` | S | |
| RL-P2-2 | P2 | "类型不可转换时保留绑定"这条注释和实际行为不一致 | `dispatch.go:168`、`sticky.go:416` | S | |
| RL-P2-3 | P2 | WS 复用账号前不检查账号是否在冷却或已禁用 | `websocket.go:588` | S | |
| RL-P2-4 | P2 | WS 的用户槽租约 ctx 被丢弃，租约丢失后回合不会被取消 | `websocket.go:347` | S | |
| RL-P2-5 | P2 | 核心侧的取消（租约丢失、空闲超时）都被记成 client_canceled/499 | `forward.go:93` | S | |
| RL-P2-15 | P2 | 上游响应头只透传 Content-Type，request-id、ratelimit 等都丢了 | `forward.go:162,240` | S | |
| RL-P2-17 | P2 | header 转小写 map、fields 构造各重复写了 3 份 | `dispatch.go`、`execute.go`、`websocket.go` | S | |
| RL-P2-18 | P2 | 错误码到 usage error_type 的映射分散在多处，HTTP 和 WS 的兜底条件不一致 | `pipeline.go:386`、`dispatch.go:125`、`websocket.go:459` | S | |
| RL-5 | P1 | 账号惩罚太粗：anthropic 遇到 401/403 立即永久禁用（sub2api 是先冷却、计数后再禁用，并排除 CF 拦截）；没有"账号×模型"粒度的冷却 | 07 §5 | M | |

## 三、资金与计费正确性（阶段 3）

| ID | 级 | 问题 | 位置 | 量 | 决定 |
|---|---|---|---|---|---|
| RL-P1-5 | P1 | 客户端在最后一个 SSE 事件前断开就能少付 output token；OpenAI 的 usage 在最后一个 chunk 里，可能完全免费 | `forward.go:93`、`execute.go:159` | M | |
| BE-P1-4 | P1 | 账本幂等只按 key 去重，不核对 user、金额、类型；key 冲突时静默 no-op，还会返回另一个用户的余额 | `billing/ledger.go:106-154` | S | |
| BE-P1-5 | P1 | 预扣复制了一份 `usage.priceOf` 的计价逻辑，两份会逐渐漂移 | `billing/precharge.go:20` vs `usage/settler.go:692` | S | |
| BE-P1-6 | P1 | 余额门槛两处判断不一致：一处用 `>`，一处用 `>=` | `precharge.go:57` vs `ledger.go:208` | S | |
| BE-P1-7 | P1 | 释放过期预扣时遇到第一个错误就 return，一条坏数据会卡住后面所有记录 | `precharge.go:126` | S | |
| BE-P2-10 | P2 | 管理员调整余额的金额没有上限，超过 numeric(20,8) 时返回 500 | `billing/balance.go:155` | S | |
| BE-P2-9 | P2 | 创建 Key 时，分组可用性检查和 INSERT 不在同一个事务里，期间分组被删会触发 FK 错误并返回 500 | `apikey/apikey.go:445` | S | |
| RL-P2-19 | P2 | 旧路径批量插入后，对每条记录单独开一个结算事务 | `usage/settler.go:286` | M | |

## 四、安全（阶段 2，完整清单见第十二节）

| ID | 级 | 问题 | 位置 | 量 | 决定 |
|---|---|---|---|---|---|
| SEC-C1 / PL-P0-3 | 严重 | 插件 egress 默认 allow_all，不拦内网、回环、元数据地址，也不检查是否授予了 `net`；Redis 没有设置密码 | `plugin/egress/egress.go:197,344`、`instance.go:374` | M | |
| SEC-H1 / BE-P0-1 | 高 | `user:update`（非敏感权限）可以重置管理员密码并接管账号；CONTRACTS §5.2 有缺口 | `iam/users.go:212-335` | S | |
| SEC-H2 | 高 | `role:manage` 和 `plugin:install`（通过 consent）可以授予持有者自己没有的权限 | `authz/roles.go:191`、`install/consent.go` | S–M | |
| SEC-H3 | 高 | `own` 级账号可以绑定任意分组、自设优先级和权重，借此把别人的流量引到自己的上游 | `account/handlers.go:605-630` | S–M | |
| SEC-H4 / BE-P0-2 | 高 | 价格同步源存在 SSRF，并且会回显内网响应 | `billing/sync.go:176,388,849` | S | |
| SEC-M7 / BE-P1-1 | 中 | 代理 host 和代理测试可以打到内网，`own` 级用户就能用来扫描端口 | `proxy/proxy.go:441,652` | S | |
| BE-P1-3 / RL-P2-6 | P1 | netguard 和 proxy dialguard 两份内网黑名单已经漂移，可以绕过 | `netguard.go:89`、`proxy/dialguard.go:22` | S | |
| PL-P0-4 | P0 | 插件沙箱和核心使用同一个 UID，可以读到核心 `/proc/pid/environ` 里的主密钥和 DSN，也没有文件系统隔离 | `sandbox/exec_linux.go`、`seccomp_linux.go` | S（dumpable）/ M（Landlock） | |
| PL-P0-5 | P0 | 数据库不能 CREATEROLE 时，申请 `db.schema` 的插件拿到的是核心连接串，相当于全库读写 | `dbschema/dbschema.go:99,226` | S | |
| PL-P0-6 | P0 | `platform.register`、`gateway.endpoint`、`scheduler`、`ui.*` 被标成 optional 并在同意页拒绝后，运行时照样生效 | `check/validate.go:151`、`registry.go:276,320`、`api/ui.go:80` | S | |
| BE-P1-2 | P1 | step-up 和改密码接口没有失败限速，可以在线爆破 | `iam/http.go:21,90`、`auth.go:250` | S | |
| BE-P1-9 | P1 | 用户、角色、分组、价格、全局设置的变更都没有审计日志 | iam/authz/group/billing/gateway | M | |
| BE-P1-16 | P1 | ccgateway 的注释说"desired 里检查了归属"，实际没有检查，会误导 | `ccgateway/accounts.go:189` | S | |
| BE-P2-11 | P2 | 审计接口用 `to_jsonb(a)` 把整行直接返回，以后加敏感列会自动泄露 | `audit/http.go` | S | |
| BE-P2-12 | P2 | 改密码或禁用后，旧 access token 仍然有效（建议加 token_version） | `iam/service.go:34` | M | |
| PL-P2-8 | P2 | 市场源允许 http://，开启 allowUnsigned 时可以被中间人替换 | `market/market.go:178` | S | |
| PL-P2-9 | P2 | `Host.Client()` 把原始 gRPC client 暴露给插件 | `pluginsdk/host.go:198` | S | |
| PL-P1-10 | P1 | `users.read`、`users.write`、`db.core_views` 可以申请和授予，但核心没有任何实现（死契约） | `sdk/manifest/manifest.go:607` | S | |
| AR-P1-7 | P1 | ovh 部署：插件签名校验关闭；没有配置可信代理，所有 IP 都是 127.0.0.1，登录限流退化成全局一个桶；节点端口以 HTTP 直接暴露在公网。**属于生产改动** | `deploy/gateway/ovh/compose.yml:36,61-77` | S + M | |
| AR-P2-13 | P2 | 发布私钥存放在生产宿主机上，与 CONTRACTS §33 冲突 | `ovh/prepare.sh:45,93` | M | |
| AR-P2-14 | P2 | 没有防降级门槛，同 schema 的旧版本可以当作"升级"执行 | `control/store.go:279` | S | |
| AR-P2-11 | P2 | 权限撤销跨节点依赖 Pub/Sub，消息丢失时兜底周期是 30 秒 | `authz/service.go:61` | S | |
| AR-P2-1 | P2 | `system:cluster-change` 锁没有 fencing，丢锁时插件变更和核心计划的写入可能交错 | `cluster/mutation.go:31`、`control/store.go:363` | M | |

## 五、多节点与发布

| ID | 级 | 问题 | 位置 | 量 | 决定 |
|---|---|---|---|---|---|
| AR-P1-3 | P1 | 主节点身份有配置文件和 PG 两个真相源；没有 set-primary 和 remove-node；禁用的死节点会永久阻塞升级；文档里的"恢复 CLI"不存在 | `control/runtime.go:143`、`store.go:46,233`、`engine.go:580` | M | |
| AR-P1-4 | P1 | 网关和核心直接读写对方的表，没有库表契约，版本混跑时会静默失效 | `control/store.go:316-1084`、`cluster/mutation.go:56` | L | |
| AR-P1-5 | P1 | 引擎错误被吞掉，没有任何指标，网关日志也不是结构化的；计划卡住时看不到原因 | `engine.go:48-66`、`main.go:319`、`peer.go:109` | M | |
| AR-P1-6 | P1 | 插件包的唯一权威副本在主节点卷上；主节点离线时无法安装插件 | `pluginblob.go:215`、`install/upload.go:46` | M | |
| AR-P2-2 | P2 | 核心发布目录和 bundle 没有 GC，磁盘只增不减 | `release/manager.go:162` | S | |
| AR-P2-3 | P2 | supervisor 看到残留的 `Starting=true` 时会陷入重启循环 | `supervisor/supervisor.go:73` | S | |
| AR-P2-4 | P2 | DisableNode 的两条语句不在同一个事务里，通知也发得太早 | `control/store.go:779` | S | |
| AR-P2-5 | P2 | peer 协议常量定义了两份；`20*time.Second` 魔法数字出现 14 次 | `peer.go:21`、`control/types.go:99` | S | |
| AR-P2-6 | P2 | 引擎的 Recover 有 115 行，嵌套 4–5 层 | `engine.go:681` | M | |
| AR-P2-7 | P2 | `control/store.go` 有 1105 行，混了 5 类职责 | 同文件 | M | |
| AR-P2-8 | P2 | 核心和网关各有一套 redsync 包装，两者会逐渐漂移 | `cluster/locker.go`、`control/lock.go` | S–M | |
| AR-P2-9 | P2 | 网关配置里的未知字段被静默忽略，拼错字段名不会报错 | `gateway main.go:364` | S | |
| AR-P2-12 | P2 | 网关镜像没有 HEALTHCHECK；核心 Dockerfile 有重复的 COPY | `deploy/gateway/Dockerfile`、`next/Dockerfile:70` | S | |
| AR-P2-16 | P2 | 步骤超时固定为 10 分钟，不可配置 | `engine.go:36` | S | |
| AR-D1~D12 | 文档 | 12 处文档与代码不一致：ARCHITECTURE §2.1/§2.3、MULTINODE 状态行/§6.2/§8/§9、GATEWAY §4.1/§10/§11、CONTRACTS §7/§27.2/§33、gateway README、HANDOVER 路径 | 06 §5 | S | |

## 六、后端核心结构（阶段 5）

| ID | 级 | 问题 | 位置 | 量 | 决定 |
|---|---|---|---|---|---|
| BE-P1-10 | P1 | 124 个 handler 中有 44 个直接写 SQL，没有 repo/service 分层 | billing 15、group 6、usage 6 等 | L | |
| BE-P1-11 | P1 | gateway 的 `call` 是上帝对象：36 个字段，68 个方法分布在 11 个文件里 | `gateway/pipeline.go:24-93` | L | |
| BE-P1-12 | P1 | `app.run` 有 360 行，圈复杂度 53；`go X.Run` 没有被 join | `app/app.go:72-431` | M | |
| BE-P1-8 | P1 | "提交后再失效缓存"有 3 种写法（1 秒盲等、2 分钟轮询、手工调用） | `billing.go:96`、`sticky_api.go:648`、`authz/service.go:133` | M | |
| BE-2.2 | P1 | 模块间存在具体类型依赖（iam→authz、account/gateway→ccgateway），并且直接写别人的表，与 app.go 声明的"只依赖 core 接口"不符 | 04 §2.2 | M | |
| BE-5 | P1 | 样板代码重复：筛选拼接 5 份、分页列表 9 份、设置读写缓存 4 份（`settings.Doc[T]`）、带版本号的缓存 7 份（`cache.Epoch`） | 04 §5 | M | |
| RL-4 | P1 | 新旧两条执行路径交织（5 处 `if execution != nil`）；WS 的调度和尝试逻辑复制了 HTTP 的一份；建议改成 pipeline 中间件化 | 07 §4 | L | |
| BE-P2-1 | P2 | 死代码：apikey 的 Redis 缓存已经不再写入，但 apikey 和 group 两个包还在删除这些 key | `apikey.go:150-609`、`group.go:352-610` | S | |
| BE-P2-2 | P2 | 未使用的导出、函数和空目录（changedAfterCommit、runScheduled、SourceSync 等） | 04 P2-2 | S | |
| BE-P2-3 | P2 | 事件类型写字面量字符串，没有用已定义的常量 | `iam/users.go:190,325` | S | |
| BE-P2-4 | P2 | `t(ctx,en,zh)` 复制了 5 份；部分错误只有英文，ccgateway 只有中文 | 多处 | S | |
| BE-P2-5 | P2 | 两处 ILIKE 没有转义 `%` 和 `_` | `account/handlers.go:352`、`apikey.go:375` | S | |
| BE-P2-6 | P2 | 小工具重复：itoa×3、truncate×5（有的不是 UTF-8 安全）、mustJSON、nullID、uniqueIDs | 多处 | S | |
| BE-P2-7 | P2 | 日志写法混用（默认实例和注入的 logger、带不带 ctx），缺 request_id | 多处 | S | |
| BE-P2-8 | P2 | 重试时用 `time.Sleep`，不响应 ctx | `usage/settler.go:256` | S | |
| BE-P2-13 | P2 | （记录不变式）API Key 鉴权有意不缓存，如需缓存应使用"版本号 + bus 失效" | `apikey` | M | |

## 七、插件与 SDK（阶段 5）

| ID | 级 | 问题 | 位置 | 量 | 决定 |
|---|---|---|---|---|---|
| PL-P1-1 | P1 | 契约中轮询有 3 套、提交有 2 套、执行有 2 套同时存在；volcengine 把三套轮询都实现了 | `platform.proto`、`host.proto`、`usage/reconcile.go` 990 行 | L | |
| PL-P1-2 | P1 | 两套几乎一样的"调用期 token 状态机"（共 10 个布尔），回调样板复制了 3 份 | `grpcruntime/execute.go`、`poll.go`、`monitor.go` | M | |
| PL-P1-7 | P1 | 插件之间大量复制：错误分类 3 份逐字相同、apikey 凭证解析 3 份、truncate/retry-after 6 份、取上游模型 5 份、`execute.go` 5 份；下沉到 SDK 后估计可删约 1500 行 | relay/ccgateway/anthropic 等 | M | |
| PL-P1-8 / FE-P1-8 | P1 | 核心（server 和 web）按名字写死了 `ccgateway` 插件 | `ccgateway/client.go:17`、`PluginDetailView.vue:34`、`views/ccgateway/*` | M | |
| PL-P1-9 | P1 | 插件菜单有两个数据源，权限过滤写了两遍 | `authz/menus.go:151`、`plugin/api/ui.go:33` | S | |
| PL-P1-11 | P1 | 超大函数：`registry.build` 192 行、`reconcileKey` 189 行、`startProc` 127 行、`validate.go` 1334 行等 | 05 P1-11 | M | |
| PL-P1-12 | P1 | guard 和 moderation 的批量写入器逐行相同 | `guard/hook.go:136`、`moderation/store.go:42` | S | |
| PL-P2-1 | P2 | 协议版本相关的旋钮共有 8 个 | `sdk/protocol/protocol.go:12` | S | |
| PL-P2-2 | P2 | 能力在 manifest 和 Go 接口两处声明，对不上时只打 warn | `serve.go:164`、`instance.go:305` | S | |
| PL-P2-3 | P2 | 13 个几乎一样的 adapter 包装函数 | `grpcruntime/adapters.go:160-325` | S | |
| PL-P2-4 | P2 | ExecuteDefault 吞掉了 ExtractUsage 的错误 | `pluginsdk/execute.go:144` | S | |
| PL-P2-5 | P2 | SDK Router 不支持 `:param` 路径参数，插件各自实现了一遍 | `pluginsdk/http.go:19` | S | |
| PL-P2-6 | P2 | 前端写死的内置平台回退表已经过时 | `web/composables/platforms.ts:18` | S | |
| PL-P2-7 | P2 | pkgsig 用 `Contains("..")` 判断，会误拒合法文件名 | `pkgsig.go:55` | S | |
| PL-P2-10 | P2 | `plugins/ccgateway/main.go` 没有 gofmt | — | S | |
| PL-P2-11 | P2 | volcengine 的 upstreamURL 错误被覆盖，读起来像 bug | `volcengine/platform.go:460` | S | |

## 八、前端代码（阶段 0/4）

| ID | 级 | 问题 | 位置 | 量 | 决定 |
|---|---|---|---|---|---|
| FE-P0-1 | P0 | 没有 ESLint、Prettier、vitest；4 个测试脚本没有接入 npm scripts | `next/web/package.json` | M | |
| FE-P0-2 / UI-P0-5 | P0 | 服务端 page_size 上限是 200，前端 16 处"取全部"实际只拿到第一页：Dashboard 可用账号数错误，分组、代理、角色超过 200 条就选不到 | `AccountEditor.vue:226`、`DashboardView.vue:55`、`lookups.ts` 等 | S | |
| FE-P0-3 | P0 | 没有数据访问层：50 个文件里直接调了 163 次 `api.*`；DTO 散落各处；`pick` 多别名兜底取值 86 处 | 全部视图 | L | |
| FE-P0-4 | P0 | UsersView 的 4 个弹窗共用一个 `saving`，会互相干扰 | `UsersView.vue:172,226,253,295` | S | |
| FE-P1-1 | P1 | 异步动作没有抽象：128 处 try/catch、39 处 loading；`useAction` 从未被使用 | 全局 | M | |
| FE-P1-2 | P1 | 行操作都是 if/else 链，权限判断和执行逻辑分开写 | `UsersView` 等 | S | |
| FE-P1-3 / UI-P1-18 | P1 | 每个弹窗都手写七件套；余额调整有两份实现 | `UsersView`、`AccountsView` 等 | M | |
| FE-P1-4 / UI-P1-11 | P1 | statusTone 有 4 套互不一致，statusLabel 复制了 5 份，同一个状态在不同页面颜色不同 | `api/admin.ts:14` 等 | S–M | |
| FE-P1-5 | P1 | 时间工具有 2–3 份，签名还不一致 | `api/admin.ts:47`、`timeRange.ts` 等 | S | |
| FE-P1-6 | P1 | 本地化文本取值有 3 份实现、2 个类型名 | `http.ts:46`、`schema.ts:31`、`i18n/index.ts:51` | S | |
| FE-P1-7 | P1 | AccountEditor 981 行，一个组件做 7 件事，还手写了 3 个控件 | `AccountEditor.vue` | L | |
| FE-P1-9 | P1 | 预设模型和映射逻辑在 CCGateway 和 AccountEditor 里各写一份，行为还不一样 | `CCGatewayView.vue:23`、`AccountEditor.vue:154` | M | |
| FE-P1-10 | P1 | 8 处轮询各自手写；OffloadSettingsCard 在后台标签页也照样请求 | 多处 | S | |
| FE-P1-11 | P1 | 竞态守卫手写了 6 份，没有 AbortController | 多处 | M | |
| FE-P1-12 | P1 | 字段错误和 toast 的显示策略不一致，有的地方会重复提示 | 多处 | S | |
| FE-P1-13 | P1 | DeclarativeTable 自己重新实现了一遍 useList | `DeclarativeTable.vue:24` | S | |
| FE-P1-14 | P1 | schema 加载有 3 条路径；核心设置页手写字段，还复制了一份服务端的取值范围，没有复用 SchemaForm | `GatewaySettingsCard.vue`、`types.ts:518` | M | |
| FE-P1-15 | P1 | 25 处跨 feature 的 import | 02 §1.2 | S | |
| FE-P1-16 | P1 | 路由、菜单兜底、补齐逻辑三处维护，新增一个页面要改 3 个地方 | `stores/app.ts`、`router/index.ts` | M | |
| FE-P1-17 | P1 | ApiClient 的泛型默认是 any | `http.ts:467` | S | |
| FE-P1-18 | P1 | `src/shared` 名不副实，实际是 import map 入口 | `src/shared/*` | S | |
| FE-P1-19 | P1 | 构建会覆盖 git 跟踪的 `server/web/dist/index.html`，工作区一直是脏的 | — | S | |
| FE-P2-1 | P2 | useList 的防抖没有在卸载时清理；filters 没有类型；不支持 URL 同步 | `useList.ts:46` | S | |
| FE-P2-2 | P2 | 插件错误原因用硬编码英文直接显示给用户 | `stores/plugins.ts`、`PluginIframe.vue` | S | |
| FE-P2-3 | P2 | plugins.refresh 没有并发保护；refreshShell 写了两份 | `stores/plugins.ts:90` | S | |
| FE-P2-4 | P2 | PluginSlot 靠 DOM 的 closest 定位出错的插件，遇到 Fragment 或 Teleport 会失效 | `PluginSlot.vue:84` | S | |
| FE-P2-5 | P2 | assetURL 的拼接写了两份 | `stores/plugins.ts:19`、`host/index.ts:106` | S | |
| FE-P2-6 | P2 | 81 处 any / as any | schema、bridge 等 | S | |
| FE-P2-7 | P2 | tsconfig 没开 noUncheckedIndexedAccess；vite-preset 是 JS | `tsconfig.app.json` | S | |
| FE-P2-8 | P2 | 12 个文件里有超过 180 字符的超长行 | `RemoteSettings.vue` 等 | S | |
| FE-P2-9 | P2 | 模板嵌套最深 12 层 | `RolesView` 等 | M | |
| FE-P2-10 | P2 | ui 包自己不带样式，依赖宿主的全局类 | `packages/ui` | M | |
| FE-P2-11 | P2 | 市场接口兼容 3 种响应形状 | `MarketView.vue:128` | S | |
| FE-P2-12 | P2 | `format` 再导出了 `copyText`，职责不清 | `utils/format.ts:90` | S | |

## 九、前端 UI / 交互（阶段 4）

| ID | 级 | 问题 | 位置 | 量 | 决定 |
|---|---|---|---|---|---|
| UI-P0-1 | P0 | 核心升级、回滚、取消计划、停用节点都是一点就执行，没有确认，成功后也没有提示 | `UpgradesView.vue:63-137` | S | |
| UI-P0-2 | P0 | 停用分组（会让下面的 Key 全部失效）、停用代理、停用他人 Key、扣减余额都没有二次确认 | `GroupsView:186`、`ProxiesView:213`、`AllApiKeysView:67`、`UsersView:286` | S | |
| UI-P0-3 | P0 | 账号页每 10 秒刷新一次，整张表变灰闪烁；断线时每 10 秒弹一次错误 | `AccountsView:134`、`STable:78`、`useList:18` | S | |
| UI-P0-4 | P0 | `badge-info` 和 `badge-primary` 颜色相同 | `style.css:193` | S | |
| UI-P0-6 | P0 | 账号编辑器点 X 会直接丢弃表单；价格编辑页和设置页离开时也会丢失修改；全站没有离开前拦截 | `SModal.vue:55`、`PriceEditView`、`SettingsView:141` | M | |
| UI-P0-7 | P0 | 加载失败时显示成"暂无数据"或 0 | `MyStatsView:35`、`UsageView:53`、`DashboardView:93` | M | |
| UI-P1-1 | P1 | 按钮比输入框矮 4–6px，同一行对不齐 | `style.css:42` vs `:80` | S | |
| UI-P1-2 | P1 | STable 没有排序、勾选、批量操作、列显隐、固定列、骨架屏、移动端卡片 | `ui/STable.vue` | L | |
| UI-P1-3 | P1 | 筛选栏有 5 种写法、新建按钮 2 种、刷新按钮 3 种、行操作 4 种布局 | 全站列表页 | M | |
| UI-P1-4 | P1 | 下拉框用原生 select，不能搜索，暗色下显得突兀；多选是拼凑出来的 | `SSelect.vue:39`、`GroupPicker.vue:62` | M | |
| UI-P1-5 | P1 | 按用户、账号、创建者筛选时只能填裸数字 ID | `UsageView:111`、`LedgerView:37` 等 | M | |
| UI-P1-6 | P1 | 筛选条件和页码不写进 URL，刷新后就丢了；每页条数不会持久化 | `useList.ts:68` | S | |
| UI-P1-7 | P1 | 确认框点确认后立即关闭，看不到执行过程，也不能展示影响范围 | `feedback.ts:30`、`SConfirmHost.vue` | M | |
| UI-P1-8 | P1 | 顶栏标题和页面 H1 重复；顶栏左侧空荡 | `AppTopbar.vue:59`、`SPageHeader.vue:10` | S | |
| UI-P1-9 | P1 | Toast 没有图标和标题，不能带操作按钮，重复消息不合并 | `SToastHost.vue` | S | |
| UI-P1-10 | P1 | 手写提示框 17 处，颜色混用 | 01 §3.5 | S | |
| UI-P1-12 | P1 | 仪表盘太单薄：没有时间范围、模型分布、Top 排行、错误率、告警、快捷入口 | `DashboardView.vue:98` | L | |
| UI-P1-13 | P1 | 仪表盘的"今日"按 UTC 算，使用记录页按本地时间算，两边数字对不上 | `DashboardView:32` vs `timeRange.ts:19` | S | |
| UI-P1-14 | P1 | "我的 API Key"不能编辑、停用、复制，没有使用示例，也没有首个 Key 的引导 | `MyApiKeysView.vue` | M | |
| UI-P1-15 | P1 | "可调度"开关没有 pending 态，可以连点，成功后也没有反馈 | `AccountsView:314,442` | S | |
| UI-P1-16 | P1 | 账号的编辑、测试、详情、凭据都用弹窗，会叠加；详情直接输出 credentials 原始 JSON | `AccountsView:457-622` | M | |
| UI-P1-17 | P1 | 没有任何批量操作；分组页和代理页没有搜索 | 各列表页 | L | |
| UI-P1-19 | P1 | ccgateway 和升级相关页面绕开组件库，模板被压成超长的单行 | `CCGatewayView`、`RemoteSettings`、`AuditView`、`UpgradesView` | M | |
| UI-P1-20 | P1 | 设置页的页签不写回 URL；保存按钮不显眼 | `SettingsView:28` | S | |
| UI-P1-21 | P1 | 移动端侧栏抽屉只有 72px 宽、只显示图标；移动端余额完全隐藏 | `AppSidebar:37`、`AppTopbar:64` | S | |
| UI-P1-22 | P1 | 弹窗没有焦点锁定，也不锁背景滚动；下拉菜单不支持键盘和 Esc | `SModal`、`SDropdown` | M | |
| UI-P2-1 | P2 | 状态用 ✓/✕ 字符表示，粗细和基线不统一 | `UsageTable:122` | S | |
| UI-P2-2 | P2 | 提交按钮放在 form 外面，按 Enter 不会提交 | `UsersView:375` 等 4 处 | S | |
| UI-P2-3 | P2 | 6 处出现卡片套表格的双层边框 | 01 §3.5 | S | |
| UI-P2-4 | P2 | 筛选条件放在页签上方，层级颠倒 | `MyUsageView:59` | S | |
| UI-P2-5 | P2 | 品牌位只有一个字母 "S"；`<title>` 固定不变 | `AppSidebar:41`、`LoginView:78` | S | |
| UI-P2-6 | P2 | 路由懒加载期间没有任何反馈 | `AppLayout.vue` | S | |
| UI-P2-7 | P2 | "系统"分区平铺了 9 项，没有二级分组 | `stores/app.ts:36` | M | |
| UI-P2-8 | P2 | 主题没有"跟随系统"选项 | `stores/app.ts:93` | S | |
| UI-P2-9 | P2 | 表头也显示为可点击的手型光标 | `PluginsView:140` | S | |
| UI-P2-10 | P2 | 插件页的描述直接显示 key 和版本号，太技术化 | `PluginPageView:46` | S | |
| UI-P2-11 | P2 | 分段切换和卡片单选是手写的 | `PriceEditView:390` 等 | S | |
| UI-P2-12 | P2 | 统计卡用原生 grid，没有用 SGrid | `NodesView:173` | S | |
| UI-P2-13 | P2 | 数字列的 tabular-nums 靠手写，部分列漏了 | 表格 | S | |
| UI-P2-14 | P2 | 插件市场是纵向列表，缺少浏览感 | `MarketView:210` | M | |
| UI-P2-15 | P2 | 没有命令面板和快捷键 | 全站 | M | |
| UI-DS | 方案 | 设计系统：语义色 CSS 变量、统一控件高度、约 25 个组件、5 种页面模式（见 01 §3） | 01 §3 | L | |

## 十、功能缺口（阶段 6，按 03 的综合排序）

| ID | 价值/成本 | 功能 | 归属 | 决定 |
|---|---|---|---|---|
| FG-1 | 高/低 | API Key 增强：额度、5h/1d/7d 限速、IP 黑白名单、模型限制（A2+B1） | 核心 | |
| FG-2 | 高/低中 | 客户端 `/v1/models`（目前请求会落到控制台回退页并返回 200）+ 模型广场 + 公开定价 + 模型元数据（A1+A16+B8） | 核心 | |
| FG-3 | 高/中 | 邮件服务 + 自助注册、邮箱验证、找回密码、邀请码、人机验证（A3+A4） | 核心 | |
| FG-4 | 高/中 | 账号健康巡检 + 自动启停 + 管理员可配置错误策略（A9+B2+B3） | 核心 | |
| FG-5 | 高/中高 | 充值支付 + 兑换码（+ 优惠码）（A5+A6+A14） | 插件 + 核心账本 | |
| FG-6 | 高/中 | 运营仪表盘、多维报表、导出、usage 保留期（A7+A8） | 核心 | |
| FG-7 | 中高/中 | 通知中心：余额不足、账号禁用、模型变更、公告（A22+B5+B7） | 插件 + 核心发信 | |
| FG-8 | 中高/低中 | Playground 在线对话（B4） | 核心 | |
| FG-9 | 中高/中高 | 2FA（TOTP/Passkey）+ 会话管理 + OIDC/OAuth 登录（A12+B10+B11） | 核心 | |
| FG-10 | 中/低 | 公告 + 站点品牌、首页、法律文档（A11） | 核心 | |
| FG-11 | 高/高 | 订阅套餐（分组周期额度）（A13） | 核心 | |
| FG-12 | 中/低 | 账号请求头和参数覆盖（B6） | 核心 | |
| FG-13 | 中/低中 | 邀请返利、签到（A14+B12） | 插件 | |
| FG-14 | 视业务/高 | OAuth 类账号：Claude OAuth、Codex、Gemini CLI 等（A10，有意推迟） | 插件（每类一个） | |
| FG-15 | 中高/高 | 动态权重（B9） | 插件（RankAccounts） | |
| FG-16 | 中高/中高 | 运维错误分析与告警（A15） | 核心 + 通知插件 | |
| FG-17 | 低中/中 | 状态页、监控、排行榜（A20+B15+B16） | 插件 | |
| FG-18 | 中/中 | 用户专属倍率、用户 RPM、分组 fallback 和路由（A17+A18） | 核心 | |
| FG-19 | 中/中 | 批量操作、导入导出、数据库备份（A19+A21） | 核心 | |
| FG-20 | 低中/低 | 多语言扩展、供应商对账单、用户 Access Token（B14+B13+B10） | 核心 | |
| FG-21 | 按需 | 平台专属能力（Web Search 模拟、Grok 媒体、批量图片、Realtime、TLS 指纹）、Midjourney/Suno（A24+B18） | 插件 | |
| FG-22 | 低 | 用户自定义属性、合规确认、管理员 API Key（A23） | 核心 | |
| FG-✗ | — | 03 建议**不做**：多 Key 渠道、批量导出 Key 明文、io.net 部署管理、跨分组 auto（与 next 的设计冲突） | — | |

## 十一、工程护栏（阶段 0）

| ID | 问题 | 量 | 决定 |
|---|---|---|---|
| ENG-1 | 本机没有 PG/Redis，100 多个依赖数据库的用例全部跳过；资金路径和越权问题没有经过动态验证 | S | |
| ENG-2 | `-race` 需要 cgo，本机跑不了（可以放到 Linux CI） | S | |
| ENG-3 | 没有装 staticcheck、gocyclo、govulncheck | S | |
| ENG-4 | 同 FE-P0-1（前端 lint/test）、FE-P1-19（dist 被覆盖） | — | |

## 十二、安全审计完整清单（SEC-*）

最终计数：严重 1、高 5、中 10、低 13（08 摘要里写的"中危 11 条"是计数错误；H5 是从原 M4 拆出来的）。
验证列说明：**复现** = 已在仓库外用 `go test -overlay` 跑通；**代码** = 读代码即可确认，不需要 PG；**待PG** = 需要在有 PG 的环境里验证。
路径都相对 `next/server/internal`。与第四节重复的条目只列编号，不重复描述。

| ID | 级 | 问题 | 位置 | 修复方向 | 量 | 验证 | 决定 |
|---|---|---|---|---|---|---|---|
| SEC-C1 | 严重 | 见第四节（与 PL-P0-3 同一条） | — | — | M | 复现 | |
| SEC-H1 | 高 | 见第四节（与 BE-P0-1 同一条） | — | 拆出 `user:password:reset`🔐，并加目标等级规则 | S–M | 待PG | |
| SEC-H2 | 高 | `role:manage` 可以创建或修改角色，给自己授予任意非超管权限 | `authz/roles.go:104-134,191-254,270-354` | 授权者必须持有被授予的全部权限 | S | 待PG | |
| SEC-H3 | 高 | 见第四节 | `account/handlers.go:415-435,605-631`、`account/service.go:109`、`plugins/relay/manifest.json:22` | 绑定分组需要 `group:manage` 或 `account:group:bind`；`own` 级限制调度字段；自定义上游需要 `account:settings:custom` | M | 待PG | |
| SEC-H4 | 高 | 见第四节（与 BE-P0-2 同一条） | — | 同步源管理改为敏感权限，并写审计日志 | S | 复现 | |
| SEC-H5 | 高 | 插件 consent 可以把新增的插件权限授予任意角色，不需要 `role:manage` | `plugin/install/consent.go:19-23,216-247`、`authz/plugin_catalog.go:80` | 要求 `role:manage`，并套用 H2 的规则 | S | 待PG | |
| SEC-M1 | 中 | 改密码、登出、禁用之后，旧 access token 最多还能用 2 小时（同 BE-P2-12） | `iam/service.go:121-142`、`iam/auth.go:235-282` | JWT 加 `sid`/`token_version` | M | 代码 | |
| SEC-M2 | 中 | refresh token（30 天）存放在 localStorage，而 native 插件脚本和控制台同源 | `web/packages/host/src/http.ts:105-150`、`plugin/api/ui.go:80` | refresh 改用 HttpOnly + SameSite cookie，access token 只放内存 | M | 代码 | |
| SEC-M3 | 中 | step-up 和改密码接口没有限速（同 BE-P1-2） | `iam/service.go:186-208`、`iam/auth.go:250` | 按用户在 Redis 记录失败次数并锁定 | S | 代码 | |
| SEC-M4 | 中 | `settings:manage`、`price:manage`、`group:manage`、`plugin:manage` 涉及资金、身份、远程执行、出口策略，却都没有标为敏感 | `authz/catalog.go:31-123`、`ccgateway/http.go:31`、`billing/settings.go:76`、`plugin/api/ops.go:490` | 按危害拆细权限，并加 🔐 | S–M | 代码 | |
| SEC-M5 | 中 | 用户、角色、余额、价格、分组、Key、设置的变更都不写审计日志（同 BE-P1-9） | 多处 | 统一审计 helper，与业务写入放在同一事务 | M | 代码 | |
| SEC-M6 | 中 | Redis 出错时登录限速直接放行；没有按账号统计的全局失败计数 | `iam/ratelimit.go:376-409` | Redis 故障时降级为本地限速，并增加按账号的计数 | S | 代码 | |
| SEC-M7 | 中 | 见第四节（与 BE-P1-1 同一条） | `proxy/proxy.go:153-171,203,652` | `own` 级代理禁止使用私网主机；测试结果脱敏 | S | 复现 | |
| SEC-M8 | 中 | 预扣只覆盖输入费用的估算，并发请求时输出费用可以让余额透支 | `gateway/precharge.go:16-60`、`billing/precharge.go:20` | 按 `max_tokens` 预留输出费用，或设置欠费上限 | M | 待PG | |
| SEC-M9 | 中 | WebSocket 会话的身份在升级时就固定了，之后撤销 Key、禁用用户、调整分组都不生效 | `gateway/websocket.go:68-83,305` | 每轮或定期重新认证，并设置会话最长存活时间 | S | 代码 | |
| SEC-M10 | 中 | `/api/v1` 没有统一的请求体大小上限 | `httpapi/router.go:25`、`respond.go` | 加全局 `MaxBytesReader` 中间件 | S | 代码 | |
| SEC-L1 | 低 | 匿名访问 `/healthz` 会回显版本号、节点 ID、boot_id | `app/app.go:348` | 匿名请求只返回状态 | S | 代码 | |
| SEC-L2 | 低 | 用户查看自己的流水时，会看到 operator_id、幂等键、管理员的 ref_id | `billing/balance.go:16-55` | 自助视图使用精简 DTO | S | 代码 | |
| SEC-L3 | 低 | 自助用量详情里的 error_message 可能带出上游主机地址 | `usage/api.go:144,303` | 返回分类错误码和固定文案 | S | 代码 | |
| SEC-L4 | 低 | 管理员调整余额的幂等键是全局作用域，跨用户重复时会返回别人那笔的结果（与 BE-P1-4 相关） | `billing/balance.go:157`、`ledger.go:106` | 幂等键加上目标用户和操作者作用域 | S | 待PG | |
| SEC-L5 | 低 | 转发到外壳时，路径参数没有转义 | `updater/http.go:33,47` | 使用 `url.PathEscape` | S | 代码 | |
| SEC-L6 | 低 | SSH 指纹探测接受任意 host:port | `ccgateway/http.go:51-71` | 限制端口，或只允许已保存的主机 | S | 代码 | |
| SEC-L7 | 低 | 端点可以声明用 query 参数传 API Key，Key 会进入访问日志 | `gateway/pipeline.go:196-221` | 只在兼容场景下开启，日志中对 query 脱敏 | S | 代码 | |
| SEC-L8 | 低 | 插件路由的 admin 和 user 两种 scope 实际校验逻辑完全相同 | `plugin/routes/routes.go:161`、`sdk/manifest/check/validate.go:1148` | 统一语义或合并 | S | 代码 | |
| SEC-L9 | 低 | 普通管理员可以禁用、删除、移动超管的 Key，也能调整超管余额 | `apikey/apikey.go:511-616`、`billing/balance.go:136` | 套用 H1 的目标等级规则 | S | 待PG | |
| SEC-L10 | 低 | 密码只要求 8 位；没有 2FA，step-up 只认密码 | `iam/users.go:430`、`iam/service.go:186` | 加强度检查和泄露库检查；step-up 支持 TOTP/passkey（关联 FG-9） | M | 代码 | |
| SEC-L11 | 低 | 没有 HSTS，API 响应缺少 nosniff，CSP 允许内联样式 | `webui/webui.go:152`、`respond.go` | 加统一的安全头中间件 | S | 代码 | |
| SEC-L12 | 低 | echarts 低于 6.1 时存在 XSS 漏洞，当前用法不可利用 | `next/web/package.json` | 升级到 6.1 | S | npm audit | |
| SEC-L13 | 低 | 账号测试的地址检查比 netguard 宽松；走代理时如果 DNS 解析失败，会直接放行 | `account/testreq.go:330-357` | 统一复用 netguard | S | 代码 | |

---

## 统计

| 区域 | P0/严重 | P1/高 | P2/中低 | 合计 |
|---|---|---|---|---|
| 稳定性与容量 | 4 | 16 | 13 | 33 |
| 转发与调度 | 0 | 3 | 8 | 11 |
| 资金 | 0 | 5 | 3 | 8 |
| 安全（第四节和第十二节合并去重） | 4 | 11 | 28 | 43 |
| 多节点与发布 | 0 | 4 | 10，另有文档 12 处 | 26 |
| 后端结构 | 0 | 7 | 9 | 16 |
| 插件与 SDK | 0 | 7 | 9 | 16 |
| 前端代码 | 4 | 18 | 12 | 34 |
| 前端 UI | 6 | 20 | 15 | 41 |
| 功能缺口 | — | — | — | 22 项 |
