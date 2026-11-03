# 对拍：original vs runnable

- 时间：2026-11-03T11:01:51.639Z，耗时 94 s
- 运行时：bun 1.4.4+38afee6c8，node v24.20.0，win32-x64
- 场景：54；归一化后一致：54；预期满足：基线 54，候选 54
- 重跑后才一致（不稳定）的场景：无
- 不归一化就会不一致的场景：23（doctor, mcp-add, print-hi, print-hi-first-party, print-json, print-stream-json, print-stdin, print-stream-json-input, print-model-alias, print-system-prompt, print-bare, print-api-error, print-tools, print-tools-stream-json, print-max-turns, print-permission-denied, print-mcp, ink-mcp-lifecycle, ink-auth-status, ink-auth-status-text, tty-session, print-bash-stdout, print-bash-stdout-unshimmed）
- 归一化规则命中次数：path:bun=1，path:tree=7，path:cwd=164，path:home=46，uuid=128，port=40，header:content-length=38，date=37，duration=67，hex64=38，cch=1，iso-ts=16，parallel-tool-results=3，path:project=3，path:tmp=2，tty-turn-line=1

| 场景 | 一致 | 基线预期 | 候选预期 | 退出码 | API 请求 | 外网请求 | 耗时 ms |
|---|---|---|---|---|---|---|---|
| version | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 3025/2336 |
| version-verbose | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 1449/793 |
| help | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 5400/4746 |
| help-mcp | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 2661/2032 |
| help-mcp-add | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 5583/4941 |
| help-mcp-list | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 2720/2048 |
| help-plugin | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 4286/3655 |
| help-plugin-marketplace | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 5514/4885 |
| help-plugin-install | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 2703/1986 |
| help-auth | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 5354/4749 |
| help-agents | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 2649/1969 |
| help-auto-mode | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 5381/4752 |
| help-doctor | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 2643/2014 |
| help-update | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 4030/3363 |
| help-install | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 5476/4842 |
| help-setup-token | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 2752/2095 |
| help-import | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 5563/4928 |
| help-ultrareview | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 2724/2063 |
| help-gateway | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 5529/4861 |
| help-purge | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 2715/2080 |
| invalid-option | 是 | 满足 | 满足 | 1/1 | 0/0 | 0/0 | 4116/3461 |
| doctor | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 5518/4847 |
| plugin-list-json | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 2718/2038 |
| agents-json | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 4703/4072 |
| update-offline | 是 | 满足 | 满足 | 1/1 | 0/0 | 0/0 | 2197/4042 |
| mcp-add | 是 | 满足 | 满足 | 1/1 | 0/0 | 0/0 | 13573/12912 |
| mcp-list-ink-limit | 是 | 满足 | 满足 | 1/1 | 0/0 | 0/0 | 3309/2715 |
| print-hi | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 5203/4590 |
| print-hi-first-party | 是 | 满足 | 满足 | 0/0 | 1/1 | 12/12 | 24789/24070 |
| print-json | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 3565/4081 |
| print-stream-json | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 2462/2973 |
| print-stdin | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 3287/3799 |
| print-stream-json-input | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 3676/3017 |
| print-model-alias | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 2499/3063 |
| print-system-prompt | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 2659/3219 |
| print-bare | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 2452/3006 |
| print-api-error | 是 | 满足 | 满足 | 1/1 | 6/6 | 0/0 | 2418/3087 |
| print-tools | 是 | 满足 | 满足 | 0/0 | 6/6 | 0/0 | 3525/4169 |
| print-tools-stream-json | 是 | 满足 | 满足 | 0/0 | 6/6 | 0/0 | 5658/6277 |
| print-max-turns | 是 | 满足 | 满足 | 1/1 | 1/1 | 0/0 | 4564/5136 |
| print-permission-denied | 是 | 满足 | 满足 | 0/0 | 2/2 | 0/0 | 5116/4379 |
| print-mcp | 是 | 满足 | 满足 | 0/0 | 3/3 | 0/0 | 8904/9390 |
| ink-mcp-list-empty | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 3249/2421 |
| ink-mcp-lifecycle | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 18797/14844 |
| ink-plugin-list | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 2082/2550 |
| ink-plugin-marketplace-list | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 3812/3144 |
| ink-auth-status | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 4335/3717 |
| ink-auth-status-text | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 5209/4565 |
| ink-auto-mode-defaults | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 4738/5208 |
| ink-auto-mode-config | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 3914/4414 |
| tty-first-run | 是 | 满足 | 满足 | 1/1 | 0/0 | 2/2 | 3526/4095 |
| tty-session | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 7342/7855 |
| print-bash-stdout | 是 | 满足 | 满足 | 0/0 | 2/2 | 0/0 | 3267/3814 |
| print-bash-stdout-unshimmed | 是 | 满足 | 满足 | 0/0 | 2/2 | 0/0 | 4512/3820 |

