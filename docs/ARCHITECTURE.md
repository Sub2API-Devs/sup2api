# Claude Code 2.1.316 架构总览

> 读者：第一次接触这份重建代码的人和 AI。本文给出整体分层、一次请求从输入到结束的完整路径、子系统一览、构建事实和读代码的约定。细节在 `docs/handbook/` 的 10 本子系统手册里，本文每一节都给出对应手册章节。
>
> 依据：`reconstructed/`（阅读树）、`reconstructed/symbols.jsonl`（符号索引）、`analysis/segments/*`、`analysis/vendor/packages.json`、各手册与过程文档。路径一律写阅读树里的实际路径（`reconstructed/src/...js`）；手册里常见的 `xxx.ts`/`xxx.tsx` 是 2.1.88 源码的原始文件名，对应阅读树里同路径的 `.js` 文件。函数名后面括号里的 `chunk-xxx.js#压缩名` 是声明 id，可用 `node tools/q.mjs show <id>` 查看原始代码。文末附引用校验结果。

## 目录

1. 这是什么
2. 分层结构图
3. 启动：入口、命令树与两种运行模式
4. 一次请求的完整旅程
5. 横切子系统：工具与权限、扩展、状态与配置、终端 UI、代理与远程、遥测
6. 子系统一览表
7. 构建事实
8. 读代码时需要知道的约定
9. 已知限制
10. 引用校验结果

---

## 1. 这是什么

官方 Claude Code CLI **2.1.316**（linux-x64 单文件可执行，Bun 1.4.4 打包）经 AST 分析还原出的可读源码树：

| 部分 | 内容 | 规模（`analysis/segments/summary.json`） |
|---|---|---|
| `reconstructed/src/` | 一方代码，按 2.1.88 的目录布局重新聚合成模块 | 5,023 个模块、75,181 个顶层声明、31.7 MB（原始代码字节） |
| `reconstructed/vendor/` | 第三方 npm 包，按包/文件还原 | 1,989 个模块、7.2 MB |
| `reconstructed/runtime/` | Bun 运行时帮助函数（即 esbuild 风格的 __commonJS、__toESM 等） | 1 个模块 |
| `reconstructed/assets/` | 资源（提示词、Skill 文档、字体、原生模块的占位等） | — |
| `reconstructed/manifest.json` | 每个阅读树文件 → 来源路径、声明 id、chunk、归属方法、导入导出 | 7,013 条 |
| `reconstructed/symbols.jsonl` | 每个绑定一行：名字、文件:行、声明 id、命名来源、类别、说明 | 约 100,840 行 |

另有 `runnable/`（不入库）：同一套命名应用到原 chunk 布局上的可运行树，经 α 等价校验（400 万标识符 0 差异）与 54 个场景对拍（见 `docs/process/rename.md`、`docs/process/verify.md`）。**阅读树本身不保证可运行**，它是给人和 AI 读的。

---

## 2. 分层结构图

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ① 入口  entrypoints/cli.js · cliMain                                                      │
│    快速路径（不加载主模块）：--version、daemon、--bg/attach/logs/stop、agents 视图、          │
│    remote-control、self-hosted-runner、Chrome native host、--gh-standin、--handle-uri …     │
└───────────────────────────────┬──────────────────────────────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ② 启动与命令树  main.js · main → run → buildCliProgram（commander，133 个根选项 + 子命令）   │
│    preAction：entrypoints/init.js · init（配置、迁移、代理/mTLS、1P 日志、托管设置预取）       │
│    根 action：cli/startup/prepareSession.js · prepareSession → setup.js · setup             │
└──────────────┬───────────────────────────────────────────────┬───────────────────────────┘
       prepared-interactive                              prepared-headless（-p / stream-json / SDK）
               ▼                                               ▼
