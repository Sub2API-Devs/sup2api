# 最终功能闭环审计（当前快照，非全部生产验收）

## Core .74 / Worker .79 当前状态（优先于以下历史快照）

精确Git7d322abd9已部署Core.74四节点和Worker.79原21/22容器；Plugin.13、Controller.48保持，未来镜像默认.79。OAuth已由此前原生刷新恢复，本次不重新授权。estimated_tokens合法thinking进度不再造成Core托管历史503，显示估计不参与计费；完整真实CLI/隔离PG及独审证据见THINKING-ESTIMATE系列和.74/.79部署记录。

根代理本轮公开API normal与inline各4次全部200：预算工具交接、结果续聊、普通无预算SSE、回退新结果均完成。两组八请求账务逐请求唯一receipt及正确分支绑定已核；Worker隐藏轮/紧后system完整hash、工具目录/inline撤回位置也已核，普通SSE真实50/null进度帧成功。详PUBLIC-HELPER-BUDGET-CORE-0.1.74-WORKER-0.1.79，独立证据不由script的passed推导。生产本轮未强制cold restart或跨账号；隔离ABC有冷恢复验证。这是具体组合的公网成功，不是所有特性/资格完成。

单动态deferred MCP目录候选已按官方listing历史合同实现、隔离CLI/独审通过，尚未提交发布；named eager+无关deferred工具的混合目录正在验证。多动态服务器及强制未发现目标等未经等价实现的组合仍明确限制。浏览器工具连续连接超时，新一轮UI视觉验收未执行。完整目标保持进行中。

## Core .72 / Worker .75 当前状态

Git2bd328b46已部署Core.72/Plugin.13、Worker.75/catalog.16，Controller.48。位置payload2和v1→v2链已通过真实CLI接隔离上游及真实隔离PG验证。OAuth前置短命状态进程留锁已修复，#22原生自动刷新/profile200和正常额度200通过，旧token_expired清除。两个原账号容器及授权保留。详见本版本部署记录。

本版本公网预算工具首请求仍502（RID890a39010a218c9e7fbc1dbc，12.705秒），已停止续聊/回退/inline及重试。与前两次预派发503不同，这次存在helper uncertain记录和冻结usage receipt；公开零tokens/pending不能解释为提供商零用量。正在只读核Worker首因及核心账务，不宣称预算真实闭环通过。以下版本段落均为历史快照。

## Core .71 / Worker .73 最新更正

源码428164d47的隐藏helper历史持久、完整轮次捕获/冷恢复、核心托管和幂等用量收据已实现并部署；签名替换修复也包含其中。Core.71/plugin.12/catalog.15、Worker.73和Controller.48均已核对，见最新部署记录。下文“B/C尚在开发”或“缺持久隐藏历史”是旧快照，不能当当前源码结论。

但真实公开预算验收仍未闭环：先因Controller.47缺features路由503，升级.48修复后又在OAuth identity CLI载体归属验证失败。两次都未Reserve/Dispatch模型且0用量；正在修复，不能用隔离ABC测试及成功部署宣称真实托管链路可用。详情见PUBLIC-HELPER-BUDGET-CORE-0.1.71。旧Worker.71多Read验收仍独立保留在PUBLIC-ACCEPTANCE-0.1.71。

## 0.1.72 与当前候选更正（优先于历史快照）

当前已部署证据是核心0.1.70、Worker0.1.72、插件0.1.11、catalog `.14`；见 PROGRESS 顶部及 PUBLIC-ACCEPTANCE-0.1.72。Sonnet构造的unsigned pending服务端工具历史已通过真实单次调用，不能等同捕获真实pause_turn回放。五Read往返和geo原始用量事实已验证。源码签名替换修复检查点 `f677d2de4` 已提交推送，尚未部署。

