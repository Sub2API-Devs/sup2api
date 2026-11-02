# 扩展子系统手册：MCP、插件、Skills、Hooks、LSP、Chrome / Computer Use、深链接

> 领域 `extensions`（154 个重组模块，约 2,750 个声明，1.49 MB），负责人 dom-extensions。
> 对象：官方 Claude Code **2.1.316**（linux-x64）。一切结论取自 `original/`，2.1.88 对照取自 `references/claude-code-analysis/src`。
> 阅读源码：`build/readable/src/<重组路径>.js`；单个声明 `node tools/q.mjs show <chunk-xxx.js#压缩名>`。下文"声明 id"一律形如 `chunk-xxx.js#压缩名`；Hooks/Skills 两节里只写 `#压缩名` 而没写 chunk 时指 `chunk-e6aww6q8.js`。
> 函数名是命名表合并后的最终名（门面原名 facade > 语义名 semantic > 旧版名 reference > 自动名）。命名见 `naming/semantic-extensions.jsonl`，声明说明见 `naming/docs-extensions.jsonl`，模块一句话说明见 `naming/modules-extensions.json`。

## 0. 概述

扩展子系统把"CLI 本体以外的能力"接进会话。它们最终都变成查询循环看得见的三类东西：**工具**（Tool 对象）、**命令**（斜杠命令 / Skill，`type:"prompt"` 的命令对象）、**附件与钩子**（在固定事件点插入上下文、拦截或改写行为）。

| 部分 | 输入 | 产出给运行时的东西 | 主要模块 |
|---|---|---|---|
| MCP 客户端 | 各作用域的 `mcpServers` 配置、插件、claude.ai 连接器、SDK | `mcp__<服务器>__<工具>` 工具、MCP 提示词命令、资源、MCP skills、elicitation 对话、channel 消息 | `services/mcp/*`、`utils/mcp*` |
| 插件 | marketplace、`enabledPlugins` 设置 | 插件的命令、代理、skills、hooks、输出样式、MCP/LSP 服务器、bin 目录 | `utils/plugins/*`、`services/plugins/*` |
| Skills | `.claude/skills`、旧 `.claude/commands`、插件、bundled、MCP | 命令对象（SkillTool 与 `/name` 调用） | `skills/*`、`utils/markdownConfigLoader.ts`、`utils/frontmatterParser.ts` |
| Hooks | settings 各层 `hooks`、插件 `hooks.json`、skill/agent frontmatter、会话钩子、SDK 回调 | 33 个事件点上的阻断 / 放行 / 追加上下文 / 改写输入输出 | `utils/hooks.ts`、`utils/hooks/*`、`schemas/hooks.ts` |
| LSP | 插件的 `lspServers` | 诊断附件、LSPTool 后端 | `services/lsp/*` |
| Claude in Chrome / Computer Use | 浏览器扩展、托管桌面 | 内置 MCP 服务器（进程内 / 子进程） | `utils/claudeInChrome/*`、`utils/computerUse/*` |
| 深链接 | `claude-cli://` URL | 在终端里打开会话 / 安装插件 | `utils/deepLink/*` |

**在整体中的位置**

- 调用它的：启动流程（插件启动检查、MCP 配置读取、bundled skills 注册、深链接协议注册）；REPL 的 `useManageMCPConnections`（连接生命周期）；查询循环与工具执行（`executeHooks` 系列在 PreToolUse / PostToolUse / Stop 等事件点被调用；MCP 工具经 `callMCPTool` 执行）；命令加载（合并 skills 与插件命令）；附件系统（LSP 诊断、MCP instructions 增量）；`claude mcp …` / `claude plugin …` CLI 子命令。
- 它调用的：settings 读写与配置目录、权限系统（MCP 工具权限规则、hook 的 permissionDecision）、API 客户端（prompt / agent 类型 hook 要发模型请求）、OAuth 与安全存储、第三方库 `@modelcontextprotocol/sdk`（两代）、zod、`vscode-jsonrpc`。

**316 最重要的三个变化**（详见各节与第 10 节）

1. **两代 MCP 客户端并存**，默认 v2；v2 握手**先发 `server/discover`（协议 2026-07-28）**，收到 `-32601` 等再回退到 `initialize` + `notifications/initialized`，并把"对方是旧协议"的判定持久化到 `state/mcp-discover-verdicts.json`。
2. **Hooks 事件从 27 个增到 33 个**，新增 `mcp_tool` 钩子类型与一批返回字段（`defer` 权限决定、`updatedToolOutput`、`reloadSkills` 等）。
3. **插件系统大幅扩展**：manifest 新增 themes / workflows / monitors / binaries 等组件，来源新增 archive / command 与 npm 通道，存储后端 V5，CLI 新增 init / tag / test / eval 等子命令。

### 0.1 关键调用链（时序）

```
启动 ─┬─ performStartupChecks → 市场对账 / 官方市场检查 / 自动更新（后台）
      ├─ initBundledSkills → registerBundledSkill ×N
      ├─ getClaudeCodeMcpConfigs → getAllMcpConfigs（并入插件、claude.ai 连接器）
      └─ ensureDeepLinkProtocolRegistered（后台）
REPL ─── useManageMCPConnections
          └─ getMcpToolsCommandsAndResources
               └─ 每个服务器：禁用/策略/缓存检查 → connectToServer
                    ├─ 建传输（stdio / http / sse / ws / claudeai-proxy / 进程内）
                    ├─ auto 协商：server/discover ──(modern)──────────────────┐
                    │               └─(-32601 等 → legacy) initialize → initialized
                    └─ fetchToolsForClient / fetchCommandsForClient / fetchResourcesForClient
                         └─ buildMcpTool：mcp__srv__tool，默认延迟加载（ToolSearch）
查询 ─── 提交 → UserPromptSubmit 钩子 → 模型 → PreToolUse 钩子 → 工具（MCP：callMCPTool）
          → PostToolUse 钩子 → … → Stop 钩子；LSP 诊断与 MCP instructions 作为附件进下一轮
```

## 1. 模块地图

### 1.1 MCP

