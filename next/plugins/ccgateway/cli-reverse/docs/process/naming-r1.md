# 第四阶段第二轮命名：name-r1（组 1）

范围：`analysis/segments/naming-round2.json` 第 1 项，共 1,860 个声明，分布在 324 个阅读树文件、186 个 chunk。主要目录有 `services/api`（claude.js 请求组装、缓存保活、gzip 请求体、回退、限流预检、错误分类、tether）、`services/remoteTools`（远程工具执行、路径映射、机器提示词、宿主技能目录、Windows 用户文件夹）、`utils/settings`（托管设置、policyHelper、宽容 schema、设置审阅）、`cli/handlers`、`cli/_new/print.helpers-tyg7`、`screens/REPL.js`、`services/selfHostedRunner`、`services/design`、`utils/sessionStorage.js`、`commands/mcp`、`services/oauth`，以及 tools/WebFetchTool、upstreamproxy、utils/execFileNoThrow 等。

## 结果

| 项 | 数量 |
|---|---|
| 本组声明（顶层）命名 | 1,860 / 1,860（全部） |
| 顶层绑定命名（含同一声明里的兄弟绑定） | 2,208 |
| 参数命名 | 880 |
| 局部变量命名 | 329 |
| `naming/semantic-r1.jsonl` 总条数 | 3,417 |
| 说明（`naming/docs-r1.jsonl`） | 860 条。需要说明的（≥300 字节或被导出）836 个全部覆盖，另有 24 个较小的声明也写了说明 |
| 改名引擎校验 | 186 个 chunk 逐个调用 `renameModule`（只加载本表）：3,417 条，拒绝 0，冲突 0（`artifacts/tmp/r1/rename-check.txt`） |

置信度：≥0.7 的有 3,060 条，0.6–0.7 的有 357 条。0.6 这一档包括原本低于 0.6、按规则提升到下限的名字，主要是只看到数值、看不出用途的常量（如 `HEAD_TIMEOUT_MS`、`MAX_PENDING_CONNECTIONS`、`DEBUG_COLOR_COUNT`），以及 `if (!1)` 死分支里的声明。局部名统一记为 0.7。

## 与其他命名表的重合（交给 lead 取舍）

- 键重合 20 处，都在 `naming/locals.jsonl`（auto）、`semantic-commands.jsonl`、`semantic-p6.jsonl` 中：
  - 名字相同的有 `chunk-3re05e6m.js@13286 args`、`@13288 context`。
  - 本组名字更具体的有：`chunk-e6aww6q8.js@2564844 flattened → keptIndices`、`chunk-zmxrt63a.js@11928 rounded → hours` 等。
  - `chunk-18hwfzwa.js@1448825`：p6 命名为 `$`，本组命名为 `cache`，指的是 React 编译器的记忆缓存数组。
  - 其余是解构参数，auto 用的是属性名（`rejection`、`res`、`body`、`targetName`、`json`、`opts`），本组已改为与属性名一致。
- 说明重合 7 处，本组的说明是对照本体写的，有分歧时以代码为准：
  - `docs-commands`：`chunk-zsxk930s.js#s`、`chunk-3re05e6m.js#Le`、`chunk-ej3ckp70.js#r`。
  - `docs-extensions`：`chunk-e6aww6q8.js#Rpo`。
  - `docs-tools`：`chunk-qq39x404.js#kMo`、`chunk-q8cqcff6.js#xus`、`chunk-q8cqcff6.js#Ous`。

## 还没命名的

- 本组声明：0。
- 同一声明里的兄弟顶层绑定：45 个没写进本表。
  - 其中 27 个在阅读树里已经有可读名，来自门面或其他表，例如 `TENGU_FEDERATED_ROBIN`、`X_SSR_CLIENT_IP`、`REMOTE_READ_OPEN_FLAGS`、`SILENT_CALL_TIMING`、`PROJECT_SCOPE_BLOCKED_ENV_VARS`、`INVALID_TIMESTAMP_MARKER` 和 `CLAUDE_CODE_RELAUNCH_PROACTIVITY_*`。按"门面原名优先"的规则没有覆盖。
  - 另外 18 个是只看数值、看不出用途的常量，没有硬起名：
    - `chunk-e6aww6q8.js#dOt` 同一声明里的 `KHe`、`mpo`、`gpo`、`hpo`、`aMt`、`ypo`，是几个字节上限。
    - `chunk-rbe666af.js#I` 同一声明里的 `Y`、`Z`、`X`、`Q`、`J`，是 gzip 分块参数。
    - `chunk-cgr0tezp.js#It` 同一声明里的 `qs`、`pr`、`Qs`、`eo`、`to`、`hr`、`no`，是调试日志的大小、间隔和队列上限。
  - 这些常量需要对照使用处逐一确认后再命名。
