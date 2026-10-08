# 当前收尾缺口审计（2026-10-09）

## 后续闭环更新（优先于下方 .74/.79 历史快照）

精确产品 SHA `60969149045452a96e5f0b125c912ddf28f8eeba` 已完成 Core .75 / Plugin .14 / Worker .80 / Controller .48 部署，#21/#22 原容器、挂载、授权保持。下面第1、2、3项已闭环：native 恢复前校验及两种目录形态修复已发布；动态单 MCP 与受限 named eager mixed 各三次公网新/续/回退调用均通过并由账务与 Worker 日志独立佐证；catalog .17 已明确 transport schema 1 和 payload v1/v2 独立协商。详 .75/.80 部署及 `PUBLIC-DYNAMIC-FORCED-CORE-0.1.75-WORKER-0.1.80.md`。部署与独审证据已提交推送 `9721bcbbf`。

新发现提供商动态 MCP SSE 更新写入总量却未更新 TTL 分桶，每请求 1219 token 未细分。保留响应与现有费用，正在增加独立于价格输入的版本化 metrics 事实，避免把默认收费桶描述成已证实五分钟 TTL；实现与隔离 PG 冷重放/独审尚未完成，不能算已部署。UI 20 项独审及类型检查通过，生产浏览器 getState 再次超时，本地宽窄实际渲染补证中。第4项生产视觉验收仍未完成；其余明确组合边界保持下方审计的范围。

## 快照与判断口径

本次只读源码与既有证据索引，没有重跑模型、部署或大规模测试。正式运行基线是 Core 0.1.74 / Worker 0.1.79 / Plugin 0.1.13 / Controller 0.1.48，产品源码 7d322abd9cf8579fe229aa74f50ee654c1d1e2d4，生产 catalog .16。工作区的动态 MCP、forced mixed 及 native 前置校验仍是未发布候选；工作区 catalog 已包含部分候选文案，不能据此认定生产已支持。

当前目录共 37 个 F 条目；历史审计另有 8 个 O 运行维度。所有 partial 都表示有边界，不等于未实现。下文“隔离 CLI”指真实 Claude Code 对假提供商，“ABC”指真实 Core HTTP→Worker→CLI 加隔离 PostgreSQL；二者都不替代真实提供商资格。公开成功与生产冷重启、跨账号迁移分别记账。

旧 FINAL、FEATURE-CLOSURE-AUDIT、COMPLETION-EVIDENCE-MATRIX 中资源未实现、跨 Worker diagnostics 未实现、内部预算无持久恢复等早期段落已过期。本文件按具体后继证据取代这些待办判断，不删除原失败历史。

## 必须先完成的收尾工作

1. **已候选修复并独审通过，待发布：native 工具校验。** `FORCED-MIXED-INDEPENDENT-REVIEW.md` 后段记录实际 relay 红例：普通原生 Read 的已变 schema 被字段恢复覆盖后错误放行；混合目录合法原生定义又因 `[]Object`/`[]any` 形态不一致错误拒绝。前者涉及恢复前可信身份检查，不能只修后者就发布。最新候选已完成恢复前 !count 校验及 historyContent 双 slice 形态处理；原六个反例与实际 Read mixed JSON/SSE lifecycle 独审通过（6.006s、vet），根代理整合 engine 5.272s、contracts/plugin/Worker tests/vet 和前端31测试通过。两红不再是当前开放代码阻断，仍须以精确候选发布闭环。这里指已确定代码问题，不据隔离红例声称生产曾发生越权执行。
2. **P1：合并并发布两个已实现的窄候选，不能先计完成。** 动态单 MCP 服务器 deferred listing 与指定已加载 eager 目标加无关 deferred 客户端工具的 forced mixed，已有独立隔离证据；后者的上述 native 阻断已修并独审通过。完成精确 SHA 集成门禁、目录同步、正常发布后，才可做各一组受控真实资格验收。不得把动态单服务器推为多服务器，把指定 eager 推为强制未发现目标或 mixed any。
3. **目录事实已部分关闭，版本术语需最后同步。** catalog .17 / Plugin .14 候选已整合独审，F-TASK-BUDGET/F-INLINE-TOOLS 已明确 Opus 5.5 普通及 custom inline 公网成功，不再是文案缺口。catalog.go 的 F-CACHE（44行）、F-TOOL-SEARCH（48行）、F-TASK-BUDGET（65行，含 Mechanisms）仍称“隐藏历史协议 v1”；应明确这是 transport schema 1，payload 单独协商 v1/v2，custom inline 和独立 system_only 位置需 payload2。旧 Worker v1 只能承担其原有 whole_round 范围，不能由该句推出新位置能力。本审计只报告措辞，不修改他人 catalog。
4. **P2：完成当前 UI 的实际浏览器验收。** 已有 .63 实际组件宽窄渲染截图、后续组件测试/类型检查/构建与已发布新用量详情；尚无当前完整生产管理页面的浏览器视觉证据。需在可用已登录浏览器中只读核 catalog、旧 Worker 提示、local snapshot 文案、用量详情及窄布局，避免密钥页。工具连接失败是验证缺口，不等于 UI 实现缺失。

