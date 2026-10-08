> 历史快照归档：2026-10-09 交接整理前保存。正文包含不同日期的候选、失败和已过时状态，不代表当前实现或线上版本。当前状态以 [接手文档](../../../HANDOFF-2026-10-09.md) 和 [当前进度](../../PROGRESS.md) 为准。归档只调整相对链接，保留原有结论和证据。

# CCGateway 特性支持：完整实施文档入口

编制日期：2026-10-08（Asia/Shanghai）。状态：**调研方案已进入分批实施，尚未完成全部特性；当前实现、验证与部署状态以[实施进度](../../PROGRESS.md)为准。**

## 目标与范围

将能通过 Claude Code 保持 API 语义的功能逐项补齐：每项都有明确的输入、CLI/env/Mod/relay转换、响应、历史、账号限制、前端说明与验收。自然支持的能力说明即可，不为每个参数制造开关。需要专门适配的能力完整登记，不能仅以增加beta名字或接受字段为完成标准。

主要契约为Anthropic Messages。其他API端点及可转换协议也登记其候选路径、服务依赖和不可等价边界。“全部”指核验日目录无未归属的协议功能、可行项都有实现任务和验收，**不意味着CC拥有所有外部API产品，也不意味着滚动文档中新出现的任意特性自动支持**。

来源基线为官方API、Agent SDK、Claude Code配置/兼容文档，当前仓库`0aa878be9ae6f7b5d327cf1900bccbe7f76347f8`加已有工作区，以及同一会话上一调查轮的真实CLI 2.1.292隔离抓包。本轮不替代生产状态核验，不修改原迁移/交接文档。

同时原样归档[2026-10-07旧交接文档](../../../../ccgateway-migration/HANDOFF-2026-10-07.md)。它是修复前的历史快照，其中“Worker不能调用”“建议放弃Worker”“唯一可信”等表述不代表当前状态或本方案指引；后续修复和部署记录见[REPAIR-2026-10-07.md](../../../../ccgateway-migration/REPAIR-2026-10-07.md)，当前源码与新的实测证据优先用于判断现状。

## 阅读顺序

1. [完整功能目录](../../../01-FEATURE-CATALOG.md)：所有已核验Messages顶层字段、工具/内容/响应类型的功能归属、beta及条件限制。
2. [Worker实现与转换](../../../02-WORKER-IMPLEMENTATION.md)：当前代码位置、缺口、RequestPlan、CLI/env/Mod/出站/返回/历史的实现方式。
3. [前端特性支持](../../../03-FRONTEND-FEATURE-SUPPORT.md)：统一功能目录与详情、真实状态、管理员策略、保存/版本兼容和紧凑布局。
4. [验证与上线门槛](../../../04-VALIDATION-AND-ROLLOUT.md)：证据分层、11组既有CLI实验、失败测试解释、12类回归、批次与部署边界。
5. [协议范围与产品边界](../../../05-PROTOCOL-SCOPE.md)：Messages/count_tokens/models/files/batches等入口、其他协议转换候选及不等价能力。
6. [脱敏CLI抓包摘要](../../../evidence/cli-wire-2.1.292.json)：保留原始观测参数，不把假上游OK当官方能力通过。

## 已确定的产品设计

前端将「请求与工具」统一为 **特性支持**。不再用请求头参数/请求体参数两个大块拆开同一功能。

每个功能一处入口，详情包含：用途、实际支持范围、客户端怎么请求（头+body+相关块）、Worker怎样处理、条件/限制、验证证据，以及真正需要的管理员策略。示例：工具搜索同时展示工具定义、defer_loading、旧beta兼容、ToolSearch环境变量、server-tool引用/历史能力；不是多个互不关联的开关。

- 自然支持：说明与证据，没有虚构开关。
- 已适配但有条件：显示模型/账号/CLI/provider限制及实际生效策略。
- 部分适配：明确哪一部分可用、缺哪一段，不能显示完整支持。
- 未验证：不等于可用，也不等于明确不支持。
- 不可等价/当前不支持：给原因、明确错误和实施/替代路径。

列表紧凑分页、搜索筛选、侧边详情，保留附件与环境、部署与运行、账号容器独立菜单；镜像不一致只提示，配置保存不自动替换或重启容器。

## 文档间统一约定

- 功能ID使用目录中的`F-*`；它是注册表标识，不作为客户端Messages新增参数。
- `F-TOOL-SEARCH`包含`cc_internal`和`api_server`两个子能力，分别评估，UI只有一处入口。
- catalog/schema/probe版本分离。特性目录不与用户策略一起提交；运行时能力不能从镜像tag猜测。
- API到CC交互逻辑归companions/engine及Mod，控制器不转模型body；平台插件/核心管理策略与路由。
- 客户端API语义不能变成任意CLI参数、环境变量、MCP配置或鉴权覆盖入口。
- 新接口、类型名及模块拆分均为建议契约，代码评审时定稿；文档出现不代表接口已存在。
- 批次与总体验收以04为准。P0先防止签名/前缀破坏和错误请求改写，P2才开放完整新绑定特性。

## 逐功能实施追踪

以下所有复选框是**本方案的完整验收**，不是说对应现有能力全部不存在。实施后逐项补commit/证据/当前限制再勾选；不能凭一个总测试通过批量勾选。更细输入字段与类型见01。

### 基础请求、推理与输出

