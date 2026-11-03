# 第四阶段第二轮命名：name-r5（组 5）

范围是 `analysis/segments/naming-round2.json` 的第 5 项：1,866 个声明，约 606 KB，分布在 107 个目录、225 个 chunk（阅读树约 348 个文件）。主要模块如下：

- `services/mcp/**`：MCP 客户端 v1/v2 两份副本（`chunk-z1n5m6nf.js` 与 `chunk-8t8n4kdh.js`）、连接缓存与重连、发现缓存、服务器身份标准键、文件引用上传、后台任务（SEP-2663）与 worker 唤醒、技能目录、Design 计划闸门、运行时 SDK 代选择等
- `services/projects/**`：/send-to-project 与 Projects 频道 API、简报文本、项目记忆、设置提案与校验、线程中继行与转录
- `services/plugins/**`：账号插件同步（scope 门槛、清单、同步钩子）、dev mods、`claude plugin` 命令、卸载清理、插件发布
- `services/autoModeSetup`、`services/workflows`、`tools/WorkflowTool`、`tasks/LocalWorkflowTask`
- `components/PromptInput`、`hooks/notifs`、`cli/remoteIO`、`selfHostedRunner/git`
- `utils/auth`（云认证刷新锁、启动器宿主登录、OAuth 刷新锁）、`utils/pollEvents`、`utils/imageFormats`、`utils/jsonScan`、`utils/wifProfile`、`utils/verbInflection`、`utils/requestReplay`、`utils/queuedCommandDisplay` 等 2.1.316 新模块
- `tools/SkillTool`、`tools/AppifactReplTool`、`tools/ChromeSetupOfferTool`、`tools/WaitForMcpServersTool`、`types/hooks.js`、`upstreamproxy/relay.js`

## 做法

脚本都在 `artifacts/tmp/r5/`，每个脚本开头注释写了输入输出。

1. `dump.mjs` 按阅读树文件导出每个声明的代码、调用方（当前名）、兄弟绑定、≥500 字节函数的参数与局部，分成 23 批（`batch/b00.txt`–`b22.txt`），并生成 `keys.json`（声明 id → 绑定键）。
2. 逐批阅读，手写命名清单 `names/bNN.txt`（格式：`<chunk#压缩名> <新名> [~置信度] [@偏移=局部名 …] [| 说明]`）；说明补写放在 `names/dNN.txt`。
3. `exportnames.mjs` 从 chunk 的 `export { X as 可读名 }` 里取出 92 个原始导出名，`gen.mjs` 生成时优先用它们（置信度 0.9，note 标"chunk 导出名"）。
4. `gen.mjs` 生成 `naming/semantic-r5.jsonl` 与 `naming/docs-r5.jsonl`；`cover.mjs` 按批检查遗漏；`doccov.mjs` 统计"≥300 字节或被导出"的声明的说明覆盖；`docneed.mjs` 抽出缺说明的声明供补写。
5. `dryrun.mjs`（叠加 `naming/final/top.json` 已有名字）和 `dryrun-merged.mjs`（再叠加其他组全部 `semantic-*.jsonl`）逐 chunk 跑 `renameModule` 校验。

## 结果

| 项 | 数量 |
|---|---|
| 声明 | 1,866 个，已命名 1,865 个（剩 1 个见下文） |
| 顶层绑定命名 | 2,289：声明主绑定 1,865（其中 92 个取自 chunk 导出名）+ 同一语句里的兄弟绑定 424 |
| 参数 | 394 |
| 局部变量 | 586 |
| `naming/semantic-r5.jsonl` 总条数 | 3,269 |
| 说明（`naming/docs-r5.jsonl`） | 932 条。≥300 字节或被导出的 937 个声明里，924 个由本组写说明，另 13 个其他说明表已有；另有 8 个较小声明也写了 |
| ≥500 字节的声明 | 241 个，其中 219 个命名了参数、关键局部或兄弟绑定 |
| 改名引擎校验（叠加 final/top.json） | 225 个 chunk，请求 3,269，生效 3,269，冲突 0，拒绝 0 |
| 改名引擎校验（再叠加其他组 semantic 表） | 同上：生效 3,269，冲突 0，拒绝 0 |

置信度：输出范围 0.6–0.9。命名清单里有 498 条标为 0.5–0.55（含义能看出但证据较弱，多是一两个调用方的小函数、数值常量组和 React 组件的局部），按规则下限输出为 0.6；其中顶层 468 条在 note 里加了"存疑，置信度按下限 0.6 输出"，方便 lead 复核。

