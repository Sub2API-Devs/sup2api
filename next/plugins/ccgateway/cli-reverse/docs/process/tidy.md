# tidy：140 个 `_new/` 占位文件归位 + 无说明模块补说明

日期 2026-11-03。角色 tidy。输入 `reconstructed/manifest.json`（7,053 个输出文件）。

## 1. 交付

| 文件 | 内容 |
|---|---|
| `naming/placement-zzzz-tidy.json` | 501 条放置 `{声明 id: 目标路径}`，覆盖 140 个 `_new/` 模块的全部声明 |
| `naming/modules-tidy.json` | 216 条中文模块说明 |
| `docs/process/tidy.md` | 本文 |
| `docs/WORKLOG.md` | 末尾一行 |
| `artifacts/tmp/tidy/` | 全部脚本与中间结果（见第 6 节） |

放置文件校验（`artifacts/tmp/tidy/validate-placement.mjs`，规则同 fixer 的 `validate.mjs`）：501 个键都是 `analysis/scan/decls.jsonl` 里存在的声明；当前路径 100% 都在 `_new/` 下；目标路径合法（有扩展名、不含 `_new/` 或 `_unattributed/`）；没有空操作；每个目标路径都是 `analysis/segments/modules.json` 里的合法模块（其中 26 个是本次新建）。与现有 11 个 `placement-*.json` 的键重合 0（这些文件里没有任何一条指向 `_new/` 的声明，`_new/` 一直没人接手）。

说明文件覆盖：扫描出 187 个 `src` 文件头注释里没有中文（判据：文件头注释块内没有 CJK 字符，脚本 `scan-nozh-header.mjs`），187 条全部写了；另有 26 条给本次新建的目标文件，外加 3 条是对已有说明的改写（`services/mcp/_new/discoverAuthorizationServer`、`skills/bundled/_new/index.helpers-hant` 原来的说明不准确，以及 `screens/repl/ComposerChrome` 补上新增部分）。

## 2. 数字

| | |
|---|---|
| `_new/` 文件 | 140 |
| 声明 | 501 |
| 并入已有文件（默认目标） | 117 个文件 |
| 默认目标为新建文件 | 23 个文件（另有 3 个拆分模块的部分声明落在新建文件，见 4.2） |
| 同一模块拆到多个文件 | 3 个（`buildDoctorPrompt`、`getSkillifyPrompt`、`restoreProactivityOptIn`） |
| 目标文件总数 | 127 |
| 其中新建 | 26 |
| 机械合并后无对应文字的遗留 `_new/` | 0 |

`_new/` 一共 611 KB，按大小：4 个文件 >30 KB（`buildDoctorPrompt` 66 KB、`EMOJI_BY_SHORTCODE` 54 KB、`ConsoleOAuthFlowView` 40 KB、`createElicitationRegistrar` 36 KB），其余大多是几百字节到几 KB 的单函数。

## 3. 判断依据

按证据强度：

1. **调用方**：`_new/` 里的每个文件都只有一个外部调用方（`sole-consumer-new`，segment.mjs 的定义），调用方几乎就是该代码原来的宿主文件。我优先选调用方：`src/components/PromptInput/_new/GoalActiveIndicator.js` → `components/PromptInput/Notifications.tsx` 这类。
2. **chunk 相邻**：Bun 把同一源文件的顶层语句连续放在 chunk 里。脚本 `artifacts/tmp/tidy/adjacency.mjs` 算了每个 `_new` 模块的声明与其余所有模块声明在同一 chunk 里的最小字节间隔。间隔为 0 的（中间只隔着 import 或空语句）几乎一定是同一文件；几十到几百字节的也基本可信；几万到几十万字节的不可信。
3. **旧版 2.1.88 目录结构**：`references/claude-code-analysis/src` 里同目录的既有文件。`PressEnterToContinue`、`DiffFileList` 在旧版有同名文件（但旧版的 `DiffFileList` 是另一个实现，见第 5 节）；`skills/bundled/` 的拆分方式（`skillify.ts`、`simplify.ts`、`stuck.ts`）直接照搬。
4. **代码内容与字符串**：函数名、错误文案、telemetry 事件名（`tengu_*`）、导入的其他模块（谁 import 它、它 import 谁）。例如 `findCatalogRowIdByWireId` 的调用方 `gateway/hostCheck.ts` 里另有 `gatewayModelIdFor`/`getAPIProvider`，说明它就是目录行 id 映射的一部分，而不是 `hostCheck` 本身的职责。
5. **命名冲突检查**：合并后同一文件里不能出现两个同名顶层绑定（`artifacts/tmp/tidy/clash2.mjs`）。有真冲突的 4 处我改到了别的目标（见第 5 节）。

