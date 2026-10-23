# CCGateway 请求头的去向（2026-10-23）

审核（`next/docs/audits/2026-10-23-ccgateway/04-cli-mods.md` §2.3）指出「请求头拆分」此前没有一处成文。这里是事实源：客户端请求头到 Worker 之后被拆成四路，**没有任何一个客户端请求头是原样转发的**；上游收到的请求头由 Worker 进程里的原生 CLI（`sF` 创建的 SDK 客户端）生成。

四路是：① `anthropic-version`/`anthropic-beta` 变成 CLI 参数再覆盖 SDK 同名头；② 5 个请求上下文头经 `CCG_REQUEST_AGENT` 由原生重新写出；③ prev-tool-durations 与 4 个压缩头经同一变量原值放回；④ 会话头不转发，由 body 的 `metadata.user_id` 经 `CCG_REQUEST_IDENTITY` 让原生写出。其余全部丢弃、由原生 SDK 重新生成（v22 起 CC 形状的 UA 例外，见下表）。哪些头能到 Worker 由插件 `manifest.json` 的 `passHeaders` 决定。下表逐个列出。

| 客户端头 | 去向 | 实施者 |
|---|---|---|
| `anthropic-version`、`anthropic-beta` | 核心按插件 `passHeaders` 交给插件 → Worker 转成 CLI 参数 `--header` / `--betas` → 补丁 `authenticatedRequestHeaders` 覆盖 SDK 生成的同名头（beta 为客户端 ∪ 原生新增 ∪ 注入层所需） | 插件、Worker、CLI 补丁 |
| `x-claude-code-request-class` / `agent-id` / `parent-agent-id` / `agent-type` / `prompt-id` | 同上到 Worker → `CCG_REQUEST_AGENT.client` → `request-agent.js` 选出 `querySource`/`requestClass`/`agentContext`/`promptId` → **原生 `sF` 重新写出这 5 个头**；build + OAuth 时 prompt-id 被映射 | 插件、Worker、CLI 补丁 + 原生 |
| `x-claude-code-prev-tool-durations`、`x-cc-compaction-request`、`x-claude-code-compaction`、`x-cc-context-compacted`、`x-claude-code-context-compacted` | 同上 → 原值放回请求头 | 插件、Worker、CLI 补丁 |
| `x-claude-code-session-id` | 不转发；从 body `metadata.user_id` 解析 → `CCG_REQUEST_IDENTITY` → 补丁 `Yi` 让根会话用它 → 原生 `nl()` 写头 | Worker、CLI 补丁 + 原生 |
| `user-agent` | **v22 起**：CC 形状（`claude-cli/x.y.z (external, <入口>[, agent-sdk/…][, client-app/…][, workload/…])`）的才转发 → `CCG_REQUEST_AGENT.client.user_agent`；发出的请求若首块计费头的 `cc_version`、`cc_entrypoint` 都仍是客户端的，UA 原样用客户端的（`keepClientUserAgent`，补丁让 `nl()` 先读它）；否则原生 `dN()` 按请求入口生成 | 插件、Worker、CLI 补丁 + 原生 |
| `x-app`、`x-stainless-*`、`anthropic-dangerous-direct-browser-access`、`accept`、`accept-encoding`、`content-type`、`x-client-request-id`、`authorization` / `x-api-key` | 丢弃，由原生 SDK 重新生成（凭证由 `sF` 注入） | 原生 |
| 其他任何头 | 丢弃 | 核心（不在 `passHeaders`） |

## 请求入口（entrypoint）

Claude Code 的计费头 `cc_entrypoint`（`kLo`）和 UA 的入口段（`dN`）读同一个值：`TY()`（`launchOptions.entrypointOnRequests`）?? `CLAUDE_CODE_ENTRYPOINT` 环境变量。v22 起 CLI 在构建前按请求调原生 `setEntrypointOnRequests(E)`：

- E = 首块计费头的 `cc_entrypoint`，当它存在且 `build_billing_sources.cc_entrypoint` 不是 `worker`；
- 否则 E = `build_billing_entrypoint`，没有则 `sdk-cli`。

于是原生生成的计费头与 UA 一致；build 的 turn 判断（`cli` 为人在终端输入）也用 E。direct 同样在发送前按 E 设置（`request-command.js`）。

Worker 仍给 CLI 进程设默认入口（组装 CLI 命令时；工作树 `requestCommand`）：继承的 `CLAUDE_CODE_ENTRYPOINT` 未设、为空或为 `cli` 时设成 `sdk-cli`，其他值保留（审核 C14）。这只是进程默认值，补丁的 `request` 命令跳过了交互式初始化才需要它；v22 起它不再决定请求的入口。它与策略的默认入口 `sdk-cli`（CLI `defaultEntrypoint`、contracts `DefaultBillingEntrypoint`）是两处独立的默认，改其中一处要一起改。

账号测试（`/v1/ccgateway/probe`）不带客户端请求上下文，请求头全部是原生主线程的。

## 已知边界

- 传输层（审核 D2）：我们的 ELF 用 Bun 1.4.3 重编（约 157 MB），官方 2.1.304 内嵌 Bun 1.4.4（约 288 MB，多出的内容未分析）。TLS/HTTP 层指纹（ClientHello、HTTP 版本、头的序列化）因此不能声称与官方一致；另见 `relay-tls-fingerprint` 的测量。
- `cch`：官方 ELF 在发送前把计费头里的 `cch=00000` 换成每次不同的值，这发生在官方 Bun 运行时里；我们发出 `00000`。上游目前接受它是观察，不是保证。
- 头的顺序由原生 `sF` 的 `defaultHeaders` 与 SDK 决定，cap21 与官方参考一致；UA 原样保留时位置不变（仍由 `nl()` 写出）。
- 非 CC 客户端（无计费头）的请求头全部由原生按策略入口生成，设计上不与客户端一致。
