# 第五阶段第二波命名：name-s2（组 7）

范围：`analysis/segments/naming-round3.json` 第 7 项（0-indexed）。目录为 `utils/envDynamic.js` … `utils/pathClassification.js`，即 `utils/` 下字母序 `envDynamic` 之后到 `pathClassification`（含）的全部文件：`utils/env*`、`error*`、`file*`、`fs*`、`fullscreen*`、`git*`（含 `utils/git/**`）、`github/**`、`gracefulShutdown`、`hooks*`（含 `utils/hooks/**`、`utils/hooks/deviceHooks/**`、`utils/hooks/servedHooks/**`）、`host*`、`http`、`image*`、`instructionFileAccess`、`invisibleChars`、`json*`、`loop/**`、`managedEnv*`、`markdown*`、`mcp*`、`message*`、`messages/**`、`messagingSocket/**`、`model*`（含 `utils/model/**`、`utils/model/modelCatalog/**`）、`mtls`、`nativeInstaller/**`、`networkPaths`、`network/privateHostCheck`、`notebook`、`objectUtils`、`parseIsoTimestamp`、`pasteStore`、`pastedContent`、`path`、`pathClassification`。

规模：`items` 2,779 条声明，165 个 chunk，313 个阅读树文件；这些文件里共有 3,134 个 distinct 顶层绑定，其中 355 个已有可读名（门面/auto/旧表），需本组补名的 2,779 个。

## 结果

| 项 | 数量 |
|---|---|
| 顶层绑定已覆盖 | 3,134 / 3,134（本组文件里的全部 distinct 顶层绑定） |
| 其中本表新命名 | 2,789 条 `naming/semantic-s2.jsonl`（2,776 条落在 2,779 个待命名声明上，另 13 条是同声明里的兄弟绑定/相邻声明；剩余 3 个声明已有可读名：`homeFilePublish` 的解构 `sep`、`placedByName` 的 `nfc`、`hostEnvironment` 的 `CLI`） |
| 说明（`naming/docs-s2.jsonl`） | 957 条。覆盖全部 ≥300 字节或导出（`export {}` 中列出）的声明，按 `analysis/segments` 口径重算后 needDoc 剩 0 |
| 改名引擎校验 | 165 个 chunk 逐个 `renameModule`：拒绝 0，冲突 0 |
| 与其它表键重合 | 6 处，全部同名（semantic-p0/p2/p3/p5/state）；与 `_semantic-tools-lowconf.jsonl` 重合 5 处，命名角度不同（本表采用更具体的名字，交给 lead 取舍） |
| 置信度分布 | 0.9 有 8 条、0.85 有 1,566、0.8 有 694、0.75 有 174、0.7 有 204、0.65 有 40、0.6 有 103 |

## 过程与纠正

最初把「`naming-round3.json` 的第 2 项（N=2）」当成 0-indexed 的下标 1，做完了整组 [1]（2,798 命名 + 39 说明）。协调者指出组号是 0-indexed、我的组是 `[2]` 但 `semantic-s2` 已被 name-s1 完成、实际空缺的是 `[7]` 之后，按指令：

1. 把原产出改名为 `naming/_dup-s2-group1.jsonl`、`naming/_dup-docs-s2-group1.jsonl`（下划线前缀不会被加载）；
2. 重新以 `[7]` 为目标重做全部命名与说明（即本表）。

组 [1] 的产出未删除，若 lead 认为有用可以复用，但与本组范围无重叠（两组 key 交集为 0）。

## 做法

- `artifacts/tmp/s2/dump.mjs` 按阅读树文件生成分桶（含 `tops` 的 name/key/kind/refs/bytes 与首 200 字符源码片段），`rem.mjs` 按剩余量排序推进；`n/*.txt` 是人工决定（`F` 文件、`T 名字 置信度`、`D 说明`），`build.mjs` 编译成两份 jsonl 并校验（`isValidBindingName`、门面/供应商名保护、`@key` 消歧、置信度下限）。
- 说明由 `artifacts/tmp/s2/doc/*.txt`（`<declId> | 中文说明`）合并生成，`docs.mjs` 去重。
- 校验脚本 `check.mjs`：对本表每个 chunk 调 `renameModule`，确认 `rejected` 与 `conflicts` 均为空。

## 命名口径与判断

