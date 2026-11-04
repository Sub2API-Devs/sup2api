# 斜杠命令（commands 领域）

本篇说明 Claude Code 2.1.316 的斜杠命令：命令对象的类型与字段、注册表的组成、过滤规则、解析与执行流程、全部内建命令一览、重要命令的实现要点，以及与 2.1.88 的差异。

依据只有 `original/`。引用格式为 `chunk-xxx.js` 加压缩名，括号里是本领域给出的语义名（`naming/semantic-commands.jsonl`）或门面原名（`analysis/names/facade.jsonl`）。旧版 `references/claude-code-analysis/src/commands*` 只用来对照命名。

## 1. 概览与模块地图

| 位置 | 内容 |
|---|---|
| `chunk-e6aww6q8.js` 2053315–2072348 | 注册表主体（源文件 `commands.ts`）：内建命令表 `buildBuiltinCommandTable`（`chunk-e6aww6q8.js#Z3s`）、运行时门控组、`getCommands`、技能与插件合并、保留名、远程/桥接安全集合、SDK 列表转换 |
| `chunk-e6aww6q8.js` 约 953295–961959 | 命令基础谓词：`getSkillOverrideState`（`chunk-e6aww6q8.js#LCe`）、`getCommandRequirements`（`chunk-e6aww6q8.js#JBr`）、`getThinClientDispatchMode`（`chunk-e6aww6q8.js#f4s`）、`supportsNonInteractive`（`chunk-e6aww6q8.js#aGe`）等；写作时切分在 `_unattributed/` 的 part-078/079，现为 `utils/commandPredicates.ts` |
| `chunk-e6aww6q8.js` part-179…225 | 大部分内建命令对象（`commands/<name>/index.ts` 的内容），以及各命令的启用谓词 |
| `chunk-s61vbvea.js` 16800–21200 | `getCommandName`（`chunk-s61vbvea.js#Zo`）、`isCommandEnabled`（`chunk-s61vbvea.js#Ud`）、`findCommand`（`chunk-s61vbvea.js#Zs`）、`getCommand`（`chunk-s61vbvea.js#t_n`）、`splitSlashCommandInput`（`chunk-s61vbvea.js#BX`）、`isImmediateCommand`（`chunk-s61vbvea.js#JRe`）、`getCommandContextMode`（`chunk-s61vbvea.js#NZn`）等 |
| `chunk-18hwfzwa.js` | `COMMAND_DIALOG_LOADERS`（`chunk-18hwfzwa.js#nre`）：local-jsx 命令名到实现 chunk 的懒加载表；`resolveCommandDialog`（`chunk-18hwfzwa.js#_P`） |
| `chunk-yjaa68dq.js` | `registerBundledSkill`（`chunk-yjaa68dq.js#ol`）与全部发行内建技能（code-review、commit、doctor、loop 等） |
| `chunk-3g0djq3w.js` | 斜杠命令派发 `processSlashCommand`（bootstrap 领域，见 §5） |
| 各命令实现 chunk | 命令对象的 `load()` 用 `require("./chunk-xxx.js")` 或动态 import 取实现；表见 §6 |

命令对象和实现分属不同 chunk。Bun 为每个被动态 import 的模块生成一个门面 chunk（例如 `chunk-whwtfsqf.js` → /login），所以一个源模块常被拆成"命令对象（在注册表 chunk 里）+ 实现（在独立 chunk 里）"两部分。

## 2. 命令对象

### 2.1 三种类型

| type | 执行方式 | 返回 |
|---|---|---|
| `local` | `load()` 得到模块，调用 `call(args, context, invokedName)` | `type: "text"`（带 value、level?）、`type: "compact"`（…）、`type: "query"`（带 prompt）、`type: "skip"` |
| `local-jsx` | `load()`；没有 `load` 时由 `resolveCommandDialog`（`chunk-18hwfzwa.js#_P`）按 `dialogKey ?? name` 查 `nre` 懒加载。调用 `call(onDone, context, args, invokedName)` | React 节点，挂到 `localJsx.show`；结束时组件调用 `onDone(result, options)` |
| `prompt` | `getPromptForCommand(args, context)` | ContentBlock 数组，作为用户消息送给模型（可 fork 到子代理执行） |

**孪生命令。** 316 的一个普遍模式是同一个命令名有两份定义：local-jsx 给交互 TUI，local 给无头模式（`-p`、SDK）。两份用 `_e()`（getIsNonInteractiveSession）互斥：

- 交互版通常 `isEnabled: () => !_e()`；
- 无头版 `isEnabled: () => _e()`，并加 `get isHidden(){ return !_e() }`。

有孪生的命令包括 add-dir、auto-mode-setup、color、config、context、mcp、model、rename、ultrareview、usage、skill-doctor、fast、advisor、exit、effort、focus、goal、usage-credits、extra-usage、stop、import、autocompact、version。

### 2.2 公共字段

| 字段 | 含义 |
|---|---|
| `type`、`name`、`aliases`、`description` | 描述常写成 getter，随状态变化（如 /model 显示当前模型、/remote-control 随连接状态） |
| `menuDescription` | 命令菜单里的短描述 |
| `argumentHint` | 参数提示，如 `[filename]`、`<model>` |
| `isEnabled()` | 是否可用；与 `policyGate` 一起由 `isCommandEnabled`（`chunk-s61vbvea.js#Ud`）判定 |
| `isHidden` | 不出现在菜单与补全里（常为 getter）。隐藏不等于禁用，用户仍可输入 |
| `availability` | `claude-ai` / `console` / `console-profile` 数组，见 §4.1 |
| `policyGate: {policy}` | 组织策略开关，例如 /insights |
| `requires: {workspace, ink}` | 需要本地工作区或 Ink 渲染；缺省时按类型取默认，见 §4.3 |
| `supportsNonInteractive` | local 命令可在无头模式执行 |
| `disableNonInteractive` | prompt 命令禁止无头执行 |
| `immediate` | 布尔或 `(args, presentation) => boolean`，为真时即使模型正在回答也立即执行，不排队 |
| `thinClientDispatch` | 瘦客户端（远程查看端）派发方式：`post-text`（把文本发给宿主）、`control-request`（发控制请求）、`twin`（用孪生命令）、`local-then-rpc` |
| `terminalOriented` | 只对终端有意义（宿主不是终端时隐藏） |
| `fleetHostCall`、`advertisedOnHostedSessions` | 舰队（后台会话）宿主相关：由宿主执行、在托管会话里公布 |
| `keepsScrollPosition`、`runsBesideTurns` | 打开时不跳到底部；可以和进行中的回合并行显示 |
| `userFacingName()` | 显示名，覆盖 `name` |
| `dialogKey` | local-jsx 懒加载表的键（默认用 name） |
| `isSensitive` | 布尔或函数；为真时遥测与历史中参数显示为 `***` |
| `registeredBy`、`loadedFrom` | 插件函数钩子注册的命令带注册者；`loadedFrom` 见下 |
| `getArgumentCompletions` | 参数补全 |

### 2.3 prompt 命令专有字段

