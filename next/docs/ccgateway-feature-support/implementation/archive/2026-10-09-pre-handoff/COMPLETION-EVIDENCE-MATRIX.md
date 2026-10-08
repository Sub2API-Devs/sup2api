> 历史快照归档：2026-10-09 交接整理前保存。正文包含不同日期的候选、失败和已过时状态，不代表当前实现或线上版本。当前状态以 [接手文档](../../../HANDOFF-2026-10-09.md) 和 [当前进度](../../PROGRESS.md) 为准。归档只调整相对链接，保留原有结论和证据。

# 完成度与证据矩阵（不等同全部完成）

当前覆盖更新：Git2bd328b46已部署Core.72/Plugin.13、Worker.75/catalog.16、Controller.48；原生OAuth刷新/profile及额度200已验证，原账号容器/授权保留。payload2原位恢复和v1→v2混合链完成真实CLI/隔离PG验证。公网预算工具首请求502后已停，存在uncertain派发及冻结receipt，不能将公开0tokens当真实零用量，也不能把隔离绿等同真实云闭环；详见PROGRESS和本版部署记录。下面“未派发503/正在修OAuth”是先前版本事实。

最新更正：精确428164d47已部署Core.71/plugin.12/catalog.15、Worker.73及Controller.48。F-TASK-BUDGET/O-HISTORY的隐藏helper持久、整轮捕获/冷恢复、核心接线和幂等用量收据已实现并通过真实CLI接隔离假上游及真实隔离PG测试，不再属于“未建”。公开提供商验收仍在身份验证阶段503，未模型派发；已修Controller路由缺失，正在修OAuth identity载体。不能将源码和隔离测试直接算真实云验收。当前状态以PROGRESS与PUBLIC-HELPER-BUDGET-CORE-0.1.71为准，下面逐项表是历史盘点快照。

后续更新：核心 `.68` / Worker `.69` / catalog `.12` 已部署。原引用空数组续聊 502 修复已真实复验，图片/文档/引用续聊三次均 200，原引用完整恢复；完整 pinned MCP 搜索一次真实 200，精确引用键与调用顺序验证通过。见 `.69` 验收证据。以下表格保留最初盘点时间点，不能再把已关闭的 citation 缺陷当成当前线上失败。后续确认普通 API format+全 eager forced 被旧 synthetic 判断额外拒绝，正在独立修复，仍不得宣称全部完成。

2026-10-08；D:/projects/golang/sup2api。以原01功能目录、02 Worker实施要求、05协议范围及37F+8O当前目录复核。源码与作者/独审记录为实现证据；下表引用既有测试，不是本次重新跑过所有测试。当前已确认Worker.69/catalog.12的部署和真实验收；e463222dce5353b5e0bb6e95265bf9886efc0930包含completed历史、Sonnet cold pause和APIformat forced修复，正构建Worker.70/core.69，尚不将该候选视作已部署。

历史普通API阻断：.68原assistant citations续聊502已在.69部署修复并完成三次真实媒体/引用续聊200复验；原失败JSON不删除。[媒体记录](../../PUBLIC-MEDIA-CITATIONS-0.1.68.md)、[引用独审](../../CITATION-EMPTY-ARRAY-INDEPENDENT-REVIEW.md)。

真实Web/图像/文档首次、同消息5Read、MCP和inline内部发现见[公开验收](../../PUBLIC-ACCEPTANCE-0.1.68.md)与[.69媒体/pinned](../../PUBLIC-ACCEPTANCE-0.1.69.md)、[Web验收](../../PUBLIC-WEB-ACCEPTANCE-0.1.68.md)。与现版本未测到的资格/计费效果区分，不能把没有真实资格证据自动叫bug。

本轮补做线上视觉检查时，CUA 创建隐藏站点页 30 秒超时并重置内核；随后一次 `getState` 在 15 秒超时。没有取得 DOM/截图，不能将这两次工具调用称作前端视觉验收；暂按已有组件测试和服务目录证据记录。

## 逐项证据

表内CLI指真实CLI接隔离假上游；history矩阵只代表对应专项已经覆盖的场景，不推导所有两两组合。所有进度/独审文件均在本目录。

