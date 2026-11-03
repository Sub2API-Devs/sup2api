# 第五阶段第四轮（参数/局部）命名：name-l2（组 2，前半段续做 0–277）

范围：`analysis/segments/naming-round4c.json` 第 2 项（下标 0 起，清单共 826 个声明），`dirs` 首尾 `src/commands/powerup` … `src/components/mcp`。本成员只处理 **下标 0 到 277**（后半段 278–547 由 name-l2x 负责，另一成员已完成并写了 `naming/semantic-l2x.jsonl`），即 `src/commands/promo/promo.js` 的 `claimPageLine` 起，到 `src/components/fleet/FleetList.js` 的 `FleetComposer` 止，覆盖 109 个路径、278 个声明：

- `src/commands/*`：promo、rate-limit-options（RateLimitOptionsMenu / ResetLimits）、release-notes、resume、review、sandbox、scroll-speed、send-to-project、skill-doctor、skills、team-onboarding（api/gather/index）、teleport（sendToCloud/teleportToCloud）、ultraplan、workflows（WorkflowRunList/CloudWorkflowsDialog/CloudWorkflows…）
- `src/components/*` 前半：AgentProgressLine、agents（AgentDetail/AgentsList/AgentsMenu/new-agent-creation MethodStep）、ApproveApiKey、artifacts（ArtifactsDialog 大组件 + 各小函数）、AutocompactOfferDialog、AutoCompactWindowDialog、AutoUpdater/AutoUpdaterWrapper、AwsAuthRefresh、BridgeDialog、BypassPermissionsModeDialog、ChromeAutoEnableDialog、cloud/CloudCreateChecklist、ConsoleOAuthFlow（列表组件 + 状态机组件）、ContextVisualization、CoordinatorAgentStatus、CopyUrlHint、CustomSelect 整片（select/selectA11y/selectTable/selectTypeahead/SelectMulti/use-multi-select-state/use-select-navigation/select-input-option）、daemon（DaemonScheduledTaskDetail/DaemonServicesView/RemoteControlServerDetail/UnattendedConsentSelect）、design-system（ConfirmSelect/Dialog/Divider/FuzzyPicker/KeyboardShortcutHint/ListItem/NoticeUnderScene/StatusIcon/Table/Tabs/ThemeProvider）、DesignOAuthFlow、DesktopHandoff、DesktopUpsell、DevChannelsDialog、DeviceMcpConsentDialog/Reconsent、DeviceReenrollPrompt、DiagnosticsDisplay、dialogs（DialogHost/DialogFrame/registry/dialogStatus）、diff（DiffDetailView/DiffDialog）、EffortIndicator、EffortMediumNudgeDialog、EffortSlider（EffortSlider/EffortPicker/EffortCommandView/UltracodeToggle）、ExitBackgroundWorkDialog、ExitFeedbackNudge、ExportDialog、FallbackToolUseErrorMessage、Feedback、FeedbackSurvey 整片（FeedbackDraftNotice/FeedbackSurvey/FeedbackSurveyView/SurveyCard/SurveyFollowup/SurveyHost/TranscriptSharePrompt/useDebouncedDigitInput/useFeedbackSurvey/useLongContextSurvey/useMemorySurvey/useOrgSurvey/useSurveyState）、FileEditToolUpdated/Rejected、FilePathLink、fleet（dispatchDefaults/fleetActions/fleetDispatch/FleetList）

## 前任写到哪里

接手时 `naming/semantic-l2.jsonl` 已有 **3,421 行**（`annotate check` 0 problems / 0 suffixed），但落在本段 0–277 范围内的只有 **353 个绑定**——前任几乎全部写在了 278 之后（脚本/大函数外围），本段剩余 3,920 个压缩绑定（清单 `unnamed` 合计恰好 3,920，278 个声明全部 > 0）。

## 本次续写

| 项 | 数量 |
|---|---|
| 本次追加条目 | **3,920 行**（116 个批次、每批 ≤30 个声明，全部 `cat 批次文件 >> naming/semantic-l2.jsonl` 追加） |
| 覆盖的声明 | 278 / 278（本段声明全部覆盖，无一遗漏） |
| 命名绑定 | **3,920**，与清单 `unnamed` 完全对齐；与前任 353 条无重复键 |
| 最终表 | **7,341 行**、146 个 chunk，`annotate check` **0 problems / 0 suffixed by conflicts** |
| 复核方法 | `artifacts/tmp/lead/final5/locals.jsonl` + 本表合并成 `artifacts/tmp/l2c/final/locals.jsonl`，对 0–277 全量 `show`，`(_K` 只剩 1 个死绑定（见"跳过"） |

置信度分布（3,920 条）：0.8 / 3,900，0.7 / 17，0.6 / 3。低档主要是三处含义模糊的辅助函数参数（`putUpgradeOptionsFirst`、`claimResetHandler`、`shellServerName` 一类无法从上下文唯一确定的），其余按"是什么"直接命名。

## 做法

