# 持久 helper 历史：Worker B 方案与进度

状态：开发中，未接公开准入、未部署；既有 general forced/budget gate 保持关闭。A持久账本、B Worker、C核心载体通过共享contracts/helperhistory协调，不分别发明格式。

## 合同与首阶段

采用v1 whole-message pair：AfterMessage为原public消息0-based边界，同anchor按segments顺序；PublicAnchorDigest来自共享CanonicalDigest(public prefix)，ToolCatalogDigest来自原tools数组（保留数值lexeme和数组顺序）。混合public可见块overlap不能用消息边界假装恢复，首批明确拒绝。签名或非helper块不删，不以工具名前缀猜权限。

B先实现独立纯捕获/恢复codec及测试：从已归属主模型完整SSE获得helper assistant事实，再与随后已归属主请求中的实际helper result精确配对，复用既有internalCacheRounds身份/工具引用验证。没有原始provider事实不能捕获，公开客户端提供的相同ToolSearch块不能产生可信记录。

恢复在原public前缀/目录/位置/ID全部匹配后一次性插入，原Request.Messages、客户端缓存断点和预算值不改；namespace必须绑定可信chain，避免同public前缀不同隐藏历史串缓存。运行时current helper ledger与导入旧ledger区分，不把旧工具搜索结果当新执行。未知重排/工具目录变化没有逐位置证据时明确拒绝。

## 与C待落载体

约定方向：已认证Worker接口私有opt-in单值header，request envelope携带version/attempt/requestdigest/namespace/原RawMessage request与有界history；core无条件剔除用户伪造载体。response私有JSON envelope携带真实public body精确bytes（JSON或SSE）、status/content_type及delta，不能将32MiB数据塞header。整体大小要限制，不允许512条链各32MiB累加无限。正常未opt-in请求不buffer；失败不能伪造提供商成功或丢真实usage。具体DTO由C统一落contracts。

## 验证计划

纯函数先测大整数、数字lexeme、重复键、相同文本不同ID、catalog/anchor不符、两请求状态隔离、整对缺失和失败原子性；随后已认证runtime hooks测试与实际CLI假上游JSON/SSE、新/外部结果续/普通续/cold/rollback，最终ABC联调前仍不打开general gate。不得向实际提供商重试或改线上。

## B 纯 codec 与运行时阶段（候选）

纯codec已获A作者独立复核：完整隐藏消息可包含planning text、thinking原签名及redacted_thinking；不是看到非tool_use就视为public overlap。原始已归属provider message ID/content hash与runner endSearchRound实际整消息buffer丢弃确认同时成立，才可捕获；混合客户工具、未知server块、未确认/错ID/签名变更均拒。隐藏消息envelope仅允许已证明的role/content，未观察的output_config/clear_at不能偷偷进入持久记录。

私有carrier使用C共享DTO。Worker校验既有认证、单值开关、原request摘要、实际CLI版本/映射model/可信policy重新计算namespace；锁定实际issuer authority到完成，拒资源/credit/MCP复杂组合，活跃同attempt拒409。原私有JSON不送provider，public响应原status/body/safeheaders包回；JSON/SSE有界32MiB。捕获或buffer失败使用capture_failed，原已观察的public聚合usage通过AccountingEvidence保留Known/Complete，不把未知写成完整0，不返回截断的成功body。

恢复使用共享alignClientHistory返回的真实消息边界（CLI可能插入系统行），不按数组长度猜位置。原系统行保留，不把它们误认helper pair。原Request.Messages/客户cache断点/预算不改；本地缓存namespace另绑定可信chain摘要。general forced/task_budget等既有gate尚未开放。

实际CLI2.1.292隔离矩阵：JSON/SSE各新建（内部发现+外部tool交还）、外部tool_result续聊、普通续聊、新cache、回退；合12次fake提供商调用，包含原签名thinking与planning text整轮捕获/恢复，11.350s通过。全engine4.137s/vet通过。新增入口负例覆盖认证/多头/摘要/路径/资源/credit/namespace变化/并发同attempt；数值usage及32MiB失败边界有独立单测。未做真实provider请求、未部署，ABC仍待整合。

