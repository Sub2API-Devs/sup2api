# 阅读指南与索引

> 本仓库是官方 Claude Code CLI 2.1.316 的 AST 逆向重建。本文告诉你：按目的从哪里读起、全部文档各讲什么、`reconstructed/src/` 每个顶层目录是什么、怎样用 `tools/q.mjs` 查代码。
> 统计为 2026-11-03 09:15 生成的阅读树快照（place-rest 放置之后）；lead 重新生成 `reconstructed/` 后数字会小幅变化。

## 目录

1. 按目的的阅读路线
2. 全部文档
3. `reconstructed/src/` 顶层目录一览
4. 查代码：`tools/q.mjs` 与 `symbols.jsonl`
5. 引用校验结果

---

## 1. 按目的的阅读路线

### 1.1 想理解整体

1. `docs/ARCHITECTURE.md` 第 2 节分层图、第 4 节"一次请求的完整旅程"——读完就知道代码大致怎么串起来。
2. `docs/handbook/query.md` 第 1–4 节：查询主循环是整个程序的中心。
3. `docs/handbook/bootstrap.md` 第 3 节：进程怎样从 `cli.js` 走到 REPL 或 `-p`。
4. `docs/handbook/tools.md` 第 3、5 节与 `docs/handbook/permissions.md` 第 5 节：工具调用与权限判定。
5. `docs/CHANGES-SINCE-2.1.88.md`：如果你熟悉旧版（2.1.88 泄露源码），这里是最快的差异清单。

### 1.2 想看某个功能

先在下表找入口，再用 `node tools/q.mjs find <关键词>` 定位声明。

| 功能 | 先读 | 代码入口（`reconstructed/src/` 下） |
|---|---|---|
| 系统提示词怎么拼 | `docs/handbook/query.md` 第 9 节 | `constants/prompts.js`（`getSystemPrompt`）、`constants/system.js`、`utils/systemPrompt.js` |
| 请求体、beta 头、缓存断点 | `docs/handbook/query.md` 第 6、7、14 节 | `services/api/claude.js`（`queryModel`）、`services/api/client.js` |
| 重试与 400 自愈 | `docs/handbook/query.md` 第 8 节 | `services/api/withRetry.js` |
| 上下文压缩 | `docs/handbook/query.md` 第 12 节 | `services/compact/` |
| 模型、effort、thinking、fast mode | `docs/handbook/query.md` 第 13 节 | `utils/model/`、`utils/effort.js`、`utils/thinking.js` |
| 某个内建工具 | `docs/handbook/tools.md` 第 6 节 | `tools/<名字>Tool/` |
| 工具搜索 / 延迟加载 | `docs/handbook/tools.md` 第 4.5–4.6 节 | `utils/toolSearch.js`、`tools/ToolSearchTool/` |
| 权限模式、规则、自动模式 | `docs/handbook/permissions.md` 第 3–7 节 | `utils/permissions/` |
| Bash 命令安全分析与沙箱 | `docs/handbook/permissions.md` 第 8–10 节、`docs/handbook/tools.md` 6.1 | `utils/bash/`、`tools/BashTool/`、`utils/sandbox/` |
| MCP | `docs/handbook/extensions.md` 第 2 节 | `services/mcp/` |
| 插件与 mods 函数钩子 | `docs/handbook/extensions.md` 第 3 节、`docs/process/placement-g2.md`、`docs/process/placement-g7.md` | `utils/plugins/`、`plugins/functionHooks/` |
| Hooks（settings 钩子） | `docs/handbook/extensions.md` 第 4 节 | `utils/hooks.js`、`utils/hooks/` |
| Skills | `docs/handbook/extensions.md` 第 5 节 | `skills/` |
| 斜杠命令 | `docs/handbook/commands.md` | `commands.js`、`commands/` |
| 子代理与任务 | `docs/handbook/agents.md` 第 1–2 节 | `tools/AgentTool/`、`tasks/`、`utils/forkedAgent.js` |
| 团队 / swarm | `docs/handbook/agents.md` 第 3 节 | `utils/swarm/` |
| SDK / stream-json 协议 | `docs/handbook/bootstrap.md` 第 5 节、`docs/handbook/agents.md` 第 5 节 | `cli/structuredIO.js`、`cli/print/`、`entrypoints/sdk/` |
| Remote Control | `docs/handbook/agents.md` 第 6–7 节 | `bridge/` |
| 云会话、远程工具、后台会话 | `docs/CHANGES-SINCE-2.1.88.md` 1.2 节、`docs/process/placement-g5.md` | `cli/headlessCloud/`、`services/remoteTools/`、`remote/tools/`、`services/daemon/` |
| 设置与托管设置 | `docs/handbook/state.md` 第 2 节 | `utils/settings/` |
| 会话存储、resume | `docs/handbook/state.md` 第 4 节 | `utils/sessionStorage.js` |
| CLAUDE.md 与记忆 | `docs/handbook/state.md` 第 5 节 | `utils/claudemd.js`、`memdir/` |
| 登录与认证 | `docs/handbook/state.md` 第 6 节 | `utils/auth.js`、`services/oauth/` |
| 遥测与关闭开关 | `docs/handbook/state.md` 第 7 节 | `services/analytics/` |
| REPL 界面与对话框 | `docs/handbook/ui.md` 第 3–6 节 | `screens/REPL.js`、`screens/repl/`、`components/` |
| 终端渲染、快捷键、vim | `docs/handbook/ink.md` | `ink/`、`keybindings/`、`vim/` |
| 启动参数与子命令 | `docs/handbook/bootstrap.md` 第 4 节 | `main.js`（`buildCliProgram`）、`entrypoints/cli.js` |