## 仍受门禁的组合：下一步是具体设计，不是已证明不可能

- **已登记 helper 链与资源/credit/MCP/context/compaction/assistant-tail 混用。** `engine/helper_history_runtime.go:admitHelperHistory` 仍明确拒绝。普通不需 helper 的预算请求已通过 requirement 三态回原路径，不能再泛称“预算+资源全部不支持”。若扩展已登记链，需统一 issuer lease、公开/远端资源 ID 摘要、秘密不落持久 payload、credit 原 wire 绑定、编辑后公开锚点与真实部分用量；不能删除 if 分支就上线。现有各子模块可复用，但没有完整等价证据，不把“可研究”写成已确定漏了一个透传字段。
- **普通 custom 之外的 inline+内部搜索。** native/server/typed/MCP/safeguards/签名压缩仍有门禁；现有时间线能表达部分身份，但执行目录、动态发现、签名不可改名、跨模型授权及持久秘密需分别闭环。按一类工具一个合同切片推进，先证明当前/历史目录分离，再决定准入；禁止全局放开。
- **强制未发现目标、mixed any 或真正需内部辅助轮的 forced。** 本候选只解决无需 helper 的明确 eager 目标。不得通过 auto 搜索后再重发来冒充原强制语义；需先有保持客户端选择、预算、账务及辅助执行限制的实证方案。
- **动态 MCP 多服务器及动态 inline/compaction/fallback。** 单服务器 listing 已提供可实现的第一片；多服务器需无歧义引用与对应位置目录来源，不能 split 前缀猜身份。当前明确拒绝是尚未完成该组合，不是 MCP API 天然不支持。
- **复杂 Sonnet assistant-tail 冷导入。** 无签名普通服务端历史已有原生 bootstrap；资源、credit、inline 等组合仍受限。扩展需实际原生附件位置/生命周期、零 provider bootstrap、精确尾部及签名证明；不能删安全附件或把 marker 当真实 user。

这些组合不阻断已经证实的普通路径；在没有新增用户场景或可靠合同前，不以排列组合数量制造虚假的“必补功能数”。

## 有合同依据继续明确拒绝的边界

- **跨模型 fallback+compaction 计费归属：** 当前官方 compaction iteration 没有 model/attempt 标识，不能从相邻迭代、最终模型或相同价格猜归属。保持 Worker/core 双门禁；见 `FALLBACK-COMPACTION-ATTRIBUTION-AUDIT.md` 的官方 SDK/文档引用。单独 compaction 已实现，不能把组合限制写成整个功能缺失。
- **fallbacks:default：** 未有可在派发前完成平台候选模型授权/价格快照的确定集合；不能让提供商隐式候选越过平台授权。显式链与信用托管已有实现。
- **模型明确不支持的文字 assistant prefill、未知执行型块、未知协议字段：** 不通过改角色、伪造工具或吞字段模拟。pause_turn 保留完整提供商执行历史是不同语义。
- **跨 issuer 的文件/容器/技能/credit/diagnostic ID：** 没有可信资源身份同一性就不迁移；同 issuer 的冷 Worker、同 owner 密钥变化已有相应实现，不能混为未完成跨 Worker。
- **Responses 存储式 ID、后台任务、Batches：** 当前 converter 不是这些独立端点/状态机；若继续产品范围，应单独建设持久生命周期、ACL、取消与计费，不借文本转译声称支持。

## 37 项当前证据索引与剩余边界

以下每项均以 Anthropic native API 原字段为基础；“CC”仅在明确提及时表示 CC 实际入口/本地客户端。header/body 不独立计算重复功能。除特别说明，隔离矩阵的 cold 指新 Runtime/cache 的真实 CLI 重建，不等于生产账号迁移。

