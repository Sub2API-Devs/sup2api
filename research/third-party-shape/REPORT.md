# CC 第三方形状（改 base URL 接入）实抓对比

2026-11-03。子代理完成了抓包与比对，但写报告时被文件写入限制拦下，本文由主会话按它的最终回复整理。证据都在本目录：`caps/`（抓包）、`diffs/`（差异）、`gates-316.txt`（门函数调用点，138 处）、`scripts/`。代码路径与生产数据见 `code-and-prod.md`。

记号：A = 官方客户端第一方形状（直连官方地址）；B = 同一客户端改 `ANTHROPIC_BASE_URL` 后的第三方形状；C = B 经过我们 Worker（ccgateway-app:0.1.122，CLI 2.1.316 v43）后发到上游的请求。

## 结论

- 第三方形状由 2.1.316 的 `Oi()`（`chunk-v9tcvh08.js`）一个开关决定：没设 `ANTHROPIC_BASE_URL`、地址是 `api.anthropic.com`、或设了 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL` 时为真。派生门 `us()`、`qae()`、`j3()`、`gir()`（`chunk-hwmsct5x.js`）与计费头构造 `Dns()`（`chunk-3b05zaw0.js`）。2.1.312 与 2.1.316 的差异模式相同。
- 套件参考侧可信：unix socket + assume 变量抓的 A，与真直连 `api.anthropic.com` 抓的相比，三种认证只有随机值不同。
- Worker 的 CLI 本身能写出完整第一方计费头（非 CC 请求就是这样）；客户端自带计费头时 `setLeadingBillingField` 只替换已有字段不补缺（`cli-mods/content-policy.js:564`），第三方精简形状被原样发往上游。
- 注入等级对官方客户端不起作用：C 的 low 与 high 逐字节相同（客户端自带计费头）。direct 还少几个 beta，`metadata.account_uuid` 为空。

## C 对 A 的缺口（按上游可见程度）

| # | 缺口 | 谁能补 | 备注 |
|---|---|---|---|
| 1 | 计费头缺 `cch`、`cc_prompt_id`、`cc_turn_origin`、`cc_prompt_index`/`cc_turn_index`、`cc_prev_req`；缺 `x-claude-code-prompt-id` 头 | `cc_turn_origin` CLI 无状态可推；prompt-id、index、`cc_prev_req` 需 Worker 会话状态（`session_state.go` 已记 RequestID 与轮次） | `cch` 只能占位 `00000`（10-30 决定不处理） |
| 2 | system 3 块不是 4 块：身份行多 `cache_control`，静态块无 `scope:"global"`，但请求头带 CLI 补的 `prompt-caching-scope` beta，自相矛盾 | CLI 无状态：客户端版本与 CLI 一致时第 3 块 = 原生静态 1171 字节 + `"\n\n"` + 动态，按原生 `s2o` 拆 | 版本不一致或自定义 system 时不能拆 |
| 3 | 缺 `diagnostics`，却带 `cache-diagnosis` beta | Worker 按线程记上一次答复的消息 ID，首个请求为 `null` | |
| 4 | 子代理 `x-claude-code-agent-type` 写成 `custom`，官方是 `general-purpose` | 用父线程的 Agent 调用参数配对出类型，认不出就不发 | 写错值比不写更显眼 |
| 5 | 缺 `mid-conversation-system-clear-at` beta | 原生 `myr()` 要求没有自定义 base URL | 只补头不补行为，长对话仍有差，谨慎 |
| 6 | 认证方式差异（推荐用 `ANTHROPIC_AUTH_TOKEN`，客户端不是订阅用户）：无 1h 缓存 TTL 却带 `extended-cache-ttl`；`ScheduleWakeup` 5 分钟版描述；延迟工具无 `RemoteTrigger`、技能无 `schedule`；无 `userEmail` 提醒 | TTL、`ScheduleWakeup` 描述 CLI 可原生补 | 1h 缓存写入更贵，是产品决定；工具和技能不建议改 |
| 7 | 交互式会话 `output_config` 与 `safeguards` 键序反了（`finishBuilt` 追加到末尾） | CLI 无状态 | 我们的问题 |
| 8 | 2.1.312 的标题生成请求被当成主线程 Opus 请求（官方 haiku、auxiliary） | 类别可按原生标题提示词改；模型是客户端选的，不建议改 | |
| 9 | 续轮缺 `x-claude-code-prev-tool-durations` | 只能用答复到下次请求的时间近似 | |

已经正确：UA、`x-stainless-*`、头顺序、`x-client-request-id`、request-class、agent-id、会话 ID 映射、`account_uuid`、oauth 客户端的工具与 schema。

## 客户端开关实测

- `CLAUDE_CODE_GATEWAY_HINT_HEADERS=1`：客户端补发 request-class、agent-type（经网关后为正确的 `general-purpose`）、prompt-id 头与 prev-tool-durations；计费头字段、system 拆分、`diagnostics` 仍缺。风险低。
- `settings.json` 的 `env` 设 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`：第三方与第一方只差 Host 与第 5 项 beta。风险：私有变量无兼容承诺；客户端用 `CLAUDE_CODE_OAUTH_TOKEN=<网关 key>` 时会直接向 `api.anthropic.com` 请求 `/api/claude_code/settings` 与 `policy_limits`，把网关 key 发给 Anthropic；客户端自算的 `cch` 原样透传，网关改动请求体后可能对不上。

## 未覆盖

后台代理、fork、`/compact`、MCP、图片、长对话的 `clear_at`，以及真实上游对 `cch` 缺失或为占位值的反应。
