# 完成范围与接续审计（2026-10-09）

## 审计状态与基线

本轮为交接整理，业务只读；暂停新增实现、部署和真实模型调用，不触 OAuth、锁、数据库或 goal status。本文件由 completion_scope_audit 独立维护，其它总览由根代理整理。

产品 Git `1c35179527a7632f3ea06b9d9014d81854112956`；当前运行基线 Core .78 / Plugin .14 / catalog .17 / Worker .80 / Controller .48。此基线来自本次仓库 HEAD、最新部署与生产 UI 证据交叉核对，未重新 SSH 核运行态。

## 调查进度

- 已直接读取 README、03 前端方案、PROGRESS、FINAL、CURRENT-CLOSURE-GAPS、COMPLETION-EVIDENCE-MATRIX、UI-PROGRESS、DELIVERY-CODE-REVIEW，以及 .78 部署/生产 UI 记录。确认多个总览混合追加历史快照，不能按其中旧“未发布/未完成”计算当前待办。
- 已直接检查 FeatureSupport.vue、RequestPolicySettings.vue：功能维度内聚合 body_paths 与 beta_headers，API/CC 分菜单；真实策略仅出现在有后端语义的控件，目录未冒充账号真实资格。
- `.75/.80` 已关闭旧 native 前置校验、单服务器 dynamic MCP、受限 named eager mixed 和 transport/payload 术语三项；`.77` 已闭环 TTL 未分桶事实与原费保留；`.78` 已完成七状态生产浏览器布局验收。上述均不应留为当前开放项。
- 已核对 CC 策略 DTO、能力显示、日志开关、模块构建和代表性测试实际断言。根代理已提供本会话原始 13 项要求，以下映射不以 37F/8O 取代原始范围。

本轮使用客户端原生 rg/文件读取。会话列出 CodeGraph/Serena 名称，但本专项尚未取得项目绑定/LSP 可用性证明，不据此宣称语义查询或诊断成功。

本次调查已完成；未新增业务测试或生产操作。不作全部功能完成声明。

## 原始 13 项要求的接续映射