### 基础请求与生成控制

- **F-MODEL：** CLI model、平台授权/别名和实际模型映射已接；两账号真实推理、Opus 与 Sonnet场景有证据。更大窗口/其它模型资格未逐项证明，不是路由缺实现。
- **F-LIMITS：** 正数及 max_tokens0 原生零生成路径、错误边界、JSON/SSE 与历史隔离已测；`PUBLIC-ACCEPTANCE-0.1.70.md` 及 generation-controls 证据包含真实0/1/stop控制。不是“仅本地 max 截断”。
- **F-STREAM：** 已支持登记块的 JSON/SSE、错误/终态与公开思考 progress；`THINKING-ESTIMATE-CUSTODY-REPAIR.md` 与本次成功文档证明真实 50/null 帧及不入费用。资源/credit/helper 在登记完成前有界缓冲，不能宣传即时逐帧。
- **F-THINKING：** 请求模式/beta、原签名与初始 thinking、signature replacement、history/冷/回退有隔离证据；公开第三请求有原始 thinking SSE。签名跨账号有效性由提供商判定，不伪造验证。
- **F-OUTPUT：** 原 API format/effort 与旧 synthetic 分开；`THINKING-OUTPUT-PROGRESS.md`、`FORCED-API-FORMAT-INDEPENDENT-REVIEW.md` 含历史矩阵，公网 structured 成功。不同模型强制选择资格不能由 fake 成功外推。
- **F-SAMPLING：** 主归属参数原数值、辅助不覆盖，`REQUEST-PROGRESS.md`；各种模型互斥规则交原错误，不需自动纠正。
- **F-STOP：** `LIMITS-PROGRESS.md`/generation-controls 的原序列、真实 stop_reason/stop_sequence 与历史/SSE；无需再列“尚无真实停止词验证”。
- **F-METADATA：** 显式对象覆盖主请求、缺省保留 CLI，空/null/CC JSON string、真实外层 CC 到 Worker fakewire 已测；user_id 不充当授权。
- **F-FAST：** speed 主请求隔离、beta、usage.speed 事实保真已实现；实际账号 fast 资格与管理员价格公式是待验，不得自动把标准请求改 fast 或猜价格。
- **F-TASK-BUDGET：** 零 helper forced eager 与核心托管普通/custom inline 均已实现。`PUBLIC-HELPER-BUDGET-CORE-0.1.74-WORKER-0.1.79.md` 八次真实200、2/1/1/1 provider轮数、每RID唯一收据/用量、尾system/目录/回退已核；ABC另证冷 Runtime、JSON/SSE和真实PG。没有生产强制冷重启或跨账号迁移验收，不能反向说持久实现缺失。
- **F-ROUTING：** service_tier 主请求、geo 包括辅助模型已接；`INFERENCE-GEO-INDEPENDENT-REVIEW.md` 和 .71五Read账单证 `not_available` 原字符串持久。区域保证/价格仍按实际供应商与管理员契约，不从字符串猜地区。

### 历史与上下文

- **F-SYSTEM：** 顶层/inline system/clear_at/effort 原位置；两种 output-control beta 独立准入，`PER-TURN-INDEPENDENT-REVIEW.md` 与 `PUBLIC-CLI-ACCEPTANCE-0.1.67.md`。不将 CC beta 改写为另一个官方别名。
- **F-MESSAGES：** ordinary/客户端工具/server 历史、continuation/cold/rollback、已完成撤回工具只读历史、native namespace已实现；Sonnet unsigned pending 的 .72真调用成功不是真实捕获 pause 回放。复杂 tail 见组合门禁。
- **F-CACHE：** 原位断点/TTL/自动缓存、internal轮次及声明目录恢复有隔离矩阵；真实 helper cache1h/read用量已入唯一账本。不能把本地 prefix-hit 等同 provider cache hit；不要推断未知 TTL。
- **F-DIAGNOSTICS：** owner持久索引、账号issuer亲和、冷Worker授权已实现；`PUBLIC-DIAGNOSTICS-0.1.65.md` 两次200第二为refusal但真实 cache_miss_reason，未证明命中。没有必要通过强制命中来“完成”适配。
- **F-CONTEXT：** 原策略/null、applied_edits 与默认 context 不泄漏已实现；`CONTEXT-INDEPENDENT-REVIEW.md`、`CONTEXT-DEFAULT-INDEPENDENT-REVIEW.md`。实际长上下文编辑效果不是 fakeCLI已证内容。
- **F-COMPACTION：** 新旧协议、签名、空结果、tool_changes、模型权限和独立用量已实现并隔离回放；真实模型资格待证，跨fallback归属单列拒绝。
- **F-INLINE-TOOLS：** 客户端/server/MCP各自时间线、撤销/重加/压缩净变更；普通custom内部搜索+预算生产四次已闭环。`INLINE-TIMELINE-INDEPENDENT-REVIEW.md`、`HELPER-PAYLOAD-V2-NEGOTIATION-INDEPENDENT-REVIEW.md` 与最新成功文档。payload2不能退化成按相对索引猜插入。

