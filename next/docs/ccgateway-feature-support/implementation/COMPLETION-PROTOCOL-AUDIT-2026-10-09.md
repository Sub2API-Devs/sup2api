# 独立协议完成范围审计（2026-10-09）

## 审计状态与边界

本文件为交接只读审计，审计基线 Git `1c35179527a7632f3ea06b9d9014d81854112956`。用户要求已改为整理交接，停止实施和部署；本次不调用真实模型、不启动 CLI 长测试、不触 OAuth/token 锁、不改数据库或业务源码。Core .78 / Plugin .14 / catalog .17 / Worker .80 / Controller .48 是主代理提供并由现有发布记录交叉核对的当前运行基线，不以旧快照覆盖新状态。

目标仍是任意 API/原生 CC 客户端下完整历史、续聊、冷导入、回退及已调研协议功能的保真，不因当前只支持一个较窄组合而宣称整体完成。源码实现、真实 CLI 对假提供商、真实隔离 PG、真实提供商成功和上线是不同证据层。

## 当前结论

37 项 catalog 是已实现功能及其边界的目录，不能当作 37 项无条件完成。多数单项协议路径已有实现；当前真正的开发工作集中在下文 A–G 的组合、严格拒绝策略和独立状态服务。fast、advisor、compaction、safeguards、code execution/PTC/Skills、credit 等缺真实成功资格证据的项目，应安排验收或记录供应商拒绝，不能重新写成“尚无实现”。

动态单 MCP 和窄 forced mixed 已公开验收并随 Worker .80 上线；普通/custom-inline helper 的持久历史与唯一账务已公开验收。Core .77 缓存事实及 .78 生产 UI 已闭环，不是下一 AI 的待发布项目。本审计未证明任意组合均可保真，亦未证明当前所有门禁均为永久协议障碍，不宣布整体目标完成。

## 已闭环事实：不要重新列为开发待办

- [PUBLIC-DYNAMIC-FORCED-CORE-0.1.75-WORKER-0.1.80.md](PUBLIC-DYNAMIC-FORCED-CORE-0.1.75-WORKER-0.1.80.md)：动态单 MCP 新/续/回退各一次真实成功，每请求一个 provider 交换；listing 与完整声明/历史 hash 对应。named eager + unrelated deferred 三次真实成功，首请求原目录、选择及 parallel 标志保持，无实际 helper。证据不含生产冷重启、多服务器或 forced 未发现目标。
- [PUBLIC-HELPER-BUDGET-CORE-0.1.74-WORKER-0.1.79.md](PUBLIC-HELPER-BUDGET-CORE-0.1.74-WORKER-0.1.79.md)：ordinary/custom-inline helper 真实公开往返、SSE、回退及唯一收据/用量；隔离 ABC 另有冷 Runtime 与真实 PG。完整隐藏历史托管已实现，生产跨账号迁移未验不等于缺少持久恢复。
- [CACHE-TTL-PRODUCTION-INDEPENDENT-ACCEPTANCE.md](CACHE-TTL-PRODUCTION-INDEPENDENT-ACCEPTANCE.md)：usage744 的真实原 SSE 总写 2595、显式 1h1376、显式 5m0、未分桶1219，metrics 独立记录 partial；保留原费用 0.02670540，不把1219当作提供商证明的5m。原 SSE、唯一账务及 DTO 证据是这一场景的闭环，不能推导其他账户所有 TTL 行为。
- [DEPLOYMENT-2026-10-09-CORE-0.1.78.md](DEPLOYMENT-2026-10-09-CORE-0.1.78.md)、[UI-PRODUCTION-CORE-0.1.78.md](UI-PRODUCTION-CORE-0.1.78.md)：精确 Git 发布、四节点实际 .78、既有插件 .14 不变；生产真实页面七种宽/窄/滚动布局全部 bounds.pass，复用 usage744，无新增模型和账务写入。
- `outbound_relay.go:431/458` 的恢复前/后 `verifyNativeWireTools` 已存在；[FORCED-MIXED-INDEPENDENT-REVIEW.md](FORCED-MIXED-INDEPENDENT-REVIEW.md) 的两个旧红例与后继修复应保持历史，不能继续标成当前开放越权 bug。

