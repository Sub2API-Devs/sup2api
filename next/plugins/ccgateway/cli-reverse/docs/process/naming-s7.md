# 第五阶段第二波（2a）顶层命名：name-s7（组 7）

范围：`analysis/segments/naming-round3.json` 第 7 项，共 **2,781 个顶层绑定**（2,031 个声明），分布在 400 个阅读树文件、222 个 chunk。190 个目录项：

- `tools/` 全部 66 项（AskUserQuestionTool、BashTool、BriefTool、ChromeSetupOfferTool、ClaudeDesignTool、ContinueInProjectsTool、DesignSyncTool、DesignTool、EndConversationTool、EnterWorktreeTool、ExitWorktreeTool、FetchInboxMessageTool、FileEditTool、FileReadTool、FileWriteTool、GrepTool、ListConnectorsTool、LSPTool、MCPTool、MemoryReadTool、MemoryTool、MonitorTool、NotificationsTool、ObserverReportTool、OnboardingGuideTool、PluginSearchTool、PollEventsTool、PollTool、PowerShellTool、ProjectsTool、ProposeGoalTool、ProposeSkillsTool、PublishPluginTool、PushNotificationTool、ReadMcpResourceDirTool、ReadNotificationsTool、RefreshMcpServersTool、RefreshMcpToolsTool、RemoteTriggerTool、REPLTool、ReportFindingsTool、RolePickerTool、SaveTaskFilesTool、ScheduleWakeupTool、SearchMcpRegistryTool、SelfHostedRunnerTool、SendFeedbackTool、SendFileTool、SendMessageTool、SendUserFileTool、shared、ShowOnboardingRolePickerTool、SkillTool、stubTools、SuggestConnectorsTool、SyntheticOutputTool、TaskCreateTool、TaskOutputTool、TaskUpdateTool、TodoWriteTool、ToolSearchTool、WaitForMcpServersTool、WebFetchTool、WebSearchTool、WorkflowTool）；
- `types/` 4 项、`upstreamproxy/` 5 项；
- `utils/` 从 `_new` 到 `env.js` 的 115 项（字母序前半：abort*/agent*/analysis*/attribution*/auth*/auto*/background*/bash/*、betas、browser、cachePaths、claudeInChrome、claudemd*、cliArgs*、commitAttribution、computerUse、config*、confusables、contextAttachments、cron*、crossSession*、deepLink、deepFreezePlainData、diff、disklessSession、doctor*、dxt、earlyInput、editor、effort、embeddedAssets、entrypointKinds、env 等）。

按类型：函数 1,259、`var`（常量/正则/表/单例）1,487、类 35。`chunk-e6aww6q8.js` 占 655 项（BashTool/PowerShellTool/FileRead/WebFetch/Notifier/telemetry 等切分在同一 chunk），其次 `chunk-aepeg2w5.js` 136、`chunk-63f0f3kd.js` 87、`chunk-s61vbvea.js` 85、`chunk-fym4r1th.js` 83。

## 结果

| 项 | 数量 |
|---|---|
| 顶层绑定命名 | **2,781 / 2,781**（清单全覆盖，0 遗留） |
| `naming/semantic-s7.jsonl` 条数 | 2,781（键 `file|@offset` 全不重复） |
| 说明（`naming/docs-s7.jsonl`） | 2,020 条；覆盖本组全部「≥300 字节或被导出」的 798 个声明（本表 795、其他 docs 表已有 3），缺口 0 |
| 改名引擎试跑 | 222 个 chunk 逐个 `renameModule`（只加载本表）：请求 2,781、改名 2,781、**拒绝 0、冲突 0**（`artifacts/tmp/s7/rename-check.txt`） |
| 与其他 semantic 表键重合 | 3（见「与其他命名表的重合」） |
| 门面/vendor 名冲突 | 0（写入前按 `naming/final/top.json` 的来源过滤，facade/vendor 键未覆盖） |

置信度分布：0.9 共 12、0.85 共 34、0.8 共 433、0.75 共 851、0.7 共 1,270、0.65 共 70、0.6 共 111；低档（≤0.65）181 条，主要是外部构建里的占位桩（恒 `!1`/`null`/空实现）、只有数值的阈值、按调用点推断的判定函数，以及只能从上下文猜的日志/遥测字段名。

## 命名风格

- 函数/变量 lowerCamelCase；类与 React 组件 PascalCase；模块级常量 UPPER_SNAKE_CASE 并尽量带单位（`MAX_OUTPUT_CUT_CHARS`、`OAUTH_REFRESH_LOCK_OBSERVE_MS`、`MAX_DEBUG_LOG_ROTATE_BYTES`）。
- 布尔/谓词 is/has/should/can/exceeds 开头（`isDeferredToolsRecord`、`hasComplexRedirect`、`exceedsWrappedLineLimit`、`isUnwaivableBypassImmuneCircuitBreaker`）。
- 同名一组常量成体系：`BETA_*`（超过 40 个 beta 名）、`SED_*`/`SHELL_*`/`GIT_*`（BashTool 命令语义）、`PRIVATE_USE_*` 与 `*_CHAR_CLASS`（confusables 的形近字符类）、`MAX_DEBUG_*`、`MEMORY_*`（记忆工具提示）。
- 工具定义统一 `<ToolName>Tool`（`EndConversationTool`、`PushNotificationTool`、`PollTool`、`SuggestConnectorsTool`、`SearchMcpRegistryTool` 等）；schema 统一 `<feature>InputSchema`/`<feature>OutputSchema`。
- 按宿主/会话缓存的单例用 `xxxByHost`/`xxxByRoot`，取值函数用 `getXxx`/`xxx`（与阅读树既有习惯一致）。
- 官方导出别名优先：`export{本地名 as 官方名}` 里的官方名直接采用（见「用导出别名纠正」）。

## 做法与产物（均在 `artifacts/tmp/s7/`）

1. `dump.mjs`/`dump2.mjs`/`dump3.mjs`：按阅读树路径分组，把待命名声明连同前置 JSDoc、文件头说明、同文件别的声明、`//@` 出处区间写成视图；`dump3` 输出到 `dump3/NNN.txt` 与 `files3.json`（MAXSEG 从 5000 逐步降到 200 以适配上下文）。
2. `n/01-ask-bash.txt` … `n/48-docs2.txt`（48 个决定文件）：手工命名决定，格式 `T <file>@<offset> <新名> <置信度> | <依据>` 与 `D <declId> <说明>`。
3. `build.mjs`：把决定编成两张表，逐条校验（条目存在、仍是 top 绑定、非 facade/vendor、名字合法），输出 `naming/semantic-s7.jsonl`、`naming/docs-s7.jsonl` 与 `build-report.json`（`items 2781 / named 2781 / miss 0 / errors 0`）。
4. `fixdocs.mjs`：把 docs 的 id 归一到声明 id（同一声明的第一个绑定名），去重并剔除不存在的 id（本组 946 条被归一）。
5. `validate.mjs`：逐 chunk 调 `renameModule` 试跑，`{"files":222,"entries":2781,"rejected":0,"conflicts":0,"renamed":2781}`。

### 修正与自查（本轮重点）

先按行为命名后，又做了四轮机械自查，用引擎的 `bindingsOf` 取每个 `@offset` 的真实绑定与初值，找出并修正了自己写错的条目：

- `styleflags.mjs`：比较「名字形态」与「初值形态」（UPPER 但初值是函数、非 UPPER 但初值是字面常量、`*Schema` 但初值不是 schema 等）。初版 36 条标记，修完剩 15 条，余下都是合理的（计数器、版本号字符串、zod 片段）。
- `schemacheck.mjs`：`*Schema` 名字但初值是字符串/数字的强错名检测。初版 16 条，全部修正为 0。
- `numcheck.mjs`/`numcheck2.mjs`：比对说明里写的数字与初值数字（含 1024/1000 幂与 2 的幂等换算），初版 145 条，换算后剩 30 条，逐条核对后剩的都是「10% ↔ 0.1」「401 是名字不是数值」这类合理项。
- `shiftcheck.mjs`/`flaggroups.mjs`/`flagsrc.mjs`：按同一 `var` 语句分组，比较「名字与自己初值」与「名字与前/后兄弟初值」的词重叠，找「整体挪位」的组。`chunk-18hwfzwa.js`、`chunk-2x56e6nv.js`、`chunk-dq968kwq.js`、`chunk-dz3q485w.js`、`chunk-eg496hkq.js`、`chunk-p5akk6be.js` 等组因此被发现并重命名。
- `exportalias.mjs`：从 `original/chunk-*.js` 的 `export{本地名 as 导出名}` 提取官方导出名，与本表对照（710 条有导出别名，其中 19 条有名别名）。

合计改写了 **76 个 T 行**（重命名）与 **34 条 D 行**（说明重写），见 `patch-plan*.json` 与 `patch.mjs`。
- `doccheck2.mjs`：按阅读树区间统计「≥300 字节或被导出」的声明，核对说明覆盖（798 个，未覆盖 0）。
- `spot.mjs`：固定伪随机种子抽 3 批共 58 条，逐条读声明与用法核对，抽查未发现新错误。

## 没命名的

- 顶层：**0**。清单 2,781 条全部写入，键无重复。
- 说明：清单内 ≥300 字节或被导出的 798 个声明全部有说明（795 条在本表；另 3 条已在 `naming/docs-p3.jsonl`：`chunk-psktkvhp.js#F`、`chunk-kxyd0g16.js#ds`、`chunk-24nc744j.js#a`，按指南「已有说明的不重复写」未重复）。本表 2,020 条说明把清单内多数小声明也一并覆盖了。

## 与其他命名表的重合（交给 lead 取舍）

- 键重合 3 条，均已有更高置信度的同源条目，合并时按置信度取舍即可：
  - `chunk-jhrww53q.js@64872`：本表 `PWD_ENV_DECLARATION`（0.8），`semantic-p5.jsonl` 为 `PWD`（0.9）；
  - `chunk-jhrww53q.js@65976`：本表 `STY_ENV_DECLARATION`（0.8），`semantic-p5.jsonl` 为 `STY`（0.9）；
  - `chunk-7kpfrhzn.js@6752`：本表 `PEER_FILE_TRANSFER_MAX_BYTES`（0.65），`semantic-tools.jsonl` 为 `MIB`（0.85）。
  前两条是「环境变量声明对象」与「变量名」两种粒度，名称都有意义；第三条 `MIB` 更贴合（该绑定就是 1 MiB 的常量）。
- 说明重合：`naming/docs-tools.jsonl` 里已有 `chunk-79gnqwq0.js#r`、`chunk-79gnqwq0.js#c` 等的说明；本组写说明前按全部 `naming/docs-*.jsonl` 比对，只补写缺口。

## 用导出别名纠正的条目

`original/chunk-*.js` 末尾的 `export{本地名 as 官方名}` 是官方名，优先采用；本组据此改了 19 条里的 15 条（另 4 条 `default` 保持）：

| 键 | 官方导出名 | 说明 |
|---|---|---|
| `chunk-b5fpmtr5.js@12877` | `PollTool` | PollEvents 工具定义 |
| `chunk-4rqaac63.js@5093` | `PushNotificationTool` | PushNotification 工具定义 |
| `chunk-24nc744j.js@4817` | `SuggestConnectorsTool` | SuggestConnectors 工具定义 |
| `chunk-t1kwhq0j.js@12407` | `EndConversationTool` | EndConversation 工具定义 |
| `chunk-hkh7sq9y.js@5617` | `renderToolUseQueuedMessage` | 排队中渲染 |
| `chunk-hkh7sq9y.js@6431` | `isResultTruncated` | 结果是否被截断 |
| `chunk-9hy503gy.js@10918` | `renderToolUseRejectedMessage` | 拒绝渲染（内容为「动态工作流已取消」） |
| `chunk-pn8x1715.js@11906` | `agentsTrustDecision` | Agents 视图信任决定 |
| `chunk-3ewc7v9f.js@747` | `createChromeSocketClient` | Chrome 客户端/连接池/socket 客户端 |
| `chunk-t8hkp4g3.js@916` | `ECHOED_PROTOCOL_VERSIONS` | 回显的 MCP 协议版本 |
| `chunk-psktkvhp.js@6516` | `inboxSurfaceCacheKeyBit` | 项目范围的「IP:」前缀 |
| `chunk-3yy90gv7.js@18196` | `SELF_HOSTED_RUNNER_TOOLS` | 自托管 runner 工具列表 |
| `chunk-zw5xhxkf.js@24505` | `PLUGIN_SKILL_SAFE_TOOL_NAMES` | 插件/技能安全工具名 |
| `chunk-zw5xhxkf.js@24552` | `PLUGIN_SKILL_TOOLS` | 插件/技能工具对象 |
| `chunk-2x56e6nv.js@3193`、`@3564`、`@3859` | 导入方导出为 `FILE_UPLOAD_PROXY_INPUT_SCHEMA`、`FILE_UPLOAD_PROXY_TOOL`、`BROWSER_TOOLS` | 文件上传与浏览器工具定义 |

## 发现的问题

### 放错文件的声明（`声明 id → 应归路径，证据`）

- `chunk-ah34pb7m.js#bWe`（`utils/claudeInChrome/toolRendering.js`）。文件头写明「并入已有模块：统计可见任务数（排除进程内队友）」；`countVisibleTasks` 调 `shouldHideTasksFooter`，`bWe` 统计「非 ambient、非 `in_process_teammate`」的任务数。唯一导入方是 `components/messages/SystemTextMessage.js`（`remoteBackgroundTasks`）、`components/PromptInput/PromptComposer.js`、`components/tasks/BackgroundTaskStatus.js`，与 Claude in Chrome 渲染无关 → 应归 `components/tasks/`（任务计数）或 `utils/tasks.js`。
- `chunk-jhrww53q.js#d_`（`utils/_new/isWindowsJunction.js`）。文件只导出 `isWindowsJunction`；`d_` 按 cwd 过滤掉受保护目录（`o.filter((_) => !classifyProtectedDir(_, cwd))`），`refs=0`（无人调用）→ 应归 `utils/permissions/protectedDirs.js` 一带。
- `chunk-xkyzvvf1.js#y3e/#Fh/#ple/#Yls/#pAi/#mAi`（`utils/deepFreezePlainData.js`）。主体（`mintDisplayedUpdates`、`deepFreezePlainData`）与文件名相符；但 `y3e`（`"(invalid tool name)"`）与 4 个恒等/包装函数被 `components/permissions/consentRows.js`（`isRuleableToolName`、`Ho`、`safeDisplayText`）与 `hooks/useInboxPoller.js`、`remote/forwardedPermissionDialog.js` 使用 → 这几个小声明应归权限同意行/工具名校验模块（如 `components/permissions/consentRows.js` 或 `utils/toolNames.js`）。
- `chunk-s61vbvea.js#bZs/#vqr`（`utils/attributionFileClasses.js`）。文件头写「提交归因：git 命令解析、测试命令、锁文件、生成文件」，主体相符；但 `bZs`（长度 1..2048）与 `vqr`（无控制字符）被 `utils/attribution.js` 用于校验 `Claude-Session:` 署名文本（`getSessionTrailerParts`）→ 这两个声明应归 `utils/attribution.js`（或抽 `utils/safeText.js`）。
- `chunk-e6aww6q8.js` 里 `ise`/`FNo`/`PQ` 一带（「该 Chrome 工具名是否可按输入自动放行」）不在本组清单，但其导入方分散在 `chunk-11065byw.js`、`chunk-29pqxdaf.js`、`chunk-2nznck8t.js`、`chunk-38x90rmj.js` 四个 chunk，与本组范围 `utils/claudeInChrome/*` 同源 → 建议整体归 `utils/claudeInChrome/` 一侧（当前切分散在两处）。
- `chunk-2x56e6nv.js#n/c/t/E2s/iNi/sCe`（`utils/claudeInChrome/browserToolSchemas.js` 的 `BROWSER_TOOL_INPUT_SCHEMAS` 语句）。这一整条 `var` 实际是「file_upload 的说明/大小提示/两套输入 schema/工具定义 + 全部浏览器工具定义列表」，与文件名「输入结构」不符 → 建议拆 `fileUploadTool.js`（说明、schema、工具定义）与 `browserTools.js`（工具定义列表）；并且它被 `chunk-3ewc7v9f.js` 以 `w2s as CHROME_UPLOAD_FILE_SCHEMA`、`E2s as FILE_UPLOAD_PROXY_INPUT_SCHEMA`、`iNi as FILE_UPLOAD_PROXY_TOOL`、`sCe as BROWSER_TOOLS` 导出，官方导出名印证了这一拆分。
- `chunk-kxyd0g16.js#Le`（`tools/OnboardingGuideTool/OnboardingGuideTool.js` 的 `ONBOARDING.md` 64 KiB 上限）夹在 schema 与工具定义之间；它属于「guide 文件大小上限」，与同文件的 `ONBOARDING_MD` 常量同名域，位置相当于 schema 组 → 可移入常量区（轻微错位，非跨文件）。
- `chunk-dq968kwq.js#me/$e/Ie`（`tools/SendFileTool/SendFileTool.js` 的并发上限 4 与两个并发限制器）夹在输出 schema 与拒绝文案之间，属「并发控制」而非 schema → 建议移到文件顶部的常量区。
- `chunk-eg496hkq.js#It/Pt`（`tools/ProjectsTool` 的 `36` 与 `1024`，用于 Unicode 规范化名称比对）在 `Je`（NFD/NFKD 表）之后，离「项目方法」主体较远 → 属名称比对工具，可归 `utils/unicodeNames.js`。
- `chunk-y1shfdfm.js#Kt`（`world` 日志单次读取 4 MiB）与 `world.jsonl` 文件名一起，属 world 日志读写，与同文件的 schema 组位置接近，可接受；但该 chunk 同时含 `WorkflowTool` 与 `world` 日志两套逻辑，文件切分混杂。
- `utils/_new/` 下多个文件（`isWindowsJunction.js`、`containsSubstitution.js` 等）都是「专利式单消费者新文件」，个别混入与文件名无关的声明，见上。

### 名字/注释配错

- `chunk-hkh7sq9y.js#5617`（`w`）在 `original` 里导出为 `renderToolUseQueuedMessage`，我最初按调用点理解成「PowerShell 结果渲染」；已按官方导出名改正。
- `chunk-9hy503gy.js#pe` 官方导出名是 `renderToolUseRejectedMessage`，但函数体只渲染「Dynamic workflow cancelled」，说明它被复用来渲染「被拒绝」状态；已按官方名命名，并在说明里记下内容。
- `chunk-2x56e6nv.js#270`（`s`）是截图/缩放比例的**上限 1**，不是「schema 版本号」；同语句里 `r=0.1` 是下限。已改正（`BROWSER_SCREENSHOT_SCALE_MAX`）。
- `chunk-p5akk6be.js` 里 `Wdt`（左方括号类）、`z`（右方括号类）与一长串字符类常量同属一个 `var`，但 `Wdt` 已由别的表命名为 `OPEN_BRACKET_CHARS`，我按同体系命名了剩余 7 个（`CLOSE_BRACKET_CHARS`、`EXTRA_SPACE_CHARS` 等）。
- `chunk-18hwfzwa.js` 的 effort 提示常量组（500/6/120/60/200）最初整体偏一位，把 500 当成 `bQ=6` 的名字；已全部按实际初值重命名（正文 6 行、标题 120、按钮 60、警告 200，500 是 `cNt` 的正文上限，不在本组清单里）。
- `chunk-dz3q485w.js#Ar` 一组最初把 `to=1e5` 当成「本回合未运行 /send-to-project 的错误文本」；实际 `to` 是上下文工具的结果字符上限，已改。

## 已知限制

- 本组多数文件是 2.1.316 新增（旧版 2.1.88 无对应），没有旧源码可对照，名字全部按行为、调用点与官方导出别名推断；依据写在 `note` 字段。
- 外部构建里大量 `tengu_*` GrowthBook 开关返回 `!1`/`null`/`undefined`，这些桩函数按「开关名 + 行为」命名，真实语义要到内部构建才能确认。
- `chunk-e6aww6q8.js` 一个 chunk 覆盖十多个工具的服务端逻辑（655 项），同一文件内声明多、上下文密，个别小函数的命名只能按单点行为推断。
- 有 3 个键与其他 semantic 表重合（见上），最终名以合并报告为准。