| 模块 | 职责 | 关键入口 |
|---|---|---|
| services/mcp/config.ts | 配置读取、解析、合并、去重、策略、add/remove、启用禁用 | `getMcpConfigsByScope`、`parseMcpConfig`、`getClaudeCodeMcpConfigs`、`getAllMcpConfigs`、`isMcpServerAllowedByPolicy`、`isMcpServerBlockedAtConnectTime`、`addMcpConfig`、`removeMcpConfig` |
| services/mcp/client.ts | 连接、协商、工具/提示词/资源、工具调用与结果 | `connectToServer`（v2 在 `_unattributed/chunk-8t8n4kdh/part-007.js`）、`getMcpToolsCommandsAndResources`、`fetchToolsForClient`、`buildMcpTool`、`buildMcpPromptCommands`、`callMCPTool`、`processMCPResult`、`reconnectMcpServerImpl` |
| services/mcp/auth.ts | OAuth（`ClaudeAuthProvider`）、元数据发现、issuer 回显、主流程、XAA 认证、令牌撤销 | `performMCPOAuthFlow`、`performMCPXaaAuth`、`ClaudeAuthProvider`、`fetchAuthServerMetadata` |
| services/mcp/xaa.ts / xaaIdpLogin.ts | 企业 IdP 的 Cross-App Access | `performCrossAppAccess`、`acquireIdpIdToken` |
| services/mcp/oauthPort.ts | 回调端口与 redirect URI | `findAvailablePort`、`buildRedirectUri` |
| services/mcp/claudeai.ts | claude.ai 组织连接器 | `fetchClaudeAIMcpConfigsIfEligible` |
| services/mcp/useManageMCPConnections.ts / MCPConnectionManager.tsx | REPL 连接生命周期 | `useManageMCPConnections`、`MCPConnectionManager` |
| services/mcp/types.ts（+ `_unattributed/chunk-dcmhvw5a/part-012.js`） | 作用域/传输枚举、配置 schema | `ConfigScopeSchema`、`McpServerConfigSchema` 族、`isValidMcpServerConfig` |
| services/mcp/utils.ts | 过期客户端剔除、作用域标签、.mcp.json 审批状态 | `excludeStalePluginClients`、`getProjectMcpServerStatus`、`resolveProjectMcpServerApproval` |
| services/mcp/mcpStringUtils.ts / normalization.ts | 名字构造与解析、权限规则匹配 | `buildMcpToolName`、`mcpInfoFromString`、`normalizeNameForMCP`、`getToolNameForPermissionCheck` |
| services/mcp/elicitationHandler.ts、utils/mcp/* | elicitation 处理与表单校验 | `registerElicitationHandler`、`validateElicitationInputAsync`、`parseNaturalLanguageDateTime` |
| services/mcp/channel*.ts | channel 推送与权限中继 | `gateChannelServer`、`wrapChannelMessage`、`truncateForPreview` |
| services/mcp/headersHelper.ts、envExpansion.ts | 动态请求头、头部变量展开 | `getMcpHeadersFromHelper` |
| services/mcp/InProcessTransport.ts、SdkControlTransport.ts、utils/mcpWebSocketTransport.ts | 传输实现 | `createLinkedTransportPair`、`SdkControlClientTransport`、`WebSocketTransport` |
| services/mcp/vscodeSdkMcp.ts | VS Code 扩展的 SDK MCP 通道 | `setupVscodeSdkMcp` |
| services/mcpServerApproval.tsx | .mcp.json 审批名单 | `collectProjectMcpServerNames` |
| utils/mcpValidation.ts、utils/mcpOutputStorage.ts | 输出大小控制与落盘 | `mcpContentNeedsTruncation`、`truncateMcpContent`、`persistBinaryContent`、`getLargeOutputInstructions` |
| utils/mcpInstructionsDelta.ts | 服务器 instructions 增量附件 | `getMcpInstructionsDelta` |

MCPTool / ListMcpResourcesTool / ReadMcpResourceTool 的工具壳在 tools 领域（`tools/MCPTool` 等）；本领域的 `buildMcpTool` 把每个服务器工具展开成独立的 Tool 对象（基于 MCPTool 原型 `Ize`）。

### 1.2 插件

| 模块 | 职责 |
|---|---|
| `utils/plugins/schemas.ts` | 全部 zod schema：manifest、marketplace.json、插件/市场来源、installed_plugins/known_marketplaces 文件、保留名/防仿冒、git URL 规范化与脱敏 |
| `utils/plugins/pluginLoader.ts` | 加载核心：版本化缓存、各来源下载、manifest 解析、`createPluginFromPath`、`loadAllPlugins`/`loadAllPluginsCacheOnly`、`assemblePluginLoadResult` |
| `utils/plugins/marketplaceManager.ts` | known_marketplaces.json 读写（锁）、市场克隆/下载/缓存、add/remove/refresh、按 ID 查条目 |
| `utils/plugins/marketplaceHelpers.ts` | 托管策略判断（strict/blocked、hostPattern/pathPattern、侧载/command 来源禁用、插件目录可用性）与展示文案 |
| `utils/plugins/installedPluginsManager.ts` | installed_plugins.json V2 读写、迁移、缓存、按当前项目筛选 |
| `services/plugins/pluginOperations.ts` | install/uninstall/enable/disable/update/--replace 的操作核心 |
| `utils/plugins/pluginInstallationHelpers.ts` | `installResolvedPlugin` 安装主流程、依赖闭包、回滚 |
| `services/plugins/pluginCliCommands.ts` | `claude plugin` 子命令实现与错误处理 |
| `utils/plugins/dependencyResolver.ts` | 依赖解析、semver 约束、`verifyAndDemote` |
| `utils/plugins/loadPluginCommands/Agents/OutputStyles/Hooks.ts` | 组件注入 |
| `utils/plugins/mcpPluginIntegration.ts`、`mcpbHandler.ts`、`utils/dxt/*` | 插件 MCP 服务器与 MCPB 包 |
| `utils/plugins/lspPluginIntegration.ts` | 插件 LSP 服务器 |
| `utils/plugins/pluginOptionsStorage.ts` | userConfig 选项存储与变量替换 |
| `utils/plugins/pluginDirectories.ts`、`pluginVersioning.ts`、`cacheUtils.ts`、`zipCache.ts`、`zipCacheAdapters.ts` | 目录布局、版本号、孤儿清理、zip 缓存模式 |
| `utils/plugins/officialMarketplace*.ts` | 官方市场常量、GCS 镜像、启动自动安装 |
| `utils/plugins/reconciler.ts`、`PluginInstallationManager.ts`、`headlessPluginInstall.ts`、`performStartupChecks.tsx` | 声明市场对账与后台安装 |
| `utils/plugins/pluginAutoupdate.ts`、`refresh.ts` | 后台自动更新、/reload-plugins |
| `utils/plugins/pluginBlocklist.ts`、`pluginFlagging.ts` | 下架强制卸载与标记 |
| `utils/plugins/validatePlugin.ts` | `claude plugin validate` |
| `utils/plugins/installCounts.ts`、`hintRecommendation.ts`、`lspRecommendation.ts` | 插件目录（安装数/token 估算）、推荐 |
| `plugins/builtinPlugins.ts` | 内置插件 `<name>@builtin` |

### 1.3 Hooks / Skills / frontmatter

| 模块 | 职责 | 关键入口 |
|---|---|---|
| `schemas/hooks.ts` | 钩子配置 zod schema | `buildHookSchemas`（`chunk-dcmhvw5a.js#D_`）、`HookCommandSchema`/`HookMatcherSchema`/`HooksSchema`（`chunk-dcmhvw5a.js#Zxi` 语句） |
| `types/hooks.ts`（不在本领域，被大量引用） | 钩子 JSON 输出 schema | `syncHookResponseSchema`（`chunk-s61vbvea.js#qD` 语句，`Qfe` = async ∪ sync） |
| `entrypoints/sdk/coreSchemas.ts`（不在本领域） | `HOOK_EVENTS` 事件名数组 | `chunk-dcmhvw5a.js#yc` |
| `utils/hooks.ts` | 钩子执行核心（92 个需文档的声明） | `executeHooks`（`#eIr`）、`executeHooksOutsideREPL`（`#cN`）、`getMatchingHooks`（`#LPn`）、`execCommandHook`（`#MU`）、`processHookJSONOutput`（`#roe`）、各事件 `execute*Hooks` |
| `utils/hooks/execPromptHook.ts` | prompt 型钩子 | `execPromptHook`（`#TAn`） |
| `utils/hooks/execAgentHook.ts` | agent 型钩子 | `execAgentHook`（`#hnt`） |
| `utils/hooks/execHttpHook.ts` | http 型钩子 | `execHttpHook`（`#PJn`）、`interpolateEnvVars`（`#MMr`） |
| `utils/hooks/ssrfGuard.ts` | http 钩子 SSRF 防护 | `ssrfGuardedLookup`（`#qAn`）、`isBlockedAddress`（`#cGt`） |
| `utils/hooks/AsyncHookRegistry.ts` | 后台 async 钩子 | `registerPendingAsyncHook`（`#EUt`）、`checkForAsyncHookResponses`（`#oxo`） |
| `utils/hooks/hookEvents.ts` | SDK 进度/响应事件、时间常量 | `startHookProgressInterval`（`#rhe`）、`TOOL_HOOK_EXECUTION_TIMEOUT_MS`（`chunk-63641kq7.js#Yf`） |
| `utils/hooks/hookHelpers.ts` | prompt/agent 共用 schema | `hookResponseSchema`（`chunk-e6aww6q8.js#Jne` 语句）、`createStructuredOutputTool`（`#pAn`） |
| `utils/hooks/hooksConfigSnapshot.ts` | 启动快照与策略 | `getHooksFromAllowedSources`（`chunk-2jdf5m4m.js#r`）、`shouldAllowManagedHooksOnly`（`#Ate`） |
| `utils/hooks/hooksConfigManager.ts` | /hooks 界面元数据 | `getHookEventMetadata`（`chunk-409rw9nn.js#QHt`） |
| `utils/hooks/hooksSettings.ts` | 显示文本、来源文案、相等判断 | `getHookDisplayText`（`chunk-s61vbvea.js#rx`）、`isHookEqual`（`chunk-f9asxqh1.js#frr`）、`getAllHooks`（`chunk-s61vbvea.js#ZZs`） |
| `utils/hooks/sessionHooks.ts` | 会话钩子注册表 | `SessionHooksRegistry`（`chunk-f9asxqh1.js#ae`） |
| `utils/hooks/registerSkillHooks.ts` / `registerFrontmatterHooks.ts` | skill / agent frontmatter 钩子注册 | `registerSkillHooks`（`chunk-3g0djq3w.js#St`）、`registerFrontmatterHooks`（`chunk-ahpsetyz.js#xBs`） |
| `utils/hooks/fileChangedWatcher.ts` | CwdChanged/FileChanged 监听 | `onCwdChangedForHooks`（`chunk-e6aww6q8.js#csr`） |
| `utils/hooks/postSamplingHooks.ts` | 内部采样后钩子 | `executePostSamplingHooks` |
| `skills/loadSkillsDir.ts` | Skill 发现与加载 | `getSkillDirCommands`（`#VRr`）、`loadSkillsFromSkillsDir`（`#yN`）、`parseSkillFrontmatterFields`（`#_Ce`）、`discoverSkillDirsForPaths`（`#Zzo`）、`activateConditionalSkillsForPaths`（`#evn`） |
| `_unattributed/chunk-e6aww6q8/part-424.js` | （应归 loadSkillsDir.ts）命令对象构造 | `createSkillCommand`（`#phn`）、`parseSkillFileToCommand`（`#QKr`） |
| `skills/bundledSkills.ts` / `skills/bundled/*` | 内置 skill | `registerBundledSkill`（`chunk-yjaa68dq.js#ol`）、`initBundledSkills`（`chunk-hantmvxa.js#ALe`） |
| `utils/skills/skillChangeDetector.ts` | skill 热重载 | `getWatchablePaths`（`chunk-2njac0sx.js#me`）、`createSkillChangeDetector`（`#Re`，unattributed） |
| `utils/frontmatterParser.ts` | YAML frontmatter | `parseFrontmatter`（`chunk-82kqcve8.js#sd`） |
| `utils/markdownConfigLoader.ts` | 配置子目录 markdown 加载 | `loadMarkdownFilesForSubdir`（`#jEo`）、`loadMarkdownFiles`（`#B0`） |
| `outputStyles/loadOutputStylesDir.ts` | 输出风格加载 | `getOutputStyleDirStyles`（`#VEo`） |

### 1.4 LSP / Claude in Chrome / Computer Use / 深链接

| 模块 | 职责 | 关键声明 |
|---|---|---|
| `services/lsp/config.ts` | 从已启用插件收集 LSP 服务器配置 | `getAllLspServers` (`chunk-e6aww6q8.js#r2n`) |
| `services/lsp/LSPClient.ts` | 子进程 + vscode-jsonrpc 连接 | `createLSPClient` (`chunk-t4ksmxzx.js#Pa`)、`LSPServerCrashError` (`#Bn`) |
| `services/lsp/LSPServerInstance.ts` | 单服务器状态机、initialize、重试 | `createLSPServerInstance` (`chunk-e6aww6q8.js#a2n`) |
| `services/lsp/LSPServerManager.ts` | 多服务器路由、文档同步 | `createLSPServerManager` (`#l2n`) |
| `services/lsp/manager.ts` | 全局单例的生命周期 | `createLspManagerSingleton` (`#bTs`)，单例 `lspManagerSingleton` (`#_F`，unattributed) |
| `services/lsp/passiveFeedback.ts` | publishDiagnostics → 登记表 | `registerLSPNotificationHandlers` (`#d2n`)、`formatDiagnosticsForAttachment` (`#kTs`) |
| `services/lsp/LSPDiagnosticRegistry.ts` | 诊断去重、截断、跨轮记忆 | 类 `LSPDiagnosticRegistry` (`#gDt`)、`lspDiagnosticRegistryByRoot` (`#jG`) |
| `utils/claudeInChrome/common.ts` | 名字常量、浏览器表、socket 路径、打开 URL | `CHROMIUM_BROWSERS`/`openInChrome`/`getSecureSocketPath` (`chunk-axj4swpp.js`)、`CLAUDE_IN_CHROME_MCP_SERVER_NAME` (`chunk-srrcw01s.js#Ma`) |
| `utils/claudeInChrome/setup.ts` | 启用判定、接入、原生宿主清单 | `shouldEnableClaudeInChrome` (`chunk-s61vbvea.js#Ivt`)、`setupClaudeInChrome` (`#Ynt`)、`installChromeNativeHostManifest` (`#FH`) |
| `utils/claudeInChrome/setupPortable.ts` | 扫描浏览器配置目录找扩展 | `detectExtensionInstallationPortable` (`#DH`) |
| `utils/claudeInChrome/chromeNativeHost.ts` | `--chrome-native-host` 进程 | `ChromeNativeHost` (`chunk-ncz9bgnh.js#S`)、`ChromeMessageReader` (`#R`) |
| `utils/claudeInChrome/mcpServer.ts` | `--claude-in-chrome-mcp` 进程 | `runClaudeInChromeMcpServer` (`chunk-ztt2k9pv.js#Xe`)、`createChromeContext` (`#j`) |
| `utils/claudeInChrome/toolRendering.tsx` | 终端里的工具显示 | `renderChromeToolUseMessage` (`chunk-3k33hyyp.js#c`)、`getClaudeInChromeMCPToolOverrides` (`#d`) |
| `utils/computerUse/*` | computer-use 的会话状态、run loop、ESC、执行器辅助、回合清理 | `cleanupComputerUseAfterTurn` (`chunk-ha3km179.js#en`)、`drainRunLoop` (`#zJe`)、`typeViaClipboard` (`chunk-hrs3dad1.js#Q`) |
| `utils/deepLink/parseDeepLink.ts` | 解析 `claude-cli://` | `parseDeepLink` (`chunk-8gzm4s8j.js#lDs`) |
| `utils/deepLink/protocolHandler.ts` | `--handle-uri` 处理 | `handleDeepLinkUri` (`chunk-bh9w80kx.js#ae`) |
| `utils/deepLink/registerProtocol.ts` | 各平台协议注册 | `ensureDeepLinkProtocolRegistered` (`chunk-fb29jded.js#lCs`) |
| `utils/deepLink/terminalLauncher.ts` | 终端检测与启动 | `launchInTerminal` (`chunk-bh9w80kx.js#y`) |
| `utils/deepLink/banner.ts` | 深链接会话横幅 | `buildDeepLinkBanner` (`chunk-47mye09a.js#CRs`) |

`utils/computerUse/{appNames,computerUseLock,gates,mcpServer,wrapper}.ts` 在 316 里几乎全是误归的代码（见第 7 节）。

## 2. MCP 客户端

### 2.0 两代客户端

- `chunk-asne9cp8.js`（未归属，一个很小的分发模块）导出 `mcpClientModule()` 等访问器：`rD()`（`chunk-5br6r47d.js#rD`）决定"MCP SDK 代际"，然后 `require` 对应代际的整套模块：
  - **v2**：`chunk-8t8n4kdh.js`（客户端）、`chunk-n1aavqzh.js`（auth/xaa）、`chunk-qy28ss7z.js`（XAA IdP 登录）、`chunk-n8fn2df7.js`（elicitation）、`chunk-mzh22y2k.js`（任务监视）…；底层 SDK 是 `chunk-r1g76qsy.js` 的新版 `Client`（`cLo`），支持 `server/discover`、`subscriptions/listen`、协议版本 `2026-07-28`。
  - **v1**：`chunk-z1n5m6nf.js`、`chunk-1kaj6e83.js`、`chunk-8y02x996.js`、`chunk-bma111ke.js`…；底层 SDK 是旧版 `Client`（`chunk-z1n5m6nf.js#Bt`），只有 `initialize` 握手（最高 `2025-11-25`，`chunk-dg4taswx.js#LPe`）。
- 选择规则（`rD`）：`MCP_SDK_GENERATION=v1|v2` 优先；否则 GrowthBook `tengu_brindle_causeway`（默认 `true` → **v2**）；结果锁存并记 `tengu_mcp_sdk_generation`。加载后用 `MCP_TREE_ID` 自检（不符抛 tripwire）。
- 因此 `services/mcp/client.ts`、`auth.ts`、`xaa.ts`、`xaaIdpLogin.ts`、`elicitationHandler.ts` 在阅读树中都有两份几乎相同的代码；文档里"（v1 副本）"指旧代。**线上默认路径是 v2**，下面流程以 v2 为准。

### 2.1 配置来源与作用域

作用域枚举 `ConfigScopeSchema`（`chunk-dcmhvw5a.js#VIn`）：`local / user / project / dynamic / enterprise / claudeai / managed / agent`（2.1.88 没有 `agent`）。`enterprise`、`managed` 是"管理员作用域"（`isManagedConfigScope`）。

| 作用域 | 来源 | 读取函数 |
|---|---|---|
| user | `~/.claude.json` 的 `mcpServers` | `getMcpConfigsByScope("user")` |
| local | `~/.claude.json` 中当前项目的 `projects[<path>].mcpServers` | `getMcpConfigsByScope("local")` |
| project | 从项目根（或 `--project-config-root`）到 cwd 每一级目录的 `.mcp.json`，浅层先、深层覆盖；每项记 `declaredIn` | `getMcpConfigsByScope("project")` → `parseMcpConfigFromFilePath`（普通文件、≤2 MiB） |
| enterprise | `<managed 目录>/managed-mcp.json`；**存在即独占**（`doesEnterpriseMcpConfigExist`），解析失败也独占 | `doesEnterpriseMcpConfigExist`、`EnterpriseMcpConfigState` |
| managed | 设置 `policySettings.managedMcpServers`（只允许 https 的 http/sse，禁止 command/args/env/headersHelper 与 `${VAR}`，`ManagedMcpServerSchema`）；Claude Desktop 锁定会话时不读 | `getPolicyManagedMcpServers`、`parseManagedMcpServers` |
| dynamic | `--mcp-config` 文件/JSON、SDK `mcpServers`、Remote Control carrier | `parseMcpConfig({scope:"dynamic"})`；企业配置存在时 `gateDynamicMcpConfigForEnterpriseMcpConfig` 拒绝或丢弃 |
| plugin | 已启用插件的 `.mcp.json`/manifest（scope 为 dynamic 等，`pluginSource` 标记，名字 `plugin:<插件>:<服务器>`） | `getPluginMcpServers`（plugins 部分） |
| claudeai | claude.ai 组织连接器（`claudeai-proxy` 类型，名字 `claude.ai <显示名>`） | `fetchClaudeAIMcpConfigsIfEligible` |
| agent | 代理 frontmatter 的 `mcpServers` 内联定义 | `extractAgentMcpServers` |

服务器类型（`McpServerConfigSchema`，`chunk-dcmhvw5a.js#Hne`）：`stdio`（缺省）、`sse`、`sse-ide`、`ws-ide`、`http`（接受 `streamable-http` 并转成 http）、`ws`、`sdk`、`claudeai-proxy`。`sdk/sse-ide/ws-ide` 只能由宿主注册（`isHostOnlyTransport`），`claudeai-proxy` 只能来自 claude.ai 或 dynamic。
共有字段：`timeout`、`alwaysLoad`、`role`（"comms"）；stdio 另有 `command/args/env/bareElicitationCapability`；http/sse 另有 `headers/headersHelper/oauth{clientId,callbackPort,authServerMetadataUrl,scopes,xaa}/request_timeout_ms（折成 timeout，上限 300000）/tools[{name,permission_policy}]/discoveryCache/toolPermissions{tool: allow|ask|blocked}`；claudeai-proxy 另有 `id/displayName/iconUrl/stateless/cachedInitResponse/discoverSupport(supported|legacy|unknown)/cachedDiscoverResponse/eligible/ineligibleReason/enterpriseManaged`。

#### 解析（`parseMcpConfig`，`chunk-e6aww6q8.js#rVe`）
1. 顶层必须是 `{mcpServers}`；写成 `servers` 给专门提示。
2. 保留名（`isReservedServerName`、`Sge`：Object.prototype 名、`claude-code-remote`、`webagent`、Slack 等内部服务器名）直接跳过。
3. 未知 type、非 dynamic 的 sdk/claudeai-proxy 报错跳过；有 url 无 type 给"加 type"提示。
4. 展开 `${VAR}`（`expandServerConfigEnvVars`；企业作用域在受控环境下展开），缺失变量与"url 展开为空"变成警告/`configError`；首尾空白给警告。
5. 返回 `{config, errors, asWrittenEntries}`，错误带 `mcpErrorMetadata{scope, serverName, severity, skipReason}`。

#### 合并（`getClaudeCodeMcpConfigs` → `getAllMcpConfigs`）
1. 安全模式 `mcpAutoDiscovered` 下全空。
2. 企业配置存在：只取 enterprise + managed，经策略过滤，结束。
3. `isRestrictedToPluginOnly("mcp")`：user/project/local 置空。
4. 并发加载插件服务器；需要审批的插件服务器按 `.mcp.json` 审批状态过滤。
5. project 服务器：`approved` 才进；pending/rejected 仅在调用方要求时带上（审批对话框用）。每会话一次记录 `tengu_mcp_project_servers_approved`。
6. 合并顺序 `user < project(已批准) < local < managed < dynamic`；`isMcpServerDisabled`、策略 `isMcpServerAllowedByPolicy` 再过滤。
7. 插件服务器与手工配置按签名去重（`dedupPluginMcpServers`，`getMcpServerSignature`：stdio=命令数组[+env]，远程=规范化 URL），被压制者生成 `mcp-server-suppressed-duplicate` 警告。
8. `getAllMcpConfigs` 再并入 claude.ai 连接器（策略过滤 + 与手工配置签名去重 `dedupClaudeAiMcpServers`）。

#### .mcp.json 审批
- `getProjectMcpServerStatus`：`disabledMcpjsonServers` → rejected；工作区已信任时看 `enabledMcpjsonServers` / `enableAllProjectMcpServers`；未信任时看各设置源与工作区审批记录（`isProjectMcpServerApprovedInSettings`）。
- `resolveProjectMcpServerApproval`：pending 时，bypass 权限模式（且允许）或**非交互会话**（且 projectSettings 源启用）自动批准，返回 `{status, by: settings|bypass|non_interactive}`。
- `collectProjectMcpServerNames`（services/mcpServerApproval.tsx）收集名单供启动对话框；316 中这个模块只剩收集逻辑（对话框本身在 UI 领域）。

#### 组织策略
- `deniedMcpServers` / `allowedMcpServers`（设置项，含管理员层合并；`allowManagedMcpServersOnly` 时只看管理员层，`getMcpAllowlistPolicy`）。条目三种：`{serverName}`、`{serverCommand:[...]}`、`{serverUrl:"https://*.example.com/*"}`。
- 316 新增：策略条目里的 `${VAR}` 会展开（`expandPolicyCommandPart`、`expandPolicyUrlPattern`），并检测"不安全展开"（值注入通配、改变 URL 结构、点段）——白名单失败关闭、黑名单不受影响；凭证类变量按空值匹配并告警。
- 连接时再判一次 `isMcpServerBlockedAtConnectTime`（`chunk-e6aww6q8.js#Pw`）：浏览器扩展开关 `allow_claude_browser_extension`、HIPAA、桌面入口、保留地址、账号记忆路由、claude.ai 代理 admit/hold/refuse、dynamic/agent/claudeai 作用域的策略。

### 2.2 连接与握手（v2 `connectToServer`，`chunk-8t8n4kdh.js#Wt`）

调用链：`useManageMCPConnections` → `getMcpToolsCommandsAndResources`（`chunk-8t8n4kdh.js#zd`）→ 对每个服务器：禁用 → 策略 → needs-auth 缓存（`isMcpAuthCached`）→ 插件 stdio 失败缓存 → 发现缓存（`mcp-discovery-cache`，fresh/stale 直接出结果，stale 后台刷新）→ `connectToServer` → `fetchToolsForClient`/`fetchCommandsForClient`/`fetchResourcesForClient`。并发：本地（stdio/sdk）`MCP_SERVER_CONNECTION_BATCH_SIZE` 默认 3，远程 `MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE` 默认 20（`processBatched`）。

`connectToServer(name, serverRef, serverStats, storageV5, credentials, dialOptions, connectOptions)`，按 name+config 记忆化：
1. 配置检查：`configError` 或 URL 非法 → `failed`（`INVALID_CONFIG` / `UNCONFIGURED`）。
2. 建传输：
   - `sse`：SDK SSE 传输（`dYn`），`ClaudeAuthProvider` 或首方登录/自定义头。
   - `http`：Streamable HTTP（`Bdn`），fetch 链：`wrapFetchWithTimeout`（非 GET 超时、`Accept: application/json, text/event-stream`）→ OAuth 挑战侦测 → 一方登录 → CCR 会话认证 → CLI 自有 bearer → **`wrapFetchDetectDiscoverMethodNotFound`**（仅可记判定的服务器）→ `wrapFetchWithHandshakeTrace`；POST 不是 405 但 GET 401 时不再做 HTTP+SSE 回退。
   - `claudeai-proxy`：URL = `MCP_PROXY_URL + MCP_PROXY_PATH(server_id)`，`createClaudeAiProxyFetch`（OAuth 访问令牌、401 刷新重试）、请求头 `X-Mcp-Client-Session-Id`；连接器或 stateless 时 GET 通知流本地回 405（`answerGetStreamLocally`，开关 `tengu_serene_teapot`）。
   - `ws` / `ws-ide`：`WebSocketTransport`（Bun WebSocket，子协议 `mcp`，ws-ide 带 `X-Claude-Code-Ide-Authorization`）。
   - `sse-ide`：SSE 无认证。
   - Claude in Chrome（stdio 名为 chrome 且允许）：进程内服务器 + `createLinkedTransportPair`。
   - `stdio`：`StdioClientTransport` 子类（`Ht`，stdout 缓冲上限 16 MiB），环境注入 `CLAUDE_PROJECT_DIR`、`CLAUDE_CODE_SESSION_ID`、`CLAUDECODE=1`，可走 `CLAUDE_CODE_SHELL_PREFIX`。
   - `sdk` 不在这里处理（print.ts / SDK 控制通道，`SdkControlClientTransport`）。
3. **版本协商模式**（`resolveVersionNegotiation`，`chunk-8t8n4kdh.js#wr`）：
   - `MCP_PROTOCOL_NEGOTIATION=legacy|auto` 优先（auto 只对 http/claudeai-proxy/ccr-proxy/stdio 生效）；
   - 否则按传输：http → `tengu_mcp_protocol_negotiation_http`，claudeai-proxy → `_claudeai`，stdio → `_stdio`，ccr-proxy → `_ccr`（都默认 true = auto）；sse/ws/ide/进程内/sdk 一律 legacy；
   - 主机命中 `tengu_mcp_negotiation_server_denylist` → legacy；
   - auto 的探测超时：远程 5000 ms、stdio 3000 ms（均不超过 `MCP_TIMEOUT`（默认 30000）的 1/3）。
4. **先验（prior）**：auto 模式下若有先验就跳过线上 `server/discover`：
   - `getListingDiscoverPrior`：claudeai-proxy（非 stateless）由 `/v1/mcp_servers` 返回的 `discover_support` / `cached_discover_response` 投影（开关 `tengu_mcp_discover_projection_prior` = off/legacy_only/all）；
   - `getRememberedLegacyPrior`：本机持久化的"legacy peer"判定（见下）。
   有先验时 `client.connect(transport, {prior})`；modern 先验连上后再发 `subscriptions/listen`（`tengu_mcp_listen_server_denylist` 可关）。
5. **线上握手（无先验的 auto）**：SDK `Client.connect` → `_connectNegotiated` → `$c`（`chunk-r1g76qsy.js`）：
   - 先发 `{"jsonrpc":"2.0","method":"server/discover","params":{"_meta":{protocolVersion:"2026-07-28", clientInfo, clientCapabilities}}}`；
   - 结果分类（`oh`/`sh`/`zc`）：返回 DiscoverResult 且 `supportedVersions` 含 2026-07-28 → **modern**（不发 initialize，能力取自 discover 结果）；JSON-RPC `-32601`（方法不存在）、`-32001/-32020/-32021`、id 不匹配、格式错误、流结束、HTTP 错误体不是 JSON-RPC → **legacy**；`-32022` 带支持版本 → 纠正后重试一次；stdio 关闭/超时 → legacy（stdio 用一次性"兄弟进程"探测，不污染真实进程）；远程超时/网络错 → 错误。
   - legacy → 立即在同一连接发标准 `initialize`（协议版本取 ≤2025 的最高版）+ `notifications/initialized`；若 initialize 被拒且之前探测超时，再试一次 `server/discover`（`_discoverAfterRejectedInitialize`）。
   - 所以 316 线上实测顺序是 **`server/discover` → （-32601 等）→ `initialize` → `notifications/initialized`**。
6. **legacy 判定持久化**（"remembered discover verdicts"）：
   - 文件 `<CLAUDE 配置目录>/state/mcp-discover-verdicts.json`（v5 存储时为 state 键 `mcp-discover-verdicts`），只读普通文件、≤256 KiB，写入原子、0600（`readDiscoverVerdicts`/`writeDiscoverVerdicts`/`updateDiscoverVerdicts`）；读失败只记日志，等同"没有记录，照常探测"。
   - 键 `getDiscoverVerdictKey`：stdio = `stdio:` + hash(command,args,排序 env,项目根)；CCR toolbox http URL = `ccr:` + hash(server_id, mcp_url)；claudeai-proxy = 连接器 id；其他服务器不记。
   - 值 `{observedAt, modernProtocolVersion}`；有效期远程 1 天、stdio 7 天，且只认记录时的 modern 版本等于当前 `2026-07-28`。开关：`tengu_dreamy_sundae`（总开关）、`tengu_gentle_brooks`（CCR 键）。
   - 写入时机：线上探测（`discoverSource="wire"`）后协商为 legacy，且 POST `server/discover` 的响应是 -32601（`wrapFetchDetectDiscoverMethodNotFound` 置位）或 stdio 探测超时 → `rememberLegacyPeer`；stdio 迟到地回答了探测 → 不记或撤销（`answeredProbeLate`）。
   - 删除时机：线上协商为 modern、基于判定的连接被拒、tools/list 超时或被拒 → `forgetDiscoverVerdict`。
7. **stateless claude.ai 连接器**（`isStatelessClaudeAiProxy`：`stateless=true` 且 `tengu_mcp_stateless_skip_init` 默认开）：`answerHandshakeLocally` 包装 transport.send，本地应答 `server/discover`（legacy → -32601；supported + 开关 all → `cached_discover_response`）与 `initialize`（`cached_init_response`，协议版本须受支持），吞掉 `notifications/initialized`；GET 流本地 405。这时 `discoverSource="stateless_local"`。
8. 成功后：注册 `roots/list`（`getMcpRoots`：项目根、额外目录、可选 staging 根）、初始化期间的 `elicitation/create` 一律 cancel（之后由 `registerElicitationHandler` 接管）、IDE 连接发 `ide_connected`、onerror/onclose 计数与清理、`liveClients` 登记、`roots/list_changed`；记录 `tengu_mcp_server_connection_succeeded`（含 `discoverSource`、`protocolEra`、`negotiatedProtocolVersion`、`probeFellBack`、握手耗时 `discoverRequestMs/initializeRequestMs`、`statelessGated`、`keepAliveDisabled`）。
9. 失败分类：`handleRemoteConnectAuthError`（配置的 Authorization 头被拒 `AUTH_HEADER_REJECTED`、headersHelper 头被拒、CLI 自有令牌、一方登录 `FIRST_PARTY_AUTH_REJECTED`、否则 OAuth 刷新或 `needs-auth`）、`CLAUDEAI_BEARER_REJECTED`、超时 `CONNECT_TIMEOUT`（`tengu_mcp_connect_timeout_retry`）、HTTP→SSE 回退（`tengu_mcp_legacy_sse_fallback`）；记录 `tengu_mcp_server_connection_failed`。

v1 `connectToServer`（`chunk-z1n5m6nf.js#Xe`）结构相同，但没有协商与 discover 判定，只在 stateless 代理的本地应答里出现 `server/discover`（`answerHandshakeLocally` v1 副本 `chunk-z1n5m6nf.js#No`）。

#### 连接对象状态
`type`：`connected`、`failed`（`error`、`errorCode`、可选 `displayDetail`/`proxyConnectStatus`）、`needs-auth`、`pending`（`reconnectAttempt`、`maxReconnectAttempts`）、`disabled`、`cached`（来自发现缓存，未连线；2.1.88 无）。connected 对象含 `client`、`capabilities`、`serverInfo`、`instructions`、`config`、`cleanup`、`protocolEra`、`transportErrorState` 等。

#### 重连
- `useManageMCPConnections`：远程传输 onclose → 自动重连最多 5 次，退避 1 s 起、上限 30 s（`chunk-dg4taswx.js` 常量 `eae=5`、`cCt`）；首次连接瞬时错误重试 3 次；失败后通知 "open /mcp to reconnect"。stdio/sdk 不自动重连。
- `reconnectMcpServerImpl`：清缓存 → `connectToServer` → 拉列表；needs-auth 时清缓存再试一次；账号变化返回 `IDENTITY_CHANGED`。

### 2.3 工具 / 提示词 / 资源映射

- 工具名：`buildMcpToolName(server, tool)` = `mcp__<normalizeNameForMCP(server)>__<normalizeNameForMCP(tool)>`；规范化把非 `[a-zA-Z0-9_-]` 换成 `_`，`claude.ai ` 前缀的再折叠下划线。`CLAUDE_AGENT_SDK_MCP_NO_PREFIX` 让 SDK 服务器不加前缀。解析 `mcpInfoFromString`（工具名部分可含 `__`）。
- `buildMcpTool`（`chunk-8t8n4kdh.js#Ys`）字段：
  - `mcpInfo{serverName, scope, pluginSource, serverType, toolName, title, displayName, serverId, iconUrl, role, effectiveMaxPermission, …}`、`isMcp: true`；
  - 描述：配置覆盖 > 工具 description，按 `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH`（默认 4096；经 ToolSearch 加载时 16384）截断加 `… [truncated]`（2.1.88 固定 2048）；
  - 注解：`readOnlyHint` → `isReadOnly`/`isConcurrencySafe`、`destructiveHint` → `isDestructive`、`openWorldHint` → `isOpenWorld`、`title` → 显示名；
  - `_meta`：`anthropic/maxResultSizeChars`（结果上限）、`anthropic/searchHint`、`anthropic/alwaysLoad`、`anthropic/requiresUserInteraction`（强制每次询问）；
  - `alwaysLoad`：服务器配置 `alwaysLoad` 或工具 `_meta`；
  - `checkPermissions`：默认 `passthrough`，建议写入 `localSettings` 的 allow 规则 `mcp__server__tool`；
  - `userFacingName`：`<server> - <title或name> (MCP)`；`inputJSONSchema` 来自工具 inputSchema（可合并配置的参数描述，规范化组合子 `tengu_mcp_normalize_root_combinators`、丢弃无效 schema `tengu_mcp_drop_invalid_tool_schemas`）。
- 工具策略：http/sse/sdk 配置的 `tools[].permission_policy`（always_allow/ask/deny）→ `collectServerToolPolicies` → 权限上下文的 `mcpServerPolicy` 规则源（`applyDynamicServerToolPolicies`）；claude.ai 连接器的 `toolPermissions{tool: allow|ask|blocked}` 在 `buildMcpToolsForClient` 中生效。
- 提示词：`fetchCommandsForClient` → `buildMcpPromptCommands`：每个 prompt 变成 `type:"prompt"` 命令 `mcp__<server>__<prompt>`（显示 `server:prompt (MCP)`），参数按空格位置传入，检查必填，`getPrompt` 后经 `transformResultContent` 转换。
- 资源：`fetchResourcesForClient`（resources/list）与 `fetchResourceTemplatesForClient`（resources/templates/list），有资源的服务器会额外带上 ListMcpResources/ReadMcpResource 工具（`uF, fF, H5`）；`completeResourceTemplateArgument` 调用 `completion/complete`。
- 列表拉取：legacy 用 `listAllPages`（`nextCursor` 翻页，防重复游标与页数上限，记录 `tengu_mcp_list_paginated`）；modern 用 SDK `listTools` 聚合（结果缺 `resultType/ttlMs/cacheScope` 时 `installModernResultBackfill` 补默认值）。list_changed 通知触发刷新（`tengu_mcp_list_changed`）。
- **延迟加载**：`isDeferredTool`（`chunk-3h9nvmn3.js#T`）对所有 `isMcp` 工具返回 true；`alwaysLoad===true` 的不延迟（`chunk-3h9nvmn3.js#Nqe`）。即默认 MCP 工具只以名字出现，由 ToolSearch 按需加载完整 schema（ToolSearch 模式由 `ENABLE_TOOL_SEARCH` 控制，见 tools 领域）。经 ToolSearch 加载的工具用更长的描述上限。
- **工具调用**（`callMCPTool`，v1 `chunk-z1n5m6nf.js#xt`）：`tools/call`，总超时 `getMcpToolTimeoutMs`（配置 timeout ≥1000 > `MCP_TOOL_TIMEOUT` > 默认 1e8 ms ≈ 27.8 小时）与空闲超时 `getMcpToolIdleTimeoutMs`（`CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT`，默认 stdio 30 分钟、远程 5 分钟，sse-ide/ws-ide/sdk 不设；进度通知会重置）；401/会话过期时刷新凭证或重连后重试一次；insufficient_scope 走 step-up（`runStepUpReauth`，开关 `tengu_mcp_step_up_auth_dialog`）；URL elicitation required 错误由 `callMCPToolWithUrlElicitationRetry` 处理后重试。
- 结果：`processMCPResult` → `transformMCPResult`（toolResult / structuredContent / contentArray）→ `transformResultContent`（text、image 压缩、audio、resource 文本或 blob 落盘、resource_link）。超过 MCP 输出上限（`getMaxMcpOutputTokens`：`MAX_MCP_OUTPUT_TOKENS` > GrowthBook `tengu_velvet_ibis.mcp_tool` > 25000；判定 `mcpContentNeedsTruncation` 粗估 ≤0.5× 不截、>4× 必截、中间用 API 计数）时：`ENABLE_MCP_LARGE_OUTPUT_FILES` 未关且不含图片 → 全文写入 tool-results 文件，返回 `getLargeOutputInstructions` 说明（按 JSON / 长行 / 多行给 jq、python 切片或 Read offset/limit 读法，建议用子代理完整读取）；否则截断（`truncateMcpContent`，图片按 1600 token 估算并尝试压缩）。二进制内容 `persistBinaryContent` 按 MIME 扩展名落盘。

### 2.4 OAuth

- 令牌存储：安全存储（钥匙串/凭证文件）`mcpOAuth[getServerKey(name, config)]`，键 = `<name>|sha256({type,url,headers}) 前 16 位`（`chunk-cyj440je.js#zi`）；client secret 在 `mcpOAuthClientConfig[key]`；XAA IdP 令牌在 `mcpXaaIdp[issuerKey]`、IdP client secret 在 `mcpXaaIdpConfig[issuerKey]`。
- `ClaudeAuthProvider`（v2 `chunk-n1aavqzh.js#vdn`）：`clientMetadata`（client_name `Claude Code (<server>)`、grant_types authorization_code+refresh_token、token_endpoint_auth_method none、scope 取元数据）；`clientMetadataUrl`（CIMD，默认 `https://claude.ai/oauth/claude-code-client-metadata`，`MCP_OAUTH_CLIENT_METADATA_URL` 可改；redirect 不是本机 /callback 时退回 DCR）；`tokens()`（XAA 静默换令牌、step-up 时不发 refresh token、本会话被拒的令牌不再发）；`refreshAuthorization`（并发刷新协调）；`saveDiscoveryState` 等。
- 主流程 `performMCPOAuthFlow`：XAA 分支 → 否则选端口（配置 `oauth.callbackPort` > 已注册端口 > `findAvailablePort`：`MCP_OAUTH_CALLBACK_PORT` > 随机（Windows 39152–49151，其他 49152–65535，最多 100 次）> 3118）→ 清旧令牌（保留客户端注册）→ 在 127.0.0.1 起回调服务器（只处理 /callback）→ SDK `auth()` 发现元数据（`fetchAuthServerMetadata`：配置的 `authServerMetadataUrl` 必须 https）、注册、PKCE、打开浏览器 → 回调换令牌；v2 回调校验 `iss`（RFC 9207，`evaluateIssuerEchoPolicy`，`tengu_mcp_issuer_strict_echo` 决定 enforce/observe）。遥测 `tengu_mcp_oauth_flow_start/success/error/failure`、`tengu_mcp_oauth_refresh_*`。
- needs-auth 缓存：`<配置目录>/mcp-needs-auth-cache.json`（或 v5 存储），条目 `{timestamp, id?, ttlMs?}`；TTL 15 分钟 / 4 小时（claude.ai 代理、插件远程）/ 90 秒（有 refresh token）。命中时直接显示 needs-auth 不连线。
- 一方服务器（Anthropic 域名 `/v1/design/`、`/v1/claude/test/` 等，`isFirstPartyMcpUrl`）用 claude.ai 登录令牌（`wrapFetchWithFirstPartyAuth`）；Design 连接器还有 plan_token 与同意（needs_consent）门控。
- XAA（`CLAUDE_CODE_ENABLE_XAA=1`，设置 `xaaIdp`，服务器 `oauth.xaa: true`）：`acquireIdpIdToken`（OIDC 发现 + PKCE，scope openid，id_token 缓存）→ `performCrossAppAccess`（PRM 发现 → 授权服务器须支持 jwt-bearer → RFC 8693 换 ID-JAG → RFC 7523 换 access_token，授权服务器可被固定）。

### 2.5 Elicitation

- `registerElicitationHandler`：`elicitation/create` 请求 → 控制器（`TBt`）：先 `runElicitationHooks`（Elicitation hook 可直接给出 action/content 或阻断为 decline）→ 无结果时经 `requestDialog` 弹表单/URL 对话框 → `runElicitationResultHooks`（可改写或阻断）→ 回复；`notifications/elicitation/complete` 通知标记 URL 模式完成。
- 表单字段：`getZodSchema` 把原始 schema（string+format email/uri/date/date-time、number/integer 范围、boolean、enum/oneOf 单选、array+items 多选）转 zod；`validateElicitationInputAsync` 对日期字段支持自然语言（`parseNaturalLanguageDateTime`，用小模型，`querySource: mcp_datetime_parse`）。
- 客户端能力：elicitation 声明 form 与 url；Java MCP SDK ≤0.17.0 不认 url 能力时提示设置 `bareElicitationCapability: true`（`chunk-8t8n4kdh.js#qn`）。GrowthBook `tengu_mcp_legacy_url_elicitation_server_denylist` 控制老式 URL elicitation。

### 2.6 Channel（服务器主动推送）

- 门控 `gateChannelServer`：服务器声明 `experimental["claude/channel"]`、非 modern 协议、一方 API、`allow_channels` + `tengu_harbor`、组织 `channelsEnabled`、会话 `--channels` 列表；插件条目还须市场一致并在 allowlist（`allowedChannelPlugins` 或 `tengu_harbor_ledger`），开发期用 `--dangerously-load-development-channels`。
- 消息：`notifications/claude/channel {content, meta}` → `wrapChannelMessage` 生成 `<channel source="…" k="v">…</channel>` 注入对话（`tengu_mcp_channel_message`）。
- 权限中继（`tengu_harbor_permissions`）：向声明 `claude/channel/permission` 的客户端发送 `notifications/claude/channel/permission_request`（5 字母请求 ID、脱敏截断的输入预览 `truncateForPreview`），服务器回 `notifications/claude/channel/permission {request_id, behavior}`。

### 2.7 其他

- **instructions 增量**（`getMcpInstructionsDelta`）：服务器 instructions 不再每轮全量拼进系统提示，而是作为 `mcp_instructions_delta` 附件只发新增/变更/移除；记录 `tengu_mcp_instructions_pool_change`。instructions 超长截断（`truncateServerInstructions`）。
- **headersHelper**：`getMcpHeadersFromHelper` 执行命令取 JSON 头；仓库内配置（project/local/agent）需要已持久化的工作区信任，否则跳过并提示；环境 `CLAUDE_CODE_MCP_SERVER_NAME/URL`、`CLAUDE_PLUGIN_ROOT`。
- **VS Code**：名为 `claude-vscode` 的 SDK 服务器可发 `log_event`（转成 `tengu_vscode_*` 事件）与 `admin_limit_request`；CLI 推送 `experiment_gates`（一组 tengu_* 开关）。
- **SDK 控制传输**：`SdkControlClientTransport` 可用宿主提供的 manifest 在本地重放 `initialize` 和首个 `tools/list`，省一次往返；不匹配（协议版本、声明了客户端能力、意外消息）就丢弃 manifest 并记录原因。

### 2.8 环境变量与设置

环境变量：`MCP_TIMEOUT`（连接超时，默认 30000）、`MCP_TOOL_TIMEOUT`、`CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT`、`MCP_SERVER_CONNECTION_BATCH_SIZE`（3）、`MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE`（20）、`MCP_PROTOCOL_NEGOTIATION`（legacy|auto）、`MCP_SDK_GENERATION`（v1|v2）、`MCP_CONNECT_TIMEOUT_MS`、`MAX_MCP_OUTPUT_TOKENS`、`ENABLE_MCP_LARGE_OUTPUT_FILES`、`CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH`、`MCP_OAUTH_CALLBACK_PORT`、`MCP_OAUTH_CLIENT_METADATA_URL`、`MCP_CLIENT_SECRET`、`CLAUDE_CODE_ENABLE_XAA`、`ENABLE_CLAUDEAI_MCP_SERVERS`、`CLAUDE_AGENT_SDK_MCP_NO_PREFIX`、`CLAUDE_CODE_SHELL_PREFIX`、`CLAUDE_CODE_CHROME_LATE_MCP_SERVER`、`CLAUDE_CODE_MCP_REGISTRY_FETCH_AT_STARTUP`、`CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS`、`CLAUDE_CODE_REMOTE`。

设置键：`enabledMcpjsonServers`、`disabledMcpjsonServers`、`enableAllProjectMcpServers`、`allowedMcpServers`、`deniedMcpServers`、`allowManagedMcpServersOnly`、`managedMcpServers`、`channelsEnabled`、`allowedChannelPlugins`、`disableClaudeAiConnectors`、`xaaIdp`、`allowAllClaudeAiMcps`；项目配置 `mcpServers`、`enabledMcpServers`、`disabledMcpServers`；全局配置 `mcpServers`、`claudeAiMcpEverConnected`。

GrowthBook：`tengu_brindle_causeway`（v2 SDK）、`tengu_mcp_protocol_negotiation_{http,claudeai,stdio,ccr}`、`tengu_mcp_negotiation_server_denylist`、`tengu_mcp_listen_server_denylist`、`tengu_dreamy_sundae`、`tengu_gentle_brooks`、`tengu_mcp_discover_projection_prior`、`tengu_mcp_stateless_skip_init`、`tengu_serene_teapot`、`tengu_mcp_connect_timeout_retry`、`tengu_mcp_legacy_sse_fallback`、`tengu_mcp_step_up_auth_dialog`、`tengu_mcp_issuer_strict_echo`、`tengu_mcp_normalize_root_combinators`、`tengu_mcp_drop_invalid_tool_schemas`、`tengu_mcp_singleton_unwrap`、`tengu_velvet_ibis`、`tengu_harbor`、`tengu_harbor_ledger`、`tengu_harbor_permissions`、`tengu_quiet_elephant`、`tengu_gleaming_creek`、`tengu_mcp_directory_bff`、`tengu_mcp_directory_visibility`、`tengu_auto_mode_config`。

主要遥测事件：`tengu_mcp_server_connection_succeeded/failed`、`tengu_mcp_server_needs_auth`、`tengu_mcp_tools_listed`、`tengu_mcp_degraded`、`tengu_mcp_discovery_source`、`tengu_mcp_list_changed`、`tengu_mcp_large_result_handled`、`tengu_mcp_oauth_flow_*`、`tengu_claudeai_mcp_eligibility`、`tengu_mcp_project_servers_approved`、`tengu_mcp_sdk_generation`、`tengu_mcp_instructions_pool_change`。

## 3. 插件系统

### 3.1 概述与位置

插件系统负责：市场（marketplace）登记与缓存 → 插件安装到版本化缓存并记在 `installed_plugins.json` → 按 settings 的 `enabledPlugins` 启用 → 启动/刷新时把插件目录里的命令、技能、代理、hooks、输出样式、主题、MCP/LSP 服务器、监视器（monitors）等组件注入运行时。

- 上游调用者：启动流程（`performStartupChecks`、`installPluginsForHeadless`）、`/plugin` 界面（`commands/plugin/*`）、`claude plugin …` CLI（`cli/handlers/plugins.ts` → `services/plugins/pluginCliCommands.ts`）、`/reload-plugins`（`refreshActivePlugins`）、技能/命令加载、MCP 配置合并（`services/mcp/config` 调 `getPluginMcpServers`）、LSP 管理器（`getPluginLspServers`）、Bash 工具 PATH（`getEnabledPluginBinPaths`）。
- 下游依赖：settings 读写（`getSettingsForSource`、`getEnabledSettingSources_7`）、安全存储（`getSecureStorage`，keychain/credential-manager/凭据文件）、git 执行、HTTP（axios 实例）、zod、存储后端 V5（`isStorageV5Enabled`）。

### 3.2 标识与目录布局

- 插件 ID：`name@marketplace`（`PLUGIN_ID_RE`，两段均为 `[A-Za-z0-9][-A-Za-z0-9._]*`）；npm 通道为 `<npm包名>@npm`（`isNpmPluginId`）。解析函数在 MCP 组的 `services/mcp/channelAllowlist.ts · isChannelAllowlisted`（名字配错，实为 splitPluginId，见建议）与 `utils/plugins/pluginIdentifier.ts · parsePluginIdentifier`。
- 保留市场名（`RESERVED_MARKETPLACE_NAME_PURPOSES`）：`inline`（--plugin-dir 会话插件）、`builtin`、`skills-dir`（~/.claude/skills 自动加载）、`synced`（claude.ai 账号同步）、`claude-plugin-test`、`npm`，以及预留的 `pip/uv/cargo/github/gh`；`claudeai-` 前缀保留给 claude.ai 托管市场。
- 官方保留名（`RESERVED_MARKETPLACE_NAMES` = 官方 14 个 + 社区 + `anthropic-plugin-directory`）只允许 `github.com/anthropics/*` 来源（`validateOfficialNameSource`）；`isImpersonatingOfficialName`/`BLOCKED_OFFICIAL_NAME_PATTERN`/`NON_ASCII_PATTERN` 防仿冒。
- 目录（`pluginDirectories.ts · getPluginsDirectory`）：`CLAUDE_CODE_PLUGIN_CACHE_DIR` 或 `~/.claude/plugins`（cowork 模式 `cowork_plugins`，`CLAUDE_CODE_USE_COWORK_PLUGINS`）。其下：
  - `known_marketplaces.json`、`installed_plugins.json`、`flagged-plugins.json`
  - `marketplaces/<name>/`（git 克隆）或 `marketplaces/<name>.json`（url 来源）
  - `cache/<marketplace>/<plugin>/<version>/`（版本化缓存，`getVersionedCachePath`；zip 模式为 `<version>.zip`），标记文件 `.orphaned_at`、`.in_use`、`.gcs-sha`、`.links_materialized`
  - `data/<转义ID>/`（`pluginDataDirPath`，即 `${CLAUDE_PLUGIN_DATA}`）
  - 种子目录 `CLAUDE_CODE_PLUGIN_SEED_DIR`（路径分隔符分隔，只读，`seedDirFor`）。

### 3.3 关键流程

#### 3.3.1 市场

1. 输入解析：`utils/plugins/parseMarketplaceInput.ts · parseMarketplaceInput`（git@…#ref、https（.git→git，.json→url，github.com→github）、owner/repo、本地目录/文件、npm）。
2. 添加：`marketplaceManager.ts · addMarketplaceSource` → `assertMarketplaceNameAddable`、`checkExistingNameDifferentSource`/`checkDeclaredMarketplaceCollision`/`checkCloneFolderCollision` → `loadAndCacheMarketplace` → `updateKnownMarketplaces`（`proper-lockfile` + 进程内队列）→ 可选 `saveMarketplaceToSettings`（写 `extraKnownMarketplaces`）。
3. 获取：`loadAndCacheMarketplace` 先 `isSourceAllowedByPolicy`（chunk-f3qhjfah `lf`，真名，见建议）；github/git → `cacheMarketplaceFromGit`（`gitClone` depth 1、sparse-checkout、禁交互、`CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS` 默认 120 s；GitHub 按 `isGitHubSshLikelyConfigured` 决定 SSH/HTTPS 顺序，`orderGithubTransports`，两次都失败合并错误）；url → `cacheMarketplaceFromUrl`（headers + headersHelper 命令输出的头）；npm、file、directory、settings（settings.json 内联市场，reconciler 写合成 marketplace.json）。解析用 `getPluginMarketplaceSchemaFor`（`applyMarketplacePluginRoot` 先改写裸来源名）。
4. 官方市场：`officialMarketplaceStartupCheck.ts · checkAndInstallOfficialMarketplace`（`CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL`、策略、重试退避，遥测 `tengu_official_marketplace_auto_install`）→ 优先 `officialMarketplaceGcs.ts · fetchOfficialMarketplaceFromGcs`（`https://downloads.claude.ai/claude-code-releases/plugins/claude-plugins-official/latest` 指针 + zip），失败回退 git（`tengu_plugin_official_mkt_git_fallback`）。
5. 刷新：`refreshMarketplaceDeduped`（全局 `marketplaceRefreshesInFlight` 去重）→ `refreshMarketplace`；`refreshAllMarketplaces` 跳过种子与 settings 市场。自动更新：`pluginAutoupdate.ts · autoUpdateMarketplacesAndPluginsInBackground`（`isMarketplaceAutoUpdate`：条目 autoUpdate > claudeai/pluginDirectory 默认开 > 官方名默认开，`knowledge-work-plugins`、`first-party-plugins` 除外；`tengu_plugin_autoupdate_pass`）。
6. 对账：`reconciler.ts · reconcileMarketplaces`（`diffMarketplaces` 比较 `getDeclaredMarketplaces` 与 known_marketplaces）；交互模式由 `PluginInstallationManager.ts · performBackgroundPluginInstallations` 触发，headless 由 `installPluginsForHeadless`。
7. 删除：`removeMarketplaceWithReservedSiblings` → `removeMarketplaceSource`（`disablePluginsInSettings` 关插件、`removeAllPluginsForMarketplace`、删缓存）。
8. 下架强制：`pluginBlocklist.ts · detectAndUninstallDelistedPlugins`（仅 `forceRemoveDeletedPlugins` 的市场；`flagged-plugins.json` 记 48 小时）。

#### 3.3.2 安装

`pluginOperations.ts · installPluginOp(pluginId, scope='user', {shownSourceCommand, replaceInstalledCopy, npmRegistry, gitHubHttpsFallback, …}, storageV5)`
1. `assertInstallableScope`（user/project/local；managed 不可安装）；策略检查（`describePolicyBlock`：plugin_policy_blocked、marketplace_policy_blocked）。
2. 取条目：`getPluginById`/`getPluginByIdCacheOnly`（插件目录市场只读缓存）。
3. `pluginInstallationHelpers.ts · installResolvedPlugin`：`resolveDependencyClosure`（同市场或根市场 `allowCrossMarketplaceDependenciesOn` 白名单内的依赖自动安装，标 `auto:true`；环检测）→ 每个插件 `cacheAndRegisterPlugin`：
   - `pluginLoader.ts · cachePlugin(source)` 按来源下载到暂存：`installFromGitHub`/`installFromGit`/`gitClone_2`（ref 不能以 - 开头，sha 必须完整，`verifyPinnedSha`）、`installFromGitSubdir`（`--filter=tree:0` + sparse-checkout，需 git ≥ 2.25）、npm（`fetchNpmPackageNoScripts`，不跑 install 脚本）、`installFromArchive`（https + 非回环/元数据主机 + sha256 校验，headers 只转发给同源）、command（运行命令取目录，需用户同意，`disableCommandPluginSources`/`allowManagedHooksOnly` 可禁）、本地路径。
   - `calculatePluginVersion`：manifest.version > 条目 version > git sha > archive sha256 > 内容哈希。
   - `copyPluginToVersionedCache`：复用已有完整缓存、他会话占用时推迟、种子缓存命中、link 模式、复制后装依赖与 `binaries`（sha256 钉住下载到 bin/），zip 模式打包。
   - `addInstalledPlugin`/`addPluginInstallation` 写 installed_plugins，`setPluginEnabledOp` 写 `enabledPlugins`。
4. `--replace`：`finishReplaceSwitch` 在不同市场的同名副本间切换并迁移设置与选项（`copyPluginOptions`）。

卸载：`uninstallPluginOp` → 删安装记录、最后一个安装时删版本缓存（孤儿标记）、`deletePluginDataDir`（可保留）、`deletePluginOptions`（settings.pluginConfigs 与安全存储 pluginSecrets）。`claude plugin prune` 删除不再被依赖的 `auto` 插件。

#### 3.3.3 启用/禁用

- 设置键 `enabledPlugins: { "<id>": true | false | string[] }`（数组也视为启用，`mO`），在 user/project/local/policy/flag 设置与 `--add-dir` 目录设置中合并；优先级 local > project > user（`SCOPE_PRECEDENCE`），托管 false 不可覆盖（`hJt`）。未设置时看 `manifest.defaultEnabled`（默认 true）。
- `setPluginEnabledOp(pluginId, enabled, scope)`：托管锁定、被启用插件依赖时禁止禁用（`requiredDependencyMessage`）、组织要求的插件（`listRequiredPlugins`）不可禁用；`enablePluginOp`/`disablePluginOp` 是薄包装。

#### 3.3.4 加载

```
loadAllPluginsCacheOnly(storageV5)          全局 pluginLoadCacheOnly（启动、大多数读取点）
loadAllPlugins(storageV5, credentials)      全局 pluginLoad（允许联网补缓存）
  └ assemblePluginLoadResult(loader, opts)
      ├ loadPluginsFromMarketplaces({cacheOnly})   enabledPlugins × known_marketplaces × installed_plugins
      │    └ loadPluginFromMarketplaceEntry / loadCachedMarketplacePlugin → finishMarketplacePluginLoad
      │         └ createPluginFromPath(pluginPath, pluginSource, enabled, …)
      ├ loadSessionOnlyPlugins(--plugin-dir/--plugin-url；marketplace=inline)
      ├ claude.ai 同步目录（marketplace=synced）、skills-dir 插件（chunk-e6aww6q8 part-571 W2r）
      ├ getBuiltinPlugins()
      ├ mergePluginSources（托管 > 会话 > 市场，去重）
      └ verifyAndDemote（依赖不满足 → 降级禁用，dependency-unsatisfied）
```
`createPluginFromPath` 读 `.claude-plugin/plugin.json`（`loadPluginManifest`，路径不得经符号链接逃出），按约定目录 `commands/ agents/ skills/ output-styles/ themes/ workflows/ hooks/hooks.json monitors/monitors.json .mcp.json .lsp.json settings.json bin/` 与 manifest 字段挂组件；根目录 `SKILL.md` 视为单技能插件。组件随后由各加载器消费（结果均缓存在全局状态）：
- 命令/技能：`loadPluginCommands.ts · getPluginCommands`、`getPluginSkills`（名字 `<插件>:<路径>`，按 realpath 跨插件去重）、`createPluginCommand`。
- 代理：`loadPluginAgents.ts · loadPluginAgents`/`loadAgentFromFile`（禁止 `permissionMode`、`hooks`、`mcpServers` 字段）。
- 输出样式：`loadPluginOutputStyles`。
- hooks：`loadPluginHooks.ts · loadPluginHooks`（cacheOnly 加载 → `loadPluginHooks` 按事件汇总 matcher，托管 `prependPlugins/appendPlugins` 排序 → hooks 模块（JS `register(on)`，受工作区信任与开关 `tengu_plugin_hooks_modules`）；安全模式只留内置插件 `filterPluginsForSafeMode`；`setupPluginHookHotReload` 热加载）。
- MCP：`mcpPluginIntegration.ts · getPluginMcpServers`（`.mcp.json` + `manifest.mcpServers`（路径/内联/MCPB），名字 `plugin:<插件>:<服务器>`、scope `dynamic`；`resolvePluginMcpEnvironment` 替换变量；`CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS(_EXCEPT)`、`CLAUDE_CODE_SKIP_PLUGIN_LOCAL_MCP_SERVERS`、`CLAUDE_CODE_SKIP_PLUGIN_MCP_BUNDLES`）。
- LSP：`lspPluginIntegration.ts · getPluginLspServers`（`.lsp.json` + `manifest.lspServers`）。
- bin：`getEnabledPluginBinPaths`（加入 Bash PATH，含 shell 元字符的路径丢弃）。
- 设置：插件 `settings.json`/manifest.settings 的白名单键在启用期间合并进用户设置。

刷新：`refresh.ts · refreshActivePlugins`（/reload-plugins）清缓存、重载、重新提取 MCP/LSP、重注册 hooks；`clearPluginCache(reason)` 清 Promise 缓存。

#### 3.3.5 MCPB/DXT

`mcpbHandler.ts · loadMcpbFile(source, pluginPath, pluginId, onProgress)`：缓存于 `<插件>/.mcpb-cache/<md5前8位>.metadata.json`，`checkMcpbChanged` → `downloadMcpb`/读本地 → `utils/dxt/zip.ts · unzipFile`（`validateZipFile` 文件数/大小/压缩比、`isPathSafe`）→ `extractMcpbContents`（`parseZipModes` 恢复权限位）→ `utils/dxt/helpers.ts` 校验 manifest → `generateMcpConfig`（动态导入 `@anthropic-ai/mcpb` 的 `getMcpConfigForManifest`）。需要 `user_config` 时返回 needs-config（`mcpb-needs-config` 警告），服务器级配置 `loadMcpServerUserConfig`/`saveMcpServerUserConfig`（敏感值存 `pluginSecrets["<插件>/<服务器>"]`）。

#### 3.3.6 插件选项（userConfig）

- schema：`PluginUserConfigOptionSchema`（type string/number/boolean/directory/file、title、description、required、default、multiple、sensitive、min/max、options），键须是标识符（成为 hooks 的 `CLAUDE_PLUGIN_OPTION_<KEY>` 环境变量）。
- 存储：`savePluginOptions` 非敏感 → `userSettings.pluginConfigs[<id>].options`，敏感 → 安全存储 `pluginSecrets`；`getUnconfiguredOptions` 决定启用时是否弹出配置。
- 替换：`substitutePluginVariables`（`${CLAUDE_PLUGIN_ROOT}`、`${CLAUDE_PROJECT_DIR}`、`${CLAUDE_PLUGIN_DATA}`）、`substituteUserConfigVariables`（`${user_config.KEY}`，缺失抛错）、`substituteUserConfigInContent`（技能/代理正文中敏感值不替换）。
- CLI：`claude plugin configure <plugin> [--values-stdin]`、`install --config key=value`。

#### 3.3.7 CLI 子命令（`chunk-y5m1jrzk` 命令元数据表）

`plugin init <name>`（别名 new，脚手架到 ~/.claude/skills/<name>/）、`validate <path> [--strict --json]`、`tag [path]`、`list`、`test [dir]`（earlyAccess hooksModules）、`details <name>`（组件清单与 token 开销）、`marketplace add <source> | list | remove <name> | update [name]`、`install <plugin>`（别名 i，`-s/--scope`、`--config`）、`uninstall <plugin>`（别名 remove/rm）、`prune`（别名 autoremove）、`enable <plugin>`、`disable [plugin]`（`--all`）、`update <plugin>`、`configure <plugin>`、`eval [target]` 与 `eval init [name]`。命令别名 `plugins`。

### 3.4 数据结构

**plugin.json**（`PluginManifestSchema` = 元数据 + 各组件，`PluginManifestFieldSchemas` 按出现字段校验）：
`$schema, name, displayName, version, description, author{name,email,url}, homepage, repository, license, keywords[], defaultEnabled, dependencies[(名字[@市场][@^range] | {name, marketplace})], metadata{}`；组件：`hooks`（路径/对象/数组）、`commands`（路径/数组/对象 name→{source|content, description, argumentHint, model, allowedTools}）、`agents`、`skills`、`outputStyles`、`themes`、`workflows`、`channels[{server, displayName, userConfig}]`、`mcpServers`（路径/MCPB/对象/数组）、`lspServers`（路径/对象 name→{command, args, extensionToLanguage, transport stdio|socket, env, initializationOptions, settings, workspaceFolder, startupTimeout, shutdownTimeout, requestTimeout, restartOnCrash, maxRestarts, diagnostics}）、`monitors`（[{name, command, description, when: always|on-skill-invoke:<skill>}]）、`settings`、`types`（./*.d.ts 类型契约）、`userConfig`、`binaries`（basename→{sha256}，最多 64）、`experimental{themes, syntaxHighlighting.hljsLanguages, monitors, outputStyles, evals}`。

**hooks/hooks.json**（`PluginHooksSchema`）：`{description?, hooks?, modules?[≤1]}`（至少一个；旧的 `surface` 字段报错）。

**marketplace.json**（`PluginMarketplaceSchema`）：`name, version, description, owner, plugins[], forceRemoveDeletedPlugins, metadata{pluginRoot, version, description}, allowCrossMarketplaceDependenciesOn[], renames{old: new|null}`；插件条目（`PluginMarketplaceEntrySchema`）= manifest 字段全部可选 + `name, source, headers, headersHelper, category, tags, strict(默认 true), relevance{topic, signals{cli, hosts, filesRead, manifestDeps, cwd}}`。解析失败但有名字的条目改写为 `source:{source:"unsupported", error}` 占位。

**插件来源**（`PluginSourceSchema`）：`"./相对路径"` | `{source:"npm", package, version, registry}` | `{source:"url", url, ref, sha}` | `{source:"github", repo, ref, sha}` | `{source:"git-subdir", url, path, ref, sha}` | `{source:"archive", url, sha256}` | `{source:"command", command, timeout(≤600), mode copy|link}` | `{source:"unsupported", error}`。

**市场来源**（`MarketplaceSourceSchema`）：`url{url, headers, headersHelper}`、`github{repo, ref, path, sparsePaths, skipLfs}`、`git{url, ref, path, sparsePaths, skipLfs}`、`npm{package, version, registry}`、`file{path}`、`directory{path}`、`settings{name, plugins[], owner}`；策略专用 `skills-dir`、`hostPattern{hostPattern}`、`pathPattern{pathPattern}`、`pluginDirectory`（`MarketplacePolicySourceSchema`）。

**known_marketplaces.json**（`KnownMarketplacesFileSchema`）：`{ "<name>": {source, installLocation, lastUpdated, autoUpdate?} }`。

**installed_plugins.json**（`InstalledPluginsFileSchemaV2`）：`{version: 2, plugins: { "<id>": [ {scope: managed|user|project|local, projectPath?, installPath, version?, installedAt?, lastUpdated?, gitCommitSha?, resolvedVersion?, auto?, claudeaiPluginId?, archiveSha256?, directoryRepositoryKey?, sourceCommand?, sourceProducerPath?, previousProducerPaths?, npmVersionSpec?, npmResolved?, npmIntegrity?, npmRegistry?} ] }}`。V1（每个 ID 单条记录）自动迁移；非法 ID/条目分别放入 `installed_plugins.set-aside.<日期>.<id>.json` 与原样保留。

**加载结果**：`{enabled: LoadedPlugin[], disabled: LoadedPlugin[], errors: PluginError[], warnings}`；LoadedPlugin 主要字段 `name, manifest, path, source(=id), repository, enabled, isBuiltin, commandsPath(s), agentsPath(s), skillsPath(s), outputStylesPath(s), themesPath(s), workflowsPath(s), hooksConfig, mcpServers, lspServers, depConstraints`；错误 type 包括 `plugin-cache-miss, plugin-not-installed, plugin-not-found, path-traversal, path-not-found, hook-load-failed, generic-error, dependency-unsatisfied, mcpb-needs-config, managed-plugin-disabled-by-settings`。

### 3.5 配置项、环境变量、开关

- settings：`enabledPlugins`、`extraKnownMarketplaces`、`pluginConfigs`；托管（policySettings）：`strictKnownMarketplaces`、`blockedMarketplaces`、`disableSideloadFlags`、`disablePluginDirectory`、`disableCommandPluginSources`、`allowManagedHooksOnly`、`pluginTrustMessage`、`prependPlugins/appendPlugins`；全局配置：`officialMarketplaceAutoInstalled`、`claudeCodeHints`、`lspRecommendationNeverPlugins`、`lspRecommendationIgnoredCount`。
- env：`CLAUDE_CODE_PLUGIN_CACHE_DIR`、`CLAUDE_CODE_PLUGIN_SEED_DIR`、`CLAUDE_CODE_PLUGIN_USE_ZIP_CACHE`、`CLAUDE_CODE_USE_COWORK_PLUGINS`、`CLAUDE_CODE_SYNC_PLUGIN_INSTALL`、`CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS`、`CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE`、`CLAUDE_CODE_PLUGIN_MANAGER`、`CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL`、`CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS`、`CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS_EXCEPT`、`CLAUDE_CODE_SKIP_PLUGIN_LOCAL_MCP_SERVERS`、`CLAUDE_CODE_SKIP_PLUGIN_MCP_BUNDLES`、`CLAUDE_CODE_CCR_ONE_PLUGIN_LOAD_PER_RELOAD`；注入给插件进程：`CLAUDE_PLUGIN_ROOT`、`CLAUDE_PLUGIN_DATA`、`CLAUDE_PLUGIN_OPTION_<KEY>`。
- GrowthBook：`tengu_hover_rest`（存储后端 V5，进程内首次读取固定，`isStorageV5Enabled`）、`tengu_plugin_hooks_modules`（hooks 模块）、`tengu_ccr_plugins_turn_start_check_enabled`、`allow_plugin_directory_search`（组织策略限制）。
- 遥测事件：`tengu_plugin_installed(_cli)`、`tengu_plugin_uninstalled_cli`、`tengu_plugin_enabled_cli`、`tengu_plugin_disabled(_all)_cli`、`tengu_plugin_updated_cli`、`tengu_plugin_prune_cli`、`tengu_plugin_command_failed`、`tengu_plugin_install_failed`、`tengu_plugin_remote_fetch`、`tengu_plugin_state_file_error`、`tengu_plugin_record_spelling`、`tengu_plugin_delisted_enforcement`、`tengu_plugin_autoupdate_pass`、`tengu_official_marketplace_auto_install`、`tengu_plugin_official_mkt_git_fallback`、`tengu_marketplace_background_install`、`tengu_headless_plugin_install`、`tengu_known_marketplaces_fallback_write`、`tengu_plugin_hint_detected`、`tengu_plugin_load_refresh_window_recovered`。

## 4. Hooks

### 4.1 事件清单（`HOOK_EVENTS`，`chunk-dcmhvw5a.js#yc`，共 33 个）

| 事件 | matcher 字段（`getHookEventMetadata`） | 316 相对 2.1.88 |
|---|---|---|
| PreToolUse | tool_name | |
| PostToolUse | tool_name | |
| PostToolUseFailure | tool_name | |
| **PostToolBatch** | 无 | 新增：一批工具调用全部完成、下一次请求前触发一次，输入 `tool_calls[]` |
| Notification | notification_type（含 elicitation_complete / elicitation_response） | |
| UserPromptSubmit | 无 | |
| **UserPromptExpansion** | command_name | 新增：用户输入的斜杠命令展开为提示词时；输入 expansion_type/command_name/command_args/command_source/prompt |
| SessionStart | source：startup/resume/clear/compact/fork | |
| SessionEnd | reason：clear/resume/logout/prompt_input_exit/other | EXIT_REASONS 去掉了 2.1.88 的 `bypass_permissions_disabled` |
| Stop | 无 | |
| StopFailure | error：rate_limit/overloaded/authentication_failed/oauth_org_not_allowed/(account_on_hold)/verification_required/billing_error/invalid_request/model_not_found/server_error/max_output_tokens/cloud_credential_error/unknown | |
| SubagentStart | agent_type | |
| SubagentStop | agent_type | |
| PreCompact | trigger：manual/auto | |
| PostCompact | trigger | |
| **PreModelSwitch** | to_model | 新增：/model、模型选择器、set_model 切换前；可 allow/deny/ask |
| **PostModelSwitch** | to_model | 新增：会话模型改变后；additionalContext 注入下一次请求 |
| PermissionRequest | tool_name | |
| PermissionDenied | tool_name | |
| Setup | trigger：init/maintenance | |
| TeammateIdle | 无 | |
| TaskCreated | 无 | |
| TaskCompleted | 无 | |
| Elicitation | mcp_server_name | |
| ElicitationResult | mcp_server_name | |
| ConfigChange | source：user_settings/project_settings/local_settings/policy_settings/skills | |
| WorktreeCreate | 无 | |
| WorktreeRemove | 无 | |
| InstructionsLoaded | load_reason：session_start/nested_traversal/path_glob_match/include/compact | |
| CwdChanged | 无 | |
| FileChanged | matcher 是要监听的文件名（`.envrc|.env`） | |
| **DirectoryAdded** | source：slash_command/register_repo_root | 新增：/add-dir 或 SDK register_repo_root 之后 |
| **MessageDisplay** | 无 | 新增：助手文本显示时；可用 displayContent 替换屏幕上的 delta（只影响显示） |

2.1.88 的 27 个事件全部保留，无删除；新增 6 个（加粗）。另有两个“伪事件”复用钩子执行器：`StatusLine`（`executeStatusLineCommand`，`#Xzr`）和 `FileSuggestion`（`executeFileSuggestionCommand`，`#mWo`），它们读 settings 的 `statusLine`/`fileSuggestion`，不是 HOOK_EVENTS 成员。

### 4.2 配置来源与合并

钩子匹配器列表由 `SO`（`chunk-e6aww6q8.js#SO`，unattributed）→ `g4`/`f`（`chunk-7a5rgqvc.js`，unattributed）汇总，顺序：

1. **启动快照**（`X2()` = `getHooksFromAllowedSources` 的缓存）：合并后的 settings `hooks`（user/project/local/flag/policy）。policy `disableAllHooks` → 空；policy `allowManagedHooksOnly` 或只允许插件定制（`isRestrictedToPluginOnly("hooks")`）→ 只取 policy 钩子；用户层 `disableAllHooks` 视受信层情况处理。
2. **设备钩子**（`fkn(event)`）与**主线程代理钩子**（`w7()`，代理 frontmatter 注册的，managedOnly 时略过）。
3. **注册钩子**（`registerHookCallbacks_2()`，`bootstrap/state`）：插件 `hooks/hooks.json`（带 pluginRoot/pluginId）、SDK `hooks` 回调（callback）、内部 callback。policy `disableAllHooks` 时只保留非插件、非设备的回调。
4. **会话钩子**（`SessionHooksRegistry`）：skill frontmatter（`registerSkillHooks`，带 skillRoot，`once` 成功后移除）、agent frontmatter（`registerFrontmatterHooks`，子代理里 Stop 改成 SubagentStop）、`/goal` 等运行时注册、function 钩子（`addFunctionHook`，默认 5s 超时，回调参数是消息列表）。
5. `managedHooksOnly` 模式只用 `oot(event)`：policySettings.hooks + 宿主提供的 policy 钩子。

快照：`X2()` 第一次调用时计算并保存 `initialHooksConfig`，之后会话内不变（settings 变更走 ConfigChange 事件和 skill 重载）；`SJr()` 返回 policy 快照，读不到时为 `"unreadable"`，此时按“组织的钩子”保守处理。

### 4.3 匹配规则（`getMatchingHooks`，`#LPn`）

- `matchQuery` 因事件而异（工具名、source、trigger、notification_type、agent_type、mcp_server_name、load_reason、to_model、command_name、error、reason…）。
- `matchesPattern`（`#GV`）：空或 `*` 全匹配；纯名单（`Write|Edit`）对名字及别名、旧名、MCP 名精确匹配；否则编译成正则匹配工具名、别名、family 名。无效正则记录日志并视为不匹配。
- 同一钩子按类型去重：键 = 来源根（pluginRoot/skillRoot/settingsSource）+ 负载（`getHookDedupPayload`，`#lw`：command+shell+args+if、url+if、server/tool/input+if、script/file+if、prompt+if）。重复时优先 settings 里写的那份（`dedupeHooksPreferSettings`）。
- `if` 条件（权限规则语法，如 `Bash(git *)`）：只在 PreToolUse/PostToolUse/PostToolUseFailure/PermissionRequest/PermissionDenied 可求值（`prepareIfConditionMatcher`，`#wPn`），其他事件上带 `if` 的钩子被跳过。
- 只通过工具“另一个名字”命中的钩子（throughFamilyOnly）可以 deny/ask，但 allow 与 updatedInput 被忽略。
- SessionStart/Setup 不支持 http 钩子。
- SessionStart 的 startup/resume 来源中，项目设置里的 command 钩子被强制改为 async（`executeHooks` 里 `isStartupOrResume`）。

### 4.4 钩子类型（`buildHookSchemas`，`chunk-dcmhvw5a.js#D_`）

| type | 字段 | 执行 |
|---|---|---|
| `command` | command、**args**（exec 形式，无 shell）、if、shell（bash/powershell）、timeout、**onFailure**（continue/block）、statusMessage、once、async、asyncRewake、**rewakeMessage**、**rewakeSummary**（@internal）、**cloud**（device/skip，@internal） | `execCommandHook`（`#MU`） |
| `prompt` | prompt（`$ARGUMENTS` 占位）、if、timeout、model、**continueOnBlock**、statusMessage、once | `execPromptHook`（`#TAn`） |
| **`mcp_tool`** | server、tool、input（字符串支持 `${tool_input.file_path}` 插值）、if、timeout、statusMessage、once | `Snt`（unattributed） |
| `http` | url、if、timeout、**onFailure**、headers、allowedEnvVars、statusMessage、once、**cloud** | `execHttpHook`（`#PJn`） |
| `agent` | prompt、if、timeout（默认 60s）、model、statusMessage、once | `execAgentHook`（`#hnt`） |

内部类型（不在用户 schema 里）：`callback`（SDK/内部回调，`executeHookCallback`）、`function`（会话 function 钩子，`executeFunctionHook`）、`script`（mods/设备钩子，`hook.script`/`hook.file`）。加粗为 316 新增字段/类型。

### 4.5 执行方式

`executeHooks`（`#eIr`，REPL 内，异步生成器）主流程：

1. `shouldSkipHookDueToTrust`（`#jB`）：工作区未信任 → 全部跳过。
2. 云端服务调用（served call）准备环境 `buildServedCallHookEnv`（`#OOr`）；mods 的 owed 列表 / whichCopyAsk 先等待。
3. `getMatchingHooks` → 过滤（served call 下 prompt/agent 不跑）。
4. 只有 callback 钩子时走快路径（不发进度消息）；否则发 `hook_progress` 消息、开 OTel span，按 `bAn(...)` 并行执行（有并发槽位 `SAn`，PermissionRequest 的 agent 钩子不占槽），总超时 `_nt(...)`。
5. 每个钩子按类型分发；结果经 `QBt` / `refuseUnfinishedPreToolHook`（`#Vxn`，PreToolUse 钩子超时/失败即拒绝调用，除非 `onFailure: continue`）处理后逐条产出。
6. 汇总权限：deny > defer > ask > allow。产出 `{permissionBehavior, hookPermissionDecisionReason, updatedInput, rewriterKind, permissionDisplay}` 等。
7. 遥测：`tengu_run_hook`、`tengu_repl_hook_finished`（含注入字符数）、`tengu_hook_plugin_injected/finished`、OTel `hook_execution_start/complete`。

`executeHooksOutsideREPL`（`#cN`）用于没有对话上下文的事件（SessionEnd、Notification、PreCompact、PostCompact、ConfigChange、CwdChanged、FileChanged、InstructionsLoaded、StopFailure、Elicitation*、WorktreeCreate/Remove、DirectoryAdded），返回 `{command, succeeded, output, blocked, watchPaths, systemMessage}`；prompt/agent 钩子在这里返回 “not yet supported outside REPL”。

`JI`（`chunk-e6aww6q8.js#JI`，unattributed）是 REPL 内的分派层：有 mods function-hook 链（`classic.<Event>`）时走 `ZOr` 链，否则直接 `executeHooks`；子代理里只透传权限相关字段（`Kzr`）。

command 钩子细节（`execCommandHook`）：

- 启动：`args` 存在 → `spawn(command, args)`（exec 形式，`${CLAUDE_PROJECT_DIR}`、`${CLAUDE_PLUGIN_ROOT}`、`${CLAUDE_PLUGIN_DATA}`、`${user_config.*}` 逐元素替换）；shell=powershell → pwsh/powershell（找不到报错），追加 exit 2 透传与“只输出字符串无结论”检测；默认 bash（Windows 用 Git Bash，找不到报错）。`CLAUDE_CODE_SHELL_PREFIX` 包装命令。
- 插件钩子在 shell 形式里引用 `${user_config.*}` 直接拒绝（防二次 shell 解析）；非插件钩子引用 `${CLAUDE_PLUGIN_ROOT}`/`${CLAUDE_PLUGIN_DATA}` 报错；skill 钩子只有 `CLAUDE_PLUGIN_ROOT`（指向 skill 目录）。
- 环境变量：继承进程 env（组织钩子用干净的 env，剔除个人插件的 `$.env.set` 和仓库设置的 env），加 `CLAUDECODE=1`、`CLAUDE_CODE_SESSION_ID`、`CLAUDE_CODE_CHILD_SESSION=1`、`CLAUDE_CODE_SESSION_ATTENDED`、`CLAUDE_PID`、`CLAUDE_EFFORT`、`TRACEPARENT`（`Gnt`）、`CLAUDE_PROJECT_DIR`、`COLUMNS`/`LINES`、`CLAUDE_PLUGIN_ROOT`、`CLAUDE_PLUGIN_DATA`、`CLAUDE_PLUGIN_OPTION_<KEY>`，官方插件可得 `ANTHROPIC_AUTH_TOKEN`/`ANTHROPIC_API_KEY`（`qOr`，受 `tengu_amber_lattice.plugins` 名单门控），SessionStart/Setup/CwdChanged/FileChanged 加 `CLAUDE_ENV_FILE`。
- stdin：写入一行 JSON（`createBaseHookInput` 的公共字段 + 事件字段），然后关闭。
- 超时：`hook.timeout` 秒，否则 `TOOL_HOOK_EXECUTION_TIMEOUT_MS = 600000`（UserPromptSubmit 30s）。
- 退出后 `waitForStdioQuiet`（`#s$t`）等 stdout/stderr 安静 500ms、最多 10s；stdio 未正常结束且输出不是惰性 JSON 时拒绝采信（`checkIncompleteCapture`）。
- async：配置 `async: true`、`asyncRewake: true`（交互会话或 `UDt()`），或 stdout 首个 JSON 是 `{"async": true, "asyncTimeout"?}` → 转后台（`backgroundHookProcess`，`#Rnt`）。普通 async 登记到 `AsyncHookRegistry`（默认 15s），之后读取 `{async:true}` 后的那一个 JSON 作为答复；asyncRewake 在 exit 2 时把 stderr 用 rewakeMessage 包装成 system-reminder 唤醒模型（缺失脚本只报一次）。`forceSyncExecution` 时忽略 async。

公共输入字段（`createBaseHookInput`，`#wf`）：`session_id`、`transcript_path`、`cwd`、`scratchpad_dir`、`prompt_id`、`permission_mode`、`agent_id`、`agent_type`、`effort: {level}`；served call 时 `session_id = "served:<caller>"`、`transcript_path = ""`。各事件附加字段见 `execute*Hooks` 文档（如 Stop 的 `stop_hook_active`、`last_assistant_message`、`background_tasks`、`session_crons`；PreToolUse 的 `tool_name/tool_input/tool_use_id/mcp_server`）。

### 4.6 返回值协议

退出码（command 钩子，`executeHooks` 末段）：

| 退出码 | 语义 |
|---|---|
| 0 | 成功。stdout 若为 JSON 按输出协议处理；纯文本 stdout 作为 `hook_success` 附件（UserPromptSubmit/SessionStart/Setup 等会进入模型上下文，其余只在 transcript 模式显示） |
| 2 | 阻断：stderr（为空则 “No stderr output”）作为 `blockingError` 反馈给模型/用户，具体含义见 `/hooks` 元数据（PreToolUse 阻止调用、Stop 让对话继续、UserPromptSubmit 抹去提示词…）。插件钩子 exit 2 但像“脚本丢失”时降级为非阻断错误 |
| 其他 | 非阻断错误，stderr 只给用户看；PreToolUse/PermissionRequest 的失败会记到 `KE.noteHookFailure`；`onFailure: block` 时按 exit 2 处理（Stop 系与 async 钩子忽略 onFailure） |

JSON 输出（`syncHookResponseSchema`，`types/hooks.ts`）：

- 顶层：`continue`（false → preventContinuation）、`suppressOutput`、`stopReason`、`decision`（approve/block）、`reason`、`systemMessage`、**`terminalSequence`**（只允许 OSC 0/1/2/9/99/777 和 BEL，`emitHookResponse`）、`hookSpecificOutput`；另有 `metrics`、`rewakeSummary` 被识别（插件遥测）。
- `hookSpecificOutput` 按 `hookEventName`：
  - PreToolUse：`permissionDecision`（allow/deny/ask/**defer**）、`permissionDecisionReason`、`updatedInput`、`additionalContext`、`permissionDisplay`（@internal）
  - UserPromptSubmit：`additionalContext`、**`sessionTitle`**、**`suppressOriginalPrompt`**；UserPromptExpansion 同（无 sessionTitle）
  - SessionStart：`additionalContext`、`initialUserMessage`、**`sessionTitle`**、`watchPaths`、**`reloadSkills`**
  - Setup / SubagentStart / PostToolUseFailure / PostToolBatch / Notification / **Stop / SubagentStop** / PostModelSwitch：`additionalContext`
  - PreModelSwitch：`permissionDecision`（allow/deny/ask）、`permissionDecisionReason`
  - PostToolUse：`additionalContext`、**`classifierContext`**（给 auto 模式分类器）、**`updatedToolOutput`**（所有工具）、`updatedMCPToolOutput`（旧，仅 MCP）
  - PermissionDenied：`retry`
  - PermissionRequest：`decision: {behavior:"allow", updatedInput?, updatedPermissions?} | {behavior:"deny", message?, interrupt?}`
  - Elicitation / ElicitationResult：`action`（accept/decline/cancel）、`content`
  - CwdChanged / FileChanged：`watchPaths`
  - WorktreeCreate：`worktreePath`
  - **MessageDisplay**：`displayContent`
- `processHookJSONOutput`（`#roe`）把这些映射为内部字段；`hookEventName` 与实际事件不符抛错；未知 decision/permissionDecision 抛错。
- 解析：`parseHookOutput`（`#m6`）——不以 `{` 开头当纯文本；多个 JSON 文档当纯文本；校验失败时 validationError 附带期望 schema（`parseHookOutput`，`#lxn`）。exit 2 + 无效 JSON 仍按阻断处理。
- “惰性输出”判定（`isInertHookOutput`，`#i$t`）：只含无害键、不 allow/defer/accept/retry/注入上下文的输出，即便 stdio 截断也可采信。

prompt/agent 钩子协议：模型返回 `{ok, reason, impossible?}`（`hookResponseSchema`）。prompt 钩子 ok=false → 阻断，非 Stop 事件默认 `preventContinuation`（`continueOnBlock: true` 可改）；`impossible: true` 只对 Stop/SubagentStop 有效（结束而非继续）。agent 钩子以 StructuredOutput 工具作答，最多 50 轮，PermissionRequest 不支持 agent 钩子。

### 4.7 http 钩子与 SSRF 防护

`execHttpHook`（`#PJn`）：
- `claude mcp serve --transport http` 下从不发送；无盘会话不发送。
- `allowedHttpHookUrls`（settings）白名单；headers 中 `$VAR`/`${VAR}` 只插值 `allowedEnvVars` 列出的变量，且与策略 `httpHookAllowedEnvVars` 取交集，凭证类变量一律不插值，值去 CR/LF/NUL（`interpolateEnvVars`，`#MMr`）。
- served call 时若代理/TLS/解析器相关 env（`NETWORK_ENV_KEYS`，`#CMr`）与本人环境不一致则不发送。
- `maxRedirects: 0`；沙箱网络开启时经本地代理（`getSandboxProxyConfig`），否则（无 env 代理时）用 `ssrfGuardedLookup`（`#qAn`）：解析出的任一地址是 0/8、10/8、100.64/10、169.254/16、172.16/12、192.168/16、::、fc00::/7、fe80::/10 或映射到这些的 IPv4 → `ERR_HTTP_HOOK_BLOCKED_ADDRESS`；回环 127.0.0.0/8、::1 允许。
- 响应：空体当 `{}`；必须是 JSON（`parseHttpHookOutput`）。

### 4.8 信任、策略与快照

- 工作区未信任：`executeHooks`/`executeHooksOutsideREPL`/statusLine/fileSuggestion 都跳过；WorktreeRemove 可带 `personsHooksRunUntrusted` 只跑本人设置里的钩子；非交互会话中未信任时去掉检出目录的 SessionEnd 钩子（`shouldOmitCheckoutSessionEndHooks`）。
- `disableAllHooks`（policy → 全关，SDK callback 仍跑；用户层 → 只关用户的）、`allowManagedHooksOnly`。
- `CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG`：个人钩子的答复字段被裁剪（`restrictPersonalHookAnswer`），个人 WorktreeCreate 钩子不能决定目录。
- 组织 managed settings 尚未读到时，mods 与钩子暂停，SessionStart 钩子本会话不再跑（`HOOKS_PENDING_POLICY_MESSAGE` 等文案）；policy 指纹变化后重判已加载 mods（`rejudgeLoadedMods`）。
- 云端会话驱动本机（served call / device hooks）：`judgeHookForServedCall`（`#IOr`）把项目配置的、脚本位于云端可写范围内的、链接文件等钩子扣住（held），PreToolUse 被扣时转为 ask；`cloud: device|skip` 控制是否提供给云端会话。

### 4.9 文件变更监听

`onCwdChangedForHooks`（`#csr`）：会话初始化时若快照里有 CwdChanged/FileChanged 钩子则启动。FileChanged 的 matcher 按 `|` 拆成文件名（相对 cwd），加上钩子返回的 `watchPaths`，用 chokidar 监听（awaitWriteFinish 500ms），变化时执行 FileChanged 钩子（输入 file_path/event）；cwd 变化时清 env 文件、执行 CwdChanged 钩子并以返回的 watchPaths 重建监听。钩子的 systemMessage/失败输出通过通知回调展示。

### 4.10 配置项与环境变量

| 名称 | 作用 |
|---|---|
| settings `hooks`、`disableAllHooks`、`allowManagedHooksOnly`（policy）、`allowedHttpHookUrls`、`httpHookAllowedEnvVars`、`statusLine`、`fileSuggestion`、`enabledPlugins` | 见上 |
| `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` | SessionEnd 钩子时间预算（上限 1h；默认按钩子 timeout，最少 1.5s、最多 60s） |
| `CLAUDE_CODE_SHELL_PREFIX` | 包装 command 钩子 |
| `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` | Stop 钩子连续阻断上限（默认 8，query 循环里读取） |
| `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS`、`CLAUDE_CODE_HOOKS_SAME_THREAD`、`CLAUDE_CODE_DISABLE_HOOK_FORWARDING`、`CLAUDE_CODE_RESUME_SESSIONSTART_HOOKS_WAIT_MS`、`CLAUDE_CODE_EMIT_USER_PROMPT_SUBMIT_HOOK_EVENTS`、`CLAUDE_CODE_DISABLE_PERMISSION_PROMPT_NOTIFY_HOOKS` | 在本领域外读取（mods/设备钩子/SDK 事件），列出供参考 |
| `CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG` | 见 2.8 |
| GrowthBook `tengu_fresh_heron`（默认开）、`tengu_amber_lattice`（官方插件可拿认证 token 的名单） | |
| 遥测 | `tengu_run_hook`、`tengu_repl_hook_finished`、`tengu_hook_plugin_injected`、`tengu_hook_plugin_finished`、`tengu_hook_plugin_metrics`、`tengu_hook_prompt_timeout`、`tengu_hook_prompt_too_long_retry`、`tengu_agent_stop_hook_*`、`tengu_pre_tool_use_refused_unfinished_hook`、`tengu_remote_tool_serve_hook_held`、`tengu_sdk_hook_callback_timeout`、`tengu_hook_started_in_launch_dir`、OTel `hook_execution_start/complete`、`hook_plugin_metrics` |

## 5. Skills、输出样式与 markdown 配置加载

### 5.1 发现（`getSkillDirCommands`，`#VRr`）

并行加载，按文件身份（realpath）去重：

1. managed：`<managed>/.claude/skills`（`CLAUDE_CODE_DISABLE_POLICY_SKILLS`、无盘会话、组织托管 managed settings 时不读）。
2. 用户：`~/.claude/skills/*/SKILL.md`（可经 storageV5 后端读，`loadUserSkillsFromStorageV5`）。
3. 同步 skills：`~/.claude/skills/<SYNCED>/<dir>`（claude.ai 账号同步，loadedFrom=syncedSkills）。
4. host catalog：宿主挂载的同步 skill 目录（`loadHostCatalogSkills`），与同步 skill 同名时让位。
5. 项目：从 cwd 向上到项目根的每级 `.claude/skills`（`Yoe("skills", …)`）。
6. `--add-dir` 目录的 `.claude/skills`。
7. 旧式 commands：`~/.claude/commands`、项目 `.claude/commands`、--add-dir 的 `.claude/commands`（loadedFrom=`commands_DEPRECATED`，子目录用 `:` 命名空间）。
8. 插件 skill（`KTn()`，plugins 领域）。

`isRestrictedToPluginOnly("skills")`（策略只允许插件）时只保留插件；`projectSettings` 来源关闭时不读项目和 --add-dir；`isBareMode()` 只读 --add-dir。被 `enabledPlugins` 设为 false 的 `<name>@<SKILLS_DIR>` 对应的用户/项目 skill 目录被跳过（看 `.claude-plugin/plugin.json` 的 name）。保留名冲突的 skill 拒绝加载并告警一次（`refuseReservedSkillName`）。单个 SKILL.md 有大小上限（`By`）。

动态发现：工具读写文件后 `discoverSkillDirsForPaths`（`#Zzo`）从文件目录向上找新的 `.claude/skills`（跳过 gitignore、同步目录、8.3 短名、目标不确定的链接），`addSkillDirectories`（`#Xtt`）载入动态 skill 表并发出 `dynamicSkillsLoaded`。

