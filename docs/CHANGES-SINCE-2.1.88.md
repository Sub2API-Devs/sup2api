# 2.1.88 → 2.1.316 变化总表

> 对比对象：旧版是 `references/claude-code-analysis`（约 2.1.88，2026-03 source map 泄露的 TS 源码）；新版是官方 2.1.316 linux-x64 二进制（`original/`）。
>
> 素材：10 本手册的"与 2.1.88 的差异"一节、放置组过程文档 `docs/process/placement-g0.md`…`placement-g7.md` 的"新功能"一节。本文去重、合并同类、按重要性排序；每条一句话加证据位置。
>
> 证据写法：`reconstructed/src/...` 是阅读树路径（目录以 `/` 结尾）；"手册 query §4.1"指 `docs/handbook/query.md` 第 4.1 节，"放置 g3"指 `docs/process/placement-g3.md` 的新功能一节。手册中带声明 id 的证据可用 `node tools/q.mjs show <id>` 查看。
>
> 规模感：阅读树里约 3,370 个一方文件标为 "new in 2.1.316"，约 1,650 个有 2.1.88 对应文件；内建工具从约 40 个增到约 80 个，SDK 控制请求从 23 种增到 98 种，钩子事件从 27 个增到 33 个，设置顶层键从 75 个增到约 187 个，转录记录类型从 18 种增到 47 种。

## 目录

1. 新功能
   1.1 mods（函数钩子）与插件生态 · 1.2 云会话、远程工具与后台运行 · 1.3 Artifact、Design、Projects · 1.4 工作流、目标与循环 · 1.5 模型、计费与额度 · 1.6 代理与团队 · 1.7 记忆 · 1.8 MCP、Hooks、Skills · 1.9 新内建工具 · 1.10 新命令与子命令 · 1.11 界面与终端 · 1.12 其他
2. 改动
   2.1 运行时结构 · 2.2 查询循环 · 2.3 请求与 API 层 · 2.4 系统提示词、消息与附件 · 2.5 压缩 · 2.6 工具与执行 · 2.7 权限、Shell 与沙箱 · 2.8 MCP、插件、Hooks、Skills · 2.9 设置、存储、认证、遥测 · 2.10 代理、SDK 协议与 Remote Control · 2.11 界面、Ink、快捷键、vim · 2.12 命令 · 2.13 启动与安装
3. 删除
4. 引用校验结果

---

## 1. 新功能

### 1.1 mods（函数钩子）与插件生态

| 变化 | 证据 |
|---|---|
| **mods / 函数钩子引擎**：插件可带 JS hooks 模块，在独立 hooks worker（有心跳、卡死判定、重生）或同线程宿主中运行；事件链覆盖 `tool.call/check/describe`、`command.*`、`prompt.*`（submit/edit/change/compose…）、`session.*`、`turn.start/step/complete`、`agent.spawn`、`ui.*`；`tool.check` 只能收紧权限 | `reconstructed/src/plugins/functionHooks/`；放置 g2、g7 |
| 插件可调用的 `$` 接口：tool、session、ui、fs、http.fetch、audio、model.complete/classify/fork、process、mcp、agent、command、config、env、prompt、state；加载分 `engine.create` 与 `plugin.register` 两步，提供者分 managed / prepend / user 三层 | `reconstructed/src/plugins/functionHooks/engineCreate.js`、`reconstructed/src/plugins/functionHooks/hookDispatch.js`；放置 g7 |
| 传统 settings 钩子以 `classic.<HookEvent>` 形式桥接进函数钩子链 | `reconstructed/src/plugins/functionHooks/classicHookBridge.js`；放置 g7 |
| **插件 UI 宿主**：插件可在终端挂面板（PaneDock，多面板、数字热键）、输入框上方横幅、toast，`ui.render` 有元素/Markdown/Kitty 图片渲染器；`turn.step` 可改写模型请求、拦截流事件 | `reconstructed/src/plugins/functionHooks/ui/`；放置 g6 |
| **插件开发工具**：`claude plugin test`（子进程运行 `*.test.ts`，模拟引擎事件）、`claude plugin eval`（用例、评分器、MCP 替身、with/without 对比报告、严格围栏子会话）、`plugin init/tag/details/prune/configure` | `reconstructed/src/cli/handlers/pluginTest/`、`reconstructed/src/services/pluginEval/`；手册 extensions §10.2；放置 g0、g6 |
| 开发中 mod 用 `--plugin-dir` 监视文件变化热重载，并生成 TypeScript 类型根（`index.d.ts`） | 放置 g7 |
| **插件 manifest 新组件**：`themes`、`workflows`、`monitors`（后台常驻命令，输出作为 task notification）、`binaries`（sha256 钉住）、`types`、`experimental`、`defaultEnabled`；hooks.json 新增 `modules` | 手册 extensions §10.2 |
| **插件来源与市场**：`archive`（https zip + sha256）、`command`（本地命令产出目录）、npm 通道（`<package>@npm`，registry/tarball 解析与完整性校验）、插件依赖安装（npm 或 bun）、`skills-dir` 自动加载、claude.ai 账号同步插件、内置插件目录市场 | `reconstructed/src/utils/plugins/archiveDownload.js`、`reconstructed/src/utils/plugins/commandSource.js`、`reconstructed/src/utils/plugins/npmPluginSource.js`、`reconstructed/src/utils/plugins/dependencyInstall.js`；手册 extensions §10.2；放置 g7 |
| 插件发布：PublishPlugin 工具、发布检查、contract 文件校验、脚手架 | `reconstructed/src/tools/PublishPluginTool/`；放置 g5 |
| **内置插件**：easel（把工具结果画成终端图表）、Claude Test（`/claude-test`，用 Playwright MCP 测本地 Web 应用）、agentsMd（把 AGENTS.md 当项目指令）、mermaid 终端渲染、tips、youShouldKnow、modsGuide、diff 面板 | `reconstructed/src/plugins/bundled/`；放置 g0、g1、g6 |

### 1.2 云会话、远程工具与后台运行

