# 领域 ink 过程记录（dom-ink）

## 做了什么

范围：`analysis/segments/domains.json` 的 `ink` 键，105 个模块、1064 个声明（ink/、ink.ts、native-ts/yoga-layout、native-ts/color-diff、native-ts/file-index、keybindings/、vim/）。另外顺带给了 `_unattributed/` 里明显属于 ink 的代码（输入读取器、终端能力探测、终端图片、LineCellSegmenter、屏幕阅读器、TerminalModes 等）命名和说明。

步骤：

1. `artifacts/tmp/ink/inventory.mjs` 列出全部声明（顶层绑定、现有名字来源、局部名数量），按 chunk 分组。
2. 用 `chunkview.mjs` / `domview.mjs`（调用 rename 库 `renameModule`，套用现有正式名 + 已写的语义名）逐 chunk 读 316 代码：`chunk-bzr73sfg`（Ink 主体，约 700 个声明）、`chunk-x6v6jz2y`、`chunk-24t3dkzb`、`chunk-dxdtyerk`、`chunk-wz6vk74d`、`chunk-m1vyn8g1`、`chunk-x1mwqya5`/`chunk-6qssfmzs`/`chunk-xe7zq1p4`/`chunk-8pssrarc`（快捷键）、`chunk-530hfzwb`（vim）、`chunk-cwwxybjc`（color-diff）、`chunk-dcmhvw5a`（file-index）以及几十个只有零星声明的 chunk。对照 2.1.88 源码取名，结论都以 316 代码为准。
3. 笔记写在 `artifacts/tmp/ink/notes/*.jsonl`（每行一个声明：顶层名、局部名、置信度、备注、说明）与 `notes/modules-ink.json`，`build-naming.mjs` 编译成三个交付文件并检查键是否存在、是否有歧义。
4. 写手册 `docs/handbook/ink.md`。
5. `lead-list.mjs` 从笔记的「误归 / 未归属 / 配错」备注生成下面的建议清单。

临时脚本与视图都在 `artifacts/tmp/ink/`（inventory、chunkview、domview、build-naming、patch-note、lead-list、各 *.view）。

## 数字

- `naming/semantic-ink.jsonl`：**2575 条**（顶层 1304、局部 1271）。
- `naming/docs-ink.jsonl`：**572 条**声明说明。
- `naming/modules-ink.json`：**105/105** 个模块。
- 声明覆盖：1064 个声明中 1059 个有笔记（剩下 5 个是 `X.displayName = ...` 语句和 yoga 枚举初始化这类无绑定声明）。其中 248 个确认是误归（不属于 ink），给了低置信度名字（0.3–0.6）并在备注写了应归哪里。
- 顶层绑定：1333 个中 1325 个有名字；原来完全没名字的 368 个里 360 个补上了。
- 说明覆盖：不算误归的、200 字节以上的声明 331 个，其中 286 个有说明（86%）；小常量和自解释的小函数只给名字。
- 置信度：2.1.88 同名且行为一致的 0.85–0.95；316 新代码按行为取名 0.6–0.8；误归代码 0.3–0.6；局部名比所属声明低 0.1。

## 遇到的问题

- **大量匹配错误**：指纹/亲和匹配把很多别处的小函数配到了 keybindings/parser.ts、reservedShortcuts.ts（路径、沙箱、平台判断函数，形状像 `getReservedShortcuts`/`chordToDisplayString`），把 316 新增的图表渲染器整块（108 个声明）配到 ink/screen.ts。旧版名配错的也不少（yoga 里 `resolveEdges4Into`、`layoutNode` 等名字错位；vim 里 `executeLineOp` 与 `executeOperatorMotion` 互换）。都用语义名覆盖了，并列入建议。
- 同一声明内同名局部变量（不同作用域）：在 build 脚本里加了 `name@N`（第 N 个）语法；一些对不上的就不命名。
- `tools/q.mjs callers` 在大 chunk 上超过 10 分钟没出结果，后来不用它查调用方，改为直接读 chunk。
- 子代理并发上限已满，全部自己做。
- 原生 `Bun.ant.CellSegmenter` 看不到实现，接口只能从调用方反推（手册 3.5 节）。

## 给 lead 的建议

格式：`声明 id（我给的名字） → 应归属路径 / 应叫什么，证据（现归模块）`。下面是 `lead-list.mjs` 从笔记生成的全量清单（215 组，353 个声明）；先列几条影响最大的：

- **chunk-3s7ydtfd.js 66841–79265 的 108 个声明**（`#Gr` CHART_ROW_DENSITIES、`#ni` layoutChart、`#AA` rasterizeChart、`#Ai` drawBrailleLine、`#Do` svgLine …）→ 应归一个新的图表模块（如 `utils/chart/*` 或 `components/Chart/*`），不是 `ink/screen.ts`。证据：按 form（bars/share/sparks/line/columns）排版、用盲文点阵画折线、输出 SVG `<line>`，与 Ink 屏幕缓冲无关。
- **keybindings/reservedShortcuts.ts 的 34 个、keybindings/parser.ts 的 18 个声明** → 分别属于路径身份/命名管道（`chunk-qg0af0yq.js` 一组）、沙箱拒绝路径与 Windows 路径正则（`chunk-fq0cr76a.js`）、网络路径检查（`chunk-t0gq9gyw.js`）、临时目录（`chunk-qchp9vrd.js`）、git/realpath（`chunk-s61vbvea.js`）、界面符号常量（`chunk-dcmhvw5a.js#$o` → `constants/figures.ts`）等。证据：函数体只做平台判断与路径处理，被指纹撞到 `getReservedShortcuts`/`chordToDisplayString`。
- **第三方代码混入 ink**：`chunk-spjgqa4y.js#On/#Un/#Yn`（npm qrcode 终端渲染器，现归 ink.ts）、`chunk-vwj6ccer.js#Ff/#ci/#Pc`（turndown，现归 ink/dom.ts）、`chunk-zxbmtfmw.js#R/#n`（npm cli-boxes，现归 render-border.ts）、`chunk-avfhvhz8.js#_`（npm supports-hyperlinks）、`chunk-6rgkw5kr.js#r`（npm is-unicode-supported，现归 ink/bidi.ts）、`chunk-bzr73sfg.js#bf`（npm indent-string）、`chunk-h6b7mazd.js`（axios utils，现归 parse-keypress.ts）、`chunk-7vb8p3zb.js#J/#q/#nos`（jsdiff diffArrays，现归 color-diff）→ 都应归 vendor。证据：与 npm 包源码逐字一致（错误信息、导出形状）。
- **ink/layout/yoga.ts 的 5 个声明全部误归**：`chunk-bzr73sfg.js#Hl/#LC/#lIs` 是终端图片占位编码（应归新模块如 `ink/termio/images.ts`），`chunk-10q8r8ck.js#Ut`、`chunk-td6byj4s.js#ne` 是 UI 组件。
- **chunk-bzr73sfg.js 里大量未归属的 ink 代码**应归 ink：`class pf`（LineCellSegmenter）→ `ink/output.ts`；`#bb`（probeTerminalCapabilities）→ `ink/terminal-querier.ts`；`#Ey/#ed/#Cy/#td`（输入读取器、EventLoopLagWatcher）→ `ink/parse-keypress.ts` 或 `App.tsx`；`#Eye/#Jd`（PasteEvent/WheelEvent）→ `ink/events/`；`#hf` 等（TerminalImageManager）→ 新模块；`#zl` 等（屏幕阅读器）→ `render-node-to-output.ts`；`chunk-24t3dkzb.js#lgt`（TerminalModes）→ `ink/terminal.ts`。
- **chunk-bzr73sfg.js#rf** 被配成 `tools/LSPTool/LSPTool.ts · countUniqueFilesFromOutgoingCalls`，实为 ink 的 `hyperlinkSpanInRow`；**`#ni`（chunk-bzr73sfg）在 utils/cachePaths.ts 叫 sanitizePath**，实为 yoga 的 `isInt32Finite`。
- **vim 旧版名互换**：`chunk-530hfzwb.js#Q` 应叫 `executeOperatorMotion`、`#Z` 应叫 `executeLineOp`（2.1.88 operators.ts 第 42/102 行，按函数体对照）。

