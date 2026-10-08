# e463之后剩余兼容范围审阅

只读快照：2026-10-08，e463已推送，Worker.70/core.69发布进行中。本审计不跑模型/部署。COMPLETION-EVIDENCE-MATRIX同步.69已验收与e463候选，原.68 citation失败保留；pinned MCP已真实通过而非仍未实测。

## 最高优先级：能最小保持语义的过宽门禁

1. safeguards.go:validateSafeguardTools仍对历史调用使用通用wireName(name)，但e463的completed_client_history已令真正历史wireMessage不再改名。因此完成direct旧bash/custom历史+无当前工具+opaque safeguards会被一个不存在的改名拒绝。最小修复应比较实际wire历史身份（保持完整块/参数），而非移除safeguards或猜opaque规则；当前工具schema一致性、internal/server门禁不动。需要红灯、JSON/SSE新/续/cold/回退、篡改历史/当前改名仍拒绝。
2. task_budget.go仍按toolSearchEnabled全拒，未区分forcedLoadedClientCatalog已证明零helper单轮。全显式eager named/any（含APIformat）本来不会新增隐藏回合，预算原对象可直接保真，不依赖未来持久helper账本。最小豁免只能复用同一资格谓词，不能仅按maxturn=1或开关判断；general/deferred/inline/服务端冲突条件仍原准入。测试预算原值/缺省/null/remaining0、helper目录与执行禁用、未来新请求原history及provider拒绝不重试。

## 后续真正实现工作，不用本地gate当不可能证明

- general task_budget+内部发现：原预算不逐请求扣减，但外部隐藏history/cold/分支歧义必须有持久恢复合同，已有TASK-BUDGET方案。真实倒计时不可由usage猜。
- general forced deferred：首轮搜索与最终强制阶段如何不改原约束，需要明确协议，不可临时改auto冒充保真。
- 动态未pinned MCP：缺完整服务器工具集合导致身份拼接碰撞无法预先证明；可另设计目录发现/身份账本，pinned已有真实例不能推广。
- fallback default动态候选：授权/价格冻结尚缺；fallback+compaction：无公开每attempt摘要归属，传输probe不是费用事实。两者需证据驱动实现，不能nearest-model兜底。

## 不应继续误列为未完成的项目

.69引用续聊空数组已真实复验；pinned MCP+APIsearch已有真实引用编码；e463完成无定义direct历史、普通APIformat+forced、限定Sonnetcoldpause已有实现/独审但仍等发布及必要真实验收。不能用过去总门禁解释当前全部不支持。

Responses持久IDs/background、Batches属于原目标若纳入就需另建状态机/权限的产品，不是纯codec顺手支持；模型强制选择资格、CodeExec限流、fast/geo真实资格是提供商条件，不能当代码已坏也不能假称全部可用。当前没有仅凭本次只读检查证明的其它未记录普通API失效；上述两条可直接红灯验证，应优先于重复rawCLI环境排查。
