# 04 后端核心（next/server）代码质量审计

- 日期：2026-10-04（分支 `feat/next-platform`，HEAD `d61dd3e5a`）
- 范围：`next/server/internal` 下除 `plugin/`、`cluster/`、`updater/` 以外的模块（account apikey app audit authz background billing ccgateway config core deps event gateway group httpapi iam job migrations netguard platforms proxy remotedocker secret store tokenizer usage usagerules webui）。约 3.3 万行非测试 Go 代码。
- 方式：只读。`go build` / `go vet` / `go test -short`、自写 AST 脚本统计函数长度/圈复杂度/嵌套深度/handler 内 SQL、grep 交叉核对。对照 `ARCHITECTURE.md`、`CONTRACTS.md`。
- 没装 `staticcheck`、`gocyclo`、`golangci-lint`，`~/go/bin` 也不存在。复杂度数据来自自写的 `go/ast` 脚本：圈复杂度按 if/for/case/&&/|| 计数，和 gocyclo 基本一致。

---

## 0. 工具运行结果

| 命令 | 结果 |
|---|---|
| `go build ./...` | 通过 |
| `go vet ./...` | 通过，无告警 |
| `go test ./... -count=1 -short` | 全部 `ok`（45 个包）。没设 `TEST_DATABASE_URL`，所以 `testutil.DB` 相关的 PG 测试全部 Skip，**数据库路径实际没跑到** |
| staticcheck / gocyclo | 未安装（按约束没下载） |

---

## 1. 总评

**优点（重构时要保留）**

- 有统一的错误模型：`core.Error`（status/code/message/details，cause 不对外）+ `httpapi.Fail/OK/List`。95% 以上的响应格式一致，只有健康检查、网关错误格式、webui 是有意例外。
- 路由注册统一走 `httpapi.Router`：`Public/Authed/Perm/PermAny/PermStepUp`，敏感权限自动要求 step-up。逐条核对所有 `RegisterRoutes` 后，**每条控制台路由都有鉴权**，`Public` 只有 login/refresh 和 `/key/prices`（自带 API Key 鉴权）。
- 资金路径都在事务里：ledger 行、usage 行、事件 outbox 同一事务提交，Redis 余额缓存提交后才刷，并用 Lua 防止旧值回写；幂等键有 UNIQUE。
- 并发生命周期大多有设计：`background.Executor`、`usage.Service.Stop`、`gateway.Close` 等待抽取 goroutine、`requestGate` 排空。
- 注释写得充分，不变式都写了原因。

**主要问题（按影响排序）**

1. **安全**：有一个越权提权链（`user:update` 能重置管理员密码，见 P0-1）；价格同步源有带回显的 SSRF（P0-2）；两份 SSRF 黑名单已经不一致（P1-3）；step-up 没有限速（P1-4）。
2. **分层基本没做**：除了 `iam` 和 `authz`，各模块的 `Service` 同时是 HTTP handler、业务逻辑和 SQL 仓储。124 个 gin handler 里有 44 个直接写 SQL（`billing` 22 个里有 15 个）。`app.go` 头注释说"模块只通过 core 接口互相依赖"，实际上有 `iam→authz`、`account→ccgateway`、`gateway→ccgateway/config` 这些具体类型依赖，还有大量**跨模块写别人的表**的隐式耦合。
3. **样板重复多**：动态 WHERE 构造 5 份，"count + 分页 + 扫描"列表 9 份，settings 读、缓存、PATCH 4 份，epoch+TTL 缓存 7 份，`t(ctx,en,zh)` 5 份，"提交后再失效"3 种写法（`time.AfterFunc`、轮询、手工调用），`if err != nil { httpapi.Fail(c, err); return }` 187 处。
4. **资金计算有两份**：`usage.priceOf` 注释写着"唯一把用量变成钱的地方"，`billing.Precharge` 却复制了一份；ledger 的幂等去重不核对 user/amount（P1-5、P1-6）。
5. **巨型函数和巨型结构**：`app.run` 360 行（圈复杂度 53）；`gateway.call` 36 个字段、68 个方法；`forwardSSE` 圈复杂度 45；`account/handlers.go` 1071 行。

总体判断：功能正确性和并发意识是"认真做过的"，结构是"快速堆出来的"。开发期可以大胆重构，建议先修 P0，再按第 6 节分批抽公共层。每批都能独立合入。

---

## 2. 模块地图与依赖问题

### 2.1 实际导入图（仅 server 内部包）

```
叶子：core  store  secret  netguard  config  tokenizer  remotedocker  billing/expr  migrations  platforms(→sdk)
httpapi   → core
audit     → httpapi store              （写 helper 和 HTTP 路由混在一个包）
apikey    → core httpapi store
authz     → core httpapi store
group     → core httpapi store
iam       → authz(具体类型!) config core httpapi store
proxy     → audit core httpapi secret store
billing   → billing/expr core httpapi secret store
ccgateway → audit core httpapi remotedocker secret store
account   → audit ccgateway(具体类型!) core httpapi platforms secret store usagerules
usage     → background billing/expr core httpapi netguard store usagerules
gateway   → ccgateway(具体!) config(具体!) core gateway/convert httpapi netguard platforms store tokenizer usagerules
event, event/delivery, job → core store (background)
app       → 全部
```

