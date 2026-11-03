# 运行验证（runtime）过程文档

负责人：runtime 成员。写入范围：`tools/verify/`、`analysis/verify/`、本文件、`package.json` 的 `verify*` 脚本与 `bun` 开发依赖。

## 1. 结论先行

- 用 npm 包 `bun@1.4.4` 在完全隔离的沙箱里运行任意一棵树的 `cli.js`，挂本地假 Anthropic API，不碰真实账号、真实 key、真实网络。
- 54 个场景（版本、帮助 20 个、非 Ink 子命令、`-p` 各种输出格式、工具往返、MCP、错误处理、第一方形状，以及第二轮加的 Ink 子命令 8 个、伪终端交互 2 个、Bash 直接输出 2 个），`original` 对 `original` 连跑两轮（3 路、4 路并发），**归一化后 54/54 一致，预期 54/54 满足，没有需要重跑的场景**；其中 22 个场景不归一化就不一致。
- `original` 对 `runnable`（lead 生成的改名树）：54/54 一致（`analysis/verify/original-vs-runnable.*`）。
- 负对照：Edit 工具描述里句号改成感叹号 → `print-hi` 只报这一处差异；欢迎语改一个字母 → `tty-first-run` 只报 `$.screen[0]`。
- 第二轮（第 12–14 节）：
  - Ink 界面跑不起来的唯一原因是 `Bun.ant.CellSegmenter`（Anthropic 内部 Bun 的原生扩展）。`tools/verify/bun-ant-shim.js` 用 `Intl.Segmenter` + `Bun.stringWidth` 在 JS 里实现了它（**验证环境补丁，不是 316 源码**），`mcp list/get/remove`、`plugin list`、`auth status`、`auto-mode defaults/config` 和**伪终端里的交互会话**都能渲染并对拍。
  - Bash 工具 "Bad file descriptor" 的原因：linux 构建把平台固化成 `linux`，在 Windows 上走 POSIX 分支，用 `O_APPEND` 打开输出文件再交给 bash 当 stdout；Windows 上 `O_APPEND` 句柄没有 `FILE_WRITE_DATA`，Git Bash 写不进去。**是 CLI（linux 构建）在 Windows 上走了 linux 路径，不是公版 Bun 的问题**（Node 24 一样复现）。`win-append-shim.js` 绕开，`print-bash-stdout` 覆盖。
  - `update-offline` 偶发 0 个外网请求：请求其实是 CLI 调起的**本机真实 npm** 发的，CLI 给 `npm view` 只留 5 秒，机器忙时 npm 还没联网就被中止。改为沙箱里放立即失败的假 npm，场景不再依赖网络时机；`compare.mjs` 也加了"不一致时重跑一次、重跑后一致记为 flaky"。
