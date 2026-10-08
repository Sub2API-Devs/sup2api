# Cache TTL 来源与账务兼容性代码审查

2026-10-09；只读业务源码，不修改生产、账户、授权状态或业务代码。本文不重新核验官方合同；公网现象由 root 提供：start 的 total=N、1h=N、5m=0，末尾 delta 的 total=N+1219，但没有新的 TTL 细分。没有读取私密请求日志或密钥。

结论：目前核心把缓存写入总量减去最后观察到的 1h 数量，直接当作 5m。这是账务归一化约定，不能作为该 1219 个 token 确实属于 5m 的事实证据。最小兼容修复应增加带来源/完整性标记的观测数据，保留既有收费桶并清楚标为兼容计费，不改合法 200、不自动重算旧账、不伪造 TTL。

## 真实调用链与精确位置

1. `next/plugins/ccgateway/internal/ccgateway/ccgateway.go:28` 的 Plugin 没有 ExtractUsage 方法。`next/plugins/ccgateway/manifest.json` 只把 managed/apikey 账号接入 anthropic 平台，没有平台端点声明、usage.source=plugin 或 usage 覆盖。当前 CCGateway 主路径并不调用它的 ExtractUsage。
2. 内置规则来自 `next/sdk/platforms/anthropic.json:129`。start 映射 total/1h 在 143–144，delta 在 159–160，JSON 在 222–223。**没有读取 ephemeral_5m_input_tokens**。`usagerules.For`（`next/server/internal/usagerules/usagerules.go:24`）选择账号协议覆盖、端点规则或平台规则。
3. `next/server/internal/gateway/forward.go:55` 创建 Acc；转发每个事件时应用规则，75 行把 `u.Tokens()` 写入记录，79 行带上 Metrics。`usagerules.Acc.set:87` 跳过 missing/null，显式零保留；后来的 total 覆盖早值，而缺失 1h 保持早值。`Acc.Tokens:303 → Tokens:327` 固定计算 `cc=max(total−1h,0)`。
4. 若其他平台使用插件提取，`gateway/usageplugin.go:159` 的 ExtractUsage 调用的是**声明平台的插件**，不是承载账号的任意插件；`applyUsageReport:301–306` 同样调用 `usagerules.Tokens`。`pipeline.go:663,692` 在响应结束后执行提取和结算。`usageplugin.go:379` 的 reportedFacts 只接受 manifest 声明的 fact；不应通过新增 CCGateway ExtractUsage 冒充修复当前主路径。
5. `next/server/internal/core/ports_billing.go:97` UsageTokens 只有 Input/Output/CacheRead/CacheCreation/CacheCreation1h。没有总缓存写入单独字段、5m 的 presence、TTL unknown 或 accuracy 字段。`UsageRecord.Metrics:140` 是通用 map；PluginDetail 不参与收费。`next/sdk/proto/sub2api/plugin/v1/common.proto:96` 仍定义 plugin cache_creation_tokens 为总量，不能悄悄改成 5m；`platform.proto:419` UsageReport 可返回 facts、detail，但没有精度协议。
6. `next/server/internal/usage/settler.go:426–445` 把两个归一化缓存桶及 Metrics 写入 usage_logs；`priceOne:705` 经 `billing.Service.Quote`（`billing/billing.go:120`）把它们交给 `expr.Normalize`（`billing/expr/normalize.go:28`）。`cc1h` 单独存在时分别收费；仅表达式使用 cc 时，1h 也并入 cc。故 **cc 本身已是有回退行为的价格变量，不能始终解释为实际 5m**。
7. `settler.go:734–742` 重建冻结 billing breakdown，`settler.go:859–884` 从持久化 token/metrics 恢复待结算记录；一般已 billed 记录不会因展示代码变更重新结算。不应改 Tokens/Normalize 的旧语义来“顺便修复”历史费用。
8. `next/server/internal/usage/api.go:50–51` 返回两个缓存计数，73 行 Detail 才含 metrics；`detail:329` 读取它。self-service 隐藏 PluginDetail/Anomalies（355–357），但不隐藏 Metrics。因此面向用户的 TTL 来源不能只放在这两个管理员字段中。
9. `next/web/src/views/usage/UsageTokenFacts.vue:8` 把 CacheCreation 映射到 prices.vars.cc；`next/web/src/i18n/locales/zh/prices.ts:63,102` 分别把变量/收费项写为“缓存写 5 分钟”。`BillingBreakdown.vue:34` 直接使用 prices.items 文案，`UsageDetail.vue:266–274` 分别渲染 token 与通用 metrics，当前没有完整性判断。

## 可复用结构和缺口

可复用 `UsageRules.Facts`、`Acc.Metrics`、`UsageRecord.Metrics`、`usage_logs.metrics` JSONB 及详情 API。事实支持 number/boolean/enum/string（`sdk/manifest/manifest.go:484`），不需要先迁移数据库或修改插件 protobuf 才能增加展示证据。`UsageRow.metrics` 目前声明为 Record<string,number>（`web/src/views/usage/usage.ts:8`），但后端已支持枚举等；若新增 status/version，需要同步修正该类型。

现有 Anomalies 只有 usage_extract、response mismatch、reservation/reconcile 标记，没有 TTL accuracy；不能把 partial TTL 冒充插件提取失败或整笔 usage estimated。不存在可以直接拿来装“未知 TTL 数量”的专用 token 字段。通用 Metrics 可承载新 fact，但新 fact 的语义和生成逻辑必须新增。

