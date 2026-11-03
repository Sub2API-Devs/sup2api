# 第五阶段第四轮（参数/局部）命名：name-l8x（组 8 后半段，续做）

范围：`analysis/segments/naming-round4c.json` 第 8 项，**声明下标 678 到末尾**（共 1,289 个声明，清单 `unnamed` 合计 4,891，107 个 chunk）。按阅读树路径从 `src/services/mcp/client.js` 的 claudeaiCachedInit 一段接续，一直做到 `src/services/mcp/xaaIdpLogin.js`，覆盖：

- `services/mcp/` 整片（这是本组的主体）：`mcpClient` 系列（client.js 的 connectToServer / callMCPTool / listAllPages / buildMcpTool / transformMCPResult / processMCPResult / getMcpToolsCommandsAndResources）、`config.js`、`connectAuth.js`、`connectionBatch.js`、`connectionLifecycle.js`、`connectionRegistry.js`、`discovery.js`、`discoveryCache.js`、`discoveryIdentity.js`、`driveFileReferences.js`、`fileReference/*`、`headersHelper.js`、`handedListingCheck.js`、`mcpInboundDoor.js`、`mcpReconnect.js`、`mcpTasks.js`、`mcpTaskDrive.js`、`mcpTaskPersistence.js`、`mcpConnectionStore.js`、`mcpStandardKeys.js`、`serverIdentity.js`、`serverDiscover.js`、`sdkManifest.js`、`SdkControlTransport.js`、`transportGuards.js`、`stepUpAuth.js`、`workerWakes.js`、`xaa.js`、`xaaIdpLogin.js` 等

## 前任写到哪里

接手时 `naming/semantic-l8.jsonl` 为 **5,741 行、87 个 chunk，`annotate check` 0 problems**；该表属组 8 前半段（下标 0–677），本表不碰它。用 `artifacts/tmp/lead/final5` 重算：本半段 678–1966 仍有 **4,891 个 `_K` 绑定，分布在 1,289 个声明里**（每个声明都还有压缩名，没有已覆盖的声明）。

## 本次续写

| 项 | 数量 |
|---|---|
| 接手时本半段剩余 `_K` 绑定 | 4,891 |
| 本次写入条目 | **4,894**（186 批 `b001…b186`，全部 `cat 批次 >> 目标` 追加，从未整体重写 `naming/semantic-l8x.jsonl`；重复的 3 条后写生效，交付前已去重成唯一键） |
| 交付文件 | `naming/semantic-l8x.jsonl`，**4,894 行、107 个 chunk** |
| `annotate check` | **0 problems**（`suffixed by conflicts` 17，全部来自 final5 既有条目；用脚本单独复核我表内冲突为 **0**） |
| 声明覆盖 | 1,289 个声明里 **1,285 个有新增命名、1,274 个已覆盖全部 `unnamed`**；剩余 15 个声明各有 1–2 个绑定是刻意跳过 |
| 复核 | 用 `final5 + 本表` 合并成 `artifacts/tmp/l8x/final5` 再跑 `show … 678 1289`：**该范围已无任何 `_K` 绑定**（0 个声明带 unnamed） |

置信度分布（4,894 条）：0.85 4,556、0.8 316、0.75 12、0.7 10。

## 做法

1. `node tools/naming/annotate.mjs show analysis/segments/naming-round4c.json 8 <from> <n> artifacts/tmp/lead/final5`，每批 1–20 个声明（通常 8–20，大函数单独导出到 `artifacts/tmp/l8x/dNNNN.txt` 再分段读），读一段写一批，批次 jsonl 留在 `artifacts/tmp/l8x/bNNN.jsonl`。
2. 大函数（50–67 个绑定）先整段导出到 `artifacts/tmp/l8x/`（`d1604.txt` = driveMcpTask、`d1488.txt` = reconnectMcpOnIdentityChange、`d811.txt` = getMcpToolsCommandsAndResources、`d863.txt` = getMcpToolsCommandsAndResources_2、`d1407.txt` = runMcpToolWithAutoBackground、`d1608.txt` = settleMcpTask、`d1947.txt` = WorkerWakeKeeper、`d1473.txt` = mcpInboundDoor、`d1492.txt` = reconnectMcpServer、`d1265.txt` = ElicitationController），分段读完一次写完。
3. 为了处理后期“只剩零星几个”的阶段，写了一个小脚本 `artifacts/tmp/l8x/miss.mjs`：把 `show` 输出里的 `_K` 偏移与当前本表比对，直接列出还缺的键，避免逐行肉眼找。
4. 每约 1,000 行跑一次 `check`；出现 “no binding at this offset” 时确认是**同 chunk 不同 chunk 名字前缀重复**导致我手误（例如把 `chunk-g2rygg7v.js` 的偏移写成别的 chunk 的），逐条删掉错的而不是留到交付。
5. 交付前把重复键去重（同键后写生效），并撤掉 2 条明显无意义的名字（`emptyString_2`、`uniqueValues` 里那个恒空的 `[...new Map().values()]` 结果）。`_2` 撞名 6 处改名消除（`tools→extraResourceTools`、`servers→keptServers`、`name→configName` / `entryName`、`unavailableReason→laterUnavailableReason`、`authorityEnd→authorityEndIndex`）。

