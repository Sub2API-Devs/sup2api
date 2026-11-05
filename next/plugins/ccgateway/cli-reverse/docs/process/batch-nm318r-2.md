# nm318r-2：命名批次过程记录（第二轮）

## 范围与产出

- 输入 `artifacts/tmp/batches-r2/nm318r-2/plan.json`（下标 0）：214 个声明，plan 自报 304 个仍压缩的绑定；范围按阅读树路径 `src/services/mcp/fileReference/fileReferencePolicy.js` … `src/utils/hooks/deviceHooks/shellReader.js`，跨 68 个 chunk。
- `hints.jsonl` 107 条，只覆盖 24 个声明，且多数是同一函数的局部；`oldKey` 都是 2.1.316 的偏移，全部只当名字参考。
- 产出 `naming/semantic-nm318r-2.jsonl`：306 行，全部是偏移键（`file` + `key:"@偏移"`）、`source` 一律 `semantic`、`confidence` 0.6–0.85。其中 304 行落在 plan 声明区间内，2 行是同一 chunk 的邻近小辅助函数（`runHookRewrite`、`isTildeOrDollarWordChanged`，见"口径"）。
- 覆盖率：用 `work/cover.mjs`（复刻 `annotate.mjs show` 的渲染路径，逐声明回扫）复核，**214 个声明里 `_K` 占位全部为 0**；再按"声明区间内的压缩绑定"精确计数：304 个，覆盖 304 个，遗漏 0。
- `node --max-old-space-size=3000 tools/naming/annotate.mjs check naming/semantic-nm318r-2.jsonl` → `306 lines, 68 chunks, 0 problems, 0 suffixed by conflicts`。

## 做法

- 每批 14 个声明跑一次 `show`，把输出落到 `work/d/<下标>.txt` 再读，避免重复渲染；每批写一个 `work/b<NN>.jsonl`，核对后 `cat >>` 追加到产物，随即 `check`。
- 顶层函数/类/常量一律命名（第一轮补丁）：函数看调用点与返回值用法，常量看同名前缀族（`BETA_*`、`CCR_AGENT_PROXY_*`、`MAX_*`）、字符串字面量与注释。
- 局部参数同理：以调用处实参的名字为准（`toolUseContext`、`cwro`、`callCtx.outsideResultReader`、`hook`、`line`）。
- 偏移全部以 `show` 里的 `_K<偏移>` 为准，写前逐条回看该偏移在输出中对应的就是这个名字所在的位置。
- 写完后用 `work/cover.mjs`、`work/render.mjs`（用 final + 本表渲染同一段）复核名字没有整体错格。

## 关键发现：envRegistry.js 的 316 迁移名整片错位

`chunk-xjnnz630.js#fT`（常量块，`start=68772`）与 `#yx`（`start=74502`）里的名字来自 2.1.316 迁移，但**偏移对不上**：环境变量名与绑定之间大约错开 6–11 个位置。证据是 original 里 `KEY:()=>ident` 的 getter 表：

| 绑定偏移 | 压缩名 | 现有名 | 该绑定的 getter 键 |
|---|---|---|---|
| @68706 | `bT` | `ANTHROPIC_CONFIG_DIR` | `USE_BUILTIN_RIPGREP` |
| @68776 | `fT` | `CLAUDE_BG_AUTH_SNAPSHOT_PATH` | `ANTHROPIC_CONFIG_DIR` |
| @47594 | `ht` | `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | `OTEL_EXPORTER_OTLP_TIMEOUT` |
| @72225 | `jI` | `CLAUDE_ENABLE_BYTE_WATCHDOG` | `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` |
| @75043 | `lN` | （原为压缩名） | `CLAUDE_ENABLE_BYTE_WATCHDOG` |

全 chunk 1302 个顶层 var 里，能与 getter 对上号的只有 274 个，错位 949 个。结果是**同一串名字被前移后的绑定占用**：`ANTHROPIC_UNIX_SOCKET`、`CLAUDE_ENABLE_BYTE_WATCHDOG`、`CLAUDE_CODE_GZIP_REQUEST_BODIES` 等既有名都落在前一个变量上，我从 getter 表推出来的正确名字必然与它们冲突（自动 `_2`）。

处理办法与后果：

- 本批 `#zN`（`start=75802`）的 22 个绑定按 getter 表命名后**全部与既有名冲突**，统一写成 `<正确名>_2`（`note` 里注明是 getter 表推导、原区域名整体错位）。
- `#yx` 里的 5 个同类冲突（`CLAUDE_ENABLE_BYTE_WATCHDOG`/`CLAUDE_ENABLE_STREAM_WATCHDOG`/`CLAUDE_CODE_GZIP_REQUEST_BODIES`/`CLAUDE_CODE_GZIP_CCR_REQUEST_BODIES`/`CLAUDE_CODE_GZIP_DATADOG_LOGS`）同样加 `_2`。
- 结论：阅读树里这些 `xxx_2` 与 `xxx` 是**两个不同的变量**，`xxx` 在错位区里其实是相邻变量，`xxx_2` 才是 getter 表指向、被 `env` 门面真正读到的那个。合并时若要彻底修正，应当整段按 getter 表重命名为准，把 `_2` 去掉（会让旧的 `xxx` 让位）。这是 `naming/final` 的既有问题，本批只做标注。