### 1.3 想改造或移植

1. 先读 `docs/ARCHITECTURE.md` 第 8、9 节（约定与已知限制）：阅读树不能直接运行，名字有可信度之分。
2. 要运行或做行为实验，用 `runnable/`（`docs/process/verify.md` 第 3 节讲怎样用 Bun 1.4.4 在隔离沙箱里跑、挂假上游对拍）。交互界面需要 `tools/verify/bun-ant-shim.js` 垫片（`Bun.ant.CellSegmenter`）。
3. 要改名字或改归属，不要手改生成物：改 `naming/` 下的命名表（格式见 `naming/README.md`）或放置表（`naming/placement-*.json`），再跑 `tools/pipeline.sh`（`README.md` "重建流程"）。改名引擎保证 α 等价（`docs/process/rename.md`）。
4. 关心请求的线上形状（第一方 / 第三方形状、请求头与请求体键顺序），读 `docs/handbook/query.md` 第 14 节与 `docs/process/verify.md` 第 7 节（实测）。
5. 第三方依赖和版本：`analysis/vendor/packages.json`、`docs/process/vendor.md` 第 5 节。

### 1.4 作为 AI 检索

- 工作规则：`AGENTS.md`（只读目录、一个目录一个写者、写文档的要求）。
- **按名字找声明**：直接在 `reconstructed/symbols.jsonl` 里搜 `"name":"<名字>"`，得到 `file:line`、声明 id、命名来源和说明；比全文 grep 准。
- **按概念找**：`node tools/q.mjs find <词>`（匹配声明名、字符串字面量、属性名），再 `show` 看代码。字符串字面量（错误文案、环境变量名、`tengu_*` 事件名、GrowthBook 开关名）在压缩后原样保留，是最可靠的检索词。
- **看调用关系**：`node tools/q.mjs callers|callees <id>`。
- **定位模块**：`reconstructed/manifest.json`（阅读树文件 → 声明 id、来源 chunk、归属方法）；`analysis/segments/decl-path.jsonl`（声明 id → 模块路径）。
- **判断名字可不可信**：看 `symbols.jsonl` 的 `source`（facade > semantic ≈ vendor > reference > auto > minified），以及说明里的"错配"注记。
- **核对原文**：每个声明前的 `//@ chunk-xxx.js:起-止` 指向 `original/chunk-xxx.js` 的字节区间；有疑问时以 `original/` 为准。
- 手册里的路径多写成 2.1.88 的 `.ts`/`.tsx` 文件名，对应阅读树里同路径的 `.js`。

---

## 2. 全部文档

### 2.1 入口与总览

| 文档 | 一句话 |
|---|---|
| `README.md` | 项目是什么、目录结构、重建流程、怎样保证"完全基于官方 316"、命名来源 |
| `AGENTS.md` | 给在本仓库工作的 AI 与成员的硬规则 |
| `docs/INDEX.md` | 本文：阅读路线、文档清单、目录一览、查询命令 |
| `docs/ARCHITECTURE.md` | 整体架构：分层图、一次请求的完整旅程、子系统一览、构建事实、读代码的约定、已知限制 |
| `docs/CHANGES-SINCE-2.1.88.md` | 2.1.88 → 2.1.316 的新功能、改动、删除总表，每条带证据位置 |
| `docs/PLAN.md` | 逆向计划：已知事实、分层产物、流水线、团队分工、验收标准 |
| `docs/WORKLOG.md` | 按时间记录的里程碑 |