| 变化 | 证据 |
|---|---|
| **无头云会话 `--cloud`**：本机 CLI 作为客户端新建或附加云端会话（含 `-p`），本机可把工具、MCP、钩子、插件、设置"提供"给云会话，各项有同意与关闭原因 | `reconstructed/src/cli/headlessCloud/`；放置 g5 |
| **远程工具 / 附加机器**：云会话或其他会话可把工具调用转到本机或"附着的机器"执行，有远端 ask 座席、进度探测、迟到结果处理、重连等待、输出"非指令"围栏 | `reconstructed/src/services/remoteTools/`、`reconstructed/src/remote/tools/`；放置 g4、g5 |
| **设备桥与设备钩子**：云会话中的钩子转发到本机执行（先静态分析命令读写的路径再担保），设备注册与设备密钥 | `reconstructed/src/services/deviceBridge/`、`reconstructed/src/utils/hooks/deviceHooks/`；放置 g2、g4 |
| **home seed**：把本机设置、CLAUDE.md、钩子、规则打包签名后推到云会话，等云端确认 | `reconstructed/src/services/homeSeed/`；放置 g1、g4 |
| `claude mcp serve` 扩展为工具宿主：向远端提供文件读写、bash 与后台命令、git 状态、MCP 中继等 | `reconstructed/src/services/mcpServe/`、`reconstructed/src/entrypoints/mcpServe/`；放置 g5 |
| **后台会话与守护进程**：`claude --bg`、`attach/logs/stop/respawn/rm`、`claude daemon`（systemd 用户服务、PTY 宿主、spare 进程池、低内存保护） | `reconstructed/src/services/daemon/`、`reconstructed/src/daemon/`、`reconstructed/src/cli/bg/`；手册 bootstrap §3.2；放置 g0、g2、g3 |
| **Agents 视图（Fleet）**：全屏会话面板，汇总本地、接管、远程与待创建会话，可派发、回复、附加、停止、分组 | `reconstructed/src/screens/FleetView/`；放置 g3 |
| **自托管 runner**（`claude self-hosted-runner`）：在客户机器上为 CCR 云环境跑会话，宿主 `~/.claude` 快照、受管 git、出口代理、健康检查与 Prometheus 指标 | `reconstructed/src/selfHostedRunner/`、`reconstructed/src/services/selfHostedRunner/`；放置 g0、g2 |
| **云 worker（CCR）回合交接**：RemoteIO 支持 `turn_handoff`（跨 worker 接手回合）、代客户端执行调用（served calls）、可信设备证明 | `reconstructed/src/cli/remoteIO.js`；放置 g6 |
| **agent 代理**：云会话出站 HTTPS 经本地中继到策略代理，自动为系统/Java/NSS/Bazel/gsutil 写 CA 信任、提供 gh 替身，内置 `gh api` 转发 | `reconstructed/src/upstreamproxy/`；放置 g6 |
| **`claude gateway` 自托管网关**：OIDC/设备流、Bedrock/Vertex/Google/mantle 上游、花费限额与共享预算、OTEL 扇出、托管策略下发 | `reconstructed/src/services/claudeGateway/`；放置 g1 |
| 工作树上传取代简单 git bundle：WIP stash 捕获、bundle 完整性校验、"为什么不上传"说明；云会话目录同步与敏感文件规则 | 放置 g0、g7 |

### 1.3 Artifact、Design、Projects

| 变化 | 证据 |
|---|---|
| **Artifact 工具**：发布、列出、读取、版本、固定、分享、实时编辑、预览（headless Chrome）、资源上传、按类型新建；`/artifacts` 对话框与 `--watch-artifact` | `reconstructed/src/tools/ArtifactTool/`、`reconstructed/src/services/artifacts/`；放置 g1、g4、g5 |
| Artifact 数据库（集合/文档、版本冲突）、presence 与实时订阅、评论读取/回复/解决与评论自动响应（线程扫描、补丁决策、后台 agent 接手） | `reconstructed/src/services/artifacts/`；放置 g0、g1、g2 |
| **Claude Design**：ClaudeDesign / DesignSync 工具经 `/v1/design/mcp` 操作 claude.ai/design 项目，含 OAuth 与审批对话框 | `reconstructed/src/tools/DesignTool/`、`reconstructed/src/tools/DesignSyncTool/`；放置 g5 |
| **Projects**：Projects 工具读写会话挂载的 claude.ai Project；Continue in Projects（`/continue`、channels API）；`/send-to-project` | `reconstructed/src/tools/ProjectsTool/`、`reconstructed/src/services/projects/`、`reconstructed/src/tools/ContinueInProjectsTool/`；放置 g1、g4、g6 |

### 1.4 工作流、目标与循环

| 变化 | 证据 |
|---|---|
| **Workflow 工具**：确定性 JS 脚本编排子代理，沙箱 VM、日志重放、agent 调用上限与预算、子工作流；`/workflows`、内置 deep-research 工作流 | `reconstructed/src/tools/WorkflowTool/`、`reconstructed/src/services/workflow/`、`reconstructed/src/tasks/LocalWorkflowTask/`；放置 g1、g2、g4 |
| **目标**：`/goal` 与 ProposeGoal 工具，回合内 check-in，`goal_status` 附件 | `reconstructed/src/commands/goal/`、`reconstructed/src/tools/ProposeGoalTool/`、`reconstructed/src/query/goalCheckIn.js`；放置 g3 |
| **自主循环**：`/loop` 动态节奏 tick、ScheduleWakeup 工具、`/loops` | `reconstructed/src/tools/ScheduleWakeupTool/`、`reconstructed/src/commands/loops/`；放置 g3 |
| 定时任务新增归属判断、permanent、routine 额外任务、提前触发命中缓存 | 手册 agents §11 |

### 1.5 模型、计费与额度