条件 skill：frontmatter 有 `paths`（gitignore 语法，去掉尾部 `/**`）时先存入 `conditionalSkills`，`activateConditionalSkillsForPaths`（`#evn`）在被触及文件命中时激活。

热重载：`createSkillChangeDetector`（`chunk-2njac0sx.js#Re`）用 chokidar 监听 `getWatchablePaths` 列出的 skills/commands/agents 目录（depth 2，只看 .md，忽略 .git），按用户交互活跃度切换轮询间隔；变化去抖后先跑 ConfigChange 钩子（source=skills，可阻断），再 `clearSkillCaches` 并通知重载。SessionStart 钩子返回 `reloadSkills: true` 也会重扫。

### 5.2 frontmatter 字段（`parseSkillFrontmatterFields`，`#_Ce`；`createSkillCommand`，`#phn`）

| 键 | 含义 |
|---|---|
| `name` | 显示名（超长忽略），命令名取目录名 |
| `description` | 缺省取正文第一行（≤100 字符） |
| `allowed-tools` | 允许工具（字符串或数组）；支持 `${CLAUDE_SKILL_DIR}`、`${CLAUDE_PROJECT_DIR}` 替换；hooks 不可加载时清空 |
| `disallowed-tools` / `disallowedTools` | 禁用工具（316 新增） |
| `argument-hint` | 参数提示 |
| `arguments` | 具名参数列表（`$name` 替换） |
| `when_to_use` | 何时使用（进技能清单） |
| `version` | 版本 |
| `model` | 模型别名，`inherit` 特判 |
| `effort` | 推理强度（EFFORT_LEVELS 或整数） |
| `disable-model-invocation` | 只能用户调用 |
| `user-invocable` | 默认 true；false 时 isHidden |
| `hooks` | HooksSchema；顶层误写 PreToolUse/PermissionRequest 视为不可加载守卫 |
| `context` | `fork` → 以 forked 子代理执行 |
| `agent` | fork 时使用的代理类型 |
| `background` | 布尔，后台运行（316 新增） |
| `paths` | 条件激活 glob |
| `shell` | bash/powershell，用于正文里的 `!` 命令 |
| `created_by` / `improved_by` | `dream-proposal` 标记（316 新增） |
| `fallback` | 布尔（316 新增，语义未查清） |
| `metadata` | 任意对象（316 新增） |
| `experimental.cachettl` | 缓存 TTL（`parseExperimentalCacheTtl`） |