### 2.2 子系统手册（`docs/handbook/`）

| 手册 | 一句话 |
|---|---|
| `docs/handbook/bootstrap.md` | 启动序列、cli.js 快速路径、commander 命令树、stream-json 协议、全局状态、配置迁移、安装更新、优雅退出、上游代理 |
| `docs/handbook/query.md` | 查询主循环、headless 引擎、queryModel 请求构建与 SSE、客户端与 beta 头、重试与限额、系统提示词、消息规范化、附件、压缩、模型与 effort、请求头/体实测对照 |
| `docs/handbook/tools.md` | Tool 接口与 create 工厂、工具注册与工具池、工具搜索与延迟加载、执行编排、全部内建工具逐个说明 |
| `docs/handbook/permissions.md` | 权限模式、规则语法/来源/加载、一次工具调用的判定链、文件路径权限、自动模式分类器、Bash 解析与安全遍历、PowerShell、沙箱、Shell 执行、安全存储 |
| `docs/handbook/extensions.md` | MCP 两代客户端与握手、插件系统、33 个 Hooks 事件、Skills 与输出样式、LSP、Claude in Chrome、Computer Use、深链接 |
| `docs/handbook/state.md` | 设置层级与托管设置、`~/.claude.json`、会话存储与 resume、CLAUDE.md 与记忆、认证、遥测与关闭开关、基础设施 |
| `docs/handbook/ui.md` | REPL 控制器架构、组件树、对话框栈、输入处理、消息渲染、权限请求界面、主要 hooks、主题 |
| `docs/handbook/ink.md` | Ink 渲染管线、CellSegmenter、全屏与滚动、输入解析、选区复制、快捷键系统与默认绑定、vim 状态机 |
| `docs/handbook/agents.md` | 子代理与 fork、任务系统、团队/mailbox 协议、协调者、SDK 控制协议（98 种请求）、Remote Control 两种模式、定时任务 |
| `docs/handbook/commands.md` | 命令对象三种类型、注册表与过滤、解析执行链、全部内建命令、重要命令详解 |

每本手册末尾有"与 2.1.88 的差异"和"未解之处"两节。

### 2.3 过程文档（`docs/process/`）

| 文档 | 一句话 |
|---|---|
| `docs/process/lead.md` | 提取、AST 扫描、旧版匹配、Bun 按顶层语句拆 chunk 的发现、模块切分、旧版命名 |
| `docs/process/vendor.md` | 第三方包识别：单元与特征、Bun 运行时帮助函数、CJS 包裹与 ESM 分段、版本判定、包清单 |
| `docs/process/rename.md` | 作用域安全改名引擎与 α 等价校验 |
| `docs/process/verify.md` | 运行验证：隔离沙箱、假上游、54 个场景对拍、实测的 CLI 行为（环境变量、请求形状、400 降级链）、`Bun.ant.*` 垫片 |
| `docs/process/domain-guide.md` | 第二阶段领域成员的工作指南（语义命名、声明说明、手册） |
| `docs/process/domain-bootstrap.md` 等 10 份 | 各领域成员的过程记录：做法、数据、切分/匹配修正建议、未完成项（bootstrap、query、tools、permissions、extensions、state、ui、ink、agents、commands） |
| `docs/process/placement-guide.md` | 第三阶段放置指南：怎样给未归属代码和 `_new/` 模块找到正式路径 |
| `docs/process/placement-g0.md` … `docs/process/placement-g7.md` | 8 个放置组的记录：结果数字、新建目录与文件、`_new/` 模块去向、2.1.316 新功能、未放置部分 |
| `docs/process/placement-grest.md` | 最后一轮放置（place-rest）：197 个顶层 `_new/` 门面模块、`_misplaced`、`_unattributed` 小段全部落位 |
| `docs/process/fixer.md` | 领域建议的裁决与落地、命名冲突裁决、`_misplaced` 清单 |

### 2.4 数据与生成物（非文档，但常用）