## A. 严格 Beta/body 拒绝仍有具体实现缺口

这是本审计新核出的代码事实：

- `next/plugins/ccgateway/companions/engine/request_policy.go:38` 的 `defaultRequestPolicy` 默认 `UnknownBeta:"ignore"`；`applyBetas:369` 对未登记 Beta 直接 continue，不转发也不返回错误。
- 同文件 `filterFields:225` 在 `UnknownField:"ignore"` 时删除未知顶层字段；`outputConfig:278` 也有未知子字段忽略分支。已经登记的已知语义字段有专门门禁，不等于任意新语义都受保护。
- `next/server/internal/ccgateway/request_policy.go:47/92` 的 host 默认/校验允许相同策略；`next/web/src/views/ccgateway/requestPolicy.ts:23` 及 `RequestPolicySettings.vue:34` 暴露 ignore 选择。因此并非仅 standalone Worker 的测试设置。

下一 AI 需先只读核实际生产生效 policy，不能从默认值断言当前生产实际配置。按用户“不能等价支持须明确拒绝”目标，将未知语义 Beta/body 的默认与准入改为明确拒绝，并设计已有保存 ignore 配置的兼容迁移；不能只改 UI 默认。原生 CC 发送的运行环境 Beta 也不能粗暴删除：明确登记需要保留的无业务语义运行字段，真正无法保证语义的仍报参数路径和原因。

验收以 HTTP→plugin→Worker 实际请求为准：未知 Beta、未知顶层字段、未知 output_config 子字段均在模型派发前失败；已登记 Beta 原名保留；工具 schema/input 里的同名字段不被当作协议字段；旧 policy 不能重新打开静默丢弃。先写具体红例再实现，不需要在交接阶段调用真实模型。

## B. 多服务器动态 MCP 有可复用路径，尚未实现该组合

`mcp_dynamic_listing.go:configureDynamicListing:13` 明确要求 `len(servers)==1 && len(toolsets)==1`，并拒绝 fallback/credit/context/compaction/safeguards 和 inline/压缩/fallback 历史。单服务器逻辑已有完整基座：

- `acceptMCPListing:89` 按 `mcp_server_name` 和不可变 listing digest 登记，候选目录通过引用/碰撞校验后才提交。
- `mcp_search_identity.go:mcpSearchIdentitiesAt:35` 从完整 server+tool 枚举 provider 组合名，精确映射而不拆前缀，并检查客户端/typed/server 目录碰撞。
- `mcp_timeline.go:compileMCPTimeline:67` 已按服务器分别维护声明、enabled/deferred/discovered、pending 调用及历史位置，支持既有 pinned inline/compaction 时间线。

具体下一步：把动态 admission 与“某服务器已有已验证 listing”的状态分离，逐 server 在真实 listing 位置构建引用表；每次新增 listing 都校验完整当前索引，处理目录碰撞和未发现服务器。保留现有 immutable listing 门禁；目录变更需独立协议合同，不能后一个 listing 覆盖早期调用的 schema。动态 inline/compaction 再使用每个位置的目录快照与净变更，当前 server credential 保留在顶层请求计划，不随历史 payload 落库。

首先完成真实 CLI 对假 provider 的双服务器：异步 listing 顺序、一个先发现另一个未发现、服务器名/工具名含下划线造成组合名碰撞、客户端同名、撤销重加、JSON/SSE、cold/rollback。然后在获授权的真实 MCP 上验双 server，不能用单 DeepWiki 成功替代。该组合不是 MCP 天然不可支持，也不是删一个 len 门禁就算完成。

## C. forced 未发现目标/混合 any 需单轮合同，不能自动改成 auto

`forced_loaded_tool.go:forcedLoadedClientCatalog:7` 只准显式 eager 的可选目标；指定 eager 时允许无关 deferred，`verifyForcedLoadedCatalog:31` 校验真实 CLI 客户目录，`originalForcedCatalog:95` 恢复原始字段存在性、顺序、数字和 deferral。`feature_plan.go:312` 对其余 forced+internal search/synthetic format 返回 continuation-phase adaptation 错误；`runner_config.go` 禁止该单轮路径执行 helper。

