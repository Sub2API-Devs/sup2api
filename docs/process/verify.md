# 运行验证（runtime）过程文档

负责人：runtime 成员。写入范围：`tools/verify/`、`analysis/verify/`、本文件、`package.json` 的 `verify*` 脚本与 `bun` 开发依赖。

## 1. 结论先行

- 用 npm 包 `bun@1.4.4` 在完全隔离的沙箱里运行任意一棵树的 `cli.js`，挂本地假 Anthropic API，不碰真实账号、真实 key、真实网络。
- 42 个场景（版本、帮助 20 个、非 Ink 子命令、`-p` 各种输出格式、工具往返、MCP、错误处理、第一方形状），`original` 对 `original` 连跑两轮，**归一化后 42/42 完全一致，预期 42/42 满足**；其中 16 个场景不归一化就不一致（UUID、端口、沙箱路径、时间等）。
- 负对照：把一个 chunk 里 Edit 工具描述的句号改成感叹号，`print-hi` 立刻报出唯一差异 `$.requests[0].body.tools[2].description`。
- 顺带对拍了 rename 成员的测试输出 `.rn-tmp/out-full`（674,463 个绑定全改名、27,119 个导出改名）和 `.rn-tmp/out-final`（136,500 个绑定改名）：都 42/42 一致。`runnable/` 尚未生成。

## 2. 环境

| 项 | 值 |
|---|---|
| 本机 | Windows 10.0.26200 + Git Bash，Node v24.20.0 |
| Bun | `node_modules/bun/bin/bun.exe`，`bun --revision` = `1.4.4+38afee6c8`（`package.json` 里固定为 `"bun": "1.4.4"`） |
| 官方内嵌 Bun | 1.4.4 修订 `71c9bf0ca`（Anthropic 内部版 `@anthropic-ai/bun-internal`），报 Node v26.12.1；公版报 v26.3.0（见请求头 `X-Stainless-Runtime-Version`） |

- `npm i -D bun@1.4.4` 时 npm 提示 `bun@1.4.4 (postinstall)` 未在 allowScripts 里，没有执行 postinstall；但 `node_modules/bun/bin/bun.exe` 已经是真实的 115 MB 可执行文件，`--version` = 1.4.4，可直接用。`@oven/bun-windows-x64/bin/` 是空的，所以工具只认 `node_modules/bun/bin/bun.exe`（可用 `VERIFY_BUN` 覆盖）。
- 公版 Bun 与官方内部版的差异是本工具最大的已知限制，见第 8 节。

## 3. 工具与用法

| 文件 | 作用 |
|---|---|
| `tools/verify/run.mjs` | 隔离运行。命令行：`node tools/verify/run.mjs <tree> [--first-party] [--no-upstream] [--keep] [--json] [--trace] [--env-trace] [--env K=V] [--timeout ms] -- <cli 参数>`；库：`runCli()`、`runScenario()`、`pool()` |
| `tools/verify/fake-upstream.mjs` | 本地假 Messages API（SSE / JSON）+ 黑洞代理；可独立运行 `node tools/verify/fake-upstream.mjs --port 8787` |
| `tools/verify/fake-mcp-server.mjs` | 最小 stdio MCP 服务器（echo / add 两个工具），记录收到的每条 JSON-RPC |
| `tools/verify/scenarios.mjs` | 场景表；`node tools/verify/scenarios.mjs <tree> [--only a,b] [--jobs 3] [--list]` 对一棵树跑一遍并检查预期 |
| `tools/verify/compare.mjs` | 对拍：`node tools/verify/compare.mjs <baseline> <candidate> [--name N] [--only a,b] [--jobs 3]`，写 `analysis/verify/<name>.json` 与 `.md` |
| `tools/verify/trace-preload.js` | 诊断：`--trace` 时 `bun --preload`，打印 `process.exit` 调用栈和未捕获异常 |
| `tools/verify/env-trace-preload.js` | 诊断：`--env-trace` 时把 `process.env` 换成 Proxy，记录读取过的环境变量 |

npm 脚本：

```
npm run verify                     # original 对 original（稳定性自检）
npm run verify:runnable            # original 对 runnable
npm run verify:scenarios           # 只跑 original 并检查预期
npm run -s verify:run -- original -- --version --verbose
npm run verify:upstream            # 手工调试用的假上游
```

全套 42 个场景、两棵树、3 路并发约 75–130 秒。

## 4. 隔离方式

