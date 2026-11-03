# 第三阶段放置：组 6（place-g6）过程记录

范围：`analysis/segments/placement-work.json` 的 `groups[6].chunks`（224 个 chunk），其中第一个 chunk-18hwfzwa.js 约 1 MB 未归属代码（REPL 主屏重构后的控制器、对话框系统、输入框、插件 UI 等），以及来自这些 chunk 的 21 个 `_new/*` 门面模块。

## 1. 结果数字

| 项 | 数 |
|---|---|
| 范围内声明 | 6,563 个 / 2,538,058 字节（其中 `_new/*` 735 个） |
| 已放置 | **6,558 个 / 2,537,903 字节（99.99%）**；chunk-18hwfzwa.js 一个就放了 2,062 个声明 |
| 未放置 | 5 个 / 155 字节（见第 6 节） |
| 目标文件 | 519 个：新文件 369 个（5,567 个声明、2,278,096 字节），并入已有模块 150 个 |
| `_new/*` 模块改路径 | 21 个，全部给出正式路径（见第 4 节） |
| 语义名 `naming/semantic-p6.jsonl` | 1,672 条；改名引擎（tools/rename/lib/rename.mjs）逐 chunk 试跑：1,672 条全部生效，0 冲突、0 拒绝 |
| 说明 `naming/docs-p6.jsonl` | 140 条（核心类、入口、>2.5 KB 的声明为主） |
| 模块说明 `naming/modules-p6.json` | 519 条（每个目标路径一条；新文件写“2.1.316 新增”，旧版已有的写“沿用旧版路径/并入旧版已有路径”） |

产物全部由生成器重建：`node artifacts/tmp/p6/build.mjs`（`--check` 只统计不写文件，`-v` 列出未放置与缺说明的路径）。输入是 `artifacts/tmp/p6/spec/*.txt`，按文件名顺序加载、后写覆盖先写：

- `0-rules.txt`：`node artifacts/tmp/p6/rules.cjs` 自动生成的命名规则（必须在一次非 check 构建之后跑，因为它读 `naming/placement-g6.json`）：R1 Bun `__export` 命名空间的原导出名（796 条）与命名空间对象（28 个）、R2 状态选择器 `selectXxx`（115）、R3 GrowthBook 开关函数 `isXxxGateOn`（19）、R4 从“X: used before its screen bound a host”错误文本得到的类名（7）、R5 对话框定义 `xxxDialogDef`（5）、R6 对话框视图（5）、R7 通知规格 `xxxNoticeSpec`（25）、R8 React Compiler 缓存 `let X=w(N)` → `$`（200）。
- `a-18hw-place.txt`：chunk-18hwfzwa.js 的放置；`b-others-place.txt`：其余 chunk 的放置与 `_new` 改路径；`c-18hw-names.txt`、`d-others-names.txt`：人工命名与说明；`e-modules.txt`：519 条模块说明；`f-docs.txt`：补充说明。
- 规格语法：`@chunk`；`P <i>[-<j>]|* <目标>`；`R <_new/路径> <目标>`；`N <i>[/<局部名>] <名字> [置信度] [| 证据]`；`D <i> <说明>`；`M <路径> | <说明>`。序号 i 是 `digest.cjs` 输出的 chunk 内声明序号（按起始位置）。
- 构建时自动：门面名不覆盖（报错）；其他成员已交付命名表（`naming/semantic-*.jsonl`）里已有的绑定让位（12 条，含 dom-ui 已命名的 `$` 缓存、dom-query 的 fetchOverageCreditGrant 等）；同一 chunk 内顶层重名加数字后缀（51 条，主要是 React 组件里重复出现的同名状态选择器）。

浏览辅助脚本：`digest.cjs`（chunk 声明序列 + 字符串/属性摘要，输出存为 `d-18hw.txt` 等）、`show.cjs`（按序号看源码）、`ns.cjs`/`nsidx.cjs`（挖 `__export` 命名空间）、`cands.cjs`/`todo-others.txt`（待命名候选）、`needdocs.cjs`（缺说明的大声明）、`targets.cjs`/`themes.cjs`（目标路径统计）、`check.mjs`（改名引擎试跑）、`overlap.cjs`（与他人命名表的重叠）。