更正下文早期任务预算描述：完整历史每次重发，不应由网关根据usage减算或重置客户端task_budget。当前在实现和验证隐藏内部helper轮的完整历史持久与恢复，以便提供商获得同一真实轨迹；usage用于准确计量，不作为猜测剩余预算的依据。A存储层已提交，B捕获/恢复和C核心接线仍在独审/联调，通用组合尚未开放。已支持的零helper单轮预算不是这项持久恢复的替代。

历史段落中的“待发布版本”“尚未实现”需按各项最新进度和实际部署SHA核对，不可用此旧快照直接计算完成率。完整目标仍未完成，前端完整视觉验收及以下高级组合仍需补证据。

## 0.1.68 更新说明（优先于下列历史快照）

2026-10-08：精确 Git 提交 `9ba4b278217f077e39cc4e31bc63f50658382133` 已部署核心 0.1.67/Worker 0.1.68/catalog `.10`，两个原账号容器及授权保留。已加载普通目标的窄 forced 适配、CC per-turn 原名准入及 custom inline+内部搜索均已上线；真实 per-turn 两种 beta 无降级验收见 `.67` 记录。

真实五 Read、公共 MCP 与 inline 内部搜索三项已通过，日志确认五结果尾 TAB 原文恢复、MCP 真实流式参数到终态、内部搜索实际执行及客户端工具交接，见 [PUBLIC-ACCEPTANCE-0.1.68](PUBLIC-ACCEPTANCE-0.1.68.md)。这不是所有云工具、所有组合或计费资格均已验证。

跨 Worker 同 issuer diagnostics 已有持久归属实现与独立测试；剩余是跨 issuer 的可信 workspace 身份证明。下列 O-HISTORY 的旧“必须补跨 Worker”表述不再代表当前实现。内部搜索预算、通用 forced 续轮、动态 fallback/逐 attempt 压缩计费等仍需后续工作；保持显式限制不能算全部兼容完成。下文版本与“尚未发布”等段落保留为历史快照，当前状态以本节和 PROGRESS 顶部为准。

审计时间：2026-10-08；目标 `D:/projects/golang/sup2api`；第七/八批已提交 `747c168a383fd4e6738cb9451a29b1fb84010560`；第九批已推送 `cd4d5e40b2de7c22af7718a3b35d12d9f41e786a`，修正候选 `1186563e47565e938da2cd2b1a9e8be6cd5ac2d5` 已通过Linux门禁。Worker #21/#22已原地升级0.1.66/full56f93858、catalog `2026-10-08.8`；核心0.1.65已发布，四节点及实际插件0.1.10哈希通过；公网基础协议及工具/count已复验。真实本地Claude工具回传追加附件的严格对齐错误已修复，0.1.66两轮Read实测通过；新增高级组合仍另行评审，不宣称全部交付。CodeGraph 使用 projectPath 定位，已知源码通过本机读取。目录 `contracts/features/catalog.go` 共 37 个 F 项（36 API + 1 CC safeguards）和 8 个 O 横切目标；不按 partial 数量推算完成率。

## 证据口径与结论

下述“实现”指当前源码路径，“隔离 CLI”指真实 Claude Code 接假提供商，不代表账号有对应官方资格；引用既有进度记录是证据索引，本次没有重跑其全部测试。第六批 Linux 4903994f4 已有 providerresources/gateway/ccgateway/app/store/migrations 六包 race 和 vet，通过 519 tests/subtests，12 个关键数据库测试非 skip；第七/八批747c168六包Linux race/vet已通过563项，0041真实DB非skip，详见LINUX-SEVENTH-BATCH-DB-VALIDATION；第九批1186563已通过Linux七包609项、全contracts55项与strict33项，共697项；race/vet均通过，0042真实DB及原三项迁移红灯已修正转绿。2项可选真实CLI跳过与无测试包单列，详见LINUX-NINTH-BATCH-DB-VALIDATION。真实账号最小基线只证明短答与有限只读资源能力，不能升级为所有工具/计费的真实云闭环。

