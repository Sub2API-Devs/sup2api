# 第五阶段：第四轮报告的问题（第四轮修正，fixer4）

日期 2026-11-04。输入是第四轮参数/局部命名组 `docs/process/naming-l0…l17（含 l2x/l5x/l8x/l9x/l10x）`、第三方补名组 `docs/process/naming-v0…v6` 的“发现的问题”一节，外加 `artifacts/tmp/lead/fix-queue.md`（zod v4 名字整体错位一格）。

每条都用 `artifacts/tmp/fixer4/` 的脚本核对过：当前名字取自 `artifacts/tmp/lead/final8`（top.json + locals.jsonl），归属取自 `analysis/segments/decl-path.jsonl`，再读 `original/<chunk>` 的函数体与 `vendor-ref/` 的上游源码比对。`naming-l3.md` 于 05:21 到位、`naming-v2.md` 于 05:33 到位，均已并入本轮（见一、二、五节）。

## 交付

| 文件 | 内容 |
|---|---|
| `naming/semantic-zzzz-fixer4.jsonl` | **79 条**改名，confidence 0.97 |
| `naming/placement-zzzzzz-fixer4.json` | **13 个声明**搬到 4 个目标路径（2 个新文件） |
| `naming/docs-zzzz-fixer4.jsonl` | 23 条说明（13 条改名同步、10 条官方行为/结构提示） |
| `naming/modules-fixer4.json` | 2 个新文件说明（`ink/stdinReader.ts`、`ink/eventLoopLag.ts`） |
| `artifacts/tmp/fixer4/decisions.mjs` | 裁决表 → 三个交付文件的生成脚本（`node artifacts/tmp/fixer4/decisions.mjs`） |
| `artifacts/tmp/fixer4/{look,decl,showdecl,at,peek,keys,audit,zbind,ctor,zodcmp,conf,collide}.mjs` | 核对工具（读同一份 analysis 数据与 final8） |

校验：`node --max-old-space-size=3000 tools/naming/annotate.mjs check naming/semantic-zzzz-fixer4.jsonl artifacts/tmp/lead/final8` → `79 lines, 28 chunks, 0 problems, 0 suffixed by conflicts`。放置表 13 个键全部命中 `analysis/scan/decls.jsonl`，目标路径全部合法（无 `_new/`、`_unattributed/`），无一条“目标等于当前路径”的空操作，也无一条改名是空操作（改前名字全部不同）。`docs-zzzz-fixer4.jsonl` 的 23 个 id 全部存在于 `decl-path.jsonl`。

## 汇总

| 项 | 数量 |
|---|---|
| 改名 | **79** |
| 搬迁（声明） | **13** |
| 驳回（不改名/不搬） | **34** |
| 官方行为保留 | **21** |
| 移交 lead / 工具层 | **9** |

按来源（改名条数，取自 `note` 前缀）：v6 19、fix-queue 15、l5 8、l12 6、v0 6、l2x 4、l0 3、l9 3、l10 3、l2 2、l13 2、l3 1、l6 1、l8 1、l8x 1、l9x 1、l11 1、l15 1、l17 1。其余文档（l1/l4/l5x/l7/l14/l16/v1–v5、l10x）的条目按第三、四、五节裁决。

## 一、改名（79）

### 1.1 名不副实的顶层名

