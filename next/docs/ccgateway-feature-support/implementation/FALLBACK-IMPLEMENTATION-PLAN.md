# 显式服务端 Fallback 第四批实施设计

2026-10-08；设计/实施任务已授权，当前不放行未接好账务的请求。不涉及 default routing、手工 credit 兑换、跨账号迁移或客户端自行重试。第三批文件不随本批改动混合暂存。

## 协议与鉴权路径

客户端 Messages 的 `fallbacks` 仅接受 1..3 个显式模型对象，每个对象只含 model/max_tokens/thinking/output_config/speed；默认/credit 保留明确拒绝。使用官方准确 beta 版本；客户端 primary+每个候选必须分别过分组模型权限、账号支持、价格快照和映射后的 distinct 检查。模型引用复用 manifest RequestModelReference（Name=fallback，ArrayPath=fallbacks，ModelPath=model），不得从历史里的 model/fallback 块推导授权。插件补丁之后再次验证模型引用和计费 contract，不能凭已经授权一个 primary 就触发未授权目标。

Worker 的不可变计划保存原 fallback 对象，仅已归属主请求应用；不把这些字段附到辅助分类器调用。未覆盖的参数按上游继承规则保留；覆盖字段逐项校验并保存原值/null，不在 Worker 猜测另一个模型的默认 thinking/effort。传给服务器的所有继承组合由实际 provider 做模型能力合法性判定。只执行客户端声明的服务端机制，普通 429/529/5xx 不自行换模型。

## 真实 JSON carrier

外部 stream=false 时，已归属主 relay 实际发送 stream=false。上游原始 JSON 完整校验后保存，内部仅为 CLI 传输协议拆成合成 SSE 事件（拆的是实际 JSON，不拼造另一个回答）；最终对客户端使用原始已验证回答，完整 usage/stop_details/fallback/模型均保留。首个完整终态立即阻止 CLI 重试，不允许为得到 JSON 再发第二次云请求。

桥接抽取 warmup/count 的公共响应读入、压缩/头处理与停止机制，单独保留各自校验，不能把 warmup 的空 content/max_tokens 限制套给生成响应。错误状态、错误头原样走既有透传。JSON body 有界读取；压缩路径由 http transport 解压，替换 body 后清 Content-Encoding/Transfer-Encoding/Content-Length。

非流 JSON 与 SSE 使用不同 provider 请求，不能把 SSE 聚合当 JSON。前者的 provider 会清除被拒模型的 partial content，后者保留边界前已发内容。JSON carrier 结果可走 response-only checkpoint，避免 CLI 丢 fallback 元字段破坏客户端历史；重启/分支可从客户完整 history 重建，保持原 boundary 位置和签名。不能把内部伪造承载文本写成客户 assistant。

## 泛化账务合同

新增 `UsageRules.Attempts`（Name、Adapter、RequiredBy），Adapter 是独立解析器注册标识 `anthropic_fallback_20260701`。provider 分类/边界知识限定在 usagerules 独立 parser，主 gateway 只激活 contract、校验授权模型、接冻结价。避免把政策分类名散落核心调度。

`Acc.WithAttemptAccounting(bool)` 由 host 按已验证显式请求启用；`Replacement() ([]core.AttemptUsage,error)` 只在完整终态成功验证后给全量快照。AttemptUsage 带 Kind/Model/Tokens/UsageSemantics/Free/BillingReason/Metrics。SDK 对未知 adapter 和复杂 RequiredBy path 拒绝；账号 override 不能丢此合同。

`UsageRecord.Replacement []PricedUsage` 是主计费替换项（不是附加项）。非空时，计费器跳过顶层主表达式，逐 replacement 独立价格/输入/rate 计价，再加原 Additional（advisor/compaction）。原顶层 Tokens 留作 API 与记录可见事实，不再扣一次。PricedUsage 增 Free/BillingReason，明确免费的拒绝仍保留完整 token/价格快照和理由。pending JSON 保留 replacement/free/所有价格输入；重试不重读新价格。预扣可以主+全部声明候选保守预留，最终按实际替换项结算/退款。

异常解析、未知/未授权实际模型、映射冲突、缺价格、缺终态或缺拒绝类别证据：不修改原 API 200，不猜测免费或主价，而是 BillingError 阻止结算并留待修复。

## 尝试解析与去重

usage.iterations 是完整 snapshot，重复 SSE message_delta 替换而非累加。message 与 fallback_message 都属于替换主用量；advisor/compaction 仍由原 Additional 规则处理。一次模型尝试可含多个工具循环 message iteration，不能简单按一模型一条或仅取 fallback_message。

按有序模型分组与 fallback boundary.from/to 校验链。每一 declined hop 的最后 sampling iteration 关联对应 trigger；早期工具循环不是自动免费。最后实际 serving iteration 用 fallback_message 标识，sticky 直达可能只有 fallback_message 且没有 boundary；仍需匹配声明模型。无实际 fallback、缺 iterations 的单主模型正常回答允许用 top usage 构成唯一项；有 fallback 证据却缺迭代明细阻止计费。

