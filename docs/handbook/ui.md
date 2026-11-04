# UI 子系统手册（2.1.316）

> 领域：`ui`（473 个重组模块：`components/`、`screens/`、`hooks/`、主题/终端/格式化/markdown/高亮/剪贴板等 `utils/`）。终端渲染引擎 `ink/` 由 dom-ink 负责，不在本手册范围。
> 代码路径以重组路径为准（`reconstructed/src/<path>.js`，对应旧版 `src/<path>.tsx`）。函数写作 `路径 · 名字`；名字来自旧版对照（reference）或本领域语义命名（semantic，见 `naming/semantic-ui.jsonl`）。仍是压缩名的写成 `chunk-xxx.js#名`。
> 全部 UI 组件都经过 React Compiler 编译：`$ = c(N)`（本文统一称 `$` 缓存数组，`c` 是 `react/compiler-runtime` 的 `useMemoCache`，在包里是 `chunk-s89ma3n1.js#w`）、`$[i] === MEMO_CACHE_SENTINEL`（`chunk-rshven70.js#S`）判断首次渲染、`t0/t1` 临时值、`_temp` 抽出的回调。阅读时把 `if ($[k] !== dep) {…$[k]=…} else x = $[k]` 当作 `useMemo` 即可。

## 1. 概述

UI 子系统是交互模式（非 `-p`）的全部界面：主屏幕 REPL、输入框、消息列表、权限与各类对话框、设置界面、通知、状态栏与 Spinner，以及支撑它们的 hooks 与设计系统组件。

- **谁调用它**：启动流程（`main`/`replLauncher`，dom-bootstrap）在 Ink 根下渲染 `components/App.tsx · App` → `screens/REPL.tsx · REPL`（`chunk-18hwfzwa.js#hkr`，写作时称 REPLWithProviders） → `REPL`；`/doctor`、`/resume` 等命令直接渲染 `screens/Doctor.tsx`、`screens/ResumeConversation.tsx`；各斜杠命令（dom-commands）通过 `local-jsx` 返回本领域的对话框组件（`ModelPicker`、`Settings`、`MCPSettings`、`HooksConfigMenu`…）。
- **它调用谁**：Ink（`ink/`：Box/Text/ScrollBox、`useInput`、终端尺寸与焦点）、AppState（`state/AppState.tsx · useAppState(=G)/useSetAppState/useAppStore`，dom-state）、会话控制器（一批 `chunk-18hwfzwa.js` 中未归属的类：TurnController、SessionController…，见第 3 节）、查询循环（dom-query）、工具（dom-tools，各工具的 `renderToolUseMessage/renderToolResultMessage/…` 由消息组件调用）、权限引擎（dom-permissions，`hasPermissionsToUseTool`）、MCP/插件/hooks（dom-extensions）。

**316 相对 2.1.88 的最大变化**：REPL 不再是"一个 5000 行组件里堆几十个 useState + useEffect"，而是**控制器对象 + 外部 store**架构：REPL 在 `useState(() => new X(...))` 里创建长生命周期控制器，组件通过 `useStoreSelector(store, select)`（`chunk-yn45f1gp.js#Ie`，基于 `useSyncExternalStore` 的带缓存选择器）订阅；`useLayoutEffect` 里一次性 `bindHost({...})` 注入宿主能力。权限确认也不再是 REPL 里的 `toolUseConfirmQueue` 状态，而是统一的**对话框存储（dialogStore）+ `requestDialog(def, payload)` + kind→组件注册表**。

## 2. 模块地图

| 目录/模块 | 职责 |
|---|---|
| `screens/REPL.tsx` | 主屏幕：创建控制器、bindHost、组装 FullscreenLayout；transcript 模式（ctrl+o）页脚/帮助/搜索栏；终端标题动画 |
| `screens/Doctor.tsx`、`screens/ResumeConversation.tsx` | `/doctor` 诊断屏、`/resume` 会话恢复屏 |
| `components/App.tsx` | 顶层 Provider 外壳 |
| `components/FullscreenLayout.tsx` | 全屏（alt-screen）布局：scrollable/abovePrompt/bottom/sidebar/dock 槽、未读分隔线、"新消息"药丸、置顶提示头、浮层 |
| `components/Messages.tsx`、`MessageRow.tsx`、`Message.tsx`、`VirtualMessageList.tsx` | 消息列表 → 行 → 单条消息分派；虚拟滚动 |
| `components/messages/*` | 每类消息/附件/工具结果的渲染组件（约 37 个） |
| `components/PromptInput/*` | 输入框、页脚、模式指示、建议列表、通知区、帮助菜单、排队命令、粘贴截断 |
| `components/TextInput.tsx`、`VimTextInput.tsx`、`BaseTextInput.tsx` | 文本输入（普通 / vim）与渲染层 |
| `components/permissions/*`、`hooks/toolPermission/*`、`hooks/useCanUseTool.tsx` | 权限请求：canUseTool → 交互处理器 → 对话框组件；`/permissions` 规则界面 |
| `components/Spinner*`、`Spinner/*` | Spinner：动词、计时、token、停滞变色、队友 Spinner 树 |
| `components/Settings/*`、`ModelPicker`、`ThemePicker`、`OutputStylePicker`、`mcp/*`、`agents/*`、`hooks/*`、`memory/*`、`skills/*`、`HelpV2/*`、`Stats` | 各设置/管理界面（/config /status /usage /model /theme /mcp /agents /hooks /memory /skills /help /stats） |
| `components/tasks/*`、`teams/*`、`CoordinatorAgentStatus.tsx` | 后台任务对话框与详情、队友管理、协调者任务面板 |
| `components/LogoV2/*` | 欢迎框/Logo/Clawd 动画/Feed/各种推广提示 |
| `components/design-system/*`、`CustomSelect/*`、`ui/*`、`wizard/*` | 设计系统：ThemedText/ThemedBox、Dialog、Tabs、FuzzyPicker、Select、向导 |
| `hooks/*`（输入类） | `useTextInput`、`useVimInput`、`useTypeahead`、`useArrowKeyHistory`、`useHistorySearch`、`usePasteHandler`、`useInputBuffer`、`useVoice*` |
| `hooks/notifs/*` | 各类通知 hook（经 `useNotifications` 进入通知队列） |
| `hooks/*`（集成类） | `useIDEIntegration`、`useReplBridge`、`useRemoteSession`、`useSSHSession`、`useDirectConnect`、`useInboxPoller`、`useManagePlugins`… |
| `utils/theme.ts`、`design-system/ThemeProvider.tsx`、`color.ts` | 主题调色板与解析 |
| `utils/markdown.ts`、`components/Markdown*.tsx`、`HighlightedCode*`、`StructuredDiff*`、`utils/cliHighlight.ts` | Markdown→ANSI、表格、代码高亮、diff |
| `utils/imagePaste.ts`、`hooks/usePasteHandler.ts` | 剪贴板图片与粘贴 |
| `utils/fullscreen.ts`、`renderOptions.ts`、`terminal.ts`、`ansiToPng/Svg.ts`、`format.ts`、`hyperlink.ts` | 终端工具 |

完整的每模块一句话说明见 `naming/modules-ui.json`（覆盖全部 473 个模块）。

## 3. REPL 屏幕

### 3.1 外壳与 props

`screens/REPL.tsx · REPL`（`chunk-18hwfzwa.js#hkr`，写作时称 REPLWithProviders）用 `props.messageQueue ?? 全局消息队列` 建 `QueueProvider`（`chunk-s3t86t3k.js#zmt`）队列 Provider，再包写入节流上下文 `SpinnerPaceContext.Provider`（`chunk-mfvgtsgj.js#vz`），然后渲染 `REPL`。