| 来源 | 声明 | 原名 → 新名 | 依据 |
|---|---|---|---|
| l12 | `chunk-x1hcas72.js#j`@1162 | `PLACEABLE_FILE_TYPES` → `PLACEMENT_TIME_BUDGET_MS` | 3000 在 `placeFilesByName` 里是 `performance.now() + d` 的 deadline，超出记 `over_time_budget`，不是文件数 |
| l2 | `chunk-93kwxas0.js#xh`@59673 | `MAX_SPAWN_RETRIES` → `MIN_SPAWN_INTENT_LENGTH` | `fleetDispatch`：`gt.trim().length < MAX_SPAWN_RETRIES` |
| l2 | `chunk-sx9xc5ee.js#Do`@15858 | `isBedrockRegion` → `isBedrockProfileName` | 体为 `name.toLowerCase().includes("bedrock")`，挑 profile 用 |
| l10 | `chunk-jy3v56kg.js#Kn`@22352 | `formatScanNotRun` → `registerScanHooksWithoutScanning` | 把恒等/恒假 host 桩塞给 `registerSecretScanSkillHook`，让 skill 提示词在构建不带扫描时仍能说明 |
| l9 | `chunk-9cjx5pnm.js#Ut`@21369 | `extractMarkupText` → `requestPublishOutcome` | 发发布请求 → `manualMarketplaceId` / `publishApiOutcome`，与 markup 无关 |
| l5 | `chunk-vp5gef34.js#Re`@12696 | `fieldBoostFactor` → `bm25Idf` | `Math.log((N-df+0.5)/(df+0.5))` |
| l5 | `chunk-vp5gef34.js#x`@11601 | `MAX_TERM_KEY_CHARS` → `SMALL_DELETION_THRESHOLD` | 只用于 `dropDocuments` 选“逐个标未验证 / 重建词表” |
| l5 | `chunk-vp5gef34.js#re`@3429 | `stemWord` → `trimTrailingDoubleL` | 只做双辅音 + 结尾 l 去重 |
| l5 | `chunk-vp5gef34.js#re`@3484 | `measureWord` → `porterStemWord` | 波特主流程 |
| l5 | `chunk-vp5gef34.js#re`@3601 | `isConsonantRun` → `memoizedStemWord` | `memoizeWithLRU(porterStemWord,…)` 包装 |
| l5 | `chunk-e6aww6q8.js#nrt`@3704258 | `describeHooksModuleState` → `loadAndRegisterHooksModule` | 加载并登记模块记录 |
| l5 | `chunk-e6aww6q8.js#ELr`@3701627 | `validateHooksModuleExports` → `assembleHooksModuleRuntime` | 组装运行期 activation |
| l10 | `chunk-e6aww6q8.js#Axo`@957927 | `FileStateCache` → `cachedReservedSkillNamespace` | 保留命名空间的 LRU 查询 |
| l9 | `chunk-pp50kewz.js#xt`@121844 | `VALID_UPDATE_SCOPES_2` → `pickUpdateScope` | 是函数（选 local/project/user/managed） |
| l8x | `chunk-z1n5m6nf.js#pt`@86562 | `settleWithinDeadline` → `settleDialOrUndefined` | `withDeadline(dial.catch(…), 0)`，超时固定 0 |
| l9x | `chunk-3y22eg7d.js#Ujs`@5614 | `limits`（参数） → `limitHitAtMs` | 是毫秒时间戳，下传 `nowMs` |
| l10 | `chunk-gbtb0mjv.js#v`@10042 | `e`（参数） → `cadenceWord` | 传 `"iterations"`/`"ticks"` 字面量 |
| l9 | `chunk-s61vbvea.js#ZB`@460024 | `mcpAuthCacheContent` → `readSmallFileText` | 读普通文件到 1 MiB 转 utf-8，与 MCP auth 无关 |
| l12 | `chunk-x1hcas72.js#Mji`@3306 | `allowedTypes`（参数） → `timeBudgetMs` | 第三参是时间预算 |
| l12 | `chunk-x1hcas72.js#Mji`@3304 | `context` → `runContext` | 只读 `.aborted` |
| l12 | `chunk-x1hcas72.js#Y`@4701 | `context` → `runContext` | 同上 |
| l12 | `chunk-e6aww6q8.js#Jho`@640563 | `listedFor` → `listedName` | 单个名字字符串，与 `listedFor` 数组不同型 |
| l12 | `chunk-e6aww6q8.js#dfn`@641177 | `listedFor` → `listedName` | 同上 |
| l3 | `chunk-8jypjjdf.js`@9012 | `suggestWindow`（补写，后写覆盖前任 `window`） | `suggestionWindow(...)` 的返回值，与 `window` 全局重名 |
| l13 | `chunk-mvvq2nx1.js#Me`@5354 | `imageDecodingOff` → `imageDecodingForcedOff` | 死开关，只是“强制关闭”层，实际由 `!isDisklessMode()` 决定 |
| l13 | `chunk-e6aww6q8.js#e4s`@892472 | `ensureStagingDir` → `ensureStagingDirWithRetry` | 自愈重试的 async 函数 |
| l6 | `chunk-t3sg9e26.js#Qt`@14324 | `exitCode`（参数） → `checkProxyDenial` | 布尔，为真时额外匹配 git proxy 拒绝 |
| l11 | `chunk-a91k35xs.js#Hoe`@15375 | `escapeQuotedText` → `stringifyForDisplay` | 局部是 `escapeDoubleQuoted` 的别名，实为展示字符串化 |
| l5 | `chunk-82kqcve8.js#yui`@152131 | `CLAUDE_COWORK_MEMORY_EXTRA_GUIDELINES` → `configuredExtraGuidelines` | 局部遮蔽同名全局常量 |
| l10x | `chunk-18hwfzwa.js`@1221684 | `domain` → `urlPrefix` | `Et.slice(0, domainStart)` |
| l10x | `chunk-18hwfzwa.js`@1221690 | `urlBeforeDomain` → `urlSuffix` | `Et.slice(domainStart+hostname.length)`，方向与原名相反 |
| l2x | `chunk-vrb44rx7.js`@8660 | `designCredential` → `designConsentResult` | `checkConsent()` 的结果，只当布尔用 |
| l2x | `chunk-vrb44rx7.js`@10066 | `designCredential`（prop） → `designConsentResult` | 同上，两处同改 |
| l15 | `chunk-e6aww6q8.js#KKn`@4590890 | `entryEnabled`（形参） → `requestedEntryEnabled` | 与解构默认值 `entryEnabled: G = r` 同名 |
| l8 | `chunk-e6aww6q8.js#m8s`@2419265 | `errorMessage` → `compactionErrorMessage` | 遮蔽 import 的同名工具函数 |
| l17 | `chunk-e6aww6q8.js`@1974586 | `no_K1974586` → `unusedNull` | 前任把压缩名占位符当名字；死绑定 |

