# 第四阶段第二轮命名：name-r8（组 8）

范围：`analysis/segments/naming-round2.json` 第 8 项，共 1,654 个声明（606,248 字节），分布在 274 个阅读树文件、135 个 chunk。主要目录：`tools/ArtifactTool`（598 个声明：动作处理、权限规则、预览、发布/编辑、提示词、能力合约、恢复携带状态等）、`utils/claudeInChrome`（147 个）、`cli/print`（117 个）、`services/workflow`（67 个）、`utils/contextAttachments`（45 个）、`tools/PowerShellTool`（43 个），以及 `utils/worktreeIsolation.js`、`utils/worktree.js`、`components/ManagedSettingsSecurityDialog`、`utils/errorRedaction.js`、`utils/instructionFileAccess.js`、`bridge/inboundAttachments.js`、`utils/commandPredicates.js`、`utils/sessionAddresses.js` 等。

## 结果

| 项 | 数量 |
|---|---|
| 声明覆盖 | 1,654 / 1,654（每个声明的全部顶层绑定都有名字） |
| 顶层绑定命名（含同一声明里的兄弟绑定） | 2,051 |
| 参数命名 | 500 |
| 局部变量命名 | 246 |
| `naming/semantic-r8.jsonl` 总条数 | 2,797 |
| 说明（`naming/docs-r8.jsonl`） | 892 条，每条 1–2 行。≥300 字节的声明全部覆盖；被导出的声明 548 个，其中 546 个在本表有说明，另 2 个已在其他说明表里 |
| 改名引擎校验 | 135 个 chunk 逐个调用 `renameModule`（只加载本表）：2,797 条，实际改名 2,797，拒绝 0，冲突 0。脚本 `artifacts/tmp/r8/check.mjs` |

顶层名的置信度分布：0.8 的 1 条，0.7–0.75 的 225 条，0.65 的 509 条，0.6 的 1,316 条。0.6 那一档里有一部分是原先估 0.5–0.55 的名字，按 0.6–0.95 的规则提到了 0.6，合并时可以让位给把握更高的表。参数和局部变量的置信度统一写 0.7。

参数和局部变量：

- 只处理 ≥500 字节的声明（267 个）。这些声明里参数和被引用 2 次以上的局部变量共有 2,779 个短名（≤2 个字符），本表加上已有表合计命名了 1,146 个。
- 267 个声明中，82 个的候选已全部命名，184 个部分命名，只剩 1 个一个都没命名：`chunk-8wvtd8sr.js#In`（`ARTIFACT_ENDPOINTS_ACTION_HANDLER`）。它是一个占位处理器对象，各方法的参数只是原样转给真正的处理器，命名没有意义。
- 部分命名的声明里，没命名的主要是：内部回调和箭头函数的参数（`map`/`filter` 的元素）、React Compiler 产物的临时元素变量，以及只在一两行内使用的中间值。

## 还没命名的

- 顶层：没有。全部 1,654 个声明都已命名。
- 说明：≥300 字节的和被导出的都已覆盖。剩下的是 100–300 字节、未导出的小声明，规则不要求写说明。
- 局部：见上一节。

## 与其他命名表的重合（交给 lead 取舍）

键重合 25 处：

- `naming/semantic-ui.jsonl`：1 处，名字相同（`chunk-18hwfzwa.js@446214 tasks`）。
- `naming/_semantic-tools-lowconf.jsonl`：24 处，集中在 PowerShell 的 `commandSemantics.js`、`readOnlyValidation.js`、`powershellPermissions.js`。其中 2 处名字相同（`DOCKER_DANGEROUS_SHORT_FLAGS`、`DOCKER_DANGEROUS_LONG_FLAGS`），其余 22 处只是叫法不同、意思相同，例如：
  - `chunk-e6aww6q8.js@3105643`：`DEFAULT_PS_SEMANTIC` / 本表 `defaultExitInterpreter`
  - `chunk-s67vc0kc.js@17726`：`hasNativeArgQuotingRisk` / 本表 `hasNativeQuotingHazard`
  - `chunk-v0yfsee9.js@72619`：`getFirstTokenLower` / 本表 `firstCommandTokenLower`

  lowconf 表是低置信度表，建议以本表为准，或保持命名风格一致时取任意一方。