全量清单：

### 归错文件 / 第三方代码混入

- chunk-bzr73sfg.js#Rd（collectTabbable） → 误归 render-node-to-output.ts，应归 ink/focus.ts（2.1.88 focus.ts 的 collectTabbable）（现归 `ink/render-node-to-output.ts`）
- chunk-bzr73sfg.js#ig（walkTabbable） → 误归 render-node-to-output.ts、旧版名 dropSubtreeCache 配错；即 2.1.88 focus.ts 的 walkTree（现归 `ink/render-node-to-output.ts`）
- chunk-bzr73sfg.js#aIs（hasTabbableDescendant） → 误归 render-node-to-output.ts、旧版名 dropSubtreeCache 配错；应归 ink/focus.ts（现归 `ink/render-node-to-output.ts`）
- chunk-bzr73sfg.js#ug（releaseRawModeRefs） → 误归 render-node-to-output.ts、旧版名 dropSubtreeCache 配错；应归 ink/reconciler.ts（现归 `ink/render-node-to-output.ts`）
- chunk-bzr73sfg.js#rf（hyperlinkSpanInRow） → 误归 tools/LSPTool/LSPTool.ts、旧版名 countUniqueFilesFromOutgoingCalls 完全配错；应归 ink（与 Nb 同一处）（现归 `?`）
- chunk-bzr73sfg.js#Hl（diacritic） → 误归 ink/layout/yoga.ts（布局亲和），实为图片占位编码；应归新模块（如 ink/termio/images.ts）（现归 `ink/layout/yoga.ts`）
- chunk-bzr73sfg.js#LC（encodeImagePlaceholder） → 误归 ink/layout/yoga.ts、旧版名 GUTTER_MAP 完全配错（现归 `ink/layout/yoga.ts`）
- chunk-bzr73sfg.js#lIs（buildImagePlaceholderGrid）、chunk-td6byj4s.js#ne（renderErrorNode） → 误归 ink/layout/yoga.ts（现归 `ink/layout/yoga.ts`）
- chunk-bzr73sfg.js#GUn（getTerminalSize） → 误归 utils/asciicast.ts；应归 ink/ink.tsx（现归 `?`）
- chunk-dxdtyerk.js#N（parseOscColor） → 旧版名 rgb 不准，且误归 use-tab-status.ts；解析 #rrggbb 或 rgb:r/g/b（XParseColor 格式）（现归 `ink/hooks/use-tab-status.ts`）
- chunk-eg496hkq.js#Fe（MAX_LINE_CHUNK） → 误归 ink/stringWidth.ts：这是 projects 工具把长行切到 450 字符的常量（现归 `ink/stringWidth.ts`）
- chunk-eg496hkq.js#Zt（splitLongLines） → 误归 ink/stringWidth.ts、旧版名 needsSegmentation 配错：按 450 字符在空格处切长行（projects 工具用）（现归 `ink/stringWidth.ts`）
- chunk-eg496hkq.js#Qt（getProjectInfoForTool） → 误归 ink/stringWidth.ts：projects 工具返回项目描述与指令（过长时写到本地文件），与 Ink 无关（现归 `ink/stringWidth.ts`）
- chunk-eg496hkq.js#lt（canWriteToolFile） → 误归 ink/stringWidth.ts（现归 `ink/stringWidth.ts`）
- chunk-fq0cr76a.js#vu（sandboxRuntimeCache） → 误归 ink/root.ts：sandbox-runtime 全局 npm 路径查找，与 Ink 无关（现归 `ink/root.ts`）
- chunk-fq0cr76a.js#n8（getSandboxRuntimeCandidatesSync）、chunk-fq0cr76a.js#FR（sandboxRuntimeCandidatePaths） → 误归 ink/root.ts（现归 `ink/root.ts`）
- chunk-fq0cr76a.js#OE（getSandboxRuntimeCandidates） → 误归 ink/root.ts、旧版名 getOptions 配错（现归 `ink/root.ts`）
- chunk-fq0cr76a.js#KFi（matchesPathRule） → 误归 ink/layout/node.ts、旧版名 LayoutMeasureMode 配错（现归 `ink/layout/node.ts`）
- chunk-fy5kn7m3.js#Lt（writeStdStreamOrThrow） → 误归 ink/log-update.ts、旧版名 NEWLINE 配错（现归 `ink/log-update.ts`）
- chunk-fy5kn7m3.js#Ut（writeStream）、chunk-qcqdqsn4.js#ge（FORMAT_CHAR_RE）、chunk-18hwfzwa.js#i9e（COMBINING_MARK_RE_2）、chunk-dcmhvw5a.js#nu（codePointAtOrUnit） → 误归 ink/log-update.ts（现归 `ink/log-update.ts`）
- chunk-h6b7mazd.js#Ii（axiosUtilsHead） → 误归 ink/parse-keypress.ts：这是 axios lib/utils.js（kindOf/kindOfTest/typeOfTest/isBuffer…），应归 vendor（现归 `ink/parse-keypress.ts`）
- chunk-h6b7mazd.js#Xe（isBuffer） → 误归，axios utils（现归 `ink/parse-keypress.ts`）
- chunk-h6b7mazd.js#ji（isString） → axios utils，误归 ink（现归 `ink/parse-keypress.ts`）
- chunk-hwmsct5x.js#Zl（isBufferLike） → 误归 ink/parse-keypress.ts（第三方 isBuffer）（现归 `ink/parse-keypress.ts`）
- chunk-mrx6y2r5.js#Mm（getBodyLength） → 误归 ink/parse-keypress.ts（HTTP 客户端的 body 长度计算）（现归 `ink/parse-keypress.ts`）
- chunk-qcqdqsn4.js#Kde（escapeForDisplay） → 误归 ink/log-update.ts、旧版名配错：JSON 字符串化并转义控制/格式字符（现归 `ink/log-update.ts`）
- chunk-qcqdqsn4.js#W1i（buildRunnerGitConfigWarnings） → 误归 ink/log-update.ts：后台 runner 的 git 配置告警文本，与 Ink 无关（现归 `ink/log-update.ts`）
- chunk-s67vc0kc.js#y（quoteKind） → 误归 ink/termio/sgr.ts、旧版名 UNDERLINE_STYLES 配错：判断字符是单引号还是双引号类（现归 `ink/termio/sgr.ts`）
- chunk-spjgqa4y.js#On（qrTerminalRenderer） → 误归 ink.ts：这是 npm qrcode 的 terminal 渲染器（lib/renderer/terminal/terminal.js），应归 vendor（现归 `ink.ts`）
- chunk-t7zrjgp6.js#S（defineLazyProperty） → 误归 ink/reconciler.ts（第三方工具函数）（现归 `ink/reconciler.ts`）
- chunk-vwj6ccer.js#Ff（collapseWhitespace） → 误归 ink/dom.ts：这是 HTML→Markdown 转换（turndown 的 collapse-whitespace），应归 vendor（现归 `ink/dom.ts`）
- chunk-vwj6ccer.js#ci（removeNode） → 误归 ink/dom.ts、旧版名 removeChildNode 配错（turndown）（现归 `ink/dom.ts`）
- chunk-vwj6ccer.js#Pc（nextNode） → 误归 ink/dom.ts（turndown）（现归 `ink/dom.ts`）
- chunk-wj577vf9.js#Ot（MAX_PREVIEW_LINES） → 误归 ink/render-border.ts：工具输出预览行的辅助函数（现归 `ink/render-border.ts`）
- chunk-wj577vf9.js#Nt（styleQuotedPreview） → 误归 ink/render-border.ts、旧版名 styleBorderLine 配错（现归 `ink/render-border.ts`）
- chunk-wy9dbk5f.js#$t（measureJsonSize） → 误归 ink/bidi.ts、旧版名 reorderBidi 完全配错：递归统计 JSON 值的字节数/值个数/层级（带上限）（现归 `ink/bidi.ts`）
- chunk-2nmyajw8.js#I（isTextLike） → 误归 ink/Ansi.tsx：判断 React 子节点是字符串/数字/Text 元素（现归 `ink/Ansi.tsx`）
- chunk-2nmyajw8.js#H（applyEmphasis） → 误归 ink/Ansi.tsx、旧版名 StyledText 配错（现归 `ink/Ansi.tsx`）
- chunk-8jypjjdf.js#HDe（SegmentedText） → 误归 ink/Ansi.tsx：按段渲染 ThemedText 并给有 url 的段包 Link（现归 `ink/Ansi.tsx`）
- chunk-e6aww6q8.js#jle（mergeTextStyleOverrides） → 误归 ink/Ansi.tsx（现归 `ink/Ansi.tsx`）
- chunk-e6aww6q8.js#Yyt（activeAnsiCodes） → 误归 ink/screen.ts（ansi-tokenize 的辅助，过滤掉自身即关闭码的条目）（现归 `ink/screen.ts`）
- chunk-e6aww6q8.js#sUo（nearestScrollTop） → 误归 ink/layout/geometry.ts、旧版名 edges 配错：滚动到 nearest 的 scrollTop 计算（现归 `ink/layout/geometry.ts`）
- chunk-e6aww6q8.js#C_t（scrollTopForBlock） → 误归 ink/layout/geometry.ts、旧版名 addEdges 配错：按 start/end/center/nearest 计算让一段内容可见的 scrollTop（现归 `ink/layout/geometry.ts`）
- chunk-e6aww6q8.js#Rcn（readDisplayField） → 误归 ink/styles.ts、旧版名 applyDisplayStyles 配错（现归 `ink/styles.ts`）
- chunk-cgr0tezp.js#Ie（applyTextEdits） → 误归 ink/screen.ts、旧版名 initCharAscii 配错：按 [start,end,replacement] 编辑文本并维护原文偏移映射（现归 `ink/screen.ts`）
- chunk-cgr0tezp.js#wr（EXTRA_COMBINING_MARKS） → 误归 ink/log-update.ts：Unicode 规范化（防止超长组合字符序列）相关，属于文本清洗工具（现归 `ink/log-update.ts`）
- chunk-yb0ajcmt.js#Ye（timingManifest） → 误归 ink/render-to-screen.ts（现归 `ink/render-to-screen.ts`）
- chunk-yb0ajcmt.js#re（createBoxCanvas） → 误归 ink/output.ts：盒线图画布（links/styles/rounded/glyphs），属于某个图表/流程图绘制器（现归 `ink/output.ts`）
- chunk-yb0ajcmt.js#W（linkCells）、chunk-yb0ajcmt.js#Se（unlinkCell）、chunk-yb0ajcmt.js#q（linkPath） → 误归 ink/screen.ts（盒线画布）（现归 `ink/screen.ts`）
- chunk-yb0ajcmt.js#D（drawCanvasText） → 误归 ink/layout/geometry.ts（盒线画布）（现归 `ink/layout/geometry.ts`）
- chunk-yb0ajcmt.js#J（drawCanvasBox） → 误归 ink/screen.ts、旧版名 clearRegion 配错（盒线画布）（现归 `ink/screen.ts`）
- chunk-4121qate.js#es（UNLIMITED_BUDGET） → 误归 ink/ink.tsx：与 Ink 无关（钩子调用上下文对象）（现归 `ink/ink.tsx`）
- chunk-4121qate.js#$5e（freezeHookCall） → 误归 ink/ink.tsx、旧版名 CONSOLE_STDERR_METHODS 配错（现归 `ink/ink.tsx`）
- chunk-4121qate.js#pZr（makeHookCall） → 误归 ink/ink.tsx（现归 `ink/ink.tsx`）
- chunk-4121qate.js#X6t（SPACING_TOKENS） → 误归 ink/styles.ts：这是某个声明式 UI（插件/渲染组件）样式白名单与校验，非 Ink 的 styles.ts（现归 `ink/styles.ts`）
- chunk-4121qate.js#i3t（flattenTextNodes）、chunk-4121qate.js#Bo（mapChildren） → 误归 ink/dom.ts、旧版名 setAttribute 配错（现归 `ink/dom.ts`）
- chunk-10q8r8ck.js#Ut（renderNamedNode） → 误归 ink/layout/yoga.ts、旧版名 createYogaLayoutNode 配错（现归 `ink/layout/yoga.ts`）
- chunk-6p6y0k3t.js#ze（renderPropertyRows） → 误归 native-ts/yoga-layout、旧版名 isRow 配错（现归 `native-ts/yoga-layout/index.ts`）
- chunk-2nmyajw8.js#Ep（FlexDirectionRow） → 误归 native-ts/yoga-layout/enums.ts、旧版名 FlexDirection 配错（某组件对象上挂 Row 子组件）（现归 `native-ts/yoga-layout/enums.ts`）
- chunk-18hwfzwa.js#Yye（getPrintableKey） → 误归 ink/parse-keypress.ts、旧版名 decodeModifier 配错（现归 `ink/parse-keypress.ts`）
- chunk-18hwfzwa.js#a9e（endsWithCombiningMatch） → 误归 ink/log-update.ts、旧版名 needsWidthCompensation 配错（现归 `ink/log-update.ts`）
- chunk-3s7ydtfd.js#Gr（CHART_ROW_DENSITIES） → 误归 ink/screen.ts：chunk-3s7ydtfd 66841–79265 这 108 个声明是 316 新增的终端/SVG 图表渲染器（line/columns/sparks/bars/share），与 Ink 屏幕缓冲无关（现归 `ink/screen.ts`）
- chunk-3s7ydtfd.js#hf（layoutPlotRows）、chunk-3s7ydtfd.js#Xr（layoutChartArea）、chunk-3s7ydtfd.js#_f（layoutPlots）、chunk-3s7ydtfd.js#$f（drawLineOrColumnChart）、chunk-3s7ydtfd.js#zf（drawShareBar）、chunk-3s7ydtfd.js#ei（drawSparklines） → 误归 ink/screen.ts（图表渲染器）（现归 `ink/screen.ts`）
- chunk-3s7ydtfd.js#ti（drawChartBody） → 误归 ink/screen.ts（图表渲染器）：按 form（bars/share/sparks/line/columns）分派（现归 `ink/screen.ts`）
- chunk-3s7ydtfd.js#ni（layoutChart） → 误归 ink/screen.ts（图表渲染器）：标题、主体、注释的整体排版，空间不够退回文字（现归 `ink/screen.ts`）
- chunk-3s7ydtfd.js#ci（createGlyphGrid） → 误归 ink/screen.ts（图表渲染器的字符网格）（现归 `ink/screen.ts`）
- chunk-3s7ydtfd.js#Ai（drawBrailleLine） → 误归 ink/screen.ts（图表渲染器：用盲文点阵 U+2800 画折线）（现归 `ink/screen.ts`）
- chunk-3s7ydtfd.js#AA（rasterizeChart） → 误归 ink/screen.ts（图表渲染器：把 text/bar/stack/line/strip/band/axisRow 形状画到字符网格并按样式合并成行）（现归 `ink/screen.ts`）
- chunk-3s7ydtfd.js#Do（svgLine） → 误归 ink/screen.ts（图表的 SVG 输出）（现归 `ink/screen.ts`）
- chunk-3s7ydtfd.js#Pi（svgTickLine） → 误归 ink/screen.ts、旧版名 diff 配错（图表 SVG）（现归 `ink/screen.ts`）
- chunk-3s7ydtfd.js#Ui（thinBarRect） → 误归 ink/layout/geometry.ts（图表渲染器）（现归 `ink/layout/geometry.ts`）
- chunk-3s7ydtfd.js#uf（rowsPerTick）、chunk-3s7ydtfd.js#df（chartRowScale）、chunk-3s7ydtfd.js#cf（ticksInRange）、chunk-3s7ydtfd.js#yf（unstackColumnRows）、chunk-3s7ydtfd.js#Tf（keyColumnWidth）、chunk-3s7ydtfd.js#Sf（endKeysWidth） 等 94 个 → 误归 ink/screen.ts（316 新增图表渲染器）（现归 `ink/screen.ts`）
- chunk-x1mwqya5.js#sn（VALID_CONTEXTS） → 误归 reservedShortcuts.ts，实为 validate.ts 的常量：修饰键名及别名表、Keystroke 修饰位字段、错误信息里最多列 3 个、引用文字截断 80 字符（现归 `keybindings/reservedShortcuts.ts`）
- chunk-18hwfzwa.js#XRt（STARTUP_NOTICE_KEY） → 误归 keybindings（现归 `keybindings/KeybindingProviderSetup.tsx`）
- chunk-18hwfzwa.js#uDe（useStartupNotice） → 误归 keybindings/KeybindingProviderSetup.tsx，与快捷键无关（旧版名 useKeybindingWarnings 配错）（现归 `keybindings/KeybindingProviderSetup.tsx`）
- chunk-18hwfzwa.js#yY（isPlainTypedInput） → 误归 keybindings/resolver.ts：判断是否为普通字符输入（无 ctrl/meta/super/tab/enter/esc）（现归 `keybindings/resolver.ts`）
- chunk-18hwfzwa.js#s4（checkChordReserved） → 误归 reservedShortcuts.ts：对单个按键串调 PRr 检查保留冲突（调用方在 UI 层）（现归 `keybindings/reservedShortcuts.ts`）
- chunk-4121qate.js#xZr（ESCAPE_CHAR_PATTERN） → 误归 keybindings/match.ts（现归 `keybindings/match.ts`）
- chunk-0sfjpx19.js#smo（isMacOS） → 误归 keybindings/reservedShortcuts.ts：平台判断小函数，指纹撞车（现归 `keybindings/reservedShortcuts.ts`）
- chunk-0wdgqhcf.js#eOr（toDarwinPrivatePath） → 误归 keybindings/parser.ts：macOS 上 /tmp /var /etc 加 /private 前缀（现归 `keybindings/parser.ts`）
- chunk-0wdgqhcf.js#ht（isDifferentPath）、chunk-aat7wt0p.js#It（WSL_MOUNT_PATTERN）、chunk-aat7wt0p.js#rvr（toWindowsPathFromWsl） → 误归 keybindings/parser.ts（路径工具）（现归 `keybindings/parser.ts`）
- chunk-2a8yx6fc.js#Xn（isReservedName） → 误归 keybindings/reservedShortcuts.ts（按平台的保留名判断，非快捷键）（现归 `keybindings/reservedShortcuts.ts`）
- chunk-9mf2agcn.js#re（getPlatform）、chunk-x58vpmpd.js#Re（getPlatform） → 误归 keybindings/parser.ts（打包时常量化的平台函数）（现归 `keybindings/parser.ts`）
- chunk-b00ssqeq.js#zJr（normalizeCaseForPlatform） → 误归 keybindings/reservedShortcuts.ts（路径工具）（现归 `keybindings/reservedShortcuts.ts`）
- chunk-dcmhvw5a.js#$o（BLACK_CIRCLE） → 误归 keybindings/reservedShortcuts.ts，应属 constants/figures.ts（界面符号常量）（现归 `keybindings/reservedShortcuts.ts`）
- chunk-e6aww6q8.js#WVe（checkPathRefused） → 误归 keybindings/reservedShortcuts.ts（文件路径权限）（现归 `keybindings/reservedShortcuts.ts`）
- chunk-e6aww6q8.js#bMn（isCaseInsensitivePlatform）、chunk-f3qhjfah.js#u3（normalizePathForPlatform）、chunk-qchp9vrd.js#sl（UNIX_TEMP_DIRS）、chunk-qchp9vrd.js#So（getTempDirs）、chunk-qg0af0yq.js#kOe（isSamePath）、chunk-qg0af0yq.js#Fge（mayBeSamePath） 等 19 个 → 误归 keybindings/reservedShortcuts.ts（现归 `keybindings/reservedShortcuts.ts`）
- chunk-e6aww6q8.js#AYn（isLinux）、chunk-k176arn3.js#I$（assertPathSafeAsync）、chunk-k176arn3.js#TMi（assertPathSafeSync）、chunk-t0gq9gyw.js#lQt（isNetworkPath）、chunk-t0gq9gyw.js#zhs（checkNetworkPath） → 误归 keybindings/parser.ts（现归 `keybindings/parser.ts`）
- chunk-fe6rs39h.js#sr（toDeviceBindingStatus） → 误归 keybindings/resolver.ts（设备绑定状态：bound/unbound/created_unbound/not_applicable/disabled）（现归 `keybindings/resolver.ts`）
- chunk-fe6rs39h.js#nt（unboundStatus） → 误归 keybindings/resolver.ts（旧版名 resolveKey 撞名）（现归 `keybindings/resolver.ts`）
- chunk-fq0cr76a.js#OI（collectDenyPaths） → 误归 keybindings/parser.ts（沙箱读拒绝路径）（现归 `keybindings/parser.ts`）
- chunk-fq0cr76a.js#dg（expandDenyPaths） → 误归 keybindings/parser.ts（沙箱）（现归 `keybindings/parser.ts`）
- chunk-fq0cr76a.js#bde（WINDOWS_DRIVE_ROOT） → 误归 keybindings/reservedShortcuts.ts（Windows/macOS 路径正则，沙箱）（现归 `keybindings/reservedShortcuts.ts`）
- chunk-fq0cr76a.js#h4e（isProtectedSystemPath） → 误归 keybindings/reservedShortcuts.ts（沙箱）（现归 `keybindings/reservedShortcuts.ts`）
- chunk-hddjmtjj.js#he（isOutsideDirectory） → 误归 keybindings/reservedShortcuts.ts（路径包含判断）（现归 `keybindings/reservedShortcuts.ts`）
- chunk-k176arn3.js#kMi（assertSafeThenWrite） → 误归 keybindings/parser.ts（文件写入安全检查）（现归 `keybindings/parser.ts`）
- chunk-qg0af0yq.js#IU（isValidPipeOrPath） → 误归 keybindings/reservedShortcuts.ts（路径身份/命名管道工具）（现归 `keybindings/reservedShortcuts.ts`）
- chunk-qg0af0yq.js#Ge（comparePathIdentity） → 误归 keybindings/reservedShortcuts.ts：返回 same/maybe/different（现归 `keybindings/reservedShortcuts.ts`）
- chunk-qg0af0yq.js#TOe（parseNamedPipeName） → 误归 keybindings/reservedShortcuts.ts（Windows 命名管道）（现归 `keybindings/reservedShortcuts.ts`）
- chunk-s61vbvea.js#Fn（resolveRealPathLoose） → 误归 keybindings/reservedShortcuts.ts（git/路径解析）（现归 `keybindings/reservedShortcuts.ts`）
- chunk-s61vbvea.js#fI（splitAtPathMax） → 误归 keybindings/reservedShortcuts.ts：按 PATH_MAX（macOS 1024、其他 4096）切路径（现归 `keybindings/reservedShortcuts.ts`）
- chunk-t0gq9gyw.js#ti（NETWORK_PATH_MESSAGE） → 误归 keybindings/parser.ts（网络路径检查）（现归 `keybindings/parser.ts`）
- chunk-v6kts6xw.js#C（getModifierNames） → 误归 keybindings/parser.ts（UI 层按修饰键列名字）（现归 `keybindings/parser.ts`）
- chunk-wj577vf9.js#Se（isNotSpaceToken）、chunk-wj577vf9.js#_e（isBlankToken） → 误归 keybindings/parser.ts（markdown token 判断）（现归 `keybindings/parser.ts`）
- chunk-8jypjjdf.js#Bo（NON_LATIN_PATTERN） → 误归 vim/textObjects.ts（现归 `vim/textObjects.ts`）
- chunk-8jypjjdf.js#ze（snapRangesToGraphemes） → 误归 vim/textObjects.ts：把高亮区间扩到字素边界并合并（搜索/建议高亮用）（现归 `vim/textObjects.ts`）
- chunk-e6aww6q8.js#bcn（bufferEqualsJson） → 误归 vim/motions.ts（请求体缓存比较）（现归 `vim/motions.ts`）
- chunk-85hd307w.js#l → 误归 native-ts/color-diff，应属 utils/cliHighlight.ts（现归 `native-ts/color-diff/index.ts`）
- chunk-85hd307w.js#n（plainWithReset） → 误归 native-ts/color-diff（cli-highlight 默认主题）（现归 `native-ts/color-diff/index.ts`）
- chunk-85hd307w.js#d（DEFAULT_CLI_HIGHLIGHT_THEME） → 误归 native-ts/color-diff：这是 cli-highlight 用 chalk 的默认作用域主题，不是 color-diff 的 Monokai 表（现归 `native-ts/color-diff/index.ts`）
- chunk-ag5x7vhf.js#_T（RESET） → 误归 native-ts/color-diff（指纹共享的 RESET 常量）（现归 `native-ts/color-diff/index.ts`）
- chunk-7t3j7ybe.js#O（MAX_BUFFER_BYTES） → 误归 native-ts/color-diff：只是含 RESET 字节的常量组，属于别的模块（现归 `native-ts/color-diff/index.ts`）
- chunk-7vb8p3zb.js#J（ArrayDiff） → 误归 native-ts/color-diff，应属 npm diff（jsdiff）的 arrayDiff（现归 `native-ts/color-diff/index.ts`）
- chunk-7vb8p3zb.js#q（arrayDiff） → 误归，npm diff（现归 `native-ts/color-diff/index.ts`）
- chunk-7vb8p3zb.js#nos（diffArrays） → 误归，npm diff 的 diffArrays（现归 `native-ts/color-diff/index.ts`）
- chunk-ksvdmrg0.js#cn（DIM） → 误归 native-ts/color-diff：后台会话附着界面的常量（现归 `native-ts/color-diff/index.ts`）
- chunk-yt6zn9vg.js#ct（countLineChanges） → 误归 native-ts/color-diff：按行多重集比较统计新增/删除行数（insights 用）（现归 `native-ts/color-diff/index.ts`）
- chunk-bzr73sfg.js#ni（isInt32Finite） → 误归 utils/cachePaths.ts、旧版名 sanitizePath 配错：yoga 里判断数值能否安全放进 Int32 存储（316 的 yoga 全部用 Int32 存尺寸）（现归 `?`）
- chunk-3s7ydtfd.js#sp（snapToStep） → 误归 native-ts/yoga-layout、旧版名 UNDEFINED_VALUE 配错：这是图表代码（时间轴刻度对齐），属 chunk-3s7ydtfd 的图表渲染器（现归 `native-ts/yoga-layout/index.ts`）