## 4. 新建的 26 个文件

### 4.1 `cli/print/`（3 个，原 `cli/_new/`）

`cli/_new/` 三个大模块的唯一调用方都是 `cli/print.js`（640 KB，本身已经是 70 多个子模块的汇合点），且相邻证据一致（`restoreProactivityOptIn` 距 `cli/print.js` 的声明 61 字节）。它们各 11–33 个声明、8–36 KB，塞进 `print.js` 会让读者完全没有边界，因此按职责新建：

- `cli/print/unattendedStartRecord.ts`：无人值守会话的启动记录与限制。
- `cli/print/elicitationRegistrar.ts`：交互式提问与用户对话框注册表、被中断回合的恢复。
- `cli/print/workerEpochRestore.ts`：从上一个 worker 世代恢复开关（/pause-memory、exclude_dynamic_sections、主动性 opt-in）。

### 4.2 `skills/bundled/`（8 个，原 `skills/bundled/_new/`）

`buildDoctorPrompt.ts`（11 个声明，66 KB）和 `getSkillifyPrompt.ts`（12 个声明，23 KB）其实是 **8 个内置技能** 的注册函数与提示词，被切分归到了同一个 `sole-consumer-new` 模块（`initBundledSkills` 逐个调用它们，彼此没有调用关系）。旧版 `skills/bundled/` 是一技能一文件（`batch.ts`、`simplify.ts`、`skillify.ts`、`stuck.ts`…），所以按技能拆：

| 新文件 | 声明 |
|---|---|
| `designSync.ts` | `fi`（description）、`jo`（registerDesignSyncSkill） |
| `doctor.ts` | `gi`、`yi`（doctor 提示词）、`Fo`、`wi`（usage-flagged 段）、`Bo`（registerDoctorSkill） |
| `explainUsageSkill.ts` | `bi`、`Ho`（registerExplainUsageSkill） |
| `fewerPermissionPrompts.ts` | `ki`（提示词）、`Go`（registerFewerPermissionPromptsSkill） |
| `createPr.ts` | `Qo`、`Hi`、`Gi`、`Wi`（PR 工具清单与提示词）、`on`（registerCreatePrSkill）、`sn`（同段占位） |
| `simplify.ts` | `qi`（提示词）、`an`（registerSimplifySkill） |
| `skillifyPrompt.ts` | `Vi`（SKILLIFY_PROMPT）、`rn`（同段占位） |
| `stuckPrompt.ts` | `Ki`（STUCK_SKILL_PROMPT）、`ln`（同段占位） |

`registerCreatePrSkill`/`registerSimplifySkill` 的声明名本来可读，但它们的相邻声明（`PR_SKILL_BASE_TOOLS`、`SIMPLIFY_AGENTS_PROMPT`）命名不可读，所以用偏移量定位；`sn`/`rn`/`ln` 是三个只 `return` 的占位函数，我用代码内容确认了各自归属（`sn` 在 simplify 提示词之前、`rn` 在 skillify 提示词之前、`ln` 在 stuck 提示词之前）。

### 4.3 `screens/repl/`（5 个新建 + 1 个并入，原 `screens/_new/`）

`screens/_new/` 的调用方都是 `screens/REPL.tsx`（166 KB），但 `screens/repl/` 目录（2.1.316 新增，40 个 REPL 控制器文件）已经是 REPL 的拆分归宿：`useWorkspaceDiff`/`showDiffPanel` 这类逻辑都进了 `hooks/` 或 `screens/repl/`。因此：