┌──────────────────────────────────┐         ┌───────────────────────────────────────────────┐
│ ③a 交互 REPL                      │         │ ③b headless / SDK                              │
│  replLauncher.js → screens/REPL.js│         │  cli/print.js · runHeadless → runHeadlessStreaming│
│  控制器 screens/repl/*            │         │  cli/structuredIO.js / cli/remoteIO.js          │
│  （TurnController、PromptSubmit…） │         │  QueryEngine.js · ask / QueryEngine             │
└──────────────┬───────────────────┘         └──────────────────────┬────────────────────────┘
               └──────────────────────┬──────────────────────────────┘
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ④ 共用查询引擎  engine/queryEngine.js · createQueryEngine                                  │
│    utils/processUserInput/*（斜杠命令、bash 模式、@提及、UserPromptSubmit 钩子）             │
└───────────────────────────────┬──────────────────────────────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ⑤ 查询循环  query.js · query → queryLoop（每轮：压缩 → 提示词 → 请求 → 工具 → NEXT_ROUND）  │
│    query/*（模型选择、拒答回退、流式回退、停止钩子…）  services/compact/*（自动/预计算/反应式压缩）│
│    constants/prompts.js（系统提示词组合器）  utils/attachments.js（每轮附件）                │
└──────────┬────────────────────────────────────────────────────┬──────────────────────────┘
           ▼                                                    ▼
┌──────────────────────────────────────┐   ┌───────────────────────────────────────────────┐
│ ⑥ API 客户端                          │   │ ⑦ 工具与权限                                    │
│  services/api/claude.js · queryModel  │   │  services/tools/StreamingToolExecutor.js        │
│  services/api/withRetry.js（~40 种自愈）│   │  services/tools/toolExecution.js（单次调用）     │
│  services/api/client.js               │   │  utils/permissions/*（规则/模式/自动模式分类器）  │
│  vendor @anthropic-ai/sdk 0.128.0     │   │  tools/*（约 80 个内建工具）、Shell、沙箱         │
└──────────────────────────────────────┘   └───────────────────────────────────────────────┘

横切（被上面各层调用）：
  ⑧ 扩展      services/mcp/*（两代 MCP 客户端）、utils/plugins/*、plugins/functionHooks/*（mods 函数钩子）、
              skills/*、utils/hooks.js（33 个钩子事件）、services/lsp/*、utils/claudeInChrome/*
  ⑨ 状态配置  bootstrap/state.js（会话对象 + 进程级存储）、utils/settings/*、utils/config.js（~/.claude.json）、
              utils/sessionStorage.js（转录）、memdir/*、utils/claudemd.js、utils/auth.js、utils/model/*
  ⑩ 终端 UI   components/*、hooks/*、ink/*（自维护 Ink 分支）、keybindings/*、vim/*、native-ts/*
  ⑪ 代理远程  tools/AgentTool/*、tasks/*、utils/swarm/*、coordinator/*、bridge/*（Remote Control）、remote/*、
              cli/headlessCloud/*（--cloud）、services/remoteTools/*、services/daemon/*、selfHostedRunner/*
  ⑫ 遥测      services/analytics/*（logEvent、GrowthBook、Datadog、1P 事件日志）、utils/telemetry/*（OTel）
```

（图中路径都相对 `reconstructed/src/`。）

---

## 3. 启动：入口、命令树与两种运行模式

详见 `docs/handbook/bootstrap.md` 第 3–5 节。

| 步骤 | 文件 | 函数（声明 id） | 作用 |
|---|---|---|---|
| 1 | `reconstructed/src/entrypoints/cli.js` | `cliMain`（`cli.js#qe`） | 设置几个进程级环境变量，依次检查约 18 条快速路径，命中就直接处理返回；否则开始捕获早期输入，`import()` 主模块 |
| 2 | `reconstructed/src/main.js` | `main`（`chunk-shkzs7rp.js#Gu`）→ `run`（`#fi`） | 早期设置（clientType、`--settings` 早读），建命令树并 `parseAsync` |
| 3 | `reconstructed/src/main.js` | `buildCliProgram`（`chunk-cjydagjy.js#Lks`） | commander 树：133 个根选项；`mcp`、`plugin`、`auth`、`auto-mode`、`doctor`、`update`、`install`、`gateway` 等子命令 |
| 4 | `reconstructed/src/entrypoints/init.js` | `init`（`chunk-vbtpanx5.js#GEo`，memoize）→ `initImpl`（`#Q`） | 配置读取、存储后端选择、远程托管设置预热、CA/mTLS/代理、`setupGracefulShutdown`、1P 事件日志、API 预连接；`CLAUDE_CODE_REMOTE` 时启动上游代理 |
| 5 | `reconstructed/src/main.js` | `runMigrations`（`chunk-cjydagjy.js#$t`） | 配置迁移（版本 11 → 14） |
| 6 | `reconstructed/src/cli/startup/prepareSession.js` | `prepareSession`（`chunk-3wek6r2k.js#KSo`） | 调 `setup`，准备工具/命令/代理/MCP 配置、权限上下文、模型；返回 `prepared-headless` 或 `prepared-interactive` |
| 7 | `reconstructed/src/setup.js` | `setup`（`chunk-fhdzwff4.js#Nt`） | Node ≥ 22 检查、`--session-id`、UDS 消息套接字、chdir、钩子配置快照、`--worktree`、版本锁、`tengu_started` |
| 8a | `reconstructed/src/main.js` | `runInteractiveSession`（`chunk-shkzs7rp.js#_i`）→ `runOnboardingAndSetupScreens`（`#Si`） | 引导/信任屏，处理 `--continue/--resume/--teleport/--from-pr`，然后 `launchRepl` |
| 8a' | `reconstructed/src/replLauncher.js` | `launchRepl`（`chunk-19arrzdw.js#MLi`） | 渲染 `App` + `REPL` |
| 8b | `reconstructed/src/main.js` | `runPreparedHeadless`（`chunk-cjydagjy.js#ro`） | → `reconstructed/src/cli/print.js` · `runHeadless`（`chunk-tyg7f3ek.js#e8e`）→ `_runHeadlessStreamingForTesting`（即 runHeadlessStreaming，`#$z`） |

`prepareSession` 判定 headless 的条件：有 `-p/--print`、stdin 不是 TTY、或 `--output-format`/`--input-format` 为 stream-json 等。headless 下输入输出走 `reconstructed/src/cli/structuredIO.js` · `StructuredIO`（本地 stdio NDJSON）或 `reconstructed/src/cli/remoteIO.js` · `RemoteIO`（云 worker），协议是 stream-json 消息 + `control_request/control_response`（316 有约 98 种请求子类型，见 `docs/handbook/agents.md` 第 5 节）。

退出统一走 `reconstructed/src/utils/gracefulShutdown.js` · `ShutdownCoordinator` / `gracefulShutdown`（stdout 排空预算、失效保险定时器）。

---

## 4. 一次请求的完整旅程

以"用户在 REPL 输入一句话、模型调用一次 Bash 工具、再给出回答"为主线；`-p` 的不同之处单独标出。各步骤的细节见 `docs/handbook/query.md` 第 2–12 节、`docs/handbook/tools.md` 第 5 节、`docs/handbook/permissions.md` 第 5 节、`docs/handbook/ui.md` 第 3–6 节。

### 4.1 时序总览

```
[REPL] PromptInput ─Enter─► PromptSubmitController.submit ─► handlePromptSubmit ─► executeUserInput
[-p]   StructuredIO 读 stdin ─► runHeadlessStreaming ─► ask ─► QueryEngine.submitMessage
                    │                                                │
                    └──────────────► processUserInput ◄──────────────┘   （斜杠命令 / bash / 附件 / 钩子）
                                          │ messages, shouldQuery
                                          ▼
               TurnController / createQueryEngine ─► query ─► queryLoop
                                          │
   ┌──────────────────── 每轮 runIteration ──────────────────────────────────────────────┐
   │ 折叠队列命令 → applyToolResultBudget → 选模型 → deps.autocompact → 阻断上限检查       │
   │ → 请求前公告/附件 → recordPromptSnapshot（system 提示词回放）                         │
   │ → deps.callModel = queryModelWithStreaming → queryModel                             │
   │      normalizeMessagesForRequest → buildSystemPromptBlocks → withRetry{               │
   │        getAnthropicClient → addCacheBreakpoints → beta.messages.create(stream:true) } │
   │      → SSE：content_block_stop 时产出一条 assistant 消息                              │
   │ → assistant 中的 tool_use 立即交 StreamingToolExecutor.addTool（边流边执行）           │
   │      runToolUse → checkPermissionsAndCallTool：校验 → PreToolUse → 权限 → call → 结果  │
   │ → 流结束：恢复分支（反应式压缩、max_tokens 续写、截断续写、畸形 tool_use…）            │
   │ → 无工具：Stop 钩子 → completed      有工具：收齐结果 + getAttachments → NEXT_ROUND    │
   └─────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 第 1 步：输入与提交

| 环节 | 文件 | 函数（声明 id） | 说明 |
|---|---|---|---|
| 输入框 | `reconstructed/src/components/PromptInput/PromptInput.js` | `PromptInput`（`chunk-18hwfzwa.js#d9e`） | 按键经 `usePasteHandler` → `useTextInput`/`useVimInput` → `useTypeahead`；草稿存在 `PromptDraft` store 而非组件 state |
| 草稿 | `reconstructed/src/screens/repl/PromptDraft.js` | `PromptDraft` | value、cursorOffset、mode（prompt/bash）、pastedContents（`[Image #N]`、`[Pasted text #N]` 引用） |
| 提交控制器 | `reconstructed/src/screens/repl/PromptSubmitController.js` | `PromptSubmitController`（`chunk-18hwfzwa.js#yte`） | 分流：bash 模式、`/exit` 等本地命令、`local-jsx` 命令（打开对话框）、普通提示词；回合进行中再提交进入消息队列 |
| 提交处理 | `reconstructed/src/utils/handlePromptSubmit.js` | `handlePromptSubmit`（`chunk-18hwfzwa.js#DV`）→ `executeUserInput`（`#Ekt`） | 展开粘贴引用后调用 `processUserInput` |
| 回合控制器 | `reconstructed/src/screens/repl/TurnController.js` | `TurnController`（`chunk-18hwfzwa.js#ste`） | 一个回合的生命周期：建 ToolUseContext（`runQuery: query`）、跟踪进行中回合、中断与收尾 |
| REPL 侧引擎 | `reconstructed/src/screens/repl/ReplSessionScope.js` | `runWithQueryParams`（`chunk-18hwfzwa.js#Mie`） | 用 `createQueryEngine({run: query, …})` 建 REPL 的查询引擎 |

**`-p` 的不同**：`reconstructed/src/cli/print.js` · `_runHeadlessStreamingForTesting`（即 runHeadlessStreaming）读 stdin/参数里的消息与 `control_request`，调 `reconstructed/src/QueryEngine.js` · `ask`（`chunk-tyg7f3ek.js#hm`）。`ask` 解析惰性配置、按权限模式定主循环模型与 thinking，用 `createHeadlessToolUseContext`（`#Mp`）建上下文，交给 headless 引擎 `QueryEngine`（`#nI`，旧版的 QueryEngine 类在 316 被拆散）的 `submitMessage`。

### 4.3 第 2 步：处理用户输入

| 环节 | 文件 | 函数（声明 id） | 说明 |
|---|---|---|---|
| 共用引擎 | `reconstructed/src/engine/queryEngine.js` | `createQueryEngine`（`chunk-xx1vmpsq.js#vpt`） | 2.1.316 新增：REPL/print/SDK 共用，产出 `system/init`、`stream_event`、`result` 等 SDK 消息，处理中断与命令生命周期，内部调用传入的 `run`（即 `query`） |
| 输入分发 | `reconstructed/src/utils/processUserInput/processUserInput.js` | `processUserInput`（`chunk-xx1vmpsq.js#jLt`） | 斜杠命令、bash 模式、普通提示词、@提及附件、图片；`UserPromptSubmit` 钩子（`reconstructed/src/utils/hooks.js` · `executeUserPromptSubmitHooks`）；返回要追加的消息与 `shouldQuery` |
| 斜杠命令 | `reconstructed/src/utils/processUserInput/processSlashCommand.js` | `processSlashCommand`（`chunk-3g0djq3w.js#Ezi`）→ `getMessagesForSlashCommand`（`#co`） | 查找命令（`reconstructed/src/commands.js` · `findCommand`、`getCommands`），按类型执行：`local`（产出 `<local-command-stdout>`）、`local-jsx`（打开对话框）、`prompt`（展开成用户消息，`getMessagesForPromptSlashCommand`；`context:"fork"` 走 `executeForkedSlashCommand`） |
| 消息构造 | `reconstructed/src/utils/messages.js` | `createUserMessage`（`chunk-e6aww6q8.js#De`） | 内部消息模型：user / assistant / attachment / system / progress |

`shouldQuery` 为假（例如纯本地命令）时到此结束；否则进入查询循环。

### 4.4 第 3 步：进入查询循环

| 环节 | 文件 | 函数（声明 id） | 说明 |
|---|---|---|---|
| 入口 | `reconstructed/src/query.js` | `query`（`chunk-ha3km179.js#J$`） | 确保工具初始化、建转录 tap；主线程挂代理观察者时走 `queryWithObserverTap`（`#iy`）；结束时为本轮吸收的命令发 `command_lifecycle` |
| 主循环 | `reconstructed/src/query.js` | `queryLoop`（`chunk-ha3km179.js#xc`，约 75 KB） | `while(true){ r = yield* runIterationRecordingErrors(); if (r !== NEXT_ROUND) return r }`；2.1.88 是每轮递归调用 `query()`，316 改成哨兵 `NEXT_ROUND`（`#Oo`） |
| 依赖 | `reconstructed/src/query/deps.js` | `productionDeps`（`chunk-ha3km179.js#qu`） | `callModel = queryModelWithStreaming`、`autocompact = runAutoCompactIfNeeded`、`uuid`、`now` |
| 配置 | `reconstructed/src/query/config.js` | `buildQueryConfig`（`chunk-ha3km179.js#Lu`） | 工具使用摘要、fast mode 开关 |

### 4.5 第 4 步：每轮开头（压缩、模型、上下文）

`queryLoop` 内的 `runIteration` 依次执行（`docs/handbook/query.md` 4.2 节有完整 13 步）：

| 环节 | 文件 | 函数（声明 id） | 说明 |
|---|---|---|---|
| 轮首折叠 | `reconstructed/src/query.js` | `absorbQueuedPollEvents`（`#Rc`）、`createFoldCommandFilter`（`#wc`）、`isCommandFoldable`（`#dy`） | 把队列里可折叠的 poll 事件、排队命令吸收进本轮；等相关记忆召回预取（最多 2 秒） |
| 工具结果预算 | `reconstructed/src/utils/toolResultStorage.js` | `applyToolResultBudget`（`chunk-jcnpfn31.js#eii`） | 大工具结果落盘，消息里换成预览 |
| 模型决定 | `reconstructed/src/query/modelSelection.js`、`reconstructed/src/query/refusalRecovery.js` | — | 实时切换、拒答回退链、用量额度模型同意对话框（详见 query 手册 4.2 第 5、9 步） |
| 自动压缩 | `reconstructed/src/services/compact/autoCompact.js` | `runAutoCompactIfNeeded`（`chunk-e6aww6q8.js#yzr`） | 结果：`compacted` / `failed` / `not_needed` / 快速回填熔断；压缩成功后用 `reconstructed/src/services/compact/compact.js` · `buildPostCompactMessages` 替换消息 |
| 预计算压缩 | `reconstructed/src/services/compact/precomputedCompact.js` | `armPrecomputedCompact`（`chunk-e6aww6q8.js#bzr`） | 提前生成摘要，到阈值或超限时直接换用 |
| 阻断上限 | `reconstructed/src/query.js` | （`runIteration` 内） | 估算 token 达到 blocked 级且不能反应式压缩时返回 `blocking_limit` |
| 系统提示词 | `reconstructed/src/query/promptSnapshot.js` | `recordPromptSnapshot`（`chunk-ha3km179.js#xu`） | 会话级回放：工具描述、wire 形状、提醒折叠沿用上次记录，保证提示词缓存稳定；再经 `reconstructed/src/utils/api.js` · `appendSystemContextToPrompt` 与 `reconstructed/src/utils/systemPromptType.js` · `asSystemPrompt` 得到本轮 system |

**system 提示词从哪里来**（`docs/handbook/query.md` 第 9 节）：

- 回合开始前由调用方准备：REPL 的 `TurnController` 调 `reconstructed/src/constants/prompts.js` · `getSystemPrompt`（`chunk-e6aww6q8.js#KI`）；headless 走 `reconstructed/src/utils/queryContext.js` · `fetchSystemPromptParts`；再由 `reconstructed/src/utils/systemPrompt.js` · `buildEffectiveSystemPrompt` 按 override → coordinator → `--agent` → `--system-prompt` → 默认 的优先级决定，最后追加 `--append-system-prompt`。
- `getSystemPrompt` 是 316 的"提示词组合器"：事实（模型、工具、输出风格、traits）→ `composeSessionSystemPrompt` / `decideSystemPromptSections`（每段决策在会话内记录并回放）→ 渲染成分段；shared 段在前，全局缓存可用时插入动态分界标记 `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__`，再放 session 段。
- 用户上下文（CLAUDE.md、日期、邮箱、附加项目）由 `reconstructed/src/context.js` · `getUserContext` / `getOrBuildUserContext` 生成；系统上下文 `getSystemContext` 在 316 只剩 Perforce 说明，git 状态改由主循环按需通告（`getGitStatus`）。默认模式下这些内容以附件/通告进入请求，部分成为 role 为 system 的中途消息。
- 输出风格、语言、环境块（`getEnvironmentSection`）、模型身份行（`buildModelEnvInfoAttachment`）在 316 都改成附件文本，而不是系统提示词分段。

### 4.6 第 5 步：构建并发出请求

| 环节 | 文件 | 函数（声明 id） | 说明 |
|---|---|---|---|
| 主循环调用 | `reconstructed/src/services/api/claude.js` | `queryModelWithStreaming`（`chunk-e6aww6q8.js#LGt`） | `deps.callModel`；把 `FallbackTriggeredError` 转成 `model_fallback_triggered` 事件 |
| 工具搜索自愈 | `reconstructed/src/services/api/claude.js` | `queryModelWithToolSearchRecovery`（`#__n`） | 捕获 `ToolSearchRefusedError` 后内联全部延迟工具重跑 |
| 一次请求 | `reconstructed/src/services/api/claude.js` | `queryModel`（`chunk-e6aww6q8.js#e_n`，约 129 KB） | off-switch 与模型封锁 → beta 列表与模型事实 → 工具 schema 与延迟判定（`reconstructed/src/utils/toolSearch.js` · `isToolSearchEnabled`）→ 消息规整 → system 块 → 缓存 TTL → 参数 → 发送 → SSE |
| 消息规整 | `reconstructed/src/services/api/claude.js`、`reconstructed/src/utils/messages.js` | `normalizeMessagesForRequest`（`#Qyn`）→ `normalizeMessagesForAPI`（`#AT`） | tool_use/tool_result 配对（`ensureToolResultPairing`）、媒体上限（`stripExcessMediaItems`）、附件渲染、中途 system 消息折叠为 `role:"system"` |
| system 块 | `reconstructed/src/services/api/claude.js` | `buildSystemPromptBlocks`（`#ZSr`） | 先由 `reconstructed/src/utils/api.js` · `splitSysPromptPrefix` 切出计费头（`reconstructed/src/constants/system.js` · `getAttributionHeader`）、身份行（`getCLISyspromptPrefix`）、静态/动态段，再加 `cache_control`（`getCacheControl`、`should1hCacheTTL`） |
| 请求参数 | `reconstructed/src/services/api/claude.js` | `queryModel` 内的 buildRequestParams（每次重试重建） | `max_tokens`、`thinking`（adaptive / enabled / disabled）、`output_config`（effort、task_budget、结构化输出）、`context_management`（`reconstructed/src/services/compact/apiMicrocompact.js` · `getAPIContextManagement`）、`metadata`（`getAPIMetadata`）、`CLAUDE_CODE_EXTRA_BODY`（`getExtraBodyParams`） |
| 缓存断点 | `reconstructed/src/services/api/claude.js` | `addCacheBreakpoints`（`#YSr`） | 实测断点在"最后一条消息的最后一块" |
| 重试 | `reconstructed/src/services/api/withRetry.js` | `withRetry`（`chunk-e6aww6q8.js#DEe`） | 异步生成器；`onError` 识别约 40 种可自愈错误（去 beta、去 thinking.display、去媒体、降 effort…），打 `retry:<原因>` 标签后重建参数重试；529 等触发 fallback 模型 |
| 客户端 | `reconstructed/src/services/api/client.js` | `getAnthropicClient`（`chunk-hwmsct5x.js#MN`） | 8 种提供商分支（firstParty、bedrock、vertex、foundry、gateway、mantle、anthropicAws、anthropicGoogleCloud）；默认头 x-app、User-Agent 等；底层是 vendor `@anthropic-ai/sdk` 0.128.0 |
| 请求头 | `reconstructed/src/services/api/claude.js` | `buildRequestTraceHeaders`（`#i_n`） | x-client-request-id、traceparent、压缩/上轮工具耗时等头 |
| 发送 | — | `anthropic.beta.messages.create({...params, stream:true})` | 慢首字节告警（`CLAUDE_SLOW_FIRST_BYTE_MS`）、流看门狗 |

### 4.7 第 6 步：解析流

在 `queryModel` 内（`docs/handbook/query.md` 6.2 第 9 步）：

- 流先过 `withStreamHeartbeat`（`#MSr`，空闲时插 ping）。
- `message_start` 建部分消息；`content_block_delta` 累积 text / thinking / signature / tool_use 的 input_json。
- **`content_block_stop` 时用 `reconstructed/src/utils/messages.js` · `normalizeContentFromAPI` 把这个块变成一条独立的 assistant 消息并 yield**。一个 API 响应会变成多条共享 `message.id` 的 assistant 消息；tool_use 块此时就交给主循环开始执行。
- `message_delta` 写 stop_reason 与 usage；`max_tokens`/上下文窗口超限由 `getMaxTokensStopMessage` 处理。
- 每个原始事件另以 `type: "stream_event"` 消息转发，供 SDK `--include-partial-messages` 与 UI 使用。
- 没收到任何事件或中途断开：按流式重试决策重试，或回退非流式 `executeNonStreamingRequest`。
- 收尾：`reconstructed/src/cost-tracker.js` · `addToTotalSessionCost`（成本与 token 统计）、`reconstructed/src/services/api/promptCacheBreakDetection.js` · `checkResponseForCacheBreak`（提示词缓存断裂检测）、`reconstructed/src/services/api/logging.js` · `logAPISuccess`。

`queryLoop` 消费这些事件：`assistant` 消息先修正工具输入，再决定是否"扣住"不给 UI（max_output_tokens、prompt-too-long 等待恢复），否则 yield 给 REPL/SDK；`model_fallback_triggered`、服务器拒答回退等事件触发换模型重试。

### 4.8 第 7 步：工具调用（权限、执行、结果）

| 环节 | 文件 | 函数（声明 id） | 说明 |
|---|---|---|---|
| 流式执行器 | `reconstructed/src/services/tools/StreamingToolExecutor.js` | `StreamingToolExecutor`（`chunk-ha3km179.js#oi`） | `addTool` 时判定并发安全并排队；`processQueue` 保证"并发安全的可并行、不安全的独占且保序"；进度即时产出；中断时生成合成 tool_result |
| 非流式编排 | `reconstructed/src/services/tools/toolOrchestration.js` | `runTools`（`chunk-0h4e7gnq.js#Gn`）、`partitionToolCalls`、`runToolsConcurrently` | 按并发安全分批，默认并发 10（`getMaxToolUseConcurrency`） |
| 单次入口 | `reconstructed/src/services/tools/toolExecution.js` | `runToolUse`（`chunk-e6aww6q8.js#$B`）→ `streamedCheckPermissionsAndCallTool`（`#g3r`） | 按名字/别名查工具（`reconstructed/src/Tool.js` · `findToolByName`），MCP 未连上时等待；判定运行位置（本机 / 远程宿主） |
| 调用生命周期 | `reconstructed/src/services/tools/toolExecution.js` | `checkPermissionsAndCallTool`（`chunk-e6aww6q8.js#w3r`） | 见下方 6 步 |

`checkPermissionsAndCallTool` 的步骤（`docs/handbook/tools.md` 5.3 节）：

1. **输入解析与 schema 校验**，失败返回 `InputValidationError`（附"schema 未发送，先 ToolSearch"等提示）。
2. **`validateInput`**：工具自检，失败返回 `<tool_use_error>`。
3. **PreToolUse 钩子**：`reconstructed/src/services/tools/toolHooks.js` · `runPreToolUseHooks`，可改写输入、给权限结论、阻止继续。
4. **权限**：`reconstructed/src/services/tools/toolHooks.js` · `resolveHookPermissionDecision` → `runPermissionPipeline`。钩子 allow 仍要过 deny/ask 规则（`reconstructed/src/utils/permissions/permissions.js` · `checkRuleBasedPermissions`）；无结论时调 `canUseTool`：
   - REPL 的 `canUseTool` 来自 `reconstructed/src/hooks/useCanUseTool.js` · `useCanUseTool`，核心是 `reconstructed/src/utils/permissions/permissions.js` · `hasPermissionsToUseTool`（`chunk-e6aww6q8.js#GE`）→ `hasPermissionsToUseToolWithSink` → `hasPermissionsToUseToolInner`（插件 `tool.check` 裁决层 `decideWithToolCheckHooks` → `checkToolAndRulePermissions`：deny/ask/allow 规则、`tool.checkPermissions`、安全检查、模式）。
   - 结果为 ask：按模式处理——`dontAsk` 拒绝；`auto` 交自动模式分类器（`reconstructed/src/utils/permissions/yoloClassifier.js` · `classifyYoloAction`）；交互模式经 `reconstructed/src/hooks/toolPermission/handlers/interactiveHandler.js` · `handleInteractivePermission` 弹对话框（对话框存储 + kind 注册表），同时向 Remote Control、channel、PermissionRequest 钩子发请求，谁先答复谁生效；用户选"总是允许"时产生 PermissionUpdate 写回设置。
   - headless 下 `canUseTool` 是 SDK 回调（`--permission-prompt-tool` 或 control_request `can_use_tool`）。
   - Bash 工具自身的 `checkPermissions` 用纯 TS bash 解析器（`reconstructed/src/utils/bash/ast.js` · `parseForSecurityFromAst`、`checkSemantics`）做安全分析，并决定是否进沙箱（`reconstructed/src/tools/BashTool/shouldUseSandbox.js` · `shouldUseSandbox`，`reconstructed/src/utils/sandbox/sandbox-adapter.js` · `SandboxManager`）。
5. **`tool.call`**：执行，进度经 `onProgress` 变成 progress 消息（`createProgressMessage`）。
6. **结果**：`reconstructed/src/utils/toolResultStorage.js` · `processToolResultBlock`，超过阈值（`getPersistenceThreshold`，默认上限 5 万字符）写盘并换成 `<persisted-output>` 预览；然后 PostToolUse 钩子（`runPostToolUseHooks`，失败时 `runPostToolUseFailureHooks`）；遥测 `tengu_tool_use_success/error`。

工具结果作为 user 消息（`tool_result` 块）回到 `queryLoop`。工具对后续调用的上下文修改用 `contextLayers`（取代 2.1.88 的 `contextModifier`）。

### 4.9 第 8 步：流结束后的分支与下一轮

流结束后 `runIteration` 按顺序检查（命中即返回 NEXT_ROUND 或终止原因，`docs/handbook/query.md` 4.2 第 12–13 步）：

1. 安全监控拦截 → 补齐 tool_result（`yieldMissingToolResultBlocks`）。
2. `reconstructed/src/utils/hooks/postSamplingHooks.js` · `executePostSamplingHooks`。
3. **反应式压缩**：被扣住的 prompt-too-long / 媒体过大 → `reconstructed/src/services/compact/reactiveCompact.js` · `triggerReactiveCompact`，或换用预计算摘要（`transition = reactive_compact_retry / precomputed_compact_swap`）。
4. **max_output_tokens 续写**（含"续写未完成思考" `shouldResumeIncompleteThinking`）。
5. **截断续写**（`isRecoverableTruncatedResponse`，连接被切）。
6. **畸形 tool_use** 重试一次；**仅思考无文本**提示一次。
7. API 错误 → `api_error`。
8. **没有工具调用** → `queryLoop` 内的 `runStopHooksAndFinish`：Stop 钩子（`reconstructed/src/query/postTurnSummary.js` · `runStopHooks`，底层 `reconstructed/src/utils/hooks.js` · `executeStopHooks`）阻断时把错误作为消息进入下一轮（`stop_hook_blocking`，连续上限默认 8），否则返回 `completed`。
9. **有工具调用** → `getRemainingResults` 收齐结果；可选工具使用摘要（`reconstructed/src/services/toolUseSummary/toolUseSummaryGenerator.js` · `generateToolUseSummary`）；PostToolBatch 钩子；生成本轮附件 `reconstructed/src/utils/attachments.js` · `getAttachments`（`chunk-e6aww6q8.js#Bxr`：LSP 诊断、文件变化、记忆、延迟工具增量 `getDeferredToolsDelta`、任务状态等约 60 种新类型）；工具或 MCP `_meta` 要求结束本轮时走 `endTurnFromToolResult`；到 `maxTurns` 返回 `max_turns`；否则 `state.messages = [...请求消息, ...assistant, ...toolResults]`，返回 `NEXT_ROUND`，进入下一轮。

终止原因全集：`completed`、`max_turns`、`hook_stopped`、`stop_hook_prevented`、`aborted_streaming`、`aborted_tools`、`tool_deferred`、`background_requested`、`blocking_limit`、`rapid_refill_breaker`、`model_error`、`image_error`、`api_error`、`malformed_tool_use_exhausted`。

### 4.10 第 9 步：压缩

- **自动压缩**（每轮开头）：`runAutoCompactIfNeeded` 判断阈值（窗口来源有 settings、clientdata、实验、模型默认表等 7 种），需要时调 `reconstructed/src/services/compact/compact.js` · `compactConversation`（`chunk-e6aww6q8.js#mzr`）：PreCompact 钩子 → 选摘要提示词变体（8 个 A/B arm）→ `streamCompactSummary` 用 fork 共享缓存前缀生成摘要 → 压缩边界消息（`createCompactBoundaryMessage`）+ 摘要 + 压缩后附件（`buildPostCompactAttachments`：最近文件、计划、后台 shell、目标等）。
- **预计算压缩**：`isAtPrecomputeThreshold` 时提前生成并持久化摘要；**反应式压缩**：请求被拒（prompt-too-long）时按组摘要后重试。
- **microcompact**：服务端 `context_management`（`clear_tool_uses_20250919` 等），空闲回来时追加。
- 316 没有 session memory 压缩（2.1.88 的 `tengu_sm_compact*` 已消失）。
- 手动 `/compact` 走同一条 `compactConversation`。详见 `docs/handbook/query.md` 第 12 节。

### 4.11 第 10 步：回合结束

- `query` 返回终止结果；为本轮吸收的命令发 `command_lifecycle completed/cancelled`；记录回合统计。
- 转录：assistant/工具结果写入会话 jsonl（`reconstructed/src/utils/sessionStorage.js` · `recordTranscript`，路径见 `getTranscriptPath`；storage v5 下写入存储 key）。
- REPL：`TurnController` 收尾，`turn_duration` 系统消息（"✻ … for Xm Ys"），队列里的下一条输入由 `useQueueProcessor` 出队；插件函数钩子 `turn.complete`（`reconstructed/src/query/turnHooks.js` · `raiseTurnComplete`）。
- `-p`：`runHeadlessStreaming` 写出 `result` 消息（text/json/stream-json），按退出码退出。

---

## 5. 横切子系统

### 5.1 工具与权限

- **工具定义**：每个工具是定义对象 + `create(ctx)` 工厂（`buildTool`，`chunk-g54kbxqw.js#on`），提供 name/aliases、输入输出 schema、提示词、只读/并发/延迟属性、`validateInput/checkPermissions/call` 与一组渲染函数。316 新增约 35 个工具字段（`backgrounding`、`remoteExecution`、`coerceInput`…）。
- **工具池**：`reconstructed/src/tools.js` · `getAllBaseTools`（约 80 个内建工具）→ `getTools`（按权限上下文、`isEnabled` 过滤；`CLAUDE_CODE_SIMPLE` 只给 Bash/Read/Edit）→ `assembleToolPool`（并入 MCP 工具）。Glob/Grep 默认不注册（嵌入式搜索为构建常量）；MCP 工具和部分内建工具"延迟加载"，只宣告名字，模型用 ToolSearch 取 schema。
- **权限**：模式（default/"Manual"、acceptEdits、plan、auto、dontAsk、bypassPermissions）、规则（`Tool(content)`；12 种来源：settings 五层、`cliArg`、`command`、`session`，以及 316 新增的 `mcpMount`、`toolsNarrowing`、`mcpServerPolicy`、`hostCredential`；判定顺序固定 deny → ask → allow；加载见 `reconstructed/src/utils/permissions/permissionsLoader.js` · `loadAllPermissionRulesFromDisk`）、文件路径权限（`reconstructed/src/utils/permissions/filesystem.js` · `checkReadPermissionForTool`/`checkWritePermissionForTool`）、自动模式分类器、沙箱（vendor `@anthropic-ai/sandbox-runtime` 0.0.81）。
- 手册：`docs/handbook/tools.md`、`docs/handbook/permissions.md`。

### 5.2 扩展：MCP、插件、Skills、Hooks、mods

所有扩展最终都变成查询循环看得见的三类东西：**工具**、**命令**（斜杠命令 / Skill）、**附件与钩子**。

| 扩展 | 入口 | 说明 |
|---|---|---|
| MCP | `reconstructed/src/services/mcp/client.js` · `connectToServer`、`getMcpToolsCommandsAndResources`、`callMCPTool`；配置 `reconstructed/src/services/mcp/config.js` · `getAllMcpConfigs`；REPL 侧 `reconstructed/src/services/mcp/useManageMCPConnections.js` | 两代客户端并存，默认 v2 先发 `server/discover`（协议 2026-07-28），失败回退 `initialize`；工具名 `mcp__<服务器>__<工具>`；`claude mcp serve` 反向把自身作为 MCP 服务器（`reconstructed/src/entrypoints/mcp.js` · `startMCPServer`） |
| 插件 | `reconstructed/src/utils/plugins/pluginLoader.js` · `loadAllPlugins`；`reconstructed/src/utils/plugins/loadPluginCommands.js`、`loadPluginHooks.js` | marketplace + `enabledPlugins`；插件可带命令、代理、skills、hooks、输出样式、MCP/LSP 服务器、themes、workflows、monitors、binaries |
| Skills | `reconstructed/src/skills/loadSkillsDir.js` · `getSkillDirCommands`；内置 `reconstructed/src/skills/bundled/index.js` · `initBundledSkills` | Skill 是 `type:"prompt"` 的命令对象，模型经 Skill 工具调用，用户以 `/name` 调用 |
| Hooks | `reconstructed/src/utils/hooks.js` · `executeHooks`、`getMatchingHooks`；事件表 `HOOK_EVENTS` | 33 个事件；command/http/prompt/agent/mcp_tool 五种类型；配置来自 settings 各层、插件、frontmatter、SDK |
| mods（函数钩子） | `reconstructed/src/plugins/functionHooks/`（`reconstructed/src/plugins/functionHooks/engineCreate.js` · `buildEngineApi`、`reconstructed/src/plugins/functionHooks/hookDispatch.js` · `buildHookChain`） | 316 新增：插件提供 JS hooks 模块，在独立 worker 中运行；事件链覆盖 `tool.*`、`prompt.*`、`session.*`、`turn.*`、`ui.*`；插件可调用 `$` 接口（tool/session/ui/fs/http/model/process/mcp/agent…）；传统 settings 钩子以 `classic.<Event>` 桥接 |
| LSP、Chrome、深链接 | `reconstructed/src/services/lsp/`、`reconstructed/src/utils/claudeInChrome/`、`reconstructed/src/utils/deepLink/` | LSP 诊断作为附件进入对话；Claude in Chrome 是进程内/子进程 MCP 服务器；`claude-cli://` 深链接 |

手册：`docs/handbook/extensions.md`。

### 5.3 状态与配置

- **全局状态** `reconstructed/src/bootstrap/state.js`：316 把 2.1.88 的单一 STATE 对象改成"会话对象（约 30 个子存储）+ AsyncLocalStorage 覆盖 + HostState（13 个进程级存储）"，访问器形如 `t().<存储>.<方法>()`；入口 `getRootSession`、`getSessionId`、`switchSession`。
- **设置**：`reconstructed/src/utils/settings/settings.js`（user / project / local / flag / policy 五个来源合并，托管层含文件、MDM、远程、policyHelper，`getInitialSettings`、`getSettingsForSource`、`updateSettingsForSource`）；约 187 个顶层键。
- **全局配置** `~/.claude.json`：`reconstructed/src/utils/config.js` · `getGlobalConfig` / `saveGlobalConfig`。
- **会话存储**：`reconstructed/src/utils/sessionStorage.js`（转录 jsonl，47 种记录类型，resume/continue）；输入历史 `reconstructed/src/history.js`。
- **storage v5**：几乎所有持久化都有"直接读写文件"与"经存储接口读写 key"两条路径，由 `tengu_hover_rest` 等控制；diskless 进程只能走后者。
- **记忆**：CLAUDE.md 发现与 `@include`（`reconstructed/src/utils/claudemd.js` · `getMemoryFiles`）、自动记忆 `reconstructed/src/memdir/`、多 memory store 同步、组织记忆。
- **认证**：`reconstructed/src/utils/auth.js`（API key、OAuth 刷新 `checkAndRefreshOAuthTokenIfNeeded`、apiKeyHelper、WIF、第三方提供商）。
- **模型**：`reconstructed/src/utils/model/`（内置模型目录、服务端目录、别名、effort、fast mode）。
- 手册：`docs/handbook/state.md`、`docs/handbook/bootstrap.md` 第 6–7 节、`docs/handbook/query.md` 第 13 节。

### 5.4 终端 UI

- **REPL**：`reconstructed/src/screens/REPL.js` 不再是 5000 行的状态组件，而是"控制器对象 + 外部 store"：`screens/repl/` 下的 `TurnController`、`SessionController`、`PromptSubmitController`、`ComposerChrome`、`PromptDraft`、`ScrollPin`、`BackgroundGesture`、`ReplSessionScope` 等在 `useState(() => new X())` 中创建，`useLayoutEffect` 里 `bindHost` 注入宿主能力；组件经 `useSyncExternalStore` 选择器订阅。
- **对话框**：统一的对话框存储 + `requestDialog(def, payload)` + kind→组件注册表（约 40 个 kind，含全部权限对话框）。
- **消息渲染**：`reconstructed/src/components/Messages.js` → `MessageRow.js` → `Message.js` → `components/messages/*`；全屏下虚拟滚动。
- **Ink**：`reconstructed/src/ink/`（自维护分支）：React → 自定义 reconciler → Ink DOM → yoga（`reconstructed/src/native-ts/yoga-layout/`，TS 移植）→ `renderNodeToOutput` → Screen 网格（写行时调用私有原生 `Bun.ant.CellSegmenter`）→ `LogUpdate` 逐格 diff → `writeDiffToTerminal` 一次写出。输入解析 `reconstructed/src/ink/parse-keypress.js` · `parseKeypress`（kitty 键盘协议、鼠标、粘贴、焦点）。
- **快捷键与 vim**：`reconstructed/src/keybindings/`（29 个上下文、和弦）、`reconstructed/src/vim/transitions.js`（普通模式 `transition`、316 新增可视模式 `visualTransition`）。
- 手册：`docs/handbook/ui.md`、`docs/handbook/ink.md`、`docs/handbook/commands.md`。

### 5.5 代理、任务、云会话与 Remote Control

| 部分 | 位置 | 说明 |
|---|---|---|
| 子代理 | `reconstructed/src/tools/AgentTool/runAgent.js` · `runAgent`；`reconstructed/src/utils/forkedAgent.js` · `createSubagentContext`、`runForkedAgent` | Agent 工具派生同进程子查询循环；默认后台运行；fork 必须显式 `subagent_type:"fork"`；最大深度默认 3、并发默认 20 |
| 任务系统 | `reconstructed/src/tasks/`（`LocalAgentTask`、`LocalShellTask`、`RemoteAgentTask`、`DreamTask`…）、`reconstructed/src/tasks/stopTask.js` | 后台代理、后台 shell、Monitor、云会话任务；完成后以 task-notification 回到主会话 |
| 团队 | `reconstructed/src/utils/swarm/`、`reconstructed/src/coordinator/coordinatorMode.js` | teammate（同进程或 tmux/iTerm2 pane）、文件信箱协议、权限同步；协调者模式 |
| SDK 协议 | `reconstructed/src/cli/structuredIO.js`、`reconstructed/src/entrypoints/sdk/` | stream-json + 约 98 种 control_request；内置 Agent SDK 随包（`reconstructed/vendor/@anthropic-ai/claude-agent-sdk/`） |
| Remote Control | `reconstructed/src/bridge/`（独立模式 `reconstructed/src/bridge/bridgeMain.js` · `bridgeMain`；REPL 内 `reconstructed/src/bridge/initReplBridge.js` · `initReplBridge` → `reconstructed/src/bridge/remoteBridgeCore.js` · `initEnvLessBridgeCore`） | 让 claude.ai/code 或手机驱动本机会话；REPL 内只剩 v2 env-less 桥 |
| 云会话 | `reconstructed/src/cli/headlessCloud/`（`--cloud`）、`reconstructed/src/utils/teleport.js` · `teleportToRemote`、`reconstructed/src/remote/`、`reconstructed/src/services/remoteTools/`、`reconstructed/src/remote/tools/` | 本机驱动云会话；云会话把工具调用转回本机或附着机器执行（远程工具、设备桥、设备钩子）；home seed 把本机设置推到云端 |
| 后台会话与守护进程 | `reconstructed/src/services/daemon/`、`reconstructed/src/daemon/`、`reconstructed/src/screens/FleetView/` | `claude --bg`、`attach/logs/stop`、`claude daemon`、Agents 视图（Fleet） |
| 自托管 runner | `reconstructed/src/selfHostedRunner/`、`reconstructed/src/services/selfHostedRunner/` | 在客户机器上为 CCR 云环境跑会话 |
| 定时任务 | `reconstructed/src/utils/cronScheduler.js`、`reconstructed/src/utils/cronTasks.js` 等 cron 模块、`reconstructed/src/tools/ScheduleCronTool/` | `/loop`、Cron* 工具、ScheduleWakeup |

手册：`docs/handbook/agents.md`。

### 5.6 遥测

- `reconstructed/src/services/analytics/index.js` · `logEvent`（约 3,400 种 `tengu_*` 事件）→ `reconstructed/src/services/analytics/sink.js` · `initializeAnalyticsSink` → 采样 → Datadog（`trackDatadogEvent`，白名单 243 个事件，仅第一方）与 1P 事件日志（`reconstructed/src/services/analytics/firstPartyEventLogger.js` · `logEventTo1P`，`/api/event_logging/v2/batch`）。
- GrowthBook 特性开关：`reconstructed/src/services/analytics/growthbook.js` · `getFeatureValue_CACHED_MAY_BE_STALE`（全局约 900 处调用）、`isGrowthBookEnabled`。特性名多为代号（`tengu_*`），各手册写明了已知含义。
- 用户自配 OpenTelemetry：`reconstructed/src/utils/telemetry/instrumentation.js` · `initializeTelemetry`（`CLAUDE_CODE_ENABLE_TELEMETRY`）。
- 关闭开关（`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`、`DISABLE_TELEMETRY`、`DISABLE_GROWTHBOOK`…）与效果表见 `docs/handbook/state.md` 7.5 节，隐私级别 `reconstructed/src/utils/privacyLevel.js` · `getPrivacyLevel`。

---

## 6. 子系统一览表

规模按 `analysis/segments/domains.json`（`tools/segment/domains.mjs` 按路径前缀把一方模块分到 11 个领域；未命中前缀的 `services/`、`utils/`、`types/` 兜底归 state，其余归 misc），为 2026-11-03 09:13（place-rest 放置后）的快照。

| 子系统 | 职责 | 主要目录（`reconstructed/src/` 下） | 手册 | 模块 | 顶层声明 | 字节 |
|---|---|---|---|---|---|---|
| bootstrap | 入口快速路径、命令树、init/setup、headless 与 SDK 协议、全局状态、迁移、安装更新、退出 | `entrypoints/`、`main.js`、`setup.js`、`cli/`、`bootstrap/`、`migrations/`、`upstreamproxy/` | `docs/handbook/bootstrap.md` | 294 | 5,493 | 2.88 MB |
| query | 查询循环、Messages API 调用与重试、beta 与请求头、系统提示词、消息规范化、附件、压缩、token、模型/effort/thinking | `query.js`、`query/`、`QueryEngine.js`、`services/api/`、`services/compact/`、`constants/`、`utils/messages*`、`utils/model/`、`utils/attachments.js` | `docs/handbook/query.md` | 317 | 6,950 | 2.45 MB |
| tools | 工具接口、注册与工具池、工具搜索、执行编排、全部内建工具 | `Tool.js`、`tools.js`、`tools/`、`services/tools/`、`utils/toolSearch.js`、文件类 utils | `docs/handbook/tools.md` | 488 | 6,170 | 3.60 MB |
| permissions | 权限模式与规则、判定流水线、自动模式分类器、文件路径权限、Bash/PowerShell 分析、沙箱、Shell 执行、安全存储 | `utils/permissions/`、`utils/bash/`、`utils/shell/`、`utils/powershell/`、`utils/sandbox/`、`types/permissions.js` | `docs/handbook/permissions.md` | 167 | 3,524 | 1.19 MB |
| extensions | MCP、插件、mods 函数钩子、Skills、Hooks、LSP、Claude in Chrome、Computer Use、深链接 | `services/mcp/`、`utils/plugins/`、`plugins/`、`skills/`、`utils/hooks*`、`services/lsp/`、`schemas/` | `docs/handbook/extensions.md` | 744 | 14,553 | 4.95 MB |
| state | 设置、全局配置、会话存储、记忆、认证、遥测、git/worktree/fs 等基础设施（含兜底的 services/utils） | `utils/settings/`、`utils/config.js`、`utils/sessionStorage.js`、`memdir/`、`services/analytics/`、`utils/auth.js`、`state/` | `docs/handbook/state.md` | 1,327 | 22,313 | 8.27 MB |
| ui | REPL 屏幕与控制器、输入、消息渲染、权限与各类对话框、设置界面、通知、hooks、设计系统 | `screens/`、`components/`、`hooks/` | `docs/handbook/ui.md` | 823 | 7,418 | 3.81 MB |
| ink | Ink 渲染层、yoga 布局、输入解析、选区、终端能力、快捷键、vim | `ink/`、`ink.js`、`native-ts/`、`keybindings/`、`vim/` | `docs/handbook/ink.md` | 136 | 1,412 | 0.47 MB |
| agents | 子代理与 fork、任务系统、团队、协调者、SDK 控制协议、Remote Control、远程会话、定时任务 | `tasks/`、`coordinator/`、`bridge/`、`remote/`、`server/`、`assistant/`、`utils/swarm/`、`entrypoints/sdk/` | `docs/handbook/agents.md` | 366 | 4,832 | 2.56 MB |
| commands | 斜杠命令对象、注册表与过滤、解析执行、内建命令与发行内建技能 | `commands.js`、`commands/` | `docs/handbook/commands.md` | 317 | 2,034 | 1.25 MB |
| misc | 未命中上述前缀的其余模块：`daemon/`（后台守护进程）、`selfHostedRunner/`、`engine/`（共用查询引擎）、`main/` 等 | 见左 | 本文第 5.5 节与 `docs/process/placement-g0.md`…`docs/process/placement-g7.md` | 44 | 482 | 0.25 MB |
| 合计（一方） | | | | 5,023 | 75,181 | 31.7 MB |

按顶层目录统计的文件数与字节见 `docs/INDEX.md` 第 3 节。

---

## 7. 构建事实

| 项 | 值 | 依据 |
|---|---|---|
| 官方二进制 | linux-x64 ELF，sha256 `fd13c700…d824` | `original/reconstruction.json`、`README.md` |
| 打包器 | Bun **1.4.4**，修订 `71c9bf0ca`（Anthropic 内部版），内嵌 Node 版本串 v26.12.1；单文件可执行 + bytecode | `original/reconstruction.json`、`docs/process/verify.md` 第 2 节 |
| 构建时间 | BUILD_TIME 2026-10-30T23:28:13Z，GIT_SHA `cd7ceb459c…` | `docs/handbook/bootstrap.md` 开头 |
| 模块表 | 2,880 项：2,648 个 JS（入口 `cli.js` + 2,644 个 `original/chunk-*.js` + 3 个带 BOM 的资源脚本）、232 个资源（提示词、Skill 文档、字体、2 个 `.node` 原生模块、127 个 zstd 压缩资源） | `docs/PLAN.md` 第 1 节、`original/` |
| 代码量 | JS 约 50 MB，81,667 个顶层声明（按声明符拆开是 102,120 个单元） | `analysis/segments/summary.json`、`docs/process/vendor.md` 4.1 |
| chunk 结构 | ESM；全部提升到顶层（scope hoisting）；**一个 chunk 内顺序拼接多个源模块**；Bun 像 esbuild 一样**按顶层语句拆 chunk**，同一源文件可散在多个 chunk（2.1.88 能对上的 1,711 个文件中 728 个跨 chunk），但在一个 chunk 内保持连续 | `docs/process/lead.md` 第 4 节 |
| CommonJS | 依赖以 `var X=x(function(exports,module){…})` 包裹，一个包裹 = 一个 npm 文件（1,580 个包裹） | `docs/process/vendor.md` 4.4 |
| 运行时 chunk | `chunk-rshven70.js`（938 字节）：`x`=__commonJS、`Re`=__toESM、`Ar`=__export、`Be`=`import.meta.require`、`Xa`=__esm，另有 React Compiler 哨兵 `Symbol.for("react.memo_cache_sentinel")`；阅读树中为 `reconstructed/runtime/bun-runtime.js` | `docs/process/vendor.md` 4.2 |
| 门面 chunk | 只有 `import` + `export{局部 as 原名}` 的 chunk，Bun 为每个被动态 `import()` 的源模块生成一个；共 **513** 个，给出 **7,692** 个源码原始导出名（命名来源 `facade`，可信度最高）；同一门面的声明属于同一源文件 | `analysis/facades/facades.json`、`docs/WORKLOG.md` 06:05 条 |
| 最大的 chunk | `chunk-e6aww6q8.js`（5.07 MB，主体逻辑：queryModel、工具执行、权限、hooks…）、`chunk-18hwfzwa.js`（1.88 MB，REPL 控制器与组件）、`chunk-1ny7cxrt.js`（1.56 MB，含 openid-client/jose/zod 等第三方与云网关）、`chunk-fq0cr76a.js`（1.07 MB，沙箱运行时与 protobuf）、`chunk-aepeg2w5.js`（0.92 MB）、`chunk-tyg7f3ek.js`（0.89 MB，print/headless） | `original/` 文件大小 |
| 外部依赖 | `ws`（Bun 原生）、`undici`（`import.meta.require`，Bun 内置）、`node-fetch`（动态 import）未打包 | `analysis/vendor/packages.json` `externals` |
| 私有原生 API | `Bun.ant.*` 共 12 个，其中 `Bun.ant.CellSegmenter`（Ink 写屏）没有回退，公版 Bun 跑交互界面需要垫片 `tools/verify/bun-ant-shim.js` | `docs/process/verify.md` 第 12 节、`docs/handbook/ink.md` 3.5 |

**第三方占比**（`analysis/vendor/packages.json`，按顶层声明字节 38,808,000 计）：

| 类别 | 字节 | 占比 |
|---|---|---|
| npm 第三方（255 个包） | 6,382,353 | 16.4% |
| 私有包（`@ant/managed-config` 651,521 B、`@ant/computer-use-swift` 等） | 655,485 | 1.7% |
| 未认出的 CJS 包裹 + Bun 运行时 | 4,634 | <0.1% |
| **第三方合计** | | **18.1%** |

另有 3 个整文件资源脚本（zstd 压缩，不参与解析）：`mermaid.min.js`（mermaid 11.16.1，解压 3.57 MB）、`hljsBundle.generated.min.js`（highlight.js 11.11.1，605 KB）、`chart.umd.min.js`（Chart.js 4.5.1，209 KB）。

**主要第三方包**（按字节，前 20）：

| 包 | 版本 | 字节 | 用途 |
|---|---|---|---|
| zod | 4.6.2 | 732,400 | schema（工具输入、设置、协议） |
| highlight.js | 11.11.1 | 585,093 | 代码高亮 |
| node-forge | 1.4.0 | 291,739 | 证书/加密 |
| @grpc/grpc-js | 1.14.4 | 272,422 | OTel gRPC 导出 |
| @anthropic-ai/sandbox-runtime | 0.0.81 | 263,351 | 沙箱（bwrap / sandbox-exec / srt-win） |
| @mixmark-io/domino | 2.2.0 | 238,082 | DOM 实现（HTML → Markdown） |
| ajv | 8.13.0 | 232,909 | JSON Schema（MCP） |
| @anthropic-ai/sdk | 0.128.0 | 224,310 | Messages API 客户端 |
| @opentelemetry/otlp-transformer | 0.208.0..0.209.0 | 215,323 | OTel |
| @modelcontextprotocol/client | 2.0.0 | 205,080 | MCP v2 客户端 |
| @bufbuild/protobuf | 2.12.1 | 153,617 | protobuf |
| @bufbuild/cel | 0.4.0 | 152,551 | CEL 表达式 |
| parse5 | 7.2.0..7.2.1 | 125,788 | HTML 解析 |
| acorn | 8.15.0 | 121,891 | JS 解析 |
| react-reconciler | 0.33.0 | 119,221 | Ink 的 React 宿主 |
| @azure/msal-common | 15.13.1 | 115,522 | Azure 认证 |
| protobufjs | 7.6.0 | 115,271 | protobuf |
| google-auth-library | 10.6.2 | 102,429 | Vertex 认证 |
| @modelcontextprotocol/sdk | 1.29.0 | 96,273 | MCP v1 客户端（legacy） |
| @smithy/core | 3.30.0 | 96,078 | AWS SDK 基础 |

其余见 `analysis/vendor/packages.json` 与 `docs/process/vendor.md` 第 5 节（版本是区间 `a..b` 时表示区间内各版本的对应代码完全相同）。

---

## 8. 读代码时需要知道的约定

### 8.1 文件头

每个阅读树文件开头有一段注释：

```
/**
 * query.ts                                   ← 原始文件名（2.1.88 的路径，或放置成员给的新路径）
 *
 * 查询主循环：……                              ← 模块说明（naming/modules-*.json）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/query.ts    ← 或 "new in 2.1.316 (2.1.88 has no file at this path)"
 * pieces: chunk-ha3km179.js (27)              ← 来自哪些 chunk，各多少个声明
 * attribution: sole-consumer 11, fingerprint 2, layout 13, …   ← 归属方法统计
 */
