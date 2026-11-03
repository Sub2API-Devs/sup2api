# 放置组 7（place-g7）过程记录

范围：`analysis/segments/placement-work.json` 的 `groups[7].chunks`，共 33 个 chunk。主体是 5 MB 的主 chunk `chunk-e6aww6q8.js`（363 个 `_unattributed` part，约 2.33 MB）。另有 32 个只含几十字节的小 chunk，以及声明来自这些 chunk 的 21 个 `_new/` 模块。

## 1. 结果数字

| 项 | 数值 |
| --- | --- |
| 待放置声明 | 8,273 个 / 2,329,920 字节 |
| 已放置 | 8,271 个 / 2,329,787 字节（99.99%） |
| 未放置 | 2 个 / 133 字节（第 6 节） |
| 目标文件 | 585 个：新文件 444 个（含 3 个 vendor），并入已有模块 141 个 |
| 并入已有模块 | 2,023 个声明 / 601,489 字节 |
| 放进新文件 | 6,248 个声明 / 1,728,298 字节 |
| 只含 1 个声明的文件 | 66 个，多是 `_new/*Command.ts` 命令对象和小 chunk 的单常量 |
| semantic 名 | `naming/semantic-p7.jsonl` 559 条（confidence 0.5–0.85）。已跳过门面键，也跳过了其他 semantic 文件已经命名的键 |
| 中文说明 | `naming/docs-p7.jsonl` 382 条，覆盖本组 ≥1000 字节且有明确作用的声明，以及部分 500–1000 字节的声明 |
| 模块说明 | `naming/modules-p7.json` 585 条，新文件都以"2.1.316 新增："开头 |

## 2. 方法

1. `artifacts/tmp/p7/digest.mjs` 生成 `digest.txt`。它按 part 列出每个声明的最佳名字、种类、大小、字符串，以及调用者和被调用者所在的路径。e6aww6q8 的 part 简写为 `U:part-NNN.js`。
2. 起点是各领域"给 lead 的建议"，例如 ShutdownCoordinator 对应 gracefulShutdown，part 238 对应 permissions.ts，还有 GrepTool、FileWriteTool、notebook、poll events fold、conversationRecovery 等条目。然后逐个 part 判断：
   - 调用者集中在某个已有模块的，并入该模块。例如 `utils/messages.ts`、`services/api/claude.ts`、`utils/permissions/permissions.ts`、`tools/BashTool/bashPermissions.ts`、`utils/plugins/pluginLoader.ts`、`utils/sessionStorage.ts`。
   - 主题明确但旧版没有对应文件的，新建同目录兄弟文件。
3. 计划写在 `artifacts/tmp/p7/plan.txt`。格式有几种：
   - `part-NNN 路径`：整个 part 放到一个路径。
   - `| 最小名 路径`：在 part 内从这个声明起切分。
   - `new:_new/X 路径`：整体移动一个 `_new` 模块。
   - `chunk:文件 路径`：小 chunk 整体归属。
   `build-placement.mjs` 读取计划，生成 `naming/placement-g7.json`，并输出覆盖率和未放置清单。
4. 命名清单是 `sem.txt`，由 `build-semantic.mjs` 计算绑定标识符的偏移，并检查门面键、跨文件重名和重复键。说明清单是 `docs.tsv`，由 `build-docs.mjs` 处理。模块说明是 `mod-desc.tsv`，由 `build-modules.mjs` 处理。
5. 21 个 `_new/` 模块的去向：
   - `_new/ShutdownCoordinator.ts` 并入 `utils/gracefulShutdown.ts`。
   - `_new/decideWithToolCheckHooks.ts` 并入 `utils/permissions/permissions.ts`（门面 rd4xtrpj 含 hasPermissionsToUseTool）。
   - `_new/exec.ts` 并入 `utils/Shell.ts`（门面 gnfg7h3r 是 exec/setCwd）。
   - `_new/createPluginFromPath.ts` 并入 `utils/plugins/pluginLoader.ts`（门面 w27ej3rn）。
   - `_new/commands.helpers-e6aw.ts` 并入 `commands.ts`。
   - 15 个 `_new/*Command.ts` 移到 `commands/<名字>/index.ts`。`agentsRemovedCommand` 去了 `commands/agents/index.ts`，`feedbackCommand` 去了已有的 `commands/feedback/index.ts`。

