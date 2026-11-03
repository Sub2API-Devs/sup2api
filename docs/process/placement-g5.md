# 放置记录：组 5（place-g5）

范围：`analysis/segments/placement-work.json` 的 `groups[5].chunks`，共 227 个 chunk。主体是 `chunk-bwbq4xvm.js`（SDK schema、lodash、HTTP/认证小模块），其余多是 2.1.316 的新功能：无头云会话、远程工具、mcp serve、后台 worktree 守卫、Claude Design、Artifact 类型、观察者代理、额度自动续跑等。

## 交付物

| 文件 | 内容 |
| --- | --- |
| `naming/placement-g5.json` | 5,160 个声明全部放置，共 2,410,404 字节，未放置 0 个；目标文件 427 个 |
| `naming/semantic-p5.jsonl` | 3,138 条顶层名。用 `tools/rename/lib/rename.mjs` 逐模块试跑（叠加 `naming/final/top.json` 已有的非 minified 名）：63 个 chunk、3,138 条全部生效，0 冲突、0 拒绝 |
| `naming/docs-p5.jsonl` | 173 条，每条 1–4 行中文 |
| `naming/modules-p5.json` | 427 条：2.1.316 新增 327 个，并入已有模块 100 个 |

命名来源和置信度：

- 可读的 chunk 导出名（`export{x as name}`）和 ESM 命名空间对象 `Ar(ns,{导出名:()=>局部名})`：置信度 0.9。
- SDK schema：根据 zod 结构和字面量 `type/subtype` 自动推出（`SDK…MessageSchema`、`…HookInputSchema` 等，289 条）。
- 其余按代码与字符串人工命名：0.6–0.85。猜测成分大的取 0.6，置信度不足 0.5 的没有写入。

门面原名（facade/reference）都没有改写。

工作脚本在 `artifacts/tmp/p5/`：

- `plan.mjs`、`plan2.mjs`：断点表。
- `gen.mjs`：生成 placement。
- `names/*.txt` 加 `gen-names.mjs`：生成 semantic/docs。
- `modules-desc.txt` 加 `gen-modules.mjs`：生成 modules。
- `dryrun.mjs`：改名试跑。

注意：`export-names.mjs` 重新运行会覆盖 `names/00-export-names.txt` 里手工处理过的一处冲突（`te` 改成了 `seedUserPinEnvDefault`）。

## 新建目录与文件（按主题）

新文件 327 个，含 4,328 个声明、1,660,236 字节。新建目录如下。

### 无头云会话 `cli/headlessCloud/`（13 个文件）

`--cloud` 客户端：

- `HeadlessCloudClient`：出站队列与账本、控制请求中继、启动看门狗。
- `openBareCloudSession`：新建或附加云会话。
- `streamFilter`：下行帧过滤。
- `attachServe`：本机为云会话提供工具。
- `servedTools`、`servedSettings`、`deviceHooks`、`cloudPlugins`、`consent`、`hostPermissions`。
- `cloudPrint`：`--cloud -p`。
- `sessionRecords`、`headlessFeatures`。

### 远程工具 `services/remoteTools/`（14 个文件）

在附加机器上执行工具：

- 机器上下文附件。
- 调用信封解析与账本、进度监视与沉默探测。
- 结果转换、目录同步屏障、重连等待。
- `AwayRecheck`、准入判定、各类错误文案。

### mcp serve `services/mcpServe/`（15 个文件）与 `entrypoints/mcp.ts`

`claude mcp serve` 向远端提供的调用：

- ReadCalls（调用运行记录）、调用认领、容器启动标记。
- 文件读写和放置、目录列表、项目上下文、项目设置、项目代理。
- 钩子、bash 与任务输出、仓库 git 状态。
- MCP JSON-RPC 中继。

### 后台 worktree 守卫 `tools/BashTool/bgWorktreeGuard/`（6 个文件）

后台代理在独立 worktree 里运行 Bash 时，先对命令做 tree-sitter 静态分析：

