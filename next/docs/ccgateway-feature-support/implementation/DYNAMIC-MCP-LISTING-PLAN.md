# Dynamic deferred MCP listing 身份账本

2026-10-09。当前为已实现、通过隔离验证且经独立复核的候选，未提交、未部署。本文件替代初版调查中的待证假设；完整历史复用已经有官方合同和本地真实 CLI 行为证据，不能再标为仅支持当前响应。测试记录见 [实施进度](DYNAMIC-MCP-LISTING-PROGRESS.md)。

## 官方合同与证据边界

- [MCP connector listing beta](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector#pin-an-mcp-servers-tool-list-beta)：查询目录时响应开头包含对应服务器 listing；原样回传含 listing 的 assistant 历史并保留 beta 后，后续使用该记录，不重新查询。条目可以用作完整 pinned 列表。文档未定义冲突重复 listing 的替换或合并规则。
- [响应 listing 类型](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_mcp_tool_listing_block.py)和[请求 listing 类型](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_mcp_tool_listing_block_param.py)：type、mcp_server_name、tools；server 对应客户声明。[工具条目](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_mcp_tool.py)包含 name、input_schema 和可空 description，无分页或 partial 标记。
- [Tool search 历史复用](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool#continuing-the-conversation)：保留原始搜索结果，后续可继续使用已发现引用；MCP defer 由 toolset 配置决定。
- [SDK 引用注释](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_tool_change_tool_reference_param.py)描述提供商 MCP 名称键为 `{server}_{name}`；[搜索引用](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_tool_reference_block.py)只提供 tool_name。实现复用已有 pinned resolver，从完整已知身份枚举键并做碰撞检查，不拆名称猜 server。该注释不是动态提供商实测；仓库 PUBLIC-ACCEPTANCE-0.1.69 的旧 pinned 观测与之相符，本批未新增真实提供商调用。

本机 npm CLI 为 2.1.292，入口指向 `C:/Users/16790/AppData/Roaming/npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe`，读取二进制 SHA256 为 `EB95BB65955F8B1702E800815F9A2C0388A5DE0F196C354C7EE1DD5CB9A2BA23`。静态嵌入代码扫描仅证明它识别 mcp_tool_listing 类型；完整历史往返的证据来自随后执行的隔离真实 CLI 矩阵，不由静态片段推断。

## 已实现的兼容范围

仅新增一个未 pinned 的 dynamic deferred MCP 服务器、一份顶层 toolset、`mcp-client-2026-09-15` listing beta，以及 API regex/bm25 tool search 的组合。允许混合普通客户端工具。客户 URL/token、配置、工具顺序及 tools 缺省/null 保持声明原样，账本不回填 pinned tools、不另外访问 MCP URL。

JSON/SSE 均支持首次请求、完整历史续聊、cold 和 rollback。目录与发现按 message/block 原位置重建，后面的 listing/search 不能授权前面的调用。新请求回退到发现前不继承目录或发现。一个 Request 的多个响应各有私有状态。

同一会话相同目录重复 listing 幂等；冲突目录明确拒绝，不推断 schema 更新、增量或替换语义。空目录只能提供零个身份。目录建立身份事实，搜索结果建立 deferred 发现；仍遵守 enabled、NoTools 和调用/结果 ID 配对，listing 描述不是执行权限或指令。

多个动态服务器、动态与其他 MCP 服务器混合、动态 inline 工具变更、compaction、fallback、safeguards 及无 API 搜索工具的组合仍显式拒绝。现有 pinned 多服务器和非 deferred 路径维持原范围。未声明 server、缺前置证明、未知引用和命名冲突不得静默退化为客户工具。

## 模块实现

- `mcp_dynamic_listing.go`：窄准入、不可变目录、深复制、timeline 克隆、原子接受 listing。`dynamicMCPHistoryMessageSupported` 是独立纯谓词，专门检查历史是否含首批排除组合，形状验证仍归协议 parser。
- `mcp_connector.go`：仅新窄范围设置 dynamicListing；不删除原范围约束。
- `mcp_search_identity.go`：`mcpSearchIdentitiesAt` 从当前位置枚举身份，与 pinned 共用组成键和碰撞检查；未知引用必须有明确普通工具声明才可按普通工具处理。
- `mcp_timeline.go`：按历史原顺序登记 listing、搜索与调用；`listedTools` 优先使用 pinned，否则使用已验证不可变 listing。
- `server_history.go`：响应 ledger 持有私有 timeline，不把响应新目录写回 Request。先验证整批引用再登记发现。
- `client_tools.go`、`response.go`：搜索验证和 wire/client 映射使用同一当前位置 resolver。普通客户端工具仍走原有名字映射。
- `contracts/features/catalog.go`：仅更新两处能力说明，区分单 dynamic 与多服务器 pinned；本批未升 catalog/plugin 版本。

listing 先通过现有严格协议校验，再深复制，用 candidate timeline 验证全部名称碰撞，最后提交。数字通过现有 UseNumber 复制保真；坏条目不会留下部分目录。历史先完整按顺序验证，之后 wireMessage 可使用已验证的最终目录进行名称还原；这不允许未来信息倒流，也不是历史目录 union。无 inline 的首批范围不引入工具 epoch 切换。

## 已验证与仍待验证

作者纯测试覆盖当前/历史/rollback、准入拒绝、未知引用、disabled、顺序、目录冲突、名字碰撞、深复制及 schema 大数，并经过真实 Accumulator 路由。独立测试补未来跨 message 回流、两个响应隔离、NoTools/unknown server、深复制与冲突原子性。真实 CLI 隔离矩阵验证 JSON/SSE 四种生命周期、完整历史保真、原始声明和凭据隔离；现有 pinned 回归通过。具体命令和耗时见进度与独审记录。

未进行动态 MCP 的真实提供商资格或生产验收；没有宣称多动态目录、目录 schema 更新、inline 撤回/重加、compaction/fallback 已实现。后续扩展须先明确目录代际与定义身份，不复活被撤回工具，也不把外部 listing 内容解释为权限。当前估计字段的生产发布结果不计入本功能证据。
