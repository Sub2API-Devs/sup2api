# Inline custom + 内部搜索实施计划

下一候选，独立于779c构建。只普通custom客户端工具，拒native匹配、server/typed/connector/safeguards、compaction和forced内部组合；保留此前forced窄gate不扩大。

时间线新增Searchable，与Known历史身份/Active已加载状态分离：base deferred仍可搜索，removal取消，addition恢复，reset仅当前base重新可搜索。历史已撤销工具调用仍拒；custom deferred历史调用仅标记需要内部搜索语义，在策略准入时确认，不能无条件降低旧API历史校验。

SDK tools/list与CLI --tools只输出Searchable，Mod的历史路由仍保留Known并deny本地执行。provider tools继续原Base+仅实际见证helper；inline定义按原位置恢复，不把Known/current union提升到top。内部搜索结果按当前Searchable/版本验证并在request ledger记录发现，响应仅对本request已发现工具临时可用，撤销不能复活。cache恢复原断点/顺序并逐轮验证。

需要真实CLI fake矩阵验证添加、撤销、重加schema、新/续/回退/cold、JSON/SSE、cache；任何目录无法分离/历史wire失真保持guard并记录。禁止真实provider调用或部署。