没有导入环。`core` 是 1686 行的"契约包"，按 ports_*.go 分文件。方向是对的，但 `core` 里也放了行为，比如 `proxyurl.go` 的解析逻辑和 `KeepLock`。

### 2.2 依赖问题

| # | 问题 | 位置 | 说明 |
|---|---|---|---|
| D1 | 声明"只经 core 接口依赖"，实际依赖具体类型 | `app/app.go:1-3` 注释；`iam/service.go` 的 `Deps.Authz *authz.Service`；`account/service.go:25`、`gateway/gateway.go:31` 的 `*ccgateway.Service`；`gateway/gateway.go:48` 的 `*config.Config` | iam 调 `authz.SetUserRoles(tx)/Bump/Committed/EnsureNotLastSuperAdmin/IsSuperuser`，这是一组事务内的授权写接口，应在 core 定义 `RoleAssigner` 端口。ccgateway 是特定插件（`plugin_key='ccgateway'`）的核心特判，进入了网关热路径（`gateway/dispatch.go:375,393`）和账号测试（`account/testreq.go:142,170`）。gateway 只用到 `cfg.AllowPrivateUpstream`，应只注入这个布尔值 |
| D2 | 跨模块写别人的表 | `group/group.go:386` `DELETE FROM api_keys`；`iam/users.go:370` `UPDATE api_keys`；`billing/sync.go:1001` 直接 `INSERT INTO audit_logs`（绕过 `audit.Audit`，没有 IP） | 表的所有权不清。api_keys 的生命周期分散在 3 个包里 |
| D3 | 跨模块读别人的密文且复制 AAD 字符串 | `ccgateway/accounts.go:51` 的 `"account:ccgateway"`、`:62` 的 `"proxy"`，分别复制了 `account/creds.go:32` 的 `aad()` 和 `proxy/proxy.go:33` 的 `passwordAAD` | 任何一边改 AAD，ccgateway 就会静默解密失败。应由 account/proxy 暴露解密端口（`core.AccountDirectory.Credentials`、`core.ProxyDirectory`），或把 AAD 集中到 `secret` 包 |
| D4 | 隐式耦合 Redis key 命名 | `group/group.go:604` 硬编码 `"apikey:"+h`，对应 `apikey/apikey.go:150` | 而且这个缓存**已经不再写入**（见 P2-1），两边都是死代码 |
| D5 | 包级全局状态 | `billing/expr/expr.go:279-283` 进程级 Program 缓存（满 4096 条整表清空）；`billing/expr/eval.go:17`、`analyze.go:363` 时区缓存；`authz/catalog.go:158-172` `init()` 填 map；`app.go:339` 的 `gin.SetMode` 是全局的；日志一半用 `slog` 默认实例，一半注入 `*slog.Logger` | expr 缓存的内容不可变，可以接受，但清空策略粗暴（突然全部失效会造成重编译尖峰），建议换成 LRU。日志应统一注入 |
| D6 | DI 是手工"大函数装配" | `app/app.go:72-431` | 没有组件生命周期抽象：`go keys.Run(ctx)`、`go prx.Run(ctx)`、`go acc.Run(ctx)`、`go ccg.Run(ctx)`（`app.go:198-201`）都不被 join，关停时可能和 `db.Close()` 竞争（acc/apikey 的 last_used flush 用的是新 ctx）。`onClose(settler.Stop)` 有意注册两次（166、268 行），要靠注释才能看懂 |
| D7 | `deps` 包 | `deps/deps.go` | 用 build tag `deps` 钉住依赖，这是多 agent 并行开发的权宜之计。go.work 稳定后可以删 |

### 2.3 分层现状

| 包 | handler 数 | 含 SQL 的 handler | 分层评价 |
|---|---|---|---|
| iam | 14 | 1 | **好**：`http.go` 只负责绑定和响应，`users.go/auth.go` 返回领域类型。可作为模板 |
| authz | 8 | 0 | 好 |
| billing | 22 | 15 | 差：`sync.go` 1101 行同时含抓取、解析、diff、写库、路由 |
| account | 14 | 4（另有 tx 闭包内 SQL） | 差：`handlers.go` 里 create/update 各 130-164 行 |
| proxy / group / apikey / usage | 6/8/7/14 | 5/6/4/6 | 差 |
| audit | 1（函数字面量） | 1 | 写 helper 和查询路由在同一个包，路由是匿名函数，变量名 `context` 遮蔽了标准库包名（`audit/http.go:15`） |

---

## 3. 复杂度

### 3.1 最大的 15 个文件（非测试，范围内）

| 行数 | 文件 |
|---|---|
| 1101 | billing/sync.go |
| 1071 | account/handlers.go |
| 990 | usage/reconcile.go |
| 902 | usage/settler.go |
| 728 | gateway/pipeline.go |
| 721 | gateway/sticky_api.go |
| 710 | gateway/websocket.go |
| 701 | proxy/proxy.go |
| 620 | group/group.go |
| 616 | apikey/apikey.go |
| 610 | billing/prices.go |
| 607 | gateway/hooks.go |
| 600 | gateway/dispatch.go |
| 505 | authz/roles.go |
| 489 | job/job.go |

### 3.2 最长的 20 个函数

