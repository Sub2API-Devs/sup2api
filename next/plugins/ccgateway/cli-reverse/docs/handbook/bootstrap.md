# bootstrap 领域手册：启动、命令行、全局状态、安装与退出

> 适用版本：Claude Code 2.1.316（Bun 1.4.4 单文件构建，BUILD_TIME 2026-10-30T23:28:13Z，GIT_SHA cd7ceb459c…）。
> 依据：`original/` 代码。文中 `chunk-xxxx#名` 是声明 id（压缩名），括号里是本领域给的语义名（`naming/semantic-bootstrap.jsonl`）。重组路径以 `reconstructed/src/<模块路径>` 为准。

## 1. 概述

bootstrap 领域负责从进程启动到“开始一轮对话”之前的全部工作，也负责进程怎样退出：

- **入口快速路径**：`original/cli.js`。很多子命令（--version、后台会话、守护进程、远程控制、agents 视图、self-hosted-runner 等）在这里直接处理，不加载主模块。
- **主模块**：`main.tsx`。commander 命令树、preAction（init + 迁移）、根 action，然后分叉到交互 REPL 或 `-p`（headless）。
- **初始化**：`entrypoints/init.ts`、`setup.ts`、`interactiveHelpers.tsx`、`dialogLaunchers.tsx`。
- **headless 与 SDK 协议**：`cli/print.ts`、`cli/structuredIO.ts`、`cli/remoteIO.ts`、`cli/transports/*`、`cli/ndjsonSafeStringify.ts`。
- **全局状态**：`bootstrap/state.ts`。几乎所有子系统都在读写它。
- **配置迁移**：`migrations/*`，由 `main.tsx` 的 runMigrations 驱动。
- **安装与更新**：`cli/update.ts`、`utils/autoUpdater.ts`、`utils/localInstaller.ts`、`utils/nativeInstaller/*`、`utils/doctor*`。
- **退出与清理**：`utils/gracefulShutdown.ts`、`utils/cleanup.ts`、`utils/process.ts`、`cli/exit.ts`。
- **其他**：`upstreamproxy/*`（CCR 容器上游代理）、`utils/earlyInput.ts`、`utils/startupProfiler.ts`、`utils/warningHandler.ts`、`utils/processUserInput/*`（用户输入分发）。

**上下游关系**

- **调用方**：只有 `cli.js` 和操作系统信号。
- **被调用方**：几乎所有子系统，包括配置（state 领域）、认证、MCP、插件、query 循环（print 和 REPL 都会进入 `query()`）、Ink/REPL 界面、遥测。

## 2. 模块地图

模块的一句话说明见 `naming/modules-bootstrap.json`，共 57 个。下表只列关键声明；凡是不在对应模块里的声明，表中都已注明。

| 模块 | 关键声明 |
|---|---|
| `cli.js`（入口，未切分；应归 `entrypoints/cli.tsx`） | `#qe` cliMain、`#fe` hasOnlyDebugFlags、`#me` checkCwdReadable、`#he` hasDesktopFlag、`#Je` extractDispatchDefaults |
| `main.tsx` | `chunk-shkzs7rp.js#Gu` main、`#Ln` applyClientTypeAndEarlySettings、`#fi` run、`#_i` runInteractiveSession、`#Si` runOnboardingAndSetupScreens；`chunk-cjydagjy.js#Lks` buildCliProgram（commander 树）、`#ro` runPreparedHeadless、`#ao` runAllMigrations、`#$t` runMigrations；`chunk-3wek6r2k.js#KSo` prepareSession |
| `setup.ts` | `chunk-fhdzwff4.js#Nt` setup |
| `entrypoints/init.ts` | `chunk-vbtpanx5.js#GEo` init（memoize 包装）、`#Q` initImpl |
| `replLauncher.tsx`（写作时在 `_unattributed`，现已归入本文件） | `launchSessionRepl`（`chunk-19arrzdw.js#aLt`）、`launchRepl`（`#MLi`）：launchRepl，渲染 AppRoot + REPL |
| `cli/print.ts` | `chunk-tyg7f3ek.js#e8e` runHeadless、`#$z` 流式主循环（导出名 `_runHeadlessStreamingForTesting`） |
| `cli/structuredIO.ts` | `chunk-na0b3c5q.js#NTe` StructuredIO 类 |
| `cli/remoteIO.ts` | `chunk-z4g2ta8k.js#Q$` RemoteIO 类 |
| `utils/gracefulShutdown.ts` | `chunk-e6aww6q8.js#X9s` ShutdownCoordinator、`#er` gracefulShutdown、`#hi` gracefulShutdownSync、`#dzo` setupGracefulShutdown |
| `bootstrap/state.ts` | `chunk-ndmse9kj.js#t` currentSession、`#y` defaultRootSession、`#ze` buildSessionObject、`#Oe` HostState、`#tt` SessionScoped、`#W` HostScoped，外加约 430 个访问器 |

## 3. 启动序列

### 3.1 总调用链

