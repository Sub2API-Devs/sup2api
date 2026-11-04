# Ink 渲染层、快捷键与 vim 模式（领域 ink）

> 依据：`original/` 中 Claude Code 2.1.316 的代码；名字参考 2.1.88（`references/claude-code-analysis/src/`）。声明用 `chunk-xxx.js#压缩名` 标注，函数用 `重组路径 · 语义名` 标注。名字以 `naming/semantic-ink.jsonl` 为准，说明见 `naming/docs-ink.jsonl`。

## 1. 概述

本领域是 Claude Code 的终端 UI 底座，包括：

- **Ink 分支**（`ink/`、`ink.ts`）：Anthropic 自己维护的 Ink 分支，几乎完全重写过。React 树经自定义 reconciler 变成 Ink DOM，yoga 算布局，逐节点画进屏幕网格（Screen），与上一帧逐格比较后写出终端转义序列。另外负责 stdin 原始模式、按键/鼠标/粘贴/焦点解析、鼠标选区与复制、超链接、终端能力探测、备用屏、终端内联图片、屏幕阅读器输出。
- **native-ts/**：2.1.88 里原本是原生模块、后来移植成 TypeScript 的三个库：`yoga-layout`（flex 布局引擎）、`color-diff`（语法高亮 diff 渲染）、`file-index`（@ 文件补全的模糊搜索索引）。
- **keybindings/**：快捷键系统（默认绑定表、`~/.claude/keybindings.json` 加载与热重载、校验、和弦解析、按上下文分发）。
- **vim/**：输入框的 vim 模式（普通模式与 316 新增的可视模式状态机、移动、操作符、文本对象、`.` 重复）。

**谁调用它**：`components/`、`screens/REPL` 等所有 UI 组件通过 `<Box>`、`<Text>`、`<ScrollBox>`、`<AlternateScreen>`、`useKeybinding`、`useSelection` 等使用本领域；入口是 `ink.ts · render`（主程序启动交互界面时调用）。`hooks/useVimInput.ts`（ui 领域）驱动 vim 状态机；`components/StructuredDiff`（ui 领域）用 `ColorDiff`；@ 补全用 `FileIndex`。

**它调用谁**：`react-reconciler`、Bun 原生 API（`Bun.stringWidth`、`Bun.sliceAnsi`、**私有** `Bun.ant.CellSegmenter`）、`chalk`、`highlight.js`、`chokidar`、`zod`、GrowthBook 开关读取函数、遥测 `logEvent`、会话状态（终端探测结果缓存）。

## 2. 模块地图

路径以重组树为准（`reconstructed/src/<路径>`）。每个模块的一句话说明在 `naming/modules-ink.json`。

| 模块 | 职责 |
|---|---|
| `ink.ts` | 对外 `render`：给根元素包上主题等 Provider 后交给 Ink；默认渲染选项（原生光标、样式图集） |
| `ink/root.ts` | Ink 实例表（每个 stdout 一个）、`renderSync/renderAsync/createRootAsync`、优雅退出钩子（恢复终端模式、排空 stdin） |
| `ink/ink.tsx` | `Ink` 类：React 容器、双缓冲帧、渲染调度、LogUpdate、备用屏、选区/搜索叠加、终端模式与图片、console 劫持、挂起/恢复/交接 |
| `ink/reconciler.ts` | react-reconciler 宿主配置 + `Dispatcher` 事件分发器 |
| `ink/dom.ts` | Ink DOM 节点、增删改、样式写入 yoga、脏标记、`ImperativeTree`（不经 React 的命令式子树） |
| `ink/styles.ts`、`ink/layout/node.ts` | Box/Text 样式 → yoga 枚举与属性 |
| `native-ts/yoga-layout/*` | yoga 的 TS 移植（Int32 存储、多级缓存） |
| `ink/renderer.ts`、`ink/render-node-to-output.ts` | 每帧遍历 DOM 树画进 `Output`（blit 复用、裁剪、滚动容器、滚动排水） |
| `ink/output.ts` | `Output` 操作缓冲（write/blit/clip/clear/shift/noSelect），写行时调用原生 CellSegmenter |
| `ink/screen.ts` | `Screen` 网格、字符/样式/超链接池、软换行与 noSelect、damage、逐格 diff |
| `ink/log-update.ts`、`ink/optimizer.ts` | 两帧 diff → Patch 列表 → 窥孔优化 |
| `ink/terminal.ts` | 终端能力判断、`writeDiffToTerminal`（同步输出包裹） |
| `ink/termio/*` | 转义序列：分词器、CSI/DEC/OSC/SGR 构造与解析、剪贴板、tmux 透传 |
| `ink/parse-keypress.ts` | 输入解析（按键、kitty CSI u、modifyOtherKeys、win32-input-mode、鼠标、粘贴、焦点、终端应答） |
| `ink/components/App.tsx` | Ink 根组件：原始模式、读输入、分发键盘/鼠标/粘贴/焦点、点击链、能力探测 |
| `ink/events/*`、`ink/hit-test.ts`、`ink/focus.ts` | DOM 风格事件（捕获/冒泡）、命中测试、焦点管理 |
| `ink/selection.ts`、`ink/hooks/use-selection.ts`、`ink/searchHighlight.ts` | 鼠标选区、复制、搜索高亮 |
| `ink/terminal-querier.ts` | 终端查询队列（DA1 哨兵） |
| `ink/components/*` | Box、Text、ScrollBox、AlternateScreen、Link、Button、NoSelect、RawAnsi 等 |
| `keybindings/*` | 快捷键系统 |
| `vim/*` | vim 模式 |
| `native-ts/color-diff`、`native-ts/file-index` | diff 渲染器、文件模糊索引 |

> 注意：重组树里不少模块混进了别处的代码（例如 `ink/screen.ts` 有 114 个声明其实是 316 新增的图表渲染器，`keybindings/reservedShortcuts.ts` 有 34 个声明是路径/沙箱工具）。完整清单见 `docs/process/domain-ink.md`「给 lead 的建议」。另外大量 ink 代码写作时在 `_unattributed/` 的 `chunk-bzr73sfg`、`chunk-24t3dkzb` 段里（place-rest 后已落位到 `ink/` 下各文件）（输入读取器、终端能力探测、终端图片、LineCellSegmenter、屏幕阅读器等），本手册按功能讲到它们。

## 3. 渲染管线

### 3.1 总览

```
React 组件树
  │  ink/reconciler.ts · reconciler（react-reconciler，mutation 模式，ConcurrentRoot）
  ▼
Ink DOM（ink-root / ink-box / ink-text / ink-virtual-text / ink-link / ink-raw-ansi / ink-progress / #text）
  │  resetAfterCommit → rootNode.onComputeLayout → Ink.runLayoutPass
  ▼
yoga 布局（native-ts/yoga-layout · Node.calculateLayout）
  │  rootNode.onRender → Ink.scheduleFrame（16ms 帧间隔节流）→ Ink.onRender
  ▼
renderer.ts · createRenderer → render-node-to-output.ts · renderNodeToOutput（逐节点）
  │  Output.write / blit / clip / clear / shift / noSelect
  ▼
output.ts · Output.get() → writeLineToScreen → LineCellSegmenter（Bun.ant.CellSegmenter.segment/paint）
  ▼
Screen（Int32 cells，damage 区域）＝ Frame.screen
  │  叠加：选区背景、搜索高亮、悬停超链接下划线、图片占位
  ▼
log-update.ts · LogUpdate.render(prevFrame, nextFrame) → diffEach（只看 damage）→ Patch[]
  │  optimizer.ts · optimize
  ▼
terminal.ts · writeDiffToTerminal → 一次 stdout.write（DEC 2026 BSU…ESU 包裹）
  ▼
交换前后帧，必要时压缩样式池/重建字符池
```

### 3.2 React → DOM（reconciler）

`ink/reconciler.ts · reconciler`（`chunk-bzr73sfg.js#$7` 同一声明里还有 `dispatcher`）：

- `createInstance`：`<Box>` 不能嵌在 `<Text>` 里；`<Text>` 内的 `<Text>` 变成 `ink-virtual-text`；裸文字必须在 `<Text>` 里，否则报错并附组件所有者链（`getOwnerChain`/`formatOwnerChain`，`chunk-bzr73sfg.js#cg`/`#og`）。
- `commitUpdate`：`applyProp`（`#h1`）只写变化的属性；`style` 走 `setStyleAndApplyLayout`（浅比较不变就跳过），事件处理器存进 `_eventHandlers`（不进 attributes，换处理器不触发重绘）。
- `hideInstance/unhideInstance` 用 `display:none`；`commitMount` 处理 `autoFocus`。
- **原始模式引用计数（316 新增）**：节点挂上键盘/粘贴/滚轮处理器（`RAW_MODE_HANDLER_PROPS`）时 `syncRawModeRef`（`#rg`）给根节点 +1，卸载时 -1（`releaseRawModeRefs`，`#ug`）；只有确实有处理器时才打开 stdin 原始模式。
- `resetAfterCommit`：记录提交耗时 → `onComputeLayout` → `onRender`。
- `dispatcher` 根据当前事件类型决定 React 更新优先级（`events/dispatcher.ts · getEventPriority`：按键/点击/焦点/粘贴为离散，resize/scroll/wheel/mousemove 为连续）。

### 3.3 DOM 与布局

- `ink/dom.ts · createNode`（`#go`）：除 `ink-virtual-text/ink-link/ink-progress` 外都建 yoga 节点；`ink-text` 挂 `measureTextNode`（压平文本后按 textWrap 折行测量；`measureWrappedText` 在含非 ASCII 时避免二次布局抖动），`ink-raw-ansi` 挂 `measureRawAnsiNode`（直接用 rawWidth/rawHeight）。
- `markDirty` 沿父链置脏；删除节点时 `collectRemovedRects`（`#Vy`）把上一帧画过的矩形记到父节点 `pendingClears`，下一帧清掉。
- `ImperativeTree`（`#Zd`，316 新增）：在某挂载点下不经 React 直接增删 box/text、改样式文字，只触发重新布局与重绘。
- yoga（`native-ts/yoga-layout/index.ts`）：316 的移植改为 Int32 存储，`pointScaleFactor` 只允许 0 或 1；缓存拆成单槽布局缓存 `_lc`、单槽测量缓存 `_mc`、8 槽环形缓存 `_cIn/_cOut`、flex basis 缓存 `_fb`、尺寸槽 `_sz`；`calculateLayout` 有统计（访问节点数、测量调用、缓存命中）。主要函数：`layoutNode`（`#ho`）、`lookupLayoutCache`（`#ax`）、`measureLeaf`（`#ux`）、`layoutFlexContainer`（`#cx`）、`layoutFlexLine`（`#fx`）、`resolveFlexibleLengths`（`#Cx`，冻结迭代）、`breakIntoLines`、`layoutAbsoluteChild`、`calculateBaseline` 等。

### 3.4 DOM → Output（render-node-to-output）

`ink/render-node-to-output.ts · renderNodeToOutput`（`chunk-bzr73sfg.js#ks`）每帧从根递归：

1. `display:none`：清掉旧区域。
2. **blit 复用**：节点未脏、位置尺寸背景不变 → `Output` 的 `blit` 从上一帧整块拷贝（再补拷越界的绝对定位子孙，`#DR`）。不能 blit 的情况：前面有脏的非裁剪兄弟、绝对定位子节点移动（`absoluteChildMoved`）、被越界兄弟覆盖（`collectSiblingsUnderEscapingChange`）、裁剪区变大（`advanceClips` 的 `grew`）、上一帧越界绝对定位矩形消失（`hasStaleAbsolutePaint`）。
3. 否则清旧区域、处理 `pendingClears`、画背景（`fillBoxBackground`）、边框（`render-border.ts · renderBorder`，可嵌标题）、文字（`wrapWithSoftWrap` 折行并记录软换行种类 HardBreak / Continuation / ContinuationElidedSep，`applyStylesToWrappedText` 按「字符→段号」表还原样式与 OSC 8 链接）、子节点。
4. **滚动容器**（overflow: scroll）：`resolveScrollTop`（`#yR`）处理 `scrollAnchor`、`stickyScroll`；待滚量 `pendingScrollDelta` 每帧按「排水」算法消化：`drainAdaptive`（≤5 一次滚完，<12 每帧 2 行，否则每帧 3 行，积压 >30 直接跳）或 `drainProportional`（每帧 3/4，至少 4 行），由设置 `useAdaptiveDrain` 选择；可见范围外的子节点跳过并丢缓存（`#xf`）；滚动时可以 `shift` 整块平移后只画新露出的行，并给 LogUpdate 留 DECSTBM 滚动提示。
5. 零高度节点只写 `cachedLayout`（`setUnpaintedLayout`），保证命中测试与焦点几何可用。

### 3.5 Output → Screen：CellSegmenter（316 的原生实现）

2.1.88 用 JS 写 `setCellAt` / `writeLineToScreen`（逐字素 `Intl.Segmenter` + `stringWidth`，自己处理宽字符占位与 SGR）。316 把这部分换成 **Anthropic 私有 Bun 运行时里的 `Bun.ant.CellSegmenter`**，公版 Bun 没有它，且**没有回退**。

**构造**：`chunk-m4dvt8pp.js` 的 `$7n(substitute, screen)`：

```js
if (typeof Bun > "u" || typeof Bun.ant?.CellSegmenter !== "function")
  throw Error("This runtime has no Bun.ant.CellSegmenter. Run Claude Code on the @anthropic-ai/bun-internal version pinned in package.json.");
return new Bun.ant.CellSegmenter({ ambiguousIsNarrow: true, substitute: e, screen: t });
```

- `substitute`：要替换掉的码点区间，Ink 传 `q5e = [[1564,1564],[8234,8238],[8294,8297]]`（ALM U+061C、LRE..RLO U+202A–202E、LRI..PDI U+2066–2069 这些双向控制符）；`setCellAt` 用的单例传 `[]`。
- `screen`（屏幕格编码约定，由 `ink/screen.ts · createScreenSegmenter`，`chunk-bzr73sfg.js#ps` 给出）：`{widthMask: 3, narrow: 0, wide: 1, spacerTail: 2, spacerHead: 3, emptyCharIndex: 0, spacerCharIndex: 1, emptyWord: packWord1(0,0,0), tabWidth: 8}`。

**调用点**：

| 调用方 | 用到的方法 | 作用 |
|---|---|---|
| `LineCellSegmenter`（`chunk-bzr73sfg.js` 的 `class pf`，未归属，应归 `ink/output.ts`） | `segment`、`paint`、驻留表 | Output 写行的主路径 |
| `ink/screen.ts · setCellAt`（`#T1`） | `setCell` | 写单个格（宽字符右半占位、覆盖宽字符时清孤儿格） |
| `ink/screen.ts · paintSegments`（`#xg`） | `paint`（经 LineCellSegmenter） | 写一行并记 damage、图集 |
| `chunk-e6aww6q8.js#jUt`（技能名清洗，非 ink 领域） | `segment` + `graphemes` | 只取字素串，去掉控制/双向字符 |

**接口形状**（从调用方反推）：

- `segment(text, cells: Int32Array, runs: Int32Array, reorder: boolean) → count`：把一行带 ANSI 的文本切成字素格。返回负数表示缓冲不够，`-n` 是需要的格数，调用方扩容到 `2*max(n, len)` 重试。
  - `cells[2 * g]`（第 g 格）：字素在 `graphemes` 驻留表中的下标；`cells[2 * g + 1]`：低 8 位显示宽度、第 8 位（256）制表符标记、`>>>10` 为样式段号。
  - `runs[2 * p]`：段 p 的 SGR 键下标（`sgrKeys`/`sgrCloseKeys` 中，键是以 `\0` 连接的开/关码串），`runs[2 * p + 1]`：OSC 8 链接下标（`uris`，0 为无链接）。
  - `reorder`：是否做双向文本重排，Ink 传 `needsBidiReorder()`（`WT_SESSION` 或 `TERM_PROGRAM=vscode` 时为真，按主机缓存）。
- `paint(screenCells, width, x, y, segCells, count, undefined, charIndices: Int32Array, runWords: Int32Array) → packed`：把切好的格写进屏幕 Int32 数组。`charIndices` 把 `graphemes` 下标映射到屏幕字符池下标；`runWords` 把段号映射成 `packWord1(styleId, hyperlinkId, 0)`。
- `setCell(screenCells, width, x, y, charIndex, word1) → packed`。
- 返回值打包：`结束列 + 改动起始列·2^20 + 改动结束列·2^36`；`addDamageFromPacked`（`#Eg`）取出改动区间并入 `screen.damage`，`paintSegments` 返回 `packed % 2^20`（结束列）。
- 驻留表 `graphemes / sgrKeys / sgrCloseKeys / uris` 是原生对象上的数组，JS 侧只读。

**LineCellSegmenter 的 JS 包装**（`class LineCellSegmenter`（`chunk-bzr73sfg.js#pf`））：维护字素→字符池映射（`charIndices`）、段号→styleId 缓存（`styleId()`：SGR 键拆成 AnsiCode 列表，经 `StylePool` 的 `intern` 得 id）、链接下标缓存；驻留表超过 16384（字素 65536）或样式池/chalk 换代且 sgrKeys > 2048 时 `resetNative` 重建原生对象。`width()` 算显示宽度（制表位展开），`keepColumns(x, x1, x2)` 只保留裁剪区内的格，`trailingSpaces()` 数尾随空格。

**与 2.1.88 的差异**：字素切分、宽度计算（`ambiguousIsNarrow`）、SGR/OSC 8 解析、宽字符占位规则、制表位展开、双向重排全部进了原生代码；JS 侧只剩缓冲管理与池映射。验证环境用 `tools/verify/bun-ant-shim.js` 垫片补上（见 `docs/process/verify.md` 第 12 节，垫片不做双向重排）。

### 3.6 Screen 数据结构

`ink/screen.ts · createScreen`（`#QDe`）：

```
{
  width, height,
  cells: Int32Array(width*height*2)   // 每格两个字：[charIndex, word1]
  cells64: BigInt64Array（同一块内存，整格比较/清零）
  charPool, hyperlinkPool, emptyStyleId, atlasRecorder,
  damage: {x,y,width,height} | undefined   // 本帧改动的包围盒
  noSelect: Uint8Array(width*height)        // 不参与选区复制的格
  softWrap: Int32Array(height)              // 每行软换行标记
}
```

- `word1 = styleId << 17 | hyperlinkId << 2 | widthKind`（`packWord1`；`STYLE_SHIFT=17`、`HYPERLINK_SHIFT=2`、`HYPERLINK_MASK=32767`、`WIDTH_MASK=3`）。widthKind：0 窄、1 宽、2 宽字符右半占位（spacerTail）、3 行尾放不下的宽字符占位（spacerHead）。
- `CharPool`（`#Nd`）：字符串→下标，ASCII 走 128 项快表；0 是空格、1 是空串（占位）。`HyperlinkPool`（`#ms`）：URL→下标，0 无链接。
- `StylePool`（`#Dd`）：AnsiCode 数组→styleId（`下标<<1 | 在空格上是否可见`，背景/反显/下划线等在空格上也可见）；`transition(from,to)` 缓存样式切换的 SGR 串（`TRANSITION_CACHE_MAX=8192`）；超过软上限 4096 时按帧压缩（`STYLE_COMPACT_FRAMES`），换代后用 `migrateScreenPools` 迁移屏幕里的下标。`StylePoolMonitor`（`#Md`）是调试用的样式组合记录器。
- `softWrap[row] = 上一行内容结束列 << 16 | 本行起始列`，第 15 位 `SW_ELIDED_SEP` 表示折行处吞掉了分隔空格；复制选区时据此把软换行拼回原行。
- `blitRegion`（`#Pd`）整块拷贝上一帧区域并修补被切开的宽字符；`shiftRows`（`#ys`）上下平移行区间（滚动优化）。

### 3.7 帧 diff 与终端输出

- `ink/log-update.ts · LogUpdate.render(prev, next, altScreen, decstbmAllowed)`（`#lf`）：`diffEach`（`#Rg`）只在两帧 damage 之并（加尺寸缩小露出的区域）内逐格比较，宽度相同走 `diffSameWidth`，不同走 `diffDifferentWidth`。产出 Patch：`stdout`（文字）、`styleStr`、`hyperlink`（OSC 8）、`cursorMove`/`cursorTo`、`cursorShow/Hide`、`clear`、`clearTerminal`（带原因 resize/offscreen/clear）。
  - 虚拟屏幕 `VirtualScreen`（`#af`）跟踪光标；`moveCursorTo` 换行时用 CR+相对移动，同行用 CHA。
  - 宽度补偿（`needsWidthCompensation`，`#NC`）：U+1FA70–1FAFF、带 VS16 的 emoji 终端可能算 1 列，先在后一列写空格再回到正确列。
  - 主屏模式下内容超过视口（`isFrameOverflowing`）进入回滚区；无法增量时整屏重置（`fullReset`，会闪烁）。
  - DECSTBM 滚动区域优化：滚动容器整体平移时发 `CSI top;bottom r` + 滚动，少画很多行；由 `isDecstbmRendererEnabled()`（`chunk-bzr73sfg.js#bB`，`ink/nativeCursor.ts`）决定：需要 TTY、同步输出、终端无光标上移回滚 bug、非全屏环境、非后台守护进程，然后 `CLAUDE_CODE_DECSTBM` 或 GrowthBook `tengu_marlin_porch`（默认 false）；tmux/zellij/JetBrains/xterm.js/Windows Terminal 下禁用（`ink/terminal.ts` 的 `#JRr`）。
- `ink/optimizer.ts · optimize`（`#mf`）：去空输出/零移动，合并相邻 cursorMove 与 styleStr，连续 cursorTo/光标显隐只留最后一个，重复超链接去掉。
- `ink/terminal.ts · writeDiffToTerminal`（`chunk-24t3dkzb.js#abo`）：拼成一个字符串一次写出，支持同步输出时包 `CSI ?2026h … CSI ?2026l`（BSU/ESU）。同步输出支持来自能力探测（DECRQM 2026），`CLAUDE_CODE_FORCE_SYNC_OUTPUT` 在非 tmux 下强制开。
- `Ink` 的 `onRender` 还会：叠加选区背景（`applySelectionOverlay`，`#Gg`）、搜索高亮（`applySearchHighlight`）、悬停超链接下划线（`underlineHyperlinkAt`）、备用屏锚点、声明光标定位（`useDeclaredCursor`，供 IME 和读屏器；原生光标由 `CLAUDE_CODE_NATIVE_CURSOR` / `CLAUDE_CODE_ACCESSIBILITY` / GrowthBook `tengu_native_cursor` 决定，DECSTBM 开时不用）、iTerm2 图片序列；stdout 积压时暂缓（`CLAUDE_CODE_NONBLOCKING_STDOUT` 或 `tengu_event_loop_stall` 开启非阻塞 stdout）。
- 帧常量（`chunk-bzr73sfg.js#Ks`）：帧间隔 16ms、最多跳 5 帧、慢帧 50ms、列上限 8192、行上限 2048。

### 3.8 屏幕阅读器模式

`INK_SCREEN_READER` 为真（或 `isScreenReaderEnabled` 选项）时不画网格：`renderNodeToScreenReaderOutput`（`#zl`）把 DOM 转成线性文本（aria-label 优先、`role: ` 前缀、状态前缀、column 用换行 row 用空格），`Ink` 的 `onRenderScreenReader` 按文本 diff 输出；`sanitizeForScreenReader` 去掉转义与双向控制字符。

## 4. 全屏 / 备用屏幕与滚动

- **全屏渲染器**：设置 `tui: "fullscreen"`（等价 `CLAUDE_CODE_NO_FLICKER=1`）启用「无闪烁的备用屏渲染器 + 虚拟化回滚」；`"default"` 是主屏经典渲染器（setting schema 在 `chunk-dcmhvw5a.js`）。相关环境变量还有 `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN`、`CLAUDE_CODE_DISABLE_MOUSE`、`CLAUDE_CODE_DISABLE_MOUSE_CLICKS`、`CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL`、`CLAUDE_CODE_SCROLL_SPEED`、`CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT`（每帧整屏重画，动画帧间隔至少 480ms）。
- `<AlternateScreen>`（`chunk-2f336bka.js#zke`）：挂载时 DEC 1049 进备用屏，按 `mouseTracking`（默认 full）开鼠标跟踪，可设 surface 背景/前景色（OSC 11/10）；卸载 `leaveAlternateScreen`。
- `Ink` 的 `setAltScreenActive`：进入前保存主屏帧并生成擦除序列（`eraseMainScreenFrame`，`#Gv`），退出时恢复；备用屏帧带锚点 cursor（`ALT_SCREEN_ANCHOR_*`）。
- `TerminalModes`（`chunk-24t3dkzb.js#lgt`，316 新增）：按层记录已打开的终端模式（鼠标、像素鼠标 1016、表面颜色、括号粘贴 2004、主题报告 2031、焦点 1004、扩展键、备用屏），`suspend/resume` 在 Ctrl+Z 挂起或把终端交给子进程时成组关闭/重开；stdin 静默 5s 后重申（`STDIN_IDLE_REASSERT_MS`）。退出/崩溃时 `restoreTerminalModes`（`#YRr`）全部复位、kitty 键盘弹栈、显示光标、清进度条。
- `<ScrollBox>`（`chunk-01xdq6fy.js#K`）：overflow scroll 的 box，默认作为 `selectionScope`；ref 暴露 `scrollTo/scrollBy/scrollToBottom` 等；滚轮事件、`stickyScroll`（粘底）、`scrollAnchor`。滚动跟踪调试 `ScrollTrace`（`#av`）。
- JetBrains 终端（JediTerm）滚轮 bug 修正（`chunk-24t3dkzb.js#fIs`）：滚轮后 75ms 内的无修饰上下方向键视为触控板副产物丢弃；方向键连发检测（100ms 内 ≥8 个，`detectArrowBurst`）。

## 5. 输入事件解析

### 5.1 读取

`ink/components/App.tsx`（`#As`）在原始模式下读 stdin。读取器（`chunk-bzr73sfg`，写作时未归属，现在 `ink/line-width-cache.ts`；`createInputReaderState`/`feedInputReader`/`flushInputReader`）：

- 半截转义序列等 50ms 后冲刷（单独的 ESC 才算 Esc 键），括号粘贴等 2s，截断的鼠标前缀 2s 后丢弃（`#Wn`）。
- `EventLoopLagWatcher`（`#td`）：事件循环被阻塞 ≥50ms 后读到的 ESC 前缀打 `readLate` 标记（避免把迟到合并的 `ESC x` 误判为 Alt+x）。
- 以 ESC 开头的整块拆成 ESC + 其余分别解析（`splitEscPrefixedChunk`）。

### 5.2 分词与解析

- `ink/termio/tokenize.ts · createTokenizer`：流式状态机（ground/escape/csi/ss3/osc/dcs/apc/pm/sos），未完成序列留在缓冲；输入模式识别 X10 鼠标三字节。
- `ink/parse-keypress.ts · parseMultipleKeypresses`（`#Ua`）产出 `ParsedInput[]`：`key`、`mouse`、`paste`、`focus`、`response`。
  - **括号粘贴**：`PASTE_START`（`csi("200~")`）… `PASTE_END`（`csi("201~")`）之间收进 pasteBuffer，产出 `{kind:'paste'}`；粘贴期间的 CSI u 按键还原成字符（`csiKeyToPasteText`）。`PasteEvent`（`#Eye`）清洗 C1 控制字符、DCS/APC 串、全角空格。
  - **kitty 键盘协议**：`CSI code[:shifted[:base]];mods u`（`CSI_U_RE`），316 推送 `CSI >5u`（消歧 + 所有键报告为转义码；`legacyKitty` 时用旧的 `>1u`），2.1.88 只有 `>1u`。kitty 小键盘私有码 57399–57426 映射成数字/运算符/方向（`codePointToKeyName`）；Ctrl+[、Ctrl+M、Ctrl+I、Ctrl+H 还原成 escape/return/tab/backspace。
  - **modifyOtherKeys**：`CSI 27;mod;code ~`。修饰参数 `1+位掩码` 解码为 shift/meta/ctrl/super（`#_c`）。
  - **win32-input-mode**（316 新增，Windows Terminal）：`CSI Vk;Sc;Uc;Kd;Cs;Rc _`，`decodeWin32InputSequence`（`#Mp`）还原成等价 VT 序列（导航键、F1–F12、修饰键编码、AltGr、重复次数、代理对）。
  - **AltGr**：`CLAUDE_CODE_ALTGR_AS_TEXT` 真→总把 Ctrl+Alt+可打印字符当文字，假→从不；默认在 Windows Terminal 里 auto（字母数字仍当快捷键）。
  - **退格**：`CLAUDE_CODE_BS_AS_CTRL_BACKSPACE` 决定 `\b` 是否当 Ctrl+Backspace（默认只在 win32 非 mintty 时）。
  - 键序列方言（st、rxvt）按会话里的探测结果或 TERM 推断。
  - **鼠标**：SGR `ESC[<b;x;yM/m`、X10、像素坐标模式 1016（`pixelToCellPoint` 保留精确值 `fine`）；滚轮（按钮 64/65）变成 `wheelup/wheeldown` 键。
  - **焦点**：`FOCUS_IN`（`csi("I")`）/ `FOCUS_OUT`（`csi("O")`）（DEC 1004）→ `TerminalFocusContext`。
  - **终端应答**（`parseTerminalResponse`，`#Tp`）：DECRPM、DA1/DA2、kitty 键盘标志、光标位置、主题变化通知（`?997`）、单元格像素尺寸（`CSI 6;h;w t`）、OSC、XTVERSION、kitty 图形应答 → 交给 `TerminalQuerier`。

### 5.3 终端能力探测（316 新增）

`probeTerminalCapabilities`（`chunk-bzr73sfg.js#bb`）进原始模式后分两轮查询（各 2s 超时，DA1 作哨兵：收到它说明前面的查询没有应答）：第一轮 XTVERSION（VTE<0.53 不问）、kitty 键盘标志 `CSI ?u`、OSC 7501 程序状态；第二轮 DECRQM 2026（同步输出）、DECRQM 1016（像素鼠标）、kitty 图形查询（id 31）、`CSI 16t` 单元格尺寸。能力表初值 `getInitialCapabilities`（`chunk-dxdtyerk.js#vQs`）由环境变量推断，每项 `{settled|likely, source}`；tmux 下额外 `tmux display-message` 取 pane 位置与 passthrough 设置（终端图片用）。`ink/terminal-querier.ts · TerminalQuerier`（`#fbo`）负责排队与匹配。

### 5.4 分发

`processKeysInBatch`（`#Cb`，`ink/components/App.ts` 中的模块级函数）在 `discreteUpdates` 中处理一批输入：终端应答 → querier；鼠标 → `handleMouseEvent`（`#yC`）；焦点；粘贴 → `PasteEvent`；按键 → `KeyboardEvent`（`#Rce`，带 `key/name/ctrl/shift/meta/superKey/fn/soloKeypress/readLate`）经 `Dispatcher` 从焦点节点做捕获/冒泡（`onKeyDownCapture` / `onKeyDown`），旧式 `useInput` 订阅者仍通过 StdinContext 的事件发射器收到。

鼠标链：悬停（`dispatchHover`，`onMouseEnter/Leave`；`hoverFollowsPaint` 重绘后重判）；左键按下开始选区或计多击（`DOUBLE_CLICK_MS=300`，窗口激活点击不计）；松开没有选区则 `dispatchClick`（`#Tb`，最近的可聚焦祖先获焦，`onClick` 冒泡）；`onPointer`（`PointerEvent`，316 新增）用于拖动类组件；右键/中键松开：Windows/WSL/Linux 右键有选区则清除（已复制）否则粘贴系统剪贴板，Linux 中键粘贴 PRIMARY（`handleMiddleOrRightClickPaste`）。

焦点：`FocusManager`（`ink/focus.ts`，`#G_o`）焦点栈、Tab/Shift+Tab、316 新增方向键焦点移动（`directionalFocusScore`）、`tabIndex=-1` 容器解析到上次聚焦的子孙。

## 6. 选区与复制

- 状态 `createSelectionState`（`ink/selection.ts`，`#Ng`）：`anchor`、`focus`、`isDragging`、`anchorSpan`（双击 word / 三击 line）、`scrolledOffAbove/Below`（滚出视口的已选文本行及其软换行标记）、虚拟行列（端点被滚动钳到边界时记录，滚回来可还原）、`scope`（列范围）。
- 操作：`startSelection`、`updateSelection`、`finishSelection`、`selectWordAt`（`_g`：先识别纯文本 URL 整条当一个词，否则按字符类扩展，遇 noSelect 停）、`selectLineAt`、`extendSelection`（按词/行拖动）、`moveSelectionFocus`（Shift+方向键）、`shiftSelection`（内容滚动时平移）、`captureScrolledRows`（滚动前把将滚出的已选行存起来）。
- `selectionScope`（`findSelectionScope`，`#ef`）：拖选限制在最近的 `style.selectionScope` 祖先内（去边框内边距、受外层 overflow 裁剪），ScrollBox 默认是 scope。
- 取文字 `getSelectedText`（`#Ig`）：缓存的上方行 + 屏幕行 + 缓存的下方行，跳过 noSelect（`<NoSelect>`、行号栏）与宽字符占位格，按 softWrap 把折行拼回、补回被吞的分隔空格，硬换行去行尾空白。
- 纯文本 URL 识别（`findPlainTextUrl`，`#Lg`）：http/https/file，沿软换行拼回，`…` 截断的不算，去尾标点与不配对右括号。悬停时同一 OSC 8 链接跨行加下划线。
- 绘制：`applySelectionOverlay` 把选区内格换成 `withSelectionBg` 派生样式（`setSelectionBgColor` 可改色）。
- **复制**（`ink/termio/osc.ts · setClipboard`，`chunk-dxdtyerk.js#IA`）：本地（非 SSH）先用原生方式——macOS `pbcopy`、Linux `wl-copy`（Wayland）或 `xclip`/`xsel`（同时写 clipboard 与 primary）或原生插件、Windows/WSL PowerShell `Set-Clipboard`；在 tmux 里写 tmux 粘贴缓冲（`load-buffer -w`）；再发 OSC 52（tmux/screen 透传包装）。VS Code 1.123/1.124 的 OSC 52 会把非 ASCII 弄乱，给出提示。`readClipboard` 供中键/右键粘贴。快捷键 `selection:copy` 默认 `ctrl+shift+c` / `cmd+c`（Scroll 上下文）。

## 7. 其他终端功能（316 新增为主）

- **终端内联图片**：`TerminalImageManager`（`#hf`）为图片分配 id（kitty 小 id 池 + 24 位宽 id、iTerm2 位置复用），排队传输 kitty APC `G` 与删除，终端拒绝时记录；文本里用占位字素（U+2800 + 行/列/id 的组合附加符号，`encodeImagePlaceholder`）占位置；iTerm2 走 `OSC 1337;File=`（RGBA→PNG 编码在 JS 里做）。tmux 下需要 tmux ≥3.3、`allow-passthrough on`、`focus-events on`，外层终端 kitty ≥0.28 / Ghostty / iTerm2 ≥3.5，不满足时给出具体提示文字（`chunk-m4dvt8pp.js`）。`CLAUDE_CODE_FORCE_TERMINAL_IMAGES` 强制。
- **超链接**：`supportsHyperlinks`（npm supports-hyperlinks + 补充终端名单 + JetBrains + Windows Terminal），会话状态里的 `hyperlinks` 或 `FORCE_HYPERLINK` 优先；OSC 8 带由 URL 哈希得到的 id。
- **通知/进度/标题**：`useTerminalNotification`（iTerm2 OSC 9、kitty OSC 99、Ghostty OSC 777、BEL、OSC 9;4 进度条——ConEmu、Ghostty ≥1.2.0、iTerm2 ≥3.6.6），`useTerminalTitle`（OSC 0，`CLAUDE_CODE_DISABLE_TERMINAL_TITLE` 关闭）。标签页状态 OSC 21337（`useTabStatus`）在 316 中 `isTabStatusEnabled` 恒为 false。
- **颜色**：VS Code 终端 256 色提升为真彩；已知真彩 TERM（alacritty、ghostty、wezterm、xterm-kitty 等）提升；tmux 下降到 256 色（`CLAUDE_CODE_TMUX_TRUECOLOR` 不降）；`NO_COLOR`/`FORCE_COLOR` 优先。
- 后台会话（`CLAUDE_CODE_SESSION_KIND=bg`、`CLAUDE_BG_BACKEND`=`daemon`）不挂起、容忍 stdout 关闭、不用 DECSTBM。
- 调试：`CLAUDE_CODE_DEBUG_REPAINTS`（记录重绘行的组件所有者链）、`CLAUDE_CODE_BENCH_LIVE_COUNTS`、`RenderDebugHud`（样式图集面板）。

## 8. 快捷键系统

### 8.1 加载

- 文件：`<配置目录>/keybindings.json`（`getKeybindingsPath`），格式 `{"$schema": "...", "$docs": "...", "bindings": [{"context": "Chat", "bindings": {"ctrl+k": "chat:clearInput", "ctrl+x ctrl+e": null, "ctrl+g": "command:compact"}}]}`。`null` 解绑默认键；`command:<名字>` 执行斜杠命令（只能放 Chat 上下文）。
- 总开关：GrowthBook `tengu_keybinding_customization_release`（默认 true）；策略禁止 `keybindings` 时也只用默认绑定（`isKeybindingCustomizationBlocked`）。
- 进程级状态 `keybindingsState`（`createKeybindingsState`，`chunk-x1mwqya5.js#Fn`）：bindings、warnings、watcher、`changed` 信号、每日一次的 `tengu_custom_keybindings_loaded` 事件日期、`tengu_keybinding_fired` 节流表（同一动作 1s 一次）。
- 流程：`KeybindingSetup` 首次渲染同步 `loadKeybindingsSync`（`#SVt`）→ 挂载后 `initializeKeybindingWatcher`（chokidar，轮询 2s、写入稳定 500ms；add/change → `loadKeybindingsAsync` 热重载，unlink → 默认绑定）→ 订阅 `changed` 更新。交互会话启动时可先从后端存储预热（`warmKeybindingsFromBackend`）。
- 合并规则：默认绑定在前、用户绑定在后，**同上下文同和弦以列表中最后一条为准**。

### 8.2 校验（`keybindings/validate.ts`）

`validateBindings` = 结构（必须 `bindings` 数组，块要有字符串 context 与对象 bindings）+ 上下文合法 + 动作合法（未知动作用编辑距离 ≤2 给建议，`suggestAction`）+ 按键串（316 新增 `validateKeystroke`：`+` 前面不是修饰键、`+` 两侧有空格、空的部分，给出 Did you mean）+ `command:` 名字格式与上下文 + `voice:pushToTalk` 绑无修饰字母警告 + 同上下文重复（`checkDuplicates`）+ 原始 JSON 重复键（`checkDuplicateKeysInJson`）+ 保留键（`checkReservedShortcuts`）。警告写调试日志并在 UI 提示。

保留键（`chunk-6qssfmzs.js#X5e`）：
- 不可重绑（error）：`ctrl+c`、`ctrl+d`（硬编码中断/退出）、`ctrl+m`（=Enter）、`ctrl+[`（=Esc）、`ctrl+i`（=Tab）、`ctrl+h`（=Backspace）、`capslock`。
- 终端：`ctrl+z`（SIGTSTP，warning）、`ctrl+\`（SIGQUIT）。
- macOS：`cmd+c/v/x/q/w/tab/space`。

### 8.3 按键串语法

`parseKeystroke`：`+` 连接修饰键与键名；修饰键 `ctrl`/`control`、`alt`/`opt`/`option`、`shift`、`meta`、`cmd`/`command`/`super`/`win`；键名别名 `esc`、`return`、`del`、`space`、箭头符号。和弦用空格分隔（`ctrl+x ctrl+s`）。比较时 alt 与 meta 视为同一键（终端无法区分）。显示时 macOS 用 opt/cmd，其他平台 alt/super；iTerm2/Apple Terminal 下即使不是 macOS 主机也按 macOS 显示（`getShortcutDisplayPlatform`）。

### 8.4 解析与分发

- `resolveKeyWithChordState(event, contexts, bindings, pending)`（`chunk-x1mwqya5.js#Wrt`）：Esc 在和弦中取消；把按键（`keyEventToKeystroke`：大写字母隐含 shift，macOS Option 特殊字符还原为 alt+键）追加到待定和弦；有更长绑定以它为前缀且有非 null 动作 → `chord_started`；精确匹配 → `match`（null → `unbound`）；和弦中无匹配 → `chord_cancelled`；否则 `none`。
- `resolveKeyInScopeChain`（`#m5r`，316 新增）：按传入的上下文顺序取第一个上下文的胜者。
- 和弦超时 3000ms（2.1.88 为 1000ms），超时弹 "… cancelled — no next key within 3s" 通知。
- `ChordInterceptor`（`chunk-xe7zq1p4.js#Wt`）：挂在根 Box（`keybindingScope: "Global"`、`tabIndex=-1`）的 `onKeyDownCapture` / `onWheelCapture` 上，统一分发：
  - **legacy 模式**：在「有处理器的上下文 + 活动上下文（`useRegisterKeybindingContext`）+ Global」里解析；匹配后调用 `useKeybinding` 注册的处理器（非回退优先；保留键或无修饰键时跳过回退处理器）。
  - **scopeChain 模式**（316 新增）：按焦点节点到根的 `keybindingScope` 链（及 `preemptiveScopes`）解析，匹配后先把动作作为事件派给 DOM 节点（`onAction`），没处理再落回注册表；焦点在文本输入（`attributes.textEntry`）上时无修饰单字符直接交给预分发处理器（`registerPreDispatch`）。
  - 消费的事件 `preventDefault + stopImmediatePropagation`；滚轮转成 `wheelup/wheeldown` 参与解析。
- `KeybindingProvider`（`chunk-8pssrarc.js#L0t`）提供 `resolve`、`getDisplayText`、`registerHandler`、`hasHandler`、`runAction`、`registerPreDispatch`、`singleKeyEvent` 等；`useShortcutDisplay` 取显示文字，拿不到时用组件给的回退文字并发 `tengu_keybinding_fallback_used`。
- `/keybindings` 模板生成 `generateKeybindingsTemplate`：`$schema` `https://www.schemastore.org/claude-code-keybindings.json`、`$docs` `https://code.claude.com/docs/en/keybindings`，去掉 FeedbackSurvey 与保留键。

### 8.5 上下文

29 个（`KEYBINDING_CONTEXTS`）：Global、Chat、Autocomplete、Confirmation、Help、ProactivityMenu、Transcript、HistorySearch、Task、ThemePicker、Settings、Tabs、Attachments、Footer、AbovePrompt、AbovePromptInput、AbovePromptSelect、Pane、PaneField、MessageSelector、DiffDialog、DiffPanel、FeedbackSurvey、ModelPicker、EffortSlider、Select、Plugin、Scroll、Agents。2.1.88 的 schema 列了 18 个（默认表里另用了 Scroll、MessageActions）；316 把 Scroll 列入 schema，默认表不再有 MessageActions。

### 8.6 默认绑定表（`keybindings/defaultBindings.ts`，`chunk-6qssfmzs.js#c`）

平台变量：`IMAGE_PASTE_KEY` 在 Windows/WSL 为 `alt+v`（WSL 另加 `ctrl+v`），其他 `ctrl+v`；`CYCLE_MODE_KEY` 在 Windows 上若运行时支持（Bun ≥1.2.23，或 Node 22.17+/24.2+）为 `shift+tab`，否则 `meta+m`，其他平台 `shift+tab`。

| 上下文 | 绑定 |
|---|---|
| Global | ctrl+c app:interrupt；ctrl+d app:exit；ctrl+t app:toggleTodos；ctrl+o app:toggleTranscript；ctrl+shift+b app:toggleBrief；ctrl+r history:search；ctrl+up / meta+up app:diffFileListUp；ctrl+down / meta+down app:diffFileListDown；ctrl+] app:openArtifact |
| DiffPanel | ctrl+x b app:cycleDiffBase |
| FeedbackSurvey | ctrl+x 1/2/3 feedbackSurvey:bad/fine/good |
| Chat | escape chat:cancel；ctrl+l chat:clearInput；cmd+k chat:clearScreen；ctrl+x ctrl+k chat:killAgents；CYCLE_MODE_KEY chat:cycleMode；meta+p chat:modelPicker；shift+up/down chat:increaseEffort/decreaseEffort；meta+o chat:fastMode；ctrl+y chat:defaultToNewerModel；meta+t chat:thinkingToggle；meta+w chat:workflowKeywordToggle；enter chat:submit；ctrl+x enter chat:queueSubmit；ctrl+x ctrl+s / ctrl+enter chat:sendNow；ctrl+j chat:newline；up/down history:previous/next；ctrl+_ / ctrl+- / ctrl+shift+- / ctrl+shift+_ chat:undo；ctrl+x ctrl+e / ctrl+g chat:externalEditor；ctrl+x ctrl+a abovePrompt:toggle；ctrl+x tab abovePrompt:focus；ctrl+s chat:stash；IMAGE_PASTE_KEY chat:imagePaste；space voice:pushToTalk |
| Autocomplete | tab accept；escape dismiss；up previous；down next |
| Settings | escape confirm:no；up/k/ctrl+p select:previous；down/j/ctrl+n select:next；home/end select:first/last；pageup/pagedown select:pageUp/pageDown；space/enter select:accept；/ settings:search；r settings:retry；d settings:periodDay；w settings:periodWeek；f settings:fixUsage；t settings:sortByTokens；ctrl+u/ctrl+d scroll:halfPageUp/halfPageDown |
| Confirmation | enter confirm:yes；escape confirm:no；up/down confirm:previous/next；tab confirm:nextField；space confirm:toggle；CYCLE_MODE_KEY confirm:cycleMode |
| Tabs | tab/right tabs:next；shift+tab/left tabs:previous |
| Transcript | ctrl+e transcript:toggleShowAll；ctrl+c/escape/q transcript:exit；ctrl+u/ctrl+d 半页；ctrl+b/b 整页上；ctrl+f/space 整页下；ctrl+n/j/down lineDown；ctrl+p/k/up lineUp；g/home scroll:top；shift+g/end scroll:bottom |
| HistorySearch | ctrl+r next；escape/tab accept；ctrl+c cancel；enter execute；ctrl+s cycleScope |
| Task | ctrl+x ctrl+b / ctrl+b task:background |
| ThemePicker | ctrl+t theme:toggleSyntaxHighlighting；ctrl+e theme:editCustom |
| Scroll | pageup/pagedown scroll:pageUp/pageDown；wheelup/wheeldown lineUp/lineDown；ctrl+home/ctrl+end top/bottom；ctrl+shift+c / cmd+c selection:copy；shift+left/right/up/down selection:extendLeft/Right/Up/Down；shift+home/end selection:extendLineStart/End |
| Help | escape help:dismiss |
| Attachments | right next；left previous；backspace/delete remove；down/escape exit |
| Footer | up/ctrl+p footer:up；down/ctrl+n footer:down；right next；left previous；enter openSelected；escape clearSelection；x close |
| AbovePrompt | tab/right abovePrompt:next；shift+tab/left previous；enter/space press；escape leave；up/down pane:scrollUp/Down；pageup/pagedown pane:pageUp/Down；home/end pane:top/bottom |
| AbovePromptInput | tab next；shift+tab previous；enter press；escape leave |
| AbovePromptSelect | tab next；shift+tab previous；down/up highlightNext/Previous；enter press；escape leave |
| Pane | tab/shift+tab/enter/escape 同 AbovePrompt；上下翻页同上；ctrl+x left/up pane:grow；ctrl+x right/down pane:shrink；ctrl+x x pane:close |
| PaneField | ctrl+x x pane:close |
| DiffDialog | escape diff:dismiss；left/right previousSource/nextSource；up/k previousFile；down/j nextFile；pageup/pagedown；space/shift+space/b 翻整页；g/home top；shift+g/end bottom |
| ModelPicker | left/right modelPicker:decrease/increaseEffort；s thisSessionOnly |
| EffortSlider | left/right decrease/increaseEffort；tab toggleUltracode；s thisSessionOnly |
| Select | up/k/ctrl+p previous；down/j/ctrl+n next；pageup/pagedown；home/end first/last；enter accept；escape cancel |
| Plugin | space toggle；i install；f favorite；ctrl+s cycleMarketplace |
| Agents | ctrl+s switchView；ctrl+t togglePin；ctrl+f find；ctrl+r rename；ctrl+up/meta+up previousGroup；ctrl+down/meta+down nextGroup |

（ProactivityMenu、MessageSelector 没有默认绑定；`...{}`/`...!1` 位置是构建时去掉的特性分支。）

## 9. vim 模式

### 9.1 状态

- 模式：`INSERT`（初始，`createInitialVimState` = `{mode:"INSERT", insertedText:""}`）、`NORMAL`、`VISUAL`（316 新增，字符可视 v / 整行可视 V）。模式切换在 `hooks/useVimInput.ts`（ui 领域，`chunk-530hfzwb.js#M_o`）。
- 持久状态 `createInitialPersistentState`：`lastFind`（f/F/t/T + 字符）、`register`、`registerIsLinewise`。
- 316 新增插入模式 Esc 映射：设置 `vimInsertModeRemaps` 中映射到 `<Esc>` 的两字符序列（如 `jk`）。
- 计数上限 10000（`MAX_VIM_COUNT`）。

### 9.2 普通模式状态机（`vim/transitions.ts · transition`，`chunk-530hfzwb.js#qe`）

命令状态 `{type}`：

```
idle ──1-9──▶ count ──数字──▶ count
 │  0 → 行首        │ 其他键 → handleNormalInput(带计数)
 │
 ├─ d/c/y ─▶ operator ──同键（dd、cc、yy）──▶ 执行整行操作
 │            ├─1-9─▶ operatorCount（总计数=操作符计数×移动计数）
 │            ├─i/a─▶ operatorTextObj ──w W " ' ` ( ) b [ ] { } B < >──▶ 执行
 │            ├─f/F/t/T─▶ operatorFind ──字符──▶ 执行
 │            ├─g─▶ operatorG ──g、j、k──▶ dgg / dgj / dgk
 │            ├─G──▶ dG / d{n}G
 │            └─移动键──▶ executeOperatorMotion
 ├─ f/F/t/T ─▶ find ──字符──▶ 移动
 ├─ g ─▶ g ──g、j、k──▶ gg / {n}gg / gj / gk
 ├─ r ─▶ replace ──字符──▶ executeReplace
 ├─ > / < ─▶ indent ──同键──▶ executeIndent
 └─ 其他：移动（h l 空格 退格 j k gj gk w b e W B E 0 ^ $ G %）、
         单键命令 ~ x s S J p P D C Y ; , u i I a A o O、. 重复
```

返回 `{next: 新状态}` 或 `{execute: 动作, wanted?: 目标列}`（j/k 保持目标列，`$` 记为无穷）。

### 9.3 可视模式（316 新增，`visualTransition`，`chunk-530hfzwb.js#Ht`）

状态 idle/count/find/g/replace/textObject；返回 `{next, move, wanted}` 或 `{exit: ...}`：x s X D C S R Y → 删除/修改/复制（大写强制整行）；r{char} 替换；~ u U 大小写；p P 用寄存器替换选区；> < 缩进；v V 切换种类；o 交换两端；J 合并；iw/a( 等扩到文本对象；移动键扩展选区。可视操作记录 `span`（行数或字素数），`.` 按同样大小重复（`getRepeatVisualRange`）。

### 9.4 操作（`vim/operators.ts`）

`applyOperator`（字符范围）、`applyLinewiseOperator`（行号范围）：内容写寄存器（整行补换行），yank 只移光标，delete 删除并修正光标（`clampCursorOffset`：普通模式光标不停在换行符上），change 删除后进插入模式。`getOperatorRange` 实现 vim 兼容细节（cw≈ce、dw 不越过行尾、包含式移动 e E $ %、跨行删除整行化），并把端点推出图片/粘贴占位符（`snapOutOfPlaceholder`）。其余：`executeX`、`executeSubstitute`、`executeReplace`、`executeToggleCase`、`executeJoinLines`/`executeJoin`、`executePaste`、`executeIndent`、`executeOpenLine`、`executeOperatorG/Gg`、`executeRepeatFind`。`recordRepeatableChange` 记录给 `.` 用（yank 不记）。

文本对象（`findTextObject`，`chunk-530hfzwb.js#re`）：w/W 按字素分类，成对引号在同一行配对，括号按嵌套深度向外找（`PAIRS`）。

## 10. native-ts 的另外两个库

- **color-diff**（`ColorDiff`、`ColorFile`，`chunk-cwwxybjc.js#O`、`chunk-cwwxybjc.js#H`）：主题按界面主题名选（dark → Monokai Extended，light → GitHub，ansi → 16 色；daltonized 新增行用蓝色），用户主题的 `diffAdded/diffRemoved/diffAddedWord/diffRemovedWord` 可覆盖背景；语言识别按文件名、扩展名、shebang；highlight.js 高亮（长行降级、复杂度超阈值停高亮）；相邻删除/新增行配对做单词级 diff（改动占比 >40% 放弃）；折行、行号栏、`renderSplit` 分出行号与内容两列；颜色按 truecolor / 256 色输出。
- **file-index**（`FileIndex`，`chunk-dcmhvw5a.js#NIn`）：路径小写 + a–z 位图预过滤，贪心子序列匹配，fzf 风格打分（匹配 16、边界 8、驼峰 6、连续 4、首字符 8、间隙 -3/-1），路径与文件名两种匹配取高，短路径加分，top-k 有序插入，名次归一化分数（含 test 的路径略降权）；异步构建每 4ms 让出事件循环、部分就绪即可查询；空查询返回顶层条目。

## 11. 配置项、环境变量与特性开关

| 名字 | 作用 |
|---|---|
| 设置 `tui`（default / fullscreen）、`CLAUDE_CODE_NO_FLICKER` | 全屏备用屏渲染器 |
| `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN`、`CLAUDE_CODE_DISABLE_MOUSE`、`CLAUDE_CODE_DISABLE_MOUSE_CLICKS`、`CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL`、`CLAUDE_CODE_SCROLL_SPEED` | 全屏相关 |
| `CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT` | 备用屏每帧整屏重画 |
| `CLAUDE_CODE_DECSTBM` / GrowthBook `tengu_marlin_porch`（默认 false） | DECSTBM 滚动区域优化 |
| `CLAUDE_CODE_FORCE_SYNC_OUTPUT` | 强制同步输出（非 tmux） |
| `CLAUDE_CODE_NATIVE_CURSOR` / `CLAUDE_CODE_ACCESSIBILITY` / GrowthBook `tengu_native_cursor` | 真实终端光标跟随声明位置 |
| `INK_SCREEN_READER` | 屏幕阅读器线性输出 |
| `CLAUDE_CODE_NONBLOCKING_STDOUT` / GrowthBook `tengu_event_loop_stall` | 非阻塞 stdout |
| `CLAUDE_CODE_ALTGR_AS_TEXT`、`CLAUDE_CODE_BS_AS_CTRL_BACKSPACE` | 按键解释 |
| `CLAUDE_CODE_TMUX_TRUECOLOR`、`NO_COLOR`、`FORCE_COLOR` | 颜色 |
| `FORCE_HYPERLINK` | 超链接 |
| `CLAUDE_CODE_FORCE_TERMINAL_IMAGES` | 终端图片 |
| `CLAUDE_CODE_DISABLE_TERMINAL_TITLE` | 窗口标题 |
| `CLAUDE_CODE_SESSION_KIND=bg`、`CLAUDE_BG_BACKEND`=`daemon` | 后台会话行为 |
| `CLAUDE_CODE_DEBUG_REPAINTS`、`CLAUDE_CODE_BENCH_LIVE_COUNTS` | 调试 |
| 终端识别：`TERM`、`TERM_PROGRAM`、`LC_TERMINAL`、`WT_SESSION`、`TMUX`、`TMUX_PANE`、`ZELLIJ`、`WAYLAND_DISPLAY`/`DISPLAY` | 能力推断 |
| GrowthBook `tengu_keybinding_customization_release`（默认 true） | 允许自定义快捷键 |
| GrowthBook `tengu_startup_notice` | 启动提示通知（被归在 keybindings 里的 `useStartupNotice`） |
| 设置 `useAdaptiveDrain` | 滚动排水算法 |
| 设置 `vimInsertModeRemaps` | 插入模式 jk→Esc |
| 遥测：`tengu_custom_keybindings_loaded`、`tengu_keybinding_fired`、`tengu_keybinding_fallback_used`；特性事件 `keybinding_load_user_config`、`keybinding_watcher_init`、`keybinding_hot_reload` | 快捷键 |

## 12. 与 2.1.88 的差异

渲染：
- 写屏改为私有原生 `Bun.ant.CellSegmenter`（第 3.5 节），无回退。
- yoga 移植改为 Int32 存储、pointScaleFactor 0/1、缓存拆成布局 8 槽 + 测量 4 槽 + flex basis 缓存，模块级输出变量代替返回对象。
- Screen 增加 `cells64` 视图、`damage` 驱动 diff、softWrap 打包含 `SW_ELIDED_SEP`、样式池按帧压缩与池子换代迁移、`StylePoolMonitor`（`chunk-bzr73sfg.js#Md`）。
- DECSTBM 滚动优化（受开关控制）、自适应/比例两种滚动排水、`selectionScope`、`hoverFollowsPaint`、`ImperativeTree`、屏幕阅读器输出、`LineWidthCache` 类、宽字素右边界修补。

输入与终端：
- kitty 键盘协议 `>5u`（旧 `>1u`），win32-input-mode、AltGr 模式、退格方言、像素鼠标 1016、`EventLoopLagWatcher` 迟到标记。
- 终端能力两轮探测（XTVERSION、kitty 标志、OSC 7501、DECRQM 2026/1016、kitty 图形、单元格尺寸）与能力表；`TerminalModes` 分层管理与挂起恢复；JetBrains 滚轮修正。
- 终端内联图片（kitty / iTerm2、tmux 透传）。
- `PasteEvent`、`WheelEvent`、`PointerEvent`/`onPointer`、方向键焦点移动、原始模式按需打开。
- OSC 21337 标签状态写入被关闭。

快捷键：
- schema 上下文从 18 个增加到 29 个（新增 ProactivityMenu、AbovePrompt/AbovePromptInput/AbovePromptSelect、Pane、PaneField、DiffPanel、FeedbackSurvey、EffortSlider、Agents，Scroll 正式列入；默认表去掉 MessageActions）。
- scopeChain 分发（`keybindingScope`、`preemptiveScopes`、`onAction`、预分发、textEntry），回退处理器。
- 和弦超时 1s → 3s 并弹通知；`validateKeystroke` 细化报错；后端预热；`tengu_keybinding_fired` 事件。

vim：新增可视模式（v/V 及其全部操作与 `.` 重复）、`gj/gk` 屏幕行移动、`%` 括号跳转、`s`、插入模式 Esc 重映射、占位符感知的光标钳制；普通模式命令改为表驱动（`NORMAL_COMMANDS`）。

## 13. 未解之处

- `Bun.ant.CellSegmenter` 的原生实现不可见：双向重排的具体规则、宽度表来源、制表符展开格的样式、未知转义的处理只能按调用方约定推断（`chunk-m4dvt8pp.js#$7n`、`chunk-bzr73sfg.js` 的 `class pf`）。
- `chunk-bzr73sfg.js#Ks` 中 `RESIZE_SETTLE_MS/QUERY_TIMEOUT_MS/MAX_RESIZE_RETRIES/STDIN_RESUME_GAP_MS` 等名字按用途推测，置信度低。
- `chunk-bzr73sfg.js#gf`（RenderDebugHud）、`runSelectionTakeDown`/`createSelectionTakeDownSignal`（`#_v`/`#Ov`，selection take-down 信号）、`setTranscriptFrontCut`/`takeTranscriptFrontCut`（`#tbo`/`#Tv`，transcript front cut）的用途只看了局部。
- `chunk-x1mwqya5.js#gn`（预热绑定失效判断）语义不完全确定。
- vim 可视模式的部分辅助（`chunk-530hfzwb.js#Ct`、`#Rt`、`#Wt`、`#Kt`、`#_t`、`#Dt`、`#Wn`、`#rt`）名字是按形状推的，置信度 0.5–0.65。
- `chunk-3s7ydtfd.js` 66841–79265 的图表渲染器、`chunk-yb0ajcmt.js` 的盒线画布、`chunk-4121qate.js` 的声明式 UI 样式校验不属于 ink，具体归属待对应领域确认（只给了低置信度名字）。

## 14. 引用校验结果

校验时间 2026-11-04 05:09（UTC），对象为当时的 `reconstructed/`。脚本检查本文所有代码样式引用：路径是否存在（相对仓库根，或相对 `reconstructed/src/`，`.ts/.tsx` 对应 `.js`）；声明 id 是否在 `reconstructed/symbols.jsonl`；"路径 · 函数名"中的函数是否属于该文件；标识符与字面量是否出现在 `reconstructed/symbols.jsonl` 或阅读树代码中。在 2.1.316 找不到、但在 2.1.88 源码（`references/claude-code-analysis/src`）中存在的，计为"只在 2.1.88 中存在"（删除项、旧名，属预期）。

- 共检查 722 处引用：路径 72/76（另 4 个只在 2.1.88 中存在），字面量 97/98（另 1 个只在 2.1.88 中存在），名字 444/444，声明id 104/104；占位符与含空格的说明性文字 107 处未检查。
- 只在 2.1.88 中存在（删除项或旧名，预期如此）：`ParsedInput[]`、`d/c/y`、`i/a`、`f/F/t/T`
- 未通过：0 处。
