# 最终功能闭环审计（当前快照，非全部生产验收）

审计时间：2026-10-08；目标 `D:/projects/golang/sup2api`；基线 HEAD `160f6064ada938e69e84a32797df82fd660d8e6e`，包含共享工作区第七/八批未提交修改。只读业务代码，仅新增本文。CodeGraph 使用 projectPath 定位，已知源码通过本机读取。目录 `contracts/features/catalog.go` 共 37 个 F 项（36 API + 1 CC safeguards）和 8 个 O 横切目标；不按 partial 数量推算完成率。

## 证据口径与结论

下述“实现”指当前源码路径，“隔离 CLI”指真实 Claude Code 接假提供商，不代表账号有对应官方资格；引用既有进度记录是证据索引，本次没有重跑其全部测试。第六批 Linux 4903994f4 已有 providerresources/gateway/ccgateway/app/store/migrations 六包 race 和 vet，通过 519 tests/subtests，12 个关键数据库测试非 skip；第七/八批与最终 SHA 尚需重新 Git 候选验证。真实账号最小基线只证明短答与有限只读资源能力，不能升级为所有工具/计费的真实云闭环。

旧 `FEATURE-CLOSURE-AUDIT.md` 的 resource、inline server、compaction changes、MCP、OpenAI codec、credit“尚未实现”已过时。目录仍写 credit 暂拒、MCP 全部 inline 暂拒等，也需在新候选同步。保留历史文档日期，不用改掉过去失败证据。

## 37 项逐项核对

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
12. **F-CACHE**：`cache_plan.go`保留位置、顺序、TTL、4断点与自动缓存；Web/Advisor/typed等后续组合已有适配。`CACHE-PROGRESS`旧“所有server拒绝”已过时；实际第156行仍拒内部ToolSearch/synthetic rounds，后文给可实施方案。真实cache账单未由本地命中证明。
13. **F-DIAGNOSTICS**：`api_diagnostics.go`与ownership持久本地索引支持对象/null/同Worker比较，JSON/SSE响应保真；FAST-DIAGNOSTICS有4次CLI。跨Worker/冷账号未闭环，需要核心归属与可信grant；见专项最小方案，不能无界放行。
14. **F-TOOLS**：原生名称+schema匹配、runtime复核、MCP/custom映射、Mod拦截、description恢复、精确整数台账。`NATIVE-TOOLS-PROGRESS`及exact tool tests；目录含2.1.288/292，未知CLI由实际wire校验兜底。不能把名称近似当schema相同。
15. **F-TOOL-CHOICE**：auto/none/any/named和parallel主wire映射；强制选择与thinking模型条件/内部轮次有明确限制。已有单测和CLI；内部ToolSearch forced首轮与续轮应分阶段计划，可补，不是永远不兼容。
16. **F-TOOL-SEARCH**：API regex/bm25、tool_reference、typed与客户端发现账本；API模式关内部CC搜索。最新MCP允许非deferred connector + deferred client搜索；未知MCP引用不猜命名。deferred MCP身份编码待规范/捕获，见MCP组合记录。
17. **F-TOOL-STREAM**：eager_input_streaming与细粒度beta、delta到最终JSON验证，>2^53整数恢复已补。隔离CLI/协议测试；流取消、真实服务端粒度按提供商验证。
18. **F-CITATIONS**：delta、完整引用、来源绑定恢复、search_result适配。`SEARCH-IMAGE-HEADERS-PROGRESS`含55次合并隔离矩阵；不能拿相同文本猜原来源，真实引用质量未评估。
19. **F-IMAGES**：base64/URL/transformations、已归属file源；不本地下载重编码。相同媒体矩阵和FILE-REFERENCES；真实URL取图与模型限制未全测。
20. **F-DOCUMENTS**：PDF/text/content/URL/file源、工具结果文档与引用保留；CLI媒体/资源回归。扫描只已登记结构，不递归修改任意input，不能文本抽取冒充PDF。
21. **F-FILES**：核心CRUD/分页/ACL/限额/expiry，固定issuer，Worker鉴权carrier，公开ID映射及产物登记；Files HTTP独立审与Linux真实DB、隔离CLI已过。21第三方资源路由与22官方OAuth只读证据不同，不能合称所有账号可上传下载。
22. **F-SKILLS**：核心custom CRUD/version/list/delete，builtin目录和container.skills，latest冻结具体已登记版本、两代version映射。SKILLS各进度/独立审、3组新增Skills DB与core资源测试；真实技能执行资格/所有文件格式产出仍待云验证，不能用本地Skill替代。
23. **F-WEB-TOOLS**：搜索/抓取版本、加密结果、引用、mixed客户端工具、pause与新执行组合已有路径。WEB/CODE-EXEC/PTC证据；catalog仍说PTC未接需更新。实际搜索结果/动态过滤及按用量收费需真实验收。
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
34. **F-FALLBACK**：显式链权限+继承参数价格快照、JSON真实非流carrier、SSE尝试边界、replacementusage独立结算；credit字符串/object/null、strict/best_effort、原issuer+prompt custody已实现。FALLBACK/CREDIT文档和最新34.227s联合CLI，core对象6组合及PTC否定测试；第七/八批DB/race待候选。default动态候选授权未闭环；fallback+compaction缺attempt归属仍不能计费猜测。
35. **F-ROUTING**：service_tier主请求、inference_geo覆盖含客户内容辅助调用，非法transport不擅自global；多模型与资源账号亲和。COUNT-ROUTING和核心HTTP；推理region不等于存储驻留，真实geo资格需账号证据。
36. **F-COUNT-TOKENS**：CLI提供内层鉴权，实际count端点输入是客户端原始合法字段而非CC增强prompt；无生成无snapshot。COUNT-ROUTING CLI长历史、pre-fill、错误回归；新资源计数仍要求合法归属，返回不含CC生成开销。
37. **F-OTHER-APIS**：共享protocol-codec strict Chat/Responses→Messages、请求专属prepared converter、JSON/SSE拒绝/工具/opaque thinking、原始usage结算。PROTOCOL-CONVERSION/WORKER-CLI与core12组合；Responses持久ID/background、Batches仍是可建设的独立产品，不能以目前converter声称具备。未知请求语义字段拒绝，合法上游响应附加事实保留provider_details。

