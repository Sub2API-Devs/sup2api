# 资源端点与 OpenAI 协议边界研究

日期：2026-10-08。研究与隔离测试记录，未开放资源接口、未改动转换业务、未调用真实云账号。

## 当前 OpenAI 路径

`next/server/internal/gateway/convert/convert.go` 定义了可复用 Converter / StreamConverter / Registry，但当前 builtins 为空。`next/server/internal/app/app.go` 使用该空 Default registry。因此 next 核心目前不能把 Chat Completions / Responses 自动转到 CCGateway；现有 fakeConv 测试只验证框架。

旧 backend 有真实转换实现：`backend/internal/pkg/apicompat`，以及 service 下 gateway_forward_as_chat_completions / gateway_forward_as_responses。Chat → Responses → Anthropic 和反向 JSON/SSE 均有代码及测试，应该复用而不是再造另一套转换器。该包有 51 个源文件/测试文件，依赖旧 internal claude/openai 的模型识别辅助；Go internal 边界和 next 独立构建上下文意味着需要进行可审核的共享包抽取。这个障碍是模块整合工作，不是技术上不可实现。

直接照搬仍有语义风险：旧 ResponsesToAnthropicRequest 对 Opus 5.5 强制 adaptive + 默认 medium effort，采用自己的 max_tokens 默认与 reasoning 映射；类型解码还可能忽略新字段。下一独立批次应抽取纯 codec 及原测试、保留旧 API wrapper，接现有 Registry，并在包装层明确准入字段。先完成文本、system/developer、普通函数工具与 tool_result 的 JSON/SSE 闭环；previous_response_id、存储、后台任务和内置远程工具不能伪装成 Messages 等价。

实际 HTTP 边界测试 `TestUnregisteredOpenAIProtocolNeverReachesAnthropicAccount` 对两个 OpenAI 端点验证空 registry 不会发出 Anthropic 上游请求，PASS 2.923s。因为没有当前可用生产转换实现，本批没有冒称“OpenAI → Worker 真实 CLI 全链已通过”。

## 资源协议可行性实证

`TestRealCLIResourceSurfaceTransportProbe` 在 CLI 2.1.292、隔离 HOME、loopback 假上游中测试四组字段，每组覆盖 fake API Key / fake OAuth：file_id 文档、container.skills + code_execution_20260521、PTC allowed_callers + container、mcp_servers + mcp_toolset。八场景全部精确保留请求字段且只发生一次模型 HTTP，PASS 5.294s。

该实验使用 EXTRA_BODY 仅用于直接 CLI 可行性探针，生产仍应使用已归属主请求计划。没有上传文件、创建容器、运行代码/技能、连接远程 MCP 或下载资源。假 OAuth 只能证明 header 传输，不能证明真实 CC 订阅授权包含资源 scope。

## 必须单独完成的资源合同

[Files API](https://platform.claude.com/docs/en/build-with-claude/files) 的隔离范围是上游 workspace，平台用户提交的裸 file_id 不能作为归属证明。目前 next gateway readBody 是 JSON 入口，Anthropic manifest 没有 Files 上传/下载/管理端点；Worker 也未提供 multipart 路由。需要新建客户端虚拟资源 ID → 用户/租户 → 上游账号/workspace/真实 ID 的映射，操作授权、大小配额、过期/删除、原账号绑定及跨账号不可复用策略。可先仅支持原账号资源；迁移必须重新上传并记录新的映射，不能靠同名 ID 猜测。

[Code execution](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool) 使用独立上游容器，复用依赖 container ID；不能替换成 Worker 的本地 Bash。[Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/quickstart) 的 API container.skills 依赖代码执行，生成文件还需 Files 下载。平台公共技能可做固定目录，custom skill 则还需要 workspace 归属及版本生命周期。仅将参数传到云端不足以宣称资源产品完整。

[PTC](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling) 必须关联 caller.tool_id、code-execution server_tool_use 与外部 tool_result，并保持容器会话；allowed_callers 是模型调用指导，不能当执行授权边界。[MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector) 的服务端远程连接与现有客户端工具 MCP 映射不同，需 URL 准入、连接凭据隔离/日志脱敏、toolset 与 history codec；不能把客户端工具注册机制当作 connector 已支持。

官方 [Authentication](https://platform.claude.com/docs/en/manage-claude/authentication) 与 [WIF scope](https://platform.claude.com/docs/en/manage-claude/wif-reference) 说明 API OAuth/WIF 可按 workspace:developer 授权资源端点；这不能推导每个 Claude Code OAuth 凭据都具备同样授权。后续真实能力验证只按账号返回的允许/拒绝记录，不把假凭据测试升级为真实授权证明。

## 本批处理结论

可证明 CLI 具备字段传输基础，也存在可抽取的旧协议 codec；后续实现具备明确路径。本批仍保持 file_id/container/custom skill/MCP connector 的明确拒绝，避免把未授权裸资源作为合法引用。`TestResourceReferencesRequireExplicitOwnershipContract` 验证这些 HTTP 请求返回明确 400、未知 Files 路由 404，PASS 0.992s。

本批不追加庞大的模块迁移或半成品资源产品。下一批应分别交付：共享 codec 抽取与 Registry 接入、Files 资源归属服务、container/Skills 生命周期、PTC 与 MCP connector 完整请求/响应/历史闭环，再用真实账号验证 scope。可先推进文本/工具纯协议子集，复杂资源必须完成相应持久化和隔离后开放。
