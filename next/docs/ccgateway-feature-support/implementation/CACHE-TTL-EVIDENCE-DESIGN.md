# 缓存 TTL 来源完整度与计价设计（只读候选）

2026-10-09。由真实dynamic MCP三次请求发现：创建总量比仍保留的明确TTL桶多1219。实际证据见 PUBLIC-DYNAMIC-FORCED-CORE-0.1.75-WORKER-0.1.80.md。本文件未修改业务、历史账单或运行配置。

## 官方合同核对

- [Tool use with prompt caching](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-use-with-prompt-caching) 当前第127–132行：有cache_control时，服务器工具结果可产生自动5分钟断点；举例web search/web fetch/code execution，并描述这些写入出现在ephemeral_5m_input_tokens。该页没有把“MCP+ToolSearch所有未分桶累计差额”定义为5m；实际本例5m仍是0，不能仅凭such as或同为server工具补出1219的TTL。
- [BetaMessageDeltaUsage](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_message_delta_usage.py) 第10–15行：cache_creation_input_tokens是可选累计总量；该union没有cache_creation TTL分桶字段。它证明delta总量语义，不提供剩余差额归类规则。
- [Python SDK accumulate_event](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/lib/streaming/_beta_messages.py) 第508–537行：delta累计数量覆盖已存在数量，缺失可选量保留start；没有按差额重算TTL。这与本次Worker公开JSON行为一致。

结论：自动5m是有依据的机制解释，但不足以作为本次所有1219的计费归属证明；没有发现可严格涵盖本例全部增量的官方规则。保留合法200和原SSE/JSON，不把usage分解不完整升级为模型调用失败，也不在响应中补造5m。

## 当前代码影响面

- `server/internal/usagerules/usagerules.go:Tokens` 用total-1h作为CacheCreation；不读取明确5m，注释称该差额为五分钟。这是本次语义缺口。
- `sdk/manifest` token映射当前只定义总创建与1h；anthropic/CCGateway规则、plugin ExtractUsage路径与Acc都需统一证据，不允许只修某一入口。
- `usagerules/additional.go` 和 `anthropic_attempts.go` 对Advisor/compaction、fallback Replacement也调用同Tokens；不能只补主usage导致同一事实不同价格。
- `core/ports_billing.go UsageTokens`、priced_usage、用量持久/冻结envelope、helper provider_calls聚合及credit原用量均影响计量摘要；任何新增字段必须遵循现FrozenEnvelope原bytes校验，旧版本不能重编码改摘要。
- `web/src/views/usage/UsageTokenFacts.vue`、usage.ts及API types当前主要显示cc/cc1h。UI应标明总创建/明确5m/明确1h/未分桶/来源完整度，不能仅换标签掩盖旧差额。

## 推荐的最小兼容切片

1. **计量证据与收费变量分层。** 增加内部可选版本化CacheWriteEvidence，含total、explicit_5m、explicit_1h各自present/value，unclassified、classification_complete、source（final_json、stream_snapshot、provider_calls等固定枚举）。字段缺失、null、显式0分别保留。所有值须为非负整数；buckets>total或累计回退标证据冲突，不截成0冒充完整。不要把所有未知都补成默认0。
2. **逐provider/attempt计算再汇总。** 同一message累计delta覆盖；未更新TTL只保留先前明确值，同时扩大unclassified。多个hidden调用分别保留完整度后求和，不把某一轮1h挪到另轮；Additional/Replacement也带各自证据。晚到完整TTL分解可以关闭差额，不能再次相加。
3. **不改公开provider事实。** JSON仍原聚合值，SSE原字节保留；内部Evidence进入UsageRecord/billing_detail和outbox，不能塞进客户端usage伪称提供商字段。旧记录无Evidence显示“旧计量口径/来源未记录”，不反推已知5m。
4. **计费规则明确命名。** 推荐新价格快照增加缓存未分桶处理模式：`pending`为缺省；管理员显式选择`default_cache_write`后，unclassified才按命名明确的默认创建价计算，并在账单写策略来源及数量。该默认价可以沿用管理员cc数值，但必须说明是平台缺TTL的默认计价规则，不是提供商5m事实。没有显式规则时保留请求200，将账务标待定并留真实已知用量，不把未知变免费、不自动重发。不要静默对全部旧价格“启用默认规则”，也不自动修改本次历史账。
5. **兼容旧字段。** 旧CacheCreation/cc作为现存收费输入不能直接全局改意而无版本。采用新证据结构+价格快照语义版本，让新consumer从Evidence生成明确5m、1h、unknown收费项；旧数据/旧envelope维持原解释。若选新增token字段而不是detail结构，必须同步总token函数、API、DB列及全部聚合点，成本更大；首版可先用现JSON持久能力避免无必要schema变更，但不得只记一个global metric导致attempt信息丢失。

## 必须通过的定向门禁

- 精确本例start总1376/1h1376/5m0→delta总2595无分桶：未分桶1219，原200/公开JSON与SSE不变。
- 没TTL字段、null、显式0；完整5m/1h、晚到完整桶、多delta覆盖、total减少/桶超总、超大整数、EOF部分usage。
- 主usage、Advisor Additional、fallback Replacement、helper多调用均同样分解，不跨模型挪桶，不重复收费。
- 有明确default_cache_write规则收费可解释；无规则账务pending但HTTP成功，异步重放不重复费用；DB冻结raw兼容旧记录与旧digest。
- UI明确显示1219未分桶，不显示“已证5m”；历史本次账不自动改。

实现顺序建议先冻结内部Evidence/价格策略合同，再并行解析与UI，非作者独审真实原SSE fixture。无需新增真实模型请求来复现已有证据。此方案尚未实现或发布，费用待定状态需复用现settler契约确认，不能单靠设置一个BillingError声称已闭环。