- `screens/repl/useViewedAgentTranscript.ts`（3 声明）
- `screens/repl/WorkerPendingPermissions.tsx`（5 声明，渲染 `.tsx`）
- `screens/repl/ReplBridgeConnector.tsx`（7 声明，hooks + JSX）
- `screens/repl/InlineProgressList.tsx`（6 声明，渲染）
- `screens/repl/useSerialTaskRunner.ts`（2 声明，Hook）
- **（并入，不新建）`screens/repl/ComposerChrome.ts`**：`REPL.helpers-xe7z.ts` 的唯一声明是通过 `Se(ie)` 取 `context/stats.js` 的 `ie`（一个 React Context），在 `REPL.tsx` 里传给 `useExitCostReport`。`useExitCostReport` 在 `screens/repl/ComposerChrome.js`，取统计 store 的上下文应就近，所以并入 `ComposerChrome.ts`（那里有 `useExitCostReport`，也在 `REPL.js` 的 `useExitCostReport(qCr())` 处被调用）。



### 4.4 其它新建（10 个）

| 新文件 | 原 `_new/` | 依据 |
|---|---|---|
| `components/permissions/ToolInputEntries.tsx` | `ToolInputEntries`（7 声明，8 KB） | 唯一调用方 `FallbackPermissionRequest.tsx`，但后者只有 22 KB、7 个声明，加 8 KB 会让它变成两个职责；同目录还有 `ToolParameterDisplay.tsx` 这类单一职责文件 |
| `components/FeedbackSurvey/useOrgSurvey.tsx` | `useOrgSurvey`（19 声明，28 KB） | 唯一调用方 `REPL.tsx`；目录 `components/FeedbackSurvey/` 已有 `useFeedbackSurvey.tsx`、`useMemorySurvey.tsx` 等同类 Hook |
| `components/HelpV2/CommandList.tsx` | `CommandList`（8 声明） | 唯一调用方 `HelpV2.tsx`；同目录 `Commands.tsx` 是另一个列表实现，CommandList 是 2.1.316 新增的第二套命令标签页 |
| `commands/passes/GuestPassesContent.tsx` | `GuestPassesContent` + `loadGuestPassStatus` | 访客通行证对话框；`passes.tsx` 是命令入口，内嵌对话框太大（10 KB） |
| `commands/install-github-app/CheckingGhCliStep.tsx` | `CheckingGhCliStep` | 安装向导的一步；同目录每个步骤都是一个文件（`ApiKeyStep`、`ChooseRepoStep`…） |
| `ink/TerminalImageManager.ts` | `TerminalImageManager` + `scanImagePlaceholders` | 9 KB + 2.6 KB，`ink.tsx`（98 KB）只是调用方；同目录已有 `terminalImages.ts`（能力检测） |
| `utils/emojiShortcodes.ts` | `EMOJI_BY_SHORTCODE`（5 声明，54 KB） | 54 KB 的 emoji 表，唯一调用方 `useTypeahead`；`utils/` 下已有 `emojiPatterns.ts` |
| `utils/collapseTurnMessages.ts` | `dropRepeatedTurnDurations`（5 声明） | 三个"渲染前整理消息"的函数（钩子附件合并、重复回合耗时、重复远程错误），不是 `Messages.tsx` 的渲染职责；`components/` 下不该放消息变换 |
| `utils/permissions/repoVisibilityMeta.ts` | `collectRepoVisibilityMeta` + `getDirRemoteState` | 唯一调用方 `yoloClassifier.ts`（209 KB）；与 `utils/github/repoVisibility.ts`（另一件事：可见性检查）分开 |
| `bridge/persistenceBackfill.ts` | `runPersistenceBackfill`（16 声明，28 KB） | 调用方 `initReplBridge.ts`（53 KB）；28 KB 无法并入 |

## 5. 并入已有文件的关键裁决

