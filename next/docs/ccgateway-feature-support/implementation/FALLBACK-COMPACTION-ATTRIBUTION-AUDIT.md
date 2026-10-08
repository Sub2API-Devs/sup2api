# Fallback 与 compaction 计量归属复核

2026-10-09。只读官方文档/SDK与当前实现；没有业务修改、CLI新探针或生产请求。现有合成CLI探针只证明传输，不能替代提供商计费合同。

## 已确认的协议事实

1. [官方 BetaCompactionIterationUsage](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_compaction_iteration_usage.py) 当前只有type、input/output、cache读写及可选TTL分桶；没有model、attempt_id、服务档位或速度归属。[BetaMessageIterationUsage](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_message_iteration_usage.py) 的model可省略；[BetaFallbackMessageIterationUsage](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_fallback_message_iteration_usage.py) 有model，并表示实际服务响应的fallback终结迭代。一次模型attempt可以有多个工具循环message迭代，不能把每个相邻数组项等同一次模型切换。

2. [官方 refusals/fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback#billing-and-rate-limits) 将费用归于实际运行模型，顶层usage仅描述最终服务attempt，不能跨模型相加后统一定价。输出前拒绝的免单取决于category，已有输出的拒绝仍计费。fallback内容块提供模型交接，不提供compaction迭代索引；sticky routing可以没有交接块。文档没有建立“压缩条目属于后一个message”或“压缩永远归原始主模型”的保证。

3. [阈值压缩usage](https://platform.claude.com/docs/en/build-with-claude/compaction-threshold#understanding-usage) 的compaction条目表示额外采样费用，不包含在顶层input/output；server tools可能在同请求中触发多次压缩。因此不能只拿最终top usage结算，也不能假设每个HTTP最多一次compaction。

4. [按需压缩](https://platform.claude.com/docs/en/build-with-claude/compaction-on-demand#request-a-summary) 明确独立summarize请求使用请求的模型和配置；[计量说明](https://platform.claude.com/docs/en/build-with-claude/compaction-on-demand#count-compaction-usage) 将采样计入compaction迭代，顶层计数为零，重发已有块不新增压缩费用。HTTP200但无summary也不能推断免费。该单模型说明不足以推出同HTTP内部fallback换模型后每条压缩的归属。

5. [BetaUsage](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_usage.py) 的speed/service_tier位于顶层；上述三种iteration类型没有逐项对应字段。[Fast mode实际速度](https://platform.claude.com/docs/en/build-with-claude/fast-mode#checking-which-speed-was-used) 以响应事实为准，存在请求fast而实际standard的模型例外。不能将请求参数或最后attempt的速度、档位、地区复制给早先attempt/compaction。

## 当前代码与真实缺口

- Worker `engine/fallback_request.go:configureFallbacks` 分别拒顶层compaction和context的compact编辑。没有误称自然协议一定不支持；这是当前计量保证不足的明确准入限制。
- Core `usagerules/anthropic_attempts.go:anthropicFallback` 遇compaction明确拒归属；`gateway/attempt_usage.go:recordReplacementUsage` 只对预授权模型/冻结价格结算，`validateAttemptPriceFacts` 不允许缺失价格事实静默取默认值。
- 普通compaction走 `usagerules/additional.go` 的UsePrimaryModel路径。直接删除fallback guard会同时引入两个错误风险：全部压缩按主模型价计费，或Replacement/Additional重复计算同项。
- 已有 `fallback_compaction_probe_test.go` 人工构造两条没有model的compaction穿过真实CLI，明确只测原样传输；它无法证明真实provider怎样归属，更不能据其数组排列建立计费规则。

## 可等价推进的切片

**切片A：计量内部先支持可证的单模型响应，不开放组合请求。** 对没有任何fallback交接、没有fallback terminal且所有实际message模型等于准入主模型的响应，压缩可走已存在单模型语义；缓存逐项校验、独立记录compaction，不与顶层重复计费。这能完善共用meter与负例，但因为请求仍可能实际触发fallback，不能据此泛开放fallback+compaction。

**切片B：保持独立压缩调用与已有块重放。** 客户端显式先发无fallback的按需压缩，再提交摘要供后续请求使用，是可单独定价的现有产品路径。它需要原样保存summary/signature及遵守后续模型的签名校验；不能由网关悄悄拆一次fallback+compaction请求替代，因为会改变调用次数、状态、拒绝及缓存语义。该组合的跨模型签名兼容性仍应单独验证，不承诺普遍可用。

**切片C：跨模型组合只在取得明确provider归属后实施。** 最小必要证据是每条compaction的实际model或明确attempt身份映射，以及该压缩的计费/速度/档位事实来源；必须同时适用于JSON与SSE、阈值多次压缩、sticky直接fallback、所有模型均refusal。若真实wire提供未公开扩展，先保存有界原始事实并请求官方合同确认，不能直接把未知字段当可靠授权。不能用不同模型恰好同价替代身份正确性。

## 后续实现与测试任务

- 归属适配器消费原始ordered iterations和真实fallback边界，输出独立的model/iteration-index/token/cache/billing-disposition证据；缺失归属明确计量不完整，不猜最近模型。
- 明确由Replacement或Additional其中一条路径拥有compaction，另一条排除，避免重复；在调用前对全部显式fallback模型完成权限/价格冻结。default动态模型另属候选授权合同，不并入本切片。
- 缓存仅使用该iteration真实总数和5m/1h分桶，验证非负与分桶关系；不能从最后请求的缓存命中率反推前一次压缩。
- 免单必须按真实拒绝attempt判定：最终message的output0不意味着同attempt已经产生的compaction输出免费；也不能将最终refusal类别套在全部压缩上。官方未明确这层关系前保留限制。
- 覆盖primary compact后fallback、fallback compact、同模型多工具迭代/多compact、sticky无boundary、JSON中丢弃旧partial但仍有usage、零输出免费category/付费category、输出后refusal、TTL混合、不同speed/tier和缺事实、重复message_delta累计快照、不完整EOF。合成测试验证算法与不误计，真实提供商返回仅证明已观察形态，均不能替代账单对账。

结论：当前官方SDK与说明确证了归属字段缺口；这不是“未测试就天然不可兼容”。现阶段可推进单模型meter与归属证据适配设计，但不足以安全开放跨模型fallback+新compaction。保持现有准入，下一步优先取得provider逐压缩归属合同，不把缺口转嫁成猜账单。