| 变化 | 证据 |
|---|---|
| **内置模型目录 + 服务端下发目录**（签名校验、缓存，按界面 cc/ccr/ccd 提供），新增 opus-4-7/4-8/5/5-5、sonnet-5/5-5、haiku-5-5、fable-5/5-1、mythos-5/5-1；默认 Opus 为 `claude-opus-5-5` | `reconstructed/src/utils/model/modelCatalog/`；手册 query §13.5；放置 g0、g3 |
| 新别名 `fable`、`best`、`fable[1m]`；`deniedModels`/`availableModels`；模型不可用时按提供商回退阶梯 | 手册 query §13.5；放置 g3 |
| **新提供商**：gateway、mantle、anthropicAws、anthropicGoogleCloud（共 8 种） | `reconstructed/src/services/api/client.js`；手册 query §7.5 |
| **effort `xhigh`** 与 ultracode 关键字、组织上限、按模型保存；`/effort` 滑块 | 手册 query §7.5、§13.5 |
| **用量额度（usage credits）**：Fable 等模型需额度时弹同意对话框，购买额度包、花费上限、自动充值、向管理员申请、`/usage-credits` | `reconstructed/src/commands/usage-credits/`；手册 query §4.2；放置 g6、g7 |
| 限额墙与自动恢复：额度用尽后自动续跑、宽限期收尾提示、限额重置券（`/limit-reset`、`/claim-credit`） | 放置 g3、g5、g7 |
| 服务端拒答回退：安全拒绝后换备用模型、墓碑化已丢弃消息、横幅提示 | `reconstructed/src/services/api/refusalFallback.js`、`reconstructed/src/query/refusalRecovery.js`；手册 query §16 |
| 价格新档（$2/$10、$4/$20、$10/$50）、`inference_geo` 美国推理区 ×1.1、组织托管价格 | 手册 query §13.5 |

### 1.6 代理与团队

| 变化 | 证据 |
|---|---|
| **观察者代理**：给代理配只读观察者，接收活动摘要，通过 ObserverReport 回报 | `reconstructed/src/services/agentObserver/`、`reconstructed/src/tools/ObserverReportTool/`；放置 g5 |
| 子代理交回审查：SubagentHandback + handoff 分类器 + SECURITY WARNING；子代理输出伪造标记扫描 | 手册 tools §6.3（差异表）；放置 g0 |
| Agent 工具新增 `effort` 参数、`model: fable`、对外的 `isolation:"remote"`；新内建代理 `claude`（FleetView 默认）与 `web-fetch` | 手册 tools §6.3（差异表） |
| 新任务类型：`mcp_task`、`monitor_ws`、`auto_mode_scan`、`local_memory_import`、`post_turn_memory`；Monitor 工具（后台常驻事件源） | `reconstructed/src/tools/MonitorTool/`；手册 agents §11 |
| 团队：存储 v5、协议帧 schema 校验、伪造来源检测、计划审批绑定校验、外部 claude-swarm 会话 | 手册 agents §11 |
| 跨会话消息：SendMessage 跨会话/UDS/bridge 寻址、收件箱（FetchInboxMessage）、peer-guard | `reconstructed/src/tools/SendMessageTool/`、`reconstructed/src/tools/FetchInboxMessageTool/`；放置 g0、g1 |
| 内置 Claude Agent SDK（`query()`、ProcessTransport）随 CLI 打包 | `reconstructed/vendor/@anthropic-ai/claude-agent-sdk/`；放置 g6 |

### 1.7 记忆

| 变化 | 证据 |
|---|---|
| **多 memory store 同步**（`/v1/memory_stores`，取代旧 team memory），新增 account 作用域、冲突与批量删除保护 | `reconstructed/src/services/memorySync/`；手册 state §10 |
| 组织记忆（发现、凭据、读写决定）、账号/协作记忆上下文与脱敏 | `reconstructed/src/services/orgMemory/`、`reconstructed/src/services/accountMemory/`；放置 g2 |
| 记忆工具 `memory_list`/`memory_write`（版本冲突处理）、本地记忆存储 | `reconstructed/src/memdir/memoryTool.js`、`reconstructed/src/services/memoryStore/`；放置 g3 |
| 记忆 BM25 索引（CJK 友好分词、Porter 词干、持久化 `.bm25-index.json`） | `reconstructed/src/memdir/memoryIndex.js`；放置 g6 |
| 记忆提取新增 hosted post-turn 配置、first look 预判、idle flush；`/pause-memory` | 手册 state §10；放置 g0 |

### 1.8 MCP、Hooks、Skills

| 变化 | 证据 |
|---|---|
| **MCP 两代客户端**：v2 先发 `server/discover`（协议 2026-07-28），收到 `-32601` 等再回退 `initialize`，legacy 判定持久化 | `reconstructed/src/services/mcp/client.js`（`connectToServer`）；手册 extensions §2.0、§10.1 |
| MCP 加密发现缓存（跳过握手）、工具空闲超时、`agent` 作用域、`cached` 连接状态、工具 `permission_policy`、`managedMcpServers` | 手册 extensions §10.1；放置 g5 |
| MCP OAuth：CIMD、issuer 回显校验（RFC 9207）、step-up 重新授权；`claude mcp login/logout/xaa` | 手册 extensions §10.1；手册 bootstrap §12 |
| **Hooks 新事件**：PostToolBatch、UserPromptExpansion、PreModelSwitch、PostModelSwitch、DirectoryAdded、MessageDisplay（共 33 个） | 手册 extensions §4.1、§10.3 |
| **新钩子类型 `mcp_tool`**；command 钩子新增 `args`（exec 形式）、`onFailure`、`rewakeMessage`、`cloud` | 手册 extensions §10.3 |
| 钩子输出新增权限决定 `defer`、`updatedToolOutput`、`sessionTitle`、`reloadSkills`、`terminalSequence`、`additionalContext` 等 | 手册 extensions §10.3 |
| **服务端下发钩子**：项目钩子在 bwrap / sandbox-exec 沙箱中运行，钩子固定（pin） | 放置 g7 |
| Skills frontmatter 新增 `disallowed-tools`、`background`、`fallback`、`metadata`；claude.ai skills 同步到本机 | `reconstructed/src/services/skillsSync/`；手册 extensions §10.3；放置 g6、g7 |
| 新内置 skill：design、artifact-*、dataviz、claude-code-docs、workflow-authoring、run、send-to-project、doctor、fewer-permission-prompts、commit、code-review | 手册 extensions §10.3；手册 commands §6.2 |

### 1.9 新内建工具

内建工具从约 40 个增到约 80 个，多数在 `reconstructed/src/tools/` 下各有目录，启用条件见手册 tools §4.7。

