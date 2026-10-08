# thinking_delta.estimated_tokens 独立复核

2026-10-09。审查共享 `contracts/credits/events.go:MessageFromEvents` 候选；只新增 `events_estimated_tokens_review_test.go` 和本文，未改作者业务代码、未发送公网请求、未访问生产或调用模型。

## 协议依据

本代理本轮直接读取官方 [BetaThinkingDelta](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_thinking_delta.py)：`estimated_tokens` 为 Optional[int]，默认null；它是thinking_delta逐帧的非负进度估计增量，仅供展示，不是计费token；`usage.output_tokens` 才是权威用量。具体quantum未在该类型中给出固定数字，因此本地不猜测倍数条件。

## 实际 RED → GREEN

独立测试首次执行时作者已修改工作区，当前候选先PASS（1.474s）。为取得真实旧版证据，将HEAD `00c5b0d19760217c1323dc706f3970f1551dfcd6` 的原events.go与credits非测试源码、独立测试复制到独立临时Go模块，不覆盖工作区：null、0、128、9007199254740993四项均明确RED，错误为 `invalid or unsupported credit response stream`（1.241s）。不是将作者报告转述为本代理红例。

当前候选使用闭集字段校验，仅thinking_delta允许额外estimated_tokens；null或非负整数字面接受，其他类型/字段仍拒。任意精度校验不经float64，也不把巨大合法整数当0；-0依数学零处理。

## 独立覆盖与结果

- null/0/128/大于2^53的整数字面接受。
- 最终持久message与同内容、无estimated_tokens的baseline逐字节一致；估计值不进入assistant block、顶层message或usage，因此不会改变以assistant内容形成的prefix输入。
- 多帧128+256不累计入output_tokens；实际input17/output3保持原值。
- 原始输入SSE帧字节不变，包含估计字段的原帧没有被解析器删除/重写。
- 初始thinking `initial:` 与delta拼接正确；多次signature_delta替换后最终空signature保留，不拼接旧签名。
- 负数、小数、字符串、bool、map、array、未知字段、缺thinking正文、signature_delta擅自携估计字段均拒绝。

最终执行：

```powershell
go test ./credits -count=1
go vet ./credits
```

contracts模块全credits PASS（1.063s），包括新增3项独立测试及既有签名、空input delta、引用、消息终态等测试；vet PASS。

## SSE透传与计量边界

只读核 `server/internal/gateway/helper_history_response.go:helperDeliveredPrefix`：聚合结果只提取role/content用于prefix，未把显示估计作为计量来源。`finishHelperHistory`最终仍写入 `held.body.Bytes()`，不是把MessageFromEvents产物序列化成新的SSE。计量路径 `applyHelperAccounting` 仍将原始帧交给既有usage解析。

本代理实际测试证明解析器不修改输入原SSE、持久message/usage不受估计字段影响；完整Core HTTP透传与实际账务整链由API代理另行测试，本文不冒充已独立执行HTTP/PG。Worker端严格性由CC独审，当前没有新的公网成功声明。本次候选未发现新增阻断问题。

## 追加：独立 strict codec 窄修复核

2026-10-09，同步只读复核root新增 `protocol-codec/strict/stream.go:validThinkingEstimate` 和thinking_delta字段白名单。本模块未增加plugin/contracts依赖；实现使用已有encoding/json.Number逐字符校验，接受null、-0与任意精度非负整数字面，不转换为float或机器整数、不保存估计值。

新增独立 `strict/thinking_estimate_review_test.go` 三项测试，覆盖：

- -0、80位整数字面经两帧thinking后，Responses最终output/usage与无hint baseline完全一致；所有输出Event无estimated_tokens。
- signature_delta、text_delta、input_json_delta即使携null/0/128，也不能偷带hint；失败不部分修改block。
- 负数、小数、科学计数法（本合同要求整数字面）、string/bool/object/array和未知字段仍拒。
- 空thinking帧与两次正文增量保留初始thinking；三次signature最后替换为空仍正确，block只含type/thinking/signature。

在protocol-codec独立模块执行 `go test ./strict -count=1` 与 `go vet ./strict`，全部PASS（1.384s）。包含root多帧output_tokens基线测试和原签名回归。root提供旧版RED1.320s→候选GREEN1.222s记录，本代理没有重复跑strict旧版，独立结果是当前全strict GREEN；不将root红例记成本代理实跑。

结论：此窄修未发现新增阻断；Anthropic原始SSE透传与OpenAI转换是不同路径。Responses转换不输出Anthropic专有显示hint，不能据此声称Anthropic原SSE也删除了它。原SSE原字节保留证据及Core整链边界见前节/API记录；本轮未发送任何线上请求。