## 八个横切目标

- **O-REGISTRY**：唯一contracts/features来源、策略schema1、Worker能力握手已实现（CAPABILITY-PROGRESS）。当前Reason文案需追上第七/八批；源码能力与账号资格分层，不能根据镜像tag推断。
- **O-HISTORY**：native/response-only/sidecar、原始数字、signature、当前工具时间线和bounded缓存已实现，多feature cold/rollback测试。后续必须补跨Worker诊断，不混入消息history当正文。
- **O-ATTACHMENTS**：默认与按类型、workingDirectory/platform独立；识别标记附件，普通system保留，未知放行/忽略可配。提示cwd不等于容器真实cwd；Windows/Linux有观察，macOS未充分验证。组合会影响签名前缀不能隐瞒。
- **O-ERRORS**：HTTP200refusal正常，provider原错误/headers、流内错误、usage完成结算分离；credit存储失败是内部custody故障不冒充refusal。SEARCH-IMAGE-HEADERS/CREDIT独立审。最终候选需取消/超时综合回归。
- **O-LOGGING**：Worker逐请求日志含plan/恢复/上游，MCP/creditsecret结构化脱敏，debug开关不删ownership运行状态。相关diagnostic tests；完整新secret union加入时仍需检查日志遗漏，不输出真实凭据作证据。
- **O-UI**：分菜单、字段独立、registry驱动能力状态已有实现/UI测试。需同步最新credit/MCP/执行组合说明，不能把全部partial显示成无功能或已全量云验证。
- **O-PROTOCOLS**：复用共享codec保持legacy门面，next严格converter已落地；资源是独立公开端点，不靠OpenAI转Messages冒充资源CRUD。持久response/batch需另建状态机。
- **O-VALIDATION**：第六批精确Git Linux真实DB已通过；当前未提交第七/八批不能借用旧SHA证明。下一步候选精确SHA+隔离PG45432/Redis36379+races/vet；随后受控真实推理/资源/MCP，保护21/22现有授权与容器。

## 优先可实施缺口：不是“天然不兼容”

### 缓存与内部轮次