### 未归属但属于 ink 领域

- chunk-bzr73sfg.js#Ja（Yoga） → 未归属；应归 ink/layout/yoga.ts：yoga 实例别名（= YOGA_INSTANCE）（现归 `?`）
- chunk-bzr73sfg.js#zRr（MouseEvent） → 未归属；应归 ink/events/click-event.ts 一带：带屏幕坐标、所在格是否空白、超链接 URL、是否窗口激活点击、修饰键的鼠标事件基类（ClickEvent 继承它）（现归 `?`）
- chunk-bzr73sfg.js#Ey（createInputReaderState） → 未归属；应归 ink/parse-keypress.ts 或 ink/components/App.tsx（stdin 读取状态机）（现归 `?`）
- chunk-bzr73sfg.js#ed（feedInputReader） → 未归属；应归 ink/parse-keypress.ts 或 App.tsx（现归 `?`）
- chunk-bzr73sfg.js#Lx（MAX_LINE_WIDTH_CACHE_SIZE） → 未归属；应归 ink/line-width-cache.ts（2.1.88 的 MAX_CACHE_SIZE = 4096）（现归 `?`）
- chunk-bzr73sfg.js#Fy（LineWidthCache） → 未归属；应归 ink/line-width-cache.ts：316 把 2.1.88 的模块级 Map 改成类（现归 `?`）
- chunk-bzr73sfg.js#c1（directionalFocusScore） → 未归属；应归 ink/focus.ts（FocusManager.focusDirection 用）（现归 `?`）
- chunk-bzr73sfg.js#ng（getNodeScreenRect） → 未归属；应归 ink/focus.ts（现归 `?`）
- chunk-bzr73sfg.js#kz（isDescendantOf） → 未归属；即 2.1.88 focus.ts 的 isInTree（现归 `?`）
- chunk-bzr73sfg.js#sg（adjustRawModeRef）、chunk-bzr73sfg.js#rg（syncRawModeRef） → 未归属；应归 ink/reconciler.ts（现归 `?`）
- chunk-bzr73sfg.js#Su（clamp） → 未归属；即 2.1.88 layout/geometry.ts 的 clamp，应归 ink/layout/geometry.ts（现归 `?`）
- chunk-bzr73sfg.js#Md（StyleAtlasRecorder） → 未归属；应归 ink/screen.ts：记录 (字符下标, styleId) 组合，供样式池压缩/主动重置统计（现归 `?`）
- chunk-bzr73sfg.js#m1（boldDimResetPrefix） → 未归属；应归 ink/screen.ts（StylePool.transition 用）（现归 `?`）
- chunk-bzr73sfg.js#Vn（textWrapStyle） → 未归属；应归 ink/components/Text.tsx（现归 `?`）
- chunk-bzr73sfg.js#bb（probeTerminalCapabilities） → 未归属；应归 ink/terminal-querier.ts 或 App.tsx：进入原始模式后的终端能力探测（现归 `?`）
- chunk-bzr73sfg.js#Eye（PasteEvent） → 未归属；应归 ink/events/ 下（2.1.88 没有独立的 paste 事件）（现归 `?`）
- chunk-bzr73sfg.js#Jd（WheelEvent） → 未归属；应归 ink/events/（现归 `?`）
- chunk-bzr73sfg.js#_9（hitTest） → 未归属；即 2.1.88 hit-test.ts 的 hitTest（旧版名被配到 Tb 一带）（现归 `?`）
- chunk-bzr73sfg.js#ef（findSelectionScope） → 未归属；应归 ink/hit-test.ts 或 selection.ts（现归 `?`）
- chunk-bzr73sfg.js#rr（hyperlinkAt） → 未归属；应归 ink/hit-test.ts 或 screen.ts（现归 `?`）
- chunk-bzr73sfg.js#Qb（BidiNeedDetector） → 未归属；应归 ink/bidi.ts：WT_SESSION 或 TERM_PROGRAM=vscode 时需要软件双向重排（2.1.88 bidi.ts 的 needsBidi 改成按主机缓存的类）（现归 `?`）
- chunk-bzr73sfg.js#Ll（needsBidiReorder） → 未归属；应归 ink/bidi.ts（现归 `?`）
- chunk-bzr73sfg.js#pf（LineCellSegmenter） → 未归属；应归 ink/output.ts（Output.lineCells）。316 新增：包装私有原生 Bun.ant.CellSegmenter（现归 `?`）
- chunk-bzr73sfg.js#bf（indentString） → 未归属；即 npm indent-string（错误信息逐字一致），应归 vendor（现归 `?`）
- chunk-bzr73sfg.js#iR（hasAbsoluteAncestor）、chunk-bzr73sfg.js#Rf（makeAbsoluteRect）、chunk-bzr73sfg.js#SR（findBlittableChildren）、chunk-bzr73sfg.js#MR（getOverflowClip） → 未归属；应归 render-node-to-output.ts（现归 `?`）
- chunk-bzr73sfg.js#arn（createRenderState） → 未归属；应归 render-node-to-output.ts 或 renderer.ts（现归 `?`）
- chunk-x6v6jz2y.js#Fe（segmentGraphemes） → 未归属；应归 ink/termio/parser.ts（2.1.88 同名函数）（现归 `?`）
- chunk-x6v6jz2y.js#Gt（decModeToAction） → 未归属；应归 ink/termio/parser.ts（现归 `?`）
- chunk-x6v6jz2y.js#Ce（wrapWithAppProviders） → 未归属；应归 ink.ts：在根元素外包主题等 Provider（现归 `?`）
- chunk-24t3dkzb.js#pIs（clearAltScreenSequence）、chunk-24t3dkzb.js#igt（clearMainScreenSequence） → 未归属；应归 ink/clearTerminal.ts（现归 `?`）
- chunk-24t3dkzb.js#fIs（fixJediTermWheelInput） → 未归属；应归 ink/components/App.tsx 一带（现归 `?`）
- chunk-24t3dkzb.js#lgt（TerminalModes） → 未归属；应归 ink/terminal.ts（316 新增的终端模式栈）（现归 `?`）
- chunk-24t3dkzb.js#_（TerminalModesContext） → 未归属；应归 ink/terminal.ts 或 components（现归 `?`）

