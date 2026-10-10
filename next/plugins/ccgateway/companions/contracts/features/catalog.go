// Package features defines the data-only feature contract shared by the host
// and its Worker. Catalog entries describe code, never deployment or account
// entitlement. Runtime evidence must be reported separately.
package features

const CatalogVersion = "2026-10-11.5"
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
		{ID: "F-SAFEGUARDS", Title: "工具安全审查", Category: "CC 执行上下文", Scope: "cc", Status: "partial", BodyPaths: []string{"safeguards", "safeguard_results", "tool_use.id"}, BetaHeaders: []string{"dangerous-tool-use-2026-09-03"}, Mechanisms: []string{"主请求归属与上下文保真", "客户端工具身份校验", "纯 MCP 提供商上下文保真"}, Reason: "显式 safeguards 数组与响应审查结果原样保留；未传时保留内层 CC 审查。支持身份和 schema 不变的客户端工具，以及 tools/mcp_servers 不变的纯 MCP 请求。内部 ToolSearch 轮（CC 2.1.292 随 safeguards 发送 DeferredToolPlaceholder、延迟加载的 MCP 工具）每轮原样带客户端上下文，搜索轮不返回客户端（2026-10-10 起；此前返回 400 会使 CC 本会话停用服务端审查、auto 模式工具调用全部被拒）。agent teams 的 Agent 变体、Skill（内层 CLI 仅在输入不会被当作斜杠命令时开启，且不列出容器自带技能）、PowerShell 工具与带客户端超时设置（BASH_DEFAULT/MAX_TIMEOUT_MS、-p 会话）的 Bash/PowerShell 保持原生名，上游收到客户端原定义；子代理请求自带的 SubagentHandback（校验 schema）与普通客户端工具一样经网关 MCP 名转运，ID/输入不变；其它客户端工具改名、inline 工具变更、结构化输出及服务端工具组合仍拒绝；不修改审查结论或授予本地执行。隔离测试只验证保真，真实提供商审查能力待验证。"},
		{ID: "F-RELAY-PASSTHROUGH", Title: "出站中继完全透传", Category: "CC 执行上下文", Scope: "cc", Status: "partial", BodyPaths: []string{"thinking", "temperature", "top_p", "top_k", "stop_sequences", "service_tier", "inference_geo", "output_config", "output_format", "tool_choice", "safeguards", "diagnostics", "max_tokens", "fallbacks", "tools[].web_search"}, BetaHeaders: []string{}, Mechanisms: []string{"策略 relay_mode（legacy/passthrough）与 relay_passthrough_accounts", "CLI 参数（--model、--thinking、--effort、ANTHROPIC_BETAS、fastMode）", "Mod 按轮次设置 CLAUDE_CODE_EXTRA_BODY", "ANTHROPIC_CUSTOM_HEADERS 子代理 A'", "原生会话文件统一用会话 U", "CLAUDE_CODE_MAX_RETRIES=0", "web_search：WebSearch + 同账号一次性搜索进程，网关签发 encrypted_content"}, Reason: "passthrough 下每个上游请求都由内层 Claude Code 自己构造，中继原样转发，只读记录状态码、错误体和请求 ID；订阅限额头不返回给客户端。thinking、采样参数、output_config（format/effort/task_budget）、safeguards、diagnostics、max_tokens 每轮经 EXTRA_BODY 原样带上，tool_choice 只带第 0 轮；fallbacks 由 Mod 依次换模型；上游错误原样返回、不重试。web_search 由同账号的一次性 CLI 进程搜索，结果块可在任何账号还原；Claude Code 客户端自己的搜索请求只发 1 个上游请求。count_tokens 不支持（见 F-COUNT-TOKENS）。CLI 表达不了的（assistant 预填充、fallback credit、code_execution、服务端 web_fetch、tool_search_tool_*、advisor、typed 工具集、MCP connector、PTC、container、inline 工具、图片 transformations、web_search 的 user_location）返回 400。已知偏差：连续 system 消息由 CLI 合并；cache_control 断点、context_management、compaction、内嵌 effort 与客户端 metadata 由 CLI 决定；自定义工具上游名为 mcp__<前缀>__X；搜索结果没有 page_age 和 citations 块。详见 PASSTHROUGH-DESIGN.md。"},
		{ID: "F-THINKING-DISABLED-COMPAT", Title: "thinking disabled 兼容", Category: "CC 执行上下文", Scope: "cc", Status: "partial", BodyPaths: []string{"thinking.type"}, BetaHeaders: []string{}, Mechanisms: []string{"策略 thinking_disabled_compat（pass/omit）", "已验证模型清单", "决策记录 omit_unsupported_disabled"}, Reason: "默认 pass：thinking.type disabled 原样转发，不支持的模型与官方 API 一致返回 400。omit：仅对已验证不支持 disabled 的模型（claude-opus-5-5、claude-fable-5-1）不传 thinking，与官方 CLI 对它们的请求一致，不改成 adaptive，模型返回的 thinking 块原样透传。用于 cc-switch 等把 claude-opus-5 改写成 claude-opus-5-5、客户端仍发 disabled 的情况。适配与透传两种出站中继模式都生效；透传下这是网关唯一会去掉的生成字段。"},
		{ID: "F-ADD-DIR", Title: "额外目录访问", Category: "CC 执行上下文", Scope: "cc", Status: "supported", BodyPaths: []string{"additional_directories"}, BetaHeaders: []string{}, Mechanisms: []string{"CLI --add-dir 参数传递", "请求级目录授权", "Mod 配置透传"}, Reason: "支持客户端通过 additional_directories 数组传递额外目录，网关保留并通过 --add-dir 参数传递给 CC CLI。每个请求最多 100 个目录，自动去重并验证非空。目录路径由 CLI 验证和授权，网关不检查路径有效性。客户端 CC 自身的 --add-dir 目录出现在环境附件的 Additional working directories 中，随 workingDirectory 字段来源保留或去除（ccgateway 0.1.22 起）。"},
		entry("F-MODEL", "模型与上下文窗口", "基础请求", "partial", []string{"model"}, []string{"context-1m-2025-08-07"}, []string{"CLI --model", "上下文环境变量"}, "传入请求模型；可用模型、别名和窗口取决于账号与 CLI。"),
		entry("F-LIMITS", "输出长度", "基础请求", "partial", []string{"max_tokens"}, nil, []string{"主请求输出预算", "零 token 非流预热桥接"}, "正整数最终上游值保持客户端预算；max_tokens:0 使用真实非流预热响应，不生成空答案、不写入会话。已完成真实 CLI 隔离验证，模型上限仍由上游检查。"),
		entry("F-STREAM", "流式与完整响应", "基础请求", "partial", []string{"stream"}, nil, []string{"JSON / SSE 编解码"}, "已适配文本、推理、客户端工具、引用、已登记 Web/Advisor/MCP/CodeExec/PTC 块及其历史。资源产物、缓存信用及核心托管隐藏历史的响应在登记完成前有界缓冲，不能承诺这些组合逐事件即时外发；未知块或未能保真的组合明确拒绝。"),
		entry("F-SYSTEM", "系统指令", "上下文", "partial", []string{"system", "messages[].role:system", "messages[].clear_at", "messages[].output_config"}, []string{"mid-conversation-system-clear-at-2026-08-21", "mid-conversation-output-config-2026-07-01", "per-turn-control-2026-07-01"}, []string{"原生历史", "Mod", "上游请求还原"}, "支持文本 system 与已准入 beta 的 clear_at、会话内 effort（含空内容指令）；公开 mid-conversation-output-config 与 CC 2.1.292 实测 per-turn-control 分别准入、原名转发，不删除消息字段或互换请求头。按原位置保留完整历史，其它 schema/角色限制不放宽，模型与账号实际 beta 支持仍由上游决定。"),
		entry("F-MESSAGES", "历史与续聊", "上下文", "partial", []string{"messages"}, nil, []string{"原生 JSONL", "前缀命中 / 分支重建", "主请求续接载体剥离", "零推理原生初始化"}, "支持已适配块的完整历史、续聊、回退与新账号导入。官方 Claude 4.6 及以后模型不支持末尾 assistant 文字 prefill；pause_turn 回传完整提供商内容继续服务端执行是另一种语义。Sonnet 4.6 的无签名普通服务端工具历史可先由 CLI 生成原生首用户状态，零额外推理并保留安全附件原位，支持多轮冷导入及混合工具尾部。签名、资源、credit、inline 等复杂组合仍受限制；不能删除安全附件或改成 user 绕过，隔离验证不证明真实模型接受普通文字 prefill，也不代表全部真实提供商组合资格。"),
		entry("F-THINKING", "推理与签名", "生成控制", "partial", []string{"thinking", "messages[].content[].thinking", "messages[].content[].signature", "thinking_delta.estimated_tokens"}, []string{"interleaved-thinking-2025-05-14", "dev-full-thinking-2025-05-14", "thinking-display-updates-2026-08-18", "thinking-binding-controls-2026-08-01"}, []string{"主请求完整 thinking 对象", "CLI 推理与签名编解码"}, "区分API缺省与显式disabled；enabled/adaptive/between_tools及display、绑定控制按主请求保真，updates和binding要求对应beta。合法 thinking_delta 的 estimated_tokens 原样透传；它是显示进度，不写入历史内容或计费用量。隔离CLI签名续聊已验证；真实模型限制及跨账户/前缀签名有效性仍由上游校验，网关不删除签名。"),
		entry("F-OUTPUT", "输出格式与推理强度", "生成控制", "partial", []string{"output_config.effort", "output_config.format", "output_format", "tools[].strict"}, []string{"structured-outputs-2025-11-13"}, []string{"主请求 effort 与 API format", "完成响应与原生/独立响应checkpoint"}, "HTTP API format直接使用上游约束解码，不注册合成格式工具；正常JSON、refusal和截断均单次返回，缺省effort不继承CLI medium。隔离CLI已验证；真实账号支持及约束效果需上游验证。旧output_format需旧beta。"),
		entry("F-SAMPLING", "采样参数", "生成控制", "partial", []string{"temperature", "top_p", "top_k"}, nil, []string{"已归属主模型请求的参数覆盖"}, "按原始JSON数值应用到主请求，辅助分类请求不受影响；模型不允许的采样组合由上游返回错误。已完成真实CLI隔离验证，实际账号能力另行验证。"),
		entry("F-STOP", "停止序列", "生成控制", "partial", []string{"stop_sequences"}, nil, []string{"上游生成参数", "停止原因与序列回传"}, "停止序列原样发给主模型，不在下游截断文本模拟。隔离测试覆盖续聊、分支和SSE；实际模型命中停止词仍需账号验证。"),
		entry("F-METADATA", "请求归因", "基础请求", "partial", []string{"metadata.user_id"}, nil, []string{"主请求透传"}, "显式 metadata 在主请求中原样替换；缺省保留 CLI 归因。user_id 不作为鉴权凭据，不改账号授权或辅助请求。"),
		entry("F-CACHE", "提示缓存", "上下文", "partial", []string{"cache_control", "system[].cache_control", "tools[].cache_control", "messages[].content[].cache_control"}, nil, []string{"原位断点与工具顺序", "混合 TTL", "顶层自动缓存", "本地历史缓存"}, "保留客户端断点与 1h/5m 顺序，逐轮校验四个有效断点；服务端工具及内部 CLI ToolSearch 的显式/automatic 缓存已有隔离回归。内部回合仅按真实响应证据续接，helper 不继承显式断点；带断点的客户端工具必须显式 defer_loading:false。automatic 根字段保留，每轮自然覆盖新增内部内容，超过断点上限明确拒绝。普通路径此组合按完整客户端历史本地重建；核心托管且 Worker 已协商托管 transport schema 1 与适用的 payload v1/v2 时，可按已登记链恢复完整隐藏轮次及原位系统说明，不复制旧缓存标记到新轮；legacy synthetic StructuredOutput 仍不支持，API output_config.format 是独立已适配路径。prefix-hit 仅指本地历史，不代表真实上游缓存计费命中。"),
		entry("F-DIAGNOSTICS", "缓存诊断", "上下文", "partial", []string{"diagnostics"}, nil, []string{"主请求诊断保真", "核心持久归属索引", "原账号与 issuer 亲和", "冷 Worker 可信授权"}, "核心默认按 user+group 保留 24h、最多 4096 条归属记录，固定原账号/issuer/generation；保留实际 issuer 的冷 Worker 可续用。共享 CC 路由对未知、平台保留期外或 issuer 变化的 ID 明确拒绝；普通非 CC 路由保留原协议。提供商 previous_message_not_found 等诊断仍正常 200，不把平台期限当作官方指纹 TTL，也未验证真实指纹命中。旧直连 Worker 无核心授权时兼容原本地 1h 归属校验。SSE 在首 message_start 登记后继续流式；登记失败保留已收到的真实用量并明确报错。"),
		entry("F-TOOLS", "客户端工具", "工具", "partial", []string{"tools", "tools[].input_schema", "tools[].input_examples", "tools[].strict", "tools[].allowed_callers"}, nil, []string{"原生名称与 schema 匹配", "MCP 注册", "Mod 拦截与客户端回传", "工具元参数保真", "已完成历史与当前执行目录分离"}, "客户端执行工具；支持 strict、input_examples、direct 及已登记程序化 allowed_callers，PTC 按父调用和容器归属交回客户端。已完成、配对且不再声明的 direct 客户端工具历史保留原名与参数，不重新注册、不能授权新的调用或搜索引用。原生目录已核验CLI 2.1.288/2.1.292，最终仍核对实际工具定义；未知执行版本或身份无法对应的组合明确拒绝。"),
		entry("F-TOOL-CHOICE", "工具选择与并行", "工具", "partial", []string{"tool_choice.type", "tool_choice.name", "tool_choice.disable_parallel_tool_use"}, nil, []string{"工具可见性", "已归属主模型请求的参数覆盖"}, "支持 auto / none / any / 指定工具及并行约束，工具名按执行路由转换。内部搜索开启时，全部普通客户端工具显式 defer_loading:false 的 any 或指定已加载目标可单轮保真；保留客户工具定义和原选择，仅排除内部 helper 并禁止其执行。指定目标显式 eager 时可保留其他显式 deferred 普通工具，仍完整传递原目录和原选择、没有隐藏 helper 轮。指定 deferred 目标、any 混合目录、隐式 deferral、手动thinking、inline、safeguards、服务端工具及结构化续轮组合仍拒绝。实际模型限制由上游验证；Opus 5.5 不支持强制选择，隔离测试不代表其模型资格。"),
		entry("F-TOOL-SEARCH", "工具搜索", "工具", "partial", []string{"tools[].defer_loading", "tools[].type", "tool_reference"}, []string{"advanced-tool-use-2025-11-20"}, []string{"CC 内部 ToolSearch", "API regex / bm25 搜索协议", "准确引用与历史往返"}, "内部搜索在 CC 特性中配置；核心托管与 Worker 已协商托管 transport schema 1 与适用的 payload v1/v2 时，任务预算首次请求可建立隐藏轮次记录，已登记链支持外部结果、普通续聊、冷恢复与回退。普通搜索不会因此全部自动托管，旧未知 assistant 历史不能直接建立托管链。全部普通客户端工具显式 defer_loading:false 时，any 或指定已加载目标的强制选择保留客户目录与原请求参数、排除并禁止内部 helper；指定 eager 目标加无关显式 deferred 普通工具也走单轮保真路径，其他强制组合仍受限制。普通自定义客户端工具的 inline 变更可与内层搜索并用，撤销项不会重新进入搜索目录，已发现集合限定本次请求。API 搜索已适配定义、引用及续聊/回退/导入，并关闭内层搜索以避免重复执行。支持非 defer MCP；多服务器 deferred MCP 要求所有连接器目录完整 pinned，按完整服务器名与工具名精确查表、按历史位置激活，歧义或未知引用拒绝。新增单服务器顶层动态 deferred 目录：listing 按响应与完整历史位置登记，保留原声明并支持续聊、冷导入和回退；冲突重复目录、动态多服务器及 inline/压缩/fallback 组合仍拒绝，不拆前缀猜身份。旧 beta 不是所有 API 搜索的必需项，真实模型与账号资格须另验证。"),
		entry("F-TOOL-STREAM", "工具参数流", "工具", "partial", []string{"tools[].eager_input_streaming", "stream"}, []string{"fine-grained-tool-streaming-2025-05-14"}, []string{"CLI 细粒度流环境变量", "每工具参数保真", "SSE input_json_delta"}, "支持全局beta和每工具eager_input_streaming的出站处理，工具JSON片段到块结束后再校验；实际流行为取决于模型与提供商。"),
		entry("F-CITATIONS", "引用", "媒体与资源", "partial", []string{"messages[].content[].citations", "messages[].content[].citations.enabled"}, nil, []string{"文本引用与 citations_delta", "绑定来源的历史引用恢复"}, "保留索引、原文与加密引用；CLI 省略的历史引用仅在完整消息和文档/搜索来源一致时恢复。文档与 Web 来源的隔离往返已验证；实际引用质量由上游决定。"),
		entry("F-IMAGES", "图片输入", "媒体与资源", "partial", []string{"messages[].content[].source"}, nil, []string{"原生图片块与 URL 来源"}, "保留 base64 PNG/JPEG/GIF/WebP 和 URL 图片，不由 Worker 下载后改写。文件 ID 需独立资源归属，不接受未登记 file_id；真实模型读取 URL 的能力仍由上游决定。"),
		entry("F-DOCUMENTS", "文档输入", "媒体与资源", "partial", []string{"messages[].content[].type:document", "messages[].content[].source", "messages[].content[].citations"}, nil, []string{"PDF / 文本 / 内容块 / URL 来源", "原始文档与引用回放"}, "保留文档来源、页码/字符索引、引用开关和工具结果文档，不提取成文本模拟 PDF。隔离 CLI 往返已验证；file_id 通过平台资源所有权映射并固定所属账号，跨账号或过期引用拒绝，实际模型限制由上游返回。"),
		entry("F-FILES", "文件与容器资源", "媒体与资源", "partial", []string{"/v1/files", "source.file_id", "container_upload.file_id", "container"}, []string{"files-api-2025-04-14"}, []string{"资源端点与租户归属", "固定账号与实际授权身份", "生成产物登记与 ID 映射"}, "已实现文件上传、列表、元数据、删除及受上游许可的下载；文件与容器按所有者和实际授权身份固定账号，续聊、回退和历史导入校验归属。生成文件与容器先登记再返回公开 ID；涉及产物的 SSE 有界缓冲后返回。稳定版与旧 beta 区分分页和过期语义。代码与隔离 CLI 验证不代表真实账号已具备提供商资格。"),
		entry("F-SKILLS", "API 技能", "媒体与资源", "partial", []string{"/v1/skills", "/v1/skills/{id}/versions", "container.skills"}, []string{"skills-2025-10-02"}, []string{"提供商技能与版本管理", "固定账号和具体版本授权", "生成文件登记"}, "已实现提供商技能和版本资源操作、container.skills 转换及具体版本授权；自定义技能固定所属账号与实际授权身份，续聊继续核验版本。执行发生在提供商容器，区别于 CC 本地 Skills；产物先登记，有状态 SSE 有界缓冲。旧 beta 可透传，当前稳定 API 不强加旧 beta。真实账号资格与模型组合仍待提供商验证。"),
		entry("F-WEB-TOOLS", "服务端搜索与抓取", "工具", "partial", []string{"tools[].type:web_search", "tools[].type:web_fetch", "tools[].url_sources", "server_tool_use", "web_search_tool_result", "web_fetch_tool_result"}, nil, []string{"七个已登记版本的主请求定义", "结果/引用/暂停续接", "服务端用量指标"}, "服务端执行，保持定义、加密来源、工具错误和引用。已接入登记版本的 direct 与程序化 caller、代码执行父子账本和容器归属；客户端工具混合、嵌套 PTC、历史分支/冷导入与显式缓存已隔离验证。未知工具版本或无法对应的 caller 明确拒绝；实际账号能力与模型工具收费需提供商验证。"),
		entry("F-CODE-EXEC", "服务端代码执行", "工具", "partial", []string{"tools[].type:code_execution", "container", "messages[].content"}, []string{"code-execution-2025-05-22", "code-execution-2025-08-25"}, []string{"提供商执行协议转换", "容器归属与生命周期", "原始结果和用量保留"}, "已适配 20250522、20250825、20260120、20260521 工具版本及执行结果、续聊和历史回放；由提供商执行，不使用 Worker 本地 Bash 替代。旧 Python 版需相应 beta，20250825 及后续当前版本无需旧 beta。生成产物先登记，有状态 SSE 有界缓冲；保留原始用量与执行次数，不从次数推算容器时长或官方月免费额。真实提供商资格及模型组合待验证。"),
		entry("F-PTC", "程序化工具调用", "工具", "partial", []string{"tools[].allowed_callers", "messages[].content[].caller", "container"}, nil, []string{"执行父子调用账本", "外部客户端工具交回", "持久容器与执行上下文绑定"}, "已实现提供商执行父调用、客户端工具子调用与结果回传，保留 caller 身份；暂停执行续聊必须匹配所属账号、容器及已登记父调用。支持完整历史导入、回退与嵌套服务端工具链，客户端工具不会在 Worker 本地执行。产物响应先登记，有状态 SSE 有界缓冲；具体模型及执行版本能否使用 PTC 仍由提供商确认。"),
		entry("F-ADVISOR", "顾问工具", "工具", "partial", []string{"tools[].type:advisor_20260301", "tools[].model", "advisor_tool_result", "usage.iterations"}, []string{"advisor-tool-2026-03-01"}, []string{"原生服务端顾问协议", "精确历史恢复", "关联模型授权与独立计费"}, "保留明文、加密和错误结果及顾问缓存配置；顾问用量不计入主模型总数，由核心独立授权、调度检查和价格快照结算。已完成 CLI 隔离回归；真实模型配对/账号资格仍需上游验证。"),
		entry("F-CLIENT-TOOLSETS", "客户端工具与工具集", "工具", "partial", []string{"toolset_name", "tools[].type", "tools[].configs", "messages[].content[].content[].type:browser_state"}, nil, []string{"固定 API 类型与联合工具身份", "外部客户端执行"}, "12 种已登记 typed 定义通过真实 CLI 与隔离上游新请求、续聊、回退、新缓存导入及 SSE 验证；工具集身份与 browser_state 保留。已完成 direct 历史即使本次已删除声明，仍按原块身份只读传输，不猜 typed 定义、不注册执行能力；未完成调用、程序化身份和未知搜索引用仍按各自合同校验。内部 CC 搜索、显式 safeguards 组合暂拒。模型与提供商资格仍以上游为准。"),
		entry("F-MCP", "MCP 工具与远程连接", "工具", "partial", []string{"tools[].name", "mcp_servers", "tools[].type:mcp_toolset", "messages[].content[].tool", "mcp_tool_listing", "mcp_tool_use", "mcp_tool_result"}, []string{"mcp-client-2025-11-20", "mcp-client-2026-09-15", "inline-tools-2026-09-15", "mid-conversation-tool-changes-2026-07-01"}, []string{"服务器身份与凭据隔离", "MCP 工具可见性时间线", "搜索引用与历史账本"}, "远程 MCP 由提供商连接；已实现固定目录、暂停/续聊/回退/冷导入，以及指定服务器的 inline 添加、撤销与重加。URL 和 token 只在顶层服务器声明，按精确服务器身份注入主请求。支持非 defer MCP 与客户端 API ToolSearch 并用、纯 MCP 与原样 safeguards；多服务器 deferred MCP 搜索限定所有连接器工具目录完整 pinned，按 SDK 完整名称键查表并按历史位置恢复发现状态。未知引用、禁用或撤销项及命名空间碰撞拒绝；单服务器顶层动态 deferred 目录可依据真实 listing 建立位置账本，完整历史复用已记录目录与发现；不把 listing 改写为客户 pinned 声明。冲突重复目录、多服务器动态目录及 inline/压缩/fallback 组合仍拒绝，未知引用编码不猜测。真实提供商组合资格须另验证。"),
		entry("F-CONTEXT", "上下文编辑", "上下文", "partial", []string{"context_management"}, []string{"context-management-2025-06-27"}, []string{"已归属主请求策略保真", "响应 applied_edits 保真"}, "支持已登记 tool/thinking 编辑策略与 null；真实 CLI 配合隔离上游验证请求和响应。内层 CC 自有上下文行为不代表客户端策略的模型支持；未做真实提供商编辑效果验证。"),
		entry("F-COMPACTION", "上下文压缩", "上下文", "partial", []string{"compaction", "context_management.edits", "messages[].content[].type:compaction", "messages[].content[].tool_changes"}, []string{"compact-2026-01-12", "compact-2026-09-04"}, []string{"新旧协议分别保真", "空结果 / 签名块 / 终态控制", "工具净变更时间线"}, "保留已登记新旧压缩协议、签名与工具净变更；显式空变更重置目录，null 压缩保持原语义。签名历史内的 Advisor 模型必须通过核心授权与价格检查且不能改名。隔离 CLI 已验证往返，不验证上游签名真伪或账号资格。"),
		entry("F-INLINE-TOOLS", "会话内工具变更", "上下文", "partial", []string{"messages[].content[].type:tool_addition", "messages[].content[].type:tool_removal", "messages[].content[].tool_changes"}, []string{"inline-tools-2026-09-15", "mid-conversation-tool-changes-2026-07-01", "mcp-client-2026-09-15"}, []string{"客户端、服务端与 MCP 时间线", "原位置还原与缓存边界保留", "嵌套模型授权与计价"}, "引用和定义按原历史位置生效；撤销后不能由搜索擅自激活，pending 调用期间禁止相关变更。已适配客户端、搜索/抓取、Advisor 和 MCP toolset；MCP 定义需要配套当前 MCP beta，凭据始终留在顶层服务器声明。续聊、回退、冷导入与压缩净变更保留原语义。普通自定义客户端工具可与内层 CC 搜索并用：历史身份与当前可搜索目录分离，撤销及重置后不复活，重加按新 schema，原始 inline 位置和缓存断点保留。核心托管预算可按完整公开锚点恢复上述普通 custom inline 内部轮次及当时目录，旧发现不会复活撤销项；已做 JSON/SSE 冷恢复和回退隔离验证；Opus 5.5 的普通与 custom inline 云端工具交接、续聊、SSE和回退均已验证，不代表所有模型或账号资格。native、服务端工具、typed、MCP、safeguards、签名压缩与此内部搜索的组合仍拒绝；隔离 CLI 验证不代表真实模型资格。"),
		entry("F-FAST", "快速模式", "生成控制", "partial", []string{"speed"}, []string{"fast-mode-2026-02-01"}, []string{"attributed main request"}, "显式 fast 需管理员允许与 beta；最终主请求保真传 speed，缺省清除 CLI 默认。实际采用以 usage.speed 为准；账号资格、模型和定价仍需验证。"),
		entry("F-TASK-BUDGET", "任务预算", "生成控制", "partial", []string{"output_config.task_budget"}, []string{"task-budgets-2026-03-13"}, []string{"主请求计划", "核心持久托管 / transport schema 1 / payload v1/v2 协商", "响应与隐藏载体各 32MiB 上限；默认用户/组存储预算 4096 项、256MiB、保留 24h"}, "按 API 原值传递建议预算（total 至少 20000）；全量显式 eager，或指定 eager 目标加无关显式 deferred 普通工具的强制单轮可保真传递预算，此路径禁止内部 helper。核心启用托管且实际 Worker 已协商托管 transport schema 1 与适用的 payload v1/v2 时，允许普通客户端工具的内部 ToolSearch 轮次，完整隐藏消息、原签名与原位系统说明随已登记链恢复；不自行扣减 remaining。JSON/SSE 在历史与用量提交前有界缓冲，链绑定用户/分组、账号/issuer、模型、CLI 与有效策略；过期、歧义或绑定变化拒绝，派发后不换号重试。独立 system_only 位置和普通 custom inline 托管恢复要求 payload v2：按每段真实公开锚点验证当时目录，保留 user 后的 system 指令位置；撤销不复活，同名重加使用对应 schema，旧发现不进入当前目录。已完成 JSON/SSE 新会话、续聊、冷恢复及回退的隔离 CLI 验证；Opus 5.5 的普通与 custom inline 云端往返、SSE及回退已验收，用量已核对。生产跨账号冷迁移未实测，不能据此承诺所有账号资格。native、server、typed、MCP、safeguards 与此 inline 组合仍拒绝；资源、信用、context/compaction、assistant-tail 与 legacy synthetic 混用仍未开放；通用 deferred 强制选择仍受限制。官方 CC/Cowork 原生界面不支持，账号上游能力须另验证。"),
		entry("F-FALLBACK", "模型回退与缓存信用", "服务约束", "partial", []string{"fallbacks", "fallback_credit_token", "fallback_credit_token.mode", "stop_details.fallback_credit_token", "messages[].content[].type:fallback", "usage.iterations", "usage.fallback_credit"}, []string{"server-side-fallback-2026-06-01", "server-side-fallback-2026-07-01", "fallback-credit-2026-06-01", "fallback-credit-2026-07-01"}, []string{"候选模型授权与计价", "同账号与 issuer 的信用托管", "原始 wire 绑定与受控兑换"}, "显式候选链交由提供商执行；信用支持字符串、对象 strict/best_effort 与 null，对象需要 July credit beta。兑换固定原所有者、账号和 issuer；strict 要求有效匹配，best_effort 仅在完整证明匹配时复用原 wire，否则原样携 token/mode 走当前请求，由提供商判定。网关不自动重试、换号或丢 token。信用 SSE 有界缓冲至登记完成，托管失败保留真实用量并返回 gateway_credit_storage；正常 refusal 仍是 200。default 与压缩组合仍拒绝，真实信用资格和退款未验证。"),
		entry("F-ROUTING", "服务等级与地域", "服务约束", "partial", []string{"service_tier", "inference_geo"}, nil, []string{"主模型服务等级", "全部模型调用推理地域"}, "service_tier 按主请求精确映射；inference_geo 同时约束辅助模型请求并阻断无法携带地域的辅助计数。CLI 2.1.292 假上游验证通过；真实账户地域/等级支持由上游决定，不代表存储驻留。非 Anthropic transport 区域不可等价转换。"),
		entry("F-COUNT-TOKENS", "Token 计数", "其他端点", "unsupported", nil, nil, []string{"anthropic.count_tokens"}, "CCGateway 不提供 token 计数（2026-10-11 决定）：插件不声明 count_tokens 端点，核心不会把计数请求调度到 CCGateway 账号；Claude Code 客户端计数失败后改用本地估算。"),
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

// BetaRules lists implemented admission mappings only. Names in a feature's
// documentation are not automatically permitted by the runtime.
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