1. **前端按功能聚合关联 header/body：已实现。** FeatureSupport 从共享 registry 获取功能，单项详情并列 body_paths/beta_headers，再显示机制与限制；没有复制第二份白名单。组件测试直接核聚合、分页/筛选不改草稿、失败重试与 API/CC 隔离。`.78` 生产七状态核的是页面布局及用量详情，并非逐个点击 37 项详情的生产验收。
2. **CC 客户端及任意 API 客户端→Worker→CC：已建立入口和分层合同，不能泛称任意语义全部兼容。** 主路径由 Core 鉴权/路由→账号 Worker→engine/Mod/真实 CLI 承载；本地 Claude、公网 Messages 和协议转换有不同证据。OpenAI strict converter 仅覆盖可表达子集，独立有状态端点见协议专项审计。
3. **附件与环境归 CC 特性：已实现。** RequestPolicySettings 的 attachments 区承载 CC 机制、已知附件来源、unknown 附件处理、同级独立 workingDirectory/platform。旧 environment 整体策略和单项 both 仍由兼容合同识别；UI 保存时迁移，不可因控件不显示便删后端旧值。环境展示不改变真实进程 cwd。
4. **请求与工具配置归通用 API：已实现。** RemoteSettings requests/attachments tab ID 保持兼容，标签/API与CC内容分离；F-TOOL-SEARCH 从 API 详情跳转 CC 配置，不再把 beta 与 body 当两个重复功能。
5. **逐项设计透传/转换/处理，不能等价则说明：37 项均有归属与实现/边界，整体仍部分完成。** 下节列全部 F；高级组合门禁不能算已支持，也不能算天然不可能。注意未知 beta 默认 ignore，未知字段可配置 ignore：现状并非“一切未知语义明确拒绝”；下一 AI 应核既有策略与保真要求，不能文档先替源码承诺严格拒绝。
6. **合理子代理：有作者/非作者交叉审查记录。** 共享合同、Core、Worker、UI、历史/计量和发布均有独立审查；不能只凭代理汇报证明整合，发布精确 SHA、测试与运行 hash 才是各阶段证据。本轮仅独立只读审计。
7. **抽象复用、解耦、低嵌套与整改：主要结构及具体修复有证据，仍需按新变化持续复核。** contracts 与 engine/Mod/Worker/Core 分工明确，共享 credits 聚合器、身份 header 验证、helper anchor index 已复用；原 schema 恢复掩盖 native 失配、slice 类型丢目录、隐藏 system 位置、累计 usage、thinking estimate 等红例均有后继整改。未发现足以阻断交接的新业务代码缺陷。当前可证 UI payload 版本投影遗漏见后节；不以文件行数推定必须重写。
8. **随时持久进度：已履行，本轮已清理旧总览混叠。** Root 已用当前 HANDOFF/GUIDE/PROGRESS 取代多版本追加总览，保留原失败/独审/部署证据。后续不能在当前文档继续让旧待办与已关闭事项并列为现状。
9. **每项功能真实 API、本地 Claude、#21/#22 测试：尚未全面满足。** 有逐项源码/隔离 CLI/PG 和定向真实验收；没有每项都在两账号、两入口全部真实成功的完整记录。`.80` 真实 dynamic/forced、`.79` budget/inline 和 `.77` TTL 主要在 #22；#21 API Key 路径与 #22 OAuth 不能互相替代。执行/Skills 的 too_many_requests 只证明错误保真。下一批逐项记录资格、成功、失败、未发，不把“无成功”自动当代码故障。
10. **OVH 隔离测试不干扰其它服务，cc-max 可更新：发布记录有隔离 PG/受限构建和运行边界。** Core 正常发布仍有约 37–38 秒维护 503 窗口，不是零干扰或零中断。`.78` 是正式生产发布与只读浏览器复验；本轮交接不再做此类操作。后续优先隔离 DB/CLI 配置与定向用例，不碰本机损坏 PG 或其它生产服务。
11. **连续、新账号冷调度、回退与缓存：已有实质矩阵，生产新账号/跨账号未整体闭环。** 动态 MCP、forced mixed、helper ABC 等直接测试新 Runtime/新 CacheDir/新 A Service 与回退；公开真实续聊和回退通过。生产没有强制 cold restart 或新账号调度验收，不能升级成所有真实账号迁移通过。带资源、diagnostics、credit 或签名的 issuer 绑定必须保持，不能为通过新账号测试绕权。prefix-hit 只证明本地 transcript 复用，provider cache hit 取实际 usage。
12. **前端/后端/插件/Worker 不漏：主要送达链源码及各模块门禁已接。** UI 保存 RequestPolicy→Core 配置校验/EffectiveRequestPolicy→Core model transport 注入可信 header→Worker engine 验证→RequestPlan/CLI/Mod 出站处理；插件不保存另一套 CC 策略。仍没有“一次真实保存枚举所有设置再逐项核两账号 wire”的全集记录，不能把分层测试写成这一未执行场景。payload UI 投影缺口单列。
13. **评估、设计、拆分、进度、审核修复及必要步骤：流程有完整记录，终局未达成。** 01–05 为调查基线；专项计划/作者进度/独审/真实隔离/公网/部署构成分层链。后续从明确门禁或缺资格证据选任务，先合同再代码/RED→GREEN/独审/Git 精确构建/受控真验，不能宣布整体完成，也不重复闭环项。

## 37 F 的当前归属与证据限制

本表述核到 catalog .17 的 37 个唯一 F ID（其中 F-SAFEGUARDS 为 CC 作用域）；源码目录状态均保留 partial。下面每个项目均列证据索引，不给虚构完成率。专项文件的头部“未部署”是该阶段快照，必须结合其后继部署读取。

