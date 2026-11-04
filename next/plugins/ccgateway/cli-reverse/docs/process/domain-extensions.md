# dom-extensions 过程记录（第二阶段，领域 extensions）

## 1. 范围

`analysis/segments/domains.json` 的 `extensions` 键。开工时 154 个模块、2,753 个声明、1.49 MB；07:00 lead 更新切分（门面导出强制同模块、一对多克隆不再决定归属）后为 **163 个模块、2,588 个声明**（多出 9 个 `_new/` 模块，没有模块被移走）。

## 2. 做法

1. 盘点：`artifacts/tmp/extensions/inventory.mjs`（模块大小）、`status.mjs`（每个顶层绑定当前名字来源，输出 `status.jsonl`）。开工时 2,999 个顶层绑定里 1,838 个仍是压缩名、113 个是自动名。
2. 写校验器 `artifacts/tmp/extensions/validate.mjs`：语义条目的 `file+key` 必须是 `original/` 里真实且未冻结的绑定（用 `tools/rename/lib/rename.mjs#bindingsOf`），名字合法、不是保留字/全局名，来源 semantic，置信度 0.6–0.95，同键不冲突；docs 的 id 必须在 `decl-path.jsonl`；模块键必须属于本领域。
3. 按子系统分成四组并行（MCP 30 个模块、插件 49 个、Hooks+Skills+frontmatter 42 个、LSP/Chrome/Computer Use/深链接 33 个），每组产出 `artifacts/tmp/extensions/parts/<组>.{semantic.jsonl,docs.jsonl,modules.json,notes.md}`，生成器与规格文件都在 `artifacts/tmp/extensions/`（`mcp-build.sh`、`plugins-gen.mjs`+`plugins-spec-*.txt`、`hs-build.mjs`+`hs.raw*.psv`、`misc-gen.mjs`+`misc-spec/`），改规格后重跑即可复现。
4. 补缺：切分更新后，被导出但没有 doc 的 189 个声明补写进 `parts/fill.docs.jsonl`（生成器 `docfill-gen.mjs` + `docfill.psv`）；9 个新 `_new/` 模块由 `newmods-names.mjs` 生成 `parts/new.*`。
5. 合并：`merge.mjs` 把各组合并成正式交付物，**门面原名优先**（与 `analysis/names/facade.jsonl` 同键不同名的语义条目丢弃，共 121 条，另 36 条与门面同名），组间同键冲突 0；与其他领域 semantic 表同键不同名的 7 条只报告（见第 5 节）。报告在 `artifacts/tmp/extensions/merge-report.json`。
6. 手册：`assemble.mjs` 把 `overview.md`（概述与时序）和四组 notes 按统一章节组装成 `docs/handbook/extensions.md`，并把被门面名取代的语义名在文中替换成门面名（9 处）。

## 3. 交付物与数量

| 文件 | 内容 |
|---|---|
| `naming/semantic-extensions.jsonl` | 2,404 条（MCP 843、插件 695、Hooks/Skills 381、LSP/Chrome/CU/深链接 447、新模块 38）；其中约 160 条是 `_unattributed` 里手册要引用的关键一方函数（置信度 ≤0.8，note 标 unattributed）；约 120 条覆盖了配错的旧版名（note 写了原因） |
| `naming/docs-extensions.jsonl` | 1,700 条 |
| `naming/modules-extensions.json` | 163 个模块，全覆盖 |
| `docs/handbook/extensions.md` | 约 130 KB，12 章：概述/时序、模块地图、MCP、插件、Hooks、Skills、LSP、Chrome、Computer Use、深链接、与 2.1.88 差异、未解之处 |

置信度分布：≥0.85 共 227 条，0.75–0.85 共 726 条，<0.75 共 1,413 条（多数是参数和局部变量）。

**覆盖率**（按当前切分，`coverage.mjs`）：
- 顶层绑定 2,915 个（不含 import）：semantic 1,375、facade 285、reference 708、auto 38、**仍是压缩名 509**。剩下的压缩名大多是：多声明 `var` 里的次要常量、空函数桩、误归到本领域的第三方/无关小函数（见第 5 节），以及语义不确定、宁缺毋滥的。
- 被导出的声明 972 个，有 doc 的 894 个（92%）；函数/类 2,226 个，有 doc 的 1,346 个。没写 doc 的导出声明主要是 07:31 后又一次切分变动新划进来的，以及归错文件的小工具函数。

## 4. 主要发现（详见手册）

- 316 里有**两代 MCP 客户端**（v1 `chunk-z1n5m6nf` 等 / v2 `chunk-8t8n4kdh` 等），由 `chunk-5br6r47d.js#rD` 按 `MCP_SDK_GENERATION` 或 GrowthBook `tengu_brindle_causeway`（默认 v2）选择。阅读树里 client/auth/xaa/xaaIdpLogin/elicitationHandler 都有两份。
- v2 握手：auto 模式先发 `server/discover`（协议 2026-07-28），-32601 等回退 `initialize`+`notifications/initialized`；legacy 判定持久化在 `<配置目录>/state/mcp-discover-verdicts.json`（远程 1 天、stdio 7 天）；stateless claude.ai 连接器本地应答握手。协商模式 `resolveVersionNegotiation`（`chunk-8t8n4kdh.js#wr`）。
- MCP 工具默认全部延迟加载（`alwaysLoad` 除外）；描述上限 4096（ToolSearch 加载时 16384），2.1.88 固定 2048。作用域新增 `agent`，连接状态新增 `cached`。
- Hooks 事件 33 个（新增 PostToolBatch、UserPromptExpansion、PreModelSwitch、PostModelSwitch、DirectoryAdded、MessageDisplay），新增 `mcp_tool` 钩子类型、`defer` 权限决定等返回字段。
- 插件 manifest 新增 themes/workflows/monitors/binaries/types/experimental/defaultEnabled；来源新增 archive、command，删去 pip；存储后端 V5（`tengu_hover_rest`）；CLI 新增 init/tag/test/details/prune/configure/eval。
- LSP 配置只来自插件 `lspServers`；新增 `restartOnCrash`、`workspace/configuration`、`requestTimeout`、文档 LRU。Computer Use 在 linux 公版里没有本机入口，新增托管桌面路径（`tengu_dapper_acorn`）。

