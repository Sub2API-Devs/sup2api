# 一方代码最后剩余的压缩名：left-s0

范围：`analysis/segments/naming-leftover-src.json` 数组下标 `[0]`，648 个声明、清单记 1,644 个未命名绑定，路径从 `src/bootstrap/state.js` 到 `src/utils/transcript`（144 个目录前缀；其中 `src/utils/teleport` 430 个绑定、`src/utils/transcript` 296、`src/plugins/functionHooks` 135 为三大块）。清单里没有 `src/utils/worktree`：那段目录在阅读树里不存在，剩下的 `worktree` 相关内容都在 `gitBundle.js`、`tempDir.js`、`fsAnchor/` 等文件里，已按文件逐一命名。

名字表：`naming/semantic-left-s0.jsonl`（只用 `cat 批次 >> 目标` 追加）。校验命令固定为

```bash
node --max-old-space-size=3000 tools/naming/annotate.mjs check naming/semantic-left-s0.jsonl artifacts/tmp/lead/final9
```

最终 `1,463 lines, 162 chunks, 0 problems, 0 suffixed by conflicts`。

## 结果

| 项 | 数量 |
|---|---|
| 表行数 | 1,463 |
| 唯一绑定 | 1,455（7 个键重复写了两遍，值相同） |
| 覆盖 chunk | 162 |
| 涉及声明 | 570 / 648 |
| 用 final9 重渲染后的剩余 `_K` | 26 个绑定 / 9 个声明 |
| 未命名（见下） | 26 |

说明：清单里的 1,644 是"按声明逐个令牌"累计出来的数（同一个绑定在多个声明里重复出现）；用 `annotate show` + final9 实际渲染，初始只剩 1,489 个带 `_K` 的令牌。我写了 1,463 行，渲染剩余 1,489 − 1,463 = 26，与最后一节清单一致。

其中 248 行落在 final9 已有的 **占位条目**上（`name` 就是压缩名本身，`source=minified` 自别名，渲染时永远显示 `_K`），这 248 个名字全部换成了真名；另 1,207 个是 final9 完全没有的绑定。没有覆盖任何真实已有名（`final9` 里长度 >3 的真名命中 0 个）。

写法：常量（冻结表、环境变量解析器、错误码/状态码列表、正则标记）用 UPPER_SNAKE_CASE，函数/局部/参数 lowerCamelCase，布尔 is/has/should 起始，回调参数按元素含义（`loadedModule`、`payload`、`document`/`doc`、`rawWindow`、`contextWindow`）。环境变量表按官方 chunk 里的导出映射逆推（`CLAUDE_DEBUG`、`OTEL_*`、`CLAUDE_CODE_MCP_SERVE_*`），这是本组里置信度最高的一类（0.9）。

撞名处理：`_2` 一律改名消除，没有留下任何 `_2` 后缀。典型：`mcpClientModule`（四个同名局部）→ `mcpApi`、`CORE_ORIGIN` → `ENGINE_ORIGIN`、`fileKey` → `failureKey`、`record` → `artifactRecord`、`listing` → `treeListing`、`deps` → `procDeps`、`module`/`document`/`window`/`escape`/`exports` 这些保留字全部换成 `loadedModule`/`loadedHook`/`hookModule`/`pluginModule`/`catalogDocument`/`rawDocument`/`scrollWindow`/`escapeText`/`manifestExports`。

## 未命名的 26 个（全部是死绑定 / 从不读取的参数）

判断方式：在 `annotate id` 的完整渲染里，每个名字只出现一次（就是它自己的声明），后面再没有任何读取。

