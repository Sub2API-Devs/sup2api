# 第五阶段第四轮（参数/局部）命名：name-l9x（组 9 后半段）

范围：`analysis/segments/naming-round4c.json` 第 9 项，**下标 894–2102**（后半段，共 1,209 个声明；前半段 0–893 由 name-l9c 负责，写 `naming/semantic-l9.jsonl`）。名字表用 `artifacts/tmp/lead/final5`，结果只写新文件 `naming/semantic-l9x.jsonl`（未碰 `semantic-l9.jsonl`）。

## 覆盖的代码（按阅读树路径，从 `src/services/policyLimits` 到 `src/services/remoteTools`）

- `policyLimits/`（policyVerdicts 尾巴、prefetchToggle、signedCache、startupGate）
- `preventSleep`、`projects/`（briefText、channelApi、channelMemory、contextFile、devIntent、disclosure、folderBrief、projectContext、projectMemory、projectReadRecords、proposalValidation、repoContext、sessionScan、setupProposal\*、threadRows、threadTranscript、toolsUsedSummary）
- `projectsRelay/`（relayConfig、relayGates）、`projectTexts`
- `PromptSuggestion/`（promptSuggestion、backOff、speculation）、`prompts/responsiveModePrompt`
- `promo/promoState`、`prSteward/prStewardLabels`、`pushNotifications/permissionPush`、`queuedNotifications`
- `quotaAutoResume`、`rateLimit/rateLimitWall`、`rateLimitCheckpoint/`（checkpointCommit、checkpointRefs）、`rateLimitContinuation`、`rateLimitMessages`
- `remoteManagedSettings/` 整片（consentRecords、fetchSupport、gatewaySettingsErrors、index、loader、loginNotice、managedSettingsTelemetry、orgConfigGate、remoteSettingsCache、remoteSettingsState、seating、securityCheck、storedLoginSurface、syncCacheState、unvouchedRestrictions）
- `remoteHistory/`（historyEventFilter、historyPrefetch）
- `remoteTools/` 整片（acceptedSettings、attachWait、AwayRecheck、backgroundCommands、callOutcome、callProgress、commandRendering、deviceSyncFiles、deviceToolNames、dirSync、hostRefusals、launchLocation、machinesPrompt、mountSafety、pathMapping、registerToolHosts、remoteAskSeat、remoteDirectoryList、remoteFileRead、remoteToolAdmission、remoteToolCall、remoteToolExecutor、remoteToolPermissions、remoteToolResult、remoteToolRouting、remoteToolsDebug、resultConversion、returnToolOutput、runPluginHook、servedAnswerSize、servingErrors、servingGates、sessionRulesRendering、shellForwarding、targetMessages、toolHostAttestation、transportMessages、turnHandoffFiles、unattendedConsentStore、unattendedRunGrant、unattendedServingConsent、windowsPathSafety、windowsProfileDirs）

## 结果

| 项 | 数量 |
|---|---|
| 接手时 `naming/semantic-l9x.jsonl` | 不存在（新文件） |
| 本段声明数 | 1,209（下标 894–2102） |
| 清单 `unnamed` 合计（894 起） | 3,994 |
| 用 final5 重算的压缩绑定 | 4,035（差异见下"口径"） |
| 本次写入行数 | 4,084（追加式；其中 49 行是对同一 `(file,key)` 的改名重写，见下） |
| 唯一键 | 4,035（与重算数一致，**全部覆盖**） |
| `annotate check naming/semantic-l9x.jsonl` | 0 problems，0 suffixed by conflicts（65 个 chunk） |
| 覆盖复核 | final5 + 本表合并后重算，本范围剩余 `_K` 偏移 **0** |

置信度分布（4,084 行）：0.85 共 3,098、0.8 共 881、0.75 54、≤0.7 51。低置信度主要是死变量/未被读取的占位参数、React 编译缓存槽、以及只有字符串拼接的局部。

**口径差异**：清单的 `unnamed`（3,994）是 `tools/verify/readability.mjs` 逐条统计的出现次数口径，且排除了部分不可命名绑定；用 `bindingsOf` + final5 重算的声明内压缩绑定为 4,035（含少数只在声明位置、无引用的参数）。两者不是同一集合，后者才是 `annotate check` 实际认的键，本表按后者做完整覆盖。

## 做法

- 每批 `show ... 9 <from> 30 artifacts/tmp/lead/final5`，读完一批 `cat 批次 >> naming/semantic-l9x.jsonl`；批次文件在 `artifacts/tmp/l9x/bNNN.jsonl`，共约 160 批。
- 每批写完跑 `check`，有冲突时用前缀二分（逐行前缀跑 `check` 看 `1 suffixed by conflicts`）定位冲突行并改成更具体的名字。
- 每约 2,000 行全表 `check` 一次；最后全表 4,084 行 0 problems。
- 收尾时写两个临时脚本做覆盖复核：
  - `artifacts/tmp/l9x/list.mjs`：用 final5 + 本表重建每个 chunk，按声明区间列出仍为 `_K` 的绑定（最终 0）；
  - `artifacts/tmp/l9x/audit.mjs`：初始压缩绑定 4,035 个、本表落在这些声明区间内的唯一键 4,035 个、越界 0 个。

