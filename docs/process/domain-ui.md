# 过程记录：dom-ui（领域 `ui`）

## 1. 范围与产出

- 领域模块：473 个（`analysis/segments/domains.json` 的 `ui`），2,492 个顶层声明（2,842 个顶层绑定），约 1.8 MB；声明内绑定 30,177 个。
- 交付物：
  - `naming/semantic-ui.jsonl`：**1,046 条**语义命名（人工 425 条 + 规则生成 621 条）。用 `tools/naming/resolve.mjs` 试跑（输出到 `artifacts/tmp/ui/final-test/`，未动 `naming/final`）：1,019 条原样生效、27 条因作用域冲突被加 `_N` 后缀、0 条丢失。
  - `naming/docs-ui.jsonl`：**204 条**声明说明（REPL、PromptInput、Message 分派、权限流程、主要对话框、主题、hooks 等）。
  - `naming/modules-ui.json`：**473/473** 模块一句话说明（全覆盖）。
  - `docs/handbook/ui.md`：子系统手册（REPL 组件树、控制器表、对话框栈、通知、输入链、消息渲染表、权限链、hooks 表、主题、env/设置/开关、与 2.1.88 差异、未解之处）。
- 覆盖率：被其他模块使用的 ui 声明 1,356 个，其中 176 个有 doc；顶层绑定中仍为压缩名的 1,331 个（多数是 React Compiler 抽出的 `_temp` 回调、选择器小函数、被误归的第三方/其他领域代码，见第 5 节）。

## 2. 做法

工具都在 `artifacts/tmp/ui/`（文件头写了输入输出）：

| 脚本 | 作用 |
|---|---|
| `worklist.mjs` → `worklist.tsv` | 每个 ui 顶层绑定：键、当前名、来源、字节、外部引用数、旧版匹配 |
| `bindings.mjs` → `bindings.tsv` | ui 声明内全部绑定（`bindingsOf`），带当前名与上下文 |
| `view.mjs <模块…>` | 套用当前全部命名（final + 各 semantic + 本领域草稿）打印模块，`TODO=1` 只展开未命名声明 |
| `digest.mjs <分片>` | 分片概要（名字、类型、字节、外部引用、前几个字符串） |
| `imports.mjs <模块>`、`users.mjs <id>` | 模块的导入来源；快速反向引用（q.mjs callers 太慢，单次 >10 分钟） |
| `rules.mjs` → `rules.jsonl` | 规则命名（只对形状确定的代码） |
| `build.mjs [--check 分片]` | 把 `manual/*.txt|jsonl` 规格解析到偏移键，合并规则名，写三个 naming 文件；`--check` 只验证不写 |
| `parts.mjs` → `parts.json` | 把 473 个模块分 7 片（repl/input/messages/permissions/dialogs/misc/hooks） |

规则（`rules.mjs`）：
- L1 `$ = c(N)`（React Compiler 缓存数组）→ `$`：406 条。
- L2 `x = useAppState(s => s.a.b)` / `useStoreSelector(store, s => s.a.b)`（`G`、`_A`(useProject)、`no`(useSession)、`Ie`）→ `b`：143 条；当前名已贴合时不覆盖。
- T1 只被当作选择器传入的顶层 `function f(s){return s.a.b}` 或 `var f = s => s.a.b` → `selectAB`：56 条。
- T2 空函数 → `noop`，`x => !x` → `negate`，`x => x` → `identity`：16 条。
- L3 useState 值/setter 成对补名（一侧已有可信名时）。

手工规格用紧凑文本格式（`= <declId>` / `= ?min@module`、`N <@key|min|.> <name> <conf> | 依据`、`D 文档`、`M 模块 | 说明`），按分片写在 `artifacts/tmp/ui/manual/`。

原计划把 7 个分片并行交给子代理，但会话的并发子代理上限（20）已被其他领域成员占满，改为串行由本成员完成；因此命名深度优先放在 REPL、PromptInput、消息分派、权限主流程上，其余模块以模块说明 + 关键组件 doc 为主。

## 3. 关键发现