| 文件 | 一句话 |
|---|---|
| `reconstructed/symbols.jsonl` | 每个绑定一行：name、file、line、id、source、kind、doc |
| `reconstructed/manifest.json` | 阅读树文件 → 来源路径、声明、chunk、归属方法、导入导出 |
| `analysis/segments/summary.json` | 模块/声明/字节总数，按类别与归属方法统计 |
| `analysis/segments/domains.json` | 一方模块按领域分组（由 `tools/segment/domains.mjs` 按路径前缀生成） |
| `analysis/vendor/packages.json` | 第三方包、版本、字节、版本依据 |
| `analysis/facades/facades.json` | 513 个门面 chunk 与原始导出名 |
| `naming/README.md` | 命名表格式 |
| `naming/modules-*.json`、`naming/docs-*.jsonl`、`naming/semantic-*.jsonl` | 模块说明、声明说明、语义名（生成阅读树时写入文件头与 JSDoc） |

---

## 3. `reconstructed/src/` 顶层目录一览

按字节从大到小。"文件"是阅读树文件数，"声明"是顶层声明数，"字节"是对应原始代码字节（`analysis/segments/modules.json`）。

| 目录 / 文件 | 内容 | 文件 | 声明 | 字节 |
|---|---|---|---|---|
| `utils/` | 通用基础设施，最大的目录：设置、配置、会话存储、认证、权限、bash/shell/沙箱、hooks、插件加载、模型、消息、附件、git/worktree、遥测等（各子目录见手册） | 1479 | 26,079 | 8.79 MB |
| `services/` | 有状态的服务：API 客户端与重试（api/）、压缩（compact/）、工具执行（tools/）、MCP（mcp/）、遥测（analytics/）、LSP、记忆同步、Artifact、守护进程、远程工具、工作流、自托管 runner 等 | 959 | 17,167 | 7.08 MB |
| `tools/` | 内建工具，每个工具一个目录（约 80 个：Bash、Read、Edit、Agent、Skill、WebFetch、Artifact、Workflow、Monitor…） | 438 | 5,300 | 3.25 MB |
| `components/` | React（Ink）组件：消息渲染、输入框、权限与各类对话框、设置界面、Spinner、Logo、设计系统 | 620 | 5,728 | 2.86 MB |
| `cli/` | CLI 层：headless/print 与 SDK 协议（print/、structuredIO、remoteIO、transports/）、启动准备（startup/）、子命令处理（handlers/）、后台会话（bg/）、无头云会话（headlessCloud/） | 190 | 3,230 | 2.03 MB |
| `plugins/` | 内置插件（bundled/：easel、claudeTest、agentsMd…）与 mods 函数钩子引擎（functionHooks/） | 205 | 5,624 | 1.31 MB |
| `commands/` | 斜杠命令，每个命令一个目录（命令对象 + 实现） | 316 | 1,907 | 1.22 MB |
| `entrypoints/` | 入口：cli.js（快速路径）、init.js（初始化）、mcp.js 与 mcpServe/（mcp serve）、sdk/（SDK schema）、selfHostedRunner/ | 36 | 416 | 787 KB |
| `bridge/` | Remote Control：独立模式 bridgeMain 与 REPL 内 v2 桥 | 98 | 1,317 | 619 KB |
| `remote/` | 远程会话查看与驱动、远程权限桥、远程工具（tools/） | 70 | 1,028 | 497 KB |
| `hooks/` | React hooks：输入、历史、补全、权限（toolPermission/）、通知（notifs/）、IDE/桥/会话集成 | 121 | 671 | 438 KB |
| `screens/` | 屏幕：REPL.js 与其控制器（repl/）、Doctor、ResumeConversation、Agents 视图（FleetView/） | 48 | 577 | 379 KB |
| `skills/` | Skills 加载（loadSkillsDir）与发行内建技能（bundled/） | 71 | 896 | 365 KB |
| `ink/` | 自维护的 Ink 分支：reconciler、DOM、布局、渲染、Screen、diff、输入解析、选区、终端能力 | 107 | 992 | 338 KB |
| `tasks/` | 任务实现：本地代理、本地 shell、主会话转后台、云会话任务、同进程队友、Dream、工作流 | 49 | 540 | 181 KB |
| `constants/` | 系统提示词组合器（prompts.js）、身份行与计费头（system.js）、OAuth、输出风格等常量 | 20 | 245 | 146 KB |
| `query/` | 查询循环拆出的部分：依赖、配置、停止钩子、模型选择、拒答/流式/输出上限恢复、目标 check-in、回合钩子 | 17 | 345 | 130 KB |
| `daemon/` | 后台守护进程与后台会话管理器（派发、备用进程、认证、低内存保护、定时 worker） | 18 | 222 | 128 KB |
| `bootstrap/` | 全局状态：会话对象、进程级存储与约 430 个访问器（state.js） | 4 | 814 | 124 KB |
| `memdir/` | 自动记忆：记忆目录、召回、BM25 索引、记忆工具与提示词段 | 16 | 257 | 123 KB |
| `main.js` | 主模块：main、run、命令树 buildCliProgram、交互会话、迁移驱动 | 1 | 69 | 115 KB |
| `upstreamproxy/` | CCR 容器的上游代理、中继与 CA 信任 | 7 | 205 | 104 KB |
| `query.js` | 查询主循环 query / queryLoop | 1 | 34 | 83 KB |
| `selfHostedRunner/` | 自托管 runner（进程表、健康检查、生命周期钩子） | 16 | 194 | 80 KB |
| `QueryEngine.js` | headless 的 ask() 与 headless 查询引擎 | 1 | 62 | 70 KB |
| `keybindings/` | 快捷键：默认绑定表、keybindings.json 加载与校验、和弦解析、上下文分发 | 20 | 167 | 60 KB |
| `types/` | 类型与生成的 protobuf 事件定义（generated/）、权限类型 | 9 | 73 | 46 KB |
| `native-ts/` | 2.1.88 原生模块的 TS 移植：yoga-layout、color-diff、file-index | 3 | 140 | 45 KB |
| `engine/` | 2.1.316 新增的共用查询引擎（queryEngine.js）及渲染行、附件应答等 | 6 | 51 | 37 KB |
| `state/` | AppState store、选择器、对话框队列、进行中工具等界面状态 | 17 | 129 | 34 KB |
| `commands.js` | 命令注册表：内建命令表、getCommands、findCommand | 1 | 127 | 28 KB |
| `vim/` | 输入框 vim 模式：状态机、移动、操作符、文本对象 | 5 | 111 | 28 KB |
| `coordinator/` | 协调者模式 | 4 | 30 | 26 KB |
| `history.js` | 输入历史 history.jsonl | 1 | 86 | 23 KB |
| `interactiveHelpers.js` | 交互模式的设置屏（信任、onboarding） | 1 | 34 | 17 KB |
| `schemas/` | Hooks 配置 schema | 2 | 26 | 15 KB |
| `context/` | React Context：通知、排队消息、模态、覆盖层 | 11 | 92 | 13 KB |
| `setup.js` | setup()：Node 版本检查、chdir、钩子快照、worktree、版本锁 | 1 | 15 | 13 KB |
| `migrations/` | 配置迁移脚本 | 15 | 19 | 9 KB |
| `context.js` | 用户上下文（CLAUDE.md、日期等）与系统上下文、git 状态 | 1 | 25 | 9 KB |
| `Tool.js` | 工具公共定义与按名查找 | 1 | 36 | 9 KB |
| `cost-tracker.js` | 会话成本与 token 统计 | 1 | 22 | 8 KB |
| `tools.js` | 工具注册：getAllBaseTools、getTools、assembleToolPool | 1 | 17 | 5 KB |
| `dialogLaunchers.js` | 启动期对话框的懒加载启动器 | 1 | 18 | 5 KB |
| `server/` | `claude server` 直连会话管理（WebSocket） | 2 | 2 | 2 KB |
| `replLauncher.js` | 启动 REPL（渲染 App + REPL） | 1 | 3 | 1 KB |
| `assistant/` | 远程会话事件历史分页（sessionHistory） | 1 | 5 | 1 KB |
| `outputStyles/` | 输出风格目录加载 | 1 | 5 | 1 KB |
| `main/` | 主模块的小辅助：快速路径子命令判定、resume 参数扫描 | 2 | 8 | 714 B |
| `Task.js` | 任务类型、ID 前缀与状态基础定义 | 1 | 5 | 707 B |
| `projectOnboardingState.js` | 项目 onboarding 状态 | 1 | 2 | 506 B |
| `ink.js` | Ink 对外 render | 1 | 2 | 428 B |
| `voice/` | 语音模式组织开关 | 1 | 4 | 219 B |
| `tasks.js` | 任务实现注册表 | 1 | 1 | 197 B |
| `assets/` | 内嵌资源模块 | 1 | 6 | 162 B |
| `replSessionSeat.js` | REPL 会话席位 | 1 | 1 | 119 B |