- **第三轮（scenarios 成员，2026-11-04，第 15 节）**：场景扩到 98 个（新增工具错误路径、权限模式与规则、钩子、MCP 资源/提示词/失败、插件、会话恢复、伪终端交互共 44 个），original 对 original 两轮 98/98、original 对 runnable 98/98，均无重跑。详见 `docs/process/scenarios.md`。
- 顺带对拍了 rename 成员的测试输出 `.rn-tmp/out-full`、`.rn-tmp/out-final`（第一轮 42 个场景）：都一致。

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
| `tools/verify/run.mjs` | 隔离运行。命令行：`node tools/verify/run.mjs <tree> [--first-party] [--no-upstream] [--keep] [--json] [--trace] [--env-trace] [--spawn-trace] [--shim-ant] [--shim-win-append] [--env K=V] [--timeout ms] -- <cli 参数>`；库：`runCli()`（含 `tty` 伪终端模式）、`runScenario()`、`pool()` |
| `tools/verify/fake-upstream.mjs` | 本地假 Messages API（SSE / JSON）+ 黑洞代理；可独立运行 `node tools/verify/fake-upstream.mjs --port 8787` |
| `tools/verify/fake-mcp-server.mjs` | 最小 stdio MCP 服务器（echo / add 两个工具），记录收到的每条 JSON-RPC |
| `tools/verify/scenarios.mjs` | 场景表；`node tools/verify/scenarios.mjs <tree> [--only a,b] [--jobs 3] [--list]` 对一棵树跑一遍并检查预期 |
| `tools/verify/compare.mjs` | 对拍：`node tools/verify/compare.mjs <baseline> <candidate> [--name N] [--only a,b] [--jobs 3] [--retry 1]`，写 `analysis/verify/<name>.json` 与 `.md` |
| `tools/verify/bun-ant-shim.js` | **验证环境补丁**：`Bun.ant.CellSegmenter` 的 JS 实现（第 12 节），场景字段 `shimAnt: true` |
| `tools/verify/bun-ant-shim-selftest.js` | 垫片自检：`node_modules/bun/bin/bun.exe tools/verify/bun-ant-shim-selftest.js` |
| `tools/verify/win-append-shim.js` | **验证环境补丁**：Windows 上新建独占文件去掉 `O_APPEND`（第 13 节），场景字段 `shimWinAppend: true` |
| `tools/verify/pty-driver.js` | 用 Bun 运行的伪终端驱动（`Bun.Terminal`，Windows 上是 ConPTY）：按步骤等文字、按键、拍屏幕快照 |
| `tools/verify/vt-screen.mjs` | 极简 VT 屏幕模拟：终端字节流 → 屏幕文字（光标移动、擦除、滚动、宽字符） |
| `tools/verify/trace-preload.js` | 诊断：`--trace` 时 `bun --preload`，打印 `process.exit` 调用栈和未捕获异常 |
| `tools/verify/env-trace-preload.js` | 诊断：`--env-trace` 时把 `process.env` 换成 Proxy，记录读取过的环境变量 |
| `tools/verify/spawn-trace-preload.js` | 诊断：`--spawn-trace` 时记录 CLI 启动的每个子进程（命令、cwd、stdio、fd 是否有效；`VERIFY_SPAWN_TRACE_ENV=1` 时连同环境） |

npm 脚本：

```
npm run verify                     # original 对 original（稳定性自检）
npm run verify:runnable            # original 对 runnable
npm run verify:scenarios           # 只跑 original 并检查预期
npm run -s verify:run -- original -- --version --verbose
npm run verify:upstream            # 手工调试用的假上游
```

全套 54 个场景、两棵树、3 路并发约 85 秒。

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
8a. **假 npm**（第二轮加）：沙箱 `bin/` 里放 `npm.cmd` / `npm`，排在 PATH 最前：`npm config get prefix` 回沙箱路径，其余子命令立即报 `EVERIFYOFFLINE` 退出 1。CLI 的 `update`、`doctor` 都会调 npm；真实 npm 会读本机全局 npmrc、真的去连 registry，且受机器负载影响（第 14 节）。
8b. **子进程 node 不写编译缓存**：`NODE_DISABLE_COMPILE_CACHE=1`（假 MCP 服务器等 node 子进程曾在删除沙箱时并发往 `tmp/node-compile-cache` 写，留下残留目录）。
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
| update-offline | `npm view …@latest version --prefer-online` 由假 npm 立即失败，打印 "Failed to check for updates / Unable to fetch latest version from npm registry"（第 14 节） | 1 | 0 | 0 |
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
| ink-mcp-list-empty | [垫片] `mcp list`：No MCP servers configured… | 0 | 0 | 0 |
| ink-mcp-lifecycle | [垫片] add-json 非法 → add-json 本地服务器 → list 健康检查 "√ Connected" → get → remove → list 空 | 0 | 0 | 0 |
| ink-plugin-list | [垫片] `plugin list`：No plugins installed | 0 | 0 | 0 |
| ink-plugin-marketplace-list | [垫片] 只有内置 anthropic-plugin-directory | 0 | 0 | 0 |
| ink-auth-status / -text | [垫片] JSON：loggedIn、api_key、ANTHROPIC_API_KEY；`--text`：key 来源、base URL、代理 | 0 | 0 | 0 |
| ink-auto-mode-defaults / -config | [垫片] 默认规则 JSON | 0 | 0 | 0 |
| tty-first-run | [垫片+伪终端] 全新配置：欢迎画面 → 首次联网检查直连 api.anthropic.com / platform.claude.com 被拒 → "Unable to connect to Anthropic services" | 1 | 0 | 2 |
| tty-session | [垫片+伪终端] 预置配置，输入 hi → 回答（含中文、emoji、全角）上屏 → `/exit` → "Resume this session with: claude --resume <id>" | 0 | 1 | 0 |
| print-bash-stdout | [垫片] Bash `echo hi; echo err >&2; $((6*7))` → tool_result "hi\nerr\n42\n…" | 0 | 2 | 0 |
| print-bash-stdout-unshimmed | 对照：同一命令不加垫片 → "Exit code 1" | 0 | 2 | 0 |

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