## 5. 给 lead 的建议

### 5.1 与其他领域命名表的冲突（同一绑定，不同名字；合并时由优先级决定，建议人工二选一）

| 绑定 | extensions | 对方 |
|---|---|---|
| chunk-8t8n4kdh.js@78180 | isSessionMethod | isSessionHandshakeMethod（tools） |
| chunk-8t8n4kdh.js@78237 | classifyRpcRejection | classifyMcpRpcErrorCode（tools） |
| chunk-8t8n4kdh.js@78429 | classifyHandshakeRejection | classifyMcpConnectError（tools） |
| chunk-8t8n4kdh.js@29819 | writeDiscoverVerdicts | writeMcpDiscoverVerdicts（permissions） |
| chunk-dcmhvw5a.js@71749 | isClaudeAiConnectorConfig | isClaudeAiProxyServer（ui） |
| chunk-byeye1yp.js@206 | isStorageV5Enabled | isHoverRestEnabled（bootstrap） |
| chunk-byeye1yp.js@233 | pinStorageV5Flag | pinHoverRestDecision（bootstrap） |

这几处都是 MCP / 插件代码，建议以 extensions 的名字为准（`chunk-byeye1yp` 两条：开关 `tengu_hover_rest` 的语义是"存储后端 V5"，bootstrap 的名字只描述了开关名）。

### 5.2 匹配规则建议

- **低分同名的一对多匹配不应参与文件归属**：`utils/markdownConfigLoader.ts` 收了约 25 个 `getFileIdentity_N` 一类、来自十几个 chunk 的低分误配；`skills/loadSkillsDir.ts` 的 `parseSkillPaths_N`、插件模块里的 `formatFailureDetails_N`、`convertDirectoryToZipInPlace_N` 同类。07:00 的"一对多克隆不再决定归属"已部分解决，剩余的见下。
- **MCP v1/v2 两代副本**：建议在阅读树里把 v1 副本放到 `services/mcp/v1/`（或在模块头注明），否则 client.ts 里会出现两套同名函数（引擎加 `_2` 后缀，读者分不清哪个是默认路径）。v1/v2 声明对照表由 `artifacts/tmp/extensions/mcp-pair.mjs` 生成（`mcp-names-pairs.txt`）。
- **第三方交给 vendor**：两代 `@modelcontextprotocol/sdk`（`chunk-z1n5m6nf.js#Bt` 旧 Client；`chunk-r1g76qsy.js` 新 Client，带 Anthropic 改动）、`@ant/claude-for-chrome-mcp`（`chunk-3ewc7v9f.js`）、`@ant/computer-use-swift` / `@ant/computer-use-input` 包裹；`chunk-7vp249v4.js#PluginManifestSchema` 实为 zod 内部 strictObject（115 处引用）。

### 5.3 逐条修正（格式 `声明 id → 应归属路径/应叫什么，证据`）

#### MCP

格式：`声明 id → 应归属路径/应叫什么，证据`。

**_unattributed 中明显属于 MCP 的一方代码**
- `chunk-8t8n4kdh.js#Wt` → services/mcp/client.ts（connectToServer，v2）。字符串 "SSE transport initialized"、`new cLo({name:"claude-code"…})`，与 v1 `chunk-z1n5m6nf.js#Xe`（已匹配 connectToServer）结构一致。
- `chunk-8t8n4kdh.js` 25800–53597 与 71153–80486 全部（discover 判定持久化、握手跟踪、stateless 本地应答、step-up、版本协商、listen 订阅、`listAllPages` 等）→ services/mcp/client.ts（或新建 services/mcp/discoverVerdicts.ts、services/mcp/versionNegotiation.ts；88 无对应文件）。证据：字符串 `[mcp]`、`server/discover`、`mcp-discover-verdicts`、`MCP_PROTOCOL_NEGOTIATION`。
- `chunk-8t8n4kdh.js#Jn`（part-009，15.6 KB）→ services/mcp/client.ts（callMCPTool v2），与 `chunk-z1n5m6nf.js#xt` 特征对应。
- `chunk-dcmhvw5a.js` 65299–71956（part-012：`McpStdioServerConfigSchema`、`McpSSEServerConfigSchema`、`McpHTTPServerConfigSchema`、`McpServerConfigSchema`、`McpJsonConfigSchema`、`managedMcpServers` 校验）→ services/mcp/types.ts。证据：88 types.ts 的 `z.literal('stdio'|'sse'|…)` 字段集合逐项对应。
- `chunk-6mwt0myy.js#po`、`#Yct`、`#ZPi`、`#Xbr`、`#Xct`、`#Mve`、`#Ogs`（part-007/008/009）→ services/mcp/mcpStringUtils.ts（`buildMcpToolName` 与工具策略/规则匹配）。
- `chunk-dg4taswx.js`（整个小 chunk：`LPe="2025-11-25"`、`Rwe="2026-07-28"`、重连常量 `eae=5`、`cCt`、`z2=16 MiB`）→ services/mcp/constants（88 中这些常量散在 client.ts / useManageMCPConnections.ts）。
- `chunk-asne9cp8.js`（v1/v2 模块访问器）与 `chunk-5br6r47d.js#rD`（代际选择）→ services/mcp/runtime.ts（新文件）。
- `chunk-0qyh5wah.js` part-002（`mcp-discovery-cache`、`Z4n` 等）→ services/mcp/discoveryCache.ts（新文件）。
- `chunk-aepeg2w5.js#xV`、`#OV`、`#PV`、`#qki`、`#kro`（`/mcp-registry/v0/servers`、`/api/directory/servers`）→ services/mcp/officialRegistry.ts（88 同名文件 `prefetchOfficialMcpUrls`）；而当前 officialRegistry.ts 里的 `chunk-cgr0tezp.js#Bs`/`#Ot` 是通用 URL 安全检测，应移出。
- `chunk-aepeg2w5.js#Sge`（保留服务器名判定）→ services/mcp/config.ts 或 utils/mcp 保留名模块。
- `chunk-e6aww6q8.js#vF`（`CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH`）、`#Yz`、`#ir`（配置哈希与连接键）、`#Z3n`/`#e8n`（Chrome/Computer Use 参数 schema 增强）→ services/mcp/client.ts / utils。
- `chunk-0qx6sn4e.js#Xrr`、`#NSn`（discover 投影、stateless 开关）→ services/mcp/claudeai.ts。
- `chunk-z1n5m6nf.js#Bt`（旧 SDK Client 类）与 `chunk-r1g76qsy.js` 291095–316569（新 SDK Client `cLo`、`$c` 协商）→ 第三方 `@modelcontextprotocol/sdk`（两个版本），应交 vendor 识别；其中带 `_anthropicProbe*` 字段的是 Anthropic 修改版。

