# fixer：领域建议落地（放置修正 + 命名冲突裁决）

日期 2026-11-03。角色 fixer。我做了三件事：

- 把十个领域过程文档里"给 lead 的建议"变成机器可读的修正表。
- 裁决 `naming/semantic-*.jsonl` 之间的命名冲突。
- 补上领域没写进 semantic 的旧版名错配。

## 1. 交付物

| 文件 | 内容 |
|---|---|
| `naming/placement-zz-fixes.json` | 1,728 条放置修正 `{decl id: 目标路径}`。文件名排序在所有 placement 之后，同 id 时覆盖放置成员 |
| `naming/semantic-zz-fixes.jsonl` | 175 条命名修正。其中 139 条是跨文件冲突裁决（置信度 0.97），36 条是旧版名错配修正（领域给了名字的 0.97，我按代码起名的 0.9） |
| `artifacts/tmp/fixer/` | 全部脚本与中间结果，见第 2 节 |

`placement-zz-fixes.json` 已用 `validate.mjs` 校验，结果 OK：

- 每个键都是 `analysis/scan/decls.jsonl` 里存在的声明 id。
- 没有键的当前路径以 `_unattributed/` 开头。
- 目标路径合法：有扩展名，不含 `_unattributed/` 或 `_new/`。
- 没有空操作（目标等于当前路径）。

1,728 条按当前归属分：

- 883 条当前是已归属的 first-party 声明。
- 845 条当前在 `_new/` 门面模块。这些来自整模块搬迁和整段搬迁，是领域成员核对过导出的 `_new` 模块，属于"已有 owner、路径错"。

我没有跑 `tools/segment/segment.mjs`。

g2 在 08:27 交付了 `placement-g2.json`。下面的数字都是纳入 g2 之后重跑的结果。

## 2. 方法与重跑

建议的抽取和裁决都脚本化了，放置成员（特别是还没交付的 g2）更新后可以直接重跑：

```
node artifacts/tmp/fixer/extract.mjs --extra
node --max-old-space-size=8000 artifacts/tmp/fixer/propose.mjs
node --max-old-space-size=8000 artifacts/tmp/fixer/decide.mjs analysis --write
node --max-old-space-size=8000 artifacts/tmp/fixer/validate.mjs
node artifacts/tmp/fixer/conflicts.mjs && node artifacts/tmp/fixer/conflict-rulings.mjs
node --max-old-space-size=8000 artifacts/tmp/fixer/write-semantic.mjs
```

注意：`decide.mjs` 第一个参数必须是 `analysis`。原因是 `tools/segment/domains.mjs` 把 argv[2] 当分析目录读，直接传 `--write` 会报错。

各脚本的作用：

- **extract.mjs**：读取各领域文档"给 lead 的建议"一节（行号范围写在脚本里），以及 `artifacts/tmp/state/notes-*.md`、agents 的 lead-a1/a2、extensions 的 lead-suggestions。逐条解析成 `bullets.jsonl`，共 1,088 条、2,672 个声明引用。
  - "旧版名配错…："小标题下的条目、tools shell 组的 `` `id` = 旧名 → 新名 `` 格式，都识别为改名，不当搬迁。
- **propose.mjs**：给每个引用判定意图，写入 `proposals.jsonl`。意图包括：明确路径 / 目录 / 只说"不属于" / 第三方 / 已在正确位置 / 只改名 / 保留。
  - 目标路径优先取"应归 / 归 / →"后面的那个。
  - "不是 X / 不属于 X / 移出 X"里的 X 不当目标。
- **decide.mjs**：合成最终表。优先级从低到高：
  - 整模块清理（PURGES）；
  - 只说归错 → 推断去处：两侧邻居同模块、邻居且有引用边、唯一调用方；
  - 领域明确路径；
  - 整模块搬迁（MODULE_MOVES）；
  - 整段搬迁（RANGE_MOVES）；
  - 人工裁决 `decisions.tsv`（225 条，逐条写了理由）。
- **过期判断**：领域成员写建议之后，lead 重做过切分。如果一条只说"归错"的建议，在条目文本里既提不到声明的当前路径（或文件名），声明也不在该领域的路径前缀里，就判为过期、不输出。领域明确给了目标路径的不受这条限制。
- **放置成员优先**：声明当前在 `_new/`，而且 `placement-g*.json` 已经放过，就交给放置成员（DEFER），除非是我做的整模块或整段搬迁。
- **第三方保护**：当前 kind 是 vendor 的声明，没有人工裁决就不往 first-party 路径搬。

辅助脚本：

- `peek.mjs`、`peekoff.mjs`、`names-of.mjs`、`runs.mjs`、`offs.mjs`：看代码、调用方、各命名表候选。
- `renames.mjs`、`legacy-scan.mjs`：查旧版名错配是否已被 semantic 覆盖。
- `stats.mjs`：统计第 3 节的数字。

