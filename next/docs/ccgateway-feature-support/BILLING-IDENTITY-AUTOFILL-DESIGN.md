# 计费头入口与身份行自动填充：源码核对、设计与实施

2026-10-22。源码为恢复的 Claude Code 2.1.304（`artifacts/claude-2.1.304/linux-restored`），实际请求数据取自 30 号 Worker 的请求日志（只统计计数，不读内容）。状态：**已实施为 CLI v17（`ccgateway-v17-identity-line`），未发布**，结果见第 6 节。

## 1. 源码核对

| 说法 | 核对结果 |
|---|---|
| 身份行只有 3 种：`le` / `ke` / `De` | ✅ `chunk-t61vswm2.js`：`vt=[le,ke,De]`，`t1n` 认这三句 |
| `n1n`：Vertex → `le`；有 `recorded` 用记录值；非交互 + append → `ke`；非交互 → `De`；否则 `le` | ✅ 逐字一致。`recorded` 是续接会话时从提示快照里取回的旧行 |
| `cc_entrypoint = TY() ?? CLAUDE_CODE_ENTRYPOINT ?? "unknown"` | ✅ `chunk-6qx5mjec.js` `kLo`；`TY()` 是 `host.launchOptions.entrypointOnRequests()`（`chunk-dxktn51d.js`） |
| 默认值 `g(e)` | ✅ `chunk-zjcj7ams.js`；`e` 就是“非交互”，由 `bQs(e)` 传入，同一个值还设 `setInteractive(!e)` |
| 已知入口集合 `uzr`（27 项） | ✅ 与所列一致；`local_projects` 由 `V6n` 经 `H2r` 设到 `entrypointOnRequests`，也成立 |
| 可选字段 `cch`、`cc_workload`、`cc_is_subagent`、`cc_prev_req`、`cc_prompt_id`、`cc_turn_origin`、`cc_prompt_index`/`cc_turn_index`、`cc_gateway`、`cc_project` | ✅ 都在 `kLo`。除 `cc_workload`、`cc_is_subagent`、`cc_gateway`、`cc_project` 外，都要求 `firstParty && Ri()`（`ANTHROPIC_BASE_URL` 未设或是官方地址） |

### 1.1 需要修正的地方

**身份行不是由计费头入口决定的。** 两者各有来源：

- 身份行由“是否非交互”和“有没有 `--append-system-prompt`”决定（`n1n`）；
- 入口在设了 `CLAUDE_CODE_ENTRYPOINT` 时就是宿主写的值，`g(e)` 不管交互与否都不改，只有一个例外：`cli` 在非交互时改成 `sdk-cli`。

所以**唯一的硬绑定是 `cli` ⇒ `le`**（非交互的 `cli` 会被改名）。其他入口能配哪句，取决于宿主怎么启动 CLI。

“非交互”的判定（`chunk-bdj2znsb.js` `Jet`）：`-p`/`--print`、`--init-only`、`--sdk-url`，**或 stdout 不是终端**。桌面版、VS Code 扩展、TS/Python SDK 都用管道启动 CLI，所以都是非交互，主对话发 `De` 或 `ke`。源码里 `!e.isNonInteractiveSession||n==="claude-vscode"||Lu()`（`chunk-b3e25bn6.js` 等多处）专门把 VS Code 与桌面版“当作交互式”处理界面，这也说明它们的会话标志是非交互。

- **`claude-vscode` 的主对话是 `ke`**：核对了 Marketplace 上的扩展 2.1.306（`extension/extension.js`）。
  - 扩展给 CLI 进程设 `CLAUDE_CODE_ENTRYPOINT="claude-vscode"`，用内置的 Agent SDK 以 `--output-format stream-json --input-format stream-json` 启动，属于非交互。
  - 提示词是 `systemPrompt:{type:"preset",preset:"claude_code",append:Q04,snapshot:!0}`，`Q04` 以 `# VSCode Extension Context` 开头，非空。
  - CLI 在 initialize 里把 `appendSystemPrompt` 存进 options（`chunk-8w3jrzn0.js`），主循环取 `hasAppendSystemPrompt:!!s.options.appendSystemPrompt`（`chunk-rncrmfyt.js`），所以 `n1n` 给出 `ke`。
  - 扩展的“在终端中使用”模式只给终端设 `CLAUDE_CONFIG_DIR`，不设入口，那时是交互式的 `cli` + `le`。
  - 用户表中 `claude-vscode`→`le`、`claude-desktop`→`De` 的结果，符合“手动设 `CLAUDE_CODE_ENTRYPOINT` 再交互运行或用 `-p` 运行”的情形：那测的是 CLI 按交互与否选行，不是扩展和桌面版实际发的。