frontmatter 解析（`parseFrontmatter`，`chunk-82kqcve8.js#sd`）：`---` 块用 YAML 解析；untrusted 来源拒绝超过 65536 字节、过深或含锚点的块；`quoteLossyValues` 模式给会丢信息的值加引号并报告 rewriteHazard。

### 5.3 命令对象与调用

`createSkillCommand` 产出 `type: "prompt"` 命令：`name`、`description`、`allowedTools`/`getAllowedTools`、`disallowedTools`、`argNames`、`whenToUse`、`model`、`effort`、`context`、`agent`、`background`、`paths`、`hooks`、`skillRoot`、`source`、`loadedFrom`（skills/syncedSkills/commands_DEPRECATED/bundled/plugin/mcp）、`contentHash`、`isHidden`、`userFacingName()`、`getPromptForCommand(args, ctx)`。

`getPromptForCommand`：正文前加 `Base directory for this skill: <dir>`；`substituteArguments` 替换 `$ARGUMENTS`/具名参数；对允许的来源执行正文中的 `` !`cmd` `` shell 命令（`executeShellCommandsInPrompt`，带 frontmatter shell）；MCP 资源 skill 加资源根说明。

SkillTool（tools 领域）调用命令：inline 时把提示词注入当前对话，`context: fork` 时起子代理；skill 的 hooks 在调用时经 `registerSkillHooks` 注册为会话钩子。MCP 服务器提供的 skill 通过 `getMCPSkillBuilders`（loadSkillsDir 在模块初始化时注册 `{createSkillCommand, parseSkillFrontmatterFields}`）构造。