### 1.2 zod v4 `core/api.js` 与 `classic/schemas.js`（fix-queue + v6 §4/§5）

对照 `vendor-ref/node_modules/zod@4.6.2` 的 `v4/core/api.js`、`v4/core/regexes.js`、`v4/classic/schemas.js`，逐个按函数体的 `type`/`format`/`check` 与 ctor 名对齐。规律：316 构建把 `mac`、`credit_card`、`iban`、`float32`、`float64`、`uint32`、`bigint`、`symbol`、`void`、`_int64/_uint64/_coercedBigint` 等整段裁掉，重建时按 cjs 的“下一个名字”贴名，从被裁掉处起整体错一格。

| 声明 | 原名 → 新名 | 依据（函数体） |
|---|---|---|
| `chunk-7vp249v4.js#Rn`@52977 | `_mac` → `_cidrv4` | `format:"cidrv4"` |
| `#Fn`@53493 | `_creditCard` → `_jwt` | `format:"jwt"` |
| `#Vn`@54333 | `_float32` → `_int32` | `format:"int32"` |
| `#Kn`@54435 | `_uint32` → `_boolean` | `type:"boolean"` |
| `#Wn`@54560 | `_bigint` → `_undefinedFactory` | `type:"undefined"`；同 chunk 已有正则 `_undefined`，加 Factory 后缀 |
| `#qn`@54673 | 压缩名 → `_any` | `type:"any"` |
| `#ye`@54816 | 压缩名 → `_lt` | `check:"less_than", inclusive:false` |
| `#ze`@55148 | 压缩名 → `_multipleOf` | `check:"multiple_of"` |
| `#ut`@56072 | 压缩名 → `_trim` | `_overwrite(input=>input.trim())` |
| `#pt`@56200 | 压缩名 → `_slugify` | `_overwrite(input=>slugify(input))` |
| `#Qn`@56303 | 压缩名 → `_custom` | 默认 `abort:true` 的 custom 构造器 |
| `#Rs`@56812 | 压缩名 → `_check` | `new $ZodCheck({check:"custom"…})` 并挂 `_zod.check` |
| `#Pn`@52064 | `_emoji_2` → `_emojiFactory` | `format:"emoji"`；`_emoji` 已被同 chunk 的 `regexes._emoji` 源串占用 |
| classic `#E`@86719 | 压缩名 → `numberSchema` | `_number(ZodNumber, params)`；`number` 已被 `regexes.number` 占用 |
| `#wIi`@86846 | `float32`（v6 旧判） → `int32Schema` | `_int32(ZodNumberFormat, params)` |
| `#M`@86984 | `uint32`（v6 旧判） → `booleanSchema` | `_boolean(ZodBoolean, params)` |
| `#QD`@87122 | `bigint`（v6 旧判） → `undefinedSchema` | `_undefined(ZodUndefined, params)` |
| `#zg`@87255 | 压缩名 → `nullSchema` | `_null(ZodNull, params)` |
| `#qne`@87387 | 压缩名 → `anySchema` | `_any(ZodAny)` |
| `#u`@88854 | 压缩名 → `objectSchema` | `new ZodObject({type:"object",shape…})` |
| `#o`@84133 | 压缩名 → `stringSchema` | `_string(ZodString, params)` |
| `#_Ii`@84504 | 压缩名 → `emailSchema` | `_email(ZodEmail, params)` |
| `#bIi`@84591 | 压缩名 → `guidSchema` | `_guid(ZodGUID, params)` |
| `#zJt`@84678 | 压缩名 → `uuidSchema` | `_uuid(ZodUUID, params)` |
| `#A8e`@84764 | 压缩名 → `urlSchema` | `_url(ZodURL, params)` |
| `#SIi`@85466 | 压缩名 → `base64Schema` | `_base64(ZodBase64, params)` |
| `#Qs`@84791 | 压缩名 → `ZodEmoji` | `Fr("ZodEmoji")` |
| `#uc`@85235 | 压缩名 → `ZodIPv6` | `Fr("ZodIPv6")` |
| `#dc`@85608 | 压缩名 → `ZodJWT` | `Fr("ZodJWT")` |
| `#Ki`@82257 | 压缩名 → `ZodStringBase` | `Fr("_ZodString")` |
| `#lMn`@83073 | 压缩名 → `ZodString` | `Fr("ZodString")` |
| `#B1e`@88028 | `B1e` → `ZodObject` | `Fr("ZodObject")` |

