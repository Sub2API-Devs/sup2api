# 第五阶段第四轮（参数/局部）命名：name-l1c（组 1 续做）

范围：`analysis/segments/naming-round4c.json` 第 1 项（**组号即数组下标，0 起算**），全部 1,149 个声明，74 个路径目录、117 个 chunk。按阅读树顺序从 `chunk-tyg7f3ek.js#SS`（`src/cli/print/agentResume.js`）到最后一条 `chunk-vrb44rx7.js#Ca`（`src/commands/plugin/ValidatePlugin.js`）。主体：

- `src/cli/print/**`（agentResume、elicitationRegistrar、forkConversation、inboundMessages、mcpTurnRedial、parkedPrompts、permissionAsks、pluginUiPanes、pollEvents、rateLimitForwarding、remoteCancel、resumeMcpTasks、resumeTurnBoundaries、runEndReasons、toolCpuSampling、triggerPayloads、turnGate、turnLoop、unattendedStartRecord、wakeRouter 等）
- `src/cli/` 根与子目录：printUsageSummary、queuedCommands、remoteIO（`remoteIO.js`、deviceAttestation、ingress、servedCalls、turnHandoff、workerAuth）、structuredIO、transports（ccrClient、SSETransport、其它 Transport 实现）、startup/prepareSession、update、queued* 等
- `src/commands/**` 从 `pause-memory` 到 `plugin`：permissions、plan、plugin（ManagePlugins、ValidatePlugin、PluginOptionsDialog 等）、insights、goal 等
- `chunk-vrb44rx7.js` 是最大的一块（156 个声明），其中 `#fs` = `commands/plugin/ManagePlugins.js` 单声明 48,595 字符 / 253 个压缩绑定；`chunk-fp6aqx1j.js#bF` = `transports/ccrClient.js` 108,366 字符 / 1,955 处引用，是本组最大的声明。

## 前任写到哪里

接手时 `naming/semantic-l1.jsonl` 为 **5,985 行**（另存 `artifacts/tmp/l1c/l1-head.jsonl` 供比对）。用 `artifacts/tmp/lead/final5` 重算：本组 6,160 个清单 `unnamed` 实际只剩 **6,129 个 `_K` 绑定**；按声明区间归并，前任的行只落在 **102 个声明**里，索引分布为：

```
0-3(4) 49-80(32) 105-107(3) 135-141(7) 208-223(16) 237-239(3) 262-270(9)
282 284-285 292-302(11) 319 361 401-405(5) 410-411(2) 488 515-516 534 546
```

即索引 4–48、81–104、108–134、142–207、224–236、240–261、271–281、283、286–291、303–318、320–360、362–400、406–409、412–487、489–514、517–533、535–545、547 之后全部空缺，且已写的 102 个声明里也还有大量剩余绑定。

## 本次续写

| 项 | 数量 |
|---|---|
| 接手时本组剩余 `_K` 绑定 | 6,129（前任 102 个声明之外 + 这些声明里的剩余） |
| 本次写入条目 | **6,118 条追加**（63 批 `b001…b063`，全部 `cat 批次文件 >> naming/semantic-l1.jsonl`，从未用 Write 整体重写） |
| 交付前处理 | 与前任同键的重复先按“保留首条（前任/先写者）、删我后写的同键行”过滤；另有一次误删 11 条前任行（见下），已原样补回 |
| 最终文件 | `naming/semantic-l1.jsonl`：**12,103 行 / 133 chunk**，其中我的行 6,118 条、覆盖 **117 个 chunk**、落在 plan 声明区间内 **6,118 / 越界 0** |
| `annotate check` | **12103 lines, 133 chunks, 0 problems, 0 suffixed by conflicts** |
| 覆盖复核 | `cover2.mjs`：`minified locals in plan decls 15560 covered 15560 missed 0`（final5 + 本表合并后，本组已无压缩名残留）；`remaining.mjs`：`lines 0 decls 0` |
| 声明覆盖 | 1,149 个声明中 **1,104 个含我的行**；其余 **45 个由 final5 已全部命名**（`untouched3.mjs` 对每个都报 `finalNamed == n`），非遗漏 |
| 跳过 | **45 个声明（final5 全覆盖，无需写）**；**11 个绑定保留前任名**（见下）；两个 `refs=0` 死绑定按规则仍给了名字，不算跳过 |

置信度分布（6,118 条）：0.85 5,017、0.8 629、0.7 351、0.75 106、0.6 13、0.9 2。无与其他命名表（`naming/*.jsonl`）的键重合，无重复键，所有目标绑定原名长度 ≤3（未越权改已有名字）。

## 做法

