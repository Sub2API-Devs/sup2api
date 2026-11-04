# 权限、Shell 与沙箱子系统手册（Claude Code 2.1.316）

> 领域：`permissions`（dom-permissions）。依据：`original/` 中 2.1.316 的代码；旧版 2.1.88（`references/claude-code-analysis`）只用来取名字、做对比。
> 写法约定：`路径 · 函数名`。路径是阅读树里的重组路径（`reconstructed/src/<路径>.js`）。括号里的 `chunk-xxx#压缩名` 是声明 id，可以用 `node tools/q.mjs show <id>` 查看。
> 函数名的来源有三种：门面（facade，Bun 门面 chunk 给出的原始导出名，最可信）、旧版（reference）、语义名（semantic，本领域起的）。凡是语义名，第一次出现时加 *斜体*。

## 1. 概述

这个子系统回答一个问题：**这次工具调用能不能执行，如果执行，在什么隔离下执行**。

它包括以下几部分：

- **权限模式与规则**：`types/permissions`、`utils/permissions/*`。负责模式枚举、规则解析与加载、规则更新与持久化、模式切换、危险规则剥离。
- **判定流水线**：`utils/permissions/permissions.ts` 中的 `decideWithToolCheckHooks`（`chunk-e6aww6q8.js#aWr`；写作时为顶层 `_new/` 模块，看作从 `permissions.ts` 拆出，后已放回该文件）。入口是 `hasPermissionsToUseTool`，依次走 deny/ask/allow 规则、`tool.checkPermissions`、安全检查、模式转换、自动模式分类器和 PermissionRequest 钩子。
- **自动模式分类器**：`utils/permissions/yoloClassifier`。用一个侧路模型调用，判断一个动作该不该拦截。
- **文件路径权限**：`utils/permissions/filesystem`、`pathValidation`。负责读/写判定、工作目录、危险文件、`.claude` 特判和 gitignore 风格的路径规则。
- **Bash/PowerShell 命令分析**：
  - `utils/bash/*`：316 自带的纯 TS bash 解析器加安全遍历器；
  - `utils/bash/commands.ts`：复合命令拆分与重定向；
  - `utils/shell/readOnlyCommandValidation`：只读命令白名单；
  - `utils/powershell/*`：调用 pwsh 自带的 AST 解析，并维护危险 cmdlet 表。
- **Shell 执行**：`utils/Shell.ts`（2.1.88 `utils/Shell.ts` 的主体；写作时为顶层 _new/exec）、`utils/ShellCommand`、`utils/shell/bashProvider`、`powershellProvider`、`utils/bash/ShellSnapshot`。
- **沙箱适配**：`utils/sandbox/sandbox-adapter.ts`（含 SandboxManager 门面，写作时为顶层 _new/SandboxManager）。把 settings 换算成 `@anthropic-ai/sandbox-runtime@0.0.81` 的配置；平台实现在 vendor 里。
- **安全存储**：`utils/secureStorage/*`。linux 构建只用明文 `.credentials.json`。

**谁调用它**：

- 工具执行：`services/tools/toolExecution.ts`、`services/tools/toolHooks.ts` · `resolveHookPermissionDecision`。
- 交互 UI：`hooks/useCanUseTool.ts`、`components/permissions/*`。
- `tools/BashTool/bashPermissions.ts`、`tools/PowerShellTool/*`、`tools/BashTool/shouldUseSandbox`。
- 启动参数：`main.tsx` 和 `cli/*` 处理 `--permission-mode`、`--dangerously-skip-permissions`、`--allowedTools`、`--add-dir`。

**它调用谁**：

- `utils/settings/*`：读各层 settings。
- `services/analytics/growthbook`：特性开关。
- `services/api/*`：分类器的侧路请求。
- `utils/hooks/*`：PermissionRequest 钩子。
- vendor `@anthropic-ai/sandbox-runtime`。

## 2. 模块地图

| 模块 | 职责 |
|---|---|
| `types/permissions` | 模式类型、Shift+Tab 循环 `getNextPermissionMode`（`chunk-n4pvm0gt.js#Qsn`，旧版名配错，见过程文档） |
| `types/permissions.ts`（原顶层 _new/INLINE_CODE_FLAGS，门面名，实际内容是权限类型） | `EXTERNAL_PERMISSION_MODES`、`parsePermissionMode`、`PERMISSION_DECISION_REASON_TYPES`，以及各类熔断（circuit breaker）谓词 |
| `utils/permissions/PermissionMode` | 模式展示配置 `PERMISSION_MODE_CONFIG`（标题/符号/颜色/对外名）；模式到基础行为的映射 `getModeBaseBehavior`（`chunk-dcmhvw5a.js#VXt`） |
| `utils/permissions/permissionRuleParser` | `permissionRuleValueFromString` / `permissionRuleValueToString`：解析 `Tool(content)` |
| `utils/permissions/shellRuleMatching` | Bash/PowerShell 规则的前缀与通配匹配 `matchWildcardPattern` |
| `utils/permissions/permissionsLoader` | 从 settings 各层加载规则（`loadAllPermissionRulesFromDisk`），处理托管独占和工作区信任闸门 |
| `utils/permissions/PermissionUpdate` | 六种更新的应用、校验与持久化 |
| `utils/permissions/permissionSetup` | 启动模式决定（`initialPermissionModeFromCLI`）、模式切换（`transitionPermissionMode`）、auto 闸门、危险规则剥离 |
| `utils/permissions/permissions` | 规则查询（`getAllowRules`、`toolAlwaysAllowedRule`…）、拒绝消息，以及部分工具专属规则检查 |
| `utils/permissions/permissions.ts`（原顶层 _new/decideWithToolCheckHooks） | **判定流水线主体**（`hasPermissionsToUseTool` 等，见 §5） |
| `utils/permissions/filterToolsByDenyRules.ts`（原顶层 _new/filterToolsByDenyRules） | 按整工具 deny 规则和启动工具清单从工具池剔除工具 |
| `utils/permissions/denialTracking` | 自动模式的连续/累计拒绝计数 |
| `utils/permissions/dangerousPatterns` | 进入 auto 时视为危险的 Bash 前缀（解释器、shell、sudo、ssh…） |
| `utils/permissions/shadowedRuleDetection` | 检测永远不会生效的 allow 规则 |
| `utils/permissions/bypassPermissionsKillswitch` | bypass/auto 的远程熔断检查 |
| `utils/permissions/yoloClassifier` | 自动模式分类器（§7） |
| `utils/permissions/filesystem`、`pathValidation` | 文件读写权限、路径规则、Shell 路径参数校验（§6） |
| `utils/bash/bashParser.ts` | 纯 TS bash 解析器，产出 tree-sitter-bash 形状的 AST，带缓存 |
| `utils/bash/ast` | 安全遍历：`parseForSecurityFromAst`、`checkSemantics` |
| `utils/bash/commands.ts`（原顶层 _new/extractOutputRedirections） | `splitCommand`、`extractOutputRedirections`、嵌套命令区间 |
| `utils/bash/commands`、`prefix`、`ParsedCommand`、`shellQuote*`、`utils/bash/specs/*` | 命令前缀提取、命令规格（timeout/nohup/time…）、引号处理 |
| `utils/shell/readOnlyCommandValidation` | git/gh/docker/rg 等只读子命令的 flag 白名单 |
| `utils/powershell/parser`、`dangerousCmdlets`、`staticPrefix` | PowerShell AST 解析、危险 cmdlet 集合、静态前缀 |
| `utils/Shell.ts`（原顶层 _new/exec）、`utils/ShellCommand`、`utils/shell/bashProvider`、`powershellProvider`、`utils/bash/ShellSnapshot` | 命令执行链 |
| `utils/sandbox/sandbox-adapter.ts`（SandboxManager 门面，原顶层 _new/SandboxManager） | 沙箱配置换算、初始化、命令包装 |
| `utils/secureStorage/*` | 凭据存储 |

## 3. 权限模式

### 3.1 枚举（以 316 为准）

`types/permissions.ts` · `EXTERNAL_PERMISSION_MODES`（`chunk-ktpw8eqa.js#w$`）：

```js
["acceptEdits", "auto", "bypassPermissions", "default", "dontAsk", "plan"]
INTERNAL_PERMISSION_MODES = [...EXTERNAL_PERMISSION_MODES]
PERMISSION_MODE_MANUAL_ALIAS = "manual"   // "manual" 等同 default
```