### 5.0 与既有模块说明重合的 4 个键

`naming/` 下按文件名排序加载，`modules-tidy.json` 排在 `modules-extensions.json`、`modules-p6.json` 之后、`modules-tools.json` 之前，所以同名键以本文件为准：

- `services/mcp/_new/discoverAuthorizationServer.ts`：extensions 原来的说明是对的但没点出是 v2 副本，这里改写。
- `skills/bundled/_new/index.helpers-hant.ts`：extensions 的说明（“316 新增的一批 bundled skill 注册与提示词…”）与文件实际内容（两个空函数）不符，这里改正。
- `screens/repl/ComposerChrome.ts`：p6 的说明只写到“输入区外框状态”，这里补上 `_new/REPL.helpers-xe7z` 并入后新增的退出费用报告与 IDE 选区去重。
- `skills/bundled/simplify.ts`：extensions 里有一条旧说明（“可被用户 skill 覆盖的内置 skill 名单与用户 skill 路径正则（旧版 simplify 位置）”），但当前阅读树里这个路径没有文件（那份内容在 `builtinSkillNames.js`/`bundledSkillNames.js` 一侧）。本次新建的 `skills/bundled/simplify.ts` 是 simplify 技能本身，覆盖旧说明；如果 lead 认为旧说明指向的是另一份内容，需要把它重新挂到对应文件上。

116 个文件并入了已有模块。判断"并入"的主要条件：**调用方就是该模块、且代码是该模块的内部细节**（选择器、小工具、同一渲染的辅助组件）。几个需要解释的：