|项目|实现状态|隔离CLI/history或存储证据|真实提供商证据|未闭环或不等价边界|
|---|---|---|---|---|
|F-SAFEGUARDS|opaque/ID/schema保真，限定身份|SAFEGUARDS、MCP组合CLI；非全组合|尚非完整classifier真实验收|改名/server/internal执行上下文未闭环|
|F-MODEL|别名/实际模型映射与权限|多模型/请求计划|21/22短答及公开Opus5.5|其他模型资格未逐项测，不是bug|
|F-LIMITS|正数精确保留，0预热桥接|LIMITS JSON/SSE/error；0禁止非法组合|普通正数已实际使用|0预热提供商验收未记录|
|F-STREAM|终态/扩展/usage/精度|多feature JSON/SSE及错误|公开SSE及MCP真实delta|有状态资源/拒绝适配有界缓冲，非全实时|
|F-SYSTEM|top/inline位置与effort|MESSAGE-FEATURES新/续/分支/cold|本地CC/per-turn日志|签名前缀变更兼容仍需条件判断|
|F-MESSAGES|native及response-only恢复|多feature新/续/回退/cold|真实Read五调用两轮|e463限定Sonnet cold pause已独审，候选未部署；复杂组合保留gate|
|F-THINKING|模式/签名/绑定参数|THINKING-OUTPUT矩阵|普通实际thinking块；非所有模式|不能以fake签名证明真实绑定有效|
|F-OUTPUT|真实API格式约束|THINKING-OUTPUT新/续/终态|公开结构化成功|旧synthetic格式流程不是普通API缺口|
|F-SAMPLING|原数值主请求plan|请求控制隔离wire|无独立真实采样实验|模型互斥不改参数，资格未知|
|F-STOP|stop与stop_reason返回|请求计划/response|常规end_turn，未穷举停词|真实跨chunk停词验收未单列|
|F-METADATA|原metadata/缺省CC身份|metadata外层CLI与多流程|本地CC正常调用|不作为用户权限证明|
|F-CACHE|位置TTL/4断点/automatic/内部ledger|48内部CLI+inline40含无cache|显式缓存读token有真实记录|不等于本地prefixhit；旧synthetic仍gate|
|F-DIAGNOSTICS|core有界持久binding+grant|双Worker/cold/key轮换+0042DB|真实第二请求diagnostics对象/refusal200|跨issuer同workspace无可信证明|
|F-TOOLS|native精确schema及MCP映射/Mod|原生/多工具/精度/history矩阵|同响应5Read+5结果+5marker PASS .68|只证明同消息调用，不证明IO时间重叠|
|F-TOOL-CHOICE|auto/none/named/eager any已在.69；e463新增APIformat组合候选|named9+any10隔离CLI|未真实forced资格；Opus5.5不支持forced|general deferred/internal组合仍gate|
|F-TOOL-SEARCH|API及内部搜索|API/内部48/inline40|inline实际内部2轮日志PASS .68|pinned MCP已在.69真实search→MCP往返通过；动态未pinned仍gate|
|F-TOOL-STREAM|delta/empty/大整数|工具stream与exact账本|MCP8delta含空增量真实PASS .68|不同提供商粒度不保证一致|
|F-CITATIONS|delta/来源恢复；空数组补丁已在.69|旧媒体矩阵+新8CLI，独审8CLI|媒体3请求200且引用精确slice/历史还原PASS .69；.68失败保留|该确定缺陷已闭环；不推广所有引用组合|
|F-IMAGES|base64/URL/file/变换|MEDIA/FILE多流程|16x16红PNG识别PASS .68|不能推广所有URL/PDF/图像大小|
|F-DOCUMENTS|text/PDF/URL/file/content|MEDIA/FILE新续回退cold|text文档事实和引用PASS .68|text引用续聊.69闭环；PDF/URL全部组合未实测|
|F-FILES|CRUD/ACL/expiry/固定issuer/产物|资源CLI+真实LinuxDB|22直接及公开Files上传读删|21资格不同；未知结果恢复仍显式状态|
|F-SKILLS|custom版本CRUD/builtin容器|Skills10CLI+版本DB/独审|builtin版本解析和container；执行限流|资格/产物未全面真实验证|
|F-WEB-TOOLS|search/fetch/pause/PTC|WEB/server/history矩阵|各1真实调用结果+2/1引用PASS .68|dynamic filtering/PTC组合未全实测|
|F-CODE-EXEC|执行块/容器/产物归属|CODE-EXEC/DB/history|真实工具too_many_requests非执行成功|提供商资格限制，不以本地Bash替代|
|F-PTC|父子ID/容器持久账本|cold/rollback/credit+DB|未有真实完整父子执行成功证据|不能将代码接线当云执行成功|
|F-ADVISOR|嵌套模型权限与补充计费|ADVISOR/多模型JSONSSE|无完整真实模型/账单核对|资格/价格事实未全验，不猜免费|
|F-CLIENT-TOOLSETS|typed身份/位置/活跃状态|typed新续回退coldSSE|未逐toolset真实验证|e463完成direct历史保原值候选，不注册工具、不猜定义|
|F-MCP|connector/inline/秘密/pinned已部署.69|MCP14+新pinned8CLI独审|匿名DeepWiki .68；pinned搜索引用+MCP真实往返PASS .69|未pinned动态deferred仍缺确定目录|
|F-CONTEXT|编辑策略/null/applied_edits|CONTEXT-COMPACTION12CLI|无超长真实编辑效果全验|不能把参数接收当编辑效果证明|
|F-COMPACTION|两代/签名/toolchanges/usage|context及timeline/账务测试|无完整真实压缩费用核对|fallback摘要每attempt归属尚无合同|
|F-INLINE-TOOLS|位置时间线/custom内部/MCP|timeline40+内部40+MCP矩阵|custom内部发现+handoff真实PASS .68|native/server/typed/safeguards内部组合仍gate|
|F-FAST|管理员许可及实际usage事实|FAST/请求隔离|无完整真实fast价差证据|资格未验不是协议实现bug|
|F-TASK-BUDGET|单主请求原值；内部仍拒|预算6CLI+12历史gate例|无真实预算倒计时可见字段|缺持久隐藏helper历史，不应猜扣remaining|
|F-FALLBACK|显式链/credit/替换计费|fallback/credit34s+0041DB|真实发行/兑换/退款未完成|default动态授权与compaction归属未实现|
|F-ROUTING|geo/tier/资源及多模型亲和|COUNT-ROUTING/核心HTTP|普通路由真实通过|不能声称区域存储驻留|
|F-COUNT-TOKENS|原客户端body真实count端点|长history/错误/资源CLI|公网count200 .65后已验|不是CC增强prompt生成账单估算|
|F-OTHER-APIS|strict Chat/Responses共享codec|JSONSSE12核心HTTP+strict33|公开Chat/Responses成功|stored IDs/background/Batches独立产品未建|
|O-REGISTRY|单源catalog/版本握手|features/前端tests|线上.12；e463含后续能力候选|目录状态不代替账号资格|
|O-HISTORY|checkpoint/sidecar/账本|多feature矩阵+LinuxDB|Read/inline/diag真实；引用续聊.69恢复成功|预算隐藏history仍缺，禁止称全部cold等价|
|O-ATTACHMENTS|分类/未知策略/cwd平台独立|Windows/Linux+system回归|真实CC附件唯一与原尾TAB保留|macOS未充分验；cwd是提示非真实容器目录|
|O-ERRORS|refusal200/原错/usage分离|取消/EOF/错误/资源信用tests|真实refusal正常；引用502非误称拒绝|没有最新所有组合真实取消全矩阵|
|O-LOGGING|逐request/阶段/脱敏/溢出|日志与资源secret测试|本轮多次日志成功关联|不能保证未来新secret字段自动安全|
|O-UI|分菜单/独立字段/registry|组件tests/typecheck本地视觉|线上API目录确认|原CUA受限，不冒充全线上视觉验证|
|O-PROTOCOLS|共享codec与独立资源端点|legacy/strict/资源回归|Chat/Responses/Files公开通过|异步持久产品未建不伪装|
|O-VALIDATION|分批Git构建/原容器保留|118 Linux697为当时SHA；后续定向|.68 Read/MCP/Web/图像/文档事实|后续SHA不借旧697称全量重跑|