1. **F-SAFEGUARDS**：原数组/opaque 结果、身份与 schema 不变 client 及纯 MCP；SAFEGUARDS-PROGRESS、ZERO-ROUND-CONTROLS。internal/server/inline/改名门禁仍在；真实 classifier 资格未全证。
2. **F-MODEL**：模型/alias/权限/实际模型回传；REQUEST 与 GATEWAY-MULTIMODEL 审查、真实两账号基线。其它窗口/模型资格没有逐一真验。
3. **F-LIMITS**：原正数预算与 0 原生非流预热；LIMITS、PUBLIC-ACCEPTANCE-0.1.70 有真实 0/1、0 不写 assistant 记录。不能继续列“0 未实测”，也不能声称免费。
4. **F-STREAM**：登记块/JSON/SSE/错误/终态/实际 usage；RESPONSE、EMPTY-TOOL-INPUT、THINKING-ESTIMATE 与公开 SSE。stateful 资源/信用/helper 登记前有界缓冲，非所有链逐帧即时。
5. **F-SYSTEM**：top/inline 位置、clear_at、effort；MESSAGE-FEATURES、PER-TURN、HELPER-PAYLOAD-V2/TAIL 等审查与预算真实八请求。不能重写/删 system，非普通文本去重。
6. **F-MESSAGES**：公开完整历史、JSONL/response-only、retired completed tool 历史、续/cold/回退；HISTORY-RESPONSE、COMPLETED-CLIENT-HISTORY、Sonnet 系列。Sonnet .72 unsigned 人工 pending 成功不是捕获真实 pause_turn，也不证明全部复杂 tail。
7. **F-THINKING**：模式/display/预算/签名替换/初始块/估计进度；THINKING-OUTPUT、INITIAL-THINKING、SIGNATURE-DELTA、THINKING-ESTIMATE。真实 50/null 进度成功；假签名不可证明真实跨账号签名有效。
8. **F-OUTPUT**：API format/effort、strict 工具、正常 refusal/truncation；THINKING-OUTPUT、FORCED-API-FORMAT 及公开结构化。legacy synthetic 工作流边界独立，不影响普通 API format 已适配事实。
9. **F-SAMPLING**：原数值只改主归属轮；REQUEST/数值边界独审。没有逐模型采样效果全集，非法组合保留提供商错误。
10. **F-STOP**：原上游 stop_sequences 与 reason/sequence；LIMITS、.70 真实 SSE stop 精确对应且一次 message_stop，旧“无真停词”已关闭。
11. **F-METADATA**：显式原对象、缺省 CLI 归因、512 字符；REQUEST/REVIEW 的外层 CC 与隔离 wire。metadata 不授 HTTP 身份。
12. **F-CACHE**：原位置/TTL/automatic/内部轮证据、预算持久；CACHE、INTERNAL-ROUND-CACHE、helper 系列与 .77 新事实。2595/1376/0/1219 partial、0.02670540 原费用保留；prefix-hit 不是 provider hit，未细分不能推 5m。
13. **F-DIAGNOSTICS**：Core owner/index、same issuer 冷授权；CROSS-WORKER-DIAGNOSTICS、PUBLIC-DIAGNOSTICS-0.1.65。真实 refusal200 的 cache_miss_reason 是有效返回，不证明命中；跨 issuer 不放开。
14. **F-TOOLS**：native/schema/精确数字/custom/MCP/client execution/retired history；NATIVE-TOOLS、FORCED-MIXED 独审和 .75/.80 发布。真实五 Read 一响应不等于 I/O 时间重叠；原两个 native 红已闭环。
15. **F-TOOL-CHOICE**：auto/none、全 eager any/named、named eager+显式无关 deferred；FORCED-* 与 .80 公开三次。目标 deferred/mixed any/需 helper forced 仍受门禁，不能改 auto 冒充。
16. **F-TOOL-SEARCH**：CC 内部与 API regex/bm25 各自合同、tool_reference 历史；内部/cache/helper/inline、PINNED-MCP、DYNAMIC-MCP。pinned 真往返与单 dynamic 真三次已完成，多 dynamic 不外推。
17. **F-TOOL-STREAM**：beta/per-tool eager、空 delta 与精确 input；EMPTY-TOOL-INPUT、MCP-INPUT-STREAM 及真实 MCP delta。粒度由提供商决定。
18. **F-CITATIONS**：原来源/索引/完整历史/增量；SEARCH-IMAGE-HEADERS、CITATION-EMPTY-ARRAY 与 .69 三请求。旧 .68 citation502 已修，不能仍当开放失败。
19. **F-IMAGES**：base64/URL/file/transformations 原源；FILE-REFERENCES、SEARCH-IMAGE-HEADERS 和 .68/.69 真图识别续聊。不是所有 URL/格式/体积真验。
20. **F-DOCUMENTS**：PDF/text/content/URL/file/citations，不提取文本冒充 PDF；相同媒体专项及真文本引用。未逐真实 PDF/URL 组合成功，不制造不存在的普通代码故障。
21. **F-FILES**：CRUD/pagination/downloadable/ACL/issuer/输出登记；FILES-HTTP、RESOURCE-OUTPUT-*、真上传→读→删/404。跨 issuer 不迁移，provider 禁下载保留。
22. **F-SKILLS**：API custom/version CRUD、latest冻结、stable/legacy、container及产物；SKILLS-* 与真实隔离 PG/CLI。builtin 版本解析有真证，执行限流不算成功；不等于 CC 本地技能。
23. **F-WEB-TOOLS**：版本定义/caller/search/fetch/result/citations/pause/history；WEB-TOOLS 与 PUBLIC-WEB-ACCEPTANCE-0.1.68 真 search/fetch 各一次。工具费事实与管理员现价公式有边界。
24. **F-CODE-EXEC**：provider执行块、容器/产物和独立 usage；CODE-EXECUTION-PTC、WORKER-RESOURCES、EXECUTION-SKILLS。真实 too_many_requests 非产物成功，不可用本地 Bash 替代。
25. **F-PTC**：caller/父子 ID/容器归属与 client handoff；CODEEXEC/PTC/RESOURCE-ADMISSION 的隔离 cold/回退/DB。未有真实完整执行父子产物链成功。
26. **F-ADVISOR**：结果/opaque history、嵌套授权/价格与额外 iterations；ADVISOR、ADDITIONAL-USAGE、MULTIMODEL 独审。真实模型配对/账单缺证，不能假定免费。
27. **F-CLIENT-TOOLSETS**：12 typed/toolset联合身份/browser_state/生命周期；INLINE-CLIENT-TOOLS。非 Worker 本地执行；内部发现/safeguards 组合受门禁，未逐 toolset 真验。
28. **F-MCP**：provider connector、秘密隔离、pinned/inline/listing/call/result；MCP-*、PINNED/DYNAMIC 与真 DeepWiki/pinned/单 dynamic。多 dynamic 与 dynamic-inline/compaction/fallback 未支持。
29. **F-CONTEXT**：编辑策略/null/applied_edits/default泄漏修复；CONTEXT-COMPACTION、CONTEXT-DEFAULT、Sonnet context修复。真实超长编辑效果缺证，不能把参数接收算效果。
30. **F-COMPACTION**：两代、签名/tool_changes/usage及历史；CONTEXT-COMPACTION 与 ADDITIONAL-USAGE。真实摘要/费用缺证；cross fallback 归属合同不足。
31. **F-INLINE-TOOLS**：按位置增删/重加、custom内部发现与 payload2 custody；INLINE-TIMELINE、INLINE-INTERNAL、HELPER-PAYLOAD-V2 与 .79真 inline预算四请求。native/server/typed/MCP/safeguards/签名压缩内部组合仍门禁。
32. **F-FAST**：管理员许可、原 speed/beta、实际 usage.speed；FAST-DIAGNOSTICS。真实 fast 资格/价差未完整核，不用请求 fast 推实际 fast。
33. **F-TASK-BUDGET**：合法原 total/remaining、零helper及ordinary/custom inline托管；durable A/B/C、真实 ABC/PG、.79 公网八请求。原预算不按 usage扣减；登记 helper 与高级资源控制混用仍受门禁。
34. **F-FALLBACK**：显式链、credit string/object/null/strict/best_effort、owner/issuer/失败计量；FALLBACK/CREDIT系列与 PG。真实信用发行/兑付/退款未证；default候选授权及compaction归属仍拒。
35. **F-ROUTING**：tier/geo/workspace/profile与资源/辅助模型资格；COUNT-ROUTING、INFERENCE-GEO及 .71真实 not_available 持久。不是地域驻留保证。
36. **F-COUNT-TOKENS**：客户端原 body 真端点/CLI内层鉴权、不生成不写快照；COUNT-ROUTING、公开 .65 后 200。不是本地估算，旧 Controller503 已修。
37. **F-OTHER-APIS**：strict Chat/Responses 有限语义/opaque thinking/拒绝/原usage；PROTOCOL-CONVERSION/WORKER-CLI 与独立 COMPLETION-PROTOCOL-AUDIT。stored ID/background/Batches/独立产品不能由 converter 推导。