**归错到 MCP 模块的非 MCP 代码**
- `chunk-t0gq9gyw.js#fn…#Ye`（29830–32622，会话存储键校验：`key.sessionId`、`.ccr-tip.json`、`.meta.json`）→ utils/sessionStorage 键模块，不是 headersHelper.ts。
- `chunk-16jhn3ak.js#sGn…#yAo`（指令文件路径、`Contents of <path>:`）→ utils/claudemd.ts，不是 headersHelper.ts。
- `chunk-e6aww6q8.js#jan/#Wan`、各 `isMcpServerFromProjectOrLocalSettings_N`（只判断 user/project/local 字符串）→ 各自调用方模块；旧版名一对多配错。
- `chunk-s61vbvea.js` 588744–601549（工具宿主/远程设备 notice、bridge 附件等待、插件函数 hooks 派发 `pxe`）→ bridge/远程设备与 plugins/functionHooks，不是 mcpStringUtils.ts。
- `chunk-gz7b768t.js` 全部（Claude Tag 提示词、remote-browser auto 模式）→ utils/permissions 或 tools/remoteBrowser。
- `chunk-kmc5hpaz.js`（Artifacts MCP 切换）→ tools/Artifacts 相关；`chunk-ptag3qm7.js#xu/#Rso`（hearthbot 工具别名）→ hearthbot/Slack 连接器模块；`chunk-99h01h55.js#Kcr/#wg`、`chunk-9xyz2gbc.js#_Lo/#bLo` → 权限/显示工具。
- `chunk-azbt01vf.js#O/#m/#v/#B/#R`（hooks 设置去重）→ utils/hooks/hooksSettings.ts，不是 services/mcp/utils.ts。
- `chunk-18hwfzwa.js#bbt/#VZ/#GI`（对话框栈）→ UI 对话框模块。
- `chunk-s4bxxzsw.js#rF`（权限请求载荷）→ 权限/bridge，不是 utils/mcp/elicitationValidation.ts。
- `chunk-r1g76qsy.js#Ra`、`#En`（SDK 响应缓存）→ vendor @modelcontextprotocol/sdk，不是 channelNotification.ts。
- `chunk-r0ads4ty.js#se/#W/#X/#xTt/#Cwn`（沙箱 glob 编译，日志 "[Sandbox]"）、`chunk-e6aww6q8.js#dIo`/`#kye`、`chunk-63f0f3kd.js#hn`、`chunk-qchp9vrd.js#yd` 等 `urlPatternToRegex_N` → 各自所在子系统（沙箱、权限、插件），不是 config.ts。
- `chunk-hwmsct5x.js#getServerUrl_8`（构造带 url 的 Response）、`chunk-f3qhjfah.js#getServerUrl_7`（marketplace.json 路径）、`chunk-hvmwwjxr.js#getServerCommandArray_8`（teammate stdio 命令）、`chunk-hjesqqfw.js#getServerCommandArray_7`（启动内置 MCP 服务器）、`chunk-sfy7bm1n.js#getServerUrl_11`（hearthbot）、`chunk-8wvtd8sr.js#urlPatternToRegex`、`chunk-m41h77x8.js`/`chunk-t7zrjgp6.js`/`chunk-x3qn5k1g.js` 的转义函数 → 不是 MCP config，旧版名一对多误配。
- `chunk-0h4e7gnq.js#getServerCommandArray`（`td` 映射传输名）实为遥测用传输标签，名字配错。

**旧版名配错（已在 semantic 中覆盖，note 写明）**：`getServerUrl_N`、`getServerCommandArray_N`、`expandEnvVars_N`、`isHTTPConfig_N`、`urlPatternToRegex_N`、`filterMcpPromptsByServer_N` 等一对多 `_N` 名大多不是原函数；`fetchToolsForClient`（`chunk-8t8n4kdh.js#Ys`，实为 buildMcpTool）、`fetchCommandsForClient`（`#Bi`）、`getAllMcpConfigs`（`chunk-e6aww6q8.js#jGr`）、`McpOAuthConfigSchema`（`chunk-5aas12zq.js#gt`）、`ChannelPermissionNotificationSchema`（`chunk-r1g76qsy.js#En`）、`hasClaudeAiMcpEverConnected`（`chunk-0qx6sn4e.js#rqt`）、`markClaudeAiMcpConnected`、`getCachedIdpIdToken`（`chunk-8y02x996.js#k`）、`saveIdpIdToken`/`clearIdpClientSecret`（`chunk-qy28ss7z.js#GNr`/`#N2i`）、`setupVscodeSdkMcp`（`chunk-tyg7f3ek.js#eD`）、`normalizeUrl`/`makeXaaFetch`（`chunk-6vnxsn99.js#IW`、`chunk-hjesqqfw.js#he`）、`issuerKey`（`chunk-1wpnxx5r.js#Mdt`）。

#### 插件