`REPL` 的 props（从解构读出）：`commands, debug, initialTools, initialMessages, initialMessagesOrigin, pendingHookMessages, initialFileHistorySnapshots, initialContentReplacements, mcpClients, dynamicMcpConfig, autoConnectIdeFlag, strictMcpConfig, systemPrompt, appendSystemPrompt, systemPromptSnapshot, onBeforeQuery, onTurnComplete, onCaptureSnapshot, disabled, mainThreadAgentDefinition, disableSlashCommands, remoteSessionConfig, onDetachToCaller, embedded, hideWelcomeChrome, hideLoginNotice, disableQuery, filterCommands, cancelRef, directConnectConfig, sshSession, thinkingConfig, thinkingConfigExplicit, thinkingDisplayFlag, fallbackModel, engine, onCommandsChange, onQueryParamsChange`。

关键派生值：`isRemoteSession = !!remoteSessionConfig || htt()`；`hasRemoteTransport = isRemoteSession || directConnectConfig || sshSession`；`isThinClient = On() || hasRemoteTransport`；`isFullscreen = presentation === "fullscreen"`（`presentation` 来自 `useRenderMode()`（`chunk-x6v6jz2y.js#NI`））；本地 state 只剩 `screen`（`"prompt" | "transcript"`）与 `dumpMode`。

### 3.2 控制器（全部在 `useState(初始化器)` 中创建，生命周期 = REPL）

| 局部名 | 构造 | 作用（从构造参数与方法名读出） | 声明 id |
|---|---|---|---|
| `scope` | `ReplSessionScope` | 会话作用域：commands、renderingTools、dynamicMcpConfig、`requestDialog`、`dialogTransport`、`localJsx`、`addAutoConnectedIde`；`connect()/dispose()` | `chunk-18hwfzwa.js#NQ` |
| `turn` / `transcript` / `sessionEngine` | `TurnController`（`chunk-18hwfzwa.js#ste`）+ 转录 store（`bte`）+ 引擎（`runWithQueryParams(...)` 或传入的 engine） | 一个回合的生命周期：`guard`（isActive/isRunning）、`loading`、`stream`（toolProgress、userInputOnProcessing、responseLength）、`buildToolUseContext`、`submitIncomingPrompt`、`retractRateLimitAutoContinue`；转录 `apply({type:"append"})/getSnapshot/conversation` | `#ste`、`#bte` |
| `chrome` | `ComposerChrome`（`chunk-18hwfzwa.js#ute`） | 输入区"外壳"状态：ideSelection、bashesDialog、退出流程、`openMessageSelector`、`setView` | `#ute` |
| `networkPrompts` | `SandboxNetworkPrompts`（`chunk-18hwfzwa.js#MQ`） | 沙箱网络访问询问（经 requestDialog 或 bridge） | `#MQ` |
| `sandbox` | `cz` | 沙箱启停与不可用原因（failIfUnavailable 时拒绝启动） | `#cz` |
| `scrollPin` | `ScrollPin`（`chunk-18hwfzwa.js#Yee`） | 全屏滚动：viewport/modalViewport、isAtBottom、未读分隔线、`reveal` | `#Yee` |
| `draft` | `PromptDraft`（`chunk-18hwfzwa.js#zY`） | 输入草稿 store：value/cursorOffset/mode/pastedContents/interimRange/decorations；`setValue`、`attribute(来源, fn)`、`paintLayer`；prompt hooks（`prompt.change`） | `#zY` |
| `sessionController` | `SessionController`（`chunk-18hwfzwa.js#lz`） | 会话级：resume、compact、conversation reset、hook 消息延迟、haiku 标题、空闲额度询问、`start()` | `#lz` |
| `contextualTips` | `StartupNudges` | tmux 鼠标/焦点等上下文提示 | `#xQ` |
| `titles` | `AQ` | 终端标题（会话名 / Spinner 前缀），`CLAUDE_CODE_DISABLE_TERMINAL_TITLE` | `#AQ` |
| `idleNudge` | `BG` | 久离返回提示（`tengu_idle_return_action`）、空闲系统通知（"Claude is waiting for your input"） | `#BG` |
| `gesture` | `BackgroundGesture`（`chunk-18hwfzwa.js#XG`） | 后台化/代理视图手势（↓、左箭头打开 agents 等） | `#XG` |
| `lowLatency` | `jG` | 低延迟提交（`input_low_latency_submit`） | `#jG` |
| `idleCacheQuota` | `UG` | 空闲后缓存/额度询问 | `#UG` |
| `submitController` | `PromptSubmitController`（`chunk-18hwfzwa.js#yte`） | **提交入口**：`submit(text, helpers, opts)`、`readDraft/fillDraft/suggestDraft`、`cancelAndDrainPending`、bash/本地命令/local-jsx 分流 | `#yte` |

随后一个 `useLayoutEffect`（无依赖数组以外的 deps 列表很长）调用：
`transport.bindHost` → `submitController.bindHost({mainLoopModel, canUseTool, onBeforeQuery})` → `sessionController.bindHost(...)` → `chrome.bindHost({openMessageSelector})` → `scope.bindHost({mainLoopModel, canUseTool, getMessages, buildToolUseContext, compact, readDraft/fillDraft/paintDraft…, revealInTranscript…})` → `gesture.bindHost(...)` → `turn.bindHost({...约 60 项：store/setAppState/canUseTool/thinkingConfig/theme/ideSelection/draft/titles/onSubmit/...})`。控制器在 bindHost 前被使用会抛出 "…: used before its screen bound a host"。

`canUseTool` 来自 `HIe()`（即 `useCanUseTool` 的结果，见第 6 节），`mainLoopModel` 来自 `hooks/useMainLoopModel.ts · useMainLoopModel`（`chunk-kxxfj8vr.js#Gc`）。

### 3.3 组件树

```
REPLWithProviders
└─ REPL
   └─ wrapWithProviders(...)             // MCPConnectionManager + ZXe.Provider
      └─ _F（屏幕框架：screen、turn、transcript、titles、localJsx、dialogSurface、draft、scrollPin）
         └─ $A.Provider(tokenWarningState) → LF（会话标题）
            └─ vJe
               ├─ GlobalKeybindingHandlers   (hooks/useGlobalKeybindings.tsx)  // 仅 prompt 屏
               ├─ promptEffects              // 冷恢复额度对话框 cre + 输入流 oY
               ├─ zee                        // 滚动按键/鼠标处理（ScrollKeybindingHandler 一族）
               ├─ FullscreenLayout (components/FullscreenLayout.tsx · FullscreenLayout)
               │   ├─ scrollable  = Gee      // 消息区（MessageArea，`screens/repl/MessageArea.ts`）
               │   │    ├─ LogoHeader → LogoV2（欢迎框/精简 Logo）
               │   │    ├─ uye → Messages → MessageRow → Message → messages/*
               │   │    ├─ $ee → SpinnerWithVerb（Spinner 行）
               │   │    ├─ XC（variant 内联对话框宿主，见 3.5）
               │   │    └─ TeammateViewHeader（查看队友时）
               │   ├─ abovePrompt
               │   │    ├─ Cen（会话标题行，可选）
               │   │    ├─ JI（"Background task update"）
               │   │    ├─ XC variant="bottom"（底部对话框宿主：权限请求等）
               │   │    ├─ MCr（任务面板 TaskListV2 等）
               │   │    ├─ gz（"Waiting for leader to approve network access"）
               │   │    ├─ zte（退出/中断插页）
               │   │    └─ g8（行内面板 InlinePanes / 调查槽）
               │   ├─ bottom = y8 → Nke → Oet → PromptInput + PromptInputFooter
               │   │                         └─ SessionBackgroundHint
               │   ├─ sidebar = Qoe（diff 侧栏，replTab==="diff"）
               │   ├─ dock = EY（面板坞 PaneDock）、dockTail、transcriptOverlay（ToastStackView）
               │   └─ modal = XC variant="modal"（团队/队友模态）
               └─ transcriptView = gQ        // 仅 transcript 屏：完整转录 + TranscriptModeFooter / TranscriptSearchBar
```