## 3. 各领域统计

口径：按"领域 × 声明"去重，一个声明被多个领域提到时各算一次。

| 列 | 含义 |
|---|---|
| 采纳 | 写进 zz，目标是正式路径或 vendor |
| 无法裁决 | 确认归错但去处不明，写成 `_misplaced/<原路径>` |
| 驳回 | 过期、人工驳回、当前已正确、vendor 保护 |
| 交放置成员 | DEFER |
| 不涉及放置 | 只改名、已在正确位置、第三方已归 vendor、只是证据描述或没有箭头、保留 |

| 领域 | 采纳 | 无法裁决 | 驳回（过期 / 人工 / 其他） | 交放置成员 | 不涉及放置 |
|---|---|---|---|---|---|
| agents | 39 | 1 | 15（13 / 2 / 0） | 0 | 33 |
| bootstrap | 34 | 1 | 2（2 / 0 / 0） | 1 | 38 |
| commands | 24 | 0 | 0 | 0 | 12 |
| extensions | 111 | 0 | 30（27 / 3 / 0） | 3 | 63 |
| ink | 75 | 0 | 25（20 / 5 / 0） | 2 | 79 |
| permissions | 44 | 2 | 10（6 / 4 / 0） | 0 | 47 |
| state | 44 | 0 | 7（5 / 2 / 0） | 2 | 70 |
| tools | 145 | 3 | 50（10 / 40 / 0） | 1 | 62 |
| ui | 3 | 0 | 1（1 / 0 / 0） | 0 | 12 |
| query | 117 | 6 | 14（10 / 4 / 0） | 1 | 56 |

领域建议之外由我补全的部分：

| 来源 | 采纳 | 无法裁决 | 驳回 |
|---|---|---|---|
| 整模块搬迁 | 772 | 0 | 0 |
| 整段搬迁 | 232 | 0 | 0 |
| 整模块清理（未被领域单独点名的成员） | 31 | 2 | 0 |
| bootstrap 附带清单 state-foreign.txt | 11 | 0 | 0 |
| ui 附带清单 suspects.tsv | 38 | 0 | 12 |
| 只在人工裁决里出现 | 5 | 0 | 0 |

整模块搬迁和整段搬迁本身也出自领域建议，只是按模块或字节区间整体执行。

## 4. 驳回原因

1. **过期（93 条）**：切分重做后，被投诉的声明已经不在原模块里。
   - 典型例子：extensions 说的 `utils/plugins/zipCache.ts` 系列、ink 说的 `keybindings/*` 撞名，现在都已落到别处。
   - 按领域分：agents 13、bootstrap 2、extensions 27、ink 20、permissions 6、tools 9、state 5、ui 1、query 10。
2. **当前已在正确位置**。例如：
   - astf3mhy `#as`、`#Ss` 已在 SendMessageTool.ts；
   - r01896cg `#St`、`#Cn`、`#Bt` 已在 ast.ts；
   - fq0cr76a `#For`、`#VFi`、`#bH` 已在 pathValidation.ts；
   - 82kqcve8 `#Jl` 已在 plans.ts；
   - aepeg2w5 `#NT` 已在 utils/auth.ts；
   - bzr73sfg `#SR`、`#MR` 已在 render-node-to-output.ts；
   - x1mwqya5 `#sn` 已在 validate.ts；
   - yt6zn9vg `#ct` 已在 insights.ts。
3. **只是改名，不改归属**（tools 40 条人工驳回的主体）：
   - tools shell 组 19 个：e6aww6q8 的 DVn、SDo、mM、RDo…；63f0f3kd#Sr；fnhsh6ng#H；m79qv8gp#ce；82kqcve8#ud。
   - tools agent 组：nw7jbebs 互换的 GVt、KVt，以及 Vxo、USt、d5s、Y2n、slugifyForkName。
   - query 的 Sdo、eqo、Yxr；extensions 的 KGt、cWo；state 的 van、cgr0tezp#t。
   - 这些名字已由领域 semantic 或门面覆盖。
4. **领域说法与代码或放置成员不符**：
   - wbbfk060#Ir：它就是真正的 isConnectionError，留在 bridgeMain。解析器把后半句的目标误套在它身上。
   - s61vbvea `#pB`、`#OKt`、`#Ql`：属于 PR/分支发布跟踪，现位置 gitOperationTracking.ts 合理。
   - ha3km179 `#md`、`#gd`：放置成员已把同段的 fd 放进 utils/tasks.ts，三者是同一清单解析段。
   - aepeg2w5#Bw：放置成员已放进 planModeModel.ts。
   - 0zzdrwpn#Zht：extensions 自己说保持原位，只改名。