- **`auto` 已经进入对外枚举**。2.1.88 里 auto 只在 `feature('TRANSCRIPT_CLASSIFIER')` 编译开关下才加入内部枚举。
- `bubble` 是内部模式，不在枚举里，用在子代理定义里，表示“权限请求冒泡给父会话”。`utils/permissions/PermissionMode · isExternalPermissionMode` 就是 `mode !== "bubble"`。子代理的模式继承逻辑在 `chunk-0h4e7gnq`：父会话为 plan/dontAsk 时 bubble 跟随父会话，bubble 子代理也不设 `shouldAvoidPermissionPrompts`。
- 显示配置见 `PERMISSION_MODE_CONFIG`（`chunk-dcmhvw5a.js#uc`）。default 的标题在 316 里是 **"Manual"**（2.1.88 是 "Default"），plan 是 "Plan"，auto 是 "Auto"，dontAsk 是 "Don't Ask"。

### 3.2 每种模式的基础行为

`utils/permissions/PermissionMode.ts · getModeBaseBehavior`（`chunk-dcmhvw5a.js#VXt`）把模式映射成“没有规则命中时怎么办”：

| 模式 | 结果 | 实际处理位置 |
|---|---|---|
| `auto` | `classify` | 判定链里的 auto 分支（§5.3） |
| `bypassPermissions`（或 `YD(mode,…)` 为真） | `allow` | `abn` 中的 bypass 放行；safetyCheck 和 plan 地板除外 |
| `dontAsk` | `deny` | `hasPermissionsToUseToolInner` 把 ask 转成 deny，消息为 `DONT_ASK_REJECT_MESSAGE` |
| 其他（default/plan/acceptEdits） | `ask` | acceptEdits 在文件写判定里放行工作目录内的编辑（§6.2）；plan 在写判定里返回 ask |

### 3.3 Shift+Tab 循环

`types/permissions · getNextPermissionMode`（`chunk-n4pvm0gt.js#Qsn`）：

```
default → acceptEdits → plan → bypassPermissions（可用时）→ auto（可用时）→ default
dontAsk → default
```

- 能否循环到 bypass：`canCycleToBypassPermissions`（`chunk-n4pvm0gt.js#Jsn`）要求 `isBypassPermissionsModeAvailable`，并且没有被 `permissions.disableBypassPermissionsMode` 关掉。
- 能否循环到 auto：`canCycleToAuto`（`chunk-n4pvm0gt.js#qV`）要求 `isAutoModeAvailable` 和实时闸门都为真。实时闸门要求没有被熔断、主模型支持、settings 里没有 `disableAutoMode`。
- 2.1.88 里 ant 用户从 default 直接跳到 bypass/auto 的分支在 316 里已删除。

### 3.4 启动模式与切换

**启动模式**由 `utils/permissions/permissionSetup · initialPermissionModeFromCLI`（门面名）决定。按以下顺序取第一个可用的：

1. `--dangerously-skip-permissions`
2. `--permission-mode`
3. agent frontmatter
4. settings 的 `permissions.defaultMode`
5. 继承来的模式

约束：

- projectSettings/localSettings 不能把默认模式设为 bypass 或 auto，因为仓库内的文件不可信。
- 远程会话（CCR）只允许 acceptEdits/plan/default/auto。
- `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` 强制 default。
- 主动性档位（proactivity level）和 HIPAA 策略可能稍后才到位。这时先给出“暂定模式”，到位后由 `settleProvisionalStartupMode`（`chunk-zfbhezv9.js#DKn`）重算。

**模式切换**先经过守卫 `guardPermissionModeChange`（`chunk-zfbhezv9.js#voe`）/ `setPermissionModeWithGuards`（`chunk-zfbhezv9.js#IC`）：失败时返回 `{ok:false, code}`，code 取 `invalid_mode`、`bypass_restricted`、`bypass_disabled`、`bypass_not_launched`、`auto_mode_unavailable`。通过后统一走 `permissionSetup · transitionPermissionMode`（`chunk-zfbhezv9.js#Y0`）：

- **进入 auto**：要求闸门开着，否则抛错。调用 *stripDangerousPermissionsForAutoMode*，把危险 allow 规则（§4.4）移出上下文，存进 `toolPermissionContext.strippedDangerousRules`。
- **离开 auto**：调用 *restoreDangerousPermissions* 把这些规则加回。
- **进入 plan**：`prepareContextForPlanMode` 记录 `prePlanMode`。如果 plan 沿用 auto 分类器（`activatePlanAutoMode`），同样剥离危险规则。

**auto 闸门**：

- `permissionSetup · verifyAutoModeGateAccess` 读 GrowthBook `tengu_auto_mode_config` 的 `enabled`（取值 enabled/disabled/opt-in）和 `disableFastMode`。
- 不可用原因分四种：`settings`、`circuit-breaker`、`fast-mode`、`model`。
- 这个检查在模型或 fast 模式变化时重跑。不可用时 `createDisabledAutoModeContext`（`chunk-zfbhezv9.js#QHr`）把会话踢出 auto。
- `bypassPermissionsKillswitch` 模块负责 bypass/auto 的远程熔断检查。

## 4. 规则：语法、来源、加载、更新

### 4.1 语法

解析器：`utils/permissions/permissionRuleParser · permissionRuleValueFromString`。

- `Tool` 是整工具规则，`Tool(content)` 是带内容的规则。括号必须配对且在末尾，否则当作裸名或畸形规则处理。
- 内容为空或 `*` 时等同整工具规则。
- 内容里的 `\(`、`\)`、`\\` 会反转义；`permissionRuleValueToString` 是逆运算。
- 工具名经过别名映射（旧名映射到新名）。
- MCP：`mcp__server` 和 `mcp__server__*` 匹配该服务器的所有工具，`mcp__server__tool` 匹配单个工具。
- Bash/PowerShell 内容的匹配规则（`utils/permissions/shellRuleMatching · matchWildcardPattern`）：
  - 旧式前缀 `npm run:*` 仍然支持；
  - 通配写法里 `*` 匹配任意串，`\*` 是字面星号；
  - `cmd *` 只有一个尾部 `*` 时，参数可以省略（`cmd` 本身也能匹配）。
- 路径类工具（Read/Edit/Write…）的内容是 gitignore 风格的 glob，详见 §6.3。根的写法有四种：
  - `//abs` 表示文件系统根；
  - `~/x` 表示家目录；
  - `/x` 表示规则来源根；
  - 相对写法以 cwd 为根。
- `WebFetch(domain:example.com)`。沙箱配置也会读取这类 allow/deny 规则，见 §9。
- 有些工具使用 `key: value` 形式的字段规则（`Qf`），用于字段级 ask/deny。

### 4.2 来源

来源全集是 `_te`（`chunk-sfy7bm1n`），也是 SDK schema 里 `PermissionRuleSource` 的取值：

```
userSettings, projectSettings, localSettings, flagSettings, policySettings,   // settings 五层（oi）
cliArg, command, session,                                                     // --allowedTools 等 CLI 参数 / 命令 frontmatter / 会话内授权
mcpMount, toolsNarrowing, mcpServerPolicy, hostCredential                     // 316 新增
```

- 四个新增来源：
  - `mcpMount`：显示为 "Remote Control server mount"；
  - `toolsNarrowing`：工具收窄，和 `command` 同属一组（`NARROWING_RULE_SOURCES` = `["toolsNarrowing", "command"]`，`chunk-sfy7bm1n.js#_te`）；
  - `mcpServerPolicy`：MCP 服务器策略；
  - `hostCredential`：宿主凭据 deny。
  在路径规则里，这四个来源的根都取 cwd（`filesystem · rootPathForSource`）。
- 规则之间没有“优先级覆盖”。判定顺序固定为 **deny → ask → allow**（§5.2），任何来源的 deny 都先于任何来源的 allow。来源只决定三件事：显示、路径规则的根、以及能否被持久化或删除。

### 4.3 加载

`utils/permissions/permissionsLoader · loadAllPermissionRulesFromDisk`（门面名）：