1. **Ink 界面需要 `Bun.ant.CellSegmenter`**：316 的终端渲染要求 Anthropic 内部 Bun 的 `Bun.ant.CellSegmenter`，公版 1.4.4 没有，渲染时抛 "This runtime has no Bun.ant.CellSegmenter"。不加垫片时凡是用 Ink 输出的命令都跑不了：交互模式、`mcp list`（静默退出 1）、`mcp get`、`mcp remove` 成功路径、`mcp add-json`、`plugin list`（非 `--json`）、`plugin marketplace list`、`auth status`、`auto-mode defaults/config`、`setup-token`（后几个卡到超时）。**第二轮已用 `bun-ant-shim.js` 绕开（第 12 节）**；`mcp-list-ink-limit` 保留，确认不加垫片时两棵树失败方式相同。
2. **linux `.node` 原生模块**（`audio-capture.node`、`clipboard-napi.node` 等）在 Windows 上加载不了，涉及的功能（语音、剪贴板）不测。
3. **Bash 工具的标准输出**：不加垫片时 Bash 工具执行 `echo hi` 报 `echo: write error: Bad file descriptor`，tool_result 为 "Exit code 1"；重定向到文件可以。**原因已查清（第 13 节）：linux 构建在 Windows 上走 POSIX 分支、用 `O_APPEND` 打开输出文件**；`win-append-shim.js` 绕开，`print-bash-stdout` 覆盖，`print-tools` 仍保持"写文件再 Read"的做法不依赖垫片。
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
| path:? | 路径分隔符显示成 `?` 的形式（`D:?.cc-verify?run-xxx?tmp`）也按沙箱路径归一 | 交互界面里跨会话消息警告的路径 |
| tty-turn-line | `✻ <动词> for <耗时> · done <钟点>` → `✻ <VERB> for <DUR> · done <CLOCK>` | 交互界面回合结束行：动词随机、钟点是本地时间 |
| tty-stream | 伪终端场景不比较原始字节流，只比较 vt-screen 还原的最终屏幕、各步快照和 pty 摘要（退出码、是否被结束、每步是否等到文字） | Ink 增量重绘的帧切分随时间变；屏幕内容稳定 |

**不归一化**的（要求逐字一致）：退出码、stdout/stderr 其余文本、请求头的顺序和大小写、body 键顺序、`cc_version` 后缀、模型 id、beta 列表、成本（`total_cost_usd`）、工作目录文件内容、MCP 服务器收到的消息。

第一轮两轮全量（42 个场景）里，命中次数为 path:cwd 136、uuid 117、duration 58、path:home 36、port 33、hex64 33、Content-Length 33、date 32、iso-ts 16、path:tree 7、cch 1、path:bun 1；16 个场景（全部 `-p` 场景和 `mcp-add`）不归一化就不一致。第二轮（54 个场景）：path:cwd 164、uuid 128、duration 67、path:home 46、port 40、hex64 38、Content-Length 38、date 37、iso-ts 16、path:tree 7、path:project 3、parallel-tool-results 2、path:tmp 2、tty-turn-line 1、cch 1、path:bun 1；22 个场景不归一化就不一致。对拍别的树时 `doctor` 也需要归一化（被测树路径不同）。