## 2. 方法

1. chunk-18hwfzwa.js 先按 `domain-ui.md` 的发现切出 REPL 控制器类：每个类都有“`<Class>: used before its screen bound a host`”类错误文本，直接给出原类名（TurnController、SessionController、PromptSubmitController、ComposerChrome、PromptDraft、ScrollPin、BackgroundGesture、ReplSessionScope、RemoteTransport）。然后沿 chunk 顺序按“同一源文件的顶层语句连续”切段，用遥测事件名、对话框 kind、通知 id、错误文本定文件。
2. 28 个 Bun `__export` 命名空间（`var X={}; Ar(X,{OrigName:()=>local,…})`）给出原导出名与同文件分组，是 18hw 里最强的证据，796 个名字直接来自这里。
3. 其余 223 个 chunk 多数是整 chunk 一个主题（`P *`），大 chunk（RemoteIO、MCP 客户端、agent 代理、turn hooks、插件测试、Agent SDK…）按段切分。
4. 旧版（`references/claude-code-analysis/src`）有同名/同职责文件的用旧版路径：150 个并入目标全部在旧版存在；新建的 369 个文件中有 11 个在旧版有同名文件但切分阶段未建模块（`cli/remoteIO.ts`、`components/StatusNotices.tsx`、`entrypoints/mcp.ts`、`ink/wrapAnsi.ts`、`types/ids.ts` 等），模块说明里写“沿用旧版路径”。

## 3. 坑

- `--check` 不写文件，而 `rules.cjs` 读 `naming/placement-g6.json`，改了放置后要先非 check 构建一次，再跑 rules，再构建。
- 重名：改名引擎按 **chunk 顶层作用域** 处理，同一 chunk 里放到不同目标文件的同名绑定也会冲突（第一次试跑 34 个冲突，全是 `selectIsLoading`、`selectTasks` 这类重复选择器）。去重键改成 chunk 后 0 冲突。注意 `$`（React Compiler 缓存）是函数内局部，不能参与去重。
- 在 bash 字符串里写 `$`、反引号、heredoc 里的 python 都会出问题；生成器与补丁一律用 Write 写成脚本文件。

## 4. `_new/*` 模块的正式路径

| 门面模块 | 目标路径 | 依据 |
|---|---|---|
| `_new/RemoteIO.ts` | `cli/remoteIO.ts` | 2.1.88 同名文件；云 worker 的 SDK I/O 类 |
| `_new/initAgentProxy.ts` | `upstreamproxy/agentProxy.ts` | 2.1.88 有 `upstreamproxy/`；CCR_AGENT_PROXY_* 与 `[agent-proxy]` 日志 |
| `_new/createMonitorDelivery.ts` | `tasks/MonitorTask/monitorDelivery.ts` | Monitor 任务的结果投递 |
| `_new/WorkflowDetailDialog.ts` | `components/workflows/WorkflowDetailDialog.tsx` | React 组件 |
| `_new/PolicyLimitsClient.ts` | `services/policyLimits/PolicyLimitsClient.ts` | 2.1.88 有 `services/policyLimits/` |
| `_new/runEvalMockServer.ts` | `cli/handlers/pluginEval/mockServer.ts` | claude plugin eval 的 mock 服务 |
| `_new/wrapFileReferenceTool.ts` | `services/mcp/fileReference/wrapFileReferenceTool.ts` | MCP 文件引用（desktop drive fill） |
| `_new/toCompatSessionId.ts` | `bridge/sessionIdCompat.ts` | 2.1.88 同名文件 |
| `_new/primeWindowsProfileDirs.ts` | `services/remoteTools/windowsProfileDirs.ts` | 远程工具服务的 Windows 目录探测 |
| `_new/remoteToolServingOffReason.ts` | `services/remoteTools/servingGates.ts` | 远程工具服务开关 |
| `_new/hostLaunchedGatewayRefusal.ts` | `services/remoteManagedSettings/loader.ts` | 远程托管设置加载 |
| `_new/processResumedConversation.ts` | `utils/sessionRestore.ts` | 2.1.88 同名文件 |
| `_new/anchorPathUnnormalized.ts` | `utils/path.ts` | 2.1.88 同名文件 |
| `_new/launcherHostLoginRefusal.ts` | `utils/auth/launcherHostLogin.ts` | 启动器宿主登录 |
| `_new/serializeAdoptable.ts` | `utils/background/adopt.ts` | 后台会话接管 |
| `_new/readTranscriptForLoad.ts` | `utils/sessionStoragePortable.ts` | 2.1.88 同名文件 |
| `_new/describeDeniesOnAnotherHost.ts` | `utils/sandbox/deniesOnAnotherHost.ts` | 沙箱 |
| `_new/interactiveHelpers.helpers-20sk.ts` | `interactiveHelpers.tsx` | 2.1.88 同名文件 |
| `_new/FleetViewScreen.ts` | `screens/FleetView/FleetViewScreen.tsx` | 屏幕组件 |
| `_new/ARTIFACT_TOOL_HEAD.ts` | `tools/ArtifactTool/ArtifactTool.ts` | 工具目录惯例 |
| `_new/eraseViewportInPlace.ts` | `ink/clearTerminal.ts` | 2.1.88 同名文件 |