技能、插件命令、MCP prompt、工作流都是 prompt 命令。常见字段：

- **来源与内容：**
  - `source`
  - `loadedFrom`，取值 bundled / skills / syncedSkills / attachedFolder / plugin / mcp / commands_DEPRECATED
  - `kind:"workflow"`、`progressMessage`、`contentLength`、`contentHash`、`skillRoot`、`paths`（条件技能）
- **模型与执行：**
  - `allowedTools`、`getAllowedTools()`、`disallowedTools`
  - `model`、`effort`、`getEffort()`、`getDefaultEffort()`
  - `context:"fork"` 加 `agent`（在子代理里执行）、`background`、`hooks`
- **可见性：**
  - `userInvocable`（false 时只能由模型调用）
  - `disableModelInvocation`、`disableBridgeInvocation`
  - `hiddenBehindPlugin`、`whenToUse`
- **名字：**
  - `unqualifiedName`（嵌套技能去掉作用域前缀的名字）
  - `directoryListingName`、`shedAliases`（因冲突被剥离的别名）
  - `fallback`（可被同名插件/MCP 技能遮蔽）、`fromHostCatalog`
- **其他：**
  - `pluginInfo`
  - `subcommands`、`subcommandsBareOnly`、`onUserTypedArgs`
  - `isMcp`、`mcpInfo`、`argNames`

## 3. 注册表的组成

### 3.1 内建命令表

`buildBuiltinCommandTable`（`chunk-e6aww6q8.js#Z3s`）按固定顺序列出约 145 个条目，`filter(Boolean)` 去掉构建期为 `null` 的占位（如 `Yrn`、`vTe`、`bTe`、`promoteMemoryCommands`、`accountMemoryCommands`，以及 See/p9e/m9e 等内部命令）。结果由 `getBuiltinCommandTable`（`chunk-e6aww6q8.js#M2`）缓存在 `state.builtinCommandTable`；门面导出名是 `getBuiltinCommands`（`chunk-e6aww6q8.js#SX`）。

**部分命令按需加载。** 注册表里用 `require("./chunk-xxx.js").default` 取的命令有 brief、remote-control、daemon、recap、goal、workflows、web-setup、list-agents、background、stop。

**运行时门控组。** `getRuntimeGatedCommandGroups`（`chunk-e6aww6q8.js#nsn`）定义五组 `{open(), whenOpen, whenClosed}`，由 `getRuntimeGatedGroup`（`chunk-e6aww6q8.js#SZ`）在建表时选择：

| 组 | open 条件 | 打开时 | 关闭时 |
|---|---|---|---|
| fleetFork | `Ek`：未禁用 agent view（CLAUDE_CODE_DISABLE_AGENT_VIEW / disableAgentView） | /fork（复制到后台会话）、/subtask | /fork（派生后台子代理） |
| fleetBackground | 同上 | /background（bg）、/stop | 无 |
| daemon | `fee`（构建期 false） | /daemon | 无 |
| skillDoctor | `jF`：tengu_lantern_prism 或 CLAUDE_CODE_LANTERN_PRISM | /skill-doctor 两版 | 无 |
| logout | 一方 API 或已 OAuth 登录 | /logout | 无 |

`getRuntimeGatedBuiltinCommands`（`chunk-e6aww6q8.js#Q3s`）返回五组的全部成员，供保留名使用。这样开关变化时，名字仍被内建占住。

**不进入注册表的列表。**

- `INTERNAL_ONLY_COMMANDS`（压缩名 wOl，`commands.ts`）：内部命令，包括 `{name:"stub", isEnabled:false}` 存根、/commit-push-pr、/version 两版。外部构建不并入 `buildBuiltinCommandTable`（`chunk-e6aww6q8.js#Z3s`）。
- `filtered`（压缩名 TOl，`commands.ts`）：全为 null。

### 3.2 其他命令来源

`loadAllCommands`（`chunk-e6aww6q8.js#Zrr`）按 `commandsMemoKey`（`chunk-e6aww6q8.js#bjo`，由 cwd、存储 v5、隐藏插件组成）缓存 `loadAllCommandsUncached`（`chunk-e6aww6q8.js#esr`）的结果。`loadAllCommandsUncached` 并发加载以下来源：

1. `getSkills`（`chunk-e6aww6q8.js#Vrr`）：
   - 技能目录 `getSkillDirCommandsCached`（`chunk-e6aww6q8.js#pNe`）：用户、项目、附加目录、claude.ai 同步技能；
   - 插件技能 `loadPluginSkills`（`chunk-e6aww6q8.js#iKe`）；
   - 发行内建技能 `ste()`（`ol` 注册，见 §6.3）；
   - 内建插件技能 `epr()`。
   任一来源失败只记日志、返回空。
2. `dbe`：插件命令（插件 `commands/` 目录）。
3. `warmWorkflows`（`chunk-e6aww6q8.js#Yrr`）：工作流命令（`chunk-qzez70vf.js`，`kind:"workflow"` 的 prompt）。

合并顺序如下：

```
[...技能目录(非同步), ...附加目录技能, ...工作流, ...插件命令, ...插件技能, ...内建技能, ...内建插件技能, ...内建表 M2()]
```

合并后依次处理：

1. `wjt`（validateListableCommands）：校验名字长度（含 MCP 名）与保留名。
2. claude.ai 同步技能经 `admitSyncedSkills`（`chunk-e6aww6q8.js#H7`）：与保留名冲突者不提供，并由 `tsr` 上报 `skill_reserved_namespace`。
3. `dropShadowedFallbackSkills`（`chunk-e6aww6q8.js#q_e`）：`fallback:true` 的技能若被插件或 MCP 的同名 `:后缀` 技能遮蔽，就丢弃。
4. `shedReservedAliases`（`chunk-e6aww6q8.js#isr`）：插件/同步技能的别名与内建或保留名冲突时移入 `shedAliases`；插件命名目录别名让位；无头模式下内建 help、feedback 让给同名插件技能（`HEADLESS_YIELDABLE_NAMES`（`chunk-e6aww6q8.js#rzr`））。
5. 遥测 `mkt("command")` 记录命令数量与冲突。

**MCP prompt。** MCP 服务器的 prompt 以 `mcp__<server>__<prompt>` 命名（别名 `<server>:<prompt>` 与 `… (MCP)`）。它们由 MCP 客户端（`chunk-8t8n4kdh.js`、`chunk-z1n5m6nf.js`）生成，经 `getMcp().commands` 进入 `getCommands`，不在 `esr` 里。

**动态技能。** 会话中由文件触达激活的条件技能（`paths`）和动态技能 `getDynamicSkills`（`chunk-e6aww6q8.js#Jtt`），在 `assembleCommands`（`chunk-e6aww6q8.js#nsr`）里插入到第一个内建命令之前。

### 3.3 getCommands

`getCommands`（`chunk-e6aww6q8.js#Fp`）是会话取命令列表的唯一入口。它调用 `assembleCommands`（`chunk-e6aww6q8.js#nsr`），然后：

