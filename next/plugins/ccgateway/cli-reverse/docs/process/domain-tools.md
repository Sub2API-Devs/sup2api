# 领域过程记录：tools（dom-tools）

> 2026-11-03。领域模块清单：`analysis/segments/domains.json` 的 `tools` 键（194 个重组模块，约 2.4 MB 阅读树代码，1 813 个顶层声明）。

## 1. 做了什么

1. 读 `AGENTS.md`、`docs/PLAN.md`、`docs/process/domain-guide.md`、`docs/process/lead.md`；写工作清单生成器 `artifacts/tmp/tools/worklist.mjs`（每个顶层声明的当前名、来源、外部使用者数）。
2. 按体量把 194 个模块分成五组，主线程做 core 组，另派四个分组助手（各自只写 `artifacts/tmp/tools/<组>/`）并行：
   - **core**（15 个模块，主线程）：`Tool.ts`、`tools.ts`、`services/tools/*`、`utils/toolPool.ts`、`utils/toolSearch.ts`、`tools/ToolSearchTool/*`、`tools/utils.ts`、`tools/testing/*`、`tools/SyntheticOutputTool/*`、`tools/REPLTool/*`；
   - **shell**（32）：`tools/BashTool/*`、`tools/PowerShellTool/*`、`tools/shared/gitOperationTracking.ts`；
   - **file**（47）：Read/Edit/Write/Glob/Grep/NotebookEdit/LSP 与 `utils/` 下文件支撑模块；
   - **agent**（47）：AgentTool、SendMessage、Task*、TeamCreate、TodoWrite、spawnMultiAgent、`utils/tasks.ts`、`utils/todo/types.ts`；
   - **misc**（53）：AskUserQuestion、Brief、Config、计划模式、Worktree、MCP 系列、RemoteTrigger、Cron、Skill、WebFetch、WebSearch。
   lead 中途更新切分（门面 chunk 原名、fingerprint-shared 不再决定归属）后，又派一个助手（**leftover**）给新切分下仍是压缩名的约 200 个顶层绑定补名。
3. 共用工具（都在 `artifacts/tmp/tools/`，文件头写了输入输出）：
   - `validate.mjs`：校验 semantic 键是规范绑定偏移、名字合法、无重复；docs 的 id 存在；modules 键属于领域。
   - `merge.mjs`：合并六组产物 → 正式交付物；与门面名（`analysis/names/facade.jsonl`）同键的条目丢弃；置信度 <0.6 的另存 `naming/_semantic-tools-lowconf.jsonl`（文件名以 `_` 开头，命名引擎跳过，留作复核）。
   - `coverage.mjs`：按当前切分统计名字来源分布与 docs 覆盖。
   - `handbook.mjs`、`process.mjs`：拼接手册与本文件。
   - core 组脚本：`core/toolprops.mjs`（解析 getAllBaseTools 里每个工具的 name/isEnabled/shouldDefer 等）、`core/lazytools.mjs`（懒 require 的工具表）、`core/toolfields.mjs`（316 全部 92 个工具定义的字段频次，对比 2.1.88 Tool.ts）、`core/dumpb.mjs`（快速列声明内绑定）、`core/at.mjs`（按文本找声明）、`core/build.mjs`（命名草稿 → jsonl）、`core/facadecheck.mjs`（与门面名比对）。
4. 关键调查：
   - 默认无 Glob/Grep 的原因和开关（手册 4.4）；
   - 316 实测"直接 12、延迟 11"逐个对上代码（手册 4.6），发现 TodoWrite/Task* 新增主模型门（agent 组发现，`chunk-e6aww6q8.js#t6`）；
   - 工具接口的 316 形态（定义对象 + `create(ctx)` 工厂）与 35 个新字段（手册 3.x）；
   - 执行编排、延迟加载判定的全链路（手册 4.5、5.x）。

## 2. 数据

| 项 | 数 |
|---|---|
| `naming/semantic-tools.jsonl` | **2 303 条**（顶层 1 513、参数 524、局部 266；其中约 132 条覆盖错配的旧版名/自动名，note 写了原因）；置信度全部在 0.6–0.95 |
| `naming/_semantic-tools-lowconf.jsonl`（不加载） | 298 条（置信度 0.4–0.55 的草稿，主要是 shell/agent/misc 组的局部变量与含义不太确定的顶层名） |
| 与门面名同键而丢弃 | 61 条（门面优先；门面同名 12 条、异名 49 条，异名处以门面为准） |
| `naming/docs-tools.jsonl` | **1 348 条** |
| `naming/modules-tools.json` | **194 / 194** |
| `docs/handbook/tools.md` | 约 12 万字符、1 300 行 |

覆盖（按 lead 最新切分，`coverage.mjs`）：

| 指标 | 值 |
|---|---|
| 领域顶层声明 | 1 813 |
| 顶层绑定（不含 import） | 2 293：semantic 1 273、reference 635、facade 130、auto 80、**仍为压缩名 175** |
| 有 docs 的声明 | 1 147 / 1 813（63%） |
| 被其他模块使用的声明 | 781，其中有 docs 711（91%） |

仍为压缩名的 175 个顶层绑定：低置信度草稿占大部分（已有候选名，在 `_semantic-tools-lowconf.jsonl`）；其余是第三方或归错的代码（见附录各组"给 lead 的建议"）和含义未确认的小函数（`chunk-3s7ydtfd.js` 表格摘要、`chunk-vrb44rx7.js#Ol/jh/Fl`、`chunk-fq0cr76a.js#N6r`、tools.ts 中外部构建为 null 的工具槽 `fn/ha/hn/kn` 等）。

## 3. 主要发现

1. **工具定义形态变了**：316 的 `buildTool` 是 `chunk-g54kbxqw.js#on`（切在 `_unattributed/chunk-g54kbxqw/part-024.js`），定义对象带 `create(ctx)`，`validateInput/checkPermissions/call` 由工厂返回；旧版名 `buildTool` 被错配到 `chunk-e6aww6q8.js#$7`（命令别名过滤）。
2. **默认无 Glob/Grep**：`hasEmbeddedSearchTools`（`chunk-e6aww6q8.js#FC`）把旧版的 `EMBEDDED_SEARCH_TOOLS` 编译成常量 "true"，于是 `getShadowedSearchToolNames`（`#Xoe`）返回 {Glob, Grep}；`--tools`/`--allowedTools` 点名 Glob/Grep、`CLAUDE_CODE_ENTRYPOINT=local-agent`、Windows 无 Git Bash 时恢复。
3. **12+11 的构成**：12 个直接工具中 ReportFindings、ScheduleWakeup、ListAgents、Workflow 是 316 新工具，DeferredToolPlaceholder 是请求构建时追加的占位（`#gun`）；TodoWrite/Task* 因主模型门不可用，AskUserQuestion/计划模式因 `-p` 非交互不可用。
4. **工具搜索**：默认 `tst`；删除了"自定义 base URL 时关闭"分支，所以第三方地址也默认延迟；新增 force、HIPAA/实验 beta 关闭、对话锁（held_off）、端点拒绝记忆、`tool_addition` 模式、不可延迟列表（GrowthBook + 托管设置）。
5. **大量核心函数在 `_unattributed`**：`getTools`、`assembleToolPool`、`TOOL_CATALOG`、`runToolUse`、`buildTool`、嵌入式搜索开关、Grep 执行体、FileStateCache、Write 的 call、Agent 工具对象（`chunk-0tkmvwy0.js` 整块）、Bash 权限核心（part-184/186/189）等。这些在手册里按真实身份描述，已给出 semantic 名（能写的都写了）。

## 4. 遇到的问题

- 早期 `q.mjs callers/where` 在大 chunk 上要十几分钟，各组改用自写的 `users.mjs`（直接读 decls 与 modules 的引用表）；lead 已修复。
- Git Bash 下 heredoc 里的反斜杠会被吃掉（写正则的脚本出错一次），改用 Write 工具写脚本文件。
- 阅读树对解构参数的显示有时省略第一个普通参数（例如 `chunk-3h9nvmn3.js#E5r` 显示成只有解构参数），读代码时要对照 `original/`。
- 切分在工作中途更新（门面原名、强制同模块），worklist 是旧切分生成的；最终覆盖率按新切分重算，并补了 leftover 组。

## 5. 给 lead 的建议（汇总；完整证据见附录 A–E）

### 5.1 core 组

切分（`声明 id → 应归属路径/应叫什么，证据`）：