## 5. 新建目录与文件（按主题）

| 主题 | 目录 / 文件 | 新文件 | 并入 | 声明 | 字节 |
|---|---|---|---|---|---|
| REPL 控制器与子组件 | `screens/repl/*`（TurnController、SessionController、PromptSubmitController、ComposerChrome、PromptDraft、ScrollPin、BackgroundGesture、ReplSessionScope、promptQueue、sessionPresence、MessageArea、PromptArea…） | 40 | 0 | 385 | 276 K |
| 云 worker RemoteIO | `cli/remoteIO.ts`、`cli/remoteIO/*`（turnHandoff、ingress、servedCalls、workerAuth、deviceAttestation、orphanAgentRestore…）、`cli/transports/WorkerSocket.ts` | 10 | 0 | 226 | 109 K |
| 内置插件 | `plugins/bundled/{youShouldKnow,modsGuide,agentsMd}/*` | 11 | 0 | 325 | 107 K |
| MCP | `services/mcp/{discovery,connectAuth,connectionRegistry,toolSchemaValidation,officialPluginPromptOverrides,designPlanGate,sdkManifest,fileReference/*}` | 14 | 7 | 292 | 104 K |
| 输入框 | `components/PromptInput/{PromptComposer,PromptInputFooterStatus,autocompleteStore,footerLinks,…}` | 12 | 6 | 279 | 99 K |
| 插件 UI | `components/pluginUi/*`（PaneDock、AbovePromptBand、PromptHint、ToastStackView、render/*） | 15 | 0 | 445 | 99 K |
| 第三方 | `vendor/@anthropic-ai/claude-agent-sdk/*`、`vendor/@aws-sdk/client-bedrock/…`、`vendor/react/compiler-runtime.js`、`vendor/@smithy/core/index.js` | 7 | 0 | 78 | 77 K |
| agent 代理与 CA 信任 | `upstreamproxy/{agentProxy,caBundle,systemTrust,toolTrust,proxyFetch}.ts` | 5 | 1 | 136 | 73 K |
| 后台会话接管 | `utils/background/{adopt,adoptCarriedAgents,adoptJob,envCarry,jobStateNameSync,spawnBackgroundFork}.ts` | 6 | 1 | 155 | 72 K |
| 用量额度 | `components/usageCredits/*`（购买额度、自动充值、管理员申请、Fable 额度同意） | 6 | 0 | 61 | 64 K |
| 策略限制 | `services/policyLimits/{PolicyLimitsClient,startupGate,signedCache,prefetchToggle,complianceTaints,orgConfigRequired}.ts` | 6 | 0 | 124 | 56 K |
| 调查问卷 | `components/FeedbackSurvey/*`、`services/orgSurvey/orgSurvey.ts` | 7 | 7 | 103 | 50 K |
| REPL 远程传输 | `remote/{RemoteTransport,useRemoteTransportCore,remotePermissionModeSync,forwardedPermissionDialog,TransportPermissionDispatcher}.ts` | 5 | 1 | 63 | 48 K |
| Artifact | `tools/ArtifactTool/*`、`tools/AppifactReplTool/*`、`services/artifacts/*` | 9 | 0 | 138 | 47 K |
| 工作流 | `components/workflows/*`、`tasks/LocalWorkflowTask/*`、`commands/workflows/dynamicWorkflowCommands.ts` | 6 | 0 | 76 | 42 K |
| claude plugin eval / test | `cli/handlers/pluginEval/*`、`cli/handlers/pluginTest/*` | 7 | 0 | 221 | 76 K |
| 内置 gh api | `utils/github/{ghApi,ghApiRequest}.ts` | 2 | 0 | 60 | 34 K |
| 远程工具服务 | `services/remoteTools/*` | 9 | 0 | 172 | 34 K |
| Remote Control 桥接 | `bridge/{replBridgeControl,replBridgeInbound,ownerPin,clientPresence,workspaceTrustPrompt,bridgeHostState}.ts` | 6 | 1 | 71 | 32 K |
| 启动通知规格 | `hooks/notifs/startupNotificationSpecs.ts`、`hooks/notifs/specs/*` | 10 | 0 | 88 | 31 K |
| /usage 洞察 | `services/usageInsights/{transcriptScan,recommendations}.ts` | 2 | 0 | 85 | 29 K |
| skills 同步 | `services/skillsSync/{skillsSync,syncRound}.ts` | 2 | 0 | 79 | 28 K |
| /send-to-project | `commands/send-to-project/*` | 2 | 0 | 26 | 26 K |
| 记忆 BM25 索引 | `memdir/memoryIndex.ts` | 1 | 1 | 17 | 25 K |
| 对话框系统 | `components/dialogs/{registry,DialogHost,dialogKinds,dialogStatus}` | 4 | 0 | 67 | 23 K |
| /teleport 移到云端 | `commands/teleport/teleportToCloud.tsx` | 1 | 0 | 49 | 21 K |
| Ink | `ink/{terminalModes,terminalCapabilities,wheelScroll,termio/kittyGraphics,…}` | 7 | 3 | 109 | 21 K |
| 查询循环钩子 | `query/turnHooks.ts` | 1 | 0 | 65 | 20 K |
| Bedrock 设置向导 | `components/providerSetup/bedrock/*` | 3 | 0 | 35 | 13 K |
| 预热备用进程 | `entrypoints/warmSpare/*` | 2 | 0 | 18 | 9 K |
| 其余（零散组件、命令、服务、工具函数） | — | 151 | 122 | 2,510 | 790 K |

## 6. 2.1.316 新功能（手册素材）

- **REPL 主屏重构为控制器**：`screens/REPL.tsx` 拆成一组带宿主绑定的控制器类（回合、会话、提交、输入草稿、输入外框、滚动固定、转后台手势、会话作用域、远程传输），未绑定宿主就调用会抛“used before its screen bound a host”。对话框改为声明式：`qo({kind,payload,result,default})` 定义 + 注册表映射视图 + 统一 `DialogHost`。
- **插件 UI（mods）宿主**：插件可以在终端里挂面板（PaneDock，多面板、数字热键、焦点）、输入框上方横幅、输入提示、toast；`ui.render` 有一套元素/Markdown/Kitty 图片渲染器；prompt.change / prompt.edit 钩子。查询循环里有 `turn.step`/`turn.complete` 函数钩子，可改写模型请求、拦截流事件、伪造回复。
- **插件开发工具**：`claude plugin test`（子进程运行 *.test.ts，模拟引擎事件、驱动 ui.render）与 `claude plugin eval`（mock 服务器、expect 守卫、HTML 报告）。
- **内置插件**：youShouldKnow（用小模型挑选功能提示卡）、modsGuide（Clawd 引导动画）、agentsMd（把 AGENTS.md 当项目指令加载）。
- **云 worker（CCR）**：RemoteIO 继承通用 I/O，加入表面策略、回合交接（turn_handoff，跨 worker 接手回合并恢复在途写入）、代客户端执行调用（served calls）、可信设备证明、孤儿后台代理恢复、WorkerSocket 事件流。
- **agent 代理**：云会话出站 HTTPS 经本地中继到策略代理，自动为系统、Java、NSS、Bazel、gsutil 写 CA 信任、监视 CA 变化、提供 gh 垫片，并给模型写一份诊断说明文档。
- **内置 `gh api`**：没有 GitHub CLI 的云会话里经会话 GitHub 代理转发 REST 请求。
- **/teleport 移到云端**、**/send-to-project**（把会话工作送到 Claude Project）、**/fork**、**/tui**（全屏/经典渲染器切换）、**/output-style**、**Windows 沙箱卸载**。
- **用量与计费界面**：购买额度流程（额度包、花费上限、自动充值、确认）、向管理员申请额度、Fable 模型额度同意、“本周功能”赠送额度、用量上限宽限提示、`/usage` 用量洞察（扫描转录归因到行为并给出建议）。
- **策略限制客户端**（PolicyLimitsClient）：冷启动等待、签名缓存（JWS）、预取、fail-closed 判定、访问吊销分类。
- **skills 同步**（claude.ai skills 下载到本地）、**记忆 BM25 索引**（CJK 友好分词、Porter 词干、持久化 .bm25-index.json）。
- **设置改动审阅**（settings-review：模型提议的设置改动先暂存待用户接受）、编辑 hooks / 权限规则的工具接口。
- **预热备用进程（warm spare）**：预先启动进程，被认领时注入会话凭证与设置。
- **Bedrock 设置向导**、**会话状态分类**（启发式 + 模型）、**启动阶段计时**、**模型拒答暂停与回退模型**、**提议更新模型/medium effort/自动压缩**等一批推荐对话框。
- 内置第三方：**Claude Agent SDK**（`query()`、ProcessTransport、转录镜像）随 CLI 打包。