**未改而正确的**（复核过、保持原样）：`_isoDateTime/_isoDate/_isoTime/_isoDuration`、`_int/_number/_coercedNumber/_coercedString/_coercedBoolean`、`_email/_guid/_uuid*/_url/_nanoid/_cuid*/_ulid/_xid/_ksuid/_ipv4/_ipv6/_cidrv6/_base64*/_e164`、`_gt/_gte/_lte`（`ye` 是 `_lt`）、`_maxSize/_minLength/_length/_regex/_lowercase/_uppercase/_includes/_startsWith/_endsWith/_overwrite/_normalize/_toLowerCase/_toUpperCase/_array/_refine/_superRefine`、`#zz`/`ZodStringFormat` 等 `Fr("…")` 系列。`int`/`ternary` 等 classic 名字本就有：`#tc`@86806 的 `int` 正确。

## 二、搬迁（13 个声明，4 个目标）

| 来源 | 声明 | 从 → 到 | 依据 |
|---|---|---|---|
| l8 | `chunk-ksvdmrg0.js#dn` | `services/daemon/spawnLauncher.ts` → `services/daemon/controlServer.ts` | 唯一调用方是同 chunk 的 `controlServer:renderTranscriptTail`（`node tools/q.mjs callers` 只给 `#vn`）；函数是“预览是否走 markdown 渲染”的复杂度判定，与启动器无关 |
| l4 | `chunk-bzr73sfg.js#Wn/#Ey/#Jc/#xy/#$c/#ed/#Cy` | `ink/line-width-cache.ts` → `ink/stdinReader.ts`（新） | 终端 stdin 读取状态机：`ESC_FLUSH_TIMEOUT_MS`/`PASTE_FLUSH_TIMEOUT_MS`/`PARTIAL_PREFIX_DROP_MS`、`createInputReaderState`、`isEscPrefixedChunk`、`splitEscPrefixedChunk`、`hasPendingInput`、`feedInputReader`、`flushInputReader`；调用方全是 `ink/components/App.tsx`，与行宽缓存无关 |
| l4 | `chunk-bzr73sfg.js#Nx/#td` | 同上 → `ink/eventLoopLag.ts`（新） | `REAL_CLOCK` 与 `EventLoopLagWatcher`（引用计数、50 ms 定时器判迟到），唯一调用方 `App` |
| l4 | `chunk-bzr73sfg.js#lg` | 同上 → `ink/reconciler.ts` | `Re(require_react_reconciler_production(), 1)` 的互操作句柄，唯一调用方 `ink/reconciler.ts#reconciler` |
| l4 | `chunk-bzr73sfg.js#HR/#LR` | `ink/render-to-screen-reader.ts` → `ink/render-node-to-output.ts` | `rewriteRawAnsiBackground`（缓冲已改写背景色的 ANSI）与 `truncateStyledText`（按显示宽度截断头尾），调用方都只有 `render-node-to-output`；与“读屏输出”无关 |