### 5.4 内置（bundled）skill（`initBundledSkills`，`chunk-hantmvxa.js#ALe`）

`CLAUDE_CODE_ENTRYPOINT=local-agent` 时只注册 design（非 hub 模式）及 artifact 系列。否则注册：

| 名字 | 说明 | 门控 / 调用方式 |
|---|---|---|
| design | Claude Design 子命令（sync/login/consent/revoke/import/export/status） | 有可用模式时；只能用户；不受总开关影响 |
| artifact-design / artifact-capabilities / artifact-diagramming | artifact 设计/能力/图示指南 | artifact 功能门控；部分只供模型 |
| loop | 循环执行（默认间隔 10m） | `DP` 门控 |
| update-config | 修改 settings.json（含钩子构造） | 总是 |
| keybindings-help | 快捷键定制 | `isKeybindingCustomizationEnabled`；只供模型 |
| debug | 调试日志诊断 | 只能用户 |
| memory-types | 记忆类型参考 | 记忆功能门控；只供模型 |
| batch | 并行 worktree 大改 | 只能用户 |
| verify / simplify / commit / pr / code-review | 工作流 skill（可被同名用户 skill 覆盖） | commit/pr 有门控 |
| doctor | 诊断 | `DISABLE_DOCTOR_COMMAND` 关闭 |
| fewer-permission-prompts | 生成权限白名单 | 总是 |
| dataviz | 图表设计指南 | 总是 |
| cowork-plugin / setup-claude / explain-usage | Cowork 环境 skill | Cowork 门控 |
| design-sync | 设计系统同步 | `UW` 门控；只能用户 |
| schedule | 定时云端代理 | claude.ai 登录、非 `CLAUDE_CODE_REMOTE`、策略允许 routines |
| send-to-project | 发送到 Projects | `kht` 门控；只能用户 |
| claude-code-docs | 回答 Claude Code 问题 | `tengu_birch_kettle`；`CLAUDE_CODE_DISABLE_CLAUDE_CODE_SKILL` |
| claude-api | Claude API 参考 | `CLAUDE_CODE_DISABLE_CLAUDE_API_SKILL` |
| workflow-authoring | 工作流脚本编写 | `Sg()` |
| claude-in-chrome | Chrome 扩展 | 扩展可用且未 `CLAUDE_CODE_DISABLE_CFC_PROMPT` |
| run / run-skill-generator | 运行应用 / 生成运行 skill | run-skill-generator 只能用户 |
| lorem-ipsum | 填充文本（测试） | 调用方门控；只能用户 |