旧 `FEATURE-CLOSURE-AUDIT.md` 的 resource、inline server、compaction changes、MCP、OpenAI codec、credit“尚未实现”已过时。当前catalog .8已修正credit、inline MCP、PTC与跨Worker diagnostics描述；旧目录和早期审计文字只作历史记录，不能作为当前准入结论。保留历史文档日期，不用改掉过去失败证据。

## 37 项逐项核对

后续候选尚未发布：已实现并独审「全部普通工具显式defer_loading:false时，内部搜索开启下指定已加载目标的强制选择」，保持原目录/参数并禁止helper执行，非通用内部强制续轮；9次隔离真实CLI通过。另对CC2.1.292实测per-turn-control进行独立准入，逐消息effort与header原名保留，两beta分别的16次隔离真实CLI通过，待真实提供商复验无自动降级。目录更新为.9，主前端须随核心发布，不能只更新Worker便声称界面已同步。详细边界见FORCED-LOADED与PER-TURN独立复核记录。

每项列当前路径、已有证据、剩余验收或实现边界。下文 engine 路径均位于 `next/plugins/ccgateway/companions/engine`；core gateway 位于 `next/server/internal/gateway`。

1. **F-SAFEGUARDS**：`safeguards.go` 保留非空 opaque 数组、工具 ID 与名称/schema一致性，主请求归属后应用；响应扩展保真。`SAFEGUARDS-PROGRESS` 有4次 CLI JSON/SSE工具往返，最新 `MCP-COMBINATIONS-PROGRESS` 又有2次 MCP 精确上下文测试。改名、server tools、内部搜索、synthetic rounds、部分inline/typed仍被准入限制；不能删除分类器或改 verdict。需真实 classifier + 客户端执行验证，组合可继续按身份账本扩展。
2. **F-MODEL**：模型计划、CLI --model、核心别名/多模型权限与映射已接。基础真实账号短答成功；高级模型/窗口/提供商资格未逐项验证。请求别名不能当实际模型能力证明。
3. **F-LIMITS**：`feature_plan` 精确保留正数；warmup真实非流0token桥接，不生成/写空assistant。`LIMITS-PROGRESS` 真实CLI隔离整链、gzip和escapedmarker回归；上限/模型真实预热需云验证。
4. **F-STREAM**：response accumulator、原始扩展、终态观察、JSON/SSE、usage与工具数值精度已接。response/工具/资源/credit的多组隔离矩阵；有状态资源响应与OpenAI拒绝转换采用有界缓冲，不能承诺所有路径实时逐token。异常EOF/cancel不能补成功终态。
5. **F-SYSTEM**：顶层与inline system、clear_at、effort、历史位置恢复；缺省CLI effort清理，普通system不当附件删除。`MESSAGE-FEATURES`、system相关CLI矩阵；安全附件组合仍须按模型验证。
6. **F-MESSAGES**：JSONL、prefix/fork/cold、response-only checkpoint、原始envelope sidecar已接。`HISTORY-RESPONSE`、continuation与各feature多流程；Sonnet assistant-tail仍见后文具体缺口。prefix-hit不是上游缓存命中。
7. **F-THINKING**：absent/disabled/manual/adaptive、between_tools、display/updates、绑定参数主请求保真，签名不删除。`THINKING-OUTPUT-PROGRESS`隔离往返；真实签名有效性及模型组合上游校验，改system/tools前缀不能承诺仍有效。
8. **F-OUTPUT**：API format直接出站约束解码，不用合成格式工具；effort优先级和截断/refusal单次终态。相应CLI矩阵；普通200不因本地schema诊断改502。旧synthetic runner仍属不同内部工作流。
9. **F-SAMPLING**：主plan保留JSON数值与采样参数，辅助隔离。`REQUEST/THINKING-OUTPUT`测试；模型互斥由上游裁决，不默默调整。
10. **F-STOP**：stop_sequences到主wire，stop_reason/stop_sequence返回。`REQUEST-PROGRESS`多流程；实际模型停词效果未穷举。
11. **F-METADATA**：显式metadata保真，缺省保留CLI归因，512长度边界及外层真实CC兼容已有回归。它不授予身份；见REQUEST/metadata历史记录，真实上游扩展仍受其schema约束。
12. **F-CACHE**：`cache_plan.go`保留位置、顺序、TTL、4断点与自动缓存；Web/Advisor/typed等后续组合已有适配。`CACHE-PROGRESS`旧“所有server拒绝”已过时；第九批内部ToolSearch的逐轮见证、断点/目录恢复已实现并独立复核，48次真实CLI隔离调用通过；旧synthetic rounds仍限于不同内部工作流。真实cache账单未由本地命中证明。
13. **F-DIAGNOSTICS**：第九批核心持久owner/ID-hash/binding索引、可信grant、Worker重核issuer已接，保留standalone本地索引；JSON/SSE冷Worker续用、同owner平台key轮换和错误负例通过。独立审已修失败用量、消息形状、多值头和过期假登记四类问题；0042并发/过期/幂等DB在1186563 Linux实际通过。跨issuer未放开，不能无界放行。
14. **F-TOOLS**：原生名称+schema匹配、runtime复核、MCP/custom映射、Mod拦截、description恢复、精确整数台账。`NATIVE-TOOLS-PROGRESS`及exact tool tests；目录含2.1.288/292，未知CLI由实际wire校验兜底。不能把名称近似当schema相同。
15. **F-TOOL-CHOICE**：auto/none/any/named和parallel主wire映射；强制选择与thinking模型条件/内部轮次有明确限制。已有单测和CLI；内部ToolSearch forced首轮与续轮应分阶段计划，可补，不是永远不兼容。
16. **F-TOOL-SEARCH**：API regex/bm25、tool_reference、typed与客户端发现账本；API模式关内部CC搜索。最新MCP允许非deferred connector + deferred client搜索；未知MCP引用不猜命名。deferred MCP身份编码待规范/捕获，见MCP组合记录。
17. **F-TOOL-STREAM**：eager_input_streaming与细粒度beta、delta到最终JSON验证，>2^53整数恢复已补。隔离CLI/协议测试；流取消、真实服务端粒度按提供商验证。
18. **F-CITATIONS**：delta、完整引用、来源绑定恢复、search_result适配。`SEARCH-IMAGE-HEADERS-PROGRESS`含55次合并隔离矩阵；不能拿相同文本猜原来源，真实引用质量未评估。
19. **F-IMAGES**：base64/URL/transformations、已归属file源；不本地下载重编码。相同媒体矩阵和FILE-REFERENCES；真实URL取图与模型限制未全测。
20. **F-DOCUMENTS**：PDF/text/content/URL/file源、工具结果文档与引用保留；CLI媒体/资源回归。扫描只已登记结构，不递归修改任意input，不能文本抽取冒充PDF。
21. **F-FILES**：核心CRUD/分页/ACL/限额/expiry，固定issuer，Worker鉴权carrier，公开ID映射及产物登记；Files HTTP独立审与Linux真实DB、隔离CLI已过。21第三方资源路由与22官方OAuth只读证据不同，不能合称所有账号可上传下载。
22. **F-SKILLS**：核心custom CRUD/version/list/delete，builtin目录和container.skills，latest冻结具体已登记版本、两代version映射。SKILLS各进度/独立审、3组新增Skills DB与core资源测试；真实技能执行资格/所有文件格式产出仍待云验证，不能用本地Skill替代。
23. **F-WEB-TOOLS**：搜索/抓取版本、加密结果、引用、mixed客户端工具、pause与新执行组合已有路径。WEB/CODE-EXEC/PTC证据；catalog .8已准确说明direct/程序化caller、代码执行父子账本和容器归属。实际搜索结果/动态过滤及按用量收费需真实验收。
24. **F-CODE-EXEC**：四代执行定义/结果，provider容器/文件登记和续期、JSON/SSE有状态缓冲，原始usage保留。CODE-EXECUTION-PTC与资源独立审/DB；不从调用次数猜CPU时长/官方免费月额度，不用Worker Bash冒充云执行。
25. **F-PTC**：父调用→持久容器→客户端子调用/result账本，跨owner父ID唯一、pending与回退/cold、资源grant。CLI矩阵及Linux并发DB；credit精确echo仅活跃verifiedPrompt豁免，best_effort失配不豁免。无container/未知caller不猜补。
26. **F-ADVISOR**：原始结果/加密历史，嵌套模型权限、价格快照与独立usage迭代计费。ADVISOR、ADDITIONAL-USAGE与MULTIMODEL review；主usage不含advisor，不重复相加。真实模型配对/费用仍待确认。
27. **F-CLIENT-TOOLSETS**：12 typed定义、联合身份/browser_state、inline活跃目录与历史恢复。typed CLI新/续/回退/cold/SSE；失去定义且没有可证明toolset身份仍需ledger增强，不能凭同名猜原生工具。
28. **F-MCP**：两版服务端connector、秘密注入、listing/results、pause/cold，最新inline、非deferred MCP+clientsearch及有限safeguards组合。MCP-COMBINATIONS有14次CLI且全engine/vet；未连接真实第三方MCP。deferred MCP歧义不能靠mcp前缀放行。
29. **F-CONTEXT**：已登记编辑策略/null主wire与applied_edits返回。CONTEXT-COMPACTION隔离12调用；真实provider编辑效果、超长上下文行为未测全。
30. **F-COMPACTION**：两代schema、签名/空summary/null、tool_changes完整时间线、嵌套模型不改签名，独立compaction usage收费。INLINE-SERVER/NESTED-MODEL与DB；fallback每attempt compaction归属仍缺，明确组合限制，不能猜费用。
31. **F-INLINE-TOOLS**：客户端、已适配server及最新MCP时间线，撤销工具不能被搜索复活，显式空compaction changes重置。相关独立审与CLI多流程；内部CC搜索/opaque安全组合仍有边界，按活跃目录而非最终tools覆盖全部历史。
32. **F-FAST**：显式fast需策略允许与beta，缺省清CLI默认，真实usage.speed驱动事实。FAST-DIAGNOSTICS测试；无真实账号fast资格/价差完整证据。
33. **F-TASK-BUDGET**：建议预算原值主请求保真、beta和范围验证。FALLBACK-TASK-BUDGET；内部无计量轮次仍拒绝，应补跨轮剩余预算/累计usage规则，不能每轮重置后声称支持。
34. **F-FALLBACK**：显式链权限+继承参数价格快照、JSON真实非流carrier、SSE尝试边界、replacementusage独立结算；credit字符串/object/null、strict/best_effort、原issuer+prompt custody已实现。FALLBACK/CREDIT文档和最新34.227s联合CLI，core对象6组合及PTC否定测试；第七/八批747c168 DB/race已通过，真实provider信用发行/退款仍未验收。default动态候选授权未闭环；fallback+compaction缺attempt归属仍不能计费猜测。
35. **F-ROUTING**：service_tier主请求、inference_geo覆盖含客户内容辅助调用，非法transport不擅自global；多模型与资源账号亲和。COUNT-ROUTING和核心HTTP；推理region不等于存储驻留，真实geo资格需账号证据。
36. **F-COUNT-TOKENS**：CLI提供内层鉴权，实际count端点输入是客户端原始合法字段而非CC增强prompt；无生成无snapshot。COUNT-ROUTING CLI长历史、pre-fill、错误回归；新资源计数仍要求合法归属，返回不含CC生成开销。
37. **F-OTHER-APIS**：共享protocol-codec strict Chat/Responses→Messages、请求专属prepared converter、JSON/SSE拒绝/工具/opaque thinking、原始usage结算。PROTOCOL-CONVERSION/WORKER-CLI与core12组合；Responses持久ID/background、Batches仍是可建设的独立产品，不能以目前converter声称具备。未知请求语义字段拒绝，合法上游响应附加事实保留provider_details。