1. **316 的 REPL 是控制器架构**：主要逻辑在 `chunk-18hwfzwa.js` 中一批**未归属**的类（`ste` TurnController、`lz` SessionController、`yte` PromptSubmitController、`ute` ComposerChrome、`zY` PromptDraft、`Yee` ScrollPin、`XG` BackgroundGesture、`NQ` ReplSessionScope 等，类名来自错误串 "X: used before its screen bound a host"）。REPL.tsx 只剩组装与 bindHost。这部分属于 `_unattributed/`，本领域未命名，只在手册里按构造参数描述。
2. **对话框统一机制**：`requestDialog(def)` + `dialogStore` + kind→组件注册表 `ZAe`（`chunk-18hwfzwa.js#ZAe`，约 40 个 kind）+ 宿主 `XC`。权限对话框全部走这条路。
3. **React 别名**：`chunk-p86mcgbc.js` 导出 `y`=useState、`P`=useEffect、`zt`=useLayoutEffect、`R`=useRef、`Q`=useMemo、`ce`=useCallback、`Se`=useContext、`yt`=useSyncExternalStore、`qt`=createContext、`Rh`=memo、`Oo`=useEffectEvent、`Uy`=useReducer；`chunk-nn4p932b.js` 导出 `Z`=Fragment、`e`/`r`=jsx/jsxs；`chunk-s89ma3n1.js#w`=useMemoCache（c）；`chunk-rshven70.js#S`=memo_cache_sentinel。这些都在 `_unattributed`/vendor 里，ui 全领域高频引用（`e` 949 次、`y` 652 次、`w` 407 次）——建议 vendor/lead 给它们正式命名，否则所有 ui 代码都难读。
4. 旧版名 `queuedCommands`、`terminal`、`store`、`setAppState`、`systemPrompt`、`jumpRef` 等在 REPL 局部被**位置对齐错配**（88 与 316 的局部变量顺序不同），已用 semantic 覆盖（note 里写了"旧版名 X 错配"）。

## 4. 坑

- bash heredoc 里出现反引号或 `${` 会被 shell 解释（一次写坏了规格文件）；含反引号的内容一律用 Write 工具写。
- `node -e` 里写 `'\u0000'` 会被 bash 传成真正的 NUL，导致脚本出现二进制字符；改用其他占位。
- `tools/q.mjs callers` 每次全量扫描调用边，单次查询超过 10 分钟超时；用 `artifacts/tmp/ui/users.mjs` 一次建索引。
- 同一个压缩名在 ui 内常出现多次（不同 chunk），`?min` 解析时需要 `@module` 消歧。

## 5. 给 lead 的建议（切分/匹配修正）

### 5.1 系统性问题

- **fingerprint-shared 一对多匹配**：ui 中 325 个声明是 `fingerprint-shared`（38 KB），其中 285 个不在所属模块的主 chunk 里（31.6 KB）。典型是小判定函数被同一个旧版名"克隆"到多个 chunk：`hasThinkingContent_2…16`（Message.tsx）、`processQueuedCommands_2…11`（PromptInputQueuedCommands.tsx）、`isInGlobalClaudeFolder_2…10`（permissionOptions.tsx）、`getHooksSources_2…11`/`hasBashPermission_2…6`（TrustDialog/utils.ts）、`mergeClients_*`（useMergedClients.ts）、`useMainLoopModel_2…9`、`countUnseenAssistantTurns_2…5`、`getRiskColor_2…6`、`findChromeClient_2…6`、`selectViewingAgentTaskId`×8（TeammateSpinnerTree.tsx）。建议：shared 匹配只在**同一 chunk 布局一致**时接受，否则降级为 leftover，按调用方亲和重新归属。列表见 `artifacts/tmp/ui/suspects.tsv`。
- 被误归的第三方：
  - `chunk-9t1jcaah.js#z`、`#Ur`、`#W` 等（fflate inflate 常量表与霍夫曼表）→ 应归 vendor `fflate`，现被放在 `components/LogoV2/AnimatedAsterisk.tsx`（旧版名 SETTLED_GREY 错配）。
  - `chunk-7vp249v4.js#dn`、`#lo`（zod `$ZodPreprocess`/`$ZodReadonly`，旧版名 Message）→ vendor `zod`，现在 `components/Message.tsx`。
  - `chunk-rshven70.js#S`（React Compiler 哨兵 + Bun `__export` + `import.meta.require`，被 800+ 处引用）→ 运行时/vendor，现在 `components/permissions/PermissionDecisionDebugInfo.tsx`（旧版名 SuggestedRules 错配）。
  - `chunk-x6v6jz2y.js#s`（`var s = ThemedBox`，865 处引用）放在 `design-system/ThemedBox.tsx` 是对的，但它是 ink.ts 导出的 `Box`，建议统一叫 `Box`（已在 semantic 中命名）。