- `chunk-g54kbxqw.js#on`、`#Yl`、`#RH`、`#av`、`#jn`（`_unattributed/chunk-g54kbxqw/part-024.js`）→ `Tool.ts`；`#on` 是 `buildTool`（展开 `TOOL_DEFAULTS`，88 个工具定义经它构造）。
- `chunk-kxyd0g16.js#Qr/#KLs/#Jr/#Zi/#pa/#fa`（part-016）、`#HEo/#nt/#Z$/#NEo/#qNt`（part-017）、`#h5`（part-018）→ `tools.ts`；门面已给 `getTools`、`assembleToolPool`、`TOOL_CATALOG`、`withLateEnabledToolsIfAdvertised`、`TOOL_POOL_MEMO_TTL_MS`。`#qNt` 现在归在 `utils/permissions/permissions.ts`（旧版名 getRuleByContentsForTool 错配）。
- `chunk-e6aww6q8.js#FC/#Xoe/#Klo/#Glo` → `utils/embeddedTools.ts`（`hasEmbeddedSearchTools`）。
- `chunk-e6aww6q8.js#$B` → `services/tools/toolExecution.ts`（`runToolUse`，旧版同名；当前在 `_unattributed/chunk-e6aww6q8/part-344.js`）。
- `chunk-3h9nvmn3.js#l/#E/#f/#O` → `tools/ToolSearchTool/prompt.ts`（与 `isDeferredTool` 等同一组延迟判定）；`#x5o`（ShareOnboardingGuide 提示词）应移出该模块。
- `chunk-mp7v59a0.js#Par`（`isToolSearchForceOverride`，日志串可证）、`#Avn` → `utils/toolSearch.ts`。
- `chunk-e6aww6q8.js#gun`（DeferredToolPlaceholder 定义）、`#h1o`（WaitForMcpServers 工具）→ 工具搜索相关模块（新文件或 `utils/toolSearch.ts`）。
- `chunk-ag5x7vhf.js#axs`（/hooks 工具名列表）→ `commands/hooks/` 一带；`chunk-ag5x7vhf.js#Rv` 随之；`chunk-vd0bcd16.js#wne`（屏幕阅读器环境）→ 无障碍/环境模块；`chunk-18hwfzwa.js#oue`（typeahead 命令匹配）→ `hooks/useTypeahead`；`chunk-e6aww6q8.js#$7/#pSt`（命令别名过滤）→ `commands`/skills 一带。它们都不属于 `Tool.ts`/`tools.ts`。
- `utils/toolSearch.ts` 里的 fingerprint-shared 克隆不属于该模块：`chunk-e6aww6q8.js#Dz`（hooks 用）、`#v4e`（工具描述哈希，已被切到 utils/api.ts）、`#rfe`（代理定义重建，门面名 `rebuildAgentDefinitions`）、`#dWo`、`chunk-jeazk6wn.js#je/#be/#C/#ge`（Artifact durable 订阅）、`chunk-f25sswmp.js#We/#Ssr`（图片尺寸校验，query/claude 用）、`chunk-4121qate.js#kd`、`chunk-mthxbav8.js#Xn`、`chunk-s61vbvea.js#Jc`、`chunk-mp7v59a0.js#_/p/b/m/E/S/Fui/d/g/Xst/CPe`（Claude in Chrome 提示词，应归 `utils/claudeInChrome/`）。
- `chunk-bk5ntezz.js#F`（工具名规范化）、`chunk-qaeygs3y.js#Yrt`、`chunk-e6aww6q8.js#U1e/#QAo/#cUt` 被 fingerprint-shared 配成 `findMcpServerConnection*`，不属于 toolExecution。
- `chunk-ae5g0zb5.js#Ku`（旧版名 isSyntheticOutputToolEnabled）条件看起来与 StructuredOutput 无关，疑似错配。
- `chunk-1nk4j4sn.js#I`（消息作者分类）不属于 `tools/utils.ts`。

旧版名配错（已用 semantic 覆盖）：`#$7`≠buildTool、`#oue`≠toolMatchesName（真正的是 `chunk-g54kbxqw.js#Pt`）、`#axs`≠getTools、`#Rv`≠filterToolsByDenyRules、`#wne`≠getToolsForDefaultPreset、`#Doe`≠runToolUse（是"已取消"结果构造）、`#Jke`≠getDeferredToolsDelta（真正的是 `#V6s`）、`#E2`≠formatDeferredToolLine（门面：isDeferredTool；真正的 formatDeferredToolLine 是 `#P5o`）、`chunk-s61vbvea.js#Jb`≠getDeferredToolsCacheKey。

### 5.2 各分组要点

- **shell**：turndown 规则（`chunk-vwj6ccer.js#ge/#Na`）、Anthropic SDK tool runner（`chunk-hwmsct5x.js#vm/#zu`）是第三方；Artifact pin、DesignSync、插件评测、附件读取、git 安全调用、Windows 路径规范化混进了 shell 模块；Bash"参数能否执行代码"检测（约 16 个 `chunk-e6aww6q8.js#*Lo`）被放进 PowerShell readOnlyValidation；`#$Tn`（含 `hRr`）应归 `PowerShellTool/commandSemantics.ts`；Bash 权限核心 `hQ/XVt/Iye/yYt/_4n/Bjr/Ajt/PYt` 在 part-184/186/189 应归 `bashPermissions.ts`。旧版名互换：`#EQ` 与 `chunk-v0yfsee9.js#nn`；`#DVn` 不是 applySedEdit。
- **file**：Grep 执行体 `chunk-e6aww6q8.js#bVo`、FileStateCache 类 `chunk-82kqcve8.js#$a`、Write 的 call `#jKo`、NotebookEdit 提示词与校验、`MAX_EDIT_FILE_SIZE`（`#h2n`）应移入；lodash 片段、OpenTelemetry Span、插件打包扫描/市场代码、ULTRACODE 字样渲染（`utils/treeify.ts`）、光标移动（`utils/truncate.ts`）应移出；fileHistory 的 `#WCe/#g0e` 名字互换。
- **agent**：`chunk-0tkmvwy0.js` 整块是 AgentTool（工具对象 `won`、输入 schema 等），应整体归 `tools/AgentTool/AgentTool.tsx`（其中 `#jn/#Lo` 被误归 `utils/toolResultStorage.ts`）；内建代理 `claude`（`chunk-fgpf3f12.js#F7e`）误归 `services/MagicDocs`；`chunk-dz36xfxg.js#Nn/#Be` 是 Bash 后台判定；`utils/tasks.ts` 的 `blockTask/deleteTask` 互换、`getTask` 错配。
- **misc**：`tools/MCPTool/classifyForCollapse.ts` 实际约 40 个声明是敏感环境变量识别与 JVM 选项脱敏（`chunk-q8cqcff6.js#*`）；`tools/ConfigTool/*` 三个模块全是误归（316 没有 Config 工具）；`tools/EnterPlanModeTool/UI.tsx` 的 13 个声明是表格列摘要代码；`tools/WebFetchTool/utils.ts` 有约 10 个 fingerprint-shared 克隆；zod `custom()`、DOM innerHTML 访问应归 vendor。
- **leftover**：`chunk-3s7ydtfd.js#ro/un/dn/cn/yn/hn/Tn/gn/nS`（表格摘要）、`chunk-2rkp9ne9.js#Be/ie/rt/Ne`（ProposeSkills）、`chunk-9cjx5pnm.js#*`（插件打包/市场）、`chunk-6xf89m6d.js#Cxo/Jzn/l`（git 引用名校验）、`chunk-82kqcve8.js#gn/wl/Af/Cf/Ko`（通用路径/软链逃逸检查）都不属于各自所在的工具模块。

### 5.3 对流程的建议

- `naming/_semantic-tools-lowconf.jsonl` 里的 298 条候选名置信度不足 0.6，不加载；如果 lead 认为某些模块（如 runAgent、SendMessage 投递逻辑的局部变量）值得低置信度命名，可改名去掉 `_` 前缀后加载。
- 手册里提到的 `_unattributed` 核心函数重新归属后，阅读树里 `tools.ts`、`Tool.ts`、`toolExecution.ts` 才完整；建议优先处理 5.1 前四条。

## 6. 未完成

- 交互模式请求 13 个工具（`-p` 12 个）多出的那个未核实（需运行时抓包对照）。
- `Aee`（getTools 的权限过滤）只读了开头，属 permissions 领域。
- 远程/宿主执行（`nae`、`Jo`、`hosts.runToolUse`）的转发协议未深入。
- 各分组未完成项见附录。