| file | key | 声明 | 原因 |
|---|---|---|---|
| chunk-93kwxas0.js | `@180012` | FleetView.js `let le=false` | 只在声明处出现，React 组件里的死局部（同一文件其它 `le` 是别的局部） |
| chunk-93kwxas0.js | `@180510` | FleetView.js `let Yt=useRef(!1)` | 声明后从未读取（`view` 由 `ensureFleetViewStore` 另给） |
| chunk-93kwxas0.js | `@188931` | FleetView.js `let et=false` | 死局部 |
| chunk-93kwxas0.js | `@196770` | FleetView.js `let jE=useRef(null)` | 死局部 |
| chunk-93kwxas0.js | `@135264` | FleetViewInput.js `let Bt=false` | 死局部（同文件后面另有同名的另一个 `Bt`，与本绑定无关） |
| chunk-93kwxas0.js | `@135270` | FleetViewInput.js `let lt=false` | 同上 |
| chunk-b79vwm1h.js | `@8947` | LogSelector.js `let ee=false` | 死局部 |
| chunk-b79vwm1h.js | `@9009` | LogSelector.js `let Te=false` | 死局部 |
| chunk-e6aww6q8.js | `@2677189` | services/api/claude.js `let Io` | 只声明、从不赋值也从不读取（主请求函数里的遗留位） |
| chunk-e6aww6q8.js | `@2703574` | 同上 `FT` | 只声明（`let FT;`），无赋值无读取 |
| chunk-e6aww6q8.js | `@2714919` | 同上 `NMs=void 0` | 赋值一次、从不读取 |
| chunk-e6aww6q8.js | `@2715014` | 同上 `$Ms=void 0` | 赋值一次、从不读取 |
| chunk-e6aww6q8.js | `@2721080` | 同上 `HMs="idle"` | 赋值一次、从不读取（状态机状态没接上） |
| chunk-e6aww6q8.js | `@2738315` | 同上 `async function* BMs(){}` | 空异步生成器，从未被 `yield*`（同处的 `uht` 被用了两次，已命名 `emptyYieldStream`） |
| chunk-e6aww6q8.js | `@1973303` | utils/teleport.js `let h=false` | 死局部 |
| chunk-e6aww6q8.js | `@1973308` | 同上 `let y=false` | 死局部 |
| chunk-e6aww6q8.js | `@1973511` | 同上 `let we` | 只声明 |
| chunk-e6aww6q8.js | `@1974298` | 同上 `let gt=null` | 赋值一次、从不读取 |
| chunk-e6aww6q8.js | `@1974306` | 同上 `let At=[]` | 赋空数组、从不读取 |
| chunk-e6aww6q8.js | `@1974586` | 同上 `let no=null` | 死局部 |
| chunk-e6aww6q8.js | `@1974594` | 同上 `let hn=null` | 死局部 |
| chunk-e6aww6q8.js | `@1986484` | 同上 `let Hi=void 0` | 死局部 |
| chunk-e6aww6q8.js | `@2004309` | 同上 `let Ah=false` | 死局部 |
| chunk-s5p7fp0c.js | `@14022` | ConsoleOAuthFlow.js `let Y=null` | 死局部 |
| chunk-twq47pff.js | `@58931` | services/homeSeed/notices.js `let P=false` | 死局部 |
| chunk-xr4xc2mq.js | `@16167` | services/extractMemories/extractMemories.js 参数 `r` | 参数从不读取（调用点传 `undefined`） |

这些在合并后仍会以 `<压缩名>_K<偏移>` 显示，读者看到的是一个从不被使用的槽位，不会误判为有意义的值。按指南"错名比压缩名更误导人"，不强行起名。

## 发现的问题（不在本表覆盖，留给后续）

- `final9` 里存在大量 **`name` = 压缩名本身** 的占位条目（`source=minified` 自别名，本组 248 个）。`show` 渲染时它们仍是 `_K`，但 `check` 通过；统计"剩余量"必须用渲染结果而不是表里是否有 key。这与 left-v 的结论一致。
- 清单 `[0]` 的声明区间互相有重叠：一个绑定可能落在两个声明区间里，`unnamed` 也是按声明累计的，所以 1,644 与渲染计数 1,489 对不上（不是漏做）。
- 有 1 个绑定 `chunk-czx62zen.js@19739`（managedPlugins.js 顶层的 `policySettings`）不落在清单任何声明区间里（它属于一个声明范围之外的辅助函数）。它同样是 `_K` 状态，已一并命名；说明清单按声明切分时会漏掉声明之间游离的顶层绑定。
- 清单说本组大头在 `utils/worktree`，实际没有这个目录；`worktree` 相关逻辑散在 `utils/teleport/gitBundle.js`（wipStash 的 git 交互）、`utils/tempDir.js`、`utils/fsAnchor/` 里，均已命名。
