# Worker 功能实施方案（待实施）

日期：2026-10-08。目标项目：`D:/projects/golang/sup2api`。本文件是只读源码审计后的实施设计，不代表功能已经实现、部署或通过真实上游验证。此次仅新增方案文档；现有工作区 UI 修改不属于本方案实施。

## 1. 边界与证据

CodeGraph 项目绑定已确认；精确符号查询无结果后，使用本地文件读取和文本搜索核对实际源码。下文路径以仓库根目录为基准，行号对应本轮源码，后续修改可能移动。

核心插件负责账号、路由、策略保存与展示；API 到 CC 的交互转换继续留在 `next/plugins/ccgateway/companions/engine`。Worker、Mod、代理和控制器各自构建，不能为了增加 API 能力把引擎逻辑搬回核心。

证据分四层：源码存在、隔离假 CLI 映射、真实 CLI 对隔离上游、真实账号上游。新增能力必须分别记录，不能将前三层写成线上支持。

## 2. 当前请求入口与认证

- `next/plugins/ccgateway/internal/ccgateway/ccgateway.go:97`：插件从客户端选择 `anthropic-version`、`anthropic-beta`、`x-ccgateway-session-id`；生成内部用户/API Key 会话 scope。仅支持 `anthropic.messages`，不支持 token counting。
- `next/server/internal/ccgateway/client.go:132`：核心取得 Worker 地址后，注入保存的 `X-CCGateway-Request-Policy`，删除客户端 Authorization，使用账号 Worker 调用 Key。
- `companions/engine/request_policy.go:96`：Worker 解码策略与请求，转换能力字段，最后解析 messages。
- `companions/engine/runner_config.go:107`：生成 CLI 参数和每请求环境；继承的 beta、EXTRA_BODY、thinking、effort 等环境被清理。
- `companions/engine/outbound_relay.go:333`：当前 relay 只校验 native tools、恢复 system、修正 thinking.display；还不是通用 body 参数覆盖器。

实施时保留三层认证边界：平台客户端 Key 仅用于核心授权；Worker Key 仅用于核心到账号；CLI 到上游使用该账号自己的 API Key/OAuth。绝不能把客户端 Authorization、Cookie、代理凭据或自报内部策略传到 CLI 上游。CC 自己产生的 OAuth/客户端身份头必须继续保留，由目标 CLI 与账号决定，不能从客户端复制 OAuth beta 来冒充兼容。

`anthropic-version` 目前可到 Worker，但不能据此认定控制了 CC 最终上游版本；应在 RequestPlan 中记录 requested/effective API version，未知或不兼容版本明确拒绝。`anthropic-beta` 按能力注册表合并客户端功能需求与 CLI 必需 beta，去重并记录来源；不能用客户端头整体覆盖 CLI 头。会话 ID 必须继续结合服务器生成 scope，不能仅凭可伪造的客户端 ID 共用历史。

## 3. 能力注册表与 RequestPlan

新增伴随引擎内的单一能力注册表，核心读取其能力摘要用于 UI；避免当前核心、Worker 各维护一份固定 beta 名单。注册项至少包含：

- 稳定 feature ID；正式/旧 beta 别名；请求字段和内容块路径；响应/历史块要求。
- 支持的 API 版本、模型能力、账号认证方式、上游 provider、CLI 版本范围与探测结果。
- 映射位置：CLI 参数、环境变量、Mod、relay patch；冲突和依赖关系；不支持时的明确错误。
- 证据等级、测试版本、最后验证时间，以及是否改变会话前缀/工具名称/签名绑定。

RequestPlan 是每次请求的不可变执行计划：保留原始 JSON（`json.RawMessage`），解析已知语义字段，生成规范化参数、工具路由、system/附件决策、beta 合并结果、relay patch、响应解码器与历史兼容策略。原始数据用于保真和诊断，不等于任意透传许可；未知字段必须分类处理，不能把它们偷偷混入 CC 上游请求。

执行顺序：认证及大小校验 → 原始请求解析 → 模型/认证/CLI 能力解析 → 字段与 beta 联合验证 → RequestPlan → 历史选择 → CLI/Mod → 最终 wire 校验及覆盖 → 响应与 usage → 提交历史。拒绝应尽量发生在启动 CLI 前。

