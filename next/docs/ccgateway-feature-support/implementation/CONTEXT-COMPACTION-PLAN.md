# F-CONTEXT / F-COMPACTION 实装设计与 CLI 探针（2026-10-08）

状态：本文件及原始CLI可行性测试已完成，尚未开放网关请求字段或宣称端到端兼容。准备接入root维护的共享主请求终止／续接适配器，不单独复制一套状态机。

## 协议不能合并成一个“压缩”开关

- Context editing：`context-management-2025-06-27`，请求 `context_management.edits`，包括工具结果清理和thinking清理；清理thinking策略须排在其它策略之前。`exclude_tools`涉及工具名称映射，响应保留 `context_management.applied_edits`，SSE在message_delta上返回实际应用结果。[Context editing](https://platform.claude.com/docs/en/build-with-claude/context-editing)
- 旧阈值压缩：`compact-2026-01-12`，请求 edits中的`compact_20260112`，可指定trigger、instructions、pause_after_compaction。旧流协议存在`compaction_delta`；暂停时stop_reason=compaction，调用者可提供后续历史再继续。[Threshold compaction](https://platform.claude.com/docs/en/build-with-claude/compaction-threshold)
- 新按需压缩：`compact-2026-09-04`，顶层`compaction:{type:summarize}`。成功返回带content和signature的单一compaction块，流中整块放在content_block_start而不分delta。block原样回放；本次无摘要仍可能HTTP200空content（例如max_tokens/refusal），必须按原stop/usage返回。不得擅自让CLI再生成一轮替代它。[On-demand compaction](https://platform.claude.com/docs/en/build-with-claude/compaction-on-demand)
- 新版压缩与context_management不能同请求混用；不能把旧未签名摘要伪装成新版签名块。blocks中的cache_control仅按对应协议合法位置处理，不能补入citations:null等上游未返回字段。

近期轮次保留不是新增keep_n参数：客户端自己选切点，工具调用及结果不能跨切点。后续历史使用summary block前置加原样保留的尾部。[Keep recent turns](https://platform.claude.com/docs/en/build-with-claude/compaction-keep-recent-turns)

签名thinking依赖原上下文、system及未defer的工具定义；保留轮次必须紧接被摘要历史、角色边界正确。协议条件不满足时，上游可以400或按客户端显式prefix_mismatch_behavior丢块。网关不重签、不悄悄删thinking、不自动改drop_block来规避校验。[Preserved thinking](https://platform.claude.com/docs/en/build-with-claude/compaction-thinking-blocks)

## 实际 CLI 2.1.292 观察

新增 `engine/context_compaction_cli_probe_test.go`，运行真实CLI但只访问回环假上游、临时HOME/config、合成key。EXTRA_BODY仅用于探针，不是生产接法。伪签名只是opaque codec测试值，不能证明签名有效。

运行：`CCG_REAL_CLI=<实际本地可执行文件>`，`go test ./engine -run '^TestRealCLIContextCompactionSurface$' -count=1 -v`。

四类观测：

1. context edits：请求字段精确保留；单次调用；applied_edits与iterations在stdout事件可见；CLI正常退出。
2. 新signed compaction：首轮仅一次请求，摘要和signature在事件及native文件保留，但CLI非零退出。测试主动resume后，下一次实际请求也携带精确摘要／签名；该场景总计2请求，其中第二个是测试主动触发，不能说CLI自行多请求。
3. 新版空内容completion：fake首轮HTTP200、空content、max_tokens；CLI自行发第二个模型请求，最终返回第二轮文本且正常退出。证明必须在代理观察到首轮完整message_stop后关闸，不能等CLI result。
4. 旧阈值：compaction_delta摘要在事件可见、无signature；native里没保存完整摘要，CLI非零退出。必须以原始完成响应为准，必要时response-only checkpoint，不能依赖native transcript宣称摘要已保留。

本轮4个子测试通过代表成功获取这些观察，不代表网关已经支持这些请求。没有真实上游摘要、签名验证或计费验证。

## 实装分层

### 请求计划

新增独立context_plan模块，RequestPlan持有结构化客户端策略；只在marker+Mod lease确认的主模型请求覆盖字段。不能把context策略发给权限分类器、后台补全或其它辅助模型回调。count_tokens的正式公开端点支持另行实现；不能因CLI内部估算请求存在就宣称公开计数已可用。

- 所有数值采用json.Number整数字段，不先Float64。检查null、数组、未知策略和参数组合；不会把未来未知策略默默当已支持。
- clear工具的exclude_tools使用已经建立的客户端到wire名称映射；服务端工具保持官方名字。只改文档定义的工具名引用路径，不改任意自然语言instructions或嵌套payload。
- context清理策略由上游实施，网关不得预先删原消息冒充服务端applied_edits。若返回尚未适配新删除标记／内容块，明确报可定位的协议错误，不能伪造统计。
- 新compaction请求必须保持原始历史，允许协议合法的assistant结尾；当前普通请求“首尾必须user”限制必须按能力分支调整。不能添一条虚构user来满足CLI，而后让该消息进入摘要。
- 携带新compaction历史可从assistant摘要开始；默认相邻assistant合并可能破坏签名保留轮次边界，需要独立preserve-boundaries模式，并与research_api的Message DTO元字段一起维护。未决工具result必须补齐后才允许摘要。
- 新compaction不能与context_management同传；forced tool_choice、stop_sequences、output_config.format等不适用组合应明确拒绝，不静默丢参。

### 回调与传输

复用root的共享续接适配器，给请求阶段附加operation kind（normal/context-edited/threshold/on-demand/replay），并明确一轮最多允许的上游完成响应数。不可用响应block名称单独判定请求归属。

- 普通context edits允许一次上游生成，记录真实applied_edits。
- 新按需摘要无本地工具执行／后续自动生成：首个完整HTTP成功响应（含空content/refusal/max_tokens）就是终态。
- 旧pause_after_compaction返回compaction终态给调用者；无pause且上游同一HTTP响应内继续生成时保持同一响应事件链，不额外造客户端请求。
- SDK/Mod权限控制仍原样拒绝客户端工具的容器执行。请求中的safeguards描述真实客户端执行上下文，摘要调用也不能弱化或伪造审查。

### 响应与历史

- 支持新版完整compaction content_block_start，旧版compaction_delta独立codec；不跨版本补签名。
- 原始stop原因、usage.iterations、context_management、input_transformations在JSON/SSE保持一致。顶层input/output=0不能丢掉iterations里真实消耗。
- 对合法空content返回200；正常refusal不是502；不得丢弃首轮并返回CLI后来生成的答案。
- Ledger保存真实opaque compaction块、签名、完整stop和usage。只在native内容验证完全一致时建立native checkpoint，否则response-only，下一次按客户端完整历史重建。
- 跨账号／Provider／模型签名有效性不能从codec保真推断。保留真实原始返回，并让上游决定是否有效；不“修复”签名，也不把CLI内部/compact总结替换成官方API block。
- 与缓存/引用对齐共用history_alignment；摘要替代了哪些历史只能依官方operation与客户端下一请求决定，不能按文字相似性删旧历史。

## 下一批验收与协调

先实现context编辑（名称映射/字段/applied_edits），再接完整新版摘要终态和回放，最后旧阈值delta及pause。每阶段先schema单测，再真实CLI/fake wire，再独立真实账号测试。

测试矩阵包括：两版本beta及错误混用；单一签名块与多签名块；content/signature空值和修改；新旧SSE差异；空content终态；refusal；max_tokens；usage iterations；assistant尾部请求；assistant摘要开头重建；工具pair跨边界；保留thinking＋system/tool变化的精确上游400；新会话/import/回退；取消中途摘要不产生伪完成checkpoint；新回调上下文不得接受其它请求marker。

现阶段仅增加探针和本方案，不修改request.go、response.go或另建continuation engine；root与research_api分别持有共享续接及Message DTO/inline system字段，接入时先协调。