```
cli.js 顶层
 ├─ process.env.NoDefaultCurrentDirectoryInExePath=1, COREPACK_ENABLE_AUTO_PIN=0, setAiAgentEnv()
 ├─ CLAUDE_CODE_REMOTE → NODE_OPTIONS += --max-old-space-size=8192
 └─ cliMain (#qe)
     ├─ 快速路径（见 3.2），命中则 return
     ├─ startCapturingEarlyInput()（非 REPL 子命令除外）
     ├─ startMdmRawRead() + startKeychainPrefetch() + configureZodForStartup()
     └─ await import("./chunk-shkzs7rp.js") → main(storageV5EnvPin)        [main.tsx · main]
          ├─ applyClientTypeAndEarlySettings (Ln)：clientType / 入口 / --settings 早读
          └─ run (fi) → buildCliProgram (Lks) → program.parseAsync(argv)
               ├─ preAction hook：init()                                    [entrypoints/init.ts]
               │     → runAllMigrations (ao) = migrateEnableAllProjectMcpServers + runMigrations ($t)
               │     → 远程设置/策略限制加载、插件同步、遥测 sink 等
               └─ 根 action → prepareSession (KSo)                          [main.tsx]
                     ├─ setup() (fhdzwff4#Nt)                               [setup.ts]
                     ├─ 工具/命令/代理/MCP 配置、权限上下文、模型解析
                     ├─ 返回 prepared-headless → runPreparedHeadless (ro) → runHeadless (e8e) → 流式主循环 ($z)
                     └─ 返回 prepared-interactive → runInteractiveSession (_i)
                           → 引导/信任屏 (Si → showSetupScreens) → launchRepl (19arrzdw#aLt → MLi)
```

### 3.2 cli.js 快速路径（按代码顺序）

`#qe`（cliMain）依次检查下列条件，命中就直接处理并返回，不加载主模块：

1. **代理令牌守卫**：设置了 `CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR` 却没有 `--session-tunnel` 时拒绝。
2. **`--gh-standin`**：gh 替身模式（`parseGhStandinArgs`（`chunk-6p9kc8f6.js#Ibi`））。
3. **`--runner-declares=`**：记下 runner 声明，之后由 adoptRunnerDeclaration 采用。
4. **`--handle-uri`**：先校验参数（`validateHandleUriArgs`（`chunk-9vb6sa16.js#Jur`））。
5. **`CLAUDE_CODE_REMOTE_SESSION_ORIGIN`=`review`**：守卫检查。
6. **启动调优**：noteProcessStartTuning、startGarbageCollectionCount，并安装 argv 读取器。
7. **`--version`/`-v`/`-V`**：打印 `2.1.316 (Claude Code)`；加 `--verbose` 时再打 Commit SHA 和构建时间。实测只读 11 个环境变量（verify.md 7.1）。
8. **cwd 与早期设置**：
   - 检查 cwd 可读（`#me`），然后 adoptRunnerDeclaration，打点 `profileCheckpoint("cli_entry")`。
   - `CLAUDE_CODE_HOVER_REST` 存在时调用 pinStorageV5FromEnv（受 `tengu_hover_rest` 控制）。
   - 10 秒后套用 JIT 策略。
9. **内部宿主进程**：
   - gh standin 主程序、`plugin test`、`--eval-mock-server`。
   - `--claude-in-chrome-mcp`、`--chrome-native-host`。
   - `--daemon-worker`、`--bg-pty-host`、`--bg-spare`、`--preload`。
10. **远程控制**：`remote-control` / `rc` / `remote` / `sync` / `bridge`。
11. **`daemon`**：参数由 `getDaemonArgs`（`chunk-spfbd54s.js#Tbi`） 解析。
12. **后台会话动词**：`attach` / `logs` / `stop`(`kill`) / `respawn` / `rm`，以及 `--bg` / `--background`。由 fleet 开关和 `tengu_sable_orrery` 控制。
13. **agents 视图**：`claude agents …`，参数由 `WRt` parseAgentsViewArgs 解析，进入 mountFleetViewWithComposerBack，受 `tengu_noble_wozniak` 控制。
14. **`self-hosted-runner`**：子命令 orchestrator / setup / doctor / code-sign / decode-token。
15. **`--tmux` 与 `--worktree`**：两者组合时走专门处理。
16. **参数改写**：`--update` / `--upgrade` 改写为 `update` 子命令；`--bare` 设置 `CLAUDE_CODE_SIMPLE=1`。
17. **startCapturingEarlyInput**：开始捕获早期输入。以下情况跳过：
    - NON_REPL_SUBCOMMANDS（`update`、`upgrade`、`doctor`、`forward-home-settings`）；
    - `mcp serve`、`plugin eval`、`rc`、`agents --json`；
    - 项目动词。
18. **加载主模块**：startMdmRawRead、startKeychainPrefetch、configureZodForStartup，然后 `import("./chunk-shkzs7rp.js")` 并调用 `main(storageV5EnvPin)`。

`#fe`（hasOnlyDebugFlags）判断 argv 是否只含调试标志。2.1.88 的 isDebugToStdErr 是误配。

### 3.3 init()（`entrypoints/init.ts`，chunk-vbtpanx5#GEo / #Q）

init 是 memoize 包装，同一进程只执行一次。步骤如下：

1. 启用配置读取，选择 v5 存储后端，预热远程托管设置，读取文件描述符传入的凭证（`CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR` 等）。
2. `CCR_AGENT_PROXY_RELAY_MODE` 存在时，以独立中继模式运行（`upstreamproxy/relay.ts`）。
3. 应用设置中的安全环境变量，设置额外 CA 证书。
4. 填充 OAuth/账户信息，然后：
   - 调用 `setupGracefulShutdown()`（`#dzo`）；
   - 初始化 1P 事件日志；
   - `configureGlobalMTLS()`，再 `configureGlobalAgents()`（代理）。
5. 预取托管配置，`preconnectAnthropicApi()` 预建 TLS 连接。
6. `CLAUDE_CODE_REMOTE` 为真时调用 `initAgentProxy()`（`upstreamproxy/upstreamproxy.ts`，`chunk-awy329vy.js#yGi`），设置 `HTTPS_PROXY`、`NO_PROXY`、CA 包和 gh 替身。
7. Windows 上检查 shell，准备 scratchpad 目录。
8. 错误处理：遇到 `ConfigParseError` 时，交互模式显示 InvalidConfig 对话框，非交互模式打印错误后退出。

