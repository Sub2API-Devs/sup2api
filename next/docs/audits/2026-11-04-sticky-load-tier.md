# 2026-11-04 粘性会话失效排查、按负载降权、套餐显示

起因：#123（shaquella3015032003@hotmail.com）5h 额度只用了 $13.38、24 次成功请求就到了 114%。本文记录排查结论、用户决定和实施方案。代码以 `30fdac052`（已合入远端 6571924c1 等 9 个提交）为准。

## 1. 结论

1. #123 是 **Pro** 账号（`subscription_type=pro`，`rateLimitTier=default_claude_ai`）。Pro 一个 5h 窗口约等于 $11–12 的 API 价格。加入时首个响应的 5h 用量为 7%，没有平台外的人在用。
2. 额度消耗快的根本原因：一个超大的 Claude Code 会话（1M 上下文、主线程 1700+ 条消息、5–7 个并发子代理）在 Pro 号之间来回迁移。每迁移一次，就要把 30–85 万 token 的上下文重新写入缓存（$2–4），这一笔就吃掉一个 Pro 号 5h 额度的 25–35%。
3. 调度确实有缺陷：**粘性绑定在请求结束后才写入**，**溢出请求会改写绑定**，**同时 429 的请求会直接报错**。6571924c1 的"满并发排队"只缓解了其中一种情况。
4. 权重参与选号，但生产上 60 个号的 priority 和 weight 全部相同，新会话等于均匀随机。
5. "按 7d 负载降权"目前不存在：核心有降权接口，但 ccgateway 不上报负载，排序时也拿不到额度。

## 2. 案例数据

### 2.1 #123 的 5h 用量变化（来自上游响应头 anthropic-ratelimit-unified-5h-utilization）

| 时间 (UTC) | 事件 | 5h |
|---|---|---|
| 08:13 | 首个请求（缓存写入 22K） | 7% |
| 08:36 | 缓存写入 35 万 token，$1.75 | 10% → 26% |
| 09:16–09:17 | 约 15 个并发 Opus 请求，大多命中缓存 | 33% → 58% |
| 09:17:52 / 09:17:59 | 两次大上下文缓存未命中：写入 68 万和 73 万 token，共 $7.1 | 58% → 84% → 114% |

### 2.2 会话 e2ac1dc3 的全貌

数据来源：各账号容器的请求日志（`metadata.json` 中的 client_session_id 和 `upstream-request.json` 中的 x-claude-code-agent-id），按 request_id 关联 usage_logs。

- 客户端：`claude-cli/2.1.309 (external, claude-desktop-3p, agent-sdk/0.3.309)`，API Key 118。
- 时间跨度：11-03 晚到 11-04 上午，共 399 次请求、$276.75，经过 **28 个账号**（全是 Pro）。
- 缓存写入超过 10 万 token 的请求有 126 次，共 **$247.56（89%）**。
- sticky_hit=false 的请求有 **32 次，共 $56.78**，几乎全是整段上下文重建。
- 路径片段：114（09:08–09:16，30 次，$11.81）→ 429 → 123（09:16–09:18）→ 429 → 88。

### 2.3 Key 118 的账号池

07:00–10:00 之间，Key 118 的流量打到约 37 个 Pro 号，大部分进入 `auto_disabled`（5h 被拒）。

## 3. 粘性会话失效的根因

规则：`claude-code-session`，key 取自 `body.metadata.user_id`，ttl 3600，key_includes 为 `[group, model, rule]`，on_failure 为 failover。网关启用 failure policy（ResetSticky=true）。账号 60–113 的 max_concurrency 为 4，114–123 为 10。

