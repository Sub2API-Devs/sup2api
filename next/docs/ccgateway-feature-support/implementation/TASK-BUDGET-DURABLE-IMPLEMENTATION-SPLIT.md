# 通用 task_budget + 内部 ToolSearch：可实施切分

2026-10-08，只读设计；基于当前源码及 TASK-BUDGET-INTERNAL-SEARCH-PLAN。aa6b3a905 后续发布由 root 处理；本文不是已实现或已开放声明。CodeGraph 以 projectPath=D:/projects/golang/sup2api 成功定位 prepareDiagnosticResponse；其余使用本地定点源码读取。没有模型调用、部署或业务改动。

## 结论

可以实现，不是 API 与 CC 天生不兼容。单 HTTP 的可信搜索账本已具备，缺的是跨 HTTP 隐藏历史的权威归属、恢复和成功提交合同。最小实现保持公开 Messages 协议无新增必填字段，但服务器内部有状态；这不等于任意冷导入都能恢复。透明无句柄模式仅接受唯一且完整可证明的公开前缀。所有保留的历史对应原 task_budget 原对象，不按 usage 修改 remaining。

同一公开前缀可对应不同隐藏历史是无法仅凭现有公开请求消歧的情况。必须拒绝歧义，而不是选最新/最早；可选私有客户端句柄是未来协议扩展，不作为本批强制改造客户端的前提。

## 现成组件及不能直接复用的部分

- engine/internal_cache_rounds.go：internalCacheRounds、observeInternalCacheEvent、alignInternalCacheSuffix 已有主请求 SSE + helper 名/ID/输入/结果的逐轮证据，runtime-only，最多 5 轮。不能直接把 events 或 native JSONL 当持久可信账本；增加导出“验证完成的轮次”方法，不导出未完成缓冲。
- engine/runner_config.go 创建 internalCache；应从只服务 cache 的创建条件拆出共享可信 helper ledger（cache 或 durable budget 任一需求即可启用），保留原 cache 校验强度。
- engine/runner_session.go:endSearchRound 隐去内部轮次；tool_search.go 累计实际费用。原始每轮 usage 与预算对象是独立数据，不能互相换算。
- engine/history.go:prepareHistory/findPriorSnapshot/resumeFrom/Prepared.commit、tool_names.go:toolHistoryNamespace 提供本地优化；新 durable receipt 摘要须进入真实 namespace，并保证旧无凭证 snapshot 无法冒充已恢复。不把不断增长的全部 call ID 放进配置 namespace 破坏 prefix 命中；每个 snapshot 另存 ledger parent/terminal digest 验证。
- core.ResourceOwner/UserID+GroupID、ResourceBinding/accountID+PrincipalID+Generation，以及 gateway/message_diagnostics.go、fallback_credit.go 提供固定账号、身份预检、清除外来头/重新注入内部 grant 的模式。复用模型/账号资格检查，不借用 diagnostics/credit 表承载会话内容。
- messagediagnostics/service.go、fallbackcredits/service.go 的 Tx + owner/identity advisory lock 可复用锁顺序模式；其定期删除规则不可直接复制：完整内容删掉后仍需 tombstone 阻止被当作新会话。
- internal/secret.Cipher 已是 AES-256-GCM + AAD；app/app.go 已加载 master key。可复用加密原语，对压缩后内容加密，先检查解压大小再解析；AAD 必须包含 owner、binding、schema、记录 ID 和摘要，禁止换行换租户。现模块无密钥轮换 key-id 机制，不能虚称支持旧密钥自动恢复。
- gateway/message_diagnostics_response.go:prepareDiagnosticResponse 仅缓存首 envelope，不足以原子提交完整 helper 历史。resource_response 的有界完整响应解析可复用解析组件，不能复用其资源对象注册语义。
- usage/settler.go:Submit 为异步无 error 接口，不是账本提交事务。不能说“调用 Submit 后已持久结算”。

## 最小合同与数据模型（拟新增）

contracts/helperhistory 包只承载版本化 DTO、严格校验、规范化摘要及字节限额，不引用核心或引入执行注册。拟字段：schema_version、request_digest、public_prefix_digest、parent_receipt、binding、namespace、ordered_segments、terminal_public_digest、completed。每段保存插入的公开消息边界/块位置、完整原始 assistant/helper result、原工具目录身份摘要和必要的上下文补丁；原字节数字/签名保真，不能只存搜索关键词。opaque 工具输入不递归规范化。

核心新 ports_helper_history.go / internal/helperhistory 服务：

1. Resolve(owner, orderedPublicPrefixes, executionPolicy) -> 唯一 Chain、binding、receipt，或 Missing/Ambiguous/Expired/Conflict。查最长匹配不够：必须证明请求中全部已提交边界与 chain 顺序一致。
2. Reserve(owner, binding, parentReceipt, requestDigest, quotaBytes) -> attemptID。派发前预留容量；仅预留不是可恢复记录，重复请求不自动重跑模型。
3. Commit(attemptID, verifiedCompletion) -> receipt。确认响应已完成、所有 helper 已配对、公开终态一致，幂等相同摘要；冲突不覆盖。
4. Abort/MarkUncertain 仅区分明确未派发和已派发未知完成。未知不得转为 ready；不能靠再次推理恢复。