另外三棵兄弟树：`reconstructed/vendor/`（第三方，1,989 个模块、7.2 MB，按 npm 包路径）、`reconstructed/runtime/`（Bun 运行时帮助函数）、`reconstructed/assets/`（资源文件）。

各目录里的 `_new/` 子目录（共 130 个文件）和 `*.helpers-xxxx.js` 文件的含义见 `docs/ARCHITECTURE.md` 8.5 节。早期的顶层 _new/、_unattributed/、_misplaced/ 已在放置阶段清空，全部声明都有了正式路径（`docs/process/placement-grest.md`）。

---

## 4. 查代码：`tools/q.mjs` 与 `symbols.jsonl`

在仓库根目录运行（需要先跑过 `SCAN=1 bash tools/pipeline.sh` 生成 `analysis/scan/`）。`<id>` 是声明 id `chunk-xxx.js#压缩名`；`<name>` 可以是可读名（旧版名/语义名）或压缩名。每次调用要加载全部分析数据，约需数十秒。

| 命令 | 作用 | 例子 |
|---|---|---|
| `node tools/q.mjs find <text>` | 名字、字符串字面量、属性名含 `<text>` 的声明 | `node tools/q.mjs find next_round` → `chunk-ha3km179.js#Oo  [query.ts · layout]` |
| `node tools/q.mjs show <id\|name>` | 格式化源码 + 出处（应用了可读名） | `node tools/q.mjs show queryModelWithStreaming` |
| `node tools/q.mjs callers <id\|name>` | 谁用它 | `node tools/q.mjs callers 'chunk-ha3km179.js#J$'`（`query()` 的调用方：TurnController、QueryEngine、runHeadlessStreaming、startMCPServer…） |
| `node tools/q.mjs callees <id\|name>` | 它用谁 | `node tools/q.mjs callees 'chunk-e6aww6q8.js#e_n'`（queryModel 依赖的函数） |
| `node tools/q.mjs module <path>` | 一个重组模块的全部声明（路径用原始 `.ts` 名） | `node tools/q.mjs module query/deps.ts` |
| `node tools/q.mjs where <chunk.js>` | 一个 chunk 贡献给了哪些重组模块 | `node tools/q.mjs where chunk-ha3km179.js` |
| `node tools/q.mjs bindings <id\|name>` | 声明内每个绑定：命名键（@偏移）、压缩名、当前最佳名及来源 | `node tools/q.mjs bindings 'chunk-ha3km179.js#xc'` |
| `node tools/q.mjs module-bindings <path>` | 同上，作用于整个模块 | `node tools/q.mjs module-bindings query/deps.ts` |