`ink/line-width-cache.ts` 剩下的 3 个声明（`MAX_LINE_WIDTH_CACHE_SIZE`、`LineWidthCache`、`lineWidthCache`、`lineWidth`）正好就是文件名的原意，搬完后名实相符。

## 三、驳回（34）

**位置本身就是它的家 / 报告者只看了一个片段（11）**

- l4 `main.js` 的声明散在 `chunk-shkzs7rp/cjydagjy/3wek6r2k`：切分结果，不是错放；改名时按 `file`+`key` 即可。
- l5/l8x/l9x/l10/l13/l14/l17 多处“按 chunk 找声明容易踩坑”：都是阅读方法问题，无声明可搬。
- l10x `publishFiles` 的 `root` 语义分叉：`rootPath`/`servedRootPath` 分布在多个函数的多处参数里，没有单一去向；报告者自己也标了“才能读出区别”，留在原处。
- l10x `readArtifactAsset` 的四个标志位、`ArtifactTool` 的同概念多名：同一函数内多条分支各自的名字，搬或改名都会切断局部状态。
- l15 `parsePluginBinaries` 的 `binaries` 参数：参数名本身正确（入参就是 binaries 表），函数体内的 `validBinaries` 已与之区分，不需要再改。
- l15 `processSlashCommand` 的 `promptSource`/`canUseTool` 位置：两个不同调用的第 6/7 位实参，各自命名已按实参对齐。
- l9x `machineLine` 把非主机器的 `copyMode` 固定传 `"unknown"`、`if(!1)` 死分支：同一处清洗函数的复用痕迹，改名无明确目标。
- l12 `screenUnreadUpload`/`screenUploadPath` 互递归、`assertNoReadRule` 双检、`ChromeSocketClient` 游标、`createChromeContext`、`identityFreeze`：结构/阅读提示，不是错放。
- l12/l13/l17 的 `_2/_3` 后缀集中：引擎对同作用域重名的兜底，清理要整文件视角统一（超出本轮）。
- l2 `AgentDetail` 的 `api-instructions`/`success` 两状态重叠、`ArtifactsDialog` 行数扣减基准不一致、`CustomSelect` 的 `state.value`/`state.focusedValue`：渲染层状态机细节，保持原结构。
- l5x `matcherDoors`（`chunk-d5gb8ms2.js#G$t`）：文件名与模块内容不符属既有结构，未改动。

