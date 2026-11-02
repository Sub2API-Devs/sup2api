# bootstrap 领域过程记录（dom-bootstrap）

> 领域：`bootstrap`（`analysis/segments/domains.json` 中 57 个模块）+ `original/cli.js` 入口快速路径。
> 手册：`docs/handbook/bootstrap.md`。临时脚本与中间结果：`artifacts/tmp/bootstrap/`。

## 1. 做了什么

1. **建立门面原名表**。316 构建里有 514 个只做 `export{局部名 as 原名}` 的“门面 chunk”，一共给出 9371 个“局部名 → 源码导出名”。这些原名是确凿证据，有两个用途：
   - 直接作为命名，置信度最高（0.95）；
   - 校验模块归属：门面 chunk 对应一个源文件，它导出的声明却被切到别处，就说明切分错了（见第 4 节）。
2. **state.ts 访问器按规则命名**。chunk-ndmse9kj 中约 427 个单行函数都形如 `function x(){return t().<子存储>.<方法>()}`。规则如下：
   - `replaceX` → `setX`（无参数时 → `clearX`）；
   - 名词方法 → `getX`；
   - `subscribe…` → `subscribeToX`；
   - 其他动词保留，并加路径后缀；
   - 已有旧版名时保留旧版名，除非读写方向反了。

   同时按子存储类（`Se`、`ye`、`j`、`z`、`Z`……）整理出会话/进程两层状态结构。
3. **人工命名**。先读主链路代码，再逐模块命名。主链路是 cli.js `qe` → main `Gu` → run `fi` → buildCliProgram `Lks` → init `GEo` → prepareSession `KSo` → setup `Nt` → runHeadless `e8e` / runInteractiveSession `_i`。逐模块命名覆盖：
   - print/StructuredIO/RemoteIO/传输层、ShutdownCoordinator；
   - 原生安装器/autoUpdater/cleanup/doctor、upstreamproxy、processUserInput；
   - cli.js 自身的函数与快速路径用到的导入。
4. **解构局部变量规则命名**。`{prop: x}` 形式的局部变量，若没有任何名字，就命名为 `prop`，共 252 条。
5. **纠正误配**：
   - **NFC 指纹误配**：state.ts 里约 111 条外来声明被 reference 匹配成 setCwdState 等（共同指纹是 `normalize("NFC")`），已按行为改名，置信度标为弱名。
   - **其余错误旧版名**：
     - `hn` 是 cliError，不是 cliOk；
     - `e6aww6q8#er` 是 gracefulShutdown，不是 shutdown1PEventLogging；
     - cli.js `fe` 是 hasOnlyDebugFlags，不是 isDebugToStdErr；
     - `jMe` 与 `bf` 的 setProjectRoot/getProjectRootOrNull 对调了；
     - `7fw14qgv#QLi`/`qji` 是 setupSteps/showSetupScreens；
     - `hjesqqfw#kvr` 是 createMCPServer；
     - `cjydagjy#Lks` 是 buildCliProgram，旧版名 run 实际对应 `shkzs7rp#fi`。
6. **声明说明**：
   - 人工写 384 条，主链路、导出函数和 ≥500 字节的关键函数优先；
   - state 访问器按规则生成 427 条；
   - state 中其余 ≤200 字节的函数按规则生成 63 条。
7. **其余交付**：写模块说明 57 条和手册。

## 2. 结果

| 交付物 | 数量 |
|---|---|
| `naming/semantic-bootstrap.jsonl` | 1831 条：顶层 1558 + 局部 273（含解构 252） |
| `naming/docs-bootstrap.jsonl` | 874 条：人工 384 + 访问器规则 427 + 短函数规则 63 |
| `naming/modules-bootstrap.json` | 57 个模块，全覆盖 |
| `docs/handbook/bootstrap.md` | 13 节 |

- **顶层命名覆盖**（本领域模块的 1450 个顶层绑定）：
  - semantic 1212，reference 223（核对过、保留旧版名），auto 8；
  - 仍无名字的 7 个，都是多声明符 var：`aepeg2w5#GY/Xg/$Y`、`z4g2ta8k#Xn/Qn/co/_o`。
- **置信度**：全部在 0.6–0.95 之间。其中门面原名 968 条，记 0.95。估计低于 0.6 的 272 条统一记 0.6，并在 note 前标“弱名（估计 x）”，主要是外来声明和含义不完全确定的小函数。
- **说明覆盖**（本领域 1396 个声明）：
  - 全部声明 847/1396；
  - 导出声明 768/802，剩下 34 个都是误归 state.ts 的外来声明；
  - 函数/类 834/1291；
  - ≥500 字节的声明 123/194。