- 非全屏模式下仍用同一棵树，只是 `FullscreenLayout` 不启用 ScrollBox，消息通过 Ink 静态区写入 scrollback（`Messages.tsx · shouldRenderStatically`）。
- transcript 屏（ctrl+o，`toggleScreen`）：提前 `return`，只渲染 `TranscriptView`（`chunk-18hwfzwa.js#gQ`）转录视图；页脚 `REPL.tsx · TranscriptModeFooter`、`?` 帮助 `TranscriptHelpFooter`、`/` 搜索 `TranscriptSearchBar`（预热搜索索引后 `jumpRef.setSearchQuery`）、`[` 打印到 scrollback（`dumpMode`）、`v` 用编辑器打开。
- `AnimatedTerminalTitle`：工作中且终端聚焦时每 960ms 交替 `◐/◑` 前缀，否则 `✳`；在 tmux/screen/zellij 下受 `tengu_static_title_under_mux` 控制改为静态。

### 3.4 REPL 挂接的副作用 hooks（按代码顺序）

`useRegistryOverride(session)`（`chunk-18hwfzwa.js#IEe`）、`useBackgroundStatusSync()`（`chunk-18hwfzwa.js#MEe`）（spinner 模式）、`useKeybindingWarnings()`、`useExternalDialogBridge(scope.dialogTransport)`（`chunk-18hwfzwa.js#EF`）（对话框传输）、`runStartupNotificationSpecs`（`chunk-18hwfzwa.js#LEe`）/`FeatureOfTheWeekClaim`（`chunk-18hwfzwa.js#OIe`）/`FEe`（启动通知、"feature of the week" 额度）、`useTrustedDeviceEnrolledNotice`（`chunk-18hwfzwa.js#EIe`）/`useInformationalMessageSink`（`chunk-18hwfzwa.js#MIe`）（转录里的 notice/system 消息）、`soe`（LSP 插件推荐）、`useClaudeCodeHintRecommendation`、`useIDEIntegration`、`useAwaySummaryOnce`（`chunk-18hwfzwa.js#VEe`，文件历史快照初始化；当前语义名与行为不符）、`useSessionBackgrounding`、`useSemanticPromptMarks`（`chunk-18hwfzwa.js#aMe`，OSC 133 语义提示：markTurnStart/markTurnDone）、`VN`（左箭头打开 agents 等手势）、`useLogMessages`（转录持久化）、`ReplBridgeConnector`（bridge 回复）、`useQueueProcessor`、btw 历史重开器（`/btw`）、`useStartupNotifications`（`chunk-18hwfzwa.js#jEe`，空闲阈值；返回 idleThresholdMin，当前语义名与行为不符）、`useInboxPollerHook`（`chunk-18hwfzwa.js#rEe`）+ `useMailboxBridge`（swarm 收件箱）、`useScheduledTasks`（/loop、schedule_wakeup）、`useUsageLimitNotices`（`chunk-18hwfzwa.js#VIe`）（token 告警状态）、`getViewedTeammateTask`、`FIe`、面板坞相关 `PaneDockNamespace.usePanesAtOnce`/`PaneDockNamespace.useDockColumns`/`PaneDockNamespace.usePaneToastHold`/`PaneDockNamespace.useBarToasts`（`chunk-18hwfzwa.js#ah`）、`useTerminalViewportNamespace.useTerminalViewport(columns, rows, 占用列宽)`。

### 3.5 对话框栈

- **存储**：`dialogStore`（`useDialogStore()`，`chunk-1m6hq5zz.js#Cm`，由 AppStateProvider 挂载），`getState().open` 是已打开对话框列表。
- **入队**：`scope.requestDialog(def, payload, opts)`；`def` 由 `qo({kind, payload: schema, result: schema, default})` 定义（共约 40 个 kind：`permission_bash`、`permission_file`、`permission_webfetch`、`permission_skill`、`permission_powershell`、`permission_ask_user_question`、`permission_enter_plan_mode`、`permission_workflow`、`permission_browser`、`permission_monitor`、`permission_publish_plugin`、`sandbox_network_access`、`computer_use_approval`、`managed_settings_security`、`mcp_elicitation`、`mcp_url_elicitation`、`ide_onboarding`、`lsp_recommendation`、`plugin_hint`、`remote_callout`、`ultraplan_launch`、`goal_proposal`、`auto_mode_setup_review`、`auto_mode_outside_reads`、`peer_inbound_approval`、`local_jsx`…）。
- **渲染**：`XC`（`chunk-18hwfzwa.js#XC`）是对话框宿主，按 `variant`（inline/bottom/modal）筛选当前应显示在本位置的对话框；组件从注册表 `DIALOG_REGISTRY`（`chunk-18hwfzwa.js#ZAe`，`dialogEntry(def, Component) = {[def.kind]: Component}`）按 kind 取得。被草稿遮挡时显示提示（"draftHiddenCue"），被遮挡的权限请求另外通过 `components/dialogs/DialogHost.ts · BuriedPermissionCue` 发 `buried-idle-cue` 通知。
- 斜杠命令的 `local-jsx` 界面（/config、/model…）也走同一通道（kind `local_jsx`，`hasActiveLocalJsxUI`）。

### 3.6 通知

- 队列：`context/notifications.tsx · useNotifications()` → `{addNotification, removeNotification}`（dom-state）；通知项 `{key, text|jsx, priority: immediate|high|medium|low, color, timeoutMs, fold, …}`。
- 生产者：`hooks/notifs/*`（IDE 状态、MCP 连接、LSP 初始化、Fast 模式冷却、用量告警、弃用模型、插件自动更新/安装失败、队友启停计数、设置错误、auto 模式不可用…）以及 REPL、输入框（剪贴板图片提示、Ctrl+R 提示、stash 提示）。
- 显示：`components/PromptInput/Notifications.tsx · Notifications`（memo，超时 `NOTIFICATION_TIMEOUT_MS = 5000`）在页脚右侧显示当前项；语音录制/处理状态也在这里。

## 4. 输入处理

### 4.1 组件结构

`y8`（输入区）→ `Nke` → `PromptComposer`（`chunk-18hwfzwa.js#Oet`） → `PromptInput`（`components/PromptInput/PromptInput.tsx`，`d9e`）+ `PromptInputFooterMemo`（`V3e`）。

`PromptInput` 的 props（部分）：`draft, transcript, scope, turn, chrome, suggestionsStore, hidden, inputTakesFocus, takePendingPastes, onSubmit, dispatchCommand, isSearchingHistory, historyQuery, historyMatch, historySearchKeyDown, onOpenHistorySearch, helpOpen, setHelpOpen, toggleHelp, footerItemSelected, onHistoryDownPastEnd, placeholder, leftArrowRoute, modeIndicator, ideSelection, topBorderText, fastModeTag, ultraEffortTag, onIsPastingChange, onExitMessage, onExternalEditorActiveChange`。从 draft 订阅 `value/cursorOffset/mode/pastedContents/interimRange/decorations`（选择器 `Dv/JU/MT/XU/Mce/Ece`）。

渲染：`PromptInputModeIndicator`（`❯`，bash 模式 `!`，查看队友时队友色）+ `TextInput` 或 `VimTextInput`（由 `settings.editorMode` 决定）+ 上方 `PromptInputQueuedCommands`（排队命令预览）+ 下方页脚（`PromptInputFooterLeftSide`：权限模式与 shift+tab 循环、"Press Ctrl-C again to exit"、后台任务 pill、PR 徽章、语音提示；右侧 `Notifications`；有建议时换成 `PromptInputFooterSuggestions`；`?` 打开 `PromptInputHelpMenu`）。