```

截至本快照，约 1,660 个文件有 2.1.88 对应文件，约 3,360 个文件标为 "new in 2.1.316"——316 的一方代码大约三分之二是旧版没有的。

### 8.2 `//@` 出处行

每个顶层声明前有一行出处：

```
//@ chunk-ha3km179.js:159198-234645 callgraph-witnessed = queryLoop (0.294)
async function* queryLoop(params, startedCommandUuids, deliveredPollEventUuids, transcriptTap) {
```

- `chunk-ha3km179.js:159198-234645`：在 `original/chunk-ha3km179.js` 中的字节区间（可直接对照原文）。
- `callgraph-witnessed`：这个声明怎样被归到当前文件（归属方法）。
- `= queryLoop (0.294)`：匹配到的 2.1.88 旧版名与匹配分（只有经旧版匹配的声明才有）。

归属方法（`analysis/segments/summary.json` 的 `byMethod`）：

| 方法 | 含义 |
|---|---|
| `placement` | 放置成员/领域成员显式指定（第三阶段的主力，约 5.6 万个声明） |
| `fingerprint`、`callgraph-witnessed`、`callgraph-fingerprint`、`layout`、`file-local` | 与 2.1.88 源码匹配：字符串/属性名指纹、调用图传播、chunk 内布局插值、文件内二次匹配 |
| `facade-exports`、`facade-majority` | 门面 chunk 推出（同一门面的导出属于同一文件）；早期还有 facade-new（旧版没有对应文件的门面模块，放进顶层 _new/），place-rest 后已全部改为 placement |
| `sole-consumer`、`sole-consumer-new` | 一段未归属声明只被一个模块使用：紧挨该模块时并入它；不紧挨时作为它旁边的独立新模块（见 8.5） |
| `affinity`、`shared-adjacent` | 与已归属声明相邻且引用边指向同一文件 |
| `cjs-*`、`esm-*`、`embedded-runtime`、`native-addon`、`resource-wrapper`、`helper:bun-runtime` | 第三方识别（vendor 成员） |
| leftover | 仍未归属，按 chunk 连续段放进 _unattributed/（place-rest 后已不出现在统计中） |