`registerBundledSkill`（`#ol`）：description 等可为函数；带 `files` 的 skill 首次调用时解压到 bundled skill 目录；`survivesBundledKillSwitch` 的 skill 在总开关关闭时保留。

### 5.5 output styles

`getOutputStyleDirStyles`（`#VEo`）：`loadMarkdownFilesForSubdir("output-styles")`（managed/用户/项目），每个 md → `{name, description, prompt, source, baseDir, keepCodingInstructions}`；`force-for-plugin` 只对插件风格有效。

### 5.6 markdown 配置加载

`loadMarkdownFilesForSubdir`（`#jEo`）对 `CLAUDE_CONFIG_DIRECTORIES = [commands, agents, output-styles, skills, workflows, routines]`（2.1.88 为 commands/agents/output-styles/skills/workflows[/templates]）：managed、用户（可走 storageV5）、项目各级、--add-dir（仅 agents）四路并行，按 inode 去重，单文件上限 1 MiB；`loadMarkdownFiles`（`#B0`）用 ripgrep `--files --follow --glob *.md`（3s 超时）或原生遍历。

### 5.7 数据结构（Hooks / Skills）

- 匹配后的钩子（`getMatchingHooks` 产出）：`{hook, pluginRoot?, pluginId?, pluginName?, skillRoot?, settingsSource?, projectRoot?, hookSource: "settings"|"plugin:<name>"|"skill:<name>", registeredInSession?, matcherIsMatchAll, matcherTexts?, deviceForwarded?, sdkHost?, hostOwnsStdin?, personal?, asOwnTool?, notTested?, throughFamilyOnly?, matcherMetThroughOtherName?, continueIsContested?}`。
- 单个钩子结果（内部）：`{outcome: success|blocking|non_blocking_error|cancelled, hook, message?, blockingError?: {blockingError, command}, permissionBehavior?, hookPermissionDecisionReason?, updatedInput?, additionalContext?, systemMessage?, preventContinuation?, stopReason?, ...}`。
- REPL 外结果：`{command, succeeded, output, blocked, watchPaths?, systemMessage?, cancelled?, answerHeld?}`。
- 会话钩子存储：`sessions: Map<sessionId, {hooks: {[event]: [{matcher, skillRoot?, personal?, checkout?, hooks: [{hook, onHookSuccess?}]}]}}>`。
- 动态 skill 状态：`{dynamicSkillDirs:Set, deferredSkillDirs:Map, dynamicSkills:Map, conditionalSkills:Map, activatedConditionalSkillNames:Set, refusedReservedNames:Map}`。

## 6. LSP 集成

### 6.1 配置来源

- 316 中 LSP 服务器**只来自插件**：`services/lsp/config.ts · getAllLspServers(storageV5, credentials)` 先调用 `loadAllPlugins`，再对每个已启用插件调用 `utils/plugins/lspPluginIntegration.ts · getPluginLspServers`（插件的 `lspServers` 字段，或插件目录里的 LSP 配置文件），把结果合并成 `{服务器名: 配置}`。任何一个插件加载失败，返回值里的 `loadFailed` 就是 true。
- 配置 schema 是 `utils/plugins/schemas.ts · LspServerConfigSchema`（`chunk-dcmhvw5a.js`，由 plugins 分支命名）。从 zod 描述读出的字段：

| 字段 | 说明 |
|---|---|
| `command`（必填） | 服务器可执行文件；含空格且不是绝对路径时报错，参数应放进 `args` |
| `args` | 命令行参数 |
| `extensionToLanguage`（必填，至少一项） | 扩展名 → LSP languageId；文件路由也靠它 |
| `transport` | `stdio` / `socket`，默认 stdio（实现只用 stdio） |
| `env` | 启动时附加的环境变量 |
| `initializationOptions` | 放进 initialize 请求 |
| `settings` | 通过 `workspace/didChangeConfiguration` 推送，同时用来回答 `workspace/configuration` 请求 |
| `workspaceFolder` | 工作区目录；缺省用 cwd |
| `startupTimeout` / `shutdownTimeout` | 毫秒 |
| `requestTimeout` | 毫秒，默认 60000（**316 新增**） |
| `restartOnCrash` | 为 false 时崩溃后不再拉起（2.1.88 是"未实现"告警，316 已实现） |
| `maxRestarts` | 默认 3 |
| `diagnostics` | 为 false 时保留跳转/悬停等导航功能，但不自动注入诊断（**316 新增**） |

- 加载出的配置还带 `pluginSource`：崩溃统计、诊断计数归到对应插件（`ax(pluginSource)` 记插件用量）。

### 6.2 生命周期与调用顺序

```
prepareSession / 启动
  → initializeLspServerManager(ctx, storageV5, credentials)        [#_F.initialize = bTs 内 ke]
      ├ isCustomizationDisabled("lspServers") → 跳过（--bare / --safe-mode 下禁用）
      ├ shouldDeferLspForRemoteSession()（远程会话 + GrowthBook tengu_moonlit_panda）→ 只记下参数、延后
      ├ createLSPServerManager(storageV5, credentials)            [#l2n]
      └ manager.initialize()  (异步，代次号防止过期回调)
            ├ getAllLspServers → 校验 command / extensionToLanguage
            ├ createLSPServerInstance(name, config)  逐个创建（不立即启动）
            └ 建立 扩展名 → [服务器名] 映射；一个扩展名多服务器时只用第一个并告警
         成功 → registerLSPNotificationHandlers(manager, ctx)       [#d2n]
插件刷新 (utils/plugins/refresh.ts、hooks/useManagePlugins.ts)
  → reinitializeLspServerManager()：关闭旧实例，用上次的参数重建
退出 → shutdownLspServerManager()
```

- 服务器是**懒启动**的：`LSPServerManager.ensureServerStarted(filePath)` 在 `sendRequest`/`openFile` 时按扩展名找到服务器，状态是 stopped 或 error 就调用 `start()`。
- `LSPServerInstance.start` → `doStart`：
  1. 受 `restartOnCrash` 与 `crashRecoveryCount > maxRestarts` 约束，超限时只记一次 `lsp_server_max_crash_recovery`。
  2. `LSPClient.start(command, args, {env, cwd, pluginId})`：在工具 cgroup（`toolCgroupClass:"lsp"`）里 spawn，`stdio` 全管道，`windowsHide`；按插件 id 合成环境变量。stderr 逐行进调试日志。
  3. 注册 `workspace/configuration`（用 `getConfigSection` 从 `settings` 按点号路径取值），忽略 `client/registerCapability` / `client/unregisterCapability`（只记日志）。
  4. `initialize`：`processId`、`clientInfo {name:"Claude Code", version:"2.1.316"}`、`initializationOptions`、`workspaceFolders`/`rootPath`/`rootUri`，能力声明：
     - `workspace.configuration = (settings != null)`、`workspaceFolders:false`、`didChangeWatchedFiles`（不动态注册）；
     - `textDocument.synchronization.didSave`、`publishDiagnostics`（relatedInformation、tagSupport [1,2]、codeDescriptionSupport）、`hover`（markdown/plaintext）、`definition`（linkSupport）、`references`、`documentSymbol`（层级）、`callHierarchy`；
     - `general.positionEncodings:["utf-16"]`。
     然后发 `initialized` 通知；可选 `startupTimeout`。
  5. 有 `settings` 时推 `workspace/didChangeConfiguration`。
