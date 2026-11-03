# 运行对照场景扩充（scenarios 成员）

负责人：scenarios 成员（2026-11-04）。写入范围：`tools/verify/scenarios.mjs`、`tools/verify/fixtures/`、对 `fake-upstream.mjs` / `fake-mcp-server.mjs` / `run.mjs` / `compare.mjs` / `vt-screen.mjs` / `pty-driver.js` 的向后兼容增强、新垫片 `tools/verify/win-hook-spawn-shim.js`、本文件、`docs/process/verify.md` 第 15 节、`analysis/verify/scenarios-*`、`artifacts/tmp/scenarios/`（探索草稿与一次性脚本）。

## 1. 结论

- 场景从 54 个扩到 **98 个**（新增 44 个，全在 `scenarios.mjs` 的"第三轮"注释之后）：工具往返与错误路径 7、权限 10、钩子 1、MCP 4、插件 5、会话 5、伪终端交互 12。
- 稳定性：**original 对 original 连跑两轮（3 路、4 路并发，`--retry 0`）都是 98/98 一致、预期 98/98 满足，0 个 flaky**（`analysis/verify/scenarios-oo-run1.*`、`scenarios-oo-run2.*`）。新增的 44 个场景每个都要归一化才一致（rawDiffCount > 0），全量里需要归一化的是 66 个。
- **original 对 runnable：98/98 一致，预期两边都 98/98，0 个 flaky**（`analysis/verify/scenarios-original-vs-runnable.*`，`--retry 1` 没有触发）。
- 负对照（`analysis/verify/scenarios-negative-control.*`）：在 original 副本里改三处文字（Edit 的 "String to replace not found"、MCP 的 "Resource not found"、权限框的 "User rejected"），`tool-edit-errors`、`mcp-resources`、`tty-permission-reject` 都报出差异和预期失败，没被归一化掩盖；没改到的 `tool-read-errors` 一致。
- 所有场景不联网（外网请求只有原来就有的 `print-hi-first-party` 12 次、`tty-first-run` 2 次 CONNECT，都被黑洞代理拦下），泄漏审计 0，宿主警告 0。
- 新发现的环境问题与 CLI 行为（第 3、4 节）：
  1. **命令钩子在 Windows 上收不到 stdin**：linux 构建的钩子执行用 `spawn(cmd, [], {shell: true, detached: true})`，公版 Bun 在 Windows 上 `shell + detached` 的子进程拿不到管道；另外 `shell: true` 是 cmd.exe，不展开 `${CLAUDE_PLUGIN_ROOT}`。写了 `win-hook-spawn-shim.js`（按 Windows 构建的参数改成 Git Bash、不 detached）。
  2. **vt-screen 的宽字符判定错了**：把 ⏸ ⚠ ✳ 这类默认文本显示的字符按 2 列算，Ink 增量重绘后整行错位（"manual" 变成 "munual"）。改成 `\p{Emoji_Presentation}`。
  3. **路径类权限规则在 Windows 上不生效**：`Read(./secret.txt)` 之类的 deny 规则匹配不到（linux 构建用 `posix.relative` 算 `D:\` 路径），`acceptEdits` 下 Write 也被当成工作目录外。两棵树行为相同，场景按现状断言并写明。

## 2. 新增场景清单与判定

判定一律是"假上游收到的请求体 + tool_result 内容 + 文件系统副作用 + 退出码 + 屏幕快照"，不是只跑 `--help`。下表"判定"列是 `expect` 里检查的内容；对拍时 `compare.mjs` 还会逐字段比较全部请求、stdout/stderr、工作目录文件、收集到的日志。

### 2.1 工具往返（`-p` + 假上游脚本驱动 tool_use → tool_result）

| 场景 | 覆盖 | 判定 |
|---|---|---|
| tool-read-errors | Read：不存在的文件、目录（EISDIR）、缺参数（InputValidationError）、offset/limit、全文 | 5 个 tool_result 的 is_error 与文字（"File does not exist. Note: your current working directory is …"、"2\ttwo"…） |
| tool-edit-errors | Edit/Write 的"先读后写"约束、old_string 不存在、多处匹配、replace_all、Write 建嵌套目录再 Edit | 8 个 tool_result；最终 `exist.txt` = "0ne\ntw0\nthree\n"、`deep/a/b.txt` = "nested-edited\n" |
| tool-unavailable | 并行调用 316 默认没有的 Glob、Grep、TodoWrite | 三个 "No such tool available: …" 错误各带提示 |
| tool-bash-errors | [垫片 win-append] exit 3、输出后 exit 4、cd 不存在目录、pwd、命令不存在（127） | 退出码文字、输出内容 |
| tool-notebook | ToolSearch 关键词搜索 / select 不存在的工具 / NotebookEdit replace 与 delete | tool_reference、"No matching deferred tools found"、Read .ipynb 的 `<cell id>` 形式、最终 nb.ipynb 只剩改过的 c1 |
| tool-skill-claudemd | 项目 CLAUDE.md 注入、项目技能 `.claude/skills/verify-skill`、未知技能 | 第一条 user 消息含 CLAUDE.md；"Launching skill" + 技能正文；未知技能 is_error |
| tool-agent-sync | `--agents` 自定义代理 + Agent 工具同步运行，子代理用 Read | 假上游 routes 把子代理请求分开；请求顺序 主→子→子→主；子代理只有 Read；hand-back 文本含报告 |

### 2.2 权限

| 场景 | 覆盖 | 判定 |
|---|---|---|
| perm-mode-plan | `--permission-mode plan` | Read 成功；Write "Cannot write to … while in plan mode."；文件不存在 |
| perm-mode-accept-edits | `acceptEdits` | Write 仍被拒（"haven't granted it yet"）、Bash 重定向 "outside the working directories"（Windows 上的已知偏差，第 4 节） |
| perm-mode-bypass | `bypassPermissions` | Write、Bash 都执行，文件内容核对 |
| perm-mode-dont-ask | `dontAsk` | Write、Bash 都拒绝，Bash 的文字是 "…running in don't ask mode…" |
| perm-mode-auto | `auto`（分类器） | 假上游 `side` 函数按动作回 `<severity>`：ok.txt 放行、blocked.txt 拦截；至少 2 个分类器请求、含 `<transcript>`；blocked.txt 不存在 |
| perm-allowed-pattern | [垫片 win-append] `--allowedTools "Bash(echo:*)"` + `--disallowedTools Write` | echo 执行；pwd（只读）自动放行；mkdir 被拒；Write 不在工具表、调用报 "No such tool available" |
| perm-settings-rules | 项目 settings.json 的 allow/deny（已信任目录） | deny 整个 Edit → 工具表无 Edit；Bash 内容规则拒绝；allow 的 Read/Write 成功；路径规则 `Read(./secret.txt)` 不生效（已知偏差，断言写现状） |
| perm-settings-untrusted | 同上但目录未信任 | stderr "Ignoring 2 permissions.allow entries …"；allow 被忽略、deny 仍生效 |
| perm-settings-default-mode | `--settings` 里 `permissions.defaultMode: plan` | stream-json init 的 permissionMode = plan；Write 被 plan 拒 |
| tool-unavailable / perm-allowed-pattern | 被拒绝的工具调用 | 见上 |

### 2.3 钩子

| 场景 | 覆盖 | 判定 |
|---|---|---|
| hook-settings-events | [垫片 win-hook-spawn] settings.json 命令钩子：SessionStart、UserPromptSubmit（stdout 进上下文）、PreToolUse 退出码 2 拦截、PostToolUse、Stop、SessionEnd | 钩子日志的事件序列逐个核对；请求里有 "UserPromptSubmit hook success: HOOK-CONTEXT-LINE"；拦截 tool_result；blocked.txt 不存在、ok.txt 存在。日志里还记了每个事件的输入字段名，对拍时逐字段比较 |

### 2.4 MCP（`fake-mcp-server.mjs`，新加 `--full`、`--exit-on-start`）

| 场景 | 覆盖 | 判定 |
|---|---|---|
| mcp-resources | ListMcpResourcesTool、ReadMcpResourceTool（成功 / 不存在的 uri）、MCP 工具返回 isError、add 工具 | 6 个 tool_result；服务器日志含 resources/list、resources/read、tools/call |
| mcp-prompt | MCP 提示词当斜杠命令 `/mcp__verify__greet Alice` | 请求里 `<command-name>` 三行 + 提示词展开；服务器收到 prompts/get(name=greet, arguments.name=Alice) |
| mcp-connect-fail | 一个服务器启动即退出（退出码 3）、一个命令不存在 | stream-json init 的 mcp_servers 两个都是 failed；无 mcp 工具；请求照常 |
| mcp-project-config | 项目 `.mcp.json` + `enableAllProjectMcpServers` | init 报 proj connected（source project）；mcp__proj__add(2,40) → "42" |

### 2.5 插件（夹具 `tools/verify/fixtures/verify-marketplace`，运行时复制到沙箱 tmp/）

| 场景 | 覆盖 | 判定 |
|---|---|---|
| plugin-dir-command | [垫片 win-hook-spawn] `--plugin-dir` + 插件命令 `/verify-plugin:hello Bob` + 插件 UserPromptSubmit 钩子 | 命令展开文字；钩子上下文进请求；`plugin-hook.log` 记 CLAUDE_PLUGIN_ROOT 指向插件目录 |
| plugin-dir-skill-hook | [垫片 win-hook-spawn] init 里的插件命令/技能/代理；Skill 调插件技能；插件 PreToolUse 钩子拦截 Write | slash_commands、agents、plugins 字段；技能正文；拦截文字 "This hook comes from the verify-plugin@inline plugin." |
| plugin-marketplace-lifecycle | [垫片 ant + win-hook-spawn] marketplace add（两次）→ list → install → list --json → disable → list → enable → 插件命令可用 → uninstall → list | 11 步的退出码与输出逐步核对；`~/.claude/plugins` 下文件清单比较 |
| plugin-disabled-command | [垫片 ant] 禁用的插件命令不可用 | 请求里是"命令不可用"的 system-reminder；插件钩子没运行 |
| plugin-validate | [垫片 ant] validate 插件 / 市场 / 坏 manifest | 输出与退出码（0、0、1） |

### 2.6 会话（`~/.claude/projects/<cwd 编码>/<id>.jsonl`）

| 场景 | 覆盖 | 判定 |
|---|---|---|
| session-resume-id | `-p --session-id <uuid>` 写入 → `-p --resume <uuid>` 读回 | 第二个请求带第一轮历史、新提示词在最后；只有一个会话文件；会话文件摘要（user/assistant 行序列 + 行类型集合）对拍 |
| session-continue | `-p` → `-p --continue` ×2 | 第三个请求含三轮提示词；一个会话文件 |
| session-fork | `--resume --fork-session --output-format json` | 新 session_id ≠ 原 id；带历史；两份会话文件 |
| session-errors | 空目录 --continue、非 uuid、重复 --session-id、--resume 不存在、`--no-session-persistence` 后 --resume | 7 步的退出码与错误文字；no-persistence 的会话没写文件 |
| session-resume-tools | 带 tool_use/tool_result 的会话恢复 | 恢复后的请求里 2 个 tool_use + 2 个 tool_result；init 的 session_id = 原 id |
| tty-continue / tty-resume-print-session / tty-continue-print-only | 交互模式的 --continue / --resume（见 2.7） | |

### 2.7 伪终端交互（[垫片 ant]；每步等具体文字出现再按键，比较 vt-screen 还原的快照）

| 场景 | 覆盖 | 判定 |
|---|---|---|
| tty-multi-turn | 两轮对话 | 第二个请求带第一轮；快照里两轮回答 |
| tty-permission-accept | 权限确认框（default 模式）→ 回车接受 | 确认框快照（文件预览、三个选项）；文件写入；tool_result 成功 |
| tty-permission-reject | 确认框 → Esc 拒绝 | "User rejected write to note.txt"；文件不存在；只有 1 个请求 |
| tty-esc-interrupt | 请求进行中按 Esc | 假上游 `finalDelayMs` 30 秒；中断后原文回到输入框，回答没上屏；1 个请求 |
| tty-help-dialog | /help 对话框、Tab 切页、Esc 关闭 | 三个快照；0 请求 |
| tty-slash-menu | `/` 命令建议、输入 mod 过滤 | 快照里 /model 在过滤结果中 |
| tty-input-edit | ←/→、Ctrl+A、Ctrl+E、Backspace 编辑输入框 | 请求里的提示词正好是 "hello world!" |
| tty-mode-cycle | Shift+Tab 循环 auto → manual → accept edits → plan → auto | 每个模式的状态行快照 |
| tty-unknown-command | 未知斜杠命令 | "Unknown command: /nosuchcmd"；0 请求 |
| tty-continue | 两次交互会话，第二次 `--continue` | 屏幕恢复上一轮；请求带历史 |
| tty-resume-print-session | `-p --session-id` 写的会话用交互 `--resume <id>` 打开 | 屏幕恢复 -p 那一轮；/exit 提示里是同一个 id |
| tty-continue-print-only | 只有 -p 会话时交互 `--continue` | "No conversation found to continue"，退出 1（-p --continue 能接上，交互不接，见第 4 节） |
| tty-bash-mode | [垫片 win-append] `!` bash 模式 | 屏幕 "⎿ tty-bang"；请求里 `<bash-input>`/`<bash-stdout>`；316 在 bash 模式后会自动发一次请求（共 2 个） |

## 3. 环境问题与对工具的改动

### 3.1 命令钩子在 Windows 上卡住：`win-hook-spawn-shim.js`（验证环境补丁）

现象：settings.json 里配 `PreToolUse` 等命令钩子后，`-p` 卡到 60 秒超时；钩子脚本只记下了启动，没收到 stdin。

排查：

1. `utils/hooks.js`（阅读树）的执行函数：`let detached = !isWindows;`、`let shell = isWindows ? <Git Bash> : true;`、`spawn(finalCommand, [], {env, cwd, shell, detached, windowsHide: true})`，然后 `child.stdin.write(json + "\n"); child.stdin.end()`。linux 构建里 `isWindows` 恒为假（平台固化，见 verify.md 第 13 节），所以在 Windows 上是 `shell: true, detached: true`。
2. 最小复现（`artifacts/tmp/scenarios/probe-stdin.js`，与 CLI 无关）：公版 Bun 1.4.4 在 Windows 上 `spawn('node -e "…读 stdin…"', [], {shell: true})` 能收到 stdin；加 `detached: true` 后子进程什么都收不到也不输出，直到超时。
3. 第二个问题：`shell: true` 在 Windows 上是 cmd.exe，插件钩子 `node "${CLAUDE_PLUGIN_ROOT}/hooks/x.cjs"` 里的变量不展开（CLI 把插件根放进环境变量，靠 shell 展开），报 "Cannot find module '…\work\${CLAUDE_PLUGIN_ROOT}\hooks\…'"。Windows 构建用 Git Bash，没有这个问题（`probe-shell.cjs` 证实 Bun + Git Bash 作 shell 时 stdin 与变量展开都正常）。

补丁：只在 win32 上、只对 `shell === true && detached` 的 `child_process.spawn` 改成 Windows 构建的参数（`detached: false`、`shell: CLAUDE_CODE_GIT_BASH_PATH`）。Bash 工具（不带 shell）、MCP stdio 服务器（不 detached）不受影响。`run.mjs` 增加 `--shim-win-hook-spawn` / `shimWinHookSpawn`。用到它的场景描述以 `[垫片]` 开头：hook-settings-events、plugin-dir-command、plugin-dir-skill-hook、plugin-marketplace-lifecycle。

### 3.2 vt-screen 宽字符判定（`vt-screen.mjs`）

Shift+Tab 切到 manual 模式后，还原出的状态行是 "⏸ munual mode on · ? for shortyuts"。原因：`WIDE` 用 `\p{Extended_Pictographic}`，把 ⏸（U+23F8）、⚠、✳、⏺、✔、▶、♥ 这类默认文本显示的字符算成 2 列；CLI（`Bun.stringWidth`）按 1 列排版，Ink 增量重绘用 `CSI n C` 跳过没变的格子，于是后面整行错一格。改成 `\p{Emoji_Presentation}`（😀 👍 ⚡ ✅ ⏳ 仍是 2 列，与 `Bun.stringWidth` 逐个核对过，`artifacts/tmp/scenarios/probe-width.js`）。旧场景里 `tty-session` 的屏幕有 ⚠ 和 emoji，改动后两轮对拍仍一致。

### 3.3 其他增强（都向后兼容，不写新字段时行为不变）

- `fake-upstream.mjs`：`script.side` 可以是函数 `(body) => 文本`（自动模式分类器按动作回 `<severity>`）；`script.routes: [{match, steps, final}]`（system 或第一条 user 消息含 match 时用另一组脚本，id 带 `r<k>_` 前缀，记录 `response.route`；用于子代理）；`step.delayMs` / `finalDelayMs`（延迟回答，连接先断开时取消；用于 Esc 中断）。
- `fake-mcp-server.mjs`：`--full` 加 resources / prompts 能力和总是失败的 `fail` 工具；`--exit-on-start` 启动即以 3 退出。不带选项时与第一轮完全相同。
- `run.mjs`：只加 `shimWinHookSpawn` 选项（命令行 `--shim-win-hook-spawn`），共 8 行增量。sequence 的每一步本来就可以带 `tty`。
- `pty-driver.js`：`waitFor` 可以是字符串数组（全部出现才算）；步骤可带 `delayMs`（先等再 waitFor，避免匹配到按键前的旧画面）。
- `compare.mjs`：sequence 里的伪终端步骤也只比较还原的屏幕（原来只处理顶层 tty）；新增归一化规则见 3.4。

### 3.4 新增归一化规则（以及为什么不会掩盖真实差异）

| 规则 | 内容 | 为什么需要 | 为什么不会掩盖真实差异 |
|---|---|---|---|
| agent-id | `a` + 16 位十六进制 → `<AGENT-ID-n>`，按首次出现编号 | 子代理 id 每次随机（Agent hand-back 的 agentId、子代理请求头 `x-claude-code-agent-id`） | 只认这一种精确形状（单词边界、恰好 17 字符）；编号保留"同一个子代理"关系，若两棵树一个复用 id、一个新建 id，编号会不同而报出差异 |
| plan-slug | `plans\<前缀>-<词>-<词>.md` 的两个随机词 → `<WORD>-<WORD>` | plan 模式的计划文件名随机（"plan-sunny-pebble.md"） | 只匹配 `plans` 目录下的文件名，前缀（plan / mode 等）保留，提醒的其余文字逐字比较 |
| duration（扩展） | 纯文本 `duration_ms: <n>` → `<N>` | 子代理 hand-back 的 `<usage>` 块是文本不是 JSON | 只替换这个键后面的数字，`subagent_tokens`、`tool_uses` 不归一 |
| tty-stream（扩展） | sequence 里的伪终端步骤也不比较原始字节流 | 与顶层伪终端场景同理（Ink 帧切分随时间变） | 照样比较还原出的屏幕、每个快照和 pty 摘要（退出码、每步是否等到文字） |

另外两处是**收集方式**而不是归一化：

- 会话文件（`collectSessions`）只比较 user/assistant 行的序列（角色、块类型、文本前 80 字、工具名）和行类型集合，不比较 `last-prompt`、`atis-latch`、`attachment`、`cost-state` 等元数据行的条数和先后——它们异步写入，实测两次运行的先后不同。文件按创建时间排序（不按随机 uuid 文件名排序，否则键顺序不稳定）。对话本身的顺序与内容仍逐行比较。
- 伪终端快照：状态行末尾的 "· ← for agents"（`AGENTS_HINT_TIMEOUT_MS` = 10 秒后过期）和输入框上方的 "◐ medium · /effort"（通知 `timeoutMs: 1e4`）会在启动 10 秒后消失；快照落在 10 秒前后哪一边取决于机器负载（第一次全量对 runnable 时 tty-multi-turn 因此重跑一次）。第三轮的伪终端场景在第一屏出现后先停 11 秒（`HINT_SETTLE_MS`）再操作，快照里都没有这两个提示；第二轮的 `tty-session` 仍在 10 秒内拍快照，提示本身照样被覆盖。没有用归一化去删屏幕文字。
- Ink 在提示符 `❯` 后画的是 NBSP，断言前换成普通空格（`screenText`），对拍不受影响（两边都是原样比较）。

## 4. 发现的 CLI 行为（316，Windows 上的 linux 构建 + 公版 Bun）

1. **路径类权限规则不生效**：deny `Read(./secret.txt)`、`Read(secret.txt)`、`Read(**/secret.txt)`、`Read(/D:/…/secret.txt)` 和 `--disallowedTools 'Read(./secret.txt)'` 都挡不住读 secret.txt（`artifacts/tmp/scenarios/drafts8.mjs` 逐个试过）；整个工具的 deny（`Read`、`Edit`）有效，Bash 内容规则（`Bash(echo denied:*)`）有效。规则匹配用 `relativePath()`：`getPlatform() === "windows"` 时先转 posix 再 `posix.relative`，linux 构建里平台恒为 linux，直接对 `D:\…` 做 `posix.relative`，算不出工作目录内的相对路径。同一原因：`acceptEdits` 下 Write 被当作"未授权"，Bash 重定向到工作目录内的文件报 "outside the working directories"。官方 Windows 构建不会这样；场景按现状断言并写明。
2. **`-p` 下只读 Bash 命令自动放行**：`--allowedTools "Bash(echo:*)"` 时 `pwd` 不需要规则也执行。
3. **auto 模式分类器**：每个 Bash 动作前发无工具的分类器请求，`<transcript>` 里是 JSONL 形式的会话投影；阈值默认 t1=15、t2=20，第一阶段 `<severity>` ≤ 15 直接放行，否则第二阶段（要求 `<thinking>`）。分类器回不出可解析结果时一律拦截（"Auto mode could not evaluate this action and is blocking it for safety"）。自定义 base URL 时 stderr 有"分类器计费"提示。
4. **Agent 工具默认后台运行**：不写 `run_in_background: false` 时，tool_result 是 "Async agent launched successfully"，子代理结束后再以 `<task-notification>` 系统提醒的形式回到主循环（-p 下会多一轮请求、stdout 打印两次最终文本）。场景用同步方式，结果确定。
5. **交互模式的 `--continue` 不接 `-p` 写的会话**（"No conversation found to continue"），`-p --continue` 能接；交互 `--resume <id>` 能打开 `-p` 写的会话。
6. **bash 模式（`!`）执行后会自动发一次模型请求**，把 `<bash-input>`、`<bash-stdout>`、`<bash-stderr>` 作为 user 消息。
7. **`plugin marketplace add` 的本地路径要以 `./` 或 `../` 开头**（绝对 Windows 路径报 "Invalid marketplace source format"）；安装把插件复制到 `~/.claude/plugins/cache/<市场>/<插件>/<版本>`，卸载后留下 `.orphaned_at`。
8. **会话文件**：一轮 `-p` 写约 25 行，除 user/assistant 外有 queue-operation、attachment、atis-latch、api-request-shape、api-request-blob、api-request、last-prompt、cost-state、mode 等；`--no-session-persistence` 不写文件；同一 `--session-id` 再用报 "already in use"。
9. MCP：`ReadMcpResourceTool` 读不存在的 uri 时 tool_result 不是 is_error，而是一段提示（"Resource not found: … Re-run ListMcpResourcesTool to refresh."）；启动失败的服务器在 init 里是 `failed`，不影响主请求。

## 5. 结果

| 报告 | 内容 | 结果 |
|---|---|---|
| `analysis/verify/scenarios-oo-run1.*` | original 对 original，98 个，3 路，`--retry 0` | 98/98 一致，预期 98/98，274 s |
| `analysis/verify/scenarios-oo-run2.*` | original 对 original，98 个，4 路，`--retry 0` | 98/98 一致，预期 98/98，254 s |
| `analysis/verify/scenarios-original-vs-runnable.*` | original 对 runnable，98 个，3 路，`--retry 1` | 98/98 一致，预期 98/98，0 flaky，308 s |
| `analysis/verify/scenarios-negative-control.*` | original 对改了三处文字的副本（副本已删） | 3 个改到的场景报差异、1 个没改到的一致 |

两轮稳定性的归一化命中（run1）：path:cwd 753、uuid 470、duration 279、path:home 195、port 163、header:content-length 158、hex64 158、date 154、path:tmp 61、iso-ts 38、path:tree 19、tty-turn-line 18、plan-slug 5、path:sandbox 5、agent-id 4、path:project 4、cch 1、path:bun 1；parallel-tool-results run1 1 次、run2 2 次（原有的 print-tools 系列）。

最慢的新场景：plugin-marketplace-lifecycle（11 步，约 35 s）、tty-continue（两次交互会话，约 32 s）；伪终端场景因为 11 秒提示等待，每个 20–30 s。全量 98 个 3 路约 4.5 分钟。

## 6. 过程与坑

1. 先用 `artifacts/tmp/scenarios/try.mjs`（单棵树跑草稿、打印每个请求的最后一条 user 消息、屏幕和快照）在 original 上摸清实际行为，再写进场景表。草稿在 `artifacts/tmp/scenarios/drafts*.mjs`。
2. 316 默认没有 Glob/Grep/TodoWrite（verify.md 7.3 已记）——改成测"调用不存在的工具"的错误路径。
3. 钩子卡住、插件钩子找不到脚本 → 3.1。
4. Shift+Tab 快照文字错位、`waitFor` 找不到 "manual mode on" → 3.2。
5. 第一次 original 对 original（新场景）有 7 个不一致：agentId、计划文件名、会话文件元数据行顺序、随机 uuid 文件名排序、sequence 里伪终端步骤比较了原始字节流、子代理 `duration_ms` 文本 → 3.4 的规则与收集方式。
6. 第一次全量对 runnable 时 tty-multi-turn 重跑后才一致：快照里 "· ← for agents" 和 effort 行有时还在、有时已消失 → 查到两个 10 秒定时器，改成先等提示过期（3.4）。之后三次全量都没有重跑。
7. Esc 中断：等 "esc to interrupt" 出现时请求可能还没到假上游，Esc 会被当成别的操作；改成回车后固定等 3 秒（请求一定已发出、回答被延迟 30 秒）再按 Esc。
8. 停顿后拍快照要给 `idleMs` 或改用 `waitFor` 具体文字，否则会拍到重绘中途。

## 7. 遗留

- 路径类权限规则、acceptEdits、"工作目录外"判断在 Windows 上的偏差是 linux 构建在 Windows 上运行造成的，只能在 linux 上用官方 ELF 验证真实行为（verify.md 第 11 节已有的 linux 对拍计划）。
- 三个垫片（Ink CellSegmenter、O_APPEND、钩子 spawn）都是验证环境补丁；带 `[垫片]` 的场景证明的是"两棵树一致"，不是与官方二进制一致。
- 没覆盖：远程 MCP（http/sse 传输）、OAuth、插件的 MCP/LSP 组件、`/compact`、`/model` 切换后的请求、图片粘贴、子代理后台运行 + 通知（行为已记，但两轮之间会多一次 task-notification 请求，没做成场景）、Ctrl+C 退出（ConPTY 下 Ctrl+C 在请求中途的行为不稳定，探索记录在 `artifacts/tmp/scenarios/drafts6.mjs`）。
- buildable 成员若要用这些场景跑构建产物：`runScenario(tree, s)` 的 `tree` 是含 `cli.js` 的目录即可；插件夹具路径从 `ctx.projectRoot` 取，不依赖被测树。