| # | 问题 | 位置 | 现状 |
|---|---|---|---|
| 1 | 绑定只在请求成功结束后写入。429 后绑定被重置为 0；新会话也先写 0 占位。在这期间，同一会话的并发请求读到"未绑定"，各自随机选号 | `sticky.go` finishSticky；`failure_policy_sticky.go`；`dispatch.go` tryStickyBinding（`bound == 0` 时直接返回） | 存在（最严重）。例：09:11:23 同一秒 3 个请求落到 114、107、120 |
| 2 | 溢出到别的号的请求成功后，也会用 CAS 改写绑定，会话被拉走 | `sticky.go` finishSticky → writePolicyBinding | 存在 |
| 3 | 每次请求成功都换一个新 uuid。同一会话里后到的 429 请求重置绑定时 CAS 失败，返回 sticky_reset_failed，不再换号，429 直接回给客户端 | `failure_policy_runtime.go` prepareRetry | 存在（新发现） |
| 4 | 绑定账号满并发时直接溢出 | `dispatch.go` | 6571924c1 改为排队，但最多 3 个、等 120 秒，所有会话共用；超出后仍溢出 |
| 5 | admitRate 拒绝时 s.hit 已经是 true，记录误报 sticky_hit=true | `dispatch.go` | 存在 |
| 6 | key 含 model：主线程和子代理用不同模型时，各自独立绑定 | `sticky.go` stickyKey | 设计如此 |
| 7 | 绑定账号被额度预检过滤掉时不删除绑定，每个请求各自随机，再由第一个成功者改写 | `availability.go`、`dispatch.go` | 存在 |

排队能管和管不到的情况：

| 情况 | 排队能否解决 |
|---|---|
| 已绑定，绑定账号只是并发满 | 能，最多排 3 个 |
| 429 后绑定被清成 0 | 不能（没有可等的账号） |
| 新会话第一批并发请求 | 不能 |
| 溢出请求成功后改写绑定 | 不能 |
| 同一会话两个请求同时 429 | 不能 |
| 绑定账号额度已满（exhausted） | 不能，直接溢出 |
| 所有号都满时的兜底排队 | 挑负载最低的号，不看绑定 |

## 4. 权重调度现状

- 同一优先级内按权重做不放回加权随机（`dispatch.go` pick 和 weightedOrder）。weight ≤ 0 按 1 处理。插件可以通过 rankOverrides 改写每个请求的 priority 和 weight。
- 粘性命中时不看权重，所以权重只影响新会话落在哪个号。
- 所有号都满时，兜底排队选的是 (占用 + 排队) / max_concurrency 最小的号，不看权重（`account_queue.go` queueTarget）。
- 生产上 priority 和 weight 全部相同，等于均匀随机。
- 测试方面只有 TestWeightedOrder 验证分布。集成测试把随机源固定为 0，没有端到端的分布测试。

## 5. 负载降权

### 5.1 现状
- 核心 §67：插件的 RankedAccount.load 取 0–100，核心按 `w = w*(100-load)/100` 降权（`gateway/rank.go`）。默认 weight=1 时，整数除法下只要 load > 0，权重就变成 0，账号被降为本层的 reserve，而不是按比例降。
- RankCandidate 和 AccountRef 都没有额度和套餐信息。
- ccgateway 没有声明 scheduler.rank.v1，也没有实现 RankAccounts。dynweight（order 100）按错误率和耗时调权重，与额度无关。
- 额度窗口：manifest 只被动采集 5h 和 7d 两组响应头。官方 CLI 2.1.318 每次响应都按 `five_hour→5h`、`seven_day→7d`、`seven_day_overage_included→7d_oi`、`overage→overage` 读取 `anthropic-ratelimit-unified-*` 头，Fable 请求的响应里带 `7d_oi`。线上 2.8 万条响应日志里没有一次 Fable 请求，所以看不到这个头；ccgateway 也没有声明它。

### 5.2 方案（用户需求，11-04 修订：按请求模型选窗口，与套餐无关）
- 请求的是 Fable 模型：load = 7d Fable（7df）利用率。
- 其他模型：load = 7d 利用率。
- 负载越高，权重越低。
- 7d Fable 缺失、过期或已过重置时间时，Fable 请求改用 7d。7d 也没有时，load = 0。
- 原方案"Max 按 7d 和 7d Fable 各一半"已作废。
- 7d Fable 的数据来源：在 ccgateway manifest 里声明被动采集 `anthropic-ratelimit-unified-7d_oi-*`，每次调用都会更新。不做定期刷新，也不做主动查询。
- 负载只降权，不排除账号。额度用完由可用性预检和 429 处理。
- 粘性命中不走排序，所以负载只影响新会话和换号。
- 实现分工：
  - 核心给 RankCandidate 增加额度快照和 subscription_type，数据来自内存镜像，不增加上游查询；同时修正整数除法问题。
  - ccgateway 实现 RankAccounts，order 排在 dynweight 之后。

