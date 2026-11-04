# 第五阶段第四轮（参数/局部）命名：name-l15c（组 15，续做）

范围：`analysis/segments/naming-round4c.json` 第 15 项（下标 0–960，共 961 个声明），清单 `dirs` 首尾为 `src/utils/personalConfigRestriction.js` … `src/utils/redaction`。内容基本是 `src/utils/` 里字母序 `personalConfigRestriction` → `redaction/urlRedaction` 的整片：

- `personalConfigRestriction`、`pidSpace`、`plan*`（planModeResume/plans/planTiers）、`platform*`、`plistParser`、`pluginActivity`
- `plugins/` 整片（约 700 个声明，本组主体）：`commandSource`、`crossMarketplaceInstall`、`functionHooks/admission`、`functionHooks/hookPatterns`、`installedPluginsManager`、`loadPluginCommands`、`loadPluginHooks`、`lspPluginIntegration`、`managedPlugins`、`marketplace*`（AutoUpdate/Helpers/Manager/Names/Policy/Sources）、`mcpbHandler`、`mcpPluginIntegration`、`officialMarketplace*`、`orphanedPluginFilter`、`pluginAttribution`、`pluginBinaryAssets`、`pluginCacheMaterialize`、`pluginDependencies`、`pluginDirectory*`（Bindings/Catalog/Search）、`pluginIdentifier`、`pluginInstallationHelpers`、`pluginLoader`（最大，含 92/79/50 个压缩绑定的大函数）、`pluginManifestRead`、`pluginMonitors`、`pluginNameCollision`、`pluginOptionsStorage`、`pluginRelevance`、`schemas`、`synced*`、`validate/`（componentFiles/directoryName/helpers/readmeAndListing/validatePluginDirectory）、`validatePlugin`、`validatePluginContract`、`versionDirSwap`、`walkPluginMarkdown`、`zipCache*`
- `pollEvents*`（pollEvents.js / pollEvents/declarations、fold）、`posixPaths`、`powershell/`（dangerousCmdlets、parser、quoting、staticPrefix）、`preflightChecks`、`printableName`、`proactivity*`、`process*`（process/processIdentity/processRelaunch/processStartTuning/processUserInput/*、processWrapper）、`procStat`、`projectFacts`、`projectsThreadState`、`promiseQueue`、`prompt*`（Ablation/Editor/ShellExecution/Source/SubmissionOrigin/TextSanitize）、`proxy`、`queryContext`、`QueryGuard`、`queryHelpers`（大函数）、`queryProfiler`、`querySource`、`queuedCommandDisplay`、`queueProcessor`、`randomId`、`reactText`、`readEditContext`、`readFileInRange`、`readSmallFile`、`recentItemsCache`、`redaction/`（urlParsing、urlRedaction）

## 前任写到哪里

接手时 `naming/semantic-l15.jsonl` 为 **7,048 行、58 个 chunk，`annotate check` 0 problems、17 处 `_2` 撞名（均属前任既有行）**（文件时间 21:38，批量脚本 `artifacts/tmp/l15/add.mjs` + `b1..b119.txt` 共 119 批）。

用 `artifacts/tmp/lead/final5` 重算：本组 961 个声明里**每一个**都还有压缩名，合计 **4,294 个绑定**；前任那 7,048 行里只有 1,063 行落在本组声明范围内（其余 6,000 余行是本组清单外的文件/声明，按 `check` 统计一并计入表内，未动）。

## 本次续写

| 项 | 数量 |
|---|---|
| 接手时行数 | 7,048（全部保留，逐行核对未变） |
| 本次追加条目 | **4,234**（35 批，`cat 批次 >> 目标` 追加） |
| 最终行数 | 11,282 |
| 覆盖的声明 | 961 个里我命名了 921 个，前任的名字又覆盖 38 个；剩 2 个（`pluginDirectorySearch.js#EAo`、`walkPluginMarkdown.js#QEo`）本身已无 `_K`，无需命名 |
| 本组交接时 `_K` 绑定 | 4,267 个（= 4,294 减去前任已命名/已合并的 27 个），全部命名 |
| `annotate check` | **0 problems**（99 个 chunk） |
| 本表引起的 `_2` 撞名 | 初判 46 处，全部改名消除；最终 17 处 `_2` 均为前任既有行，未动 |
| 最终剩余 `_K`（final5 + 本表合并重算） | **0** |

置信度分布（本次 4,234 条）：0.8 为 558、0.75 为 3,513、0.7 为 161、0.65 和 0.6 各 1。没有低于 0.6 的条目；低档集中在 React Compiler 缓存槽（`W_K17630`/`N_K17735`）与只是把参数原样转发的 `formatXxx` 包装。

## 做法

1. 先写 `artifacts/tmp/l15c/ctx.mjs`：复刻 `annotate show` 的渲染（final5 + 本表合并、`bindingsOf` 过滤、prettier），但对每个声明只打印**仍含 `_K` 的行 ±3 行**，并给每行加上序号注释；每批 26–30 个声明、输出 400–2000 行，控制上下文（Bash 工具输出超过 40 KB 会被截断，所以把渲染写到 `c<N>.txt` 再用 Read 分段读）。
2. 每批写 `b<N>.txt`（`file @key name confidence` 行），用 `artifacts/tmp/l15c/append.mjs` 转 JSONL，再 `cat b<N>.jsonl >> naming/semantic-l15.jsonl`；每批后跑 `annotate check`。
3. 三个复核脚本：
   - `remaining2.mjs`：按 final5 + 本表重算每个声明剩余的 `_K` 数，用来决定下一批从哪个下标开始（跳过大函数后的稀疏区）；
   - `conf.mjs` / `mineconf.mjs`：只列出**本表引起的** `_2` 撞名（`mineconf` 只统计我追加的 4,234 行），逐条改名；
   - `handover.mjs`：最终复核，本组 4,267 个交接绑定全部有名字（0 未覆盖）。
4. 逐行改名统一由一次性脚本 `fixnames.mjs` 按 `file|@key` 改写该键的最后一行（`semantic-l15.jsonl` 只允许后写覆盖，绝不重排）。

## 跳过 / 没有命名的

- `chunk-snyt4d6y.js#EAo`、`chunk-e6aww6q8.js#QEo`：清单里都标 `unnamed:1`，但按当前表重渲染后已无 `_K`（压缩名只可能出现在省略的声明头上，函数体不用它），无需命名。
- 未命名的只有 `chunk-qg0af0yq.js` @12683（`isProbeablePid` 参数之外的上限判断 `MAX_PROC_START_SECONDS = 2147483647`）——参数本身照常命名为 `pid`，只是这个上限恒真，属于代码问题（见下）。
- 与前任重复的 33 个键（多为 `module`/`fetch`/`escape`/`key` 这类通用词的二次命名；如 `chunk-e6aww6q8.js` @4164999..@4172755 一片在前任表里都叫 `module`）：最终保留**前任**那行，我这边追加的重复行已删除（删除前先备份 `artifacts/tmp/l15c/semantic-l15.before-dedupe.jsonl`），保证 `prev7048` 逐行不变。

## 发现的问题

1. **参数偏移与 `_K` 编号错位（多起）**：`annotate` 的 `_K<offset>` 是绑定声明的源码偏移，不是参数序号。`processSlashCommand`（chunk-3g0djq3w.js#Ezi）里有 6 个参数（`oe`/`r`/`L`/`ce`/`E`/`O`）早就被 final5 命名，其它压缩参数因此“跳号”，`u_K11363` 这类相邻偏移并不相邻。我起初按 final5 已有的名字对齐，仍错了两处，复核 `await co(...)` 实参后改成 `inlinedImagePaths`/`ideSelection`/`isMeta`。
2. **`chunk-0h4e7gnq.js` `extractReadFilesFromMessages` 的 `replaceEntry`（@77030）是无效操作**：函数体是
   ```js
   let V = remoteFileState.get(R);
   remoteFileState.set(R, z);
   remoteFileState.set(R, V);   // 又写回旧值
   ee.delete(Z);
   ```
   先写新值再写回旧值，等于什么都没替换，只有 `ee.delete` 生效。看起来是打包时把“替换后清哈希”写坏了。
3. **`chunk-3g0djq3w.js#co` 的 `p`（本该是 `canUseTool`）在 `it(...)` 调用里被当成 `promptSource` 传**：`await it(r,Q,o,u,s,h,P.hookMessages,y,Z,pe,...)`，`pe` 是 `it` 的 `promptSource` 位，但前面 `await io(..., p??bW, ...)` 里 `p` 是 `canUseTool`。两处同名的“第 6/7 位置”语义不同，逆向时极易读反（本表按各自声明命名，没改代码）。
4. **`chunk-qg0af0yq.js` `procIdentityOf` 取值写反**：`if (procStartFromBun()) return e.procStart !== void 0 ? void 0 : e.procStartFt;`——Bun 环境下若 `procStart` 存在反而返回 `undefined`，而 `procIdentityFields` 又恒把 `procStart` 置空、写 `procStartFt`。两个函数对同一字段的约定不一致。
5. **`chunk-wn385gmf.js` `readFileInRangeFast` 的快速路径把 BOM 计入 `totalBytes` 却从 `readBytes` 里扣掉**：`totalBytes -= 3` 直接改参数，后续 `readBytes` 用 `Buffer.byteLength` 重算，两处在有 BOM 时不一致（`truncatedByBytes` 判定边界会差 3 字节）。
6. **`chunk-e6aww6q8.js` `finishMarketplacePluginLoad` 的 `entryEnabled` 既是形参（第 3 位 `r`）又在解构默认值里重名**（`entryEnabled: G = r`），并有第二个 `entryEnabled: e = ...` 候选——本表把形参命名为 `entryEnabled`、解构项命名为 `effectiveEntryEnabled`，读者容易混淆，记录在此。
7. **`chunk-dcmhvw5a.js` `parsePluginBinaries` 的入参 `binaries` 在函数体里被同名局部遮蔽**（靠 `_2` 后缀区分），实际是“通过单条校验的那部分”，本表命名 `validBinaries`。

## 产物

- `naming/semantic-l15.jsonl`：11,282 行，`annotate check` **0 problems**，本组剩余 `_K` **0**
- `artifacts/tmp/l15c/`：`ctx.mjs`（窗口渲染）、`append.mjs`、`remaining2.mjs`、`conf.mjs`/`mineconf.mjs`（撞名）、`handover.mjs`（最终复核）、`fixnames.mjs`（改名）、`b1..b35.txt/jsonl`、`c*.txt` 渲染缓存、`semantic-l15.before-dedupe.jsonl` 与 `prev7048.jsonl` 备份