- 改变目录、写到 worktree 之外、远程执行（ssh/kubectl）、git 全局选项、无法静态求值的展开，都会被拦下或要求确认。
- 文件：`bgWorktreeCommandGuard`、`statementWalk`、`wordValues`、`commandRules`、`commandTables`、`shellState`。

### 设备桥 `services/deviceBridge/`

- 本机 MCP 服务器直通给云会话（`passthroughMcp`）。
- 设备 MCP 同意与"暂不"状态、快照、设备钩子注册表。

### 自托管 runner `services/selfHostedRunner/`

- 出口代理（`runner:egress-proxy`）：注入 Proxy-Authorization，认证值来自 `--proxy-authorization-command` 或 `--proxy-authorization-file`。
- 独立 agent 代理中继。
- 工具名常量。

### Claude Design `tools/DesignTool/`（3 个文件）、`tools/DesignSyncTool/`

- 通过 `api.anthropic.com/v1/design/mcp` 操作 claude.ai/design 的设计系统和项目。
- 错误类型：需同意、需项目授权、作用域不足、401。

### Artifact `services/artifacts/`（12 个文件）

- Artifact 类型目录、按类型新建（`/api/frame/types/{slug}/create`）、类型发布说明。
- frame 中继与发布、addon 工具与动作、读取同意、提示词文本。

### 观察者代理

- `services/agentObserver/`：配对、活动摘要投递、系统提示。
- `tools/ObserverReportTool/`：观察者向被观察代理回报。

### 其他新功能目录

- `services/quotaAutoResume/`：额度重置后自动续跑。另有 `services/usageLimitGrace.ts`。
- `services/feedback/`、`commands/feedback/FeedbackQueue.tsx`：/feedback 反馈队列与反馈包。
- `commands/auto-mode-setup/`、`tasks/AutoModeScanTask.ts`：/auto-mode-setup 后台扫描环境并提出 auto mode 规则。
- `plugins/bundled/diffPane/`（9 个文件）：内置 diff 面板插件。
- `engine/`（6 个文件）：查询引擎 `createQueryEngine`，SDK/print/REPL 共用。
- `utils/env/envRegistry.ts`：带类型 schema 的环境变量注册表。
- `utils/git/`：`gitIndexReader` 直接解析 `.git/index`；`gitLanes` 在自身 worktree 运行 git；`repoCheckouts` 处理多仓库检出。
- `tools/PublishPluginTool/`、`cli/handlers/pluginScaffold.ts`、`utils/plugins/validatePluginContract.ts`：插件发布、脚手架、contract 校验。
- `utils/plugins/` 新文件：`marketplacePolicy`、`localMarketplacePaths`、`pluginDirectoryCatalog`、`syncedItems`、`pluginAttribution`、`marketplaceNames`、`pluginComponentConflicts` 等。
- `services/mcp/` 新文件：`discoveryCache`（加密的 initialize/tools 缓存）、`discoveryIdentity`、`identityChange`、`boundedTransports`、`stepUpAuth`、`listenStream`、`workerWakes`、`serverDiscover`、`claudeaiCachedInit` 等。
- `entrypoints/sdk/uiControlSchemas.ts`：ui_* 控制协议 schema。
- `components/LogoV2/`：多个启动提示，包括模型后继、API 额度链接、本周功能、CE 迁移、全屏 downsell、更新摘要。
- `services/workflows/bundledWorkflows.ts`：deep-research 工作流。
- `tools/stubTools/enableStubTools.ts`：`enable__mcp__…` 占位工具。
- 小命令：`commands/cd`、`commands/fork`、`commands/subtask`、`commands/recap`、`commands/send-to-project`、`commands/cloud-plugins`。
- `vendor/`：
  - `lodash-es`：`toNumber`、`toInteger`、`once`、`uniqBy`。
  - `execa` 片段。
  - `audio-capture`、`clipboard-napi` 原生模块加载入口。

### 31 个 `_new` 门面模块的正式路径

