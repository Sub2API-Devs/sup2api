# 领域 agents 过程记录（dom-agents）

## 做了什么

范围：`analysis/segments/domains.json` 的 `agents` 键，97 个模块（coordinator/、tasks/、Task.ts、tasks.ts、assistant/、bridge/、remote/、server/、buddy/、voice、entrypoints/sdk、utils/swarm、teammate*、forkedAgent、agentContext、cron*、ultraplan、background/remote 等）。开工时约 1,196 个声明；lead 按门面重切后领域内现有 1,019 个。`_unattributed/` 按规定不处理，但手册引用了其中与本领域强相关的几处（SDK schema 大 chunk `chunk-bwbq4xvm`、`bi`、`ya`、`OT`、`__i`）。

步骤：

1. `artifacts/tmp/agents/decls.txt` 列出全部声明；自写 `callers.mjs`（反向调用索引，当时 `q.mjs callers` 太慢）查调用方；`coverage.mjs`、`undoclist.mjs` 统计未命名与未说明的声明。
2. 按子系统逐 chunk 读 316 代码，对照 2.1.88（`references/` 与 `build/readable/src`）取名，结论以 316 代码为准。草稿写在 `artifacts/tmp/agents/src/*.txt`：c1–c4 任务系统与 fork/上下文，d 团队/蜂群，b1 协调者与 cron，b2 SDK schema，b3 buddy/语音/ultraplan/杂项，a1 独立 Remote Control（分身完成），a2 REPL 桥/远程会话/server（分身完成），z1–z3 补充说明。
3. `artifacts/tmp/agents/build.mjs` 把草稿编译成三个交付文件，校验声明存在、绑定无歧义（同名用 `名字#n`）、名字合法、不冻结、无重复。
4. 按 lead 中途通知改造 build：读 `analysis/names/facade.jsonl`，**有门面原名的绑定一律不再输出语义名**（跳过 155 个，其中 117 个原本与门面名不同，清单见 `artifacts/tmp/agents/facade-diff.txt`）；加键缓存 `keycache.json`（草稿标识符 → `@偏移` 键），naming/final 重新生成后草稿里的"当前名"变了也能定位。
5. 验证：在 `artifacts/tmp/agents/final-test/` 用 `tools/naming/resolve.mjs` 合并后再 `tools/rename/apply.mjs`：本领域顶层名落地 855、加后缀 4、被门面覆盖 117（改造前）、局部名全部落地；0 个被拒、1 个冲突（`chunk-8xs34hez` 的 `systemPrompt_2`）。
6. 手册 `docs/handbook/agents.md`：主体自写，第 6、7 章（Remote Control）由两个分身写成笔记（`notes-a1.md`、`notes-a2.md`），主笔核对后用 `merge.mjs` 合入。

## 数字

- `naming/semantic-agents.jsonl`：**2,098 条**（顶层 822、局部 1,276）；置信度 ≥0.75 的 1,429 条，<0.5 的 74 条（误归代码或用途未确认）。
- `naming/docs-agents.jsonl`：**869 条**说明。重切后其中 700 条落在本领域现有 1,019 个声明上（69%），另 169 条的声明已被移到 `_new/*`、`_unattributed/*` 或其他领域（说明本身仍有效，按 id 关联）。
- 本领域 200 字节以上的声明 383 个，有说明 322 个（84%）；没写说明的主要是误归的第三方/无关小函数和自解释常量。
- `naming/modules-agents.json`：**97/97** 个模块。
- 置信度规则：2.1.88 同名且行为一致 0.8–0.9；316 新代码按行为取名 0.6–0.8；误归代码 0.4–0.6；用途不明 0.4。

## 遇到的问题

- **子代理并发上限**：开始时并行派 5 个分身失败，改为自己做，后来一次一个派出 a1、a2。
- **`q.mjs callers` 超过 10 分钟**：自写反向索引代替（lead 之后已修好 q.mjs）。
- **apply.mjs 读 naming/ 目录时报错** `naming/docs-agents.jsonl:1: JSONL record needs "file"`：加载器把 `docs-*.jsonl` 也当命名文件读。只要 docs 文件在 naming/ 下，直接对 naming/ 跑 apply 就会失败；我改用只含 final + semantic-agents 的副本目录测试。**需要 rename 工具排除 `docs-*.jsonl`**。
- **不经 resolve 直接 apply 会让 187 个语义名输给 reference**：必须先跑 `tools/naming/resolve.mjs`，结果见上。
- **naming/final 重新生成后草稿里 77 个标识符失配**：草稿按"当时的当前名"引用绑定，用 keycache（由上一次输出反推的 2,253 条）解决。
- **重切分**：169 条说明的声明已不在本领域；没有删，因为说明内容仍正确，lead 合并时按 id 即可。
- **buddy/ 整个目录是空壳**：316 删除了伴侣精灵，`buddy/*` 名下 100% 是匹配误差。
- **SDK schema 不在 entrypoints/sdk**：真正的 zod schema 与方向表在 `_unattributed/chunk-bwbq4xvm`，`controlSchemas.ts`/`coreSchemas.ts` 名下多是 axios、zod、lodash、Anthropic SDK 内部代码。