**重跑（`--retry`，默认 1）**：某场景不一致或预期不满足时，两棵树各重跑一次；重跑后一致的在摘要里标为"是（重跑后）"、终端打印 `OK*`，第一次的差异保留在 JSON 的 `attempts` 里；真实差异重跑后仍然存在。第二轮三次全量都没有触发重跑。

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

- ~~`runnable/` 生成后跑 `npm run verify:runnable`~~：第二轮已跑，54/54 一致。
- 与官方 ELF 对拍（cch、TLS、原生模块、Ink）需要在 linux 上做：`run.mjs` 的隔离和假上游可直接复用，只要把 spawn 的程序换成官方二进制。
- ~~Ink 相关命令在公版 Bun 上无法验证~~：第二轮写了垫片（第 12 节）。垫片与官方原生实现是否逐格一致无法在本机证明，要在 linux 上用官方 ELF 跑同样的伪终端场景、比较屏幕。
- ~~交互模式只覆盖了"输入 → 回答 → /exit"~~：第三轮加了权限确认框接受/拒绝、Esc 中断、多轮、/help、斜杠菜单、输入框编辑、Shift+Tab、--continue/--resume、bash 模式（第 15 节）。

## 12. `Bun.ant.*` 与其它私有 API；Ink 垫片

### 12.1 清单

在 original 里搜 `Bun.<名字>`（33 种）后逐个在公版 bun 1.4.4 里检查：**只有 `Bun.ant` 不存在**，其余（`Bun.stringWidth`、`Bun.sliceAnsi`、`Bun.wrapAnsi`、`Bun.Terminal`、`Bun.WebView`、`Bun.Image`、`Bun.FetchSession`、`Bun.YAML`、`Bun.TOML`、`Bun.JSONL`、`Bun.zstdDecompress*` 等）公版都有。没有 `process.binding` / `_linkedBinding`，`bun:jsc` 是公开模块。`Bun.ant` 下用到 12 个成员：

| API | 所在 chunk | 调用与返回值的用法 | 只在哪个平台 | 不存在时 |
|---|---|---|---|---|
| `CellSegmenter`（类） | `chunk-m4dvt8pp.js` 的 `$7n(substitute, screen)`；使用方 `chunk-bzr73sfg.js`（`ps()`、`class pf`、`T1` 的 `setCell`、`xg` 的 `paint`）、`chunk-e6aww6q8.js`（`jUt`，把技能名按字素清洗） | `new CellSegmenter({ambiguousIsNarrow:true, substitute, screen})`；`segment(text, cells, runs, reorder)`、`paint(...)`、`setCell(...)`、驻留表 `graphemes/sgrKeys/sgrCloseKeys/uris`（接口细节见 `bun-ant-shim.js` 文件头） | 全平台 | **无回退**：直接抛 "This runtime has no Bun.ant.CellSegmenter. Run Claude Code on the @anthropic-ai/bun-internal version pinned in package.json."，Ink 整个渲染不了 |
| `windowsProcessList()` | `chunk-aepeg2w5.js`（`Nf`、`$wi`） | 返回 `[{pid, ppid, name}]` 或 `null`；用于找子进程树（杀 Bash 工具的进程树） | Windows | 先判断 `typeof Bun.ant?.windowsProcessList !== "function"`，返回 `undefined` 走别的方法（PowerShell 查询） |
| `windowsProcessCreationTime(pid)` | `chunk-qg0af0yq.js`（`hds`） | 返回进程创建时间或 `null`；用来排除 pid 复用 | Windows | `try/catch` 返回 `undefined` |
| `windowsFolderSecurity` | `chunk-fq0cr76a.js`（`CM()`） | 对象：`open(path, write)` 返回 `{handle, finalPath}` 等，读改文件夹 ACL（Windows 沙箱） | Windows | 记日志 "this runtime has no Bun.ant.windowsFolderSecurity…"，返回 `null`，沙箱 ACL 功能关闭 |
| `windowsSandboxDeniesArg()` | `chunk-fq0cr76a.js`（`YM()`） | 返回给沙箱子命令的参数字符串 | Windows | 可选链，不是字符串就不启用 |
| `loginTty(fd)` | `chunk-e6aww6q8.js`（`R5s`） | 返回布尔；后台会话取得控制终端 | 非 Windows | `try/catch` → `"ffi_unavailable"` |
| `ttyName(fd)` | `chunk-7t3j7ybe.js`（`Y`） | 返回终端设备名或 `null` | 非 Windows | `try/catch` → `undefined` |
| `setDumpable(bool)` | `chunk-0f5bp6p7.js`（`RV`） | 返回是否成功（`prctl(PR_SET_DUMPABLE,0)`） | linux | `try/catch`，记 "prctl unavailable" |
| `memoryPressureLevel()` | `chunk-22p96rmv.js` | 返回 `"normal"`/`"warning"`/`"critical"`/`null` | macOS | `try/catch` → `undefined`（低内存判断退回 `os.freemem()`） |
| `getPeerUid(fd)` / `getPeerPid(fd)` | `chunk-66jn0ssz.js`、`chunk-aepeg2w5.js`（`OY()`） | Unix socket 对端 uid/pid（后台守护进程鉴权） | 非 Windows | `try/catch` → `null`；`OY()` 先判断 `typeof` |
| `posixFsAt` | `chunk-p5msxby3.js`、`chunk-kxdxf2f6.js` | 对象：`openat/mkdirat/lstatat/readdirat…`（目录 fd 相对操作） | macOS / linux | 可选链判断，缺了走路径版或记 "this runtime has no Bun.ant.posixFsAt" |