源码 `cache_plan.go:156` 对内部ToolSearch/旧synthetic rounds总拒。可先构建每轮不可变CachePlan：客户端原始断点保持绑定到原prefix，内部新增搜索结果不移动原断点、不把内部工具目录冒充客户端目录；明确每轮新增内容的缓存策略与总usage归属。通过first/search/continuation实际wire逐字节及TTL/4断点验证后开放。若CLI自身工具变动使首次prefix不再等价，必须实证分支处理，不能静默禁搜索/禁缓存。API format已经是真实上游constrained decoding，不应与legacy synthetic格式轮次混称“json都不支持缓存”。task_budget/forcedchoice同时按轮次制定，不能简单撤掉guard。

### 跨 Worker diagnostics 最小正确合同

2026-10-08重新核对[官方 Cache diagnostics](https://platform.claude.com/docs/en/build-with-claude/cache-diagnostics)：仅请求有diagnostics才保存指纹，指纹限定organization/workspace；不是要求同一进程或同一API key。跨workspace可能返回previous_message_not_found；不可用比较仍是正常模型请求。官方只说有限保存期，没有规定本地“一小时”。

当前 `api_diagnostics.go:46` 依赖Worker本地ownership，一小时/4096是平台策略，阻断冷Worker。可实现核心持久有界索引(owner UserID+GroupID, response ID/hash, verified account/principal/generation, opt-in, observed/retention)，JSON/SSE实际发出的messageID登记；同owner查询后调度原binding，注入仅内部可信grant，Worker重新验证issuer，冷启动无需原本地ID文件。取消/未发行ID不能伪登记；客户端伪造内部头必须剥除，插件patch不得替换关联ID，状态不依赖debug日志。已知owner但上游指纹过期应允许provider正常返回notfound，平台保留期届满需明确本地归属不可证，不伪造provider诊断结果。

当前PrincipalID不等于已证实workspace ID，故先固定原account/issuer；未来增加可信workspaceidentity后才能放宽同workspace不同凭据，而非凭组织名称猜测。原账号不可用应报亲和能力/可用性错误，不偷偷删除diagnostics或换workspace。旧Worker没有grant能力时明确版本不支持，不能降级无界放行。测试需要双Worker/重启、key轮换同owner、跨group、issuer迁移/迟到响应、JSON/SSE、诊断notfound仍200、TTL/容量/并发/未知ID。

### Sonnet assistant-tail

`continuation.go:46`要求最终临时user块只有随机trigger。已有Sonnet4.6隔离证据显示CLI插入Auto Mode Active安全附件，因此拒绝；Opus的成功不证明Sonnet成功。下一步捕获该版本安全附件来源/生命周期，优先找到不产生临时user提示的CLI恢复入口或Mod可归属续写接口。若只能移动附件到system，必须先证明角色/位置语义且获得安全合同，不得把“同文字”当等价；当前不直接删除附件。此为未解决工程适配，不是Sonnet API不能assistant-tail的结论。

### 安全字段与工具组合

已支持相同工具身份的client safeguards和限定MCP；server工具/内部轮次/改名opaquecontext仍缺执行上下文合同。先按executor与工具身份分离声明，捕获真实分类器输入/输出并验证整个tool_use ID链；不自行重写opaque rules或verdict。无公开映射依据的重命名可能不能等价，但“全部server组合永久不支持”没有证据。先扩明确同名同schema且无新增执行上下文组合，再逐项验证。

### 其他可补项与真正不可等价的替代

可补：fallback动态default的授权/定价准入；fallback每attempt压缩usage归属；deferred MCP搜索引用服务器身份；无定义typed历史的持久身份账本；Responses持久资源/Batches异步产品；账号真实资格矩阵。它们不能靠accept+drop完成。

不等价替代：本地Bash替官方容器，本地Skills替API Skills，本地MCP注册替远程provider connector，文本提取替原PDF，估算token替count API，SSE累计替fallback原生JSON，裸ID跨租户/issuer复用，删除安全/签名块“修复兼容”。拒绝这些替代不代表拒绝实现官方能力。

## 本轮后续顺序

1. 提交第七/八批精确候选、更新catalog/UI过时文案，Linux隔离DB/race/vet与秘密扫描。
2. 第九批实现核心diagnostics归属/grant/冷Worker合同；另agent细化内部rounds缓存与预算方案。
3. Sonnet安全续写和safeguards组合以受控CLI探针找可证明入口；如仍无等价入口保留具体证据。
4. 按账号和模型做获授权真实功能验收；逐项记录provider拒绝/第三方路由缺失，不把代码不支持与账号无资格混为一谈。
