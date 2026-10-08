# Task budget 与内部 ToolSearch：完整历史闭环方案

证据日期：2026-10-08。基线：9ba4b2782；本轮不部署、不改变准入范围。下文明确区分官方语义、当前实现事实与尚未实现的方案。

## 官方合同与此前结论纠正

官方来源：[Task budgets](https://platform.claude.com/docs/en/build-with-claude/task-budgets)，本轮页面读取行 120–129、134–155、234–251。

- 完整历史重发时不应逐请求扣减 `remaining`；否则会重复扣减。
- 含 `tool_result` 的 user 消息延续同一 agentic turn，即使旁边还有文本。
- `remaining` 用于补偿客户端删掉的历史；不能再次扣除仍保留的内容。
- 上游响应不公开真实预算倒计时。输入 usage 累计不能直接当作新增预算支出。

因此此前 `FALLBACK-TASK-BUDGET-PROGRESS.md` 中“内部每轮一定重置，所以缺少逐轮计量”的解释不准确。若完整保留所有内部轮次，预算对象可以原样重复发送。真正尚未完成的是跨客户端请求的隐藏历史恢复。

## 当前代码的实质边界

1. `task_budget.go` 保留原对象及 null/remaining 缺省、null、0 的区别，不自行扣减。
2. `internal_cache_rounds.go` 的证据明确仅存在于本请求内，主上游 SSE 观察到的完整 assistant 和后续工具结果才被接受；不是持久资源。
3. `runner_session.go:endSearchRound` 从客户端响应中去掉内部搜索消息，仅累计计费用量。最终公开 assistant 不含此前 helper assistant/tool_result。
4. `history.go:Snapshot` 能保存本 Worker 原生会话，但本地缓存可过期、淘汰；另一 Worker 和冷导入仅获得客户端历史。缓存命中不等于持久预算连续性。
5. `tool_search.go` 累计实际 input/output/cache usage 是费用报告路径；不能将累计 input（含重发历史）用于反推 `remaining`。

反例：内部 A(search) → U(search result) → A(client tool) 后，客户端只收到最后 A；客户端下一轮返回工具结果，冷 Worker 只得到原 user、A(client tool)、U(client result)。此前 A(search)/U(search result) 已缺失。即使当前 HTTP 内部所有后续搜索都严格对齐，跨 HTTP 的预算上下文仍不同。

不能把这部分缺失归责于客户端；客户端没有收到它。也不能说新普通 user 一定完全消除影响：官方说明当前仍可能计入仍处于上下文的更早轮次。

## 选择：核心托管隐藏历史账本

以下是待实现设计，不是现成能力。保留现有 gate，直到以下链路及测试均完成。

### 合同与存储

- 新建独立合同模块及核心持久存储，不能借日志、diagnostics message ID 索引或 Worker 本地 cache 作为权威。
- 账本包含 owner、协议版本、来源 account/稳定 issuer、配置/工具映射版本、客户端完整前缀指纹、最终公开 assistant 的精确内容指纹、原始 helper assistant 与精确 tool_result、原插入位置、原始工具身份/签名、创建时间及有效期。
- 精确保存 JSON 数值、块顺序、签名与工具结果；不做文字摘要，不以 usage 代替历史。
- 隐藏历史包含实际提示与工具输入，按敏感会话数据处理：有界、加密存储、明确保留期/删除策略，不复制 OAuth、MCP 凭据或完整 CLI 配置到 sidecar。
- 每次成功响应前原子提交账本和公开前缀索引。存储失败不能继续给出“下次可恢复”的成功；已发生的真实 usage 仍需结算，禁止重试模型。
- 过期/删除保留必要有界 tombstone，不能把曾存在的账本误认为“从未有隐藏轮次”。未知、损坏或不完整历史拒绝，不静默忽略。

### 分支、冲突与冷导入

- 查询必须限定可信 owner，不能把客户端 metadata/session ID 当授权。
- 以完整客户端角色/内容前缀定位每一个已提交 assistant 边界，回退只恢复该边界以前的账本；分支追加不可改变旧账本。
- 同一客户端前缀可能由两次采样产生相同公开 assistant，却对应不同隐藏搜索。这时仅按内容 hash 不足：没有唯一映射必须拒绝，或设计由客户端明确回传的不可伪造分支句柄。不能任选最新行。
- 既有协议没有自动回传私有句柄的保证。透明路径只能接纳唯一可证明前缀；目录必须说明歧义拒绝条件。
- 冷 Worker 从核心获得经认证且与本次完整请求绑定的 sidecar，不依赖本地原生 JSONL；跨 Worker 先校验 issuer/模型对签名块的兼容性，必要时固定原账号。不同 issuer 的签名兼容性未证明时拒绝。
- 起始请求可以建立新账本。含已有 assistant、但核心无权威记录的导入不能猜测它从未使用隐藏 helper；严格路径拒绝。未来独立迁移接口可以导入有来源证明的账本。

### Worker 还原顺序

1. 核心清除外部伪造私有头，注入经验证的账本引用和请求摘要；通过现有受保护 transport 传输有界 sidecar，不能把大段历史塞 HTTP header。
2. Worker 核验 scope、请求摘要、配置及 tool identity、来源 issuer，单独保存账本，不作为可执行用户工具输入。
3. nonce 主请求归属确认后，复用完整历史对齐。在精确 turn/block 位置插回原始 helper 轮次；保持公开 messages、inline 指令、缓存断点和签名原位不变。
4. 本次新增 helper 继续使用现有可信 observer/result 配对；无缓存请求同样启用证据和完整对齐。
5. 每一主请求的 `task_budget` 原对象不变。不得因累计 usage 或搜索次数自行修改 `total/remaining`；辅助 classifier 不获得该参数。
6. 最终保存继承账本和新增轮次，再向核心交付公开响应及受保护的账本结果。

恢复要与当前 cache/citation/inline/compaction 顺序协调，不能直接替换整份 messages。客户端改写历史或 compaction 删除了隐藏轮次时，当前没有精确被删内容预算证明，必须专门拒绝或另行实现，不能暗中调整 remaining。

## 不采用的捷径

- 每轮减累计 input/output：会重复计入保留历史，也不知道真实倒计时。
- 只启用 `internalCacheRounds` 后放开 gate：仅证明一个 HTTP 请求，不能跨外部 tool_result 或冷启动。
- 仅保存本地 native checkpoint：缓存淘汰、账号切换及冷导入不闭环。
- 把 helper `tool_use` 直接暴露为普通客户端工具：会改变协议、执行方与客户端 tool_result 责任；不能冒充标准 server_tool_use。
- 关闭搜索并全量加载目录：改变客户端选定行为/提示，不是该组合的无损支持。

## 必须通过的验证矩阵

隔离真实 CLI：JSON/SSE，各含首轮 search→client tool、外部 tool_result 续聊、普通 user 续聊、同 Worker 无 cache、冷 Worker、回退及并发分支。逐主请求断言全部历史/位置/工具身份与原始预算对象，累计 usage 仅使用实际各轮报告。

预算形态：remaining 缺省/null/0/正数，预算变更不污染旧分支；API 缓存显式/自动/无缓存；原大整数、签名、inline 加删工具不被摘要或重排。

否定例：owner/issuer 不符、账本过期/缺失/损坏、相同公开内容对应不同账本、旧分支尾部混入、篡改 tool ID/schema、未知 helper、存储失败、取消/EOF、不完整 SSE、客户端自行删历史。失败不得有部分出站或模型自动重试。

官方提供商是否接受组合、实际倒计时不可由假上游断言；隔离测试只证明协议完整性。上线前仍需最小真实提供商资格验证。

## 本轮实际修改与未执行项

仅纠正 `task_budget.go` 的拒绝原因；原 gate 保持。现有预算拒绝测试的 total 从无效 10000 改成合法 64000，确保它真正检验组合 gate，而非最小值校验。新增独立预算边界测试覆盖首请求、外部工具结果、普通续聊、remaining 多形态。

没有实现持久账本，没有开放组合，没有修改目录为支持，没有部署或新增真实提供商调用。核心合同/存储/恢复 owner 尚待根代理分配；不能用本轮单测代替上述完整真实 CLI 矩阵。

本地验证：`go test ./engine -run 'TestTaskBudget|TestInternalCacheGatesKeepProtocolControls' -count=1` 通过（1.030s）；contracts `go test ./features -count=1` 通过（1.043s）。新增 12 个历史/预算形态子例均准确命中隐藏历史恢复 gate。未运行真实模型或真实 CLI，因为本次没有放开组合实现；后者完整矩阵属于账本落地后的必要门禁。