## 8 O 的当前归属

- **O-REGISTRY**：单一 data-only features registry、RequestPlan、policy schema与 runtime 广告完成；transport1/payload1/2分离已实现。UI payload投影缺口不推翻协商。
- **O-HISTORY**：native/response-only/sidecar、Core加密helper immutable账本、owner/namespace/过期/歧义/冷/回退已有直接断言及 PG；无跨 issuer任意迁移承诺。
- **O-ATTACHMENTS**：来源/覆盖/cwd-platform/known-unknown/安全位置/session suffix与尾空白有专项修复及真实五Read；不删安全附件。
- **O-ERRORS**：原 HTTP/SSE/error/refusal/Retry-After/known usage/失败无自动重派；.78 provider200/core503历史由 .79修复闭环。拒绝内容任务与协议成功分别记录。
- **O-LOGGING**：Worker按账号完整索引、有界64MiB、24h/512MiB、partial/truncated、安全类诊断、secret guard；关开关删除debug记录并禁止晚完成复活，业务归属账本独立。Core仅投影限额/开关，不重复存body。
- **O-UI**：功能聚合、API/CC、runtime与local_snapshot区分、dirty保存与旧策略迁移、用量事实完成；.78生产七bounds已关闭视觉问题。payload显示低优先级待办，非“从未视觉验收”。
- **O-PROTOCOLS**：shared strict converter/private request state及有限端点；不能兼容字段保持门禁。未知 ignore现状另见第5项。
- **O-VALIDATION**：Git-only/clean SHA/受影响Linuxrace-vet/隔离PG/CLI-ABC/受控public/运行hash/原容器保留与备份分层记录；缺每feature两账号真实全集与生产新账号调度验证，不是泛无测试。