## 场景说明

- **version**：--version 走 cli.js 快速路径：打印 "2.1.316 (Claude Code)"，退出 0，无网络请求。
- **version-verbose**：--version --verbose：多打印一行 "Commit: <git sha>"（cd7ceb45…）。
- **help**：--help：commander 生成的总帮助，含选项与子命令表，退出 0。
- **help-mcp**：mcp --help：子命令帮助，退出 0，不发请求。
- **help-mcp-add**：mcp add --help：子命令帮助，退出 0，不发请求。
- **help-mcp-list**：mcp list --help：子命令帮助，退出 0，不发请求。
- **help-plugin**：plugin --help：子命令帮助，退出 0，不发请求。
- **help-plugin-marketplace**：plugin marketplace --help：子命令帮助，退出 0，不发请求。
- **help-plugin-install**：plugin install --help：子命令帮助，退出 0，不发请求。
- **help-auth**：auth --help：子命令帮助，退出 0，不发请求。
- **help-agents**：agents --help：子命令帮助，退出 0，不发请求。
- **help-auto-mode**：auto-mode --help：子命令帮助，退出 0，不发请求。
- **help-doctor**：doctor --help：子命令帮助，退出 0，不发请求。
- **help-update**：update --help：子命令帮助，退出 0，不发请求。
- **help-install**：install --help：子命令帮助，退出 0，不发请求。
- **help-setup-token**：setup-token --help：子命令帮助，退出 0，不发请求。
- **help-import**：import --help：子命令帮助，退出 0，不发请求。
- **help-ultrareview**：ultrareview --help：子命令帮助，退出 0，不发请求。
- **help-gateway**：gateway --help：子命令帮助，退出 0，不发请求。
- **help-purge**：purge --help：子命令帮助，退出 0，不发请求。
- **invalid-option**：未知选项：commander 报 "error: unknown option"，退出 1。
- **doctor**：claude doctor（非交互版）：打印安装与连接诊断文本，退出 0；自定义 base URL 下不取远程设置、不发请求。
- **plugin-list-json**：plugin list --json：空配置打印 []，退出 0。
- **agents-json**：agents --json：没有后台会话，打印 []，退出 0。
- **update-offline**：update：CLI 调 npm view @anthropic-ai/claude-code@latest version --prefer-online 查最新版本；沙箱里的 npm 是立即失败的假 npm（run.mjs fakeNpm），打印 "Failed to check for updates / Unable to fetch latest version from npm registry"，退出 1，无网络请求。（旧版用真实 npm 时不稳定，见 verify.md 第 14 节。）
- **mcp-add**：mcp add 系列（不走 Ink，可在公版 Bun 上跑）：add stdio（local 作用域，写 ~/.claude.json）→ 同名再 add 报已存在（退出 1）→ add --transport http → add -s project（写 ./.mcp.json）→ remove 不存在的名字（退出 1，列出已配置的 demo, proj, web）。mcp remove 成功路径要 Ink，不在此列。
- **mcp-list-ink-limit**：已知限制：mcp list 用 Ink 渲染，需要 Anthropic 自用 Bun 的 Bun.ant.CellSegmenter；公版 Bun 1.4.4 上静默退出 1、无输出。用来确认两棵树失败方式相同。
- **print-hi**：-p hi：自定义 base URL（第三方形状）发 1 个 POST /v1/messages?beta=true（SSE），stdout 是假上游文本，退出 0，无外网。
- **print-hi-first-party**：-p hi + _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1：按第一方形状发送（多出 x-claude-code-prompt-id / request-class / x-client-request-id 头、计费头带 cch=00000 等、body 多 diagnostics）；另外直接连 api.anthropic.com 取 policy_limits 与远程托管设置，被黑洞代理拒绝（各 6 次，含 5 次退避重试，约 20 秒）。
- **print-json**：-p --output-format json：stdout 是一个 result 对象（type=result, subtype=success, result=假上游文本, usage, total_cost_usd…）。
- **print-stream-json**：-p --output-format stream-json --verbose：逐行 JSON 事件（system/init → assistant → result）。
- **print-stdin**：-p 不带提示词，从 stdin 读提示词。
- **print-stream-json-input**：--input-format stream-json：stdin 一行 user 消息 JSON，输出 stream-json。
- **print-model-alias**：--model sonnet：别名解析成具体模型 id 写进请求的 model 字段。
- **print-system-prompt**：--system-prompt / --append-system-prompt：自定义系统提示词出现在请求 system 里。
- **print-bare**：--bare：最小模式（跳过 hooks/LSP/插件同步/CLAUDE.md 等），请求仍发出。
- **print-api-error**：假上游对 /v1/messages 一律回 400 invalid_request_error：CLI 不做普通重试（retry-count 始终 0），而是逐级降级重发——去掉 thinking-token-count beta → 去掉 thinking.display → 关掉工具搜索（advanced-tool-use beta 去掉，延迟工具全部内联，12→21 个工具）后再重复前两级，共 6 个请求；最后打印 "API Error: 400 verify: forced error" 到 stdout，退出 1。
- **print-tools**：-p + 工具往返：Bash（echo 重定向到文件）→ Write → Read → Edit → 并行两个 Read → 最终文本；6 个请求，每个 tool_result 回传到下一请求，工作目录最终 note.txt = "alpha\ngamma\n"。
- **print-tools-stream-json**：同 print-tools，但输出 stream-json，记录 tool_use / tool_result 事件形状。
- **print-max-turns**：--max-turns 1 且模型要求调用工具：执行 1 轮后停止，result subtype=error_max_turns，退出 1。
- **print-permission-denied**：没有 --allowedTools 时 -p 模式下 Write 被拒（不弹框），tool_result 为错误，文件不存在，最终仍输出文本。
- **print-mcp**：离线 MCP：--strict-mcp-config --mcp-config 启动本地 stdio 服务器（fake-mcp-server.mjs）。CLI 先发 server/discover 探测（2026-07-28 草案），被拒后 initialize(2025-11-25)→initialized→tools/list；MCP 工具默认延迟加载，假模型先 ToolSearch select 再调用 mcp__verify__echo，tool_result = "echo: ping"。
- **ink-mcp-list-empty**：[垫片] mcp list（Ink 渲染）：空配置打印 "No MCP servers configured. Use `claude mcp add` to add a server."，退出 0。
- **ink-mcp-lifecycle**：[垫片] MCP 全流程（Ink）：add-json 非法配置报错（退出 1）→ add-json 本地 stdio 服务器（fake-mcp-server.mjs）→ mcp list 做健康检查显示 "√ Connected" → mcp get 显示作用域/状态/命令 → mcp remove 成功 → mcp list 回到空。
- **ink-plugin-list**：[垫片] plugin list（Ink）："No plugins installed. …"，退出 0。
- **ink-plugin-marketplace-list**：[垫片] plugin marketplace list（Ink）：只有内置的 anthropic-plugin-directory。
- **ink-auth-status**：[垫片] auth status（Ink，默认 JSON）：loggedIn=true、authMethod=api_key、apiKeySource=ANTHROPIC_API_KEY；目录指向沙箱。
- **ink-auth-status-text**：[垫片] auth status --text：API key 来源、自定义 base URL、代理三行。
- **ink-auto-mode-defaults**：[垫片] auto-mode defaults（Ink）：打印默认 allow / soft_deny 等规则 JSON。
- **ink-auto-mode-config**：[垫片] auto-mode config（Ink）：没有用户设置时等于默认规则的 JSON。
- **tty-first-run**：[垫片+伪终端] 全新配置、交互模式启动：欢迎画面（"Welcome to Claude Code v2.1.316" + 字符画）后做首次联网检查，直连 api.anthropic.com / platform.claude.com 被黑洞代理拒绝，显示 "Unable to connect to Anthropic services … ERR_PROXY_TUNNEL"，退出 1。比较的是 vt-screen.mjs 还原的最终屏幕。
- **tty-session**：[垫片+伪终端] 预置"已完成引导、已批准假 key、已信任工作目录"的配置，交互模式：等到输入框 → 输入 hi 回车 → 假上游回答含中文、emoji、全角字符的文本 → 屏幕上出现回答 → 输入 /exit 回车，打印 "Resume this session with: claude --resume <id>"，退出 0。比较两个时刻的屏幕快照（空闲输入框、回答之后）、最终屏幕和请求体。
- **print-bash-stdout**：[垫片] Bash 工具直接输出到 stdout/stderr（echo hi; echo err >&2; $((6*7))）：tool_result = "hi\nerr\n42\nShell cwd was reset to <CWD>"。不加 win-append-shim 时在 Windows 上是 "Exit code 1"（原因见 verify.md 第 13 节）。
- **print-bash-stdout-unshimmed**：对照：同一 Bash 命令不加垫片，tool_result 为 "Exit code 1"（is_error）。确认两棵树的失败方式相同；哪天变成成功，说明运行环境或 CLI 行为变了。