- **改名引擎试跑**：用 `tools/naming/resolve.mjs analysis <临时目录>` 试跑，1831 条中 1827 条原样采用，4 条因作用域冲突加了后缀，没有丢失。临时目录已删除。
- **门面原名与人工名冲突**：53 处，以门面原名为准，清单在 `artifacts/tmp/bootstrap/manual-overridden-by-facade.txt`。

## 3. 怎样重跑

在项目根目录执行：

```
node artifacts/tmp/bootstrap/facade-names.mjs    # → facade-names.json（门面原名表）
node artifacts/tmp/bootstrap/facade-check.mjs    # → facade-check-bootstrap.json（门面与模块归属核对）
node artifacts/tmp/bootstrap/gen-names.mjs       # → naming/semantic-bootstrap.jsonl
node artifacts/tmp/bootstrap/gen-docs.mjs        # → naming/docs-bootstrap.jsonl
node artifacts/tmp/bootstrap/unnamed.mjs         # 命名覆盖统计
node artifacts/tmp/bootstrap/doc-coverage.mjs    # 说明覆盖统计
```

各类输入：

- **人工命名表**：`manual-names*.tsv`，格式为 `file<TAB>min<TAB>name<TAB>conf<TAB>note`。`min` 写 `声明名/局部名` 表示局部变量。
- **人工说明表**：`docs-manual*.tsv`，格式为 `id<TAB>doc`。
- **生成器优先级**：门面原名 > 人工 > 访问器规则 > 解构规则。

## 4. 遇到的问题

- **reference 匹配在 state.ts 上错误很多**。`normalize("NFC")` 这类短字符串被当成共同指纹，导致 44 个以上的声明都被配成 setCwdState。看到同一旧版名对应多个声明时，应先怀疑匹配错误。
- **q.mjs 的 `show` 取不到非首个声明符的绑定**（例如 `e6aww6q8#er`），只能直接按偏移切片读代码。
- **工具使用的坑**：heredoc 里带引号的内容会写坏文件，用 sed 往 JS 字符串里插换行会出语法错误。之后统一用 Write/Edit 和独立脚本。
- **GrowthBook 名单**：正则抓取会把事件名一起抓进来，所以手册里的开关表是逐个看上下文后人工整理的。

## 5. 给 lead 的建议

格式：`声明 id → 应归属路径/应叫什么，证据`。证据“门面”指对应门面 chunk 导出了该声明，清单在 `artifacts/tmp/bootstrap/facade-check-bootstrap.json`。

### 5.1 应并入本领域模块的声明（门面证明）