- 用 `hookedCommands`（`chunk-e6aww6q8.js#Z6e`）应用插件的命令集钩子（可增删改命令）；
- 用 `hideSkillsBehindPlugins` 应用插件隐藏表（hiddenBehindPlugin 的暂扣）。

`nsr` 依次做这些事：

1. 取 `loadAllCommands`（`chunk-e6aww6q8.js#Zrr`）结果，按 `meetsAvailabilityRequirement`（`chunk-e6aww6q8.js#HCe`）与 `isCommandEnabled`（`chunk-s61vbvea.js#Ud`）过滤。
2. additionalDirectories 里的项目技能与主项目同名时去重。
3. 处理条件技能与同步技能可见性。
4. 嵌套目录 `.claude/skills` 的技能：
   - 用 `toScopedSkillCommand`（`chunk-e6aww6q8.js#ssr`）生成 `scope:name`，`rsr` 取作用域（相对 cwd 的项目路径）；
   - 描述追加 "(from X/.claude/skills — applies when working on files under X/)"（`rsn`）；
   - 同名且无法加前缀的不提供（`osr`）。
5. 动态技能插入到内建命令之前。

**派生列表。**

| 函数 | 内容 |
|---|---|
| `getSkillToolCommands`（`chunk-e6aww6q8.js#YI`） | Skill 工具可调用的技能（谓词 `isSkillToolCommand`（`chunk-e6aww6q8.js#Y_e`）：prompt、非内建、模型可调用、有描述） |
| `getSlashCommandToolSkills`（`chunk-e6aww6q8.js#G0e`） | 系统提示里的技能清单（实现 `lsr`） |
| `toSlashCommands`（`chunk-e6aww6q8.js#qZ`）/ `toSlashCommand`（`chunk-e6aww6q8.js#iJn`） | SDK `slash_commands` 条目 |
| `bridgeAdvertisedCommands`（`chunk-e6aww6q8.js#RGt`）/ `toBridgeSlashCommands`（`chunk-e6aww6q8.js#yjo`） | 向 Remote Control 桥接端公布的命令 |
| `builtInCommandNames`（`chunk-e6aww6q8.js#UB`）、`shippedCommandNames`（`chunk-e6aww6q8.js#bX`） | 名字保留与遥测（`Tse` 把非发行命令名上报为 "custom"） |

**缓存清理。**

- `clearCommandMemoizationCaches`（`chunk-e6aww6q8.js#qI`）只清记忆化。
- `clearCommandsCache`（`chunk-e6aww6q8.js#CF`）连技能目录、插件命令、插件技能的缓存一起清。`/reload-plugins`、`/reload-skills`、`/clear` 会调用。

## 4. 过滤

### 4.1 availability：`meetsAvailabilityRequirement`（`chunk-e6aww6q8.js#HCe`）

| 值 | 条件 |
|---|---|
| （无） | 通过 |
| `claude-ai` | `vt()`：claude.ai 订阅 OAuth 登录 |
| `console` | 非 claude.ai 订阅、一方 API（非 Bedrock/Vertex/Foundry）、官方 base URL |
| `console-profile` | `getWIFAuthType() === "user_oauth"` 档案登录且 `isWIFDispatchAuth()` |

宿主（例如 IDE 或桌面应用）可以通过 `getHostState().commandsOffHere?.(cmd)` 直接关掉命令。数组中任一值满足即可。

### 4.2 启用：`isCommandEnabled`（`chunk-s61vbvea.js#Ud`）

1. 有 `policyGate` 时，调用 `commandPolicyGateAllows(policyGate.policy)`。getter 抛错按不允许处理。
2. 返回 `cmd.isEnabled?.() ?? true`。

**常用谓词**（压缩名 → 含义）：

- **登录与会话：**
  - `_e`：无头会话；`vt`：claude.ai 订阅者；`isUsing3PServices`：第三方 API（Bedrock/Vertex/Foundry）
  - `On`：远程工作区；`Ft`：后台会话；`Ua`：协调者模式
- **门控开关（谓词：开关）：**
  - `f6` ultraplan：tengu_ultraplan_config.enabled 且桥接可用且非远程
  - `UF` ultrareview
  - `MA` advisor：tengu_sage_compass2 / CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL
  - `ys` 快速模式（一方且非 CLAUDE_CODE_DISABLE_FAST_MODE）
  - `Px` 用量额度（非 DISABLE_EXTRA_USAGE_COMMAND）
  - `Gpe` 升级（非 DISABLE_UPGRADE_COMMAND、非企业）
  - `_G` 隐私设置；`Vvt` 语音（claude.ai 且 allow_voice_mode）
  - `ox` Chrome（allow_claude_browser_extension）；`UW` design（allow_design_sync）
  - `isImportEnabled`（`chunk-e6aww6q8.js#N0e`）/import（tengu_import）；`isSettingsMovedToConfig`（`chunk-e6aww6q8.js#dRe`） vim/output-style 移到 /config（tengu_maple_sundial）
  - `Iee` 自定义快捷键（tengu_keybinding_customization_release）
  - `Pa` /list-agents（tengu_harbor_kite / CLAUDE_CODE_HARBOR_KITE）
  - `Sg` 工作流；`VA` artifacts；`isCloudPluginForwardingEnabledCached`（`chunk-g8d4yw80.js#YTn`）cloud-plugins（tengu_violin_wood 且 tengu_violin_amati）
  - `Tbe`/`kse` limit-reset（tengu_nifty_lemur / tengu_cedar_ember）
  - `Ern` 企业版提示存根（tengu_c4e_slash_upsell）
  - `Mrn` /restart（tengu_fancy_wand、TTY、macOS/Linux）
  - `wd` 全屏渲染器；`isDesktopCommandEnabled`（`chunk-e6aww6q8.js#lRe`）/desktop（构建期恒 false）
- **策略（`dn(...)`）：** allow_remote_sessions、allow_quick_web_setup、allow_team_onboarding、allow_heap_dump。

### 4.3 工作区与 Ink 要求

`getCommandRequirements`（`chunk-e6aww6q8.js#JBr`）在没有 `requires` 时按类型给默认值：

- `prompt` → `{workspace:false, ink:false}`
- `local` → `{workspace:true, ink:false}`
- `local-jsx` → `{workspace:true, ink:true}`

在没有本地工作区的瘦客户端（远程查看端）上：

- `isUsableWithoutWorkspace`（`chunk-e6aww6q8.js#BUt`）要求命令不需要工作区，或声明了 `thinClientDispatch`；
- `getThinClientDispatchMode`（`chunk-e6aww6q8.js#f4s`）决定派发方式。

### 4.4 无头模式

`getNonInteractiveCommands`（`chunk-e6aww6q8.js#NCe`）在 `disableSlashCommands` 时返回空。否则保留 `supportsNonInteractive`（`chunk-e6aww6q8.js#aGe`）为真的命令，即：

- prompt 且未 `disableNonInteractive`；或
- local 且 `supportsNonInteractive`。

local-jsx 在无头模式下被拒绝，提示 "opens an interactive panel…"。

### 4.5 技能覆盖与远程/桥接