| `_new` 门面模块 | 正式路径 |
| --- | --- |
| `openBareCloudSession` | `cli/headlessCloud/openBareCloudSession.ts` |
| `openBareCloudSession.helpers-fe6r` | `cli/headlessCloud/sessionRecords.ts` |
| `readCalls` | `services/mcpServe/readCalls.ts` |
| `createMCPServer` | `entrypoints/mcp.ts` |
| `AwayRecheck` | `services/remoteTools/AwayRecheck.ts` |
| `isAwayRecheckOnCached` | `services/remoteTools/awayRecheckFlag.ts` |
| `clearForwardToDevice` | `services/remoteTools/dirSync.ts` |
| `listTypeInstances` | `services/artifacts/artifactTypes.ts` |
| `BLOBS_RELAY_FAMILY` | `services/artifacts/frameRelay.ts` |
| `ResumeAgentStateError` | `tools/AgentTool/resumeAgent.ts` |
| `PublishPluginTool` | `tools/PublishPluginTool/PublishPluginTool.ts` |
| `startSyncedFileSyncer` | `services/syncedFiles/syncedFileSyncer.ts` |
| `agentProxyStandaloneRefusal` | `services/selfHostedRunner/agentProxyStandalone.ts` |
| `externalHttp` | `services/http/externalHttp.ts` |
| `buildVertexGoogleAuth` | `services/api/vertexAuth.ts` |
| `recoverHostSessionsBearer` | `utils/hostSessionsBearer.ts` |
| `AutoModeState` | `utils/permissions/autoModeState.ts` |
| `getToolPermissionContext` | `utils/permissions/toolPermissionContext.ts` |
| `INLINE_CODE_FLAGS` | `utils/permissions/permissionReasons.ts` |
| `npmResolutionPolicyRefusal` | `utils/plugins/marketplacePolicy.ts` |
| `isTerminalShutdown` | `utils/terminalShutdown.ts` |
| `splitSystemPromptAtBoundary` | `utils/systemPromptBoundary.ts` |
| `reportGitSessionContext` | `bridge/reportGitSessionContext.ts` |
| `createBridgeSession` | `bridge/createSession.ts`（已有模块） |
| `refreshBootstrapData` 及 `.helpers-mz6f` | `services/api/bootstrap.ts`（已有模块） |
| `UserCrossSessionMessage` | `components/messages/UserCrossSessionMessage.tsx` |
| `RemoteHomeSettingsDialog` | `components/RemoteHomeSettingsDialog.tsx` |
| `AUTO_DEFAULT_NOTICE_BODY` | `components/LogoV2/AutoModeDefaultNotice.tsx` |
| `AppRoot` | `components/AppRoot.tsx` |
| `FocusManager` | `components/design-system/ThemeProvider.tsx` |

`FocusManager` 一行需要说明：这部分声明实际是 `ThemeProvider`、`useTheme` 等，门面名只是模块名，所以放到 `ThemeProvider.tsx`。

## 发现的 2.1.316 新功能（手册素材）

1. **无头云会话（`--cloud`）**
   - 本机 CLI 作为客户端驱动云端会话：新建或附加会话，`-p` 打印模式。
   - 本机可以把工具、MCP 服务器、钩子、插件和设置"提供"给云会话，每项都有同意与关闭原因。
   - 新增 ui_* 控制协议，宿主可以驱动无头界面。
2. **远程工具 / 附加机器**
   - 模型每轮能看到可达的附加机器及其工具，并把调用发到其他机器执行。
   - 调用过程有进度探测、沉默判定、迟到结果处理和重连等待。
3. **`claude mcp serve` 大幅扩展**
   - 向远端提供文件读写、目录列表、项目上下文/设置/代理/钩子、bash 与后台命令、git 状态、MCP 中继。
   - 用 ReadCalls 记录调用并支持停止和迁移。
4. **后台 worktree 守卫**
   - 后台代理的 Bash 命令先做静态分析，防止逃出自己的 worktree。
5. **Claude Design 工具与 DesignSync**
   - 通过 `/v1/design/mcp` 操作 claude.ai/design 项目。
6. **Artifact 类型**
   - 可以按类型新建 Artifact、查看类型目录与发布说明，支持 addon 动作。