| 行数 | 圈复杂度 | 嵌套 | 位置 |
|---|---|---|---|
| 360 | 53 | 3 | app/app.go:72 `run` |
| 164 | 35 | 3 | account/handlers.go:840 `Service.update` |
| 148 | 37 | 5 | usage/settler.go:369 `Service.insertAtomic` |
| 147 | 45 | 4 | gateway/forward.go:240 `call.forwardSSE` |
| 130 | 30 | 3 | account/handlers.go:709 `Service.create` |
| 129 | 32 | 3 | app/managed.go:101 `managedCore.handler` |
| 123 | 36 | 2 | gateway/dispatch.go:365 `call.forwardBuilt` |
| 117 | 21 | 3 | authz/sync.go:16 `Service.SyncCore` |
| 114 | 29 | 4 | gateway/websocket.go:142 `wsSession.run` |
| 108 | 28 | 3 | gateway/rank.go:72 `call.rankOverrides` |
| 104 | 36 | 5 | usage/reconcile.go:365 `Service.askPlugin` |
| 102 | 38 | 3 | billing/expr/generate.go:281 `ruleExpr` |
| 102 | 34 | 4 | iam/users.go:234 `Service.UpdateUser` |
| 100 | 28 | 4 | gateway/dispatch.go:39 `call.dispatch` |
| 99 | 19 | 3 | gateway/hooks.go:408 `call.runHook` |
| 98 | 28 | 4 | ccgateway/accounts.go:191 `Service.accountManage` |
| 95 | 27 | 3 | config/config.go:68 `Load` |
| 93 | 25 | 3 | gateway/websocket.go:468 `wsSession.dial` |
| 92 | 27 | 3 | event/delivery/worker.go:175 `worker.step` |
| 91 | 19 | 2 | usage/reconcile.go:600 `Service.settleReconciled` |

圈复杂度只高、但不长的：`account/handlers.go:482 input.validate`（71 行，cc 41）、`ccgateway/result.go:13 safeResult`（cc 30）。

**嵌套最深**：`app/builtin.go:24 builtinConvergence`（7 层）、`authz/menus.go:138 pluginMenus`（6 层）、`app/builtin.go:90 startBuiltinUpgrade`（6 层）、`usage/settler.go:369`、`gateway/dispatch.go:155 pick`、`usage/reconcile.go:365`（都是 5 层）。

### 3.3 典型复杂度问题与改法

- `app.run`：按阶段拆成 `openStorage → buildCore → buildPluginRuntime → buildHTTP → serve`，每个阶段返回结构体加 `[]Component`。managed 和非 managed 的分叉（`managed == nil` 出现 9 次）收进一个 `bootMode` 策略对象。
- `account.create/update`：140 行里大部分是 `if in.X != nil { x = *in.X }` 的默认值展开（`handlers.go:751-787`），以及 update 里构造 COALESCE 参数（`923-942`）。改法：用 `input.toRow(defaults)`，再把 SQL 收进 `repo.Insert/Update(ctx, tx, patch)`。
- `forwardSSE`：在一个函数里用 3 个闭包（`emit/closeArray/dispatch`）和外层循环共享 6 个可变变量。改法：拆出 `sseScanner`（只解析出 event 和 data）和 `sseSink`（passthrough / converter / jsonArray 三种实现同一个接口），主循环只剩约 20 行。
- `builtinConvergence`：7 层嵌套。用"一轮 tick 一个函数"`convergeOnce(ctx) (done bool)` 加早返回，可以压到 2 层。
- `gateway.call`：36 个字段横跨请求解析、调度、粘性、计费、任务、插件用量。建议拆成子结构 `req`（ep/params/body/model/stream）、`sched`（routes/sticky/ranked/session/slotCtx）、`bill`（price/rec/usage）、`task`，方法按子结构归属，降低"任何方法都能改任何状态"的风险。

---

## 4. 问题清单

格式：**编号 · 文件:行号 · 问题 · 改法 · 工作量（S ≤ 半天 / M 1-3 天 / L > 3 天）**

### P0（正确性 / 安全，建议立即处理）

**P0-1 · iam/users.go:234-335（UpdateUser）、iam/http.go:28 · `user:update` 可以提权到 admin**
`user:update` 不是敏感权限，不要求 step-up（`authz/catalog.go:34`）。但 PATCH `/users/:id` 接受 `password` 字段（`users.go:252-269`），能重置**任意非超管用户**的密码；`guardTarget`（`users.go:212`）只保护 superuser。拿到 `user:update` 的"运营"角色可以重置一个 `admin` 角色用户的密码，再登录成该用户，获得全部核心权限（包括 `role:manage`、`balance:adjust`）。改 email 和禁用也同样不受目标权限约束。
- **这是契约本身的缺口**：CONTRACTS §5.2 只写了 `PATCH /users/:id | user:update`，没有约束目标范围。
- 改法：(a) `guardTarget` 泛化为"目标的权限集必须是操作者权限集的子集"（或者目标持有任何非默认角色时，要求操作者有 `role:manage`）；(b) 改他人密码拆成独立的敏感权限 `user:password:reset`🔐，或在该字段出现时走 `PermStepUp`；(c) 补进 CONTRACTS §4/§5.2。工作量 **S**。