| 工具 | 一句话 | 证据 |
|---|---|---|
| Artifact / ArtifactComments / AppifactRepl | 发布与编辑 Artifact | `reconstructed/src/tools/ArtifactTool/`、`reconstructed/src/tools/AppifactReplTool/` |
| Workflow | 脚本编排子代理 | `reconstructed/src/tools/WorkflowTool/` |
| Monitor | 后台常驻事件源（含 WebSocket） | `reconstructed/src/tools/MonitorTool/` |
| ScheduleWakeup | 自主循环定时唤醒 | `reconstructed/src/tools/ScheduleWakeupTool/` |
| ReportFindings | 审查结论上报 | `reconstructed/src/tools/ReportFindingsTool/` |
| ProposeGoal / ProposeSkills | 提议目标 / 技能 | `reconstructed/src/tools/ProposeGoalTool/`、`reconstructed/src/tools/ProposeSkillsTool/` |
| PublishPlugin | 发布插件 | `reconstructed/src/tools/PublishPluginTool/` |
| EndConversation | 模型结束对话 | `reconstructed/src/tools/EndConversationTool/` |
| ClaudeDesign / DesignSync | 操作 claude.ai/design | `reconstructed/src/tools/ClaudeDesignTool/`、`reconstructed/src/tools/DesignSyncTool/` |
| Projects / ContinueInProjects | claude.ai Project | `reconstructed/src/tools/ProjectsTool/`、`reconstructed/src/tools/ContinueInProjectsTool/` |
| SendFile / SendUserFile / PushNotification | 跨会话发文件、发给用户、推送通知 | `reconstructed/src/tools/SendFileTool/`、`reconstructed/src/tools/SendUserFileTool/`、`reconstructed/src/tools/PushNotificationTool/` |
| FetchInboxMessage / Poll / ListAgents | 收件箱、轮询事件、列出代理 | `reconstructed/src/tools/FetchInboxMessageTool/`、`reconstructed/src/tools/PollTool/`、`reconstructed/src/tools/ListAgentsTool/` |
| SendFeedback | 反馈草稿排队 | `reconstructed/src/tools/SendFeedbackTool/` |
| WaitForMcpServers / RefreshMcpTools / ReadMcpResourceDir | MCP 等待、刷新、目录资源 | `reconstructed/src/tools/WaitForMcpServersTool/`、`reconstructed/src/tools/RefreshMcpToolsTool/`、`reconstructed/src/tools/ReadMcpResourceDirTool/` |
| SearchMcpRegistry / SuggestConnectors / ListConnectors | MCP 注册表与连接器建议 | `reconstructed/src/tools/SearchMcpRegistryTool/`、`reconstructed/src/tools/SuggestConnectorsTool/`、`reconstructed/src/tools/ListConnectorsTool/` |
| ObserverReport | 观察者代理回报 | `reconstructed/src/tools/ObserverReportTool/` |
| 记忆读写 | `memory_list` / `memory_write` 等 | `reconstructed/src/tools/MemoryTool/`、`reconstructed/src/tools/MemoryReadTool/` |
| 入门与杂项 | ShareOnboardingGuide、ShowOnboardingRolePicker、OfferChromeSetup、ReadNotifications | `reconstructed/src/tools/OnboardingGuideTool/`、`reconstructed/src/tools/ShowOnboardingRolePickerTool/`、`reconstructed/src/tools/ChromeSetupOfferTool/`、`reconstructed/src/tools/ReadNotificationsTool/` |

### 1.10 新命令与子命令

| 变化 | 证据 |
|---|---|
| 云端与后台：`/teleport`（公开，移到云端）、`/autofix-pr`、`/remote-env`、`/web-setup`、`/background`、`/stop`、`/daemon`、`/workflows`、`/list-agents` | 手册 commands §9 |
| 会话：`/fork`、`/subtask`、`/cd`、`/recap`、`/goal`、`/focus`、`/tui`（全屏/经典渲染器切换）、`/scroll-speed`、`/restart` | 手册 commands §9；放置 g6 |
| 技能与插件：`/reload-skills`、`/skill-doctor`、`/import`（从 Codex/Cursor/Gemini 导入）、`/auto-mode-setup`、`/autocompact` | 手册 commands §9 |
| design：`/design-login`、`/design-consent`、`/design-revoke`；提供方：`/setup-bedrock`、`/setup-vertex` | 手册 commands §9 |
| 额度：`/usage-credits`、`/low-priority`、`/limit-reset`、`/claim-credit` | 手册 commands §9 |
| 其他：`/team-onboarding`、`/artifacts`、`/powerup`、`/radio`、`/wellbeing`、`/pause-memory`、`/loops`、`/send-to-project`、`/advisor` | 手册 commands §9；放置 g4、g6 |
| CLI 子命令：`plugin init/validate/tag/eval/test/details/prune/configure`、`mcp xaa/login/logout`、`auto-mode critique`、`ultrareview`、`sandbox`、`import`/`import-conversations`、`purge`、`gateway`、`install [target]`、`daemon`、`self-hosted-runner`；根选项增到 133 个 | 手册 bootstrap §4、§12 |

### 1.11 界面与终端

| 变化 | 证据 |
|---|---|
| 全屏/虚拟滚动成为主路径：未读分隔线、"新消息"药丸、置顶提示头、diff 侧栏（`/diff`）、面板坞、ToastStack | `reconstructed/src/components/FullscreenLayout.js`；手册 ui §10 |
| transcript 模式：搜索栏（n/N 导航）、`[` 打印到 scrollback、`v` 用编辑器打开、`?` 帮助 | 手册 ui §10 |
| 自定义主题与插件主题 | 手册 ui §10 |
| 终端能力两轮探测（XTVERSION、kitty 标志、DECRQM…）、kitty 键盘协议 `>5u`、win32-input-mode、像素鼠标、终端内联图片（kitty/iTerm2） | 手册 ink §5.3、§12 |
| 屏幕阅读器模式 | 手册 ink §3.8；放置 g3 |
| vim 可视模式（v/V、`.` 重复）、`gj/gk`、`%` 括号跳转 | `reconstructed/src/vim/transitions.js`（`visualTransition`）；手册 ink §9.3 |
| 快捷键上下文从 18 个增到 29 个，和弦超时 1s → 3s 并弹通知 | 手册 ink §12 |
| 语音输入、预测建议、记忆召回调查、`/usage` 用量洞察 | 手册 ui §10；放置 g6 |