5. **vendor 保护**：领域点名的第三方代码，大多已在 decl-path 里是 vendor kind，不需要动（"不涉及放置"列里的 vendor-done）。例外：rshven70#S 是 bun runtime，kind 是 runtime，也不动。
6. **ui suspects 推断不出去处的 12 条不动**：它们只是 fingerprint 共享的克隆嫌疑，ui 成员自己也没确认归错，不送进 `_misplaced`。例如 xkeryp4t#en formatFileSize 留在 utils/format.ts 是对的。
   - 清单：ag5x7vhf#km、18hwfzwa#$J、wj577vf9#Lt、18hwfzwa#kz、0vxm8afm#dxt、11065byw#l、18hwfzwa#FHt、18hwfzwa#c5e、25sm7c4g#pe、18hwfzwa#OQ、bzr73sfg#sf、xkeryp4t#en。

## 5. 放置：跨领域矛盾与覆盖放置成员的裁决

- **aepeg2w5#exn**：bootstrap 说归 mcp/config 或 claudeInChrome，extensions 说归远程浏览器权限模块。
  - 代码：判断 `name===vy`、dynamic scope，并调用 ZRn（`/v2/ccr-sessions/<id>/remote-browser/mcp`）。
  - 裁决：采纳 extensions。exn 与 gz7b768t uJ/SH/hwn、aepeg2w5#ZRn 一起归 `utils/permissions/remoteBrowser.ts`。
- **`_new/readTranscriptForLoad.ts`**：agents 说归 sessionStorage.ts，state 说归 sessionStoragePortable.ts。
  - 门面导出 LITE_READ_BUF_SIZE、validateUuid、extractJsonStringField、readHeadAndTail、readTranscriptForLoad，与 2.1.88 的 sessionStoragePortable.ts 一致。
  - 裁决：采纳 state。
- **覆盖放置成员的四个整模块搬迁**：都是领域成员按 2.1.88 导出核对过的。
  - `_new/VARIADIC_VALUE_FLAGS.ts` → `utils/cliArgs.ts`（放置成员给的是 cli/eagerFlags.ts）。eagerParseCliFlag 是旧版 cliArgs.ts 的导出。
  - `_new/isDeferredToolInConversation.ts` → `tools/ToolSearchTool/prompt.ts`（放置成员给的是 deferredTools.ts）。isDeferredTool、formatDeferredToolLine、getPrompt 是旧版 prompt.ts 的导出。
  - `_new/shouldAllowManagedHooksOnlyByPolicy.ts` → `utils/hooks/hooksConfigSnapshot.ts`（放置成员给的是 hooksPolicy.ts）。
  - `_new/initAgentProxy.ts` → `upstreamproxy/upstreamproxy.ts`（g6 给的是 upstreamproxy/agentProxy.ts）。依据：bootstrap 5.1 指出 SESSION_TOKEN_PATH 与旧版 upstreamproxy.ts 同名，init/getEnv 只是改名为 AgentProxy。如果 lead 更想要新文件名，删掉 decide.mjs 里这一行重跑即可。
- **其余 12 个整模块搬迁**：exec→Shell.ts、SandboxManager→sandbox-adapter.ts、decideWithToolCheckHooks→permissions.ts、INLINE_CODE_FLAGS→types/permissions.ts、extractOutputRedirections→bash/commands.ts、flushAnalyticsBeforeExit→cli/exit.ts、RemoteIO→cli/remoteIO.ts、iterateStreamUntilClose→utils/process.ts、createMCPServer→entrypoints/mcp.ts、RESOURCE_EXHAUSTION_CODES→utils/errors.ts、eraseViewportInPlace→ink/clearTerminal.ts。
- **整段搬迁**：
  - chunk-3s7ydtfd 的图表代码：ui、ink、tools 三方分别把它说成 ElicitationDialog、ink/screen、EnterPlanModeTool/UI、buddy。我读代码后统一判为 easel 图表插件，按字节区间分到 easel 的 chartSchema、timeFormat、parseValues、readTable、renderChart、chartSvg。
  - chunk-2nmyajw8 768–3234 → `components/design-system/Table.tsx`。
  - chunk-2rkp9ne9 整段（58 + 6 + 1 个声明）→ `tools/ProposeSkillsTool/ProposeSkillsTool.ts`。tools 和 ui 都指出它是 propose_skills；Ee 就是 ProposeSkillsTool。
  - chunk-b0a246e7 1216–6636：agents 指出它不是 cronTasks。按内容拆为：
    - presence.ts（qBt…S$r）；
    - commentsGate.ts（h_e、jzs，tengu_teal_corbel）；
    - commentState.ts（_e…FLo）；
    - JBt 并入右邻的 commentMentions.ts。