**P0-2 · billing/sync.go:176、:388-392、:847-849 · 价格同步源有 SSRF，并把内网响应片段回显给客户端**
`price:manage`（非敏感）可以把 source URL 设成任意 http(s) 地址（只校验了 scheme 和 host）。`fetchSource` 用的是没有拨号检查、默认跟随重定向的 `http.Client`；非 200 时把 `truncate(body,200)` 拼进错误，经 `ErrUnavailable.WithMessage` **返回给调用者**，还写进 `last_error` 可以反复读取。可以用来探测和读取内网服务、云元数据。
- CONTRACTS §14.2 的 SSRF 拨号检查只覆盖了网关上游，没覆盖这里。
- 改法：source 抓取改用 `proxy` 的直连 guarded transport（或 `netguard.DialControl`，见 P1-3）；重定向逐跳复检；错误信息不带响应体，只保留状态码。工作量 **S**。

### P1（结构性正确性 / 安全加固 / 明显性能）

| 编号 | 位置 | 问题 | 改法 | 工作量 |
|---|---|---|---|---|
| P1-1 | proxy/proxy.go:441-446（validate）、:652-679（test）；契约 CONTRACTS:449「经代理的连接不检查」 | `proxy:own:manage`（可下放给供应商，§21）能把代理 host 设成内网地址（`127.0.0.1:6379`、`10.x`），`POST /proxies/:id/test` 会从服务器拨过去，并把 `err.Error()` 原样返回（`probe` 的 Message）。这能用来扫描内网端口。账号流量也会被导向内网。**契约缺口**：§14.2 只管直连 | 代理 host 在保存和拨号时套 `netguard.BlockedAddr`（受 `AllowPrivateUpstream` 控制）；test 的错误信息归类（timeout/refused/tls），不带地址 | S |
| P1-2 | iam/http.go:21、:90；iam/auth.go:250 | `/auth/step-up` 和 `PUT /me/password` 没有失败限速（login 有 `loginLimiter`）。拿到 access token 的人可以在线爆破密码，进而拿到 step-up 能力 | 复用 `loginLimiter`，key 用 `stepup:fail:uid` | S |
| P1-3 | netguard/netguard.go:89-93 与 proxy/dialguard.go:22-33 | **两份私网黑名单已经漂移**，正是 netguard 包注释警告的情况：proxy 有 `::/96`、`2002::/16`（6to4 可以嵌入私网 IPv4）、`64:ff9b:1::/48`、`100::/64`、`fec0::/10`，netguard 没有；netguard 有 `64:ff9b::/96`，proxy 没有。插件给出的 URL（netguard 检查）可以用 `2002:7f00:1::` 绕过名称检查，只能靠拨号层兜底，而走代理时没有拨号层 | 合并为 `netguard.BlockedAddr` 一份（取并集）；`proxy.guardControl` 改成调 `netguard`；提供 `netguard.DialControl` 给 billing/remotedocker 复用 | S |
| P1-4 | billing/ledger.go:106-107、:123-125、:144-154 | 幂等去重只按 `idempotency_key` 查，不核对 `user_id/amount/credit/kind`。同一个 key 用在另一个用户上（插件 `plugin:<key>:<idem>` 由插件选择；管理员 `Idempotency-Key` 头可以复用）时，会**静默 no-op**，还返回**另一个用户**的 `balance_after`（跨用户信息泄露，插件也能拿到） | `findLedger` 返回行的 user_id/delta/kind，与请求不一致时返回 409 `conflict` | S |
| P1-5 | billing/precharge.go:20-35 vs usage/settler.go:692-714 | 预扣金额的计算（Compile → Normalize → Eval → ×rate → Round(8)）复制了 `priceOf`，而 `priceOf` 的注释声称自己是"唯一把用量变成钱的地方"。两份迟早会漂移，比如 Normalize 的参数、CreatedAt 兜底（priceOf 对零值取 now，Precharge 不处理） | 在 billing 提供 `Quote(in PriceInputs) (Quote, error)`，usage 的 settle/reserve/reconcile 和 Precharge 都调它 | S |
| P1-6 | billing/precharge.go:57 vs billing/ledger.go:208 | 余额门槛的边界不一致：`CheckBalance` 要求 `bal > min`，`Precharge` 允许 `bal - amount == min` | 统一成一个 `meetsMin(bal, min)` | S |
| P1-7 | billing/precharge.go:126-129 | `ReleaseExpiredPrecharges` 遇到第一个错误就 `return`，又按 `expires_at` 排序，所以一条坏数据会永久阻塞后面所有过期预扣的释放（队头阻塞） | 单条失败记日志后 `continue`，带失败计数 | S |
| P1-8 | billing/billing.go:96-102（`changedAfterCommit`，**已无调用者**）、gateway/sticky_api.go:648-650、authz/service.go:133-149（`committedLater` 轮询 2 分钟） | "调用方事务提交后再失效缓存"有 3 种写法：1 秒 `time.AfterFunc` 盲等（事务超过 1 秒就可能把旧值缓存一个 TTL）；后台 goroutine 轮询版本；手工在提交后调用 | `store` 提供事务级 `OnCommit(tx, fn)` 钩子（见 5.1），三处统一 | M |
| P1-9 | iam、authz、group、apikey、billing/prices、billing/settings、gateway 设置、usage 设置（全部没有 `audit.` 调用） | 审计只覆盖了 account/proxy/ccgateway/updater/插件。用户改密/禁用、角色和权限变更、分组、价格、全局设置这些**更敏感**的操作都没有审计（契约没要求，§21.2/§38 只列了部分） | 统一在 service 层用 `audit.Audit(ctx, tx, …)`，并在 CONTRACTS 补审计 action 清单 | M |
| P1-10 | 44/124 个 gin handler 直接写 SQL（billing 15、group 6、usage 6、proxy 5、account 4、apikey 4、gateway 3、iam 1，加上 audit 匿名函数） | 没有 repo/service 分层，事务边界、审计、事件散落在 handler 里，无法在非 HTTP 入口（插件 host API、任务）复用 | 按 iam 模板拆成 `repo.go / service.go / http.go`，见第 6 节第 5 批 | L |
| P1-11 | gateway/pipeline.go:24-93（`call` 36 个字段，68 个方法分布在 11 个文件） | 上帝对象：任何方法都能改任何状态。生命周期细节（`releaseBodies`、`usage` 异步抽取）全靠注释约束 | 拆子结构（见 3.3），异步部分只传不可变快照，不再捕获 `c` | L |
| P1-12 | app/app.go:72-431 | 360 行装配加生命周期加 managed 分叉，圈复杂度 53；`go X.Run(ctx)` 不被 join（198-201 行） | 引入 `Component{Start(ctx) error; Stop(ctx)}` 和 `lifecycle.Group`，按阶段拆函数 | M |
| P1-13 | 迁移缺索引：`usage_logs(client_request_id)`（`usage/api.go:185` 可以按它筛选，0006 加列时没建索引，全表扫描）；`api_keys(group_id)`（`group/group.go:84` 每个分组行都有子查询 count，`:377` 删除前检查）；`audit_logs(action)`（`audit/http.go:16,20`） | 数据量上来以后 usage 列表或分组列表会退化 | 新迁移 0026：`CREATE INDEX … usage_logs(client_request_id) WHERE client_request_id <> ''`、`api_keys(group_id) WHERE deleted_at IS NULL`、`audit_logs(action, id DESC)` | S |
| P1-14 | usage/api.go:228-237、account/handlers.go:358、apikey/apikey.go:307 等 9 处列表 | 每页请求都 `SELECT count(*)` 全量计数；usage_logs 是最大的表，带 JOIN 的 count 加大 OFFSET 会越来越慢；`httpapi.Pagination` 不限 page 上界（`respond.go:53-66`），`(page-1)*size` 在超大 page 时会溢出成负 OFFSET，导致 500 | usage 改为 keyset 分页（`created_at,id` 游标），total 改成可选或估算；`Pagination` 限制 page ≤ 1e6 | M |
| P1-15 | account/handlers.go:228-237 | 列表每行调一次 `Slots.InUse`（每页最多 200 次 Redis 往返，N+1）；同一函数里 cooldown 已经用了 pipeline | `core.Slots` 增加 `InUseMany(ctx, kind, ids)`（pipeline） | S |
| P1-16 | ccgateway/accounts.go:189-190 | 注释说"Account ownership is checked in desired"，但 `desired` 没有任何归属检查（只靠路由权限 `settings:*`）。注释会误导后人放宽权限 | 改正注释；如果以后开放给 own 角色，必须加 `scoped()` | S |