拟 0043_helper_history.sql（实施前重新核下一个空编号）：attempts 与 immutable segments/公开边界索引两张表即可。owner + prefix 索引允许多个 hidden digest，事务发现不同 digest 后标记 ambiguous；不能 UNIQUE(prefix) 后悄悄 first-wins。相同完整内容/绑定可去重，相同公开内容不同隐藏路径必须留冲突证据。chain 用 parent 引用共享前缀，避免每轮复制完整链 O(n²)。并发在 owner → public-prefix 稳定顺序加锁。

限额建议显式配置：单次序列化 32 MiB 与现 core maxUsageJSONBuf 对齐；owner 总字节/条目/并发 reservation 限额；保留期为平台合同而非官方预算 TTL。开始前尽量拒绝容量不足；响应超界也不能截断后声称成功。内容过期清除 ciphertext，但保留有界不可复活 tombstone；tombstone 淘汰后任何含未知 assistant 的预算搜索请求仍拒绝，因而不会误当新历史。公开纯 user 初始请求可建立根。

## 传输与处理顺序

不把会话装进 header。建议核心与 Worker 之间采用 capability 协商的内部 framed envelope（版本、原 Messages raw body、grant/恢复段）和对应结果 envelope；插件 Build 接口是否可完整保留该 carrier 必须首个集成测试锁定。外部 API 仍原 JSON/SSE；未知 Worker 不降级忽略 envelope。大对象不使用环境变量/CLI参数。另一可选方案是专用受鉴权 sidecar PUT/GET，但会增加跨请求 token 生命周期和失败面，不作为最小实现首选。

步骤：入口解析 → owner Resolve/Reserve → 固定 account/issuer 和模型资格 → hooks/Build 后重验请求摘要、工具与绑定 → Worker 验证 grant/issuer → 独立还原完整可信历史 → 每次主请求归属后精确注入并校验原公开内容、附件、cache → 原 budget 不变 → 完整 provider 终态和 helper 结果封装 → 核心验证结果并 Commit → 对外发成功终态。

为使“成功意味着已提交”最小方案对该组合缓冲完整最终 JSON/SSE（有界，允许说明首 token 延迟）；不改变普通 Messages 流。内部流及所有实际 usage 必须继续读到合法终态，取消/EOF不能制造成功。Commit 失败不发送成功 message_stop/JSON，返回明确存储错误，不自动重试模型；实际 provider 错误或正常 refusal 不伪装成内容任务成功。正常 refusal 是否需要保存 chain，取决于它是否已有隐藏轮次；已发生隐藏轮次且公开完整响应可续用时仍须提交，不能照抄“不存 refusal native cache”的策略。

结算：账本失败也保留已捕获各轮真实 usage，经现 forward 的 u.Tokens/recordAdditionalUsage/recordReplacementUsage 汇入错误请求结算，不能改成 0。进程崩溃的准确一次结算不能靠异步 Submit 保证：建议 Commit 同事务写一个带核心 usage record 幂等键的 outbox，再复用既有 pending 结算重放入口；必须检查该入口幂等约束后实现，而不是再造价格计算器。若暂不做 outbox，就只能声明遵循当前通用结算持久性边界，不能宣传账本与扣费原子。本批完整实现应包含 outbox 接线测试。

## 3 个并行工作包

A. 合同 + 核心持久服务：新 contracts/helperhistory、core port、helperhistory service/repository、迁移、AAD 加密、限额/过期/tombstone/歧义、结算 outbox。先冻结 DTO 和 Reserve/Commit/Resolve 错误枚举供 B/C；真实 PostgreSQL 并发/重启/重复提交验证。

B. Worker 捕获与恢复：internal_cache_rounds/runner_config/history_alignment/outbound_relay/runner_session/history 的窄 hooks，新 helper_history.go；仅导出归属确认、完整配对后的 helper 段，保留 cache/inline/citation 和 signatures。真实 CLI 假上游 JSON/SSE × 首轮/外部结果/普通续聊/cold/fork/rollback，预算 remaining 缺省/null/0/正数原值；当前可执行目录不从隐藏历史注册新工具。

C. 核心网关 carrier + 提交/结算顺序：新增 gateway/helper_history_request.go/response.go，pipeline/dispatch/forward/app 窄接线，剥伪造 grant、固定 issuer、Build/hooks 后摘要校验、bounded envelope、commit 前终态隔离和 outbox 重放。真实 HTTP 假 Worker 测缺记录、双隐藏分支、跨 owner/issuer、账本失败、cancel/EOF；不以 HTTP200 就宣布恢复成功。

B 与 C 用 fixture contract 并行，A 服务未接通前不放 general gate。三个包完成后另代理独审，再做最小真实提供商资格验收。现 forced 全 eager 零 helper 窄支持保持原样，不被新持久合同反向强制。

## 显式边界与风险

- 新公开前缀含旧 assistant 却无已登记完整根链：没有证据证明没有隐藏历史，拒绝冷导入；这不是对所有合法 Messages 历史新增限制，仅此 budget+内部搜索组合。
- 同 public prefix 不同隐藏分支：透明协议不能唯一选分支，拒绝；不能用 session/client metadata 代替授权或猜测分支。
- 跨 issuer、模型不兼容签名、namespace/附件策略改变：先拒而非擦签名/重写 system；改变CLI版本本身不必无条件拒，但必须经过声明的兼容策略和相同 wire 校验。
- 客户端主动删历史、signed compaction、synthetic StructuredOutput、MCP/server/PTC高级混合：分别按现已支持适配能力评估；不能把“持久了搜索段”当作预算删减或签名重绑定已解决。
- 完整原始签名/工具数据持久化增加隐私和存储成本，必须有删除/保留说明；日志开关不能替代运行语义账本生命周期。