- 参数与局部：≥500 字节、但一个局部名也没有的声明还剩 33 个。
  - 大多是常量表或 schema，例如 `BXa`、`qOs`、`Xo`、`k4o`、`W0s`、`G0s`、`lE`、`fs`、`fVr`，这类声明没有有意义的局部变量。
  - 其余是类：`SBe` TranscriptStore、`Ly`（cli print 重启续跑记录，6 KB）、`bte`、`Ie` SyncedFileSyncState、`ke` stdioWriter、`lHe`。它们的方法参数多是单字母的 e/n，需要逐个方法分辨，按覆盖率优先的顺序留到了最后。
  - 其他 ≥500 字节的函数（`execFileCore`、`formatFetchedContent`、`buildFileHistorySnapshots`、`tolerantObjectSchema`、`kun` 等）都命名了参数和关键局部。

## 发现的问题（放错文件、名字不符）

- `chunk-aepeg2w5.js#$z`、`#gx`、`#Wz`（components/DevBar.js）→ services/analytics/eventSerialization。证据：调用方 `gg`、`Vz` 都在事件序列化模块。
- `chunk-ah34pb7m.js#umt`（bridge/inboundMessages.js）→ UI 层的屏幕阅读器响铃 hook。证据：调用方是 DialogHost、REPL、ToolUseLoader。
- `chunk-7t4fmt2f.js#ZTn`、`#Sur`、`#T5e`、`#lIe`（services/api/errorUtils.js）→ services/remoteManagedSettings 或 policyLimits。证据：调用方是 remoteManagedSettings/index、loader、PolicyLimitsClient、oauth/refusedSignIn。
- `chunk-r1wk8q25.js#oe`、`chunk-w5ndchqs.js#JXs`、`#QXs` 放在 services/api/claude.js：
  - `oe` 的调用方是 teleportRelay，应归 services/api/teleportRelay。
  - `QXs` 的调用方是 utils/model/modelAccessCheck，应归该模块。