下一 AI 应先调查两条独立路径，而不是默认永久拒绝：

1. 原声明足以完整恢复时，能否继续使用**一个主请求**的原 forced choice + 原 deferred 目录，并禁止全部内部 helper；让 provider 返回其合法成功或原错误。这需要新增原目录权威校验和真实 CLI 捕获证明：未发现定义不能凭 placeholder 名称臆造，也不能为了通过把 defer_loading 改 false。
2. 如果目标确实需要内部辅助轮，必须建立辅助/主请求分相合同，保证客户端原强制选择只作用于原归属主轮、remaining 不被擅改、helper 不能执行客户端工具、失败轮用量唯一持久。先取得等价依据；auto 搜索再重发改变了原调用语义，不能当作完成方案。

验收覆盖 named deferred、mixed any、隐式 deferral、已发现再续聊、冷导入、inline 目录和 budget 的最小反例。模型资格分开：本次重新读取[官方 Opus5.5 迁移指南](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide)，该模型明确不接受 any/tool；不能为了完成网关测试改原请求成 auto。其它支持模型尚不能由这个限制推导也不支持。

## D. 已登记 helper 链与资源/diagnostics/credit/context/MCP 的组合

这是真正需要跨模块设计的剩余范围，不是零星透传字段：

- Worker `helper_history_runtime.go:admitHelperHistory:70` 拒资源、credit、MCP、context/compaction、continuation 及旧 synthetic 格式；`helper_history_inline.go:validateHelperInline:28` 仅准普通 custom，拒 native/provider identity。
- Core `next/server/internal/gateway/helper_history_request.go:172` 还拒 `resourceAccess/creditAccess/diagnosticAccess`，故 diagnostics 单项跨 Worker 已实现，也不能据此宣称与已登记 helper 链混用已实现。
- `helper_history.go:captureHelperHistory:72/validateWholeHelperPairs:109` 仅接受已实际归属且完整的纯 helper 回合；含公开客户端调用/服务端块的混合回合需要块级合同，不能藏入 whole_round。

建议复用并拆解以下合同，采用少量专职适配器和显式依赖次序，避免在 relay 叠条件：

1. **资源/diagnostics**：复用 `resource_references.go:admitResourceReferences/validateOutboundResources` 的 issuer lease/allowlist 与 Core owner/public→remote 映射，统一 helper issuer。当前资源检查会去除已归属 helper 回合后核公开位置，已有复用价值。为持久 helper 锚点明确 public ID 与远端 ID 的规范视图；资源输出、诊断归属、helper delta 和真实 usage 均提交后才释放响应。过期资源/链、issuer变化、失败提交仍保留实际部分用量；不能把账户 key 值当资源身份。
2. **credit**：`fallback_credit.go:bindCreditWire:161` 绑定不可变原 wire，并明确拒一次 credit operation 对应多个不同主请求。helper 会产生多次 provider 请求，直接移除门禁会破坏它。需明确每个已归属模型轮的信用发行/兑换，保留 strict/best_effort 原值，仅该轮使用对应 token，不让 helper 自动继承。统一当前主请求/隐藏历史的 wire digest，已登记信用失败与唯一收据、实际退款事实分离。
3. **context/compaction**：复用 `context_compaction.go` 原策略与签名验证和 positional payload，建立公开前缀、隐藏回合及 applied_edits 的编辑后锚点。压缩后不能重复恢复已删除隐藏回合，不能改签名摘要去适配改名；compaction 独立采样用量归属必须唯一。`task_budget.go:82` 的 remaining+compaction 另有门禁，应核官方剩余预算合同，而非自行减数字。
4. **MCP/native/typed/server inline**：复用 MCP、inline、PTC 既有时间线，新增历史运输身份与当前可执行身份的分离适配，精确 catalog digest 包含联合 toolset/server 身份。native 每个位置仍核实际 CLI schema；provider 块只能按其执行账本回放。若混合公开/隐藏块无法由当前 payload 表达，升级版本并协商，不能按相对索引猜位置。

每个切片的最小验收：JSON/SSE、先新链后续聊、进程/本地cache清空的真实 CLI 冷恢复、真实隔离 PG、回退、资源/目录撤销、同 issuer 重启、不同 owner/issuer 明确拒绝、dispatch 后无换号重试、每 RID 一份账务事实。之后再受控真 provider；仅 fake green 不能发布“真实执行成功”。