## 实际断言抽查及结论范围

没有以测试数量算完成率；本轮直接查看以下源码和证据对象：

- mcp_dynamic_listing_cli_test：原tools全对象digest、server credential绑定、listing/search/call/result块完整存在、新/续/新fixture冷导入/回退、JSON/SSE、恰4provider调用、secret不泄露。**不是多服务器测试或真实provider。**
- forced_mixed_cli_test：原schema/defer/description/cache_control/budget与named选择/并行约束、helper禁止、cold/回退、原provider rejection；.80公开证据另核首次 forced 与后续auto是不同条件。
- helper_history_abc_cli_test：实际Worker子进程/CLI/隔离PG，原thinking/signature/planning/tool/result完整hash、system位置、预算presence/缺省、冷Runtime/CacheDir/AService、回退、5公开/6provider和receipt/outbox幂等；后继独审补50/null和thinking块计数，不以早期弱断言PASS替新断言。
- helperhistory/lookup_independent_test：`MaxChainDepth+17`（529）末位置 known不截断，未知owner/group仍ordinary、重复prefix拒绝；它是查找长度边界，**不是529轮真实模型会话验收**。
- ccgateway/service_test：外来model auth与伪造policy被可信Core覆盖，默认pass_upstream_errors:false/attachment_source:client真实header；UI与save/reload测试另核改变值。未据此宣称所有设置变体都走完真实公网。
- .78 render-result.json：真实 `/me/version/usage`200、7captures.bounds.pass=true/pageErrors0、桌面scrollLeft0/110、窄390、保存footer static贴前兄弟；截图隐私遮罩且无mock。只有七具体状态，不声称逐feature/账号页面全操作。

## 下一 AI 仍需的必要步骤

1. **先读当前交接与协议审计，选明确未闭环项。** 本轮暂停实现/部署，接续需按用户下一指示展开；不能自动补模型、触OAuth或DB写。
2. **高级组合先合同后准入。** 当前 `admitHelperHistory` 实际拒resource/credit/MCP/legacy structured/context/compaction/continuation；需要复用issuer lease、资源ID摘要/secret隔离、公开锚点、完整原位history及真实部分用量。ordinary无需custody路径已可用，不再泛称“预算+资源全不能用”。
3. **inline/internal按工具家族推进。** validateInlineInternalSearch/validateHelperInline只支持ordinary custom；native/server/typed/MCP/safeguards/signed compaction必须证明目录历史和当前执行权限分离，不可删guard全开。
4. **forced deferred/mixed any** 要证明原forced语义与发现阶段的合同；不得auto搜索后重发冒充。复用helper/usage，只扩明确证明的slice，保留模型自身限制。
5. **多 dynamic MCP/动态inline/compaction/fallback** 需要可信完整listing与位置身份，变更/撤回/多server碰撞必须可判，不能split引用前缀猜身份。
6. **复杂Sonnet assistant-tail冷导入** 需安全附件原位、零provider bootstrap、完整tail/签名/资源生命周期证明；普通文字prefill模型不支持应继续拒，不把pause_turn混同prefill。
7. **真实资格队列**：执行/Skills/PTC、Advisor、fast、长context/compaction效果、fallback credit发行兑付退款等逐功能明确两账号资格/成功/限流/未测试。获授权后只跑有区分力的场景，失败即停且保留已消耗用量；不靠重复假测试补真资格。
8. **第9/11项验证欠账**：建立逐feature×入口×账号×新/续/cold/回退的证据索引，unknown与unsupported分开。新账号仅对无issuer依赖可等价内容测试；资源/签名跨issuer不能强迁移。长会话查找边界与长真实推理分别记录。
9. **payload运行态显示**：WorkerCapabilities.vue缺helper_history_payload_versions类型/校验/显示；Core和Worker已具合同，下一UI只投影实际值，transport与payload分开，不从catalog/tag猜。测试覆盖旧Worker缺省、[1]、[1,2]、非法/重复值，不宣称provider已验证。本轮不改业务。
10. **unknown忽略策略的保真说明**：当前默认unknown_beta=ignore、unknown_field可ignore；若用户继续要求不可等价必拒，先明确已识别特性/未知字段边界与旧配置兼容，再做定向源码/HTTP负例。不可把说明先改成“皆拒绝”而代码照旧吞字段。