## 3. 新目录与新文件（按主题，字节为本组放入新文件的量）

| 主题目录 | 声明数 | 字节 |
| --- | --- | --- |
| `plugins/functionHooks/`（mods / 函数钩子引擎，约 60 个文件） | 1,472 | 333,040 |
| `utils/plugins/`（新文件：npm 来源、依赖安装、二进制资源、缓存发布与实体化、版本目录替换、claude.ai 市场、使用中标记等） | 601 | 205,374 |
| `tools/BashTool/`（bashEditDiff、writeObserver、沙箱排除、内联 shell 分析、破坏性目标、cd 跟踪等） | 369 | 131,747 |
| `utils/` 根下零散新文件 | 540 | 120,033 |
| `services/api/`（tether、缓存保活、增量请求体、前缀账本、模型回退、计费、响应诊断等） | 372 | 100,096 |
| `utils/permissions/`（含 `serverClassifier/` 服务端分类器 7 个文件） | 393 | 99,361 |
| `utils/hooks/`（含 `servedHooks/` 服务端下发钩子 6 个文件） | 293 | 87,136 |
| `utils/transcript/`（转录条目、文件、写入、修复、反序列化、恢复公告与报告） | 212 | 72,455 |
| `services/compact/`（自动压缩窗口、预计算压缩、响应式压缩、空闲压缩、压缩携带） | 165 | 68,856 |
| `utils/teleport/`（云启动、目录同步与规则、受审查 git、分支状态、可信设备等） | 203 | 66,280 |
| `utils/claudeAiSync/`（claude.ai 技能/插件同步） | 184 | 44,727 |
| `utils/messages/`、`utils/attachments/`、`utils/contextAttachments/` | 329 | 76,484 |
| `services/tools/`（后台工具调用、Web 工具隔离、决策遥测、MCP 结果元数据） | 110 | 30,615 |
| `utils/worktree/`、`utils/shell/`、`utils/pollEvents/`、`utils/remoteTools/`、`utils/sandbox/` | 207 | 65,727 |
| `commands/*`（team-onboarding、limit-reset、ultrareviewPost、import、restart、focus 等） | 约 130 | 约 42,000 |
| `memdir/`（记忆索引补建、召回选择、写入检查） | 46 | 17,299 |
| `tools/*`（ArtifactTool 通知与恢复携带、WebFetch URL 来源、MemoryReadTool、ClaudeDesignTool、PowerShell 遥测等） | 约 170 | 约 55,000 |
| `tasks/*`（子代理 check-in、子工作、内存压力、shell check-in、后台启动规则） | 69 | 18,571 |

完整清单见 `naming/modules-p7.json`。

## 4. 2.1.316 新功能（手册素材）

- **Mods / 函数钩子引擎**（`plugins/functionHooks/`）。chunk 中保留了源码路径 `src/plugins/functionHooks/hooks-worker/hooks-worker.js`。
  - 插件提供 hooks 模块，在独立的 hooks worker 线程中运行，也可以在主线程同线程宿主中运行。worker 有心跳、卡死判定和重生机制。
  - 事件链覆盖 `tool.call/check/describe`、`command.run/describe`、`config.set`、`telemetry.log`、`prompt.submit/fill/edit/change/autocomplete/suggest/section/context/attachment/mention/compose`、`agent.offer/spawn`、`skill.prompt`、`attribution.text`、`session.start/receive/append/send/compact/attach/detach/measure/end`、`turn.start/step/complete`、`ui.*`。
  - 传统 settings 钩子以 `classic.<HookEvent>` 形式桥接进来。
  - 插件可调用的 `$` 接口：`tool.call/register`、`session.*`、`ui.toast/focus/press/copy/view`、`fs`、`http.fetch`、`audio.play/speak`、`model.complete/classify/fork`、`process.run/spawn`、`mcp.call/connect`、`agent.spawn/register`、`command.register/run`、`config.set`、`env.get/set`、`prompt.compose/submit`、`interface.call`、`state.get/set`。
  - 加载过程分 `engine.create` 和 `plugin.register` 两步。提供者分 managed、prepend、user 三层，另有封存插件和 person hold。tool.check 钩子只能收紧权限。
  - 开发中 mod 用 `--plugin-dir` 监视文件变化，自动重载并给出用户提示。另会生成 TypeScript 类型根（index.d.ts）。
