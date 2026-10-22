# Claude Code 接入说明

把 Claude Code 指向本平台时的推荐配置（2026-10-22，按 Claude Code 2.1.304 验证）。

## 推荐配置

写进 Claude Code 的设置文件（用户级 `~/.claude/settings.json`，或项目里的 `.claude/settings.json`）：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://<网关地址>",
    "CLAUDE_CODE_OAUTH_TOKEN": "<平台 API Key>",
    "_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL": "1"
  }
}
```

也可以在启动前设成同名环境变量。

| 变量 | 作用 |
|---|---|
| `ANTHROPIC_BASE_URL` | 请求发到本平台 |
| `CLAUDE_CODE_OAUTH_TOKEN` | 平台 API Key 以 `Authorization: Bearer` 发送（平台同时接受 `x-api-key` 和 Bearer）。Claude Code 按订阅账号的方式组装请求，和上游 Claude 账号一致 |
| `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL` | 让 Claude Code 把这个地址当作官方地址，按官方的样子发请求（见下节） |

## 为什么要设 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL`

Claude Code 只在地址是官方地址时才发这些内容（2.1.304 `Ri7()`：`ANTHROPIC_BASE_URL` 未设或是官方地址，或设了这个变量）：

- 计费头的 `cch`、`cc_prompt_id`、`cc_turn_origin`、`cc_prompt_index`、`cc_turn_index`、`cc_prev_req`；
- `x-claude-code-request-class`、`x-claude-code-agent-type`、`x-claude-code-prompt-id`、`x-claude-code-prev-tool-durations` 请求头；
- system 的分块与 `scope: global` 缓存、`diagnostics` 字段。

不设时这些都不会发出，平台无从补齐：子代理的类型只能按自定义处理、没有 prompt-id、计费头只有两个字段，发往上游的请求和官方客户端不一样。设了之后，经平台转发的主代理、子代理、嵌套子代理请求与官方客户端直连时逐字段一致，只剩下面列出的差异（2026-10-22 离线端到端验证，见 [子代理请求上下文设计](SUBAGENT-REQUEST-CONTEXT-DESIGN.md) 第 10 节）。

## 认证方式的影响

- **`CLAUDE_CODE_OAUTH_TOKEN`（推荐）**：按订阅账号组装，缓存 1 小时、工具说明与订阅账号一致。
- **`ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN`**：Claude Code 按 API 用户组装，缓存只用 5 分钟（不带 `extended-cache-ttl` beta），个别工具说明不同。请求能用，但和订阅账号的请求有差别。

## 已知差异与限制

- 设了变量后仍有：`anthropic-beta` 少 `mid-conversation-system-clear-at-2026-08-21`（Claude Code 对自定义地址不发）；prompt-id 的值在 build 模式是平台映射后的值（会话 ID 按身份映射规则，agent-id 用客户端原值）。
- **核心 0.1.176 / 插件 0.1.75 及以前，设了变量的请求会失败**：设了变量后请求带 `diagnostics`，平台要账号提供资源身份、Worker 回执跟踪才转发。API Key 账号提供不了；OAuth 账号的 Worker 只认 Claude Code 2.1.292/2.1.296，线上 2.1.304 一律拒绝，build/direct 也不回执跟踪。结果都是 503（“account does not provide a verified resource issuer”），Claude Code 会一直重试（2026-10-22 在 #21 实测，生产 10-19 起 30/31/32 也有）。下一版核心与插件修复：OAuth 账号核验身份并跟踪，API Key 账号原样转发（不登记归属）；在那之前不要设这个变量。不设时请求正常，平台仍按客户端的 agent-id 和计费头还原子代理。
- 这是 Claude Code 的内部变量（下划线开头），换版本可能改名或失效，升级 Claude Code 后需要重新验证。
- 只验证了 `claude -p` 非交互模式（主代理、子代理、嵌套子代理）。交互模式下 Claude Code 会把平台当作官方服务，账号信息、用量等界面功能可能显示异常，尚未验证。