### 4.2 按键链

1. Ink `useInput` → `hooks/usePasteHandler.ts · usePasteHandler` 的 `handleKeyDown`（先判断是否粘贴，见 4.3）。
2. → `hooks/useTextInput.ts · useTextInput`（或 vim 模式 `hooks/useVimInput.ts · useVimInput`，INSERT 状态回落到 useTextInput）。`useTextInput` 用 `mapInput` 把按键映射到 `Cursor` 编辑操作：ctrl+a/e/b/f/h/d/k/u/w/y、alt+b/f/d、方向键、home/end、`\⏎`/shift+⏎ 换行（`PromptInput/utils.ts · getNewlineInstructions`），上下键在多行内移动或触发历史（`onHistoryUp/Down`），双击 Esc 清空（`escape-again-to-clear`），Ctrl-C 清空或提示退出，左箭头在空输入时进入 agents（`left-arrow-again-for-agents`）。
3. 补全层 `hooks/useTypeahead.tsx · useTypeahead` 处理 Tab/↑↓/Esc（`autocomplete:accept/dismiss/next/previous`）。
4. 撤销：`hooks/useInputBuffer.ts · useInputBuffer`（防抖快照，ctrl+_）。
5. 全局键：`hooks/useGlobalKeybindings.tsx · GlobalKeybindingHandlers`（ctrl+o transcript、ctrl+t 任务面板）、`hooks/useExitOnCtrlCD.ts`（双击退出）、`hooks/useCommandKeybindings.tsx · CommandKeybindingHandlers`（keybindings.json 中 `command:<name>` 绑定为提交 `/<name>`）、`hooks/useCancelRequest.ts · CancelRequestHandler`（Esc 中断回合、取消唤醒、处理排队命令）。

### 4.3 粘贴与图片

- `usePasteHandler`：按键序列长度超过阈值或收到 bracketed paste 即视为粘贴；粘贴期间吞掉紧随的回车，结束后补发（`pendingReturnRef`）。按行拆分，用正则识别图片路径（含 macOS 截图临时目录 `TemporaryItems/…screencaptureui…/Screenshot`），并行 `utils/imagePaste.ts · tryReadImageFromPath`（权限检查可能 `refused`）后调用 `onImagePaste(base64, {mediaType, filename, dimensions, sourcePath})`；空粘贴在 macOS/WSL 上改读剪贴板图片（`getImageFromClipboard`，平台命令表 `getClipboardCommands`：osascript PNGf / PowerShell / xclip / wl-paste）。
- 图片与长文本以占位引用存在输入中：`[Image #N]`、`[Pasted text #N +M lines]`、`[...Truncated text #N +M lines...]`、`[✦ Team setup guide #N]`（正则在 `chunk-7p2hc4jn.js#xr`），内容放在 draft 的 `pastedContents[id] = {id, type: "text"|"image", content, …}`。
- 超长输入：`PromptInput/useMaybeTruncateInput.ts` 在 value 超过 `TRUNCATE_THRESHOLD_CHARS = 10000` 时调用 `inputPaste.ts · maybeTruncateInput`，保留首尾各 500 字符，中段折叠为 Truncated text 引用。
- 提交时 `chunk-18hwfzwa.js#OUe` 展开引用：若展开后以 `/` 开头但原输入不是，前置 `Pasted text:` 防止被当成命令；返回 `{kind: "send", text, postedText, inlinePastes, images}` 或 `cancel`（`paste_gone`/`blank`）。

### 4.4 历史

- ↑↓：`hooks/useArrowKeyHistory.tsx · useArrowKeyHistory`，每批加载 10 条（`HISTORY_BATCH_SIZE`），按当前模式（bash/prompt）过滤，回到底部恢复草稿；首次使用弹出 "ctrl+r to search history" 上下文提示。
- Ctrl+R：`hooks/useHistorySearch.ts · useHistorySearch`（流式扫描全部历史、增量匹配含粘贴文本内容、accept 回填 / execute 直接提交 / cancel 恢复，事件 `history_search_*`）；内联显示 `PromptInput/HistorySearchInput.tsx`，全屏版 `components/HistorySearchDialog.tsx`。
- 不计入历史的命令：`chunk-3g0djq3w.js#ro`（clear/resume/help/exit/feedback）。

### 4.5 补全（@ 提及、斜杠命令等）

`useTypeahead` 根据光标前 token 选择来源：
- `/` 开头：命令名补全与命令参数补全（`extractCommandNameAndArgs`、`hasCommandWithArguments`），`/resume` 参数补全会话标题（`buildResumeInputFromSuggestion`）。
- `@`：`hooks/unifiedSuggestions.ts · generateUnifiedSuggestions` 合并文件（`hooks/fileSuggestions.ts · generateFileSuggestions`，索引来自 `git ls-files`（含子模块与 untracked）或 ripgrep，遵守 `.ignore/.rgignore`，后台刷新）、MCP 资源/模板、agent；`@队友` 在 swarm 中高亮。
- bash 模式：shell 补全（命令/路径/变量，失败记 `tengu_shell_completion_failed`）。
- `:`：emoji 补全（`input_emoji_completion`）。
- 列表渲染：`PromptInputFooterSuggestions`（按类型图标、匹配高亮、滚动窗口）；结果写入 `suggestionsStore`。

### 4.6 输入模式与提交

- 模式：`components/PromptInput/inputModes.ts` 中只剩少量真正的模式函数（`getModeFromInput`：`!` 开头为 bash；`prependModeCharacterToInput`、`stripModePrefix`），该模块其余内容是被误归的代码（见过程文档）。316 的 draft 有 `mode` 字段（`"prompt" | "bash"`），`#` 记忆模式已不在输入模式里（回显组件 `UserMemoryInputMessage` 仍在）。
- 提交：`PromptInput` 调 `onSubmit` → `PromptSubmitController.submit(text, helpers, {inputModeOverride, fromKeybinding, …})`：bash 模式交 bash 处理，`/exit` 等本地命令、`local-jsx` 命令打开对话框，否则进入 TurnController（查询循环）。回合进行中再提交会进入消息队列（`messageQueue`），由 `hooks/useQueueProcessor.ts · useQueueProcessor` 在回合空闲且没有 local-jsx 对话框时依次出队。
- 语音：`hooks/useVoice.ts`（录音/电平/STT 连接/静音超时）+ `hooks/useVoiceIntegration.tsx · useVoiceIntegration`（把临时转写写到 `interimRange`，输入被改动则放弃 `input_diverged`）+ `useVoiceKeybindingHandler`（`voice:pushToTalk` hold/toggle）。
- 其他：Claude in Chrome 提示（`hooks/usePromptsFromClaudeInChrome.tsx`）、IDE @ 提及（`hooks/useIdeAtMentioned.ts`）、预测建议（`hooks/usePromptSuggestion.ts`，`tengu_prompt_suggestion`）。

## 5. 消息渲染

### 5.1 链路

`Gee` → `uye` → `components/Messages.tsx · Messages`（`sv`，memo 包装 `MessagesImpl`）：过滤（brief 模式 `filterForBriefTool/dropTextInBriefTurns`）、分组折叠（`grouped_tool_use`、`collapsed_read_search`、`work_segment`、`recap_fold`、`speaker_label`）、切片（transcript 模式 ctrl+e `transcript:toggleShowAll`），全屏时交给 `VirtualMessageList`（`useVirtualScroll` 只挂载视口内项，支持搜索索引与 `StickyTracker` 置顶用户提示），否则静态渲染。
→ `components/MessageRow.tsx · MessageRow`（`memo(MessageRowImpl, areMessageRowPropsEqual)`：`isMessageStreaming`、`allToolsResolved`、时间戳/模型显示）
→ `components/Message.tsx · MessageImpl`（`q_`）按 `message.type` 分派：

