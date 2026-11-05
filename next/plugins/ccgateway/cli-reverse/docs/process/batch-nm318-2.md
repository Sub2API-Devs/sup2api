# 批次 nm318-2 命名过程

## 范围与进度

- 范围：`src/_unattributed/chunk-5xgkngpb/part-004.js` … `src/_unattributed/chunk-hma1b5gv/part-002.js`，50 个 chunk、372 个声明，plan 里仍压缩的绑定 1612 个。
- 实际命名：1564 行，全部落在 plan 声明的范围内（越界 0 条）；覆盖率 1564/1612 = **97.0%**。
- 372 个声明里 364 个有绑定被命名；剩下 8 个声明完全没落名字，见下。
- `check` 全程 `0 problems`、`0 suffixed by conflicts`。中途出现过 9 次同作用域/捕获冲突（`cursor`、`wordStart`、`stats`、`module`、`email`、`limitBand`、`quietBand`、`MINUTE_MS`、`report`），已按语义改成 `quoteCursor`、`heredocWordStart`、`fileStats`、`mod`、`accountEmail`、`limitBucket`、`quietBucket`、`HEAVY_MINUTE_MS`、`stats` 等不同名。

## 跳过的部分及原因

1. **空壳/单行转发声明**（8 个完全未命名）：`rai()`（空函数体，refs=1，无调用点）、`Cme`、`nCt`、`Htt`、`_Ki`、`ae`（都是 `return 别的函数(...)` 一层）、`tCn`（返回索引的纯游标推进，4 个绑定全是下标/字节缓冲）、`ce`（`then` 串）。函数含义完全来自被调用方，硬起名更误导。
2. **跨 chunk 的常量引用**：`oMr`、`kLs`、`m_e`、`su`、`Rwn`、`avt`、`oe`、`Me`、`br` 等绑定所在 chunk 不在本批范围，引用点在 `show` 里只显示为 `<名>_K<偏移>`，按规则不重复命名。
3. **剩下约 48 个未命名绑定**集中在几处超长函数尾部：`chunk-gsmkwtjh.js#me`（38 个，200 行对象的初始化字段）、`chunk-6jvva4a7.js#NQn`（23 个，后半段）、`chunk-hma1b5gv.js#Ae`（21 个，闭包里层层 `flatMap` 的临时值）、`chunk-6jvva4a7.js#me`（4 个）、`chunk-5xgkngpb.js#blr`（9 个）等，多数是排序/映射回调的临时值与重复的 `left/right` 参数。

## 发现的问题

1. **`chunk-5xgkngpb.js#nCn` 的 22 个字符常量原本没有名字**，全是裸数字（9、10、32、34…125）。按它们在一个 shell 词法扫描器里的用法推断为 `CHAR_TAB`/`CHAR_LF`/…/`CHAR_RBRACE`（置信度 0.85）。这套常量是 2.1.318 新增的 `scanCommandReading`（`chunk-5xgkngpb.js@3111448`）配套的，316 里没有对应代码，hints.jsonl 也没有。
2. **`chunk-b2c956ye.js#Ct` 与 316 的 `chunk-z7nt3zpj.js#Jt` 完全同形**（`getFeatureValueWithSource_CACHED_MAY_BE_STALE` + `resolveEnvRead`），已用 `tools/versions/inspect.cjs` 逐字核对，hints 的 `readFlagWithOverride`/`key`/`value` 照抄。
3. **`chunk-5xgkngpb.js#vAt` 的 316 名字对不上号**：hints 说 316 的 `ECe` 有 `listUnreadableToolsUsed`/`toolsUsed`/`knownTools`/`message`/`toolName`/`readableName`，但 318 的 `vAt` 多了一层别名展开（`GX`）和 `normalizeCaseForComparison_2` 包裹，结构与 316 不同。名字按 hints 沿用，新增的 `GX` 命名为 `expandToolAliases`。
4. **`chunk-hma1b5gv.js#Ge`（`isWorkspaceDiffOn`）、`chunk-7pvjwb7z.js#l`、`#v` 都恒返回 `!1`**，316 同一位置也是常量 false，是刻意留着的开关而不是遗留死代码。
5. **`chunk-8b3c8k70.js` 是一个完整的内置插件**（隐私检查：工具输入里出现账号邮箱且可能出网时改为 ask）。插件名常量 `CC_PLUGIN_PRIVACY` 已在 final 里；本批补了 `isAvailable`/`register`/`registerPlugin`/`WEB_TOOLS`/`SHELL_TOOLS`/`NETWORK_COMMAND_PATTERN` 等。
6. **`chunk-5xgkngpb.js#IUe` 在阅读树里被聚合成 `var IUe = "...", UNSENT = "unsent:";`**，第二个名字 `UNSENT` 早已存在，本批只补第一个 `MEDIA_REMOVED_PLACEHOLDER`，未动 `UNSENT`。
7. **`chunk-gsmkwtjh.js` 的 `Q`（`parseTargets`）依赖同 chunk 中更早的 `he` 常量表**（`MAX_TARGETS`、`MAX_OWNER_LENGTH` 等），而 `he` 在 plan 里排在 `Q` 之后 22 位；命名时是先看 `Q` 的用法再回头补 `he`，`show` 的排序与代码顺序不一致，读时注意。
