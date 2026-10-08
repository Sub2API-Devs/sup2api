# 剩余工作与验收

基线：Core .78 / Plugin .14 / Worker .80 / Controller .48（2026-10-09）。单项多数已有实现；下列是仍需接续的组合、策略和真实验收，不是从零重建。先读[当前状态](HANDOFF-2026-10-09.md)，环境和命令见[使用指南](ENVIRONMENT-RUNBOOK.md)。

## 建议顺序

1. 明确未知参数策略、补运行态 payload 展示。
2. 多动态 MCP、可证单轮 forced/deferred。
3. 隐藏 helper 链与资源、上下文、执行身份、信用逐片组合。
4. 合法 assistant-tail 冷恢复、跨协议 helper、双账号真实验收。
5. 有状态端点及缺官方归属合同的能力独立设计。

每项先保留语义红例，再实现和独审；不能只删除 guard，不能把 forced 改 auto、删 system/签名、安全附件或猜资源身份来换取通过。

## 1. 未知 beta / body 与旧配置

**现状：** Core 和 Worker `request_policy.go` 默认 `unknown_beta=ignore`，`unknown_field` 可选 ignore；未登记 beta 可能不转发，未知顶层/`output_config` 字段可能删除。已登记高风险字段另有保护，但不能写成“所有未知语义都会拒绝”。本轮未读取生产有效策略，不断言生产正在丢字段。

**做法：** 先只读核保存策略，再区分可明确登记的 CC 运行字段与无法等价的语义字段，设计严格准入和旧 ignore 配置迁移；前端、Core 和 Worker一起调整，不能只改文案。

**验收：** 公共 HTTP→Core/插件→Worker 的未知 beta、顶层、output_config 负例在派发前明确失败；已登记原名/原值保留；工具 schema/input 中同名字段不得误删。历史旧 policy 不重新打开静默改写。

## 2. Worker运行能力展示

**现状：** contracts/Worker/Core 已区分 helper transport schema=1 与 payload v1/v2；`web/src/views/ccgateway/WorkerCapabilities.vue` 没有独立展示/校验 `helper_history_payload_versions`。

**做法及验收：** 投影真实值，覆盖旧Worker缺省、[1]、[1,2]、非法/重复版本；transport与payload分开，不从镜像tag/目录猜，也不提升为provider已验证。

## 3. 多dynamic MCP和动态时间线

**现状：** 单dynamic公开新/续/回退已上线；多个pinned catalog已有路径。`engine/mcp_dynamic_listing.go` 要求一个server/一个toolset，并限制inline、compaction、fallback等组合。

**做法：** 复用 `mcp_search_identity.go` 和 `mcp_timeline.go`，按server与真实listing位置形成不可变目录/联合身份索引；校验目录碰撞、未发现、撤销/重加和历史schema。credential留当前可信计划，不落历史payload。

**验收：** 两server异步发现、仅一个已发现、下划线/同名碰撞、目录变更、JSON/SSE、新/续/cold/回退。先真实CLI对隔离provider，再双server真实MCP；单server通过不能替代。

## 4. forced未发现目标、mixed any与helper

**现状：** `forced_loaded_tool.go` 已支持named eager目标＋无关显式deferred目录；目标deferred、mixed any、需要helper仍受限。

**做法：** 优先调查一主轮恢复完整原目录、原forced choice、禁止helper是否等价；不得改变defer_loading。确需辅助轮时，先建立辅助/主轮合同、原选择归属、remaining与失败用量规则，helper不可执行客户端工具。

**验收：** named deferred、mixed any、隐式deferral、已发现续聊、cold、inline和budget最小反例，捕获真实wire。模型不支持的forced参数保留原错误，不能改auto重发；不同模型资格分别判断。

## 5. 已托管helper链的高级组合

**现状：** 普通/custom-inline helper持久历史和计量已闭环。`engine/helper_history_runtime.go` / `helper_history_inline.go`、Core `gateway/helper_history_request.go` 仍拒部分资源/diagnostics/credit/MCP/context/compaction/continuation及协议转换组合。

