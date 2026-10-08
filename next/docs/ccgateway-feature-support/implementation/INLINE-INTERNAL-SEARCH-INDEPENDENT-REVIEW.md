# Inline custom / 内部 ToolSearch 独立复核

2026-10-08，审查作者冻结的 inline_internal_search、timeline/tools、internal_cache_rounds、runner_config、sdk_mcp 及既有对齐调用链。无部署、无真实提供商调用；本代理仅新增 `inline_internal_search_review_test.go`。

未发现阻断。Known 保留历史身份及定义版本，Searchable 限定最终时间线可发现目录，Active 与本请求通过实际内部回合校验得到的 discovered 控制响应工具准入。撤回工具虽留在 Known，但 CLI enabledTools、SDK tools/list/server 枚举均过滤，伪造内部搜索引用也会在发送下一请求前拒绝。重加同名工具采用最新定义注册，原 Base 与历史 inline 块依旧原位发送，不用 Known 并集替换上游历史目录。

搜索证据即使没有 cache plan 也在 Runner 初始化，通过 `verifyInlineToolHistory → alignClientHistory → alignInternalCacheSuffix` 校验；不是仅初始化 map 而漏掉无缓存路径。发现状态受 mutex 保护并随每次请求重建，不能跨回退/冷请求直接沿用。signed compaction、native、server、typed、MCP、safeguards、JSONSchema 仍由窄 gate 拒绝。客户端 ToolSearch 名称碰撞被拒绝，不能误当作允许的内部执行。

独立新增真实 CLI 测试明确断言 `Plan.cache == nil`，使用仍 inactive 的 Base deferred alpha（非已激活 inline addition），同时 inline 新增再撤回 beta。JSON/SSE × 新实例/冷实例，4 个外部请求、8 个实际 fixture 上游回合，PASS 6.993 秒。验证搜索后才能输出 alpha、原 Base schema 和返回工具输入中的 9007199254740993 精确、撤回块原位存在、helper 身份不泄露客户端、无 automatic cache 注入。

独立复跑作者缓存矩阵及负例 PASS 12.553 秒：32 个真实 CLI 假上游回合覆盖 JSON/SSE、显式/automatic cache、新增/撤回/同名新 schema 重加、完整工具结果历史、冷导入与回退；负例含恶意 withdrawn reference、helper/native/compaction/safeguards gate 与请求间发现隔离。vet 通过。历史旧 schema 的块保真由原 Base 和原位 inline 定义断言覆盖，并非声明对每个历史 input 执行完整 JSON Schema 业务校验。

CLI 版本为 2.1.292，模型字符串只是隔离承载测试，不能据此宣称真实账号支持全部 inline beta 或任意签名/服务端执行组合。后续目录应保持 partial，明确仅普通 custom 与已验证内部搜索组合；新功能尚未部署。
