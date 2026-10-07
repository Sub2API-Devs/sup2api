# Typed client tools 与会话内工具变更

2026-10-08，第二批 checkpoint 前可集成状态。没有部署、生产推理、真实提供商资格或缓存账单验证。

## 实现

- `client_tools.go` 将 12 个官方 typed client 定义与普通客户端工具分开解析。固定 API type/name 保留；computer/browser 使用 `toolset_name + name` 身份。它们不伪装成 MCP，不在 Worker 执行。主模型终态通过既有外部 handoff 返回客户端。
- `browser_state.go` 验证工具结果中的结构化浏览器状态；只保留数据，不访问其中的 URL、文件或下载。Browser 27 个默认启用成员和 4 个可选成员分别处理。禁用成员被模型误调用时仍把身份返回执行端处理错误。
- 稳定 typed 工具目录继续使用原生历史缓存。实际 CLI 会在历史 assistant tool_use 中丢掉 toolset_name：仅在 ID、name、input 与其余内容都严格一致时恢复这一个已知缺失字段。当前目录删除 toolset 定义时，完成的历史仍可依照其显式身份恢复；普通 typed 旧调用没有联合身份且定义已删除时明确拒绝，避免把 bash 静默改成 MCP。显式普通同名工具定义不受此限制。
- API ToolSearch 的请求、响应与历史共用目录引用身份解析；typed 固定名及 toolset family 保留，普通自定义工具沿用原映射。官方说明 toolset 作为整体延迟与展开；真实提供商生成的 toolset 搜索结果形状仍未实测。
- `inline_tools.go` 按原消息位置建立客户端工具增删时间线，支持引用和按值定义。不会把未来工具提前展开到顶层目录。CC 传输中的随机载体只在已归属主请求中严格恢复并扫描移除；普通 system 文本和工具变更块保持原位置。
- 内联定义及外层变更块的直属 cache_control 分别保留，不遍历或误改 input_schema 内同名普通 JSON 字段。含内联变更的本地记录采用 response-only，下次以客户端完整历史重建；不能据此判断上游 prompt cache 是否命中。

## 明确边界

内联 ServerTools（包括 Advisor）、内部 CC ToolSearch、显式 safeguards 组合明确拒绝。非空 compaction.tool_changes 的请求回放仍明确拒绝，避免绕过 core 对嵌套模型的授权检查。普通 typed 工具与内部 CC 搜索、显式 safeguards 组合亦未开放。原安全 gate 不变，不伪造审查结果。

同一内联工具名称的各版本如果会在 native 与 MCP 身份之间漂移，拒绝该请求。客户端工具集成员强制选择、未登记 type/schema/工具版本等不会被当成普通工具偷偷兼容。模型、平台和账户是否允许某一官方工具版本，仍以上游的实际结果为准。

已实现上下文编辑与新旧 compaction 的字段保真、主请求终态和历史恢复；Sonnet assistant 预填遇到内层额外安全附件时保持明确拒绝，不移动角色或丢弃安全指令。详情见 CONTEXT-COMPACTION-PROGRESS.md。

## 验证

全部真实 CLI 测试使用本地 CLI 2.1.292、临时配置与隔离假上游；证明端到端协议适配，不证明真实模型执行效果。

- `TestRealCLIAPIClientToolGateway`：12 个版本化类型，每种 6 次 HTTP 请求，72 次通过。覆盖工具调用、结果续聊、新缓存完整导入、SSE、回退至初始消息及恢复原历史。稳定目录续聊实测 `prefix-hit`；初始无 assistant 的回退采用 rebuild，未将其说成分支 fork 命中。
- `TestRealCLITypedToolSearchRoundtrip`：typed bash 与 browser toolset，每种 4 次，共 8 次通过；覆盖搜索引用、工具调用、结果续聊、新缓存导入与 SSE。完整目录及返回调用对象相等，引用名称未变为 MCP。
- `TestRealCLIInlineToolTimeline`：引用及按值定义，各 5 次，共 10 次通过；覆盖新增、工具调用及结果、移除、新缓存、SSE、回退。每次出站验证唯一 1h 定义断点与 5m 外层断点，且未来定义未提前展开、无随机载体残留。
- 独立 reviewer 的 typed search response/history 及移除 toolset 定义后历史身份两个红灯均已修复；Advisor 内联和 compaction.tool_changes 授权边界回归通过。
- `go test ./engine -count=1` 通过（4.845s）；contracts 模块 `go test ./...` 通过。Windows 未执行 race，不声称并发 race 验证成功。

常规单测还覆盖工具集同名成员、自定义同名工具、错误联合身份、非法工具配置、工具结果配对、过去尚未生效的内联调用、缺 beta、已知字段恢复不得掩盖 name/ID/input 修改，以及移除普通 typed 定义后的明确拒绝。

## 参考

[官方类型联合](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/beta/beta_tool_union_param.py)、[工具定义参考](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-reference)、[Browser 工具](https://platform.claude.com/docs/en/agents-and-tools/tool-use/browser-use-tool)、[ToolSearch](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)、[会话内系统消息及工具变更](https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages)。