### 5.2 具体声明

- `chunk-ah34pb7m.js#I7` → `components/messages/UserTextMessage.tsx · UserTextMessage`。证据：按 `planContent`/`<bash-input>`/`<local-command-stdout>`/`<user-memory-input>`/队友/任务通知分派到 UserPlanMessage、UserBashInputMessage、UserLocalCommandOutputMessage、UserMemoryInputMessage 等，结构与 88 的 UserTextMessage 一致；现为 `_unattributed/chunk-ah34pb7m/part-040.js`。
- `chunk-08945j39.js#Ie`（现归 UserTextMessage.tsx，旧版名 UserTextMessage）→ 应归 `utils/messages.ts`，叫 `isTaggedSystemUserText` 之类（只返回布尔）。
- `chunk-18hwfzwa.js#ZAe`（对话框注册表）、`#XC`（对话框宿主）、`#gl` → 建议新建 `components/dialogs/registry.tsx`、`components/dialogs/DialogHost.tsx`。
- `chunk-18hwfzwa.js#ste`/`#bte`/`#lz`/`#yte`/`#ute`/`#zY`/`#Yee`/`#XG`/`#NQ`/`#BG`/`#UG`/`#jG`/`#xQ`/`#AQ`/`#MQ`/`#cz` → 建议新建 `screens/repl/` 目录（TurnController.ts、SessionController.ts、PromptSubmitController.ts、ComposerChrome.ts、PromptDraft.ts、ScrollPin.ts、BackgroundGesture.ts、ReplSessionScope.ts、IdleNudge.ts…），名字来自它们的错误串。
- `chunk-18hwfzwa.js#Gee`（消息区）、`#y8`/`#Nke`/`#Oet`（输入区）、`#gQ`（转录视图）、`#_F`（屏幕框架）→ `screens/repl/` 下的视图组件。
- `chunk-s4bxxzsw.js#pWn` → `hooks/toolPermission/requestToolPermission.ts`（被 useCanUseTool 与 swarm in-process runner 调用）。
- `chunk-s4bxxzsw.js#We`（旧版名 usePermissionRequestLogging）：实际是"通过 requestDialog 打开并管理权限对话框"，建议改名或核对匹配。
- `chunk-18hwfzwa.js#AV`（旧版名 PermissionRequest）：只调 `useNotifyAfterTimeout(…, "permission_prompt")`，已在 semantic 改为 `usePermissionPromptNotification`；88 的 PermissionRequest 分派组件在 316 由注册表 `ZAe` 取代。
- `components/agents/*`、`components/agents/new-agent-creation/wizard-steps/*`：字符串显示这些声明实为 Bedrock/Vertex/Google Cloud/云网关设置向导（"Set up Amazon Bedrock"、"Vertex AI configuration saved"、"Found … in ~/.aws/config"、"Calling Google Cloud…"），被布局插值错归到 agent 创建向导；建议重新匹配（88 的 `components/agents/new-agent-creation/*` 在 316 可能已改版或在别处）。`components/agents/ModelSelector.tsx · ModelSelector`（`Je`，115 处引用）更像通用 Select，匹配存疑。
- `components/PromptInput/inputModes.ts`：`chunk-2rkp9ne9.js` 的 34 个 layout 声明是 propose_skills（技能提议）相关代码（`tengu_propose_skills_kept_lines`、"kebab-case skill slug"），不属于 inputModes；真正的模式函数只有 `chunk-74a0twcp.js#vw/fLe/$I`。
- `components/messages/nullRenderingAttachments.ts`：大量消息转发/归属判定（"unforwardable/owner/agent_intent_forward"）被布局插值混入，建议拆出。
- `components/ResumeTask.tsx`：混入 Bedrock API key 测试代码（`chunk-…#eo/ro/oo/Le`）。
- `components/grove/Grove.tsx` 中 `FCe`（auto 模式推荐，`tengu_auto_default_nudge_shown`）应归 `AutoModeOptInDialog.tsx`。
- `components/DevBar.tsx` 中 `$z`（遥测事件 schema，旧版名 shouldShowDevBar）应归 analytics。
- `components/EffortCallout.tsx` 中 `ts`（旧版名 EffortIndicatorSymbol_2，实为高亮分段）应归 `utils/textHighlighting.ts`。
- `components/permissions/PermissionExplanation.tsx` 中 `u5e`（issue 关闭感谢提示）、`components/permissions/shellPermissionHelpers.tsx` 中 `xe/K/nli`（peer 消息丢弃原因）不属于权限 UI。
- `utils/theme.ts`：`chunk-g3xfp0ds.js#U` 的旧版名 `lightDaltonizedTheme` 错配，按 `getTheme` 分支已改为 LIGHT_THEME 等六个名字。