### 工具与安全

- **F-TOOLS：** native/custom映射、精确input/schema数字、客户端执行与完成历史已接；CC真实单Read/五Read及工具结果TAB+可信suffix已验证。native前置验证两处新红已候选修复并独审通过，原失败保留，待精确候选发布。
- **F-TOOL-CHOICE：** auto/none、全eager any/指定、parallel 原值及零helper已实现；named eager混合目录是本次候选。泛deferred forced仍不在范围。
- **F-TOOL-SEARCH：** 内部搜索与API regex/bm25分离，typed/pinnedMCP引用、历史发现集合、预算持久已实现；pinned真实证见 .69，dynamic单server未发布。
- **F-TOOL-STREAM：** beta/per-tool eager、空delta/no-op与JSON片段错误校验已接；`EMPTY-TOOL-INPUT-INDEPENDENT-REVIEW.md`、`MCP-INPUT-STREAM-INDEPENDENT-REVIEW.md`。上游如何分片不由网关承诺。
- **F-SAFEGUARDS：** 显式数组/结果、原生身份与纯MCP匹配、主请求隔离已测；`SAFEGUARDS-PROGRESS.md`、`ZERO-ROUND-CONTROLS-INDEPENDENT-REVIEW.md`。改名/内部多轮/inline等门禁保留，不绕权限；真实审查服务资格尚无成功证据。
- **F-CLIENT-TOOLSETS：** 12 typed类、toolset联合身份/browser_state、JSON/SSE历史矩阵已实现；`INLINE-CLIENT-TOOLS-PROGRESS.md`。不是 Worker 本地执行支持；内部CC搜索与显式safeguards组合仍拒。
- **F-MCP：** server执行/秘密隔离/响应guard、listing和调用结果、inline/pinned/search回放已实现；匿名DeepWiki非defer与pinned真实完成。动态单server候选见独审文档；其它服务器凭据/权限不是可无条件外推的能力。
- **F-WEB-TOOLS：** 七版定义/caller/结果/引用/暂停/缓存历史隔离已接；`PUBLIC-WEB-ACCEPTANCE-0.1.68.md` 搜索抓取各真实1call1result，引用与账本对应。当前管理员公式未加工具请求费，事实已保留，不能声称等于提供商全部收费。
- **F-ADVISOR：** 结果保真、历史只含advisor的恢复、模型授权/独立iterations计价已实现；`ADVISOR-PROGRESS.md`、多模型独审。真实模型配对资格仍待验证。
- **F-CODE-EXEC / F-PTC：** provider执行版本、容器/产物ACL、caller父子绑定、暂停/cold/回退已隔离验证。第六批真实请求返回200工具错误 too_many_requests，证明错误保真，不证明执行成功；无产物不能伪造下载/父子续聊。见 `DEPLOYMENT-2026-10-08-EXECUTION-SKILLS.md`。

### 媒体、资源和端点