### P2（风格 / 一致性 / 死代码）

| 编号 | 位置 | 问题 | 改法 | 工作量 |
|---|---|---|---|---|
| P2-1 | apikey/apikey.go:150、:154-171（`cached` 带 json tag）、:251-258、:472/494/609；group/group.go:352、:401、:554、:576-610 | **死代码**：apikey 的 Redis 缓存已经不再写入（注释 :154 说故意不缓存），但删 key 的逻辑还在两个包里运行。group 每次改分组或成员还会先查一遍 `key_hash` 再 DEL 不存在的 key。group 也因此持有 `rdb` | 全部删除；group 去掉 rdb 依赖 | S |
| P2-2 | billing/billing.go:98 `changedAfterCommit`；job/job.go:291 `runScheduled`（只有测试用）；billing/pricer.go:18 `SourceSync`、billing/sync.go:36-37 `DefaultLiteLLMURL/DefaultModelsDevURL`、usage/settler.go:39 `SettleStatePending`、gateway/errors.go:21 `FormatPlain`（只有测试用）；gateway/ssrf.go:14-17 两个别名；`store/migrations/` 空目录 | 未使用的导出、函数、目录 | 删除，或在测试里改用真实路径 | S |
| P2-3 | iam/users.go:190、:325、:373、:399 | 事件类型用字面量 `"user.created"/"user.updated"`，而 `core/ports_billing.go:352-353` 已经定义了 `EventUserCreated/EventUserUpdated`，常量因此没人用 | 改用常量 | S |
| P2-4 | account/service.go:256、apikey/apikey.go:292、group/group.go:110、iam/ratelimit.go:129、proxy/proxy.go:311 | `t(ctx,en,zh)` 复制了 5 份；iam/billing/usage 的大部分错误只有英文；ccgateway 只有硬编码中文（`ccgateway/http.go:67,92,96,101,113,117,145,151`） | 用 `core.T(ctx,en,zh)` 统一，并在 lint 中禁止裸中文或裸英文 message | S |
| P2-5 | account/handlers.go:352、apikey/apikey.go:375 vs iam/users.go:87、billing/prices.go:148 | `ILIKE '%'||?||'%'` 时，前两处没转义 `%`、`_`，后两处有自己的 `escapeLike` | 放进 `store.Like(s)` 统一处理 | S |
| P2-6 | 小工具重复：`itoa`×3、`truncate/trunc/truncateUTF8`×5（`usage/settler.go:340` 是 UTF-8 安全的，`billing/sync.go:439` 不是）、`mustJSON`×2、`nullID`×2（加上 usage 里内联的第 3 份 `reconcile_settings.go:265-269`）、`uniqueIDs`×2 | 复制粘贴 | 新增 `internal/x`（或 `core/util`）：`Itoa64`、`TruncUTF8`、`PtrIfPositive`、`Uniq[T]` | S |
| P2-7 | 日志 | `slog.WarnContext` 默认实例和注入的 `*slog.Logger` 混用；`usage/settler.go:260,295` 用无 ctx 的 `slog.Error`；`ccgateway/http.go:48` 审计失败日志里没有 err | 统一注入 logger，并带 `request_id` | S |
| P2-8 | usage/settler.go:256-262 | 重试 `time.Sleep(backoff)` 不响应 ctx，关停时最多多等 1.5 秒 | 改成 `select { case <-ctx.Done(): case <-time.After(b): }` | S |
| P2-9 | apikey/apikey.go:445-457 | `groupAvailable` 检查和 `INSERT` 不在同一事务；分组在两步之间被删时，触发 FK 违例返回 500 | 放进事务（`FOR SHARE` 锁住分组），或把 23503 映射成 `group_id not_available` | S |
| P2-10 | billing/balance.go:155-170 | 管理员调余额的 `amount` 没有上限；超过 numeric(20,8) 时 PG 报错，返回 500 | 校验上限 | S |
| P2-11 | audit/http.go | 路由是匿名函数，局部变量名 `context`；`to_jsonb(a)` 直接把整行吐给前端（以后加敏感列会自动泄露） | 写成具名 handler，显式列出字段 | S |
| P2-12 | iam/service.go:34 + JWT 2 小时 | 管理员改他人密码或禁用用户后，旧 access token 在最多 30 秒（状态缓存）内仍有效；改密码只吊销 refresh token。和契约一致，但 P0-1 修好之前这会放大影响 | 用户表加 `token_version` 写进 JWT，校验时比对（可选） | M |
| P2-13 | apikey 认证热路径 | `Authenticate` 每个网关请求都要查一次 PG（3 表 JOIN 加 EXISTS）。注释说明是为了正确性有意不缓存 | 保留这个不变式；以后如有需要，可以用 authz 式的"版本号 + bus 失效"本地缓存，不用 Redis 回填 | M |