- 常量按单位/用途起 UPPER_SNAKE_CASE（`*_MS`、`*_BYTES`、`*_RE`、`Set` 类表用复数），函数用 is/has/should/get 等动词，类用 PascalCase。
- 大量 lodash 内联工具（`gitSafeEnv` 里 10 余个）与注入式注册表（`HostScoped`）按"做什么"命名，例如 `assignValueIfDifferent`、`keysIn`、`allKeysIn`、`memoizeMap`、`currentPrStatusFetcher`。
- 只有数值、看不出语义的常量按"所在结构 + 可能含义"命名并降置信度（0.6–0.65），例如 `runDeviceHook.js` 里的 `REQUEST_TIMEOUT_MS`、`MIN_WAIT_BEFORE_ACQUIRE_MS` 等是从 `vouching.js` 的实际用法反推的；`fsWatchProbe.js` 的 `SETTINGS_*` 同理。
- 有几条最终仍未命名的（见下）。

## 还没命名的

3 个声明（都是其余组/旧表已给出可读名，不属于本组需要补的范围）：

- `chunk-jjyx5tf2.js#O`（`homeFilePublish` 的 `sep` 解构，auto 已命名）
- `chunk-azz22fvc.js#ELt`（`placedByName` 的 `nfc`，semantic 已命名）
- `chunk-f22e0a61.js#d`（`hostEnvironment` 的 `CLI`，auto 已命名）

另有 5 个顶层绑定把握不足、按 0.6 写了低置信度名（未跳过）：`model/providerAttribution.js#xu`（恒 false）、`modelCatalog/catalogCapabilities.js#eS`/`#Jc`/`#tS`、`hooks/deviceHooks/commandReach.js#ks`。`hooks/servedHooks/hookPins.js#PAo`/`#MAo` 两个值为 3 的常量最初因看不懂取消命名（置信度只敢给 0.55），最后从 `runServedHook.js` 的用法（`strikes >= PAo` 则停用、`setAsideAsked >= MAo` 则拒绝）确认为"项目检查连续失败次数上限 / 被搁置询问次数上限"，按 0.8 写入。`hooks/ssrfGuard.js#_`/`#L` 两个常量只从 `cloudSessions/setupProgress.js` 的调用点反推出"预计步骤数上限 / DNS 尾部行数"，同样按 0.6 处理。

## 发现的放错文件的声明

阅读树头部注释里已标注了一批"切分错误/名字错配"，本组核对后确认（`声明 id → 建议归类，证据`）：