### 1.12 其他

| 变化 | 证据 |
|---|---|
| 从其他编码代理导入：OpenAI Codex、Cursor、Gemini CLI 的指令、规则、命令、技能、钩子、MCP，带安全检查；claude.ai 对话导入 | `reconstructed/src/services/agentImport/`、`reconstructed/src/services/conversationImport/`；放置 g0 |
| `/auto-mode-setup` 环境扫描与预收集报告、自动模式规则编辑界面 | `reconstructed/src/services/autoModeSetup/`、`reconstructed/src/components/permissions/rules/`；放置 g2 |
| 设置改动审阅（模型提议的设置改动先暂存待用户接受） | 放置 g6 |
| 托管设置 policyHelper（按 OS 运行、远程下发）与策略限制客户端（签名缓存 JWS、fail-closed） | `reconstructed/src/utils/settings/policyHelper/`、`reconstructed/src/services/policyLimits/`；放置 g2、g3、g6 |
| 隔离 git（builderGit）：为构建复制仓库、seed-admin 私有 git 目录 | `reconstructed/src/utils/git/builderGit/`；放置 g2 |
| 后台 worktree Bash 守卫：后台代理的命令先做静态分析，防止逃出自己的 worktree | `reconstructed/src/tools/BashTool/bgWorktreeGuard/`；放置 g5 |
| bashEditDiff（命令前后 git 快照生成 diff）、writeObserver（监视命令写入的文件） | `reconstructed/src/tools/BashTool/writeObserver.js`；放置 g7 |
| Claude in Chrome：组织策略、本地配对（ECDH + JWKS 断言）、工具名表增到 22 个；深链接新增 `install-plugin` 动作 | 手册 extensions §10.4；放置 g4 |
| fsSafety 安全底座：不跟随链接打开、打开后核对路径、网络路径拒绝、原子写入 | `reconstructed/src/utils/fsSafety/`；放置 g3 |
| Windows 沙箱（srt-win）、凭据遮罩、`tlsTerminate` | 手册 permissions §14 |

---

## 2. 改动

### 2.1 运行时结构

| 变化 | 证据 |
|---|---|
| **全局状态重构**：单一 STATE 对象 → 会话对象（约 30 个子存储）+ AsyncLocalStorage 覆盖 + HostState（13 个进程级存储），访问器统一为 `t().<存储>.<方法>()` | `reconstructed/src/bootstrap/state.js`；手册 bootstrap §6、§12 |
| **storage v5 后端**：配置、设置、转录、历史、插件缓存等几乎所有持久化都有"文件"与"存储 key"两条路径；diskless 进程只能走后者 | 手册 state §0、§10；手册 extensions §10.2 |
| **共用查询引擎**：新增 `createQueryEngine`，REPL、print、SDK 共用；旧版 `QueryEngine` 类拆成 `ask()` 与 headless 引擎 | `reconstructed/src/engine/queryEngine.js`、`reconstructed/src/QueryEngine.js`；手册 query §5 |
| **REPL 重构为控制器 + 外部 store**：88 的 5,005 行 REPL 组件拆成 TurnController、SessionController、PromptSubmitController、ComposerChrome、PromptDraft、ScrollPin 等控制器类，`bindHost` 注入宿主能力 | `reconstructed/src/screens/repl/`；手册 ui §3、§10 |
| **对话框统一**：权限确认队列改为对话框存储 + `requestDialog(def)` + kind 注册表（约 40 个 kind） | 手册 ui §3.5、§10 |
| print/headless 拆分为 `cli/print/` 下约 55 个文件；control_request 从约 36 种增到约 90 种（总表 98 种） | `reconstructed/src/cli/print/`；手册 bootstrap §12；放置 g4 |
| 写屏改为私有原生 `Bun.ant.CellSegmenter`（无回退）；yoga 移植改为 Int32 存储与多级缓存；Screen 增加 damage 驱动 diff | 手册 ink §3.5、§12 |
| 最低 Node 版本 18 → 22 | `reconstructed/src/setup.js`；手册 bootstrap §3.4 |

### 2.2 查询循环

| 变化 | 证据 |
|---|---|
| 每轮递归调用 `query()` → 返回哨兵 `NEXT_ROUND` 的 `while` 循环，下一轮状态写进 `state` | `reconstructed/src/query.js`（`queryLoop`、`NEXT_ROUND`）；手册 query §4.1 |
| 新恢复路径：截断续写、仅思考提示、畸形 tool_use 重试、续写未完成思考、快速回填熔断、预计算压缩换用 | `reconstructed/src/query.js`、`reconstructed/src/query/malformedToolCallRecovery.js`、`reconstructed/src/query/outputLimitRecovery.js`；手册 query §4.2、§16 |
| 轮首把消息队列（poll 事件、排队命令）折叠进本轮 | `reconstructed/src/query.js`（`absorbQueuedPollEvents`）；手册 query §4.2 |
| 工具或 MCP `_meta` 可要求结束本轮（`endTurnFromToolResult`），不再调模型 | `reconstructed/src/query.js`；手册 query §4.2 |

### 2.3 请求与 API 层