**技能覆盖。** `getSkillOverrideState`（`chunk-e6aww6q8.js#LCe`）读取设置 `skillOverrides`（按命令名取值），返回 `on`、`off` 或 `user-invocable-only`。被插件隐藏的技能也视作 off。local 命令里只有 `OVERRIDABLE_LOCAL_COMMANDS`（`chunk-e6aww6q8.js#kxo`）集合（`auto-mode-setup`）能被覆盖。`isSkillOff`（`chunk-e6aww6q8.js#_k`）判断关闭，`isHiddenFromModel`（`chunk-e6aww6q8.js#Q5`）判断对模型隐藏。

**远程模式**（`--remote` 本地端）：`filterCommandsForRemoteMode`（`chunk-e6aww6q8.js#gjo`）只保留 `REMOTE_SAFE_COMMANDS`（`chunk-e6aww6q8.js#tzr`）。

**Remote Control 桥接**（手机/网页发来的斜杠命令）：

- `isBridgeSafeCommand`（`chunk-e6aww6q8.js#Gwt`）：prompt 全可，local-jsx 全不可，local 需在 `BRIDGE_SAFE_COMMANDS`（压缩名 sJn，在 `chunk-e6aww6q8.js#tzr` 语句内）。
- 插件注册的同名 local 命令通过 `findBridgeFallback` 找桥接安全的孪生命令代答。

## 5. 解析与执行

入口是 `utils/processUserInput/processSlashCommand.tsx`（`chunk-3g0djq3w.js`，归 bootstrap 领域）。调用链：

```
用户输入 "/name args"
 └ processSlashCommand
    ├ parseSlashCommand：BX splitSlashCommandInput，识别 "(MCP)" 后缀
    ├ Zs findCommand(name, getCommands())：name → 显示名/aliases → directoryListingName
    │   └ 未找到且有参数：再试 "name:第一个参数"（插件子命令写法）
    │   └ 插件函数钩子注册的命令还没到：KNi 等待
    ├ matchSubcommand 解析 subcommands；checkCommandSyncedAccess、qCe、isShippedSkillExecutionBlocked 检查技能开关；会话被模型结束（endedByModel）时拒绝
    ├ 未知命令：
    │   ├ 策略关闭的命令（resolveCommandPolicyGate、COMMAND_POLICY_GATES：remote-control→allow_remote_control，ultraplan→allow_remote_sessions，claude-in-chrome）给出策略提示
    │   ├ fhe 模糊匹配（编辑距离 ≤ 2）给出 "Did you mean"
    │   ├ 看起来像路径（/var、/tmp…）时当作普通提示词
    │   └ claude.ai 无头会话可把整句交给模型
    └ getMessagesForSlashCommand（co）
        ├ Ud 不通过 → "isn't available in this session"
        ├ _k → "disabled via skillOverrides"；userInvocable===false → "can only be invoked by Claude"
        ├ local-jsx：load() ?? resolveCommandDialog → call(onDone, ctx, args, invokedName) → localJsx.show
        │     onDone(result, {display: skip|system|user, metaMessages, shouldQuery, nextInput})
        ├ local：call(args, ctx, invokedName)
        │     text → <local-command-stdout>/<local-command-stderr> 消息
        │     compact → buildPostCompactMessages
        │     query → 以 prompt 发起模型请求
        │     skip → 不产生消息
        └ prompt：
              context:"fork" → executeForkedSlashCommand（先跑 UserPromptSubmit 钩子，子代理执行）
              否则 getMessagesForPromptSlashCommand：getPromptForCommand 结果作为用户消息，附 allowedTools、model、effort
 └ 遥测 tengu_input_command（命令名经 Tse 脱敏，参数敏感时 ***）
```

**其他细节。**

- `isImmediateCommand`（`chunk-s61vbvea.js#JRe`）为真时，模型回答中途输入的命令立即执行，不进队列。
- `getCommandContextMode`（`chunk-s61vbvea.js#NZn`）返回 `getContext?.() ?? context ?? "inline"`。
- `buildCommandRunInfo`（`chunk-s61vbvea.js#tpe`）生成 `{command, args, plugin}` 运行记录，敏感参数打码。
- 多个斜杠命令连写（`/a /b`）由 `po` 按 prompt 命令逐个展开。

## 6. 内建命令一览

图例：
- **类型**：J = local-jsx，L = local，P = prompt；J+L 表示有交互/无头孪生。
- **门控**：未写即总是可用。"隐藏"表示 `isHidden` 为真（可能是条件性的）。
- **模块**：命令对象所在的源模块（按当前切分）；写作时一部分命令对象在 `_unattributed/` 的 `chunk-e6aww6q8` part-NNN（表中曾简写为 _u/NNN），place-rest 后已改为当前正式路径（相对 `commands/`）。
- **实现**：`load()` 指向的 chunk。