- `utils/pastedContent.js`：文件头注释写明"（切分错误）把文本拆成普通文本段和 `<pasted_content>` 块"与"（切分错误）去掉 pasted_content 包装"，`splitPastedContentBlocks` 一类函数混在标签常量文件里，宜拆到独立的解析模块。
- `utils/gitSafeExec.js`：`Ot` 声明上的注释写着"（切分错误，git 安全）运行 git 时强制的 -c 配置"，该常量组与 `gitSafeEnv` 的常量组主题相同，宜合并/分到 `git/builderGit/gitEnv.js`。
- `utils/hooks/hooksSettings.js`：`Eqr` 注释"名字配错，与自动更新无关"——它做的是"钩子条目是否能解析出所属插件"，`getAutoUpdatedPluginNames` 这个导出名也不对应；宜改名为插件解析类函数。
- `utils/hooks/hookUpdatedInput.js`：注释"旧版名 getKnownModelOption 为错配，与模型无关（钩子模块）"——该处导出名（旧表）与实现无关，宜按 `hookSourceKind` 等钩子语义改名。
- `utils/hooks/sessionHooks.js`：`addHookToSession` 旧名是方法名被错配到顶层函数（`tagHooksWithSource` 一族），宜按"给会话钩子打来源标记"命名。
- `utils/hyperlink.js`：`isSameHost` 一类断言里注释"主机串是否等于 r……名字配错，见 lead 建议"，导出名与实现（去端口后相等比较）不符。
- `utils/model/classifierModel.js`、`utils/model/planModeModel.js`：两处注释"旧版名 resolveSkillModelOverride_2/_3 为错配"，实际是 1M 后缀处理，应与 relative 的 skill 模型覆盖逻辑区分。
- `utils/model/configs.js`：注释"旧版名 CLAUDE_SONNET_4_6_CONFIG 为错配"，实际读客户端数据 `kelp_forest_sonnet` 作为上下文窗口覆盖。
- `utils/model/model.js`：注释"旧版名 getDefaultHaikuModel 为错配"，实际是"模型是否等于某档 `ANTHROPIC_DEFAULT_*_MODEL`"。
- `utils/model/modelCatalog/catalogEntries.js`、`catalogSeed.js`、`utils/model/modelAllowlist.js`：三处注释"旧版名 modelMatchesVersionPrefix(_3)/isFoundationModel_2 为错配"，实际分别是"补 claude- 前缀后解析"、"去 Bedrock 区域前缀"、"claude- 前缀正则"。
- `utils/model/thirdPartyDefaultFallbacks.js`：注释"属于第三方提供者默认模型探测，误归 secureStorage（旧版名 createFallbackStorage 错配）"——该文件本身放对了，但旧名把一个探测函数当成存储层，宜在最终表里盖掉。
- `utils/mcpOutputStorage.js`：`chainPublishId`/`chainPublishSlot`/`roundTrip`/`pipelineReplyOrigin` 一族（`_Vt`、`b`、`FYo`、`Toi`、`A`）访问的是 `autoEditAttribution`/`pipelineReplyOrigins` 活状态，与"MCP 输出存盘"无关，应归 `utils/autoEditAttribution.js` 一类模块。
- `utils/messages.js`：`teammateIdle`、`queueSkipAttachments`、`pollEvent` 一族（`qTt`、`dgt` 等）与消息规整有关，但同文件里混入了模型结果链接改写、工具摘要标记等属于渲染流程的代码（`QAs`、`JAs`、`L6s`），宜拆分。
- `utils/messageQueueManager.js`：文件头已注明"本切片还混入了用量限额提示、权限模式循环与压缩元数据修复等代码"；核对后 `Pf`（`wf` 声明里的 `REPORTING_NOTIFICATION_ORIGINS`）实为协调者工具后缀表，`OIt`（`hasUnpassedScreening`）与队列筛查有关，`yd`/`_d` 属于分类器提示，宜分别归入 coordinator / 分类器模块。
- `utils/errors.js`：`JY` 声明是 `withTelemetryFacts`（把遥测字段并入可扩展对象），与"错误类型表"同文件但属于遥测辅助，宜归 `utils/telemetry`。
- `utils/instructionFileAccess.js`：`On`（`CLAUDE_RULES_DIR`）与指令文件读取直接相关，无问题；但同文件 `SHo`（rules 读器）与 `yHo`（repo 读器）在结构上是同一族，按原作者意图可以合并注释。
- `utils/hooks/deviceHooks/runDeviceHook.js`：文件头注释"设备钩子执行与结果归类"里混入了 `MAX_TRANSPORT_RETRIES`/`MAX_HOOKS_PER_EVENT` 等本应属于 `deviceHookSession.js` 的传输常量（`Ir` 声明），`Ln` 声明里的 `MISSING_PROJECT_DIR_MARKER` 则属于路径改写（`hookInputPaths`）。
- `utils/model/servedModelCatalog.js`：`D`（`GH_API_DEFAULTS`）实为 gh api 的默认值表（体积、超时、API 版本、允许头名），被切到"服务端模型目录"文件；`R4n`（内存来源标签）属于 `messages.js` 的附件渲染。
- `utils/model/providers.js`：`E`（`jsonStringify`）是通用 JSON 别名，不属于提供商判定。
- `utils/model/model.js` 的 `Uu`（`FAMILY_AVAILABILITY`）与 `utils/model/modelOptions.js` 的 `FU`/`LU`（数值夹取）互为镜像，分居两文件，宜由 lead 决定是否合并。
- `utils/hooks/ssrfGuard.js`：`_`/`k`/`B`/`L`/`M`/`y`/`S` 这组常量与 `sanitizeDisplayText` 包装（`chunk-tp07j3pd.js` 段）实际服务的是 `services/cloudSessions/setupProgress.js`（云会话准备进度、`STALE_AFTER_MS` 等，头部注释明确写"旧版名 isBlockedV4 配错（与 SSRF 无关）"），却被并入 SSRF 防护模块并一起导出；应归 `utils/cloudSession` 一带。

以上只做了记录，没有移动代码（本轮规则不允许改 `reconstructed/`）。
