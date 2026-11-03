# 第四阶段第二轮命名：name-r0（组 0）

范围：`analysis/segments/naming-round2.json` 第 0 项，共 1,662 个声明，分布在 330 个阅读树文件、195 个 chunk，含 2,140 个顶层绑定（包括同一声明里的兄弟绑定）。主要目录：`utils/hooks`（347 个声明：设备 hook、服务端 hook 沙箱、匹配器语法、hook 输出解析、破坏性命令检测等）、`utils/teleport`（219 个：git bundle 上传、目录同步规则、wipStash、云会话启动、可信设备等）、`remote/tools`（163 个）、`skills/bundled`（100 个）、`tools/AgentTool`（87 个）、`cli/transports`、`utils/background`、`tools/ProposeSkillsTool`、`utils/swarm`、`services/modelCatalog`，以及 `utils/config.js`、`utils/pollEvents.js`、`utils/messageQueueManager.js`、`utils/worktree` 等。

## 结果

| 项 | 数量 |
|---|---|
| 顶层绑定已覆盖 | 2,050 / 2,140（声明 1,578 / 1,662 全部绑定都有名字） |
| 其中本表新命名的顶层绑定 | 1,977 |
| 其中保留原名（hillclimb 资源脚本未压缩，原名就是可读名，写入同名条目、置信度 0.9） | 33 |
| 其中阅读树里已有可读名（门面/auto/其他表），不再写 | 40 |
| 参数命名 | 161 |
| 局部变量命名 | 65 |
| `naming/semantic-r0.jsonl` 总条数 | 2,236 |
| 说明（`naming/docs-r0.jsonl`） | 520 条。≥300 字节的声明全部覆盖；本组被导出的声明在阅读树里大多已有名字和说明 |
| 改名引擎校验 | 195 个 chunk 逐个调用 `renameModule`（只加载本表）：2,236 条，拒绝 0，冲突 0，实际改名 2,203（另 33 条与原名相同）。见 `artifacts/tmp/r0/rename-check.txt` |

置信度分布：≥0.8 的 175 条，0.7–0.75 的 664 条，0.65 的 317 条，0.6 的 552 条。另有 528 条是原估 0.5–0.55、按 0.6–0.95 的规则提升到 0.6 的，`note` 以“低把握”开头，合并时可以优先让位给别的表。

参数和局部变量：

- 只做了 ≥500 字节函数里的函数头参数和引用较多的局部变量（`artifacts/tmp/r0/locals.txt` 列出的候选共 529 个，排除了 React Compiler 组件里的临时元素变量）。
- React Compiler 产物统一处理：记忆缓存数组 `X = w(N)` 命名为 `$`（与阅读树中已有的 553 处一致），被解构的组件参数命名为 `props`（共 21 条，`n/zz_auto.txt` 由 `autolocals.mjs` 按模式生成）。r1 把同类缓存叫 `cache`，p6 叫 `$`，需要 lead 统一。

## 还没命名的

共 90 个顶层绑定（84 个声明），全部是我读过但含义没有确认的（原估置信度 0.4–0.45）。按 domain-guide“只在确认含义时写”的规则没有写入本表。猜测名列在 `artifacts/tmp/r0/lowconf.tsv`，可供后续核对。按目录分布：

- `utils/hooks/*`（约 40 个）：`deviceHooks/cloudRegistration.js` 中 `f_` 声明里 5 个只看得到数值的定时常量；`hookEventSets.js` 中的 `bl`、`jZs`、`WZs`、`GZs`（工具/匹配器归类谓词）；`hookOutputParsing.js` 中的 `CAn`、`mnt`、`RAn`（子代理 hook 标记解析）；`servedHooks/hookSandbox.js` 中的 `ACo`、`lBt`、`n4s`、`cBt`、`i1e` 等。
- `utils/teleport/dirSync.js`、`dirSyncRules.js`、`screenedGit.js`、`wipStash.js`（约 20 个）：例如 `PZo`、`oer`、`ier`、`fXe`、`mer`、`sXe`、`ger`、`yer`、`uXe`、`jnn`、`Fer`、`Ber`、`aa`、`ua`、`ca`、`En`、`Oi`。这些函数的逻辑看得懂，但它们在路径拼写变体、可达范围这套规则里的具体角色没有确认。
- `utils/messageQueueManager.js`（5 个）、`utils/shutdown/pendingWrites.js`（3 个）、`utils/pollEvents.js`（`kYt`、`Var`）、`utils/hooks/postSamplingHooks.js`（`Il`、`Ul`）等零散的小函数。
- 少量常量：`skills/bundled/explainUsage.js#I`、`tools/AgentTool/agentToolUtils.js#zxo`、`utils/hooks/hookSpecificOutput.js#BD`、`utils/hooks/matcherGrammar.js#U` 的兄弟绑定等。

## 与其他命名表的重合（交给 lead 取舍）