## 附录 A：shell 组过程记录


范围：`tools/BashTool/*`（17 个模块）、`tools/PowerShellTool/*`（14 个）、`tools/shared/gitOperationTracking.ts`，共 32 个重组模块，527 个顶层声明（其中 182 个被组外模块使用）。

### 做了什么

1. 用 `artifacts/tmp/tools/worklist.jsonl`（主线程生成）筛出本组声明：257 个声明含压缩名，共 356 个顶层压缩名绑定。
2. 写了几个临时脚本（都在 `artifacts/tmp/tools/shell/`）：
   - `list.mjs`：列出模块内声明的当前名与来源。
   - `raw.mjs`：快速打印声明原始代码（比 q.mjs 快）。
   - `heads.mjs`、`view.sh`：浏览阅读树模块（去 import）。
   - `users.mjs` → `users.json`：本组每个声明的使用者（id + 重组路径），用于判断切分错误。
   - `build.mjs`：把 `draft.txt`（`声明id 绑定名 新名 置信度 说明`）和 `docs.txt`（`id\t说明`）转成 `semantic.jsonl` / `docs.jsonl`；绑定按压缩名或 naming/final 当前名解析成 `@偏移`，同名多个用 `名#kN`。
3. 逐模块读阅读树和原始代码，写命名与说明；对照旧版源码取名字，结论以 316 代码为准。
4. 每批跑 `node artifacts/tmp/tools/validate.mjs …`，最终 OK。

### 数据

| 项 | 数量 |
|---|---|
| semantic 命名 | 522 条（顶层名 431、参数/局部 91） |
| 顶层压缩名覆盖 | 356 个中命名 355 个（剩 `chunk-e6aww6q8.js#$Tn` 内的 `hRr`，含义未确认） |
| docs | 331 条；被组外使用的 182 个声明全部有说明 |
| modules | 32 / 32 |
| 覆盖旧版错配名 | 约 60 条（note 里写了"旧版名配错/不符"） |

### 发现

- 316 的 Bash 安全分析已从旧版 `bashSecurity.ts` 的正则校验器换成 tree-sitter AST（`utils/bash/ast.ts`）。旧版那些校验器的消息字符串在 316 全部 chunk 中都搜不到；匹配器因为字符串相似把若干无关函数配成了 `validateNewlines`、`validateShellMetacharacters_*`、`validateGitCommit`、`validateEmpty` 等旧名，已全部按实际行为重命名。
- PowerShell 的 `isReadOnly` 同步接口调用 `isReadOnlyCommand(command)` 不传解析结果，`kUt` 首行 `if (!parsed) return false`，因此 PowerShell 永远不被视为只读/并发安全（旧版注释已承认此限制）。
- `isPowerShellToolEnabled`（`utils/shell/shellToolUtils.ts`，不在本组）决定 PowerShell 是否注册：非 Windows 需 `CLAUDE_CODE_USE_POWERSHELL_TOOL=true`；Windows 上无 Git Bash 时默认启用，否则看 `tengu_cobalt_ridge`（默认 false）。工具本身 `isEnabled()` 恒 true。
- Bash 提示词里"用 Glob/Grep 代替 find/grep"一项受 `FC()`（内嵌搜索）控制：`FC()` 为真时只提 Read/Edit/Write，并提示 find 从 `.` 开始。这与"默认无 Glob/Grep"相关，供 core 组核对 `FC` 的含义。
- 默认超时 120000 ms、最大 600000 ms（`BASH_DEFAULT_TIMEOUT_MS`/`BASH_MAX_TIMEOUT_MS`）；长 sleep 拦截阈值 25 秒（`kWr`）；进度阈值 2000 ms；输出上限默认 30000（`BASH_MAX_OUTPUT_LENGTH`，上限 150000）。

### 坑

- `q.mjs callers` 对大 chunk 非常慢（一次超过 10 分钟被转后台），改用自写的 `users.mjs` 一次性建反向索引（约 2 秒）。
- 同一声明里同名局部变量很多（压缩名在不同块中复用），`build.mjs` 用 `#kN` 指定第几个；名字按出现顺序。
- 阅读树中 `getAutoAllowedCommands`、`buildImageToolResult` 等名字在 naming/final 里不是 declId 的首名，草稿里要用压缩名或 build.mjs 的别名表解析。

### 给 lead 的建议（切分/匹配修正）

切分错误（不属于 shell 组）：

- `chunk-qchp9vrd.js#An` → 应归插件评测（与 `_unattributed/chunk-qchp9vrd/part-004/006/014` 一起，`plugin eval` 目录信任检查缓存），不是 BashTool。证据：用 `${模式}:${目录}` 缓存 `Ju()` 的属主检查，调用者 `Dg` 打印 "plugin eval: could not resolve …"。
- `chunk-98n6ge4d.js#xe`、`#S`(DesignSyncPreconditionError)、`#getAutoAllowedCommands`、`#st` → 应归 DesignSync（`/design-sync` 相关），不是 `tools/BashTool/modeValidation.ts`。证据：字符串 "DesignSync needs design-system authorization"、`/design-login`。
- `chunk-vwj6ccer.js#ge` 及其 16 个 `ge.xxx = {filter, replacement}` 语句、`#Na` → 第三方 turndown（`commonmark-rules`、`cleanAttribute`），应归 vendor，不是 `sedEditParser.ts`。证据：`headingStyle === "setext"`、`codeBlockStyle`、`linkReferenceStyle`。
- `chunk-8wvtd8sr.js#wy/#_y/#by/#vy/#Fl/#tf` → Artifact 工具的 pin/unpin 动作，不是 `bashSecurity.ts`。证据："This is not an artifact url Claude can pin"、`ownPublishedSlugs`。
- `chunk-p5akk6be.js#j`、`#UG`、`#fu` → 形近字符折叠工具（安全/字符串规范化），不是 bashSecurity；`#UG` 被 `utils/stringUtils.ts` 等 8 个模块使用，建议归 `utils/` 下。
- `chunk-qz53w8v8.js` 的 8 个声明（`freeze_2/3`、`T`、`k`、`A`、`buildImageToolResult*`、`APPLICATION_OCTET_STREAM`）→ 附件读取（图片/文档字节），不是 `tools/BashTool/utils.ts`。
- `chunk-012rhzq5.js#buildImageToolResult_2`、`#le` → MCP/消息图片提取与计数；`chunk-km6vv5ys.js#yDt`、`#createContentSummary` → pasted_content 解析；`chunk-18hwfzwa.js#parseDataUri` → 图片缩放。都不属于 BashTool/utils。
- `chunk-hwmsct5x.js#vm`、`#zu` → Anthropic SDK 会话 tool runner（第三方 `@anthropic-ai/sdk` 的 `session-tool-runner`），不是 `commandSemantics.ts`。
- `chunk-0h4e7gnq.js#fi`（旧名 getDestructiveCommandWarning）→ 子代理自报文本，被 `tools/AgentTool/runAgent.ts` 使用，应归 AgentTool 相关模块。
- `chunk-5ghnps9r.js#Ixr/#HOs/#NOs` → 权限 UI 的常驻规则提供逻辑，不是 PowerShellTool。
- `chunk-qmzcskz6.js#Kwn`（旧名 extractBaseCommand）→ Windows 路径规范化，应归 `utils/windowsPaths` 或 permissions/filesystem，不是 `PowerShellTool/commandSemantics.ts`。
- `chunk-fq0cr76a.js#Pv/#xle/#zM/#XM`、`#For`、`#VFi`、`#bH`(isPathAllowed) → `utils/permissions/filesystem.ts`/`pathValidation.ts`。
- `chunk-4pc1m5n9.js#Y2n`、`chunk-tyg7f3ek.js#Hy`、`chunk-e6aww6q8.js#Ege`(source 命令拼接，被 `utils/shell/bashProvider.ts` 使用) → 不属于 PowerShell pathValidation。
- `chunk-e6aww6q8.js#lYt/#lIe`、`chunk-18hwfzwa.js#zce`、`chunk-bfnfj4kx.js#cos`、`chunk-yr49hy5m.js#l` → 都被 fingerprint-shared 配成 `resolveCwdReentry*`，实际是各处的"是否相对路径"小判断，应按使用者归属。
- `chunk-e6aww6q8.js#s4t/#hLo/#Wye/#WLo/#GLo/#GYt/#zLo/#f4t/#uqe/#qLo/#cqe/#fqe/#zye/#YLo/#XLo/#QLo` → Bash 侧"参数能否执行代码"检测（被 `components/PromptInput/inputModes.ts`、沙箱排除检查使用），不是 PowerShell readOnlyValidation；建议归 `utils/bash/` 或 `tools/BashTool/`。
- `chunk-e6aww6q8.js#$Tn` → PowerShell/Windows 退出码语义（findstr、robocopy），应归 `tools/PowerShellTool/commandSemantics.ts`（旧版同名文件就是这个内容）。
- `chunk-sycgf9xs.js#Nt/#K8e/#wt/#Hys/#mde/#GIT_GLOBAL_FLAGS_WITH_VALUES/#Ae/#Rt` → git 安全调用（强制 `-c core.hooksPath=…` 等），被多处使用，应归 `utils/git` 相关模块。
- `chunk-dcmhvw5a.js#Jr`(旧名 GIT_MERGE_RE) → 设置合并；`chunk-gfa3ceg6.js#et`(旧名 GIT_REBASE_RE) → git 配置键白名单；`chunk-m2yw48pg.js#b`(旧名 GIT_PUSH_RE) → 只推 origin 判断；都不是 gitOperationTracking 的正则常量。
- `chunk-s06523pk.js` / `chunk-hkh7sq9y.js` / `chunk-8ndmcarc.js` 中的 `renderToolUse*Message_N` 是多个工具共享形状的渲染函数，被 fingerprint-shared 都归到了 Bash/PowerShell UI；需按导出方确认。