每次运行（场景里的多步命令共用一次）：

1. **沙箱目录**：`<项目所在盘>:\.cc-verify\run-XXXXXX\{home,work,tmp}`，跑完删除（`--keep` 保留），`.cc-verify` 空了也删。放在盘根而不是系统临时目录，是因为 CLI 会从 cwd 向上找 `CLAUDE.md` / `.claude/` / `.mcp.json`；系统临时目录在 `C:\Users\<真实用户>\AppData\Local\Temp` 下，向上会经过真实用户目录。
2. **环境变量从白名单重建**，父进程的 `ANTHROPIC_*`、`CLAUDE_*`、`OTEL_*`、代理、云凭证一律不继承。只继承 `PATH`、`SystemRoot`、`ComSpec`、`PATHEXT`、`ProgramFiles*`、`NUMBER_OF_PROCESSORS` 这类系统项。
3. **身份与目录**：`HOME`、`USERPROFILE`、`APPDATA`、`LOCALAPPDATA`、`CLAUDE_CONFIG_DIR`、`XDG_CONFIG_HOME/DATA_HOME/CACHE_HOME/STATE_HOME/RUNTIME_DIR`、`TMP/TEMP/TMPDIR` 全指向沙箱；`USER/USERNAME/LOGNAME=verify`。
   - 坑：Windows 上 libuv 创建子进程时，环境块里缺 `HOMEDRIVE`、`HOMEPATH`、`LOGONSERVER`、`USERDOMAIN` 等会从父进程补上（实测 `HOMEPATH=\Users\<真实用户>`），所以这几项也显式给沙箱值。
4. **关闭非必要流量**（都在 original 里确认过实际被读取）：`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`（`r7t()` 返回最严的 `essential-traffic`，GrowthBook、Bootstrap、servedCatalog、插件下载、gh api 等都据此关闭）、`DISABLE_TELEMETRY=1`、`DO_NOT_TRACK=1`、`DISABLE_AUTOUPDATER=1`、`DISABLE_ERROR_REPORTING=1`、`DISABLE_GROWTHBOOK=1`、`DISABLE_INSTALLATION_CHECKS=1`、`CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY=1`、`CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL=1`。
5. **网络**：`ANTHROPIC_API_KEY` 是明显的假值；`ANTHROPIC_BASE_URL` 指向假上游；`HTTP(S)_PROXY` 也指向假上游，它对 `CONNECT` 和绝对 URL 只记录、回 403、不转发，所以任何漏网的外网请求都会被拦下并出现在结果的 `requests` 里（`kind` = `proxy-connect` / `proxy-http`）。`NO_PROXY=127.0.0.1,localhost,::1`。不挂假上游时代理指向 `127.0.0.1:9`。
6. **输出稳定**：`NO_COLOR=1`、`FORCE_COLOR=0`、`TERM=dumb`、`COLUMNS=80`、`LINES=40`。
7. **Bun**：`bun --no-install <tree>/cli.js`（禁止自动装包）；`BUN_RUNTIME_TRANSPILER_CACHE_PATH=0`（否则每次往沙箱写约 32 MB 转译缓存；实测关掉对启动时间无明显影响）。
8. **Git Bash**：`CLAUDE_CODE_GIT_BASH_PATH` 指向 `where git` 找到的 `<Git>\bin\bash.exe`（Bash 工具需要）。
9. **进程**：每步有超时（默认 60 s），超时和结束后都用 `taskkill /PID <pid> /T /F` 按 PID 杀进程树（收掉 bash、MCP 服务器等孙进程）。**不按名字杀**。
10. **泄漏审计**（每次运行的 `leaks`）：输出和请求里出现真实 HOME（含去掉盘符的形式）、项目根（被测树、bun 目录、tools/verify 除外）、任何外网请求，都会列出。全部 42 个场景的 `leaks` 都为空（第一方形状场景的外网 CONNECT 是预期内的）。
11. **宿主警告**（`hostWarnings`）：linux 构建在 Windows 上把托管设置目录解析成 `<cwd 盘>:\etc\claude-code`（`/etc/claude-code` 去掉了盘符），那里有文件就会被当成托管设置读入，破坏隔离；运行时检查它是否存在。

## 5. 假上游

