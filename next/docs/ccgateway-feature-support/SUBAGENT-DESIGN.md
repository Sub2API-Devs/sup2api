# 子代理 / Agent Teams 经 CCGateway 的实现说明（2026-10-10）

用户问题（2026-10-10）：服务端返回 Agent 工具调用后，客户端要在本地起一个新 agent，CCGateway 要如何处理？
每个子代理对 Worker 来说是不是一个新会话？能不能做成原生 CC 子代理 jsonl 的样子？要不要拦截请求头里的 agent id？

结论：现有实现（CONTRACTS §53.12）已经按官方行为工作，不需要在服务端挂起或等待客户端。
需要用 agent id，但只用来选 Worker 内部的分支，不需要伪造客户端的 jsonl。
下面每条事实都来自本机 CC 2.1.292 的实测，包括本地录制代理抓到的请求头和 `~/.claude/projects` 下的原生记录。

## 1. 官方 CC 的子代理是怎么走的（实测）

- **Agent 是客户端工具。** 主线程模型返回 `tool_use Agent` 后，这次 HTTP 请求就结束了，stop_reason 为 tool_use。
- **子代理在客户端本地跑。** 它的每一轮模型调用都是一个独立的 `POST /v1/messages`，并且：
  - `X-Claude-Code-Session-Id` 和 `metadata.user_id.session_id` 都等于父会话 S，与主线程相同；
  - 多带一个 `X-Claude-Code-Agent-Id: a<16 位 hex>`，主线程请求没有这个头；
  - 消息里只有子代理自己的 system、工具和对话，不含主线程历史；
  - 结束时调用 `SubagentHandback`，同样是客户端工具。
- **结果回到主线程。** 子代理结束后，客户端把结果作为 Agent 的 `tool_result` 放进主线程的下一次请求。
- **原生记录：**
  - 主线程在 `<project>/<S>.jsonl`。Agent 的 `toolUseResult` 带 `agentId` 和 `outputFile` 等字段。
  - 子代理在 `<project>/<S>/subagents/agent-<agentId>.jsonl`。每行带 `isSidechain: true`、`sessionId: S`、`agentId`。
  - 这些文件只在客户端本地，上游 API 看不到。
- **safeguards 只在主线程。** 主线程第一次请求带 `safeguards`，并带 `dangerous-tool-use-2026-09-03` beta；子代理请求不带。

## 2. CCGateway 的对应做法（已上线）

| 官方 | Worker（ccgateway engine） |
|---|---|
| 主线程 S | 分支 (S, "")：内部 CLI 会话文件即 U，U 是 S 的单向摘要 |
| 子代理 A（同一 S） | 分支 (S, A)：内部会话文件 `nativeBranchID(S, A)`，各自续接、互不混入 |
| 上游看到的 session | U：主线程和所有子代理共用，与原生"同一会话"的形态一致 |
| 上游看到的 agent id | A'，即 `upstreamAgentID(S, A)`：格式同 CLI（a + 16 hex），与 A 无关；主线程不带 |
| Agent / SubagentHandback 工具调用 | 与其它客户端工具一样，原样返回给客户端，本次请求结束 |
| 子代理结果 | 主线程下一次请求的 `tool_result`，按普通续聊处理 |

因此不需要"服务端挂起等客户端子代理跑完再返回"。官方本来就是"返回 tool_use → 客户端执行 → 下一次请求带结果"，子代理只是执行时间长一些的客户端工具。
子代理自己的请求会作为同一会话里的另一个分支直接进入 Worker。

**agent id 是必需的。** 没有它，子代理请求和主线程请求会落到同一个分支 (S, "")：
- 两条完全不同的消息序列会互相覆盖续接点，每次都要全量重建；
- 上游会看到主线程身份下出现与主线程无关的对话。

所以 Worker 读取 `X-Claude-Code-Agent-Id`，只用它选分支、派生 A'，从不把 A 本身发到上游。

## 3. 为什么不把 Worker 内部记录做成 `subagents/agent-*.jsonl`

- Worker 每次请求都用 `--resume <会话文件>` 恢复一个顶层会话。CLI 不能 resume sidechain 文件，所以内部分支必须是顶层会话文件。
- 上游判断"这是不是原生 CC"，看的是请求本身：session、agent 头、metadata、工具与 system。这些已与原生一致，上游不读本地文件。
- 客户端那一侧的原生记录，由客户端 CC 自己按官方格式写，本来就完整。网关不需要也不应该替客户端生成。