### 旧版名配错（已用语义名覆盖）

- chunk-bzr73sfg.js#KE（isBackspaceCtrlBackspace） → 旧版名 isMintty 配错；读 CLAUDE_CODE_BS_AS_CTRL_BACKSPACE，win32 且不是 mintty/cygwin 时默认真（现归 `ink/clearTerminal.ts`）
- chunk-bzr73sfg.js#V_o（isBackspaceCtrlBackspaceHere） → 旧版名 chordToDisplayString 配错；linux 构建把平台固化为 "linux"（现归 `keybindings/parser.ts`）
- chunk-bzr73sfg.js#wp（createAltGrTextKey） → 旧版名 createPasteKey 配错（现归 `ink/parse-keypress.ts`）
- chunk-bzr73sfg.js#Pp（createWheelKey） → 旧版名 createNavKey 配错：这里只生成 wheelup/wheeldown（现归 `ink/parse-keypress.ts`）
- chunk-bzr73sfg.js#Ii（createNavKey） → 旧版名 createPasteKey 配错；与 2.1.88 的 createNavKey(s,name,ctrl) 同形（现归 `ink/parse-keypress.ts`）
- chunk-bzr73sfg.js#pd（markHasAbsoluteDescendant） → 旧版名 isInTree 配错：沿父链把 hasAbsoluteDescendant 置真（现归 `ink/focus.ts`）
- chunk-bzr73sfg.js#jy（measureWrappedText） → 旧版名 measureRawAnsiNode 配错：这里按 textWrap 折行后测量（现归 `ink/dom.ts`）
- chunk-bzr73sfg.js#u1（isTabbable） → 旧版名 walkTree 配错：判断 tabIndex 为非负数（现归 `ink/focus.ts`）
- chunk-bzr73sfg.js#f1（hasRawModeHandler） → 旧版名 setEventHandler 配错：判断是否挂了需要原始模式的处理器（现归 `ink/reconciler.ts`）
- chunk-bzr73sfg.js#So（removeChildAndCleanup） → 旧版名 scheduleRenderFrom 配错：这是 reconciler 的 removeChild/removeChildFromContainer（现归 `ink/dom.ts`）
- chunk-bzr73sfg.js#T1（setCellAt） → 旧版名 diffDifferentWidth 配错：这是 2.1.88 的 setCellAt，316 改为调用原生 CellSegmenter.setCell（现归 `ink/screen.ts`）
- chunk-bzr73sfg.js#Eg（addDamageFromPacked） → 旧版名 diffEach 配错：解析原生返回值里的改动列区间并并入 damage（现归 `ink/screen.ts`）
- chunk-bzr73sfg.js#xg（paintSegments） → 旧版名 cellAtCI 配错：调用原生 CellSegmenter.paint 把切好的文本段写进一行（现归 `ink/screen.ts`）
- chunk-bzr73sfg.js#Cg（clampWideGraphemesAtRightEdge） → 旧版名 setCellAt 配错：在 damage 区域里处理行尾放不下的多码元宽字素（现归 `ink/screen.ts`）
- chunk-bzr73sfg.js#tgt（isSelectionFullyOffscreen） → 旧版名 shiftSelectionForFollow 配错：判断两端点都被钳到同一侧（整段选区滚出视口）（现归 `ink/selection.ts`）
- chunk-bzr73sfg.js#irn（selectionBounds） → 旧版名 hasSelection 配错；即 2.1.88 的 selectionBounds（现归 `ink/selection.ts`）
- chunk-bzr73sfg.js#Xd（isKeyOrPaste） → 旧版名 nonAlphanumericKeys 配错（2.1.88 那是常量数组）（现归 `ink/parse-keypress.ts`）
- chunk-bzr73sfg.js#Zd（ImperativeTree） → 旧版名 createTextNode 配错：这是 316 新增的命令式子树 API（box/text/span/append/remove/setStyle…），绕过 React 直接改 DOM（现归 `ink/dom.ts`）
- chunk-bzr73sfg.js#Dr（isFrameOverflowing） → 旧版名 renderFrame 配错（现归 `ink/log-update.ts`）
- chunk-bzr73sfg.js#Nl（dispatchPointer） → 旧版名 ClickEvent 配错：这是 316 新增的 onPointer 派发函数（现归 `ink/events/click-event.ts`）
- chunk-bzr73sfg.js#_b（countDomNodes） → 旧版名 clearYogaNodeReferences 配错：迭代统计 DOM 节点数（现归 `ink/dom.ts`）
- chunk-bzr73sfg.js#Gb（indexesToRuns） → 旧版名 diff 配错：把格下标列表合并成按行的连续段 {x,y,length}（现归 `ink/screen.ts`）
- chunk-bzr73sfg.js#nv（wrapTextConservatively） → 旧版名 isEmptyCellByIndex 完全配错：按保守宽度把文本折成不超过 maxWidth 的行，放不下的字素替换成 [unreadable text]（现归 `ink/screen.ts`）
- chunk-bzr73sfg.js#ER（isDegenerateBorderBox） → 旧版名 setStyle 配错：有边框但宽 <2 或高 0（边框会画出自身矩形）（现归 `ink/dom.ts`）
- chunk-bzr73sfg.js#CR（rectContains） → 旧版名 unionRect 配错：判断 inner 是否完全在 outer 内（现归 `ink/layout/geometry.ts`）
- chunk-bzr73sfg.js#bv（anyRectOverlaps） → 旧版名 unionRect 配错（现归 `ink/layout/geometry.ts`）
- chunk-bzr73sfg.js#OR（setUnpaintedLayout） → 旧版名 hitTest 配错：给不绘制的子树写入 unpainted 的 cachedLayout（仍可命中测试）（现归 `ink/hit-test.ts`）
- chunk-bzr73sfg.js#Gv（eraseMainScreenFrame） → 旧版名 diff 配错：进入备用屏前生成把光标移回并擦除主屏内容的序列（现归 `ink/screen.ts`）
- chunk-x6v6jz2y.js#XDe（useTerminalTitle） → 旧版名 CLEAR_TERMINAL_TITLE 配错：这是设置标题的 hook（OSC 0）（现归 `ink/termio/osc.ts`）
- chunk-x6v6jz2y.js#u5（offsetTopWithin） → 旧版名 siblingSharesY 配错：累加到某祖先的纵向偏移，不是祖先返回 -1（现归 `ink/render-node-to-output.ts`）
- chunk-18hwfzwa.js#lRe（isTextInputKey） → 旧版名 parseKey 配错：判断按键是否会产生文字输入（非导航/控制键）（现归 `ink/events/input-event.ts`）
- chunk-18hwfzwa.js#WDe（findRowOwner） → 旧版名 useTerminalViewport 配错：给定屏幕行找到覆盖它的条目（考虑滚动偏移）（现归 `ink/hooks/use-terminal-viewport.ts`）
- chunk-avfhvhz8.js#_（supportsHyperlinksPackage） → 这是 npm supports-hyperlinks 包（CommonJS 包裹，含 FORCE_HYPERLINK/--no-hyperlink/iTerm/WezTerm/VTE 判断），应归 vendor（现归 `ink/supports-hyperlinks.ts`）
- chunk-ksvdmrg0.js#Sn（hardWrapAnsiLine） → 旧版名 segmentGraphemes 配错：按字素把带 ANSI 的行硬折到 width，折行处关闭并重开 SGR（现归 `ink/termio/parser.ts`）
- chunk-spjgqa4y.js#Un（qrTerminalSmallRenderer） → npm qrcode terminal-small.js，应归 vendor（现归 `ink.ts`）
- chunk-spjgqa4y.js#Yn（qrTerminalModule） → 旧版名 createRoot 配错；npm qrcode lib/renderer/terminal.js（现归 `ink.ts`）
- chunk-t0gq9gyw.js#Ghs（findZeroWidthCodePoint） → 旧版名 stringWidthJavaScript 配错：返回文本中第一个零宽（或宽字素中零宽成分）的码点（现归 `ink/stringWidth.ts`）
- chunk-6rgkw5kr.js#r（isUnicodeSupported） → 旧版名 needsBidi 配错：这是 npm is-unicode-supported（Windows 下按终端判断），应归 vendor（现归 `ink/bidi.ts`）
- chunk-zxbmtfmw.js#R（cliBoxesData） → npm cli-boxes 的 boxes.json（CommonJS 包裹），应归 vendor（现归 `ink/render-border.ts`）
- chunk-m4dvt8pp.js#wVr（diffAnsiCodes） → ansi-tokenize 的 diffAnsiCodes（从 from 样式集切到 to 需要的关闭码+开启码）；旧版名 hasVisibleSpaceEffect 配错（现归 `ink/screen.ts`）
- chunk-cgr0tezp.js#vr（nextStarterIndex）、chunk-cgr0tezp.js#Tr（lastStarterIndex） → 旧版名 needsWidthCompensation 配错（现归 `ink/log-update.ts`）
- chunk-ag5x7vhf.js#Gs（serializeScreenRow） → 旧版名 writeLineToScreen 配错：把屏幕一行序列化成带 SGR/OSC 8 的字符串（与 2.1.88 方向相反）（现归 `ink/output.ts`）
- chunk-ag5x7vhf.js#aAr（ScrollAnchor） → 旧版名 isEmptyCellAt 配错：渲染一个高度为 0 的 Box 作为滚动锚点（现归 `ink/screen.ts`）
- chunk-ag5x7vhf.js#ih（offsetWithinParent） → 旧版名 siblingSharesY 配错（现归 `ink/render-node-to-output.ts`）
- chunk-ag5x7vhf.js#sc（hasDrawPending） → 旧版名 dropSubtreeCache 配错：子树里是否有 drawPending 属性的节点（现归 `ink/render-node-to-output.ts`）
- chunk-ag5x7vhf.js#wx（leadingTopMargin） → 旧版名 dropSubtreeCache 配错：沿首个子节点累加顶部 margin（现归 `ink/render-node-to-output.ts`）
- chunk-bfrv6ttc.js#ore（countGraphemes） → 旧版名 flushBuffer 配错（现归 `ink/output.ts`）
- chunk-4121qate.js#ifr（SPACING_SHORTHANDS） → 旧版名 applyGapStyles 配错（现归 `ink/styles.ts`）
- chunk-4121qate.js#krs（ENUM_STYLE_VALUES） → 旧版名 applyFlexStyles 配错（现归 `ink/styles.ts`）
- chunk-4121qate.js#IAn（DIMENSION_PROPS） → 旧版名 applyDimensionStyles 配错（现归 `ink/styles.ts`）
- chunk-x1mwqya5.js#Qoi（isActionUnbound） → 旧版名 getBindingDisplayText 配错（现归 `keybindings/resolver.ts`）
- chunk-x1mwqya5.js#Zoi（findShadowedActions） → 旧版名 matchesBinding 配错（现归 `keybindings/match.ts`）
- chunk-6qssfmzs.js#J5e（normalizeKeyForComparison） → 2.1.88 reservedShortcuts.ts normalizeKeyForComparison；旧版名 parseChord 配错（现归 `keybindings/parser.ts`）
- chunk-530hfzwb.js#Q（executeOperatorMotion） → 旧版名 executeLineOp 配错，2.1.88 中此函数叫 executeOperatorMotion（现归 `vim/operators.ts`）
- chunk-530hfzwb.js#Z（executeLineOp） → 旧版名 executeOperatorMotion 配错，2.1.88 中此函数叫 executeLineOp（现归 `vim/operators.ts`）
- chunk-530hfzwb.js#me（getRepeatVisualRange） → 旧版名 getOperatorRangeForFind 配错；316 新增可视模式（现归 `vim/operators.ts`）
- chunk-530hfzwb.js#Ae（getVisualRange） → 旧版名配错；316 新增可视模式（现归 `vim/operators.ts`）
- chunk-cwwxybjc.js#Le（isAmbiguousWidthChar） → 旧版名 wrapText 配错（现归 `native-ts/color-diff/index.ts`）
- chunk-cwwxybjc.js#le（wrapLines） → 旧版名 addMarker 配错（现归 `native-ts/color-diff/index.ts`）
- chunk-bzr73sfg.js#Ka（resolveEdgeValueToInt） → 旧版名 resolveEdges4Into 配错（那是 Gc）（现归 `native-ts/yoga-layout/index.ts`）
- chunk-bzr73sfg.js#ax（lookupLayoutCache） → 旧版名 layoutNode 配错：316 把 2.1.88 layoutNode 开头的缓存查找拆成单独函数（现归 `native-ts/yoga-layout/index.ts`）
- chunk-bzr73sfg.js#ux（measureLeaf） → 旧版名 roundValue 配错：叶子节点调用 measureFunc（4 槽缓存）（现归 `native-ts/yoga-layout/index.ts`）
- chunk-bzr73sfg.js#px（computeLineBaseline） → 旧版名 commitCacheOutputs 配错：计算 baseline 对齐行的最大上伸与行高（现归 `native-ts/yoga-layout/index.ts`）