## 给 lead 的建议

格式：`声明 id → 应归属路径 / 应叫什么，证据`。

### 整块误归

- **`entrypoints/sdk/coreSchemas.ts` 名下**：`chunk-h6b7mazd.js` 的 `#qi`（createInstance）及其后的 `I.*` 赋值语句、`#Ui`（HttpStatusCode）→ 第三方 `axios`（lib/axios.js）；`chunk-j2t139r9.js#_t`、`@57976` → 第三方 `zod`（ZodFirstPartyTypeKind 等）；`chunk-xfjxv2be.js#jt`、`#l`、`#H` → 第三方 lodash（MapCache/Hash）；`chunk-bzb0qnrm.js` 一组（`cLt/ft/uLt/fLt/pfo/mfo/G/ZHn/gfo/Rvr/pLt/v/J`）→ 远程插件钩子执行器，应归 `utils/hooks` 下（证据：解析远程钩子 stdin、等托管设置、找已启用插件）；`chunk-hwmsct5x.js#od/#ha/#ma` → Anthropic SDK 的结构化输出解析（第三方）。真正的 SDK schema 是 `_unattributed/chunk-bwbq4xvm.js`，建议整个 chunk 归 `entrypoints/sdk/coreSchemas.ts` + `controlSchemas.ts`（证据：`X4` 方向表、`SDKControl*Schema`、所有 `type`/`subtype` 字面量）。
- **`entrypoints/sdk/controlSchemas.ts` 名下**匹配到的 `m$` 等是 zod coerce 助手 → 第三方 zod。
- **`buddy/*` 全部**：316 已删除该功能（物种编码、稀有度序列、`companionMuted` 都不存在）。具体：`chunk-mrx6y2r5.js`（`#xo` AzureAuthorityHosts、`#Fn` ALL_TENANTS 等）→ 第三方 `@azure/identity`；`chunk-j2t139r9.js` → zod；`chunk-18hwfzwa.js#$3` → 编辑器等待提示（外部编辑器模块）；`chunk-6ht21p2a.js#QUs` → Artifact 发布（被拒内容记录）；`chunk-3rwvzn82.js#Pe` → 文字闪光组件（components/Spinner 一带）；`xJ`（预填提示词警告 hook）→ PromptInput 一带；~/.claude.json 身份读取 → `utils/config.ts`。建议 lead 把 `buddy/` 从重组树删掉。
- **`utils/cronTasks.ts` 的 `chunk-b0a246e7.js` 全部**（`qBt/S$r/jzs/_e/de/YBt/HYn/Wzs/$Lo/kh/NYn/oE/Gze/FLo/JBt`）→ Artifact presence 与评论（`CLAUDE_CODE_ARTIFACT_COMMENTS`、`tengu_teal_corbel`），应归 Artifact 评论模块（`_new/` 下或 `tools/ArtifactCommentsTool`）。证据：操作评论线程、mention、presence 对象，与 cron 无关。
- **`utils/agentContext.ts` 下的无关 AsyncLocalStorage 封装**：`chunk-aepeg2w5.js#vd/#yro/#TPt/#Bki` → `utils/cwd.ts`（调用方都是 cwd 覆盖）；`chunk-e6aww6q8.js#vL` → Bash 危险命令遥测（`tools/BashTool`）；`#Lve` → `utils/attachments.ts`（附件耗时统计）；`#Pet`、`#q2e` → `services/mcp/client.ts` / query（调用 id 与计时器）；`chunk-5xbkq5z7.js#w7r/#r/#Eg/#o/#M_i` → 宿主代理策略（HostAgentPolicy，新文件，SDK 宿主限制后台/fork 等）；`chunk-7kr2r08r.js#B/#Rn` → 文件读取器覆盖（`utils/fileRead.ts` 一带）；`chunk-nsfjm4vg.js#xhe` → `utils/diagLogs.ts`；`chunk-tyg7f3ek.js#lP/#s0/#ip` → 快照存储（未确认）；`chunk-fnk5kvbf.js#i/#t/#u` → 调用帧栈（未确认）；`chunk-astf3mhy.js#as` → `tools/SendMessageTool`（getMessageSenderName）；`chunk-6zwd30tr.js#be` → in-flight 存储。证据：这些都是被指纹撞成 `getAgentContext`/`runWithAgentContext` 的同形小函数，调用方见括号。
- **`utils/forkedAgent.ts` 的 `chunk-18hwfzwa.js#FMt`、`chunk-d62reftv.js#le`**：旧版名 createGetAppStateWithAllowedTools 配错，实为 `getAlwaysAllowRules`（权限上下文小函数）→ 权限模块。