### 独立保留的初始 thinking 红例

`engine/helper_history_cli_test.go` 的 `TestProbeHelperInitialThinking` 是显式opt-in红例：设置CCG_REAL_CLI及CCG_PROBE_INITIAL_THINKING=1，仅运行该test。假上游把非空thinking与原signature直接放content_block_start、随后block_stop（无thinking_delta/signature_delta）。CLI下轮history与原source不同，当前严格拒绝，不能凭空重写签名或默默删块。标准delta/signature_delta矩阵正常通过；此初始编码是否为必须兼容的合法API输入交root独立核验与专门bridge修复，未将红例删除或当成已支持。

## 部分计量补齐

新增每个原始已归属main响应独立AccountingCall，只读真实message_start/message_delta用量投影和真实message_stop；完整公共聚合优先，失败时才选provider_calls分组，二者互斥，不能平铺多个call覆盖或把公共累计与源调用重复相加。失败整体Complete=false，已结束的前一调用可单独Complete=true；未结束调用保留实际已知字段，缺失/空usage不伪造0。

TestHelperHistoryFailedNextWireKeepsConsumedUsage：完整helper真实原始SSE→已隐藏确认→下一wire工具结果ID变更拒绝，前轮20input/8output仍保留，不能因为公共502没有usage便丢掉已发生消耗。另测第二调用17input尚未终态、数值9007199254740993精度及公共完整聚合优先不双计。

TestRealCLIHelperHistoryPartialUsage：JSON/SSE两种客户端协议，首helper调用正常，第二提供商调用message_start后直接断流，不补造终态。四次隔离调用总3.843s通过，每请求恰2次无重发；原inner502保留，Accounting.Source=provider_calls、Known=true、整体Complete=false、首call完成/次call未完成，20/8与17真实事实分别保留。该正常失败不必伪装为capture_failed，核心需对任何失败响应读取已携带计量事实。

## 原位 system 独审修复（替代上文仅 pair/忽略 system 的中间实现）

独审确认：CLI 在原 public user 与隐藏 ToolSearch assistant 之间加入非空工具目录 system。最初过滤该行会丢失持久历史语义，插入旧 pair 又会改变原顺序，两个独立红例已保留。未将其解释为空壳。尚未发布的 v1 现支持 leading system + 完整 assistant/user 对；pair 内部或尾部悬空 system 仍明确拒绝。

捕获需要双证：本请求首个已归属 main 在同 public 边界实际出现的完整 system，加后续原始 provider SSE 与 runner 整轮隐藏确认。未观察、改文、改位置、额外 envelope 控制字段不能导出。CLI 2.1.292 首轮单 text block + ephemeral cache_control、后轮同原文 string 的窄转换仅用于来源证明；不是缓存等价规则。保存的是后轮实际完整对象，绝不复制旧缓存标记。陌生 block 字段、cache 类型/TTL、多文本块转换均拒绝。

重放保留原 system 对象与位置，在同 public 边界若 CLI 再生完全同对象则精确替代该前缀避免重复；不删除或移动其他 public system。新运行时不同 system 明确拒绝。原始消息、公共前缀摘要、工具目录、签名及已保存 cache_control 保持原值。

增量验证：JSON/SSE 新/外部结果续/普通续/cold/rollback 的12调用矩阵加入原 system 对象 hash 和紧邻 helper 的原位置断言，通过。两个独立 system 负例及作者窄转换负例通过；全 engine 4.307s、contracts/helperhistory 1.412s、vet 通过。初始非空 thinking 桥已由另一代理修复并独立通过，不再把前文 opt-in 红例当当前永久限制。

