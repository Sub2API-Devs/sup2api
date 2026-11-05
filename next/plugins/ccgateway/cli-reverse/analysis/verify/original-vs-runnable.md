# 对拍：original vs runnable

- 时间：2026-11-05T19:03:53.508Z，耗时 339 s
- 运行时：bun 1.4.4+38afee6c8，node v24.20.0，win32-x64
- 场景：98；归一化后一致：98；预期满足：基线 98，候选 98
- 重跑后才一致（不稳定）的场景：无
- 不归一化就会不一致的场景：67（doctor, mcp-add, print-hi, print-hi-first-party, print-json, print-stream-json, print-stdin, print-stream-json-input, print-model-alias, print-system-prompt, print-bare, print-api-error, print-tools, print-tools-stream-json, print-max-turns, print-permission-denied, print-mcp, ink-mcp-lifecycle, ink-auth-status, ink-auth-status-text, tty-session, print-bash-stdout, print-bash-stdout-unshimmed, tool-read-errors, tool-edit-errors, tool-unavailable, tool-bash-errors, tool-notebook, tool-skill-claudemd, tool-agent-sync, perm-mode-plan, perm-mode-accept-edits, perm-mode-bypass, perm-mode-dont-ask, perm-mode-auto, perm-allowed-pattern, perm-settings-rules, perm-settings-untrusted, perm-settings-default-mode, hook-settings-events, mcp-resources, mcp-prompt, mcp-connect-fail, mcp-project-config, plugin-dir-command, plugin-dir-skill-hook, plugin-marketplace-lifecycle, plugin-disabled-command, plugin-validate, session-resume-id, session-continue, session-fork, session-errors, session-resume-tools, tty-multi-turn, tty-permission-accept, tty-permission-reject, tty-esc-interrupt, tty-help-dialog, tty-slash-menu, tty-input-edit, tty-mode-cycle, tty-unknown-command, tty-continue, tty-resume-print-session, tty-continue-print-only, tty-bash-mode）
- 归一化规则命中次数：path:bun=1，path:tree=28，path:cwd=753，path:home=195，uuid=470，port=163，header:content-length=158，date=154，duration=279，hex64=158，cch=1，iso-ts=38，parallel-tool-results=3，path:project=4，path:tmp=61，tty-turn-line=18，path:sandbox=5，agent-id=4，plan-slug=5