**旧版名配错（已在 semantic 覆盖）**
- `chunk-7vp249v4.js#PluginManifestSchema`(@88922) → vendor zod v4（strictObject 构造），实现为 `new B1e({type:"object",shape,catchall:never})`，被 115 处引用。
- `chunk-jhrww53q.js#isLocalMarketplaceSource` → 通用“不跟随符号链接的递归删除”，应归 utils/fs 类模块（removeDirectoryTreeNoFollow）。
- `chunk-f3qhjfah.js#isSourceAllowedByPolicy` 实为“是否被 blockedMarketplaces 阻止”；真正的 isSourceAllowedByPolicy 是 `chunk-f3qhjfah.js#lf`（_unattributed/chunk-f3qhjfah/part-015.js，判 strict/blocked/pluginDirectory），应归 `utils/plugins/marketplaceHelpers.ts`。
- `chunk-e6aww6q8.js#getPendingUpdateCount`/`#removeInstalledPlugin`/`#hasPendingUpdates` 实为 installed_plugins 读取与路径规范化（已改名 loadInstalledPluginsSync/loadInstalledPlugins/normalizeInstallPaths）。
- `chunk-dcmhvw5a.js#normalizeSource`(@125770) → isLocalMarketplaceSource（file/directory 判断）。
- `services/mcp/channelAllowlist.ts · chunk-dcmhvw5a.js#isChannelAllowlisted`(@140039) → 实为插件 ID 拆分 `{name, marketplace}`（含 `<pkg>@npm`），应归 `utils/plugins/pluginIdentifier.ts`，名如 splitPluginId（MCP 组负责该模块，未改名）。

**归错文件（不属于插件系统）**
- zipCache.ts：`convertDirectoryToZipInPlace` 系列 `chunk-06y4szbn.js@35522/@35655`、`chunk-2xm1rxms.js@28767`、`chunk-82kqcve8.js@24457`、`chunk-gfa3ceg6.js@4763`、`chunk-gjx0rh1b.js@73312`、`chunk-hm0ce8vc.js@182558`、`chunk-j3nx1xyn.js@932/743/779/812`、`chunk-pjm08t7p.js@16151`、`chunk-ss669z1x.js@17710/40290/40429`、`chunk-y162pn60.js@14675`、`chunk-y805ph4h.js@76871/76935/77083`、`chunk-e6aww6q8.js@710903` → 各自 chunk 的 _unattributed（都是各处的 rm -rf/清理小函数，fingerprint-shared 误配）；`chunk-k176arn3.js#atomicWriteToZipCache` → 通用临时文件名工具。
- marketplaceHelpers.ts：`formatFailureDetails_2..10`（chunk-5aas12zq、965tj7mg、e6aww6q8@606988/@1911748、gjx0rh1b@122340、qxvqcab6、s61vbvea、v21qppnj、grx66nns）→ 各自所属模块（通用“a, b and N more”）；`chunk-078pp0rm.js#N3r/$3r/y8o/doesSourceMatchHostPattern*/_8o/asr` 与 `chunk-e6aww6q8.js@1043545/@1043781` → 网络/沙箱域名白名单（permissions/sandbox 领域）；`chunk-gjx0rh1b.js#uo/co/Yd` → git bundle 上传（teleport/remote）；`chunk-grx66nns.js#eRo/tRo/nRo` → 会话评论自动回复；`chunk-5aas12zq.js#Re`。
- mcpbHandler.ts：`chunk-5aas12zq.js#Jn/Ge/Wn/isUrl/Yn/Xn`（markdown 代码块/链接解析）→ 非 MCPB；`chunk-hnwnzznd.js#isUrl_3` → 主机串比较。
- reconciler.ts：`chunk-s61vbvea.js#Ont/QA/JP/normalizeSource_5/_7`、`chunk-a477qqne.js#normalizeSource_2` → 环境变量危险名单与 git refs/目录项工具，非对账。
- lspPluginIntegration.ts：`chunk-3wek6r2k.js#extractLspServersFromPlugins`(@102267) → 会话启动插件遥测（utils/telemetry/pluginTelemetry 或 main 启动）；`chunk-6mwt0myy.js#addPluginScopeToLspServers` → MCP 服务器名相等判断（services/mcp/…）。
- pluginAutoupdate.ts：`chunk-s61vbvea.js#Ka/Yh/qh/Eqr/getAutoUpdatedPluginNames` → hooks 托管归属过滤（utils/hooks）。
- installedPluginsManager.ts：`chunk-2yv46yc2.js@381`（isInstallationRelevantToCurrentProject_2）→ MCP managed 配置脱敏（services/mcp）；`chunk-4121qate.js@103258` → 托管路径判断。
- pluginIdentifier.ts：`chunk-m3nv29vw.js#A/I`（claude_proj_01 base58 项目 ID、设置源→作用域映射副本）→ bootstrap/项目 ID 模块。
- pluginDirectories.ts：`chunk-aepeg2w5.js#pluginDataDirPath` → `{data, at}` 形状判断，非插件。
- installCounts.ts：`chunk-y162pn60.js#fetchInstallCountsFromGitHub`（任务状态映射）、`chunk-a477qqne.js#saveInstallCountsCache`（通用原子写）。
- 其他误配：`chunk-rbwn7je9.js#findMissingPlugins`（存储读 JSON）、`chunk-hddjmtjj.js#readSubdirs`（复制目录）、`chunk-kgh2tnx9.js#PluginSettingsSchema`（返回 {pick:"not_now"}）、`chunk-6j594vm1.js#MARKETPLACE_ONLY_MANIFEST_FIELDS`、`chunk-rbe666af.js#formatZodErrors_2`、`chunk-csq9ftr9.js#updatePluginOp`（按 ID 分组）、`chunk-1qpz7qcd.js#disableAllPluginsOp`（bridge 错误文本）、`chunk-yf5m6p65.js#PluginManifestOutputStylesSchema`（清全局 outputStyles）、`chunk-hwmsct5x.js#parseAndValidateManifestFromBytes`（只是 UTF-8 解码）、`chunk-1kaj6e83.js#extractHost/Ie`（被 services/mcp/auth 使用，应归 MCP）。