| 命令 | 别名 | 类型 | 用途 | 命令对象模块 / 实现 | 门控、隐藏 |
|---|---|---|---|---|---|
| /add-dir | | J+L | 添加附加工作目录 | add-dir/index.ts / x4gf1bcz、efagea6a | 无头版需工作区可写 |
| /advisor | | J+L | 让 Claude 在关键节点咨询更强模型 | advisor.ts / tx2s9zpa、vhac946c | `MA` advisor 开关 |
| /agents | | L | 已移除，提示改让 Claude 管理子代理 | agents/index.ts | 隐藏 |
| /artifacts | | J | 浏览已发布/共享的 artifact | artifacts/index.ts / qr2y97px | `VA` 且非远程会话 |
| /autocompact | | J+L | 设置自动压缩阈值（上下文窗口占比） | autocompact/index.ts / qqj12s77、70h2e8y3 | 无头版远程工作区也可用 |
| /autofix-pr | | J | 监控当前 PR 并自动修复问题 | autofix-pr/index.ts / 4pdevvfa | claude-ai 或 console-profile，allow_remote_sessions |
| /auto-mode-setup | | J+L | 让 auto 模式了解环境，可选规则调整 | auto-mode-setup/index.ts / m8444q1d、4cndz99e | tengu_auto_mode_config.envOnboarding；可被 skillOverrides 关 |
| /background | bg | J | 把会话送到后台并释放终端 | chunk-3m7t4vj8 / 7c7hjd56 | fleetBackground 组 |
| /branch | | J | 在此处分叉对话 | branch/index.ts / khj4kcw5 | |
| /brief | | J | 切换仅摘要输出 | brief.ts（gv7qjj2t） | tengu_kairos_brief_config.enable_slash_command |
| /btw | | J | 不打断主对话的侧问 | btw/index.ts / 583vs41k | |
| /bug | share | J | 报错或分享对话 | feedback/index.ts / myrezy36 | |
| /cd | | J | 把会话移到新工作目录 | cd/index.ts / fh3th4b7 | |
| /chrome | | J | Claude in Chrome 设置 | chrome/index.ts / 1ztfztfw | claude-ai，`ox` 策略，非无头 |
| /claim-credit | | L | 打开启动时显示的优惠页 | claim-credit/index.ts / ndsajhew | 隐藏；claude.ai 且有可领优惠 |
| /clear | reset、new | L | 新会话、清空上下文（旧会话可恢复） | clear/index.ts / 4mtxrwhe | |
| /cloud-plugins | | J | 云会话是否使用本机启用的插件 | cloud-plugins/index.ts / n30mmv2p | `isCloudPluginForwardingEnabledCached` 且非 CLAUDE_CODE_DISABLE_PLUGIN_FORWARDING |
| /color | | J+L | 设置本会话提示栏颜色 | color/index.ts / b5scw0qq、evjaj4jh | 交互版在不支持时隐藏 |
| /compact | | L | 总结对话以释放上下文 | compact/index.ts / vrrvwm85 | 非 DISABLE_COMPACT |
| /config | settings | J+L | 打开设置 / 按键设置 | config/index.ts / ak1qv1dp、8ncxevqn | |
| /context | | J+L | 上下文用量彩色网格 / 文本表 | context/index.ts / 10q8r8ck、mszdds2y | |
| /copy | | J | 复制最近（第 N 条）回复 | copy/index.ts / 0knprqgt | |
| /daemon | | J | 管理后台服务与例程 | chunk-0e9ty0k2 / b7gstm5r | daemon 组（构建期关闭） |
| /design-consent | | L | 授权 Claude 访问 Design 项目 | design/index.ts / c9mbsnrs | 隐藏；`UW` |
| /design-login | | J | 用 claude.ai 账号授权 design-sync | design/index.ts / zkzpd9ky | `UW` |
| /design-revoke | | L | 撤销 Design 访问 | design/index.ts / 6qdkmygq | 隐藏；`UW` |
| /desktop | app | J | 在 Claude Desktop 继续本会话 | desktop/index.ts / ds2d8kad | claude-ai；构建期恒禁用 |
| /diff | | J | diff 面板 / 未提交改动 | diff/index.ts / 19av2vh6 | |
| /effort | | J+L | 设置推理强度（含 ultracode） | effort/index.ts / 3rwvzn82、mtkg11k6 | |
| /exit | quit | J+L | 退出（后台会话里为 Detach） | exit/index.ts / xs5f70ym、f55t9a8b | |
| /export | | J | 导出对话到文件或剪贴板 | export/index.ts / am3vy82s | |
| /extra-usage | | J+L | 已改名为 /usage-credits | extra-usage/index.ts / 139kcwcq、dfy6tq5y | 隐藏；`Px` |
| /fast | | J+L | 切换快速模式 | fast/index.ts / sfatdaes、vr5qyyg8 | `ys` |
| /feedback | | J | 反馈或报错 | feedback/index.ts / dnxbqwmv | 无头模式可让给插件 |
| /focus | | J+L | 专注视图（只显示提示、摘要与回复） | focus/index.ts / nre、fv21ck8e | |
| /fork | | J | 复制对话到新后台会话 / 派生继承全文的后台子代理 | agents/index.ts / d62reftv、cc2xzzcg | 非协调者模式；两版由 fleetFork 组选择 |
| /goal | | J+L | 设定 Claude 停止前要检查的目标 | chunk-nn4xbsmj / hgfnw8bk、s4441tej | |
| /heapdump | | L | 写 JS 堆快照 | heapdump/index.ts / dhgx9s0b | 隐藏；allow_heap_dump |
| /help | | J | 帮助与命令列表 | help/index.ts / yxcx2jtr | 无头模式可让给插件 |
| /hooks | | J | 查看钩子配置 | hooks/index.ts / bajxb7bf | |
| /ide | | J | IDE 集成与状态 | ide/index.ts / 5bdzenzx | |
| /import | | J+L | 从其他编码代理（codex、gemini、cursor）导入配置 | import/index.ts / cdgppz20、he8wyk3b | `isImportEnabled` tengu_import |
| /init | | P | 初始化 CLAUDE.md | init.ts | 新旧两套提示词 |
| /insights | | P | 分析历史会话生成报告 | commands.ts（懒加载）/ yt6zn9vg | policyGate |
| /install-github-app | | J | 设置 Claude GitHub Actions | install-github-app/index.ts / 4v9zy7gn | claude-ai 或 console；非 DISABLE_INSTALL_GITHUB_APP_COMMAND |
| /install-slack-app | | L | 安装 Slack 应用 | install-slack-app/index.ts / xarcg2hx | claude-ai |
| /keybindings | | L | 打开快捷键文件 | keybindings/index.ts / 1nat7wre | `Iee` |
| /limit-reset | | J | 使用一次 5 小时额度重置 | limit-reset/index.ts / q8p98373 | 隐藏；claude.ai 且 `Tbe`/`kse` |
| /list-agents | peers | L | 列出可发消息的子代理、队友与会话 | chunk-yxzqxbzv / kq21a1r9 | `Pa` |
| /login | | J | 登录或切换 Anthropic 账号 | login/index.ts / whwtfsqf→vrmtstb0 | 非 DISABLE_LOGIN_COMMAND；云会话可拒绝（隐藏） |
| /logout | | J | 退出登录 | logout/index.ts / tndsj50r | logout 组；非 DISABLE_LOGOUT_COMMAND |
| /loops | | J | 列出/创建/删除循环 | loops/index.ts / wtfk012h | 恒禁用 |
| /low-priority | | L | 达到 5 小时限额后以低优先级继续 | thinkback-play/index.ts（误归）/ khcb6nvd | 隐藏；claude.ai |
| /mcp | | J+L | 管理 MCP 服务器 | mcp/index.ts / cpqpnzp4、3re05e6m | |
| /memory | | J | 编辑 CLAUDE.md 与记忆设置 | memory/index.ts / c55mbvfz | |
| /mobile | ios、android | J | 显示移动应用下载二维码 | mobile/index.ts / 7mtn3rbz | |
| /model | | J+L | 设置模型 | model/index.ts / mvhmq2z8、0pmcg6nh | |
| /output-style | | L | 列出或切换输出风格（无头） | output-style/index.ts / 1ehcpf9z | 交互端已移到 /config |
| /output-style、/vim（存根） | | J | 提示"已移到 /config" | createMovedToConfigCommand.ts | 隐藏；`isSettingsMovedToConfig`（`chunk-e6aww6q8.js#dRe`） |
| /passes | | J | 分享免费周卡 | passes/index.ts / aa3cndeh | 无资格时隐藏 |
| /pause-memory | memory-pause、toggle-memory | L | 暂停本会话自动记忆 | pause-memory/index.ts / 8dz40wpq | 恒禁用（构建期） |
| /permissions | allowed-tools | J | 管理允许/拒绝规则 | permissions/index.ts / p2qwpk2k | |
| /plan | | J | 进入计划模式或查看计划 | plan/index.ts / ve85yyeb | |
| /plugin | plugins、marketplace | J | 管理插件与市场 | plugin/index.tsx / qey4tpm4 | |
| /powerup | | J | 交互式功能课程 | powerup/index.ts / fxpvgzqn | |
| /privacy-settings | | J | 隐私设置 | privacy-settings/index.ts / p3x5wbde | `_G` |
| /pro-trial-expired | | J | Pro 试用结束后的选项 | pro-trial-expired/index.ts / fnmk6x3n | 隐藏 |
| /radio | | L | 播放 Claude FM | radio/index.ts / 03rvwpge | |
| /rate-limit-options | | J | 达到限额时的选项 | rate-limit-options/index.ts / dg94x42s | 隐藏；claude.ai |
| /recap | | L | 生成一行会话摘要 | chunk-66drwgm7 / z9nn3hxt | |
| /release-notes | | J | 更新日志 | release-notes/index.ts / 8k62p17d | |
| /reload-plugins | | L | 激活待生效插件变更 | reload-plugins/index.ts / 8vqp1nqq | |
| /reload-skills | | L | 重新读取磁盘上的技能 | reload-skills/index.ts / 9dc848ph | |
| /remote-control | rc | J | 用手机/网页控制本会话 | bridge/index.ts（53mky9yr）/ k7ve8htw | 有桥接资格；非 disableRemoteControl；无 API key |
| /remote-env | | J | 选择云端代理默认环境 | remote-env/index.ts / zj31az9x | claude-ai 或 console-profile |
| /__remote-workflow | | L | 运行会话环境下发的工作流脚本 | remote-workflow/index.ts / cg8zacmh | 隐藏 |
| /rename | name | J+L | 重命名会话 | rename/index.ts / wqa2f5xk、5h69ret3 | |
| /restart | update | L | 原地重启到新版本 | restart/index.ts / egxcxk6h | `Mrn` |
| /resume | continue | J | 恢复历史会话 | resume/index.ts / 74n7apcd | 远程查看端隐藏 |
| /rewind | checkpoint、undo | L | 恢复代码和/或对话到之前某点 | rewind/index.ts / ye0hzrsv | |
| /sandbox | | J | 沙箱开关 | sandbox-toggle/index.ts / 55w3ydvj | 平台不支持时隐藏 |
| /scroll-speed | | J | 鼠标滚轮速度 | scroll-speed/index.ts / myhtjy4v | 仅全屏渲染器，部分终端 |
| /security-review | | P | 已迁到插件（提示安装） | security-review.ts | |
| /session | remote | J | 云会话 URL 与二维码 | session/index.ts / 3rb87ry3 | 仅远程工作区 |
| /setup-bedrock | | J | 重新配置 Bedrock | setup-vertex/index.ts / vt5kkj4e | 非 CLAUDE_CODE_USE_BEDROCK 时隐藏 |
| /setup-vertex | | J | 重新配置 Vertex | setup-vertex/index.ts / 8nayjra0 | 非 CLAUDE_CODE_USE_VERTEX 时隐藏 |
| /skill-doctor | | J+L | 显示未使用且占上下文的技能 | usage/index.ts / ej3ckp70、trqm4cp5 | skillDoctor 组 |
| /skills | | J | 列出技能 | skills/index.ts / 00qhwn8e | |
| /statusline | | P | 让模型配置状态栏 | statusline.tsx | |
| /status | | J | 版本、模型、账号、连通性等状态 | status/index.ts / gwbvvmmk | |
| /stickers | | L | 订购贴纸 | stickers/index.ts / ekn75w8p | |
| /stop | | J+L | 停止后台会话（保留记录与 worktree） | chunk-adzz9hc5 / t85zxbmt、zsxk930s | fleetBackground 组；仅后台会话 |
| /subtask | | J | 带完整上下文派子代理，结果回到本会话 | agents/index.ts / 3vqj3nc0 | fleetFork 组 |
| /tasks | bashes | J | 查看管理后台任务 | tasks/index.ts / pw933apk | |
| /team-onboarding | | P | 根据使用情况生成团队上手指南 | team-onboarding/index.ts | tengu_flint_harbor_prompt；分享需策略 |
| /teleport | tp | J | 把会话送到云端或从 claude.ai 恢复 | teleport/index.ts / c2tx3syd | claude-ai 或 console-profile |
| /terminal-setup | | J | 配置终端 Shift+Enter 等 | terminalSetup/index.ts / y6vqt8tm | 原生支持的终端隐藏 |
| /theme | | J | 主题 | theme/index.ts / 3s4dbk22 | |
| /tui | | J | 选择渲染器（default / fullscreen） | tui/index.ts / wdq8e3yt | |
| /ultraplan | | J | 在云会话起草可编辑计划 | ultraplan.tsx（直接 load） | claude-ai；`f6` |
| /ultrareview | | J+L | 云端深度代码审查 | review.ts / 0eepcc6r、yxg7c7n7 | `UF` |
| /upgrade | | J | 升级到 Max | upgrade/index.ts / txp87wj5 | claude-ai；`Gpe` |
| /usage | cost、stats | J+L | 会话花费、计划用量与活动统计 | usage/index.ts / b8fqh6y9、9689amr8 | |
| /usage-credits | | J+L | 配置或申请用量额度 | extra-usage/index.ts / 2gtphf4m、g49d7j62 | `Px` |
| /version | | J+L | 显示运行中的版本 | version.ts | 恒禁用（外部构建） |
| /voice | | L | 切换语音模式 | voice/index.ts / vrdyygyr | claude-ai；`Vvt` |
| /web-setup | | J | 用 GitHub 账号设置云会话 | chunk-pemtjbn7 / ajkmgejw | claude-ai；需 allow_remote_sessions 与 allow_quick_web_setup |
| /wellbeing | breaks、break-reminder、downtime | J | 休息提醒与安静时段 | wellbeing/index.ts / a7sxm3q7 | 恒禁用 |
| /workflow-launch-exec | | L | 执行服务端下发的工作流交接 | remote-workflow/index.ts / 3sew516d | 隐藏 |
| /workflows | | J | 浏览运行中与已完成的工作流 | chunk-g8tswn69 / wnym76ss | `Sg` |
| 企业版提示存根 | ultraplan、ultrareview、teleport、remote-control、schedule/routines、autofix-pr | L | 提示"需要 Claude for Enterprise" | c4eUpsell.ts（`createEnterpriseUpsellCommand`/`ENTERPRISE_UPSELL_COMMANDS`，`chunk-e6aww6q8.js#A2`/`chunk-e6aww6q8.js#Rrn`） | 隐藏；`isEnterpriseUpsellEnabled`（`chunk-e6aww6q8.js#Ern`） |
| /commit-push-pr | | P | 提交、推送并开 PR | commit-push-pr.ts | 内部，不在注册表 |
| /install | | J | 原生构建安装（CLI 子命令界面） | install.tsx | 不在注册表 |