## 现阶段必须继续明确拒绝的范围

fallback+compaction的跨模型iteration缺model/attempt归属合同；fallbacks:default无法事前冻结确定候选授权/价格；不支持模型的普通assistant文字prefill；未知执行型块/高风险请求控制；无可信同一性证明的跨issuer资源/credit/diagnostic；存储Responses ID/background/Batches尚无独立生命周期。它们均有具体原因，**不等于证明永远无法建设**。本地Bash/Skills、文本PDF、估算count、删签名/system、安全附件或凭裸ID跨租户都不构成等价替代。

## 文件整理建议与当前有效设计

Root已将以下过时总览移入 `archive/2026-10-09-pre-handoff/`：ROOT-README、PROGRESS、FINAL-FEATURE-CLOSURE、CURRENT-CLOSURE-GAPS、FEATURE-CLOSURE-AUDIT、COMPLETION-EVIDENCE-MATRIX、FINAL-SCOPE-EVIDENCE-REVIEW-0.1.68、NEXT-COMPATIBILITY-WORK-AUDIT、REMAINING-COMPATIBILITY-AUDIT-E463。本专项赞同归档：这些文件混叠早期完成判断/优先级和后续闭环，不能再作为current待办源。本文保留其原文件名便于追历史，不移动其它文件。

继续保留原路径：

- **01–05研究基线**：保留官方功能归属、实现意图/UI方案/验收口径/端点范围；已由Root标为快照，接口示例不可当运行现状。
- **TASK-BUDGET-DURABLE-IMPLEMENTATION-SPLIT、HELPER-INLINE-POSITIONAL-V2、HELPER-TRAILING-BUDGET-SYSTEM-REPAIR、HELPER-HISTORY-*专项**：持久/位置/绑定/ABC合同仍有解释价值；其中“尚未建/未开”依后继发布覆盖，不从零重建A/B/C。
- **CACHE-TTL-EVIDENCE-DESIGN、CACHE-TTL-PROVENANCE-CODE-AUDIT**：v1观测事实/计费分离仍是当前实施合同；配.77部署和.78UI证据阅读。
- **DYNAMIC-MCP-LISTING-PLAN、FORCED-MIXED-CATALOG-PLAN及独审/进度**：当前窄listing和forced目录范围的合同来源；首片已上线，不把整个计划重新排为未实现。
- **FALLBACK-COMPACTION-ATTRIBUTION-AUDIT/PLAN、RESOURCE-PROTOCOL-BOUNDARIES、FALLBACK-IMPLEMENTATION-PLAN、COMPLETED-CLIENT-HISTORY-PLAN**：仍解释计量、资源绑定和历史与当前权限分离；前者是下一步合同阻碍来源，不据transport probe开放计费。
- **UI-PROGRESS、CAPABILITY-PROGRESS、REVIEW-PROGRESS、DELIVERY-CODE-REVIEW及其它作者/独审记录**：属于阶段实施证据，可保留但不作current总览；有后继整改时并列读，不删除原红例。
- **各 DEPLOYMENT/PUBLIC/VALIDATION-PREPARATION/独审和evidence**：不可用归档清理删除失败、私有脱敏索引或精确版本链；新current入口只链接相关版本。
- **SINGLE-TURN-CLIENT-TOOLS-DESIGN.md**：仍是未执行的另方案提案，不能替当前内部helper设计，也不能因讨论存在自动把max-turns改1。

新 HANDOFF/IMPLEMENTATION-GUIDE已读，所述部署SHA、真实证据分层、payload展示遗漏与当前门禁符合本专项读取。当前每feature真两账号/冷调度欠账应保持在接续清单，不以新总览完成交接等同功能目标完成。