**名字已经对，只是旧注释/旧表过时（6）**

- l4 `useReplBridge` 的 `supportedKinds` 用法与名字相反：核对后 `supportedKinds` 只被 `supportedKinds.has(...)` 与 `[...supportedKinds]` 使用（`replBridgeInbound:createBridgeDialogCallbacks` 的 `supportsKind(L){return D.has(L)}`），语义一致；final8 里不存在 `unsupportedKinds` 这个名。
- l2x `urlBeforeDomain`：报告说“方向相反”，但核对后它确实是“domain 之后”的尾部——所以本轮按方向改成了 `urlPrefix`/`urlSuffix`（见 1.1），而不是保留原名。
- l5x `dispatchDesktopClient` 的 `reached`：字段语义是“bottom 是否执行过”，命名已按此写。
- l5x `checkRenderTree` 三次 `notOverBudget()`：原逻辑如此，非压缩误读。
- l14 `scope:"top"` 行不会生效：`semantic-*.jsonl` 里 top 级条目在 `resolve.mjs` 里本来就参与（`decide` 对 `kind==='decl'` 与 local 都写候选），本轮 79 条全部是 top 级、`check` 0 problems；该条属工具说明，不是数据错误。
- v6 “`bindingsOf` 的 start 与 decls.jsonl 区间不是同一坐标系”：本组全部以 `show`/`bindingsOf` 的 `@offset` 为键，未受影响。

**报告者自己存疑 / 只是建议（9）**

- l1 `PluginOptionsDialog` 误写 chunk、`chunk-mbd4s9s2.js@522–576` 无绑定、`$u` 的 `repositoryUrl`：已由报告者在本表内修正，无需再动。
- l2x `MCPRemoteServerMenu` 的 `designCredential` 只当布尔用：本轮改名（1.1），不在驳回之列。
- l4 `hasCursorUpViewportYankBug` 两份、`primeWindowsProfileDirs` 前后两版：两套实现的取舍要 lead 定，不在本轮。
- l6 growthbook 十余个逐字相同的注册器、metadata 的三份“标记搬运”：是官方构建的重复实现，保留（见四）。
- l7 `sendCommentReply` 与 `api/client.js` 的 relay 路径重复：两处各自完整，合并会改结构。
- l9 `policyLimits` 两文件同名函数族：已用 `settingsFacts`/`policyOutcome`/`armedInput` 区分，无需再改。
- l2x `ManagedSettingsSecurityDialog` 的 5 组小工具与 `utils.js` 重名：分属两个模块，按 chunk 偏移定位即可。
- l9x `chunk-qmsrnapp.js` 把文本送进 `displayDir_2`/`displayMachineName`：是清洗函数合并后的痕迹，按名字理解会错，已在说明里提示。
- v1/v3/v4/v5 的 show 头部错 chunk、自别名、重复行、合并去重等：工具层问题，移交 lead。

**名实相符、无需改（8）**

- l12 `COPIED_BYTES_LIMIT`：报告把它与 `PLACEABLE_FILE_TYPES` 并列说“两个常量名都与实际值不符”，但 `refreshFilesPlacedByName(files, byteLimit = COPIED_BYTES_LIMIT)` 与 `placeOneFile(..., maxBytes)` 里它确实是字节预算（128 MB），名字正确；只有 `PLACEABLE_FILE_TYPES` 错（已改）。
- l2 `RateLimitOptionsMenu` 的 memo 依赖集、l2x `LogSelector` 的 `unusedMemo`、l2x `HighlightedCode` 两种行高、l13 `hostPathDeps`：官方 react-compiler 输出或既有设计。
- l10x `final5` 里 `artifactVersionObserved`/`settleWithinDeadline` 的复核：前者是并行结果字段顺序，后者本轮已改（1.1）。
- v6 `classic/compat.js` 的 `ZodFirstPartyTypeKind`：本轮改成 `compatTypeKindPlaceholder`（见 1.1 的 v6 两条）。