### 6.1 实现方式补充

**不经 `load()` 的命令：**

- /ultraplan、/focus（交互版）由 `nre` 或对象内联提供实现；
- /brief 的实现在同一 chunk；
- /version 的 `call` 是同 chunk 的 `Cor`；
- /agents 返回固定文案（`cor`）。

**用同一面板的命令。** /config、/status、/usage 都打开 Settings 面板（`Settings`，`chunk-9h8dr0qb.js#rTe`），只是 `defaultTab` 不同：Config / Status / Usage；以 `stats` 调用时打开 Stats 页。

### 6.2 发行内建技能（prompt，`ol` 注册）

不少旧版命令在 316 改成了发行内建技能。它们出现在 `/` 菜单里，`loadedFrom:"bundled"`，按技能规则过滤：

- code-review（别名 review）、commit、pr、simplify、doctor（别名 checkup）、debug、batch、verify、loop、schedule
- claude-in-chrome、artifact-*、dataviz、design、design-sync、cowork-plugin
- explain-usage、fewer-permission-prompts、keybindings-help、memory-types、update-config
- workflow-authoring、setup-claude、send-to-project、claude-api、claude-code-docs、run、run-skill-generator

## 7. 重要命令

### /compact

- 命令对象：`compactCommand`（`chunk-e6aww6q8.js#Dvo`），local，`isEnabled: !DISABLE_COMPACT`，参数是自定义摘要指令。
- 实现：`chunk-vrrvwm85.js` 的 `se`（call）调用 `O`（compactManually）。
  1. 会话被模型结束时拒绝。
  2. 先跑 PreCompact 钩子；钩子可阻止，或追加指令。
  3. 如果后台已有预计算摘要（`A`，tryReusePrecomputedCompaction），直接复用；否则发摘要请求。
  4. 失败原因 too_few_groups / aborted / exhausted / media_unstrippable 分别给出文案。
