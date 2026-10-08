# 多 Read 截图的错误链与独立验证

2026-10-08，只读核心 usage/events/Redis；未读取任何被 Read 的文件正文。核心时间 05:53:11Z 时，最新 usage 为 05:25 的既有 MCP 测试，最近25分钟没有新请求。因此不能把最新 MCP 的502直接当成截图中的并行 Read 失败。

## 核心实际链路

- 05:03:16.975879Z 请求 `d2b35e2f75e9b4d6a79b69a9`，账号22，502/upstream_error。
- 05:03:23.608637Z 事件 account.status_changed，账号22，reason=`upstream server error (502)`，cooldown_until=`05:03:33Z`。
- 05:03:24.838067Z `7237ff6da37d31e45a8ee755` 与05:03:27.838339Z `2942e819eff7285adb5a0b6c`：账号NULL，503/no_account。
- 05:03:32.148351Z `8aa52be4967be81f74f805ad`，账号22，502/upstream_error；usage时间为请求记录时间，不能当作冷却事件发生时间。
- 05:03:38.705837Z 再次 account.status_changed，账号22，同502原因，cooldown_until=`05:03:48Z`。
- 05:03:44.199780Z `f7c715473eacf6e01c53c9d6`：账号NULL，503/no_account。

查询时21/22 Redis cooldown TTL均-2，已经过期。以上证明首次502触发实际冷却，后续503确处在无可用账号窗口；不是凭截图推断 API key 错误，也没有修改调度或冷却规则。

Worker作者另行只读定位：05:03:23的请求有5个tool_use和5个tool_result，前4结果相同；最后结果原17205字符、末尾TAB，经CLI trimEnd后再附加573字符本次可信session_context。当前严格prefix对齐拒绝这一已发生变换。此为作者提供的长度/相等性证据，不在本记录保存正文。

## 协议与隔离测试

[官方并行工具文档](https://platform.claude.com/docs/en/agents-and-tools/tool-use/parallel-tool-use)要求每个调用对应一个tool_result，集中放在下一条user消息，靠tool_use_id配对，结果块在普通文本之前。分批执行客户端工作可以，但不能把只完成部分的结果当作完整下一轮请求。

新增 `parallel_results_review_cli_test.go` 使用5个合成普通工具，不执行容器文件读取。JSON/SSE及结果正序/反序、一次性回传全部；只提交2/5结果必须400且不产生新上游调用。初版8次真实CLI假上游调用PASS7.551秒。该fixture的尾TAB未触发embedded context，因此不能把这一通过说成尾白修复已验证；专门trim修复和触发矩阵由作者另做，待独立复核补记。

增强结果 ID 原序断言后，同8次矩阵独立PASS8.268秒；合法反序结果按客户端提交的反序保留，未被网关按调用顺序重排。

作者窄修的独立 `tool_result_trim_review_test.go` PASS2.746秒：仅识别原完整前缀或 ASCII space/TAB/CR/LF trim 后加本次已鉴权完整后缀，最终恢复客户端全部尾部字节再附原后缀。NEL/NBSP/BOM/行分隔符/VT/FF 被裁剪的变体没有被此窄范围误认；原文本未被裁剪时仍可按完整前缀保留。未登记、重复后缀或中间内容改变均不接受。该范围不是完整 JavaScript trimEnd 集合，未知 Unicode 变换仍不能冒充已验证保真。

作者冻结后独立复跑专门触发附件的32次矩阵（TAB/CRLF/空格/plain × JSON/SSE × 新请求/续聊/冷导入/回退），连同本独立8次批量测试合跑PASS31.190秒，vet通过；每组确实观测到至少一次embedded context，检查前4结果不变、最后完整客户端尾字节恢复后再附一次可信后缀。新增缺失、重复/未知ID、下一user只给普通文本、结果前插文本等配对负例均拒绝。最初把连续assistant文本分块当作不合法间隔的测试预期已纠正，未更改业务代码。当前无阻断，但尚未部署或进行用户原始文件读取的线上复验。

## 最终增量：精确 JavaScript 尾白集合

上述 ASCII-only 是初版审查记录，最终候选已经扩展为 ECMAScript WhiteSpace + LineTerminator 精确集合，替代初版范围。仍仅在本请求已鉴权完整 session_context 后缀分支识别原字符串的 trimEnd 结果；不会普遍裁剪客户端文本，最终仍补回全部原始尾部字节。

独立 Node 实测25个合法 codepoint与3个明确非法codepoint（NEL U+0085、U+180E、零宽空格U+200B）全部符合预期。更新独立单测覆盖合法Unicode尾字符逐字节恢复、非法尾字符不裁剪、未登记或伪造后缀不接受，PASS1.250秒。没有使用 Go unicode.IsSpace 来近似替代 JavaScript 集合。

仅重跑新增 NBSP+BOM+行分隔符组合的真实CLI JSON/SSE ×新请求/续聊/冷导入/回退8次隔离调用，PASS6.335秒；没有无谓重跑原32+8矩阵。最终此增量独审通过，前述冷却证据与失败记录保留。