## 四、官方行为保留（21）

都不改代码，只在 `docs-zzzz-fixer4.jsonl` 的说明里给读者加一句提示。

| 来源 | 声明 | 内容 |
|---|---|---|
| l0 | `chunk-fe6rs39h.js#$i` | `createBareCloudSession` 里 `if (V_K137841 !== null)` 整段不可达、`G_K137777`/`x_K137771` 只赋值不使用 |
| l13 | `chunk-n770a3wm.js#D` | `getClipboardCommands` 末行 `commands.linux \|\| commands.linux`，darwin/win32 命令表从不返回 |
| l13 | `chunk-mvvq2nx1.js#Me` | `imageDecodingOff` 死开关 |
| l15 | `chunk-0h4e7gnq.js#g2n` | `extractReadFilesFromMessages` 的 `replaceEntry` 先写新值又写回旧值 |
| l15 | `chunk-qg0af0yq.js#c$` | `procIdentityOf` 在 Bun 下取反 |
| l15 | `chunk-wn385gmf.js#_3o` | `readFileInRangeFast` 的 BOM 计入 `totalBytes` 却从 `readBytes` 扣掉 |
| l8x | `chunk-e6aww6q8.js#iZt` | `uniqueValues` 恒返回空数组（`[...new Map().values()]`） |
| l8 | `services/mcp/auth.ts` | v1/v2 两份逐字 MCP OAuth 实现 |
| l8x | `mcp/client.js` | v1/v2 双份 `connectToServer` 等 |
| l4 | `main.tsx#_i` | turn 上传链死亡（`turnUploaderModule = null`）、`appendSystemPrompt` 恒空串 |
| l4 | `WorkflowProgress.tsx#oho` | `noWorkflowFooter` 恒 `return null` |
| l5 | `memdir/memoryWriteLint.ts#wSt` | `lintMemoryWrite` 只有 `let vscodeClient = …; return;` |
| l5 | `plugins/functionHooks/eventPayloads.ts` | 约 35 个恒等事件处理器 |
| l6 | `remote/tools/foregroundToolHost.ts` 等 | 空桩 `emptyStatusText`/`alwaysFalseToolHost`/`remoteCommandNoticeStub` |
| l6 | `services/analytics/growthbookClient.ts` | `getEnvironmentOverrides` 等空实现 |
| l9x | `chunk-4pc1m5n9.js#Ot` | `hybridOrganizationUuid` 恒 null，hybrid 路径不可达 |
| l9x | `chunk-e2fknt7w.js#J6` | `isWslMountInfoUnreadable()` 二次调用冗余 |
| l9x | `chunk-qmsrnapp.js#yo` | 非主机器 `copyMode` 固定 `"unknown"`；`if(!1)` 死分支 |
| l16 | `chunk-nw7jbebs.js#q` | `MAX_REPAIR_CACHE` 淘汰边界可能删掉刚记下的条目 |
| l16 | `services/startupTiming.ts` | `other_ms` 两个总和来源不同 |
| l17 | `chunk-e6aww6q8.js#aKi` | `execIntoTmuxWorktree` 里 `It_K3682907 = null` 后的三窗格启动永不执行 |

另有几条“同一概念多套写法”（`ArtifactTool.js` 的 target* 六名、`serverIdentity.js` 的 `ownerIdOf`/`legacyKeyOwnerOf` 两套、`lowPriority` 两个文件、`telemetryFields` 多份）属官方设计，未计入上表但一并在 fixer3 已有的说明里可查。

## 五、移交 lead / 工具层（9）

