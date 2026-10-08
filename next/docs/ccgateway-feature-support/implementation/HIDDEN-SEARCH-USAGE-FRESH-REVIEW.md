# Hidden ToolSearch 用量独立复核

日期：2026-10-08。目标：当前未提交的 `companions/engine/tool_search.go`、`tool_search_usage.go`、`runner_session.go`。仅本地只读业务源码审查及纯 Go 单测；复核代理只新增自己的测试与本文档，未改作者实现。

## 证据与发现

1. 扩展健壮性 RED 已复现并修复：隐藏轮 start 的 `cache_creation.ephemeral_1h_input_tokens=1647`，随后 delta 只上报 `ephemeral_5m_input_tokens=0`，原 Accumulator 顶层替换使 1h 消失。作者增加 hidden 专属合并 hook；独立测试改走实际 `cliSession.onStreamEvent` hidden 分支及 `endSearchRound` 后通过，未要求改变普通 Accumulator 语义。该 partial 嵌套结构属于扩展健壮性案例，不能据此宣称官方 schema 必须接受这种输入：root 核查官方 SDK 的 cache_creation 两桶和 output_tokens_details.thinking_tokens 为必填，message_delta_usage 未声明 cache_creation。
2. 首次读取发现 thinking detail partial 覆盖、顶层 usage 错误类型被断言为 nil 的候选问题，作者在独立测试首跑前已同步修改；这些案例首跑 PASS，因此不声称独立取得了其修改前 RED。新增 hidden hook 的 malformed start 防护亦已由实际路由测试验证通过。
3. 必填缺失 RED→GREEN：`TestFreshReviewSearchMissingRequiredInputRoute` 构造隐藏轮已有 ToolSearch block、current message 不含 usage，实际 `onStreamEvent` 收到仅 output_tokens=91 的 delta，再 `endSearchRound`，曾成功得到 input_tokens=0。源码 `Accumulator.start` 只检查 id/role，未保障 usage/input_tokens/output_tokens；因此上游缺少必填 usage 并无先行阻挡。作者在隐藏轮最终聚合和公开原始 snapshot 聚合前校验必填计数；缺失负例保持不变，独立重跑通过。正常正例补明示 input/output=0，未知字段和非法分类负例也补齐其他合法计数，避免被无关缺必填提前拒绝而虚假通过。

## 已通过的独立覆盖

- 公开消息多次 delta：input24+10=34，隐藏 1h1647 与公开桶逐字段覆盖后只累计一次；server_tool_use 同样保留其他字段。
- 数值负数、非整数、NaN、Inf、超出当前单轮 32 位计数上限、字符串、map、array 显式拒绝；分类 map/array/空字符串不 panic 且拒绝。
- 隐藏未知顶层字段及未知嵌套桶拒绝；公开扩展保留；内部 `_public_usage`、`_missing_*` 不进入公开 usage。
- 结构化输出新 `message_start` 经过实际 onStreamEvent 清理上条公开 snapshot，下一条 input10 加 hidden24 得到34，不被旧 snapshot100 污染。
- 分类 null 按 root 核查官方 Optional 定义视未报告；全轮未知时公开 null 保留，未知与已知 standard 混合拒绝。最初把分类 null 视非法的测试假设已纠正，不列为产品缺陷。
- 可空 cache 顶层计数：null + 0 保持 null；null + 非0 明确拒绝；内部 `_null_*` 不泄露。当前64位本机上，3个hidden加1个public每轮2147483647，结果精确为8589934588；未运行32位目标测试。

## 执行与边界

独立文件：`companions/engine/tool_search_usage_fresh_review_test.go`。

在 companions 模块，设置 `SUB2API_TESTPG=off`，执行：

```powershell
go test ./engine -run 'Test(FreshReviewSearch|IndependentSearchUsage|SearchUsage|ReviewHelperSearch|ToolSearchUsageAggregation)' -count=1
```

加入必填缺失案例之前该联合命令 PASS；之后新增案例单跑 RED（input_tokens 被写0）。修复后 `go test ./engine -run TestFreshReviewSearch -count=1` 全部 PASS。最后一次联合运行仅其余作者的 `helper_search_cache_usage_review_test.go` 两个正常场景因旧fixture缺必填计数而失败（第25/43行），已通知root；本代理未修改他人测试，不把联合套件宣称为绿。

最终结论：本次独立新增测试全部通过，已复现的问题均在授权修复范围内得到验证；当前无新增确定的阻塞缺陷。普通无hidden路径保持原Accumulator语义的判断来自分支源码审查，未作为本次专用单测覆盖结论。官方可空字段说明依据root本轮核查的官方SDK证据，非本代理自行网络查询。

使用原生 PowerShell/rg/文件读取与 Go 测试。当前 CodeGraph/Serena 元数据存在，但未验证其项目绑定，未调用；已知文件直接读。未发现目标仓库内 AGENTS.md，遵循会话指令。记忆注册表针对 ToolSearch/hidden usage 无命中，未使用历史记忆作结论。

未访问生产、未调用模型、未运行真实 CLI 推理、未连接 PG、未部署。线上 Core.72/Worker.75 信息来自任务交接，未在本复核中验证。本地 mock/session 路由单测不等于真实 API/CLI 或部署证据。