- 每批 5–30 个声明，`annotate show` 输出重定向到 `artifacts/tmp/l2c/d<N>.txt` 或 batch 文本后再读，控制上下文；大函数（ArtifactsDialog 177 个绑定、EffortSlider 91 个、RateLimitOptionsMenu 160 个、MultiSelect 74 个、Select_2 37 个等）单声明成批。
- 每批写 `artifacts/tmp/l2c/batchNN.jsonl`，`annotate check` 后再 `cat >> naming/semantic-l2.jsonl`；`check` 0 problems 后重算合并 final 复核剩余 `_K`。
- 撞名处理：46 处引擎判 `_2`（`same-scope`、`captures-outer-or-global`、`param-body-or-catch-clash`），一律直接改名（如 `error`→`toggleError`/`removeError`/`caughtError`、`isDisabled`→`isListDisabled`、`edit`→`parsedEdit`、`option`→`candidateOption`、`config`→`nextConfig`、`workflowRows`→`workflowRowItems`、`uniqueLabels`→`dedupedLabels`），最终 `0 suffixed by conflicts`。
- 反复用 `artifacts/tmp/l2c/keys.mjs`（提取某声明内仍压缩的 `_K` 偏移）与 `overlap.cjs`/`rembind.mjs`（按 `bindingsOf` 精确统计本段未命名绑定）替代凭感觉扫读。

## 跳过

- **1 个死绑定**：`chunk-s5p7fp0c.js@14022`（ConsoleOAuthFlow 里的 `Y_K14022`，`refs: 0`，只在声明处出现一次）。按"看不出用途的宁可不命名"跳过；复核时曾写 `unusedPlaceholder`，为了不留占位名，已从表中删掉。
- `chunk-e7qhpt47.js@14370`（`_`，`scope: top`，是 `summarizeMcpChanges` 用到的模块级常量 `limit = 3`）：不属于参数/局部，且 `annotate show` 的绑定替换对 top 级绑定不生效（试过去掉/改名都不影响渲染），从表中移除以避免误导。

## 发现的问题（仅记录，未在本表覆盖）

1. **`fleetDispatch.js` 的 `MAX_SPAWN_RETRIES` 名实不符**：命名是"重试次数"，实际用来判断 `intent.trim().length < MAX_SPAWN_RETRIES`（"太短"阈值 4），应叫 `MIN_INTENT_LENGTH`。不属本表范围（不是我命名的，值是上游 `fleetSessions.js` 的 `var MAX_SPAWN_RETRIES = 4`）。
2. **`MethodStep.js`（AWS profile 步骤）里 `isBedrockRegion` 被用来从 profile 名里挑默认值**：`c.find(isBedrockRegion)` 实际是用 `name.toLowerCase().includes("bedrock")` 找含 "bedrock" 的 profile，而不是"区域"。所以"too many profiles → 预填第一个 bedrock profile"的逻辑与命名不一致，读代码容易误解。
3. **`AgentDetail.js`（iTerm2 安装流程）里 `phase === "api-instructions"` 被当作"安装成功"**：`onKeyDown` 只在 `api-instructions` 时接受 Enter，`It2InstalledSuccess` 也是同一分支；`verifyIt2Setup()` 成功后置 `"success"`，但 1.5s 后 `onDone("installed")`。两个状态（`api-instructions`/`success`）语义重叠。
4. **`RateLimitOptionsMenu` 的 memo 缓存键与真实依赖不一致**：`memoSlots` 里用 `l_K24888[33..35]` 缓存 `Se_K27526`（upgradeOptions），但进入该分支前还读了 `B_K25958`/`Z_K27374`/`upgradePaths`（已列入 key），然而 `isAutoResumeOfferEnabled(upgradePaths)` 之外的 `qt_K25100`、`ii_K26834`、`oo_K25065` 等外部变量没有进 key —— 上游 react-compiler 的输出，照抄即可，但改代码时要小心。
5. **`ArtifactsDialog` 的 `cuesReserveRows` 与 `isListReady` 组合**：`B_K21183 = cuesHiddenAsks && dialogOpenFlag ? 2 : 0` 与列表高度 `Math.max(3, Math.min(rows - 12 - Pt, 10))` 的扣减基准（13/12）不一致，行数在上/下两处算法不同；`Pt_K30819` 一位是"attachedCount > 0 ? 3 : 0"。
6. **`ConsoleOAuthFlow` 里 `Y_K14022` 是死变量**，同文件 `V_K13834`（loginMethod）与 `ge_K13816`（isGatewayForced）大量重复判断；`forcedGatewayLogin?.url` 与 `forcedLoginMethod === "gateway"` 的顺序会让 gateway 优先于 claudeai/console 的显式设置。
7. **`CustomSelect/selectTypeahead.js` 的 `WindowedText` 复用 `useSelectState` 的返回值**：`optionalValueList` 系列里 `state.value` 与 `state.focusedValue` 语义区分只在部分分支成立（选中值 vs 光标值），个别渲染行两者混用。
8. **`EffortSlider` 的 `schema` 名字**：`planOfferLayout` 的 `chromeWithout`/`chromeWith` 命名实际是"不同布局下的 chrome 高度"，不是"有无"，命名上易误读。

## 产物（均在 `artifacts/tmp/l2c/`）

- `batch01..batch116.jsonl`：每批命名条目
- `d*.txt` / 各批输出：`annotate show` 的渲染原文（只在排查大函数时保留）
- `keys.mjs`、`rembind.mjs`、`rem.mjs`、`overlap.cjs`、`list.cjs`、`conf.mjs`：统计/冲突复核脚本
- `final/`：`top.json` + `final5/locals.jsonl` 与本表合并后的 `locals.jsonl`，用于复核剩余 `_K`
- 最终表：`naming/semantic-l2.jsonl`（7,341 行，含前任 3,421 行 + 本段 3,920 行）
