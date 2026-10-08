# Inline custom tools 与内部搜索进度

2026-10-08：下一候选，未提交、未部署；779c/.67 发布不包含本改动。作者实现与验证，不冒充独立审查。

## 实现

Known 保存历史身份，Searchable 保存最终可搜索目录，Active 保留已加载语义。撤销立即移出 Searchable；重加使用最新 schema；reset 不从 Known 恢复撤销工具。SDK tools/list、CLI enabled tools 使用 Searchable，Mod 历史路由仍保留 Known 以正确拦截，不允许容器执行客户端工具。

提供商请求仍发送原 Base 工具和原位置 inline 定义，不把最终目录抬升到顶层；只追加实际 CLI 见证的内部 helper。原缓存配置由既有 cache plan 恢复。内部搜索使用既有完整 assistant ID/name/input 与结果台账；返回的 tool_reference 必须属于当前 Searchable，发现状态只在当前请求生效，撤销优先于发现。无显式缓存也初始化此台账。

准入仅普通 custom 客户端工具。native 匹配、typed/server/MCP connector、显式 safeguards、compaction、helper 名称冲突继续拒绝；forced/budget 等已有组合 gate 没有放宽。历史 deferred custom 调用需要内部搜索策略，不把它变成全局已加载工具。

## 验证

- `TestRealCLIInlineInternalSearch`：实际本机 CLI 2.1.292，隔离假上游，32 次 Messages；JSON/SSE × explicit/automatic cache × 新会话、续聊重加 schema、独立冷缓存、回退。PASS，14.399s。最终 wire 的原 Base schema、inline addition/removal、5m 断点、automatic 参数保留；外部响应无内部 ToolSearch、内部调用 ID 或 MCP 传输前缀泄漏。
- 单测：SDK 目录排除撤销工具、重加使用新 schema、reset 不复活历史目录；伪造撤销工具搜索结果拒绝；native/helper/compaction/safeguards 排除；发现状态请求隔离与撤销优先。
- `go test ./engine -count=1` PASS 5.086s；`go vet ./engine` PASS；diff whitespace 检查通过（其他 owner 文档存在 CRLF 提示）。全 engine 命令未设置 CCG_REAL_CLI，真实 CLI 证据来自上面的单独矩阵。

## 中间失败与修正

首次端到端响应判定拒绝内部 ToolSearch：responseView 的内置 helper 没在客户端 inline Active 中。现在只在内部搜索 responseView 明确标记 native ToolSearch 的情况下允许内部 helper；客户端同名工具仍拒绝。

加强 exact inline 比较首次失败，定位为复用旧测试 helper 会先剥除 cache_control 后比较，而 expected 带 cache_control；改为本测试完整对象比较，再次 32 调用通过，没有放松实现或缓存断言。

## 验证边界

假上游证明 CLI/Worker 载体与目录语义，不证明某模型/账号支持 beta。尚无真实提供商本组合调用。未对无缓存路径单独跑真实 CLI 矩阵；该路径由同台账初始化和单测覆盖。回退/冷启验证通过，但没有将缓存命中当作提供商 prompt-cache 命中证据。本批等待独立审查，暂不标全部高级组合完成。

## 文件

新 inline_internal_search.go、inline_internal_search_test.go、inline_internal_search_cli_test.go；修改 inline_tools.go、inline_timeline.go、sdk_mcp.go、runner_config.go、internal_cache_rounds.go。不涉及部署、tool_result_context 或原 forced 窄 gate。