- `chunk-e4xept39.js#NAr`、`#$Ar`（services/settingsSync/index.js）→ 云会话横幅（SystemTextMessage）。
- `chunk-93kwxas0.js#Uu`（tasks/LocalAgentTask/LocalAgentTask.js）→ components/fleet/FleetView 的遥测字段。
- `chunk-aepeg2w5.js#C0`（services/api/withRetry.js）→ utils/modelCost。
- `chunk-s61vbvea.js#Lvt`（services/remoteTools/backgroundCommands.js，`capAdditionalContext`）→ services/tools/toolHooks。证据：调用方是 toolHooks、toolExecution、query、processUserInput，它限制的是钩子 additionalContext 的总长度。同文件的 `#t1`（InstanceRegistry）是通用注册表，应归 utils。
- `chunk-aepeg2w5.js#Rwi`（verificationRequired.js）→ entrypoints/init。证据：唯一调用方是 `initImpl`。同文件的 `#tv` 是 ClaimOnceStore。
- `chunk-hwmsct5x.js#Pb`（refusalFallbackHeaders.js）→ services/api/partialResponse。
- `chunk-2f5p3gsj.js#C`（cli/handlers/util.js）→ doctor 的更新尝试说明。
- `chunk-18hwfzwa.js#t$o`：位于 `if (!1)` 死分支，名字置信度只有 0.55，已按规则提升到 0.6。
- `chunk-e6aww6q8.js#Nan`（tools/WebFetchTool/utils.js，`SuggestionCacheState`）→ utils/suggestions/suggestionCache。证据：唯一调用方是 `yX@utils/suggestions/suggestionCache.js`，内容是命令匹配、目录扫描、Slack 频道等输入建议缓存，与 WebFetch 无关。
- `chunk-e6aww6q8.js#Twt`（tools/WebFetchTool/fetchQueue.js，`KeyedSemaphore`）和 `#sGr`：这是通用的按键信号量，调用方还有 remoteTools/remoteToolCall 和 utils/hooks/hookConcurrency，建议移到 utils。
- `chunk-08s5p3av.js#ke`（utils/imageStore.js，`moveSessionRecording`）→ utils/asciicast。证据：唯一调用方是 `renameRecordingForSession@utils/asciicast.js`，做的是移动录制文件并删除空的会话目录。
- `chunk-dcmhvw5a.js#qy`、`#gd`、`#tS`、`#nS`（utils/settings/settingsSourceTrust.js）→ vendor/lodash-es。它们分别是 lodash 内部的 `safeGet`、`baseMerge`、`isIterateeCall`、`createAssigner`，函数形状逐行一致。
- `chunk-dcmhvw5a.js#tao`（utils/settings/managedSettingsKeys.js，`textLengthAndLines`）→ utils/auth（apiKeyHelper 输出度量）。证据：调用方是 `ir@services/api/requestHeaders.js` 和 `_executeApiKeyHelper@utils/auth.js`。
- `chunk-1fgvxqz2.js#r4e`、`#tTt`（services/api/requestFingerprint.js）→ utils/transcriptRequestBlobs。证据：调用方都是 transcriptRequestBlobs（另有一处 sessionStorage）。
- `chunk-82kqcve8.js#_J`、`#fui`、`#pui`、`#TJo`（memdir/teamMemPrompts.js）：这是记忆库挂载根与作用域的计算，应归 services/memorySync。证据：调用方是 `createMultiStoreState@services/memorySync/syncManifest.js` 和 `readStoreMountEntries@services/memorySync/mountWalk.js`。
- `chunk-e6aww6q8.js#X1o`（cli/printUsageSummary.js，`readDisallowedToolsMetadata`）→ cli/print。证据：唯一调用方是 `_runHeadlessStreamingForTesting@cli/print.js`，读取的是元数据里的禁用工具列表，与用量汇总无关。
- `chunk-18hwfzwa.js#K5t`、`#z5t`：调用方表显示为 `processBatched@services/mcp/client.js`，但本体是子代理元数据的并发上限和代理树构建。疑似调用方解析把同名函数认错了，需要核对 symbols。
- 本组早期批次曾把 5 个解构参数（`{rejection: e}` 一类）误当作整个 options 对象，命名为 `options`。收尾时用 `artifacts/tmp/r1/destructcheck.mjs` 扫描所有局部名，已改为与属性名一致；Hi 的 `opts` 也已改正。其他组如果按"参数字母"批量命名，可能有同样的问题。

## 做法

1. `artifacts/tmp/r1/dump.mjs`：从 segments 取本组声明，按阅读树文件生成 19 份视图（`dump/000.txt`–`018.txt`）。每个声明附字节数、同一声明里的顶层绑定、调用方，以及 ≥500 字节声明的局部绑定（原始压缩名、种类和引用数）。
2. 逐份阅读视图，在 `artifacts/tmp/r1/names/000.txt`–`027.txt` 写命名笔记：
   - 写法：`chunk#压缩名 = 新名 [置信度]`；下一行缩进写局部 `a=名 b#2=名`；`> 中文说明` 写说明；`@chunk#压缩名` 只选中声明、不改顶层名。
   - 000–019 是顶层命名和第一批说明，020 补局部，021–027 补其余说明。
3. `artifacts/tmp/r1/build.mjs`：用 `bindingsOf` 把压缩名解析成 `@偏移` 键，生成 semantic 和 docs 两张表。它同时检查：局部是否存在、是否用了保留字或全局名、顶层是否重复命名、声明是否属于本组。
4. 校验脚本：
   - `validate.mjs`：逐个 chunk 调用 `renameModule`，确认没有拒绝。
   - `stats.mjs`：统计顶层、参数、局部的数量。
   - `needdoc.mjs`：列出还缺说明的声明。
   - `unnamed.mjs`：列出未命名的兄弟绑定，以及还没有局部名的大声明。
   - `destructcheck.mjs`：检查解构参数的命名。
