# API 服务端 ToolSearch 首轮实现与证据

日期：2026-10-08。CLI：本机 2.1.292。证据层级：源码、单测、真实 CLI 对隔离假上游；尚未请求真实 Anthropic 服务端搜索，未部署。

## 范围与归属

- 接纳 API `tool_search_tool_regex_20251119` / `tool_search_tool_bm25_20251119` 及对应不带日期的类型名；固定官方工具名。其他服务端执行工具继续拒绝，不伪装客户端 MCP。
- `Request.ServerTools` 与客户端 `Tools` 分离。CLI 只注册客户端工具，服务端搜索定义由已确认主请求的 relay 调用 `ApplyMainRequestFeatures` 注入；辅助请求不注入。
- API 搜索启用时明确关闭 CC 内部 `ToolSearch`，避免两套搜索循环互相影响。客户端工具的 `defer_loading`、原始 schema、description 恢复到上游目录。新功能触发已有 nonce + lease 归属、双 snapshot 关闭机制。
- 搜索响应的 `server_tool_use`、`tool_search_tool_result` 原样走 JSON/SSE；`tool_references[].tool_name` 在客户端名称与 wire 名称间双向映射。普通 `tool_use` 仍走原有客户端工具交接。
- 服务器调用 ID 不接收客户端 `tool_result`；历史须有同一 assistant 消息中的调用/结果配对，引用工具必须有定义。服务端搜索错误是正常结果块，不转换成网关错误。
- 历史 wire 转换深拷贝嵌套引用，原客户端历史不被覆盖。未改 native JSONL 编解码：真实 CLI 已证明完整保留这些块。

## 改动文件

`companions/engine/`：`server_tools.go`、`request.go`、`response.go`、`request_policy.go`、`feature_plan.go`。新增独立测试 `server_tools_test.go`、`server_search_gateway_compat_test.go`；此前原生探针 `server_tools_cli_compat_test.go` 保留。

`feature_plan.go` 与 safeguards owner 共享，后者仅增加 safeguards helper，不覆盖服务端搜索调用。没有修改 relay 归属、runner_session、structured 或 native/history 文件。

## 已通过证据

- `TestRealCLIServerSearchHistoryCompatibility`：原始 CLI 首轮搜索块、resume、回退 fork、新 HOME 的 JSONL 导入，4 次隔离请求。搜索结果/引用保持，不产生错误的客户端 server ID 回填。
- `TestRealCLIServerSearchGatewayCompatibility`：完整 Worker HTTP → CLI/Mod → relay → 假上游 → Worker，6 次隔离请求：新会话 rebuild、普通工具结果 prefix-hit、继续 prefix-hit、回退 fork、新缓存导入 rebuild、BM25 SSE。上游无归属 nonce；下游引用/工具名均恢复为客户端名；搜索 definition/defer 保留；未夹入 CC 内部 ToolSearch。
- `TestServerSearch*`：目录恢复、嵌套引用拷贝隔离、未知引用拒绝、其他服务端工具拒绝、错误 canonical 名、搜索工具被 defer、deferred+cache 组合、孤立搜索结果拒绝，以及 HTTP 200 类型的搜索错误块保留。
- 当前 engine 常规单测通过；未把 opt-in CLI 跳过算作已运行。

## 边界与后续审查

- 假上游不证明真实搜索可用性、账号授权或模型资格，也不证明服务端实际搜索语义。真实 API regex/BM25 调用需单独验收。
- 本轮不开放客户端自定义搜索 `tool_result.content[].tool_reference`；这属于另一输入形态，不能和服务器结果混为一谈。
- 本轮不开放其他服务端工具、PTC、MCP connector。不能把搜索 codec 的通过描述成全部 server tools 支持。
- 按既有结构保留客户端原始 schema 与 description；工具 metadata 的本轮追加实现见下一节。缓存断点原有处理机制未在这里重写；deferred + cache_control 显式拒绝。
- 官方搜索错误块含 `error_message`，已保留。错误 code 非空并作为数据保留，不因新 code 被转成失败。

## 官方协议来源

2026-10-08 核对：[Tool search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)。响应路径为 `content.tool_references[].tool_name`；服务器搜索结果必须随完整 assistant 历史回传；`srvtoolu_*` 不需要客户端执行。当前文档不要求额外 beta 头。本地探针仅验证 CLI 和 Worker 的协议兼容，不冒充官方上游服务端执行。

官方 SDK schema：[regex 定义](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/tool_search_tool_regex_20251119_param.py)、[BM25 定义](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/tool_search_tool_bm25_20251119_param.py)。确认日期/无日期 type aliases，以及 `strict`、`allowed_callers` 可选元数据。

## 工具 metadata 追加实现

2026-10-08，主 agent 追加授权后实现：

- 客户端工具支持 `type:custom`、`strict`、`eager_input_streaming`（含显式 null/false）、`input_examples` 对象数组、`allowed_callers:["direct"]`。服务器搜索定义支持 `strict` 与 direct callers。代码执行 callers 明确拒绝，避免假装支持 PTC。
- 以 `Tool.Metadata` 独立持有，SDK MCP 注册不携带这些 API 专属字段；在同一个归属明确的主请求恢复。字段值复制后注入，工具输入/返回路径沿用现有完整 codec。
- `api-tool-policy-v1` 历史 namespace 包括服务端定义和客户端 metadata；字段变化不重用旧 snapshot。无 metadata 的已有 namespace/config key 结构保留。temperature 等采样控制不进入该 namespace。
- 新文件 `tool_metadata.go` / `tool_metadata_test.go`，以及 `tool_names.go` 命名空间小改。
- `TestRealCLIFeaturePlanCompatibility` 的 forced tool 与 tool_result 续聊增加五种 metadata，同时检查最终 wire 的原 schema/description。9 次隔离请求通过。
- `TestRealCLIServerSearchGatewayCompatibility` 增加 regex/BM25 的 strict/direct metadata，6 次隔离请求通过。两套真实 CLI 回归合计 15 次、11.725 秒，CLI 2.1.292；仍不表示真实 API 已验证 strict/eager 行为。
- 单测覆盖显式 false/null/空 examples、非法类型/PTC callers拒绝、sampling 不改变工具 namespace、metadata 变化改变 namespace、仅 server catalog 的 any/forced、none/MCP名称以及重复 server ID 拒绝。

额外官方 schema：[custom ToolParam](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/tool_param.py)。本次只是这些字段的协议适配；服务端严格校验/模型参数兼容由实际官方上游决定，不以隔离假上游冒充资格验证。