结论：**只有 `CellSegmenter` 没有回退**；其余 11 个缺了只是功能降级，多数只在 Windows 构建或 macOS 上才会被调用。注意 316 的 linux 构建把平台固化成 `linux`（第 13 节），在 Windows 上跑时 Windows 专属的那几个根本不会被调用，linux 专属的（`setDumpable`）会被调用然后走 `catch`。垫片只补 `CellSegmenter`；装上垫片后 `Bun.ant` 是一个只有 `CellSegmenter` 的对象，其它调用仍然过不了 `typeof` 判断或在 `try` 里抛 TypeError，行为与没有 `Bun.ant` 时相同。

### 12.2 垫片 `tools/verify/bun-ant-shim.js`

**这是验证环境的补丁，不是 316 源码的一部分**：不写进 `runnable/`、`src/`，只在 `--shim-ant` / `shimAnt: true` 时用 `bun --preload` 注入；带垫片的场景描述都以 `[垫片]` 开头，它们的结果反映的是"316 的 JS + 我们的垫片"。

接口从调用方反推（`class pf` 的 `segment/width/keepColumns/paint`、`T1` 的 `setCell`、屏幕格是 `Int32` 两个一组 `[charPool 下标, styleId<<17 | hyperlink<<2 | 宽度种类]`、打包返回值 `结束列 + 改动起始列·2^20 + 改动结束列·2^36`），实现用：

- `Intl.Segmenter('grapheme')` 切字素，宽度用 `Bun.stringWidth(…, {ambiguousIsNarrow})`；
- SGR 与 OSC 8 链接的解析、活动样式集合的更新规则照抄 316 自带的 ansi-tokenize（同一 chunk 里的 `x()` / `A()`）；
- 写屏规则照 2.1.88 的 JS 版 `setCellAt` / `writeLineToScreen`（宽字符右边放 spacerTail、覆盖宽字符时清孤儿格、行尾放不下的宽字符写 spacerHead、制表符补到制表位）。

`bun-ant-shim-selftest.js` 检查了宽度（ASCII、CJK、全角、emoji、肤色修饰、组合字符、国旗、零宽空格）、样式段、链接段、跳过非 SGR 转义、substitute 码点、制表符、缓冲不足返回负数、打包返回值，21 项全过。

**与官方原生实现可能的差异**（无法对照原生代码，只能按调用方约定推断）：