- `POST /v1/messages`：`stream=true` 回 SSE（`message_start` → 每个块 `content_block_start` / 两段 `delta` / `content_block_stop` → `message_delta` → `message_stop`），否则回 JSON。
- 按脚本回答：请求带 `tools` 的是主循环，按请求里 `assistant` 消息个数选第几步（`steps[i]`：可选前置文本 + 若干 `tool_use`，`input` 可以是 `(ctx) => {...}` 拿沙箱路径），步数用完回 `final`；不带 `tools` 的旁路请求回 `side`；`error: {status,type,message}` 一律回错误。
- **无状态、确定**：同一请求永远得到同一回答；`msg_fake_<i>`、`toolu_fake_<i>_<j>` 由步号决定，所以两次运行 CLI 回传的 `tool_use_id` 相同。`usage` 固定（input 100，output 按文本长度），所以成本字段也稳定，不需要归一化。
- `POST /v1/messages/count_tokens` 固定 `{input_tokens:42}`；其他路径 404（Anthropic 错误形状）。
- 记录每个请求：到达序号、相对时间、类型、方法、URL、原始头（保留顺序和大小写）、body（JSON 解析后）、回了什么。

## 6. 场景与结果（original，两轮）

| 场景 | 意义 / 预期 | 退出码 | API 请求 | 外网 |
|---|---|---|---|---|
| version | `cli.js` 快速路径，`2.1.316 (Claude Code)` | 0 | 0 | 0 |
| version-verbose | 多一行 `Commit: cd7ceb459c6864567b16a11f60101b24421475c1` | 0 | 0 | 0 |
| help | 总帮助（选项 + 子命令表） | 0 | 0 | 0 |
| help-*（17 个） | `mcp`、`mcp add`、`mcp list`、`plugin`、`plugin marketplace`、`plugin install`、`auth`、`agents`、`auto-mode`、`doctor`、`update`、`install`、`setup-token`、`import`、`ultrareview`、`gateway`、`purge` 的 `--help` | 0 | 0 | 0 |
| invalid-option | `error: unknown option` | 1 | 0 | 0 |
| doctor | 非交互诊断文本；自定义 base URL 下不取远程设置 | 0 | 0 | 0 |
| plugin-list-json | `[]` | 0 | 0 | 0 |
| agents-json | `[]` | 0 | 0 | 0 |
| update-offline | 查 npm registry 被黑洞代理拒绝（2 次 `CONNECT registry.npmjs.org:443`），打印失败说明 | 1 | 0 | 2 |
| mcp-add | add stdio → 重复 add 报已存在 → add http → add -s project（写 `./.mcp.json`）→ remove 不存在的名字 | 最后一步 1 | 0 | 0 |
| mcp-list-ink-limit | 已知限制：`mcp list` 用 Ink，公版 Bun 上静默退出 1；确认两棵树失败方式相同 | 1 | 0 | 0 |
| print-hi | `-p hi`，第三方形状 | 0 | 1 | 0 |
| print-hi-first-party | `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`，第一方形状（见 7.2） | 0 | 1 | 12 |
| print-json | `--output-format json`，一个 `type=result, subtype=success` 对象 | 0 | 1 | 0 |
| print-stream-json | `--output-format stream-json --verbose`：`system/init` → `assistant` → `result/success` | 0 | 1 | 0 |
| print-stdin | `-p` 无参数，提示词来自 stdin | 0 | 1 | 0 |
| print-stream-json-input | `--input-format stream-json` | 0 | 1 | 0 |
| print-model-alias | `--model sonnet` 解析成具体模型 id | 0 | 1 | 0 |
| print-system-prompt | `--system-prompt` + `--append-system-prompt` 出现在 `system` 里 | 0 | 1 | 0 |
| print-bare | `--bare` 最小模式 | 0 | 1 | 0 |
| print-api-error | 上游一律回 400，CLI 逐级降级重发（见 7.4），最后 `API Error: 400 …` | 1 | 6 | 0 |
| print-tools | Bash（`echo hi > bash-out.txt`）→ Write → Read → Edit → 并行两个 Read → 最终文本；文件内容核对 | 0 | 6 | 0 |
| print-tools-stream-json | 同上，stream-json 输出 | 0 | 6 | 0 |
| print-max-turns | `--max-turns 1` + 工具调用 → `error_max_turns` | 1 | 1 | 0 |
| print-permission-denied | 不给 `--allowedTools`，`-p` 下 Write 被拒（不弹框），文件不存在 | 0 | 2 | 0 |
| print-mcp | 本地 stdio MCP 服务器 + ToolSearch + `mcp__verify__echo` 往返（见 7.5） | 0 | 3 | 0 |