### 单个声明

- `Task.ts` 的 `CUt` → 是 `isShellCommandSettled`，应归 `tasks/LocalShellTask` 或 `utils/ShellCommand.ts`（证据：判断 shellCommand 结果状态）。
- `tasks.ts` 的 `Jn` → 应叫 `getTaskImplsByType`（按 type 返回任务实现表），不是 LocalWorkflowTask。
- `tasks/LocalAgentTask` 的 `isPanelAgentTask_N` 一组 → 各 chunk 的同形克隆，只有一个是真的，其余回各自文件（fingerprint-shared 一对多）。
- `chunk-hnzqng4j.js#he` → 应归 `utils/cronTasksLock.ts`（调度锁内容读写）。
- `Xme` → `restoreAgentTaskFromTranscript`（沿父代理链核对启动记录），归 `tasks/LocalAgentTask`。
- `Xpt`、`hVn` → 任务终止摘要文字格式化（formatTaskTerminalSummary 一类），归 `tasks/LocalShellTask`。
- `tasks/RemoteAgentTask` 的 `tn`、`JFe`、`bDi` → 名字配错，不是远程任务代码（各自调用方所在模块）。
- `tasks/InProcessTeammateTask` 的 `requestTeammateShutdown_N` 克隆 → 实为 `isTaskRunning`、`auto_mode_scan` 任务查找等，回各自文件；`chunk-v5mxhgy9.js#_ht`（列出全部 in_process_teammate 任务）、`chunk-6vnxsn99.js#Ef`（类型判断）才属于这里。
- `chunk-ae5g0zb5.js#Or`、`chunk-aqdf5t3e.js#Mt`、`chunk-fq0cr76a.js#J6r` → 与所在 agents 模块无关（匹配误差）。
- `utils/swarm/permissionSync.ts` 的 `G_e/ia/Xf/bn/_St/zl` → 与权限同步无关（`chunk-e6aww6q8.js#_St` 是"目标是否未解析"）。
- `utils/swarm/teamHelpers.ts` 的 `chunk-g54kbxqw.js#$s/#Ee` → 会话持久化代码，不属于团队文件。
- `utils/swarm/backends/detection.ts` 的 `chunk-1de6ar4n.js#Zje` → 实为 `addSessionWorkingDirectories`。
- `utils/swarm/backends/registry.ts` 的 `chunk-18hwfzwa.js#kMt` → 文件删除助手。
- `utils/teammateMailbox.ts` 的 `chunk-nw7jbebs.js#tt` → 任务列表锁（tasks 工具）；同 chunk 的 `#Jt`（选择器行数常量）也无关。
- `chunk-mq9v2gw5.js#nC`、`#RBe`（父→子 AbortController 转发）→ 通用 abort 工具，不属于本领域模块。
- `chunk-e6aww6q8.js#ilr`、`#Hmn` 与 `forkedAgent` 一致，归属正确；但 `chunk-e6aww6q8.js#ulr` 才是 runForkedAgent 主体，门面原名 `runForkedAgent` 落在外层计数包装 `#wP` 上。我给 `ulr` 取名 `runForkedAgentImpl`，请 lead 确认门面名与这一对的关系。
- `chunk-18hwfzwa.js#d4t/c4t/u4t/m4t/p4t/f4t`（同形 logError 包装）与 `#tKo`（频率/冷却常量）→ 不属于本领域，用途未完全确认。
- `chunk-aat7wt0p.js#pLi`（token 序列匹配）→ 用途未确认，不属于本领域。

### Remote Control（独立模式，分身 a1 发现）