| 变化 | 证据 |
|---|---|
| 400 自愈从少数场景扩展到约 40 个 `retry:<原因>` 标签（去 beta、去 thinking.display、去媒体、降 effort…），基于新的 `withRetry` `onError` 钩子；参数每次重试重建 | `reconstructed/src/services/api/withRetry.js`、`reconstructed/src/services/api/claude.js`；手册 query §6.2、§8 |
| 持久重试从 `CLAUDE_CODE_UNATTENDED_RETRY` 改为 `CLAUDE_CODE_RETRY_WATCHDOG` 系列；`FallbackTriggeredError` 触发原因扩展；新增流式重试决策表 | 手册 query §8 |
| beta 列表由 if 链改成条件表，新增 per-turn-control、mid-conversation-tool-changes、inline-tools、thinking-token-count、cache-keepalive、server-side-fallback、message-threads 等 header | 手册 query §7.5 |
| tether 线程续接（只发增量）、提示缓存保活 `/v1/messages/cache_touch`、请求体 gzip | `reconstructed/src/services/api/tether.js`、`reconstructed/src/services/api/cacheKeepalive.js`；放置 g7 |
| 计费头新增约 10 个字段（`cc_is_subagent`、`cc_prev_req`、`cc_prompt_id`、`cc_gateway`、`cc_project`…）；`cch` 条件改为"第一方 OAuth 或 vertex"，开关只看环境变量 | `reconstructed/src/constants/system.js`（`getAttributionHeader`）；手册 query §9.5 |
| 流看门狗与心跳、慢首字节告警、媒体数量与字节上限 | 手册 query §6.2、§16 |
| 工具搜索被拒时整体内联重跑（`queryModelWithToolSearchRecovery`） | `reconstructed/src/services/api/claude.js`；手册 query §6.1 |
| 缓存断裂检测扩展到 16 种变化类型并接入服务器 cache diagnosis | `reconstructed/src/services/api/promptCacheBreakDetection.js`；手册 query §7.5 |
| 限额：新增 `seven_day_overage_included`（"Fable limit"）、`overage` 窗口与按窗口预警 | 手册 query §8 |

### 2.4 系统提示词、消息与附件

| 变化 | 证据 |
|---|---|
| 系统提示词改成"事实 → 会话段决策 → 渲染"的组合器，段决策在会话内记录并回放，保证缓存稳定 | `reconstructed/src/constants/prompts.js`（`getSystemPrompt`、`decideSystemPromptSections`）；手册 query §9.2.1、§9.5 |
| 新增段：communication、pronouns、action_caution、task_continuity、fable_identity、context_management、system_messages、focus_mode 等；lean 模型用单段正文 | 手册 query §9.5 |
| 语言、输出风格、环境信息、MCP 服务器说明从系统提示词移到附件/增量消息；gitStatus 改由主循环按需通告 | `reconstructed/src/context.js`；手册 query §9.2.4、§9.5 |
| **中途 role=system 消息**（`api_system`）：模型支持时附件折叠为 system 角色 | `reconstructed/src/utils/messages.js`（`normalizeMessagesForAPI`）；手册 query §10 |
| 附件预渲染（`rendered/renderedRole`）；约 60 种新附件类型（记忆、提及、工具宿主、提醒、目标…） | `reconstructed/src/utils/attachments.js`；手册 query §11 |
| 外来模型的带签名 thinking 会被剥离（`keepForeignThinking`） | 手册 query §10 |
| 新输出风格 Proactive、Concise | 手册 query §9.2.5 |

### 2.5 压缩

| 变化 | 证据 |
|---|---|
| 新增**预计算压缩**（提前生成摘要，阈值处直接换用）与**反应式压缩**（超限时按组摘要） | `reconstructed/src/services/compact/precomputedCompact.js`、`reconstructed/src/services/compact/reactiveCompact.js`；手册 query §12.12 |
| 自动压缩窗口来源多样化（settings 含 byModel/ceiling、clientdata、实验、模型默认表），`CLAUDE_CODE_AUTO_COMPACT_WINDOW`；快速回填熔断 | `reconstructed/src/services/compact/autoCompact.js`；手册 query §12.12 |
| 摘要提示词 8 个 A/B arm；摘要请求经 fork 共享缓存前缀；冷压缩 | `reconstructed/src/services/compact/compact.js`；手册 query §12.12 |
| microcompact：服务端 `clear_tool_uses_20250919` 空闲清理取代旧 cached microcompact | 手册 query §12.12 |
| 压缩后附件增加后台 shell、goal_status、cron 携带、projects 线程 | 手册 query §12.12 |

### 2.6 工具与执行

| 变化 | 证据 |
|---|---|
| 工具定义改为"定义对象 + `create(ctx)` 工厂"，支持"工具在别处运行"（原生转发、跨机器）；新增约 35 个工具字段 | `buildTool`（`chunk-g54kbxqw.js#on`）；手册 tools §3、§8 |
| 执行：`contextModifier` → `contextLayers`；新增 `detached` 结果、`afterResultCommitted`、中断宽限放弃、隔离锁、检查与调用之间 cwd 变化拒绝 | `reconstructed/src/services/tools/StreamingToolExecutor.js`、`reconstructed/src/services/tools/toolExecution.js`；手册 tools §5、§8 |
| **Glob/Grep 默认不注册**（嵌入式搜索为构建常量），新增"点名即恢复" | `reconstructed/src/tools.js`；手册 tools §4.4 |
| LSP、Worktree 工具总是注册；TodoWrite/Task* 加主模型门（新模型默认不给） | 手册 tools §8 |
| 工具搜索：新增 force、本对话锁、`tool_addition` 模式、DeferredToolPlaceholder、按值内联、`whenToUse` 宣告行；删除"自定义 base URL 时关闭" | `reconstructed/src/utils/toolSearch.js`；手册 tools §4.5、§8 |
| Read：`allow_large`、整文件超限改为自动分页、PDF 页预算、设备文件黑名单扩展 | 手册 tools §6.2 |
| Edit：`\uXXXX` 转义匹配与风格保持、暂存审阅、按模型放宽先读要求、stale 自动恢复 | 手册 tools §6.2 |
| Bash：输出上限可配（`bashOutputMaxChars`）、长 sleep 阈值改为 25 秒并引导 Monitor、后台命令表扩充、git 跟踪支持 Gerrit/GitLab/Bitbucket | 手册 tools §6.1 |
| Agent：`run_in_background` 默认后台；fork 必须显式 `subagent_type:"fork"`；深度上限默认 3、并发默认 20；TaskCreate 不再并发安全；SendMessage 拒绝广播 | 手册 tools §6.3 |
| WebFetch/WebSearch：CCR 代理抓取、`offset` 续读、`backgrounding:"detach"`；WebFetch 可改由 `web-fetch` 子代理承担 | 手册 tools §6.4、§4.2 |

### 2.7 权限、Shell 与沙箱