## 八个横切目标

- **O-REGISTRY**：唯一contracts/features来源、策略schema1、Worker能力握手已实现（CAPABILITY-PROGRESS）。catalog .8已与第九批能力对齐，Worker21/22实物目录已核验；源码能力与账号资格分层，不能根据镜像tag推断。
- **O-HISTORY**：native/response-only/sidecar、原始数字、signature、当前工具时间线和bounded缓存已实现，多feature cold/rollback测试。后续必须补跨Worker诊断，不混入消息history当正文。
- **O-ATTACHMENTS**：默认与按类型、workingDirectory/platform独立；识别标记附件，普通system保留，未知放行/忽略可配。提示cwd不等于容器真实cwd；Windows/Linux有观察，macOS未充分验证。组合会影响签名前缀不能隐瞒。
- **O-ERRORS**：HTTP200refusal正常，provider原错误/headers、流内错误、usage完成结算分离；credit存储失败是内部custody故障不冒充refusal。SEARCH-IMAGE-HEADERS/CREDIT独立审。最终候选需取消/超时综合回归。
- **O-LOGGING**：Worker逐请求日志含plan/恢复/上游，MCP/creditsecret结构化脱敏，debug开关不删ownership运行状态。相关diagnostic tests；完整新secret union加入时仍需检查日志遗漏，不输出真实凭据作证据。
- **O-UI**：分菜单、字段独立、registry驱动能力状态已有实现/UI测试。需同步最新credit/MCP/执行组合说明，不能把全部partial显示成无功能或已全量云验证。
- **O-PROTOCOLS**：复用共享codec保持legacy门面，next严格converter已落地；资源是独立公开端点，不靠OpenAI转Messages冒充资源CRUD。持久response/batch需另建状态机。
- **O-VALIDATION**：第六批精确Git Linux真实DB已通过；第七/八批747c168已获独立Linux563项/race/vet证据，第九批1186563已取得新的Linux697项/race/vet证据，保留cd4迁移失败与修复链；随后受控真实推理/资源/MCP，保护21/22现有授权与容器。

