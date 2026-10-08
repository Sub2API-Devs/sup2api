# 隐藏 helper 历史：核心传输与用量 outbox 候选

2026-10-08，仅候选骨架，未部署、未接网关、没有开放一般 task_budget + internal ToolSearch 门禁。

A 的 HelperHistoryCompletion 包含冻结 UsageRecord，成功 Commit 同事务保存历史证据与加密用量 outbox。冲突证据不能因返回错误而回滚丢失：统一 core.HelperHistoryStorageFailure 将外部结果冻结为503/失败/gateway_helper_history_storage，保留真实 tokens、price、attempts；普通事务失败也由调用方用相同规则 PersistUncertainUsage。DB 全不可用不能宣称持久成功。

C 新增 usage/helper_history_outbox.go：PersistUsage 同步复用既有 usage_logs 插入事务；DrainHelperHistoryUsage 必须持久化成功才 ACK，失败保留待重放，按核心 request_id 的数据库唯一约束防重复用量。ACK 前崩溃允许重复投递，不声称恰好一次投递。没有将现有 Settler.Submit（仅入内存队列且无返回）冒充 durable commit。

独立模拟测试验证错误/取消/ID不一致不ACK、ACK失败重放同一冻结事实，2.443s通过，vet通过。尚未运行本骨架的真实DB崩溃/并发重放测试，尚未接后台循环或 app wiring。

Worker B 与核心 C 尚待共同冻结有界私有请求/响应 envelope。32MiB历史不能放HTTP header；公有客户端不能直接注入内部历史；原始公开响应必须等历史+用量outbox提交后才外发。预期 SSE 仅该组合需要有界缓冲，但 framing、取消、资源/credit组合与取证位置仍需设计，不将本文件当作已完成实现。当前先完成线上 Sonnet 独立缺陷闭环，不与 Worker .72 急修混合提交。

## 增量整改与当前边界

持久消费者现名为 `PersistHelperUsage`，不再仅凭 request_id 唯一冲突视为成功。0044 的持久摘要收据与 usage 插入使用同一事务：已有同 ID 异事实、普通 Submit 已占用 ID、收据存在但 usage 行缺失均明确失败且不 ACK。共享版本化 FrozenEnvelope 保留原始加密载荷解密后的字节，先核原字节摘要，再严格解码并对照实际 Record；未来新增零值字段不误判旧数据，未知新字段不会被丢弃后 ACK。UseNumber 保留大整数和小数词法。

真实隔离 PostgreSQL 验证：收据冲突/缺失/普通来源碰撞/旧 envelope 兼容测试通过（93.651s）；A 新编码的歧义与过期/outbox 回归通过（64.789s）；PendingUsage 大整数及小数词法与冻结摘要通过（21.289s）。这不是生产数据库验证，也不意味着 gateway 已完成接线。

私有请求/响应 DTO 已冻结于 contracts/helperhistory/transport.go：单值 opt-in header，绑定 AttemptID、最终请求规范摘要、namespace、实际 issuer；公开 JSON/SSE 响应按原字节 base64 承载，恢复真实内部 HTTP 状态和安全响应头。总 envelope 80MiB、单公开 body/history/delta 32MiB。namespace 绑定映射模型、CLI 版本、有效策略，不把采样或预算值加入。

计量失败合同新增 source=public/provider_calls：正常公共出口使用已聚合用量；公共出口尚未产生 usage 的失败可用按每次真实 provider response 分组的证据，二者互斥，禁止将多个调用当成同一消息的累计 delta。最多128帧、合计1MiB，Known/Complete 明确；不完整证据不能冒称完整零用量。新增合同测试通过1.624s。B producer 和 C reducer 仍需完成集成验证。

尚未完成：gateway 路由 Lookup/固定账号、最终 Build 后包裹、响应解包、提交前缓冲、后台 outbox/expiry app wiring、ABC 联合独审。一般组合门禁继续关闭；线上版本及配置没有因这些候选改动。

## C 第一组实际接线检查点

已实现 gateway/helper_history_request.go、helper_history_response.go 及 pipeline/dispatch 的窄接线。外部入口和最终插件头无条件剥离私有 helper header；已知链按 owner 的全部公开 assistant 边界 Lookup，固定原账号/issuer/namespace，不旁路其他插件。首次未知的旧 assistant 历史明确拒绝，不凭空补收据。最终 Build/patch 后校验公开历史未变、读取 Worker schema 能力和 CLI/policy namespace、验证真实 issuer，再 Reserve/MarkDispatched 并包裹精确请求。派发后不自动重试模型。

响应先验证 envelope 身份并恢复真实 inner HTTP status、公开 JSON/SSE 和安全头，再走既有协议和用量处理。仅托管请求使用有界 writer，禁 Hijack/Pusher；隐藏载荷不交客户端。成功且完整的公开 assistant 产生新 immutable 收据；普通无 helper 轮也保存空 Payload，使后续完整 prefix 链可恢复。Commit 失败以新有界 context 冻结失败用量，所有已经派发的托管请求均绕过普通异步 Submit，避免 outbox 与无摘要普通记录竞争。DB 完全不可用时明确503和结构化错误，不宣称原始 Worker 日志等同冻结账本或费用已保证持久。