P0必须先证明请求归属：仅凭`/v1/messages`不能区分主模型、内部搜索/结构化轮次、子代理、权限分类器。将每请求Mod控制通道、CLI事件阶段、预期模型/消息摘要与可信进程内trace关联；CC gateway hint仅作佐证，不能信任外部客户端自报头。建立不同CLI版本的配对夹具，归属不确定时不得应用新body patch；明确失败或保持未经改写的内部请求，不能误把客户端sampling/system发给权限分类器。

默认策略：不理解且可能改变执行语义的字段拒绝；旧 ignore 配置迁移后仍能兼容，但日志必须写明忽略路径和原因。禁止把“HTTP 200”作为字段生效证据。

策略引入 `schema_version` 与明确 defaults；旧核心到新 Worker、新核心到旧 Worker都需要兼容判定。核心必须先获知 Worker 能力再发送新策略，不能静默忽略关键新字段。旧配置迁移保留语义并给出保存后的 effective 值；新能力不能通过发布自动打开。Worker 二进制原地更新与容器镜像默认值分别管理，不能自动替换 #21/#22 容器。

## 4. 非消息参数逐项实施

### 4.1 model、max_tokens、stream

现状：`request.go:284` 必须有 model 与正整数 max_tokens；`runner_config.go:117,153` 映射 `--model` 与 `CLAUDE_CODE_MAX_OUTPUT_TOKENS`；CLI 始终使用 stream-json，客户端 stream 控制出口。

计划：模型能力查表及实际 wire 验证，明确 CC 是否调整输出上限；max_tokens 是 API 单次响应预算，不能误作 SDK max_turns/max_budget。记录 requested/effective 值及内部额外轮次。保持流与非流内容、stop_reason、usage 等价；禁止为了不支持流而伪装逐 token 流。

### 4.2 thinking、effort、签名绑定

现状：`request.go:434` 支持 enabled/adaptive/disabled，enabled budget>=1024 且小于 max_tokens，display 仅 omitted/summarized。`runner_config.go:129,167` 使用 `--max-thinking-tokens`、`--thinking`、`--thinking-display`、`MAX_THINKING_TOKENS`；缺省 thinking 目前也强制 disabled。effort 只接受 low/medium/high/xhigh/max，映射 `--effort`。

计划：区分“未指定”与“显式禁用”，按兼容政策决定缺省，而非意外继承宿主环境。thinking/effort/采样/tool_choice联合验证，模型不支持时明确报错。保留签名和 redacted_thinking；历史导入、续聊、工具结果及 SSE signature_delta均需覆盖。

