# CCGateway 请求头的去向

以代码为准；CLI 版本见 [`cli-mods/README.md`](../../plugins/ccgateway/companions/cli-mods/README.md) 的版本表。

审核（`next/docs/audits/2026-10-23-ccgateway/04-cli-mods.md` §2.3）指出「请求头拆分」此前没有一处成文。这里是事实源：上游收到的请求头**全部由 Worker 进程里的原生 CLI（`sF` 创建的 SDK 客户端）生成**，没有一个是把客户端的头直接透传过去的。客户端的头到 Worker 之后被拆成四路，只作为生成的输入；其中一部分的值会被原样写回（③ 的头、agent-id 等上下文头的原值、符合条件的 UA），所以「值与客户端相同」和「头被透传」是两回事。

四路是：① `anthropic-version`/`anthropic-beta` 变成 CLI 参数再覆盖 SDK 同名头；② 5 个请求上下文头经 `CCG_REQUEST_AGENT` 由原生重新写出；③ prev-tool-durations 与 4 个压缩头经同一变量原值放回；④ 会话头不转发，由 body 的 `metadata.user_id` 经 `CCG_REQUEST_IDENTITY` 让原生写出。其余全部丢弃、由原生 SDK 重新生成（v22 起 CC 形状的 UA 例外，见下表）。哪些头能到 Worker 由插件 `manifest.json` 的 `passHeaders` 决定。下表逐个列出。

| 客户端头 | 去向 | 实施者 |
|---|---|---|
| `anthropic-version`、`anthropic-beta` | 核心按插件 `passHeaders` 交给插件 → Worker 转成 CLI 参数 `--header` / `--betas` → 补丁 `authenticatedRequestHeaders` 覆盖 SDK 生成的同名头。beta 为客户端 ∪ 原生新增 ∪ 注入层所需：客户端的 beta 保持客户端顺序，请求加上的（OAuth 账号的登录 beta、构造器加的 `extended-cache-ttl` 等）插在 Claude Code 自己写它们的位置——顺序取自原生模型表 `S8n` 与请求构造器 `uXn` 的 `zr.push` 顺序（补丁期 AST 读取，`cli-mods/request-betas.js`，v25 起）；原生表认不出模型时追加在末尾并写一条 `CCG_BETA_ORDER_UNAVAILABLE` 诊断 | 插件、Worker、CLI 补丁 |
| `x-claude-code-request-class` / `agent-id` / `parent-agent-id` / `agent-type` / `prompt-id` | 同上到 Worker → `CCG_REQUEST_AGENT.client` → `request-agent.js` 选出 `querySource`/`requestClass`/`agentContext`/`promptId` → **原生 `sF` 重新写出这 5 个头**；build + OAuth 时 prompt-id 被映射 | 插件、Worker、CLI 补丁 + 原生 |
| `x-claude-code-prev-tool-durations`、`x-cc-compaction-request`、`x-claude-code-compaction`、`x-cc-context-compacted`、`x-claude-code-context-compacted` | 同上 → 原值放回请求头 | 插件、Worker、CLI 补丁 |
| `x-claude-code-session-id` | 不转发；从 body `metadata.user_id` 解析 → `CCG_REQUEST_IDENTITY` → 补丁 `Yi` 让根会话用它 → 原生 `nl()` 写头。build 请求没有 `metadata.user_id` 时（OAuth 账号），会话由对话第一条消息按账号映射，出口 metadata 与会话头一致（CLI v27，BUILD-REQUEST-COMPONENTS-DESIGN §7） | Worker、CLI 补丁 + 原生 |
| `user-agent` | **v22 起**：CC 形状（`claude-cli/x.y.z (external, <入口>[, agent-sdk/…][, client-app/…][, workload/…])`）的才转发 → `CCG_REQUEST_AGENT.client.user_agent`；发出的请求若首块计费头的 `cc_version`、`cc_entrypoint` 都仍是客户端的，UA 原样用客户端的（`request-agent.js` `setClientUserAgent`，补丁让 `nl()` 先读它）；否则原生 `dN()` 按请求入口生成 | 插件、Worker、CLI 补丁 + 原生 |
| `x-app`、`x-stainless-*`、`anthropic-dangerous-direct-browser-access`、`accept`、`accept-encoding`、`content-type`、`x-client-request-id`、`authorization` / `x-api-key` | 丢弃，由原生 SDK 重新生成（凭证由 `sF` 注入）。`x-stainless-arch/os/runtime/runtime-version/package-version` 描述的是 **Worker 容器**里的 CLI（Linux、x64、node 运行时），不是客户端的机器；`x-stainless-timeout` 是 `600`（客户端超时取 Claude Code 默认 600 秒与 Worker 期限的较小者，`model-request.js`）；`x-stainless-helper` 不会出现（客户端工具是纯 JSON，SDK 找不到需要标注的 helper） | 原生 |
| 其他任何头 | 丢弃 | 核心（不在 `passHeaders`） |