单纯在 manifest 加一个 5m 路径仍不够：Acc 只保存最后值，无法证明该值来自与最终 total 相同的快照；必须保留每个计数的 presence 和观察位置。map 的遍历次序不稳定，不能在每次 set 调用中依靠先后顺序推断同一 SSE 事件内的完整性，应在事件级提取完后统一结算来源状态。

## 建议的最小兼容设计（未实现）

第一阶段只增加证据和准确的标签，不改收费结果：

- 声明 opt-in 的缓存 TTL provenance 规则（或新增标准 5m 映射作为显式启用信号），同时配置 start/delta/JSON 的 total、5m、1h 路径。规则必须位于实际选中的 UsageRules；不在核心按模型名、请求 ttl 或账号名称猜来源。
- Acc 保留观测 total、两个 TTL 数值、各字段是否出现、各自最后观察到的事件位置及当时 total。missing/null 与零严格区分。不向上游响应补任何字段。
- 持久化带版本的 facts，例如 cache_write_total_observed、cache_write_5m_observed、cache_write_1h_observed、cache_write_ttl_status、cache_write_ttl_unclassified、cache_write_billing_policy。status 至少包含完整、部分、未报告、冲突。字段名仅为设计草案，须统一声明以便插件 facts 与规则结果同义；来源位置可单独提供受限元数据或保存在专用 provenance JSON 中。
- 对当前例子记录最终总量 N+1219；观察到的旧 1h=N、旧 5m=0；TTL 状态为部分/细分未刷新。1219 可显示为“尚无 TTL 细分的差额”，**不能叫确定 5m，也不能自动并入 1h**。旧细分只是已观察值，不无条件宣称是最新完整分配或可靠下界。
- 完整状态需两桶均有明确来源且与适用总量一致。后续 total 改变而细分缺失应使此前完整状态失效；不能只看 start 完整就一直标完整。允许官方合同明确证明的累计字段延续规则，但本代码审查不替合同作假设。
- `UsageTokens` 与当前 `cc/cc1h` 计费输入暂时保持兼容；`cache_write_billing_policy=legacy_residual_cc_v1` 明示未分 TTL 差额按现有 cc 费率结算。这是收费政策，不是 provider TTL 事实。若产品要求对未来未知量采用独立费率/暂缓结算，需单独的版本化计价策略和账务决定，不能通过更名、将未知写零或升为1h偷偷改变费用。
- UI 分开显示“实际观测的 TTL 细分”和“账务缓存写入桶”。usage 和 billing breakdown 的 cc 文案改成中性计费名，并在存在 provenance 时解释 unknown；价格编辑器可保留“默认/5m 费率”的配置含义，但不可把该费率名称复用为观测事实。
- 老记录缺 provenance 时写“历史记录未保存 TTL 完整性”，保留原 token、expr_hash、cost 与 ledger，不回填猜测值、不启动 reconcile。仅展示层中性化即可避免继续声称旧残差必为5m。

## 影响范围和必须防止的漏点

修改共享 Tokens 或 expr.Normalize 会影响所有 provider、插件提取、账号测试、预扣、reservation/reconcile、advisor/compaction 与 fallback attempts；因此不作为最小修复。新 provenance 采用 opt-in 和加法字段，不配置的 provider 保持现有行为。若改内置 anthropic 规则，使用该规则的直接 Anthropic 与 CCGateway 都会获得更准确观测，这是有意的跨账号类型影响；自带 usage override 的 provider（例如 volcengine 的两套 Anthropic 映射）不会自动获得新字段，必须明确是否同步。

`usagerules/additional.go:100`、`anthropic_attempts.go:150` 也用同一总量减1h假定；additional 类型当前没有 Metrics，需要后续结构扩展才可逐 component 表达完整性。`gateway/helper_history_response.go:147–156` 携带每轮 Tokens/Metrics，应同步保留新事实，不能把主轮来源冒充所有隐藏轮。

`applyUsageReport:306` 会整体替换 Metrics；若未来启用 ExtractUsage，必须让报告声明并返回同一 provenance，或以明确宿主字段保留规则观测，不能合并成看似同一份计数的混杂证据。插件 proto 的两个非optional整数也无法区分 absent 与 zero，所以不能只靠旧 Tokens 构造“完整”声明。

`usage/api.go` 列表不含 metrics；若要求列表警示，需要追加精简 provenance 字段或按需使用详情，不能在列表无来源时推断。另有现存展示问题：`UsageTokens.vue:20,31,35` 汇总缓存时未加 cache_creation_1h_tokens，而摘要 SQL `api.go:451` 加了两桶；它独立于 TTL 归属问题，修展示合计应与新来源标签一起覆盖，但不能据此改账。

## 建议验证矩阵

后续实现必须覆盖：当前 start 完整、delta total 增长且细分缺失；JSON 两桶齐全；显式0与缺失/null不同；只有 total；只有一桶；晚到完整快照；桶和大于总量；未启用 provider 不变；带/不带 cc1h 表达式收费与旧实现一致；历史无 provenance 的 detail/list；self-service 可见且无私密字段；隐藏轮及 component 不跨轮拼接。合法200与SSE原文应完全不受记账观测影响。

本次实际执行为源码搜索与读取（rg、Get-Content）；未新增或运行测试，未改业务、未发联网请求，未重算或写入账单。官方合同结论由并行 API 审查提供。