校验过程中改掉的冲突：

- `chunk-e6aww6q8.js#eBr`：`validatePollEvent` → `buildPollEventEnvelope`（同 chunk 已有导入名 `validatePollEvent`）。
- `chunk-9cjx5pnm.js#Jr`：`snapshotPublishFolder` → `buildPublishSnapshot`（同名已存在）。
- `chunk-e6aww6q8.js#Lur`：`CONTEXT_MANAGEMENT_SECTION` → `CONTEXT_MANAGEMENT_PROMPT_SECTION`（同 chunk 里另一份副本的导入已叫这个名字）。
- `chunk-dz3q485w.js#Ln/#fr` 的局部 `toolsUsedBlock` → `toolsBlock`（会遮住外层同名函数）；`chunk-2a8yx6fc.js#an` 的局部 `@39325` → `shellEnv`（与参数同名）。
- 早期批次另改过 `saveSessionMeta` → `writeSessionMetaCache`、`mountOrigins` → `mountUrlOrigins`。

## 与其他命名表的重合（交给 lead 取舍）

- 键重合：`semantic-ui` 的 `chunk-18hwfzwa.js@1802699` 同为 `trackedFiles`；`_semantic-tools-lowconf` 的 `chunk-e6aww6q8.js@957363`、`@958140`，本组已改成与它一致的 `foldConfusableGraphemes`、`matchReservedSkillNamespace`。
- 说明重合：`docs-commands` 的 `chunk-9689amr8.js#G`；`docs-extensions` 的 `chunk-bgxm64nj.js#k`、`chunk-8t8n4kdh.js#Xd`、`#Jn`、`#c_`。本组说明是对照代码重写的。

## 还没命名的部分

- **顶层**：`chunk-18hwfzwa.js#H_t` 一组（`H_t`、`U_t`、`W_t`、`j_t`、`q_t`、`$_t`、`V_t`）没命名。它们在外部构建里都被编译成 `null`，只是启动通知列表 `G_t`（已命名 `COMPUTED_NOTICE_SPECS`）里的可选占位，看不出原本是哪条通知；已写说明。
- **≥500 字节但没有命名局部的 22 个声明**：多是数据字面量和常量表（`Hdr`、`jdr`、`hr`、`Fd`、`X`、`c0t`）、类（`Fmt`、`j`、`k`、`Man`、`He`、`cae`、`uae`、`Ie`，方法参数多为单字母回调），以及局部已被自动命名的函数（如 `rD` 的 `MCP_SDK_GENERATION`、`Pe` 的 `safeParse`）。顶层名和说明已经够读。
- **其余函数的局部**：只命名了关键参数和局部；循环下标、箭头回调参数、React Compiler 的缓存槽变量多数保留压缩名。

## v1/v2 重复代码

MCP 客户端有两份几乎相同的实现：v1 在 `chunk-z1n5m6nf.js`（阅读树归到 `services/mcp/discovery.js`、`connectionRegistry.js`、`sdkManifest.js` 等），v2 在 `chunk-8t8n4kdh.js`（`services/mcp/client.js`）。两边相同的函数用了相同的名字（例如 `runCachedFirstDialArms`、`clearServerCache`、`detachAndCloseConnection`、`recordRawToolsForResult`），说明里注明"v1 副本"。运行时由 `rD`（`mcpSdkGeneration`）决定用哪一份，`chunk-asne9cp8.js` 的 `mcpClientModule` 等访问器负责按代加载并校验 `MCP_TREE_ID`。

## 发现的问题：放错文件的声明

格式：`声明 id → 应归路径，证据`。