- `sendRequest`：要求 `isHealthy()`（running 且已初始化）；单次请求受 `requestTimeout`（默认 60s）限制；遇到 `-32801 ContentModified` 时按 500ms × 2^n 退避，最多重试 3 次。
- 文档同步（`LSPServerManager`）：`openFile` 发 `didOpen`（文档版本号从 1 递增）；`changeFile` 发 `didChange`（全量文本，服务器未运行或文件未打开时退化为 openFile）；`saveFile` 发 `didSave`。已打开文档超过 `MAX_OPEN_DOCUMENTS = 50` 时按 LRU 发 `didClose`（**316 新增**；2.1.88 的版本号恒为 1，也没有淘汰）。
- `LSPClient` 的错误处理：进程以非 0 退出或被信号杀死时抛 `LSPServerCrashError`。被 SIGKILL 或退出码 137 时，会结合 cgroup 判断是否撞上 `CLAUDE_CODE_TOOL_MEMORY_LIMIT`，并在消息里注明。协议层读到坏消息时直接强杀进程。`stop()` 依次发 `shutdown`、`exit`，可带超时。

### 6.3 诊断如何进入对话

```
服务器 → textDocument/publishDiagnostics
  → passiveFeedback 处理器（config.diagnostics===false 的服务器不注册，上报 tengu_lsp_diagnostics_disabled）
      ├ 版本早于 manager.getDocumentVersion(uri) 的陈旧诊断丢弃（316 新增）
      ├ formatDiagnosticsForAttachment：file:// → 路径，严重级别 1..4 → 名字
      └ registerPendingLSPDiagnostic(ctx, {serverName, files})          [unattributed #yDt]
下一轮构造附件：utils/attachments.ts（#IPr）
  → checkForLSPDiagnostics(ctx)                                         [unattributed #SDt]
      = LSPDiagnosticRegistry.takePending()：按 URI 合并、内容去重、剔除已投递过的诊断，
        按严重级别排序，每文件最多 10 条、合计最多 30 条，并记入已投递 LRU（500 个文件）
编辑文件后（FileEditTool #PTs 等）→ clearDeliveredDiagnosticsForFile / clearPendingDiagnosticsForFile
```

- 316 把登记表从模块级单例改成**按会话根（`context.root`）各一份**（`lspDiagnosticRegistryByRoot = new tt(() => new LSPDiagnosticRegistry)`，基于 WeakMap），多个会话/子代理不会串诊断。新增 `clearPendingForFile`。

### 6.4 与 LSPTool 的关系

- `tools/LSPTool/LSPTool.ts`（`chunk-kxyd0g16.js#zt`）的 `isEnabled()` 是 `hasLspEverConnected()`：至少有一个服务器曾经进入非 error 状态，工具才会出现。工具 `shouldDefer:true`、只读、可并发，请求经 `getLspServerManager().sendRequest(filePath, method, params)` 转发。
- 状态展示：`hooks/notifs/useLspInitializationNotification.tsx` 读 `getInitializationStatus()`。

### 6.5 开关与环境变量

| 名称 | 作用 |
|---|---|
| `--bare` / `--safe-mode`（`CLAUDE_CODE_SAFE_MODE`） | `isCustomizationDisabled("lspServers")` 为真，不初始化 LSP |
| `CLAUDE_CODE_REMOTE`、`CLAUDE_CODE_REMOTE_SESSION_ID`、`CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE` + GrowthBook `tengu_moonlit_panda` | 远程会话延后 LSP 初始化 |
| `CLAUDE_CODE_TOOL_MEMORY_LIMIT` | 工具 cgroup 内存上限；LSP 进程被它杀死时会在错误里注明 |
| 健康指标 | `lsp_init`、`lsp_config_load`、`lsp_server_start`、`lsp_server_stop`、`lsp_request`、`lsp_diagnostics_register`、`lsp_diagnostics_deliver`、`lsp_shutdown` |
| 遥测 | `tengu_lsp_diagnostics_disabled` |

## 7. Claude in Chrome

### 7.1 三个进程角色

1. **主会话**：判定是否启用，把内置 MCP 服务器 `claude-in-chrome` 加进动态 MCP 配置，并注入 Chrome 系统提示片段。
2. **`claude --claude-in-chrome-mcp`**：内置的 stdio MCP 服务器，由主会话作为 MCP 子进程启动（`cli.js` 在 `process.argv[2]` 上做快路径分派）。它实例化 `@ant/claude-for-chrome-mcp`（`chunk-3ewc7v9f.js`，导出 `createClaudeForChromeMcpServer`、`BROWSER_TOOLS`、`BridgeClient` 等，属第三方/内部包）。
3. **`claude --chrome-native-host`**：浏览器扩展通过 native messaging 拉起的进程，在本地 socket 上把 MCP 服务器与扩展连起来。

服务器到扩展有两条链路：本地原生宿主 socket（`socketPath`/`getSocketPaths`），以及云端 WebSocket 桥 `wss://bridge.claudeusercontent.com`（staging 与本地 `ws://localhost:8765` 由 `USE_STAGING_OAUTH`/`USE_LOCAL_OAUTH`/`LOCAL_BRIDGE` 切换）。

### 7.2 启用判定与接入（主会话，`_new/prepareSession.ts · KSo` 内）

```
isClaudeInChromeAllowed()  = 组织策略 allow_claude_browser_extension            [#ox]
shouldEnableClaudeInChrome(chromeFlag)                                           [#Ivt]
  组织允许 且 OAuth 令牌作用域含 user:profile / user:office / user:ccr_inference
  → --chrome / --no-chrome 最优先
  → 远程会话（--remote 等）关闭
  → CLAUDE_CODE_ENABLE_CFC=true/false
  → 远程控制子会话需 CLAUDE_CODE_BRIDGE_CHILD_MACHINE_SETTINGS
  → 全局配置 claudeInChromeDefaultEnabled（远程 / Cowork 会话忽略该默认）
已由远程宿主经 --mcp-config 提供 → adoptHostedClaudeInChrome（只取系统提示）
被 enterprise MCP / deniedMcpServers 阻止，或处于 --safe-mode / --restricted → 跳过
否则 setupClaudeInChrome({skipReconnectAutoOpen})                                 [#Ynt]
  ├ 后台：createWrapperScript([claude, …, "--chrome-native-host"])
  │       → installChromeNativeHostManifest(wrapper)
  ├ wiredThisSession = true
  └ 返回 mcpConfig {"claude-in-chrome": {type:"stdio", command: process.execPath,
         args:["--claude-in-chrome-mcp"], scope:"dynamic", env?}},
       systemPrompt（CLAUDE_CODE_DISABLE_CFC_PROMPT=1 时为空）
```

- 会话处于 bypass 权限时，`env` 里放 `CLAUDE_CHROME_PERMISSION_MODE=skip_all_permission_checks`。
- 设了 `CLAUDE_CODE_CHROME_LATE_MCP_SERVER` 且是远程会话时，不安装原生宿主。
- 自动启用：`shouldAutoEnableClaudeInChrome` = 组织允许 + 基本资格（`hasBaseChromeOfferEligibility`）+ 有扩展证据（缓存的 `cachedChromeExtensionInstalled` 或已配对设备）+ GrowthBook `tengu_chrome_auto_enable`。
- 安装推荐：`shouldOfferChromeInstallUpsell`（unattributed `chunk-hantmvxa.js#Nt`，GrowthBook `tengu_chrome_install_upsell`）→ `runChromeInstallSetup`（`#Ot`）。

### 7.3 原生宿主安装

- 宿主名 `com.anthropic.claude_code_browser_extension`，清单文件 `<宿主名>.json`：`{name, description:"Claude Code Browser Extension Native Host", path:<包装脚本>, type:"stdio", allowed_origins:["chrome-extension://fcoeoabgfenejglbffodgkkbkcdhcgfn/"]}`。
  - 2.1.88 的 ant 构建还会加 dev/ant 两个扩展 ID；316 只有生产 ID，`getExtensionIds()` 也只返回它。
- 清单写到哪里：
  - macOS / Linux：写进每个浏览器的 NativeMessagingHosts 目录（见下表）。
  - Windows：写到 `%APPDATA%\Claude Code\ChromeNativeHost\`，再用 `reg add` 在每个浏览器的 `HKCU\…\NativeMessagingHosts\<宿主名>` 下登记清单路径。
- 包装脚本放在 `<配置目录>/chrome/`：`chrome-native-host`（`#!/bin/sh` + `exec '…' --chrome-native-host`）或 `chrome-native-host.bat`。内容没变时只修复可执行位。
- 首次写入清单、且检测到扩展已安装时，用浏览器打开 `https://clau.de/chrome/reconnect`。

| 浏览器 | macOS NativeMessagingHosts（相对 ~） | Linux（相对 ~） | Windows 注册表 |
|---|---|---|---|
| Chrome | Library/Application Support/Google/Chrome/NativeMessagingHosts | .config/google-chrome/NativeMessagingHosts | HKCU\Software\Google\Chrome\NativeMessagingHosts |
| Brave | …/BraveSoftware/Brave-Browser/NativeMessagingHosts | .config/BraveSoftware/Brave-Browser/… | HKCU\Software\BraveSoftware\Brave-Browser\… |
| Arc | …/Arc/User Data/NativeMessagingHosts | （无） | HKCU\Software\ArcBrowser\Arc\… |
| Chromium | …/Chromium/NativeMessagingHosts | .config/chromium/… | HKCU\Software\Chromium\… |
| Edge | …/Microsoft Edge/NativeMessagingHosts | .config/microsoft-edge/… | HKCU\Software\Microsoft\Edge\… |
| Vivaldi | …/Vivaldi/NativeMessagingHosts | .config/vivaldi/… | HKCU\Software\Vivaldi\… |
| Opera | …/com.operasoftware.Opera/NativeMessagingHosts | .config/opera/… | HKCU\Software\Opera Software\Opera Stable\… |

- 检测顺序：chrome、brave、arc、edge、chromium、vivaldi、opera。
- 扩展是否已安装：扫描各浏览器用户数据目录下 `Default` 或 `Profile N` 中的 `Extensions/<扩展ID>`。

### 7.4 原生宿主协议（`ChromeNativeHost`）

- 与扩展之间：stdin/stdout 上传 4 字节小端长度 + UTF-8 JSON，单条消息最大 1 MB。
- 扩展 → 宿主的消息：
  - `ping` → 回 `pong`；
  - `get_status` → 回 `status_response {native_host_version:"1.0.0", computer_name}`（**316 新增 computer_name**：macOS 取 `scutil --get ComputerName`，Windows 取 `COMPUTERNAME`，其他平台取 hostname，截断到 64 字符）；
  - `tool_response`、`notification` → 去掉 type 后，加长度前缀广播给所有 MCP 客户端。
- MCP 客户端 → 宿主：读长度前缀帧，以 `tool_request {method, params}` 转发给扩展。客户端连上、断开时分别通知 `mcp_connected`、`mcp_disconnected`。
- socket 位置：`/tmp/claude-mcp-browser-bridge-<用户名>/<pid>.sock`，目录权限 0700、socket 0600，启动时清理 PID 已不存在的 socket；Windows 用命名管道 `\\.\pipe\claude-mcp-browser-bridge-<用户名>`。

### 7.5 MCP 服务器（`runClaudeInChromeMcpServer`）

1. 加载 storageV5 与凭证，配置全局代理。
2. 检查组织策略：`checkChromeOrgPolicy`（3 s 超时）。
   - 短路规则：设了 `CLAUDE_CODE_CHROME_MCP_ORG_DENIED` 直接拒绝；第三方提供商或自定义 `ANTHROPIC_BASE_URL` 不读策略，记为 unverified。
   - 策略拒绝时打印提示并以退出码 1 退出。
3. `createChromeContext`：组装服务器上下文。
   - `bridgeConfig.getUserId`：按 OAuth 令牌解析账户 UUID。与持久化登录的账户不一致时上报 `tengu_chrome_bridge_account_mismatch`，并以令牌对应的账户为准。
   - `getOAuthToken`：令牌先经 `createBearerGate` 校验，被组织拒绝的令牌不交给桥。
   - `onToolCallDisconnected`：按情形返回给模型的长篇排障提示，包括账户不一致、配对设备不可达、远程会话、未安装扩展等。
   - `onExtensionPaired`：把 `chromeExtension.{pairedDeviceId,pairedDeviceName}` 写入全局配置。
   - 工具调用超时：`browser_batch` 为 90 s，其余为库的缺省值。
   - `trackEvent`：只放行白名单字段（`SAFE_BRIDGE_STRING_KEYS`）。
4. `createClaudeForChromeMcpServer(ctx)`，接到 `StdioServerTransport`。stdin 结束时退出。

- 工具清单来自 `chunk-srrcw01s.js`：`javascript_tool`、`read_page`、`find`、`form_input`、`computer`、`browser_batch`、`navigate`、`resize_window`、`gif_creator`、`upload_image`、`get_page_text`、`tabs_context_mcp`、`tabs_create_mcp`、`tabs_close_mcp`、`read_console_messages`、`read_network_requests`、`shortcuts_list`、`shortcuts_execute`、`file_upload`、`switch_browser`、`list_connected_browsers`、`select_browser`。
  - 其中 `file_upload`、`browser_batch` 在部分会话里受限，附带专门的拒绝文案。
  - 工具名前缀是 `mcp__claude-in-chrome__`。
  - 终端显示：`Claude in Chrome[<tool>]`，带 `[View Tab]` 超链接 `https://clau.de/chrome/tab/<tabId>`。

### 7.6 环境变量 / 配置键 / 开关

- 环境变量：`CLAUDE_CODE_ENABLE_CFC`、`CLAUDE_CODE_DISABLE_CFC_PROMPT`、`CLAUDE_CODE_CHROME_LATE_MCP_SERVER`、`CLAUDE_CODE_CHROME_MCP_ORG_DENIED`、`CLAUDE_CHROME_PERMISSION_MODE`（ask / skip_all_permission_checks / follow_a_plan）、`CLAUDE_CHROME_PAIRED_DEVICE_ID`、`CLAUDE_CHROME_TAB_GROUP_KEY`（形如 `chat:<小写 UUID>`；一个进程承载多个会话时忽略）、`CLAUDE_CODE_BRIDGE_CHILD_MACHINE_SETTINGS`、`USE_LOCAL_OAUTH`、`LOCAL_BRIDGE`、`USE_STAGING_OAUTH`、`CLAUDE_CODE_OAUTH_TOKEN`、`CLAUDE_CODE_ACCOUNT_UUID`。
- 全局配置键：`claudeInChromeDefaultEnabled`、`cachedChromeExtensionInstalled`、`chromeExtension.pairedDeviceId`、`chromeExtension.pairedDeviceName`、`chromeInstallUpsellDismissed`。
- 组织策略：`allow_claude_browser_extension`。
- GrowthBook：`tengu_chrome_auto_enable`、`tengu_chrome_install_upsell`。
- 遥测与健康指标：`tengu_claude_in_chrome_setup`、`tengu_claude_in_chrome_setup_failed`、`chrome_open_url`、`chrome_native_host_install`、`chrome_native_host_run`、`chrome_mcp_server_start`。

## 8. Computer Use

- **CLI 本机路径在 316 公版里已不存在**：
  - 2.1.88 的 `cli.tsx` 有 `feature('CHICAGO_MCP') && argv[2]==='--computer-use-mcp'`；316 的 `cli.js` 只剩 `--claude-in-chrome-mcp`、`--chrome-native-host`、`--eval-mock-server` 三个快路径。
  - 原文件位置（`computerUse/mcpServer.ts`、`gates.ts` 的 `getChicagoEnabled`、`computerUseLock.ts`、`appNames.ts`）在 316 中匹配到的都是无关代码。
  - linux 构建中 `requireComputerUseSwift()` 和 `createCliExecutor()` 都直接抛 "macOS-only"。
  - `@ant/computer-use-swift` 的 CommonJS 包裹（`chunk-ha3km179.js` 里的 `Cl`，读 `COMPUTER_USE_SWIFT_NODE_PATH` 或 `prebuilds/computer_use.node`）在本构建中第一句就抛错。
- **托管桌面路径（316 新增）**：
  - `shouldWireHostedDesktopComputerUse`（unattributed `chunk-j51xvqzq.js#wDs`）的条件：`isHostedDesktopSession`（`CLAUDE_CODE_REMOTE && CLAUDE_CODE_HOSTED_DESKTOP`），非 HIPAA 组织，且 GrowthBook `tengu_dapper_acorn` 为真。
  - 满足时 prepareSession 合入 `getHostedDesktopComputerUseConfig()`（`chunk-e6aww6q8.js#qVs`）：`{"computer-use": stdio /opt/cu-desktop/cu-desktop mcp, scope dynamic}`，只读动作（screenshot、zoom、cursor_position、wait）加入 allow 规则。
  - `services/mcp/config.ts` 中，用户自己配置的、指向 cu-desktop 的服务器会被跳过，并提示 "Claude Code registers the desktop itself"。
  - 工具名清单 `CU_TOOL_NAMES`（`chunk-dcmhvw5a.js#C_r`）在 2.1.88 的基础上新增 `app_*`（app_click、app_type、app_screenshot…）、`teach_*`、`request_full_control`/`release_full_control`、`computer_batch`、`list_apps` 等。
- **会话状态**：`ComputerUseSession`（unattributed `chunk-hwmsct5x.js#mf`，按宿主各一份，通过 `getComputerUseSession()` 取得），字段有 `binding`、`currentToolUseContext`、`callsInFlight`、`unregisterLockCleanup`、`activeThisTurn`、`runLoopPump`/`runLoopPumpRetainCount`、`escHotkeyRegistered`、`frozenCoordinateMode`、`hostAdapter`、`swiftModule`、`inputModule`。
- **run loop**：`drainRunLoop(fn, 30s)` 对泵做引用计数，每 1 ms 调一次 Swift `_drainMainRunLoop`；原生调用超时时抛 `computer-use native call exceeded …ms`。
- **ESC**：
  - `unregisterEscHotkey` 注销 Swift 热键并释放泵；
  - `notifyExpectedEscape` 让程序自己发出的 ESC 不被当成用户中断；
  - 注册函数没有在本组里找到（`registerEscHotkey` 的旧版匹配是错的）。
- **回合结束**：`cleanupComputerUseAfterTurn`（被 `query.ts`、`query/stopHooks.ts` 调用）
  1. 先恢复本回合隐藏的应用，最多等 5 s，超时上报 `computeruse_turn_cleanup/unhide_timeout`；
  2. 本回合用过 computer-use 时，再注销 ESC 热键，并产出 `os_notification`："Claude is done using your computer"（类型 `computer_use_exit`）。
- **执行器辅助**（`chunk-hrs3dad1.js`，供 macOS 构建使用）：
  - `typeViaClipboard`：pbpaste 备份 → pbcopy → 回读校验 → Cmd+V → 恢复原剪贴板；
  - `animatedMove`：ease-out cubic、60 fps、最长 0.5 s；
  - `withModifiers`：按住修饰键执行操作，结束后释放；
  - `MOVE_SETTLE_MS = 50`。
- 渲染：`getBuiltinMcpRenderOverride`（`chunk-ah34pb7m.js#u1`）按 MCP 工具的 `builtinRenderFamily`（`claude-in-chrome` / `computer-use`）选用内置渲染；computer-use 的结果摘要见 `RESULT_SUMMARY`（Captured、Clicked、Typed…）。