`analysis/verify/` 里：

- `original-vs-original.json` / `.md`、`original-vs-original-run2.json` / `.md`：两轮稳定性自检。
- `original-vs-rename-out-full.*`、`original-vs-rename-out-final.*`：对 rename 测试输出的对拍。
- `env-reads.json`：`--version`、`--help`、`-p hi`、第一方 `-p hi` 读取过的环境变量。

JSON 里每个场景有：预期检查结果、`equal`、差异列表（JSON 路径 + 两边的值，文本给出第一处不同的行）、`rawDiffCount`（不归一化时的差异数）、各归一化规则命中次数、基线请求形状摘要（头、body 键、model、system 块长度与开头、工具名、消息块类型、body 哈希）。

## 7. 发现的 CLI 行为

### 7.1 启动时读取的环境变量

`--env-trace` 实测（`analysis/verify/env-reads.json`）：`--version` 11 个，`--help` 149 个，`-p hi` 519 个（沙箱里有值的 63 个），第一方 `-p hi` 524 个（多出 `CLAUDE_CODE_OAUTH_CLIENT_ID`、`CLAUDE_CODE_PROXY_RESOLVES_HOSTS`、`CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS` 等 7 个）。

- 环境变量有一个集中注册表（`chunk-jhrww53q.js`，约 1,226 个名字，`L.str()/L.bool()/L.triBool()/L.int()` 声明类型），`var i=fV(Xl,…)` 为每个名字定义惰性 getter，每次访问都读 `process.env[name]` 再解析；`CLAUDE_CODE_LAZY_ENV_GETTERS` 换成 Proxy 实现。
- 隐私级别 `r7t()`：`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` → `essential-traffic`；否则 `DISABLE_TELEMETRY` 或 `DO_NOT_TRACK` → `no-telemetry`；否则 `default`。
- 入口一开始就写 `process.env.NoDefaultCurrentDirectoryInExePath="1"`、`COREPACK_ENABLE_AUTO_PIN="0"`。
- 注意：环境变量 Proxy 只拦得到 `process.env` 上的访问，`Bun.env` 之类不在内；写入必须直接落到真实 `process.env`（Bun 的 `process.env` 只接受普通数据描述符，经 Proxy 的 `Reflect.set` 会抛错，第一版因此让 CLI 提前退出）。

### 7.2 自定义 base URL：第三方形状 vs 第一方形状

`ANTHROPIC_BASE_URL` 不是 api.anthropic.com 时，`Pu()` 为假，CLI 按第三方端点处理；`_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`（或客户端数据文档里的 `assume_first_party_base_url`）让 `GK()` 为真，按第一方处理。实测差异（`-p hi`）：

| 方面 | 第三方（默认） | 第一方（`_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`） |
|---|---|---|
| 额外请求头 | 无 | `x-claude-code-prompt-id`、`x-claude-code-request-class: main`、`x-client-request-id`（都在 `x-app` 之后） |
| `anthropic-beta` | 8 个 | 多 `prompt-caching-scope-2026-01-05`、`thinking-binding-controls-2026-08-01`、`cache-diagnosis-2026-04-07` |
| 计费头（`system[0]`） | `cc_version=2.1.316.<3hex>; cc_entrypoint=sdk-cli;` | 再加 `cch=00000; cc_prompt_id=<uuid>; cc_turn_origin=sdk; cc_prompt_index=0; cc_turn_index=1;` |
| `system` 块 | 3 块：计费头、身份行（带 `cache_control`）、主提示词 5,663 字（`ephemeral`） | 4 块：计费头、身份行（无 `cache_control`）、静态部分 1,229 字（`cache_control: {type: ephemeral, scope: global}`）、动态部分 4,432 字 |
| body | 无 `diagnostics` | `diagnostics: {previous_message_id: null}` |
| 外网 | 无 | 启动时直连 `api.anthropic.com` 取 `/api/claude_code/policy_limits` 和 `/api/claude_code/settings`，各 1 次 + 5 次指数退避重试（共 12 次 CONNECT，约 20 秒），失败后照常发请求 |

- `cch` 在公版 Bun 上是 `00000`：官方二进制发送前会把它换成每次不同的值（原生代码完成），JS 层看不到，所以对拍时归一化。
- `cc_version` 的三位十六进制后缀随提示词变（`hi` → `2e4`，`run the tools` → `b51`），同一提示词稳定，不用归一化。