### 8.3 声明说明与 JSDoc

声明前的 `/** … */` 来自 `naming/docs-*.jsonl`（领域成员与放置成员读代码后写的说明，约 1.4 万条），模块说明来自 `naming/modules-*.json`。说明里的"旧版名 X 为错配"之类注记要留意：它告诉你这个名字或归属不可靠。

### 8.4 命名来源与可信度

名字优先级 semantic > vendor > reference > auto，门面原名优先于一切（`tools/naming/resolve.mjs`）；同一模块内名字唯一，冲突时加后缀（如 `getMcpToolTimeoutMs_2`、`useMainLoopModel_3`）。`reconstructed/symbols.jsonl` 每行的 `source` 字段：

| source | 含义 | 可信度 | 一方绑定数（快照） |
|---|---|---|---|
| `facade` | 门面 chunk 的原始导出名 | 确定 | 约 7,500 |
| `semantic` | 领域/放置成员读代码后起的名字 | 高 | 约 25,800 |
| `vendor` | 与 npm 包源码对齐 | 高 | （主要在 vendor/） |
| `reference` | 与 2.1.88 源码匹配得到 | 中（有错配，手册和说明里标了"错配"） | 约 5,600 |
| `auto` | 代码证据推出（解构键、`catch`→`error`、方法名…） | 低 | 约 3,000 |
| `minified` | 未命名，保留压缩名 | — | 约 5 万（多为低引用常量、多声明符 `var` 里的附属绑定、小工具函数） |