- `allowManagedPermissionRulesOnly` 打开时，只读 policySettings。
- 工作区未受信任时，丢弃 projectSettings/localSettings 的 allow 规则和 `additionalDirectories`，每类只告警一次。相关门面名：`getProjectGrantGates`、`workspaceHasGatedGrants`、`firstGatedTrustDiagnosticFor`。
- `CLAUDE_CODE_EVAL_CONFINED`（插件评测）下，allow 规则只认 cliArg（`settingsGrantsConfined`）。
- `syncPermissionRulesFromDisk`、`applyPermissionRulesToPermissionContext`（在 `utils/permissions/permissions.ts`）在设置变化时重建上下文。

### 4.4 危险规则剥离与影子规则

- **危险判定**：`dangerousPatterns` 维护 Bash 前缀词表（`mQo`：python/node/bash/sh/eval/sudo/ssh…）。网络和云 CLI 只有在危险子命令时才算危险；PowerShell 走 `isDangerousPowerShellPermission`。
- **整工具规则**：`Bash` 和过宽的规则同样视为危险（门面名 `isOverlyBroadBashAllowRule`、`findOverlyBroadBashPermissions`）。由 GrowthBook `tengu_ant_yolo_equiv_strip_config` 按入口点控制（`isYoloEquivStripEnabledForEntrypoint`）。
- **影子规则**：`shadowedRuleDetection · detectUnreachableRules` 找出被整工具 deny 拦住、或被整工具 ask 遮蔽的 allow 规则。`/permissions` 界面和启动诊断（`collectPermissionRuleAdvisories`）会用到它。

### 4.5 PermissionUpdate

`utils/permissions/PermissionUpdate` 定义六种更新：

```ts
{ type: "addRules" | "replaceRules" | "removeRules", rules: {toolName, ruleContent?}[], behavior: "allow"|"deny"|"ask", destination }
{ type: "setMode", mode, destination }
{ type: "addDirectories" | "removeDirectories", directories: string[], destination }
```

- `destination` 取 `PERMISSION_UPDATE_DESTINATIONS`（`chunk-4p0ppc72.js#p`）的六项：userSettings/projectSettings/localSettings/flagSettings/cliArg/session。只有 user/project/local 三层会落盘；`setMode` 为 bypass 时不落盘。
- 316 新增运行时校验 `_i`：放宽型更新必须能经过存储往返，收紧型更新只丢弃畸形项。
- `withoutGrantsForRemoteScope` 在远程作用域下去掉授权型更新。
- 权限对话框的“总是允许”建议（`suggestions`）就是 PermissionUpdate 数组。

## 5. 一次工具调用的权限判定

### 5.1 调用链总览

```
services/tools/toolExecution.ts
 └─ runPreToolUseHooks → services/tools/toolHooks.ts · resolveHookPermissionDecision(hookResult, …, canUseTool)
     ├─ 钩子 deny → 直接拒绝（runPermissionPipeline 记账）
     ├─ 钩子未表态 → canUseTool(...)
     └─ 钩子 allow/ask → checkRuleBasedPermissions(...)（deny/ask 规则与安全检查仍然有效）
          ├─ 规则 deny → 拒绝（"deny rule overrides"）
          ├─ 规则 ask / 安全检查 / plan 地板 → canUseTool(...)（钩子 ask 时带 hookAskFloor）
          └─ 否则采纳钩子 allow（requireCanUseTool 时仍走 canUseTool）
canUseTool = hooks/useCanUseTool.ts → utils/permissions/permissions.ts · hasPermissionsToUseTool (GE)
 └─ hasPermissionsToUseToolWithSink (gKe)
     ├─ hasPermissionsToUseToolInner (dTr)
     │    ├─ decideWithToolCheckHooks (aWr) —— 插件 tool.check 裁决层
     │    │    └─ evaluate → checkToolAndRulePermissions (abn)
     │    ├─ allow → 清零连续拒绝 → 返回
     │    └─ ask → 按模式：dontAsk→deny；auto→分类器；bypass→安全检查弹窗限时；无法弹窗→钩子/拒绝
     ├─ ask 且带 refusal → resolveAskWithoutPrompt (nCe)
     ├─ personAskAfterHooks (nWr) —— PermissionRequest 钩子
     ├─ deny → 标记 decideLocation "pre-ask"；否则 safetyCheck 结论抑制“总是允许”
     └─ 记录决定（nkn）
→ 结果为 ask 时由 UI（components/permissions/*）弹窗，用户选择后产生 PermissionUpdate
```

### 5.2 规则与工具自检

`utils/permissions/permissions.ts` · `checkToolAndRulePermissions`（`chunk-e6aww6q8.js#abn`，*语义名*）依次执行：

1. 已中止则抛 AbortError。
2. 提前裁决 `rbn`。
3. **deny 规则**（`Qf(ctx, tool, input, "deny")`）命中 → `{behavior:"deny", decisionReason:{type:"rule", rule}}`。
4. **整工具 ask 规则**（`Fa`）命中 → 走 ask 规则路径。有两个例外：
   - Bash 在沙箱自动放行时：`isSandboxingEnabled && isAutoAllowBashIfSandboxedEnabled && shouldUseSandbox(input)`；
   - `mcpServerPolicy` 来源在远程 bypass 下可豁免（`tengu_mcp_server_policy_bypass_exempt`）。
5. 调用 **`tool.checkPermissions(input, ctx)`**，各工具自己的检查在这里执行（BashTool 的 AST 分析、文件工具的 §6 判定等）。
6. 安全修正和校验：`requireAutoModeClassifierReview`（`chunk-e6aww6q8.js#s2e`）、`validateEmpty`、`buildDesktopActionReviewAsk`（`chunk-e6aww6q8.js#n2e`）；字段级 ask 规则；`requiresUserInteraction`。
7. 沙箱或只读自动放行的 allow 可能被改为 ask，交服务端复核（`shouldRetagAskAsSandboxOverride`、`sandboxOverrideAskGuardsOn`；改标由 GrowthBook `tengu_curried_squirrel` 控制）。
8. MCP 工具的 `effectiveMaxPermission === "ask"` 上限（`askCeilingReason`）。
9. **bypassPermissions 模式**放行。不能放行的有两类：safetyCheck（例如 `.claude/settings.json`、`.git/`）和 plan 地板。
10. **allow 规则**（*findApplicableAllowRule*，`chunk-e6aww6q8.js#Kkn`）。
11. `passthrough` 转为 `ask`，消息由 `createPermissionRequestMessage` 生成。

`checkRuleBasedPermissions`（门面名，`chunk-e6aww6q8.js#jC`）是给 PreToolUse 钩子返回 allow/ask 时复核用的变体：它同样调用 `tool.checkPermissions` 并施加 plan 写地板（`planModeWriteFloor`），但只返回 deny/ask，其余情况返回 null（不做 bypass/allow 规则放行）；检查崩溃且 `crashIsObjection` 时返回 ask。

### 5.3 hasPermissionsToUseToolInner 的模式分支

函数是 `chunk-e6aww6q8.js#dTr`（*语义名 hasPermissionsToUseToolInner*，对应 2.1.88 同名函数）。

**结果为 allow**：如果是 auto 模式，且 `denialTracking.consecutiveDenials > 0`，则清零连续拒绝数，然后返回。

**插件评测**：插件评测运行（`yte()`）中，如果评测授权不覆盖这次调用，则拒绝。

**结果为 ask** 时按模式处理：

- **dontAsk**：直接 deny（`decisionReason {type:"mode", mode:"dontAsk"}`）。
- **auto**，或 Chrome 类工具按域名授权：
  1. 以下情况回退给人工，不交分类器：safetyCheck（`classifierApprovable: !1`）、ask 规则意图（`carriesAskRuleIntent`）、plan 地板、钩子要求弹窗（`hookAskFloor`）。
  2. 用 acceptEdits 上下文重跑 `checkPermissions` 的快路径。能放行就放行，不调模型。
  3. 安全工具白名单（`onSafeAllowlist`，主要由 `isBrowserToolAutoAllowed`（`chunk-e6aww6q8.js#kWt`）判定）。
  4. 插件或合成调用跳过分类器。
  5. 调用 `yoloClassifier · classifyYoloAction`（本地 `localClassifierSite:"gate"`），或使用服务端分类器（`serverHeldShellAllowSource` 等）。
  6. 被拦截时 `recordAutoModeDenial` 计一次拒绝，`enforceAutoModeDenialLimits` 检查上限。超限后上报 `tengu_auto_mode_denial_limit_exceeded`：headless 会话抛 AbortError；交互会话回退人工，并带 `denialLimitFallback` 和限时自动拒绝窗口 `autoDenyWindow`（时长取 `CLAUDE_CODE_TICKLISH_WHISPER_TIMEOUT_MS`）。只有累计超限才清零计数。
  7. 放行时 `recordAutoModeSuccess`。