**_unattributed 中明显属于插件系统的一方代码（建议归入）**
- `_unattributed/chunk-e6aww6q8/part-564.js`（`EDe/uzt/c_/ows/lzt`：版本化缓存路径）→ `utils/plugins/pluginLoader.ts`；`part-570.js`、`part-569.js`、`part-568.js`、`part-567.js`、`part-565.js`、`part-558.js`、`part-551.js`、`part-540.js`、`part-535.js`、`part-547.js`、`part-549.js`（pluginLoader/installHelpers/marketplace 邻近段，被插件模块大量导入）。
- `_unattributed/chunk-e6aww6q8/part-571.js`（`W2r` skills-dir 插件加载、`t2n`、`gKn`）→ 新模块 `utils/plugins/skillsDirPlugins.ts`（316 新增）。
- `_unattributed/chunk-dcmhvw5a/part-015.js`（`_p/rMe/hJt/_I`：enabledPlugins 解析与保留市场判断）、`part-003.js`（`ng`=isPluginDirectorySource、`Rg/Gl` 命令提示）、`part-011.js`（hooks schema 辅助）→ `utils/plugins/pluginIdentifier.ts`/`marketplaceHelpers.ts`。
- `_unattributed/chunk-f3qhjfah/part-015.js`（`lf`=isSourceAllowedByPolicy、`Mdr`）→ `marketplaceHelpers.ts`。
- `_unattributed/chunk-21ppfwx8/part-001.js`（`PLUGIN_JSON`、`Bp` manifest 相对路径等常量与 link farm 工具）→ `pluginLoader.ts`。
- `_unattributed/chunk-czx62zen/part-003.js#mO`（enabledPlugins 值是否启用）→ `pluginPolicy.ts`。
- `_unattributed/chunk-byeye1yp/part-001.js#Y/ALi`（storageV5 开关，已命名 isStorageV5Enabled/pinStorageV5Flag）→ 存储/bootstrap 模块。
- 316 新功能整块：`chunk-qchp9vrd`（`claude plugin eval` 评测框架）、`chunk-zw5xhxkf`（claude.ai 插件目录搜索工具）、`chunk-z7wtv7tg`、`chunk-e6aww6q8/part-095`、`chunk-tyg7f3ek/part-012`（CCR 云端插件同步/转发 `ccr_cloud_plugins_forward`、`plugins_sync_*`）、`chunk-e6aww6q8/part-513/514`、`chunk-8t8n4kdh/part-007`、`cli/part-002`（hooks 模块 worker `src/plugins/functionHooks/hooks-worker`）、`chunk-s67w32sp/part-003`（插件目录缓存）、`chunk-e6aww6q8/part-099`（claude.ai 插件下载 `claudeai_plugin_install`）、`chunk-18hwfzwa/part-029`（插件状态通知）。建议新增目录 `utils/plugins/{eval,cloudSync,functionHooks,pluginDirectory}/`。

#### Hooks / Skills

格式：`声明 id → 应归属路径/应叫什么，证据`

- `chunk-e6aww6q8.js#KGt` → 应叫 `getStopHookMessage`，函数体用 "Stop"；`chunk-e6aww6q8.js#cWo` → 应叫 `getTeammateIdleHookMessage`，函数体用 "TeammateIdle"（旧版名对调，已在 semantic 中纠正）。
- `chunk-e6aww6q8.js#phn`、`#QKr`、`#BRr`（`_unattributed/chunk-e6aww6q8/part-424.js`）→ `skills/loadSkillsDir.ts`（`createSkillCommand` / SKILL.md 解析 / 插件清单名读取），夹在 loadSkillsDir 声明之间，旧版 createSkillCommand 同名。
- `chunk-hme9amad.js#ii`（当前名 createSkillCommand）→ 同步 skill 占位命令，旧版名配错；`chunk-e6aww6q8.js#phn` 才是 createSkillCommand。
- `chunk-e6aww6q8.js#Mxn`、`#Oxn`、`#Pxn`、`#Iwt`、`#amn`、`#rOr`、`#N1o`、`#F0e`、`#Dxn`、`#Fxn`、`#GGt`、`#yWr` → 会话标题/命名模块（如 `utils/sessionTitle.ts` 或 `commands/rename`），不是 hooks.ts；证据：saveCustomTitle/saveAgentName/bridge titleWriter。
- `chunk-e6aww6q8.js#JI`、`#ZOr`、`#FPn`、`#ePn`、`#Kzr`、`#Vzr`（`_unattributed/chunk-e6aww6q8/part-465.js`）→ `utils/hooks.ts`（钩子分派层，直接调用 executeHooks）。
- `chunk-e6aww6q8.js#SO`、`#xse`、`#oot`、`#PPn`、`#MPn`、`#Ttt`、`#qOr`、`#xAe`（`part-462.js`）与 `chunk-e6aww6q8.js#Ibe`、`#RAe`、`#IPn`（`part-463.js`）→ `utils/hooks.ts` 或 `utils/hooks/hooksConfigSnapshot.ts`（钩子来源汇总与遥测）。
- `chunk-7a5rgqvc.js#g4`、`#f`（`_unattributed/chunk-7a5rgqvc/part-001.js`）→ `utils/hooks/hooksConfigSnapshot.ts`（按事件汇总快照/设备/代理/注册钩子）。
- `chunk-2jdf5m4m.js#X2`、`#SJr`（`_unattributed/chunk-2jdf5m4m/part-004.js`）→ `utils/hooks/hooksConfigSnapshot.ts`（`getHooksConfigFromSnapshot`），旧版同文件。
- `chunk-2njac0sx.js#Re`（`_unattributed/chunk-2njac0sx/part-002.js`）→ `utils/skills/skillChangeDetector.ts`（检测器主体，调用 getWatchablePaths）。
- `chunk-s61vbvea.js#Gnt`、`#gee`（`_unattributed/chunk-s61vbvea/part-036.js`）→ 子进程 env 构造（钩子与 Bash 共用），可归 `utils/hooks.ts` 或 `utils/env`。
- `skills/bundled/verify.ts` 中 `chunk-4121qate.js#Dr`…`#um`、`chunk-e6aww6q8.js#FNe`、`#lde`、`#ZKo` → 不属于 verify skill：`um` 是 `skill.prompt` 事件定义、`Br/HAn` 是纯 JSON 深拷贝校验，应归 mods/事件引擎模块；只有 `chunk-hantmvxa.js#So`、`#Eo`、`#si` 属于此文件（且是 cowork-plugin skill）。
- `skills/bundled/stuck.ts` → 实为 dataviz skill；`skills/bundled/skillify.ts` → 实为 design skill；`skills/bundled/remember.ts` → memory-types；`skills/bundled/loop.ts` 的 `registerLoopSkill`（`chunk-hantmvxa.js#Ge`）→ artifact-design；真正的 loop skill 在 `chunk-gbtb0mjv.js#se`（unattributed）。路径可保留旧版位置，但模块说明已注明。
- `skills/bundled/simplify.ts` 的 `chunk-e6aww6q8.js#fKo` 语句 → 与 simplify 无关（可覆盖的内置 skill 名单），应归 skills 加载或 commands 合并处。
- `utils/hooks/skillImprovement.ts` 的 `chunk-9tgt55am.js#Br`、`#us` 与 `utils/hooks/apiQueryHookHelper.ts` 的 `chunk-9tgt55am.js#Ed` → artifact 评论自动响应模块（`artifact_comment_triage`/`artifact_comment_fast_ack`），不是钩子；`chunk-twq47pff.js#on`（formatRecentMessages）→ 输出风格/记忆文件判断，归属不明。
- `utils/hooks/fileChangedWatcher.ts` 的 `chunk-6kfx541v.js#i0r`（startWatching）→ 主题目录监听（`[theme] watcher error`），应归主题模块。
- `utils/skills/skillChangeDetector.ts` 的 `chunk-g3mpnrhd.js#ITr`（initialize）→ daemon-config 文件监听，应归 daemon 配置模块。
- `utils/hooks/ssrfGuard.ts` 的 `chunk-tp07j3pd.js#ben`（isBlockedV4）与 `#A` → 时间戳过期判断，与 SSRF 无关；真正的 `isBlockedV4` 是 `chunk-e6aww6q8.js#zAn`。
- `utils/hooks.ts` 的 `chunk-18hwfzwa.js#REe`（hasBlockingResult）→ MCP 项目服务器审批过滤，应归 `services/mcp/config.ts` 或 `mcpServerApproval`；`chunk-mthxbav8.js#Kr`（createBaseHookInput）→ 设备钩子输入校验，旧版名配错，真正的 createBaseHookInput 是 `chunk-e6aww6q8.js#wf`。
- `utils/markdownConfigLoader.ts` 收了约 25 个 `getFileIdentity_N` / `getProjectDirsUpToHome_N`（fingerprint-shared）及 `chunk-jy3v56kg.js#nn/#Zn`（目录扫描）、`chunk-s61vbvea.js#LI/#vy/#FVo`（mountinfo/git 目录持有）等，来自十几个不同 chunk，绝大多数与 markdown 配置无关；建议 fingerprint-shared 的低分匹配不参与文件归属。
- `skills/loadSkillsDir.ts` 的 `chunk-s61vbvea.js#xp`/`#zE`（JSDoc 生成）、`chunk-82kqcve8.js#mr`（gitignore glob 规范化）、`chunk-re9y5nwg.js#uJr` 是 `parseSkillPaths` 的 fingerprint-shared 误配，不属于本文件。
- `skills/bundled/scheduleRemoteAgents.ts` 的 `chunk-dcmhvw5a.js#kve`、`chunk-e6aww6q8.js#v1o`（getCurrentRepoHttpsUrl_N）、`chunk-dcmhvw5a.js#Ki`、`chunk-6mwt0myy.js#Xk` 为共享小工具误配，归属待定。