旧版名配错（已在 semantic 中覆盖，lead 可据此回查匹配器）：

- `chunk-e6aww6q8.js#DVn` = applySedEdit → 实为 `recordShellFileReadsInReadState`（旧版 `_simulatedSedEdit` 已删除）。
- `chunk-e6aww6q8.js#SDo` = BASH_SEMANTIC_NEUTRAL_COMMANDS → 实为读封锁豁免命令集合（真正的中性命令集合是 `#w5` 里的 `w4n`）。
- `chunk-e6aww6q8.js#mM` = suggestionForExactCommand → `isSafeEnvAssignment(name, value)`。
- `chunk-e6aww6q8.js#xye` = commandHasAnyCd → `hasRiskyBareAssignment`。
- `chunk-e6aww6q8.js#EQ` = bashToolCheckExactMatchPermission_2 与 `chunk-v0yfsee9.js#nn` = bashToolCheckExactMatchPermission 互换：前者是 Bash 版，后者是 PowerShell 版。
- `chunk-e6aww6q8.js#RDo/#ODo/#qVt` = checkSemanticsDeny_2/_3/_4 → 分别是沙箱自动允许的规则检查、too-complex 拒绝路径、ask 结果的规则复核。
- `chunk-63f0f3kd.js#Sr` = isNormalizedCdCommand → `getCdTargetFromArgv`（参数是 argv）。
- `chunk-e6aww6q8.js#EH/#J7/#aQ/#Pv/#Av/#Nye/#jze/#VVt/#82kqcve8#ud` → 见 semantic note。
- `chunk-fnhsh6ng.js#H` = startSpeculativeClassifierCheck、`chunk-m79qv8gp.js#ce` = awaitClassifierAutoApproval → 只是权限模式规整与 classifier 标记检查。

### 未完成

- `_unattributed/chunk-e6aww6q8/part-18x` 里有大量 Bash 权限核心函数（`hQ`、`XVt`、`Iye`、`yYt`、`_4n`、`Bjr`、`Ajt`、`PYt`），未归属所以没有命名；建议 lead 把 part-184/186/189 归入 `tools/BashTool/bashPermissions.ts` 后再补名。
- `utils/bash/ast.ts` 的语义检查（决定大部分 Bash 权限行为）不在本组，手册只引用。

## 附录 B：文件组过程记录


范围：tools 领域中 `tools/(FileReadTool|FileEditTool|FileWriteTool|GlobTool|GrepTool|NotebookEditTool|LSPTool)/*` 与 `utils/` 下除 tasks/todo/toolPool/toolSearch 外的 20 个模块，共 47 个模块、460 个顶层声明（其中 227 个被其他模块使用）。

### 做了什么

1. 从 `artifacts/tmp/tools/worklist.jsonl` 过滤本组（`worklist.jsonl`），用 `dump-bindings.mjs` 一次导出全部绑定到 `bindings/*.tsv`（避免每次 q.mjs 2 秒）。
2. 逐模块读 `build/readable/src/...`，对照旧版 `references/claude-code-analysis/src/...` 取名，结论以 316 代码为准。
3. 命名草稿写在 `sem.tsv`，`build.mjs` 生成 `semantic.jsonl`；文档草稿 `docs.tsv` → `build-docs.mjs` → `docs.jsonl`；`modules.json` 手写。
4. 追 Glob/Grep 默认缺席原因：`tools.ts · getAllBaseTools` → `Xoe` → `FC`/`jd` → `permissionSetup` 的 `searchToolsOptIn` → `ShellSnapshot · createFindGrepShellIntegration`。
5. `node artifacts/tmp/tools/validate.mjs artifacts/tmp/tools/file/semantic.jsonl artifacts/tmp/tools/file/docs.jsonl artifacts/tmp/tools/file/modules.json` → OK。

辅助脚本（均在本目录）：`dump-bindings.mjs`、`heads.mjs`（打印仍为压缩名的声明头部）、`showdecl.mjs`、`def.mjs`（按 import 追定义）、`doclist.mjs`、`build.mjs`、`build-docs.mjs`。`def.sh` 用 grep -r 全树搜索太慢（超时 10 分钟），已弃用。

### 数据

| 项 | 数 |
|---|---|
| semantic 命名 | 352 条（顶层 272，参数/局部 80） |
| 其中：原为压缩名的顶层名 | 258 个中命名 240 个；剩余 18 个都是误归的第三方/其他领域声明，故意不命名 |
| 其中：覆盖旧版名/自动名 | 32 条（note 写了原因） |
| docs | 294 条；被其他模块使用的 227 个声明全部覆盖 |
| modules | 47 条，覆盖本组全部模块 |

置信度：明确对应旧版同名或由字符串/name 字段直接确定的 0.8–0.95；按行为命名的 0.6–0.75；误归声明的描述性名 0.5–0.6。

### 主要发现

- **Glob/Grep 默认缺席**：`chunk-e6aww6q8.js#FC`（旧版 `hasEmbeddedSearchTools`）在 316 里是 `isEnvTruthy("true")`（构建期 define 把 `EMBEDDED_SEARCH_TOOLS` 替换为常量）、`!Uws()`（用户未点名搜索工具）、入口不是 `local-agent`；`chunk-e6aww6q8.js#Xoe` 在 `FC() && jd()` 时返回 {Glob, Grep 及其 V2 别名}，`getAllBaseTools` 把它们滤掉。`--tools`/`--allowedTools` 点名 Glob 或 Grep 会通过 `permissionSetup.js:539 Bws(...)` 设置 `searchToolsOptIn`，从而恢复。Bash 里的 find/grep 由 ShellSnapshot 生成的 shell 函数转到 claude 二进制内嵌的 bfs/ugrep。
- **LSP** 总是注册（`Dqe()` = `isEnvTruthy("true")`，旧版是 `ENABLE_LSP_TOOL`），`isEnabled = hasEverConnected()`，`shouldDefer: true`。NotebookEdit 也是 `shouldDefer: true`。
- Read 整文件 token 超限改为自动分页，新增 `allow_large`、PDF 页预算、远程传输预算、去重 "Wasted call" 文案。
- Edit 新增 `\uXXXX` 转义匹配、暂存审阅（staged）、Perforce 只读拒绝、按模型放宽"先读"（`jkn` 列出的旧模型才严格要求）。
- Write 新增子代理禁写 `REPORT|SUMMARY|FINDINGS|ANALYSIS*.md`、只读开头时拒绝覆盖。
- 真正的 FileStateCache 类 `chunk-82kqcve8.js#$a` 在 `_unattributed`；`utils/fileStateCache.ts` 被配进来的 `FileStateCache`（`chunk-e6aww6q8.js#Axo`）其实是保留技能命名空间检测。

### 遇到的问题

