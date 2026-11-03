# 第五阶段第四轮（参数/局部）命名：name-l0b（组 0 续做）

范围：`analysis/segments/naming-round4b.json` 第 0 项（**组号即数组下标，0 起算**），清单里 1,067 个声明、105 个目录、清单标注 `unnamed` 合计 5,872。按阅读树顺序从 `src/_unattributed/chunk-bzr73sfg` 一路到 `src/cli/print.js`（末条 `chunk-tyg7f3ek.js#a1` = `src/cli/print.js` 的 `loadInitialMessages`）。

本组的主要块：

- `chunk-fe6rs39h.js`（whole `src/cli/headlessCloud`）：`HeadlessCloudClient`（`#Jn`，147 个绑定）、`BootstrapWatchdog`（`#zt`）、`ControlRequestRelay`（`#Kt`）、`OutboundMessageLedger`（`#$t`，50 个绑定）、`OutboundMessageQueue`（`#Zt`，102 个绑定）、`openBareCloudSession` 的 `createBareCloudSession`（`#$i`）、`RunHeadlessCloudPrint`/`CloudPrintRun`、`CloudStreamFilter`（在 `#Zt`/`#Kt` 附近被实例化）等。
- `chunk-tyg7f3ek.js`：`src/cli/print.js` 主体，`_runHeadlessStreamingForTesting`（`#$z`，单声明 197,889 字符，模块级单字母变量极多）与 `loadInitialMessages`（`#a1`）。
- 其余：`chunk-bg51yd13.js`、`chunk-1tz177x8.js`（pluginTest 的 engineShim/runner/kit/report/uiDriver）、`chunk-d4eg9at2.js`（plugins CLI）、`chunk-z7wtv7tg.js`（cloudPlugins/syncStatus）、`chunk-5f8vf2zr.js`（purgeProject）、`chunk-3wek6r2k.js`、`chunk-4cm44bmp.js`、`chunk-ss669z1x.js` 等。

## 前任写到哪里

接手时 `naming/semantic-l0.jsonl` 已有 **6,544 行**（与本仓库 `git show HEAD:naming/semantic-l0.jsonl` 逐行一致；交接口头记录里的“约 6,300 行”应为统计时点差异）。这些行分布在 **24 个 chunk**、本组范围内 **5,515 行**，其中落在本组声明区间内的绑定共 **200 个**。其余的行属于别组 chunk，均原样保留。

用 `bindingsOf` 按 plan 声明区间重算（而不是信任清单 `unnamed`，那是旧扫描）：本组 1,067 个声明共 **14,534 个压缩局部绑定**，其中 `artifacts/tmp/lead/final4` 已命名 **8,692** 个、前任 **200** 个，剩下 **5,642** 个待写。

## 本次续写

| 项 | 数量 |
|---|---|
| 接手时剩余 `_K` 绑定 | 5,642 |
| 本次写入 | **5,642 条**（72 个批次文件，全部 `cat 批次 >> naming/semantic-l0.jsonl`，从未整体重写） |
| 最终文件 | `naming/semantic-l0.jsonl`：**12,186 行 / 129 chunk**；`git diff` 为**纯追加 5,642 行、删除 0 行** |
| `annotate check` | **12186 lines, 129 chunks, 0 problems, 0 suffixed by conflicts** |
| 覆盖复核 | 组内 14,534 个绑定：final4 8,692 + 前任 200 + 本表 5,642 = 14,534，**未覆盖 0**；`progress2.mjs` 输出 `remaining 0 open decls 0` |
| 冲突 | 自查脚本 `findconf.mjs`（对全表逐 chunk 跑 `renameModule`，只看本表触及的键）每次追加后清零；由本表引入的 `_2` 撞名累计约 40 处，全部改名消除（`feature`→`turnFeature`/`replyFeature`/`streamFeature`/`initFeature`，`session`→`featureSession`/`servingSession`，`isSettingsToCloudEnabled`→`settingsToCloud` 等） |

置信度分布（5,642 条）：0.85 5,453、0.8 96、0.9 59、0.75 10、0.7 16、0.65 5、0.6 5。

## 做法