对 [官方 thinking 文档](https://platform.claude.com/docs/en/build-with-claude/thinking) 所述 `thinking-binding-controls-2026-08-01`、`thinking.block_binding.prefix_mismatch_behavior`（error/drop_block）与 `input_transformations`，必须独立建能力项。客户端 system、tools、工具名映射或 JSONL 重建改变前缀，可能破坏模型/前缀绑定。不得通过静默删除 thinking/signature 假装兼容，也不能由未知字段过滤吞掉绑定控制请求。执行计划应保存前缀转换摘要，检测与证明兼容；无法保真时提前返回明确不支持。drop_block只能遵循客户端明确请求与上游定义，记录真实 transformation，不能擅自模拟为普通成功。当前实现未支持这些字段。

### 4.3 output_config、结构化输出

现状：`request_policy.go:190` 支持 effort 与 format，兼容旧 output_format；format只允许 json_schema，schema<=64KiB；`runner_config.go:140` 使用 `--json-schema`。`structured.go` 验证最终内容并缓冲；`history.go:397` 结构化输出会删除 native path，下一次从客户端历史重建。

计划：保留现有 schema 校验；核对 CLI 原生 structured output 与 API output_config 的实际 wire/stop_reason/usage差异。strict tools 是独立字段，不等于 JSON 输出。需要补 error、refusal、截断和多轮工具组合；不能让“schema验证失败”覆盖上游正常refusal。减少历史重建必须先证明 synthetic tool transcript与客户端文本语义一致。

### 4.4 temperature、top_p、top_k、stop_sequences

现状：所有这些顶层字段被 `request_policy.go:151` reject或ignore；无有效映射。

计划：先按模型验证支持及互斥，再在最终主模型请求的 relay 白名单覆盖，确保 CC 默认值不覆盖客户端值。不把字段注入 token count、权限分类器或其它内部请求。thinking模式下的采样约束遵循上游；冲突拒绝，不能悄悄更改值。stop_sequences要保留 stop_sequence值及stop_reason，包含流式跨chunk命中、工具调用中断与续聊验证。CLI 若自行回退重试并改变参数，需记录每次wire差异。

`CLAUDE_CODE_EXTRA_BODY` 可用于隔离实验，但不应成为生产任意 JSON 透传入口：其合并深度、优先级、内部请求影响及不同CLI版本行为必须先验证。生产优先用明确范围的 typed relay patch，并保护 model/messages/system/tools/auth等已由计划管理的字段。

### 4.5 metadata、service_tier、speed

现状：metadata/service_tier拒绝或忽略；speed在AllowFast开启时接受fast/standard并映射settings.fastMode，关闭时静默删除，缺省fast=false。`request_policy.go:166`。

计划：metadata合法字段与CC内部metadata合并策略明确，不能覆盖CC内部身份或会话数据；是否可原样透传须按API规范、身份边界验证。service_tier与speed分别建能力项，不能等同；成本或账号限制不满足时明确错误。AllowFast关闭时收到fast应告知拒绝或由显式降级策略处理，不能无记录成功。记录响应实际tier/speed及费用字段。

### 4.6 cache_control与context_management

现状：`request.go:102,146` 将缓存控制取最大TTL并删除message block断点；`request_policy.go:137` 映射统一CLI cache TTL。不能声称保留原始cache breakpoint与混合TTL语义。context_management不支持。CLI当前显式禁用auto compact。

计划：分离本地native历史保留、上游缓存TTL、逐块断点三个概念。保留原始cache_control位置，在system/tool重写后建立可验证映射；客户端断点不能盲目施加到CC新增块。context_management各策略、clear_thinking、tool result清理、compaction需分别适配请求、返回usage/块与历史恢复，不能用CLI自动压缩替代API策略。改变上下文必须生成兼容记录，并参与签名前缀判定。

## 5. Tools完整路径

### 5.1 原生客户端工具与MCP名称

现状：`tool_matching.go:37` 仅CLI 2.1.288按名称+完整schema匹配内置工具，description不参与匹配，通过tool.describe覆盖；运行时 `verifyNativeWireTools` 再核对真实定义。匹配不是授予容器执行权限，Mod与权限回调截获客户端调用。

`tool_names.go` 保留客户端已有 `mcp__server__tool` 的server/name拆分；非MCP工具用配置的默认ccgateway server映射。响应恢复客户端名称。`sdk_mcp.go` 负责SDK MCP注册；`mod/hooks/register.js` 负责描述和调用拦截。

新增client toolsets必须以`(toolset_name,name)`作为联合身份，调用/结果都保留toolset_name，不能只沿用普通工具name表。browser/computer同名screenshot与自定义工具并存是必测冲突；工具定义、命名空间和历史映射一起升级。

计划：native catalog按CLI版本发布并可探测；同名schema不同必须明确走客户端MCP，不能猜原生。保留schema原始语义、描述、strict、defer_loading、input_examples等；不支持的元字段不可吞掉。已有MCP名不得双前缀；非MCP可配置模拟前缀，所有冲突在启动前拒绝。tool_use.id/名称和tool_result一一对应，原生与MCP都只交回客户端执行。覆盖native↔custom切换、混合工具、并行、多result、出错和断连；确认容器内工具无意外执行。

### 5.2 tool_choice与工具搜索

现状：`request.go:417` 只支持auto/none；any、指定tool和disable_parallel_tool_use拒绝。tools本身只允许name/description/input_schema/cache_control/defer_loading，所有type/strict/allowed_callers等拒绝（:383）。

CC内部ToolSearch通过ENABLE_TOOL_SEARCH与Mod最多3轮搜索，内部搜索对客户端隐藏并累计usage；启用后输出缓冲。`runner_config.go:11–63,99`、`tool_search.go`。它不是官方API regex/bm25 search协议兼容。

计划：tool_choice强制语义先在真实wire确认；不能靠system提示词“请调用”实现。使用统一父feature ID `F-TOOL-SEARCH`，分别评估`cc_internal`和`api_server`子能力。后者必须一起支持type、tool_reference、server_tool_use/search result、SSE、历史回传及计费。请求了官方搜索工具而不兼容时明确拒绝，不能自动替换成效果相似的CLI ToolSearch。

### 5.3 服务端工具与API-only能力

web_search、web_fetch、code_execution、computer、MCP connector、container/文件引用等，不能因CLI有同名内置工具就认定API语义等价。当前请求/响应块白名单均不支持这些完整协议（`request.go:159`、`response.go:93`）。

实施需要逐特性验证：账号权限与计费、网络/执行主体、provider支持、请求定义、server_tool块、结果块、pause_turn与继续、usage、引用/文件生命周期、恢复/回退。不能保证经OAuth CC可用的API-only功能；不支持的能力先明确拒绝。若未来选择直接API路由，必须作为不同执行后端显式配置，不能把CC账号暗中改成直连API，也不能借客户端工具执行权限模拟服务器工具。

## 6. System、附件与环境

保留 `inline_system.go`、`system_restore.go`、`system_validation.go` 的角色/位置校验与完整恢复；ordinary system不可被附件策略误删。附件必须按实际结构识别，未知项按配置pass/ignore并记录；不能通过任意关键词将用户指令视为环境附件。

`attachment_policy.go` 与 `environment_policy.go` 管理来源和字段，Mod控制CC侧附件。workingDirectory和platform可独立选择来源，但只改变模型看到的信息，不能据此改变容器实际cwd。Windows/Linux环境需要分别确认格式与缺失字段fallback，macOS未验证。实际进程cwd仍是安全的Worker workspace；不能对Windows客户端路径在Linux直接执行chdir，也不能仅以“工具已拦截”推断所有内部模块都不访问文件。

新增能力不能增加重复system块：覆盖新会话、prefix-hit、导入长历史、回退、分支、中途system变化、tool_result边界、客户端权限分类器；比较最终wire而非只看Mod ACK。环境改写也属于thinking前缀绑定风险，须进入兼容判定。

## 7. JSONL恢复、回退、分支与兼容键

`history.go:276` 准备历史，:318按客户端fingerprint查最长assistant前缀；:340仅在文件摘要一致、无并发写者、直接续聊时复用同一SessionID，否则fork；:396成功后提交快照。工具/附件namespace见 `tool_names.go:20`。

计划：每项新增字段标明是否影响前缀、工具wire身份、模型签名、执行行为。不能简单把全部参数塞进一个hash强迫所有续聊重建，也不能因messages相同就跨不兼容计划复用。兼容策略输出 reuse/fork/rebuild/reject及原因；保存schema版本、CLI版本、native目录与wire工具映射。checkpoint只在完整终止且内容验证通过后提交，取消/异常不能伪装完成。

保留原始客户端历史与CC派生JSONL之间的显式映射；工具名、system、server tool及thinking签名必须可追踪。prefix-hit仅代表本地缓存命中，不证明上游缓存计费节省。

### 已定位的旧测试问题

真实CLI 2.1.292运行 `TestRealCLI` 到 `gateway_test.go:726` 失败：normal continuation changed native session。该断言也会在before/after快照为nil时触发。

`lookup`（约699–704）调用只做parseRequest的parsed，并以空字符串作为cache namespace；实际HTTP应用attachment policy，`toolHistoryNamespace()`返回attachment-policy-v2摘要，commit以此写入，造成查错key的强证据。前面的prefix-hit及新system/tools wire断言已通过，不能将此失败直接解释成CC真换会话。

实施先修测试夹具：用与HTTP相同policy解析及namespace，分别诊断nil与SessionID不一致；再复跑。此处仅方案，未改测试、未重复运行。该断言后的重启/分支/beta等本轮场景未执行，不能记为通过。

## 8. SSE、正常refusal、错误与usage

现有 `response.go` 验证text/thinking/redacted_thinking/tool_use及citations_delta；`structured.go`、`tool_search.go` 管理内部轮次和usage；`outbound_relay.go` 捕获真实上游错误。

计划：按注册能力扩展返回块与delta，而非无条件接受未知执行块。保留未知但无执行语义的扩展字段RawJSON；无法保真时明确错误且保留诊断证据。HTTP 200 + refusal是正常模型结果，不能改成502、触发账号熔断或自动重试。HTTP状态、SSE error、协议错误、CLI异常、用户取消分别分类；SSE已开始后不能假装改HTTP状态。保留原始上游status/type/message/request ID，避免以native transcript missing completed response覆盖真正原因。

usage按实际上游调用累计，包括隐藏ToolSearch/结构化输出轮次，避免累计快照重复计数。标准输入/输出、缓存读写、server_tool usage、tier字段逐项保留；缺失不能补零当作已知。未完整响应但已产生usage的请求需记录费用与失败阶段，客户端取消不能把已发生费用抹去。

## 9. 取消、并发隔离与可观测性

现有入口 `main.go:85` 使用Slots；runner基于请求context，Mod与relay按请求隔离；history active SessionID保护单写者。增加能力后要验证排队取消、流断连、内部工具等待、超时、子进程/管道退出与回调清理。任何共享可变plan/env/schema缓存必须版本化且无请求间泄漏。

日志继续只落对应Worker容器，由账号开关管理，插件提供状态和入口，不复制保存完整payload。`request_log.go:66` 保存单请求文件，:86单请求64MiB溢出删除整条，:131保留24h/512MiB软总量；这些边界必须在UI和元数据里清楚表达，不能宣称无上限完整保留。

日志补齐request ID关联的：原始请求与脱敏头、策略版本、能力解析、每字段决策、CLI版本/参数/安全环境、工具映射、Mod事件和ACK、历史命中/重建/回退/fork原因、派生JSONL摘要、每轮真实wire请求/响应、客户端JSON/SSE、usage、结束/取消/溢出原因。禁止保存原始Key/OAuth/Cookie/Mod token；完整业务内容需受账号日志开关控制。即使payload因上限删除，仍应留下不含payload的溢出索引，方便解释“为何找不到日志”。

## 10. 实施优先级与验收

P0：修复过时测试fixture；能力registry/RequestPlan/配置版本；明确拒绝和字段决策日志；保护thinking签名绑定及认证边界；普通200 refusal语义回归。

P1：验证并实现采样/stop_sequences/metadata/tier、thinking缺省区分、tool_choice；CLI多版本native catalog；客户端工具名称、system与history全链回归。每项通过实际wire验证才能标记支持。

P2：官方ToolSearch协议、strict及其它工具定义元字段、cache breakpoint保真；完整SSE/history/usage组合。

P3：按权限/provider可行性逐个实现API服务端工具、MCP connector、context_management/compaction及container；不能以扩大beta名单代替实现。

每项至少覆盖：字段合法/非法和冲突、JSON/SSE等价、真实CLI隔离wire、客户端工具回合、全新导入历史/续聊/回退/分支、system变化、取消并发、日志开关与容量、老配置/老Worker兼容、#21 API Key与#22 OAuth真实上游的适用场景。线上验证前另行审查具体变更及发布范围；部署必须Git提交/推送、服务器检出明确commit构建，并保留原容器和授权。

跨文档批次以[验收计划](04-VALIDATION-AND-ROLLOUT.md)为准：P0先建立签名保真/明确拒绝，不等于完整实现所有绑定字段；P2再开放新增绑定控制和组合历史能力。

本轮既有7项聚焦Go单测通过：RequestPolicyAdmission、RunnerRequestPolicyMapping、RequestPolicyFields、RequestPolicyHistoryIsolation、RequestPolicyInvalidConfiguration、StructuredOutputAndCachePolicy、FixedBetaWhitelistOverridesLegacyRules。Runner映射测试是假CLI，不是官方模型能力证明。

## 11. 其它协议可复用范围

核心 `next/server/internal/gateway/convert/convert.go` 已有Converter(Request/Response/NewStream)、StreamConverter(Event/Flush)及Registry，但:89 builtins为空，目前没有内置Chat Completions/Responses→Anthropic转换器。可复用routing.go:128的转换路由、dispatch.go:317请求转换、forward.go:209/240的JSON/SSE响应转换管线。

不能把该框架存在写成已经支持OpenAI协议；若实施，需要单独制定各协议角色、工具、reasoning、状态/续接、usage和流事件的能力矩阵。CCGateway插件当前明确只接Messages，扩展协议应通过核心转换器，不把多协议业务全部糅进Worker。

## 12. 条件能力的具体实现门槛

以下为[功能目录](01-FEATURE-CATALOG.md)剩余条目的候选路径，不是默认承诺可用；每条先通过wire/CLI/模型三层实验再进入实现。

- **task budget**：SDK/CLI `--task-budget`候选映射total；remaining需计划与relay显式处理，不能每请求机械减。官方total>=20000且专题说明CC/Cowork surface不支持，与SDK/CLI存在参数路径须分别看待；OAuth可用性未证明。新字段不进入旧output_config过滤器后被静默丢弃。
- **max_tokens=0**：单独证明CLI能只产生官方预热请求而不生成、不重试续写、不提交虚假assistant历史；做不到则明确拒绝该特性，不以max_tokens=1模拟。
- **文档/图像/引用**：先无损接收RawJSON和来源类型，再验证CLI能保留该块；需要恢复时在已关联的主请求对应位置恢复。PDF不降成纯文本假称等价；tool_result中的document/search_result与citations位置共同测试。file_id走账号资源归属服务，不当作本地路径。
- **会话中system/inline tools**：Message结构保留clear_at/output_config及tool_addition/removal，按历史游标重放，不将其提前合并成最终system/tools。SDK控制帧用于更新当前工具视图只是一部分，仍须证明上游前缀与签名未变。
- **context/compaction**：在当前计划中的主调用上应用API原生字段，保留applied_edits/compaction块和索引，独立处理仅压缩的请求类型、失败空内容及互斥。若CLI不能接受终止原因/返回块，先完成响应通道实验，不能把CLI缺result改成成功。
- **API server tools**：优先候选是在CC实际主请求保留上游工具type和参数，通过真实上游执行；CLI必须能够消费服务端中间块。Worker捕获原始JSON/SSE、ID、usage和状态，并与CLI结果对齐。若某CLI对该类型致命失败，通用透传不成立，需升级受支持CLI或保持条件不支持；不得由relay绕过CC独立发起一套推理冒充CC网关。
- **状态型工具/MCP/container/skills**：主请求适配以外，需要`资源ID→平台scope/上游账号/过期时间`记录、调度亲和性、资源操作协议及失效错误。MCP若转成CC本地连接，明确执行位置差异并独立验证客户端协议，不直接注入任意mcp配置。PTC caller、client toolset身份和各tool result codec按F目录分别实现。
- **fallback/credit**：保留服务端模型边界、usage.iterations和实际模型；credit绑定原账号/组织/workspace/请求体和时限，先检验核心重试选账号是否满足。不同组织不可自动兑付。CC fallbackModel不是官方server-side fallback，refusal不能被隐藏。
- **diagnostics**：维护客户端返回message_id与实际上游message_id的映射（内部多轮为1:N）；无法唯一匹配就明确不支持诊断请求。透传诊断结果和未知附加字段，但不把内部历史命中率当官方cache diagnostics。
- **inference_geo/service_tier/workspace/profile**：按账号可选约束过滤路由并在真实wire确认；客户端无权切换不属于账号的上游租户。没有满足条件的账号给出特性不满足原因，不静默使用默认地域/等级。

响应/历史能力必须先于开放输入。保存客户端原始返回块只能保证存储，不证明下次CLI能重放；必须以完整的第二轮、长历史、回退和跨账号条件测试作为开放门槛。详细资源服务边界和其他协议见[协议范围](05-PROTOCOL-SCOPE.md)。