## 优先可实施缺口：不是“天然不兼容”

### 缓存与内部轮次

第九批已经实现内部ToolSearch缓存ledger，详见[INTERNAL-CACHE-INDEPENDENT-REVIEW](INTERNAL-CACHE-INDEPENDENT-REVIEW.md)：实际主请求观察、完整客户端prefix、同ID/name/input/results、helper目录冻结、每轮TTL/四断点重验；手动/自动×JSON/SSE×新/续/回退/冷导入48次隔离CLI通过。没有静默禁搜索或移动断点。

普通用户API的 `output_config.format` 已走真实上游约束解码，可使用现有缓存路径；旧内部CC synthetic StructuredOutput是另一工作流，不能把它的严格guard写成普通JSON输出功能缺失。forced tool_choice及task_budget均有单主请求保真支持；与内部搜索多轮的组合仍需续轮选择/累计预算合同，保留guard是防止每轮重复强制或预算复位。不是通过删除guard就完成，也不是两项普通API功能未实现。

### 跨 Worker diagnostics 最小正确合同

2026-10-08重新核对[官方 Cache diagnostics](https://platform.claude.com/docs/en/build-with-claude/cache-diagnostics)：仅请求有diagnostics才保存指纹，指纹限定organization/workspace；不是要求同一进程或同一API key。跨workspace可能返回previous_message_not_found；不可用比较仍是正常模型请求。官方只说有限保存期，没有规定本地“一小时”。

第九批已经实现核心有界持久索引、同owner固定binding调度、可信hash grant和Worker实际issuer复核。JSON先登记再发行，SSE仅首个message_start暂存登记后恢复实时流；正常provider notfound/unavailable不改200。默认24h/4096是平台归属保留策略，不是官方指纹有效期；旧Worker缺确认明确失败，standalone仍受本地索引约束。

[CROSS-WORKER-DIAGNOSTICS-PROGRESS](CROSS-WORKER-DIAGNOSTICS-PROGRESS.md)与[DIAGNOSTICS-INDEPENDENT-REVIEW](DIAGNOSTICS-INDEPENDENT-REVIEW.md)记录双Worker、key轮换、owner/group、issuer变化、信用/资源组合、失败用量等证据。独立审四项修复已完成，0042并发/过期DB及重复迁移已在1186563 Linux候选通过。未知owner不能接触共享CC；非CC原协议透传。PrincipalID不能证明两个账号属于同workspace，故跨issuer仍需要可信workspace身份合同，不能偷换账号或删diagnostics。

### Sonnet assistant-tail

须区分普通文字prefill和provider服务端工具pause_turn。父审查补充核对[Opus5.5迁移文档](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide)：4.6及更新模型不支持普通文字prefill，含Sonnet4.6/Opus5.5；但[stop reasons](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons)正式支持pause_turn原样assistant尾续接。此前Opus假上游通过只证明载体保真，不能证明真实模型接受文字prefill。

CLI Sonnet添加Auto Mode Active安全附件仍是合法pause_turn续接可能碰到的适配边界。不能为了普通prefill去突破模型明确限制，更不能删或搬安全指令“修复”。后续仅对官方允许的pause_turn等情形验证无额外临时user文本的续接入口，保留具体模型/CLI证据，不能笼统宣称所有assistant-tail已支持或都不支持。

### 安全字段与工具组合

已支持相同工具身份的client safeguards和限定MCP；server工具/内部轮次/改名opaquecontext仍缺执行上下文合同。先按executor与工具身份分离声明，捕获真实分类器输入/输出并验证整个tool_use ID链；不自行重写opaque rules或verdict。无公开映射依据的重命名可能不能等价，但“全部server组合永久不支持”没有证据。先扩明确同名同schema且无新增执行上下文组合，再逐项验证。

### 其他可补项与真正不可等价的替代

可补：fallback动态default的授权/定价准入；fallback每attempt压缩usage归属；deferred MCP搜索引用服务器身份；无定义typed历史的持久身份账本；Responses持久资源/Batches异步产品；账号真实资格矩阵。它们不能靠accept+drop完成。

不等价替代：本地Bash替官方容器，本地Skills替API Skills，本地MCP注册替远程provider connector，文本提取替原PDF，估算token替count API，SSE累计替fallback原生JSON，裸ID跨租户/issuer复用，删除安全/签名块“修复兼容”。拒绝这些替代不代表拒绝实现官方能力。

## 最终范围与后续验收

第九批缓存和diagnostics已实现并独审，cd4/118两次Git候选及门禁证据已记录；1186563 Linux697项通过，Worker21/22已原地更新0.1.65、catalog .8且真实短答READY通过。核心0.1.65与插件0.1.10实际切换仍等发布代理确认，公开API升级后工具/count回归不能提前宣布成功。保留原候选迁移失败、原进度文档和隔离CLI/真实账号两类证据。

普通API必须保真的单请求format/forced/budget路径已有支持；旧CC synthetic格式循环属于额外内部工作流，不阻断这些普通API能力。内部循环的forced/budget合同仍是可做的高级组合，不能假报已完成。

`fallbacks:default`需要provider动态候选授权和冻结价格，不可把未知模型当全部允许；跨issuer diagnostics需要可信workspace身份；deferred MCP tool_reference缺服务器编码证据时不能从名称前缀猜身份。Batches与Responses stored IDs/background是独立持久产品，不是纯Messages转换的别名：可建设，但当前不能伪成功。fallback每attempt compaction计费仍需明确归属。

本轮未发现新增“已声称支持、实际确定失效”的普通API阻断bug；此前diag四项已交独审修复。剩余真实账号资格、费用/缓存命中、资源与MCP执行验证按受控验收逐项记录，不能拿fake provider替代生产事实。
