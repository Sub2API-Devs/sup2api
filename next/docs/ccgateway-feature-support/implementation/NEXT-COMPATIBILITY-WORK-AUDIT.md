# 下一批兼容性工作只读审计

2026-10-08。源码基线：`cb38d953b554bcd47ed75c9c7ddec9436a4d90d4`。阅读当前源码、catalog、FINAL-FEATURE-CLOSURE、COMPLETION-EVIDENCE-MATRIX 及 PROGRESS 顶部；未改业务代码、未运行测试、未访问线上或模型。Worker.76/Core.73 部署由其他代理负责，本审计不验证部署状态，也不把部署完成视为整个 goal 完成。

## 先纠正旧盘点的适用范围

FINAL-FEATURE-CLOSURE 与 COMPLETION-EVIDENCE-MATRIX 均保留多版历史快照。逐项旧表里的“任务预算隐藏历史未建”“跨Worker diagnostics必须补”“pinned MCP未真实验证”不能直接当当前源码结论。当前 `helper_history_runtime.go:newHelperHistoryExecution/admitHelperHistory/applyHelperHistory` 已有版本协商、完整隐藏消息恢复、位置锚点和绑定验证，catalog F-TASK-BUDGET 已声明普通custom inline的托管恢复；本提交又修复原位尾预算system与隐藏用量。它们仍需相应真实提供商验收，但不是本批需要从零实现的账本。

同时，以下当前 guard 仍真实存在：

- `helper_history_runtime.go:74` 对资源、credit、MCP、legacy structured、context/compaction、continuation 组合拒绝。已有普通custom预算链不等价于所有组合预算支持。
- `feature_plan.go:312` 对通用强制选择+内部搜索/legacy structured拒绝，只有 `forcedLoadedClientCatalog` 窄例外。
- `fallback_request.go:17` 只收1至3个显式模型，拒default动态候选；`:63` 拒内部轮次；`:70` 起拒compaction及compact编辑。
- `mcp_search_identity.go:36` deferred MCP要求完整pinned目录；动态非deferred MCP可用，不应笼统写“动态MCP都未实现”。

这些是明确不支持的组合，不是正常请求会被静默降级，也不能把“已明确拒绝”记成等价支持。

## 建议优先1：利用真实 listing 建动态 deferred MCP 身份账本

**确定缺口。** `mcpSearchIdentities` 仅从顶层/inline声明中的 `tools` 数组构建完整 `server_name + "_" + tool_name` 查找表；只要存在deferred而任一目录未pinned，就在准入时拒绝。`mcpAvailability.searchable` 也要求pinned。另一方面，当前 `mcp_connector.go:checkMCPBlock` 已校验 `mcp_tool_listing` 的完整服务器名与工具列表；`server_history.go:serverToolLedger.accept` 在listing分支仅核服务器/beta然后返回，不把已收到的listing纳入搜索身份表。因此“有真实listing证据但不能用于动态搜索身份”是具体实现缺口，不是只缺账号资格。

**可执行切片。** 先做“同响应先listing、后tool_search结果、再mcp_tool_use”的动态目录，不同时开放所有历史组合。复用现有 `mcpSearchIdentity`、namespace冲突检查、`mcpTimeline` 和 `mcpLoaded`，将完整listing作为按消息位置生效的目录证据；请求原始工具定义、URL/token、defer/enabled配置保持不变，不用远程额外列目录再伪装pinned。未知引用、同名拼接碰撞仍失败关闭。

**先补合同。** 明确listing是否完整、同服务器后续listing是替换还是增量、schema/描述变化及撤销何时生效；没有协议证据时只支持能证明完整的观察。不得靠拆 `a_b_c` 猜server/tool，不得把未来listing授权到此前调用。历史恢复必须同时重放目录位置与搜索结果位置，历史加载不自动授权新响应。

**所需验收。** 扩展 `mcp_deferred_search_test.go`、`mcp_pinned_search_review_test.go` 与真实CLI隔离测试：同名不同server、`a_b/c`与`a/b_c`碰撞、listing前引用、disabled、撤销/重加不同schema、部分/空listing、JSON/SSE、冷导入和回退。先保留pinned全部回归；真实第三方动态MCP另外验收，不拿假上游证明提供商资格。

## 建议优先2：强制选择与deferred目录的阶段合同

**确定缺口。** `forced_loaded_tool.go:forcedLoadedClientCatalog` 要求全部普通工具显式 `defer_loading:false`，甚至指定工具已加载、无关工具deferred也不满足；同时排除inline、MCP、server、typed、safeguards及legacy structured。`feature_plan.go:validateInternalRounds` 随即拒绝。`ApplyMainRequestFeatures` 当前对每个已归属主请求统一应用原 `tool_choice`，没有内部发现阶段与公开强制调用阶段的计划。不能只删除guard，否则未发现目录时可能强制不存在工具，或把内部ToolSearch当成已满足客户端forced。