- `chunk-ndmse9kj.js` 中 80 个声明（`_unattributed/chunk-ndmse9kj/part-006.js`，例如 `#wuo` clearAutoModeUnavailableResponses、`#zEr` clearBetaHeaderLatches、`#buo` clearContext1mRefused）→ `bootstrap/state.ts`。证据：门面 chunk-nj7t53r7 共导出 642 个，其中 562 个已在模块内。
- `chunk-ndmse9kj.js#xo/#gco/#ze/#tt/#SC`（part-005，会话对象构造、SessionScoped 等）→ `bootstrap/state.ts`。证据：会被 state 访问器直接调用，与 `t()`、`y` 同构。
- `chunk-437rqrst.js` 中 9 个声明（`#fp` printCliError、`#D1` cliOk、`#W5t` cliExit、`#Rf` writeStdoutAndDrain、`#L1` cliWarn、`#rG` flushAnalyticsBeforeExit、`#Ho` exitAfterAnalyticsFlush、`#as`、`#KA`）→ `cli/exit.ts`。证据：门面 chunk-kahpc3cs 导出 10 个，其中只有 1 个在模块内。
- `chunk-e6aww6q8.js` 中 26 个声明（`_unattributed/chunk-e6aww6q8/part-048..051`，包括 ShutdownCoordinator `X9s`、`hi` gracefulShutdownSync、`dzo` setupGracefulShutdown 等）→ `utils/gracefulShutdown.ts`。证据：门面 chunk-r3wdn2dp 共导出 28 个。
- `chunk-wphjdnre.js` 中 11 个声明（part-002）→ `utils/earlyInput.ts`。证据：门面 chunk-h4wwf2p6。
- `chunk-awy329vy.js#yGi` initAgentProxy，以及同处 part-007/008 的另外 6 个 → `upstreamproxy/upstreamproxy.ts`。证据：门面 chunk-j9e5zgt8。
- `chunk-c5gdqf78.js` 中 13 个声明（`#a_s` backgroundSessionVerbIndex、`#gw` eagerHasCliFlag、`#rke` eagerParseCliFlagAll、`#Zut` detectNonInteractiveLaunch 等）→ `utils/cliArgs.ts`。证据：门面 chunk-xcbfjzhp 导出 15 个，模块内只有 1 个。
- `chunk-z4g2ta8k.js` 中 9 个声明（`#gGi` startEarlyRemoteWork、`#qPr` sessionStreamWriters 等，part-008/009）→ `cli/remoteIO.ts`。证据：门面 chunk-yvf1bnw9。
- `chunk-ktpw8eqa.js` 中 31 个声明（part-002/003，`#Pg` parsePermissionMode、`#O_` normalizePermissionModeAlias、`#ede` decisionReasonCode 等）→ 门面 chunk-k6t7e4cb 被匹配为 `cli/structuredIO.ts`，但这批其实是权限决定原因/熔断判断的工具函数，应归 permissions 领域的 `types/permissions.ts` 一类文件。建议重新确认门面 chunk-k6t7e4cb 对应的源文件，不要并入 structuredIO。
- `chunk-s61vbvea.js` 的 Chrome 相关声明（`#Ynt` setupClaudeInChrome、`#ox` isClaudeInChromeAllowed 等）→ 门面 chunk-2jvt0tn4 的 17 个导出中 11 个在 `utils/claudeInChrome/setup.ts`。门面 chunk-2jvt0tn4 对应的是 claudeInChrome/setup.ts，不是 print.ts。`chunk-s61vbvea.js#rqo` 被归到 print.ts，应移到 `utils/claudeInChrome/setup.ts`。
- `chunk-vbtpanx5.js#kon` isOtlpLogsConfigured、`#wjn` isOtlpLogsConfiguredByPolicy → `entrypoints/init.ts`。证据：门面 chunk-4a9xkd77。
- `chunk-7fw14qgv.js#XLi` adoptPersistedWorkspaceTrust、`#JLi` completeOnboarding、`#SRs` projectMcpApprovalStep → `interactiveHelpers.tsx`。证据：门面 chunk-pz8vz2wa。
- `chunk-j3nx1xyn.js#iEr` STREAM_GONE_CODES、`#lLn` iterateStreamUntilClose → `utils/process.ts`。另外 `#u7t` isStdinUnusableError 现在归 `bridge/bridgeMain.ts`，也应移到 `utils/process.ts`。证据：门面 chunk-a3ex6w41。
- `chunk-th8w37yz.js#wPo` clearAccountScopedConfig、`#_an` clearAuthRelatedCaches → `cli/handlers/auth.ts`（门面 chunk-3pe4yaee）。`#XLe` performLogout 现在在 commands/logout，门面显示它是从 auth handler 一起导出的，归属待定。
- `chunk-d4eg9at2.js` 的 plugin 处理器（`#q1i` pluginInitHandler、`#Y1i` pluginListHandler、`#V1i` pluginTagHandler、`#efo` pluginInstallHandler、`#tji` pluginPruneHandler、`#iji` pluginConfigureHandler、`#qHn` linkMarketplaceInUse；`#nji` pluginEnableHandler 现在在 services/plugins/pluginCliCommands.ts）→ `cli/handlers/plugins.ts`。证据：门面 chunk-hvrmg1vp。
- `chunk-2f5p3gsj.js#xWi` createSubcommandRoot、`#p0t` confirmYesNo、`#IWi` doctorHandler → `cli/handlers/util.tsx`。证据：门面 chunk-tt9rxcw9。
- `chunk-23fm9f0d.js#YOo/#LWs/#kVn`（保留期清理是否安全/豁免/跳过原因）→ `utils/cleanup.ts`。证据：门面 chunk-xdz4h5jb。
- `chunk-hjesqqfw.js#XHn` CALLER_GONE_SIGNAL → `entrypoints/mcp.ts`。`#aji` startMCPServer 现在归 services/mcp/config.ts，应移到 `entrypoints/mcp.ts`。证据：门面 chunk-axz11cz2。
- `chunk-qg4qg94n.js#gQr` applySettingSourcesFlagFromArgv、`#vcr` compactJsonForTypedTransport → `main.tsx`。证据：门面 chunk-dcwp8rdv。
- `chunk-3g0djq3w.js#iyt` isSlashCommandBlockedByEndedByModel：现在在 components/PromptInput/inputModes.ts，应移到 `utils/processUserInput/processSlashCommand.tsx`。证据：门面 chunk-jghdfw5c。

### 5.2 主链路上被留在 `_unattributed` 的声明（调用关系证明）

