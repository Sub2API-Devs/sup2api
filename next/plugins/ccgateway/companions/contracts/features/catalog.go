// Package features defines the data-only feature contract shared by the host
// and its Worker. Catalog entries describe code, never deployment or account
// entitlement. Runtime evidence must be reported separately.
package features

const CatalogVersion = "2026-10-08.4"
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
		{ID: "F-SAFEGUARDS", Title: "客户端工具安全审查", Category: "CC 执行上下文", Scope: "cc", Status: "partial", BodyPaths: []string{"safeguards", "safeguard_results", "tool_use.id"}, BetaHeaders: []string{"dangerous-tool-use-2026-09-03"}, Mechanisms: []string{"主请求 marker 归属", "执行端上下文保真", "Mod / stdio 拒绝本地执行"}, Reason: "明确传入的非空 safeguards 数组用于客户端实际执行环境，字段保持原样；未传时保留内层 CC 审查。仅接受工具名称与 schema 完全一致的主请求；内部搜索、结构化续轮、服务端工具及名称映射组合暂不支持。目录不代表已完成真实账号验证。"},
		entry("F-MODEL", "模型与上下文窗口", "基础请求", "partial", []string{"model"}, []string{"context-1m-2025-08-07"}, []string{"CLI --model", "上下文环境变量"}, "传入请求模型；可用模型、别名和窗口取决于账号与 CLI。"),
		entry("F-LIMITS", "输出长度", "基础请求", "partial", []string{"max_tokens"}, nil, []string{"主请求输出预算", "零 token 非流预热桥接"}, "正整数最终上游值保持客户端预算；max_tokens:0 使用真实非流预热响应，不生成空答案、不写入会话。已完成真实 CLI 隔离验证，模型上限仍由上游检查。"),
		entry("F-STREAM", "流式与完整响应", "基础请求", "partial", []string{"stream"}, nil, []string{"JSON / SSE 编解码"}, "文本、推理、客户端工具和引用已有通路；新型服务端内容块需另行适配。"),
		entry("F-SYSTEM", "系统指令", "上下文", "partial", []string{"system", "messages[].role:system", "messages[].clear_at", "messages[].output_config"}, []string{"mid-conversation-system-clear-at-2026-08-21", "mid-conversation-output-config-2026-07-01"}, []string{"原生历史", "Mod", "上游请求还原"}, "支持文本 system 与已准入 beta 的 clear_at、会话内 effort（含空内容指令）；按原位置保留完整历史，模型与账号实际 beta 支持仍由上游决定。"),
		entry("F-MESSAGES", "历史与续聊", "上下文", "partial", []string{"messages"}, nil, []string{"原生 JSONL", "前缀命中 / 分支重建", "主请求续接载体剥离"}, "支持已适配块的完整历史、续聊、回退与新账号导入。真实 CLI 配合隔离上游验证 Opus assistant 预填及 pause_turn；Sonnet 额外安全附件无法等价恢复时明确拒绝。不是实际模型能力验证。"),
		entry("F-THINKING", "推理与签名", "生成控制", "partial", []string{"thinking", "messages[].content[].thinking", "messages[].content[].signature"}, []string{"interleaved-thinking-2025-05-14", "dev-full-thinking-2025-05-14", "thinking-display-updates-2026-08-18", "thinking-binding-controls-2026-08-01"}, []string{"主请求完整 thinking 对象", "CLI 推理与签名编解码"}, "区分API缺省与显式disabled；enabled/adaptive/between_tools及display、绑定控制按主请求保真，updates和binding要求对应beta。隔离CLI签名续聊已验证；真实模型限制及跨账户/前缀签名有效性仍由上游校验，网关不删除签名。"),
		entry("F-OUTPUT", "输出格式与推理强度", "生成控制", "partial", []string{"output_config.effort", "output_config.format", "output_format", "tools[].strict"}, []string{"structured-outputs-2025-11-13"}, []string{"主请求 effort 与 API format", "完成响应与原生/独立响应checkpoint"}, "HTTP API format直接使用上游约束解码，不注册合成格式工具；正常JSON、refusal和截断均单次返回，缺省effort不继承CLI medium。隔离CLI已验证；真实账号支持及约束效果需上游验证。旧output_format需旧beta。"),
		entry("F-SAMPLING", "采样参数", "生成控制", "partial", []string{"temperature", "top_p", "top_k"}, nil, []string{"已归属主模型请求的参数覆盖"}, "按原始JSON数值应用到主请求，辅助分类请求不受影响；模型不允许的采样组合由上游返回错误。已完成真实CLI隔离验证，实际账号能力另行验证。"),
		entry("F-STOP", "停止序列", "生成控制", "partial", []string{"stop_sequences"}, nil, []string{"上游生成参数", "停止原因与序列回传"}, "停止序列原样发给主模型，不在下游截断文本模拟。隔离测试覆盖续聊、分支和SSE；实际模型命中停止词仍需账号验证。"),
		entry("F-METADATA", "请求归因", "基础请求", "partial", []string{"metadata.user_id"}, nil, []string{"主请求透传"}, "显式 metadata 在主请求中原样替换；缺省保留 CLI 归因。user_id 不作为鉴权凭据，不改账号授权或辅助请求。"),
		entry("F-CACHE", "提示缓存", "上下文", "partial", []string{"cache_control", "system[].cache_control", "tools[].cache_control", "messages[].content[].cache_control"}, nil, []string{"原位断点与工具顺序", "混合 TTL", "顶层自动缓存", "本地历史缓存"}, "保留客户端断点与 1h/5m 顺序，校验四个有效断点；服务端搜索、抓取和 Advisor 组合已完成隔离回归。内部 CLI ToolSearch/合成格式续轮尚不接受显式缓存。prefix-hit 仅指本地历史，不代表上游缓存计费命中。"),
		entry("F-DIAGNOSTICS", "缓存诊断", "上下文", "partial", []string{"diagnostics"}, nil, []string{"attributed main request", "scoped message ID ownership"}, "保真透传诊断对象和响应；比较仅接受同客户端、同 Worker 一小时内已发行的响应 ID，最多保留 4096 条；跨账号或未知 ID 明确拒绝，上游可返回指纹过期或未找到。"),
		entry("F-TOOLS", "客户端工具", "工具", "partial", []string{"tools", "tools[].input_schema", "tools[].input_examples", "tools[].strict", "tools[].allowed_callers"}, nil, []string{"原生名称与 schema 匹配", "MCP 注册", "Mod 拦截与客户端回传", "工具元参数保真"}, "客户端执行工具；支持 strict、input_examples、direct callers 等元字段。原生目录已核验CLI 2.1.288/2.1.292，最终仍核对实际工具定义；程序化调用者另行适配。"),
		entry("F-TOOL-CHOICE", "工具选择与并行", "工具", "partial", []string{"tool_choice.type", "tool_choice.name", "tool_choice.disable_parallel_tool_use"}, nil, []string{"工具可见性", "已归属主模型请求的参数覆盖"}, "支持 auto / none / any / 指定工具及并行约束，工具名按执行路由转换。手动thinking、内部搜索和结构化续轮的强制选择组合暂拒绝；模型条件由上游验证。"),
		entry("F-TOOL-SEARCH", "工具搜索", "工具", "partial", []string{"tools[].defer_loading", "tools[].type", "tool_reference"}, []string{"advanced-tool-use-2025-11-20"}, []string{"CC 内部 ToolSearch", "API regex / bm25 搜索协议", "搜索结果与引用历史往返"}, "内部搜索按CC特性配置；API搜索已接入定义、结果、引用和续聊/回退/导入。API搜索请求关闭内部搜索，避免重复执行。实际提供商是否支持需账号验证，目录中的旧beta不是所有API搜索请求的必需项。"),
		entry("F-TOOL-STREAM", "工具参数流", "工具", "partial", []string{"tools[].eager_input_streaming", "stream"}, []string{"fine-grained-tool-streaming-2025-05-14"}, []string{"CLI 细粒度流环境变量", "每工具参数保真", "SSE input_json_delta"}, "支持全局beta和每工具eager_input_streaming的出站处理，工具JSON片段到块结束后再校验；实际流行为取决于模型与提供商。"),
		entry("F-CITATIONS", "引用", "媒体与资源", "partial", []string{"messages[].content[].citations", "messages[].content[].citations.enabled"}, nil, []string{"文本引用与 citations_delta", "绑定来源的历史引用恢复"}, "保留索引、原文与加密引用；CLI 省略的历史引用仅在完整消息和文档/搜索来源一致时恢复。文档与 Web 来源的隔离往返已验证；实际引用质量由上游决定。"),
		entry("F-IMAGES", "图片输入", "媒体与资源", "partial", []string{"messages[].content[].source"}, nil, []string{"原生图片块与 URL 来源"}, "保留 base64 PNG/JPEG/GIF/WebP 和 URL 图片，不由 Worker 下载后改写。文件 ID 需独立资源归属，不接受未登记 file_id；真实模型读取 URL 的能力仍由上游决定。"),
		entry("F-DOCUMENTS", "文档输入", "媒体与资源", "partial", []string{"messages[].content[].type:document", "messages[].content[].source", "messages[].content[].citations"}, nil, []string{"PDF / 文本 / 内容块 / URL 来源", "原始文档与引用回放"}, "保留文档来源、页码/字符索引、引用开关和工具结果文档，不提取成文本模拟 PDF。隔离 CLI 往返已验证；file_id 尚需资源映射，实际模型限制由上游返回。"),
		entry("F-FILES", "文件与容器资源", "媒体与资源", "unsupported", []string{"container", "source.file_id"}, nil, nil, "需要独立文件 API、资源归属和跨账号调度；CC 本地文件不等价于 API 文件资源。"),
		entry("F-SKILLS", "API 技能", "媒体与资源", "unsupported", []string{"container.skills"}, nil, nil, "API 容器技能不等价于 CC 本地技能；尚无完整资源与执行适配。"),
		entry("F-WEB-TOOLS", "服务端搜索与抓取", "工具", "partial", []string{"tools[].type:web_search", "tools[].type:web_fetch", "tools[].url_sources", "server_tool_use", "web_search_tool_result", "web_fetch_tool_result"}, nil, []string{"七个已登记版本的主请求定义", "结果/引用/暂停续接", "服务端用量指标"}, "服务端执行，保持定义、加密来源、工具错误和引用。新版本需显式 direct callers；代码容器/PTC 尚未接入。客户端工具混合、历史分支/冷导入与显式缓存已隔离验证；实际账号能力与模型工具收费需上线验证。"),
		entry("F-CODE-EXEC", "服务端代码执行", "工具", "unsupported", []string{"tools[].type:code_execution", "container"}, nil, nil, "需要官方容器状态、文件产物及用量，不用 Worker 本地 Bash 模拟。"),
		entry("F-PTC", "程序化工具调用", "工具", "unsupported", []string{"tools[].allowed_callers", "messages[].content[].caller"}, nil, nil, "执行容器、调用者身份和返回路由尚未完整适配。"),
		entry("F-ADVISOR", "顾问工具", "工具", "partial", []string{"tools[].type:advisor_20260301", "tools[].model", "advisor_tool_result", "usage.iterations"}, []string{"advisor-tool-2026-03-01"}, []string{"原生服务端顾问协议", "精确历史恢复", "关联模型授权与独立计费"}, "保留明文、加密和错误结果及顾问缓存配置；顾问用量不计入主模型总数，由核心独立授权、调度检查和价格快照结算。已完成 CLI 隔离回归；真实模型配对/账号资格仍需上游验证。"),
		entry("F-CLIENT-TOOLSETS", "客户端工具与工具集", "工具", "partial", []string{"toolset_name", "tools[].type", "tools[].configs", "messages[].content[].content[].type:browser_state"}, nil, []string{"固定 API 类型与联合工具身份", "外部客户端执行"}, "12 种已登记 typed 定义通过真实 CLI 与隔离上游新请求、续聊、回退、新缓存导入及 SSE 验证；工具集身份与 browser_state 保留。内部 CC 搜索、显式 safeguards 组合暂拒；删除普通 typed 定义后的历史身份不明确时拒绝。模型与提供商资格仍以上游为准。"),
		entry("F-MCP", "MCP 工具与远程连接", "工具", "partial", []string{"tools[].name", "mcp_servers", "tools[].type:mcp_toolset", "mcp_tool_listing", "mcp_tool_use", "mcp_tool_result"}, []string{"mcp-client-2025-11-20", "mcp-client-2026-09-15"}, []string{"客户端 MCP 名称保留", "服务端 connector 主请求", "凭据隔离与历史账本"}, "远程 MCP 由提供商连接，支持两版连接协议、固定工具目录、结果/暂停/混合客户端工具历史；授权令牌只注入对应服务器的已归属主请求，日志结构化脱敏。内联 MCP 变更、API ToolSearch 联用和显式 safeguards 组合暂拒；真实远端资格另行验证。"),
		entry("F-CONTEXT", "上下文编辑", "上下文", "partial", []string{"context_management"}, []string{"context-management-2025-06-27"}, []string{"已归属主请求策略保真", "响应 applied_edits 保真"}, "支持已登记 tool/thinking 编辑策略与 null；真实 CLI 配合隔离上游验证请求和响应。内层 CC 自有上下文行为不代表客户端策略的模型支持；未做真实提供商编辑效果验证。"),
		entry("F-COMPACTION", "上下文压缩", "上下文", "partial", []string{"compaction", "context_management.edits", "messages[].content[].type:compaction"}, []string{"compact-2026-01-12", "compact-2026-09-04"}, []string{"新旧协议分别保真", "空结果 / 签名块 / 终态控制"}, "支持已登记新旧压缩请求、响应块与历史回放；隔离上游验证 JSON/SSE、空 content 及签名字段保留，不验证签名真伪。非空 tool_changes 历史回放明确拒绝，避免工具目录和嵌套模型授权失配。"),
		entry("F-INLINE-TOOLS", "会话内工具变更", "上下文", "partial", []string{"messages[].content[].type:tool_addition", "messages[].content[].type:tool_removal"}, []string{"inline-tools-2026-09-15", "mid-conversation-tool-changes-2026-07-01"}, []string{"客户端工具时间线", "主请求精确载体移除"}, "客户端工具引用与定义按原历史位置生效，原顶层目录不提前展开；隔离上游验证新请求、移除、工具结果、新缓存、回退、SSE及逐块缓存。含变更的本地历史采用完整重建；服务端工具、内层 CC 搜索与显式 safeguards 组合暂拒。"),
		entry("F-FAST", "快速模式", "生成控制", "partial", []string{"speed"}, []string{"fast-mode-2026-02-01"}, []string{"attributed main request"}, "显式 fast 需管理员允许与 beta；最终主请求保真传 speed，缺省清除 CLI 默认。实际采用以 usage.speed 为准；账号资格、模型和定价仍需验证。"),
		entry("F-TASK-BUDGET", "任务预算", "生成控制", "partial", []string{"output_config.task_budget"}, []string{"task-budgets-2026-03-13"}, []string{"主请求计划"}, "按 API 原值传递建议预算（total 至少 20000）；拒绝无计量的 CLI 内部轮次组合。官方 CC/Cowork 原生界面不支持，账号上游能力须另验证。"),
		entry("F-FALLBACK", "模型回退与额度", "服务约束", "partial", []string{"fallbacks", "fallback_credit_token", "messages[].content[].type:fallback", "usage.iterations"}, []string{"server-side-fallback-2026-06-01", "server-side-fallback-2026-07-01"}, []string{"显式模型链与覆盖参数", "模型权限/价格快照", "真实 JSON 与逐次用量"}, "显式候选链交由提供商执行，每个模型单独鉴权与计价；JSON 保留官方舍弃前段输出的语义，SSE 保留原始边界，不自行重试。缺计费归属时记录账务错误，不把正常拒绝改为API错误。default、credit 和压缩组合暂拒；真实资格仍由上游决定。"),
		entry("F-ROUTING", "服务等级与地域", "服务约束", "partial", []string{"service_tier", "inference_geo"}, nil, []string{"主模型服务等级", "全部模型调用推理地域"}, "service_tier 按主请求精确映射；inference_geo 同时约束辅助模型请求并阻断无法携带地域的辅助计数。CLI 2.1.292 假上游验证通过；真实账户地域/等级支持由上游决定，不代表存储驻留。非 Anthropic transport 区域不可等价转换。"),
		entry("F-COUNT-TOKENS", "Token 计数", "其他端点", "partial", nil, nil, []string{"anthropic.count_tokens", "CLI 内层身份请求上游计数"}, "实际上游 count_tokens 计数客户端原始输入，不混入 CC 提示/工具改名、不发生成、不写会话快照。CLI 2.1.292 授权/错误/长历史及 prefill 隔离测试通过；实际账号授权仍需验证。计数不代表包含网关开销的生成账单。"),
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
		{"mcp-client-2025-11-20", "forward"},
		{"mcp-client-2026-09-15", "forward"},
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