- **`state/selectors.ts` ← `getActiveAgentName`**：`state/selectors.ts` 已有 `getActiveAgentForInput`（同一组选择器，输入框指向哪个 agent），`getActiveAgentName` 是它的显示名换算；两者声明在 chunk 里只差 0 字节（同一文件）。这比"调用方 PromptComposer"更可信。
- **`utils/messagePredicates.ts` ← `isMidTurnInterjectionMessage` 与 `isHumanAuthoredTurn`**：都是"这条消息属于什么"的判定函数。前者调用方是 `footerLinks`，后者是 `messageSource`，但 `utils/messagePredicates.ts` 与 `utils/messages/messagePredicates.ts` 是同一职责的 2.1.316 新模块（旧版 `utils/messagePredicates.ts` 有 `isHumanTurn`）；放在 `utils/messagePredicates.ts`（chunk 里 `isMidTurnInterjectionMessage` 与 `utils/messages.js` 的说明性代码相邻 0 字节）。
- **`utils/generators.ts` ← `returnValue`**：冗余实现。`services/api/claude.ts` 里的 `returnValue` 与 `utils/generators.ts` 的 `returnValue` 逐字相同，都是"耗尽生成器取返回值"；旧版 `utils/generators.ts` 有这个函数。放在这边一份即可（引擎会保留两份声明，但读者会看到它们同义，模块说明里已写明）。
- **`utils/errors.ts` ← `getErrorCodeString`**：一处同名冲突（`utils/process.ts` 已有局部 `v` 被命名为 `getErrorCodeString` 的元素），因此归到 `utils/errors.ts`（错误分类工具）。
- **`utils/bash/parser.ts` ← `containsSubstitution`**：它只用 `parser.js` 的 `SUBSTITUTION_LIKE_TYPES`，且 `ast.js` 已有同名 `z`（`parser.ts` 的 `z` 是 ANSI-C 字符串集合）。`containsSubstitution` 递归判断语法树节点，与 parser 的节点分类同源，放 `parser.ts`。
- **`components/Messages.tsx` ← `countToolCallsSince_2`**：这实际上是 **`utils/groupToolUses.ts` 的消费者**（`applyGrouping` 的应用），不是 Messages 的渲染细节。因此并入 `utils/groupToolUses.ts`（已合并 `countToolCallsSince_2` 与 `getGroupableToolNames` 两个声明）。
- **`components/Messages.tsx` ← `dropRepeatedTurnDurations`**：见 4.4，目标是新建 `utils/collapseTurnMessages.ts`；但这个文件还包含 `collapseHookAttachments` 与 `yp`（去重远程错误），与 `utils/collapseHookSummaries.ts`（钩子汇总校验）职责相邻但不同，我没有并入后者。
- **`components/diff/DiffDialog.tsx` ← `_new/DiffFileList`**：`components/diff/DiffFileList.tsx` 已经存在，但它是 **另一个实现**（供 `ComputerUseApproval` 使用，导出 `FileItem`），`_new/DiffFileList` 只被 `DiffDialog` 用。门面导出为 `DiffFileList`，但两者的 props 完全不同（旧版是 `{files, selectedIndex}`，新的是 `{files, defaultFocusIndex, resetKey, onFocus, onSelect}`）。我没有覆盖旧文件，而是把新的并入 `DiffDialog.tsx`（唯一消费者），并在说明里注明两者不同。
- **`components/ConsoleOAuthFlow.tsx` ← `ConsoleOAuthFlowView` + `ManagedSettingsLoginNotice`**：`ConsoleOAuthFlowView` 40 KB，`ConsoleOAuthFlow.tsx` 31 KB；但 `ConsoleOAuthFlowView` 只被 `ConsoleOAuthFlow` 用，且相邻 507 字节；`ManagedSettingsLoginNotice` 只被 `ConsoleOAuthFlowView` 用，相邻 11 KB。这两个都是登录流程的内部视图，并入同一个文件是合理的（`ConsoleOAuthFlow` 的导出是登录入口）。
- **`components/Onboarding.tsx` ← `PressEnterToContinue`**：旧版有同名独立文件 `components/PressEnterToContinue.tsx`，但阅读树里那个文件是 **样式对象**（`{bold: {bold: true}, code: {...}}`，被 `plugins/bundled/youShouldKnow` 使用的 `SPAN_LOOKS`），不是组件。新的是组件，只被 `Onboarding.tsx` 用（945 字节外）。我没有改名旧文件（那是另一个职责），把新组件并入 `Onboarding.tsx`，并在说明里注明。
- **`components/PrBadge.tsx` ← `CURRENT_PR`**：`CURRENT_PR = "current-pr"` 是页脚链接的键，由 `PromptInputFooterLeftSide` 的 `setKeyedFooterLink` 用；`components/PrBadge.tsx` 也是 PR 相关且同在 `chunk-qgpgvvwv.js`、相邻 184 字节。`footerLinks.ts` 也可（`setKeyedFooterLink` 所在），但那是通用页脚机制，`CURRENT_PR` 是 PR 专属键；放 `PrBadge` 更明确。
- **`utils/secureStorage/macOsKeychainHelpers.ts` ← `classifyKeychainError`** vs `macOsKeychainStorage.ts`：错误分类与 `security` 命令输出的关系更近于存储实现（`macOsKeychainStorage.ts` 里有 `security find-generic-password` 的调用），但 `helpers.ts` 里有服务名/账户名计算；`auth.js` 用它记录 `tengu_api_key_keychain_error`。我选了 `macOsKeychainHelpers.ts`（“钥匙串相关的小工具/解析”，存储后端文件本身在说明里已注明多为误配）。
- **`utils/model/modelCatalog/catalogSeed.ts` ← `findCatalogRowIdByWireId`**：调用方 `gateway/hostCheck.ts` 的代码（`findCatalogRowIdByWireId(e, {provider, generation, wireIdOf})`）与目录 seed/目录入口共用 `getEffectiveServedCatalog`、`getCatalogState`；`catalogSeed.ts` 与 `servedCatalog.ts` 都可。选 `catalogSeed.ts` 是因为 `hostCheck` 也已 import `catalogSeed.js`（`pickProfileForFoundationModel`），就近。
- **`utils/permissions/remoteBrowser.ts`**：本来就是 2.1.316 新模块，`_new/collectRepoVisibilityMeta` 与它无关（那是 repo 可见性）。无冲突。

### 5.1 名字冲突而改目标的 4 处

