# 对拍：original vs .rn-tmp/out-full

- 时间：2026-11-02T21:02:44.216Z，耗时 94 s
- 运行时：bun 1.4.4+38afee6c8，node v24.20.0，win32-x64
- 场景：42；归一化后一致：42；预期满足：基线 42，候选 42
- 不归一化就会不一致的场景：17（doctor, mcp-add, print-hi, print-hi-first-party, print-json, print-stream-json, print-stdin, print-stream-json-input, print-model-alias, print-system-prompt, print-bare, print-api-error, print-tools, print-tools-stream-json, print-max-turns, print-permission-denied, print-mcp）
- 归一化规则命中次数：path:bun=1，path:tree=7，path:cwd=136，path:home=36，uuid=117，port=33，header:content-length=33，date=32，duration=58，hex64=33，cch=1，iso-ts=16

| 场景 | 一致 | 基线预期 | 候选预期 | 退出码 | API 请求 | 外网请求 | 耗时 ms |
|---|---|---|---|---|---|---|---|
| version | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 3456/2735 |
| version-verbose | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 1761/946 |
| help | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 6127/5300 |
| help-mcp | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 2878/2154 |
| help-mcp-add | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 6452/5554 |
| help-mcp-list | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 3103/2322 |
| help-plugin | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 5360/4493 |
| help-plugin-marketplace | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 7364/6468 |
| help-plugin-install | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 3654/2760 |
| help-auth | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 5999/5208 |
| help-agents | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 2730/5295 |
| help-auto-mode | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 5504/4619 |
| help-doctor | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 6591/5658 |
| help-update | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 3537/2653 |
| help-install | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 7168/6301 |
| help-setup-token | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 3680/2823 |
| help-import | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 6066/5300 |
| help-ultrareview | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 2731/6550 |
| help-gateway | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 3949/3151 |
| help-purge | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 4140/3378 |
| invalid-option | 是 | 满足 | 满足 | 1/1 | 0/0 | 0/0 | 4385/3584 |
| doctor | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 5715/4931 |
| plugin-list-json | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 2662/6860 |
| agents-json | 是 | 满足 | 满足 | 0/0 | 0/0 | 0/0 | 3919/3095 |
| update-offline | 是 | 满足 | 满足 | 1/1 | 0/0 | 2/2 | 6696/9660 |
| mcp-add | 是 | 满足 | 满足 | 1/1 | 0/0 | 0/0 | 16386/22371 |
| mcp-list-ink-limit | 是 | 满足 | 满足 | 1/1 | 0/0 | 0/0 | 7894/5738 |
| print-hi | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 4349/5979 |
| print-hi-first-party | 是 | 满足 | 满足 | 0/0 | 1/1 | 12/12 | 24550/25241 |
| print-json | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 3812/5522 |
| print-stream-json | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 4118/4968 |
| print-stdin | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 4968/5625 |
| print-stream-json-input | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 4434/5167 |
| print-model-alias | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 4220/7073 |
| print-system-prompt | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 6477/7150 |
| print-bare | 是 | 满足 | 满足 | 0/0 | 1/1 | 0/0 | 5612/4603 |
| print-api-error | 是 | 满足 | 满足 | 1/1 | 6/6 | 0/0 | 5916/6559 |
| print-tools | 是 | 满足 | 满足 | 0/0 | 6/6 | 0/0 | 7162/7806 |
| print-tools-stream-json | 是 | 满足 | 满足 | 0/0 | 6/6 | 0/0 | 6840/9261 |
| print-max-turns | 是 | 满足 | 满足 | 1/1 | 1/1 | 0/0 | 5295/5918 |
| print-permission-denied | 是 | 满足 | 满足 | 0/0 | 2/2 | 0/0 | 4382/5066 |
| print-mcp | 是 | 满足 | 满足 | 0/0 | 3/3 | 0/0 | 3537/4360 |

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
- **update-offline**：update：查询 npm registry 被黑洞代理拒绝（2 次 CONNECT registry.npmjs.org:443），打印失败说明，退出 1。
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
