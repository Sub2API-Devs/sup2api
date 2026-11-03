# 第五阶段第四轮（参数/局部）命名：name-l11c（组 11，续做）

范围：`analysis/segments/naming-round4c.json` 第 11 项（下标 11），91 个目录、1,420 个声明，从 `src/tools/AskUserQuestionTool` 起，到 `src/upstreamproxy/upstreamproxy.js` 止：

- `src/tools/*`（AskUserQuestion、Bash、Brief、ChromeSetupOffer、ClaudeDesign、Config、Connectors、ContinueInProjects、Design、EndConversation、EnterPlanMode/EnterWorktree、ExitPlanMode/ExitWorktree、FetchInboxMessage、FileEdit/FileRead/FileWrite、Glob、Grep、Inbox、ListAgents、ListConnectors、ListMcpResources、LSP、McpAuth、MCP、MemoryRead/Memory、Monitor、NotebookEdit、Notifications、ObserverReport、OnboardingGuide、PluginSearch、PollEvents/Poll、PowerShell、Projects、ProposeGoal、ProposeSkills、ReadMcpResource、ReadNotifications、RefreshMcpTools/RefreshMcpServers、RemoteTrigger、RolePicker、SandboxSettings、SendFile、SendFeedback、SendMessage、Skill、stubTools、TaskOutput/GetTask/TaskStop、ToolSearch、WebFetch、WebSearch、WorkflowTool 及 `workflow/world/*`）
- `src/upstreamproxy/*`（relay、systemTrust、toolTrust、upstreamproxy）

## 前任写到哪里

接手时 `naming/semantic-l11.jsonl` 为 **4,261 行 / 22 个 chunk，`annotate check` 0 problems（13 suffixed）**，最后一笔写在 Nov 3 21:38，没有过程文档也没有 WORKLOG。

用 `artifacts/tmp/lead/final5`（`top.json` + `locals.jsonl`）配合 `bindingsOf` 按声明区间重算，组内还剩 **1,407 个声明、6,883 个压缩绑定** 显示为 `_K<偏移>`。也就是说前任实际写完的只到约第 906 号声明（`chunk-astf3mhy.js#Ls`）一带，且只覆盖零散的 23 个声明——它在 4,261 行里有 3,580 行落在同 chunk 的其它组（最典型的是 `chunk-e6aww6q8.js` 一个 400 万字符的 chunk 横跨多个组），只有 681 行真正落在本组声明区间内。

计划里的 `unnamed` 计数（6,895）对本组前期声明已经过时，不能拿来定起点；启动位置只能靠“final5 + 本表”重算出来的 `_K` 列表确定。

## 本次续写

| 项 | 数量 |
|---|---|
| 接手时行数 | 4,261（前任行一行未删、未重写） |
| 本次追加条目 | **6,969**（175 个批次文件 `b001`–`b175`，全部 `cat 批次 >> 目标` 追加） |
| 其中唯一 `file`+`key` | 6,882（87 行是同一绑定在先前后批次里的重复记录，最终生效的是后写的那条） |
| 最终行数 | **11,230** |
| 覆盖的 chunk | 128（本组新增 106 个） |
| 覆盖的声明 | 1,407 个（组内 1,420 个中，13 个声明整段已由 final5 命名、无需再写） |
| `annotate check` | **0 problems**，13 `suffixed by conflicts`（全部是前任既有行，本表新增行新增 `_2` 撞名 0） |
| 覆盖复核 | 用「final5 + 本表」重跑 `remain2.mjs`：组内剩余 `_K` **0 个 / 0 个声明** |

置信度分布（本次 6,969 行）：0.85 × 6,899、0.8 × 24、0.75 × 4、0.7 × 22、0.65 × 2、0.6 × 18。