| message.type | 渲染 |
|---|---|
| `assistant` | 逐内容块交 `AssistantMessageBlock`（`chunk-ah34pb7m.js#Ih`）：`text`→`AssistantTextMessage`；`tool_use`→`AssistantToolUseMessage`；`thinking`→`AssistantThinkingMessage`；`redacted_thinking`→`AssistantRedactedThinkingMessage`；`server_tool_use`/advisor→`AdvisorMessage` 等；不认识的块只记一次日志（`logUnrenderableBlockOnce`） |
| `user` | `UserMessage`（`chunk-ah34pb7m.js#Ah`）按块：`text`→真正的用户文本组件 `chunk-ah34pb7m.js#I7`（见下），`image`→`UserImageMessage`，`tool_result`→`UserToolResultMessage` |
| `attachment` | `messages/AttachmentMessage.tsx · AttachmentMessage`（约 40 种，见 5.3）；`NULL_RENDERING_TYPES` 中的不渲染 |
| `system` | `messages/SystemTextMessage.tsx · SystemTextMessage`（见 5.4） |
| `grouped_tool_use` | `GroupedToolUseContent`（工具的 `renderGroupedToolUse`） |
| `collapsed_read_search` | `CollapsedReadSearchContent`（"Read N files, searched M patterns"，verbose 下逐个 `VerboseToolUse`） |
| `work_segment` | `WorkSegmentMessageView`（可选模块） |
| `speaker_label`、`recap_fold` | 说话人标签、回顾折叠 |
| `compact_boundary`/`microcompact_boundary` 子类型 | `CompactBoundaryMessage`（"Conversation compacted (ctrl+o for history)"）、`CompactSummary` |

用户文本（`I7`，316 中未归属到 `UserTextMessage.tsx`）按文本内容再分派：计划内容→`UserPlanMessage`；协调者/频道/跨会话/会话收件箱唤醒（`<wake reason="external-event">`）→各自组件；斜杠命令→`UserCommandMessage`；`<bash-input>`→`UserBashInputMessage`；`<bash-stdout/stderr>`、`<local-command-stdout/stderr>`→`UserLocalCommandOutputMessage`；`<user-memory-input>`→`UserMemoryInputMessage`；队友消息→`UserTeammateMessage`；任务通知→`UserAgentNotificationMessage`；MCP 资源更新→`UserResourceUpdateMessage`；其余→`UserPromptMessage`。

### 5.2 工具调用与结果

- `AssistantToolUseMessage`（`chunk-ah34pb7m.js#Bp`）：`ToolUseLoader` 圆点（进行中闪烁/成功/失败）+ `tool.userFacingName` + `renderToolUseMessage(input)`（异常被 `ul` 捕获记录）；状态来自 `lookups`：排队（`renderToolUseQueuedMessage`）、运行中（`renderToolUseProgressMessage`，含 PreToolUse hook 进度）、等待权限、完成、失败、已停止；MCP 工具 `mcp__server__tool` 拆开显示。
- `UserToolResultMessage`（`chunk-ah34pb7m.js#kh`）：`is_error` → `UserToolErrorMessage`（工具的 `renderToolUseErrorMessage`，兜底 `FallbackToolUseErrorMessage`：去 `<tool_use_error>`、InputValidationError→"Invalid tool parameters"、非 verbose 截断并提示 ctrl+o）；被拒绝 → `UserToolRejectMessage`（`renderToolUseRejectedMessage`；计划被拒 `RejectedPlanMessage`；文件编辑被拒 `FileEditToolUseRejectedMessage`）；成功 → `UserToolSuccessMessage`（`renderToolResultMessage(output, progress, {verbose, theme…})`，auto 模式放行附 "Allowed by auto mode"，PostToolUse hook 进度）。
- 缩进容器 `MessageResponse`（"⎿" 前缀，嵌套不重复，被 100+ 处使用）；"(ctrl+o to expand)" 由 `CtrlOToExpand` 提供。
- Shell 输出：`shell/OutputLine.tsx`（JSON 格式化、错误/警告着色）、`ShellProgressMessage`、`ShellTimeDisplay`。

### 5.3 附件（AttachmentMessage 的 case）

`file`/`directory`/`notebook`/`pdf_reference`/`compact_file_reference`/`already_read_file`/`file_unchanged`、`diagnostics`、`selected_lines_in_ide`/`selected_lines_in_diff`、`at_mention_reference`、`mcp_resource`、`hook_success`/`hook_blocking_error`/`hook_non_blocking_error`/`hook_error_during_execution`/`hook_cancelled`/`hook_stopped_continuation`/`hook_system_message`/`hook_permission_decision`/`hook_deferred_tool`/`async_hook_response(_batch)`、`skill_listing`/`invoked_skills`/`dynamic_skill`、`relevant_memories`/`nested_memory`/`account_memory_recall`/`withheld_memory`、`plan_file_reference`、`queued_command`、`task_status`、`teammate_shutdown_batch`、`goal_status`、`command_permissions`、`agent_listing_delta`、`tool_host_result_lines`/`tool_hosts_correction`/`tool_hosts_notice`、`text`。

### 5.4 系统消息（SystemTextMessage 的 subtype）

`turn_duration`（"✻ <随机完成动词> for Xm Ys"，`TurnDurationMessage`，附 token、提醒数、仍在后台的 agent/工作流数，受 `showTurnDuration` 设置控制）、`memory_saved`/`account_memory_saved`（`MemorySavedMessage`）、`away_summary`、`agents_killed`、`stop_hook_summary`（"Ran N hooks"）、`bridge_status`（"/remote-control is active · Continue here, on your phone, or at …"）、`api_error`、`model_fallback`/`model_not_found`/`model_refusal_fallback`/`model_refusal_no_fallback`、`permission_denied`/`permission_retry`、`scheduled_task_fire`、`cloud_session_status`、`thinking`（recap）；其余按 level（info/warning/error）着色显示。

### 5.5 Markdown / 高亮 / diff

- `components/Markdown.tsx · Markdown`：缓存的 `marked` lexer → `utils/markdown.ts · formatToken`（标题、列表编号 `numberToLetter`、代码块、引用、链接、issue 引用自动链接 `linkifyIssueReferences`（GitHub/GitLab/Bitbucket/Codeberg…）、OSC 8 超链接）→ `Ansi` 渲染；表格交 `MarkdownTable`（按宽度收缩换行，过窄改纵向"列名: 值"）；流式 `StreamingMarkdown` 只重 lex 最后一个未闭合块。
- 代码高亮：`HighlightedCode`（memo，`{code, filePath, width, dim, startLine, lineNumbers}`）→ 原生高亮或 `HighlightedCode/Fallback.tsx`（cli-highlight，语言不支持回落 markdown，LRU 缓存 500 项 + 工作量预算）。
- diff：`StructuredDiff`（原生 color-diff 模块可用时词级高亮，`StructuredDiff/colorDiff.ts · getColorModuleUnavailableReason`；否则 `StructuredDiff/Fallback.tsx` 纯 JS 行配对 + 词级 diff）；`StructuredDiffList` 多 hunk；`FileEditToolDiff`/`FileWriteToolDiff`/`NotebookEditToolDiff` 权限预览，外框 `DiffFrame`（虚线边框）；`/diff` 对话框 `components/diff/*` + `hooks/useDiffData.ts`、`useTurnDiffs.ts`；IDE diff `hooks/useDiffInIDE.ts`。