| 场景 | 一致 | 基线预期 | 候选预期 | 退出码 | API 请求 | 外网请求 | 耗时 ms |
|---|---|---|---|---|---|---|---|
| version | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 7837/6735 |
| version-verbose | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 2885/1751 |
| help | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 8753/7565 |
| help-mcp | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 3652/8150 |
| help-mcp-add | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 5053/3862 |
| help-mcp-list | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 7271/5892 |
| help-plugin | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 3120/2032 |
| help-plugin-marketplace | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 7293/6300 |
| help-plugin-install | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 4221/7981 |
| help-auth | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 4066/3013 |
| help-agents | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 7452/6518 |
| help-auto-mode | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 2937/1809 |
| help-doctor | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 6855/5959 |
| help-update | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 2836/6606 |
| help-install | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 3929/3013 |
| help-setup-token | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 7572/6694 |
| help-import | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 3789/1929 |
| help-ultrareview | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 6774/5866 |
| help-gateway | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 2687/6169 |
| help-purge | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 3647/2775 |
| invalid-option | 是 | 满足 | 满足 | 1/1 | 0/0 | 0/0 | 4321/3493 |
| doctor | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 6210/5354 |
| plugin-list-json | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 3254/2312 |
| agents-json | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 5640/4803 |
| update-offline | 是 | 满足 | 满足 | 1/1 | 0/0 | 0/0 | 2795/4414 |
| mcp-add | 是 | 满足 | 满足 | 1/1 | 0/0 | 0/0 | 14599/14753 |
| mcp-list-ink-limit | 是 | 满足 | 满足 | 1/1 | 0/0 | 0/0 | 3769/2942 |
| print-hi | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 5152/5340 |
| print-hi-first-party | 是 | 满足 | 满足 | 0/0 | 1/1 | 12/12 | 25688/24420 |
| print-json | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 3827/4075 |
| print-stream-json | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 2829/3157 |
| print-stdin | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 3867/4014 |
| print-stream-json-input | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 3608/3707 |
| print-model-alias | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 2820/3183 |
| print-system-prompt | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 2936/3212 |
| print-bare | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 3010/3216 |
| print-api-error | 是 | 满足 | 满足 | 1/1 | 6/6 | 0/0 | 3154/3435 |
| print-tools | 是 | 满足 | 满足 | 0/0 | 6/6 | 0/0 | 5988/5106 |
| print-tools-stream-json | 是 | 满足 | 满足 | 0/0 | 6/6 | 0/0 | 5315/5457 |
| print-max-turns | 是 | 满足 | 满足 | 1/1 | 1/1 | 0/0 | 4652/6775 |
| print-permission-denied | 是 | 满足 | 满足 | 0/0 | 2/2 | 0/0 | 4189/3319 |
| print-mcp | 是 | 满足 | 满足 | 0/0 | 3/3 | 0/0 | 8502/7708 |
| ink-mcp-list-empty | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 2073/2366 |
| ink-mcp-lifecycle | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 18400/23413 |
| ink-plugin-list | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 2204/6144 |
| ink-plugin-marketplace-list | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 6406/4616 |
| ink-auth-status | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 5649/4763 |
| ink-auth-status-text | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 5202/4236 |
| ink-auto-mode-defaults | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 5565/4661 |
| ink-auto-mode-config | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 4482/4711 |
| tty-first-run | 是 | 满足 | 满足 | 1/1 | 0/0 | 2/2 | 5460/4488 |
| tty-session | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 10417/10679 |
| print-bash-stdout | 是 | 满足 | 满足 | 0/0 | 2/2 | 0/0 | 4550/4927 |
| print-bash-stdout-unshimmed | 是 | 满足 | 满足 | 0/0 | 2/2 | 0/0 | 4705/5177 |
| tool-read-errors | 是 | 满足 | 满足 | 0/0 | 6/6 | 0/0 | 6227/6449 |
| tool-edit-errors | 是 | 满足 | 满足 | 0/0 | 9/9 | 0/0 | 8359/8792 |
| tool-unavailable | 是 | 满足 | 满足 | 0/0 | 2/2 | 0/0 | 4215/4340 |
| tool-bash-errors | 是 | 满足 | 满足 | 0/0 | 6/6 | 0/0 | 9183/8140 |
| tool-notebook | 是 | 满足 | 满足 | 0/0 | 6/6 | 0/0 | 4666/3668 |
| tool-skill-claudemd | 是 | 满足 | 满足 | 0/0 | 3/3 | 0/0 | 6449/5460 |
| tool-agent-sync | 是 | 满足 | 满足 | 0/0 | 4/4 | 0/0 | 5373/6036 |
| perm-mode-plan | 是 | 满足 | 满足 | 0/0 | 3/3 | 0/0 | 3853/5256 |
| perm-mode-accept-edits | 是 | 满足 | 满足 | 0/0 | 3/3 | 0/0 | 5074/5320 |
| perm-mode-bypass | 是 | 满足 | 满足 | 0/0 | 3/3 | 0/0 | 5222/5433 |
| perm-mode-dont-ask | 是 | 满足 | 满足 | 0/0 | 3/3 | 0/0 | 3233/5349 |
| perm-mode-auto | 是 | 满足 | 满足 | 0/0 | 6/6 | 0/0 | 8234/7195 |
| perm-allowed-pattern | 是 | 满足 | 满足 | 0/0 | 5/5 | 0/0 | 8138/8361 |
| perm-settings-rules | 是 | 满足 | 满足 | 0/0 | 5/5 | 0/0 | 9094/8206 |
| perm-settings-untrusted | 是 | 满足 | 满足 | 0/0 | 5/5 | 0/0 | 5569/5772 |
| perm-settings-default-mode | 是 | 满足 | 满足 | 0/0 | 2/2 | 0/0 | 2910/5094 |
| hook-settings-events | 是 | 满足 | 满足 | 0/0 | 3/3 | 0/0 | 6058/6275 |
| mcp-resources | 是 | 满足 | 满足 | 0/0 | 7/7 | 0/0 | 7092/7940 |
| mcp-prompt | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 4524/3667 |
| mcp-connect-fail | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 3516/7181 |
| mcp-project-config | 是 | 满足 | 满足 | 0/0 | 3/3 | 0/0 | 8207/7231 |
| plugin-dir-command | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 6072/4944 |
| plugin-dir-skill-hook | 是 | 满足 | 满足 | 0/0 | 3/3 | 0/0 | 7837/10349 |
| plugin-marketplace-lifecycle | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 37277/35751 |
| plugin-disabled-command | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 13426/17550 |
| plugin-validate | 是 | 满足 | 满足 | 1/1 | 0/0 | 0/0 | 9448/8547 |
| session-resume-id | 是 | 满足 | 满足 | 0/0 | 2/2 | 0/0 | 9619/8770 |
| session-continue | 是 | 满足 | 满足 | 0/0 | 3/3 | 0/0 | 14211/11481 |
| session-fork | 是 | 满足 | 满足 | 0/0 | 2/2 | 0/0 | 8764/10227 |
| session-errors | 是 | 满足 | 满足 | 1/1 | 3/3 | 0/0 | 23392/23814 |
| session-resume-tools | 是 | 满足 | 满足 | 0/0 | 4/4 | 0/0 | 8406/8754 |
| tty-multi-turn | 是 | 满足 | 满足 | 0/0 | 2/2 | 0/0 | 26506/25032 |
| tty-permission-accept | 是 | 满足 | 满足 | 0/0 | 2/2 | 0/0 | 23456/23339 |
| tty-permission-reject | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 23142/23233 |
| tty-esc-interrupt | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 24489/23673 |
| tty-help-dialog | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 25695/24930 |
| tty-slash-menu | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 21169/21507 |
| tty-input-edit | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 27071/27327 |
| tty-mode-cycle | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 23446/24370 |
| tty-unknown-command | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 22284/21359 |
| tty-continue | 是 | 满足 | 满足 | 0/0 | 2/2 | 0/0 | 36839/37604 |
| tty-resume-print-session | 是 | 满足 | 满足 | 0/0 | 2/2 | 0/0 | 26031/27665 |
| tty-continue-print-only | 是 | 满足 | 满足 | 1/1 | 1/1 | 0/0 | 7111/7065 |
| tty-bash-mode | 是 | 满足 | 满足 | 0/0 | 2/2 | 0/0 | 25397/25722 |