`show` 的 id 参数含 `$` 时在 shell 里要用单引号。

不想等 `tools/q.mjs` 加载时，可以直接查 `reconstructed/symbols.jsonl`：

```bash
# 按名字找定义位置
grep '"name":"queryLoop"' reconstructed/symbols.jsonl
# 按声明 id 找当前所在文件（阅读树重新生成后行号会变，id 不变）
grep '"id":"chunk-e6aww6q8.js#e_n"' reconstructed/symbols.jsonl
# 列出某个文件里有说明的声明
node -e 'require("fs").readFileSync("reconstructed/symbols.jsonl","utf8").split("\n").filter(Boolean).map(JSON.parse).filter(s=>s.file==="src/query.js"&&s.doc).forEach(s=>console.log(s.line,s.name,s.doc.slice(0,60)))'
```

找到声明后，看它前面的 `//@ chunk-xxx.js:起-止` 行，可以到 `original/chunk-xxx.js` 里按字节区间核对原文。

---

## 5. 引用校验结果

校验时间 2026-11-03 02:55（UTC），对象为当时的 `reconstructed/`。脚本检查本文所有代码样式引用：路径是否存在（相对仓库根，或相对 `reconstructed/src/`，`.ts/.tsx` 对应 `.js`）；声明 id 是否在 `reconstructed/symbols.jsonl`；"路径 · 函数名"中的函数是否属于该文件；标识符与字面量是否出现在 `reconstructed/symbols.jsonl` 或阅读树代码中。在 2.1.316 找不到、但在 2.1.88 源码（`references/claude-code-analysis/src`）中存在的，计为"只在 2.1.88 中存在"（删除项、旧名，属预期）。

- 共检查 253 处引用：路径 238/238，名字 9/9，字面量 6/6；占位符与含空格的说明性文字 35 处未检查。

- 未通过：0 处。