仍需跟踪：与部分计量联合跑曾一次出现断流后第三次上游请求（原预期2），单独重跑通过；该偶发结果已告root和独审，不能由重跑绿抹去。当前能力仍不开放，未部署、未真实provider调用。

## ABC 预算可信载体窄接线

核心首次托管由 task_budget 触发，而旧 Worker 解析在最终 helper admission 前拒绝全部内部工具预算，故先前纯载体矩阵不足以证明真实 ABC 入口。新增内部 parsePolicyRequestWithHelper，仅接 serveHelperHistory 完成 Worker 身份、单值header、原摘要、namespace和实际issuer锁后设置的 execution.authenticated。普通 parser 始终传nil，count入口也不传；原始header不能生成授权。解析仅为可信执行允许内部ToolSearch预算，最终 native mapping 后仍完整执行 admitHelperHistory，复杂组合/无效历史不绕过。legacy synthetic、公开general gate与capability宣告未放开。

TestRealCLIHelperHistoryTaskBudget：JSON/SSE、新/外部结果续/普通续/cold/rollback，12次隔离提供商调用11.171s通过；每轮验证task_budget total=20000、remaining=11000原值，网关不按自己猜测递减。未认证execution/裸伪造header/最终history校验/缺官方beta单测通过；全engine4.311s及vet通过。独审已启动，C另跑真实核心+Worker+CLI+隔离DB集成，本节不是ABC全链完成证明。

## .15 功能目录与只读 UI 候选

已确认目录从2026-10-08.14升级为候选.15。扩充原F-TASK-BUDGET/F-TOOL-SEARCH/F-STREAM/F-CACHE说明，保持partial及runtime_verified=false：核心托管与实际Worker协议v1必须同时具备；首次task_budget建立链、已知链普通续聊、绑定与冷恢复、提交前缓冲及本候选尚未开放组合均说明，不新增重复开关。默认存储预算只作为默认值说明，不冒充实时账户剩余额度。

WorkerCapabilities.vue读取可选helper_history_schema_versions，缺失/空数组显示“未声明”，非法/重复/越界声明拒绝；只读行明确不确认核心启用或提供商资格。中英文同步。原“通用API特性 / CC特性”分区未改，FeatureSupport仍同一功能聚合body/beta/机制和条件。

前端两文件20测试通过（2.64s），vue-tsc -b通过；contracts/features测试1.255s通过。app.EnableHelperHistory及Workeradvert字段均未激活；目录/UI可复核，不代表ABC或线上功能已启用。

## 新链启动判定：复用 Worker 原解析器

独审发现核心不能将所有task_budget请求都包装为托管：零helper、显式eager强制选择、API server tools及这些路径的合法旧历史应保留原行为。新增只读POST /internal/helper-history/requirement，复用完整普通解析器，不在核心或contracts复制工具/策略/beta规则。必须实际非空Worker调用key，单次原body上限32MiB；在diagnostic/carrier/runtime之前返回，完全不启动CLI、不核issuer、不访问provider、不写文件。

shared DTO由C统一：ordinary表示原纯解析通过；仅稳定typed helperCustodyRequiredError映射needs_custody；非typed失败返回defer_to_ordinary，意味着不具备最终准入结论（例如资源授权上下文尚缺），由原主路径再次完整裁决，不能当作合法证明。legacy synthetic错误不归类为需要托管，普通直连预算门禁未绕过。known链始终强制托管，不使用这个新链探针降级。

作者矩阵含旧history、零工具、deferred、关闭搜索、eager any、server工具、缺beta和非法预算；nilRunner/resources/cache/slots且日志目录为空证明探针无运行态依赖。TestRealCLITaskBudgetCompatibility每轮先得到ordinary，再用原无载体请求完成新/续/改预算/回退/cold/SSE六次隔离CLI调用，预算和beta原样，无私有载体泄漏，目标测试5.713s通过。全engine4.479s、vet通过，已交独审。没有部署或真实模型请求。