- 阅读树里同名函数大量带 `_2/_3` 后缀且旧版名误配严重（见下），读代码时必须看 `//@` 出处行的匹配分数。
- bash heredoc 里中文引号与反引号混用导致 shell 解析失败，长文本改用 Write 工具写文件。
- 有 3 个 docs id 我起初按"推测的压缩名"写错（`#Vmt`、`#Ehn`、`#Vd`），校验后改为真实 id（`chunk-q7gky7a4.js#o`、`chunk-9br8f9tm.js#I`、`chunk-e6aww6q8.js#R2o`）。阅读树里显示的名字不是压缩名，写 docs 前要用 `analysis/segments/decl-path.jsonl` 查 id。

### 给 lead 的建议

#### A. 应移入 tools 领域（目前在 `_unattributed`，但属本组核心逻辑）
- `chunk-e6aww6q8.js#FC`、`#Xoe`、`#Klo`、`#Glo`（part-034）→ `utils/embeddedTools.ts`；FC 应叫 `hasEmbeddedSearchTools`，Xoe 应叫 `getEmbeddedReplacedSearchToolNames`（证据：旧版 `utils/embeddedTools.ts` 注释与 `tools.ts:201`，316 Xoe 返回 {GLOB_TOOL_NAME, GREP_TOOL_NAME}）。
- `chunk-e6aww6q8.js#bVo`、`#yVo`（part-231/232）→ `tools/GrepTool/GrepTool.ts`，bVo 是 Grep 的 ripgrep 执行体（`--hidden`、`--max-columns 500`、`-U --multiline-dotall`、`-l`/`-c -H`/`--json -n`），应叫 `runGrep`。
- `chunk-82kqcve8.js#$a`（part-009）→ `utils/fileStateCache.ts`，应叫 `FileStateCache`（证据：`holdsOnlyStartOf`、`markStartOnly`、`everHeldPaths`、`readBaseline`；`cloneFileStateCache` 用 `nv()` 构造它）；同段 `#mx`、`#Gie`、`#y1`、`#_At`、`#Ia`、`#tv`、`#__`、`#Bir`、`#p9r`、`#nv`、`#Om`(25MB)、`#Dm`(4096) 也应随之归入。
- `chunk-e6aww6q8.js#jKo`（part-221，含 `fileHistoryTrackEdit`、`sV`）→ `tools/FileWriteTool/FileWriteTool.ts`，是 Write 的 call 实现，应叫 `writeFileToolCall`。
- `chunk-e6aww6q8.js#k2n`、`#b2n`（part-578）→ `tools/NotebookEditTool/prompt.ts`（NotebookEdit 的 description 与 prompt 文本）。
- `chunk-e6aww6q8.js#SW`、`#_wt`、`#att`、`#Dne`、`#bCe`（part-427）→ `utils/notebook.ts`（notebook 大小上限 100MB、结构校验、`cell-N` 解析、错误文案）。
- `chunk-e6aww6q8.js#h2n`（1 GiB，part-577）→ `tools/FileEditTool/FileEditTool.ts`，应叫 `MAX_EDIT_FILE_SIZE`（旧版同名同值）。
- `chunk-g54kbxqw.js#CFe`、`#$Yt`（part-015）→ `utils/pdfUtils.ts`（`isPDFExtension` 实为 CFe）。
- `chunk-fq0cr76a.js#jle`（part-027）→ `utils/ripgrep.ts`（ripGrepRaw 的主体之一，与 `#i4` 相邻）。
- `chunk-847rdpmn.js#Wut`、`#jut`（part-003）→ `tools/FileEditTool/`（Perforce 只读检测与文案）。

#### B. 误归到本组、应移出
- `chunk-xfjxv2be.js#mt`、`#o`、`#dt`、`#D` → vendor lodash（`_nativeCreate`、`_hashClear`），现在在 `tools/FileWriteTool/UI.tsx`。
- `chunk-9vvvg0d3.js#fe`、`#L`（`Re(Ol())` 等）→ vendor @opentelemetry/sdk-trace-base（Span 类），现在在 `utils/filePersistence/filePersistence.ts`。
- `chunk-9cjx5pnm.js#R`、`#X0s`、`#ks`、`#Ds`、`#er`、`#Cs`、`#Bs`、`#js`、`#Ks`、`#qs` → 插件/文件打包扫描（排除原因 link/secret/ignored…），不是 GrepTool；`chunk-9cjx5pnm.js#ua`、`#da`、`#ca`、`#Dt`、`#Ut`、`#ga` → 插件市场上传，不是 LSPTool/formatters。
- `chunk-bzr73sfg.js#rf`（终端网格单元扩展）→ ink 选择相关，不是 LSPTool。
- `chunk-e6aww6q8.js#Pfn`、`#iZt`（按 serverName 合并位置）→ MCP 资源相关（被 ReadMcpResourceTool、attachments 使用），不是 LSPTool。
- `chunk-ah34pb7m.js#rr`（taskDelivery/origin 消息组件）→ 某消息渲染组件，不是 NotebookEdit UI。
- `chunk-ah34pb7m.js#ZT`（"LSP operation failed"）→ `tools/LSPTool/UI.tsx`，现在在 FileReadTool/UI。
- `chunk-1dp9p908.js#LEn`、`chunk-c0cahhqh.js#N7n`（任务输出路径绑定）→ `utils/task/diskOutput.ts` 一类，不是 FileReadTool/UI。
- `chunk-aepeg2w5.js#c$`（`modelSupportsAutoMode(e,"claude-opus-4-6")`，被快速模式 `AO` 使用）→ `utils/model/*` 或 fastMode，不是 FileReadTool；旧版名 MITIGATION_EXEMPT_MODELS 错。
- `chunk-mxpjbr4y.js#z`（云会话规则提示）→ 远程/云会话，不是 FileWriteTool/UI。
- `chunk-e6aww6q8.js#Axo`、`#Fz`、`#WUt`、`#jUt`、`#Kun`、`#Cxo`、`#Lz`、`#vxo`（保留技能命名空间 anthropic-skills 检测）→ `skills/` 或 `utils/plugins/`，不是 fileStateCache。
- `chunk-dcmhvw5a.js#Up`（设置覆盖合并）→ `utils/settings/*`。
- `chunk-18hwfzwa.js#eie`（ULTRACODE 渐变字样）→ UI 组件，不是 `utils/treeify.ts`；旧版 treeify 在 316 中未找到对应。
- `chunk-530hfzwb.js#Xt`、`#ae`、`#ge`、`#ue`（光标按逻辑行移动/显示列）→ `utils/Cursor.ts` 一类，不是 truncate。
- `chunk-jhrww53q.js#w`（读 /sys/hypervisor/uuid）→ 环境探测，不是 `utils/file.ts`。
- `chunk-xh6k20xb.js#y`（外部打开器结果分类）→ 不是 imageResizer。
- `chunk-2rkp9ne9.js#ot`、`#$e`（`<current_skill_md>`）→ 技能同步，不是 FileEditTool/utils。
- `chunk-kxyd0g16.js#To`（去 snippet 字段）→ 不是 FileEditTool/utils。
- `chunk-e6aww6q8.js#Hce`（诊断去重键）→ LSP 诊断/attachments。
- `chunk-bwbq4xvm.js#ro`、`#YTi`、`chunk-astf3mhy.js#Ss`（kind 枚举判断）→ 非 LSP formatters。
- `chunk-wn385gmf.js#Ne` 在 readFileInRange 里调用 `encodePowerShellCommand` 判 UTF-16（该名是误配的编码检测函数）——建议给 `encodePowerShellCommand`（实际是 `detectEncodingFromBuffer`）改名，属 PowerShell/utils 负责人。

#### C. 旧版名明显配错（本组已用 semantic 覆盖，供核对匹配器）
`chunk-e6aww6q8.js#WCe`（fileHistoryMakeSnapshot→实为状态归约）与 `#g0e`（实为 makeSnapshot）互换；`chunk-9br8f9tm.js#R2o/#x/#K/#x2o/#YJs` 一串 getPatchForEdits/areFileEditsEquivalent/areFileEditsInputsEquivalent 错位；`chunk-mvvq2nx1.js#ge` 配成 IMAGE_EXTENSIONS（实为格式映射）；`chunk-q84dhc5d.js#qDr` 配成 validateContentTokens（真正的是 `chunk-e6aww6q8.js#CKr`）；`chunk-4121qate.js#WZr` 配成 hunkSchema（真正的 hunkSchema 是 `chunk-e6aww6q8.js#ISe` 声明里的 fJ）；`chunk-e6aww6q8.js#Kvn` 配成 getAlternateScreenshotPath（真正的是 `#OZe`）；`chunk-e6aww6q8.js#SVo` 配成 outputSchema；`chunk-e6aww6q8.js#Axo` 配成 FileStateCache。