| 声明 | 原定目标 | 冲突 | 改到 |
|---|---|---|---|
| `utils/_new/getErrorCodeString` → `utils/process.ts` | `utils/process.ts` 里已有同名的元素（局部 `v` 被命名成 `getErrorCodeString`，但 `kind` 是元素） | `utils/errors.ts` |
| `utils/bash/_new/containsSubstitution` 的 `z` | `utils/bash/ast.ts` 已有 `z`（ANSI-C 字符串集合） | `utils/bash/parser.ts` |
| `services/api/_new/messageContentBlocks` 的 `_n` | `promptCacheBreakDetection.ts` 有同名 `_n`（引用） | `services/api/promptCacheBreakParts.ts` |
| `screens/_new/REPL.helpers-xe7z` | `context/stats.tsx` 里已有 `qCr` 同名的引用 | 并入 `screens/repl/ComposerChrome.ts`（见 4.3） |

`filterModelOptions`/`GoalActiveIndicator`/`PressEnterToContinue` 等几条"REAL CLASH"经 `clash2.mjs` 复核是引用层面的（目标里只是 import 了同名），合并没有问题。

## 6. 脚本与中间结果（`artifacts/tmp/tidy/`）

| 脚本 | 作用 |
|---|---|
| `scan-nozh.mjs`、`scan-nozh-header.mjs` | 找文件头注释里没有中文的 src 文件（187 个；后者按注释块判，前者按前 1500 字节） |
| `consumers.mjs` | 每个 `_new` 模块的外部导入方与导入名 |
| `adjacency.mjs` | 每个 `_new` 模块与其它模块声明的最小 chunk 间隔（Bun 连续切分证据） |
| `gaps.mjs` / `gaps.txt` | 与调用方模块的间隔 + `analysis/match/decl-map.jsonl` 的旧版文件/名 |
| `facades.mjs` | 每个 `_new` 模块所属 chunk 的门面信息（这一批全是 `sole-consumer-new`，无门面） |
| `dirs.mjs` | 同目录已有模块名与旧版同目录文件（命名惯例） |
| `refsearch.mjs` / `refmatch.mjs` | 在旧版源码里搜导出名/文件名 |
| `brief.mjs`、`peek.mjs`、`show.mjs`、`decls.mjs`、`table.mjs` | 阅读 `_new` 文件的代码、JSDoc、声明清单 |
| `tsx.mjs` | 判断输出该用 `.ts` 还是 `.tsx`（JSX 运行时 import / `createElement` / Hook） |
| `plan.json`、`plan-fixed.json` | 人工决策表（含 `declOverrides` 按声明拆文件） |
| `emit-placement.mjs` | 由 `plan-fixed.json` 生成 `naming/placement-zzzz-tidy.json` |
| `validate-placement.mjs` | 校验交付文件 |
| `clash2.mjs` | 精确同名冲突检查（区分定义与引用） |

重跑：
```
node artifacts/tmp/tidy/emit-placement.mjs
node artifacts/tmp/tidy/validate-placement.mjs
```

## 7. 没搬 / 不确定的