- **bootstrap 的 EEt、Pfe** → cost-tracker.ts（2.1.88 的 saveCurrentSessionCosts 和 restoreCostStateForSession 就在这里），不并入 state.ts。
- **3rwvzn82#Pe** → components/EffortSlider.tsx。解析器原本取到了 utils/config.ts；实际唯一调用方和两侧邻居都是 EffortSlider。
- **a16kyqj3 e、u、o** → vendor lodash-es（`_getRawTag.js`）。整个 chunk 是 lodash-es 的 `_root`、`_Symbol`、`_getRawTag`、`_objectToString`、`_baseGetTag`，原先被 MagicDocs 误收。同 chunk 其余声明还是 unattributed，建议 lead 用 vendor 识别补齐。

## 6. 整模块清理

模块里的声明全部视为归错，能推断去处的给去处，推断不出的进 `_misplaced/`：

- `buddy/`
- `tools/ConfigTool/*`
- `services/SessionMemory/`
- `services/MagicDocs/`
- `services/teamMemorySync/{index,types,watcher}.ts`
- `services/preventSleep.ts`
- `costHook.ts`
- `query/tokenBudget.ts`
- `utils/cronTasks.ts`（限 chunk-b0a246e7）
- `keybindings/reservedShortcuts.ts`（保留 6qssfmzs J5e、X5e、v、y）
- `tools/EnterPlanModeTool/UI.tsx`（限 chunk-3s7ydtfd）

`services/teamMemorySync/secretScanner.ts` 不在清理范围：cgr0tezp 的密钥扫描代码确实在那里。

## 7. `_misplaced` 清单（15 个声明，确认归错、去处不明）

纳入 g2 之前有 41 个。g2 交付后，26 个能从邻居推断出去处，剩下 15 个。

这些剩下的大多有两种情况：

- 邻居是 `_new/` 门面模块（in-unplaced-run），要等 lead 给门面模块定名后才能并入；
- 调用方分散。

| 原路径 | 声明 |
|---|---|
| bootstrap/state.ts | 0089hrfm#P（邻居 `_new/planSegmentState`） |
| buddy/sprites.ts | 6ht21p2a#En |
| context/notifications.tsx | dwh5z7zb#dxs（query：启动公告模块，与 ADe、lxs 同文件，但 ADe 尚未放置） |
| costHook.ts | 0kp6eg01#gn（邻居 `_new/validateExplicitMessagingSocketPath`） |
| services/SessionMemory/sessionMemory.ts | 0089hrfm#x（邻居 `_new/planSegmentState`） |
| services/api/errorUtils.ts | 7t4fmt2f#ai、#di、#li（两侧是 policyLimits；旧版 errorUtils 有 SSL 错误码集合，仍存疑） |
| services/claudeAiLimits.ts | 5x106wnr#y（邻居 `_new/primeSettings`） |
| tools/NotebookEditTool/UI.tsx | ah34pb7m#rr |
| tools/WebSearchTool/UI.tsx | vrb44rx7#Ol |
| tools/shared/gitOperationTracking.ts | gfa3ceg6#et（tools：git 配置键白名单；邻居是 `_new/buildWorkspaceDiffResponse`） |
| utils/permissions/PermissionPromptToolResultSchema.ts | hgrqcyvx#nqn |
| utils/secureStorage/fallbackStorage.ts | 4r745zza#A（邻居 `_new/apply3PDefaultFallbacks`） |
| utils/swarm/backends/detection.ts | 1de6ar4n#Zje（调用方分散） |

**0wdgqhcf 的 zn、On**（tools 和 extensions 的矛盾）：

- tools 说它们属于 Chrome native host，extensions 说属于 ConfigTool 的调用方一侧。
- g2 放置后可以裁决：左邻是 services/artifacts/publishReadChecks.ts，右侧 Ar、Ct 在 tools/ArtifactTool/actions/database.ts，唯一外部调用方也是 database.ts#QHs。代码拼的是 artifact 数据库目录下的 `<id>.json` 路径。
- 两者都归 `tools/ArtifactTool/actions/database.ts`。两个领域的说法都不成立。

## 8. 命名冲突裁决（139 条，全部跨文件）

扫描范围是全部 `naming/semantic-*.jsonl`（不含 zz），条件是同一 file + key 名字不同。

冲突主要出在领域文件和放置成员文件之间：

- p3/state 37、ink/p3 22、extensions/p3 18、agents/p3 10、bootstrap/p3 8、p5/state 6、p3/permissions 5；
- 领域之间：query/tools 5、query/state 3、state/tools 3、extensions/tools 3、bootstrap/extensions 2、extensions/permissions 1、extensions/ui 1、commands/state 1；
- 其余零星。

裁决结果按采用的来源计：