### 未完成

- 本组命名未覆盖 `_unattributed` 里的本组核心代码（A 节所列），等 lead 重新归属后可补命名与文档。
- `y3o`（图片读取字节上限）具体值未追到。

## 附录 C：代理组过程记录


### 做了什么

- 范围：tools 领域中 47 个模块（`tools/AgentTool/**`、`SendMessageTool`、`Task{Create,Get,List,Output,Stop,Update}Tool`、`TeamCreateTool`、`TodoWriteTool`、`tools/shared/spawnMultiAgent.ts`、`utils/tasks.ts`、`utils/todo/types.ts`），331 个顶层声明。
- 方法：读 `build/readable/src/...` 与 `original/` 原文；自写辅助脚本（均在本目录）：
  - `mb.mjs <模块> [minRefs] [--top|--all]`：列模块内仍未命名的绑定与 `@偏移`。
  - `users.mjs <id>...`：快速 callers（q.mjs callers 在全量上要 10 分钟以上，曾超时）。
  - `showmany.mjs <id>...`：批量打印原始声明。
  - `params.mjs`：按 `params-*.txt`（函数键 + 参数名列表）生成参数命名（只取函数直接参数，跳过解构）。
  - `build.mjs`：`names-*.txt` → `semantic.jsonl`，`docs-*.txt` → `docs.jsonl`。
  - `tooldefs.mjs`/`tooldefs2.mjs`：扫描全量声明中的工具定义（props 含 inputSchema/isConcurrencySafe 等）。
- 校验：`node artifacts/tmp/tools/validate.mjs semantic.jsonl docs.jsonl modules.json` → OK（docs 有 10 条 WARN：声明被切到 `_unattributed/chunk-0tkmvwy0/*` 或 `utils/toolResultStorage.ts`，实为 AgentTool 代码，见建议）。

### 数据

| 交付 | 条数 |
|---|---|
| semantic.jsonl | 660（顶层约 380，参数 252，局部约 30） |
| docs.jsonl | 298 |
| modules.json | 47 / 47 |

- 本组 worklist 中原为压缩名的顶层名全部命名完（剩余 0）。
- docs 覆盖：本组被外部使用的声明（ext>0）176/176，全部声明 260/331；另为切到 `_unattributed/chunk-0tkmvwy0` 的 AgentTool 代码（工具对象 `won`、输入 schema、启动决策等）写了 docs。

### 发现

1. **Agent 工具对象 `won` 被切到 `_unattributed/chunk-0tkmvwy0/part-005.js`**，旧版名 `AgentTool` 配到了 call 实现 `Xo`；已用 semantic 把 `won` 命名为 `AgentTool`、`Xo` 命名为 `callAgentTool`。
2. 316 不再有 TeamCreate/TeamDelete/TaskOutput 工具（退役名单 `chunk-e6aww6q8.js#_0e`）；`TeamCreateTool.ts` 里只剩会话隐式团队初始化函数（改名 `initializeSessionTeam`）；`TaskOutputTool.tsx` 只剩状态判定小函数。
3. **TodoWrite/Task* 新增模型门 `t6()`**：主模型不在旧模型集合（claude-3*…opus-4-7、sonnet-4-6、haiku-4-5）时，TodoWrite 与 Task* 都默认不可用，除非后台会话、`--tools` 显式包含它们或 `CLAUDE_CODE_ENABLE_TODO_TOOLS=1`。这影响"316 实测直接/延迟工具数"的口径（core 组请注意）。
4. `verificationAgent.ts` 位置在 316 是 web-fetch 代理；另有新内建代理 `claude`（在 `chunk-fgpf3f12.js#F7e`，被切到 `services/MagicDocs/magicDocs.ts`）。
5. 任务列表存储加了 v5 键值存储分支与 high-water mark（id 不复用）。
6. 本组模块混入大量共享指纹误配的通用函数（agentDisplay、agentMemorySnapshot、utils/tasks 末尾、spawnMultiAgent 末尾），已按实际行为命名并在 note 注明"误配/误归"。

### 坑

- `q.mjs callers` 对全量 8 万声明逐个 usesOf，单次调用超过 10 分钟；改用自写 `users.mjs`（建一次索引，<1 秒）。
- Git Bash heredoc 里中文引号与 `'` 混用导致一次 `unexpected EOF`，docs 文件改用 Write 工具写入。
- 规范键必须是声明标识符偏移：`function X(` 要取 `X` 的位置（+9），`var a=1,b=2` 里 b 的键在 b 处；校验脚本能抓出。
- 同名常量在不同 chunk（如 `SUMMARY_MAX_CHARS` 在 `chunk-rvwp1taf.js`，不在 astf3mhy）需按出处行的 chunk 写 file。

### 给 lead 的建议

切分/归属：
- `chunk-0tkmvwy0.js#won`、`#Jn`、`#Yn`、`#Zn`、`#Kn`、`#ht`、`#Qo`、`#Xn`、`#Un`（part-005）以及 part-001…004 全部声明 → `tools/AgentTool/AgentTool.tsx`。证据：chunk-0tkmvwy0 只包含 AgentTool 代码（`on({name:mt,searchHint:"delegate work to a subagent"…})`、Agent 输入 schema、启动决策）；`won` 是 Agent 工具对象，被 `tools.ts · getAllBaseTools` 第一个注册。
- `chunk-0tkmvwy0.js#jn`、`#Lo`（现归 `utils/toolResultStorage.ts`）→ `tools/AgentTool/AgentTool.tsx`：Agent.checkPermissions 的 web-fetch 免审分支。
- `chunk-0tkmvwy0.js#Ln`（现归 loadAgentsDir）可保留或并入 AgentTool.tsx。
- `chunk-dz36xfxg.js#Nn`、`#Be` → `tools/BashTool/` 背景化相关模块（Bash 的 run_in_background 规则判定，与 Agent 无关）。
- `chunk-e6aww6q8.js#t1r`（resolveTeamName）→ 寻址/补全相关模块（`hooks/useTypeahead` / `utils/attachments` 的依赖），非 AgentTool。
- `chunk-aepeg2w5.js#UC/#Vi/#HC/#BC` → org-config gate 模块（与 loadAgentsDir 无关）。
- `chunk-8t8n4kdh.js#Dn/#lr/#nr` → `services/mcp/client.ts`（MCP 错误分类）。
- `chunk-s06523pk.js#D`（旧名 LEGACY_AGENT_TOOL_NAME）→ keybindings 相关模块。
- `chunk-aepeg2w5.js#MK/#Nr`、`#BIe`、`chunk-cne5hsvz.js#z/#le`、`chunk-g2rygg7v.js#R`、`chunk-kswt4qha.js#ccr`、`chunk-xf84t5b0.js#ILr` → 各自调用方模块（utils/model、commands/model、spawnMultiAgent 等），不属 agentDisplay。
- `chunk-e6aww6q8.js#Iut`、`chunk-f9asxqh1.js#V5o/#Le`、`chunk-0knprqgt.js#me`（→ commands/copy）、`chunk-18hwfzwa.js#Rgo`、`chunk-85kmkm1x.js#FOr`（→ utils/plugins/validatePlugin）、`chunk-am3vy82s.js#h`（→ commands/export）：都不是 agentMemorySnapshot。
- `utils/tasks.ts` 末尾：`chunk-s61vbvea.js#pB/#OKt/#Ql`、`chunk-wyqg6m3h.js#No/#Mo`、`chunk-6xf89m6d.js#s`（git ref/分支名校验 → git 工具模块）、`chunk-ha3km179.js#md/#gd`（清单文本解析）、`chunk-0n43rj0b.js#y`（→ hooks/useTasksV2.ts）、`chunk-ad1qk1kv.js#sGi`、`chunk-aepeg2w5.js#NT`（→ utils/auth 或 lockfile）、`chunk-fw249fsw.js#z`（→ utils/swarm/teamHelpers.ts）、`chunk-p7xejzdb.js#p`：均非任务存储。
- `tools/shared/spawnMultiAgent.ts` 末尾 `chunk-4121qate.js#Aa/#va/#Cx`：插件钩子分阶段代码，非队友派生。
- `chunk-fgpf3f12.js#F7e`（CLAUDE_AGENT 内建代理，现归 `services/MagicDocs/magicDocs.ts`）→ `tools/AgentTool/built-in/` 下新文件（如 `claudeAgent.ts`）。
- `chunk-ncsga3m8.js#e/#t/#i`（coordinator worker 代理）现归 forkSubagent.ts → 应为 `coordinator/workerAgent.ts`（旧版路径）。
- `chunk-ah34pb7m.js` 中 TaskStop 的 `DM`、`chunk-cpqpnzp4.js#zr`（MCP 面板）不属 SendMessage UI。