| 变化 | 证据 |
|---|---|
| `auto` 进入对外权限模式枚举（不再依赖编译开关）；default 显示为 "Manual"，接受 `manual` 别名 | 手册 permissions §3.1、§14 |
| 新规则来源 `mcpMount`、`toolsNarrowing`、`mcpServerPolicy`、`hostCredential`；工作区信任闸门（未受信任时丢弃项目层 allow 规则） | 手册 permissions §4.2、§14 |
| 判定主体从 `permissions.ts` 拆出（门面 `decideWithToolCheckHooks`），新增插件 `tool.check` 裁决层、服务端分类器、钩子 allow 不能越过规则 | `reconstructed/src/utils/permissions/permissions.js`；手册 permissions §5.1、§14 |
| 自动模式分类器只剩两阶段 XML 路径，新增严重度、`hard_deny`、子代理交回审查、备用模型；服务端分类器 | `reconstructed/src/utils/permissions/yoloClassifier.js`、`reconstructed/src/utils/permissions/serverClassifier/`；手册 permissions §7、§14；放置 g7 |
| **Bash 安全检查从正则改为 AST**：纯 TS bash 解析器 + 安全遍历 + 语义检查，两遍读法、`__UNCERTAIN_VAR__`、bash/zsh 分歧检查 | `reconstructed/src/utils/bash/bashParser.js`、`reconstructed/src/utils/bash/ast.js`；手册 permissions §8、§14；手册 tools §6.1 |
| deny/ask 规则匹配剥离更多命令包装（sudo、doas、env、strace、flock、unshare、watch…） | 手册 tools §6.1 |
| 危险目录增加 `.husky`、`.cargo`、`.devcontainer`、`.yarn`、`.mvn`；配置目录新增禁区；`blockReadsOutsideWorkingDirectories` | 手册 permissions §14 |
| 拒绝跟踪按消息去重，超限后回退人工并带限时自动拒绝窗口 | 手册 permissions §5.5、§14 |
| 沙箱适配层扩到 300 多个声明：可信层过滤、读禁止根复查、scrub 模式 | `reconstructed/src/utils/sandbox/`；手册 permissions §9、§14 |
| Shell 执行：worktree 隔离防逃逸、cgroup 与 CPU 记账；PowerShell 解析缓存按宿主一份、不可见字符拦截 | 手册 permissions §10、§14 |

### 2.8 MCP、插件、Hooks、Skills

| 变化 | 证据 |
|---|---|
| MCP 工具描述截断上限 2048 → 可配置 4096（ToolSearch 加载时 16384）；组织策略支持 `${VAR}` 展开 | 手册 extensions §10.1 |
| 插件安全加固：manifest/组件路径符号链接逃逸检查、archive URL 拒绝回环/元数据地址、官方名防仿冒 | 手册 extensions §10.2 |
| Hooks 安全加固：stdio 截断不采信、PreToolUse 钩子未完成即拒绝、凭证类变量不插值；prompt 钩子在 Stop 系事件包装为停止条件判断；agent 钩子最多 50 轮 | `reconstructed/src/utils/hooks.js`；手册 extensions §10.3 |
| LSP 诊断登记表改为按会话根的类、文档版本递增与 LRU didClose、`requestTimeout`、`restartOnCrash` 实现 | `reconstructed/src/services/lsp/LSPDiagnosticRegistry.js`；手册 extensions §10.4 |

### 2.9 设置、存储、认证、遥测

| 变化 | 证据 |
|---|---|
| 设置 schema 从 75 个顶层键增到约 187 个；托管设置新增 policyHelper 层、`managedSourcesBehavior: merge`、WSL 继承 Windows 策略、签名缓存 | `reconstructed/src/utils/settings/`；手册 state §2、§10 |
| 转录记录类型 18 → 47，新增转录迁移、撕裂尾行封闭、远程镜像；项目目录名可由 `CLAUDE_CODE_PROJECT_DIR_NAME` 覆盖 | `reconstructed/src/utils/sessionStorage.js`；手册 state §4、§10 |
| 认证：新增 WIF、宿主启动器令牌、proxyAuthHelper、SSRF 守卫；被拒登录回滚；OAuth 新 scope `user:plugins`、`user:projects:*` | `reconstructed/src/utils/auth.js`；手册 state §6、§10；手册 query §9.5 |
| Datadog 白名单事件 41 → 243、换新 token；1P 端点改为 `/api/event_logging/v2/batch` | `reconstructed/src/services/analytics/datadog.js`、`reconstructed/src/services/analytics/firstPartyEventLogger.js`；手册 state §7、§10 |
| 调试日志改为 `DebugLogger` 单例类，新增 `CLAUDE_CODE_DEBUG_LOGS_DIR` | 手册 state §10 |
| worktree 管理扩展：pid 锁、陈旧锁释放、符号链接祖先检查、`worktree.baseRef` | 手册 state §10 |
| 配置迁移版本 11 → 14：新增 migrateModelAliases、migrateFable5ToFableAlias、migrateUserIntentToSettings、migrateNotificationDismissals | `reconstructed/src/migrations/`；手册 bootstrap §7、§12 |

### 2.10 代理、SDK 协议与 Remote Control

| 变化 | 证据 |
|---|---|
| SDK 控制协议从 23 种请求扩展到 98 种（云会话、Chrome、`ui_*` 表面协议、设备钩子、远程工具、turn_handoff、claim_session、文件读取…），显式标注发起方；`system` 子类型约 15 → 56 种 | `reconstructed/src/entrypoints/sdk/`；手册 agents §5.4 |
| Remote Control 独立模式统一 CCR v2，新增 environment secret 续期、sessions watch（SSE）、工具宿主、可信设备、无头模式 `runBridgeHeadless`；删除 `--session-timeout` | `reconstructed/src/bridge/bridgeMain.js`；手册 agents §6 |
| REPL 内桥只剩 v2 env-less（`initEnvLessBridgeCore`，单函数 65 KB）：服务端控制请求从 5 种增到 23 种，work secret、属主校验、transcript 延迟上传、PR 订阅 | `reconstructed/src/bridge/remoteBridgeCore.js`；手册 agents §7 |
| TaskStop：模糊名字解析、属主检查、级联停止与豁免 | `reconstructed/src/tasks/stopTask.js`；手册 agents §2.3、§11 |
| fork：`runForkedAgent` 强制缓存前缀一致（不声明 ownPrefix 不许改工具集） | `reconstructed/src/utils/forkedAgent.js`；手册 agents §11 |