## 决定后续必需工作的分层

1. **必须修复并复验现有普通功能**：citation空数组续聊已在.69闭环，保留失败/成功两份证据。新只读候选为safeguards旧wireName历史假设及零helper eager forced预算过宽gate，见最新scope审阅；未测试前不标已修。
2. **仍缺兼容实现，不能结项为天然不兼容**：task_budget+隐藏内部轮次跨HTTP/cold恢复（不是每轮扣预算）；general deferred forced阶段合同；fallback default动态授权/定价；fallback compaction每attempt归属；动态未pinned MCP发现身份。后三者仍欠可靠协议合同，接受后猜模型/价格/身份不可行。
3. **计划内独立产品而非普通Messages转换**：Responses stored IDs/background与Batches；持久资源、状态机及权限未建，目录明确拒绝。用户原goal若包含这些端点，不能因converter完成就称它们完成，需要独立范围与实现。
4. **非错误的边界**：新模型普通文字prefill官方不支持，合法pause_turn另列；跨issuer无法证明同workspace不可强行继承diagnostics/签名；不能以本地Bash/Skills、文本抽取或估算token替代官方语义。
5. **验收欠账但不是代码故障结论**：真实复杂账单、技能/代码执行资格、超长context、所有取消并发组合、macOS。02原设计要求“每项每组合”矩阵极广，现记录是分feature和高风险组合，不能概括为所有组合已覆盖。没有新实验支持时应写未验证，而非臆造失效。

## 新/冷/回退遗漏风险重点

- 引用本次证明旧fake响应未带start.citations=[]掩盖真实形态；新增fake涵JSON/SSE新/续/cold/branch，独审8次6.180s。未来response中合法空壳字段不能简单当非法冲突，也不能通用忽略改变；须每字段有证据。
- task_budget公开客户端收不到隐藏helper历史，本地prefix可见不等于冷Worker可恢复；方案已明确相同公开内容多隐藏分支歧义、owner/issuer固定、过期/缺失拒绝，尚未实施。
- pinned MCP响应发现仅当前响应有效，历史按位置计算且withdraw不能复活；作者/独审8CLI不代表真实provider引用编码已验。动态目录不在本候选支持范围。
- 没有在本次只读盘点中发现另一项能由现有证据直接证明的、被文档漏记的普通API阻断。这个结论不是全代码无bug保证，也不是把未测试高级组合裁出原goal。