## 场景说明

- **version**：--version 走 cli.js 快速路径：打印 "2.1.318 (Claude Code)"，退出 0，无网络请求。
- **version-verbose**：--version --verbose：多打印一行 "Commit: <git sha>"（ca1fa9de…）。
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
- **tty-first-run**：[垫片+伪终端] 全新配置、交互模式启动：欢迎画面（"Welcome to Claude Code v2.1.318" + 字符画）后做首次联网检查，直连 api.anthropic.com / platform.claude.com 被黑洞代理拒绝，显示 "Unable to connect to Anthropic services … ERR_PROXY_TUNNEL"，退出 1。比较的是 vt-screen.mjs 还原的最终屏幕。
- **tty-session**：[垫片+伪终端] 预置"已完成引导、已批准假 key、已信任工作目录"的配置，交互模式：等到输入框 → 输入 hi 回车 → 假上游回答含中文、emoji、全角字符的文本 → 屏幕上出现回答 → 输入 /exit 回车，打印 "Resume this session with: claude --resume <id>"，退出 0。比较两个时刻的屏幕快照（空闲输入框、回答之后）、最终屏幕和请求体。
- **print-bash-stdout**：[垫片] Bash 工具直接输出到 stdout/stderr（echo hi; echo err >&2; $((6*7))）：tool_result = "hi\nerr\n42\nShell cwd was reset to <CWD>"。不加 win-append-shim 时在 Windows 上是 "Exit code 1"（原因见 verify.md 第 13 节）。
- **print-bash-stdout-unshimmed**：对照：同一 Bash 命令不加垫片，tool_result 为 "Exit code 1"（is_error）。确认两棵树的失败方式相同；哪天变成成功，说明运行环境或 CLI 行为变了。
- **tool-read-errors**：Read 的成功与错误路径：不存在的文件 → "File does not exist. Note: your current working directory is <CWD>."（is_error）；目录 → EISDIR（is_error）；缺 file_path → InputValidationError（is_error）；offset=2/limit=1 → "2\ttwo"（只回第 2 行，带行号）；完整读取 → 带行号的全文。
- **tool-edit-errors**：Edit/Write 的前置条件与错误路径：没 Read 就 Edit、没 Read 就覆盖已有文件 → "File has not been read yet. Read it first before writing to it."；Read 后 old_string 不存在 → "String to replace not found in file."；多处匹配且 replace_all=false → "Found 2 matches …"；replace_all=true → 全部替换；Write 新建嵌套目录 deep/a/b.txt 再 Edit 它。检查每个 tool_result 和最终文件内容。
- **tool-unavailable**：官方构建默认没有的工具：一次回答里并行调用 Glob、Grep、TodoWrite → 三个 tool_result 都是 "<tool_use_error>Error: No such tool available: …"，并带各自的提示（Glob/Grep 提示改用 Bash 的 find/grep，TodoWrite 说本会话禁用）；之后模型照常收尾。
- **tool-bash-errors**：[垫片] Bash 的退出码与输出：exit 3 → "Exit code 3"（is_error）；echo partial; exit 4 → 内容含 "partial" 与 "Exit code 4"；cd 到不存在的目录 → 错误并带 bash 的报错；pwd → <CWD> 的 POSIX 形式；不在 PATH 上的外部命令（Git 的 usr/bin 不在沙箱 PATH 里）→ "Exit code 127"。只用 bash 内置命令，不依赖外部程序。
- **tool-notebook**：延迟工具 + NotebookEdit：ToolSearch 关键词 "notebook jupyter" 命中 NotebookEdit（tool_reference）；select:NoSuchTool → "No matching deferred tools found"；Read .ipynb → <cell id=…> 形式；NotebookEdit replace c1 → "Updated cell c1 with print(2)"；delete c2；最终 nb.ipynb 只剩改过的 c1。
- **tool-skill-claudemd**：项目 CLAUDE.md 与项目技能：第一条 user 消息里有 "Contents of <CWD>\CLAUDE.md (project instructions…)" 的 system-reminder；Skill 工具调用 .claude/skills/verify-skill → tool_result "Launching skill: verify-skill"，紧跟一个文本块 "Base directory for this skill: …" + 技能正文；未知技能 → 错误。
- **tool-agent-sync**：自定义代理（--agents JSON）+ Agent 工具同步运行（run_in_background=false）：假上游按系统提示词里的 VERIFY-AGENT-PROMPT 把子代理请求路由到另一组脚本（routes）；子代理只有 Read 一个工具，读 sub.txt 后回报告；主循环的 tool_result 是 "[Subagent hand-back] …" + 报告 + agentId + usage。请求顺序：主 → 子 → 子 → 主。
- **perm-mode-plan**：--permission-mode plan：Read 照常执行；Write → "Cannot write to <CWD>\w.txt while in plan mode."（is_error），文件不存在。
- **perm-mode-accept-edits**：--permission-mode acceptEdits：Write 仍被拒（"Claude requested permissions to write to …, but you haven't granted it yet."）。原因是 linux 构建在 Windows 上判断 D:\ 路径不在工作目录内（同一现象：Bash 重定向报 "outside the working directories"），见 scenarios.md 第 4 节；两棵树行为相同即可。
- **perm-mode-bypass**：--permission-mode bypassPermissions：Write 与 Bash（echo 重定向）都直接执行，文件内容核对；不弹框、不调用分类器。
- **perm-mode-dont-ask**：--permission-mode dontAsk：没有预先允许的工具一律拒绝且不询问：Write 新文件、Bash 都是 "Permission to use … has been denied because Claude Code is running in don't ask mode."。
- **perm-mode-auto**：--permission-mode auto（自动模式分类器）：每个 Bash 调用前 CLI 发无工具的分类器请求（<transcript> + 两阶段 <severity>）；假上游的 side 函数对 ok.txt 回 <severity>0</severity>（第一阶段放行），对 blocked.txt 回 90（两阶段都拦）→ tool_result 是自动模式拦截说明，blocked.txt 不存在。stderr 有"分类器计费"提示（自定义 base URL）。
- **perm-allowed-pattern**：[垫片] --allowedTools "Bash(echo:*)" + --disallowedTools Write：echo ok 执行（tool_result "ok"）；pwd 是只读命令，不需要规则也自动放行；mkdir 不在允许模式里 → 拒绝（-p 下不询问）；Write 被从工具表删掉（11 个工具），调用它 → "No such tool available: Write. Write is disabled for this session…"。
- **perm-settings-rules**：项目 .claude/settings.json 的 permissions（已信任工作目录）：allow [Write, Read]、deny [Read(./secret.txt), Bash(echo denied:*), Edit]：deny 整个 Edit → Edit 从工具表删掉；Bash "echo denied now" 命中内容规则 → "Permission to use Bash with command echo denied now has been denied."；读 open.txt、Write 新文件成功。已知偏差：路径规则 Read(./secret.txt) 不生效，secret.txt 照样读出——linux 构建在 Windows 上 getPlatform() 恒为 linux，规则匹配用 posix.relative 算 D:\ 路径，得不到工作目录内的相对路径（scenarios.md 第 4 节）；两棵树行为相同即可，这一处断言写的是现状。
- **perm-settings-untrusted**：同 perm-settings-rules 的 allow/deny，但工作目录未信任：stderr 打印 "Ignoring 2 permissions.allow entries from .claude/settings.json: this workspace has not been trusted. …"；allow 被忽略（Read/Write 都要授权，-p 下直接拒绝），deny 规则照样生效（Bash 内容规则拒绝）。
- **perm-settings-default-mode**：--settings JSON 里 permissions.defaultMode=plan：stream-json 的 system/init 报 permissionMode "plan"，Write 被 plan 模式拒绝。
- **hook-settings-events**：[垫片] 项目 settings.json 的命令钩子（node 脚本，已信任目录）：SessionStart → UserPromptSubmit（stdout 作为附加上下文进入请求："UserPromptSubmit hook success: HOOK-CONTEXT-LINE"）→ PreToolUse(Write blocked.txt) 以退出码 2 拦截，tool_result "PreToolUse:Write hook error: […]: verify hook: blocked.txt is not allowed" → PreToolUse/PostToolUse(Write ok.txt) → Stop → SessionEnd。检查钩子日志的事件顺序与每个事件的输入字段、拦截结果和文件。不加 win-hook-spawn-shim 时钩子收不到 stdin（scenarios.md 第 3 节）。
- **mcp-resources**：MCP 资源与工具错误（fake-mcp-server --full）：ToolSearch select 三个延迟工具 → ListMcpResourcesTool 列出两个资源（带 server 字段）→ ReadMcpResourceTool 读 verify://notes/readme（contents 原样）→ 读不存在的 uri → "Resource not found: … Re-run ListMcpResourcesTool to refresh."（非 is_error）→ mcp__verify__fail（isError=true）→ tool_result is_error。服务器日志里有 resources/list、resources/read、tools/call。
- **mcp-prompt**：MCP 提示词当斜杠命令（-p "/mcp__verify__greet Alice"）：CLI 连接后发 prompts/list，执行时 prompts/get(name=greet, arguments.name=Alice)；请求里第一条 user 消息是 <command-message>/<command-name>/<command-args> 三行 + 提示词内容 "Please greet Alice warmly. VERIFY-MCP-PROMPT"。
- **mcp-connect-fail**：MCP 连接失败：一个服务器启动即退出（--exit-on-start，退出码 3），一个命令不存在；stream-json 的 system/init 里两个都是 status "failed"（source dynamic），工具表里没有它们的工具，请求照常发出、退出 0。
- **mcp-project-config**：项目 .mcp.json：.claude/settings.local.json 设 enableAllProjectMcpServers=true → stream-json init 报 proj 服务器 connected（source project），工具表含 mcp__proj__add / mcp__proj__echo；模型调用 mcp__proj__add(2,40) → "42"。
- **plugin-dir-command**：[垫片] --plugin-dir 加载夹具插件 verify-plugin（commands/skills/agents/hooks）：-p "/verify-plugin:hello Bob" → 请求里是 <command-name>/verify-plugin:hello</command-name> + "VERIFY-PLUGIN-COMMAND: say hello to Bob."；插件的 UserPromptSubmit 钩子运行（CLAUDE_PLUGIN_ROOT 指向插件目录），输出作为附加上下文进入请求，并在工作目录写 plugin-hook.log。
- **plugin-dir-skill-hook**：[垫片] --plugin-dir + stream-json：init 的 slash_commands 含 verify-plugin:hello / verify-plugin:verify-plugin-skill，agents 含 verify-plugin:verify-plugin-agent，plugins 列出 verify-plugin；Skill 调用插件技能 → 技能正文；Write plugin-blocked.txt 被插件的 PreToolUse 钩子（退出码 2）拦截，tool_result 注明 "This hook comes from the verify-plugin@inline plugin."。
- **plugin-marketplace-lifecycle**：[垫片] 本地市场全流程（夹具 tools/verify/fixtures/verify-marketplace 复制到沙箱 tmp/）：marketplace add ../tmp/verify-marketplace → 再 add 一次（已存在）→ marketplace list（多出 verify-market，Source: Folder）→ install verify-plugin@verify-market（user 作用域，复制到 ~/.claude/plugins/cache）→ list --json（enabled true）→ disable → list --json（enabled false）→ enable → -p "/verify-plugin:hello Carol"（插件命令可用）→ uninstall → list --json 回到 []。检查每步退出码与输出、~/.claude/plugins 下的文件。
- **plugin-disabled-command**：[垫片] 安装后禁用的插件，其命令不可用：marketplace add → install → disable → -p "/verify-plugin:hello Dan" → 请求里是 "The user's message starts with the slash command /verify-plugin:hello, but no command with that name is available in this session…" 的 system-reminder，插件钩子不运行（没有 plugin-hook.log）。
- **plugin-validate**：[垫片] plugin validate：夹具插件 → 退出 0，列出插件目录提交检查的问题（README missing 等）；夹具市场 → "√ Validation passed"；manifest 是坏 JSON 的插件 → "Invalid JSON syntax" + "× Validation failed"，退出 1。
- **session-resume-id**：-p --session-id <固定 uuid> 写会话文件 ~/.claude/projects/<cwd 编码>/<uuid>.jsonl；-p --resume <uuid> 再问：第二个请求带上第一轮的 user/assistant（4 条消息），新提示词在最后一条 user 消息；会话文件按行摘要（type、role、文本开头）收集比较。
- **session-continue**：-p 第一轮 → -p --continue 第二轮 → -p --continue 第三轮：--continue 接上同一工作目录最近的会话，第三个请求带前两轮（6 条消息里非 system 的 5 条），只有一个会话文件。
- **session-fork**：--resume <uuid> --fork-session --output-format json：result.session_id 是新的 uuid（≠ 原 id），请求带原会话历史；会话目录里有原文件和新文件两份，原文件不被改写（行数摘要比较）。
- **session-errors**：会话错误路径：空目录 --continue（没有历史，当新会话处理、退出 0）→ --session-id 非 uuid → "Error: Invalid session ID. Must be a valid UUID."（退出 1）→ 同一 --session-id 用两次 → "Error: Session ID … is already in use."（退出 1）→ --resume 不存在的 id → "No conversation found with session ID: …"（退出 1）→ --no-session-persistence 跑一轮后 --resume 它 → 找不到（没写文件）。
- **session-resume-tools**：带工具调用的会话恢复：第一轮 Write + Read（tool_use/tool_result 写进会话文件）→ --resume 第二轮：请求里的历史按原顺序含 tool_use 与 tool_result 块（id 不变），stream-json init 的 session_id 等于原 id。
- **tty-multi-turn**：[垫片+伪终端] 多轮对话：输入 first question 回车 → "● First reply." 上屏 → 输入 second question 回车 → 第二个请求带第一轮历史 → "● Second reply." 上屏 → /exit。比较两轮之后的屏幕快照。
- **tty-permission-accept**：[垫片+伪终端] 权限确认框接受：--permission-mode default，模型要 Write note.txt → 确认框（"Do you want to create note.txt?"，1. Yes / 2. … / 3. No，带文件预览，"Esc to cancel · Tab to amend"）→ 回车选 Yes → 文件写入、tool_result 成功、"● Wrote it." 上屏。比较确认框与结果两个快照。
- **tty-permission-reject**：[垫片+伪终端] 权限确认框拒绝：同上，确认框出现后按 Esc → 屏幕显示 "User rejected write to note.txt"，文件不存在，不再发后续请求（共 1 个请求）。
- **tty-esc-interrupt**：[垫片+伪终端] Esc 中断：假上游对这次请求等 30 秒才回答（finalDelayMs）；回车 3 秒后（请求已到达假上游）按 Esc → 请求被中止，用户消息撤回、原文回到输入框（"❯ wait please"）；Ctrl+U 清空后 /exit。比较中断后的快照；假上游只收到 1 个请求，回答没有上屏。
- **tty-help-dialog**：[垫片+伪终端] /help：输入 /help 回车 → 帮助对话框（General 页：Shortcuts 表）→ Tab 切到 Commands 页（"Browse default commands" 列表）→ Esc 关闭回到输入框 → /exit。比较三个快照；不发 API 请求。
- **tty-slash-menu**：[垫片+伪终端] 斜杠命令菜单：输入 / → 命令建议列表（/add-dir、/auto-mode-setup…）→ 再输入 mod → 按模糊匹配过滤（/model 在首位，说明里带当前模型）→ Ctrl+U 清空 → /exit。不发 API 请求。
- **tty-input-edit**：[垫片+伪终端] 输入框编辑：输入 "helo wrld" → ←×3 插入 o → Ctrl+A 到行首、→×3 插入 l → Ctrl+E 到行尾输入 "!!" → Backspace 删一个 → 回车；请求里的提示词正好是 "hello world!"。
- **tty-mode-cycle**：[垫片+伪终端] Shift+Tab 循环权限模式：auto mode on → manual mode on → accept edits on → plan mode on → auto mode on，每次等状态行出现对应文字再拍快照。
- **tty-unknown-command**：[垫片+伪终端] 未知斜杠命令：/nosuchcmd 回车 → "Unknown command: /nosuchcmd"，不发 API 请求。
- **tty-continue**：[垫片+伪终端] 两次交互会话：第一次问 earlier question 得到 "● Earlier reply." 后 /exit；第二次 --continue：屏幕上恢复出上一轮的提问和回答，再问 later question → 请求带上一轮历史，"● Later reply." 上屏。
- **tty-resume-print-session**：[垫片+伪终端] -p --session-id <uuid> 写的会话，交互模式 --resume <uuid> 打开：屏幕上显示 -p 那一轮的提问和回答，再问一句 → 请求带上历史。
- **tty-continue-print-only**：[垫片+伪终端] 只有 -p 写过会话时，交互模式 --continue 不接 -p 的会话：打印 "No conversation found to continue"，退出 1，不发请求（-p --continue 则能接上，见 session-continue）。
- **tty-bash-mode**：[垫片+伪终端] ! 进入 bash 模式：输入 "!" 再输入 "echo tty-bang" 回车 → 在本地执行，屏幕显示 "! echo tty-bang" 和 "⎿ tty-bang"；官方构建随后把 <bash-input>echo tty-bang</bash-input> 与 <bash-stdout>tty-bang</bash-stdout> 作为一条 user 消息发给模型（第 1 个请求），再问一句是第 2 个请求。