1. 不做双向文本重排：`reorder=true`（只在 `WT_SESSION` 或 `TERM_PROGRAM=vscode` 时）也按逻辑顺序输出；
2. 宽度来自 `Bun.stringWidth`，不是原生的宽度表；宽度 0 的字素丢弃，大于 2 按 2；
3. 制表符展开的空格用空样式，原生可能沿用所在样式段；
4. 不认识的转义序列按 2.1.88 的规则跳过，C0/C1 控制字符（`\t` 除外）丢弃；
5. 行尾放不下的宽字符写 spacerHead 并丢弃该字符（2.1.88 的行为）；
6. 纯 JS，每帧重新切分，比原生慢；场景里感觉不到。

两棵树用同一个垫片，所以"两棵树一致"证明的是改名没改坏 Ink 相关代码；垫片本身是否与官方逐格一致，要在 linux 上用官方 ELF 跑同样的伪终端场景、比较屏幕。

### 12.3 伪终端验证

`pty-driver.js`（用 Bun 运行，`Bun.spawn({terminal:{cols,rows,data}})`，Windows 上走 ConPTY，实测可用）启动 CLI，按步骤 `waitFor`（在 `vt-screen.mjs` 还原的屏幕文字里找）→ 等输出静止 → 可选拍快照 → 发送按键。`vt-screen.mjs` 是只为对拍写的极简 VT 模拟（光标移动、擦除、插入删除、滚动、宽字符），不追求与真实终端逐像素相同。

- `tty-first-run`：全新配置时交互模式先显示欢迎画面（字符画），然后做首次联网检查，直连 `api.anthropic.com` 和 `platform.claude.com`（被拦，`ERR_PROXY_TUNNEL`），提示 "Unable to connect to Anthropic services"，退出 1。
- `tty-session`：要预置配置跳过引导：`hasCompletedOnboarding: true`；`customApiKeyResponses.approved` 里放假 key 的**末 20 位**（CLI 的 `nge()` 是 `key.trim().slice(-20)`）；`projects[cwd].hasTrustDialogAccepted: true`。之后屏幕依次是：
  - 标题框（Claude Code v2.1.316 / Opus 5.5 · API Usage Billing / 工作目录）；
  - 跨会话消息关闭的警告（Unix socket 目录权限检查在 Windows 上失败）；
  - "Auto mode is now Claude Code's default permission mode" 提示；
  - 输入框和状态行 "⏵⏵ auto mode on (shift+tab to cycle) · ← for agents"。
  输入 `hi` 回车后出现 "● <回答>" 和 "✻ <动词> for 0s · done <钟点>"；`/exit` 后屏幕只剩 "Resume this session with: claude --resume <uuid>"。交互模式下请求的工具表有 13 个（`-p` 是 12 个）。
- 两次运行的**原始字节流长度不同**（Ink 增量重绘的帧切分随时间变），还原出的屏幕相同，所以只比较屏幕（归一化规则 `tty-stream`）。

## 13. Bash 工具 "Bad file descriptor" 的原因

现象：不加垫片时，Bash 工具执行任何写 stdout/stderr 的命令都失败（`echo: write error: Bad file descriptor`，tool_result "Exit code 1"），重定向到文件可以。

排查（`spawn-trace-preload.js` 记录 spawn 参数；`CLAUDE_CODE_SHELL_PREFIX` 包一层脚本看子进程里的 fd；在 CLI 进程里注入探针对比）：