- `bridge/bridgeApi.ts` 的 30 个 `extractErrorTypeFromData_N` 只有 `chunk-b30925fy.js#B` 是真的；其余是各 chunk 的同形小助手，应回到各自文件：
  - `chunk-g54kbxqw.js#la/#ua/#cn/#Ye/#ma/#pn/#ga/#fn/#hn/#Ts/#ha/#ya/#_a` → 会话统计/哈希（调用方 `utils/sessionStoragePortable.ts · ba`），应归 `utils/sessionStoragePortable.ts`。
  - `chunk-yxnffbzs.js#tXt/#oY/#uCi/#fCi/#pCi/#E` → 查询循环注入的元提示文本与判断（调用方 query/print），应归 `query.ts` 或 `utils/messages.ts` 一类。
  - `chunk-nw7jbebs.js#Xt`、`#Brr` → `utils/teammateMailbox.ts`（协议帧字段规范与规范化，调用方 `Fee`、`inProcessRunner`）。
  - `chunk-0sfjpx19.js#it/#Qr/#Xr/#Yr` → 中断/合成消息判断，应归 `utils/messages.ts`。
  - `chunk-mketzrwm.js#t4t/#sPe` → teammate 消息信封识别，应归 `utils/teammateMailbox.ts`。
  - `chunk-3nztfxrw.js#Le/#de/#Sn/#En`、`chunk-ah34pb7m.js#UT/#AT`、`chunk-e6aww6q8.js#vfo/#_8s/#mfe/#uUr/#VI` 及 `chunk-08945j39.js#ve`、`chunk-0kp6eg01.js#le`、`chunk-18hwfzwa.js#Zre`、`chunk-1qpz7qcd.js#f7r`、`chunk-29pqxdaf.js#ue`、`chunk-8wvtd8sr.js#hu`、`chunk-a76knw89.js#We`、`chunk-aepeg2w5.js#xK`、`chunk-ag5x7vhf.js#BA`、`chunk-aqdf5t3e.js#mr`、`chunk-e7z1g8a9.js#IAi`、`chunk-fe6rs39h.js#jn`、`chunk-ha3km179.js#On`、`chunk-kszbqxwr.js#K6o`、`chunk-rmf8afvh.js#KPe`、`chunk-z4g2ta8k.js#hr/#uEo` → 各自 chunk 的未归属段（多为 content 文本提取），不应进 bridge。
- `bridge/bridgeMain.ts` 的 `isConnectionError_N` 只有 `chunk-wbbfk060.js#Ir` 是真的：`chunk-2g090z7k.js#k`（全项目通用的 `getErrnoCode`，被大量引用为 `isConnectionError_5`）应归 `utils/errors.ts`；`chunk-f9pzpnqt.js#e7/#Z/#be/#x` → `utils/sessionStorage.ts`（恢复 transcript 定位）；`chunk-8t8n4kdh.js#ai/#io` → `services/mcp/client.ts`；`chunk-weh04swb.js#Ke/#Ye` → MCP（-32042 URL elicitation）；`chunk-2tgyb8s4.js#o/#FMe` → 存储 v5 错误；`chunk-0knprqgt.js#*`、`chunk-bc20zedk.js#Ft`、`chunk-24t3dkzb.js#v`、`chunk-25sm7c4g.js#se`、`chunk-aat7wt0p.js#D`、`chunk-j3nx1xyn.js#u7t`、`chunk-g6j7q15x.js#Y` → 各自所在模块。
- `chunk-j2t139r9.js#Xe`（bridgeMain.ts 里的 formatDelay）是 zod 的 `floatSafeRemainder` → 第三方 zod。
- `chunk-whwptcwy.js#le`（spawnScriptArgs）与 bridge 无关 → 应归 Bash 权限/命令占位符检查相关文件。
- `chunk-4121qate.js#bx`、`chunk-hwmsct5x.js#ht`（Anthropic SDK sleep）、`chunk-mq9v2gw5.js#RBe`、`chunk-4121qate.js#Lk` 不属于 `bridge/capacityWake.ts`。
- `chunk-e6aww6q8.js#SAe`（workSecret.ts 里的 sameSessionId）是输出缓冲剪切 → 不属于 bridge；真正的 `sameSessionId` 是 `chunk-ptaf548f.js#g2e`。
- `chunk-1nk4j4sn.js#M`、`chunk-ag5x7vhf.js#DL`、`chunk-k7fgdyw5.js#h`、`chunk-xw83kd7e.js#dUe`（debugUtils.ts 中的 extractErrorDetail_N/extractHttpStatus_2）→ 各自模块；真正的是 `chunk-m8z86bna.js#EO`。
- `chunk-kndsyy4v.js#oe`（clearTrustedDeviceTokenCache）是 LRU 解析器类 → 不属于 trustedDevice。
- `chunk-ypjxapg8.js#Pe` 旧版名 `updateBridgeSessionTitle` 配错，实为向 peer 会话投递消息（`postPeerMessage`），可能应归 `tools/SendMessageTool` 的跨会话投递代码或 `bridge/peerSessions.ts` 一类新文件。
- `chunk-0jk9tmkx.js#R`（旧版名 isClaudeAISubscriber）实为"是否主动注册可信设备"的判定，已改名。