第一方模式下，启动时会访问 `/api/claude_code/policy_limits` 和 `/api/claude_code/settings`，各 1 次，失败后再按指数退避重试 5 次（见 verify.md 7.2）。

### 3.4 setup()（`setup.ts`，chunk-fhdzwff4#Nt）

按顺序执行：

1. 检查 Node 版本，要求 ≥ 22（2.1.88 要求 ≥ 18）。
2. 后台 worker 的控制终端处理（`tengu_bg_worker_ctty`）。
3. `--session-id` 存在时调用 switchSession。
4. 建立 UDS 跨会话消息套接字（`--messaging-socket-path`）。
5. 恢复 iTerm2 / Terminal.app 的终端设置备份。
6. chdir 到工作目录；对钩子配置做快照（防止会话中途被篡改）；启动文件监视。
7. 处理 `--worktree`（可选创建 tmux 会话）。
8. `lockCurrentVersion`（`chunk-zw17mz74.js#bCe`，原生安装的 PID 锁），然后预取插件钩子。
9. 发送 `tengu_started` 事件。

### 3.5 交互与 print 的分叉

`prepareSession`（KSo）判断模式：

- 有 `-p`/`--print`，或 stdin 不是 TTY，或 `--output-format`/`--input-format` 为 stream-json 等，就返回 `kind: "prepared-headless"`。
- 否则返回 `prepared-interactive`。

`run` 把两条路分别接到 `runPreparedHeadless` 和 `runInteractiveSession`。

- **交互模式**（`_i`）：
  - 依次显示引导/信任/API key 确认等设置屏（`Si`，以及 `interactiveHelpers.tsx` 的 showSetupScreens/setupSteps）。
  - 处理 `--continue` / `--resume` / `--teleport` / `--from-pr`。
  - 调用 launchRepl，渲染 `<AppRoot><REPL/></AppRoot>`。
  - 托管设置未就绪时显示 “Loading your organization's managed settings…”（`chunk-7fw14qgv.js#Kji`）。
- **headless 模式**（`ro` → `e8e`）：
  - 校验 `--output-format` / `--input-format` 的组合。
  - 等待显式 `--mcp-config` 服务器（`t8e`）。
  - 用 `--agent` 选择主线程代理（`dU`）。
  - 建立 StructuredIO 或 RemoteIO，进入流式主循环 `$z`。
  - 结束时写入 result，并退出（见第 5 节）。

## 4. commander 命令树（chunk-cjydagjy#Lks buildCliProgram）

根命令有 133 个选项，类别和例子如下：

| 类别 | 选项 |
|---|---|
| 调试 | `-d`、`-d2e`、`--debug-file`、`--verbose` |
| 模式 | `-p`、`--bare`、`--safe-mode`、`--init`、`--init-only`、`--maintenance` |
| 输入输出 | `--output-format`、`--input-format`、`--json-schema`、`--include-hook-events`、`--include-partial-messages`、`--replay-user-messages`、`--await-initialize`、`--await-claim`、`--session-mirror` |
| 权限 | `--dangerously-skip-permissions`、`--allow-dangerously-skip-permissions`、`--permission-mode`、`--permission-prompt-tool`、`--permission-prompts`、`--allowedTools`、`--disallowedTools`、`--tools`、`--restricted` |
| 提示词 | `--system-prompt[-file]`、`--append-system-prompt[-file]`、`--append-subagent-system-prompt`/`--append-subagent-system-prompt-file`、`--plan-mode-instructions`、`--exclude-dynamic-system-prompt-sections` |
| 会话 | `-c`、`-r`、`--fork-session`、`--session-id`、`--resume-session-at`、`--no-session-persistence`、`--rewind-files`、`--prefill`/`--prefill-b64`、`--from-pr`、`-n` |
| 模型 | `--model`、`--effort`、`--fast-mode`、`--fallback-model`、`--thinking`、`--thinking-display`、`--max-thinking-tokens`、`--betas`、`--advisor`、`--allow-other-models` |
| 预算 | `--max-turns`、`--max-budget-usd`、`--task-budget` |
| 配置 | `--settings`、`--setting-sources`、`--managed-settings`、`--client-data-url`、`--mcp-config`、`--strict-mcp-config`、`--plugin-dir`/`--plugin-dir-no-mcp`、`--plugin-url`、`--add-dir`、`--project-config-root`、`--agents`、`--agent` |
| 团队/子代理 | `--agent-id`、`--agent-name`、`--team-name`、`--agent-color`、`--agent-type`、`--parent-session-id`、`--teammate-mode`、`--plan-mode-required` |
| 云端/远程 | `--sdk-url`、`--teleport`、`--cloud`、`--remote`、`--attach-serve`、`--environment`、`--pool`、`--remote-control`/`--rc`、`--forward-home-settings` |
| 其他 | `--ide`、`--desktop`、`--chrome`/`--no-chrome`、`-w`/`--tmux`、`--bg`、`--brief`、`--channels`、`--proactivity`、`--enable-auto-mode` |

子命令（“隐藏”指不出现在 help 里）：

- **`mcp`**：
  - add、xaa、serve（`entrypoints/mcp.ts` 的 startMCPServer，把自身工具作为 stdio MCP 服务器）；
  - remove、list、get、login、logout；
  - add-json、add-from-claude-desktop、reset-project-choices。
- **`plugin` / `plugins`**：
  - init、validate、tag、list、eval、details；test（隐藏）；
  - marketplace add / list / remove / update；
  - install、uninstall、prune、enable、disable、update、configure。
