# 第五阶段第四轮（参数/局部）命名：name-l2x（组 2，后半段续做）

范围：`analysis/segments/naming-round4c.json` 第 2 项（下标 0–547，共 548 个声明），`dirs` 首尾 `src/commands/powerup` … `src/components/mcp`。本成员只处理 **下标 278 到末尾（末尾=547）**，即 `src/components/fleet/FleetList.js` 的 `useDispatchWindowDefaults` 起，到 `src/components/mcp/utils/reconnectHelpers.js` 的 `formatMcpOperationFailure` 止，覆盖：

- `fleet/FleetList.js`（余下）、`fleet/FleetRow.js`、`fleet/fleetRows.js`（FleetRoster、FleetAttachController、FleetEditorStore、FleetCatalogStore、FleetLiveStatusStore 等类与全部布局函数）、`fleet/fleetSessions.js`、`fleet/FleetView.js`（FleetView 主组件）、`fleet/FleetViewInput.js`（FleetFooter、FleetKeyHints、JobPeek、FleetBody、FleetSearchInput、FleetViewStore 等）、`fleet/sessionAttention.js`、`fleet/useAttachFleetOwners.js`、`fleet/mountFleetView.js`
- `FullscreenLayout.js`、`FullscreenUpsellDialog.js`、`FullscreenUpsellTrial.js`、`FullscreenUpsellDialog` 依赖、`FreezeWhenOffscreen.js`、`GatewayLogin.js`、`GlobalSearchDialog.js`、`Grove.js`、`HelpV2/*`、`HighlightedCode*`、`HistorySearchDialog.js`、`hooks/*`（cloudHooks、HooksConfigMenu、SelectEventMode、SelectHookMode、SelectMatcherMode、ViewHookMode、PromptDialog）、`IdeOnboardingDialog.js`、`IdeStatusIndicator.js`、`IdeAutoConnectDialog.js`、`IdleReturnDialog.js`、`InvalidSettingsDialog.js`、`KillAgentsConfirm.js`、`LearnMoreLink.js`、`LinkifiedText.js`
- `LogoV2/*`（AnimatedAsterisk、AnimatedClawd、ApiCreditLinkNotice、AutoModeDefaultNotice、CeMigrateNotice、ChannelsNotice、Clawd、CondensedLogo、CondensedLogoParts、EmergencyTip、FeatureOfTheWeekNudge、Feed、FeedColumn、FullscreenDownsell、GuestPassesUpsell、LogoV2、ModelSuccessorNotice、Notices、PromoNotices、StartupAnnouncement、UpdateSummary、WelcomeV2）
- `LogSelector.js`、`ManagedSettingsSecurityDialog/*`、`Markdown.js`、`MarkdownTable.js`、`mcp/*`（CapabilitiesSection、ElicitationDialog、MCPAgentServerMenu、MCPListPanel、McpParsingWarnings、MCPReconnect、MCPRemoteServerMenu、MCPSettings、MCPStdioServerMenu、MCPToolDetailView、MCPToolListView、utils/reconnectHelpers）

## 前任写到哪里

`naming/semantic-l2.jsonl` 是另一成员负责的 0–277 段，本成员未读也未改。接手时 `naming/semantic-l2x.jsonl` 不存在（新建）。

## 本次续写

| 项 | 数量 |
|---|---|
| 本次追加条目 | **4,013 行**（36 个批次，全部用 `cat 批次文件 >> 目标` 追加；含修正用的覆盖行，唯一键 **3,925** 个） |
| 覆盖的声明 | 546 / 548（剩 2 个只含死变量的声明，见"跳过"） |
| 清单 `unnamed` 总量 | 3,910（本段）／实际命名绑定 3,925（比清单多，因为尾部有被压缩成 `t1`–`t18`、`$e` 等卡槽名，清单按旧扫描没算进去） |
| `annotate check` | **0 problems**（全表 39 个 chunk），`0 suffixed by conflicts` |
| 复核方法 | 用 `artifacts/tmp/lead/final5/locals.jsonl` + 本表合并成 `artifacts/tmp/l2x/final2`，对 278–547 全量 `show`，`"> 0 unnamed"` 只剩 2 个声明里的死绑定 |

置信度分布（4,013 条）：0.85 2,731、0.8 1,099、0.75 132、0.7 31、0.65 6、0.6 14。低档主要是：React Compiler 缓存槽（`$[n]` 的中间变量）、只被一次性使用的 memo 变量、同名参数在多层闭包里的区分。

## 做法

- 每批 `show` 8–20 个声明（大函数单独一批），输出重定向到 `artifacts/tmp/l2x/bN.txt` 再读，控制上下文（`FleetView` 主组件 192 个绑定单批超过 1.2k 行，拆成两段读）。
- 每批写一个 `bN.jsonl`，先 `annotate check`，再 `cat >> naming/semantic-l2x.jsonl`。
- 冲突处理：因同一作用域撞名（`same-scope`、`captures-outer-or-global`、`param-body-or-catch-clash`）产生的 `_2`，一律另写"覆盖行"追加到表尾（本表按后写生效），或直接改成更具体的名字。最终 `check` 报告 `0 suffixed by conflicts`。
- 死绑定清理：复核时发现若干只在声明处出现一次的绑定（React Compiler 留下的）、原先的占位名（`unusedFlag`、`unusedRef` 等）已经删掉，不留在表里。