---

## 5. 可抽象的公共层设计（草图）

以下设计都不违背 CONTRACTS 的不变式：事务内 ledger+usage+outbox、锁不带 fencing 时第二重保护在 DB、`usage:{request_id}` 幂等键、API Key 认证不回填缓存。

### 5.1 `store`：事务提交钩子、WHERE 构造、分页查询

```go
// store/tx.go —— 让"提交后失效 / 广播 / 刷余额缓存"成为一等公民
type hookedTx struct {
    pgx.Tx
    after []func(context.Context)
}

// OnCommit 在外层 DB.Tx 提交成功后执行 fn；tx 不是 DB.Tx 创建的时候立即执行（兼容测试替身）。
func OnCommit(tx pgx.Tx, fn func(context.Context)) {
    if h, ok := tx.(*hookedTx); ok { h.after = append(h.after, fn); return }
    fn(context.Background())
}

func (db *DB) Tx(ctx context.Context, fn func(pgx.Tx) error) error {
    // ... Begin -> &hookedTx{Tx: raw} -> fn -> Commit -> for _, f := range h.after { f(context.WithoutCancel(ctx)) }
}
```

替换以下写法：`billing.changedAfterCommit` 的 1 秒 AfterFunc、`gateway.SyncPluginDefaults` 的 AfterFunc、`authz.committedLater` 轮询、`usage.insertAtomic` 的 `cached []balanceUpdate` 手工收集、`ledger.Apply` 里的 CacheBalance。

```go
// store/where.go —— 替换 5 份 "?" -> "$n" 的手写构造器
type Where struct{ conds []string; args []any }
func (w *Where) Add(cond string, args ...any) *Where   // cond 里每个 ? 依次编号
func (w *Where) If(ok bool, cond string, args ...any) *Where
func (w *Where) SQL() string                           // "" 或 " WHERE a AND b"
func (w *Where) Args() []any
func (w *Where) Next() string                          // 下一个占位符 "$n"，供 LIMIT/OFFSET 使用
func Like(s string) string                             // 转义 % _ \

// store/page.go
type PageReq struct{ Page, Size int }
func ListPage[T any](ctx context.Context, q Querier, from, cols, order string, w *Where, p PageReq,
    scan func(pgx.Row) (T, error)) (items []T, total int64, err error)
```

### 5.2 `httpapi`：查询参数解析与 handler 适配器