## E. 原生 CC、复杂 assistant-tail 与跨账号冷导入

`history.go:prepareHistory/resumeFrom/commit` 及 `api_output_completion.go:commitResponseOnly` 已支持原生/独立响应 checkpoint；完整客户端普通历史冷导入已有实现。`continuation.go` 严格剥离仅用于 CLI 运输的末尾 marker；不是新增用户话语。`continuation_bootstrap.go:needsContinuationBootstrap:25` 针对 Sonnet4.6 无签名普通服务端 pending 尾冷重建生成首用户原生状态，且明确排除资源、credit、MCP、inline、format、context、fallback、搜索和 per-turn system；bootstrap 无额外 provider 推理。

下一 AI 可复用该零推理原生初始化，将实际安全附件/环境父链与复杂尾部组合做逐类型结构核验。先建立完整原生附件位置和生命周期合同，再恢复尾块；不能删 Auto Mode 附件、搬 system、伪造 user 或把 marker 留到 provider。验收需捕获真实 pause_turn 历史的原块/签名，验证无额外生成、JSON/SSE、cold/rollback；普通文本 prefill 的 fakeCLI 成功不能代替它。[官方 stop reasons](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons) 将 pause_turn 原内容续接与普通文字 prefill 区分。

任意**新账号**导入需要细分：不含 issuer 资源的完整公开历史可以本地重建；签名有效性交 provider；已托管 helper 链目前绑定 account/issuer/model/CLI/policy，不能任意迁移。若未来支持可信同 issuer 账号迁移，应显式重新授权绑定和资源 lease，证明 workspace 身份同一性；跨 issuer opaque file/container/credit/diagnostic ID 继续拒绝。生产跨账号未实测是证据缺口，不能承诺任意迁移，也不能误说普通冷导入未实现。

## F. Chat/Responses 已有 strict 入口，helper 跨协议尚有门禁

`next/server/internal/gateway/convert/convert.go:84` 注册 Chat/Responses 两个转换器；`openai_anthropic.go:Prepare` 调用共享 `next/protocol-codec/strict` 并使用请求私有 Plan，后者 `plan.go:controls:202` 明确检查白名单、输出预算及不等价字段。旧 05-PROTOCOL-SCOPE 的“builtins 为空”已过时。

Core helper wrapping 仍拒 `rt.conv`，且 strict 没有任意 Anthropic beta/body 扩展入口。因此当前不能宣称既有 helper 链能从任意 Chat/Responses 客户端继续。下一 AI 应定义规范化 Anthropic 历史作为链身份、在发现/调度前完成严格转换，再以客户端协议视图校验公开锚点及工具/推理 ID 映射；禁止用重新生成 item ID 或删除 opaque reasoning 绕过。资源端点的 ID ACL 继续由独立服务承载。需分别验三协议原历史续聊、冷恢复、回退、refusal、SSE、唯一计费，以及不能转换的字段仍拒绝。

store/previous_response_id/background/cancel/Batches 不存在完整持久状态机。它们有可建设路径：owner ACL、请求/结果资源、状态迁移、取消、并发幂等和计费；这属于独立产品开发，不能以现 converter 得到一个 JSON ID 就声称完成。不能等价提供的 embeddings/音频/视频/训练仍路由其他有能力插件，不用 Claude 文本伪造。

## G. safeguards 与执行上下文的扩展

`safeguards.go:validateSafeguardRounds:35` 拒 internal search/synthetic/server 组合；`validateSafeguardTools:48` 核当前和历史工具名称、完整 schema 不变。`inline_internal_search.go:validateInlineInternalSearch:10` 又排除 MCP/server/typed/safeguards/native/签名 compaction。因此“工具身份保持 + 纯 MCP 单项已支持”不能外推整条内部多轮。

下一 AI 先扩完全同名同 schema、明确 executor 的切片；为主轮/辅助分类输入、历史 tool_use ID、opaque safeguards规则及 verdict 保持原语义，跨模型 fallback 另核授权与审查结果归属。只有确实需要改名且没有可证映射的 opaque 上下文继续拒绝；不得改规则/结论或把 client tool 改为 Worker 本地执行。这是合同与实现剩余，不是等待账号资格就能自动解决。