partial provider_calls 的各调用使用独立用量归约器和独立 PricedUsage，保留 categorical facts，不把多个响应的累计字段互相覆盖，也不和公共聚合重复收费。Complete=false 保留 BillingError；inner400/502一样读取已观察计量。首版只接 declarative usage，不让异步 plugin ExtractUsage 覆盖这份事实。

app 已接 HelperHistory store 与受 managed ready 门禁保护的 outbox/expiry 维护循环。`EnableHelperHistory` 默认仍 false；Worker advertised schema 未由本检查点开启。源码接线不是生产已支持证明。

验证：全 gateway 包 5.592s PASS；目标 TestHelperCustody + TestReviewHelper 3.156s PASS；gateway/app/usage vet 全部通过。HTTP 隔离覆盖 JSON/SSE、普通空收据/回退、旧 Worker、绑定变化、原始400、502两调用部分用量、Commit冲突503不漏成功、全存储失败不回普通Submit。这里使用内存 store 与假的 capability/provider；先前真实PG存储证据仍分别列出，不能代替尚待运行的 ABC 全链路真实CLI+PG测试。已交 root 非作者独审。

## 用量重放队列阻塞整改

独审指出原 consumer 首错返回，单条永久摘要冲突会挡住后续正常记录；仅 continue 仍无法越过最前64条永久失败。C已按A新增 DeferUsage 合同修复：每项身份/persist/ack失败持久延后再继续本批，不ACK、不丢弃；Defer本身失败也汇总上报。context取消立即停止，不把取消当作永久数据故障。

新增模拟due队列测试覆盖64条失败延后后第65条正常记录可在下轮完成、混合持久化/ACK/身份/延后失败仍处理good、取消不ACK不Defer。usage目标测试2.501s和vet通过，A独立starvation红例转绿。模拟测试不是持久调度的DB证明；A正负责 next_attempt_at/migration 和真实隔离PG的损坏行/分页验证。gateway/app仍保持上一组冻点，生产门禁与运行态未改。

## 首次未知链的派发前资格选择

仅已验证完整能力文档中缺 helper schema，或 Worker 已确认 API-key 模式而缺管理员稳定 issuer/generation，才归类为不具备资格。后者新增固定内部错误类型 resource_identity_unsupported；HTTP仍503。Core仅识别该精确状态/类型，普通 api_error、超时、profile和持久错误均不得假装不支持。

只有 lookupUnknown、没有 Reserve ID、没有 Dispatch 的请求可用既有 resourceEligibilityError 尝试下一候选。已知链保持原账号；已预留或已派发不换。测试覆盖 #21明确不合格→#22（provider仅一次）、known失败不换、reserved/dispatched否例及timeout/DB失败不换。gateway目标3.073s、coreccgateway解析0.628s及相关vet通过。真实本地CLI `TestRealCLIResourceMissingIssuerIsTypedWithoutProviderCall` 2.547s：仅auth status、本地隔离假上游0调用，收到typed503；engine vet通过。未将该探针称为真实provider推理或线上资格验收。

## 启用前兼容修正：只为真实内部轮次建立托管

原候选仅凭 task_budget 存在便要求托管，会误拒绝既有全 eager 强制零 helper、关闭内部搜索、服务端工具/资源预算和普通历史。现由同账号 Worker 的固定只读 requirement 路径复用实际解析器，核心不复制工具分类规则。探针使用最终 Build 后 body、实际有效策略和原 beta，由模型直连传输发送；不通过 controller 转发请求正文。

三态 ordinary / needs_custody / defer_to_ordinary：只有真实隐藏轮次专用 typed gate 返回 needs_custody。缺资源授权上下文或其它普通解析错误返回 defer，由原完整 main 准入裁决，不声称已合法。旧 Worker 404 同样回原 plain 路径，不传私有历史。未知新链在探针之前不取 issuer、不 Reserve；已知链不调用探针，仍强制精确恢复且绝不404降级。网络错误/非法探针响应503，不冒充普通或账号不支持。

shared 三态严格 JSON/版本/枚举/重复字段测试1.456s通过；core gateway HelperRequirement/Custody/ReviewHelper目标3.576s及 gateway/ccgateway vet通过。新增资源+旧历史绕过新托管且保留最终 body/header、无 issuer/Reserve测试；known链禁止探针测试3.708s通过。ABC夹具已接实际 Worker requirement HTTP，但这次修改后的真实DB+CLI矩阵须重新执行，不能沿用此前绕过探针的绿灯。

追加：未知链最终 body 超过探针32MiB上限时，不额外发送会413的probe，直接交原plain执行准入。该分支同样不是合法性/无需helper证明；known链仍保留私有载体上限。独立oversize测试断言不调用probe/issuer、无Reserve/Dispatch，目标2.810s通过。最新ABC第一次命令错误筛选/JSON（实际子组false/true）仅运行父级初始化并报no tests to run，明确不计验证；改/false重新执行。