7. **观察者代理（Observer）**
   - 给某个代理配一个只读观察者，接收活动摘要，通过 ObserverReport 回报。
8. **额度相关**
   - 额度用尽后自动续跑（quota auto-resume）。
   - 宽限期"收尾"提示（wrap-up）。
   - 统一限额头新增 grace 字段。
   - `/api/oauth/usage` 新参数。
9. **/feedback 反馈队列、/auto-mode-setup 环境扫描、/cd 信任流程**
10. **插件体系**
    - contract 文件校验、脚手架、PublishPlugin 工具。
    - marketplace 策略（阻止名单、npm 解析拒绝）、本地 marketplace 路径安全、插件目录缓存、同步条目。
11. **MCP 客户端**
    - 加密的发现缓存：跳过握手。
    - 传输限长、step-up 重新授权、list_changed 监听流重开、claude.ai 连接器缓存 initialize。
12. **自托管 runner**
    - 出口代理与 Proxy-Authorization 注入。
    - 设备桥 MCP 直通。
13. **其他**
    - 内置 deep-research 工作流、内置 diff 面板插件。
    - 账户记忆脱敏、Remote Control 已读回执、查询引擎重构（`engine/`）。
    - 带类型的环境变量注册表、直接解析 `.git/index`。

## 无法判断或低置信度的部分

- 没有未放置的声明。
- `vendor/execa/index.js`（2 个声明）、`vendor/lodash-es/uniqBy.js` 是按代码形状认定的第三方代码，置信度中等。
- `vendor/audio-capture`、`vendor/clipboard-napi` 只有 21 字节的加载入口。
- 一些只有 1–3 个声明的小文件是按引用方就近命名的，路径置信度约 0.6，例如：
  - `utils/stubs.ts`、`utils/sizeLimits.ts`、`utils/tlsEnv.ts`、`assets/embeddedResource.ts`、`utils/attachStamp.ts`。
  - `components/RemoteCallout.ts`、`cli/handlers/modCommands.ts`、`services/workflows/workflowLaunchExec.ts`。
- 大文件 `entrypoints/sdk/coreSchemas.ts`（325 KB）和 `controlSchemas.ts`（223 KB）在 bwbq 里是连续的整块，没有再细拆。
- 仍有约 2,800 个 minified 顶层声明没有语义名，约 860 KB，主要是：
  - bwbq 里两个大 schema 块。
  - 63f0、ag5x、qmsr、6vnx、w08r 等 chunk 的小工具函数。
  - 一些单字母局部常量。

## 给 lead 的建议

1. **与其他组共用的路径**，合并 modules 说明时请以内容更全的一份为准：
   - 新文件：
     - `services/api/gzipRequestBody.ts`（g1）
     - `services/workflows/bundledWorkflows.ts`（g3）
     - `utils/redactSecrets.ts`（g0）
     - `entrypoints/mcp.ts`（g6）
     - `utils/plugins/marketplaceNames.ts`（g4、g7）
     - `utils/remoteSessionEnv.ts`（g4）
     - `tools/AgentTool/agentLaunch.ts`（g7）
   - 已有模块：`services/claudeAiLimits.ts`、`services/mcp/client.ts`、`utils/cwd.ts`、`history.ts` 等。
2. **远程工具目录可能重名**：g4 把远程工具与 serve 放在 `remote/tools/**`，本组用的是 `services/remoteTools/` 和 `services/mcpServe/`。两者若是同一功能族，建议 lead 统一成一个目录。本组的文件名可以直接平移。
3. **`services/artifacts/` 可直接合并**：g4 也把 `listArtifacts` 拆到了 `services/artifacts/`，两组文件名没有冲突。
4. **SDK schema**：新增的 ui_* 控制协议单独放在 `entrypoints/sdk/uiControlSchemas.ts`，没有并进 `controlSchemas.ts`，方便对照旧版差异。
5. **`utils/env/envRegistry.ts` 与 `utils/envUtils.ts`**：前者是 316 新的带类型注册表，后者只并入了一个旧函数（`getDefaultAwsRegion`），两者没有合并。