## 有当前合同理由继续拒绝的边界

- **fallback + 新 compaction 跨模型归属**：本次重新读取[官方 SDK BetaCompactionIterationUsage](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_compaction_iteration_usage.py)，无 model/attempt 字段。Worker `fallback_request.go:configureFallbacks:64/71` 与 Core meter 门禁有依据；不按相邻 iteration、最终模型或恰好同价猜归属。见 [FALLBACK-COMPACTION-ATTRIBUTION-AUDIT.md](FALLBACK-COMPACTION-ATTRIBUTION-AUDIT.md)。先获取逐压缩归属合同再开放，允许单项压缩不等于组合完成。
- **fallbacks:default**：`fallback_request.go:takeFallbacks:11` 仅接受显式1–3模型。派发前未知候选不能完成模型授权/冻结价格；若取得确定 provider default 集合可建 admission adapter，否则继续拒，不隐式全模型放行。
- **模型明确不支持的参数**：真实 Opus5.5 forced/prefill 等限制交原 provider 错误或准确预检，不改角色、选择或原字段换取成功。这个模型限制不能外推所有模型/合法 pause。
- **跨 owner/issuer opaque 资源与签名**：没有可信同一性不迁移；签名不伪造也不擅删。保留原容器/授权/挂载和恢复路径。
- **未知块/执行版本/不等价协议字段**：明确拒绝；本地 Bash/Skills/MCP、PDF文本提取、本地估算计数不是官方执行/资源/计数协议替代。

## F37 源码与证据交接索引

以下是37条目录的逐项归类，**不是本次重跑37项测试**。源码锚点以当前 `next/plugins/ccgateway/companions/engine/` 为基准；深度独立核查集中在 A–G 的 parser/admission/relay/history，各单项原成功以对应现有证据为准。

