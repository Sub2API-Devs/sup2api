> 历史快照归档：2026-10-09 交接整理前保存。正文包含不同日期的候选、失败和已过时状态，不代表当前实现或线上版本。当前状态以 [接手文档](../../../HANDOFF-2026-10-09.md) 和 [当前进度](../../PROGRESS.md) 为准。归档只调整相对链接，保留原有结论和证据。

# Feature closure audit：第二批之后的剩余闭环

审查时间：2026-10-08。目标：D:/projects/golang/sup2api。只读核对当前源码、测试与官方资料；本文不代表部署、真实上游资格或生产推理已通过。本文将继续实施事项与当前必须拒绝的边界分开；“未实现”不等于“无法实现”。

## 范围校准与证据基线

实际 contracts/features/catalog.go 有 37 个 ID：36 个 scope=api 的 F 项，另加 scope=cc 的 F-SAFEGUARDS。O-REGISTRY/HISTORY/ATTACHMENTS/ERRORS/LOGGING/UI/PROTOCOLS/VALIDATION 是八个横向目标，不是额外 API 功能。不得据 partial 数量统计完成率。

第二批已具备主请求归属、普通非消息参数计划、响应扩展、精确历史恢复、文档/图片 URL、引用、缓存、API ToolSearch/Web/Advisor、typed 客户端工具、inline client tools、thinking/output/context/compaction、count_tokens、fast 与 diagnostics。这里不再把已完成字段写成缺失。

证据层次：源码和单测；真实 CLI 2.1.292 对隔离假上游；真实账号/官方资源操作。第二层证明传输与本地行为，不能替代第三层。资源探针 TestRealCLIResourceSurfaceTransportProbe 仅四组字段×API Key/假 OAuth 共八场景，证明 EXTRA_BODY 的字段传输，不证明 Files/Skills/容器/MCP 的输出块、历史、资源授权或费用。第三批生产实现仍必须经归属明确的主请求计划，不能把 EXTRA_BODY 作为实现捷径。

## 立即可补的纯协议闭环