- **桌面版是 `ke`，不是 `De`**：30 号日志里 `claude-desktop-3p` 的主对话请求（带 tools）有 47 次是 `[计费头, ke, …]`。另外 10 次 `De` 是本机 `claude -p` 继承了桌面版的环境变量（我前两次的真实客户端测试），不是桌面版自己发的。

### 1.2 辅助请求不按这张表

- 标题生成、分类器、hook prompt、agent 命名等辅助请求带 `skipSystemPromptPrefix:!0`，只发计费头，不带身份行。30 号日志里 `claude-desktop-3p` 有 37 次不带 tools、只有计费头的请求，就是这类。
- 有些辅助请求把 `isNonInteractiveSession:!1` 写死（`mcp_datetime_parse`、启动时的模型检查 `WEo`），所以 SDK 会话里也会发 `le`。

因此原生 CC 里同一个入口可以配任意一句，或者不配。下面的对应表只针对主对话。

### 1.3 30 号请求日志（236 次入站请求）

| 入口 | 计费头位置 | 身份行 | 带 tools | 次数 | 来源 |
|---|---|---|---|---|---|
| `claude-desktop-3p` | 0 | `ke`@1 | 是 | 47 | 桌面版主对话 |
| `claude-desktop-3p` | 0 | 无 | 否 | 37 | 桌面版辅助请求 |
| `claude-desktop-3p` | 0 | `De`@1 | 是 | 10 | 本机 `claude -p`（测试） |
| `cli` | 0 | `le`@1 | 是 | 8 | 终端主对话 |
| `cli` | 0 | 无 | 否 | 9 | 终端辅助请求 |
| `cli` | 0 | `De`@1 | 是 | 1 | 来源不明（可能是续接会话的 `recorded`） |
| `sdk-cli` | 0 | 有/无 | — | 24 | 今天的 direct 测试 |
| 没有计费头 | — | — | — | 98 | 控制台测试、探测与 direct 对照 |

计费头字段共出现：`cc_version` 138、`cc_entrypoint` 136、`cch` 24、`cc_is_subagent` 1。经网关的真实客户端都设了 `ANTHROPIC_BASE_URL`，不算 firstParty，所以**不带 `cch`**；带 `cch=00000` 的都是 build 用原生 `kLo` 生成的。

## 2. 入口与身份行对应（建议）

| 入口 | 典型启动 | 主对话原生身份行 | 可选范围 | 默认 |
|---|---|---|---|---|
| `cli` | 终端里直接 `claude` | `le` | `le` | `le` |
| `sdk-cli` | `claude -p` | `De`；带 `--append-system-prompt` 时 `ke` | `De`、`ke` | `De` |
| `sdk-ts` | TypeScript Agent SDK | `De`；preset + append 时 `ke` | `De`、`ke` | `De` |
| `sdk-py` | Python Agent SDK | 同上 | `De`、`ke` | `De` |
| `claude-desktop` | 桌面版 | `ke`（`-3p` 实测） | `ke`、`De` | `ke` |
| `claude-vscode` | VS Code 扩展 | `ke`（扩展 2.1.306 源码） | `ke`、`De` | `ke` |

每个入口另有“不补”。身份行文字仍由 CLI 的 `n1n` 生成（`{isNonInteractive, hasAppendSystemPrompt}` 两个开关就能得到三句），代码里不抄写。

## 3. 行为（只在 build；direct 仍是纯透传）

1. **计费头**（必须）：沿用现有规则，客户端没有就补、缺字段就补。「入口标识＝服务端」以及客户端缺入口时补的值，改为配置的入口（六选一，默认 `sdk-cli`，与现在一致）。`cc_version` 与指纹不变。
2. **身份行**（可选）：取计费合并后的**实际入口**，在表里查它的选择：
   - 客户端已有三句之一：不动（现有规则）。
   - 选了某句：按现有位置规则插入（首块是计费头就插在其后）。
   - 选了“不补”：不插。但计费头不在首块时仍必须插入该入口的默认行，否则上游 429（2026-10-22 实测）。
   - 实际入口不在六项内（如 `claude-desktop-3p`、`unknown`）：见 5.2。
3. 只改计费头文字，不改 CLI 进程的 `CLAUDE_CODE_ENTRYPOINT`，它还影响其他原生行为。

