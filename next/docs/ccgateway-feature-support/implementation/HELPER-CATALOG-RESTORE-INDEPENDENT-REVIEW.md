# 隐藏工具引用目录恢复独立复核

日期：2026-10-08。审查 Worker.77 后的本地候选 `engine/helper_history_catalog.go`、`client_tools.go`，以及既有helper replay、inline timeline、native验证和公开工具映射链。公网首请求200、续聊provider400 `Tool reference ... not found in available tools` 来自root交接；本代理未访问生产或调用模型。

## 精确缺口及复用边界

`replayHelperHistory` 经 `validateReplayedHelperSegment` 使用临时 `internalCacheRounds` 调用 `alignInternalCacheSuffix`，验证历史引用属于当时目录。这一临时state中的discovered不会写入当前request，属于正确隔离；但此前 `applyHelperHistory` 仅插回消息，普通custom目录未恢复。冷CLI只发DeferredToolPlaceholder/ToolSearch时，恢复后的历史tool_reference找不到实际body.tools定义。

当前候选在 `applyCompleteToolCatalog` 中恢复历史所需custom定义，再走原server/typed目录适配，最后恢复完整原始定义字段。放在既有适配之前很重要：strict/eager/examples/精确schema会让 `applyServerSearchTools` 更早要求custom目录存在，仅在helper末尾补定义不足以修复这些合法请求。恢复来源是托管工具原始JSON，经既有catalog摘要/anchor和历史引用准入验证；不是根据名称编造schema。

可复用且应保留的约束：

- `helperInlineHistoryView(after)` 为每条历史segment重建当时schema和Searchable，不能用当前Known覆盖过去。
- inline的 `applyInlineToolCatalog` 恢复Base与原位tool_changes；历史union不能提升到当前body.tools或current discovered。candidate对inline直接保留原路径。
- `wireName` 只映射已声明客户端工具；Native仍由 `verifyNativeWireTools` 检查CLI实际schema。新恢复器不合成缺失native定义。
- MCP/server/typed/native执行上下文不因托管ref变成普通custom授权；MCP仍由现有admit guard拒绝。
- 响应仍经 `Accumulator.blockStart → apiResponseToolName` 回到客户端原工具名，不把transport名称公开当新工具。

## 独立 RED → GREEN

新增独立文件：`engine/helper_catalog_restore_independent_test.go`。fixture以完整raw工具目录生成catalog摘要，先用实际capture路径生成隐藏segment，再冷请求admit；原 `ApplyMainRequestFeatures → applyHelperHistory` 后历史ref合法但对应工具定义数量为0，独立RED 1.422s。修复后原断言通过：唯一完整定义等于原客户对象，只转换已验证wire name。

其余独立测试覆盖：

1. 完整metadata：显式空description、strict=false、eager_input_streaming=false、input_examples与schema中9007199254740993精确保留；不修改托管原始JSON，重复目录恢复不增项。
2. 现有同名schema冲突、重复定义均拒绝且不部分改写body；未知历史ref、catalog/schema变化、native身份重映射和MCP越界仍在准入拒绝。
3. 真实历史inline beta旧schema → withdraw → 同名readd新schema，经ApplyMain与applyHelper验证：旧定义保持原历史位置，新定义不覆盖旧schema；withdraw后不可搜索，重加后使用新schema；旧发现不变成current discovered，beta不进入Base工具目录。
4. 公开assistant客户端工具名映射到wire时不修改原消息；新公开tool_use恢复原名weather并保持HasClientTool，目录恢复不修改Request.Tools。
5. 既有HelperInline、InlineInternalSearch及前一轮HelperContext独立测试同时通过，未以补目录绕过原公开/隐藏位置约束。

## 验证与限制

companions模块，`SUB2API_TESTPG=off`：

```powershell
go test ./engine -run 'TestIndependentHelperCatalog|TestHelperInline|TestInlineInternalSearch|TestIndependentHelperContext' -count=1
go vet ./engine
```

结果PASS，定向测试1.294s，vet通过。此前独立catalog测试也已通过1.315s。未改作者业务或测试文件，未使用生产、模型、真实CLI或PG；完整CLI/PG/实际提供商续聊证据由相应执行代理另记。

当前未发现新的功能阻断。候选对现有schema冲突选择显式拒绝，不能把“真实CLI是否在其他配置下输出可证明的schema增强”当已经穷尽验证；本地假目录不替代真实CLI回归。源码已建议作者抽取历史引用收集纯函数，减少恢复器内多层循环，保持原校验和字段保真不变。