### 7.3 请求形状（第三方，`-p`）

- `POST /v1/messages?beta=true`，SSE。头的顺序：`Accept`、`Content-Type`、`User-Agent: claude-cli/2.1.316 (external, sdk-cli)`、`X-Claude-Code-Session-Id`、`X-Stainless-Arch/Lang/OS/Package-Version(0.128.0)/Retry-Count/Runtime(node)/Runtime-Version/Timeout(600)`、`anthropic-beta`、`anthropic-dangerous-direct-browser-access: true`、`anthropic-version: 2023-06-01`、`x-api-key`、`x-app: cli`，然后 Bun 自己加的 `Connection`、`Host`、`Accept-Encoding: gzip, deflate, br, zstd`、`Content-Length`。
- body 键顺序：`model, messages, system, tools, metadata, max_tokens, thinking, context_management, output_config, stream`（第一方在 `stream` 前多 `diagnostics`）。默认 `model=claude-opus-5-5`、`max_tokens=128000`、`thinking={type: adaptive, display: omitted}`、`output_config={effort: medium}`、`context_management.edits=[{type: clear_thinking_20251015, keep: all}]`。
- `metadata.user_id` 是 JSON 字符串：`{"device_id":<64hex>,"account_uuid":"","session_id":<uuid>}`。
- `-p` 的入口是 `sdk-cli`，身份行是 "You are a Claude agent, built on Anthropic's Claude Agent SDK."。
- `messages`：第一条 user 有两个文本块（git 署名的 system-reminder + 提示词），第二条是 **role 为 `system` 的消息**（`# Environment` 环境块、延迟工具列表、代理类型、Skill 列表、`Today's date is …`）。
- 工具：12 个直接给出（Agent、Bash、Edit、ListAgents、Read、ReportFindings、ScheduleWakeup、Skill、ToolSearch、Workflow、DeferredToolPlaceholder、Write），另外 11 个延迟工具（CronCreate/Delete/List、EnterWorktree、ExitWorktree、Monitor、NotebookEdit、SendMessage、TaskStop、WebFetch、WebSearch）要先 ToolSearch。**316 默认没有 Glob/Grep 工具**（只在权限规则兼容代码里出现），所以场景里没有 Glob/Grep，搜索靠 Bash。
- tool_result 块的最后一块带 `cache_control: {type: ephemeral}`（缓存断点跟着"最后一条消息的最后一块"走）。

### 7.4 400 错误的降级链

上游对 `/v1/messages` 一律回 400 `invalid_request_error` 时，CLI 不做普通重试（`X-Stainless-Retry-Count` 始终 0），而是逐级去掉可选特性重发，共 6 个请求：

1. 原样；
2. 去掉 `thinking-token-count-2026-05-13` beta；
3. 再去掉 `thinking.display`；
4. 关掉工具搜索：去掉 `advanced-tool-use-2025-11-20` beta，延迟工具全部内联（12 → 21 个工具），`thinking-token-count` 又加回来；
5. 再去掉 `thinking-token-count`；
6. 再去掉 `thinking.display`。

最后把 `API Error: 400 <message>` 打到 **stdout**，退出 1。

### 7.5 MCP 握手（stdio，`--strict-mcp-config --mcp-config`）

1. 先发 `server/discover` 探测（`id: "server-discover-probe-1"`，`_meta` 里带 `io.modelcontextprotocol/protocolVersion: 2026-07-28`、`clientInfo`、`clientCapabilities`）；服务器回 -32601 后退回老握手；
2. `initialize`（`protocolVersion: 2025-11-25`，`capabilities: {roots: {listChanged: true}, elicitation: {form: {}, url: {}}}`，`clientInfo: {name: claude-code, title: Claude Code, version: 2.1.316, description, websiteUrl}`）→ `notifications/initialized` → `tools/list`；
3. MCP 工具默认延迟加载：首个请求的工具表里没有 `mcp__verify__echo`；模型 `ToolSearch select:` 之后，tool_result 是 `{type: tool_reference, tool_name}`，下一个请求的工具表里才出现；
4. `tools/call` 的 `_meta` 带 `claudecode/toolUseId` 和 `progressToken`。

### 7.6 其他