1. Bash 工具用 `child_process.spawn(bash, ["-c", <包装后的命令>], {stdio: ["pipe", fd, fd], detached: true})`，`fd` 是任务输出文件（`<TMP>/claude-0/<项目>/<会话>/tasks/<id>.output`）的文件描述符；子进程里 fd 1/2 确实指向这个文件，但一写就 EBADF。
2. 在 CLI 进程里用同一个 bash，拿自己 `fs.openSync(…, "w")` 的 fd 当 stdout 就能写；用 CLI 的那个 fd 不行 → 问题在**文件是怎么打开的**。
3. 拦截 `fs/promises.open` 看到 CLI 打开输出文件的 flags 是 `0x80509` = `O_WRONLY | O_APPEND | O_CREAT | O_EXCL`（Windows 常量 1/8/256/1024，外加一个 Windows 上无意义的高位），出自 `chunk-1dp9p908.js` 里 `x()` 的 POSIX 分支。
4. 最小复现（与 CLI 无关）：Node 24 和公版 Bun 1.4.4 都一样——`fs.promises.open(f, "a")`（或 `"a+"`）得到的 fd 交给 Git Bash 当 stdout，`echo` 失败、退出 1；`"w"`、`"w+"`、`"r+"` 都正常。原因是 Windows 上 libuv 对 `O_APPEND` 只申请 `FILE_APPEND_DATA`、去掉 `FILE_WRITE_DATA`，MSYS2 的 bash 往这种句柄写会报 EBADF。
5. 为什么 CLI 会在 Windows 上走 POSIX 分支：**316 的 linux 构建把平台固化成 `linux`**。`chunk-znrryf4y.js` 里平台探测对象是 `new u({platform:"linux", env:process.env, …})`（打包时 `process.platform` 被内联成常量，全部 chunk 只剩 2 处 `globalThis.process.platform`），所以 `I()` 在 Windows 上也返回 `"linux"`。`x()` 本来有 Windows 分支：`if (I()==="windows") return … open(path, n.windowsFlags)`，而 Bash 工具的调用是 `P4t(path, "w")`，也就是 Windows 构建会用 `"w"` 打开，不会出问题。这也解释了第 7.6 节里系统提示词写 "Platform: linux"、`doctor` 写 "Platform: linux-x64"。

结论：**是 CLI（linux 构建）在 Windows 上走了 linux 专属路径**，碰上 Windows 的 `O_APPEND` 语义，不是公版 Bun 的问题。官方 linux 二进制在 linux 上、官方 Windows 二进制在 Windows 上都不会遇到。

绕开：`win-append-shim.js`（验证环境补丁）只在 win32 上、只对同时带 `O_APPEND | O_CREAT | O_EXCL` 的数字 flags（也就是新建独占文件）去掉 `O_APPEND`：新建的空文件从偏移 0 写与追加写结果相同；已存在的文件不动，避免覆盖。场景 `print-bash-stdout`（加垫片，tool_result = `hi\nerr\n42\nShell cwd was reset to <CWD>`）和 `print-bash-stdout-unshimmed`（不加垫片，确认仍是 "Exit code 1"）一起跑。

## 14. `update-offline` 不稳定的原因

lead 在全量对拍 original 对 runnable 时看到基线一侧 0 个外网请求（期望 2），单独重跑又是 2。

用 `--spawn-trace` 看 `update` 的子进程：CLI 依次运行 `npm config get prefix`、`cmd.exe /d /s /c "npm config get prefix"`、`npm -g config get prefix`，再运行两次 `npm view @anthropic-ai/claude-code@latest version --prefer-online`。**那 2 个 `CONNECT registry.npmjs.org:443` 是本机真实 npm 发的，不是 CLI 本身**（npm 继承了沙箱的 `HTTPS_PROXY`）。`npm view` 的调用带 `abortSignal: AbortSignal.timeout(5000)`（`chunk-6zvphrsz.js`）：npm 是 `npm.cmd` → node 启动，机器忙时（两棵树 × 3 路并发）启动超过 5 秒就被中止，一个请求都没发出，所以外网请求数取决于机器负载。12 次 6 路并发的压力测试里每次都是 2，但时间余量只有一两秒。

另外，用真实 npm 本身也不够隔离：它会读本机全局 npmrc（registry 镜像、代理、token）。

处理：

1. 沙箱 PATH 最前面放假 npm（第 4 节 8a），`npm view` 立即失败；`update-offline` 的预期改为"退出 1、stderr 有两句失败说明、0 个请求"，6 路并发 6 次输出逐字节相同。`doctor` 也会调 npm（`npm config get prefix`、`npm -g config get prefix`），同样不再碰真实 npm。
2. `compare.mjs` 加 `--retry`（默认 1）：不一致或预期不满足的场景两棵树各重跑一次，重跑后一致的标为 flaky（终端打印 `OK*`、摘要里写"是（重跑后）"、JSON 里保留第一次的差异），用来区分环境抖动和真实差异。修复后三次全量（3 路、4 路、对 runnable）都没有触发重跑。