1. **F-CITATIONS：客户端 search_result 输入和工具结果。** 当前 checkBlock 无 search_result，parseToolResultBlocks 也不接受；已有 search_result_location 引用 codec 不能替代来源输入支持。官方 [Search results](https://platform.claude.com/docs/en/build-with-claude/search-results) 明确用户消息和工具结果两条路径、text-only content、统一 citations.enabled，不需 beta。最小方案：新 search_result codec，纳入精确来源语料收集、缓存遍历、历史 skeleton；引用仅在完整来源序列一致时恢复。测试同文不同source/title/索引、嵌套工具结果、缓存、回退/冷导入、JSON/SSE；不得把搜索结果改写成 document。
2. **F-IMAGES：transformations。** 官方 [ImageBlockParam](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/image_block_param.py) 和 [ImageTransformationsParam](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/image_transformations_param.py) 已有可空 transformations，oversized_image=downsize/error。当前 image 校验不准入。最小方案：逐字段保留，不本地缩图、不改默认；image 的 URL/base64/工具结果/文档内容路径一起验证，确认 CLI 原生 JSONL 是否保留；若省略，只能按来源与原位置精确恢复。upstream 400 按原状态返回。
3. **O-ERRORS/F-STREAM：响应 HTTP 头。** 当前 upstreamError 仅 Status/ContentType/Body；外部 passUpstream 重写响应，不回传 Retry-After、request-id 与限额头。底层 relay proxy 的 header 测试不是外部 Worker HTTP 全链证明。最小方案：仅已归属主响应捕获允许的响应头，错误返回前应用；成功 JSON/SSE 也应另核对 request-id/限额事实。剔除 hop-by-hop、cookie、认证头；多个内层请求不能混入辅助请求的 ID。SSE 已发 header 后错误只能走原流事件，不能伪造第二 HTTP 状态。补真实 CLI 429/529/400 原头/原body、辅助隔离、已有流错误测试。
4. **F-INLINE-TOOLS/F-COMPACTION：尚未闭合的工具时间线。** 目前 inline server tool 明确拒绝；非空 compaction.tool_changes 历史也拒绝。可实施，但必须同时将原始及压缩后的工具变更解释为同一目录时间线、恢复签名块原文，并让 core 授权其中的模型引用。不得先放行 advisor 嵌套定义后再补授权。
5. **F-MESSAGES：无定义历史身份与 Sonnet assistant-tail。** typed 固定工具名移除定义后无法从名字独立证明旧路由，目前明确拒绝；toolset_name 已有显式身份可恢复。普通工具跨名称/schema版本变化需要统一身份账本，不能猜 native/MCP。Sonnet 自动安全附件导致的 assistant-tail 不可等价问题要继续按真实 CLI wire 探针解决，不能把 Opus 的成功推广到所有模型。
6. **F-SAFEGUARDS 与工具组合。** 目前同名/schema保真路径已做；映射工具、typed/server、inline、内部循环组合仍拒绝。可继续拓展完整的身份映射与review context，但没有官方语义依据时不能改写 verdict 或关闭审查。需真实 classifier verdict 与客户端实际执行回合，不能只 fake envelope。

## F-FALLBACK：从已有账务基础继续完成，而非重新判不可行

当前 Worker 请求仍拒绝 fallbacks/credit，响应与历史 fallback 已实现。core 新增 ModelReferences、模型价格快照与 usage.iterations 结算，实际 manifest 当前只声明顶层 tools[].type=advisor_20260301 的 model。因此此前“core 全无多模型能力”已过时，但不能据 Advisor 完成就宣称 fallback 已授权。

官方 [Refusals and fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback)、[BetaFallbackParam](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/beta/beta_fallback_param.py)：显式链中每项有 model，可选 max_tokens/thinking/output_config/speed；default 是服务端动态推荐路由。所需 beta 为 server-side-fallback-2026-07-01。

最小实施顺序：

- 首先开放显式模型链：core 每个候选经过用户组权限、账号可用模型、价格/余额预留和插件patch后二次校验；不能只检查第一个model。复用当前参考模型框架并扩展数组形态，不为未授权候选提供隐式通路。
- 校验每次覆盖参数但原样送给官方；模型替换是 provider 行为，Worker 不自行重发。对未计划/重复/缺失 iteration 模型必须明确账务错误，不能一律按主模型收费。最终响应 model 与每次 usage 项分别记录。
- JSON 必须走真实 stream:false 上游语义，再桥接 CLI 生命周期。当前普通API内部仍是SSE；把SSE所有前段内容累积为JSON会保留官方非流式 fallback 本应丢弃的内容，不能以“都输出JSON”混为等价。可复用 max_tokens:0/count 的真实JSON捕获结构，但它们的结束/计费条件不能直接照搬。
- default 无固定候选，不能用静态猜测列表伪装完整授权。初期明确拒绝，或建立可审计的 provider 推荐目录及管理员允许集合，并在无法预先保证授权/定价时拒绝；不把参数偷偷展开成另一种请求。
- 补拒绝前/中途fallback、两次fallback、server/client混合未完成调用、schema输出、SSE/JSON差异、每attempt价格与缓存费用、未知模型、cancel/timeout后结算测试。

### Credit 独立资源合同

官方 [Fallback credit](https://platform.claude.com/docs/en/build-with-claude/fallback-credit) 要求发行身份/平台和时间窗口一致、提示相关字段及beta匹配；不能把相同外层客户端JSON当相同最终上游提示。

最小方案：核心存 opaque credit 与用户/Key scope、原账号/授权generation、发行时间、实际请求指纹及 beta 集合关联；加密存储需回传的敏感token，日志仅摘要。资源亲和进入账号调度约束，不允许原账号不可用就换另一个。Worker 最终消息包含动态环境/CC工具提示，兑换应复用首次被provider接受的完整prompt相关wire字段，允许官方规定可变字段；不能单纯重跑CLI希望得到同样提示。最初可只实现完全相同body的显式兑换，continuation claim另做逐块证明；未证明时拒绝而不丢thinking。provider临时兑换失败不自动去token重发，尤其server工具会重复执行/计费。

现有 diagnostics ownership 只是可复用的tenant/generation思路；它的一小时message ID索引不包含credit原wire、五分钟约束、兑换状态，不能当credit已完成。

## F-FILES：需要做的资源服务

官方 [Files API](https://platform.claude.com/docs/en/build-with-claude/files) 当前示例已为标准端点；不要继续强制历史beta。文件上游隔离范围是workspace，不是最终用户；上传文件与代码/技能产生的可下载文件规则也不同。当前manifest只有messages/count、Worker只JSON入口、source.file_id/container_upload未开放。

最小方案：

- 在核心资源服务持久化虚拟file ID、租户/调用者ACL、origin账号/上游workspace/generation、真实ID、MIME/size、downloadable/expiry。鉴权从已认证Meta，不能由用户提供上游ID建立归属。
- 独立 multipart 上传及二进制下载通道；元数据/list/delete只暴露用户自有资源，不能把共享workspace列表原样交给客户端。分页/批量ID查询要在本地ACL下重建，不泄露其他用户存在性。
- document/image source.file 与 container_upload只通过资源映射解析；原账号不可用返回可解释的亲和错误。文件复制到另一账号必须显式操作、重新上传、产生新映射；不假装旧ID跨账号可用。
- 上传/生成产物下载的额度、超限、过期、删除race、OAuth是否有Files scope、后台清理和重启持久化须测试。未经真实scope确认，API Key和CC OAuth分别标能力，不用假OAuth探针推断可访问。

Files本身可实施；用Worker本地文件路径替代provider file_id则不等价，必须拒绝这种替代。

## F-CODE-EXEC 与 F-PTC：先容器/产物，再完整执行链

官方 [Code execution](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool) 当前三个版本20250825/20260120/20260521均无需beta；新Web动态过滤可涉及代码执行，现direct-only Web并非其完整替代。官方 [PTC](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling) 说明allowed_callers可使用20260120/20260521，而响应caller稳定标20260120；不得要求请求/响应版本字符串一律相等。

最小方案：共享资源服务增加container虚拟ID、issuer账号亲和、生命周期/有效期/并发占用；提供原样 server_tool_use、code/bash/text-editor执行结果及错误、产物file_id注册、container响应metadata，按官方union逐项枚举，未知执行块不泛放行。CLI若吞执行块，复用已归属原SSE观察+完整历史位置恢复，但必须实测每种块及pause/return_code，不把命令失败等同API故障。

PTC在其上增加caller.tool_id→上游code execution invocation→外部client tool_use/result关联账本，维护跨HTTP请求的pending执行。外部客户端执行custom工具，不能在Worker执行本机Bash替代官方容器。工具名映射要同时覆盖定义、引用和caller链，绝不替换代码字符串内任意同名文本。先支持身份不改名工具可作受控子集；改名路线需实证provider解释一致。

账务必须记录官方执行用量/容器时长或执行单元并按管理员规则结算。当前仅token+搜索/抓取/Advisor facts不足；有些Web版本组合改变代码执行费用，不能按工具声明次数估算。最小可交付也应包括产物归属和下载，不能声称“先支持文本输出”却让合法生成文件无法取回而不披露。

## F-SKILLS：基于资源闭环分两层实现

官方 [Skills quickstart](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/quickstart) 当前使用标准skills API与container.skills，内置pptx/xlsx/docx/pdf。旧文档的统一beta要求不应直接继承。

先支持官方内置技能目录、固定version或明确latest、代码执行与生成文件完整链；保留container请求和响应实际状态。再做custom skill上传/版本/删除/引用，归属核心资源服务而非CC本地.skills目录。latest运行时版本与审计记录应关联，账号切换不能把另一个workspace同名skill当原skill。未建立workspace资源能力前继续拒绝；将API技能转换成本地Skill工具调用不等价。

## F-MCP connector：可独立优先推进，不必等待完整Files

现有客户端mcp__名称路由已完成，不代表API connector。官方 [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector) 有2025-11-20协议；2026-09-15协议增加mcp_tool_listing及显式固定目录，后者包含前者语义。旧2025-04-04为弃用版本，不能无声升级请求。

最小方案：主plan原样传mcp_servers和mcp_toolset，provider执行远程连接，不再由Worker注册为本地SDK MCP。server_name、toolset引用与tool_use_id绑定，支持mcp_tool_use/mcp_tool_result以及新listing历史和工具固定配置，缓存及inline MCP变更单独做。请求URL必须符合平台的明确网络准入策略；不会在Worker预取URL或解析私网资源。authorization_token仅用于指定远程MCP服务器，不能混入Claude授权、日志、普通会话JSONL。先完成结构化脱敏与分离的短期secret通道，再开放debug全请求日志。

这条路径没有必然的provider文件亲和依赖，可作为比Files更早的完整子项目；仍需CLI结果/历史探针，以及受控无副作用MCP服务器真实调用测试。带远程写操作的工具不得为验证而随意执行。缺少连接凭据/版本/结果codec时必须明确拒绝，不能转成客户端工具冒充等价。

## 36 API 项与 CC 安全项的剩余验收清单

- F-MODEL/F-LIMITS/F-STREAM：模型alias/上下文窗口真实账号验证；max0跨平台；长流取消、稀疏索引、新块与上述JSON fallback差异。
- F-SYSTEM/F-MESSAGES：system角色/位置/clear_at/effort组合已有隔离证据；继续Linux CLI与旧CLI兼容门禁、Sonnet额外附件、跨身份/工具定义变化。
- F-THINKING/F-OUTPUT/F-SAMPLING/F-STOP/F-METADATA：不再列成未实现；需真实模型正/负参数组合、signed thinking跨请求/账号、拒绝与截断、辅助归属。客户端metadata不作为账号授权。
- F-CACHE/F-DIAGNOSTICS：显式缓存与内部CC工具多轮组合未实现；跨账号diagnostics比较需要核心共享归属和调度亲和；刷新token与真正换issuer须区分。真实缓存命中/账单尚不能从prefix-hit证明。
- F-TOOLS/F-TOOL-CHOICE/F-TOOL-SEARCH/F-TOOL-STREAM：typed搜索最新8次隔离回归已补；仍需真实provider查找/引用、forced与thinking/工具集限制、映射跨历史、参数流取消。不是新增beta即可完成。
- F-CITATIONS/F-IMAGES/F-DOCUMENTS：补search_result、transformations；file_id归F-FILES。真实PDF页数/图片尺寸/URL读取由provider验证；不要本地转换破坏引用偏移。
- F-FILES/F-SKILLS/F-CODE-EXEC/F-PTC/F-MCP：按上述可实施资源/协议路线交付；现阶段拒绝不是最终不做。
- F-WEB-TOOLS/F-ADVISOR/F-CLIENT-TOOLSETS：direct Web、Advisor、12 typed当前隔离证据保留；PTC Web/动态过滤、真实模型能力/费用与二级模型拒绝路由要单独验收。
- F-CONTEXT/F-COMPACTION/F-INLINE-TOOLS：补压缩tool_changes、server时间线与核心引用模型授权；当前显式拒绝必须保留到完整路径落实。
- F-FAST/F-TASK-BUDGET/F-FALLBACK/F-ROUTING：fast实际usage和定价、advisory task budget余量、多模型fallback、regional辅助调用与非Anthropic transport；均不能据字段传输断言模型遵从。
- F-COUNT-TOKENS：当前是原始API输入计数，不含Worker/CC开销；资源/新块开放时同步原始计数准入及账户scope，不允许生成替代计数。
- F-OTHER-APIS：OpenAI普通文本/工具纯协议转换可复用旧codec落到next Registry；Responses持久ID/background、Batches异步任务、Files/Skills资源管理另建产品状态。不能为这些独立产品返回假的成功。
- F-SAFEGUARDS：见上文身份与组合限制，保留真实review，不把关闭分类器列为兼容修复。

## 八个横向目标

- O-REGISTRY：catalog从源码生成并对齐Worker实际版本；37总条目计数口径明确。每次新增块和beta补准入/拒绝测试；清理历史文档“未实现”描述时保留原证据日期。
- O-HISTORY：新feature矩阵至少新/续聊/prefix/回退/冷导入/SSE；来源、call ID、toolset、模型边界、签名都应参与合适指纹，采样参数不盲目全hash。
- O-ATTACHMENTS：所有保真测试至少覆盖当前配置组合中的客户端来源和字段级environment覆盖；普通system不当环境附件删掉。真实Windows/Linux形态可观测，但不能猜macOS完全相同。
- O-ERRORS：补外部HTTP响应头；维持200 refusal为正常语义；执行工具的非零返回与API错误分开；资源未知/越权/expired错误不泄露共享账号存在性。
- O-LOGGING：原请求、生效计划、归属、恢复决策与上游响应可关联；资源/MCP token必须结构化脱敏。请求日志与ownership/lifecycle状态分离，关闭日志不等于删除产品状态。
- O-UI：展示确切准入子集、CLI/Worker兼容与真实账号验证状态；unsupported说明应是尚需实现合同，而非暗示产品天然无法支持。失败原因能定位字段/组合。
- O-PROTOCOLS：下一批按纯codec→注册→JSON/SSE→真实CLI闭环接入；旧converter默认thinking/effort不能静默覆盖当前API计划。
- O-VALIDATION：Windows假上游通过后必须Linux隔离/race/数据库账务；再对21/22按批准范围做真实推理。镜像构建和原地补丁证据、账号状态保留分别记录；不把healthz/版本号当功能完成。

## Header / body 对照补缺

当前插件只转anthropic-version、anthropic-beta、x-ccgateway-session-id，并由可信host另注入scope；客户端Authorization只用于本平台鉴权，不转给上游，这是正确边界。SDK的betas/workspace_id/user_profile_id可能对应头而不是Messages body字段；不能把SDK属性一律加入body允许列表。workspace选择/用户profile需要平台ACL与账号workspace匹配，当前未做，先明确范围，不随意透传。

普通Messages顶层主计划已覆盖model/max_tokens/stream/system/messages/tools/tool_choice/thinking/output_config及旧output_format、sampling、stop_sequences、metadata、service_tier/inference_geo、cache_control/context/compaction、speed/task_budget、diagnostics。剩余显式产品字段是container/mcp_servers/fallbacks/fallback_credit_token；本轮已提出实现步骤。未知beta ignore/reject仍受策略控制，但有已知语义的字段不得因此被静默删除。开启新版本feature必须同时补header、body、block、history、authorization和usage路径，不能只更新BetaRules。

## 建议下一批顺序

A. search_result + image.transformations + 原始响应头 → B. 显式fallback链/真实JSON桥接/多模型账务 → C. MCP connector协议及secret隔离 → D. 核心资源归属/Files与container → E. CodeExec/PTC/内置Skills，再custom skills → F. credit、跨账号迁移/资源共享、压缩/inline server时间线。各批都有独立可验证交付，不需要等全部项目完成才验收。

当前明确不能等价的替代方案：本地Bash冒充官方代码容器、本地Skill冒充API Skills、MCP名称映射冒充服务端connector、文本提取冒充原PDF、token估算冒充官方count、SSE累积冒充fallback非流JSON、跨账号裸资源ID/credit直接复用。拒绝这些替代不等于拒绝实现原协议。

## 第三批执行注记

本文上方“立即可补”是b52f5fc1c审计时点的缺口。随后已获授权实施search_result、image.transformations与错误响应头；具体代码、负例与55次真实CLI隔离矩阵见 [SEARCH-IMAGE-HEADERS-PROGRESS.md](../../SEARCH-IMAGE-HEADERS-PROGRESS.md)。这些更新不改变本文资源/MCP/fallback下一步合同；未把本地测试升级为生产验证。