#### LSP / Chrome / Computer Use / 深链接

格式：`声明 id → 应归属路径 / 应叫什么，证据`

**误归到本组的声明（应移出）**
- `chunk-095ptjmr.js#st` → 模型档位候选选择器所在的 UI 模块（与 `chunk-095ptjmr.js#en` 同文件）/ `CandidateStatusRow`。它是 React 组件，调用方 `#en` 使用 `listTierCandidates`；旧版名 waitForInitialization 是错配。
- `chunk-aepeg2w5.js#zos` → 不属于 `services/lsp/manager.ts`。调用方是 `chunk-73yknwsx.js#THt`/`#Zgo`，内容是 endsAt 计算的死代码。
- `chunk-82kqcve8.js#gi`（raceWithTimeout）→ `utils/sleep.ts` 一类的通用工具。调用方是 `utils/plans.ts` 与 chunk-82kqcve8 的其他部分，与 LSP 无关。
- `chunk-18hwfzwa.js#BQ` → `hooks/usePromptsFromClaudeInChrome.tsx`。唯一调用方在那里；旧版名 PERMISSION_MODES 是错配，它实际是"当前会话的 Chrome 权限模式"函数。
- `chunk-0wdgqhcf.js#On` → 其调用方 `tools/ConfigTool/UI.tsx` 一侧。它只是 `<dir>/<id>.json` 路径拼接，与原生宿主清单无关。
- `chunk-e6aww6q8.js#n3t`、`#o3t`、`#r3t`、`#vHo` → 目录列举/附件模块（调用方 `utils/attachments.ts#hPr`）/ `isEntryHiddenByPermissions`、`filterListableEntries`。旧版名 sanitizeAppNames 是错配。
- `chunk-bg51yd13.js#pe` → Bash 命令解析模块（chunk-bg51yd13 内有 11 个调用方）/ `peelCombinedShortFlags`。
- `chunk-aepeg2w5.js#Jx`、`#aV`、`#Zx` → API 上传传输层（uploadWire）。这些是 Symbol("uploadWire.*") 和 http.Agent 的统计代码。
- `chunk-1tz177x8.js#js`、`#Rt` → 插件宿主动作（command.run / prompt.submit / session.send），可能是 `utils/plugins/functionHooks/*`。
- `chunk-6erhssc0.js#mk`、`#ysn`、`chunk-7904g3ks.js#C` → 服务器锁 server.lock 相关模块（原文有 origin service/foreground/transient）。旧版名 isProcessRunning、tryAcquireComputerUseLock 是错配。
- `chunk-e6aww6q8.js#HUr` → 通用文件工具（以 wx 模式创建空文件）。
- `chunk-vbks4x4e.js#uin` → 额外用量（extra usage）购买模块。调用方 `_new/call.ts#Jpt` 与 `chunk-18hwfzwa.js#ALt`，GrowthBook `tengu_ember_latch`。
- `chunk-hjesqqfw.js#Pe` → `entrypoints/mcp.ts` 相关（repo hooks stamp）。`chunk-hm0ce8vc.js#Ia` → 子进程令牌管道。两者都和 computer-use MCP 无关。
- `chunk-bss4k1z9.js#Jr` → UI 主题、按钮样式模块。
- `chunk-vqdzctzh.js#WRr` → 调用方所在模块（reducer 容器）。
- `chunk-4121qate.js#Nrs` → 快捷键/chord 相关（`["press",e,o].join(…)`）。
- `chunk-s61vbvea.js#tB`、`#sB` → BashTool 的 gh repo create 遥测（调用方 `chunk-s61vbvea.js#lB` 上报 `tengu_gh_repo_created`）/ `parseGhRepoCreateCommands`。
- `chunk-x4gcvpxy.js#d`、`#u`、`#L` → `utils/nativeInstaller/*`，读取 macOS 应用包内嵌的 Info.plist（调用方 `utils/nativeInstaller/packageManagers.ts#dOs`）。
- `chunk-3dq9c61y.js#T`、`chunk-3yy90gv7.js#h`、`chunk-dxdtyerk.js#V` → 各自 chunk 的调用方模块。它们只是与 `detectTerminal`/`shellQuote` 同名的克隆（fingerprint-shared）。
- `chunk-ah34pb7m.js#u1`（getBuiltinMcpRenderOverride）留在 `utils/computerUse/common.ts` 可以接受，但旧版名 COMPUTER_USE_MCP_SERVER_NAME 是错配，已覆盖。
- `chunk-srrcw01s.js#NOe` → `utils/claudeInChrome/common.ts` 或 `setup.ts`（316 中只为 Chrome 服务）。旧版名 setupComputerUseMCP 已覆盖为 `getClaudeInChromeStdioServerConfig`。