- **认证与账户**：`auth login` / `status` / `logout`；`setup-token`。
- **其他公开子命令**：`agents`、`ultrareview`。
- **`auto-mode`**：defaults / config / reset / critique。
- **维护类**：
  - `remote-control` / `rc`（隐藏）；
  - `doctor`；
  - `sandbox install` / `status` / `uninstall`（隐藏）；
  - `update` / `upgrade`；
  - `install [target]`；
  - `import`；`import-conversations`（隐藏）；
  - `purge`，以及旧名 `project purge`（隐藏）。
- **内部（隐藏）**：
  - `gateway`、`edit-hook`；
  - `edit-permission-rules`、`edit-memory-settings`、`edit-skill-overrides`、`edit-sandbox-settings`、`design-login`、`edit-chrome-settings`、`drop-worktree-registrations`（定义在 `chunk-bm6cnxej.js#Myo`）；
  - `APPLY_PROJECT_SETTINGS`。
- **只出现在 help 里的动词**：后台动词 attach / logs / stop(kill) / respawn / rm 在 help 里列出，实际由 cli.js 快速路径执行。

## 5. stream-json 输入输出协议

### 5.1 输出格式

`--output-format` 有三种取值：

- `text`：只输出最终文本。
- `json`：输出一条 result JSON。
- `stream-json`：NDJSON，每行一条消息。序列化用 `cli/ndjsonSafeStringify.ts`，转义 U+2028/U+2029（stream-json 版本还转义 U+0085），保证一行一条。

主要消息类型：

- **`system/init`**（构造在 `chunk-gr407tas`），字段：
  - `cwd`、`session_id`、`tools`、`mcp_servers`（元素 `{name, status, source?}`）、`model`、`permissionMode`；
  - `slash_commands`、`terminal_slash_commands`（可选）、`apiKeySource`、`betas`；
  - `claude_code_version`、`output_style`、`agents`、`skills`、`plugins`、插件错误。
- **`assistant` / `user`**：对话消息。
- **`stream_event`**：仅在 `--include-partial-messages` 时输出。
- **`system/*` 事件**：
  - 状态类：status、compact_boundary、api_retry、informational、notification、session_state_changed；
  - 模型回退类：model_fallback、model_consent_fallback、model_refusal_fallback、model_refusal_no_fallback；
  - 任务类：task_started、task_updated、task_progress、task_notification、background_tasks_changed；
  - 钩子类：hook_started、hook_progress、hook_response（需 `--include-hook-events`）；
  - 其他：files_persisted、post_turn_summary、session_title_changed、turn_preempted、ui_*（ui_status、ui_toast、ui_panes 等）。
- **`result`**，`subtype` 有 success、error_during_execution、error_max_turns、error_max_budget_usd、error_max_structured_output_retries。字段有：
  - `duration_ms`、`duration_api_ms`、`is_error`、`num_turns`、`stop_reason`；
  - `session_id`、`total_cost_usd`、`usage`、`modelUsage`；
  - 以及 result 文本或结构化输出。
- **`control_request` / `control_response`**：双向控制协议。

### 5.2 输入（StructuredIO，chunk-na0b3c5q#NTe）

`--input-format stream-json` 时逐行读取 stdin。`processLine` 按 `type` 分派：

- `keep_alive`：忽略。
- `update_environment_variables`：只允许白名单里的变量。
- `control_response`：匹配并 resolve 挂起的 `sendRequest`。
- `control_request`：交给 print 的处理器。
- `user` / `assistant` / `system`：作为输入消息排队。

CLI 也会主动向宿主发 `control_request`，见 5.3。`--sdk-url` 时换成 RemoteIO（chunk-z4g2ta8k#Q$）：

- 传输由 transportUtils 按 URL 选择：WebSocket，或 Hybrid（SSE 收 + POST 发）。
- 云会话下另有 CCRClient 处理注册、心跳和事件上报，WorkerStateUploader 上传 worker 状态。

### 5.3 control_request 子类型

**宿主发给 CLI**：print 里约 90 种，下面按用途分组。

| 用途 | 子类型 |
|---|---|
| 会话 | initialize、interrupt、end_session、claim_session、get_status、set_cwd、add_directory、register_repo_root |
| 模型与权限 | set_model、set_permission_mode、set_proactivity_level、apply_flag_settings、update_settings、get_settings、list_permission_rules |
| MCP | mcp_message、mcp_set_servers、mcp_status、mcp_call、mcp_authenticate、mcp_oauth_callback_url、mcp_clear_auth |
| 认证 | claude_authenticate、claude_oauth_callback、claude_oauth_wait_for_completion |
| 会话记录 | rewind_files、rewind_conversation、fork_conversation、export_conversation、seed_read_state、cancel_async_message、poll_event |
| 云会话 | list_cloud_sessions、get_cloud_session、get_cloud_session_transcript、remote_control、turn_handoff |
| 对话框 | get_memory_dialog、get_skills_dialog、get_chrome_dialog、get_chrome_browsers、select_chrome_browser、set_chrome_browser_hints、get_sandbox_dialog |
| 文件与工作区 | read_file、list_directory、file_suggestions、stage_file、get_workspace_diff、get_plan、start_shell_task |
| UI 宿主 | ui_attach、ui_detach、ui_render、ui_press、ui_input、ui_prompt_edit、ui_prompt_autocomplete、ui_select、ui_pane_show、ui_pane_focus、ui_close、ui_client_module、ui_client_press、ui_message、ui_client_fault |
| 插件与技能 | reload_plugins、reload_skills、channel_enable、set_prompt_suggestions_paused |
| 反馈 | submit_feedback、submit_survey_feedback、message_rated、side_question、ultrareview_launch |
| 设备 | register_device_hooks、upload_device_hook_template、remote_tools_announce |