## 改名重写（同一键多次出现）

追加式写入时改名会留下旧行，后写的生效（`check` 按行序覆盖）。共 46 个键出现两次以上（45 个两次、1 个三次：`chunk-9tyqgtn4.js@21132` `content → fileText → readBack`），最后都能过 `check` 且无 `_2` 撞名。典型：`limits → statusLimits`、`job → createdJob`、`step → queuedStep`、`index → lineIndex`、`askLapseMs → lapseMs`、`syncedFolder → folderPath`、`fileTools → servedFileTools`。

## 跳过

- 没有整段跳过的声明；`unnamed=1/2` 的小声明也全部读完。
- 例外是 5 个**死变量/占位参数**，按"看不出用途就不硬编故事"处理，用 `unused*` 标出（confidence 0.6–0.7）：`chunk-s1zey0a9.js@3212`、`chunk-4pc1m5n9.js@38423/38428`、`chunk-mdb2vxrz.js@9004`、`chunk-qmsrnapp.js@46036`。

## 发现的问题（未在本表覆盖，仅记录）

1. **既有错名**：`chunk-3y22eg7d.js`（quotaAutoResume）的 `handleTurnCompletedAtLimit(x, terminalReason, limits = Date.now(), storageV5)` —— 第三个参数叫 `limits`，实际是毫秒时间戳（往下传给 `autoArmQuotaAutoResume` 的 `nowMs`）。`chunk-fm6h4dv7.js` 里同族函数的对应参数叫 `nowMs`，建议统一改名。
2. **永不成立的分支**：`chunk-4pc1m5n9.js#Ot`（`fetchAndLoadRemoteManagedSettings`）里 `hybridOrganizationUuid` 初值 `null` 后从未重新赋值，函数内所有 `=== null` 判断恒真，hybrid 组织那整条路径（`checkAndRefreshOAuthTokenIfNeededWithOutcome` 之后的一串 `revision`）在本版本不可达。同函数还有 `let m = null, w = null` 两个立即被覆盖的占位局部。
3. **重复调用**：`chunk-e2fknt7w.js#J6`（`remoteToolServingOffReason`）先 `let mountUnreadable = isWslMountInfoUnreadable()`，随后又写 `if (mountUnreadable || isWslMountInfoUnreadable())`，第二次调用冗余。
4. **疑似逻辑问题**：`chunk-qmsrnapp.js#yo`（`machineLine`）把"非主机器"的 copyMode 固定传 `"unknown"` 给 `machineDetailText`，于是除主机器外的每台机器都按 `unknown` 模板描述，而不是按 `description.project_sync`；`copyMode` 在这是每台机器自己的同步模式，按设计应逐机器取。
5. **结构/命名提示**：`chunk-qmsrnapp.js`（machinesPrompt）里 `machine.notes` 与 `machine.limits` 一类**文本**走了 `displayDir_2`/`displayMachineName` 这类"路径/名字清洗"辅助函数；`thisEnvironmentLine` 里有一段 `if (!1) switch (copyCleared) {...}` 的死分支（只剩 `switch (copyMode)`）。这是重建时把多个同名小清洗函数合并成一个后留下的痕迹，读时不要按名字理解。
6. **同文件跨 chunk**：`src/services/remoteTools/` 里 `remoteToolCall.js`/`remoteToolExecutor.js` 同属 `chunk-dtv8x2hx.js`，而 `remoteToolPermissions.js` 也在同一个 chunk；但 `machinesPrompt`、`transportMessages`、`targetMessages`、`resultConversion` 全在 `chunk-qmsrnapp.js`，`windowsProfileDirs`/`mountSafety`/`servingGates` 在 `chunk-e2fknt7w.js`。按文件路径搜只会命中重建后的路径，排查时按 chunk 搜更准。
7. **极长函数**：`chunk-6j594vm1.js#ILs`（`createPermissionAsker`，47 个压缩绑定）、`chunk-4pc1m5n9.js#Ot`（28）、`chunk-qmsrnapp.js#po`（16）、`chunk-dtv8x2hx.js#tr`（10）压缩名多为单字母闭包套闭包，命名时只能靠字段名与调用点反推；这几个函数的可读性仍以结构为主，变量名帮助有限。

## 产物（`artifacts/tmp/l9x/`）

- `bNNN.jsonl`：每批命名条目（`cat >>` 追加用）。
- `list.mjs` / `audit.mjs` / `stats2.mjs`：覆盖复核（剩余 `_K`、初始绑定数与越界检查）。
- `final/`：final5 + 本表合并后的临时 `top.json`/`locals.jsonl`，仅用于复核，不改 `artifacts/tmp/lead/final5`（复核后已重建）。