| 来源 | 条数 |
|---|---|
| p3 | 36 |
| ink | 21 |
| extensions | 21 |
| state | 20 |
| tools | 10 |
| agents | 9 |
| p5 | 5 |
| query | 5 |
| bootstrap | 3 |
| permissions | 3 |
| ui | 2 |
| commands | 1 |
| 新名 | 3 |

裁决原则：

1. 2.1.88 有同名的取同名，例如 buildMcpToolName、getToolNameForPermissionCheck、McpStdioServerConfigSchema、META_KEY_CODE_RE、BLACK_CIRCLE。
2. 与代码行为对不上的弃用：
   - lE、Mp 是 win32-input-mode（CSI … `_`），不是 kitty；
   - cgr0tezp Mt、Lr 是 Unicode 组合类重排，不是易混淆字符；
   - C3 只 `return ""`，不是 getBuildInfo；
   - vzo 返回布尔，不是取 id。
3. 同义时优先与模块名、同组命名一致，取值函数用 get 前缀。
4. `_N` 后缀和放置成员按位置起的名（如 filledRow）让位于描述性名字。

每条的理由都写在 note 里。

lead 点名的两组冲突：

- **extensions 的 7 条**：
  - byeye1yp：`@206` 定为 isStorageV5Enabled，`@233` 定为 pinStorageV5Flag。tengu_hover_rest 只是灰度代号，调用方用它选存储后端，配套函数由 adoptStorageV5EnvPin 调用。
  - 8t8n4kdh：`@78180` 定为 isSessionHandshakeMethod，`@78237` 定为 classifyMcpRpcErrorCode，`@78429` 定为 classifyMcpConnectError，这三条采用 tools 的名字；`@29819` 定为 writeDiscoverVerdicts。
  - dcmhvw5a：`@71749` 定为 isClaudeAiProxyServer。
- **query 的 8 条**：

  | 冲突对 | 采用 | 理由 |
  |---|---|---|
  | query/state getToolUseIdsFromBlocks | isToolUseRequestMessage（query） | 函数返回布尔 |
  | query/state countToolCalls | countNamedToolUses（state） | 只统计指定名字的工具调用 |
  | query/state isManagedSettingSource | isReadOnlySettingSource（state） | flagSettings 不是托管来源，两者共同点是只读 |
  | query/tools canAutoApproveWebFetchDispatch | tryAutoApproveWebFetchDispatch（query） | 检查通过后会登记批准，有副作用 |
  | query/tools markUnreviewedWebFetchDispatch | markWebFetchDispatchApproved（新名） | 两边各缺一半语义 |
  | query/tools computeToolDefinitionHash | getToolListingHash（query） | 调用方把结果存为 listing 字段 |
  | query/tools INHERIT_MODEL_CHOICE / DEFAULT_MODEL_CHOICE | INHERIT_EFFORT_SETTING / DEFAULT_EFFORT_SETTING（query） | 在 utils/effort.ts，与 level 构造器组成 effort 三态 |

另外两个新名：

- findPemBlocks：两个候选都是布尔名，但函数返回区间数组。
- compileSecretRules：与 compileDisplayRules 成对。

## 9. 旧版名错配修正（36 条，semantic 原先未覆盖）

扫描方法：找出所有提到"旧版名、配错、错配、误配、互换"的建议，检查对应声明在 semantic 和门面里有没有名字。没有名字、当前名字来自 reference 且是错的，就补上。

- **领域给了新名的**（0.97）：
  - createAttachmentMessage：e6aww6q8#sn，原名 logForDebugging。
  - parsePluginIdentifier：dcmhvw5a#Nn，原名 isChannelAllowlisted，取 2.1.88 同名。
  - 其余：addAgentKeepaliveReason、hasOwnMcpKey、redactHeaders、isRemoteBrowserHttpConfig、getProjectPathForScope、resetProjectSkillDirectories、getDeviceKeysFilePath。
- **领域只说"配错"、我按代码起名的**（0.9）：
  - 权限与 classifier：resolveAvailablePermissionMode、isClassifierDecision。
  - 其他工具函数：getMcpTransportTelemetryLabel、getChromePermissionMode、filterUnapprovedMcpServers、mergeManagedSettingsPaths、isPlainPushToOrigin、hasTaskBackgroundKeybindingConflict、getLatestAgentReportText、isKnownProxyEndpointUrl、isWithinSanitizeBudget、isConnectedOrCached。
  - zipCache 系列中 fingerprint 共享的 rm -rf 小函数，共 11 个。
  - 其余 4 个：buildSelfStdioServerConfig、matchesWildcardPattern、countByPluginKey、formatOperationFailure。

以下几条已被领域 semantic 覆盖，不重复写：

