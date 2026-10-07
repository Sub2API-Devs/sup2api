// Package features defines the data-only feature contract shared by the host
// and its Worker. Catalog entries describe code, never deployment or account
// entitlement. Runtime evidence must be reported separately.
package features

const CatalogVersion = "2026-10-08.2"
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
		entry("F-LIMITS", "输出长度", "基础请求", "partial", []string{"max_tokens"}, nil, []string{"CLI 输出预算"}, "接受正整数；CLI 可能裁剪预算，零 token 预热尚未兼容。"),
		entry("F-STREAM", "流式与完整响应", "基础请求", "partial", []string{"stream"}, nil, []string{"JSON / SSE 编解码"}, "文本、推理、客户端工具和引用已有通路；新型服务端内容块需另行适配。"),
		entry("F-SYSTEM", "系统指令", "上下文", "partial", []string{"system", "messages[].role:system", "messages[].clear_at", "messages[].output_config"}, []string{"mid-conversation-system-clear-at-2026-08-21", "mid-conversation-output-config-2026-07-01"}, []string{"原生历史", "Mod", "上游请求还原"}, "支持顶层与会话内文本 system；模型是否接受会话内 system 由上游决定，生命周期扩展尚未实现。"),
		entry("F-MESSAGES", "历史与续聊", "上下文", "partial", []string{"messages"}, nil, []string{"原生 JSONL", "前缀命中 / 分支重建"}, "支持已适配消息块的完整历史、续聊和回退；assistant 预填与新块需要独立验证。"),
		entry("F-THINKING", "推理与签名", "生成控制", "partial", []string{"thinking", "messages[].content[].thinking", "messages[].content[].signature"}, []string{"interleaved-thinking-2025-05-14", "dev-full-thinking-2025-05-14", "thinking-display-updates-2026-08-18", "thinking-binding-controls-2026-08-01"}, []string{"CLI 推理参数", "推理块编解码"}, "已有 enabled / adaptive / disabled 与 omitted / summarized；updates、between_tools、绑定控制尚未适配。跨账号签名有效性取决于上游。"),
		entry("F-OUTPUT", "输出格式与推理强度", "生成控制", "partial", []string{"output_config.effort", "output_config.format", "output_format", "tools[].strict"}, []string{"structured-outputs-2025-11-13"}, []string{"CLI --effort", "CC 结构化输出工作流"}, "支持 effort 和 JSON schema 工作流；CC 多轮校验不等于 API 单次约束解码，strict 工具约束需独立实现。"),
		entry("F-SAMPLING", "采样参数", "生成控制", "partial", []string{"temperature", "top_p", "top_k"}, nil, []string{"已归属主模型请求的参数覆盖"}, "按原始JSON数值应用到主请求，辅助分类请求不受影响；模型不允许的采样组合由上游返回错误。已完成真实CLI隔离验证，实际账号能力另行验证。"),
		entry("F-STOP", "停止序列", "生成控制", "partial", []string{"stop_sequences"}, nil, []string{"上游生成参数", "停止原因与序列回传"}, "停止序列原样发给主模型，不在下游截断文本模拟。隔离测试覆盖续聊、分支和SSE；实际模型命中停止词仍需账号验证。"),
		entry("F-METADATA", "请求归因", "基础请求", "partial", []string{"metadata.user_id"}, nil, []string{"隔离校验"}, "不覆盖 CC 已有账号与会话身份；客户端 user_id 与 CC 身份冲突时明确拒绝。"),
		entry("F-CACHE", "提示缓存", "上下文", "partial", []string{"cache_control", "system[].cache_control", "tools[].cache_control", "messages[].content[].cache_control"}, nil, []string{"CLI 缓存 TTL", "本地历史缓存"}, "现有 TTL 映射不等于原位断点与混合 TTL 保真；本地 prefix-hit 也不等于上游缓存计费命中。"),
		entry("F-DIAGNOSTICS", "缓存诊断", "上下文", "unsupported", []string{"diagnostics"}, nil, nil, "尚无上游 message ID 与诊断端点的完整关联，拒绝诊断参数以免伪造结果。"),
		entry("F-TOOLS", "客户端工具", "工具", "partial", []string{"tools", "tools[].input_schema", "tools[].input_examples", "tools[].strict", "tools[].allowed_callers"}, nil, []string{"原生名称与 schema 匹配", "MCP 注册", "Mod 拦截与客户端回传", "工具元参数保真"}, "客户端执行工具；支持 strict、input_examples、direct callers 等元字段。原生目录已核验CLI 2.1.288/2.1.292，最终仍核对实际工具定义；程序化调用者另行适配。"),
		entry("F-TOOL-CHOICE", "工具选择与并行", "工具", "partial", []string{"tool_choice.type", "tool_choice.name", "tool_choice.disable_parallel_tool_use"}, nil, []string{"工具可见性", "已归属主模型请求的参数覆盖"}, "支持 auto / none / any / 指定工具及并行约束，工具名按执行路由转换。手动thinking、内部搜索和结构化续轮的强制选择组合暂拒绝；模型条件由上游验证。"),
		entry("F-TOOL-SEARCH", "工具搜索", "工具", "partial", []string{"tools[].defer_loading", "tools[].type", "tool_reference"}, []string{"advanced-tool-use-2025-11-20"}, []string{"CC 内部 ToolSearch", "API regex / bm25 搜索协议", "搜索结果与引用历史往返"}, "内部搜索按CC特性配置；API搜索已接入定义、结果、引用和续聊/回退/导入。API搜索请求关闭内部搜索，避免重复执行。实际提供商是否支持需账号验证，目录中的旧beta不是所有API搜索请求的必需项。"),
		entry("F-TOOL-STREAM", "工具参数流", "工具", "partial", []string{"tools[].eager_input_streaming", "stream"}, []string{"fine-grained-tool-streaming-2025-05-14"}, []string{"CLI 细粒度流环境变量", "每工具参数保真", "SSE input_json_delta"}, "支持全局beta和每工具eager_input_streaming的出站处理，工具JSON片段到块结束后再校验；实际流行为取决于模型与提供商。"),
		entry("F-CITATIONS", "引用", "媒体与资源", "partial", []string{"messages[].content[].citations", "messages[].content[].citations.enabled"}, nil, []string{"文本引用与 citations_delta"}, "已保留文本引用和增量；文档/搜索来源与新引用类型须与对应功能一起验证。"),
		entry("F-IMAGES", "图片输入", "媒体与资源", "partial", []string{"messages[].content[].source"}, nil, []string{"原生图片块"}, "支持用户 base64 PNG / JPEG / GIF / WebP；URL、file 及其他输入位置尚未保真适配。"),
		entry("F-DOCUMENTS", "文档输入", "媒体与资源", "unsupported", []string{"messages[].content[].type:document"}, nil, nil, "需要保留 PDF/文本来源及引用索引；不能以文本提取冒充完整文档协议。"),
		entry("F-FILES", "文件与容器资源", "媒体与资源", "unsupported", []string{"container", "source.file_id"}, nil, nil, "需要独立文件 API、资源归属和跨账号调度；CC 本地文件不等价于 API 文件资源。"),
		entry("F-SKILLS", "API 技能", "媒体与资源", "unsupported", []string{"container.skills"}, nil, nil, "API 容器技能不等价于 CC 本地技能；尚无完整资源与执行适配。"),
		entry("F-WEB-TOOLS", "服务端搜索与抓取", "工具", "unsupported", []string{"tools[].type:web_search", "tools[].type:web_fetch"}, nil, nil, "官方服务端执行、结果、引用和计费尚未适配，不自动替换为客户端同名工具。"),
		entry("F-CODE-EXEC", "服务端代码执行", "工具", "unsupported", []string{"tools[].type:code_execution", "container"}, nil, nil, "需要官方容器状态、文件产物及用量，不用 Worker 本地 Bash 模拟。"),
		entry("F-PTC", "程序化工具调用", "工具", "unsupported", []string{"tools[].allowed_callers", "messages[].content[].caller"}, nil, nil, "执行容器、调用者身份和返回路由尚未完整适配。"),
		entry("F-ADVISOR", "顾问工具", "工具", "unsupported", []string{"tools[].type:advisor"}, nil, nil, "需要嵌套调用结果、用量与历史 codec，尚未实现。"),
		entry("F-CLIENT-TOOLSETS", "客户端工具集", "工具", "unsupported", []string{"toolset_name", "tools[].type"}, nil, nil, "需按工具集与名称联合标识；尚不接受版本化工具集定义。普通客户端工具可使用 F-TOOLS。"),
		entry("F-MCP", "MCP 工具", "工具", "partial", []string{"tools[].name", "mcp_servers"}, nil, []string{"客户端 MCP 名称拆分与注册"}, "客户端已有 MCP 名称保留；API connector 的服务器连接、认证和结果协议尚未实现。"),
		entry("F-CONTEXT", "上下文编辑", "上下文", "unsupported", []string{"context_management"}, []string{"context-management-2025-06-27"}, nil, "API 编辑策略及 applied_edits 未适配；CC 自带内部上下文行为不代表接受客户端策略。"),
		entry("F-COMPACTION", "上下文压缩", "上下文", "unsupported", []string{"compaction", "context_management.edits"}, nil, nil, "API 压缩返回块及回放尚未实现；不以自动摘要代替。"),
		entry("F-INLINE-TOOLS", "会话内工具变更", "上下文", "unsupported", []string{"messages[].content[].type:tool_addition", "messages[].content[].type:tool_removal"}, []string{"inline-tools-2026-09-15", "mid-conversation-tool-changes-2026-07-01"}, nil, "须按历史位置生效且保留引用身份；当前只支持顶层工具定义。"),
		entry("F-FAST", "快速模式", "生成控制", "partial", []string{"speed"}, []string{"fast-mode-2026-02-01"}, []string{"CC fastMode"}, "受管理员策略、账号资格和模型限制；开启配置不代表实际采用或享有资格。"),
		entry("F-TASK-BUDGET", "任务预算", "生成控制", "unsupported", []string{"output_config.task_budget"}, nil, nil, "官方任务预算专题与 CC/SDK 字段存在适用范围差异；合法预算及账号产品支持尚未证实。"),
		entry("F-FALLBACK", "模型回退与额度", "服务约束", "unsupported", []string{"fallbacks", "fallback_credit_token"}, nil, nil, "需要实际模型、回退额度和账号绑定完整处理；不能用网关重试冒充。"),
		entry("F-ROUTING", "服务等级与地域", "服务约束", "partial", []string{"service_tier", "inference_geo"}, nil, []string{"主模型请求参数计划"}, "service_tier 映射正在验证；地域约束尚未适配，禁止静默忽略。"),
		entry("F-COUNT-TOKENS", "Token 计数", "其他端点", "unsupported", nil, nil, nil, "公开计数端点尚未接入；不能用粗略本地估算冒充上游计数。"),
		entry("F-OTHER-APIS", "其他协议与端点", "其他端点", "unsupported", nil, nil, nil, "主要契约为 Anthropic Messages；OpenAI、Files、Batches 等需独立适配，不能由 Messages 兼容自动推导支持。"),
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
		{"dangerous-tool-use-2026-09-03", "forward"},
		{"interleaved-thinking-2025-05-14", "forward"},
		{"fine-grained-tool-streaming-2025-05-14", "fine_grained_tools"},
		{"context-1m-2025-08-07", "forward"},
		{"fast-mode-2026-02-01", "fast"},
		{"advanced-tool-use-2025-11-20", "tool_search"},
		{"dev-full-thinking-2025-05-14", "forward"},
		{"model-context-window-exceeded-2025-08-26", "forward"},
	}
}