- **服务端自动模式分类器**：上下文构造（git 状态、浏览器标签、上一轮）、裁决（arbiter）、结论收紧（clamp）、回退到内置安全检查的提示、分类器缓存破坏检测、邮件发送方框架规则、沙箱网络分类器。
- **压缩体系**：可配置的自动压缩窗口（`CLAUDE_CODE_AUTO_COMPACT_WINDOW`）、预计算压缩（提前生成摘要并持久化，到阈值直接应用）、响应式压缩（超限时按组摘要）、空闲压缩、压缩时携带 loop/cron 与自动模式状态。
- **请求层**：
  - tether 线程续接：只发增量，并判断续接条件。
  - 提示缓存保活：`/v1/messages/cache_touch`。
  - 增量请求体序列化，发送前做字节校验。
  - 提示前缀账本、工具 schema 线上缓存、限流预检、受监管制度（HIPAA）拒绝重建、思考块截断续接、mTLS 证书轮换重载、代理与网关错误特征诊断。
  - API 额度购买、自动充值、超额计费、税费预览。
- **插件系统扩展**：
  - npm 插件来源（registry 解析、tarball 解析、完整性校验）和插件依赖安装（npm 或 bun，读取 bun.lock、package-lock）。
  - 插件二进制资源（sha256 固定）、缓存发布与版本目录原子替换、链接实体化。
  - 使用中标记与同步回收站、跨市场安装与名字冲突、插件改名迁移。
  - claude.ai 托管市场与插件安装、Git LFS 检查、git SHA 固定、git ssh 配置。
- **claude.ai 同步**：技能和插件从 claude.ai 账户同步到本机，包括同步根目录的安全检查和已同步技能的访问规则（`Skill(...)` 规则作用域）。
- **服务端下发钩子（remote-tools 钩子）**：项目钩子在 bwrap 或 sandbox-exec 沙箱中运行，有钩子固定（pin）、设备钩子暂存和提示文案。
- **云会话（teleport）**：云启动参数校验、目录同步及其规则（敏感文件、托管配置、排除目录）、受审查的 git、分支是否已推送、可信设备证明、仓库信任、会话标题策略污点。
- **Bash 工具**：
  - bashEditDiff：命令前后为工作区做 git 快照并生成 diff。
  - writeObserver：监视命令写入的文件。
  - bashEditRecorder、内联 shell（bash -c）分析、破坏性目标范围判断、危险 rm 变量展开检查、cd 跟踪、沙箱排除命令表、沙箱失败提示、代理失败汇总、同步记忆批量删除保护。
- **任务**：协调者 worker check-in、子工作跟踪、子代理待投递消息（插件可拒绝恢复）、后台 shell 无输出提醒、内存压力下终止后台 shell、后台启动规则 `ask()`/`confirm()`。
- **其他**：
  - 命令：`/limit-reset`（额度重置券）、`/claim-credit`、`/team-onboarding`（生成队友入门指南）、`/import`（Codex/Gemini/Cursor）、`/focus`、`/wellbeing`、`/restart` 版本目标、ultrareview 结论回贴 PR。
  - Web 与 MCP：WebFetch URL 来源检查、云会话 worker 代抓网页、MCP 资源型技能。
  - 运行环境与提醒：资源看门狗（磁盘）、剩余 token 提醒、经过时间与静默回合提醒、磁盘满警告、Windows shell 启动器、Windows 沙箱 git 身份、进程 CPU 时间遥测。
  - 转录：请求体块重放、线上工具输入回显与修复。