- **bypassPermissions**：遇到 safetyCheck 弹窗时按限时策略处理（`lkn`）。
- **无法弹窗**（`shouldAvoidPermissionPrompts`，例如后台代理）：`resolveAskWithoutPrompt`（`chunk-e6aww6q8.js#nCe`）/ `consultPermissionRequestHooksForUnpromptableAsk` 让 PermissionRequest 钩子代替人工；钩子不表态就拒绝（`decisionReason` 的 `type: "asyncAgent"`，即 `denyPromptUnavailable`）。

### 5.4 钩子对权限的影响

- **PreToolUse 钩子**在 `toolHooks · resolveHookPermissionDecision` 生效，位置在 canUseTool 之前：
  - 返回 `permissionDecision:"deny"` 时直接拒绝；
  - 返回 `allow` 时**不能越过** deny/ask 规则、安全检查和 plan 写地板（`planModeWriteFloor`），只能省掉一次普通弹窗；
  - 返回 `ask` 时强制走完整流水线，并带 `hookAskFloor`，于是分类器的 allow 也会重新变成 ask；
  - `updatedInput` 由 `guardHookUpdatedInput` 校验，改写后的输入如果需要询问，原因是 `HOOK_REWRITTEN_INPUT_ASK_REASON`。
  - auto 模式下钩子 allow 有时会被汇入分类器（GrowthBook `tengu_virtual_knuth`），上报事件 `tengu_auto_mode_hook_allow_funneled`。
- **PermissionRequest 钩子**在 `personAskAfterHooks`（`chunk-e6aww6q8.js#nWr`）中生效，时机是 ask 即将弹窗之前：
  - 钩子 deny 立即生效；
  - 钩子 allow 只在结果带 `hooksMayAllow` 时生效（安全检查类 ask 不允许钩子放行）；
  - `hooksMayRefuse` 控制钩子能否拒绝。
- **插件 `tool.check`**：`decideWithToolCheckHooks`（`chunk-e6aww6q8.js#aWr`）是插件工具检查的裁决层，某些情况下插件只能收紧、不能放宽。

### 5.5 拒绝跟踪

`utils/permissions/denialTracking`：

- 上限：连续 **3** 次、累计 **20** 次。
- 同一条 assistant 消息只计一次。
- 模型改写输入后重试成功，会撤销这次计数（`lastRewriteFingerprint`、`undoRewriteDenialIfRetried`）。
- 用户手动批准后清零连续计数（`resetDenialStreakAfterUserApproval`）。
- 状态存放在 `appState.denialTracking`，子代理用 `localDenialTracking`。

## 6. 文件路径权限

### 6.1 读：`utils/permissions/filesystem · checkReadPermissionForTool`（`chunk-82kqcve8.js#WA`）

1. Read deny 规则：对路径的每种拼写（符号链接解析、Windows 短名、WSL 第二挂载根）都要查，命中即 deny。
2. 记忆暂停时，读记忆文件 → deny（`MEMORY_PAUSED_MESSAGE`）。
3. `restricted` 或 `permissions.blockReadsOutsideWorkingDirectories` 下，读工作目录外的路径 → deny 或 ask。路径无法解析 → deny。
4. 网络路径防御 `checkReadNetworkPathSafety`（`chunk-82kqcve8.js#dYe`）：`/net`、`/Network` 自动挂载、`/.vol` 等内核重定向前缀，以及不在 `trustedNetworkDirectories` 里的 UNC 路径 → ask。
5. Read ask 规则 → ask。
6. 同一路径可写（用非 plan 上下文调写判定，结果为 allow）→ 允许读。
7. 在工作目录内（`pathInWorkingPath`，macOS 上 `/private/var`、`/private/tmp` 归一）→ allow。
8. 内部可读路径（`checkReadableInternalPath`）→ allow。包括：项目目录、计划文件、工具结果、scratchpad、项目临时目录、tasks/、teams/、内置 skill 参考文件。
9. Read allow 规则 → allow。
10. 都不满足 → ask，附带 Read 会话规则建议。

分层读判定 `Swe` 把以上结论归为 bare-deny / path-deny / path-rule-ask / bare-ask / path-mode-ask / allow 几层。

### 6.2 写：`filesystem · checkWritePermissionForTool`（`chunk-82kqcve8.js#Y_`）

1. 早期判定（`writeDenyPrefix`，`chunk-82kqcve8.js#j9r`），以及会话内允许的 skill 目录规则。`blockWritesOutsideWorkingDirectories` 打开时，写到工作目录外或疑似设置文件的路径直接 deny（`writeDenyPrefix`、`writeBlockRefusal`、`settingsFileCertainty`：`chunk-82kqcve8.js#j9r`、`chunk-82kqcve8.js#oYt`、`chunk-82kqcve8.js#lvn`），与读侧开关对称。
2. Edit deny/ask 规则。
3. 内部可写路径（`checkEditableInternalPath`）：
   - 放行：当前会话的计划文件、scratchpad、workflow 脚本、agent/auto 记忆 `.md`、`.claude/launch.json`、后台会话的 `$CLAUDE_JOB_DIR/tmp`；
   - 拒绝：宿主凭据文件（`CLAUDE_CODE_HOST_CREDS_FILE`）、配置目录下的 `jobs/`、`daemon/`、`daemon.json`、`shell-snapshots/`、`session-env/`、`adopt.json`、`~/.claude/seed-admin`、`state/settings-review.json`。
4. 安全检查 `checkPathSafetyForAutoEdit`，结果为 `{safe, message, classifierApprovable, circuitBreaker?}`：
   - 危险目录 `.git .vscode .idea .claude .husky .cargo .devcontainer .yarn .mvn`，以及 `.config/git`；
   - 危险文件（shell rc、`.gitconfig`、`.mcp.json` 等）；
   - Claude 设置文件 `isClaudeSettingsPath`，包括 realpath 后指向设置文件的符号链接；
   - 可疑的 Windows 路径（`classifySuspiciousWindowsPathPattern`，`chunk-82kqcve8.js#nYt`）：ADS 冒号、8.3 短名、设备前缀、结尾点或空白、DOS 设备名、`...` 段、不可信 UNC。
   `.claude/worktrees` 放行；`.claude/skills`、`.claude/agents`、`.claude/commands` 视情况放行，并建议限定到单个 skill 的规则。不安全时返回 ask，`classifierApprovable` 决定 auto 分类器能否放行。
5. plan 模式 → ask。
6. acceptEdits 且在工作目录内 → allow。
7. Edit allow 规则 → allow。
8. 其他 → ask，附 `addDirectories` 建议；如果经符号链接落到工作目录外，说明实际落点。

工作目录集合 = cwd + `toolPermissionContext.additionalWorkingDirectories`（来自 `--add-dir`、`permissions.additionalDirectories`、会话内添加）。

### 6.3 路径规则匹配

1. `filesystem · patternWithRoot` 把规则拆成 `{relativePattern, root}`。根的取法：
   - `//x` 是文件系统根，Windows 上 `//c/` 是盘符根；
   - `~/` 是家目录；
   - `/x` 是规则来源根：session/cliArg 类来源用 cwd，settings 类来源用该设置文件所在目录；
   - 相对写法的根为 null。
2. `matchingRuleForInput` 用 `ignore` 库按 gitignore 语义匹配：把路径换成相对规则根的形式，倒序取最后一条命中的规则，并处理 `x/**` 与 `/x` 的等价写法。
3. `matchingRuleForInput`（`chunk-82kqcve8.js#xa`，同名内层为 `matchingRuleForInput_2`）在外层补查 WSL 第二挂载根（GrowthBook `tengu_zesty_pearl`），命中时上报 `tengu_path_rule_matched_through_second_root_mount`。
4. `getFileReadIgnorePatterns`、`normalizePatternsToPath` 把 Read deny 规则换算成 Grep/Glob 的忽略规则。

### 6.4 Shell 路径参数：`pathValidation · validatePath`

以下情况一律要人工确认：