旧版名明显错配（已用 semantic 覆盖）：
- `chunk-0h4e7gnq.js#Vxo` extractPartialResult → isSchemaTooLargeToSkipReview；`chunk-nw7jbebs.js#GVt` blockTask ↔ `#KVt` deleteTask 互换了；`#Ve` updateTaskUnsafe → mergeTaskFields；`#be` getTask → parseTaskJson（真正 getTask 是 `#$6`）；`chunk-e6aww6q8.js#d5s` outputSchema → getTaskCreateValidationSteer；`chunk-dz36xfxg.js#Be` inputSchema → hasBackgroundRunRule；`chunk-e6aww6q8.js#Y2n` getAutoBackgroundMs → getWorkerCheckinScheduleMs；`chunk-ncsga3m8.js#t` FORK_AGENT → COORDINATOR_WORKER_AGENT；`chunk-7jbxc8kr.js#v` FORK_SUBAGENT_TYPE → slugifyForkName；`chunk-rqnncghm.js#$7e` isCustomSubagentType → COORDINATOR_WORKER_AGENT_TYPE；`chunk-6cc2zqkz.js#P` TeamCreateTool → initializeSessionTeam；`chunk-18hwfzwa.js#yCt` handleBroadcast → getSenderKind；`chunk-e6aww6q8.js#USt` isCustomAgent → mergeRuntimePluginAgents。

### 未完成

- runAgent 内部大量局部变量（React 外的长函数，约 300 个绑定）只命名了关键的十余个。
- SendMessage deliver 内部各路由分支的局部变量未逐一命名。
- UI.tsx 中 React Compiler 产生的缓存变量未处理。

## 附录 D：其他工具组过程记录


范围：tools 领域中 `tools/(AskUserQuestionTool|BriefTool|ConfigTool|EnterPlanModeTool|ExitPlanModeTool|EnterWorktreeTool|ExitWorktreeTool|ListMcpResourcesTool|MCPTool|McpAuthTool|ReadMcpResourceTool|RemoteTriggerTool|ScheduleCronTool|SkillTool|WebFetchTool|WebSearchTool)/` 共 53 个重组模块、377 个顶层声明。

### 做了什么

1. 用 `artifacts/tmp/tools/worklist.jsonl`（主线程生成）定位本组仍为压缩名的顶层绑定（398 个）与被其他模块使用的声明（171 个）。
2. 逐模块读 `build/readable/src/<路径>.js`，必要时用自写小工具：
   - `artifacts/tmp/tools/misc/dump.mjs <模块>`：列模块的顶层声明、当前名、外部使用者。
   - `artifacts/tmp/tools/misc/locals.mjs chunk.js:Top [minRefs]`：列一个顶层语句内的局部绑定（压缩名#序号）。
   - `artifacts/tmp/tools/misc/showmin.mjs chunk.js Name`：看其他 chunk 的原始片段（核实 isEnabled 依赖的门控函数）。
3. 命名与说明先写成人读的 spec（`artifacts/tmp/tools/misc/spec/*.txt`，每行 `N|chunk:Top[/local#k]|名字|置信度|note` 或 `D|chunk:Top|说明`），由 `artifacts/tmp/tools/misc/build.mjs` 解析为偏移键并生成 `semantic.jsonl`、`docs.jsonl`（同一绑定重复或找不到时报错）。
4. `node artifacts/tmp/tools/validate.mjs …` 校验通过（semantic 582、docs 228、modules 53，OK）。
5. 覆盖统计：`artifacts/tmp/tools/misc/coverage.mjs`。

### 数据

| 项 | 数量 |
|---|---|
| semantic 命名 | 582 条：顶层 444（含约 58 个错配旧版名/自动名的覆盖），局部与参数 138 |
| docs | 228 条，覆盖本组全部 171 个被外部使用的声明（171/171）及关键内部函数 |
| modules | 53/53 |
| 顶层压缩名命名覆盖 | 386/398；剩下 12 个是 `EnterPlanModeTool/UI.tsx` 里表格列摘要的箭头函数小工具（ro/nS/un/dn/cn/yn/hn/Tn/gn）与 `WebSearchTool/UI.tsx` 的 `Ol/jh/Fl`（含义不确定，未命名） |

### 发现

- 316 没有 Config 工具：旧版 `tools.ts` 里只有 `USER_TYPE === 'ant'` 才注册 ConfigTool；316 的 `tools/ConfigTool/{ConfigTool,UI,prompt}.ts` 三个模块匹配到的都是别处代码（git config 读取、diff 面板偏好、native host manifest、模型选项）。
- 316 没有旧版的 MCP 工具折叠白名单（`classifyMcpToolForCollapse(serverName, toolName)` 及 SEARCH_TOOLS/READ_TOOLS 集合）；`tools/MCPTool/classifyForCollapse.ts` 实际收进来的是"敏感环境变量识别/JVM 选项脱敏"（约 40 个声明）、PowerShell 搜索/读取命令判定、memory 工具正则。
- AskUserQuestion 在 316 不再 `shouldDefer`；isEnabled 改为 `ebe()`。
- 多个工具的 isEnabled 从编译期 `feature('KAIROS')`/`feature('AGENT_TRIGGERS')` 改为运行时检查（channels、GrowthBook）。
- WebFetch 新增 offset 续读、artifact 读取权限链、CCR 代理抓取、去重与失败记忆；WebSearch 新增预算、快搜 mode、citations、CCR 代理；RemoteTrigger 新增 3 个 action（webhook、运行记录、运行日志）。
- ExitPlanMode 新增 diskless 模式（plan 作参数、32768 字节上限）；EnterPlanMode 在 diskless 会话需要用户亲自确认。

### 遇到的问题

- 大量"旧版名"是 fingerprint-shared 或低分匹配造成的错配（同名函数被分散到多个 chunk 的不同实现上，如 `isPreapprovedUrl_2/_3/_4`、`validateURL_2/_3/_4`、`isPermittedRedirect_2/_3`、`buildSuggestions_2/_3`）。我只在确认实际行为后用 semantic 覆盖，note 写了"旧版名 X 配错"。
- `q.mjs callers/where` 在大 chunk 上非常慢（一次超过 10 分钟被我中止），改为直接查 `analysis/segments/modules.json` 与 `analysis/scan/modules.json`。
- spec 中局部绑定按"压缩名#第 k 次出现"定位，WebFetch 的 `Rw` 内同名局部很多，已用 `--show` 逐条核对上下文。

### 给 lead 的建议（切分/匹配修正）

格式：`声明 id → 应归属路径/应叫什么，证据`

