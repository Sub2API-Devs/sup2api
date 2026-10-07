# 多模型附加 usage 计费基础

日期：2026-10-08。工作区实现，尚未部署；数据库集成测试交主线程 Linux 隔离数据库执行。

## 语义与职责

官方 [Advisor usage and billing](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool#usage-and-billing) 明确：顶层 usage 只包含 executor，advisor_message iteration 使用其自己的模型价，不能把所有 iterations 再计入主模型；fallback 的聚合语义不同，本次不将它声明为附加项。

SDK 的 `UsageRules.Additional` 为通用描述式规则：JSON/SSE 数组路径、事件、类型选择器、模型路径、token 字段路径及明确 semantics。core 不硬编码 advisor 类型。命中的数组表示完整快照，后续 SSE 更新替换同规则的之前快照；不按事件累加。

`usagerules.Acc.Additional()` 输出 Kind/Model/Tokens/UsageSemantics，外层 gateway 必须将模型匹配到请求已授权的模型引用，再选择该模型的价格快照。模型长度、整数类型、负数、极端 token、缓存细分、数组数量有界校验。异常保留 `AdditionalError`，不将无效值假装为零。

`core.PricedUsage` 包含独立的 PriceRule、tokens、semantics、price params/headers、rate 和 model。`UsageRecord.Additional` 由 gateway 填入；`BillingError` 进入持久化待结算输入，阻止扣除猜测金额。异常需要可信观测或管理修复，普通重试不会擅自清除错误。

## 结算与预扣

- 主记录结构和 per_request 原规则保留，附加项逐项使用现有表达式/报价入口，最终只进行一次请求账本事务。
- 主模型价格为 nil 时，附加模型仍可计价；主免费不等于所有模型免费。
- 每个附加项的表达式、请求参数、倍率及 tokens 放入既有 `billing_detail.inputs.additional`，失败/重试不重新读取当时的附加模型价格。
- 最终 `billing_detail.additional` 展示每个 Kind/Model/PriceID/表达式 hash 和独立计算结果，总金额为主价与附加价之和。主 token 列不叠加 advisor token，避免混模型归一化。
- 新字段为空时走原单模型实现。预扣通过相同分项报价计算一个总额；原释放预扣/结算原子事务不变。
- 队列提交及构造 pending 时复制附加价格、参数和 headers，避免调用者后续修改快照。

## 验证

已通过：manifest/check 全测试；usagerules 全测试；新增附加价格/持久输入 roundtrip/主免费/原子失败/预扣单元测试；原 `TestPriceOf*` 回归；usagerules、usage、billing 的 go vet。

新增 `TestAdditionalSettlementDBRetriesFrozenFreePrimary` 留待 Linux：预扣后模拟第一次 ledger 失败，变更调用者价格对象，数据库重试仍用已保存价格结算，主免费不漏额外费用，重复重试不重扣。

gateway 的请求模型引用、权限、账户模型筛选、模型映射和价格快照接入由主线程完成；本基础设施通过单测不等于该调用链已集成通过。真实官方 advisor 费用尚未线上核对。

## 同主模型 compaction 补充

2026-10-08 再核官方 [SDK BetaUsage](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_usage.py) 与 [CompactionIterationUsage](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_compaction_iteration_usage.py)：compaction 项没有 model，且不含于顶层 usage。[threshold](https://platform.claude.com/docs/en/build-with-claude/compaction-threshold#understanding-usage) 对 compact-2026-01-12 也明确此语义；[on-demand](https://platform.claude.com/docs/en/build-with-claude/compaction-on-demand#count-compaction-usage) 对 compact-2026-09-04 顶层为零，同样需单独计收。当前官方两种协议均非“顶层已含摘要”。未知更早/第三方聚合变体不能套用此规则，应提供对应 usage override。

规则新增通用 `usePrimaryModel:true`，`Acc.WithPrimaryModel` 只能由 host 提供已准入的账号映射模型。未提供可信模型会阻止结算；若 iteration 意外声明不同模型，不按该值找价而拒绝。默认 model 检查路径为 model，也可显式声明。gateway 应复用主模型价格快照，而不是需要客户端再声明一个模型引用。

新增 JSON/SSE 最后快照测试同时含普通 message、advisor、compaction：只提取后两项，重复 delta 不累加，同主模型身份来自 host；异模型/null 模型或缺 host 身份产生错误。usagerules 全测试 PASS 1.071s。具体 gateway 接入与端到端账务验证由主线程推进。

## 必需计量规则调度门禁

`AdditionalUsageRule.requiredBy` 声明简单请求字段路径（最多 8 项，仅用于 usePrimaryModel 规则）。字段存在且非 null 时必须由当前路由的 usage override 提供同名、可信 primary-model 规则；平台与 endpoint 声明同时检查。Anthropic 对 compaction / context_management 启用此约束。普通请求或显式 null 不触发门禁，旧账号的经典请求不受影响。

门禁既在账号筛选阶段执行，也在插件 BodyPatch 后、实际发出请求前执行，避免插件后加 operation 绕过计量能力检查。未宣告的第三方聚合差异不能默认为已计入顶层，需明确不同协议合同后另行支持。新增普通/null/compaction/context/插件后加操作及 endpoint 独立声明测试 PASS 2.738s。