- Vim 的 530hfzwb `#Q`、`#Z` 互换已由 semantic-ink 覆盖。semantic 优先级高于 reference，所以已经生效。
- commands 的 e6aww6q8#EA addCommandSpellings。
- agents 的 1qpz7qcd#__i（p1 已给出 handleReplBridgeControlRequest）。

## 10. 遗留问题

1. **g2 已于 08:27 交付，本表已纳入**。其他放置组以后再改的话，按第 2 节重跑即可，decide.mjs 会自动参考新的放置结果。
   - 剩下的 `_misplaced` 多数邻接 `_new/` 门面模块，等 lead 给门面定名后再跑一次就能落地。
2. **命名优先级的限制**：resolve.mjs 的优先级是 facade > semantic，所以门面名本身错的话，semantic-zz 改不了。这次没发现这种情况，但以后遇到要改 facade 来源或 resolve 规则。
3. **tools 的 `naming/_semantic-tools-lowconf.jsonl` 不会被加载**：文件名不匹配 `semantic-*.jsonl`。我从中采纳了 6 个名字进 zz，其余低置信名字要不要启用由 lead 决定。
4. **fingerprint 共享误配还剩不少没起名**（当前名字来自 reference，是错的）：
   - extensions"其他误配"：kgh2tnx9#oe、6j594vm1#Ggt、rbe666af#fU、rbwn7je9#G、1kaj6e83#ve；
   - f3qhjfah#sn、sfy7bm1n#Dvn；
   - x4gcvpxy#dOs（原名 detectHomebrew，代码是 macOS 后台 TCC 处理）；
   - 7904g3ks#C；
   - ae5g0zb5#Ku（原名 isSyntheticOutputToolEnabled，疑似错配）；
   - e6aww6q8#_je。

   它们没有领域给的名字，代码意图我也不够确定，这次没写。
5. **93 条过期建议没有核实**：原模块里可能还有新的错归，需要各领域按新切分复核。
6. **`_misplaced/` 前缀的 kind 是 unattributed**，lead 统计未归属时会把它们算进去。
7. **chunk-a16kyqj3 的其余部分**仍是 unattributed，应整体归入 vendor lodash-es。
8. **7t4fmt2f 的 ai、di、li** 暂放 `_misplaced`：两侧是 policyLimits，但旧版 errorUtils 确实有 SSL 错误码集合，需要再看调用方。

## 第二轮（第四阶段命名成员 r0…r9 的"发现的问题"）

日期 2026-11-03。输入是 `docs/process/naming-r0.md` … `naming-r9.md` 的"发现的问题"节。每一处都用 `artifacts/tmp/fixer/r2look.mjs` 核对过：当前归属取自 `analysis/segments/decl-path.jsonl`，名字取自 `naming/final/top.json`，另看调用方、被调方、chunk 左右邻居和代码片段。

### 交付

| 文件 | 本轮改动 |
|---|---|
| `naming/placement-zz-fixes.json` | 追加 230 条，现共 1,957 条。第一轮条目都保留；同 id 只有 1 条被本轮覆盖 |
| `naming/semantic-zz-fixes.jsonl` | 追加 12 条名字修正，现共 187 条。前 175 条与第一轮逐字节相同 |
| `naming/docs-zz-fixes.jsonl` | 新建，12 条改正后的说明 |
| `artifacts/tmp/fixer/` | 裁决表 `r2-decisions.tsv`、展开结果 `r2-applied.tsv`、`r2-names.tsv`；脚本 `r2-apply.mjs`、`r2-docs.mjs`、`r2look.mjs`；第一轮快照 `*.round1.json(l)` |

重跑：

```
node --max-old-space-size=8000 artifacts/tmp/fixer/r2-apply.mjs --write
node --max-old-space-size=8000 artifacts/tmp/fixer/write-semantic.mjs
node artifacts/tmp/fixer/r2-docs.mjs
```

### 校验结果

- **放置**：`validate.mjs` 检查全部 1,957 条。键都存在，路径都合法，没有 vendor 声明被搬回 first-party。其中 1,708 条已经是"目标等于当前路径"：第一轮的修正 lead 已经按 zz 重新切分生效。
- **名字**：187 条的 key 都指向标识符起点，本轮 12 条与 `top.json` 的绑定位置逐一对上。

修了一个旧缺陷：`write-semantic.mjs` 找名字的位置原来用 `indexOf`。它会在 "function" 里匹配到 `cti` 这类短名，现改为整词匹配。第一轮 175 条的 key 不受影响，已确认逐字节相同。

### 放置：采纳 230 个声明

| 成员 | r0 | r1 | r2 | r3 | r4 | r5 | r6 | r7 | r8 | r9 |
|---|---|---|---|---|---|---|---|---|---|---|
| 采纳声明数 | 14 | 30 | 24 | 14 | 13 | 31 | 24 | 37 | 20 | 23 |
| 驳回声明数 | 0 | 8 | 3 | 2 | 1 | 16 | 7 | 13 | 3 | 8 |