- UNC 路径；
- `~user`、`~+`、`~-`；
- `$`、`%`、反引号、`=` 等 shell 展开；
- 目录后跟 `..`；
- 写目标含花括号或 glob；
- glob 之后出现 `..`（`swn`）。

受保护的系统路径由 `isDangerousRemovalPath`（`chunk-fq0cr76a.js#h4e`，门面名）判定。

读路径里的 glob 按基目录判定，其余情况交给 `isPathAllowed`（读/写判定的同一套逻辑）。`isPathInSandboxWriteAllowlist` 用来判断“沙箱里本来就允许写”的路径。

## 7. 自动模式分类器（yoloClassifier）

### 7.1 何时调用

主要调用方：

- 判定链的 auto 分支（§5.3）；
- 子代理交回审查（*buildSubagentHandbackMessage*，`a5s`）；
- 其他几个侧路调用。

入口是 `utils/permissions/yoloClassifier · classifyYoloAction`（`chunk-e6aww6q8.js#JCe`），参数 `(messages, action, tools, context, signal, {localClassifierSite, severityEligible…})`。

### 7.2 构造请求

1. 动作被压缩成 JSONL 行，形式为 `{"<工具名>": tool.toAutoClassifierInput(input)}`。如果压缩结果为空（工具声明这次调用与安全无关），直接放行，`classifierRan=false`。
2. GrowthBook `tengu_bright_dragonfly` 关闭本地分类器时一律拦截，错误类型为 `CLASSIFIER_SWITCHED_OFF`。
3. 并行组装以下几部分：
   - **系统提示词** `buildYoloSystemPrompt`（`chunk-e6aww6q8.js#Jbr`）：基础模板，加上 settings `autoMode.{allow, soft_deny, hard_deny, environment}`（只认 user/flag/managed 三层），再加权限模板。
   - **转录** `buildClassifierTranscriptEntries`（`chunk-e6aww6q8.js#UJe`），每行一条 JSONL：
     - 用户文本 `{"user": …}`；
     - 工具调用 `{"<tool>": …, "id": 末 6 位}`；
     - 工具结果 `{"outcome": ok|error|interrupted|rejected-by-user|blocked-by-permissions|automode-blocked…}`；
     - 另有 host_context、result_from、meta、omitted_turns 等行。
     assistant 的文本默认不进入转录。与保留键同名的工具名加方括号；U+2028、U+2029、U+0085 一律转义，防止伪造行。
   - **CLAUDE.md 前缀**（`buildClaudeMdMessage`）、**转发回合块**（`buildForwardedUserTurnsBlock`）、仓库可见性、git 状态。
4. 发送的 user 消息依次为：`<transcript>`、各转录块、`</transcript>`、转发回合、阶段后缀。`CLAUDE_CODE_AUTO_MODE_SEGMENTED_TRANSCRIPT` 或 GrowthBook `segmentedTranscript` 打开时，每块单独一条消息。
5. 系统块和 CLAUDE.md 块带 `cache_control`，ttl 为 1 小时。转录最后一块打缓存断点（`transcriptCacheTtl` 可以降到 5 分钟）。

### 7.3 模型与两阶段 XML

- **模型**：`resolveClassifierModel`（`chunk-e6aww6q8.js#dpn`）按以下优先级选择：
  1. GrowthBook `tengu_auto_mode_config.model` / `modelByMainModel`（要经过组织模型策略校验）；
  2. `CLAUDE_CODE_AUTO_MODE_MODEL`（服务端已配置模型时会被忽略并告警）；
  3. 主模型。
  这个顺序与 2.1.88 相反，2.1.88 是 env 优先。
- **请求参数**：`querySource:"auto_mode"`、`skipSystemPromptPrefix`、`forceAttributionHeader`；temperature 取 `CLAUDE_CODE_AUTO_MODE_TEMPERATURE`，默认 1。
- **`classifyYoloActionXml`（`chunk-e6aww6q8.js#kwr`）**：
  - **stage 1**：`max_tokens` 为 64（fast 模式 256），`stop_sequences:["</block>"]`，后缀要求回复直接以 `<block>yes|no</block>` 开头。判 allow 就立即返回 `stage:"fast"`。
  - **stage 2**：`max_tokens` 8192，先写 `<thinking>`，再给出 `<block>` 和 `<reason>`。stage 2 的结论覆盖 stage 1。
  - **严重度模式**：`severityBySite` / `severityByModel` 配了阈值时启用。输出 0–100 的 `<severity>` 加 `<category>`，超过阈值（默认 15/20）就拦截。
  - 解析函数：`<block>` 由 `parseXmlBlock`（`chunk-e6aww6q8.js#IJe`）负责，出现矛盾的取值时返回 null；`<category>` 由 `parseXmlCategory`（`chunk-e6aww6q8.js#ESn`）负责；`<reason>` 由 `parseXmlReasonTag`（`chunk-e6aww6q8.js#vSn`）负责。
- **超时**：stage 1 的截止时间是 `min(120s, 60s + ⌈(tokens−50k)/50k⌉×10s)`；stage 2 每次调用 120 秒。
- **重试**：内部最多重试 `maxRetries` 次（默认 4）。外层只对暂时性错误（超时、连接、429、5xx）重试，次数为 `unavailableOuterRetries`（默认 0），退避为 2s 指数增长、上限 10s。主模型不可用时可以换备用模型。
- **失败**：一律 `shouldBlock:true`，区分以下几种：用户中止、transcriptTooLong、被安全监控拦截（不重试）、stage 2 出错但 stage 1 已有判定、其余的 "Classifier unavailable"。出错时提示词会写到会话级 dump 文件（权限 0600）。

### 7.4 结果

```ts
{ shouldBlock, reason, category?, thinking?, model, usage, durationMs, promptLengths, stage: "fast"|"thinking",
  stage1Usage?, stage1DurationMs?, stage1RequestId?, stage2…, severity?,
  unavailable?, failureMode?, refusedBySafeguard?, errorKind?, httpStatus?, retryAfterMs?, transcriptTooLong?, errorDumpPath?,
  fallbackFrom?, primaryUsage? }
```

拦截时，判定链返回 `{behavior:"deny", decisionReason:{type:"classifier", classifier:"auto-mode", reason}}`（UI 显示为 automode-blocked），并上报 `tengu_auto_mode_outcome` / `tengu_auto_mode_decision`。

## 8. Bash 命令分析

### 8.1 解析

调用链：

```
tools/BashTool/bashPermissions.ts · bashToolHasPermission
 └─ utils/bash/parser.ts · parseCommandRaw            超过 10000 字符 / 解析返回 null / 抛异常 → PARSE_ABORTED（tengu_tree_sitter_parse_abort）
     └─ utils/bash/bashParser.ts · parseCached (chunk-k5vy5m8c.js#Qe)
          └─ parseSource: parseProgram → parseStatements → parseAndOr → parsePipeline → parseCommand
                          → parseSimpleCommand / tryParseRedirect / scanHeredocBodies
```

- **316 的解析器是纯 TS 写的**，不再有原生 tree-sitter，也没有正则回退。它产出 tree-sitter-bash 形状的节点 `{type, text, startIndex, endIndex, children}`，偏移按 UTF-8 字节计。2.1.88 的 `parseCommand` 受 `feature('TREE_SITTER_BASH')` 控制，不可用时退回 shell-quote；这条路径和 `parse-unavailable` 结果在 316 里都已删除。
- 节点上限 50000，默认超时 50ms。
- 缓存上限是 64 条或总长 32000 字符。缓存键包含三个 GrowthBook 开关的值：`tengu_tingly_pearl`、`tengu_calm_nautilus`、`tengu_foamy_heron`。
- 检测到 bash 与 zsh 的解析分歧（zshBraceDiff、zshCondParenDiff、dollarOperandDiff、keywordDesync）时，根节点包成 ERROR，结果按“太复杂”处理。

### 8.2 安全遍历

`utils/bash/ast · parseForSecurityFromAst`（门面名，`chunk-r01896cg.js#w1`）是包装层：

- 先跑 first 轮。
- 如果结果含循环且 `tengu_snappy_tower` 打开，再跑 later 轮（循环体按迭代后的状态重走）。两轮结果不同时，加 `laterLoopPassesDiffer`。

核心是 `chunk-r01896cg.js#at`，按以下顺序检查：

