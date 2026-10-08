# 内部 ToolSearch 缓存独立复核（第九批）

2026-10-08，审查者未编写本轮 internal_cache_rounds/cache hooks。本次在目标 D:/projects/golang/sup2api 读取实际代码、既有测试并新增独立负例；未修改作者业务实现，未提交部署。与并行 diagnostics 独立审分开，不能把本人 authored diagnostics 自审列入本报告。

## 范围与结论

审查 `internal_cache_rounds.go`、`cache_plan.go`、`history_alignment.go`、`feature_plan.go`，以及 Request/runner_config/apiTerminalObserver/history 窄 hooks。当前 ToolSearch 子集未发现需要阻断集成的实质缺陷；旧 synthetic StructuredOutput 缓存仍明确拒绝，不能声称所有内部 JSON rounds 已支持。

归属入口为 relay 已识别主请求的 apiTerminalObserver；ledger每次newRunConfig独立分配，不从客户端JSON或旧snapshot载入。helper判定先排除客户端已声明wire同名工具；mixed client+internal调用不能作为纯内部轮次。完整message_stop后由共享MessageFromEvents重建assistant，按messageID/toolID拒重复，最多5内部轮次，单轮事件32MiB限额。辅助调用不进入此主请求observer。

后续wire必须先逐turn匹配完整客户端prefix，再将后缀按实际已观察assistant的tool ID/name/input和其余块对齐；tool_result必须与pending ID对应，正常ToolSearch结果只接受已声明客户端tool_reference。首次CLI结果登记hash，之后不得变化；CLI的字面末尾“Tool loaded.”只在pending耗尽、准确二字段text结构时接受。ledger忽略system消息进行轮次数匹配，但不删除/搬动这些CLI system附件；用户前置附件沿原有唯一尾序列匹配路径保留。此处不构成任意客户端消息跳过许可。

工具目录保留客户端顺序，未发现deferred且无缓存标记的定义可以保持未装载，缓存已标记定义必须显式defer_loading:false；额外目录仅允许当前内部helper，schema/定义请求内冻结。TTL和四断点规则在每轮实际body重新校验，自动缓存仍绑定每轮真实尾部；不能将多出来的第五断点偷偷移动或删除。旧native transcript prefix reuse对该组合禁用以免重放旧helper，将内部证据混入新请求。用户响应及公共历史仍由既有internal-search handoff隔离，运行时ledger不持久化。

forced tool_choice、credit、task_budget与旧synthetic formatting等各自guard仍存在，未因缓存组合开放被撤掉。内部多轮预算/forced语义属于后续实现，不以接受cache参数等价于这些组合全开。

## 新增独立测试

`internal_cache_independent_review_test.go`：

- `TestReviewInternalCacheFullAssistantAndResults`：实际观察轮次后改变assistant文字、thinking signature、tool_result引用、结果末尾文本、角色或块次序，全部拒绝。
- `TestReviewInternalCacheClientPrefixCannotDisappear`：已观察合法内部搜索也不能掩盖客户端原始prefix内容/角色变化。
- `TestReviewInternalCacheConcurrentRequestIsolation`：8个独立request并发，只有各自见证可对齐，新request不能借用其他ledger。

既有作者负例另覆盖unobserved/input/id/unknownreference/mixed/clientowned/extratext/missingresult/changedresult、helper schema变化、自动缓存新断点超限、重复responseID与其它feature guard；本次实际复跑，不只阅读其名称。

## 实际执行证据

设置真实 `CCG_REAL_CLI` 2.1.292 后执行：

`go test ./engine -run '^(TestRealCLIInternalCacheRounds|TestInternalCache|TestReviewInternalCache)' -count=1`

PASS 16.145s。`TestRealCLIInternalCacheRounds` 4组合（手动/自动 × JSON/SSE）× 新会话/续聊/回退/冷导入 × 每次两次搜索再最终回答，共48个模型HTTP请求，全部隔离fake provider，无真实工具/云账号调用。

单独独立负例再次PASS0.301s；`go vet ./engine`通过。并发单测已执行，但本Windows环境未声称本次race通过；最终候选需Linux engine race及合并diagnostics后的统一回归。真实提供商prompt-cache hit、费用与不同CLI版本目录行为仍未验证。

## 结构与剩余边界

模块状态以mutex保护且request独立，匹配顺序清楚；历史恢复复用historySkeleton/alignClientHistory而非另造一套客户端前缀规则。现helper schema是当前真实CLI首次wire见证后冻结，不能将本机CLI目录推断成任何未来CLI版本通用目录。各轮32MiB和最多5轮形成有界内存，但大请求并发总内存仍需负载验收。

下一步若开放synthetic格式轮次，必须实证其工具结果与追加格式提醒，而不是复用ToolSearch字面“Tool loaded.”白名单。若开放task budget或forced组合，需要另外定义续轮剩余预算/选择策略，不顺手移除准入门禁。上述是可继续实施的具体缺口，不是宣布这些能力天然不可兼容。