### 5.3 2.1.88 有、316 未匹配到的 ui 文件（46 个）

`agents/ColorPicker.tsx`、`agents/new-agent-creation/wizard-steps/ConfirmStepWrapper.tsx`、`agents/validateAgent.ts`、`CustomSelect/index.ts`、`design-system/LoadingState.tsx`、`InterruptedByUser.tsx`、`LogoV2/feedConfigs.tsx`、`LogoV2/Opus1mMergeNotice.tsx`、`LogoV2/VoiceModeNotice.tsx`、`mcp/index.ts`、`memory/MemoryUpdateNotification.tsx`、`messages/SystemAPIErrorMessage.tsx`、`messages/UserBashOutputMessage.tsx`、`messages/UserChannelMessage.tsx`、`messages/UserToolResultMessage/UserToolCanceledMessage.tsx`、`permissions/FilePermissionDialog/useFilePermissionDialog.ts`、`permissions/SedEditPermissionRequest/SedEditPermissionRequest.tsx`、`permissions/utils.ts`、`PromptInput/IssueFlagBanner.tsx`、`PromptInput/PromptInputStashNotice.tsx`、`PromptInput/useShowFastIconHint.ts`、`sandbox/SandboxDoctorSection.tsx`、`shell/ExpandShellOutputContext.tsx`、`Spinner/FlashingChar.tsx`、`Spinner/index.ts`、`Spinner/teammateSelectHint.ts`、`StatusNotices.tsx`、`wizard/index.ts`、`hooks/notifs/useInstallMessages.tsx`、`hooks/useAssistantHistory.ts`、`useBlink.ts`、`useCommandQueue.ts`、`useDeferredHookMessages.ts`、`useDoublePress.ts`、`useDynamicConfig.ts`、`useElapsedTime.ts`、`useExitOnCtrlCDWithKeybindings.ts`、`useFileHistorySnapshotInit.ts`、`useMergedCommands.ts`、`useMergedTools.ts`、`useMinDisplayTime.ts`、`useOfficialMarketplaceNotification.tsx`、`useSettingsChange.ts`、`useSkillImprovementSurvey.ts`、`useSkillsChange.ts`、`useTimeout.ts`。其中 `UserChannelMessage` 在 316 中存在（`I7` 内引用 `UserChannelMessage`），只是未匹配；其余需要按字符串补匹配。

## 6. 未完成

- 1,331 个顶层绑定仍为压缩名：大部分是 React Compiler 的 `_temp` 小回调（单次使用，价值低）和第 5 节列出的误归代码；对话框/设置类大组件（Config、BackgroundTasksDialog、MCPRemoteServerMenu、useRemoteSession、useReplBridge 等）的内部局部变量基本未命名。
- `_unattributed` 中的 REPL 控制器类未命名（不在本领域写入范围，待 lead 归属后可由本领域补）。
- 想继续补名时：`node artifacts/tmp/ui/view.mjs <模块>` 看代码 → 在 `artifacts/tmp/ui/manual/` 加规格 → `node artifacts/tmp/ui/build.mjs --check <分片>` → `node artifacts/tmp/ui/build.mjs` → `node artifacts/tmp/ui/rules.mjs && node artifacts/tmp/ui/build.mjs`（规则依赖人工名做 L3）。