1. `annotate.mjs show … 1 <from> 30 artifacts/tmp/lead/final5` 太慢（每次重载 365k 条 locals），自己写了 `artifacts/tmp/l1c/show2.mjs`：一次加载 final5 + prettier，按**索引**打印声明，生成 `full.txt`（约 7 万行）后按批切片阅读；`index.mjs` 建 `index.json/index.tsv`（声明 → 行号），`compact.mjs` / `remaining.mjs` 只列仍有 `_K` 的行。
2. **plan 顺序就是阅读顺序**：`show2` 早期对 decls 又按 file 排了一次序，导致索引错乱；`plan.decls` 本身就是按路径排好的，后来固定为直接按下标取，不再排序。
3. 每批 ≤30 个声明，写完 `cat >>` 追加、跑 `check`；出现 `suffixed by conflicts` 时用 `conf2.mjs`（对全表逐 chunk 跑 `renameModule`，只打印自己键被后缀化的条目）定位后逐条改名。
4. 覆盖核验不依赖清单 `unnamed`（会过期）：`cover2.mjs` 用 `bindingsOf` 重建 local 绑定，取 plan 声明区间内原名 ≤3 字符的绑定，与 final5 locals + 本表比对；`untouched3.mjs` 列出“我的行数为 0”的声明并核对 finalNamed 数。

## 跳过与保留

- **45 个声明**整段无我的行，全部因为 final5 已经把这些声明的所有压缩绑定命名（例如 `chunk-tyg7f3ek.js#zl` turnGate 61 个绑定、`#Nu` turnLoop 58 个、`chunk-0sfjpx19.js#ps` resumeMcpTasks 32 个、`chunk-z4g2ta8k.js#An` servedCalls 33 个）。清单 `unnamed` 与当前实际绑定数有偏差（清单是按旧扫描统计的），以重算为准。
- **11 个绑定保留前任名**：`chunk-*@516502/@517208/@519537/@522003 module`、`@22996/@12217 window`、`@96483/@111848 self`、`@51305/@51427/@52172 escape`。这些是 import 模块变量 / 运行时全局，我本来写成了 `mcpClient`/`mcpModule`/`limit`/`maxWindow`/`shouldNormalize`/`ledger`/`timerId`，按“已有名字不改”回退为前任名。中途我误删过这 11 行，发现后立即原样追加回去，最终 `head missing 0`。
- **两个 `refs=0` 死绑定仍命名**：`chunk-8dz40wpq.js@4034`（`unusedState`，0.6；`var p` 只声明不读取）与 `chunk-k7ve8htw.js#yn@19558`（`handleEnable`，`refs=0`，`i=function k(){…}` 内嵌函数从未被调用）。指南允许“看不出用途宁可不命名”，但这两处能从位置推断，按低置信度留名并加 `note` 说明。

## 发现的问题

- **`chunk-vrb44rx7.js` 单 chunk 内同名泛滥**：`memo`、`footer`、`status`、`content`、`entry` 在几十个组件里反复出现，其中大量是 React Compiler 缓存变量（`w(n)[i]` 槽位），只能给 0.6–0.7 的通用名（如 `content`、`footerBox`、`bodyBox`）。
- **`PluginOptionsDialog` 同时出现在 `chunk-vrb44rx7.js` 与 `chunk-ca06bv0t.js`**：一批 9 个键（@3616/@3715/@3793/@3801/@3837/@3848/@3964/@3988/@4585）我误写成 `chunk-vrb44rx7.js`，`check` 报 “no binding at this offset”，改回 `chunk-ca06bv0t.js` 后通过。行归属要靠 `bindingsOf` 的 declStart 精确确认，不能看着相似就填。
- **`chunk-mbd4s9s4.js@522–576` 无绑定**：我曾凭上下文猜了一组偏移写进去，`check` 报无绑定后删除；该 chunk 这段是数据字面量（`stripOthers` 一类的配置数组），不是可达绑定。
- **`chunk-k7ve8htw.js` 系列有一组设施小函数**：`selectNothing` / `selectFalse` / `logicalNot` / `shareRowPort` / `renderTextRow` / `renderListItem` 是 selector/渲染桩，参数几乎不被使用（如 `handleEnable` 的 `k` 只有 `void 0` 赋值），参数名信息量极低，属低置信度命名。
- **`chunk-4v9zy7gn.js` 有若干 `T` / `child` 只构造不使用**（解构出元素后立即丢弃），是打包时裁剪留下的残骸。
- **`chunk-vrb44rx7.js` 的 `$u`（`@53920` 起，插件详情菜单）**：三个参数分别是 `hasHomepage`、`githubRepo`、`repositoryUrl`（`k` 与 `i` 不同时才追加 “View repository”）；`k` 我最初命名 `extraOptions`（0.6，错），已改为 `repositoryUrl`。同 chunk `qo` 的 `Lr(){}` 是 noop 边界回调。
- **`chunk-m8444q1d.js` 的 `ue`（设置确认框）**：`_` 是 `w(4)` 的 memo 槽，实际是 `{context:"Settings"}` 常量对象，命名 `confirmKeyContext`；`k` 是 `e(Jr,{message,subtitle})` 的渲染结果，命名 `confirmElement`，两者都只是缓存槽，读代码时容易误认为有业务含义。