云端会话还有一张路由表 `chunk-3wek6r2k.js#yc`，对每个子类型决定 forward / local / reject。表里还有：

- 2.1.88 原有的 set_max_thinking_tokens、mcp_toggle、mcp_reconnect、get_context_usage、stop_task、generate_session_title；
- get_session_cost、list_models、get_usage、get_binary_version、background_tasks、get_task_output、send_task_message、rename_session、set_color、mcp_read_resource 等。

**CLI 发给宿主**：can_use_tool、hook_callback、elicitation、mcp_message、request_user_dialog、oauth_token_refresh、host_auth_token_refresh，以及 remote_tool_call / remote_plumbing_call / remote_tools_probe 等。

### 5.4 退出码

| 情况 | 退出码 |
|---|---|
| 正常结束 | 0 |
| result 为错误（`is_error`） | 1 |
| runHeadless 抛出未捕获错误（`n8e`） | 写错误 result 后退出 1 |
| 输出写入失败（`s1`） | 记录致命错误后退出 |

信号退出时的退出码由 ShutdownCoordinator 决定（见第 9 节）。

## 6. 全局状态 bootstrap/state.ts（chunk-ndmse9kj）

### 6.1 结构

2.1.88 的 state.ts 是一个大 `STATE` 对象。316 改成两层：

- **会话层**：
  - `currentSession()`（`#t`）先看 AsyncLocalStorage 覆盖（子代理/teammate 通过 `setSessionOverridesGetter`（`chunk-ndmse9kj.js#mYi`）注入取值函数），没有覆盖就返回 `defaultRootSession`（`#y`）。
  - 会话对象由 `forkSessionWithProject`（`chunk-ndmse9kj.js#ze`）构造。根会话与 fork（withProject）共享各子存储。
  - `SessionScoped`（`#tt`）是以 `session.root` 为键的 WeakMap 槽位。
- **进程层**：`HostState`（`#Oe`）持有 13 个进程级存储；`HostScoped`（`#W`）是进程级单例槽位，`ds` 用来取值。

访问器绝大多数是单行函数 `t().<子存储>.<方法>()`，共约 427 个。命名规则（semantic 里已统一）：

- `replace<X>` 对应 `set<X>`，无参数时对应 `clear<X>`；
- 名词方法对应 `get<X>`；
- `subscribe…` 对应 `subscribeTo<X>`。

### 6.2 会话子存储（类名为压缩名）

| 存储 | 类 | 主要内容 |
|---|---|---|
| costLedger | `j` | totalCostUSD、API/工具时长、行数增减、modelUsage、safetyStops；费用保存/恢复（`registerSessionCostSaver`、`setCostStateForRestore`、`resetCostState`：`chunk-ndmse9kj.js#YSs`、`chunk-ndmse9kj.js#tws`、`chunk-ndmse9kj.js#Pft`） |
| requestJournal | `z` | lastAPIRequest、lastAPIRequestMessages、promptId/promptIndex、分类器请求、压缩前响应 |
| sessionFlags | `Z` | 本会话一次性标志：引导/LSP 推荐已显示、信任已接受、退出计划模式附件等（66 个方法） |
| sessionScratch | `ee` | planSlug 缓存、vim 状态、代理颜色、本会话创建的团队/窗格、待处理分支链接 |
| modelSelection | `V` | 主循环模型覆盖、effort、初始模型与来源层、组织默认、拒答回退锁存 |
| surfaceCapabilities | `te` | SDK 宿主声明的对话类型、停止按钮、子代理工具调用转发等能力 |
| userPresence | `ne` | 最后交互/提交时间、终端焦点、滚动空闲（活跃判断窗口 60 秒） |
| hookRegistry | `N` | 主线程代理类型与钩子、注册的 SDK/插件钩子 |
| invokedSkills | `_` | 已调用技能（按 agentId） |
| mcpSessionWiring | `G` | 已批准服务器、客户端访问器、工具替换器、连接 |
| promptAssembly | `J` | 系统提示词分段缓存、失效纪元与原因 |
| sessionCron | `Q` | 会话定时任务、在途 tick、keepalive 计数 |
| identity | `ie` | mainAgentId、projectDir |
| 其他 | | conversationLatches（`U`，粘性 beta、ATIS 锁存）、precompute（`oe`）、btwHistory（`he`）、pendingHint（`ge`）、writePermissionStash（`me`）、outsideReadPrompt（`se`）、pluginsSync（`de`）、promptSuggestion（`ue`）、sessionRefsGate（`ce`）、workflowUsageConsent（`ae`）、usageCreditsOnlyModelConsentSlots（`q`）、engineStore（`re`）、ccrRecap（`le`）、autonomousLoopPreamble（`pe`）、observers（`D`） |

会话的 `project` 字段包含 originalCwd、projectRoot、cwd。三者分别由 `setOriginalCwd`（`chunk-ndmse9kj.js#nM`）、`setProjectRoot`（`chunk-ndmse9kj.js#jMe`）、`setCwdState`（`chunk-ndmse9kj.js#Tft`） 修改，`setSessionProject`（`chunk-ndmse9kj.js#pLn`）一次合并修改。读取 `getCwdState`（`chunk-ndmse9kj.js#dT`） 时如果没有 project，抛出 NoProjectDirectoryError。

### 6.3 进程级存储（HostState）

