# 空工具参数增量独立复核

2026-10-08，针对正式#22工具首轮 `content_block_start.input={}`、`input_json_delta.partial_json=""`、`content_block_stop` 触发502的修复。作者冻结后独立复核，不修改 safeguards 或账号冷却策略。

## 代码与边界

逐处核对 `engine/response.go`、`engine/mcp_response_secrets.go`、`contracts/credits/events.go`、`protocol-codec/strict/stream.go`。只有真正的空字符串是no-op；类型检查先于no-op，非空的空白仍保留到JSON解析并报错。credits初始三个工具块类型补object校验，避免忽略空delta后意外接受array/null。structured转换在改为text_delta之前也先校验partial_json字符串类型。

legacy `anthropic_to_responses_response.go` 已有空字符串跳过，本轮没有额外改动。原始上游事件仍保留，no-op只影响聚合状态，不捏造JSON或执行本地工具。MCP凭据检查仍检查初始对象、增量拼接及完整JSON中的凭据，空片段不会绕过检查。

不扩大“非空initial input再接非空JSON delta”的语义修改：Worker的exact-source恢复可能在CLI初始空块上恢复完整原始对象，再收到CLI生成的完整delta，贸然按strict converter规则拒绝会破坏已有精度路径。该旧边界与本次空delta根因不同，本次仅修空字符串，不据此声称所有来源的initial/delta冲突行为完全一致。

## 独立新增测试

`engine/empty_input_delta_independent_test.go`：

- 同一完整事件序列分别进入Accumulator及credit聚合，确认多个空片段、非空初始对象和大整数保真。
- 在实际JSON片段前、中、后插入空片段，仍组装正确对象。
- 初始array/null、空白、截断、array JSON、数值/null delta仍拒绝。
- MCP guard验证多空片段、完成后空片段、拼接中间空片段；截断、非字符串以及跨片段凭据仍拒绝。

`protocol-codec/strict/empty_input_independent_test.go`：

- OpenAI Responses与Chat两条转换路径，初始非空object+多个空片段以及empty/JSON交错均通过且大整数保持。
- 初始array/null、null片段与不完整JSON仍拒绝。

结果：engine独立矩阵PASS1.332s；strict独立矩阵PASS1.146s。strict测试首轮夹具漏了message_start.usage.output_tokens，在实际进入被测分支前被严格校验拒绝，已补合法夹具后重跑通过；不将该夹具失败记录为生产实现缺陷。

## 真实CLI证据

独立运行作者的 `TestRealCLIEmptyInputDeltaRoundtrip`：本地Claude Code2.1.292对隔离假上游，外部JSON/SSE两种模式，每种初次工具调用、tool_result续聊、冷缓存导入、回退各一次，共8次，PASS6.678s。

作者此前全engine、credits、codec与vet结果见 `EMPTY-TOOL-INPUT-DELTA-REPAIR.md`；本次未把作者报告当成自己的全量验证。独立复核没有新增生产逻辑改动，只增加以上两个测试文件与此记录。尚未宣称空delta修复已部署或正式#22公网工具重测成功，须在Git候选上线后继续真实端到端验收。
