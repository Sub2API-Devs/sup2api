# F-INLINE-TOOLS / F-CLIENT-TOOLSETS 实施路线

2026-10-08。本文件保留实施前的方案与探针证据。后续实际实现、测试结果和限制见 [实施进度](INLINE-CLIENT-TOOLS-PROGRESS.md)；下述“当前证据与缺口”描述方案制定时的基线，不代表最新实现状态。

## 当前证据与缺口

当前 `Tool`、`wireName()`、`clientToolName()` 和 SDK MCP 注册都以单一 name 为身份。`checkToolUse` / `checkToolResult` 尚无 `toolset_name` 联合身份；inline system 解析明确拒绝 `tool_addition/removal`。这不是增加几个白名单就能解决的事情。

新增 `TestRealCLIClientToolsetSurfaceProbe`，实际 CLI 2.1.292、临时配置、隔离假上游：分别测试 `bash_20250124`、`text_editor_20250728`、`computer_toolset_20260801`、`browser_toolset_20260801`。实验以 EXTRA_BODY 指定真实 API 类型，原生工具列表为空。四次请求均保持 tools 定义；CLI stream_event 保持 name 与 toolset_name；四次 CLI 都以非零状态结束。这证明协议字段能够穿过 CLI 流，不证明 CLI 已注册这些执行器，更不证明当前 Gateway 可用。EXTRA_BODY 仅用于实验，不能成为生产接入方式。

## 官方契约

普通 Anthropic 客户端工具和 toolset 必须区分。带日期的 bash/editor/computer/memory 定义由 API 指定类型和工具名，不能丢掉 type 后注册为普通 MCP。工具家族和版本来自官方类型联合，模型/平台适用性由上游决定，不根据名称推测。[官方工具类型联合](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/beta/beta_tool_union_param.py)

例如 `bash_20250124` 固定 name 为 `bash`；类型、可选缓存、defer_loading、strict、input_examples 均属于实际 API 定义。它与 CC 的 `Bash` 工具及其 schema 并不等价。[官方 Bash schema](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/beta/beta_tool_bash_20250124_param.py)

