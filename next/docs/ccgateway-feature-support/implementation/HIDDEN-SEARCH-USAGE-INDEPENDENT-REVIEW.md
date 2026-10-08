# 隐藏工具搜索用量聚合独审

2026-10-08。独立源码审查与纯本地单测，不修改 CC 正在编辑的生产代码，不发送真实模型请求。主任务报告的 Core/Worker/CLI/PG ABC 首轮 RED（129.149s，尾部 system 历史通过、input/output 对但 1h 缓存遗漏）是交接证据，本审查者未重复执行该集成。

## 确定发现

1. 原 `tool_search.go:addSearchUsage/mergeSearchUsage` 仅累加 input/output/cache_read/cache_creation_input 四个顶层计数，隐藏轮的 `cache_creation.ephemeral_5m_input_tokens` / `ephemeral_1h_input_tokens` 丢失。作者已开始补独立桶；不能从总缓存写计数推定生命周期，不能把 1h 同时重复计入 5m。
2. **多个公开 usage delta 重复累加隐藏轮。** `runner_session.go:onStreamEvent` 对公开轮每个 message_delta 调用 mergeSearchUsage；`Accumulator.messageDelta` 把结果写回 current。第二个省略 input 的 delta 从已聚合 current 取值再加 hidden。独立反例：hidden input=24/output=91/1h=1647，final start input=10，随后 output=1、output=2 两个合法 delta，最终应 input=34/output=93/1h=1647，实得 input=58/output=93/1h=3294。必须使用未聚合的当前轮快照或只聚合一次，不能以已聚合 current 作为下次原始基线。
3. hidden usage 的 service_tier/inference_geo 当前被忽略，final 轮分类值被保留但跨轮冲突未检查。request feature_plan 支持这些字段，helper admission 未禁止，所以是实际支持范围内的语义边界。同值可保留；不同值不能相加，也不能选最后一轮冒充整请求事实。应逐轮保真或拒绝无法无损聚合的成功结果，失败路径保留 provider accounting。

## 服务端工具与扩展边界

`helper_history.go:validateWholeHelperPairs` 仅允许隐藏正文 tool_use/text/thinking/redacted_thinking，实际包含 server_tool_use 的隐藏轮当前明确拒绝。因此不要求本补丁支持资源、MCP、代码执行等已经被 admission 禁止的组合。

final 公开轮 `usage.server_tool_use` 原对象在现 accumulator 路径保留，独立测试已确认。若纯 ToolSearch 隐藏轮的 usage 仍报告非零 server_tool_use 子计数，现代码会丢弃：应累加已经定义、可加的计数或明确拒绝该隐藏用量形态，不能假定不存在。未知 usage 扩展不能递归盲加；分类值、嵌套结构及未报告字段需要保真或拒绝边界，不得造零/估算。

## 独立文件与执行

新增 `next/plugins/ccgateway/companions/engine/tool_search_usage_independent_review_test.go`，只占用此测试文件。

执行目录 `next/plugins/ccgateway/companions`：

```powershell
$env:CCG_REAL_CLI=''
$env:SUB2API_TESTPG='off'
go test ./engine -run '^TestIndependentSearchUsage' -count=1 -v
```

首轮结果 RED（1.135s）：`TestIndependentSearchUsageMultiplePublicDeltas` 复现上述双加；`TestIndependentSearchUsageFinalCategoriesRemainCategorical` PASS，确认相同分类值及 final server_tool_use 未被误加。已报告主任务交由 CC 修复。此记录不将首轮红灯误称交付通过；作者后续实现与复测结果需另行追加。

未执行真实 CLI/模型、Core/PG 全链路、服务器或 race；不对现场新增用量作猜测。
