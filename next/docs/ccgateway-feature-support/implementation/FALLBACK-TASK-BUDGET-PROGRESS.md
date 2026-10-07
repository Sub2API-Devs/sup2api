# Fallback / task budget 实施与审查记录

日期：2026-10-08。范围为本地代码、官方资料、CLI 2.1.292 对隔离假上游；没有真实云推理、提交或部署。不得把这些结果称为 OAuth/API Key 产品能力已全部验证。

## 服务端工具独立审查

已读 `server_history.go`、`web_tools.go`、`advisor_tool.go`、`history_omissions.go` 和 `response.go` 服务端分支。

- 新增红灯 `TestReviewWebFetchNestedDocumentCache`：官方 WebFetchBlockParam 的 content 为 DocumentBlockParam，可含 cache_control；当前 `checkWebResult` 直接调用只接收剥离缓存元字段后对象的 `checkDocument`，拒绝此合法嵌套字段。已交主 agent 修复；同时应检查缓存访问器是否处理同一路径，不能只放宽验证。
- Advisor 仅包含服务端块的 assistant 可能整体从 CLI 历史消失，主 agent 已知且由其协调恢复。普通有正文的 omissions 匹配以全部非 system 客户端 turn 与块身份为证据；不能仅按文本找位置。
- `serverToolLedger` 保存历史/当轮 pending，并绑定 ID 与结果类型。新增 fallback 分段：只撤销当轮、边界之前尚未收到结果的调用；旧历史带来的 pending 和边界后调用仍须正常完成，ID 仍不可复用。
- `checkWebTool` 各属性验证可继续抽成域名、整数、位置、来源过滤小函数；目前不是架构拆分阻断。注册类型仍不触发 Worker 本地 URL 抓取或工具执行。

## Task budget

官方形态为 `output_config.task_budget={type:"tokens",total:int,remaining?:int|null}`，需要 `task-budgets-2026-03-13`。这是建议预算，不是硬输出限制，也不是 Worker 可自行扣减的计费余额。官方明确 Claude Code / Cowork 原生界面不支持；此实现是主请求 API 协议适配，不宣称 CLI 原生提供预算功能。

新增 `task_budget.go`：在旧 output_config 解析前保存独立不可变计划，再与 effort/format 合并到主请求。缺省、显式 null、remaining 缺省/null/零有区别；不改写客户端预算、不计算虚构 remaining。校验 beta、数字类型；CLI 内部 ToolSearch/结构化工具追加请求会重置请求级预算，缺乏跨内部调用预算计量时明确拒绝该组合。API 服务端工具仍在单次请求内，由上游执行预算语义。`remaining` 与 compaction 或 signed compaction 历史组合按官方限制拒绝。

`TestTaskBudgetPlan` 覆盖格式、空值、beta、内部轮次限制和不覆盖 effort。`TestRealCLITaskBudgetCompatibility` 六个真实 CLI 假上游请求通过（6.62 秒）：new、prefix-hit、改变 total/remaining、fork、新 cache import、SSE。最终预算和 beta 与客户端一致；本地 prefix-hit 不代表上游预算变化后的缓存计费命中。

## Fallback codec 的真实失败与修复

原始探针发两个 text 块，中间夹官方 fallback 块：

- CLI partial stream 完全遗漏 fallback 的 start/stop，后一个 text 的 index 从 0 跳到 2。仅给 Accumulator 添加类型分支仍会失败。
- assistant/native JSON 保留 from/to，但丢失 trigger；resume 的模型请求将 fallback 整块移除。最初检查只发现完整块不匹配，随后追加块计数确认是整块缺失，不能只修 trigger。

新增 `fallback_stream.go`：只记录已鉴权主请求原始 SSE 中的完整 fallback 边界，以 message ID、block index 和已闭合 start/stop 配对；在 CLI 索引缺口处恢复原事件。辅助请求不提供证据，未闭合/不同消息/不同索引不会补。仍经统一 Accumulator 和原有输出流程验证，不伪造可见文本。

新增 `fallback_history.go`：在 detached body 上组合 Advisor omissions 与 fallback 恢复。from/to、assistant 顺序、前后普通块和完整 user 序列必须一致；只允许已注册的缺块及 CLI 明确省略的 trigger 元数据。原 fallback 边界恢复到客户端位置，不能跨 thinking span 移动。普通块变更、附加未知 turn、已有冲突 trigger 明确拒绝。`restoreOmittedBlocks` 改为单调逐块匹配，允许注册块分别保留或省略，而非要求全部同时丢失。

首轮 Worker 测试因缺失 partial block 得到 `invalid block start`；加入原始 SSE 证据桥接后首块/中途 × 外部 JSON/SSE 四请求通过。续聊随后复现整块丢失，组合恢复后十请求通过（8.06 秒）：两种位置的 JSON 新建/续聊 prefix-hit/回退 fork/新 cache import，以及两个 SSE。后续加入 usage.iterations 的逐模型值完整保留断言；具体最新命令结果以主集成记录为准。

这些测试是响应 codec 测试，假上游主动返回 fallback；请求 `fallbacks` 尚未开放，不能据此宣称服务端自动 fallback 已完整实现。

## 开放 fallback 请求前的实施项

