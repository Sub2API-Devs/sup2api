# 计费头入口与身份行自动填充：源码核对与设计草案

2026-10-22。源码为恢复的 Claude Code 2.1.304（`artifacts/claude-2.1.304/linux-restored`），实际请求数据取自 30 号 Worker 的请求日志（只统计计数，不读内容）。状态：**草案，待用户确认第 5 节后实施**。

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

- 核心存储的请求策略新增两个字段（`schema_version` 不变，旧配置缺省即现有行为）：
  - `build_billing_entrypoint`：`cli | sdk-cli | sdk-ts | sdk-py | claude-desktop | claude-vscode`，缺省 `sdk-cli`。
  - `build_identity_lines`：`{ <入口>: "le" | "ke" | "De" | "none" }`，核心按第 2 节的可选范围校验，缺省取各入口默认值。
- Worker → CLI 的 `requestPolicy` 现在只允许三个键，要加这两个，并新增能力 `build_identity_line_v1`。旧 Worker 没有这项能力时，按现有规则阻止发送，不静默忽略配置。
- 需要发布 CLI v17 和插件新版本，核心也要发版（校验和下发）。

## 5. 待确认

1. **默认值按哪一版**：按真实宿主（桌面版、VS Code 默认 `ke`），还是按用户表（桌面版 `De`、VS Code `le`）？`le` 目前只给 `cli`。上游三句都接受，差别只在与真实客户端是否一致。
2. **实际入口不在六项内时**（客户端自带 `claude-desktop-3p`、`unknown` 等）：建议 `claude-desktop-3p` 按 `claude-desktop` 处理，其余按配置的服务端入口那一行处理。
3. **`cch`**：经网关的真实客户端都不带，build 补的整行带 `cch=00000`。要不要在客户端入口是这六项之一时也去掉 `cch`，和真实客户端经网关时一致？上游两种都接受。
4. **`sdk-ts`/`sdk-py` 默认**：`De` 还是 `ke`？官方 SDK 用 preset 并追加提示时是 `ke`。