- `chunk-aepeg2w5.js#A$`（及兄弟 `Yss`、`T$`，网关令牌刷新余量与响应 schema）在 `services/mcp/xaa.js` → `services/gateway/gatewayAuth`，只被 gatewayAuth 与 GatewayLogin 使用。
- `chunk-0sfjpx19.js#W0n`（Kairos 定时任务随压缩携带的附件）在 `services/mcp/mcpConnectionRefusals.js` → `services/compact`/定时任务模块，调用方是 SessionController 与 rewindConversation，与 MCP 无关。
- `chunk-sdzpqjn8.js#bt`（代码语言→扩展名表）在 `commands/insights.js` → `services/conversationImport`，只被会话导入使用。
- `chunk-fnmk6x3n.js#u`（ProTrialExpiredDialog）在 `commands/bridge/bridge.js` → pro 试用到期命令。
- `chunk-kswt4qha.js#il`（resolveEffortLevel，27 个调用方）在 `commands/model/model.js` → effort 工具模块。
- `chunk-cjydagjy.js#Lo` 在 `useCanSwitchToExistingSubscription` → `main`/迁移模块，调用方是 main.tsx 的 shouldSkipFreshMigrations。
- `chunk-e6aww6q8.js#dws` 在 `memory/MemoryFileSelector` → `utils/plugins`，调用方是 pluginLoader。
- `chunk-gwvwj681.js#P`、`#G`（zod schema）在 `components/OffscreenFreeze.js`，与组件无关。
- `chunk-18hwfzwa.js#EIe`（受信设备提示）在 `useNpmDeprecationNotification` → bridge/受信设备通知。
- `chunk-ag5x7vhf.js#BS`（OAuth 过期状态行）在 `ink.js` → 状态通知组件。
- `chunk-dcmhvw5a.js#Sp`（commit trailers 设置）在 `services/mcp/config.js` → settings。
- `chunk-b5fpmtr5.js#H`、`#V`（PollEvents schema）在 `services/mcp/client.js` → `tools/PollEventsTool`。
- `chunk-7zr1t9gr.js#Kii`（Artifact 403 判断）在 `services/mcp/client.js` → `tools/ArtifactTool`，唯一调用方是 artifactPermissionRules。
- `chunk-f9asxqh1.js#Gqe`、`#JM`（会话引用 gate）在 `plugins/accountSync/listPlugins` → `utils/claudeAiSync`，调用方遍布 skillsSync、pluginsSync、WebFetch、ScheduleWakeup。
- `chunk-e6aww6q8.js#Wen` 在 `commands/terminalSetup/index`，与终端设置无关。
- `chunk-f9asxqh1.js#pe`、`#vrr`（插件行转换与列表指纹）在 `syncedHookSchema.js` → `services/plugins/accountSync/listPlugins`，调用方是 listPlugins 与 pluginsSync。
- `chunk-f9asxqh1.js#F5r`、`#U5r`、`#tot`、`#Err`（列表请求错误分类）在 `syncedPluginHooks.js` → `listPlugins`（或共享的列表错误模块），调用方是 listPlugins 与 orgSkillsApi。
- `chunk-f9asxqh1.js#I5r`、`#O5r`、`#D5r`（同步可用性判断）在 `pluginsScopeGate.js` → `utils/claudeAiSync`，调用方是 skillsSync 与 syncedPluginHooks。
- `chunk-dz3q485w.js#Re`、`#_s`、`#Ie`、`#ys`、`#pn`、`#mn`、`#ct`、`#hn`（频道记忆 API，`/v1/code/memory/channel`）在 `services/projects/projectMemory.js` → `services/projects/channelApi`（或独立的频道记忆模块），它们用 ChannelApiError、`checkChannelResponse`，与同文件的 claude.ai 项目 API（`chunk-j0nnxep0.js`）不是一套。
- `chunk-dz3q485w.js#In`（带重试发送简报消息）在 `briefText.js` → `channelApi` 或 `tools/ContinueInProjectsTool/submit`。
- `chunk-dz3q485w.js#as`（安全读取小文件）在 `toolsUsedSummary.js` → `folderBrief`，唯一调用方是 readDocExcerpts；`#je`、`#ke`、`#ds`（引用围栏）→ `briefText`。
- `chunk-s1zey0a9.js#fZn` 在 `services/projects/threadRows.js` → `utils/messages` 或 compact，调用方是 conversationReset 与 teleport。
- `chunk-ptag3qm7.js#c`、`#qCi`、`#YCi`（hearthbot 工具名与配置）在 `services/mcp/ccrMetaMcp.js` → hearthbot/Projects 线程模块（原有说明已注明归属疑误）。
- `chunk-hnzqng4j.js#He`、`#Le`（`ensureClaudeRuntimeFilesExcluded`，写 git info/exclude）在 `utils/cronTasksLock.js` → git 工具模块，与调度锁只是调用关系。
- `chunk-aepeg2w5.js#Pto`（进程启动令牌）在 `utils/auth/lockHolderLiveness.js` → 进程身份工具，调用方是 ShellCommand 与 functionHooks。

## 其他

- `chunk-zs9sd2e8.js#Xs`、`#_ks` 内联了构建常量对象（VERSION 2.1.316、GIT_SHA 等），只取 `.VERSION`。
- 本组脚本与中间文件都在 `artifacts/tmp/r5/`；没有改动 `tools/`、`analysis/`、其他 `naming/` 文件和 `reconstructed/`。