```go
// 声明式筛选，替换 usage/billing/apikey/account 中重复的 strconv 加错误映射
type Filter struct {
    Param, Cond string           // "user_id", "u.user_id = ?"
    Kind        FilterKind       // Int64 | String | Bool | RFC3339 | Like
}
func ApplyFilters(c *gin.Context, w *store.Where, fs ...Filter) error // 出错时返回 invalid_argument，字段名为 Param

// 适配器：消除 187 处 `if err != nil { Fail; return }`
func JSON[Out any](fn func(c *gin.Context) (Out, error)) gin.HandlerFunc
func Body[In, Out any](fn func(ctx context.Context, in *In) (Out, error)) gin.HandlerFunc // Bind + 调用 + OK/Fail
func Paged[T any](fn func(c *gin.Context, p store.PageReq) ([]T, int64, error)) gin.HandlerFunc
```

### 5.3 `settings.Doc[T]`：替换 billing、gateway×2、usage reconcile、ccgateway 四份实现

```go
type Doc[T any] struct {
    Key      string                                    // settings.key
    Defaults func() T
    Validate func(ctx context.Context, v *T) []core.FieldError // 校验合并后的完整值
    Normalize func(*T)                                  // 可选
    TTL      time.Duration
    Bus      core.Bus                                   // config:changed {"key": Key}
    cache    cache.Epoch[struct{}, T]
}
func (d *Doc[T]) Get(ctx context.Context) T                         // 带缓存，读失败返回默认值且不缓存
func (d *Doc[T]) Load(ctx context.Context, q store.Querier) (T, error)
func (d *Doc[T]) Patch(ctx context.Context, actor int64, patch any) (T, error) // UpdateSettingJSONTx + Validate + OnCommit(失效+广播)
func (d *Doc[T]) Routes(r *httpapi.Router, path, readPerm, managePerm string)
```

现在每个模块都把 PATCH 的指针 struct 写了两遍（load 的 `partial` 一遍，put 的 `in` 一遍），见 `billing/settings.go:74-79` 和 `:117-122`、`usage/reconcile_settings.go:186-191` 和 `:224-229`。改成 Doc 后，T 的 JSON 解码到"已填默认值的 T"即可，不再需要 partial。

### 5.4 `cache.Epoch[K,V]`：替换 7 份 "mu + epoch + snapshot + TTL"

```go
type Epoch[K comparable, V any] struct { mu sync.Mutex; epoch uint64; ttl time.Duration; m map[K]entry[V] }
func (c *Epoch[K, V]) Get(ctx context.Context, k K, load func(context.Context) (V, error)) (V, error) // 加载期间 epoch 变了就不写回
func (c *Epoch[K, V]) Invalidate(keys ...K)                                                        // 不传 key 时全清，epoch++
```

使用点：billing prices/settings、gateway settingsCache/ruleCache、account groupSnapshot、iam 状态缓存、usage reconcileCfg、proxy clients。

### 5.5 校验收集器与 i18n

```go
func T(ctx context.Context, en, zh string) string
type V struct{ ctx context.Context; fs []FieldError }
func NewV(ctx context.Context) *V
func (v *V) Check(ok bool, field, code, en, zh string) *V
func IntRange[N int | int64](v *V, field string, p *N, lo, hi N)        // nil 时跳过
func (v *V) Err() error                                                // nil 或 InvalidFields
```

`account/handlers.go:482-552`、`proxy/proxy.go:415-464`、`iam/users.go:234-259`、`billing/settings.go:124-147`、`usage/reconcile_settings.go:233-262` 都可以收敛到这里。

### 5.6 资金：`billing.Quote` 与严格幂等

```go
type PriceInputs struct { Expression, Semantics string; Tokens core.UsageTokens; Metrics map[string]any;
    Params, Headers map[string]string; At time.Time; Rate decimal.Decimal }
type Quote struct { Total decimal.Decimal; Detail BillingDetail; ExprHash string }
func Quote(in PriceInputs) (Quote, error)  // 唯一入口：usage.settleTx / reserveTx / reconcile 与 billing.Precharge 都调用

// ApplyTx：重复 key 但 (user_id, delta, kind) 不一致 -> core.ErrConflict
```

### 5.7 安全公共件

```go
// netguard：唯一的黑名单 + 拨号钩子 + 可复用 transport
func BlockedAddr(netip.Addr) bool                    // 合并 proxy.extraBlocked 与当前列表
func DialControl(allowPrivate bool) func(network, address string, c syscall.RawConn) error
func GuardedClient(allowPrivate bool, timeout time.Duration) *http.Client // CheckRedirect 逐跳复检
// secret：集中 AAD
func AADAccount(pluginKey string) []byte; var AADProxyPassword, AADPriceSourceKey, AADCCGatewayConfig = ...
```

### 5.8 模块分层模板（以 iam 为样板）

```
module/
  repo.go     // 只写 SQL；所有函数接受 store.Querier（pool 或 tx）；返回行结构
  service.go  // 领域规则、事务编排、audit.Audit、events.Emit、store.OnCommit；不 import gin
  http.go     // RegisterRoutes + 薄 handler（httpapi.Body/Paged 适配器）
  types.go    // View / Input / 常量
```

---

## 6. 分批重构计划

每批都能独立合入。通用验证：`go build ./... && go vet ./... && TEST_DATABASE_URL=… go test ./internal/... -count=1`。**必须带 PG 跑**，否则 DB 测试全部 Skip。另外按 memory 规则，PG 测试由主控自己跑；涉及 HTTP 契约的批次再跑一次 e2e 冒烟。