局部变量和参数的名字同样有来源，可用 `node tools/q.mjs bindings <id>` 查看每个绑定的来源。

### 8.5 特殊目录与文件名

| 位置 | 含义 |
|---|---|
| 顶层 `_new/<导出名>`（已清空） | 门面 chunk 推出、2.1.88 没有对应文件的模块，起初按最大导出名放在顶层 `_new/`（例如早期的 _new/applyCoordinatorToolFilter.ts，其中的 `mergeAndFilterTools` 现在在 `reconstructed/src/utils/toolPool.js`）；第三阶段放置后 197 个全部给出正式路径，顶层 `_new/` 已不存在。手册里若还写着这类路径，用声明 id 查当前位置 |
| `<目录>/_new/<名>.js`、`<目录>/_new/<文件>.helpers-<chunk 前 4 位>.js` | `sole-consumer-new`（写作时 `_new/` 子目录下 146 个文件，其中 23 个 helpers 文件；第四阶段命名后几乎都已按主声明改名并入正式路径，现在只剩 `reconstructed/src/cli/print/_new/elicitationRegistrar.helpers-tyg7.js` 一个 helpers 文件；另有若干 `_new/*.lazy.js` 是动态加载单元，不是这类模块）：只被同目录某个模块使用、但在 chunk 里不与它相邻的一段代码，独立成新模块放在使用者旁边；没有好名字时命名为 `<使用者>.helpers-<chunk 标记>`（例如早期只给 `entrypoints/init.js` 用的 init helpers 文件，其中的 `installTelemetryMeter` 现在就在 `reconstructed/src/entrypoints/init.js`） |
| `_unattributed/<chunk>/part-NNN.js`（已清空） | 未归属代码按 chunk 内连续段切开的临时位置；place-rest 放置后已全部落位，当前阅读树没有这个目录 |
| `_misplaced/<原路径>`（已清空） | fixer 确认归错、但当时去处不明的声明（`docs/process/fixer.md` 第 7 节），place-rest 已给出去处 |
| `reconstructed/vendor/<包>/<文件>` | 第三方，按 npm 包内路径还原；`private-unresolved/` 是私有/未识别包 |