**分片设计：**

- 资源/diagnostics：复用issuer lease、Core owner/public→remote映射、canonical digest；统一helper issuer与public/remote历史视图。登记资源、私有段和真实usage后再释放响应。
- context/compaction：将public prefix、hidden轮及applied_edits映射到编辑后锚点，不重复恢复已删除轮，不改签名摘要或擅减remaining。
- native/typed/server/MCP及safeguards：区分运输身份与当前执行权限，复用各时间线/目录；opaque规则和verdict保留。混合公开/隐藏块若payload不足须升级并协商。
- credit：现有 `fallback_credit.go` 约束一个operation对应固定wire；多provider轮不能自动继承同一credit。逐轮发行/兑换、strict/best_effort、失败与退款事实、唯一收据需合同。

**共同验收：** 原system位置/工具块/签名/数值完整hash；JSON/SSE、新/续、清本地cache/新Runtime冷恢复、回退、目录/资源撤销、同issuer重启、不同owner/issuer拒绝；真实隔离PG唯一账务/receipt、失败实际用量、冷outbox重放。再受控真provider，禁止派发后换号重复消费。

## 6. 复杂assistant-tail与跨协议

**现状：** 完整公开历史、response-only checkpoint、普通续聊/回退已有实现；`continuation_bootstrap.go` 只给受限Sonnet服务端pending尾做零推理bootstrap。复杂资源/MCP/inline/context等仍有组合门禁；Chat/Responses转换不能外推已登记helper链可用。

**做法及验收：** 捕获合法真实pause_turn尾，原块/签名/安全附件原位保留，零额外provider推理，运输marker不进入实际请求；与普通文字prefill分开。建立转换前原body规范摘要与三协议等价历史视图，先完成已有Messages helper适配，再验Chat/Responses的新/续/cold/回退、refusal/SSE与唯一费用。

新账号导入只能对可等价公共内容重建；绑定issuer的文件/container/Skills/credit/diagnostics不能凭裸ID强迁移。签名是否有效交provider，不伪造或删除。

## 7. 真实验证欠账

原要求“每个功能×API/本地Claude×#21/#22×新/续/cold/回退”**没有全集证据**；近期公开dynamic/forced/budget/TTL主要在#22，隔离cold不等于生产新账号冷调度。

接续建立简明证据表，明确成功/原错误/资格不足/未发：

- code execution/PTC/Skills完整产物与父子执行链：现真实200含tooltoo_many_requests，仅证明错误保真。
- Advisor真实模型配对/费用、fast真实资格与价差、长context/compaction真实效果、fallback credit发行/兑换/退款。
- diagnostics真实cache hit（已有refusal/cache miss不证明hit）；这是额外效果验证，合法cache miss已经是有效返回，不能要求每次命中才算适配完成。另有逐类型PDF/URL/工具集、取消/并发、macOS验收。
- 双账号与无issuer依赖的新账号冷导入；本地prefix-hit和上游cache hit分开。

有资格才跑有区分力的小量真请求，首错即停，已消耗用量保留。不用重复fake测试补真实资格，也不把缺成功证据都当代码故障。

## 8. 继续拒绝或独立建设的边界

- fallback＋compaction跨模型iteration无可靠model/attempt归属：不猜费用；fallbacks:default无法事前确定授权/冻结价格集合。先取必要合同。
- stored Responses IDs/previous_response_id/background/cancel/Batches：独立owner ACL、资源生命周期、状态机、幂等、计费未建，converter JSON不是完成证明。
- 不支持模型的文字prefill/inline system/forced参数、未知执行块或不等价协议控制保留明确错误；HTTP200 refusal仍是正常返回。
- embeddings/音频/视频/训练等CC不等价产品路由有能力插件，不用文本、本地Bash/Skills、PDF文本提取或估算count冒充。

功能和端点当前注册状态直接查 `companions/contracts/features/catalog.go`。更多旧调研/红例在Git `d7cbb814e0f0089aec6ea9e624aa9ebd4033df9e`；日常接手不必逐份阅读历史计划。