**`_unattributed` 中明显属于本组的一方代码**
- `chunk-e6aww6q8.js#yDt`、`#SDt`、`#wDt`、`#Y4s`、`#zfn`、`#Kfn`（part-047）→ `services/lsp/LSPDiagnosticRegistry.ts`。即旧版导出 registerPendingLSPDiagnostic / checkForLSPDiagnostics / clearAllLSPDiagnostics / resetAllLSPDiagnosticState / clearDeliveredDiagnosticsForFile，以及新增的 clearPendingDiagnosticsForFile。
- `chunk-e6aww6q8.js#UFo`（part-393）、`#_F`（part-394）→ `services/lsp/manager.ts`。
- `chunk-8gzm4s8j.js#h`、`#u`（常量组）、`#rwo`、`#owo`、`#swo`、`#DNt`（part-001）→ `utils/deepLink/parseDeepLink.ts`。2.1.88 中这些校验都在 parseDeepLink.ts 里（MAX_QUERY_LENGTH、MAX_CWD_LENGTH 同名同值）。
- `chunk-s61vbvea.js#Jqr`（part-038）、`#OH`（part-040）→ `utils/claudeInChrome/setup.ts`、`setupPortable.ts`（getExtensionIds）。`chunk-s61vbvea.js#PH`（生产扩展 ID）目前跟着 `commands/chrome/chrome.tsx#LW` 走，应归 setupPortable.ts。
- `chunk-hantmvxa.js#Ot`、`#Nt`（part-003）→ 新模块 `utils/claudeInChrome/installUpsell.ts`（或 `commands/chrome/`）。
- `chunk-e6aww6q8.js#lit`、`#qVs`、`#bFn`（part-340）、`chunk-dcmhvw5a.js#X3e`（part-021）、`chunk-j51xvqzq.js#wDs` → 新模块 `utils/computerUse/hostedDesktop.ts`（托管桌面 cu-desktop 接入）。
- `chunk-hwmsct5x.js#mf`、`#ty`、`#yJ`（part-016）、`chunk-ha3km179.js#_l`、`#bl`（part-003）→ 新模块 `utils/computerUse/session.ts`（ComputerUseSession）。
- `chunk-7fw14qgv.js#se`（part-002）→ `utils/deepLink/terminalPreference.ts`（updateDeepLinkTerminalPreference，在 linux 构建中函数体为空）。
- `chunk-ah34pb7m.js#OT`（现归 `tools/ListMcpResourcesTool/UI.tsx`）→ `utils/computerUse/toolRendering.tsx`（它是使用 RESULT_SUMMARY 的 computer-use 结果渲染）。`chunk-ah34pb7m.js#DT`（part-007）→ `utils/claudeInChrome/toolRendering.tsx`。

**第三方 / 内部包（交给 vendor）**
- `chunk-3ewc7v9f.js` 整体：`@ant/claude-for-chrome-mcp`（导出 createClaudeForChromeMcpServer、BROWSER_TOOLS、BridgeClient、各类 Error）。
- `chunk-ha3km179.js` 中的 `Cl = x(function(…){ … "@ant/computer-use-swift/js" … })`：CommonJS 包裹的 `@ant/computer-use-swift`。
- `chunk-hrs3dad1.js` 的 `N()`（`@ant/computer-use-input` 的加载）同属内部原生包。

#### 补写 doc 时发现的归错（parts/fill.misplaced.txt）

