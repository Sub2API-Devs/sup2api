# MCP 组合独立复核（2026-10-08）

范围为第八批 `mcp_timeline.go`、`mcp_search.go`、MCP inline 编译、connector 出站目录、server ledger 与 safeguards 的组合；未修改信用凭据的新 object/null/best_effort 实现，也未部署本批。

## 结论与代码证据

未发现本次审查范围内新的业务阻断，因此没有为了制造改动而修改生产代码。新增独立测试 `engine/mcp_independent_review_test.go`：

- 整组撤回后只重新开放一个工具，其他工具保持撤回，同名工具的另一服务器不受影响。
- 冷解析完整历史保持最终可用状态；回退到更早历史重新计算状态，不污染其他 Request 的 timeline。
- 整组重新开放不能覆盖 `enabled:false`。
- 两个服务器的凭据分别恢复到正确目标；出站对象是副本；内部目标 URL 改变时明确拒绝复用旧凭据。

静态复核确认：inline MCP 定义不携带授权凭据；实际凭据仍从已归属主请求的独立 secret plan 按服务器名称和 URL 恢复。主目录只追加原始顶层 toolsets；inline 定义保留消息时间位置，没有将未来定义提前追加到顶层。新的 MCP 响应调用按最终 timeline 判断，历史调用则按出现位置验证。

API Search 的已知客户端引用沿现有身份映射解析，未知引用不会依据 `mcp__` 前缀猜测归属。pure MCP 的 safeguards 由原始对象传给上游；本地工具权限没有因此开放。重命名的客户端工具、inline 与 safeguards 等未证明等价的组合仍拒绝。

## 运行证据

本机 Claude Code 2.1.292，对隔离假上游：

```
go test ./engine -run 'TestRealCLI(InlineMCP|MCPClientSearchAndInline|MCPSafeguardsPreserveProviderContext)' -count=1 -timeout=180s
ok ccgateway/engine 13.158s

go test ./engine -run 'TestReviewMCP|TestMCPInline|TestMCPClientSearch|TestMCPSafeguards' -count=1
ok ccgateway/engine 2.911s
```

第一组复跑作者的实际 CLI inline 历史、新目录、Search 与 safeguards JSON/SSE 路径；第二组增加与作者不同角度的状态与凭据负例。这是 CLI/Worker 对假上游的协议证据，不能替代真实 MCP 服务器资格、provider 工具执行和计费验证。

## 保留边界

- deferred MCP 与 API Search 的跨服务器引用编码尚无完整实证，当前明确拒绝；这里只支持非 deferred MCP 与已实现 API/client Search 的组合。
- 未声明的历史 MCP 服务器完成块可以作为不透明历史保留，不表示当前获得调用该服务器的权限。
- 未对任意恶意服务器的编码/隐写凭据泄漏作保证；本轮并非 secret guard 的重新安全审计。
- compaction 的 `tool_changes` 是相对初始目录的净变化，不能简单将其当作上一轮状态的增量重复应用；现有编译器沿该契约恢复。

官方资料复核时间为 2026-10-08：[中途 system / 工具变更](https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages)、[Messages beta union](https://platform.claude.com/docs/en/api/typescript/beta/messages)。引用型 MCP 变更与完整 `mcp_toolset` inline 定义有不同 beta 要求；完整定义额外要求 `mcp-client-2026-09-15`，没有误将这个要求扩展为所有引用型变更都必须使用新 MCP beta。
