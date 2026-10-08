# Forced-loaded 窄子集独立复核

2026-10-08，作者冻结版本；本审查只新增 `forced_loaded_review_test.go`，没有修改作者实现、部署或调用真实提供商。

未发现阻断。准入要求全部普通客户端工具显式 defer_loading=false、指定已存在目标；any、缺失/true deferral、server、MCP、typed、inline、safeguards、JSONSchema 均不使用例外。原有手动 thinking 约束和其它组合规则未绕过。`auto`/`auto:N`/`true` 搜索配置的窄请求统一保持 maxTurns=1。

三层约束一致：Mod 的 helper 执行变量只对本次变为 0，stdio 不把该调用当内部搜索回合，responseView 不增补内部 ToolSearch。若客户端显式声明同名工具，它仍是客户端路由，不能因此本地执行。ENABLE_TOOL_SEARCH 保留原配置；目录读取改为依 cfg.deferral 是否存在，目录数据与执行权限分离。无搜索的正常构造不产生 deferral，普通搜索仍保持原 helper 行为。

目录检查只恢复 CLI 对已加载工具省略的显式 false，定义不存在、重复、schema 改变或实际 defer=true 均拒绝；不将 forced 改 auto，不改工具名映射。schema 比较采用原精确 JSON 摘要，9007199254740993 与 9007199254740992 不会等同。description/cache 元数据走既有完整目录恢复，本例外不改历史签名/消息内容；不把本轮测试扩大为所有 signed-history 组合已验证。

独立新增测试覆盖全目录中非目标工具隐式/延迟时拒绝、auto 与阈值配置、缺失目标/none/auto/null choice 不误入、目录缺失/重复、精确大整数 schema、description/1h cache_control 保持。与作者单测合跑 PASS 1.470 秒。独立复跑 `TestRealCLIForcedLoaded*` PASS 8.252 秒：JSON/SSE 新请求、结果续聊、回退分支、冷缓存共 8 次，加恶意 helper 响应 1 次；后者仍 502 且只有一次上游 fixture 调用。vet 通过。

真实 CLI 是 2.1.292，提供商为隔离假上游。模型是否支持 forced 仍由真实提供商决定；不能把使用 Opus 字符串的 fixture 称为 Opus forced 资格证明。该子集不解决发现型 forced 或多阶段 structured 强制选择。

## 目录与前端同步

`FeatureSupport.vue` 请求 `/system/ccgateway/features`；核心 `internal/ccgateway/features.go` 返回编译进核心的 `features.Catalog()`。主列表不是动态合并账号 Worker 目录。

`WorkerCapabilities.vue` 独立请求 `/system/ccgateway/accounts/{id}/features`，验证响应中的完整 `code_catalog`，按 featureId 显示对应条目及 Worker build/catalog 版本。因此只升级 Worker 可让账号能力详情显示新说明，但主列表仍保留旧核心目录，不能声称自动同步。

建议在共享 contracts/features 的 F-TOOL-CHOICE 与 F-TOOL-SEARCH 同步注明此窄例外，仍保持 partial，并递增 CatalogVersion（当前 .8）。正文必须明确“全部普通工具显式已加载 + 指定目标 + 禁止内部 helper 执行”，保留其它强制搜索/结构化续轮拒绝与模型资格限制。核心和 Worker 各自重编译部署后其目录才更新；无需新增重复前端开关。若本轮只部署 Worker，发布记录须明确主列表说明暂落后、以所选账号返回的新目录为运行代码证据，且仍不是提供商资格证明。