- **F-IMAGES / F-DOCUMENTS / F-CITATIONS：** base64/URL/transformations、PDF/text/content/file源、search_result及引用原位恢复已有55调用隔离组合；.69公网图片/文档/引用续聊三个200，准确恢复CLI空引用数组。见 `SEARCH-IMAGE-HEADERS-PROGRESS.md`、`PUBLIC-ACCEPTANCE-0.1.69.md`。未遍历全部图片URL/文件类型不是已知兼容缺陷。
- **F-FILES：** CRUD、稳定/旧beta分页、public→remote ACL及生成输出登记、同issuer锁/lease已实现；公网上传→读模型→删除/404已有记录。`FILES-HTTP-PROGRESS.md`、`RESOURCE-OUTPUT-IDENTITY-PROGRESS.md`、`PUBLIC-API-ACCEPTANCE-0.1.63.md`。下载仍受provider downloadable许可，不能擅改。
- **F-SKILLS：** parent/version归属、stable/legacy、latest固定、ZIP与删除并发、输出版本转换已实现并真实PG/CLI隔离；真实builtin容器版本解析有证据，执行工具too_many_requests，不能标完整执行成功；不等于CC本地Skills。
- **F-FALLBACK：** 显式模型链、信用string/object/null/strict/best_effort、ownerissuer/精确wire、失败用量和no-retry已有独审/CLI/DB；真实信用发行与退款未证，不是尚无实现。default及compaction限制见上。
- **F-COUNT-TOKENS：** 真上游原body计数、无模型生成/缓存污染、账号路由/Controller放行已接；公网恢复后200输入正整数。旧503/运维窗口502保留，不能继续列为未解决路由问题。
- **F-OTHER-APIS：** strict Chat/Responses文本/工具/format/refusal/opaque reasoning与原usage已实现，真实CLI隔离与核心测试俱有；thinking progress跨协议只作提示不入目标内容/账单。独立有状态端点仍未建设，不能用 converter 冒充。

## 八个运行维度

- **O-REGISTRY：** 唯一features源、beta/body聚合、runtime capability及payload版本握手已实现。当前必须更新前述过期文字，候选能力要等实际发布。
- **O-HISTORY：** native/response-only及核心加密helper账本、ownernamespace/冷恢复/回退/过期/歧义门禁均有证据；真实普通/inline链已核。未测生产跨账号不等于应绕绑定迁移。
- **O-ATTACHMENTS：** client/gateway/both、cwd/platform、安全附件位置、session_context精确suffix及完整JS尾空白恢复有真实CLI和五Read生产证据。其它OS/CLI升级必须重新验证原生行为，不猜兼容。
- **O-ERRORS：** 原HTTP/SSE错误、200refusal/工具错误、Retry-After/request-id、用量与存储失败分离已实现。原 .78 provider200/core503已由 .79公开第三200及唯一receipt闭环，不能继续作为开放故障。
- **O-LOGGING：** bounded request诊断、资源binary省略事实、secret结构化guard、处理stage固定安全类、关闭删除日志但保留业务ownership已实现。新秘密union必须按新增字段复核，不能声称防任意服务端编码隐写。
- **O-UI：** API/CC分菜单、feature聚合、local_snapshot非在线登录、用量详情已实现与单测；当前生产视觉检查仍缺，见P2。
- **O-PROTOCOLS：** 共享strict转换及请求私有state已实现；不等价字段显式拒。平台资源端点独立于OpenAI转换。
- **O-VALIDATION：** 精确Git、Linux受影响race/vet、真实隔离PG、ABC、受控生产验证、原容器保留与回滚都有分层记录。下一批应跑受影响门禁和定向真验，不重做数百项无变化测试来代替候选关键反例。

## 完成判定

最近八个公网请求证实的是已实现 ordinary/custom-inline helper路径：内部历史、工具可用目录、真实suffix、原位系统、SSE progress、唯一账务和回退均闭环；没有新增“这些仍缺实现”的待办。native 前置验证两类红灯已修复并独审通过，当前没有本审计确认仍开放的该类代码阻断；动态单服务器和窄 forced mixed 连同修复尚待提交、精确构建和发布。其它组合按明确合同研究或继续拒绝，资格不足按实际错误记录，不能拿未知替代实现结论。

本文件冻结时没有执行生产变更、模型/身份请求或新增大量测试；当前候选作者后续红转绿须追加独审/发布证据后再改变状态。

审计并行说明：本文件采样后根代理已开始更新候选 catalog/manifest；前述目录文字整改是本次读到的缺口，若新候选已修，应以其最终 diff 和测试关闭，而不是重复修改。未发布能力的生产状态不随工作区文案改变。


最终同步：根代理确认 catalog .17 / Plugin .14 整合独审通过；下一目标 Core .75 / Worker .80。此处仅准备方案，等待精确 SHA，不执行远程构建或运行态操作。

提交前同步：root已修上述三处术语，明确transport schema 1与payload v1/v2独立协商，位置化system与custom inline要求payload2；features回归1.274s通过。第3项文案整改关闭，能力仍待此候选发布。