## 5. 主要判断与不确定处

- `chunk-e6aww6q8` 是一个超大的混合 chunk，相邻 part 主题经常跳变，同一个 part 内也会混入几个不同的源文件。我按调用者路径和字符串切分，但个别切点可能偏一两个声明。
- `plugins/functionHooks/` 是我新设的目录，依据是 chunk 中出现的源码路径字符串 `src/plugins/functionHooks/...`。已用 SendMessage 告知 place-g2 和 place-g3，组 0 也用了同一目录（如 `plugins/functionHooks/sessionEvents.ts`）。其中文件的划分（`apiDispatch`、`hooksWorkerHost`、`hooksModuleLoader`、`devModsWatch` 等）是按功能推断的，原始文件名未知。
- 有 4 个新路径与其他组重合，属于有意对齐：`plugins/bundled/claudeTest/constants.ts`（组 0）、`services/mcp/mcpSkills.ts`（组 4）、`tools/ArtifactTool/constants.ts`（组 3）、`utils/plugins/marketplaceNames.ts`（组 4）。
- 并入已有模块最多的几处：`utils/permissions/permissions.ts`（190 个声明）、`utils/messages.ts`（170）、`utils/plugins/pluginLoader.ts`（126）、`services/api/claude.ts`（108）、`services/tools/toolExecution.ts`（101）。这些是 2.1.316 在原文件里新增的大量逻辑，也可能其中一部分本属独立的新文件。
- 小 chunk 的归属：
  - 三个内嵌资源引用（`0shjtwgf`、`f3v430vj`、`sd0b2vx1`，分别引用 `*.mjs-*.txt.zst`）放进 `utils/embeddedResources/`。
  - `7bc3fmtk`、`jw1wb0qr`、`mrx6y2r5` 是第三方重导出，或 `@azure/abort-controller` 的 AbortError，放进 `vendor/`。
  - 其余按导入方或相邻模块归属。例如 `zfbhezv9` 归 `utils/permissions/permissionSetup.ts`，`vv0zxx69` 归 `utils/sessionIngressAuth.ts`，`e4xept39` 归 `services/settingsSync/index.ts`。

## 6. 未放置

| 声明 | 字节 | 原因 |
| --- | --- | --- |
| `chunk-2nmyq07e.js#e` | 110 | 一个只有 `cached`/`resolve()` 的类，`resolve` 永远返回 false，看起来是被构建裁空的特性探测。chunk 本身没有导出，被 3e2f3btj、jde8wnzx、pw933apk、tyg7f3ek、y1shfdfm 以副作用方式导入，无法判断来源 |
| `chunk-2nmyq07e.js#c` | 23 | 同上，是对上面那个类的懒加载包装（`new W(()=>new e)`） |

## 7. 给 lead 的建议

1. `plugins/functionHooks/` 已有组 0 和组 7 两组写入，建议汇总时统一检查文件划分，必要时合并过细的文件（如 `attributionHooks.ts`、`settingsReadApi.ts` 只有 2 个声明）。
2. `utils/permissions/permissions.ts`、`utils/messages.ts`、`services/api/claude.ts` 并入的声明很多。建议领域成员复核是否应再拆出新文件，例如 permissions.ts 中的 MCP 服务器策略和 blockReadsOutsideWorkspace 持久化。
3. 15 个 `commands/<name>/index.ts` 命令对象只含命令定义本身。命令的实现在别的 chunk 里，需要和放置那些 chunk 的组对齐路径，例如 `commands/limit-reset/` 下已有实现时应合并。
4. semantic 命名只覆盖了约 560 个较大的声明。本组 ≥500 字节且未命名的候选还有约 400 个，主要是消息与附件渲染、Bash 解析的小函数，可以在第二轮补。
5. `chunk-2nmyq07e` 建议在最终构建中作为未知副作用模块保留原样。