## 发现的问题（放错文件或内容和文件名不符的声明）

格式：`声明 id → 应归路径，证据`。

- `chunk-aepeg2w5.js#ZB`（以及同组的 `kk`、`eK`、`tK`），现在在 `utils/errorRedaction.js` → `services/gateway/gatewayDiscovery.js`。证据：唯一导入方是 gatewayDiscovery，内容是网关模型发现的超时与 schema，和错误脱敏无关。
- `chunk-h93cnm7e.js#I`（`OutputLines`），现在在 `components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.js` → `components/RemoteBootstrapProgress.js`。证据：唯一使用方是 RemoteBootstrapProgress（多行输出截断显示），声明路径参考里的 `_temp` 特征也指向那个文件。
- `chunk-x5e9ztk0.js#E`、`#U`、`#H`，现在在 `tools/PowerShellTool/UI.js` → `tools/MemoryTool/` 的 UI。证据：这几个函数渲染 Memory 工具的读取结果，用的是 `tools/MemoryTool/memoryWrite.js` 的 `dVr`。
- `chunk-82kqcve8.js#IAt`（`readAgentMemoryScope`），现在在 `services/workflow/scriptFile.js` → agent 记忆相关模块（例如 `memdir/` 或 `tools/AgentTool/`）。证据：它读的是 agent 的记忆范围（`getMemoryScopeDisplay(agentType, memory)`），和工作流脚本文件无关。
- `chunk-18hwfzwa.js#$We`（`registerReplyYieldNotices`），现在在 `utils/newerModelOffer.js` → `tools/ArtifactTool/`（Artifact 回复让出通知）。证据：内容是用 `artifactViewerUrlFor` 和 `repliesYieldedLine` 往转录里追加通知，和新模型提议无关。
- `chunk-nkdv7dw8.js#It`、`#bCs`、`#SCs`、`#wCs`，现在在 `cli/print/mcpControlRequests.js` → `cli/print/sessionControlRequests.js`（或单独的会话标题模块）。证据：这几个是会话标题的生成、撤回和补发逻辑，与 MCP 控制请求无关。
- `chunk-e6aww6q8.js#Tkt`、`#Ekt`、`#wkt`，现在在 `utils/contextAttachments/environment.js` → 系统提示词分段缓存模块。证据：读写的是 `getSystemPromptSectionCache` 和 `systemPromptSection`，与环境信息附件无关。
- 旧名 `CoordinatorTaskPanel` 匹配错了。它被 callgraph 以 0.123 的分数匹配到 `components/CoordinatorAgentStatus.js` 第 1362 行的一个异步函数（`chunk-e6aww6q8.js`），真正的面板是 `chunk-18hwfzwa.js#Xz`，本表命名为 `BackgroundTasksPanel`。
- `components/providerSetup/bedrock/bedrockVerify.js` 里的 `pe`、`Se` 是 Bedrock 向导的步骤组件（被 CreateAgentWizard 导入），不是验证逻辑。`components/ResumeTask.js` 里混有 Bedrock 测试结果的代码。
- `tools/ArtifactTool/actionNames.js`（`chunk-0rj0mpq7.js`）实际内容是解析 MCP 工具结果（已发布 Artifact、评论、删除、共享字段），文件名不贴切。

## 做法与工具（都在 `artifacts/tmp/r8/`）

- `dump.mjs`：按阅读树文件导出待命名声明的源码片段、顶层绑定和 ≥500 字节声明的局部候选，同时生成 `index.json` 和 `files.txt`。
- `plan/*.txt`：手写的命名稿。格式是 `压缩名|chunk#压缩名 新名 置信度`；`.局部名[#k] 新名` 给上一条声明命名局部变量；`? 说明` 给上一条声明写说明；`chunk#名 -` 表示只补说明或局部、不改顶层名。
- `build.mjs`：把命名稿生成 `naming/semantic-r8.jsonl` 和 `naming/docs-r8.jsonl`。生成时检查保留字和全局名、同名跨 chunk 的歧义、是否覆盖已有名字、声明是否在所写的文件里，以及同一文件里的重名。
- `view.sh`、`view2.mjs`、`view3.mjs`：阅读辅助脚本。`stats.mjs` 统计覆盖率，`check.mjs` 用改名引擎校验。