| 存储 | 类 | 主要内容 |
|---|---|---|
| launchOptions | `Se` | isInteractive、printOutputFormat、permissionPromptToolName、hasStreamingInput、单次 -p 判定等（115 个方法） |
| settingsSource | `ye` | --settings 路径/内联内容/固定内容、--agents/--mcp-config 文件、父进程托管设置 |
| extensionsConfig | `be` | 内联插件、插件 URL、同步插件目录与签名、官方市场 |
| modelStringsCache | `ke` | 模型字符串、管理员 3P steering 快照 |
| diagnostics | `Ce` | 错误日志、慢操作、dev bar 告警 |
| telemetryHandles | `Re` | OTel meter 与 8 个计数器（session/loc/pr/commit/cost/token/code_edit_tool.decision/active_time）、LoggerProvider、statsStore |
| credentialSlots | `xe` | 会话入口令牌、推理请求令牌、fd 传入的 OAuth 令牌/范围、后台快照里的组织 |
| mcpProcessWiring | `Pe` | direct-connect 服务器、非阻塞连接、strict 配置 |
| requestLatches | `Me` | 1h 缓存白名单、thinking 类型覆盖、模型不支持 effort/结构化输出/1M 的锁存 |
| accountCreditLatches | `Te` | 1M 上下文额度阻断、需要用量额度 |
| proactivity | `we` | 主动性选择器开关与订阅 |
| backgroundHousekeeping | `Ae` | 后台清理的一次性认领 |
| clock | — | 时钟 |

## 7. 配置迁移

迁移版本 `CURRENT_MIGRATION_VERSION`（`chunk-cjydagjy.js#Ne`）为 **14**，2.1.88 为 11。

`runMigrations`（`#$t`）的规则：

- 全局配置 `migrationVersion` 已等于 14 时直接返回。
- `CLAUDE_CODE_CCR_SKIP_FRESH_MIGRATIONS` 为真、在 CCR 中、且配置是全新的（`shouldSkipFreshMigrations`（`chunk-cjydagjy.js#xo`））时，直接写入版本 14 和各完成标记，不跑迁移。
- 其余情况按下列顺序执行。任何一个写设置的迁移失败，就跳过版本号更新（日志写 “Skipping migrationVersion bump…”），下次启动整组重跑。

| 顺序 | 迁移 | 说明 |
|---|---|---|
| 1 | migrateAutoUpdatesToSettings (`Mt`) | autoUpdates=false → env.DISABLE_AUTOUPDATER |
| 2 | migrateBypassPermissionsAcceptedToSettings (`It`) | 挪到用户设置 |
| 3 | resetProToOpusDefault (`Wt`) | Pro 一方用户默认模型标记（不计失败） |
| 4 | migrateSonnet1mToSonnet45 (`Nt`) | |
| 5 | migrateLegacyOpusToCurrent (`Ht`) | |
| 6 | migrateSonnet45ToSonnet46 (`Ut`) | |
| 7 | migrateOpusToOpus1m (`Bt`) | |
| 8 | **migrateModelAliases** (`Rt`) | 316 新增：模型别名规范化 |
| 9 | **migrateFable5ToFableAlias** (`Dt`) | 316 新增：Fable 5 固定名改为 fable 别名 |
| 10 | migrateReplBridgeEnabledToRemoteControlAtStartup (`jt`) | 不计失败 |
| 11 | **migrateUserIntentToSettings** (`Vt`) | 316 新增 |
| 12 | **migrateNotificationDismissals** (`xt`) | 316 新增，不计失败 |
| 13 | resetAutoModeOptInForDefaultOffer (`Gt`) | |

每次启动时，`runAllMigrations`（`#ao`）还会对当前项目执行 migrateEnableAllProjectMcpServersToSettings，不受版本号限制。2.1.88 的 migrateFennecToOpus 在 316 中已删除。

## 8. 自动更新与安装

### 8.1 安装方式

`cli/update.ts` 的 update（3 万字节）会先识别当前的安装类型，取值有：

- `native`：`~/.local/bin/claude` 指向版本目录；
- `npm-global`；
- `npm-local`：`~/.claude/local`；
- `package-manager`：Homebrew、winget、apt/dnf、mise/asdf 等，由 `utils/nativeInstaller/packageManagers.ts` 识别；
- `development`。

各类型的更新方式：

- **native**：原生安装器（`utils/nativeInstaller/*`）。
  - 下载源是 `https://downloads.claude.ai/claude-code-releases`，读清单（`manifest.zst.json`），校验 sha256 和签名。
  - 版本解析见 `chunk-zw17mz74.js#L6n`，会拒绝 99.99.* 测试版本。
  - 下载 120 秒无数据就超时（`$un`）。
  - 先写到 staging，再校验（`Fun`），之后切换启动器符号链接并清理旧版本。
  - 运行中的版本由 `pidLock.ts` 的 PID 锁保护。
  - 迁移到原生安装后，会卸载全局 npm 包（`cleanupNpmInstallations`），并删除 shell 配置里的 alias（`cleanupShellAliases`）。
- **npm-global / npm-local**：
  - 用 `npm view @anthropic-ai/claude-code@stable|latest` 查版本，再 `npm install -g`；
  - 先检查全局前缀是否可写（`checkGlobalInstallPermissions`，`chunk-6zvphrsz.js#VKs`）。
- **package-manager**：只提示用户用对应的包管理器升级。

### 8.2 自动更新（utils/autoUpdater.ts）

- **节流**：5 分钟内检查过就跳过（`isAutoUpdateCheckThrottled`，`chunk-6zvphrsz.js#Lbt`）。锁文件是 `~/.claude/.update.lock`，5 分钟过期。
- **版本上限**：GrowthBook `tengu_max_version_config`，读 `external` 和 `external_message` 字段。当前版本高于上限时强制降级（`getMaxVersion`、`set`、`getMaxVersionMessage`：`chunk-6zvphrsz.js#B6n`、`chunk-6zvphrsz.js#KKs`）。
- **canary 通道**：`tengu_canary`。
- **跳过版本**：`shouldSkipVersion`（`chunk-6zvphrsz.js#iet`）。
- **关闭**：设置 `DISABLE_AUTOUPDATER`，或设置文件中 `autoUpdates=false`（旧值由迁移 1 转换）。
- **doctor**（`utils/doctorDiagnostic.ts`）检查：安装类型、多重安装、PATH 与别名、ripgrep、自动更新权限、包管理器，以及上下文警告（`utils/doctorContextWarnings.ts`）。