- [ ] F-MODEL：模型/窗口/alias/运行时能力，实际模型回传。
- [ ] F-LIMITS：正常max_tokens、裁剪差异、零token预热的独立可行性。
- [ ] F-STREAM：JSON/SSE、新块与delta、ping、停止原因、错误、usage。
- [ ] F-SYSTEM：顶层/会话内system、clear_at、按消息effort及attribution。
- [ ] F-MESSAGES：角色/块顺序、prefill条件、完整导入/续聊/回退/分支。
- [ ] F-THINKING：所有适用模式/display/预算/签名/绑定/transformations。
- [ ] F-OUTPUT：effort、API格式约束与CC结构化工作流、strict工具区分。
- [ ] F-SAMPLING：模型允许的采样及非法组合，不静默删除。
- [ ] F-STOP：生成阶段停止词与stop_sequence完整回传。
- [ ] F-METADATA：显式客户端归因主请求原样透传、缺省保留 CLI；HTTP 授权独立。隔离验证后仍需真实账号确认，不再无依据拒绝不同 user_id。
- [ ] F-CACHE：逐块断点/混合TTL/顶层缓存，区分本地历史和上游账单。
- [ ] F-DIAGNOSTICS：实际message ID映射与cache诊断。

### 工具、媒体与资源

- [ ] F-TOOLS：客户端原生/MCP/自定义路由、完整工具元信息及结果。
- [ ] F-TOOL-CHOICE：选择/强制/并行限制的真实约束与模型错误。
- [ ] F-TOOL-SEARCH：两个子能力分别验收及完整tool_reference往返。
- [ ] F-TOOL-STREAM：全局兼容beta和per-tool eager_input_streaming。
- [ ] F-CITATIONS：已有支持保留、文档/检索源与索引/流增量闭环。
- [ ] F-IMAGES：base64/URL/file等适用来源和不失真转换。
- [ ] F-DOCUMENTS：PDF/文本/content sources及引用，不能只提取文本假兼容。
- [ ] F-FILES：资源归属、生命周期、上传下载与账号调度。
- [ ] F-SKILLS：API容器技能与CC技能的能力边界及适配。
- [ ] F-WEB-TOOLS：官方版本化Search/Fetch、结果/错误/引用。
- [ ] F-CODE-EXEC：服务端执行、文件产物/容器/usage，不变成本地Bash。
- [ ] F-PTC：allowed_callers/caller/container及返回路由。
- [ ] F-ADVISOR：嵌套调用、结果类型/用量/历史。
- [ ] F-CLIENT-TOOLSETS：各类官方客户端工具schema、toolset_name联合身份。
- [ ] F-MCP：API connector与客户端MCP命名分别实现和说明。

### 上下文、服务约束和端点

- [ ] F-CONTEXT：各编辑策略、applied_edits和真实上下文。
- [ ] F-COMPACTION：分代API、互斥、压缩返回与后续回放。
- [ ] F-INLINE-TOOLS：引用/内联增删工具，按历史位置生效。
- [ ] F-FAST：请求/策略/资格/实际speed及费用。
- [ ] F-TASK-BUDGET：合法total/remaining、产品可用性冲突核验。
- [ ] F-FALLBACK：服务端fallback/credit、真实模型/usage、账号绑定。
- [ ] F-ROUTING：地域/tier/workspace/profile的约束与授权边界。
- [ ] F-COUNT-TOKENS：独立端点、输入一致、估算含义、上游认证可行性。
- [ ] F-OTHER-APIS：05中逐端点结论；外部产品边界不能伪造实现。

### 横向任务（所有特性共同依赖）

- [ ] O-REGISTRY：单一能力目录、RequestPlan、版本、模型/认证条件。
- [ ] O-HISTORY：派生JSONL与原始历史映射、并发、签名前缀、跨账号限制。
- [ ] O-ATTACHMENTS：已有附件三选项修复合入、cwd/platform独立、未知附件策略。
- [ ] O-ERRORS：正常200 refusal、真实错误/重试语义、不可用功能不误冷却账号。
- [ ] O-LOGGING：每请求完整处理索引、脱敏/权限/容量/溢出状态、仅Worker落盘。
- [ ] O-UI：统一特性支持、能力评估、dirty保存/迁移/旧Worker、紧凑可访问布局。
- [ ] O-PROTOCOLS：明确端点覆盖与其他协议转换子集，不能把空框架当实现。
- [ ] O-VALIDATION：修复缓存fixture、12类回归、API Key/OAuth与线上路径分层证据。

## 重要调查纠正和阻碍

1. 上一轮CLI task-budget=12000被发出，只证明传输；官方最小值20000。官方专题还声明CC/Cowork surface不支持，不能据SDK字段存在推断OAuth可用。合法值与认证路径须另测。
2. thinking绑定涉及前缀和部分模型的账号归属；重建历史、工具重命名、改变附件以及换号都可能影响。不能靠去掉签名使测试变绿。
3. 主请求/分类器/内部轮次不能只按URL辨认；新参数改写前必须建立可信关联，防止误改安全分类器请求。
4. 真实CLI既有长测试在旧缓存namespace断言处失败，尚不能解释为生产续聊故障；但后续场景未跑，不能宣称整项通过。
5. task budget、server tools、compaction等条件能力，必须请求/返回/历史都可承载才开放；增加beta或者RawJSON存储不能自动解决CLI执行兼容。

## 维护与评审

本轮由API目录、Worker源码、前端契约三个agent分工，主agent合并协议范围、证据、验收并交叉审阅。修正了Tool Search标识与JSON路径、task budget非法样例、批次冲突、toolset联合身份和主请求识别遗漏。

后续每次CLI/SDK/官方schema升级，比较新旧字段/枚举/工具版本，将新增项归入既有feature或新增ID，补不兼容判定和回归后再发布。官方文档互相矛盾时保留原链接及差异，不选择较宽松描述当作实现许可。

这套文档不承诺完成日期，不记录虚构覆盖率。01–05保留原调研和实施设计基线；后续实现、测试、失败、评审和部署证据持续记录在[实施目录](../../PROGRESS.md)，不能把方案描述当成已上线能力。