### 8.6 React Compiler 产物

316 的 React 组件经过 React Compiler 编译，阅读时会看到：

- `$`：组件开头的记忆化缓存数组，形如 `if ($[0] !== session) { …; $[0] = session; $[1] = ms } else ms = $[1]`——这只是 `useMemo`/`useCallback` 的编译结果，按"依赖变了才重算"理解即可；
- `_temp`、`_temp2`、`_temp5`、`t1`、`t2` 这类名字：编译器提出来的内联回调或临时值（旧版源码里也有这些名字，说明泄露的 2.1.88 源码本身就是编译后的 TSX，见 `docs/process/lead.md` 第 6 节）；
- `Symbol.for("react.memo_cache_sentinel")` / `"react.early_return_sentinel"`：编译器哨兵，来自运行时 chunk，出现在一方组件里不代表第三方代码。

### 8.7 路径写法的对应关系

- 阅读树文件是 `.js`；文件头、手册、`analysis/segments/*`、`tools/q.mjs module` 用的是原始的 `.ts`/`.tsx` 路径（例如 `query/deps.ts` ↔ `reconstructed/src/query/deps.js`）。
- 手册里的 `路径 · 函数名（chunk-xxx.js#压缩名）`：压缩名在原 chunk 内唯一，是最稳的定位方式；阅读树重新生成后行号会变，声明 id 不变。
- 同一源文件在原二进制中可能散在多个 chunk，阅读树已把它们按文件聚合；`runnable/` 保持原 chunk 布局。

