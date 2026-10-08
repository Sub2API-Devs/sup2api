# 强制已加载目标与混合目录：待验证设计

更新：本设计随后已实现并独审，当前为未提交发布候选。真实CLI证实原目录已完整存在，无需改ENABLE_TOOL_SEARCH；修复仅恢复原explicit defer与完整原定义，保留单轮/零helper边界。原生前置校验与内部slice形态两红另已修复并独审转绿。当前结果以FORCED-MIXED-CATALOG-PROGRESS和FORCED-MIXED-INDEPENDENT-REVIEW为准，以下保留最初方案与当时未验证状态。

2026-10-09。此文是下一批设计，不是已实现或已部署声明。当前冻结发布源码为 `7d322abd9cf8579fe229aa74f50ee654c1d1e2d4`。

## 当前边界

`forcedLoadedClientCatalog` 仅允许所有普通客户端工具显式 `defer_loading:false`，且排除 inline、MCP、服务端/typed 工具、safeguards 和旧 synthetic structured output。该判断同时控制主轮上限、ToolSearch 执行权限、响应视图、历史归类、预算准入和缓存 namespace。CodeGraph 对目标项目的一层 impact 返回17个相关符号；文本检索另核了直接调用点，不把关系图当完整运行证明。

现有 `forced_loaded_review_test.go` 明确拒绝“目标已加载，但无关工具 deferred/implicit”。不能只删准入条件：CLI 可能省略这些定义，后续 `verifyForcedLoadedCatalog` 又会拒绝，或者静默改变客户端原目录。

## 协议依据与候选

2026-10-09读取[官方工具搜索文档](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)：defer 控制模型上下文加载，客户端每次请求仍提供完整定义。由此可以研究“指定目标已明确加载，不需要任何隐藏发现”的单轮路径；这不是强制 deferred 目标或 `any` 混合目录已获支持的证明。

首批候选仅 named choice，目标显式 false，其他普通工具允许显式 true，原 choice、目录字段和 schema 到提供商必须完整保真。implicit 工具先保持旧限制，避免 CC 默认 deferral 与 API 默认立即加载的含义混淆。`any` 继续要求全 eager，deferred 指定目标继续拒绝。上游模型不支持 forced 时原错误透传，不把 choice 改 auto 或关掉客户端 thinking。

有两种需要真实 CLI 出站证据再选择的实现：保持 CLI 的 deferral 并在受验证目录阶段还原原定义；或仅在此单轮内部载体关闭 CLI 目录延迟，出站前重新恢复客户端原 defer 字段。后者会改变现有 `ENABLE_TOOL_SEARCH` 内部设置，当前测试明确要求保留 true，因此不能未经证明直接采用。两者都必须保留 API 实际出站目录、字段缺省、顺序、缓存位置和精确数字，不能伪造发现结果。

不直接复用 helper-history catalog 的授权条件：那一模块根据已持久化且验证过的 ToolSearch 引用恢复定义；本场景没有隐藏发现记录，事实来源和单轮约束不同。可以复用纯目录复制/校验函数，不能伪造 helper receipt 或认证状态。

## 验证与拆分

1. 先用真实 CLI 接隔离假上游观察 eager chosen + unrelated deferred 当前出站，记录完整工具对象摘要、choice、CC helper 是否出现；不发生产请求。
2. 为新窄模式添加明确 RED，保留旧多工具 any、缺目标、deferred 目标、implicit、MCP/inline/server/safeguards 负例。
3. 以单一纯资格判定统一现有执行边界，禁止各调用点各自扩大范围。目录整批验证再提交，重复/改 schema/未知工具必须原子失败。
4. JSON/SSE、结果续聊、完整历史冷导入、回退及预算零隐藏轮都检查原 choice 和完整目录；没有内部 ToolSearch、没有额外模型调用、真实 usage 原值。
5. 缓存 marker 与 TTL、metadata false/empty、大整数、原生工具 schema 匹配、原自定义/MCP映射名、并行参数与合法 refusal200保持。
6. 独立代理复核后才更新功能目录和前端说明，服务仍按精确 Git 构建。当前没有新增测试通过、资格证明或生产成功结论。