## 6. 权限请求

### 6.1 调用链

```
查询循环执行工具前 → canUseTool(tool, input, toolUseContext, assistantMessage, toolUseID, forceDecision?)
  hooks/useCanUseTool.tsx · useCanUseTool  (X$o)
    ├─ 匹配最近拒绝记录（recordDenial、getDenials）
    ├─ hasPermissionsToUseTool（gKe，dom-permissions）→ allow | deny | ask
    │    allow：logDecision(config) → buildAllow(updatedInput)；auto 模式分类器放行时记录
    │    ask  ：tool.description(input) → chunk-s4bxxzsw.js#pWn（requestToolPermission，未归属）
    │           ├─ swarm worker：hooks/toolPermission/handlers/swarmWorkerHandler.ts · handleSwarmWorkerPermission（写领导 mailbox，等回复）
    │           ├─ coordinator ：hooks/toolPermission/handlers/coordinatorHandler.ts · handleCoordinatorPermission（先自动检查）
    │           └─ 交互式      ：components/permissions/hooks.ts · usePermissionRequestLogging（实为"显示权限对话框"）
    │                   ├─ toolUseContext.requestDialog(def, descriptor) → dialogStore → XC → ZAe[kind] 组件
    │                   └─ hooks/toolPermission/handlers/interactiveHandler.ts · handleInteractivePermission：
    │                      同时向 Remote Control bridge 发请求、监听 channel 回复、服务器审批 watcher、PermissionRequest hooks；
    │                      谁先给出决定谁 claim，其余 teardown
    └─ PermissionContext（hooks/toolPermission/PermissionContext.ts · createPermissionContext）：
         resolveOnce、logDecision、logCancelled、persistPermissions（写规则到 settings）、setModeFromBridge、
         resolveIfAborted、buildAllow、cancelAndAbort、runHooks
```

决策日志：`hooks/toolPermission/permissionLogging.ts · logPermissionDecision`（`tengu_tool_use_granted_in_config/_by_classifier/_in_prompt`、`tengu_tool_use_denied_in_config/_rejected_in_prompt`、OTEL `tool_decision`，来源 config/classifier/hook/user_permanent/user_temporary/user_abort）。显示时记录 `tengu_tool_use_show_permission_request`；等待过久由 `usePermissionPromptNotification`（旧版名 `PermissionRequest`）调用 `useNotifyAfterTimeout(text, "permission_prompt")` 发系统通知。

### 6.2 对话框组件（注册表 `DIALOG_REGISTRY`（`chunk-18hwfzwa.js#ZAe`） 中的权限部分）

| kind | 组件 | 内容与选项 |
|---|---|---|
| `permission_bash` | `BashPermissionRequest/BashPermissionRequest.tsx · BashPermissionRequestInner` | 命令、说明、复合命令子结果、破坏性命令警告（`tengu_destructive_command_warning`）；选项来自 `bashToolUseOptions`：yes / yes-apply-suggestions（"Yes, and don't ask again for <前缀>"）/ yes-prefix-edited / yes-enable-auto-mode / no（Tab 附反馈，`useShellPermissionFeedback`） |
| `permission_powershell` | `PowerShellPermissionRequest` | 同上（`powershellToolUseOptions`） |
| `permission_file` | `FilePermissionDialog/FilePermissionDialog.tsx · FilePermissionDialog` | Edit/Write/NotebookEdit/外部读取：diff 预览（或 IDE diff，`ideDiffConfig`）；选项 `getFilePermissionOptions`：accept-once / accept-session（项目内、`~/.claude`、项目 `.claude` 不同文案，shift+tab 循环模式）/ reject / block-outside-reads；处理器表 `usePermissionHandler.ts · PERMISSION_HANDLERS` |
| `permission_webfetch` | `WebFetchPermissionRequest` | URL + 安全检查；"不再询问该域名"（`domain:` 规则） |
| `permission_skill` | `SkillPermissionRequest` | 技能名、来源、安全检查 |
| `permission_ask_user_question` | `AskUserQuestionPermissionRequest` → `…Body` | 多问题导航、单选/多选/自由输入（`__other__`）、预览分栏、图片附件、提交页；状态 reducer `use-multiple-choice-state.ts` |
| `permission_enter_plan_mode` | `EnterPlanModePermissionRequest` | 说明计划模式 |
| （ExitPlanMode） | `ExitPlanModePermissionRequest` | 计划 Markdown + 上下文用量；`buildPlanApprovalOptions`：清空上下文并 auto/acceptEdits/bypass、保留上下文、继续规划（反馈）、ultraplan；可按计划自动命名会话 |
| `sandbox_network_access` | `SandboxPermissionRequest` | 主机；允许一次 / 永久允许（写 userSettings） |
| `computer_use_approval` | `ComputerUseApproval` | macOS 辅助功能/屏幕录制面板，或应用与能力授权 |
| `managed_settings_security` | `ManagedSettingsSecurityDialog` | 托管设置危险项变化 |
| 其他工具 | `FallbackPermissionRequest` | 工具摘要或参数表 + 通用选项 |

公共部件：`PermissionDialog`（外框 "Permission Required:"）、`PermissionRequestTitle`、`PermissionPrompt`（选项 + 反馈输入，Esc=拒绝）、`PermissionRuleExplanation`（命中规则与来源文件、auto 分类器原因）、`PermissionExplanation`（风险解释器）、`WorkerBadge`（队友来源）、`PermissionDecisionDebugInfo`。

### 6.3 规则管理与其他确认

`/permissions`：`rules/PermissionRuleList.tsx · PermissionRuleList`（Recent（auto 模式拦截）/Allow/Ask/Deny/Workspace 标签；`AddPermissionRules` 选保存位置 local/project/user；`AddWorkspaceDirectory`/`RemoveWorkspaceDirectory`）。启动时：`TrustDialog`（项目 hooks/MCP/bash 权限/apiKeyHelper/OTEL helper/AWS/GCP 命令/危险 env/技能来源）、`BypassPermissionsModeDialog`、`AutoModeOptInDialog`、`MCPServerApprovalDialog`/`MCPServerMultiselectDialog`、`ClaudeMdExternalIncludesDialog`、`ApproveApiKey`。`/sandbox`：`sandbox/SandboxSettings.tsx`（模式/配置/依赖/覆盖标签）。

## 7. 主要 hooks 职责

| hook | 职责 |
|---|---|
| `useTerminalSize` | Ink 终端尺寸（174 处使用） |
| `useMainLoopModel`（`#Gc`） | 订阅并解析当前主循环模型 |
| `useCanUseTool` | 权限判定入口（第 6 节） |
| `useTextInput` / `useVimInput` / `useSearchInput` | 文本编辑核心 / vim / 搜索框编辑 |
| `useTypeahead` / `unifiedSuggestions` / `fileSuggestions` | 补全 |
| `useArrowKeyHistory` / `useHistorySearch` | 历史 |
| `usePasteHandler` / `useInputBuffer` / `useClipboardImageHint` | 粘贴 / 撤销 / 剪贴板图片提示 |
| `useQueueProcessor` / `useCancelRequest` | 排队命令执行 / Esc 中断 |
| `useLogMessages` | 转录持久化 |
| `useVirtualScroll` | 虚拟滚动 |
| `useGlobalKeybindings` / `useCommandKeybindings` / `useExitOnCtrlCD` | 全局键 |
| `useIDEIntegration` / `useIdeSelection` / `useIdeConnectionStatus` / `useIdeAtMentioned` / `useDiffInIDE` | IDE 集成 |
| `useReplBridge` | Remote Control：把本地会话桥接到 claude.ai（消息/权限/命令双向） |
| `useRemoteSession` / `useSSHSession` / `useDirectConnect` | 云会话 / SSH / 直连远程服务器 |
| `useInboxPoller` / `useMailboxBridge` / `useSwarmPermissionPoller` / `useSwarmInitialization` | swarm 队友消息与权限 |
| `useManagePlugins` / `useLspPluginRecommendation` / `useClaudeCodeHintRecommendation` | 插件加载与推荐 |
| `useScheduledTasks` / `useTaskListWatcher` / `useTasksV2` | 定时任务 / 任务列表 |
| `useAwaySummary` / `useNotifyAfterTimeout` / `useMemoryUsage` | 离开摘要 / 等待通知 / 内存告警 |
| `useVoice*` | 语音输入 |
| `hooks/notifs/*` | 各类通知（第 3.6 节） |