如果以后需要在 Worker 侧导出"原生样式"的记录（例如审计），可以从分支文件只读派生 `<U>/subagents/agent-<A'>.jsonl`，不影响请求路径。目前没有需求，不做。

## 4. 2026-10-10 本地端到端测试中发现并修复的问题

用户在 new-api 目录用"动一个子代里，让他来理解素材库功能，然后整理逻辑 汇报"测试时遇到 529，以及之后几次失败。原因与修复如下：

1. **529。** 有三个来源：
   - 早先 502 资源校验错位，导致唯一账号被冷却，进而 no_account。0.1.20 已修。
   - 现在无可用账号会按 Anthropic 语义返回 529 overloaded。
   - 2026-10-09 22:01Z 起是账号 #22 的 5h 窗口真实用尽（上游 429）。
2. **400 "context editing/compaction with internal CC ToolSearch rounds"。**
   - 原因：CC 2.1.292 默认发送 `context_management clear_thinking keep all`，同时带 DeferredToolPlaceholder。
   - 修复：keep all 不改写历史，0.1.21 起放行。
3. **400 "client safeguards with internal search …"。**
   - 现象：每个会话第一次请求都会出现一次。CLI 收到后去掉 safeguards 重试，所以用户只看到结果，但用量日志里每次都有一条 400。
   - 后果：CLI 日志说明，此后整个会话"每个 auto 模式工具调用都会因服务端审查不可用而被拒"。
   - 修复（0.1.23）：内部 ToolSearch 轮每轮原样带客户端 safeguards，搜索轮不返回客户端，审查结果原样转发。结构化输出、服务端工具与 safeguards 的组合仍然拒绝。
   - 测试：真实 CLI 测试 `TestRealCLISafeguardsWithDeferredLoading`，覆盖含隐藏搜索轮的情况。
4. **502 "client safeguards requires unchanged tool names: SubagentHandback"。**
   - 现象：子代理请求同样带 safeguards，并带 CC 给子代理的 `SubagentHandback` 工具。内层 CLI 没有这个工具，只能经 MCP 名转运，于是被拒。用户的提示词下，子代理连续 3 次失败。
   - 修复（0.1.24）：schema 经校验的 `SubagentHandback` 按普通客户端工具转运，ID、输入、schema 都不变。
5. **agent teams 的 502。** 见第 5 节（0.1.25）。
6. **--add-dir 目录被去掉。**
   - 原因：生产策略是 attachment_source=gateway、workingDirectory=client，此前只保留 Primary working directory。
   - 修复：0.1.22 起，"Additional working directories" 及其子项随 workingDirectory 保留。

## 5. Agent Teams

- 客户端开了 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`（用户本机设置即如此）时，`Agent` 工具多出 `team_name`、`name`、`mode` 三个参数。这个变体已在 2.1.292 的已验证原生目录里。
- 此前内层 CLI 不开 teams，提供的是普通 `Agent`。原生定义对不上，Worker 就回退成网关 MCP 名转运。
  - 没有 safeguards 时，这样可以工作。
  - 有 safeguards 时会被拒：502 "client safeguards requires unchanged tool names: Agent"。2026-10-10 线上 teams 场景每次都是这个错误。
- 0.1.25 起，当客户端 `Agent` 是 teams 变体时，内层 CLI 以 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 运行，提供完全相同的定义，`Agent` 保持原生名。
  - Agent 调用仍然只返回给客户端，内层不会启动队友。
  - 队友（teammate）的请求和子代理一样，带自己的 agent id，进入各自的分支。
- 测试：真实 CLI 测试 `TestRealCLISafeguardsWithDeferredLoading/TEAMS`。不带修复时，它复现线上的 502。

（`5h`/`7d` 之外，Max 20x 账号 #23 的 Fable 周窗口改从 usage 应答 `limits[]` 的 `weekly_scoped` 读取，见 CONTRACTS §44。）

## 6. 端到端结果（2026-10-10）

见 ENVIRONMENT-RUNBOOK.md 顶部的"2026-10-10 下午"一节。
