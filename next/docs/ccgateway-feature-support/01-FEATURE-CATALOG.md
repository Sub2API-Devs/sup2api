# CCGateway 功能目录与协议归属

证据日期：2026-10-08。范围：客户端 Anthropic Messages 请求，经平台调度到 Claude Code Worker；本文件是实施设计，不是已上线支持承诺。本轮只查文档、读源码，未改业务代码。官方文档是滚动版本，不能直接证明生产 CLI 或具体账号可用；本轮未重新读取生产 CLI 版本。

## 阅读规则

- **自然支持**：CC 有对应公开能力；仍须验证 Worker 是否保留请求、响应和历史语义。
- **需适配**：当前解析、映射或往返协议存在明确缺口。
- **条件可行**：存在候选实现，但取决于模型、CLI 版本、认证、提供商或实验验证。
- **无法等价**：不能用相似名称的 CC 本地功能替代官方 API 协议；可另建专门适配器。
- **未验证**：无完整证据，不得自动展示为支持。

这些标签可同时出现。接收字段、启动 CLI、上游请求含字段、真实模型采用字段、历史可重放，是五层不同证据。`anthropic-beta` 是功能选择信号，不能替代 body/response/history 实现。

源码定位基准：[`request_policy.go`](../../plugins/ccgateway/companions/engine/request_policy.go)、[`request.go`](../../plugins/ccgateway/companions/engine/request.go)、[`runner_config.go`](../../plugins/ccgateway/companions/engine/runner_config.go)。源码状态在本轮直接复核；其他文件的支持情况必须与配套代码审计及测试报告合并判断。

## 全部顶层字段归属

以下覆盖核验日官方 beta Messages `create` 文档公开的顶层请求字段。每个字段必须进入显式处理计划，不能依靠未知字段忽略策略取得“支持”状态。

- `model` → F-MODEL。
- `max_tokens` → F-LIMITS；`stream` → F-STREAM。
- `messages` → F-MESSAGES；`system` → F-SYSTEM。
- `thinking` → F-THINKING；`output_config`、旧 `output_format` → F-OUTPUT；`output_config.task_budget` → F-TASK-BUDGET。
- `temperature`、`top_p`、`top_k` → F-SAMPLING；`stop_sequences` → F-STOP。
- `tools` → F-TOOLS 及所有具体工具功能；`tool_choice` → F-TOOL-CHOICE。
- `cache_control` → F-CACHE；`diagnostics` → F-DIAGNOSTICS。
- `metadata` → F-METADATA；`inference_geo`、`service_tier` → F-ROUTING；`speed` → F-FAST。
- `container` → F-FILES / F-CODE-EXEC / F-SKILLS；`mcp_servers` → F-MCP。
- `context_management` → F-CONTEXT；`compaction` → F-COMPACTION。
- `fallbacks`、`fallback_credit_token` → F-FALLBACK。