1. **字节级预检**：孤立代理项、控制字符、Unicode 空白、反斜杠空白，以及 zsh 的 `~[`、`=cmd`、`<N-M>`、花括号内的引号。
2. 解析中止、反引号扫描异常、解析器跳过的字节、fd 变量重定向、重定向形状、结构性解析错误。
3. `walkProgram` → `collectCommands` 递归各类节点：
   - **list/pipeline**：`||` 和 `&` 分支复制变量作用域；pipeline 内的赋值不外泄。
   - **for/while/if**：作用域合并，循环变量受限，嵌套上限 5 层。
   - **变量**：已跟踪的变量用实际值，未知值用 `__TRACKED_VAR__`；分支或循环之后值不确定的用 `__UNCERTAIN_VAR__`（316 新增）。
   - **命令替换**：`$(…)` 递归收集里面的命令，外层值用 `__CMDSUB_OUTPUT__` 代替。`$(cat <<'EOF' … EOF)` 可以安全内联（`extractSafeCatHeredoc`）。
   - **heredoc**：分界符加引号的才放行；不加引号的只在正文只含可解析的 `$name` 时放行。
   - **重定向**：分为文件重定向、heredoc 和 herestring 三类。

返回值：

```ts
{ kind: "simple", commands: SimpleCommand[], bareAssignmentNames, hasLoop, tree?, usesAssignedValue?, uncertainWrite?,
  laterLoopPassesDiffer?, declarationPrefixes? }
| { kind: "too-complex", reason, nodeType?, differential?, divergentShape?, keepsRemovalVerdict? }
SimpleCommand = { argv, envVars: [{name, value, isAppend?}], redirects: [{op, target, fd, targetSourceLiteral}], text,
                  hasUnquotedGlob, argvSourceLiteral, … }
```

### 8.3 语义检查

`ast · checkSemantics`（门面名）的处理顺序：

1. 先剥掉包装命令：time、nohup、timeout、nice、env、stdbuf、command、builtin、noglob、xargs。命令规格在 `utils/bash/specs/*`。
2. 再检查以下几类：
   - eval 类命令；
   - zsh 危险内建；
   - awk 的 `system()`、getline、`@load`；
   - `find -exec`；
   - `/proc/*/environ`；
   - `test -v` 的下标求值；
   - 用 shell 关键字作命令名；
   - 换行后紧跟 `#`。
3. 返回 `{ok:true}` 或 `{ok:false, reason}`。

`watch`、`setsid`、`strace`、`flock`、`unshare` 等不在剥离之列，属于“不处理的执行包装”（`tme`），按不安全处理。

### 8.4 拆分、重定向、只读判定

- **拆分**：`utils/bash/commands.ts` · `splitCommand` 按 program/list/pipeline 递归拆分，跳过分隔符和重定向。`splitCommandForExemptionMatch` 用于排除命令的匹配。
- **重定向提取**：`extractOutputRedirections` 返回 `{commandWithoutRedirections, redirections, hasDangerousRedirection, dangerousRedirectionReason}`，其中 reason 取 `shell_expansion` 或 `network_device`。
- **前缀**：`utils/bash/prefix`、`utils/shell/specPrefix` 提取命令前缀，用于“总是允许 `npm run:*`”这类建议。
- **只读判定**：`utils/shell/readOnlyCommandValidation` 维护白名单：
  - 结构是 `{safeFlags: {flag: "none"|"string"|"number"|"char"|…}, additionalCommandIsDangerousCallback, respectsDoubleDash}`；
  - git 有 24 个子命令，gh 约 22 个，另有 docker logs/inspect、rg 等；
  - `validateFlags` 逐个校验 token：未知 flag、缺值、值以 `-` 开头、类型不符都判为非只读；
  - 额外拦截：git 格式串里的 `%G` / `%(signature)`（会触发 gpg）、docker 的 `-H` / `--context`、UNC 路径。
- **sed、cd、路径约束**：`tools/BashTool/{sedValidation, pathValidation, modeValidation, readOnlyValidation}` 属于 tools 领域，这些检查在 `tool.checkPermissions` 里调用。

### 8.5 PowerShell

- **解析**：`utils/powershell/parser · parsePowerShellCommand` 起一个 pwsh 子进程（`-EncodedCommand` 载入解析脚本，命令以 base64 从 stdin 传入），用 PowerShell 自带的语言解析器得到 AST JSON。
  - 超时取 `CLAUDE_CODE_PWSH_PARSE_TIMEOUT_MS`，默认 5000ms；最多试 2 次。
  - 每个宿主一个 256 项 LRU 缓存。
  - 命令超过 32767 字节，或含 `` `u{…} `` 码点转义，直接判为无效。
- **安全标志**：`deriveSecurityFlags` 给出子表达式、脚本块、splat、成员调用、赋值、停止解析等标志。
- **危险 cmdlet**：`dangerousCmdlets` 分 7 类集合：按文件路径执行、脚本块执行、模块加载、进程生成、网络、别名劫持、WMI/CIM。另有 `NEVER_SUGGEST` 集合，这些命令永不建议加入“总是允许”。

## 9. 沙箱

### 9.1 何时对命令启用沙箱

`tools/BashTool/shouldUseSandbox` 依次判断：

1. scrub 沙箱模式可用时，一律用沙箱。
2. `SandboxManager.isSandboxingEnabled()` 为假时不用。
3. Windows 上 bash 没有 Git Bash 时不用。
4. 以下条件都满足时不用沙箱：
   - 带 `dangerouslyDisableSandbox`；
   - 没有禁止沙箱外执行（`sandbox.allowUnsandboxedCommands` 为 false、托管策略、`CLAUDE_CODE_EVAL_CONFINED` 都会禁止）；
   - 是用户亲手输入的命令，或 `areUnsandboxedCommandsAllowed()` 为真。
5. 所有子命令都命中 `sandbox.excludedCommands` 时不用。

### 9.2 Claude Code 侧适配

门面对象是 `utils/sandbox/sandbox-adapter.ts` · `SandboxManager`（`chunk-fq0cr76a.js#Ke`），包装 vendor 的同名对象（`chunk-fq0cr76a.js#on`）。

**`isSandboxingEnabled`**：

- diskless 会话和本会话已禁用沙箱时为假。
- 必需（`sandbox.failIfUnavailable`）但不可用时视为开启，这样后续命令会被拒绝。
- 其余情况要求以下都成立：
  - `passesCheapSandboxGates`：设置已开启，并且平台在 `enabledPlatforms` 里（只认托管层）且受支持；
  - 依赖检查无错。

**配置换算** *convertToSandboxRuntimeConfig*（`chunk-fq0cr76a.js#Q0`），输入是合并后的 settings 和权限规则：

- **network**：
  - `allowedDomains` 来自 `sandbox.network.allowedDomains` 和 `WebFetch(domain:…)` 的 allow 规则；
  - `deniedDomains` 来自 deny 规则；
  - 另有 unix socket、本地绑定、`httpProxyPort`/`socksProxyPort`、`tlsTerminate`。
- **filesystem**：
  - `denyRead` 来自 `Read(...)` deny 规则、`sandbox.filesystem.denyRead`、`sandbox.credentials.files`；
  - `allowWrite` 包括 cwd、额外工作目录、Edit allow 规则、临时目录；
  - `denyWrite` 包括 settings 文件、`.claude/skills`、`.claude/agents`、`.claude/commands`、`.claude/hooks`、`.git/hooks`、`.git/config`、`.mcp.json` 等；
  - 另有 `allowRead`、`disabled`。
- **credentials**：envVars/files 的遮罩（mask）或拒绝（deny）。
- 其他字段：`ignoreViolations`、`enableWeakerNestedSandbox`、`allowNestedUserNamespaces`、`enableWeakerNetworkIsolation`、`allowAppleEvents`、`ripgrep`、`seccomp`、`bwrapPath`、`socatPath`、`windows{sandboxUser, srtWin}`。

）只看 policySettings；`areSandboxSettingsLockedByPolicy`（`AV`）看 flag 和 policy 两层。两者都只检查 enabled、autoAllowBashIfSandboxed、allowUnsandboxedCommands 三个键。

**按命令的网络放行**：allowManagedDomainsOnly、strictAllowlist、`CLAUDE_CODE_EVAL_CONFINED` 任一成立时被扣下（`Dor`）。配置构建后被重新链接的授权和 deny 字面路径会在运行中复查撤下（`aV`、`hue`，事件 `tengu_sandbox_late_symlink_grant_dropped`）。