- chunk-6vnxsn99.js#rH → 任务/代理生命周期模块（如 tasks/LocalAgentTask 一带）/ addAgentKeepaliveReason：给本地代理任务加 keepaliveReasons，证据：读写 keepaliveReasons、调用方 runAgent 一类（`agent:${id}`）与 MagicDocs，和 MCP auth 无关；旧版名 clearMcpClientConfig 配错
- chunk-qxvqcab6.js#u0s → artifact/页面配置模块（chunk-8wvtd8sr.js 的 files 判定一带）/ hasOwnMcpKey：只判断对象自带 `mcp` 键，唯一外部调用在 chunk-8wvtd8sr.js#fm（与 files 判定并列），旧版名 createNodeWsClient 配错
- chunk-0zzdrwpn.js#Zht → services/mcp/channelNotification.ts 保持，但应改名 isChannelsPolicyBlocked：判定 channelsEnabled 与 team/enterprise 订阅，旧版名 isBigQueryMetricsEnabled 配错（已在 doc 说明）
- chunk-yqnmafqp.js#co → utils/urlRedaction（通用 URL 脱敏工具）/ redactUrlForLog：36 个调用方遍及 MCP v1/v2、xaa、第三方 SDK 包裹，不是 auth.ts 专属
- chunk-yqnmafqp.js#O_e → 与 #co 同一脱敏工具模块 / redactHeaders：请求头白名单脱敏，旧版名 redactSecrets 为 fingerprint-shared 配对
- chunk-gz7b768t.js#uJ → 远程浏览器（CCR remote-browser）权限模块（与 chunk-aepeg2w5.js#exn/#ZRn 同组）/ isRemoteBrowserModeFloorOn：与 MCP 名字工具无关，证据：判断 CLAUDE_CODE_REMOTE 与 remote-browser 服务器
- chunk-gz7b768t.js#SH → 同上 / isRemoteBrowserToolUnderModeFloor：旧版名 getToolNameForPermissionCheck 为 fingerprint-shared 配错
- chunk-gz7b768t.js#hwn → 同上 / refusesRemoteBrowserCallOutsideChecks：同样是 fingerprint-shared 配错
- chunk-aepeg2w5.js#ZRn → 同上远程浏览器模块 / isRemoteBrowserHttpConfig：判 `/v2/ccr-sessions/<id>/remote-browser/mcp` URL，旧版名 isHTTPConfig 不准确
- chunk-pp50kewz.js#vDe → services/plugins/pluginOperations.ts 保持 / getProjectPathForScope：project/local 返回项目根，旧版名 isMcpServerFromProjectOrLocalSettings（fingerprint-shared）配错
- chunk-e6aww6q8.js#s7n → skills/loadSkillsDir.ts 保持 / resetProjectSkillDirectories：设置各级 .claude/skills 目录，旧版名 getThinkbackSkillDir（fingerprint-shared）配错
- chunk-e6aww6q8.js#Gzr → utils/hooks.ts 保持 / announcesAsyncHook：判 stdout JSON 的 async:true；旧版名 isSyncHookJSONOutput 语义相反
- chunk-cdz6g143.js#bsr → 设备密钥/凭证存储模块（与 `.credentials.json` 常量同语句一带，如 utils/secureStorage 或 bridge 设备注册）/ getDeviceKeysFilePath：返回 ~/.claude/.device-keys.json，旧版名 getProjectDirsUpToHome 配错；真正的 getProjectDirsUpToHome 是 chunk-e6aww6q8.js#Yoe
- chunk-e6aww6q8.js#Yoe → utils/markdownConfigLoader.ts 保持 / getProjectDirsUpToHome：字符串 "getProjectDirsUpToHome: stat … ENFILE" 直接给出原名
- chunk-bhxaz9j0.js#Urt → artifact 读取模块（_new/readArtifactForModel.ts 一带）/ makeArtifactPersistId：调用方全在 chunk-6ht21p2a（artifact），与 MCP 输出存储只是共用落盘目录
- chunk-bhxaz9j0.js#voi → 同上 / isPersistedArtifactPath
- chunk-aqpks6nd.js#jan → 表单/插件配置设置模块（_new/pluginConfigSettings.ts 一带）/ getNumberFormatHint：调用方在 pluginConfigSettings 与 chunk-d4eg9at2，旧版 getFormatHint 匹配分数仅 0.456
- chunk-kgh2tnx9.js#oe → 远程会话对话框模块（launchRemoteFileModeDialog 门面导出）：返回 {pick:"not_now"} 的桩，旧版名 PluginSettingsSchema（0.361）配错，不属插件
- chunk-06y4szbn.js#w1t → 通用文件工具（chunk-06y4szbn 其余 part）/ replaceFileExclusive：rm 后 writeFile wx，旧版名 convertDirectoryToZipInPlace（fingerprint-shared 0.776）配错
- chunk-dcmhvw5a.js#$n → 通用字符串工具（utils/stringUtils 一类）/ nfcLowerCase：57 个调用方遍及全项目，旧版名 setCwdState（fingerprint-shared）配错，不是 pluginIdentifier 专属
- chunk-f3qhjfah.js#dU → 路径段规范化工具（Windows 文件名语义，与 chunk-aat7wt0p.js#hA 同组）/ normalizePathSegmentForCompare：调用方都在 _unattributed 的文件权限/路径代码（part-053/056），非插件目录专属
- chunk-f3qhjfah.js#OCt → 同上 / isPathSegmentInSet
- chunk-f3qhjfah.js#MCt → 同上 / isNodeModulesSegment
- chunk-f3qhjfah.js#ngi → 插件存储命名空间映射（与 #mdr 同组，可留 pluginDirectories 或新建 utils/plugins/storageNamespaces）/ getPluginAssetCacheNamespace：调用方 part-371（存储后端 V5）
- chunk-f3qhjfah.js#mdr → 同上 / getPluginCacheNamespace
- chunk-3pdgd98q.js#Rl → services/mcp/client.ts 可保留（getConnectionTimeoutMs 名正确），但其 31 个调用方大多在 _unattributed，属通用 MCP 常量模块
- chunk-czx62zen.js#gO → 插件策略模块（utils/plugins/pluginPolicy.ts）/ getPolicyAllowedPluginSet：合并 policySettings 允许名单，旧版名 _temp7（fingerprint-shared）配错，不属 loadPluginHooks
- chunk-z1n5m6nf.js#ut → services/mcp/client.ts（v1）/ installDiscoveryCacheResolvers：只设置 eraResolver=legacy 与默认账号解析器，不是"是否 legacy 时代"判断

## 6. 未完成

- 仍是压缩名的顶层绑定 509 个（见第 3 节）；被导出但无 doc 的 78 个。
- MCP：v2 callMCPTool（chunk-8t8n4kdh.js#Jn）与 v1 未逐行对比；stdio 探测"兄弟进程"只从代码推断，未运行验证；发现缓存与 subscriptions/listen 重开未细读。
- Computer Use 的 ESC 热键注册代码未找到；@ant/claude-for-chrome-mcp 未读。
- 07:31 之后的切分若再变动，重跑 artifacts/tmp/extensions/merge.mjs → validate.mjs → coverage.mjs；新出现的模块需补 modules 说明（merge 报告 modulesMissing）。
- 复现：node artifacts/tmp/extensions/merge.mjs && node artifacts/tmp/extensions/validate.mjs naming/semantic-extensions.jsonl naming/docs-extensions.jsonl naming/modules-extensions.json && node artifacts/tmp/extensions/assemble.mjs