来源：[Messages beta API reference](https://platform.claude.com/docs/en/api/http/beta/messages/create)。该参考页含历史兼容描述，遇到与专题模型限制不一致时，记录差异并以目标模型实测验证，不能仅凭通用字段存在判可用。

## 核心请求功能

### F-MODEL — 模型、上下文窗口与能力选择

- 输入：`model`；历史 beta `context-1m-2025-08-07`，旧 `output-128k-2025-02-19`、`output-300k-2026-03-24` 只作待验证能力信号，不能代替模型授权。
- 当前：模型传入 `--model`；1M beta 另设置 CC 上下文相关环境变量。**自然支持 / 条件可行**。
- 方案：按实际 CLI、模型、提供商、认证类型维护能力。新模型可能原生 1M，部分模型需 `[1m]` 后缀，部分旧 beta 已退役。不能把全局一个上下文数覆盖所有模型。
- 响应/历史：保留实际服务模型；模型变化会影响 thinking 绑定、缓存和 fallback。不得静默换模型。
- 来源：[CC model configuration](https://code.claude.com/docs/en/model-config)、[SDK reference](https://code.claude.com/docs/en/agent-sdk/typescript)。

### F-LIMITS — 输出硬上限与预热请求

- 输入：`max_tokens`；当前要求正整数并映射 `CLAUDE_CODE_MAX_OUTPUT_TOKENS`。**自然支持但语义需适配**。
- 官方支持 `max_tokens:0` 的缓存预热；当前解析器拒绝。不能通过生成一次空答案模拟预热。
- 方案：正常值核对真正上游值及 `stop_reason:max_tokens`；0 值单独实施/明确拒绝。不要用 CC `maxTurns`、USD预算替代 token 上限。
- 来源：[Messages create](https://platform.claude.com/docs/en/api/messages/create)、[CC environment variables](https://code.claude.com/docs/en/env-vars)。

### F-STREAM — JSON/SSE、停止原因和错误

- 当前：有 JSON/SSE 输出、thinking/tool/citations 处理；**已部分适配**，不能据此宣称所有新块可往返。
- 保留：`message_start`、content block start/delta/stop、`message_delta`、`message_stop`，允许 ping；未知事件应可观测、受控兼容，不直接误判模型失败。
- 增量类型：`text_delta`、`input_json_delta`、`thinking_delta`、`signature_delta`、`citations_delta`、`compaction_delta`。按 block index 归并；部分 JSON 在结束前不要求完整。
- HTTP 200 的正常 refusal 仍是模型响应；流内 error 与正常 stop_reason 分开。保留 stop_details、stop_sequence、usage 及新增响应字段。
- fallback 边界及 `input_transformations` 见 F-FALLBACK/F-THINKING；usage delta 是累计值，不能重复累加。
- 来源：[Streaming](https://platform.claude.com/docs/en/build-with-claude/streaming)。

### F-MESSAGES — 消息序列、prefill 和原生历史

- 当前 `Message` 只存 role/content；解析器及会话校验有额外限制，assistant prefill（末条 assistant）拒绝。**需适配 / 模型条件限制**。
- 方案：保留原始 role、位置、块顺序、未知但已登记的扩展字段。新会话导入、prefix hit、回退、分支、工具结果续聊均使用同一 codec。
- prefill 不能一律宣称支持：模型/thinking 限制不同；需显式能力判断，不能自动改成 user。
- 已知块的全量归属见下文“类型清单”；签名、加密块、server tool 状态和 compaction 不允许转成普通文本摘要。
- 来源：[Messages API](https://platform.claude.com/docs/en/api/messages/create)、[Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking)。

### F-SYSTEM — 顶层、会话中 system 和生命周期

- 当前支持顶层文本及会话中 system 的恢复路径；顶部 system 缓存元数据会被解析成文本/TTL。**已部分适配**。
- `messages[].clear_at`（`never` / `next_user_message`）需 `mid-conversation-system-clear-at-2026-08-21`；会话内 `output_config.effort` 对应 `mid-conversation-output-config-2026-07-01`。已增加 Message 元字段与历史指纹、按原位置恢复；effort-only 不进入原生文本。真实 CLI 对假上游通过新建、续聊、回退、新 cache 导入与 12 轮重复长历史，**已适配，真实上游语义待验证**。
- 不得统一搬到顶层或反复附加；clear_at 到期仍保留历史原条目，由对应语义决定是否展示。客户端环境附件策略不得删除普通 system 指令。
- 方案：每条 system 的内容、位置、生命周期、effort 分开存储；当前模型是否支持 inline system 需要核验，不能沿用所有 Sonnet/Opus通用假设。
- 来源：[Mid-conversation system messages and tool changes](https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages)。

### F-THINKING — 推理模式、展示、绑定与签名

- 当前解析 adaptive/enabled/disabled，budget_tokens、display omitted/summarized；CLI使用 `--thinking` / `--max-thinking-tokens` / `--thinking-display` 及相关环境变量。**自然支持 / 部分适配**。
- 当前未传 thinking 时走 disabled：这不同于模型或 CC 默认，必须作为显式策略记录，不应暗称默认透传。
- 新 API `display:updates` 对应 `thinking-display-updates-2026-08-18`；`between_tools` 是特定模型的模式，不应全模型启用。当前不支持不得静默改写。
- `thinking.block_binding.prefix_mismatch_behavior:error|drop_block`及`input_transformations`需要`thinking-binding-controls-2026-08-01`；当前解析器不接受block_binding。默认行为还取决于上游账号和模型，不能擅自设drop_block来隐藏历史重建错误。部分新模型thinking还绑定账号；跨账号调度必须保留原块并记录上游采用/丢弃证据，不能承诺完整推理连续性。
- 保留 thinking/signature、redacted_thinking/data；omitted可有空thinking+有效signature，不等于错误。绑定控制相关 `input_transformations` 必须保留原始 path/reason/type，并正确处理 fallback后最终替换/补充信息。
- 模型限制：新模型采样限制、forced tool选择、prefill限制不可只按thinking开关判断。绝不伪造signature或去掉安全编辑后的块。
- 来源：[Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking)、[Preserved thinking](https://platform.claude.com/docs/en/build-with-claude/preserved-thinking)、[SDK ThinkingConfig](https://code.claude.com/docs/en/agent-sdk/typescript)、[Streaming](https://platform.claude.com/docs/en/build-with-claude/streaming)。

### F-OUTPUT — effort、JSON schema 和 strict tool

- 当前 `output_config.effort` 解析 low/medium/high/xhigh/max → `--effort`；format → `--json-schema`；其他子字段按 unknown_field 策略拒绝/忽略。
- API正式格式 `output_config.format` 无需旧beta；旧 `output_format` 对应 `structured-outputs-2025-11-13`。两个同时出现当前拒绝，应继续明确冲突。
- SDK `outputFormat` 是工作流结束后校验且可重提示；不能直接当作单次 API constrained decoding 等价实现。当前 Worker的structured-output Mod/relay还须独立审计。
- `tools[].strict` 是工具参数约束，与最终JSON输出分别实现。schema校验、实际出站、返回块和工具结果续聊须分别测试。
- 来源：[API structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)、[SDK structured outputs](https://code.claude.com/docs/en/agent-sdk/structured-outputs)、[Effort](https://platform.claude.com/docs/en/build-with-claude/effort)。

### F-SAMPLING / F-STOP / F-METADATA — 普通参数也不能丢

- F-SAMPLING：temperature/top_p/top_k 当前不在顶层白名单。候选在允许模型的实际上游请求应用；新模型拒绝非默认采样，不得悄悄删参数让请求成功。**需适配/模型条件**。
- F-STOP：stop_sequences 当前不支持。必须在生成阶段生效并保留 stop_sequence；下游截断文本不等价（计费、工具JSON、签名、历史会变）。**条件可行**。
- F-METADATA：`metadata.user_id` 是外部 opaque 用户归因值（可 null，最多 512 字符），不是账号鉴权。显式 metadata 在已归属主模型请求中完整替换内层 metadata（含 `{}`）；JSON 形字符串逐字保留，不解析/拼接内部 account/session 字段。缺省保留 CLI 默认值，辅助/count 请求不套用。原“不同 user_id 必须冲突拒绝”没有官方依据，已纠正；HTTP 凭据和 CLI 授权独立保留。真实账号接受性仍待验证。官方：[MetadataParam](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/metadata_param.py)。
- 来源：[Messages create](https://platform.claude.com/docs/en/api/messages/create)、[Thinking compatibility](https://platform.claude.com/docs/en/build-with-claude/thinking)。

### F-CACHE / F-DIAGNOSTICS — 缓存控制与诊断

- F-CACHE 当前将顶层、system/tool/content cache_control 收集为TTL，删除原块标记，映射CLI全局cache TTL。**部分支持TTL，不支持断点原位等价**。
- 需保留具体断点位置、5m/1h各自TTL、自动缓存与显式断点的区别；不要把“本地prefix-hit”“上游cache-read”“计费节省”混为一个状态。
- 系统首块/工具定义/图片处理/CLI attribution 注入可能改变缓存前缀；审计实际出站首块及插入位置，不能把CLI新增元数据归因成客户端system重复。缓存命中及usage归因需真实证据。
- F-DIAGNOSTICS：2026-10-08 已按当前 GA 文档实现主请求 diagnostics 对象/null 与响应保真，无需旧 beta。previous_message_id 只接受同 host 客户端 scope、同 Worker 的实际响应 ID；独立持久索引一小时/4096 条，关闭调试日志不清除，未知、过期、跨账号明确拒绝。隔离真实 CLI JSON/SSE 往返已通过；上游指纹是否存在、可比较仍由 provider 返回，不是本地 transcript 命中率。详见 implementation/FAST-DIAGNOSTICS-PROGRESS.md。
- 来源：[Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)、[Cache diagnostics](https://platform.claude.com/docs/en/build-with-claude/cache-diagnostics)。

## 工具与内容功能

### F-TOOLS / F-TOOL-CHOICE — 客户端工具与内置拦截

- F-TOOLS 当前接受name/description/input_schema/cache_control/defer_loading；其他tool定义字段拒绝。原生名称+参数匹配、MCP名称映射及Mod拦截有现有实现，细节以代码审计为准。
- 需补 `strict`、`input_examples`、`allowed_callers`、`eager_input_streaming` 等字段的独立语义；不是全部原样塞MCP schema。schema本身必须保持未知JSON schema关键词。
- F-TOOL-CHOICE 当前只auto/none。`any`、指定tool、`disable_parallel_tool_use` 需要模型能力及真正生成约束，不能靠提示词“尽量调用”。Opus5.5等特定新模型直接拒绝forced tool choice，按官方限制保留错误。
- `tool_use.caller`当前只direct；`tool_result`仅text/image内容，属于可见协议缺口。
- 来源：[Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use)、[Thinking compatibility](https://platform.claude.com/docs/en/build-with-claude/thinking)。

### F-TOOL-SEARCH — 延迟工具发现

- 统一父功能ID为F-TOOL-SEARCH，子能力为`cc_internal`与`api_server`；分别评估和验证，前端仍只显示一个特性入口，详情解释两种模式。单个子能力可用不代表整个API协议已支持。
- 官方工具类型 `tool_search_tool_regex_20251119` / `tool_search_tool_bm25_20251119`；API参考也列无日期别名。旧 `advanced-tool-use-2025-11-20` 不应成为唯一启用信号。
- 当前支持defer_loading及CC ENABLE_TOOL_SEARCH；官方带type的工具定义、server_tool_use/tool_search_tool_result/tool_reference历史仍需适配。
- CC与SDK `ENABLE_TOOL_SEARCH`支持true/false/auto/auto:N，非第一方baseURL有默认限制；实验beta禁用设置有更高优先级。注册成功不证明生效。
- API搜索由上游执行；CC本地ToolSearch不自动等同API regex/BM25搜索。候选优先保留官方server-tool协议；若转成本地模拟，必须明确能力差异，不能伪造server工具输出。
- 历史必须保存搜索结果及reference；所有工具定义仍随请求提交；不要给server-tool ID回客户端tool_result。
- 来源：[API Tool Search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)、[SDK Tool Search](https://code.claude.com/docs/en/agent-sdk/tool-search)。

### F-TOOL-STREAM — 细粒度工具参数

- 当前旧 `fine-grained-tool-streaming-2025-05-14`映射环境变量；新 `tools[].eager_input_streaming`不在解析白名单。**需适配**。
- per-tool显式设置应有清晰优先级，不能用一个全局beta覆盖false。partial_json保持原样；block结束前不要求完整，max_tokens截断时也不能伪造完整参数。
- 来源：[Fine-grained tool streaming](https://platform.claude.com/docs/en/agents-and-tools/tool-use/fine-grained-tool-streaming)。

### F-CITATIONS — 引用与检索结果

- 当前已支持text.citations校验及citations_delta，不是完全缺失。**部分适配**；document/search_result输入支持缺失使端到端范围受限。
- 引用位置类型：char_location、page_location、content_block_location、web_search_result_location、search_result_location；保持索引、URL、文档标题、加密引用字段和对应原文，禁止改写文本后沿用旧偏移。
- `search_result` 可在工具结果中出现；当前tool_result只text/image，需拓展。先验证输入、输出、历史回传及SSE引用索引一致。
- 来源：[Citations](https://platform.claude.com/docs/en/build-with-claude/citations)、[Search results](https://platform.claude.com/docs/en/build-with-claude/search-results)。

### F-IMAGES / F-DOCUMENTS / F-FILES / F-SKILLS — 多模态和资源状态

- F-IMAGES：当前只user base64 PNG/JPEG/GIF/WebP，URL/file来源、transformations等不支持。候选转换须记录缩放/编码是否发生；不可改变图片顺序、引用或缓存断点而无记录。来源：[Vision](https://platform.claude.com/docs/en/build-with-claude/vision)。
- F-DOCUMENTS：document/PDF/plain text/content sources及document citations当前不支持。不要把PDF提取文本当完全等价；页码/图像/引用坐标会变。来源：[PDF](https://platform.claude.com/docs/en/build-with-claude/pdf-support)。
- F-FILES：file_id、container_upload、container ID是上游账号范围的资源。跨账号调度不能直接复用；需资源归属/生命周期/迁移策略，或明确只允许原账号。`files-api-2025-04-14`本身不实现上传下载。来源：[Files API](https://platform.claude.com/docs/en/build-with-claude/files)。
- F-SKILLS：container.skills含anthropic/custom、skill_id/version；`skills-2025-10-02`与相关工具/Files依赖需验证。API容器技能不等同Worker本地SKILL.md或CC plugin skill；当前container字段被过滤，**无法直接等价**。来源：[Skills in the API](https://platform.claude.com/docs/en/build-with-claude/skills-guide)。

### F-WEB-TOOLS — 官方WebSearch/WebFetch

- 类型：web_search_20250305/20260209/20260318；web_fetch_20250910/20260209/20260309/20260318。版本间schema和过滤行为必须分别校验。
- 当前tools.type及server响应/历史块缺失。**需适配/未验证**。CC本地WebSearch/WebFetch不是按名字就等价；domain限制、max_uses、用户位置、引用、动态过滤等须保留。
- 结果：server_tool_use、web_search_tool_result、web_fetch_tool_result及各自result/error；正常工具失败结果不能一律变网关502。
- 来源：[Web search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)、[Web fetch](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool)。

### F-CODE-EXEC / F-PTC / F-ADVISOR — 上游执行与状态

- F-CODE-EXEC：code_execution_20250522/20250825/20260120/20260521，对应执行结果、bash/text-editor结果、加密结果、文件产物及container。当前不支持；**无法用Worker本地Bash等价替换**。来源：[Code execution](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool)。
- F-PTC：allowed_callers及tool_use.caller表示代码容器发起调用；container必须保持，等待期间超时/恢复和结果路由单独实现。当前仅direct caller；**需专门适配**。来源：[PTC](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling)。
- F-ADVISOR：advisor_20260301及advisor-tool-2026-03-01；结果含advisor_result/advisor_redacted_result/error，嵌套模型/usage不得当普通客户端工具。CC有advisor配置入口仅说明候选可行，当前tools.type不接受，**未验证**。来源：[Advisor](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool)、[CLI reference](https://code.claude.com/docs/en/cli-reference)。

### F-CLIENT-TOOLSETS — Anthropic定义的客户端工具

- 类型：bash_20241022/20250124；text_editor_20241022/20250124/20250429/20250728；computer_20241022/20250124/20251124；memory_20250818；computer_toolset_20260801；browser_toolset_20260801。
- 这些类型定义协议/参数，并非授权Worker直接操作容器。当前只接受普通自定义工具，**需适配**；应展开为客户端执行协议或保持原类型，匹配内置工具必须严格验证语义。
- toolset成员配置、defer_loading、browser_state及相关事件须成组处理。公开ToolUnion列出的类型不意味着每个模型或CC当前版本都支持。
- 成员调用/结果还有`toolset_name`，必须与name联合路由，避免browser/computer/custom工具同名冲突。defer_loading放成员configs且启用成员值一致；toolset不接受strict/input_examples/code-execution caller，旧fine-grained beta也不兼容。不能沿用普通Tool DTO直接展开而丢失这些约束。
- 来源：[Tool reference](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-reference)、[Computer use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)、[Browser use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/browser-use-tool)。

### F-MCP — API MCP connector与客户端MCP命名

- `mcp_servers`、mcp_toolset、default_config/configs，与mcp-client-2025-04-04/2025-11-20/2026-09-15协议版本关联。当前只存在客户端工具MCP注册/名称映射，不是API connector全兼容。
- 响应/历史：mcp_tool_use、mcp_tool_result、mcp_tool_listing；listing须原样回传以保留工具视图。客户端mcp__前缀与API server_name不是可混用字段。
- 转CC MCP会改变执行位置、连接凭据及可能的权限语义；必须专门设计隔离、地址策略及结果翻译，禁止把任意API请求变成无约束本机MCP配置。
- 来源：[MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)。

## 上下文、执行策略及服务边界

### F-CONTEXT / F-COMPACTION / F-INLINE-TOOLS

- F-CONTEXT：context-management-2025-06-27，context_management.edits 的 clear_tool_uses_20250919 / clear_thinking_20251015 / compact_20260112。当前顶层不接受；不能靠删JSONL或CC自动compact代替。保留applied_edits与真实上下文差异。来源：[Context editing](https://platform.claude.com/docs/en/build-with-claude/context-editing)。
- F-COMPACTION：旧compact-2026-01-12和新compact-2026-09-04需要按实际文档/模型分代。新compaction请求与context_management互斥；结果compaction块、compaction_delta和stop_reason都要支持，后续历史按原块恢复。CC默认自动压缩在当前Worker禁用，不能静默打开冒充。来源：[Compaction](https://platform.claude.com/docs/en/build-with-claude/compaction)。
- F-INLINE-TOOLS：mid-conversation-tool-changes-2026-07-01用于按引用变更；inline-tools-2026-09-15进一步允许tool_definition，MCP内联还需mcp-client-2026-09-15。当前不支持tool_addition/removal等块。保持每一历史位置的工具视图；不能只取最终tools。来源：[Mid-conversation changes](https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages)。

### F-FAST / F-TASK-BUDGET / F-FALLBACK / F-ROUTING

- F-FAST：speed fast/standard/null 保真应用到已归属的主请求，缺省删除 CLI speed；fast 需 AllowFast 与 fast-mode-2026-02-01，关闭策略明确拒绝。API 路径不借 CLI fastMode 自动降档。隔离真实 CLI 四种形态与 usage.speed 回传已验证；真实产品资格、容量和管理员价格表达式未由假上游证明。来源：[Fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode)。
- F-TASK-BUDGET：task-budgets-2026-03-13，output_config.task_budget type/tokens total/remaining。已增加主请求计划适配与六种真实 CLI 隔离往返；不是 max_tokens 或 USD 预算，账号上游能力待验证。拒绝无计量的 CLI 内部轮次组合以及 signed compaction/compaction 请求中的非空 remaining。软预算不能保证硬截断。来源：[Task budgets](https://platform.claude.com/docs/en/build-with-claude/task-budgets)。
- F-TASK-BUDGET限制：官方total最小20000。官方专题当前还说明Claude Code/Cowork surface不支持该功能，而SDK入口/本地CLI隔离捕获确实存在参数路径；这是服务可用性与客户端传输的证据差异，不能推断OAuth订阅可用。记录为条件可行/账号待验证；12000的旧抓包只是非法值仍能发出的传输实验。优先用合法值与获权API渠道验证，不能靠补beta绕过产品限制。
- F-FALLBACK：fallbacks及fallback_credit_token、server-side-fallback-2026-06-01/2026-07-01、fallback-credit-2026-06-01/2026-07-01。不同代语义需核对；当前顶层不支持，CC本地fallbackModel不等价服务端重试/抵扣。保留fallback块边界、实际模型、累计usage/iterations/credit状态以及thinking绑定。当前缺口不得通过删除refusal或绕过safeguards补齐。来源：[Stop reasons and fallback](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons)、[Fallback credit](https://platform.claude.com/docs/en/build-with-claude/fallback-credit)、[Streaming](https://platform.claude.com/docs/en/build-with-claude/streaming)。
- F-ROUTING：inference_geo/service_tier以及workspace/user-profile headers是上游服务约束/归属，不是模型提示词。当前body不接受；若无满足条件的渠道，应明确不支持，禁止静默当global/standard处理。不能把客户端workspace ID当平台账号授权。来源：[Messages API](https://platform.claude.com/docs/en/api/messages/create)。

### F-COUNT-TOKENS / F-OTHER-APIS

- F-COUNT-TOKENS：`POST /v1/messages/count_tokens`是独立接口；不应发真实生成去估算，也不能把CC内部count请求转发等同客户端接口已实现。支持输入类型/工具/system/图片/PDF时应与Messages一致，返回是估算不承诺最终计费。当前外部路由支持需代码审计；本文件只确认relay里存在CC内部count请求识别。来源：[Token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting)。
- 代码审计补充：当前插件明确拒绝非Messages协议，外部count_tokens未实现；内部relay识别计数请求不改变该结论。实现方案见[协议范围](05-PROTOCOL-SCOPE.md)。
- F-OTHER-APIS：Models、Files、Batches、Skills管理、Managed Agents sessions/environments、Admin/workspaces/user profiles、MCP tunnels、dreaming/agent-memory、spend-limit等不是一个Messages请求的beta开关。分别建端点和资源归属能力，未实现返回明确错误；禁止通过CC CLI假装提供完整产品。来源：[API overview](https://platform.claude.com/docs/en/api/overview)、[Beta headers](https://platform.claude.com/docs/en/api/beta-headers)。

## 内容、工具和响应类型覆盖索引

以下是核验日API reference公开类型的功能归属；既包括独立块也包括嵌套结果，不意味着它们均允许出现在任意role/位置。

- text → F-MESSAGES/F-CITATIONS；image → F-IMAGES；document → F-DOCUMENTS；search_result → F-CITATIONS；thinking/redacted_thinking → F-THINKING。
- tool_use/tool_result，caller direct → F-TOOLS；caller code_execution_* → F-PTC；server_tool_use由具体server工具所有，不能发给客户端普通工具执行器。
- web_search_tool_result / web_search_result / web_search_tool_result_error → F-WEB-TOOLS。
- web_fetch_tool_result / web_fetch_result / web_fetch_tool_result_error → F-WEB-TOOLS。
- code_execution_tool_result / code_execution_result / encrypted_code_execution_result / code_execution_output / code_execution_tool_result_error → F-CODE-EXEC。
- bash_code_execution_tool_result / bash_code_execution_result / bash_code_execution_output / bash_code_execution_tool_result_error → F-CODE-EXEC。
- text_editor_code_execution_tool_result / view_result / create_result / str_replace_result / tool_result_error（均带text_editor_code_execution前缀）→ F-CODE-EXEC。
- advisor_tool_result / advisor_result / advisor_redacted_result / advisor_tool_result_error / advisor_message → F-ADVISOR。
- tool_search_tool_result / tool_search_tool_search_result / tool_search_tool_result_error / tool_reference → F-TOOL-SEARCH。
- mcp_tool_use / mcp_tool_result / mcp_tool_listing / mcp_tool_reference / mcp_toolset_reference → F-MCP；tool_addition / tool_removal / tool_definition → F-INLINE-TOOLS。
- container_upload / file引用与产物 → F-FILES；compaction → F-COMPACTION；fallback / fallback_message → F-FALLBACK。
- browser_state及download_started/completed/failed、tab_opened等嵌套事件 → F-CLIENT-TOOLSETS；不能按普通文本丢弃结构。
- input_transformations里的thinking_dropped/thinking_mismatch_allowed → F-THINKING；cache_miss_reason变体 → F-DIAGNOSTICS。
- SSE事件/所有delta → F-STREAM。response容器/usage/stop_details/diagnostics/context_management等顶层字段由所属功能维护，禁止只从CLI最终一句result重建完整API响应。

输入源码当前支持的块集合仅text/tool_use/tool_result/image/thinking/redacted_thinking，嵌套tool_result更窄；扩大工具类型而不扩大历史codec会导致首轮成功、第二轮失败。

## Beta不是完整支持列表

当前七条内置规则：interleaved-thinking-2025-05-14、fine-grained-tool-streaming-2025-05-14、context-1m-2025-08-07、fast-mode-2026-02-01、advanced-tool-use-2025-11-20、dev-full-thinking-2025-05-14、model-context-window-exceeded-2025-08-26。Worker会覆盖配置传入的自定义规则，未知beta默认忽略。以上仅是**当前路由规则**。

新方案应以本目录功能ID登记所需header/body/codec，记录`requested`、`applied`、`ignored`、`rejected`及原因。对于废弃beta与已GA功能，保留兼容映射但不强制发送旧header；对于未知beta，不承诺自动支持。

CLI `--betas`公开文档限定API key用户；Agent SDK公开SdkBeta类型并不是内部全部能力清单。平台调用Key不等于Worker上游API Key：#21的API Key路径与#22的OAuth路径必须分别验证。环境变量/Mod能够形成某个上游请求也不证明该账号被授权使用全部beta。

## 未验证清单与验收前置条件

- 本目录没有新增真实模型调用证据；最新官方类型能否通过本地/生产CLI版本完整往返仍需验证。
- 通用API reference存在“无system role”的旧说明，同时beta schema提供system role；使用专题模型兼容性和真实请求消除矛盾，不能一刀切。
- thinking between_tools/binding完整配置、最新toolset成员schema、新版compaction/fallback详情必须用独立夹具补齐；目录已留功能归属，不能算完成实现。
- 每个功能至少覆盖：无参数默认、显式参数、非法/冲突、JSON/SSE、首轮/续聊/导入/回退/分支、API Key/OAuth、允许/禁用策略、日志真实出站、错误原样返回。状态持有功能还需跨账号调度/资源过期场景。
- 对无法等价的API产品优先明确拒绝；若新增直连API执行器，应在架构和用户能力显示中明确，不能隐藏为CC已经支持。