1. **核心模型授权。** `next/server/internal/gateway/pipeline.go` 的 `resolveModelFromPlugin` 获得单个 model，`prepareBilling` 按 `c.model` 选择价格。显式 fallback 列表须逐目标模型做租户/分组/账号能力与价格校验；default 的目标由服务商按类别决定，不能绕过只允许原模型的策略。
2. **多模型用量。** 官方顶层 usage 仅表示最后实际响应的尝试，不能把不同模型 token 相加再按原模型价格结算。`usage.iterations` 每条模型及类型需进入核心受信任 UsageReport 与结算明细；Advisor/compaction 也有 iterations，主 agent 负责统一账务审计，不能为 fallback 写一套临时旁路。
3. **JSON 与 SSE 语义。** 中途 fallback 在 SSE 保留已经发出的内容；非流式则服务商清除被拒绝模型的半截输出重新生成。CLI 统一 SSE 再聚合为外部 JSON 不等价。外部 JSON 须让主上游 `stream:false`，经真实 JSON→CLI 协议桥接保留原始响应；当前 max_tokens=0 桥接可作抽象起点，但不能直接套名称后称完成。
4. **边界、模型与计价。** 中途 SSE 的 message_start 已是原模型，实际服务模型在 fallback.to.model 与 final usage.iterations；不能重写已发出的 start。provider sticky routing 约一小时、按组织和历史前缀散列，不保证平台跨账号调度保持同一结果。
5. **不主动绕过拒绝。** 只执行客户端声明且通过授权的官方 fallback 参数；保留服务商 refusal、分类、推荐模型、错误及收费结果。普通 429/529/5xx 不是该功能的触发条件，不自行重试成另一个语义。

当前 `fallbacks` 返回具体未完成项说明，保持可实施方案而非宣称永远不能实现。

## Fallback credit / 账号亲和方案

credit token 是 opaque 值，五分钟有效，绑定 issuing organization/workspace；云平台则绑定 caller。请求体与 beta 需匹配原请求，允许的变化由官方 retry shape 规定。对象模式 `{token,mode:strict|best_effort}` 需要新版 beta；不能只把任意字符串传给随机 Worker。

实施需核心保存短期发行映射：客户端受信任主体、token 摘要、账号/runtime identity、凭据 revision、provider 身份、原始已适配上游 body 与 beta 的规范化证据、到期时间，以及 `fallback_has_prefill_claim` 和是否已执行服务端工具。token 不作为可自行选择账号的路由指令；必须先校验发行记录与客户端主体，再固定到原有效账号。授权迁移/轮换需重新验证身份；映射丢失不得猜测共享组织。

匹配基准是**最终上游请求**，不是仅客户端输入：内层 CLI 的环境/默认字段可能随时间变化，应在授权范围内复用原请求证据，不能构建一份“看起来相同”的新 body。带服务端工具的拒绝必须按 provider 支持的 partial-response continuation 处理；自动去掉 token 重试可能重复执行及重复收费，因此不得隐藏失败或擅自降级。best_effort 失败的正常计费也必须进入账务明细。

当前 `fallback_credit_token` 明确拒绝，并说明发行账号亲和、body/beta 匹配、五分钟兑换跟踪尚未接入。仍保留响应中已有 stop_details / usage 的 credit 观测信息；不解密或伪造 token。

## 官方资料

- [Task budgets](https://platform.claude.com/docs/en/build-with-claude/task-budgets)、[BetaTokenTaskBudgetParam](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/beta/beta_token_task_budget_param.py)。
- [Compaction interactions](https://platform.claude.com/docs/en/build-with-claude/compaction-on-demand#limits-and-interactions-with-other-features)。
- [Refusals and fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback)、[Fallback credit](https://platform.claude.com/docs/en/build-with-claude/fallback-credit)。
- [Fallback request](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/beta/beta_fallback_param.py)、[Fallback history block](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/beta/beta_fallback_block_param.py)、[Credit token object](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/beta/beta_fallback_credit_token_param.py)。
- [WebFetchBlockParam](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/web_fetch_block_param.py)、[DocumentBlockParam](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/document_block_param.py)。

## 本阶段最终检查

- `TestRealCLIFallbackResponseCompatibility` 加入 usage.iterations 断言后十请求通过（7.00 秒）；顶层 usage 没有把不同模型 token 擅自求和。首块和中途边界、JSON/SSE、prefix-hit、fork、cold import 均保留原块与 trigger。
- `TestFallback*` 校验 raw SSE 证据必须同消息/同索引且已闭合、证据只能消费一次；历史移位/改模型拒绝，Advisor+fallback 全缺失/部分保留组合可精确恢复；fallback 只撤销当前分段待完成调用，原历史 pending 和后续调用不清空，ID 不能复用。
- 独立复跑主 agent 的 `TestRealCLIAdvisorCompatibility` 三种结果（plain/encrypted/error），12 请求通过（8.61 秒），通用逐块 omissions 调整未破坏已有流程。
- 最新 engine 完整单测通过（3.955 秒），`go vet ./engine` 通过。团队仍在并行实现其它功能，最终提交前仍需主 checkout 集成检查。
- task_budget.total 明确采用官方最小 20000；单测增加最小值、仅预算、format+预算，确认不会相互覆盖。真实假上游测试使用 64000/80000，未把非法小预算当成功证据。

业务文件边界：新增 `task_budget.go`、`fallback.go`、`fallback_stream.go`、`fallback_history.go`；窄接入 request/response block switch、RequestPlan、policy、thinking_output_plan、原始 SSE observer、runner pre-push。`history_omissions.go` 仅将 registered omissions 改为逐块匹配；`server_history.go` 加入当轮 fallback 分段记账。未改核心授权、核心计价、账号选择或凭据。