- 返回值：成功时为 `{type: "compact", compactionResult, …}`，由派发器 buildPostCompactMessages 生成压缩后的消息；跳过时为 `Not compacted · 原因`。
- 自动压缩阈值改由 /autocompact 设置。

### /model

- 交互版 `chunk-mvhmq2z8.js` 的 `zs`：
  - 无参数时打开选择器；
  - 云会话通过宿主拉取模型列表，超时 15 秒；
  - 带参数时直接设置（`SetModelFromArgs`（`chunk-mvhmq2z8.js#je`）），并提示弃用模型。
- 无头版 `chunk-0pmcg6nh.js` 的 `b`：解析 `<model>` 并写设置。
- 描述 getter 显示当前模型。

### /config

- 交互版打开 Settings 面板 Config 页（`chunk-ak1qv1dp.js` 的 `_`）。
- 无头版 `chunk-8ncxevqn.js` 的 `c` 按键设置。
- 开启 `isSettingsMovedToConfig`（`chunk-e6aww6q8.js#dRe`）（tengu_maple_sundial）时，/vim 与交互端 /output-style 变成"已移到 /config"的隐藏存根（`createMovedToConfigCommand`（`chunk-e6aww6q8.js#ren`））。

### /resume

- 别名 continue，实现 `chunk-74n7apcd.js` 的 `De`。
- 无参数时打开会话选择器；带 ID 或标题时直接恢复；找不到时报 "was not found"。
- 远程查看端（viewerOnly、无会话 ID）隐藏。

### /mcp

- 交互版 `chunk-cpqpnzp4.js` 的 `Vd`：服务器列表与待审批项。没有终端时向宿主请求设置界面。
- 无头版 `chunk-3re05e6m.js` 的 `Le`：
  - 无参数输出各状态计数（connected / cached / connecting / not connected / not configured / disabled）；
  - 支持 `reconnect|enable|disable [<server>|all]`。
- CLI 子命令 `claude mcp add` 与 `claude mcp xaa`（XAA IdP）在 `chunk-4vq0yytw.js`。

### /plugin

- 实现 `chunk-qey4tpm4.js` 的 `p`，转到 `PluginCommand`（`chunk-vrb44rx7.js#Gen`），再渲染 PluginSettings。
- 参数由 `parsePluginArgs`（`chunk-bppzggd7.js#DGe`）解析为以下子命令：
  - `help`
  - `list|ls [--enabled|--disabled]`
  - `install|i <plugin>[@marketplace]`，或直接给市场 URL/路径
  - `manage`
  - `stats`（需 skill-doctor 开关）
  - `directory`/`search`
  - `uninstall` / `enable` / `disable` / `configure`/`config` / `validate` / `tag`
  - 以及 marketplace 子命令
- /reload-plugins 负责在当前会话激活变更。

### /agents

- 316 的 /agents 是隐藏的 local 存根，描述以 "(removed)" 开头，提示让 Claude 创建/管理子代理或直接编辑 `.claude/agents/`。
- 旧版的代理管理界面已不存在。
- 相关的新命令：/list-agents（peers）、/fork、/subtask、/background。

### /permissions

- 别名 allowed-tools，实现 `chunk-p2qwpk2k.js` 的 `Aw`。
- 本地打开规则编辑器（中途打开时 `isMidTurn`）。
- 远程连接时只读查看宿主规则；不可用时提示 "Permission rules aren't available over this remote connection"。

### /review 与 /ultrareview

- 旧版的 `/review` 提示词命令在 316 由发行内建技能 code-review 承担（别名 review），参数为强度、`--comment`、`--fix`。
- /ultrareview 是云端审查：
  - 交互版 `chunk-0eepcc6r.js`，无头版 `chunk-yxg7c7n7.js`；
  - 描述含 CCR 条款链接；
  - 配额结构为 reviews_used / limit / remaining / is_overage；
  - 开关 `UF`，配置名 tengu_review_bughunter_config。

### /init

- prompt 命令。`useNewInitPrompt`（`chunk-e6aww6q8.js#g9o`）在 CLAUDE_CODE_NEW_INIT 或 tengu_slate_harbor_experiment 时选新提示词 `getNewInitPrompt`（压缩名 y9o），否则选旧提示词 `getOldInitPrompt`（压缩名 h9o；两者同在声明 `chunk-e6aww6q8.js#h9o`，`commands/init.ts`）。
- 新提示词会检查 Codex / Gemini CLI 配置，并建议用 /import 迁移。

### /memory

- 实现 `chunk-c55mbvfz.js` 的 `Qi`：选择 CLAUDE.md（用户、项目、本地）或记忆文件，不存在时创建，再用 `$VISUAL` / `$EDITOR` 打开。
- 自动记忆相关的 /pause-memory 与账号记忆命令（promoteMemory、memoryAccount 等）在外部构建中关闭或为 null。

### /usage（旧 /cost、/stats）

- /cost 和 /stats 在 316 是 /usage 的别名。
- 交互版打开 Settings 面板 Usage 页，以 `stats` 调用时打开 Stats 页。
- 无头版 `chunk-9689amr8.js` 的 `G`：会话花费、计划用量、限额贡献项，以及网关或花费上限信息（tengu_amber_lark）。

### /login 与 /logout

- **/login**：
  - 对象由 `_en()` 生成，实现经门面 `chunk-whwtfsqf.js` 指向 `chunk-vrmtstb0.js` 的 `call`（`chunk-vrmtstb0.js#nWi`）。
  - 描述在已登录时为 "Switch Anthropic accounts"。
  - `getLoginAvailability`（`chunk-e6aww6q8.js#$0e`）在云会话内返回 any-method / refused / claudeai-only；refused 时隐藏。
  - 登录后执行 runPostLoginHooks（刷新 advisor 模型、快速模式等）。
