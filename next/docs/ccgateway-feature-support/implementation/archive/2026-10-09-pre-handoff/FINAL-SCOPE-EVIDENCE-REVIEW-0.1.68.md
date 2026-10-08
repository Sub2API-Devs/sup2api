> 历史快照归档：2026-10-09 交接整理前保存。正文包含不同日期的候选、失败和已过时状态，不代表当前实现或线上版本。当前状态以 [接手文档](../../../HANDOFF-2026-10-09.md) 和 [当前进度](../../PROGRESS.md) 为准。归档只调整相对链接，保留原有结论和证据。

# 最终范围与证据独立复核：core .67 / Worker .68

2026-10-08，目标 D:/projects/golang/sup2api，候选 9ba4。只读源码/既有证据与文档；没有重复大测试、真实provider调用、部署或业务修改。本审查针对范围描述与证据一致性；本人曾参与部分实现，不能将作者部分包装为新的独立代码安全审查。

## 交付前必须修正文档

1. FINAL-FEATURE-CLOSURE 首段仍写核心.65/Worker.66，末段仍称核心.65等待发布确认，O-HISTORY又说必须补跨Worker diagnostics，与本文件F-DIAGNOSTICS及已有0042验收直接矛盾。应以9ba4、core.67/Worker.68及对应部署记录为当前状态，历史批次不删除。
2. PROGRESS“最新状态”仍core.66/Worker.67/catalog.9；追加段落称下一候选尚未部署。主代理已确认.67/.68部署，应更正当前索引，保留此前构建/失败快照。不能使用118的697项证明9ba4重新完整跑过所有DB；后续改动的实际测试范围另列。
3. F-TOOL-CHOICE / F-INLINE-TOOLS / F-TOOL-SEARCH 当前结论应明确已加载named窄支持与custom inline内部搜索已实现，而非只把它们放“后续候选”。完整general forced、native/server/typed/MCP/safeguards与inline内部搜索仍未放开。

## 本轮真实证据允许的结论

- local-parallel-read-0.1.68.json：同一非空assistant message ID下5个不同Read调用、5正确路径、5对应结果及最终5marker均通过。它证明同一响应五调用与回传成功，不证明五次本机IO在时间上重叠。最终TAB/no newline fixture保留便于核对。
- public-inline-search-0.1.68.json：两次HTTP200，tool_use再end_turn，外部工具往返/marker完成。原JSON的 `internal_search_verified:false` 保持不动；后续 [PUBLIC-ACCEPTANCE-0.1.68](../../PUBLIC-ACCEPTANCE-0.1.68.md) 已用账号22关联日志补证：首请求两次上游回合，实际 ToolSearch internal_execute/local_execution=true，随后 lookup_fixture 为 client_handoff/local_execution=false；第二请求完整回传一次上游 end_turn。因此本fixture真实内部发现已验证，不扩大为所有组合。
- MCP真实通过由本轮PUBLIC-MCP/部署验收代理记录；本审查不重复连接第三方MCP。单次成功不能推广为deferred MCP、所有服务器编码或所有认证协议。

## 仍可建设，但当前有明确拒绝的功能组合

这些不是已完成，也不是已有证据证明永远不兼容；是否继续实现须保留语义合同，不能删guard冒充支持。

- `task_budget.go:validateTaskBudget` 对任何内层搜索仍拒绝，需跨模型调用累计预算/remaining规则；单主请求预算已支持。搜索开关启用但某次不实际搜也仍被保守挡住，可研究像forced-loaded一样证明零内部轮次的窄路径；本审查没有擅自放开。
- `feature_plan.go:validateInternalRounds` 保留general any/named内部搜索续轮限制，仅 `forcedLoadedClientTool` 例外。需要首轮发现与最终强制调用的阶段合同，不可将原tool_choice换auto而声称等价；Opus5.5模型自身不支持forced也需单独说明。
- `fallback_request.go` 仍拒绝default动态模型链及fallback+compaction。前者缺动态候选权限/定价冻结，后者缺每attempt压缩usage模型归属；为避免误授权/误扣而拒绝合理，但不能标已全量支持fallback。
- deferred MCP跨服务器引用编码、缺定义typed历史账本、跨issuer diagnostics可信workspace身份、合法Sonnet pause_turn的CLI安全附件适配，仍属于证据或适配未闭环。普通文字prefill在新模型官方不支持，与pause_turn例外分开。
- Responses stored IDs/background、Batches是独立持久产品，当前strict转换未实现；不可用本地状态/纯Messages改写冒充官方语义。旧内部synthetic StructuredOutput循环不是公共API output_config.format的缺口，后者已直接出站。

## 不应扩大为验收完成的部分

真实提供商信用发行/兑换/退款、Advisor/compaction/fallback复杂费用、fast/geo资格、所有Skills/CodeExec执行产物及长上下文编辑效果尚无全面云证据。源码、隔离CLI、LinuxDB与真实推理分别记账；当前已实现严格路径不因未测全而自动称不可用，也不因假上游绿色称所有账号有资格。

本次未发现新增可由所读代码与现有证据直接确认的普通API业务阻断bug。明确待修的是当前文档状态/范围口径；上述高级组合仍为公开限制和可续做事项，不能写“全部功能完成”。