采纳依据（每条理由写在 `r2-decisions.tsv`）：

- 唯一调用方所在模块；
- chunk 两侧邻居同属一个模块（Bun 按语句连续切分）；
- 代码里的字符串与 schema 能说明用途；
- lodash 实现逐行一致。

整段或整模块处理的几处：

| 对象 | 去向 | 依据 |
|---|---|---|
| `tools/AgentTool/built-in/verificationAgent.ts`（整模块，2 个声明） | `tools/AgentTool/built-in/webFetchAgent.ts` | 内容是 web-fetch 内建代理定义和它的系统提示 |
| `utils/plugins/publishedCatalogFloor.ts`（整模块） | `utils/model/modelCatalog/publishedCatalogFloor.ts` | 内容是模型目录下限 |
| chunk-mvvq2nx1 5350–7285 | `utils/imageResizer.ts` | 图片解码与缩放管线。r2 只点了 7 个，同段的私有辅助一起搬；前半段才是图片错误文案 |
| chunk-y6fv30yg 2554–5539（ConfirmStep 段） | `components/vertexSetup/VertexSetupWizard.tsx` | `oe` 的唯一调用方是 VertexSetupWizard，`_e` 构造 Vertex 设置 |
| chunk-x5e9ztk0 6572–8000 | `tools/MemoryTool/UI.tsx` | 这 8 个声明都渲染 Memory 工具结果，不是 PowerShell |
| chunk-dz3q485w 在 `services/projects/projectMemory.ts` 的 9 个声明 | `services/projects/channelMemory.ts` | 频道记忆 API。同文件的 claude.ai 项目 API 来自 chunk-j0nnxep0，不是一套 |

第三方代码进 vendor 的有 13 个：

- lodash-es 内部函数：safeGet、baseMerge、isIterateeCall、createAssigner、baseAssignValue、baseKeysIn、baseSet、basePickBy、baseZipObject；
- lodash-es 公开函数：isEmpty、clamp、pickBy；
- 内联的 countBy。

新建的 17 个文件：

- `tools/AgentTool/built-in/webFetchAgent.ts`、`tools/EnterWorktreeTool/UI.tsx`、`tools/ListMcpResourcesTool/UI.tsx`、`tools/MemoryTool/UI.tsx`。其中 EnterWorktreeTool/UI 与 ListMcpResourcesTool/UI 是 2.1.88 原有的文件名。
- `utils/pathCaseFolding.ts`、`utils/instanceRegistry.ts`、`utils/keyedSemaphore.ts`、`utils/turnAttributionKey.ts`。
- `hooks/useScreenReaderBell.ts`、`services/remoteManagedSettings/fetchSupport.ts`、`services/memorySync/mountRoots.ts`、`services/artifacts/autoEditAttribution.ts`、`utils/claudeAiSync/sessionRefsGate.ts`、`services/projects/channelMemory.ts`、`utils/sandbox/windowsNugetPackages.ts`、`utils/model/modelCatalog/publishedCatalogFloor.ts`、`cli/print/sessionTitles.ts`。

### 放置：驳回 61 个声明

1. **唯一调用方就在当前文件，或当前文件本身合理**：
   - r1：2f5p3gsj#C（doctor 处理器在同文件）。
   - r6：18hwfzwa#DQe。
   - r9：Mgo、CandidateStatusRow、I7（已在 UserTextMessage）。
   - r5：e6aww6q8#Wen。
   - r6：s61vbvea#s4o、#i4o、#rni（attachmentFilesWait 整体都是"等待到达中的入站文件"，只是调用方在 cli/print）。
   - r5：f9asxqh1#I5r、#O5r、#D5r（就是 pluginsScopeGate 该做的同步可用性门控）。
   - r6：ag5x7vhf#uye（exportRenderer 自己也用它）。
2. **调用方分散，找不到单一去处**：
   - r1：82kqcve8#_J（8 个调用方遍及 memdir、autoDream、settingsSync）。
   - r2：yxnffbzs#Hds（utils/messages 也用）。
   - r3：hny2rpzz#ymt。
   - r5：s1zey0a9#fZn；ptag3qm7#c、#qCi、#YCi；dz3q485w#je、#ke、#ds（toolsUsedSummary 也用）。
   - r7：f25sswmp#Zot、dcmhvw5a#Oio、yf5m6p65#Pos。
3. **依赖当前模块的私有状态，单独搬会切断**：
   - r1：7t4fmt2f#T5e、#lIe（与 facade 名 extractServerErrorFields 同组，OAuth 也用）。
   - r2：e6aww6q8#y5s、#_5s（依赖 conversationRecovery 的恢复计数状态 Uwe）。
   - r5：dz3q485w#In（用 briefText 的私有重试表）。
   - r3：4bsqyjz4#rzs（用 slackSend 内部函数，而它的调用方本身可疑）。