### REPL 桥 / 远程会话（分身 a2 发现）

- `chunk-1qpz7qcd.js#__i` → `bridge/bridgeMessaging.ts`，应叫 `handleServerControlRequest`；证据：switch 覆盖 initialize/set_model/…/fork_conversation，日志 "[bridge:repl] Rejected … (outbound-only)"，旧版同名函数在该文件。当前名为 handleServerControlRequest 的 `chunk-1qpz7qcd.js#J` 只是回写函数，已改名 `sendControlResponseWhenSettled`。
- `chunk-e6aww6q8.js#g$e/blo/vlo/Elo/Rlo/Clo/umi/Rvt/Evt/get/vPs` → 不属于 `bridge/inboundAttachments.ts`，是把 task-notification 排队命令折叠进 `poll_events` 附件 / tool_result 的消息管线代码（建议归 `utils/messages.ts` 或 `utils/attachments.ts` 一带）；证据：操作 `poll_events`、`queued_command`、`TASK_NOTIFICATION`，与文件下载无关。
- `chunk-3xb70ww4.js#v1n/$Nt/Rwo/k1n/xPr` → 消息转纯文本/导出摘要代码，不属于 inboundAttachments；`k1n` 的旧版名 sanitizeFileName 配错。
- `chunk-0sfjpx19.js#si` → 不属于 inboundAttachments（在消息里定位单次工具调用的提示索引），旧版名 sanitizeFileName_2 配错。
- `chunk-qcc88jq1.js#j7e` 才是真正的 `sanitizeFileName`（basename + 字符清洗 + 扩展名 ≤16 + 总长 ≤200）；`chunk-3xb70ww4.js#k1n` 当前占用了这个旧版名。
- `chunk-g54kbxqw.js#Yvn/T1/Wo` → 远程工具执行（remote tool call）结果转换，不属于 `bridge/inboundMessages.ts`；`chunk-012rhzq5.js#Ze/ue/De` → MCP 工具结果图片引用解析，也不属于该文件。
- `chunk-e6aww6q8.js#TWr` 旧版名 isMalformedBase64Image 配错（是构造 image tool_result），真正的 `isMalformedBase64Image` 是 `chunk-mketzrwm.js#O`。
- `chunk-1wpnxx5r.js#b/pe/uyr/LCi/fe`、`chunk-aepeg2w5.js#oas/tTi` → 云会话 MCP（memory/toolbox 代理）相关，建议归 `services/mcp/` 下的 CCR 代理模块，不属于 `bridge/sessionIdCompat.ts`；fingerprint-shared 的 toCompatSessionId_N 名字都是误配。
- `chunk-3wek6r2k.js#na/Rye/WMs` → 会话绑定失败文案，建议归 `bridge/createSession.ts` 或 bridgeMain 一带。
- `chunk-18hwfzwa.js#tUe/eUe` → 协调者 origin 标记与纯文本判定，不属于 `bridge/bridgeMessaging.ts`（建议 coordinator 或 utils/messages）。
- `chunk-tyg7f3ek.js#N_`（合并 result 消息）→ 应在 cli/print 或 QueryEngine 一带，不属于 bridgeMessaging。
- `chunk-kj4ctmv0.js#LFs`（"Started in the background" 提示）→ 不属于 `remote/sdkMessageAdapter.ts`，旧版名 convertInitMessage 配错。
- `chunk-fe6rs39h.js#Yi` 旧版名 fetchPage 配错（应为 `isRemoteTurnUnderWay`）；`chunk-kgtpkbhq.js#k` 叫 createHistoryAuthCtx 不准确，316 也被归档动作复用（`buildSessionEndpoint`）。
- `chunk-s61vbvea.js#JVo`（`JVo` 是 beta 头组合、`QVo` 才是版本号）不属于 `bridge/codeSessionApi.ts`。

### 工具链

- `tools/rename/apply.mjs`（及其加载器）读 `naming/` 时不应包含 `docs-*.jsonl` 与 `modules-*.json`；现在 docs 文件会让它直接报错退出。
- 草稿以"当前名"引用绑定的做法在 naming/final 重生成后会失配；其他领域若也这样写，建议统一用 `@偏移` 键或类似 keycache 的缓存。