- **F-MODEL**：`request.go` 请求模型、`runner_config.go` CLI模型；已实现，账户模型/窗口资格独立验证。
- **F-LIMITS**：`cache_warmup.go:bridgeWarmupResponse` 与主预算；正数/0已有真验，不回到本地截断。0与format等合法性仍门禁。
- **F-STREAM**：`response.go`/`outbound_relay.go` 注册块和终态；已实现，资源/credit/helper提交前有界缓冲，未知块拒绝。
- **F-THINKING**：`thinking_output_plan.go:configureThinkingOutput`、`initial_thinking_stream.go`；签名/estimated_tokens已适配，后者不入历史/费用，跨账号签名资格独立。
- **F-OUTPUT**：`api_output_completion.go` 和 `feature_plan.go`；API format已实现，与旧 synthetic 多轮分开，不能把旧门禁写成原生format缺实现。
- **F-SAMPLING**：`feature_plan.go:ApplyMainRequestFeatures`；原数值仅主轮，模型互斥原错，不自动改值。
- **F-STOP**：同主轮计划及响应终态；已有真实 stop 控制记录，非客户端截断。
- **F-METADATA**：`ApplyMainRequestFeatures` 显式原对象替换，缺省保留 CLI；user_id不作授权。
- **F-FAST**：`request_policy.go`/speed计划；原speed与响应usage已适配，真实fast账号资格/计价仍需单独验收。
- **F-TASK-BUDGET**：`task_budget.go`/helper模块；普通与custom-inline公开闭环；D/E/F仍有组合门禁，remaining+压缩另核合同。
- **F-ROUTING**：主service_tier及全部模型inference_geo已适配；真实 `not_available` 持久事实已验，不从字符串宣称地区驻留。
- **F-SYSTEM**：`inline_system.go`/`inline_system_metadata.go`/`helper_history_positions.go`；原位/clear_at/per-turn beta已适配，payload2位置恢复已实现，未知组合明确拒。
- **F-MESSAGES**：`history.go`/continuation模块；普通公开历史已实现，复杂冷尾与绑定迁移见E。
- **F-CACHE**：`cache_plan.go:applyCachePlan`/`internal_cache_rounds.go`；原断点/自动缓存/helper恢复已实现，.77真实TTL证据闭环；prefix-hit不是provider命中。
- **F-DIAGNOSTICS**：`api_diagnostics.go`/`diagnostics_grant.go`；持久issuer亲和/冷授权已实现，真实返回诊断不等于命中，helper组合见D。
- **F-CONTEXT**：`context_compaction.go:parseContextCompaction`；原策略/null/applied_edits已有实现，实际长上下文效果未由fake证明；helper组合见D。
- **F-COMPACTION**：`configureContextCompaction/verifyCompactionHistory`；新旧签名/独立usage已实现，真实资格单列，fallback归属门禁有合同依据。
- **F-INLINE-TOOLS**：`inline_tools.go`/`inline_timeline.go`/`mcp_timeline.go`；client/server/pinnedMCP原时间线已实现；custom内部搜索已闭环；动态及更广执行身份组合见B/D/G。
- **F-TOOLS**：`tool_matching.go:verifyNativeWireTools`/Mod工具拦截；native/custom与已完成撤销历史已实现，两旧红修复已发布；客户端执行位置保留。
- **F-TOOL-CHOICE**：`forced_loaded_tool.go`/`validateInternalRounds`；eager/mixed named子集已真验，未发现forced等见C。
- **F-TOOL-SEARCH**：内部缓存/helper与API server search分立；pinned多MCP与动态单MCP已有实现，更广动态见B，不用内CC loop替API search。
- **F-TOOL-STREAM**：`mcp_input_stream.go`与SSE输入检查；细粒度/空delta片段已适配，具体上游分片由provider决定。
- **F-SAFEGUARDS**：`safeguards.go`；同身份client/纯MCP已适配，真实审查资格未成功验；扩展上下文见G。
- **F-CLIENT-TOOLSETS**：`client_tools.go`；12 typed/联合身份/browser_state及只读已完成历史已实现；内部搜索/safeguards组合门禁不等于12类全部缺实现。
- **F-MCP**：`mcp_connector.go`/timeline/secretguard；非defer、pinned、动态单已真验；其它凭据资格独立，B/D组合需开发。
- **F-WEB-TOOLS**：`web_tools.go`/`server_tools.go`/ledger；登记版本和公开搜索抓取已真验；现管理员工具计价范围必须准确说明。
- **F-ADVISOR**：`advisor_tool.go`及Core独立iterations；模型授权/独立计价已实现，真实模型配对资格待验。
- **F-CODE-EXEC**：`code_execution_admission.go:configureProviderExecution`及资源输出；已实现，现真provider too_many_requests证明错误保真，未证明执行产物成功。
- **F-PTC**：`ptc_ledger.go`/`checkProgrammaticParentContext`；父子caller/container/暂停/导入已实现，真成功应验外部子工具→原父执行恢复与产物。
- **F-IMAGES**：`image_carrier.go`/`image_transformations.go`；原base64/URL已实现并有真验，不代理下载重写；未遍历类型不是已知bug。
- **F-DOCUMENTS**：`request.go`文档检查/资源admission；PDF/text/content/file原来源已实现有真验，不文本提取替原PDF。
- **F-CITATIONS**：`citation_restore.go:restoreHistoryCitations`；源绑定原位恢复已实现，CLI空数组后继修复有真验，真实引用质量独立。
- **F-FILES**：`resource_http.go`/`resource_operation.go`和Core资源映射；CRUD/downloadable/生成输出ACL已实现，公网上传读删已验。
- **F-SKILLS**：资源技能版本/容器合同；stable/legacy/版本ACL已实现与真实PG隔离；真实builtin版本解析不等于完整执行产物成功。
- **F-FALLBACK**：`fallback_request.go`/credit模块；显式链、strict/best_effort及原wire托管已实现，真实信用发行退款待验；default/压缩限制见合同边界。
- **F-COUNT-TOKENS**：`token_count.go:parseTokenCountRequest/captureTokenCount`；真上游原输入、独立route已实现并公开200；不再沿用早期503缺路由判断。
- **F-OTHER-APIS**：Core converter + `protocol-codec/strict`；strict交集已实现，helper跨协议见F，有状态端点单独建设。

## O8 运行维度与交接验收