| 批 | 内容 | 涉及文件 | 验证 | 工作量 |
|---|---|---|---|---|
| **0 安全热修** | P0-1（guardTarget 泛化，改他人密码要求 step-up 或独立敏感权限）、P0-2（价格源走 guarded client，错误不回显响应体）、P1-1、P1-2、P1-3（合并黑名单）；同步更新 CONTRACTS §4/§5.2/§14.2 | iam/users.go、iam/http.go、authz/catalog.go、billing/sync.go、proxy/*.go、netguard | 新增单测：`user:update` 操作者改 admin 密码得 403；连续 step-up 失败触发 429；`2002:7f00:1::` 被 netguard 拒绝；price source 指向 127.0.0.1 时返回 503 且 message 不含响应体 | S-M |
| **1 资金路径** | P1-4 ledger 严格幂等、P1-5 `billing.Quote` 统一、P1-6 余额边界统一、P1-7 释放预扣不阻塞 | billing/ledger.go、precharge.go、usage/settler.go、reconcile.go | 现有 billing/usage DB 测试；新增：同 key 不同用户返回 409；precharge 与 settle 对同一记录（含时段规则）算出相同金额；一条坏预扣不影响其余释放 | S-M |
| **2 清死代码与小工具** | P2-1~P2-8：删 apikey/group 的 Redis 残留、未用导出、空目录；`core.T`、`x.TruncUTF8` 等；事件常量；日志统一 | 多文件机械修改 | build/vet/test；`grep -rn '"apikey:"'` 为空 | S |
| **3 store 公共层** | `store.OnCommit`、`store.Where`、`store.Like`、`store.ListPage`、`httpapi.ApplyFilters`、`Pagination` 上界；先迁移 audit、apikey、group、iam 的列表 | store/、httpapi/、4 个模块 | 列表 API 的响应快照对比（同一批 query 参数，新旧 JSON diff 为空）；Where 构造器的表驱动单测 | M |
| **4 settings 与缓存** | `settings.Doc[T]`、`cache.Epoch`；迁移 billing/gateway/usage/ccgateway 设置；三种"提交后失效"改用 OnCommit（P1-8） | billing/settings.go、gateway/settings*.go、usage/reconcile_settings.go、ccgateway/config.go、authz/service.go | 设置 GET/PUT 契约测试；多节点失效测试（`audit_multinode_test`、`tasks_crossnode_test` 类）；去掉 AfterFunc 后的竞态测试（事务人为 sleep 2 秒再提交，缓存不应读到旧值） | M |
| **5 模块分层** | 按 5.8 模板拆分，**一个模块一个 PR**，按 account → billing（sync/prices/balance）→ proxy → usage(api) → group → apikey 的顺序；同时补 P1-9 审计；修 D2/D3（api_keys 归属收口到 apikey，ccgateway 通过端口取凭证） | 各模块 | 每个模块的 ownership/DB 测试全部通过；`go list -deps` 检查 service.go 不导入 gin；新增审计行断言 | L |
| **6 装配与生命周期** | `Component` 与 `lifecycle.Group`；拆 `app.run`；所有 `Run(ctx)` 都纳入 join；D1 补 `core.RoleAssigner` 端口，gateway 不再依赖 `*config.Config` | app/*.go、iam/service.go、gateway/gateway.go | `app/lifecycle_test`、`managed_*_test`；关停顺序测试（db.Close 晚于所有 flush） | M |
| **7 网关结构** | `call` 拆子结构；`forwardSSE` 拆成 scanner 和 sink；`dispatch/forwardBuilt/pick` 降低嵌套；ccgateway 特判改为平台能力（如 `core.UpstreamClientProvider` 按 plugin_key 注册） | gateway/*.go、account/testreq.go | 现有 gateway 测试（含 websocket、round4、respshape、task_failure）；SSE 透传、转换、jsonArray 三种模式的字节级 golden 测试 | L |
| **8 数据层性能** | 迁移 0026 索引（P1-13）；usage 列表改 keyset 分页、total 可选（P1-14）；`Slots.InUseMany`（P1-15） | migrations、usage/api.go、account/handlers.go、cluster slots（需要和多节点队友协调接口） | `EXPLAIN` 断言走索引；分页契约测试（前端兼容：保留 page 参数，加 `cursor`） | M |

建议顺序：0 → 1 → 2 → 3 → 4，这几批可以连续合入；5、7 工作量大，按模块逐个推进；6、8 可以和 5 并行，但同一个 Go 模块同一时间只安排一个写者。

---

## 附：方法说明

- 函数和复杂度统计：`go/ast` 遍历非测试文件，排除 plugin/cluster/updater，按行数、圈复杂度、控制流嵌套深度排序。
- handler 含 SQL 统计：参数里有 `*gin.Context` 的函数体（含闭包）中出现 `Query/QueryRow/Exec/SendBatch` 调用或 SQL 字面量。
- 死代码：导出标识符在整个 `next/` 的非测试代码里只出现一次（即只有定义）；非导出标识符在本包非测试代码里只出现一次。另外手工确认了 `changedAfterCommit`、`runScheduled`、Redis apikey 缓存。
