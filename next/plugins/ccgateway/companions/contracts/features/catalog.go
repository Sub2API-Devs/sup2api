// Package features defines the data-only feature contract shared by the host
// and its Worker. Catalog entries describe code, never deployment or account
// entitlement. Runtime evidence must be reported separately.
package features

const CatalogVersion = "2026-10-11.7"
const PolicySchemaVersion = 1

type Feature struct {
	ID           string   `json:"id"`
	Title        string   `json:"title"`
	Category     string   `json:"category"`
	Scope        string   `json:"scope"`
	Status       string   `json:"status"`
	BodyPaths    []string `json:"body_paths"`
	BetaHeaders  []string `json:"beta_headers"`
	Mechanisms   []string `json:"mechanisms"`
	Reason       string   `json:"reason"`
	Requirements []string `json:"requirements,omitempty"`
}

type Document struct {
	CatalogVersion      string    `json:"catalog_version"`
	PolicySchemaVersion int       `json:"policy_schema_version"`
	RuntimeVerified     bool      `json:"runtime_verified"`
	Features            []Feature `json:"features"`
}

// Catalog returns a fresh value. The frontend does not maintain a second
// feature whitelist, and the host never infers Worker support from image tags.
func Catalog() Document {
	return Document{CatalogVersion: CatalogVersion, PolicySchemaVersion: PolicySchemaVersion, Features: []Feature{
		{ID: "F-SAFEGUARDS", Title: "工具安全审查", Category: "CC 执行上下文", Scope: "cc", Status: "partial", BodyPaths: []string{"safeguards", "safeguard_results", "tool_use.id"}, BetaHeaders: []string{"dangerous-tool-use-2026-09-03"}, Mechanisms: []string{"CLI EXTRA_BODY", "客户端工具身份校验", "CLI stream_event 审查结果"}, Reason: "显式 safeguards 通过原生请求表达，响应审查结果从 CLI 事件读取；未传时保留内层 CC 审查。内部 ToolSearch 与客户端工具仍受身份及组合准入约束，不修改审查结论或授予本地执行。旧 relay 的纯 mcp_servers 上下文保真与任意客户端工具定义还原不再是当前能力；服务端 MCP、inline、typed 等限制仍生效。真实提供商审查资格与效果需单独验证。"},
		{ID: "F-RELAY-NATIVE", Title: "CLI 原生 HTTPS", Category: "CC 执行上下文", Scope: "cc", Status: "partial", BodyPaths: []string{"relay_mode"}, BetaHeaders: []string{}, Mechanisms: []string{"固定 native 执行契约", "主 Runner 不建立 HTTP relay", "CLI 参数与 Mod EXTRA_BODY", "CLI stream-json 错误与用量观测"}, Reason: "native 是唯一模型执行路径，所有账号一致；历史配置读取时归一为 native，API 不接受显式旧模式。Claude Code 原生 HTTPS 发起主模型请求，按 CLI 语义输出规范化错误与可观测用量，不提供原始 HTTP headers/body，也不承诺原始状态码、错误体或订阅限额头完全透传。CLI 特性恢复（包括 400 恢复重发）、内部工具轮与显式模型回退可能产生多次请求；不存在旧 HTTP relay 回滚或重试路径。客户端参数通过 CLI 与 EXTRA_BODY 表达，无法表达的功能拒绝；count_tokens、服务端工具、MCP connector、typed 工具集等准入限制不因 native 放宽。文件与技能资源使用独立的非模型管理 HTTP，不以恢复模型 relay 为前提。本目录其他条目的历史适配描述不能推导为 native 全支持，执行准入限制仍然生效。管理 HTTP、代理与 Mod 控制不属于已移除的模型中继。execution_modes 只声明 native；缺少该字段不能推定支持 native，声明也不是模型、提供商或实际运行验证。"},
		{ID: "F-THINKING-DISABLED-COMPAT", Title: "thinking disabled 兼容", Category: "CC 执行上下文", Scope: "cc", Status: "partial", BodyPaths: []string{"thinking.type"}, BetaHeaders: []string{}, Mechanisms: []string{"策略 thinking_disabled_compat（pass/omit）", "已验证模型清单", "决策记录 omit_unsupported_disabled"}, Reason: "默认 pass：thinking.type disabled 原样转发，不支持的模型与官方 API 一致返回 400。omit：仅对已验证不支持 disabled 的模型（claude-opus-5-5、claude-fable-5-1）不传 thinking，与官方 CLI 对它们的请求一致，不改成 adaptive，模型返回的 thinking 块原样透传。用于 cc-switch 等把 claude-opus-5 改写成 claude-opus-5-5、客户端仍发 disabled 的情况。此兼容策略用于 native 请求表达，不建立模型 HTTP 中继。"},
		{ID: "F-CLIENT-ATTACHMENT-ERASE", Title: "擦除客户端附件", Category: "CC 执行上下文", Scope: "cc", Status: "partial", BodyPaths: []string{"system", "messages[].content"}, BetaHeaders: []string{}, Mechanisms: []string{"策略 erase_client_attachments（按类型）", "按 Claude Code 渲染文本识别整段", "决策记录 erase / keep_whole_message"}, Reason: "默认不擦除：客户端附件原样上送。0.1.57 起可按工作目录、平台、模型说明、日期、会话上下文的子项分别配置，也可按整组擦除 environment（环境与环境更新）、model（模型说明）、date（日期与日期变更）、total_tokens_reminder（剩余 token 提醒）、session_context（CLAUDE.md、git 状态、邮箱等会话上下文提醒）。在准入前对 system 与 user/system 消息的文本块生效，后续历史、回退与重试看到同一份请求；规则固定，每轮擦除相同文本，提示缓存前缀保持稳定。只匹配整段/整行，正文中的提及不动；不会把 user 消息擦空（此时整条保留）。识别依据 Claude Code 2.1.288–2.1.296 的渲染文本，其他版本或改写过格式的客户端可能不匹配；图片、工具结果等非文本块不处理。"},
		{ID: "F-CLIENT-ATTACHMENT-REPLACE", Title: "客户端附件换成网关渲染", Category: "CC 执行上下文", Scope: "cc", Status: "partial", BodyPaths: []string{"system", "messages[].content"}, BetaHeaders: []string{}, Mechanisms: []string{"策略 replace_client_attachments（按类型）", "Mod prompt.attachment 上报容器 CC 渲染（渲染运行，回环端点，不访问上游）", "按（CLI 版本、模型、额外目录、1M 上下文、日期类为当天）缓存，Worker 运行期间固定", "决策记录 replace_gateway"}, Reason: "默认不替换。附件整组及其子项都可换成该 Worker 上 Claude Code 自己渲染的文字，原位替换，前后文字不动；客户端的环境更新（切换目录）与日期变更没有对应的网关文字，选中该项或其整组服务端策略时擦除；Worker 不渲染的类型（如没有 CLAUDE.md、git、邮箱时的会话上下文）直接移除。网关文字在首次用到时渲染一次并固定（日期按 Worker 当天，次日重新渲染），每轮相同，提示缓存前缀稳定；渲染失败时本次保留客户端原文，下次重试。识别规则与擦除相同（Claude Code 2.1.288–2.1.296 的渲染文本），不匹配的客户端原样上送。"},
		{ID: "F-ADD-DIR", Title: "额外目录访问", Category: "CC 执行上下文", Scope: "cc", Status: "supported", BodyPaths: []string{"additional_directories"}, BetaHeaders: []string{}, Mechanisms: []string{"CLI --add-dir 参数传递", "请求级目录授权", "Mod 配置透传"}, Reason: "支持客户端通过 additional_directories 数组传递额外目录，网关保留并通过 --add-dir 参数传递给 CC CLI。每个请求最多 100 个目录，自动去重并验证非空。目录路径由 CLI 验证和授权，网关不检查路径有效性。客户端 CC 自身的 --add-dir 目录出现在环境附件的 Additional working directories 中，随 workingDirectory 字段来源保留或去除（ccgateway 0.1.22 起）。"},
		entry("F-MODEL", "模型与上下文窗口", "基础请求", "partial", []string{"model"}, []string{"context-1m-2025-08-07"}, []string{"CLI --model", "上下文环境变量"}, "传入请求模型；可用模型、别名和窗口取决于账号与 CLI。"),
		entry("F-LIMITS", "输出长度", "基础请求", "partial", []string{"max_tokens"}, nil, []string{"CLI 输出预算与 EXTRA_BODY", "非流零 token 预热拒绝"}, "max_tokens 通过 CLI 与 EXTRA_BODY 表达，模型上限由上游检查。CLI 总是流式，非流式 max_tokens:0 在 native 准入时拒绝；显式流式零 token 交 CLI/上游处理，不承诺有效预热。旧非流 warmup 桥接及其隔离验证仅属归档历史。"),
		entry("F-STREAM", "流式与完整响应", "基础请求", "partial", []string{"stream"}, nil, []string{"CLI stream-json 到 JSON / SSE"}, "承载已准入的原生文本、推理、客户端工具与 WebSearch 响应；CLI 事件不是原始 HTTP 报文。WebSearch 主路径合并内部轮后输出，不承诺所有组合逐事件即时外发。旧 relay 的 Advisor/MCP/CodeExec/PTC、资源产物及 helper history 响应适配不构成当前支持，仍按 native 准入拒绝。"),
		entry("F-SYSTEM", "系统指令", "上下文", "partial", []string{"system", "messages[].role:system", "messages[].clear_at", "messages[].output_config"}, []string{"mid-conversation-system-clear-at-2026-08-21", "mid-conversation-output-config-2026-07-01", "per-turn-control-2026-07-01"}, []string{"原生历史", "CLI system 输入与 Mod"}, "文本与会话内指令保留语义，不复原 HTTP 字段位置。clear_at:next_user_message 在后续任意 user（含纯 tool_result）失效；inline effort 在新输入 user 后生效。内部 ToolSearch/WebSearch 续轮在下一模型调用前暂停，核验自有附件 UUID 和原生工具结果后，同模型恢复一次；只清除临时指令，保留持久文字、同名正文、工具结果和计量，不重放搜索。Mod v3 与 Windows 2.1.296/Linux 2.1.292 隔离生命周期和失败场景已验证，未知 CLI、模型与账号资格不由此推定。"),
		entry("F-MESSAGES", "历史与续聊", "上下文", "partial", []string{"messages"}, nil, []string{"原生 JSONL", "前缀命中 / 分支重建"}, "支持已准入块的原生历史、续聊、回退与冷导入。末尾 assistant prefill/续接载体在 native 拒绝，CLI 总以用户轮发送；旧 Sonnet 零推理初始化和 pause_turn 服务端执行桥接只属归档。helper history 托管路由与能力已摘除；签名、资源及其它历史块仍受准入和归属限制，本地 prefix-hit 不证明提供商接受或缓存命中。"),
		entry("F-THINKING", "推理与签名", "生成控制", "partial", []string{"thinking", "messages[].content[].thinking", "messages[].content[].signature", "thinking_delta.estimated_tokens"}, []string{"interleaved-thinking-2025-05-14", "dev-full-thinking-2025-05-14", "thinking-display-updates-2026-08-18", "thinking-binding-controls-2026-08-01"}, []string{"完整 thinking 对象经 EXTRA_BODY", "CLI 推理与签名编解码"}, "客户端 thinking 对象通过 EXTRA_BODY 表达，CLI 参数维持自身推理行为；缺省与显式 disabled 区分，omit 兼容另见对应条目。CLI 特性恢复可能移除字段重发，不再承诺旧 relay 的最终 HTTP 字段保真。合法 thinking_delta 的 estimated_tokens 是显示进度，不写入历史或计费用量；跨账户/前缀签名有效性由上游校验，网关不删除签名。"),
		entry("F-OUTPUT", "输出格式与推理强度", "生成控制", "partial", []string{"output_config.effort", "output_config.format", "output_format", "tools[].strict"}, []string{"structured-outputs-2025-11-13"}, []string{"CLI effort 与 EXTRA_BODY format", "原生响应 checkpoint"}, "output_config/output_format 经受控 EXTRA_BODY 表达，effort 使用 CLI 参数且缺省 high；不注册合成 StructuredOutput 工具，也不恢复旧 JSON 生成桥接。API format 与每工具 strict 不能仅因字段可解析就推定所有组合等价；CLI 特性恢复可能重发，真实账号约束效果和当前构建仍需独立验证。"),
		entry("F-SAMPLING", "采样参数", "生成控制", "partial", []string{"temperature", "top_p", "top_k"}, nil, []string{"Mod 每轮 EXTRA_BODY"}, "客户端采样值经每轮 EXTRA_BODY 交 CLI 构造请求，不再使用 relay 主请求归属后覆盖。模型不允许的组合由上游/CLI 处理，原生恢复行为与实际账号能力须另行验证。"),
		entry("F-STOP", "停止序列", "生成控制", "partial", []string{"stop_sequences"}, nil, []string{"上游生成参数", "停止原因与序列回传"}, "停止序列原样发给主模型，不在下游截断文本模拟。隔离测试覆盖续聊、分支和SSE；实际模型命中停止词仍需账号验证。"),
		entry("F-METADATA", "请求归因", "基础请求", "partial", []string{"metadata.user_id"}, nil, []string{"客户端会话选择", "CLI 自身 metadata 与派生 U"}, "客户端 metadata.user_id 只用于推导会话，不原样替换上游 metadata；上游使用 CLI 自己的归因和派生会话 U。user_id 不是鉴权凭据。旧主请求 metadata 覆盖是历史 relay 能力，不是 native 功能。"),
		entry("F-CACHE", "提示缓存", "上下文", "partial", []string{"cache_control", "system[].cache_control", "tools[].cache_control", "messages[].content[].cache_control"}, nil, []string{"CLI 缓存断点", "请求 TTL", "本地历史缓存"}, "缓存断点和上下文按 CLI 原生行为构造；请求有缓存控制时提取 5m/1h TTL，不承诺旧 relay 的逐块断点、混合 TTL 顺序或 automatic 根字段保真。helper history 托管路由和能力已摘除，旧隐藏轮次恢复/原位缓存测试仅属历史。prefix-hit 仅指本地历史，不代表提供商缓存计费命中。"),
		entry("F-DIAGNOSTICS", "缓存诊断", "上下文", "partial", []string{"diagnostics"}, nil, []string{"主请求诊断保真", "核心持久归属索引", "原账号与 issuer 亲和", "冷 Worker 可信授权"}, "核心默认按 user+group 保留 24h、最多 4096 条归属记录，固定原账号/issuer/generation；保留实际 issuer 的冷 Worker 可续用。共享 CC 路由对未知、平台保留期外或 issuer 变化的 ID 明确拒绝；普通非 CC 路由保留原协议。提供商 previous_message_not_found 等诊断仍正常 200，不把平台期限当作官方指纹 TTL，也未验证真实指纹命中。旧直连 Worker 无核心授权时兼容原本地 1h 归属校验。SSE 在首 message_start 登记后继续流式；登记失败保留已收到的真实用量并明确报错。"),
		entry("F-TOOLS", "客户端工具", "工具", "partial", []string{"tools", "tools[].input_schema", "tools[].input_examples", "tools[].strict", "tools[].allowed_callers"}, nil, []string{"原生名称与 schema 匹配", "SDK MCP 注册", "Mod 拦截与客户端回传"}, "已准入客户端工具仍由客户端执行；自定义工具通过 SDK MCP 注册，原生工具需匹配 CLI 目录与身份。上游名称/schema 按 CLI 构造，不再以旧 relay 还原证明任意工具元参数保真。direct 历史仍校验配对与身份；non-direct caller、PTC、typed、inline 等未原生覆盖组合拒绝。"),
		entry("F-TOOL-CHOICE", "工具选择与并行", "工具", "partial", []string{"tool_choice.type", "tool_choice.name", "tool_choice.disable_parallel_tool_use"}, nil, []string{"工具名映射", "第 0 轮 EXTRA_BODY"}, "auto / none / any / 指定工具及并行约束通过首轮 EXTRA_BODY 表达，内部续轮不继续强制；工具名按原生/MCP 路由转换。不能据旧 relay 的 eager/deferred 单轮适配记录推定所有组合等价，已有准入约束仍有效。模型是否接受强制选择由上游/CLI 决定，隔离用例不代表模型资格。"),
		entry("F-TOOL-SEARCH", "工具搜索", "工具", "partial", []string{"tools[].defer_loading", "tools[].type", "tool_reference"}, []string{"advanced-tool-use-2025-11-20"}, []string{"CC 内部 ToolSearch", "请求级工具目录"}, "保留 CLI 内部 ToolSearch 与工具加载策略，不等于 API regex/bm25 搜索协议。API tool_search_tool_*、服务端 MCP 搜索、inline 目录及其未支持历史在 native 拒绝。Worker 不再声明或挂载 helper history 托管，旧 transport schema 1/payload v1/v2 的隐藏轮次冷恢复与任务预算验收属于历史能力，不能从核心残留协议推定当前可用。"),
		entry("F-TOOL-STREAM", "工具参数流", "工具", "partial", []string{"tools[].eager_input_streaming", "stream"}, []string{"fine-grained-tool-streaming-2025-05-14"}, []string{"CLI 细粒度流环境变量", "SSE input_json_delta"}, "保留细粒度流 beta 对应的 CLI 设置与 input_json_delta 编解码；实际流行为由 CLI/模型决定。不再宣称旧 relay 对每工具 eager_input_streaming 字段的出站还原等价于 native 支持。"),
		entry("F-CITATIONS", "引用", "媒体与资源", "partial", []string{"messages[].content[].citations", "messages[].content[].citations.enabled"}, nil, []string{"原生历史引用", "CLI 引用事件"}, "已准入文档/文本引用通过原生历史与 CLI 事件承载；不再观察模型 HTTP 后恢复 CLI 省略的历史引用。WebSearch 网关结果格式与官方完整加密来源/引用协议不等价，旧 relay 往返验证仅属历史，实际引用效果由上游决定。"),
		entry("F-IMAGES", "图片输入", "媒体与资源", "partial", []string{"messages[].content[].source"}, nil, []string{"原生图片块与 URL 来源", "待发图片与末尾文本拆分"}, "保留已准入 base64 PNG/JPEG/GIF/WebP 与 URL 来源，Worker 不自行下载改写。待发用户轮以文本结尾时可将前部图片写原生历史；否则接受 CLI 附加来源文字、缩放/重编码，不保证逐字节等价。图片 transformations 拒绝；file_id 需独立资源归属，真实模型读取能力仍由上游决定。"),
		entry("F-DOCUMENTS", "文档输入", "媒体与资源", "partial", []string{"messages[].content[].type:document", "messages[].content[].source", "messages[].content[].citations"}, nil, []string{"原生文档输入与历史", "文件资源归属"}, "已准入文档及引用通过 CLI 输入/原生历史表达，不提取文本模拟 PDF，也不再由 relay 还原来源块。file_id 仍需平台资源映射与所属账号核验，跨账号或过期引用拒绝；资源授权与部署版 CLI 读取仍待验证，旧隔离往返不代表当前部署通过。"),
		entry("F-FILES", "文件与容器资源", "媒体与资源", "partial", []string{"/v1/files", "source.file_id", "container_upload.file_id", "container"}, []string{"files-api-2025-04-14"}, []string{"独立非模型管理 HTTP", "资源端点与租户归属", "CLI 授权核验与身份绑定"}, "Files 上传、列表、元数据、删除及受上游许可的下载走独立管理 HTTP 白名单，不恢复模型 relay。API key/env OAuth 使用 CLI auth status，stored OAuth 使用无输入的原生初始化并验证刷新落盘，不再追加 status 进程；绑定唯一支持的凭据来源与后续 IO。刷新只由 CLI 负责，CLI 2.1.292/2.1.296 已通过隔离验收，未知版本、过期/歧义/身份变化失败关闭；真实账号资源资格仍需验证。container/container_upload、code execution 生成产物链不是当前 native 模型能力；旧相关适配仅属历史。"),
		entry("F-SKILLS", "API 技能", "媒体与资源", "partial", []string{"/v1/skills", "/v1/skills/{id}/versions", "container.skills"}, []string{"skills-2025-10-02"}, []string{"独立技能与版本管理 HTTP", "固定账号和具体版本授权", "CLI 授权核验"}, "保留技能/版本资源端点与归属校验，不等于模型支持 container.skills；后者 native 准入拒绝，旧提供商容器执行和产物链仅属历史。资源操作为独立非模型 HTTP，OAuth 刷新只允许 CLI 自身执行，不能由管理代码代刷；资源授权、部署版 CLI 与提供商资格仍待验证。区别于 CC 本地 Skills。"),
		entry("F-WEB-TOOLS", "服务端搜索与抓取", "工具", "partial", []string{"tools[].type:web_search", "tools[].type:web_fetch", "tools[].url_sources", "server_tool_use", "web_search_tool_result", "web_fetch_tool_result"}, nil, []string{"主 Mod WebSearch 交接", "同账号 native 搜索 CLI", "实际 SSE 用量与 ccgws1 历史"}, "保留 web_search 20250305/20260209/20260318 的原生请求表达、domain filters、max_uses 与结果历史；不再使用已删除的 mod/search。主路径摘要/链接及网关 ccgws1 不等价于完整官方引用/加密来源协议，快捷结果与主路径分别验收。web_fetch、PTC 与其它未支持的服务端历史仍拒绝。搜索以真实 SSE usage 计量，失败或账务事实缺失终止请求，不承诺固定一次 HTTP 请求；测试仍在验收。"),
		entry("F-CODE-EXEC", "服务端代码执行", "工具", "unsupported", []string{"tools[].type:code_execution", "container", "messages[].content"}, []string{"code-execution-2025-05-22", "code-execution-2025-08-25"}, []string{"native 准入拒绝"}, "Claude Code 不能声明此服务端工具；code_execution、container 与相应执行历史在 native 拒绝，不用本地 Bash 替代。旧 20250522/20250825/20260120/20260521 协议、容器和生成产物适配仅属 archive/ccgateway-relay-0.1.41@4b0e0967c 历史实现。"),
		entry("F-PTC", "程序化工具调用", "工具", "unsupported", []string{"tools[].allowed_callers", "messages[].content[].caller", "container"}, nil, []string{"native 准入拒绝"}, "PTC 依赖未支持的 code execution/container；non-direct tool_use.caller 拒绝，direct caller 不因此被拒绝。旧父子调用账本、暂停/续聊/冷导入及产物适配属于 relay 历史，不是当前 native 功能。"),
		entry("F-ADVISOR", "顾问工具", "工具", "unsupported", []string{"tools[].type:advisor_20260301", "tools[].model", "advisor_tool_result", "usage.iterations"}, []string{"advisor-tool-2026-03-01"}, []string{"native 准入拒绝"}, "advisor 服务端工具与对应历史在 native 拒绝。CLI 存在 --advisor 参数不证明网关已支持该 API 语义；旧原生服务端协议、独立用量及模型授权适配仅属 relay 历史记录。"),
		entry("F-CLIENT-TOOLSETS", "客户端工具与工具集", "工具", "unsupported", []string{"toolset_name", "tools[].type", "tools[].configs", "messages[].content[].content[].type:browser_state"}, nil, []string{"native typed 工具集准入拒绝"}, "CLI 无法声明 API typed 工具集，typed 定义、toolset_name 与相应未支持历史在 native 拒绝。旧 12 种 typed 定义及浏览器状态的 relay 往返测试只属历史；普通客户端工具另见 F-TOOLS，不能混为同一支持状态。"),
		entry("F-MCP", "MCP 工具与远程连接", "工具", "unsupported", []string{"tools[].name", "mcp_servers", "tools[].type:mcp_toolset", "messages[].content[].tool", "mcp_tool_listing", "mcp_tool_use", "mcp_tool_result"}, []string{"mcp-client-2025-11-20", "mcp-client-2026-09-15", "inline-tools-2026-09-15", "mid-conversation-tool-changes-2026-07-01"}, []string{"服务端 MCP connector 准入拒绝"}, "mcp_servers、API MCP toolset 与其历史在 native 拒绝，不改为容器连接来冒充提供商发起的连接。旧 pinned/dynamic 目录、搜索引用、inline 和凭据注入仅属 relay 历史。普通客户端工具经网关 SDK MCP 注册仍保留（F-TOOLS），不是本条服务端 MCP connector 能力。"),
		entry("F-CONTEXT", "上下文编辑", "上下文", "unsupported", []string{"context_management"}, []string{"context-management-2025-06-27"}, []string{"CLI 自身上下文行为"}, "客户端 context_management 不作为等价编辑策略转发，按 CLI 自身上下文行为处理；不能将字段被解析或响应含扩展视为客户端策略已执行。旧主请求编辑/响应保真验证属于 relay 历史。"),
		entry("F-COMPACTION", "上下文压缩", "上下文", "unsupported", []string{"compaction", "context_management.edits", "messages[].content[].type:compaction", "messages[].content[].tool_changes"}, []string{"compact-2026-01-12", "compact-2026-09-04"}, []string{"CLI 自身上下文行为", "未支持压缩历史拒绝"}, "客户端 compaction/context 编辑不按旧 relay 协议保真执行，压缩历史块与相关 inline 工具变更在 native 拒绝。CLI 自身上下文行为不是 API 压缩协议支持；旧签名块/空结果/工具净变更往返只属历史。"),
		entry("F-INLINE-TOOLS", "会话内工具变更", "上下文", "unsupported", []string{"messages[].content[].type:tool_addition", "messages[].content[].type:tool_removal", "messages[].content[].tool_changes"}, []string{"inline-tools-2026-09-15", "mid-conversation-tool-changes-2026-07-01", "mcp-client-2026-09-15"}, []string{"native inline 工具定义准入拒绝"}, "CLI 每次请求接收一个工具目录，native 拒绝 inline 工具定义。旧客户端/服务端/MCP 时间线与 helper history 的 custom inline 冷恢复、回退及账号验收属于 relay 历史，不是当前 Worker 功能。"),
		entry("F-FAST", "快速模式", "生成控制", "partial", []string{"speed"}, []string{"fast-mode-2026-02-01"}, []string{"CLI fastMode 与生成字段"}, "核心有效策略始终允许 fast/effort，不再是管理员开关；speed 配置请求级 CLI fastMode，缺省保持 standard。实际采用以 CLI 可观察 usage.speed 为准；CLI 原生恢复、账号资格、模型和定价仍需验证，不再由 relay 覆盖最终 HTTP 参数。"),
		entry("F-TASK-BUDGET", "任务预算", "生成控制", "partial", []string{"output_config.task_budget"}, []string{"task-budgets-2026-03-13"}, []string{"output_config 经每轮 EXTRA_BODY", "无 helper history 托管能力"}, "客户端 task_budget 随完整 output_config 经 EXTRA_BODY 表达，不自行扣减 remaining；不等于已实现跨请求隐藏轮次预算保真。Worker 已撤除 helper history 路由与 transport/payload 能力，旧 transport schema 1/payload v1/v2、custom inline 恢复及云端验收仅属历史。现行组合仍按 native 准入限制，CLI/模型效果待独立验证。"),
		entry("F-FALLBACK", "模型回退与缓存信用", "服务约束", "partial", []string{"fallbacks", "fallback_credit_token", "fallback_credit_token.mode", "stop_details.fallback_credit_token", "messages[].content[].type:fallback", "usage.iterations", "usage.fallback_credit"}, []string{"server-side-fallback-2026-06-01", "server-side-fallback-2026-07-01", "fallback-credit-2026-06-01", "fallback-credit-2026-07-01"}, []string{"候选模型授权与计价", "Worker 协调 native 显式回退"}, "fallbacks 由 Worker 在当前 CLI 结束后协调：仅真实 429/500/502/503/504/529，且未输出、未执行内部搜索、无请求级失败/取消时重新准入下一候选并重建私有历史；speed 可逐尝试配置。不是提供商原生回退链或旧 relay 闸门。fallback_credit_token 兑换与 fallback 历史块在 native 拒绝；旧 wire 绑定、strict/best_effort 兑换属于历史兼容概念。"),
		entry("F-ROUTING", "服务等级与地域", "服务约束", "partial", []string{"service_tier", "inference_geo"}, nil, []string{"受控 EXTRA_BODY", "原生搜索地域与服务字段"}, "主模型通过 EXTRA_BODY 表达 service_tier/inference_geo，原生搜索按现有代码携带相应字段；不再通过 relay 改写辅助计数请求，count_tokens 不支持。真实账号/模型地域与等级支持由上游决定，不代表存储驻留；非 Anthropic transport 不能等价转换。"),
		entry("F-COUNT-TOKENS", "Token 计数", "其他端点", "unsupported", nil, nil, []string{"anthropic.count_tokens"}, "CCGateway 不提供 token 计数（2026-10-11 决定）：插件不声明 count_tokens 端点，核心不会把计数请求调度到 CCGateway 账号，分组里没有能计数的账号时返回 404 not_found_error（客户端不重试）；Claude Code 计数失败后改用本地估算。"),
		entry("F-OTHER-APIS", "兼容协议与其他端点", "其他端点", "partial", []string{"/v1/chat/completions", "/v1/responses"}, nil, []string{"共享严格协议转换", "请求专属状态", "原始 Anthropic 用量结算"}, "支持可等价表达的文本、初始指令、函数工具/结果、结构化输出和正常拒绝；必须显式提供输出预算，不能等价的字段明确拒绝。Responses 支持不透明签名推理回传；OpenAI SSE 为判断终态拒绝有界缓冲。资源、存储式 response ID、后台任务与 Batches 尚需独立端点，不能据协议转换推导支持。"),
	}}
}