## 8. 主题与输出样式

- 调色板：`utils/theme.ts` 六套——`DARK_THEME`（默认）、`LIGHT_THEME`、`DARK_ANSI_THEME`、`LIGHT_ANSI_THEME`、`DARK_DALTONIZED_THEME`、`LIGHT_DALTONIZED_THEME`（`getTheme(name)`）；每套约 75 个键：`claude/claudeShimmer`、`permission(+Shimmer)`、`planMode`、`autoAccept(+Shimmer)`、`bashBorder`、`promptBorder(+Shimmer)`、`text/inverseText/inactive/subtle/suggestion/success/error/warning`、`diffAdded`/`diffRemoved`（及 `diffAddedDimmed`、`diffAddedWord`、`diffRemovedDimmed`、`diffRemovedWord`）、`userMessageBackground(+Hover)`、`bashMessageBackgroundColor`、`memoryBackgroundColor`、`fastMode`、`effortUltra`、`rate_limit_fill/empty`、`rainbow_*`、`clawd_body/clawd_background`、`*_FOR_SUBAGENTS_ONLY`（子代理颜色）、`professionalBlue`、`briefLabelYou/Claude`、`composerSidebarBackground` 等。
- Provider：`components/design-system/ThemeProvider.tsx · ThemeProvider`：读全局配置 `theme`（默认 `dark`），`auto` 跟随系统明暗；预览（`usePreviewTheme`：`setPreviewTheme/cancelPreview`，ThemePicker 用）；**自定义主题**（用户主题 + 插件主题 `pluginThemes`）与覆盖色 `activeThemeOverrides`（2.1.88 没有）；`useTheme() → [currentTheme, setThemeSetting]`。
- 解析：`ThemedText`/`ThemedBox`（`Box` = `ThemedBox`）的颜色属性可写主题键或原始颜色（`rgb()`、`#` 开头的十六进制、`ansi256()`、`ansi:` 直通，`resolveColor`）；`design-system/color.ts · color` 返回 chalk 函数；`themeColorToAnsi` 用于非 React 输出。
- `/theme`：`ThemePicker`（预览 diff、ctrl+t `theme:toggleSyntaxHighlighting`、写 userSettings）。`CLAUDE_CODE_SYNTAX_HIGHLIGHT` 影响 diff/代码高亮。
- 输出样式：`OutputStylePicker`（`/output-style`，内置 + 自定义样式，"Preferred output style"），设置写入 `outputStyle`（`tengu_output_style_changed`）；样式定义与提示词注入不在本领域。

## 9. 配置项、环境变量与开关

**环境变量**（在 ui 模块中直接读取）：`CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL`、`CLAUDE_CODE_DISABLE_TERMINAL_TITLE`、`CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT`、`CLAUDE_CODE_SESSION_KIND`（`bg` 强制全屏）、`CLAUDE_CODE_NO_FLICKER`、`CLAUDE_CODE_DISABLE_MOUSE(_CLICKS)`、`CLAUDE_CODE_SCROLL_SPEED`、`CLAUDE_CODE_PROACTIVE`、`CLAUDE_CODE_BRIEF`、`CLAUDE_CODE_FORCE_FIRST_LAUNCH`、`CLAUDE_CODE_EXIT_AFTER_FIRST_RENDER`、`CLAUDE_CODE_FOOTER_INDICATOR`、`CLAUDE_CODE_AUTO_CONNECT_IDE`、`CLAUDE_CODE_SSE_PORT`、`CLAUDE_CODE_SYNTAX_HIGHLIGHT`、`CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY`、`CLAUDE_FORCE_DISPLAY_SURVEY`、`CLAUDE_CODE_REMOTE`、`CLAUDE_CODE_TMUX_SESSION`、`CLAUDE_CODE_TRANSCRIPT_LOCAL_GC`、`CLAUDE_AFK_TIMEOUT_MS`（AskUserQuestion 离开自动推进）、`CLAUDE_BRIDGE_REATTACH_SESSION`、`CLAUDE_BG_SOURCE`、`CLAUDE_JOB_DIR`、`CLAUDE_CODE_DISABLE_PLUGIN_FORWARDING`、`DISABLE_COMPACT`、`DISABLE_INSTALLATION_CHECKS`、`API_TIMEOUT_MS`、`EDITOR`/`VISUAL`、`TERM`（`xterm-ghostty` 换 Spinner 字形）、`TERM_PROGRAM`、`LC_ALL`/`LC_TIME`、`WSL_DISTRO_NAME`。

**设置键**（读写）：`theme`、`editorMode`（normal/vim）、`outputStyle`、`language`、`prUrlTemplate`、`maxProseWidth`、`showTurnDuration`、`prefersReducedMotion`、`autoConnectIde`、`autoUpdatesChannel`、`disableAllHooks`、`statusLine`（含 `refreshInterval`）、`voiceFooterHintSeenCount`、`lastClawdEntranceVersion`、`lastShownEmergencyTip`、`remoteControlAtStartup`、`sandbox.*`、`permissions.*`（规则）。

**GrowthBook/动态配置**（ui 中出现的非事件名）：`tengu_static_title_under_mux`、`tengu_pewter_brook`、`tengu_amber_creek`（全屏默认）、`tengu_marlin_porch`、`tengu_kairos_brief`（brief 模式）、`tengu_lively_avalanche`、`tengu_copper_thistle`、`tengu_cosmic_lake`（超额通知）、`tengu_calm_riddle`（取消请求）、`tengu_glittery_fern`、`tengu_feedback_survey_config`、`tengu_bad_survey_transcript_ask_config`/`tengu_fine_survey_transcript_ask_config`/`tengu_good_survey_transcript_ask_config`、`tengu_juniper_vale`、`tengu_russet_whimbrel`、`tengu_dunwich_bell`、`tengu_velvet_moth`、`tengu_amber_flint`（swarm）、`tengu_prompt_suggestion`、`tengu-top-of-feed-tip`（紧急提示）、`tengu_keen_sloth`。

## 10. 与 2.1.88 的差异（有代码证据）