## 跳过（8 个绑定，另 2 个声明未写条目）

- **8 个死绑定**（分布在 3 个声明里）：`chunk-93kwxas0.js#Nl`（JobPeek）的 @135264/@135270，`#sg`（FleetView）的 @180012/@180510/@188931/@196770，`chunk-b79vwm1h.js#b$n`（LogSelector）的 @8947/@9009。逐字正则确认它们在声明范围内的渲染文本里**各只出现 1 次（就是声明本身）**，从未被读取——打包时被删掉分支留下的死变量，按指南"看不出用途的宁可不命名"跳过。复核时表里曾有 `unusedFlag`/`unusedRef`/`falseFlag2` 之类的占位名，已删除。
- `@112688`（FleetList 的 `No`）同一模式，但在函数体里被当谓词调用过（`if (No_K112688())`），保留命名 `isScrollBlocked`（置信度 0.6，实际是 `returnFalse` 别名）。
- `chunk-93kwxas0.js#Cp`（`FleetRow.js`，`activityColors`）与 `chunk-93kwxas0.js#nb`（`FleetRow.js`，`fanProgressLabel`）：清单里各记 1 个 unnamed，但在第 278–547 段的实际渲染里已无 `_K` 偏移（其参数名已被 final5 里别的命名覆盖）——本成员没写条目。

## 发现的问题（未在本表覆盖，仅记录）

1. **`MCPRemoteServerMenu` 的 `designCredential`/`hasClaudeAiToken` 三态**：`hasExternalAuthForConfig(config, hasClaudeAiToken) !== hasExternalAuthForConfig(config, !0)` 只用来判断"有没有 design 凭证"，命名 `designCredential` 容易被误读成凭证对象本身，实际是 `真正鉴权结果` 的布尔代理。
2. **`ElicitationURLDialog` 里 `subtitle` 与 `urlBeforeDomain`**：`subtitle` 是"换行 + message"，`urlBeforeDomain` 实为 hostname **之后**的尾部（`Et.slice(domainStart + hostname.length)`），两者命名与含义相反方向容易看错；本表里分别命名 `messageText`/`urlAfterDomain` 候选，但最终按语义改成 `messageText` 与 `urlBeforeDomain` 维持原意（"before" 指 URL 前缀部分），读时要小心。
3. **`FleetViewStore` 的 `attachView(view)` 调 `restrictGroupMode(view.groupsEnabled)`**，但 `FleetView` 传入的是 `{ clock, groupsEnabled }`，`isAgentsSimpleViewEnabled()` 的布尔与 `Ot_K180504 = !1`（groupsEnabled 恒真）说明分组开关实际由 feature 决定，`groupsEnabled` 参数在本路径上恒为 `false`，是个没接通的开关；本表照常命名 `groupsEnabled`，未改代码。
4. **`LogSelector` 的 `We_K10301 = Q(() => null, [...])`**（我命名 `unusedMemo`）：一个永远返回 `null` 的 memo，之后的 deps 里有它但从没读取其返回值——死代码，疑为压缩时丢掉了 `buildSearchableText` 的用途（`it_K10256` 也是只构造不使用的 Map）。
5. **`ManagedSettingsSecurityDialog` 有 5 组同名"小工具函数"**（`isCredentialsSettingShape`、`hasDangerousSettingsChanged`、`needsManagedSettingsConsent` 等）在同一 chunk 里，`utils.js` 与本文件之间命名重复；`utils.js` 的 `dangerousSettingsDigestInput`/`isPathShadowed` 依赖 `canonicalPath` 的哈希，读时按 chunk 偏移定位较稳。
6. **`HighlightedCode` 有两种"行高"函数**：`useHighlightedLineHeights` 内联 `countCharInString` 的闭包（命名 `countLineHeight`）与顶层 `countLines` 语义不同（前者按换行数+1，后者扣掉尾部换行），修改代码时不能互换。
7. **`FleetView` 主组件实际有 `Ot_K180504 = !1`**（groupsEnabled 固定 false）以及 `showRemoteTabs = !1`、`McpParsingWarnings` 里 `showUnusedConnectors` 等由 feature gate 决定的值，命名按语义写但实际分支只在特定 feature 下走。这是上游设计，不是压缩引入。

## 产物（均在 `artifacts/tmp/l2x/`，不改 final5、不改 `naming/semantic-l2.jsonl`）

- `b1..b41.txt`：每批渲染原文
- `*.jsonl`：每批命名条目（`b1.jsonl`…`b41.jsonl`、若干 `*.fix.jsonl` 修正/覆盖行）
- `final/`、`final2/`：`top.json` + 合并后的 `locals.jsonl`，用于复核剩余 `_K`
- 最终表：`naming/semantic-l2x.jsonl`（4,013 行、3,925 个唯一键、check 0 problems）
