# 子代理请求上下文设计（草案）

2026-10-22。依据见 [CLAUDE-CODE-2.1.304-SYSTEM-PROMPT-ASSEMBLY.md](CLAUDE-CODE-2.1.304-SYSTEM-PROMPT-ASSEMBLY.md) 第 9–11 节：build 原样保留子代理的提示词、消息和计费头，但请求头按主线程生成（`request-class: main`，没有 agent-id、agent-type、prompt-id），还多带了 1 小时缓存的 beta。原因是请求命令和原生构建都写死了 `querySource: 'sdk'` 和主线程上下文。

## 1. 已定的规则（2026-10-22 用户决定）

1. 插件把客户端的 `x-claude-code-request-class`、`agent-id`、`parent-agent-id`、`agent-type`、`prompt-id` 转发给 Worker；有就用。
2. 用客户端原始 body 判断（在补计费头之前）：
   - 首块以计费头开头 → CC 真实请求；计费头带 `cc_is_subagent=true` → CC 子代理，否则 CC 主线程。
   - 没有 → 非 CC 请求，**按子代理构建**。
3. 发往上游的 ID 都派生：用账号私钥 HMAC（现有 `identityDigest`），保持官方格式，并保持官方请求里所有的相等关系（第 4 节）。
4. parent-agent-id 不虚构：客户端没发就按“从主线程启动”处理，不发。

## 2. 每类请求交给原生代码的输入

原生 `sF3` 按 `source/querySource`、`requestClass`、`agentContext`、`promptId` 生成请求头；`kLo` 按 `agentContext`、`promptId` 生成计费头；`zbe2(querySource)` 决定缓存时长和 `extended-cache-ttl` beta。所以只需给对这四项，不手写请求头。

| 请求 | querySource | agentContext | promptId |
|---|---|---|---|
| CC 主线程 | `sdk`（不变） | 主线程（不变） | P′ |
| CC 子代理，agent-type 是内置类型 | `agent:builtin:<类型>` | `{agentType:"subagent", agentId:A′, parentAgentId:B′?, parentPromptId:P′}` | P′ |
| CC 子代理，agent-type 为 `custom` 或缺失 | `agent:custom` | 同上 | P′ |
| CC 请求，客户端 request-class 为 compaction | `compact` | 主线程 | P′ |
| CC 请求，客户端 request-class 为其他值（auxiliary 等） | `sdk`，并显式传 `requestClass` | 主线程 | P′ |
| 非 CC 请求 | `agent:custom` | `{agentType:"subagent", agentId:A′}` | P′（见第 3 节） |

- 内置类型以 CLI 自己的内置代理名单为准；不在名单里按 `custom`。agent-type 缺失时第一版不做提示词匹配。
- 非 CC 请求发出的形状：`request-class: subagent`、`agent-type: custom`、有 agent-id、没有 parent；缺计费头时 v17 补的原生整行会带 `cc_is_subagent=true` 和 `cc_prompt_id`；5 分钟缓存，不带 1 小时 beta。已知代价：会话里只有子代理请求、system 末尾没有 CLI 的 T7t 三段，与真实 CC 不同（用户已知并决定）。

## 3. ID 的来源与派生（build）

密钥是账号私钥（v14 身份映射同一把），每类 ID 用各自的域标签。S 是客户端会话（`metadata.user_id` 的 `session_id`），没有时为空串，按固定规则派生，不用随机值。

| 上游值 | 客户端来源（优先级从高到低） | 派生 | 格式 |
|---|---|---|---|
| session-id（U） | `metadata.user_id` | 现有 `identityDigest(key, "session", S)` | UUID |
| agent-id（A′） | 请求头 agent-id；没有请求头的 CC 子代理和非 CC 请求：第一条用户消息的文字 | `identityDigest(key, "agent", S, 来源)` | `a` + 16 位小写十六进制 |
| parent-agent-id（B′） | 请求头 parent-agent-id | 与 A′ 同一个函数 | 同上 |
| prompt-id（P′） | 请求头 prompt-id；否则计费头的 `cc_prompt_id`；非 CC：第一条用户消息的文字 | `identityDigest(key, "prompt", 来源)` | UUID v4 |

- “一律优先请求头”：同一个子代理只要请求头里有 agent-id，就始终用它，避免一部分轮次用请求头、一部分用 body 而对不上。
- P′ 同时写进请求头和计费头的 `cc_prompt_id`（CLI 改写这一个字段的值，其余字节不动）。
- API Key 账号沿用现有规则：不映射。request-class、agent-type 是类别名，不派生。

## 4. 必须保持的关联（测试逐条断言）

| 关联 | 保证方式 |
|---|---|
| 请求头 session-id = metadata `session_id` | 同一函数 |
| 同一会话所有请求 session-id 相同 | 输入同为 S |
| 同一子代理各轮 agent-id 相同 | 输入同为 (S, A) |
| 子代理的 parent-agent-id = 上一层的 agent-id | 同一函数、同一 S |
| 请求头 prompt-id = 计费头 `cc_prompt_id` | 同一函数，一起改 |
| 子代理与父线程 prompt-id 相同 | 输入相同 |
| metadata `parent_session_id` = 父会话 session-id | 现有映射同一函数 |
| 重启、重新授权后不变 | 私钥在账号数据卷 |

不同账号的密钥不同，同一客户端会话在两个账号上派生出不同的值（换账号即换上游用户）。

## 5. direct

direct 的 body 原样转发，客户端的 `metadata.session_id`、`cc_prompt_id` 都是原值。为保持关联，direct 的请求头也用客户端原值：session-id 用 metadata 里的原值，agent-id、parent-agent-id、prompt-id 用客户端请求头的原值；非 CC 请求的 agent-id 仍派生（body 里没有对应值）。

现有问题（2026-10-22 重放确认）：direct 现在不给 CLI 身份上下文，CLI 用自己随机的会话 ID 发请求头，和 body 里客户端的 `session_id` 对不上。按上面的规则一起修。

## 6. 实现位置

- **插件**（`internal/ccgateway/ccgateway.go` `headers`）：多放行四个头，各自校验格式（可打印 ASCII、长度上限；prompt-id 必须是 UUID；request-class、agent-type 限定字符集）。
- **Worker**（请求命令路径）：解析这些头和 body 里的判断依据，按第 3 节派生，作为新的环境变量交给 CLI；新能力 `request_agent_context_v1`，旧 CLI 不给。
- **CLI**：请求命令创建客户端时、build 交给原生构建时，用这份上下文代替写死的 `sdk` 和主线程上下文；改写计费头的 `cc_prompt_id`。

## 7. 验证

- 单元测试：第 4 节全部关联，含会话为空、嵌套子代理、只有 body 标记、非 CC 请求。
- 30 号：官方 CLI + 假上游抓主线程、子代理、嵌套子代理、压缩请求，经网关 build 和 direct 后重放，逐字段与官方对比，并核对第 4 节关联；非 CC 请求单独抓一次。真实上游各发一次确认 200。

## 8. 待确认

1. CC 请求的 compaction / auxiliary：querySource 的取法未实测，第一版按第 2 节，测完再定。
2. agent-type 缺失时是否做内置提示词匹配：第一版不做。