### 2.11 界面、Ink、快捷键、vim

| 变化 | 证据 |
|---|---|
| 输入草稿外置到 `PromptDraft` store，支持 `prompt.change/submit` 钩子 | `reconstructed/src/screens/repl/PromptDraft.js`；手册 ui §10 |
| 新消息类型：`work_segment`、`recap_fold`、`speaker_label`、`advisor`、会话收件箱/频道消息 | 手册 ui §10 |
| 快捷键 scopeChain 分发、`validateKeystroke` 细化；vim 普通模式命令改为表驱动 | 手册 ink §12 |
| OSC 21337 标签状态写入被关闭；DECSTBM 滚动优化 | 手册 ink §12 |

### 2.12 命令

| 变化 | 证据 |
|---|---|
| `/cost`、`/stats` → `/usage` 的别名；`/extra-usage` → `/usage-credits` | 手册 commands §9 |
| `/vim`、交互端 `/output-style` → 并入 `/config`，留存根 | 手册 commands §9 |
| `/review` → 发行内建技能 code-review；`/commit`、`/doctor` → 发行内建技能；`/bug` 成为主名，`/feedback` 独立 | 手册 commands §9 |
| 大量命令新增无头孪生（local 版），可在 `-p`/SDK 中使用 | 手册 commands §4.4、§9 |

### 2.13 启动与安装

| 变化 | 证据 |
|---|---|
| cli.js 快速路径大幅扩展：后台会话动词、daemon、agents 视图、self-hosted-runner、`--gh-standin`、`--handle-uri`、Chrome native host；`--bare` 在入口处设置 `CLAUDE_CODE_SIMPLE` | `reconstructed/src/entrypoints/cli.js`（`cliMain`）；手册 bootstrap §3.2、§12 |
| main 拆成 applyClientTypeAndEarlySettings、run、buildCliProgram；根 action 改为 `prepareSession` 返回 headless/interactive 再分别接入 | `reconstructed/src/main.js`、`reconstructed/src/cli/startup/prepareSession.js`；手册 bootstrap §3.5、§12 |
| 原生安装器下载源改为 downloads.claude.ai，清单 zst 压缩并带签名；PID 锁、staging 校验、下载停滞超时 | 手册 bootstrap §8、§12 |
| 退出改为 `ShutdownCoordinator` 类：stdout 排空预算、失效保险定时器 | `reconstructed/src/utils/gracefulShutdown.js`；手册 bootstrap §9、§12 |

---

## 3. 删除

| 删除项 | 证据 |
|---|---|
| **伴侣精灵 buddy**（物种、稀有度、精灵帧、`/buddy`）；阅读树 `buddy/` 名下的声明都是匹配误差 | 手册 agents §9.6 |
| **REPL 内 env-based 桥** `bridge/replBridge.ts`（2,406 行）；环境/轮询模式只保留在独立的 `claude remote-control` | 手册 agents §7 |
| **session memory 压缩**（`tengu_sm_compact*` 0 处）及 SessionMemory、MagicDocs 功能 | 手册 query §12.12；手册 state §10 |
| 旧 cached microcompact（cache_edits） | 手册 query §12.12 |
| 系统提示词段 `# Output efficiency`、`# Scratchpad Directory`、`# Function Result Clearing` | 手册 query §9.5 |
| 旧 tool_use 自动模式分类器（`classify_result`）及 `CLAUDE_CODE_TWO_STAGE_CLASSIFIER`、`CLAUDE_CODE_JSONL_TRANSCRIPT`、`CLAUDE_CODE_DUMP_AUTO_MODE` | 手册 permissions §14 |
| 旧 `bashSecurity.ts` 的约 25 个正则校验器（`validateIFSInjection`、`validateBraceExpansion`…）；bash 解析器不可用时的回退 | 手册 tools §6.1；手册 permissions §14 |
| TeamCreate、TeamDelete、TaskOutput 工具（进退役名单）；外部构建中没有 Config、Tungsten、REPL 工具 | `reconstructed/src/tools/retiredTools.js`；手册 tools §4.1、§8 |
| Bash 输入的内部字段 `_simulatedSedEdit`、输出字段 `assistantAutoBackgrounded` | 手册 tools §6.1 |
| `pip` 插件来源 | 手册 extensions §10.2 |
| SessionEnd reason `bypass_permissions_disabled` | 手册 extensions §10.3 |
| computer-use 的 CLI 本机 MCP 入口（`--computer-use-mcp`）；改为托管桌面 | 手册 extensions §10.4 |
| Remote Control `--session-timeout`；`--sandbox/--no-sandbox` 改为明确报错 | 手册 agents §6 |
| 命令 `/tag`、`/think-back`、`/thinkback-play`、`/files`、`/pr-comments`、`/init-verifiers`、`/env`、`/onboarding`；`/agents` 只剩隐藏的 "(removed)" 存根 | 手册 commands §9 |
| 附件类型 compaction_reminder、companion_intro、bagel_console、current_session_memory、skill_discovery、verify_plan_reminder | 手册 query §11 |
| UI 组件 SedEditPermissionRequest、UserBashOutputMessage、UserToolCanceledMessage、SystemAPIErrorMessage、StatusNotices 等约 46 个文件（部分可能只是被内联或匹配失败） | 手册 ui §10 |
| `migrateFennecToOpus` 迁移 | 手册 bootstrap §12 |
| 代理记忆快照同步（只剩无引用 schema）；verificationAgent 的位置换成 `web-fetch` 代理 | 手册 tools §6.3 |
| 模型能力缓存（`isModelCapabilitiesCacheEnabled` 恒 false，改由模型目录 + 服务端目录） | 手册 query §13.5 |
| 旧版 darwin 钥匙串读 API key 的路径（linux 构建只读 `primaryApiKey`） | 手册 state §10 |

---

## 4. 引用校验结果

见文末（由校验脚本生成）。
