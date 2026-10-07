# Token 计数与路由约束实施记录

日期：2026-10-08。以下为工作区实现和隔离测试，不代表生产账号支持或已部署。

## F-COUNT-TOKENS

官方依据：[Token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting)、[Count Tokens API](https://platform.claude.com/docs/en/api/messages/count_tokens)、[CLI reference](https://code.claude.com/docs/en/cli-reference)。当前本机 CLI 2.1.292 的 `--help`、本机 SDK 0.3.291 类型声明没有公开计数调用入口；这不是对所有内部 Mod API 的穷尽性否定。

核心 SDK 已声明免费端点 `/v1/messages/count_tokens` / `anthropic.count_tokens`。本次将插件虚拟目标、核心直连 URL 白名单和路径保留、控制器兼容转发及 Worker HTTP 入口接通。核心鉴权/账号选择继续走既有管线，没有将容器 OAuth 密钥提取给核心。

独立审查发现首版计数使用了 CC 增强后的提示词，不符合标准计数端点的客户端输入语义，已整改。Worker 使用 CLI 的账号自身授权作为传输载体；确认主请求归属后，直接以已准入的客户端原始 JSON 替换请求体并改为 count_tokens 路径，不将 CC system/附件、内部工具命名或随机触发消息加入计数输入。客户端 system、消息角色/位置、tools 名称/schema、cache、thinking、output 参数保留。任何辅助生成请求都被拒绝，不允许先做真实生成再估算 token。

这返回的是客户端提交输入的官方计数，不是包含网关运行开销后的生成账单预测。生成实际 usage 可能包含 CC 环境、工具处理及其他上游开销，应按真实生成响应计量，不能用此计数值覆盖账单。

上游返回合法 `input_tokens` JSON 后直接保存原始响应并取消 CLI；没有构造伪造的 assistant/SSE/usage，不写历史快照。上游错误状态和错误体按原结果返回。计数不复用可写的原生 prefix transcript，避免污染已有续聊检查点。入口拒绝生成专有参数；`output_config` 只允许当前计数 API 的 effort/format，不能吞掉 task_budget 等生成控制。

当前证据：

- `TestRealCLITokenCountUsesCountEndpointAndInnerAuth`：真实 CLI 2.1.292 → 隔离假上游，API Key / 模拟 OAuth 两种内部授权，各含 gzip 200 和 429。四场景 PASS，复跑 3.350s。每次仅一次真实 `/messages/count_tokens`，未发 `/messages`，外层平台密钥未替代内层身份，无历史快照。
- `TestTokenCountAdmissionAndExactUpstreamProjection`、`TestTokenCountNeverForwardsAuxiliaryGeneration` 覆盖原始请求不变、非法字段、query 保留和辅助生成阻断。
- 插件测试 PASS 1.331s；核心 URL 边界目标测试 PASS 1.749s；完整 engine 普通测试 PASS 4.596s（后续共享代码变更需集成复跑）。
- 核心带隔离数据库的直连回归已扩展 count 请求，尚待主线程服务器执行。控制器 Python 依赖 Linux，未在本机冒称通过。实际官方账号计数授权、额度及最新模型支持仍需真实账号验证。

整改后真实 CLI 计数六场景（授权/gzip/429/零token/非法负值/Sonnet assistant-prefill）PASS 5.495s，均检查实际上游 body 等于客户端输入。独立长历史案例为 40 轮、原位中途 system、原始 Read 与 MCP 工具 schema、显式 thinking/output 与 cache breakpoint，上游请求字节级等于原 JSON，PASS 1.881s；不写历史。之前 Sonnet prefill 触发内层安全附件而被生成 continuation guard 拒绝的问题，不再影响计数：计数根本不发送内层生成 prompt，没有移动/删除任何生成安全附件。该问题在生成路径仍由 continuation owner 单独处理。

## F-ROUTING 实施与边界

[Service tiers](https://platform.claude.com/docs/en/api/service-tiers) 的请求值为 auto / standard_only；目前按客户端请求精确施加于已归属主请求。响应中实际 service_tier 保留，并不保证账号拥有 Priority 容量。

[Data residency](https://platform.claude.com/docs/en/manage-claude/data-residency) 的 inference_geo 控制推理地理位置，不能等同于存储驻留。已实现 us/global/null 精确保存；缺省保留 workspace 默认，绝不补 global。主请求和辅助 Messages 都施加同一显式地域，辅助调用不携带主请求的 sampling/tier/max。辅助 count API 不接此字段，因此显式地域请求的辅助计数被本地拒绝。客户端单独 count 请求也不接受 inference_geo，避免静默丢弃约束。

检测到 Bedrock / Vertex / Foundry transport 环境开关时明确拒绝 inference_geo，这些平台的区域由各自 endpoint/deployment 决定，不能等价转换。内层账户身份保留，外层平台密钥与 workspace header 不传入；服务端明确的能力/区域错误保持原返回（通用上游错误直返开关仍决定其展示政策）。

`TestInferenceGeoAppliesToMainAndAuxiliaryWithoutGenerationControls`、`TestInferenceGeoDoesNotLeakThroughAuxiliaryCountOrChangeAbsentDefault` 覆盖主/辅/计数、默认值、错误类型和异构 provider。`TestRealCLIRoutingControlsAndProviderError` 真实 CLI 2.1.292 → 假上游验证 main us+standard_only 精确、外部身份头不覆盖内部身份、400 不回退 global，PASS 2.682s。该测试证明请求保真，不证明官方账户支持 US 或 Priority；也不是所有非模型网络请求的存储驻留审计。