## 7. 未放置（5 个声明 / 155 字节）

| 声明 | 字节 | 内容 | 原因 |
|---|---|---|---|
| `chunk-m5det47h.js#UTe` | 52 | 读 GrowthBook 开关 `tengu_iterative_haven` 的单行函数 | 共享 chunk 里的孤立开关，看不出所属功能 |
| `chunk-fj90tvf9.js#JE` | 44 | `.some(...)` 小工具函数 | 无字符串、多处使用 |
| `chunk-h6tjx705.js#rto`、`#pEe` | 35 | 小常量与 getter | 无证据 |
| `chunk-a2g5s7cw.js#jG`（含 the、uOt） | 24 | 数值常量 78/75/70 | 疑为阈值常量，调用方分散 |

## 8. 给 lead 的建议

1. chunk-y805ph4h.js 是打包进来的 **@anthropic-ai/claude-agent-sdk**，我放到了 `vendor/@anthropic-ai/claude-agent-sdk/`；chunk-0dmzgg46.js 是 **@aws-sdk/client-bedrock**，chunk-s89ma3n1.js 是 **React Compiler 运行时**（`w` = useMemoCache），chunk-ayrvc8dg.js 是 **@smithy/core**。建议 vendor 处理（`docs/process/vendor.md`）统一核对。
2. chunk-sx9xc5ee.js（Bedrock 设置向导）在切分阶段被误归到 agents 向导附近（domain-ui 也指出过），已放到 `components/providerSetup/bedrock/`。
3. React Compiler 的 `$` 缓存变量在 18hw 里 200 处由规则统一命名；dom-ui 已命名的 3 处让位。
4. chunk-18hwfzwa.js 里有大量重复的同名状态选择器（`(s)=>s.isLoading` 等，每个组件文件各一个），按 chunk 去重加了数字后缀；如果最终输出按文件拆分，可以去掉后缀。
5. 23fm9f0d（转录保留期清理）和若干 `_new` 门面模块并入了旧版已有文件（utils/cleanup.ts、utils/path.ts、utils/sessionRestore.ts、utils/sessionStoragePortable.ts、interactiveHelpers.tsx、ink/clearTerminal.ts），合并时注意与其他组放进同一文件的声明顺序。