- 键重合 6 处，都在 `naming/_semantic-tools-lowconf.jsonl`：其中 2 处名字相同（`chunk-ah34pb7m.js@244494 countStableCountableRows`、`@245391 isRenderableProgressMessage`）；4 处不同：
  - `chunk-0h4e7gnq.js@151017`：`WORKFLOW_GATE_TIMEOUT_MS` → `AGENT_STALL_GRACE_MS`
  - `chunk-5ghnps9r.js@1087`：`isOfferedStandingRule` → `matchesOfferedWindowsSandboxRule`
  - `chunk-5ghnps9r.js@1218`：`getEffectiveSessionPermissionUpdates` → `sessionUpdatesForCaller`
  - `chunk-ah34pb7m.js@244760`：`buildProgressLookups` → `buildSubagentLookups`
- 说明重合 16 处：
  - `docs-p0`：`chunk-gjx0rh1b.js#Sr`、`#fo`、`#Ed`、`#kd`、`#Cr`、`#to`。
  - `docs-commands`：`chunk-4cndz99e.js#A`、`chunk-he8wyk3b.js#E`、`chunk-cc2xzzcg.js#m`、`chunk-g49d7j62.js#s`。
  - `docs-extensions`：`chunk-s61vbvea.js#Ttr`、`#Atr`、`chunk-hantmvxa.js#ai`。
  - `docs-p2`、`docs-p6`：hillclimb 的 `main`、`build`、`render`。
  - 本组的说明是对照阅读树代码写的；有分歧时以代码为准。

## 发现的问题

放错文件或模块名与内容不符的声明（`声明 id → 应归位置，证据`）：

- `chunk-18hwfzwa.js#uxe`、`#mxe` → 应归 iTerm2（it2）安装流程，靠近 `utils/swarm/It2SetupPrompt.js`。证据：内容是 “Install it2 now / Use tmux instead” 选项和安装中界面；文件头也写了“疑似匹配错误”。现在放在 `components/agents/AgentDetail.js`。
- `chunk-sx9xc5ee.js#we` → 应归 Amazon Bedrock 接入向导（第三方提供商设置）。证据：字符串 “Verifying credentials”、“AWS STS and Bedrock”。现在放在 `components/agents/new-agent-creation/CreateAgentWizard.js`。
- `chunk-y6fv30yg.js#_e` → 应归 Vertex 接入配置。证据：构造 `CLAUDE_CODE_USE_VERTEX: "1"`，并把其他提供商的开关清空。现在放在 `components/agents/new-agent-creation/wizard-steps/ConfirmStep.js`。
- `chunk-e6aww6q8.js#Acr` → 内容是网页抓取（web-fetch）子代理的定义，不是 verification agent。现在放在 `tools/AgentTool/built-in/verificationAgent.js`。
- `chunk-s61vbvea.js#H4r`、`#FW` → 应归平台路径大小写处理（大小写不敏感平台判断、路径大小写折叠）。现在放在 `utils/teleport/remoteTaskLabels.js`，与“远程任务标签”无关。
- `utils/messageQueueManager.js` 里有三处惰性 require：`Nn`、`tn`、`Nf`，分别加载 extractMemories、agentJobState（jobClassifier）、postTurnSummary 模块。本组命名为 `extractMemoriesModule`、`agentJobStateModule`、`postTurnSummaryModule`。它们不属于消息队列。

名字或注释配错：

- `utils/config.js` 的 `getProjectsDir`（`chunk-aepeg2w5.js` 86211 起，来自指纹 0.798）名字错误：实际判断项目配置改动的键是否都属于低风险键集合（`HI` → `LOW_STAKES_GLOBAL_CONFIG_KEYS`）。不在本组范围，没有改。
- `tools/AgentTool/runAgent.js` 中 `Ld` 上方的 JSDoc，以及 `services/cloudSessions/webSetupPostPushHook.js` 中 `k` 上方的 JSDoc，描述与代码不符（注释里已标“旧版名配错”）。
- `utils/teleport/wipStash.js`：`nd` 上方的 JSDoc 写的是“清理过期且对应进程已不在的 PID 目录（名字配错）”。`nd` 实际删除的是以 PID 命名的过期 seed 索引文件，不是目录；本组把它命名为 `pruneStaleSeedIndexes`。
- `utils/teleport/wipStash.js` 的 `Gt` 调用了阅读树中名为 `SPINNER_FRAMES` 的导入，但它实际用于列出路径的各级父目录。这个导入名是错的。

## 做法与工具（都在 `artifacts/tmp/r0/`）

- `dump.mjs`：按文件导出待命名声明的源码片段、顶层绑定键、文件内用法，生成 `dump/NNN.txt` 和 `items.json`。
- `n/*.txt`：人工命名决定，每行一条，格式为 `F 文件` / `T 压缩名 新名 置信度 | 备注` / `L 声明.局部[#序号] 新名` / `D 声明 说明`。
- `build.mjs`：把决定编译成 `naming/semantic-r0.jsonl` 和 `naming/docs-r0.jsonl`。它会：
  - 校验文件、名字是否合法，以及门面/vendor 名不被覆盖；
  - 统计覆盖率；
  - 把 <0.5 的条目剔出到 `lowconf`，把 0.5–0.6 的提到 0.6 并标“低把握”。
- `localdump.mjs` / `autolocals.mjs`：列出局部变量候选；按模式命名 React Compiler 缓存和 props。
- `doclist.mjs`：列出还缺说明的 ≥300 字节声明。
- `validate.mjs`：改名引擎试跑。