**可执行切片。** 先区分“指定已加载目标但有其他deferred工具”与“指定deferred目标/any需要发现”。前者可能在不改变客户端目录/defer字段、原forced选择和helper禁止条件下扩展单轮路径，应先用真实CLI隔离出站证明；不要为了适配而把全部defer改false。后者再以显式状态机记录当前目录、已发现目标、隐藏轮证据、最终公开工具选择和终态，不把布尔条件散落进每次Apply。

**先补合同。** 隐藏发现阶段如何与客户forced语义共存必须有明确设计与CLI观察证据。不能悄悄把客户主请求从forced改auto、删除tool_choice、篡改定义或假造search结果；内部发现若不能在可证明独立的载体中进行，就继续拒绝该分支。保持原始工具名/schema/并行约束及结果handoff。若有真实隐藏轮，复用现有helper捕获、原位system和用量收据，不能另写一套历史/计量。

**所需验收。** `forced_loaded_review_test.go:TestReviewForcedLoadedWholeCatalogBoundary` 已将无关implicit/deferred工具作为负例，应保留并先添加新设计的定向RED，而非直接改断言为接受。矩阵至少包括named eager+unrelated deferred、named deferred、any mixed、目标未找到/撤销、搜索超过轮数、公开选择错误、JSON/SSE、续聊/cold/rollback、多delta用量及失败receipt。模型forced资格单独验证，不能把Opus不支持forced解释成适配器可以改auto。

## 建议优先3：fallback+compaction先补逐attempt计量合同，再接实现

**确定缺口有双重证据。** Worker `configureFallbacks` 在请求层拒compaction；core `usagerules/anthropic_attempts.go:attemptMeter.anthropicFallback` 遇 `iterations.type=compaction` 直接返回“lacks an admitted per-attempt metering contract”。已有 `gateway/attempt_usage.go:recordReplacementUsage` 按 `Kind+Model` 对照事前准入价格快照；`validateAttemptPriceFacts` 禁止把最终speed/tier借给早先attempt。普通compaction Additional路径与fallback Replacement路径独立，尚没有可用的压缩归属桥。

**现有证据不是闭环。** `fallback_compaction_probe_test.go:TestRealCLIFallbackCompactionUsageProbe` 明确只测transport：其假compaction迭代故意不编造model/attempt，证明原始顺序与计数可以传递，不证明能按附近message推断计费模型。不能靠删除Worker guard、用主模型价或把每次compaction累到最终模型来“支持”。

**下一步具体交付。** 先形成带可核来源的attempt身份合同：压缩条目如何绑定模型/attempt，是否有显式ID/模型或协议保证的位置规则、失败尝试/拒绝免单是否包含压缩、缓存桶与speed/tier属于哪个账务主体。现有测试没有提供这些答案，需官方协议或获授权的真实观察证据；本审计未查询外网，不能假定合同存在。若证据只能支持特定响应形状，可先做窄准入，其他仍拒绝。

合同成立后扩展共享usage adapter，复用核心模型授权/价格快照与Additional/Replacement去重；不要在Worker估价。测试包含两模型两压缩、同模型多迭代、缺/冲突归属、refusal free与部分失败、JSON/SSE多delta、重复receipt、冻结价格后配置变化。DB测试与真实费用核对分别记录。

`fallbacks:default` 与此分开：当前没有事前候选集合授权/定价合同。即使响应最终报告模型，也不能事后补授权。先解决确定的显式链压缩归属，default不宜与本批同时泛化。

## 只缺或主要缺真实资格证据的项目

当前catalog与证据矩阵已列出实现路径的Skills执行、Code Execution、PTC、Advisor、fast、复杂cache/compaction费用、真实fallback信用发行/兑换退款，应归入提供商资格/效果/账单验收队列，不凭“未真实通过”臆造代码故障。尤其执行too_many_requests不是云执行成功，也不证明转换一定有bug。既有真实pinned MCP、媒体引用和Read历史证据不能覆盖所有模型和组合。

完整前端视觉验收仍是测试欠账：旧CUA超时不等于页面已验，也不代表UI代码必须重写。stored Responses ID/background/Batches则是尚未建设的独立端点产品，catalog F-OTHER-APIS明确不能由现有Messages codec推导支持，不与上述3个兼容性切片混为一项。

## 结论与工作边界

推荐先做动态deferred MCP的真实listing账本窄切片，并行准备forced阶段合同；fallback+compaction先收集明确归属合同，再进入计量代码。三者都是当前guard与源码可定位的真实剩余工作，无法用本次隐藏预算修复部署成功替代。本文为只读源码审计和下一步设计建议，没有新增运行验证、官方协议核实或线上成功声明。