输出已产生的尝试正常计费；无输出拒绝仅按明确类别策略判定，unknown 不当免费。最终 refusal 取 stop_details；先前 refusal 取 fallback.trigger。普通 end_turn 的零输出不是拒绝，不可判免费。计数必须非负整数有界，模型不能为空或来自未授权集合。多循环/缺 model 的歧义不自行猜测。

## 验证矩阵

- JSON 与 SSE：primary 成功、首 token 前拒绝、有输出拒绝、2/3 候选、全部拒绝、候选限流退回拒绝、sticky 直达、重复 usage snapshot、服务端工具多循环。
- 收费：已知收费/免费/null/未知类别、最终项不重复、主价 nil/候选价有值、不同 rates、不同缓存费用、Additional 与 Replacement 同时存在、坏计数/未知模型只阻止结算。
- HTTP/CLI：实际 main stream=false/true、完整原 JSON 与 SSE 不同fixture、gzip、4xx/5xx/取消、无隐式第2请求、prefix/fork/restart、辅助请求不带fallback。
- DB：replacement价格快照落 pending、扣费失败重试同价、预扣只释放一次、免费拒绝账务明细可查。Linux DB/race/真实账户最后由 root 统一执行。

## 官方证据

[Refusals and fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback) 定义显式链、JSON/SSE差异与分类收费；实现必须保留提供商结果而非自行规避拒绝。

[BetaFallbackParam](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_fallback_param.py)、[BetaFallbackMessageIterationUsage](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_fallback_message_iteration_usage.py)、[BetaMessageIterationUsage](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_message_iteration_usage.py)、[BetaFallbackBlock](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_fallback_block.py) 为字段依据。

这些是资料/设计结论，不是实际云授权、计费回单或上线证明。

## 第四批实现状态（2026-10-08）

已实现作者范围，未暂存/提交/部署：

- SDK Attempts contract、core AttemptUsage/Replacement/Free/BillingReason、独立 usagerules provider meter；最后 snapshot 不累加，完整 terminal 才允许替换计费。
- settlement/precharge 泛化 replacement：跳过 top 主价，逐项冻结价，再加 Additional；明确 free 项保留价格、计数与证据。pending 重试保存完整快照。
- Worker fallback_request.go 保存显式原对象，严格 beta/字段/候选数与组合验证；仅main applies。default/credit未开放；内部CLI多轮/warmup/count/非Anthropic transport不混用。
- json_generation.go 实际上游 stream:false + gzip JSON → 内部SSE carrier，返回原真实envelope及标准客户端tool名称。禁止完整链被CC暗重试。stream:true仍真SSE，保留被拒partial内容。response-only checkpoint支持继续/回退/cold import。
- 最后 sampling iteration才接终态已声明Facts。SSE不继承message_start速度等facts，边界清空、最终delta缺失不变0；非法类型/enum/非有限数不录入。其它attempt Metrics为空，由root价格facts必需校验阻止猜测收费。
- 显式 fallback + 非null compaction/context compact操作窄拒绝，理由为缺 per-attempt 压缩模型归属。普通clear/null不禁。响应意外compaction迭代阻止结算，不能自动按原primary价。

根线程拥有并实施模型授权/账号能力过滤、ParameterOverrides候选价快照、manifest声明、gateway记录替换项、actual price facts门禁和多模型限额计数；作者未修改这些主调度文件。模型权限与费用的全链证据以根整合记录为准。

### 测试证据

- 真实 CLI2.1.292 + 全隔离假上游：8请求 PASS7.894s。JSON新建/继续/回退/cold import4；SSE1；JSON/SSE 429各1（Retry-After保留、每次只1链）；all-refusal JSON1（无文本，仅fallback边界，HTTP200）。同时验证main wire原始fallback对象与beta、gzip JSON、实际final model/iterations、JSON无SSE partial混入。
- 最新全engine `go test ./engine -count=1` + vet PASS3.862s。
- usagerules/usage/billing 目标单测+vet PASS1.201s/2.519s/0.733s；SDK manifest/check全测试 PASS2.276s。
- 计费测试覆盖已知收费/免费/null/未知类别、3跳全部拒绝、多工具iteration、sticky、重复snapshot、负数/缺分类/意外compaction、不同价格和rate、free证据、replacement+additional叠加、pending JSON冻结重试、facts归属。
- 新增 LinuxDB `TestReplacementSettlementDBRetriesFrozenAttempts`，验证原top价99不重扣、free primary+真实candidate价1、失败重试同价、预扣只释放一次和明细。Windows本地嵌入PG缺global/pg_control启动失败；没有修改数据库目录。之后设置 SUB2API_TESTPG=off仅运行非DB验证；DB测试尚待根Linux隔离执行。

仍未证明真实云账户支持/真实收费回单/生产部署。JSONcarrier和replacement作者实现需独立复核，不能把作者单测当独立审查。