1. **REPL 架构**：88 的 `screens/REPL.tsx`（5005 行，110 处 useState/useEffect，`toolUseConfirmQueue` 等状态）在 316 中变为控制器类（TurnController、SessionController、PromptSubmitController、ComposerChrome、PromptDraft、ScrollPin、BackgroundGesture、IdleNudge…，均在 `chunk-18hwfzwa.js` 未归属段）+ `bindHost`；REPL 局部 state 只剩 `screen`、`dumpMode`。
2. **对话框统一**：权限确认队列改为 `dialogStore` + `requestDialog(def)` + kind 注册表 `DIALOG_REGISTRY`（`chunk-18hwfzwa.js#ZAe`）（约 40 个 kind，含 Slack 连接、Continue in Projects、导入审查、账号记忆确认等新对话框）。88 的 `components/permissions/PermissionRequest.tsx` 是按工具分派的组件，316 同名模块只剩通知副作用。
3. **输入草稿外置**：输入值不再是 PromptInput 的 useState，而是 `PromptDraft` store（`draft.attribute(来源, fn)` 记录修改来源，支持 prompt hooks `prompt.change`/`prompt.submit`）。
4. **全屏/虚拟滚动**成为主路径：`FullscreenLayout`、`ScrollPin`、未读分隔线、"新消息"药丸、置顶提示头、diff 侧栏（`replTab === "diff"`）、面板坞（PaneDock、InlinePanes）、ToastStack；`utils/fullscreen.ts` 的决策码（`bg_forced_on/sr_auto_off/env_off/env_on/settings_on/tmux_cc_auto_off/win_ssh_auto_off/upsell_trial_on/fresh_install_on`）。
5. **transcript 模式增强**：搜索栏（索引预热 "indexing…/indexed in Nms"、n/N 导航）、`[` 打印到 scrollback、`v` 编辑器打开、`?` 帮助页脚。
6. **主题**：新增自定义主题与插件主题、覆盖色；颜色键大量增加（`rainbow_*`、`clawd_*`、`effortUltra`、`composerSidebarBackground`、`briefLabel*`…）。
7. **新消息类型/附件**：`work_segment`、`recap_fold`、`speaker_label`、`advisor`（`AdvisorMessage`）、`thinking_stripped`/`advisor_stripped` 附件处理、`goal_status`、`tool_hosts_*`、`account_memory_*`、`withheld_memory`、会话收件箱/跨会话/频道用户消息。
8. **新功能 UI**：Remote Control（`BridgeDialog`、`useReplBridge`、bridge 状态消息）、云会话 ultraplan/ultrareview 详情（`RemoteSessionDetailDialog`）、Computer Use 授权、语音输入、预测建议、记忆召回调查、团队/账号记忆、Grove 条款对话框、桌面版交接。
9. **已不存在**（88 有、316 无匹配）：`SedEditPermissionRequest`、`UserBashOutputMessage`、`UserToolCanceledMessage`、`SystemAPIErrorMessage`、`InterruptedByUser`、`StatusNotices`、`PromptInputStashNotice`、`IssueFlagBanner` 组件（逻辑在 `useIssueFlagBanner`）、`useCommandQueue`、`useMergedTools/useMergedCommands`、`useDoublePress`、`useTimeout`、`useElapsedTime`、`useSettingsChange`、`useSkillsChange` 等 46 个文件（列表见过程文档）。其中部分可能只是被内联或匹配失败。

## 11. 数据结构（从代码读出）

- **Draft 快照**（`PromptDraft`）：`{value, cursorOffset, mode: "prompt"|"bash", pastedContents: {[id]: {id, type: "text"|"image", content, mediaType?, filename?, dimensions?, sourcePath?, unavailable?}}, interimRange, decorations, changedFromOutside, linkSuppliedTexts}`。
- **提交 helpers**（`NOOP_HELPERS`）：`{setCursorOffset, clearBuffer, resetHistory}`；提交选项 `{fromKeybinding, inputModeOverride, leavesIdeSelection}`。
- **对话框定义**：`qo({kind, payload: zodSchema, result: zodSchema, default})`；注册项 `{[kind]: Component}`。
- **通知**：`{key, text|jsx, priority, color, timeoutMs, fold, hint, dim, segments}`（从 `useTrustedDeviceEnrolledNotice`（`chunk-18hwfzwa.js#EIe`）/`FeatureOfTheWeekClaim`（`chunk-18hwfzwa.js#OIe`） 读出的字段）。
- **Message 组件 props**：`{message, lookups, containerWidth, addMargin, tools, commands, verbose, inProgressToolUseIDs, progressMessagesForMessage, shouldAnimate, shouldShowDot, isTranscriptMode, isUserContinuation, isSplitUserContinuation, followsSpeakerLabel, followsInboundLabel, latestBashOutputUUID, …}`。
- **REPL 本地屏幕**：`"prompt" | "transcript"`；`presentation`：`"fullscreen"` 或其他。

## 12. 未解之处

- `chunk-18hwfzwa.js` 中一批未归属的核心类（`TurnController`（`chunk-18hwfzwa.js#ste`）、`SessionController`（`chunk-18hwfzwa.js#lz`）、`PromptSubmitController`（`chunk-18hwfzwa.js#yte`）、`ComposerChrome`（`chunk-18hwfzwa.js#ute`）、`PromptDraft`（`chunk-18hwfzwa.js#zY`）、`ScrollPin`（`chunk-18hwfzwa.js#Yee`）、`BackgroundGesture`（`chunk-18hwfzwa.js#XG`）、`ReplSessionScope`（`chunk-18hwfzwa.js#NQ`）、`XC` 对话框宿主、`DIALOG_REGISTRY`（`chunk-18hwfzwa.js#ZAe`）注册表、`Gee` 消息区、`PromptAreaWithBackgroundHint`/`Nke`/`PromptComposer`（`chunk-18hwfzwa.js#y8`/`chunk-18hwfzwa.js#Nke`/`chunk-18hwfzwa.js#Oet`）输入区、`TranscriptView`（`chunk-18hwfzwa.js#gQ`）转录视图、`_F` 屏幕框架）在 88 中没有对应文件，应由 lead 新建重组路径（建议放 `screens/repl/*`）。本手册按构造参数与方法名描述，内部逻辑未逐行核实。
- `REPL` 的若干局部（`isInsidePanelHost`=`useContext(rootSessionSlot) !== null`、`dialogOverPanel`=`useHasBlockingDialog()`、`exitState`=`useStoreSelector(chrome, isExiting)`、`hasTeamModal`=`useHasModalDialog()`/`isModalOpen`=`useHasModalUserDialog()`）语义只从用途推断，置信度 0.6。
- `components/agents/*` 与 `new-agent-creation/wizard-steps/*` 的内容与模块名明显不符（实为 Bedrock/Vertex/云网关设置向导等），旧版 `/agents` 创建向导在 316 的真实位置未确认。
- `inputModes.ts` 中 `chunk-2rkp9ne9.js` 的 34 个声明（propose_skills 相关）真实归属未确认。
- `PermissionRequest` 流程中 `repromptFilePermission`（`chunk-s4bxxzsw.js#pWn`）及其调用的 `usePermissionRequestLogging` 的旧版名不准确，后者实际是"显示并管理权限对话框"。

## 13. 引用校验结果

校验时间 2026-11-04 05:09（UTC），对象为当时的 `reconstructed/`。脚本检查本文所有代码样式引用：路径是否存在（相对仓库根，或相对 `reconstructed/src/`，`.ts/.tsx` 对应 `.js`）；声明 id 是否在 `reconstructed/symbols.jsonl`；"路径 · 函数名"中的函数是否属于该文件；标识符与字面量是否出现在 `reconstructed/symbols.jsonl` 或阅读树代码中。在 2.1.316 找不到、但在 2.1.88 源码（`references/claude-code-analysis/src`）中存在的，计为"只在 2.1.88 中存在"（删除项、旧名，属预期）。

- 共检查 909 处引用：路径 85/87（另 2 个只在 2.1.88 中存在），字面量 123/123，名字 610/621（另 11 个只在 2.1.88 中存在），声明id 78/78；占位符与含空格的说明性文字 154 处未检查。
- 只在 2.1.88 中存在（删除项或旧名，预期如此）：`toolUseConfirmQueue`、`messages/*`、`FIe`、`V3e`、`SedEditPermissionRequest`、`UserBashOutputMessage`、`UserToolCanceledMessage`、`PromptInputStashNotice`、`useMergedTools/useMergedCommands`、`useElapsedTime`、`useSettingsChange`、`useSkillsChange`
- 未通过：0 处。