- **/logout**：属于 logout 运行时门控组，实现 `chunk-tndsj50r.js` 的 `u`，调用 `performLogout`（`chunk-th8w37yz.js#XLe`）清凭证与 OAuth 账户字段。

### /clear

- 别名 reset、new，实现 `chunk-4mtxrwhe.js`，调用 `clearConversation`（`chunk-231n2j4w.js#iOo`）：
  1. 停止后台任务；
  2. 清空消息与各类缓存（`commands/clear/caches.ts`：读文件状态、命令缓存、teleport 缓存）；
  3. 生成新会话 ID；
  4. 触发 session_start 钩子。
- 旧会话保留在磁盘上，可用 /resume 恢复。

## 8. 配置项、环境变量与开关

**环境变量：**

- 关闭命令：DISABLE_COMPACT、DISABLE_LOGIN_COMMAND、DISABLE_LOGOUT_COMMAND、DISABLE_INSTALL_GITHUB_APP_COMMAND、DISABLE_UPGRADE_COMMAND、DISABLE_EXTRA_USAGE_COMMAND
- 功能开关：CLAUDE_CODE_DISABLE_PLUGIN_FORWARDING、CLAUDE_CODE_NEW_INIT、CLAUDE_CODE_DISABLE_AGENT_VIEW、CLAUDE_CODE_LANTERN_PRISM、CLAUDE_CODE_HARBOR_KITE、CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL、CLAUDE_CODE_DISABLE_ADVISOR_TOOL、CLAUDE_CODE_DISABLE_FAST_MODE、CLAUDE_CODE_NO_FLICKER
- 提供方与会话：CLAUDE_CODE_USE_BEDROCK、CLAUDE_CODE_USE_VERTEX、CLAUDE_CODE_HOST_SKILL_CATALOG、CLAUDE_CODE_REMOTE、CLAUDE_CODE_REMOTE_SESSION_ID、IS_DEMO

**设置：**

- `skillOverrides`（on / off / user-invocable-only）
- `disableAgentView`、`disableRemoteControl`、additionalDirectories
- 启动选项 `disableSlashCommands`

**GrowthBook：**

| 开关 | 影响的命令 |
|---|---|
| tengu_ultraplan_config、tengu_ultraplan_prompt_identifier | /ultraplan |
| tengu_review_bughunter_config | /ultrareview |
| tengu_sage_compass2 | /advisor |
| tengu_kairos_brief_config | /brief |
| tengu_maple_sundial | /vim、/output-style 移到 /config |
| tengu_import | /import |
| tengu_slate_harbor_experiment | /init 新提示词 |
| tengu_flint_harbor_prompt、tengu_flint_harbor_share | /team-onboarding |
| tengu_violin_wood、tengu_violin_amati | /cloud-plugins |
| tengu_cobalt_plinth_sainfoin | /artifacts |
| tengu_keybinding_customization_release | /keybindings |
| tengu_harbor_kite | /list-agents |
| tengu_lantern_prism | /skill-doctor |
| tengu_nifty_lemur、tengu_cedar_ember | /limit-reset |
| tengu_c4e_slash_upsell | 企业版提示存根 |
| tengu_fancy_wand | /restart |
| tengu_auto_mode_config | /auto-mode-setup |
| tengu_rename_full_session_fork | /rename |
| tengu_amber_lark | /usage |

**组织策略（`dn`）：** allow_remote_sessions、allow_remote_control、allow_quick_web_setup、allow_team_onboarding、allow_heap_dump、allow_design_sync、allow_claude_browser_extension、allow_voice_mode，以及命令 `policyGate`。

## 9. 与 2.1.88 的差异

以 `references/claude-code-analysis/src/commands/` 目录与 `commands.ts` 对照 316 注册表。

**新增：**

- 云端与后台：cloud-plugins、teleport（公开）、autofix-pr（公开）、remote-env、web-setup、__remote-workflow、workflow-launch-exec、background（bg）、stop、daemon、workflows、list-agents（peers）
- 会话：fork（两种）、subtask、cd、recap、goal、focus、tui、scroll-speed、restart（update）
- 技能与插件：reload-skills、skill-doctor、import、auto-mode-setup、autocompact
- design：design-login、design-consent、design-revoke
- 提供方：setup-bedrock、setup-vertex
- 额度与订阅：usage-credits、pro-trial-expired、low-priority、limit-reset、claim-credit、企业版提示存根
- 其他：team-onboarding、artifacts、powerup、radio、wellbeing、pause-memory、loops

**改名、合并或改形态：**

- /cost、/stats → /usage 的别名。
- /extra-usage → 改名为 /usage-credits，留隐藏存根。
- /vim、交互端 /output-style → 移到 /config，留存根。
- /bug 成为主名（别名 share），/feedback 独立。
- /agents → 隐藏的 "(removed)" 存根。
- /review → 发行内建技能 code-review（别名 review）。
- /commit、/doctor → 发行内建技能（doctor 别名 checkup）。
- /security-review 仍为"已迁到插件"的提示词命令。
- 大量命令新增无头孪生（local 版）。

**删除：** /tag、/think-back、/thinkback-play、/files、/pr-comments、/init-verifiers、/env、/onboarding 等内部存根。

> 切分时，部分旧路径（例如 `commands/thinkback-play/index.ts`、`commands/tag/tag.tsx`、`commands/files/files.ts`）被按旧名匹配到了不相干的代码，详见 `docs/process/domain-commands.md`。

## 10. 待确认

- `nre` 里部分 local-jsx 实现 chunk（例如 /focus 交互版、/ultraplan）的入口函数未逐一命名。
- /fork 两版、/subtask 的完整执行链属于 agents 领域，本篇只记录入口。
- 企业版提示存根列表里 schedule/routines 对应的正式命令（发行技能 schedule）在外部构建中的可用条件未完全确认。
- /daemon 在构建期关闭（`fee`=false），实现 chunk 只做了入口命名。

## 11. 引用校验结果

校验时间 2026-11-04 06:40（UTC），对象为当时的 `reconstructed/`。脚本检查本文所有代码样式引用：路径是否存在（相对仓库根，或相对 `reconstructed/src/`，`.ts/.tsx` 对应 `.js`）；声明 id 是否在 `reconstructed/symbols.jsonl`；"路径 · 函数名"中的函数是否属于该文件；标识符与字面量是否出现在 `reconstructed/symbols.jsonl` 或阅读树代码中。在 2.1.316 找不到、但在 2.1.88 源码（`references/claude-code-analysis/src`）中存在的，计为"只在 2.1.88 中存在"（删除项、旧名，属预期）。

- 共检查 442 处引用：路径 49/51（另 2 个只在 2.1.88 中存在），名字 243/243，声明id 94/94，字面量 54/54；占位符与含空格的说明性文字 99 处未检查。
- 只在 2.1.88 中存在（删除项或旧名，预期如此）：`commands/thinkback-play/index.ts`、`commands/tag/tag.tsx`
- 未通过：0 处。