## 9. 深链接 `claude-cli://`

### 9.1 URL 格式（`parseDeepLink`）

- 也接受 `claude-cli:` 不带 `//` 的写法。
- `claude-cli://open?q=<prompt>&cwd=<绝对路径>&repo=<owner/repo>`：三个参数都可选。
  - `q`：Unicode 规范化，CRLF 转 LF，拒绝控制字符，不超过 5000 字符。
  - `cwd`：必须是绝对路径；拒绝 UNC/网络路径、`..` 段、控制字符、不可见字符和双向控制字符、超过 4096 字符的路径，以及经网络链接解析出来的路径。
  - `repo`：必须匹配 `owner/repo`。
- `claude-cli://install-plugin?plugin=<名>&marketplace=<源>`（**316 新增**）：
  - `plugin`：ASCII 字母、数字和 `. _ -`，不超过 100 字符。
  - `marketplace`：缺省为官方市场。允许 GitHub `owner/repo`、`https://` URL 或 `git@host:owner/repo.git`；可以用 `#ref` 或 `@ref` 指定 git ref（URL 里写成 `%23`，裸 `#` 直接报错）。禁止百分号编码和 `.`/`..`/空段；官方市场不能钉 ref；总长不超过 256。

### 9.2 处理流程

```
OS 调用 claude --handle-uri <uri>   （cli 早期分派，chunk-shkzs7rp）
  → handleDeepLinkUri(uri)                                         [#ae]
      parseDeepLink → open: resolveCwd（cwd；否则按 repo 在已知本地克隆中找；否则家目录）
                            + readLastFetchTime（.git/FETCH_HEAD 的 mtime）
                    → install-plugin: cwd=家目录，query=预置的安装插件提示
      launchInTerminal(execPath, action)                            [#y]
        detectTerminal → macOS / Linux / Windows 检测
        参数：--deep-link-origin、--deep-link-repo=、--deep-link-last-fetch=、
              --deep-link-cwd-b64=、--prefill-b64=（base64url，避免 shell 转义问题）
新会话启动（prepareSession）：--deep-link-origin 存在时解码 --prefill-b64 / --deep-link-cwd-b64，
  切换 originalCwd；REPL 显示 buildDeepLinkBanner（来源目录、仓库最近 fetch 时间与是否陈旧、
  "review carefully before pressing Enter"，prompt 过长时提示滚动查看）
```

- 终端清单：
  - macOS：iTerm2、Ghostty、Kitty、Alacritty、WezTerm、Terminal.app。选择顺序是全局配置 `deepLinkTerminal` → `TERM_PROGRAM` → `mdfind` 查 bundle id → `/Applications`，最后默认 Terminal.app。启动方式：iTerm 和 Terminal 用 AppleScript，其余用 `open -na … --args`；失败时回退 Terminal.app。
  - Linux：先看 `$TERMINAL`，再看 `x-terminal-emulator`，然后依次尝试 ghostty、kitty、alacritty、wezterm、gnome-terminal、konsole、xfce4-terminal、mate-terminal、tilix、xterm。
  - Windows：依次尝试 wt.exe、pwsh.exe、powershell.exe，最后用 cmd.exe（`ComSpec`）。
- 终端进程用 detached 方式启动并 `unref`；带 cwd 启动失败时不带 cwd 再试一次。

### 9.3 协议注册（`ensureDeepLinkProtocolRegistered`，由 `utils/backgroundHousekeeping.ts` 后台调用）

- 设置 `disableDeepLinkRegistration: "disable"` 时完全不注册。
- 已注册且指向当前 claude 路径时直接返回。判断方法：macOS 读符号链接，Linux 看 .desktop 的 Exec 行，Windows 用 `reg query`。
- 24 小时内注册失败过就跳过。失败标记写在 `<配置目录>/.deep-link-register-failed`；启用 storageV5 时改写到 `state/deep-link-register-failed`。只有 EACCES 和 ENOSPC 两种错误会写失败标记。
- 各平台的注册方式：
  - **macOS**：在 `~/Applications/Claude Code URL Handler.app` 写 Info.plist（`CFBundleIdentifier com.anthropic.claude-code-url-handler`，`CFBundleURLSchemes [claude-cli]`，`LSBackgroundOnly`），把 `Contents/MacOS/claude` 软链到 claude，再执行 `lsregister -R`。
  - **Linux**：写 `$XDG_DATA_HOME/applications/claude-code-url-handler.desktop`（`Exec="<claude>" --handle-uri %u`，`MimeType=x-scheme-handler/claude-cli`），有 `xdg-mime` 时把它设为默认处理器。
  - **Windows**：在 `HKCU\Software\Classes\claude-cli` 写 `URL:Claude Code URL Handler` 和 `URL Protocol`，并把 `shell\open\command` 设为 `"<claude>" --handle-uri "%1"`。
- 健康指标：`deep_link_register`、`deep_link_handle`。

## 10. 与 2.1.88（旧版）的差异

### 10.1 MCP

1. **两代 SDK 并存 + 协议版本协商**：88 只有 `initialize`；316 v2 先 `server/discover`（2026-07-28 协议），按结果走 modern 或回退 legacy，并持久化 legacy 判定（`mcp-discover-verdicts.json`）；全部协商代码 88 中不存在（grep `server/discover`、`MCP_PROTOCOL_NEGOTIATION`、`subscriptions/listen` 在 88 源码为 0）。
2. 作用域新增 `agent`；类型新增 `cached` 连接状态；配置新增 `tools[].permission_policy`、`toolPermissions`、`discoveryCache`、`bareElicitationCapability`、`role`、`request_timeout_ms`、`managedMcpServers`（88 均无）。
3. claude.ai 连接器：stateless 连接器本地应答握手、`/v1/mcp_servers` 的 discover 投影、additional_install 兄弟连接器、`include_additional_installs` 降级重试。
4. 描述截断上限从固定 2048 改为可配置 4096（ToolSearch 加载 16384）；工具 `_meta` 新增 `anthropic/requiresUserInteraction` 等。
5. 工具空闲超时（`CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT`）、远程批量连接默认 20、发现缓存（`mcp-discovery-cache`，加密封存、失败计数）为 316 新增。
6. OAuth：CIMD（client metadata document）、issuer 回显校验（RFC 9207）、step-up 对话框、CLI 自有 bearer、一方 Design 连接器门控均为新增；XAA 在 88 已有雏形，316 v2 额外校验回调 `iss`。
7. 组织策略支持 `${VAR}` 展开与不安全展开检测；`managed-mcp.json` 解析失败也保持独占。
8. 重连常量与 88 相同（5 次，1 s–30 s）；默认工具总超时同为 1e8 ms；本地批量默认 3 同 88。

### 10.2 插件

- **新增 manifest 组件**：`themes`、`workflows`、`monitors`（后台常驻命令，输出作为 `<task_notification>`）、`binaries`（sha256 钉住的可执行文件）、`types`（.d.ts 契约）、`experimental{…, syntaxHighlighting, evals}`、`defaultEnabled`、`displayName`、`metadata`；hooks.json 新增 `modules`（JS hooks 模块，`register(on)`）。旧版 schemas.ts 中这些字段均不存在（grep 计数为 0）。
- **新增插件来源**：`archive`（https zip + sha256）、`command`（本地命令产出目录，copy/link 模式，需同意，可被策略禁用）、`unsupported` 占位；**删除** `pip` 插件来源（旧版 schemas.ts:1090 有 `source: 'pip'`，316 只剩“预留”文案）。
- **新增市场机制**：`<package>@npm` npm 通道（保留市场名 npm）、`skills-dir` 自动加载 `~/.claude/skills/` 为插件、`synced`（claude.ai 账号同步插件）、内置“插件目录”市场 `anthropic-plugin-directory`（`disablePluginDirectory`、`allow_plugin_directory_search`）、`renames`、`relevance`（“Working with X?” 提示与推荐）、`headersHelper`、官方市场 GCS 镜像、种子目录、`claudeai-` 托管市场前缀。
- **存储后端 V5**：几乎所有缓存/记录读写都有 `storageV5` 分支（作用域化存储、符号链接拒绝、`.links_materialized`），由 `tengu_hover_rest` 开关控制；旧版无此概念。
- **安全加固**：manifest/组件路径的符号链接逃逸检查（`assertManifestContained`、`reportIfPathEscapes`）、archive URL 拒绝回环/元数据地址、来源脱敏（`redactMarketplaceSource`）、官方名防仿冒扩展（逐词拼接检测）。
- **CLI**：新增 `init`、`tag`、`test`、`details`、`prune`、`configure`、`eval`、`validate --strict/--json`；旧版只有 install/uninstall/enable/disable/update/list/validate/marketplace。
- `gitAvailability.ts` 在 316 不再是独立模块（git 可用性检测并入 `ffn`/全局 `gitAvailable`，chunk-e6aww6q8 part-104）。

### 10.3 Hooks / Skills

1. 事件：新增 PostToolBatch、UserPromptExpansion、PreModelSwitch、PostModelSwitch、DirectoryAdded、MessageDisplay（`#yc` 与旧 `coreTypes.ts HOOK_EVENTS` 对比）；SessionEnd reason 去掉 `bypass_permissions_disabled`。
2. 钩子类型：新增 `mcp_tool`；command 新增 `args`（exec 形式）、`onFailure`、`rewakeMessage`、`rewakeSummary`、`cloud`；http 新增 `onFailure`、`cloud`；prompt 新增 `continueOnBlock`（旧 `schemas/hooks.ts` 无这些字段）。内部新增 `script` 类型（mods/设备）。
3. 输出：权限决定新增 `defer`（旧 `permissionBehaviorSchema` 只有 allow/deny/ask）；新增 `terminalSequence`、UserPromptSubmit 的 `sessionTitle`/`suppressOriginalPrompt`、SessionStart 的 `sessionTitle`/`reloadSkills`、PostToolUse 的 `updatedToolOutput`/`classifierContext`、Stop/SubagentStop 的 `additionalContext`、MessageDisplay 的 `displayContent`、PreModelSwitch 权限决定。
4. prompt 钩子：Stop 系事件包装为“停止条件”判断并支持 `impossible`；提示过长时减半历史重试。
5. agent 钩子：最多 50 轮、模型被拒回退主模型、served call 无 transcript。
6. 新增大量安全加固：stdio 截断不采信、PreToolUse 钩子未完成即拒绝、云端 served call 钩子扣留、`CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG`、http 钩子 env 一致性检查、凭证类变量不插值、插件 shell 形式禁用 `${user_config.*}`。
7. Skills：frontmatter 新增 `disallowed-tools`、`background`、`fallback`、`metadata`、`created_by`、`experimental.cachettl`；新增同步 skills（syncedSkills）、host catalog、storageV5 后端、保留名拒绝；`CLAUDE_CONFIG_DIRECTORIES` 新增 `routines`、去掉 `templates`。
8. 内置 skill 大幅变化：2.1.88 的 verify/stuck/skillify/remember/simplify/loremIpsum/loop 等在 316 的同一位置已是 cowork-plugin、dataviz、design、memory-types 等（旧版名匹配多处错误，见第 7 节）；新增 design、artifact-*、dataviz、claude-code-docs、workflow-authoring、run、send-to-project、doctor、fewer-permission-prompts、commit/pr/code-review 作为 skill。

### 10.4 LSP / Chrome / Computer Use / 深链接

| 项 | 2.1.88 | 316 | 证据 |
|---|---|---|---|
| LSP 诊断登记表 | 模块级 Map + 导出函数 | 类 `LSPDiagnosticRegistry`，按会话根各一份（WeakMap） | `chunk-e6aww6q8.js#gDt`、`#jG`、`#yDt…#Kfn` |
| LSP 管理器 | 模块级变量 + 导出函数 | 工厂 `bTs()` 返回对象，单例 `_F` 再解构导出；新增 `hasEverConnected` 与代次号 | `#bTs`、`#_F` |
| LSPTool 启用条件 | 当前已连接 | 曾经连接过（`hasLspEverConnected`） | `chunk-kxyd0g16.js#zt` |
| `restartOnCrash` | 未实现，配置了会告警 | 已实现：为 false 时崩溃后拒绝重启 | `#a2n` |
| `workspace/configuration` | 不声明、不支持 | 按 `settings` 应答，并声明 `configuration` 能力 | `#a2n`、`#pTs` |
| 文档版本、didClose | 版本恒为 1；有显式 closeFile 发 didClose，没有淘汰 | 版本递增；超过 50 个已打开文档时按 LRU 发 didClose；丢弃陈旧版本的诊断 | `#l2n`、`#d2n` |
| 请求超时 | 无 | `requestTimeout`，默认 60 s | `#mTs`、schema |
| 按服务器关闭诊断注入 | 无 | `diagnostics:false` | `#d2n`、schema |
| LSP 进程隔离 | 普通 spawn | 工具 cgroup `lsp`，能判断是否被内存上限杀掉 | `#Pa`、`#Bn` |
| 远程会话延后 LSP | 无 | `tengu_moonlit_panda` | `#UFo` |
| 原生宿主 status | 只有 `native_host_version` | 增加 `computer_name` | `chunk-ncz9bgnh.js#S` |
| 原生宿主清单 origin | 生产 ID；ant 构建另加 dev/ant ID | 只有生产 ID | `#FH`、`chunk-s61vbvea.js#OH` |
| Chrome 启用条件 | 本地开关 | 组织策略 `allow_claude_browser_extension` + OAuth 作用域检查 + 远程宿主托管 + 自动启用 + 安装推荐 | `#Ivt`、`#eqo`、`chunk-hantmvxa.js#Nt` |
| Chrome MCP 服务器 | 直接启动 | 启动前检查组织策略、bearer 门控、账户不一致检测、配对设备与 tab group 环境变量、多组织提示 | `chunk-ztt2k9pv.js#Xe`、`#j` |
| Chrome 工具 | 旧版 ChromeToolName 列 17 个（含 update_plan） | 工具名表 22 个：新增 `browser_batch`、`file_upload`、`switch_browser`、`list_connected_browsers`、`select_browser`、`tabs_close_mcp`；渲染仍保留 update_plan 分支 | `chunk-srrcw01s.js`、旧版 toolRendering.tsx 第 15 行 |
| computer-use | CLI 本机 MCP（`--computer-use-mcp`，CHICAGO_MCP） | 公版里没有 CLI 入口；新增托管桌面 cu-desktop，工具集扩充 | `cli.js` 快路径、`chunk-e6aww6q8.js#qVs`、`chunk-dcmhvw5a.js#C_r` |
| 深链接动作 | 只有 `open` | 新增 `install-plugin`；cwd 校验加强（UNC、`..`、网络链接） | `chunk-8gzm4s8j.js` |
| 深链接参数 | `--prefill`、`--deep-link-repo`（明文） | 改用 base64url 的 `--prefill-b64`、`--deep-link-cwd-b64`；拼进 shell 的字符有白名单 | `chunk-bh9w80kx.js#p`、`#f` |
| 协议注册失败标记 | 文件 | 文件，或 storageV5 的 state 键 | `#lCs` |

## 11. 未解之处

### 11.1 MCP

- `chunk-r1g76qsy.js#Ra`（`McpResponseCache`）：被切进 channelNotification.ts，实为 SDK 内部响应缓存，按 `ttlMs/cacheScope` 使用的完整策略未追。
- `chunk-0qyh5wah.js#Z4n` 发现缓存（加密封存、admission purge、strike-threshold）细节未逐行核实；文件路径 `<配置目录>/mcp-discovery-cache/`。
- `chunk-8t8n4kdh.js#yc`/`Cc`（subscriptions/listen 重开与 park 调参，`tengu_mcp_listen_reopen_park_tuning`）未细读。
- `chunk-z1n5m6nf.js#xt`（callMCPTool）只读了主干，v2 对应实现在 `_unattributed/chunk-8t8n4kdh/part-009.js`（`chunk-8t8n4kdh.js#Jn`，约 15.6 KB），未逐行比较两代差异。
- `chunk-aepeg2w5.js#PV` 官方 MCP 注册表 / directory BFF 的可见性规则（`tengu_mcp_directory_bff`、`tengu_mcp_directory_visibility`）未细看。
- 第 3 节 stdio 探测"兄弟进程"（`chunk-r1g76qsy.js#Sh`）在 316 v2 客户端里是否实际启用：CLI 的 stdio 传输 `Ht` 继承 SDK 基类，`_dispose` 存在于 chunk-8t8n4kdh 的 `jr` 类上，按 `fh()` 判定应启用，但未运行验证。

### 11.2 插件

- `chunk-e6aww6q8.js#zKn`（loadCachedMarketplacePlugin）与 `#KKn`（finishMarketplacePluginLoad）参数众多，仅给了函数名，参数语义未逐一确认。
- `chunk-pp50kewz.js#Ut`（finishReplaceSwitch，22 KB）只读了开头，--replace 的设置迁移细节未完整梳理。
- `chunk-e6aww6q8.js#kX`（loadPluginHooks）里 hooks 模块“wake/rollout flag”状态机（`hooksModulesSwitchRead`、`hookModulesAwaitTrust`）未完全理清，相关小函数名置信度 0.45–0.55。
- `chunk-s61vbvea.js#Ont/QA`（被归到 reconciler.ts）是环境变量危险名单（DYLD_/LD_ 等），用途应属沙箱/hooks 环境清洗，未追到调用方。
- 存储后端 V5（`tengu_hover_rest`）的存储接口实现（`read/write/update/deleteScope/ensureScope/statMeta`）位于 _unattributed，未分析。

### 11.3 Hooks / Skills

- `chunk-e6aww6q8.js#Snt`（mcp_tool 钩子执行，unattributed）未细读：`input` 插值规则与结果映射只从 schema 描述得知。
- `chunk-e6aww6q8.js#Hge`（钩子不运行原因判定，含 owed/holds）与 mods（`Gb()`）体系属于另一子系统，未展开。
- `chunk-e6aww6q8.js#Tqs`（旧名 hasHookForEvent）实际是按代理钩子调整权限模式，归属与命名存疑。
- `chunk-dcmhvw5a.js#Zxi` 语句中的常量 24576 用途未确认（未命名）。
- frontmatter `fallback`、`background` 字段的消费方未追踪。
- `chunk-e6aww6q8.js#rPn`（getSessionEndHookTimeoutMs）等 SessionEnd 预算函数中 `jnt`（组织 SessionEnd 超时）与 `AQ(...)` 的含义只部分读懂。

### 11.4 LSP / Chrome / Computer Use / 深链接

- `chunk-bss4k1z9.js#Jr`（旧版名 registerEscHotkey）实际是 UI 主题函数，ESC 热键的**注册**代码没有找到（可能只在 darwin 构建里）。
- `chunk-aepeg2w5.js#zos`（旧版名 initializationState）是 `return null` 后跟一段不可达代码，用途不明。
- macOS 构建里 `createCliExecutor` 和 Swift 加载的真实实现在本 ELF 中看不到；第 4 节的执行器辅助函数在 linux 构建中没有调用方。
- `chunk-dcmhvw5a.js#C_r` 里的 `Vxi = ["region","duration"]`（暂未命名）与 `HOSTED_DESKTOP_ONLY_MESSAGE` 的使用方在 `_unattributed`，语义只有推断。
- `chunk-dxdtyerk.js#V`：带某种终端特性的终端集合（含 JetBrains IDE），具体是哪种特性没有确认。
- `@ant/claude-for-chrome-mcp`（`chunk-3ewc7v9f.js` 等）没有读，桥协议与工具实现不在本组范围。

切分与匹配的修正建议不放在本手册，见 `docs/process/domain-extensions.md`。