- **O-REGISTRY**：catalog .17唯一目录、BetaRules与实际parser门禁分立、runtime capability及payload协商已有实现。不要由 catalog 中列beta推断自动准入。补A严格策略。UI `WorkerCapabilities.vue:14/31/94` 仅显示 transport schema，未校验/展示 `runtime.go:31` 已有的 helper_history_payload_versions；低优先级展示项，不是后端协商缺失。
- **O-HISTORY**：native与response-only、本地prefix/branch、Core加密helper owner/issuer绑定已实现。生产跨账号资格未验与D/E组合需开发分别记录；永不将未知链当“无链”。
- **O-ATTACHMENTS**：client/gateway/both、cwd/platform、system及可信tool-result suffix已有路径和真CLI/生产Read证据；复杂尾部见E，CLI/OS升级另验，不能猜兼容。
- **O-ERRORS**：保留HTTP/SSE错误、refusal/工具错误200、header及失败用量；storage失败与provider成功区别记录。新增组合应验证多次累计usage去重与派发后禁重试，不重新拿旧 .78失败当当前阻断。
- **O-LOGGING**：bounded日志/结构化secret guard、关日志删除与业务ownership分立已实现。新增MCP/helper payload秘密字段必须扩联合检查；不要持久化credential或输出授权状态。
- **O-UI**：API/CC分区、feature/body/beta聚合及用量来源已实现，.78实际七布局闭环；补payload展示和新组合准确边界，不重复要求已完成视觉验收。
- **O-PROTOCOLS**：strict转换与request-private Plan已实现；F跨协议helper与独立端点仍开放。所有不等价项应由A严格拒绝，不能因为客户端是CC就吞原参数。
- **O-VALIDATION**：源码/隔离真实CLI/真实PG/ABC/真provider/部署逐层保存。交接阶段不新发模型；下一AI修一个合同切片后跑相应反例和门禁，精确Git发布再定向真验。原容器21/22、授权挂载、备份与回滚必须保留。

## 下一 AI 建议顺序与停止条件

1. 核实际policy并解决A静默丢字段/未知Beta，再补协商版本展示及目录事实同步；没有此项，不能宣称任意未知语义均明确拒绝。
2. 实施B多服务器动态MCP和C可证单轮forced目录扩展。把无法证明的forced分相保留为明确研究任务，不接受auto替代。
3. 按D资源/diagnostics→context编辑→执行目录身份→credit逐切片补合同；优先复用现有lease、ledger、timeline、canonical digest和receipt，必要时协商新payload。不是批量删guard。
4. 完成E合法pause复杂冷恢复与F跨协议链身份。取得真provider资格后完成尚未成功的单项验收；没有资格时准确记录原错误并保留已实现结论。
5. 独立状态端点与fallback默认/跨模型压缩按F及合同边界取得产品/供应商合同，缺必要事实继续拒绝，不把它们删出原目标来结题。

每次完成以“具体合同→原wire与历史保持→独立反例→真实CLI→需要时真实PG→获授权真provider→精确Git部署”作为证据链。无法证明时写出缺的具体事实和待取证手段，不用‘partial所以做不了’或‘测试绿所以完成’代替判断。

## 本次覆盖与未执行事项

工具库存看见CodeGraph/Serena只读工具，但本次没有取得当前项目binding与完整参数schema证明；已知文件的parser/admission/relay审计使用 client-native `rg` 和 PowerShell Get-Content，没有猜参数调用MCP。读取了当前catalog、核心helper wrapping、Worker helper/runtime/payload、动态MCP/timeline/search索引、forced目录、inline/safeguards、continuation bootstrap、resource/credit wire、strict转换等实际代码和相应后继证据。官方重查限于compaction usage、stop reasons、Opus5.5迁移和tool-search/MCP页面，未进行完整新SDK差异审计。

本次没有重跑Go/前端/CLI测试，未读生产配置、未访问数据库/账号/部署，未独立重新抓取线上wire；上线与真实验收依赖上述可定位的现有记录。F37索引是覆盖交接而非穷举全部组合的二次测试报告，未发现的缺陷不能写成不存在。只修改本审计文档，相关入口与历史归档由根代理整理。