---

## 9. 已知限制

1. **归属已完成，但有推断出的位置**：place-rest 之后 81,667 个声明全部落位（`analysis/segments/summary.json` 已无 unattributed 类别），_unattributed/、_misplaced/ 与顶层 _new/ 都已清空；不过各目录下 `_new/` 子目录与 `*.helpers-xxxx.js` 文件（130 个）是按"唯一使用者"推出的位置，文件名不是源码原名。lead 可能继续重新生成 `reconstructed/`，少数路径会变化，以声明 id 为准。
2. **旧版名错配**：`reference` 来源的名字和"2.1.88 counterpart"有错配。手册写作时列出的典型例子：旧版 buddy/ 名下（316 已删除伴侣精灵，名下声明全是匹配误差）、commands/thinkback-play、commands/tag、commands/files（被按旧名匹配到不相干代码）——这几处在后续重切中已从阅读树移走；`reconstructed/src/components/agents/new-agent-creation/` 等处的内容与模块名不符（实为 Bedrock/Vertex/云网关设置向导等）、awaySummary 被 Artifact 评论确认占用等仍需留意（`docs/handbook/agents.md` 9.6、`docs/handbook/ui.md` 第 12 节、`docs/handbook/commands.md` 第 9 节、`docs/handbook/query.md` 12.12）。
3. **`reconstructed/symbols.jsonl` 里约一半条目仍是压缩名**（`source: minified`），多是低引用常量和多声明符语句里的附属绑定。
4. **原生层不可见**：计费头里的 `cch` 由原生层在发送前改写，JS 看不到；`Bun.ant.CellSegmenter` 的实现不可见（`docs/handbook/query.md` 第 9 节、`docs/handbook/ink.md` 第 13 节）。
5. **只有 linux 构建**：平台固化为 linux；macOS 钥匙串、Computer Use 的 Swift 执行器、darwin 专属分支在本二进制中看不到或没有调用方（`docs/handbook/permissions.md` 第 15 节、`docs/handbook/extensions.md` 11.4）。
6. **阅读树不可直接运行**：要运行或对拍用 `runnable/`（`docs/process/verify.md`）。
7. **手册与当前路径**：手册写作期间切分重做过几次，手册里少数路径（尤其 _unattributed/ 下的 part-NNN 与 _new/ 下的模块）可能已搬走；用声明 id 在 `reconstructed/symbols.jsonl` 里查当前位置。
8. **构建期裁剪**：一些函数在外部构建中恒返回常量（如 `getReplTool` 恒 null、`/daemon` 的开关恒 false），代码里能看到入口但功能不可达；手册在各节注明了。

---

## 10. 引用校验结果

校验时间 2026-11-04 05:09（UTC），对象为当时的 `reconstructed/`。脚本检查本文所有代码样式引用：路径是否存在（相对仓库根，或相对 `reconstructed/src/`，`.ts/.tsx` 对应 `.js`）；声明 id 是否在 `reconstructed/symbols.jsonl`；"路径 · 函数名"中的函数是否属于该文件；标识符与字面量是否出现在 `reconstructed/symbols.jsonl` 或阅读树代码中。在 2.1.316 找不到、但在 2.1.88 源码（`references/claude-code-analysis/src`）中存在的，计为"只在 2.1.88 中存在"（删除项、旧名，属预期）。

- 共检查 1029 处引用：路径 415/415，路径·函数 81/81，名字 381/381，声明id 62/62，字面量 89/90（另 1 个只在 2.1.88 中存在）；占位符与含空格的说明性文字 63 处未检查。
- 只在 2.1.88 中存在（删除项或旧名，预期如此）：`tengu_sm_compact*`
- 未通过：0 处。