1. **`src/_unattributed/` 仍有 3 个残留文件**（不在本次任务范围，但说明在 `modules-tidy.json` 里补了）：`chunk-dcmhvw5a/part-001.js`（一个交给 `@modelcontextprotocol/client` 的函数）、`chunk-r1wk8q25/part-001.js`（两个非流式回退超时常量）、`chunk-sx9xc5ee/part-001.js`（一次 React 运行时调用）。前两个在旧版里没有对应、调用方也看不出，留在原处。
2. **`utils/_new/isSameWslDistro`**：调用方是 `utils/ide.js`（`wsl` 分发判断），但 `utils/idePathConversion.js` 里已有同样的 `\\\\wsl(?:\.localhost|\$)\\([^\\]+)` 解析，两者是同一个 WSL 路径判断的两套实现。我放进了 `idePathConversion.ts`（路径互转模块），如果你希望保留在 `utils/ide.ts`，改一行即可。
3. **`utils/bash/_new/containsSubstitution`**：`ast.ts` 也有类似语义（`"command_substitution"`/`"process_substitution"` 的检查），但它有自己的 `SUBSTITUTION_LIKE_TYPES`（来自 `parser.ts`），我按"节点分类属于 parser"归 `parser.ts`；另一种合理选择是 `ast.ts`（如果 lead 认为安全分析同源）。
4. **`_new/TerminalImageManager` 与 `ink/terminalImages.ts`**：前者是运行时管理器，后者是能力检测。我新建了 `ink/TerminalImageManager.ts` 而不是并入 `terminalImages.ts`（后者已有 8 个声明、职责是检测与断言）。
5. **`components/messages/_new/WithheldFileLine`**：调用方 `AttachmentMessage.tsx` 距离 47 KB（同 chunk 但隔了很多），说明它是另一个源文件（文件头也已注明 2.1.316 新增）。我并入 `AttachmentMessage.tsx`（唯一消费者），但它是独立组件文件的其他证据（旧版没有、只在 `attachment.entries` 分支里用）不足以强到新建一个文件。
6. **`components/_new/PressEnterToContinue` 与已有 `components/PressEnterToContinue`**：见第 5 节。两个同名文件在引擎里会被 `_2` 消歧（或合并），需要 lead 在重新切分时确认不会把样式对象与组件混在一个文件里。
7. **`skills/bundled/_new/index.helpers-hant`**（`Co`、`_o` 两个空函数）并入 `skills/bundled/index.ts`；它们原在 `initBundledSkills` 的注册序列里，是空实现。
8. **`components/_new/FullscreenLayoutView`** 与 `components/FullscreenLayout.tsx`：后者 47 KB，塞进去会让它更大；但它是唯一的 FullscreenLayout 实现，且调用方就是它。保留了并入。
9. **`services/mcp/_new/discoverAuthorizationServer`** 与 `services/mcp/xaa.ts` 的 `discoverProtectedResource`/`discoverAuthorizationServer` 是逐字重复的 v2 副本（`domain-extensions.md` 第 59 条："MCP v1/v2 两代副本…建议阅读树里把 v1 副本放到 services/mcp/v1/ 或注明"）。我并入 `services/mcp/auth.ts`（唯一调用方，距离 1115 字节），并在说明里注明是 v2 副本；如果 lead 要建立 `services/mcp/v1/` 目录，这里需要改。

## 8. 给 lead 的建议

1. **`sole-consumer-new` 的 140 个文件可以整体视为"应并入调用方或按职责新建"**：这批文件全部来自 segment.mjs 的 `sole-consumer-new` 分支（第 204–209 行），`<使用者>.helpers-<chunk>` 命名没有语义。后处理可以用本表一次性消掉 `_new/`。
2. **`components/HelpV2/Commands.tsx` 与 `CommandList.tsx` 是两套命令列表**：`Commands.tsx`（旧版）供 `CloudSessionRulesTab` 用，`CommandList.tsx`（2.1.316 新增）供 `/help`。两者名字容易混，说明里已注明。
3. **`components/diff/DiffFileList.tsx` 是旧版实现，`_new/DiffFileList` 是 2.1.316 新实现**：重命名/合并时不要把两者当成同一文件。
4. **`cli/print.js`（640 KB）与 `screens/REPL.tsx`（166 KB）** 仍是两个最大的汇合点，`_new` 里已经按职责拆出去一批；剩下的部分（`print.js` 的 `turnDispatch`、`turnGate` 等）已经由之前的成员拆过，这批没有再动。
5. **`/ultrareview` 的 `buildUltrareviewMessages`**（原 `cli/_new/restoreProactivityOptIn` 的 `Rz`）我按职责拆到了 `commands/review/ultrareviewCommand.tsx`（`/ultrareview` 命令定义处，`cli/print.js` 只调用）。如果你希望所有 print 模式的消息构造函数集中在 `cli/print/`，把它改回 `cli/print/workerEpochRestore.ts` 即可。
