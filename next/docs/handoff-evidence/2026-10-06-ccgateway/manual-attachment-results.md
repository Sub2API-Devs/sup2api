# 手工 attachment / Mod context 实测（2026-10-06 下午）

环境：cc-max 账号 22 应用容器 `ccg-dea8fa2ce873f60d0-app`，Claude Code 2.1.288，claude-opus-5-5，真实首方调用。脚本 [manual-attachment-probe.cjs](manual-attachment-probe.cjs)，`PROBE_CAPTURE=bun` 时从 Bun 的 `BUN_CONFIG_VERBOSE_FETCH=curl` 输出解析出站请求体（该输出含凭据，脚本只保留请求体、不写 stderr）。容器防火墙只放行回环 8787，自建回环中继无法使用。

随机码只出现在 system 记录中；先前的 assistant 回复均不含随机码。

| 用例 | 结果 |
| --- | --- |
| control-none（无 system） | UNKNOWN |
| mid-system：手工 `hook_additional_context` 记录在历史中间 | 答对；新原生文件保留该记录在原位置 |
| content-vs-rendered：两个字段放不同码 | 模型读取 `rendered` |
| tail-system-no-anchor：记录在末尾、不带 resume-at | 答对；新 user 记录的 parent 指向该附件 |
| mid-system-raw-rewrite：Mod `prompt.attachment` 去掉标签 | 答对；出站文本无标签 |
| pending-mod-context：`prompt.submit` context | 答对 |
| two-systems-order：先后两条，后者撤销前者 | 采用后者 |
| interrupted-*：`CLAUDE_CODE_RESUME_INTERRUPTED_TURN` | 可用，但尾部是附件时 CLI 自动追加 "Continue from where you left off." 用户文本，不采用 |
| pending-two-context-entries | 生成一条附件，content 为两项，rendered 以换行连接 |
| handbuilt-after-user-two-blocks：`hookName: prompt.submit` 的手工记录 | `prompt.attachment` 的 origin 为 `{kind: plugin, event: prompt.submit}`，与 Mod 生成的一致 |
| tool-result-pending-context：待提交输入是 tool_result | `prompt.submit` 仍触发（text 为空），context 记录在 tool_result 之后 |

出站结论（claude-opus-5-5 首方）：

- `renderedRole: system` 的附件以真正的 `role: "system"` 消息发送，位于对应 user（含 tool_result）之后、assistant 之前，与 Messages API 的位置规则一致。手工记录放在 user 之前时 CLI 也把它排到该 user 之后。
- 同一轮的多条 system 附件（含 CLI 自带的环境、模型、日期等）合并为一条 system 消息，附件之间以空行连接。
- 每个请求还带有 CLI 自己的 `output_config.effort` 空 system 消息，以及 `session_context` 附件（包含 Claude 账号邮箱，作为 user 文本）。后者经网关路径同样存在。

业务实现与 `TestSystemMessagesLiveE2E` 结果见 `tools/ccgateway/README.md`「messages 中的 system」。