## 4. 配置与契约

- 核心存储的请求策略新增两个字段（`schema_version` 不变，旧配置缺省即现有行为），全局→分组→账号逐项继承：
  - `build_billing_entrypoint`：`cli | sdk-cli | sdk-ts | sdk-py | claude-desktop | claude-vscode`，缺省 `sdk-cli`。
  - `build_identity_lines`：`{ <入口>: "official_cli" | "official_cli_sdk" | "agent_sdk" | "none" }`（分别是 `le`、`ke`、`De`），核心按第 2 节的可选范围校验，缺省取各入口默认值。
- 下发给 Worker 时去掉等于默认的值（与 CLI 自己的默认一致），所以没改过的配置不需要新 Worker；有偏离默认的值时要求能力 `build_identity_line_v1`，旧 Worker 没有就阻止发送，不静默忽略。direct 不下发。
- Worker → CLI 的 `requestPolicy` 允许的键加上这两个。
- 需要发布 CLI v17（`ccgateway-v17-identity-line`）和插件新版本，核心也要发版（校验和下发）。

## 5. 用户决定（2026-10-22）

1. 默认值按真实客户端（第 2 节的表）。
2. 实际入口不在六项内时，`claude-desktop-3p` 按 `claude-desktop`，其余按配置的服务端入口那一行。
3. `cch` 不变：客户端自带的计费头原样保留（经网关的真实客户端不带 `cch`）；build 补的整行仍是原生 `kLo` 的输出，Worker 直连官方地址，原生 CC 这时就带 `cch=00000`。
4. `sdk-ts`/`sdk-py` 默认 `agent_sdk`（`De`）。

## 6. 实施结果（2026-10-22，未发布）

- 代码：
  - 契约 `contracts/features/identity_line.go`（入口、可选范围、默认、能力）。
  - 核心 `request_policy.go`、`feature_policy.go`（字段、继承、来源、稀疏下发）、`runtime_features.go`/`client.go`（能力）、`config.go`（全局保存时缺省保留）。
  - Worker `engine/request_command.go`（校验、能力 409、写进 CLI 信封）、`cli_pinned.go`（声明能力）。
  - CLI `request-policy.js`（键、范围、`identityLineFor`）、`content-policy.js`（服务端入口替换原生整行里的 `cc_entrypoint`，`billingEntrypoint` 读请求入口）、`request-build-2.1.304.js`、`request-command.js`、`request-identity.js`（按选择插入）、`patch-cli-2.1.304.cjs`（`n1n` 三组参数生成三句、能力、标签 v17）。
  - 前端：计费头卡片加「服务端入口」下拉；新增「身份行」卡片，每个入口一个下拉，只列该入口的可选句和「不补」。
- 本地：cli-mods 136 项、engine、核心 ccgateway 与 account（含 PG）、前端 623 项、类型检查都通过；两份跨层契约夹具已重新生成并加了这两个字段的用例。v17 ELF sha256 `7310508b…47233c4`。
- 30 号实测（v17 ELF 一次性放进容器，测完删除）。先用 unix socket 假上游看发出的 system，再打真实上游：

| 场景 | 发出的 system | Opus / Sonnet |
|---|---|---|
| 没有计费头，默认配置 | `[计费头 sdk-cli +cch, agent_sdk, 提示]` | 200 / 200 |
| 没有计费头，服务端入口 `claude-vscode` | `[计费头 claude-vscode +cch, official_cli_sdk, 提示]` | 200 / 200 |
| 客户端头 `cli` | `[计费头 cli, official_cli, 提示]` | 200 / 200 |
| 客户端头 `claude-desktop-3p` | `[计费头 claude-desktop-3p, official_cli_sdk, 提示]` | 200 / 200 |
| 客户端头 `sdk-ts`，选 `official_cli_sdk` | `[计费头 sdk-ts, official_cli_sdk, 提示]` | 200 / 200 |
| 客户端头 `cli`，选「不补」 | `[计费头 cli, 提示]` | 200 / 200 |
| 计费头不在首块，选「不补」 | `[official_cli, 提示, 计费头 cli]` | 200 / 200 |
| 客户端头 `remote`（不在六项内），服务端入口 `cli` | `[计费头 remote, official_cli, 提示]` | 200 / 200 |
| 客户端头 `cli`，入口标识选「服务端」，服务端入口 `sdk-py` | `[计费头 sdk-py, agent_sdk, 提示]` | 200 / 200 |