1. `annotate show … <from> 30 final4` 对大声明太慢也太大，改为对每个大声明先 `show … <idx> 1` 导出到 `artifacts/tmp/l0/cNNN.txt`，再用 `sed -n 'A,Bp'` 分段读；自写 `rem.mjs <idx>` 列出该声明剩余绑定的 `--- @key 压缩名 种类` 与短上下文（窗口 ±90/+110），`progress2.mjs` 重算全局剩余，`batchctx.mjs` 批量概览。
2. 每批 ≤30 个声明（大声明常拆成一两个声明一批），用 Write 写 `artifacts/tmp/l0/batchNNN.jsonl`，`cat >>` 追加，立刻跑 `check` + `findconf`。
3. 命名依据优先看**私有字段访问器名、被调函数名、日志字段名**（headlessCloud 里 `replaceXxx`/`xxx()` 这类访问器直接把字段语义写出来了），其次看调用点参数位置。

## 跳过与保留

- **没有跳过任何绑定**：组内每个压缩绑定最后都有名字。
- **2 个键保留前任名**：`chunk-ndmse9kj.js@40961`（前任 `rowUuid`）与 `chunk-gfa3ceg6.js@16172`（前任 `candidates`）——我后来在同一区间重写时写成了别的名字，按“已有名字不改”过滤掉了我的重复行。
- **3 个键写错后删除**：`chunk-84jf153s.js` 的 `@15982`/`@22676`/`@22678`（源码里是 `__K15982` 一类非绑定标记，`check` 报 “no binding at this offset”），删除后回到 0 problems。
- **低置信度占位**：约 26 条 0.6–0.7，集中在 `$z` 里只写不读的临时量与 React 缓存槽。

## 发现的问题

- **`annotate` 对 `__K` / 多参数位置的偏移可能错**：`chunk-84jf153s.js` 中 `__K15982`、`__K22676`、`__K22678` 在 bindingsOf 里没有对应绑定，按 show 打印的偏移写会报错；这类位置只能跳过。
- **`chunk-fe6rs39h.js` 同名局部极多**：headlessCloud 几个类里 `session`、`state`、`cycle`、`request`、`frame`、`entry` 在相邻方法里反复出现且含义不同（尤其 `CloudStreamFilter#Zt` 与 `OutboundMessageQueue#Zt` 两段），必须按所在方法加限定词，否则同作用域会被引擎加 `_2`。
- **`chunk-tyg7f3ek.js#$z`（`_runHeadlessStreamingForTesting`）跨度 197,889 字符**：模块级单字母变量（`Xe`/`ut`/`kn`/`Xo`/`fi`/`Hi`/`ja`/`mr`/`io`/`wa`/`pr`/`ba`/`os`/`Ve`/`$o`/`Ti`/`_r`/`rt`/`ke`/`ag`/`Bm`/`pc`/`gc`/`vu`/`bu`/`ww`/`hc`/`Q`/`Wm`/`Sg`/`O`/`Dt`/`pd`/`vo`/`uo`/`kU`/`Ag`/`Qm`/`Hg`/`Zw`/`Wg`/`Xt`/`Pc`/`nf`/`zg`/`of`/`df`/`lf`/`cv`/`rh`/`Re`/`dr`）与内层同名，读代码时极易串味；其中 `vu`/`bu` 是“上次通告过的能力签名 + 模型覆盖”，`Ag`/`Qm` 是插件同步 promise 与它的 resolve，`Hg`/`Zw` 是“插件首次同步后还欠一轮 session-start hooks”的两个标志。
- **批次重复写同一段**：`chunk-fe6rs39h.js@98472–@101520` 一段被两批各命名了一次（语义判断不同，如 `bashCommand`/`reject`、`reason`/`message` 互换），最终保留语义更准的一组、删掉另一组（都是我的行，未动前任）。
- **`chunk-5f8vf2zr.js`（purgeProject）里 `reason`/`line` 重名多**：同一函数内多处 `reason` 分别指清理失败原因、会话结束原因与行文本，需要 `failureReason`/`endReason`/`lineText` 区分。
- **headlessCloud 的死代码**：`createBareCloudSession` 中 `V_K137841` 恒为 null（`if (V_K137841 !== null)` 整段不可达）、`G_K137777`/`x_K137771` 只赋值不使用；`Q_K137782` 与 `q_K137836` 在命名上曾同名（`isSettingsToCloudEnabled`/`isProjectSynced`），实际是两个不同的 consent 来源。