撞名处理：自写 `allconf2.mjs` 把「final5 + 前任行」与「final5 + 全表」两次跑 `renameModule`，按 `key` 对比冲突集合；最终两侧都是 2,033 条、新增 0、消失 0。过程中曾经出现的 16 条新增 `_2`（`runtime_2`、`storePath_2`、`hostname_2`、`dbDir_2`、`input_2`、`toolName_2`、`commands_2`、`toolContext_2`、`baseContext_2`、`output_2`、`done_2`、`normalized_2`、`estimatedTokens_2`、`filename_2`）逐条改名消掉（`runtimeState`、`jdkStorePath`、`requestedHost`、`nssDbDir`、`rawInput`、`firstToolName`、`commandList`、`toolCtx`、`permissionContextBase`、`doc`、`completedCount`、`nfkcName`/`normalizedHost`、`textTokenEstimate`、`outputFileName`）。

## 做法

- 自写 `artifacts/tmp/l11c/` 下的只读工具：`filt.mjs`（把 `annotate show` 的输出切成只含 `_K` 的片段，`CTX`/`FULL` 控上下文）、`remain.mjs`/`remain2.mjs`（用 final5 与本表合并重算组内剩余 `_K`，输出按声明的计数与键表）、`conf.mjs`（单 chunk 冲突明细）、`myconf.mjs`（只保留本表命中的 suffixed 行）、`allconf2.mjs`（与基线比冲突集合）、`uses.mjs`（给一批偏移打印各自的名字与使用片段）。node 一律 `--max-old-space-size=3000`。
- 每批 1–25 个声明（多数 8–12 个），先 `Write` 写 `bNNN.jsonl`（不用 heredoc：模板字符串里的反引号会让 bash 报 unmatched `` ` ``，这一坑在本次重演了近 20 次），`check` 通过后再 `cat` 追加。
- 顺序：先按 `remain2.mjs` 的下标分布从 1 推到 1,419，大函数（`runGrep`、`PowerShellTool`、`WebFetchTool`、`ToolSearchTool` 134 绑定、`WorldStore`、`WorkflowScriptRun`、`createWorldBindings` 130 绑定、升级/信任链 `upstreamproxy.js`）一次一个声明读完再命名；中途每 5–10 批重算一次剩余。
- 依赖较深的常量（`MAX_*`、`*_TEXT`、`*_PATH`）一律不改，只命名 `scope !== 'top'` 的局部与参数。

## 跳过（0 个真正跳过）

组内剩余压缩名为 0。只有 22 个绑定给的是占位名而不是语义名，因为它们本身没有语义：

| 声明 | 绑定 | 给的名字与理由 |
|---|---|---|
| `chunk-t1kwhq0j.js#h`（countToolCallsSince） | `@12004` | `unusedFlag`：`let y=!1` 之后只在 `!h(...)||y` 里读，永远为假 |
| `chunk-t1kwhq0j.js#_` | `@13280`、`@13541` | `unusedFlag` / `unusedValue`：`let y=!1` 与 `let c;`（`try{await …}catch{}` 后再不读） |
| `chunk-b5fpmtr5.js#q`（PollEventsTool） | `@13736`、`@13981`、`@13986` | `unused` / `unusedFlagOne` / `unusedFlagTwo`：`W=void 0`、`x=!1`、`s=!1` 均为死变量 |
| `chunk-b5fpmtr5.js#B`（waitForPollEvents） | `@14489`、`@14695` | `unusedPlacement` / `alwaysFalse`：第 3 参数（`d`）从未使用；`function x(){return!1}` 恒假桩，用来关掉一条分支 |
| `chunk-22r83hv0.js#Zar/#ufi/#DQo` | `@29498`、`@29523`、`@29550` | `unusedArg` / `unusedValue`：`function Zar(e){return!1}`、`function ufi(e){return!1}`、`function DQo(e,n){return e}` 三个桩 |
| `chunk-ah34pb7m.js#EM`、`#OM`、`#FM` | `@29087`、`@30152`、`@30154`、`@30630`、`@30632` | `input` / `unused` / `unusedOther`：`function EM(m){return null}` 只读不到参数；两个 UI 组件的第 2、3 参数（`d`、`c`）从始至终未使用 |
| `chunk-a5k9jscj.js#vQe` | `@21606`、`@21615` | `unused` / `unusedOther`：`let S=void 0, te=void 0` 两个死变量 |
| `chunk-v0yfsee9.js#oi`、`chunk-astf3mhy.js#Ls` | `@95555`、`@52103` | `unusedFlag`：`let r=!1`、`let e=!1`，赋值后从不读 |
| `chunk-kxyd0g16.js#pt` | `@11430` | `unusedPlaceholder`：`f=""` 空串常量 |
| `chunk-2rkp9ne9.js#Oe` | `@13302` | `placeholderDropped`（`buildReadCheckMessages` 的中间量，语义清楚） |