- `chunk-shkzs7rp.js#Gu`（main）、`#fi`（run）、`#Ln`、`#_i`（runInteractiveSession）、`#Si`（part-005）→ `main.tsx`。证据：cli.js 的 `import("./chunk-shkzs7rp.js")` 调用 main，`fi` 调用 `Lks`（Lks 已归 main.tsx）。
- `chunk-cjydagjy.js#ro`（runPreparedHeadless，part-009）、`#ao`（runAllMigrations，part-010）→ `main.tsx`。`#Rt`、`#Dt`、`#Vt`、`#xt` 是 316 新增迁移，分别归 `migrations/migrateModelAliases.ts`、`migrateFable5ToFableAlias.ts`、`migrateUserIntentToSettings.ts`、`migrateNotificationDismissals.ts`（文件名为本领域所拟）。`#$t` runMigrations 与 `#Ne` CURRENT_MIGRATION_VERSION 归 `main.tsx`，与 2.1.88 相同。
- `chunk-3wek6r2k.js#KSo` prepareSession → `main.tsx`。证据：由根 action 调用，再调用 setup 并返回 prepared-headless/interactive。
- `chunk-19arrzdw.js#aLt`/`#MLi` → `replLauncher.tsx`。证据：runInteractiveSession 调用它，它渲染 AppRoot + REPL，与 2.1.88 的 launchRepl 同构。
- cli.js 的 `#me`、`#qe`、`#he`、`#Je`（在 `_unattributed/cli`）→ `entrypoints/cli.tsx`；`cli.js#fe`（现在归 utils/debug.ts）→ `entrypoints/cli.tsx`，应叫 hasOnlyDebugFlags，旧版名 isDebugToStdErr 配错。

### 5.3 误归本领域模块的外来声明

- `bootstrap/state.ts` 里约 111 条外来声明（清单 `artifacts/tmp/bootstrap/state-foreign.txt`，改名见 `manual-names-4-foreign.tsv`）：
  - **NFC 规范化/路径大小写折叠一族**（`b00ssqeq#d/xte`、`s61vbvea#vw/xw/Jf`、`azz22fvc#ELt`、`a477qqne#Ztt` 等）→ 各自 chunk 的路径/文本工具模块。证据：`fingerprint-shared` 匹配，共同指纹只有 `normalize("NFC")`。
  - **e6aww6q8 的市场名校验一族**（`#Kgs`、`#tGn`、`#Aut`、`#Kj`、`#MO`、`#Jre` 等约 20 个）→ plugins 领域的市场管理模块（marketplaceManager 一类）。
  - **c6bzd0wx 显示文本清洗一族**（`#d`、`#h3r`、`#zai`、`#Hot`、`#F`）→ 文本/显示工具模块。
  - **其他**：`qmsrnapp#c$n/xTr/Sgo/wgo/pRs`（宿主能力判断）、`tr0s0d0k#Ne/SOs`（auto/plan 模式判断）、`0089hrfm#P/S`（计划模式上下文）、`5rtc26v0#r6n/o6n`（附件拒绝文案）→ 分别归 permissions、bridge 或附件模块。
  - `e6aww6q8#EEt`/`#Pfe`（生成/恢复 cost-state 记录）与 state 的 costLedger 紧密相关，可以留在 state.ts，也可以归 `cost-tracker.ts`（2.1.88 的 saveCurrentSessionCosts/restoreCostStateForSession 在那里）。建议归 `cost-tracker.ts`。
  - `xdkvf45x` 的 8 个 OTel 计数器访问器（`Voi`、`qYo`……）归 state.ts 没问题。
- `chunk-21ppfwx8.js#Eii`（下载并校验插件归档）→ plugins 领域，不属于 `utils/nativeInstaller/download.ts`。证据：URL 策略检查和插件 User-Agent。
- `chunk-x4gcvpxy.js#dOs`：现在归 `utils/nativeInstaller/packageManagers.ts`，旧版名 detectHomebrew 不符，代码是 macOS 后台进程路径/TCC 处理，建议交 agents 或 bridge 领域确认。
- `chunk-aepeg2w5.js#exn`、`#ras`（Chrome 托管 MCP 判定、MCP 配置 url 校验）→ 与 print.ts 关系弱，应归 `services/mcp/config.ts` 或 claudeInChrome 模块。
- `chunk-wj577vf9.js#zyo`（表格/列表 token 提取）、`#tn` → 现在归 doctorContextWarnings，更像 markdown 工具，归属可疑。
- `chunk-82kqcve8.js#hJo`（组织级记忆存储发现）→ 现在归本领域，应归 memdir 一类模块。

### 5.4 匹配方法本身的建议

- `fingerprint-shared` 的指纹只是一个很短的通用字符串调用（如 `normalize("NFC")`、`toLowerCase()`）时，同一个旧版名会被配给几十个声明。建议加一条约束：同一旧版名只给一个声明，或者对这种短指纹降权。
- 门面 chunk 是可靠的归属证据，建议在切分阶段直接使用：门面导出的全部声明强制归到同一模块。按 5.1 的统计，这一步可以一次修正约 250 条错误归属。