## 9. 优雅退出与清理

### 9.1 ShutdownCoordinator（chunk-e6aww6q8#X9s）

- **`install()`**（由 setupGracefulShutdown 调用）注册以下处理器：
  - SIGINT、SIGTERM、SIGHUP；
  - `uncaughtException`、`unhandledRejection`（记录后按致命错误退出）。
- **`shutdown(code, reason)`** 同一进程只执行一次，顺序为：
  1. cleanupTerminalModes：退出备用屏，恢复光标、鼠标模式和 kitty 键盘协议。
  2. printResumeHint：打印 “claude --resume <id>” 提示。
  3. 执行已注册的清理回调，带超时（超时抛 CleanupTimeoutError）。
  4. 运行 SessionEnd 钩子。
  5. 刷出分析事件与 1P 日志，等待 OAuth 写盘。
  6. 排空 stdout：预算从 2 秒起，按积压字节最多 30 秒（`utils/process.ts` 的 `lco`、`aco`）。
  7. forceExit，并设置失效保险定时器，防止进程挂住。
- **导出函数**：`gracefulShutdown`（`er`，异步）、`gracefulShutdownSync`（`hi`，触发后立即返回）、`setupGracefulShutdown`（`chunk-e6aww6q8.js#dzo`）。2.1.88 的 shutdown1PEventLogging 是误配。

`utils/process.ts` 负责处理 stdout/stderr 断管（EPIPE/EIO），出错时销毁流而不让进程崩溃（`handleStreamGoneErrors`、`registerProcessIOErrorHandlers`、`handleEPIPE`：`chunk-j3nx1xyn.js#dke`、`chunk-j3nx1xyn.js#Abs`、`chunk-24t3dkzb.js#KUn`），并统计丢弃的 stderr 消息数。

`cli/exit.ts` 提供两个出口：`cliError`（`hn`，打印后退出 1）和 `cliOk`（打印后退出 0）。

### 9.2 清理（utils/cleanup.ts）

- **按保留期清理**：后台按 `cleanupPeriodDays`（默认 30）清理过期的会话记录、日志、粘贴/图片缓存、文件历史、旧原生版本等。
- **节流标记**：用 `~/.claude/.last-cleanup` 节流；该标记异常时修复，并上报 `tengu_cleanup_throttle_marker`（`healRefusedSentinelLeaf`，`chunk-23fm9f0d.js#XOo`）。
- **staging 标记**：每个进程删除一次过期 1 天的 staging 标记（`.npm-cache-cleanup`、`.version-cleanup` 等，`reapStaleHousekeepingStagingFiles`，`chunk-23fm9f0d.js#JOo`）。
- **并发**：后台清理由 HostState.backgroundHousekeeping 认领，同一进程只执行一次。

## 10. 上游代理（upstreamproxy/）

CCR 云容器里，代理令牌通过文件描述符传入（`CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR`）。`initAgentProxy` 的步骤：

1. 在本地启动中继（`relay.ts`），把 CONNECT 隧道经 WebSocket 转发到 CCR 代理。
2. 设置 `HTTPS_PROXY`/`HTTP_PROXY`/`NO_PROXY`，写出合并后的 CA 包（系统 CA 来自 `findSystemCaBundle`（`chunk-awy329vy.js#JLs`），再加 CCR CA）。
3. 准备 gh 替身目录（`getGhStandinDir`，`chunk-awy329vy.js#SGi`），供子进程 `gh` 走代理认证。

另有 `CCR_AGENT_PROXY_RELAY_MODE` 独立中继模式，由 init 的第 2 步进入。

## 11. 环境变量与特性开关

本领域代码读取的环境变量共 122 个，清单在 `docs/handbook/data/bootstrap/env.tsv`。实测数量见 verify.md 7.1：`--version` 读 11 个，`--help` 读 149 个，`-p hi` 读 519 个。启动阶段的主要变量：

- **入口**：
  - CLAUDE_CODE_REMOTE、CLAUDE_CODE_REMOTE_SESSION_ORIGIN；
  - CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR、CCR_AGENT_PROXY_RELAY_MODE；
  - CLAUDE_CODE_HOVER_REST、CLAUDE_CODE_SIMPLE（`--bare`）。
- **配置与迁移**：CLAUDE_CONFIG_DIR、CLAUDE_CODE_CCR_SKIP_FRESH_MIGRATIONS。
- **凭证**：CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR、CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR、ANTHROPIC_API_KEY、CLAUDE_CODE_OAUTH_TOKEN。
- **网络**：NODE_EXTRA_CA_CERTS、HTTPS_PROXY、NO_PROXY、CLAUDE_CODE_CLIENT_CERT / KEY（mTLS）。
- **更新与遥测**：DISABLE_AUTOUPDATER、CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC、DISABLE_TELEMETRY。
- **SDK**：CLAUDE_CODE_ENTRYPOINT、CLAUDE_AGENT_SDK_VERSION 等。

本领域涉及的 GrowthBook 开关（都在代码上下文中核对过）：

