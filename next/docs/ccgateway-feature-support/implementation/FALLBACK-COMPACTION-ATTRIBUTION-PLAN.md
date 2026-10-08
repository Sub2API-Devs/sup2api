# Fallback 与 compaction 每 attempt 用量归属

日期：2026-10-08。当前运行版本不变，本轮不提交、不部署。调查与隔离实验结果，不是开放组合声明。

## 已核实的官方合同

- [官方 SDK BetaCompactionIterationUsage](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/beta/beta_compaction_iteration_usage.py)：公开字段为 type、输入/输出 token、缓存计数/TTL；没有 model、attempt ID 或父 iteration ID。
- [Compaction threshold：Understanding usage / Current limitations](https://platform.claude.com/docs/en/build-with-claude/compaction-threshold#understanding-usage)：摘要和普通生成分别报告；摘要使用请求模型。该页没有定义多个 fallback attempt 混合时的摘要归属。
- [Refusals and fallback：响应与计费](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback#billing-and-rate-limits)：message/fallback_message 记录尝试，含模型；顶层 usage 不能代表所有模型的总和。

这些证据不能推出“每个无模型 compaction 自动归属后一个 message”。也不能将摘要全部归给首模型：sticky routing 和实际模型切换使该假设不可靠。官方普通 compaction 示例的数组顺序不足以证明混合情况下的完整归属合同。

## 当前实现位置与风险

CodeGraph 使用 `projectPath=D:/projects/golang/sup2api` 成功定位 `usagerules.anthropicFallback`；随后读取精确文件。

- Worker `engine/fallback_request.go:configureFallbacks` 拒绝显式 compaction 或 context_management compact_* 与 fallbacks 的组合。
- 核心 `internal/usagerules/anthropic_attempts.go` 校验 message/fallback_message 的模型组与 fallback 边界，遇 compaction 明确拒绝。
- `internal/usagerules/additional.go` 当前 compaction 的 UsePrimaryModel 路径固定使用经授权的首模型；不能直接复用于 fallback 后发生的摘要。
- 不能仅删除两个 gate。否则摘要可能计入错误模型、使用错误 attempt 的 speed/价格参数，甚至被错误应用普通拒绝的免单规则。

## 真实 CLI 隔离实验

新增 `engine/fallback_compaction_probe_test.go`，独立 fixture、不修改准入。

假上游向真实 CLI 2.1.292 返回以下顺序的原始用量：compaction（无模型）、message（首模型）、compaction（无模型）、fallback_message（另一个模型）。JSON 与 SSE 各运行一次，逐对象比较最终 iteration 数组，检查所有计数、顺序、模型字段缺省均保留，并且每例只有一次主模型请求。

执行：`CCG_REAL_CLI=.../claude.exe go test ./engine -run '^TestRealCLIFallbackCompactionUsageProbe$' -count=1 -v`。

结果：两例通过，包耗时 3.200s。CLI 载体没有凭空添加 attempt 身份，也没有丢掉合成响应中的 compaction 记录。

证据边界：本测试故意只测试响应传输，客户端请求没有打开 compaction，因此不会绕过当前 request gate。混合数组由假上游构造，不是实际提供商采样；不能由此证明真实提供商一定产生相同顺序，更不能据此算费用。

## 下一步可实施路径

先获得可归属的真实协议证据，再实现限定解析。必要证据至少涵盖：

1. 普通首 attempt 摘要后直接完成；首 attempt 摘要后 fallback；sticky 直接进入 fallback 后摘要。
2. 多次 compaction、多个 fallback，以及摘要后拒绝但没有后续普通 sampling entry 的情况。
3. JSON 和 SSE；非流响应去掉先前 partial content 后，usage 是否仍提供足够且唯一的模型关联。
4. 模型别名解析、不同 attempt 的 speed/输出参数与摘要计费参数关系。

无需也不应制造违规请求去触发拒绝。优先官方明确的混合 schema/说明、已有受控自然拒绝样本；缺例保持未验证。真实提供商最小采样应单独安排授权/成本边界，不能把当前隔离探针当生产验证。

若真实响应含稳定 model/attempt 关联，则新增专门解析模块校验其与已授权 fallback 链一致。若只存在顺序合同，则只有官方或足够明确的实际组合证据支持的严格排列才能准入，歧义/尾部孤立摘要明确拒绝；不通过“最近模型”兜底猜测。

预计实现边界：

- 新 `usagerules/anthropic_compaction_attempts.go` 将每个摘要关联到经验证的 attempt，独立保留摘要 token 和缓存 TTL。
- Additional 与 replacement 共用同一归属结果，避免一次摘要重复入账。拒绝免单只作用有事实依据的对应 sampling；摘要收费政策须有证据，不能继承整组免单。
- gateway 根据已授权模型映射及该 attempt 的原始覆盖参数选择价格，不改管理员价格，不把原始 provider usage 改成虚构模型字段。
- 最后才放开 Worker 的精确组合 gate。原始 JSON/SSE 继续保真，不自动重试模型。身份不明的响应按现有异常计量流程保留原始事实，不能宣称已精确结算。

必须补 core 单测及真实 HTTP JSON/SSE：多模型不同价格、缓存 TTL、拒绝类别、重复快照不重复收费、unknown model/歧义归属/缺字段、真实 usage 在协议错误时仍留档；Worker 真 CLI 验证请求组合及响应/历史块保真。

## 本轮状态

没有可靠的公开 per-attempt compaction 身份可直接使用；已通过真实 CLI 隔离实验证明原始字段能完整穿过载体，排除“只是 CLI 没实现”的错误解释。保留 gate 是当前证据不足，不代表该组合天然无法支持。仅新增实验与本设计文档，未改 forced/task_budget/catalog、核心业务或运行态。