func entry(id, title, category, status string, paths, betas, mechanisms []string, reason string) Feature {
	if paths == nil {
		paths = []string{}
	}
	if betas == nil {
		betas = []string{}
	}
	if mechanisms == nil {
		mechanisms = []string{}
	}
	return Feature{ID: id, Title: title, Category: category, Scope: "api", Status: status, BodyPaths: paths, BetaHeaders: betas, Mechanisms: mechanisms, Reason: reason}
}

type BetaRule struct {
	Name    string `json:"name"`
	Mapping string `json:"mapping"`
}

// BetaRules lists shared mappings for CLI settings, not a native forwarding
// allowlist. A listed beta does not override native feature admission.
func BetaRules() []BetaRule {
	return []BetaRule{
		{"files-api-2025-04-14", "forward"},
		{"code-execution-2025-05-22", "forward"},
		{"code-execution-2025-08-25", "forward"},
		{"skills-2025-10-02", "forward"},
		{"mcp-client-2025-11-20", "forward"},
		{"mcp-client-2026-09-15", "forward"},
		{"fallback-credit-2026-06-01", "forward"},
		{"fallback-credit-2026-07-01", "forward"},
		{"server-side-fallback-2026-06-01", "forward"},
		{"server-side-fallback-2026-07-01", "forward"},
		{"inline-tools-2026-09-15", "forward"},
		{"mid-conversation-tool-changes-2026-07-01", "forward"},
		{"computer-use-2024-10-22", "forward"},
		{"computer-use-2025-01-24", "forward"},
		{"computer-use-2025-11-24", "forward"},
		{"task-budgets-2026-03-13", "forward"},
		{"context-management-2025-06-27", "forward"},
		{"compact-2026-01-12", "forward"},
		{"compact-2026-09-04", "forward"},
		{"advisor-tool-2026-03-01", "forward"},
		{"mid-conversation-system-clear-at-2026-08-21", "forward"},
		{"mid-conversation-output-config-2026-07-01", "forward"},
		// Observed CC 2.1.292 inline-effort beta; preserve independently of
		// the public API beta above, without renaming either protocol.
		{"per-turn-control-2026-07-01", "forward"},
		{"dangerous-tool-use-2026-09-03", "forward"},
		{"interleaved-thinking-2025-05-14", "forward"},
		{"thinking-display-updates-2026-08-18", "forward"},
		{"thinking-binding-controls-2026-08-01", "forward"},
		{"structured-outputs-2025-11-13", "forward"},
		{"fine-grained-tool-streaming-2025-05-14", "fine_grained_tools"},
		{"context-1m-2025-08-07", "forward"},
		{"fast-mode-2026-02-01", "fast"},
		{"advanced-tool-use-2025-11-20", "tool_search"},
		{"dev-full-thinking-2025-05-14", "forward"},
		{"model-context-window-exceeded-2025-08-26", "forward"},
	}
}
