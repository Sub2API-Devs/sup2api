# Per-turn control 增量独立审查

2026-10-08，作者冻结候选，未部署、未调用真实提供商。生产修改只有 inline output_config beta 校验增加 OR 条件，以及中央 BetaRules 增加实测名称 forward；原角色、effort、clear_at、位置恢复未改。没有把两个 beta 改名或宣称官方别名关系。

独立执行作者 admission 与真实 CLI 2.1.292 隔离矩阵通过 12.733 秒：两种 beta × JSON/SSE × 新请求/续聊/分支/冷导入，16 次 fixture 上游请求。vet 通过；contracts/features 全包 0.267 秒通过。

新增 `per_turn_review_test.go`：两个 beta 同时输入仍各自保留；拼错名称、仅 clear_at beta、per-turn 请求试图借用 clear_at 能力均拒绝。即使同时提供 clear_at beta，`next_user_message` 与 output_config 的既有不兼容约束仍拒绝。测试初稿误将该组合及文本 system 后接 user 当作正例，原实现正确拒绝；修正预期和夹具，没有改变生产限制。最终独立单测 1.130 秒通过。

## 旧持久策略

核心 `Config.EffectiveRequestPolicy` 无条件将 Betas 设为当前 `defaultRequestPolicy().Betas`；Worker `requestPolicy` 解析传入策略后同样替换 legacy 可编辑规则表。不是合并旧列表，也不会让旧完整列表遮蔽新代码规则。这是已有固定代码准入设计，本修改未新增覆盖用户策略行为。

独立测试显式传入只含旧公开 beta 的旧列表，UnknownBeta=reject，新的 CC beta 仍按当前已知规则准入；未知名称仍拒绝、AllowEffort=false 仍拒绝。无需为了本变更手动保存配置或改变未知参数策略。

## 目录与插件版本

catalog.9 的 F-SYSTEM 明确两名称分别准入、原名转发并保留限制；F-TOOL-CHOICE/F-TOOL-SEARCH 仅声明已验证 forced-loaded 单轮子集，仍 partial，未宣称强制搜索或模型资格全支持。说明与当前代码一致。

实际 `go list -deps ./...`（CCGateway 插件模块）不依赖 companions/contracts/features；插件 `headers` 仅原样转发 anthropic-beta，BuildUpstreamRequest 不处理 beta规则。新增规则与目录位于核心/Worker依赖，插件代码及其 manifest 本次未变，因此没有功能理由提升至 0.1.11。

部署仍应核新核心内置 0.1.10 包的 SHA256 与现存 `951e6a0865048e7bab5cd242374cff1d36440f33eee5f24d8fcfd1fd7122bbe3` 相同；若构建产物实际改变，应查明差异并版本化，不能覆盖 immutable 旧包。此审查不替代服务器候选实物哈希核验。
