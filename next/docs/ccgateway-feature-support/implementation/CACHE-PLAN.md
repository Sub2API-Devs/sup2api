# F-CACHE 逐块缓存保真实施方案（2026-10-08）

本文件是下一批方案，尚未改请求解析或缓存业务实现。本轮只增加真实 CLI 对隔离假上游的观测测试；测试通过代表捕获成功，绝不代表缓存语义已兼容或上游已节费。

## 现有证据

官方 API 区分顶层自动缓存和显式块断点；前缀顺序为 tools → system → messages。最多4个断点，混合TTL时1h先于5m；自动缓存也占用断点名额，最后一块已有同TTL断点时无需再加。具体模型、平台和最小长度仍由上游决定。[Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)

公开 CacheControlEphemeral 结构是 type=ephemeral、可选 ttl=5m/1h；顶层和内容块字段可以为null。没有根据内部 beta 名称猜造 scope 等参数。[Messages API](https://platform.claude.com/docs/en/api/messages/create)

CC 自己组织缓存稳定前缀，这种默认策略不能代替客户端指定断点。[Claude Code prompt caching](https://code.claude.com/docs/en/prompt-caching)

新增 `engine/cache_wire_probe_test.go`，真实本机 CLI **2.1.292**、仅回环 fake endpoint、临时 HOME/config、合成 key，三个用例均HTTP200：

- baseline 无客户端断点：实际出现3个CLI断点，位于CC自身system、合并后的客户端system、最后一个用户文本块。
- mixed-explicit：客户端 tools[0]=1h、system[0]=1h、messages[0].content[0]=5m。实际工具断点丢失；两个客户端system块被拼成一个，断点覆盖两块；用户第一块断点被移到第二块；实际3个断点均1h。
- automatic：客户端顶层 cache_control=5m 没有保留成顶层字段，实际仍是上述3个CLI断点。

执行：设置 CCG_REAL_CLI 后 `go test ./engine -run '^TestRealCLICacheBreakpointObservation$' -count=1 -v`。本轮3个子用例通过（CLI运行约2秒），只输出合成测试文本、断点位置和TTL，不输出真实上下文/凭据。

源码原因：request.go 的 blocks 删除 cache_control，parseTools不存储工具断点，parseSystem把文本聚合，cacheTTL只记录最长TTL，runner以环境变量影响CC的全局TTL。system_restore.go还会把CC断点从被替换块移到最后恢复system块。这些都是现有逻辑，不应当成客户端原位断点支持。

## 共用精确对齐模块

建议抽取 `wire_alignment.go`，先让 citation 和 cache 使用，system逐步提供/消费同一映射结果，避免三套相似但不一致的匹配器。

输入是经过已验证主请求 marker 归属后的最终消息结构，以及客户端解析前的协议块计划。输出只描述映射，不直接写字段：

```go
type ClientBlockRef struct {
    Section string // tools, system, messages
    Message int    // 原始客户端message位置
    BlockPath []int // 内容嵌套位置；只遍历已知协议容器
}
type WireBlockRef struct {
    Message int
    BlockPath []int
    // 已验证字符串合并时记录精确区间，供受控拆块使用
    Start, End int
}
type WireAlignment struct {
    Blocks map[ClientBlockRef][]WireBlockRef // 实际Go实现须用可比较key
    InternalTurns []InternalTurnEvidence
    Transformations []VerifiedTransformation
}
```

这里只是契约草案，不是可编译代码：BlockPath切片不能直接作map key，实施时用规范化路径串或专用索引。

定位要求：

- 使用role、完整内容结构、assistant顺序、前置user及document corpus顺序联合定位；重复文本不能靠第一个字符串命中。
- tool_use.id/tool_result.tool_use_id 与实际路由身份进入匹配。只能排除经运行时证明的内部轮次；当前客户端声明的 ToolSearch 不能按名称排除。
- 只在协议定义位置忽略待恢复的 citations/cache_control。绝不能递归删除工具 input 中同名业务字段。
- CLI把两个system文本块以双换行合并时，只有整段与原始块序列精确匹配才能按确定区间拆回；不trim、不模糊搜索，不把断点随手移到最后一块。
- 普通消息合并、tool_result嵌套、原生工具名映射、typed附件过滤都需要登记允许的变换；无法一一对应时拒绝该请求并指出定位失败，不能静默放弃断点。
- alignment结果同时用于引用恢复、缓存断点恢复和媒体来源索引检查。写入前验证全部目标，再原子提交补丁，避免后半段失败却留下部分修改。

## 缓存计划

1. 解析前提取 CachePlan：保留根字段是否存在、null与缺省的区别、每个已支持协议块路径上的完整缓存对象。保留客户端原始块顺序与摘要。local历史缓存TTL与上游cache_control应拆成不同含义字段。
2. 工具按客户端名称 + schema + 已验证wire映射定位，尊重真正上游工具顺序。若CLI重排工具导致已标记前缀覆盖不同工具，需确定性恢复客户端顺序，或明确拒绝；不能只把marker贴到同名工具就算保持缓存前缀。
3. 原始client断点是显式覆盖请求：在已归属主模型请求中移除CC自动生成的已知协议位置缓存策略，再按计划原位恢复客户端断点，避免CLI额外3个断点把总数变成6个。缺省客户端完全不指定缓存时保留现有CC默认缓存行为；顶层显式null的语义需专门验证并公开，不把null解释成禁用全部缓存的私有开关。
4. 根级自动cache_control原样保留为根字段，不偷换成“最后文本块”。计算/验证根自动缓存和显式断点的有效名额，不任意合并不同TTL。模型不可缓存块、断点先后等最终合法性仍由真实上游精确校验。
5. 不将当前客户端断点写入共享native transcript，避免下一轮请求继承过期策略。每次请求根据自己的完整历史计划重新对齐；cache plan应进入必要的本地逻辑作用域/变换版本指纹，缓存读写不能越账号、OAuth身份、Provider或原生历史归属。
6. 主请求与工具内部续轮明确区分。首次主模型可以精确复原，后续内部搜索新增消息不得让客户端断点漂移到内部result。top-level自动缓存是否应包含新增内部轮次需要独立定义/验证；首批无法证明等价则明确拒绝组合，不能把辅助classifier也套用客户端cache策略。
7. 保留上游usage的5m/1h创建与读取计量，不把本地prefix-hit、HTTP200或fake usage当作节费证明。生产计费验证必须另记account/model/provider、实际调用、命中token结果。

## 分阶段验收

- 单测：0/1/4/5显式断点；自动+3/4断点；相同/不同TTL尾块；1h→5m及反序；null/缺省；工具重排；重复同文块；相邻user合并；重复assistant；inline system；document/tool_result嵌套；input.cache_control字面业务字段不得受影响。
- 主归属：真实marker（含JSON转义）/count_tokens/辅助模型三类请求；只有授权的主请求按计划覆盖。
- 真实CLI fake upstream：当前3场景作为失败基线，实施后升级为原路径与TTL精确断言；加prefix-hit、fork、全新cache全历史导入、不同account运行器、internal ToolSearch、引用共存和refusal。
- JSON/SSE：请求缓存策略等价；响应usage/stop字段保持原样。max_tokens=0暖缓存作为单独协议组合，与当前limits实现协作，不从普通消息推断其支持。
- 发布：目录F-CACHE继续partial，分别列明确实通过的子能力和未验证项；逐项有运行证据后再扩展，不能因最高TTL参数可用就整体标supported。

## 引用独立复核

新增 `citation_independent_review_test.go` 复现：客户端拥有原生 ToolSearch 且策略允许内部搜索时，原过滤按名字把客户端assistant轮次删除，导致assistant count不符。research_api已改为request-aware citationInternalAssistant，保留客户端拥有的ToolSearch及混合工具轮次；本人复跑 `TestCitationReview|TestRestoreHistoryCitations` 通过。

system_restore.go 的旧 internalAssistant 仍只按名字判断，调用者缺Request上下文。该处应随共用alignment窄改，不能让citation与system产生两种“内部轮次”定义。已向父agent报告，未直接改其业务代码。