`artifacts/versions/2.1.316-original/chunk-jhrww53q.js` 里同一批键是 `CLAUDE_ENABLE_BYTE_WATCHDOG:()=>Qx` 且 `Qx` 确实就是 `CLAUDE_ENABLE_BYTE_WATCHDOG`（`@73120`），证明 316 时偏移是对的，错位是 318 的符号重排造成的。

## 坑

- `naming/semantic-*.jsonl` 的 `note` 是 JSON 字符串，路径里的 `/` 不用转义，但同一 note 里写 `A/B` 后被 `sed` 处理时容易和 JSON 分隔符混淆；本次出现过一次 `"…"/…` 的非法 JSON，`sed` 补转义后恢复。稳妥做法是 note 里避免裸 `/`，或整体用 Write/Edit 写。
- `grep -c`/`node -e` 里的 `$` 绑定名（如 `$ri`、`$l`）在 shell 里会被展开，必须用单引号或 `\$`。
- `annotate.mjs check` 只给出"被冲突加后缀"的**个数**，不给出是哪些绑定；本批写了 `work/conflicts.mjs` 复刻 `check` 的改名逻辑，逐条打印 `key`/`wanted`/`reason`，才能定位并改名。

## 口径

plan 的 `unnamed` 只统计"锚点在本声明内"的绑定，所以区间内一些 import 绑定、以及被相邻声明认领的绑定会被算到别处。本批按"声明 start–end 区间内的压缩绑定"重新计数（304 个）并全部覆盖。另有 2 条写在区间外，都是同一 chunk 里一眼要用的邻近函数：`chunk-5xgkngpb.js@882496`（`fLn` 调用的 `R1t`，定义在 `hookInputRewrite.js`）与 `chunk-4z1ntdgk.js@79300`（`Tt` 调用的 `ht`，定义在 `shellReader.js`），不命名就看不懂调用点。

## 跳过的条目

无。214 个声明全部处理，304 个绑定全部命名。

## 发现的其它问题（未改，供 lead）

1. 上面整节的 envRegistry 错位（最要紧，影响 `utils/env/envRegistry.js` 全文件的读法）。
2. `chunk-xjnnz630.js#yx` 与 `#fT` 之间，2.1.316 迁移把 `CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD`（`@75058`→getter `tl`）等名字也放到了相邻变量上；`#yx` 区间里除 5 个 `_2` 外还有多组同类错位，本批未逐个纠正（不在本批绑定清单里）。
3. `chunk-5xgkngpb.js#cRn`（`BashRepeatMeter` 类）大量 `#私有字段`（`#e/#t/#n/#i/#a/#s/#c/#l/#o/#r`）不在 plan 的绑定清单内，仍是 `#e` 之类的单字母，读起来困难；可另派一批按 `noteOtherToolCall`/`#f`/`#u` 的用法命名。
4. `chunk-zmp9ej5f.js#I` 命名 `autoModeAutoAllows`，但返回值语义是"自动模式**可以**自动放行"，调用处写 `!autoModeAutoAllows(...)` 才要求权限；若合并后有更贴切的 `autoModeCovers` 之类可再改。
5. `chunk-89fdmwf8.js` 的 `oxs` 实际是"远程设备工具名判定"，被 `ToolSearchTool` 使用；`chunk-89fdmwf8.js` 归属在 `firstPartyServerIds`，跨文件使用属于正常（已导出）。
