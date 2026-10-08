# Inline 客户端工具变更 + 内部 ToolSearch：只读评估

2026-10-08；独立于已冻结779c候选，不修改业务、不调用provider、不追加模型实验。结论：**有可执行的语义保真设计，但目前不足以直接撤掉准入guard**。现有证据来自inline单独/API服务端搜索，以及内部CC搜索单独的真实CLI矩阵；二者组合尚无动态目录/历史恢复实证。不能说天然不兼容，也不能将两组单项绿色当组合已支持。

## 当前源码的三个接缝

1. `inline_tools.go:167`明确拒绝内部ToolSearch；`compileInlineTools`将所有Known身份注册到r.Tools，注释明确是历史transport/deny用途；`sdk_mcp.go:53` tools/list与runner enabledTools目前会提供整个union。直接开搜索会让已撤销/旧schema工具重新进入搜索候选，即使响应端稍后拒绝也不是正确发现语义。
2. `applyInlineToolCatalog`重建provider顶层tools为原始Base，正是维持inline位置语义所必需；但它同时会移除CLI ToolSearch helper目录。不能用“把Known union全放到top tools”解决，否则原撤销与历史前缀/缓存语义改变。
3. `internal_cache_rounds.go`目前只要求ToolSearch引用在r.Tools中，不理解各位置的withdrawal/schema版本；cache restore对新增inline工具与原Base/逐轮helper目录还缺分区对齐。需要显式扩展，不能只把guard删掉。

## 最小实现路线

只做普通客户端custom/native工具，先排除server/typed/MCP connector、显式safeguards、signed compaction、forced与预算内部组合。native↔MCP身份切换仍拒绝。所谓普通客户端MCP命名transport可以另分阶段，第一步可只custom名称。

- 保留 `Known/Versions` 为只读历史解析身份；新增由timeline编译器计算的**最终可搜索目录**，供SDK tools/list与CLI enabledTools使用。它不同于Active：deferred但未撤销的base工具虽未加载仍应可被发现；也不同于Known：撤销工具、被净变更重置排除的历史工具不能复活。不能简单写Known&&!Withdrawn，必须覆盖压缩reset或初期明确不接受该组合。
- 每个HTTP请求的完整历史已经提供最终timeline状态，因此先使用请求级固定候选目录，无需假设CLI有运行中任意增删目录API。一次CLI内部搜索过程中不再有新的客户端inline变更；下一HTTP请求重新编译，冷导入/回退同样从客户端历史还原。
- 实际provider wire仍保留原Base和原位置的tool_addition/removal，追加仅已验证真实CLI helper定义，不能追加所有历史工具到顶层。内部搜索返回的tool_reference用当前请求候选目录+版本核验，并记入本轮发现集；已撤销对象不在列表，伪造返回也拒绝。
- Mod/stdio继续拒客户端工具本地执行；只允许被登记的内部ToolSearch。正常tool_use的对外name/id/input保持原协议，搜索helper轮次/结果不进入客户端公共响应历史。旧native transcript缓存不能带回前请求搜索目录；必要时沿既有重建策略起步。
- cache计划分三部分：原客户端Base断点和顺序、原inline块断点、内部helper目录/后缀；每轮重新校验有效断点数与TTL，不移动断点。无法证明目录重排不影响前缀时保留具体限制，不偷偷关闭cache或search。

## 必须取得的隔离证据与退出条件

新独立临时probe：真实CLI→fake provider，先添加A/B、撤销A、搜索A/B（只B可见），重新添加A的新schema后仅新schema可被搜索。服务端假响应故意引用A旧版/撤销版必须拒绝，确认不会执行客户端工具或发下一轮。每个阶段验证完整Base与inline消息原位置、schema/description/deferral、缓存断点精确相等。

JSON/SSE × 新会话/工具结果续聊/回退/独立cache冷导入，至少两次内部搜索；包括同名工具版本改变但native映射不切换、同名客户端ToolSearch不能成为helper、mixed client/helper回合拒绝。若CLI历史加载必须完整union才能恢复旧工具，应隔离“历史可识别”与“搜索可见”接口再探，不能为了运行而泄露撤销工具。

只有该窄矩阵及独立复核通过才撤gate。若CLI search确实无可隔离的候选列表/加载通路，则记录该版本能力证据并保留限制；目前源码已有SDK list可控入口，所以尚无理由判定永远不能兼容。此次无临时probe/业务补丁进入冻结候选。