4. **成员自己存疑或只是建议**：
   - r1：K5t、z5t（成员判断是调用方解析出错）、aepeg2w5#tv。
   - r6：ah34pb7m#qu、nt75hmzb#jqt。
   - r9：logPressFill；queryHelpers 的 p6、tVn、nVn、rVn（原文是"更适合"）。
   - r7：82kqcve8 的 qm、eR、uFe、T9r（原文是"偏"）。
   - r4：tbfde207#B。
   - r1：w5ndchqs#JXs（唯一调用方是 claude.ts 的 queryModel）。
5. **没有可用的目标**：
   - r5：gwvwj681#P/G、fnmk6x3n#u、18hwfzwa#EIe。EIe 用的是同文件的 TRUSTED_DEVICE_ENROLLED，更像整个 useNpmDeprecationNotification 模块名配错。
   - r7：cjydagjy#Kt、q4qb1h08#q/pn、18hwfzwa#Yse、18hwfzwa#aCt（唯一合理去处是 `_new` 路径）、csq9ftr9#z。
   - r8：bedrockVerify 的 pe、Se（是步骤组件，但在 bedrock 模块里可以接受）；actionNames.ts 整模块改名只是建议。
6. **没有给出声明 id**：r9 的 nullRenderingAttachments、presenceCheck、`_new` 门面；r4 的 promo、v2e、H1r（成员自己说归属正确）。

### 名字：12 条（semantic-zz，`r2-names.tsv`）

当前名字都来自 reference 或是压缩名，不是门面名，所以 semantic 能覆盖。本轮没有遇到门面名本身错了的情况。

| 声明 | 旧名 | 新名 | 来源 |
|---|---|---|---|
| aepeg2w5#GI | getProjectsDir | isLowStakesConfigChange | r0 |
| 1t61stbc#C7o | runPostCompactCleanup | isCacheBreakTrackedSource（同时移到 promptCacheBreakDetection） | r2 |
| e6aww6q8#y$i | CoordinatorTaskPanel | showAgentTaskView | r8 |
| 4121qate#gs | isInstallationRelevantToCurrentProject | isManagedPathRestricted | r9 |
| 4121qate#va | generateUniqueTeammateName | groupByHop | r9 |
| e6aww6q8#Z3 | toggleTeammateVisibility | defaultDescribe | r9 |
| 3dq9c61y#T | detectTerminal | hostPlatform | r9 |
| e6aww6q8#xTe | isMainThreadSource_2 | getMainThreadCacheTtl | r9 |
| e6aww6q8#msn | isMainThreadSource_3 | getMainThreadCacheTtlConfig | r9 |
| e6aww6q8#N9e | （压缩名） | resolveMainThreadCacheTtl（0.9） | r9 |
| s61vbvea#cti | SPINNER_FRAMES | listAncestorDirs | r0（wipStash 的 Gt 导入名错） |
| e6aww6q8#FSt | VERIFICATION_AGENT | WEB_FETCH_BUILTIN_AGENT | r0 |

除 N9e 外置信度都是 0.97。r2 说的真正主体 e6aww6q8#fRe 已由 r2 命名为 cleanupAfterCompaction，不用再写。

### 说明：12 条（docs-zz-fixes）

- **gjx0rh1b#td**：说明内容是对的（删的是以 PID 命名的目录），但"（名字配错）"已过时，第一轮已改名为 pruneStaleProcessDirs。r0 把它当成了下一个函数 nd 的说明。nd 删的是 seed 索引文件，不是目录，本轮补了说明。
- **0h4e7gnq#fi、m2yw48pg#b**：去掉过时的"（旧版名配错，切分错误）"前缀，它们第一轮已改名并归位。r0 说"Ld、k 上方的 JSDoc 与代码不符"，指的就是紧挨着的这两条。Ld、k 本身也补写了更准确的说明。
- **s61vbvea#Mei、ndmse9kj#UMe、ndmse9kj#j**：采用 r9 对照代码重写的说明，取代 docs-extensions 和 docs-p2 的旧说明。
- **改了名或搬了位置的声明**：GI、C7o、cti 写了与新名一致的说明。C7o 的旧说明是"压缩后清理是否适用"，与它在缓存断裂检测里的用途不符。

### 遗留

1. `naming/placement-zzz-lead.json` 排序在 zz 之后，会覆盖 zz。它目前只有 3 条，与 zz 没有重合。
2. 第一轮还剩 249 条没有生效（其中本轮 230 条），剩下 19 条要等 lead 下次切分时确认。
3. 几处整模块名配错我没有改名，只记录在上面"驳回"第 5 类。