## 请求入口（entrypoint）

Claude Code 的计费头 `cc_entrypoint`（`kLo`）和 UA 的入口段（`dN`）读同一个值：`TY()`（`launchOptions.entrypointOnRequests`）?? `CLAUDE_CODE_ENTRYPOINT` 环境变量。v22 起 CLI 在构建前按请求调原生 `setEntrypointOnRequests(E)`：

- E = 首块计费头的 `cc_entrypoint`，当它存在且 `build_billing_sources.cc_entrypoint` 不是 `worker`；
- 否则 E = `build_billing_entrypoint`，没有则 `sdk-cli`。

于是原生生成的计费头与 UA 一致；build 的 turn 判断（`cli` 为人在终端输入）也用 E。direct 同样在发送前按 E 设置（`request-command.js`）。

Worker 仍给 CLI 进程设默认入口（组装 CLI 命令时，`engine/request_command.go` `requestCommand`）：继承的 `CLAUDE_CODE_ENTRYPOINT` 未设、为空或为 `cli` 时设成 `sdk-cli`，其他值保留（审核 C14）。这只是进程默认值，补丁的 `request` 命令跳过了交互式初始化才需要它；v22 起它不再决定请求的入口。它与策略的默认入口 `sdk-cli`（CLI `defaultEntrypoint`、contracts `DefaultBillingEntrypoint`）是两处独立的默认，改其中一处要一起改。

账号测试（`/v1/ccgateway/probe`）不带客户端请求上下文，请求头全部是原生主线程的。

## 请求行

build 与 direct 都是 `POST /v1/messages?beta=true`，与官方客户端相同（插件 0.1.88 起；此前少 `?beta=true`）。build 经原生 `client.beta.messages.create` 发送，direct 用 `client.post` 发原始字节，路径在打补丁时从同一个 create 里按 AST 取出（见 [REQUEST-MODES](../../plugins/ccgateway/docs/REQUEST-MODES.md) §1.1）。

## 实测（2026-10-25，第二轮工作流审核）

`next/docs/audits/2026-10-24-ccgateway-workflow-r2/`：官方 2.1.304 客户端（设 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`）经网关的出口与直连官方相比，CC 请求的请求头名字与顺序（24 个）、UA、`x-stainless-*`、`anthropic-beta`（OAuth 形状）逐位相同；只差每次随机的 ID、被映射的 session/prompt ID，以及客户端自己对自定义地址不发的 `mid-conversation-system-clear-at-2026-08-21`。API Key 形状的客户端经 OAuth 账号时，出口多出 `oauth-2025-04-20` 与 `extended-cache-ttl-2025-04-11`，补上后与官方 OAuth 客户端的列表逐字节相同。

## 已知边界

- 传输层（审核 D2）：我们的 ELF 用 Bun 1.4.3 重编（约 157 MB），官方 2.1.304 内嵌 Bun 1.4.4（约 288 MB，多出的内容未分析）。TLS/HTTP 层指纹（ClientHello、HTTP 版本、头的序列化）因此不能声称与官方一致；另见 `relay-tls-fingerprint` 的测量。
- `cch`：官方 ELF 在发送前把计费头里的 `cch=00000` 换成每次不同的值，这发生在官方 Bun 运行时里，我们的 CLI 不会算。CC 请求的计费头是客户端的，`cch` 就是客户端算好的值（build 改了 `cc_prompt_id` 与 metadata，它可能已和 body 对不上）；非 CC 请求的计费头由我们补，发出 `00000`。上游目前接受它是观察，不是保证。
- 头的顺序由原生 `sF` 的 `defaultHeaders` 与 SDK 决定，cap21 与官方参考一致；UA 原样保留时位置不变（仍由 `nl()` 写出）。
- 非 CC 客户端（无计费头）的请求头全部由原生按策略入口生成，设计上不与客户端一致。
- 请求上下文头只对 CC 请求（system 带计费头）有效：非 CC 请求一律按 CC 主线程构建，客户端发的请求类别、agent、prompt-id、上一轮工具耗时与压缩头都不用（CLI v28 起，2026-10-25 用户决定；此前非 CC 请求可以自称子代理，出口带上这些头并补 `cc_is_subagent=true`，见 `04-subagent.md`）。
- 生产日志不记录 Worker 发往上游的报文；出口只能用录下的入站在账号容器内回放到假上游取得（审核 r2 的做法）。
