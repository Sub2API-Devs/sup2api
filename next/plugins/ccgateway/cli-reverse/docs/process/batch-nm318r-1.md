# 批次 nm318r-1（第二轮）命名过程

范围：`src/_unattributed/chunk-6f6qbsyw/part-001.js` … `src/services/mcp/fileReference/fileReferencePolicy.js`，263 个声明、302 个仍压缩的绑定，hints.jsonl 169 条。

## 做了什么

- 逐声明用 `annotate.mjs show` 看代码，按字符串字面量（`tengu_*` 事件名、`CLAUDE_CODE_*` 环境变量、错误文案、控制子类型）、调用点与属性名给每个 `_K<偏移>` 绑定起名；偏移一律取自 `show` 的实际输出，没有用 hints.jsonl 里的 `oldKey`（那是 2.1.316 的偏移），只借用其中 316 已有的名字（例如 `SetModelFromArgs`、`attestationCategoryOfRequest`、`notice`）。
- 产物：`naming/semantic-nm318r-1.jsonl`，301 行、301 个不同偏移，覆盖 serialized plan 的全部 `_K` 绑定。
- 校验：`node --max-old-space-size=3000 tools/naming/annotate.mjs check naming/semantic-nm318r-1.jsonl` → `301 lines, 72 chunks, 0 problems, 0 suffixed by conflicts`。
- 覆盖核对：脚本按 `annotate.mjs show` 的同一规则（前缀 ≤3、非 import、非 frozen、在声明区间内、`naming/final` 里还没名字）逐绑定比对，plan 内 301 个待命名的 `_K` 绑定全部落到本表，无遗漏、无表外偏移。用临时 `final` 副本重跑 `show` 全 263 个声明，`(N unnamed)` 全部为 0。

## 数量说明

plan 写 302 个 unnamed、本表 301 条，差的那 1 个是 `chunk-je0zymfm.js#Xe`（`createSparks`）：plan 生成时它还没名字，之后 `naming/final` 里已经有了，`show` 也显示 0 unnamed，所以不重复命名。

## 命名约定

- 顶层函数是动词短语（`startCpuSampling`、`refuseTeleport`、`collectArtifactRows`），类 UpperCamelCase（`PatchQueue`、`MemoryExtractPlaceGate`、`PromoCreditRemainingNotice`），模块级常量 UPPER_SNAKE，布尔 `is/has/should`。
- 命令定义表的每条 `var X = {type:"local"…}` 按 `name` 字面量命名（`addDirNonInteractiveCommand`、`ultrareviewCommand`），紧跟其后的 `Y = X` 别名写成 `<x>CommandAlias`，与文件里已有的 `*CommandDefinition` 命名保持一致。
- 同名冲突时给后者加 `_2`（`selectMainLoopModel_2`、`mcpServerName_2`、`channelName_2`）或换更具体的说法。

## 已有名字的问题（未改）

1. `chunk-0yw3taqg.js#bot`（`runHeadless`）的第 7 个参数在 `naming/final` 里已经有名字，`show` 却输出 `<压缩名>_K` 形式，hints 给的也是 316 的旧名 `notice`（与函数内容无关）；按实际用法（来自 `main.js` 的 `tools`、被 `rebuildStartupToolsForCodeMode` 重算、赋给 `toolsRef`）命名为 `startupTools`。
2. `chunk-ny1a8wws.js#ot`（`ModelPickerPanel`）内部局部 `E` 在 `final` 里已有名字，同样显示为 `_K`；按用法（保存 hook 返回消息的 ref，整体替换）命名为 `hookMessagesRef`。
3. `chunk-0yw3taqg.js#917698`（`restoredWorkerAgentDefinitions`）原本形参名是 `_unused`，函数恒返回 `false`，调用处却拿它决定 `replMode:false`，语义与名字不完全吻合；照旧名沿用以保持版本一致，并在 note 里写明。
4. `chunk-zjxrz3f0.js` 的 `DialogFrame` 组件与相邻的 `DialogTitle` 都是通用容器，两者用途需要读 JSX 才能区分，置信度给 0.7。
5. `chunk-qyz2x025.js` 里大量超长常量组（`WorkerLimitsSchema` 前的一段）都挤在一个 `var` 语句里，`show` 会把上下文截在一起，容易错位；`J5r`、`ur`、`tr`、`lr`、`At` 等都逐一对照了后面的使用点才起名（`DEFAULT_HELD_BUNCH_FLUSH_MS`、`MAX_REFUSED_ALONE_BACKOFF`、`TOOL_CALL_ROW_GRACE_FALLBACK_MS`、`UNWATCHED_VIEWER_LEFT_GRACE_MS`、`MAX_EVENT_PAYLOAD_BYTES`）。
6. 若按 hints 直接套旧名会出错的地方：`chunk-1kk50rk6.js#pn` 在 316 同函数里的两个旧名是 `subtype`/`attestationCategoryOfRequest`，318 里函数体已换成 `switch` 返回类别串，采用了后者；`chunk-5xgkngpb.js#Dve` 的 hint `addDirCommand` 其实是相邻声明的名字，实际是 `mcp` 命令。

## 没做到的

- 无。263 个声明、全部 `_K` 绑定都命名了；`unnamed` ≤ 2 的小声明也都做了。
- 少数恒返回 `false`/`null`/空函数的占位实现（`isModelInUse`、`commitTrailerFlag`、`promptOverride`、`cloudLandedTextPlaceholder`、`noopWorkerStartHandler`、`identityModel` 这类空实现）只能按调用点推测用途，置信度 0.6。

## 跳过的

无跳过项。`chunk-5xgkngpb.js` 中 `Eo`、`qbt` 等组件的内部缓存变量按存的内容命名（`feedbackSubmitKeys`、`DesktopUpsellStartupView`），没有留 `t0`/`$[n]`。