另外有一类“看得出是桩但名字有意义”的照实命名：`noopUnsubscribe`（`PollEventsTool` 里 `N=()=>{}`）、`noopToolUseHook` 之类的返回值、`noWrap`/`alwaysFalseFeed` 等。

## 发现的问题

1. **前任误改过的 5 行与 final5 不一致**：`chunk-ah34pb7m.js@21395`、`@22282`、`chunk-s06523pk.js@2181` 三处把 React Compiler 缓存槽写成了 `memoCache`（final5 已按 Compiler 规则改成 `$`），`chunk-e6aww6q8.js@1212087` 写成 `cdAssignment`（final5 是 `command`）；`chunk-a91k35xs.js@15375` 写了 `escape`，final5 里没有这个绑定（`_9o` 是 import 的 `escapeDoubleQuoted`，`@15375` 是函数体内的 `let t=_9o`）。我一开始把 `@15375` 改写成 `escapeQuotedText`，与 import 名撞车后删掉了自己那一行，保留前任的 `escape`。
2. **计划里 `unnamed` 不可信**：`naming-round4c.json[11].unnamed = 6895`，但接手时真正未命名的（扣掉 final5）是 6,883 个绑定、1,407 个声明；反过来，前任 4,261 行里 3,580 行根本不在本组的声明区间里。续做组必须用 final5 + 现有表重算，不能直接照着 `unnamed` 找起点。
3. **`chunk-e6aww6q8.js` 是万能桶**：约 400 万字符，容纳 BashTool/GrepTool/WebFetchTool/ToolSearchTool/SendMessageTool/teleport/transcript 等几十个阅读树文件，本表单它一个 chunk 就写了 1,295 行；每次 `show` 都要重跑整 chunk 的绑定表（单次 20–40 s，且要把 3000 MB 堆开满）。同理 `chunk-y1shfdfm.js`（WorkflowTool 全族，608 行）、`chunk-awy329vy.js`（upstreamproxy 全家，667 行）。
4. **恒假/恒空桩函数成片出现**：`PollEventsTool` 的 `function x(){return!1}`（用来关掉 `hasPendingPollWork` 的某条分支）、`chunk-22r83hv0.js` 的 `Zar`/`ufi`/`DQo` 三个一行桩、`chunk-ah34pb7m.js` 的 `EM`/`TM`/`MM`/`yM` 四个 `return null`、`chunk-22r83hv0.js#Mo` 的 `identity` 包装。这些函数参数只能给占位名。
5. **`@14489` 这类“签名留了参数但不读”的情况**：`waitForPollEvents(e, signal, d, m)` 的第 3 参数在函数体里完全没有出现（`ownWorkOnly` 等都在第 4 个参数里），说明历史重构留下的空位，不做结构改动。
6. **React Compiler 缓存槽数量极大**：`chunk-9hy503gy.js`（WorkflowTool UI）与 `chunk-ah34pb7m.js` 里 `w(23)` 缓存数组的每个 `$[n]` 都对应一个 `_K` 变量，只能按“它缓存的是什么”命名（`rowComponent`、`suffixText`、`statusIcon`、`monitorHint`、`fallbackResult`…），无法从使用点反推更具体的语义；这类行置信度统一按 0.85，但可读性天然有限。
7. **同名参数跨层遮蔽很密**：`toolContext`、`input`、`options`、`runtime`、`state`、`entry`、`row`、`chunk` 在相邻函数里反复出现，`renameModule` 会报 `same-scope` / `captures-outer-or-global` / `param-body-or-catch-clash` 三类撞名；本表新增行已做到新增 `_2` 为 0，但前任与 final5 之间那 2,033 条既有冲突仍在。