- `-p` 下没有 `--allowedTools` 时，Write 被直接拒绝（不弹框），tool_result 为错误，模型仍可继续。
- 并行工具（一次回答里两个 Read）的 tool_result **按完成先后**排列，两次运行顺序可能不同（见归一化规则 `parallel-tool-results`）。
- `--output-format json` 的 result 对象键顺序不是 `type` 在前（`duration_api_ms` 在最前，`type` 在后面），但每次相同。
- 构建时常量：系统提示词环境块里 `Platform: linux`（linux 构建把平台固化了），但 `OS Version: Windows_NT 10.0.26200`、`Shell: bash.exe`；`doctor` 显示 `Platform: linux-x64`。

## 8. 已知限制（Windows + 公版 Bun）

1. **Ink 界面需要 `Bun.ant.CellSegmenter`**：316 的终端渲染要求 Anthropic 内部 Bun 的 `Bun.ant.*` 扩展（还有 `windowsProcessList`、`loginTty`、`ttyName`、`getPeerPid` 等），公版 1.4.4 没有，渲染时抛 "This runtime has no Bun.ant.CellSegmenter"。凡是用 Ink 输出的命令都跑不了：交互模式、`mcp list`（静默退出 1）、`mcp get`、`mcp remove` 成功路径、`mcp add-json`、`plugin list`（非 `--json`）、`plugin marketplace list`、`auth status`、`auto-mode defaults/config`、`setup-token`（后几个卡到超时）。场景只选不走 Ink 的路径，`mcp-list-ink-limit` 用来确认两棵树失败方式相同。
2. **linux `.node` 原生模块**（`audio-capture.node`、`clipboard-napi.node` 等）在 Windows 上加载不了，涉及的功能（语音、剪贴板）不测。
3. **Bash 工具的标准输出**：在这套组合上 Bash 工具执行 `echo hi` 时 bash 报 `echo: write error: Bad file descriptor`，tool_result 为 "Exit code 1"；重定向到文件可以（`echo hi > bash-out.txt` 成功，tool_result 是 "Shell cwd was reset to <CWD>"）。所以场景里的 Bash 命令都写文件，再用 Read 读回。原因未深究（推测与 linux 构建在 Windows 上的输出管道/fd 处理有关）。
4. **ripgrep**：调试日志报 `countFilesRoundedRg failed: ripgrep not found on PATH`（linux 构建在原生二进制里内嵌 rg，这里没有）。不影响现有场景。
5. **路径**：linux 构建在 Windows 上读 `\etc\claude-code\managed-settings.json`（解析到 cwd 所在盘根），读 `/proc/version` 失败（只是调试日志）；Unix socket 目录权限检查失败，跨会话消息功能关闭。
6. **cch**：公版 Bun 不计算 `cch`，恒为 `00000`；与官方二进制的请求体对拍要在 linux 上用官方 ELF 做（本机做不了）。
7. 第一方形状场景要等 policy_limits / 远程设置的 5 次退避重试，约 25 秒。

## 9. 归一化规则

按顺序应用（`compare.mjs` 的 `RULES_DOC`，也写进每份结果 JSON 的 `rules`）：

| 规则 | 内容 | 为什么需要 |
|---|---|---|
| parallel-tool-results | 同一条 user 消息里连续的 tool_result 块，以及 stream-json 里连续的 tool_result user 事件行，按 `tool_use_id` 排序；`cache_control` 留在原位置 | 并行工具按完成先后回传（第一轮全量对拍时 print-tools 唯一的差异就是这个） |
| path:cwd / home / tmp / sandbox | 沙箱路径（原样、`/`、JSON 转义 `\\`、`~/.claude/projects` 的 `-` 编码形式，不区分大小写）→ `<CWD>` `<HOME>` `<TMP>` `<SANDBOX>`，单独的 `run-XXXXXX` → `<RUNID>` | 每次运行沙箱名不同 |
| path:tree / bun / project | 被测树绝对路径 → `<TREE>`，bun 目录 → `<BUNDIR>`，项目根 → `<PROJECT>` | 不同树的绝对路径不同（`doctor` 的 `Invoked:` 等） |
| port | `127.0.0.1:<port>` → `<PORT>` | 假上游随机端口（`Host` 头） |
| uuid | UUID → `<UUID-n>`，按首次出现编号 | session id、prompt id、`x-client-request-id`、stream-json 的 `uuid` 每次随机；编号保留"同值"关系 |
| iso-ts | ISO 时间戳 → `<ISO-TS>` | stream-json / 文件里的时间 |
| hex64 | 64 位十六进制 → `<HEX64-n>` | `metadata.user_id` 里的 `device_id`（首次启动随机生成并写进配置） |
| epoch-ms | 13 位毫秒时间戳 → `<EPOCH-MS>` | 快照文件名等 |
| cch | `cch=xxxxx` → `cch=<CCH>` | 官方二进制每次不同（公版恒为 00000） |
| cwd-file | `claude-<4hex>-cwd` → `claude-<HEX4>-cwd` | Bash 工具记录 cwd 的临时文件名随机 |
| tmp-file | `.tmp.<pid>.<12hex>` → `.tmp.<PID>.<HEX>` | 原子写临时文件 |
| date | `Today's date is YYYY-MM-DD` 等 → `<DATE>` | 跨天运行 |
| duration | 名字含 `duration` / `_ms` / `Ms` / `ttft` 的数值 → `"<N>"` | `duration_ms`、`duration_api_ms`、`ttft_ms` |
| header:content-length | `Content-Length` → `<LEN>` | 端口位数等会改变长度；body 本身逐字段比较 |
| request:t | 请求到达时间 `t`、`seq` 不参与比较 | 时间 |