## 6. 套餐显示

- 已核对最新官方 CLI 2.1.318（npm latest，linux-x64 二进制字符串）：套餐 = `claudeAiOauth.subscriptionType`（pro / max / team / enterprise）加上 `claudeAiOauth.rateLimitTier`（default_claude_ai / default_claude_max_5x / default_claude_max_20x）。没有 "ultra"。
- 生产 82 个号：80 个 pro / default_claude_ai，2 个 max / default_claude_max_20x。
- 用户决定：**上游是什么就显示什么**，不加倍率，不起新名字。
- 方案：
  - Worker 从凭证读取 rateLimitTier 并随 subscription_type 一起上报；
  - 核心用迁移 0087 增加 accounts.rate_limit_tier 列，记录并通过 API 返回；
  - 前端原样显示，例如 "max · default_claude_max_20x"。
- 生效条件：Worker 的改动要随 ccgateway 镜像发布才生效；旧镜像不上报这个字段，前端就不显示 tier。

## 7. 长上下文 429

- 生产原文：`Usage credits are required for long context requests.`（429），claude-sonnet-4-6 和 claude-opus-4-6 都出现过。
- 用户决定：按这句错误文字匹配，**所有模型**都不重试、不换号、不冷却、不禁用账号，原样返回给客户端。
- 方案：做成一条默认重试规则；如果默认规则存在数据库里，用迁移 0086 幂等补上。同时确认失败规则不会因这条 429 禁用账号。

## 8. 用户决定汇总

| 项 | 决定 |
|---|---|
| 账号满并发 | 按我们配置的排队规则排队；排队期间该账号不接受新会话绑定 |
| 已绑定会话的排队上限 | 默认改为 8（设置项保留可改） |
| 长上下文 429 | 按错误文字匹配，所有模型，直接返回 |
| 套餐显示 | 上游是什么就显示什么（subscriptionType + rateLimitTier） |
| 套餐倍率 | 不使用 |
| 负载公式 | 请求 Fable 模型用 7d Fable，其他模型用 7d（与套餐无关） |

## 9. 实施分工与状态

三个 agent 各自在独立 worktree 中实现，基点 `30fdac052`。worktree 默认从过时的 main（27c416483）切出，已让三个 agent 都重置到基点。

| 分支 | 范围 | 迁移 | 状态 |
|---|---|---|---|
| impl-sticky | 核心 gateway：选中时就写绑定、溢出不改写、按账号重置、命中只续期、排队中的账号不接受新会话、排队上限 8、sticky_hit 误报修正、长上下文 429 默认规则 | 0086（如需要） | 进行中 |
| impl-load | next/sdk 的 RankCandidate 增加额度快照、核心 rank.go 改为按比例降权、ccgateway 实现 RankAccounts（按请求模型选 7d Fable 或 7d） | 无 | 进行中 |
| impl-tier | Worker 上报 rate_limit_tier、核心记录并通过 API 返回、前端显示 | 0087 | 进行中 |

测试清单（miniredis 加 PG，不能静默跳过）：
- 新会话的并发请求落到同一账号；
- 429 重置后的并发请求跟随新账号；
- 溢出请求成功后绑定不变；
- 同时 429 的请求都能换号；
- 排队中的账号不被新会话选中；
- 长上下文 429 原样返回；
- 负载公式各分支，以及 weight=1 时不会降成 0；
- 排序顺序排在 dynweight 之后；
- rate_limit_tier 全链路。

每个 Go 模块都要跑 go vet、go test 和 `GOOS=linux go vet`。

## 10. 发布注意

- proto 有变化：先发核心（旧插件会忽略新字段），再发 ccgateway 插件。核心发布前要确认外壳的 Host API 满足要求。
- 迁移 0086 和 0087 随核心重启自动执行，必须幂等。
- rate_limit_tier 要等 ccgateway 新镜像发布、Worker 上报后才有值。
- 本轮不改的配置：账号的 priority 和 weight、max_concurrency，以及 key_includes 里的 model（是否去掉由用户另行决定）。