**可信层过滤**：管理员强制时，project/local 层的放宽项一律忽略。强制的来源有：GrowthBook `forbidUnsandboxedCommands`、托管层 `allowManagedDomainsOnly`、托管层或 `--settings` 里的 `allowUnsandboxedCommands=false`。`strictAllowlist` 和 `allowManagedReadPathsOnly` 生效时，相应的放行也只认可信层。

**初始化** `initializeSandbox`（`chunk-fq0cr76a.js#hw`）：

- 构建配置后调用 vendor 的 `initialize`。
- 之后订阅设置变化、插件目录变化和 5 个 GrowthBook 开关，变化时调用 `refreshConfig`。
- 失败分三类报错：工作目录被拒、必需、普通。普通失败时本会话禁用沙箱。

### 9.3 平台实现

平台实现都在 vendor 的 `sandbox-manager.js · wrapWithSandbox`，按平台分支：

| 平台 | 实现 |
|---|---|
| macOS | `/usr/bin/sandbox-exec` + 生成的 seatbelt profile（`macos-sandbox-utils`），另有违规日志监视 |
| Linux / WSL2 | bubblewrap（`bwrap`）+ seccomp 过滤器 + socat 网络桥（`linux-sandbox-utils`） |
| Windows | `srt-win` + 专用沙箱账户，ACL 授权，WFP 出站检查。Claude Code 侧只能走 `wrapWithSandboxArgv` 得到 `{argv, env, unsetEnv}`，另有原生 deny 列表和退出码翻译 `classifyWindowsSandboxLaunchExit`；tlsTerminate 的 CA 来源分 trustedPair、managed、unavailable；命令行接近 OS 上限时报 SandboxCommandTooLongError |

网络在所有平台上都通过本地 HTTP/SOCKS 代理加域名过滤实现。`tlsTerminate` 打开时由 MITM CA 终止 TLS，用于凭据注入。

## 10. Shell 执行

调用链：

1. `utils/Shell.ts` · `exec`（`chunk-e6aww6q8.js#hbe`）是入口。
2. 选 shell 提供者：bash 走 `createBashShellProvider`，powershell 走 `getPsProvider`。
3. `buildExecCommand` 拼出完整命令串，依次包括：`source <快照>`、TMPDIR、会话环境脚本、PATH、关闭 extglob、去掉 which 等别名劫持、`eval '<命令>'`、`pwd -P >| <cwd 文件>`，最后套上 `CLAUDE_CODE_SHELL_PREFIX`。
4. 校验 cwd：与权限检查时的 cwd 对比（`permissionCheckedCwdOf`）；目录被删除或被换成链接时拒绝（`MissingWorkingDirectoryError`）；worktree 隔离防止逃逸。
5. 需要时套沙箱（`SandboxManager.wrapWithSandbox`）。strict 策略下没有真实隔离就拒绝（`SandboxUnavailableForShellError`）。
6. spawn，交给 `ShellCommand` 包装成任务对象。
7. 结束后读 cwd 文件，`setCwd` 更新会话 cwd。

子进程环境由 `buildShellSpawnEnv` 构造：固定设 `GIT_EDITOR=true`，插件 bin 目录拼进 PATH；插件刷新后 bin 变化会丢弃 shell 快照（`invalidateShellSnapshotIfPluginBinsChanged`）。

ShellCommand 的行为：

- 默认超时 30 分钟，可以自动转到后台；
- 输出文件大小有看门狗；
- 杀进程时先对进程树发 SIGTERM，1.5 秒后发 SIGKILL；
- 退出码：中止 145，超时 143，被杀 137。

输出上限：优先 `settings.bashOutputMaxChars`，其次 `BASH_MAX_OUTPUT_LENGTH`，默认 30000，上限 150000。

`utils/bash/ShellSnapshot` 在会话开始时把用户 shell 的函数、别名、选项、PATH 写成快照。316 新增：用内置的 bfs/ugrep 替换 find/grep、pkill 防误杀函数、Windows 登录 PATH 探测。

## 11. 安全存储

- `utils/secureStorage · getSecureStorage`：linux 构建里平台存储恒为空，所以永远返回 `plainTextStorage`。
- 明文存储写 `<配置目录>/.credentials.json`，权限 0600，写入时附带警告 "Warning: Storing credentials in plaintext."。
- macOS 钥匙串辅助函数仍在代码里：服务名为 `"Claude Code"` + OAuth 后缀；设置了 `CLAUDE_CONFIG_DIR` 或 `CLAUDE_SECURESTORAGE_CONFIG_DIR` 时，再加配置目录 sha256 的前 8 位。但“钥匙串优先、回退明文”的组合（2.1.88 的 `createFallbackStorage`）不在 linux 构建中。
- Windows CredMan 由 `CLAUDE_CODE_FORCE_WINDOWS_CREDMAN` 或 GrowthBook `tengu_windows_credman` 控制。

## 12. 数据结构

```ts
// 判定结果（PermissionResult / PermissionDecision）
{ behavior: "allow"|"deny"|"ask"|"passthrough", updatedInput?, message?, decisionReason?, suggestions?: PermissionUpdate[],
  // 316 新增
  refusal?, hooksMayAllow?, hooksMayRefuse?, suppressAlwaysAllowRule?, checkIncomplete?, denialLimitFallback?, autoDenyWindow?, endsTurn?,
  metadata?, classifierRan? }
// decisionReason.type（实际出现次数排序）
"other" | "safetyCheck"{reason, classifierApprovable, circuitBreaker?} | "rule"{rule:{source, ruleBehavior, ruleValue}} | "mode"{mode}
| "hook"{hookName, hookSource?} | "classifier"{classifier, reason, noVerdict?} | "subcommandResults"{reasons: Map}
| "sandboxOverride" | "asyncAgent" | "workingDir" | "permissionPromptTool"
// ToolPermissionContext（316 新增字段）
{ mode, additionalWorkingDirectories, alwaysAllowRules, alwaysDenyRules, alwaysAskRules, isBypassPermissionsModeAvailable,
  isAutoModeAvailable, strippedDangerousRules, prePlanMode, shouldAvoidPermissionPrompts, canAutoClassifierRun,
  blockReadsOutsideWorkingDirectories, readBlockExemptPaths, trustedNetworkDirectories, toolsKeptByLaunchList,
  startupModeDecidedByProactivityLevel, chrome*ClassifierEnabled }
```

`PERMISSION_DECISION_REASON_TYPES`（`types/permissions.ts`）是线上传输时的取值表。熔断器的属性来自 `CIRCUIT_BREAKER_TRAITS`（`chunk-ktpw8eqa.js#xve`），每种熔断器标有 bypassImmune、waivableInBypass、classifierRouted、autoModeDeny 等属性。熔断谓词有 `isBypassImmuneCircuitBreaker`、`isClassifierRoutedCircuitBreaker`、`isAutoModeDenyCircuitBreaker` 等，决定哪些安全检查在 bypass 或 auto 下也不能放行。

## 13. 配置项、环境变量、特性开关

**settings**：

- `permissions.{allow, deny, ask, defaultMode, additionalDirectories, disableBypassPermissionsMode, disableAutoMode, blockReadsOutsideWorkingDirectories}`
- `allowManagedPermissionRulesOnly`、顶层 `disableAutoMode`
- `autoMode.{allow, soft_deny, hard_deny, environment}`
- `sandbox.{enabled, failIfUnavailable, autoAllowBashIfSandboxed, allowUnsandboxedCommands, excludedCommands, enabledPlatforms, ignoreViolations, enableWeakerNestedSandbox, allowNestedUserNamespaces, enableWeakerNetworkIsolation, allowAppleEvents, ripgrep}`
- `sandbox.network.{allowedDomains, deniedDomains, allowManagedDomainsOnly, strictAllowlist, allowUnixSockets, allowAllUnixSockets, allowLocalBinding, allowMachLookup, httpProxyPort, socksProxyPort, tlsTerminate}`
- `sandbox.filesystem.{allowRead, allowWrite, denyRead, disabled, allowManagedReadPathsOnly}`
- `sandbox.credentials.{files, envVars, allowPlaintextInject}`
- `bashOutputMaxChars`、`defaultShell`

**环境变量**：