| 开关 | 作用 |
|---|---|
| `tengu_sable_orrery` | 后台会话（--bg / 后台动词） |
| `tengu_noble_wozniak` | agents 视图 |
| `tengu_hover_rest` | v5 存储的 hover-rest 固定 |
| `tengu_bg_worker_ctty` | 后台 worker 控制终端 |
| `tengu_canary`、`tengu_max_version_config` | 更新通道与版本上限 |
| `tengu_quizzical_giraffe`、`tengu_typed_treasure`、`tengu_windows_credman` | 启动期凭证/存储相关开关 |
| `tengu_dapper_platypus`、`tengu_gentle_hummingbird`、`tengu_ptc_enabled` | prepareSession 中的会话特性 |
| `tengu_ccr_unread_state_exit_killswitch`、`tengu_ccr_orphan_restore_wake` | CCR 云会话退出/恢复 |
| `tengu_chrome_auto_enable`、`tengu_ide_rc_auto_enable` | Chrome 集成与 IDE 远程控制自动开启 |
| `tengu_iterative_aurora`、`tengu_humming_waterfall`、`tengu_cloud_session_shell`、`tengu_mcp_startup_policy_seed` | 启动期其他开关 |

## 12. 与 2.1.88 的差异

1. **cli.js 快速路径大幅扩展**：新增后台会话（--bg、attach/logs/stop/respawn/rm）、daemon、agents 视图、self-hosted-runner、--gh-standin、--handle-uri、--runner-declares、Chrome native host、eval mock server 等分支；`--bare` 变成在入口处设置 CLAUDE_CODE_SIMPLE。
2. **启动结构**：main 拆成 applyClientTypeAndEarlySettings、run 和 buildCliProgram；根 action 改为 prepareSession 返回 prepared-headless 或 prepared-interactive，再由 run 分别接入。2.1.88 是在 action 里直接分支。
3. **子命令**：新增以下内容：
   - plugin 的 init/validate/tag/eval/test/details/prune/configure；
   - mcp 的 xaa 与 login/logout；
   - auto-mode critique、ultrareview、sandbox、import/import-conversations、purge、gateway、install [target]；
   - 一批隐藏的 edit-* 内部命令。
   根命令选项增加到 133 个。
4. **控制协议**：print 处理的 control_request 子类型从约 36 种增加到约 90 种，新增 claim_session、get_status、set_cwd、ui_* 一族、云会话列表与记录、文件与工作区、设备钩子等。云会话增加了 forward/local/reject 路由表。
5. **全局状态重构**：单一 STATE 对象改为“会话对象（约 30 个子存储）+ AsyncLocalStorage 覆盖 + HostState（13 个进程级存储）”，访问器统一为 `t().<存储>.<方法>()` 形式。
6. **迁移**：版本 11 → 14；新增 migrateModelAliases、migrateFable5ToFableAlias、migrateUserIntentToSettings、migrateNotificationDismissals；删除 migrateFennecToOpus；新增 CCR 全新配置跳过逻辑，以及“写设置失败则不升版本”的规则。
7. **安装**：原生安装器下载源改为 downloads.claude.ai，清单为 zst 压缩并带签名；新增 PID 锁、staging 校验、120 秒下载停滞超时。
8. **退出**：gracefulShutdown 改为 ShutdownCoordinator 类，新增 stdout 排空预算、外部时钟驱动排空、失效保险定时器。
9. **运行环境**：最低 Node 版本从 18 提高到 22。

## 13. 未解之处

- `chunk-aepeg2w5.js#GY`、`#Xg`、`#$Y`，以及 `chunk-z4g2ta8k.js#uo` 中的 Xn、Qn、co 与 `chunk-z4g2ta8k.js#mo` 中的 _o（均在 `cli/remoteIO.ts`）：多声明符 var，未命名，含义不确定。
- `chunk-19arrzdw.js#aLt`/`#MLi`（replLauncher）写作时不在本领域模块清单里（在 `_unattributed`），只作了说明，没有命名；现为 `replLauncher.ts` 的 `launchSessionRepl`/`launchRepl`。
- `chunk-x4gcvpxy.js#dOs`：被归到 nativeInstaller；2.1.88 的名字 detectHomebrew 不符，实际行为与 macOS 后台进程路径/TCC 有关，待 agents 或 bridge 领域确认。
- `chunk-21ppfwx8.js#Eii`：下载插件归档，被误归到 nativeInstaller/download.ts。
- `chunk-aepeg2w5.js#exn`、`#ras`：Chrome MCP 与 MCP 配置校验，被归到 print.ts，可疑。
- 部分 sessionFlags 和 requestLatches 访问器只有规则生成的说明（“读/写当前会话 … 上的 X()”），没有逐个确认调用方的语义。
- `tengu_quizzical_giraffe`、`tengu_typed_treasure`、`tengu_iterative_aurora`、`tengu_humming_waterfall` 的具体业务含义没有逐一追到调用方。

## 14. 引用校验结果

校验时间 2026-11-04 06:40（UTC），对象为当时的 `reconstructed/`。脚本检查本文所有代码样式引用：路径是否存在（相对仓库根，或相对 `reconstructed/src/`，`.ts/.tsx` 对应 `.js`）；声明 id 是否在 `reconstructed/symbols.jsonl`；"路径 · 函数名"中的函数是否属于该文件；标识符与字面量是否出现在 `reconstructed/symbols.jsonl` 或阅读树代码中。在 2.1.316 找不到、但在 2.1.88 源码（`references/claude-code-analysis/src`）中存在的，计为"只在 2.1.88 中存在"（删除项、旧名，属预期）。

- 共检查 525 处引用：路径 65/65，字面量 181/181，声明id 84/84，名字 194/195（另 1 个只在 2.1.88 中存在）；占位符与含空格的说明性文字 113 处未检查。
- 只在 2.1.88 中存在（删除项或旧名，预期如此）：`WRt`
- 未通过：0 处。