## 15. 第三轮：场景扩到 98 个（scenarios 成员）

完整清单、判定方法、发现和过程在 `docs/process/scenarios.md`，这里只记对本工具的改动和结论。

- 新增 44 个场景（`scenarios.mjs` 里"第三轮"注释之后）：工具往返与错误路径 7（Read/Edit/Write/Bash/NotebookEdit/ToolSearch/Skill/Agent，含不存在的工具）、权限 10（plan/acceptEdits/bypassPermissions/dontAsk/auto 五种模式、`--allowedTools` 模式、settings.json 规则、未信任目录、`--settings` 默认模式）、钩子 1、MCP 4（资源、提示词、连接失败、项目 .mcp.json）、插件 5（`--plugin-dir`、本地市场 add/install/disable/enable/uninstall、禁用后命令不可用、validate）、会话 5（`--session-id`/`--resume`/`--continue`/`--fork-session`/错误路径/带工具的恢复）、伪终端 12（多轮、权限框接受/拒绝、Esc 中断、/help、斜杠菜单、输入编辑、Shift+Tab、未知命令、交互 --continue/--resume、bash 模式）。
- 结果：original 对 original 两轮（3 路、4 路，`--retry 0`）98/98 一致、预期全满足；original 对 runnable 98/98（`--retry 1` 未触发）；负对照改三处文字，三个相关场景都报差异。报告 `analysis/verify/scenarios-*`。
- 夹具：`tools/verify/fixtures/verify-marketplace/`（本地市场 + verify-plugin：命令、技能、代理、hooks.json + log-hook.cjs），场景运行时复制到沙箱 tmp/。
- 工具改动（都向后兼容，不用新字段时行为不变）：
  - `fake-upstream.mjs`：`side` 可为函数；`routes`（按系统提示词把子代理请求路由到另一组脚本）；`delayMs`/`finalDelayMs`。
  - `fake-mcp-server.mjs`：`--full`（resources、prompts、fail 工具）、`--exit-on-start`。
  - `run.mjs`：只加 `shimWinHookSpawn` / `--shim-win-hook-spawn`（预加载 `win-hook-spawn-shim.js`），8 行增量。
  - `pty-driver.js`：`waitFor` 可为数组；步骤可带 `delayMs`。
  - `compare.mjs`：sequence 里的伪终端步骤也只比较还原屏幕；新规则 `agent-id`、`plan-slug`，`duration` 扩展到纯文本 `duration_ms: <n>`（理由见 scenarios.md 3.4）。
  - `vt-screen.mjs`：宽字符改用 `\p{Emoji_Presentation}`（原来把 ⏸ ⚠ 这类字符算 2 列，Ink 增量重绘后整行错位）。
- 新垫片 `win-hook-spawn-shim.js`（**验证环境补丁**）：linux 构建的命令钩子在 Windows 上是 `spawn(cmd, [], {shell: true, detached: true})`，公版 Bun 在 Windows 上 shell + detached 的子进程收不到 stdin（钩子卡到超时），cmd.exe 也不展开 `${CLAUDE_PLUGIN_ROOT}`；垫片把这类调用改成 Windows 构建的参数（Git Bash、不 detached）。
- 新发现的 Windows 偏差（linux 构建平台固化导致，两棵树相同）：路径类权限规则（`Read(./x)` 等）不生效、acceptEdits 下 Write 仍被拒、Bash 重定向被判"工作目录外"——规则匹配用 `posix.relative` 算 `D:\` 路径。场景按现状断言并写明，要在 linux 上用官方 ELF 确认真实行为。
- 第 9 节的归一化表另加：`agent-id`、`plan-slug`（第三轮）；会话文件只比较 user/assistant 行序列和行类型集合；伪终端场景先等 11 秒让两个 10 秒提示过期再操作（不是归一化，见 scenarios.md 3.4）。