- 自动模式：`CLAUDE_CODE_AUTO_MODE_MODEL`、`CLAUDE_CODE_AUTO_MODE_TEMPERATURE`、`CLAUDE_CODE_AUTO_MODE_SEGMENTED_TRANSCRIPT`、`CLAUDE_CODE_AUTO_MODE_OUTCOME_CODES`
- 子进程与评测：`CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`、`CLAUDE_CODE_EVAL_CONFINED`
- 会话与身份：`CLAUDE_CODE_REMOTE`、`CLAUDE_CODE_SESSION_KIND`、`CLAUDE_CODE_ENTRYPOINT`、`CLAUDE_CODE_HOST_CREDS_FILE`、`CLAUDE_JOB_DIR`
- Shell：`CLAUDE_CODE_SHELL`、`CLAUDE_CODE_SHELL_PREFIX`、`BASH_MAX_OUTPUT_LENGTH`、`CLAUDE_CODE_TMPDIR`
- PowerShell：`CLAUDE_CODE_USE_POWERSHELL_TOOL`、`CLAUDE_CODE_PWSH_PARSE_TIMEOUT_MS`
- 其他：`CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS`、`CLAUDE_CHROME_CLASSIFIER_FLOOR`、`IS_SANDBOX`、`CLAUDE_SECURESTORAGE_CONFIG_DIR`、`CLAUDE_CODE_FORCE_WINDOWS_CREDMAN`

**GrowthBook**：

- 自动模式：
  - `tengu_auto_mode_config`，字段有 enabled、model、modelByMainModel、twoStageClassifier、maxRetries、unavailableOuterRetries、segmentedTranscript、severityBySite、severityByModel、s1SuffixByModel、s2SuffixByModel、subagentInheritVerifiedTurns 等；
  - `tengu_bright_dragonfly`（本地分类器开关）、`tengu_virtual_knuth`。
- 规则：`tengu_ant_yolo_equiv_strip_config`、`tengu_mcp_server_policy_bypass_exempt`、`tengu_zesty_pearl`、`tengu_merry_boot`。
- Bash 解析：`tengu_snappy_tower`、`tengu_tingly_pearl`、`tengu_calm_nautilus`、`tengu_foamy_heron`、`tengu_vast_puddle`、`tengu_staged_pumpkin`、`tengu_nested_ripple`、`tengu_keen_anchor`。
- 沙箱：`tengu_golden_pebble`、`tengu_resilient_adleman`、`tengu_hushed_caraway`、`tengu_quiet_medlar`、`tengu_mighty_thimble`。
- PowerShell：`tengu_misty_crown`、`tengu_cobalt_ridge`。

**遥测事件**：

- 自动模式：`tengu_auto_mode_outcome`、`tengu_auto_mode_decision`、`tengu_auto_mode_hook_allow_funneled`、`tengu_auto_mode_decided_as_requested_mode`
- Bash 解析：`tengu_bash_ast_too_complex`、`tengu_tree_sitter_parse_abort`

## 14. 与 2.1.88 的差异（都有代码证据）

**权限模式**：

- auto 进入对外枚举，不再需要 `TRANSCRIPT_CLASSIFIER` 编译开关。
- default 的显示标题改为 "Manual"，并接受 `"manual"` 别名。
- Shift+Tab 循环中 ant 专属的分支已删除。

**规则来源**：新增 `mcpMount`、`toolsNarrowing`、`mcpServerPolicy`、`hostCredential` 四个来源；新增工作区信任闸门，未受信任时丢弃项目层的 allow 规则和额外目录。

**判定流水线**：

- 主体从 `permissions.ts` 拆到新模块（门面 `decideWithToolCheckHooks`）。
- 新增插件 `tool.check` 裁决层、服务端分类器、PermissionRequest 钩子的 `hooksMayAllow`/`hooksMayRefuse` 语义、MCP 的 ask 上限、PreToolUse 钩子 allow 不能越过规则（`planModeWriteFloor`、`hookAskFloor`）。

**拒绝跟踪**：按消息去重，支持撤销计数，超限后回退人工并带限时自动拒绝窗口。

**自动模式分类器**：

- 只剩 XML 路径。旧的 tool_use 分类器（`classify_result`）已删除；`CLAUDE_CODE_TWO_STAGE_CLASSIFIER`、`CLAUDE_CODE_JSONL_TRANSCRIPT`、`CLAUDE_CODE_DUMP_AUTO_MODE` 三个环境变量在 316 中不存在。
- 新增严重度模式、`hard_deny`、转发回合、子代理交回审查、外层重试与备用模型。
- 模型选择改为 GrowthBook 优先于 env。

**文件权限**：

- 危险目录增加 `.husky`、`.cargo`、`.devcontainer`、`.yarn`、`.mvn`。
- 配置目录下新增禁区（jobs、daemon、shell-snapshots、session-env、adopt.json、seed-admin）。
- 新增识别指向设置文件的符号链接、WSL 第二挂载根、`blockReadsOutsideWorkingDirectories`。

**Bash**：

- 解析器换成纯 TS 实现并加缓存，删掉了不可用时的回退。
- 新增 `__UNCERTAIN_VAR__`、两轮循环分析，以及大量 bash/zsh 分歧检查。
- `hasDangerousExpansion` 的返回值从布尔改为 `"variable"`/`"glob"`/`false`。

**沙箱**：

- 新增 Windows 沙箱（srt-win）、凭据遮罩、`tlsTerminate`、可信层过滤、读禁止根复查、scrub 模式。
- 适配层从约 1000 行扩到 300 多个声明。

**Shell 执行**：

- 新增 worktree 隔离防逃逸、按权限检查时的 cwd 校验、cgroup 与 CPU 记账。
- PowerShell 解析缓存改为每个宿主一份。

## 15. 未解之处

- `chunk-e6aww6q8.js#L9n`（removalWaiver，当前名 `holdRemovalWaiverOnAskAdjudicator`）：豁免移除的语义没有弄清。
- `chunk-kswt4qha.js#KFe`、`#iQr`：主动性档位和 HIPAA 策略结论如何影响启动模式。
- `chunk-sfy7bm1n.js#Far`：集合 `te` 的内容。
- `chunk-8wvtd8sr.js#Al`、`#ko`：URL/类型规则族所属的工具不明。
- `chunk-e6aww6q8.js#Jbr` 中 `yse()` 选择权限模板的条件（暂命名 useAnthropicTemplate）。
- `chunk-e6aww6q8.js#NJe`：outcome codes 开关的具体语义；`#Tbr` 在外部构建里恒返回 `[]`。
- `chunk-k5vy5m8c.js#Qe`：缓存命中时 `keywordAfterPrefix` 分支的含义。
- `chunk-r01896cg.js#Gn`：`declarationPrefix` 模式整体只理解了大概。
- `chunk-fq0cr76a.js#Q0`：配置换算函数约 50KB，局部变量只命名了一小部分。`#H0`、`#Bue`（读禁止根复查）只理解了大意。
- `chunk-b29hdd5e.js#R`：linux 构建里平台安全存储恒为 undefined，这是静态推断，没有在运行中验证。

## 16. 引用校验结果

校验时间 2026-11-04 06:40（UTC），对象为当时的 `reconstructed/`。脚本检查本文所有代码样式引用：路径是否存在（相对仓库根，或相对 `reconstructed/src/`，`.ts/.tsx` 对应 `.js`）；声明 id 是否在 `reconstructed/symbols.jsonl`；"路径 · 函数名"中的函数是否属于该文件；标识符与字面量是否出现在 `reconstructed/symbols.jsonl` 或阅读树代码中。在 2.1.316 找不到、但在 2.1.88 源码（`references/claude-code-analysis/src`）中存在的，计为"只在 2.1.88 中存在"（删除项、旧名，属预期）。

- 共检查 669 处引用：名字 387/391（另 4 个只在 2.1.88 中存在），路径 61/63（另 2 个只在 2.1.88 中存在），字面量 141/142（另 1 个只在 2.1.88 中存在），声明id 67/67，路径·函数 6/6；占位符与含空格的说明性文字 126 处未检查。
- 只在 2.1.88 中存在（删除项或旧名，预期如此）：`mQo`、`allow/ask`、`deny/ask`、`parse-unavailable`、`classify_result`、`CLAUDE_CODE_JSONL_TRANSCRIPT`、`CLAUDE_CODE_DUMP_AUTO_MODE`
- 未通过：0 处。