## 跳过

- **15 个声明各剩 1–2 个绑定刻意不命名**，都是逐字确认无读取或纯占位：
  - `chunk-8t8n4kdh.js#Wt`（connectToServer，3/4）、`#br`、`#Zd`、`#pa`：解构/赋值链里只写不读的占位。
  - `chunk-z1n5m6nf.js#Ro`、`chunk-29pqxdaf.js#o4n`、`chunk-0qyh5wah.js#Vt`、`chunk-khngy9cs.js#XBe`、`chunk-mdk8a5r0.js#o`、`chunk-e6aww6q8.js#B4s`、`chunk-qy28ss7z.js#R`：同类（形参/解构项只用于类型或未读取）。
  - `chunk-e6aww6q8.js#I3s`（`emptyString_2(value)`）与 `#iZt`（`uniqueValues(values)` → `[...new Map().values()]` 恒空）：函数体直接返回常量，参数无意义。
  - `chunk-0qyh5wah.js#fe`（`openDiscoverySeal`，声明里 `unnamed` 计 1 但实际绑定都被 final5 覆盖）。
  - `chunk-a76knw89.js#Kri`（`redactMcpErrorText` 里两个 `unnamed` 实际是 final5 已有的顶层名与冻结绑定，`check` 不认，未重复写）。
- 没有整段放弃的声明。

## 发现的问题

- **`mcp/client.js` 有大量逐字重复的 v1/v2 双份实现**：`chunk-8t8n4kdh.js` 与 `chunk-z1n5m6nf.js` 各自有一份 `connectToServer` / `callMCPTool` / `listAllPages` / `buildMcpTool` / `transformMCPResult` / `getMcpToolsCommandsAndResources` / `reconnectMcpServerImpl`，命名时必须逐函数对照两份，否则同名函数会得到不同名字（本表刻意统一：如两边的 `pick` 参数都叫 `dropReason`、`entries` 都叫 `extraCommands`）。
- **`mcp/client.js` 的 `connectToServer`（`chunk-8t8n4kdh.js#Wt`）单个声明跨 ~39 KB**：`show` 一次输出 1,900 行，且其中 `transportErrorState.activeCallWatchdogs` 这类共享字段来自外层，靠局部命名很难读，只能靠调用点推断。
- **`WorkerWakeKeeper`（`chunk-1w450km7.js#j`）的 `#s`/`#d`/`#i`/`#n`/`#k`/`#f` 六个私有方法互递归**：`#s`（applyWake）、`#d`（retime）、`#i`（schedule）、`#k`（drain retimes）语义要从入口 `tick()` 反推，单独看任一方法会误判。
- **`mcpReconnect.js` 的 `reconnectMcpServer`（`chunk-fpvb8c85.js#de`，32 个绑定）** 有两条重试循环（前 `ANSWER_STREAM_GRACE_MS` 次是“同步重连”、之后是“后台慢重连”），同一循环变量 `idx` 在两段里含义不同（前段是尝试序号、后段是 `idx - ANSWER_STREAM_GRACE_MS`），命名时分成 `idx` 与 `backgroundAttempt` 两个名字。
- **`mcpTasks.js` 的 `driveMcpTask`（`chunk-g25jqyhb.js#ot`，53 个绑定）** 把“parked 之后慢轮询”的状态放在 `y_K21332`（现名 `parked`）里，而 `G_K21522`（`parkedSince`）在 parked 分支才赋值 —— 该函数里 `parked`/`parkedSince`/`nextRetryAt`/`lastPollAt` 四个时间字段互相耦合，只有读完整段才能区分。
- **`discoveryCache.js` 的 `readDiscoveryCache`** 把同一个 `miss` 原因在三种不同的淘汰路径（exclusion、purge、entry 校验）上复写，命名时统一成 `reason` 会让读者看不到“是哪一条淘汰路径”，本表改用 `exclusion`/`staleGrant` 等区分。
- **`mcpSkills.js` 的 `uniqueValues`（`chunk-e6aww6q8.js#iZt`）恒返回空数组**：实现是 `[...new Map().values()]`（少了构造参数），推测是打包/压缩时丢了一个实参；其唯一调用方 `countUniqueFiles` 因此永远只统计 `extraFiles`，是**真实疑似 bug**，建议在后续修补阶段核对官方行为。
- **`serverIdentity.js` 里同一概念两种拼写**：`ownerIdOf`（按 mcpInfo 取 owner）与 `ownerId` 局部、`legacyKeyOwnerOf` / `readLegacyKeyOwner` / `claimLegacyKeyOwner` 三套状态读写函数并存，且 `unsavedLegacyKeys` 同时表示“正在认领”和“已放弃认领”，命名时按调用点区分成 `pendingClaim` 语义但保留原名。
- 另有若干 `final5` 既有名字值得复核（例如 `mcp/connectionRegistry.js#pt` 的 `settleWithinDeadline(dial)` 实现是 `withDeadline(dial.catch(() => undefined), 0)` —— 超时参数固定 0，名字里的 “deadline” 读起来像可配置，实际是“立即返回已结算值或 undefined”）。按指南不在本表覆盖，记录在此。