- `chunk-q8cqcff6.js#*`（At、Cus、xn、Un、po…、dve、Uo…、Gyr，共约 40 个声明，含 `mIn`/`gIn`/`rOt`）→ 应归 `utils/` 下敏感环境变量识别模块（旧版对应 `tools/BashTool/bashPermissions.ts` 中的安全环境变量判断一带，或 316 新文件 `utils/envSecrets` 类），不是 `tools/MCPTool/classifyForCollapse.ts`；证据：内容全是 TOKEN/SECRET/PASSWORD 名称正则、JAVA_TOOL_OPTIONS/MAVEN_OPTS 脱敏，调用方是 `services/mcp/config.ts` 与 chunk-qchp9vrd。
- `chunk-v0yfsee9.js#Zs`（当前名 classifyMcpToolForCollapse）→ `tools/PowerShellTool/PowerShellTool.tsx · isSearchOrReadPowerShellCommand`；证据：使用 Gs/Ks/Xs（select-string/get-childitem/write-output 集合），调用方在 PowerShellTool。
- `chunk-s61vbvea.js#QT`（regExp_4、iu、ZT、tv、nv）→ memory 工具相关模块（memdir/记忆文档），不是 MCP 折叠；证据：`${Nlt}(read|write|str_replace|append)`、`memory_document_` 文本。
- `chunk-qcqdqsn4.js#R/M/F/re/ae` → git 配置读取工具模块（如 `utils/git/gitConfig`），不是 ConfigTool；证据：`git config --includes --type=path --get`。
- `chunk-wyqg6m3h.js#qr`（当前名 outputSchema）→ diff 面板插件相关模块；证据：`CC_PLUGIN_DIFF`、"carried the built-in panel's saved preference"。
- `chunk-0wdgqhcf.js#zn`、`chunk-aepeg2w5.js#Bw`、`chunk-hwmsct5x.js#Ct` → 分别属于 Chrome native host、fastMode/设置、`utils/model/modelOptions.ts`，不是 ConfigTool。
- `chunk-3s7ydtfd.js#ln…gS`（13 个声明）→ 表格/图表数据描述模块，不是 `tools/EnterPlanModeTool/UI.tsx`；证据："read as numbers if named as y"、cellsByKind。
- `chunk-7sw8gya5.js#yt` → `components/ManagedSettingsSecurityDialog/*`（唯一调用方）。
- `chunk-j2t139r9.js#Te/nIn` → 第三方 zod（`custom()` 实现），应归 vendor；`chunk-aepeg2w5.js#XP/JP/D_` → 第三方 DOM 实现（innerHTML 访问器），应归 vendor。
- `chunk-aepeg2w5.js#pv`（当前名 ASK_USER_QUESTION_TOOL_PROMPT）→ 模型限制提示，属于模型/设置模块；证据：`Model "X" is restricted by your organization's settings`。
- `chunk-ft22tw4r.js#bs/rdi/Jqt/odi` → `tools/AskUserQuestionTool/prompt.ts`（当前在 ExitPlanModeTool/prompt.ts）。
- `chunk-wd9kxbpn.js#it` → worktree 会话元数据持久化模块（sessionStorage 一带），不是 EnterWorktree UI。
- `chunk-1ny7cxrt.js#Wt`、`chunk-zethn0a3.js#h` → 分别属于本地 HTTP 服务错误响应、远程会话参数处理，不是 RemoteTrigger UI。
- `chunk-e6aww6q8.js#Hv`（当前名 tryUnwrapTextPayload）→ 设置/extras 合并模块（operatorDeclaredMemo），不是 MCPTool UI；13 个外部使用者都在设置/插件一侧。
- `chunk-dsy6gyxv.js#re/ie/ae`、`chunk-aepeg2w5.js#CF/pO`、`chunk-1wpnxx5r.js#MOe`、`chunk-2a8yx6fc.js#bn`、`chunk-4j20twbf.js#s`、`chunk-f3qhjfah.js#Qe`、`chunk-fy5kn7m3.js#Ke`、`chunk-yqnmafqp.js#y` → 都不是 WebFetch 代码，是被 fingerprint-shared 拉进 `tools/WebFetchTool/utils.ts` 的同名小函数；应按各自调用方归属（MCP 配置、安装器、crates 索引脚本等），或至少别用 WebFetch 的旧版名。
- `chunk-dcmhvw5a.js#j_r/W_r`、`chunk-9tgt55am.js#GFs`（buildSuggestions 系列）→ 通用权限建议构造，应归 `utils/permissions/*` 或各自工具；不在 WebFetchTool.ts。
- `chunk-mdb2vxrz.js#A/QQr`、`chunk-wn385gmf.js#Ie/Be`、`chunk-ja1jtv44.js#Nye` → 不是 BriefTool/upload.ts；分别是 API 基址判定（remoteManagedSettings 使用）、通用 MIME 表、API 基址读取。
- `chunk-hwmsct5x.js#lf/uf`（当前名 makeToolSchema）→ 从文本解析工具名的辅助，不属于 WebSearchTool。
- `chunk-vrb44rx7.js#Ol/jh/Fl` → 含义不明的触发判定 schema，不属于 WebSearchTool/UI。
- `chunk-ncz9bgnh.js#D`（当前名 inputSchema）→ `utils/claudeInChrome/*`（唯一调用方 chromeNativeHost）。
- `chunk-b7gstm5r.js#ye` → `components/DevBar.tsx`（唯一调用方）。
- `chunk-ah34pb7m.js#OT`（ListMcpResourcesTool/UI）→ 唯一调用方是 `utils/computerUse/common.ts`，更像 computerUse 结果渲染。

### 未完成

- 上面 12 个含义不确定的顶层名未命名。
- handbook 草稿中"未解之处"一节列出的门控值（FD、Tnr、Nar、搜索预算上限等）未追到定义。

## 附录 E：补命名（剩余压缩名）过程记录


### 做了什么
- 输入：`artifacts/tmp/tools/coverage.txt` 第 15 行起的 201 个仍为压缩名的顶层绑定（164 个声明）。
- 逐个读 original 源码（`agent/showmany.mjs`），查调用方（`agent/users.mjs`）、相关符号已有名字（reference/facade），并与 2.1.88 对照（shouldUseSandbox、tools.ts）。
- 先查 `analysis/names/facade.jsonl`：这些键没有门面名，无冲突。
- 草稿 `names.txt`、`docs.txt`，由 `build.mjs`（复制自 core/build.mjs，路径换成 leftover/）生成 `semantic.jsonl`、`docs.jsonl`。
- `validate.mjs` 校验结果 OK。

### 数据
- semantic：192 条，全部是顶层绑定，没有给参数命名；置信度 0.6–0.9。
- docs：65 条，覆盖被其他模块使用的声明和关键内部函数。
- 没有命名的 9 个：
  - `chunk-kxyd0g16.js#fa` 语句里的槽位 fn、ha、hn、kn。外部构建中它们为 null 或 []。拿 2.1.88 getAllBaseTools 的位置去对，对不上唯一的旧工具，例如 hn/ha 落在 OverflowTest、CtxInspect、TerminalCapture 一带，fn 在 Workflow/Sleep 一带。置信度会低于 0.6，所以不写。
  - 同一语句里 gn、yn、ga 已按位置推断命名（WebBrowserTool、SnipTool、getV2AliasTools），置信度 0.6。
  - `chunk-3s7ydtfd.js#nS`（值为 `!0` 的布尔标志）、`chunk-9cjx5pnm.js#ua/#ga`（插件市场代码）、`chunk-4j20twbf.js#f`、`chunk-vrb44rx7.js#Ol/jh/Fl`、`chunk-fq0cr76a.js#N6r`：含义没确认。

### 给 lead 的建议（切分）
- `chunk-3s7ydtfd.js#ro/#un/#dn/#cn/#yn/#hn/#Tn/#gn/#nS` → 表格/图表列摘要模块（不属于 `tools/EnterPlanModeTool/UI.tsx`）。证据是这些文案："read as numbers if named as y"、"read as times if named as x"、"Pass one row for each item as data"。
- `chunk-2rkp9ne9.js#Be/#ie/#rt/#Ne` → ProposeSkills 工具模块（`chunk-2rkp9ne9.js#Ee` 即 ProposeSkillsTool），不属于 `tools/FileEditTool/utils.ts`。证据：文案 "propose it as a new skill under another name"，以及 refusedUpdates/keptElsewhere。
- `chunk-9cjx5pnm.js#R/#ks/#er/#Cs/#js/#Ks/#qs` → 插件打包文件扫描（排除原因 link/hard-link/secret/ignored/generated），不属于 `tools/GrepTool/GrepTool.ts`。
- `chunk-9cjx5pnm.js#ua/#ga` → 插件市场（marketplaces、create-account-marketplace），不属于 `tools/LSPTool/formatters.ts`。
- `chunk-0h4e7gnq.js#tu`（按代理命名空间查技能）、`#ou`、`#nu`、`#su` 属于 runAgent，归属正确，只补了命名。
- `chunk-82kqcve8.js#gn/#wl/#Af/#Cf/#Ko` 是通用的"路径是否在目录内/软链逃逸"工具，也被代理记忆以外的模块使用。建议拆到 `utils/permissions/filesystem` 或 `utils/path` 一类模块。
- `chunk-6xf89m6d.js#Cxo/#Jzn/#l` → git 引用名校验（`utils/git` 一类），不属于 `utils/tasks.ts`。
- `chunk-847rdpmn.js#we/#sV` 是 AsyncLocalStorage 式上下文，用途只确认到"文件写上下文"，置信度 0.6。
- `chunk-e6aww6q8.js#hRr` 在 `$Tn` 语句里，`$Tn` 整句应归 `tools/PowerShellTool/commandSemantics.ts`（shell 组已报）。
- `chunk-e6aww6q8.js#Bjr/#KDo` 的旧版名配不上。语义名是按行为取的（两遍执行、合并沙箱结论），置信度 0.6。
