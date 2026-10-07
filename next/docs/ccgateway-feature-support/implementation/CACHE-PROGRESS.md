# F-CACHE 实施进度（2026-10-08）

## 已实现及冻结范围

- 新 `cache_plan.go` 在协议解析前保留顶层、system、工具的缓存计划；消息块缓存指令单独留在请求对象供当前请求恢复。存在显式客户端缓存策略时，主请求先验证全部定位，再在副本上移除CLI自动断点并恢复客户端原位置和TTL；缺省没有客户端策略时保持CC默认缓存行为。
- 顶层 automatic 原样保留为根字段，5m/1h分别验证；显式null原样保留，按当前请求给定的协议缓存指令处理，不新增私有禁用开关。
- 最多4个有效断点；1h必须在5m之前；自动缓存与最后显式断点同TTL不重复计数，冲突TTL明确拒绝。这些入口校验返回400，不通过挪断点使请求“成功”。
- 新 `history_alignment.go` 统一引用/缓存的内容归一化和Request-aware内部工具判断，system恢复真实调用也传Request。客户端自有ToolSearch不再按名字排除；任意工具input里的cache_control或伪document字段不遍历。
- system既支持原始完整块序列，也支持已验证CLI以双换行合并后的整段精确拆块。用户消息允许CLI前插附件，但完整客户端块序列必须唯一、连续且位于尾部；原客户端块顺序不变，未知尾部或重复歧义拒绝。
- 缓存指令不写入native input/history，不进入客户端历史指纹；引用和其它语义字段保持。每次从本次请求恢复，避免后续请求继承旧断点。已有缓存元字段不会被当作任意tool input清理。
- 显式缓存与内部ToolSearch、旧synthetic StructuredOutput、ServerTools组合暂明确拒绝，直至内部续轮缓存边界可证明。新API原生format不等同synthetic工作流，不被该条件误挡。

主请求归属依赖现有随机marker与Mod lease；count_tokens和辅助分类请求不套用客户端缓存计划。此次未修改权限gate、模型授权、容器部署或核心调度。

## 实际证据

真实本机CLI **2.1.292**、临时HOME/config和合成凭据、回环假上游：

1. `TestRealCLICacheBreakpointObservation` 已从旧观察基线升级成精确断言：baseline保持CLI默认；mixed-explicit保留工具1h、system首块1h、user首块5m；automatic根5m、automatic根1h均只保留根字段。共4请求通过。
2. `TestRealCLICacheHistoryAndNativeToolCompatibility`：实际原生Read schema + system多块 + user多块；new/rebuild、continue/prefix-hit、later/prefix-hit、rollback/fork、新cache全历史import/rebuild、SSE共6请求，均恰好3个客户端原位断点、对应TTL精确匹配。
3. `TestRealCLIMetadataGatewayCompatibility/apikey`：真实外层CC → Worker网关 → 真实内层CC → 假上游，标准CC自带缓存和完整system/messages通过。曾失败两处并保留原因：把原本逐块保持的system误要求合成单块；把容器前置user附件误当客户端内容变化。修正后的同一真实用例通过。
4. 缓存边界单测：4/5断点、混合TTL顺序、自动尾块同TTL/冲突、同文重复块的指定位置、系统拆块、深拷贝、重排拒绝且原body不修改、tool input字面字段保护、客户端ToolSearch系统轮次。
5. 引用回归通过；root追加要求的Web来源语料也已补：仅web_fetch_result中的document、URL、tool_use_id及web_search_result的opaque source+次序纳入corpus。早前结果改源/换序时，后续单独assistant引用恢复拒绝；任意input伪来源不计入。

最后一次缓存/引用targeted真实CLI命令完整通过，含上述4+6请求；普通全engine曾通过，后续并行thinking/output新增测试出现response-only fixture断言失败，已报告作者，作者随后确认修复并全engine通过。不要将并行作者报告冒充本任务重新跑过的证据。本人 `go vet ./engine` 曾通过；最终整合仍由root统一执行。

## 边界与待验收

- 假上游没有真实缓存计费；prefix-hit是本地历史复用，不是上游缓存命中。不声称减少费用。
- 真实账号OAuth/provider/模型组合、跨账号调度计费、最终生产部署均未由本轮执行。
- 工具重排或额外工具导致缓存工具前缀不同会明确拒绝，不能按同名工具贴标后声称语义相同。
- 嵌套tool_result/document content缓存控制有受控遍历与保留代码，尚未宣称所有嵌套组合通过真实CLI。内部搜索/服务端工具多轮缓存适配未完成。
- 源码目录F-CACHE状态及版本由root在checkpoint统一更新，不把本地测试当运行中Worker状态。

新增文件：cache_plan.go、history_alignment.go、cache_plan_test.go、cache_history_cli_test.go、citation_web_source_review_test.go。已有cache_wire_probe_test.go升级为断言。受影响的原文件仅缓存解析/历史指纹、引用共享helper、system Request-aware调用、feature plan入口/诊断与relay末端接线等相关段；不覆盖其它agent功能。