**不归一化**的（要求逐字一致）：退出码、stdout/stderr 其余文本、请求头的顺序和大小写、body 键顺序、`cc_version` 后缀、模型 id、beta 列表、成本（`total_cost_usd`）、工作目录文件内容、MCP 服务器收到的消息。

两轮全量里，命中次数为 path:cwd 136、uuid 117、duration 58、path:home 36、port 33、hex64 33、Content-Length 33、date 32、iso-ts 16、path:tree 7、cch 1、path:bun 1；16 个场景（全部 `-p` 场景和 `mcp-add`）不归一化就不一致，帮助/版本/doctor 等 26 个场景原文就一致。对拍 rename 输出时 `doctor` 也需要归一化（被测树路径不同）。

## 10. 过程与坑

1. 第一次 `-p hi` 就通了（约 5 秒），请求 1 个，无外网。第一方模式多出 12 次 `CONNECT api.anthropic.com:443`，查代码确认是 policy_limits 和远程托管设置（`nn().BASE_API_URL`，与 `ANTHROPIC_BASE_URL` 无关）。
2. `mcp list` 退出 1 无输出 → 写 `trace-preload.js` 打出调用栈，定位到 `Bun.ant.CellSegmenter`；之后用它筛出哪些子命令不走 Ink。
3. Bash 工具失败 → 用 `CLAUDE_CODE_SHELL_PREFIX` 包一层脚本抓到实际执行的命令串（`source <快照> && shopt … && eval '<cmd>' < /dev/null && pwd -P >| <tmp>/claude-xxxx-cwd`）和 `Bad file descriptor`，改用重定向。（这个诊断脚本放在 `D:\.cc-verify-probe\`，删除被安全检查拦下，需要手动删：`pfx.sh`、`cmd.txt`、`env.txt`，内容只有沙箱环境和假 key。）
4. 第一轮全量对拍 41/42：并行 Read 的 tool_result 顺序不同 → 加排序规则；再跑发现 `cache_control` 跟着最后一块走 → 排序时把 `cache_control` 留在原位置。之后 print-tools 系列单独连跑 4 轮、全量 2 轮都一致。
5. 400 场景一开始预期 1 个请求，实测 6 个 → 逐个比较请求，整理出 7.4 的降级链。
6. `mcp remove demo` 成功路径走 Ink → 场景改成只测 add 系列和 remove 失败路径。
7. 环境变量 Proxy 第一版没有 set 陷阱，CLI 写 `process.env` 时抛错提前退出（只录到 116 个）；补 set/deleteProperty/defineProperty 后正常。
8. 发现 libuv 会补 `HOMEPATH` 等真实值 → 显式覆盖，泄漏审计加"去掉盘符的真实 HOME"。

## 11. 未完成 / 后续

- `runnable/` 生成后跑 `npm run verify:runnable`。
- 与官方 ELF 对拍（cch、TLS、原生模块、Ink）需要在 linux 上做：`run.mjs` 的隔离和假上游可直接复用，只要把 spawn 的程序换成官方二进制。
- Ink 相关命令（交互模式、`mcp list` 等）在公版 Bun 上无法验证，除非给 `Bun.ant.CellSegmenter` 写 polyfill（会改变被测行为，暂不做）。