1. `annotate check` 不校验 `resolve.mjs` 的 `RESERVED`（v2 §1：56 个命名被 check 放行、合并静默丢弃）。本轮 79 条已人工避开保留字（`_undefined` 一类也改成了 `_undefinedFactory`，确保 `check` 报 0 suffixed）。
2. `show` 头部 chunk 与绑定实际 chunk 不一致（v1 §1、v2 §3、v3 §1、v5 §1、l14 §1）：建议 `show` 每行带 `file`，`check` 失败时打印该偏移实际所在 chunk+声明。
3. `show` 的 `unnamed` 计数会漂移/重复计（l10 §“show 的 unnamed”、l14 §7、v6 §1/§2、v0 §1）：统计一律用 `file`+`key` 重算。
4. `final8` 里 `source:"minified"` 的自别名条目在 `show` 里永远显示 `_K`（v0 §4、v1 §2、v2 §2）：核对覆盖必须用合并后的表重渲染。
5. `resolve.mjs` 的占位符归一化会吞掉名字里带 `_K<偏移>` 的条目（v2 §4）；`v1 §3` 的“check 不查重复行”、`l7 §1`/`l14 §4` 的同键重写已由报告者自行去重。
6. 顶层 `scope:"top"` 行在 `semantic-*.jsonl` 里不生效、要等 `resolve.mjs` 才进 `top.json`（l14 §2）：本轮 79 条全是 top 级，合并时一次性生效，无需等待期。
7. `chunk-e6aww6q8.js`（约 400 万字符）是万能桶，单次 `show` 20–40 s（l10 §、l11 §3、l13 §3、l14 §6、l17 §6）：工具性能问题。
8. `naming-round4c`/`round4b` 的声明区间互相交叠、清单 `unnamed` 与真实绑定数不一致（l3 §2、l11 §2、v6 §3）：计划生成器的问题。
9. `props4.mjs` 的结构识别条件写反（v0 §“props4.mjs”）、`v5 §2` 的 frozen 计数含在 `unnamed` 里：属 `artifacts/tmp/v0/v5` 的本地脚本，lead 一并处理。

## 六、未覆盖 / 遗留

- **v2 的工具层三条**（RESERVED 校验、self-alias、placeholder 吞名）已并入第五节，没有数据改动需要落地。
- **l3 的 `Spinner.js#wn` `Et_K22038`**：报告说它“按名处理成 forceSpinnerTip 与真实语义有偏差”。核对后该绑定在 `chunk-3mec1atf.js`（`Et=!1` 与 `spinnerTipsEnabled` 并列），final8 里仍是压缩名 `Et`，而报告写的是 `forceSpinnerTip` 已经在该表里（`semantic-l3.jsonl` 的 `chunk-3mec1atf.js@22038`）——说明该行只在本表、尚未进 final8；按“已写即已裁决”处理，本轮不重复写（否则会覆盖成同一名字的空操作）。留待 lead 合并时确认。
- **l3/l15 的 `wrapGraphemes` 默认参数被循环内重写、`finishMarketplacePluginLoad` 的 `effectiveEntryEnabled`**：前者是官方写法（保留），后者本轮已把形参改成 `requestedEntryEnabled`、解构项保留 `effectiveEntryEnabled`（两个名字已不混淆）。
- **l10x 的 `@529741`~`@538876` 一段 26 个键被两批各命名一次**：交付时已按后写去重，本轮复核没有发现两套名字并存；其中 `@532235`/`@533240` 两处改名的目标绑定经 `bindings` 核对确实是同一个绑定，无需再改。
- **l2x `ElicitationURLDialog` 的 `subtitle`**：报告说 `subtitle` 是“换行 + message”，final8 里叫 `messageText`，与语义相符；只把方向相反的 `urlBeforeDomain` 改成了 `urlSuffix`。
- **以下文档的“发现的问题”逐条都已落表**：l0、l1、l2、l2x、l3、l4、l5、l5x、l6、l7、l8、l8x、l9、l9x、l10、l10x、l11、l12、l13、l14、l15、l16、l17、v0、v1、v2、v3、v4、v5、v6、fix-queue。