computer/browser 两个 20260801 toolset 不带 name。成员由日期版本固定，配置按成员展开；工具调用与结果必须携带相同 toolset_name。自定义 screenshot、computer.screenshot、browser.screenshot 能同时存在。不得只通过 name 路由。禁用成员也可能被模型误调用，客户端应接到该成员身份并返回普通错误结果，Worker 不执行屏幕操作。[调用与结果](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)、[Browser 工具](https://platform.claude.com/docs/en/agents-and-tools/tool-use/browser-use-tool)

toolset 的 configs 只允许官方成员及对应字段。已启用成员的 defer_loading 必须一致；延迟加载需要非延迟的 API tool search。条目级 defer_loading、strict/input_examples、旧 fine-grained beta、指定某成员的强制 tool_choice 不应被当成普通工具选项接受。工具参考与部分 SDK 当前存在字段差异：参考页列出 direct-only allowed_callers，但两个 toolset SDK TypedDict 尚未列出该字段。实现应把差异列为有来源的版本事项，不用 SDK 字段缺省猜测 API 必然拒绝。[工具参考](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-reference)、[Computer 条目](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/beta/beta_computer_toolset_20260801_param.py)、[Browser 条目](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/beta/beta_browser_toolset_20260801_param.py)

inline-tools 新 beta `inline-tools-2026-09-15` 同时支持引用和按值定义；旧 `mid-conversation-tool-changes-2026-07-01` 只支持引用。添加按值工具使用 `tool_definition.definition`；移除只接受引用。保留顶层 tools，不把后面才出现的定义提前搬进去。每条变更从所在 system 消息向后生效；相同工具的新 schema/版本替换旧视图，但不同家族的同名冲突不能混成一个工具。普通 system 位置、未完成 tool pair 和 paused turn 限制仍适用。[会话中工具变更](https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages)、[添加 schema](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/beta/beta_request_tool_addition_block_param.py)、[移除 schema](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/beta/beta_request_tool_removal_block_param.py)

## 共享身份模型

建议新增 `ToolIdentity{Toolset, Name}`，以结构体作为 map key，不拼接可碰撞字符串。联合身份与调用 ID 都进入历史 ledger。工具描述保存三种独立信息：原 API 定义、工具家族/日期版本、CC 传输绑定。不能把传输绑定名称写回原 API 定义。

```json
{
  "identity": {"toolset": "browser", "name": "screenshot"},
  "source": "anthropic_client_toolset",
  "definition_type": "browser_toolset_20260801",
  "executor": "external_client",
  "api_name": "screenshot",
  "toolset_name": "browser"
}
```

API typed tools 的模型侧保持原固定名字和 type。普通自定义工具继续使用现有 native-schema 精确匹配或 MCP 映射。二者不能通过 `Native[name]=true` 混用，因为这里的“API 官方工具”不是“CC 内置同名工具”。

第一阶段优先采用已归属主请求中的原始 typed 定义，以及现有 API terminal gate：模型返回客户端工具调用后交给外部客户端，不让 CC 自行处理未知成员。是否需要为 CLI 建立内部占位注册，必须通过执行/回调探针确认；即便需要，它也只属于内部传输，主模型仍必须看到原始 typed API 定义。Mod/stdio deny gate 不变，不安装浏览器、桌面、shell 等容器执行器。

## 最小实施顺序

1. **Typed 客户端工具**：新独立 raw 定义集合，版本与固定名校验；主 relay 保真替换该类工具目录；Accumulator 按身份接受 typed tool_use，terminal gate 返回原调用；历史中工具调用/结果同名同 ID 还原。先 bash/editor/memory，再 legacy computer。后续 body 中的 schema、参数完全由客户端/上游定义，不注入普通 MCP input_schema 冒充官方类型。
2. **Toolsets**：从官方每版本 configs 获取完整成员名。Request/response/history/SDK callback/Mod routing 统一使用 ToolIdentity。校验 tool_result 的 toolset_name 必须与对应调用完全相等；普通工具结果不得凭空带 toolset_name。browser_state 等结果内容新增独立协议 codec，不折成文本。不能因为数据中有 file_upload 就操作 Worker 文件系统。
3. **工具视图时间线**：从顶层目录建立初始视图，按 Message 游标应用引用添加、移除和按值定义，保存每个历史位置的不可变快照。当前轮暴露视图与历史工具配对视图分开；调用有效性依据发生位置，而不是最终目录。MCP connector 的 mcp_tool_reference/toolset_reference 等 F-MCP 适配未就绪时，明确拒绝相关分支，不重解释为客户端 MCP 字符串。
4. **Inline carrier**：复用现有 inline-system 指令和完整历史对齐，不把 tool_addition/removal JSON stringify 成文本。无文本工具指令也有独立位置记录。主 relay 在唯一对齐位置恢复原块，cache_control 留在原块；顶层 tools 与之前消息保持原值。SDK 注册若需要提前知道名字，注册集合只能用于 deny/返回路由，不能让未来 schema 渗入之前的模型请求。
5. **压缩交接**：启用非空 compaction.tool_changes 回放前，用相同时间线重放摘要携带的 additions/removals，然后处理保留的后续消息；保留签名和原列表，不重签、不重排、不根据最终工具集合重建旧列表。

## 必须通过的验证

- JSON/SSE：typed Bash 与自定义 bash、CC Bash 不互相串台；两个 toolset 和自定义 screenshot 三方并存；tool_result 少/错 toolset_name 必须失败。
- 客户端工具真正执行前就完成 API 返回；所有内层执行回调仍 deny；没有容器 shell/截图/浏览器动作。
- 连续两轮、回退 fork、新 Worker 完整历史 import；未知/已移除定义仍能解释过去已完成调用，但不能被当前模型重新调用。
- 引用 add/remove、按值新增、同名 schema 更新、重新启用：每个旧轮次目录与调用引用都保持原位置，未来定义不提前暴露；未知引用、家族冲突、tool pair 中插入、paused 后非法插入明确失败。
- deferred toolsets 与 API tool search；工具引用搜索结果身份正确；内部 CC ToolSearch 与 API toolset 组合在没有证据前拒绝。
- inline 缓存断点、system clear_at 限制、preserved-thinking 签名原样、compaction.tool_changes；任何不可保真的组合明确记录，不能仅凭请求能发出去标 supported。

当前只有第一批四种 raw CLI 表面探针通过。上述 Gateway 回调、历史和组合验证尚未执行。
